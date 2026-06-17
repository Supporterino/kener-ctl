## MODIFIED Requirements

### Requirement: pull command
The system SHALL provide a `pull` subcommand to export remote resources as YAML manifests. The command SHALL support a `--context` flag for context selection. Pulled resources SHALL be mapped from API field names (snake_case) to manifest field names (camelCase) before writing.

#### Scenario: Pull all resource kinds
- **WHEN** `kener-ctl pull` is run against a Kener instance with existing resources
- **THEN** YAML files are written to `stateDir/` organized by kind (`monitors/`, `pages/`, `incidents/`, `maintenances/`), each containing valid manifests with camelCase field names

#### Scenario: Pull specific kind
- **WHEN** `kener-ctl pull --kind Monitor` is run
- **THEN** only Monitor manifests are written; other resource kinds are not fetched

#### Scenario: Pull only supported resource kinds
- **WHEN** `kener-ctl pull` is run
- **THEN** only Monitors, Pages, Incidents, and Maintenances are fetched. AlertTriggers and AlertConfigs are not attempted (endpoints don't exist)

#### Scenario: Pull with explicit context
- **WHEN** `kener-ctl pull --context staging` is run
- **THEN** resources are pulled from the `staging` instance

#### Scenario: Pull skips existing files
- **WHEN** `kener-ctl pull` would write to a file that already exists
- **THEN** the file is skipped and a warning is printed

#### Scenario: Pull with overwrite flag
- **WHEN** `kener-ctl pull --overwrite` would write to a file that already exists
- **THEN** the existing file is overwritten

#### Scenario: Pull creates parent directories
- **WHEN** `kener-ctl pull` writes to `stateDir/monitors/api.yaml` and the `monitors/` directory does not exist
- **THEN** the directory is created automatically

#### Scenario: Pull unwraps API response envelopes
- **WHEN** the API returns `{ "monitors": [...] }`
- **THEN** the pull command extracts the inner array and writes each monitor as a separate manifest file

### Requirement: get command
The system SHALL provide a `get` subcommand to fetch and display resources. The command SHALL support a `--context` flag for context selection. Monitors SHALL be fetched by `tag`, pages by `path`, incidents and maintenances by numeric ID.

#### Scenario: Get all monitors as table
- **WHEN** `kener-ctl get monitors` is run (default table output)
- **THEN** all remote monitors are fetched, unwrapped from `{ "monitors": [...] }`, and displayed in a table with key fields

#### Scenario: Get single monitor by tag
- **WHEN** `kener-ctl get monitor my-api` is run
- **THEN** the monitor with tag `my-api` is fetched from `/api/v4/monitors/my-api` and displayed

#### Scenario: Get single page by path
- **WHEN** `kener-ctl get page services` is run
- **THEN** the page with `page_path: services` is fetched and displayed

#### Scenario: Get with explicit context
- **WHEN** `kener-ctl get monitors --context staging` is run
- **THEN** monitors are fetched from the `staging` instance

#### Scenario: Get output as JSON
- **WHEN** `kener-ctl get monitors --output json` is run
- **THEN** the monitors are printed as formatted JSON

#### Scenario: Get output as YAML
- **WHEN** `kener-ctl get monitors --output yaml` is run
- **THEN** the monitors are printed as YAML

#### Scenario: Get with unknown resource kind
- **WHEN** `kener-ctl get foobars` is run
- **THEN** an error message is printed listing valid resource kinds and the command exits with code 1

#### Scenario: Get alert-triggers or alert-configs returns error
- **WHEN** `kener-ctl get alert-triggers` or `kener-ctl get alert-configs` is run
- **THEN** an error message is printed indicating these resource kinds are not yet supported by Kener v4

### Requirement: delete command
The system SHALL provide a `delete` subcommand to immediately delete a single remote resource. The command SHALL support a `--context` flag for context selection. Monitor deletion SHALL be a soft-deactivation (PATCH with `status: "INACTIVE"`) since Kener v4 does not support DELETE for monitors. The command SHALL display a note when deactivating a monitor.

#### Scenario: Delete monitor by tag with confirmation
- **WHEN** `kener-ctl delete monitor my-api` is run and the user confirms
- **THEN** the remote monitor with tag `my-api` is soft-deactivated (PATCH with `status: "INACTIVE"`) and a note is displayed indicating it was deactivated, not deleted

#### Scenario: Delete page by path
- **WHEN** `kener-ctl delete page services` is run with confirmation
- **THEN** the remote page with path `services` is deleted via DELETE request

#### Scenario: Delete incident by id
- **WHEN** `kener-ctl delete incident 42` is run with confirmation
- **THEN** the remote incident with id 42 is deleted via DELETE request

#### Scenario: Delete with --yes flag skips confirmation
- **WHEN** `kener-ctl delete monitor my-api --yes` is run
- **THEN** the remote monitor is deactivated without prompting for confirmation

#### Scenario: Delete with explicit context
- **WHEN** `kener-ctl delete monitor my-api --context staging --yes` is run
- **THEN** the monitor is deactivated on the `staging` instance

#### Scenario: Delete non-existent resource
- **WHEN** `kener-ctl delete monitor nonexistent` is run for a tag that does not exist
- **THEN** an error message is printed and the command exits with code 1

#### Scenario: Delete alert-trigger or alert-config returns error
- **WHEN** `kener-ctl delete alert-trigger foo` or `kener-ctl delete alert-config bar` is run
- **THEN** an error message is printed indicating these resource kinds are not yet supported

## REMOVED Requirements

None — all requirements are MODIFIED rather than removed. The command names and structure remain the same; only the implementation details change.

## ADDED Requirements

### Requirement: pull writes proper YAML manifests with camelCase fields
The system SHALL translate API response field names from snake_case to camelCase when writing pulled manifests, so that the output is immediately usable as kener-ctl manifest files.

#### Scenario: Pulled monitor uses camelCase
- **WHEN** the API returns a monitor with `{ "monitor_type": "API", "default_status": "UP", "type_data": {...} }`
- **THEN** the written manifest file uses `monitorType: API`, `defaultStatus: UP`, `typeData: {...}`

#### Scenario: Pulled page maps monitors correctly
- **WHEN** the API returns a page with `"monitors": [{ "monitor_tag": "api", "position": 0 }]`
- **THEN** the written manifest file uses `monitors: ["api"]` (list of tags, not objects)
