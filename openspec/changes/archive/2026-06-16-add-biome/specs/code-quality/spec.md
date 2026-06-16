## ADDED Requirements

### Requirement: Automated code formatting
The project SHALL use Biome to format all TypeScript source files in `src/` and `tests/` according to the project's code style conventions (double quotes, no semicolons, 2-space indent, trailing commas, 100-char line width).

#### Scenario: Format check passes on well-formatted code
- **WHEN** `biome format .` is run against the repository
- **THEN** the command SHALL exit with code 0 and produce no output

#### Scenario: Format check fails on poorly-formatted code
- **WHEN** `biome format .` is run against a file with style violations (e.g., single quotes, semicolons, wrong indentation)
- **THEN** the command SHALL exit with code 1 and report the violations

#### Scenario: Format fix corrects violations
- **WHEN** `biome format --write .` is run
- **THEN** all formatting violations SHALL be automatically corrected in-place

### Requirement: Automated linting
The project SHALL use Biome's recommended lint rules to detect code quality issues, bugs, and anti-patterns in all TypeScript source files.

#### Scenario: Lint passes on clean code
- **WHEN** `biome lint .` is run against code with no rule violations
- **THEN** the command SHALL exit with code 0

#### Scenario: Lint fails on rule violations
- **WHEN** `biome lint .` is run against code that violates one or more recommended rules
- **THEN** the command SHALL exit with code 1 and report the file, line, and rule name for each violation

#### Scenario: Lint fix corrects auto-fixable violations
- **WHEN** `biome lint --write .` is run
- **THEN** all auto-fixable lint violations SHALL be corrected in-place

### Requirement: Combined check via `biome check`
The `check` command SHALL run both formatting and linting in a single pass, exiting with code 0 only when both pass.

#### Scenario: Check passes
- **WHEN** `biome check .` is run against a well-formatted, lint-clean repository
- **THEN** the command SHALL exit with code 0

#### Scenario: Check fails on formatting issue
- **WHEN** `biome check .` is run and a formatting violation exists
- **THEN** the command SHALL exit with code 1 and report the formatting error

### Requirement: CI enforcement
All code quality checks (formatting, linting, typechecking, tests, and build) SHALL run on every push to `main` and every pull request targeting `main` via GitHub Actions.

#### Scenario: PR with clean code passes CI
- **WHEN** a pull request is opened with code that passes all checks
- **THEN** the CI workflow SHALL complete successfully with all jobs passing

#### Scenario: PR with lint violations fails CI
- **WHEN** a pull request is opened with code that fails `biome lint .`
- **THEN** the CI workflow SHALL report a failure and the PR SHALL not be mergeable

#### Scenario: PR with formatting violations fails CI
- **WHEN** a pull request is opened with code that fails `biome format .`
- **THEN** the CI workflow SHALL report a failure and the PR SHALL not be mergeable

### Requirement: Import organization
Imports SHALL be automatically organized by Biome's `organizeImports` feature when formatting is applied, grouping external dependencies first, followed by `@/` aliased imports, followed by relative imports.

#### Scenario: Disorganized imports are sorted
- **WHEN** `biome format --write .` is run on a file with unsorted imports
- **THEN** the imports SHALL be reordered to match the project's convention (external → `@/` alias → relative)

### Requirement: Convenience scripts
`package.json` SHALL expose scripts for running Biome checks locally: `lint`, `lint:fix`, `format`, `format:check`, `check`, and `check:fix`.

#### Scenario: Developer runs lint check
- **WHEN** a developer runs `bun run lint`
- **THEN** `biome lint .` SHALL execute and report results

#### Scenario: Developer fixes formatting
- **WHEN** a developer runs `bun run format`
- **THEN** `biome format --write .` SHALL execute and fix formatting in-place

#### Scenario: Developer runs combined check
- **WHEN** a developer runs `bun run check`
- **THEN** `biome check .` SHALL execute and report both lint and format results
