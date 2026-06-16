import { loadConfig as c12LoadConfig } from "c12";
import { ConfigSchema } from "./schema";
import type { Config } from "./schema";
import { ConfigError } from "@/util/errors";

export interface LoadConfigOptions {
  configPath?: string;
  overrides?: Partial<Config>;
}

export async function loadConfig(opts: LoadConfigOptions = {}): Promise<Config> {
  const resolveResult = opts.configPath
    ? { config: await loadFromPath(opts.configPath) }
    : await c12LoadConfig<Record<string, unknown>>({
        name: "kener-ctl",
        overrides: {
          instance: process.env["KENER_URL"],
          apiKey: process.env["KENER_API_KEY"],
        },
      });

  const raw = resolveResult.config ?? {};
  const merged = applyOverrides(raw as Record<string, unknown>, opts.overrides ?? {});

  const result = ConfigSchema.safeParse(merged);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    throw new ConfigError(issues);
  }

  return result.data;
}

async function loadFromPath(path: string): Promise<Record<string, unknown>> {
  const fs = await import("node:fs/promises");
  const pathMod = await import("node:path");
  const { load } = await import("js-yaml");

  const ext = pathMod.extname(path).toLowerCase();
  const content = await fs.readFile(path, "utf-8");

  if (ext === ".json") {
    return JSON.parse(content);
  }

  return load(content) as Record<string, unknown>;
}

function applyOverrides(raw: Record<string, unknown>, overrides: Partial<Config>): Record<string, unknown> {
  const merged = { ...raw };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}
