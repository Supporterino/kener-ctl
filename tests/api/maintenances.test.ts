import { describe, it, expect } from "bun:test";
import { createKenerClient } from "@/api/client";
import { createMaintenancesApi } from "@/api/maintenances";

const mockMaintenance = {
  id: 1,
  title: "Scheduled DB Migration",
  monitors: ["my-db"],
  startDatetime: "2025-06-16T00:00:00.000Z",
  endDatetime: "2025-06-16T02:00:00.000Z",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

const mockMaintenance2 = {
  id: 2,
  title: "Network Upgrade",
  monitors: [],
  startDatetime: "2025-06-17T00:00:00.000Z",
  endDatetime: "2025-06-17T04:00:00.000Z",
  rrule: "FREQ=WEEKLY",
};

function createMockKy(responseData: unknown, status = 200, statusText = "OK"): ReturnType<typeof createKenerClient> {
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
        })
      );
    }
    return Promise.resolve(responseData);
  };

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
          })
        );
      }
      return Promise.resolve();
    },
  } as unknown as ReturnType<typeof createKenerClient>;
}

describe("maintenancesApi", () => {
  it("list returns all maintenances", async () => {
    const client = createMockKy([mockMaintenance, mockMaintenance2]);
    const api = createMaintenancesApi(client);
    const result = await api.list();
    expect(result).toHaveLength(2);
    expect(result[0]!.title).toBe("Scheduled DB Migration");
    expect(result[1]!.title).toBe("Network Upgrade");
  });

  it("get returns single maintenance", async () => {
    const client = createMockKy(mockMaintenance);
    const api = createMaintenancesApi(client);
    const result = await api.get(1);
    expect(result.id).toBe(1);
    expect(result.title).toBe("Scheduled DB Migration");
  });

  it("create sends POST with body", async () => {
    const client = createMockKy(mockMaintenance);
    const api = createMaintenancesApi(client);
    const result = await api.create({
      title: "Scheduled DB Migration",
      startDatetime: "2025-06-16T00:00:00.000Z",
      endDatetime: "2025-06-16T02:00:00.000Z",
    });
    expect(result.title).toBe("Scheduled DB Migration");
  });

  it("update sends PATCH with body", async () => {
    const client = createMockKy(mockMaintenance);
    const api = createMaintenancesApi(client);
    const result = await api.update(1, { title: "Updated Title" });
    expect(result.title).toBe("Scheduled DB Migration");
  });

  it("delete sends DELETE request", async () => {
    const client = createMockKy({ message: "ok" });
    const api = createMaintenancesApi(client);
    await expect(api.delete(1)).resolves.toBeUndefined();
  });

  it("handles 404 not found", async () => {
    const client = createMockKy({ error: "Not found" }, 404, "Not Found");
    const api = createMaintenancesApi(client);
    await expect(api.get(999)).rejects.toThrow("404");
  });

  it("handles 400 validation error", async () => {
    const client = createMockKy({ error: "Invalid" }, 400, "Bad Request");
    const api = createMaintenancesApi(client);
    await expect(api.create({
      title: "",
      startDatetime: "2025-06-16T00:00:00.000Z",
      endDatetime: "2025-06-16T02:00:00.000Z",
    })).rejects.toThrow("400");
  });

  it("handles 401 auth error", async () => {
    const client = createMockKy({ error: "Unauthorized" }, 401, "Unauthorized");
    const api = createMaintenancesApi(client);
    await expect(api.list()).rejects.toThrow("401");
  });
});
