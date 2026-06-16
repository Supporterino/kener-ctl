## Why

kener-ctl has no README. The repository lacks a first-impression document that tells visitors what the tool is, why they'd use it, and how to get started in under 5 minutes. All documentation lives scattered across `AGENTS.md` (AI-agent-oriented), `examples/` (reference YAML files with no narrative), and archived OpenSpec proposals (implementation notes, not user docs). The `docs/` directory is empty. A comprehensive README is the single most impactful piece of documentation for adoption and discoverability — it serves as the project homepage, onboarding guide, and quick-reference combined.

## What Changes

- Create `README.md` at the repository root with these sections:
  - **Title + badges + elevator pitch** — what kener-ctl is in one sentence, badges for CI/tests, license
  - **Installation** — 3 methods: standalone binary (via GitHub Releases w/ curl/wget), npm (`npm i -g kener-ctl`), source (`git clone` + `bun install`)
  - **Quick Start** — 4-step golden path: (1) configure a context, (2) write one monitor manifest, (3) `kener-ctl apply`, (4) see it on the Kener status page. All code blocks are copy-pasteable.
  - **Configuration Reference** — XDG file path, annotated YAML example showing all fields (contexts, current-context, defaults), override methods (--context flag, KENER_CONTEXT env var)
  - **Resource Manifests** — concept overview (YAML files in stateDir, one resource per file), reference table of all 6 kinds with identity keys and reconcile strategy, one minimal example per kind, dependency ordering explanation
  - **CLI Reference** — table of all commands (apply, plan, validate, pull, get, delete, config) with description and key flags, global flags reference
  - **State File** — what it is, why some resources need it, where it lives, that it's auto-managed
  - **Workflow Patterns** — GitOps, drift detection, multi-environment, onboarding from existing instance
  - **Exit Codes** — table of codes 0/1/2 with meanings
  - **Development** — prerequisites (Bun ≥ 1.1), setup (`bun install`), scripts table (dev, build, test, typecheck, lint, format, check, release), tech stack reference, project structure overview
  - **Links** — Kener docs, GitHub issues
- Add compatibility statement: targets Kener v4 REST API only
- Document that standalone binaries are published via GitHub Releases and npm
- No changes to source code, tests, CI, or configuration

## Capabilities

### New Capabilities

- `project-readme`: A comprehensive, user-facing README.md that serves as the project's primary documentation, covering installation, quick start, configuration, resource manifests, CLI reference, workflow patterns, and development setup.

### Modified Capabilities

_None._ This is purely additive documentation. No existing spec requirements change.

## Impact

- **New files**: `README.md` at repository root
- **Modified files**: _None_
- **Source code**: No changes to `src/` or `tests/`
- **CI**: Existing `ci.yml` is unaffected; no CI changes needed
- **Dependencies**: No new project dependencies

## Non-goals

- Separate documentation site or wiki (README is sufficient for now)
- API reference or OpenAPI spec documentation (Kener has its own docs)
- Tutorial or video content
- Migration guide (tool is v0.1.0, no legacy users)
- Replacing or removing AGENTS.md (serves a different audience)
