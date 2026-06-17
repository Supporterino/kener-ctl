## 1. Fix the coercion logic

- [x] 1.1 Rewrite `StringOrBool` in `src/api/types.ts` to normalize input to lowercase and match against `"true"`, `"yes"`, `"1"` (truthy) and `"false"`, `"no"`, `"0"` (falsy)
- [x] 1.2 Remove the separate `z.boolean().optional()` fields in `CreateMonitorBodySchema` (lines 52-53) — they are unused but misleading; replace with `StringOrBool.optional()` for consistency

## 2. Add and update tests

- [x] 2.1 Add test cases in `tests/api/types.test.ts` (or create the file if it doesn't exist) for `MonitorSchema` parsing with `"YES"`, `"NO"`, `"yes"`, `"no"`, `"Yes"`, `"No"`, `"True"`, `"False"` strings
- [x] 2.2 Update existing test case that expects `"yes"` to fail — it should now pass

## 3. Verification

- [x] 3.1 Run `bun test` to confirm all existing and new tests pass
- [x] 3.2 Run `bun run typecheck` and `bun run lint` to confirm no regressions
- [x] 3.3 Run `bun run build` to confirm the bundle still compiles
