import { z } from "zod"

// ─── Monitor ───────────────────────────────────────────────────────────────

export const MonitorSchema = z.object({
  id: z.number(),
  tag: z.string(),
  name: z.string(),
  description: z.string().default(""),
  type: z.enum([
    "API",
    "PING",
    "TCP",
    "DNS",
    "SSL",
    "SQL",
    "HEARTBEAT",
    "GAMEDIG",
    "GRPC",
    "GROUP",
  ]),
  categoryName: z.string().optional(),
  cronSchedule: z.string(),
  defaultStatus: z.enum(["UP", "DOWN", "DEGRADED"]),
  gracePeriod: z.number().optional(),
  dayDegradedMinCount: z.number().optional(),
  dayDownMinCount: z.number().optional(),
  typeData: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
})

export const MonitorListResponseSchema = z.array(MonitorSchema)
export const MonitorResponseSchema = MonitorSchema

export const CreateMonitorBodySchema = z.object({
  tag: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum([
    "API",
    "PING",
    "TCP",
    "DNS",
    "SSL",
    "SQL",
    "HEARTBEAT",
    "GAMEDIG",
    "GRPC",
    "GROUP",
  ]),
  categoryName: z.string().optional(),
  cronSchedule: z.string().optional(),
  defaultStatus: z.enum(["UP", "DOWN", "DEGRADED"]).optional(),
  gracePeriod: z.number().optional(),
  dayDegradedMinCount: z.number().optional(),
  dayDownMinCount: z.number().optional(),
  typeData: z.record(z.unknown()).optional(),
})

export const UpdateMonitorBodySchema = CreateMonitorBodySchema.partial()

export type Monitor = z.infer<typeof MonitorSchema>
export type CreateMonitorBody = z.infer<typeof CreateMonitorBodySchema>
export type UpdateMonitorBody = z.infer<typeof UpdateMonitorBodySchema>

// ─── Page ───────────────────────────────────────────────────────────────────

export const PageSchema = z.object({
  id: z.number(),
  path: z.string(),
  title: z.string(),
  header: z.string().default(""),
  pageContent: z.string().default(""),
  monitors: z.array(z.unknown()).default([]),
  display: z
    .object({
      desktopDays: z.number(),
      mobileDays: z.number(),
      layout: z.enum(["default-list", "default-grid", "compact-list", "compact-grid"]),
    })
    .optional(),
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    })
    .optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
})

export const PageListResponseSchema = z.array(PageSchema)
export const PageResponseSchema = PageSchema

export const CreatePageBodySchema = z.object({
  path: z.string().min(1),
  title: z.string().min(1),
  header: z.string().optional(),
  pageContent: z.string().optional(),
  monitors: z.array(z.string()).optional(),
  display: z
    .object({
      desktopDays: z.number(),
      mobileDays: z.number(),
      layout: z.enum(["default-list", "default-grid", "compact-list", "compact-grid"]),
    })
    .optional(),
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    })
    .optional(),
})

export const UpdatePageBodySchema = CreatePageBodySchema.partial()

export type Page = z.infer<typeof PageSchema>
export type CreatePageBody = z.infer<typeof CreatePageBodySchema>
export type UpdatePageBody = z.infer<typeof UpdatePageBodySchema>

// ─── AlertTrigger ───────────────────────────────────────────────────────────

export const AlertTriggerSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(["WEBHOOK", "DISCORD", "SLACK", "EMAIL"]),
  webhookUrl: z.string().optional(),
  emailAddresses: z.array(z.string()).optional(),
  discordChannelId: z.string().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
})

export const AlertTriggerListResponseSchema = z.array(AlertTriggerSchema)
export const AlertTriggerResponseSchema = AlertTriggerSchema

export const CreateAlertTriggerBodySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["WEBHOOK", "DISCORD", "SLACK", "EMAIL"]),
  webhookUrl: z.string().optional(),
  emailAddresses: z.array(z.string()).optional(),
  discordChannelId: z.string().optional(),
})

export const UpdateAlertTriggerBodySchema = CreateAlertTriggerBodySchema.partial()

export type AlertTrigger = z.infer<typeof AlertTriggerSchema>
export type CreateAlertTriggerBody = z.infer<typeof CreateAlertTriggerBodySchema>
export type UpdateAlertTriggerBody = z.infer<typeof UpdateAlertTriggerBodySchema>

// ─── AlertConfig ────────────────────────────────────────────────────────────

export const AlertConfigSchema = z.object({
  id: z.number(),
  monitorTag: z.string(),
  alertType: z.enum(["STATUS", "LATENCY", "UPTIME"]),
  alertValue: z.string(),
  failureThreshold: z.number(),
  successThreshold: z.number(),
  severity: z.enum(["CRITICAL", "WARNING"]),
  createIncident: z.boolean(),
  triggers: z.array(z.unknown()).optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
})

export const AlertConfigListResponseSchema = z.array(AlertConfigSchema)
export const AlertConfigResponseSchema = AlertConfigSchema

export const CreateAlertConfigBodySchema = z.object({
  monitorTag: z.string().min(1),
  alertType: z.enum(["STATUS", "LATENCY", "UPTIME"]),
  alertValue: z.string(),
  failureThreshold: z.number().optional(),
  successThreshold: z.number().optional(),
  severity: z.enum(["CRITICAL", "WARNING"]).optional(),
  createIncident: z.boolean().optional(),
  triggerIds: z.array(z.number()).optional(),
})

export const UpdateAlertConfigBodySchema = CreateAlertConfigBodySchema.partial()

export type AlertConfig = z.infer<typeof AlertConfigSchema>
export type CreateAlertConfigBody = z.infer<typeof CreateAlertConfigBodySchema>
export type UpdateAlertConfigBody = z.infer<typeof UpdateAlertConfigBodySchema>

// ─── Incident ───────────────────────────────────────────────────────────────

export const IncidentSchema = z.object({
  id: z.number(),
  title: z.string(),
  state: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]),
  affectedMonitors: z
    .array(
      z.object({
        tag: z.string(),
        impact: z.enum(["DOWN", "DEGRADED"]),
      }),
    )
    .default([]),
  updates: z
    .array(
      z.object({
        message: z.string(),
        state: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]),
      }),
    )
    .default([]),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
})

export const IncidentListResponseSchema = z.array(IncidentSchema)
export const IncidentResponseSchema = IncidentSchema

export const CreateIncidentBodySchema = z.object({
  title: z.string().min(1),
  state: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]).optional(),
  affectedMonitors: z
    .array(
      z.object({
        tag: z.string(),
        impact: z.enum(["DOWN", "DEGRADED"]),
      }),
    )
    .optional(),
})

export const UpdateIncidentBodySchema = CreateIncidentBodySchema.extend({
  update: z
    .object({
      message: z.string().min(1),
      state: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]),
    })
    .optional(),
}).partial()

export type Incident = z.infer<typeof IncidentSchema>
export type CreateIncidentBody = z.infer<typeof CreateIncidentBodySchema>
export type UpdateIncidentBody = z.infer<typeof UpdateIncidentBodySchema>

// ─── Maintenance ────────────────────────────────────────────────────────────

export const MaintenanceSchema = z.object({
  id: z.number(),
  title: z.string(),
  monitors: z.array(z.unknown()).default([]),
  startDatetime: z.string().datetime({ offset: true }),
  endDatetime: z.string().datetime({ offset: true }),
  rrule: z.string().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
})

export const MaintenanceListResponseSchema = z.array(MaintenanceSchema)
export const MaintenanceResponseSchema = MaintenanceSchema

export const CreateMaintenanceBodySchema = z.object({
  title: z.string().min(1),
  monitors: z.array(z.string()).optional(),
  startDatetime: z.string().datetime({ offset: true }),
  endDatetime: z.string().datetime({ offset: true }),
  rrule: z.string().optional(),
})

export const UpdateMaintenanceBodySchema = CreateMaintenanceBodySchema.partial()

export type Maintenance = z.infer<typeof MaintenanceSchema>
export type CreateMaintenanceBody = z.infer<typeof CreateMaintenanceBodySchema>
export type UpdateMaintenanceBody = z.infer<typeof UpdateMaintenanceBodySchema>
