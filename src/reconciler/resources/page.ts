import type { PagesApi } from "@/api/pages"
import type { Page } from "@/api/types"
import type { PageManifest } from "@/manifest/types"
import type { Change } from "../diff"
import { diff, stripServerFields } from "../diff"

export async function reconcilePages(
  api: PagesApi,
  desired: PageManifest[],
  opts: { deleteOrphans?: boolean; path?: string } = {},
): Promise<Change<PageManifest>[]> {
  const filtered = opts.path ? desired.filter((p) => p.metadata.path === opts.path) : desired

  const remote = await api.list()

  const desiredMap = new Map<string, PageManifest>()
  for (const p of filtered) {
    desiredMap.set(p.metadata.path, p)
  }

  const actualMap = new Map<string, Record<string, unknown>>()
  for (const r of remote) {
    const rPath = r.path === "~home" ? "~home" : r.path
    if (
      filtered.some((p) => p.metadata.path === rPath) ||
      opts.deleteOrphans ||
      opts.path === undefined
    ) {
      actualMap.set(rPath, pageFromApi(r))
    }
  }

  return diff(desiredMap, actualMap, stripServerFields, {
    deleteOrphans: opts.deleteOrphans,
  })
}

function pageFromApi(page: Page): Record<string, unknown> {
  return {
    path: page.path === "~home" ? "~home" : page.path,
    title: page.title,
    header: page.header,
    pageContent: page.pageContent,
    monitors: page.monitors,
    display: page.display,
    seo: page.seo,
    id: page.id,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  }
}
