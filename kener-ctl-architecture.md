# `kener-ctl` — Architecture Document

> **Target audience:** AI coding agent implementing the tool from scratch.
> **Runtime:** Bun ≥ 1.1 · **Language:** TypeScript (strict)
> **Kener target:** v4 REST API (`/api/v4/…`)

-----

## 1. Purpose & Scope

`kener-ctl` is a CLI that treats a Kener instance as a desired-state system.
Users declare monitors, pages, alert configurations, alert triggers, and
incidents in YAML files under a local directory, then run `kener-ctl apply`
to reconcile the remote instance to match those files — creating, updating, or
(optionally) deleting resources that differ from the declared state.

Additional sub-commands cover plan/diff, validation, export/pull (scaffold
YAML from a live instance), and ad-hoc resource inspection.

-----

## 2. High-Level Component Map

```
kener-ctl/
├── src/
│   ├── cli/              # Command routing & argument parsing (citty)
│   │   ├── index.ts      # Entry point — registers all commands
│   │   ├── apply.ts
│   │   ├── plan.ts
│   │   ├── validate.ts
│   │   ├── pull.ts
│   │   ├── get.ts
│   │   └── delete.ts
│   ├── config/           # kener-ctl.yaml loader & context
│   │   ├── loader.ts
│   │   └── schema.ts
│   ├── manifest/         # YAML state file parsing & validation
│   │   ├── loader.ts
│   │   ├── schema.ts     # Zod schemas mirroring Kener v4 resource shapes
│   │   └── types.ts      # Exported TS types derived from Zod schemas
│   ├── api/              # Typed Kener REST client (ky)
│   │   ├── client.ts     # ky instance factory, auth, retry, base URL
│   │   ├── monitors.ts
│   │   ├── pages.ts
│   │   ├── incidents.ts
│   │   ├── maintenances.ts
│   │   ├── triggers.ts
│   │   ├── alert-configs.ts
│   │   └── types.ts      # API response types (generated or hand-written)
│   ├── reconciler/       # Core diff + apply logic
│   │   ├── engine.ts     # Orchestrates all resource reconcilers
│   │   ├── diff.ts       # Generic desired-vs-actual differ
│   │   └── resources/
│   │       ├── monitor.ts
│   │       ├── page.ts
│   │       ├── incident.ts
│   │       ├── maintenance.ts
│   │       ├── trigger.ts
│   │       └── alert-config.ts
│   ├── output/           # Human-readable output (consola + chalk)
│   │   ├── printer.ts
│   │   └── table.ts
│   └── util/
│       ├── yaml.ts       # js-yaml wrapper with error enrichment
│       ├── hash.ts       # Stable JSON digest for change detection
│       └── errors.ts
├── kener-ctl.yaml        # Default config file (example committed)
├── state/                # Example directory for resource manifests
│   ├── monitors/
│   ├── pages/
│   ├── alerts/
│   └── incidents/
├── package.json
└── tsconfig.json
```

-----

## 3. Library Choices

|Purpose            |Library                                                            |Rationale                                         |
|-------------------|-------------------------------------------------------------------|--------------------------------------------------|
|CLI framework      |[`citty`](https://github.com/unjs/citty)                           |Lightweight, Bun-native, composable sub-commands  |
|HTTP client        |[`ky`](https://github.com/sindresorhus/ky)                         |Fetch-based, works natively in Bun, retry built-in|
|Schema + validation|[`zod`](https://zod.dev)                                           |Runtime validation + static type inference        |
|YAML parsing       |[`js-yaml`](https://github.com/nodeca/js-yaml)                     |Stable, well-tested                               |
|Output / logging   |[`consola`](https://github.com/unjs/consola)                       |Structured, levels, fancy mode                    |
|Terminal colour    |[`chalk`](https://github.com/chalk/chalk)                          |ESM, zero-deps                                    |
|Table rendering    |[`cli-table3`](https://github.com/cli-table/cli-table3)            |Minimal, supports colour cells                    |
|Config file        |[`c12`](https://github.com/unjs/c12)                               |Reads `kener-ctl.yaml/.json/.ts`, env overrides   |
|Deep equality      |[`fast-deep-equal`](https://github.com/epoberezkin/fast-deep-equal)|Diff comparison                                   |
|Glob file discovery|`Bun.Glob` (built-in)                                              |No extra dep                                      |

-----

## 4. Configuration — `kener-ctl.yaml`

```yaml
# kener-ctl.yaml
instance: https://status.example.com   # required; also KENER_URL env
apiKey: "xxxxxx"                        # required; also KENER_API_KEY env
stateDir: ./state                       # root directory for manifest files
dryRun: false                           # if true, plan only — never mutate
deleteOrphans: false                    # prune remote resources absent from state
concurrency: 4                          # parallel API calls during apply
```

Schema is validated with Zod at startup. Environment variables (`KENER_URL`,
`KENER_API_KEY`) override file values. Missing required fields produce a
formatted error and non-zero exit.

-----

## 5. Manifest File Format

Each resource type uses its own YAML schema. Files can be placed anywhere
inside `stateDir` and discovered recursively. Multiple resources of the same
type can live in one file (using a YAML list) or in separate files.

### 5.1 Common fields (all resources)

```yaml
# Every resource file starts with a kind discriminator
kind: Monitor | Page | AlertConfig | AlertTrigger | Incident | Maintenance
```

### 5.2 Monitor

```yaml
kind: Monitor
metadata:
  tag: my-api              # Kener's stable identifier — used as reconcile key
spec:
  name: My API
  description: "Main API"
  type: API                # API | PING | TCP | DNS | SSL | SQL | HEARTBEAT
                           # | GAMEDIG | GRPC | GROUP
  categoryName: Production
  cronSchedule: "*/5 * * * *"
  defaultStatus: DOWN
  gracePeriod: 2           # consecutive checks before state change recorded
  dayDegradedMinCount: 3
  dayDownMinCount: 2
  # type-specific block — only one present at a time:
  typeData:
    url: https://api.example.com/health
    method: GET
    timeout: 10000
    allowSelfSignedCert: false
    headers:
      - key: Accept
        value: application/json
    body: ""
    eval: |
      (function(statusCode, responseTime, responseDataBase64) {
        return { status: statusCode === 200 ? 'UP' : 'DOWN', latency: responseTime };
      })
```

### 5.3 Page

```yaml
kind: Page
metadata:
  path: services          # URL path segment; "~home" for the default page
spec:
  title: Services Status
  header: Our Services
  pageContent: |
    ## Welcome
    Real-time status for all services.
  monitors:
    - my-api
    - db-primary
  display:
    desktopDays: 90
    mobileDays: 30
    layout: default-list  # default-list | default-grid | compact-list | compact-grid
  seo:
    metaTitle: "Services Status"
    metaDescription: "Real-time service availability"
```

### 5.4 Alert Trigger

```yaml
kind: AlertTrigger
metadata:
  name: ops-slack           # unique name used as reconcile key
spec:
  type: SLACK               # WEBHOOK | DISCORD | SLACK | EMAIL
  webhookUrl: https://hooks.slack.com/services/...
  # type-specific fields vary
```

### 5.5 Alert Configuration

```yaml
kind: AlertConfig
metadata:
  name: api-down-critical   # reconcile key
spec:
  monitorTag: my-api
  alertType: STATUS         # STATUS | LATENCY | UPTIME
  alertValue: DOWN
  failureThreshold: 1
  successThreshold: 2
  severity: CRITICAL        # CRITICAL | WARNING
  createIncident: true
  triggerNames:
    - ops-slack
```

### 5.6 Incident

```yaml
kind: Incident
metadata:
  name: db-degraded-2024-06 # reconcile key (name is stable ID for CLI)
spec:
  title: Database Degraded
  state: INVESTIGATING      # INVESTIGATING | IDENTIFIED | MONITORING | RESOLVED
  affectedMonitors:
    - tag: db-primary
      impact: DEGRADED      # DOWN | DEGRADED
  updates:
    - message: "Investigating high query latency on primary."
      state: INVESTIGATING
```

### 5.7 Maintenance

```yaml
kind: Maintenance
metadata:
  name: weekly-db-maintenance
spec:
  title: Weekly DB Maintenance
  monitors:
    - db-primary
  startDatetime: "2025-07-01T02:00:00Z"
  endDatetime: "2025-07-01T04:00:00Z"
  rrule: "FREQ=WEEKLY;BYDAY=TU"   # optional recurring
```

-----

## 6. API Client Layer (`src/api/`)

### `client.ts`

```typescript
import ky from "ky";

export function createKenerClient(baseUrl: string, apiKey: string) {
  return ky.create({
    prefixUrl: `${baseUrl}/api/v4`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    retry: { limit: 3, statusCodes: [429, 500, 502, 503] },
    timeout: 15_000,
    hooks: {
      beforeError: [enrichKyError],   // attach response body to error
    },
  });
}
```

Each resource module (`monitors.ts`, `pages.ts`, …) exports a class or plain
object with typed CRUD methods. For example:

```typescript
// src/api/monitors.ts
export function createMonitorsApi(client: KyInstance) {
  return {
    list: () => client.get("monitors").json<MonitorListResponse>(),
    get:  (id: number) => client.get(`monitors/${id}`).json<MonitorResponse>(),
    create: (body: CreateMonitorBody) =>
      client.post("monitors", { json: body }).json<MonitorResponse>(),
    update: (id: number, body: UpdateMonitorBody) =>
      client.patch(`monitors/${id}`, { json: body }).json<MonitorResponse>(),
    delete: (id: number) => client.delete(`monitors/${id}`),
  };
}
```

All API types in `src/api/types.ts` should be derived from the
[Kener v4 OpenAPI spec](https://kener.ing/docs/spec/v4) at build time if
possible, or hand-authored to match the spec exactly.

-----

## 7. Manifest Loader & Zod Schemas (`src/manifest/`)

`loader.ts` walks `stateDir` using `Bun.Glob`, reads each `*.yaml` / `*.yml`
file with `js-yaml`, and feeds every document through the matching Zod schema.
Errors are collected and reported together — one bad file must not abort
loading of others.

```typescript
// src/manifest/schema.ts (abbreviated)
import { z } from "zod";

export const MonitorSpecSchema = z.object({
  name: z.string(),
  type: z.enum(["API","PING","TCP","DNS","SSL","SQL","HEARTBEAT","GAMEDIG","GRPC","GROUP"]),
  categoryName: z.string().optional(),
  cronSchedule: z.string().default("* * * * *"),
  defaultStatus: z.enum(["UP","DOWN","DEGRADED"]).default("DOWN"),
  gracePeriod: z.number().int().min(1).optional(),
  typeData: z.record(z.unknown()),   // per-type discrimination handled separately
  // …
});

export const MonitorManifestSchema = z.object({
  kind: z.literal("Monitor"),
  metadata: z.object({ tag: z.string() }),
  spec: MonitorSpecSchema,
});

// Union schema for all kinds
export const AnyManifestSchema = z.discriminatedUnion("kind", [
  MonitorManifestSchema,
  PageManifestSchema,
  AlertTriggerManifestSchema,
  AlertConfigManifestSchema,
  IncidentManifestSchema,
  MaintenanceManifestSchema,
]);
```

-----

## 8. Reconciler (`src/reconciler/`)

### 8.1 Reconcile engine (`engine.ts`)

`reconcile(ctx: Context): Promise<ReconcileResult>` is the single entry point
shared by `apply` and `plan` commands. It:

1. Loads all manifests from disk (validated).
1. Fetches all current remote resources for each kind in parallel.
1. Calls each per-kind reconciler which returns a list of `ChangeSet` entries.
1. In **plan mode**, prints the change set and exits.
1. In **apply mode**, executes changes with bounded concurrency (`p-limit` or
   Bun’s built-in semaphore pattern), collects errors without short-circuiting.

### 8.2 Diff logic (`diff.ts`)

```typescript
type ChangeAction = "CREATE" | "UPDATE" | "DELETE" | "NOOP";

interface Change<T> {
  action: ChangeAction;
  key: string;          // stable identifier (tag, path, name)
  desired: T | null;
  actual: T | null;
  patch?: Partial<T>;   // only the differing fields
}

function diff<T extends object>(
  desired: Map<string, T>,
  actual: Map<string, T>,
  normalize: (v: T) => object,  // strip server-only fields before compare
): Change<T>[]
```

The `normalize` function strips read-only fields returned by the API (e.g.
`id`, `createdAt`, `updatedAt`) before deep-equal comparison, so that server-
generated fields do not trigger spurious updates.

Deletion (`deleteOrphans: true`) generates a `DELETE` change for every key
present in `actual` but absent in `desired`.

### 8.3 Per-kind reconcilers

Each file in `src/reconciler/resources/` exports a `reconcile` function:

```typescript
// src/reconciler/resources/monitor.ts
export async function reconcileMonitors(
  api: MonitorsApi,
  desired: MonitorManifest[],
  opts: ReconcileOptions,
): Promise<Change<MonitorManifest>[]>
```

Reconcile key mapping:

|Kind        |Local key      |Remote identifier used to look up                        |
|------------|---------------|---------------------------------------------------------|
|Monitor     |`metadata.tag` |`tag` field on remote                                    |
|Page        |`metadata.path`|`path` on remote (`~home` for root)                      |
|AlertTrigger|`metadata.name`|`name` on remote                                         |
|AlertConfig |`metadata.name`|composite `monitorTag + alertType + alertValue` or `name`|
|Incident    |`metadata.name`|`title` + CLI-managed mapping file                       |
|Maintenance |`metadata.name`|CLI-managed mapping file                                 |


> **Note:** Kener uses integer `id` for most resources. The CLI maintains a
> local `.kener-ctl-state.json` file (written alongside `stateDir`) that
> stores `name → id` mappings for resources that don’t have a stable string
> key in the API (incidents, maintenances, alert configs). This file should be
> committed to version control when state is shared across teams.

-----

## 9. CLI Commands

All commands are registered in `src/cli/index.ts` via `citty`’s `defineCommand`
and `runMain`.

### `kener-ctl apply [options]`

Reconcile remote instance to match local state. Prints a summary of changes
made. Exits `1` on any API error.

Options:

- `--dry-run` — show plan only, make no changes (overrides config)
- `--config <path>` — path to `kener-ctl.yaml`
- `--state-dir <path>` — override `stateDir` from config
- `--kind <kind>` — limit to one resource type
- `--tag / --name <id>` — limit to a single resource
- `--delete-orphans` — remove remote resources not in state

### `kener-ctl plan [options]`

Identical to `apply --dry-run`. Prints a coloured diff table. Exit `0` even if
changes exist; exit `2` if manifests are invalid.

### `kener-ctl validate [options]`

Parse and validate all manifest files in `stateDir`. No API calls. Prints all
Zod errors, exits `1` on failure.

### `kener-ctl pull [options]`

Export current remote state as YAML manifests into `stateDir`. Useful for
bootstrapping or auditing. Skips files that already exist unless `--overwrite`
is passed.

Options:

- `--kind <kind>` — pull only this resource type
- `--overwrite` — replace existing files

### `kener-ctl get <kind> [id]`

Fetch and print one or all resources of a kind. Supports `--output table | json | yaml`.

```
kener-ctl get monitors
kener-ctl get monitor my-api-tag
kener-ctl get incidents --output json
```

### `kener-ctl delete <kind> <id>`

Immediately delete a single remote resource by key. Prompts for confirmation
unless `--yes` is passed.

-----

## 10. Output & UX

Terminal output uses `consola` for structured logging (levels: verbose, info,
warn, error) and `chalk` for coloured diff lines:

- `+` green — CREATE
- `~` yellow — UPDATE (show changed fields)
- `-` red — DELETE
- `·` grey — NOOP

Plan output renders a table via `cli-table3`:

```
┌──────────────┬────────────┬────────────┬──────────────────────────┐
│ Kind         │ Key        │ Action     │ Changes                  │
├──────────────┼────────────┼────────────┼──────────────────────────┤
│ Monitor      │ my-api     │ UPDATE     │ cronSchedule, timeout    │
│ Monitor      │ db-primary │ NOOP       │ —                        │
│ Page         │ ~home      │ CREATE     │ (new)                    │
│ AlertConfig  │ api-crit   │ DELETE     │ (orphan)                 │
└──────────────┴────────────┴────────────┴──────────────────────────┘
```

Non-interactive mode (no TTY) disables spinners and colour automatically via
`consola` and `chalk`’s auto-detection.

-----

## 11. Error Handling Strategy

- **Manifest validation errors** — collected across all files, printed together,
  command exits `2` (user error).
- **API errors** — per-resource errors are collected during reconcile; all other
  resources still proceed. Final exit is `1` if any error occurred.
- **Network / auth errors** — printed immediately; command aborts.
- All errors include the resource kind + key so the user can pinpoint the issue.

-----

## 12. State Identity File (`.kener-ctl-state.json`)

```jsonc
{
  "version": 1,
  "incidents": {
    "db-degraded-2024-06": 42   // name → remote integer id
  },
  "maintenances": {
    "weekly-db-maintenance": 7
  },
  "alertConfigs": {
    "api-down-critical": 3
  }
}
```

Written atomically (write to temp file → rename) after every successful apply.
When a resource is deleted, its entry is removed. This file is the CLI’s
source of truth for mapping stable manifest names to mutable remote IDs.

-----

## 13. Project Setup & Entry Point

```jsonc
// package.json
{
  "name": "kener-ctl",
  "version": "0.1.0",
  "type": "module",
  "bin": { "kener-ctl": "./dist/cli/index.js" },
  "scripts": {
    "dev":   "bun run src/cli/index.ts",
    "build": "bun build src/cli/index.ts --outdir dist --target bun",
    "test":  "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "c12": "^1.11",
    "chalk": "^5.3",
    "citty": "^0.1",
    "cli-table3": "^0.6",
    "consola": "^3.2",
    "fast-deep-equal": "^3.1",
    "js-yaml": "^4.1",
    "ky": "^1.7",
    "zod": "^3.23"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0",
    "@types/cli-table3": "^0.6",
    "bun-types": "latest",
    "typescript": "^5.4"
  }
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "types": ["bun-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "tests"]
}
```

-----

## 14. Testing Strategy

Use Bun’s built-in test runner (`bun:test`).

- **Unit tests** — diff logic, schema validation, YAML parsing edge cases.
- **Integration tests** — spin up a real Kener instance via Docker in CI;
  run `apply`, assert remote state, run `plan`, assert zero-change output.
- **Snapshot tests** — `plan` output for known fixture manifests.

Mock the HTTP client for unit tests using `ky`’s `hooks.beforeRequest` or a
simple test-double factory injected through the context.

-----

## 15. Reconcile Order (Dependency Awareness)

Resources must be applied in dependency order to avoid foreign-key failures:

1. **AlertTriggers** (no dependencies)
1. **Monitors** (no dependencies on other managed resources)
1. **Pages** (reference monitor tags — monitors must exist first)
1. **AlertConfigs** (reference monitors and triggers)
1. **Incidents** (reference monitors)
1. **Maintenances** (reference monitors)

Deletions are processed in reverse order.

-----

## 16. Extension Points

- **Plugin hooks (future):** the reconcile engine can expose `beforeApply` /
  `afterApply` hooks per resource kind for custom scripting.
- **Multiple instances:** `--context` flag (like `kubectl`) can switch between
  named instances defined in `kener-ctl.yaml` under a `contexts:` key.
- **CI mode:** `--ci` flag sets `--dry-run`, emits machine-readable JSON diff
  to stdout, and exits `2` if any changes would be made (useful as a drift-
  detection step in pipelines).