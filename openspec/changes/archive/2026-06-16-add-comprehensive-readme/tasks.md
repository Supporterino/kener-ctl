## 1. Header and badges

- [x] 1.1 Create `README.md` at repo root with project title (`# kener-ctl`), one-sentence elevator pitch, and CI + license badges
- [x] 1.2 Add Kener v4 compatibility statement near the top ("Requires Kener v4 or later")

## 2. Installation

- [x] 2.1 Write standalone binary installation section with curl/wget one-liners for each of the 5 platform targets (linux-x64, linux-arm64, darwin-x64, darwin-arm64, win-x64), using the latest GitHub Release URL pattern
- [x] 2.2 Write npm install section (`npm install -g kener-ctl`) with a note that Bun runtime is required for the npm package
- [x] 2.3 Write source install section (`git clone` + `bun install` + `bun run build`)

## 3. Quick Start

- [x] 3.1 Write step 1: create `~/.config/kener-ctl/config.yaml` with an annotated, functional example using placeholder values (`<your-instance-url>`, `<your-api-key>`)
- [x] 3.2 Write step 2: create a minimal API monitor manifest with a copy-pasteable YAML block (kind: Monitor, metadata.tag, spec with name, type: API, typeData.url with placeholder)
- [x] 3.3 Write step 3: run `kener-ctl apply` and show expected output
- [x] 3.4 Write step 4: verify the monitor appears on the Kener status page with a sentence

## 4. Configuration Reference

- [x] 4.1 Document XDG config file path (`~/.config/kener-ctl/config.yaml`) and list all top-level fields
- [x] 4.2 Include a full annotated YAML example showing version, current-context, contexts array (with 2 contexts: production and staging), and defaults (stateDir, concurrency, dryRun, deleteOrphans)
- [x] 4.3 Document context override precedence: `--context` flag > `KENER_CONTEXT` env var > config file

## 5. Resource Manifests

- [x] 5.1 Write concept overview: YAML files in stateDir, one resource per file
- [x] 5.2 Create reference table with columns: Kind, Identity Key, Reconcile Strategy (natural key vs state file), Apply Order position
- [x] 5.3 Write one minimal copy-pasteable YAML example per kind (6 examples total): Monitor (API), Page (home), AlertTrigger (webhook), AlertConfig (status), Incident (investigating), Maintenance (scheduled)
- [x] 5.4 Document dependency-aware ordering explanation (why triggers come first, maintenances last, deletes run in reverse)
- [x] 5.5 Add pointer to `examples/` directory for complete reference manifests

## 6. CLI Reference

- [x] 6.1 Create a command reference table with all 7 subcommands (apply, plan, validate, pull, get, delete, config), each row containing: command name, description, and notable flags
- [x] 6.2 Create a global flags reference table: --context, --state-dir, --dry-run, --delete-orphans, --verbose, --kind, --tag, --name, --path
- [x] 6.3 Note that `plan` is equivalent to `apply --dry-run`

## 7. State File

- [x] 7.1 Explain the state file's purpose: maps local names to remote integer IDs for resources without natural string keys
- [x] 7.2 Document file location: `~/.config/kener-ctl/state/<context>.json`
- [x] 7.3 List which resource kinds use it (AlertConfig, Incident, Maintenance) and which don't (Monitor, Page, AlertTrigger)
- [x] 7.4 State that it is automatically managed by `kener-ctl apply` and should not be edited manually

## 8. Workflow Patterns

- [x] 8.1 Document GitOps pattern: manifests in git → CI runs `kener-ctl apply`
- [x] 8.2 Document drift detection pattern: `kener-ctl plan` in a cron job
- [x] 8.3 Document multi-environment pattern: separate contexts and stateDirs for production/staging
- [x] 8.4 Document onboarding pattern: `kener-ctl pull` from an existing Kener instance

## 9. Exit Codes

- [x] 9.1 Create exit codes table: 0 (success/no changes/plan clean), 1 (API/network/auth/config error), 2 (manifest validation error)

## 10. Development

- [x] 10.1 Write prerequisites section: Bun ≥ 1.1, Git
- [x] 10.2 Write setup instructions: `git clone`, `bun install`
- [x] 10.3 Create npm scripts table with all 8 scripts (dev, build, test, typecheck, lint, lint:fix, format, format:check, check, check:fix, release) and their descriptions
- [x] 10.4 List key tech stack libraries with brief descriptions
- [x] 10.5 Include brief project structure overview (src/ directories: cli/, config/, manifest/, api/, reconciler/, output/, util/)

## 11. Links and footer

- [x] 11.1 Add links to: Kener docs (https://kener.ing), GitHub Issues
- [x] 11.2 Add license notice (matching LICENSE file)

## 12. Verification

- [x] 12.1 Copy each minimal YAML example from the README into a file and run `kener-ctl validate` to confirm all 6 pass
- [x] 12.2 Run `bun test` to confirm no regressions
- [x] 12.3 Run `bun run check` (Biome format + lint) to ensure the README doesn't affect CI — confirm zero errors on working tree
- [x] 12.4 Manual review: open README preview and verify all links are functional, all code blocks render correctly, and the table of contents works
