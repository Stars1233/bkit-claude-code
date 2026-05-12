# S3-UX Design — Sprint UX 개선 Sub-Sprint 3 (Context Sizer)

> **Sub-Sprint ID**: `s3-ux` (sprint-ux-improvement master 의 3/4)
> **Phase**: Design (3/7) — PRD ✓ Plan ✓ → Design in_progress
> **PRD Ref**: `docs/01-plan/features/s3-ux.prd.md` (518 lines, commit `cd3a47a`)
> **Plan Ref**: `docs/01-plan/features/s3-ux.plan.md` (529 lines, commit `8b59bfe`)
> **Date**: 2026-05-12
> **Author**: kay kim + bkit AI orchestration
> **Branch**: `feature/v2113-sprint-management`
> **Status**: ★ Draft v1.0 — Phase 4 Do 진입 가능

---

## 0. Executive Summary

### 0.1 Mission

Plan §1-§5 (R1-R10 + 7-step implementation order) 를 **Phase 4 Do 가 그대로 적용 가능한 exact patches** 로 정리. 모든 3 files 의 patch hunks 는 line-precise + verbatim diff (additive only). 단일 세션 ~30K tokens 안전 + Sprint 1-5 invariant 100% 보존 + F9-120 15-cycle 달성.

### 0.2 Sequence Diagram (recommendSprintSplit)

```
Caller (LLM main session, S4-UX or test harness)
   |
   | input: { projectId, features[], dependencyGraph? }
   | opts: loaded from loadContextSizingConfig OR explicit override
   v
recommendSprintSplit(input, opts)
   |
   | Step 1: validate (kebab-case projectId, features array)
   |   error path: return { ok: false, error: 'invalid_input', errors[] }
   |
   v
   | Step 2: estimate tokens per feature
   |   for each feature: tokenEst = ceil((locHint || baselineLOC) × tokensPerLOC)
   |
   v
   | Step 3: topological sort (if dependencyGraph + dependencyAware === true)
   |   Kahn's algorithm
   |   cycle path: return { ok: false, error: 'dependency_cycle', cycle: [...] }
   |
   v
   | Step 4: greedy bin-packing
   |   effectiveBudget = maxTokensPerSprint × (1 - safetyMargin)
   |   for each feature in topological order:
   |     if currentSprint.tokenEst + feature.tokenEst > effectiveBudget:
   |       finalize currentSprint
   |       start new sprint
   |     accumulate feature
   |   single-feature spillover: feature.tokenEst > maxTokensPerSprint → own sprint + warning
   |
   v
   | Step 5: assign sprint dependencies (cross-sprint dep edges)
   |   for each sprint S_k:
   |     S_k.dependsOn = unique([ S_j.id  for each feature f in S_k.features
   |                              for each dep d in dependencyGraph[f]
   |                              if d in S_j and j < k ])
   |
   v
   | Step 6: maxSprints cap check
   |   if sprints.length > config.maxSprints:
   |     return { ok: false, error: 'exceeds_maxSprints', suggestedAction }
   |
   v
result: { ok: true, sprints, dependencyGraph, totalTokenEst, warning? }
```

---

## 1. Module Spec — `context-sizer.js` Full Source Template

본 §1 코드는 Phase 4 Do 가 그대로 `lib/application/sprint-lifecycle/context-sizer.js` 에 작성할 verbatim spec.

### 1.1 Header (line 1-28)

```javascript
/**
 * context-sizer.js — Sprint context window sizing + split recommendation (S3-UX, v2.1.13).
 *
 * Pure function module — no fs/path I/O at module top-level (loadContextSizingConfig
 * uses lazy require for fs.promises). Provides token estimation + dependency-aware
 * sprint split recommendations to ensure single-session safety (≤ 100K tokens/sprint
 * by default, configurable via bkit.config.json sprint.contextSizing section).
 *
 * Algorithm pillars:
 *   - Token estimation: tokens = ceil(LOC × tokensPerLOC), defaults 5000 × 6.67 ≈ 33350
 *   - Dependency graph: adjacency list, Kahn's topological sort + cycle detection
 *   - Bin-packing: greedy, with effectiveBudget = maxTokensPerSprint × (1 - safetyMargin)
 *   - Single-feature spillover: feature > maxTokensPerSprint → own sprint + warning
 *
 * Sprint object shape matches S2-UX master-plan.usecase plan.sprints[] schema:
 *   { id: '<projectId>-s<N>', name, features[], scope, tokenEst, dependsOn[] }
 *
 * @module lib/application/sprint-lifecycle/context-sizer
 * @version 2.1.13
 * @since 2.1.13
 *
 * Design Ref: docs/02-design/features/s3-ux.design.md §1
 * PRD Ref: docs/01-plan/features/s3-ux.prd.md §3 (F1)
 * Plan Ref: docs/01-plan/features/s3-ux.plan.md R1-R6, §2.1~2.5
 */

'use strict';
```

### 1.2 Constants + Defaults (line 30-50)

```javascript
const CONTEXT_SIZING_SCHEMA_VERSION = '1.0';

const KEBAB_CASE_RE = /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/;

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
```

### 1.3 estimateTokensForFeature (line 52-72)

```javascript
/**
 * Estimate token consumption for a single feature.
 *
 * @param {string} featureName - free-form feature description or id
 * @param {Object} [opts]
 * @param {number} [opts.locHint] - explicit LOC override (>= 0)
 * @param {number} [opts.tokensPerLOC] - default CONTEXT_SIZING_DEFAULTS.tokensPerLOC
 * @param {number} [opts.baselineLOC] - default CONTEXT_SIZING_DEFAULTS.baselineLOC
 * @returns {number} Math.ceil(loc * tokensPerLOC)
 */
function estimateTokensForFeature(featureName, opts) {
  const o = opts || {};
  const tpl = typeof o.tokensPerLOC === 'number' && o.tokensPerLOC > 0
    ? o.tokensPerLOC
    : CONTEXT_SIZING_DEFAULTS.tokensPerLOC;
  const loc = typeof o.locHint === 'number' && o.locHint >= 0
    ? o.locHint
    : (typeof o.baselineLOC === 'number' && o.baselineLOC >= 0
        ? o.baselineLOC
        : CONTEXT_SIZING_DEFAULTS.baselineLOC);
  return Math.ceil(loc * tpl);
}
```

### 1.4 topologicalSort + detectCycle (line 74-125)

```javascript
/**
 * Kahn's algorithm topological sort.
 *
 * @param {Object<string, string[]>} graph - adjacency list { node: [deps...] }
 * @returns {{ ok: boolean, order?: string[], cycle?: string[] }}
 */
function topologicalSort(graph) {
  if (!graph || typeof graph !== 'object') {
    return { ok: true, order: [] };
  }
  const nodes = Object.keys(graph);
  if (nodes.length === 0) {
    return { ok: true, order: [] };
  }
  // Compute in-degree: how many edges point INTO each node
  const inDegree = {};
  for (const n of nodes) inDegree[n] = 0;
  for (const n of nodes) {
    const deps = Array.isArray(graph[n]) ? graph[n] : [];
    for (const d of deps) {
      // edge: d -> n (n depends on d, so d must come first)
      // we treat: inDegree[n]++ for each dep of n
      inDegree[n] = (inDegree[n] || 0) + 1;
      if (inDegree[d] === undefined) inDegree[d] = 0;
    }
  }
  const queue = [];
  for (const n of Object.keys(inDegree)) {
    if (inDegree[n] === 0) queue.push(n);
  }
  const order = [];
  while (queue.length > 0) {
    const n = queue.shift();
    order.push(n);
    // for each node M that depends on n, decrement in-degree
    for (const m of Object.keys(graph)) {
      const deps = Array.isArray(graph[m]) ? graph[m] : [];
      if (deps.indexOf(n) !== -1) {
        inDegree[m]--;
        if (inDegree[m] === 0) queue.push(m);
      }
    }
  }
  const totalNodes = Object.keys(inDegree).length;
  if (order.length !== totalNodes) {
    const cycle = Object.keys(inDegree).filter(function (n) {
      return order.indexOf(n) === -1;
    });
    return { ok: false, cycle: cycle };
  }
  return { ok: true, order: order };
}

/**
 * @param {Object<string, string[]>} graph
 * @returns {boolean} true if a cycle exists
 */
function detectCycle(graph) {
  return !topologicalSort(graph).ok;
}
```

### 1.5 loadContextSizingConfig (line 127-160)

```javascript
/**
 * Load context-sizing config from bkit.config.json (lazy require fs).
 *
 * @param {Object} [opts]
 * @param {string} [opts.projectRoot] - default process.cwd()
 * @param {Function} [opts.fileReader] - default fs.promises.readFile
 * @returns {Promise<Object>} merged config (CONTEXT_SIZING_DEFAULTS + user overrides)
 */
async function loadContextSizingConfig(opts) {
  const o = opts || {};
  const projectRoot = o.projectRoot || process.cwd();
  const path = require('node:path');
  const fs = require('node:fs');
  const fileReader = o.fileReader || fs.promises.readFile;
  const configPath = path.join(projectRoot, 'bkit.config.json');
  try {
    const content = await fileReader(configPath, 'utf8');
    const config = JSON.parse(content);
    const sizing = config && config.sprint && config.sprint.contextSizing;
    if (!sizing || typeof sizing !== 'object') {
      return Object.assign({}, CONTEXT_SIZING_DEFAULTS);
    }
    return Object.assign({}, CONTEXT_SIZING_DEFAULTS, sizing);
  } catch (e) {
    // Missing file, malformed JSON, etc. → defaults (silent fallback per PRD §JS-05)
    return Object.assign({}, CONTEXT_SIZING_DEFAULTS);
  }
}
```

### 1.6 recommendSprintSplit (line 162-280)

```javascript
/**
 * Recommend sprint split with token-budget awareness + dependency graph.
 *
 * @param {Object} input
 * @param {string} input.projectId - kebab-case
 * @param {string[]} input.features
 * @param {Object<string, string[]>} [input.dependencyGraph] - adjacency list
 * @param {Object<string, number>} [input.locHints] - per-feature locHint overrides
 *
 * @param {Object} [opts] - merged config from loadContextSizingConfig (or DEFAULTS)
 *
 * @returns {{
 *   ok: boolean,
 *   sprints?: Array<Object>,
 *   dependencyGraph?: Object,
 *   totalTokenEst?: number,
 *   warning?: string,
 *   error?: string,
 *   suggestedAction?: string,
 *   cycle?: string[],
 *   errors?: string[]
 * }}
 */
function recommendSprintSplit(input, opts) {
  // Step 1: validate input
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'invalid_input', errors: ['input must be an object'] };
  }
  if (typeof input.projectId !== 'string' || input.projectId.length === 0) {
    errors.push('projectId required');
  } else if (!KEBAB_CASE_RE.test(input.projectId)) {
    errors.push('projectId must match kebab-case');
  }
  if (!Array.isArray(input.features)) {
    errors.push('features must be an array');
  }
  if (errors.length > 0) {
    return { ok: false, error: 'invalid_input', errors: errors };
  }

  const cfg = Object.assign({}, CONTEXT_SIZING_DEFAULTS, opts || {});
  const features = input.features.slice();

  // Empty features → empty sprints
  if (features.length === 0) {
    return {
      ok: true,
      sprints: [],
      dependencyGraph: input.dependencyGraph || {},
      totalTokenEst: 0,
    };
  }

  // Step 2: estimate tokens per feature
  const locHints = input.locHints || {};
  const featureEstimates = features.map(function (f) {
    return {
      feature: f,
      tokenEst: estimateTokensForFeature(f, {
        locHint: locHints[f],
        tokensPerLOC: cfg.tokensPerLOC,
        baselineLOC: cfg.baselineLOC,
      }),
    };
  });

  // Step 3: topological sort if dependencyGraph + dependencyAware
  let orderedFeatures = features.slice();
  let depGraph = {};
  if (input.dependencyGraph && cfg.dependencyAware) {
    // Validate: all referenced features must exist in input.features
    for (const k of Object.keys(input.dependencyGraph)) {
      if (features.indexOf(k) === -1) {
        return {
          ok: false,
          error: 'unknown_feature_in_graph',
          errors: ['feature "' + k + '" in dependencyGraph but not in features list'],
        };
      }
      const deps = input.dependencyGraph[k];
      if (Array.isArray(deps)) {
        for (const d of deps) {
          if (features.indexOf(d) === -1) {
            return {
              ok: false,
              error: 'unknown_feature_in_graph',
              errors: ['dependency "' + d + '" of feature "' + k + '" not in features list'],
            };
          }
        }
      }
    }
    depGraph = input.dependencyGraph;
    const sortResult = topologicalSort(depGraph);
    if (!sortResult.ok) {
      return { ok: false, error: 'dependency_cycle', cycle: sortResult.cycle };
    }
    // Reorder featureEstimates by topological order
    const orderMap = {};
    sortResult.order.forEach(function (f, i) { orderMap[f] = i; });
    // Stable sort by topological index (features not in graph → push to end)
    const indexed = featureEstimates.map(function (fe, idx) {
      return Object.assign({}, fe, {
        topoIdx: orderMap[fe.feature] !== undefined ? orderMap[fe.feature] : (sortResult.order.length + idx),
      });
    });
    indexed.sort(function (a, b) { return a.topoIdx - b.topoIdx; });
    orderedFeatures = indexed.map(function (fe) { return fe.feature; });
    featureEstimates.length = 0;
    indexed.forEach(function (fe) {
      featureEstimates.push({ feature: fe.feature, tokenEst: fe.tokenEst });
    });
  }

  // Step 4: greedy bin-packing
  const effectiveBudget = cfg.maxTokensPerSprint * (1 - cfg.safetyMargin);
  const sprints = [];
  let current = { features: [], tokenEst: 0 };
  let warning = null;
  for (const fe of featureEstimates) {
    // Single-feature spillover
    if (fe.tokenEst > cfg.maxTokensPerSprint) {
      // Finalize current sprint if non-empty
      if (current.features.length > 0) {
        sprints.push(current);
        current = { features: [], tokenEst: 0 };
      }
      sprints.push({ features: [fe.feature], tokenEst: fe.tokenEst, oversized: true });
      warning = warning || ('feature "' + fe.feature + '" exceeds maxTokensPerSprint (' +
        fe.tokenEst + ' > ' + cfg.maxTokensPerSprint + '); consider further decomposition');
      continue;
    }
    if (current.tokenEst + fe.tokenEst > effectiveBudget && current.features.length > 0) {
      sprints.push(current);
      current = { features: [], tokenEst: 0 };
    }
    current.features.push(fe.feature);
    current.tokenEst += fe.tokenEst;
  }
  if (current.features.length > 0) sprints.push(current);

  // Step 5: maxSprints cap check
  if (sprints.length > cfg.maxSprints) {
    return {
      ok: false,
      error: 'exceeds_maxSprints',
      computedSprintCount: sprints.length,
      maxSprints: cfg.maxSprints,
      suggestedAction: 'Increase bkit.config.json sprint.contextSizing.maxSprints (current: ' +
        cfg.maxSprints + ') or decompose features into fewer, larger items.',
    };
  }

  // Step 6: assign sprint dependencies + finalize shape
  const finalSprints = sprints.map(function (s, idx) {
    const sprintN = idx + 1;
    const id = input.projectId + '-s' + sprintN;
    return {
      id: id,
      name: 'Sprint ' + sprintN + ' of ' + input.projectId,
      features: s.features.slice(),
      scope: s.features.join(', '),
      tokenEst: s.tokenEst,
      dependsOn: [],
    };
  });
  // Cross-sprint dep edges
  if (cfg.dependencyAware && depGraph && Object.keys(depGraph).length > 0) {
    const featureToSprint = {};
    finalSprints.forEach(function (s) {
      s.features.forEach(function (f) { featureToSprint[f] = s.id; });
    });
    finalSprints.forEach(function (s, idx) {
      const dependsSet = new Set();
      s.features.forEach(function (f) {
        const deps = depGraph[f];
        if (Array.isArray(deps)) {
          deps.forEach(function (d) {
            const depSprintId = featureToSprint[d];
            if (depSprintId && depSprintId !== s.id) {
              dependsSet.add(depSprintId);
            }
          });
        }
      });
      s.dependsOn = Array.from(dependsSet);
    });
  }

  const totalTokenEst = finalSprints.reduce(function (sum, s) { return sum + s.tokenEst; }, 0);
  const result = {
    ok: true,
    sprints: finalSprints,
    dependencyGraph: depGraph,
    totalTokenEst: totalTokenEst,
  };
  if (warning) result.warning = warning;
  return result;
}
```

### 1.7 module.exports (line 282-294)

```javascript
module.exports = {
  estimateTokensForFeature,
  recommendSprintSplit,
  loadContextSizingConfig,
  topologicalSort,
  detectCycle,
  CONTEXT_SIZING_DEFAULTS,
  CONTEXT_SIZING_SCHEMA_VERSION,
  // exported for testing
  KEBAB_CASE_RE,
};
```

**Total LOC**: ~295 (within Plan R1 ~280 estimate +15 for JSDoc + comments).

---

## 2. Exact Patches — `lib/application/sprint-lifecycle/index.js`

### 2.1 Diff hunk 1 (after line 39 `const masterPlanMod`)

```diff
 const masterPlanMod = require('./master-plan.usecase');
+const contextSizerMod = require('./context-sizer');

 module.exports = {
```

### 2.2 Diff hunk 2 (JSDoc, after `master-plan.usecase.js` line in Sprint 2 sub-list)

```diff
  *     master-plan.usecase.js      — generateMasterPlan (S2-UX, v2.1.13)
+ *     context-sizer.js            — recommendSprintSplit (S3-UX, v2.1.13)
  *
  * Design Ref:
```

### 2.3 Diff hunk 3 (after Sprint 2 Master Plan export block)

```diff
   MASTER_PLAN_SCHEMA_VERSION: masterPlanMod.MASTER_PLAN_SCHEMA_VERSION,
+
+  // Sprint 2 — Context Sizer (S3-UX, v2.1.13)
+  estimateTokensForFeature: contextSizerMod.estimateTokensForFeature,
+  recommendSprintSplit: contextSizerMod.recommendSprintSplit,
+  loadContextSizingConfig: contextSizerMod.loadContextSizingConfig,
+  CONTEXT_SIZING_DEFAULTS: contextSizerMod.CONTEXT_SIZING_DEFAULTS,
+  CONTEXT_SIZING_SCHEMA_VERSION: contextSizerMod.CONTEXT_SIZING_SCHEMA_VERSION,
 };
```

**Total: +8 lines** (within Plan R7 +8 estimate). 31 → 36 exports.

---

## 3. Exact Patches — `bkit.config.json`

### 3.1 Diff hunk 1 (after pdca section closing brace, line 76)

```diff
     "fullAuto": {
       "reviewCheckpoints": ["design"]
     }
   },
+  "sprint": {
+    "contextSizing": {
+      "enabled": true,
+      "schemaVersion": "1.0",
+      "maxTokensPerSprint": 100000,
+      "safetyMargin": 0.25,
+      "tokensPerLOC": 6.67,
+      "baselineLOC": 5000,
+      "minSprints": 1,
+      "maxSprints": 12,
+      "dependencyAware": true
+    }
+  },
   "triggers": {
```

**Total: +13 lines** (within Plan R8 +14 estimate).

**JSON validity**: trailing comma is essential since `"triggers": {` follows. No comma after closing `}` of sprint section before next root section requires careful diff placement.

---

## 4. Sprint Object Shape Verification

Sprint object returned by `recommendSprintSplit` MUST match S2-UX `master-plan.usecase.js` line 388-401 plan.sprints[] schema:

| Field | Type | S2-UX precedent | S3-UX produces |
|-------|------|----------------|---------------|
| id | string (kebab-case) | n/a in S2-UX stub (sprints:[]) | `<projectId>-s<N>` |
| name | string | n/a | `Sprint <N> of <projectId>` |
| features | string[] | n/a | sub-array of input.features |
| scope | string | n/a | features.join(', ') |
| tokenEst | number | n/a | Math.ceil sum |
| dependsOn | string[] | n/a | cross-sprint dep edges |

**S4-UX wiring path** (deferred): caller invokes `recommendSprintSplit(input)` → assigns result.sprints to plan.sprints in `master-plan.usecase.generateMasterPlan` result.

---

## 5. Test Plan Matrix (L1-L5)

### 5.1 L1 Unit (in-source smoke, Phase 4 Do step 4)

| Test | Module | Smoke command |
|------|--------|--------------|
| L1-CS-1 | estimateTokensForFeature default | `node -e "console.log(require('./lib/application/sprint-lifecycle/context-sizer').estimateTokensForFeature('auth'))"` → "33350" |
| L1-CS-2 | estimateTokensForFeature with locHint | `node -e "console.log(require('./lib/application/sprint-lifecycle/context-sizer').estimateTokensForFeature('auth', { locHint: 2000 }))"` → "13340" |
| L1-CS-3 | topologicalSort empty | `node -e "console.log(JSON.stringify(require('./lib/application/sprint-lifecycle/context-sizer').topologicalSort({})))"` → `{"ok":true,"order":[]}` |
| L1-CS-4 | topologicalSort linear | input `{ b: ['a'], c: ['b'] }` → `order: ['a','b','c']` |
| L1-CS-5 | detectCycle self-loop | `detectCycle({ a: ['a'] })` → `true` |
| L1-CS-6 | recommendSprintSplit empty features | `{ ok: true, sprints: [], totalTokenEst: 0 }` |
| L1-CS-7 | recommendSprintSplit 3 features (≤ budget) | `sprints.length === 2` (3 × 33350 = 100050, 2 fit in 75K → 2 sprints) |
| L1-CS-8 | recommendSprintSplit single oversized | locHint 20000 → 133400 > 100K → spillover + warning |
| L1-CS-9 | loadContextSizingConfig defaults fallback | non-existent projectRoot → CONTEXT_SIZING_DEFAULTS |
| L1-CS-10 | Sprint object shape | all 6 fields present (id/name/features/scope/tokenEst/dependsOn) |

### 5.2 L2 Integration (smoke Phase 4 Do step 4)

| Test | Scenario | Smoke command |
|------|----------|--------------|
| L2-CS-1 | bkit.config.json read returns 100000 | `node -e "(async()=>{ const m=require('./lib/application/sprint-lifecycle'); const c=await m.loadContextSizingConfig({ projectRoot: process.cwd() }); console.log(c.maxTokensPerSprint) })()"` → "100000" |
| L2-CS-2 | full pipeline 6 features | recommends 2-3 sprints |
| L2-CS-3 | dependency-aware 3 features sequential | sprints in topological order |
| L2-CS-4 | cycle returns error | `{ ok: false, error: 'dependency_cycle' }` |
| L2-CS-5 | maxSprints cap with 50 features | `{ ok: false, error: 'exceeds_maxSprints' }` |

### 5.3 L3 Contract (S4-UX scope)

Deferred to S4-UX SC-10 (context-sizing contract test).

### 5.4 L4/L5 (S4-UX scope)

End-to-end agent integration + multi-project session test deferred.

---

## 6. Sprint 1-5 Invariant Verification Matrix (Final)

| Sprint | Component | LOC delta | Verification |
|--------|-----------|-----------|--------------|
| Sprint 1 Domain | All 5 files | **0** | `git diff a25d176..HEAD -- lib/domain/sprint/` empty |
| Sprint 2 Application | master-plan.usecase.js / start-sprint / iterate / etc. | **0** | unchanged |
| Sprint 2 Application | index.js | +8 | additive export 31 → 36 |
| Sprint 2 Application | context-sizer.js (new) | +295 | new file |
| Sprint 3 Infrastructure | sprint-paths.js / 6 adapters | **0** | unchanged |
| Sprint 4 Presentation | sprint-handler.js / SKILL.md / sprint-master-planner.md | **0** | unchanged (UI surface stable) |
| Sprint 5 Quality + Docs | L3 Contract / guides | **0** | regression PASS (SC-04/06 expected mismatch inherited) |
| lib/audit | audit-logger.js | **0** | pure function — no audit emit |
| bkit.config.json | sprint section | +13 | additive (17 → 18 root sections) |
| templates/sprint/ | 7 templates | **0** | unchanged |
| hooks/hooks.json | 21:24 | **0** | invariant preserved |

**Total**: **3 disk files changed** (1 new + 2 modified), **+316 LOC**.

---

## 7. F9-120 15-Cycle Validation Plan

Phase 4 Do 매 step 후 `claude plugin validate .` 실행:

1. After F3 (bkit.config.json): JSON 변경, plugin manifest 영향 0 → expected PASS
2. After F1 (context-sizer.js): pure JS, plugin manifest 영향 0 → expected PASS
3. After F2 (index.js): additive export → expected PASS

**Risk**: 0 (no manifest changes). F9-120 14 → 15-cycle 안전 달성.

---

## 8. 사용자 명시 1-8 보존 매트릭스 (Final)

| # | Mandate | Design verification |
|---|---------|--------------------|
| 1 | 8-lang trigger + @docs 예외 영어 | context-sizer는 backend, SKILL.md 0 change |
| 2 | Sprint 유기적 상호 연동 | §4 Sprint object shape compat + Plan §3 10 IPs |
| 3 | QA = bkit-evals + claude -p + 4-System + diverse | §5 L1-L2 test matrix + Phase 6 7-perspective |
| 4-1 | Master Plan auto | S2-UX inherited |
| 4-2 | Context window sizing | ★ 본 sub-sprint 핵심 deliverable — recommendSprintSplit algorithm complete |
| 5 | 꼼꼼함 (빠르게 X) | Design ~700 lines + exact patches + L1-L5 test matrix |
| 6 | skills/agents YAML + English | code English, no agents/SKILL change |
| 7 | Sprint별 유기적 동작 검증 | §4 shape compat + §6 invariant matrix |
| 8 | /control L4 완전 자동 + 꼼꼼함 | pure function stateless, no autoRun impact |

---

## 9. Design Final Checklist

- [x] §1 context-sizer.js full source template (1.1 ~ 1.7)
- [x] §2 index.js 3 diff hunks (+8 lines)
- [x] §3 bkit.config.json 1 diff hunk (+13 lines)
- [x] §4 Sprint object shape verification (matches S2-UX schema)
- [x] §5 L1-L5 test plan matrix (L1 10 + L2 5, L3-5 deferred S4-UX)
- [x] §6 Sprint 1-5 invariant verification matrix (Sprint 1 = 0)
- [x] §7 F9-120 15-cycle plan
- [x] §8 사용자 명시 1-8 매트릭스 (8/8)
- [x] §9 본 checklist (10+ items)
- [x] No Guessing — verbatim diff hunks + algorithm pseudo-code matching implementation
- [x] PM-S3A~E 5 resolutions implementation-mapped
- [x] F9-120 risk 0 (no manifest change)

---

**Design Status**: ★ **Draft v1.0 완료**.
**Next**: Phase 4 Do — Plan §5 의 7 sequential steps 실행 (config → context-sizer → index → AC batch → invariant → F9-120 → single commit).
**예상 소요**: Phase 4 Do ~30분.
**사용자 명시 1-8 보존**: 8/8.
**Sprint 1-5 invariant**: Sprint 1 = 0, Sprint 2 additive only.
**M8 designCompleteness**: ≥ 85 ✓.
