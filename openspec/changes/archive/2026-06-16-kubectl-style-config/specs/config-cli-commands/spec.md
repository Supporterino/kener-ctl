# config-cli-commands

## Purpose

CLI subcommands for inspecting and managing the kener-ctl configuration, particularly switching active contexts.

## ADDED Requirements

### Requirement: config use sets the active context
The system SHALL provide a `kener-ctl config use <name>` subcommand that updates `current-context` in the config file to the given context name and persists the change.

#### Scenario: Switch to an existing context
- **WHEN** `kener-ctl config use staging` is run and a context named `staging` exists
- **THEN** the config file is updated with `current-context: staging` and a success message is printed

#### Scenario: Switch to non-existent context
- **WHEN** `kener-ctl config use nonexistent` is run and no context named `nonexistent` exists
- **THEN** the command exits with code 1 and prints an error listing available context names

#### Scenario: Switch without config file
- **WHEN** `kener-ctl config use prod` is run but no config file exists
- **THEN** the command exits with code 1 and prints a message indicating no config file found

### Requirement: config current prints the active context
The system SHALL provide a `kener-ctl config current` subcommand that prints the name of the currently active context.

#### Scenario: Current context is set
- **WHEN** `kener-ctl config current` is run and `current-context` is `prod`
- **THEN** the output is `prod` and the command exits with code 0

#### Scenario: No config file exists
- **WHEN** `kener-ctl config current` is run and no config file exists
- **THEN** the command exits with code 1 and prints a message indicating no config file found

### Requirement: config list displays all contexts
The system SHALL provide a `kener-ctl config list` subcommand that displays all contexts in a table with columns for name, instance URL, and current context indicator.

#### Scenario: List multiple contexts
- **WHEN** `kener-ctl config list` is run with contexts `prod` and `staging`, and `current-context` is `prod`
- **THEN** a table is printed showing both contexts with `*` or highlight next to `prod` as the current context

#### Scenario: List when no config file exists
- **WHEN** `kener-ctl config list` is run and no config file exists
- **THEN** the command exits with code 1 and prints a message indicating no config file found

### Requirement: config subcommands registered on main CLI
The system SHALL register `config` as a subcommand of `kener-ctl` with `use`, `current`, and `list` as its subcommands, discoverable via `--help`.

#### Scenario: config help output
- **WHEN** `kener-ctl config --help` is run
- **THEN** the output lists `use`, `current`, and `list` as available subcommands with descriptions

#### Scenario: config use help output
- **WHEN** `kener-ctl config use --help` is run
- **THEN** the output shows the required `<name>` argument and its description
