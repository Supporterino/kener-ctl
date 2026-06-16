import { describe, expect, it } from "bun:test"
import type { AlertConfigsApi } from "@/api/alert-configs"
import type { AlertConfig } from "@/api/types"
import type { AlertConfigManifest } from "@/manifest/types"
import { reconcileAlertConfigs, type StateFile } from "@/reconciler/resources/alert-config"

function mockAlertConfigsApi(configs: AlertConfig[]): AlertConfigsApi {
  return {
    list: async () => configs,
    get: async () => ({}) as AlertConfig,
    create: async () => ({}) as AlertConfig,
    update: async () => ({}) as AlertConfig,
    delete: async () => {},
  }
}

function makeConfig(id: number, monitorTag: string, alertType: string = "STATUS"): AlertConfig {
  return {
    id,
    monitorTag,
    alertType: alertType as "STATUS",
    alertValue: "DOWN",
    failureThreshold: 3,
    successThreshold: 2,
    severity: "CRITICAL",
    createIncident: true,
    triggers: [],
  }
}

function makeManifest(
  name: string,
  monitorTag: string,
  specOverrides: Partial<AlertConfigManifest["spec"]> = {},
): AlertConfigManifest {
  return {
    kind: "AlertConfig" as const,
    metadata: { name },
    spec: {
      monitorTag,
      alertType: "STATUS" as const,
      alertValue: "DOWN",
      failureThreshold: 1,
      successThreshold: 2,
      severity: "WARNING" as const,
      createIncident: false,
      triggerNames: [],
      ...specOverrides,
    },
  }
}

describe("reconcileAlertConfigs", () => {
  it("detects CREATE when state file has no mapping", async () => {
    const api = mockAlertConfigsApi([makeConfig(1, "my-api")])
    const manifests = [makeManifest("api-down-critical", "my-api")]
    const changes = await reconcileAlertConfigs(api, manifests, null)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("CREATE")
    expect(changes[0]?.key).toBe("api-down-critical")
  })

  it("detects UPDATE when state file maps name to remote config", async () => {
    const stateFile: StateFile = {
      version: 1,
      alertConfigs: { "api-down-critical": 1 },
    }
    const api = mockAlertConfigsApi([makeConfig(1, "my-api")])
    const manifests = [makeManifest("api-down-critical", "my-api")]
    const changes = await reconcileAlertConfigs(api, manifests, stateFile)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
  })

  it("detects UPDATE when remote field differs from manifest", async () => {
    const stateFile: StateFile = {
      version: 1,
      alertConfigs: { "api-down-critical": 1 },
    }
    const api = mockAlertConfigsApi([makeConfig(1, "my-api", "LATENCY")])
    const manifests = [makeManifest("api-down-critical", "my-api")]
    const changes = await reconcileAlertConfigs(api, manifests, stateFile)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
    expect(changes[0]?.patch).toBeDefined()
  })

  it("detects DELETE orphan when deleteOrphans enabled", async () => {
    const stateFile: StateFile = {
      version: 1,
      alertConfigs: { "old-config": 99 },
    }
    const api = mockAlertConfigsApi([makeConfig(99, "old-monitor")])
    const changes = await reconcileAlertConfigs(api, [], stateFile, { deleteOrphans: true })
    const deletes = changes.filter((c) => c.action === "DELETE")
    expect(deletes.length).toBeGreaterThanOrEqual(1)
  })

  it("handles CREATE when manifest has no state mapping but remote configs exist", async () => {
    const stateFile: StateFile = { version: 1 }
    const api = mockAlertConfigsApi([makeConfig(1, "other-api")])
    const manifests = [makeManifest("new-config", "my-api")]
    const changes = await reconcileAlertConfigs(api, manifests, stateFile)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("CREATE")
    expect(changes[0]?.key).toBe("new-config")
  })
})
