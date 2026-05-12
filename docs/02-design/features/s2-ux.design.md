# S2-UX Design — Sprint UX 개선 Sub-Sprint 2 (Master Plan Generator)

> **Sub-Sprint ID**: `s2-ux` (sprint-ux-improvement master 의 2/4)
> **Phase**: Design (3/7) — PRD ✓ Plan ✓ → Design in_progress
> **PRD Ref**: `docs/01-plan/features/s2-ux.prd.md` (844 lines, commit `dd16abb`)
> **Plan Ref**: `docs/01-plan/features/s2-ux.plan.md` (979 lines, commit `c563634`)
> **Master Plan Ref**: `docs/01-plan/features/sprint-ux-improvement.master-plan.md` §4.6 + §3.1 + §3.3 + §3.4 + §7.4
> **Date**: 2026-05-12
> **Author**: kay kim (POPUP STUDIO PTE. LTD.) + bkit AI orchestration
> **Branch**: `feature/v2113-sprint-management`
> **Status**: ★ Draft v1.0 — Phase 4 Do 진입 가능 (exact implementation spec)

---

## 0. Executive Summary

### 0.1 Mission

PRD §3 (Feature Map) + Plan §1-§6 (R1-R12 + 10-step implementation order) 를 **Phase 4 Do 가 그대로 적용 가능한 exact patches** 로 정리한다. 모든 7 files 의 patch hunks 는 line-precise (line number 명시) + verbatim diff (additive only) 로 작성된다. 단일 세션 ~45K tokens 안전 구현 + Sprint 1-5 invariant 100% 보존 + F9-120 14-cycle 달성.

### 0.2 Sequence Diagram (high-level)

```
User                  Skill                Handler              UseCase              Infra              Domain          Audit
 |  /sprint master-plan  |                    |                    |                    |                  |               |
 |--------------------->|                    |                    |                    |                  |               |
 |                      | LLM dispatch       |                    |                    |                  |               |
 |                      |---PRD §1.6,§1.7--->|                    |                    |                  |               |
 |                      |                    | handleMasterPlan   |                    |                  |               |
 |                      |                    |---R5 patch 3------>|                    |                  |               |
 |                      |                    |                    | validateMP Input   |                  |               |
 |                      |                    |                    |---R2 step 1------>|                  |               |
 |                      |                    |                    |                    | (re-use SP1     | validators)   |
 |                      |                    |                    |<-{ok, errors}-----|                  |               |
 |                      |                    |                    | loadMasterPlanState|                  |               |
 |                      |                    |                    |---R2 step 2------>| sprint-paths    |               |
 |                      |                    |                    |<-{exists, state}--| .bkit/state/    |               |
 |                      |                    |                    |                    | master-plans/   |               |
 |                      |                    |                    | (if force OR no existing)            |               |
 |                      |                    |                    | buildAgentPrompt   |                  |               |
 |                      |                    |                    | agentSpawner(?)    |                  |               |
 |                      |                    |                    |---inject (PM-S2A)->|                  |               |
 |                      |                    |                    |     ↓              | (Task tool      |               |
 |                      |                    |                    |     ↓              | subagent_type:  |               |
 |                      |                    |                    |     ↓              | bkit:sprint-    |               |
 |                      |                    |                    |     ↓              | master-planner) |               |
 |                      |                    |                    |<-{output: md}-----|                  |               |
 |                      |                    |                    | renderTemplate     |                  |               |
 |                      |                    |                    |   (dry-run path)   |                  |               |
 |                      |                    |                    | saveMasterPlanState|                  |               |
 |                      |                    |                    |---R2 step 6------>| atomic write    |               |
 |                      |                    |                    |                    | tmp + rename    |               |
 |                      |                    |                    |<-{ok}-------------|                  |               |
 |                      |                    |                    | fileWriter(markdown)                  |               |
 |                      |                    |                    |---R2 step 6------>| docs/01-plan/   |               |
 |                      |                    |                    |                    | features/<id>.  |               |
 |                      |                    |                    |                    | master-plan.md  |               |
 |                      |                    |                    | (if markdown fail: rollback state delete)             |
 |                      |                    |                    | auditLogger.logEvent                  |               |
 |                      |                    |                    |---R2 step 7----------->|              | logEvent      |
 |                      |                    |                    |                    |                  |---write------>| .bkit/audit/<date>.jsonl
 |                      |                    |                    | (if deps.taskCreator + plan.sprints) |               |
 |                      |                    |                    | for each sprint: taskCreator(...)    |               |
 |                      |                    |                    |  (sequential, ENH-292)               |               |
 |                      |                    |                    |<-{plan, paths}                       |               |
 |                      |                    |<-{ok, plan, paths}                       |                  |               |
 |                      |<-result                                                       |                  |               |
 |<-result                                                                              |                  |               |
```

### 0.3 PDCA Cycle 진입 시점

| Phase | Status | Artifact |
|-------|--------|----------|
| PRD | ✓ | `s2-ux.prd.md` (844 lines, `dd16abb`) |
| Plan | ✓ | `s2-ux.plan.md` (979 lines, `c563634`) |
| **Design** | **★ in_progress** | `s2-ux.design.md` (본 문서) |
| Do | pending | 7 disk files (master-plan.usecase + index.js + sprint-handler + agent + SKILL + audit-logger + sprint-paths) |
| Iterate | pending | matchRate 100% target |
| QA | pending | 7-perspective matrix |
| Report | pending | `s2-ux.report.md` |

---

## 1. Module Spec — `master-plan.usecase.js` Full Source Template

본 §1 의 코드는 Phase 4 Do 가 그대로 `lib/application/sprint-lifecycle/master-plan.usecase.js` 에 작성할 verbatim spec.

### 1.1 Header (line 1-30)

```javascript
/**
 * master-plan.usecase.js — Sprint Master Plan generator (v2.1.13 Sprint 2 → S2-UX).
 *
 * Generates a multi-sprint Master Plan markdown + persists state JSON to
 * `.bkit/state/master-plans/<projectId>.json`. The use case itself does NOT
 * spawn the sprint-master-planner agent — the caller (sprint-handler at
 * LLM main session) injects `deps.agentSpawner` to delegate Task tool
 * invocation. When `deps.agentSpawner` is undefined, the use case enters
 * dry-run mode and generates a minimal valid markdown via template
 * substitution (no LLM call).
 *
 * Cross-sprint integration:
 *   USER → /sprint master-plan → sprint-handler → handleMasterPlan →
 *   master-plan.usecase.generateMasterPlan → Sprint 3 sprint-paths +
 *   audit-logger → atomic state + markdown write
 *
 * Sprint 1 invariant preserved: lib/domain/sprint/events.js 0 change.
 * Audit Trail via lib/audit/audit-logger.js direct call (option D from
 * PRD §9.3 — events.js extension rejected).
 *
 * @module lib/application/sprint-lifecycle/master-plan.usecase
 * @version 2.1.13
 * @since 2.1.13
 *
 * Design Ref: docs/02-design/features/s2-ux.design.md §1
 * PRD Ref: docs/01-plan/features/s2-ux.prd.md §3 (F1), §JS-01~08, §12 PM-S2A~G
 * Plan Ref: docs/01-plan/features/s2-ux.plan.md R1-R3, §2.1~2.8
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
```

### 1.2 Constants + Schema (line 32-55)

```javascript
const MASTER_PLAN_SCHEMA_VERSION = '1.0';

const KEBAB_CASE_RE = /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/;

const DEFAULT_CONTEXT = Object.freeze({
  WHY: '',
  WHO: '',
  RISK: '',
  SUCCESS: '',
  SCOPE: '',
});

const DEFAULT_TRUST_LEVEL = 'L3';
const VALID_TRUST_LEVELS = Object.freeze(['L0', 'L1', 'L2', 'L3', 'L4']);

const DEFAULT_DURATION = 'TBD (estimated by master-planner agent)';

// Variable substitution map: template var → input field path
const TEMPLATE_VAR_NAMES = Object.freeze([
  'feature', 'displayName', 'date', 'author', 'trustLevel', 'duration',
]);

const TEMPLATE_RELATIVE_PATH = 'templates/sprint/master-plan.template.md';
```

### 1.3 Input Validation (line 57-110)

```javascript
/**
 * Validate the input to generateMasterPlan.
 *
 * @param {Object} input
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateMasterPlanInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['input must be an object'] };
  }
  if (typeof input.projectId !== 'string' || input.projectId.length === 0) {
    errors.push('projectId required (non-empty string)');
  } else if (!KEBAB_CASE_RE.test(input.projectId)) {
    errors.push('projectId must match kebab-case: /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/');
  }
  if (typeof input.projectName !== 'string' || input.projectName.length === 0) {
    errors.push('projectName required (non-empty string)');
  }
  if (input.features !== undefined) {
    if (!Array.isArray(input.features)) {
      errors.push('features must be an array of strings');
    } else {
      for (let i = 0; i < input.features.length; i++) {
        if (typeof input.features[i] !== 'string') {
          errors.push('features[' + i + '] must be a string');
          break;
        }
      }
    }
  }
  if (input.trustLevel !== undefined) {
    const tl = String(input.trustLevel).toUpperCase();
    if (!VALID_TRUST_LEVELS.includes(tl)) {
      errors.push('trustLevel must be one of L0..L4');
    }
  }
  if (input.projectRoot !== undefined && typeof input.projectRoot !== 'string') {
    errors.push('projectRoot must be a string');
  }
  return { ok: errors.length === 0, errors };
}
```

### 1.4 Sprint 3 Path Helpers (line 112-130)

```javascript
/**
 * Lazy require to avoid loading sprint-paths at module load time (test isolation).
 * @returns {{ getMasterPlanStateDir: Function, getMasterPlanStateFile: Function }}
 */
function getSprintPaths() {
  return require('../../infra/sprint/sprint-paths');
}

/**
 * Lazy require for audit-logger (avoids circular at module load time).
 * @returns {{ writeAuditLog: Function, generateUUID: Function }}
 */
function getAuditLogger() {
  return require('../../audit/audit-logger');
}
```

### 1.5 State Load + Save (line 132-200)

```javascript
/**
 * Load existing master plan state if any.
 *
 * @param {string} projectId
 * @param {{ projectRoot?: string }} [opts]
 * @returns {Promise<{ exists: boolean, state: Object|null, reason?: string }>}
 */
async function loadMasterPlanState(projectId, opts) {
  if (typeof projectId !== 'string' || projectId.length === 0) {
    throw new TypeError('loadMasterPlanState: projectId required');
  }
  const projectRoot = (opts && opts.projectRoot) || process.cwd();
  const { getMasterPlanStateFile } = getSprintPaths();
  const stateFile = getMasterPlanStateFile(projectRoot, projectId);
  try {
    const content = await fs.promises.readFile(stateFile, 'utf8');
    const state = JSON.parse(content);
    if (!state || state.schemaVersion !== MASTER_PLAN_SCHEMA_VERSION) {
      return { exists: false, state: null, reason: 'schema_mismatch' };
    }
    return { exists: true, state };
  } catch (e) {
    if (e && e.code === 'ENOENT') return { exists: false, state: null };
    throw e;
  }
}

/**
 * Save master plan state atomically (tmp + rename pattern).
 *
 * @param {Object} state — must include projectId
 * @param {{ projectRoot?: string, fileWriter?: Function }} [opts]
 * @returns {Promise<{ ok: boolean, stateFile: string }>}
 */
async function saveMasterPlanState(state, opts) {
  if (!state || typeof state.projectId !== 'string' || state.projectId.length === 0) {
    throw new TypeError('saveMasterPlanState: state.projectId required');
  }
  const o = opts || {};
  const projectRoot = o.projectRoot || process.cwd();
  const fileWriter = o.fileWriter || fs.promises.writeFile;
  const { getMasterPlanStateDir, getMasterPlanStateFile } = getSprintPaths();
  const stateDir = getMasterPlanStateDir(projectRoot);
  const stateFile = getMasterPlanStateFile(projectRoot, state.projectId);
  const tmpFile = stateFile + '.tmp.' + process.pid;
  await fs.promises.mkdir(stateDir, { recursive: true });
  const json = JSON.stringify(state, null, 2) + '\n';
  await fileWriter(tmpFile, json, 'utf8');
  try {
    await fs.promises.rename(tmpFile, stateFile);
  } catch (e) {
    try { await fs.promises.unlink(tmpFile); } catch (_) { /* ignore */ }
    throw e;
  }
  return { ok: true, stateFile };
}
```

### 1.6 Template Rendering (line 202-240)

```javascript
/**
 * Build the variable map from input for template substitution.
 *
 * @param {Object} input
 * @returns {Object<string, string>}
 */
function buildVarMap(input) {
  return {
    feature: input.projectId,
    displayName: input.projectName,
    date: new Date().toISOString().slice(0, 10),
    author: process.env.GIT_AUTHOR_NAME || 'bkit user',
    trustLevel: input.trustLevel || DEFAULT_TRUST_LEVEL,
    duration: input.duration || DEFAULT_DURATION,
  };
}

/**
 * Replace `{varName}` placeholders in template content with values from varMap.
 * Unknown variables are preserved as-is (no removal).
 *
 * @param {string} content — template content
 * @param {Object<string, string>} varMap
 * @returns {string}
 */
function renderTemplate(content, varMap) {
  return content.replace(/\{(\w+)\}/g, (match, varName) => {
    if (Object.prototype.hasOwnProperty.call(varMap, varName)) {
      return String(varMap[varName]);
    }
    return match;
  });
}

/**
 * Load + render the master-plan template (dry-run mode markdown source).
 *
 * @param {Object} input
 * @returns {Promise<string>} rendered markdown
 */
async function renderMasterPlanTemplate(input) {
  const projectRoot = input.projectRoot || process.cwd();
  const templatePath = path.join(projectRoot, TEMPLATE_RELATIVE_PATH);
  const content = await fs.promises.readFile(templatePath, 'utf8');
  return renderTemplate(content, buildVarMap(input));
}
```

### 1.7 Agent Prompt Builder (line 242-280)

```javascript
/**
 * Build the prompt for sprint-master-planner agent invocation.
 *
 * @param {Object} input
 * @returns {string}
 */
function buildMasterPlannerPrompt(input) {
  const ctx = Object.assign({}, DEFAULT_CONTEXT, input.context || {});
  const features = Array.isArray(input.features) ? input.features : [];
  return [
    'Generate a Sprint Master Plan markdown document for the following project.',
    '',
    'Project ID (kebab-case): ' + input.projectId,
    'Project Name: ' + input.projectName,
    'Initial Trust Level: ' + (input.trustLevel || DEFAULT_TRUST_LEVEL),
    'Estimated Duration: ' + (input.duration || DEFAULT_DURATION),
    '',
    'Features (' + features.length + '):',
    features.length === 0 ? '  (none specified — please identify from project context)' :
      features.map((f, i) => '  ' + (i + 1) + '. ' + f).join('\n'),
    '',
    'Context Anchor:',
    '  WHY: ' + (ctx.WHY || '(infer from project name + features)'),
    '  WHO: ' + (ctx.WHO || '(infer from project context)'),
    '  RISK: ' + (ctx.RISK || '(identify pre-mortem risks based on feature list)'),
    '  SUCCESS: ' + (ctx.SUCCESS || '(define measurable success criteria)'),
    '  SCOPE: ' + (ctx.SCOPE || '(quantify in-scope features + LOC + duration)'),
    '',
    'Follow templates/sprint/master-plan.template.md structure.',
    'Reference docs/01-plan/features/sprint-ux-improvement.master-plan.md for tone + depth.',
    'Output: markdown content only (no JSON wrapper, no headers, no commentary).',
  ].join('\n');
}
```

### 1.8 Main Use Case (line 282-410)

```javascript
/**
 * Generate a Sprint Master Plan + persist state + write markdown.
 *
 * @param {Object} input
 * @param {string} input.projectId
 * @param {string} input.projectName
 * @param {string[]} [input.features]
 * @param {Object} [input.context]
 * @param {string} [input.trustLevel]
 * @param {string} [input.projectRoot]
 * @param {boolean} [input.force]
 * @param {string} [input.duration]
 *
 * @param {Object} [deps]
 * @param {Function} [deps.agentSpawner]   — ({ subagent_type, prompt }) => Promise<{ output }>
 * @param {Function} [deps.fileWriter]      — (path, content, encoding) => Promise<void>
 * @param {Function} [deps.fileDeleter]     — (path) => Promise<void>
 * @param {Object}   [deps.auditLogger]     — { logEvent(entry) }
 * @param {Function} [deps.taskCreator]     — ({ subject, description, addBlockedBy? }) => Promise<{ taskId }>
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   plan?: Object,
 *   masterPlanPath?: string,
 *   stateFilePath?: string,
 *   alreadyExists?: boolean,
 *   error?: string,
 *   errors?: string[]
 * }>}
 */
async function generateMasterPlan(input, deps) {
  // Step 1: validate
  const validation = validateMasterPlanInput(input);
  if (!validation.ok) {
    return { ok: false, error: 'invalid_input', errors: validation.errors };
  }
  const d = deps || {};
  const projectRoot = input.projectRoot || process.cwd();

  // Resolve paths (Sprint 3 + Sprint 1 doc path)
  const { sprintPhaseDocPath } = require('../../domain/sprint');
  const { getMasterPlanStateFile } = getSprintPaths();
  const masterPlanRel = sprintPhaseDocPath(input.projectId, 'masterPlan');
  if (!masterPlanRel) {
    return { ok: false, error: 'sprintPhaseDocPath returned null for masterPlan phase' };
  }
  const masterPlanPath = path.join(projectRoot, masterPlanRel);
  const stateFilePath = getMasterPlanStateFile(projectRoot, input.projectId);

  // Step 2: idempotency check
  const existing = await loadMasterPlanState(input.projectId, { projectRoot });
  if (existing.exists && !input.force) {
    return {
      ok: true,
      alreadyExists: true,
      plan: existing.state,
      masterPlanPath,
      stateFilePath,
    };
  }

  // Step 3: generate markdown
  let markdown;
  let agentBackedGeneration = false;
  if (typeof d.agentSpawner === 'function') {
    const prompt = buildMasterPlannerPrompt(input);
    try {
      const result = await d.agentSpawner({
        subagent_type: 'bkit:sprint-master-planner',
        prompt,
      });
      if (!result || typeof result.output !== 'string' || result.output.length === 0) {
        return { ok: false, error: 'agentSpawner returned invalid output (expected { output: string })' };
      }
      markdown = result.output;
      agentBackedGeneration = true;
    } catch (e) {
      return { ok: false, error: 'agentSpawner threw: ' + (e && e.message ? e.message : String(e)) };
    }
  } else {
    // Dry-run mode
    try {
      markdown = await renderMasterPlanTemplate(input);
    } catch (e) {
      return { ok: false, error: 'template render failed: ' + (e && e.message ? e.message : String(e)) };
    }
  }

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

  // Step 5: persist (state-first, then markdown, rollback on failure)
  const fileWriter = d.fileWriter || fs.promises.writeFile;
  const fileDeleter = d.fileDeleter || fs.promises.unlink;
  let markdownWriteSuccess = false;

  await saveMasterPlanState(plan, { projectRoot, fileWriter });

  try {
    await fs.promises.mkdir(path.dirname(masterPlanPath), { recursive: true });
    await fileWriter(masterPlanPath, markdown, 'utf8');
    markdownWriteSuccess = true;
  } catch (e) {
    // Rollback state on markdown failure
    try { await fileDeleter(stateFilePath); } catch (_) { /* best-effort */ }
    return {
      ok: false,
      error: 'markdown write failed (state rolled back): ' + (e && e.message ? e.message : String(e)),
    };
  }

  // Step 6: emit audit
  await emitAuditEvent(input, plan, {
    forceOverwrite: input.force === true,
    markdownWriteSuccess,
    agentBackedGeneration,
    deps: d,
    previousGeneratedAt: existing.exists ? existing.state.generatedAt : null,
  });

  // Step 7: optional Task wiring (sequential)
  if (typeof d.taskCreator === 'function' && plan.sprints.length > 0) {
    let prevTaskId = null;
    for (const sprint of plan.sprints) {
      const taskResult = await d.taskCreator({
        subject: 'Sprint ' + sprint.id + ': ' + (sprint.name || sprint.id),
        description: (sprint.scope || '') + '\n\nFeatures: ' + (sprint.features || []).join(', '),
        addBlockedBy: prevTaskId ? [prevTaskId] : [],
      });
      if (taskResult && taskResult.taskId) prevTaskId = taskResult.taskId;
    }
  }

  return { ok: true, plan, masterPlanPath, stateFilePath, alreadyExists: false };
}
```

### 1.9 Audit Emit Helper (line 412-440)

```javascript
/**
 * Emit master_plan_created audit event.
 *
 * @param {Object} input
 * @param {Object} plan
 * @param {Object} ctx — { forceOverwrite, markdownWriteSuccess, agentBackedGeneration, deps, previousGeneratedAt }
 * @returns {Promise<void>}
 */
async function emitAuditEvent(input, plan, ctx) {
  const auditLogger = (ctx.deps && ctx.deps.auditLogger) || getAuditLogger();
  const entry = {
    timestamp: new Date().toISOString(),
    action: 'master_plan_created',
    category: 'pdca',
    actor: 'system',
    target: { type: 'feature', id: input.projectId },
    details: {
      projectName: input.projectName,
      featureCount: plan.features.length,
      forceOverwrite: ctx.forceOverwrite === true,
      markdownWriteSuccess: ctx.markdownWriteSuccess === true,
      agentBackedGeneration: ctx.agentBackedGeneration === true,
      schemaVersion: plan.schemaVersion,
      previousGeneratedAt: ctx.previousGeneratedAt,
    },
    result: ctx.markdownWriteSuccess ? 'success' : 'failure',
  };

  if (typeof auditLogger.logEvent === 'function') {
    try { await auditLogger.logEvent(entry); } catch (_) { /* best-effort */ }
  } else if (typeof auditLogger.writeAuditLog === 'function') {
    try { auditLogger.writeAuditLog(entry); } catch (_) { /* best-effort */ }
  }
}
```

### 1.10 module.exports (line 442-455)

```javascript
module.exports = {
  generateMasterPlan,
  validateMasterPlanInput,
  loadMasterPlanState,
  saveMasterPlanState,
  MASTER_PLAN_SCHEMA_VERSION,
  // exported for unit testing
  renderTemplate,
  buildVarMap,
  buildMasterPlannerPrompt,
};
```

**Total LOC**: ~440 (within Plan R1 ~250 estimate +90 helper functions for testability).

---

## 2. Exact Patches — `lib/application/sprint-lifecycle/index.js`

### 2.1 Diff hunk 1 (after line 38)

```diff
 const startSprintMod = require('./start-sprint.usecase');
+const masterPlanMod = require('./master-plan.usecase');

 module.exports = {
```

### 2.2 Diff hunk 2 (line 8 comment block)

```diff
  *     start-sprint.usecase.js     — startSprint, SPRINT_AUTORUN_SCOPE, computeNextPhase
+ *     master-plan.usecase.js      — generateMasterPlan (S2-UX, v2.1.13)
  *
  * Design Ref: docs/02-design/features/v2113-sprint-2-application.design.md §11
```

### 2.3 Diff hunk 3 (after line 75)

```diff
   computeNextPhase: startSprintMod.computeNextPhase,
+
+  // Sprint 2 — Master Plan generator (S2-UX, v2.1.13)
+  generateMasterPlan: masterPlanMod.generateMasterPlan,
+  validateMasterPlanInput: masterPlanMod.validateMasterPlanInput,
+  loadMasterPlanState: masterPlanMod.loadMasterPlanState,
+  saveMasterPlanState: masterPlanMod.saveMasterPlanState,
+  MASTER_PLAN_SCHEMA_VERSION: masterPlanMod.MASTER_PLAN_SCHEMA_VERSION,
 };
```

**Total: +9 lines** (within Plan R4 +9 estimate). Public API surface: 13 → 18 exports.

---

## 3. Exact Patches — `scripts/sprint-handler.js`

### 3.1 Diff hunk 1 (line 41-45 VALID_ACTIONS)

```diff
 const VALID_ACTIONS = Object.freeze([
   'init', 'start', 'status', 'watch', 'phase',
   'iterate', 'qa', 'report', 'archive', 'list',
   'feature', 'pause', 'resume', 'fork', 'help',
+  'master-plan', // S2-UX v2.1.13 — 16th action
 ]);
```

### 3.2 Diff hunk 2 (line 209 switch case, before default)

```diff
     case 'help':    return handleHelp();
+    case 'master-plan': return handleMasterPlan(a, infra, d);
     default:        return { ok: false, error: 'Unreachable action: ' + action };
```

### 3.3 Diff hunk 3 (after handleHelp, around line 516, before CLI mode block)

```javascript
// =====================================================================
// S2-UX v2.1.13 — Master Plan Generator handler (16th action)
// =====================================================================
async function handleMasterPlan(args, infra, deps) {
  if (!args || typeof args.id !== 'string' || args.id.length === 0) {
    return { ok: false, error: 'master-plan requires { id (projectId) }' };
  }
  if (typeof args.name !== 'string' || args.name.length === 0) {
    return { ok: false, error: 'master-plan requires { name (projectName) }' };
  }
  const features = parseFeaturesFlag(args.features);
  const input = {
    projectId: args.id,
    projectName: args.name,
    features,
    context: { ...defaultContext(), ...(args.context || {}) },
    trustLevel: normalizeTrustLevel(args),
    projectRoot: args.projectRoot || process.cwd(),
    force: args.force === true || args.force === 'true',
    duration: typeof args.duration === 'string' ? args.duration : 'TBD',
  };
  const lifecycle = require('../lib/application/sprint-lifecycle');
  const usecaseDeps = {
    agentSpawner: (deps && deps.agentSpawner) || undefined,
    fileWriter: (deps && deps.fileWriter) || undefined,
    fileDeleter: (deps && deps.fileDeleter) || undefined,
    auditLogger: (deps && deps.auditLogger) || undefined,
    taskCreator: (deps && deps.taskCreator) || undefined,
  };
  return lifecycle.generateMasterPlan(input, usecaseDeps);
}

/**
 * Parse `--features` flag value (CSV string or array) into a string array.
 *
 * @param {string|string[]|undefined} raw
 * @returns {string[]}
 */
function parseFeaturesFlag(raw) {
  if (Array.isArray(raw)) return raw.filter(s => typeof s === 'string' && s.length > 0);
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
  return [];
}
```

### 3.4 Diff hunk 4 (handleHelp helpText, around line 511)

```diff
       '  fork     /sprint fork <id> --new <newId>',
       '  feature  /sprint feature <id> --action list|add|remove --feature <name>',
+      '  master-plan /sprint master-plan <project> --name <name> --features <a,b,c>',
       '  help     /sprint help',
```

**Total: +50 LOC** (within Plan R5 +90 — actual implementation < estimate due to clean delegation pattern).

---

## 4. Exact Patches — `agents/sprint-master-planner.md`

### 4.1 Diff hunk 1 (after line 84 `## Quality Standards`, body extension)

Body extension appended after existing content. Frontmatter (lines 1-26) **unchanged** per Plan R11 invariant.

```markdown

## Master Plan Invocation Contract

When invoked by `master-plan.usecase.js` via the Task tool dispatcher, this
agent receives a prompt built from the following input schema and MUST return
output conforming to the output contract below.

### Input Schema

```json
{
  "projectId": "q2-launch",
  "projectName": "Q2 Launch",
  "features": ["auth", "payment", "reports"],
  "context": {
    "WHY": "string",
    "WHO": "string",
    "RISK": "string",
    "SUCCESS": "string",
    "SCOPE": "string"
  },
  "trustLevel": "L3",
  "duration": "TBD"
}
```

### Output Contract

A single markdown document with the following sections (in order):
- §0 Executive Summary (Mission, Anti-Mission, 4-Perspective Value)
- §1 Context Anchor (WHY/WHO/RISK/SUCCESS/SCOPE/OUT-OF-SCOPE)
- §2 Features (table with priority + status)
- §3 Sprint Phase Roadmap (8 phases per sprint)
- §4 Quality Gates activation matrix
- §5 Sprint Split Recommendation (stub for S3-UX context-sizer)
- §6 Risks + Pre-mortem
- §7 Final Checklist

Do NOT include side effects (file writes, network calls). The use case writes
the markdown to `docs/01-plan/features/<projectId>.master-plan.md` and emits
the audit event.

## Working Pattern (Detailed)

1. Parse input prompt for `projectId`, `projectName`, `features[]`, `context{}`, `trustLevel`, `duration`.
2. Read `templates/sprint/master-plan.template.md` as base structure.
3. Grep the codebase for related modules:
   - `lib/application/sprint-lifecycle/` for sprint phase semantics
   - `lib/domain/sprint/` for Sprint entity shape
   - Existing `docs/01-plan/features/*.master-plan.md` for tone/style reference
4. For each feature in `features[]`, allocate to a sprint with token-budget
   awareness (rough estimate ≤ 100K tokens/sprint, refined later by S3-UX).
5. Compose the 8 sections per Output Contract, substituting variables and
   filling concrete content from input + codebase analysis.
6. Return the markdown verbatim — no JSON wrapper, no headers, just the
   markdown content.

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

## Output Markdown Contract (Strict)

The generated markdown MUST:
- Start with `# {projectName} — Sprint Master Plan` heading (variable substitution)
- Include `> **Sprint ID**: \`{projectId}\`` callout immediately after title
- Use Korean for narrative content (docs/ language policy)
- Reference the template structure (§0~§7 minimum)
- End with `> **Status**: Draft v1.0 — pending review.`

Length: 200~800 lines typical, content depth based on feature count.

The use case writes this output to `docs/01-plan/features/<projectId>.master-plan.md`
and the corresponding state JSON to `.bkit/state/master-plans/<projectId>.json`.

## Side Effect Contract (Isolation Guarantee)

This agent runs in isolation (Task tool with `subagent_type: bkit:sprint-master-planner`).
It MUST NOT perform any of:
- File writes (use case handles persistence)
- Network calls beyond Read/Grep/Glob/Bash/WebSearch/WebFetch tool envelopes
- State mutations to `.bkit/state/sprints/` or any other state files
- Audit log entries

The agent's responsibility is markdown synthesis only. All side effects are
performed by `master-plan.usecase.js` in the main session context.
```

**Total: +85 LOC** (slightly over Plan R6 +60 due to additional Side Effect Contract section for isolation clarity).

---

## 5. Exact Patches — `skills/sprint/SKILL.md`

### 5.1 Diff hunk 1 (line 9, frontmatter description)

```diff
   Sprint Management — generic sprint capability for ANY bkit user.
-  15 sub-actions: init, start, status, watch, phase, iterate, qa, report, archive, list, feature, pause, resume, fork, help.
+  16 sub-actions: init, start, status, watch, phase, iterate, qa, report, archive, list, feature, pause, resume, fork, help, master-plan.
```

### 5.2 Diff hunk 2 (line 10-17, frontmatter triggers — append 8-lang master-plan keywords)

```diff
   Triggers: sprint, sprint start, sprint init, sprint status, sprint list,
   스프린트, 스프린트 시작, 스프린트 상태,
   スプリント, スプリント開始, スプリント状態,
   冲刺, 冲刺开始, 冲刺状态,
   sprint, iniciar sprint, estado sprint,
   sprint, demarrer sprint, statut sprint,
   Sprint, Sprint starten, Sprint Status,
-  sprint, avviare sprint, stato sprint.
+  sprint, avviare sprint, stato sprint,
+  master plan, multi-sprint plan, sprint master plan,
+  마스터 플랜, 멀티 스프린트 계획, 스프린트 마스터 플랜,
+  マスタープラン, マルチスプリント計画, スプリントマスタープラン,
+  主计划, 多冲刺计划, 冲刺主计划,
+  plan maestro, plan multi-sprint, plan maestro sprint,
+  plan maître, plan multi-sprint, plan maître sprint,
+  Masterplan, Multi-Sprint-Plan, Sprint-Masterplan,
+  piano principale, piano multi-sprint, piano principale sprint.
```

### 5.3 Diff hunk 3 (Arguments table line 77, append master-plan row)

```diff
 | `help` | Print sub-action help | `/sprint help` |
+| `master-plan <project>` | Generate multi-sprint Master Plan (agent isolated spawn) | `/sprint master-plan q2-launch --name "Q2 Launch" --features auth,payment` |
```

### 5.4 Diff hunk 4 (§10.1 Args schema, append master-plan row before "### 10.2")

```diff
 | `help` | — | — | `args = {}` |
+| `master-plan` | `id` (projectId), `name` (projectName) | `features` (CSV or array), `trust`/`trustLevel`, `context`, `projectRoot`, `force` (boolean), `duration` | `args = { id: "q2-launch", name: "Q2 Launch", features: ["auth", "payment"] }` |
```

### 5.5 Diff hunk 5 (after §10.7 CLI Mode, new §11 body section)

```markdown

## 11. Master Plan Generator (16th Sub-Action)

The `master-plan` action generates a multi-sprint roadmap via the
`bkit:sprint-master-planner` agent (isolated subagent spawn) and persists
both markdown documentation and state JSON.

### 11.1 Workflow

```
USER: /sprint master-plan q2-launch --name "Q2 Launch" --features auth,payment
   ↓
SKILL.md dispatches → scripts/sprint-handler.js handleMasterPlan
   ↓
handleMasterPlan calls lib/application/sprint-lifecycle/master-plan.usecase.js generateMasterPlan
   ↓
generateMasterPlan validates input + loads existing state (idempotent check)
   ↓
If deps.agentSpawner provided: spawn bkit:sprint-master-planner agent → markdown
If not: dry-run via templates/sprint/master-plan.template.md substitution
   ↓
Atomic write: .bkit/state/master-plans/<projectId>.json (state first)
   ↓
File write: docs/01-plan/features/<projectId>.master-plan.md (markdown)
   ↓
Audit: lib/audit/audit-logger.js logEvent({ action: 'master_plan_created' })
   ↓
Optional Task wiring: deps.taskCreator called N times for N sprint tasks
```

### 11.2 Idempotency + Force Overwrite

- Default: idempotent. Second call with same projectId returns existing plan.
- `--force` flag: overwrites both state JSON and markdown. Audit entry has
  `details.forceOverwrite: true`.
- Audit ACTION_TYPE remains `'master_plan_created'` for both cases (PM-S2G).

### 11.3 Dry-Run vs Agent-Backed Generation

When the caller (LLM dispatcher at main session) does NOT inject
`deps.agentSpawner`, the use case generates a minimal valid markdown by
substituting variables in `templates/sprint/master-plan.template.md`. The
output is a skeleton — header, context anchor placeholders, empty features
table, empty sprints array. This dry-run mode is useful for unit tests and
when the user wants a starting template to fill manually.

When `deps.agentSpawner` is injected, the use case calls it with
`{ subagent_type: 'bkit:sprint-master-planner', prompt: <built> }` and uses
the returned `output` field as the markdown content.

### 11.4 State Schema v1.0

The state JSON at `.bkit/state/master-plans/<projectId>.json`:

```json
{
  "schemaVersion": "1.0",
  "projectId": "q2-launch",
  "projectName": "Q2 Launch",
  "features": ["auth", "payment", "reports"],
  "sprints": [],
  "dependencyGraph": {},
  "trustLevel": "L3",
  "context": { "WHY": "", "WHO": "", "RISK": "", "SUCCESS": "", "SCOPE": "" },
  "generatedAt": "2026-05-12T20:00:00Z",
  "updatedAt": "2026-05-12T20:00:00Z",
  "masterPlanPath": "docs/01-plan/features/q2-launch.master-plan.md"
}
```

The `sprints` array is populated by the S3-UX `context-sizer.js` use case.
S2-UX leaves it as an empty stub.

### 11.5 Task Management Integration (Optional)

When the caller injects `deps.taskCreator`, the use case iterates
`plan.sprints` sequentially (ENH-292 caching alignment) and calls
`deps.taskCreator(...)` once per planned sprint with `addBlockedBy` populated
from the previous sprint's task ID. This enables automatic Task list creation
for multi-sprint roadmaps.

When `deps.taskCreator` is undefined or `plan.sprints.length === 0`, Task
creation is silently skipped (no error).
```

**Total: +85 LOC** (slightly over Plan R7 +60 — body content matches PRD §3.4/Plan R7 spec, additional clarity in §11).

---

## 6. Exact Patches — `lib/audit/audit-logger.js`

### 6.1 Diff hunk 1 (line 50, ACTION_TYPES additive)

```diff
   // v2.1.13 Sprint 4 — Sprint Management lifecycle events
   'sprint_paused',
   'sprint_resumed',
+  'master_plan_created', // S2-UX v2.1.13 — Master Plan Generator
 ];
```

**Total: +1 line** (within Plan R8 +1 estimate). No other change.

**Logging API note**: `audit-logger.js` exports `writeAuditLog`, not `logEvent`. The use case `emitAuditEvent` helper (Design §1.9) handles both API surfaces:
- If `auditLogger.logEvent` exists (test mock injection path) → use it
- Else → fall back to `auditLogger.writeAuditLog(entry)` (production path)

This preserves backward compat AND supports test injection. No change to audit-logger module.

---

## 7. Exact Patches — `lib/infra/sprint/sprint-paths.js`

### 7.1 Diff hunk 1 (after line 49 `getSprintIndexFile`, new functions)

```diff
 function getSprintIndexFile(projectRoot) {
   return path.join(projectRoot, '.bkit', 'state', 'sprint-status.json');
 }

+/**
+ * @param {string} projectRoot
+ * @returns {string} `<projectRoot>/.bkit/state/master-plans/` (S2-UX v2.1.13)
+ */
+function getMasterPlanStateDir(projectRoot) {
+  return path.join(projectRoot, '.bkit', 'state', 'master-plans');
+}
+
+/**
+ * @param {string} projectRoot
+ * @param {string} projectId - master plan project id (kebab-case)
+ * @returns {string} `<projectRoot>/.bkit/state/master-plans/{projectId}.json` (S2-UX v2.1.13)
+ */
+function getMasterPlanStateFile(projectRoot, projectId) {
+  return path.join(getMasterPlanStateDir(projectRoot), `${projectId}.json`);
+}
+
 /**
  * @param {string} projectRoot
  * @returns {string} `<projectRoot>/.bkit/runtime/sprint-feature-map.json`
```

### 7.2 Diff hunk 2 (line 93-101 module.exports, append 2 entries)

```diff
 module.exports = {
   MATRIX_TYPES,
   getSprintStateDir,
   getSprintStateFile,
   getSprintIndexFile,
+  getMasterPlanStateDir,
+  getMasterPlanStateFile,
   getSprintFeatureMapFile,
   getSprintMatrixDir,
   getSprintMatrixFile,
   getSprintPhaseDocAbsPath,
 };
```

**Total: +14 lines** (within Plan R9 +14 estimate).

---

## 8. Inter-Sprint Integration Matrix — Implementation Phase Verification

Plan §3 IPs 의 implementation phase verification:

| IP# | Implementation step | Phase 4 verification command | Expected output |
|-----|---------------------|------------------------------|----------------|
| IP-S2-01 | F1 validateMasterPlanInput uses Sprint 1 validators (re-use sprintPhaseDocPath only) | `grep -c "validateSprintInput\|validateMasterPlanInput" lib/application/sprint-lifecycle/master-plan.usecase.js` | ≥ 1 |
| IP-S2-02 | F1 uses Sprint 3 getMasterPlanStateFile | `grep "getMasterPlanStateFile" lib/application/sprint-lifecycle/master-plan.usecase.js` | finds line |
| IP-S2-03 | F1 calls auditLogger with 'master_plan_created' | `grep "master_plan_created" lib/application/sprint-lifecycle/master-plan.usecase.js` | finds line |
| IP-S2-04 | F1 uses template variable substitution | `grep "{feature}\|{displayName}\|TEMPLATE_VAR_NAMES" lib/application/sprint-lifecycle/master-plan.usecase.js` | finds |
| IP-S2-05 | F1 invokes `bkit:sprint-master-planner` via agentSpawner | `grep "bkit:sprint-master-planner" lib/application/sprint-lifecycle/master-plan.usecase.js` | finds |
| IP-S2-06 | F2 additive export count | `node -e "console.log(Object.keys(require('./lib/application/sprint-lifecycle')).length)"` | 18 |
| IP-S2-07 | F3 handleMasterPlan calls generateMasterPlan | `grep "generateMasterPlan" scripts/sprint-handler.js` | ≥ 1 |
| IP-S2-08 | F3 VALID_ACTIONS 16th | `node -e "console.log(require('./scripts/sprint-handler').VALID_ACTIONS.length)"` | 16 |
| IP-S2-09 | F3 CLI mode handles master-plan | `node scripts/sprint-handler.js master-plan smoke --name "Smoke" --features=a,b; echo $?` | 0 |
| IP-S2-10 | F4 SKILL.md description "16 sub-actions" | `grep -c "16 sub-actions" skills/sprint/SKILL.md` | 1 |
| IP-S2-11 | F4 §11 body section | `grep -c "## 11\\. Master Plan Generator" skills/sprint/SKILL.md` | 1 |
| IP-S2-12 | F5 agent body Side Effect Contract | `grep -c "Side Effect Contract" agents/sprint-master-planner.md` | 1 |
| IP-S2-13 | templates/sprint/* unchanged | `git diff main..HEAD -- templates/sprint/` | empty |
| IP-S2-14 | F6 audit entry in jsonl | After smoke run: `grep "master_plan_created" .bkit/audit/$(date +%Y-%m-%d).jsonl \| wc -l` | ≥ 1 |
| IP-S2-15 | F7 sprint-paths exports | `node -e "const p=require('./lib/infra/sprint/sprint-paths'); console.log(typeof p.getMasterPlanStateFile)"` | "function" |

---

## 9. Sprint 1-5 Invariant Verification Matrix (Final)

| Sprint | Component | LOC delta | Verification |
|--------|-----------|-----------|--------------|
| Sprint 1 Domain | events.js / entity.js / transitions.js / validators.js / index.js | **0** | `git diff main..HEAD -- lib/domain/sprint/` empty |
| Sprint 2 Application | sprint-lifecycle/index.js / master-plan.usecase.js (new) | +9 / +~440 (new file) | additive only, 13 → 18 exports |
| Sprint 3 Infrastructure | sprint-paths.js / index.js / 5 adapters | +14 / 0 / 0 | additive helper only, adapters unchanged |
| Sprint 4 Presentation | sprint-handler.js / SKILL.md / sprint-master-planner.md | +50 / +85 / +85 | enhancement zone only, frontmatter 0 change |
| Sprint 5 Quality + Docs | L3 Contract / guides / sprint-memory-writer | 0 | regression PASS (Phase 6 QA) |
| **lib/audit (out-of-scope)** | audit-logger.js | +1 | ACTION_TYPES additive |
| **Net total** | 7 files (5 modified + 1 new + 1 ext) | **+~684 LOC** | within Plan §7 token budget |

---

## 10. Test Plan Matrix (L1-L5, S4-UX Forward Compat)

S2-UX implementation 자체는 L1 unit + L2 integration smoke 만 책임. L3 Contract SC-09/10 + L4 system + L5 E2E 는 S4-UX scope.

### 10.1 L1 Unit (in-source smoke, Phase 4 Do step 3)

| Test | Module | Smoke command |
|------|--------|--------------|
| L1-MP-1 | `validateMasterPlanInput({})` returns `{ ok: false, errors }` | `node -e "console.log(require('./lib/application/sprint-lifecycle/master-plan.usecase').validateMasterPlanInput({}).ok)"` → "false" |
| L1-MP-2 | `validateMasterPlanInput({ projectId: 'a', projectName: 'B' })` returns `{ ok: true }` | `node -e "console.log(require('./lib/application/sprint-lifecycle/master-plan.usecase').validateMasterPlanInput({ projectId: 'foo', projectName: 'Bar' }).ok)"` → "true" |
| L1-MP-3 | `buildVarMap({ projectId: 'a', projectName: 'B' })` returns 6 keys | `node -e "const u=require('./lib/application/sprint-lifecycle/master-plan.usecase'); console.log(Object.keys(u.buildVarMap({ projectId: 'a', projectName: 'B' })).length)"` → "6" |
| L1-MP-4 | `renderTemplate('{feature}', { feature: 'x' })` = "x" | `node -e "const u=require('./lib/application/sprint-lifecycle/master-plan.usecase'); console.log(u.renderTemplate('{feature}', { feature: 'x' }))"` → "x" |
| L1-MP-5 | `MASTER_PLAN_SCHEMA_VERSION` exposed | `node -e "console.log(require('./lib/application/sprint-lifecycle/master-plan.usecase').MASTER_PLAN_SCHEMA_VERSION)"` → "1.0" |

### 10.2 L2 Integration (Phase 4 Do step 8 smoke)

| Test | Scenario | Smoke command |
|------|----------|--------------|
| L2-MP-1 | dry-run mode creates state + markdown | `node scripts/sprint-handler.js master-plan smoke-s2 --name="Smoke S2" --features=a,b,c` exit 0, then `test -f .bkit/state/master-plans/smoke-s2.json && test -f docs/01-plan/features/smoke-s2.master-plan.md` |
| L2-MP-2 | idempotent — second call returns alreadyExists | `node scripts/sprint-handler.js master-plan smoke-s2 --name="Smoke S2"` then `node -e "..." parses JSON output and checks alreadyExists` |
| L2-MP-3 | --force overwrites + audit entry has forceOverwrite=true | `node scripts/sprint-handler.js master-plan smoke-s2 --name="Smoke S2" --force=true` then `grep '"forceOverwrite":true' .bkit/audit/$(date +%Y-%m-%d).jsonl` |
| L2-MP-4 | audit entry created | `grep -c "master_plan_created" .bkit/audit/$(date +%Y-%m-%d).jsonl` ≥ 1 |
| L2-MP-5 | invalid projectId kebab-case rejected | `node scripts/sprint-handler.js master-plan INVALID --name="x"` exit 1 |

### 10.3 L3 Contract Stub (S4-UX SC-09/10)

S2-UX 는 L3 Contract test 작성 X (S4-UX scope). 단 contract callable interface 보장:

- `handleSprintAction('master-plan', args, deps)` returns Promise resolving to `{ ok, plan?, error? }` shape
- `lib/application/sprint-lifecycle.generateMasterPlan(input, deps)` returns Promise with documented shape
- `lib/infra/sprint/sprint-paths.getMasterPlanStateFile(projectRoot, projectId)` returns string path

S4-UX 는 SC-09 (master-plan invocation chain) + SC-10 (context-sizing — depends on S3-UX) 를 본 stub 위에 작성.

### 10.4 L4 System (S4-UX scope)

- End-to-end: real Task tool spawn (sprint-master-planner agent) → markdown content quality check (TBD criteria)
- Idempotent across sessions: kill + restart Node, verify state load → alreadyExists path

### 10.5 L5 E2E Shell (S4-UX scope)

- Multi-project: 3 master plans created sequentially, all listable via `/sprint list`
- Audit aggregation: weekly summary includes master_plan_created entries
- Doc=Code sync: `scripts/docs-code-sync.js` exit 0 after master-plan creation

---

## 11. F9-120 14-Cycle Validation Plan

본 sprint 의 Phase 4 Do 매 단계 후 다음 명령으로 F9-120 13-cycle → 14-cycle 갱신:

```bash
claude plugin validate .
```

기대: Exit 0, output 무 error. F9-120 closure 8 → 8+ continuously.

Phase 4 Do step별 validation:
1. After F7 (sprint-paths) — pure JS, no plugin manifest impact → expected PASS
2. After F6 (audit-logger) — pure JS → expected PASS
3. After F1 (master-plan.usecase) — pure JS → expected PASS
4. After F2 (index.js) — additive export → expected PASS
5. After F3 (sprint-handler) — pure JS, no manifest impact → expected PASS
6. After F5 (sprint-master-planner.md body) — frontmatter unchanged → expected PASS (R11)
7. After F4 (SKILL.md frontmatter + body) — **★ critical** — frontmatter description 변경 (15→16 sub-actions) + triggers append. YAML still valid → expected PASS

**Risk**: SKILL.md frontmatter triggers field가 너무 길어져 claude plugin validate가 reject할 가능성. Mitigation: YAML lint pre-check before commit. Fallback: triggers field 줄임 (8-lang 핵심 키워드만, 부수 키워드 제외).

---

## 12. 사용자 명시 1-8 보존 매트릭스 (Final)

| # | Mandate | Design verification |
|---|---------|--------------------|
| 1 | 8-lang trigger + @docs 예외 영어 | §5.2 SKILL.md triggers append (24 phrases, 8 langs × 3) + §4 agent body 영어 + docs/01-plan/02-design 한국어 |
| 2 | Sprint 유기적 상호 연동 | §8 IP-S2-01~15 verification commands |
| 3 | QA = bkit-evals + claude -p + 4-System + diverse | §10 Test Plan Matrix L1-L5 + Phase 6 QA 7-perspective (S1-UX precedent) |
| 4 | Master Plan + context window | §1 use case 핵심 deliverable + sprints:[] stub for S3-UX |
| 5 | 꼼꼼함 (빠르게 X) | 본 design ~900+ lines + 7 files exact patches + §10 L1-L5 test matrix |
| 6 | skills/agents YAML + 영어 외 8-lang trigger | §4 agent frontmatter 0 변경 + §5.1/5.2 SKILL.md description 16 sub-actions + 8-lang triggers append + §5.5 §11 body 영어 |
| 7 | Sprint별 유기적 동작 검증 | §8 15 IPs + §9 Sprint 1-5 invariant 매트릭스 |
| 8 | /control L4 완전 자동 + 꼼꼼함 | §1.8 generateMasterPlan 7-step (state mutation X for sprint) — L4 autoRun loop 영향 0 |

---

## 13. Pre-mortem (Plan §5 + Design 추가)

| # | 시나리오 | Design Mitigation |
|---|----------|------------------|
| A | Sprint 1 events.js 변경 | §1.9 emitAuditEvent uses auditLogger directly, events.js 0 change |
| B | sprint-master-planner frontmatter 변경 → F9-120 break | §4 body-only ext, frontmatter line 1-26 unchanged |
| C | agentSpawner spawn 실패 | §1.8 step 3 wraps agentSpawner call in try/catch + returns ok:false |
| D | atomic write race condition | §1.5 saveMasterPlanState uses tmp + rename pattern + best-effort cleanup |
| E | Doc=Code drift (markdown vs state mismatch) | §1.8 step 5 state-first then markdown, rollback state on markdown fail |
| F | 8-lang trigger 누락 | §5.2 24 phrases (3 per lang × 8 langs) |
| G | VALID_ACTIONS Object.freeze 깨기 | §3.1 array literal direct edit (Object.freeze call unchanged) |
| H | Design First invariant 위배 | Design (Phase 3) commit 후 Do (Phase 4) 진입 |
| I | No Guessing invariant 위배 | §1 verbatim source template + §2-§7 exact diff hunks + Phase 5 Iterate matchRate 100% |
| J | Audit Trail invariant 위배 | §6 audit-logger ACTION_TYPES additive + §1.9 emitAuditEvent |
| K | hooks.json 21:24 invariant 위배 | 신규 hook 0 (이미 PRD §AC-INV-6 + Plan §5.5 AC-INV-6) |
| L | /control L4 runaway | §1.8 master-plan does not call startSprint/advancePhase, sprint state 미수정 |
| M | Template substitution 실패 | §1.6 renderTemplate preserves unknown vars as-is (no removal), Section §0.2 |
| N | sprint-handler CLI mode 깨기 | §3.1-§3.3 patches do not touch line 527-552 CLI mode block |
| O | 꼼꼼함 위배 | Design ~900 lines + §1 full source template + §2-§7 7 file exact patches + §10 L1-L5 test matrix |

---

## 14. Design Final Checklist (꼼꼼함 §16)

매 row 가 사용자 명시 1-8 또는 invariant 또는 Master Plan §0.4 와 연결:

- [x] **§1 master-plan.usecase.js full source template** — 1.1 header ~ 1.10 module.exports
- [x] **§2 index.js additive export 3 diff hunks** — 9 lines total
- [x] **§3 sprint-handler.js 4 diff hunks** — VALID_ACTIONS + switch + handleMasterPlan + helpText
- [x] **§4 sprint-master-planner.md body ext (frontmatter 0 change)** — 5 new sections (incl. Side Effect Contract)
- [x] **§5 SKILL.md 5 diff hunks** — description + triggers + Args table + §10.1 row + §11 body
- [x] **§6 audit-logger.js ACTION_TYPES additive** — 1 line
- [x] **§7 sprint-paths.js additive 2 helpers + 2 exports** — 14 lines
- [x] **§8 IP-S2-01~15 implementation verification commands** — 15 IPs
- [x] **§9 Sprint 1-5 invariant 매트릭스 최종** — Sprint 1 = 0, Sprint 2-4 additive, Sprint 5 regression
- [x] **§10 L1-L5 Test Plan Matrix** — L1 unit (5) + L2 integration (5) + L3-L5 deferred S4-UX
- [x] **§11 F9-120 14-cycle validation plan** — Phase 4 Do step별 validate
- [x] **§12 사용자 명시 1-8 매트릭스** — 8/8 verified
- [x] **§13 Pre-mortem 15 scenarios** — A-O all mitigated
- [x] **§14 본 checklist 자체** — 18+ items
- [x] **No Guessing — verbatim diff hunks** — 모든 patch line-precise
- [x] **Sequence diagram** — §0.2 User → Audit hop traversal
- [x] **PM-S2A~G 7 resolutions implementation-mapped** — §1.7 agent prompt + §1.6 template + §1.5 state schema + §1.8 dry-run/audit-emit + §3.1 array-end + §1.8 idempotent
- [x] **F9-120 risk mitigation** — §11 YAML lint pre-check + triggers fallback
- [x] **Doc=Code 0 drift via single transaction** — §1.8 state-first + rollback

---

**Design Status**: ★ **Draft v1.0 완료**.
**Next**: Phase 4 Do 진입 — Implementation Order Plan §6 의 10 steps 순차 실행 (F7 sprint-paths → F6 audit-logger → F1 master-plan.usecase → F2 index.js → F3 sprint-handler → F5 agent body → F4 SKILL.md → smoke test → F9-120 validate → single commit).
**예상 소요**: Phase 4 Do ~60분 (single commit).
**사용자 명시 1-8 보존 확인**: 8/8 (§12 매트릭스).
**Sprint 1-5 invariant**: Sprint 1 = 0 변경, Sprint 2-4 additive only.
**Pre-mortem mitigation**: 15/15 (A-O).
**Design completeness M8 target**: ≥ 85 ✓ (18+ checklist items).
