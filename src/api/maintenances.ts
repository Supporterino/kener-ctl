import type { KyInstance } from "ky"
import type { Maintenance, CreateMaintenanceBody, UpdateMaintenanceBody } from "./types"
import { MaintenanceListResponseSchema, MaintenanceResponseSchema } from "./types"

export function createMaintenancesApi(client: KyInstance) {
  return {
    list: async (): Promise<Maintenance[]> => {
      const data = await client.get("maintenances").json()
      const parsed = MaintenanceListResponseSchema.parse(data)
      return parsed.maintenances
    },

    get: async (id: number): Promise<Maintenance> => {
      const data = await client.get(`maintenances/${id}`).json()
      const parsed = MaintenanceResponseSchema.parse(data)
      return parsed.maintenance
    },

    create: async (body: CreateMaintenanceBody): Promise<Maintenance> => {
      const data = await client.post("maintenances", { json: body }).json()
      const parsed = MaintenanceResponseSchema.parse(data)
      return parsed.maintenance
    },

    update: async (id: number, body: UpdateMaintenanceBody): Promise<Maintenance> => {
      const data = await client.patch(`maintenances/${id}`, { json: body }).json()
      const parsed = MaintenanceResponseSchema.parse(data)
      return parsed.maintenance
    },

    delete: async (id: number): Promise<void> => {
      await client.delete(`maintenances/${id}`)
    },
  }
}

export type MaintenancesApi = ReturnType<typeof createMaintenancesApi>
