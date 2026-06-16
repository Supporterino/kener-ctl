import { describe, expect, it, mock } from "bun:test"
import type { createKenerClient } from "@/api/client"
import { createMonitorsApi } from "@/api/monitors"

const mockMonitor = {
  id: 1,
  tag: "my-api",
  name: "My API",
  description: "API health check",
  type: "API" as const,
  cronSchedule: "* * * * *",
  defaultStatus: "DOWN" as const,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
}

const mockMonitor2 = {
  ...mockMonitor,
  id: 2,
  tag: "my-db",
  name: "My DB",
  type: "PING" as const,
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
    const client = createMockKy([mockMonitor, mockMonitor2])
    const api = createMonitorsApi(client)
    const result = await api.list()
    expect(result).toHaveLength(2)
    expect(result[0]?.tag).toBe("my-api")
    expect(result[1]?.tag).toBe("my-db")
  })

  it("get returns single monitor", async () => {
    const client = createMockKy(mockMonitor)
    const api = createMonitorsApi(client)
    const result = await api.get(1)
    expect(result.id).toBe(1)
    expect(result.tag).toBe("my-api")
  })

  it("create sends POST with body", async () => {
    const client = createMockKy(mockMonitor)
    const api = createMonitorsApi(client)
    const result = await api.create({ tag: "my-api", name: "My API", type: "API" })
    expect(result.tag).toBe("my-api")
  })

  it("update sends PATCH with body", async () => {
    const client = createMockKy(mockMonitor)
    const api = createMonitorsApi(client)
    const result = await api.update(1, { name: "Updated Name" })
    expect(result.tag).toBe("my-api")
  })

  it("delete sends DELETE request", async () => {
    const client = createMockKy({ message: "ok" })
    const api = createMonitorsApi(client)
    await expect(api.delete(1)).resolves.toBeUndefined()
  })

  it("handles 404 not found", async () => {
    const client = createMockKy({ error: "Not found" }, 404, "Not Found")
    const api = createMonitorsApi(client)
    await expect(api.get(999)).rejects.toThrow("404")
  })

  it("handles 400 validation error", async () => {
    const client = createMockKy({ message: "Invalid tag format" }, 400, "Bad Request")
    const api = createMonitorsApi(client)
    await expect(api.create({ tag: "", name: "", type: "API" })).rejects.toThrow("400")
  })

  it("handles 401 auth error", async () => {
    const client = createMockKy({ error: "Unauthorized" }, 401, "Unauthorized")
    const api = createMonitorsApi(client)
    await expect(api.list()).rejects.toThrow("401")
  })
})
