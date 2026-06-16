## Context

kener-ctl is a CLI tool at v0.1.0 with a complete MVP: 6 resource kinds, 7 CLI commands, multi-context config, reconcile engine with dependency-aware ordering, and a state file mapping local names to remote IDs. It ships standalone binaries to 5 platforms via GitHub Releases and publishes to npm.

The project has zero user-facing documentation. The only docs are `AGENTS.md` (AI agent guidelines, not user docs) and 21 example YAML manifests in `examples/` with no narrative. The `docs/` directory is empty. The archived OpenSpec proposals exist but are implementation notes, not user guides.

A comprehensive README is the standard entry point for open-source CLI tools. It serves as:
- A sales pitch ("should I use this?")
- An onboarding guide ("how do I try this in 5 minutes?")
- A reference doc ("what flags does `apply` take?")

## Goals / Non-Goals

**Goals:**
- Provide a single, complete document that covers everything a user or contributor needs
- Enable a new user to go from zero to a running status page in under 5 minutes
- Document all 6 resource kinds with minimal copy-pasteable examples
- Document all 7 CLI commands with key flags
- Document configuration, state file, exit codes, and workflow patterns
- Include development setup instructions for contributors
- Address identified gaps: installation methods, Kener v4 compatibility statement, npm package info

**Non-Goals:**
- Separate documentation site or wiki
- API reference beyond what Kener already publishes
- Tutorial or video content
- Migration guide (v0.1.0, no legacy users)
- Replacing or removing AGENTS.md
- CI changes or any source code modifications

## Decisions

### 1. One file, not scattered docs

**Choice**: Single `README.md` at repo root, comprehensive but well-organized with a table of contents.

**Why**: A README is what GitHub renders on the repo homepage. It's the first thing visitors see. Fragmenting into multiple docs under `docs/` reduces discoverability and increases maintenance burden. For a v0.1.0 CLI tool, a thorough README is the right scope.

**Alternatives**: GitHub Wiki (separate maintenance, no version control alongside code), docs site via VitePress/Docusaurus (overkill for v0.1.0), multiple files under `docs/` (less discoverable than README).

### 2. Three installation methods

**Choice**: Document standalone binary, npm, and source install. Order them by friction: (1) standalone binary, (2) npm, (3) source.

**Why**: The standalone binary (via GitHub Releases) is the lowest-friction option — download and run, no runtime needed. npm comes second for users with Bun/Node. Source install is for contributors.

**Gap addressed**: The project has a release workflow but no documentation of how to download binaries. We'll include `curl`/`wget` one-liners pointing to the latest GitHub Release.

**Gap addressed**: npm publishing exists in the release workflow but isn't mentioned anywhere user-facing. We'll document `npm install -g kener-ctl`.

### 3. Kener v4 compatibility statement

**Choice**: Add an explicit statement early in the README: "Requires Kener v4 or later" and link to kener.ing.

**Why**: Kener has had multiple major versions. Users need to know this targets v4's REST API (`/api/v4/…`). Avoids confusion and support burden.

**Gap addressed**: No compatibility guarantee was documented anywhere.

### 4. Quick Start as golden path

**Choice**: A 4-step quick start that users can copy-paste: (1) create config, (2) write one monitor manifest, (3) `apply`, (4) verify on the Kener status page.

**Why**: The first user experience should be under 5 minutes. Each code block should be executable with minimal or no modification. Use a simple API monitor as the first resource — it's the most common use case.

### 5. Resource manifest reference — table + examples

**Choice**: A reference table showing all 6 kinds with identity keys and reconcile strategy, followed by one minimal, copy-pasteable YAML example per kind. Point to `examples/` for full variants.

**Why**: The reference table gives power users a quick lookup. The minimal examples give first-timers a starting point. The pointer to `examples/` avoids bloating the README with 21 full manifests.

### 6. README structure order

**Choice**: Reader-centered ordering — what they need first:

| Position | Section | Why here |
|----------|---------|----------|
| Top | Title, badges, elevator pitch | First impression, trust signals |
| 1 | Installation | Users want to install before reading docs |
| 2 | Quick Start | Prove value in 5 minutes |
| 3 | Configuration | They need to set up next |
| 4 | Resource Manifests | Core concept — what they'll write |
| 5 | CLI Reference | How to use the tool |
| 6 | State File | Implementation detail, some users won't need it |
| 7 | Workflow Patterns | Power users, not first-timers |
| 8 | Exit Codes | CI/scripting reference |
| 9 | Development | Contributors only |
| Bottom | Links | Escape hatch to more info |

### 7. Badges

**Choice**: CI status badge (from GitHub Actions) and license badge. Optionally: npm version, GitHub release.

**Why**: Badges are trust signals. CI badge shows the project is maintained. License badge clarifies legal terms. Keep it minimal — badge walls look cluttered.

## Risks / Trade-offs

**[Risk] README becomes stale as features are added** → Mitigation: The README is a snapshot of v0.1.0. Future feature changes should be documented in their respective OpenSpec proposals. As a lightweight countermeasure, include a note that docs reflect the latest release.

**[Risk] README duplicates information from AGENTS.md** → Mitigation: The README is user-facing; AGENTS.md is AI-agent-facing. They serve different audiences. Overlap is acceptable where it serves the reader (e.g., tech stack, scripts) but avoid copying architectural details that only an AI agent needs.

**[Risk] Quick Start code blocks become stale if the API or CLI changes** → Mitigation: Use minimal, stable examples (simple API monitor). Changes to the manifest schema or CLI flags should be caught by CI tests. If schema changes, update examples in both `examples/` and the README as part of that change's tasks.

## Open Questions

_None._ All decisions are resolved above.
