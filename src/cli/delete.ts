import { createInterface } from "node:readline/promises"
import chalk from "chalk"
import { defineCommand } from "citty"
import { consola } from "consola"
import { createKenerClient } from "@/api/client"
import { createIncidentsApi } from "@/api/incidents"
import { createMaintenancesApi } from "@/api/maintenances"
import { createMonitorsApi } from "@/api/monitors"
import { createPagesApi } from "@/api/pages"
import { loadConfig } from "@/config/loader"
import { ConfigError, NetworkError } from "@/util/errors"
import { contextArg, formatKind, isValidKind, yesFlag } from "./shared"

const VALID_DELETE_KINDS = "monitor|page|incident|maintenance"

export const deleteCommand = defineCommand({
  meta: {
    name: "delete",
    description: "Immediately delete a single remote resource",
  },
  args: {
    kind: {
      type: "positional" as const,
      description: "Resource kind to delete",
      valueHint: VALID_DELETE_KINDS,
      required: true,
    },
    id: {
      type: "positional" as const,
      description: "Resource identifier (tag, path, or numeric ID)",
      valueHint: "my-api",
      required: true,
    },
    context: contextArg,
    yes: yesFlag,
  },
  async run({ args }) {
    try {
      const config = await loadConfig({
        context: args.context,
      })

      const lower = args.kind.toLowerCase()
      if (
        lower === "trigger" ||
        lower === "triggers" ||
        lower === "alerttrigger" ||
        lower === "alerttriggers"
      ) {
        consola.error(
          "AlertTrigger is not supported — this endpoint is not yet available in Kener v4.",
        )
        process.exit(1)
      }
      if (
        lower === "alertconfig" ||
        lower === "alertconfigs" ||
        lower === "alert-config" ||
        lower === "alert-configs"
      ) {
        consola.error(
          "AlertConfig is not supported — this endpoint is not yet available in Kener v4.",
        )
        process.exit(1)
      }

      const kind = formatKind(args.kind)

      if (!isValidKind(kind)) {
        consola.error(
          `Unknown resource kind: ${args.kind}. Valid kinds: Monitor, Page, Incident, Maintenance`,
        )
        process.exit(1)
      }

      if (!args.yes) {
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        const verb = kind === "Monitor" ? "deactivate" : "delete"
        const answer = await rl.question(
          chalk.yellow(`Are you sure you want to ${verb} ${kind} "${args.id}"? [y/N] `),
        )
        rl.close()
        if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
          consola.info("Delete cancelled.")
          return
        }
      }

      const client = createKenerClient(config.instance, config.apiKey)

      switch (kind) {
        case "Monitor": {
          const api = createMonitorsApi(client)
          if (!Number.isNaN(Number(args.id))) {
            throw new Error(
              "Monitors must be identified by tag, not numeric ID. Use the monitor's tag.",
            )
          }
          await api.deactivate(args.id)
          consola.success(
            chalk.green(
              `Monitor "${args.id}" deactivated. (Note: Kener v4 does not support hard-deletion of monitors.)`,
            ),
          )
          break
        }
        case "Page": {
          const api = createPagesApi(client)
          await api.delete(args.id)
          consola.success(chalk.green(`Page "${args.id}" deleted successfully.`))
          break
        }
        case "Incident": {
          const api = createIncidentsApi(client)
          await api.delete(Number(args.id))
          consola.success(chalk.green(`Incident ${args.id} deleted successfully.`))
          break
        }
        case "Maintenance": {
          const api = createMaintenancesApi(client)
          await api.delete(Number(args.id))
          consola.success(chalk.green(`Maintenance ${args.id} deleted successfully.`))
          break
        }
        default:
          throw new Error(`Unknown kind: ${kind}`)
      }
    } catch (err) {
      if (err instanceof ConfigError) {
        consola.error(err.toString())
        process.exit(1)
      }
      if (err instanceof NetworkError) {
        consola.error(chalk.red(err.message))
        process.exit(1)
      }
      consola.error(chalk.red(err instanceof Error ? err.message : String(err)))
      process.exit(1)
    }
  },
})
