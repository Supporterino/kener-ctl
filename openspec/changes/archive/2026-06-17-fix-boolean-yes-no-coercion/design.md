## Context

The Kener v4 API serializes boolean database columns as the MySQL-native strings `"YES"` and `"NO"` in JSON responses. The current `StringOrBool` Zod preprocessor in `src/api/types.ts` only handles `"true"` / `"false"`, causing `kener-ctl plan` (and any monitor-fetching command) to crash with validation errors.

## Goals / Non-Goals

**Goals:**
- Make `StringOrBool` handle `"YES"` / `"NO"` and case-insensitive variants (`"yes"`, `"no"`, `"Yes"`, `"No"`, `"True"`, `"False"`, etc.)
- Preserve existing `"true"` / `"false"` and native `boolean` handling
- Keep the preprocess self-contained (no new dependencies)

**Non-Goals:**
- Applying the same coercion to manifest YAML schemas (user manifests use native booleans, only the API response needs coercion)
- Handling `"1"` / `"0"` or other non-standard formats (there's no evidence the API returns those)
- Affecting any schema other than `MonitorSchema` (no other Kener v4 resource endpoints return boolean fields as strings)

## Decisions

### Use case-insensitive matching in the preprocess

Transform the input to lowercase before comparing, then match against `"true"`, `"yes"`, `"1"` (truthy) and `"false"`, `"no"`, `"0"` (falsy). This one-time transformation covers all observed variants (`YES`/`NO` from live API) and reasonable future variants.

**Alternatives considered:**
- **Exact-match only**: Would require separate checks for `"YES"`, `"NO"`, `"Yes"`, `"No"` etc. — verbose and fragile
- **Boolean constructor**: `Boolean(v)` would treat any non-empty string as `true` — too permissive, would hide API contract changes
- **Dedicated `z.coerce.boolean()` from Zod 3.23+**: Not available in the Zod version used, and would also coerce non-boolean-like strings

### Keep `"false"` as falsy (not just `"off"`/`"no"`)

The preprocess treats `"false"` as falsy. Since Kener v4 is a Node/MySQL stack, `"NO"` is the dominant falsy representation, but `"false"` is preserved for backward compatibility.

## Risks / Trade-offs

- **[Low] Future Kener v5 might change serialization format**: The preprocess is designed to handle both native booleans and multiple string formats. A format change would be silently accommodated or would need a schema update to fix.

- **[Low] Case-insensitive match could mask API bugs**: If Kener starts returning `"ACTIVE"` for a boolean field, it would silently be coerced to… not a boolean match. But the regex/switch fallthrough in the preprocess means unrecognized strings still fail validation.

## Open Questions

- Should `include_degraded_in_downtime` and `is_hidden` be added to the manifest schema (`MonitorSpecSchema`) so users can declare them? (Out of scope for this fix — the fields are already silently ignored during reconciliation.)
