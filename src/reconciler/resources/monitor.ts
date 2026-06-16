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
    tag: monitor.tag,
    name: monitor.name,
    description: monitor.description,
    type: monitor.type,
    categoryName: monitor.categoryName,
    cronSchedule: monitor.cronSchedule,
    defaultStatus: monitor.defaultStatus,
    gracePeriod: monitor.gracePeriod,
    dayDegradedMinCount: monitor.dayDegradedMinCount,
    dayDownMinCount: monitor.dayDownMinCount,
    typeData: monitor.typeData,
    id: monitor.id,
    createdAt: monitor.createdAt,
    updatedAt: monitor.updatedAt,
  }
}
