import chalk from "chalk"
import { defineCommand } from "citty"
import { consola } from "consola"
import { createKenerClient } from "@/api/client"
import { loadConfig, stateFilePath } from "@/config/loader"
import type { PlanRow } from "@/output/printer"
import { printPlanTable } from "@/output/printer"
import { plan } from "@/reconciler/engine"
import { ConfigError, NetworkError, ValidationError } from "@/util/errors"
import {
  contextArg,
  deleteOrphansFlag,
  formatKind,
  kindArg,
  nameArg,
  pathArg,
  manifestDirArg,
  tagArg,
} from "./shared"

export const planCommand = defineCommand({
  meta: {
    name: "plan",
    description: "Show diff between local state and remote without applying",
  },
  args: {
    kind: kindArg,
    tag: tagArg,
    name: nameArg,
    path: pathArg,
    context: contextArg,
    "manifest-dir": manifestDirArg,
    "delete-orphans": deleteOrphansFlag,
  },
  async run({ args }) {
    try {
      const config = await loadConfig({
        context: args.context,
      })

      const client = createKenerClient(config.instance, config.apiKey)

      const result = await plan({
        client,
        manifestDir: args["manifest-dir"] ?? config.manifestDir,
        dryRun: true,
        deleteOrphans: args["delete-orphans"] ?? false,
        concurrency: config.concurrency,
        stateFilePath: stateFilePath(config.contextName),
        kind: args.kind ? formatKind(args.kind) : undefined,
        tag: args.tag,
        name: args.name,
        path: args.path,
      })

      printPlanTable(result.changes as PlanRow[])
    } catch (err) {
      if (err instanceof ValidationError) {
        consola.error(err.toString())
        process.exit(2)
      }
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
