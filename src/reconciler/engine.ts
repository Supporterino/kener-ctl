import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import type { KyInstance } from "ky"
import { createIncidentsApi } from "@/api/incidents"
import { createMaintenancesApi } from "@/api/maintenances"
import { createMonitorsApi } from "@/api/monitors"
import { createPagesApi } from "@/api/pages"
import type {
  CreateIncidentBody,
  CreateMaintenanceBody,
  CreateMonitorBody,
  CreatePageBody,
} from "@/api/types"
import { loadManifests } from "@/manifest/loader"
import type { AnyManifest, ManifestKind } from "@/manifest/types"
import { ValidationError } from "@/util/errors"
import type { Change, ChangeAction } from "./diff"
import { reconcileIncidents } from "./resources/incident"
import { reconcileMaintenances } from "./resources/maintenance"
import { reconcileMonitors } from "./resources/monitor"
import { reconcilePages } from "./resources/page"

const APPLY_ORDER: ManifestKind[] = ["Monitor", "Page", "Incident", "Maintenance"]

const DELETE_ORDER: ManifestKind[] = [...APPLY_ORDER].reverse()

export interface StateFile {
  version?: number
  incidents: Record<string, number>
  maintenances: Record<string, number>
}

export interface ReconcileContext {
  client: KyInstance
  manifestDir: string
  dryRun: boolean
  deleteOrphans: boolean
  concurrency: number
  stateFilePath: string
  kind?: ManifestKind
  tag?: string
  name?: string
  path?: string
}

export interface ReconcileResult {
  changes: Array<{ kind: string; key: string; action: ChangeAction; details: string }>
  results: Array<{
    kind: string
    key: string
    action: ChangeAction
    success: boolean
    error?: string
  }>
  errors: string[]
}

export interface PlanResult {
  changes: Array<{ kind: string; key: string; action: ChangeAction; details: string }>
}

export async function reconcile(ctx: ReconcileContext): Promise<ReconcileResult> {
  const { manifests, errors: validationErrors } = loadManifests(ctx.manifestDir)

  if (validationErrors.length > 0) {
    throw new ValidationError(validationErrors)
  }

  const filtered = ctx.kind ? manifests.filter((m) => m.kind === ctx.kind) : manifests

  const monitorsApi = createMonitorsApi(ctx.client)
  const pagesApi = createPagesApi(ctx.client)
  const incidentsApi = createIncidentsApi(ctx.client)
  const maintenancesApi = createMaintenancesApi(ctx.client)

  const stateFile = loadStateFile(ctx.stateFilePath)

  const kindGroups = groupByKind(filtered)
  const allChanges: Change<AnyManifest>[] = []

  const reconcileOpts = {
    deleteOrphans: ctx.deleteOrphans,
    tag: ctx.tag,
    name: ctx.name,
    path: ctx.path,
  }

  for (const kind of APPLY_ORDER) {
    const desiredForKind = kindGroups.get(kind) ?? []
    if (ctx.kind && ctx.kind !== kind) continue

    let kindChanges: Change<AnyManifest>[] = []

    switch (kind) {
      case "Monitor":
        kindChanges = await reconcileMonitors(
          monitorsApi,
          desiredForKind as Parameters<typeof reconcileMonitors>[1],
          reconcileOpts,
        )
        break
      case "Page":
        kindChanges = (
          await reconcilePages(
            pagesApi,
            desiredForKind as Parameters<typeof reconcilePages>[1],
            reconcileOpts,
          )
        ).map((c) => ({
          ...c,
          desired: c.desired as AnyManifest | null,
          actual: c.actual as AnyManifest | null,
        }))
        break
      case "Incident":
        kindChanges = (
          await reconcileIncidents(
            incidentsApi,
            desiredForKind as Parameters<typeof reconcileIncidents>[1],
            stateFile,
            reconcileOpts,
          )
        ).map((c) => ({
          ...c,
          desired: c.desired as AnyManifest | null,
          actual: c.actual as AnyManifest | null,
        }))
        break
      case "Maintenance":
        kindChanges = (
          await reconcileMaintenances(
            maintenancesApi,
            desiredForKind as Parameters<typeof reconcileMaintenances>[1],
            stateFile,
            reconcileOpts,
          )
        ).map((c) => ({
          ...c,
          desired: c.desired as AnyManifest | null,
          actual: c.actual as AnyManifest | null,
        }))
        break
    }

    allChanges.push(...kindChanges)
  }

  const planChanges = allChanges.map((c) => ({
    kind: (c.desired as AnyManifest)?.kind ?? (c.actual as AnyManifest)?.kind ?? "Unknown",
    key: c.key,
    action: c.action,
    details: getChangeDetails(c),
  }))

  if (ctx.dryRun) {
    return { changes: planChanges, results: [], errors: [] }
  }

  const activeChanges = allChanges.filter((c) => c.action !== "NOOP")
  const results = await applyChanges(activeChanges, ctx, {
    monitorsApi,
    pagesApi,
    incidentsApi,
    maintenancesApi,
  })

  const updatedState = updateStateFile(stateFile, activeChanges, results)
  saveStateFile(ctx.stateFilePath, updatedState)

  return {
    changes: planChanges,
    results: results.map((r) => ({
      kind: r.kind,
      key: r.key,
      action: r.action,
      success: r.success,
      error: r.error,
    })),
    errors: results.filter((r) => !r.success).map((r) => r.error ?? "unknown"),
  }
}

export async function plan(ctx: ReconcileContext): Promise<PlanResult> {
  const dryContext = { ...ctx, dryRun: true }
  const result = await reconcile(dryContext)
  return { changes: result.changes }
}

interface ApiSet {
  monitorsApi: ReturnType<typeof createMonitorsApi>
  pagesApi: ReturnType<typeof createPagesApi>
  incidentsApi: ReturnType<typeof createIncidentsApi>
  maintenancesApi: ReturnType<typeof createMaintenancesApi>
}

async function applyChanges(
  changes: Change<AnyManifest>[],
  _ctx: ReconcileContext,
  apis: ApiSet,
): Promise<
  Array<{
    kind: string
    key: string
    action: ChangeAction
    success: boolean
    error?: string
    id?: number
  }>
> {
  const deletes = changes.filter((c) => c.action === "DELETE")
  const mutations = changes.filter((c) => c.action === "CREATE" || c.action === "UPDATE")

  const results: Array<{
    kind: string
    key: string
    action: ChangeAction
    success: boolean
    error?: string
    id?: number
  }> = []

  for (const kind of DELETE_ORDER) {
    const kindDeletes = deletes.filter((c) => getChangeKind(c) === kind)
    for (const change of kindDeletes) {
      try {
        await executeDelete(change, apis)
        results.push({ kind, key: change.key, action: "DELETE", success: true })
      } catch (err) {
        results.push({
          kind,
          key: change.key,
          action: "DELETE",
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  for (const kind of APPLY_ORDER) {
    const kindMutations = mutations.filter((c) => getChangeKind(c) === kind)
    for (const change of kindMutations) {
      try {
        const id = await executeMutation(change, apis)
        results.push({ kind, key: change.key, action: change.action, success: true, id })
      } catch (err) {
        results.push({
          kind,
          key: change.key,
          action: change.action,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  return results
}

function getChangeKind(c: Change<AnyManifest>): ManifestKind {
  return (c.desired?.kind ?? c.actual?.kind ?? "Monitor") as ManifestKind
}

async function executeDelete(change: Change<AnyManifest>, apis: ApiSet): Promise<void> {
  const kind = getChangeKind(change)
  const desired = change.desired as Record<string, unknown> | null
  const actual = change.actual as Record<string, unknown> | null

  switch (kind) {
    case "Monitor": {
      const tag =
        (desired?.metadata as Record<string, string>)?.tag ??
        (actual?.metadata as Record<string, string>)?.tag
      if (!tag) throw new Error("Cannot deactivate: no tag found")
      await apis.monitorsApi.deactivate(tag)
      break
    }
    case "Page": {
      const pagePath =
        (desired?.metadata as Record<string, string>)?.path ??
        (actual?.metadata as Record<string, string>)?.path
      if (!pagePath && pagePath !== "") throw new Error("Cannot delete: no page_path found")
      await apis.pagesApi.delete(pagePath ?? "")
      break
    }
    case "Incident": {
      const id = (actual as Record<string, unknown>)?.id as number | undefined
      if (!id) throw new Error("Cannot delete: no remote ID found")
      await apis.incidentsApi.delete(id)
      break
    }
    case "Maintenance": {
      const id = (actual as Record<string, unknown>)?.id as number | undefined
      if (!id) throw new Error("Cannot delete: no remote ID found")
      await apis.maintenancesApi.delete(id)
      break
    }
  }
}

async function executeMutation(
  change: Change<AnyManifest>,
  apis: ApiSet,
): Promise<number | undefined> {
  const kind = getChangeKind(change)
  const desired = change.desired as Record<string, unknown> | null

  if (!desired?.spec) throw new Error("Cannot apply: no spec in manifest")

  const spec = desired.spec as Record<string, unknown>
  const metadata = desired.metadata as Record<string, string>

  switch (kind) {
    case "Monitor": {
      const tag = metadata.tag
      if (!tag) throw new Error("Cannot apply: no tag in metadata")
      const body: CreateMonitorBody = {
        tag,
        name: (spec.name as string) ?? tag,
        monitor_type: (spec.type as string) ?? "NONE",
        cron: (spec.cronSchedule as string) ?? "* * * * *",
        default_status: (spec.defaultStatus as string) ?? "DOWN",
        description: spec.description as string | undefined,
        category_name: spec.categoryName as string | undefined,
        type_data: spec.typeData as Record<string, unknown> | undefined,
        day_degraded_minimum_count: spec.dayDegradedMinCount as number | undefined,
        day_down_minimum_count: spec.dayDownMinCount as number | undefined,
      }
      if (change.action === "CREATE") {
        const result = await apis.monitorsApi.create(body)
        return result.tag as unknown as number | undefined
      } else {
        const result = await apis.monitorsApi.update(tag, { ...body, status: "ACTIVE" })
        return result.tag as unknown as number | undefined
      }
    }
    case "Page": {
      const pagePath = metadata.path ?? ""
      const body: CreatePageBody = {
        page_path: pagePath,
        page_title: (spec.title as string) ?? pagePath,
        page_header: spec.header as string | undefined,
        page_subheader: spec.pageContent as string | undefined,
        monitors: spec.monitors as string[] | undefined,
      }
      if (change.action === "CREATE") {
        const result = await apis.pagesApi.create(body)
        return result.id
      } else {
        const result = await apis.pagesApi.update(pagePath, body)
        return result.id
      }
    }
    case "Incident": {
      const body: CreateIncidentBody = {
        title: (spec.title as string) ?? "Untitled",
        start_date_time: spec.startDatetime as number,
        monitors: (
          spec.affectedMonitors as Array<{ tag: string; impact: string }> | undefined
        )?.map((m) => ({
          monitor_tag: m.tag,
          impact: m.impact as "DOWN" | "DEGRADED",
        })),
      }
      if (change.action === "CREATE") {
        const result = await apis.incidentsApi.create(body)
        return result.id
      } else {
        const id = (change.actual as Record<string, unknown>)?.id as number | undefined
        if (!id) throw new Error("Cannot update: no remote ID")
        const result = await apis.incidentsApi.update(id, body)
        return result.id
      }
    }
    case "Maintenance": {
      const body: CreateMaintenanceBody = {
        title: (spec.title as string) ?? "Untitled",
        start_date_time: spec.startDatetime as number,
        rrule: spec.rrule as string,
        duration_seconds: spec.durationSeconds as number,
        monitors: (spec.monitors as string[] | undefined)?.map((tag: string) => ({
          monitor_tag: tag,
          impact: "DOWN" as const,
        })),
      }
      if (change.action === "CREATE") {
        const result = await apis.maintenancesApi.create(body)
        return result.id
      } else {
        const id = (change.actual as Record<string, unknown>)?.id as number | undefined
        if (!id) throw new Error("Cannot update: no remote ID")
        const result = await apis.maintenancesApi.update(id, body)
        return result.id
      }
    }
    default:
      throw new Error(`Unknown kind: ${kind}`)
  }
}

function groupByKind(manifests: AnyManifest[]): Map<ManifestKind, AnyManifest[]> {
  const map = new Map<ManifestKind, AnyManifest[]>()
  for (const m of manifests) {
    const list = map.get(m.kind) ?? []
    list.push(m)
    map.set(m.kind, list)
  }
  return map
}

function getChangeDetails(c: Change<AnyManifest>): string {
  switch (c.action) {
    case "CREATE":
      return "(new)"
    case "DELETE":
      return getChangeKind(c) === "Monitor" ? "(deactivated)" : "(orphan)"
    case "UPDATE":
      if (c.patch) {
        const keys = Object.keys(c.patch).join(", ")
        return keys || "(changed)"
      }
      return "(changed)"
    case "NOOP":
      return "—"
    default:
      return ""
  }
}

// ─── State file management ──────────────────────────────────────────────────

export function loadStateFile(path: string): StateFile | null {
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, "utf-8")
    const parsed = JSON.parse(content)
    return {
      version: parsed.version ?? 1,
      incidents: parsed.incidents ?? {},
      maintenances: parsed.maintenances ?? {},
    }
  } catch {
    return null
  }
}

export function saveStateFile(path: string, state: StateFile): void {
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const tmpPath = `${path}.tmp`
  writeFileSync(tmpPath, `${JSON.stringify(state, null, 2)}\n`, "utf-8")
  renameSync(tmpPath, path)
}

function updateStateFile(
  state: StateFile | null,
  changes: Change<AnyManifest>[],
  results: Array<{
    kind: string
    key: string
    action: ChangeAction
    success: boolean
    id?: number
  }>,
): StateFile {
  const newState: StateFile = {
    version: state?.version ?? 1,
    incidents: { ...(state?.incidents ?? {}) },
    maintenances: { ...(state?.maintenances ?? {}) },
  }

  for (const result of results) {
    if (!result.success) continue
    const kind = (changes.find((c) => c.key === result.key && c.action === result.action)?.desired
      ?.kind ?? result.kind) as ManifestKind

    switch (kind) {
      case "Incident":
        if (result.action === "DELETE") {
          delete newState.incidents[result.key]
        } else if (result.id !== undefined) {
          newState.incidents[result.key] = result.id
        }
        break
      case "Maintenance":
        if (result.action === "DELETE") {
          delete newState.maintenances[result.key]
        } else if (result.id !== undefined) {
          newState.maintenances[result.key] = result.id
        }
        break
    }
  }

  return newState
}
