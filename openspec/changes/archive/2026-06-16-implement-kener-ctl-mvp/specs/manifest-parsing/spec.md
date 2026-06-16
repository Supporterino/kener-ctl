## ADDED Requirements

### Requirement: Discover manifest files recursively
The system SHALL discover all `*.yaml` and `*.yml` files within `stateDir` using `Bun.Glob`, including nested subdirectories.

#### Scenario: Flat directory structure
- **WHEN** `stateDir` contains `monitors.yaml`, `pages.yaml`, and `alerts.yaml` directly
- **THEN** all three files are discovered and processed

#### Scenario: Nested directory structure
- **WHEN** `stateDir` contains `monitors/api.yaml` and `monitors/db.yaml` in a subdirectory
- **THEN** both files are discovered and processed

#### Scenario: Mixed file extensions
- **WHEN** `stateDir` contains `monitors.yaml` and `pages.yml`
- **THEN** both files are discovered and processed

#### Scenario: Empty state directory
- **WHEN** `stateDir` exists but contains no YAML files
- **THEN** the system proceeds with an empty manifest set (warns but does not error)

### Requirement: Parse YAML documents
The system SHALL parse each discovered file using `js-yaml`, handling both single documents and YAML document streams (multiple `---` separated documents in one file).

#### Scenario: Single document per file
- **WHEN** a file contains a single YAML document without `---` separator
- **THEN** the document is parsed into a single manifest object

#### Scenario: Multiple documents per file
- **WHEN** a file contains multiple YAML documents separated by `---`
- **THEN** each document is parsed as a separate manifest

#### Scenario: YAML list (array at root)
- **WHEN** a file contains a YAML array at the root level (list of resource objects)
- **THEN** each array element is treated as a separate manifest

### Requirement: Validate manifests against Zod schemas
The system SHALL validate every parsed manifest document against the appropriate Zod schema, selected by the `kind` discriminator field. All 6 resource kinds MUST be supported.

#### Scenario: Valid Monitor manifest
- **WHEN** a YAML document has `kind: Monitor` and all required Monitor fields
- **THEN** the manifest passes validation and is added to the manifest collection

#### Scenario: Valid Page manifest
- **WHEN** a YAML document has `kind: Page` and all required Page fields
- **THEN** the manifest passes validation and is added to the manifest collection

#### Scenario: Valid AlertTrigger manifest
- **WHEN** a YAML document has `kind: AlertTrigger` and all required AlertTrigger fields
- **THEN** the manifest passes validation and is added to the manifest collection

#### Scenario: Valid AlertConfig manifest
- **WHEN** a YAML document has `kind: AlertConfig` and all required AlertConfig fields
- **THEN** the manifest passes validation and is added to the manifest collection

#### Scenario: Valid Incident manifest
- **WHEN** a YAML document has `kind: Incident` and all required Incident fields
- **THEN** the manifest passes validation and is added to the manifest collection

#### Scenario: Valid Maintenance manifest
- **WHEN** a YAML document has `kind: Maintenance` and all required Maintenance fields
- **THEN** the manifest passes validation and is added to the manifest collection

### Requirement: Validate Monitor type-specific data
The system SHALL validate that Monitor manifests have exactly one type-specific data block matching their declared `type` (e.g., `typeData.url` for API monitors, `typeData.host` + `typeData.port` for TCP monitors).

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

### Requirement: Support all 8 Monitor types
The system SHALL validate Monitor manifests for all Kener v4 monitor types: API, PING, TCP, DNS, SSL, SQL, HEARTBEAT, GAMEDIG, GRPC, GROUP.

#### Scenario: GROUP monitor type
- **WHEN** a Monitor has `type: GROUP` with `typeData` containing a list of child monitor tags
- **THEN** validation passes and the group monitor is accepted

### Requirement: Validate Page monitor references
The system SHALL validate that Page manifest `spec.monitors` entries are string tags (not resolved to IDs at parse time).

#### Scenario: Page with monitor tags
- **WHEN** a Page manifest has `monitors: [my-api, db-primary]`
- **THEN** validation passes; resolution to remote IDs happens during reconciliation, not parsing
