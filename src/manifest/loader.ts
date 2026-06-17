import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { Glob } from "bun"
import { loadAllYamlFromFile } from "@/util/yaml"
import { AnyManifestSchema, DEPRECATED_KINDS, DEPRECATED_KIND_MESSAGE } from "./schema"
import type { AnyManifest } from "./types"

export interface LoadManifestsResult {
  manifests: AnyManifest[]
  errors: Array<{ filePath: string; message: string }>
}

export function loadManifests(manifestDir: string): LoadManifestsResult {
  const manifests: AnyManifest[] = []
  const errors: Array<{ filePath: string; message: string }> = []

  if (!existsSync(manifestDir)) {
    mkdirSync(manifestDir, { recursive: true })
    return { manifests, errors }
  }

  const glob = new Glob("**/*.{yaml,yml}")
  const files = [...glob.scanSync({ cwd: manifestDir, absolute: true, onlyFiles: true })]

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, "utf-8")
      const documents = loadAllYamlFromFile(content, filePath)

      for (const doc of documents) {
        if (doc.data === null || doc.data === undefined) {
          continue
        }

        const rawDoc = doc.data as Record<string, unknown>

        if (
          typeof rawDoc.kind === "string" &&
          (DEPRECATED_KINDS as readonly string[]).includes(rawDoc.kind)
        ) {
          errors.push({
            filePath,
            message: `kind '${rawDoc.kind}' is not supported — ${DEPRECATED_KIND_MESSAGE}`,
          })
          continue
        }

        const result = AnyManifestSchema.safeParse(doc.data)
        if (result.success) {
          manifests.push(result.data)
        } else {
          const message = formatZodError(result.error, filePath)
          errors.push({ filePath, message })
        }
      }
    } catch (err) {
      errors.push({
        filePath,
        message: err instanceof Error ? err.message : `Unknown error reading ${filePath}`,
      })
    }
  }

  return { manifests, errors }
}

export function validateManifests(manifestDir: string): {
  valid: boolean
  errors: Array<{ filePath: string; message: string }>
} {
  const { errors } = loadManifests(manifestDir)
  return { valid: errors.length === 0, errors }
}

function formatZodError(error: import("zod").ZodError, _filePath: string): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "<root>"
      return `${path}: ${issue.message}`
    })
    .join("; ")
}
