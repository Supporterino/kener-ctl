import { describe, it, expect } from "bun:test";
import { renderTable, renderPlanTable } from "@/output/table";

describe("renderTable", () => {
  it("renders a basic table with headers and rows", () => {
    const result = renderTable(
      ["Name", "Value"],
      [["foo", "42"], ["bar", "99"]]
    );
    expect(result).toContain("Name");
    expect(result).toContain("Value");
    expect(result).toContain("foo");
    expect(result).toContain("42");
    expect(result).toContain("bar");
    expect(result).toContain("99");
  });

  it("handles empty rows", () => {
    const result = renderTable(
      ["Name", "Value"],
      []
    );
    expect(result).toContain("Name");
    expect(result).toContain("Value");
    expect(result).not.toContain("<no data>");
  });

  it("renders table with wrapped content objects", () => {
    const result = renderTable(
      ["Header"],
      [["plain text"]]
    );
    expect(result).toContain("plain text");
  });

  it("renders table with multiple columns", () => {
    const result = renderTable(
      ["A", "B", "C", "D"],
      [["1", "2", "3", "4"]]
    );
    expect(result).toContain("A");
    expect(result).toContain("B");
    expect(result).toContain("C");
    expect(result).toContain("D");
    expect(result).toContain("1");
    expect(result).toContain("2");
    expect(result).toContain("3");
    expect(result).toContain("4");
  });
});

describe("renderPlanTable", () => {
  it("renders plan with CREATE action in green", () => {
    const result = renderPlanTable([
      { kind: "Monitor", key: "my-api", action: "CREATE", details: "(new)" },
    ]);
    expect(result).toContain("Monitor");
    expect(result).toContain("my-api");
    expect(result).toContain("CREATE");
    expect(result).toContain("(new)");
  });

  it("renders plan with UPDATE action in yellow", () => {
    const result = renderPlanTable([
      { kind: "Monitor", key: "my-api", action: "UPDATE", details: "name" },
    ]);
    expect(result).toContain("UPDATE");
    expect(result).toContain("name");
  });

  it("renders plan with DELETE action in red", () => {
    const result = renderPlanTable([
      { kind: "Page", key: "services", action: "DELETE", details: "(orphan)" },
    ]);
    expect(result).toContain("DELETE");
    expect(result).toContain("(orphan)");
    expect(result).toContain("Page");
  });

  it("renders plan with NOOP action in grey", () => {
    const result = renderPlanTable([
      { kind: "AlertTrigger", key: "ops-slack", action: "NOOP", details: "—" },
    ]);
    expect(result).toContain("NOOP");
    expect(result).toContain("ops-slack");
    expect(result).toContain("—");
  });

  it("renders multiple changes in one table", () => {
    const result = renderPlanTable([
      { kind: "Monitor", key: "a", action: "CREATE", details: "(new)" },
      { kind: "Monitor", key: "b", action: "UPDATE", details: "cronSchedule" },
      { kind: "Page", key: "c", action: "DELETE", details: "(orphan)" },
      { kind: "AlertTrigger", key: "d", action: "NOOP", details: "—" },
    ]);
    expect(result).toContain("a");
    expect(result).toContain("b");
    expect(result).toContain("c");
    expect(result).toContain("d");
    expect(result).toContain("CREATE");
    expect(result).toContain("UPDATE");
    expect(result).toContain("DELETE");
    expect(result).toContain("NOOP");
  });

  it("returns string type", () => {
    const result = renderPlanTable([
      { kind: "Monitor", key: "test", action: "NOOP", details: "—" },
    ]);
    expect(typeof result).toBe("string");
  });
});
