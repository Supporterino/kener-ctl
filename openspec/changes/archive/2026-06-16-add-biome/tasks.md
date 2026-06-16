## 1. Setup

- [x] 1.1 Install `@biomejs/biome` as a dev dependency with `bun add -D @biomejs/biome`
- [x] 1.2 Create `biome.json` with formatter (2-space indent, double quotes, no semicolons, trailing commas, 100-char line width), linter (recommended preset), and organizeImports enabled
- [x] 1.3 Add scripts to `package.json`: `lint`, `lint:fix`, `format`, `format:check`, `check`, `check:fix`

## 2. Format Repository

- [x] 2.1 Run `biome format --write .` to apply formatting to all source files
- [x] 2.2 Review the formatting diff and verify it is minimal (style already matches)
- [x] 2.3 Run `bun test` to confirm no regressions
- [x] 2.4 Run `bun run typecheck` to confirm no type errors

## 3. CI Pipeline

- [x] 3.1 Create `.github/workflows/ci.yml` with checkout, bun setup, install (frozen lockfile), and parallel checks (typecheck, lint, format:check, test, build)
- [x] 3.2 Verify the workflow YAML is valid

## 4. Documentation

- [x] 4.1 Update AGENTS.md section 1 (Tech Stack) to add Biome
- [x] 4.2 Update AGENTS.md section 5 (Code Conventions) to reference Biome as the enforcement mechanism
- [x] 4.3 Update AGENTS.md section 8 (CI / Verification) to include `bun run lint` and `bun run format:check`

## 5. Verification

- [x] 5.1 Run `bun run check` to verify lint + format pass cleanly
- [x] 5.2 Run `bun test` to confirm all tests pass
- [x] 5.3 Run `bun run typecheck` to confirm no type errors
- [x] 5.4 Run `bun run build` to confirm the build succeeds
