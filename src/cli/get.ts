import { defineCommand } from "citty";
import { consola } from "consola";
import chalk from "chalk";
import { loadConfig } from "@/config/loader";
import { createKenerClient } from "@/api/client";
import { createMonitorsApi } from "@/api/monitors";
import { createPagesApi } from "@/api/pages";
import { createTriggersApi } from "@/api/triggers";
import { createAlertConfigsApi } from "@/api/alert-configs";
import { createIncidentsApi } from "@/api/incidents";
import { createMaintenancesApi } from "@/api/maintenances";
import { printResourceList, printResourceDetails } from "@/output/printer";
import type { AnyManifest } from "@/manifest/types";
import { ConfigError, NetworkError } from "@/util/errors";
import { configArg, outputArg, formatKind, isValidKind } from "./shared";

export const getCommand = defineCommand({
  meta: {
    name: "get",
    description: "Fetch and display one or all resources of a kind",
  },
  args: {
    kind: {
      type: "positional" as const,
      description: "Resource kind to fetch",
      valueHint: "monitors|pages|triggers|alert-configs|incidents|maintenances",
      required: true,
    },
    id: {
      type: "positional" as const,
      description: "Resource identifier (tag, path, name, or ID)",
      valueHint: "my-api",
    },
    config: configArg,
    output: outputArg,
  },
  async run({ args }) {
    try {
      const config = await loadConfig({
        configPath: args.config,
      });

      const client = createKenerClient(config.instance, config.apiKey);
      const kind = formatKind(args.kind);
      const format = (args.output as "table" | "json" | "yaml") ?? "table";

      if (!isValidKind(kind)) {
        consola.error(`Unknown resource kind: ${args.kind}. Valid kinds: Monitor, Page, AlertTrigger, AlertConfig, Incident, Maintenance`);
        process.exit(1);
      }

      if (args.id) {
        let resource: unknown;
        switch (kind) {
          case "Monitor": {
            const api = createMonitorsApi(client);
            if (!isNaN(Number(args.id))) {
              resource = await api.get(Number(args.id));
            } else {
              const all = await api.list();
              resource = all.find((m) => m.tag === args.id);
              if (!resource) throw new Error(`Monitor with tag "${args.id}" not found`);
            }
            break;
          }
          case "Page": {
            const api = createPagesApi(client);
            if (!isNaN(Number(args.id))) {
              resource = await api.get(Number(args.id));
            } else {
              const all = await api.list();
              resource = all.find((p) => p.path === args.id);
              if (!resource) throw new Error(`Page with path "${args.id}" not found`);
            }
            break;
          }
          case "AlertTrigger": {
            const api = createTriggersApi(client);
            if (!isNaN(Number(args.id))) {
              resource = await api.get(Number(args.id));
            } else {
              const all = await api.list();
              resource = all.find((t) => t.name === args.id);
              if (!resource) throw new Error(`Trigger with name "${args.id}" not found`);
            }
            break;
          }
          case "AlertConfig": {
            const api = createAlertConfigsApi(client);
            resource = await api.get(Number(args.id));
            break;
          }
          case "Incident": {
            const api = createIncidentsApi(client);
            resource = await api.get(Number(args.id));
            break;
          }
          case "Maintenance": {
            const api = createMaintenancesApi(client);
            resource = await api.get(Number(args.id));
            break;
          }
          default:
            throw new Error(`Unknown kind: ${kind}`);
        }

        printResourceDetails(resource as AnyManifest, format);
      } else {
        let resources: unknown[];
        switch (kind) {
          case "Monitor":
            resources = await createMonitorsApi(client).list();
            break;
          case "Page":
            resources = await createPagesApi(client).list();
            break;
          case "AlertTrigger":
            resources = await createTriggersApi(client).list();
            break;
          case "AlertConfig":
            resources = await createAlertConfigsApi(client).list();
            break;
          case "Incident":
            resources = await createIncidentsApi(client).list();
            break;
          case "Maintenance":
            resources = await createMaintenancesApi(client).list();
            break;
          default:
            throw new Error(`Unknown kind: ${kind}`);
        }

        printResourceList(kind, resources, format);
      }
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
