## Context

Six test files fail on Linux CI with `SyntaxError: Missing 'default' export in module '.../ky/distribution/index.js'`. The root cause is a Bun-on-Linux ESM interop issue: `ky` v1.14.3 exports its main function as `export default ky` (no named export), and Bun on Linux fails to resolve the default export. Bun on macOS handles the same module correctly.

The affected tests all transitively `import { createKenerClient } from "@/api/client"` as a value import. `src/api/client.ts` is the only production file that value-imports `ky` (`import ky from "ky"`). Tests that use type-only imports (`import type { createKenerClient }`) never trigger the `ky` module load and pass consistently.

The existing `mock.module("ky", ...)` in `tests/api/monitors.test.ts` is redundant — that test uses type-only imports and never loads `ky`. It should be removed to avoid confusion.

## Goals / Non-Goals

**Goals:**
- All tests pass on Linux CI
- No changes to production source code (`src/`)
- Single centralized mock definition, not repeated across test files

**Non-Goals:**
- Restructuring how `src/api/client.ts` imports `ky` (e.g., lazy import, factory injection)
- Changing test patterns in individual test files beyond the cleanup
- Fixing the underlying Bun-on-Linux interop bug (that's upstream)
- Adding capability specs (this is test infrastructure, not a user-facing feature)

## Decisions

### 1. Preload file over per-file mock or source changes

| Approach | Verdict |
|---|---|
| `mock.module("ky", ...)` in every failing test's `beforeAll` | Rejected: repetition, fragile if mock shape changes |
| Restructure `client.ts` to avoid static `import ky` | Rejected: changes production code for a test/platform quirk |
| Bun preload file with centralized `mock.module("ky", ...)` | **Chosen** |

A preload file (`tests/setup.ts`) runs before any test module is evaluated. `mock.module("ky", ...)` called there patches Bun's module registry so all subsequent `import ky from "ky"` statements receive the mock. This covers every test file — present and future — without repeating the mock definition.

### 2. `bunfig.toml` for test preload configuration

Bun supports `[test] preload = "./tests/setup.ts"` in `bunfig.toml`. This is preferred over `bun test --preload ./tests/setup.ts` because:
- No changes to CI workflow or `package.json` scripts needed
- Developers running `bun test` locally automatically get the preload
- Standard Bun convention for test setup

### 3. Mock shape

The mock must satisfy what `createKenerClient` calls:

```ts
ky.create({ prefixUrl, headers, retry, timeout, hooks })
//    → returns KyInstance with .get, .post, .patch, .delete, .extend
```

The mock factory returns an object with `default` (matching `export default ky`) whose `.create()` returns a stub `KyInstance`:

```ts
mock.module("ky", () => ({
  default: {
    create: () => ({
      get: mock(),
      post: mock(),
      patch: mock(),
      delete: mock(),
    }),
  },
  HTTPError: class extends Error {},
}))
```

Each method is a `mock()` function so individual tests can add `.mockResolvedValue(...)` assertions if needed.

### 4. Cleanup: remove redundant mock from monitors.test.ts

Lines 25–38 of `tests/api/monitors.test.ts` contain a `beforeAll`/`afterAll` block that mocks `ky`. This test never loads `ky` at runtime (it uses `import type { createKenerClient }`). Remove this dead code.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Mock too simplistic for future tests that need specific ky behavior | Individual tests can override methods with `mock.module("ky", () => ({...}))` in their own `beforeAll` — Bun allows re-mocking |
| Preload file adds startup cost | One tiny file with ~10 lines; negligible |
| `bunfig.toml` is a new config file in repo root | Minimal; Bun-native and standard practice |
