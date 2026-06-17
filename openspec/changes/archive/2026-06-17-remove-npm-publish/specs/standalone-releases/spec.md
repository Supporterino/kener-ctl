## REMOVED Requirements

### Requirement: npm publishing
**Reason**: kener-ctl is distributed as standalone compiled binaries via GitHub Releases. The npm package was a second-class distribution channel that required Bun to be installed anyway, adding maintenance burden (CI steps, provenance tokens, version collision guards) with no meaningful user base.
**Migration**: Users who installed via npm should switch to the standalone binary. Download the platform-appropriate binary from https://github.com/Supporterino/kener-ctl/releases/latest.
