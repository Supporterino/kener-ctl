## Why

Kener v4's REST API returns monitor objects with `null` for unset optional fields, `"true"`/`"false"` string-encoded booleans (SQLite artifact), and a pre-parsed `monitor_settings_json` object. The `MonitorSchema` Zod schema in `src/api/types.ts` rejects all of these, causing `kener-ctl pull` and `kener-ctl plan` to crash with Zod validation errors on any live Kener instance. Other resource kinds (Page, Incident, Maintenance) likely share the same nullable-field pattern and will fail once the monitor blocker is cleared.

## What Changes

- **Fix `MonitorSchema`** to accept `null` for nullable fields (`description`, `image`, `category_name`, `external_url`, `day_degraded_minimum_count`, `day_down_minimum_count`) via Zod preprocessing
- **Fix `MonitorSchema`** to coerce string-encoded booleans (`"true"`/`"false"`) for `include_degraded_in_downtime` and `is_hidden`
- **Fix `MonitorSchema`** to accept a parsed object for `monitor_settings_json` instead of requiring a JSON string
- **Prophylactic fix** for `PageSchema`, `IncidentSchema`, `MaintenanceSchema` — apply same nullable-string and nullable-number handling to all optional fields that Kener may return as `null`
- **Add reusable schema helpers** (`NullableString`, `NullableNumber`, `StringOrBool`) to `src/api/types.ts` to avoid repetitive `.preprocess()` per field
- **Update tests** with realistic Kener v4 response shapes (null fields, string booleans, object monitor_settings_json)
- **Update `manifestFromMonitor()`** in the monitor reconciler to normalize nullable API values into manifest defaults during conversion, preventing spurious UPDATE diffs from `null` vs `""` mismatches

## Capabilities

### New Capabilities

<!-- None — this is a bug fix within existing capabilities -->

### Modified Capabilities

- `api-client`: Monitor schema validation now correctly handles Kener v4's actual wire format — nullable optional fields (accepted as `null` in responses), string-encoded booleans (`"true"`/`"false"`), and pre-parsed JSON objects (`monitor_settings_json`). Page, Incident, and Maintenance schemas updated prophylactically for the same nullable-field pattern. Reconciler mapping layer normalizes null to manifest defaults during comparison.

## Impact

| Area | Detail |
|------|--------|
| `src/api/types.ts` | `MonitorSchema`, `PageSchema`, `IncidentSchema`, `MaintenanceSchema` — nullable/coercion fixes + new helper utilities |
| `src/reconciler/resources/monitor.ts` | `manifestFromMonitor()` — normalize null→default before comparison |
| `src/cli/pull.ts` | `monitorToManifest()` — handle nullable API values in YAML serialization |
| `tests/api/monitors.test.ts` | Add realistic Kener v4 response fixtures |
| `tests/reconciler/monitor.test.ts` | Add test for null-field normalization during reconcile |
