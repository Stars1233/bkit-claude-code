# bkit Template Selection Guide

> Quick reference for choosing the right template for your task

---

## Template Selection Flowchart

```
What are you doing?
│
├─► Starting a multi-feature initiative (shared scope/budget)?  [v2.1.13]
│   └─► Use Sprint Templates
│       (Master Plan → PRD → Plan → Design → Do → Iterate → QA → Report)
│
├─► Starting a new feature?
│   │
│   ├─► Using 9-phase Pipeline? ──► Use Pipeline Templates
│   │   (Phase 1 → 2 → 3 → ... → 9)
│   │
│   └─► Using PDCA only? ──► Use PDCA Templates
│       (Plan → Design → Do → Check → Act)
│
├─► Analyzing implementation?
│   └─► analysis.template.md
│
├─► Writing completion report?
│   └─► report.template.md
│
└─► Setting up new project?
    └─► CLAUDE.template.md
```

---

## PDCA Templates (Core)

| Template | Phase | When to Use |
|----------|-------|-------------|
| **plan.template.md** | Plan | Starting a new feature, defining requirements |
| **design.template.md** | Design | Technical design for Dynamic level projects |
| **design-starter.template.md** | Design | Simple projects (static sites, portfolios) |
| **design-enterprise.template.md** | Design | Complex systems (microservices, k8s) |
| **analysis.template.md** | Check | Gap analysis, code review, performance check |
| **report.template.md** | Act | Completion report, retrospective |

### Level-Based Design Template Selection

```
Project Complexity?
│
├─► Simple (HTML/CSS, static site) ──► design-starter.template.md
│
├─► Medium (Web app, SaaS MVP) ──► design.template.md (default)
│
└─► Complex (Enterprise, MSA) ──► design-enterprise.template.md
```

---

## Pipeline Templates (9-Phase)

| Phase | Template | Purpose |
|-------|----------|---------|
| 1 | `pipeline/phase-1-schema.template.md` | Terminology & data model |
| 2 | `pipeline/phase-2-convention.template.md` | Coding rules & architecture |
| 3 | `pipeline/phase-3-mockup.template.md` | UI prototypes |
| 4 | `pipeline/phase-4-api.template.md` | API specification |
| 5 | `pipeline/phase-5-design-system.template.md` | Component library |
| 6 | `pipeline/phase-6-ui.template.md` | UI implementation |
| 7 | `pipeline/phase-7-seo-security.template.md` | SEO & security |
| 8 | `pipeline/phase-8-review.template.md` | Architecture/convention review |
| 9 | `pipeline/phase-9-deployment.template.md` | Deployment config |

### Pipeline vs PDCA

| Scenario | Use Pipeline | Use PDCA |
|----------|:------------:|:--------:|
| New project from scratch | ✅ | ⚠️ |
| Adding feature to existing project | ⚠️ | ✅ |
| Quick fix / bug fix | ❌ | ⚠️ |
| Enterprise-grade development | ✅ | ✅ |

---

## Sprint Templates (8-Phase Container, v2.1.13)

| Phase | Template | Purpose |
|-------|----------|---------|
| Master Plan | `sprint/master-plan.template.md` | Sprint scope + features + dependency graph + Trust scope |
| PRD | `sprint/prd.template.md` | Sprint-level product requirements (multi-feature) |
| Plan | `sprint/plan.template.md` | Sprint plan synthesizing per-feature plans |
| Design | `sprint/design.template.md` | Sprint-level technical design |
| Iterate | `sprint/iterate.template.md` | Iteration log + iterateHistory (until matchRate ≥ 90 or ITERATION_EXHAUSTED) |
| QA | `sprint/qa.template.md` | 7-Layer dataFlowIntegrity (S1) report |
| Report | `sprint/report.template.md` | Sprint completion + KPI + carry items |

### Sprint vs PDCA vs Pipeline

| Scenario | Sprint | PDCA | Pipeline |
|----------|:------:|:----:|:--------:|
| Multi-feature initiative sharing scope/budget/timeline | ✅ | ⚠️ | ⚠️ |
| Single feature lifecycle | ⚠️ | ✅ | ⚠️ |
| New project from scratch (full 9 phases) | ⚠️ | ⚠️ | ✅ |
| Quick fix / bug fix | ❌ | ⚠️ | ❌ |

Sprint can host PDCA cycles inside it (per-feature) and can wrap Pipeline phases when the initiative spans multiple phases.

---

## Other Templates

| Template | Purpose |
|----------|---------|
| **CLAUDE.template.md** | Generate CLAUDE.md for new projects |
| **iteration-report.template.md** | Evaluator-Optimizer iteration report |
| **_INDEX.template.md** | Folder document index |

---

## Template Features Comparison

### Clean Architecture Support

| Template | Layer Definition | Dependency Rules | Import Order |
|----------|:----------------:|:----------------:|:------------:|
| design.template.md | ✅ | ✅ | ✅ |
| design-starter.template.md | ❌ | ❌ | ❌ |
| design-enterprise.template.md | ✅ | ✅ | ✅ |
| phase-2-convention.template.md | ✅ | ✅ | ✅ |
| phase-8-review.template.md | ✅ | ✅ | ✅ |

### Convention Compliance Support

| Template | Naming | Folder Structure | Env Variables |
|----------|:------:|:----------------:|:-------------:|
| design.template.md | ✅ | ✅ | ✅ |
| analysis.template.md | ✅ | ✅ | ✅ |
| phase-2-convention.template.md | ✅ | ✅ | ✅ |
| phase-8-review.template.md | ✅ | ✅ | ✅ |

---

## Quick Commands

```bash
# PDCA Commands (per-feature)
/pdca plan {feature}      # Create plan document
/pdca design {feature}    # Create design document
/pdca analyze {feature}   # Run gap analysis
/pdca report {feature}    # Create completion report

# Pipeline Commands (9-phase)
/pipeline-start           # Start 9-phase pipeline
/pipeline-status          # Check current phase
/pipeline-next            # Go to next phase

# Sprint Commands (multi-feature, v2.1.13)
/sprint init {id} --name <name>                     # Initialize sprint
/sprint master-plan {id} --features=f1,f2,f3        # Generate master plan
/sprint start {id}                                  # Begin 8-phase lifecycle
/sprint phase {id} --to {prd|plan|design|do|iterate|qa|report|archived}
/sprint qa {id}                                     # 7-Layer dataFlowIntegrity
/sprint report {id}                                 # Aggregate KPI + carry items
/sprint archive {id}                                # Escape hatch (gate-free)

# Project Setup
/setup-claude-code        # Generate CLAUDE.md
/init-starter             # Initialize Starter level project
/init-dynamic             # Initialize Dynamic level project
/init-enterprise          # Initialize Enterprise level project
```

---

## Cross-Reference Guide

### PDCA ↔ Pipeline Integration

When using both PDCA and Pipeline:

1. **Plan Phase**: Reference Phase 1 (Schema) and Phase 2 (Convention) outputs
2. **Design Phase**: Reference Phase 3 (Mockup) and Phase 4 (API) outputs
3. **Check Phase**: Use Phase 8 (Review) checklist for verification

### Document Location Convention

```
docs/
├── 01-plan/
│   ├── features/          # PDCA Plan + Sprint master-plan (v2.1.13)
│   │   ├── {feature}.plan.md           # PDCA per-feature
│   │   └── {projectId}.master-plan.md  # Sprint master plan
│   ├── schema.md          # Pipeline Phase 1
│   └── conventions.md     # Pipeline Phase 2
├── 02-design/
│   ├── features/          # PDCA Design + Sprint design documents
│   ├── mockup/            # Pipeline Phase 3
│   └── api/               # Pipeline Phase 4
├── 03-analysis/           # PDCA Check + Sprint iterate logs
├── 04-report/             # PDCA Act + Sprint completion reports
└── 05-qa/                 # Sprint 7-Layer S1 qa-reports (v2.1.13)

.bkit/state/
├── sprint-status.json     # Sprint entries (v2.1.13)
├── master-plans/          # Sprint master-plan JSON state (v2.1.13)
│   └── {projectId}.json
├── pdca-status.json       # PDCA features
├── trust-profile.json     # Trust L0-L4 + SPRINT_AUTORUN_SCOPE
└── memory.json            # bkit memory
```

---

## Variable Substitution Convention (v1.1.0)

bkit uses **single-brace, lowercase, snake_case** placeholders for runtime substitution. The substitution engine (`lib/core/paths.js`, `lib/pdca/session-title.js`) only recognizes this form — any other style is emitted verbatim into generated documents.

### Canonical Variables

| Variable | Meaning | Source |
|----------|---------|--------|
| `{feature}` | Feature name (kebab-case) | User arg to `/pdca plan <feature>` |
| `{date}` | ISO date (YYYY-MM-DD) | Generation timestamp |
| `{level}` | Project level: `Starter` / `Dynamic` / `Enterprise` | `lib/pdca/level.js` detectLevel() |
| `{phase}` | PDCA phase: `plan` / `design` / `do` / `check` / `act` / `report` / `qa` | PDCA state machine |
| `{author}` | Author name | `bkit.config.json` or git user |
| `{version}` | Document version | Template-specific |
| `{project}` | Project slug | `bkit.config.json` |

### Handlebars Blocks (template-only, not substituted by bkit)

`{{#if X}}...{{/if}}` and `{{#X}}...{{/X}}` are Handlebars-style conditional / iteration blocks used in `CLAUDE.template.md` and `iteration-report.template.md`. These are consumed by downstream template engines (not bkit's simple substitution). Do NOT mix with `{var}` runtime variables.

### Migration Note

v2.1.8 Round 4 audit (2026-04-17) found 6 templates using `{{var}}` double-brace and `{UPPER_CASE}` casing that bkit's substitution engine cannot process. All have been normalized to `{lower_snake}`. If you add a new variable, follow the canonical form or it will silently leak into output.

---

**Version**: 1.1.0
**Last Updated**: 2026-04-17
