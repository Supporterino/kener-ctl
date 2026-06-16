import { defineCommand } from "citty";
import type { ManifestKind } from "@/manifest/types";

export const kindArg = {
  type: "string" as const,
  description: "Limit to one resource kind",
  valueHint: "Monitor|Page|AlertTrigger|AlertConfig|Incident|Maintenance",
};

export const tagArg = {
  type: "string" as const,
  description: "Target a single monitor by tag",
};

export const nameArg = {
  type: "string" as const,
  description: "Target a single resource by name",
};

export const pathArg = {
  type: "string" as const,
  description: "Target a single page by path",
};

export const configArg = {
  type: "string" as const,
  description: "Path to kener-ctl.yaml config file",
  valueHint: "path",
};

export const stateDirArg = {
  type: "string" as const,
  description: "Override state directory",
  valueHint: "path",
  default: "./state",
};

export const dryRunFlag = {
  type: "boolean" as const,
  description: "Show plan only, make no changes",
  default: false,
};

export const deleteOrphansFlag = {
  type: "boolean" as const,
  description: "Delete remote resources not in state",
  default: false,
};

export const verboseFlag = {
  type: "boolean" as const,
  description: "Enable verbose logging",
  default: false,
};

export const yesFlag = {
  type: "boolean" as const,
  description: "Skip confirmation prompt",
  default: false,
};

export const overwriteFlag = {
  type: "boolean" as const,
  description: "Overwrite existing files",
  default: false,
};

export const outputArg = {
  type: "string" as const,
  description: "Output format: table, json, or yaml",
  valueHint: "table|json|yaml",
  default: "table",
};

export function isValidKind(value: string): value is ManifestKind {
  return ["Monitor", "Page", "AlertTrigger", "AlertConfig", "Incident", "Maintenance"].includes(value);
}

export function formatKind(value: string): ManifestKind {
  const mapping: Record<string, ManifestKind> = {
    monitor: "Monitor",
    monitors: "Monitor",
    page: "Page",
    pages: "Page",
    alerttrigger: "AlertTrigger",
    alerttriggers: "AlertTrigger",
    triggers: "AlertTrigger",
    trigger: "AlertTrigger",
    alertconfig: "AlertConfig",
    alertconfigs: "AlertConfig",
    incident: "Incident",
    incidents: "Incident",
    maintenance: "Maintenance",
    maintenances: "Maintenance",
  };
  return mapping[value.toLowerCase()] ?? (value as ManifestKind);
}
