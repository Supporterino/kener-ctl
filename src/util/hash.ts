import { createHash } from "node:crypto"

export function stableDigest(value: unknown): string {
  const json = stableStringify(value)
  return createHash("sha256").update(json).digest("hex").slice(0, 16)
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(value, stableReplacer, 0)
}

function stableReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (Array.isArray(value)) {
    return value
  }
  if (value !== null && typeof value === "object") {
    return sortObjectKeys(value as Record<string, unknown>)
  }
  return value
}

function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(obj).sort()
  for (const key of keys) {
    sorted[key] = obj[key]
  }
  return sorted
}

export function digestEqual(a: unknown, b: unknown): boolean {
  return stableDigest(a) === stableDigest(b)
}
