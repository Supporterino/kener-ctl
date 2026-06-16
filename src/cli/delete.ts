import { defineCommand } from "citty";
import { consola } from "consola";
import chalk from "chalk";
import { createInterface } from "node:readline/promises";
import { loadConfig } from "@/config/loader";
import { createKenerClient } from "@/api/client";
import { createMonitorsApi } from "@/api/monitors";
import { createPagesApi } from "@/api/pages";
import { createTriggersApi } from "@/api/triggers";
import { createAlertConfigsApi } from "@/api/alert-configs";
import { createIncidentsApi } from "@/api/incidents";
import { createMaintenancesApi } from "@/api/maintenances";
import { ConfigError, NetworkError } from "@/util/errors";
import { configArg, yesFlag, formatKind, isValidKind } from "./shared";

export const deleteCommand = defineCommand({
  meta: {
    name: "delete",
    description: "Immediately delete a single remote resource",
  },
  args: {
    kind: {
      type: "positional" as const,
      description: "Resource kind to delete",
      valueHint: "monitor|page|trigger|alert-config|incident|maintenance",
      required: true,
    },
    id: {
      type: "positional" as const,
      description: "Resource identifier (tag, path, name, or numeric ID)",
      valueHint: "my-api",
      required: true,
    },
    config: configArg,
    yes: yesFlag,
  },
  async run({ args }) {
    try {
      const config = await loadConfig({
        configPath: args.config,
      });

      const kind = formatKind(args.kind);

      if (!isValidKind(kind)) {
        consola.error(`Unknown resource kind: ${args.kind}. Valid kinds: Monitor, Page, AlertTrigger, AlertConfig, Incident, Maintenance`);
        process.exit(1);
      }

      if (!args.yes) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await rl.question(
          chalk.yellow(`Are you sure you want to delete ${kind} "${args.id}"? [y/N] `)
        );
        rl.close();
        if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
          consola.info("Delete cancelled.");
          return;
        }
      }

      const client = createKenerClient(config.instance, config.apiKey);

      let numericId: number;
      if (!isNaN(Number(args.id))) {
        numericId = Number(args.id);
      } else {
        // Look up by stable key
        switch (kind) {
          case "Monitor": {
            const api = createMonitorsApi(client);
            const all = await api.list();
            const found = all.find((m) => m.tag === args.id);
            if (!found) throw new Error(`Monitor with tag "${args.id}" not found`);
            numericId = found.id;
            break;
          }
          case "Page": {
            const api = createPagesApi(client);
            const all = await api.list();
            const found = all.find((p) => p.path === args.id);
            if (!found) throw new Error(`Page with path "${args.id}" not found`);
            numericId = found.id;
            break;
          }
          case "AlertTrigger": {
            const api = createTriggersApi(client);
            const all = await api.list();
            const found = all.find((t) => t.name === args.id);
            if (!found) throw new Error(`Trigger with name "${args.id}" not found`);
            numericId = found.id;
            break;
          }
          default:
            numericId = Number(args.id);
            if (isNaN(numericId)) {
              throw new Error(`Please provide a numeric ID for ${kind} resources`);
            }
        }
      }

      switch (kind) {
        case "Monitor": await createMonitorsApi(client).delete(numericId); break;
        case "Page": await createPagesApi(client).delete(numericId); break;
        case "AlertTrigger": await createTriggersApi(client).delete(numericId); break;
        case "AlertConfig": await createAlertConfigsApi(client).delete(numericId); break;
        case "Incident": await createIncidentsApi(client).delete(numericId); break;
        case "Maintenance": await createMaintenancesApi(client).delete(numericId); break;
        default: throw new Error(`Unknown kind: ${kind}`);
      }

      consola.success(chalk.green(`${kind} "${args.id}" deleted successfully.`));
    } catch (err) {
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
