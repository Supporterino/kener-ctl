import { describe, it, expect } from "bun:test";
import type { PlanRow, ApplyResult } from "@/output/printer";

// Test the type structures and transformation logic
describe("PlanRow type", () => {
  it("accepts valid plan row", () => {
    const row: PlanRow = {
      kind: "Monitor",
      key: "my-api",
      action: "CREATE",
      details: "(new)",
    };
    expect(row.kind).toBe("Monitor");
    expect(row.key).toBe("my-api");
    expect(row.action).toBe("CREATE");
  });

  it("supports all change actions", () => {
    const actions = ["CREATE", "UPDATE", "DELETE", "NOOP"] as const;
    for (const action of actions) {
      const row: PlanRow = { kind: "Monitor", key: "x", action, details: "..." };
      expect(row.action).toBe(action);
    }
  });
});

describe("ApplyResult type", () => {
  it("accepts successful result", () => {
    const result: ApplyResult = {
      kind: "Monitor",
      key: "my-api",
      action: "CREATE",
      success: true,
    };
    expect(result.success).toBe(true);
  });

  it("accepts failed result with error", () => {
    const result: ApplyResult = {
      kind: "Monitor",
      key: "bad",
      action: "UPDATE",
      success: false,
      error: "400 Bad Request — invalid",
    };
    expect(result.success).toBe(false);
    expect(result.error).toBe("400 Bad Request — invalid");
  });

  it("supports all actions for results", () => {
    const actions = ["CREATE", "UPDATE", "DELETE", "NOOP"] as const;
    for (const action of actions) {
      const r: ApplyResult = { kind: "Monitor", key: "x", action, success: true };
      expect(r).toBeDefined();
    }
  });
});

describe("summary calculation", () => {
  function countActions(actions: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const a of actions) {
      counts[a] = (counts[a] ?? 0) + 1;
    }
    return counts;
  }

  it("counts CREATE, UPDATE, DELETE, NOOP separately", () => {
    const actions = ["CREATE", "CREATE", "UPDATE", "DELETE", "NOOP", "NOOP", "NOOP"];
    const counts = countActions(actions);
    expect(counts["CREATE"]).toBe(2);
    expect(counts["UPDATE"]).toBe(1);
    expect(counts["DELETE"]).toBe(1);
    expect(counts["NOOP"]).toBe(3);
  });

  it("returns empty counts for empty actions", () => {
    const counts = countActions([]);
    expect(Object.keys(counts)).toHaveLength(0);
  });

  it("handles single action type", () => {
    const counts = countActions(["CREATE", "CREATE", "CREATE"]);
    expect(counts["CREATE"]).toBe(3);
    expect(counts["UPDATE"]).toBeUndefined();
  });
});
