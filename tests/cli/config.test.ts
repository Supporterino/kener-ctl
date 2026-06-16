import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { dump as yamlDump } from "js-yaml";
import { configCommand } from "@/cli/config";

let origEnv: typeof Bun.env;

beforeAll(() => {
  origEnv = { ...Bun.env };
});

afterAll(() => {
  for (const key of Object.keys(Bun.env)) {
    if (!(key in origEnv)) {
      delete (Bun.env as Record<string, string | undefined>)[key];
    }
  }
  for (const [key, value] of Object.entries(origEnv)) {
    (Bun.env as Record<string, string | undefined>)[key] = value;
  }
});

function createTestConfig(tempDir: string, currentContext = "prod") {
  const configDir = join(tempDir, "kener-ctl");
  mkdirSync(configDir, { recursive: true });
  const configPath = join(configDir, "config.yaml");
  const config = {
    version: 1,
    "current-context": currentContext,
    contexts: [
      { name: "prod", instance: "https://status.prod.example.com", apiKey: "sk-prod" },
      { name: "staging", instance: "https://status.staging.example.com", apiKey: "sk-staging" },
      { name: "dev", instance: "https://status.dev.example.com", apiKey: "sk-dev" },
    ],
  };
  writeFileSync(configPath, yamlDump(config));
  return configPath;
}

describe("config command definition", () => {
  it("has correct name", () => {
    const cmd = configCommand as unknown as { meta: { name: string } };
    expect(cmd.meta.name).toBe("config");
  });

  it("has config subcommands", () => {
    const cmd = configCommand as unknown as { subCommands: Record<string, unknown> };
    expect(cmd.subCommands).toBeDefined();
    expect(cmd.subCommands).toHaveProperty("use");
    expect(cmd.subCommands).toHaveProperty("current");
    expect(cmd.subCommands).toHaveProperty("list");
  });

  it("use subcommand requires positional name arg", () => {
    const cmd = configCommand as unknown as { subCommands: { use: { args: Record<string, unknown> } } };
    const nameArg = cmd.subCommands.use.args.name as Record<string, unknown>;
    expect(nameArg.type).toBe("positional");
    expect(nameArg.required).toBe(true);
  });
});

describe("config list command definition", () => {
  it("has list subcommand", () => {
    const cmd = configCommand as unknown as { subCommands: { list: { meta: Record<string, unknown>; run: unknown } } };
    const listCmd = cmd.subCommands.list;
    expect(listCmd.meta).toBeDefined();
    expect(listCmd.run).toBeInstanceOf(Function);
  });
});

describe("config current command definition", () => {
  it("has current subcommand", () => {
    const cmd = configCommand as unknown as { subCommands: { current: { meta: Record<string, unknown>; run: unknown } } };
    const currentCmd = cmd.subCommands.current;
    expect(currentCmd.meta).toBeDefined();
    expect(currentCmd.run).toBeInstanceOf(Function);
  });
});
