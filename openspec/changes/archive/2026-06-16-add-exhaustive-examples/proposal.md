## Why

The current `state/` directory contains only 4 bare-bones examples (1 monitor type out of 10, 1 page layout out of 4, 1 trigger type out of 4, 1 incident, and zero examples for AlertConfig and Maintenance). Users have no reference showing the full surface area of what kener-ctl can manage. Removing this sparse directory and replacing it with comprehensive, self-documenting examples gives new users a clear starting point and serves as a living reference for all resource kinds and their variants.

## What Changes

- **Remove** the existing `state/` directory and all its contents
- **Create** `examples/` as a reference directory (not the default `stateDir` — it's purely documentation)
- **Add** YAML manifest examples covering all 6 resource kinds:
  - **Monitors**: all 10 monitor types (API, PING, TCP, DNS, SSL, SQL, HEARTBEAT, GAMEDIG, GRPC, GROUP)
  - **Pages**: multiple layouts (default-list, default-grid, compact-list, compact-grid) including SEO configuration
  - **AlertTriggers**: all 4 types (WEBHOOK, DISCORD, SLACK, EMAIL)
  - **AlertConfigs**: all 3 alert types (STATUS, LATENCY, UPTIME)
  - **Incidents**: all 4 states (INVESTIGATING, IDENTIFIED, MONITORING, RESOLVED)
  - **Maintenances**: one-shot scheduled and recurring (with `rrule`)
- Examples form a coherent mini status page: monitor tags referenced by pages, triggers referenced by alert configs — demonstrating how resources wire together in practice

## Capabilities

### New Capabilities

- `reference-examples`: Comprehensive YAML manifest examples covering every resource kind and variant supported by the manifest schema, organized as a coherent reference directory.

### Modified Capabilities

None. This change adds documentation only — no code, schema, or behavior changes.

## Impact

- **Affected directories**: `state/` (removed), `examples/` (created)
- **No code changes** — purely adding example YAML files
- **`.gitignore`**: May need to ensure `state/` is listed (existing users shouldn't commit their actual state), but `examples/` should be committed
- **Existing CI**: No impact; CI doesn't reference `state/` for tests — test fixtures live in `tests/`

## Non-goals

- Not changing the default `stateDir` or config loading behavior
- Not modifying schemas or adding new resource kinds
- Not creating a live/test Kener instance to validate examples against
