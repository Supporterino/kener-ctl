## 1. Remove git-cliff from release workflow

- [x] 1.1 Replace `orhun/git-cliff-action@v4` step in `.github/workflows/release.yml` with `generate_release_notes: true` on `softprops/action-gh-release@v2`
- [x] 1.2 Remove `body_path: CHANGELOG.md` from the release step
- [x] 1.3 Remove `config: cliff.toml` and `args: --latest --strip header` inputs

## 2. Clean up git-cliff artifacts

- [x] 2.1 Delete `cliff.toml` from repository root
- [x] 2.2 Delete `CHANGELOG.md` from repository root

## 3. Sync specs

- [x] 3.1 Copy delta spec from `openspec/changes/replace-git-cliff-with-github-release-notes/specs/standalone-releases/spec.md` to `openspec/specs/standalone-releases/spec.md`, replacing the "Automated changelog generation" and "GitHub Release publishing" requirements with the MODIFIED versions

## 4. Verify

- [x] 4.1 Run `bun run typecheck` to ensure no regressions
- [x] 4.2 Run `bun test` to ensure all tests pass
- [x] 4.3 Run `bun run build` to ensure build succeeds
