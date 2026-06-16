import { describe, expect, it } from "bun:test"
import type { MonitorsApi } from "@/api/monitors"
import type { Monitor } from "@/api/types"
import type { MonitorManifest } from "@/manifest/types"
import { reconcileMonitors } from "@/reconciler/resources/monitor"

function mockMonitorsApi(monitors: Monitor[]): MonitorsApi {
  return {
    list: async () => monitors,
    get: async () => ({}) as Monitor,
    create: async () => ({}) as Monitor,
    update: async () => ({}) as Monitor,
    delete: async () => {},
  }
}

function makeMonitor(tag: string, overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: 1,
    tag,
    name: tag,
    description: "",
    type: "API",
    cronSchedule: "* * * * *",
    defaultStatus: "DOWN",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeManifest(tag: string, overrides: Partial<MonitorManifest> = {}): MonitorManifest {
  return {
    kind: "Monitor" as const,
    metadata: { tag },
    spec: {
      name: tag,
      description: "",
      type: "API" as const,
      cronSchedule: "* * * * *",
      defaultStatus: "DOWN" as const,
      ...overrides.spec,
    },
    ...overrides,
  }
}

describe("reconcileMonitors", () => {
  it("detects CREATE when no remote monitor exists", async () => {
    const api = mockMonitorsApi([])
    const manifests = [makeManifest("my-api")]
    const changes = await reconcileMonitors(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("CREATE")
    expect(changes[0]?.key).toBe("my-api")
  })

  it("detects UPDATE when monitor exists remotely (structures always differ)", async () => {
    const api = mockMonitorsApi([makeMonitor("my-api")])
    const manifests = [makeManifest("my-api")]
    const changes = await reconcileMonitors(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
  })

  it("detects UPDATE when remote differs in a spec field", async () => {
    const api = mockMonitorsApi([makeMonitor("my-api", { cronSchedule: "* * * * *" })])
    const manifests = [
      makeManifest("my-api", {
        spec: {
          name: "Updated",
          type: "API" as const,
          cronSchedule: "*/5 * * * *",
        } as MonitorManifest["spec"],
      }),
    ]
    const changes = await reconcileMonitors(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
    expect(changes[0]?.patch).toBeDefined()
  })

  it("detects DELETE when orphan and deleteOrphans enabled", async () => {
    const api = mockMonitorsApi([makeMonitor("old-api")])
    const manifests: MonitorManifest[] = []
    const changes = await reconcileMonitors(api, manifests, { deleteOrphans: true })
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("DELETE")
    expect(changes[0]?.key).toBe("old-api")
  })

  it("skips orphans when deleteOrphans is false", async () => {
    const api = mockMonitorsApi([makeMonitor("old-api")])
    const manifests: MonitorManifest[] = []
    const changes = await reconcileMonitors(api, manifests, { deleteOrphans: false })
    expect(changes).toHaveLength(0)
  })

  it("filters by tag option", async () => {
    const api = mockMonitorsApi([
      makeMonitor("api-a", { id: 10 }),
      makeMonitor("api-b", { id: 20 }),
    ])
    const manifests = [makeManifest("api-a"), makeManifest("api-b")]
    const changes = await reconcileMonitors(api, manifests, { tag: "api-a" })
    expect(changes).toHaveLength(1)
    expect(changes[0]?.key).toBe("api-a")
  })

  it("handles multiple creates", async () => {
    const api = mockMonitorsApi([])
    const manifests = [makeManifest("a"), makeManifest("b"), makeManifest("c")]
    const changes = await reconcileMonitors(api, manifests)
    expect(changes).toHaveLength(3)
    expect(changes.every((c) => c.action === "CREATE")).toBe(true)
  })

  it("handles mix of CREATE, UPDATE, DELETE", async () => {
    const api = mockMonitorsApi([
      makeMonitor("exists", { id: 1, name: "Exists" }),
      makeMonitor("changed", { id: 2, name: "Old Name" }),
      makeMonitor("orphan", { id: 3 }),
    ])
    const manifests = [
      makeManifest("exists", {
        spec: { name: "Exists", type: "API" as const } as MonitorManifest["spec"],
      }),
      makeManifest("changed", {
        spec: { name: "New Name", type: "API" as const } as MonitorManifest["spec"],
      }),
      makeManifest("new"),
    ]

    const changes = await reconcileMonitors(api, manifests, { deleteOrphans: true })
    const creates = changes.filter((c) => c.action === "CREATE")
    const updates = changes.filter((c) => c.action === "UPDATE")
    const deletes = changes.filter((c) => c.action === "DELETE")

    expect(creates).toHaveLength(1)
    expect(creates[0]?.key).toBe("new")
    expect(updates).toHaveLength(2)
    expect(updates.some((c) => c.key === "exists")).toBe(true)
    expect(updates.some((c) => c.key === "changed")).toBe(true)
    expect(deletes).toHaveLength(1)
    expect(deletes[0]?.key).toBe("orphan")
  })
})
