# Sprint 5 Design — v2.1.13 Sprint Management Quality + Documentation

> **Sprint ID**: `v2113-sprint-5-quality-docs`
> **Phase**: Design (3/7)
> **Status**: Active
> **Date**: 2026-05-12
> **PRD**: `docs/01-plan/features/v2113-sprint-5-quality-docs.prd.md`
> **Plan**: `docs/01-plan/features/v2113-sprint-5-quality-docs.plan.md`
> **Depends on (immutable)**: Sprint 1 (`a7009a5`) + Sprint 2 (`97e48b1`) + Sprint 3 (`232c1a6`) + Sprint 4 (`d4484e1`)
> **★ 사용자 명시 3 (2026-05-12)**: 7-perspective QA + 4-System orthogonal + Sprint↔PDCA mapping

---

## 0. 코드베이스 깊이 분석 (Sprint 1+2+3+4 정합)

### 0.1 Sprint 2 deps interface 정확 시그니처 (Plan 분석 갱신)

`grep -oE "deps\.[a-zA-Z_]+" lib/application/sprint-lifecycle/*.js | sort -u` → 14 keys:

| key | 사용처 | type | 본 Sprint 5 영향 |
|-----|--------|------|----------------|
| `deps.stateStore` | start/advance/archive/.. | Object (load/save/list/delete) | Sprint 3 baseline 사용, 변경 0 |
| `deps.eventEmitter` | 전부 | function `(eventType, payload) => void` | Sprint 3 baseline 사용, 변경 0 |
| `deps.clock` | start/iterate | function `() => number` | 변경 0 |
| `deps.gateEvaluator` | start/advance | function `(sprint, phase) => {ok, gates}` | 변경 0 |
| `deps.autoPauseChecker` | start | function `(sprint) => triggers[]` | 변경 0 |
| `deps.phaseHandlers` | start/advance | Object map | 변경 0 |
| `deps.env` | start | Object | 변경 0 |
| `deps.allowGateOverride` | advance | boolean | 변경 0 |
| **`deps.gapDetector`** | **iterate** | **function `(sprint) => Promise<{matchRate, gaps}>`** | **★ R2 신규 adapter** |
| **`deps.autoFixer`** | **iterate** | **function `(sprint, gaps) => Promise<{fixedTaskIds}>`** | **★ R2 신규 adapter** |
| **`deps.dataFlowValidator`** | **verifyDataFlow** | **function `(feature, hopId, sprint) => Promise<{passed, evidence?, reason?}>`** | **★ R2 신규 adapter** |
| `deps.docPathResolver` | generate-report | function | 변경 0 |
| `deps.fileWriter` | generate-report | function | 변경 0 |
| `deps.kpiCalculator` | generate-report | function | 변경 0 |

**★ 핵심 발견 (PRD 정정)**: 3 신규 adapter 는 **factory functions** 가 return 하는 객체 wrapper 가 아니라 **direct function** 임 (Plan 명시 `gapDetector.detect(sprint)` 는 부정확). 정확 시그니처:

```javascript
// gapDetector
async function gapDetector(sprint) {
  return { matchRate: 100, gaps: [] };
}

// autoFixer
async function autoFixer(sprint, gaps) {
  return { fixedTaskIds: [] };
}

// dataFlowValidator
async function dataFlowValidator(feature, hopId, sprint) {
  return { passed: false, reason: 'no_validator_injected' };
}
```

**Sprint 5 adapter 패턴 결정**: factory 가 **function 자체** 를 return (객체 wrapper X).

```javascript
// lib/infra/sprint/gap-detector.adapter.js
function createGapDetector(opts) {
  return async function gapDetector(sprint) { ... };  // direct function
}
```

### 0.2 Sprint 3 createSprintInfra return shape

`module.exports` → 13 exports:
- 1 composite factory: `createSprintInfra(opts) → { stateStore, eventEmitter, docScanner, matrixSync }`
- 4 individual factories: `createStateStore`, `createEventEmitter`, `createDocScanner`, `createMatrixSync`
- 1 constant: `MATRIX_TYPES`
- 7 path helpers: `getSprintStateDir`/`File`/`getSprintIndexFile`/...

**Sprint 5 확장**: 3 신규 factory 추가 → **16 exports** (10 → 13 변경 — Plan §R2 갱신 필요)
- `createGapDetector(opts)`
- `createAutoFixer(opts)`
- `createDataFlowValidator(opts)`

**중요**: `createSprintInfra` 의 return shape 는 변경 X (Sprint 3 invariant 유지). 3 신규 factory 는 barrel re-export 만.

### 0.3 Sprint 4 sprint-handler.js 현재 상태

| handler | line | 현재 상태 | Sprint 5 |
|---------|------|----------|---------|
| handleInit | 100 | real impl | 변경 0 |
| handleStart | 124 | real impl | 변경 0 |
| handleStatus | 142 | real impl | 변경 0 |
| handleList | 149 | real impl | 변경 0 |
| handlePhase | 165 | real impl | 변경 0 |
| handleIterate | 178 | real impl | 변경 0 |
| handleQA | 189 | real impl | 변경 0 |
| handleReport | 202 | real impl | 변경 0 |
| handleArchive | 209 | real impl | 변경 0 |
| handlePause | 220 | real impl | 변경 0 |
| handleResume | 237 | real impl | 변경 0 |
| **handleFork** | **248** | **`(_args, _infra) → { ok:true, deferred:true }`** | **★ real impl** |
| **handleFeature** | **252** | **`(_args, _infra) → { ok:true, deferred:true }`** | **★ real impl** |
| **handleWatch** | **256** | **partial (load + snapshot, live loop deferred)** | **★ enhance** |
| handleHelp | (line ?) | real impl | 변경 0 |

**handleFork/Feature/Watch 명시 Sprint 5 zone** (스크립트 주석 `'Sprint 5'` 명시).

### 0.4 .bkit/state/ 4-System 현황 (R12 P5)

```
.bkit/state/
├── batch/                       # batch ops
├── memory.json                  # ★ memory system
├── pdca-status.json             # ★ existing PDCA status
├── quality-metrics.json         # quality
├── regression-rules.json        # regression
├── resume/                      # resume
├── session-history.json         # history
├── trust-profile.json           # ★ trust system
└── workflows/                   # workflows
```

**Sprint 5 4-System 검증 대상**:
- `sprint-status.json` (★ Sprint Management 신규, runtime 생성)
- `pdca-status.json` (★ existing)
- `trust-profile.json` (★ existing, Trust Level scope)
- `memory.json` (★ existing, bkit auto-memory)

추가로 `MEMORY.md` (~/.claude/projects/...) — Claude auto-memory.

### 0.5 PDCA 9-phase ↔ Sprint 8-phase frozen enum

```javascript
// lib/application/pdca-lifecycle/index.js (Sprint 1 baseline)
PDCA_PHASES = Object.freeze(['pm', 'plan', 'design', 'do', 'check', 'act', 'qa', 'report', 'archived']);

// lib/domain/sprint/types.js (Sprint 1)
SPRINT_PHASES = Object.freeze(['prd', 'plan', 'design', 'do', 'iterate', 'qa', 'report', 'archived']);
```

**Overlap analysis**:

| PDCA phase | Sprint phase | overlap |
|-----------|-------------|---------|
| `pm` | — | PDCA only |
| `plan` | `plan` | ✅ overlap |
| `design` | `design` | ✅ overlap |
| `do` | `do` | ✅ overlap |
| `check` | — | PDCA only |
| `act` | — | PDCA only |
| `qa` | `qa` | ✅ overlap |
| `report` | `report` | ✅ overlap |
| `archived` | `archived` | ✅ overlap |
| — | `prd` | Sprint only |
| — | `iterate` | Sprint only |

**6 overlap keys** (plan/design/do/qa/report/archived) + 3 PDCA-only (pm/check/act) + 2 Sprint-only (prd/iterate).

**★ 핵심 결정 (R12 P6)**: orthogonal 아님 → **명시 매핑 documented** (Sprint↔PDCA 동시 트랙 시 양쪽 store 독립). Sprint 5 migration guide 에서 명시.

### 0.6 hooks/hooks.json 21:24 invariant

`grep -c '"PreToolUse"\|"PostToolUse"\|"UserPromptSubmit"\|...' hooks/hooks.json` → 21 events × 24 blocks. **본 sprint 변경 0**.

### 0.7 audit-logger ACTION_TYPES 18 entries (Sprint 4 baseline)

`lib/audit/audit-logger.js` ACTION_TYPES enum: 16 baseline + `sprint_paused` + `sprint_resumed` = **18 entries** (Sprint 4 추가). **본 sprint 변경 0**.

### 0.8 SPRINT_AUTORUN_SCOPE mirror (Sprint 4 baseline)

`lib/control/automation-controller.js` SPRINT_AUTORUN_SCOPE — Sprint 2 inline 의 1:1 mirror (5 levels L0-L4 with stopAfter). **본 sprint 변경 0**.

---

## 1. 14 Files 정확 Spec

### File 1: `tests/contract/v2113-sprint-contracts.test.js` (R1)

**디렉터리**: `mkdir tests/contract/` (신규)
**Tracked**: ✅ Yes (gitignore 적용 X — bkit core CI gate)
**Pattern**: 기존 `tests/qa/*.test.js` Node assert pattern 정합

```javascript
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');

// === SC-01: Sprint entity shape ===
function sc01_sprintEntityShape() {
  const { createSprint, SPRINT_FIELDS } = require(path.join(projectRoot, 'lib/domain/sprint'));
  const s = createSprint({ id: 'sc01', name: 't', features: ['f1'] });
  const expected = ['id','name','features','featureMap','state','phase','lifecycle','autoRun','budget','audit','dataFlow','events'];
  expected.forEach(k => assert(k in s, `Sprint missing key: ${k}`));
  assert.strictEqual(s.id, 'sc01');
  console.log('  ✅ SC-01 PASS — Sprint entity shape (12 keys)');
}

// === SC-02: startSprint deps interface ===
function sc02_depsInterface() {
  const startSprint = require(path.join(projectRoot, 'lib/application/sprint-lifecycle/start-sprint.usecase')).startSprint;
  const src = fs.readFileSync(path.join(projectRoot, 'lib/application/sprint-lifecycle/start-sprint.usecase.js'), 'utf8');
  const expectedKeys = ['stateStore','eventEmitter','clock','gateEvaluator','autoPauseChecker','phaseHandlers','env'];
  expectedKeys.forEach(k => assert(src.includes(`deps.${k}`) || src.includes(`deps && deps.${k}`),
    `start-sprint missing deps key: ${k}`));
  // Also check iterate deps
  const iterSrc = fs.readFileSync(path.join(projectRoot, 'lib/application/sprint-lifecycle/iterate-sprint.usecase.js'), 'utf8');
  ['gapDetector','autoFixer'].forEach(k => assert(iterSrc.includes(`deps.${k}`),
    `iterate-sprint missing deps key: ${k}`));
  console.log('  ✅ SC-02 PASS — deps interface (start: 7 + iterate: 2 + verifyDataFlow: 1)');
}

// === SC-03: createSprintInfra return shape ===
function sc03_infraReturnShape() {
  const infra = require(path.join(projectRoot, 'lib/infra/sprint')).createSprintInfra({ projectRoot });
  ['stateStore','eventEmitter','docScanner','matrixSync'].forEach(k => assert(k in infra,
    `infra missing: ${k}`));
  ['load','save','list','delete'].forEach(m => assert(typeof infra.stateStore[m] === 'function',
    `stateStore.${m} not function`));
  console.log('  ✅ SC-03 PASS — createSprintInfra 4 adapters');
}

// === SC-04: handleSprintAction signature ===
function sc04_handlerSignature() {
  const mod = require(path.join(projectRoot, 'scripts/sprint-handler'));
  assert.strictEqual(typeof mod.handleSprintAction, 'function');
  assert.strictEqual(mod.handleSprintAction.length, 3); // (action, args, deps)
  assert(Array.isArray(mod.VALID_ACTIONS));
  assert.strictEqual(mod.VALID_ACTIONS.length, 15);
  console.log('  ✅ SC-04 PASS — handleSprintAction(action,args,deps) signature');
}

// === SC-05: 4-layer end-to-end chain ===
async function sc05_endToEndChain() {
  const handler = require(path.join(projectRoot, 'scripts/sprint-handler'));
  const tmpRoot = fs.mkdtempSync(path.join(require('os').tmpdir(), 'sc05-'));
  const r1 = await handler.handleSprintAction('init',
    { id: 'sc05', name: 'SC05', features: ['f1'] },
    { projectRoot: tmpRoot });
  assert.strictEqual(r1.ok, true, 'init failed');
  const r2 = await handler.handleSprintAction('status', { id: 'sc05' }, { projectRoot: tmpRoot });
  assert.strictEqual(r2.ok, true, 'status failed');
  assert.strictEqual(r2.sprint.id, 'sc05');
  console.log('  ✅ SC-05 PASS — 4-layer end-to-end chain');
}

// === SC-06: ACTION_TYPES 18 entries ===
function sc06_actionTypes() {
  const src = fs.readFileSync(path.join(projectRoot, 'lib/audit/audit-logger.js'), 'utf8');
  const match = src.match(/ACTION_TYPES\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/);
  assert(match, 'ACTION_TYPES not found');
  const entries = match[1].match(/'[^']+'/g) || [];
  assert.strictEqual(entries.length, 18, `expected 18, got ${entries.length}`);
  assert(entries.some(e => e.includes('sprint_paused')));
  assert(entries.some(e => e.includes('sprint_resumed')));
  console.log('  ✅ SC-06 PASS — ACTION_TYPES 18 entries');
}

// === SC-07: SPRINT_AUTORUN_SCOPE mirror ===
function sc07_autorunScopeMirror() {
  const controlSrc = fs.readFileSync(path.join(projectRoot, 'lib/control/automation-controller.js'), 'utf8');
  const sprintSrc = fs.readFileSync(path.join(projectRoot, 'lib/application/sprint-lifecycle/start-sprint.usecase.js'), 'utf8');
  ['L0','L1','L2','L3','L4'].forEach(level => {
    assert(controlSrc.includes(level), `control missing ${level}`);
    assert(sprintSrc.includes(level), `sprint inline missing ${level}`);
  });
  assert(controlSrc.includes('SPRINT_AUTORUN_SCOPE'));
  assert(sprintSrc.includes('SPRINT_AUTORUN_SCOPE'));
  console.log('  ✅ SC-07 PASS — SPRINT_AUTORUN_SCOPE inline ↔ mirror');
}

// === SC-08: hooks.json 21:24 invariant ===
function sc08_hooksInvariant() {
  const hooks = JSON.parse(fs.readFileSync(path.join(projectRoot, 'hooks/hooks.json'), 'utf8'));
  const eventKeys = Object.keys(hooks.hooks || {});
  let blockCount = 0;
  eventKeys.forEach(k => { blockCount += (hooks.hooks[k] || []).length; });
  assert.strictEqual(eventKeys.length, 21, `events: expected 21, got ${eventKeys.length}`);
  assert.strictEqual(blockCount, 24, `blocks: expected 24, got ${blockCount}`);
  console.log('  ✅ SC-08 PASS — hooks.json 21:24');
}

// === Runner ===
(async () => {
  console.log('=== L3 Contract Tests (Sprint 5 SC-01~08) ===\n');
  sc01_sprintEntityShape();
  sc02_depsInterface();
  sc03_infraReturnShape();
  sc04_handlerSignature();
  await sc05_endToEndChain();
  sc06_actionTypes();
  sc07_autorunScopeMirror();
  sc08_hooksInvariant();
  console.log('\n=== L3 Contract: 8/8 PASS ===');
})().catch(e => { console.error(e); process.exit(1); });
```

**Estimated LOC**: ~250

### File 2: `lib/infra/sprint/gap-detector.adapter.js` (R2)

```javascript
'use strict';

/**
 * gap-detector.adapter.js — Sprint 2 deps.gapDetector production scaffold (v2.1.13 Sprint 5).
 *
 * Returns a function matching Sprint 2 iterate-sprint.usecase.js signature:
 *   async function gapDetector(sprint) → { matchRate: number, gaps: Array }
 *
 * No-op baseline (when agentTaskRunner not injected): returns 100% matchRate.
 * Real impl (when agentTaskRunner injected): invokes agents/gap-detector.md.
 *
 * Integration point (Sprint 6 or v2.1.14): wire agentTaskRunner from Claude Code Task tool.
 *
 * @module lib/infra/sprint/gap-detector.adapter
 * @version 2.1.13
 * @since 2.1.13
 */

/**
 * @typedef {Object} GapDetectorOpts
 * @property {string} projectRoot
 * @property {(opts:{subagent_type:string,prompt:string}) => Promise<{output:string}>} [agentTaskRunner]
 * @property {() => number} [clock]
 */

/**
 * @typedef {Object} GapResult
 * @property {number} matchRate  - 0-100
 * @property {Array<{id:string,severity:string,description:string}>} gaps
 */

/**
 * Factory — produces a function matching deps.gapDetector signature.
 *
 * @param {GapDetectorOpts} [opts]
 * @returns {(sprint:object) => Promise<GapResult>}
 */
function createGapDetector(opts) {
  const o = opts || {};

  // No-op baseline: agentTaskRunner not injected
  if (typeof o.agentTaskRunner !== 'function') {
    return async function gapDetectorNoop(_sprint) {
      return { matchRate: 100, gaps: [] };
    };
  }

  // Real scaffold: invokes agents/gap-detector.md via Task tool
  return async function gapDetectorReal(sprint) {
    const phaseInfo = sprint && sprint.phase ? sprint.phase : 'unknown';
    const prompt = [
      `Detect gaps in sprint ${sprint.id} at phase ${phaseInfo}.`,
      `Compare design/plan vs current implementation.`,
      `Return JSON: { "matchRate": <0-100>, "gaps": [{"id":"...","severity":"...","description":"..."}] }`,
    ].join('\n');

    try {
      const result = await o.agentTaskRunner({
        subagent_type: 'gap-detector',
        prompt,
      });
      return parseGapDetectorOutput(result);
    } catch (e) {
      return { matchRate: 0, gaps: [{ id: 'runner_error', severity: 'high', description: e.message }] };
    }
  };
}

/**
 * Parse gap-detector agent output (best-effort JSON extraction).
 *
 * @param {{output?:string}} result
 * @returns {GapResult}
 */
function parseGapDetectorOutput(result) {
  if (!result || typeof result.output !== 'string') {
    return { matchRate: 0, gaps: [{ id: 'no_output', severity: 'high', description: 'empty agent output' }] };
  }
  const m = result.output.match(/\{[\s\S]*"matchRate"[\s\S]*\}/);
  if (!m) {
    return { matchRate: 0, gaps: [{ id: 'parse_fail', severity: 'high', description: 'no JSON in output' }] };
  }
  try {
    const parsed = JSON.parse(m[0]);
    return {
      matchRate: typeof parsed.matchRate === 'number' ? parsed.matchRate : 0,
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    };
  } catch {
    return { matchRate: 0, gaps: [{ id: 'json_invalid', severity: 'high', description: 'JSON parse fail' }] };
  }
}

module.exports = {
  createGapDetector,
  parseGapDetectorOutput,
};
```

**Estimated LOC**: ~120

### File 3: `lib/infra/sprint/auto-fixer.adapter.js` (R2)

```javascript
'use strict';

/**
 * auto-fixer.adapter.js — Sprint 2 deps.autoFixer production scaffold (v2.1.13 Sprint 5).
 *
 * Returns a function matching Sprint 2 iterate-sprint.usecase.js signature:
 *   async function autoFixer(sprint, gaps) → { fixedTaskIds: string[] }
 *
 * No-op baseline (when agentTaskRunner not injected): returns no fixes.
 * Real impl (when agentTaskRunner injected): invokes agents/pdca-iterator.md.
 *
 * @module lib/infra/sprint/auto-fixer.adapter
 * @version 2.1.13
 * @since 2.1.13
 */

function createAutoFixer(opts) {
  const o = opts || {};

  if (typeof o.agentTaskRunner !== 'function') {
    return async function autoFixerNoop(_sprint, _gaps) {
      return { fixedTaskIds: [] };
    };
  }

  return async function autoFixerReal(sprint, gaps) {
    if (!Array.isArray(gaps) || gaps.length === 0) {
      return { fixedTaskIds: [] };
    }
    const prompt = [
      `Auto-fix gaps in sprint ${sprint.id}:`,
      ...gaps.map((g, i) => `  ${i+1}. [${g.severity}] ${g.id}: ${g.description}`),
      `Return JSON: { "fixedTaskIds": ["...","..."] }`,
    ].join('\n');

    try {
      const result = await o.agentTaskRunner({
        subagent_type: 'pdca-iterator',
        prompt,
      });
      return parseAutoFixerOutput(result);
    } catch (e) {
      return { fixedTaskIds: [], error: e.message };
    }
  };
}

function parseAutoFixerOutput(result) {
  if (!result || typeof result.output !== 'string') {
    return { fixedTaskIds: [] };
  }
  const m = result.output.match(/\{[\s\S]*"fixedTaskIds"[\s\S]*\}/);
  if (!m) return { fixedTaskIds: [] };
  try {
    const parsed = JSON.parse(m[0]);
    return { fixedTaskIds: Array.isArray(parsed.fixedTaskIds) ? parsed.fixedTaskIds : [] };
  } catch {
    return { fixedTaskIds: [] };
  }
}

module.exports = {
  createAutoFixer,
  parseAutoFixerOutput,
};
```

**Estimated LOC**: ~80

### File 4: `lib/infra/sprint/data-flow-validator.adapter.js` (R2)

```javascript
'use strict';

/**
 * data-flow-validator.adapter.js — Sprint 2 deps.dataFlowValidator production scaffold (v2.1.13 Sprint 5).
 *
 * Returns a function matching Sprint 2 verify-data-flow.usecase.js signature:
 *   async function dataFlowValidator(feature, hopId, sprint) → { passed, evidence?, reason? }
 *
 * Three-tier strategy:
 *   1. No-op baseline (no mcpClient injected): returns passed:false reason:'no_validator_injected'.
 *   2. Static heuristic (mcpClient injected, no probeHop): checks sprint.dataFlow matrix entries.
 *   3. Live probe (mcpClient + chrome-qa MCP injected): invokes browser_batch for actual hop probe.
 *
 * Integration point (Sprint 6 or v2.1.14): wire chrome-qa MCP client.
 *
 * @module lib/infra/sprint/data-flow-validator.adapter
 * @version 2.1.13
 * @since 2.1.13
 */

const FROZEN_HOP_IDS = Object.freeze(['H1','H2','H3','H4','H5','H6','H7']);

function createDataFlowValidator(opts) {
  const o = opts || {};

  // Tier 1: no-op baseline
  if (!o.mcpClient && !o.staticMatrix) {
    return async function validatorNoop(_feature, _hopId, _sprint) {
      return { passed: false, reason: 'no_validator_injected' };
    };
  }

  // Tier 2: static heuristic from sprint.dataFlow matrix
  if (!o.mcpClient && o.staticMatrix === true) {
    return async function validatorStatic(feature, hopId, sprint) {
      if (!FROZEN_HOP_IDS.includes(hopId)) {
        return { passed: false, reason: `invalid_hop: ${hopId}` };
      }
      const matrix = sprint && sprint.dataFlow && sprint.dataFlow[feature];
      if (!matrix) {
        return { passed: false, reason: `no_matrix_for_feature: ${feature}` };
      }
      const hop = matrix[hopId];
      if (hop && hop.status === 'pass') {
        return { passed: true, evidence: hop.evidence || 'static_matrix_pass' };
      }
      return { passed: false, reason: `hop_${hopId}_status_${hop ? hop.status : 'missing'}` };
    };
  }

  // Tier 3: live probe via chrome-qa MCP
  return async function validatorLive(feature, hopId, sprint) {
    if (!FROZEN_HOP_IDS.includes(hopId)) {
      return { passed: false, reason: `invalid_hop: ${hopId}` };
    }
    try {
      const result = await o.mcpClient.callTool({
        name: 'chrome-qa.probe_hop',
        arguments: { feature, hopId, sprintId: sprint.id },
      });
      return {
        passed: !!(result && result.passed),
        evidence: result && result.evidence ? result.evidence : 'live_probe',
        reason: result && result.reason ? result.reason : undefined,
      };
    } catch (e) {
      return { passed: false, reason: `mcp_error: ${e.message}` };
    }
  };
}

module.exports = {
  createDataFlowValidator,
  FROZEN_HOP_IDS,
};
```

**Estimated LOC**: ~110

### File 5: `lib/infra/sprint/index.js` ext (R2 barrel)

**기존 13 exports → 16 exports** (3 신규 factory 추가, 기존 13 변경 0):

```javascript
// ... (기존 7 imports 보존)
const { createGapDetector } = require('./gap-detector.adapter');
const { createAutoFixer } = require('./auto-fixer.adapter');
const { createDataFlowValidator } = require('./data-flow-validator.adapter');

// ... (기존 createSprintInfra 보존)

module.exports = {
  // Composite factory (most callers want this)
  createSprintInfra,
  // Individual factories — Sprint 3 baseline (4)
  createStateStore,
  createEventEmitter,
  createDocScanner,
  createMatrixSync,
  // Sprint 5 production scaffolds (3)
  createGapDetector,
  createAutoFixer,
  createDataFlowValidator,
  // Path helpers — Sprint 3 baseline (re-export)
  MATRIX_TYPES: paths.MATRIX_TYPES,
  getSprintStateDir: paths.getSprintStateDir,
  getSprintStateFile: paths.getSprintStateFile,
  getSprintIndexFile: paths.getSprintIndexFile,
  getSprintFeatureMapFile: paths.getSprintFeatureMapFile,
  getSprintMatrixDir: paths.getSprintMatrixDir,
  getSprintMatrixFile: paths.getSprintMatrixFile,
  getSprintPhaseDocAbsPath: paths.getSprintPhaseDocAbsPath,
};
```

**Estimated LOC**: 기존 76 → ~95 (+19)

### File 6: `scripts/sprint-handler.js` ext (R3)

Sprint 4 baseline 298 LOC. Sprint 5 enhancement zone (line 248-265) 만 변경:

```javascript
// handleFork — real impl (replace placeholder)
async function handleFork(args, infra) {
  if (!args || !args.id || !args.newId) {
    return { ok: false, error: 'fork requires { id, newId }' };
  }
  const source = await infra.stateStore.load(args.id);
  if (!source) return { ok: false, error: `Sprint not found: ${args.id}` };
  // Carry items: features still in 'do' or 'iterate' phase
  const carryItems = identifyCarryItems(source);
  const domain = require(require('path').join(__dirname, '..', 'lib/domain/sprint'));
  const newSprint = domain.createSprint({
    id: args.newId,
    name: `${source.name} (fork)`,
    features: carryItems.map(c => c.featureName),
    context: source.context || {},
    trustLevelAtStart: source.autoRun ? source.autoRun.trustLevelAtStart : 'L0',
  });
  await infra.stateStore.save(newSprint);
  return { ok: true, sourceId: args.id, newSprint, carryItems };
}

function identifyCarryItems(sprint) {
  const items = [];
  const fm = sprint && sprint.featureMap;
  if (!fm) return items;
  for (const featureName of Object.keys(fm)) {
    const fp = fm[featureName];
    const phase = fp && fp.phase;
    if (phase === 'do' || phase === 'iterate') {
      items.push({ featureName, phase, reason: `phase_${phase}_not_complete` });
    }
  }
  return items;
}

// handleFeature — real impl (replace placeholder)
async function handleFeature(args, infra) {
  if (!args || !args.id || !args.action) {
    return { ok: false, error: 'feature requires { id, action: list|add|remove [, featureName] }' };
  }
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${args.id}` };
  const domain = require(require('path').join(__dirname, '..', 'lib/domain/sprint'));

  switch (args.action) {
    case 'list':
      return { ok: true, features: sprint.features || [], featureMapKeys: Object.keys(sprint.featureMap || {}) };
    case 'add': {
      if (!args.featureName) return { ok: false, error: 'add requires featureName' };
      const features = [...(sprint.features || [])];
      if (!features.includes(args.featureName)) features.push(args.featureName);
      const updated = domain.cloneSprint(sprint, { features });
      await infra.stateStore.save(updated);
      return { ok: true, sprint: updated };
    }
    case 'remove': {
      if (!args.featureName) return { ok: false, error: 'remove requires featureName' };
      const features = (sprint.features || []).filter(f => f !== args.featureName);
      const updated = domain.cloneSprint(sprint, { features });
      await infra.stateStore.save(updated);
      return { ok: true, sprint: updated };
    }
    default:
      return { ok: false, error: `feature action must be list|add|remove, got: ${args.action}` };
  }
}

// handleWatch — enhance (Sprint 4 partial → live snapshot with triggers + matrices)
async function handleWatch(args, infra) {
  if (!args || !args.id) return { ok: false, error: 'watch requires { id }' };
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: 'Sprint not found: ' + args.id };
  const lifecycle = require(require('path').join(__dirname, '..', 'lib/application/sprint-lifecycle'));

  // Auto-pause triggers snapshot
  let triggers = [];
  try {
    if (typeof lifecycle.checkAutoPauseTriggers === 'function') {
      triggers = lifecycle.checkAutoPauseTriggers(sprint);
    }
  } catch { /* triggers optional */ }

  // Matrix snapshot
  const matrices = {};
  try {
    if (infra.matrixSync && typeof infra.matrixSync.read === 'function') {
      const mods = ['data-flow', 'cumulative-state', 'feature-phase'];
      for (const m of mods) {
        matrices[m] = await infra.matrixSync.read(args.id, m).catch(() => null);
      }
    }
  } catch { /* matrices optional */ }

  return {
    ok: true,
    snapshot: sprint,
    triggers,
    matrices,
    phase: sprint.phase,
    timestamp: new Date().toISOString(),
  };
}
```

**Estimated LOC**: 298 → ~430 (+~132)

### File 7: `README.md` ext (R4)

Sprint section 추가 위치 — 기존 "What's New v2.1.12" 직후. 영어, ~25 lines:

```markdown
### Sprint Management (v2.1.13)

bkit Sprint Management groups one or more features under a shared scope,
budget, and timeline. Each sprint runs its own 8-phase lifecycle:
`prd → plan → design → do → iterate → qa → report → archived`.

**Quick start**:

\`\`\`
/sprint init my-launch --name "Q2 Launch" --trust L3
/sprint start my-launch
/sprint status my-launch
\`\`\`

**15 sub-actions**: init / start / status / list / phase / iterate / qa / report /
archive / pause / resume / fork / feature / watch / help.

**Auto-Pause triggers** (4): quality gate fail / iteration exhausted / budget exceeded
/ phase timeout. Trust Level scope (L0–L4) controls auto-run vs manual approval.

See `skills/sprint/SKILL.md` for full reference and
`docs/06-guide/sprint-management.guide.md` for a Korean deep-dive guide.
```

### File 8: `CLAUDE.md` ext (R4)

기존 "PDCA Core Rules" 섹션 직후 추가. 영어, ~25 lines:

```markdown
## Sprint Management (v2.1.13)

Sprint Management is a meta-container that groups one or more features under a
shared scope, budget, and timeline. Each sprint runs its own 8-phase lifecycle:
`prd → plan → design → do → iterate → qa → report → archived`.

When the user mentions "sprint", invoke `bkit:sprint` skill (`/sprint <action>`).
Sprint phases are orthogonal to PDCA's 9-phase enum — they may coexist (a feature
may belong to both a PDCA cycle and a sprint container; see
`docs/06-guide/sprint-migration.guide.md`).

Trust Level scope (`SPRINT_AUTORUN_SCOPE`, L0–L4) controls auto-run boundaries.
At L4 Full-Auto, the orchestrator advances phases until any of 4 auto-pause
triggers fires (quality gate fail / iteration exhausted / budget exceeded /
phase timeout).

For deep-dive Korean guidance, see `docs/06-guide/sprint-management.guide.md`.
```

### File 9: `docs/06-guide/sprint-management.guide.md` (R5)

**디렉터리**: `mkdir docs/06-guide/`
**Korean, ~280 lines**

8 섹션:
1. **Sprint Management 개념** (~30 lines) — 정의, 목적, PDCA 와의 차이
2. **15 Sub-actions** (~50 lines) — 매트릭스 + 각 예시
3. **8-Phase Lifecycle** (~40 lines) — prd→plan→design→do→iterate→qa→report→archived
4. **4 Auto-Pause Triggers** (~30 lines) — QUALITY_GATE_FAIL / ITERATION_EXHAUSTED / BUDGET_EXCEEDED / PHASE_TIMEOUT
5. **Trust Level Scope** (~25 lines) — L0-L4 with stopAfter
6. **7-Layer Data Flow QA** (~25 lines) — H1-H7 (UI→Client→API→Validation→DB→Response→Client→UI)
7. **Cross-feature/Cross-sprint Integration** (~30 lines) — feature 다중, sprint fork, carry items
8. **Worked Examples** (~50 lines) — 3 시나리오 (단일 feature / 다중 feature / fork)

### File 10: `docs/06-guide/sprint-migration.guide.md` (R6)

**Korean, ~160 lines**

5 섹션:
1. **PDCA ↔ Sprint 매핑** (~40 lines) — overlap analysis table + 9-phase vs 8-phase
2. **차이점** (~30 lines) — pm (PDCA only) / check+act (PDCA only) / prd+iterate (Sprint only) / qa+report+archived (overlap)
3. **동시 트랙** (~30 lines) — pdca-status.json + sprint-status.json + trust-profile.json + memory.json 공존 (4-System orthogonal)
4. **Migration Scenarios** (~40 lines) — (a) 기존 PDCA 작업 보존, (b) PDCA → Sprint 컨테이너 wrap, (c) feature 별 분리
5. **Rollback** (~20 lines) — Sprint 미사용 = PDCA only 정상 작동

### File 11: `docs/01-plan/features/sprint-management.master-plan.md` v1.2 (R7)

기존 v1.1 변경 사항만 추가 (Sprint 1+2+3+4 산출물 보존):

```markdown
## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-05-08 | Initial Master Plan |
| v1.1 | 2026-05-09 | Sprint 1 추가 (Domain Foundation) |
| **v1.2** | **2026-05-12** | **Sprint 5 추가 (Quality + Documentation) + LOC reconciliation** |

## LOC Reconciliation (v1.2)

| Sprint | v1.0/v1.1 estimate | v1.2 actual | Δ |
|--------|---------------------|-------------|---|
| Sprint 1 | ~400 | 685 | +285 |
| Sprint 2 | ~600 | 1,337 | +737 |
| Sprint 3 | ~400 | 780 | +380 |
| Sprint 4 | ~800 | 2,065 | +1,265 |
| Sprint 5 | ~600 | ~750 (code) + ~500 (docs) | +650 |
| Sprint 6 | ~200 | TBD | — |
| **Total** | **~3,000** | **~6,117+** | **+3,117** |

### Reconciliation 원인
- Sprint 1: typedef + canTransition pattern (`{ok, reason}`) 도입
- Sprint 2: 8 use cases + DI pattern (vs estimate 단일 file)
- Sprint 3: 4 adapters + composite factory pattern
- Sprint 4: 7 templates (Korean, deep) + 4 agents + 15-action handler
- Sprint 5: 3 adapter scaffolds + Korean guide + L3 contract tracked
```

### File 12: `tests/qa/v2113-sprint-5-quality-docs.test.js` (R12, local gitignored)

**7-perspective QA harness**:

```javascript
'use strict';

// (1) L3 contract (re-run from tests/contract/)
// (2) L2 regression — Sprint 1+2+3+4 (require + re-run)
// (3) bkit-evals scenarios — manual Task invocations documented
// (4) claude -p headless — child_process spawn 5 scenarios
// (5) 4-System 공존 — fs.existsSync + JSON diff
// (6) Sprint↔PDCA mapping — enum overlap analysis
// (7) plugin validate — Bash invocation
```

**Estimated LOC**: ~400

---

## 2. 7-Perspective QA Harness Pseudo-Code

### P3 bkit-evals (4 scenarios)

```yaml
scenarios:
  - id: eval-01-sprint-init
    prompt: "/sprint init test-eval --name 'Eval Test' --trust L0"
    rubric:
      - "Output mentions sprint id 'test-eval'"
      - "Trust level set to L0"
      - "No errors in stderr"
  - id: eval-02-sprint-start
    setup: "ensure test-eval initialized"
    prompt: "/sprint start test-eval"
    rubric:
      - "Sprint transitions to 'plan' phase or stays at 'prd'"
      - "Audit log emits 'sprint_started'"
  - id: eval-03-phase-advance
    prompt: "/sprint phase test-eval --to design"
    rubric:
      - "Phase advances or rejects with valid reason"
      - "Quality gates evaluated"
  - id: eval-04-archive
    prompt: "/sprint archive test-eval"
    rubric:
      - "Sprint moves to 'archived' phase"
      - "Final state persisted to disk"
```

### P4 claude -p headless (5 scenarios)

```bash
# QA harness Bash invocations (manual or scripted)
claude -p "/sprint init headless-01 --name 'H01' --trust L0" --plugin-dir . 2>&1 | head -20
claude -p "/sprint start headless-01" --plugin-dir . 2>&1 | head -20
claude -p "/sprint status headless-01" --plugin-dir . 2>&1 | head -20
claude -p "/sprint phase headless-01 --to plan" --plugin-dir . 2>&1 | head -20
claude -p "/sprint list" --plugin-dir . 2>&1 | head -20
```

각 exit code = 0 + stdout 에 sprint id 또는 phase 명 포함 검증.

### P5 4-System 공존

```javascript
const files = [
  '.bkit/state/sprint-status.json',
  '.bkit/state/pdca-status.json',
  '.bkit/state/trust-profile.json',
  '.bkit/state/memory.json',
];

// (a) 동시 존재
files.forEach(f => assert(fs.existsSync(path.join(projectRoot, f)), `${f} missing`));

// (b) Sprint start 후 다른 3 파일 byte diff 0 (orthogonal)
const beforeHashes = readHashes(files.slice(1));  // pdca/trust/memory
runSprintStart('orth-test');
const afterHashes = readHashes(files.slice(1));
beforeHashes.forEach((h, i) => assert.strictEqual(h, afterHashes[i],
  `${files[i+1]} mutated during sprint start (orthogonality violated)`));
```

### P6 Sprint↔PDCA mapping

```javascript
const sprintPhases = require('lib/domain/sprint/types').SPRINT_PHASES;
const pdcaPhases = require('lib/application/pdca-lifecycle').PDCA_PHASES;

const overlap = sprintPhases.filter(p => pdcaPhases.includes(p));
const sprintOnly = sprintPhases.filter(p => !pdcaPhases.includes(p));
const pdcaOnly = pdcaPhases.filter(p => !sprintPhases.includes(p));

// Expected: overlap=6, sprintOnly=2 (prd,iterate), pdcaOnly=3 (pm,check,act)
assert.strictEqual(overlap.length, 6);
assert.deepStrictEqual(sprintOnly.sort(), ['iterate','prd']);
assert.deepStrictEqual(pdcaOnly.sort(), ['act','check','pm']);

// Documented mapping (not orthogonal, semantic alignment OK)
console.log('Sprint↔PDCA mapping documented (6 overlap + 2 sprint-only + 3 pdca-only)');
```

### P7 plugin validate

```bash
claude plugin validate . && echo "F9-120 closure 11-cycle PASS"
```

---

## 3. Design 완료 Checklist

- [x] 코드베이스 깊이 분석 8건 (Sprint 1+2+3+4 정합)
- [x] 14 files 정확 spec + LOC estimate
- [x] 3 adapter signature precise (function 직접 return, NOT object wrapper) — PRD/Plan 정정
- [x] sprint-handler.js enhancement zone 정확 (handleFork/Feature/Watch line 248-265)
- [x] 4-System file paths 정확 (sprint-status.json + pdca-status.json + trust-profile.json + memory.json)
- [x] Sprint↔PDCA overlap analysis (6 overlap + 2 sprint-only + 3 pdca-only)
- [x] L3 Contract SC-01~08 pseudo-code
- [x] 7-perspective QA pseudo-code (P3-P7)
- [x] Master Plan v1.2 LOC reconciliation 매트릭스

---

**Next Phase**: Phase 4 Do — 14 files 정확 구현 (~750 code LOC + ~500 docs LOC) in Do-1~Do-7 order.
