# reconciliation

## Purpose

TBD

## Requirements

### Requirement: Compute diff between desired and actual state
The system SHALL compare a map of desired resources (from manifests) against a map of actual resources (from API) and produce a list of `Change` entries with actions: CREATE, UPDATE, DELETE, or NOOP. Actual resources SHALL be in the API wire format (snake_case fields) and SHALL be translated to manifest-compatible format before comparison via resource-specific `manifestFrom*()` functions.

#### Scenario: New resource not in remote
- **WHEN** a manifest declares a Monitor with tag `my-api` that does not exist remotely
- **THEN** the diff produces a `CREATE` change with the full desired manifest

#### Scenario: Resource exists and matches
- **WHEN** a manifest declares a Monitor with tag `my-api` that matches the remote resource exactly (after stripping server fields and translating field names)
- **THEN** the diff produces a `NOOP` change (no action needed)

#### Scenario: Resource exists but differs
- **WHEN** a manifest declares a Monitor with tag `my-api` and `cron: "*/5 * * * *"` but the remote has `cron: "* * * * *"`
- **THEN** the diff produces an `UPDATE` change with the differing fields in the patch

#### Scenario: Resource exists remotely but not in manifests (orphan)
- **WHEN** `deleteOrphans` is enabled and a Monitor exists remotely with tag `old-api` but no manifest declares it
- **THEN** the diff produces a `DELETE` change

#### Scenario: Orphan not deleted when deleteOrphans is disabled
- **WHEN** `deleteOrphans` is disabled and a resource exists remotely but not in manifests
- **THEN** the diff produces a `NOOP` for that resource (it is left alone)

### Requirement: Strip server-only fields before comparison
The system SHALL strip read-only server-generated fields (`id`, `created_at`, `updated_at`) from actual API responses before comparing with desired manifests to avoid spurious UPDATE changes.

#### Scenario: Only server fields differ
- **WHEN** the desired manifest and actual resource differ only in `id`, `created_at`, and `updated_at`
- **THEN** the diff produces a `NOOP` change

#### Scenario: Server fields and spec fields differ
- **WHEN** the actual resource has a different `cron` in addition to server-only fields
- **THEN** the diff produces an `UPDATE` change with only `cron` in the patch

### Requirement: Reconcile Monitors by tag
The system SHALL use `metadata.tag` as the stable key for matching Monitor manifests to remote monitors. Monitor DELETE changes SHALL be executed as PATCH with `status: "INACTIVE"` (soft-deactivation) since Kener v4 does not support DELETE for monitors.

#### Scenario: Monitor matched by tag
- **WHEN** a manifest has `metadata.tag: my-api` and a remote monitor exists with `tag: my-api`
- **THEN** they are matched as the same resource for comparison

#### Scenario: Monitor DELETE becomes deactivation
- **WHEN** a diff produces a DELETE change for a Monitor
- **THEN** the reconciler executes a PATCH with `{ "status": "INACTIVE" }` instead of a DELETE HTTP request

#### Scenario: Reactivating a deactivated monitor
- **WHEN** a diff produces a CREATE change for a Monitor whose tag matches a remote monitor with `status: "INACTIVE"`
- **THEN** the reconciler executes a PATCH to reactivate it (set `status: "ACTIVE"` and update other fields) instead of attempting a POST create

### Requirement: Reconcile Pages by path
The system SHALL use `metadata.path` as the stable key for matching Page manifests to remote pages. The root page SHALL have path `""` (empty string), not `"~home"`. When constructing POST or PATCH request bodies for pages, the `monitors` field SHALL be sent as a plain array of monitor tag strings (`string[]`), not as objects with `monitor_tag` and `position`.

#### Scenario: Page matched by path
- **WHEN** a manifest has `metadata.path: services` and a remote page exists with `page_path: services`
- **THEN** they are matched as the same resource

#### Scenario: Root page matched by empty path
- **WHEN** a manifest has `metadata.path: ""` and the remote has a page at `page_path: ""`
- **THEN** they are matched as the same resource

#### Scenario: Page monitors sent as string array
- **WHEN** a manifest declares a page with `spec.monitors: ["api-v1", "db-check"]`
- **THEN** the create or update request body SHALL include `"monitors": ["api-v1", "db-check"]`

### Requirement: Reconcile Incidents via state identity file
The system SHALL use `metadata.name` as the stable local key for Incidents, looking up the remote integer ID from the state file at `~/.config/kener-ctl/state/<context-name>.json`. Incident `start_date_time` SHALL be stored and compared as Unix timestamps (number). The `state` field SHALL NOT be included in diff comparisons (it is immutable via REST API). Incident `monitors` SHALL use the `[{ monitor_tag, impact }]` format.

#### Scenario: Incident has existing state mapping
- **WHEN** `metadata.name: outage-1` has an entry in the state file mapping to remote ID 42
- **THEN** the reconciler fetches the remote Incident with ID 42 for comparison

#### Scenario: Incident has no state mapping
- **WHEN** `metadata.name: outage-1` has no entry in the state file
- **THEN** the reconciler treats the incident as new (CREATE)

#### Scenario: Incident state is excluded from diff
- **WHEN** comparing desired and actual incidents where only `state` differs
- **THEN** the diff produces a `NOOP` change (state is immutable via API)

### Requirement: Reconcile Maintenances via state identity file
The system SHALL use `metadata.name` as the stable local key for Maintenances, looking up the remote integer ID from the state file. `start_date_time` SHALL be a Unix timestamp. `rrule` and `duration_seconds` SHALL be included in comparisons. `end_date_time` SHALL NOT appear (it is computed by Kener, not stored).

#### Scenario: Maintenance has existing state mapping
- **WHEN** `metadata.name: sunday-upgrade` has an entry in the state file mapping to remote ID 7
- **THEN** the reconciler fetches the remote Maintenance with ID 7 for comparison

### Requirement: Apply changes in dependency order
The system SHALL execute CREATE and UPDATE changes in the order: Monitors → Pages → Incidents → Maintenances. DELETE changes SHALL be executed in reverse order: Maintenances → Incidents → Pages → Monitors.

#### Scenario: Page references a monitor being created in same apply
- **WHEN** a manifest creates both a Monitor (`my-api`) and a Page referencing `my-api`
- **THEN** the Monitor is created first, then the Page is created, avoiding a foreign-key error

#### Scenario: Delete dependencies before parents
- **WHEN** deleting a Monitor and its dependent Page in the same apply
- **THEN** the Page is deleted first, then the Monitor is deactivated

### Requirement: Apply changes with bounded concurrency
The system SHALL execute CREATE/UPDATE/DELETE operations in parallel within each dependency tier, limited to the configured `concurrency` value (default 4).

#### Scenario: 10 independent resources with concurrency 4
- **WHEN** there are 10 Monitors to create with concurrency set to 4
- **THEN** at most 4 HTTP requests are in flight at any time

### Requirement: Collect per-resource API errors
The system SHALL continue applying other resources when one resource's API call fails, collecting all errors for reporting at the end.

#### Scenario: One update fails, others succeed
- **WHEN** updating Monitor A fails with a 400 error but updating Monitor B succeeds
- **THEN** both outcomes are reported; Monitor B is successfully updated

### Requirement: Update state identity file after successful apply
The system SHALL atomically update the state file at `~/.config/kener-ctl/state/<context-name>.json` after each successful apply, writing new name→ID mappings for created Incidents and Maintenances and removing mappings for deleted ones. AlertConfig mappings SHALL be removed from existing state files on next write. Monitor and Page mappings SHALL NOT be stored (they use stable string keys).

#### Scenario: New Incident created
- **WHEN** an Incident is created with `metadata.name: outage-1` and the API returns ID 42
- **THEN** the state file is updated with `"outage-1": 42` in the incidents section

#### Scenario: Incident deleted
- **WHEN** an Incident with `metadata.name: outage-1` is deleted
- **THEN** the `outage-1` entry is removed from the state file's incidents section

#### Scenario: Atomic write prevents corruption
- **WHEN** the state file is being updated and the process crashes mid-write
- **THEN** the previous state file is preserved intact (write to temp file, then rename)
