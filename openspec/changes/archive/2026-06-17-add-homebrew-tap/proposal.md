## Why

macOS users currently must manually download a binary from GitHub Releases and move it into their PATH. A Homebrew tap gives them a one-command install (`brew tap supporterino/kener-ctl && brew install kener-ctl`) with automatic updates via `brew upgrade`. This is the expected distribution channel for macOS CLI tools.

## What Changes

- Create a `supporterino/homebrew-kener-ctl` tap repository containing `Formula/kener-ctl.rb`
- Add an automated tap-update job to the release workflow that pushes updated formula on every version tag
- Add a `scripts/release.sh` script that bumps the version in `package.json`, commits, tags, and pushes — so releasing is a single command
- Document macOS install instructions in the README

## Capabilities

### New Capabilities

- `homebrew-tap`: Distribution of kener-ctl via a Homebrew tap with a per-architecture macOS formula and automated updates on new releases

### Modified Capabilities

- `standalone-releases`: The release workflow gains a tap-update job that clones the tap repo, computes SHA256 checksums for macOS binaries, generates the formula, and pushes. A release bump script is added under `scripts/`.

## Impact

- `.github/workflows/release.yml` — new `update-tap` job (runs after `release`)
- `scripts/release.sh` — new release bump-and-tag script
- `supporterino/homebrew-kener-ctl` — new tap repository (Formula, README)
- `README.md` — add macOS Homebrew install instructions
- Repository secrets — requires `TAP_REPO_TOKEN` (PAT with contents:write on the tap repo)

## Non-goals

- Linux Homebrew support (the formula is macOS-only since Kener is a server, not a desktop tool, and Linux users have direct binary downloads)
- Bottle builds (binary bottles would require compiling from source on macOS runners; the formula installs pre-built binaries directly)
- Homebrew core inclusion (tap-based distribution is simpler and sufficient for a niche tool)
