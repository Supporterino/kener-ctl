## MODIFIED Requirements

### Requirement: Discover manifest files recursively
The system SHALL discover all `*.yaml` and `*.yml` files within `manifestDir` using `Bun.Glob`, including nested subdirectories.

#### Scenario: Flat directory structure
- **WHEN** `manifestDir` contains `monitors.yaml`, `pages.yaml`, and `alerts.yaml` directly
- **THEN** all three files are discovered and processed

#### Scenario: Nested directory structure
- **WHEN** `manifestDir` contains `monitors/api.yaml` and `monitors/db.yaml` in a subdirectory
- **THEN** both files are discovered and processed

#### Scenario: Mixed file extensions
- **WHEN** `manifestDir` contains `monitors.yaml` and `pages.yml`
- **THEN** both files are discovered and processed

#### Scenario: Empty manifest directory
- **WHEN** `manifestDir` exists but contains no YAML files
- **THEN** the system proceeds with an empty manifest set (warns but does not error)
