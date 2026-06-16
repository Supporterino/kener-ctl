import { describe, it, expect } from "bun:test";
import { pullCommand } from "@/cli/pull";

describe("pull command definition", () => {
  function args(): Record<string, unknown> {
    return (pullCommand as unknown as { args: Record<string, unknown> }).args;
  }

  it("has correct name", () => {
    expect((pullCommand as unknown as { meta: { name: string } }).meta.name).toBe("pull");
  });

  it("has description", () => {
    expect(pullCommand.meta).toBeDefined();
  });

  it("includes kind arg", () => {
    expect(args()).toHaveProperty("kind");
  });

  it("includes context arg", () => {
    expect(args()).toHaveProperty("context");
  });

  it("includes state-dir arg", () => {
    expect(args()).toHaveProperty("state-dir");
  });

  it("includes overwrite flag with default false", () => {
    const overwrite = args().overwrite as Record<string, unknown>;
    expect(overwrite.type).toBe("boolean");
    expect(overwrite.default).toBe(false);
  });

  it("has run function", () => {
    expect(typeof pullCommand.run).toBe("function");
  });
});
