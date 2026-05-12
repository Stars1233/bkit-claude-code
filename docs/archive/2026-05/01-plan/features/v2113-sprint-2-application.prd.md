# Sprint 2 PRD — v2.1.13 Sprint Management Application Core (Auto-Run Engine)

> **Sprint ID**: `v2113-sprint-2-application`
> **Sprint of Master Plan**: 2/6 (Application Core — Auto-Run Engine)
> **Phase**: PRD (1/7)
> **Status**: Active
> **Date**: 2026-05-12
> **Trust Level (override)**: L4 (사용자 명시)
> **Master Plan**: `docs/01-plan/features/sprint-management.master-plan.md` v1.1
> **ADRs**: 0007 / 0008 / **0009 (★ auto-run + Trust scope + auto-pause — 본 Sprint 2 핵심)**
> **Depends on**: Sprint 1 Domain Foundation (commit `a7009a5`, completed)
> **Branch**: `feature/v2113-sprint-management`

---

## 0. Context Anchor (Master Plan §1에서 복사 — Plan/Design/Do/Iterate/QA/Report 모든 phase에 전파)

| Key | Value |
|-----|-------|
| **WHY** | Sprint Management의 **product core**. ADR 0009의 auto-run engine을 영구화하여 `/sprint start {name}` 명령이 PRD/Plan → Design → Do → Iterate → QA → Report → (L4: Archive) 자율 실행을 가능하게 한다. Sprint 1 Domain Foundation 위에 8 application use cases를 올려 사용자가 자신의 프로젝트 sprint를 PDCA-style 자동 운영할 수 있는 첫 실질 가치. **bkit 차별화 #3 (ENH-292 sequential dispatch moat)** 자기적용 결정적 sprint. |
| **WHO** | (1차) bkit 사용자 — `/sprint start` 호출로 auto-run 실행 (Sprint 4 Presentation에서 표면화). (2차) Sprint 3 Infrastructure 작업자 — state-store + telemetry를 use case에 주입. (3차) Sprint 4 Skill/Agent — skill handler가 use case 호출. (4차) bkit core CI — 기존 PDCA 9-phase invariant 깨짐 0건 보장. (5차) audit-logger — SprintEvents 5건 emission point. |
| **RISK** | (a) **★ Auto-run runaway loop**: start-sprint usecase가 advance-phase를 무한 재호출 → 사용자 토큰 폭증. mitigation: 4 auto-pause triggers (Quality Gate fail / iterate exhausted / budget exceeded / phase timeout) 강제 활성화 + maxIterations 5 hard cap + Stop hook마다 trigger 평가. (b) **Trust Level scope 정확성**: L0~L4 별 stopAfter 매핑이 잘못되면 사용자 결정 D11 위반. (c) **PDCA 9-phase invariant 깨짐**: Sprint use case가 PDCA use case import 시 layer 충돌. (d) **Sprint 1 Domain import 누락**: createSprint / canTransitionSprint / SprintEvents 잘못 사용 시 schema 깨짐. (e) **ENH-292 sequential dispatch 미적용**: cto-lead/qa-lead 같은 specialist agents spawn 시 parallel 사용 시 caching 10x 회귀 (#56293 9-streak). (f) **Quality Gates 평가 누락**: M1-M10 + S1-S4 활성 gate 일부 미평가 시 QA 통과 가능. (g) **Phase 전이 atomicity**: advance-phase 실행 중 crash 시 state 일관성 깨짐 — Sprint 3에서 atomic write로 보강. (h) **Resume 흐름 복잡도**: 4 pause trigger 각각 resume 조건 다름 — 사용자 confusion 위험. (i) **JSDoc type 누락**: Sprint 1 entity의 14 @typedef 사용 시 type narrowing 부족. |
| **SUCCESS** | (1) **`/sprint start my-sprint` E2E** (mock state) → Trust L3 default 시 PRD → ... → Report 자율 진행 (in-memory simulation). (2) **4 auto-pause triggers 각각 발화 검증** — QUALITY_GATE_FAIL / ITERATION_EXHAUSTED / BUDGET_EXCEEDED / PHASE_TIMEOUT mock state로 시뮬레이션 후 paused 상태 진입 확인. (3) **Trust Level 5-scope 검증** — L0/L1/L2/L3/L4 각각의 stopAfter 정확. (4) **matchRate 100% loop** — verify iterate-sprint.usecase에서 matchRate <100% 시 advance-phase 재호출, 100% 도달 시 qa로 advance. (5) **PDCA 9-phase invariant 보존** — lib/application/pdca-lifecycle/ 변경 0건, 본 Sprint 사용 imports 0건. (6) **Sprint 1 Domain import 통합** — 8 use cases 모두 require('../../../domain/sprint') + require('./phases') + require('./transitions'). (7) **Quality Gates evaluator** — quality-gates.js가 M1-M10 + S1-S4 활성 매트릭스 정확히 평가. (8) **ENH-292 sequential dispatch 명시** — advance-phase + verify-data-flow + iterate-sprint use case의 multi-agent spawn 패턴이 sequential 만 (parallel 0건). (9) **L2 integration TC 60+건 100% PASS**. (10) **Sprint 3 Infrastructure가 Sprint 2 의존성 import 가능** — mock TC로 사전 검증. |
| **SCOPE** | **In-scope 8 modules** in `lib/application/sprint-lifecycle/`: (a) `start-sprint.usecase.js` — auto-run loop entry point, (b) `advance-phase.usecase.js` — Trust scope-aware 전이, (c) `iterate-sprint.usecase.js` — matchRate 100% loop max 5, (d) `verify-data-flow.usecase.js` — 7-Layer UI→API→DB→API→UI 검증 (S1 gate), (e) `generate-report.usecase.js` — cumulative KPI + lesson learned, (f) `archive-sprint.usecase.js` — terminal state + carry items 식별, (g) `quality-gates.js` — M1-M10 + S1-S4 evaluator, (h) `auto-pause.js` — 4 triggers + checkAutoPauseTriggers + pauseSprint + resumeSprint. **lib/application/sprint-lifecycle/index.js** 확장 (barrel 9 → ~25 exports). **Out-of-scope (Sprint 3~6)**: state persistence (Sprint 3), telemetry emission (Sprint 3), matrix sync (Sprint 3), skill/agent/hook/template (Sprint 4), `/control` lib/control/automation-controller.js 확장 (★ Sprint 2 partial — SPRINT_AUTORUN_SCOPE 정의만), full integration test (Sprint 5), Release (Sprint 6). **Tests**: L2 integration only (L1 Sprint 1 완료, L3+ Sprint 5에서). |

---

## 1. Problem Statement

Sprint 1에서 frozen domain (phases enum + transitions adjacency + entity factory + validators + events)을 영구화했으나 **runtime use case가 없음**. 사용자가 `/sprint start my-sprint` 호출 시 실행할 코드 없음. Master Plan v1.1 §11.2 SPRINT_AUTORUN_SCOPE + §11.3 Auto-Pause Triggers를 코드로 실체화하지 않으면 사용자 가치 0건.

### 1.1 부재한 기능 (현 commit `a7009a5` 상태)

| 부재 | 영향 |
|------|------|
| `start-sprint.usecase` 없음 | Sprint instantiation 불가 (createSprint 호출만 있고 phase 진입 + auto-run 시작 흐름 부재) |
| `advance-phase.usecase` 없음 | canTransitionSprint 검증만 있고 실제 sprint state.phase 변경 + Trust scope-aware logic 부재 |
| `iterate-sprint.usecase` 없음 | matchRate <100% 시 자동 iterate 진입 + max 5 cycle 보장 + 100% 도달 시 qa advance 흐름 부재 (사용자 요구사항 핵심) |
| `verify-data-flow.usecase` 없음 | qa phase의 UI→API→DB→API→UI 7-Layer 검증 (S1 gate) 부재 (사용자 요구사항 핵심) |
| `generate-report.usecase` 없음 | report phase의 cumulative KPI + lesson learned + carry items 자동 작성 부재 |
| `archive-sprint.usecase` 없음 | archive 종료 + readonly 전환 + 다음 sprint fork 후보 식별 부재 |
| `quality-gates.js` 없음 | M1-M10 + S1-S4 평가 logic 부재 — Sprint 1의 quality gate threshold만 정의되어 있고 evaluator 없음 |
| `auto-pause.js` 없음 | 4 auto-pause triggers 평가 + paused 상태 진입 + resume 흐름 부재 (사용자 안전핀 핵심) |

### 1.2 ADR 0009 사양과 코드 gap

ADR 0009 §결정1~6에서 결정한 사양:
1. `/sprint start` default = auto-run ← code 부재
2. Trust Level scope (L0~L4 SPRINT_AUTORUN_SCOPE) ← code 부재 (단 lib/control/automation-controller.js 확장 필요)
3. 4 Auto-Pause Triggers ← code 부재 (DEFAULT_AUTO_PAUSE_ARMED는 entity.js에 있으나 실제 평가 logic 부재)
4. Dashboard Modes ← Sprint 4 Presentation
5. Resume 흐름 ← code 부재
6. State Schema v1.1 ← Sprint 1에 영구화됨 ✓

### 1.3 사용자 안전핀 4건 코드 실체화 필요

사용자 결정 D12 (2026-05-12) — auto-pause 4 triggers 모두 활성화:
- QUALITY_GATE_FAIL (M3>0, S1<100) — code 없음
- ITERATION_EXHAUSTED (matchRate<90 after 5 iter) — code 없음
- BUDGET_EXCEEDED (cumulativeTokens > config.budget) — code 없음
- PHASE_TIMEOUT (phase elapsed > config.phaseTimeoutHours) — code 없음

### 1.4 ENH-292 Sequential Dispatch moat 자기적용

bkit 차별화 #3 (ENH-292 P0, #56293 9-streak 결정적). Sprint 2의 advance-phase / verify-data-flow / iterate-sprint use case가 multi-agent spawn (cto-lead / qa-lead 등) 시 sequential 강제. Sprint 4 Presentation에서 sprint-orchestrator agent가 본 use case를 호출하므로 본 Sprint 2의 패턴이 root reference.

---

## 2. Job Stories (JTBD 6-Part)

### Job Story 1 — bkit 사용자 (`/sprint start` E2E)
- **When** 사용자가 자신의 프로젝트 sprint를 빠르게 진행하고 싶을 때,
- **I want to** `/sprint start my-sprint` 한 명령으로 Plan부터 Report까지 자율 실행하게
- **so I can** 단일 feature PDCA를 multiple times 반복하는 수동 작업을 회피하고, Trust Level scope만 결정하면 sprint orchestration이 자동화된다.

### Job Story 2 — bkit 사용자 (auto-pause 안전핀 작동)
- **When** auto-run 중 quality issue 또는 budget 초과 같은 위험 상황이 발생할 때,
- **I want to** 즉시 sprint paused 상태로 진입 + 명확한 trigger 사유 + 사용자 결정 옵션 (forward fix / abort / increase budget / etc.) 제시
- **so I can** runaway loop 또는 token 폭증 같은 catastrophic failure 회피 + 안전한 resume.

### Job Story 3 — bkit 사용자 (iterate 100% 보장)
- **When** Do phase 종료 후 matchRate가 100% 미달인 sprint를 자동 개선시키고 싶을 때,
- **I want to** iterate phase에서 max 5 cycle gap-detector → auto-fix → matchRate 재측정 loop 자동 진행 (100% 도달 또는 max iter 시 자동 advance/pause)
- **so I can** "100% 구현" 목표를 manual 개입 없이 달성한다 (사용자 요구사항 핵심).

### Job Story 4 — bkit 사용자 (QA 7-Layer 데이터 흐름 검증)
- **When** Sprint의 모든 feature가 UI → API → DB → API → UI 데이터 흐름의 무결성을 검증해야 할 때,
- **I want to** qa phase에서 각 feature의 7 hops 자동 검사 + S1 dataFlowIntegrity gate 평가
- **so I can** end-to-end 데이터 흐름 깨짐을 production 진입 전 차단 (사용자 요구사항 핵심).

### Job Story 5 — Sprint 3 Infrastructure 작업자 (state-store 주입)
- **When** Sprint 3에서 sprint-state-store.js를 작성할 때,
- **I want to** Sprint 2 use case가 state-store.port를 inject 받아 dependency injection 가능
- **so I can** state persistence (load/save) 구현을 use case와 분리 + 테스트 시 mock store 주입.

### Job Story 6 — Sprint 4 Skill handler (use case 호출)
- **When** Sprint 4에서 skills/sprint/SKILL.md의 `/sprint start` action handler를 작성할 때,
- **I want to** `require('lib/application/sprint-lifecycle').startSprint({ id, trustLevel, ... })` 한 함수 호출로 auto-run 시작
- **so I can** skill body는 input parsing + invocation만, business logic은 application layer에 위임.

### Job Story 7 — bkit audit-logger (SprintEvents emission)
- **When** Sprint state 변경 시 (phase 전이 / pause / resume / archive),
- **I want to** Sprint 2 use case가 SprintEvents.SprintPhaseChanged({...}) 등을 emit하면 audit-logger가 standardized log entry로 변환
- **so I can** Defense Layer 3 (audit-logger sanitizer)에서 sprint lifecycle을 표준 schema로 감사 추적.

### Job Story 8 — bkit core CI (regression 검증)
- **When** Sprint 2 PR merge 전 CI 실행 시,
- **I want to** PDCA 9-phase invariant 깨짐 0건 + Sprint 1 Domain Purity 16/16 통과 + L2 integration 100% PASS
- **so I can** safely merge to main without regression.

---

## 3. User Personas

### Persona A: bkit 사용자 (Sprint Orchestration End-user, Sprint 4 Presentation에서 표면화)
- **목표**: `/sprint start` 한 명령으로 PRD → ... → Report 자율 실행, auto-pause로 안전 보장.
- **요구사항**:
  - Trust Level 결정 시 scope 명확히 (L3 권장 default)
  - auto-pause 발생 시 즉시 알림 + 명확한 reason + 사용자 결정 옵션
  - resume 시 unblocked phase부터 재개 (이미 진행한 phase 재실행 X)

### Persona B: Sprint 후속 작업자 (Sprint 3/4 implementer)
- **목표**: Sprint 2 use case를 dependency injection 패턴으로 호출.
- **요구사항**:
  - 함수 시그니처 명확 (input + output + side effects)
  - state-store.port mock 가능
  - SprintEvents emit point 명확 (audit-logger 통합)

### Persona C: bkit core CI / arch-auditor / code-analyzer
- **목표**: regression 0건.
- **요구사항**:
  - lib/application/pdca-lifecycle/ 변경 0건
  - canTransitionSprint 시그니처 PDCA 패턴 정합
  - quality-gates evaluator가 bkit.config.json threshold 동기화

---

## 4. Solution Overview

### 4.1 8 Modules 구조

```
lib/application/sprint-lifecycle/        # Sprint 1에서 3 files → 11 files
├── phases.js                            # Sprint 1
├── transitions.js                       # Sprint 1
├── index.js                             # Sprint 1 (barrel 확장 — 9 → ~25 exports)
├── start-sprint.usecase.js              # ★ Sprint 2 신규
├── advance-phase.usecase.js             # ★ Sprint 2 신규
├── iterate-sprint.usecase.js            # ★ Sprint 2 신규 (matchRate 100% loop)
├── verify-data-flow.usecase.js          # ★ Sprint 2 신규 (7-Layer S1 gate)
├── generate-report.usecase.js           # ★ Sprint 2 신규
├── archive-sprint.usecase.js            # ★ Sprint 2 신규
├── quality-gates.js                     # ★ Sprint 2 신규 (M1-M10 + S1-S4 evaluator)
└── auto-pause.js                        # ★ Sprint 2 신규 (4 triggers + resume)
```

### 4.2 Use Case Signature (8 modules)

```javascript
// 1. start-sprint.usecase.js
async function startSprint(input, deps) → { ok, sprintId, finalPhase, pauseTrigger? }
// input: { id, name, phase?, context?, features?, config?, trustLevelAtStart?, manual?, fromPhase? }
// deps: { stateStore, eventEmitter, gateEvaluator, autoPauseChecker } — Sprint 3에서 주입
// Behavior: createSprint → save → autoRun loop until target phase reached or paused

// 2. advance-phase.usecase.js
async function advancePhase(sprint, toPhase, deps) → { ok, sprint, event, gateResults }
// 1) canTransitionSprint validation
// 2) Trust Level scope check (SPRINT_AUTORUN_SCOPE)
// 3) Active gates evaluation (quality-gates.evaluatePhase)
// 4) phaseHistory append
// 5) SprintEvents.SprintPhaseChanged emit
// 6) cloneSprint with new phase

// 3. iterate-sprint.usecase.js
async function iterateSprint(sprint, deps) → { ok, sprint, finalMatchRate, iterations }
// Loop until matchRate >= matchRateTarget (100) or iterationCount >= maxIterations (5)
// Each iteration: gapDetect (deps.gapDetector) → autoFix (deps.autoFixer) → measure
// Returns final state

// 4. verify-data-flow.usecase.js
async function verifyDataFlow(sprint, featureName, deps) → { ok, s1Score, hopResults }
// 7-Layer matrix evaluation:
//   H1 UI→Client, H2 Client→API, H3 API→Validation, H4→DB, H5→Response, H6→Client, H7→UI
// Each hop: deps.dataFlowValidator(featureName, hopId) → PASS/FAIL
// S1 dataFlowIntegrity = PASS_count / 7 * 100

// 5. generate-report.usecase.js
async function generateReport(sprint, deps) → { ok, reportContent, kpiSnapshot, carryItems }
// Cumulative KPI calc + lesson learned + carry items 식별
// deps.docPathResolver(sprintPhaseDocPath) → write to docs/04-report/...

// 6. archive-sprint.usecase.js
async function archiveSprint(sprint, deps) → { ok, sprint, kpiSnapshot, archiveEvent }
// Final gates check (S4 archiveReadiness)
// status = 'archived', archivedAt = now
// SprintEvents.SprintArchived emit
// readonly transition

// 7. quality-gates.js
function evaluateGate(sprint, gateKey) → { current, threshold, passed }
function evaluatePhase(sprint, phase) → { allPassed, results: { [gateKey]: result } }
const ACTIVE_GATES_BY_PHASE = Object.freeze({ prd: [], plan: ['M8'], design: ['M4','M8'], do: ['M2','M7','M5'], iterate: ['M1'], qa: ['M1','M3','S1'], report: ['M10','S2','S4'] });

// 8. auto-pause.js
function checkAutoPauseTriggers(sprint, env) → Array<TriggerHit>
function pauseSprint(sprint, triggers, deps) → { ok, sprint, pauseEvent }
function resumeSprint(sprint, deps) → { ok, sprint, resumeEvent, blockedReason? }
const AUTO_PAUSE_TRIGGERS = Object.freeze({ QUALITY_GATE_FAIL: {...}, ITERATION_EXHAUSTED: {...}, BUDGET_EXCEEDED: {...}, PHASE_TIMEOUT: {...} });
```

### 4.3 Auto-Run FSM (Core Logic)

```
                 ┌──────────────────────────────────────────────────────┐
                 │  /sprint start my-sprint (entry)                     │
                 └──────────────────────┬───────────────────────────────┘
                                        ▼
                              startSprint.usecase
                                        │
                                        ▼
                           ┌──────── createSprint (Sprint 1) ────────┐
                           │  Validate input via validateSprintInput │
                           │  Apply DEFAULT_CONFIG                   │
                           │  Set autoRun.scope per Trust Level       │
                           │  Save state                              │
                           └────────────────┬──────────────────────────┘
                                            │
                                            ▼
                       ┌─────────── autoRun loop ───────────┐
                       │ while (currentPhase !== target):    │
                       │   1) checkAutoPauseTriggers          │◀── Stop hook이 호출
                       │      if fired → pauseSprint, exit    │
                       │   2) evaluatePhase quality gates     │
                       │      if not allPassed:               │
                       │         if can fix → iterate loop    │
                       │         else → pauseSprint, exit     │
                       │   3) advancePhase to next            │
                       │      (canTransitionSprint check)     │
                       │   4) Special phase handlers:         │
                       │      - iterate: iterateSprint loop   │
                       │      - qa: verifyDataFlow            │
                       │      - report: generateReport        │
                       │      - archived: archiveSprint       │
                       │   5) Save state, emit event          │
                       └────────────────────┬─────────────────┘
                                            ▼
                              currentPhase === target  → DONE
                                            ▼
                              return { ok, sprintId, finalPhase, pauseTrigger? }
```

### 4.4 ENH-292 Sequential Dispatch 자기적용

| Use case | Multi-agent spawn 위치 | Sequential vs Parallel |
|----------|---------------------|----------------------|
| advance-phase | Sprint 4 sprint-orchestrator agent | **Sequential** (cto-lead → qa-lead → ...) |
| verify-data-flow | sprint-qa-flow agent + chrome-qa adapter | **Sequential** (각 hop별 검증 1번에 하나) |
| iterate-sprint | gap-detector + pdca-iterator | **Sequential** (gap → fix → re-measure) |

→ Sprint 2 use case body에 명시 + Sprint 4 sprint-orchestrator agent body로 전파.

### 4.5 Dependency Injection (Sprint 3 통합 준비)

```javascript
// Sprint 2 use case는 deps 객체를 받음 (Inversion of Control)
async function startSprint(input, deps = {}) {
  const stateStore   = deps.stateStore   || /* default mock */;
  const eventEmitter = deps.eventEmitter || /* default noop */;
  const gateEvaluator = deps.gateEvaluator || require('./quality-gates').evaluatePhase;
  const autoPauseChecker = deps.autoPauseChecker || require('./auto-pause').checkAutoPauseTriggers;
  // ...
}
```

→ Sprint 3에서 real adapter 주입 (sprint-state-store.js / sprint-telemetry.js).

---

## 5. Success Metrics

### 5.1 정량 메트릭

| Metric | Target | 측정 방법 |
|--------|--------|----------|
| M1 matchRate (Design ↔ Code) | ≥90 (목표 100) | gap-detector |
| M2 codeQualityScore | ≥80 | code-analyzer |
| M3 criticalIssueCount | 0 | code-analyzer |
| M4 apiComplianceRate | ≥95 | function signature check |
| M5 runtimeErrorRate | ≤1 | TC execution |
| M7 conventionCompliance | ≥90 | ESLint + manual |
| M8 designCompleteness | ≥85 | Design doc check |
| Domain Purity | 16+ files (Sprint 1 base + Sprint 2 not in Domain) | check-domain-purity.js Exit 0 |
| PDCA 9-phase invariant | 변경 0 | git diff lib/application/pdca-lifecycle/ |
| Sprint 1 imports | 8/8 use cases import Sprint 1 | grep |
| Auto-pause triggers | 4/4 평가 | TC L2-04~07 |
| Trust Level scopes | 5/5 (L0~L4) | TC L2-08 |
| matchRate 100% loop | iterate cycle max 5 | TC L2-09 |
| 7-Layer S1 gate | hops 7/7 | TC L2-10 |
| L2 integration TC | 60+건 100% PASS | node test runner |
| LOC | ~1,100 (Sprint 1 +68%) | wc -l |

### 5.2 정성 메트릭
- Use case body가 use case 책임만 (state mutation은 별도 함수, 외부 I/O는 deps)
- ENH-292 sequential dispatch 패턴 명시적 (comment + Sprint 4 가이드)
- JSDoc type 풍부 (Sprint 1 entity type 활용)
- Error path 명확 (fail-open application pattern)

---

## 6. Out-of-scope (Sprint 2 명시 제외)

| 항목 | 위치 | Sprint |
|------|------|--------|
| Sprint Infrastructure (state-store + telemetry + matrix-sync + doc-scanner) | `lib/infra/sprint/` | Sprint 3 |
| Skill / Agent definitions | skills/sprint/, agents/sprint-* | Sprint 4 |
| Hook scripts 확장 | scripts/* | Sprint 4 |
| Templates | templates/sprint/ | Sprint 4 |
| `/control` automation-controller.js full integration | lib/control/automation-controller.js | Sprint 2 partial (SPRINT_AUTORUN_SCOPE 정의만, full integration은 Sprint 4) |
| Trust Score sprint completion impact | lib/control/trust-engine.js | Sprint 2 명시적 X (Open D4 = defer) |
| README / CLAUDE.md sprint user guide | docs/ | Sprint 5 |
| BKIT_VERSION bump | bkit.config.json 등 5-loc | Sprint 6 |
| L3/L4/L5 tests | tests + test/contract | Sprint 5 |
| ENH-303 PostToolUse continueOnBlock 통합 | scripts/skill-post.js | Sprint 4 |
| ENH-286 Memory Enforcer master plan 보호 | scripts/pre-write.js | Sprint 4 |
| 8개국어 자동 트리거 키워드 적용 | skills/sprint/SKILL.md + agents/sprint-*.md frontmatter | Sprint 4 (사용자 명시) |

### 6.1 ★ 사용자 명시 사항 (Sprint 4에서 결정적 적용)

사용자가 본 Sprint 2 시작 시 명시:
> "skills, agents는 YAML frontmatter가 중요하며 8개국어 자동 트리거 키워드와 @docs 문서를 제외하고는 모두 영어로 구현해야해"

→ **Sprint 2는 lib/application/만 손대므로 skills/agents 미생성**. 본 사용자 결정은 **Sprint 4 (Presentation)에서 결정적 적용** — Sprint 4 PRD/Plan에서 다음 항목 명시 반영:
- skills/sprint/SKILL.md frontmatter (name / description / allowed-tools / triggers)
- 4 agents/sprint-*.md frontmatter (name / description / allowed-tools / model / triggers)
- `triggers:` 필드에 8개국어 (EN, KO, JA, ZH, ES, FR, DE, IT) 키워드 풀세트
- code (lib + scripts + skill body + agent body) 모두 영어
- docs/ 폴더 (PRD + Plan + Design + Iterate + QA + Report) 만 한국어
- 본 Sprint 2 코드 자체도 영어 (Sprint 1과 동일)
- @docs reference (`@docs/04-report/...` 같은 mention) 제외

본 Sprint 2의 모든 use case code도 **영어 주석/identifier** 유지 (Sprint 1과 동일).

---

## 7. Stakeholder Map

| Stakeholder | Role | Sprint 2 영향 |
|------------|------|--------------|
| **kay kim** | Decision maker / Implementer | 모든 phase 진행 |
| **Sprint 1 Domain** | Foundation | 8 use cases가 Sprint 1 enum/entity/validators/events import |
| **Sprint 3 Infrastructure** | Future consumer | deps injection 패턴 사전 검증 (mock) |
| **Sprint 4 Presentation** | Future consumer | use case API contract 보존 |
| **lib/control/automation-controller.js** | Existing | SPRINT_AUTORUN_SCOPE 추가 (partial 확장) |
| **lib/application/pdca-lifecycle/** | Invariant | 변경 0건 (PDCA 9-phase 보존) |
| **scripts/check-domain-purity.js** | CI gate | sprint-lifecycle은 Application layer이므로 무관 (Sprint 1 domain만 검증 대상) |
| **bkit 사용자** | End-user | Sprint 4에서 표면화 |
| **audit-logger** | Defense Layer 3 | SprintEvents emit point (Sprint 2에서 정의, Sprint 4 통합) |

---

## 8. Pre-mortem (실패 시나리오 + 사전 방지)

### Scenario A: Auto-run runaway loop (start-sprint usecase 무한 반복)
- **영향**: 토큰 폭증, context 폭주, 사용자 시간 낭비
- **방지**: 
  - maxIterations 5 hard cap (DEFAULT_CONFIG, Sprint 1 영구화)
  - 4 auto-pause triggers 강제 활성화 (DEFAULT_AUTO_PAUSE_ARMED, Sprint 1)
  - Stop hook마다 checkAutoPauseTriggers 평가 (Sprint 4 통합)
  - Phase timeout 4h hard cap

### Scenario B: PDCA 9-phase invariant 깨짐
- **영향**: ADR 0005 위반, bkit core 회귀
- **방지**: 
  - Sprint 2 use case는 PDCA enum 절대 import 안 함 (Sprint enum만)
  - git diff lib/application/pdca-lifecycle/ → 변경 0건 확인 (Phase 6 QA)

### Scenario C: Sprint 1 Domain import 실패 (require path)
- **영향**: 8 use cases 모두 runtime crash
- **방지**: 
  - relative path `require('../../domain/sprint')` 통일 (Sprint 1 패턴)
  - TC L2-01에서 모든 use case의 Sprint 1 import 검증

### Scenario D: canTransitionSprint return shape 잘못 처리
- **영향**: advance-phase가 `{ ok: false, reason: ... }`을 boolean으로 처리 시 falsy / truthy 혼동
- **방지**: 
  - JSDoc `@returns { ok, reason? }` 명시
  - advance-phase 코드에 `if (!result.ok)` 패턴 일관 사용

### Scenario E: 4 Auto-Pause Triggers 평가 누락
- **영향**: 사용자 안전핀 미작동, runaway 위험
- **방지**: 
  - checkAutoPauseTriggers가 4 triggers 모두 순회 보장
  - TC L2-04/05/06/07 각 trigger 단독 발화 검증

### Scenario F: Quality Gates ACTIVE_GATES_BY_PHASE 매트릭스 불일치 (Master Plan §12.1과)
- **영향**: gate 평가 결과 잘못 → phase advance 잘못
- **방지**: 
  - Master Plan §12.1 매트릭스 file:line 인용으로 Design phase에 명시
  - quality-gates.js의 ACTIVE_GATES_BY_PHASE를 Master Plan과 일치

### Scenario G: Trust Level scope L4 misclassification (L3 사용자가 archive까지 도달)
- **영향**: 사용자 결정 D11 위반, safety 깨짐
- **방지**: 
  - SPRINT_AUTORUN_SCOPE Object.freeze
  - TC L2-08 5 levels (L0~L4) 각 stopAfter 검증

### Scenario H: ENH-292 Sequential Dispatch 미적용
- **영향**: bkit 차별화 #3 깨짐, caching 10x 회귀 위험
- **방지**: 
  - 본 Sprint 2 use case body에 sequential 패턴 명시 + Sprint 4 sprint-orchestrator agent body 전파
  - parallel spawn 0건 확인 (Phase 6 QA에서 grep)

### Scenario I: Resume 흐름 trigger 검증 불일치
- **영향**: pause 사유 미해소 상태에서 resume 진입 → 즉시 재paused
- **방지**: 
  - resumeSprint가 trigger 별 resolution 검증 (예: budget 증액 / matchRate 회복 / timeout reset / quality gate fix)
  - 미해소 시 `{ ok: false, blockedReason }` 반환 + Sprint 4 AskUserQuestion 흐름

### Scenario J: state mutation 부주의 (Sprint 1 frozen object mutation 시도)
- **영향**: 갱신 silent fail, state 일관성 깨짐
- **방지**: 
  - cloneSprint 사용 (Sprint 1 immutable helper)
  - DEFAULT_CONFIG / DEFAULT_QUALITY_GATES 등 frozen objects는 spread copy 후 update

---

## 9. Sprint 2 Phase 흐름 (자체 PDCA 7-phase)

| Phase | Status | 산출물 | 소요 |
|-------|--------|--------|------|
| PRD | ✅ 본 문서 | `docs/01-plan/features/v2113-sprint-2-application.prd.md` | (완료) |
| Plan | ⏳ | `docs/01-plan/features/v2113-sprint-2-application.plan.md` | 30분 |
| Design | ⏳ | `docs/02-design/features/v2113-sprint-2-application.design.md` (★ 코드베이스 분석) | 2시간 |
| Do | ⏳ | 8 use cases 구현 (~1,100 LOC) | 3시간 |
| Iterate | ⏳ | matchRate 100% 목표 | 30-60분 |
| QA | ⏳ | --plugin-dir . 60+ TC | 1.5시간 |
| Report | ⏳ | 종합 보고서 | 30분 |

**총 소요 estimate**: 8-10시간 (Sprint 1의 ~3시간 대비 2.5x — 8 modules + auto-run FSM 복잡도).

---

## 10. PRD 완료 Checklist

- [x] Context Anchor 5건 모두 작성
- [x] Problem Statement 4건 (부재 / ADR 0009 gap / 안전핀 4건 / ENH-292)
- [x] Job Stories 8건 (사용자 ×3 + Sprint 3/4 ×2 + audit-logger + CI + 후속작업자)
- [x] User Personas 3건
- [x] Solution Overview (8 modules + use case signature + auto-run FSM + ENH-292 + DI)
- [x] Success Metrics 정량 14건 + 정성 4건
- [x] Out-of-scope 매트릭스 (Sprint 3~6 + 사용자 명시 8개국어 트리거 Sprint 4 결정적 적용 명시)
- [x] Stakeholder Map 9건
- [x] Pre-mortem 10 시나리오

---

**Next Phase**: Phase 2 Plan — Requirements R1-R8 + Out-of-scope + Feature Breakdown + Quality Gates + Risks + Document Index + Implementation Order.
