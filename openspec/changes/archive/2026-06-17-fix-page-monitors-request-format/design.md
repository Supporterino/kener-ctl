## Context

The Kener v4 REST API has an asymmetric format for page `monitors`:

| Direction | Format | Example |
|-----------|--------|---------|
| GET response | Array of objects | `[{ monitor_tag: "x", position: 0 }]` |
| POST/PATCH request body | Array of strings | `["x"]` |

The current code in `executeMutation` (engine.ts) converts manifest `string[]` monitors into request-format `{ monitor_tag, position }[]` objects — matching the GET response shape but NOT what the API actually accepts. When the Kener server receives an object where it expects a string, it calls `.toString()` on it, producing `"[object Object]"` — resulting in the error `"Monitor with tag '[object Object]' does not exist"`.

The `pageFromApi` function in the page reconciler already correctly maps GET response objects → `string[]` for diffing purposes. That code path is fine.

## Goals / Non-Goals

**Goals:**
- Fix POST and PATCH page requests to send `monitors` as `string[]` (matching Kener v4 API expectation)
- Update Zod schemas to validate the correct request format
- Add a test that verifies the page API body shape

**Non-Goals:**
- Fixing Incident or Maintenance monitor formats (not yet verified as broken; out of scope)
- Changing the GET response parsing (already correct)
- Adding runtime Zod validation of outgoing bodies (would be a separate defensive improvement)

## Decisions

### Decision 1: Pass `string[]` directly instead of mapping to objects

**Chosen:** Remove the `.map(tag => ({ monitor_tag: tag, position: idx }))` and pass `spec.monitors` as-is.

**Alternative considered:** Keep the mapping but fix the API schema to match. Rejected because:
- The server clearly does NOT accept the object format on write requests
- The `position` field is server-computed; sending it is unnecessary
- Simpler code: less transformation = fewer bugs

### Decision 2: Update both `CreatePageBodySchema` and `UpdatePageBodySchema`

**Chosen:** Change `monitors` from `z.array(z.object({ monitor_tag, position })).optional()` to `z.array(z.string()).optional()` in both schemas.

**Rationale:** POST and PATCH share the same monitors format. `UpdatePageBodySchema` extends `CreatePageBodySchema.partial()`, so changing the base schema propagates to both.

### Decision 3: Keep GET response schema unchanged

The `PageSchema.monitors` field (returned by GET) retains its `z.array(z.object({ monitor_tag, position }))` format. This is the server's response format and is correct for reading data.

The `pageFromApi` function continues to map `page.monitors.map(m => m.monitor_tag)` to convert to `string[]` for diffing — this remains correct.

## Risks / Trade-offs

- **Risk**: Incident and Maintenance endpoints may have the same request-vs-response format mismatch. → **Mitigation**: Verified in explore phase but needs explicit testing. If broken, a follow-up change can apply the same pattern.
- **Risk**: Kener v4 may change the request format in a future version. → **Mitigation**: Low risk — this is the currently-verified format. If it changes, the Zod validation will catch it via the `beforeError` hook.
- **Trade-off**: We lose the ability to specify monitor `position` ordering in the manifest. → **Acceptable**: Kener assigns positions based on array order; if ordering support is needed later, a separate manifest field (e.g., `monitorOrder: [ordered tags]`) can be added.
