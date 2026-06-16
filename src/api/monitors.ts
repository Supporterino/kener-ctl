import type { KyInstance } from "ky";
import {
  MonitorListResponseSchema,
  MonitorResponseSchema,
} from "./types";
import type { Monitor, CreateMonitorBody, UpdateMonitorBody } from "./types";

export function createMonitorsApi(client: KyInstance) {
  return {
    list: async (): Promise<Monitor[]> => {
      const data = await client.get("monitors").json();
      return MonitorListResponseSchema.parse(data);
    },

    get: async (id: number): Promise<Monitor> => {
      const data = await client.get(`monitors/${id}`).json();
      return MonitorResponseSchema.parse(data);
    },

    create: async (body: CreateMonitorBody): Promise<Monitor> => {
      const data = await client.post("monitors", { json: body }).json();
      return MonitorResponseSchema.parse(data);
    },

    update: async (id: number, body: UpdateMonitorBody): Promise<Monitor> => {
      const data = await client.patch(`monitors/${id}`, { json: body }).json();
      return MonitorResponseSchema.parse(data);
    },

    delete: async (id: number): Promise<void> => {
      await client.delete(`monitors/${id}`);
    },
  };
}

export type MonitorsApi = ReturnType<typeof createMonitorsApi>;
