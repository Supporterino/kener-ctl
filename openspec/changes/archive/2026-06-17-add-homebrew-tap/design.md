## Context

kener-ctl already compiles standalone binaries for 5 platforms and publishes them as GitHub Releases via `.github/workflows/release.yml`. The release is triggered by pushing a `v*` tag and uses `softprops/action-gh-release@v2` to create a GitHub Release with all binaries and a `checksums.txt`.

Currently, macOS users must manually download the `kener-ctl-darwin-*` binary from the release page and place it in their PATH. There is no version bump script — the developer must manually update `package.json`, commit, tag, and push.

## Goals / Non-Goals

**Goals:**
- Provide a Homebrew tap at `supporterino/homebrew-kener-ctl` so macOS users can `brew install kener-ctl`
- Automate formula updates on every version tag push so the tap stays in sync with releases
- Provide a `scripts/release.sh` script that bumps the version in `package.json`, commits, creates a tag, and pushes — making releases a single command

**Non-Goals:**
- Bottle builds (the formula installs pre-built binaries directly)
- Homebrew core inclusion
- Linux or Windows package managers

## Decisions

### Decision 1: Tap repo location — `supporterino/homebrew-kener-ctl`

**Rationale:** The user owns the personal account. Homebrew convention is `homebrew-<tool>` for the repo name. Users install with `brew tap supporterino/kener-ctl`.

**Alternative considered:** GitHub organization account — rejected because no org exists for this project.

### Decision 2: Formula installs raw binary, not a tarball

The formula downloads the raw `bun --compile` binary directly from the GitHub Release URL, preserving the filename. The `install` block uses `Dir["kener-ctl-*"].first` to rename it to `kener-ctl` regardless of architecture.

```ruby
on_macos do
  if Hardware::CPU.arm?
    url "https://github.com/supporterino/kener-ctl/releases/download/v#{version}/kener-ctl-darwin-arm64"
    sha256 "<computed>"
  else
    url "https://github.com/supporterino/kener-ctl/releases/download/v#{version}/kener-ctl-darwin-x64"
    sha256 "<computed>"
  end
end

def install
  bin.install Dir["kener-ctl-*"].first => "kener-ctl"
end
```

**Rationale:** `bun --compile` produces a single self-contained Mach-O binary (no dependencies). Wrapping it in a tarball adds complexity with no benefit — Homebrew handles raw single-file downloads natively.

**Alternative considered:** Tarball — rejected because it adds a build-step dependency and the binary is already self-contained.

### Decision 3: Formula generation happens in CI, not a template script

The release workflow's `update-tap` job will:
1. Download both macOS binaries from the just-created release (via GitHub API or direct URL)
2. Compute `sha256sum` for each
3. Clone `supporterino/homebrew-kener-ctl`
4. Write `Formula/kener-ctl.rb` with injected version, URLs, and SHAs
5. Commit and push

**Rationale:** No formula template is stored in the kener-ctl repo. The formula is generated fresh each release by the CI job. This avoids version-drift between a stored template and the actual release artifacts. The `Formula/kener-ctl.rb` in the tap repo is the single source of truth.

**Alternative considered:** Store a template in `kener-ctl` repo and use `sed` substitution — rejected because it couples two repos and makes local testing harder.

### Decision 4: Shell-based `update-tap` job (no custom action)

The update job uses a simple shell script within the existing `release.yml`. It leverages the GitHub CLI (`gh`) to download release assets, and standard `git` operations to update the tap.

**Rationale:** Keeps dependencies minimal. The job is ~25 lines of bash. No need for a custom GitHub Action or JavaScript step.

**Alternative considered:** Custom GitHub Action — rejected as overkill for this scope.

### Decision 5: Release bump script — `scripts/release.sh`

The script:
1. Accepts a version argument (semver, e.g., `0.2.0`)
2. Updates the `version` field in `package.json`
3. Commits with message `chore: bump version to v<version>`
4. Creates an annotated tag `v<version>`
5. Pushes the commit and tag

```bash
#!/usr/bin/env bash
set -euo pipefail
VERSION="${1:?Usage: scripts/release.sh <version>}"
# bump package.json version
# git commit, tag, push
```

**Rationale:** Single-command release reduces manual steps and errors. Tag push triggers the existing release workflow.

### Decision 6: Authentication via repository secret

The `update-tap` job uses a fine-grained PAT stored as `TAP_REPO_TOKEN` with `contents: write` scope on `supporterino/homebrew-kener-ctl` only.

**Rationale:** Least-privilege principle. The token can only push to the tap repo, not the main repo or any other resources.

## Risks / Trade-offs

- **[Risk] `brew audit` may fail on a `bun --compile` binary** → **Mitigation:** Test the formula locally against a real compiled binary before merging the workflow. If `brew audit` flags the binary format, we can strip the binary before release or add a `pour_bottle?` override.
- **[Risk] 61MB binary size may trigger Homebrew size warnings** → **Mitigation:** Acceptable for a Go/Bun-compiled tool. Homebrew does not enforce size limits on taps. Users can `brew install` which is a one-time download.
- **[Risk] Tap repo diverges from release if the update job fails silently** → **Mitigation:** The `update-tap` job runs after `release` and fails the workflow if it can't push. A failed release is visible in Actions.
- **[Trade-off] Formula is macOS-only** → By design. Linux users have direct binary downloads. A Homebrew formula for Linux would require `on_linux` blocks and testing, which is out of scope.

## Open Questions

- Should the tap repo have its own CI to test the formula (requires a macOS runner, which is expensive on GitHub Actions)? Defer — manual verification per release is sufficient initially.
