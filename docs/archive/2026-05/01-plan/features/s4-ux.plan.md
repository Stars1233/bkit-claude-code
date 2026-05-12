# S4-UX Plan — Sprint UX 개선 Sub-Sprint 4 (Integration + L3 Contract)

> **Sub-Sprint ID**: `s4-ux` (sprint-ux-improvement master 의 4/4 ★ FINAL)
> **Phase**: Plan (2/7) — PRD ✓ → Plan in_progress
> **PRD Ref**: `docs/01-plan/features/s4-ux.prd.md` (574 lines, commit `614eaf5`)
> **Date**: 2026-05-12
> **Author**: kay kim (POPUP STUDIO PTE. LTD.) + bkit AI orchestration
> **Branch**: `feature/v2113-sprint-management`
> **Status**: ★ Draft v1.0 — commit-ready spec for Phase 3 Design

---

## 0. Executive Summary

### 0.1 Mission

PRD §3 Feature Map 4 deliverables (F1-F4, F5 skipped per PM-S4D) 를 단일 세션 (~35K tokens, 60-90분) 안에 commit-ready spec 으로 정리. PRD §12 5 open questions (PM-S4A~E) 모두 해결. 30 verification commands + L3 SC-09/10 test pseudo-code + agent body diff hunks + Korean guide §9 structure.

### 0.2 PM-S4A~E 5 Open Questions Resolution

| ID | Resolution |
|----|-----------|
| **PM-S4A** | master-plan auto-wiring **default OFF** (backward compat 안전성), caller 명시 inject 만 활성 |
| **PM-S4B** | SC-09 uses `os.tmpdir() + fs.mkdtempSync('sc09-')` (SC-05 precedent) |
| **PM-S4C** | SC-10 uses direct `require('./lib/application/sprint-lifecycle/context-sizer')` (no public export needed) |
| **PM-S4D** | commands/bkit.md NOT modified — F5 SKIP, ROI low |
| **PM-S4E** | §2 + §9 dual placement — §2 1-line row, §9 7 sub-sections detail |

---

## 1. Requirements (R1-R10)

### R1 — F1 tests/contract/v2113-sprint-contracts.test.js: SC-04 update

**Spec**:
- Line 133 (`'VALID_ACTIONS must list 15 sub-actions'`): `15` → `16`, message also update
- Line 136-138 (expected array): add `'master-plan'` as 16th element

**Patch**:
```diff
-  assert.strictEqual(handlerMod.VALID_ACTIONS.length, 15,
-    'VALID_ACTIONS must list 15 sub-actions');
-  // 15 expected actions
+  assert.strictEqual(handlerMod.VALID_ACTIONS.length, 16,
+    'VALID_ACTIONS must list 16 sub-actions');
+  // 16 expected actions (S2-UX added master-plan)
   const expected = ['init', 'start', 'status', 'list', 'phase', 'iterate',
                     'qa', 'report', 'archive', 'pause', 'resume', 'fork',
-                    'feature', 'watch', 'help'];
+                    'feature', 'watch', 'help', 'master-plan'];
```

**Justification**: PRD §1.2 verbatim base + S2-UX `a679d64` additive
**LOC est.**: +3 LOC (-3 LOC)

### R2 — F1 SC-06 update

**Spec**:
- Line 182 (`18` → `19`), message update
- Add assertion: `flat.includes('master_plan_created')`

**Patch**:
```diff
-  assert.strictEqual(entries.length, 18,
-    'ACTION_TYPES expected 18 entries, got ' + entries.length);
+  assert.strictEqual(entries.length, 19,
+    'ACTION_TYPES expected 19 entries, got ' + entries.length);
   const flat = entries.join(',');
   assert(flat.includes('sprint_paused'), 'sprint_paused missing from ACTION_TYPES');
   assert(flat.includes('sprint_resumed'), 'sprint_resumed missing from ACTION_TYPES');
+  assert(flat.includes('master_plan_created'), 'master_plan_created missing from ACTION_TYPES');
```

**Justification**: PRD §1.3 + S2-UX additive
**LOC est.**: +1 LOC

### R3 — F1 SC-09 신규: master-plan invocation 4-layer chain

**Spec**: New function `sc09()` async — tests master-plan handler 4-layer chain.

**Algorithm**:
1. Create tmp project root via `fs.mkdtempSync(os.tmpdir() + '/sc09-')`
2. Initialize tmp bkit.config.json (or skip, use defaults)
3. Setup tmp `templates/sprint/master-plan.template.md` copy (or test in repo root with tmp output)
4. Decision: use tmp dir as projectRoot, but template path is relative — use input.projectRoot. master-plan.usecase reads `<projectRoot>/templates/sprint/master-plan.template.md`. **simplification**: skip template entirely — test in repo root with tmp output suffix.
5. Better approach: use `projectRoot: projectRoot` (repo root) but with unique `id: 'sc09-test-' + Date.now()` to avoid collision with real master plans. Cleanup after.
6. Call: `handleSprintAction('master-plan', { id, name: 'SC09 Test', features: ['a', 'b'] }, {})`
7. Assert: `result.ok === true`
8. Assert: `fs.existsSync(<masterPlanPath>)` (markdown file created)
9. Assert: `fs.existsSync(<stateFilePath>)` (state json created)
10. Read state json, assert `schemaVersion === '1.0'`
11. Read today's audit jsonl, assert grep `master_plan_created` ≥ 1
12. Cleanup: delete created markdown + state json

**Patch position**: After `sc08()` function definition (around line 233), before `// === Runner ===`

**LOC est.**: +50 LOC

### R4 — F1 SC-10 신규: context-sizer pure function contract

**Spec**: New function `sc10()` sync — tests context-sizer.

**Algorithm**:
1. `const cs = require(path.join(projectRoot, 'lib/application/sprint-lifecycle/context-sizer'));`
2. Assert: `cs.CONTEXT_SIZING_SCHEMA_VERSION === '1.0'`
3. Assert: `cs.estimateTokensForFeature('x') === 33350` (default)
4. Assert: `cs.topologicalSort({}).ok === true`
5. Assert: `cs.detectCycle({ a: ['a'] }) === true`
6. Assert: `cs.recommendSprintSplit({ projectId: 'sc10-test', features: ['a', 'b'] }).ok === true`
7. Result sprint has 6 keys: `['dependsOn', 'features', 'id', 'name', 'scope', 'tokenEst']`
8. Cycle case: `cs.recommendSprintSplit({ projectId: 'sc10-test', features: ['a','b'], dependencyGraph: { a:['b'], b:['a'] } }).ok === false`

**Patch position**: After `sc09()` function, before `// === Runner ===`

**LOC est.**: +30 LOC

### R5 — F1 runner update

**Spec**: Add `await record('SC-09 ...', sc09)` + `record('SC-10 ...', sc10)` to runner.

**Patch**:
```diff
   record('SC-07 SPRINT_AUTORUN_SCOPE inline ↔ lib/control mirror (5 levels)', sc07);
   record('SC-08 hooks.json 21 events 24 blocks invariant', sc08);
+  await record('SC-09 master-plan 4-layer chain (handler → usecase → state + markdown + audit)', sc09);
+  record('SC-10 context-sizer pure function contract (5 assertions)', sc10);
   console.log('\n=== L3 Contract: ' + passed + '/' + (passed + failed) + ' PASS ===');
```

**Expected output**: `=== L3 Contract: 10/10 PASS ===`

**LOC est.**: +2 LOC

### R6 — F2 master-plan.usecase.js auto-wiring

**Spec**: Insert auto-wiring block BEFORE `// Step 4: construct plan object` (line ~388 of S2-UX `a679d64`).

**Patch**:
```javascript
// === S4-UX optional auto-wiring (PR-S4A: default OFF, opt-in via deps.contextSizer) ===
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
```

**Then in plan object**: change `sprints: []` → `sprints: recommendedSprints`, `dependencyGraph: {}` → `dependencyGraph: computedDepGraph`. If `wiringWarning` set, optionally include in audit details.

**Backward compat**: `deps.contextSizer === undefined` → `recommendedSprints` remains `[]`, `computedDepGraph` remains `{}` → behavior identical to S2-UX.

**JSDoc update**: deps section adds:
```javascript
 * @param {Function} [deps.contextSizer] - S4-UX optional. ({input, opts}) => { ok, sprints, dependencyGraph }
 * @param {Object}   [deps.contextSizingConfig] - merged config from loadContextSizingConfig
```

**LOC est.**: +18 LOC (block 16 + JSDoc 2)

### R7 — F3 agents/sprint-master-planner.md body update

**Spec**: Update existing `## Sprint Split Heuristics (S3-UX Forward Compatibility)` section.

**Title change**: `(S3-UX Forward Compatibility)` → `(Programmatic API)`

**Body change**: Replace the old "S3-UX will implement" text with the new "S3-UX implemented at `lib/application/sprint-lifecycle/context-sizer.js`" + JS code example block.

**New code example block**:
```javascript
const lifecycle = require('./lib/application/sprint-lifecycle');
// Estimate tokens for a feature (default 33350)
const tokens = lifecycle.estimateTokensForFeature('auth');
// Recommend sprint split with token-budget awareness
const result = lifecycle.recommendSprintSplit({
  projectId: 'q2-launch',
  features: ['auth', 'payment', 'reports'],
  dependencyGraph: { payment: ['auth'], reports: ['auth', 'payment'] },
}, lifecycle.CONTEXT_SIZING_DEFAULTS);
// result.sprints: Array<{ id, name, features, scope, tokenEst, dependsOn }>
// result.totalTokenEst, result.warning (if any)
```

**Frontmatter unchanged** (line 1-26).

**Language**: English.

**LOC est.**: +30 LOC (net — old 12 LOC removed, new 42 LOC added)

### R8 — F4 docs/06-guide/sprint-management.guide.md §2 update

**Spec** (1-row table addition):

**Title change**: line 36 `## 2. 15 Sub-actions` → `## 2. 16 Sub-actions`

**Description line update** (line 38 area): `15 sub-actions` mention → `16 sub-actions`

**Table addition**: end of §2 table (line 85 area), before `## 3` header:
```markdown
| `master-plan` | Multi-sprint Master Plan 자동 생성 (sprint-master-planner agent 격리 spawn 또는 dry-run template) | `/sprint master-plan q2-launch --name "Q2 출시" --features auth,payment,reports` (v2.1.13 S2-UX 추가) |
```

**Language**: Korean (docs/ exception preserved).

**LOC est.**: +3 lines

### R9 — F4 docs/06-guide/sprint-management.guide.md §9 new

**Spec** (~120 lines Korean):

**Position**: After `## 8. Worked Examples` (ends around line 274), before `## 부록 A: 디렉토리 구조` (line 276).

**Title**: `## 9. Master Plan Generator + Context Sizer 워크플로우 (v2.1.13)`

**Sub-sections (7)**:
- §9.1 워크플로우 overview — high-level diagram
- §9.2 1-command 사용법 — `/sprint master-plan` CLI examples
- §9.3 Context Sizer thresholds — `bkit.config.json` `sprint.contextSizing` 9 fields explanation
- §9.4 Dependency-aware split — adjacency list schema, topological sort, cycle detection
- §9.5 Dry-run vs Agent-backed — when each is used, expected output
- §9.6 Idempotency + `--force` overwrite — second call behavior
- §9.7 Common pitfalls + Troubleshooting — kebab-case validation, locHint, maxSprints

**Language**: Korean.

**LOC est.**: +120 lines

### R10 — Sprint 1 invariant + S2/S3-UX precedent preservation

**Spec**:
- `git diff 9a99948..HEAD -- lib/domain/sprint/` empty (all 5 files)
- `git diff 9a99948..HEAD -- lib/application/sprint-lifecycle/context-sizer.js` empty
- `git diff 9a99948..HEAD -- skills/sprint/SKILL.md` empty (S2-UX preserved)
- `git diff 9a99948..HEAD -- scripts/sprint-handler.js` empty (S2-UX preserved)
- `agents/sprint-master-planner.md` frontmatter (line 1-26) unchanged
- `bkit.config.json` 0 LOC delta (S3-UX preserved)
- `claude plugin validate .` Exit 0 — F9-120 **16-cycle**

**LOC est.**: 0

---

## 2. SC-09 + SC-10 Test Pseudo-code (PM-S4B/C resolutions)

### 2.1 SC-09 pseudo-code

```javascript
async function sc09() {
  const handler = require(path.join(projectRoot, 'scripts/sprint-handler'));

  // Unique test id to avoid collision with real master plans
  const testId = 'sc09-test-' + Date.now();
  const masterPlanPath = path.join(projectRoot, 'docs/01-plan/features/' + testId + '.master-plan.md');
  const stateFilePath = path.join(projectRoot, '.bkit/state/master-plans/' + testId + '.json');

  try {
    // Invoke master-plan handler
    const result = await handler.handleSprintAction('master-plan', {
      id: testId,
      name: 'SC09 Test ' + testId,
      features: ['a', 'b'],
    }, {});

    assert.strictEqual(result.ok, true, 'master-plan handler failed: ' + JSON.stringify(result));
    assert(result.plan, 'result missing plan');
    assert(result.masterPlanPath, 'result missing masterPlanPath');
    assert(result.stateFilePath, 'result missing stateFilePath');

    // Layer 2: state json
    assert(fs.existsSync(stateFilePath), 'state json not created: ' + stateFilePath);
    const state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    assert.strictEqual(state.schemaVersion, '1.0', 'state schemaVersion mismatch');
    assert.strictEqual(state.projectId, testId);

    // Layer 3: markdown
    assert(fs.existsSync(masterPlanPath), 'markdown not created: ' + masterPlanPath);

    // Layer 4: audit entry
    const today = new Date().toISOString().slice(0, 10);
    const auditPath = path.join(projectRoot, '.bkit/audit/' + today + '.jsonl');
    if (fs.existsSync(auditPath)) {
      const audit = fs.readFileSync(auditPath, 'utf8');
      assert(audit.includes('master_plan_created'),
        'audit missing master_plan_created');
      assert(audit.includes(testId),
        'audit missing testId reference');
    }
  } finally {
    // Cleanup test artifacts
    try { fs.unlinkSync(stateFilePath); } catch (_) {}
    try { fs.unlinkSync(masterPlanPath); } catch (_) {}
  }
}
```

### 2.2 SC-10 pseudo-code

```javascript
function sc10() {
  const cs = require(path.join(projectRoot, 'lib/application/sprint-lifecycle/context-sizer'));

  // Schema
  assert.strictEqual(cs.CONTEXT_SIZING_SCHEMA_VERSION, '1.0');

  // Token estimation
  assert.strictEqual(cs.estimateTokensForFeature('x'), 33350);
  assert.strictEqual(cs.estimateTokensForFeature('x', { locHint: 2000 }), 13340);

  // Topological sort
  const t1 = cs.topologicalSort({});
  assert.strictEqual(t1.ok, true);
  assert.deepStrictEqual(t1.order, []);

  // Cycle detection
  assert.strictEqual(cs.detectCycle({ a: ['a'] }), true);
  assert.strictEqual(cs.detectCycle({ b: ['a'], c: ['b'] }), false);

  // Recommendation
  const r1 = cs.recommendSprintSplit({ projectId: 'sc10-test', features: ['a', 'b'] });
  assert.strictEqual(r1.ok, true);
  assert(Array.isArray(r1.sprints), 'sprints not array');
  if (r1.sprints.length > 0) {
    const expected = ['dependsOn', 'features', 'id', 'name', 'scope', 'tokenEst'];
    const got = Object.keys(r1.sprints[0]).sort();
    assert.deepStrictEqual(got, expected, 'sprint shape mismatch: ' + JSON.stringify(got));
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

---

## 3. Inter-Sprint Integration — 12 IPs Implementation Plan

| IP# | Implementation step | Verification command |
|-----|---------------------|---------------------|
| IP-S4-01 | SC-04 update 15→16 | `grep -c "16 sub-actions" tests/contract/v2113-sprint-contracts.test.js` ≥ 1 |
| IP-S4-02 | SC-06 update 18→19 + master_plan_created | `grep -c "master_plan_created" tests/contract/v2113-sprint-contracts.test.js` ≥ 1 |
| IP-S4-03 | SC-09 invokes handleSprintAction('master-plan') | `grep -c "handleSprintAction('master-plan'" tests/contract/v2113-sprint-contracts.test.js` ≥ 1 |
| IP-S4-04 | SC-10 invokes context-sizer | `grep -c "context-sizer" tests/contract/v2113-sprint-contracts.test.js` ≥ 1 |
| IP-S4-05 | F2 deps.contextSizer auto-wiring | `grep -c "deps.contextSizer\|d.contextSizer" lib/application/sprint-lifecycle/master-plan.usecase.js` ≥ 1 |
| IP-S4-06 | F2 backward compat preserved | smoke test no-deps call → sprints:[] |
| IP-S4-07 | F3 agent body recommendSprintSplit mention | `grep -c "recommendSprintSplit" agents/sprint-master-planner.md` ≥ 1 |
| IP-S4-08 | F4 §2 master-plan row | grep §2 table includes master-plan |
| IP-S4-09 | F4 §9 new section | `grep -c "^## 9. Master Plan Generator" docs/06-guide/sprint-management.guide.md` ≥ 1 |
| IP-S4-10 | L3 10/10 PASS | `node tests/contract/v2113-sprint-contracts.test.js` output `10/10 PASS` |
| IP-S4-11 | Doc=Code 0 drift | 4 docs + 4 code files synced |
| IP-S4-12 | Master sprint closure | Phase 7 Report includes master closure summary |

---

## 4. Acceptance Criteria — Commit-Ready Verification Commands

### 4.1 AC-L3-Contract (12 criteria)

| AC# | Command | Pass |
|-----|---------|------|
| AC-L3-1 | `node tests/contract/v2113-sprint-contracts.test.js; echo $?` | "0" |
| AC-L3-2 | `node tests/contract/v2113-sprint-contracts.test.js 2>&1 \| grep -c "10/10 PASS"` | "1" |
| AC-L3-3 | SC-04: 16 actions | inline test |
| AC-L3-4 | SC-04: master-plan included | inline test |
| AC-L3-5 | SC-06: 19 entries | inline test |
| AC-L3-6 | SC-06: master_plan_created | inline test |
| AC-L3-7 | SC-09: master-plan ok+plan+paths | inline test |
| AC-L3-8 | SC-09: markdown created | inline test |
| AC-L3-9 | SC-09: state schema 1.0 | inline test |
| AC-L3-10 | SC-09: audit entry | inline test |
| AC-L3-11 | SC-10: estimate default 33350 | inline test |
| AC-L3-12 | SC-10: sprint shape 6 keys | inline test |

### 4.2 AC-Master-Plan-Wiring (5 criteria)

| AC# | Command | Pass |
|-----|---------|------|
| AC-MPW-1 | `node -e "..." no-deps call → sprints.length === 0` | "true" |
| AC-MPW-2 | `node -e "..." deps.contextSizer inject → sprints.length > 0` | "true" |
| AC-MPW-3 | cycle case via contextSizer → silent fallback | sprints:[] |
| AC-MPW-4 | contextSizer throws → silent fallback | no error |
| AC-MPW-5 | `grep -c "deps.contextSizer\|d.contextSizer" lib/application/sprint-lifecycle/master-plan.usecase.js` | ≥ 1 |

### 4.3 AC-Agent-Body (4 criteria)

| AC# | Command | Pass |
|-----|---------|------|
| AC-AB-1 | frontmatter diff vs 9a99948 line 1-26 | empty |
| AC-AB-2 | `grep -c "Sprint Split Heuristics (Programmatic API)" agents/sprint-master-planner.md` | "1" |
| AC-AB-3 | `grep -c "recommendSprintSplit" agents/sprint-master-planner.md` | ≥ 1 |
| AC-AB-4 | body English (no CJK) | `awk '/^---$/{c++; if(c==2)f=1; next} f' agents/sprint-master-planner.md \| grep -cP '[\\p{Hangul}\\p{Han}\\p{Hiragana}\\p{Katakana}]'` = "0" |

### 4.4 AC-Korean-Guide (5 criteria)

| AC# | Command | Pass |
|-----|---------|------|
| AC-KG-1 | `grep -c "## 2. 16 Sub-actions" docs/06-guide/sprint-management.guide.md` | "1" |
| AC-KG-2 | `awk '/^## 2/{f=1} /^## 3/{f=0} f' docs/06-guide/sprint-management.guide.md \| grep -c "master-plan"` | ≥ 1 |
| AC-KG-3 | `grep -c "^## 9. Master Plan Generator" docs/06-guide/sprint-management.guide.md` | "1" |
| AC-KG-4 | `awk '/^## 9/{f=1} /^## 부록/{f=0} f' docs/06-guide/sprint-management.guide.md \| grep -c "^### 9\\."` | ≥ 7 (sub-sections) |
| AC-KG-5 | `awk '/^## 9/{f=1; c=0} /^## 부록/{f=0} f {c++} END {print c}' docs/06-guide/sprint-management.guide.md` | ≥ 100 |

### 4.5 AC-Invariants (4 criteria)

| AC# | Command | Pass |
|-----|---------|------|
| AC-INV-1 | `git diff 9a99948..HEAD -- lib/domain/sprint/ \| wc -l` | "0" |
| AC-INV-2 | smoke test handleSprintAction('master-plan', { id, name }, {}) → ok:true | true |
| AC-INV-3 | `claude plugin validate .` | exit 0 (F9-120 16-cycle) |
| AC-INV-4 | hooks.json 21:24 | events 21 blocks 24 |

**Cumulative AC**: **30 criteria**.

---

## 5. Implementation Order (Phase 4 Do — sequential)

### Step 1: F4 sprint-management.guide.md §2 update + §9 new (Korean doc first — no code dependencies)
- §2 title 15→16, table row +1
- §9 new ~120 lines (7 sub-sections)
- Verify: AC-KG-1~5

### Step 2: F3 agents/sprint-master-planner.md body update
- Section title (S3-UX FC) → (Programmatic API)
- Code example block
- Verify: AC-AB-1~4

### Step 3: F2 master-plan.usecase.js auto-wiring
- Insert auto-wiring block before Step 4 plan object
- Update plan.sprints + plan.dependencyGraph
- JSDoc additions
- Verify: backward compat smoke test (no deps → sprints:[]), inject smoke test (deps → sprints populated)

### Step 4: F1 tests/contract/v2113-sprint-contracts.test.js patches
- SC-04 update (15→16, master-plan in expected)
- SC-06 update (18→19, master_plan_created)
- SC-09 new function (master-plan invocation chain)
- SC-10 new function (context-sizer contract)
- Runner update (add 2 new records)
- Verify: `node tests/contract/v2113-sprint-contracts.test.js` 10/10 PASS

### Step 5: AC-INV invariant verification
- Sprint 1 Domain 0 LOC delta
- SKILL.md, sprint-handler.js, audit-logger.js 0 LOC delta
- bkit.config.json 0 LOC delta
- agent frontmatter 0 change

### Step 6: F9-120 16-cycle validate
- `claude plugin validate .` Exit 0

### Step 7: Single Phase 4 Do commit
- 4 files in single commit

---

## 6. Token Budget Estimate

| Phase | Target |
|-------|--------|
| PRD (Phase 1) | 574 lines committed (`614eaf5`) ≈ 18K |
| Plan (Phase 2) | this doc ~700 lines ≈ 21K |
| Design (Phase 3) | ~800 lines ≈ 24K |
| Do (Phase 4) | 4 files ~245 LOC + tests + verifications ≈ 25K |
| Iterate (Phase 5) | matchRate 100% ≈ 2K |
| QA (Phase 6) | 7-perspective + 30 AC + master closure check ≈ 15K |
| Report (Phase 7) | ~700 lines incl. master closure ≈ 20K |

**Cumulative**: ~125K tokens for S4-UX (Master Plan §5.1 ~35K incremental implementation + docs separate).

---

## 7. Plan Final Checklist

- [x] **R1-R10 10 requirements** — §1 매트릭스
- [x] **PM-S4A~E 5 resolutions** — §0.2 + §2 detailed
- [x] **SC-09 + SC-10 pseudo-code** — §2.1 + §2.2
- [x] **12 IPs implementation plan** — §3
- [x] **30 AC commit-ready** — §4
- [x] **Implementation order 7 steps** — §5
- [x] **Token budget** — §6
- [x] **사용자 명시 1-8** — agents English / docs Korean / additive / backward compat / pure function / Phase 1-7
- [x] **Sprint 1 invariant 0 변경** — R10
- [x] **S2-UX backward compat** — R6 explicit
- [x] **S3-UX 0 LOC delta** — R10 explicit
- [x] **F9-120 16-cycle** — R10 + AC-INV-3
- [x] **L3 10/10 PASS** — R1-R5 + AC-L3-2
- [x] **Cumulative TCs 250+** — 226 baseline + L3 10 + smoke 14+ = 250+
- [x] **Master sprint closure ready** — Phase 7 Report scope

---

**Plan Status**: ★ **Draft v1.0 완료**.
**Next**: Phase 3 Design — exact diff hunks + Korean §9 structure pseudo-code.
**예상 소요**: Phase 3 Design ~40분.
**PM-S4A~E**: 5/5 resolved.
**30/30 AC commit-ready**.
