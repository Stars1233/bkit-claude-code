# Sprint 3 Plan — v2.1.13 Sprint Management Infrastructure

> **Sprint ID**: `v2113-sprint-3-infrastructure`
> **Phase**: Plan (2/7)
> **Date**: 2026-05-12
> **PRD Reference**: `docs/01-plan/features/v2113-sprint-3-infrastructure.prd.md`
> **Master Plan**: v1.1 §3.6
> **ADRs**: 0007 / 0008 / 0009 (Proposed)
> **Depends on**: Sprint 1 (a7009a5) + Sprint 2 (97e48b1)

---

## 0. Context Anchor (PRD §0 복사, 보존)

| Key | Value |
|-----|-------|
| WHY | Sprint 1 + Sprint 2 위 Infrastructure adapter 영구화 + ★ cross-sprint 유기적 상호 연동 검증 |
| WHO | bkit 사용자 / Sprint 4 skill handler / Sprint 5 matrix consumer / audit-logger / OTEL collector / CI |
| RISK | Sprint 2 deps interface 불일치 / atomic write 실패 / OTEL 회귀 / Domain Purity / path 충돌 / clock skew / regex false positive / matrix partial write / circular call / 8개국어 constraint 위반 |
| SUCCESS | 4 adapter + 1 helper + barrel / Sprint 2 deps 11/11 매칭 / disk 영구화 / SprintEvents 5건 dual sink / Sprint 1/2 invariant 0 변경 / Domain Purity 0 forbidden / L2 60+ TC + cross-sprint 10+ TC PASS / plugin validate Exit 0 |
| SCOPE | In: lib/infra/sprint/ 6 files. Out: skills/agents/hooks/templates (Sprint 4) + L3+ tests (Sprint 5) + BKIT_VERSION (Sprint 6) + 8개국어 트리거 (Sprint 4) |

---

## 1. Requirements

### 1.1 In-scope (반드시 구현)

#### R1. `lib/infra/sprint/sprint-paths.js` — pure path helper

**Public API exports** (no I/O):
- `getSprintStateDir(projectRoot: string): string` — `<root>/.bkit/state/sprints/`
- `getSprintStateFile(projectRoot, id): string` — `<root>/.bkit/state/sprints/{id}.json`
- `getSprintIndexFile(projectRoot): string` — `<root>/.bkit/state/sprint-status.json`
- `getSprintFeatureMapFile(projectRoot): string` — `<root>/.bkit/runtime/sprint-feature-map.json`
- `getSprintMatrixDir(projectRoot): string` — `<root>/.bkit/runtime/sprint-matrices/`
- `getSprintMatrixFile(projectRoot, type): string` — `<dir>/{type}-matrix.json`
- `MATRIX_TYPES`: Object.freeze(['data-flow', 'api-contract', 'test-coverage'])
- `getSprintPhaseDocAbsPath(projectRoot, sprintId, phase): string|null` — Sprint 1 `sprintPhaseDocPath` + projectRoot prefix

**@version**: `2.1.13`
**Pure**: no fs/I/O. uses `path.join` only.

#### R2. `lib/infra/sprint/sprint-state-store.adapter.js`

**Factory**: `createStateStore({ projectRoot, clock? }): StateStore`

**Returned object methods**:
- `save(sprint: Sprint): Promise<void>` — atomic tmp+rename to state file + root index update
- `load(id: string): Promise<Sprint|null>` — read state file, JSON.parse, return null on missing/corrupt
- `list(): Promise<Array<SprintIndexEntry>>` — read root sprint-status.json, return entries array
- `remove(id: string): Promise<void>` — unlink state file + remove from root index (idempotent)
- `getIndex(): Promise<Object>` — read root sprint-status.json (raw)

**SprintIndexEntry shape**:
```javascript
{ id, name, phase, status, trustLevelAtStart, createdAt, updatedAt }
```

**Atomic write pattern**: tmp.PID + rename + cleanup on error.

**Path isolation**: only writes under `.bkit/state/sprints/` + `.bkit/state/sprint-status.json` (root index, single-file).

**@version**: `2.1.13`

#### R3. `lib/infra/sprint/sprint-telemetry.adapter.js`

**Factory**: `createEventEmitter({ projectRoot, otelEndpoint?, otelServiceName?, agentId?, parentAgentId? }): EventEmitter`

**Returned object**:
- `emit(event: SprintEvent): void` — sync; delegates to:
  - **file sink**: `lib/audit/audit-logger.writeAuditLog(actionType, payload)` (always)
  - **OTEL sink**: HTTP POST to `otelEndpoint` if set (non-blocking, fire-and-forget)
- `flush(): Promise<void>` — for tests; waits for pending OTEL POSTs

**SprintEvent → audit action_type 매핑** (PRD §4.8):
- SprintCreated → `sprint_created`
- SprintPhaseChanged → `phase_transition`
- SprintArchived → `sprint_archived`
- SprintPaused → `sprint_paused`
- SprintResumed → `sprint_resumed`

**OTEL attribute 매핑** (PRD §4.7 — 10 attributes).

**Recursion safety**: never imports lib/infra/telemetry.js (#54196 회귀 방지). Direct audit-logger call only.

**@version**: `2.1.13`

#### R4. `lib/infra/sprint/sprint-doc-scanner.adapter.js`

**Factory**: `createDocScanner({ projectRoot }): DocScanner`

**Returned object**:
- `findAllSprints(): Promise<Array<{id, masterPlanPath, prdPath?, planPath?, ...}>>` — scan docs/01-plan/features/*.master-plan.md
- `findSprintDocs(id: string): Promise<SprintDocs>` — Sprint 1 SprintDocs typedef shape (7 keys: masterPlan/prd/plan/design/iterate/qa/report)
- `hasPhaseDoc(id: string, phase: string): Promise<boolean>` — existence check
- `findSprintsByState(projectRoot): Promise<Array>` — bonus: union of state-store list + doc-scanner findAll (for `/sprint list`)

**Pure file-system read** (no write).

**Reuses**:
- Sprint 1 `sprintPhaseDocPath(id, phase)` for path computation
- Sprint 1 `SPRINT_NAME_REGEX` for id extraction validation

**@version**: `2.1.13`

#### R5. `lib/infra/sprint/matrix-sync.adapter.js`

**Factory**: `createMatrixSync({ projectRoot, clock? }): MatrixSync`

**Returned object**:
- `syncDataFlow(sprintId, featureName, hopResults): Promise<void>` — read → mutate → atomic write
- `syncApiContract(sprintId, featureName, contractResults): Promise<void>` — same pattern
- `syncTestCoverage(sprintId, featureName, layerCounts): Promise<void>` — same pattern
- `read(type: 'data-flow'|'api-contract'|'test-coverage'): Promise<Object>`
- `clear(type: string): Promise<void>` — for tests

**Matrix file shape**:
```json
{
  "type": "data-flow",
  "version": "1.0",
  "updatedAt": "ISO 8601",
  "sprints": {
    "{sprintId}": {
      "features": {
        "{featureName}": {
          "hops": [{ "hopId": "H1", "passed": true, "evidence": "..." }, ...],
          "s1Score": 100,
          "lastUpdated": "ISO 8601"
        }
      }
    }
  }
}
```

**Sequential** read-modify-write (ENH-292 자기적용 — partial-write 방지).

**@version**: `2.1.13`

#### R6. `lib/infra/sprint/index.js` (barrel + composite factory)

**Public API exports**:
- All factory functions: `createStateStore`, `createEventEmitter`, `createDocScanner`, `createMatrixSync`
- Composite: `createSprintInfra({ projectRoot, otelEndpoint?, otelServiceName?, agentId?, parentAgentId?, clock? })` → `{ stateStore, eventEmitter, docScanner, matrixSync }`
- Path helpers: re-export all from sprint-paths.js
- `MATRIX_TYPES` (frozen)

**@version**: `2.1.13`

### 1.2 Out-of-scope (Sprint 3 명시 제외)

- ❌ skills/sprint/SKILL.md — Sprint 4
- ❌ 4 agents/sprint-*.md — Sprint 4
- ❌ hooks scripts 확장 — Sprint 4
- ❌ templates/sprint/*.template.md — Sprint 4
- ❌ `/control` lib/control/automation-controller.js full sprint integration — Sprint 4
- ❌ SPRINT_AUTORUN_SCOPE 정식 lib/control 으로 옮김 — Sprint 4
- ❌ audit-logger ACTION_TYPES enum 확장 (sprint_paused / sprint_resumed) — Sprint 4
- ❌ Sprint 4 real gap-detector / auto-fixer / chrome-qa adapter — Sprint 4
- ❌ Sprint user guide / migration guide — Sprint 5
- ❌ README / CLAUDE.md update — Sprint 5
- ❌ BKIT_VERSION bump — Sprint 6
- ❌ ADR 0007/0008/0009 Accepted — Sprint 6
- ❌ L3/L4/L5 tests — Sprint 5
- ❌ 8개국어 트리거 keywords — Sprint 4 (사용자 명시 보존)
- ❌ Sprint 1/2 코드 변경 (invariant 보존)

---

## 2. Feature Breakdown (6 modules)

| # | File | Layer | LOC est. | Exports | Imports |
|---|------|-------|---------|---------|---------|
| 1 | `sprint-paths.js` | Infra (pure) | ~110 | 8 (7 fn + MATRIX_TYPES) | `path` + Sprint 1 (`sprintPhaseDocPath`) |
| 2 | `sprint-state-store.adapter.js` | Infra | ~210 | 1 factory → 5 methods | `fs`, `path`, `./sprint-paths` |
| 3 | `sprint-telemetry.adapter.js` | Infra | ~180 | 1 factory → 2 methods | `http`, `https`, `url`, `lib/audit/audit-logger` |
| 4 | `sprint-doc-scanner.adapter.js` | Infra | ~165 | 1 factory → 4 methods | `fs`, `path`, `./sprint-paths`, Sprint 1 (`sprintPhaseDocPath`, `SPRINT_NAME_REGEX`) |
| 5 | `matrix-sync.adapter.js` | Infra | ~190 | 1 factory → 5 methods | `fs`, `path`, `./sprint-paths` |
| 6 | `index.js` | Barrel | ~85 | createSprintInfra + 4 factories + 8 paths + MATRIX_TYPES | 5 modules |
| **합계** | | | **~940 LOC** | | |

---

## 3. Quality Gates (Sprint 3 활성)

| Gate | Threshold | Sprint 3 Phase | 측정 |
|------|----------|---------------|------|
| M2 codeQualityScore | ≥80 | Do/Iterate/QA | code-analyzer |
| M3 criticalIssueCount | 0 | Do/Iterate/QA | code-analyzer |
| M4 apiComplianceRate | ≥95 | Design/QA | factory signature 매칭 |
| M5 runtimeErrorRate | ≤1 | Do/QA | TC execution |
| M7 conventionCompliance | ≥90 | Do/Iterate/QA | ESLint + JSDoc |
| M8 designCompleteness | ≥85 | Design | doc structure |
| M1 matchRate | ≥90 (목표 100) | Iterate | gap-detector |
| S2 featureCompletion | 100 (6/6 modules) | Iterate/QA | file existence |
| **Sprint 1 invariant** | 0 변경 | Do/QA | git diff |
| **Sprint 2 invariant** | 0 변경 | Do/QA | git diff |
| **PDCA invariant** | 0 변경 | Do/QA | git diff |
| **Domain Purity** | 16 files 0 forbidden | Do/QA | check-domain-purity.js |
| **atomic write 100%** | 모든 write 함수 tmp+rename | Do/QA | TC + grep |
| **OTEL emission opt-in** | OTEL_ENDPOINT 미설정 시 overhead 0 | QA | TC |
| **audit-logger recursion 0건** | telemetry.js import 0 | Do/QA | grep |
| **L2 integration TC** | 60+ TCs 100% PASS | QA | node test runner |
| **★ Cross-sprint integration TC** | 10+ TCs 100% PASS | QA | node test runner |
| **`--plugin-dir .` require()** | All 6 modules + barrel + factories | QA | node -e |
| **claude plugin validate** | Exit 0 | QA | F9-120 closure 9-cycle |

---

## 4. Risks & Mitigation

### 4.1 PRD §8 Pre-mortem 매핑

| PRD Risk | Sprint 3 phase-specific 대응 |
|----------|---------------------------|
| A. Sprint 2 deps interface 불일치 | Design §X 11 deps 매트릭스 명시 (각 deps call signature). TC INT-01 모든 deps inject 통합 |
| B. atomic write 실패 | `lib/core/state-store.js` 패턴 그대로 사용. TC L2-S-01 mid-write kill 시뮬레이션 |
| C. PDCA invariant 깨짐 | Sprint 3 어댑터는 PDCA enum 미import. TC INT-04 grep |
| D. Sprint 1/2 invariant 깨짐 | Sprint 3 은 추가만, 변경 0건. TC INT-02/03 git diff |
| E. audit-logger circular call | telemetry.js import 0건 + writeAuditLog 직접 호출만. TC T-04 1k emit overflow 검증 |
| F. OTEL emission 성능 회귀 | lazy env check + non-blocking POST. TC T-03 미설정 0 overhead |
| G. doc-scanner regex false positives | Sprint 1 `SPRINT_NAME_REGEX` 재사용. TC D-01 다양한 false case |
| H. 3-matrix concurrent update | atomic write + sequential 보장. TC M-02 concurrent simulation |
| I. .bkit/state/sprints/ 충돌 | 하위 디렉터리 + 단일 root index 파일. TC S-02 path isolation |
| J. clock skew | 두 어댑터 deps.clock 동일 inject. TC INT-05 timestamp 일치 |

### 4.2 Sprint 3 phase-specific risks

| Risk | Likelihood | Severity | Mitigation |
|------|:---------:|:--------:|-----------|
| R1 fs mock 부정확 → real disk write 실패 | LOW | HIGH | TC tmpdir 사용 (`os.tmpdir()`) → real fs write 검증 + cleanup |
| R2 root index 갱신 중 race condition | LOW | MEDIUM | 단일 process 가정 (CC 세션 1개 단위) + atomic write |
| R3 OTEL HTTP timeout block | MEDIUM | MEDIUM | non-blocking emit + 5s timeout + error swallowed (don't crash sprint) |
| R4 sanitizer 통합 누락 (PII redact) | LOW | LOW | audit-logger 내부에서 자동 sanitize (lib/audit/audit-logger.js:99-189). Sprint 3 어댑터는 raw payload 전달 |
| R5 cross-sprint TC 부족 | MEDIUM | HIGH | TC L2-CSI-01~10 10 시나리오 강제 |
| R6 Sprint 4 skill handler API 변경 가능 | LOW | LOW | createSprintInfra() composite factory 로 API 통제 |
| R7 LOC 초과 (~940 추정) | LOW | LOW | Plan §6 정정 가능 |
| R8 8개국어 트리거 constraint 위반 | LOW | LOW | Sprint 3 은 lib/만 손대므로 N/A. 영어 코드 일관 |
| R9 사용자 cross-sprint 유기적 상호 연동 명시 미충족 | LOW | HIGH | TC L2-CSI-01~10 + Design §X cross-sprint integration 그래프 명시 |

---

## 5. Document Index (Sprint 3 산출물)

| Phase | Document | Path | Status |
|-------|----------|------|--------|
| PRD | Sprint 3 PRD | `docs/01-plan/features/v2113-sprint-3-infrastructure.prd.md` | ✅ |
| Plan | 본 문서 | `docs/01-plan/features/v2113-sprint-3-infrastructure.plan.md` | ✅ (작성 중) |
| Design | Sprint 3 Design | `docs/02-design/features/v2113-sprint-3-infrastructure.design.md` | ⏳ |
| Iterate | Sprint 3 Iterate | `docs/03-analysis/features/v2113-sprint-3-infrastructure.iterate.md` | ⏳ |
| QA | Sprint 3 QA Report | `docs/05-qa/features/v2113-sprint-3-infrastructure.qa-report.md` | ⏳ |
| Report | Sprint 3 Final Report | `docs/04-report/features/v2113-sprint-3-infrastructure.report.md` | ⏳ |

---

## 6. Implementation Order (Phase 4 Do)

leaf → orchestrator:

| Step | Module | 이유 |
|:----:|--------|------|
| 1 | `sprint-paths.js` | Pure helper — 다른 4 어댑터의 path 기반 |
| 2 | `sprint-state-store.adapter.js` | atomic write 핵심, 다른 adapter 의 참조 패턴 |
| 3 | `sprint-telemetry.adapter.js` | audit-logger + OTEL — 독립 |
| 4 | `sprint-doc-scanner.adapter.js` | read-only, sprint-paths.js 사용 |
| 5 | `matrix-sync.adapter.js` | read-modify-write atomic |
| 6 | `index.js` (barrel + composite) | 5 modules 통합 — 마지막 |
| 7 | Static checks (`node -c` 6 files) | syntax 검증 |
| 8 | Runtime check (`node -e "require('./lib/infra/sprint')"`) | 통합 require |
| 9 | Sprint 1/2 invariant 검증 | git diff |

---

## 7. Acceptance Criteria (Phase 6 QA)

### 7.1 Static Checks
- [ ] `node -c` 6 files (sprint-paths / 4 adapters / index) — all OK
- [ ] Sprint 1 invariant: `git diff lib/domain/sprint/` empty
- [ ] Sprint 2 invariant: `git diff lib/application/sprint-lifecycle/` empty
- [ ] PDCA invariant: `git diff lib/application/pdca-lifecycle/` empty
- [ ] Domain Purity 16 files 0 forbidden imports

### 7.2 Runtime Checks
- [ ] `node -e "require('./lib/infra/sprint')"` Exit 0
- [ ] `createSprintInfra({ projectRoot })` returns 4 adapter handles
- [ ] All 4 adapter methods callable (24+ method signatures verified)

### 7.3 state-store TC (10+)
- [ ] save → load round-trip identity
- [ ] save → list returns entry
- [ ] save → save (update) → list returns updated
- [ ] remove removes file + index entry
- [ ] load nonexistent returns null
- [ ] atomic write tmp+rename verified (grep code + behavior test)
- [ ] mid-write SIGKILL simulation → state consistent (use process.kill or fault injection)
- [ ] concurrent save (sequential in single-process) — last-write-wins
- [ ] schema preserves Sprint 1 entity exactly (round-trip identity test)
- [ ] root index `.bkit/state/sprint-status.json` accurate

### 7.4 telemetry TC (8+)
- [ ] emit(SprintCreated) writes audit log
- [ ] emit(SprintPhaseChanged) writes audit log
- [ ] emit(SprintArchived) writes audit log
- [ ] emit(SprintPaused) writes audit log
- [ ] emit(SprintResumed) writes audit log
- [ ] OTEL_ENDPOINT unset → no HTTP overhead (timer < 5ms)
- [ ] OTEL_ENDPOINT set → HTTP POST attempted (mock server)
- [ ] 1000 emit calls → no stack overflow (recursion safety)

### 7.5 doc-scanner TC (6+)
- [ ] findAllSprints returns master plan + phase docs matrix
- [ ] findSprintDocs(id) returns 7-key SprintDocs object
- [ ] hasPhaseDoc(id, 'prd') existence
- [ ] regex rejects invalid sprint id (false-positive defense)
- [ ] non-existent project — returns [] (empty)
- [ ] uses Sprint 1 SPRINT_NAME_REGEX + sprintPhaseDocPath

### 7.6 matrix-sync TC (10+)
- [ ] syncDataFlow → matrix file created
- [ ] syncApiContract → matrix file created
- [ ] syncTestCoverage → matrix file created
- [ ] read returns matrix object with 'sprints' key
- [ ] clear removes matrix file
- [ ] sequential update (2 features, 2 syncs) — final matrix consistent
- [ ] atomic write tmp+rename
- [ ] MATRIX_TYPES frozen
- [ ] read of unwritten matrix returns empty `{sprints:{}}` shape (default)
- [ ] missing matrix file does not throw (graceful)

### 7.7 Cross-Sprint Integration TC (★ 사용자 명시 핵심, 10+)
- [ ] **CSI-01**: createSprint (S1) → stateStore.save (S3) → stateStore.load (S3) — JSON.stringify round-trip identity
- [ ] **CSI-02**: startSprint (S2 L3) with real S3 stateStore — full PRD→Report mock + 디스크 영구화 (`.bkit/state/sprints/{id}.json` 존재)
- [ ] **CSI-03**: advancePhase (S2) with real S3 eventEmitter — SprintPhaseChanged → audit-log file에 기록됨
- [ ] **CSI-04**: pauseSprint (S2) with real S3 eventEmitter — SprintPaused → audit-log
- [ ] **CSI-05**: resumeSprint (S2) — SprintResumed → audit-log
- [ ] **CSI-06**: archiveSprint (S2) with real S3 stateStore — status='archived' 디스크 영구화 + 마지막 index entry status='archived'
- [ ] **CSI-07**: verifyDataFlow (S2) → matrixSync.syncDataFlow (S3) — `data-flow-matrix.json` 갱신
- [ ] **CSI-08**: generateReport (S2 with deps.fileWriter from S3) — 디스크 작성 + docScanner (S3) findSprintDocs 재발견
- [ ] **CSI-09**: 세션 종료 후 재개 시뮬레이션 — save → 별도 process 에서 load → 정확한 phase 복원
- [ ] **CSI-10**: full E2E L4 sprint — createSprint (S1) + startSprint (S2 L4 archived) + S3 4 adapter 모두 inject → 자율 진행 + 디스크 영구화 + 5 audit log entries

### 7.8 Integration / Invariants (5+)
- [ ] PDCA lifecycle imports 0건 grep
- [ ] Sprint 1/2 lib import 변경 0건 grep (Sprint 3 만 추가)
- [ ] lib/infra/telemetry.js import 0건 (#54196 회귀 방지)
- [ ] `--plugin-dir .` 환경 require() 정상
- [ ] `claude plugin validate .` Exit 0

### 7.9 Documentation (Iterate)
- [ ] 6 modules 모두 JSDoc 100%
- [ ] @version: 2.1.13
- [ ] @module 정확
- [ ] cross-sprint integration spec Design §X에 명시
- [ ] atomic write reference (lib/core/state-store.js) 명시

---

## 8. Cross-Sprint Dependency (사용자 명시 핵심)

### 8.1 Sprint 1 → Sprint 3
- Sprint 1 `SprintInput`/`Sprint` JSDoc 정확 매칭 (state-store schema)
- Sprint 1 `sprintPhaseDocPath` 사용 (doc-scanner)
- Sprint 1 `SPRINT_NAME_REGEX` 사용 (doc-scanner false-positive defense)
- Sprint 1 `SPRINT_EVENT_TYPES` 사용 (telemetry validation)

### 8.2 Sprint 2 → Sprint 3 (deps inject 통합)

Sprint 2 startSprint(input, deps) 의 11 deps 중 Sprint 3 제공:
- `deps.stateStore` ← `createStateStore({ projectRoot })`
- `deps.eventEmitter` ← `createEventEmitter({ projectRoot, otelEndpoint? }).emit`
- `deps.docPathResolver` ← `sprint-paths.getSprintPhaseDocAbsPath` (Sprint 1 wrap)
- `deps.fileWriter` ← (state-store 내부 atomic write 재사용 또는 별도 helper)
- 나머지 7 deps: Sprint 2 default 또는 Sprint 4 가 inject (gapDetector / autoFixer / dataFlowValidator 등)

### 8.3 Sprint 3 → Sprint 4 (consumer 준비)

Sprint 4 가 본 Sprint 3 사용:
- `require('lib/infra/sprint').createSprintInfra({ projectRoot, otelEndpoint, agentId })` 한 줄로 4 adapter 획득
- skill handler 가 `startSprint(input, { stateStore, eventEmitter, ... })` 호출

### 8.4 invariant — 변경 0건

| 자산 | 변경 |
|------|------|
| `lib/domain/sprint/*` (Sprint 1) | 0 |
| `lib/application/sprint-lifecycle/*` (Sprint 2) | 0 |
| `lib/application/pdca-lifecycle/*` (PDCA) | 0 |
| `lib/audit/audit-logger.js` (existing) | 0 (writeAuditLog 호출만, 코드 미변경) |
| `lib/infra/telemetry.js` (existing) | 0 (참고만, import 0) |
| `lib/core/state-store.js` (existing) | 0 (패턴 reference 만, import 0) |

---

## 9. Plan 완료 Checklist

- [x] Context Anchor 보존
- [x] Requirements R1-R6 (6 modules + barrel) — 각 file public API + factory signature + @version + @module
- [x] Out-of-scope 매트릭스 (Sprint 4~6 + 8개국어 트리거 Sprint 4 보존)
- [x] Feature Breakdown 6 modules (~940 LOC)
- [x] Quality Gates 19건 활성
- [x] Risks & Mitigation (PRD 10 + Sprint 3 specific 9 = 19 risks)
- [x] Document Index 6 phase
- [x] Implementation Order 9 steps
- [x] Acceptance Criteria 9 groups (Static / Runtime / state-store / telemetry / doc-scanner / matrix-sync / **★ Cross-Sprint Integration 10** / Integration-Invariants / Documentation)
- [x] Cross-Sprint Dependency 명시 (사용자 명시 핵심)
- [x] Sprint 1/2 invariant 0 변경

---

**Next Phase**: Phase 3 Design — 현재 코드베이스 (Sprint 1/2 + lib/audit/audit-logger.js + lib/core/state-store.js + lib/infra/telemetry.js + lib/infra/docs-code-scanner.js) 깊이 분석 + 6 modules 정확한 구현 spec + ★ cross-sprint integration 그래프 + Test Plan Matrix L2 60+ TCs + Cross-Sprint 10+ TCs.
