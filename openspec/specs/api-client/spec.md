# api-client

## Purpose

TBD

## Requirements

### Requirement: Create authenticated HTTP client
The system SHALL create a `ky` instance configured with the Kener instance base URL (appending `/api/v4`), bearer token authentication, JSON content type, and retry logic for transient errors.

#### Scenario: Client created with valid config
- **WHEN** `createKenerClient("https://status.example.com", "key-123")` is called
- **THEN** a ky instance is returned with `prefixUrl` set to `https://status.example.com/api/v4` and `Authorization: Bearer key-123` header

#### Scenario: Trailing slash in base URL handled
- **WHEN** the base URL is `https://status.example.com/` (with trailing slash)
- **THEN** the prefix URL resolves correctly to `https://status.example.com/api/v4` without double slashes

### Requirement: Retry on transient errors
The system SHALL automatically retry failed requests for HTTP status codes 429, 500, 502, and 503, up to 3 attempts.

#### Scenario: Retry on 503
- **WHEN** a request receives a 503 response
- **THEN** ky retries up to 2 more times before returning the error

#### Scenario: No retry on 404
- **WHEN** a request receives a 404 response
- **THEN** ky returns the error immediately without retrying

### Requirement: Request timeout
The system SHALL enforce a 15-second timeout on all API requests.

#### Scenario: Request exceeds timeout
- **WHEN** an API call takes longer than 15 seconds
- **THEN** the request is aborted with a timeout error

### Requirement: Attach response body to errors
The system SHALL use `ky`'s `hooks.beforeError` to attach the response body to error objects, enabling error messages to include API error details.

#### Scenario: API returns 400 with error body
- **WHEN** the API returns a 400 response with body `{"message": "Invalid tag format"}`
- **THEN** the thrown error includes the response body, accessible for error reporting

### Requirement: Typed CRUD operations for Monitors
The system SHALL export a `createMonitorsApi` function providing typed `list`, `get`, `create`, `update`, and `deactivate` methods for the `/monitors` endpoint. Monitors SHALL be identified by their `tag` string, not numeric ID. All responses SHALL be unwrapped from their envelope objects before returning.

#### Scenario: List all monitors
- **WHEN** `monitorsApi.list()` is called
- **THEN** a GET request is sent to `/api/v4/monitors`, the response `{ "monitors": [...] }` is validated and the inner array of monitor objects is returned

#### Scenario: Get single monitor by tag
- **WHEN** `monitorsApi.get("my-api")` is called
- **THEN** a GET request is sent to `/api/v4/monitors/my-api`, the response `{ "monitor": {...} }` is validated and the unwrapped monitor object is returned

#### Scenario: Create monitor
- **WHEN** `monitorsApi.create(body)` is called with a valid create body
- **THEN** a POST request is sent to `/api/v4/monitors` with the JSON body, and the unwrapped monitor object is returned from `{ "monitor": {...} }`

#### Scenario: Update monitor by tag
- **WHEN** `monitorsApi.update("my-api", patch)` is called with a partial update body
- **THEN** a PATCH request is sent to `/api/v4/monitors/my-api` with the JSON body, and the unwrapped monitor object is returned

#### Scenario: Deactivate monitor (soft-delete)
- **WHEN** `monitorsApi.deactivate("my-api")` is called
- **THEN** a PATCH request is sent to `/api/v4/monitors/my-api` with body `{ "status": "INACTIVE" }`, and the unwrapped monitor object is returned

### Requirement: Typed CRUD operations for Pages
The system SHALL export a `createPagesApi` function providing typed `list`, `create`, `update`, and `delete` methods for the `/pages` endpoint. Pages SHALL be identified by their `page_path` string. All responses SHALL be unwrapped.

#### Scenario: List all pages
- **WHEN** `pagesApi.list()` is called
- **THEN** a GET request is sent to `/api/v4/pages`, the response `{ "pages": [...] }` is validated and the inner array of page objects is returned

#### Scenario: Create page
- **WHEN** `pagesApi.create(body)` is called with valid `page_path`, `page_title`, and `page_header`
- **THEN** a POST request is sent to `/api/v4/pages`, and the unwrapped page object is returned

#### Scenario: Update page by path
- **WHEN** `pagesApi.update("services", patch)` is called
- **THEN** a PATCH request is sent to `/api/v4/pages/services`, and the unwrapped page object is returned

#### Scenario: Delete page by path
- **WHEN** `pagesApi.delete("services")` is called
- **THEN** a DELETE request is sent to `/api/v4/pages/services`

### Requirement: Typed CRUD operations for Incidents
The system SHALL export a `createIncidentsApi` function providing typed `list`, `create`, `update`, and `delete` methods for the `/incidents` endpoint. Incidents SHALL be identified by numeric `id`. All responses SHALL be unwrapped. Incident `start_date_time` SHALL be a Unix timestamp (number, seconds).

#### Scenario: List all incidents
- **WHEN** `incidentsApi.list()` is called
- **THEN** a GET request is sent to `/api/v4/incidents`, the response `{ "incidents": [...] }` is validated and the inner array is returned

#### Scenario: Create incident
- **WHEN** `incidentsApi.create({ title: "Outage", start_date_time: 1765468800, monitors: [{ monitor_tag: "api", impact: "DOWN" }] })` is called
- **THEN** a POST request is sent to `/api/v4/incidents` with snake_case JSON body, and the unwrapped incident is returned

#### Scenario: Update incident by id
- **WHEN** `incidentsApi.update(42, { title: "Updated", end_date_time: 1765472400 })` is called
- **THEN** a PATCH request is sent to `/api/v4/incidents/42`, and the unwrapped incident is returned. The `state` field SHALL NOT be modifiable via the API.

#### Scenario: Delete incident by id
- **WHEN** `incidentsApi.delete(42)` is called
- **THEN** a DELETE request is sent to `/api/v4/incidents/42`

### Requirement: Typed CRUD operations for Maintenances
The system SHALL export a `createMaintenancesApi` function providing typed `list`, `get`, `create`, `update`, and `delete` methods for the `/maintenances` endpoint. Maintenances SHALL be identified by numeric `id`. All responses SHALL be unwrapped. `start_date_time` SHALL be a Unix timestamp (number, seconds). `rrule` and `duration_seconds` SHALL be required on creation. `end_date_time` SHALL NOT be a field (it is computed by Kener from start + duration).

#### Scenario: List all maintenances
- **WHEN** `maintenancesApi.list()` is called
- **THEN** a GET request is sent to `/api/v4/maintenances`, the response `{ "maintenances": [...] }` is validated and the inner array is returned

#### Scenario: Get single maintenance by id
- **WHEN** `maintenancesApi.get(7)` is called
- **THEN** a GET request is sent to `/api/v4/maintenances/7`, and the unwrapped maintenance is returned

#### Scenario: Create maintenance
- **WHEN** `maintenancesApi.create({ title: "Upgrade", start_date_time: 1780272000, rrule: "FREQ=WEEKLY;BYDAY=MO", duration_seconds: 3600 })` is called
- **THEN** a POST request is sent to `/api/v4/maintenances`, and the unwrapped maintenance is returned

#### Scenario: Update maintenance by id
- **WHEN** `maintenancesApi.update(7, { title: "Updated" })` is called
- **THEN** a PATCH request is sent to `/api/v4/maintenances/7`, and the unwrapped maintenance is returned

#### Scenario: Delete maintenance by id
- **WHEN** `maintenancesApi.delete(7)` is called
- **THEN** a DELETE request is sent to `/api/v4/maintenances/7`

### Requirement: All API response types validated with Zod
The system SHALL validate all API response payloads against Zod schemas before returning them to callers. List responses SHALL be validated as wrapper objects (e.g., `{ monitors: z.array(MonitorSchema) }`) and the inner array SHALL be extracted. Single-resource responses SHALL be validated as wrapper objects (e.g., `{ monitor: MonitorSchema }`) and the inner object SHALL be extracted. All field names in Zod schemas SHALL match the API wire format (snake_case).

#### Scenario: Response matches expected shape
- **WHEN** the API returns `{ "monitors": [{ "tag": "api", "monitor_type": "API", ... }] }`
- **THEN** the response passes Zod validation and the inner array is returned typed

#### Scenario: Response shape is unexpected
- **WHEN** the API returns a response that does not match the expected Zod wrapper schema
- **THEN** a validation error is thrown with details about the mismatch

#### Scenario: API returns error object
- **WHEN** the API returns `{ "error": { "code": "NOT_FOUND", "message": "..." } }`
- **THEN** the error body is attached to the HTTP error via `hooks.beforeError`

### Requirement: Network and auth errors abort immediately
The system SHALL detect network connectivity failures and authentication errors (401, 403) and abort the current command immediately rather than collecting them with other errors.

#### Scenario: Invalid API key
- **WHEN** the API returns 401 on the first request
- **THEN** the error is printed immediately and the command exits with code 1

### Requirement: Monitor soft-deactivation
The system SHALL provide a `deactivate` method on the monitors API that sends a PATCH request with `{ "status": "INACTIVE" }` to the monitor's tag endpoint. Monitors cannot be hard-deleted via the REST API.

#### Scenario: Deactivate a monitor
- **WHEN** `monitorsApi.deactivate("old-service")` is called
- **THEN** a PATCH request is sent to `/api/v4/monitors/old-service` with body `{ "status": "INACTIVE" }` and the unwrapped monitor (with `status: "INACTIVE"`) is returned

### Requirement: Response envelope unwrapping
The system SHALL unwrap all Kener v4 API response envelopes before returning data to callers. List endpoints return `{ "<plural>": [...] }` and the inner array SHALL be extracted. Single-resource endpoints return `{ "<singular>": {...} }` and the inner object SHALL be extracted.

#### Scenario: Unwrap list response
- **WHEN** the API returns `{ "incidents": [{ "id": 1, "title": "Outage", ... }] }`
- **THEN** the API module returns `[{ id: 1, title: "Outage", ... }]`

#### Scenario: Unwrap single response
- **WHEN** the API returns `{ "monitor": { "tag": "api", "name": "API", ... } }`
- **THEN** the API module returns `{ tag: "api", name: "API", ... }`

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
