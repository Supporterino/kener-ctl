# AGENTS.md — kener-ctl

> Guidelines for AI coding agents working on this project.

---

## 1. Tech Stack

| Concern          | Choice                                                          |
| ---------------- | --------------------------------------------------------------- |
| Runtime          | [Bun](https://bun.sh) ≥ 1.1                                     |
| Language         | TypeScript (strict)                                             |
| CLI framework    | [`citty`](https://github.com/unjs/citty)                        |
| HTTP client      | [`ky`](https://github.com/sindresorhus/ky)                      |
| Schema / validation | [`zod`](https://zod.dev)                                     |
| YAML parsing     | [`js-yaml`](https://github.com/nodeca/js-yaml)                  |
| Config loader    | [`c12`](https://github.com/unjs/c12)                            |
| Logging          | [`consola`](https://github.com/unjs/consola)                    |
| Terminal colour  | [`chalk`](https://github.com/chalk/chalk)                       |
| Table rendering  | [`cli-table3`](https://github.com/cli-table/cli-table3)         |
| Deep equality    | [`fast-deep-equal`](https://github.com/epoberezkin/fast-deep-equal) |
| File discovery   | `Bun.Glob` (built-in — no extra dep)                            |
| Testing          | `bun:test` (built-in)                                           |

**Runtime target:** Kener v4 REST API (`/api/v4/…`).

---

## 2. Project Structure

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
│   │   └── types.ts      # API response types
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
├── tests/                # Tests mirror src/ structure
├── state/                # Example directory for resource manifests
├── kener-ctl.yaml        # Default config file
├── package.json
└── tsconfig.json
```

---

## 3. OpenSpec Workflow

This project uses **OpenSpec** (`spec-driven` schema) for feature development.

### Lifecycle

1. **Explore** (`openspec-explore` skill) — think through ideas, investigate problems, clarify requirements before or during a change.
2. **Propose** (`openspec-propose` skill) — generate a complete change proposal with design, specs, and tasks.
3. **Apply** (`openspec-apply-change` skill) — implement tasks from the change proposal.
4. **Sync** (`openspec-sync-specs` skill) — sync delta specs back to main specs when needed.
5. **Archive** (`openspec-archive-change` skill) — finalize and archive a completed change.

### When to use each

- Before writing any code for a new feature or significant refactor, **propose a change**.
- For bug fixes that are self-contained, a change may not be necessary — use your judgement.
- After implementing all tasks in a change, **archive it**.
- If you need to think through an idea without committing to a proposal, use **explore mode**.

---

## 4. Committing Changes

Once changes are complete, use the **`git-commit`** skill to:

- Analyze staged and unstaged changes.
- Group them into logical atomic commits.
- Produce clean **conventional commit** messages with **Gitmoji**.

**Do not commit unless explicitly asked.** When ready to commit, load the skill and follow its workflow.

---

## 5. Code Conventions

### General

- **Strict TypeScript everywhere** — `noUncheckedIndexedAccess` is enabled. Never use `any`; prefer `unknown`.
- **Functional style** — prefer factory functions (e.g., `createKenerClient()`, `createMonitorsApi()`) over classes.
- **No default exports** — use named exports only.
- **File naming** — kebab-case for files (`alert-configs.ts`, `cli-table3`), camelCase for functions and variables.
- **Import paths** — use `@/` alias for `src/` (configured in `tsconfig.json` paths).

### Schemas & Validation

- All external data (API responses, YAML manifests, config files) **must** be validated with Zod.
- Derive TypeScript types from Zod schemas using `z.infer<>` — never duplicate type definitions.
- Manifest schemas live in `src/manifest/schema.ts`; API types live in `src/api/types.ts`.
- The `AnyManifestSchema` is a `z.discriminatedUnion("kind", [...])` of all resource kinds.

### API Client

- Use `ky.create()` factory in `src/api/client.ts` to produce a pre-configured client instance.
- Each resource gets its own module (`monitors.ts`, `pages.ts`, etc.) exporting typed CRUD functions.
- Always use the `hooks.beforeError` hook to attach response bodies to errors.

### Reconciler

- The reconcile engine (`src/reconciler/engine.ts`) is the single entry point for both `apply` and `plan`.
- Each resource kind has its own reconciler in `src/reconciler/resources/`.
- Diff logic (`diff.ts`) compares desired (manifests) vs. actual (API state) and produces `Change<T>` entries.
- Strip server-only fields (`id`, `createdAt`, `updatedAt`) before comparison to avoid spurious updates.
- `.kener-ctl-state.json` maps stable manifest names to remote integer IDs for resources that lack a string key.

### Reconcile Order (dependency-aware)

Apply in order; delete in reverse:

1. AlertTriggers (no dependencies)
2. Monitors
3. Pages (reference monitor tags)
4. AlertConfigs (reference monitors + triggers)
5. Incidents (reference monitors)
6. Maintenances (reference monitors)

### Reconcile Key Mapping

| Kind          | Local key          | Remote identifier                       |
| ------------- | ------------------ | --------------------------------------- |
| Monitor       | `metadata.tag`     | `tag` field                             |
| Page          | `metadata.path`    | `path` field (`~home` for root)         |
| AlertTrigger  | `metadata.name`    | `name` field                            |
| AlertConfig   | `metadata.name`    | Composite or `name` (via state file)    |
| Incident      | `metadata.name`    | `title` (via `.kener-ctl-state.json`)   |
| Maintenance   | `metadata.name`    | (via `.kener-ctl-state.json`)           |

### Output & UX

- Use `consola` for structured logging (levels: verbose, info, warn, error).
- Use `chalk` for terminal colour on diff output.
- Plan/apply output uses `cli-table3` for tabular display.
- Diff symbols: `+` green (CREATE), `~` yellow (UPDATE), `-` red (DELETE), `·` grey (NOOP).
- Non-TTY mode disables spinners and colour automatically.

### Error Handling

| Scenario                     | Exit Code | Behaviour                                |
| ---------------------------- | --------- | ---------------------------------------- |
| Manifest validation errors   | 2         | Collected across all files, printed together |
| API errors (individual)      | 1         | Per-resource; others still proceed       |
| Network / auth errors        | 1         | Printed immediately; command aborts      |
| Success (no changes)         | 0         | Clean exit                               |
| Plan with changes            | 0         | Changes printed, exit clean              |
| Plan with invalid manifests  | 2         | Validation errors printed                |

---

## 6. Testing Requirements

### Mandatory

- **Every change must include tests.** Use Bun's built-in test runner (`bun:test`).
- Run `bun test` before considering any task complete.

### Test Categories

| Type            | Scope                                                |
| --------------- | ---------------------------------------------------- |
| **Unit**        | Diff logic, schema validation, YAML parsing edge cases |
| **Integration** | Spin up Kener via Docker in CI; run `apply`, assert remote state, run `plan` for zero-change output |
| **Snapshot**    | `plan` output for known fixture manifests            |

### Mocking

- Mock the HTTP client using `ky`'s `hooks.beforeRequest` or a simple test-double factory.
- Inject mock clients through the context/options pattern — never hard-code real HTTP calls in unit tests.

### Test File Convention

- Test files mirror `src/` under `tests/` with `.test.ts` extension.
- Example: `src/reconciler/diff.ts` → `tests/reconciler/diff.test.ts`.

---

## 7. CLI Commands

All commands are registered in `src/cli/index.ts` via `citty`'s `defineCommand` and `runMain`.

| Command       | Purpose                                                  |
| ------------- | -------------------------------------------------------- |
| `apply`       | Reconcile remote to match local state                    |
| `plan`        | Show diff without applying (same as `apply --dry-run`)   |
| `validate`    | Parse and validate all manifest files (no API calls)     |
| `pull`        | Export remote state as YAML manifests into `stateDir`    |
| `get`         | Fetch and print one or all resources of a kind           |
| `delete`      | Immediately delete a single remote resource              |

### Adding a New Command

1. Create the command file in `src/cli/`.
2. Use `citty`'s `defineCommand` with typed `args`.
3. Register it in `src/cli/index.ts`.
4. Add tests in `tests/cli/`.

---

## 8. CI / Verification

Before pushing or considering work complete, run:

```bash
bun run typecheck   # tsc --noEmit
bun test            # bun test
bun run build       # bun build src/cli/index.ts --outdir dist --target bun
```

All three must pass with zero errors.

---

## 9. Configuration

Project configuration lives in `kener-ctl.yaml` (loaded via `c12`). Environment variables (`KENER_URL`, `KENER_API_KEY`) override file values.

Key fields:
- `instance` — Kener base URL (required)
- `apiKey` — API key (required)
- `stateDir` — root directory for manifest files (default: `./state`)
- `dryRun` — plan only, never mutate (default: `false`)
- `deleteOrphans` — prune remote resources absent from state (default: `false`)
- `concurrency` — parallel API calls during apply (default: `4`)

Config schema is validated with Zod at startup. Missing required fields produce a formatted error and non-zero exit.
