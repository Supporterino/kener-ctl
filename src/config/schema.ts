import { z } from "zod";

export const ContextSchema = z.object({
  name: z.string().min(1),
  instance: z.string().url("instance must be a valid URL"),
  apiKey: z.string().min(1, "apiKey is required"),
});

export type Context = z.infer<typeof ContextSchema>;

export const DefaultsSchema = z.object({
  stateDir: z.string().default("./state"),
  concurrency: z.number().int().min(1).max(20).default(4),
  dryRun: z.boolean().default(false),
  deleteOrphans: z.boolean().default(false),
});

export type Defaults = z.infer<typeof DefaultsSchema>;

export const ConfigSchema = z
  .object({
    version: z.literal(1),
    "current-context": z.string().min(1, "current-context is required"),
    contexts: z.array(ContextSchema).min(1, "at least one context is required"),
    defaults: DefaultsSchema.default({}),
  })
  .superRefine((config, ctx) => {
    const names = config.contexts.map((c) => c.name);
    const seen = new Set<string>();
    for (let i = 0; i < names.length; i++) {
      const name = names[i]!;
      if (seen.has(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate context name: "${name}"`,
          path: ["contexts", i, "name"],
        });
      }
      seen.add(name);
    }

    if (!names.includes(config["current-context"])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `current-context "${config["current-context"]}" does not match any defined context`,
        path: ["current-context"],
      });
    }
  });

export type Config = z.infer<typeof ConfigSchema>;

export interface ResolvedConfig {
  instance: string;
  apiKey: string;
  stateDir: string;
  dryRun: boolean;
  deleteOrphans: boolean;
  concurrency: number;
  contextName: string;
}
