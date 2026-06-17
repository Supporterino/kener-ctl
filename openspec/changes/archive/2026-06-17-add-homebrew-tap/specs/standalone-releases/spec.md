# Standalone Releases (Delta)

## ADDED Requirements

### Requirement: Release bump script
The system SHALL provide a `scripts/release.sh` script that bumps the version across the project and pushes the release tag.

#### Scenario: Bump version in package.json
- **WHEN** `scripts/release.sh 0.2.0` is executed
- **THEN** the `version` field in `package.json` is updated to `"0.2.0"`

#### Scenario: Commit version bump
- **WHEN** the version has been bumped
- **THEN** a git commit is created with message `chore: bump version to v0.2.0`

#### Scenario: Create and push tag
- **WHEN** the commit has been created
- **THEN** an annotated git tag `v0.2.0` is created and pushed along with the commit to the remote

#### Scenario: Missing version argument fails early
- **WHEN** `scripts/release.sh` is executed without a version argument
- **THEN** the script exits with a non-zero code and prints usage instructions

#### Scenario: Invalid version format fails early
- **WHEN** `scripts/release.sh` is executed with a non-semver argument (e.g., `abc`)
- **THEN** the script exits with a non-zero code and prints an error message

### Requirement: Automated tap update on release
The release workflow SHALL include an `update-tap` job that runs after the `release` job and automatically updates the Homebrew tap formula.

#### Scenario: Tap update job runs after release
- **WHEN** the `release` job in `.github/workflows/release.yml` completes successfully
- **THEN** the `update-tap` job starts and clones the tap repository

#### Scenario: macOS binary checksums are computed
- **WHEN** the `update-tap` job runs for version `v0.2.0`
- **THEN** it downloads `kener-ctl-darwin-arm64` and `kener-ctl-darwin-x64` from the GitHub Release and computes their SHA256 checksums

#### Scenario: Formula is generated with correct values
- **WHEN** checksums have been computed
- **THEN** a `Formula/kener-ctl.rb` file is written with the version `"0.2.0"`, the correct download URLs pointing to `releases/download/v0.2.0/`, and the computed SHA256 checksums

#### Scenario: Formula commit is pushed
- **WHEN** the formula has been generated
- **THEN** a commit is created in the tap repository with message `chore: bump to v0.2.0` and pushed to the default branch

#### Scenario: Tap update uses dedicated token
- **WHEN** the `update-tap` job authenticates to the tap repository
- **THEN** it uses the `TAP_REPO_TOKEN` repository secret for git operations

#### Scenario: Tap update failure is visible
- **WHEN** the `update-tap` job fails (e.g., authentication error, network error)
- **THEN** the workflow run is marked as failed and the error is visible in the Actions log
