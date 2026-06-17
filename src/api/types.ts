import { z } from "zod"

// ─── Monitor ───────────────────────────────────────────────────────────────

const StringOrBool = z.preprocess((v) => {
  if (v === "true") return true
  if (v === "false") return false
  return v
}, z.boolean())

export const MonitorSchema = z.object({
  tag: z.string(),
  name: z.string(),
  description: z.string().nullable().default(""),
  image: z.string().nullable().default(""),
  cron: z.string().default("* * * * *"),
  default_status: z.string().default("DOWN"),
  status: z.string().default("ACTIVE"),
  category_name: z.string().nullable().optional(),
  monitor_type: z.string(),
  type_data: z.record(z.unknown()).optional(),
  day_degraded_minimum_count: z.number().nullable().optional(),
  day_down_minimum_count: z.number().nullable().optional(),
  include_degraded_in_downtime: StringOrBool.default(false),
  is_hidden: StringOrBool.default(false),
  monitor_settings_json: z.record(z.unknown()).nullable().optional(),
  external_url: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const MonitorListResponseSchema = z.object({
  monitors: z.array(MonitorSchema),
})

export const MonitorResponseSchema = z.object({
  monitor: MonitorSchema,
})

export const CreateMonitorBodySchema = z.object({
  tag: z.string().min(1),
  name: z.string().min(1),
  cron: z.string().default("* * * * *"),
  default_status: z.string().default("DOWN"),
  monitor_type: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  category_name: z.string().optional(),
  type_data: z.record(z.unknown()).optional(),
  day_degraded_minimum_count: z.number().optional(),
  day_down_minimum_count: z.number().optional(),
  include_degraded_in_downtime: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
})

export const UpdateMonitorBodySchema = CreateMonitorBodySchema.partial().extend({
  status: z.string().optional(),
})

export type Monitor = z.infer<typeof MonitorSchema>
export type CreateMonitorBody = z.infer<typeof CreateMonitorBodySchema>
export type UpdateMonitorBody = z.infer<typeof UpdateMonitorBodySchema>

// ─── Page ───────────────────────────────────────────────────────────────────

export const PageSchema = z.object({
  id: z.number(),
  page_path: z.string(),
  page_title: z.string(),
  page_header: z.string().nullable().default(""),
  page_subheader: z.string().nullable().default(""),
  page_logo: z.string().nullable().default(""),
  page_settings: z.record(z.unknown()).nullable().default({}),
  monitors: z
    .array(
      z.object({
        monitor_tag: z.string(),
        position: z.number(),
      }),
    )
    .default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const PageListResponseSchema = z.object({
  pages: z.array(PageSchema),
})

export const PageResponseSchema = z.object({
  page: PageSchema,
})

export const CreatePageBodySchema = z.object({
  page_path: z.string(),
  page_title: z.string().min(1),
  page_header: z.string().optional(),
  page_subheader: z.string().optional(),
  page_logo: z.string().optional(),
  page_settings: z.record(z.unknown()).optional(),
  monitors: z
    .array(
      z.object({
        monitor_tag: z.string(),
        position: z.number(),
      }),
    )
    .optional(),
})

export const UpdatePageBodySchema = CreatePageBodySchema.partial()

export type Page = z.infer<typeof PageSchema>
export type CreatePageBody = z.infer<typeof CreatePageBodySchema>
export type UpdatePageBody = z.infer<typeof UpdatePageBodySchema>

// ─── Incident ───────────────────────────────────────────────────────────────

export const IncidentMonitorRefSchema = z.object({
  monitor_tag: z.string(),
  impact: z.enum(["DOWN", "DEGRADED"]),
})

export const IncidentSchema = z.object({
  id: z.number(),
  title: z.string(),
  start_date_time: z.number(),
  end_date_time: z.number().nullable(),
  state: z.string(),
  incident_type: z.string().nullable().optional(),
  incident_source: z.string().nullable().optional(),
  monitors: z.array(IncidentMonitorRefSchema).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const IncidentListResponseSchema = z.object({
  incidents: z.array(IncidentSchema),
})

export const IncidentResponseSchema = z.object({
  incident: IncidentSchema,
})

export const CreateIncidentBodySchema = z.object({
  title: z.string().min(1),
  start_date_time: z.number(),
  monitors: z.array(IncidentMonitorRefSchema).optional(),
})

export const UpdateIncidentBodySchema = CreateIncidentBodySchema.partial().extend({
  end_date_time: z.number().optional(),
})

export type Incident = z.infer<typeof IncidentSchema>
export type CreateIncidentBody = z.infer<typeof CreateIncidentBodySchema>
export type UpdateIncidentBody = z.infer<typeof UpdateIncidentBodySchema>

// ─── Maintenance ────────────────────────────────────────────────────────────

export const MaintenanceMonitorRefSchema = z.object({
  monitor_tag: z.string(),
  impact: z.enum(["DOWN", "DEGRADED"]),
})

export const MaintenanceSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable().default(""),
  start_date_time: z.number(),
  rrule: z.string(),
  duration_seconds: z.number(),
  status: z.string(),
  monitors: z.array(MaintenanceMonitorRefSchema).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const MaintenanceListResponseSchema = z.object({
  maintenances: z.array(MaintenanceSchema),
})

export const MaintenanceResponseSchema = z.object({
  maintenance: MaintenanceSchema,
})

export const CreateMaintenanceBodySchema = z.object({
  title: z.string().min(1),
  start_date_time: z.number(),
  rrule: z.string(),
  duration_seconds: z.number(),
  monitors: z.array(MaintenanceMonitorRefSchema).optional(),
})

export const UpdateMaintenanceBodySchema = CreateMaintenanceBodySchema.partial()

export type Maintenance = z.infer<typeof MaintenanceSchema>
export type CreateMaintenanceBody = z.infer<typeof CreateMaintenanceBodySchema>
export type UpdateMaintenanceBody = z.infer<typeof UpdateMaintenanceBodySchema>
