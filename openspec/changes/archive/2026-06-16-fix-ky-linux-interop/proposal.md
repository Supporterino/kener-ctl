## Why

CI fails on Linux (ubuntu-latest) with `SyntaxError: Missing 'default' export in module '.../ky/distribution/index.js'` when test files transitively import `src/api/client.ts` as a value import. This is a Bun-on-Linux ESM interop issue with `ky`'s default export. Tests pass locally on macOS, blocking CI from being a reliable signal. Fix it now because CI is the project's primary quality gate.

## What Changes

- Add a Bun test preload file (`tests/setup.ts`) that registers a centralized `mock.module("ky", ...)` for all test files.
- Add `bunfig.toml` with `[test] preload = "./tests/setup.ts"` so the mock runs before any test module loads.
- Remove the redundant `mock.module("ky", ...)` in `tests/api/monitors.test.ts` (dead code — that test uses type-only imports and never loads ky).

## Capabilities

### New Capabilities

None. This is a test infrastructure fix with no user-facing behavioral change.

### Modified Capabilities

None. No spec-level requirements are changing.

## Impact

- **Affected files**: `tests/setup.ts` (new), `bunfig.toml` (new), `tests/api/monitors.test.ts` (cleanup)
- **No production code changes**: `src/` is untouched
- **No API or schema changes**
- **CI**: All tests should pass on Linux after this fix
