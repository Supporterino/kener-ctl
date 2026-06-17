## Why

The Kener v4 API returns boolean fields (`include_degraded_in_downtime`, `is_hidden`) as the string values `"YES"` and `"NO"` — not `"true"`/`"false"` as previously assumed. The current `StringOrBool` Zod preprocessor only handles `"true"`/`"false"`, so `kener-ctl plan` (and any command that fetches monitors) crashes with Zod validation errors.

## What Changes

- Expand the `StringOrBool` preprocessor in `src/api/types.ts` to coerce `"YES"` / `"NO"` (and case-insensitive variants) into `true` / `false`
- Update the existing spec scenario that currently treats `"yes"` as invalid — it is valid Kener v4 output
- Add tests for `"YES"` / `"NO"` / `"yes"` / `"no"` coercion at the API schema level

## Capabilities

### New Capabilities
<!-- None — this is a bug fix to existing coercion behavior -->

### Modified Capabilities
- `api-client`: The `Monitor schema coerces string-encoded booleans` requirement SHALL accept `"YES"` / `"NO"` (case-insensitive) in addition to `"true"` / `"false"`. The scenario "Monitor response with unexpected boolean string" SHALL be replaced with "Monitor response with case-insensitive boolean strings" covering `YES`/`NO` variants.

## Impact

- **Affected source**: `src/api/types.ts` (preprocess function), `src/manifest/schema.ts` (if boolean coercion is replicated there)
- **Affected tests**: `tests/api/types.test.ts` or equivalent monitor schema tests
- **No breaking changes**: existing `"true"`/`"false"` coercion is preserved; only new values are added
- **No config or CLI changes**
