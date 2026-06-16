import type { KyInstance } from "ky";
import {
  MaintenanceListResponseSchema,
  MaintenanceResponseSchema,
} from "./types";
import type { Maintenance, CreateMaintenanceBody, UpdateMaintenanceBody } from "./types";

export function createMaintenancesApi(client: KyInstance) {
  return {
    list: async (): Promise<Maintenance[]> => {
      const data = await client.get("maintenances").json();
      return MaintenanceListResponseSchema.parse(data);
    },

    get: async (id: number): Promise<Maintenance> => {
      const data = await client.get(`maintenances/${id}`).json();
      return MaintenanceResponseSchema.parse(data);
    },

    create: async (body: CreateMaintenanceBody): Promise<Maintenance> => {
      const data = await client.post("maintenances", { json: body }).json();
      return MaintenanceResponseSchema.parse(data);
    },

    update: async (id: number, body: UpdateMaintenanceBody): Promise<Maintenance> => {
      const data = await client.patch(`maintenances/${id}`, { json: body }).json();
      return MaintenanceResponseSchema.parse(data);
    },

    delete: async (id: number): Promise<void> => {
      await client.delete(`maintenances/${id}`);
    },
  };
}

export type MaintenancesApi = ReturnType<typeof createMaintenancesApi>;
