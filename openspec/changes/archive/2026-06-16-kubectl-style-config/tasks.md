## 1. Config schema and loader

- [x] 1.1 Rewrite `src/config/schema.ts` with new Zod schemas: ContextSchema, DefaultsSchema, ConfigSchema (version, current-context, contexts, defaults) with cross-field validation (no duplicate context names, current-context must exist)
- [x] 1.2 Rewrite `src/config/loader.ts`: remove `c12` import, add XDG path helpers (`configDir`, `configFilePath`, `stateFilePath`), implement `loadConfig` that reads YAML from XDG path, resolves context (--context > KENER_CONTEXT > current-context), validates, and returns flattened `ResolvedConfig`

## 2. Shared CLI arg changes

- [x] 2.1 Add `contextArg` to `src/cli/shared.ts` (type: string, description about overriding context)
- [x] 2.2 Remove `configArg` from `src/cli/shared.ts`

## 3. Config CLI commands

- [x] 3.1 Create `src/cli/config.ts` with `configCommand` (citty `defineCommand`) having `use`, `current`, `list` subcommands
- [x] 3.2 Implement `config use <name>` — load config file, validate target context exists, update `current-context`, write back with `js-yaml` dump
- [x] 3.3 Implement `config current` — load config, print `current-context` to stdout
- [x] 3.4 Implement `config list` — load config, print table with NAME, INSTANCE, CURRENT indicator using `cli-table3`
- [x] 3.5 Register `configCommand` in `src/cli/index.ts` under `subCommands`

## 4. Update apply command

- [x] 4.1 Add `--context` arg to `applyCommand` in `src/cli/apply.ts`, remove `--config` arg
- [x] 4.2 Update `applyCommand.run` to pass `args.context` to `loadConfig`, use `resolvedConfig.contextName` for `stateFilePath`, pass `stateFilePath` to reconciler

## 5. Update plan command

- [x] 5.1 Add `--context` arg to `planCommand` in `src/cli/plan.ts`, remove `--config` arg
- [x] 5.2 Update `planCommand.run` to pass `args.context` to `loadConfig`, pass `stateFilePath` to reconciler

## 6. Update get command

- [x] 6.1 Add `--context` arg to `getCommand` in `src/cli/get.ts`, remove `--config` arg
- [x] 6.2 Update `getCommand.run` to pass `args.context` to `loadConfig`

## 7. Update delete command

- [x] 7.1 Add `--context` arg to `deleteCommand` in `src/cli/delete.ts`, remove `--config` arg
- [x] 7.2 Update `deleteCommand.run` to pass `args.context` to `loadConfig`

## 8. Update pull command

- [x] 8.1 Add `--context` arg to `pullCommand` in `src/cli/pull.ts`, remove `--config` arg
- [x] 8.2 Update `pullCommand.run` to pass `args.context` to `loadConfig`

## 9. Update validate command

- [x] 9.1 Update `validateCommand` in `src/cli/validate.ts` to load config for defaults (gracefully handle missing config by falling back to hardcoded defaults `./state`)

## 10. Update reconciler engine

- [x] 10.1 Add `stateFilePath` parameter to `ReconcileContext` interface in `src/reconciler/engine.ts`
- [x] 10.2 Replace `stateFilePath(stateDir)` calls with the passed-in `ctx.stateFilePath`
- [x] 10.3 Remove the `stateFilePath` helper function that computed `join(stateDir, "..", ".kener-ctl-state.json")`

## 11. Cleanup

- [x] 11.1 Remove `c12` from `package.json` dependencies
- [x] 11.2 Delete `kener-ctl.yaml` from repo root (no longer used; replaced by user config)
- [x] 11.3 Update `AGENTS.md` config section to reflect new architecture (if it mentions old config system)
- [x] 11.4 Remove `KENER_URL` / `KENER_API_KEY` references from any env-var documentation

## 12. Tests

- [x] 12.1 Unit tests for `ConfigSchema` validation (valid config, missing context, duplicate names, bad current-context, invalid URLs, missing apiKey, defaults)
- [x] 12.2 Unit tests for `loadConfig` (context resolution priority, missing config file error, XDG path resolution)
- [x] 12.3 Unit tests for `stateFilePath` helper
- [x] 12.4 CLI tests for `config use`, `config current`, `config list`
- [x] 12.5 CLI tests for `apply --context`, `plan --context`, `get --context`, `delete --context`, `pull --context`
- [x] 12.6 Tests for `validate` command with missing config (falls back to defaults)
- [x] 12.7 Tests for reconciler engine with `stateFilePath` parameter
- [x] 12.8 Update existing CLI tests that referenced `--config` flag

## 13. Verification

- [x] 13.1 Run `bun run typecheck` — zero errors
- [x] 13.2 Run `bun test` — all tests pass
- [x] 13.3 Run `bun run build` — builds successfully
