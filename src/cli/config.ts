import { readFileSync, writeFileSync } from "node:fs"
import chalk from "chalk"
import { defineCommand } from "citty"
import Table from "cli-table3"
import { consola } from "consola"
import { dump as yamlDump, load as yamlLoad } from "js-yaml"
import { configFilePath, loadConfigRaw } from "@/config/loader"
import { ConfigError } from "@/util/errors"

function loadRawConfig(): { config: Record<string, unknown>; path: string } | null {
  const path = configFilePath()
  try {
    const content = readFileSync(path, "utf-8")
    return { config: (yamlLoad(content) as Record<string, unknown>) ?? {}, path }
  } catch {
    return null
  }
}

const useSubcommand = defineCommand({
  meta: {
    name: "use",
    description: "Set the current Kener context",
  },
  args: {
    name: {
      type: "positional" as const,
      description: "Context name to switch to",
      required: true,
    },
  },
  async run({ args }) {
    try {
      await loadConfigRaw({ context: args.name })

      const raw = loadRawConfig()
      if (!raw) {
        throw new ConfigError([
          `No config file found at ${configFilePath()}`,
          "Create one with at least one context.",
        ])
      }

      const current = raw.config["current-context"] as string | undefined
      if (current === args.name) {
        consola.info(`Already using context "${args.name}".`)
        return
      }

      raw.config["current-context"] = args.name as string
      writeFileSync(raw.path, yamlDump(raw.config), "utf-8")
      consola.success(chalk.green(`Switched to context "${args.name}".`))
    } catch (err) {
      if (err instanceof ConfigError) {
        consola.error(err.toString())
        process.exit(1)
      }
      consola.error(chalk.red(err instanceof Error ? err.message : String(err)))
      process.exit(1)
    }
  },
})

const currentSubcommand = defineCommand({
  meta: {
    name: "current",
    description: "Print the current Kener context name",
  },
  async run() {
    try {
      const raw = loadRawConfig()
      if (!raw) {
        throw new ConfigError([
          `No config file found at ${configFilePath()}`,
          "Create one with at least one context.",
        ])
      }

      const current = raw.config["current-context"] as string | undefined
      if (!current) {
        consola.warn("No current-context set in config file.")
        return
      }

      consola.log(current)
    } catch (err) {
      if (err instanceof ConfigError) {
        consola.error(err.toString())
        process.exit(1)
      }
      consola.error(chalk.red(err instanceof Error ? err.message : String(err)))
      process.exit(1)
    }
  },
})

const listSubcommand = defineCommand({
  meta: {
    name: "list",
    description: "List all Kener contexts",
  },
  async run() {
    try {
      const raw = loadRawConfig()
      if (!raw) {
        throw new ConfigError([
          `No config file found at ${configFilePath()}`,
          "Create one with at least one context.",
        ])
      }

      const contexts = raw.config.contexts as
        | Array<{ name: string; instance: string; apiKey: string }>
        | undefined
      if (!contexts || contexts.length === 0) {
        consola.warn("No contexts defined in config file.")
        return
      }

      const current = raw.config["current-context"] as string | undefined

      const table = new Table({
        head: [chalk.bold("NAME"), chalk.bold("INSTANCE"), chalk.bold("CURRENT")],
        style: { head: [], border: [] },
      })

      for (const ctx of contexts) {
        const isCurrent = ctx.name === current
        table.push([
          isCurrent ? chalk.green(`* ${ctx.name}`) : `  ${ctx.name}`,
          ctx.instance,
          isCurrent ? chalk.green("*") : "",
        ])
      }

      consola.log(table.toString())
    } catch (err) {
      if (err instanceof ConfigError) {
        consola.error(err.toString())
        process.exit(1)
      }
      consola.error(chalk.red(err instanceof Error ? err.message : String(err)))
      process.exit(1)
    }
  },
})

export const configCommand = defineCommand({
  meta: {
    name: "config",
    description: "Manage kener-ctl configuration and contexts",
  },
  subCommands: {
    use: useSubcommand,
    current: currentSubcommand,
    list: listSubcommand,
  },
})
