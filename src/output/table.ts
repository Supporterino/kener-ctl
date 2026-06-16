import chalk from "chalk"
import Table from "cli-table3"

export function renderTable(
  headers: string[],
  rows: Array<
    Array<string | { content: string; colSpan?: number; hAlign?: "left" | "center" | "right" }>
  >,
): string {
  const table = new Table({
    head: headers.map((h) => chalk.bold(h)),
    style: {
      head: [],
      border: [],
    },
  })

  for (const row of rows) {
    table.push(
      row.map((cell) => {
        if (typeof cell === "string") {
          return cell
        }
        return cell
      }),
    )
  }

  return table.toString()
}

export function renderPlanTable(
  changes: Array<{ kind: string; key: string; action: string; details: string }>,
): string {
  const headers = ["Kind", "Key", "Action", "Changes"]

  const rows = changes.map((c) => {
    let actionStr: string
    switch (c.action) {
      case "CREATE":
        actionStr = chalk.green(`+ ${c.action}`)
        break
      case "UPDATE":
        actionStr = chalk.yellow(`~ ${c.action}`)
        break
      case "DELETE":
        actionStr = chalk.red(`- ${c.action}`)
        break
      case "NOOP":
        actionStr = chalk.gray(`· ${c.action}`)
        break
      default:
        actionStr = c.action
    }

    return [c.kind, c.key, actionStr, c.details]
  })

  return renderTable(headers, rows)
}
