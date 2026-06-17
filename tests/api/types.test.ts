import { describe, expect, it } from "bun:test"
import { CreatePageBodySchema, MonitorSchema } from "@/api/types"

const makeMonitor = (overrides: Record<string, unknown> = {}) => ({
  tag: "test-monitor",
  name: "Test Monitor",
  description: null,
  image: null,
  cron: "* * * * *",
  default_status: "DOWN",
  status: "ACTIVE",
  category_name: null,
  monitor_type: "API",
  day_degraded_minimum_count: null,
  day_down_minimum_count: null,
  include_degraded_in_downtime: "NO",
  is_hidden: "YES",
  monitor_settings_json: null,
  external_url: null,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-02T00:00:00.000Z",
  ...overrides,
})

describe("StringOrBool coercion", () => {
  it("coerces 'true'/'false' strings to booleans", () => {
    const result = MonitorSchema.parse(makeMonitor({
      include_degraded_in_downtime: "true",
      is_hidden: "false",
    }))
    expect(result.include_degraded_in_downtime).toBe(true)
    expect(result.is_hidden).toBe(false)
  })

  it("coerces 'YES'/'NO' strings to booleans", () => {
    const result = MonitorSchema.parse(makeMonitor({
      include_degraded_in_downtime: "NO",
      is_hidden: "YES",
    }))
    expect(result.include_degraded_in_downtime).toBe(false)
    expect(result.is_hidden).toBe(true)
  })

  it("coerces 'yes'/'no' strings to booleans", () => {
    const result = MonitorSchema.parse(makeMonitor({
      include_degraded_in_downtime: "yes",
      is_hidden: "no",
    }))
    expect(result.include_degraded_in_downtime).toBe(true)
    expect(result.is_hidden).toBe(false)
  })

  it("coerces 'Yes'/'No' strings to booleans", () => {
    const result = MonitorSchema.parse(makeMonitor({
      include_degraded_in_downtime: "Yes",
      is_hidden: "No",
    }))
    expect(result.include_degraded_in_downtime).toBe(true)
    expect(result.is_hidden).toBe(false)
  })

  it("coerces 'True'/'False' strings to booleans", () => {
    const result = MonitorSchema.parse(makeMonitor({
      include_degraded_in_downtime: "True",
      is_hidden: "False",
    }))
    expect(result.include_degraded_in_downtime).toBe(true)
    expect(result.is_hidden).toBe(false)
  })

  it("coerces '1'/'0' strings to booleans", () => {
    const result = MonitorSchema.parse(makeMonitor({
      include_degraded_in_downtime: "1",
      is_hidden: "0",
    }))
    expect(result.include_degraded_in_downtime).toBe(true)
    expect(result.is_hidden).toBe(false)
  })

  it("passes native booleans through unchanged", () => {
    const result = MonitorSchema.parse(makeMonitor({
      include_degraded_in_downtime: true,
      is_hidden: false,
    }))
    expect(result.include_degraded_in_downtime).toBe(true)
    expect(result.is_hidden).toBe(false)
  })

  it("rejects unrecognized string values", () => {
    expect(() =>
      MonitorSchema.parse(makeMonitor({
        include_degraded_in_downtime: "maybe",
        is_hidden: false,
      })),
    ).toThrow()
  })
})

describe("CreatePageBodySchema monitors", () => {
  it("accepts monitors as string array", () => {
    const result = CreatePageBodySchema.parse({
      page_path: "services",
      page_title: "Services",
      monitors: ["api-v1", "db-check"],
    })
    expect(result.monitors).toEqual(["api-v1", "db-check"])
  })

  it("rejects monitors as object array (server response format)", () => {
    expect(() =>
      CreatePageBodySchema.parse({
        page_path: "services",
        page_title: "Services",
        monitors: [{ monitor_tag: "x", position: 0 }],
      }),
    ).toThrow()
  })

  it("allows omitting monitors", () => {
    const result = CreatePageBodySchema.parse({
      page_path: "home",
      page_title: "Home",
    })
    expect(result.monitors).toBeUndefined()
  })
})
