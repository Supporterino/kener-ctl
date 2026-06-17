## Context

`kener-ctl` uses the term `stateDir` (config key: `defaults.stateDir`, CLI flag: `--state-dir`, default: `"./state"`) to refer to the directory where user-written YAML manifest files live. This conflicts with the concept of the "state file" at `~/.config/kener-ctl/state/<context>.json`, which *is* machine-maintained operational state. The naming collision creates confusion, as the same word "state" means two different things.

The established convention in the GitOps/declarative-config space (Kubernetes, ArgoCD, Pulumi) is to call user-written desired-state files "manifests" and store them in a directory named `manifests/` or similar.

## Goals / Non-Goals

**Goals:**
- Rename `stateDir` → `manifestDir` consistently across all layers (config, CLI, reconciler, loader, types)
- Rename CLI flag `--state-dir` → `--manifest-dir`
- Change default directory from `./state` to `./manifests`
- Rename example directory `state/` → `manifests/`
- Update all docs and specs to use the new terminology
- All existing tests pass with new names
- Zero behavioral changes

**Non-Goals:**
- No migration tool/command (users manually update their `config.yaml`)
- No backwards compatibility shim for old config key names
- No changes to the state file path (`~/.config/kener-ctl/state/<context>.json` stays as-is — it *is* state)
- No functionality changes

## Decisions

### Decision 1: Rename is global, no backwards compat

The rename touches the config file format (`defaults.stateDir` → `defaults.manifestDir`), the CLI interface (`--state-dir` → `--manifest-dir`), and internal APIs (`ResolvedConfig`, `ReconcileContext`, `loadManifests` param).

**Rationale**: The project has no stable release yet (0.x), so a clean break is acceptable. A backwards-compat shim would add complexity and leave the old name in the codebase indefinitely.

**Alternative considered**: Accept `stateDir` as deprecated alias for `manifestDir` in the config schema with a warning. Rejected because it keeps the confusing name alive and adds transform logic to the loader.

### Decision 2: Default directory changes from `./state` to `./manifests`

**Rationale**: `./manifests` is the established convention in the Kubernetes ecosystem and immediately communicates the directory's purpose. `./state` suggests machine state, not user-written declarations.

### Decision 3: Example directory renamed from `state/` to `manifests/`

**Rationale**: Consistency. The examples should demonstrate the real-world convention users will adopt.

### Decision 4: State file path unchanged

The state file lives at `~/.config/kener-ctl/state/<context>.json`. This path is *not* renamed because:
- It genuinely contains machine-maintained state (name→ID mappings)
- It's tied to the XDG config directory, not the user's working directory
- Renaming it would orphan existing state data for all users

### Decision 5: Implementation approach — direct rename, no test-only intermediate

All references change in a single pass: Zod schema default, TypeScript types, function parameters, variable names, CLI arg definitions, test fixtures. No transitional period.

## Risks / Trade-offs

- **[Risk] Existing users with `stateDir` in their config will get a Zod validation error on upgrade** → Mitigation: note in README migration section, error message from Zod is clear ("Unrecognized key(s) in object" at `defaults.stateDir`)
- **[Risk] Existing `./state/` directories with manifests silently ignored** → Mitigation: if users had `stateDir` explicitly set, they'll get a config error and be forced to update. If they relied on the `./state` default, they'll need to move `./state/` → `./manifests/` or set `manifestDir: ./state` in config. Both are explicit actions.
- **[Risk] GitHub Actions / CI scripts referencing `--state-dir`** → Mitigation: documented in migration notes. Low impact since project is 0.x.

## Migration Plan

1. Cut a release with this breaking change
2. README includes a migration section:
   - Rename `defaults.stateDir` → `defaults.manifestDir` in `~/.config/kener-ctl/config.yaml`
   - Rename `--state-dir` → `--manifest-dir` in scripts/CI
   - Optionally rename `./state/` → `./manifests/` if relying on default
   - Or set `manifestDir: ./state` to keep current directory layout

## Open Questions

None — this is a straightforward rename with no ambiguity.
