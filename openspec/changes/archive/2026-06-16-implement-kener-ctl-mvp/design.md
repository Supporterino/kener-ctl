## Context

`kener-ctl` is a greenfield CLI project. The full architecture is specified in `kener-ctl-architecture.md` at the repo root. There is no existing code — all components are being built from scratch. The target is Kener v4's REST API (`/api/v4/…`). Runtime is Bun ≥ 1.1 with strict TypeScript.

## Goals / Non-Goals

**Goals:**
- Provide a declarative, GitOps-friendly interface to Kener
- Support all 6 Kener v4 resource kinds: Monitor, Page, AlertTrigger, AlertConfig, Incident, Maintenance
- Detect and report drift between local manifests and remote state (plan)
- Apply changes with dependency-aware ordering and bounded concurrency (apply)
- Validate manifests locally without network calls (validate)
- Export remote state as local YAML for bootstrapping (pull)
- Inspect and delete individual resources ad-hoc (get, delete)
- Produce human-readable, coloured diff output in terminal and degrade gracefully in non-TTY contexts

**Non-Goals:**
- Plugin/hook system
- Multi-instance context switching (`--context` flag)
- CI-specific machine-readable output (`--ci` flag)
- Resource kinds beyond the 6 defined by Kener v4
- Real-time watching or continuous reconciliation
- Manifest migration tooling (no prior version exists)

## Decisions

### 1. CLI Framework: citty

**Choice:** `citty` (unjs/citty) over `commander` or `yargs`.

**Rationale:** citty is lightweight (sub-5KB), Bun-native (no Node polyfills), and provides composable `defineCommand`/`defineSubcommands` patterns that match the resource-per-file architecture. It auto-generates `--help` output from typed args. Commander and yargs are heavier and Node-centric.

### 2. HTTP Client: ky

**Choice:** `ky` over `Bun.fetch` directly.

**Rationale:** ky provides built-in retry (with status-code filtering), `prefixUrl` for base path management, and `hooks.beforeError` for attaching response bodies to errors. Wrapping `Bun.fetch` directly would require reimplementing these. ky is fetch-based and works natively in Bun.

### 3. Schema Validation: zod

**Choice:** `zod` over `joi` or `ajv`.

**Rationale:** zod provides static type inference via `z.infer<>`, eliminating the need to manually maintain TypeScript interfaces alongside validation schemas. It's composable (`z.discriminatedUnion` for the `kind` field) and works with no build step. joi lacks type inference; ajv requires JSON Schema and a compilation step.

### 4. Config Loading: c12

**Choice:** `c12` (unjs/c12) over `cosmiconfig`.

**Rationale:** c12 is designed for Bun/Node config loading with built-in support for multiple file formats (`.yaml`, `.json`, `.ts`), env var overrides, and layered config merging. It's maintained by the same unjs ecosystem as citty and consola. cosmiconfig is more established but heavier and less Bun-idiomatic.

### 5. Functional Factory Pattern

**Choice:** Factory functions (`createKenerClient()`, `createMonitorsApi()`) over classes.

**Rationale:** Factory functions accept explicit dependencies (injection via parameters) without decorators or reflection. This makes testing trivial — pass mock implementations directly. Classes would add ceremony without benefit given Bun's native module system and the absence of DI frameworks.

### 6. State Identity File (`.kener-ctl-state.json`)

**Choice:** Maintain a JSON file mapping stable manifest names to mutable remote integer IDs for resources that lack a string key (Incidents, Maintenances, AlertConfigs).

**Rationale:** Kener uses auto-increment integer IDs as primary keys. Monitors have a user-defined `tag` and Pages have a `path` — these are natural stable keys. But Incidents, Maintenances, and AlertConfigs have no stable string identifier in the API. The CLI generates one from `metadata.name` and persists the mapping. The file is written atomically (temp + rename) after each successful apply and is designed to be committed to version control.

**Alternative considered:** Using a composite key (e.g., `monitorTag + alertType + alertValue` for AlertConfigs). Rejected because the composite is fragile — changing any component would break the mapping. A single stable name is clearer.

### 7. Dependency-Aware Reconcile Order

**Choice:** Apply in order: AlertTriggers → Monitors → Pages → AlertConfigs → Incidents → Maintenances. Delete in reverse.

**Rationale:** Pages reference monitors by tag; AlertConfigs reference monitors and triggers; Incidents and Maintenances reference monitors. Creating a Page before its monitors exist would fail. Deleting a Monitor before its dependent resources are removed would leave orphans or fail with FK constraints. The order is hardcoded in the engine.

### 8. Server-Field Stripping Before Diff

**Choice:** Strip `id`, `createdAt`, `updatedAt` (and any other server-generated fields) before comparing desired vs actual state with `fast-deep-equal`.

**Rationale:** The API returns read-only metadata on every response. Without stripping, every comparison would show spurious differences — the server's `updatedAt` will never match the manifest's (nonexistent) value. The `normalize` function in `diff.ts` is resource-type-aware so additional fields can be added per-kind.

### 9. Bounded Concurrency for Apply

**Choice:** Use a simple concurrency limiter pattern (semaphore) rather than a library like `p-limit`. Default concurrency of 4, configurable via `kener-ctl.yaml`.

**Rationale:** Bun's event loop handles concurrent I/O well. A basic queue with a counter is ~20 lines and avoids an extra dependency. The concurrency limit prevents overwhelming the Kener API while allowing parallel independent resource operations.

### 10. Error Collection Strategy

**Choice:** Three-tier error handling:
1. **Manifest validation errors** — collect across all files, print together, exit 2
2. **Network/auth errors** — print immediately, abort command, exit 1
3. **Per-resource API errors** — collect during reconcile, continue processing other resources, exit 1 if any occurred

**Rationale:** Failing fast on a single bad manifest would hide other validation errors, forcing users to fix one-at-a-time. Conversely, a network error means nothing will succeed, so aborting immediately saves time. Per-resource API errors (e.g., a single monitor update fails) shouldn't prevent other resources from reconciling.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **State file divergence**: Two users apply from different branches, `.kener-ctl-state.json` conflicts | File is designed for VCS; standard merge conflict resolution applies. Document this in README. |
| **Concurrent apply races**: Two `kener-ctl apply` runs against the same Kener instance simultaneously | Not designed for this. Document as unsupported. A future `--lock` flag could add advisory locking. |
| **API drift**: Kener v4 API changes, breaking the typed client | API types are hand-authored to match the v4 spec. A future build step could generate from OpenAPI spec. Tests against a real Kener instance catch drift. |
| **Large state directories**: Thousands of manifest files could slow discovery | `Bun.Glob` is async and efficient. The bottleneck is API calls, not file I/O. Concurrency limiting prevents overload. |
| **Incident/Maintenance mapping fragility**: The state identity file maps names to IDs. If someone deletes a resource through the web UI, the mapping is stale | `pull` detects missing remote IDs. `apply` with `--delete-orphans` cleans up stale mappings. |

## Open Questions

- **Kener v4 OpenAPI spec availability**: The architecture doc references generating types from an OpenAPI spec at build time. Is the spec available at `https://kener.ing/docs/spec/v4`? If not, all API types will be hand-authored from the Kener source/documentation.
- **Incident states and transitions**: Kener's incident state machine needs clarification — can incidents move from RESOLVED back to INVESTIGATING? The manifest schema should match actual API behavior.
- **AlertConfig identity**: The architecture doc mentions "composite key or name" as two approaches. Need to verify which the Kener v4 API actually supports before implementing the reconciler.
