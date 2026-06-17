## MODIFIED Requirements

### Requirement: README documents all two installation methods
The README SHALL describe two installation methods in order of decreasing convenience: (1) standalone binary via GitHub Releases with curl/wget one-liners, (2) from source (`git clone` + `bun install` + `bun run build`). Each method SHALL include a copy-pasteable command block.

#### Scenario: User installs via standalone binary
- **WHEN** a user follows the standalone binary instructions
- **THEN** they download a platform-appropriate binary (linux-x64, linux-arm64, darwin-x64, darwin-arm64, win-x64) from GitHub Releases and can run `kener-ctl --help`

#### Scenario: User installs from source
- **WHEN** a user clones the repo and runs `bun install && bun run build`
- **THEN** the `dist/cli/index.js` artifact is produced and can be run with `bun run dist/cli/index.js`

### Requirement: README documents development setup
The README SHALL include a Development section with prerequisites (Bun ≥ 1.1), setup instructions (`bun install`), a table of all package.json scripts (dev, build, test, typecheck, lint, format, check, release), a list of key tech stack libraries, and a brief project structure overview (src/ directories and their purposes).

#### Scenario: Contributor sets up development environment
- **WHEN** a contributor follows the Development section
- **THEN** they can clone, install, build, and run tests within 5 minutes
