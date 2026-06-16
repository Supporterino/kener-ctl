import { describe, expect, it } from "bun:test"
import type { IncidentsApi } from "@/api/incidents"
import type { Incident } from "@/api/types"
import type { IncidentManifest } from "@/manifest/types"
import type { StateFile } from "@/reconciler/resources/alert-config"
import { reconcileIncidents } from "@/reconciler/resources/incident"

function mockIncidentsApi(incidents: Incident[]): IncidentsApi {
  return {
    list: async () => incidents,
    get: async () => ({}) as Incident,
    create: async () => ({}) as Incident,
    update: async () => ({}) as Incident,
    delete: async () => {},
  }
}

function makeIncident(id: number, title: string): Incident {
  return {
    id,
    title,
    state: "INVESTIGATING",
    affectedMonitors: [],
    updates: [],
  }
}

function makeManifest(
  name: string,
  specOverrides: Partial<IncidentManifest["spec"]> = {},
): IncidentManifest {
  return {
    kind: "Incident" as const,
    metadata: { name },
    spec: {
      title: name,
      state: "INVESTIGATING" as const,
      affectedMonitors: [],
      updates: [],
      ...specOverrides,
    },
  }
}

describe("reconcileIncidents", () => {
  it("detects CREATE when state has no mapping", async () => {
    const api = mockIncidentsApi([makeIncident(1, "API Down")])
    const manifests = [makeManifest("outage-1")]
    const changes = await reconcileIncidents(api, manifests, null)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("CREATE")
    expect(changes[0]?.key).toBe("outage-1")
  })

  it("detects UPDATE when state maps to existing incident", async () => {
    const stateFile: StateFile = {
      version: 1,
      incidents: { "outage-1": 1 },
    }
    const api = mockIncidentsApi([makeIncident(1, "API Down")])
    const manifests = [makeManifest("outage-1", { title: "API Down" })]
    const changes = await reconcileIncidents(api, manifests, stateFile)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
  })

  it("detects UPDATE when incident field differs", async () => {
    const stateFile: StateFile = {
      version: 1,
      incidents: { "outage-1": 1 },
    }
    const api = mockIncidentsApi([makeIncident(1, "Old Title")])
    const manifests = [makeManifest("outage-1", { title: "New Title" })]
    const changes = await reconcileIncidents(api, manifests, stateFile)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
    expect(changes[0]?.patch).toBeDefined()
  })

  it("detects DELETE orphan with deleteOrphans enabled", async () => {
    const stateFile: StateFile = {
      version: 1,
      incidents: { "old-incident": 99 },
    }
    const api = mockIncidentsApi([makeIncident(99, "Old Incident")])
    const changes = await reconcileIncidents(api, [], stateFile, { deleteOrphans: true })
    const deletes = changes.filter((c) => c.action === "DELETE")
    expect(deletes.length).toBeGreaterThanOrEqual(1)
  })

  it("handles null state file as CREATE", async () => {
    const api = mockIncidentsApi([])
    const manifests = [makeManifest("new-incident")]
    const changes = await reconcileIncidents(api, manifests, null)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("CREATE")
  })
})
