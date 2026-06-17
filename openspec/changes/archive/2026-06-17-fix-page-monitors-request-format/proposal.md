## Why

The Kener v4 API returns page monitors as `[{ monitor_tag: "x", position: N }]` but **expects** them as `["x"]` (plain strings) on POST and PATCH requests. Our code sends the response format on write requests, causing the server to coerce objects to `"[object Object]"` and reject the request with a 400. This makes `kener-ctl apply` unusable for any page with monitors.

## What Changes

- Fix `CreatePageBodySchema` and `UpdatePageBodySchema` in `api/types.ts`: change the `monitors` field from `z.array(z.object({ monitor_tag, position }))` to `z.array(z.string())`
- Fix `executeMutation` in `reconciler/engine.ts` Page case: stop mapping `string[]` → `{ monitor_tag, position }[]`, pass plain `string[]` directly
- `pageFromApi` in `reconciler/resources/page.ts`: already correct — maps response objects → strings for diffing (no change needed)

## Capabilities

### Modified Capabilities
- **api-client**: Page request body monitors schema changes from object array to string array
- **reconciliation**: Page mutation body construction no longer wraps monitor tags into objects

## Impact

- **`src/api/types.ts`**: `CreatePageBodySchema.monitors` and `UpdatePageBodySchema.monitors` Zod definition changes
- **`src/reconciler/engine.ts`**: `executeMutation` Page case — remove `.map()` that wraps tags into `{ monitor_tag, position }` objects
- **Incident/Maintenance monitors**: Same pattern may exist for Incident and Maintenance POST/PATCH bodies — needs verification separately (not in scope of this fix unless proven broken)
