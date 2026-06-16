import { describe, expect, it } from "bun:test"
import type { TriggersApi } from "@/api/triggers"
import type { AlertTrigger } from "@/api/types"
import type { AlertTriggerManifest } from "@/manifest/types"
import { reconcileTriggers } from "@/reconciler/resources/trigger"

function mockTriggersApi(triggers: AlertTrigger[]): TriggersApi {
  return {
    list: async () => triggers,
    get: async () => ({}) as AlertTrigger,
    create: async () => ({}) as AlertTrigger,
    update: async () => ({}) as AlertTrigger,
    delete: async () => {},
  }
}

function makeTrigger(id: number, name: string): AlertTrigger {
  return { id, name, type: "SLACK", webhookUrl: "https://hooks.slack.com/x" }
}

function makeManifest(
  name: string,
  overrides: Partial<AlertTriggerManifest> = {},
): AlertTriggerManifest {
  return {
    kind: "AlertTrigger" as const,
    metadata: { name },
    spec: { type: "SLACK" as const, webhookUrl: "https://hooks.slack.com/x", ...overrides.spec },
    ...overrides,
  }
}

describe("reconcileTriggers", () => {
  it("detects CREATE when trigger not on remote", async () => {
    const api = mockTriggersApi([])
    const manifests = [makeManifest("ops-slack")]
    const changes = await reconcileTriggers(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("CREATE")
    expect(changes[0]?.key).toBe("ops-slack")
  })

  it("detects UPDATE when trigger exists remotely", async () => {
    const api = mockTriggersApi([makeTrigger(1, "ops-slack")])
    const manifests = [makeManifest("ops-slack")]
    const changes = await reconcileTriggers(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
  })

  it("detects UPDATE when remote differs in a field", async () => {
    const api = mockTriggersApi([makeTrigger(1, "ops-slack")])
    const manifests = [
      makeManifest("ops-slack", {
        spec: { type: "DISCORD" as const, webhookUrl: "https://discord.com/webhook" },
      }),
    ]
    const changes = await reconcileTriggers(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
    expect(changes[0]?.patch).toBeDefined()
  })

  it("detects DELETE orphan with deleteOrphans enabled", async () => {
    const api = mockTriggersApi([makeTrigger(99, "old-trigger")])
    const changes = await reconcileTriggers(api, [], { deleteOrphans: true })
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("DELETE")
    expect(changes[0]?.key).toBe("old-trigger")
  })

  it("skips orphan with deleteOrphans disabled", async () => {
    const api = mockTriggersApi([makeTrigger(99, "old-trigger")])
    const changes = await reconcileTriggers(api, [])
    expect(changes).toHaveLength(0)
  })

  it("filters by name option", async () => {
    const api = mockTriggersApi([makeTrigger(1, "a"), makeTrigger(2, "b")])
    const manifests = [makeManifest("a"), makeManifest("b")]
    const changes = await reconcileTriggers(api, manifests, { name: "a" })
    expect(changes).toHaveLength(1)
    expect(changes[0]?.key).toBe("a")
  })
})
