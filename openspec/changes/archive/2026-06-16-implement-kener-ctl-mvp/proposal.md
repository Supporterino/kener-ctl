## Why

Kener has no CLI for declarative state management. Operators currently configure monitors, pages, alerts, incidents and maintenances through the web UI or ad-hoc API scripts — there's no way to version-control desired state, review changes before applying, or automate drift detection. This is the initial implementation of `kener-ctl`: a CLI that treats a Kener instance as a desired-state system, filling the same gap that Terraform fills for infrastructure or kubectl fills for Kubernetes.

## What Changes

- **New**: `kener-ctl` CLI binary with 6 subcommands: `apply`, `plan`, `validate`, `pull`, `get`, `delete`
- **New**: Configuration loading from `kener-ctl.yaml` via `c12`, with env var overrides (`KENER_URL`, `KENER_API_KEY`) and Zod validation
- **New**: YAML manifest loader that discovers `*.yaml`/`*.yml` files recursively in `stateDir`, parses them with `js-yaml`, and validates against Zod schemas for all 6 resource kinds (Monitor, Page, AlertTrigger, AlertConfig, Incident, Maintenance)
- **New**: Typed Kener v4 REST API client built on `ky` with bearer auth, retry logic, and error enrichment
- **New**: Reconciler engine that diffs desired (manifests) vs actual (API) state, produces ordered `CREATE | UPDATE | DELETE | NOOP` changes respecting dependency order, and applies them with bounded concurrency
- **New**: `.kener-ctl-state.json` identity file mapping stable manifest names to mutable remote integer IDs for resources that lack a string key (Incidents, Maintenances, AlertConfigs)
- **New**: Human-readable output with coloured diff tables (via `cli-table3` + `chalk`) and structured logging (via `consola`)

## Capabilities

### New Capabilities

- `config-loading`: Load and validate `kener-ctl.yaml` configuration with env var overrides
- `manifest-parsing`: Discover, parse, and Zod-validate YAML manifest files for all 6 resource kinds
- `api-client`: Typed Kener v4 REST client with auth, retry, and error enrichment
- `reconciliation`: Diff desired vs actual state, produce ordered changes, apply with concurrency, maintain state identity file
- `cli-commands`: All 6 CLI subcommands (apply, plan, validate, pull, get, delete) wired to the reconciler and API client

### Modified Capabilities

_None — this is the initial implementation._

## Impact

- **New dependency tree**: `citty`, `ky`, `zod`, `js-yaml`, `c12`, `consola`, `chalk`, `cli-table3`, `fast-deep-equal` (all specified in architecture doc)
- **New source tree**: `src/cli/`, `src/config/`, `src/manifest/`, `src/api/`, `src/reconciler/`, `src/output/`, `src/util/`
- **New test tree**: `tests/` mirroring `src/` structure
- **New files at repo root**: `kener-ctl.yaml` (example config), `state/` (example manifests), `.kener-ctl-state.json` (generated at runtime)

## Non-goals

- Plugin/hook system (`beforeApply` / `afterApply`)
- Multi-instance context switching (`--context` flag)
- CI-specific machine-readable JSON diff output (`--ci` flag)
- Resource kinds beyond the 6 defined by Kener v4 (Monitor, Page, AlertTrigger, AlertConfig, Incident, Maintenance)
- Manifest migration/upgrade tooling (no prior version exists)
