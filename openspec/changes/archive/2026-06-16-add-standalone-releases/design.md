## Context

kener-ctl currently builds to `dist/index.js` via `bun build --target bun`, producing a JS file that requires the Bun runtime. There is no release workflow, no standalone binary, and no distribution channel beyond cloning the repo. The build artifact is ~517KB of JavaScript that needs `bun` on the PATH to execute.

The project already uses conventional commits with Gitmoji (per AGENTS.md §4), making automated changelog generation straightforward. The CI workflow (`ci.yml`) handles typecheck/lint/format/test/build but has no release capabilities.

## Goals / Non-Goals

**Goals:**
- Build standalone, self-contained binaries for Linux (x64, arm64), macOS (x64, arm64), and Windows (x64) using `bun build --compile`
- Generate SHA256 checksums for all release artifacts
- Auto-generate changelogs from conventional commit history using git-cliff, configured for Gitmoji support
- Create GitHub Releases with binaries, checksums, and changelog content
- Publish to npm as part of the release workflow
- Provide a `release` script in `package.json` for local binary compilation

**Non-Goals:**
- Homebrew, Snap, Chocolatey, or other package manager distribution
- Docker image publishing
- Automated version bumping or tagging (tagging remains manual)
- Cross-compilation of npm artifacts (npm ships JS, not native binaries)
- GitHub Actions attestation or signing (can be added later)

## Decisions

### 1. Binary compilation: `bun build --compile`

**Choice**: Use `bun build --compile src/cli/index.ts --outfile <binary>` for each platform target.

**Why**: `--compile` bundles the Bun runtime into a single self-contained executable. The project already targets `--target bun` because it uses `Bun.Glob` for file discovery. `--compile` is the natural evolution — users get a single binary with zero dependencies.

**Alternatives considered**:
- `pkg` / `nexe`: Node.js-based, would require switching from Bun APIs
- `deno compile`: Would require porting from Bun to Deno
- Shipping the JS bundle + Bun install script: defeats the purpose of "standalone"

**Note on `--external` flags**: The current build uses `--external node-fetch-native --external giget`. These are transitive dependencies (likely from `ky` or `citty`) and are not directly imported by the project. With `--compile`, everything is bundled — these flags are dropped. If runtime errors surface, they can be addressed by marking the right packages external in the compile step.

### 2. Changelog generation: git-cliff

**Choice**: git-cliff with a `cliff.toml` config.

**Why**: git-cliff is conventional-commit-aware, highly configurable, supports custom commit parsers (for Gitmoji), and has a first-party GitHub Action. It can both generate `CHANGELOG.md` in-repo and produce release notes for GitHub Releases.

**Alternatives considered**:
- **semantic-release**: Fully automated version bumps + npm + GitHub Release. Overkill — we want manual versioning and tagging.
- **GitHub auto-generated release notes**: Free but basic; no Gitmoji support, no grouping by change type
- **Manual `CHANGELOG.md`**: High maintenance burden, error-prone
- **commitlint + conventional-changelog**: More complex setup, no built-in Gitmoji support

**Config approach** (`cliff.toml`):
- Parse conventional commit types (`feat`, `fix`, `refactor`, `docs`, `chore`, etc.)
- Map Gitmoji prefixes to human-readable group names (e.g., `:sparkles: feat` → "✨ Features")
- Group commits under sections: Features, Bug Fixes, Refactoring, Documentation, Miscellaneous
- Output format: Keep release notes (for GitHub Release body) and optionally write `CHANGELOG.md`

### 3. Platform targets

**Choice**: Build for 5 targets on every release.

| Target | `bun build --compile` flag | Output name |
|--------|---------------------------|-------------|
| linux-x64 | `--target=bun-linux-x64` | `kener-ctl-linux-x64` |
| linux-arm64 | `--target=bun-linux-arm64` | `kener-ctl-linux-arm64` |
| darwin-x64 | `--target=bun-darwin-x64` | `kener-ctl-darwin-x64` |
| darwin-arm64 | `--target=bun-darwin-arm64` | `kener-ctl-darwin-arm64` |
| win-x64 | `--target=bun-windows-x64` | `kener-ctl-win-x64.exe` |

**Why all 5**: Linux x64 covers GitHub Actions runners and most servers. Linux arm64 covers AWS Graviton and Raspberry Pi. macOS x64 covers Intel Macs. macOS arm64 covers Apple Silicon. Windows x64 covers Windows users who want to use the CLI natively.

**Cross-compilation**: Bun supports cross-compilation natively — all targets can be built from an `ubuntu-latest` runner using `--target` flags. No need for platform-specific runners.

### 4. Release trigger

**Choice**: Tag push matching `v*` (e.g., `v0.1.0`).

**Why**: Standard convention. Tags provide explicit version markers. The workflow extracts the version from the tag ref (strips `v` prefix). No automatic version bumping — the developer tags manually after deciding the version.

**Workflow structure**: Single workflow with two jobs:
1. **build** (matrix): Builds all 5 binaries in parallel, uploads as artifacts
2. **release** (after build): Downloads artifacts, generates checksums + changelog, creates GitHub Release, publishes to npm

### 5. npm publishing

**Choice**: Publish the JS build (same as current `dist/index.js`) to npm as part of the release workflow, using `NPM_TOKEN` secret.

**Why**: The npm package provides an alternative distribution channel for users who already have Bun. The `package.json` `bin` field already points to the JS output. We don't ship compiled binaries via npm (they're platform-specific, and npm doesn't handle that elegantly without `optionalDependencies` tricks).

**npm vs GitHub Release**:
- `npm install -g kener-ctl` → JS bundle, needs Bun
- GitHub Release download → standalone binary, no dependencies

### 6. `release` script in package.json

**Choice**: Add a `release` script that compiles for the local platform only.

```json
"release": "bun build --compile src/cli/index.ts --outfile dist/kener-ctl"
```

**Why**: Useful for local testing. Developers can run `bun run release` to produce a standalone binary for their current OS/arch and test it. The CI matrix does the full cross-platform build.

## Risks / Trade-offs

**[Risk] `--compile` may fail on transitive dependencies** → Mitigation: Run a test on the compiled binary in CI before uploading artifacts. If compilation fails, investigate and add `--external` flags as needed.

**[Risk] git-cliff not available in GitHub Actions** → Mitigation: Use the official `orhun/git-cliff-action` GitHub Action which downloads git-cliff automatically. Alternatively, install via `cargo install` or pre-built binary.

**[Risk] npm publish may fail if version already exists** → Mitigation: Check if the version is already published before attempting `npm publish`. If so, skip with a warning rather than failing the workflow.

**[Risk] Windows binary may have runtime issues** → Mitigation: Windows is the only platform we can't test in CI (ubuntu runner). Flag it clearly in release notes. Bun's Windows support is production since v1.1.

**[Risk] Large binaries (~50-70MB each due to embedded Bun runtime)** → Mitigation: This is inherent to `--compile`. Acceptable trade-off for zero-dependency distribution. Binary size is comparable to Deno-compiled tools.

## Open Questions

_None._ All design decisions are resolved above.
