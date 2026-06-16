import chalk from "chalk"
import { consola } from "consola"
import type { AnyManifest } from "@/manifest/types"
import type { ChangeAction } from "@/reconciler/diff"
import { renderPlanTable } from "./table"

export interface PlanRow {
  kind: string
  key: string
  action: ChangeAction
  details: string
}

export function printPlanTable(changes: PlanRow[]): void {
  if (changes.length === 0) {
    consola.success("No changes. Remote state matches desired state.")
    return
  }

  const filtered = changes.filter((c) => c.action !== "NOOP")
  const allRows = filtered.length > 0 ? filtered : changes

  if (allRows.length === 0) {
    consola.success("No changes needed. All resources are up-to-date.")
    return
  }

  const tableData = allRows.map((c) => ({
    kind: c.kind,
    key: c.key,
    action: c.action,
    details: c.details,
  }))

  const output = renderPlanTable(tableData)
  consola.log(`\n${output}`)

  const summary = summarizeChanges(allRows.map((c) => c.action as ChangeAction))
  consola.info(summary)
}

export interface ApplyResult {
  kind: string
  key: string
  action: ChangeAction
  success: boolean
  error?: string
}

export function printApplySummary(results: ApplyResult[]): void {
  const succeeded = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  const headers = ["Kind", "Key", "Action", "Status"]
  const rows = results.map((r) => {
    const statusStr = r.success ? chalk.green("OK") : chalk.red(`FAILED: ${r.error ?? "unknown"}`)
    let actionStr: string
    switch (r.action) {
      case "CREATE":
        actionStr = chalk.green(`+ ${r.action}`)
        break
      case "UPDATE":
        actionStr = chalk.yellow(`~ ${r.action}`)
        break
      case "DELETE":
        actionStr = chalk.red(`- ${r.action}`)
        break
      case "NOOP":
        actionStr = chalk.gray(`· ${r.action}`)
        break
      default:
        actionStr = r.action
    }
    return [r.kind, r.key, actionStr, statusStr]
  })

  const Table = require("cli-table3") as typeof import("cli-table3")
  const table = new Table({
    head: headers.map((h) => chalk.bold(h)),
    style: { head: [], border: [] },
  })
  for (const row of rows) {
    table.push(row)
  }

  consola.log(`\n${table.toString()}`)
  consola.info(`${chalk.green(succeeded.length)} succeeded, ${chalk.red(failed.length)} failed`)
}

export function printValidationErrors(errors: Array<{ filePath: string; message: string }>): void {
  consola.error(chalk.red(`Validation failed with ${errors.length} error(s):`))
  for (const err of errors) {
    consola.error(`  ${chalk.gray(err.filePath)}: ${err.message}`)
  }
}

export function printResourceDetails(
  resource: AnyManifest,
  format: "table" | "json" | "yaml" = "table",
): void {
  switch (format) {
    case "json":
      consola.log(JSON.stringify(resource, null, 2))
      break
    case "yaml":
      consola.log(formatAsYaml(resource))
      break
    default: {
      const Table = require("cli-table3") as typeof import("cli-table3")
      const table = new Table()
      table.push(
        { Kind: resource.kind },
        { Metadata: JSON.stringify((resource as Record<string, unknown>).metadata) },
        { Spec: JSON.stringify((resource as Record<string, unknown>).spec) },
      )
      consola.log(table.toString())
      break
    }
  }
}

export function printResourceList(
  kind: string,
  resources: unknown[],
  format: "table" | "json" | "yaml" = "table",
): void {
  switch (format) {
    case "json":
      consola.log(JSON.stringify(resources, null, 2))
      break
    case "yaml":
      for (const r of resources) {
        consola.log(formatAsYaml(r))
        consola.log("---")
      }
      break
    default: {
      const Table = require("cli-table3") as typeof import("cli-table3")
      if (resources.length === 0) {
        consola.info(`No ${kind} resources found.`)
        return
      }

      const keys = Object.keys(resources[0] as Record<string, unknown>).slice(0, 6)
      const table = new Table({ head: keys.map((h) => chalk.bold(h)) })
      for (const r of resources) {
        const row = keys.map((k) => {
          const val = (r as Record<string, unknown>)[k]
          if (typeof val === "object") return JSON.stringify(val)
          return String(val)
        })
        table.push(row)
      }
      consola.log(table.toString())
      break
    }
  }
}

function summarizeChanges(actions: ChangeAction[]): string {
  const counts: Record<string, number> = {}
  for (const a of actions) {
    counts[a] = (counts[a] ?? 0) + 1
  }
  const parts: string[] = []
  if (counts.CREATE) parts.push(chalk.green(`+${counts.CREATE} to create`))
  if (counts.UPDATE) parts.push(chalk.yellow(`~${counts.UPDATE} to update`))
  if (counts.DELETE) parts.push(chalk.red(`-${counts.DELETE} to delete`))
  if (counts.NOOP) parts.push(chalk.gray(`·${counts.NOOP} unchanged`))
  return `Plan: ${parts.join(", ")}`
}

function formatAsYaml(obj: unknown): string {
  // Simple YAML formatter fallback
  if (typeof obj === "object" && obj !== null) {
    return JSON.stringify(obj, null, 2)
  }
  return String(obj)
}
