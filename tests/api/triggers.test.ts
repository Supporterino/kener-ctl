import { describe, it, expect } from "bun:test";
import { createKenerClient } from "@/api/client";
import { createTriggersApi } from "@/api/triggers";

const mockTrigger = {
  id: 1,
  name: "ops-slack",
  type: "SLACK" as const,
  webhookUrl: "https://hooks.slack.com/services/xxx",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

const mockTrigger2 = {
  id: 2,
  name: "dev-discord",
  type: "DISCORD" as const,
  webhookUrl: "https://discord.com/api/webhooks/xxx",
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

describe("triggersApi", () => {
  it("list returns all triggers", async () => {
    const client = createMockKy([mockTrigger, mockTrigger2]);
    const api = createTriggersApi(client);
    const result = await api.list();
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("ops-slack");
    expect(result[1]!.name).toBe("dev-discord");
  });

  it("get returns single trigger", async () => {
    const client = createMockKy(mockTrigger);
    const api = createTriggersApi(client);
    const result = await api.get(1);
    expect(result.id).toBe(1);
    expect(result.name).toBe("ops-slack");
  });

  it("create sends POST with body", async () => {
    const client = createMockKy(mockTrigger);
    const api = createTriggersApi(client);
    const result = await api.create({
      name: "ops-slack",
      type: "SLACK",
      webhookUrl: "https://hooks.slack.com/services/xxx",
    });
    expect(result.name).toBe("ops-slack");
  });

  it("update sends PATCH with body", async () => {
    const client = createMockKy(mockTrigger);
    const api = createTriggersApi(client);
    const result = await api.update(1, { webhookUrl: "https://new.example.com" });
    expect(result.name).toBe("ops-slack");
  });

  it("delete sends DELETE request", async () => {
    const client = createMockKy({ message: "ok" });
    const api = createTriggersApi(client);
    await expect(api.delete(1)).resolves.toBeUndefined();
  });

  it("handles 404 not found", async () => {
    const client = createMockKy({ error: "Not found" }, 404, "Not Found");
    const api = createTriggersApi(client);
    await expect(api.get(999)).rejects.toThrow("404");
  });

  it("handles 400 validation error", async () => {
    const client = createMockKy({ error: "Invalid" }, 400, "Bad Request");
    const api = createTriggersApi(client);
    await expect(api.create({ name: "", type: "SLACK" })).rejects.toThrow("400");
  });

  it("handles 401 auth error", async () => {
    const client = createMockKy({ error: "Unauthorized" }, 401, "Unauthorized");
    const api = createTriggersApi(client);
    await expect(api.list()).rejects.toThrow("401");
  });
});
