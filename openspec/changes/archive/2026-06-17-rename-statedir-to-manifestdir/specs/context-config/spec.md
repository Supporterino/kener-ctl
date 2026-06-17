## MODIFIED Requirements

### Requirement: Global defaults block
The system SHALL support a `defaults` block in the config file with optional `manifestDir`, `concurrency`, `dryRun`, and `deleteOrphans` fields, each with the same defaults as the current system.

#### Scenario: Defaults provided
- **WHEN** the config file specifies `defaults: { manifestDir: ./my-manifests, concurrency: 8 }`
- **THEN** the resolved config uses `./my-manifests` as manifestDir and `8` as concurrency

#### Scenario: Defaults omitted
- **WHEN** the config file has no `defaults` block
- **THEN** the resolved config uses `./manifests`, `4`, `false`, `false` for manifestDir, concurrency, dryRun, and deleteOrphans respectively

#### Scenario: Partial defaults
- **WHEN** the config file specifies `defaults: { manifestDir: ./custom }` only
- **THEN** concurrency defaults to `4`, dryRun defaults to `false`, deleteOrphans defaults to `false`

### Requirement: Resolved config flattened for consumers
The system SHALL produce a flattened `ResolvedConfig` object containing the active context's `instance` and `apiKey` merged with `defaults` values, plus the active `contextName`.

#### Scenario: Config resolved for prod context
- **WHEN** the active context is `prod` with `instance: https://status.prod.example.com` and defaults specify `manifestDir: ./manifests`, `concurrency: 4`
- **THEN** the resolved config has `instance: https://status.prod.example.com`, `manifestDir: ./manifests`, `concurrency: 4`, `contextName: prod`

#### Scenario: Config resolved with CLI overrides merged separately
- **WHEN** the resolved config has `manifestDir: ./manifests` and the CLI passes `--manifest-dir ./prod-manifests`
- **THEN** the CLI layer overrides `manifestDir` to `./prod-manifests` without modifying the config file
