import type { IncidentsApi } from "@/api/incidents"
import type { Incident } from "@/api/types"
import type { IncidentManifest } from "@/manifest/types"
import type { Change } from "../diff"
import { diff, stripServerFields } from "../diff"
import type { StateFile } from "./alert-config"

export async function reconcileIncidents(
  api: IncidentsApi,
  desired: IncidentManifest[],
  stateFile: StateFile | null,
  opts: { deleteOrphans?: boolean; name?: string } = {},
): Promise<Change<IncidentManifest>[]> {
  const filtered = opts.name ? desired.filter((i) => i.metadata.name === opts.name) : desired

  const remote = await api.list()
  const stateIncidents = stateFile?.incidents ?? {}

  const desiredMap = new Map<string, IncidentManifest>()
  for (const i of filtered) {
    desiredMap.set(i.metadata.name, i)
  }

  const actualMap = new Map<string, Record<string, unknown>>()
  for (const r of remote) {
    const matchingName = findNameById(stateIncidents, r.id)
    if (matchingName && desiredMap.has(matchingName)) {
      actualMap.set(matchingName, incidentFromApi(r))
    } else if (opts.deleteOrphans) {
      const orphanKey = matchingName ?? `orphan-${r.id}`
      actualMap.set(orphanKey, incidentFromApi(r))
    }
  }

  return diff(desiredMap, actualMap, stripServerFields, {
    deleteOrphans: opts.deleteOrphans,
  })
}

function findNameById(stateMap: Record<string, number>, id: number): string | undefined {
  for (const [name, stateId] of Object.entries(stateMap)) {
    if (stateId === id) return name
  }
  return undefined
}

function incidentFromApi(incident: Incident): Record<string, unknown> {
  return {
    title: incident.title,
    state: incident.state,
    affectedMonitors: incident.affectedMonitors,
    updates: incident.updates,
    id: incident.id,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
  }
}
