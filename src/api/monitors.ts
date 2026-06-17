import type { KyInstance } from "ky"
import type { Monitor, CreateMonitorBody, UpdateMonitorBody } from "./types"
import { MonitorListResponseSchema, MonitorResponseSchema } from "./types"

export function createMonitorsApi(client: KyInstance) {
  return {
    list: async (): Promise<Monitor[]> => {
      const data = await client.get("monitors").json()
      const parsed = MonitorListResponseSchema.parse(data)
      return parsed.monitors
    },

    get: async (tag: string): Promise<Monitor> => {
      const data = await client.get(`monitors/${encodeURIComponent(tag)}`).json()
      const parsed = MonitorResponseSchema.parse(data)
      return parsed.monitor
    },

    create: async (body: CreateMonitorBody): Promise<Monitor> => {
      const data = await client.post("monitors", { json: body }).json()
      const parsed = MonitorResponseSchema.parse(data)
      return parsed.monitor
    },

    update: async (tag: string, body: UpdateMonitorBody): Promise<Monitor> => {
      const data = await client.patch(`monitors/${encodeURIComponent(tag)}`, { json: body }).json()
      const parsed = MonitorResponseSchema.parse(data)
      return parsed.monitor
    },

    deactivate: async (tag: string): Promise<Monitor> => {
      const data = await client
        .patch(`monitors/${encodeURIComponent(tag)}`, { json: { status: "INACTIVE" } })
        .json()
      const parsed = MonitorResponseSchema.parse(data)
      return parsed.monitor
    },
  }
}

export type MonitorsApi = ReturnType<typeof createMonitorsApi>
