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
 *   USER -> /sprint master-plan -> sprint-handler -> handleMasterPlan ->
 *   master-plan.usecase.generateMasterPlan -> Sprint 3 sprint-paths +
 *   audit-logger -> atomic state + markdown write
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

// ============================================================================
// Constants + Schema
// ============================================================================

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

// Variable substitution map: template var -> input field path
const TEMPLATE_VAR_NAMES = Object.freeze([
  'feature', 'displayName', 'date', 'author', 'trustLevel', 'duration',
]);

const TEMPLATE_RELATIVE_PATH = 'templates/sprint/master-plan.template.md';

// ============================================================================
// Input Validation
// ============================================================================

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

// ============================================================================
// Lazy Require Helpers (avoid circular at module load time)
// ============================================================================

/**
 * @returns {{ getMasterPlanStateDir: Function, getMasterPlanStateFile: Function }}
 */
function getSprintPaths() {
  return require('../../infra/sprint/sprint-paths');
}

/**
 * @returns {{ writeAuditLog: Function }}
 */
function getAuditLogger() {
  return require('../../audit/audit-logger');
}

// ============================================================================
// State Load + Save (atomic tmp + rename)
// ============================================================================

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
 * @param {Object} state - must include projectId
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

// ============================================================================
// Template Rendering (dry-run mode)
// ============================================================================

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
 * @param {string} content - template content
 * @param {Object<string, string>} varMap
 * @returns {string}
 */
function renderTemplate(content, varMap) {
  return content.replace(/\{(\w+)\}/g, function (match, varName) {
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

// ============================================================================
// Agent Prompt Builder
// ============================================================================

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
    features.length === 0 ? '  (none specified - please identify from project context)' :
      features.map(function (f, i) { return '  ' + (i + 1) + '. ' + f; }).join('\n'),
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

// ============================================================================
// Audit Emit Helper
// ============================================================================

/**
 * Emit master_plan_created audit event.
 *
 * @param {Object} input
 * @param {Object} plan
 * @param {Object} ctx - { forceOverwrite, markdownWriteSuccess, agentBackedGeneration, deps, previousGeneratedAt }
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
      previousGeneratedAt: ctx.previousGeneratedAt || null,
    },
    result: ctx.markdownWriteSuccess ? 'success' : 'failure',
  };

  if (typeof auditLogger.logEvent === 'function') {
    try { await auditLogger.logEvent(entry); } catch (_) { /* best-effort */ }
  } else if (typeof auditLogger.writeAuditLog === 'function') {
    try { auditLogger.writeAuditLog(entry); } catch (_) { /* best-effort */ }
  }
}

// ============================================================================
// Main Use Case
// ============================================================================

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
 * @param {Function} [deps.agentSpawner]   - ({ subagent_type, prompt }) => Promise<{ output }>
 * @param {Function} [deps.fileWriter]      - (path, content, encoding) => Promise<void>
 * @param {Function} [deps.fileDeleter]     - (path) => Promise<void>
 * @param {Object}   [deps.auditLogger]     - { logEvent(entry) } or { writeAuditLog(entry) }
 * @param {Function} [deps.taskCreator]     - ({ subject, description, addBlockedBy? }) => Promise<{ taskId }>
 * @param {Function} [deps.contextSizer]    - S4-UX optional. (input, opts) => { ok, sprints, dependencyGraph }
 * @param {Object}   [deps.contextSizingConfig] - merged config from loadContextSizingConfig (optional, paired with contextSizer)
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
        prompt: prompt,
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
    sprints: recommendedSprints, // S4-UX: populated when deps.contextSizer injected; else [] (S2-UX behavior)
    dependencyGraph: computedDepGraph,
    trustLevel: input.trustLevel || DEFAULT_TRUST_LEVEL,
    context: Object.assign({}, DEFAULT_CONTEXT, input.context || {}),
    generatedAt: now,
    updatedAt: now,
    masterPlanPath: masterPlanRel,
  };
  if (wiringWarning) plan.contextSizerWarning = wiringWarning;

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
    markdownWriteSuccess: markdownWriteSuccess,
    agentBackedGeneration: agentBackedGeneration,
    deps: d,
    previousGeneratedAt: existing.exists ? existing.state.generatedAt : null,
  });

  // Step 7: optional Task wiring (sequential, ENH-292)
  if (typeof d.taskCreator === 'function' && plan.sprints.length > 0) {
    let prevTaskId = null;
    for (let i = 0; i < plan.sprints.length; i++) {
      const sprint = plan.sprints[i];
      const taskResult = await d.taskCreator({
        subject: 'Sprint ' + sprint.id + ': ' + (sprint.name || sprint.id),
        description: (sprint.scope || '') + '\n\nFeatures: ' + (sprint.features || []).join(', '),
        addBlockedBy: prevTaskId ? [prevTaskId] : [],
      });
      if (taskResult && taskResult.taskId) prevTaskId = taskResult.taskId;
    }
  }

  return { ok: true, plan: plan, masterPlanPath: masterPlanPath, stateFilePath: stateFilePath, alreadyExists: false };
}

// ============================================================================
// Exports
// ============================================================================

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
