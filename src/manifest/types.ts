import type { z } from "zod";
import type {
  MonitorManifestSchema,
  PageManifestSchema,
  AlertTriggerManifestSchema,
  AlertConfigManifestSchema,
  IncidentManifestSchema,
  MaintenanceManifestSchema,
  AnyManifestSchema,
  MonitorSpecSchema,
  ApiTypeDataSchema,
  PingTypeDataSchema,
  TcpTypeDataSchema,
  DnsTypeDataSchema,
  SslTypeDataSchema,
  SqlTypeDataSchema,
  HeartbeatTypeDataSchema,
  GamedigTypeDataSchema,
  GrpcTypeDataSchema,
  GroupTypeDataSchema,
} from "./schema";

export type MonitorManifest = z.infer<typeof MonitorManifestSchema>;
export type PageManifest = z.infer<typeof PageManifestSchema>;
export type AlertTriggerManifest = z.infer<typeof AlertTriggerManifestSchema>;
export type AlertConfigManifest = z.infer<typeof AlertConfigManifestSchema>;
export type IncidentManifest = z.infer<typeof IncidentManifestSchema>;
export type MaintenanceManifest = z.infer<typeof MaintenanceManifestSchema>;

export type AnyManifest = z.infer<typeof AnyManifestSchema>;
export type ManifestKind = AnyManifest["kind"];

export type MonitorSpec = z.infer<typeof MonitorSpecSchema>;
export type ApiTypeData = z.infer<typeof ApiTypeDataSchema>;
export type PingTypeData = z.infer<typeof PingTypeDataSchema>;
export type TcpTypeData = z.infer<typeof TcpTypeDataSchema>;
export type DnsTypeData = z.infer<typeof DnsTypeDataSchema>;
export type SslTypeData = z.infer<typeof SslTypeDataSchema>;
export type SqlTypeData = z.infer<typeof SqlTypeDataSchema>;
export type HeartbeatTypeData = z.infer<typeof HeartbeatTypeDataSchema>;
export type GamedigTypeData = z.infer<typeof GamedigTypeDataSchema>;
export type GrpcTypeData = z.infer<typeof GrpcTypeDataSchema>;
export type GroupTypeData = z.infer<typeof GroupTypeDataSchema>;
