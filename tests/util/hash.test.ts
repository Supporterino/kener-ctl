import { describe, it, expect } from "bun:test";
import { stableDigest, stableStringify, digestEqual } from "@/util/hash";

describe("stableStringify", () => {
  it("produces deterministic output for same objects", () => {
    const a = stableStringify({ b: 1, a: 2 });
    const b = stableStringify({ a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it("sorts nested object keys", () => {
    const a = stableStringify({ outer: { b: 1, a: 2 } });
    const b = stableStringify({ outer: { a: 2, b: 1 } });
    expect(a).toBe(b);
  });

  it("handles arrays without reordering", () => {
    const result = stableStringify(["b", "a", "c"]);
    expect(result).toBe('["b","a","c"]');
  });

  it("sorts Date to ISO string", () => {
    const date = new Date("2025-06-16T00:00:00Z");
    const result = stableStringify({ d: date });
    expect(result).toBe('{"d":"2025-06-16T00:00:00.000Z"}');
  });

  it("produces different output for different objects", () => {
    const a = stableStringify({ x: 1 });
    const b = stableStringify({ x: 2 });
    expect(a).not.toBe(b);
  });

  it("handles null and undefined", () => {
    const result = stableStringify({ a: null, b: 1 });
    expect(result).toBe('{"a":null,"b":1}');
  });

  it("handles nested arrays", () => {
    const result = stableStringify({ items: [{ b: 1, a: 2 }] });
    expect(result).toBe('{"items":[{"a":2,"b":1}]}');
  });
});

describe("stableDigest", () => {
  it("produces same hash for equal objects", () => {
    const h1 = stableDigest({ a: 1, b: 2 });
    const h2 = stableDigest({ b: 2, a: 1 });
    expect(h1).toBe(h2);
  });

  it("produces different hash for different objects", () => {
    const h1 = stableDigest({ x: 1 });
    const h2 = stableDigest({ x: 2 });
    expect(h1).not.toBe(h2);
  });

  it("produces hex string of length 16", () => {
    const hash = stableDigest({});
    expect(hash).toHaveLength(16);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("produces same hash for deeply nested equal objects", () => {
    const h1 = stableDigest({ a: { b: { c: 1, d: 2 } } });
    const h2 = stableDigest({ a: { b: { d: 2, c: 1 } } });
    expect(h1).toBe(h2);
  });
});

describe("digestEqual", () => {
  it("returns true for equal objects", () => {
    expect(digestEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("returns false for different objects", () => {
    expect(digestEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});
