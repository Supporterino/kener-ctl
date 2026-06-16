# reconciliation

Delta spec for changes to state file path handling.

## MODIFIED Requirements

### Requirement: Reconcile AlertConfigs via state identity file
The system SHALL use `metadata.name` as the stable local key for AlertConfigs, looking up the remote integer ID from the state file at `~/.config/kener-ctl/state/<context-name>.json`. If no mapping exists, the config is treated as a new CREATE. The state file path SHALL be passed to the reconciler as a parameter, not derived from `stateDir`.

#### Scenario: AlertConfig has existing state mapping
- **WHEN** `metadata.name: api-down-critical` has an entry in the state file mapping to remote ID 3
- **THEN** the reconciler fetches the remote AlertConfig with ID 3 for comparison

#### Scenario: AlertConfig has no state mapping
- **WHEN** `metadata.name: api-down-critical` has no entry in the state file
- **THEN** the reconciler searches remote AlertConfigs for a matching composite (monitorTag + alertType + alertValue) or treats it as CREATE if not found

### Requirement: Reconcile Incidents via state identity file
The system SHALL use `metadata.name` as the stable local key for Incidents, looking up the remote integer ID from the state file at `~/.config/kener-ctl/state/<context-name>.json`. The state file path SHALL be passed to the reconciler as a parameter, not derived from `stateDir`.

#### Scenario: Incident has existing state mapping
- **WHEN** `metadata.name: outage-1` has an entry in the state file mapping to remote ID 42
- **THEN** the reconciler fetches the remote Incident with ID 42 for comparison

### Requirement: Reconcile Maintenances via state identity file
The system SHALL use `metadata.name` as the stable local key for Maintenances, looking up the remote integer ID from the state file at `~/.config/kener-ctl/state/<context-name>.json`. The state file path SHALL be passed to the reconciler as a parameter, not derived from `stateDir`.

#### Scenario: Maintenance has existing state mapping
- **WHEN** `metadata.name: sunday-upgrade` has an entry in the state file mapping to remote ID 7
- **THEN** the reconciler fetches the remote Maintenance with ID 7 for comparison

### Requirement: Update state identity file after successful apply
The system SHALL atomically update the state file at `~/.config/kener-ctl/state/<context-name>.json` after each successful apply, writing new name→ID mappings for created resources and removing mappings for deleted resources. The state file path SHALL be passed to the reconciler as a parameter.

#### Scenario: New Incident created
- **WHEN** an Incident is created with `metadata.name: outage-1` and the API returns ID 42
- **THEN** the state file is updated with `"outage-1": 42` in the incidents section

#### Scenario: Incident deleted
- **WHEN** an Incident with `metadata.name: outage-1` is deleted
- **THEN** the `outage-1` entry is removed from the state file's incidents section

#### Scenario: Atomic write prevents corruption
- **WHEN** the state file is being updated and the process crashes mid-write
- **THEN** the previous state file is preserved intact (write to temp file, then rename)

#### Scenario: State file directory created if missing
- **WHEN** the state file is being saved for a context and the directory `~/.config/kener-ctl/state/` does not exist
- **THEN** the directory is created automatically before writing
