# Sprint Phases Reference

> 8-phase frozen enum + transition adjacency. Defined in
> `lib/application/sprint-lifecycle/phases.js` and immutable per ADR 0008.

## Frozen Phase Order

| Index | Phase | Purpose | Active gates (Master Plan §12.1) |
|:----:|-------|---------|---------------------------------|
| 0 | `prd` | Product requirements + Context Anchor | (none — document only) |
| 1 | `plan` | Requirements + Quality Gates + Risks | M8 |
| 2 | `design` | Codebase analysis + module spec + Test Plan | M4, M8 |
| 3 | `do` | Implementation | M1, M2, M3, M4, M5, M7 |
| 4 | `iterate` | matchRate 100% loop (max 5 cycles) | M1, M2, M3, M5, M7 |
| 5 | `qa` | 7-Layer dataFlowIntegrity verification | M1, M2, M3, M4, M5, M7, S1, S2 |
| 6 | `report` | KPI snapshot + lessons + carry items | M1..M10, S1, S2, S4 |
| 7 | `archived` | Terminal readonly state | (none) |

## Transition Adjacency

```
prd      -> [plan, archived]
plan     -> [design, archived]
design   -> [do, archived]
do       -> [iterate, qa, archived]
iterate  -> [qa, do, archived]
qa       -> [report, do, archived]
report   -> [archived]
archived -> []   // terminal
```

Use `lib/application/sprint-lifecycle`.canTransitionSprint to check legality.
The `{ ok, reason? }` shape matches the PDCA pattern (`lib/application/pdca-lifecycle/transitions.js`).

## Trust Level Scope

`lib/control/automation-controller`.SPRINT_AUTORUN_SCOPE defines where
`/sprint start` stops automatically. Levels L2/L3 require user approval to
cross the scope boundary; L4 runs through to `archived` without prompts.

## Quality Gate Mapping (Sprint S1-S4)

| Gate | Definition | Threshold | Where evaluated |
|------|-----------|-----------|-----------------|
| S1 | dataFlowIntegrity | 100 | qa phase via verify-data-flow.usecase |
| S2 | featureCompletion | 100 | qa + report (featureMap aggregation) |
| S3 | sprintVelocity | user-defined | report only |
| S4 | archiveReadiness | true | report (composite of M1+M3+S1+S2) |

## Auto-Pause Triggers (4 armed by default)

| Trigger | Condition | Severity |
|---------|-----------|----------|
| QUALITY_GATE_FAIL | M3 > 0 OR S1 < 100 | HIGH |
| ITERATION_EXHAUSTED | iter >= 5 AND matchRate < minAcceptable | HIGH |
| BUDGET_EXCEEDED | cumulativeTokens > config.budget | MEDIUM |
| PHASE_TIMEOUT | elapsed > config.phaseTimeoutHours | MEDIUM |

Triggers are evaluated by Sprint 2 auto-pause.js after every phase advance
and by Stop hook (Sprint 5 wiring deferred). Sprint 3 sprint-telemetry
adapter mirrors `SprintPaused` events to the audit log + opt-in OTEL.

## Phase Document Paths

Sprint 1 `sprintPhaseDocPath(id, phase)` returns:

| Phase | Relative path |
|-------|--------------|
| masterPlan | `docs/01-plan/features/{id}.master-plan.md` |
| prd | `docs/01-plan/features/{id}.prd.md` |
| plan | `docs/01-plan/features/{id}.plan.md` |
| design | `docs/02-design/features/{id}.design.md` |
| iterate | `docs/03-analysis/features/{id}.iterate.md` |
| qa | `docs/05-qa/features/{id}.qa-report.md` |
| report | `docs/04-report/features/{id}.report.md` |

## See Also

- `SKILL.md` — user-facing skill documentation
- `examples/` — end-to-end runnable scenarios
- `lib/application/sprint-lifecycle/` — phase enum + transition graph
- `lib/domain/sprint/` — entity + validators + events
- `lib/infra/sprint/` — state store + telemetry + doc scanner + matrix sync
