import type { MonitorsApi } from "@/api/monitors"
import type { Monitor } from "@/api/types"
import type { MonitorManifest } from "@/manifest/types"
import type { Change } from "../diff"
import { diff, stripServerFields } from "../diff"

export async function reconcileMonitors(
  api: MonitorsApi,
  desired: MonitorManifest[],
  opts: { deleteOrphans?: boolean; tag?: string } = {},
): Promise<Change<MonitorManifest>[]> {
  const filtered = opts.tag ? desired.filter((m) => m.metadata.tag === opts.tag) : desired

  const remote = await api.list()

  const desiredMap = new Map<string, MonitorManifest>()
  for (const m of filtered) {
    desiredMap.set(m.metadata.tag, m)
  }

  const actualMap = new Map<string, Record<string, unknown>>()
  for (const r of remote) {
    actualMap.set(r.tag, manifestFromMonitor(r))
  }

  return diff(desiredMap, actualMap, stripServerFields, {
    deleteOrphans: opts.deleteOrphans,
  })
}

function manifestFromMonitor(monitor: Monitor): Record<string, unknown> {
  return {
    kind: "Monitor",
    metadata: {
      tag: monitor.tag,
    },
    spec: {
      name: monitor.name,
      description: monitor.description ?? "",
      type: monitor.monitor_type,
      categoryName: monitor.category_name ?? undefined,
      cronSchedule: monitor.cron,
      defaultStatus: monitor.default_status,
      gracePeriod: undefined,
      dayDegradedMinCount: monitor.day_degraded_minimum_count ?? undefined,
      dayDownMinCount: monitor.day_down_minimum_count ?? undefined,
      typeData: monitor.type_data,
    },
    created_at: monitor.created_at,
    updated_at: monitor.updated_at,
  }
}
