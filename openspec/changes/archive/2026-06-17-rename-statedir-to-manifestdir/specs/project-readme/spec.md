## MODIFIED Requirements

### Requirement: README documents all CLI commands
The README SHALL include a CLI reference section with a table of all 7 subcommands (apply, plan, validate, pull, get, delete, config), each row containing the command name, one-sentence description, and notable flags. A separate global flags reference table SHALL document --context, --manifest-dir, --dry-run, --delete-orphans, and --verbose.

#### Scenario: User looks up a command's purpose
- **WHEN** a user consults the CLI reference table
- **THEN** they can identify which command to use for their need (e.g., "preview changes" → `plan`, "fetch remote" → `pull`)

### Requirement: README documents workflow patterns
The README SHALL include a Workflow Patterns section covering: GitOps (manifests in git → CI runs `kener-ctl apply`), drift detection (`kener-ctl plan` in a cron job), multi-environment (separate contexts and manifestDirs), and onboarding from an existing instance (`kener-ctl pull`).

#### Scenario: User adopts GitOps workflow
- **WHEN** a user reads the GitOps pattern description
- **THEN** they understand that manifests can be version-controlled and applied via CI

### Requirement: README includes configuration reference
The README SHALL include a Configuration Reference section documenting: the XDG file path (`~/.config/kener-ctl/config.yaml`), a full annotated YAML example showing all fields (version, current-context, contexts array with name/instance/apiKey, defaults with manifestDir/concurrency/dryRun/deleteOrphans), context override methods (--context flag takes precedence over KENER_CONTEXT env var which takes precedence over config file), and multi-instance use cases.

#### Scenario: User configures multiple contexts
- **WHEN** a user copies the annotated config example and fills in their own instance URLs and API keys
- **THEN** they can switch contexts with `--context production` or `--context staging`
