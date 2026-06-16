## Context

The project has zero automated code quality tooling. Code conventions (double quotes, no semicolons, 2-space indent, trailing commas, named exports only, kebab-case filenames) are documented in AGENTS.md but enforced solely by human code review. The codebase is small (~25 source files) and stylistically consistent, which makes adoption of a formatter low-risk and low-diff.

There is no existing CI pipeline — no GitHub Actions workflows, no pre-commit hooks, no automated checks of any kind.

## Goals / Non-Goals

**Goals:**
- Provide automated, deterministic formatting and linting for all TypeScript source files
- Match the project's established code style exactly (zero configuration drift)
- Enforce code quality checks in CI on every PR and push to main
- Keep the adoption diff minimal (near-zero formatting changes)
- Provide convenient `package.json` scripts for local use (`lint`, `format`, `check`)

**Non-Goals:**
- Editor/IDE integration (`.vscode/settings.json`, extension recommendations)
- Pre-commit hooks (lefthook, husky, simple-git-hooks)
- Enforcing a strict 80-character line width — the project has existing lines up to ~115 chars, so 100 is chosen as the limit
- Formatting YAML manifest files (Biome does not support YAML)
- Adding custom lint rules or rule plugins — only built-in rules are used
- Migrating from ESLint/Prettier (there is nothing to migrate)

## Decisions

### D1: Biome over ESLint + Prettier

**Chosen:** Biome (single tool for both linting and formatting)

**Rationale:**
- **Single dependency, single config** — ESLint + Prettier require coordinating two tools with `eslint-config-prettier`, `eslint-plugin-prettier`, etc. Biome handles both in one pass.
- **Speed** — written in Rust, Biome formats and lints in milliseconds. ESLint (even with flat config) is noticeably slower on TypeScript codebases.
- **Bun compatibility** — Biome ships as a standalone binary. The `@biomejs/biome` npm package installs fine with Bun. No Node.js runtime dependency.
- **Rules built-in** — Biome ships with ~200 rules covering correctness, style, complexity, and security. No plugin ecosystem to manage.
- **Organize imports** — built into the formatter; no separate `eslint-plugin-import` or `eslint-plugin-simple-import-sort`.

**Alternatives considered:**
- **ESLint + Prettier**: Industry standard, but heavier setup and slower. More config files. Not worth the overhead for a codebase that never had them.
- **oxlint**: Also fast (Rust), but linter-only — still need Prettier for formatting. Two tools.
- **dprint**: Formatter-only, no linting. Would need a separate linter.

### D2: `lineWidth: 100`

**Chosen:** 100 characters

**Rationale:**
- The project's longest existing lines are in `src/reconciler/engine.ts` at ~115 characters.
- 80 is too strict and would force wraps on ~20 existing lines — adding noise to the formatting diff.
- 120 would leave everything untouched but feels permissive.
- 100 is a common middle ground that requires only a handful of lines to wrap while keeping the initial diff small.

### D3: Linter rules — `recommended` preset only

**Chosen:** Enable only `rules.recommended: true`, no additional strict rules.

**Rationale:**
- The recommended preset covers correctness (e.g., `noDoubleEquals`, `noUnusedTemplateLiteral`), security (e.g., `noGlobalEval`), and common bugs.
- Additional rules like `useFilenamingConvention` (enforce kebab-case) and `noConsoleLog` (catch leftover console.log) are valuable but can be enabled in a follow-up. Starting lean avoids unexpected CI breakage.
- The project already has `strict: true` and `noUncheckedIndexedAccess` in tsconfig — TypeScript catches many issues that a linter would.

### D4: CI workflow — single job, parallel steps

**Chosen:** One GitHub Actions workflow with parallel check steps.

```yaml
on: [push to main, PR to main]
jobs:
  ci:
    steps:
      - checkout
      - setup bun
      - install (frozen lockfile)
      - typecheck | lint | format:check | test | build  (parallel)
```

**Rationale:**
- Simple to understand and maintain.
- Parallel steps give fast feedback — Biome checks complete in seconds while `tsc` and `bun test` run.
- `oven-sh/setup-bun@v1` is the official Bun setup action, well-maintained.
- A single workflow is sufficient for a project of this size.

### D5: Single formatting commit

**Chosen:** Apply `biome format --write` to the entire repo in the first commit of this change.

**Rationale:**
- The existing style already matches Biome's configuration, so the diff will be minimal (primarily wrapping a few long lines, fixing the one stray semicolon in `src/reconciler/diff.ts`).
- A single "chore: format with Biome" commit keeps history clean and makes the tool introduction obvious.

## Risks / Trade-offs

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| CI breaks on existing code that was previously unreviewed | Low — style already matches | Run `biome check` locally before opening the PR |
| `@biomejs/biome` npm package incompatibility with Bun | Low — Biome is a standalone binary, npm package just downloads it | The package is widely used with Bun; if it fails, fall back to installing the binary directly in CI |
| Biome rules evolving between versions (new rules flagged in CI after a version bump) | Medium | Pin the Biome version in `package.json`; CI uses `bun install --frozen-lockfile` |
| `organizeImports` changes import order in a way that breaks something | Very low | Import reordering is cosmetic; Bun and TypeScript don't care about order |
| Contributors unfamiliar with Biome | Low | AGENTS.md will document the commands; `biome check --write` is a one-liner |

## Migration Plan

1. `bun add -D @biomejs/biome`
2. Create `biome.json` with the agreed configuration
3. Run `bun run format` (applies formatting to all files)
4. Verify tests pass: `bun test`
5. Verify typecheck passes: `bun run typecheck`
6. Run `bun run check` to confirm lint + format pass
7. Create `.github/workflows/ci.yml`
8. Update AGENTS.md
9. Commit everything as a single change

**Rollback:** Remove `@biomejs/biome` from devDependencies, delete `biome.json`, delete the workflow file, revert AGENTS.md. No code changes to roll back since the formatting diff is cosmetic.

## Open Questions

None. All design decisions were resolved during exploration.
