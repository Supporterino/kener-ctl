## ADDED Requirements

### Requirement: Load configuration from kener-ctl.yaml
The system SHALL load configuration from a `kener-ctl.yaml` file located in the current working directory or any parent directory, using `c12` for file discovery and parsing. The file MUST support YAML, JSON, and TypeScript formats.

#### Scenario: Config file found in current directory
- **WHEN** `kener-ctl.yaml` exists in the working directory and contains `instance` and `apiKey`
- **THEN** the system loads all fields and proceeds with a valid config context

#### Scenario: Config file found in parent directory
- **WHEN** `kener-ctl.yaml` exists in a parent directory but not the current directory
- **THEN** the system discovers and loads it via `c12`'s default upward traversal

#### Scenario: Config file not found
- **WHEN** no `kener-ctl.yaml` (or `.json`/`.ts` variant) exists in any parent directory
- **THEN** the system exits with code 1 and prints a message indicating the config file is missing

### Requirement: Override config with environment variables
The system SHALL allow `KENER_URL` and `KENER_API_KEY` environment variables to override the `instance` and `apiKey` fields from the config file respectively.

#### Scenario: Env var overrides file value
- **WHEN** `kener-ctl.yaml` specifies `instance: https://status.example.com` and `KENER_URL=https://status-prod.example.com` is set
- **THEN** the system uses `https://status-prod.example.com` as the instance URL

#### Scenario: Env var provides missing field
- **WHEN** `kener-ctl.yaml` does not specify `apiKey` but `KENER_API_KEY` is set
- **THEN** the system uses the environment variable value and proceeds

### Requirement: Validate configuration schema
The system SHALL validate the merged configuration (file + env overrides) against a Zod schema at startup.

#### Scenario: Required field missing
- **WHEN** neither the config file nor environment variables provide `instance` or `apiKey`
- **THEN** the system exits with code 1 and prints a formatted error message listing all missing required fields

#### Scenario: Invalid field value
- **WHEN** the config file specifies `concurrency: "four"` (a string instead of a number)
- **THEN** the system exits with code 1 and prints the Zod validation error

#### Scenario: Valid config with defaults
- **WHEN** only `instance` and `apiKey` are provided
- **THEN** the system applies defaults: `stateDir: ./state`, `dryRun: false`, `deleteOrphans: false`, `concurrency: 4`

### Requirement: Override config via CLI flags
The system SHALL allow CLI flags (`--config`, `--state-dir`, `--dry-run`, `--delete-orphans`) to override corresponding config file values.

#### Scenario: CLI flag overrides stateDir
- **WHEN** config specifies `stateDir: ./state` and the user passes `--state-dir ./prod-state`
- **THEN** the system uses `./prod-state` for manifest discovery

#### Scenario: Custom config path
- **WHEN** user passes `--config /path/to/custom.yaml`
- **THEN** the system loads configuration from that specific file instead of searching for `kener-ctl.yaml`

### Requirement: Build typed context object
The system SHALL produce a validated, typed context object containing all configuration, to be passed through the command chain.

#### Scenario: Context available to all commands
- **WHEN** the config is loaded and validated successfully
- **THEN** every CLI command receives the typed context with `instance`, `apiKey`, `stateDir`, `dryRun`, `deleteOrphans`, and `concurrency` fields
