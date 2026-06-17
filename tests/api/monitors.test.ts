import { describe, expect, it, mock } from "bun:test"
import type { createKenerClient } from "@/api/client"
import { createMonitorsApi } from "@/api/monitors"

const mockMonitor = {
  tag: "my-api",
  name: "My API",
  description: "API health check",
  image: null,
  monitor_type: "API",
  cron: "* * * * *",
  default_status: "DOWN",
  status: "ACTIVE",
  category_name: null,
  day_degraded_minimum_count: null,
  day_down_minimum_count: null,
  include_degraded_in_downtime: "true",
  is_hidden: "false",
  monitor_settings_json: null,
  external_url: null,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-02T00:00:00.000Z",
}

const mockMonitor2 = {
  ...mockMonitor,
  tag: "my-db",
  name: "My DB",
  monitor_type: "PING",
}

function createMockKy(
  responseData: unknown,
  status = 200,
  statusText = "OK",
): ReturnType<typeof createKenerClient> {
  const mockJson = mock(() => {
    if (status >= 400) {
      return Promise.reject(
        Object.assign(new Error(`${status} ${statusText}`), {
          response: {
            status,
            statusText,
            clone: () => ({ text: () => Promise.resolve(JSON.stringify(responseData)) }),
            body: {},
          },
        }),
      )
    }
    return Promise.resolve(responseData)
  })

  return {
    get: mock(() => ({ json: mockJson })),
    post: mock(() => ({ json: mockJson })),
    patch: mock(() => ({ json: mockJson })),
    delete: mock(() => {
      if (status >= 400) {
        return Promise.reject(
          Object.assign(new Error(`${status} ${statusText}`), {
            response: {
              status,
              statusText,
              clone: () => ({ text: () => Promise.resolve(JSON.stringify(responseData)) }),
              body: {},
            },
          }),
        )
      }
      return Promise.resolve()
    }),
  } as unknown as ReturnType<typeof createKenerClient>
}

describe("monitorsApi", () => {
  it("list returns all monitors", async () => {
    const client = createMockKy({ monitors: [mockMonitor, mockMonitor2] })
    const api = createMonitorsApi(client)
    const result = await api.list()
    expect(result).toHaveLength(2)
    expect(result[0]?.tag).toBe("my-api")
    expect(result[1]?.tag).toBe("my-db")
  })

  it("get returns single monitor by tag", async () => {
    const client = createMockKy({ monitor: mockMonitor })
    const api = createMonitorsApi(client)
    const result = await api.get("my-api")
    expect(result.tag).toBe("my-api")
    expect(result.monitor_type).toBe("API")
  })

  it("create sends POST with body", async () => {
    const client = createMockKy({ monitor: mockMonitor })
    const api = createMonitorsApi(client)
    const result = await api.create({
      tag: "my-api",
      name: "My API",
      monitor_type: "API",
      cron: "* * * * *",
      default_status: "DOWN",
    })
    expect(result.tag).toBe("my-api")
  })

  it("update sends PATCH with body by tag", async () => {
    const client = createMockKy({ monitor: mockMonitor })
    const api = createMonitorsApi(client)
    const result = await api.update("my-api", { name: "Updated Name" })
    expect(result.tag).toBe("my-api")
  })

  it("deactivate sends PATCH with status:INACTIVE", async () => {
    const deactivated = { ...mockMonitor, status: "INACTIVE" }
    const client = createMockKy({ monitor: deactivated })
    const api = createMonitorsApi(client)
    const result = await api.deactivate("my-api")
    expect(result.status).toBe("INACTIVE")
  })

  it("handles 404 not found", async () => {
    const client = createMockKy({ error: "Not found" }, 404, "Not Found")
    const api = createMonitorsApi(client)
    await expect(api.get("nonexistent")).rejects.toThrow("404")
  })

  it("handles 400 validation error", async () => {
    const client = createMockKy({ message: "Invalid tag format" }, 400, "Bad Request")
    const api = createMonitorsApi(client)
    await expect(
      api.create({
        tag: "",
        name: "",
        monitor_type: "NONE",
        cron: "* * * * *",
        default_status: "DOWN",
      }),
    ).rejects.toThrow("400")
  })

  it("list parses monitors with null optional fields, string booleans, and object settings", async () => {
    const monitorWithNulls = {
      tag: "test-tag",
      name: "Test Monitor",
      description: null,
      image: null,
      cron: "* * * * *",
      default_status: "DOWN",
      status: "ACTIVE",
      category_name: null,
      monitor_type: "API",
      day_degraded_minimum_count: null,
      day_down_minimum_count: null,
      include_degraded_in_downtime: "true",
      is_hidden: "false",
      monitor_settings_json: { polling_interval: 30 },
      external_url: null,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-02T00:00:00.000Z",
    }
    const client = createMockKy({ monitors: [monitorWithNulls] })
    const api = createMonitorsApi(client)
    const result = await api.list()
    expect(result).toHaveLength(1)
    expect(result[0]?.tag).toBe("test-tag")
    expect(result[0]?.description).toBeNull()
    expect(result[0]?.image).toBeNull()
    expect(result[0]?.category_name).toBeNull()
    expect(result[0]?.day_degraded_minimum_count).toBeNull()
    expect(result[0]?.day_down_minimum_count).toBeNull()
    expect(result[0]?.include_degraded_in_downtime).toBe(true)
    expect(result[0]?.is_hidden).toBe(false)
    expect(result[0]?.monitor_settings_json).toEqual({ polling_interval: 30 })
    expect(result[0]?.external_url).toBeNull()
  })

  it("get parses singleton monitor with nullable fields", async () => {
    const monitorWithNulls = {
      tag: "singleton-tag",
      name: "Singleton",
      description: null,
      image: null,
      cron: "*/10 * * * *",
      default_status: "UP",
      status: "ACTIVE",
      category_name: null,
      monitor_type: "PING",
      day_degraded_minimum_count: null,
      day_down_minimum_count: null,
      include_degraded_in_downtime: "true",
      is_hidden: "false",
      monitor_settings_json: null,
      external_url: null,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-02T00:00:00.000Z",
    }
    const client = createMockKy({ monitor: monitorWithNulls })
    const api = createMonitorsApi(client)
    const result = await api.get("singleton-tag")
    expect(result.tag).toBe("singleton-tag")
    expect(result.monitor_settings_json).toBeNull()
    expect(result.include_degraded_in_downtime).toBe(true)
  })

  it("handles 401 auth error", async () => {
    const client = createMockKy({ error: "Unauthorized" }, 401, "Unauthorized")
    const api = createMonitorsApi(client)
    await expect(api.list()).rejects.toThrow("401")
  })
})
