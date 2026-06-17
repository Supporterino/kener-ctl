## MODIFIED Requirements

### Requirement: Validate manifests against Zod schemas
The system SHALL validate every parsed manifest document against the appropriate Zod schema, selected by the `kind` discriminator field. The system MUST support 4 resource kinds: Monitor, Page, Incident, and Maintenance. AlertTrigger and AlertConfig SHALL NOT be accepted.

#### Scenario: Valid Monitor manifest
- **WHEN** a YAML document has `kind: Monitor` and all required Monitor fields
- **THEN** the manifest passes validation and is added to the manifest collection

#### Scenario: Valid Page manifest
- **WHEN** a YAML document has `kind: Page` and all required Page fields
- **THEN** the manifest passes validation and is added to the manifest collection

#### Scenario: Valid Incident manifest
- **WHEN** a YAML document has `kind: Incident` and all required Incident fields
- **THEN** the manifest passes validation and is added to the manifest collection

#### Scenario: Valid Maintenance manifest
- **WHEN** a YAML document has `kind: Maintenance` and all required Maintenance fields
- **THEN** the manifest passes validation and is added to the manifest collection

#### Scenario: Rejected AlertTrigger manifest
- **WHEN** a YAML document has `kind: AlertTrigger`
- **THEN** validation fails with an error message: "kind 'AlertTrigger' is not supported — this endpoint is not yet available in Kener v4"

#### Scenario: Rejected AlertConfig manifest
- **WHEN** a YAML document has `kind: AlertConfig`
- **THEN** validation fails with an error message: "kind 'AlertConfig' is not supported — this endpoint is not yet available in Kener v4"

### Requirement: Validate Monitor type-specific data
The system SHALL validate that Monitor manifests have exactly one type-specific data block matching their declared `type` (e.g., `typeData.url` for API monitors).

#### Scenario: Matching typeData for API monitor
- **WHEN** a Monitor has `type: API` and `typeData` containing `url`, `method`, `timeout`
- **THEN** validation passes

#### Scenario: Mismatched typeData
- **WHEN** a Monitor has `type: API` but `typeData` contains `host` and `port` (TCP fields)
- **THEN** validation fails with an error indicating the expected fields for type API

### Requirement: Collect and report all validation errors
The system SHALL continue parsing and validating all files even when some contain errors, collecting all Zod errors and reporting them together after processing all files.

#### Scenario: Multiple files with errors
- **WHEN** file A has an invalid Monitor and file B has an invalid Page
- **THEN** both sets of errors are reported together, with file paths and line/field information

#### Scenario: Mix of valid and invalid files
- **WHEN** 3 files are valid and 2 files have validation errors
- **THEN** the 3 valid manifests are available for use; the 2 invalid files produce collected errors

### Requirement: Validate Page monitor references
The system SHALL validate that Page manifest `spec.monitors` entries are string tags (not resolved to IDs at parse time).

#### Scenario: Page with monitor tags
- **WHEN** a Page manifest has `monitors: [my-api, db-primary]`
- **THEN** validation passes; resolution to remote IDs happens during reconciliation, not parsing

## REMOVED Requirements

### Requirement: Validate AlertTrigger manifest
**Reason**: AlertTrigger REST API endpoints do not exist in Kener v4. AlertTrigger manifests are rejected with a descriptive error.
**Migration**: Remove `kind: AlertTrigger` from manifest files. The kind will be supported when Kener v4 exposes alert trigger endpoints.

### Requirement: Validate AlertConfig manifest
**Reason**: AlertConfig REST API endpoints do not exist in Kener v4. AlertConfig manifests are rejected with a descriptive error.
**Migration**: Remove `kind: AlertConfig` from manifest files. The kind will be supported when Kener v4 exposes alert config endpoints.

### Requirement: Support all 8 Monitor types
**Reason**: Kener v4 uses `monitor_type` values that include `NONE` in addition to the expected types. This requirement is being replaced with a more complete enumeration.
**Migration**: The new requirement below includes all observed monitor types from Kener v4.

## ADDED Requirements

### Requirement: Support all Kener v4 Monitor types
The system SHALL validate Monitor manifests for all observed Kener v4 monitor types: API, PING, TCP, DNS, SSL, SQL, HEARTBEAT, GAMEDIG, GRPC, GROUP, and NONE.

#### Scenario: NONE monitor type
- **WHEN** a Monitor has `type: NONE`
- **THEN** validation passes (NONE is a valid Kener v4 monitor type for static/informational monitors)

### Requirement: Validate Incident monitor references
The system SHALL validate that Incident manifest `spec.affectedMonitors` entries have the correct shape: an array of objects with `tag` (string) and `impact` (DOWN or DEGRADED) fields.

#### Scenario: Incident with valid affected monitors
- **WHEN** an Incident manifest has `affectedMonitors: [{ tag: api, impact: DOWN }]`
- **THEN** validation passes

#### Scenario: Incident with invalid impact
- **WHEN** an Incident manifest has `affectedMonitors: [{ tag: api, impact: UNKNOWN }]`
- **THEN** validation fails with an error indicating impact must be DOWN or DEGRADED

### Requirement: Validate Maintenance recurrence and duration
The system SHALL validate that Maintenance manifests include `rrule` (an iCalendar RRULE string) and `durationSeconds` (a positive integer) as required fields. `endDatetime` SHALL NOT be a field in manifests (it is computed by Kener from start + duration).

#### Scenario: Maintenance with valid rrule and duration
- **WHEN** a Maintenance manifest has `rrule: "FREQ=WEEKLY;BYDAY=MO"` and `durationSeconds: 3600`
- **THEN** validation passes

#### Scenario: Maintenance missing rrule
- **WHEN** a Maintenance manifest has `durationSeconds: 3600` but no `rrule`
- **THEN** validation fails with an error indicating rrule is required

#### Scenario: Maintenance with endDatetime
- **WHEN** a Maintenance manifest includes `endDatetime`
- **THEN** validation warns or fails indicating `endDatetime` is not supported (use `durationSeconds` instead)

### Requirement: Validate Page path format
The system SHALL validate that Page manifest `metadata.path` is a string (can be empty for root page). Paths SHALL NOT start with a leading slash (the API strips them).

#### Scenario: Valid page path
- **WHEN** a Page manifest has `metadata.path: services`
- **THEN** validation passes

#### Scenario: Root page with empty path
- **WHEN** a Page manifest has `metadata.path: ""`
- **THEN** validation passes (empty string is the root page)
