import chalk from "chalk"
import { defineCommand } from "citty"
import { consola } from "consola"
import { loadConfig } from "@/config/loader"
import { validateManifests } from "@/manifest/loader"
import { printValidationErrors } from "@/output/printer"
import { ConfigError } from "@/util/errors"
import { contextArg, stateDirArg } from "./shared"

export const validateCommand = defineCommand({
  meta: {
    name: "validate",
    description: "Parse and validate all manifest files without making API calls",
  },
  args: {
    context: contextArg,
    "state-dir": stateDirArg,
  },
  async run({ args }) {
    try {
      let stateDir = args["state-dir"] ?? "./state"

      try {
        const config = await loadConfig({
          context: args.context,
        })
        stateDir = args["state-dir"] ?? config.stateDir
      } catch (err) {
        if (err instanceof ConfigError) {
          if (!args["state-dir"] && !args.context) {
            consola.info("No config file found, using default stateDir: ./state")
          } else {
            consola.error(err.toString())
            process.exit(1)
          }
        } else {
          throw err
        }
      }

      const { valid, errors } = validateManifests(stateDir)

      if (valid) {
        consola.success(chalk.green("All manifests are valid."))
      } else {
        printValidationErrors(errors)
        process.exit(2)
      }
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
