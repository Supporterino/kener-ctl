import type { KyInstance } from "ky"
import type { AlertConfig, CreateAlertConfigBody, UpdateAlertConfigBody } from "./types"
import { AlertConfigListResponseSchema, AlertConfigResponseSchema } from "./types"

export function createAlertConfigsApi(client: KyInstance) {
  return {
    list: async (): Promise<AlertConfig[]> => {
      const data = await client.get("alert-configs").json()
      return AlertConfigListResponseSchema.parse(data)
    },

    get: async (id: number): Promise<AlertConfig> => {
      const data = await client.get(`alert-configs/${id}`).json()
      return AlertConfigResponseSchema.parse(data)
    },

    create: async (body: CreateAlertConfigBody): Promise<AlertConfig> => {
      const data = await client.post("alert-configs", { json: body }).json()
      return AlertConfigResponseSchema.parse(data)
    },

    update: async (id: number, body: UpdateAlertConfigBody): Promise<AlertConfig> => {
      const data = await client.patch(`alert-configs/${id}`, { json: body }).json()
      return AlertConfigResponseSchema.parse(data)
    },

    delete: async (id: number): Promise<void> => {
      await client.delete(`alert-configs/${id}`)
    },
  }
}

export type AlertConfigsApi = ReturnType<typeof createAlertConfigsApi>
