import { describe, it, expect } from "bun:test";
import { loadYaml, loadAllYaml, loadYamlFromFile, loadAllYamlFromFile } from "@/util/yaml";

describe("loadYaml", () => {
  it("parses valid YAML", () => {
    const result = loadYaml("hello: world", "test.yaml");
    expect(result).toEqual({ hello: "world" });
  });

  it("parses nested objects", () => {
    const result = loadYaml("a:\n  b: 1\n  c: 2", "test.yaml");
    expect(result).toEqual({ a: { b: 1, c: 2 } });
  });

  it("handles arrays", () => {
    const result = loadYaml("- a\n- b\n- c", "test.yaml");
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("handles numbers and booleans", () => {
    const result = loadYaml("count: 42\nenabled: true", "test.yaml");
    expect(result).toEqual({ count: 42, enabled: true });
  });

  it("throws enriched error for invalid YAML", () => {
    expect(() => loadYaml("invalid: [unclosed", "bad.yaml")).toThrow("bad.yaml");
  });

  it("throws with file path in error for bad syntax", () => {
    expect(() => loadYaml("key: {bad: value", "nested/path/file.yaml")).toThrow(
      /nested\/path\/file\.yaml/
    );
  });

  it("handles empty content", () => {
    const result = loadYaml("", "empty.yaml");
    expect(result).toBeUndefined();
  });

  it("handles null value", () => {
    const result = loadYaml("value: null", "null.yaml");
    expect(result).toEqual({ value: null });
  });

  it("parses multiline strings", () => {
    const result = loadYaml("text: |\n  line1\n  line2", "multi.yaml");
    expect(result).toEqual({ text: "line1\nline2\n" });
  });
});

describe("loadAllYaml", () => {
  it("parses single document", () => {
    const result = loadAllYaml("hello: world", "test.yaml");
    expect(result).toEqual([{ hello: "world" }]);
  });

  it("parses multiple documents via ---", () => {
    const result = loadAllYaml("kind: Monitor\n---\nkind: Page", "multi.yaml");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ kind: "Monitor" });
    expect(result[1]).toEqual({ kind: "Page" });
  });

  it("returns array document as single element", () => {
    const result = loadAllYaml("- kind: Monitor\n- kind: Page", "list.yaml");
    expect(result).toHaveLength(1);
    expect(Array.isArray(result[0])).toBe(true);
  });

  it("throws enriched error for invalid multi-doc", () => {
    expect(() => loadAllYaml("valid: doc\n---\nbad: [unclosed", "bad.yaml")).toThrow(
      "bad.yaml"
    );
  });

  it("handles empty document stream", () => {
    const result = loadAllYaml("", "empty.yaml");
    expect(result).toHaveLength(0);
  });
});

describe("loadYamlFromFile", () => {
  it("returns single document", () => {
    const result = loadYamlFromFile("hello: world", "test.yaml");
    expect(result.data).toEqual({ hello: "world" });
    expect(result.filePath).toBe("test.yaml");
  });

  it("throws for array at root", () => {
    expect(() => loadYamlFromFile("- a\n- b", "arr.yaml")).toThrow(/array/);
  });

  it("handles undefined/null content gracefully", () => {
    const result = loadYamlFromFile("~", "nil.yaml");
    expect(result.data).toEqual({});
  });
});

describe("loadAllYamlFromFile", () => {
  it("returns multiple documents", () => {
    const result = loadAllYamlFromFile("kind: Monitor\n---\nkind: Page", "multi.yaml");
    expect(result).toHaveLength(2);
    expect(result[0]!.data).toEqual({ kind: "Monitor" });
    expect(result[1]!.data).toEqual({ kind: "Page" });
  });

  it("unwraps top-level array into multiple results", () => {
    const result = loadAllYamlFromFile("- kind: Monitor\n- kind: Page", "list.yaml");
    expect(result).toHaveLength(2);
    expect(result[0]!.data).toEqual({ kind: "Monitor" });
    expect(result[1]!.data).toEqual({ kind: "Page" });
  });

  it("each result has filePath", () => {
    const result = loadAllYamlFromFile("kind: Monitor\n---\nkind: Page", "multi.yaml");
    expect(result[0]!.filePath).toBe("multi.yaml");
    expect(result[1]!.filePath).toBe("multi.yaml");
  });

  it("throws for invalid YAML", () => {
    expect(() => loadAllYamlFromFile("bad: [", "bad.yaml")).toThrow("bad.yaml");
  });
});
