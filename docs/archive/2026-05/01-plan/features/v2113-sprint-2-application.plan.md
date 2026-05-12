# Sprint 2 Plan — v2.1.13 Sprint Management Application Core (Auto-Run Engine)

> **Sprint ID**: `v2113-sprint-2-application`
> **Phase**: Plan (2/7)
> **Date**: 2026-05-12
> **PRD Reference**: `docs/01-plan/features/v2113-sprint-2-application.prd.md`
> **Master Plan**: `docs/01-plan/features/sprint-management.master-plan.md` v1.1
> **ADRs**: 0007 / 0008 / **0009** (auto-run + Trust scope + auto-pause — 본 Sprint 핵심)
> **Depends on**: Sprint 1 Domain Foundation (commit `a7009a5`, completed 2026-05-12)
> **Branch**: `feature/v2113-sprint-management`

---

## 0. Context Anchor (PRD §0에서 복사 — 보존 필수)

(PRD §0 동일, 생략 없이 Design/Do/Iterate/QA/Report로 전파)

| Key | Value (요약) |
|-----|------|
| **WHY** | Sprint Management의 **product core**. ADR 0009 auto-run engine 영구화 → `/sprint start` 한 명령으로 PRD/Plan→Design→Do→Iterate→QA→Report→(L4:Archive) 자율 실행. Sprint 1 Domain 위 8 application use cases가 사용자 첫 실질 가치 산출. ENH-292 sequential dispatch moat 자기적용 결정적 sprint. |
| **WHO** | (1) bkit 사용자 / (2) Sprint 3 Infrastructure 작업자 (deps inject) / (3) Sprint 4 Skill/Agent handler / (4) bkit core CI (PDCA invariant 보존) / (5) audit-logger (SprintEvents emission point) |
| **RISK** | (a) Auto-run runaway loop / (b) Trust scope misclassification / (c) PDCA 9-phase invariant 깨짐 / (d) Sprint 1 import 누락 / (e) ENH-292 미적용 → caching 10x 회귀 / (f) Quality Gate 평가 누락 / (g) Phase atomicity / (h) Resume 흐름 복잡도 / (i) JSDoc type 누락 |
| **SUCCESS** | (1) `/sprint start` E2E mock 자율 진행 / (2) 4 auto-pause triggers 각 발화 검증 / (3) Trust L0~L4 5 scopes 검증 / (4) matchRate 100% loop max 5 cycle / (5) PDCA invariant 보존 / (6) 8 use cases 모두 Sprint 1 import / (7) Quality Gates evaluator 정확 / (8) ENH-292 sequential 명시 / (9) L2 integration TC 60+건 100% PASS / (10) Sprint 3 deps inject 사전 검증 |
| **SCOPE** | In: 8 modules in `lib/application/sprint-lifecycle/` + barrel 확장 (9 → ~28 exports). Out: state persistence (Sprint 3), telemetry (Sprint 3), matrix sync (Sprint 3), skill/agent/hook/template (Sprint 4), `/control` 통합 (Sprint 4), L3+ tests (Sprint 5), 8개국어 트리거 키워드 (Sprint 4) |

---

## 1. Requirements

### 1.1 In-scope (반드시 구현)

#### R1. `lib/application/sprint-lifecycle/start-sprint.usecase.js` ★ entry point

**Public API exports**:
- `startSprint(input: SprintInput, deps?: StartSprintDeps): Promise<StartSprintResult>` — auto-run loop entry

**Signature**:
```javascript
/**
 * @param {SprintInput} input - { id, name, phase?, context?, features?, config?, trustLevelAtStart?, manual?, fromPhase? }
 * @param {StartSprintDeps} deps - { stateStore?, eventEmitter?, gateEvaluator?, autoPauseChecker?, phaseHandlers? }
 * @returns {Promise<{ ok: boolean, sprintId: string, finalPhase: string, pauseTrigger?: string, sprint: Sprint }>}
 */
```

**Behavior**:
1. `validateSprintInput(input)` (Sprint 1) → fail = early return `{ ok: false, reason: 'invalid_input', errors: [...] }`
2. `createSprint(input)` (Sprint 1) → fresh Sprint state
3. Compute `autoRun.scope` from Trust Level via `SPRINT_AUTORUN_SCOPE[trustLevel]`
4. Initial save via `deps.stateStore.save(sprint)` (default in-memory mock)
5. Emit `SprintEvents.SprintCreated({sprintId, name, phase})` via `deps.eventEmitter`
6. Enter auto-run loop:
   - Loop guard: `currentPhase !== autoRun.scope.stopAfter` AND `iterations < hard limit (100)`
   - Step A: `checkAutoPauseTriggers(sprint, env)` → if fired, `pauseSprint` and exit
   - Step B: `evaluatePhase(sprint, currentPhase)` → if not allPassed, decide iterate vs pause
   - Step C: Phase-specific handler (`phaseHandlers[currentPhase]`):
     - `iterate`: `iterateSprint`
     - `qa`: `verifyDataFlow` for each feature
     - `report`: `generateReport`
     - `archived`: `archiveSprint`
     - else: pass-through (advance-phase decides next)
   - Step D: `advancePhase(sprint, nextPhase, deps)` → cloneSprint with new phase
   - Step E: `deps.stateStore.save(sprint)`
7. Return `{ ok: true, sprintId, finalPhase, pauseTrigger: null, sprint }`

**Pure-ish**: No direct I/O. All side effects via `deps` object.
**@version**: `2.1.13`
**@module**: `lib/application/sprint-lifecycle/start-sprint.usecase`

---

#### R2. `lib/application/sprint-lifecycle/advance-phase.usecase.js`

**Public API exports**:
- `advancePhase(sprint: Sprint, toPhase: string, deps?: AdvancePhaseDeps): Promise<AdvancePhaseResult>`

**Signature**:
```javascript
/**
 * @param {Sprint} sprint - current immutable sprint state (Sprint 1 type)
 * @param {string} toPhase - one of SPRINT_PHASES values
 * @param {AdvancePhaseDeps} deps - { gateEvaluator?, eventEmitter?, clock? }
 * @returns {Promise<{ ok: boolean, sprint: Sprint, event: SprintEvent, gateResults?: object, reason?: string }>}
 */
```

**Behavior** (5 sequential steps — ENH-292 sequential dispatch root reference):
1. `canTransitionSprint(sprint.phase, toPhase)` (Sprint 1) → `if (!result.ok) return { ok: false, reason: result.reason }`
2. **Trust Level scope check** — if `toPhase` 가 `sprint.autoRun.scope.stopAfter` 이후 phase 이면서 `sprint.autoRun.scope.requireApproval === true` → `{ ok: false, reason: 'requires_user_approval' }`
3. **Active gates evaluation** — `gateEvaluator(sprint, sprint.phase)` (current phase 종료 시 active gate 모두 PASS 검증)
4. **phaseHistory append** — `cloneSprint(sprint, { phaseHistory: [...sprint.phaseHistory, { phase: sprint.phase, enteredAt, exitedAt: now, durationMs }] })`
5. **SprintEvents.SprintPhaseChanged({sprintId, fromPhase: sprint.phase, toPhase, reason})` emit + `cloneSprint` with `phase: toPhase, autoRun.lastAutoAdvanceAt: now`

**Error path**: 5 paths — `transition_not_allowed` / `requires_user_approval` / `gate_fail` / `invalid_from_phase` / `invalid_to_phase`.

**@version**: `2.1.13`

---

#### R3. `lib/application/sprint-lifecycle/iterate-sprint.usecase.js` ★ matchRate 100% loop

**Public API exports**:
- `iterateSprint(sprint: Sprint, deps?: IterateSprintDeps): Promise<IterateSprintResult>`

**Signature**:
```javascript
/**
 * @param {Sprint} sprint - sprint in 'iterate' phase
 * @param {IterateSprintDeps} deps - { gapDetector?, autoFixer?, eventEmitter?, clock? }
 * @returns {Promise<{ ok: boolean, sprint: Sprint, finalMatchRate: number, iterations: number, blocked?: boolean }>}
 */
```

**Behavior** (Loop until matchRate 100% or maxIterations):
1. Read targets from `sprint.config`: `matchRateTarget` (default 100), `maxIterations` (default 5)
2. Initial measurement: `current = await deps.gapDetector(sprint)` → `{ matchRate, gaps: [...] }`
3. While `current.matchRate < matchRateTarget` AND `iter < maxIterations`:
   - `fixResult = await deps.autoFixer(sprint, current.gaps)` → `{ fixedTaskIds: [...] }`
   - `iterationHistory.push({ iteration: iter+1, matchRate: prev, fixedTaskIds, durationMs })`
   - `current = await deps.gapDetector(sprint)` → re-measure
   - `iter++`
4. Final state:
   - `finalMatchRate = current.matchRate`
   - `blocked = finalMatchRate < matchRateMinAcceptable (90)` after `maxIterations` → set up for ITERATION_EXHAUSTED auto-pause
5. Return `{ ok: true, sprint: cloneSprint with iterationHistory, finalMatchRate, iterations: iter, blocked }`

**Sequential**: gap → fix → re-measure (NEVER parallel — ENH-292).

**@version**: `2.1.13`

---

#### R4. `lib/application/sprint-lifecycle/verify-data-flow.usecase.js` ★ 7-Layer S1 gate

**Public API exports**:
- `verifyDataFlow(sprint: Sprint, featureName: string, deps?: VerifyDataFlowDeps): Promise<VerifyDataFlowResult>`

**Signature**:
```javascript
/**
 * @param {Sprint} sprint - sprint in 'qa' phase
 * @param {string} featureName - feature key under sprint.featureMap
 * @param {VerifyDataFlowDeps} deps - { dataFlowValidator?, eventEmitter? }
 * @returns {Promise<{ ok: boolean, s1Score: number, hopResults: HopResult[], featureName: string }>}
 */
```

**Hop matrix (frozen)**:
```javascript
const SEVEN_LAYER_HOPS = Object.freeze([
  { id: 'H1', from: 'UI',         to: 'Client'     },
  { id: 'H2', from: 'Client',     to: 'API'        },
  { id: 'H3', from: 'API',        to: 'Validation' },
  { id: 'H4', from: 'Validation', to: 'DB'         },
  { id: 'H5', from: 'DB',         to: 'Response'   },
  { id: 'H6', from: 'Response',   to: 'Client'     },
  { id: 'H7', from: 'Client',     to: 'UI'         },
]);
```

**Behavior**:
1. Iterate `SEVEN_LAYER_HOPS` **sequential** (one hop at a time — ENH-292)
2. Each hop: `result = await deps.dataFlowValidator(featureName, hopId, sprint)` → `{ passed: boolean, evidence?: string, reason?: string }`
3. Aggregate `passedCount = hopResults.filter(r => r.passed).length`
4. `s1Score = (passedCount / 7) * 100`
5. Update `sprint.featureMap[featureName].qa.s1Score = s1Score`

**@version**: `2.1.13`

---

#### R5. `lib/application/sprint-lifecycle/generate-report.usecase.js`

**Public API exports**:
- `generateReport(sprint: Sprint, deps?: GenerateReportDeps): Promise<GenerateReportResult>`

**Signature**:
```javascript
/**
 * @param {Sprint} sprint - sprint in 'report' phase
 * @param {GenerateReportDeps} deps - { docPathResolver?, fileWriter?, kpiCalculator? }
 * @returns {Promise<{ ok: boolean, reportContent: string, kpiSnapshot: SprintKPI, carryItems: CarryItem[] }>}
 */
```

**Behavior** (Pure aggregation — file write via deps):
1. Cumulative KPI: aggregate `sprint.phaseHistory` + `sprint.iterationHistory` + `sprint.featureMap`
2. Lesson learned synthesis: extract issues from `sprint.kpi.criticalIssues`, `iterationHistory` (matchRate < 90 cycles), `auto-pause` history
3. Carry items: any features with `matchRate < 100` OR `qa.s1Score < 100` → forward to next sprint
4. `reportPath = sprintPhaseDocPath(sprint.id, 'report')` (Sprint 1 helper)
5. Render markdown via internal `renderReport(sprint, kpiSnapshot, carryItems)` → return as string
6. `deps.fileWriter(reportPath, reportContent)` if provided (default no-op for unit tests)

**Pure-ish**: All I/O via deps. Function deterministic given same `sprint` + clock.

**@version**: `2.1.13`

---

#### R6. `lib/application/sprint-lifecycle/archive-sprint.usecase.js`

**Public API exports**:
- `archiveSprint(sprint: Sprint, deps?: ArchiveSprintDeps): Promise<ArchiveSprintResult>`

**Signature**:
```javascript
/**
 * @param {Sprint} sprint - sprint in 'report' phase ready to archive
 * @param {ArchiveSprintDeps} deps - { gateEvaluator?, eventEmitter?, clock? }
 * @returns {Promise<{ ok: boolean, sprint: Sprint, kpiSnapshot: SprintKPI, archiveEvent: SprintEvent }>}
 */
```

**Behavior**:
1. Final gate check — `gateEvaluator(sprint, 'report')` must include S4 (archiveReadiness) PASS
2. If gate fails → `{ ok: false, reason: 'archive_readiness_fail', gateResults }`
3. Capture `kpiSnapshot` from current sprint state
4. `cloneSprint(sprint, { phase: 'archived', status: 'archived', archivedAt: now })` (readonly transition)
5. Emit `SprintEvents.SprintArchived({sprintId, archivedAt, reason: 'completion', kpiSnapshot})` via deps

**@version**: `2.1.13`

---

#### R7. `lib/application/sprint-lifecycle/quality-gates.js` ★ evaluator

**Public API exports**:
- `evaluateGate(sprint: Sprint, gateKey: string): { current: number, threshold: number, passed: boolean }` — single gate
- `evaluatePhase(sprint: Sprint, phase: string): { allPassed: boolean, results: object }` — composite
- `ACTIVE_GATES_BY_PHASE` — `Object.freeze({...})` per-phase active gates

**Active gates matrix** (Master Plan §12.1 일치):
```javascript
const ACTIVE_GATES_BY_PHASE = Object.freeze({
  prd:      Object.freeze([]),
  plan:     Object.freeze(['M8']),
  design:   Object.freeze(['M4', 'M8']),
  do:       Object.freeze(['M2', 'M7', 'M5']),
  iterate:  Object.freeze(['M1']),
  qa:       Object.freeze(['M1', 'M3', 'S1']),
  report:   Object.freeze(['M10', 'S2', 'S4']),
  archived: Object.freeze([]),
});
```

**Gate evaluation logic** (per gateKey):
- `M1` matchRate ≥ `sprint.config.matchRateTarget` (100)
- `M2` codeQualityScore ≥ `sprint.config.qualityGates.M2.threshold` (80)
- `M3` criticalIssueCount ≤ `sprint.config.qualityGates.M3.threshold` (0)
- `M4` apiComplianceRate ≥ 95
- `M5` runtimeErrorRate ≤ 1
- `M7` conventionCompliance ≥ 90
- `M8` designCompleteness ≥ 85
- `M10` testCoverageDelta ≥ 0
- `S1` dataFlowIntegrity 100 (`sprint.kpi.dataFlowIntegrity === 100`)
- `S2` featureCompletion 100 (all `sprint.featureMap.*.matchRate === 100`)
- `S4` archiveReadiness (M3==0 AND M1==100 AND S1==100 AND S2==100)

**Pure**: No I/O. Reads `sprint.config.qualityGates` thresholds.

**@version**: `2.1.13`

---

#### R8. `lib/application/sprint-lifecycle/auto-pause.js` ★ safety pins

**Public API exports**:
- `AUTO_PAUSE_TRIGGERS` — `Object.freeze({...})` 4 trigger definitions
- `checkAutoPauseTriggers(sprint: Sprint, env?: { now? }): TriggerHit[]` — pure evaluator
- `pauseSprint(sprint: Sprint, triggers: TriggerHit[], deps?: PauseDeps): { ok, sprint, pauseEvent }` — state transition
- `resumeSprint(sprint: Sprint, deps?: ResumeDeps): { ok, sprint, resumeEvent?, blockedReason? }` — gated resume

**4 Triggers (frozen)**:
```javascript
const AUTO_PAUSE_TRIGGERS = Object.freeze({
  QUALITY_GATE_FAIL: Object.freeze({
    id: 'QUALITY_GATE_FAIL',
    severity: 'high',
    check: (sprint) => { /* M3 > 0 OR S1 < 100 in current phase */ }
  }),
  ITERATION_EXHAUSTED: Object.freeze({
    id: 'ITERATION_EXHAUSTED',
    severity: 'medium',
    check: (sprint) => { /* iteration cycles >= maxIterations AND matchRate < matchRateMinAcceptable */ }
  }),
  BUDGET_EXCEEDED: Object.freeze({
    id: 'BUDGET_EXCEEDED',
    severity: 'high',
    check: (sprint) => { /* cumulativeTokens > config.budget */ }
  }),
  PHASE_TIMEOUT: Object.freeze({
    id: 'PHASE_TIMEOUT',
    severity: 'medium',
    check: (sprint, env) => { /* current phase enteredAt elapsed > config.phaseTimeoutHours */ }
  }),
});
```

**checkAutoPauseTriggers**:
- Only fires for triggers in `sprint.autoPause.armed` set (default 4 all armed)
- Returns `Array<{triggerId, severity, message, evidence}>` — empty array if no fires
- Pure (no side effects, no I/O — `env.now` for `PHASE_TIMEOUT` test injection)

**pauseSprint**:
- `cloneSprint(sprint, { status: 'paused', autoPause: { ...sprint.autoPause, lastTrigger: triggers[0], pauseHistory: [...sprint.autoPause.pauseHistory, { pausedAt: now, trigger, severity, message }] } })`
- Emit `SprintEvents.SprintPaused`

**resumeSprint**:
- Re-evaluate `checkAutoPauseTriggers` — if still fires → `{ ok: false, blockedReason: 'trigger_not_resolved' }`
- Else clone with `status: 'active'` + emit `SprintEvents.SprintResumed`

**@version**: `2.1.13`

---

#### R9. `lib/application/sprint-lifecycle/index.js` (확장)

**Barrel additions** (Sprint 1 9 exports → ~28):
- (Sprint 1) `SPRINT_PHASES`, `SPRINT_PHASE_ORDER`, `SPRINT_PHASE_SET`, `isValidSprintPhase`, `sprintPhaseIndex`, `nextSprintPhase`, `SPRINT_TRANSITIONS`, `canTransitionSprint`, `legalNextSprintPhases`
- (Sprint 2 신규) `startSprint`, `advancePhase`, `iterateSprint`, `verifyDataFlow`, `generateReport`, `archiveSprint`, `evaluateGate`, `evaluatePhase`, `ACTIVE_GATES_BY_PHASE`, `AUTO_PAUSE_TRIGGERS`, `checkAutoPauseTriggers`, `pauseSprint`, `resumeSprint`, `SEVEN_LAYER_HOPS`

**Style**: PDCA `lib/application/pdca-lifecycle/index.js` 패턴 정합.

**@version**: `2.1.13`

---

### 1.2 Out-of-scope (Sprint 2 명시 제외)

- ❌ Sprint Infrastructure adapters — Sprint 3 (state-store / telemetry / matrix-sync / doc-scanner)
- ❌ Sprint state persistence (disk I/O) — Sprint 3
- ❌ Sprint Presentation (skill / agents / hooks / templates) — Sprint 4
- ❌ `/sprint` command 등록 — Sprint 4
- ❌ skills/sprint/SKILL.md + 4 agents/sprint-*.md (8개국어 트리거 + 영어 코드 사용자 명시) — Sprint 4
- ❌ `/control` automation-controller.js full sprint integration — Sprint 4 (Sprint 2는 SPRINT_AUTORUN_SCOPE 정의만)
- ❌ Trust Score sprint completion impact — defer (Open D4)
- ❌ Sprint user guide / migration guide — Sprint 5
- ❌ README / CLAUDE.md update — Sprint 5
- ❌ BKIT_VERSION bump — Sprint 6
- ❌ ADR 0007/0008/0009 Accepted 전환 — Sprint 6 (현재 Proposed)
- ❌ L3/L4/L5 tests — Sprint 5 (Sprint 2는 L2 integration only)
- ❌ ENH-303 PostToolUse continueOnBlock 통합 — Sprint 4
- ❌ ENH-286 Memory Enforcer master plan 보호 — Sprint 4
- ❌ Real `gap-detector` / `code-analyzer` / `chrome-qa` adapter — Sprint 4 (Sprint 2는 deps mock 패턴만)

---

## 2. Feature Breakdown (8 modules + 1 barrel extension)

| # | File | Layer | LOC est. | Public Exports | Imports (own) | Imports (Sprint 1) |
|---|------|-------|---------|----------------|---------------|--------------------|
| 1 | `start-sprint.usecase.js` | Application | ~210 | 1 fn | `./phases`, `./transitions`, `./advance-phase.usecase`, `./iterate-sprint.usecase`, `./verify-data-flow.usecase`, `./generate-report.usecase`, `./archive-sprint.usecase`, `./quality-gates`, `./auto-pause` | `../../domain/sprint` |
| 2 | `advance-phase.usecase.js` | Application | ~145 | 1 fn | `./phases`, `./transitions`, `./quality-gates` | `../../domain/sprint` |
| 3 | `iterate-sprint.usecase.js` | Application | ~120 | 1 fn | `./phases` | `../../domain/sprint` |
| 4 | `verify-data-flow.usecase.js` | Application | ~110 | 2 (fn + SEVEN_LAYER_HOPS) | `./phases` | `../../domain/sprint` |
| 5 | `generate-report.usecase.js` | Application | ~155 | 1 fn | `./phases`, `./quality-gates` | `../../domain/sprint` |
| 6 | `archive-sprint.usecase.js` | Application | ~95 | 1 fn | `./phases`, `./transitions`, `./quality-gates` | `../../domain/sprint` |
| 7 | `quality-gates.js` | Application | ~170 | 3 (2 fn + ACTIVE_GATES_BY_PHASE) | `./phases` | `../../domain/sprint` (typedef only) |
| 8 | `auto-pause.js` | Application | ~175 | 4 (1 const + 3 fn) | `./phases`, `./quality-gates` | `../../domain/sprint` |
| 9 | `index.js` (확장) | Application | +20 (Sprint 1 base 37) | +19 exports | + 8 신규 modules | (Sprint 1 transparent) |
| **합계** | | | **~1,200 LOC** | **+19 public exports (28 total)** | | |

**Note**: PRD §9 estimate 1,100 → 정정 **~1,200 LOC** (JSDoc + 4 trigger 인라인 정의 + 7-layer hops + 11 gate evaluators 합산).

---

## 3. Quality Gates (Sprint 2 활성)

| Gate | Threshold | Sprint 2 Phase | 측정 |
|------|----------|---------------|------|
| M2 codeQualityScore | ≥80 | Do, Iterate, QA | code-analyzer |
| M3 criticalIssueCount | 0 | Do, Iterate, QA | code-analyzer (deny on >0) |
| M4 apiComplianceRate | ≥95 | Design, QA | function signature check |
| M5 runtimeErrorRate | ≤1 | Do, QA | TC execution |
| M7 conventionCompliance | ≥90 | Do, Iterate, QA | ESLint + JSDoc check |
| M8 designCompleteness | ≥85 | Design | Design doc structure check |
| M1 matchRate (Design ↔ Code) | ≥90 (목표 100) | Iterate | gap-detector |
| S2 featureCompletion | 100 (8/8 modules) | Iterate, QA | file existence check |
| **PDCA 9-phase invariant 보존** | 0 변경 | Do, QA | `git diff lib/application/pdca-lifecycle/` empty |
| **Sprint 1 frozen invariant 보존** | 0 변경 | Do, QA | `git diff lib/domain/sprint/` empty |
| **ENH-292 sequential dispatch 명시** | parallel agent spawn 0건 | Do, QA | grep + doc inspection |
| **Object.freeze invariant** | 100% (mutation silent fail) | QA | runtime test (ACTIVE_GATES_BY_PHASE / AUTO_PAUSE_TRIGGERS / SEVEN_LAYER_HOPS) |
| **canTransitionSprint shape match** | `{ ok, reason? }` 패턴 | QA | advance-phase result shape diff |
| **L2 integration TC pass** | 100% (60+ TCs) | QA | node test runner |
| **`--plugin-dir .` require() compatibility** | All 8 modules + barrel require() success | QA | `node -e "require('./lib/application/sprint-lifecycle')"` |
| **Auto-pause 4 triggers 평가** | 4/4 발화 검증 | QA | TC L2-04~07 |
| **Trust Level 5 scopes 검증** | 5/5 (L0~L4) | QA | TC L2-08 |

---

## 4. Risks & Mitigation (PRD §8 Pre-mortem 10 시나리오 + Sprint 2 specific)

### 4.1 PRD §8 시나리오 매핑

| PRD Risk | Sprint 2 Phase별 대응 |
|----------|---------------------|
| A. Auto-run runaway | Design §X: maxIterations 5 + loop guard 100 + Stop hook checkAutoPauseTriggers / Do: hard cap 코드 / QA: TC L2-11 1k+ iteration synthetic |
| B. PDCA invariant 깨짐 | Design: import 매트릭스 명시 (PDCA enum 0건) / Do: import 작성 순간 확인 / QA: `git diff lib/application/pdca-lifecycle/` empty |
| C. Sprint 1 import 실패 | Design: relative path `../../domain/sprint` 통일 / Do: each file 작성 후 syntax check / QA: TC L2-01 모듈별 import 검증 |
| D. canTransitionSprint shape 오용 | Design: advance-phase JSDoc `@returns { ok, reason? }` / Do: `if (!result.ok)` 패턴 / QA: shape diff test |
| E. 4 triggers 평가 누락 | Design: AUTO_PAUSE_TRIGGERS 4 keys frozen / Do: checkAutoPauseTriggers loop Object.keys / QA: TC L2-04/05/06/07 |
| F. ACTIVE_GATES_BY_PHASE 불일치 | Design: Master Plan §12.1 file:line 인용 / Do: Master Plan 매트릭스 직접 매칭 / QA: TC L2-12 phase별 8개 매트릭스 |
| G. Trust scope misclassification | Design: SPRINT_AUTORUN_SCOPE Object.freeze / Do: lookup table 통일 / QA: TC L2-08 5 levels |
| H. ENH-292 sequential 미적용 | Design: 3 use case body sequential comment / Do: parallel spawn 0건 (Promise.all 등 0건) / QA: grep + doc inspection |
| I. Resume 흐름 trigger 검증 | Design: resumeSprint re-evaluate / Do: 4 triggers 별 resolution check / QA: TC L2-13 |
| J. Frozen mutation 부주의 | Design: cloneSprint 패턴 일관 / Do: spread-then-update 패턴 / QA: TC L2-14 mutation attempt |

### 4.2 Sprint 2 phase-specific risks

| Risk | Likelihood | Severity | Mitigation |
|------|:---------:|:--------:|-----------|
| R1: deps inject 패턴 부재 → Sprint 3 mock 어려움 | LOW | HIGH | Design §X: 모든 use case `deps = {}` 기본값 + default in-memory mock |
| R2: SprintEvents emission point 일관성 | MEDIUM | MEDIUM | Design: 5 emission points 매트릭스 (created/phaseChanged/archived/paused/resumed) / Do: 함수별 emit 위치 정확 |
| R3: ENH-292 parallel slip (Promise.all 의도치 못 사용) | MEDIUM | HIGH | Do checklist: Promise.all grep 0건 / Iterate에서 다시 grep |
| R4: 8 modules 간 cross-import cycle | LOW | HIGH | Design: import dependency graph 명시 / Do: start-sprint만 7개 import, 나머지 atomic |
| R5: quality-gates 평가 함수 sprint state 직접 mutation | LOW | HIGH | Design: pure function only / Do: input read-only + return new object |
| R6: auto-pause checkAutoPauseTriggers race (Sprint 4 Stop hook 동시) | MEDIUM | LOW | Pure evaluator (no I/O) + Sprint 4에서 atomic state save |
| R7: matchRate < 90 이면서 fix 불가능한 case | MEDIUM | MEDIUM | iterate-sprint blocked=true 반환 → ITERATION_EXHAUSTED trigger 자동 활성 |
| R8: phaseHistory durationMs 계산 시 clock 의존 | LOW | LOW | deps.clock injection (test 시 fake clock) |
| R9: SEVEN_LAYER_HOPS hop ID 충돌 (다른 hop matrix 존재 시) | LOW | LOW | 'H1'~'H7' 명시 + Sprint 4 contract docs에 transparent |
| R10: archive-sprint S4 gate 평가 누락 | LOW | HIGH | Design: archive-sprint 첫 step에 gateEvaluator 강제 호출 |
| R11: generateReport 결정적이지 않음 (clock 의존) | MEDIUM | LOW | deps.clock injection + ISO 8601 string 사용 |
| R12: L4 모드 + Trust 50 — 8 modules 한 sprint 운영 | MEDIUM | MEDIUM | Sprint 2는 Application layer 단일 PR, 외부 영향 lib/application/sprint-lifecycle/ 한정 → 사용자 결정 존중 |
| R13: LOC 초과 (~1,200 vs PRD ~1,100 estimate) | HIGH | LOW | PRD/Master Plan v1.2에서 정정 반영 (Iterate phase) |
| R14: JSDoc @typedef 누락 (Sprint 1 type 활용 부족) | MEDIUM | LOW | Do checklist: 8 modules 모두 Sprint 1 typedef @import |
| R15: 사용자 8개국어 트리거 constraint Sprint 2 누락 | LOW | LOW | Sprint 2는 lib/만 손대므로 skill/agent 미생성 → constraint Sprint 4 결정적 적용. 본 Sprint 2 코드는 모두 영어 |

---

## 5. Document Index (Sprint 2 산출물)

| Phase | Document | Path | Status |
|-------|----------|------|--------|
| PRD | Sprint 2 PRD | `docs/01-plan/features/v2113-sprint-2-application.prd.md` | ✅ |
| Plan | 본 문서 | `docs/01-plan/features/v2113-sprint-2-application.plan.md` | ✅ (작성 중) |
| Design | Sprint 2 Design | `docs/02-design/features/v2113-sprint-2-application.design.md` | ⏳ |
| Iterate | Sprint 2 Iterate analysis | `docs/03-analysis/features/v2113-sprint-2-application.iterate.md` | ⏳ |
| QA | Sprint 2 QA Report | `docs/05-qa/features/v2113-sprint-2-application.qa-report.md` | ⏳ |
| Report | Sprint 2 Final Report | `docs/04-report/features/v2113-sprint-2-application.report.md` | ⏳ |

---

## 6. Implementation Order (Phase 4 Do 단계 작업 순서)

의존성 그래프 기반 — leaf modules 먼저, orchestrator 마지막. start-sprint는 모든 다른 use case를 호출하므로 가장 마지막.

| Step | Module | 이유 | 의존 |
|:----:|--------|------|------|
| 1 | `quality-gates.js` | leaf (Sprint 1만 의존), 다른 use case 다수 이를 호출 | Sprint 1 |
| 2 | `auto-pause.js` | leaf+1 (quality-gates 의존), Stop hook target | Sprint 1 + quality-gates |
| 3 | `verify-data-flow.usecase.js` | leaf (Sprint 1만 의존), 자체 SEVEN_LAYER_HOPS 인라인 | Sprint 1 |
| 4 | `iterate-sprint.usecase.js` | leaf (Sprint 1만 의존), advance-phase가 호출 | Sprint 1 |
| 5 | `advance-phase.usecase.js` | quality-gates + Sprint 1 의존, 다수 use case 호출 | Sprint 1 + quality-gates |
| 6 | `generate-report.usecase.js` | quality-gates + Sprint 1 의존 | Sprint 1 + quality-gates |
| 7 | `archive-sprint.usecase.js` | quality-gates + Sprint 1 의존, terminal state | Sprint 1 + quality-gates |
| 8 | `start-sprint.usecase.js` | **모든 7 use case + auto-pause + quality-gates 호출**, auto-run FSM 통합 | 모두 |
| 9 | `index.js` 확장 | barrel — 8 modules 완성 후 마지막 | 모두 |
| 10 | Static check (`node -c` 8 files + barrel) | syntax 검증 | - |
| 11 | Runtime check (`node -e "require('./lib/application/sprint-lifecycle')"`) | 통합 require() | - |

---

## 7. Acceptance Criteria (Phase 6 QA 통과 조건)

### 7.1 Static Checks (Do 단계 마무리)
- [ ] `node -c lib/application/sprint-lifecycle/start-sprint.usecase.js`
- [ ] `node -c lib/application/sprint-lifecycle/advance-phase.usecase.js`
- [ ] `node -c lib/application/sprint-lifecycle/iterate-sprint.usecase.js`
- [ ] `node -c lib/application/sprint-lifecycle/verify-data-flow.usecase.js`
- [ ] `node -c lib/application/sprint-lifecycle/generate-report.usecase.js`
- [ ] `node -c lib/application/sprint-lifecycle/archive-sprint.usecase.js`
- [ ] `node -c lib/application/sprint-lifecycle/quality-gates.js`
- [ ] `node -c lib/application/sprint-lifecycle/auto-pause.js`
- [ ] `node -c lib/application/sprint-lifecycle/index.js` (확장 후)
- [ ] PDCA 9-phase invariant: `git diff lib/application/pdca-lifecycle/` empty
- [ ] Sprint 1 invariant: `git diff lib/domain/sprint/` empty
- [ ] `scripts/check-domain-purity.js` Exit 0 (Application layer는 무관하나 회귀 0건)

### 7.2 Runtime Checks (QA 단계)
- [ ] `node -e "require('./lib/application/sprint-lifecycle')"` Exit 0 (모든 28 exports 정상)
- [ ] `--plugin-dir .` 환경에서 모든 use case 단독 require() success
- [ ] Object.freeze runtime mutation silent fail (8 frozen: SPRINT_PHASES, SPRINT_PHASE_ORDER, SPRINT_TRANSITIONS, ACTIVE_GATES_BY_PHASE, AUTO_PAUSE_TRIGGERS, SEVEN_LAYER_HOPS, SprintEvents — Sprint 1 + Sprint 2)

### 7.3 advance-phase.usecase TC (10+)
- [ ] `('prd', 'plan')` → `{ ok: true, sprint: {phase: 'plan', ...} }`
- [ ] `('plan', 'design')` → `{ ok: true }`
- [ ] `('design', 'do')` → `{ ok: true }`
- [ ] `('do', 'iterate')` → `{ ok: true }`
- [ ] `('iterate', 'qa')` → `{ ok: true }` (gates pass)
- [ ] `('qa', 'report')` → `{ ok: true }` (S1 + M3 + M1 pass)
- [ ] `('qa', 'do')` → `{ ok: true }` (역방향 fail-back)
- [ ] `('report', 'archived')` → `{ ok: true }` (S4 pass)
- [ ] `('archived', 'plan')` → `{ ok: false, reason: 'transition_not_allowed' }`
- [ ] Trust L1 sprint trying to go past 'design' → `{ ok: false, reason: 'requires_user_approval' }`
- [ ] gate fail → `{ ok: false, reason: 'gate_fail' }`

### 7.4 iterate-sprint.usecase TC (5+)
- [ ] matchRate 60 → fix → 100% in 2 iterations: `{ ok: true, finalMatchRate: 100, iterations: 2 }`
- [ ] matchRate 60 → fix → 70 → ... → 85 after 5 iter: `{ ok: true, finalMatchRate: 85, iterations: 5, blocked: true }`
- [ ] matchRate 100 from start: `{ ok: true, finalMatchRate: 100, iterations: 0 }`
- [ ] Sequential dispatch — `deps.gapDetector` calls AND `deps.autoFixer` calls non-overlapping
- [ ] iterationHistory recorded each cycle

### 7.5 verify-data-flow.usecase TC (5+)
- [ ] All 7 hops pass: `{ ok: true, s1Score: 100, hopResults: 7 items }`
- [ ] 6/7 hops pass: `s1Score: 85.71...`
- [ ] 0/7 hops pass: `s1Score: 0`
- [ ] Hops invoked sequentially (verify via call order)
- [ ] `SEVEN_LAYER_HOPS` is Object.freeze (mutation silent fail)

### 7.6 quality-gates.js TC (12+)
- [ ] `ACTIVE_GATES_BY_PHASE['plan']` → `['M8']` (Master Plan §12.1 일치)
- [ ] `ACTIVE_GATES_BY_PHASE['qa']` → `['M1', 'M3', 'S1']`
- [ ] `ACTIVE_GATES_BY_PHASE['report']` → `['M10', 'S2', 'S4']`
- [ ] `evaluateGate(sprint, 'M1')` with matchRate 100 → `{ current: 100, threshold: 100, passed: true }`
- [ ] `evaluateGate(sprint, 'M3')` with 1 critical issue → `{ passed: false }`
- [ ] `evaluatePhase(sprint, 'qa')` 모든 active gate PASS → `allPassed: true`
- [ ] `evaluatePhase(sprint, 'qa')` 1 gate fail → `allPassed: false, results: {...}`
- [ ] M1/M2/M3/M4/M5/M7/M8/M10 8 gates 평가 정확
- [ ] S1/S2/S4 3 sprint-specific gates 평가 정확

### 7.7 auto-pause.js TC (10+)
- [ ] `AUTO_PAUSE_TRIGGERS` 4 keys 모두 present
- [ ] `checkAutoPauseTriggers(sprint with M3>0)` → QUALITY_GATE_FAIL fires
- [ ] `checkAutoPauseTriggers(sprint with iter=5 matchRate=80)` → ITERATION_EXHAUSTED fires
- [ ] `checkAutoPauseTriggers(sprint with cumulativeTokens > budget)` → BUDGET_EXCEEDED fires
- [ ] `checkAutoPauseTriggers(sprint with phase enteredAt 5h ago, config.phaseTimeoutHours=4)` → PHASE_TIMEOUT fires
- [ ] `checkAutoPauseTriggers(healthy sprint)` → `[]` (empty)
- [ ] `pauseSprint` updates status to 'paused' + appends pauseHistory
- [ ] `resumeSprint` blocked when trigger not resolved → `{ ok: false, blockedReason: 'trigger_not_resolved' }`
- [ ] `resumeSprint` unblocked → `{ ok: true, sprint: { status: 'active', ... } }`
- [ ] disarmed trigger does not fire even when condition met

### 7.8 start-sprint.usecase E2E TC (5+)
- [ ] L3 sprint full PRD → ... → report (mock deps) → `{ ok: true, finalPhase: 'report' }`
- [ ] L4 sprint full PRD → ... → archived → `{ ok: true, finalPhase: 'archived' }`
- [ ] L0 sprint stops at 'plan' → `{ ok: true, finalPhase: 'plan' }`
- [ ] Sprint with iteration trigger fires → `{ ok: false, pauseTrigger: 'ITERATION_EXHAUSTED' }`
- [ ] Invalid input → `{ ok: false, reason: 'invalid_input', errors: [...] }`

### 7.9 Integration TC (15+)
- [ ] Sprint 1 imports 통합 (8 modules 모두 createSprint / canTransitionSprint / SprintEvents 사용)
- [ ] Sprint 3 mock state-store inject → use case 정상 동작
- [ ] Sprint 4 mock skill handler → startSprint 호출 → result 반환
- [ ] PDCA `lib/application/pdca-lifecycle/` import 0건 검증 (grep)
- [ ] Parallel spawn (Promise.all / Promise.race) grep 0건
- [ ] cloneSprint 사용 일관 (직접 mutation 0건)
- [ ] SprintEvents emission point 5건 (created/phaseChanged/archived/paused/resumed)
- [ ] ACTIVE_GATES_BY_PHASE Master Plan §12.1 일치
- [ ] SPRINT_AUTORUN_SCOPE Master Plan §11.2 일치 (단 SPRINT_AUTORUN_SCOPE는 lib/control/에 가도록 Sprint 4 통합)

### 7.10 Documentation (Iterate 단계)
- [ ] 8 modules 모두 JSDoc 100% (file header + function header + typedef import)
- [ ] @version: 2.1.13 (8 + index)
- [ ] @module 정확
- [ ] sequential dispatch comment (3 use case: advance-phase / verify-data-flow / iterate-sprint)
- [ ] ENH-292 reference comment 명시 (start-sprint orchestration 등)

---

## 8. Cross-Sprint Dependency

### 8.1 Sprint 1 → Sprint 2 (consume)

Sprint 2 use case가 Sprint 1의 다음 exports를 사용:

| Sprint 1 export | Sprint 2 consumer |
|----------------|-------------------|
| `SPRINT_PHASES` (enum) | 8 modules (phase string literal 회피) |
| `SPRINT_PHASE_ORDER` | start-sprint (next phase 결정) |
| `canTransitionSprint` | advance-phase, archive-sprint |
| `legalNextSprintPhases` | start-sprint (intent-router 보조) |
| `createSprint` | start-sprint |
| `cloneSprint` | 8 modules 모두 (immutable update) |
| `isValidSprintName` | start-sprint |
| `validateSprintInput` | start-sprint |
| `SprintEvents.SprintCreated` | start-sprint |
| `SprintEvents.SprintPhaseChanged` | advance-phase |
| `SprintEvents.SprintArchived` | archive-sprint |
| `SprintEvents.SprintPaused` | auto-pause |
| `SprintEvents.SprintResumed` | auto-pause |
| `sprintPhaseDocPath` | generate-report |
| 14 @typedef | 8 modules (JSDoc @typedef import) |

### 8.2 Sprint 2 → Sprint 3 (Infrastructure 통합 준비)

Sprint 3가 Sprint 2의 다음 deps inject:

| Sprint 2 deps key | Sprint 3 adapter |
|------------------|-----------------|
| `stateStore` | `lib/infra/sprint/state-store.adapter.js` |
| `eventEmitter` | `lib/infra/sprint/telemetry.adapter.js` |
| `gateEvaluator` | (default Sprint 2 `quality-gates.evaluatePhase`) |
| `autoPauseChecker` | (default Sprint 2 `auto-pause.checkAutoPauseTriggers`) |
| `gapDetector` | `lib/infra/sprint/gap-detector.adapter.js` (Sprint 4) |
| `autoFixer` | `lib/infra/sprint/auto-fixer.adapter.js` (Sprint 4) |
| `dataFlowValidator` | `lib/infra/sprint/data-flow.adapter.js` (Sprint 4) |
| `docPathResolver` | (default Sprint 1 `sprintPhaseDocPath`) |
| `fileWriter` | `lib/infra/sprint/file-writer.adapter.js` (Sprint 3) |
| `kpiCalculator` | (default Sprint 2 internal pure function) |
| `clock` | `lib/infra/clock.adapter.js` (이미 존재 확인) |

### 8.3 Sprint 2 → Sprint 4 (Presentation 통합 준비)

Sprint 4가 Sprint 2의 다음 exports 호출:

| Sprint 2 export | Sprint 4 consumer |
|----------------|-------------------|
| `startSprint` | `/sprint start` skill handler |
| `advancePhase` | `/sprint advance` skill handler |
| `pauseSprint` / `resumeSprint` | `/sprint pause` / `/sprint resume` skill handler |
| `archiveSprint` | `/sprint archive` skill handler |
| `checkAutoPauseTriggers` | Stop hook (script) |
| `evaluatePhase` | UserPromptSubmit hook (proactive gate check) |
| `AUTO_PAUSE_TRIGGERS` | sprint-orchestrator agent body (4 triggers explainer) |
| `ACTIVE_GATES_BY_PHASE` | sprint-orchestrator agent body (phase gate ref) |
| `SEVEN_LAYER_HOPS` | sprint-qa-flow agent body (7-Layer hop ref) |

### 8.4 PDCA invariant (변경 0건)

| Existing module | Sprint 2 변경 |
|----------------|-------------|
| `lib/application/pdca-lifecycle/phases.js` | 0 |
| `lib/application/pdca-lifecycle/transitions.js` | 0 |
| `lib/application/pdca-lifecycle/index.js` | 0 |
| `lib/domain/sprint/*` (Sprint 1) | 0 |

→ ADR 0005 Application Pilot pattern 보존 / Sprint 1 commit `a7009a5` immutable 유지.

---

## 9. Plan 완료 Checklist

- [x] Context Anchor 복사 (PRD §0)
- [x] Requirements R1-R9 (8 modules + barrel 확장, 각 file public API + JSDoc + @version + @module)
- [x] Out-of-scope 매트릭스 (Sprint 3~6 분배 + 사용자 8개국어 트리거 Sprint 4)
- [x] Feature Breakdown 8 modules + 1 barrel (LOC est. ~1,200)
- [x] Quality Gates 17건 활성
- [x] Risks & Mitigation (PRD 10 + Sprint 2 specific 15 = 25 risks)
- [x] Document Index 6 phase 산출물
- [x] Implementation Order 11 steps (leaf-first, orchestrator-last)
- [x] Acceptance Criteria 10 groups (Static / Runtime / advance / iterate / verify / gates / auto-pause / start / Integration / Documentation)
- [x] Cross-Sprint Dependency Sprint 1→2 / 2→3 / 2→4 + PDCA invariant 0건

---

**Next Phase**: Phase 3 Design — 현재 코드베이스 (lib/application/pdca-lifecycle/ + lib/domain/sprint/ + lib/control/ + Master Plan §11/12) 깊이 분석 + 8 modules 정확한 구현 spec (file:line 인용) + §8 Test Plan Matrix (L2 60+ TC).
