import { defineCommand } from "citty";
import { consola } from "consola";
import chalk from "chalk";
import { loadConfig, stateFilePath } from "@/config/loader";
import { createKenerClient } from "@/api/client";
import { reconcile } from "@/reconciler/engine";
import { printApplySummary } from "@/output/printer";
import { printPlanTable } from "@/output/printer";
import type { PlanRow } from "@/output/printer";
import { ValidationError, ConfigError, NetworkError } from "@/util/errors";
import {
  kindArg, tagArg, nameArg, pathArg, contextArg, stateDirArg,
  dryRunFlag, deleteOrphansFlag, isValidKind, formatKind,
} from "./shared";

export const applyCommand = defineCommand({
  meta: {
    name: "apply",
    description: "Reconcile remote Kener instance to match local state",
  },
  args: {
    kind: kindArg,
    tag: tagArg,
    name: nameArg,
    path: pathArg,
    context: contextArg,
    "state-dir": stateDirArg,
    "dry-run": dryRunFlag,
    "delete-orphans": deleteOrphansFlag,
  },
  async run({ args }) {
    try {
      const config = await loadConfig({
        context: args.context,
      });

      const resolvedStateDir = args["state-dir"] ?? config.stateDir;
      const resolvedDryRun = args["dry-run"] ?? config.dryRun;
      const resolvedDeleteOrphans = args["delete-orphans"] ?? config.deleteOrphans;

      const client = createKenerClient(config.instance, config.apiKey);

      const result = await reconcile({
        client,
        stateDir: resolvedStateDir,
        dryRun: resolvedDryRun,
        deleteOrphans: resolvedDeleteOrphans,
        concurrency: config.concurrency,
        stateFilePath: stateFilePath(config.contextName),
        kind: args.kind ? formatKind(args.kind) : undefined,
        tag: args.tag,
        name: args.name,
        path: args.path,
      });

      if (result.errors.length > 0) {
        consola.error(chalk.red("Some changes failed to apply:"));
        for (const err of result.errors) {
          consola.error(`  ${err}`);
        }
        process.exit(1);
      }

      if (resolvedDryRun) {
        printPlanTable(result.changes as PlanRow[]);
      } else {
        printApplySummary(result.results);
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        consola.error(err.toString());
        process.exit(2);
      }
      if (err instanceof ConfigError) {
        consola.error(err.toString());
        process.exit(1);
      }
      if (err instanceof NetworkError) {
        consola.error(chalk.red(err.message));
        process.exit(1);
      }
      consola.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  },
});
