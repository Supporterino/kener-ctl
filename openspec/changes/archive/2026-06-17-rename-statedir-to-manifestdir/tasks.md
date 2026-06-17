## 1. Config schema and loader

- [x] 1.1 Rename `stateDir` → `manifestDir` in `DefaultsSchema` (zod default `"./state"` → `"./manifests"`)
- [x] 1.2 Rename `stateDir` → `manifestDir` in `ResolvedConfig` interface
- [x] 1.3 Rename `stateDir` → `manifestDir` in `loadConfig` return value (`config.defaults.manifestDir`)

## 2. CLI shared args

- [x] 2.1 Rename `stateDirArg` → `manifestDirArg` in `src/cli/shared.ts` and update its description to reference `./manifests`

## 3. CLI commands

- [x] 3.1 In `src/cli/apply.ts`: rename `stateDirArg` import and `"state-dir"` key to `"manifest-dir"`, rename `resolvedStateDir` to `resolvedManifestDir`, update `stateDir: resolvedStateDir` in reconcile context to `manifestDir`
- [x] 3.2 In `src/cli/plan.ts`: rename `stateDirArg` import and `"state-dir"` key to `"manifest-dir"`, update reconcile context
- [x] 3.3 In `src/cli/validate.ts`: rename `stateDirArg` import and `"state-dir"` key to `"manifest-dir"`, rename all `stateDir` local variables to `manifestDir`, update default and log messages from `"./state"` to `"./manifests"` and `stateDir` to `manifestDir`
- [x] 3.4 In `src/cli/pull.ts`: rename `stateDirArg` import and `"state-dir"` key to `"manifest-dir"`, rename `stateDir` local variable to `manifestDir`

## 4. Manifest loader

- [x] 4.1 Rename `stateDir` parameter to `manifestDir` in `loadManifests()` and `validateManifests()` functions in `src/manifest/loader.ts`

## 5. Reconciler engine

- [x] 5.1 Rename `stateDir` → `manifestDir` in `ReconcileContext` interface
- [x] 5.2 Update `loadManifests(ctx.manifestDir)` call referencing the renamed field

## 6. Documentation

- [x] 6.1 Update README.md: replace all `stateDir` → `manifestDir` and `state-dir` → `manifest-dir`, update default `./state` → `./manifests`, add a migration note about the rename
- [x] 6.2 Update AGENTS.md: replace `stateDir` → `manifestDir` and `state-dir` → `manifest-dir`, update default `./state` → `./manifests`

## 7. Test updates

- [x] 7.1 Update `tests/config/schema.test.ts`: rename all `stateDir` → `manifestDir` and `"./state"` → `"./manifests"`
- [x] 7.2 Update `tests/config/loader.test.ts`: rename `config.stateDir` → `config.manifestDir` and `"./state"` → `"./manifests"`
- [x] 7.3 Update `tests/manifest/loader.test.ts`: rename `stateDir` parameter/variable to `manifestDir`, update test description
- [x] 7.4 Update `tests/reconciler/engine.test.ts`: rename all `stateDir` variables/fields to `manifestDir`
- [x] 7.5 Update `tests/cli/apply.test.ts`: rename `"state-dir"` to `"manifest-dir"` in arg assertions
- [x] 7.6 Update `tests/cli/plan.test.ts`: rename `"state-dir"` to `"manifest-dir"` in arg assertions
- [x] 7.7 Update `tests/cli/pull.test.ts`: rename `"state-dir"` to `"manifest-dir"` in arg assertions

## 8. Verification

- [x] 8.1 Run `bun run typecheck` — zero errors
- [x] 8.2 Run `bun run lint` — zero errors
- [x] 8.3 Run `bun run format:check` — zero errors
- [x] 8.4 Run `bun test` — all tests pass
- [x] 8.5 Run `bun run build` — builds successfully
