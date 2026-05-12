---
name: sprint
classification: workflow
classification-reason: Sprint orchestration independent of model capability evolution
deprecation-risk: none
effort: medium
description: |
  Sprint Management — generic sprint capability for ANY bkit user.
  15 sub-actions: init, start, status, watch, phase, iterate, qa, report, archive, list, feature, pause, resume, fork, help.
  Triggers: sprint, sprint start, sprint init, sprint status, sprint list,
  스프린트, 스프린트 시작, 스프린트 상태,
  スプリント, スプリント開始, スプリント状態,
  冲刺, 冲刺开始, 冲刺状态,
  sprint, iniciar sprint, estado sprint,
  sprint, demarrer sprint, statut sprint,
  Sprint, Sprint starten, Sprint Status,
  sprint, avviare sprint, stato sprint.
argument-hint: "[action] [name] [--trust L0-L4] [--from <phase>]"
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
agents:
  orchestrate: bkit:sprint-orchestrator
  plan: bkit:sprint-master-planner
  qa: bkit:sprint-qa-flow
  report: bkit:sprint-report-writer
imports: []
next-skill: null
pdca-phase: null
task-template: "[Sprint] {action} {name}"
---

# Sprint Skill — Generic Sprint Management for bkit Users

> Sprint = meta-container above bkit's PDCA 9-phase. A sprint groups one or
> more features under a shared scope, budget, and timeline. Each sprint runs
> its own 8-phase lifecycle: prd -> plan -> design -> do -> iterate -> qa
> -> report -> archived.

## Quick Start

```
/sprint init my-launch --name "Q2 Launch" --trust L3
/sprint start my-launch
```

The skill handler routes through `scripts/sprint-handler.js`, which composes
Sprint 3 adapters (state-store + telemetry + doc-scanner + matrix-sync)
into Sprint 2 use cases (start / advance / iterate / qa / report / archive).
Sprint 1 entities (createSprint / SprintEvents / typedefs) are produced
and consumed transparently along the way.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `init <id>` | Create a sprint with default config | `/sprint init my-launch` |
| `start <id>` | Run auto-run loop bounded by Trust Level scope | `/sprint start my-launch --trust L3` |
| `status <id>` | Show current sprint state from disk | `/sprint status my-launch` |
| `list` | Union of state-store entries and master-plan discoveries | `/sprint list` |
| `phase <id> --to <phase>` | Advance to a specific phase | `/sprint phase my-launch --to qa` |
| `iterate <id>` | Run matchRate-100 loop (max 5 cycles) | `/sprint iterate my-launch` |
| `qa <id> --feature <name>` | Run 7-Layer data-flow check on one feature | `/sprint qa my-launch --feature auth` |
| `report <id>` | Generate KPI + lessons + carry-items report | `/sprint report my-launch` |
| `archive <id>` | Move to terminal `archived` status | `/sprint archive my-launch` |
| `pause <id>` | Manually pause a running sprint | `/sprint pause my-launch` |
| `resume <id>` | Re-evaluate triggers and resume | `/sprint resume my-launch` |
| `watch <id>` | Live dashboard (Sprint 5 — current returns snapshot) | `/sprint watch my-launch` |
| `feature <id>` | Per-feature operations (Sprint 5) | `/sprint feature my-launch --feature auth` |
| `fork <id>` | Fork into a new sprint (Sprint 5) | `/sprint fork my-launch --new my-launch-v2` |
| `help` | Print sub-action help | `/sprint help` |

## Trust Level Scope (auto-run boundary)

| Level | Stop after | Manual | Notes |
|-------|------------|--------|-------|
| L0 | prd | true | Each phase requires user approval |
| L1 | prd | true (hint) | Hint mode but still manual |
| L2 | design | false | Plan -> Design auto, Do requires approval |
| L3 | report | false | Plan -> Report auto, Archive requires approval (default) |
| L4 | archived | false | Full auto including archive (Trust >= 85 recommended) |

## Auto-Pause Safety Pins

Four armed triggers can pause a running sprint:

- `QUALITY_GATE_FAIL`  — M3 > 0 OR S1 < 100
- `ITERATION_EXHAUSTED` — iter >= 5 AND matchRate < minAcceptable
- `BUDGET_EXCEEDED` — cumulativeTokens > config.budget
- `PHASE_TIMEOUT` — phase elapsed > config.phaseTimeoutHours

Pause writes an audit log entry and a `SprintPaused` event. Resume
re-evaluates the triggers and refuses if any are still firing.

## Cross-Sprint Architecture (Sprint 1+2+3+4)

```
USER COMMAND
   v
skills/sprint/SKILL.md (this file — frontmatter triggers in 8 languages)
   v
scripts/sprint-handler.js (English dispatcher)
   v
Sprint 3: lib/infra/sprint -> { stateStore, eventEmitter, docScanner, matrixSync }
   v
Sprint 2: lib/application/sprint-lifecycle -> startSprint / advancePhase / ...
   v
Sprint 1: lib/domain/sprint -> createSprint / SprintEvents / typedefs
   v
DISK: .bkit/state/sprints/<id>.json + .bkit/audit/<date>.jsonl
```

## Examples

See:
- `examples/basic-sprint.md`
- `examples/multi-feature-sprint.md`
- `examples/archive-and-carry.md`

## When NOT to Use

- Single-feature PDCA work — use `bkit:pdca` instead
- Starter level projects — sprint overhead exceeds value
- One-off bug fixes that do not warrant a master plan

## Related Skills and Agents

- `bkit:pdca` — single-feature PDCA cycle (foundation primitive)
- `bkit:control` — automation level (L0-L4) — surfaces SPRINT_AUTORUN_SCOPE
- `bkit:sprint-orchestrator` (agent) — full lifecycle coordinator
- `bkit:sprint-master-planner` (agent) — plan/design generation
- `bkit:sprint-qa-flow` (agent) — 7-Layer dataFlowIntegrity verifier
- `bkit:sprint-report-writer` (agent) — KPI + lessons + carry items
