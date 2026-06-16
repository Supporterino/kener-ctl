import { describe, expect, it } from "bun:test"
import { diff, stripServerFields } from "@/reconciler/diff"

function identity(v: Record<string, unknown>): Record<string, unknown> {
  return v
}

describe("diff", () => {
  it("detects CREATE when desired item is not in actual", () => {
    const desired = new Map([["a", { name: "A", value: 1 }]])
    const actual = new Map<string, Record<string, unknown>>()

    const changes = diff(desired, actual, identity)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("CREATE")
    expect(changes[0]?.key).toBe("a")
    expect(changes[0]?.desired).toEqual({ name: "A", value: 1 })
    expect(changes[0]?.actual).toBeNull()
  })

  it("detects NOOP when items are identical", () => {
    const item = { name: "A", value: 1 }
    const desired = new Map([["a", item]])
    const actual: Map<string, Record<string, unknown>> = new Map([["a", { ...item }]])

    const changes = diff(desired, actual, identity)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("NOOP")
  })

  it("detects UPDATE when items differ", () => {
    const desired = new Map([["a", { name: "A", value: 2 }]])
    const actual = new Map<string, Record<string, unknown>>([["a", { name: "A", value: 1 }]])

    const changes = diff(desired, actual, identity)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
    expect(changes[0]?.patch).toEqual({ value: 2 })
  })

  it("detects DELETE when deleteOrphans is enabled", () => {
    const desired = new Map<string, { name: string; value: number }>()
    const actual: Map<string, Record<string, unknown>> = new Map([["a", { name: "A", value: 1 }]])

    const changes = diff(desired, actual, identity, { deleteOrphans: true })
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("DELETE")
    expect(changes[0]?.key).toBe("a")
  })

  it("does not delete orphans when deleteOrphans is false", () => {
    const desired = new Map<string, { name: string; value: number }>()
    const actual: Map<string, Record<string, unknown>> = new Map([["a", { name: "A", value: 1 }]])

    const changes = diff(desired, actual, identity, { deleteOrphans: false })
    expect(changes).toHaveLength(0)
  })

  it("handles mixed changes", () => {
    const desired = new Map([
      ["create", { x: 1 }],
      ["update", { x: 2 }],
      ["same", { x: 3 }],
    ])
    const actual: Map<string, Record<string, unknown>> = new Map([
      ["update", { x: 1 }],
      ["same", { x: 3 }],
      ["orphan", { x: 4 }],
    ])

    const changes = diff(desired, actual, identity, { deleteOrphans: true })

    const creates = changes.filter((c) => c.action === "CREATE")
    const updates = changes.filter((c) => c.action === "UPDATE")
    const deletes = changes.filter((c) => c.action === "DELETE")
    const noops = changes.filter((c) => c.action === "NOOP")

    expect(creates).toHaveLength(1)
    expect(creates[0]?.key).toBe("create")

    expect(updates).toHaveLength(1)
    expect(updates[0]?.key).toBe("update")
    expect(updates[0]?.patch).toEqual({ x: 2 })

    expect(deletes).toHaveLength(1)
    expect(deletes[0]?.key).toBe("orphan")

    expect(noops).toHaveLength(1)
    expect(noops[0]?.key).toBe("same")
  })

  it("handles nested object differences", () => {
    const desired = new Map([["a", { config: { timeout: 5000, retries: 3 } }]])
    const actual: Map<string, Record<string, unknown>> = new Map([
      ["a", { config: { timeout: 10000, retries: 3 } }],
    ])

    const changes = diff(desired, actual, identity)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
    expect(changes[0]?.patch).toEqual({ config: { timeout: 5000, retries: 3 } })
  })

  it("handles empty desired and actual", () => {
    const desired = new Map<string, unknown>()
    const actual = new Map<string, Record<string, unknown>>()

    const changes = diff(desired, actual, identity)
    expect(changes).toHaveLength(0)
  })
})

describe("stripServerFields", () => {
  it("removes id, createdAt, updatedAt", () => {
    const obj = {
      id: 1,
      name: "test",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-02T00:00:00Z",
      value: 42,
    }
    const result = stripServerFields(obj)
    expect(result).not.toHaveProperty("id")
    expect(result).not.toHaveProperty("createdAt")
    expect(result).not.toHaveProperty("updatedAt")
    expect(result.name).toBe("test")
    expect(result.value).toBe(42)
  })

  it("handles objects without server fields", () => {
    const obj = { name: "test", value: 42 }
    const result = stripServerFields(obj)
    expect(result).toEqual({ name: "test", value: 42 })
  })
})

describe("diff with stripServerFields", () => {
  it("yields NOOP when only server fields differ", () => {
    const desired = { name: "A", value: 1 }
    const actual = {
      id: 42,
      name: "A",
      value: 1,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-02T00:00:00Z",
    }

    const desiredMap = new Map([["a", desired]])
    const actualMap: Map<string, Record<string, unknown>> = new Map([["a", actual]])

    const changes = diff(desiredMap, actualMap, stripServerFields)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("NOOP")
  })

  it("yields UPDATE when server fields AND spec fields differ", () => {
    const desired = { name: "B", value: 2 }
    const actual = { id: 42, name: "A", value: 1, createdAt: "2025-01-01T00:00:00Z" }

    const desiredMap = new Map([["a", desired]])
    const actualMap: Map<string, Record<string, unknown>> = new Map([["a", actual]])

    const changes = diff(desiredMap, actualMap, stripServerFields)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
  })
})
