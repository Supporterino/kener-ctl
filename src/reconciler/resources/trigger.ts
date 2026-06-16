import type { TriggersApi } from "@/api/triggers";
import type { AlertTrigger } from "@/api/types";
import type { AlertTriggerManifest } from "@/manifest/types";
import { diff, stripServerFields } from "../diff";
import type { Change } from "../diff";

export async function reconcileTriggers(
  api: TriggersApi,
  desired: AlertTriggerManifest[],
  opts: { deleteOrphans?: boolean; name?: string } = {}
): Promise<Change<AlertTriggerManifest>[]> {
  const filtered = opts.name ? desired.filter((t) => t.metadata.name === opts.name) : desired;

  const remote = await api.list();

  const desiredMap = new Map<string, AlertTriggerManifest>();
  for (const t of filtered) {
    desiredMap.set(t.metadata.name, t);
  }

  const actualMap = new Map<string, Record<string, unknown>>();
  for (const r of remote) {
    actualMap.set(r.name, triggerFromApi(r));
  }

  return diff(desiredMap, actualMap, stripServerFields, {
    deleteOrphans: opts.deleteOrphans,
  });
}

function triggerFromApi(trigger: AlertTrigger): Record<string, unknown> {
  return {
    name: trigger.name,
    type: trigger.type,
    webhookUrl: trigger.webhookUrl,
    emailAddresses: trigger.emailAddresses,
    discordChannelId: trigger.discordChannelId,
    id: trigger.id,
    createdAt: trigger.createdAt,
    updatedAt: trigger.updatedAt,
  };
}
