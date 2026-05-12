# Sprint 1 Plan — v2.1.13 Sprint Management Domain Foundation

> **Sprint ID**: `v2113-sprint-1-domain`
> **Phase**: Plan (2/7)
> **Date**: 2026-05-12
> **PRD Reference**: `docs/01-plan/features/v2113-sprint-1-domain.prd.md`
> **Master Plan**: `docs/01-plan/features/sprint-management.master-plan.md` v1.1
> **ADRs**: 0007 / 0008 / 0009

---

## 0. Context Anchor (PRD §0에서 복사 — 보존 필수)

(PRD §0 동일, 생략 없이 Design/Do/Iterate/QA/Report로 전파)

| Key | Value (요약) |
|-----|------|
| **WHY** | Sprint Management v2.1.13 frozen domain model 영구화. ADR 0007/0008/0009 사양 코드 실체화. 후속 Sprint 2~6 기반 안정화 |
| **WHO** | Sprint 2~6 작업자 / bkit core CI / reviewer / audit-logger / 외부 plugin (간접) |
| **RISK** | ADR 0005 패턴 위반 / Domain Purity 깨짐 / canTransition 시그니처 불일치 / Sprint phase enum 충돌 / frozen invariant 깨짐 / 테스트 부족 / 사용자 인지 부담 |
| **SUCCESS** | 9 정량 metrics 모두 PASS (forbidden imports 0 / PDCA 패턴 100% / L1 unit 13 TC PASS / matchRate 100% / require() 호환 / Sprint 2 import 가능 / JSDoc 100% / 350~400 LOC / quality gates ALL PASS) |
| **SCOPE** | In: 7 files (3 Application + 4 Domain). Out: use cases / Infrastructure / Presentation / tests-only-L1 / Sprint 1 docs |

---

## 1. Requirements

### 1.1 In-scope (반드시 구현)

#### R1. lib/application/sprint-lifecycle/phases.js
**Public API exports**:
- `SPRINT_PHASES` — `Object.freeze({...})` 8값 (PRD/PLAN/DESIGN/DO/ITERATE/QA/REPORT/ARCHIVED)
- `SPRINT_PHASE_ORDER` — `Object.freeze([...])` 8 entries canonical order
- `SPRINT_PHASE_SET` — `new Set(SPRINT_PHASE_ORDER)` (lookup O(1))
- `isValidSprintPhase(phase: string): boolean` — string + PHASE_SET membership
- `sprintPhaseIndex(phase: string): number` — index in SPRINT_PHASE_ORDER, -1 if unknown
- `nextSprintPhase(phase: string): string|null` — canonical next, null if at end

**JSDoc**: 각 export에 @typedef / @param / @returns. PDCA `phases.js` 패턴 정합.

**@version**: `2.1.13`
**@module**: `lib/application/sprint-lifecycle/phases`

#### R2. lib/application/sprint-lifecycle/transitions.js
**Public API exports**:
- `SPRINT_TRANSITIONS` — `Object.freeze({...})` 8 keys, **nested** `Object.freeze([...])` arrays (immutability 깊이 보장)
- `canTransitionSprint(from: string, to: string): { ok: boolean, reason?: string }` — PDCA 패턴 정합 객체 반환
- `legalNextSprintPhases(from: string): string[]` — `[...SPRINT_TRANSITIONS[from]]` plain array (mutation safe)

**Transition Rules**:
- prd → [plan, archived]
- plan → [design, archived]
- design → [do, archived]
- do → [iterate, qa, archived]
- iterate → [qa, do, archived]
- qa → [report, do, archived]
- report → [archived]
- archived → []

**`{ ok, reason }` 반환**:
- `!isValidSprintPhase(from)` → `{ ok: false, reason: 'invalid_from_phase' }`
- `!isValidSprintPhase(to)` → `{ ok: false, reason: 'invalid_to_phase' }`
- `from === to` → `{ ok: true }` (idempotent)
- `TRANSITIONS[from].includes(to)` → `{ ok: true }`
- else → `{ ok: false, reason: 'transition_not_allowed' }`

**@version**: `2.1.13`

#### R3. lib/application/sprint-lifecycle/index.js
**Barrel export**:
- `SPRINT_PHASES`, `SPRINT_PHASE_ORDER`, `SPRINT_PHASE_SET`
- `isValidSprintPhase`, `sprintPhaseIndex`, `nextSprintPhase`
- `SPRINT_TRANSITIONS`, `canTransitionSprint`, `legalNextSprintPhases`

**Style**: PDCA `lib/application/pdca-lifecycle/index.js` 패턴 정합.

**@version**: `2.1.13`

#### R4. lib/domain/sprint/entity.js
**Public API exports**:
- `createSprint(input: SprintInput): Sprint` — factory function. defaults 적용 (config / autoRun / autoPause / kpi / featureMap / qualityGates).
- `cloneSprint(sprint: Sprint, updates: Partial<Sprint>): Sprint` — immutable update helper

**JSDoc type 정의 (모두 export)**:
- `Sprint` (full)
- `SprintInput` (factory 입력, 일부 optional)
- `SprintContext` (WHY/WHO/RISK/SUCCESS/SCOPE)
- `SprintConfig` (budget / phaseTimeoutHours / maxIterations / matchRateTarget / matchRateMinAcceptable / dashboardMode / manual)
- `SprintAutoRun` (enabled / scope / trustLevelAtStart / startedAt / lastAutoAdvanceAt)
- `SprintAutoPause` (armed / lastTrigger / pauseHistory)
- `SprintPhaseHistory` (phase / enteredAt / exitedAt / durationMs)
- `SprintIterationHistory` (iteration / matchRate / fixedTaskIds / durationMs)
- `SprintDocs` (masterPlan / prd / plan / design / iterate / qa / report)
- `SprintFeatureMap` (Record<string, {pdcaPhase, matchRate, qa}>)
- `SprintQualityGates` (M1-M10 + S1-S4)
- `SprintKPI` (matchRate / criticalIssues / qaPassRate / dataFlowIntegrity / featuresTotal / featuresCompleted / featureCompletionRate / cumulativeTokens / cumulativeIterations / sprintCycleHours)

**Pure**: no I/O, no fs/child_process/net/http/https/os imports.

**@version**: `2.1.13`

#### R5. lib/domain/sprint/validators.js
**Public API exports**:
- `isValidSprintName(name: string): boolean` — regex `/^[a-z][a-z0-9-]{1,62}[a-z0-9]$/` + no `--` 연속
- `isValidSprintContext(ctx: SprintContext): boolean` — WHY/WHO/RISK/SUCCESS/SCOPE 5건 모두 non-empty string
- `sprintPhaseDocPath(sprintId: string, phase: string): string|null` — Master Plan §18 Document Index 매핑 ('masterPlan' / 'prd' / 'plan' / 'design' / 'iterate' / 'qa' / 'report')
- `validateSprintInput(input: SprintInput): { ok: boolean, errors?: string[] }` — composite (name + context + phase 합법성)

**Pure**: no I/O.

**@version**: `2.1.13`

#### R6. lib/domain/sprint/events.js
**Public API exports**:
- `SprintEvents` — `Object.freeze({...})` 5 factory functions
  - `SprintCreated({sprintId, name, phase})` → event object
  - `SprintPhaseChanged({sprintId, fromPhase, toPhase, reason})` → event object
  - `SprintArchived({sprintId, archivedAt, reason, kpiSnapshot})` → event object
  - `SprintPaused({sprintId, trigger, severity, message})` → event object
  - `SprintResumed({sprintId, pausedAt, resumedAt, durationMs})` → event object
- `SPRINT_EVENT_TYPES` — `Object.freeze(['SprintCreated', 'SprintPhaseChanged', 'SprintArchived', 'SprintPaused', 'SprintResumed'])`
- `isValidSprintEvent(event): boolean` — type + timestamp + payload shape 검증

**Event shape (공통)**:
```javascript
{
  type: string,            // 'SprintCreated' | 'SprintPhaseChanged' | ...
  timestamp: string,       // ISO 8601 (new Date().toISOString())
  payload: object,         // event 별 specific shape
}
```

**Pure**: no I/O (timestamp는 `new Date().toISOString()`로 generate, factory 호출 시점).

**@version**: `2.1.13`

#### R7. lib/domain/sprint/index.js
**Barrel export**:
- `createSprint`, `cloneSprint` (from entity.js)
- `isValidSprintName`, `isValidSprintContext`, `sprintPhaseDocPath`, `validateSprintInput` (from validators.js)
- `SprintEvents`, `SPRINT_EVENT_TYPES`, `isValidSprintEvent` (from events.js)

**Style**: PDCA `lib/application/pdca-lifecycle/index.js` 패턴 정합.

**@version**: `2.1.13`

### 1.2 Out-of-scope (Sprint 1 명시 제외)

- ❌ Sprint Application use cases (start-sprint / advance-phase / iterate / qa / report / archive / quality-gates / auto-pause) — Sprint 2
- ❌ Sprint Infrastructure (state-store / telemetry / matrix-sync / doc-scanner) — Sprint 3
- ❌ Sprint Presentation (skill / agents / hooks / templates) — Sprint 4
- ❌ /sprint command 등록 — Sprint 4
- ❌ /control 명령 sprint integration — Sprint 2
- ❌ ENH-303 PostToolUse continueOnBlock — Sprint 4
- ❌ ENH-286 Memory Enforcer master plan 보호 — Sprint 4
- ❌ Sprint user guide / migration guide — Sprint 5
- ❌ README/CLAUDE.md update — Sprint 5
- ❌ BKIT_VERSION bump — Sprint 6
- ❌ ADR 0007/0008/0009 Accepted 전환 — Sprint 6 (현재 Proposed)
- ❌ L2/L3/L4/L5 tests — Sprint 5 (Sprint 1은 L1 unit only)

---

## 2. Feature Breakdown (7 files 상세)

| # | File | Layer | LOC est. | Public Exports | Imports |
|---|------|-------|---------|----------------|---------|
| 1 | `lib/application/sprint-lifecycle/phases.js` | Application | ~85 | 6 (enum + 5 helpers) | (none) |
| 2 | `lib/application/sprint-lifecycle/transitions.js` | Application | ~75 | 3 (TRANSITIONS + 2 helpers) | `./phases` |
| 3 | `lib/application/sprint-lifecycle/index.js` | Application | ~45 | 9 (barrel) | `./phases`, `./transitions` |
| 4 | `lib/domain/sprint/entity.js` | Domain | ~95 | 2 functions + 12 @typedef | (none) |
| 5 | `lib/domain/sprint/validators.js` | Domain | ~65 | 4 functions | `./entity` (typedef only via JSDoc) |
| 6 | `lib/domain/sprint/events.js` | Domain | ~75 | 3 (SprintEvents + 2 helpers) | (none) |
| 7 | `lib/domain/sprint/index.js` | Domain | ~25 | 9 (barrel) | `./entity`, `./validators`, `./events` |
| **합계** | | | **~465 LOC** | **36 public exports** | |

**Note**: 마스터 플랜 §14 Stage 1 LOC 추정 250 → 정정 **~465 LOC** (7 files, JSDoc 풍부, PDCA 패턴 정합).

---

## 3. Quality Gates (Sprint 1 활성)

| Gate | Threshold | Sprint 1 Phase | 측정 |
|------|----------|---------------|------|
| M2 codeQualityScore | ≥80 | Do, Iterate, QA | code-analyzer |
| M3 criticalIssueCount | 0 | Do, Iterate, QA | code-analyzer (deny on >0) |
| M7 conventionCompliance | ≥90 | Do, Iterate, QA | ESLint + JSDoc check |
| M8 designCompleteness | ≥85 | Design | Design doc structure check |
| M1 matchRate | ≥90 (목표 100) | Iterate | gap-detector |
| S2 featureCompletion | 100 (7/7 files) | Iterate, QA | file existence check |
| **Domain Purity** | 0 forbidden imports | Do, QA | `scripts/check-domain-purity.js` Exit 0 |
| **Object.freeze invariant** | 100% (mutation throw) | QA | runtime test |
| **canTransition signature match** | Exact match with PDCA shape | QA | shape diff |
| **L1 unit TC pass** | 100% (13/13) | QA | node test runner |
| **Forbidden imports check** | 0 (4 domain files) | QA | grep + invariant |
| **require() compatibility (--plugin-dir .)** | All 7 modules require() success | QA | `node -e "require('./lib/...')"` |

---

## 4. Risks & Mitigation (PRD §8 Pre-mortem 7 시나리오 보완)

### v2 Risk Items (Sprint 1 phase-specific)

| Risk | Likelihood | Severity | Mitigation |
|------|:---------:|:--------:|-----------|
| R1: ADR 0005 패턴 위반 (lib/domain/에 phases 작성) | LOW | HIGH | Design §4.2 매트릭스로 명시. Phase 4 Do에서 작성 위치 정확히 |
| R2: canTransition boolean 반환 (PDCA 패턴 깨짐) | MEDIUM | HIGH | Design §4.5 명시. Phase 6 QA에서 shape diff test |
| R3: forbidden imports 포함 | LOW | HIGH | Phase 4 Do 마지막에 `scripts/check-domain-purity.js` 직접 실행 |
| R4: Object.freeze nested 누락 | LOW | MEDIUM | Phase 4 Do에서 `Object.freeze([...].map(...))` 패턴 + Phase 6 QA mutation test |
| R5: JSDoc type 누락 | MEDIUM | LOW | Phase 4 Do checklist에 명시. ESLint plugin 활용 가능 |
| R6: kebab-case validator 부정확 | LOW | HIGH | Phase 6 QA edge case 5건 (단일 char, 시작 hyphen, 종료 hyphen, `--` 연속, uppercase) |
| R7: SprintEvents mutable | LOW | MEDIUM | factory function이 매번 새 객체 반환 + `Object.freeze(SprintEvents)` |
| R8: LOC 초과 (~465 vs original ~250 estimate) | HIGH | LOW | Master plan v1.2에 정정 반영 (Iterate phase에서) |
| R9: --plugin-dir . 환경 require() 실패 (path 변환) | LOW | HIGH | Phase 6 QA에서 직접 `node -e "..."` 검증 |
| R10: PDCA phases.js와 Sprint phases.js 동시 import 시 name collision | LOW | MEDIUM | namespace prefix (SPRINT_PHASES vs PHASES). 별도 module file 분리로 자연 회피 |
| R11: Sprint phase string 'plan'이 PDCA 'plan'과 동일해 confusion | MEDIUM | LOW | JSDoc 명시 + Sprint 5 user guide에서 비교 표 |
| R12: TypeScript type 부재 (JSDoc only) | HIGH | LOW | bkit 전체 JSDoc 패턴 — 정합 |
| R13: 사용자 명시 L4 모드 + Trust 50 — 안전성 우려 | MEDIUM | MEDIUM | 본 Sprint 1은 read-only 안전 영역 (Domain은 외부 영향 0건) → 사용자 결정 존중 진행 |

---

## 5. Document Index (Sprint 1 산출물)

| Phase | Document | Path | Status |
|-------|----------|------|--------|
| PRD | Sprint 1 PRD | `docs/01-plan/features/v2113-sprint-1-domain.prd.md` | ✅ |
| Plan | 본 문서 | `docs/01-plan/features/v2113-sprint-1-domain.plan.md` | ✅ (작성 중) |
| Design | Sprint 1 Design | `docs/02-design/features/v2113-sprint-1-domain.design.md` | ⏳ |
| Iterate | Sprint 1 Iterate analysis | `docs/03-analysis/features/v2113-sprint-1-domain.iterate.md` | ⏳ |
| QA | Sprint 1 QA Report | `docs/05-qa/features/v2113-sprint-1-domain.qa-report.md` | ⏳ |
| Report | Sprint 1 Final Report | `docs/04-report/features/v2113-sprint-1-domain.report.md` | ⏳ |

---

## 6. Implementation Order (Phase 4 Do 단계 작업 순서)

Domain layer는 Application layer에 의존되므로 **Domain 먼저** 구현 후 Application 작성. 단 Application의 phases/transitions는 Domain entity와 별개라 병렬 가능. 단계별:

1. **Step 1**: `lib/domain/sprint/entity.js` (Sprint JSDoc type 전체 + factory + cloneSprint)
2. **Step 2**: `lib/domain/sprint/validators.js` (entity의 type 참조)
3. **Step 3**: `lib/domain/sprint/events.js` (entity와 독립, 병렬 가능)
4. **Step 4**: `lib/domain/sprint/index.js` (barrel export)
5. **Step 5**: `lib/application/sprint-lifecycle/phases.js` (PDCA 패턴 정합)
6. **Step 6**: `lib/application/sprint-lifecycle/transitions.js` (phases.js 의존)
7. **Step 7**: `lib/application/sprint-lifecycle/index.js` (barrel)
8. **Step 8**: `scripts/check-domain-purity.js` 직접 실행 검증

---

## 7. Acceptance Criteria (Phase 6 QA 통과 조건)

### 7.1 Static Checks (Do 단계 마무리)
- [ ] `scripts/check-domain-purity.js` Exit 0 (sprint domain 4 files 통과)
- [ ] `node -c lib/domain/sprint/entity.js` (syntax check)
- [ ] `node -c lib/domain/sprint/validators.js`
- [ ] `node -c lib/domain/sprint/events.js`
- [ ] `node -c lib/domain/sprint/index.js`
- [ ] `node -c lib/application/sprint-lifecycle/phases.js`
- [ ] `node -c lib/application/sprint-lifecycle/transitions.js`
- [ ] `node -c lib/application/sprint-lifecycle/index.js`

### 7.2 Runtime Checks (QA 단계)
- [ ] `node -e "require('./lib/application/sprint-lifecycle')"` Exit 0
- [ ] `node -e "require('./lib/domain/sprint')"` Exit 0
- [ ] Object.freeze runtime mutation throw test (5 frozen objects: SPRINT_PHASES / SPRINT_PHASE_ORDER / SPRINT_TRANSITIONS / SprintEvents / SPRINT_EVENT_TYPES)
- [ ] canTransitionSprint 9+ 조합 PASS
  - `('prd', 'plan')` → `{ ok: true }`
  - `('plan', 'design')` → `{ ok: true }`
  - `('design', 'do')` → `{ ok: true }`
  - `('do', 'iterate')` → `{ ok: true }` (auto-iterate 핵심)
  - `('iterate', 'qa')` → `{ ok: true }`
  - `('qa', 'report')` → `{ ok: true }`
  - `('qa', 'do')` → `{ ok: true }` (역방향 fail-back)
  - `('report', 'archived')` → `{ ok: true }`
  - `('archived', 'plan')` → `{ ok: false, reason: 'transition_not_allowed' }`
  - `('invalid', 'plan')` → `{ ok: false, reason: 'invalid_from_phase' }`
  - `('plan', 'invalid')` → `{ ok: false, reason: 'invalid_to_phase' }`
  - `('plan', 'plan')` → `{ ok: true }` (idempotent)

### 7.3 Validators (QA 단계)
- [ ] `isValidSprintName('my-sprint')` → true
- [ ] `isValidSprintName('Q2-2026')` → false (uppercase)
- [ ] `isValidSprintName('-leading-hyphen')` → false
- [ ] `isValidSprintName('trailing-hyphen-')` → false
- [ ] `isValidSprintName('my--double')` → false (--)
- [ ] `isValidSprintName('a')` → false (너무 짧음, min 3)
- [ ] `isValidSprintName('a'.repeat(65))` → false (너무 김, max 64)
- [ ] `isValidSprintContext({WHY: 'a', WHO: 'b', RISK: 'c', SUCCESS: 'd', SCOPE: 'e'})` → true
- [ ] `isValidSprintContext({WHY: 'a'})` → false (missing keys)
- [ ] `sprintPhaseDocPath('my-sprint', 'prd')` → `'docs/01-plan/features/my-sprint.prd.md'`
- [ ] `sprintPhaseDocPath('my-sprint', 'unknown')` → null

### 7.4 Events (QA 단계)
- [ ] `SprintEvents.SprintCreated({sprintId: 'x', name: 'X', phase: 'prd'})` → valid event shape
- [ ] Event 'timestamp' field ISO 8601 format
- [ ] `isValidSprintEvent({type: 'SprintCreated', timestamp: '...', payload: {...}})` → true
- [ ] `SPRINT_EVENT_TYPES.includes('SprintCreated')` → true
- [ ] `SprintEvents` 자체 immutable (mutation throw)

### 7.5 Integration (QA 단계)
- [ ] Sprint 2 mock use case가 `require('lib/application/sprint-lifecycle')` 후 `SPRINT_PHASES.PLAN` 접근 가능
- [ ] Sprint 3 mock state store가 `require('lib/domain/sprint').createSprint({...})` 후 schema 검증 가능
- [ ] `--plugin-dir .` 환경에서 모든 export 정상 (CC plugin 활성 가정)

---

## 8. Cross-Sprint Dependency

### 8.1 Sprint 1 → Sprint 2 (Application Core)
Sprint 2가 Sprint 1의 다음 exports를 사용:
- `SPRINT_PHASES` (phase string literal 사용 회피)
- `SPRINT_PHASE_ORDER` (auto-run loop의 다음 phase 결정)
- `canTransitionSprint` (advance-phase use case의 transition 검증)
- `legalNextSprintPhases` (intent-router에서 사용)
- `createSprint`, `cloneSprint` (state mutation)
- `isValidSprintName`, `validateSprintInput` (start-sprint use case)
- `SprintEvents.*` (audit logging)

### 8.2 Sprint 1 → Sprint 3 (Infrastructure)
- `Sprint` JSDoc type (state-store load/save schema 검증)
- `SprintEvents` (telemetry emission)
- `sprintPhaseDocPath` (doc-scanner)

### 8.3 Sprint 1 → Sprint 4 (Presentation)
- `SPRINT_PHASES`, `SPRINT_TRANSITIONS` (skill handler)
- `isValidSprintName` (`/sprint init` validator)
- `SprintEvents` (hook scripts audit)

---

## 9. Plan 완료 Checklist

- [x] Context Anchor 복사 (PRD §0)
- [x] Requirements R1-R7 (각 file별 public API + JSDoc + @version + @module)
- [x] Out-of-scope 매트릭스 (Sprint 2~6 분배)
- [x] Feature Breakdown 7 files (LOC est. ~465)
- [x] Quality Gates 12건 활성
- [x] Risks & Mitigation 13건 (PRD 7 + Sprint 1 specific 6)
- [x] Document Index 6 phase 산출물
- [x] Implementation Order 8 steps
- [x] Acceptance Criteria 5 groups (Static / Runtime / Validators / Events / Integration)
- [x] Cross-Sprint Dependency Sprint 2/3/4 명시

---

**Next Phase**: Phase 3 Design — 현재 코드베이스 (lib/application/pdca-lifecycle/ + lib/domain/) 깊이 분석 + 7 files 정확한 구현 spec (file:line 인용) + §8 Test Plan Matrix.
