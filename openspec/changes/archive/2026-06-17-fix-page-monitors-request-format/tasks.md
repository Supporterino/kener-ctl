## 1. Fix API types

- [x] 1.1 Change `CreatePageBodySchema.monitors` from `z.array(z.object({ monitor_tag, position }))` to `z.array(z.string()).optional()` in `src/api/types.ts`
- [x] 1.2 Verify `UpdatePageBodySchema` inherits the change (it extends `CreatePageBodySchema.partial()`)

## 2. Fix reconciler body construction

- [x] 2.1 In `executeMutation` Page case (`src/reconciler/engine.ts`), change `monitors` field assignment from `.map(tag => ({ monitor_tag: tag, position: idx }))` to pass `spec.monitors` directly as `string[]`
- [x] 2.2 Remove unused `position` logic (the `idx` parameter in the map callback is no longer needed)

## 3. Add tests

- [x] 3.1 Add unit test in `tests/api/types.test.ts` (or create if absent) verifying `CreatePageBodySchema` accepts `monitors: ["tag1", "tag2"]` and rejects `monitors: [{ monitor_tag: "x", position: 0 }]`
- [x] 3.2 Add/update reconciler test in `tests/reconciler/engine.test.ts` verifying the page mutation body has `monitors` as `string[]`
- [x] 3.3 Verify existing page reconciler tests still pass (the `pageFromApi` transformation is unchanged)

## 4. Verify

- [x] 4.1 Run `bun test` to confirm all tests pass
- [x] 4.2 Run `bun run typecheck` and `bun run lint` to confirm no errors
- [x] 4.3 Rebuild and test `dist/index.js apply --manifest-dir ./kener` against the live Kener v4 instance to confirm pages with monitors apply successfully
