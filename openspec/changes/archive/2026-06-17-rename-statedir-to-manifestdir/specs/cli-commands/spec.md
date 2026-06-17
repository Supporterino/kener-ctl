## MODIFIED Requirements

### Requirement: pull command
The system SHALL provide a `pull` subcommand to export remote resources as YAML manifests. The command SHALL support a `--context` flag for context selection. The `--config` flag SHALL be removed.

#### Scenario: Pull all resource kinds
- **WHEN** `kener-ctl pull` is run against a Kener instance with existing resources
- **THEN** YAML files are written to `manifestDir/` organized by kind (e.g., `monitors/`, `pages/`), each containing valid manifests

#### Scenario: Pull specific kind
- **WHEN** `kener-ctl pull --kind Monitor` is run
- **THEN** only Monitor manifests are written; other resource kinds are not fetched

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
- **WHEN** `kener-ctl pull` writes to `manifestDir/monitors/api.yaml` and the `monitors/` directory does not exist
- **THEN** the directory is created automatically

## ADDED Requirements

### Requirement: apply, plan, validate support --manifest-dir flag
The system SHALL support a `--manifest-dir` CLI flag on the `apply`, `plan`, `validate`, and `pull` commands to override the `manifestDir` from config defaults.

#### Scenario: apply with explicit manifest directory
- **WHEN** `kener-ctl apply --manifest-dir ./my-manifests` is run
- **THEN** manifests are loaded from `./my-manifests/` instead of the config default

#### Scenario: plan with explicit manifest directory
- **WHEN** `kener-ctl plan --manifest-dir ./my-manifests` is run
- **THEN** manifests are loaded from `./my-manifests/`

#### Scenario: validate with explicit manifest directory
- **WHEN** `kener-ctl validate --manifest-dir ./my-manifests` is run
- **THEN** manifests are validated from `./my-manifests/`
