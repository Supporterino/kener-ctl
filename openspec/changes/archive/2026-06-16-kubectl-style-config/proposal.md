## Why

The current configuration system is project-scoped (`kener-ctl.yaml` discovered by `c12` relative to CWD) and single-instance, making it awkward to manage multiple Kener environments (prod, staging, dev). Users must juggle separate config files or environment variables per project. This migrates to a kubectl-style user-scoped config with named contexts, enabling seamless switching between instances.

## What Changes

- **BREAKING**: Configuration moves from `./kener-ctl.yaml` (CWD-relative, `c12`-based) to `~/.config/kener-ctl/config.yaml` (XDG config directory)
- **BREAKING**: `KENER_URL` and `KENER_API_KEY` env vars replaced by `KENER_CONTEXT` which selects the active context
- Introduce named **contexts** — each bundles an `instance` URL and `apiKey` under a user-chosen name (`prod`, `staging`, etc.)
- `current-context` field in config determines the default instance; overridable via `--context` CLI flag or `KENER_CONTEXT` env var
- Add `kener-ctl config use|current|list` subcommands to manage contexts from the CLI
- Global defaults (`stateDir`, `concurrency`, `dryRun`, `deleteOrphans`) live under a `defaults:` block in the config
- State file (`.kener-ctl-state.json`) moves to `~/.config/kener-ctl/state/<context-name>.json`, fixing the fragile `stateDir/../.kener-ctl-state.json` path computation
- All existing commands (`apply`, `plan`, `validate`, `pull`, `get`, `delete`) gain a `--context` flag
- `--config` CLI flag removed (config location is now fixed); `--state-dir` override persists

## Capabilities

### New Capabilities
- `context-config`: User-scoped configuration file at the XDG config path, containing named contexts (instance + apiKey pairs), current-context pointer, and global defaults.
- `config-cli-commands`: CLI subcommands (`config use`, `config current`, `config list`) for inspecting and switching contexts without editing the config file manually.

### Modified Capabilities
- `config-loading`: Config file location changes from CWD-relative `c12` discovery to fixed XDG path. Env var overrides change from `KENER_URL`/`KENER_API_KEY` to `KENER_CONTEXT`. Configuration schema gains hierarchical structure (contexts array, defaults block). Backward compatibility with the old flat schema is not retained — the tool was not publicly released.
- `cli-commands`: All commands (`apply`, `plan`, `validate`, `pull`, `get`, `delete`) gain a `--context` flag for context selection. The `--config` flag is removed.
- `reconciliation`: State file path is no longer derived from `stateDir` via `join(stateDir, "..", ".kener-ctl-state.json")`. Instead, it is resolved from `~/.config/kener-ctl/state/<context-name>.json`, keyed by the active context.

## Impact

- `src/config/loader.ts` — rewritten (XDG path resolution, YAML-only, no `c12` dependency)
- `src/config/schema.ts` — rewritten (hierarchical: contexts array, defaults block, current-context)
- `src/cli/index.ts` — register new `config` command
- `src/cli/config.ts` — new file (use/current/list subcommands)
- `src/cli/shared.ts` — add `contextArg`, remove `configArg`
- `src/cli/apply.ts` — context resolution, pass stateFilePath to engine
- `src/cli/plan.ts` — same
- `src/cli/get.ts` — same
- `src/cli/delete.ts` — same
- `src/cli/pull.ts` — same
- `src/cli/validate.ts` — no API calls, but may need context for stateDir defaults
- `src/reconciler/engine.ts` — accept `stateFilePath` param instead of deriving from `stateDir`
- `src/api/client.ts` — unchanged
- `src/manifest/` — unchanged
- `tests/` — new and updated tests for config layer, CLI commands, engine changes
- `kener-ctl.yaml` at repo root — removed (no longer used; becomes user config)

## Non-goals

- Credential plugins or external auth helpers (API keys remain bare in config file)
- Per-project config overrides (no `.kener-ctl.yaml` in CWD to pin a context)
- Migration tooling (tool was not publicly released)
- Multiple config file locations or config chaining
