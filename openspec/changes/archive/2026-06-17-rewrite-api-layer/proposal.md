## Why

The entire API layer was built against an incorrect understanding of the Kener v4 REST API. Response shapes, field names, URL paths, HTTP methods, and identifier semantics are all wrong. Running `kener-ctl pull` (or any command that calls the API) fails with Zod validation errors because the code expects bare arrays but the API wraps everything in named objects (`{ "monitors": [...] }` not `[...]`). Fixing the surface wrapper would only expose deeper mismatches — every field name uses snake_case (not camelCase), several resources identify by string tag/path (not numeric ID), and `alert-triggers`/`alert-configs` endpoints don't even exist in this version of Kener v4.

## What Changes

- **BREAKING**: Rewrite all Zod schemas in `src/api/types.ts` to match actual Kener v4 response shapes (snake_case field names, correct types, wrapper objects, unix timestamps for date fields)
- **BREAKING**: Update all API module URL paths to match actual Kener v4 routes (e.g., monitors identified by `tag` not numeric `id`; pages identified by `page_path`)
- **BREAKING**: Monitors cannot be deleted via REST API — change to soft-deactivate (`status: "INACTIVE"`)
- **BREAKING**: Remove `AlertTrigger` and `AlertConfig` API modules — these endpoints return 404 on Kener v4
- Update response unwrapping in all API modules (`{ monitors: [...] }` → extract `.monitors`)
- Fix field name mapping throughout reconciler, CLI pull, CLI get, and CLI delete
- Update tests to match new schemas and paths
- Update manifest schemas to align field names with the actual Kener v4 API (or define a clear translation layer)
- Add `--source-of-truth` note to AGENTS.md referencing the discovered API shape

## Capabilities

### New Capabilities

None. This is a correction, not a new capability.

### Modified Capabilities

- `api-client`: All Zod schemas, URL paths, HTTP methods, and identifier semantics rewritten to match actual Kener v4 REST API surface. AlertTrigger and AlertConfig API modules removed. Response unwrapping added.
- `reconciliation`: Reconciler identifier lookup changed (monitors by `tag`, pages by `page_path`). Monitor deletion replaced with soft-deactivation. AlertTrigger/AlertConfig reconciliation removed. Field name mappings updated.
- `cli-commands`: `pull`, `get`, and `delete` commands updated to use correct identifiers and response shapes. `pull` must unwrap response objects and map fields to manifest format.
- `manifest-parsing`: Manifest schemas updated to reflect actual Kener v4 field names and types. AlertTrigger and AlertConfig manifest kinds deprecated or removed.

## Impact

- `src/api/types.ts` — complete rewrite of all Zod schemas
- `src/api/monitors.ts` — path changes (tag-based), response unwrapping
- `src/api/pages.ts` — path changes (page_path-based), response unwrapping
- `src/api/incidents.ts` — field name and type corrections, response unwrapping
- `src/api/maintenances.ts` — field name and type corrections, response unwrapping
- `src/api/triggers.ts` — removed
- `src/api/alert-configs.ts` — removed
- `src/reconciler/resources/*.ts` — identifier and field name changes, monitor soft-delete, alert removal
- `src/reconciler/engine.ts` — remove AlertTrigger and AlertConfig from reconcile loop
- `src/cli/pull.ts` — response unwrapping, field serialization
- `src/cli/get.ts` — identifier and response shape updates
- `src/cli/delete.ts` — identifier updates, monitor soft-delete
- `src/cli/shared.ts` — remove alert trigger and alert config kinds
- `src/manifest/schema.ts` — field name alignment
- `src/manifest/types.ts` — remove AlertTrigger/AlertConfig manifest types
- All corresponding test files
