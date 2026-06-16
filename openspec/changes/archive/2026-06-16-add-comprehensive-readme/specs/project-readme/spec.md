## ADDED Requirements

### Requirement: README file exists at repository root
The system SHALL include a `README.md` file at the repository root. The file SHALL be written in GitHub-flavored Markdown and SHALL be at least 200 lines long to ensure comprehensive coverage.

#### Scenario: README is present in repo
- **WHEN** a visitor navigates to the repository root
- **THEN** a `README.md` file is found and rendered as the repo homepage

### Requirement: README includes elevator pitch and badges
The README SHALL open with the project name, a one-sentence description ("Declarative CLI for Kener status pages"), and CI and license badges. The description SHALL convey the IaC/declarative model ("kubectl for Kener").

#### Scenario: Visitor sees what the tool does immediately
- **WHEN** a visitor opens the README
- **THEN** within the first screenful they see the project name, a one-sentence description, and build status badges

### Requirement: README documents all three installation methods
The README SHALL describe three installation methods in order of decreasing convenience: (1) standalone binary via GitHub Releases with curl/wget one-liners, (2) npm global install (`npm install -g kener-ctl`), (3) from source (`git clone` + `bun install` + `bun run build`). Each method SHALL include a copy-pasteable command block.

#### Scenario: User installs via standalone binary
- **WHEN** a user follows the standalone binary instructions
- **THEN** they download a platform-appropriate binary (linux-x64, linux-arm64, darwin-x64, darwin-arm64, win-x64) from GitHub Releases and can run `kener-ctl --help`

#### Scenario: User installs via npm
- **WHEN** a user runs `npm install -g kener-ctl`
- **THEN** the `kener-ctl` command is available in their PATH (requires Bun runtime)

#### Scenario: User installs from source
- **WHEN** a user clones the repo and runs `bun install && bun run build`
- **THEN** the `dist/cli/index.js` artifact is produced and can be run with `bun dist/cli/index.js`

### Requirement: README includes a copy-pasteable Quick Start
The README SHALL include a Quick Start section with 4 sequential steps: (1) create a config file at `~/.config/kener-ctl/config.yaml` with an annotated example, (2) create one YAML manifest file for an API monitor, (3) run `kener-ctl apply`, (4) verify the monitor appears on the Kener status page. Each step SHALL include a copy-pasteable code block. The config example SHALL be functional with placeholder values clearly marked.

#### Scenario: New user follows Quick Start
- **WHEN** a new user copies the Quick Start commands step by step into a terminal with a Kener v4 instance and valid API key
- **THEN** they have a working monitor on their status page within 5 minutes

### Requirement: Kener v4 compatibility statement
The README SHALL include a prominent statement that kener-ctl targets Kener v4 REST API (`/api/v4/…`), with a link to https://kener.ing.

#### Scenario: User sees compatibility requirements
- **WHEN** a user reads the installation or quick start section
- **THEN** they see that Kener v4 or later is required

### Requirement: README documents all six resource kinds
The README SHALL include a reference table listing all 6 resource kinds (Monitor, Page, AlertTrigger, AlertConfig, Incident, Maintenance) with their identity key, reconcile strategy (natural key or state file), and dependency ordering position. The README SHALL include one minimal, copy-pasteable YAML example per resource kind. The README SHALL point to the `examples/` directory for complete reference manifests.

#### Scenario: User looks up resource kind reference
- **WHEN** a user scrolls to the Resource Manifests section
- **THEN** they see a table with all 6 kinds and identity keys, a minimal YAML example for each kind, and a pointer to `examples/` for more

#### Scenario: Minimal YAML example for Monitor is valid
- **WHEN** a user copies the Monitor example from the README into a file
- **THEN** `kener-ctl validate` passes without errors

### Requirement: README documents all CLI commands
The README SHALL include a CLI reference section with a table of all 7 subcommands (apply, plan, validate, pull, get, delete, config), each row containing the command name, one-sentence description, and notable flags. A separate global flags reference table SHALL document --context, --state-dir, --dry-run, --delete-orphans, and --verbose.

#### Scenario: User looks up a command's purpose
- **WHEN** a user consults the CLI reference table
- **THEN** they can identify which command to use for their need (e.g., "preview changes" → `plan`, "fetch remote" → `pull`)

### Requirement: README documents the state file
The README SHALL explain the state file's purpose (mapping local names to remote integer IDs for resources without natural keys), its location (`~/.config/kener-ctl/state/<context>.json`), which resource kinds use it (AlertConfig, Incident, Maintenance), and that it is automatically managed by `kener-ctl apply`.

#### Scenario: User understands state file necessity
- **WHEN** a user reads the State File section
- **THEN** they understand why some resources need a state file, where it lives, and that they should not edit it manually

### Requirement: README documents workflow patterns
The README SHALL include a Workflow Patterns section covering: GitOps (manifests in git → CI runs `kener-ctl apply`), drift detection (`kener-ctl plan` in a cron job), multi-environment (separate contexts and stateDirs), and onboarding from an existing instance (`kener-ctl pull`).

#### Scenario: User adopts GitOps workflow
- **WHEN** a user reads the GitOps pattern description
- **THEN** they understand that manifests can be version-controlled and applied via CI

### Requirement: README documents exit codes
The README SHALL include an Exit Codes section with a table: code 0 (success, no changes, or plan clean), code 1 (API/network/auth/config error), code 2 (manifest validation errors).

#### Scenario: User scripts around kener-ctl
- **WHEN** a user writes a CI script that calls kener-ctl
- **THEN** they can reference the exit codes table to handle failures correctly

### Requirement: README documents development setup
The README SHALL include a Development section with prerequisites (Bun ≥ 1.1), setup instructions (`bun install`), a table of all npm scripts (dev, build, test, typecheck, lint, format, check, release), a list of key tech stack libraries, and a brief project structure overview (src/ directories and their purposes).

#### Scenario: Contributor sets up development environment
- **WHEN** a contributor follows the Development section
- **THEN** they can clone, install, build, and run tests within 5 minutes

### Requirement: README includes configuration reference
The README SHALL include a Configuration Reference section documenting: the XDG file path (`~/.config/kener-ctl/config.yaml`), a full annotated YAML example showing all fields (version, current-context, contexts array with name/instance/apiKey, defaults with stateDir/concurrency/dryRun/deleteOrphans), context override methods (--context flag takes precedence over KENER_CONTEXT env var which takes precedence over config file), and multi-instance use cases.

#### Scenario: User configures multiple contexts
- **WHEN** a user copies the annotated config example and fills in their own instance URLs and API keys
- **THEN** they can switch contexts with `--context production` or `--context staging`

### Requirement: README includes links section
The README SHALL include a Links section at the bottom pointing to: Kener documentation (https://kener.ing), GitHub Issues for the repository, and the examples directory.

#### Scenario: User needs more information
- **WHEN** a user reaches the bottom of the README and still has questions
- **THEN** they find links to Kener docs and the GitHub issue tracker
