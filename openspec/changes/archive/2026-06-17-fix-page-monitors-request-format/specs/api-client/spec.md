## MODIFIED Requirements

### Requirement: Typed CRUD operations for Pages
The system SHALL export a `createPagesApi` function providing typed `list`, `create`, `update`, and `delete` methods for the `/pages` endpoint. Pages SHALL be identified by their `page_path` string. All responses SHALL be unwrapped. The `monitors` field in create and update request bodies SHALL be an array of monitor tag strings (`string[]`), matching the Kener v4 API's expected input format.

#### Scenario: List all pages
- **WHEN** `pagesApi.list()` is called
- **THEN** a GET request is sent to `/api/v4/pages`, the response `{ "pages": [...] }` is validated and the inner array of page objects is returned. The response `monitors` field contains objects (`[{ monitor_tag, position }]`) as returned by the server.

#### Scenario: Create page
- **WHEN** `pagesApi.create(body)` is called with valid `page_path`, `page_title`, `page_header`, and `monitors: ["gitlab-shell"]`
- **THEN** a POST request is sent to `/api/v4/pages` with monitors as a string array, and the unwrapped page object is returned

#### Scenario: Update page by path
- **WHEN** `pagesApi.update("services", patch)` is called with `monitors: ["api-v1"]`
- **THEN** a PATCH request is sent to `/api/v4/pages/services` with monitors as a string array, and the unwrapped page object is returned

#### Scenario: Delete page by path
- **WHEN** `pagesApi.delete("services")` is called
- **THEN** a DELETE request is sent to `/api/v4/pages/services`
