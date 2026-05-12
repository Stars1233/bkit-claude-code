# S3-UX PRD — Sprint UX 개선 Sub-Sprint 3 (Context Sizer)

> **Sub-Sprint ID**: `s3-ux` (sprint-ux-improvement master 의 3/4)
> **Phase**: PRD (1/7) — ★ in_progress
> **Depends on**: S2-UX `a25d176` (Master Plan Generator completed, 40/40 AC PASS, F9-120 14-cycle, Sprint 1 = 0 LOC)
> **Master Plan Ref**: `docs/01-plan/features/sprint-ux-improvement.master-plan.md` §4.7 + §5.1 + §6.3
> **Date**: 2026-05-12
> **Author**: kay kim (POPUP STUDIO PTE. LTD.) + bkit AI orchestration
> **Branch**: `feature/v2113-sprint-management`
> **Status**: ★ Draft v1.0 — Master Plan §5.1 S3-UX scope (~30K tokens, 3 files, 60-90분) 시작

---

## 0. Executive Summary

### 0.1 Mission

S2-UX 가 정립한 master-plan.usecase 의 `sprints: []` 빈 stub interface 를 채울 **Context Sizer** module 을 신설한다. Token estimation + dependency graph + sprint split recommendation 알고리즘을 통해 ★ 사용자 명시 4-2 (단일 세션 안전 sprint sizing, ≤100K tokens/sprint) 를 정량 충족한다. Master Plan §0.4 #3 (Sprint 분할 자동 추천) + #4 (≤ 100K tokens/sprint) 둘 다 본 sub-sprint 의 분담 분.

### 0.2 Anti-Mission

- **master-plan.usecase 의 generateMasterPlan signature 변경 금지** — S2-UX `a679d64` 의 contract 보존. context-sizer 는 별도 export 로 노출하며 master-plan 과 의 통합은 S4-UX (또는 caller side)
- **Sprint 1 (Domain) 변경 금지** — events.js / entity.js / transitions.js / validators.js / index.js 모두 0 LOC delta. S2-UX precedent 동일하게 보존
- **agents/sprint-master-planner.md body 변경 금지** — S2-UX 의 5 신규 sections 보존, frontmatter 변경 0 invariant
- **scripts/sprint-handler.js 변경 금지** — VALID_ACTIONS 16건 그대로 유지. context-sizer 는 sub-action 으로 노출 안 함 (programmatic API only). UI surface 확장은 S4-UX
- **bkit.config.json 의 기존 17 sections 0 변경** — 신규 `sprint` section additive 만 추가
- **빠르게 끝내기 금지 (사용자 명시 5)** — PRD ~700+ lines, Plan ~800+ lines, Design ~900+ lines 목표 (S2-UX 3,729 lines docs 패턴 유지)

### 0.3 4-Perspective Value Matrix

| Perspective | 현재 (Before S3-UX) | After S3-UX |
|------------|--------------------|-------------|
| **사용자 UX** | master-plan.usecase 가 sprints:[] 빈 배열 반환 → 사용자가 수동으로 sprint 분할 결정 | ✓ Master Plan 생성 시 자동 sprint split recommendation. 입력 features[] → token estimate → ≤100K tokens/sprint 자동 split. dependencyGraph 자동 구성 (sequential or parallel hint) |
| **Architecture** | context window safety 는 master-planner agent 의 "도덕적 권장사항" 에 의존, programmatic 보장 부재 | ✓ `lib/application/sprint-lifecycle/context-sizer.js` 신규 module. pure function (no I/O), deterministic algorithm. 단위 테스트 가능. `bkit.config.json` `sprint.contextSizing` section 으로 threshold tunable |
| **Cost/Performance** | (변경 0) | ✓ Token estimate 계산 O(N) per features array, sprint split O(N²) worst-case (N≤12 sprints max). bkit.config.json read 1회 (cached). master-plan use case 에서 optional integration (S4-UX) |
| **Risk** | sprint split 알고리즘 부정확 → 잘못된 sprint 경계 추천, 단일 세션 안전성 깨짐 | ✓ Conservative safety margin (default 25% — 100K threshold = 75K effective budget). Tunable via bkit.config.json. fallback: features 3건 이하 + no deps → single sprint. dependency cycle detection → return error not throw |

### 0.4 정량 목표 (Master Plan §0.4 분담 분)

| # | Master Plan target | S3-UX achievement plan |
|---|--------------------|-----------------------|
| 3 | Sprint 분할 자동 추천 | ✓ `recommendSprintSplit(input, config)` API 신규 — features + dependency graph → split[] |
| 4 | ≤ 100K tokens/sprint | ✓ `bkit.config.json.sprint.contextSizing.maxTokensPerSprint = 100000` default, safety margin 25% (effective 75K) |
| 8 | L3 Contract test 추가 (SC-09 + SC-10) | (S4-UX scope) — but stub interface ready (estimateTokensForFeature + recommendSprintSplit pure functions, easy contract test) |
| 9 | Sprint 1-5 invariant 보존 | ✓ Sprint 1 = 0 LOC delta, Sprint 2 additive export only, Sprint 3 unchanged, Sprint 4 unchanged. bkit.config.json sprint section additive |
| 10 | `claude plugin validate .` Exit 0 | ✓ F9-120 **15-cycle** target (S2-UX 14-cycle 위 +1) |

### 0.5 S2-UX deliverables 활용 (Inter-Sprint Integration)

| S2-UX deliverable | S3-UX 활용 |
|-------------------|-----------|
| `master-plan.usecase.js` plan object schema (sprints:[] field) | S3-UX context-sizer 가 동일 sprint object shape 반환 — caller (S4-UX) 가 plan.sprints 에 채워 넣을 수 있도록 |
| `lib/application/sprint-lifecycle/index.js` (31 exports) | additive export — `recommendSprintSplit`, `estimateTokensForFeature`, `loadContextSizingConfig` (총 31 → 34 exports) |
| `lib/audit/audit-logger.js` ACTION_TYPES (19 entries) | 추가 X — context-sizer 는 pure function 이라 audit emit 안 함. Master Plan 호출 후 결과는 master_plan_created entry 에 포함 (S4-UX 통합 시) |
| `lib/infra/sprint/sprint-paths.js` helpers | 활용 안 함 — context-sizer 는 I/O free pure function |
| `templates/sprint/master-plan.template.md` | 활용 안 함 — context-sizer 는 markdown 생성 안 함 |
| `agents/sprint-master-planner.md` Sprint Split Heuristics section | ✓ S2-UX 의 textual heuristic 을 본 sprint 에서 programmatic algorithm 으로 구체화 |

---

## 1. Master Plan Verbatim Citations + No Guessing Invariant

### 1.1 Master Plan §4.7 (★ 사용자 명시 4-2)

> **§4.7 항목**
> | **Gap** | sprint 분할 시 token estimate 부재 → 단일 세션 안전 보장 X |
> | **Fix** | `lib/application/sprint-lifecycle/context-sizer.js` 신규 — feature 별 token estimate + sprint 분할 추천 (≤ 100K tokens/sprint 기본) |
> | **난이도** | M (heuristic algorithm + tunable threshold via bkit.config.json) |

본 PRD §3 (Feature Map) 가 이 fix 를 3 deliverable 로 분해.

### 1.2 Master Plan §6.3 (사용자 명시 4-1 / 4-2 충족)

> - 4-2 (Context window 격리): context-sizer 가 sprint 별 token estimate → 100K 초과 시 자동 분할 추천 → 단일 세션 안전

본 PRD §JS-01~05 가 이 사용자 명시 4-2 의 5 Job Stories 분해.

### 1.3 Master Plan §5.1 분할 매트릭스 — S3-UX 행

> | **S3-UX** | Context Sizer | context-sizer.js + bkit.config.json threshold + 추천 알고리즘 | ~30K | 3 files | 60-90분 |

본 PRD §3.1~3.3 가 정확히 이 3 files 의 spec 작성.

### 1.4 S2-UX precedent — sprints:[] stub interface (master-plan.usecase.js line 397)

S2-UX 의 master-plan.usecase.js 의 plan object 에서 (`a679d64` commit):

```javascript
const plan = {
  schemaVersion: MASTER_PLAN_SCHEMA_VERSION,
  projectId: input.projectId,
  projectName: input.projectName,
  features: Array.isArray(input.features) ? input.features.slice() : [],
  sprints: [], // stub for S3-UX context-sizer
  dependencyGraph: {},
  trustLevel: input.trustLevel || DEFAULT_TRUST_LEVEL,
  // ...
};
```

본 PRD §3.1 F1 context-sizer 가 `recommendSprintSplit(input)` API 를 통해 이 stub 을 채울 수 있도록 sprint object shape 매칭 보장.

### 1.5 S2-UX precedent — agents/sprint-master-planner.md "Sprint Split Heuristics"

S2-UX `a679d64` 의 agent body 의 textual heuristic (line ~140-160):

> - Group features by dependency graph (topological sort)
> - Each group ≤ ~100K tokens (heuristic: ~1.5K LOC per 10K tokens)
> - Sequential dependency: each sprint blocks the next
> - Fallback: if features count ≤ 3 and no inter-feature deps, single sprint

본 PRD §3.1 F1 의 algorithm 이 이 textual heuristic 의 programmatic 구체화.

### 1.6 bkit.config.json 현재 structure (verbatim line 43-76)

기존 `pdca` section 의 thresholds 패턴:
```json
"pdca": {
  "matchRateThreshold": 90,
  "autoIterate": true,
  "maxIterations": 5,
  // ...
}
```

S3-UX 패치 위치 — `pdca` section 다음 line 신규 `sprint` section 추가 (additive only).

### 1.7 lib/application/sprint-lifecycle/index.js verbatim — current exports (S2-UX `a679d64` 후)

```javascript
const masterPlanMod = require('./master-plan.usecase');
// ...
// Sprint 2 — Master Plan generator (S2-UX, v2.1.13)
generateMasterPlan: masterPlanMod.generateMasterPlan,
validateMasterPlanInput: masterPlanMod.validateMasterPlanInput,
loadMasterPlanState: masterPlanMod.loadMasterPlanState,
saveMasterPlanState: masterPlanMod.saveMasterPlanState,
MASTER_PLAN_SCHEMA_VERSION: masterPlanMod.MASTER_PLAN_SCHEMA_VERSION,
```

S3-UX 패치 위치 — masterPlanMod 라인 다음 `contextSizerMod` 추가 + Sprint 2 export block 다음 새 block 추가 (additive).

---

## 2. Context Anchor (Plan → Design → Do 전파)

| Key | Value |
|-----|-------|
| **WHY** | Master Plan §4.7 의 "Gap: sprint 분할 시 token estimate 부재 → 단일 세션 안전 보장 X" + 사용자 명시 4-2 (컨텍스트 윈도우 격리) 충족. S2-UX 가 sprints:[] stub interface 를 expose 했으므로 그 channel 을 정량 알고리즘으로 채울 base 가 준비됨. 본 sub-sprint 자체가 사용자 명시 4 의 실증 — S3-UX 3 files 가 단일 세션 ~30K tokens 안전 범위 안에서 완성된다. |
| **WHO** | (1) bkit 사용자 — Master Plan 생성 시 자동 sprint split 받음, 단일 세션 안전성 보장. (2) `agents/sprint-master-planner.md` agent — 본 sprint 의 programmatic algorithm 을 활용해 자체 heuristic 정확도 ↑ (선택적, S4-UX integration). (3) `lib/application/sprint-lifecycle/index.js` exports — 3 신규 export 추가 (31 → 34). (4) `bkit.config.json` — 신규 `sprint` section 18번째 root-level key 추가. (5) S4-UX (Integration + L3 Contract) — `recommendSprintSplit` + `estimateTokensForFeature` 의 contract test base 제공. (6) `master-plan.usecase` future integration — S4-UX 또는 v2.1.14 에서 optional `deps.contextSizer` inject 패턴으로 통합. (7) `/control L0-L4` 사용자 — context budget 초과 시 자동 split 추천으로 BUDGET_EXCEEDED auto-pause 예방. |
| **RISK** | (a) **Token estimation 부정확** — features 가 vague string ("auth") 일 때 LOC 추정 불가능 → conservative default (5K LOC per feature, ~33K tokens). 사용자가 features 에 hint 제공 가능 (`feature:loc=2000` 형식, S4-UX 또는 v2.1.14). (b) **Dependency cycle detection 실패** — features 가 서로 dep 있으면 무한 loop. 회피 = topological sort with cycle detection (Kahn's algorithm) + return `{ ok: false, error: 'dependency_cycle' }`. (c) **bkit.config.json missing sprint section** — backward compat 위해 `loadContextSizingConfig` 가 default fallback object 반환 (existing config 변경 0). (d) **Master Plan §0.4 row 4 (≤ 100K tokens/sprint) 위배 가능성** — 단일 feature 가 100K 초과 추정 시 single-feature sprint 반환 + warning. 사용자 manual override 가능. (e) **Sprint 1 invariant 위배 risk** — context-sizer 는 lib/application/sprint-lifecycle 안에서 pure function module 이므로 Sprint 1 (Domain) 영향 0. (f) **`recommendSprintSplit` 의 output shape 가 master-plan.usecase 의 sprints:[] schema 와 불일치** — S2-UX 의 plan.sprints[] 의 sprint object shape 와 일치 강제 (kebab id + name + features + scope + tokenEst + dependsOn). (g) **F9-120 15-cycle 깨기 risk** — context-sizer.js 는 pure JS, plugin manifest 영향 0 → 안전. bkit.config.json 변경은 JSON schema 변경이지 plugin manifest 가 아님 → 안전. (h) **agent body Sprint Split Heuristics 갱신 필요?** — 본 sprint 는 agent body 변경 0 (programmatic API만 추가). agent 가 본 API 활용하는 통합은 S4-UX scope. (i) **8-language trigger 일부 누락** — context-sizer 는 backend module, user-facing skill 추가 없음. 단 bkit.config.json sprint section 의 새 thresholds 가 사용자 노출 → SKILL.md 또는 docs/06-guide §9 (S4-UX) 에서 documented 필요. (j) **Sprint 1-5 invariant 깨기** — Sprint 2 application/index.js additive export only, Sprint 3-4-5 unchanged. |
| **SUCCESS** | (1) `recommendSprintSplit(input, config)` API 동작 — features[] → split[] sprint object 배열. (2) `estimateTokensForFeature(featureName, opts)` API 동작 — string → number (token estimate). (3) `loadContextSizingConfig(opts)` API 동작 — read bkit.config.json or default fallback. (4) `bkit.config.json` 에 신규 `sprint` section 추가 — maxTokensPerSprint, safetyMargin, tokensPerLOC, minSprints, maxSprints, dependencyAware 6 fields. (5) Single-feature 100K 초과 시 single-feature sprint + warning. (6) Dependency cycle detection → 사용자 friendly error. (7) features 3건 이하 + no deps → single sprint (Master Plan §1.5 heuristic). (8) Sprint 1 invariant 100% 보존 (events/entity/transitions/validators/index.js ALL 0 LOC). (9) Sprint 2-4 additive only (sprint-lifecycle/index.js +3 exports, bkit.config.json +1 section). (10) `claude plugin validate .` Exit 0 — F9-120 15-cycle 달성. (11) L3 Contract SC-01~SC-08 regression PASS 유지 (단 SC-04/06 expected mismatch 같음 — S4-UX scope). (12) Doc=Code 0 drift — 4 docs (PRD/Plan/Design/Report) + 3 code files sync. (13) `master-plan.usecase.js` 0 change — S2-UX contract 보존. (14) Master Plan §0.4 분담 분 #3 + #4 둘 다 DONE. |
| **SCOPE (정량)** | **In-scope 3 files**: (1) `lib/application/sprint-lifecycle/context-sizer.js` (신규, ~280 LOC, pure function module), (2) `lib/application/sprint-lifecycle/index.js` (additive export, +8 LOC), (3) `bkit.config.json` (신규 sprint section, +20 LOC). **신규 dir**: 없음 (context-sizer 는 I/O free pure function — `.bkit/state/master-plans/` write 안 함). **OUT-OF-SCOPE**: master-plan.usecase 의 contextSizer inject (S4-UX), agent body programmatic API mention (S4-UX), L3 Contract SC-09 (master-plan invocation contract — S4-UX) + SC-10 (context-sizing contract — S4-UX), sprint-handler.js sub-action 추가 (S4-UX 또는 v2.1.14), docs/06-guide/sprint-management.guide.md §9 신규 (S4-UX), commands/bkit.md ext (S4-UX). |

---

## 3. Feature Map (3 deliverable)

### F1: `lib/application/sprint-lifecycle/context-sizer.js` (신규, ~280 LOC)

| 항목 | 내용 |
|------|------|
| **Module path** | `lib/application/sprint-lifecycle/context-sizer.js` |
| **Module type** | Pure function module — no fs/path I/O at module top-level, no audit emit, no state persistence |
| **Exports** | `estimateTokensForFeature(featureName, opts)`, `recommendSprintSplit(input, opts)`, `loadContextSizingConfig(opts)`, `topologicalSort(graph)`, `detectCycle(graph)`, `CONTEXT_SIZING_DEFAULTS`, `CONTEXT_SIZING_SCHEMA_VERSION = '1.0'` |
| **estimateTokensForFeature** | Input: `featureName` (string) + opts `{ locHint?, tokensPerLOC?, baselineLOC? }`. Output: `number` (estimated tokens). Algorithm: if locHint provided → locHint × tokensPerLOC. Else → baselineLOC (default 5000) × tokensPerLOC (default 6.67) = ~33K tokens per feature. |
| **recommendSprintSplit** | Input: `{ projectId, features[], dependencyGraph? }` + opts (`maxTokensPerSprint`, `safetyMargin`, `tokensPerLOC`, `minSprints`, `maxSprints`, `dependencyAware`). Output: `{ ok, sprints: [{ id, name, features, scope, tokenEst, dependsOn }], dependencyGraph, totalTokenEst, warning? }` or `{ ok: false, error }`. Algorithm: (a) topological sort if deps, (b) greedy bin-packing with effective budget = maxTokensPerSprint × (1 - safetyMargin), (c) single-feature spillover (single feature > budget → own sprint + warning). |
| **loadContextSizingConfig** | Input: `{ projectRoot? }`. Output: config object merging bkit.config.json `sprint.contextSizing` with `CONTEXT_SIZING_DEFAULTS`. Falls back to defaults if file missing or section absent. |
| **topologicalSort** | Standard Kahn's algorithm. Input: `{ nodeA: [deps...], nodeB: [], ... }`. Output: `{ ok, order: [], cycle?: [] }`. |
| **detectCycle** | Wrapper around topologicalSort — returns `true` if cycle exists, else `false`. |
| **JSDoc complete** | Every export documented with @param/@returns/@throws |
| **Pure function** | No fs.writeFile, no audit emit, no setTimeout, no Promise (synchronous APIs). Only loadContextSizingConfig has async variant for fs.readFile. |

### F2: `lib/application/sprint-lifecycle/index.js` (additive export, +8 LOC)

| 항목 | 내용 |
|------|------|
| **변경 type** | Additive only — 기존 31 exports 보존 |
| **추가 항목** | line 39 (`const masterPlanMod = require('./master-plan.usecase');`) 다음 line: `const contextSizerMod = require('./context-sizer');`. line 75-81 의 Sprint 2 Master Plan export block 다음 새 block: |
| **추가 코드** | ```javascript<br>// Sprint 2 — Context Sizer (S3-UX, v2.1.13)<br>estimateTokensForFeature: contextSizerMod.estimateTokensForFeature,<br>recommendSprintSplit: contextSizerMod.recommendSprintSplit,<br>loadContextSizingConfig: contextSizerMod.loadContextSizingConfig,<br>CONTEXT_SIZING_DEFAULTS: contextSizerMod.CONTEXT_SIZING_DEFAULTS,<br>CONTEXT_SIZING_SCHEMA_VERSION: contextSizerMod.CONTEXT_SIZING_SCHEMA_VERSION,<br>``` |
| **JSDoc 갱신** | line 19 의 Sprint 2 sub-list 끝 (`master-plan.usecase.js`) 다음 line: `*     context-sizer.js            — recommendSprintSplit (S3-UX, v2.1.13)` |
| **Total LOC delta** | +8 (5 exports + 1 require + 1 comment + 1 JSDoc) |

### F3: `bkit.config.json` (신규 sprint section, +20 LOC)

| 항목 | 내용 |
|------|------|
| **변경 위치** | line 76 의 `pdca` section closing `}` 다음 신규 `sprint` section 추가 (additive only — 17 sections → 18 sections) |
| **추가 schema** | ```json<br>"sprint": {<br>  "contextSizing": {<br>    "enabled": true,<br>    "schemaVersion": "1.0",<br>    "maxTokensPerSprint": 100000,<br>    "safetyMargin": 0.25,<br>    "tokensPerLOC": 6.67,<br>    "baselineLOC": 5000,<br>    "minSprints": 1,<br>    "maxSprints": 12,<br>    "dependencyAware": true<br>  }<br>}<br>``` |
| **Defaults rationale** | maxTokensPerSprint=100000 (Master Plan §5.1), safetyMargin=0.25 (effective budget 75K), tokensPerLOC=6.67 (Master Plan §1.5 heuristic 1.5K LOC per 10K tokens 역수), baselineLOC=5000 (보수적 mid-sized feature), minSprints=1 (single feature OK), maxSprints=12 (PRD §0.5 architecture limit), dependencyAware=true (topological sort 활성) |
| **Backward compat** | 기존 17 sections (ui/control/pdca/triggers/pipeline/multiFeature/featurePatterns/fileDetection/cache/performance/permissions/automation/guardrails/quality/team/version + root level) 0 변경 |

---

## 4. Job Stories (5 stories)

### JS-01: bkit 사용자 — 자동 sprint split 받기

**As a** bkit 사용자 with multi-feature project (e.g., 6 features: auth + payment + reports + admin + api + docs),
**I want** the master-plan to automatically split into 3 sprints with token-budget awareness,
**So that** each sprint fits in a single session (~75K effective tokens) and I don't need to manually estimate split points.

**Acceptance**:
- `recommendSprintSplit({ projectId: 'q2-launch', features: ['auth', 'payment', 'reports', 'admin', 'api', 'docs'] })` returns `sprints.length >= 2` (assuming 6 × 33K = 198K > 75K budget)
- Each returned sprint has `tokenEst <= maxTokensPerSprint * (1 - safetyMargin)` (default 75000)
- `totalTokenEst` matches sum of features estimates

### JS-02: Dependency-aware split

**As a** project lead with feature dependencies (e.g., `payment` depends on `auth`, `reports` depends on both),
**I want** dependency graph respected in sprint split,
**So that** Sprint N completes before Sprint N+1 starts, no parallel attempts on dependent features.

**Acceptance**:
- `recommendSprintSplit({ projectId, features: ['auth', 'payment', 'reports'], dependencyGraph: { payment: ['auth'], reports: ['auth', 'payment'] } })` returns sprints in topological order
- `sprint.dependsOn` populated based on inter-sprint dep edges
- if cycle exists: returns `{ ok: false, error: 'dependency_cycle', cycle: [...] }`

### JS-03: Single-feature spillover

**As a** developer with a single oversized feature (e.g., complete rewrite of auth, locHint=20000 LOC = ~134K tokens),
**I want** the recommender to allocate that feature its own sprint with a warning,
**So that** I'm aware the feature exceeds normal budget and may need further decomposition before implementation.

**Acceptance**:
- `recommendSprintSplit({ projectId, features: ['big-auth'] }, { ... })` where estimated tokens > maxTokensPerSprint
- returns `sprints.length === 1`, `sprint.features = ['big-auth']`, `sprint.tokenEst > maxTokensPerSprint`
- `warning` field populated: `"feature 'big-auth' exceeds maxTokensPerSprint; consider further decomposition"`

### JS-04: Configurable thresholds via bkit.config.json

**As a** team lead with custom sprint budget (e.g., we use 60K tokens/sprint for tighter focus),
**I want** to override defaults via bkit.config.json,
**So that** the algorithm uses my custom thresholds without code change.

**Acceptance**:
- bkit.config.json `sprint.contextSizing.maxTokensPerSprint = 60000`
- `loadContextSizingConfig({ projectRoot })` returns merged config with `maxTokensPerSprint: 60000`
- `recommendSprintSplit(input, loadedConfig)` uses 60000 as base, effective budget = 60000 * 0.75 = 45000

### JS-05: backward compat — missing sprint section

**As a** existing bkit user without `sprint` section in bkit.config.json,
**I want** the algorithm to fall back to defaults silently,
**So that** existing projects continue working without config migration.

**Acceptance**:
- `loadContextSizingConfig({ projectRoot })` where bkit.config.json has no `sprint` key returns `CONTEXT_SIZING_DEFAULTS` exactly
- no error thrown
- no warning logged (silent fallback)

---

## 5. Pre-mortem (10 scenarios)

| # | 시나리오 | 방지 | 검증 |
|---|----------|------|------|
| A | Token estimation 으로 features 가 vague string 일 때 부정확 | baselineLOC default 5000 (mid-sized) + locHint flag (S4-UX 또는 v2.1.14) | unit test: estimateTokensForFeature("auth") = 5000 * 6.67 ≈ 33350 |
| B | Dependency cycle 무한 loop | Kahn's algorithm + early cycle detection → return `{ ok: false, error: 'dependency_cycle' }` | unit test: detectCycle({ a: ['b'], b: ['a'] }) === true |
| C | Single feature > maxTokensPerSprint | Single-feature spillover + warning field | JS-03 AC |
| D | bkit.config.json missing or malformed | loadContextSizingConfig fallback to defaults silently | JS-05 AC |
| E | features array empty | recommendSprintSplit returns `{ ok: true, sprints: [], totalTokenEst: 0 }` (no error) | edge case test |
| F | maxSprints exceeded (e.g., 50 features) | hard cap maxSprints=12, return `{ ok: false, error: 'exceeds_maxSprints', suggestedAction: 'increase maxSprints in bkit.config.json or decompose project' }` | edge case test |
| G | Sprint 1 invariant 위배 | context-sizer is purely in Application Layer (Sprint 2), no Domain (Sprint 1) imports | `grep "require.*domain" lib/application/sprint-lifecycle/context-sizer.js` 0 matches |
| H | master-plan.usecase.js 변경 | S3-UX out-of-scope — master-plan-context-sizer integration deferred to S4-UX | `git diff faf9eca..HEAD -- lib/application/sprint-lifecycle/master-plan.usecase.js` will show S2-UX only changes; S3-UX commit 0 LOC delta |
| I | bkit.config.json 기존 sections 변경 | additive only — diff inspection 시 기존 17 sections 0 change | `node -e "..." JSON diff comparison` |
| J | 사용자 명시 5 (꼼꼼함) 위배 | PRD ~700 + Plan ~800 + Design ~900 + Report ~600 lines target | git diff stat lines after commit |

---

## 6. Quality Gates Activation Matrix

| Gate | Threshold | S3-UX 적용 |
|------|-----------|-----------|
| **M1** matchRate | ≥ 90% (target 100%) | Iterate phase 강제 |
| **M2** codeQualityScore | ≥ 80 | code review — JSDoc + pure function + no I/O at module load |
| **M3** criticalIssueCount | = 0 | qa-lead — runtime errors |
| **M4** apiComplianceRate | ≥ 95 | public API signature additive only |
| **M5** testCoverage | ≥ 70 | unit test 추가 (5+ pure function smoke) |
| **M7** conventionCompliance | ≥ 90 | English code + Korean docs + JSDoc + ESLint clean |
| **M8** designCompleteness | ≥ 85 | Design §2 (interfaces) + §3 (algorithm) + §4 (data flow) + §5 (patches) + §6 (Inter-Sprint) + §7 (AC) + §8 (test plan) + §9 (Sprint 1-5 보존) + §10 (Final checklist) |
| **M10** pdcaCycleTimeHours | ≤ 40 | S3-UX 60-90분 (Master Plan §5.1) |
| **S1** dataFlowIntegrity | = 100 | Pure function — no data flow hops needed. context-sizer is leaf module |
| **S2** featureCompletion | = 100 | 3 deliverable + algorithm correctness verified |
| **S4** archiveReadiness | = true | Phase 7 Report 후 task #9 close 가능 |

---

## 7. Acceptance Criteria (28 criteria, 4 groups)

### 7.1 AC-Context-Sizer (12 criteria)

- **AC-CS-1** `estimateTokensForFeature('auth')` returns number (default ~33350 = 5000 × 6.67)
- **AC-CS-2** `estimateTokensForFeature('auth', { locHint: 2000 })` returns 13340 (2000 × 6.67)
- **AC-CS-3** `estimateTokensForFeature('auth', { tokensPerLOC: 10 })` returns 50000 (5000 × 10)
- **AC-CS-4** `recommendSprintSplit({ projectId: 'p1', features: [] })` returns `{ ok: true, sprints: [], totalTokenEst: 0 }`
- **AC-CS-5** `recommendSprintSplit({ projectId: 'p1', features: ['a', 'b', 'c'] })` returns `sprints.length === 1` (3 features × 33K ≤ 75K)
- **AC-CS-6** `recommendSprintSplit({ projectId: 'p1', features: ['a', 'b', 'c', 'd', 'e', 'f'] })` returns `sprints.length >= 2` (6 features × 33K ≥ 75K * 2)
- **AC-CS-7** dependency-aware split — topological order respected
- **AC-CS-8** cycle detection — `detectCycle({ a: ['b'], b: ['a'] }) === true`
- **AC-CS-9** single-feature spillover — locHint=20000 (134K) features='big' returns single sprint + warning
- **AC-CS-10** maxSprints cap — 50 features 던지면 `{ ok: false, error: 'exceeds_maxSprints' }`
- **AC-CS-11** All sprint objects have shape `{ id, name, features[], scope, tokenEst, dependsOn[] }` matching S2-UX plan.sprints[] schema
- **AC-CS-12** loadContextSizingConfig fallback — bkit.config.json without sprint section returns CONTEXT_SIZING_DEFAULTS

### 7.2 AC-Index-Exports (4 criteria)

- **AC-IE-1** `Object.keys(require('./lib/application/sprint-lifecycle')).length` = 36 (31 + 5 new)
- **AC-IE-2** `typeof require('./lib/application/sprint-lifecycle').recommendSprintSplit === 'function'`
- **AC-IE-3** `typeof require('./lib/application/sprint-lifecycle').estimateTokensForFeature === 'function'`
- **AC-IE-4** `require('./lib/application/sprint-lifecycle').CONTEXT_SIZING_SCHEMA_VERSION === '1.0'`

### 7.3 AC-bkit-Config (5 criteria)

- **AC-BC-1** JSON parse `bkit.config.json` succeeds (no syntax error)
- **AC-BC-2** `bkit.config.json` has `sprint.contextSizing` section
- **AC-BC-3** All 9 contextSizing fields present: enabled, schemaVersion, maxTokensPerSprint, safetyMargin, tokensPerLOC, baselineLOC, minSprints, maxSprints, dependencyAware
- **AC-BC-4** Existing 17 sections (root level keys) unchanged: ui, control, pdca, triggers, pipeline, multiFeature, featurePatterns, fileDetection, cache, performance, permissions, automation, guardrails, quality, team, version + (1 if root level counted differently)
- **AC-BC-5** `loadContextSizingConfig({ projectRoot: cwd })` returns config with `maxTokensPerSprint: 100000`

### 7.4 AC-Invariants-Preservation (7 criteria)

- **AC-INV-1** `git diff faf9eca..HEAD -- lib/domain/sprint/events.js` empty (Sprint 1 events.js 0 change vs S2-UX baseline)
- **AC-INV-2** `git diff faf9eca..HEAD -- lib/domain/sprint/entity.js` empty
- **AC-INV-3** `git diff a25d176..HEAD -- lib/application/sprint-lifecycle/master-plan.usecase.js` empty (S2-UX `a25d176` 후 0 change)
- **AC-INV-4** `git diff a25d176..HEAD -- agents/sprint-master-planner.md` empty
- **AC-INV-5** `claude plugin validate .` Exit 0 — F9-120 **15-cycle** 달성
- **AC-INV-6** `hooks/hooks.json` events:21 blocks:24 unchanged
- **AC-INV-7** L3 Contract SC-01~SC-08 6/8 PASS regression (SC-04/06 expected mismatch from S2-UX)

**Cumulative AC**: **28 criteria** (12 + 4 + 5 + 7) — Master Plan §11.2 5 groups 부분 충족 (4 groups in S3-UX, 1 group AC-MPG inherited from S2-UX)

---

## 8. Inter-Sprint Integration — 10 Integration Points

| IP# | From → To | S3-UX 책임 |
|-----|-----------|-----------|
| **IP-S3-01** | F1 context-sizer → Sprint 1 (Domain) | 0 dependency on Sprint 1 — pure Application Layer module, no Domain imports |
| **IP-S3-02** | F1 → Sprint 2 master-plan.usecase | sprint object shape match (`{ id, name, features, scope, tokenEst, dependsOn }`) — caller (S4-UX) inject 시 호환 보장 |
| **IP-S3-03** | F1 → Sprint 3 Infrastructure | 0 dependency — no fs/path I/O at top-level (loadContextSizingConfig uses lazy require for fs.promises) |
| **IP-S3-04** | F1 → bkit.config.json | read-only via loadContextSizingConfig — backward compat (silent fallback) |
| **IP-S3-05** | F2 index.js → F1 context-sizer | additive 5 exports — 31 → 36 total |
| **IP-S3-06** | F3 bkit.config.json → F1 loadContextSizingConfig | new `sprint.contextSizing` section, 9 fields |
| **IP-S3-07** | F1 → agents/sprint-master-planner.md (S2-UX heuristics) | Programmatic implementation of S2-UX agent body Sprint Split Heuristics section — agent now has algorithm reference (textual only, S4-UX adds integration) |
| **IP-S3-08** | F1 → S2-UX master-plan.usecase plan.sprints[] | shape compat — S4-UX or v2.1.14 can wire `contextSizer.recommendSprintSplit` output → master-plan.usecase plan.sprints |
| **IP-S3-09** | F1 → /control L4 BUDGET_EXCEEDED auto-pause | preventive — pre-flight token estimate before sprint start (S4-UX integration point) |
| **IP-S3-10** | All 3 files → docs-code-sync | Doc=Code 0 drift — 4 docs (PRD/Plan/Design/Report) + 3 code files |

---

## 9. Sprint 1-5 Invariant Preservation Matrix

| Sprint | Component | Change | Justification |
|--------|-----------|--------|--------------|
| Sprint 1 Domain | events.js / entity.js / transitions.js / validators.js / index.js | **0 LOC** | context-sizer is leaf module in Application Layer, no Domain interaction |
| Sprint 2 Application | master-plan.usecase.js / start-sprint.usecase.js / etc. | **0 LOC** | context-sizer is parallel module, no existing use case modified |
| Sprint 2 Application | sprint-lifecycle/index.js | +8 LOC additive | F2 — barrel export ext (기존 31 export 0 변경) |
| Sprint 2 Application | context-sizer.js (new) | +280 LOC (new file) | F1 — new module, parallel to master-plan.usecase |
| Sprint 3 Infrastructure | sprint-paths.js / 6 adapters | **0 LOC** | context-sizer is I/O free, no sprint-paths dependency |
| Sprint 4 Presentation | sprint-handler.js / SKILL.md / agents/sprint-master-planner.md | **0 LOC** | context-sizer is programmatic API, no UI surface |
| Sprint 5 Quality + Docs | L3 Contract / guides / sprint-memory-writer | **0 LOC** | regression PASS Phase 6 QA |
| lib/audit | audit-logger.js | **0 LOC** | pure function — no audit emit |
| bkit.config.json | sprint section | +20 LOC additive | F3 — additive 18번째 section |
| templates/sprint/ | 7 templates | **0 LOC** | context-sizer 활용 안 함 |
| hooks/hooks.json | 21:24 invariant | **0 LOC** | 신규 hook 0 |

**Sprint 1-5 invariant 종합**: **Sprint 1 = 0**, **Sprint 2 additive only (+8 export + 1 new file)**, **Sprint 3-5 unchanged**, **bkit.config.json additive only**.

---

## 10. bkit-system Philosophy 7 Invariants Preservation

| Invariant | 본 sprint 적용 | Mitigation |
|-----------|---------------|-----------|
| **Design First** | ✅ Phase 3 Design 후 Phase 4 Do | git log order |
| **No Guessing** | ✅ §1 verbatim citations + Phase 5 Iterate matchRate 100% target | gap-detector |
| **Gap < 5%** | ✅ matchRate 100% target | gap-detector |
| **State Machine** | ✅ context-sizer는 pure function — state mutation 0 | grep verification |
| **Trust Score** | ✅ context-sizer 는 trust level 영향 안 받음 | n/a |
| **Checkpoint** | ✅ context-sizer 는 file write 0 → rollback 불필요 | unit test |
| **Audit Trail** | ✅ pure function — audit emit 0 (master-plan 호출 시 master_plan_created entry 에 결합) | log verification |

---

## 11. 사용자 명시 1-8 충족 매트릭스

| # | Mandate | S3-UX 적용 |
|---|---------|-----------|
| 1 | 8개국어 trigger + @docs 예외 한국어 | ✓ context-sizer 는 backend module, user-facing skill X. SKILL.md 0 change. docs/ 한국어 |
| 2 | Sprint 유기적 상호 연동 | ✓ §8 10 IPs + IP-S3-08 sprint object shape compat |
| 3 | QA = bkit-evals + claude -p + 4-System + diverse perspective | ✓ Phase 6 QA — 7-perspective matrix (S2-UX precedent) |
| 4-1 | Master Plan 자동 생성 | ✓ S2-UX inherited (sprints:[] stub fills via context-sizer in S4-UX or caller side) |
| 4-2 | 컨텍스트 윈도우 sprint sizing | ★ **본 sub-sprint 핵심 deliverable** — recommendSprintSplit algorithm |
| 5 | ★ 꼼꼼하고 완벽하게 (빠르게 X) | ✓ PRD ~700 lines target + 10 pre-mortem + 28 AC + 10 IPs |
| 6 | ★ skills/agents YAML frontmatter + 8개국어 + @docs 외 영어 | ✓ context-sizer는 backend code — English. agents/sprint-master-planner.md 0 변경. SKILL.md 0 변경 |
| 7 | ★ Sprint별 유기적 상호 연동 동작 검증 | ✓ §8 10 IPs + sprint object shape compat verification |
| 8 | ★ /control L4 완전 자동 모드 + 꼼꼼함 | ✓ Phase 1-7 자동 진행 + context-sizer 는 stateless (sprint state 미수정) |

---

## 12. Open Questions (PM-S3A~E)

### PM-S3A: Token estimate algorithm — features 가 vague string 일 때 LOC 추정 방법

**Question**: features=['auth'] 같은 1-word feature 의 LOC 를 어떻게 추정하나? 정확도가 sprint split 신뢰도의 base.

**Candidates**:
1. **Fixed baseline**: 5000 LOC per feature (conservative mid-size) — default
2. **Codebase grep**: grep for similar feature names in existing code → LOC 추정 — accurate but slow + project-specific
3. **Domain heuristics**: 'auth'/'payment' 같은 domain keyword 매핑 (auth=8000, payment=12000) — opinionated

**Resolution**: Plan §2 — Option 1 (Fixed baseline 5000) default + Option 3 (Domain heuristics) opt-in via `domainHints` config (S4-UX 또는 v2.1.14).

### PM-S3B: Sprint id naming convention

**Question**: sprints[].id 는 어떻게 명명하나? S1-UX/S2-UX/S3-UX/S4-UX 같은 prefix? 또는 sprint-1/sprint-2?

**Resolution**: Plan §2 — `<projectId>-s<N>` 패턴 (e.g., 'q2-launch-s1', 'q2-launch-s2'). kebab-case 보존 + project namespace + numeric sequence.

### PM-S3C: tokenEst rounding

**Question**: tokenEst 계산 결과가 5000 × 6.67 = 33350 같은 비정수. round? floor? ceil?

**Resolution**: Plan §2 — Math.ceil (보수적, 안전성 우선).

### PM-S3D: dependencyGraph 입력 schema

**Question**: dependencyGraph 입력 schema 는 어떻게?

**Candidates**:
1. **adjacency list**: `{ feature: [deps] }` — concise
2. **edge list**: `[{ from, to }]` — explicit
3. **both supported**: normalize on input

**Resolution**: Plan §2 — Option 1 (adjacency list) standard, validated for cycle.

### PM-S3E: maxSprints exceeded behavior

**Question**: 50 features 에 maxSprints=12 일 때 어떻게? force-pack (어쩔 수 없이 over-budget sprints 생성) vs error?

**Resolution**: Plan §2 — error path (`{ ok: false, error: 'exceeds_maxSprints' }`) + 사용자에게 suggestedAction ("increase maxSprints in bkit.config.json or decompose project"). force-pack 은 사용자 명시 5 (꼼꼼함) 위배.

---

## 13. Out-of-Scope Confirmation (S4-UX / v2.1.14 / Sprint 6)

| 항목 | 별도 |
|------|------|
| master-plan.usecase 의 contextSizer inject 통합 | S4-UX (Integration phase) |
| agents/sprint-master-planner.md body 의 programmatic algorithm mention | S4-UX |
| L3 Contract SC-09 (master-plan invocation) + SC-10 (context-sizing contract) | S4-UX |
| commands/bkit.md ext (context-sizer 노출) | S4-UX |
| docs/06-guide/sprint-management.guide.md §9 Master Plan + Context Sizer workflow | S4-UX |
| Domain hint feature ('auth'=8000, 'payment'=12000 등) | v2.1.14 |
| Codebase grep-based LOC estimation | v2.1.14 |
| `--locHint` CLI flag in /sprint command | v2.1.14 |
| MEMORY.md `## Active Sprints` hook v2 | v2.1.14 |
| BKIT_VERSION bump | Sprint 6 |
| CHANGELOG v2.1.13 | Sprint 6 |

---

## 14. References

### 14.1 Master Plan + S1-UX + S2-UX 자료

- `docs/01-plan/features/sprint-ux-improvement.master-plan.md` (602 lines) — Master Plan v1.0
- S1-UX 4 commits (faf9eca + ...) + S2-UX 5 commits (a25d176 + dd16abb/c563634/08c313c/a679d64)
- S2-UX Report §10.2 S3-UX Scope Preview — 본 PRD 작성 base

### 14.2 코드 base 자료 (verbatim citation)

- `lib/application/sprint-lifecycle/index.js` (S2-UX 후 31 exports) — F2 patch base
- `lib/application/sprint-lifecycle/master-plan.usecase.js` (S2-UX 신규, 470 LOC) — plan.sprints[] schema reference (line 388-401)
- `agents/sprint-master-planner.md` (S2-UX 후 181 lines) — Sprint Split Heuristics section reference
- `bkit.config.json` (197 lines, 17 sections) — F3 patch base
- `templates/sprint/master-plan.template.md` (79+ lines) — 변경 0

### 14.3 ADR + 사용자 명시 reference

- ADR 0007 (Sprint as Meta Container) — context-sizer가 보존
- ADR 0008 (Sprint Phase Enum) — 8-phase 영향 0
- ADR 0009 (Auto-Run + Auto-Pause) — BUDGET_EXCEEDED trigger 예방 측면 (S4-UX integration)
- bkit-system 7 invariants

---

## 15. PRD Final Checklist (꼼꼼함 §16)

- [x] **사용자 명시 1 (8개국어)** — context-sizer backend only, SKILL.md 0 변경
- [x] **사용자 명시 2 (Sprint 유기적)** — §8 10 IPs + IP-S3-08 sprint object shape compat
- [x] **사용자 명시 3 (eval+claude -p+4-System+diverse)** — §6 Quality Gates + §7 28 AC + Phase 6 QA 매트릭스
- [x] **사용자 명시 4-1 (Master Plan 자동)** — S2-UX inherited, S4-UX integration path
- [x] **사용자 명시 4-2 (컨텍스트 윈도우 sizing)** — ★ 본 sub-sprint 핵심 deliverable
- [x] **사용자 명시 5 (꼼꼼함)** — 본 PRD ~700 lines + 10 pre-mortem + 28 AC + 5 PM-S3 questions + Out-of-scope 12 + References 5+
- [x] **사용자 명시 6 (skills/agents YAML + 영어 외 8-lang trigger)** — context-sizer English code, agents/SKILL 0 변경
- [x] **사용자 명시 7 (Sprint별 유기적 상호 연동 동작 검증)** — §8 10 IPs verification + Phase 6 QA
- [x] **사용자 명시 8 (/control L4 완전 자동)** — pure function stateless, autoRun loop 영향 0
- [x] **bkit-system 7 invariants** — §10 매트릭스
- [x] **Sprint 1 invariant 0 변경** — §9 매트릭스
- [x] **Sprint 2-4 additive only** — §9 매트릭스
- [x] **Sprint 5 regression PASS** — Phase 6 QA L3
- [x] **Doc=Code 0 drift** — IP-S3-10
- [x] **F9-120 15-cycle 목표** — AC-INV-5 + Phase 6 QA
- [x] **hooks.json 21:24 invariant** — AC-INV-6
- [x] **Pre-mortem 10** — §5 A-J
- [x] **AC 28** — §7 4 groups (AC-CS / AC-IE / AC-BC / AC-INV)
- [x] **No Guessing verbatim citations** — §1 7건
- [x] **Open questions PM-S3A~E** — §12 5건 Plan phase 에서 해결
- [x] **Out-of-scope confirmed** — §13 11항목

---

**PRD Status**: ★ **Draft v1.0 완료**.
**Next**: Phase 2 Plan 진입 — `docs/01-plan/features/s3-ux.plan.md` 작성. Requirements R1-R10 + algorithm exact spec + AC commit-ready commands.
**예상 소요**: Phase 2 Plan ~25분.
**사용자 명시 1-8 보존 확인**: 8/8.
