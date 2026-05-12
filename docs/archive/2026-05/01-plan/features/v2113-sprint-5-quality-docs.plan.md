# Sprint 5 Plan — v2.1.13 Sprint Management Quality + Documentation

> **Sprint ID**: `v2113-sprint-5-quality-docs`
> **Phase**: Plan (2/7)
> **Status**: Active
> **Date**: 2026-05-12
> **Trust Level (override)**: L4 (사용자 명시)
> **Master Plan**: v1.1 §3.6 → v1.2 (본 Sprint 추가)
> **PRD**: `docs/01-plan/features/v2113-sprint-5-quality-docs.prd.md`
> **Depends on (immutable)**: Sprint 1 (`a7009a5`) + Sprint 2 (`97e48b1`) + Sprint 3 (`232c1a6`) + Sprint 4 (`d4484e1`)
> **★ 사용자 명시 3 (2026-05-12)**: QA = bkit-evals + claude -p + 4-System (Sprint/PDCA/status/memory) 유기 + 다양한 관점

---

## 0. PRD → Plan 추적성

| PRD § | Plan Requirement |
|-------|------------------|
| 0.SUCCESS (1) | R1 — L3 Contract test (tracked) |
| 0.SUCCESS (2) | R2 — 3 real adapter scaffolds |
| 0.SUCCESS (3) | R3 — sprint-handler.js enhancement |
| 0.SUCCESS (4) | R4 — README + CLAUDE.md sprint section |
| 0.SUCCESS (5) | R5 — Korean user guide |
| 0.SUCCESS (6) | R6 — Korean migration guide |
| 0.SUCCESS (7) | R7 — Master Plan v1.2 |
| 0.SUCCESS (8) | R8 — Sprint 1/2/3/4 invariant 0 변경 |
| 0.SUCCESS (9) | R9 — `claude plugin validate .` Exit 0 |
| 0.SUCCESS (10) | R10 — L3 + Sprint 1+2+3+4 regression 244+ TCs |
| 0.SUCCESS (11) | R11 — cross-sprint contract drift 0 |
| 0.SUCCESS (12) | **★ R12 — 7-perspective QA (eval + claude -p + 4-system + mapping + memory + plugin)** |

---

## 1. 핵심 목표 (Outcome)

Sprint 1+2+3+4 산출물 (4,867 LOC, 236 TCs) 의 **production-grade hardening + 사용자 표면 documentation + ★ 7-perspective QA 검증**.

- **Hardening**: 3 real adapter scaffolds (Sprint 2 deps interface real impl 경로 확보) + sprint-handler 15 actions 완전 (Sprint 4 placeholder 대체)
- **Documentation**: README/CLAUDE.md sprint section (English, onboarding) + docs/06-guide/sprint-*.guide.md (Korean, deep-dive) + Master Plan v1.2 (LOC reconciliation)
- **★ Production Verification**: L3 Contract (8+ TCs tracked) + Sprint 1+2+3+4 regression + ★ bkit-evals (≥4 scenarios) + ★ claude -p headless (≥5 scenarios) + ★ 4-System 공존 + ★ Sprint↔PDCA mapping orthogonal + plugin validate F9-120 11-cycle

---

## 2. Requirements

### R1: L3 Contract Test (tracked, CI gate)

**파일**: `tests/contract/v2113-sprint-contracts.test.js`
**LOC**: ~250
**Tracked**: ✅ Yes (gitignore 적용 X, CI 정식 gate)

| TC ID | Title | 검증 대상 |
|-------|-------|-----------|
| SC-01 | Sprint entity shape | Sprint 1 typedef contract — id/name/features/featureMap/state/phase/lifecycle/autoRun/budget/audit/dataFlow/events 12 keys |
| SC-02 | startSprint deps interface | Sprint 2 deps 11 keys (stateStore/eventEmitter/gateEvaluator/autoPauseChecker/dataFlowValidator/gapDetector/autoFixer/now/trustProvider/auditEmitter/telemetryEmitter) |
| SC-03 | createSprintInfra return shape | Sprint 3 4 adapters (stateStore/telemetry/docScanner/matrixSync) + 5 methods each (load/save/list/delete/etc.) |
| SC-04 | sprint-handler.js signature | Sprint 4 `handleSprintAction(action, args, deps)` 3 args + Promise<{ok, ...}> return |
| SC-05 | 4-layer end-to-end chain | skill→handler→infra→use case→entity 통과 (sprint init→start→status) |
| SC-06 | audit-logger ACTION_TYPES enum | 18 entries (16 baseline + sprint_paused + sprint_resumed) |
| SC-07 | SPRINT_AUTORUN_SCOPE 5 levels | Sprint 2 inline ↔ Sprint 4 lib/control mirror 1:1 정합 |
| SC-08 | hooks/hooks.json invariant | 21 events 24 blocks 유지 (Sprint 1/2/3/4 누적) |

### R2: 3 Real Adapter Scaffolds

**파일들**:
- `lib/infra/sprint/gap-detector.adapter.js` (~120 LOC)
- `lib/infra/sprint/auto-fixer.adapter.js` (~120 LOC)
- `lib/infra/sprint/data-flow-validator.adapter.js` (~140 LOC)

**Sprint 2 deps interface 매칭**:
- `gapDetector.detect(sprint) → Promise<{ matchRate, gaps }>`
- `autoFixer.fix(sprint, gaps) → Promise<{ fixed: number, errors: [] }>`
- `dataFlowValidator.validate(sprint, hops) → Promise<{ passed, layerResults }>`

**Production scaffold 패턴**:
- Factory function `createGapDetector({ projectRoot, agentTaskRunner? })` — agentTaskRunner 미 주입 시 no-op baseline (matchRate 100), 주입 시 `Task(subagent_type: 'gap-detector')` invocation
- Integration point 명확한 주석 (Sprint 6 또는 v2.1.14 real wiring 시점 표시)

### R3: sprint-handler.js Enhancement

**파일**: `scripts/sprint-handler.js` (Sprint 4 baseline 260 LOC → ~430 LOC)
**Sprint 4 enhancement zone**: handleFork / handleFeature / handleWatch 3 placeholder → real impl
**기존 12 handler 변경 0** (Sprint 4 invariant 보존)

| handler | 기능 |
|---------|------|
| `handleFork({id, newId}, infra)` | Sprint state 로드 → carry items 식별 → new sprint id 로 cloneSprint → save |
| `handleFeature({id, action, featureName}, infra)` | list / add / remove (action 분기) |
| `handleWatch({id}, infra)` | live snapshot + auto-pause triggers + matrix 읽기 |

### R4: README + CLAUDE.md Sprint Section

**파일들**:
- `README.md` (+25-30 lines)
- `CLAUDE.md` (+25-30 lines)

**언어**: English (CLAUDE.md 정책 + bkit global service)
**위치**: README는 What's New v2.1.13 직후, CLAUDE.md 는 PDCA Core Rules 직후
**내용**: Quick Start (3 lines) + Skill location reference + Korean guide reference

### R5: Korean User Guide

**파일**: `docs/06-guide/sprint-management.guide.md` (~280 lines)
**언어**: Korean (사용자 명시 `@docs 예외` + CLAUDE.md docs/ 정책)
**섹션**:
1. Sprint Management 개념
2. 15 sub-actions 매트릭스 (init/start/status/watch/phase/iterate/qa/report/archive/list/feature/pause/resume/fork/help)
3. 8-phase lifecycle (prd → plan → design → do → iterate → qa → report → archived)
4. 4 Auto-Pause Triggers (QUALITY_GATE_FAIL / ITERATION_EXHAUSTED / BUDGET_EXCEEDED / PHASE_TIMEOUT)
5. Trust Level Scope (L0-L4 with stopAfter)
6. 7-Layer Data Flow QA
7. Cross-feature/cross-sprint integration
8. Worked examples (3 시나리오)

### R6: Korean Migration Guide

**파일**: `docs/06-guide/sprint-migration.guide.md` (~150 lines)
**언어**: Korean
**섹션**:
1. PDCA (기존) ↔ Sprint Management (신규) 매핑
2. PDCA 9-phase ↔ Sprint 8-phase 차이
3. 기존 작업 보존 (pdca-status.json + sprint-status.json 동시 트랙)
4. Migration scenarios (3 시나리오)
5. Rollback (sprint 미사용 = PDCA만 사용)

### R7: Master Plan v1.2

**파일**: `docs/01-plan/features/sprint-management.master-plan.md` (v1.1 → v1.2)
**변경**: §0 Version History + §X LOC Reconciliation 섹션 추가
**LOC 매트릭스**:

| Sprint | v1.1 estimate | v1.2 actual |
|--------|--------------|-------------|
| Sprint 1 | ~400 | 685 |
| Sprint 2 | ~600 | 1,337 |
| Sprint 3 | ~400 | 780 |
| Sprint 4 | ~800 | 2,065 |
| Sprint 5 | ~600 | (본 sprint, ~750 code + ~500 docs) |
| Sprint 6 | ~200 | TBD |
| **Total** | **~3,000** | **~6,117+** |

### R8: Sprint 1/2/3/4 Invariant 0 변경

**제약**:
- `lib/domain/sprint/` 파일 변경 0
- `lib/application/sprint-lifecycle/` 파일 변경 0
- `lib/infra/sprint/` 기존 6 파일 변경 0 (단 `index.js` 만 ext — 3 new factory exports 추가)
- `lib/application/pdca-lifecycle/` 변경 0
- `hooks/hooks.json` 변경 0 (21:24 유지)
- `agents/sprint-*.md` 4 파일 변경 0
- `templates/sprint/` 7 파일 변경 0
- `skills/sprint/` 5 파일 변경 0
- `scripts/sprint-handler.js` — Sprint 4 명시 enhancement zone 만 ext (handleFork/Feature/Watch real impl)
- `lib/control/automation-controller.js` 변경 0
- `lib/audit/audit-logger.js` 변경 0

### R9: `claude plugin validate .` Exit 0

F9-120 closure 11-cycle 연속 PASS (v2.1.120/121/123/129/132/133/137/139 + 본 Sprint 1/2/3/4/5).

### R10: 244+ TCs PASS

- L3 Contract: 8+ TCs (R1)
- L2 Sprint 1+2+3+4 regression: 40 + 79 + 76 + 41 = **236 TCs** (CSI-04 8개 포함)
- 합계: **244+ TCs PASS**

### R11: Cross-Sprint Contract Drift 0

L3 Contract (SC-01~08) 가 모든 cross-sprint contract 위반 자동 감지.

### R12: ★ 7-Perspective QA (사용자 명시 3, 2026-05-12)

**Phase 6 QA 확장 의무 매트릭스**:

| Perspective | Tool | Scenarios | Pass Criteria |
|------------|------|-----------|---------------|
| **P1 L3 Contract** | node tests/contract/*.test.js | 8+ TCs | 100% PASS |
| **P2 L2 Regression** | node tests/qa/v2113-sprint-{1,2,3,4}.test.js | 236 TCs | 100% PASS |
| **P3 bkit-evals** | `bkit:bkit-evals` skill | ≥4 scenarios (sprint init / start / phase advance / archive) | eval-score ≥ 0.8/1.0 평균 |
| **P4 claude -p headless** | `claude -p "<prompt>"` 5 invocations | sprint init/start/status/phase/list 실 sub-action | Exit 0 + stdout sanity |
| **P5 4-System 공존** | fs.existsSync + JSON diff | `.bkit/state/{sprint-status,pdca-status,trust-profile,memory}.json` 4 파일 | 동시 존재 + diff 0 (orthogonal) |
| **P6 Sprint↔PDCA mapping** | enum import + set overlap | Sprint 8-phase × PDCA 9-phase | overlap 키 검증 (orthogonal 또는 명시 매핑 documented) |
| **P7 plugin validate** | `claude plugin validate .` | Exit 0 (F9-120 11-cycle) | Exit code = 0 |

**MEMORY.md auto-update (P5 보강)**: sprint archived 후 MEMORY.md grep + entry 존재 → 자동 추가 X면 manual procedure 문서화 (Sprint 5는 verification only, Sprint 6/v2.1.14 에서 hook 추가 검토).

---

## 3. Acceptance Criteria

### 3.1 정적 + plugin validate

- ★ AC-01: `node -e "require('./lib/infra/sprint')"` 성공 (10 exports — 기존 7 + 신규 3 factory)
- ★ AC-02: `claude plugin validate .` Exit 0
- ★ AC-03: domain purity invariant 유지 (lib/domain/sprint/ 변경 0)
- ★ AC-04: PDCA invariant 유지 (lib/application/pdca-lifecycle/ 변경 0)
- ★ AC-05: hooks/hooks.json 21:24 유지
- ★ AC-06: Sprint 4 sprint-handler enhancement zone 만 변경 (12 기존 handler 변경 0, 3 신규 placeholder → real impl)

### 3.2 ★ L3 Contract Tests (SC-01~08)

- ★ AC-07: SC-01 Sprint entity shape — 12 keys exact match
- ★ AC-08: SC-02 deps interface — 11 keys exact match
- ★ AC-09: SC-03 infra return — 4 adapters + 5+ methods each
- ★ AC-10: SC-04 handleSprintAction signature — 3 args + Promise return
- ★ AC-11: SC-05 4-layer chain — skill→handler→infra→use case→entity 통과
- ★ AC-12: SC-06 ACTION_TYPES 18 entries 정확
- ★ AC-13: SC-07 SPRINT_AUTORUN_SCOPE inline ↔ mirror 1:1
- ★ AC-14: SC-08 hooks.json 21:24

### 3.3 ★ R12 Multi-perspective QA (사용자 명시 3)

- ★ AC-15: P3 bkit-evals — 4 scenarios eval-score 평균 ≥ 0.8
- ★ AC-16: P4 claude -p — 5 scenarios all Exit 0
- ★ AC-17: P5 4-System — 4 파일 동시 존재 + sprint start 후 다른 3 파일 byte diff 0 (orthogonal)
- ★ AC-18: P6 Sprint↔PDCA mapping — overlap analysis documented
- ★ AC-19: P7 plugin validate — Exit 0 (F9-120 11-cycle)
- ★ AC-20: 7 perspectives all PASS

### 3.4 Sprint 4 Real Adapter Wiring (Job Story 2)

- ★ AC-21: `createSprintInfra({ projectRoot })` 가 4 adapters return (Sprint 3 baseline)
- ★ AC-22: 신규 `createGapDetector` / `createAutoFixer` / `createDataFlowValidator` factory 각각 export
- ★ AC-23: 각 adapter no-op baseline (agentTaskRunner 미 주입 시) 동작

### 3.5 Sprint 4 sprint-handler 15 actions 완전 (Job Story 3)

- ★ AC-24: handleFork(id, newId) 가 cloneSprint + carry items 식별
- ★ AC-25: handleFeature(id, action='list'|'add'|'remove', featureName)
- ★ AC-26: handleWatch(id) 가 live snapshot + triggers + matrix

### 3.6 사용자 표면 docs

- ★ AC-27: README sprint section 30 lines 이내 + Quick Start (3 commands) + docs/06-guide reference
- ★ AC-28: CLAUDE.md sprint section 30 lines 이내 + same 정보 (단 PDCA Core Rules 직후 위치)
- ★ AC-29: docs/06-guide/sprint-management.guide.md 8 섹션 (Korean, ≥250 lines)
- ★ AC-30: docs/06-guide/sprint-migration.guide.md 5 섹션 (Korean, ≥120 lines)

### 3.7 Master Plan v1.2

- ★ AC-31: Master Plan §0 Version History v1.2 변경 사항 명시
- ★ AC-32: LOC Reconciliation 매트릭스 Sprint 1-5 actual 정확

### 3.8 Regression

- ★ AC-33: Sprint 1 40 TCs PASS
- ★ AC-34: Sprint 2 79 TCs PASS
- ★ AC-35: Sprint 3 76 TCs PASS
- ★ AC-36: Sprint 4 41 TCs PASS (incl CSI-04 8건)
- ★ AC-37: 누적 236 TCs PASS

---

## 4. Quality Gates

| Gate | Target |
|------|--------|
| Sprint 1 invariant | 0 변경 (lib/domain/sprint/, lib/application/pdca-lifecycle/) |
| Sprint 2 invariant | 0 변경 (lib/application/sprint-lifecycle/) |
| Sprint 3 invariant | 0 변경 (lib/infra/sprint/ 기존 6 파일) |
| Sprint 4 invariant | 0 변경 (sprint-handler.js — enhancement zone 제외; lib/control + lib/audit; agents/skills/templates) |
| PDCA invariant | 0 변경 |
| hooks/hooks.json invariant | 21:24 유지 |
| Domain Purity | 16 files 0 forbidden imports |
| `claude plugin validate .` | Exit 0 (F9-120 11-cycle) |
| L3 Contract | 8+ TCs PASS |
| L2 Regression | 236 TCs PASS |
| ★ P3 bkit-evals | ≥4 scenarios ≥0.8 |
| ★ P4 claude -p | 5 scenarios Exit 0 |
| ★ P5 4-System | orthogonal 검증 PASS |
| ★ P6 Sprint↔PDCA mapping | documented (overlap 분석) |
| ★ P7 plugin validate | Exit 0 |

---

## 5. Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| L3 Contract test 신규 폴더 `tests/contract/` 시 docs-code-scanner 회귀 | mkdir `tests/contract` + 1 test file 만 추가, 기존 `tests/qa/` 패턴 정합 (scripts/check-docs-code-invariants.js 검증) |
| Sprint 2 deps interface 변경 (R2 시) → Sprint 2 invariant 깨짐 | 본 sprint 5 는 deps interface 변경 X — 단순 real adapter scaffold 추가만 (consumer 측 변경 0) |
| sprint-handler.js enhancement 시 Sprint 4 기존 12 handler 회귀 | enhancement zone 만 변경, 기존 handler line touch 0 + 본 sprint qa 시 Sprint 4 41 TCs PASS 확인 |
| ★ bkit-evals skill 호출 시 LLM 비용 | scenarios 4건 한정 + cache 활용 (Anthropic 1H cache) |
| ★ claude -p headless 응답 unstable | exit code + stdout sanity 만 검증 (semantic 검증은 P3 bkit-evals 가 담당) |
| ★ 4-System 동시 mutate concurrent race | sprint start 순차 실행 (parallel 안 함) + atomic write 패턴 (Sprint 3 stateStore baseline 사용) |
| ★ MEMORY.md auto-update 부재 | Sprint 5는 verification only — 자동 갱신 hook 추가는 Sprint 6/v2.1.14 deferred (PRD §8 Scenario O 참조) |
| Korean guide 작성 시간 부족 | 본 Sprint 60-80분 Do phase 예산 내 docs 우선 작성 (시간 부족 시 guide outline + main sections 만 우선) |
| F9-120 closure 깨짐 | YAML frontmatter 변경 0 (본 sprint 는 코드 + Markdown 만), skill/agent 신규 추가 X |

---

## 6. Implementation Order (Do Phase)

**총 14 files (3 신규 dir 포함)**, 의존성 순:

### Phase Do-1: Infrastructure scaffolds (R2, ~3 files)

1. `lib/infra/sprint/gap-detector.adapter.js` — factory + no-op baseline
2. `lib/infra/sprint/auto-fixer.adapter.js` — factory + no-op baseline
3. `lib/infra/sprint/data-flow-validator.adapter.js` — factory + 7-Layer baseline

### Phase Do-2: Index barrel ext (R2 continued)

4. `lib/infra/sprint/index.js` — 3 new factory exports 추가 (Sprint 3 baseline 7 → 10 exports)

### Phase Do-3: sprint-handler enhancement (R3)

5. `scripts/sprint-handler.js` — handleFork / handleFeature / handleWatch real impl (Sprint 4 enhancement zone)

### Phase Do-4: L3 Contract test (R1)

6. `mkdir tests/contract/` (신규 디렉터리)
7. `tests/contract/v2113-sprint-contracts.test.js` — SC-01~08 8 TCs

### Phase Do-5: 사용자 표면 docs (R4, R5, R6)

8. `mkdir docs/06-guide/` (신규 디렉터리)
9. `README.md` — Sprint section ext (English, 30 lines)
10. `CLAUDE.md` — Sprint section ext (English, 30 lines)
11. `docs/06-guide/sprint-management.guide.md` — Korean user guide (8 섹션, ~280 lines)
12. `docs/06-guide/sprint-migration.guide.md` — Korean migration guide (5 섹션, ~150 lines)

### Phase Do-6: Master Plan v1.2 (R7)

13. `docs/01-plan/features/sprint-management.master-plan.md` — Version History + LOC Reconciliation

### Phase Do-7: QA preparation (R12)

14. `tests/qa/v2113-sprint-5-quality-docs.test.js` (gitignored, local) — 7-perspective QA harness

---

## 7. Out-of-scope Confirmation

| 항목 | Sprint |
|------|--------|
| BKIT_VERSION 5-loc bump | Sprint 6 |
| ADR 0007/0008/0009 Proposed → Accepted | Sprint 6 |
| CHANGELOG v2.1.13 | Sprint 6 |
| GitHub release tag/notes | Sprint 6 |
| Sprint 2 SPRINT_AUTORUN_SCOPE inline 제거 + lib/control mirror 만 사용 | v2.1.14 |
| Real backend (gap-detector/pdca-iterator/chrome-qa 실 호출) | v2.1.14 |
| L4/L5 E2E + Performance tests | v2.1.14 |
| MEMORY.md sprint archive auto-update hook | Sprint 6 또는 v2.1.14 (verification only in 본 sprint) |
| skills/agents 신규 (Sprint 5 = docs + adapters + tests only) | (해당 없음) |

---

## 8. Plan 완료 Checklist

- [x] PRD → Plan 추적성 12 mappings (R1-R12)
- [x] 핵심 목표 (Hardening + Documentation + ★ 7-perspective QA)
- [x] Requirements R1-R12 상세
- [x] Acceptance Criteria AC-01~AC-37
- [x] Quality Gates 15건 (포함 ★ P3-P7 5건)
- [x] Risks + Mitigations 9건
- [x] Implementation Order Do-1~Do-7 (14 files)
- [x] Out-of-scope 매트릭스 9 항목

---

**Next Phase**: Phase 3 Design — 코드베이스 깊이 분석 + 14 files 정확 spec + Sprint 2 deps interface 매핑 + 7-perspective QA harness pseudo-code + Cross-sprint contract matrix.
