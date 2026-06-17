## MODIFIED Requirements

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
