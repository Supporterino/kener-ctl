import type { KyInstance } from "ky"
import type { Page, CreatePageBody, UpdatePageBody } from "./types"
import { PageListResponseSchema, PageResponseSchema } from "./types"

export function createPagesApi(client: KyInstance) {
  return {
    list: async (): Promise<Page[]> => {
      const data = await client.get("pages").json()
      const parsed = PageListResponseSchema.parse(data)
      return parsed.pages
    },

    create: async (body: CreatePageBody): Promise<Page> => {
      const data = await client.post("pages", { json: body }).json()
      const parsed = PageResponseSchema.parse(data)
      return parsed.page
    },

    update: async (pagePath: string, body: UpdatePageBody): Promise<Page> => {
      const data = await client
        .patch(`pages/${encodeURIComponent(pagePath)}`, { json: body })
        .json()
      const parsed = PageResponseSchema.parse(data)
      return parsed.page
    },

    delete: async (pagePath: string): Promise<void> => {
      await client.delete(`pages/${encodeURIComponent(pagePath)}`)
    },
  }
}

export type PagesApi = ReturnType<typeof createPagesApi>
