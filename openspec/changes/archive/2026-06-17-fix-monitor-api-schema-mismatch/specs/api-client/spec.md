## ADDED Requirements

### Requirement: Monitor schema accepts nullable optional fields
The Monitor API response schema SHALL accept `null` for optional fields that Kener v4 omits from the database. Fields `description`, `image`, `category_name`, `external_url`, `day_degraded_minimum_count`, and `day_down_minimum_count` SHALL use `.nullable()` in their Zod definitions so that a response containing `"description": null` parses successfully.

#### Scenario: Monitor response with null optional fields
- **WHEN** the API returns a monitor with `"description": null`, `"category_name": null`, `"image": null`, `"external_url": null`, `"day_degraded_minimum_count": null`, `"day_down_minimum_count": null`
- **THEN** the response passes Zod validation and the monitor object is returned with those fields as `null`

#### Scenario: Monitor response with populated optional fields
- **WHEN** the API returns a monitor with `"description": "API health check"` and `"category_name": "Core"`
- **THEN** the response passes Zod validation and those fields are returned as strings

### Requirement: Monitor schema coerces string-encoded booleans
The Monitor API response schema SHALL accept `"true"` and `"false"` string values for boolean fields `include_degraded_in_downtime` and `is_hidden`, converting them to TypeScript `boolean` during parsing via `z.preprocess()`.

#### Scenario: Monitor response with string booleans
- **WHEN** the API returns a monitor with `"include_degraded_in_downtime": "true"` and `"is_hidden": "false"`
- **THEN** the response passes Zod validation and the parsed values are `true` and `false` (TypeScript boolean)

#### Scenario: Monitor response with native booleans
- **WHEN** the API returns a monitor with `"include_degraded_in_downtime": true` and `"is_hidden": false`
- **THEN** the response passes Zod validation and the parsed values are `true` and `false`

#### Scenario: Monitor response with unexpected boolean string
- **WHEN** the API returns a monitor with `"is_hidden": "yes"` (neither `"true"` nor `"false"`)
- **THEN** the response fails Zod validation with an "Expected boolean" error

### Requirement: Monitor schema accepts parsed object for monitor_settings_json
The Monitor API response schema SHALL accept a parsed JSON object (not a JSON-encoded string) for the `monitor_settings_json` field, reflecting that Kener v4 parses this field before serializing the API response.

#### Scenario: Monitor response with object monitor_settings_json
- **WHEN** the API returns a monitor with `"monitor_settings_json": { "polling_interval": 30 }`
- **THEN** the response passes Zod validation and `monitor_settings_json` is returned as a Record

#### Scenario: Monitor response with null monitor_settings_json
- **WHEN** the API returns a monitor with `"monitor_settings_json": null`
- **THEN** the response passes Zod validation and `monitor_settings_json` is returned as `null`

### Requirement: Reconciler normalizes null API values to manifest defaults
The Monitor reconciler's `manifestFromMonitor()` function SHALL convert nullable API values to manifest-appropriate defaults before comparison, preventing spurious UPDATE diffs. Null string fields SHALL map to `""` for required spec fields and `undefined` for optional spec fields. Null number fields SHALL map to `0` for required fields and `undefined` for optional fields.

#### Scenario: Null description does not trigger UPDATE
- **WHEN** a monitor manifest has `spec.description` unset (default `""`) and the corresponding remote monitor has `description: null`
- **THEN** the diff engine sees both as `""` (after normalization) and produces a `NOOP` change

#### Scenario: Null category_name does not trigger UPDATE
- **WHEN** a monitor manifest has `spec.categoryName` unset (implicit `undefined`) and the corresponding remote monitor has `category_name: null`
- **THEN** the diff engine sees both as `undefined` and produces a `NOOP` change

#### Scenario: Explicit null in day_degraded_minimum_count does not trigger UPDATE
- **WHEN** a monitor manifest has `spec.dayDegradedMinCount` unset and the remote monitor has `day_degraded_minimum_count: null`
- **THEN** the diff engine sees both as `undefined` and produces a `NOOP` change
