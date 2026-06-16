import { defineCommand, runMain } from "citty";
import { applyCommand } from "./apply";
import { planCommand } from "./plan";
import { validateCommand } from "./validate";
import { pullCommand } from "./pull";
import { getCommand } from "./get";
import { deleteCommand } from "./delete";
import { configCommand } from "./config";
import { verboseFlag } from "./shared";

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
});

await runMain(mainCommand);
