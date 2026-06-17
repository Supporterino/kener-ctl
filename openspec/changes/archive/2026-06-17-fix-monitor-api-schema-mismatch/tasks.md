## 1. Fix MonitorSchema in API types

- [x] 1.1 Add `.nullable()` to nullable string fields in `MonitorSchema`: `description`, `image`, `category_name`, `external_url`
- [x] 1.2 Add `.nullable()` to nullable number fields in `MonitorSchema`: `day_degraded_minimum_count`, `day_down_minimum_count`
- [x] 1.3 Add `z.preprocess()` for string-to-boolean coercion on `include_degraded_in_downtime` and `is_hidden` in `MonitorSchema`
- [x] 1.4 Change `monitor_settings_json` from `z.string().optional()` to `z.record(z.unknown()).nullable().optional()` in `MonitorSchema`

## 2. Fix API-to-manifest mapping layer

- [x] 2.1 In `manifestFromMonitor()` (src/reconciler/resources/monitor.ts), add `?? ""` for `description`, `?? undefined` for `categoryName`, `dayDegradedMinCount`, `dayDownMinCount`
- [x] 2.2 In `monitorToManifest()` (src/cli/pull.ts), add `?? ""` for `description`, `?? undefined` for `categoryName`, `dayDegradedMinCount`, `dayDownMinCount`

## 3. Prophylactic fixes for other resource schemas

- [x] 3.1 Add `.nullable()` to optional string/number fields in `PageSchema` — fields like `page_header`, `page_subheader`, `page_logo`, `page_settings`
- [x] 3.2 Add `.nullable()` to optional string fields in `IncidentSchema` — fields like `incident_type`, `incident_source`
- [x] 3.3 Add `.nullable()` to optional string fields in `MaintenanceSchema` — fields like `description`

## 4. Update tests

- [x] 4.1 Add test in `tests/api/monitors.test.ts`: monitor list with all null optional fields, string booleans, and object monitor_settings_json passes validation
- [x] 4.2 Add test in `tests/reconciler/monitor.test.ts`: null description/category_name on remote does not cause spurious UPDATE diff
- [x] 4.3 Update existing test mock data to use realistic nullable API shapes where applicable

## 5. Verification

- [x] 5.1 Run `bun run typecheck` and fix any type errors from `.nullable()` changes
- [x] 5.2 Run `bun run lint` to ensure no style issues
- [x] 5.3 Run `bun test` and verify all tests pass
