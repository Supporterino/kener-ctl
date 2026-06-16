## 1. Cleanup

- [x] 1.1 Remove the existing `state/` directory and all its contents

## 2. Directory scaffolding

- [x] 2.1 Create `examples/` with subdirectories: `monitors/`, `pages/`, `alert-triggers/`, `alert-configs/`, `incidents/`, `maintenances/`

## 3. Monitor examples

- [x] 3.1 Create `examples/monitors/api.yaml` — API type with headers, body, eval
- [x] 3.2 Create `examples/monitors/ping.yaml` — PING type with host and timeout
- [x] 3.3 Create `examples/monitors/tcp.yaml` — TCP type with host and port
- [x] 3.4 Create `examples/monitors/dns.yaml` — DNS type with record type and optional dnsServer
- [x] 3.5 Create `examples/monitors/ssl.yaml` — SSL certificate expiry check
- [x] 3.6 Create `examples/monitors/sql.yaml` — SQL type with username, password, database, query
- [x] 3.7 Create `examples/monitors/heartbeat.yaml` — HEARTBEAT type with interval
- [x] 3.8 Create `examples/monitors/gamedig.yaml` — GAMEDIG type with host, port, game type
- [x] 3.9 Create `examples/monitors/grpc.yaml` — GRPC type with host, port, service name
- [x] 3.10 Create `examples/monitors/group.yaml` — GROUP type referencing example monitor tags

## 4. Page examples

- [x] 4.1 Create `examples/pages/home.yaml` — default-list layout with monitor refs and markdown content
- [x] 4.2 Create `examples/pages/grid.yaml` — default-grid layout
- [x] 4.3 Create `examples/pages/seo.yaml` — SEO configuration with metaTitle and metaDescription

## 5. Alert trigger examples

- [x] 5.1 Create `examples/alert-triggers/webhook.yaml` — WEBHOOK type
- [x] 5.2 Create `examples/alert-triggers/discord.yaml` — DISCORD type with discordChannelId
- [x] 5.3 Create `examples/alert-triggers/slack.yaml` — SLACK type with webhookUrl
- [x] 5.4 Create `examples/alert-triggers/email.yaml` — EMAIL type with emailAddresses

## 6. Alert config examples

- [x] 6.1 Create `examples/alert-configs/status.yaml` — STATUS type, references a monitor tag and trigger names
- [x] 6.2 Create `examples/alert-configs/latency.yaml` — LATENCY type with numeric alertValue
- [x] 6.3 Create `examples/alert-configs/uptime.yaml` — UPTIME type with percentage alertValue

## 7. Incident examples

- [x] 7.1 Create `examples/incidents/investigating.yaml` — state: INVESTIGATING, references example monitors
- [x] 7.2 Create `examples/incidents/identified.yaml` — state: IDENTIFIED with updates showing progression
- [x] 7.3 Create `examples/incidents/monitoring.yaml` — state: MONITORING with multiple updates
- [x] 7.4 Create `examples/incidents/resolved.yaml` — state: RESOLVED with full update chain

## 8. Maintenance examples

- [x] 8.1 Create `examples/maintenances/scheduled.yaml` — one-time window with startDatetime and endDatetime
- [x] 8.2 Create `examples/maintenances/recurring.yaml` — recurring window with rrule

## 9. Validation

- [x] 9.1 Run `bun run src/cli/index.ts validate --state-dir examples/` to confirm all examples pass manifest schema validation
- [x] 9.2 Spot-check cross-references: monitor tags, trigger names, and page paths are consistent across all example files
