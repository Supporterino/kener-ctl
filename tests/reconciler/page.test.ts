import { describe, expect, it } from "bun:test"
import type { PagesApi } from "@/api/pages"
import type { Page } from "@/api/types"
import type { PageManifest } from "@/manifest/types"
import { reconcilePages } from "@/reconciler/resources/page"

function mockPagesApi(pages: Page[]): PagesApi {
  return {
    list: async () => pages,
    create: async () => ({}) as Page,
    update: async () => ({}) as Page,
    delete: async () => {},
  }
}

function makePage(id: number, pagePath: string, title: string): Page {
  return {
    id,
    page_path: pagePath,
    page_title: title,
    page_header: "",
    page_subheader: "",
    page_logo: "",
    page_settings: {},
    monitors: [],
  }
}

function makeManifest(
  path: string,
  specOverrides: Partial<PageManifest["spec"]> = {},
): PageManifest {
  return {
    kind: "Page" as const,
    metadata: { path },
    spec: {
      title: `Page ${path}`,
      header: "",
      pageContent: "",
      monitors: [],
      display: { desktopDays: 90, mobileDays: 30, layout: "default-list" as const },
      ...specOverrides,
    },
  }
}

describe("reconcilePages", () => {
  it("detects CREATE for new page", async () => {
    const api = mockPagesApi([])
    const manifests = [makeManifest("services")]
    const changes = await reconcilePages(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("CREATE")
    expect(changes[0]?.key).toBe("services")
  })

  it("detects UPDATE when page exists remotely", async () => {
    const api = mockPagesApi([makePage(1, "services", "Services")])
    const manifests = [makeManifest("services", { title: "Services" })]
    const changes = await reconcilePages(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action === "UPDATE")
  })

  it("detects UPDATE when page title differs", async () => {
    const api = mockPagesApi([makePage(1, "services", "Old Title")])
    const manifests = [makeManifest("services", { title: "New Title" })]
    const changes = await reconcilePages(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("UPDATE")
  })

  it("detects DELETE orphan with deleteOrphans", async () => {
    const api = mockPagesApi([makePage(99, "old-page", "Old")])
    const changes = await reconcilePages(api, [], { deleteOrphans: true })
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action).toBe("DELETE")
    expect(changes[0]?.key).toBe("old-page")
  })

  it("handles empty path for root page and detects UPDATE", async () => {
    const api = mockPagesApi([makePage(1, "", "Home")])
    const manifests = [makeManifest("", { title: "Home" })]
    const changes = await reconcilePages(api, manifests)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.action === "UPDATE")
  })
})
