import { describe, it, expect } from "bun:test";
import { ConfigSchema } from "@/config/schema";

describe("ConfigSchema", () => {
  it("validates a complete config", () => {
    const result = ConfigSchema.safeParse({
      instance: "https://status.example.com",
      apiKey: "key-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.instance).toBe("https://status.example.com");
      expect(result.data.apiKey).toBe("key-123");
    }
  });

  it("applies defaults when optional fields missing", () => {
    const result = ConfigSchema.safeParse({
      instance: "https://status.example.com",
      apiKey: "key-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stateDir).toBe("./state");
      expect(result.data.dryRun).toBe(false);
      expect(result.data.deleteOrphans).toBe(false);
      expect(result.data.concurrency).toBe(4);
    }
  });

  it("rejects when instance is missing", () => {
    const result = ConfigSchema.safeParse({
      apiKey: "key-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when apiKey is missing", () => {
    const result = ConfigSchema.safeParse({
      instance: "https://status.example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when both required fields missing", () => {
    const result = ConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL for instance", () => {
    const result = ConfigSchema.safeParse({
      instance: "not-a-url",
      apiKey: "key-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty string for apiKey", () => {
    const result = ConfigSchema.safeParse({
      instance: "https://status.example.com",
      apiKey: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer concurrency", () => {
    const result = ConfigSchema.safeParse({
      instance: "https://status.example.com",
      apiKey: "key-123",
      concurrency: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects concurrency below 1", () => {
    const result = ConfigSchema.safeParse({
      instance: "https://status.example.com",
      apiKey: "key-123",
      concurrency: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects concurrency above 20", () => {
    const result = ConfigSchema.safeParse({
      instance: "https://status.example.com",
      apiKey: "key-123",
      concurrency: 21,
    });
    expect(result.success).toBe(false);
  });

  it("allows valid concurrency values", () => {
    const result = ConfigSchema.safeParse({
      instance: "https://status.example.com",
      apiKey: "key-123",
      concurrency: 8,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = ConfigSchema.safeParse({
      instance: "https://status.example.com",
      apiKey: "key-123",
      stateDir: "./custom-state",
      dryRun: true,
      deleteOrphans: true,
      concurrency: 10,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stateDir).toBe("./custom-state");
      expect(result.data.dryRun).toBe(true);
      expect(result.data.deleteOrphans).toBe(true);
      expect(result.data.concurrency).toBe(10);
    }
  });
});
