## ADDED Requirements

### Requirement: Exhaustive Monitor examples
The project SHALL include YAML example files for every monitor type in `MonitorTypeEnum`.

#### Scenario: API monitor exists
- **WHEN** a user navigates to `examples/monitors/`
- **THEN** they SHALL find `api.yaml` with `type: API`, a `url`, `method`, `timeout`, and optional `headers`, `body`, and `eval` fields

#### Scenario: All 10 monitor types are present
- **WHEN** a user lists `examples/monitors/`
- **THEN** they SHALL find exactly `api.yaml`, `ping.yaml`, `tcp.yaml`, `dns.yaml`, `ssl.yaml`, `sql.yaml`, `heartbeat.yaml`, `gamedig.yaml`, `grpc.yaml`, and `group.yaml`

#### Scenario: GROUP monitor references other monitor tags
- **WHEN** reading `examples/monitors/group.yaml`
- **THEN** the `spec.typeData.monitorTags` field SHALL reference tags from other example monitors (e.g., `api-example`, `ping-example`)

### Requirement: Exhaustive Page examples
The project SHALL include YAML example files demonstrating page layouts, SEO configuration, and monitor references.

#### Scenario: Default list layout exists
- **WHEN** a user navigates to `examples/pages/`
- **THEN** they SHALL find `home.yaml` with `display.layout: default-list` and `monitors` referencing example monitor tags

#### Scenario: Grid layout exists
- **WHEN** a user navigates to `examples/pages/`
- **THEN** they SHALL find an example with `display.layout: default-grid`

#### Scenario: SEO example exists
- **WHEN** a user navigates to `examples/pages/`
- **THEN** they SHALL find an example with `seo.metaTitle` and `seo.metaDescription` fields populated

### Requirement: Exhaustive AlertTrigger examples
The project SHALL include YAML example files for every trigger type in `TriggerTypeEnum`.

#### Scenario: All 4 trigger types are present
- **WHEN** a user lists `examples/alert-triggers/`
- **THEN** they SHALL find exactly `webhook.yaml`, `discord.yaml`, `slack.yaml`, and `email.yaml`

#### Scenario: Each trigger type has its required fields
- **WHEN** reading `examples/alert-triggers/slack.yaml`
- **THEN** `webhookUrl` SHALL be populated
- **WHEN** reading `examples/alert-triggers/email.yaml`
- **THEN** `emailAddresses` SHALL be populated
- **WHEN** reading `examples/alert-triggers/discord.yaml`
- **THEN** `discordChannelId` SHALL be populated

### Requirement: Exhaustive AlertConfig examples
The project SHALL include YAML example files for every alert type in `AlertTypeEnum`.

#### Scenario: All 3 alert types are present
- **WHEN** a user lists `examples/alert-configs/`
- **THEN** they SHALL find exactly `status.yaml`, `latency.yaml`, and `uptime.yaml`

#### Scenario: Status alert config references a monitor and triggers
- **WHEN** reading `examples/alert-configs/status.yaml`
- **THEN** `monitorTag` SHALL reference an example monitor tag and `triggerNames` SHALL reference example trigger names

### Requirement: Exhaustive Incident examples
The project SHALL include YAML example files for every incident state in `IncidentStateEnum`.

#### Scenario: All 4 incident states are present
- **WHEN** a user lists `examples/incidents/`
- **THEN** they SHALL find exactly `investigating.yaml`, `identified.yaml`, `monitoring.yaml`, and `resolved.yaml`

#### Scenario: Incidents reference affected monitors
- **WHEN** reading `examples/incidents/investigating.yaml`
- **THEN** `affectedMonitors` SHALL contain entries with `tag` values matching example monitor tags

### Requirement: Exhaustive Maintenance examples
The project SHALL include YAML example files covering one-shot and recurring maintenance windows.

#### Scenario: Scheduled maintenance exists
- **WHEN** a user lists `examples/maintenances/`
- **THEN** they SHALL find `scheduled.yaml` with `startDatetime` and `endDatetime` as ISO 8601 strings and `monitors` referencing example monitor tags

#### Scenario: Recurring maintenance exists
- **WHEN** a user lists `examples/maintenances/`
- **THEN** they SHALL find `recurring.yaml` with a populated `rrule` field

### Requirement: Examples are self-consistent
All example files within `examples/` SHALL form a coherent dependency graph using consistent tag names, trigger names, and path references.

#### Scenario: Monitor tags are consistent across files
- **WHEN** cross-checking `examples/monitors/api.yaml` (tag), `examples/pages/home.yaml` (monitors), and `examples/alert-configs/status.yaml` (monitorTag)
- **THEN** the tag `api-example` SHALL match across all references
