# cli-commands

Delta spec for changes to CLI command flags and context selection.

## REMOVED Requirements

None removed. All existing commands are retained; only flag changes apply.

## MODIFIED Requirements

### Requirement: apply command
The system SHALL provide an `apply` subcommand that resolves the active context, loads manifests, computes a diff against the remote Kener instance, and executes changes (unless `--dry-run` is specified). The command SHALL support a `--context` flag to select the Kener context, overriding the config default and `KENER_CONTEXT` env var. The `--config` flag SHALL be removed.

#### Scenario: Apply creates new resources
- **WHEN** `kener-ctl apply` is run with manifests declaring resources absent from the remote
- **THEN** the resources are created on the remote instance for the active context and a summary table is printed

#### Scenario: Apply with explicit context
- **WHEN** `kener-ctl apply --context staging` is run
- **THEN** the `staging` context is used regardless of `current-context` or `KENER_CONTEXT`

#### Scenario: Apply with dry-run flag
- **WHEN** `kener-ctl apply --dry-run` is run
- **THEN** a plan table is printed showing what would change, but no API mutations are made

#### Scenario: Apply limited to one resource kind
- **WHEN** `kener-ctl apply --kind Monitor` is run
- **THEN** only Monitor resources are reconciled; other kinds are skipped

#### Scenario: Apply targets a single resource
- **WHEN** `kener-ctl apply --tag my-api` is run
- **THEN** only the Monitor with tag `my-api` is reconciled

#### Scenario: Apply with delete orphans
- **WHEN** `kener-ctl apply --delete-orphans` is run and remote has resources not in manifests
- **THEN** orphaned remote resources are deleted after creates and updates

#### Scenario: Apply exits with code 1 on API errors
- **WHEN** `kener-ctl apply` encounters one or more API errors during reconciliation
- **THEN** the command exits with code 1 after processing all resources

#### Scenario: Apply exits with code 2 on manifest validation errors
- **WHEN** `kener-ctl apply` encounters manifest files with validation errors
- **THEN** the command exits with code 2 without making any API calls

#### Scenario: Apply exits with code 0 on success
- **WHEN** `kener-ctl apply` successfully reconciles all resources (or has no changes to make)
- **THEN** the command exits with code 0

#### Scenario: Apply with no context configured
- **WHEN** `kener-ctl apply` is run but no context can be resolved (no current-context, no --context, no KENER_CONTEXT)
- **THEN** the command exits with code 1 and prints an error instructing the user to set a context

### Requirement: plan command
The system SHALL provide a `plan` subcommand functionally identical to `apply --dry-run`. The command SHALL support a `--context` flag for context selection. The `--config` flag SHALL be removed.

#### Scenario: Plan shows create, update, delete, noop
- **WHEN** `kener-ctl plan` is run with a mix of new, changed, orphaned, and unchanged resources
- **THEN** a table is printed with + (green) for CREATE, ~ (yellow) for UPDATE, - (red) for DELETE, and · (grey) for NOOP

#### Scenario: Plan with no changes
- **WHEN** `kener-ctl plan` is run and all resources match the remote state
- **THEN** a message is printed indicating no changes, and the command exits with code 0

#### Scenario: Plan with explicit context
- **WHEN** `kener-ctl plan --context staging` is run
- **THEN** the `staging` context is used

#### Scenario: Plan exits with code 2 on manifest validation errors
- **WHEN** `kener-ctl plan` encounters invalid manifests
- **THEN** the command exits with code 2

### Requirement: get command
The system SHALL provide a `get` subcommand to fetch and display resources. The command SHALL support a `--context` flag for context selection. The `--config` flag SHALL be removed.

#### Scenario: Get all monitors as table
- **WHEN** `kener-ctl get monitors` is run (default table output)
- **THEN** all remote monitors on the active context's instance are fetched and displayed in a table

#### Scenario: Get single monitor by tag
- **WHEN** `kener-ctl get monitor my-api` is run
- **THEN** the monitor with tag `my-api` is fetched and displayed

#### Scenario: Get with explicit context
- **WHEN** `kener-ctl get monitors --context staging` is run
- **THEN** monitors are fetched from the `staging` instance

#### Scenario: Get output as JSON
- **WHEN** `kener-ctl get monitors --output json` is run
- **THEN** the monitors are printed as formatted JSON

#### Scenario: Get output as YAML
- **WHEN** `kener-ctl get monitors --output yaml` is run
- **THEN** the monitors are printed as YAML

### Requirement: delete command
The system SHALL provide a `delete` subcommand to immediately delete a single remote resource. The command SHALL support a `--context` flag for context selection. The `--config` flag SHALL be removed.

#### Scenario: Delete monitor by tag with confirmation
- **WHEN** `kener-ctl delete monitor my-api` is run and the user confirms
- **THEN** the remote monitor with tag `my-api` is deleted from the active context's instance

#### Scenario: Delete with --yes flag skips confirmation
- **WHEN** `kener-ctl delete monitor my-api --yes` is run
- **THEN** the remote monitor is deleted without prompting for confirmation

#### Scenario: Delete with explicit context
- **WHEN** `kener-ctl delete monitor my-api --context staging --yes` is run
- **THEN** the monitor is deleted from the `staging` instance

#### Scenario: Delete non-existent resource
- **WHEN** `kener-ctl delete monitor nonexistent` is run for a tag that does not exist
- **THEN** an error message is printed and the command exits with code 1

### Requirement: pull command
The system SHALL provide a `pull` subcommand to export remote resources as YAML manifests. The command SHALL support a `--context` flag for context selection. The `--config` flag SHALL be removed.

#### Scenario: Pull all resource kinds
- **WHEN** `kener-ctl pull` is run against the active context's instance with existing resources
- **THEN** YAML files are written to `stateDir/` organized by kind

#### Scenario: Pull with explicit context
- **WHEN** `kener-ctl pull --context staging` is run
- **THEN** resources are pulled from the `staging` instance

#### Scenario: Pull specific kind
- **WHEN** `kener-ctl pull --kind Monitor` is run
- **THEN** only Monitor manifests are written; other resource kinds are not fetched
