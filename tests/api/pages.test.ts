import { describe, expect, it } from "bun:test"
import type { createKenerClient } from "@/api/client"
import { createPagesApi } from "@/api/pages"

const mockPage = {
  id: 1,
  path: "services",
  title: "Services Status",
  header: "Our Services",
  pageContent: "# Status",
  monitors: [],
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
}

const mockPage2 = {
  id: 2,
  path: "~home",
  title: "Home",
  header: "",
  pageContent: "",
  monitors: ["my-api"],
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

describe("pagesApi", () => {
  it("list returns all pages", async () => {
    const client = createMockKy([mockPage, mockPage2])
    const api = createPagesApi(client)
    const result = await api.list()
    expect(result).toHaveLength(2)
    expect(result[0]?.path).toBe("services")
    expect(result[1]?.path).toBe("~home")
  })

  it("get returns single page", async () => {
    const client = createMockKy(mockPage)
    const api = createPagesApi(client)
    const result = await api.get(1)
    expect(result.id).toBe(1)
    expect(result.path).toBe("services")
  })

  it("create sends POST with body", async () => {
    const client = createMockKy(mockPage)
    const api = createPagesApi(client)
    const result = await api.create({ path: "services", title: "Services Status" })
    expect(result.path).toBe("services")
  })

  it("update sends PATCH with body", async () => {
    const client = createMockKy(mockPage)
    const api = createPagesApi(client)
    const result = await api.update(1, { title: "New Title" })
    expect(result.path).toBe("services")
  })

  it("delete sends DELETE request", async () => {
    const client = createMockKy({ message: "ok" })
    const api = createPagesApi(client)
    await expect(api.delete(1)).resolves.toBeUndefined()
  })

  it("handles 404 not found", async () => {
    const client = createMockKy({ error: "Not found" }, 404, "Not Found")
    const api = createPagesApi(client)
    await expect(api.get(999)).rejects.toThrow("404")
  })

  it("handles 400 validation error", async () => {
    const client = createMockKy({ error: "Invalid" }, 400, "Bad Request")
    const api = createPagesApi(client)
    await expect(api.create({ path: "", title: "" })).rejects.toThrow("400")
  })

  it("handles 401 auth error", async () => {
    const client = createMockKy({ error: "Unauthorized" }, 401, "Unauthorized")
    const api = createPagesApi(client)
    await expect(api.list()).rejects.toThrow("401")
  })
})
