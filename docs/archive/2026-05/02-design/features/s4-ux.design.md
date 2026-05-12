# S4-UX Design — Sprint UX 개선 Sub-Sprint 4 (Integration + L3 Contract)

> **Sub-Sprint ID**: `s4-ux` (sprint-ux-improvement master 의 4/4 ★ FINAL)
> **Phase**: Design (3/7) — PRD ✓ Plan ✓ → Design in_progress
> **PRD Ref**: `docs/01-plan/features/s4-ux.prd.md` (574 lines, commit `614eaf5`)
> **Plan Ref**: `docs/01-plan/features/s4-ux.plan.md` (517 lines, commit `e83ae0d`)
> **Date**: 2026-05-12
> **Author**: kay kim + bkit AI orchestration
> **Branch**: `feature/v2113-sprint-management`
> **Status**: ★ Draft v1.0 — Phase 4 Do 진입 가능

---

## 0. Executive Summary

S4-UX Phase 4 Do 가 그대로 적용 가능한 **exact diff hunks** 정리. 4 files 의 patch hunks line-precise + verbatim diff. **Sprint 1 invariant 100% 보존** + L3 Contract **8 → 10/10 PASS** + F9-120 **16-cycle** 달성 + Master sprint closure unblock.

---

## 1. Exact Patches — `tests/contract/v2113-sprint-contracts.test.js`

### 1.1 SC-04 Diff hunk (line 130-141)

```diff
   assert(Array.isArray(handlerMod.VALID_ACTIONS));
-  assert.strictEqual(handlerMod.VALID_ACTIONS.length, 15,
-    'VALID_ACTIONS must list 15 sub-actions');
-  // 15 expected actions
+  assert.strictEqual(handlerMod.VALID_ACTIONS.length, 16,
+    'VALID_ACTIONS must list 16 sub-actions');
+  // 16 expected actions (S2-UX v2.1.13 added master-plan)
   const expected = ['init', 'start', 'status', 'list', 'phase', 'iterate',
                     'qa', 'report', 'archive', 'pause', 'resume', 'fork',
-                    'feature', 'watch', 'help'];
+                    'feature', 'watch', 'help', 'master-plan'];
   expected.forEach(a => assert(handlerMod.VALID_ACTIONS.includes(a),
     'VALID_ACTIONS missing: ' + a));
```

### 1.2 SC-06 Diff hunk (line 180-187)

```diff
   const entries = match[1].match(/'[^']+'/g) || [];
-  assert.strictEqual(entries.length, 18,
-    'ACTION_TYPES expected 18 entries, got ' + entries.length);
+  assert.strictEqual(entries.length, 19,
+    'ACTION_TYPES expected 19 entries, got ' + entries.length);
   const flat = entries.join(',');
   assert(flat.includes('sprint_paused'), 'sprint_paused missing from ACTION_TYPES');
   assert(flat.includes('sprint_resumed'), 'sprint_resumed missing from ACTION_TYPES');
+  assert(flat.includes('master_plan_created'), 'master_plan_created missing from ACTION_TYPES');
 }
```

### 1.3 SC-09 신규 (insert after sc08() function, before Runner section)

```javascript

// === SC-09: master-plan invocation 4-layer chain (S4-UX v2.1.13) ===
async function sc09() {
  const handler = require(path.join(projectRoot, 'scripts/sprint-handler'));

  // Unique test id with timestamp to avoid collision with real master plans
  const testId = 'sc09-test-' + Date.now();
  const masterPlanPath = path.join(projectRoot,
    'docs/01-plan/features/' + testId + '.master-plan.md');
  const stateFilePath = path.join(projectRoot,
    '.bkit/state/master-plans/' + testId + '.json');

  try {
    const result = await handler.handleSprintAction('master-plan', {
      id: testId,
      name: 'SC09 Test Master Plan',
      features: ['a', 'b'],
    }, {});

    // Layer 1: handler result
    assert.strictEqual(result.ok, true,
      'master-plan handler failed: ' + JSON.stringify(result));
    assert(result.plan, 'result missing plan');
    assert(result.masterPlanPath, 'result missing masterPlanPath');
    assert(result.stateFilePath, 'result missing stateFilePath');

    // Layer 2: state json
    assert(fs.existsSync(stateFilePath),
      'state json not created: ' + stateFilePath);
    const state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    assert.strictEqual(state.schemaVersion, '1.0',
      'state schemaVersion expected 1.0, got ' + state.schemaVersion);
    assert.strictEqual(state.projectId, testId);

    // Layer 3: markdown file
    assert(fs.existsSync(masterPlanPath),
      'markdown not created: ' + masterPlanPath);

    // Layer 4: audit entry (best-effort, may be batched)
    const today = new Date().toISOString().slice(0, 10);
    const auditPath = path.join(projectRoot, '.bkit/audit/' + today + '.jsonl');
    if (fs.existsSync(auditPath)) {
      const auditContent = fs.readFileSync(auditPath, 'utf8');
      assert(auditContent.includes('master_plan_created'),
        'audit missing master_plan_created entry');
      assert(auditContent.includes(testId),
        'audit missing testId reference');
    }
  } finally {
    // Cleanup test artifacts (best-effort)
    try { fs.unlinkSync(stateFilePath); } catch (_e) {}
    try { fs.unlinkSync(masterPlanPath); } catch (_e) {}
  }
}

// === SC-10: context-sizer pure function contract (S4-UX v2.1.13) ===
function sc10() {
  const cs = require(path.join(projectRoot,
    'lib/application/sprint-lifecycle/context-sizer'));

  // Schema version
  assert.strictEqual(cs.CONTEXT_SIZING_SCHEMA_VERSION, '1.0');

  // Token estimation determinism
  assert.strictEqual(cs.estimateTokensForFeature('x'), 33350,
    'default estimate must be 33350');
  assert.strictEqual(cs.estimateTokensForFeature('x', { locHint: 2000 }), 13340,
    'locHint=2000 estimate must be 13340');

  // Topological sort
  const t1 = cs.topologicalSort({});
  assert.strictEqual(t1.ok, true);
  assert.deepStrictEqual(t1.order, []);

  // Cycle detection
  assert.strictEqual(cs.detectCycle({ a: ['a'] }), true,
    'self-loop must be detected');
  assert.strictEqual(cs.detectCycle({ b: ['a'], c: ['b'] }), false,
    'linear chain must not detect cycle');

  // Recommendation: empty
  const r0 = cs.recommendSprintSplit({ projectId: 'sc10-test', features: [] });
  assert.strictEqual(r0.ok, true);
  assert.deepStrictEqual(r0.sprints, []);

  // Recommendation: 2 features, sprint shape
  const r1 = cs.recommendSprintSplit({
    projectId: 'sc10-test',
    features: ['a', 'b'],
  });
  assert.strictEqual(r1.ok, true);
  assert(Array.isArray(r1.sprints), 'sprints must be array');
  if (r1.sprints.length > 0) {
    const expectedKeys = ['dependsOn', 'features', 'id', 'name', 'scope', 'tokenEst'];
    const gotKeys = Object.keys(r1.sprints[0]).sort();
    assert.deepStrictEqual(gotKeys, expectedKeys,
      'sprint shape mismatch: ' + JSON.stringify(gotKeys));
  }

  // Cycle case
  const r2 = cs.recommendSprintSplit({
    projectId: 'sc10-test',
    features: ['a', 'b'],
    dependencyGraph: { a: ['b'], b: ['a'] },
  });
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(r2.error, 'dependency_cycle');
}
```

### 1.4 Runner update (line 244-246)

```diff
   record('SC-07 SPRINT_AUTORUN_SCOPE inline ↔ lib/control mirror (5 levels)', sc07);
   record('SC-08 hooks.json 21 events 24 blocks invariant', sc08);
+  await record('SC-09 master-plan 4-layer chain (handler → state + markdown + audit)', sc09);
+  record('SC-10 context-sizer pure function contract (5 assertions)', sc10);
   console.log('\n=== L3 Contract: ' + passed + '/' + (passed + failed) + ' PASS ===');
```

**Total LOC**: SC-04 net 0 (3 replacements), SC-06 +1, SC-09 +50, SC-10 +35, runner +2 = **+88 LOC**.

---

## 2. Exact Patches — `lib/application/sprint-lifecycle/master-plan.usecase.js`

### 2.1 JSDoc update (in generateMasterPlan @param block, around line 332-339)

```diff
  * @param {Object} [deps]
  * @param {Function} [deps.agentSpawner]   - ({ subagent_type, prompt }) => Promise<{ output }>
  * @param {Function} [deps.fileWriter]      - (path, content, encoding) => Promise<void>
  * @param {Function} [deps.fileDeleter]     - (path) => Promise<void>
  * @param {Object}   [deps.auditLogger]     - { logEvent(entry) } or { writeAuditLog(entry) }
  * @param {Function} [deps.taskCreator]     - ({ subject, description, addBlockedBy? }) => Promise<{ taskId }>
+ * @param {Function} [deps.contextSizer]    - S4-UX optional. (input, opts) => { ok, sprints, dependencyGraph }
+ * @param {Object}   [deps.contextSizingConfig] - merged config from loadContextSizingConfig (optional)
```

### 2.2 Auto-wiring block (before Step 4 plan object construction, around line 388)

Find this section in master-plan.usecase.js:
```javascript
  // Step 4: construct plan object
  const now = new Date().toISOString();
  const plan = {
    schemaVersion: MASTER_PLAN_SCHEMA_VERSION,
    projectId: input.projectId,
    projectName: input.projectName,
    features: Array.isArray(input.features) ? input.features.slice() : [],
    sprints: [], // stub for S3-UX context-sizer
    dependencyGraph: {},
    trustLevel: input.trustLevel || DEFAULT_TRUST_LEVEL,
    context: Object.assign({}, DEFAULT_CONTEXT, input.context || {}),
    generatedAt: now,
    updatedAt: now,
    masterPlanPath: masterPlanRel,
  };
```

Replace with:
```javascript
  // === S4-UX optional auto-wiring (PM-S4A: default OFF, opt-in via deps.contextSizer) ===
  let recommendedSprints = [];
  let computedDepGraph = {};
  let wiringWarning = null;
  if (typeof d.contextSizer === 'function' && Array.isArray(input.features) && input.features.length > 0) {
    try {
      const splitResult = d.contextSizer({
        projectId: input.projectId,
        features: input.features,
        dependencyGraph: input.dependencyGraph,
        locHints: input.locHints,
      }, d.contextSizingConfig);
      if (splitResult && splitResult.ok) {
        recommendedSprints = Array.isArray(splitResult.sprints) ? splitResult.sprints : [];
        computedDepGraph = splitResult.dependencyGraph || {};
      } else if (splitResult && splitResult.error) {
        wiringWarning = 'contextSizer error: ' + splitResult.error;
      }
    } catch (e) {
      wiringWarning = 'contextSizer threw: ' + (e && e.message ? e.message : String(e));
    }
  }
  // === end S4-UX auto-wiring ===

  // Step 4: construct plan object
  const now = new Date().toISOString();
  const plan = {
    schemaVersion: MASTER_PLAN_SCHEMA_VERSION,
    projectId: input.projectId,
    projectName: input.projectName,
    features: Array.isArray(input.features) ? input.features.slice() : [],
    sprints: recommendedSprints, // S4-UX: populated when deps.contextSizer injected
    dependencyGraph: computedDepGraph,
    trustLevel: input.trustLevel || DEFAULT_TRUST_LEVEL,
    context: Object.assign({}, DEFAULT_CONTEXT, input.context || {}),
    generatedAt: now,
    updatedAt: now,
    masterPlanPath: masterPlanRel,
  };
  if (wiringWarning) plan.contextSizerWarning = wiringWarning;
```

**Backward compat**: when `d.contextSizer === undefined`:
- `recommendedSprints` stays `[]`
- `computedDepGraph` stays `{}`
- `plan.sprints = []` and `plan.dependencyGraph = {}` (identical to S2-UX behavior)
- `wiringWarning` stays `null`, no extra field added to plan

**LOC est.**: +25 LOC (auto-wiring block 21 + JSDoc 2 + plan.contextSizerWarning 1 + cleanup 1)

---

## 3. Exact Patches — `agents/sprint-master-planner.md`

### 3.1 Section title + body update (around line 130-160 in S2-UX `a679d64`)

Find existing section:
```markdown
## Sprint Split Heuristics (S3-UX Forward Compatibility)

The S2-UX phase exposes `sprints: []` as a stub (empty array) in the output
JSON state. The S3-UX phase will implement `context-sizer.js` to populate
this array with token-bounded sprint splits.

Until S3-UX lands, generate Sprint Split markdown content as a textual
recommendation only (§5 of the output markdown), referencing the heuristic:

- Group features by dependency graph (topological sort)
- Each group ≤ ~100K tokens (heuristic: ~1.5K LOC per 10K tokens)
- Sequential dependency: each sprint blocks the next
- Fallback: if features count ≤ 3 and no inter-feature deps, single sprint

This text serves as documentation only. Programmatic split is owned by S3-UX.
```

Replace with:
```markdown
## Sprint Split Heuristics (Programmatic API)

S3-UX (v2.1.13) implemented the programmatic split algorithm at
`lib/application/sprint-lifecycle/context-sizer.js`. The S4-UX integration
wires this algorithm into `master-plan.usecase.js` via the optional
`deps.contextSizer` dependency injection. When the caller (LLM dispatcher
at main session) injects this dependency, the `plan.sprints[]` array is
populated automatically with token-bounded sprint splits.

### API Reference

```javascript
const lifecycle = require('./lib/application/sprint-lifecycle');

// Estimate tokens for a feature (default 33350 = 5000 LOC × 6.67 tokens/LOC)
const tokens = lifecycle.estimateTokensForFeature('auth');

// Recommend sprint split with token-budget awareness + dependency graph
const result = lifecycle.recommendSprintSplit({
  projectId: 'q2-launch',
  features: ['auth', 'payment', 'reports'],
  dependencyGraph: {
    payment: ['auth'],
    reports: ['auth', 'payment'],
  },
}, lifecycle.CONTEXT_SIZING_DEFAULTS);

// result.ok === true
// result.sprints: Array<{ id, name, features, scope, tokenEst, dependsOn }>
// result.totalTokenEst: number
// result.warning?: string (when a single feature exceeds maxTokensPerSprint)
// result.dependencyGraph: Object (echoed input)
```

### Algorithm Pillars

- Token estimation: `Math.ceil(LOC × tokensPerLOC)`, conservative ceiling
- Dependency graph: adjacency list `{ feature: [deps] }`, Kahn's topological sort
- Bin-packing: greedy, with `effectiveBudget = maxTokensPerSprint × (1 - safetyMargin)`
- Single-feature spillover: oversized feature gets its own sprint + warning
- maxSprints cap: returns error with suggestedAction if computed split exceeds cap

### Heuristics (for narrative content in §5 of master plan markdown)

- Group features by dependency graph (topological sort)
- Each group ≤ ~100K tokens default (configurable via `bkit.config.json` `sprint.contextSizing.maxTokensPerSprint`)
- Sequential dependency: each sprint blocks the next via `dependsOn` array
- Fallback: if features count ≤ 3 and no inter-feature deps, single sprint

The agent may use this API directly (via Bash tool calling Node) when
computing split decisions for the §5 Sprint Split Recommendation markdown
content, or recommend the caller use it programmatically.
```

**Frontmatter unchanged** (line 1-26). Existing `## Side Effect Contract (Isolation Guarantee)` section unchanged.

**LOC est.**: +30 LOC (removed 14 lines old, added 44 lines new)

---

## 4. Exact Patches — `docs/06-guide/sprint-management.guide.md`

### 4.1 §2 title + description update (line 36-37)

```diff
-## 2. 15 Sub-actions
+## 2. 16 Sub-actions

-bkit `/sprint` 명령은 15 sub-actions 를 제공합니다.
+bkit `/sprint` 명령은 16 sub-actions 를 제공합니다 (v2.1.13 S2-UX 에서 master-plan 추가).
```

(Actual exact line may differ — Phase 4 Do reads file and adjusts. The descriptive sentence may be in a slightly different form; intent is to update 15→16 references.)

### 4.2 §2 table row addition (end of §2 table, before `## 3` header)

Append after the last row of §2 table:
```markdown
| `master-plan <project>` | Multi-sprint Master Plan 자동 생성 (sprint-master-planner agent 격리 spawn 또는 dry-run template) | `/sprint master-plan q2-launch --name "Q2 출시" --features auth,payment,reports` |
```

### 4.3 §9 신규 (insert after §8 worked examples, before `## 부록 A`)

```markdown

---

## 9. Master Plan Generator + Context Sizer 워크플로우 (v2.1.13)

본 섹션은 S2-UX (Master Plan Generator) + S3-UX (Context Sizer) + S4-UX (Integration) 의 통합 워크플로우를 설명합니다. **사용자 명시 4-1 (Master Plan 자동 생성) + 4-2 (컨텍스트 윈도우 sprint sizing)** 충족.

### 9.1 워크플로우 Overview

```
사용자
   |
   | /sprint master-plan q2-launch --name "Q2 Launch" --features auth,payment,reports
   v
SKILL.md bkit:sprint dispatcher
   |
   v
scripts/sprint-handler.js handleMasterPlan
   |
   v
lib/application/sprint-lifecycle/master-plan.usecase.js generateMasterPlan
   |
   | (S4-UX) deps.contextSizer 주입 시 자동 sprint split
   v
lib/application/sprint-lifecycle/context-sizer.js recommendSprintSplit
   |
   | sprints[] 배열 반환 (각 sprint ≤ 75K effective tokens)
   v
master-plan.usecase.js plan 객체에 sprints 채워짐
   |
   | atomic write
   v
.bkit/state/master-plans/<projectId>.json (state)
docs/01-plan/features/<projectId>.master-plan.md (markdown)
.bkit/audit/<date>.jsonl (master_plan_created entry)
```

### 9.2 1-Command 사용법

가장 간단한 호출:
```bash
/sprint master-plan q2-launch --name "Q2 Launch" --features auth,payment,reports
```

CLI 모드 (headless test / debugging):
```bash
node scripts/sprint-handler.js master-plan q2-launch --name="Q2 Launch" --features=auth,payment,reports
```

플래그:
- `--name <string>` (required): 사용자 친화적 프로젝트 이름
- `--features <a,b,c>` (optional): comma-separated feature 목록
- `--trust L0~L4` (optional): Trust Level (default L3)
- `--force` (optional): 기존 master plan 덮어쓰기
- `--duration <string>` (optional): 예상 기간 (default 'TBD')

### 9.3 Context Sizer 설정 (`bkit.config.json` `sprint.contextSizing`)

`bkit.config.json` 의 `sprint.contextSizing` section 으로 sprint split 알고리즘을 조정할 수 있습니다 (9 fields):

```json
{
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
  }
}
```

| Field | Default | 의미 |
|-------|---------|-----|
| `enabled` | true | context-sizing 기능 활성화 여부 |
| `maxTokensPerSprint` | 100000 | sprint 당 최대 token (단일 세션 안전 한도) |
| `safetyMargin` | 0.25 | 안전 margin (effective budget = max × (1 - margin)) |
| `tokensPerLOC` | 6.67 | LOC 당 token 계수 (Master Plan §1.5 heuristic) |
| `baselineLOC` | 5000 | feature 당 기본 LOC (mid-sized, 보수적) |
| `minSprints` | 1 | 최소 sprint 수 |
| `maxSprints` | 12 | 최대 sprint 수 (초과 시 error 반환) |
| `dependencyAware` | true | dependency graph 기반 topological sort 활성화 |

**Effective budget**: 100000 × (1 - 0.25) = **75000 tokens / sprint**. Sprint 당 ≤ 75K tokens 을 안전 한도로 사용.

### 9.4 Dependency-Aware Split

Feature 간 의존성을 명시하면 자동으로 topological order 로 sprint 가 정렬됩니다:

```javascript
const lifecycle = require('./lib/application/sprint-lifecycle');
const result = lifecycle.recommendSprintSplit({
  projectId: 'q2-launch',
  features: ['auth', 'payment', 'reports'],
  dependencyGraph: {
    payment: ['auth'],           // payment depends on auth
    reports: ['auth', 'payment'] // reports depends on auth + payment
  },
}, lifecycle.CONTEXT_SIZING_DEFAULTS);
```

**알고리즘**: Kahn's algorithm (in-degree based topological sort)
**Cycle detection**: graph 에 cycle 존재 시 `{ ok: false, error: 'dependency_cycle', cycle: [...] }` 반환
**Cross-sprint dep edges**: 각 sprint 의 `dependsOn` 배열에 의존 sprint id 자동 기록 (e.g., `['q2-launch-s1']`)

### 9.5 Dry-Run vs Agent-Backed Generation

| 모드 | Trigger | 결과 |
|------|---------|------|
| **Dry-run** | `deps.agentSpawner === undefined` (default) | `templates/sprint/master-plan.template.md` substitution. Minimal valid markdown 생성. `plan.sprints = []` 기본 (S2-UX), `deps.contextSizer` 주입 시 자동 채움 (S4-UX) |
| **Agent-backed** | `deps.agentSpawner = ({ subagent_type, prompt }) => Promise<{ output }>` | `bkit:sprint-master-planner` agent 격리 spawn → markdown content 반환 |

**Dry-run 사용 시점**: unit test, 초기 template 생성, agent 호출 비용 절약.
**Agent-backed 사용 시점**: production master plan 생성, codebase 분석 + tone 일치 필요할 때.

### 9.6 Idempotency + `--force` Overwrite

- **Default (idempotent)**: 두 번째 호출 (same projectId) 은 `{ ok: true, alreadyExists: true, plan: <existing> }` 반환. state/markdown 변경 X.
- **`--force` flag**: state JSON + markdown 둘 다 덮어쓰기. audit entry 에 `details.forceOverwrite: true`.
- **Single ACTION_TYPE**: 두 케이스 모두 `'master_plan_created'` audit action 사용 (S2-UX PM-S2G resolution).

### 9.7 Common Pitfalls + Troubleshooting

| Pitfall | Symptom | Resolution |
|---------|---------|------------|
| `projectId` minimum length | `error: 'invalid_input', errors: ['projectId must match kebab-case']` | 최소 3 chars (e.g., `'p1'` 거부, `'p-1'` 또는 `'pi1'` OK) |
| Feature 가 vague string | tokenEst 가 부정확 (default 33350) | `--locHint` 또는 `locHints: { feature: 8000 }` 전달 (v2.1.14 예정) |
| 50+ features → maxSprints 초과 | `error: 'exceeds_maxSprints'` | `bkit.config.json` 의 `maxSprints` 증가 또는 features 분해 |
| Dependency cycle | `error: 'dependency_cycle', cycle: [...]` | graph 재검토 — 자기 자신을 dep 하면 X |
| Markdown 생성 실패 시 state 잔존 | state JSON 만 있고 markdown 없음 | state-first rollback 패턴 — markdown 실패 시 state 자동 삭제. 재호출로 복구 가능 |
| Backward compat 깨짐 | 기존 caller 가 sprints:[] 의존 | S4-UX 의 auto-wiring 은 default OFF — `deps.contextSizer` 명시 inject 만 활성 |

---
```

### 4.4 §9 Length verification

`§9` 헤더 + 7 sub-sections (§9.1~§9.7) + tables + code blocks = ≥ 100 lines target (AC-KG-5).

**LOC est.**: §2 +3 lines + §9 +130 lines = **+133 lines**

---

## 5. Sprint 1-5 Invariant Final Matrix

| Sprint | Component | LOC delta vs `9a99948` | Justification |
|--------|-----------|------------------------|--------------|
| Sprint 1 Domain | All 5 files | **0** | option D maintained |
| Sprint 2 Application | start/iterate/etc. (11 use cases) | **0** | unchanged |
| Sprint 2 Application | master-plan.usecase.js | +25 LOC additive | F2 — backward compat preserved |
| Sprint 2 Application | context-sizer.js / sprint-lifecycle/index.js | **0** | S3-UX preserved |
| Sprint 3 Infrastructure | All 7 files | **0** | unchanged |
| Sprint 4 Presentation | sprint-handler.js / SKILL.md | **0** | S2-UX preserved |
| Sprint 4 Presentation | agents/sprint-master-planner.md | +30 LOC body | F3 — frontmatter 0 change |
| Sprint 5 Quality + Docs | tests/contract/v2113-sprint-contracts.test.js | +88 LOC (intentional) | F1 — SC-04/06 update + SC-09/10 new |
| Sprint 5 Quality + Docs | sprint-management.guide.md | +133 LOC additive | F4 — §2 +3 + §9 +130 |
| lib/audit | audit-logger.js | **0** | unchanged |
| bkit.config.json | sprint section | **0** | S3-UX preserved |
| hooks/hooks.json | 21:24 | **0** | invariant preserved |

**Total**: **4 files changed**, **+276 LOC**.

---

## 6. F9-120 16-Cycle Validation

**Phase 4 Do 매 step 후** `claude plugin validate .` 실행:

1. After F4 (sprint-management.guide.md): markdown 변경, plugin manifest 영향 0 → PASS expected
2. After F3 (agents/sprint-master-planner.md body): frontmatter unchanged → PASS expected
3. After F2 (master-plan.usecase.js): pure JS, plugin manifest 영향 0 → PASS expected
4. After F1 (tests/contract/...): test file, plugin manifest 영향 0 → PASS expected

**Risk**: 0 (no manifest changes). F9-120 15 → 16-cycle 안전 달성.

---

## 7. Cumulative TCs 250+ Verification

| Source | TC count |
|--------|----------|
| Sprint 5 baseline (Sprint 5 Plan §5.1 quoted) | 226 TCs |
| L3 Contract (SC-01~SC-10 after S4-UX) | 10 |
| S1-UX smoke tests | 4 (init/start/status/list) |
| S2-UX smoke tests | 10 (AC-MPG / AC-SHI subsets) |
| S3-UX smoke tests | 17 (AC-CS / AC-IE / AC-BC subsets) |
| S4-UX smoke tests | 7+ (during Phase 4 Do verification) |
| **Cumulative** | **≥ 270 TCs** ✓ (Master Plan §0.4 #11 target 250+) |

---

## 8. Design Final Checklist

- [x] §1 tests/contract diff hunks (SC-04/06 update + SC-09/10 new + runner)
- [x] §2 master-plan.usecase diff hunks (JSDoc + auto-wiring block)
- [x] §3 agents/sprint-master-planner.md body diff (Section title + code example)
- [x] §4 sprint-management.guide.md §2 +3 + §9 +130 lines exact spec
- [x] §5 Sprint 1-5 invariant final matrix (Sprint 1 = 0)
- [x] §6 F9-120 16-cycle validation plan
- [x] §7 Cumulative TCs 250+ verification (≥ 270)
- [x] §8 본 checklist
- [x] No Guessing: verbatim diff hunks + Korean §9 structure
- [x] Sprint 1 invariant: 0 LOC
- [x] S2-UX + S3-UX contracts preserved
- [x] Backward compat (PM-S4A default OFF)

---

**Design Status**: ★ **Draft v1.0 완료**.
**Next**: Phase 4 Do — Plan §5 의 7 sequential steps 실행.
**예상 소요**: Phase 4 Do ~60분.
**Sprint 1 invariant**: 0 LOC (S1-S3-UX inherited).
**Cumulative TCs**: ≥ 270 (Master Plan §0.4 #11 ✓).
