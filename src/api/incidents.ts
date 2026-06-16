import type { KyInstance } from "ky";
import {
  IncidentListResponseSchema,
  IncidentResponseSchema,
} from "./types";
import type { Incident, CreateIncidentBody, UpdateIncidentBody } from "./types";

export function createIncidentsApi(client: KyInstance) {
  return {
    list: async (): Promise<Incident[]> => {
      const data = await client.get("incidents").json();
      return IncidentListResponseSchema.parse(data);
    },

    get: async (id: number): Promise<Incident> => {
      const data = await client.get(`incidents/${id}`).json();
      return IncidentResponseSchema.parse(data);
    },

    create: async (body: CreateIncidentBody): Promise<Incident> => {
      const data = await client.post("incidents", { json: body }).json();
      return IncidentResponseSchema.parse(data);
    },

    update: async (id: number, body: UpdateIncidentBody): Promise<Incident> => {
      const data = await client.patch(`incidents/${id}`, { json: body }).json();
      return IncidentResponseSchema.parse(data);
    },

    delete: async (id: number): Promise<void> => {
      await client.delete(`incidents/${id}`);
    },
  };
}

export type IncidentsApi = ReturnType<typeof createIncidentsApi>;
