import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import chalk from "chalk"
import { defineCommand } from "citty"
import { consola } from "consola"
import { dump as yamlDump } from "js-yaml"
import { createKenerClient } from "@/api/client"
import { createIncidentsApi } from "@/api/incidents"
import { createMaintenancesApi } from "@/api/maintenances"
import { createMonitorsApi } from "@/api/monitors"
import { createPagesApi } from "@/api/pages"
import type { Incident, Maintenance, Monitor, Page } from "@/api/types"
import { loadConfig } from "@/config/loader"
import { ConfigError, NetworkError } from "@/util/errors"
import { contextArg, formatKind, kindArg, overwriteFlag, manifestDirArg } from "./shared"

function monitorToManifest(m: Monitor): Record<string, unknown> {
  return {
    kind: "Monitor",
    metadata: { tag: m.tag },
    spec: {
      name: m.name,
      description: m.description ?? "",
      type: m.monitor_type,
      categoryName: m.category_name ?? undefined,
      cronSchedule: m.cron,
      defaultStatus: m.default_status,
      dayDegradedMinCount: m.day_degraded_minimum_count ?? undefined,
      dayDownMinCount: m.day_down_minimum_count ?? undefined,
      typeData: m.type_data,
    },
  }
}

function pageToManifest(p: Page): Record<string, unknown> {
  return {
    kind: "Page",
    metadata: { path: p.page_path },
    spec: {
      title: p.page_title,
      header: p.page_header,
      pageContent: p.page_subheader,
      monitors: p.monitors.map((m) => m.monitor_tag),
    },
  }
}

function incidentToManifest(i: Incident): Record<string, unknown> {
  return {
    kind: "Incident",
    metadata: { name: String(i.id) },
    spec: {
      title: i.title,
      startDatetime: i.start_date_time,
      affectedMonitors: i.monitors.map((m) => ({
        tag: m.monitor_tag,
        impact: m.impact,
      })),
    },
  }
}

function maintenanceToManifest(m: Maintenance): Record<string, unknown> {
  return {
    kind: "Maintenance",
    metadata: { name: String(m.id) },
    spec: {
      title: m.title,
      monitors: m.monitors.map((mon) => mon.monitor_tag),
      startDatetime: m.start_date_time,
      rrule: m.rrule,
      durationSeconds: m.duration_seconds,
    },
  }
}

export function serializeToYaml(obj: unknown): string {
  return yamlDump(obj, { indent: 2, lineWidth: -1, noRefs: true })
}

export const pullCommand = defineCommand({
  meta: {
    name: "pull",
    description: "Export remote Kener state as YAML manifests",
  },
  args: {
    kind: kindArg,
    context: contextArg,
    "manifest-dir": manifestDirArg,
    overwrite: overwriteFlag,
  },
  async run({ args }) {
    try {
      const config = await loadConfig({
        context: args.context,
      })

      const client = createKenerClient(config.instance, config.apiKey)
      const manifestDir = args["manifest-dir"] ?? config.manifestDir

      const kinds = args.kind
        ? [formatKind(args.kind)]
        : ["Monitor", "Page", "Incident", "Maintenance"]

      for (const kind of kinds) {
        let resources: unknown[] = []

        switch (kind) {
          case "Monitor":
            resources = (await createMonitorsApi(client).list()).map(monitorToManifest)
            break
          case "Page":
            resources = (await createPagesApi(client).list()).map(pageToManifest)
            break
          case "Incident":
            resources = (await createIncidentsApi(client).list()).map(incidentToManifest)
            break
          case "Maintenance":
            resources = (await createMaintenancesApi(client).list()).map(maintenanceToManifest)
            break
        }

        if (resources.length === 0) {
          consola.info(`No ${kind} resources found on remote.`)
          continue
        }

        const kindDir = join(manifestDir, `${kind.toLowerCase()}s`)
        if (!existsSync(kindDir)) {
          mkdirSync(kindDir, { recursive: true })
        }

        for (const resource of resources) {
          const r = resource as Record<string, unknown>
          const meta = r.metadata as Record<string, string> | undefined
          const fileName = `${String(
            meta?.tag ??
              meta?.path?.toString().replace(/[^a-zA-Z0-9_-]/g, "_") ??
              meta?.name ??
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
