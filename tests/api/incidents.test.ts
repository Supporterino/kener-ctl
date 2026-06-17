import { describe, expect, it } from "bun:test"
import type { createKenerClient } from "@/api/client"
import { createIncidentsApi } from "@/api/incidents"

const mockIncident = {
  id: 1,
  title: "API Downtime",
  start_date_time: 1765468800,
  end_date_time: null,
  state: "INVESTIGATING",
  monitors: [{ monitor_tag: "my-api", impact: "DOWN" as const }],
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-02T00:00:00.000Z",
}

const mockIncident2 = {
  id: 2,
  title: "DB Slow",
  start_date_time: 1765472400,
  end_date_time: 1765476000,
  state: "RESOLVED",
  monitors: [],
}

function createMockKy(
  responseData: unknown,
  status = 200,
  statusText = "OK",
): ReturnType<typeof createKenerClient> {
  const mockJson = () => {
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
  }

  return {
    get: () => ({ json: mockJson }),
    post: () => ({ json: mockJson }),
    patch: () => ({ json: mockJson }),
    delete: () => {
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
    },
  } as unknown as ReturnType<typeof createKenerClient>
}

describe("incidentsApi", () => {
  it("list returns all incidents", async () => {
    const client = createMockKy({ incidents: [mockIncident, mockIncident2] })
    const api = createIncidentsApi(client)
    const result = await api.list()
    expect(result).toHaveLength(2)
    expect(result[0]?.title).toBe("API Downtime")
    expect(result[1]?.title).toBe("DB Slow")
  })

  it("get returns single incident", async () => {
    const client = createMockKy({ incident: mockIncident })
    const api = createIncidentsApi(client)
    const result = await api.get(1)
    expect(result.id).toBe(1)
    expect(result.title).toBe("API Downtime")
  })

  it("create sends POST with unix timestamp", async () => {
    const client = createMockKy({ incident: mockIncident })
    const api = createIncidentsApi(client)
    const result = await api.create({
      title: "API Downtime",
      start_date_time: 1765468800,
    })
    expect(result.title).toBe("API Downtime")
    expect(result.start_date_time).toBe(1765468800)
  })

  it("update sends PATCH with body", async () => {
    const client = createMockKy({ incident: mockIncident })
    const api = createIncidentsApi(client)
    const result = await api.update(1, { title: "Updated Incident" })
    expect(result.title).toBe("API Downtime")
  })

  it("delete sends DELETE request", async () => {
    const client = createMockKy({ message: "ok" })
    const api = createIncidentsApi(client)
    await expect(api.delete(1)).resolves.toBeUndefined()
  })

  it("handles 404 not found", async () => {
    const client = createMockKy({ error: "Not found" }, 404, "Not Found")
    const api = createIncidentsApi(client)
    await expect(api.get(999)).rejects.toThrow("404")
  })

  it("handles 400 validation error", async () => {
    const client = createMockKy({ error: "Invalid" }, 400, "Bad Request")
    const api = createIncidentsApi(client)
    await expect(api.create({ title: "", start_date_time: 0 })).rejects.toThrow("400")
  })

  it("handles 401 auth error", async () => {
    const client = createMockKy({ error: "Unauthorized" }, 401, "Unauthorized")
    const api = createIncidentsApi(client)
    await expect(api.list()).rejects.toThrow("401")
  })
})
