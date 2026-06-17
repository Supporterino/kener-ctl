# Homebrew Tap

## Purpose

This capability defines how kener-ctl is distributed to macOS users via a Homebrew tap, enabling one-command installation and updates.

## Requirements

### Requirement: Homebrew tap repository
The system SHALL maintain a public tap repository at `https://github.com/supporterino/homebrew-kener-ctl` containing a Ruby formula for installing kener-ctl on macOS.

#### Scenario: Tap repository exists
- **WHEN** a user visits `https://github.com/supporterino/homebrew-kener-ctl`
- **THEN** the repository contains at minimum a `Formula/kener-ctl.rb` file and a `README.md`

#### Scenario: Tap repository is public
- **WHEN** the repository is accessed without authentication
- **THEN** its contents are readable

### Requirement: Formula installs macOS binary
The formula SHALL download the pre-compiled `kener-ctl` binary from the corresponding GitHub Release and install it into the Homebrew prefix.

#### Scenario: Install on Apple Silicon
- **WHEN** `brew install kener-ctl` is run on an Apple Silicon Mac
- **THEN** the formula downloads `kener-ctl-darwin-arm64` from `https://github.com/supporterino/kener-ctl/releases/download/v<version>/kener-ctl-darwin-arm64`

#### Scenario: Install on Intel Mac
- **WHEN** `brew install kener-ctl` is run on an Intel Mac
- **THEN** the formula downloads `kener-ctl-darwin-x64` from `https://github.com/supporterino/kener-ctl/releases/download/v<version>/kener-ctl-darwin-x64`

#### Scenario: Binary is installed as kener-ctl
- **WHEN** the formula installs the downloaded binary
- **THEN** it is placed at `<prefix>/bin/kener-ctl` and is executable

### Requirement: Formula validates installation
The formula SHALL include a test block that verifies the installed binary works.

#### Scenario: Test block runs successfully
- **WHEN** `brew test kener-ctl` is run after installation
- **THEN** the test executes `kener-ctl --version` and asserts it outputs the installed version

### Requirement: Formula integrity is verified
The formula SHALL include SHA256 checksums for both macOS binary variants, computed from the actual release assets.

#### Scenario: Checksum matches release binary
- **WHEN** Homebrew downloads the binary during installation
- **THEN** the downloaded file's SHA256 matches the checksum in the formula, or the install fails

### Requirement: Formula is updated on every release
The system SHALL automatically update the formula in the tap repository whenever a new version tag is pushed to the main repository.

#### Scenario: Formula updated after release
- **WHEN** a git tag matching `v*` is pushed and the release workflow completes
- **THEN** the `update-tap` job clones `supporterino/homebrew-kener-ctl`, writes an updated `Formula/kener-ctl.rb` with the new version, download URLs, and SHA256 checksums, and pushes the commit to the tap repository

#### Scenario: Formula version matches release tag
- **WHEN** the `update-tap` job generates the formula for tag `v0.2.0`
- **THEN** the formula's `version` field is `"0.2.0"` and the download URLs reference `https://github.com/supporterino/kener-ctl/releases/download/v0.2.0/`

### Requirement: Tap does not support non-macOS platforms
The formula SHALL be scoped to macOS only.

#### Scenario: Install on Linux fails with clear message
- **WHEN** `brew install kener-ctl` is attempted on Linux via the tap
- **THEN** Homebrew reports that the formula is not available for the current platform
