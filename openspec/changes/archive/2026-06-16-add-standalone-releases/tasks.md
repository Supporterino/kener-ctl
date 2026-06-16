## 1. Changelog configuration

- [x] 1.1 Create `cliff.toml` at repo root with conventional-commit groups and Gitmoji mappings (✨ Features, 🐛 Bug Fixes, 🚜 Refactoring, 📝 Documentation, 🧹 Chores)
- [x] 1.2 Add initial `CHANGELOG.md` by running git-cliff locally to generate it from existing commit history

## 2. Package scripts

- [x] 2.1 Add `release` script to `package.json`: `bun build --compile src/cli/index.ts --outfile dist/kener-ctl`
- [x] 2.2 Verify `bun run release` produces a working standalone binary on the local platform

## 3. Release workflow

- [x] 3.1 Create `.github/workflows/release.yml` triggered on tag push matching `v*`
- [x] 3.2 Add `build` job with matrix strategy for 5 platform targets (`linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `win-x64`), running `bun install --frozen-lockfile`, `bun test`, and `bun build --compile` for each target
- [x] 3.3 Add `release` job (depends on `build`) that downloads all artifacts, generates `checksums.txt` via `sha256sum`, runs git-cliff to produce changelog, creates GitHub Release with `softprops/action-gh-release`, and publishes to npm with `NPM_TOKEN` secret
- [x] 3.4 Add npm publish guard: skip with warning if version already exists on npm

## 4. Verification

- [x] 4.1 Run `bun run check` and `bun test` to ensure no regressions
- [ ] 4.2 Manually trigger the release workflow via `workflow_dispatch` after merge to verify the pipeline end-to-end
