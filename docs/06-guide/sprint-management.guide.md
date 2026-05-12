# Sprint Management User Guide (v2.1.13)

> **Language**: English (formerly Korean — translated per user direction 2026-05-12)
> **bkit version**: v2.1.13
> **Last updated**: 2026-05-12
> **Related**: [Migration Guide](./sprint-migration.guide.md) · [Master Plan (archived)](../archive/2026-05/01-plan/features/sprint-management.master-plan.md)

---

## 1. What Is Sprint Management?

### 1.1 Definition

A **Sprint** is a meta-container that groups one or more features under a **shared scope, budget, and timeline**. Each sprint follows an **8-phase lifecycle** and runs autonomously according to the user-defined **Trust Level**.

### 1.2 Relationship to PDCA

| Aspect | PDCA (existing) | Sprint Management (new) |
|---|---|---|
| Unit | Single feature | 1+ features bundled together |
| Phases | 9 (`pm` / `plan` / `design` / `do` / `check` / `act` / `qa` / `report` / `archive`) | 8 (`prd` / `plan` / `design` / `do` / `iterate` / `qa` / `report` / `archived`) |
| Purpose | Per-feature PDCA cycle | Sprint-level budget + time-box |
| Auto-run | `/pdca` commands | `/sprint <action>` + Trust Level Scope |
| Interop | ✅ Coexist (orthogonal storage) | ✅ Coexist |

**Core principle**: Sprint Management does **not replace** PDCA. The two systems persist state in separate files under `.bkit/state/`, and a single feature can belong to both a PDCA cycle and a Sprint container simultaneously (orthogonal coexistence).

### 1.3 When Should You Use Sprint?

- ✅ **Grouping multiple features into one quarter/sprint timeline** — use Sprint Management
- ✅ **Running a PDCA cycle on a single feature** — use existing `/pdca`
- ✅ **Both at once** — track individual feature PDCA cycles inside a sprint container

---

## 2. The 16 Sub-actions

### 2.1 Action Matrix

| Action | Command | Purpose | Inputs |
|---|---|---|---|
| `init` | `/sprint init <id>` | Create a sprint | `--name <name> --trust L0-L4 --features <a,b>` |
| `start` | `/sprint start <id>` | Start sprint execution | `--trust L0-L4` (optional) |
| `status` | `/sprint status <id>` | Query current state | — |
| `list` | `/sprint list` | List all sprints | — |
| `phase` | `/sprint phase <id>` | Advance to the next phase | `--to <phase>` |
| `iterate` | `/sprint iterate <id>` | Run the matchRate improvement loop | — |
| `qa` | `/sprint qa <id>` | Run the QA phase | `--feature <name>` (optional) |
| `report` | `/sprint report <id>` | Generate the completion report | — |
| `archive` | `/sprint archive <id>` | Move to terminal archived state | — |
| `pause` | `/sprint pause <id>` | Stop auto-run | — |
| `resume` | `/sprint resume <id>` | Resume auto-run | — |
| `fork` | `/sprint fork <id>` | Fork into a new sprint | `--new <newId>` |
| `feature` | `/sprint feature <id>` | Manage features | `--action list/add/remove --feature <name>` |
| `watch` | `/sprint watch <id>` | Live status + triggers + matrix snapshot | — |
| `help` | `/sprint help` | Help text | — |
| `master-plan` | `/sprint master-plan <project>` | Auto-generate a multi-sprint Master Plan (sprint-master-planner agent isolated spawn or dry-run template, v2.1.13 S2-UX) | `--name <name> --features <a,b,c> --trust L0-L4` (optional), `--force` (optional) |

### 2.2 Examples

```bash
# Create + start + status
/sprint init q2-launch --name "Q2 Launch" --trust L3
/sprint start q2-launch
/sprint status q2-launch

# Manual phase transition
/sprint phase q2-launch --to design

# Add/remove features
/sprint feature q2-launch --action add --feature payment-flow
/sprint feature q2-launch --action remove --feature legacy-module

# Pause + resume
/sprint pause q2-launch
/sprint resume q2-launch

# Fork (carry only incomplete features to a new sprint)
/sprint fork q2-launch --new q3-carry

# Live monitor
/sprint watch q2-launch
```

---

## 3. The 8-Phase Lifecycle

```
prd → plan → design → do → iterate → qa → report → archived
```

### 3.1 Purpose of Each Phase

| Phase | Output | bkit doc location |
|---|---|---|
| `prd` | Product Requirements Document | `docs/01-plan/features/<id>.prd.md` |
| `plan` | Implementation Plan | `docs/01-plan/features/<id>.plan.md` |
| `design` | Detailed Design | `docs/02-design/features/<id>.design.md` |
| `do` | Implementation (code) | `lib/`, `scripts/`, `skills/`, `agents/` |
| `iterate` | Iterate Analysis (matchRate ≥ threshold) | `docs/03-analysis/features/<id>.iterate.md` |
| `qa` | QA Report | `docs/05-qa/features/<id>.qa-report.md` |
| `report` | Completion Report | `docs/04-report/features/<id>.report.md` |
| `archived` | (preserved) | Sprint metadata only |

### 3.2 Transition Rules

- Sequential only: `prd → plan` is valid, `prd → design` is not (except for `pause` → archival, which is allowed from anywhere)
- `iterate → qa` requires the matchRate threshold (default 90, overridable in sprint config) to be met
- `archived` is terminal — no further transitions
- Each transition is gated by `canTransitionSprint(currentPhase, toPhase) → { ok, reason? }`

---

## 4. The 4 Auto-Pause Triggers

During auto-run, if any of the following 4 triggers fires, the sprint **pauses automatically**:

| Trigger | Condition | Recommended response |
|---|---|---|
| `QUALITY_GATE_FAIL` | An M1–M10 / S1–S4 quality gate fails | Review the gate output and revise the plan |
| `ITERATION_EXHAUSTED` | The iterate phase loops 5 times and still misses the matchRate threshold | Revisit the design or adjust the threshold |
| `BUDGET_EXCEEDED` | Token / time budget exceeded | Split the sprint or fork |
| `PHASE_TIMEOUT` | A single phase exceeds `budget.phaseTimeoutMs` | Advance the phase manually |

**Configuring armed triggers**: at sprint init, set the `sprint.autoPause.armed` array to choose which triggers are active (default: all 4 armed).

Resume after a trigger fires with `/sprint resume <id>` — but fixing the root cause is strongly recommended first.

---

## 5. Trust Level Scope (L0–L4)

`SPRINT_AUTORUN_SCOPE` has 5 levels — each level defines `stopAfter` (how far auto-run progresses before stopping):

| Level | stopAfter | Behavior | Recommended scenario |
|---|---|---|---|
| **L0** | `plan` | Manual after plan | First sprint; user wants to confirm every step |
| **L1** | `design` | Manual after design | Review design before entering `do` |
| **L2** | `do` | Manual after do | Review implementation before iterate |
| **L3** | `qa` | Semi-auto, manual at qa | Day-to-day production sprint |
| **L4** | `archived` | Full-auto until any trigger fires | High-trust automated sprint |

**Principles**:

- L0 is the most conservative — every phase transition requires user approval
- L4 advances automatically but halts the moment any of the 4 auto-pause triggers fires
- L4 is only enabled when the user explicitly passes `--trust L4` (default is L0)

`SPRINT_AUTORUN_SCOPE` in `lib/control/automation-controller.js` and the inline scope in `lib/application/sprint-lifecycle/start-sprint.usecase.js` are kept in **1:1 mirror** (Sprint 4 invariant; L3 contract test SC-07 enforces this).

---

## 6. 7-Layer Data Flow QA (S1)

The Sprint QA phase verifies each feature's data flow across **7 hops** (S1 quality gate):

```
H1 UI → H2 Client → H3 API → H4 Validation → H5 DB → H6 Response → H7 Client → UI
```

### 6.1 Meaning of Each Hop

| Hop | What is verified |
|---|---|
| H1 | UI input capture |
| H2 | Client-side validation + serialization |
| H3 | API endpoint reachability |
| H4 | Server-side validation + authentication |
| H5 | DB persistence |
| H6 | API response serialization |
| H7 | Client deserialize + UI reflection |

### 6.2 dataFlowValidator Injection

Starting in Sprint 5, `lib/infra/sprint/data-flow-validator.adapter.js` provides 3-tier validation:

- **Tier 1 (no-op)**: no dependency injected (default for dev environments)
- **Tier 2 (static)**: static heuristic based on the `sprint.dataFlow` matrix
- **Tier 3 (live)**: real browser probing via the chrome-qa MCP

S1 `100%` PASS = all hops PASS.

---

## 7. Cross-feature / Cross-sprint Integration

### 7.1 Multi-feature Operation

```bash
/sprint init q2-launch --name "Q2" --features auth,payment,reporting
/sprint feature q2-launch --action add --feature analytics
/sprint feature q2-launch --action list
# → [auth, payment, reporting, analytics]
```

Each feature has its own phase/lifecycle state inside `featureMap[featureName]` in the sprint state, and the sprint phase is **independent** of the feature phases.

### 7.2 Sprint Fork and Carry Items

```bash
/sprint fork q2-launch --new q3-carry
# → carry items: features still in 'do' or 'iterate' phase
```

Only incomplete features (still in `do` / `iterate`) are auto-identified and carried to the new sprint. Completed features (qa / report / archived) stay in the original sprint.

### 7.3 Sprint 1+2+3+4 Architecture — Cross-Layer Integration

| Layer | Directory | Relation to this guide |
|---|---|---|
| Domain (Sprint 1) | `lib/domain/sprint/` | Sprint entity + frozen enum + validators |
| Application (Sprint 2) | `lib/application/sprint-lifecycle/` | 8 use cases + DI deps interface |
| Infrastructure (Sprint 3+5) | `lib/infra/sprint/` | 7 adapters (4 baseline + 3 production scaffold) |
| Presentation (Sprint 4) | `skills/sprint/`, `agents/sprint-*.md`, `templates/sprint/`, `scripts/sprint-handler.js` | User surface (16 actions including the S2-UX `master-plan`) |

The L3 Contract test (`tests/contract/v2113-sprint-contracts.test.js`) enforces the integrity of this 4-layer integration as a CI gate.

---

## 8. Worked Examples

### Example 1 — Single-feature sprint (intro)

```bash
# 1. Single-feature sprint (Trust L0 = manual confirm at every step)
/sprint init blog-redesign --name "Blog Redesign" --features blog-page --trust L0

# 2. Start → auto-runs up to plan phase, then waits for user approval
/sprint start blog-redesign

# 3. User reviews plan and advances to design
/sprint phase blog-redesign --to design

# 4. After all phases complete, archive
/sprint archive blog-redesign
```

### Example 2 — Multi-feature parallel (intermediate)

```bash
# 1. Three features bundled (Trust L3 = auto up to qa, only qa is manual)
/sprint init q2-release --name "Q2 Release" --features auth,payment,reports --trust L3

# 2. Start → auto-runs up through iterate phase
/sprint start q2-release

# 3. iterate phase begins matchRate measurement
#    (ITERATION_EXHAUSTED is one of the 4 auto-pause triggers that may fire)

# 4. Once iterate matchRate hits 100% → auto-pauses at qa entry
/sprint status q2-release
# → phase: qa, status: paused (manual approval needed)

# 5. QA → report → archive
/sprint qa q2-release
/sprint report q2-release
/sprint archive q2-release
```

### Example 3 — Fork + carry items (advanced)

```bash
# 1. Q2 sprint is mid-run; budget exceeded → auto-paused
/sprint status q2-release
# → status: paused, trigger: BUDGET_EXCEEDED

# 2. Keep completed features in q2-release, carry incomplete to q3
/sprint fork q2-release --new q3-carry
# → carry items: payment (phase: do), reports (phase: iterate)
# → auth is phase: archived, so it is NOT carried

# 3. Continue work in q3-carry
/sprint start q3-carry --trust L4
```

---

## 9. Master Plan Generator + Context Sizer Workflow (v2.1.13)

This section explains the integrated workflow of S2-UX (Master Plan Generator) + S3-UX (Context Sizer) + S4-UX (Integration). Satisfies **user-explicit requirements 4-1 (auto Master Plan generation) + 4-2 (context-window-aware sprint sizing)**.

### 9.1 Workflow Overview

```
User
   |
   | /sprint master-plan q2-launch --name "Q2 Launch" --features auth,payment,reports
   v
SKILL.md bkit:sprint dispatcher
   |
   v
scripts/sprint-handler.js handleMasterPlan
   |
   v
lib/application/sprint-lifecycle/master-plan.usecase.js generateMasterPlan
   |
   | (S4-UX) when deps.contextSizer is injected, sprint split runs automatically
   v
lib/application/sprint-lifecycle/context-sizer.js recommendSprintSplit
   |
   | returns sprints[] array (each sprint ≤ 75K effective tokens)
   v
master-plan.usecase.js fills plan.sprints
   |
   | atomic write (state-first + rollback on markdown fail)
   v
.bkit/state/master-plans/<projectId>.json   (state)
docs/01-plan/features/<projectId>.master-plan.md   (markdown)
.bkit/audit/<date>.jsonl   (master_plan_created entry)
```

### 9.2 One-Command Usage

Simplest invocation:

```bash
/sprint master-plan q2-launch --name "Q2 Launch" --features auth,payment,reports
```

CLI mode (headless test / debugging):

```bash
node scripts/sprint-handler.js master-plan q2-launch --name="Q2 Launch" --features=auth,payment,reports
```

Flags:

- `--name <string>` (required): user-friendly project name
- `--features <a,b,c>` (optional): comma-separated feature list (or array)
- `--trust L0~L4` (optional): Trust Level (default L3)
- `--force` (optional): overwrite existing master plan
- `--duration <string>` (optional): estimated duration (default `'TBD'`)

### 9.3 Context Sizer Configuration (`bkit.config.json` `sprint.contextSizing`)

The `sprint.contextSizing` section of `bkit.config.json` tunes the sprint-split algorithm (9 fields):

```json
{
  "sprint": {
    "contextSizing": {
      "enabled": true,
      "schemaVersion": "1.0",
      "maxTokensPerSprint": 100000,
      "safetyMargin": 0.25,
      "tokensPerLOC": 6.67,
      "baselineLOC": 5000,
      "minSprints": 1,
      "maxSprints": 12,
      "dependencyAware": true
    }
  }
}
```

| Field | Default | Meaning |
|---|---|---|
| `enabled` | true | Whether context-sizing is active |
| `maxTokensPerSprint` | 100000 | Hard cap per sprint (single-session safety limit) |
| `safetyMargin` | 0.25 | Safety margin (effective budget = max × (1 − margin)) |
| `tokensPerLOC` | 6.67 | Token-per-LOC coefficient (inverse of the Master Plan §1.5 heuristic of 1.5K LOC / 10K tokens) |
| `baselineLOC` | 5000 | Default LOC per feature (mid-sized, conservative) |
| `minSprints` | 1 | Minimum number of sprints |
| `maxSprints` | 12 | Maximum number of sprints (exceeding returns an error) |
| `dependencyAware` | true | Enable topological-sort-based dependency-aware splitting |

**Effective budget**: 100000 × (1 − 0.25) = **75000 tokens / sprint**. Each sprint is bounded by ≤ 75K tokens — satisfies user-explicit 4-2 (single-session safety guarantee).

### 9.4 Dependency-Aware Split

When feature dependencies are specified, sprints are automatically ordered topologically:

```javascript
const lifecycle = require('./lib/application/sprint-lifecycle');
const result = lifecycle.recommendSprintSplit({
  projectId: 'q2-launch',
  features: ['auth', 'payment', 'reports'],
  dependencyGraph: {
    payment: ['auth'],           // payment depends on auth
    reports: ['auth', 'payment'] // reports depends on auth + payment
  },
}, lifecycle.CONTEXT_SIZING_DEFAULTS);
```

**Algorithm**: Kahn's algorithm (in-degree based topological sort).
**Cycle detection**: if the graph has a cycle, returns `{ ok: false, error: 'dependency_cycle', cycle: [...] }`.
**Cross-sprint dep edges**: each sprint's `dependsOn` array is automatically populated (e.g., `['q2-launch-s1']`).

### 9.5 Dry-Run vs Agent-Backed Generation

| Mode | Trigger | Result |
|---|---|---|
| **Dry-run** | `deps.agentSpawner === undefined` (default) | Substitutes `templates/sprint/master-plan.template.md`. Produces minimal valid markdown. `plan.sprints = []` by default (S2-UX); auto-filled when `deps.contextSizer` is injected (S4-UX). |
| **Agent-backed** | `deps.agentSpawner = ({ subagent_type, prompt }) => Promise<{ output }>` | Isolated-spawns `bkit:sprint-master-planner` agent → returns markdown content |

**Use dry-run** for unit tests, initial template generation, or to avoid agent invocation cost.
**Use agent-backed** for production master plans where codebase analysis + tone consistency are required.

### 9.6 Idempotency + `--force` Overwrite

- **Default (idempotent)**: a second call with the same `projectId` returns `{ ok: true, alreadyExists: true, plan: <existing> }`. State and markdown unchanged.
- **`--force` flag**: overwrites both the state JSON and the markdown. Audit entry sets `details.forceOverwrite: true`.
- **Single ACTION_TYPE**: both cases use the `'master_plan_created'` audit action (S2-UX PM-S2G resolution).

### 9.7 Common Pitfalls and Troubleshooting

| Pitfall | Symptom | Resolution |
|---|---|---|
| `projectId` minimum length | `error: 'invalid_input', errors: ['projectId must match kebab-case']` | Minimum 3 chars (e.g., `'p1'` rejected, `'p-1'` or `'pi1'` accepted) |
| Vague feature string | `tokenEst` inaccurate (default 33350) | Pass `--locHint` or `locHints: { feature: 8000 }` (planned for v2.1.14) |
| 50+ features → `maxSprints` exceeded | `error: 'exceeds_maxSprints'` | Increase `maxSprints` in `bkit.config.json` or split features |
| Dependency cycle | `error: 'dependency_cycle', cycle: [...]` | Review the graph — self-deps are rejected |
| Markdown write fails, state lingers | State JSON present but no markdown | State-first rollback pattern — state is auto-deleted on markdown failure; retry to recover |
| Backward-compat broken | Existing caller depends on `sprints:[]` | S4-UX auto-wiring is OFF by default — only active when `deps.contextSizer` is explicitly injected |

---

## Appendix A — Directory Structure

```
.bkit/state/
├── sprint-status.json          # Sprint Management state (new, runtime-created)
├── pdca-status.json            # Existing PDCA state (orthogonal)
├── trust-profile.json          # Trust Level profile
└── memory.json                 # bkit memory state

lib/
├── domain/sprint/                  # Sprint 1 — Domain Foundation
├── application/sprint-lifecycle/   # Sprint 2 — Application Core
└── infra/sprint/                   # Sprint 3+5 — Infrastructure
    ├── sprint-state-store.adapter.js   # Sprint 3
    ├── sprint-telemetry.adapter.js     # Sprint 3
    ├── sprint-doc-scanner.adapter.js   # Sprint 3
    ├── matrix-sync.adapter.js          # Sprint 3
    ├── gap-detector.adapter.js         # Sprint 5 (new)
    ├── auto-fixer.adapter.js           # Sprint 5 (new)
    └── data-flow-validator.adapter.js  # Sprint 5 (new)

skills/sprint/                  # Sprint 4 — Presentation (skill)
agents/sprint-*.md              # Sprint 4 — 4 agents
templates/sprint/               # Sprint 4 — 7 templates
scripts/sprint-handler.js       # Sprint 4 — 16-action dispatcher (incl. S2-UX `master-plan`)

tests/contract/                 # Sprint 5 — L3 Contract test (tracked, CI gate)
└── v2113-sprint-contracts.test.js
```

## Appendix B — Related Documents

- [Migration Guide](./sprint-migration.guide.md) — PDCA → Sprint migration
- [Master Plan (archived)](../archive/2026-05/01-plan/features/sprint-management.master-plan.md) — full sprint plan
- [Sprint 5 PRD (archived)](../archive/2026-05/01-plan/features/v2113-sprint-5-quality-docs.prd.md) — Sprint 5 requirements
- [`skills/sprint/SKILL.md`](../../skills/sprint/SKILL.md) — primary skill reference

---

**Document version**: v1.1 (English, translated from v1.0 Korean — 2026-05-12)
**Contact**: bkit core team via GitHub issues
