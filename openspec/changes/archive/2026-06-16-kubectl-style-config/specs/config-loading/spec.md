# config-loading

Delta spec for changes to the configuration loading system.

## REMOVED Requirements

### Requirement: Load configuration from kener-ctl.yaml
**Reason**: Config location moved from CWD-relative (via `c12`) to fixed XDG config path (`~/.config/kener-ctl/config.yaml`).
**Migration**: Move your `kener-ctl.yaml` contents to `~/.config/kener-ctl/config.yaml` using the new context-based schema. See `context-config` spec for schema details.

### Requirement: Override config with environment variables
**Reason**: `KENER_URL` and `KENER_API_KEY` no longer apply in a multi-context world. Replaced by `KENER_CONTEXT` which selects the active context.
**Migration**: Set `KENER_CONTEXT=<name>` to select which context to use, rather than overriding individual instance/API key fields.

### Requirement: Override config via CLI flags
**Reason**: The `--config` flag to specify a custom config file path is removed; config now lives at a fixed XDG location.
**Migration**: Use `--context` to select the context instead of pointing to a different config file.

## MODIFIED Requirements

### Requirement: Validate configuration schema
The system SHALL validate the loaded configuration against a Zod schema. The schema SHALL include a `version` field (literal `1`), a `contexts` array of context objects (each with `name`, `instance` URL, and `apiKey` string), a `current-context` string that MUST match one of the defined context names, and an optional `defaults` block. Duplicate context names SHALL be rejected. If no config file exists, commands requiring a context SHALL exit with code 1 and a message indicating the config file is missing.

#### Scenario: Required field missing
- **WHEN** a context in the config file specifies `instance` but not `apiKey`
- **THEN** the system exits with code 1 and prints a formatted error message listing missing fields

#### Scenario: Invalid field value
- **WHEN** the defaults block specifies `concurrency: "four"` (a string instead of a number)
- **THEN** the system exits with code 1 and prints the Zod validation error

#### Scenario: Valid config with defaults
- **WHEN** a single context with `instance` and `apiKey` is defined, and `defaults` is omitted
- **THEN** the system applies defaults: `stateDir: ./state`, `dryRun: false`, `deleteOrphans: false`, `concurrency: 4`

#### Scenario: current-context references non-existent context
- **WHEN** `current-context: unknown` is set but no context named `unknown` exists
- **THEN** config validation fails with an error indicating the current-context does not exist

#### Scenario: Duplicate context names
- **WHEN** two contexts have the same `name` value
- **THEN** config validation fails with an error indicating duplicate context names

#### Scenario: Config file does not exist
- **WHEN** no config file exists at `~/.config/kener-ctl/config.yaml` (or `$XDG_CONFIG_HOME/kener-ctl/config.yaml`)
- **THEN** commands requiring a context exit with code 1 and print a message indicating the config file is missing with instructions to create one

### Requirement: Build typed context object
The system SHALL produce a validated, typed `ResolvedConfig` object that flattens the active context's `instance` and `apiKey` with the `defaults` block values, making all six fields (`instance`, `apiKey`, `stateDir`, `dryRun`, `deleteOrphans`, `concurrency`) plus `contextName` available to every CLI command.

#### Scenario: Context available to all commands
- **WHEN** the config is loaded and validated successfully with active context `prod`
- **THEN** every CLI command receives the typed context with `instance`, `apiKey`, `stateDir`, `dryRun`, `deleteOrphans`, `concurrency`, and `contextName: prod` fields

#### Scenario: State file path derived from context name
- **WHEN** the active context is `prod`
- **THEN** the state file path is `~/.config/kener-ctl/state/prod.json`, independent of `stateDir`

## ADDED Requirements

### Requirement: Context resolution priority
The system SHALL resolve the active context using the following priority: (1) `--context` CLI flag, (2) `KENER_CONTEXT` environment variable, (3) `current-context` in the config file. If none resolve to a valid configured context, the command SHALL exit with code 1.

#### Scenario: CLI flag takes priority
- **WHEN** the config has `current-context: prod`, `KENER_CONTEXT=staging` is set, and `--context dev` is passed
- **THEN** the `dev` context is used

#### Scenario: Env var overrides config default
- **WHEN** the config has `current-context: prod` and `KENER_CONTEXT=staging` is set
- **THEN** the `staging` context is used

#### Scenario: No context resolves
- **WHEN** no `--context` flag, no `KENER_CONTEXT`, and config file has no `current-context`
- **THEN** the command exits with code 1 and prints a message instructing the user to set a context

### Requirement: Config loaded from fixed XDG path
The system SHALL resolve the config file path as `$XDG_CONFIG_HOME/kener-ctl/config.yaml` if `XDG_CONFIG_HOME` is set, otherwise `~/.config/kener-ctl/config.yaml`. The `c12` library SHALL no longer be used for config discovery.

#### Scenario: Config loaded from default path
- **WHEN** `XDG_CONFIG_HOME` is not set and `~/.config/kener-ctl/config.yaml` exists
- **THEN** config is loaded from that path

#### Scenario: Config loaded from custom XDG path
- **WHEN** `XDG_CONFIG_HOME=/custom/path` and `/custom/path/kener-ctl/config.yaml` exists
- **THEN** config is loaded from `/custom/path/kener-ctl/config.yaml`
