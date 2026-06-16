## ADDED Requirements

### Requirement: Compute diff between desired and actual state
The system SHALL compare a map of desired resources (from manifests) against a map of actual resources (from API) and produce a list of `Change` entries with actions: CREATE, UPDATE, DELETE, or NOOP.

#### Scenario: New resource not in remote
- **WHEN** a manifest declares a Monitor with tag `my-api` that does not exist remotely
- **THEN** the diff produces a `CREATE` change with the full desired manifest

#### Scenario: Resource exists and matches
- **WHEN** a manifest declares a Monitor with tag `my-api` that matches the remote resource exactly (after stripping server fields)
- **THEN** the diff produces a `NOOP` change (no action needed)

#### Scenario: Resource exists but differs
- **WHEN** a manifest declares a Monitor with tag `my-api` and `cronSchedule: "*/5 * * * *"` but the remote has `cronSchedule: "* * * * *"`
- **THEN** the diff produces an `UPDATE` change with the differing fields in the patch

#### Scenario: Resource exists remotely but not in manifests (orphan)
- **WHEN** `deleteOrphans` is enabled and a Monitor exists remotely with tag `old-api` but no manifest declares it
- **THEN** the diff produces a `DELETE` change

#### Scenario: Orphan not deleted when deleteOrphans is disabled
- **WHEN** `deleteOrphans` is disabled and a resource exists remotely but not in manifests
- **THEN** the diff produces a `NOOP` for that resource (it is left alone)

### Requirement: Strip server-only fields before comparison
The system SHALL strip read-only server-generated fields (`id`, `createdAt`, `updatedAt`) from actual API responses before comparing with desired manifests to avoid spurious UPDATE changes.

#### Scenario: Only server fields differ
- **WHEN** the desired manifest and actual resource differ only in `id`, `createdAt`, and `updatedAt`
- **THEN** the diff produces a `NOOP` change

#### Scenario: Server fields and spec fields differ
- **WHEN** the actual resource has a different `cronSchedule` in addition to server-only fields
- **THEN** the diff produces an `UPDATE` change with only `cronSchedule` in the patch

### Requirement: Reconcile Monitors by tag
The system SHALL use `metadata.tag` as the stable key for matching Monitor manifests to remote monitors.

#### Scenario: Monitor matched by tag
- **WHEN** a manifest has `metadata.tag: my-api` and a remote monitor exists with `tag: my-api`
- **THEN** they are matched as the same resource for comparison

### Requirement: Reconcile Pages by path
The system SHALL use `metadata.path` as the stable key for matching Page manifests to remote pages (`~home` for the root/default page).

#### Scenario: Page matched by path
- **WHEN** a manifest has `metadata.path: services` and a remote page exists with `path: services`
- **THEN** they are matched as the same resource

#### Scenario: Root page matched by home path
- **WHEN** a manifest has `metadata.path: ~home` and the remote has a page at the root
- **THEN** they are matched as the same resource

### Requirement: Reconcile AlertTriggers by name
The system SHALL use `metadata.name` as the stable key for matching AlertTrigger manifests to remote triggers.

### Requirement: Reconcile AlertConfigs via state identity file
The system SHALL use `metadata.name` as the stable local key for AlertConfigs, looking up the remote integer ID from `.kener-ctl-state.json`. If no mapping exists, the config is treated as a new CREATE.

#### Scenario: AlertConfig has existing state mapping
- **WHEN** `metadata.name: api-down-critical` has an entry in `.kener-ctl-state.json` mapping to remote ID 3
- **THEN** the reconciler fetches the remote AlertConfig with ID 3 for comparison

#### Scenario: AlertConfig has no state mapping
- **WHEN** `metadata.name: api-down-critical` has no entry in `.kener-ctl-state.json`
- **THEN** the reconciler searches remote AlertConfigs for a matching composite (monitorTag + alertType + alertValue) or treats it as CREATE if not found

### Requirement: Reconcile Incidents via state identity file
The system SHALL use `metadata.name` as the stable local key for Incidents, looking up the remote integer ID from `.kener-ctl-state.json`.

### Requirement: Reconcile Maintenances via state identity file
The system SHALL use `metadata.name` as the stable local key for Maintenances, looking up the remote integer ID from `.kener-ctl-state.json`.

### Requirement: Apply changes in dependency order
The system SHALL execute CREATE and UPDATE changes in the order: AlertTriggers → Monitors → Pages → AlertConfigs → Incidents → Maintenances. DELETE changes SHALL be executed in reverse order.

#### Scenario: Page references a monitor being created in same apply
- **WHEN** a manifest creates both a Monitor (`my-api`) and a Page referencing `my-api`
- **THEN** the Monitor is created first, then the Page is created, avoiding a foreign-key error

#### Scenario: Delete dependencies before parents
- **WHEN** deleting a Monitor and its dependent Page in the same apply
- **THEN** the Page is deleted first, then the Monitor

### Requirement: Apply changes with bounded concurrency
The system SHALL execute CREATE/UPDATE/DELETE operations in parallel within each dependency tier, limited to the configured `concurrency` value (default 4).

#### Scenario: 10 independent resources with concurrency 4
- **WHEN** there are 10 AlertTriggers to create with concurrency set to 4
- **THEN** at most 4 HTTP requests are in flight at any time

### Requirement: Collect per-resource API errors
The system SHALL continue applying other resources when one resource's API call fails, collecting all errors for reporting at the end.

#### Scenario: One update fails, others succeed
- **WHEN** updating Monitor A fails with a 400 error but updating Monitor B succeeds
- **THEN** both outcomes are reported; Monitor B is successfully updated

### Requirement: Update state identity file after successful apply
The system SHALL atomically update `.kener-ctl-state.json` after each successful apply, writing new name→ID mappings for created resources and removing mappings for deleted resources.

#### Scenario: New Incident created
- **WHEN** an Incident is created with `metadata.name: outage-1` and the API returns ID 42
- **THEN** the state file is updated with `"outage-1": 42` in the incidents section

#### Scenario: Incident deleted
- **WHEN** an Incident with `metadata.name: outage-1` is deleted
- **THEN** the `outage-1` entry is removed from the state file's incidents section

#### Scenario: Atomic write prevents corruption
- **WHEN** the state file is being updated and the process crashes mid-write
- **THEN** the previous state file is preserved intact (write to temp file, then rename)
