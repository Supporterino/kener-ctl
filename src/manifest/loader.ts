import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { Glob } from "bun";
import { AnyManifestSchema } from "./schema";
import type { AnyManifest } from "./types";
import { loadAllYamlFromFile } from "@/util/yaml";
import { ValidationError } from "@/util/errors";

export interface LoadManifestsResult {
  manifests: AnyManifest[];
  errors: Array<{ filePath: string; message: string }>;
}

export function loadManifests(stateDir: string): LoadManifestsResult {
  const manifests: AnyManifest[] = [];
  const errors: Array<{ filePath: string; message: string }> = [];

  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
    return { manifests, errors };
  }

  const glob = new Glob("**/*.{yaml,yml}");
  const files = [...glob.scanSync({ cwd: stateDir, absolute: true, onlyFiles: true })];

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const documents = loadAllYamlFromFile(content, filePath);

      for (const doc of documents) {
        if (doc.data === null || doc.data === undefined) {
          continue;
        }
        const result = AnyManifestSchema.safeParse(doc.data);
        if (result.success) {
          manifests.push(result.data);
        } else {
          const message = formatZodError(result.error, filePath);
          errors.push({ filePath, message });
        }
      }
    } catch (err) {
      errors.push({
        filePath,
        message: err instanceof Error ? err.message : `Unknown error reading ${filePath}`,
      });
    }
  }

  return { manifests, errors };
}

export function validateManifests(stateDir: string): { valid: boolean; errors: Array<{ filePath: string; message: string }> } {
  const { errors } = loadManifests(stateDir);
  return { valid: errors.length === 0, errors };
}

function formatZodError(error: import("zod").ZodError, filePath: string): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}
