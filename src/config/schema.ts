import { z } from "zod";

export const ConfigSchema = z.object({
  instance: z.string().url("instance must be a valid URL"),
  apiKey: z.string().min(1, "apiKey is required"),
  stateDir: z.string().default("./state"),
  dryRun: z.boolean().default(false),
  deleteOrphans: z.boolean().default(false),
  concurrency: z.number().int().min(1).max(20).default(4),
});

export type Config = z.infer<typeof ConfigSchema>;
