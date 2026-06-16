import { describe, it, expect } from "bun:test";
import { applyCommand } from "@/cli/apply";

describe("apply command definition", () => {
  it("has correct name", () => {
    const cmd = applyCommand as unknown as { meta: { name: string; description: string }; args: Record<string, unknown>; run: unknown };
    expect(cmd.meta.name).toBe("apply");
  });

  it("has description", () => {
    expect(applyCommand.meta).toBeDefined();
  });

  it("includes kind arg", () => {
    const args = (applyCommand as unknown as { args: Record<string, unknown> }).args;
    expect(args).toHaveProperty("kind");
  });

  it("includes dry-run flag", () => {
    const args = (applyCommand as unknown as { args: Record<string, unknown> }).args;
    expect(args).toHaveProperty("dry-run");
  });

  it("includes delete-orphans flag", () => {
    const args = (applyCommand as unknown as { args: Record<string, unknown> }).args;
    expect(args).toHaveProperty("delete-orphans");
  });

  it("includes config arg", () => {
    const args = (applyCommand as unknown as { args: Record<string, unknown> }).args;
    expect(args).toHaveProperty("config");
  });

  it("includes state-dir arg", () => {
    const args = (applyCommand as unknown as { args: Record<string, unknown> }).args;
    expect(args).toHaveProperty("state-dir");
  });

  it("has run function", () => {
    expect(typeof applyCommand.run).toBe("function");
  });
});
