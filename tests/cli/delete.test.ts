import { describe, it, expect } from "bun:test";
import { deleteCommand } from "@/cli/delete";

describe("delete command definition", () => {
  function args(): Record<string, unknown> {
    return (deleteCommand as unknown as { args: Record<string, unknown> }).args;
  }

  it("has correct name", () => {
    expect((deleteCommand as unknown as { meta: { name: string } }).meta.name).toBe("delete");
  });

  it("has description", () => {
    expect(deleteCommand.meta).toBeDefined();
  });

  it("requires kind positional arg", () => {
    const kind = args().kind as Record<string, unknown>;
    expect(kind.type).toBe("positional");
    expect(kind.required).toBe(true);
  });

  it("requires id positional arg", () => {
    const id = args().id as Record<string, unknown>;
    expect(id.type).toBe("positional");
    expect(id.required).toBe(true);
  });

  it("has context arg", () => {
    expect(args()).toHaveProperty("context");
  });

  it("has yes flag (skip confirmation)", () => {
    const yes = args().yes as Record<string, unknown>;
    expect(yes.type).toBe("boolean");
    expect(yes.default).toBe(false);
  });

  it("has run function", () => {
    expect(typeof deleteCommand.run).toBe("function");
  });
});
