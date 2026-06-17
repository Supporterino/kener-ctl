import chalk from "chalk"
import { defineCommand } from "citty"
import { consola } from "consola"
import { createKenerClient } from "@/api/client"
import { createIncidentsApi } from "@/api/incidents"
import { createMaintenancesApi } from "@/api/maintenances"
import { createMonitorsApi } from "@/api/monitors"
import { createPagesApi } from "@/api/pages"
import { loadConfig } from "@/config/loader"
import type { AnyManifest } from "@/manifest/types"
import { printResourceDetails, printResourceList } from "@/output/printer"
import { ConfigError, NetworkError } from "@/util/errors"
import { contextArg, formatKind, isValidKind, outputArg } from "./shared"

const VALID_KINDS = "monitors|pages|incidents|maintenances"

export const getCommand = defineCommand({
  meta: {
    name: "get",
    description: "Fetch and display one or all resources of a kind",
  },
  args: {
    kind: {
      type: "positional" as const,
      description: "Resource kind to fetch",
      valueHint: VALID_KINDS,
      required: true,
    },
    id: {
      type: "positional" as const,
      description: "Resource identifier (tag, path, or numeric ID)",
      valueHint: "my-api",
    },
    context: contextArg,
    output: outputArg,
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

      const client = createKenerClient(config.instance, config.apiKey)
      const kind = formatKind(args.kind)
      const format = (args.output as "table" | "json" | "yaml") ?? "table"

      if (!isValidKind(kind)) {
        consola.error(
          `Unknown resource kind: ${args.kind}. Valid kinds: Monitor, Page, Incident, Maintenance`,
        )
        process.exit(1)
      }

      if (args.id) {
        let resource: unknown
        switch (kind) {
          case "Monitor": {
            const api = createMonitorsApi(client)
            resource = await api.get(args.id)
            break
          }
          case "Page": {
            const api = createPagesApi(client)
            const all = await api.list()
            resource = all.find((p) => p.page_path === args.id)
            if (!resource) throw new Error(`Page with path "${args.id}" not found`)
            break
          }
          case "Incident": {
            const api = createIncidentsApi(client)
            resource = await api.get(Number(args.id))
            break
          }
          case "Maintenance": {
            const api = createMaintenancesApi(client)
            resource = await api.get(Number(args.id))
            break
          }
          default:
            throw new Error(`Unknown kind: ${kind}`)
        }

        printResourceDetails(resource as AnyManifest, format)
      } else {
        let resources: unknown[]
        switch (kind) {
          case "Monitor":
            resources = await createMonitorsApi(client).list()
            break
          case "Page":
            resources = await createPagesApi(client).list()
            break
          case "Incident":
            resources = await createIncidentsApi(client).list()
            break
          case "Maintenance":
            resources = await createMaintenancesApi(client).list()
            break
          default:
            throw new Error(`Unknown kind: ${kind}`)
        }

        printResourceList(kind, resources, format)
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
