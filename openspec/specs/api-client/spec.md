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
The system SHALL export a `createMonitorsApi` function providing typed `list`, `get`, `create`, `update`, and `delete` methods for the `/monitors` endpoint.

#### Scenario: List all monitors
- **WHEN** `monitorsApi.list()` is called
- **THEN** a GET request is sent to `/api/v4/monitors` and the response is parsed as an array of monitor objects

#### Scenario: Get single monitor
- **WHEN** `monitorsApi.get(42)` is called
- **THEN** a GET request is sent to `/api/v4/monitors/42` and a single monitor object is returned

#### Scenario: Create monitor
- **WHEN** `monitorsApi.create(body)` is called with a valid create body
- **THEN** a POST request is sent to `/api/v4/monitors` with the JSON body

#### Scenario: Update monitor
- **WHEN** `monitorsApi.update(42, patch)` is called with a partial update body
- **THEN** a PATCH request is sent to `/api/v4/monitors/42` with the JSON body

#### Scenario: Delete monitor
- **WHEN** `monitorsApi.delete(42)` is called
- **THEN** a DELETE request is sent to `/api/v4/monitors/42`

### Requirement: Typed CRUD operations for Pages
The system SHALL export a `createPagesApi` function providing typed `list`, `get`, `create`, `update`, and `delete` methods for the `/pages` endpoint.

#### Scenario: List all pages
- **WHEN** `pagesApi.list()` is called
- **THEN** a GET request is sent to `/api/v4/pages` and the response is parsed as an array of page objects

### Requirement: Typed CRUD operations for AlertTriggers
The system SHALL export a `createTriggersApi` function providing typed `list`, `get`, `create`, `update`, and `delete` methods for the `/alert-triggers` endpoint.

### Requirement: Typed CRUD operations for AlertConfigs
The system SHALL export a `createAlertConfigsApi` function providing typed `list`, `get`, `create`, `update`, and `delete` methods for the `/alert-configs` endpoint.

### Requirement: Typed CRUD operations for Incidents
The system SHALL export a `createIncidentsApi` function providing typed `list`, `get`, `create`, `update`, and `delete` methods for the `/incidents` endpoint.

### Requirement: Typed CRUD operations for Maintenances
The system SHALL export a `createMaintenancesApi` function providing typed `list`, `get`, `create`, `update`, and `delete` methods for the `/maintenances` endpoint.

### Requirement: All API response types validated with Zod
The system SHALL validate all API response payloads against Zod schemas before returning them to callers.

#### Scenario: Response matches expected shape
- **WHEN** the API returns a valid monitor array
- **THEN** the response passes Zod validation and is returned typed

#### Scenario: Response shape is unexpected
- **WHEN** the API returns a response that does not match the expected Zod schema
- **THEN** a validation error is thrown with details about the mismatch

### Requirement: Network and auth errors abort immediately
The system SHALL detect network connectivity failures and authentication errors (401, 403) and abort the current command immediately rather than collecting them with other errors.

#### Scenario: Invalid API key
- **WHEN** the API returns 401 on the first request
- **THEN** the error is printed immediately and the command exits with code 1
