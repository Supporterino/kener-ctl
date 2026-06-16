export type ChangeAction = "CREATE" | "UPDATE" | "DELETE" | "NOOP"

export interface Change<T> {
  action: ChangeAction
  key: string
  desired: T | null
  actual: T | null
  patch?: Partial<T>
}

export function diff<T>(
  desired: Map<string, T>,
  actual: Map<string, Record<string, unknown>>,
  normalize: (v: Record<string, unknown>) => Record<string, unknown>,
  opts: { deleteOrphans?: boolean } = {},
): Change<T>[] {
  const changes: Change<T>[] = []
  const processedKeys = new Set<string>()

  for (const [key, desiredItem] of desired) {
    processedKeys.add(key)
    const actualItem = actual.get(key)

    if (!actualItem) {
      changes.push({ action: "CREATE", key, desired: desiredItem, actual: null })
    } else {
      const normDesired = normalize(desiredItem as unknown as Record<string, unknown>)
      const normActual = normalize(actualItem)

      if (deepEqual(normDesired, normActual)) {
        changes.push({
          action: "NOOP",
          key,
          desired: desiredItem,
          actual: actualItem as unknown as T,
        })
      } else {
        const patch = computePatch(normDesired, normActual)
        changes.push({
          action: "UPDATE",
          key,
          desired: desiredItem,
          actual: actualItem as unknown as T,
          patch: patch as Partial<T>,
        })
      }
    }
  }

  if (opts.deleteOrphans) {
    for (const [key, actualItem] of actual) {
      if (!processedKeys.has(key)) {
        changes.push({ action: "DELETE", key, desired: null, actual: actualItem as unknown as T })
      }
    }
  }

  return changes
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (typeof a !== "object" || typeof b !== "object") return false

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj).sort()
  const bKeys = Object.keys(bObj).sort()

  if (aKeys.length !== bKeys.length) return false

  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false
    const key = aKeys[i]
    if (key === undefined) return false
    if (!deepEqual(aObj[key], bObj[key])) return false
  }

  return true
}

function computePatch(
  desired: Record<string, unknown>,
  actual: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(desired)) {
    if (!deepEqual(desired[key], actual[key])) {
      patch[key] = desired[key]
    }
  }
  return patch
}

export function stripServerFields(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...obj }
  delete cleaned.id
  delete cleaned.createdAt
  delete cleaned.updatedAt
  return cleaned
}
