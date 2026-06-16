# cli-commands

## Purpose

TBD

## Requirements

### Requirement: apply command
The system SHALL provide an `apply` subcommand that loads manifests, computes a diff against the remote Kener instance, and executes changes (unless `--dry-run` is specified).

#### Scenario: Apply creates new resources
- **WHEN** `kener-ctl apply` is run with manifests declaring resources absent from the remote
- **THEN** the resources are created on the remote instance and a summary table is printed

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

### Requirement: plan command
The system SHALL provide a `plan` subcommand that is functionally identical to `apply --dry-run`, showing a coloured diff table of changes that would be made.

#### Scenario: Plan shows create, update, delete, noop
- **WHEN** `kener-ctl plan` is run with a mix of new, changed, orphaned, and unchanged resources
- **THEN** a table is printed with + (green) for CREATE, ~ (yellow) for UPDATE, - (red) for DELETE, and · (grey) for NOOP

#### Scenario: Plan with no changes
- **WHEN** `kener-ctl plan` is run and all resources match the remote state
- **THEN** a message is printed indicating no changes, and the command exits with code 0

#### Scenario: Plan exits with code 2 on manifest validation errors
- **WHEN** `kener-ctl plan` encounters invalid manifests
- **THEN** the command exits with code 2

### Requirement: validate command
The system SHALL provide a `validate` subcommand that parses and validates all manifest files without making any API calls.

#### Scenario: All manifests valid
- **WHEN** `kener-ctl validate` is run and all manifests pass Zod validation
- **THEN** a success message is printed and the command exits with code 0

#### Scenario: Some manifests invalid
- **WHEN** `kener-ctl validate` encounters validation errors in manifests
- **THEN** all errors are collected and printed with file paths and field details, and the command exits with code 2

### Requirement: pull command
The system SHALL provide a `pull` subcommand that fetches all resources (or a specific kind) from the remote Kener instance and writes them as YAML manifest files into `stateDir`.

#### Scenario: Pull all resource kinds
- **WHEN** `kener-ctl pull` is run against a Kener instance with existing resources
- **THEN** YAML files are written to `stateDir/` organized by kind (e.g., `monitors/`, `pages/`), each containing valid manifests

#### Scenario: Pull specific kind
- **WHEN** `kener-ctl pull --kind Monitor` is run
- **THEN** only Monitor manifests are written; other resource kinds are not fetched

#### Scenario: Pull skips existing files
- **WHEN** `kener-ctl pull` would write to a file that already exists
- **THEN** the file is skipped and a warning is printed

#### Scenario: Pull with overwrite flag
- **WHEN** `kener-ctl pull --overwrite` would write to a file that already exists
- **THEN** the existing file is overwritten

#### Scenario: Pull creates parent directories
- **WHEN** `kener-ctl pull` writes to `stateDir/monitors/api.yaml` and the `monitors/` directory does not exist
- **THEN** the directory is created automatically

### Requirement: get command
The system SHALL provide a `get` subcommand to fetch and display one or all resources of a given kind, with configurable output format.

#### Scenario: Get all monitors as table
- **WHEN** `kener-ctl get monitors` is run (default table output)
- **THEN** all remote monitors are fetched and displayed in a table with key fields (tag, name, type, status)

#### Scenario: Get single monitor by tag
- **WHEN** `kener-ctl get monitor my-api` is run
- **THEN** the monitor with tag `my-api` is fetched and displayed

#### Scenario: Get output as JSON
- **WHEN** `kener-ctl get monitors --output json` is run
- **THEN** the monitors are printed as formatted JSON

#### Scenario: Get output as YAML
- **WHEN** `kener-ctl get monitors --output yaml` is run
- **THEN** the monitors are printed as YAML

#### Scenario: Get with unknown resource kind
- **WHEN** `kener-ctl get foobars` is run
- **THEN** an error message is printed listing valid resource kinds and the command exits with code 1

### Requirement: delete command
The system SHALL provide a `delete` subcommand to immediately delete a single remote resource by its stable key, with confirmation prompt unless `--yes` is passed.

#### Scenario: Delete monitor by tag with confirmation
- **WHEN** `kener-ctl delete monitor my-api` is run and the user confirms
- **THEN** the remote monitor with tag `my-api` is deleted

#### Scenario: Delete with --yes flag skips confirmation
- **WHEN** `kener-ctl delete monitor my-api --yes` is run
- **THEN** the remote monitor is deleted without prompting for confirmation

#### Scenario: Delete non-existent resource
- **WHEN** `kener-ctl delete monitor nonexistent` is run for a tag that does not exist
- **THEN** an error message is printed and the command exits with code 1

### Requirement: Coloured diff output in plan
The system SHALL render a table with coloured action indicators when `plan` or `apply --dry-run` produces output.

#### Scenario: Colour in TTY mode
- **WHEN** stdout is a TTY
- **THEN** CREATE rows show green `+`, UPDATE rows show yellow `~`, DELETE rows show red `-`, NOOP rows show grey `·`

#### Scenario: No colour in non-TTY mode
- **WHEN** stdout is not a TTY (piped or redirected)
- **THEN** the table is rendered without ANSI colour codes

### Requirement: Structured logging via consola
The system SHALL use `consola` for all log output, supporting verbose mode and automatic TTY detection.

#### Scenario: Verbose logging
- **WHEN** a command runs with verbose flag or config
- **THEN** detailed debug information (API request URLs, response statuses, diff details) is logged

#### Scenario: Info-level by default
- **WHEN** no verbosity flag is set
- **THEN** only info, warn, and error messages are displayed

### Requirement: Non-TTY mode degrades gracefully
The system SHALL detect non-TTY output and automatically disable spinners and colour.

#### Scenario: Output piped to file
- **WHEN** `kener-ctl plan > output.txt`
- **THEN** the output contains plain text without ANSI escape codes or spinner animations

### Requirement: Help text for all commands
The system SHALL auto-generate `--help` output for every command and subcommand via `citty`, showing available options, descriptions, and defaults.

#### Scenario: Top-level help
- **WHEN** `kener-ctl --help` is run
- **THEN** a list of all available subcommands (apply, plan, validate, pull, get, delete) is printed with descriptions

#### Scenario: Subcommand help
- **WHEN** `kener-ctl apply --help` is run
- **THEN** all options for the apply command are printed with types, descriptions, and defaults
