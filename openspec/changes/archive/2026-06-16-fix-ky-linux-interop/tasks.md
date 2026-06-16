## 1. Test infrastructure

- [x] 1.1 Create `tests/setup.ts` with centralized `mock.module("ky", ...)` using `mock()` stubs for `.get`, `.post`, `.patch`, `.delete`, and `default` export containing `.create()`
- [x] 1.2 Create `bunfig.toml` with `[test] preload = "./tests/setup.ts"`

## 2. Cleanup

- [x] 2.1 Remove redundant `mock.module("ky", ...)` `beforeAll`/`afterAll` block from `tests/api/monitors.test.ts` (lines 25–38)

## 3. Verification

- [x] 3.1 Run `bun test` locally — all tests pass
- [x] 3.2 Run `bun run typecheck`, `bun run lint`, `bun run format:check` — all clean
- [ ] 3.3 Push branch and confirm CI passes on Linux
