import { describe, expect, it } from "bun:test"
import type { createKenerClient } from "@/api/client"
import { createMaintenancesApi } from "@/api/maintenances"

const mockMaintenance = {
  id: 1,
  title: "Scheduled DB Migration",
  description: "",
  start_date_time: 1765468800,
  rrule: "FREQ=WEEKLY;BYDAY=MO",
  duration_seconds: 7200,
  status: "SCHEDULED",
  monitors: [{ monitor_tag: "my-db", impact: "DOWN" as const }],
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-02T00:00:00.000Z",
}

const mockMaintenance2 = {
  id: 2,
  title: "Network Upgrade",
  description: "",
  start_date_time: 1765555200,
  rrule: "FREQ=WEEKLY",
  duration_seconds: 14400,
  status: "SCHEDULED",
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

describe("maintenancesApi", () => {
  it("list returns all maintenances", async () => {
    const client = createMockKy({ maintenances: [mockMaintenance, mockMaintenance2] })
    const api = createMaintenancesApi(client)
    const result = await api.list()
    expect(result).toHaveLength(2)
    expect(result[0]?.title).toBe("Scheduled DB Migration")
    expect(result[1]?.title).toBe("Network Upgrade")
  })

  it("get returns single maintenance", async () => {
    const client = createMockKy({ maintenance: mockMaintenance })
    const api = createMaintenancesApi(client)
    const result = await api.get(1)
    expect(result.id).toBe(1)
    expect(result.title).toBe("Scheduled DB Migration")
  })

  it("create sends POST with rrule and duration_seconds", async () => {
    const client = createMockKy({ maintenance: mockMaintenance })
    const api = createMaintenancesApi(client)
    const result = await api.create({
      title: "Scheduled DB Migration",
      start_date_time: 1765468800,
      rrule: "FREQ=WEEKLY;BYDAY=MO",
      duration_seconds: 7200,
    })
    expect(result.title).toBe("Scheduled DB Migration")
    expect(result.rrule).toBe("FREQ=WEEKLY;BYDAY=MO")
  })

  it("update sends PATCH with body", async () => {
    const client = createMockKy({ maintenance: mockMaintenance })
    const api = createMaintenancesApi(client)
    const result = await api.update(1, { title: "Updated Title" })
    expect(result.title).toBe("Scheduled DB Migration")
  })

  it("delete sends DELETE request", async () => {
    const client = createMockKy({ message: "ok" })
    const api = createMaintenancesApi(client)
    await expect(api.delete(1)).resolves.toBeUndefined()
  })

  it("handles 404 not found", async () => {
    const client = createMockKy({ error: "Not found" }, 404, "Not Found")
    const api = createMaintenancesApi(client)
    await expect(api.get(999)).rejects.toThrow("404")
  })

  it("handles 400 validation error", async () => {
    const client = createMockKy({ error: "Invalid" }, 400, "Bad Request")
    const api = createMaintenancesApi(client)
    await expect(
      api.create({
        title: "",
        start_date_time: 0,
        rrule: "",
        duration_seconds: 0,
      }),
    ).rejects.toThrow("400")
  })

  it("handles 401 auth error", async () => {
    const client = createMockKy({ error: "Unauthorized" }, 401, "Unauthorized")
    const api = createMaintenancesApi(client)
    await expect(api.list()).rejects.toThrow("401")
  })
})
