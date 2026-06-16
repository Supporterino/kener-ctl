import type { MaintenancesApi } from "@/api/maintenances";
import type { Maintenance } from "@/api/types";
import type { MaintenanceManifest } from "@/manifest/types";
import { diff, stripServerFields } from "../diff";
import type { Change } from "../diff";
import type { StateFile } from "./alert-config";

export async function reconcileMaintenances(
  api: MaintenancesApi,
  desired: MaintenanceManifest[],
  stateFile: StateFile | null,
  opts: { deleteOrphans?: boolean; name?: string } = {}
): Promise<Change<MaintenanceManifest>[]> {
  const filtered = opts.name ? desired.filter((m) => m.metadata.name === opts.name) : desired;

  const remote = await api.list();
  const stateMaintenances = stateFile?.maintenances ?? {};

  const desiredMap = new Map<string, MaintenanceManifest>();
  for (const m of filtered) {
    desiredMap.set(m.metadata.name, m);
  }

  const actualMap = new Map<string, Record<string, unknown>>();
  for (const r of remote) {
    const matchingName = findNameById(stateMaintenances, r.id);
    if (matchingName && desiredMap.has(matchingName)) {
      actualMap.set(matchingName, maintenanceFromApi(r));
    } else if (opts.deleteOrphans) {
      const orphanKey = matchingName ?? `orphan-${r.id}`;
      actualMap.set(orphanKey, maintenanceFromApi(r));
    }
  }

  return diff(desiredMap, actualMap, stripServerFields, {
    deleteOrphans: opts.deleteOrphans,
  });
}

function findNameById(stateMap: Record<string, number>, id: number): string | undefined {
  for (const [name, stateId] of Object.entries(stateMap)) {
    if (stateId === id) return name;
  }
  return undefined;
}

function maintenanceFromApi(m: Maintenance): Record<string, unknown> {
  return {
    title: m.title,
    monitors: m.monitors,
    startDatetime: m.startDatetime,
    endDatetime: m.endDatetime,
    rrule: m.rrule,
    id: m.id,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}
