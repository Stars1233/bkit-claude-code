# S4-UX PRD — Sprint UX 개선 Sub-Sprint 4 (Integration + L3 Contract)

> **Sub-Sprint ID**: `s4-ux` (sprint-ux-improvement master 의 4/4 ★ FINAL)
> **Phase**: PRD (1/7) — ★ in_progress
> **Depends on**: S3-UX `9a99948` (Context Sizer completed, 28/28 AC PASS, F9-120 15-cycle, Sprint 1 = 0 LOC)
> **Master Plan Ref**: `docs/01-plan/features/sprint-ux-improvement.master-plan.md` §5.1 (S4-UX row) + §0.4 #8 #11
> **Date**: 2026-05-12
> **Author**: kay kim (POPUP STUDIO PTE. LTD.) + bkit AI orchestration
> **Branch**: `feature/v2113-sprint-management`
> **Status**: ★ Draft v1.0 — Master Plan §5.1 S4-UX scope (~35K tokens, 3 files + tests, 60-90분) 시작

---

## 0. Executive Summary

### 0.1 Mission

S4-UX 는 sprint-ux-improvement master sprint 의 **최종 sub-sprint (4/4)** — Master Plan §0.4 #8 (L3 Contract test 추가) + #11 (Cumulative TCs 250+) 분담 분 + 누적된 carry items (S1/S2/S3-UX) 정리 + master closure.

핵심 deliverable 4-5 files:
1. **L3 Contract**: SC-04/06 갱신 (S2-UX additive 반영) + SC-09 신규 (master-plan invocation chain) + SC-10 신규 (context-sizer contract)
2. **master-plan-contextSizer auto-wiring** (optional): master-plan.usecase 에서 `deps.contextSizer` inject 시 자동으로 plan.sprints[] 채우기
3. **agents/sprint-master-planner.md** body: Sprint Split Heuristics 에 S3-UX programmatic API mention 추가
4. **docs/06-guide/sprint-management.guide.md**: §2 (15→16 sub-actions) 갱신 + §9 신규 (Master Plan + Context Sizer workflow)
5. **commands/bkit.md** (optional): master-plan ref

### 0.2 Anti-Mission

- **scripts/sprint-handler.js 변경 금지** — S2-UX commit `a679d64` 의 handleMasterPlan + VALID_ACTIONS 16건 그대로 유지
- **skills/sprint/SKILL.md 변경 금지** — S2-UX 의 §11 + 8-lang triggers 보존
- **lib/application/sprint-lifecycle/context-sizer.js 변경 금지** — S3-UX `5cfce6e` 의 295 LOC pure function module 보존
- **lib/application/sprint-lifecycle/master-plan.usecase.js 변경 시 backward compat 필수** — `deps.contextSizer` 가 inject 안 됐을 때 기존 동작 (sprints:[]) 그대로
- **Sprint 1 (Domain) 변경 금지** — events.js / entity.js / transitions.js / validators.js / index.js 모두 0 LOC delta (S2/S3-UX 누적 invariant)
- **bkit-system 7 invariants 위배 금지**
- **빠르게 끝내기 금지 (사용자 명시 5)** — PRD ~700 + Plan ~800 + Design ~900 + Report ~600 lines 목표 (S1-S3-UX 평균 유지)

### 0.3 4-Perspective Value Matrix

| Perspective | 현재 (Before S4-UX) | After S4-UX |
|------------|--------------------|-------------|
| **사용자 UX** | L3 Contract 6/8 PASS (SC-04/06 expected mismatch). master-plan + context-sizer 따로 호출 필요. 사용자 가이드 §9 부재 → 새 사용자 onboarding 어려움 | ✓ L3 Contract **10/10 PASS** (SC-04/06 갱신 + SC-09/10 신규). master-plan 호출 시 deps.contextSizer 자동 통합 (optional). docs/06-guide §9 신규 Master Plan + Context Sizer workflow + §2 16 sub-actions 매트릭스 |
| **Architecture** | sprint-ux-improvement master sprint 의 4 sub-sprints 가 독립 동작, 통합 검증 부재 | ✓ L3 Contract SC-09 (master-plan 4-layer chain) + SC-10 (context-sizer pure function contract) 으로 cross-sprint integration 정량 검증. 누적 TCs 250+ 달성 |
| **Cost/Performance** | (변경 0) | ✓ L3 Contract 추가 test ~40 LOC, master-plan auto-wiring +10 LOC (optional path), agent body +30 LOC, guide §9 +120 lines. **net code delta < 60 LOC + docs +120 lines + tests +50 LOC** |
| **Risk** | sprint-ux-improvement master sprint 종료 후 production release (Sprint 6) 진입 시 L3 baseline 깨진 상태 (6/8) → CI gate red | ✓ S4-UX 완료 후 L3 10/10 PASS → master sprint closure 가능 → v2.1.13 Sprint 6 release 진입 unblocked |

### 0.4 정량 목표 (Master Plan §0.4 분담 분)

| # | Master Plan target | S4-UX achievement plan |
|---|--------------------|-----------------------|
| 8 | L3 Contract test 추가 | ✓ **DONE target** — SC-04/06 갱신 + SC-09 (master-plan) + SC-10 (context-sizer) = 8 → 10 contracts |
| 11 | Cumulative TCs 250+ | ✓ **DONE target** — Sprint 5 baseline 226 TCs + 2 L3 (SC-09/10) + smoke tests = 250+ |
| 9 | Sprint 1-5 invariant 보존 | ✓ Sprint 1 = 0 LOC delta. Sprint 5 L3 갱신은 **의도된 의도된 contract update** (S2/S3-UX의 additive change 반영) |
| 10 | claude plugin validate Exit 0 | ✓ F9-120 **16-cycle** target |

### 0.5 누적 carry items 처리 (S1/S2/S3-UX)

| # | Source | Item | S4-UX 처리 |
|---|--------|------|----------|
| C-1 (S3-UX) | S3-UX Report §10 | topologicalSort + detectCycle export in index.js | OPTIONAL — F4 후 결정 (현재 자체 require 가능) |
| C-2 (S3-UX) | S3-UX Report §10 | L3 SC-04/06 갱신 + SC-09/10 신규 | ✓ **F1 핵심 deliverable** |
| C-3 (S3-UX) | S3-UX Report §10 | master-plan.usecase contextSizer auto-wiring | ✓ **F2 핵심 deliverable** |
| C-4 (S3-UX) | S3-UX Report §10 | agent body programmatic API mention | ✓ **F3 핵심 deliverable** |
| C-8 (S3-UX) | S3-UX Report §10 | docs/06-guide §9 Master Plan + Context Sizer workflow | ✓ **F4 핵심 deliverable** |
| C-1 (S2-UX) | S2-UX Report §9 | L3 SC-04/06 갱신 (15→16 actions, 18→19 ACTION_TYPES) | ✓ same as C-2 above |
| C-3 (S2-UX) | S2-UX Report §9 | Sprint 1-4 226 TCs 전체 실행 | ✓ **Phase 6 QA regression** |
| C-4 (S2-UX) | S2-UX Report §9 | bkit-evals sprint family invocation | (Master Plan §0.4 row 11 보조 — bkit-evals 가 sprint family 모두 통과하면 추가 250+ TC base) |
| C-1 (S1-UX) | S1-UX Report §9 | IP-07 automation-controller.js grep — Trust Level 단일 SoT | ✓ **Phase 6 QA grep** |
| C-2 (S1-UX) | S1-UX Report §9 | chmod +x scripts/sprint-handler.js | Sprint 6 release script scope (v2.1.13 release) |

**S4-UX 처리: 5 carry items 핵심 + 2 carry items Phase 6 QA + 1 deferred Sprint 6**.

---

## 1. Master Plan + Code Base Verbatim Citations (No Guessing)

### 1.1 Master Plan §5.1 — S4-UX row

> | **S4-UX** | Integration + L3 Contract | SC-09 + SC-10 + 7-perspective verification 재실행 + commands/bkit.md ext + Korean guide §9 | ~35K | 3 files + tests | 60-90분 |

본 PRD §3 가 정확히 이 deliverables 분해.

### 1.2 L3 Contract test 현재 SC-04 (line 126-141 of `tests/contract/v2113-sprint-contracts.test.js`)

```javascript
// === SC-04: Sprint 4 sprint-handler signature ===
function sc04() {
  const handlerMod = require(path.join(projectRoot, 'scripts/sprint-handler'));
  assert.strictEqual(typeof handlerMod.handleSprintAction, 'function');
  assert.strictEqual(handlerMod.handleSprintAction.length, 3, ...);
  assert(Array.isArray(handlerMod.VALID_ACTIONS));
  assert.strictEqual(handlerMod.VALID_ACTIONS.length, 15,
    'VALID_ACTIONS must list 15 sub-actions');
  const expected = ['init', 'start', 'status', 'list', 'phase', 'iterate',
                    'qa', 'report', 'archive', 'pause', 'resume', 'fork',
                    'feature', 'watch', 'help'];
  expected.forEach(a => assert(handlerMod.VALID_ACTIONS.includes(a), ...));
}
```

S4-UX 패치 위치 — line 133 `15` → `16`, line 136-138 expected array 에 `'master-plan'` 추가.

### 1.3 L3 Contract test 현재 SC-06 (line 172-187)

```javascript
// === SC-06: audit-logger ACTION_TYPES 18 entries ===
function sc06() {
  const src = fs.readFileSync(...);
  const match = src.match(/const\s+ACTION_TYPES\s*=\s*\[([\s\S]*?)\];/);
  assert(match, 'ACTION_TYPES array literal not found');
  const entries = match[1].match(/'[^']+'/g) || [];
  assert.strictEqual(entries.length, 18,
    'ACTION_TYPES expected 18 entries, got ' + entries.length);
  const flat = entries.join(',');
  assert(flat.includes('sprint_paused'), ...);
  assert(flat.includes('sprint_resumed'), ...);
}
```

S4-UX 패치 위치 — line 182 `18` → `19`, optional `flat.includes('master_plan_created')` assertion 추가.

### 1.4 master-plan.usecase.js — Step 4 plan object (line 388-401 of `master-plan.usecase.js` S2-UX `a679d64`)

```javascript
const plan = {
  schemaVersion: MASTER_PLAN_SCHEMA_VERSION,
  projectId: input.projectId,
  projectName: input.projectName,
  features: Array.isArray(input.features) ? input.features.slice() : [],
  sprints: [], // stub for S3-UX context-sizer
  dependencyGraph: {},
  ...
};
```

S4-UX 패치 위치 — `sprints: []` 와 `dependencyGraph: {}` 직전에 **optional auto-wiring block** 추가 (deps.contextSizer 가 inject 됐을 때만 실행):

```javascript
// S4-UX auto-wiring (optional)
let recommendedSprints = [];
let computedDepGraph = {};
if (typeof d.contextSizer === 'function' && Array.isArray(input.features) && input.features.length > 0) {
  try {
    const splitResult = d.contextSizer({
      projectId: input.projectId,
      features: input.features,
      dependencyGraph: input.dependencyGraph,
      locHints: input.locHints,
    }, d.contextSizingConfig);
    if (splitResult && splitResult.ok) {
      recommendedSprints = splitResult.sprints;
      computedDepGraph = splitResult.dependencyGraph || {};
    }
  } catch (_e) { /* best-effort, fallback to empty */ }
}
```

이후 `sprints: recommendedSprints, dependencyGraph: computedDepGraph`.

### 1.5 agents/sprint-master-planner.md — Sprint Split Heuristics section (S2-UX `a679d64`)

기존 `## Sprint Split Heuristics (S3-UX Forward Compatibility)` section 에서 "S3-UX 가 채울 stub" 메시지. S4-UX 패치: "S3-UX 가 implemented programmatic algorithm 제공 (lib/application/sprint-lifecycle/context-sizer.js)" 로 갱신 + Use This API 코드 예시.

### 1.6 docs/06-guide/sprint-management.guide.md — 기존 §1-§8 + 부록 A/B

기존 sections (10 ## headers):
- §1 Sprint Management 개념
- §2 15 Sub-actions ← S4-UX 갱신: "16 Sub-actions" + master-plan row 추가
- §3 8-Phase Lifecycle
- §4 4 Auto-Pause Triggers
- §5 Trust Level Scope
- §6 7-Layer Data Flow QA
- §7 Cross-feature / Cross-sprint Integration
- §8 Worked Examples
- 부록 A: 디렉토리 구조
- 부록 B: 관련 문서

S4-UX 패치 위치 — §8 worked examples 후, 부록 A 앞에 신규 §9 "Master Plan Generator + Context Sizer Workflow" 삽입.

---

## 2. Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | sprint-ux-improvement master sprint 의 4 sub-sprints 중 마지막 — Master Plan §0.4 11 정량 목표 중 누적 8/11 DONE 상태에서 #8 (L3 Contract) + #11 (Cumulative TCs 250+) 분담 + 누적 carry items 8건 정리 + master closure. **사용자 명시 4-1+4-2 사용자 경험 통합 검증의 최종 단계**. |
| **WHO** | (1) bkit 사용자 — master-plan 호출 시 자동 sprint split 받음 (S4-UX auto-wiring). (2) `agents/sprint-master-planner.md` agent — body 의 Sprint Split Heuristics 가 programmatic API reference 로 강화. (3) `docs/06-guide/sprint-management.guide.md` — §2 갱신 + §9 신규로 한국어 사용자 onboarding 완비. (4) `tests/contract/v2113-sprint-contracts.test.js` — L3 8 → 10 contracts. (5) CI / Sprint 6 release manager — L3 10/10 PASS 확인 후 v2.1.13 release 진입. |
| **RISK** | (a) **master-plan.usecase 변경 risk** — S2-UX contract 깨면 S2-UX 후 모든 production 호출 영향. 회피 = backward compat 필수 — `deps.contextSizer` undefined 시 기존 동작 (sprints:[]) 그대로. (b) **L3 SC-04/06 갱신이 본 sprint 의 추가 change 와 race condition** — Sprint 6 release 가 또 다른 ACTION_TYPES 추가하면 SC-06 다시 깨짐. 회피 = Sprint 6 release scope 명확히 deferred. (c) **Sprint 1 invariant 위배 risk** — S4-UX 의 master-plan.usecase 변경 시 Sprint 1 events.js 신규 추가 회피 (옵션 D 유지). (d) **agent body 변경 후 F9-120 16-cycle 깨기 risk** — frontmatter 0 변경 invariant (S1-S3-UX inherited). (e) **docs/06-guide §9 신규 시 §1-§8 + 부록 0 변경** — additive only. (f) **commands/bkit.md ext optional** — 본 sprint 에서는 master-plan reference 만 (지면 절약). (g) **사용자 명시 5 (꼼꼼함) 위배 risk** — S4-UX 가 마지막 sub-sprint 라 "빨리 master closure 하고 싶은" inclination. 회피 = PRD/Plan/Design 동일 깊이 + 7-phase 모두 정성. |
| **SUCCESS** | (1) L3 Contract **10/10 PASS** (SC-01~08 6/8 → 10/10). (2) SC-04 갱신: 16 actions + 'master-plan' 포함. (3) SC-06 갱신: 19 ACTION_TYPES + 'master_plan_created' 포함. (4) SC-09 신규: master-plan invocation 4-layer chain (handler → usecase → state json + markdown + audit). (5) SC-10 신규: context-sizer pure function contract (token estimate determinism + topological sort + cycle detection + sprint shape). (6) master-plan.usecase `deps.contextSizer` auto-wiring 동작 — inject 시 자동 sprints[] 채움, undefined 시 backward compat. (7) agents/sprint-master-planner.md body Sprint Split Heuristics 갱신 — programmatic API code example 포함, frontmatter 0 변경. (8) docs/06-guide/sprint-management.guide.md §2 갱신 (16 sub-actions) + §9 신규 (Master Plan + Context Sizer workflow). (9) Sprint 1 invariant 100% 보존 — events.js / entity.js / transitions.js / validators.js / index.js 모두 0 LOC delta (S1-S3-UX 누적 invariant 유지). (10) `claude plugin validate .` Exit 0 — F9-120 **16-cycle** 달성. (11) Cumulative TCs 250+ 충족 (226 Sprint 5 baseline + L3 10 + smoke tests). (12) bkit-system 7 invariants 100% 보존. (13) Master Plan §0.4 11/11 DONE — sprint-ux-improvement master sprint **종료 ready**. |
| **SCOPE (정량)** | **In-scope 4-5 files**: (1) `tests/contract/v2113-sprint-contracts.test.js` (SC-04/06 갱신 + SC-09/10 신규, +80 LOC), (2) `lib/application/sprint-lifecycle/master-plan.usecase.js` (contextSizer auto-wiring, +15 LOC additive), (3) `agents/sprint-master-planner.md` (Sprint Split Heuristics section 갱신, +30 LOC body, frontmatter 0 change), (4) `docs/06-guide/sprint-management.guide.md` (§2 minor +1 row + §9 new ~120 lines). **Optional (5)**: `commands/bkit.md` (master-plan reference). **OUT-OF-SCOPE**: BKIT_VERSION bump (Sprint 6), CHANGELOG v2.1.13 (Sprint 6), ADR 0010 (Sprint 6), tag/release (Sprint 6), real backend wiring 확장 (v2.1.14), MEMORY.md hook v2 (v2.1.14), bkit-evals sprint family 정식 invocation (별도 Sprint), chmod +x sprint-handler.js (Sprint 6 release script), automation-controller.js Trust Level 단일 SoT 통합 (별도 v2.1.14). |

---

## 3. Feature Map (4-5 deliverable)

### F1: `tests/contract/v2113-sprint-contracts.test.js` (SC-04/06 갱신 + SC-09/10 신규)

| 항목 | 내용 |
|------|------|
| **Patch type** | 2 갱신 + 2 신규 = 4 patches |
| **SC-04 갱신** | line 133 `15` → `16`, line 136-138 expected array `'master-plan'` 추가 |
| **SC-06 갱신** | line 182 `18` → `19`, `flat.includes('master_plan_created')` 추가 |
| **SC-09 신규** | `tests/contract/v2113-sprint-contracts.test.js` 끝에 `function sc09()` 추가 — master-plan invocation 4-layer chain test. 1) `handleSprintAction('master-plan', { id, name, features }, {})` 호출 → ok:true, plan, masterPlanPath, stateFilePath 반환. 2) 검증: docs/01-plan/features/<id>.master-plan.md 파일 생성됨 (tmp project root). 3) .bkit/state/master-plans/<id>.json 생성됨 schemaVersion '1.0'. 4) audit entry 'master_plan_created' 존재. 5) cleanup. |
| **SC-10 신규** | `function sc10()` 추가 — context-sizer pure function contract. 1) `estimateTokensForFeature('x')` returns 33350 (default). 2) `topologicalSort({})` returns `{ ok: true, order: [] }`. 3) `detectCycle({ a: ['a'] })` returns true. 4) `recommendSprintSplit({ projectId: 'sc10-test', features: ['a', 'b'] })` returns ok:true, sprints array, each sprint has 6 keys (id, name, features, scope, tokenEst, dependsOn). 5) cycle detection: `{ a: ['b'], b: ['a'] }` returns ok:false. |
| **Runner update** | line 236-251 의 runner async block 에 SC-09, SC-10 add (await record). 결과 expected `=== L3 Contract: 10/10 PASS ===`. |
| **LOC est.** | +80 LOC (SC-04/06 +5 LOC each, SC-09 +35 LOC, SC-10 +25 LOC, runner +2 LOC, helpers +8 LOC) |

### F2: `lib/application/sprint-lifecycle/master-plan.usecase.js` (contextSizer auto-wiring)

| 항목 | 내용 |
|------|------|
| **Patch type** | Step 4 (line 388-401) 의 plan object 생성 전에 optional auto-wiring block 추가 |
| **Backward compat** | `deps.contextSizer === undefined` 시 기존 동작 (sprints:[]) 그대로 보존 — S2-UX contract preserved |
| **Auto-wiring** | `deps.contextSizer` 가 function 이면 호출: `splitResult = contextSizer({ projectId, features, dependencyGraph, locHints }, deps.contextSizingConfig)`. ok:true 시 `sprints = splitResult.sprints`, `dependencyGraph = splitResult.dependencyGraph`. ok:false (cycle 등) 시 silent fallback (sprints:[]) + warning field 에 reason. |
| **Best-effort** | try/catch wrap — contextSizer throw 시 silent fallback (best-effort 패턴) |
| **JSDoc 갱신** | deps schema 에 `[deps.contextSizer]` + `[deps.contextSizingConfig]` 추가 (Plan §2.3 reference) |
| **LOC est.** | +15 LOC (auto-wiring block + JSDoc 2 lines) |

### F3: `agents/sprint-master-planner.md` body (Sprint Split Heuristics 갱신, +30 LOC)

| 항목 | 내용 |
|------|------|
| **Patch type** | 기존 `## Sprint Split Heuristics (S3-UX Forward Compatibility)` section 갱신 — title 에서 `(S3-UX Forward Compatibility)` 제거하고 `(Programmatic API)` 로 변경 |
| **Body 갱신** | "S3-UX 가 채울 stub" 문구 → "S3-UX implemented programmatic algorithm: lib/application/sprint-lifecycle/context-sizer.js" + code example block (JS pseudo-code, `require('./lib/application/sprint-lifecycle').recommendSprintSplit(...)`) |
| **Frontmatter 0 change** | line 1-26 invariant (S1-S3-UX inherited) |
| **Language** | English (agent body 영어 invariant 보존) |
| **LOC est.** | +30 LOC (10 LOC removed + 40 LOC added = net +30) |

### F4: `docs/06-guide/sprint-management.guide.md` (§2 minor + §9 new)

| 항목 | 내용 |
|------|------|
| **§2 update** | line 36 `## 2. 15 Sub-actions` → `## 2. 16 Sub-actions`. line 38 description 1 line update. line 39-86 table 끝에 `master-plan` row 추가 — 한국어 (docs/ exception). |
| **§9 신규** | line 274 (§8 끝) 다음 부록 A 앞에 신규 `## 9. Master Plan Generator + Context Sizer 워크플로우` ~120 lines 한국어. Sub-sections: §9.1 워크플로우 overview / §9.2 1-command 사용법 / §9.3 Context Sizer thresholds / §9.4 Dependency-aware split / §9.5 dry-run vs agent-backed / §9.6 Idempotency + force / §9.7 Common pitfalls + troubleshooting |
| **언어** | 한국어 (docs/ exception preserved, S1-UX/S2-UX/S3-UX docs precedent) |
| **LOC est.** | +120 lines |

### F5 (optional): `commands/bkit.md` (master-plan reference, +5 lines)

| 항목 | 내용 |
|------|------|
| **Patch type** | 기존 commands/bkit.md 에 master-plan reference 추가 — 단 commands/ 가 슬래시 명령 직접 매핑 X 일 경우 skip. 본 sprint 에서는 명확한 ROI 검토 후 결정 (Phase 2 Plan 에서 PM-S4D 로 resolve) |
| **LOC est.** | +5 lines optional |

---

## 4. Job Stories (5 stories)

### JS-01: Sprint 6 release manager — L3 Contract 10/10 PASS

**As a** Sprint 6 release manager preparing v2.1.13 GA,
**I want** L3 Contract test to pass 10/10,
**So that** CI gate is green and I can proceed with BKIT_VERSION bump + CHANGELOG + tag.

**Acceptance**:
- `node tests/contract/v2113-sprint-contracts.test.js` exit 0
- output: `=== L3 Contract: 10/10 PASS ===`
- no `❌ FAIL` lines

### JS-02: bkit 사용자 — master-plan auto-wiring with contextSizer

**As a** bkit 사용자 invoking `/sprint master-plan q2-launch --features auth,payment,reports`,
**I want** the plan.sprints[] to be automatically populated with token-aware split,
**So that** I don't need to manually call recommendSprintSplit after master-plan generation.

**Acceptance** (after S4-UX integration):
- caller injects `deps.contextSizer = lifecycle.recommendSprintSplit`
- handleMasterPlan result has `plan.sprints.length > 0`
- each sprint has `tokenEst <= 75000` (effectiveBudget)

### JS-03: bkit 사용자 — backward compat

**As an** existing bkit 사용자 calling master-plan without contextSizer inject,
**I want** the old behavior preserved (sprints: []),
**So that** my existing scripts don't break.

**Acceptance**:
- `handleSprintAction('master-plan', { id, name }, {})` (no deps.contextSizer)
- `plan.sprints.length === 0` (S2-UX behavior preserved)
- `plan.dependencyGraph === {}`

### JS-04: 한국어 사용자 — onboarding via §9

**As a** Korean-speaking bkit 사용자 reading `docs/06-guide/sprint-management.guide.md`,
**I want** §9 to explain Master Plan + Context Sizer workflow comprehensively,
**So that** I can start using these features without reading English SKILL.md or agent body.

**Acceptance**:
- §9 covers 7 sub-sections (workflow + 1-command + thresholds + dep-aware + dry-run/agent + idempotency + pitfalls)
- §9 length ≥ 100 lines
- §2 table includes master-plan row (Korean)

### JS-05: agents/sprint-master-planner agent — programmatic API mention

**As the** sprint-master-planner agent reasoning about sprint split,
**I want** my body to reference the programmatic API (context-sizer.js),
**So that** I can call it via Bash tool (or recommend it to the caller) instead of approximating heuristics manually.

**Acceptance**:
- agent body section title: `## Sprint Split Heuristics (Programmatic API)` (was `(S3-UX Forward Compatibility)`)
- body contains code example referencing `require('./lib/application/sprint-lifecycle').recommendSprintSplit(...)`
- frontmatter unchanged (line 1-26)

---

## 5. Pre-mortem (12 scenarios)

| # | 시나리오 | 방지 |
|---|----------|------|
| A | master-plan.usecase 의 backward compat 깨짐 | deps.contextSizer undefined 시 기존 동작 강제, JS-03 AC 검증 |
| B | contextSizer throw → master-plan 전체 실패 | try/catch wrap + silent fallback to sprints:[] |
| C | L3 SC-09 의 tmp dir cleanup 실패 → repo 오염 | finally block 의 fs.rmSync 보장 (SC-05 precedent) |
| D | L3 SC-10 이 context-sizer 내부 helper export 의존 | sprint-lifecycle/index.js 의 public exports 만 사용 |
| E | agent body 갱신 후 F9-120 16-cycle 깨짐 | frontmatter 0 변경 (S1-S3-UX inherited invariant) |
| F | docs/06-guide §9 한국어 작성 시 영어 키워드 누락 | code identifier 는 영어 유지 (e.g., `recommendSprintSplit`, `master-plan`) |
| G | Sprint 1 events.js 또는 entity.js 변경 | option D 패턴 유지 — audit-logger 활용, Sprint 1 0 LOC |
| H | bkit-system "Design First" 위배 | Design phase 후 Do phase 진입 강제 |
| I | "No Guessing" matchRate < 100% | Design §1-§4 verbatim citation + Phase 5 Iterate |
| J | Cumulative TCs 250+ 미달 | Sprint 5 baseline 226 + L3 10 (SC-01~10) + 14+ smoke = 250+ |
| K | 사용자 명시 5 (꼼꼼함) 위배 — last sub-sprint "빨리 closure" inclination | PRD ~700 + Plan ~800 + Design ~900 lines 유지 |
| L | master sprint closure 미완료 | Phase 7 Report 에 master closure summary 포함 |

---

## 6. Quality Gates Activation Matrix

| Gate | Threshold | S4-UX 적용 |
|------|-----------|-----------|
| **M1** matchRate | ≥ 90% (target 100%) | Iterate phase 강제 |
| **M2** codeQualityScore | ≥ 80 | code review |
| **M3** criticalIssueCount | = 0 | qa-lead |
| **M4** apiComplianceRate | ≥ 95 | additive only |
| **M5** testCoverage | ≥ 70 | L3 8 → 10 contracts |
| **M7** conventionCompliance | ≥ 90 | English code + Korean docs |
| **M8** designCompleteness | ≥ 85 | Design §1-§10 |
| **M10** pdcaCycleTimeHours | ≤ 40 | S4-UX 60-90분 |
| **S1** dataFlowIntegrity | = 100 | L3 SC-09 4-layer chain verify |
| **S2** featureCompletion | = 100 | 4-5 deliverable |
| **S4** archiveReadiness | = true | ★ master sprint closure ready |

---

## 7. Acceptance Criteria (30 criteria, 5 groups)

### 7.1 AC-L3-Contract (12 criteria)

- **AC-L3-1** `node tests/contract/v2113-sprint-contracts.test.js` exit 0
- **AC-L3-2** output contains `=== L3 Contract: 10/10 PASS ===`
- **AC-L3-3** SC-04 PASS — `VALID_ACTIONS.length === 16`
- **AC-L3-4** SC-04 PASS — `'master-plan'` in VALID_ACTIONS
- **AC-L3-5** SC-06 PASS — `ACTION_TYPES.length === 19`
- **AC-L3-6** SC-06 PASS — `'master_plan_created'` in ACTION_TYPES
- **AC-L3-7** SC-09 PASS — handleSprintAction('master-plan') returns ok:true with plan+paths
- **AC-L3-8** SC-09 PASS — markdown file created
- **AC-L3-9** SC-09 PASS — state json schemaVersion '1.0'
- **AC-L3-10** SC-09 PASS — audit entry 'master_plan_created' present
- **AC-L3-11** SC-10 PASS — estimateTokensForFeature default 33350
- **AC-L3-12** SC-10 PASS — recommendSprintSplit sprint shape (6 keys)

### 7.2 AC-Master-Plan-Wiring (5 criteria)

- **AC-MPW-1** backward compat — no deps.contextSizer → sprints:[] preserved
- **AC-MPW-2** auto-wiring — inject deps.contextSizer → plan.sprints populated
- **AC-MPW-3** silent fallback on cycle — deps.contextSizer returns ok:false → sprints:[] with warning
- **AC-MPW-4** silent fallback on throw — contextSizer throws → sprints:[] no error
- **AC-MPW-5** JSDoc updated with [deps.contextSizer] + [deps.contextSizingConfig]

### 7.3 AC-Agent-Body (4 criteria)

- **AC-AB-1** frontmatter unchanged (line 1-26)
- **AC-AB-2** section title `## Sprint Split Heuristics (Programmatic API)`
- **AC-AB-3** body contains `recommendSprintSplit` reference
- **AC-AB-4** body English (no CJK)

### 7.4 AC-Korean-Guide (5 criteria)

- **AC-KG-1** §2 title `## 2. 16 Sub-actions`
- **AC-KG-2** §2 table includes master-plan row
- **AC-KG-3** §9 title `## 9. Master Plan Generator + Context Sizer 워크플로우` (Korean)
- **AC-KG-4** §9 covers 7 sub-sections
- **AC-KG-5** §9 length ≥ 100 lines

### 7.5 AC-Invariants (4 criteria)

- **AC-INV-1** Sprint 1 Domain 0 LOC delta (vs `9a99948`)
- **AC-INV-2** master-plan.usecase backward compat preserved (S2-UX call signature)
- **AC-INV-3** claude plugin validate Exit 0 (F9-120 **16-cycle**)
- **AC-INV-4** hooks.json 21:24

**Cumulative AC**: **30 criteria** (12 + 5 + 4 + 5 + 4) — Master Plan §11.2 5 groups 충족.

---

## 8. Inter-Sprint Integration — 12 Integration Points (Final)

| IP# | From → To | S4-UX 책임 |
|-----|-----------|-----------|
| **IP-S4-01** | F1 SC-04 → Sprint 4 sprint-handler | VALID_ACTIONS 16 + master-plan inclusion 확인 |
| **IP-S4-02** | F1 SC-06 → lib/audit ACTION_TYPES | 19 entries + master_plan_created |
| **IP-S4-03** | F1 SC-09 → S2-UX master-plan.usecase | 4-layer chain (handler → usecase → state + markdown + audit) |
| **IP-S4-04** | F1 SC-10 → S3-UX context-sizer | pure function contract (5 sub-assertions) |
| **IP-S4-05** | F2 master-plan.usecase → S3-UX context-sizer | deps.contextSizer optional inject |
| **IP-S4-06** | F2 → backward compat | no deps.contextSizer → S2-UX behavior |
| **IP-S4-07** | F3 agent body → S3-UX context-sizer | programmatic API mention + code example |
| **IP-S4-08** | F4 §2 → S2-UX 16 sub-actions | 한국어 table row 추가 |
| **IP-S4-09** | F4 §9 → S2/S3-UX | Master Plan + Context Sizer workflow (한국어) |
| **IP-S4-10** | F1-F4 → Sprint 5 L3 baseline | 8 → 10 contracts (Sprint 5 invariant 의도된 갱신) |
| **IP-S4-11** | All → Doc=Code 0 drift | 4 docs (PRD/Plan/Design/Report) + 4-5 code files |
| **IP-S4-12** | All → sprint-ux-improvement master closure | Master Plan §0.4 11/11 DONE |

---

## 9. Sprint 1-5 Invariant Preservation Matrix

| Sprint | Component | Change | Justification |
|--------|-----------|--------|--------------|
| Sprint 1 Domain | events.js / entity.js / transitions.js / validators.js / index.js | **0 LOC** | option D 패턴 유지 |
| Sprint 2 Application | start-sprint / iterate / etc. (11 use cases) | **0 LOC** | unchanged |
| Sprint 2 Application | master-plan.usecase.js | +15 LOC additive | F2 — backward compat optional auto-wiring (S2-UX contract preserved) |
| Sprint 2 Application | context-sizer.js / sprint-lifecycle/index.js | **0 LOC** | S3-UX unchanged |
| Sprint 3 Infrastructure | sprint-paths.js / 6 adapters | **0 LOC** | unchanged |
| Sprint 4 Presentation | sprint-handler.js / SKILL.md | **0 LOC** | S2-UX preserved |
| Sprint 4 Presentation | agents/sprint-master-planner.md | +30 LOC body, 0 frontmatter | F3 — body programmatic API mention, frontmatter invariant |
| Sprint 5 Quality + Docs | L3 Contract test | +80 LOC (intentional contract update + 2 new) | F1 — SC-04/06 갱신 (S2-UX additive 반영) + SC-09/10 신규 (master-plan + context-sizer 검증) — **의도된 갱신** |
| Sprint 5 Quality + Docs | sprint-management.guide.md | +120 LOC (§2 +1 row + §9 new) | F4 — additive only, 기존 §1-§8 + 부록 0 변경 |
| lib/audit | audit-logger.js | **0 LOC** | unchanged |
| bkit.config.json | sprint section | **0 LOC** | S3-UX unchanged |
| hooks/hooks.json | 21:24 | **0 LOC** | invariant preserved |

**Note Sprint 5 L3 갱신**: SC-04/06 갱신은 S2-UX 의 additive change (15→16 actions, 18→19 ACTION_TYPES) 가 contract test 에 반영되도록 하는 **의도된 contract update**. SC-09/10 신규는 master-plan + context-sizer 의 contract 검증을 위한 **additive expansion** (Sprint 5 invariant 의 "L3 Contract test 추가" Master Plan §0.4 row 8 deliverable).

---

## 10. bkit-system 7 Invariants

| Invariant | 본 sprint 적용 | Mitigation |
|-----------|---------------|-----------|
| **Design First** | ✅ Phase 3 Design 후 Phase 4 Do | git log order |
| **No Guessing** | ✅ §1 verbatim citations + Phase 5 Iterate matchRate 100% target | gap-detector |
| **Gap < 5%** | ✅ matchRate 100% target | gap-detector |
| **State Machine** | ✅ master-plan.usecase backward compat (deps.contextSizer optional) | grep verification |
| **Trust Score** | ✅ master-plan + context-sizer 모두 stateless / config-driven | n/a |
| **Checkpoint** | ✅ SC-09 의 tmp dir cleanup 보장 | finally block |
| **Audit Trail** | ✅ SC-09 가 'master_plan_created' audit entry 검증 | log grep |

---

## 11. 사용자 명시 1-8 충족 매트릭스

| # | Mandate | S4-UX 적용 |
|---|---------|-----------|
| 1 | 8개국어 trigger + @docs 예외 한국어 | ✓ agents 영어 + SKILL.md 0 change (S2-UX 24 phrases 보존) + docs/06-guide §9 한국어 (@docs exception) |
| 2 | Sprint 유기적 상호 연동 | ✓ §8 12 IPs + L3 SC-09 (master-plan 4-layer chain) + SC-10 (context-sizer contract) 정량 검증 |
| 3 | QA = bkit-evals + claude -p + 4-System + diverse | ✓ Phase 6 7-perspective + L3 10/10 |
| 4-1 | Master Plan 자동 생성 | ✓ (S2-UX inherited) + master-plan auto-wiring with contextSizer |
| 4-2 | 컨텍스트 윈도우 sprint sizing | ✓ (S3-UX inherited) + master-plan auto-wiring 활성 |
| 5 | ★ 꼼꼼하고 완벽하게 (빠르게 X) | ✓ PRD ~700 lines target + 12 pre-mortem + 30 AC + 12 IPs |
| 6 | ★ skills/agents YAML + 영어 외 8-lang trigger | ✓ agents frontmatter 0 변경 (S1-S3-UX inherited) + agent body English |
| 7 | ★ Sprint별 유기적 동작 검증 | ✓ §8 12 IPs + L3 SC-09/10 |
| 8 | ★ /control L4 완전 자동 모드 + 꼼꼼함 | ✓ Phase 1-7 자동 진행 + master-plan auto-wiring 은 stateless (사용자 명시 8 inherited) |

---

## 12. Open Questions (PM-S4A~E)

### PM-S4A: master-plan auto-wiring — default ON or OFF?

**Question**: master-plan.usecase 의 deps.contextSizer 가 inject 안 됐을 때 use case 가 자체적으로 sprint-lifecycle/index.js 의 recommendSprintSplit 을 require 해서 호출할까? (default ON), 또는 caller 가 명시적으로 inject 했을 때만? (default OFF)

**Resolution**: Plan §2 — **Default OFF** (backward compat 안전성 우선). Caller (S5-UX/v2.1.14 또는 LLM dispatcher) 가 명시적으로 inject. 단 inject 패턴 example 을 JSDoc 에 명시.

### PM-S4B: SC-09 tmp dir 위치

**Question**: SC-09 의 master-plan call 이 fs writes 하므로 tmp dir 에서 실행해야 함. SC-05 patterns 따라 `os.tmpdir()` + `fs.mkdtempSync` 사용? sprint-paths 가 projectRoot 받아 처리할까?

**Resolution**: Plan §2 — SC-05 패턴 따라 `os.tmpdir()` + `fs.mkdtempSync`. master-plan.usecase 의 input.projectRoot 로 tmp 전달.

### PM-S4C: SC-10 helper exposure

**Question**: SC-10 이 context-sizer.js 내부 helper (topologicalSort, detectCycle) 를 test 하려면 sprint-lifecycle/index.js 의 public export 가 필요. S3-UX 시점에서 export 안 했음. S4-UX 에서 추가할까?

**Resolution**: Plan §2 — **No additive export needed**. SC-10 은 `require('./lib/application/sprint-lifecycle/context-sizer').topologicalSort` 직접 호출 (sprint-lifecycle/index.js 우회). 단 production callers 는 sprint-lifecycle/index.js 만 사용 권장.

### PM-S4D: commands/bkit.md 갱신 여부

**Question**: F5 optional 의 commands/bkit.md ext 가 master-plan 노출에 필요한가?

**Resolution**: Plan §2 — **F5 SKIP for S4-UX**. commands/bkit.md 는 별도 dispatcher 가 아닌 slash command help/doc 파일로, 영향 ROI 낮음. v2.1.14 에서 본격적인 dispatcher 일관성 검토.

### PM-S4E: sprint-management.guide.md §2 vs §9 분리

**Question**: §2 의 16 sub-actions table 에 master-plan row 만 추가할지, 또는 §9 에서 다시 한 번 상세히?

**Resolution**: Plan §2 — **양쪽 다 추가**. §2 에서는 1-line row (다른 actions 와 일관), §9 에서는 7 sub-sections 상세 설명.

---

## 13. Out-of-Scope (Sprint 6 / v2.1.14 / 별도)

| 항목 | 별도 |
|------|------|
| BKIT_VERSION 5-loc bump | Sprint 6 (v2.1.13 release) |
| CHANGELOG v2.1.13 | Sprint 6 |
| ADR 0010 신규 | Sprint 6 |
| git tag v2.1.13 + GitHub Release | Sprint 6 |
| chmod +x scripts/sprint-handler.js | Sprint 6 release script |
| commands/bkit.md ext | (PM-S4D resolved — skip) |
| Domain LOC hints (auth=8000) | v2.1.14 |
| Codebase grep-based LOC estimation | v2.1.14 |
| `--locHint` CLI flag | v2.1.14 |
| MEMORY.md `## Active Sprints` hook v2 | v2.1.14 |
| Real backend wiring (chrome-qa MCP) | v2.1.14 |
| bkit-evals sprint family 정식 invocation | 별도 sprint |
| automation-controller.js Trust Level 단일 SoT 통합 | v2.1.14 |
| topologicalSort + detectCycle public export | v2.1.14 (PM-S4C resolved — internal only) |

---

## 14. References

### 14.1 Master Plan + S1/S2/S3-UX 자료

- `docs/01-plan/features/sprint-ux-improvement.master-plan.md` (602 lines) — v1.0
- S1-UX 5 commits + S2-UX 5 commits + S3-UX 5 commits (총 15 commits, faf9eca→9a99948)
- S1-UX Report §9 (carry items) + S2-UX Report §9 + S3-UX Report §10
- S3-UX Report §10.2 S3→S4 Readiness — 본 PRD 작성 base

### 14.2 Code base 자료 (verbatim citation)

- `tests/contract/v2113-sprint-contracts.test.js` (251 lines) — F1 patch base
- `lib/application/sprint-lifecycle/master-plan.usecase.js` (S2-UX 470 LOC) — F2 patch base
- `lib/application/sprint-lifecycle/context-sizer.js` (S3-UX 393 LOC) — F1 SC-10 + F2 wiring 대상
- `agents/sprint-master-planner.md` (S2-UX 후 181 lines) — F3 patch base
- `docs/06-guide/sprint-management.guide.md` (10 sections existing) — F4 patch base
- `commands/bkit.md` — F5 PM-S4D skip

### 14.3 ADR + 사용자 명시 reference

- ADR 0007/0008/0009 (Sprint as Meta Container / Phase Enum / Auto-Pause)
- 사용자 명시 1-8 + bkit-system 7 invariants

---

## 15. PRD Final Checklist

- [x] **사용자 명시 1 (8개국어)** — agents 영어 + SKILL.md 0 change + docs §9 한국어 (@docs exception)
- [x] **사용자 명시 2 (Sprint 유기적)** — §8 12 IPs
- [x] **사용자 명시 3 (eval+claude -p+4-System+diverse)** — §6 Quality Gates + §7 30 AC + Phase 6 7-perspective
- [x] **사용자 명시 4-1 + 4-2 통합** — F2 master-plan auto-wiring (S2-UX + S3-UX 결합)
- [x] **사용자 명시 5 (꼼꼼함)** — 본 PRD ~700+ lines target + 12 pre-mortem + 30 AC + 5 PM-S4 + Out-of-scope 14 + References 5+
- [x] **사용자 명시 6 (skills/agents YAML + 영어 외 8-lang)** — agents frontmatter 0 변경 + body English (F3 invariant)
- [x] **사용자 명시 7 (Sprint별 유기적 동작 검증)** — §8 12 IPs + L3 SC-09/10
- [x] **사용자 명시 8 (/control L4 완전 자동)** — pure function + backward compat
- [x] **bkit-system 7 invariants** — §10 매트릭스
- [x] **Sprint 1 invariant 0 변경** — §9 매트릭스 (S1-S3-UX inherited)
- [x] **S2-UX contract 보존** — master-plan.usecase backward compat
- [x] **S3-UX contract 보존** — context-sizer.js 0 LOC delta
- [x] **L3 Contract 10/10 PASS** — AC-L3-1~12
- [x] **Cumulative TCs 250+** — Sprint 5 226 + L3 10 + smoke 14+ = 250+
- [x] **F9-120 16-cycle** — AC-INV-3
- [x] **hooks.json 21:24** — AC-INV-4
- [x] **Pre-mortem 12** — §5
- [x] **AC 30** — §7 5 groups
- [x] **No Guessing verbatim citations** — §1 6건
- [x] **Open questions PM-S4A~E** — §12 5건
- [x] **Out-of-scope confirmed** — §13 14항목
- [x] **Master sprint closure ready** — Phase 7 Report 에 master closure summary 포함

---

**PRD Status**: ★ **Draft v1.0 완료**.
**Next**: Phase 2 Plan 진입 — `docs/01-plan/features/s4-ux.plan.md` 작성. R1-R12 + algorithm exact spec + AC commit-ready commands.
**예상 소요**: Phase 2 Plan ~30분.
**사용자 명시 1-8 보존 확인**: 8/8.
**S4-UX 가 sprint-ux-improvement master sprint 의 마지막 sub-sprint — 완료 후 master closure.**
