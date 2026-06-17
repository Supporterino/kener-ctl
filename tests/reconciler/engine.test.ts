import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { KyInstance } from "ky"
import { loadStateFile, plan, reconcile, saveStateFile } from "@/reconciler/engine"

let baseDir: string
let manifestDir: string

beforeAll(() => {
  baseDir = join(tmpdir(), `kener-ctl-engine-${Date.now()}`)
  mkdirSync(baseDir, { recursive: true })
  manifestDir = join(baseDir, "state", "test")
  mkdirSync(manifestDir, { recursive: true })
})

afterAll(() => {
  if (existsSync(baseDir)) {
    rmSync(baseDir, { recursive: true, force: true })
  }
})

function createManifestDir(name: string): string {
  const dir = join(baseDir, `state_${name}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function stateFilePathForDir(dir: string): string {
  return join(baseDir, `state_file_${dir.split("_").pop()}.json`)
}

function writeManifest(manifestDir: string, filename: string, content: string) {
  writeFileSync(join(manifestDir, filename), content)
}

function createMockKy(): KyInstance {
  const wrappers: Record<string, unknown> = {
    monitors: { monitors: [] },
    pages: { pages: [] },
    incidents: { incidents: [] },
    maintenances: { maintenances: [] },
  }

  const singularWrappers: Record<string, unknown> = {
    monitors: {
      monitor: {
        tag: "t",
        name: "t",
        monitor_type: "NONE",
        cron: "* * * * *",
        default_status: "DOWN",
      },
    },
    pages: { page: { id: 1, page_path: "", page_title: "t" } },
    incidents: { incident: { id: 1, title: "t", start_date_time: 0 } },
    maintenances: {
      maintenance: {
        id: 1,
        title: "t",
        start_date_time: 0,
        rrule: "r",
        duration_seconds: 0,
        status: "s",
      },
    },
  }

  return {
    get: (path: string | URL) => {
      const p = typeof path === "string" ? path : path.toString()
      return {
        json: async () => {
          for (const [key, data] of Object.entries(wrappers)) {
            if (p.includes(key)) return data
          }
          return { id: 1 }
        },
      }
    },
    post: (path: string | URL) => {
      const p = typeof path === "string" ? path : path.toString()
      return {
        json: async () => {
          for (const [key, data] of Object.entries(singularWrappers)) {
            if (p.includes(key)) return data
          }
          return { id: 1 }
        },
      }
    },
    patch: (path: string | URL) => {
      const p = typeof path === "string" ? path : path.toString()
      return {
        json: async () => {
          for (const [key, data] of Object.entries(singularWrappers)) {
            if (p.includes(key)) return data
          }
          return { id: 1 }
        },
      }
    },
    delete: () => Promise.resolve(),
  } as unknown as KyInstance
}

describe("engine reconcile", () => {
  it("throws on invalid manifests", async () => {
    const dir = createManifestDir("invalid")
    writeManifest(dir, "bad.yaml", "kind: Monitor\nmetadata: {}\nspec:\n  type: INVALID")
    const client = createMockKy()
    const sfp = stateFilePathForDir(dir)
    await expect(
      reconcile({
        client,
        manifestDir: dir,
        dryRun: true,
        deleteOrphans: false,
        concurrency: 4,
        stateFilePath: sfp,
      }),
    ).rejects.toThrow("Manifest validation failed")
  })

  it("reconcile creates new monitors", async () => {
    const dir = createManifestDir("create")
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
      manifestDir: dir,
      dryRun: false,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })
    expect(result.changes.length).toBeGreaterThan(0)
    expect(result.changes.some((c) => c.action === "CREATE")).toBe(true)
  })

  it("reconcile respects kind filter", async () => {
    const dir = createManifestDir("kind")
    writeManifest(
      dir,
      "incident.yaml",
      `kind: Incident
metadata:
  name: outage-1
spec:
  title: API Down
  startDatetime: 1765468800`,
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
      manifestDir: dir,
      dryRun: false,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
      kind: "Incident",
    })
    expect(result.changes.length).toBeGreaterThan(0)
    expect(result.changes.every((c) => c.kind === "Incident")).toBe(true)
  })

  it("rejects deprecated AlertTrigger kind", async () => {
    const dir = createManifestDir("deprecated")
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
    const client = createMockKy()
    const sfp = stateFilePathForDir(dir)
    await expect(
      reconcile({
        client,
        manifestDir: dir,
        dryRun: true,
        deleteOrphans: false,
        concurrency: 4,
        stateFilePath: sfp,
      }),
    ).rejects.toThrow("Manifest validation failed")
  })

  it("plan does not mutate (dryRun=true)", async () => {
    const dir = createManifestDir("plan")
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
      manifestDir: dir,
      dryRun: true,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })
    expect(result.changes.length).toBeGreaterThan(0)
    expect(result.changes.some((c) => c.action === "CREATE")).toBe(true)
  })

  it("plan returns empty when no manifests", async () => {
    const dir = createManifestDir("empty")
    const client = createMockKy()
    const sfp = stateFilePathForDir(dir)
    const result = await plan({
      client,
      manifestDir: dir,
      dryRun: true,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })
    expect(result.changes).toHaveLength(0)
  })
})

describe("engine dependency ordering", () => {
  it("calls list in apply order: monitors → pages → incidents → maintenances", async () => {
    const dir = createManifestDir("order")
    const callOrder: string[] = []
    const mockClient = {
      get: (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString()
        return {
          json: async () => {
            callOrder.push(p)
            if (p.includes("monitors")) return { monitors: [] }
            if (p.includes("pages")) return { pages: [] }
            if (p.includes("incidents")) return { incidents: [] }
            if (p.includes("maintenances")) return { maintenances: [] }
            return []
          },
        }
      },
      post: (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString()
        return {
          json: async () => {
            if (p.includes("monitors"))
              return {
                monitor: {
                  tag: "m",
                  name: "m",
                  monitor_type: "API",
                  cron: "* * * * *",
                  default_status: "DOWN",
                },
              }
            if (p.includes("pages")) return { page: { id: 1, page_path: "p", page_title: "p" } }
            if (p.includes("incidents"))
              return { incident: { id: 1, title: "i", start_date_time: 0 } }
            if (p.includes("maintenances"))
              return {
                maintenance: {
                  id: 1,
                  title: "m",
                  start_date_time: 0,
                  rrule: "r",
                  duration_seconds: 0,
                  status: "s",
                },
              }
            return { id: 1 }
          },
        }
      },
      patch: (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString()
        return {
          json: async () => {
            if (p.includes("monitors"))
              return {
                monitor: {
                  tag: "m",
                  name: "m",
                  monitor_type: "API",
                  cron: "* * * * *",
                  default_status: "DOWN",
                },
              }
            if (p.includes("pages")) return { page: { id: 1, page_path: "p", page_title: "p" } }
            if (p.includes("incidents"))
              return { incident: { id: 1, title: "i", start_date_time: 0 } }
            if (p.includes("maintenances"))
              return {
                maintenance: {
                  id: 1,
                  title: "m",
                  start_date_time: 0,
                  rrule: "r",
                  duration_seconds: 0,
                  status: "s",
                },
              }
            return { id: 1 }
          },
        }
      },
      delete: () => Promise.resolve(),
    } as unknown as KyInstance

    writeManifest(
      dir,
      "all.yaml",
      `kind: Monitor
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
kind: Incident
metadata:
  name: i
spec:
  title: i
  startDatetime: 1765468800
---
kind: Maintenance
metadata:
  name: mnt
spec:
  title: mnt
  startDatetime: 1765468800
  rrule: FREQ=WEEKLY
  durationSeconds: 3600`,
    )

    const sfp = stateFilePathForDir(dir)
    await reconcile({
      client: mockClient,
      manifestDir: dir,
      dryRun: false,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })

    expect(callOrder[0]).toBe("monitors")
    expect(callOrder[1]).toBe("pages")
    expect(callOrder[2]).toBe("incidents")
    expect(callOrder[3]).toBe("maintenances")
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
    }
    saveStateFile(path, state)
    const loaded = loadStateFile(path)
    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(1)
    expect(loaded?.incidents).toEqual({ "outage-1": 42 })
    expect(loaded?.maintenances).toEqual({ "maint-1": 7 })
  })

  it("saveStateFile creates parent directories and saves file", () => {
    const path = join(baseDir, "nested", "state.json")
    saveStateFile(path, {
      version: 1,
      incidents: {},
      maintenances: {},
    })
    expect(existsSync(path)).toBe(true)
  })
})

describe("engine error handling", () => {
  it("sends page monitors as string array in mutation body", async () => {
    const dir = createManifestDir("page-monitors")
    let capturedBody: unknown = null

    const mockClient = {
      get: (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString()
        return { json: async () => (p.includes("pages") ? { pages: [] } : { monitors: [], pages: [], incidents: [], maintenances: [] }) }
      },
      post: (_path: string | URL, opts?: { json?: unknown }) => {
        capturedBody = opts?.json
        return { json: async () => ({ page: { id: 1, page_path: "svc", page_title: "Svcs" } }) }
      },
      patch: (_path: string | URL, opts?: { json?: unknown }) => {
        capturedBody = opts?.json
        return { json: async () => ({ page: { id: 1, page_path: "svc", page_title: "Svcs" } }) }
      },
      delete: () => Promise.resolve(),
    } as unknown as KyInstance

    writeManifest(
      dir,
      "page.yaml",
      `kind: Page
metadata:
  path: svc
spec:
  title: Svcs
  monitors:
    - api-v1
    - db-check`,
    )

    const sfp = stateFilePathForDir(dir)
    await reconcile({
      client: mockClient,
      manifestDir: dir,
      dryRun: false,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })

    const body = capturedBody as Record<string, unknown>
    expect(body).toBeDefined()
    expect(body?.monitors).toEqual(["api-v1", "db-check"])
  })
  it("collects API errors per resource without aborting", async () => {
    const dir = createManifestDir("errors")
    const errorClient = {
      get: (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString()
        return {
          json: async () => {
            if (p.includes("monitors")) return { monitors: [] }
            if (p.includes("pages")) return { pages: [] }
            if (p.includes("incidents")) return { incidents: [] }
            if (p.includes("maintenances")) return { maintenances: [] }
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
      "incident.yaml",
      `kind: Incident
metadata:
  name: incident-err
spec:
  title: Test
  startDatetime: 1765468800`,
    )

    const sfp = stateFilePathForDir(dir)
    const result = await reconcile({
      client: errorClient,
      manifestDir: dir,
      dryRun: false,
      deleteOrphans: false,
      concurrency: 4,
      stateFilePath: sfp,
    })

    expect(result.errors.length).toBeGreaterThan(0)
  })
})
