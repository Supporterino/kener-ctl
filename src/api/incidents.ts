import type { KyInstance } from "ky"
import type { Incident, CreateIncidentBody, UpdateIncidentBody } from "./types"
import { IncidentListResponseSchema, IncidentResponseSchema } from "./types"

export function createIncidentsApi(client: KyInstance) {
  return {
    list: async (): Promise<Incident[]> => {
      const data = await client.get("incidents").json()
      const parsed = IncidentListResponseSchema.parse(data)
      return parsed.incidents
    },

    get: async (id: number): Promise<Incident> => {
      const data = await client.get(`incidents/${id}`).json()
      const parsed = IncidentResponseSchema.parse(data)
      return parsed.incident
    },

    create: async (body: CreateIncidentBody): Promise<Incident> => {
      const data = await client.post("incidents", { json: body }).json()
      const parsed = IncidentResponseSchema.parse(data)
      return parsed.incident
    },

    update: async (id: number, body: UpdateIncidentBody): Promise<Incident> => {
      const data = await client.patch(`incidents/${id}`, { json: body }).json()
      const parsed = IncidentResponseSchema.parse(data)
      return parsed.incident
    },

    delete: async (id: number): Promise<void> => {
      await client.delete(`incidents/${id}`)
    },
  }
}

export type IncidentsApi = ReturnType<typeof createIncidentsApi>
