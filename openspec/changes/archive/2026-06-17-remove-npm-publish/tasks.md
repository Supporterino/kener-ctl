## 1. Release workflow

- [x] 1.1 Remove npm publish steps from `.github/workflows/release.yml`: "build js for npm", "setup-node", "check npm version", and "publish to npm" (lines 96-117)
- [x] 1.2 Remove `id-token: write` permission from the workflow (only needed for npm provenance)

## 2. package.json

- [x] 2.1 Remove `bin` field from `package.json`

## 3. README

- [x] 3.1 Remove the "npm" installation subsection from the Installation section in `README.md` (lines 71-77, heading + code block + note)
- [x] 3.2 Update the "From Source" subsection to replace `bun link` / `kener-ctl --help` with `bun run dist/cli/index.js`
- [x] 3.3 Update the Development section's Scripts table to say "package.json scripts" instead of "npm scripts"

## 4. Specs sync

- [x] 4.1 Sync delta spec `standalone-releases` to main spec: remove "npm publishing" requirement and its scenarios from `openspec/specs/standalone-releases/spec.md`
- [x] 4.2 Sync delta spec `project-readme` to main spec: update "three installation methods" to two, update "npm scripts" to "package.json scripts" in `openspec/specs/project-readme/spec.md`

## 5. Verification

- [x] 5.1 Run `bun run typecheck` — no errors
- [x] 5.2 Run `bun run lint` — no errors
- [x] 5.3 Run `bun test` — all tests pass (no functional changes, but CI integrity check)
- [x] 5.4 Run `bun run build` — `dist/cli/index.js` still produced successfully
- [x] 5.5 Visually verify the release workflow YAML is valid and contains no npm references
