## Context

kener-ctl distributes standalone compiled binaries for 5 platforms via GitHub Releases. The `release.yml` workflow also publishes a JS bundle to npm — a leftover from early development when Bun compilation wasn't the primary distribution strategy. The npm package requires Bun to be installed, so it offers no advantage over the standalone binary and adds friction: CI needs Node setup, npm provenance tokens, and version collision guards.

The `bin` field in `package.json` exists only to support npm linkage. With npm publishing removed, it serves no purpose. The `bun link` command in the README's "From Source" section can be replaced with `bun run dist/cli/index.js`, which doesn't depend on the `bin` field.

## Goals / Non-Goals

**Goals:**
- Remove all npm publishing infrastructure from the release workflow
- Remove the `bin` field from `package.json`
- Update README to remove npm installation and fix the "From Source" instructions
- Update specs to reflect the removal

**Non-Goals:**
- Changing the GitHub Releases pipeline (standalone binary builds stay)
- Removing the `build` script in `package.json` (still produces `dist/cli/index.js` for source installs)
- Touching archived change artifacts
- Adding any new distribution channels

## Decisions

### 1. Remove `bin` field from package.json

**Choice**: Remove it entirely rather than keeping it "just in case."

**Rationale**: The `bin` field is an npm-specific feature. Without npm publishing, it has no purpose. `bun link` could theoretically use it, but the "From Source" workflow is explicitly for contributors who have the repo cloned — they can use `bun run dist/cli/index.js` directly. Keeping dead config sends a conflicting signal about distribution intent.

**Alternative considered**: Keep `bin` for local dev convenience. Rejected because it's misleading — it implies npm is a supported distribution channel when it isn't.

### 2. Replace `bun link` with `bun run dist/cli/index.js` in README

**Choice**: `bun run dist/cli/index.js` as the "From Source" execution command.

**Rationale**: Simple, explicit, no implicit linkage. Contributors build and run directly. No `bun link` pollution of global bin directories.

**Alternative considered**: Keep `bun link` and add a shebang to the JS output. Rejected — adds complexity for no gain.

### 3. Three merge edits in spec files (non-breaking)

All changes are removals or terminology fixes. No new requirements, no breaking changes to user-facing behavior. The `standalone-releases` spec drops one requirement; the `project-readme` spec drops one installation method and renames "npm scripts" to "package.json scripts."

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Someone has `kener-ctl` installed via npm and expects updates | The npm package was at v0.1.0 with likely zero users. Anyone who installed it can switch to the standalone binary with a one-liner. |
| `bun link` was someone's preferred dev workflow | The new instruction (`bun run dist/cli/index.js`) is one extra word. No loss of capability. |
| The `bin` field removal breaks an unexpected tool | Tested: only `npm link` / `bun link` use it. Both are superseded by direct execution. |
