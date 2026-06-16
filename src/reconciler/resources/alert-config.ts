import type { AlertConfigsApi } from "@/api/alert-configs";
import type { AlertConfig } from "@/api/types";
import type { AlertConfigManifest } from "@/manifest/types";
import { diff, stripServerFields } from "../diff";
import type { Change } from "../diff";

export interface StateFile {
  version: number;
  alertConfigs?: Record<string, number>;
  incidents?: Record<string, number>;
  maintenances?: Record<string, number>;
}

export async function reconcileAlertConfigs(
  api: AlertConfigsApi,
  desired: AlertConfigManifest[],
  stateFile: StateFile | null,
  opts: { deleteOrphans?: boolean; name?: string } = {}
): Promise<Change<AlertConfigManifest>[]> {
  const filtered = opts.name ? desired.filter((a) => a.metadata.name === opts.name) : desired;

  const remote = await api.list();
  const stateConfigs = stateFile?.alertConfigs ?? {};

  const desiredMap = new Map<string, AlertConfigManifest>();
  for (const a of filtered) {
    desiredMap.set(a.metadata.name, a);
  }

  const actualMap = new Map<string, Record<string, unknown>>();
  for (const r of remote) {
    const matchingName = findNameById(stateConfigs, r.id);
    if (matchingName && desiredMap.has(matchingName)) {
      actualMap.set(matchingName, configFromApi(r));
    } else if (opts.deleteOrphans) {
      // include orphaned configs for deletion
      const orphanKey = matchingName ?? `orphan-${r.id}`;
      actualMap.set(orphanKey, configFromApi(r));
    }
  }

  return diff(desiredMap, actualMap, stripServerFields, {
    deleteOrphans: opts.deleteOrphans,
  });
}

function findNameById(stateConfigs: Record<string, number>, id: number): string | undefined {
  for (const [name, stateId] of Object.entries(stateConfigs)) {
    if (stateId === id) return name;
  }
  return undefined;
}

function configFromApi(config: AlertConfig): Record<string, unknown> {
  return {
    monitorTag: config.monitorTag,
    alertType: config.alertType,
    alertValue: config.alertValue,
    failureThreshold: config.failureThreshold,
    successThreshold: config.successThreshold,
    severity: config.severity,
    createIncident: config.createIncident,
    triggers: config.triggers,
    id: config.id,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}
