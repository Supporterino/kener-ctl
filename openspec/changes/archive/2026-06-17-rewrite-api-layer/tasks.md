## 1. Rewrite API Type Schemas (`src/api/types.ts`)

- [x] 1.1 Rewrite MonitorSchema with snake_case fields matching live API response (tag, name, description, image, cron, default_status, status, category_name, monitor_type, type_data, day_degraded_minimum_count, day_down_minimum_count, include_degraded_in_downtime, is_hidden, monitor_settings_json, external_url, created_at, updated_at)
- [x] 1.2 Rewrite MonitorListResponseSchema as `z.object({ monitors: z.array(MonitorSchema) })`
- [x] 1.3 Rewrite MonitorResponseSchema as `z.object({ monitor: MonitorSchema })` (single-resource wrapper)
- [x] 1.4 Rewrite CreateMonitorBodySchema with snake_case required fields (tag, name, cron, default_status, monitor_type) and optional fields (description, image, category_name, type_data, day_degraded_minimum_count, day_down_minimum_count, include_degraded_in_downtime, is_hidden)
- [x] 1.5 Rewrite UpdateMonitorBodySchema as CreateMonitorBodySchema.partial() plus `status` field for deactivation
- [x] 1.6 Rewrite PageSchema with snake_case fields (id, page_path, page_title, page_header, page_subheader, page_logo, page_settings, monitors as array of { monitor_tag, position }, created_at, updated_at)
- [x] 1.7 Rewrite PageListResponseSchema as `z.object({ pages: z.array(PageSchema) })`
- [x] 1.8 Rewrite PageResponseSchema as `z.object({ page: PageSchema })`
- [x] 1.9 Rewrite CreatePageBodySchema with snake_case (page_path, page_title, page_header, page_subheader, page_logo, page_settings, monitors)
- [x] 1.10 Rewrite UpdatePageBodySchema as CreatePageBodySchema.partial()
- [x] 1.11 Rewrite IncidentSchema with snake_case fields (id, title, start_date_time as number, end_date_time as number|null, state, incident_type, incident_source, monitors as array of { monitor_tag, impact }, created_at, updated_at)
- [x] 1.12 Rewrite IncidentListResponseSchema as `z.object({ incidents: z.array(IncidentSchema) })`
- [x] 1.13 Rewrite IncidentResponseSchema as `z.object({ incident: IncidentSchema })`
- [x] 1.14 Rewrite CreateIncidentBodySchema with snake_case (title, start_date_time as number, monitors)
- [x] 1.15 Rewrite UpdateIncidentBodySchema as CreateIncidentBodySchema.partial() plus optional end_date_time
- [x] 1.16 Rewrite MaintenanceSchema with snake_case fields (id, title, description, start_date_time as number, rrule, duration_seconds, status, monitors as array of { monitor_tag, impact }, created_at, updated_at) — no end_date_time
- [x] 1.17 Rewrite MaintenanceListResponseSchema as `z.object({ maintenances: z.array(MaintenanceSchema) })`
- [x] 1.18 Rewrite MaintenanceResponseSchema as `z.object({ maintenance: MaintenanceSchema })`
- [x] 1.19 Rewrite CreateMaintenanceBodySchema with snake_case (title, start_date_time as number, rrule, duration_seconds, monitors)
- [x] 1.20 Rewrite UpdateMaintenanceBodySchema as CreateMaintenanceBodySchema.partial()
- [x] 1.21 Remove AlertTriggerSchema and AlertConfigSchema and all related types
- [x] 1.22 Ensure all z.infer<> type exports are updated

## 2. Rewrite API Modules

- [x] 2.1 Rewrite `src/api/monitors.ts`: update `list()` to unwrap `{ monitors }`, `get()` to use tag-based path and unwrap `{ monitor }`, `create()` to unwrap, `update()` to use tag-based path and unwrap, replace `delete()` with `deactivate()` (PATCH with status:"INACTIVE")
- [x] 2.2 Rewrite `src/api/pages.ts`: update `list()` to unwrap `{ pages }`, `create()` to unwrap `{ page }`, `update()` to use page_path-based path and unwrap, `delete()` to use page_path-based path. Remove `get()` method (no reliable single-page fetch endpoint found)
- [x] 2.3 Rewrite `src/api/incidents.ts`: update `list()` to unwrap `{ incidents }`, `create()` to unwrap `{ incident }`, `update()` to use numeric id path and unwrap, `delete()` to use numeric id path
- [x] 2.4 Rewrite `src/api/maintenances.ts`: update `list()` to unwrap `{ maintenances }`, `get()` to use numeric id path and unwrap `{ maintenance }`, `create()` to unwrap, `update()` to use numeric id path and unwrap, `delete()` to use numeric id path
- [x] 2.5 Delete `src/api/triggers.ts`
- [x] 2.6 Delete `src/api/alert-configs.ts`

## 3. Update Manifest Schemas

- [x] 3.1 Update MonitorManifestSchema: remove AlertTrigger/AlertConfig from discriminated union, update field names to match design decisions (keep camelCase for user-facing, add `type: "NONE"` to valid monitor types)
- [x] 3.2 Update PageManifestSchema: change root path convention from `~home` to `""`, update monitors field spec
- [x] 3.3 Update IncidentManifestSchema: add `startDatetime` as unix timestamp number, update `affectedMonitors` shape to `[{ tag, impact }]`, note that `state` is not managed via API
- [x] 3.4 Update MaintenanceManifestSchema: add `rrule` and `durationSeconds` as required, remove `endDatetime`, update monitors field
- [x] 3.5 Remove AlertTriggerManifestSchema and AlertConfigManifestSchema from `AnyManifestSchema` discriminated union
- [x] 3.6 Add descriptive error message for `kind: AlertTrigger` and `kind: AlertConfig` (rejected with explanation)
- [x] 3.7 Update `src/manifest/types.ts` to remove AlertTrigger/AlertConfig types

## 4. Update Reconciler Layer

- [x] 4.1 Rewrite `src/reconciler/resources/monitor.ts`: update `manifestFromMonitor()` to translate snake_case API fields → camelCase manifest fields. Change DELETE execution to PATCH with status:"INACTIVE". Handle reactivation (CREATE for deactivated monitors → PATCH status:"ACTIVE")
- [x] 4.2 Rewrite `src/reconciler/resources/page.ts`: update `pageFromApi()` to translate snake_case → camelCase. Update root path matching (`""` not `"~home"`). Update monitor list translation (`[{monitor_tag, position}]` → `[tag]`)
- [x] 4.3 Rewrite `src/reconciler/resources/incident.ts`: update to use snake_case types from API, translate to camelCase for diff. Exclude `state` from diff comparison (immutable). Use unix timestamps for start_date_time
- [x] 4.4 Rewrite `src/reconciler/resources/maintenance.ts`: update to use snake_case types, translate to camelCase. Handle `rrule` and `duration_seconds`. Omit `end_date_time`
- [x] 4.5 Delete `src/reconciler/resources/trigger.ts`
- [x] 4.6 Delete `src/reconciler/resources/alert-config.ts`
- [x] 4.7 Update `src/reconciler/engine.ts`: remove AlertTrigger and AlertConfig from APPLY_ORDER and DELETE_ORDER (new order: Monitor → Page → Incident → Maintenance). Remove trigger and alert-config API imports and reconcile calls. Remove AlertConfig from state file handling. Update state file to only track Incidents and Maintenances
- [x] 4.8 Update `src/reconciler/diff.ts`: update `stripServerFields` to use snake_case field names (`id`, `created_at`, `updated_at`)

## 5. Update CLI Commands

- [x] 5.1 Update `src/cli/pull.ts`: remove AlertTrigger and AlertConfig from the default kinds list (only 4 kinds now). Update `serializeToYaml` to produce proper YAML with camelCase fields (add translation from API snake_case → manifest camelCase before writing). Handle response unwrapping. Remove switch cases for trigger and alert-config
- [x] 5.2 Update `src/cli/get.ts`: remove trigger and alert-config from valid kinds. Update monitor get to use tag-based paths. Update page get to use page_path. Handle error for unsupported kinds
- [x] 5.3 Update `src/cli/delete.ts`: remove trigger and alert-config from valid kinds. Change monitor deletion from DELETE to PATCH deactivation with user-facing note. Update kind hints
- [x] 5.4 Update `src/cli/shared.ts`: remove `trigger`, `triggers`, `alert-config`, `alert-configs` from kindMappings. Update kindArg valueHint
- [x] 5.5 Update `src/cli/validate.ts`: ensure rejected AlertTrigger/AlertConfig manifests produce clear error messages
- [x] 5.6 Update `src/cli/apply.ts` and `src/cli/plan.ts`: no structural changes needed (they call the reconciler which is updated). Verify no AlertTrigger/AlertConfig references remain
- [x] 5.7 Update `src/cli/index.ts`: update command descriptions if they mention the 6 kinds (change to 4)

## 6. Update Exports and Public API

- [x] 6.1 Update `src/api/client.ts`: no changes expected (base URL, auth, retry logic unchanged)
- [x] 6.2 Verify all import paths are correct after file deletions (triggers.ts, alert-configs.ts, trigger.ts, alert-config.ts)
- [x] 6.3 Add `is_hidden` filter to monitor list if design decides to filter out hidden/deactivated monitors by default

## 7. Rewrite Tests

- [x] 7.1 Rewrite `tests/api/monitors.test.ts`: update mock response shapes to use wrapper objects and snake_case fields. Test tag-based paths. Test deactivate instead of delete. Test response unwrapping
- [x] 7.2 Rewrite `tests/api/pages.test.ts`: update mock responses to use wrapper objects and snake_case fields. Test page_path-based paths
- [x] 7.3 Rewrite `tests/api/incidents.test.ts`: update mock responses with wrapper objects and snake_case. Test unix timestamps. Test that state exclusion works
- [x] 7.4 Rewrite `tests/api/maintenances.test.ts`: update mock responses with wrapper objects. Test rrule/duration_seconds required. Test absence of end_date_time
- [x] 7.5 Delete `tests/api/triggers.test.ts`
- [x] 7.6 Delete `tests/api/alert-configs.test.ts`
- [x] 7.7 Rewrite `tests/reconciler/monitor.test.ts`: update mocks to use new API shapes. Test deactivation logic. Test reactivation of deactivated monitors
- [x] 7.8 Rewrite `tests/reconciler/page.test.ts`: update mocks. Test root path matching with empty string
- [x] 7.9 Rewrite `tests/reconciler/incident.test.ts`: update mocks. Test state exclusion from diff
- [x] 7.10 Rewrite `tests/reconciler/maintenance.test.ts`: update mocks. Test rrule and duration_seconds
- [x] 7.11 Delete `tests/reconciler/trigger.test.ts`
- [x] 7.12 Delete `tests/reconciler/alert-config.test.ts`
- [x] 7.13 Update `tests/reconciler/engine.test.ts`: update reconcile order expectations, remove AlertTrigger/AlertConfig test cases
- [x] 7.14 Update `tests/reconciler/diff.test.ts`: update stripServerFields tests for snake_case field names
- [x] 7.15 Update `tests/cli/pull.test.ts`: update mock API responses for pull tests, verify translation to camelCase
- [x] 7.16 Update `tests/cli/get.test.ts`: update for new identifier semantics
- [x] 7.17 Update `tests/cli/delete.test.ts`: update for monitor deactivation
- [x] 7.18 Update `tests/manifest/schema.test.ts`: remove AlertTrigger/AlertConfig test cases. Add rejection test cases. Update valid kind list to 4. Add NONE monitor type test
- [x] 7.19 Update `tests/manifest/loader.test.ts`: remove AlertTrigger/AlertConfig test fixtures

## 8. Update Examples and Documentation

- [x] 8.1 Update `examples/` directory: remove alert-trigger and alert-config example manifests. Update existing examples for new field names/semantics
- [x] 8.2 Update `AGENTS.md` to accurately reflect the Kener v4 API surface (add note about discovered API shapes, update resource kind count to 4, document snake_case API convention, document monitor deactivation)

## 9. Verification

- [x] 9.1 Run `bun run typecheck` — confirm zero type errors
- [x] 9.2 Run `bun run lint` — confirm zero lint errors
- [x] 9.3 Run `bun run format:check` — confirm formatting passes
- [x] 9.4 Run `bun test` — confirm all tests pass
- [x] 9.5 Run `bun run build` — confirm build succeeds
- [x] 9.6 Manual end-to-end: `kener-ctl pull` against live Kener v4 instance — confirm YAML manifests are written correctly
- [x] 9.7 Manual end-to-end: `kener-ctl plan` against live Kener v4 instance — confirm zero-change output when manifests match remote
- [x] 9.8 Manual end-to-end: `kener-ctl get monitors` — confirm table output with correct fields
