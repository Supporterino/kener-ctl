import { describe, expect, it } from "bun:test"
import type { createKenerClient } from "@/api/client"
import { createPagesApi } from "@/api/pages"

const mockPage = {
  id: 1,
  page_path: "services",
  page_title: "Services Status",
  page_header: "Our Services",
  page_subheader: "# Status",
  page_logo: "",
  page_settings: {},
  monitors: [],
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-02T00:00:00.000Z",
}

const mockPage2 = {
  id: 2,
  page_path: "",
  page_title: "Home",
  page_header: "",
  page_subheader: "",
  page_logo: "",
  page_settings: {},
  monitors: [{ monitor_tag: "my-api", position: 0 }],
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
    const client = createMockKy({ pages: [mockPage, mockPage2] })
    const api = createPagesApi(client)
    const result = await api.list()
    expect(result).toHaveLength(2)
    expect(result[0]?.page_path).toBe("services")
    expect(result[1]?.page_path).toBe("")
  })

  it("create sends POST with body", async () => {
    const client = createMockKy({ page: mockPage })
    const api = createPagesApi(client)
    const result = await api.create({ page_path: "services", page_title: "Services Status" })
    expect(result.page_path).toBe("services")
  })

  it("update sends PATCH with body by page_path", async () => {
    const client = createMockKy({ page: mockPage })
    const api = createPagesApi(client)
    const result = await api.update("services", { page_title: "New Title" })
    expect(result.page_path).toBe("services")
  })

  it("delete sends DELETE request by page_path", async () => {
    const client = createMockKy({ message: "ok" })
    const api = createPagesApi(client)
    await expect(api.delete("services")).resolves.toBeUndefined()
  })

  it("handles 404 not found", async () => {
    const client = createMockKy({ error: "Not found" }, 404, "Not Found")
    const api = createPagesApi(client)
    await expect(api.update("nonexistent", { page_title: "Hi" })).rejects.toThrow("404")
  })

  it("handles 400 validation error", async () => {
    const client = createMockKy({ error: "Invalid" }, 400, "Bad Request")
    const api = createPagesApi(client)
    await expect(api.create({ page_path: "", page_title: "" })).rejects.toThrow("400")
  })

  it("handles 401 auth error", async () => {
    const client = createMockKy({ error: "Unauthorized" }, 401, "Unauthorized")
    const api = createPagesApi(client)
    await expect(api.list()).rejects.toThrow("401")
  })
})
