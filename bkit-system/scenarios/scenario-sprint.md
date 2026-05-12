# Scenario — Sprint Management

> Sprint = meta-container that groups one or more features under shared scope/budget/timeline (v2.1.13 GA).

## When to Use Sprint vs PDCA

| Situation | Use |
|---|---|
| Single feature, isolated work | `/pdca pm/plan/design/do/check/act/qa/report/archive` |
| 2+ features sharing scope/budget/timeline | `/sprint init <id> --features f1,f2 --trust <L0-L4>` |
| Release milestone (Q2 launch, v2.x.y) | Sprint (groups features) + PDCA (per feature internally) |
| Multi-feature parallel batch (no shared scope) | `/pdca-batch` (independent parallel PDCA cycles) |

## Sprint Lifecycle Flow

```
prd ──► plan ──► design ──► do ──► iterate ──► qa ──► report ──► archived
 │       │       │           │        │          │        │           │
 │       │       │           │        │          │        │           └─ /sprint archive (terminal, forward-only)
 │       │       │           │        │          │        └────────────── /sprint report
 │       │       │           │        │          └─────────────────────── /sprint qa (S1 7-Layer dataFlow)
 │       │       │           │        └──────────────────────────────── /sprint iterate (max 5 if matchRate < 90%)
 │       │       │           └─────────────────────────────────────── /sprint phase --to do
 │       │       └─────────────────────────────────────────────── /sprint phase --to design
 │       └──────────────────────────────────────────────────── /sprint phase --to plan
 └────────────────────────────────────────────────────── /sprint init
```

Each phase emits to `.bkit/state/sprints/{id}.json` and Audit log (`ACTION_TYPES`: sprint_paused / sprint_resumed / master_plan_created / phase_transition).

## Quick Start

```bash
# 1. Initialize a sprint with 3 features
/sprint init my-launch \
  --name "Q2 Product Launch" \
  --features authentication,billing,onboarding \
  --trust L3

# 2. Auto-run to QA (Trust L3 stop boundary)
/sprint start my-launch

# 3. Monitor live status
/sprint status my-launch
# or: /sprint watch my-launch (live snapshot + triggers + 3 matrices)

# 4. Run 7-Layer dataFlow QA across all features
/sprint qa my-launch

# 5. Generate completion report with KPI
/sprint report my-launch

# 6. Archive (terminal state)
/sprint archive my-launch
```

## 4 Auto-Pause Triggers

The orchestrator pauses on any of these:

| Trigger | Condition | Common Cause |
|---|---|---|
| `QUALITY_GATE_FAIL` | M-series or S1 gate fails | matchRate < 90%, S1 dataFlow < 85%, M3 critical issues > 0 |
| `ITERATION_EXHAUSTED` | iterate phase reaches max 5 attempts | gap-detector stuck below threshold |
| `BUDGET_EXCEEDED` | token usage > sprint budget (default 1M) | Feature scope underestimated |
| `PHASE_TIMEOUT` | single phase exceeds timeout (default 4h) | Manual intervention required |

On pause: orchestrator emits audit event + sprint state preserved + user resumes via `/sprint resume <id>`.

## Trust Level Scope (`SPRINT_AUTORUN_SCOPE`)

| Level | stopAfter | Behavior |
|---|---|---|
| L0 Manual | prd | After PRD written, stop. User runs `/sprint phase` per transition. |
| L1 Guided | plan | After Plan written, stop. |
| L2 Semi-Auto | do | Auto-run through Plan → Design → Do; QA/Report manual. |
| L3 Auto | qa | Auto-run through QA; Report manual. |
| L4 Full-Auto | archived | Run all phases until any trigger fires. |

Trust Level mirrors PDCA automation control (`/control level <0-4>`).

## Sprint × PDCA Coexistence

Sprint and PDCA are **orthogonal** — both may track concurrently:

- Sprint = release-level meta-container (`docs/01-plan/features/{sprint}.master-plan.md`)
- PDCA = per-feature cycle (`docs/01-plan/features/{feature}.plan.md` + design + analysis + report)
- A feature's PDCA `pm → archive` 9-phase runs **inside** a Sprint phase (typically `do`)
- A sprint may contain N features, each with their own PDCA cycle
- Sprint terminal state is `archived` (forward-only, no rollback at sprint level — feature-level rollback via [[../skills/rollback/SKILL|rollback]] skill)

See `docs/06-guide/sprint-management.guide.md` for the Korean deep-dive and `docs/06-guide/sprint-migration.guide.md` for PDCA ↔ Sprint mapping.

## Real Working Example

The v2.1.13 documentation synchronization itself was driven as a Sprint:

```bash
/sprint init v2113-docs-sync \
  --name "v2.1.13 Documentation Synchronization & Self-Validation Sprint" \
  --features f0-baseline,f1-version-bump,f2-changelog,f3-readme,f4-readme-full,\
f5-customization,f6-bkit-system,f7-hooks-commands,f8-archive-cleanup,f9-real-use-validation \
  --trust L4
```

See [`docs/01-plan/features/v2113-docs-sync.master-plan.md`](../../docs/01-plan/features/v2113-docs-sync.master-plan.md) for the complete master plan and [`docs/04-report/features/v2113-docs-sync.report.md`](../../docs/04-report/features/v2113-docs-sync.report.md) for the final report with KPI + lessons learned.

## Related

- [[scenario-new-feature]] — Single-feature PDCA workflow
- [[scenario-qa]] — QA execution (per-feature vs sprint-level S1)
- [[scenario-write-code]] — Code writing inside a sprint do phase
