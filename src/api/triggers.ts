import type { KyInstance } from "ky"
import type { AlertTrigger, CreateAlertTriggerBody, UpdateAlertTriggerBody } from "./types"
import { AlertTriggerListResponseSchema, AlertTriggerResponseSchema } from "./types"

export function createTriggersApi(client: KyInstance) {
  return {
    list: async (): Promise<AlertTrigger[]> => {
      const data = await client.get("alert-triggers").json()
      return AlertTriggerListResponseSchema.parse(data)
    },

    get: async (id: number): Promise<AlertTrigger> => {
      const data = await client.get(`alert-triggers/${id}`).json()
      return AlertTriggerResponseSchema.parse(data)
    },

    create: async (body: CreateAlertTriggerBody): Promise<AlertTrigger> => {
      const data = await client.post("alert-triggers", { json: body }).json()
      return AlertTriggerResponseSchema.parse(data)
    },

    update: async (id: number, body: UpdateAlertTriggerBody): Promise<AlertTrigger> => {
      const data = await client.patch(`alert-triggers/${id}`, { json: body }).json()
      return AlertTriggerResponseSchema.parse(data)
    },

    delete: async (id: number): Promise<void> => {
      await client.delete(`alert-triggers/${id}`)
    },
  }
}

export type TriggersApi = ReturnType<typeof createTriggersApi>
