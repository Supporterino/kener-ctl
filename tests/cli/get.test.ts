import { describe, expect, it } from "bun:test"
import { getCommand } from "@/cli/get"

describe("get command definition", () => {
  function args(): Record<string, unknown> {
    return (getCommand as unknown as { args: Record<string, unknown> }).args
  }

  it("has correct name", () => {
    expect((getCommand as unknown as { meta: { name: string } }).meta.name).toBe("get")
  })

  it("has description", () => {
    expect(getCommand.meta).toBeDefined()
  })

  it("requires kind positional arg", () => {
    const kind = args().kind as Record<string, unknown>
    expect(kind.type).toBe("positional")
    expect(kind.required).toBe(true)
  })

  it("has optional id positional arg", () => {
    const id = args().id as Record<string, unknown>
    expect(id.type).toBe("positional")
  })

  it("has context arg", () => {
    expect(args()).toHaveProperty("context")
  })

  it("has output arg with default table", () => {
    const output = args().output as Record<string, unknown>
    expect(output.type).toBe("string")
    expect(output.default).toBe("table")
  })

  it("has run function", () => {
    expect(typeof getCommand.run).toBe("function")
  })
})
