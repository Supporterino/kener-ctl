import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import chalk from "chalk"
import { defineCommand } from "citty"
import { consola } from "consola"
import { createAlertConfigsApi } from "@/api/alert-configs"
import { createKenerClient } from "@/api/client"
import { createIncidentsApi } from "@/api/incidents"
import { createMaintenancesApi } from "@/api/maintenances"
import { createMonitorsApi } from "@/api/monitors"
import { createPagesApi } from "@/api/pages"
import { createTriggersApi } from "@/api/triggers"
import { loadConfig } from "@/config/loader"
import { ConfigError, NetworkError } from "@/util/errors"
import { contextArg, formatKind, kindArg, overwriteFlag, stateDirArg } from "./shared"

export function serializeToYaml(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
}

export const pullCommand = defineCommand({
  meta: {
    name: "pull",
    description: "Export remote Kener state as YAML manifests",
  },
  args: {
    kind: kindArg,
    context: contextArg,
    "state-dir": stateDirArg,
    overwrite: overwriteFlag,
  },
  async run({ args }) {
    try {
      const config = await loadConfig({
        context: args.context,
      })

      const client = createKenerClient(config.instance, config.apiKey)
      const stateDir = args["state-dir"] ?? config.stateDir

      const kinds = args.kind
        ? [formatKind(args.kind)]
        : ["Monitor", "Page", "AlertTrigger", "AlertConfig", "Incident", "Maintenance"]

      for (const kind of kinds) {
        let resources: unknown[] = []

        switch (kind) {
          case "Monitor":
            resources = await createMonitorsApi(client).list()
            break
          case "Page":
            resources = await createPagesApi(client).list()
            break
          case "AlertTrigger":
            resources = await createTriggersApi(client).list()
            break
          case "AlertConfig":
            resources = await createAlertConfigsApi(client).list()
            break
          case "Incident":
            resources = await createIncidentsApi(client).list()
            break
          case "Maintenance":
            resources = await createMaintenancesApi(client).list()
            break
        }

        if (resources.length === 0) {
          consola.info(`No ${kind} resources found on remote.`)
          continue
        }

        const kindDir = join(stateDir, `${kind.toLowerCase()}s`)
        if (!existsSync(kindDir)) {
          mkdirSync(kindDir, { recursive: true })
        }

        for (const resource of resources) {
          const r = resource as Record<string, unknown>
          const fileName = `${String(
            r.tag ??
              r.path?.toString().replace(/[^a-zA-Z0-9_-]/g, "_") ??
              r.name ??
              r.id ??
              "unnamed",
          )}.yaml`
          const filePath = join(kindDir, fileName)

          if (existsSync(filePath) && !args.overwrite) {
            consola.warn(`Skipping ${filePath} (already exists, use --overwrite to replace)`)
            continue
          }

          writeFileSync(filePath, serializeToYaml(resource), "utf-8")
          consola.info(`Written: ${filePath}`)
        }
      }

      consola.success("Pull complete.")
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
