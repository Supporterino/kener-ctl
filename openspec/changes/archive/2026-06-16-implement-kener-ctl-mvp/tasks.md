## 1. Project Scaffold & Utility Layer

- [x] 1.1 Initialize project: `package.json` with all dependencies and scripts (`dev`, `build`, `test`, `typecheck`), `tsconfig.json` with strict settings and `@/*` path alias
- [x] 1.2 Implement `src/util/yaml.ts` — `js-yaml` wrapper with `loadYaml`/`loadAllYaml` functions and enriched error messages (file path, line number)
- [x] 1.3 Implement `src/util/hash.ts` — stable JSON digest function using `Bun.CryptoHasher` or deterministic `JSON.stringify` + SHA-256 for change detection
- [x] 1.4 Implement `src/util/errors.ts` — custom error classes: `KenerCtlError` (base), `ValidationError`, `ApiError`, `ConfigError`, `NetworkError` with consistent formatting
- [x] 1.5 Write unit tests for yaml.ts (valid YAML, invalid YAML, empty file, multi-doc) and hash.ts (determinism, nested objects)

## 2. Configuration Loading

- [x] 2.1 Implement `src/config/schema.ts` — Zod schema for `kener-ctl.yaml` with all fields (`instance`, `apiKey`, `stateDir`, `dryRun`, `deleteOrphans`, `concurrency`), defaults, and refinements
- [x] 2.2 Implement `src/config/loader.ts` — use `c12` to load `kener-ctl.yaml`, merge with env vars (`KENER_URL`, `KENER_API_KEY`), validate with Zod, produce typed `Config` context
- [x] 2.3 Create example `kener-ctl.yaml` at repo root with all documented fields and comments
- [x] 2.4 Write unit tests for config schema validation (missing required, invalid types, defaults) and loader (env override, file not found, parent directory discovery)

## 3. Manifest Schemas

- [x] 3.1 Implement `src/manifest/schema.ts` — Zod schemas for all 6 resource kinds with `kind` discriminator, common metadata, and kind-specific `spec` shapes. Include per-monitor-type `typeData` discrimination (API, PING, TCP, DNS, SSL, SQL, HEARTBEAT, GAMEDIG, GRPC, GROUP)
- [x] 3.2 Implement `src/manifest/types.ts` — export TypeScript types derived from all Zod schemas via `z.infer<>`. Export `AnyManifest` union type
- [x] 3.3 Write unit tests for each resource kind schema (valid manifests, invalid manifests, missing required fields, wrong kind discriminator, typeData mismatch for monitors)

## 4. Manifest Loader

- [x] 4.1 Implement `src/manifest/loader.ts` — `loadManifests(stateDir)` function that uses `Bun.Glob` to discover `*.yaml`/`*.yml` files, parses with `js-yaml`, validates against `AnyManifestSchema`, and collects errors across all files
- [x] 4.2 Create example manifest files in `state/` directory: `state/monitors/api.yaml`, `state/pages/home.yaml`, `state/alerts/triggers.yaml`, `state/incidents/example.yaml`
- [x] 4.3 Write unit tests for manifest loader (single file, multi-doc file, nested directories, mixed valid/invalid, empty directory, YAML list at root)

## 5. API Types & Client

- [x] 5.1 Implement `src/api/types.ts` — Zod schemas and inferred types for all Kener v4 API response shapes (Monitor, Page, AlertTrigger, AlertConfig, Incident, Maintenance) including create/update body types
- [x] 5.2 Implement `src/api/client.ts` — `createKenerClient(baseUrl, apiKey)` factory using `ky.create()` with bearer auth, `/api/v4` prefix, retry (429, 500, 502, 503), 15s timeout, and `hooks.beforeError` for body enrichment
- [x] 5.3 Write unit tests for API client (auth header, prefix URL, retry behavior, timeout, error body attachment) using ky's `hooks.beforeRequest` for mocking

## 6. API Resource Modules

- [x] 6.1 Implement `src/api/monitors.ts` — typed `list`, `get`, `create`, `update`, `delete` functions with Zod response validation
- [x] 6.2 Implement `src/api/pages.ts` — typed CRUD functions for Pages
- [x] 6.3 Implement `src/api/triggers.ts` — typed CRUD functions for AlertTriggers
- [x] 6.4 Implement `src/api/alert-configs.ts` — typed CRUD functions for AlertConfigs
- [x] 6.5 Implement `src/api/incidents.ts` — typed CRUD functions for Incidents
- [x] 6.6 Implement `src/api/maintenances.ts` — typed CRUD functions for Maintenances
- [x] 6.7 Write unit tests for each API module (successful CRUD, 404 not found, 400 validation error, 401 auth error) using mock ky instances

## 7. Output Layer

- [x] 7.1 Implement `src/output/printer.ts` — `printPlanTable(changes)`, `printApplySummary(results)`, `printValidationErrors(errors)`, `printResourceDetails(resource)` functions using `consola` and `chalk`. Support `--output json|yaml|table` for get command
- [x] 7.2 Implement `src/output/table.ts` — `renderTable(headers, rows)` wrapper around `cli-table3` with colour support, used by plan/apply output
- [x] 7.3 Write unit tests for table rendering (coloured vs plain, TTY detection, empty result set) and printer output format selection

## 8. Reconciler Diff Engine

- [x] 8.1 Implement `src/reconciler/diff.ts` — generic `diff<T>(desired, actual, normalize)` function producing `Change<T>[]` with CREATE/UPDATE/DELETE/NOOP actions
- [x] 8.2 Implement server-field stripping: per-kind `normalize` functions that remove `id`, `createdAt`, `updatedAt` (and other server-only fields) before comparison
- [x] 8.3 Write unit tests for diff logic (full match, partial diff, create, delete, orphan detection, server-field-only difference yields NOOP, empty desired+actual)

## 9. Reconciler Resource Implementations

- [x] 9.1 Implement `src/reconciler/resources/monitor.ts` — reconcile by `metadata.tag`, match to remote by `tag` field
- [x] 9.2 Implement `src/reconciler/resources/trigger.ts` — reconcile by `metadata.name`, match to remote by `name` field
- [x] 9.3 Implement `src/reconciler/resources/page.ts` — reconcile by `metadata.path`, match to remote by `path` field (`~home` for root)
- [x] 9.4 Implement `src/reconciler/resources/alert-config.ts` — reconcile by `metadata.name`, use `.kener-ctl-state.json` for ID lookup
- [x] 9.5 Implement `src/reconciler/resources/incident.ts` — reconcile by `metadata.name`, use `.kener-ctl-state.json` for ID lookup
- [x] 9.6 Implement `src/reconciler/resources/maintenance.ts` — reconcile by `metadata.name`, use `.kener-ctl-state.json` for ID lookup
- [x] 9.7 Write unit tests for each resource reconciler (create new, update existing, noop match, delete orphan)

## 10. Reconciler Engine

- [x] 10.1 Implement `src/reconciler/engine.ts` — `reconcile(ctx)` entry point that loads manifests, fetches all remote resources, calls per-kind reconcilers, orders changes by dependency (AlertTriggers → Monitors → Pages → AlertConfigs → Incidents → Maintenances; reverse for deletes), and applies with bounded concurrency (default 4)
- [x] 10.2 Implement state identity file management: `loadStateFile()`, `saveStateFile()`, `updateStateEntry()`, `removeStateEntry()` with atomic write (temp + rename)
- [x] 10.3 Implement concurrency limiter pattern (simple semaphore) for parallel API calls within each dependency tier
- [x] 10.4 Implement error collection: per-resource API errors collected without aborting; auth/network errors cause immediate abort
- [x] 10.5 Write integration tests for the engine (mock all API modules, test ordered apply, test reverse-order delete, test concurrency limiting, test state file updates, test error collection)

## 11. CLI Entry Point & Apply/Plan Commands

- [x] 11.1 Implement `src/cli/index.ts` — entry point using `citty`'s `defineCommand` and `runMain`, registering all subcommands. Include global `--config`, `--verbose` flags
- [x] 11.2 Implement `src/cli/apply.ts` — `apply` command: load config, load manifests, run reconcile engine, print summary. Support `--dry-run`, `--kind`, `--tag`/`--name`, `--delete-orphans`, `--state-dir` flags
- [x] 11.3 Implement `src/cli/plan.ts` — `plan` command: identical to `apply --dry-run` but prints coloured diff table with `+`/`~`/`-`/`·` indicators
- [x] 11.4 Write integration tests for apply and plan commands (mock API, verify correct API calls made in order, verify plan output format, verify --dry-run makes no mutations, verify exit codes)

## 12. Remaining CLI Commands

- [x] 12.1 Implement `src/cli/validate.ts` — `validate` command: load manifests only, print validation errors or success message, exit 0 or 2
- [x] 12.2 Implement `src/cli/pull.ts` — `pull` command: fetch all/specific resources from remote, write as YAML to `stateDir`. Support `--kind`, `--overwrite` flags. Create parent directories as needed
- [x] 12.3 Implement `src/cli/get.ts` — `get` command: fetch one or all of a resource kind, display with `--output table|json|yaml`. Support positional args `<kind> [id]`
- [x] 12.4 Implement `src/cli/delete.ts` — `delete` command: delete a single remote resource, prompt for confirmation unless `--yes`. Support positional args `<kind> <id>`
- [x] 12.5 Write integration tests for validate (valid/invalid manifests, exit codes), pull (creates files, skips existing, --overwrite), get (table/json/yaml output), and delete (confirmation, --yes, nonexistent resource)

## 13. Final Integration & Polish

- [x] 13.1 Verify `bun run typecheck` passes with zero errors
- [x] 13.2 Verify `bun test` passes with all tests green
- [x] 13.3 Verify `bun run build` produces a working binary at `dist/cli/index.js`
- [x] 13.4 Manual smoke test: run `kener-ctl --help`, `kener-ctl apply --help`, `kener-ctl plan --dry-run` against example manifests, `kener-ctl validate` against valid and invalid manifests
- [x] 13.5 Update AGENTS.md if any conventions or patterns emerged during implementation that differ from the initial plan
