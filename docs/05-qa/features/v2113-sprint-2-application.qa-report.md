# Sprint 2 QA Report — v2.1.13 Sprint Management Application Core

> **Sprint ID**: `v2113-sprint-2-application`
> **Phase**: QA (6/7)
> **Date**: 2026-05-12
> **Environment**: `--plugin-dir .` active session (cwd `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code`)
> **Iteration Result**: matchRate **100%** single-shot (79/79 L2 TCs PASS)

---

## 0. Context Anchor (보존)

| Key | Value |
|-----|-------|
| WHY | Sprint 2 Application Core 실제 동작 검증 |
| WHO | bkit 사용자 + Sprint 3/4 후속 작업자 + CI |
| RISK | runtime crash / invariant 깨짐 / E2E 동작 실패 / mock-only 의존 |
| SUCCESS | 79/79 L2 TCs PASS + 11 diverse runtime scenarios PASS + 모든 invariant 0 변경 |
| SCOPE | L2 integration TCs + runtime scenarios + invariant checks |

---

## 1. QA 실행 요약

### 1.1 Test Layer 매트릭스

| Layer | Coverage | Result |
|-------|---------|--------|
| L1 Unit (Sprint 1 영구화) | 40 TCs (재실행 X, baseline 유지) | ✅ |
| **L2 Integration** | **79 TCs** | **79/79 PASS (100%)** |
| L3 Contract | Sprint 5 deferred (Sprint 3 deps inject 시점에 통합) | deferred |
| L4 E2E | Sprint 5 deferred (Sprint 4 skill handler 통합) | deferred |
| L5 Performance | Sprint 5 deferred (auto-run 1k iter synthetic) | deferred |

### 1.2 검증 방법

1. **Static checks**: `node -c` 9 files — all OK
2. **Runtime require()**: barrel + 8 use case 모듈 standalone require() — all OK
3. **L2 integration**: 79 TCs (mock deps inject) — 79/79 PASS
4. **Diverse runtime scenarios**: 11 케이스 직접 실행 (`node -e ...`) — all PASS
5. **Invariant checks**: PDCA / Sprint 1 / ENH-292 / forbidden imports — 0 위반
6. **Plugin validation**: `claude plugin validate .` — Exit 0 (F9-120 closure 8 release 연속 PASS)
7. **Domain Purity**: `scripts/check-domain-purity.js` — 16 files 0 forbidden imports

---

## 2. Test Group 결과

### 2.1 L2 Integration TCs (79 PASS)

| Group | TCs | Coverage |
|-------|-----|----------|
| G: quality-gates.js | 12 | ACTIVE_GATES_BY_PHASE matrix + GATE_DEFINITIONS + evaluateGate (4 paths) + evaluatePhase (3 paths) |
| A: auto-pause.js | 14 | 4 triggers fire/no-fire + armed filter + pause/resume + still-firing block + status transition |
| V: verify-data-flow.usecase.js | 6 | SEVEN_LAYER_HOPS frozen + s1Score calc 3 cases + sequential order + default validator |
| I: iterate-sprint.usecase.js | 8 | matchRate 60→100 in 1/5 iter + stuck at 85 blocked + sequential gap/fix + history + KPI/gates update |
| P: advance-phase.usecase.js | 14 | 8 transitions + scope check + gate fail + history append + event emit + allowGateOverride |
| R: generate-report.usecase.js | 5 | KPI aggregate + dataFlow avg + carry items + lessons + fileWriter |
| AR: archive-sprint.usecase.js | 4 | S4 pass/fail + direct archive + SprintArchived event |
| S: start-sprint.usecase.js E2E | 8 | L0/L2/L3/L4 sprint flows + ITERATION/BUDGET auto-pause + invalid input + SPRINT_AUTORUN_SCOPE frozen |
| INT: Integration | 8 | barrel exports + Sprint 1 imports + PDCA invariant + ENH-292 + Master Plan §12.1 매트릭스 + computeNextPhase |
| **Total** | **79** | **79/79 PASS** |

### 2.2 Diverse Runtime Scenarios (`node -e ...` 11건)

| # | Scenario | 검증 항목 | Result |
|---|----------|----------|--------|
| QA-01 | cwd context | `--plugin-dir .` 환경 명시 | ✅ |
| QA-02 | 전체 L2 suite | 79/79 PASS 재현성 | ✅ |
| QA-03 | Domain Purity | 16 files 0 forbidden imports | ✅ |
| QA-04 | `claude plugin validate .` | F9-120 closure 8 cycle 연속 | ✅ Exit 0 |
| QA-05 | standalone require() | 9 modules 단독 load | ✅ all |
| QA-06 | Sprint 1 invariant | `git diff lib/domain/sprint/` empty | ✅ |
| QA-07 | PDCA invariant | `git diff lib/application/pdca-lifecycle/` empty | ✅ |
| QA-08 | ENH-292 | runtime `Promise.all/race/allSettled` 0건 | ✅ |
| QA-09 | Forbidden imports | fs/child_process/net/http/https/os 0건 | ✅ |
| QA-10 | L3 Full E2E | PRD → Report mock 자율 진행 + 7 events emit | ✅ finalPhase='report' |
| QA-11 | L0 manual short-circuit | 즉시 prd 반환 + reason='manual_mode' | ✅ |
| QA-12 | Invalid input | reason='invalid_input' + errors='invalid_id_kebab_case' | ✅ |
| QA-13 | BUDGET_EXCEEDED | 2M tokens > 1M budget → trigger fire | ✅ |
| QA-14 | 7-Layer hop iteration | H1→...→H7 sequential + s1Score 85.71 (H3 fail) | ✅ |
| QA-15 | matchRate iterate 60→100 | 4 iter, history [75,88,95,100], blocked=false | ✅ |
| QA-16 | ITERATION_EXHAUSTED | 5 iter stuck at 85 → trigger fire | ✅ |
| QA-17 | PHASE_TIMEOUT | 5h elapsed > 4h limit → trigger fire | ✅ |
| QA-18 | archive S4 fail rejected | reason='archive_readiness_fail' | ✅ |
| QA-19 | Trust L2 scope block | reason='requires_user_approval', stopAfter='design' | ✅ |
| QA-20 | 5 SprintEvents 매트릭스 | Created/PhaseChanged/Paused/Resumed/Archived 모두 emit | ✅ |

### 2.3 Auto-Run FSM 단계별 검증

QA-10 L3 E2E 실행 추적:

```
prd → plan → design → do → iterate → qa → report
(SprintCreated)
       └─→ advance(plan)  SprintPhaseChanged
              └─→ advance(design)  SprintPhaseChanged
                     └─→ advance(do)  SprintPhaseChanged
                            └─→ advance(iterate)  SprintPhaseChanged  (iterate handler)
                                   └─→ advance(qa)  SprintPhaseChanged  (qa handler — 2 features 7 hops each)
                                          └─→ advance(report)  SprintPhaseChanged  (report handler)
                                                 └─→ stop at scope.stopAfter='report'

Total events: 1 SprintCreated + 6 SprintPhaseChanged = 7 ✓
```

### 2.4 4 Auto-Pause Triggers 검증 매트릭스 (사용자 안전핀)

| Trigger | Scenario | Result |
|---------|---------|--------|
| QUALITY_GATE_FAIL | M3=1 critical (A-03) + S1=85 (A-04) | ✅ fires |
| ITERATION_EXHAUSTED | 5 iter stuck at 85 (A-05, QA-16) | ✅ fires (vs A-06 not fire 3 iter) |
| BUDGET_EXCEEDED | 2M tokens > 1M budget (A-07, QA-13) | ✅ fires |
| PHASE_TIMEOUT | 5h elapsed > 4h limit (A-08, QA-17) | ✅ fires |

**armed filter 검증** (A-11): disarmed trigger는 condition 충족해도 fire 안 함 (사용자 selective disable 지원).

### 2.5 Trust Level Scope 매트릭스 검증 (5/5)

| Level | stopAfter | manual | TC | Result |
|-------|----------|--------|----|--------|
| L0 | 'prd' | true | S-03 / QA-11 | ✅ short-circuit |
| L1 | 'prd' | true | (대칭 — same as L0, hint=true 차이만) | ✅ |
| L2 | 'design' | false | S-04 + QA-19 | ✅ stops at design |
| L3 | 'report' | false | S-01 + QA-10 | ✅ full PRD → Report |
| L4 | 'archived' | false | S-02 | ✅ full → archived |

### 2.6 7-Layer S1 Hop 정합 (QA-14)

```
H1 UI → Client
H2 Client → API
H3 API → Validation     ← injected fail (조건: hop !== 'H3')
H4 Validation → DB
H5 DB → Response
H6 Response → Client
H7 Client → UI

Sequential order verified: H1, H2, H3, H4, H5, H6, H7 (V-05)
6/7 passed → s1Score = (6/7)*100 = 85.71% (QA-14)
```

---

## 3. Invariant 검증 결과

| Invariant | Pre-Sprint 2 | Post-Sprint 2 | Change |
|-----------|-------------|--------------|--------|
| PDCA 9-phase enum | 9 (frozen) | 9 (frozen) | **0** ✅ |
| PDCA transitions | 19 edges | 19 edges | **0** ✅ |
| Sprint 1 Domain (16 files) | 685 LOC | 685 LOC | **0** ✅ |
| Sprint 1 Application (phases/transitions) | 154 LOC | 154 LOC | **0** ✅ |
| `claude plugin validate .` | Exit 0 | Exit 0 | F9-120 closure **8 cycle** PASS |
| Domain Purity (16 files) | 0 forbidden | 0 forbidden | **0** ✅ |
| ENH-292 sequential (Sprint 2 new) | — | 0 runtime parallel | **0** ✅ |
| Forbidden imports in Sprint 2 use cases | — | 0 | **0** ✅ |
| Frozen objects mutation throw | Sprint 1: 3 | Sprint 1+2: 7 | **+4 frozen** (ACTIVE_GATES_BY_PHASE / AUTO_PAUSE_TRIGGERS / SEVEN_LAYER_HOPS / GATE_DEFINITIONS / SPRINT_AUTORUN_SCOPE — 5 신규 frozen) ✅ |

---

## 4. Issues 발견

### 4.1 Critical / Blockers
- **0건**

### 4.2 Minor / Improvements (Sprint 5 follow-up)

| Issue | Severity | Sprint |
|-------|---------|--------|
| QA-19에서 do 단계 active gate 평가 시 M5 runtimeErrorRate 측정 method 부재 | INFO | Sprint 4 (real adapter) |
| generateReport renderReport 출력이 단순 markdown 구조 — Sprint 4 template engine 통합 시 enhancement | INFO | Sprint 4 |
| iterate-sprint blocked=true 상태 후 start-sprint pauseChecker가 ITERATION_EXHAUSTED 발화 의존 — 미발화 시 다음 advancePhase 진행 가능 (mock 환경) | LOW | Sprint 4 통합 검증 |
| Plan §6 LOC estimate ~1,200 vs 실제 1,349 (+12%) | LOW (success metric 아님) | Sprint 5 Master Plan v1.2 정정 |

### 4.3 None of the above is a regression

- 4 issues는 **enhancement / future scope** 카테고리, 본 Sprint 2 acceptance 차단 0건
- 모든 mitigation은 Sprint 4/5 후속 작업으로 이미 PRD/Plan §6 Out-of-scope에 명시

---

## 5. ENH-292 Sequential Dispatch 자기적용 검증

| Use case | Sequential 패턴 | grep 검증 |
|---------|---------------|----------|
| start-sprint phaseHandlers.qa | `for (const featureName of featureList) { await verifyDataFlow(...) }` | ✅ |
| verify-data-flow | `for (const hop of SEVEN_LAYER_HOPS) { await validator(...) }` | ✅ V-05 hop order |
| iterate-sprint | `while ... await gapDetector ... await autoFixer ... await gapDetector` | ✅ I-05 sequential |
| advance-phase | 5 step sequential await (transition → scope → gates → history → emit) | ✅ |
| Forbidden runtime patterns | Promise.all / Promise.race / Promise.allSettled | ✅ **0** 검출 |

**bkit 차별화 #3 (Sequential Dispatch moat)** Sprint 2 자기적용 결정적 완료. Sprint 4 sprint-orchestrator agent body로 패턴 전파 준비.

---

## 6. Sprint 1 ↔ Sprint 2 통합 검증

| Sprint 1 export | Sprint 2 사용 위치 | Verified |
|----------------|------------------|----------|
| `createSprint` | start-sprint | ✅ S-01~S-04 |
| `cloneSprint` | start-sprint, auto-pause, advance-phase, iterate-sprint, archive-sprint, qa handler | ✅ INT-02 |
| `validateSprintInput` | start-sprint | ✅ S-07 / QA-12 |
| `canTransitionSprint` | advance-phase, archive-sprint | ✅ P-01~P-09 / AR-01 |
| `sprintPhaseIndex` | advance-phase (Trust scope check) | ✅ P-10 |
| `sprintPhaseDocPath` | generate-report | ✅ R-05 |
| `SprintEvents.SprintCreated` | start-sprint | ✅ QA-20 |
| `SprintEvents.SprintPhaseChanged` | advance-phase | ✅ P-13 / QA-20 |
| `SprintEvents.SprintArchived` | archive-sprint | ✅ AR-04 / QA-20 |
| `SprintEvents.SprintPaused` | auto-pause | ✅ A-12 / QA-20 |
| `SprintEvents.SprintResumed` | auto-pause | ✅ A-14 / QA-20 |

**Sprint 1 → Sprint 2 통합**: 11/11 export 완전 통합 ✅

---

## 7. CC Version Compatibility

| CC Version | Result | Notes |
|-----------|-------|-------|
| v2.1.137 (current installed) | `claude plugin validate .` Exit 0 | F9-120 closure 8 cycle 연속 PASS |
| v2.1.139 (latest) | (간접 — v2.1.137 환경에서 무수정 PASS = 93+ 연속 호환 갱신 보류) | 사용자 결정 보류 |

---

## 8. 사용자 8개국어 트리거 + 영어 코드 constraint (Sprint 4 결정적 적용)

Sprint 2는 **lib/application/** 만 손대므로 skills/agents 미생성. 사용자 명시 constraint는 Sprint 4 (Presentation)에서 결정적 적용 — PRD §6.1 명시 + Plan §1.2 명시.

**본 Sprint 2 코드 검증**:
- ✅ 모든 use case identifier 영어 (startSprint, advancePhase, evaluateGate, etc.)
- ✅ 모든 JSDoc 영어 (@param, @returns, @typedef)
- ✅ 모든 함수/변수/상수 영어
- ✅ Inline comments 영어
- ✅ docs/01-plan / docs/02-design / docs/03-analysis / docs/05-qa 한국어 (CLAUDE.md 규칙)
- ✅ skills/agents 미생성 (Sprint 4 영역)

---

## 9. QA 완료 Checklist

- [x] L2 integration TC 79/79 PASS (100%)
- [x] 11 diverse runtime scenarios PASS
- [x] PDCA 9-phase invariant 0 변경
- [x] Sprint 1 Domain invariant 0 변경
- [x] `claude plugin validate .` Exit 0 (F9-120 closure 8 cycle 연속)
- [x] Domain Purity 0 forbidden imports
- [x] ENH-292 sequential dispatch 0 runtime parallel
- [x] 4 Auto-Pause Triggers 모두 fire 검증
- [x] 5 Trust Level scopes 매트릭스 검증
- [x] 5 SprintEvents emission 매트릭스 검증
- [x] 7-Layer S1 hop sequential 검증
- [x] Sprint 1 ↔ Sprint 2 통합 11 exports 검증
- [x] matchRate iterate loop 60→100% 검증
- [x] 모든 archive S4 + Trust scope + invalid input 시나리오 검증
- [x] Critical issue 0건

---

**QA Verdict**: ✅ **PASS** — Sprint 2 Application Core auto-run engine 모든 acceptance criteria 충족. Sprint 3 Infrastructure 진입 준비 완료.
**Next Phase**: Phase 7 Report — Sprint 2 종합 완료 보고서 작성.
