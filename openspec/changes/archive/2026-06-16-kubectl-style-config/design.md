## Context

kener-ctl currently uses `c12` to discover a `kener-ctl.yaml` file from the CWD upward. The config is flat — one instance, one apiKey, one set of defaults. The state file (`.kener-ctl-state.json`) maps local manifest names to remote numeric IDs and lives one directory *above* the state dir (`join(stateDir, "..", ".kener-ctl-state.json")`), which is fragile when `stateDir` is `"."`.

We're migrating to a kubectl model: user-scoped config at the XDG config path, named contexts that bundle instance+apiKey, and a `config` subcommand for management.

## Goals / Non-Goals

**Goals:**
- User-scoped config file at `~/.config/kener-ctl/config.yaml` (XDG standard)
- Named contexts: each has `name`, `instance`, `apiKey`
- `current-context` field for default instance; overridable by `--context` flag and `KENER_CONTEXT` env var
- `kener-ctl config use|current|list` subcommands for context management
- Global defaults (`stateDir`, `concurrency`, `dryRun`, `deleteOrphans`) under a `defaults:` block
- State file lives at `~/.config/kener-ctl/state/<context>.json`, fixing the broken `stateDir/../` derivation
- All existing commands gain `--context` flag; `--config` flag removed

**Non-Goals:**
- Credential plugins or external auth helpers
- Per-project config overrides (no `.kener-ctl.yaml` in CWD)
- Migration tooling for the old config format
- Multiple config files or config chaining/merging

## Decisions

### 1. Config file location: XDG `$XDG_CONFIG_HOME/kener-ctl/config.yaml`

**Alternatives considered:**
- `$HOME/.kener-ctl.yaml` — simpler but violates XDG convention
- Keep `c12` but point it at XDG path — `c12` is designed for project configs, not user configs. Adds complexity for no benefit.
- `$HOME/.config/kener-ctl/config.json` — valid, but YAML is more human-editable and consistent with existing format

**Decision:** XDG config dir with YAML. Use `import.meta.env` or platform detection to resolve `$XDG_CONFIG_HOME` (defaulting to `~/.config` on macOS/Linux). Bun's runtime API (`Bun.env`?) gives us `$HOME` easily.

### 2. Config schema structure

```yaml
# ~/.config/kener-ctl/config.yaml
version: 1
current-context: prod
contexts:
  - name: prod
    instance: https://status.prod.example.com
    apiKey: sk-prod-xxx
  - name: staging
    instance: https://status.staging.example.com
    apiKey: sk-staging-yyy
defaults:
  stateDir: ./state
  concurrency: 4
  dryRun: false
  deleteOrphans: false
```

**Alternatives considered:**
- kubectl-style cluster/user/context triad — overkill. Kener doesn't have separate auth providers and clusters; an `instance` + `apiKey` bundle is sufficient.
- Flat `contexts` as a map `{ prod: { instance, apiKey } }` — loses ordering for `config list` display and makes Zod validation slightly harder (record types require explicit key handling).
- `current-context` as top-level string vs nested — top-level is more ergonomic and mirrors kubectl.

**Decision:** Array of context objects with a top-level `current-context` string. Zod validates no duplicate names.

### 3. Context resolution priority

```
1. --context <name>       (CLI flag, explicit)
2. KENER_CONTEXT          (env var)
3. current-context        (config file)
4. Error: "No context configured. Set one with 'kener-ctl config use <name>'."
```

**Rationale:** CLI flag is most explicit, then env var (useful for CI), then config default. This mirrors kubectl's `--context` > `$KUBECTX` > current-context precedence.

### 4. State file location: `~/.config/kener-ctl/state/<context>.json`

**Alternatives considered:**
- Next to manifests, scoped by context name (e.g., `.kener-ctl-state.prod.json`) — clutters project, harder to discover, not instance-private by default
- Inside stateDir — mixes manifests (version-controlled source) with machine state (local cache)
- Config dir — clean separation, instance-private, natural home for cache data

**Decision:** Config dir, keyed by context name. The state file is local metadata about a specific instance — it belongs with the instance configuration. Users who want to share it can symlink or copy it; by default it stays local.

### 5. Zod schema design

```typescript
const ContextSchema = z.object({
  name: z.string().min(1),
  instance: z.string().url(),
  apiKey: z.string().min(1),
});

const DefaultsSchema = z.object({
  stateDir: z.string().default("./state"),
  concurrency: z.number().int().min(1).max(20).default(4),
  dryRun: z.boolean().default(false),
  deleteOrphans: z.boolean().default(false),
});

const ConfigSchema = z.object({
  version: z.literal(1),
  "current-context": z.string(),
  contexts: z.array(ContextSchema).min(1),
  defaults: DefaultsSchema.default({}),
});

// Post-parse validation: current-context must exist in contexts array
// Also: no duplicate context names
```

**Decision:** Zod `superRefine` or post-parse checks for cross-field validation (current-context exists, no duplicate names). This keeps the schema declarative for per-field validation and adds semantic checks after parsing.

### 6. Config loader design

The new loader is a simple function (no `c12`):

```typescript
// src/config/loader.ts
function configDir(): string
function configFilePath(): string        // ~/.config/kener-ctl/config.yaml
function stateFilePath(contextName: string): string  // ~/.config/kener-ctl/state/<name>.json

async function loadConfig(opts?: { context?: string }): Promise<ResolvedConfig>
```

`ResolvedConfig` is the flattened context + defaults, matching what existing commands expect (so the reconciler API doesn't change shape):

```typescript
interface ResolvedConfig {
  instance: string;
  apiKey: string;
  stateDir: string;
  dryRun: boolean;
  deleteOrphans: boolean;
  concurrency: number;
  contextName: string;
}
```

This is a deliberate choice: existing command and reconciler code consumes `instance`, `apiKey`, etc. as flat fields. Rather than threading a nested config through every function, we flatten at the config layer.

### 7. Context argument on CLI commands

All commands gain a shared `--context` arg:

```typescript
const contextArg = {
  type: "string" as const,
  description: "Kener context to use (overrides current-context and KENER_CONTEXT)",
  valueHint: "name",
};
```

The `configArg` (for custom config path) is removed. Config lives at a fixed location.

### 8. New `config` subcommand structure

```
kener-ctl config use <name>     — set current-context, save config
kener-ctl config current        — print current context name
kener-ctl config list           — table: NAME, INSTANCE, CURRENT (*)
```

Implemented as a `citty` `defineCommand` with `subCommands: { use, current, list }`. The `use` subcommand reads the config file, updates `current-context`, and writes it back (preserving comments is not a goal — `js-yaml` dump may strip them. Acceptable tradeoff; kubectl has the same issue).

### 9. Dependency changes

- **Remove**: `c12` — no longer used for config discovery
- **Keep**: `js-yaml` — now used for config file parsing too
- **Keep**: `zod`, `citty`, `ky`, `consola`, `chalk`, `cli-table3`, `fast-deep-equal`, `Bun.Glob` — unchanged

### 10. Config file bootstrap

On first run when `~/.config/kener-ctl/config.yaml` doesn't exist:
- Commands that need a context (`apply`, `plan`, `get`, `delete`, `pull`) exit with a clear error message: "No config file found at ~/.config/kener-ctl/config.yaml. Create one with at least one context, or run 'kener-ctl config' for guidance."
- `kener-ctl config` commands that read the file (`current`, `list`, `use`) fail with a similar message.
- `kener-ctl validate` only needs `stateDir` from defaults; if no config exists, it uses hardcoded defaults (`./state`). This is a graceful degradation for the one command that doesn't require an instance.

**Decision:** No interactive init wizard. Keep it simple — users create the file or we could add `kener-ctl config init` later if needed. For now, error with instructions.

## Risks / Trade-offs

**[Risk] Users lose YAML comments on config write** — `js-yaml` dump doesn't preserve comments. When `config use` updates `current-context`, comments in the file are lost.
→ **Mitigation**: Document this behavior. The config file is small enough that comment loss is acceptable. kubectl's config commands have the same limitation.

**[Risk] One config file, no project overrides** — Users can't pin a project directory to a specific context (e.g., "this project is always staging").
→ **Mitigation**: This is explicitly a non-goal. Users are expected to pass `--context` or set `KENER_CONTEXT`. If demand arises, a future change could add project-level overrides.

**[Risk] API keys in plaintext** — `apiKey` is stored in clear text in `~/.config/kener-ctl/config.yaml`.
→ **Mitigation**: This is a stated non-goal for this change. The config file permissions should be `600` (user read/write only), and we should document this. Future work could add keychain integration or env-var references.

**[Risk] State file drift between team members** — Each user's state file is local to their config dir. If two team members apply the same manifests to the same instance, their state files may diverge.
→ **Mitigation**: The state file is only used for AlertConfigs, Incidents, and Maintenances (resources without a stable remote key). The reconciler can re-discover these by composite matching when the state file has no entry. Divergence causes at most a momentary "not found" that auto-heals on next apply. This is the same behavior as the current system.

## Open Questions

- **Should `config use` validate that the target context's instance is reachable?** No — that would couple a simple write operation to a network call. Keep it fast and local. Users discover connectivity issues at apply time.
- **Should we support `--context` in `validate`?** The validate command doesn't make API calls, so context is only needed if someone overrides `stateDir` via `defaults` and the defaults are context-dependent. Since defaults are global (not per-context), validate doesn't need `--context`. However, for consistency, we could include it. Leaning toward: include it for UX consistency, even if it's a no-op for validation.
