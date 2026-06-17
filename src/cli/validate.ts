import chalk from "chalk"
import { defineCommand } from "citty"
import { consola } from "consola"
import { loadConfig } from "@/config/loader"
import { validateManifests } from "@/manifest/loader"
import { printValidationErrors } from "@/output/printer"
import { ConfigError } from "@/util/errors"
import { contextArg, manifestDirArg } from "./shared"

export const validateCommand = defineCommand({
  meta: {
    name: "validate",
    description: "Parse and validate all manifest files without making API calls",
  },
  args: {
    context: contextArg,
    "manifest-dir": manifestDirArg,
  },
  async run({ args }) {
    try {
      let manifestDir = args["manifest-dir"] ?? "./manifests"

      try {
        const config = await loadConfig({
          context: args.context,
        })
        manifestDir = args["manifest-dir"] ?? config.manifestDir
      } catch (err) {
        if (err instanceof ConfigError) {
          if (!args["manifest-dir"] && !args.context) {
            consola.info("No config file found, using default manifestDir: ./manifests")
          } else {
            consola.error(err.toString())
            process.exit(1)
          }
        } else {
          throw err
        }
      }

      const { valid, errors } = validateManifests(manifestDir)

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
