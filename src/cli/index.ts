import { defineCommand, runMain } from "citty"
import { applyCommand } from "./apply"
import { configCommand } from "./config"
import { deleteCommand } from "./delete"
import { getCommand } from "./get"
import { planCommand } from "./plan"
import { pullCommand } from "./pull"
import { verboseFlag } from "./shared"
import { validateCommand } from "./validate"

const mainCommand = defineCommand({
  meta: {
    name: "kener-ctl",
    version: "0.1.0",
    description: "Declarative CLI for Kener status pages",
  },
  args: {
    verbose: verboseFlag,
  },
  subCommands: {
    apply: applyCommand,
    plan: planCommand,
    validate: validateCommand,
    pull: pullCommand,
    get: getCommand,
    delete: deleteCommand,
    config: configCommand,
  },
})

await runMain(mainCommand)
