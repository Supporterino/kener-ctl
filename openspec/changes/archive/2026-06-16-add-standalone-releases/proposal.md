## Why

kener-ctl currently requires users to install Bun and run `bun install` to use the tool. This friction limits adoption, especially for ops teams who want a single binary they can drop into CI, Docker, or their PATH. We need standalone binaries for Linux, macOS, and Windows distributed via GitHub Releases and npm — the standard distribution pattern for modern CLI tools.

## What Changes

- Add a `.github/workflows/release.yml` workflow that triggers on git tag pushes (`v*`) to build platform-specific standalone binaries using `bun build --compile`
- Build binaries for 5 targets: `linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `win-x64`
- Integrate **git-cliff** with a `cliff.toml` config to auto-generate changelogs from conventional commits (with Gitmoji support)
- Generate SHA256 checksums for all release artifacts
- Create GitHub Releases with the changelog as body and binaries + checksums as assets
- Publish to npm as part of the release workflow (the npm package ships the JS build, not the compiled binary)
- Add a `release` script to `package.json` for local standalone binary builds

## Capabilities

### New Capabilities

- `standalone-releases`: Build, sign, and publish standalone platform binaries to GitHub Releases and npm, with automated changelog generation from conventional commits.

### Modified Capabilities

_None._ This is purely additive build/release infrastructure. No existing spec requirements change.

## Impact

- **New files**: `.github/workflows/release.yml`, `cliff.toml`, `CHANGELOG.md`
- **Modified files**: `package.json` (add `release` script)
- **Dependencies**: git-cliff (installed in CI, not a project dependency), `softprops/action-gh-release` GitHub Action
- **CI**: Existing `ci.yml` is unaffected; `release.yml` is additive
- **Source code**: No changes to `src/` or `tests/`

## Non-goals

- Homebrew tap or other package manager distribution (can be added later)
- Docker image publishing (separate concern)
- Automated version bumping (tagging remains manual)
- Cross-compilation of npm packages (npm ships JS, not native binaries)
