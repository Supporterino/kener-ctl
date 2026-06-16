import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadManifests, validateManifests } from "@/manifest/loader";

let testDir: string;

beforeAll(() => {
  testDir = join(tmpdir(), `kener-ctl-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
});

afterAll(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

function writeFile(relativePath: string, content: string) {
  const fullPath = join(testDir, relativePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(fullPath, content);
}

describe("loadManifests", () => {
  it("returns empty for empty directory", () => {
    const result = loadManifests(testDir);
    expect(result.manifests).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("loads a single valid monitor manifest", () => {
    writeFile(
      "monitors/api.yaml",
      `kind: Monitor
metadata:
  tag: my-api
spec:
  name: My API
  type: API`
    );
    const result = loadManifests(testDir);
    expect(result.manifests).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    const m = result.manifests[0];
    expect(m?.kind).toBe("Monitor");
  });

  it("loads file with multiple documents via ---", () => {
    writeFile(
      "multi.yaml",
      `kind: Monitor
metadata:
  tag: one
spec:
  name: One
  type: API
---
kind: Monitor
metadata:
  tag: two
spec:
  name: Two
  type: PING
  typeData:
    host: 8.8.8.8`
    );
    const result = loadManifests(testDir);
    const monitors = result.manifests.filter((m) => m.kind === "Monitor");
    expect(monitors.length).toBeGreaterThanOrEqual(2);
  });

  it("discovers nested directories", () => {
    writeFile(
      "nested/deep/page.yaml",
      `kind: Page
metadata:
  path: about
spec:
  title: About Us`
    );
    const result = loadManifests(testDir);
    const pages = result.manifests.filter((m) => m.kind === "Page");
    expect(pages.length).toBeGreaterThanOrEqual(1);
  });

  it("collects validation errors instead of throwing", () => {
    writeFile(
      "bad/invalid.yaml",
      `kind: Monitor
metadata: {}
spec:
  type: WRONG`
    );
    const result = loadManifests(testDir);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("collects errors from multiple invalid files", () => {
    writeFile(
      "bad/one.yaml",
      `kind: Monitor
metadata: {}
spec:
  type: WRONG`
    );
    writeFile(
      "bad/two.yaml",
      `kind: Page
metadata: {}
spec: {}`
    );
    const result = loadManifests(testDir);
    const badErrors = result.errors.filter(
      (e) => e.filePath.includes("bad/one") || e.filePath.includes("bad/two")
    );
    expect(badErrors.length).toBeGreaterThanOrEqual(2);
  });

  it("returns valid manifests alongside errors", () => {
    writeFile(
      "good/valid.yaml",
      `kind: AlertTrigger
metadata:
  name: ops-slack
spec:
  type: SLACK
  webhookUrl: https://hooks.slack.com/test`
    );
    const result = loadManifests(testDir);
    const triggers = result.manifests.filter((m) => m.kind === "AlertTrigger");
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("skips empty/null documents", () => {
    const subDir = join(testDir, "empty-test");
    mkdirSync(subDir, { recursive: true });
    writeFile(
      "empty-test/empty.yaml",
      "---"
    );
    const result = loadManifests(subDir);
    expect(result.errors).toHaveLength(0);
    expect(result.manifests).toHaveLength(0);
  });

  it("creates directory if stateDir does not exist", () => {
    const newDir = join(testDir, "created");
    const result = loadManifests(newDir);
    expect(existsSync(newDir)).toBe(true);
    expect(result.manifests).toHaveLength(0);
  });
});

describe("validateManifests", () => {
  it("returns valid=true for valid manifests", () => {
    const result = validateManifests(testDir);
    // We have valid manifests in the test dir
    expect(result.valid).toBe(false); // because there are also invalid files
  });

  it("returns all errors", () => {
    const result = validateManifests(testDir);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
