import { describe, expect, it } from "bun:test"
import type { MaintenancesApi } from "@/api/maintenances"
import type { Maintenance } from "@/api/types"
import type { MaintenanceManifest } from "@/manifest/types"
import type { StateFile } from "@/reconciler/resources/alert-config"
import { reconcileMaintenances } from "@/reconciler/resources/maintenance"

function mockMaintenancesApi(maintenances: Maintenance[]): MaintenancesApi {
  return {
    list: async () => maintenances,
    get: async () => ({}) as Maintenance,
    create: async () => ({}) as Maintenance,
    update: async () => ({}) as Maintenance,
    delete: async () => {},
  }
}

function makeMaintenance(id: number, title: string): Maintenance {
  return {
    id,
    title,
    monitors: [],
    startDatetime: "2025-06-16T00:00:00.000Z",
    endDatetime: "2025-06-16T02:00:00.000Z",
  }
}

function makeManifest(
  name: string,
  specOverrides: Partial<MaintenanceManifest["spec"]> = {},
): MaintenanceManifest {
  return {
    kind: "Maintenance" as const,
    metadata: { name },
    spec: {
      title: name,
      monitors: [],
      startDatetime: "2025-06-16T00:00:00.000Z",
      endDatetime: "2025-06-16T02:00:00.000Z",
      ...specOverrides,
    },
  }
}

describe("reconcileMaintenances", () => {
  it("detects CREATE when state has no mapping", async () => {
    const api = mockMaintenancesApi([makeMaintenance(1, "DB Migration")])
    const manifests = [makeManifest("maint-1")]
    const changes = await reconcileMaintenances(api, manifests, null)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("CREATE")
    expect(changes[0]?.key).toBe("maint-1")
  })

  it("detects UPDATE when state maps to existing maintenance", async () => {
    const stateFile: StateFile = {
      version: 1,
      maintenances: { "maint-1": 1 },
    }
    const api = mockMaintenancesApi([makeMaintenance(1, "DB Migration")])
    const manifests = [makeManifest("maint-1", { title: "DB Migration" })]
    const changes = await reconcileMaintenances(api, manifests, stateFile)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
  })

  it("detects UPDATE when maintenance field differs", async () => {
    const stateFile: StateFile = {
      version: 1,
      maintenances: { "maint-1": 1 },
    }
    const api = mockMaintenancesApi([makeMaintenance(1, "Old Title")])
    const manifests = [makeManifest("maint-1", { title: "New Title" })]
    const changes = await reconcileMaintenances(api, manifests, stateFile)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
    expect(changes[0]?.patch).toBeDefined()
  })

  it("detects DELETE orphan with deleteOrphans enabled", async () => {
    const stateFile: StateFile = {
      version: 1,
      maintenances: { "old-maint": 99 },
    }
    const api = mockMaintenancesApi([makeMaintenance(99, "Old Maintenance")])
    const changes = await reconcileMaintenances(api, [], stateFile, { deleteOrphans: true })
    const deletes = changes.filter((c) => c.action === "DELETE")
    expect(deletes.length).toBeGreaterThanOrEqual(1)
  })

  it("handles null state file as CREATE", async () => {
    const api = mockMaintenancesApi([])
    const manifests = [makeManifest("new-maint")]
    const changes = await reconcileMaintenances(api, manifests, null)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("CREATE")
  })
})
