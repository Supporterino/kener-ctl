import { describe, it, expect } from "bun:test";
import { ConfigSchema, ContextSchema, DefaultsSchema } from "@/config/schema";

describe("ContextSchema", () => {
  it("validates a valid context", () => {
    const result = ContextSchema.safeParse({
      name: "prod",
      instance: "https://status.example.com",
      apiKey: "key-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = ContextSchema.safeParse({
      name: "",
      instance: "https://status.example.com",
      apiKey: "key-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URLs", () => {
    const result = ContextSchema.safeParse({
      name: "prod",
      instance: "not-a-url",
      apiKey: "key-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty apiKey", () => {
    const result = ContextSchema.safeParse({
      name: "prod",
      instance: "https://status.example.com",
      apiKey: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("DefaultsSchema", () => {
  it("applies all defaults when empty", () => {
    const result = DefaultsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stateDir).toBe("./state");
      expect(result.data.concurrency).toBe(4);
      expect(result.data.dryRun).toBe(false);
      expect(result.data.deleteOrphans).toBe(false);
    }
  });

  it("allows partial defaults", () => {
    const result = DefaultsSchema.safeParse({
      stateDir: "./custom",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stateDir).toBe("./custom");
      expect(result.data.concurrency).toBe(4);
    }
  });

  it("rejects concurrency below 1", () => {
    const result = DefaultsSchema.safeParse({ concurrency: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects concurrency above 20", () => {
    const result = DefaultsSchema.safeParse({ concurrency: 21 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer concurrency", () => {
    const result = DefaultsSchema.safeParse({ concurrency: 3.5 });
    expect(result.success).toBe(false);
  });
});

describe("ConfigSchema", () => {
  const validConfig = {
    version: 1 as const,
    "current-context": "prod",
    contexts: [
      { name: "prod", instance: "https://status.prod.example.com", apiKey: "sk-prod" },
      { name: "staging", instance: "https://status.staging.example.com", apiKey: "sk-staging" },
    ],
  };

  it("validates a complete valid config", () => {
    const result = ConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data["current-context"]).toBe("prod");
      expect(result.data.contexts).toHaveLength(2);
    }
  });

  it("applies defaults when defaults block is omitted", () => {
    const result = ConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaults.stateDir).toBe("./state");
      expect(result.data.defaults.concurrency).toBe(4);
    }
  });

  it("uses provided defaults", () => {
    const result = ConfigSchema.safeParse({
      ...validConfig,
      defaults: { stateDir: "./foo", concurrency: 8, dryRun: true, deleteOrphans: true },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaults.stateDir).toBe("./foo");
      expect(result.data.defaults.concurrency).toBe(8);
    }
  });

  it("rejects when version is missing", () => {
    const { version, ...rest } = validConfig;
    const result = ConfigSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects unknown version", () => {
    const result = ConfigSchema.safeParse({ ...validConfig, version: 2 });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate context names", () => {
    const result = ConfigSchema.safeParse({
      version: 1,
      "current-context": "prod",
      contexts: [
        { name: "prod", instance: "https://status.prod.example.com", apiKey: "sk-prod" },
        { name: "prod", instance: "https://status.staging.example.com", apiKey: "sk-staging" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects current-context that doesn't match any context", () => {
    const result = ConfigSchema.safeParse({
      ...validConfig,
      "current-context": "unknown",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty contexts array", () => {
    const result = ConfigSchema.safeParse({
      version: 1,
      "current-context": "prod",
      contexts: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects context with missing fields", () => {
    const result = ConfigSchema.safeParse({
      version: 1,
      "current-context": "prod",
      contexts: [{ name: "prod" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects context with empty apiKey", () => {
    const result = ConfigSchema.safeParse({
      version: 1,
      "current-context": "prod",
      contexts: [{ name: "prod", instance: "https://status.example.com", apiKey: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects context with invalid instance URL", () => {
    const result = ConfigSchema.safeParse({
      version: 1,
      "current-context": "prod",
      contexts: [{ name: "prod", instance: "not-a-url", apiKey: "sk-123" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for current-context", () => {
    const result = ConfigSchema.safeParse({
      ...validConfig,
      "current-context": "",
    });
    expect(result.success).toBe(false);
  });
});
