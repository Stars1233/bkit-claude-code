# S3-UX Plan — Sprint UX 개선 Sub-Sprint 3 (Context Sizer)

> **Sub-Sprint ID**: `s3-ux` (sprint-ux-improvement master 의 3/4)
> **Phase**: Plan (2/7) — PRD ✓ → Plan in_progress
> **PRD Ref**: `docs/01-plan/features/s3-ux.prd.md` (518 lines, commit `cd3a47a`)
> **Date**: 2026-05-12
> **Author**: kay kim (POPUP STUDIO PTE. LTD.) + bkit AI orchestration
> **Branch**: `feature/v2113-sprint-management`
> **Status**: ★ Draft v1.0 — commit-ready spec for Phase 3 Design

---

## 0. Executive Summary

### 0.1 Mission

PRD §3 Feature Map 의 3 deliverable (총 ~308 LOC) 을 단일 세션 (~30K tokens, 60-90분) 안에 commit-ready spec 으로 정리한다. PRD §12 의 5 open questions (PM-S3A~E) 를 모두 해결하고, 28 verification commands + algorithm pseudo-code 를 명시한다.

### 0.2 PM-S3A~E 5 Open Questions Resolution Summary

| ID | Question | Resolution (§2 detail) |
|----|----------|-----------------------|
| **PM-S3A** | Token estimation 알고리즘 baseline | **Fixed baseline 5000 LOC × tokensPerLOC 6.67 = 33350 tokens/feature default**, locHint override, domainHints opt-in (v2.1.14) |
| **PM-S3B** | sprint id naming | **`<projectId>-s<N>` kebab-case** (e.g., `q2-launch-s1`, `q2-launch-s2`) |
| **PM-S3C** | tokenEst rounding | **Math.ceil** (보수적, 안전성 우선) |
| **PM-S3D** | dependencyGraph 입력 schema | **Adjacency list** `{ feature: [deps] }` 표준, edge list rejected (S4-UX 또는 v2.1.14 normalize possible) |
| **PM-S3E** | maxSprints exceeded behavior | **Error path** `{ ok: false, error: 'exceeds_maxSprints', suggestedAction }` — force-pack 거부 (사용자 명시 5 꼼꼼함) |

---

## 1. Requirements (R1-R10)

### R1 — `context-sizer.js` 신규 module

**Spec**:
- Module path: `lib/application/sprint-lifecycle/context-sizer.js`
- Module type: Pure function module — no fs/path I/O at module top-level (loadContextSizingConfig uses lazy require)
- Exports: `estimateTokensForFeature`, `recommendSprintSplit`, `loadContextSizingConfig`, `topologicalSort`, `detectCycle`, `CONTEXT_SIZING_DEFAULTS`, `CONTEXT_SIZING_SCHEMA_VERSION`
- JSDoc complete (every export + @param/@returns)
- ESLint clean

**Justification**: PRD §3.1 F1, Master Plan §4.7
**LOC est.**: ~280 LOC (incl. JSDoc + 5 helper functions)

### R2 — `estimateTokensForFeature(featureName, opts)` algorithm

**Spec**:
```javascript
/**
 * @param {string} featureName - free-form feature description or id
 * @param {Object} [opts]
 * @param {number} [opts.locHint] - explicit LOC hint (overrides baselineLOC)
 * @param {number} [opts.tokensPerLOC] - default 6.67 (Master Plan §1.5 heuristic)
 * @param {number} [opts.baselineLOC] - default 5000 (mid-sized feature)
 * @returns {number} Math.ceil(loc * tokensPerLOC)
 */
function estimateTokensForFeature(featureName, opts) {
  const o = opts || {};
  const tpl = typeof o.tokensPerLOC === 'number' && o.tokensPerLOC > 0 ? o.tokensPerLOC : 6.67;
  const loc = typeof o.locHint === 'number' && o.locHint >= 0
    ? o.locHint
    : (typeof o.baselineLOC === 'number' && o.baselineLOC >= 0 ? o.baselineLOC : 5000);
  return Math.ceil(loc * tpl);
}
```

**Edge cases**:
- featureName empty string: still returns estimate based on baselineLOC (no error)
- opts undefined: uses all defaults → returns 33350
- locHint=0: returns 0 (treated as zero-LOC feature, valid for placeholder)

**Justification**: PM-S3A + PM-S3C resolution
**LOC est.**: ~20 LOC

### R3 — `topologicalSort(graph)` + `detectCycle(graph)` algorithms

**Spec — Kahn's algorithm**:
```javascript
/**
 * @param {Object<string, string[]>} graph - adjacency list { node: [deps] }
 * @returns {{ ok: boolean, order?: string[], cycle?: string[] }}
 */
function topologicalSort(graph) {
  // 1. Compute in-degrees (for each node, count edges pointing in)
  // 2. Initialize queue with all nodes that have in-degree 0
  // 3. Repeatedly:
  //    - Dequeue node N, append to result order
  //    - For each neighbor M of N, decrement in-degree(M)
  //    - If in-degree(M) === 0: enqueue M
  // 4. If result.length === graph node count: return { ok: true, order }
  //    Else: cycle exists, return { ok: false, cycle: <unprocessed nodes> }
}

function detectCycle(graph) {
  return !topologicalSort(graph).ok;
}
```

**Edge cases**:
- empty graph `{}`: returns `{ ok: true, order: [] }`
- self-loop `{ a: ['a'] }`: returns `{ ok: false, cycle: ['a'] }`
- disconnected components: all sorted in topological order (no priority)

**Justification**: PM-S3D resolution
**LOC est.**: ~40 LOC

### R4 — `recommendSprintSplit(input, opts)` algorithm

**Spec — 5-step algorithm**:

```javascript
/**
 * @param {Object} input
 * @param {string} input.projectId - kebab-case
 * @param {string[]} input.features
 * @param {Object<string, string[]>} [input.dependencyGraph] - { feature: [deps] }
 * @param {Object<string, number>} [input.locHints] - { feature: locHint } per-feature overrides
 *
 * @param {Object} [opts] - merged config from loadContextSizingConfig
 *
 * @returns {{
 *   ok: boolean,
 *   sprints?: Array<{ id, name, features, scope, tokenEst, dependsOn }>,
 *   dependencyGraph?: Object,
 *   totalTokenEst?: number,
 *   warning?: string,
 *   error?: string,
 *   suggestedAction?: string,
 *   cycle?: string[]
 * }}
 */
function recommendSprintSplit(input, opts) {
  // Step 1: validate input
  // Step 2: estimate tokens per feature → array of { feature, tokenEst }
  // Step 3: if dependencyGraph provided AND dependencyAware === true:
  //         topological sort, return error on cycle
  //         else: features in input order
  // Step 4: greedy bin-packing — accumulate features into current sprint until
  //         sprint.tokenEst + next.tokenEst > effectiveBudget; then start new sprint
  //         Single-feature spillover: if next.tokenEst > maxTokensPerSprint, own sprint + warning
  // Step 5: assign sprint dependencies based on dependencyGraph cross-sprint edges
  //         Return { ok: true, sprints, dependencyGraph, totalTokenEst, warning? }
}
```

**Sprint object shape (matches S2-UX plan.sprints[] schema)**:
```json
{
  "id": "q2-launch-s1",
  "name": "Sprint 1 of q2-launch",
  "features": ["auth", "user-mgmt"],
  "scope": "Auth foundation + user management",
  "tokenEst": 66700,
  "dependsOn": []
}
```

**Algorithm details**:
- `effectiveBudget = maxTokensPerSprint * (1 - safetyMargin)` (default 100000 × 0.75 = 75000)
- Sprint id: `<projectId>-s<N>` (PM-S3B resolution, 1-indexed N)
- Sprint name: `"Sprint N of <projectId>"` (default, no LLM-generated content in S3-UX)
- Sprint scope: features.join(', ') (basic, full description S4-UX agent-backed)
- dependsOn: cross-sprint dep edges (if feature in sprint K depends on feature in sprint K-J, sprint K dependsOn includes K-J's id)
- maxSprints cap: if computed split exceeds maxSprints → return error (PM-S3E)

**Edge cases**:
- features=[] → `{ ok: true, sprints: [], totalTokenEst: 0 }`
- features=['a','b','c'] (3 × 33350 = 100050 > 75K) → likely 2 sprints (33350 + 33350 = 66700 ≤ 75K + spillover)
  - 정정: 33350 + 33350 = 66700 ≤ 75000 OK, +33350 = 100050 > 75000 → spillover to sprint 2
  - 결과: sprint 1 = [a, b] tokenEst=66700, sprint 2 = [c] tokenEst=33350
- features=['big-feat'] with locHint=20000 (→ 133400) > maxTokensPerSprint 100000 → spillover warning

**Justification**: PRD §JS-01~05 + PM-S3A~E resolution
**LOC est.**: ~120 LOC

### R5 — `loadContextSizingConfig(opts)` algorithm

**Spec**:
```javascript
/**
 * @param {Object} [opts]
 * @param {string} [opts.projectRoot] - default process.cwd()
 * @param {Function} [opts.fileReader] - default fs.promises.readFile (test injection)
 * @returns {Promise<Object>} merged config { maxTokensPerSprint, safetyMargin, ... }
 */
async function loadContextSizingConfig(opts) {
  const o = opts || {};
  const projectRoot = o.projectRoot || process.cwd();
  const fileReader = o.fileReader || require('node:fs').promises.readFile;
  const configPath = require('node:path').join(projectRoot, 'bkit.config.json');
  try {
    const content = await fileReader(configPath, 'utf8');
    const config = JSON.parse(content);
    const sizing = config && config.sprint && config.sprint.contextSizing;
    if (!sizing || typeof sizing !== 'object') return Object.assign({}, CONTEXT_SIZING_DEFAULTS);
    return Object.assign({}, CONTEXT_SIZING_DEFAULTS, sizing);
  } catch (e) {
    // Missing file, malformed JSON, etc. → defaults
    return Object.assign({}, CONTEXT_SIZING_DEFAULTS);
  }
}
```

**Edge cases**:
- bkit.config.json missing → defaults (silent fallback, PRD §JS-05)
- malformed JSON → defaults (silent fallback, no throw)
- `sprint.contextSizing` field missing → defaults
- partial fields → merge with defaults (partial override OK)

**Justification**: PRD §JS-05 backward compat
**LOC est.**: ~25 LOC

### R6 — `CONTEXT_SIZING_DEFAULTS` constant

**Spec**:
```javascript
const CONTEXT_SIZING_DEFAULTS = Object.freeze({
  enabled: true,
  schemaVersion: '1.0',
  maxTokensPerSprint: 100000,
  safetyMargin: 0.25,
  tokensPerLOC: 6.67,
  baselineLOC: 5000,
  minSprints: 1,
  maxSprints: 12,
  dependencyAware: true,
});

const CONTEXT_SIZING_SCHEMA_VERSION = '1.0';
```

**Justification**: PRD §3.3 F3 default schema match
**LOC est.**: ~12 LOC

### R7 — `lib/application/sprint-lifecycle/index.js` additive export

**Spec — exact patches** (S2-UX `a679d64` 후 base):

Hunk 1 (after line 39 `const masterPlanMod = require('./master-plan.usecase');`):
```javascript
const contextSizerMod = require('./context-sizer');
```

Hunk 2 (JSDoc Sprint 2 sub-list, after `master-plan.usecase.js      — generateMasterPlan`):
```javascript
 *     context-sizer.js            — recommendSprintSplit (S3-UX, v2.1.13)
```

Hunk 3 (after `MASTER_PLAN_SCHEMA_VERSION: masterPlanMod.MASTER_PLAN_SCHEMA_VERSION,` block):
```javascript

  // Sprint 2 — Context Sizer (S3-UX, v2.1.13)
  estimateTokensForFeature: contextSizerMod.estimateTokensForFeature,
  recommendSprintSplit: contextSizerMod.recommendSprintSplit,
  loadContextSizingConfig: contextSizerMod.loadContextSizingConfig,
  CONTEXT_SIZING_DEFAULTS: contextSizerMod.CONTEXT_SIZING_DEFAULTS,
  CONTEXT_SIZING_SCHEMA_VERSION: contextSizerMod.CONTEXT_SIZING_SCHEMA_VERSION,
```

**Existing 31 exports preserved**. After patch: 36 exports.

**Justification**: PRD §3.2 F2 additive only + PRD §1.7 verbatim base
**LOC est.**: +8 lines

### R8 — `bkit.config.json` sprint section additive

**Spec — exact patch**:

Insert after line 76 `pdca` section closing `},`:
```json
  "sprint": {
    "contextSizing": {
      "enabled": true,
      "schemaVersion": "1.0",
      "maxTokensPerSprint": 100000,
      "safetyMargin": 0.25,
      "tokensPerLOC": 6.67,
      "baselineLOC": 5000,
      "minSprints": 1,
      "maxSprints": 12,
      "dependencyAware": true
    }
  },
```

**Existing 17 sections (root level keys): ui/control/pdca/triggers/pipeline/multiFeature/featurePatterns/fileDetection/cache/performance/permissions/automation/guardrails/quality/team unchanged**.

**JSON validity**: `node -e "JSON.parse(require('fs').readFileSync('bkit.config.json'))"` exit 0 after patch.

**Justification**: PRD §3.3 F3 + PM-S3 5 resolutions all encoded in defaults
**LOC est.**: +14 lines (incl. nesting indentation)

### R9 — Sprint 1 invariant 0 LOC delta (★ inherited from S2-UX)

**Spec**:
- `git diff a25d176..HEAD -- lib/domain/sprint/` (whole dir) must be empty
- `git diff a25d176..HEAD -- lib/application/sprint-lifecycle/master-plan.usecase.js` must be empty (S2-UX contract preserved)
- `git diff a25d176..HEAD -- agents/sprint-master-planner.md` must be empty (frontmatter + body 0 change)
- `git diff a25d176..HEAD -- scripts/sprint-handler.js` must be empty (UI surface 0 change)
- `git diff a25d176..HEAD -- skills/sprint/SKILL.md` must be empty (UI surface 0 change)

**Justification**: PRD §9 invariant + S2-UX precedent inherited
**LOC est.**: 0

### R10 — F9-120 15-cycle target

**Spec**:
- `claude plugin validate .` Exit 0 after Phase 4 Do commit
- F9-120 cumulative: 14 → 15 cycle (v2.1.120/121/123/129/132/133/137/139 + S2-UX + S3-UX)

**Justification**: PRD §AC-INV-5
**LOC est.**: 0 (verification only)

---

## 2. Algorithm Specifications (PM-S3A~E Resolutions Detailed)

### 2.1 PM-S3A Resolution — Token Estimation Algorithm

**Default formula**: `tokens = ceil(LOC × tokensPerLOC)` where LOC = locHint || baselineLOC (5000), tokensPerLOC = 6.67.

**Justification**: Master Plan §1.5 heuristic "~1.5K LOC per 10K tokens" → tokensPerLOC = 10000 / 1500 = 6.67.

**Domain hint extension (v2.1.14)**: future `domainHints` config could map keywords (e.g., `{ auth: 8000, payment: 12000, reports: 6000 }`), but S3-UX uses uniform baseline.

### 2.2 PM-S3B Resolution — Sprint ID Naming

**Pattern**: `<projectId>-s<N>` where N is 1-indexed.

**Examples**:
- projectId='q2-launch', features split into 3 sprints → ids: 'q2-launch-s1', 'q2-launch-s2', 'q2-launch-s3'
- projectId='single-feat-proj', 1 sprint → id: 'single-feat-proj-s1'

**Validation**: each generated id matches `KEBAB_CASE_RE` (S2-UX precedent). projectId must be valid kebab-case (caller's responsibility — `recommendSprintSplit` does not re-validate).

### 2.3 PM-S3C Resolution — tokenEst Rounding

**Function**: `Math.ceil(loc * tokensPerLOC)`.

**Justification**: 보수적 estimate — overestimate by ≤1 token per feature 안전성 우선. Math.floor 또는 Math.round 는 underestimate risk.

**Example**: 5000 × 6.67 = 33350 (exact), 3000 × 6.67 = 20010 (exact), 3333 × 6.67 = 22231.11 → ceil = 22232.

### 2.4 PM-S3D Resolution — dependencyGraph Schema

**Standard**: Adjacency list `{ [feature: string]: string[] }` where value array is list of features the key depends on.

**Examples**:
```javascript
// payment depends on auth
{ payment: ['auth'] }

// reports depends on auth and payment
{ payment: ['auth'], reports: ['auth', 'payment'] }

// auth has no deps (omit or empty array, both valid)
{ auth: [], payment: ['auth'] }
```

**Validation**:
- All values arrays of strings
- All referenced features must exist in input.features (caller's responsibility — recommender will detect orphan refs and return error: `'unknown_feature_in_graph'`)
- self-loops detected as cycles (`{ a: ['a'] } → ok: false, cycle: ['a']`)

**Rejected alternatives**:
- Edge list `[{ from, to }]`: verbose
- Both supported: increases complexity without benefit

### 2.5 PM-S3E Resolution — maxSprints Exceeded

**Behavior**: Return error path, no force-pack.

```javascript
if (computedSprintCount > config.maxSprints) {
  return {
    ok: false,
    error: 'exceeds_maxSprints',
    computedSprintCount,
    maxSprints: config.maxSprints,
    suggestedAction: `Increase bkit.config.json sprint.contextSizing.maxSprints (current: ${config.maxSprints}) or decompose features into fewer, larger items.`,
  };
}
```

**Justification**: 사용자 명시 5 (꼼꼼함) — silent over-budget split worse than explicit error.

---

## 3. Inter-Sprint Integration — 10 IPs Implementation

| IP# | From → To | Implementation step | Verification command |
|-----|-----------|---------------------|---------------------|
| IP-S3-01 | F1 → Sprint 1 Domain | 0 import from lib/domain/sprint/ | `grep -c "require.*domain/sprint" lib/application/sprint-lifecycle/context-sizer.js` = 0 |
| IP-S3-02 | F1 → Sprint 2 master-plan.usecase | sprint object shape match | manual review against S2-UX plan.sprints[] schema |
| IP-S3-03 | F1 → Sprint 3 Infrastructure | 0 fs/path imports at top-level | `grep -E "^const.*require\\(.*fs|^const.*require\\(.*path\\)" lib/application/sprint-lifecycle/context-sizer.js` head-only check (lazy require OK) |
| IP-S3-04 | F1 → bkit.config.json | read-only via lazy require | `grep "fs.promises.readFile\|require.*node:fs" lib/application/sprint-lifecycle/context-sizer.js` ≥ 1 (inside loadContextSizingConfig) |
| IP-S3-05 | F2 → F1 | additive 5 exports (31 → 36) | `node -e "console.log(Object.keys(require('./lib/application/sprint-lifecycle')).length)"` = 36 |
| IP-S3-06 | F3 → F1 loadContextSizingConfig | 9 fields in sprint.contextSizing | `node -e "const c=require('./bkit.config.json'); console.log(Object.keys(c.sprint.contextSizing).length)"` = 9 |
| IP-S3-07 | F1 → agents/sprint-master-planner.md | textual heuristic now has programmatic counterpart (agent body unchanged in S3-UX, S4-UX adds reference) | inspection — no diff to agent in S3-UX |
| IP-S3-08 | F1 → S2-UX master-plan.usecase plan.sprints | shape compat verified | manual review |
| IP-S3-09 | F1 → /control L4 BUDGET_EXCEEDED | preventive recommendation (no runtime hook in S3-UX, S4-UX integration) | manual review |
| IP-S3-10 | All 3 files → docs-code-sync | Doc=Code 4 docs + 3 code files | (S4-UX scripts/docs-code-sync.js verification) |

---

## 4. Acceptance Criteria — Commit-Ready Verification Commands

### 4.1 AC-CS (12 criteria, F1 context-sizer)

| AC# | Command | Pass criterion |
|-----|---------|---------------|
| AC-CS-1 | `node -e "console.log(require('./lib/application/sprint-lifecycle').estimateTokensForFeature('auth'))"` | "33350" |
| AC-CS-2 | `node -e "console.log(require('./lib/application/sprint-lifecycle').estimateTokensForFeature('auth', { locHint: 2000 }))"` | "13340" |
| AC-CS-3 | `node -e "console.log(require('./lib/application/sprint-lifecycle').estimateTokensForFeature('auth', { tokensPerLOC: 10 }))"` | "50000" |
| AC-CS-4 | `node -e "const m=require('./lib/application/sprint-lifecycle'); m.recommendSprintSplit({ projectId: 'p1', features: [] }, m.CONTEXT_SIZING_DEFAULTS).then ? (r=>r.then(x=>console.log(x.ok, x.sprints.length))) : (r=>console.log(r.ok, r.sprints.length))(m.recommendSprintSplit({ projectId: 'p1', features: [] }, m.CONTEXT_SIZING_DEFAULTS))"` | "true 0" |
| AC-CS-5 | `node -e "const m=require('./lib/application/sprint-lifecycle'); const r=m.recommendSprintSplit({ projectId: 'p1', features: ['a','b','c'] }, m.CONTEXT_SIZING_DEFAULTS); console.log(r.sprints.length <= 2)"` | "true" (3 × 33350 = 100050 with 75K budget → 2 sprints) |
| AC-CS-6 | `node -e "const m=require('./lib/application/sprint-lifecycle'); const r=m.recommendSprintSplit({ projectId: 'p1', features: ['a','b','c','d','e','f'] }, m.CONTEXT_SIZING_DEFAULTS); console.log(r.sprints.length >= 2)"` | "true" |
| AC-CS-7 | dependency-aware split — see test script | topological order in returned sprints[].features ordering |
| AC-CS-8 | `node -e "const m=require('./lib/application/sprint-lifecycle'); console.log(m.recommendSprintSplit({ projectId: 'p1', features: ['a','b'], dependencyGraph: { a: ['b'], b: ['a'] } }, m.CONTEXT_SIZING_DEFAULTS).ok)"` | "false" (cycle) |
| AC-CS-9 | single-feature spillover with locHint=20000 | `r.sprints.length === 1 && r.warning` non-empty |
| AC-CS-10 | maxSprints cap with 50 dummy features | `r.ok === false && r.error === 'exceeds_maxSprints'` |
| AC-CS-11 | sprint object shape | all required keys: id, name, features, scope, tokenEst, dependsOn |
| AC-CS-12 | loadContextSizingConfig fallback | bkit.config.json without sprint section returns CONTEXT_SIZING_DEFAULTS exact |

### 4.2 AC-IE (4 criteria, F2 index.js)

| AC# | Command | Pass criterion |
|-----|---------|---------------|
| AC-IE-1 | `node -e "console.log(Object.keys(require('./lib/application/sprint-lifecycle')).length)"` | "36" |
| AC-IE-2 | `node -e "console.log(typeof require('./lib/application/sprint-lifecycle').recommendSprintSplit)"` | "function" |
| AC-IE-3 | `node -e "console.log(typeof require('./lib/application/sprint-lifecycle').estimateTokensForFeature)"` | "function" |
| AC-IE-4 | `node -e "console.log(require('./lib/application/sprint-lifecycle').CONTEXT_SIZING_SCHEMA_VERSION)"` | "1.0" |

### 4.3 AC-BC (5 criteria, F3 bkit.config.json)

| AC# | Command | Pass criterion |
|-----|---------|---------------|
| AC-BC-1 | `node -e "JSON.parse(require('fs').readFileSync('bkit.config.json'))" && echo OK` | "OK" |
| AC-BC-2 | `node -e "const c=require('./bkit.config.json'); console.log(c.sprint && c.sprint.contextSizing ? 'OK' : 'MISSING')"` | "OK" |
| AC-BC-3 | `node -e "const c=require('./bkit.config.json'); console.log(Object.keys(c.sprint.contextSizing).length)"` | "9" |
| AC-BC-4 | root keys count check | "16" (15 sections + version, before S3-UX 15, after +1 sprint = 16) — see precise check |
| AC-BC-5 | `node -e "(async()=>{const m=require('./lib/application/sprint-lifecycle'); const c=await m.loadContextSizingConfig({ projectRoot: process.cwd() }); console.log(c.maxTokensPerSprint)})()"` | "100000" |

### 4.4 AC-INV (7 criteria, invariants)

| AC# | Command | Pass criterion |
|-----|---------|---------------|
| AC-INV-1 | `git diff a25d176..HEAD -- lib/domain/sprint/` | empty |
| AC-INV-2 | `git diff a25d176..HEAD -- lib/application/sprint-lifecycle/master-plan.usecase.js` | empty |
| AC-INV-3 | `git diff a25d176..HEAD -- agents/sprint-master-planner.md` | empty |
| AC-INV-4 | `git diff a25d176..HEAD -- skills/sprint/SKILL.md` | empty |
| AC-INV-5 | `claude plugin validate .` | Exit 0 (F9-120 15-cycle) |
| AC-INV-6 | `node -e "const h=require('./hooks/hooks.json'); console.log(Object.keys(h.hooks).length, Object.values(h.hooks).flat().length)"` | "21 24" |
| AC-INV-7 | L3 Contract test | SC-01/02/03/05/07/08 PASS (6/8, SC-04/06 inherited mismatch) |

**Cumulative AC**: **28 criteria** — Master Plan §11.2 partial coverage.

---

## 5. Implementation Order (Phase 4 Do — sequential)

### Step 1: F3 bkit.config.json sprint section additive
- 1 patch: insert sprint section after pdca section
- Verify: `node -e "JSON.parse(require('fs').readFileSync('bkit.config.json'))"` exit 0 + sprint.contextSizing exists

### Step 2: F1 context-sizer.js (new file, core implementation)
- Full module ~280 LOC
- Verify: `node -e "const m=require('./lib/application/sprint-lifecycle/context-sizer'); console.log(m.CONTEXT_SIZING_SCHEMA_VERSION, typeof m.recommendSprintSplit, typeof m.estimateTokensForFeature)"` → "1.0 function function"

### Step 3: F2 index.js additive export
- 3 hunks: require + JSDoc + 5 exports + comment
- Verify: 36 exports total

### Step 4: AC verification batch
- AC-CS-1~12 (12 tests)
- AC-IE-1~4 (4 tests)
- AC-BC-1~5 (5 tests)

### Step 5: AC-INV invariant verification
- Sprint 1 Domain 0 LOC delta
- master-plan.usecase 0 LOC delta
- agents/sprint-master-planner.md 0 LOC delta
- SKILL.md 0 LOC delta
- hooks.json 21:24

### Step 6: F9-120 15-cycle validate
- `claude plugin validate .` Exit 0

### Step 7: Single Phase 4 Do commit
- 3 files in single commit

---

## 6. Token Budget Estimate

| Phase | PRD est. | Actual target |
|-------|----------|--------------|
| PRD (Phase 1) | ~30K | 518 lines ≈ 15K (already commit `cd3a47a`) |
| Plan (Phase 2) | ~25K | this doc ~700 lines ≈ 21K |
| Design (Phase 3) | ~30K | ~900 lines ≈ 27K |
| Do (Phase 4) | ~30K | 3 files ~322 LOC + verification runs ≈ 25K |
| Iterate (Phase 5) | ~5K | matchRate 100% target ≈ 2K |
| QA (Phase 6) | ~15K | 7-perspective + 28 AC ≈ 12K |
| Report (Phase 7) | ~20K | ~500 lines ≈ 15K |

**Cumulative S3-UX**: ~117K tokens across phases. Master Plan §5.1 estimate `~30K` is incremental implementation only.

---

## 7. Plan Final Checklist

- [x] **R1-R10 10 requirements** — §1 매트릭스
- [x] **PM-S3A~E 5 resolutions** — §2 매트릭스 (token est + sprint id + rounding + dep graph + maxSprints)
- [x] **10 IPs implementation plan** — §3 매트릭스 (verification commands)
- [x] **28 AC + verification commands** — §4 매트릭스
- [x] **Implementation order 7 steps** — §5 sequential
- [x] **Token budget reconciled** — §6
- [x] **사용자 명시 1-8** — context-sizer backend, English code, additive only, /control L4 stateless
- [x] **Sprint 1 invariant 0 변경** — R9 explicit
- [x] **F9-120 15-cycle** — R10 + AC-INV-5
- [x] **PM-S3A~E all resolved** — §2

---

**Plan Status**: ★ **Draft v1.0 완료**.
**Next**: Phase 3 Design 진입 — `docs/02-design/features/s3-ux.design.md` 작성. 3 files 의 exact patches + algorithm pseudo-code + L1-L5 test matrix.
**예상 소요**: Phase 3 Design ~30분.
**PM-S3A~E all resolved**: 5/5 (§2 detailed).
**All AC commit-ready**: 28/28.
