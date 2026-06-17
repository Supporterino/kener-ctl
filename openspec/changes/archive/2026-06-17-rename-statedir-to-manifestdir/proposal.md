## Why

The config key `defaults.stateDir` is misleading. "State" implies machine-maintained operational state — but `stateDir` is where users write their **desired-state declarations** (YAML manifests). The *actual* machine state (name→ID mappings) lives at `~/.config/kener-ctl/state/<context>.json`. This naming collision has already caused confusion among users and contributors. Renaming to `manifestDir` makes the purpose unambiguous and aligns with the well-established Kubernetes/manifest directory convention.

## What Changes

- **BREAKING**: Rename config key `defaults.stateDir` → `defaults.manifestDir`
- **BREAKING**: Rename CLI flag `--state-dir` → `--manifest-dir`
- **BREAKING**: Rename `ResolvedConfig.stateDir` → `ResolvedConfig.manifestDir`
- **BREAKING**: Rename `ReconcileContext.stateDir` → `ReconcileContext.manifestDir`
- Change default value from `"./state"` → `"./manifests"` (both in schema default and validate fallback)
- Rename example directory `state/` → `manifests/`
- Update all internal parameter/variable names from `stateDir`/`state-dir` to `manifestDir`/`manifest-dir`
- Update README, AGENTS.md, and OpenSpec specs to use new terminology
- Provide migration guidance in README for existing users

## Capabilities

### New Capabilities

None — this is a pure rename with no new functionality.

### Modified Capabilities

- `context-config`: Rename `stateDir` field in the defaults block schema and `ResolvedConfig` interface
- `manifest-parsing`: Update all `stateDir` parameter names and scenario references
- `reconciliation`: Update `ReconcileContext.stateDir` field and all reconciler parameter flows
- `cli-commands`: Rename `--state-dir` flag to `--manifest-dir`, update all command scenarios
- `project-readme`: Replace all `stateDir` references with `manifestDir`

## Impact

- **Config file**: `~/.config/kener-ctl/config.yaml` — `defaults.stateDir` key renamed (users must update)
- **CLI interface**: `--state-dir` flag renamed (scripts/CI must update)
- **Source files**: ~15 files across `src/` (config schema, loader, CLI commands, reconciler engine, manifest loader, output printer, shared args)
- **Test files**: ~5 files (config loader tests, schema tests, manifest loader tests, reconciler engine tests)
- **Spec files**: 5 delta specs required (context-config, manifest-parsing, reconciliation, cli-commands, project-readme)
- **Example directory**: `state/` → `manifests/`
- **Documentation**: README, AGENTS.md
- **No API/dependency changes**: Pure internal rename
