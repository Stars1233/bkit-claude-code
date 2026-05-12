# Sprint 1 PRD — v2.1.13 Sprint Management Domain Foundation

> **Sprint ID**: `v2113-sprint-1-domain` (kebab-case unique)
> **Sprint of Master Plan**: 1/6 (Domain Foundation)
> **Phase**: PRD (1/7) — Plan → Design → Do → Iterate → QA → Report
> **Status**: Active
> **Date**: 2026-05-12
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Trust Level (override)**: L4 (사용자 명시 결정)
> **Master Plan**: `docs/01-plan/features/sprint-management.master-plan.md` v1.1
> **ADRs**: 0007 (Sprint as Meta Container) / 0008 (Sprint Phase Enum) / 0009 (Auto-Run + Trust Scope)
> **Branch**: `feature/v2113-sprint-management` (base `1aec261`)

---

## 0. Context Anchor (Master Plan §1에서 복사 — Plan/Design/Do/Iterate/QA/Report 모든 phase에 전파)

| Key | Value |
|-----|-------|
| **WHY** | bkit Sprint Management (v2.1.13)의 **frozen 도메인 모델**을 영구화하여 ADR 0007/0008/0009의 사양을 코드로 실체화한다. Sprint 8-phase enum + transitions adjacency map + 도메인 entity/validator/event를 정확히 구현하면 Sprint 2 (Auto-Run Engine)부터 Sprint 6 (Release)까지 모든 후속 sprint의 기반이 안정화된다. Sprint Management 전체 product의 안정성과 정합성을 결정하는 first stage. |
| **WHO** | (1차) bkit Sprint Management의 후속 Sprint 작업자 (Sprint 2~6 구현자), (2차) bkit core 코드 reviewer / arch-auditor / docs-code-sync CI, (3차) bkit 사용자 — 단 사용자는 Sprint 1 결과를 직접 보지 않음 (lib/domain + lib/application 내부 모듈). 사용자 가치는 Sprint 4 (Presentation)에서 표면화. |
| **RISK** | (a) **ADR 0005 패턴 위반**: PDCA phases/transitions이 lib/application/에 위치 (Application Layer Pilot)이므로 Sprint도 동일 layer에 둬야 정합. lib/domain/에 두면 ADR 0005 의도 충돌. → 정정 반영. (b) **Domain Purity 깨짐**: `lib/domain/sprint/` 신규 4 files 중 어느 하나라도 forbidden imports (fs/child_process/net/http/https/os) 포함 시 `scripts/check-domain-purity.js` CI 실패. → 12 files baseline 유지 + sprint 신규 4 files 통과 검증. (c) **canTransition 시그니처 불일치**: bkit PDCA pattern은 `{ ok, reason }` 객체 반환인데 master plan v1.1 §5.3은 boolean 반환으로 작성됨. → Sprint 1 Design 단계에서 정정. (d) **Sprint phase enum 충돌**: PDCA `PHASES.PLAN` vs Sprint `SPRINT_PHASES.PLAN` 동일 string 'plan' 사용 — namespace 분리 필수. (e) **frozen invariant 깨짐**: Object.freeze 누락 또는 nested array unfrozen 시 runtime mutation 가능 — 보안 결함. (f) **테스트 부족**: L1 unit TC 8건이 8 phases × 모든 transitions × validators × events를 전부 커버 못 함 — TC 추가 검토. (g) **사용자 인지 부담**: PDCA 9-phase vs Sprint 8-phase 동시 존재 — 가이드 문서 부족 시 혼동 (Sprint 4 README/CLAUDE.md update 의존). |
| **SUCCESS** | (1) **0 forbidden imports** — `scripts/check-domain-purity.js` Exit 0 (lib/domain/sprint/ 4 files 모두 통과). (2) **PDCA 패턴 정합 100%** — phases.js (signature 6 exports) + transitions.js (signature 3 exports, `{ ok, reason }` canTransition) + index.js (barrel) 모두 PDCA 패턴 그대로. (3) **L1 unit TC 8건 100% PASS** + 추가 5건 (PDCA 패턴 정합 검증). (4) **gap-detector matchRate 100%** (Plan 요구사항 ↔ Design spec ↔ Code 모두 일치). (5) **--plugin-dir . 환경 require() 호환** — 외부 hook/skill/agent에서 `require('lib/application/sprint-lifecycle')` 및 `require('lib/domain/sprint')` 정상 동작. (6) **Sprint 2 Application Core가 본 Domain Foundation을 import 가능** — orchestration use case 작성 시 enum + transitions + validators 활용. (7) **JSDoc type 100%** — 모든 export에 @typedef + @param + @returns. (8) Total LOC 350~400 in 7 files. (9) 모든 quality gates PASS — M1 ≥90 / M2 ≥80 / M3 = 0 / M7 ≥90 / M8 ≥85 / S2 = 100. |
| **SCOPE** | **In-scope 7 files**: (a) `lib/application/sprint-lifecycle/phases.js` (SPRINT_PHASES enum + SPRINT_PHASE_ORDER + SPRINT_PHASE_SET + isValidSprintPhase + sprintPhaseIndex + nextSprintPhase), (b) `lib/application/sprint-lifecycle/transitions.js` (SPRINT_TRANSITIONS adjacency + canTransitionSprint `{ ok, reason }` + legalNextSprintPhases), (c) `lib/application/sprint-lifecycle/index.js` (barrel), (d) `lib/domain/sprint/entity.js` (Sprint factory + JSDoc type + helpers), (e) `lib/domain/sprint/validators.js` (kebab-case + context anchor schema + phase doc path), (f) `lib/domain/sprint/events.js` (SprintCreated + SprintPhaseChanged + SprintArchived + SprintPaused + SprintResumed), (g) `lib/domain/sprint/index.js` (barrel). **Out-of-scope (Sprint 2~6에서)**: Application use cases (start-sprint / advance-phase / iterate / verify-data-flow / generate-report / archive / quality-gates / auto-pause), Infrastructure (state-store / telemetry / matrix-sync / doc-scanner), Presentation (skill / agents / hooks / templates), Trust Score sprint completion impact, /sprint command surface, dashboard. **Tests**: L1 unit only (Sprint 5 통합). **Docs**: Sprint 1 PRD/Plan/Design/Iterate/QA/Report만 (사용자 가이드는 Sprint 5). |

---

## 1. Problem Statement

Master Plan v1.1과 ADR 0007/0008/0009에서 Sprint Management의 도메인 모델을 정의했으나 **코드로 실체화되지 않음**. 후속 Sprint (2~6)가 진행되려면 다음 기반이 영구화되어야 한다:

### 1.1 부재한 기능 (현 v2.1.12 상태)
- **Sprint phase enum 부재**: `SPRINT_PHASES.PRD`, `.PLAN`, `.DESIGN`, `.DO`, `.ITERATE`, `.QA`, `.REPORT`, `.ARCHIVED` 8값 frozen 객체가 없음. 후속 Sprint가 string literal 사용 시 typo / 일관성 결여 위험.
- **Sprint transitions adjacency 부재**: `SPRINT_TRANSITIONS` 8-vertex DAG (특수 케이스: do→iterate, qa→do, all→archived)가 없음. 후속 Application Layer가 transition 검증 불가.
- **Sprint entity 부재**: `Sprint` JSDoc type 정의 + factory function이 없음. State store에서 sprint 데이터 직렬화/역직렬화 시 schema validation 불가.
- **Sprint name validator 부재**: kebab-case 검증 (예: `my-launch-q2-2026` valid vs `MyLaunchQ2_2026` invalid) 부재로 file path traversal / 충돌 우려.
- **Sprint event 부재**: SprintCreated / SprintPhaseChanged / SprintArchived 5 도메인 이벤트가 없음. audit-logger / cc-regression이 sprint 이벤트 추적 불가.

### 1.2 ADR 0005 Application Layer Pilot과의 정합 요구사항
bkit PDCA의 frozen phase enum + transitions는 `lib/application/pdca-lifecycle/`에 위치한다 (file:line: `lib/application/pdca-lifecycle/phases.js:1-82`, `transitions.js:1-69`, `index.js:1-42`). Sprint phases/transitions도 **동일 패턴**으로 `lib/application/sprint-lifecycle/`에 위치해야 한다 (ADR 0008 결정 영구화).

### 1.3 PDCA `canTransition` 시그니처 정합
PDCA `canTransition(from, to)` 반환값은 **객체** `{ ok: boolean, reason?: string }` (file:line `lib/application/pdca-lifecycle/transitions.js:44-51`). 단순 boolean 반환이 아님. Sprint `canTransitionSprint`도 **동일 시그니처** 필수 — 정합성 + 향후 reason logging / error message 일관성.

### 1.4 Domain Purity invariant
bkit `lib/domain/` 12 files baseline은 **0 forbidden imports** (fs/child_process/net/http/https/os/dns/tls/cluster) — file:line `scripts/check-domain-purity.js:17`. Sprint Domain 신규 4 files도 이 invariant 유지 필수. CI gate (`scripts/check-domain-purity.js`) Exit 0 보장.

---

## 2. Job Stories (Pawel Huryn JTBD 6-Part)

### Job Story 1 — Sprint 2 작업자 (Application Layer Use Case 구현)
- **When** Sprint 2에서 `start-sprint.usecase.js`를 작성할 때,
- **I want to** `require('lib/application/sprint-lifecycle')`로 `SPRINT_PHASES` 및 `canTransitionSprint`를 import해서 phase 검증할 수 있게
- **so I can** auto-run loop의 phase advance 정합성을 보장한다.

### Job Story 2 — Sprint 3 작업자 (Infrastructure State Store)
- **When** Sprint 3에서 `sprint-state-store.js`가 `.bkit/state/sprints/{name}.json`을 load/save할 때,
- **I want to** `require('lib/domain/sprint').Sprint` JSDoc type으로 데이터 검증할 수 있게
- **so I can** schema 충돌 / typo / 누락 필드를 사전 차단한다.

### Job Story 3 — Sprint 4 작업자 (Presentation Skill Handler)
- **When** Sprint 4에서 `skills/sprint/SKILL.md`의 `/sprint init` 액션 핸들러가 sprint name validation을 수행할 때,
- **I want to** `require('lib/domain/sprint').isValidSprintName(name)` 호출로 kebab-case 검증할 수 있게
- **so I can** invalid name 입력 시 즉시 deny + AskUserQuestion으로 정정 제안한다.

### Job Story 4 — bkit core CI (arch-auditor + docs-code-sync)
- **When** PR review 또는 CI run 시점에,
- **I want to** `scripts/check-domain-purity.js` 자동 실행으로 sprint domain 4 files 통과 검증
- **so I can** Clean Architecture invariant 깨짐 0건을 보장한다.

### Job Story 5 — bkit audit-logger (Defense Layer 3)
- **When** 사용자가 `/sprint init` 또는 `/sprint phase` 명령을 실행할 때,
- **I want to** `require('lib/domain/sprint').SprintEvents.SprintCreated(payload)` 호출로 도메인 이벤트 객체 생성
- **so I can** audit log에 표준 schema로 sprint 이벤트를 기록한다.

### Job Story 6 — 외부 plugin 통합 (선택, 향후)
- **When** 외부 plugin이 bkit sprint 진행 상황을 조회할 때 (예: VS Code 확장),
- **I want to** `require('@bkit/sprint').SPRINT_PHASES` 같은 안정 API로 phase 명칭 사용
- **so I can** 외부 도구에서 sprint state 시각화 시 hardcoded string 사용을 회피한다.

---

## 3. User Personas

본 sprint는 bkit 내부 모듈 (lib/domain + lib/application)이므로 직접 사용자 persona는 **bkit core 작업자**.

### Persona A: bkit Sprint 후속 작업자 (Sprint 2~6 구현자)
- **이름**: kay kim (사용자 자신) 또는 contributor
- **목표**: Sprint 2 Application Core를 안전하게 시작하기 위해 Domain Foundation의 frozen contract에 의존하고 싶음.
- **요구사항**:
  - phases/transitions API가 **이번 sprint 이후 변경 0건** (frozen invariant)
  - `require()` 호환 (Node.js native)
  - JSDoc type 풍부 (IDE auto-completion)
  - error message 명확 (`{ ok: false, reason: 'invalid_from_phase' }` 같은 구조화 응답)

### Persona B: bkit core CI (arch-auditor / code-analyzer / docs-code-sync)
- **목표**: Clean Architecture invariant 깨짐 0건 유지.
- **요구사항**:
  - `scripts/check-domain-purity.js` Exit 0 보장 (forbidden imports 0)
  - `scripts/check-deadcode.js` Exit 0 (모든 export 사용처 있음 — Sprint 2~6에서 import 확정)
  - `scripts/docs-code-sync.js` 통과 (master plan의 spec과 code 100% 일치)

### Persona C: bkit core reviewer (PR 리뷰)
- **목표**: 코드가 PDCA 패턴과 정합되어 maintenance 용이.
- **요구사항**:
  - phases.js 구조 = PDCA phases.js와 동일 (export shape 일치)
  - transitions.js `canTransition` 시그니처 = PDCA와 동일
  - JSDoc + @version stamp 일관

---

## 4. Solution Overview

### 4.1 7 Files 구조 (Final)

```
lib/
├── application/
│   └── sprint-lifecycle/
│       ├── phases.js          # SPRINT_PHASES + SPRINT_PHASE_ORDER + isValidSprintPhase
│       ├── transitions.js     # SPRINT_TRANSITIONS + canTransitionSprint + legalNextSprintPhases
│       └── index.js           # barrel export
└── domain/
    └── sprint/
        ├── entity.js          # Sprint factory + JSDoc type + helpers
        ├── validators.js      # isValidSprintName + isValidSprintContext + phase doc path
        ├── events.js          # SprintCreated + SprintPhaseChanged + SprintArchived + SprintPaused + SprintResumed
        └── index.js           # barrel export
```

### 4.2 Architecture Layer 분배 (Master Plan v1.1 §3.6 정정)

| Layer | Files | Rationale |
|-------|-------|-----------|
| **Application** | phases.js, transitions.js, index.js | PDCA 패턴 정합 (ADR 0005 Pilot pattern). Phase enum + transitions은 lifecycle 관리 use case의 일부 |
| **Domain** | entity.js, validators.js, events.js, index.js | 순수 비즈니스 규칙 (no I/O). forbidden imports 0건 invariant 유지. entity는 데이터 구조 + factory, validators는 순수 함수, events는 도메인 이벤트 객체 |

### 4.3 8-Phase Enum 정확한 값 (ADR 0008 영구화)

```javascript
const SPRINT_PHASES = Object.freeze({
  PRD: 'prd',
  PLAN: 'plan',
  DESIGN: 'design',
  DO: 'do',
  ITERATE: 'iterate',
  QA: 'qa',
  REPORT: 'report',
  ARCHIVED: 'archived',
});
```

### 4.4 Transitions Adjacency Map (ADR 0008 영구화)

```javascript
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
```

### 4.5 canTransitionSprint 시그니처 (PDCA 패턴 정합)

```javascript
function canTransitionSprint(from, to) {
  if (!isValidSprintPhase(from)) return { ok: false, reason: 'invalid_from_phase' };
  if (!isValidSprintPhase(to))   return { ok: false, reason: 'invalid_to_phase' };
  if (from === to)               return { ok: true }; // idempotent
  const allowed = SPRINT_TRANSITIONS[from] || [];
  if (allowed.includes(to))      return { ok: true };
  return { ok: false, reason: 'transition_not_allowed' };
}
```

### 4.6 Sprint Entity (JSDoc type 정의)

```javascript
/**
 * @typedef {Object} Sprint
 * @property {string} id                    - kebab-case unique
 * @property {string} name                  - human-readable
 * @property {string} version               - schema version (e.g., "1.1")
 * @property {string} phase                 - SPRINT_PHASES value
 * @property {string} status                - active|paused|completed|archived
 * @property {SprintContext} context        - WHY/WHO/RISK/SUCCESS/SCOPE
 * @property {string[]} features            - feature names
 * @property {SprintConfig} config          - budget/timeout/maxIterations/...
 * @property {SprintAutoRun} autoRun        - enabled/scope/trustLevelAtStart
 * @property {SprintAutoPause} autoPause    - armed triggers + pauseHistory
 * @property {SprintPhaseHistory[]} phaseHistory
 * @property {SprintIterationHistory[]} iterateHistory
 * @property {SprintDocs} docs              - master/prd/plan/design/iterate/qa/report paths
 * @property {SprintFeatureMap} featureMap
 * @property {SprintQualityGates} qualityGates
 * @property {SprintKPI} kpi
 * @property {string} createdAt             - ISO 8601
 * @property {string|null} startedAt
 * @property {string|null} archivedAt
 */
```

### 4.7 Validators (Pure Functions)

```javascript
function isValidSprintName(name) {
  // kebab-case + 3-64자 + 영숫자+hyphen만
  return typeof name === 'string'
      && /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/.test(name)
      && !name.includes('--');
}

function isValidSprintContext(ctx) {
  // WHY/WHO/RISK/SUCCESS/SCOPE 5건 모두 non-empty string
  const REQUIRED = ['WHY', 'WHO', 'RISK', 'SUCCESS', 'SCOPE'];
  return ctx && REQUIRED.every(k =>
    typeof ctx[k] === 'string' && ctx[k].trim().length > 0
  );
}

function sprintPhaseDocPath(sprintId, phase) {
  // Master Plan §18 Document Index 매핑
  const MAP = {
    masterPlan: `docs/01-plan/features/${sprintId}.master-plan.md`,
    prd: `docs/01-plan/features/${sprintId}.prd.md`,
    plan: `docs/01-plan/features/${sprintId}.plan.md`,
    design: `docs/02-design/features/${sprintId}.design.md`,
    iterate: `docs/03-analysis/features/${sprintId}.iterate.md`,
    qa: `docs/05-qa/features/${sprintId}.qa-report.md`,
    report: `docs/04-report/features/${sprintId}.report.md`,
  };
  return MAP[phase] || null;
}
```

### 4.8 Sprint Events (5건)

```javascript
const SprintEvents = Object.freeze({
  SprintCreated: (payload) => ({
    type: 'SprintCreated',
    timestamp: new Date().toISOString(),
    payload: { sprintId: payload.sprintId, name: payload.name, phase: payload.phase },
  }),
  SprintPhaseChanged: (payload) => ({
    type: 'SprintPhaseChanged',
    timestamp: new Date().toISOString(),
    payload: { sprintId: payload.sprintId, fromPhase: payload.fromPhase, toPhase: payload.toPhase, reason: payload.reason },
  }),
  SprintArchived: (payload) => ({
    type: 'SprintArchived',
    timestamp: new Date().toISOString(),
    payload: { sprintId: payload.sprintId, archivedAt: payload.archivedAt, reason: payload.reason, kpiSnapshot: payload.kpiSnapshot },
  }),
  SprintPaused: (payload) => ({
    type: 'SprintPaused',
    timestamp: new Date().toISOString(),
    payload: { sprintId: payload.sprintId, trigger: payload.trigger, severity: payload.severity, message: payload.message },
  }),
  SprintResumed: (payload) => ({
    type: 'SprintResumed',
    timestamp: new Date().toISOString(),
    payload: { sprintId: payload.sprintId, pausedAt: payload.pausedAt, resumedAt: payload.resumedAt, durationMs: payload.durationMs },
  }),
});
```

---

## 5. Success Metrics (정량 + 정성)

### 5.1 정량 메트릭 (Quality Gates)

| Metric | Target | 측정 방법 |
|--------|--------|----------|
| M1 matchRate (Design ↔ Code) | ≥90% (목표 100%) | gap-detector |
| M2 codeQualityScore | ≥80 | code-analyzer |
| M3 criticalIssueCount | 0 | code-analyzer |
| M7 conventionCompliance | ≥90 | ESLint + manual review |
| M8 designCompleteness | ≥85 | Design doc completeness check |
| S2 featureCompletion | 100 (7/7 files) | file existence + export shape check |
| Forbidden imports | 0 | `scripts/check-domain-purity.js` Exit 0 |
| Object.freeze invariant | 100% (5/5 frozen objects) | runtime mutation throw test |
| canTransitionSprint signature match PDCA | 100% | shape diff with PDCA `canTransition` |
| L1 unit TC pass rate | 100% (13/13) | jest / node test runner |

### 5.2 정성 메트릭

- PDCA-style readability — 새로운 contributor가 phases.js를 보고 패턴을 즉시 인지 가능
- IDE auto-completion — JSDoc type 풍부로 VS Code/IntelliJ에서 phase enum + entity field 자동 제안
- Error message clarity — `canTransitionSprint('archived', 'plan')` → `{ ok: false, reason: 'transition_not_allowed' }`로 명확

---

## 6. Out-of-scope (Sprint 1에서 명시적 제외)

Sprint 1 = Domain Foundation. 다음 항목은 후속 Sprint에서:

| 항목 | 위치 | Sprint |
|------|------|--------|
| Application use cases | `lib/application/sprint-lifecycle/{start-sprint, advance-phase, iterate-sprint, verify-data-flow, generate-report, archive-sprint, quality-gates, auto-pause}.usecase.js` | Sprint 2 |
| Infrastructure (state + telemetry + matrix-sync + doc-scanner) | `lib/infra/sprint/*` | Sprint 3 |
| Skill / Agents / Hooks / Templates | `skills/sprint/`, `agents/sprint-*.md`, scripts 확장, `templates/sprint/` | Sprint 4 |
| Quality + Documentation | tests + README + CLAUDE.md + CHANGELOG + user guide | Sprint 5 |
| Release v2.1.13 | BKIT_VERSION bump + PR + tag | Sprint 6 |
| `/control` 명령 통합 (Trust Score + Auto-Pause integration) | `lib/control/automation-controller.js` 확장 | Sprint 2 (Application Core) |
| ENH-303 PostToolUse continueOnBlock | `scripts/skill-post.js` 확장 | Sprint 4 |
| ENH-286 Memory Enforcer master plan 보호 | `scripts/pre-write.js` 확장 | Sprint 4 |

---

## 7. Stakeholder Map

| Stakeholder | Role | Sprint 1 영향 |
|------------|------|--------------|
| **kay kim (사용자)** | Decision maker / Implementer | 본 Sprint 1 모든 phase 진행 |
| **bkit core 코드** | Consumer | 후속 Sprint 2~6이 본 Sprint 1 결과 의존 |
| **arch-auditor** | CI gate | `check-domain-purity.js` Exit 0 보장 |
| **code-analyzer** | Quality gate | M2/M3/M7 검증 |
| **gap-detector** | Iterate trigger | Phase 5에서 matchRate 100% 목표 |
| **docs-code-sync** | Doc gate | Design doc spec ↔ Code 일치 검증 |
| **bkit 사용자 (간접)** | End-user | Sprint 4 (Presentation)에서 표면화 |

---

## 8. Pre-mortem (실패 시나리오 + 사전 방지)

### Scenario A: ADR 0005 패턴 위반으로 lib/domain/에 phases/transitions 작성
- **영향**: Application Pilot pattern 일관성 깨짐, Sprint 2 use case가 Domain layer를 직접 import (Clean Architecture 위반)
- **방지**: Plan/Design phase에서 명시 (§4.2 Layer 분배 표) + Phase 4 Do에서 작성 위치 정확히

### Scenario B: canTransitionSprint가 boolean 반환 (PDCA 패턴 깨짐)
- **영향**: Sprint 2의 advance-phase.usecase.js가 PDCA 패턴 가정으로 작성 시 runtime TypeError
- **방지**: Design phase 명시 (§4.5) + Phase 6 QA에서 shape diff test

### Scenario C: forbidden imports 포함 (예: validators.js에서 fs 사용)
- **영향**: `scripts/check-domain-purity.js` CI 실패
- **방지**: validators는 pure functions만, 외부 의존성 X. Phase 6 QA에서 `check-domain-purity.js` 직접 실행 검증

### Scenario D: Object.freeze nested 누락 (TRANSITIONS의 array unfrozen)
- **영향**: runtime mutation 가능 — `TRANSITIONS.prd.push('do')` 같은 mutation으로 transition graph 깨짐
- **방지**: nested `Object.freeze()` 모두 적용 + Phase 6 QA에서 runtime mutation throw test

### Scenario E: JSDoc type 누락 (IDE auto-completion 부족)
- **영향**: Sprint 2~6 작업자 productivity 저하
- **방지**: Design phase에서 모든 type 정의 + Phase 4 Do에서 모든 export에 @typedef

### Scenario F: kebab-case validator 부정확 (예: 영숫자 외 허용)
- **영향**: file path traversal 위험 (`../../etc/passwd` 같은 sprint name 허용 시)
- **방지**: regex 엄격 `/^[a-z][a-z0-9-]{1,62}[a-z0-9]$/` + `--` 연속 불가 + Phase 6 QA에서 edge case 5건 검증

### Scenario G: SprintEvents가 mutable (예: type 필드 변경 가능)
- **영향**: event log 신뢰성 깨짐
- **방지**: `SprintEvents` 자체 `Object.freeze()` + factory function이 매번 새 객체 반환

---

## 9. Sprint 1 Phase 흐름 (자체 PDCA 7-phase)

| Phase | Status | 산출물 | 소요 |
|-------|--------|--------|------|
| PRD | ✅ 본 문서 | `docs/01-plan/features/v2113-sprint-1-domain.prd.md` | (완료) |
| Plan | ⏳ 다음 | `docs/01-plan/features/v2113-sprint-1-domain.plan.md` | 30분 |
| Design | ⏳ | `docs/02-design/features/v2113-sprint-1-domain.design.md` (★ 코드베이스 분석) | 1.5시간 |
| Do | ⏳ | 7 files 구현 | 2시간 |
| Iterate | ⏳ | matchRate 100% 목표 | 30분-1시간 |
| QA | ⏳ | --plugin-dir . 다양한 케이스 | 1시간 |
| Report | ⏳ | 종합 보고서 | 30분 |

**총 소요**: 6-7시간 (사용자 결정 = L4 자율 모드, "꼼꼼·완벽")

---

## 10. PRD 완료 Checklist

- [x] Context Anchor 5건 모두 작성 (WHY/WHO/RISK/SUCCESS/SCOPE)
- [x] Problem Statement 4건 (부재 기능 / ADR 0005 정합 / canTransition 시그니처 / Domain Purity)
- [x] Job Stories 6건 (Sprint 2/3/4/CI/audit-logger/외부 plugin)
- [x] User Personas 3건 (작업자 / CI / reviewer)
- [x] Solution Overview (7 files + Layer 분배 + 8-Phase enum + Transitions + canTransition + Entity + Validators + Events)
- [x] Success Metrics 정량 9건 + 정성 3건
- [x] Out-of-scope 매트릭스 (Sprint 2~6 분배)
- [x] Stakeholder Map 7건
- [x] Pre-mortem 7 시나리오 + 방지책

---

**Next Phase**: `/sprint phase v2113-sprint-1-domain plan` 또는 자동 진행 (L4 모드).
