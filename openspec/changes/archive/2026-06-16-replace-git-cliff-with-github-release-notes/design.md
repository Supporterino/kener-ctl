## Context

The release workflow currently uses `orhun/git-cliff-action@v4` to generate a `CHANGELOG.md` from conventional commits, then passes it to `softprops/action-gh-release@v2` via `body_path`. This action writes the changelog to `$GITHUB_OUTPUT`, causing a workflow command injection error when the formatted markdown is parsed by the Actions runner.

GitHub has built-in release notes generation via the API's `generate_release_notes` parameter, which `softprops/action-gh-release@v2` supports natively.

## Goals / Non-Goals

**Goals:**
- Eliminate the CI error by removing git-cliff-action from the pipeline
- Use GitHub's native release notes generation instead
- Remove all git-cliff related files from the repository

**Non-Goals:**
- Preserving Gitmoji grouping in release notes (GitHub auto-gen groups by PR/label)
- Maintaining a separate `CHANGELOG.md` file in the repository
- Changing any other aspect of the release pipeline

## Decisions

**Choice: `generate_release_notes: true` on `softprops/action-gh-release@v2`**

The action passes this flag directly to the GitHub Releases API, which auto-generates release notes from merged pull requests and direct commits since the previous tag. No external dependency, no parsing risk.

**Alternative considered: Fix git-cliff-action**
- Could run `git-cliff` directly via curl+tar instead of the action wrapper
- Rejected: adds a binary download step to CI, pins a version, and still requires `cliff.toml` maintenance

**Alternative considered: Keep cliff.toml with direct binary**
- Would fix the injection error but retains configuration debt
- Rejected: simplicity wins; the Gitmoji grouping is nice but not essential

## Risks / Trade-offs

- **[Risk] Release notes lose Gitmoji grouping** → Mitigation: GitHub's auto-generated notes are functional and used by thousands of projects. The trade-off is cosmetic grouping vs. zero-maintenance reliability.
- **[Risk] No in-repo changelog** → Mitigation: GitHub Releases serve as the canonical changelog. If an in-repo `CHANGELOG.md` is needed later, it can be generated from the Releases API.
