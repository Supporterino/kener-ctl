import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { load as yamlLoad } from "js-yaml"
import { ConfigError } from "@/util/errors"
import type { ResolvedConfig } from "./schema"
import { ConfigSchema } from "./schema"

function xdgConfigHome(): string {
  const env = Bun.env.XDG_CONFIG_HOME
  if (env) return env
  return join(homedir(), ".config")
}

export function configDir(): string {
  return join(xdgConfigHome(), "kener-ctl")
}

export function configFilePath(): string {
  return join(configDir(), "config.yaml")
}

export function stateFilePath(contextName: string): string {
  return join(configDir(), "state", `${contextName}.json`)
}

function parseConfigFile(path: string): Record<string, unknown> {
  const content = readFileSync(path, "utf-8")
  return (yamlLoad(content) as Record<string, unknown>) ?? {}
}

export interface LoadConfigOptions {
  context?: string
}

export async function loadConfig(opts: LoadConfigOptions = {}): Promise<ResolvedConfig> {
  const configPath = configFilePath()

  if (!existsSync(configPath)) {
    throw new ConfigError([
      `No config file found at ${configPath}`,
      "Create one with at least one context, or run 'kener-ctl config' for guidance.",
    ])
  }

  let raw: Record<string, unknown>
  try {
    raw = parseConfigFile(configPath)
  } catch (err) {
    throw new ConfigError([
      `Failed to parse config at ${configPath}: ${err instanceof Error ? err.message : String(err)}`,
    ])
  }

  const result = ConfigSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    throw new ConfigError(issues)
  }

  const config = result.data

  const resolvedName = opts.context ?? Bun.env.KENER_CONTEXT ?? config["current-context"]

  const selectedContext = config.contexts.find((c) => c.name === resolvedName)
  if (!selectedContext) {
    throw new ConfigError([
      `Context "${resolvedName}" not found in config file`,
      `Available contexts: ${config.contexts.map((c) => c.name).join(", ")}`,
    ])
  }

  return {
    instance: selectedContext.instance,
    apiKey: selectedContext.apiKey,
    manifestDir: config.defaults.manifestDir,
    dryRun: config.defaults.dryRun,
    deleteOrphans: config.defaults.deleteOrphans,
    concurrency: config.defaults.concurrency,
    contextName: selectedContext.name,
  }
}

export async function loadConfigRaw(opts: LoadConfigOptions = {}): Promise<{
  config: ReturnType<typeof ConfigSchema.parse>
  resolvedName: string
}> {
  const configPath = configFilePath()

  if (!existsSync(configPath)) {
    throw new ConfigError([
      `No config file found at ${configPath}`,
      "Create one with at least one context, or run 'kener-ctl config' for guidance.",
    ])
  }

  let raw: Record<string, unknown>
  try {
    raw = parseConfigFile(configPath)
  } catch (err) {
    throw new ConfigError([
      `Failed to parse config at ${configPath}: ${err instanceof Error ? err.message : String(err)}`,
    ])
  }

  const result = ConfigSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    throw new ConfigError(issues)
  }

  const resolvedName = opts.context ?? Bun.env.KENER_CONTEXT ?? result.data["current-context"]

  return { config: result.data, resolvedName }
}

export { ConfigError }
