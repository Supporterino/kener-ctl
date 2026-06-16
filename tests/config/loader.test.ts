import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { dump as yamlDump } from "js-yaml"
import { stateFilePath } from "@/config/loader"

let origEnv: typeof Bun.env

beforeAll(() => {
  origEnv = { ...Bun.env }
})

afterAll(() => {
  // Restore env
  for (const key of Object.keys(Bun.env)) {
    if (!(key in origEnv)) {
      delete (Bun.env as Record<string, string | undefined>)[key]
    }
  }
  for (const [key, value] of Object.entries(origEnv)) {
    ;(Bun.env as Record<string, string | undefined>)[key] = value
  }
})

describe("stateFilePath", () => {
  it("produces the correct path for a context name", () => {
    const path = stateFilePath("prod")
    expect(path).toContain("kener-ctl")
    expect(path).toContain("state")
    expect(path).toContain("prod.json")
  })

  it("produces different paths for different contexts", () => {
    const prod = stateFilePath("prod")
    const staging = stateFilePath("staging")
    expect(prod).not.toBe(staging)
    expect(prod).toContain("prod.json")
    expect(staging).toContain("staging.json")
  })
})

describe("loadConfig (integration)", () => {
  let tempDir: string
  let configFilePath: string

  beforeAll(() => {
    tempDir = join(tmpdir(), `kener-ctl-test-${Date.now()}`)
    mkdirSync(join(tempDir, "kener-ctl"), { recursive: true })
    configFilePath = join(tempDir, "kener-ctl", "config.yaml")

    const validConfig = {
      version: 1,
      "current-context": "prod",
      contexts: [
        { name: "prod", instance: "https://status.prod.example.com", apiKey: "sk-prod" },
        { name: "staging", instance: "https://status.staging.example.com", apiKey: "sk-staging" },
      ],
    }
    writeFileSync(configFilePath, yamlDump(validConfig))
  })

  afterAll(() => {
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true })
  })

  it("loads config with XDG_CONFIG_HOME env", async () => {
    ;(Bun.env as Record<string, string | undefined>).XDG_CONFIG_HOME = tempDir
    const { loadConfig } = await import("@/config/loader")
    const config = await loadConfig()
    expect(config.instance).toBe("https://status.prod.example.com")
    expect(config.apiKey).toBe("sk-prod")
    expect(config.contextName).toBe("prod")
    expect(config.stateDir).toBe("./state")
    expect(config.concurrency).toBe(4)
  })

  it("loads config with explicit context override", async () => {
    ;(Bun.env as Record<string, string | undefined>).XDG_CONFIG_HOME = tempDir
    delete (Bun.env as Record<string, string | undefined>).KENER_CONTEXT
    const { loadConfig } = await import("@/config/loader")
    const config = await loadConfig({ context: "staging" })
    expect(config.instance).toBe("https://status.staging.example.com")
    expect(config.contextName).toBe("staging")
  })

  it("loads config with KENER_CONTEXT env var", async () => {
    ;(Bun.env as Record<string, string | undefined>).XDG_CONFIG_HOME = tempDir
    ;(Bun.env as Record<string, string | undefined>).KENER_CONTEXT = "staging"
    const { loadConfig } = await import("@/config/loader")
    const config = await loadConfig()
    expect(config.contextName).toBe("staging")
    expect(config.instance).toBe("https://status.staging.example.com")
  })

  it("throws on non-existent context", async () => {
    ;(Bun.env as Record<string, string | undefined>).XDG_CONFIG_HOME = tempDir
    delete (Bun.env as Record<string, string | undefined>).KENER_CONTEXT
    const { loadConfig } = await import("@/config/loader")
    await expect(loadConfig({ context: "nonexistent" })).rejects.toThrow("Configuration error")
  })

  it("throws when config file is missing", async () => {
    ;(Bun.env as Record<string, string | undefined>).XDG_CONFIG_HOME = join(
      tmpdir(),
      "nonexistent-dir",
    )
    delete (Bun.env as Record<string, string | undefined>).KENER_CONTEXT
    const { loadConfig } = await import("@/config/loader")
    await expect(loadConfig()).rejects.toThrow("Configuration error")
  })
})
