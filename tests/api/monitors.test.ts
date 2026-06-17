import { describe, expect, it, mock } from "bun:test"
import type { createKenerClient } from "@/api/client"
import { createMonitorsApi } from "@/api/monitors"

const mockMonitor = {
  tag: "my-api",
  name: "My API",
  description: "API health check",
  monitor_type: "API",
  cron: "* * * * *",
  default_status: "DOWN",
  status: "ACTIVE",
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

  it("handles 401 auth error", async () => {
    const client = createMockKy({ error: "Unauthorized" }, 401, "Unauthorized")
    const api = createMonitorsApi(client)
    await expect(api.list()).rejects.toThrow("401")
  })
})
