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
    const rPath = r.page_path
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
    kind: "Page",
    metadata: {
      path: page.page_path,
    },
    spec: {
      title: page.page_title,
      header: page.page_header,
      pageContent: page.page_subheader,
      monitors: page.monitors.map((m) => m.monitor_tag),
      display: page.page_settings?.display,
      seo: page.page_settings?.seo,
    },
    id: page.id,
    created_at: page.created_at,
    updated_at: page.updated_at,
  }
}
