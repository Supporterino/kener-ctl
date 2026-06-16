## Context

The project currently has no comprehensive example manifests. The `state/` directory contains 4 sparse files that cover only a fraction of the resource kinds and variants supported by the manifest schemas (`src/manifest/schema.ts`). Users learning kener-ctl have no reference for the shape of Monitor typeData variants, Page layouts, AlertConfig types, or Maintenance manifests.

This change removes the sparse `state/` directory and replaces it with an `examples/` directory containing YAML manifests for every resource kind and variant. This is purely a documentation/add-files change — no code is modified.

## Goals / Non-Goals

**Goals:**
- Provide one example per resource variant (10 monitor types, 4 trigger types, 4 page layouts, 3 alert config types, 4 incident states, 2 maintenance variants)
- Form a coherent mini status page where example monitors, pages, triggers, and alert configs reference each other — showing real-world wiring
- Use placeholder values (`CHANGEME`, `example.com`) that make it obvious these are not real configs
- Organize files under resource-kind subdirectories for discoverability

**Non-Goals:**
- No validation of examples against a live Kener instance
- No generated README or prose documentation — the YAML files are self-documenting
- No change to `.gitignore` (the default `stateDir` is `./state`, not `./examples` — no conflict)

## Decisions

### Directory structure

```
examples/
├── monitors/          # 10 files, one per MonitorTypeEnum variant
├── pages/             # 3-4 files covering layouts + SEO
├── alert-triggers/    # 4 files, one per TriggerTypeEnum
├── alert-configs/     # 3 files, one per AlertTypeEnum
├── incidents/         # 4 files, one per IncidentStateEnum
└── maintenances/      # 2 files (scheduled + recurring)
```

**Rationale**: Flat-per-kind matches how `Bun.Glob` discovers manifests under each subdirectory. A single flat directory would be ambiguous (e.g., `status.yaml` — AlertConfig or Incident?).

### Coherent cross-referencing

Resources reference each other by their declared keys forming a realistic mini status page:

```
┌─────────────────────────────────────────────────────────────────┐
│                        alert-triggers/                           │
│  slack.yaml ─────────────────────────────────────────────┐      │
│  email.yaml ─────────┐                                   │      │
│                       │                                   │      │
│  alert-configs/       │   incidents/                      │      │
│  status.yaml ─────────┤   investigating.yaml              │      │
│    triggerNames:      │     affectedMonitors:             │      │
│      - ops-slack ◄────┤       - tag: api-example ◄───────┤      │
│      - ops-email ◄────┘                                    │      │
│    monitorTag: api-example ◄───────────────────────────────┤      │
│                                                             │      │
│  pages/                            monitors/                │      │
│  home.yaml                         api.yaml                 │      │
│    monitors:                         tag: api-example ◄─────┘      │
│      - api-example ◄────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

**Rationale**: Individual example files are useful but disconnected. A coherent set demonstrates how `triggerNames`, `monitorTag`, `monitors`, and `affectedMonitors` form a dependency graph — which is the essence of the reconciliation system.

### Placeholder conventions

- URLs: `https://api.example.com/health`, `https://hooks.slack.com/services/CHANGEME`
- Secrets/tokens: `CHANGEME`
- Hosts: `example.com`, `db.example.com`, `gameserver.example.com`
- Emails: `ops@example.com`

**Rationale**: Consistent placeholder patterns make it obvious which fields need user customization. Avoids any risk of committed secrets.

### File naming

Files are named by variant, not by resource identity. E.g. `slack.yaml` not `ops-slack.yaml`, `investigating.yaml` not `db-outage.yaml`.

**Rationale**: The directory name already scopes the resource kind; the filename scopes the variant. This makes the examples browsable as a catalog.

## Risks / Trade-offs

- **Coherent cross-referencing creates fragile examples**: If a monitor tag changes, pages/alert-configs/incidents that reference it must also change. → Mitigation: use stable, obvious tag names (`api-example`, `db-example`) and only cross-reference within `examples/`.
- **Examples may drift from schemas over time**: As the Kener API evolves, example fields may become stale. → Mitigation: not addressed in this change — this is a documentation maintenance concern, not a blocking risk.
