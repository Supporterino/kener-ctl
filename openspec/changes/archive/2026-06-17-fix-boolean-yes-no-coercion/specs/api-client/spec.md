## MODIFIED Requirements

### Requirement: Monitor schema coerces string-encoded booleans

The Monitor API response schema SHALL accept case-insensitive string values (`"true"`, `"false"`, `"yes"`, `"no"`, and their uppercase/lowercase variants) for boolean fields `include_degraded_in_downtime` and `is_hidden`, converting them to TypeScript `boolean` during parsing via `z.preprocess()`.

#### Scenario: Monitor response with string booleans (lowercase true/false)

- **WHEN** the API returns a monitor with `"include_degraded_in_downtime": "true"` and `"is_hidden": "false"`
- **THEN** the response passes Zod validation and the parsed values are `true` and `false` (TypeScript boolean)

#### Scenario: Monitor response with uppercase YES/NO strings

- **WHEN** the API returns a monitor with `"include_degraded_in_downtime": "NO"` and `"is_hidden": "YES"`
- **THEN** the response passes Zod validation and the parsed values are `true` and `false`

#### Scenario: Monitor response with mixed-case boolean strings

- **WHEN** the API returns a monitor with `"include_degraded_in_downtime": "Yes"` and `"is_hidden": "No"`
- **THEN** the response passes Zod validation and the parsed values are `true` and `false`

#### Scenario: Monitor response with native booleans

- **WHEN** the API returns a monitor with `"include_degraded_in_downtime": true` and `"is_hidden": false`
- **THEN** the response passes Zod validation and the parsed values are `true` and `false`

#### Scenario: Monitor response with unexpected boolean string

- **WHEN** the API returns a monitor with `"is_hidden": "maybe"` (not a recognized truthy/falsy string)
- **THEN** the response fails Zod validation with an "Expected boolean" error
