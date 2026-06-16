import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateManifests, loadManifests } from "@/manifest/loader";

describe("validate command logic", () => {
  let testDir: string;

  beforeAll(() => {
    testDir = join(tmpdir(), `kener-ctl-validate-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  });

  it("reports valid manifests", () => {
    writeFileSync(
      join(testDir, "valid.yaml"),
      `kind: Monitor
metadata:
  tag: my-api
spec:
  name: My API
  type: API`
    );
    const result = validateManifests(testDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports invalid manifests", () => {
    writeFileSync(
      join(testDir, "bad.yaml"),
      `kind: Monitor
metadata: {}
spec:
  type: INVALID`
    );
    const result = validateManifests(testDir);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("loadManifests collects errors without throwing", () => {
    writeFileSync(
      join(testDir, "mixed.yaml"),
      `kind: Monitor
metadata:
  tag: good
spec:
  name: Good
  type: API
---
kind: Monitor
metadata: {}
spec:
  type: BAD`
    );
    const result = loadManifests(testDir);
    // Should have at least the good monitor
    expect(result.manifests.some((m) => m.kind === "Monitor")).toBe(true);
    // Should have errors from the invalid document
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("empty directory returns valid and empty", () => {
    const emptyDir = join(testDir, "empty");
    mkdirSync(emptyDir, { recursive: true });
    const result = validateManifests(emptyDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detects multiple validation issues in one file", () => {
    const subDir = join(testDir, "multi-issues");
    mkdirSync(subDir, { recursive: true });
    writeFileSync(
      join(subDir, "broken.yaml"),
      `kind: Monitor
metadata: {}
spec:
  name: ""
  type: INVALID`
    );
    const result = loadManifests(subDir);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
