## Why

kener-ctl is distributed as standalone compiled binaries via GitHub Releases — no runtime required. The npm package (`npm install -g kener-ctl`) is a second-class distribution channel that requires Bun to be installed anyway, defeating the purpose. It adds maintenance burden (CI steps, provenance tokens, version conflict guards) with no meaningful user base. Removing it simplifies the release pipeline and clarifies the project's identity as a binary CLI tool.

## What Changes

- Remove the npm publish steps from the release workflow (`.github/workflows/release.yml`): Node setup, version check, and `npm publish`
- Drop the `id-token: write` permission from the workflow (only needed for npm provenance)
- Remove the `bin` field from `package.json` — it exists only for npm linkage
- Remove the "npm" installation section from `README.md` and update the "From Source" section to use `bun run dist/cli/index.js` instead of `bun link`
- Update the `project-readme` spec to reflect two installation methods instead of three
- Update the `standalone-releases` spec to remove the npm publishing requirement

## Capabilities

### New Capabilities

None. This is purely a removal.

### Modified Capabilities

- `standalone-releases`: Remove the "npm publishing" requirement and its scenarios. Update the purpose line to no longer mention npm.
- `project-readme`: Remove npm as an installation method. Update "three installation methods" to two (standalone binary, from source). Replace "npm scripts" terminology with "package.json scripts" or "scripts."

## Impact

- `.github/workflows/release.yml` — ~20 lines removed (4 steps + permissions change)
- `package.json` — `bin` field removed (3 lines)
- `README.md` — npm install section removed (~7 lines), `bun link` replaced with `bun run dist/cli/index.js` (~2 lines)
- `openspec/specs/standalone-releases/spec.md` — npm publishing requirement and scenarios removed (~11 lines), purpose line updated
- `openspec/specs/project-readme/spec.md` — npm installation references removed, "npm scripts" terminology updated

## Non-goals

- Removing any other distribution channels (GitHub Releases, source builds remain)
- Changing the local `release` script in `package.json` (it builds standalone binaries — unrelated to npm)
- Removing archived change artifacts — they are historical records
- Removing the `dist/cli/index.js` build output — it remains useful for `bun run dist/cli/index.js`
