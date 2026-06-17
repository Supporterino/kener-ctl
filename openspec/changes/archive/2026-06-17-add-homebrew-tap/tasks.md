## 1. Tap Repository Setup

- [x] 1.1 Create the `supporterino/homebrew-kener-ctl` repository on GitHub with a `README.md`
- [x] 1.2 Add initial `Formula/kener-ctl.rb` with correct structure, placeholder version/URLs/SHAs
- [x] 1.3 Add `README.md` to tap repo with usage instructions (`brew tap supporterino/kener-ctl && brew install kener-ctl`)

## 2. Release Bump Script

- [x] 2.1 Create `scripts/release.sh` that accepts a semver version argument
- [x] 2.2 Validate version format (must match `x.y.z`) and fail with usage message on invalid/missing input
- [x] 2.3 Update `version` field in `package.json` using `jq` or `sed`
- [x] 2.4 Create git commit with message `chore: bump version to v<version>` and annotated tag `v<version>`
- [x] 2.5 Push commit and tag to origin

## 3. Release Workflow — Tap Update Job

- [x] 3.1 Add `update-tap` job to `.github/workflows/release.yml` that runs after the `release` job
- [x] 3.2 In the job, download both macOS binaries (`darwin-arm64`, `darwin-x64`) from the just-created GitHub Release
- [x] 3.3 Compute SHA256 checksums for both binaries
- [x] 3.4 Clone `supporterino/homebrew-kener-ctl`, generate `Formula/kener-ctl.rb` with injected version, URLs, and checksums
- [x] 3.5 Commit and push the updated formula to the tap repository
- [x] 3.6 Authenticate using the `TAP_REPO_TOKEN` repository secret (fine-grained PAT with contents:write on tap repo)

## 4. Documentation

- [x] 4.1 Update main `README.md` with macOS install instructions pointing to the Homebrew tap
- [x] 4.2 Add `scripts/release.sh` usage to README or AGENTS.md

## 5. Testing & Verification

- [x] 5.1 Run `scripts/release.sh` with a test version and verify `package.json` is updated and tag is created (on a test branch or fork)
- [x] 5.2 Build a compiled binary locally and test the formula by installing via `brew install --build-from-source ./Formula/kener-ctl.rb`
- [x] 5.3 Run `brew test kener-ctl` against the locally installed formula
- [x] 5.4 Run `brew audit --strict Formula/kener-ctl.rb` and fix any warnings
- [ ] 5.5 Push a test tag and verify the full release workflow (build → release → tap-update) completes successfully
