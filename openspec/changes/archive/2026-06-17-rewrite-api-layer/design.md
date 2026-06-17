## Context

`kener-ctl`'s API layer (`src/api/types.ts` and `src/api/*.ts`) was built against an assumed Kener v4 REST API shape. Live probing of a real Kener v4 instance (`status.clustersvc.com`) revealed pervasive mismatches:

- All responses are wrapped: `{ "monitors": [...] }` not `[...]`; `{ "monitor": {...} }` not `{...}`
- All field names use snake_case: `monitor_type`, `default_status`, `created_at`, not camelCase
- Date fields in `created_at`/`updated_at` are ISO 8601 strings; `start_date_time`/`end_date_time` (incidents/maintenances) are Unix timestamps (number)
- Monitors/pages are identified by string keys (`tag`, `page_path`), not numeric `id`
- Monitors cannot be deleted — DELETE returns 405; deactivation is via PATCH `status: "INACTIVE"`
- `/api/v4/alert-triggers` and `/api/v4/alert-configs` return 404 — these endpoints don't exist in Kener v4
- Incidents: `state` field is immutable via PATCH; no updates/comments endpoint exists
- Maintenances: no `end_date_time` in response (computed from `start_date_time` + `duration_seconds`); `rrule` is required on create
- Pages: `page_path` strips leading slashes; root page is `""` not `"~home"`; monitors are `[{monitor_tag, position}]` not string arrays
- Error responses: `{ "error": { "code": "...", "message": "..." } }`

No pagination or filtering was observed on list endpoints.

## Goals / Non-Goals

**Goals:**
- All API calls succeed against real Kener v4 instances
- Zod schemas validate actual API response shapes exactly
- `pull`, `plan`, `apply`, `get`, `delete` all work end-to-end
- Tests pass against the corrected schemas
- Manifests remain usable for the 4 resource kinds that have API support
- Monitor soft-deletion works transparently through reconciliation

**Non-Goals:**
- Adding support for future Kener v4 endpoints that don't exist yet
- Building a translation/versioning layer for different Kener API versions
- Changing the config format or context system
- Adding pagination support (not needed — list endpoints return all results)
- Adding new CLI commands or output formats
- Supporting alert triggers/configs if/when they become available in a future Kener release

## Decisions

### D1: Field naming — API schemas mirror wire format exactly

**Decision**: Zod schemas in `src/api/types.ts` will use the exact field names returned by the API (snake_case). No `.transform()`, no renaming. Types derived via `z.infer<>` will reflect the wire format.

**Rationale**: The Zod schemas' purpose is to **validate API responses**. Adding transforms adds complexity and makes it harder to debug mismatches. The reconciler and CLI commands that need different field names (e.g., for manifest compatibility) will do their own mapping in dedicated translation functions.

**Alternatives considered**:
- `z.transform()` to convert snake_case → camelCase: adds complexity to the validation layer, mixes concerns
- Keep camelCase in Zod and validate after manual mapping: defeats the purpose of Zod validation

### D2: Response unwrapping — API modules unwrap before returning

**Decision**: Each API module's `list()`/`get()`/`create()`/`update()` method validates the full wrapper schema and returns the unwrapped resource(s). Callers never see the wrapper.

```
API: { "monitors": [Monitor] }  →  Zod: z.object({ monitors: z.array(...) })  →  Return: Monitor[]
```

**Rationale**: Callers (reconciler, CLI commands) shouldn't need to know about the API's response envelope format. The API modules are the abstraction boundary.

### D3: Manifest field naming — keep camelCase for user-facing YAML

**Decision**: Manifest schemas (`src/manifest/schema.ts`) retain camelCase field names. The reconciler's `manifestFromX()` and spec-to-body functions perform the translation between snake_case API types and camelCase manifest types.

**Rationale**: Users writing YAML expect camelCase (`defaultStatus`, `monitorType`). Making them write snake_case would be jarring and inconsistent with the existing manifest format. The translation layer is a few mapping functions — low maintenance cost.

**Alternative considered**: Switch manifests to snake_case: simpler code but worse DX. Not worth the tradeoff.

### D4: Monitor deletion — soft-deactivation via PATCH

**Decision**: When the reconciler determines a Monitor should be DELETEd (orphan with `--delete-orphans`), it executes a PATCH with `{ status: "INACTIVE" }` instead of a DELETE. The diff still produces a DELETE action in plan output (with a note `"(deactivated)"`). CREATE actions for monitors that were previously deactivated will PATCH them back to `{ status: "ACTIVE" }`.

**Rationale**: Kener v4's REST API does not support DELETE for monitors (returns 405). Deactivation is the only way to remove a monitor from the active status page. Reactivation ensures idempotency — running `apply` twice produces the same result.

**State file impact**: None. Monitors are identified by `tag` (a stable string key), so no state file mapping is needed.

### D5: AlertTrigger and AlertConfig removal

**Decision**: Remove the API modules (`triggers.ts`, `alert-configs.ts`), reconciler modules, manifest types, and CLI kind entries for AlertTrigger and AlertConfig. These resources have no REST API endpoints in Kener v4.

**Rationale**: Shipping API modules that always 404 is worse than not having them — it gives users false expectations and fails silently until they try to use the features. Users can re-add them when Kener v4 exposes these endpoints.

**Manifest impact**: The `AnyManifestSchema` discriminated union will shrink from 6 kinds to 4. Existing manifest files with `kind: AlertTrigger` or `kind: AlertConfig` will produce validation errors with clear messages.

### D6: Page root path — empty string instead of `~home`

**Decision**: The canonical page path for the root/home page is `""` (empty string), matching the Kener v4 API's `page_path` field. The `~home` convention is removed.

**Rationale**: The API returns `page_path: ""` for the root page. Using `~home` as a special value adds unnecessary translation complexity. Users write `path: ""` or omit the path field for the home page (with a default).

**Migration**: Existing manifests using `metadata.path: ~home` will need to be updated. This is a breaking change documented in the proposal.

### D7: Reconcile order — 4 kinds instead of 6

**Decision**: The new dependency-aware order is:

```
Apply:  Monitors → Pages → Incidents → Maintenances
Delete: Maintenances → Incidents → Pages → Monitors
```

AlertTriggers are removed (they were first in the apply order, last in delete order). This doesn't create any new dependency issues since the remaining resources' inter-dependencies are unchanged.

### D8: State file — keep for Incidents and Maintenances only

**Decision**: The state file continues to map `metadata.name` → numeric `id` for Incidents and Maintenances. AlertConfig mappings are removed. Monitor and Page mappings are not needed (they use stable string keys: `tag` and `page_path`).

## Risks / Trade-offs

**[Risk] Field name divergence between API types and manifest types creates translation bugs**
→ Mitigation: Each reconciler module has explicit `manifestFrom*()` functions. Tests verify round-trip fidelity: API JSON → manifest → API JSON produces the same result.

**[Risk] Monitor deactivation is irreversible via API**
→ Mitigation: The reconciler handles reactivation transparently. Users who want to permanently delete a monitor must use the Kener web UI.

**[Risk] Incidents lose the `state` immutability — can't transition states via API**
→ Mitigation: Document in README that incident state transitions must be done via the Kener web UI. `apply` can only update `title` and `end_date_time`.

**[Risk] Removing AlertTrigger/AlertConfig breaks users who have manifests for these kinds**
→ Mitigation: Validation produces a clear error message: `"kind 'AlertTrigger' is not supported — this endpoint is not yet available in Kener v4"`. Users can comment out or remove those manifests.

**[Risk] API may add these endpoints in a future Kener release**
→ Mitigation: The removed code can be re-added from git history when the endpoints become available. The architecture (API modules per resource kind) makes re-addition straightforward.

## Open Questions

1. **Should `page_path` default to `""` when omitted in a manifest?** Currently the manifest schema requires an explicit path. Making it default to `""` (root page) would be friendlier.
2. **Should `pull` strip the `status` and `is_hidden` fields from monitors?** These are operational fields that a user might not want to manage declaratively. Pulling them as-is could lead to spurious diffs.
3. **Should we add a `--include-inactive` flag to `pull`?** The list endpoint returns all monitors, including deactivated ones. A flag to filter them out would match user expectations.
