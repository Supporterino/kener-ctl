import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { KyInstance } from "ky"
import { loadStateFile, plan, reconcile, saveStateFile } from "@/reconciler/engine"

let baseDir: string
let stateDir: string

beforeAll(() => {
  baseDir = join(tmpdir(), `kener-ctl-engine-${Date.now()}`)
  mkdirSync(baseDir, { recursive: true })
  stateDir = join(baseDir, "state", "test")
  mkdirSync(stateDir, { recursive: true })
})

afterAll(() => {
  if (existsSync(baseDir)) {
    rmSync(baseDir, { recursive: true, force: true })
  }
})

function createStateDir(name: string): string {
  const dir = join(baseDir, `state_${name}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function stateFilePathForDir(dir: string): string {
  return join(baseDir, `state_file_${dir.split("_").pop()}.json`)
}

function writeManifest(stateDir: string, filename: string, content: string) {
  writeFileSync(join(stateDir, filename), content)
}

function createMockKy(
  overrides: { listData?: Record<string, unknown[]>; createId?: number; updateId?: number } = {},
): KyInstance {
  const listData = overrides.listData ?? {}
  return {
    get: (path: string | URL) => ({
      json: async () => {
        const p = typeof path === "string" ? path : path.toString()
        for (const [key, data] of Object.entries(listData)) {
          if (p.includes(key)) return data
        }
        return []
      },
    }),
    post: () => ({
      json: async () => ({ id: overrides.createId ?? 1 }),
    }),
    patch: () => ({
      json: async () => ({ id: overrides.updateId ?? 1 }),
    }),
    delete: () => Promise.resolve(),
  } as unknown as KyInstance
}

describe("engine reconcile", () => {
  it("throws on invalid manifests", async () => {
    const dir = createStateDir("invalid")
    writeManifest(dir, "bad.yaml", "kind: Monitor\nmetadata: {}\nspec:\n  type: INVALID")
    const client = createMockKy()
    const sfp = stateFilePathForDir(dir)
    await expect(
      reconcile({
        client,
        stateDir: dir,
        dryRun: true,
        deleteOrphans: false,
        concurrency: 4,
        stateFilePath: sfp,
      }),
    ).rejects.toThrow("Manifest validation failed")
  })

  it("reconcile creates new monitors", async () => {
    const dir = createStateDir("create")
    writeManifest(
      dir,
      "monitors.yaml",
      `kind: Monitor
metadata:
  tag: my-api
spec:
  name: My API
  type: API`,
    )
    const client = createMockKy()
    const sfp = stateFilePathForDir(dir)
    const result = await reconcile({
      client,
      stateDir: dir,
      dryRun: false,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })
    expect(result.changes.length).toBeGreaterThan(0)
    expect(result.changes.some((c) => c.action === "CREATE")).toBe(true)
  })

  it("reconcile respects kind filter", async () => {
    const dir = createStateDir("kind")
    writeManifest(
      dir,
      "trigger.yaml",
      `kind: AlertTrigger
metadata:
  name: ops-slack
spec:
  type: SLACK
  webhookUrl: https://hooks.slack.com/test`,
    )
    writeManifest(
      dir,
      "monitor.yaml",
      `kind: Monitor
metadata:
  tag: other
spec:
  name: Other
  type: API`,
    )
    const client = createMockKy()
    const sfp = stateFilePathForDir(dir)
    const result = await reconcile({
      client,
      stateDir: dir,
      dryRun: false,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
      kind: "AlertTrigger",
    })
    expect(result.changes.length).toBeGreaterThan(0)
    expect(result.changes.every((c) => c.kind === "AlertTrigger")).toBe(true)
  })

  it("plan does not mutate (dryRun=true)", async () => {
    const dir = createStateDir("plan")
    writeManifest(
      dir,
      "test.yaml",
      `kind: Monitor
metadata:
  tag: plan-test
spec:
  name: Plan Test
  type: API`,
    )
    const client = createMockKy()
    const sfp = stateFilePathForDir(dir)
    const result = await plan({
      client,
      stateDir: dir,
      dryRun: true,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })
    expect(result.changes.length).toBeGreaterThan(0)
    expect(result.changes.some((c) => c.action === "CREATE")).toBe(true)
  })

  it("plan returns empty when no manifests", async () => {
    const dir = createStateDir("empty")
    const client = createMockKy()
    const sfp = stateFilePathForDir(dir)
    const result = await plan({
      client,
      stateDir: dir,
      dryRun: true,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })
    expect(result.changes).toHaveLength(0)
  })
})

describe("engine dependency ordering", () => {
  it("calls list in apply order: triggers → monitors → pages → alertConfigs → incidents → maintenances", async () => {
    const dir = createStateDir("order")
    const callOrder: string[] = []
    const mockClient = {
      get: (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString()
        return {
          json: async () => {
            callOrder.push(p)
            return []
          },
        }
      },
      post: () => ({ json: async () => ({ id: 1 }) }),
      patch: () => ({ json: async () => ({ id: 1 }) }),
      delete: () => Promise.resolve(),
    } as unknown as KyInstance

    writeManifest(
      dir,
      "all.yaml",
      `kind: AlertTrigger
metadata:
  name: t
spec:
  type: SLACK
  webhookUrl: https://e.com
---
kind: Monitor
metadata:
  tag: m
spec:
  name: m
  type: API
---
kind: Page
metadata:
  path: p
spec:
  title: p
---
kind: AlertConfig
metadata:
  name: a
spec:
  monitorTag: m
  alertType: STATUS
  alertValue: DOWN
---
kind: Incident
metadata:
  name: i
spec:
  title: i
---
kind: Maintenance
metadata:
  name: mnt
spec:
  title: mnt
  startDatetime: "2025-06-16T00:00:00.000Z"
  endDatetime: "2025-06-16T02:00:00.000Z"`,
    )

    const sfp = stateFilePathForDir(dir)
    await reconcile({
      client: mockClient,
      stateDir: dir,
      dryRun: false,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })

    expect(callOrder[0]).toBe("alert-triggers")
    expect(callOrder[1]).toBe("monitors")
    expect(callOrder[2]).toBe("pages")
    expect(callOrder[3]).toBe("alert-configs")
    expect(callOrder[4]).toBe("incidents")
    expect(callOrder[5]).toBe("maintenances")
  })
})

describe("state file management", () => {
  it("loadStateFile returns null when file does not exist", () => {
    const path = join(baseDir, "nonexistent.json")
    const state = loadStateFile(path)
    expect(state).toBeNull()
  })

  it("saveStateFile and loadStateFile round-trip all sections", () => {
    const path = join(baseDir, "roundtrip.json")
    const state = {
      version: 1,
      incidents: { "outage-1": 42 },
      maintenances: { "maint-1": 7 },
      alertConfigs: { "cfg-1": 3 },
    }
    saveStateFile(path, state)
    const loaded = loadStateFile(path)
    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(1)
    expect(loaded?.incidents).toEqual({ "outage-1": 42 })
    expect(loaded?.maintenances).toEqual({ "maint-1": 7 })
    expect(loaded?.alertConfigs).toEqual({ "cfg-1": 3 })
  })

  it("saveStateFile creates parent directories and saves file", () => {
    const path = join(baseDir, "nested", "state.json")
    saveStateFile(path, { version: 1 })
    expect(existsSync(path)).toBe(true)
  })
})

describe("engine error handling", () => {
  it("collects API errors per resource without aborting", async () => {
    const dir = createStateDir("errors")
    const errorClient = {
      get: (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString()
        return {
          json: async () => {
            if (p.includes("alert-triggers")) return []
            return []
          },
        }
      },
      post: () => ({
        json: async () => {
          throw Object.assign(new Error("400 Bad Request"), {
            response: { status: 400 },
          })
        },
      }),
      patch: () => ({
        json: async () => {
          throw Object.assign(new Error("500 Internal Server Error"), {
            response: { status: 500 },
          })
        },
      }),
      delete: () => Promise.resolve(),
    } as unknown as KyInstance

    writeManifest(
      dir,
      "trigger.yaml",
      `kind: AlertTrigger
metadata:
  name: trigger-err
spec:
  type: SLACK
  webhookUrl: https://example.com`,
    )

    const sfp = stateFilePathForDir(dir)
    const result = await reconcile({
      client: errorClient,
      stateDir: dir,
      dryRun: false,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })

    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("produces error for failed update", async () => {
    const dir = createStateDir("updaterr")
    const errorClient = {
      get: (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString()
        return {
          json: async () => {
            if (p.includes("alert-triggers")) {
              return [{ id: 1, name: "existing", type: "SLACK", webhookUrl: "https://example.com" }]
            }
            return []
          },
        }
      },
      post: () => ({ json: async () => ({ id: 2 }) }),
      patch: () => ({
        json: async () => {
          throw Object.assign(new Error("400 Bad Request"), {
            response: { status: 400 },
          })
        },
      }),
      delete: () => Promise.resolve(),
    } as unknown as KyInstance

    writeManifest(
      dir,
      "trigger.yaml",
      `kind: AlertTrigger
metadata:
  name: existing
spec:
  type: DISCORD
  webhookUrl: https://discord.com/updated`,
    )

    const sfp = stateFilePathForDir(dir)
    const result = await reconcile({
      client: errorClient,
      stateDir: dir,
      dryRun: false,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })

    const failed = result.results.filter((r) => !r.success)
    expect(failed.length).toBeGreaterThan(0)
  })
})
