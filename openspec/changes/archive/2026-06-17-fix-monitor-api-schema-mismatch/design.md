## Context

Kener v4 is backed by SQLite (better-sqlite3), which serializes booleans as `"true"`/`"false"` strings and represents absent data as JSON `null`. The current `MonitorSchema` in `src/api/types.ts` was built against expected Kener v4 conventions without live-instance verification. Running `pull` or `plan` against a real Kener instance crashes immediately because the Zod schema rejects `null` values for optional fields, string-encoded booleans, and pre-parsed JSON objects.

Three categories of mismatch:

| Category | Fields affected | API returns | Schema expects |
|---|---|---|---|
| Nullable strings | `description`, `image`, `category_name`, `external_url` | `null` | `string` |
| Nullable numbers | `day_degraded_minimum_count`, `day_down_minimum_count` | `null` | `number` |
| String-encoded bools | `include_degraded_in_downtime`, `is_hidden` | `"true"` / `"false"` | `boolean` |
| Parsed JSON object | `monitor_settings_json` | `{}` (object) | `string` (JSON) |

## Goals / Non-Goals

**Goals:**
- Make `MonitorSchema` accept exactly what Kener v4's REST API returns
- Normalize API wire format into clean TypeScript types (`string`, `boolean`, `Record<string, unknown>`) at the parse boundary
- Ensure the reconciler doesn't produce spurious UPDATE diffs from `null` vs default mismatches
- Prophylactically fix other resource schemas (Page, Incident, Maintenance) for the same nullable pattern
- Add tests with realistic Kener v4 response shapes

**Non-Goals:**
- Adding `is_hidden`, `include_degraded_in_downtime`, `image`, `external_url`, or `monitor_settings_json` to the manifest spec — those remain API-only fields
- Changing the manifest schema defaults
- Schema migration or backwards-compat concerns (this is a bug fix, not a format change)

## Decisions

### 1. Use `.nullable()` on API schemas, normalize in mapping layer

**Chosen:** Apply `.nullable()` directly to each affected field in the Zod API schema. Handle `null → manifest default` conversion in `manifestFromMonitor()` and `monitorToManifest()`.

**Why:** This keeps parsing truthful (the API truly returns `null`), gives correct TypeScript types (`string | null`), and centralizes the null→default normalization at the single API→manifest conversion point. It follows the existing pattern (`end_date_time: z.number().nullable()` in `IncidentSchema`).

**Alternative considered:** `z.preprocess()` at schema level to convert `null → ""` during parse. Rejected because:
- Hides the wire format from types (TypeScript sees `string`, but API returns `null`)
- Makes it harder to distinguish "field is null" from "field is empty string" — semantically different in Kener
- Preprocess logic scattered across field definitions instead of centralized in the mapping layer

### 2. Use `z.preprocess()` for string-to-boolean coercion

**Chosen:** `z.preprocess()` to convert `"true"`/`"false"` strings → `boolean` at parse time.

**Why:** The wire format fundamentally differs from our type model (a string is not a boolean). Unlike nullable→null, there's no downstream semantic value in preserving the string representation. The coercion is format normalization, not a value interpretation.

```typescript
is_hidden: z.preprocess((v) => {
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}, z.boolean()).default(false)
```

**Alternative considered:** `z.union([z.boolean(), z.literal("true"), z.literal("false")])` with `.transform()`. Rejected as more verbose and produces a union type that downstream code must narrow.

### 3. Fix `monitor_settings_json` type to accept parsed object

**Chosen:** Change from `z.string().optional()` to `z.record(z.unknown()).nullable().optional()`.

**Why:** Kener v4 apparently parses the settings JSON before serializing to API response. The field is not a JSON-encoded string; it's the parsed object. This field isn't mapped to manifests or used in comparison, so the change is purely about accepting valid API responses.

### 4. Prophylactic fixes for Page, Incident, Maintenance schemas

**Chosen:** Apply `.nullable()` to all optional string/number fields that Kener may return as `null`.

**Why:** These schemas will fail the same way once the Monitor blocker is cleared. Fixing proactively avoids a second round of errors and bug reports. We don't have live test data for all types, but the pattern is consistent across the Kener v4 API (SQLite backend).

### 5. No separate helper module

**Chosen:** Apply changes inline in `src/api/types.ts` using explicit `.nullable()`, `.preprocess()`, and `??` operators.

**Why:** The changes are small and localized. Creating a separate helper module adds indirection without sufficient reuse to justify it. The existing codebase uses direct Zod chains (`.optional()`, `.default()`, `.nullable()`) everywhere — introducing helpers would break that pattern. We can revisit if future API versions add more nullable/coerced fields.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Other resource types return different null patterns than assumed | Prophylactic `.nullable()` is additive (accepts more, rejects less). If a field is never null, the schema remains correct. The only risk is accidentally making a required field nullable — verified by checking Create/Update schemas (which remain strict) |
| `null` → `undefined` in mapping produces `spec.dayDegradedMinCount: undefined` while manifest has `undefined` for unspecifed → equal via `deepEqual` (both absent from object) → NOOP. This is correct behavior. |
| TypeScript casts in `manifestFromMonitor` may silently widen | Add explicit `?? undefined` and `?? ""` so the type narrowing is visible and auditable |
| The string-bool preprocess may swallow unexpected values (e.g., `"1"`, `"yes"`) | The preprocess returns the value unchanged if it's not `"true"` or `"false"`. Zod will then fail with a clear `Expected boolean` error, surfacing the unexpected value |
