import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import type { KyInstance } from "ky";
import { createMonitorsApi } from "@/api/monitors";
import { createPagesApi } from "@/api/pages";
import { createTriggersApi } from "@/api/triggers";
import { createAlertConfigsApi } from "@/api/alert-configs";
import { createIncidentsApi } from "@/api/incidents";
import { createMaintenancesApi } from "@/api/maintenances";
import { loadManifests } from "@/manifest/loader";
import type { AnyManifest, ManifestKind } from "@/manifest/types";
import { reconcileMonitors } from "./resources/monitor";
import { reconcileTriggers } from "./resources/trigger";
import { reconcilePages } from "./resources/page";
import { reconcileAlertConfigs, type StateFile } from "./resources/alert-config";
import { reconcileIncidents } from "./resources/incident";
import { reconcileMaintenances } from "./resources/maintenance";
import { stripServerFields } from "./diff";
import type { Change, ChangeAction } from "./diff";
import { ValidationError } from "@/util/errors";

// Dependency order for apply: triggers first, maintenances last
const APPLY_ORDER: ManifestKind[] = [
  "AlertTrigger",
  "Monitor",
  "Page",
  "AlertConfig",
  "Incident",
  "Maintenance",
];

const DELETE_ORDER: ManifestKind[] = [...APPLY_ORDER].reverse();

export interface ReconcileContext {
  client: KyInstance;
  stateDir: string;
  dryRun: boolean;
  deleteOrphans: boolean;
  concurrency: number;
  kind?: ManifestKind;
  tag?: string;
  name?: string;
  path?: string;
}

export interface ReconcileResult {
  changes: Array<{ kind: string; key: string; action: ChangeAction; details: string }>;
  results: Array<{ kind: string; key: string; action: ChangeAction; success: boolean; error?: string }>;
  errors: string[];
}

export interface PlanResult {
  changes: Array<{ kind: string; key: string; action: ChangeAction; details: string }>;
}

export async function reconcile(ctx: ReconcileContext): Promise<ReconcileResult> {
  const { manifests, errors: validationErrors } = loadManifests(ctx.stateDir);

  if (validationErrors.length > 0) {
    throw new ValidationError(validationErrors);
  }

  const filtered = ctx.kind ? manifests.filter((m) => m.kind === ctx.kind) : manifests;

  const monitorsApi = createMonitorsApi(ctx.client);
  const pagesApi = createPagesApi(ctx.client);
  const triggersApi = createTriggersApi(ctx.client);
  const alertConfigsApi = createAlertConfigsApi(ctx.client);
  const incidentsApi = createIncidentsApi(ctx.client);
  const maintenancesApi = createMaintenancesApi(ctx.client);

  const stateFile = loadStateFile(ctx.stateDir);

  const kindGroups = groupByKind(filtered);
  const allChanges: Change<AnyManifest>[] = [];

  const reconcileOpts = {
    deleteOrphans: ctx.deleteOrphans,
    tag: ctx.tag,
    name: ctx.name,
    path: ctx.path,
  };

  for (const kind of APPLY_ORDER) {
    const desiredForKind = kindGroups.get(kind) ?? [];
    if (ctx.kind && ctx.kind !== kind) continue;

    let kindChanges: Change<AnyManifest>[] = [];

    switch (kind) {
      case "Monitor":
        kindChanges = await reconcileMonitors(
          monitorsApi, desiredForKind as Parameters<typeof reconcileMonitors>[1], reconcileOpts
        );
        break;
      case "AlertTrigger":
        kindChanges = (await reconcileTriggers(
          triggersApi, desiredForKind as Parameters<typeof reconcileTriggers>[1], reconcileOpts
        )).map((c) => ({ ...c, desired: c.desired as AnyManifest | null, actual: c.actual as AnyManifest | null }));
        break;
      case "Page":
        kindChanges = (await reconcilePages(
          pagesApi, desiredForKind as Parameters<typeof reconcilePages>[1], reconcileOpts
        )).map((c) => ({ ...c, desired: c.desired as AnyManifest | null, actual: c.actual as AnyManifest | null }));
        break;
      case "AlertConfig":
        kindChanges = (await reconcileAlertConfigs(
          alertConfigsApi, desiredForKind as Parameters<typeof reconcileAlertConfigs>[1], stateFile, reconcileOpts
        )).map((c) => ({ ...c, desired: c.desired as AnyManifest | null, actual: c.actual as AnyManifest | null }));
        break;
      case "Incident":
        kindChanges = (await reconcileIncidents(
          incidentsApi, desiredForKind as Parameters<typeof reconcileIncidents>[1], stateFile, reconcileOpts
        )).map((c) => ({ ...c, desired: c.desired as AnyManifest | null, actual: c.actual as AnyManifest | null }));
        break;
      case "Maintenance":
        kindChanges = (await reconcileMaintenances(
          maintenancesApi, desiredForKind as Parameters<typeof reconcileMaintenances>[1], stateFile, reconcileOpts
        )).map((c) => ({ ...c, desired: c.desired as AnyManifest | null, actual: c.actual as AnyManifest | null }));
        break;
    }

    allChanges.push(...kindChanges);
  }

  const planChanges = allChanges.map((c) => ({
    kind: (c.desired as AnyManifest)?.kind ?? (c.actual as AnyManifest)?.kind ?? "Unknown",
    key: c.key,
    action: c.action,
    details: getChangeDetails(c),
  }));

  if (ctx.dryRun) {
    return { changes: planChanges, results: [], errors: [] };
  }

  const activeChanges = allChanges.filter((c) => c.action !== "NOOP");
  const results = await applyChanges(activeChanges, ctx, {
    monitorsApi,
    pagesApi,
    triggersApi,
    alertConfigsApi,
    incidentsApi,
    maintenancesApi,
  });

  // Update state file
  const updatedState = updateStateFile(stateFile, activeChanges, results);
  saveStateFile(ctx.stateDir, updatedState);

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
  };
}

export async function plan(ctx: ReconcileContext): Promise<PlanResult> {
  const dryContext = { ...ctx, dryRun: true };
  const result = await reconcile(dryContext);
  return { changes: result.changes };
}

interface ApiSet {
  monitorsApi: ReturnType<typeof createMonitorsApi>;
  pagesApi: ReturnType<typeof createPagesApi>;
  triggersApi: ReturnType<typeof createTriggersApi>;
  alertConfigsApi: ReturnType<typeof createAlertConfigsApi>;
  incidentsApi: ReturnType<typeof createIncidentsApi>;
  maintenancesApi: ReturnType<typeof createMaintenancesApi>;
}

async function applyChanges(
  changes: Change<AnyManifest>[],
  _ctx: ReconcileContext,
  apis: ApiSet
): Promise<Array<{ kind: string; key: string; action: ChangeAction; success: boolean; error?: string; id?: number }>> {
  // Separate by action type and apply deletes first (reverse order), then creates/updates (forward order)
  const deletes = changes.filter((c) => c.action === "DELETE");
  const mutations = changes.filter((c) => c.action === "CREATE" || c.action === "UPDATE");

  const results: Array<{ kind: string; key: string; action: ChangeAction; success: boolean; error?: string; id?: number }> = [];

  // Process deletes in reverse dependency order
  for (const kind of DELETE_ORDER) {
    const kindDeletes = deletes.filter((c) => getChangeKind(c) === kind);
    for (const change of kindDeletes) {
      try {
        await executeDelete(change, apis);
        results.push({ kind, key: change.key, action: "DELETE", success: true });
      } catch (err) {
        results.push({
          kind, key: change.key, action: "DELETE", success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Process creates/updates in dependency order
  for (const kind of APPLY_ORDER) {
    const kindMutations = mutations.filter((c) => getChangeKind(c) === kind);
    for (const change of kindMutations) {
      try {
        const id = await executeMutation(change, apis);
        results.push({ kind, key: change.key, action: change.action, success: true, id });
      } catch (err) {
        results.push({
          kind, key: change.key, action: change.action, success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return results;
}

function getChangeKind(c: Change<AnyManifest>): ManifestKind {
  return (c.desired?.kind ?? c.actual?.kind ?? "Monitor") as ManifestKind;
}

async function executeDelete(change: Change<AnyManifest>, apis: ApiSet): Promise<void> {
  const kind = getChangeKind(change);
  const actual = change.actual as Record<string, unknown> | null;
  const id = actual?.id as number | undefined;

  if (!id) throw new Error("Cannot delete: no remote ID found");

  switch (kind) {
    case "Monitor": await apis.monitorsApi.delete(id); break;
    case "Page": await apis.pagesApi.delete(id); break;
    case "AlertTrigger": await apis.triggersApi.delete(id); break;
    case "AlertConfig": await apis.alertConfigsApi.delete(id); break;
    case "Incident": await apis.incidentsApi.delete(id); break;
    case "Maintenance": await apis.maintenancesApi.delete(id); break;
  }
}

async function executeMutation(change: Change<AnyManifest>, apis: ApiSet): Promise<number | undefined> {
  const kind = getChangeKind(change);
  const desired = change.desired as Record<string, unknown> | null;
  const actual = change.actual as Record<string, unknown> | null;

  if (!desired?.spec) throw new Error("Cannot apply: no spec in manifest");

  const spec = desired.spec as Record<string, unknown>;

  switch (kind) {
    case "Monitor": {
      const body = { ...spec, tag: (desired.metadata as Record<string, string>).tag } as import("@/api/types").CreateMonitorBody;
      if (change.action === "CREATE") {
        const result = await apis.monitorsApi.create(body);
        return result.id;
      } else {
        const id = actual?.id as number;
        if (!id) throw new Error("Cannot update: no remote ID");
        const result = await apis.monitorsApi.update(id, body as import("@/api/types").UpdateMonitorBody);
        return result.id;
      }
    }
    case "Page": {
      const body = { ...spec, path: (desired.metadata as Record<string, string>).path } as import("@/api/types").CreatePageBody;
      if (change.action === "CREATE") {
        const result = await apis.pagesApi.create(body);
        return result.id;
      } else {
        const id = actual?.id as number;
        if (!id) throw new Error("Cannot update: no remote ID");
        const result = await apis.pagesApi.update(id, body as import("@/api/types").UpdatePageBody);
        return result.id;
      }
    }
    case "AlertTrigger": {
      const body = { ...spec, name: (desired.metadata as Record<string, string>).name } as import("@/api/types").CreateAlertTriggerBody;
      if (change.action === "CREATE") {
        const result = await apis.triggersApi.create(body);
        return result.id;
      } else {
        const id = actual?.id as number;
        if (!id) throw new Error("Cannot update: no remote ID");
        const result = await apis.triggersApi.update(id, body as import("@/api/types").UpdateAlertTriggerBody);
        return result.id;
      }
    }
    case "AlertConfig": {
      const body = spec as import("@/api/types").CreateAlertConfigBody;
      if (change.action === "CREATE") {
        const result = await apis.alertConfigsApi.create(body);
        return result.id;
      } else {
        const id = actual?.id as number;
        if (!id) throw new Error("Cannot update: no remote ID");
        const result = await apis.alertConfigsApi.update(id, body as import("@/api/types").UpdateAlertConfigBody);
        return result.id;
      }
    }
    case "Incident": {
      const body = spec as import("@/api/types").CreateIncidentBody;
      if (change.action === "CREATE") {
        const result = await apis.incidentsApi.create(body);
        return result.id;
      } else {
        const id = actual?.id as number;
        if (!id) throw new Error("Cannot update: no remote ID");
        const result = await apis.incidentsApi.update(id, body as import("@/api/types").UpdateIncidentBody);
        return result.id;
      }
    }
    case "Maintenance": {
      const body = spec as import("@/api/types").CreateMaintenanceBody;
      if (change.action === "CREATE") {
        const result = await apis.maintenancesApi.create(body);
        return result.id;
      } else {
        const id = actual?.id as number;
        if (!id) throw new Error("Cannot update: no remote ID");
        const result = await apis.maintenancesApi.update(id, body as import("@/api/types").UpdateMaintenanceBody);
        return result.id;
      }
    }
    default:
      throw new Error(`Unknown kind: ${kind}`);
  }
}

function groupByKind(manifests: AnyManifest[]): Map<ManifestKind, AnyManifest[]> {
  const map = new Map<ManifestKind, AnyManifest[]>();
  for (const m of manifests) {
    const list = map.get(m.kind) ?? [];
    list.push(m);
    map.set(m.kind, list);
  }
  return map;
}

function getChangeDetails(c: Change<AnyManifest>): string {
  switch (c.action) {
    case "CREATE":
      return "(new)";
    case "DELETE":
      return "(orphan)";
    case "UPDATE":
      if (c.patch) {
        const keys = Object.keys(c.patch).join(", ");
        return keys || "(changed)";
      }
      return "(changed)";
    case "NOOP":
      return "—";
    default:
      return "";
  }
}

// ─── State file management ──────────────────────────────────────────────────

function stateFilePath(stateDir: string): string {
  return join(stateDir, "..", ".kener-ctl-state.json");
}

export function loadStateFile(stateDir: string): StateFile | null {
  const path = stateFilePath(stateDir);
  if (!existsSync(path)) return null;
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function saveStateFile(stateDir: string, state: StateFile): void {
  const path = stateFilePath(stateDir);
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const tmpPath = path + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(state, null, 2) + "\n", "utf-8");
  renameSync(tmpPath, path);
}

function updateStateFile(
  state: StateFile | null,
  changes: Change<AnyManifest>[],
  results: Array<{ kind: string; key: string; action: ChangeAction; success: boolean; id?: number }>
): StateFile {
  const newState: StateFile = state ? { ...state, version: state.version ?? 1 } : { version: 1 };
  newState.incidents = { ...(newState.incidents ?? {}) };
  newState.maintenances = { ...(newState.maintenances ?? {}) };
  newState.alertConfigs = { ...(newState.alertConfigs ?? {}) };

  for (const result of results) {
    if (!result.success) continue;
    const kind = (changes.find((c) =>
      c.key === result.key && c.action === result.action
    )?.desired?.kind ?? result.kind) as ManifestKind;

    switch (kind) {
      case "AlertConfig":
        if (result.action === "DELETE") {
          delete newState.alertConfigs![result.key];
        } else if (result.id !== undefined) {
          newState.alertConfigs![result.key] = result.id;
        }
        break;
      case "Incident":
        if (result.action === "DELETE") {
          delete newState.incidents![result.key];
        } else if (result.id !== undefined) {
          newState.incidents![result.key] = result.id;
        }
        break;
      case "Maintenance":
        if (result.action === "DELETE") {
          delete newState.maintenances![result.key];
        } else if (result.id !== undefined) {
          newState.maintenances![result.key] = result.id;
        }
        break;
    }
  }

  return newState;
}
