import type { KyInstance } from "ky"
import type { CreatePageBody, Page, UpdatePageBody } from "./types"
import { PageListResponseSchema, PageResponseSchema } from "./types"

export function createPagesApi(client: KyInstance) {
  return {
    list: async (): Promise<Page[]> => {
      const data = await client.get("pages").json()
      return PageListResponseSchema.parse(data)
    },

    get: async (id: number): Promise<Page> => {
      const data = await client.get(`pages/${id}`).json()
      return PageResponseSchema.parse(data)
    },

    create: async (body: CreatePageBody): Promise<Page> => {
      const data = await client.post("pages", { json: body }).json()
      return PageResponseSchema.parse(data)
    },

    update: async (id: number, body: UpdatePageBody): Promise<Page> => {
      const data = await client.patch(`pages/${id}`, { json: body }).json()
      return PageResponseSchema.parse(data)
    },

    delete: async (id: number): Promise<void> => {
      await client.delete(`pages/${id}`)
    },
  }
}

export type PagesApi = ReturnType<typeof createPagesApi>
