## Why

The project has no automated linting or formatting. Code conventions are described in AGENTS.md but enforced only by human review. Adding Biome provides fast, deterministic enforcement of the existing style — catching regressions before they reach code review and eliminating style debates from PR discussions.

## What Changes

- Add `@biomejs/biome` as a dev dependency
- Add `biome.json` configuration matching the project's established code style (double quotes, no semicolons, 2-space indent, trailing commas)
- Add `package.json` scripts: `lint`, `lint:fix`, `format`, `format:check`, `check`, `check:fix`
- Add GitHub Actions CI workflow running typecheck, lint, format-check, tests, and build on push/PR to main
- Enable Biome's `organizeImports` for consistent import ordering
- Update AGENTS.md to reference Biome as the enforcement mechanism and update the CI verification checklist
- Run `biome format --write` across the repository (near-empty diff — style already matches)

## Capabilities

### New Capabilities

- `code-quality`: Automated linting and formatting via Biome, enforced in CI

### Modified Capabilities

None. This is a tooling change that does not alter any existing spec-level behavior.

## Impact

| Area | Impact |
|------|--------|
| `package.json` | New devDependency (`@biomejs/biome`) and new scripts |
| `biome.json` (new) | Configuration file at repo root |
| `.github/workflows/ci.yml` (new) | CI pipeline — lints, formats, typechecks, tests, builds |
| `AGENTS.md` | Tech stack table, code conventions section, CI verification checklist |
| Source files (`src/`, `tests/`) | Formatting applied (minimal diff) |
| `.vscode/` (optional) | Editor integration settings (not in scope) |

## Non-goals

- Editor/IDE integration (`.vscode/settings.json`, extension recommendations) — users configure their own editor
- Pre-commit hooks — not in scope for this change
- Enforcing a strict line-width (Biome's default 80) — wider lines that already exist will be preserved by setting `lineWidth: 100`
