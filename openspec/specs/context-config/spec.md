# context-config

## Purpose

User-scoped configuration for the kener-ctl CLI, stored at the XDG config directory, supporting named contexts for multiple Kener instances.

## Requirements

### Requirement: Config file stored at XDG config path
The system SHALL load configuration from `$XDG_CONFIG_HOME/kener-ctl/config.yaml`, defaulting to `~/.config/kener-ctl/config.yaml` if `XDG_CONFIG_HOME` is not set.

#### Scenario: Config file exists at default path
- **WHEN** `~/.config/kener-ctl/config.yaml` exists and contains valid configuration
- **THEN** the system loads and validates the config successfully

#### Scenario: Config file exists at XDG path
- **WHEN** `XDG_CONFIG_HOME` is set to `/custom/path` and `/custom/path/kener-ctl/config.yaml` exists
- **THEN** the system loads config from the custom XDG path

#### Scenario: Config file does not exist
- **WHEN** no config file exists at the resolved path
- **THEN** commands requiring a context exit with code 1 and print a message indicating the config file is missing

#### Scenario: Config directory does not exist
- **WHEN** `~/.config/kener-ctl/` directory does not exist
- **THEN** commands requiring a context exit with code 1 and print a message indicating the config directory is missing, with instructions to create the config file

### Requirement: Contexts define instance and API key
The system SHALL support named contexts in the config file, each containing an `instance` URL and `apiKey` string.

#### Scenario: Multiple contexts defined
- **WHEN** the config file contains contexts `prod`, `staging`, and `dev` each with valid `instance` and `apiKey`
- **THEN** all three contexts are loaded and available for selection

#### Scenario: Context with invalid instance URL
- **WHEN** a context specifies `instance: not-a-url`
- **THEN** config validation fails with an error indicating the invalid URL

#### Scenario: Context with empty apiKey
- **WHEN** a context specifies `apiKey: ""` (empty string)
- **THEN** config validation fails with an error indicating apiKey is required

#### Scenario: Duplicate context names
- **WHEN** two contexts share the same `name` value
- **THEN** config validation fails with an error indicating duplicate context names

#### Scenario: No contexts defined
- **WHEN** the `contexts` array is empty or missing
- **THEN** config validation fails with an error indicating at least one context is required

### Requirement: current-context selects the active context
The system SHALL use the `current-context` field to determine which context is active by default.

#### Scenario: current-context points to a valid context
- **WHEN** `current-context: prod` is set and a context named `prod` exists
- **THEN** the `prod` context is used as the active context

#### Scenario: current-context points to non-existent context
- **WHEN** `current-context: unknown` is set but no context named `unknown` exists
- **THEN** config validation fails with an error indicating the current-context does not exist

### Requirement: Global defaults block
The system SHALL support a `defaults` block in the config file with optional `stateDir`, `concurrency`, `dryRun`, and `deleteOrphans` fields, each with the same defaults as the current system.

#### Scenario: Defaults provided
- **WHEN** the config file specifies `defaults: { stateDir: ./my-state, concurrency: 8 }`
- **THEN** the resolved config uses `./my-state` as stateDir and `8` as concurrency

#### Scenario: Defaults omitted
- **WHEN** the config file has no `defaults` block
- **THEN** the resolved config uses `./state`, `4`, `false`, `false` for stateDir, concurrency, dryRun, and deleteOrphans respectively

#### Scenario: Partial defaults
- **WHEN** the config file specifies `defaults: { stateDir: ./custom }` only
- **THEN** concurrency defaults to `4`, dryRun defaults to `false`, deleteOrphans defaults to `false`

### Requirement: Config version tracking
The system SHALL include a `version` field in the config file set to `1` for this schema revision.

#### Scenario: Config has version 1
- **WHEN** the config file specifies `version: 1`
- **THEN** validation passes

#### Scenario: Config has unknown version
- **WHEN** the config file specifies `version: 2`
- **THEN** validation fails with an error indicating unsupported config version

### Requirement: Resolved config flattened for consumers
The system SHALL produce a flattened `ResolvedConfig` object containing the active context's `instance` and `apiKey` merged with `defaults` values, plus the active `contextName`.

#### Scenario: Config resolved for prod context
- **WHEN** the active context is `prod` with `instance: https://status.prod.example.com` and defaults specify `stateDir: ./state`, `concurrency: 4`
- **THEN** the resolved config has `instance: https://status.prod.example.com`, `stateDir: ./state`, `concurrency: 4`, `contextName: prod`

#### Scenario: Config resolved with CLI overrides merged separately
- **WHEN** the resolved config has `stateDir: ./state` and the CLI passes `--state-dir ./prod-state`
- **THEN** the CLI layer overrides `stateDir` to `./prod-state` without modifying the config file

### Requirement: State file stored per-context in config dir
The system SHALL store the name-to-ID mapping state file at `$XDG_CONFIG_HOME/kener-ctl/state/<context-name>.json`.

#### Scenario: State file path for prod context
- **WHEN** the active context is `prod` and XDG config is `~/.config`
- **THEN** the state file path resolves to `~/.config/kener-ctl/state/prod.json`

#### Scenario: State directory created if missing
- **WHEN** the state file is being saved and `~/.config/kener-ctl/state/` does not exist
- **THEN** the directory is created automatically
