import { describe, expect, it } from "bun:test"
import {
  AnyManifestSchema,
  IncidentManifestSchema,
  MaintenanceManifestSchema,
  MonitorManifestSchema,
  PageManifestSchema,
} from "@/manifest/schema"

// ─── Monitor ────────────────────────────────────────────────────────────────

describe("MonitorManifestSchema", () => {
  const validMonitor = {
    kind: "Monitor" as const,
    metadata: { tag: "my-api" },
    spec: {
      name: "My API",
      type: "API" as const,
      typeData: {
        url: "https://api.example.com/health",
        method: "GET" as const,
      },
    },
  }

  it("accepts valid API monitor", () => {
    const result = MonitorManifestSchema.safeParse(validMonitor)
    expect(result.success).toBe(true)
  })

  it("accepts monitor with defaults", () => {
    const result = MonitorManifestSchema.safeParse({
      kind: "Monitor",
      metadata: { tag: "my-api" },
      spec: { name: "My API", type: "API" },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing kind", () => {
    const result = MonitorManifestSchema.safeParse({
      metadata: { tag: "my-api" },
      spec: { name: "My API", type: "API" },
    })
    expect(result.success).toBe(false)
  })

  it("rejects wrong kind", () => {
    const result = MonitorManifestSchema.safeParse({
      ...validMonitor,
      kind: "Page",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing metadata.tag", () => {
    const result = MonitorManifestSchema.safeParse({
      kind: "Monitor",
      metadata: {},
      spec: { name: "My API", type: "API" },
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty metadata.tag", () => {
    const result = MonitorManifestSchema.safeParse({
      kind: "Monitor",
      metadata: { tag: "" },
      spec: { name: "My API", type: "API" },
    })
    expect(result.success).toBe(false)
  })

  it("accepts PING monitor typeData", () => {
    const result = MonitorManifestSchema.safeParse({
      kind: "Monitor",
      metadata: { tag: "dns" },
      spec: {
        name: "DNS",
        type: "PING",
        typeData: { host: "8.8.8.8" },
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts TCP monitor typeData", () => {
    const result = MonitorManifestSchema.safeParse({
      kind: "Monitor",
      metadata: { tag: "redis" },
      spec: {
        name: "Redis",
        type: "TCP",
        typeData: { host: "localhost", port: 6379 },
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts GROUP monitor with monitorTags", () => {
    const result = MonitorManifestSchema.safeParse({
      kind: "Monitor",
      metadata: { tag: "all" },
      spec: {
        name: "All services",
        type: "GROUP",
        typeData: { monitorTags: ["api", "db"] },
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts NONE monitor type", () => {
    const result = MonitorManifestSchema.safeParse({
      kind: "Monitor",
      metadata: { tag: "info" },
      spec: {
        name: "Info Panel",
        type: "NONE",
      },
    })
    expect(result.success).toBe(true)
  })

  it("applies defaults for optional spec fields", () => {
    const result = MonitorManifestSchema.safeParse(validMonitor)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.spec.cronSchedule).toBe("* * * * *")
      expect(result.data.spec.defaultStatus).toBe("DOWN")
      expect(result.data.spec.description).toBe("")
    }
  })
})

// ─── Page ───────────────────────────────────────────────────────────────────

describe("PageManifestSchema", () => {
  const validPage = {
    kind: "Page" as const,
    metadata: { path: "services" },
    spec: { title: "Services Status" },
  }

  it("accepts valid page", () => {
    const result = PageManifestSchema.safeParse(validPage)
    expect(result.success).toBe(true)
  })

  it("accepts root page with empty path", () => {
    const result = PageManifestSchema.safeParse({
      kind: "Page",
      metadata: { path: "" },
      spec: { title: "Home" },
    })
    expect(result.success).toBe(true)
  })

  it("accepts page with monitors", () => {
    const result = PageManifestSchema.safeParse({
      ...validPage,
      spec: { ...validPage.spec, monitors: ["my-api", "db-primary"] },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing spec.title", () => {
    const result = PageManifestSchema.safeParse({
      kind: "Page",
      metadata: { path: "services" },
      spec: {},
    })
    expect(result.success).toBe(false)
  })
})

// ─── Incident ───────────────────────────────────────────────────────────────

describe("IncidentManifestSchema", () => {
  const validIncident = {
    kind: "Incident" as const,
    metadata: { name: "db-degraded-2024" },
    spec: {
      title: "Database Degraded",
      startDatetime: 1765468800,
    },
  }

  it("accepts valid incident", () => {
    const result = IncidentManifestSchema.safeParse(validIncident)
    expect(result.success).toBe(true)
  })

  it("accepts incident with affected monitors", () => {
    const result = IncidentManifestSchema.safeParse({
      ...validIncident,
      spec: {
        ...validIncident.spec,
        affectedMonitors: [{ tag: "db-primary", impact: "DEGRADED" as const }],
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing startDatetime", () => {
    const result = IncidentManifestSchema.safeParse({
      kind: "Incident",
      metadata: { name: "test" },
      spec: { title: "Test" },
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing spec.title", () => {
    const result = IncidentManifestSchema.safeParse({
      kind: "Incident",
      metadata: { name: "test" },
      spec: { startDatetime: 1765468800 },
    })
    expect(result.success).toBe(false)
  })
})

// ─── Maintenance ────────────────────────────────────────────────────────────

describe("MaintenanceManifestSchema", () => {
  const validMaintenance = {
    kind: "Maintenance" as const,
    metadata: { name: "weekly-db" },
    spec: {
      title: "Weekly DB Maintenance",
      startDatetime: 1765468800,
      rrule: "FREQ=WEEKLY;BYDAY=TU",
      durationSeconds: 7200,
    },
  }

  it("accepts valid maintenance", () => {
    const result = MaintenanceManifestSchema.safeParse(validMaintenance)
    expect(result.success).toBe(true)
  })

  it("rejects missing rrule", () => {
    const result = MaintenanceManifestSchema.safeParse({
      kind: "Maintenance",
      metadata: { name: "test" },
      spec: {
        title: "Test",
        startDatetime: 1765468800,
        durationSeconds: 3600,
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing durationSeconds", () => {
    const result = MaintenanceManifestSchema.safeParse({
      kind: "Maintenance",
      metadata: { name: "test" },
      spec: {
        title: "Test",
        startDatetime: 1765468800,
        rrule: "FREQ=WEEKLY",
      },
    })
    expect(result.success).toBe(false)
  })

  it("accepts monitors list", () => {
    const result = MaintenanceManifestSchema.safeParse({
      ...validMaintenance,
      spec: { ...validMaintenance.spec, monitors: ["db-primary"] },
    })
    expect(result.success).toBe(true)
  })
})

// ─── AnyManifest union ──────────────────────────────────────────────────────

describe("AnyManifestSchema", () => {
  it("parses Monitor via union", () => {
    const result = AnyManifestSchema.safeParse({
      kind: "Monitor",
      metadata: { tag: "api" },
      spec: { name: "API", type: "API" },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kind).toBe("Monitor")
    }
  })

  it("parses Page via union", () => {
    const result = AnyManifestSchema.safeParse({
      kind: "Page",
      metadata: { path: "services" },
      spec: { title: "Services" },
    })
    expect(result.success).toBe(true)
  })

  it("rejects unknown kind", () => {
    const result = AnyManifestSchema.safeParse({
      kind: "Unknown",
      metadata: {},
      spec: {},
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing kind", () => {
    const result = AnyManifestSchema.safeParse({
      metadata: {},
      spec: {},
    })
    expect(result.success).toBe(false)
  })
})
