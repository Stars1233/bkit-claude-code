# Sprint 3 PRD — v2.1.13 Sprint Management Infrastructure (State + Telemetry + Matrix + Doc Scanner)

> **Sprint ID**: `v2113-sprint-3-infrastructure`
> **Sprint of Master Plan**: 3/6 (Infrastructure — Persistence + Observability + Cross-Sprint Synchronization)
> **Phase**: PRD (1/7)
> **Status**: Active
> **Date**: 2026-05-12
> **Trust Level (override)**: L4 (사용자 명시)
> **Master Plan**: `docs/01-plan/features/sprint-management.master-plan.md` v1.1 §3.6
> **ADRs**: 0007 / 0008 / 0009 (Proposed)
> **Depends on**: Sprint 1 (`a7009a5`) + Sprint 2 (`97e48b1`) completed
> **Branch**: `feature/v2113-sprint-management`
> **사용자 신규 명시**: "Sprint 별로 만들어진 결과물들이 유기적으로 상호 연동되어 동작 되어야 해" → **cross-sprint integration verification 강제**

---

## 0. Context Anchor (Master Plan §1 + Sprint 2 §0에서 갱신 — Plan/Design/Do/Iterate/QA/Report 모든 phase에 전파)

| Key | Value |
|-----|-------|
| **WHY** | Sprint 1 (Domain frozen schema) + Sprint 2 (Application auto-run engine) 위에 **Infrastructure adapter layer 영구화**. Sprint 2 use cases가 deps inject 패턴으로 작성된 11 deps (stateStore, eventEmitter, gateEvaluator, autoPauseChecker, gapDetector, autoFixer, dataFlowValidator, docPathResolver, fileWriter, kpiCalculator, clock) 중 — Sprint 3은 **persistence (stateStore)** + **observability (eventEmitter → OTEL + audit-logger)** + **doc-driven scope discovery (docPathResolver 확장)** + **3-matrix sync** 를 실 어댑터로 구현. **사용자 신규 명시 ★**: Sprint 1 ↔ Sprint 2 ↔ Sprint 3 **유기적 상호 연동** 검증이 본 Sprint 핵심 가치. |
| **WHO** | (1차) bkit 사용자 — sprint state 가 `.bkit/state/sprints/{id}.json`에 영구화되어 사용자 세션 간 유지. (2차) Sprint 4 Presentation — skills/sprint/SKILL.md handler가 본 Sprint 3 어댑터 inject로 Sprint 2 호출. (3차) bkit core CI / audit-logger / OTEL collector — SprintEvents 5건 표준 schema 통합. (4차) Sprint 5 QA matrix consumer — 3 matrix (data-flow / api-contract / test-coverage) 자동 갱신. (5차) bkit 핵심 invariant CI — Domain Purity / PDCA invariant / Sprint 1/2 invariant 0 변경. |
| **RISK** | (a) **★ Cross-sprint integration 단절**: Sprint 2 deps interface 와 Sprint 3 adapter signature 불일치 → 사용자 명시 "유기적 상호 연동" 위반. (b) **Atomic write 실패**: state-store crash mid-write 시 corruption + Sprint 2 advance-phase 진행 중 실패 시 inconsistent state. (c) **OTEL emission 회귀**: telemetry circular call (#54196 #56293 회귀 risk, ENH-281 OTEL 10 누적). (d) **Domain Purity 깨짐**: 본 Sprint 3 은 Infrastructure 이므로 fs/path/os OK, 단 lib/domain/sprint/ 변경 0건 보장. (e) **`.bkit/state/sprints/` 경로 충돌**: 기존 .bkit/state/ 7 파일 (pdca-status / trust-profile / quality-metrics / memory / regression-rules / session-history / batch/ / resume/ / workflows/) 와 충돌 없이 신규 sprints/ 하위 디렉터리 추가. (f) **PHASE_TIMEOUT trigger clock precision**: telemetry timestamp 와 phaseHistory.enteredAt 동일 clock 사용 보장. (g) **Doc scanner regex false positives**: master plan / phase doc 파싱 시 markdown false match. (h) **3-matrix concurrent update**: data-flow + api-contract + test-coverage 동시 갱신 시 partial write. (i) **사용자 명시 8개국어 트리거 constraint**: Sprint 3 은 lib/infra/ 만 손대므로 skill/agent 미생성 — Sprint 4 결정적 적용 유지. (j) **L4 mode 안전성**: 사용자 결정 존중하되 Infrastructure layer 변경이 Domain Purity 위반 0건 검증 필수. |
| **SUCCESS** | (1) **`lib/infra/sprint/` 4 modules** 영구화 (state-store + telemetry + doc-scanner + matrix-sync) + helper sprint-paths.js + barrel. (2) **Sprint 2 deps interface 11/11 모두 adapter 제공** — startSprint/advancePhase/iterateSprint/verifyDataFlow/generateReport/archiveSprint/pauseSprint/resumeSprint 모두 본 Sprint 3 어댑터로 정상 동작. (3) **`.bkit/state/sprints/{id}.json` 영구화** — atomic write (tmp+rename) + Sprint 1 entity schema (`SprintInput`/`Sprint` JSDoc) 정확 매칭. (4) **SprintEvents → audit-logger + OTEL dual sink** 통합 — 5 event types (Created / PhaseChanged / Archived / Paused / Resumed) 모두 emission 가능. (5) **Doc Scanner** — Sprint master plan + 6 phase docs (PRD / Plan / Design / Iterate / QA / Report) 자동 발견 + metadata 추출. (6) **3-matrix sync** — data-flow-matrix (feature × hop) + api-contract-matrix (feature × endpoint) + test-coverage-matrix (feature × L1-L5) 자동 갱신. (7) **★ Cross-sprint integration test** — Sprint 1 (createSprint) + Sprint 2 (startSprint L3) + Sprint 3 (real stateStore + real eventEmitter) end-to-end PRD → Report 자율 진행 검증 (사용자 명시 핵심). (8) **PDCA invariant + Sprint 1/2 invariant 0 변경**. (9) **Domain Purity 16 files 0 forbidden imports** 유지. (10) **L2 integration 60+ TCs 100% PASS** + cross-sprint integration 10+ TCs. (11) `claude plugin validate .` Exit 0 (F9-120 closure 9-cycle 연속). |
| **SCOPE** | **In-scope 4 modules + 1 helper + barrel** in `lib/infra/sprint/`: (a) `sprint-state-store.adapter.js` — atomic JSON persistence (.bkit/state/sprints/{id}.json + .bkit/state/sprint-status.json root index + .bkit/runtime/sprint-feature-map.json reverse lookup), (b) `sprint-telemetry.adapter.js` — SprintEvents → audit-logger + OTEL dual sink (lib/audit/audit-logger 활용 + lib/infra/telemetry.js 활용, ENH-281 OTEL 10 누적 attribute), (c) `sprint-doc-scanner.adapter.js` — sprint master plan + 6 phase docs 발견 + metadata 추출, (d) `matrix-sync.adapter.js` — 3 matrix 자동 갱신 + atomic write, (e) `sprint-paths.js` — pure path resolver helper (Domain ↔ Application 어디서나 가져다 쓸 수 있는 path 상수). **`lib/infra/sprint/index.js`** 신규 barrel. **Out-of-scope (Sprint 4~6)**: skills/sprint/SKILL.md + 4 agents + hooks (Sprint 4), /sprint command 등록 (Sprint 4), `/control` automation-controller full sprint integration (Sprint 4), SPRINT_AUTORUN_SCOPE 정식 lib/control 으로 옮김 (Sprint 4), template engine 통합 (Sprint 4 generate-report 강화), L3+/L4/L5 tests (Sprint 5), 8개국어 트리거 keywords (Sprint 4 결정적 적용 — 사용자 명시 보존), BKIT_VERSION bump + ADR Accepted (Sprint 6). **Tests**: L2 integration only — cross-sprint integration 포함 + fs mock 또는 temp directory 사용. **사용자 신규 명시 ★**: Cross-sprint 유기적 상호 연동 = Sprint 3 핵심 acceptance criteria. |

---

## 1. Problem Statement

Sprint 2에서 Application 8 use cases를 frozen 상태로 영구화했으나 — **모든 deps가 mock 또는 default no-op**. 사용자가 `/sprint start my-sprint` 호출 시 실행할 수 있는 코드는 있으나, sprint state 는 메모리에만 존재 → 세션 종료 시 사라짐. SprintEvents 는 emit 되지만 외부 sink (audit-log / OTEL) 미연결. Master Plan + Phase docs 의 실제 파일 발견 부재. 3 matrix 사양은 있으나 갱신 logic 부재.

### 1.1 부재한 기능 (현 commit `97e48b1` 상태)

| 부재 | 영향 |
|------|------|
| `sprint-state-store.adapter.js` 없음 | Sprint 2 startSprint/advancePhase 가 in-memory Map 만 사용 → 세션 간 유지 불가 |
| `sprint-telemetry.adapter.js` 없음 | SprintEvents 5건 emit 되어도 audit-logger 와 OTEL 미연결 (Defense Layer 3 sanitizer 통합 결손) |
| `sprint-doc-scanner.adapter.js` 없음 | 기존 sprint 발견 불가 — `/sprint list` 처럼 사용자가 자신 sprint 묶음 조회 불가 |
| `matrix-sync.adapter.js` 없음 | 3 matrix 자동 갱신 미작동 → Master Plan §3.4 Phase B 통합 정합 결손 |
| `sprint-paths.js` helper 없음 | path 상수 분산 — `.bkit/state/sprints/{id}.json` 경로 string magic 위험 |
| `lib/infra/sprint/index.js` barrel 없음 | Sprint 4 skill handler가 5+ require() 필요 → API surface 통제 부재 |

### 1.2 Sprint 2 deps interface ↔ Sprint 3 adapter 매핑 gap

Sprint 2 startSprint(input, deps) 의 11 deps 중 본 Sprint 3 실 adapter 제공 매트릭스:

| Sprint 2 deps key | Sprint 3 adapter | 본 Sprint 작업 |
|------------------|-----------------|--------------|
| `deps.stateStore` (`.save(s)/.load(id)`) | `sprint-state-store.adapter.js` | ★ 본 Sprint 신규 |
| `deps.eventEmitter` | `sprint-telemetry.adapter.js` (audit + OTEL dual) | ★ 본 Sprint 신규 |
| `deps.gateEvaluator` | (default Sprint 2 `quality-gates.evaluatePhase`) | 변경 없음 |
| `deps.autoPauseChecker` | (default Sprint 2 `auto-pause.checkAutoPauseTriggers`) | 변경 없음 |
| `deps.phaseHandlers` | (default Sprint 2 in start-sprint) | 변경 없음 |
| `deps.clock` | (default `new Date().toISOString()`) | 변경 없음 |
| `deps.gapDetector` | Sprint 4 (real adapter — code-analyzer 통합) | 본 Sprint X |
| `deps.autoFixer` | Sprint 4 (real adapter — pdca-iterator 통합) | 본 Sprint X |
| `deps.dataFlowValidator` | Sprint 4 (real adapter — chrome-qa 통합) | 본 Sprint X |
| `deps.docPathResolver` | (default Sprint 1 `sprintPhaseDocPath` — Sprint 3 doc-scanner 보조) | 본 Sprint 보조 |
| `deps.fileWriter` | `sprint-state-store.adapter.js` 내부 atomic write 재사용 | 본 Sprint 보조 |

### 1.3 사용자 명시 cross-sprint 유기적 상호 연동 (★ 핵심)

본 Sprint 3 acceptance criterion 신규:

> "Sprint 별로 만들어진 결과물들이 유기적으로 상호 연동되어 동작 되어야 해"

검증 매트릭스:
| Cross-sprint 검증 | 구체 시나리오 | 검증 방법 |
|------------------|-------------|----------|
| Sprint 1 entity ↔ Sprint 3 state-store | `createSprint(input)` → state-store.save(s) → state-store.load(id) → 동일 Sprint 객체 | L2 TC + 직접 실행 |
| Sprint 2 startSprint ↔ Sprint 3 stateStore | `startSprint(input, { stateStore: realAdapter })` → `.bkit/state/sprints/{id}.json` 파일 존재 | tmp dir TC |
| Sprint 2 SprintEvents 5건 ↔ Sprint 3 telemetry | startSprint 진행 시 5 event types 모두 audit-log + OTEL sink | event capture TC |
| Sprint 2 advance-phase phaseHistory ↔ Sprint 3 state-store atomic | advance 진행 중 process kill 시뮬레이션 → state 일관성 | atomic write TC |
| Sprint 2 generate-report ↔ Sprint 3 doc-scanner | generateReport → 실 디스크 파일 작성 → doc-scanner 가 재발견 | round-trip TC |
| Sprint 2 verify-data-flow ↔ Sprint 3 matrix-sync | verifyDataFlow 결과 → matrix-sync 가 data-flow-matrix 갱신 | matrix consistency TC |
| Sprint 1 SprintEvents 5건 ↔ Sprint 3 telemetry sanitize | audit-logger sanitizer 8 patterns 통과 | sanitize TC |
| 기존 `.bkit/state/` 7 파일 충돌 검증 | sprint-state-store 가 기존 pdca-status/trust-profile 등에 무관 | path isolation TC |

---

## 2. Job Stories (JTBD 6-Part)

### Job Story 1 — bkit 사용자 (sprint 영구화)
- **When** 사용자가 `/sprint start my-launch` 후 세션을 종료하고 다음 날 재개할 때,
- **I want to** `.bkit/state/sprints/my-launch.json` 에 sprint 상태가 자동 저장되어 있어
- **so I can** 세션 간 sprint 진행을 유지하고 `/sprint resume my-launch` 로 정확히 동일 상태에서 재개.

### Job Story 2 — bkit 사용자 (sprint 발견)
- **When** 사용자가 자신의 프로젝트에 어떤 sprint들이 있었는지 조회하고 싶을 때,
- **I want to** `sprint-doc-scanner` 가 `docs/01-plan/features/*.master-plan.md` + `.bkit/state/sprints/*.json` 모두 스캔
- **so I can** `/sprint list` 호출 시 활성 + 보관 sprint 모두 즉시 표시.

### Job Story 3 — bkit 사용자 (audit trail)
- **When** sprint 운영 중 auto-pause 또는 phase 전이 발생 시,
- **I want to** `.bkit/audit/YYYY-MM-DD.jsonl` 에 SprintEvents 5건 모두 표준 schema 로 기록
- **so I can** 사후 troubleshooting + 사용자 trust 향상 + Defense Layer 3 sanitizer 가 PII 자동 redact.

### Job Story 4 — bkit 사용자 (OTEL 관측)
- **When** OTEL_ENDPOINT 환경 변수 설정된 사용자가 sprint 운영 시,
- **I want to** SprintEvents → OTEL collector 로 자동 emit (agent_id / parent_agent_id / sprint_id / sprint_phase attribute 포함)
- **so I can** 외부 observability 시스템 (Grafana / Datadog 등) 에서 sprint metric 추적.

### Job Story 5 — Sprint 4 skill handler 작업자
- **When** Sprint 4 에서 `/sprint start` skill action handler 를 작성할 때,
- **I want to** `require('lib/infra/sprint')` 한 줄로 모든 adapter 획득 후 Sprint 2 startSprint 호출
- **so I can** skill body 는 input parsing 만, business + persistence 는 layered architecture 에 위임.

### Job Story 6 — Sprint 5 matrix consumer
- **When** Sprint 5 에서 cumulative KPI 보고서 생성 시,
- **I want to** `matrix-sync.read({type: 'data-flow'})` 호출로 모든 active sprint × feature × hop 통합 매트릭스 획득
- **so I can** Cross-sprint cumulative dataFlowIntegrity 통합 보고.

### Job Story 7 — bkit core CI / Domain Purity invariant
- **When** Sprint 3 PR merge 전 CI 실행 시,
- **I want to** `scripts/check-domain-purity.js` 가 16 files 0 forbidden imports 유지 + `git diff lib/domain/sprint/` empty + `git diff lib/application/sprint-lifecycle/` empty
- **so I can** Infrastructure layer 추가가 Domain/Application invariant 깨지지 않음 검증.

### Job Story 8 — bkit 사용자 (cross-sprint 유기적 상호 연동, ★ 신규)
- **When** 사용자가 `/sprint start my-launch` (L3 trust) 자율 실행 시,
- **I want to** Sprint 1 (createSprint) → Sprint 2 (startSprint orchestrator) → Sprint 3 (stateStore + telemetry adapter) end-to-end 자율 진행 + 디스크 파일 영구화 + OTEL emit + audit-log 기록
- **so I can** 세 Sprint 의 결과물이 단일 사용자 액션으로 통합 동작 (사용자 명시 핵심 요구).

---

## 3. User Personas

### Persona A: bkit 사용자 (Sprint End-user, Sprint 4 Presentation 에서 표면화)
- **목표**: `/sprint start` 후 disk 영구화 + 세션 간 유지 + audit trail 확인 가능
- **요구사항**:
  - `.bkit/state/sprints/{id}.json` 위치 명확
  - audit-log standard format (`YYYY-MM-DD.jsonl`)
  - OTEL 통합은 opt-in (환경 변수)

### Persona B: Sprint 4 Skill handler 작업자
- **목표**: 본 Sprint 3 barrel `require('lib/infra/sprint')` 한 줄로 전체 adapter 획득
- **요구사항**:
  - `getStateStore()` / `getEventEmitter()` / `getDocScanner()` / `getMatrixSync()` 4 factory function
  - Sprint 2 deps interface 1:1 매칭 contract

### Persona C: bkit core CI / arch-auditor
- **목표**: Sprint 3 추가가 Sprint 1/2 invariant 0 깨짐 + Domain Purity 0 forbidden imports 유지
- **요구사항**:
  - lib/domain/sprint/* 변경 0건 검증
  - lib/application/sprint-lifecycle/* 변경 0건 검증 (Sprint 2 invariant)
  - Sprint 3 새 modules 모두 lib/infra/sprint/ 내부 한정

---

## 4. Solution Overview

### 4.1 6 modules + barrel 구조

```
lib/infra/sprint/                          # 신규 디렉터리
├── index.js                               # barrel — 9~12 factory + 직접 함수 export
├── sprint-paths.js                        # pure path helper (no I/O)
├── sprint-state-store.adapter.js          # atomic JSON persistence
├── sprint-telemetry.adapter.js            # SprintEvents → audit-log + OTEL dual
├── sprint-doc-scanner.adapter.js          # master plan + 6 phase docs scan
└── matrix-sync.adapter.js                 # 3 matrix sync atomic
```

### 4.2 Module signature (5 modules + barrel)

```javascript
// 1. sprint-paths.js (pure)
function getSprintStateDir(projectRoot)        // .bkit/state/sprints/
function getSprintStateFile(projectRoot, id)   // .bkit/state/sprints/{id}.json
function getSprintIndexFile(projectRoot)       // .bkit/state/sprint-status.json (root index)
function getSprintFeatureMapFile(projectRoot)  // .bkit/runtime/sprint-feature-map.json
function getSprintMatrixDir(projectRoot)       // .bkit/runtime/sprint-matrices/
function getSprintMatrixFile(projectRoot, type) // {type}-matrix.json
function getSprintDocPath(projectRoot, id, phase) // delegates to Sprint 1 sprintPhaseDocPath + absolute prefix

// 2. sprint-state-store.adapter.js
function createStateStore({ projectRoot, clock? }) → {
  save: async (sprint) => void,        // atomic tmp+rename + update root index
  load: async (id) => Sprint|null,
  list: async () => Array<{ id, name, phase, status, updatedAt }>,
  remove: async (id) => void,
  getIndex: async () => Object,        // root sprint-status.json
}

// 3. sprint-telemetry.adapter.js
function createEventEmitter({ projectRoot, otelEndpoint?, otelServiceName? }) → {
  emit: (sprintEvent) => void,         // sync — delegates to audit-logger + OTEL (non-blocking)
  flush: async () => void,             // for tests
}

// 4. sprint-doc-scanner.adapter.js
function createDocScanner({ projectRoot }) → {
  findAllSprints: async () => Array<{ id, masterPlanPath, phaseDocsPresent }>,
  findSprintDocs: async (id) => SprintDocs,  // Sprint 1 SprintDocs typedef
  hasPhaseDoc: async (id, phase) => boolean,
}

// 5. matrix-sync.adapter.js
function createMatrixSync({ projectRoot }) → {
  syncDataFlow: async (sprintId, featureName, hopResults) => void,
  syncApiContract: async (sprintId, featureName, contractResults) => void,
  syncTestCoverage: async (sprintId, featureName, layerCounts) => void,
  read: async (type) => Object,        // type: 'data-flow' | 'api-contract' | 'test-coverage'
}

// 6. index.js (barrel)
module.exports = {
  // Factories
  createStateStore, createEventEmitter, createDocScanner, createMatrixSync,
  // Paths (re-export from sprint-paths.js)
  getSprintStateDir, getSprintStateFile, ...
  // Convenience composite factory
  createSprintInfra: ({ projectRoot, otelEndpoint? }) => ({
    stateStore: createStateStore({ projectRoot }),
    eventEmitter: createEventEmitter({ projectRoot, otelEndpoint }),
    docScanner: createDocScanner({ projectRoot }),
    matrixSync: createMatrixSync({ projectRoot }),
  }),
};
```

### 4.3 .bkit/ disk 구조 (신규 영역)

```
.bkit/
├── state/                                # 기존 + sprint 추가
│   ├── pdca-status.json                  # 기존 (변경 X)
│   ├── trust-profile.json                # 기존 (변경 X)
│   ├── quality-metrics.json              # 기존 (변경 X)
│   ├── ... (4 more existing files, untouched)
│   ├── sprint-status.json                # ★ 신규 root index
│   └── sprints/                          # ★ 신규 디렉터리
│       ├── {sprint-id-1}.json
│       └── {sprint-id-2}.json
├── runtime/                              # 기존 + sprint 추가
│   ├── token-ledger.ndjson               # 기존
│   ├── sprint-feature-map.json           # ★ 신규
│   └── sprint-matrices/                  # ★ 신규
│       ├── data-flow-matrix.json
│       ├── api-contract-matrix.json
│       └── test-coverage-matrix.json
└── audit/
    └── YYYY-MM-DD.jsonl                  # 기존 — SprintEvents 자동 통합
```

### 4.4 Cross-Sprint 유기적 통합 데이터 흐름 (★ 사용자 명시)

```
사용자 → /sprint start my-launch (L3, Sprint 4 skill handler)
              │
              ▼
   require('lib/infra/sprint').createSprintInfra({ projectRoot })
              │
              ▼  produces { stateStore, eventEmitter, docScanner, matrixSync }
              │
              ▼
   require('lib/application/sprint-lifecycle').startSprint(input, deps)
              │
              ▼
   ┌──────────┴────────────────────────────────────────────────┐
   │ Sprint 2 startSprint orchestrator                          │
   │   1) createSprint (Sprint 1)                               │
   │   2) stateStore.save(sprint) ──→ Sprint 3 atomic write     │
   │      → .bkit/state/sprints/my-launch.json (tmp+rename)     │
   │      → .bkit/state/sprint-status.json (root index update)  │
   │   3) eventEmitter(SprintCreated) ──→ Sprint 3 dual sink    │
   │      → audit-logger.writeAuditLog (file sink)              │
   │      → OTEL collector (if OTEL_ENDPOINT set)               │
   │   4) auto-run loop:                                        │
   │      - advancePhase (Sprint 2)                             │
   │        → stateStore.save                                   │
   │        → eventEmitter(SprintPhaseChanged)                  │
   │      - iterateSprint (Sprint 2)                            │
   │      - verifyDataFlow (Sprint 2)                           │
   │        → matrixSync.syncDataFlow ──→ Sprint 3 matrix update│
   │      - generateReport (Sprint 2)                           │
   │        → docScanner.findSprintDocs (read-back verification)│
   │      - archiveSprint (Sprint 2)                            │
   │        → stateStore.save (status='archived')               │
   │        → eventEmitter(SprintArchived)                      │
   └────────────────────────────────────────────────────────────┘
              │
              ▼
   세션 종료 후 재개:
   require('lib/infra/sprint').createStateStore.load('my-launch')
   → 디스크에서 정확히 동일 Sprint 객체 반환 (round-trip 검증)
   → /sprint resume my-launch 정확히 직전 phase 부터 재개
```

### 4.5 Atomic Write 패턴 (`.adapter.js` 모두 적용)

Sprint 2의 advance-phase 진행 중 process kill 시뮬레이션 시 state 일관성 보장:

```javascript
// 1) write to tmp file
fs.writeFileSync(filePath + '.tmp.' + process.pid, JSON.stringify(data, null, 2));
// 2) atomic rename
fs.renameSync(filePath + '.tmp.' + process.pid, filePath);
// 3) on error: cleanup tmp file
catch (e) { try { fs.unlinkSync(tmpPath); } catch (_) {} throw e; }
```

이는 `lib/core/state-store.js` 의 검증된 패턴 — 그대로 사용 (재발명 X).

### 4.6 ENH-292 Sequential Dispatch 자기적용 (계속)

본 Sprint 3 어댑터는 multi-agent spawn 0건 (Infrastructure 단순 I/O) 이지만:
- matrix-sync.adapter 의 3 matrix 갱신은 sequential (data-flow → api-contract → test-coverage)
- doc-scanner 의 7 phase doc 발견은 sequential (Sprint 1 sprintPhaseDocPath 7 paths 순회)

### 4.7 ENH-281 OTEL 10 누적 통합

| OTEL attribute | Source |
|---------------|--------|
| `bkit.sprint.id` | sprint.id |
| `bkit.sprint.phase` | sprint.phase |
| `bkit.sprint.status` | sprint.status |
| `bkit.sprint.event_type` | SprintEvents.* type |
| `bkit.sprint.severity` | (SprintPaused 만) trigger.severity |
| `bkit.sprint.trigger_id` | (SprintPaused 만) trigger.triggerId |
| `agent_id` (F10-139) | env.CLAUDE_AGENT_ID or 'main' |
| `parent_agent_id` (F10-139) | env.CLAUDE_PARENT_AGENT_ID |
| `service.name` | OTEL_SERVICE_NAME or 'bkit' |
| `bkit.version` | lib/core/version.BKIT_VERSION |

### 4.8 audit-logger 통합 (Defense Layer 3)

기존 `lib/audit/audit-logger.js` (`writeAuditLog(actionType, payload)`) 활용:

| SprintEvent type | audit-logger action_type | payload |
|-----------------|------------------------|---------|
| SprintCreated | `sprint_created` | { sprintId, name, phase } |
| SprintPhaseChanged | `phase_transition` | { sprintId, fromPhase, toPhase, reason } |
| SprintArchived | `feature_archived` | { sprintId, archivedAt, reason, kpiSnapshot } |
| SprintPaused | `sprint_paused` (신규 action_type, ACTION_TYPES 확장 X — Sprint 4) | { sprintId, trigger, severity, message } |
| SprintResumed | `sprint_resumed` (신규 action_type) | { sprintId, pausedAt, resumedAt, durationMs } |

**Note**: ACTION_TYPES enum 확장은 Sprint 4 에서 (Sprint 3 은 free-form payload, audit-logger 가 unknown action 도 accept).

---

## 5. Success Metrics

### 5.1 정량 메트릭

| Metric | Target | 측정 방법 |
|--------|--------|----------|
| Sprint 3 modules created | 6 files (5 adapter + 1 helper) + 1 barrel | file existence |
| LOC estimate | ~900~1,100 | wc -l |
| Sprint 1 invariant | 0 변경 | git diff lib/domain/sprint/ |
| Sprint 2 invariant | 0 변경 | git diff lib/application/sprint-lifecycle/ |
| PDCA 9-phase invariant | 0 변경 | git diff lib/application/pdca-lifecycle/ |
| Domain Purity (16 files) | 0 forbidden | scripts/check-domain-purity.js Exit 0 |
| Sprint 2 deps interface 정확 매칭 | 11/11 deps key | TC L2-INT-01 |
| 5 SprintEvents → audit-logger | 5/5 emit verified | TC L2-T-01 |
| 5 SprintEvents → OTEL (opt-in) | 5/5 OTEL emit verified (when endpoint set) | TC L2-T-02 |
| Atomic write tmp+rename | 100% | TC L2-S-01 (mid-write kill simulation) |
| .bkit/state/sprints/ isolation | 7 existing files 변경 0 | TC L2-S-02 |
| 3 matrix sync atomicity | 100% | TC L2-M-01 |
| L2 integration TC pass | 100% (60+ TCs) | node test runner |
| Cross-sprint integration TCs | 10+ TCs PASS | TC L2-CSI-01~10 |
| `claude plugin validate .` Exit 0 | F9-120 closure 9-cycle | claude command |

### 5.2 정성 메트릭

- 모든 어댑터 factory pattern (`createX({ projectRoot, ... })`)으로 의존성 명시
- atomic write 일관 적용 (5 modules)
- OTEL emission 은 opt-in (overhead 0 by default)
- Sprint 1/2 코드 변경 0건 (Infrastructure 만 추가)

---

## 6. Out-of-scope (Sprint 3 명시 제외)

| 항목 | 위치 | Sprint |
|------|------|--------|
| skills/sprint/SKILL.md | skills/ | Sprint 4 |
| 4 agents/sprint-*.md | agents/ | Sprint 4 |
| hooks scripts 확장 | scripts/ | Sprint 4 |
| templates/sprint/*.template.md | templates/ | Sprint 4 |
| /control automation-controller.js full sprint integration | lib/control/ | Sprint 4 |
| SPRINT_AUTORUN_SCOPE 정식 lib/control 으로 옮김 | lib/control/automation-controller.js | Sprint 4 |
| Sprint user guide / migration guide | docs/ | Sprint 5 |
| README / CLAUDE.md update | docs/ | Sprint 5 |
| BKIT_VERSION bump | bkit.config.json 등 5-loc | Sprint 6 |
| ADR 0007/0008/0009 Accepted | docs/adr/ | Sprint 6 |
| L3/L4/L5 tests | tests + test/contract | Sprint 5 |
| 8개국어 자동 트리거 키워드 | skills/sprint/SKILL.md + agents/sprint-*.md frontmatter | Sprint 4 (사용자 명시 보존) |
| audit-logger ACTION_TYPES enum 확장 (sprint_paused, sprint_resumed) | lib/audit/audit-logger.js | Sprint 4 |
| Sprint 4 real gap-detector / auto-fixer / chrome-qa adapter | lib/infra/sprint/ + Sprint 4 | Sprint 4 |

### 6.1 ★ 사용자 명시 사항 (Sprint 4 에서 결정적 적용)

사용자가 Sprint 2 시작 시 명시:
> "skills, agents는 YAML frontmatter가 중요하며 8개국어 자동 트리거 키워드와 @docs 문서를 제외하고는 모두 영어로 구현해야해"

→ **Sprint 3 은 lib/infra/ 만 손대므로 skills/agents 미생성**. 본 사용자 결정은 **Sprint 4 (Presentation) 결정적 적용** — Sprint 4 PRD/Plan 에서 다음 항목 명시 반영:
- skills/sprint/SKILL.md frontmatter (name / description / allowed-tools / triggers)
- 4 agents/sprint-*.md frontmatter (name / description / allowed-tools / model / triggers)
- `triggers:` 필드에 8개국어 (EN, KO, JA, ZH, ES, FR, DE, IT) 키워드 풀세트
- code (lib + scripts + skill body + agent body) 모두 영어
- docs/ 폴더 (PRD + Plan + Design + Iterate + QA + Report) 만 한국어
- 본 Sprint 3 코드 자체도 영어 (Sprint 1/2 와 동일)
- @docs reference (`@docs/04-report/...` 같은 mention) 제외

본 Sprint 3 의 모든 adapter code 도 **영어 주석/identifier** 유지 (Sprint 1/2 와 동일).

### 6.2 ★ 사용자 명시 cross-sprint 유기적 상호 연동 (★ 본 Sprint 핵심 적용)

> "Sprint 별로 만들어진 결과물들이 유기적으로 상호 연동되어 동작 되어야 해"

→ **Sprint 3 cross-sprint integration TC group 신설** (TC L2-CSI-01~10, 10+ 시나리오):
| TC ID | 시나리오 |
|-------|---------|
| CSI-01 | createSprint (S1) → stateStore.save (S3) → stateStore.load (S3) — round-trip identity |
| CSI-02 | startSprint (S2) with real stateStore (S3) — L3 sprint full PRD→Report + disk 영구화 |
| CSI-03 | advancePhase (S2) with real eventEmitter (S3) — SprintPhaseChanged → audit-log file |
| CSI-04 | pauseSprint (S2) with real eventEmitter (S3) — SprintPaused → audit-log |
| CSI-05 | resumeSprint (S2) — SprintResumed → audit-log |
| CSI-06 | archiveSprint (S2) with real stateStore (S3) — status='archived' 디스크 영구화 |
| CSI-07 | verifyDataFlow (S2) with real matrixSync (S3) — data-flow-matrix.json 갱신 |
| CSI-08 | generateReport (S2) — 디스크 write + docScanner (S3) 재발견 |
| CSI-09 | 세션 종료 후 재개 시뮬레이션 — startSprint → kill → load → 정확한 phase 복원 |
| CSI-10 | atomic write mid-process — partial write 시뮬레이션 + 일관성 검증 |

---

## 7. Stakeholder Map

| Stakeholder | Role | Sprint 3 영향 |
|------------|------|--------------|
| **kay kim** | Decision maker / Implementer | 모든 phase 진행 |
| **Sprint 1 Domain (immutable)** | Foundation | 본 Sprint 3 어댑터가 Sprint 1 entity schema/JSDoc 정확 매칭 + 0 변경 |
| **Sprint 2 Application (immutable)** | Consumer interface | 본 Sprint 3 어댑터가 Sprint 2 deps interface 11 key 1:1 매칭 + 0 변경 |
| **Sprint 4 Presentation** | Future consumer | createSprintInfra() 호출로 사용 |
| **lib/core/state-store.js** | Existing pattern | atomic write 패턴 reference |
| **lib/audit/audit-logger.js** | Existing dual sink target | SprintEvents → writeAuditLog 통합 |
| **lib/infra/telemetry.js** | Existing OTEL pattern | SprintEvents → OTEL 통합 패턴 reference (회귀 X) |
| **lib/infra/docs-code-scanner.js** | Existing pattern | sprint-doc-scanner 패턴 reference |
| **lib/domain/ports/state-store.port.js** | Type-only Port | Sprint 3 어댑터가 본 Port interface 준수 (loose) |
| **scripts/check-domain-purity.js** | CI gate | Sprint 3 은 Infrastructure → 검증 대상 아님, 단 Sprint 1/2 invariant 유지 |
| **bkit 사용자** | End-user | Sprint 4 에서 표면화, 본 Sprint 3 은 disk 영구화 + OTEL + audit-log 가치 제공 |

---

## 8. Pre-mortem (실패 시나리오 + 사전 방지)

### Scenario A: Sprint 2 deps interface 불일치 (cross-sprint 단절)
- **영향**: 사용자 명시 "유기적 상호 연동" 위반 + Sprint 2 startSprint 호출 시 runtime crash
- **방지**:
  - PRD §1.2 11 deps key 매트릭스 명시
  - Design §X 에서 Sprint 2 use case source 직접 인용 (각 deps call signature)
  - TC L2-INT-01 11 deps 모두 inject 가능 검증

### Scenario B: atomic write 실패 → state corruption
- **영향**: Sprint 2 advance-phase 진행 중 crash 시 .bkit/state/sprints/{id}.json 손상
- **방지**:
  - `lib/core/state-store.js` 의 검증된 tmp+rename 패턴 그대로 사용
  - cleanup tmp file on error
  - TC L2-S-01 mid-write SIGTERM 시뮬레이션

### Scenario C: PDCA 9-phase invariant 깨짐
- **영향**: ADR 0005 위반, bkit core 회귀
- **방지**:
  - Sprint 3 어댑터는 PDCA enum 절대 import 안 함 (Sprint enum 만)
  - git diff lib/application/pdca-lifecycle/ → 변경 0건 확인 (Phase 6 QA)

### Scenario D: Sprint 1/2 invariant 깨짐
- **영향**: Sprint 1/2 frozen 약속 위반 + 향후 Sprint 4~6 기반 흔들림
- **방지**:
  - 본 Sprint 3 은 추가만, 변경 0건
  - git diff lib/domain/sprint/ + git diff lib/application/sprint-lifecycle/ empty

### Scenario E: audit-logger circular call (#54196 회귀)
- **영향**: telemetry → audit-logger → telemetry 무한 재귀 (2026-04-22 incident)
- **방지**:
  - Sprint 3 telemetry adapter 는 `lib/audit/audit-logger.writeAuditLog` 직접 호출만
  - lib/infra/telemetry.js 의 `createDualSink` 패턴 회피 (recursion danger zone)
  - TC L2-T-04 1000 회 emit 후 stack overflow 부재 검증

### Scenario F: OTEL emission 성능 회귀
- **영향**: 사용자 환경에서 OTEL_ENDPOINT 미설정 시에도 overhead 발생
- **방지**:
  - OTEL emission 은 OTEL_ENDPOINT 환경 변수 set 시에만 실행 (lazy check)
  - default 는 file sink (audit-logger) 만
  - TC L2-T-03 OTEL_ENDPOINT 미설정 시 emit 0 ms overhead

### Scenario G: doc-scanner regex false positives
- **영향**: master plan + 6 phase docs 발견 시 false match → 잘못된 sprint id 추출
- **방지**:
  - Sprint 1 `validateSprintInput` regex 재사용 (`SPRINT_NAME_REGEX`)
  - file basename 매칭만 (path traversal 회피)
  - TC L2-D-01 다양한 false-positive 케이스 검증

### Scenario H: 3-matrix concurrent update partial write
- **영향**: data-flow-matrix 갱신 중 process kill 시 invalid JSON
- **방지**:
  - atomic write 일관 적용
  - matrix-sync 의 각 sync 함수가 read → mutate → write 패턴 (read-modify-write atomicity)
  - TC L2-M-02 concurrent update 시뮬레이션 (sequential 보장)

### Scenario I: .bkit/state/sprints/ 경로 충돌
- **영향**: 기존 .bkit/state/ 7 파일과 충돌 → 사용자 환경 손상
- **방지**:
  - 신규 path 는 `.bkit/state/sprints/` (하위 디렉터리) — 기존 7 파일과 충돌 0
  - `.bkit/state/sprint-status.json` (root index) — 기존 파일명 충돌 0 확인
  - TC L2-S-02 path isolation 검증

### Scenario J: clock skew 양 어댑터 사이
- **영향**: sprint-state-store updatedAt 과 sprint-telemetry SprintEvents timestamp 불일치
- **방지**:
  - 두 어댑터 모두 deps.clock injection
  - 동일 ISO 8601 string 형식

---

## 9. Sprint 3 Phase 흐름 (자체 PDCA 7-phase)

| Phase | Status | 산출물 | 소요 |
|-------|--------|--------|------|
| PRD | ✅ 본 문서 | `docs/01-plan/features/v2113-sprint-3-infrastructure.prd.md` | (완료) |
| Plan | ⏳ | `docs/01-plan/features/v2113-sprint-3-infrastructure.plan.md` | 25분 |
| Design | ⏳ | `docs/02-design/features/v2113-sprint-3-infrastructure.design.md` (★ 코드베이스 분석 + cross-sprint integration spec) | 45분 |
| Do | ⏳ | 6 modules 구현 (~1,000 LOC) | 60-80분 |
| Iterate | ⏳ | matchRate 100% 목표 + cross-sprint TC | 30-45분 |
| QA | ⏳ | --plugin-dir . 60+ TC + cross-sprint scenarios | 30-45분 |
| Report | ⏳ | 종합 보고서 + cross-sprint 유기적 상호 연동 검증 결과 | 15-20분 |

**총 소요 estimate**: 3.5-4.5시간 (Sprint 2 의 3.5h 와 비교 유사 — 6 modules + atomic write 패턴 reuse 으로 복잡도 분산)

---

## 10. PRD 완료 Checklist

- [x] Context Anchor 5건 모두 작성
- [x] Problem Statement 3건 (부재 / Sprint 2 deps gap / cross-sprint 유기적 통합 요구)
- [x] Job Stories 8건 (사용자 × 4 + Sprint 4 + Sprint 5 + CI + cross-sprint 유기적)
- [x] User Personas 3건
- [x] Solution Overview (6 modules + disk 구조 + cross-sprint data flow + atomic write + OTEL/audit 통합)
- [x] Success Metrics 정량 14건 + 정성 4건
- [x] Out-of-scope 매트릭스 + 8개국어 트리거 Sprint 4 보존 + cross-sprint TC 10건 명시
- [x] Stakeholder Map 11건
- [x] Pre-mortem 10 시나리오

---

**Next Phase**: Phase 2 Plan — Requirements R1-R6 + Out-of-scope + Feature Breakdown + Quality Gates + Risks + Document Index + Implementation Order + Cross-Sprint Integration.
