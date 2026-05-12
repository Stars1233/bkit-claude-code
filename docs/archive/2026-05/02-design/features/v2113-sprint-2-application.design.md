# Sprint 2 Design — v2.1.13 Sprint Management Application Core (Auto-Run Engine)

> **Sprint ID**: `v2113-sprint-2-application`
> **Phase**: Design (3/7)
> **Date**: 2026-05-12
> **PRD**: `docs/01-plan/features/v2113-sprint-2-application.prd.md`
> **Plan**: `docs/01-plan/features/v2113-sprint-2-application.plan.md`
> **Master Plan**: v1.1 §11.2 SPRINT_AUTORUN_SCOPE / §11.3 AUTO_PAUSE_TRIGGERS / §12.1 ACTIVE_GATES_BY_PHASE
> **ADRs**: 0005 (Application Pilot) / 0007 (Meta Container) / 0008 (Phase Enum) / **0009** (Auto-Run + Trust + Auto-Pause)
> **Sprint 1 base**: commit `a7009a5` (16 domain files, 87 TCs PASS)

---

## 0. Context Anchor (PRD §0 + Plan §0 일치 — 보존)

| Key | Value |
|-----|-------|
| **WHY** | Sprint Management product core 실체화 (8 use cases + barrel 확장 — ADR 0009 auto-run engine 코드화) |
| **WHO** | bkit 사용자 (1차) + Sprint 3 작업자 (deps inject) + Sprint 4 skill handler + audit-logger + bkit CI |
| **RISK** | Auto-run runaway / Trust scope mismatch / PDCA invariant 깨짐 / Sprint 1 import 누락 / ENH-292 미적용 / Quality Gate 평가 누락 / Phase atomicity / Resume 복잡도 / JSDoc 누락 |
| **SUCCESS** | E2E mock 자율 진행 / 4 auto-pause triggers 발화 검증 / Trust L0~L4 5 scopes / matchRate 100% loop / PDCA invariant 보존 / 8 use cases Sprint 1 import / Quality Gates evaluator 정확 / ENH-292 sequential 명시 / L2 TC 60+ 100% PASS / Sprint 3 deps inject 사전 검증 |
| **SCOPE** | In: 8 modules in `lib/application/sprint-lifecycle/` + barrel 확장 (9 → ~28 exports). Out: state persistence (Sprint 3) / telemetry (Sprint 3) / skills+agents (Sprint 4 — 8개국어 트리거 + 영어 코드 사용자 명시) / `/control` 통합 (Sprint 4) / L3+ tests (Sprint 5) |

---

## 1. 코드베이스 깊이 분석 (필수 — Sprint 1/Master Plan/PDCA 패턴 정합)

### 1.1 Sprint 1 Domain 영구화 자산 (commit a7009a5)

본 Sprint 2가 의존할 Sprint 1 exports — **불변 contract**.

#### 1.1.1 `lib/application/sprint-lifecycle/phases.js` (Sprint 1, 81 LOC)

```javascript
// lib/application/sprint-lifecycle/phases.js:18-28 (Sprint 1)
const SPRINT_PHASES = Object.freeze({
  PRD: 'prd', PLAN: 'plan', DESIGN: 'design', DO: 'do',
  ITERATE: 'iterate', QA: 'qa', REPORT: 'report', ARCHIVED: 'archived',
});

const SPRINT_PHASE_ORDER = Object.freeze([
  'prd', 'plan', 'design', 'do', 'iterate', 'qa', 'report', 'archived',
]);

const SPRINT_PHASE_SET = new Set(SPRINT_PHASE_ORDER);

function isValidSprintPhase(phase) { /* string + Set membership */ }
function sprintPhaseIndex(phase)   { /* index in PHASE_ORDER, -1 unknown */ }
function nextSprintPhase(phase)    { /* PHASE_ORDER[idx+1] || null */ }
```

**Sprint 2 사용**: phase string literal 회피 — `SPRINT_PHASES.PLAN` 등 enum reference 일관.

#### 1.1.2 `lib/application/sprint-lifecycle/transitions.js` (Sprint 1, 73 LOC)

```javascript
// lib/application/sprint-lifecycle/transitions.js:29-38 (Sprint 1)
const SPRINT_TRANSITIONS = Object.freeze({
  [SPRINT_PHASES.PRD]:      Object.freeze([SPRINT_PHASES.PLAN, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.PLAN]:     Object.freeze([SPRINT_PHASES.DESIGN, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.DESIGN]:   Object.freeze([SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.DO]:       Object.freeze([SPRINT_PHASES.ITERATE, SPRINT_PHASES.QA, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.ITERATE]:  Object.freeze([SPRINT_PHASES.QA, SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.QA]:       Object.freeze([SPRINT_PHASES.REPORT, SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.REPORT]:   Object.freeze([SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.ARCHIVED]: Object.freeze([]),
});

// lib/application/sprint-lifecycle/transitions.js:48-55 (Sprint 1)
function canTransitionSprint(from, to) {
  if (!isValidSprintPhase(from)) return { ok: false, reason: 'invalid_from_phase' };
  if (!isValidSprintPhase(to))   return { ok: false, reason: 'invalid_to_phase' };
  if (from === to)               return { ok: true };
  const allowed = SPRINT_TRANSITIONS[from] || [];
  if (allowed.includes(to))      return { ok: true };
  return { ok: false, reason: 'transition_not_allowed' };
}
```

**Sprint 2 사용**: `advance-phase.usecase.js` 첫 step에서 호출. `{ ok, reason }` shape 일관 (PDCA 정합).

#### 1.1.3 `lib/domain/sprint/entity.js` (Sprint 1, 285 LOC) — Schema v1.1

핵심 field (Sprint 2 use case 사용 위치):

| Field | Type | Sprint 2 사용 위치 |
|-------|------|------------------|
| `id` | string | 모든 use case (sprintId key) |
| `name` | string | start-sprint + generate-report |
| `phase` | string | advance-phase (current), 모든 use case (currentPhase check) |
| `status` | `'active'\|'paused'\|'completed'\|'archived'` | pauseSprint / resumeSprint / archiveSprint |
| `context` | SprintContext | generate-report |
| `features` | string[] | verify-data-flow (feature iteration) |
| `config.budget` | number | auto-pause BUDGET_EXCEEDED |
| `config.phaseTimeoutHours` | number | auto-pause PHASE_TIMEOUT |
| `config.maxIterations` | number | iterate-sprint loop guard |
| `config.matchRateTarget` | number (100) | iterate-sprint break condition |
| `config.matchRateMinAcceptable` | number (90) | iterate-sprint blocked flag |
| `autoRun.scope` | string\|null | advance-phase Trust scope check |
| `autoRun.trustLevelAtStart` | string ('L2') | start-sprint scope 계산 |
| `autoRun.lastAutoAdvanceAt` | string\|null | advance-phase update |
| `autoPause.armed` | string[] (4 default) | auto-pause filter (오직 armed triggers만 fire) |
| `autoPause.lastTrigger` | string\|null | pauseSprint update |
| `autoPause.pauseHistory` | Array | pauseSprint append |
| **`phaseHistory`** | Array<{phase,enteredAt,exitedAt,durationMs}> | advance-phase append + auto-pause PHASE_TIMEOUT eval |
| **`iterateHistory`** ★ | Array<{iteration,matchRate,fixedTaskIds,durationMs}> | iterate-sprint append + auto-pause ITERATION_EXHAUSTED eval |
| `featureMap` | Object | verify-data-flow update + generate-report aggregate |
| **`qualityGates.M1_matchRate`** | `{current,threshold,passed}` | quality-gates evaluateGate |
| **`qualityGates.M3_criticalIssueCount`** | 동상 | quality-gates + auto-pause QUALITY_GATE_FAIL |
| **`qualityGates.S1_dataFlowIntegrity`** | 동상 | quality-gates + auto-pause QUALITY_GATE_FAIL |
| **`qualityGates.S2_featureCompletion`** | 동상 | quality-gates (report) |
| **`qualityGates.S4_archiveReadiness`** | 동상 | quality-gates + archive-sprint |
| `kpi.matchRate` | number\|null | iterate-sprint final / auto-pause ITERATION_EXHAUSTED |
| `kpi.cumulativeTokens` | number | auto-pause BUDGET_EXCEEDED |
| `kpi.cumulativeIterations` | number | iterate-sprint update |
| `kpi.featuresCompleted` / `featuresTotal` / `featureCompletionRate` | number | generate-report + archive-sprint |
| `archivedAt` | string\|null | archive-sprint |

**핵심 명시 (Master Plan §11.3 일치)**:
- Field 이름 정확: `iterateHistory` (NOT `iterationHistory`)
- Quality gate field 이름: `M1_matchRate` (snake-case suffix 포함)
- 4 auto-pause trigger 키 정확: `QUALITY_GATE_FAIL`, `ITERATION_EXHAUSTED`, `BUDGET_EXCEEDED`, `PHASE_TIMEOUT`

#### 1.1.4 `lib/domain/sprint/events.js` (Sprint 1, 137 LOC)

```javascript
// lib/domain/sprint/events.js:41-115 (Sprint 1)
const SprintEvents = Object.freeze({
  SprintCreated:      (payload) => ({ type, timestamp: ISO, payload: {sprintId, name, phase} }),
  SprintPhaseChanged: (payload) => ({ type, timestamp: ISO, payload: {sprintId, fromPhase, toPhase, reason} }),
  SprintArchived:     (payload) => ({ type, timestamp: ISO, payload: {sprintId, archivedAt, reason, kpiSnapshot} }),
  SprintPaused:       (payload) => ({ type, timestamp: ISO, payload: {sprintId, trigger, severity, message} }),
  SprintResumed:      (payload) => ({ type, timestamp: ISO, payload: {sprintId, pausedAt, resumedAt, durationMs} }),
});
```

**Sprint 2 emission point 매트릭스 (5)**:

| Event | Use case | 시점 |
|-------|---------|------|
| SprintCreated | start-sprint | createSprint 직후 |
| SprintPhaseChanged | advance-phase | phaseHistory append 직후 |
| SprintArchived | archive-sprint | status 'archived' 전환 직후 |
| SprintPaused | auto-pause.pauseSprint | trigger fire 후 status 'paused' 전환 |
| SprintResumed | auto-pause.resumeSprint | trigger resolve 후 status 'active' 전환 |

### 1.2 PDCA Application Pilot 패턴 (ADR 0005)

PDCA 패턴 정합 reference (변경 금지, 본 Sprint 2 import 0건):

```javascript
// lib/application/pdca-lifecycle/transitions.js:48-55 (PDCA)
function canTransition(from, to) {
  // 동일 shape: { ok: boolean, reason?: string }
}
```

Sprint 2 use case의 `advance-phase.usecase.js` 가 동일 shape 반환 — `if (!result.ok)` 패턴 일관.

### 1.3 Master Plan §11.2 SPRINT_AUTORUN_SCOPE (참조)

```javascript
// docs/01-plan/features/sprint-management.master-plan.md:1309-1316
const SPRINT_AUTORUN_SCOPE = Object.freeze({
  L0: { lastAutoPhase: null,       stopAfter: 'init',      manual: true  },
  L1: { lastAutoPhase: null,       stopAfter: 'init',      manual: true, hint: true },
  L2: { lastAutoPhase: 'design',   stopAfter: 'design',    manual: false },
  L3: { lastAutoPhase: 'report',   stopAfter: 'report',    manual: false }, // default 권장
  L4: { lastAutoPhase: 'archived', stopAfter: 'archived',  manual: false },
});
```

**Sprint 2 처리 결정**: SPRINT_AUTORUN_SCOPE 정의는 본 Sprint 2의 `start-sprint.usecase.js` 내부 **로컬 상수**로 인라인 (lib/control 으로 옮기는 작업은 Sprint 4에 위임). `start-sprint`가 sprint 생성 시 `sprint.autoRun.scope` 필드에 `{stopAfter, requireApproval}` 형태로 저장 → `advance-phase`가 매 호출 시 검사.

### 1.4 Master Plan §11.3 AUTO_PAUSE_TRIGGERS (참조)

본 Sprint 2 `auto-pause.js`의 source of truth. Master Plan §11.3 정의 그대로 코드화:

| Trigger | Condition | Severity |
|---------|----------|---------|
| QUALITY_GATE_FAIL | `M3.current > 0` OR `S1.current < 100` | HIGH |
| ITERATION_EXHAUSTED | `iterateHistory.length >= 5` AND `kpi.matchRate < 90` | HIGH |
| BUDGET_EXCEEDED | `kpi.cumulativeTokens > config.budget` | MEDIUM |
| PHASE_TIMEOUT | `Date.now() - phaseHistory[-1].enteredAt > phaseTimeoutHours*3600*1000` | MEDIUM |

### 1.5 Master Plan §12.1 ACTIVE_GATES_BY_PHASE (참조)

```
| Gate | PRD | Plan | Design | Do | Iterate | QA | Report |
| M1   | -   | -    | -      | ✓  | ★       | ✓  | ✓     |
| M2   | -   | -    | -      | ✓  | ✓       | ✓  | ✓     |
| M3   | -   | -    | -      | ✓  | ✓       | ✓  | ✓     |
| M4   | -   | -    | ✓      | ✓  | -       | ✓  | ✓     |
| M5   | -   | -    | -      | ✓  | ✓       | ✓  | ✓     |
| M7   | -   | -    | -      | ✓  | ✓       | ✓  | ✓     |
| M8   | -   | ✓    | ✓      | -  | -       | -  | ✓     |
| M10  | -   | -    | -      | -  | -       | -  | ✓     |
| S1   | -   | -    | -      | -  | -       | ★  | ✓     |
| S2   | -   | -    | -      | -  | -       | ✓  | ★     |
| S4   | -   | -    | -      | -  | -       | -  | ★     |
```

★ = phase 진행 필수 gate (Plan §X에서 단순화한 매트릭스의 정확한 source).

**Sprint 2 `quality-gates.js` 매트릭스 (Master Plan §12.1 정확 일치)**:

```javascript
const ACTIVE_GATES_BY_PHASE = Object.freeze({
  prd:      Object.freeze([]),
  plan:     Object.freeze(['M8']),
  design:   Object.freeze(['M4', 'M8']),
  do:       Object.freeze(['M1', 'M2', 'M3', 'M4', 'M5', 'M7']),
  iterate:  Object.freeze(['M1', 'M2', 'M3', 'M5', 'M7']),
  qa:       Object.freeze(['M1', 'M2', 'M3', 'M4', 'M5', 'M7', 'S1', 'S2']),
  report:   Object.freeze(['M1', 'M2', 'M3', 'M4', 'M5', 'M7', 'M8', 'M10', 'S1', 'S2', 'S4']),
  archived: Object.freeze([]),
});
```

**Plan §1.1 R7과 차이점 reconciliation**: Plan §1.1 R7 ACTIVE_GATES_BY_PHASE 'qa' 가 `['M1', 'M3', 'S1']` 로 작성됐으나 **Master Plan §12.1 일치 우선** → Design은 위 매트릭스 (Master Plan 정확)를 source of truth로. Plan R7는 단순화된 표시. **본 Design 매트릭스 확정**.

### 1.6 Existing Lib Modules 참조 (변경 0건 invariant 보존)

| Module | Path | Sprint 2 영향 |
|--------|------|--------------|
| PDCA phases.js | `lib/application/pdca-lifecycle/phases.js` | **import 0건** (변경 0건 invariant) |
| PDCA transitions.js | `lib/application/pdca-lifecycle/transitions.js` | **import 0건** |
| PDCA index.js | `lib/application/pdca-lifecycle/index.js` | **import 0건** |
| automation-controller.js | `lib/control/automation-controller.js` | **변경 0건** (Sprint 4에서 SPRINT_AUTORUN_SCOPE 옮김) |
| trust-engine.js | `lib/control/trust-engine.js` | **변경 0건** |
| audit-logger.js | `lib/audit/audit-logger.js` | **변경 0건** (Sprint 3에서 SprintEvents 통합) |
| Sprint 1 entity.js | `lib/domain/sprint/entity.js` | **변경 0건** (Sprint 1 invariant) |
| Sprint 1 events.js | `lib/domain/sprint/events.js` | **변경 0건** |
| Sprint 1 validators.js | `lib/domain/sprint/validators.js` | **변경 0건** |

---

## 2. Module 의존 그래프 + Import 매트릭스

```
                  ┌─────────────────────┐
                  │  Sprint 1 Domain    │
                  │  (immutable, 16 files) │
                  └─────────┬───────────┘
                            │
                            ▼ (require)
    ┌───────────────────────────────────────────────┐
    │     lib/application/sprint-lifecycle/         │
    │                                                │
    │  Sprint 1: phases.js / transitions.js / index │
    │                                                │
    │  Sprint 2 (8 modules):                         │
    │    ┌─────────────────┐                         │
    │    │ quality-gates   │ ← (no own deps)         │
    │    └────────┬────────┘                         │
    │             │                                  │
    │    ┌────────▼────────┐  ┌───────────────────┐  │
    │    │ auto-pause      │  │ verify-data-flow  │  │
    │    └────────┬────────┘  └─────────┬─────────┘  │
    │             │                     │            │
    │    ┌────────▼────────┐  ┌─────────▼─────────┐  │
    │    │ iterate-sprint  │  │ advance-phase     │  │
    │    └────────┬────────┘  └─────────┬─────────┘  │
    │             │                     │            │
    │    ┌────────▼────────┐  ┌─────────▼─────────┐  │
    │    │ generate-report │  │ archive-sprint    │  │
    │    └────────┬────────┘  └─────────┬─────────┘  │
    │             └───────────┬─────────┘            │
    │                         │                      │
    │              ┌──────────▼──────────┐           │
    │              │  start-sprint       │           │
    │              │  (orchestrator)     │           │
    │              └──────────┬──────────┘           │
    │                         │                      │
    │              ┌──────────▼──────────┐           │
    │              │  index.js (barrel)  │           │
    │              └─────────────────────┘           │
    └────────────────────────────────────────────────┘
```

### 2.1 Import 매트릭스 (8 modules)

| Module | Sprint 1 imports | Own imports |
|--------|-----------------|-------------|
| `quality-gates.js` | `../../domain/sprint` (typedef only) | (none) |
| `auto-pause.js` | `../../domain/sprint` | `./quality-gates` |
| `verify-data-flow.usecase.js` | `../../domain/sprint` | (none) — SEVEN_LAYER_HOPS 인라인 |
| `iterate-sprint.usecase.js` | `../../domain/sprint` | (none) |
| `advance-phase.usecase.js` | `../../domain/sprint`, `./phases`, `./transitions` | `./quality-gates` |
| `generate-report.usecase.js` | `../../domain/sprint` | `./quality-gates` |
| `archive-sprint.usecase.js` | `../../domain/sprint`, `./transitions` | `./quality-gates` |
| `start-sprint.usecase.js` | `../../domain/sprint`, `./phases`, `./transitions` | `./advance-phase.usecase`, `./iterate-sprint.usecase`, `./verify-data-flow.usecase`, `./generate-report.usecase`, `./archive-sprint.usecase`, `./quality-gates`, `./auto-pause` |
| `index.js` | (transparent) | 8 new modules |

**Cycle 0건 확인**: leaf → orchestrator 단방향. start-sprint만 7개 동일 layer module 호출. 양방향 import 0건.

**Forbidden imports 0건 확인 (lib/application은 Application layer이므로 fs OK, 단 본 Sprint 2 use case는 pure)**: 8 modules 모두 fs/child_process/net/http/https/os 미사용. 모든 I/O는 `deps` 객체에 inject (Sprint 3에서 adapter).

---

## 3. Module 1: `quality-gates.js` 상세 spec

### 3.1 Header

```javascript
/**
 * quality-gates.js — Sprint Quality Gate evaluator (v2.1.13 Sprint 2).
 *
 * Evaluates M1-M10 + S1-S4 gates per phase against
 * Master Plan §12.1 ACTIVE_GATES_BY_PHASE matrix.
 *
 * Pure module — no I/O, no clock dependency.
 * Reads `sprint.qualityGates[gateKey].{current,threshold,passed}` shape.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-2-application.design.md §3
 * Master Plan Ref: docs/01-plan/features/sprint-management.master-plan.md §12.1
 * ADR Ref: 0009 (Quality Gates per phase + Sprint S1-S4)
 *
 * @module lib/application/sprint-lifecycle/quality-gates
 * @version 2.1.13
 * @since 2.1.13
 */
```

### 3.2 `ACTIVE_GATES_BY_PHASE` (frozen 8 keys)

Master Plan §12.1 정확 일치 (§1.5 참조).

### 3.3 `GATE_DEFINITIONS` (frozen 11 keys)

Gate key → field path + comparator + default threshold 매핑:

```javascript
const GATE_DEFINITIONS = Object.freeze({
  M1:  Object.freeze({ field: 'M1_matchRate',           op: '>=', defaultThreshold: 90  }),
  M2:  Object.freeze({ field: 'M2_codeQualityScore',    op: '>=', defaultThreshold: 80  }),
  M3:  Object.freeze({ field: 'M3_criticalIssueCount',  op: '<=', defaultThreshold: 0   }),
  M4:  Object.freeze({ field: 'M4_apiComplianceRate',   op: '>=', defaultThreshold: 95  }),
  M5:  Object.freeze({ field: 'M5_runtimeErrorRate',    op: '<=', defaultThreshold: 1   }),
  M7:  Object.freeze({ field: 'M7_conventionCompliance',op: '>=', defaultThreshold: 90  }),
  M8:  Object.freeze({ field: 'M8_designCompleteness',  op: '>=', defaultThreshold: 85  }),
  M10: Object.freeze({ field: 'M10_pdcaCycleTimeHours', op: '<=', defaultThreshold: 40  }),
  S1:  Object.freeze({ field: 'S1_dataFlowIntegrity',   op: '>=', defaultThreshold: 100 }),
  S2:  Object.freeze({ field: 'S2_featureCompletion',   op: '>=', defaultThreshold: 100 }),
  S4:  Object.freeze({ field: 'S4_archiveReadiness',    op: '===', defaultThreshold: true }),
});
```

**Note**: M6/M9 미포함 (Master Plan §12.1에서 phase별 ★ 없음 + 본 Sprint 2 scope에서 평가 deferred). S3 sprintVelocity user-defined로 deferred.

### 3.4 `evaluateGate(sprint, gateKey)` — pure

```javascript
/**
 * Evaluate a single gate against sprint state.
 *
 * @param {Sprint} sprint - immutable sprint (Sprint 1 entity)
 * @param {string} gateKey - one of GATE_DEFINITIONS keys ('M1'...)
 * @returns {{ current: number|boolean|null, threshold: number|boolean, passed: boolean, gateKey: string }}
 */
function evaluateGate(sprint, gateKey) {
  const def = GATE_DEFINITIONS[gateKey];
  if (!def) {
    return { gateKey, current: null, threshold: null, passed: false, reason: 'unknown_gate' };
  }
  const slot = sprint.qualityGates && sprint.qualityGates[def.field];
  if (!slot) {
    return { gateKey, current: null, threshold: def.defaultThreshold, passed: false, reason: 'gate_slot_missing' };
  }
  const current = slot.current;
  const threshold = (typeof slot.threshold !== 'undefined' && slot.threshold !== null)
    ? slot.threshold
    : def.defaultThreshold;
  if (current === null || typeof current === 'undefined') {
    return { gateKey, current: null, threshold, passed: false, reason: 'not_measured' };
  }
  let passed;
  switch (def.op) {
    case '>=':  passed = (typeof current === 'number') && current >= threshold; break;
    case '<=':  passed = (typeof current === 'number') && current <= threshold; break;
    case '===': passed = current === threshold; break;
    default:    passed = false;
  }
  return { gateKey, current, threshold, passed };
}
```

### 3.5 `evaluatePhase(sprint, phase)` — composite

```javascript
/**
 * Evaluate all active gates for a phase.
 *
 * @param {Sprint} sprint
 * @param {string} phase - one of SPRINT_PHASES values
 * @returns {{ allPassed: boolean, phase: string, results: Object<string, GateResult> }}
 */
function evaluatePhase(sprint, phase) {
  const active = ACTIVE_GATES_BY_PHASE[phase] || [];
  const results = {};
  let allPassed = true;
  for (const gateKey of active) {
    const r = evaluateGate(sprint, gateKey);
    results[gateKey] = r;
    if (!r.passed) allPassed = false;
  }
  return { allPassed, phase, results };
}
```

### 3.6 Exports
```javascript
module.exports = { evaluateGate, evaluatePhase, ACTIVE_GATES_BY_PHASE, GATE_DEFINITIONS };
```

---

## 4. Module 2: `auto-pause.js` 상세 spec

### 4.1 Header (생략, 동일 패턴)

### 4.2 `AUTO_PAUSE_TRIGGERS` (frozen 4 keys)

Master Plan §11.3 정확 일치. Trigger condition 함수는 pure (no I/O, env 주입 가능):

```javascript
const AUTO_PAUSE_TRIGGERS = Object.freeze({
  QUALITY_GATE_FAIL: Object.freeze({
    id: 'QUALITY_GATE_FAIL',
    severity: 'HIGH',
    /**
     * @param {Sprint} sprint
     * @returns {boolean}
     */
    check: (sprint) => {
      const g = sprint.qualityGates || {};
      const m3 = (g.M3_criticalIssueCount && g.M3_criticalIssueCount.current) || 0;
      const s1 = (g.S1_dataFlowIntegrity && g.S1_dataFlowIntegrity.current);
      if (m3 > 0) return true;
      if (s1 !== null && typeof s1 !== 'undefined' && s1 < 100) return true;
      return false;
    },
    message: (sprint) => {
      const g = sprint.qualityGates || {};
      const m3 = (g.M3_criticalIssueCount && g.M3_criticalIssueCount.current) || 0;
      const s1 = (g.S1_dataFlowIntegrity && g.S1_dataFlowIntegrity.current);
      return `Quality Gate fail: M3=${m3}, S1=${s1 === null ? '--' : s1 + '%'}`;
    },
    userActions: Object.freeze(['fix & resume', 'forward fix', 'abort sprint']),
  }),

  ITERATION_EXHAUSTED: Object.freeze({
    id: 'ITERATION_EXHAUSTED',
    severity: 'HIGH',
    check: (sprint) => {
      const iter = (sprint.iterateHistory || []).length;
      const maxIter = (sprint.config && sprint.config.maxIterations) || 5;
      const matchRate = (sprint.kpi && sprint.kpi.matchRate);
      const minAcceptable = (sprint.config && sprint.config.matchRateMinAcceptable) || 90;
      if (iter < maxIter) return false;
      return matchRate === null || matchRate < minAcceptable;
    },
    message: (sprint) => {
      const iter = (sprint.iterateHistory || []).length;
      const maxIter = (sprint.config && sprint.config.maxIterations) || 5;
      const mr = sprint.kpi && sprint.kpi.matchRate;
      return `Iteration ${iter}/${maxIter} exhausted, matchRate ${mr === null ? '--' : mr + '%'} < min acceptable`;
    },
    userActions: Object.freeze(['forward fix', 'carry to next sprint', 'abort']),
  }),

  BUDGET_EXCEEDED: Object.freeze({
    id: 'BUDGET_EXCEEDED',
    severity: 'MEDIUM',
    check: (sprint) => {
      const used = (sprint.kpi && sprint.kpi.cumulativeTokens) || 0;
      const budget = (sprint.config && sprint.config.budget) || 1_000_000;
      return used > budget;
    },
    message: (sprint) => {
      const used = (sprint.kpi && sprint.kpi.cumulativeTokens) || 0;
      const budget = (sprint.config && sprint.config.budget) || 1_000_000;
      return `Cumulative tokens ${used} > budget ${budget}`;
    },
    userActions: Object.freeze(['increase budget & resume', 'abort with partial report', 'archive as-is']),
  }),

  PHASE_TIMEOUT: Object.freeze({
    id: 'PHASE_TIMEOUT',
    severity: 'MEDIUM',
    /**
     * @param {Sprint} sprint
     * @param {{ now?: number }} env
     * @returns {boolean}
     */
    check: (sprint, env) => {
      const last = (sprint.phaseHistory || []).slice(-1)[0];
      if (!last || !last.enteredAt) return false;
      if (last.exitedAt) return false; // already exited
      const now = (env && typeof env.now === 'number') ? env.now : Date.now();
      const elapsedMs = now - new Date(last.enteredAt).getTime();
      const timeoutHrs = (sprint.config && sprint.config.phaseTimeoutHours) || 4;
      return elapsedMs > timeoutHrs * 3600 * 1000;
    },
    message: (sprint) => {
      const t = (sprint.config && sprint.config.phaseTimeoutHours) || 4;
      return `Phase ${sprint.phase} elapsed > ${t}h timeout`;
    },
    userActions: Object.freeze(['extend timeout & resume', 'force-advance phase', 'abort']),
  }),
});
```

### 4.3 `checkAutoPauseTriggers(sprint, env)` — pure evaluator

```javascript
/**
 * @typedef {Object} TriggerHit
 * @property {string} triggerId
 * @property {string} severity
 * @property {string} message
 * @property {string[]} userActions
 */

/**
 * Returns hits for currently-fired armed triggers.
 *
 * @param {Sprint} sprint
 * @param {{ now?: number }} [env]
 * @returns {TriggerHit[]}
 */
function checkAutoPauseTriggers(sprint, env) {
  const armed = (sprint.autoPause && Array.isArray(sprint.autoPause.armed))
    ? sprint.autoPause.armed
    : Object.keys(AUTO_PAUSE_TRIGGERS);
  const hits = [];
  for (const id of armed) {
    const trig = AUTO_PAUSE_TRIGGERS[id];
    if (!trig) continue;
    if (trig.check(sprint, env || {})) {
      hits.push({
        triggerId: id,
        severity: trig.severity,
        message: trig.message(sprint),
        userActions: [...trig.userActions],
      });
    }
  }
  return hits;
}
```

### 4.4 `pauseSprint(sprint, triggers, deps)` — state transition

```javascript
/**
 * @param {Sprint} sprint
 * @param {TriggerHit[]} triggers - must be non-empty (caller responsibility)
 * @param {{ eventEmitter?, clock? }} [deps]
 * @returns {{ ok: boolean, sprint: Sprint, pauseEvent: SprintEvent }}
 */
function pauseSprint(sprint, triggers, deps) {
  if (!triggers || triggers.length === 0) {
    return { ok: false, sprint, reason: 'no_triggers' };
  }
  const clock = (deps && deps.clock) || (() => new Date().toISOString());
  const pausedAt = clock();
  const primary = triggers[0];
  const updatedAutoPause = {
    ...sprint.autoPause,
    lastTrigger: primary.triggerId,
    pauseHistory: [
      ...sprint.autoPause.pauseHistory,
      {
        pausedAt,
        trigger: primary.triggerId,
        severity: primary.severity,
        message: primary.message,
        userActions: primary.userActions,
        siblings: triggers.slice(1).map(t => t.triggerId),
      },
    ],
  };
  const updated = cloneSprint(sprint, { status: 'paused', autoPause: updatedAutoPause });
  const pauseEvent = SprintEvents.SprintPaused({
    sprintId: sprint.id,
    trigger: primary.triggerId,
    severity: primary.severity,
    message: primary.message,
  });
  if (deps && deps.eventEmitter) deps.eventEmitter(pauseEvent);
  return { ok: true, sprint: updated, pauseEvent };
}
```

### 4.5 `resumeSprint(sprint, deps)` — gated resume

```javascript
/**
 * Re-evaluates triggers; if still fires, blocks resume with reason.
 *
 * @param {Sprint} sprint
 * @param {{ eventEmitter?, clock?, env? }} [deps]
 * @returns {{ ok: boolean, sprint?: Sprint, resumeEvent?: SprintEvent, blockedReason?: string, triggersStillFiring?: TriggerHit[] }}
 */
function resumeSprint(sprint, deps) {
  if (sprint.status !== 'paused') {
    return { ok: false, blockedReason: 'not_paused' };
  }
  const env = (deps && deps.env) || {};
  const stillFiring = checkAutoPauseTriggers(sprint, env);
  if (stillFiring.length > 0) {
    return { ok: false, blockedReason: 'trigger_not_resolved', triggersStillFiring: stillFiring };
  }
  const lastPause = (sprint.autoPause.pauseHistory || []).slice(-1)[0];
  const pausedAt = (lastPause && lastPause.pausedAt) || null;
  const clock = (deps && deps.clock) || (() => new Date().toISOString());
  const resumedAt = clock();
  const durationMs = pausedAt ? (new Date(resumedAt).getTime() - new Date(pausedAt).getTime()) : null;
  const updated = cloneSprint(sprint, { status: 'active' });
  const resumeEvent = SprintEvents.SprintResumed({
    sprintId: sprint.id,
    pausedAt: pausedAt || resumedAt,
    resumedAt,
    durationMs,
  });
  if (deps && deps.eventEmitter) deps.eventEmitter(resumeEvent);
  return { ok: true, sprint: updated, resumeEvent };
}
```

### 4.6 Exports
```javascript
module.exports = { AUTO_PAUSE_TRIGGERS, checkAutoPauseTriggers, pauseSprint, resumeSprint };
```

---

## 5. Module 3: `verify-data-flow.usecase.js` 상세 spec

### 5.1 `SEVEN_LAYER_HOPS` (frozen)

```javascript
const SEVEN_LAYER_HOPS = Object.freeze([
  Object.freeze({ id: 'H1', from: 'UI',         to: 'Client'     }),
  Object.freeze({ id: 'H2', from: 'Client',     to: 'API'        }),
  Object.freeze({ id: 'H3', from: 'API',        to: 'Validation' }),
  Object.freeze({ id: 'H4', from: 'Validation', to: 'DB'         }),
  Object.freeze({ id: 'H5', from: 'DB',         to: 'Response'   }),
  Object.freeze({ id: 'H6', from: 'Response',   to: 'Client'     }),
  Object.freeze({ id: 'H7', from: 'Client',     to: 'UI'         }),
]);
```

### 5.2 `verifyDataFlow(sprint, featureName, deps)` — sequential

```javascript
/**
 * @typedef {Object} HopResult
 * @property {string} hopId
 * @property {string} from
 * @property {string} to
 * @property {boolean} passed
 * @property {string} [evidence]
 * @property {string} [reason]
 */

/**
 * 7-Layer data flow verification — sequential (ENH-292).
 *
 * @param {Sprint} sprint
 * @param {string} featureName - feature key under sprint.featureMap
 * @param {{ dataFlowValidator?: function, eventEmitter?, clock? }} [deps]
 * @returns {Promise<{ ok: boolean, featureName: string, s1Score: number, hopResults: HopResult[] }>}
 */
async function verifyDataFlow(sprint, featureName, deps) {
  const validator = (deps && deps.dataFlowValidator) || defaultValidator;
  const hopResults = [];
  // ENH-292: sequential dispatch — one hop at a time (no Promise.all)
  for (const hop of SEVEN_LAYER_HOPS) {
    const r = await validator(featureName, hop.id, sprint);
    hopResults.push({
      hopId: hop.id,
      from: hop.from,
      to: hop.to,
      passed: !!(r && r.passed),
      evidence: r && r.evidence ? String(r.evidence) : null,
      reason: r && r.reason ? String(r.reason) : null,
    });
  }
  const passed = hopResults.filter(r => r.passed).length;
  const s1Score = (passed / 7) * 100;
  return { ok: true, featureName, s1Score, hopResults };
}

function defaultValidator(_feature, _hopId, _sprint) {
  // default: not implemented (Sprint 4 adapter provides real impl)
  return Promise.resolve({ passed: false, reason: 'no_validator_injected' });
}
```

### 5.3 Exports
```javascript
module.exports = { verifyDataFlow, SEVEN_LAYER_HOPS };
```

---

## 6. Module 4: `iterate-sprint.usecase.js` 상세 spec

### 6.1 `iterateSprint(sprint, deps)` — sequential gap → fix → re-measure loop

```javascript
/**
 * Iterate until matchRate >= target (100) or maxIterations exhausted.
 * Sequential (ENH-292): gap → fix → re-measure, never parallel.
 *
 * @param {Sprint} sprint - in 'iterate' phase
 * @param {{ gapDetector?, autoFixer?, eventEmitter?, clock? }} [deps]
 * @returns {Promise<{ ok: boolean, sprint: Sprint, finalMatchRate: number, iterations: number, blocked: boolean, history: SprintIterationHistory[] }>}
 */
async function iterateSprint(sprint, deps) {
  const target = (sprint.config && sprint.config.matchRateTarget) || 100;
  const maxIter = (sprint.config && sprint.config.maxIterations) || 5;
  const minOk = (sprint.config && sprint.config.matchRateMinAcceptable) || 90;
  const gapDetector = (deps && deps.gapDetector) || defaultGapDetector;
  const autoFixer = (deps && deps.autoFixer) || defaultAutoFixer;
  const clock = (deps && deps.clock) || (() => Date.now());

  let working = sprint;
  let measurement = await gapDetector(working);
  let currentMatchRate = (measurement && typeof measurement.matchRate === 'number')
    ? measurement.matchRate : 0;

  const historyAppend = [...(working.iterateHistory || [])];
  let iter = 0;

  while (currentMatchRate < target && iter < maxIter) {
    const iterStart = clock();
    const fix = await autoFixer(working, (measurement && measurement.gaps) || []);
    const fixedTaskIds = (fix && Array.isArray(fix.fixedTaskIds)) ? fix.fixedTaskIds : [];
    const remeasure = await gapDetector(working);
    const newRate = (remeasure && typeof remeasure.matchRate === 'number') ? remeasure.matchRate : currentMatchRate;
    iter += 1;
    historyAppend.push({
      iteration: iter,
      matchRate: newRate,
      fixedTaskIds,
      durationMs: clock() - iterStart,
    });
    measurement = remeasure;
    currentMatchRate = newRate;
  }

  const blocked = currentMatchRate < minOk && iter >= maxIter;
  const updated = cloneSprint(working, {
    iterateHistory: historyAppend,
    kpi: { ...working.kpi, matchRate: currentMatchRate, cumulativeIterations: (working.kpi.cumulativeIterations || 0) + iter },
    qualityGates: {
      ...working.qualityGates,
      M1_matchRate: { current: currentMatchRate, threshold: working.qualityGates.M1_matchRate.threshold, passed: currentMatchRate >= working.qualityGates.M1_matchRate.threshold },
    },
  });
  return { ok: true, sprint: updated, finalMatchRate: currentMatchRate, iterations: iter, blocked, history: historyAppend };
}

function defaultGapDetector(_sprint) { return Promise.resolve({ matchRate: 100, gaps: [] }); }
function defaultAutoFixer(_sprint, _gaps) { return Promise.resolve({ fixedTaskIds: [] }); }
```

### 6.2 Exports
```javascript
module.exports = { iterateSprint };
```

---

## 7. Module 5: `advance-phase.usecase.js` 상세 spec

### 7.1 `advancePhase(sprint, toPhase, deps)` — 5-step sequential

```javascript
/**
 * @param {Sprint} sprint - current
 * @param {string} toPhase
 * @param {{ gateEvaluator?, eventEmitter?, clock?, allowGateOverride? }} [deps]
 * @returns {Promise<{ ok: boolean, sprint?: Sprint, event?: SprintEvent, gateResults?: Object, reason?: string }>}
 */
async function advancePhase(sprint, toPhase, deps) {
  // Step 1: transition legality
  const transRes = canTransitionSprint(sprint.phase, toPhase);
  if (!transRes.ok) return { ok: false, reason: transRes.reason };

  // Step 2: Trust Level scope check
  const scope = sprint.autoRun && sprint.autoRun.scope;
  if (scope && scope.stopAfter && scope.requireApproval) {
    const fromIdx = sprintPhaseIndex(sprint.phase);
    const toIdx = sprintPhaseIndex(toPhase);
    const stopIdx = sprintPhaseIndex(scope.stopAfter);
    if (toIdx > stopIdx) {
      return { ok: false, reason: 'requires_user_approval', stopAfter: scope.stopAfter };
    }
  }

  // Step 3: Active gates evaluation (current phase exit gates)
  const evaluator = (deps && deps.gateEvaluator) || evaluatePhase;
  const gateResults = evaluator(sprint, sprint.phase);
  if (!gateResults.allPassed && !(deps && deps.allowGateOverride)) {
    return { ok: false, reason: 'gate_fail', gateResults };
  }

  // Step 4: phaseHistory append
  const clock = (deps && deps.clock) || (() => new Date().toISOString());
  const now = clock();
  const updatedPhaseHistory = updatePhaseHistory(sprint.phaseHistory, sprint.phase, now);

  // Step 5: cloneSprint with new phase + emit
  const updated = cloneSprint(sprint, {
    phase: toPhase,
    phaseHistory: [...updatedPhaseHistory, { phase: toPhase, enteredAt: now, exitedAt: null, durationMs: null }],
    autoRun: { ...sprint.autoRun, lastAutoAdvanceAt: now },
  });
  const event = SprintEvents.SprintPhaseChanged({
    sprintId: sprint.id, fromPhase: sprint.phase, toPhase, reason: 'auto_advance',
  });
  if (deps && deps.eventEmitter) deps.eventEmitter(event);
  return { ok: true, sprint: updated, event, gateResults };
}

function updatePhaseHistory(history, currentPhase, exitedAt) {
  const arr = Array.isArray(history) ? history : [];
  if (arr.length === 0) return [];
  const last = arr[arr.length - 1];
  if (last.phase === currentPhase && !last.exitedAt) {
    const durationMs = new Date(exitedAt).getTime() - new Date(last.enteredAt).getTime();
    return [...arr.slice(0, -1), { ...last, exitedAt, durationMs }];
  }
  return arr;
}
```

### 7.2 Exports
```javascript
module.exports = { advancePhase };
```

---

## 8. Module 6: `generate-report.usecase.js` 상세 spec

### 8.1 `generateReport(sprint, deps)` — pure aggregation

```javascript
/**
 * @param {Sprint} sprint
 * @param {{ docPathResolver?, fileWriter?, kpiCalculator?, clock? }} [deps]
 * @returns {Promise<{ ok: boolean, reportContent: string, kpiSnapshot: SprintKPI, carryItems: Array, reportPath: string|null }>}
 */
async function generateReport(sprint, deps) {
  const resolvePath = (deps && deps.docPathResolver) || sprintPhaseDocPath;
  const writer = (deps && deps.fileWriter) || null;
  const kpiCalc = (deps && deps.kpiCalculator) || defaultKpiCalculator;
  const clock = (deps && deps.clock) || (() => new Date().toISOString());

  const kpiSnapshot = kpiCalc(sprint);
  const carryItems = identifyCarryItems(sprint);
  const lessonLearned = extractLessons(sprint);
  const reportContent = renderReport(sprint, kpiSnapshot, carryItems, lessonLearned, clock());
  const reportPath = resolvePath(sprint.id, 'report');
  if (writer && reportPath) {
    await writer(reportPath, reportContent);
  }
  return { ok: true, reportContent, kpiSnapshot, carryItems, reportPath };
}

function defaultKpiCalculator(sprint) {
  // Aggregate from sprint.phaseHistory + iterateHistory + featureMap
  const featuresTotal = Object.keys(sprint.featureMap || {}).length || sprint.features.length || 0;
  const featuresCompleted = Object.values(sprint.featureMap || {}).filter(f => f.matchRate === 100 && f.qa === 'pass').length;
  const featureCompletionRate = featuresTotal ? (featuresCompleted / featuresTotal) * 100 : 0;
  const dataFlowIntegrity = computeAvgS1(sprint);
  return {
    ...sprint.kpi,
    featuresTotal,
    featuresCompleted,
    featureCompletionRate,
    dataFlowIntegrity,
    matchRate: sprint.kpi.matchRate,
    cumulativeIterations: sprint.kpi.cumulativeIterations,
  };
}

function computeAvgS1(sprint) {
  const entries = Object.values(sprint.featureMap || {});
  if (entries.length === 0) return null;
  const s1Values = entries.map(e => (e.qa === 'pass' && typeof e.s1Score === 'number') ? e.s1Score : 0);
  return s1Values.reduce((a, b) => a + b, 0) / entries.length;
}

function identifyCarryItems(sprint) {
  return Object.entries(sprint.featureMap || {})
    .filter(([_, f]) => (typeof f.matchRate === 'number' && f.matchRate < 100) || (typeof f.s1Score === 'number' && f.s1Score < 100))
    .map(([name, f]) => ({
      featureName: name,
      reason: f.matchRate < 100 ? `matchRate ${f.matchRate}` : `s1Score ${f.s1Score}`,
      currentPhase: f.pdcaPhase,
    }));
}

function extractLessons(sprint) {
  const lessons = [];
  if ((sprint.iterateHistory || []).length > 0) {
    const failed = sprint.iterateHistory.filter(i => i.matchRate !== null && i.matchRate < 90);
    if (failed.length > 0) lessons.push(`${failed.length} iteration cycles below 90% — review gap-detector accuracy`);
  }
  if ((sprint.autoPause.pauseHistory || []).length > 0) {
    const triggers = sprint.autoPause.pauseHistory.map(p => p.trigger);
    lessons.push(`Paused ${triggers.length} time(s): ${triggers.join(', ')}`);
  }
  return lessons;
}

function renderReport(sprint, kpi, carryItems, lessons, generatedAt) {
  // Markdown rendering — implementation details in Phase 4 Do
  return `# Sprint Report — ${sprint.name}\n\n... (TBD in Do) ...\n`;
}
```

### 8.2 Exports
```javascript
module.exports = { generateReport };
```

---

## 9. Module 7: `archive-sprint.usecase.js` 상세 spec

### 9.1 `archiveSprint(sprint, deps)`

```javascript
/**
 * @param {Sprint} sprint - must be in 'report' phase
 * @param {{ gateEvaluator?, eventEmitter?, clock? }} [deps]
 * @returns {Promise<{ ok: boolean, sprint?: Sprint, kpiSnapshot?: SprintKPI, archiveEvent?: SprintEvent, reason?: string, gateResults?: Object }>}
 */
async function archiveSprint(sprint, deps) {
  // Verify transition legality (any → archived allowed)
  const transRes = canTransitionSprint(sprint.phase, 'archived');
  if (!transRes.ok) return { ok: false, reason: transRes.reason };

  // S4 archiveReadiness gate must pass (if currently in report phase)
  const evaluator = (deps && deps.gateEvaluator) || evaluatePhase;
  if (sprint.phase === 'report') {
    const gateResults = evaluator(sprint, 'report');
    const s4 = gateResults.results && gateResults.results.S4;
    if (s4 && !s4.passed) {
      return { ok: false, reason: 'archive_readiness_fail', gateResults };
    }
  }

  const clock = (deps && deps.clock) || (() => new Date().toISOString());
  const archivedAt = clock();
  const kpiSnapshot = { ...sprint.kpi };
  const updated = cloneSprint(sprint, {
    phase: 'archived',
    status: 'archived',
    archivedAt,
  });
  const archiveEvent = SprintEvents.SprintArchived({
    sprintId: sprint.id, archivedAt, reason: 'completion', kpiSnapshot,
  });
  if (deps && deps.eventEmitter) deps.eventEmitter(archiveEvent);
  return { ok: true, sprint: updated, kpiSnapshot, archiveEvent };
}
```

### 9.2 Exports
```javascript
module.exports = { archiveSprint };
```

---

## 10. Module 8: `start-sprint.usecase.js` 상세 spec ★ orchestrator

### 10.1 `SPRINT_AUTORUN_SCOPE` (local frozen)

Master Plan §11.2 일치 (Sprint 4에서 lib/control 옮김 결정):

```javascript
const SPRINT_AUTORUN_SCOPE = Object.freeze({
  L0: Object.freeze({ stopAfter: 'prd',      manual: true,  requireApproval: true,  hint: false }),
  L1: Object.freeze({ stopAfter: 'prd',      manual: true,  requireApproval: true,  hint: true  }),
  L2: Object.freeze({ stopAfter: 'design',   manual: false, requireApproval: true,  hint: false }),
  L3: Object.freeze({ stopAfter: 'report',   manual: false, requireApproval: true,  hint: false }),
  L4: Object.freeze({ stopAfter: 'archived', manual: false, requireApproval: false, hint: false }),
});
```

### 10.2 `startSprint(input, deps)` — auto-run orchestrator

```javascript
/**
 * @param {SprintInput & { trustLevel?: 'L0'|'L1'|'L2'|'L3'|'L4' }} input
 * @param {{ stateStore?, eventEmitter?, gateEvaluator?, autoPauseChecker?, phaseHandlers?, clock?, env? }} [deps]
 * @returns {Promise<{ ok: boolean, sprintId?: string, finalPhase?: string, pauseTrigger?: string|null, sprint?: Sprint, reason?: string, errors?: string[] }>}
 */
async function startSprint(input, deps) {
  // 1) Input validation (Sprint 1)
  const v = validateSprintInput(input);
  if (!v.ok) return { ok: false, reason: 'invalid_input', errors: v.errors };

  // 2) Resolve scope
  const trustLevel = input.trustLevel || 'L2';
  const scope = SPRINT_AUTORUN_SCOPE[trustLevel] || SPRINT_AUTORUN_SCOPE.L2;

  // 3) Create sprint (Sprint 1 factory)
  let sprint = createSprint({ ...input, trustLevelAtStart: trustLevel });
  // Attach autoRun.scope inline (Sprint 1 entity has autoRun.scope: null default)
  const now = (deps && deps.clock) ? deps.clock() : new Date().toISOString();
  sprint = cloneSprint(sprint, {
    autoRun: { ...sprint.autoRun, scope: { stopAfter: scope.stopAfter, requireApproval: scope.requireApproval }, startedAt: now },
    startedAt: now,
    phaseHistory: [{ phase: sprint.phase, enteredAt: now, exitedAt: null, durationMs: null }],
  });

  // 4) Initial save + event
  const stateStore = (deps && deps.stateStore) || inMemoryStore();
  const emit = (deps && deps.eventEmitter) || noopEmitter;
  await stateStore.save(sprint);
  emit(SprintEvents.SprintCreated({ sprintId: sprint.id, name: sprint.name, phase: sprint.phase }));

  // 5) Manual mode short-circuit
  if (scope.manual) {
    return { ok: true, sprintId: sprint.id, finalPhase: sprint.phase, pauseTrigger: null, sprint };
  }

  // 6) Auto-run loop
  const gateEvaluator = (deps && deps.gateEvaluator) || evaluatePhase;
  const pauseChecker = (deps && deps.autoPauseChecker) || checkAutoPauseTriggers;
  const handlers = (deps && deps.phaseHandlers) || defaultPhaseHandlers(deps);
  const env = (deps && deps.env) || {};
  const HARD_LIMIT = 100; // failsafe loop guard
  let pauseTrigger = null;
  let iter = 0;

  while (sprint.phase !== scope.stopAfter && iter < HARD_LIMIT) {
    iter += 1;

    // 6a) auto-pause check
    const hits = pauseChecker(sprint, env);
    if (hits.length > 0) {
      const paused = pauseSprint(sprint, hits, { eventEmitter: emit, clock: deps && deps.clock });
      sprint = paused.sprint;
      await stateStore.save(sprint);
      pauseTrigger = hits[0].triggerId;
      return { ok: false, sprintId: sprint.id, finalPhase: sprint.phase, pauseTrigger, sprint };
    }

    // 6b) phase-specific handler
    const handler = handlers[sprint.phase];
    if (handler) {
      const handlerResult = await handler(sprint);
      if (handlerResult && handlerResult.sprint) sprint = handlerResult.sprint;
      if (handlerResult && handlerResult.blocked) {
        // re-check triggers (likely ITERATION_EXHAUSTED)
        const reHits = pauseChecker(sprint, env);
        if (reHits.length > 0) {
          const paused = pauseSprint(sprint, reHits, { eventEmitter: emit, clock: deps && deps.clock });
          sprint = paused.sprint;
          await stateStore.save(sprint);
          pauseTrigger = reHits[0].triggerId;
          return { ok: false, sprintId: sprint.id, finalPhase: sprint.phase, pauseTrigger, sprint };
        }
      }
    }

    // 6c) determine next phase
    const next = computeNextPhase(sprint.phase);
    if (!next) break; // archived

    // 6d) advance
    const advRes = await advancePhase(sprint, next, { gateEvaluator, eventEmitter: emit, clock: deps && deps.clock });
    if (!advRes.ok) {
      // gate fail → pause as QUALITY_GATE_FAIL
      const reHits = pauseChecker(sprint, env);
      if (reHits.length > 0) {
        const paused = pauseSprint(sprint, reHits, { eventEmitter: emit, clock: deps && deps.clock });
        sprint = paused.sprint;
        await stateStore.save(sprint);
        pauseTrigger = reHits[0].triggerId;
        return { ok: false, sprintId: sprint.id, finalPhase: sprint.phase, pauseTrigger, sprint };
      }
      // user approval required
      if (advRes.reason === 'requires_user_approval') {
        await stateStore.save(sprint);
        return { ok: true, sprintId: sprint.id, finalPhase: sprint.phase, pauseTrigger: null, sprint, reason: 'stopped_at_scope_boundary' };
      }
      return { ok: false, sprintId: sprint.id, finalPhase: sprint.phase, sprint, reason: advRes.reason };
    }
    sprint = advRes.sprint;
    await stateStore.save(sprint);
  }

  return { ok: true, sprintId: sprint.id, finalPhase: sprint.phase, pauseTrigger: null, sprint };
}

function computeNextPhase(currentPhase) {
  // Linear progression with iterate as conditional skip-target
  switch (currentPhase) {
    case 'prd':      return 'plan';
    case 'plan':     return 'design';
    case 'design':   return 'do';
    case 'do':       return 'iterate';
    case 'iterate':  return 'qa';
    case 'qa':       return 'report';
    case 'report':   return 'archived';
    case 'archived': return null;
    default:         return null;
  }
}

function defaultPhaseHandlers(deps) {
  return {
    iterate: async (sprint) => {
      const result = await iterateSprint(sprint, deps);
      return { sprint: result.sprint, blocked: result.blocked };
    },
    qa: async (sprint) => {
      // Iterate features sequentially (ENH-292)
      let working = sprint;
      const allFeatures = Array.isArray(working.features) && working.features.length > 0
        ? working.features
        : Object.keys(working.featureMap || {});
      const featureResults = [];
      for (const featureName of allFeatures) {
        const r = await verifyDataFlow(working, featureName, deps);
        featureResults.push(r);
      }
      const avgS1 = featureResults.length === 0 ? 0
        : featureResults.reduce((a, b) => a + (b.s1Score || 0), 0) / featureResults.length;
      working = cloneSprint(working, {
        kpi: { ...working.kpi, dataFlowIntegrity: avgS1 },
        qualityGates: {
          ...working.qualityGates,
          S1_dataFlowIntegrity: { current: avgS1, threshold: 100, passed: avgS1 >= 100 },
        },
      });
      return { sprint: working };
    },
    report: async (sprint) => {
      const r = await generateReport(sprint, deps);
      return { sprint };
    },
    archived: async (sprint) => {
      const r = await archiveSprint(sprint, deps);
      return { sprint: r.sprint || sprint };
    },
  };
}

function inMemoryStore() {
  const store = new Map();
  return {
    async save(s) { store.set(s.id, s); },
    async load(id) { return store.get(id); },
  };
}

function noopEmitter(_event) { /* no-op */ }
```

### 10.3 Exports
```javascript
module.exports = { startSprint, SPRINT_AUTORUN_SCOPE };
```

---

## 11. Module 9: `index.js` barrel 확장

```javascript
const phases = require('./phases');
const transitions = require('./transitions');
const qualityGates = require('./quality-gates');
const autoPause = require('./auto-pause');
const startSprintMod = require('./start-sprint.usecase');
const advancePhaseMod = require('./advance-phase.usecase');
const iterateSprintMod = require('./iterate-sprint.usecase');
const verifyDataFlowMod = require('./verify-data-flow.usecase');
const generateReportMod = require('./generate-report.usecase');
const archiveSprintMod = require('./archive-sprint.usecase');

module.exports = {
  // Sprint 1
  SPRINT_PHASES:       phases.SPRINT_PHASES,
  SPRINT_PHASE_ORDER:  phases.SPRINT_PHASE_ORDER,
  SPRINT_PHASE_SET:    phases.SPRINT_PHASE_SET,
  isValidSprintPhase:  phases.isValidSprintPhase,
  sprintPhaseIndex:    phases.sprintPhaseIndex,
  nextSprintPhase:     phases.nextSprintPhase,
  SPRINT_TRANSITIONS:  transitions.SPRINT_TRANSITIONS,
  canTransitionSprint: transitions.canTransitionSprint,
  legalNextSprintPhases: transitions.legalNextSprintPhases,

  // Sprint 2 — Quality gates
  evaluateGate:        qualityGates.evaluateGate,
  evaluatePhase:       qualityGates.evaluatePhase,
  ACTIVE_GATES_BY_PHASE: qualityGates.ACTIVE_GATES_BY_PHASE,
  GATE_DEFINITIONS:    qualityGates.GATE_DEFINITIONS,

  // Sprint 2 — Auto-pause
  AUTO_PAUSE_TRIGGERS:    autoPause.AUTO_PAUSE_TRIGGERS,
  checkAutoPauseTriggers: autoPause.checkAutoPauseTriggers,
  pauseSprint:            autoPause.pauseSprint,
  resumeSprint:           autoPause.resumeSprint,

  // Sprint 2 — Use cases
  startSprint:         startSprintMod.startSprint,
  SPRINT_AUTORUN_SCOPE: startSprintMod.SPRINT_AUTORUN_SCOPE,
  advancePhase:        advancePhaseMod.advancePhase,
  iterateSprint:       iterateSprintMod.iterateSprint,
  verifyDataFlow:      verifyDataFlowMod.verifyDataFlow,
  SEVEN_LAYER_HOPS:    verifyDataFlowMod.SEVEN_LAYER_HOPS,
  generateReport:      generateReportMod.generateReport,
  archiveSprint:       archiveSprintMod.archiveSprint,
};
```

**Exports total**: 28 (Sprint 1: 9 + Sprint 2: 19).

---

## 12. ENH-292 Sequential Dispatch — Sprint 2 자기적용 매트릭스

| Use case | Sequential 지점 | Implementation 패턴 |
|---------|---------------|------------------|
| `start-sprint.usecase` (qa handler) | features iteration 7-Layer 호출 | `for (const featureName of features) { await verifyDataFlow(...) }` |
| `verify-data-flow.usecase` | 7 hops iteration | `for (const hop of SEVEN_LAYER_HOPS) { await validator(...) }` |
| `iterate-sprint.usecase` | gap → fix → re-measure cycle | `while (...) { await autoFixer; await gapDetector; iter++ }` |
| `advance-phase.usecase` | 5 steps sequential | step1 → step2 → step3 → step4 → step5 |

**Forbidden patterns (Sprint 2 코드에서 grep 0건)**:
- ❌ `Promise.all([...])`
- ❌ `Promise.race([...])`
- ❌ `Promise.allSettled([...])`

**Allowed (Sprint 2)**:
- ✅ `for ... of` + `await` (sequential)
- ✅ Single `await` per statement

---

## 13. Test Plan Matrix (Phase 6 QA — L2 60+ TCs)

### 13.1 Test Layer Mapping

| Layer | Test Type | Sprint 2 분량 | Test File |
|-------|----------|--------------|-----------|
| L1 Unit | (Sprint 1 완료, 40 TCs) | 0 신규 | (already covered) |
| L2 Integration | 8 modules 통합 + DI mock | ★ 60+ TCs | `tests/qa/v2113-sprint-2-application.test.js` (gitignored local) |
| L3 Contract | Sprint 3 deps inject 사전 검증 | (Sprint 5에서 통합) | deferred |
| L4 E2E | Sprint 4 skill handler | (Sprint 5에서 통합) | deferred |
| L5 Performance | auto-run loop 1k iteration | (Sprint 5에서 통합) | deferred |

### 13.2 L2 Test Suite 구성 (60+ TCs)

#### 13.2.1 quality-gates.js (TC-L2-G-01 ~ G-12, 12건)

- G-01: ACTIVE_GATES_BY_PHASE keys 8개 (prd/plan/design/do/iterate/qa/report/archived)
- G-02: `ACTIVE_GATES_BY_PHASE.qa` 정확 매트릭스 (M1/M2/M3/M4/M5/M7/S1/S2)
- G-03: ACTIVE_GATES_BY_PHASE Object.freeze (mutation silent fail)
- G-04: `evaluateGate(sprint, 'M1')` matchRate 100 → passed: true
- G-05: `evaluateGate(sprint, 'M3')` critical 1 → passed: false (<=0)
- G-06: `evaluateGate(sprint, 'S4')` archiveReadiness true → passed: true
- G-07: `evaluateGate(sprint, 'unknown')` → `passed: false, reason: 'unknown_gate'`
- G-08: `evaluateGate(sprint with null current)` → `passed: false, reason: 'not_measured'`
- G-09: `evaluatePhase(sprint, 'qa')` allPassed=true when all gates pass
- G-10: `evaluatePhase(sprint, 'qa')` allPassed=false when one gate fails
- G-11: `evaluatePhase(sprint, 'prd')` allPassed=true (empty gates)
- G-12: GATE_DEFINITIONS 11 keys frozen

#### 13.2.2 auto-pause.js (TC-L2-A-01 ~ A-14, 14건)

- A-01: AUTO_PAUSE_TRIGGERS 4 keys present
- A-02: AUTO_PAUSE_TRIGGERS Object.freeze (mutation silent fail)
- A-03: QUALITY_GATE_FAIL fires when M3>0
- A-04: QUALITY_GATE_FAIL fires when S1<100
- A-05: ITERATION_EXHAUSTED fires when iter≥5 AND matchRate<90
- A-06: ITERATION_EXHAUSTED does NOT fire when iter<5
- A-07: BUDGET_EXCEEDED fires when cumulativeTokens > budget
- A-08: PHASE_TIMEOUT fires when elapsed > timeout (env.now injection)
- A-09: PHASE_TIMEOUT does NOT fire when phaseHistory empty
- A-10: checkAutoPauseTriggers returns [] for healthy sprint
- A-11: checkAutoPauseTriggers respects armed filter (disarmed trigger doesn't fire)
- A-12: pauseSprint sets status='paused' + appends pauseHistory
- A-13: resumeSprint blocked when trigger still firing
- A-14: resumeSprint succeeds with status='active' + SprintResumed event

#### 13.2.3 verify-data-flow.usecase.js (TC-L2-V-01 ~ V-06, 6건)

- V-01: SEVEN_LAYER_HOPS 7 entries (H1~H7) frozen
- V-02: All 7 hops pass → s1Score: 100
- V-03: 0/7 hops pass → s1Score: 0
- V-04: 4/7 hops pass → s1Score: ~57.14
- V-05: Sequential dispatch — validator call order = H1,H2,...,H7 (track order)
- V-06: Default validator returns `{passed: false, reason: 'no_validator_injected'}`

#### 13.2.4 iterate-sprint.usecase.js (TC-L2-I-01 ~ I-08, 8건)

- I-01: matchRate 100 from start → iterations: 0, finalMatchRate: 100
- I-02: matchRate 60→fix→100 in 1 iter → iterations: 1
- I-03: matchRate 60→70→80→90→95→100 in 5 iter
- I-04: matchRate 60→65→70→75→80→85 (5 iter exhausted, <90) → blocked: true
- I-05: gapDetector/autoFixer called sequentially (not parallel)
- I-06: iterateHistory appended each cycle with durationMs
- I-07: kpi.matchRate updated to final value
- I-08: qualityGates.M1_matchRate.current updated

#### 13.2.5 advance-phase.usecase.js (TC-L2-P-01 ~ P-14, 14건)

- P-01: ('prd','plan') OK
- P-02: ('plan','design') OK
- P-03: ('design','do') OK
- P-04: ('do','iterate') OK
- P-05: ('iterate','qa') OK (gates pass)
- P-06: ('qa','report') OK (S1/M1/M3 pass)
- P-07: ('qa','do') OK (역방향 fail-back)
- P-08: ('report','archived') OK
- P-09: ('archived','plan') FAIL reason='transition_not_allowed'
- P-10: scope L2 sprint advancing past 'design' → reason='requires_user_approval'
- P-11: gate fail → reason='gate_fail', gateResults present
- P-12: phaseHistory append exit/duration on previous phase
- P-13: SprintPhaseChanged event emitted via deps.eventEmitter
- P-14: allowGateOverride bypasses gate

#### 13.2.6 generate-report.usecase.js (TC-L2-R-01 ~ R-05, 5건)

- R-01: kpiSnapshot 정확 aggregate (featuresTotal/Completed/CompletionRate)
- R-02: dataFlowIntegrity = avg of featureMap.s1Score
- R-03: carryItems list for incomplete features
- R-04: lessons extracted for failed iterations + pauses
- R-05: deps.fileWriter called with reportPath when provided

#### 13.2.7 archive-sprint.usecase.js (TC-L2-AR-01 ~ AR-04, 4건)

- AR-01: archive from 'report' with S4 pass → status='archived'
- AR-02: archive from 'report' with S4 fail → reason='archive_readiness_fail'
- AR-03: archive direct from any phase (transition allowed) → OK
- AR-04: SprintArchived event with kpiSnapshot

#### 13.2.8 start-sprint.usecase.js E2E (TC-L2-S-01 ~ S-08, 8건)

- S-01: L3 sprint full PRD→Report (mock deps) → finalPhase='report'
- S-02: L4 sprint full → finalPhase='archived'
- S-03: L0 manual sprint → finalPhase='prd' (immediate return)
- S-04: L2 sprint stops at 'design' → finalPhase='design', reason='stopped_at_scope_boundary'
- S-05: Sprint with ITERATION_EXHAUSTED trigger → ok:false, pauseTrigger='ITERATION_EXHAUSTED'
- S-06: Sprint with BUDGET_EXCEEDED → ok:false, pauseTrigger='BUDGET_EXCEEDED'
- S-07: Invalid input → ok:false, reason='invalid_input', errors:[...]
- S-08: SPRINT_AUTORUN_SCOPE frozen (mutation silent fail)

#### 13.2.9 Integration (TC-L2-INT-01 ~ INT-08, 8건)

- INT-01: All 8 modules require() OK via barrel `require('./lib/application/sprint-lifecycle')`
- INT-02: 28 exports surface (Sprint 1 9 + Sprint 2 19)
- INT-03: Sprint 1 imports (createSprint/cloneSprint/SprintEvents/validateSprintInput/sprintPhaseDocPath/canTransitionSprint/sprintPhaseIndex) — 8 modules 통합 grep
- INT-04: PDCA lifecycle imports 0건 grep
- INT-05: Promise.all/race/allSettled grep 0건 (ENH-292)
- INT-06: SprintEvents emission point 5건 매트릭스 (Created/PhaseChanged/Archived/Paused/Resumed)
- INT-07: ACTIVE_GATES_BY_PHASE 매트릭스 Master Plan §12.1 일치
- INT-08: `--plugin-dir .` 환경 module require() (cwd-relative path 검증)

**총 TC**: 12+14+6+8+14+5+4+8+8 = **79 TCs** (PRD/Plan target 60+ 초과 달성).

### 13.3 Test 작성 패턴 (Sprint 1 패턴 정합)

```javascript
// tests/qa/v2113-sprint-2-application.test.js (gitignored local)
const assert = require('node:assert/strict');
const path = require('node:path');

const PLUGIN_ROOT = path.resolve(__dirname, '../../');
const lifecycle = require(path.join(PLUGIN_ROOT, 'lib/application/sprint-lifecycle'));
const { createSprint, cloneSprint } = require(path.join(PLUGIN_ROOT, 'lib/domain/sprint'));

let pass = 0, fail = 0, total = 0;
function test(name, fn) {
  total++;
  try { fn(); pass++; }
  catch (e) { fail++; console.error(`FAIL: ${name}\n  ${e.message}`); }
}
async function testAsync(name, fn) {
  total++;
  try { await fn(); pass++; }
  catch (e) { fail++; console.error(`FAIL: ${name}\n  ${e.message}`); }
}

(async () => {
  // === quality-gates ===
  test('G-01: ACTIVE_GATES_BY_PHASE 8 keys', () => { ... });
  // ...
  await testAsync('I-02: matchRate 60→100 in 1 iter', async () => { ... });
  // ...
  console.log(`\n[v2113-sprint-2-application] ${pass}/${total} PASS, ${fail} FAIL`);
  process.exit(fail === 0 ? 0 : 1);
})();
```

---

## 14. Quality Gates Activation Matrix (Sprint 2 phase 진행 시)

| Phase | Active Gates | 측정 |
|-------|------------|------|
| Design (본 phase) | M4 (≥95), M8 (≥85) | function signature check + Design doc structure |
| Do | M2 (≥80), M3 (=0), M5 (≤1), M7 (≥90) | code-analyzer + ESLint |
| Iterate | M1 (≥90→100) | matchRate calc |
| QA | M1 (=100), M2, M3, M5, M7, S1 (=100), S2 (=100) | TC + 7-Layer + featureMap |
| Report | + M8, M10 (≤사용자), S4 | report doc |
| **Domain Purity** | 0 (Sprint 2는 Application layer만 손대므로 무관) | grep |
| **PDCA invariant** | git diff lib/application/pdca-lifecycle/ empty | git |
| **ENH-292 sequential** | Promise.all/race/allSettled grep 0건 | grep |
| **Frozen invariant** | mutation silent fail 8개 (ACTIVE_GATES_BY_PHASE / AUTO_PAUSE_TRIGGERS / SEVEN_LAYER_HOPS / SPRINT_AUTORUN_SCOPE / GATE_DEFINITIONS + Sprint 1 3개) | runtime test |

---

## 15. Risks (PRD §8 + Plan §4 + Design specific)

### 15.1 Plan §4 매트릭스 reaffirm — 모두 mitigation 적용
### 15.2 Design specific risks

| Risk | 발견 시점 | Mitigation |
|------|---------|----------|
| D-R1: SPRINT_AUTORUN_SCOPE를 start-sprint 인라인 → Sprint 4에서 lib/control 옮길 때 import path 변경 필요 | Sprint 4 | Sprint 2 export로 노출 (barrel) → Sprint 4가 import 재배치 |
| D-R2: phaseHandlers의 qa handler가 features 없을 때 dataFlowIntegrity=0 → archive 막힘 | Do/QA | TC L2-S-05/06에서 0 features sprint 검증 + featureMap empty 시 NaN 회피 |
| D-R3: iterate-sprint blocked=true 반환했지만 start-sprint가 ITERATION_EXHAUSTED 트리거를 별도 호출 안 하면 무한 루프 | Do | start-sprint §10.2 step 6b의 reHits 재검사 로직 (블록 시 trigger 재평가) |
| D-R4: archive-sprint가 'report'에서 호출 안 되고 'do'에서 호출되면 S4 gate 검사 안 함 | Do/QA | TC L2-AR-03: 'do'→'archived' 직접 archive 시 S4 검사 skip 명시 |
| D-R5: generate-report renderReport TBD → Phase 4 Do에서 구체 구현 필요 | Do | Do checklist에 markdown rendering 구체 구현 명시 |
| D-R6: defaultGapDetector / defaultAutoFixer가 빈 결과 반환 → mock test 의미 부족 | Do | TC mock 작성 시 비결정적 결과 시뮬레이션 (60→100 progression) |
| D-R7: SPRINT_AUTORUN_SCOPE L0/L1 manual=true가 phase='prd' 단순 return → 사용자 다음 명령 없으면 stuck | Do/Sprint 4 | start-sprint 결과에 `reason: 'manual_mode'` 명시 + Sprint 4 skill response에 next command hint |

---

## 16. Document Index + Implementation Order (Plan §5/§6 reaffirm)

| Step | Module | LOC est. | TC count |
|------|--------|---------|----------|
| 1 | quality-gates.js | ~170 | 12 |
| 2 | auto-pause.js | ~175 | 14 |
| 3 | verify-data-flow.usecase.js | ~110 | 6 |
| 4 | iterate-sprint.usecase.js | ~120 | 8 |
| 5 | advance-phase.usecase.js | ~145 | 14 |
| 6 | generate-report.usecase.js | ~155 | 5 |
| 7 | archive-sprint.usecase.js | ~95 | 4 |
| 8 | start-sprint.usecase.js | ~210 | 8 |
| 9 | index.js (확장) | +20 (Sprint 1 base 37) | 8 (Integration) |
| Total | 9 files | ~1,200 LOC | **79 TCs** |

---

## 17. Design 완료 Checklist

- [x] Context Anchor 보존
- [x] 코드베이스 깊이 분석 (Sprint 1 + Master Plan §11.2/11.3/12.1 + PDCA Pilot + Existing modules)
- [x] Module 의존 그래프 + Import 매트릭스 (8 modules + 1 barrel)
- [x] 8 modules 상세 spec (header + signature + behavior + exports)
- [x] ENH-292 Sequential Dispatch 자기적용 매트릭스 (forbidden patterns + allowed)
- [x] Test Plan Matrix L2 79 TCs (PRD/Plan target 60+ 초과)
- [x] Quality Gates Activation Matrix (Sprint 2 phase 진행 시)
- [x] Risks (Plan §4 + Design specific 7건)
- [x] Implementation Order 9 steps
- [x] LOC estimate ~1,200

---

**Next Phase**: Phase 4 Do — 9 files 구현 (8 use cases + barrel extension). Step 1 quality-gates.js부터 시작 → leaf-first → orchestrator-last → barrel. 각 step 후 `node -c` syntax check + `node -e "require(...)"` runtime check.
