import { defineCommand } from "citty";
import { consola } from "consola";
import chalk from "chalk";
import { loadConfig } from "@/config/loader";
import { validateManifests } from "@/manifest/loader";
import { printValidationErrors } from "@/output/printer";
import { ConfigError } from "@/util/errors";
import { configArg, stateDirArg } from "./shared";

export const validateCommand = defineCommand({
  meta: {
    name: "validate",
    description: "Parse and validate all manifest files without making API calls",
  },
  args: {
    config: configArg,
    "state-dir": stateDirArg,
  },
  async run({ args }) {
    try {
      let stateDir = args["state-dir"] ?? "./state";

      if (args.config) {
        const config = await loadConfig({
          configPath: args.config,
          overrides: {
            stateDir: args["state-dir"] ?? undefined,
          },
        });
        stateDir = config.stateDir;
      }

      const { valid, errors } = validateManifests(stateDir);

      if (valid) {
        consola.success(chalk.green("All manifests are valid."));
      } else {
        printValidationErrors(errors);
        process.exit(2);
      }
    } catch (err) {
      if (err instanceof ConfigError) {
        consola.error(err.toString());
        process.exit(1);
      }
      consola.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  },
});
