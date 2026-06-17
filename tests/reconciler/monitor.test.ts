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
    deactivate: async () => ({}) as Monitor,
  }
}

function makeMonitor(tag: string, overrides: Partial<Monitor> = {}): Monitor {
  return {
    tag,
    name: tag,
    description: "",
    image: "",
    cron: "* * * * *",
    default_status: "DOWN",
    status: "ACTIVE",
    monitor_type: "API",
    include_degraded_in_downtime: false,
    is_hidden: false,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  } as Monitor
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

  it("detects UPDATE when monitor exists remotely", async () => {
    const api = mockMonitorsApi([makeMonitor("my-api")])
    const manifests = [makeManifest("my-api")]
    const changes = await reconcileMonitors(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
  })

  it("detects UPDATE when remote differs in a spec field", async () => {
    const api = mockMonitorsApi([makeMonitor("my-api", { cron: "* * * * *" })])
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
    const api = mockMonitorsApi([makeMonitor("api-a"), makeMonitor("api-b")])
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

  it("handles null remote fields without crashing", async () => {
    const remoteMonitor = makeMonitor("my-api", {
      description: null as unknown as string,
      category_name: null as unknown as string,
      day_degraded_minimum_count: null as unknown as number,
      day_down_minimum_count: null as unknown as number,
    })
    const api = mockMonitorsApi([remoteMonitor])
    const manifests = [makeManifest("my-api")]
    const changes = await reconcileMonitors(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
  })

  it("handles mix of CREATE, UPDATE, DELETE", async () => {
    const api = mockMonitorsApi([
      makeMonitor("exists", { name: "Exists" }),
      makeMonitor("changed", { name: "Old Name" }),
      makeMonitor("orphan"),
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
