# kener-ctl

[![CI](https://github.com/Supporterino/kener-ctl/actions/workflows/release.yml/badge.svg)](https://github.com/Supporterino/kener-ctl/actions/workflows/release.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

**Declarative CLI for Kener status pages** — like `kubectl` for your incident communication.

kener-ctl lets you manage Kener monitors, pages, alert triggers, alert configs, incidents,
and maintenances as YAML manifests in version control. Describe what the ideal state should
look like, run `kener-ctl apply`, and the tool reconciles reality.

> **Requires Kener v4 or later.** kener-ctl targets the Kener v4 REST API (`/api/v4/…`).
> Learn more at [kener.ing](https://kener.ing).

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration Reference](#configuration-reference)
- [Resource Manifests](#resource-manifests)
- [CLI Reference](#cli-reference)
- [State File](#state-file)
- [Workflow Patterns](#workflow-patterns)
- [Exit Codes](#exit-codes)
- [Development](#development)
- [Links](#links)

---

## Installation

### Homebrew (macOS)

```bash
brew tap supporterino/kener-ctl
brew install kener-ctl
```

To upgrade:

```bash
brew upgrade kener-ctl
```

### Standalone Binary

Download a prebuilt binary for your platform — no runtime required.

**Linux x64**
```bash
curl -L -o kener-ctl https://github.com/Supporterino/kener-ctl/releases/latest/download/kener-ctl-linux-x64
chmod +x kener-ctl
sudo mv kener-ctl /usr/local/bin/
```

**Linux arm64**
```bash
curl -L -o kener-ctl https://github.com/Supporterino/kener-ctl/releases/latest/download/kener-ctl-linux-arm64
chmod +x kener-ctl
sudo mv kener-ctl /usr/local/bin/
```

**macOS x64**
```bash
curl -L -o kener-ctl https://github.com/Supporterino/kener-ctl/releases/latest/download/kener-ctl-darwin-x64
chmod +x kener-ctl
sudo mv kener-ctl /usr/local/bin/
```

**macOS arm64 (Apple Silicon)**
```bash
curl -L -o kener-ctl https://github.com/Supporterino/kener-ctl/releases/latest/download/kener-ctl-darwin-arm64
chmod +x kener-ctl
sudo mv kener-ctl /usr/local/bin/
```

**Windows x64**
```powershell
curl -L -o kener-ctl.exe https://github.com/Supporterino/kener-ctl/releases/latest/download/kener-ctl-win-x64.exe
```

### From Source

```bash
git clone https://github.com/Supporterino/kener-ctl.git
cd kener-ctl
bun install
bun run build
```

The built artifact is `dist/cli/index.js`. Run it with:
```bash
bun run dist/cli/index.js
```

---

## Quick Start

Get a monitor on your Kener status page in under 5 minutes.

### Step 1: Configure a context

Create `~/.config/kener-ctl/config.yaml`:

```yaml
version: 1
current-context: production
contexts:
  - name: production
    instance: <your-instance-url>
    apiKey: <your-api-key>
defaults:
  manifestDir: ./manifests
  concurrency: 4
```

Replace `<your-instance-url>` with your Kener v4 instance URL (e.g. `https://status.example.com`)
and `<your-api-key>` with a Kener API key.

### Step 2: Write a monitor manifest

Create `./manifests/monitors/my-api.yaml`:

```yaml
kind: Monitor
metadata:
  tag: my-api
spec:
  name: My API
  type: API
  typeData:
    _type: API
    url: https://api.example.com/health
    method: GET
    timeout: 10000
    eval: response.status === 200
```

### Step 3: Apply

```bash
kener-ctl apply
```

Expected output:

```
Plan: 1 to create, 0 to update, 0 to delete
  + Monitor  my-api  CREATE  My API

Apply complete: 1 created, 0 updated, 0 deleted, 0 errors
```

### Step 4: Verify

Open your Kener status page in a browser — you should see the "My API" monitor listed.

---

## Configuration Reference

kener-ctl reads its configuration from `~/.config/kener-ctl/config.yaml` (XDG config directory).

### Top-level fields

| Field              | Type     | Required | Description                                               |
| ------------------ | -------- | -------- | --------------------------------------------------------- |
| `version`          | `1`      | Yes      | Config schema version (must be `1`)                       |
| `current-context`  | `string` | Yes      | Default context name                                      |
| `contexts`         | `array`  | Yes      | List of context objects (at least one)                    |
| `defaults`         | `object` | No       | Global defaults (see below)                               |

### Full annotated example

```yaml
version: 1
current-context: production

contexts:
  - name: production
    instance: https://status.example.com
    apiKey: kp_abc123def456

  - name: staging
    instance: https://status-staging.example.com
    apiKey: kp_staging789xyz

defaults:
  manifestDir: ./manifests    # Root directory for manifest files
  concurrency: 4              # Parallel API calls during apply (1-20)
  dryRun: false               # Plan only, never mutate
  deleteOrphans: false        # Prune remote resources absent from state
```

### Context overrides

You can override the active context at runtime. Precedence (highest to lowest):

1. `--context` CLI flag — e.g. `kener-ctl apply --context staging`
2. `KENER_CONTEXT` environment variable — `KENER_CONTEXT=staging kener-ctl apply`
3. `current-context` field in the config file

This makes multi-instance workflows straightforward. Keep separate configs for production and staging, or use one config with multiple contexts and switch with `--context`.

---

## Resource Manifests

### Concept

Resources are described as YAML files under the `manifestDir` (default `./manifests/`). Each file
contains exactly one resource, identified by `kind`. Directory names follow the convention
`<kind-lowercase>s/` (e.g. `manifests/monitors/`, `manifests/pages/`).

### Reference Table

| Kind           | Identity Key       | Reconcile Strategy | Apply Order |
| -------------- | ------------------ | ------------------ | ----------- |
| AlertTrigger   | `metadata.name`    | Natural key (name) | 1st         |
| Monitor        | `metadata.tag`     | Natural key (tag)  | 2nd         |
| Page           | `metadata.path`    | Natural key (path) | 3rd         |
| AlertConfig    | `metadata.name`    | State file         | 4th         |
| Incident       | `metadata.name`    | State file         | 5th         |
| Maintenance    | `metadata.name`    | State file         | 6th (last)  |

- **Natural key** — the resource has a unique string identifier on the server, so kener-ctl can match manifests to remote resources directly.
- **State file** — the resource is identified by a server-assigned integer ID. kener-ctl maintains a mapping in `~/.config/kener-ctl/state/<context>.json` to track which local manifest corresponds to which remote resource.

### Minimal Examples

**Monitor (API)**

```yaml
kind: Monitor
metadata:
  tag: my-api
spec:
  name: My API
  type: API
  typeData:
    _type: API
    url: https://api.example.com/health
    method: GET
    timeout: 10000
    eval: response.status === 200
```

**Page (home)**

```yaml
kind: Page
metadata:
  path: "~home"
spec:
  title: Home
  header: "System Status"
  monitors:
    - my-api
```

**AlertTrigger (webhook)**

```yaml
kind: AlertTrigger
metadata:
  name: ops-webhook
spec:
  type: WEBHOOK
  webhookUrl: https://webhook.example.com/alerts/CHANGEME
```

**AlertConfig (status)**

```yaml
kind: AlertConfig
metadata:
  name: api-down-critical
spec:
  monitorTag: my-api
  alertType: STATUS
  alertValue: DOWN
  failureThreshold: 1
  successThreshold: 2
  severity: CRITICAL
  triggerNames:
    - ops-webhook
```

**Incident (investigating)**

```yaml
kind: Incident
metadata:
  name: api-degraded
spec:
  title: API Latency Degradation
  state: INVESTIGATING
  affectedMonitors:
    - tag: my-api
      impact: DEGRADED
  updates:
    - message: "Investigating increased latency on the primary API."
      state: INVESTIGATING
```

**Maintenance (scheduled)**

```yaml
kind: Maintenance
metadata:
  name: api-v2-migration
spec:
  title: API v2 Migration — Scheduled Downtime
  monitors:
    - my-api
  startDatetime: "2026-08-01T02:00:00Z"
  endDatetime: "2026-08-01T05:00:00Z"
```

### Dependency Ordering

Resources are applied in a specific order to satisfy dependencies:

1. **AlertTriggers** come first — they have no dependencies.
2. **Monitors** — referenced by pages, alert configs, incidents, and maintenances.
3. **Pages** — reference monitor tags.
4. **AlertConfigs** — reference monitors and triggers.
5. **Incidents** — reference monitors.
6. **Maintenances** — reference monitors and come last.

Deletions run in reverse order so that dependents are removed before the resources they reference.

### More Examples

See the [`examples/`](./examples) directory for complete reference manifests covering all
resource kinds and common configurations.

---

## CLI Reference

### Commands

| Command      | Description                                       | Notable Flags                     |
| ------------ | ------------------------------------------------- | --------------------------------- |
| `apply`      | Reconcile remote to match local state             | `--dry-run`, `--delete-orphans`, `--kind`, `--tag`, `--name`, `--path` |
| `plan`       | Show diff without applying (alias for `apply --dry-run`) | Same as `apply`                  |
| `validate`   | Parse and validate all manifest files (no API)    |                                   |
| `pull`       | Export remote state as YAML manifests             | `--kind`, `--overwrite`           |
| `get`        | Fetch and display one or all resources of a kind  | `--output` (table, json, yaml)    |
| `delete`     | Immediately delete a single remote resource       | `--yes`                           |
| `config`     | Manage configuration and contexts                 | Subcommands: `use`, `current`, `list` |

> `plan` is equivalent to `apply --dry-run`. Both show what would change without making any modifications.

### Global Flags

| Flag               | Description                                       |
| ------------------ | ------------------------------------------------- |
| `--context`        | Kener context to use (overrides config/env)       |
| `--manifest-dir`   | Override manifest directory (default `./manifests`)
| `--dry-run`        | Show plan only, make no changes                   |
| `--delete-orphans` | Delete remote resources not present in state      |
| `--verbose`        | Enable verbose logging                            |
| `--kind`           | Limit operation to one resource kind              |
| `--tag`            | Target a specific monitor by tag                  |
| `--name`           | Target a specific resource by name                |
| `--path`           | Target a specific page by path                    |

---

## State File

### What it is

Some Kener resources are identified by server-assigned integer IDs rather than unique string
keys. kener-ctl maintains a **state file** that maps your local manifest names to those
remote IDs, so it can track which manifest corresponds to which server resource across
apply cycles.

### Location

```
~/.config/kener-ctl/state/<context>.json
```

Each context gets its own state file. If you switch contexts, each one maintains an independent mapping.

### Which resources use it

| Uses State File    | Uses Natural Key |
| ------------------ | ---------------- |
| AlertConfig        | Monitor (tag)    |
| Incident           | Page (path)      |
| Maintenance        | AlertTrigger (name) |

### Important

> The state file is **automatically managed** by `kener-ctl apply`. It is created and
> updated every time you apply manifests. Do not edit it manually.

---

## Workflow Patterns

### Drift Detection

Detect configuration drift by running `kener-ctl plan` on a schedule:

```bash
# Crontab entry: run every hour
0 * * * * kener-ctl plan --context production 2>&1 | grep -q 'no change' || notify-send "Kener drift detected"
```

If the output shows any changes, someone (or something) modified the Kener instance outside of the declared state.

### Multi-Environment

Use separate contexts for production and staging with distinct state directories:

```yaml
contexts:
  - name: production
    instance: https://status.example.com
    apiKey: kp_prod_xxx
  - name: staging
    instance: https://status-staging.example.com
    apiKey: kp_stage_xxx

defaults:
  manifestDir: ./manifests
```

```bash
kener-ctl plan --context staging --manifest-dir ./manifests-staging
kener-ctl apply --context production --manifest-dir ./manifests-prod
```

### Onboarding from an Existing Instance

Already have a Kener instance set up through the UI? Pull everything into manifests:

```bash
kener-ctl pull --context production
```

This exports all remote resources as YAML files into your `manifestDir`. From there, you can
version-control them and start managing declaratively.

---

## Exit Codes

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| 0    | Success (no changes, plan clean, or apply OK)  |
| 1    | API error, network error, auth failure, or configuration error |
| 2    | Manifest validation errors (one or more YAML files are invalid) |

Use these in CI scripts to handle failures appropriately. Code 0 means the plan/apply succeeded;
code 2 means your manifests need fixing before the tool can proceed.

---

## Development

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- [Git](https://git-scm.com)

### Setup

```bash
git clone https://github.com/Supporterino/kener-ctl.git
cd kener-ctl
bun install
```

### Scripts

| Script          | Description                                           |
| --------------- | ----------------------------------------------------- |
| `dev`           | Run the CLI directly (`bun run src/cli/index.ts`)     |
| `build`         | Bundle the CLI to `dist/`                             |
| `test`          | Run the test suite (`bun test`)                       |
| `typecheck`     | Type-check with `tsc --noEmit`                        |
| `lint`          | Lint with Biome (`biome lint .`)                      |
| `lint:fix`      | Lint and auto-fix                                     |
| `format`        | Format code with Biome                                |
| `format:check`  | Check formatting without writing                      |
| `check`         | Run Biome lint + format check                         |
| `check:fix`     | Run Biome lint + format fix                           |
| `release`       | Build standalone binaries for distribution            |

### Releasing

Bump the version, tag, and push — all in one command:

```bash
./scripts/release.sh 0.2.0
```

This updates `package.json`, commits the version bump, creates an annotated `v0.2.0` tag,
and pushes to origin. Pushing the tag triggers the release workflow (build → GitHub Release →
Homebrew tap update).

### Tech Stack

| Library          | Purpose                                          |
| ---------------- | ------------------------------------------------ |
| [Bun](https://bun.sh)           | Runtime, bundler, test runner    |
| [citty](https://github.com/unjs/citty)         | CLI argument parsing and command routing         |
| [ky](https://github.com/sindresorhus/ky)           | HTTP client for Kener v4 REST API                |
| [zod](https://zod.dev)          | Schema declaration and validation                |
| [js-yaml](https://github.com/nodeca/js-yaml)      | YAML parsing and serialization                   |
| [consola](https://github.com/unjs/consola)       | Structured console logging                       |
| [chalk](https://github.com/chalk/chalk)         | Terminal string styling                          |
| [cli-table3](https://github.com/cli-table/cli-table3)    | Terminal table rendering                         |
| [fast-deep-equal](https://github.com/epoberezkin/fast-deep-equal) | Deep equality for diff detection              |
| [Biome](https://biomejs.dev)        | Linting and formatting                           |

### Project Structure

```
src/
├── cli/              # Command routing & argument parsing (citty)
├── config/           # Context-aware config loader & schema
├── manifest/         # YAML state file parsing & Zod schemas
├── api/              # Typed Kener REST client (ky)
├── reconciler/       # Core diff + apply logic
├── output/           # Human-readable output (consola + chalk)
└── util/             # YAML wrapper, hashing, error helpers
```

---

## Links

- [Kener Documentation](https://kener.ing)
- [GitHub Issues](https://github.com/Supporterino/kener-ctl/issues)
- [Example Manifests](./examples)

## License

kener-ctl is licensed under the [GNU General Public License v3.0](./LICENSE).
