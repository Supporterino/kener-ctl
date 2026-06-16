import { describe, it, expect } from "bun:test";
import { createKenerClient } from "@/api/client";
import { createAlertConfigsApi } from "@/api/alert-configs";

const mockConfig = {
  id: 1,
  monitorTag: "my-api",
  alertType: "STATUS" as const,
  alertValue: "DOWN",
  failureThreshold: 3,
  successThreshold: 2,
  severity: "CRITICAL" as const,
  createIncident: true,
  triggers: [1],
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

const mockConfig2 = {
  id: 2,
  monitorTag: "my-db",
  alertType: "LATENCY" as const,
  alertValue: "1000",
  failureThreshold: 2,
  successThreshold: 1,
  severity: "WARNING" as const,
  createIncident: false,
  triggers: [],
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

describe("alertConfigsApi", () => {
  it("list returns all alert configs", async () => {
    const client = createMockKy([mockConfig, mockConfig2]);
    const api = createAlertConfigsApi(client);
    const result = await api.list();
    expect(result).toHaveLength(2);
    expect(result[0]!.monitorTag).toBe("my-api");
    expect(result[1]!.monitorTag).toBe("my-db");
  });

  it("get returns single alert config", async () => {
    const client = createMockKy(mockConfig);
    const api = createAlertConfigsApi(client);
    const result = await api.get(1);
    expect(result.id).toBe(1);
    expect(result.monitorTag).toBe("my-api");
  });

  it("create sends POST with body", async () => {
    const client = createMockKy(mockConfig);
    const api = createAlertConfigsApi(client);
    const result = await api.create({
      monitorTag: "my-api",
      alertType: "STATUS",
      alertValue: "DOWN",
    });
    expect(result.monitorTag).toBe("my-api");
  });

  it("update sends PATCH with body", async () => {
    const client = createMockKy(mockConfig);
    const api = createAlertConfigsApi(client);
    const result = await api.update(1, { failureThreshold: 5 });
    expect(result.monitorTag).toBe("my-api");
  });

  it("delete sends DELETE request", async () => {
    const client = createMockKy({ message: "ok" });
    const api = createAlertConfigsApi(client);
    await expect(api.delete(1)).resolves.toBeUndefined();
  });

  it("handles 404 not found", async () => {
    const client = createMockKy({ error: "Not found" }, 404, "Not Found");
    const api = createAlertConfigsApi(client);
    await expect(api.get(999)).rejects.toThrow("404");
  });

  it("handles 400 validation error", async () => {
    const client = createMockKy({ error: "Invalid" }, 400, "Bad Request");
    const api = createAlertConfigsApi(client);
    await expect(api.create({ monitorTag: "", alertType: "STATUS", alertValue: "DOWN" })).rejects.toThrow("400");
  });

  it("handles 401 auth error", async () => {
    const client = createMockKy({ error: "Unauthorized" }, 401, "Unauthorized");
    const api = createAlertConfigsApi(client);
    await expect(api.list()).rejects.toThrow("401");
  });
});
