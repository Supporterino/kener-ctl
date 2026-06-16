import { describe, expect, it } from "bun:test"
import { planCommand } from "@/cli/plan"

describe("plan command definition", () => {
  function args(): Record<string, unknown> {
    return (planCommand as unknown as { args: Record<string, unknown> }).args
  }

  it("has correct name", () => {
    expect((planCommand as unknown as { meta: { name: string } }).meta.name).toBe("plan")
  })

  it("has description", () => {
    expect(planCommand.meta).toBeDefined()
  })

  it("includes kind arg", () => {
    expect(args()).toHaveProperty("kind")
  })

  it("includes delete-orphans flag", () => {
    expect(args()).toHaveProperty("delete-orphans")
  })

  it("includes context arg", () => {
    expect(args()).toHaveProperty("context")
  })

  it("includes state-dir arg", () => {
    expect(args()).toHaveProperty("state-dir")
  })

  it("does NOT include dry-run flag (plan is always dry-run)", () => {
    expect(args()).not.toHaveProperty("dry-run")
  })

  it("has run function", () => {
    expect(typeof planCommand.run).toBe("function")
  })
})
