import { z } from "zod"

// ─── Common ────────────────────────────────────────────────────────────────

export const CronExpression = z.string()
export const MarkdownString = z.string()

// ─── Monitor ───────────────────────────────────────────────────────────────

export const MonitorTypeEnum = z.enum([
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
])

export const MonitorStatusEnum = z.enum(["UP", "DOWN", "DEGRADED"])

export const MonitorHeaderSchema = z.object({
  key: z.string(),
  value: z.string(),
})

// API type
export const ApiTypeDataSchema = z.object({
  url: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]).default("GET"),
  timeout: z.number().int().min(1).default(10000),
  allowSelfSignedCert: z.boolean().default(false),
  headers: z.array(MonitorHeaderSchema).default([]),
  body: z.string().default(""),
  eval: z.string().optional(),
})

// PING type
export const PingTypeDataSchema = z.object({
  host: z.string(),
  timeout: z.number().int().min(1).default(5000),
})

// TCP type
export const TcpTypeDataSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  timeout: z.number().int().min(1).default(5000),
})

// DNS type
export const DnsTypeDataSchema = z.object({
  host: z.string(),
  type: z.enum(["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA"]).default("A"),
  dnsServer: z.string().optional(),
  timeout: z.number().int().min(1).default(5000),
})

// SSL type
export const SslTypeDataSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535).default(443),
  timeout: z.number().int().min(1).default(5000),
})

// SQL type
export const SqlTypeDataSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  username: z.string(),
  password: z.string(),
  database: z.string(),
  query: z.string().default("SELECT 1"),
  timeout: z.number().int().min(1).default(5000),
})

// HEARTBEAT type
export const HeartbeatTypeDataSchema = z.object({
  interval: z.number().int().min(1).default(60000),
})

// GAMEDIG type
export const GamedigTypeDataSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  type: z.string(),
  timeout: z.number().int().min(1).default(5000),
})

// GRPC type
export const GrpcTypeDataSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  service: z.string().default(""),
  timeout: z.number().int().min(1).default(5000),
})

// GROUP type
export const GroupTypeDataSchema = z.object({
  monitorTags: z.array(z.string()),
})

export const MonitorTypeDataSchema = z.discriminatedUnion("_type", [
  ApiTypeDataSchema.extend({ _type: z.literal("API") }),
  PingTypeDataSchema.extend({ _type: z.literal("PING") }),
  TcpTypeDataSchema.extend({ _type: z.literal("TCP") }),
  DnsTypeDataSchema.extend({ _type: z.literal("DNS") }),
  SslTypeDataSchema.extend({ _type: z.literal("SSL") }),
  SqlTypeDataSchema.extend({ _type: z.literal("SQL") }),
  HeartbeatTypeDataSchema.extend({ _type: z.literal("HEARTBEAT") }),
  GamedigTypeDataSchema.extend({ _type: z.literal("GAMEDIG") }),
  GrpcTypeDataSchema.extend({ _type: z.literal("GRPC") }),
  GroupTypeDataSchema.extend({ _type: z.literal("GROUP") }),
])

export const MonitorSpecSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  type: MonitorTypeEnum,
  categoryName: z.string().optional(),
  cronSchedule: CronExpression.default("* * * * *"),
  defaultStatus: MonitorStatusEnum.default("DOWN"),
  gracePeriod: z.number().int().min(0).optional(),
  dayDegradedMinCount: z.number().int().min(0).optional(),
  dayDownMinCount: z.number().int().min(0).optional(),
  typeData: z.record(z.unknown()).optional(),
})

export const MonitorManifestSchema = z.object({
  kind: z.literal("Monitor"),
  metadata: z.object({
    tag: z.string().min(1),
  }),
  spec: MonitorSpecSchema,
})

// ─── Page ───────────────────────────────────────────────────────────────────

export const PageLayoutEnum = z.enum([
  "default-list",
  "default-grid",
  "compact-list",
  "compact-grid",
])

export const PageDisplaySchema = z.object({
  desktopDays: z.number().int().min(1).default(90),
  mobileDays: z.number().int().min(1).default(30),
  layout: PageLayoutEnum.default("default-list"),
})

export const PageSeoSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
})

export const PageSpecSchema = z.object({
  title: z.string().min(1),
  header: z.string().default(""),
  pageContent: MarkdownString.default(""),
  monitors: z.array(z.string()).default([]),
  display: PageDisplaySchema.default({}),
  seo: PageSeoSchema.optional(),
})

export const PageManifestSchema = z.object({
  kind: z.literal("Page"),
  metadata: z.object({
    path: z.string().min(1),
  }),
  spec: PageSpecSchema,
})

// ─── AlertTrigger ───────────────────────────────────────────────────────────

export const TriggerTypeEnum = z.enum(["WEBHOOK", "DISCORD", "SLACK", "EMAIL"])

export const AlertTriggerSpecSchema = z.object({
  type: TriggerTypeEnum,
  webhookUrl: z.string().optional(),
  emailAddresses: z.array(z.string()).optional(),
  discordChannelId: z.string().optional(),
})

export const AlertTriggerManifestSchema = z.object({
  kind: z.literal("AlertTrigger"),
  metadata: z.object({
    name: z.string().min(1),
  }),
  spec: AlertTriggerSpecSchema,
})

// ─── AlertConfig ────────────────────────────────────────────────────────────

export const AlertTypeEnum = z.enum(["STATUS", "LATENCY", "UPTIME"])
export const SeverityEnum = z.enum(["CRITICAL", "WARNING"])

export const AlertConfigSpecSchema = z.object({
  monitorTag: z.string().min(1),
  alertType: AlertTypeEnum,
  alertValue: z.string(),
  failureThreshold: z.number().int().min(1).default(1),
  successThreshold: z.number().int().min(1).default(2),
  severity: SeverityEnum.default("WARNING"),
  createIncident: z.boolean().default(false),
  triggerNames: z.array(z.string()).default([]),
})

export const AlertConfigManifestSchema = z.object({
  kind: z.literal("AlertConfig"),
  metadata: z.object({
    name: z.string().min(1),
  }),
  spec: AlertConfigSpecSchema,
})

// ─── Incident ───────────────────────────────────────────────────────────────

export const IncidentStateEnum = z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"])

export const IncidentImpactEnum = z.enum(["DOWN", "DEGRADED"])

export const AffectedMonitorSchema = z.object({
  tag: z.string(),
  impact: IncidentImpactEnum,
})

export const IncidentUpdateSchema = z.object({
  message: z.string().min(1),
  state: IncidentStateEnum,
})

export const IncidentSpecSchema = z.object({
  title: z.string().min(1),
  state: IncidentStateEnum.default("INVESTIGATING"),
  affectedMonitors: z.array(AffectedMonitorSchema).default([]),
  updates: z.array(IncidentUpdateSchema).default([]),
})

export const IncidentManifestSchema = z.object({
  kind: z.literal("Incident"),
  metadata: z.object({
    name: z.string().min(1),
  }),
  spec: IncidentSpecSchema,
})

// ─── Maintenance ────────────────────────────────────────────────────────────

export const MaintenanceSpecSchema = z.object({
  title: z.string().min(1),
  monitors: z.array(z.string()).default([]),
  startDatetime: z.string().datetime(),
  endDatetime: z.string().datetime(),
  rrule: z.string().optional(),
})

export const MaintenanceManifestSchema = z.object({
  kind: z.literal("Maintenance"),
  metadata: z.object({
    name: z.string().min(1),
  }),
  spec: MaintenanceSpecSchema,
})

// ─── Union ──────────────────────────────────────────────────────────────────

export const AnyManifestSchema = z.discriminatedUnion("kind", [
  MonitorManifestSchema,
  PageManifestSchema,
  AlertTriggerManifestSchema,
  AlertConfigManifestSchema,
  IncidentManifestSchema,
  MaintenanceManifestSchema,
])
