/**
 * sprint-handler.js — Sprint skill action dispatcher (v2.1.13 Sprint 4).
 *
 * Wires the user-facing /sprint slash command into the Sprint 1 (Domain)
 * + Sprint 2 (Application) + Sprint 3 (Infrastructure) layers without
 * requiring those layers to know anything about user-facing concerns.
 *
 * This script is the entry point for skills/sprint/SKILL.md handlers and
 * the sprint-orchestrator agent. It builds a fresh SprintInfra adapter
 * bundle per invocation, then routes the action to the matching Sprint 2
 * use case via Sprint 3 adapter injection.
 *
 * Cross-sprint integration (user-mandated):
 *   USER → skill → sprint-handler → createSprintInfra (S3) → startSprint (S2) → createSprint (S1)
 *
 * Pure JavaScript module — no shell I/O of its own (callers provide
 * argv parsing). Errors are returned as { ok: false, error } instead of
 * thrown, so callers can render them as user-facing messages.
 *
 * @module scripts/sprint-handler
 * @version 2.1.13
 * @since 2.1.13
 */

'use strict';

const {
  createSprintInfra,
  createGapDetector,
  createAutoFixer,
  createDataFlowValidator,
} = require('../lib/infra/sprint');
const lifecycle = require('../lib/application/sprint-lifecycle');
const domain = require('../lib/domain/sprint');

/**
 * The 15 sub-actions supported by the /sprint slash command.
 * @type {ReadonlyArray<string>}
 */
const VALID_ACTIONS = Object.freeze([
  'init', 'start', 'status', 'watch', 'phase',
  'iterate', 'qa', 'report', 'archive', 'list',
  'feature', 'pause', 'resume', 'fork', 'help',
]);

/**
 * Build a fresh SprintInfra bundle bound to the given (or current) project
 * root. Resolves OTEL + agent attribution from environment unless overridden.
 *
 * @param {{ projectRoot?: string, otelEndpoint?: string, otelServiceName?: string, agentId?: string, parentAgentId?: string }} [opts]
 * @returns {import('../lib/infra/sprint').SprintInfra}
 */
function getInfra(opts) {
  const o = opts || {};
  return createSprintInfra({
    projectRoot: o.projectRoot || process.cwd(),
    otelEndpoint: o.otelEndpoint || process.env.OTEL_ENDPOINT,
    otelServiceName: o.otelServiceName || process.env.OTEL_SERVICE_NAME,
    agentId: o.agentId || process.env.CLAUDE_AGENT_ID,
    parentAgentId: o.parentAgentId || process.env.CLAUDE_PARENT_AGENT_ID,
  });
}

function defaultContext() {
  return { WHY: '', WHO: '', RISK: '', SUCCESS: '', SCOPE: '' };
}

/**
 * Sprint 5 V#3 — Auto-wire 3 production scaffold adapters when agentTaskRunner
 * is injected. This converts no-op baseline behavior to real agent invocations
 * via Claude Code's Task tool (gap-detector / pdca-iterator agents + chrome-qa MCP).
 *
 * Caller pattern (interactive Claude Code session):
 *   handleSprintAction('iterate', { id }, {
 *     agentTaskRunner: async ({ subagent_type, prompt }) => {
 *       const result = await invokeTaskTool({ subagent_type, prompt });
 *       return { output: result.text };
 *     },
 *     mcpClient: { callTool: async (req) => browserBatch(req) },
 *   });
 *
 * Behavior:
 * - If `deps.agentTaskRunner` provided: auto-create gapDetector + autoFixer
 *   from createGapDetector/AutoFixer, inject into deps.iterateDeps.
 * - If `deps.mcpClient` provided: auto-create dataFlowValidator (Tier 3 live probe),
 *   inject into deps.qaDeps.
 * - If `deps.staticMatrix === true` (and no mcpClient): create Tier 2 static
 *   heuristic validator, inject into deps.qaDeps.
 * - Existing deps.iterateDeps / deps.qaDeps explicit injections take precedence
 *   (override auto-wired adapters).
 *
 * @param {object} deps - raw deps from caller
 * @returns {object} deps with auto-wired adapters merged
 */
function wireAgentAdapters(deps) {
  if (!deps || (!deps.agentTaskRunner && !deps.mcpClient && deps.staticMatrix !== true)) {
    return deps; // no auto-wiring needed
  }

  const wired = { ...deps };

  if (deps.agentTaskRunner && (!deps.iterateDeps || (!deps.iterateDeps.gapDetector && !deps.iterateDeps.autoFixer))) {
    const gapDetector = createGapDetector({ agentTaskRunner: deps.agentTaskRunner });
    const autoFixer = createAutoFixer({ agentTaskRunner: deps.agentTaskRunner });
    wired.iterateDeps = Object.assign({ gapDetector, autoFixer }, deps.iterateDeps || {});
  }

  if ((deps.mcpClient || deps.staticMatrix === true) && (!deps.qaDeps || !deps.qaDeps.dataFlowValidator)) {
    const dataFlowValidator = createDataFlowValidator({
      mcpClient: deps.mcpClient,
      staticMatrix: deps.staticMatrix === true,
    });
    wired.qaDeps = Object.assign({ dataFlowValidator }, deps.qaDeps || {});
  }

  return wired;
}

/**
 * Main dispatcher. Routes the requested action to its handler, after
 * acquiring a fresh SprintInfra (unless one is injected via `deps.infra`
 * for testing).
 *
 * @param {string} action - one of VALID_ACTIONS
 * @param {Object} [args]
 * @param {{ infra?: object, lifecycleDeps?: object, iterateDeps?: object, qaDeps?: object, reportDeps?: object }} [deps]
 * @returns {Promise<{ ok: boolean, [k: string]: any }>}
 */
async function handleSprintAction(action, args, deps) {
  if (!VALID_ACTIONS.includes(action)) {
    return { ok: false, error: 'Unknown action: ' + action, validActions: [...VALID_ACTIONS] };
  }
  const a = args || {};
  const d = wireAgentAdapters(deps || {});
  const infra = d.infra || getInfra(a);
  switch (action) {
    case 'init':    return handleInit(a, infra);
    case 'start':   return handleStart(a, infra, d);
    case 'status':  return handleStatus(a, infra);
    case 'list':    return handleList(a, infra);
    case 'phase':   return handlePhase(a, infra, d);
    case 'iterate': return handleIterate(a, infra, d);
    case 'qa':      return handleQA(a, infra, d);
    case 'report':  return handleReport(a, infra, d);
    case 'archive': return handleArchive(a, infra);
    case 'pause':   return handlePause(a, infra);
    case 'resume':  return handleResume(a, infra);
    case 'fork':    return handleFork(a, infra);
    case 'feature': return handleFeature(a, infra);
    case 'watch':   return handleWatch(a, infra);
    case 'help':    return handleHelp();
    default:        return { ok: false, error: 'Unreachable action: ' + action };
  }
}

async function handleInit(args, infra) {
  if (!args || !args.id || !args.name) {
    return { ok: false, error: 'init requires { id, name }' };
  }
  const v = domain.validateSprintInput({
    id: args.id, name: args.name,
    phase: args.phase, context: args.context, features: args.features,
  });
  if (!v.ok) return { ok: false, error: 'invalid_input', errors: v.errors };
  const sprint = domain.createSprint({
    id: args.id,
    name: args.name,
    phase: args.phase || 'prd',
    context: { ...defaultContext(), ...(args.context || {}) },
    features: Array.isArray(args.features) ? args.features : [],
    trustLevelAtStart: args.trustLevel || 'L3',
  });
  await infra.stateStore.save(sprint);
  infra.eventEmitter.emit(domain.SprintEvents.SprintCreated({
    sprintId: sprint.id, name: sprint.name, phase: sprint.phase,
  }));
  return { ok: true, sprint, sprintId: sprint.id };
}

async function handleStart(args, infra, deps) {
  if (!args || !args.id || !args.name) {
    return { ok: false, error: 'start requires { id, name }' };
  }
  const lifecycleDeps = Object.assign({
    stateStore: infra.stateStore,
    eventEmitter: infra.eventEmitter.emit,
  }, deps.lifecycleDeps || {});
  return lifecycle.startSprint({
    id: args.id,
    name: args.name,
    trustLevel: args.trustLevel || 'L3',
    phase: args.phase,
    context: { ...defaultContext(), ...(args.context || {}) },
    features: Array.isArray(args.features) ? args.features : [],
  }, lifecycleDeps);
}

async function handleStatus(args, infra) {
  if (!args || !args.id) return { ok: false, error: 'status requires { id }' };
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: 'Sprint not found: ' + args.id };
  return { ok: true, sprint };
}

async function handleList(_args, infra) {
  const fromState = await infra.stateStore.list();
  const fromDocs = await infra.docScanner.findAllSprints();
  const seen = new Set();
  const merged = [];
  for (const e of fromState) {
    merged.push({ source: 'state', id: e.id, name: e.name, phase: e.phase, status: e.status, updatedAt: e.updatedAt });
    seen.add(e.id);
  }
  for (const d of fromDocs) {
    if (seen.has(d.id)) continue;
    merged.push({ source: 'docs', id: d.id, masterPlanPath: d.masterPlanPath });
  }
  return { ok: true, sprints: merged, count: merged.length };
}

async function handlePhase(args, infra, deps) {
  if (!args || !args.id || !args.to) {
    return { ok: false, error: 'phase requires { id, to }' };
  }
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: 'Sprint not found: ' + args.id };
  const result = await lifecycle.advancePhase(sprint, args.to, Object.assign({
    eventEmitter: infra.eventEmitter.emit,
  }, deps.lifecycleDeps || {}));
  if (result.ok && result.sprint) await infra.stateStore.save(result.sprint);
  return result;
}

async function handleIterate(args, infra, deps) {
  if (!args || !args.id) return { ok: false, error: 'iterate requires { id }' };
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: 'Sprint not found: ' + args.id };
  const result = await lifecycle.iterateSprint(sprint, Object.assign({
    eventEmitter: infra.eventEmitter.emit,
  }, deps.iterateDeps || {}));
  if (result.ok && result.sprint) await infra.stateStore.save(result.sprint);
  return result;
}

async function handleQA(args, infra, deps) {
  if (!args || !args.id || !args.featureName) {
    return { ok: false, error: 'qa requires { id, featureName }' };
  }
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: 'Sprint not found: ' + args.id };
  const result = await lifecycle.verifyDataFlow(sprint, args.featureName, deps.qaDeps || {});
  if (result.ok) {
    await infra.matrixSync.syncDataFlow(args.id, args.featureName, result.hopResults);
  }
  return result;
}

async function handleReport(args, infra, deps) {
  if (!args || !args.id) return { ok: false, error: 'report requires { id }' };
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: 'Sprint not found: ' + args.id };
  return lifecycle.generateReport(sprint, deps.reportDeps || {});
}

async function handleArchive(args, infra) {
  if (!args || !args.id) return { ok: false, error: 'archive requires { id }' };
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: 'Sprint not found: ' + args.id };
  const result = await lifecycle.archiveSprint(sprint, {
    eventEmitter: infra.eventEmitter.emit,
  });
  if (result.ok && result.sprint) {
    await infra.stateStore.save(result.sprint);
    // V#4 — best-effort MEMORY.md auto-update (non-blocking, isolated failure)
    try {
      const writer = require('./sprint-memory-writer');
      const projectRoot = (args && args.projectRoot) || process.cwd();
      const memResult = await writer.appendSprintToMemory(result.sprint, { projectRoot: projectRoot });
      result.memoryUpdated = memResult.ok && memResult.appended;
      if (memResult.ok && !memResult.appended) {
        result.memoryReason = memResult.reason; // already_logged
      } else if (!memResult.ok) {
        result.memoryReason = memResult.reason; // non-fatal
      }
    } catch (e) {
      result.memoryUpdated = false;
      result.memoryReason = 'writer_error: ' + (e && e.message ? e.message : String(e));
    }
  }
  return result;
}

async function handlePause(args, infra) {
  if (!args || !args.id) return { ok: false, error: 'pause requires { id }' };
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: 'Sprint not found: ' + args.id };
  const triggers = [{
    triggerId: args.triggerId || 'USER_REQUEST',
    severity: args.severity || 'MEDIUM',
    message: args.message || 'User-requested pause',
    userActions: [],
  }];
  const result = lifecycle.pauseSprint(sprint, triggers, {
    eventEmitter: infra.eventEmitter.emit,
  });
  if (result.ok && result.sprint) await infra.stateStore.save(result.sprint);
  return result;
}

async function handleResume(args, infra) {
  if (!args || !args.id) return { ok: false, error: 'resume requires { id }' };
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: 'Sprint not found: ' + args.id };
  const result = lifecycle.resumeSprint(sprint, {
    eventEmitter: infra.eventEmitter.emit,
  });
  if (result.ok && result.sprint) await infra.stateStore.save(result.sprint);
  return result;
}

// Sprint 5 real impl — fork: clone source sprint, carry over incomplete features
async function handleFork(args, infra) {
  if (!args || !args.id || !args.newId) {
    return { ok: false, error: 'fork requires { id, newId }' };
  }
  const source = await infra.stateStore.load(args.id);
  if (!source) return { ok: false, error: 'Sprint not found: ' + args.id };
  const carryItems = identifyCarryItems(source);
  const domain = require(require('path').join(__dirname, '..', 'lib/domain/sprint'));
  const trustLevel = source.autoRun && source.autoRun.trustLevelAtStart ? source.autoRun.trustLevelAtStart : 'L0';
  const newSprint = domain.createSprint({
    id: args.newId,
    name: (source.name || args.id) + ' (fork)',
    features: carryItems.map(function (c) { return c.featureName; }),
    context: source.context || {},
    trustLevelAtStart: trustLevel,
  });
  await infra.stateStore.save(newSprint);
  return { ok: true, sourceId: args.id, newSprint: newSprint, carryItems: carryItems };
}

function identifyCarryItems(sprint) {
  const items = [];
  const fm = sprint && sprint.featureMap;
  if (!fm) return items;
  const keys = Object.keys(fm);
  for (let i = 0; i < keys.length; i++) {
    const featureName = keys[i];
    const fp = fm[featureName];
    const phase = fp && fp.phase;
    if (phase === 'do' || phase === 'iterate') {
      items.push({ featureName: featureName, phase: phase, reason: 'phase_' + phase + '_not_complete' });
    }
  }
  return items;
}

// Sprint 5 real impl — feature: list/add/remove feature within a sprint
async function handleFeature(args, infra) {
  if (!args || !args.id || !args.action) {
    return { ok: false, error: 'feature requires { id, action: list|add|remove [, featureName] }' };
  }
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: 'Sprint not found: ' + args.id };
  const domain = require(require('path').join(__dirname, '..', 'lib/domain/sprint'));

  switch (args.action) {
    case 'list':
      return {
        ok: true,
        features: sprint.features || [],
        featureMapKeys: Object.keys(sprint.featureMap || {}),
      };
    case 'add': {
      if (!args.featureName) return { ok: false, error: 'add requires featureName' };
      const features = (sprint.features || []).slice();
      if (features.indexOf(args.featureName) === -1) features.push(args.featureName);
      const updated = domain.cloneSprint(sprint, { features: features });
      await infra.stateStore.save(updated);
      return { ok: true, sprint: updated };
    }
    case 'remove': {
      if (!args.featureName) return { ok: false, error: 'remove requires featureName' };
      const features = (sprint.features || []).filter(function (f) { return f !== args.featureName; });
      const updated = domain.cloneSprint(sprint, { features: features });
      await infra.stateStore.save(updated);
      return { ok: true, sprint: updated };
    }
    default:
      return { ok: false, error: 'feature action must be list|add|remove, got: ' + args.action };
  }
}

// Sprint 5 enhanced — watch: live snapshot with auto-pause triggers + matrix snapshots
async function handleWatch(args, infra) {
  if (!args || !args.id) return { ok: false, error: 'watch requires { id }' };
  const sprint = await infra.stateStore.load(args.id);
  if (!sprint) return { ok: false, error: 'Sprint not found: ' + args.id };
  const lifecycle = require(require('path').join(__dirname, '..', 'lib/application/sprint-lifecycle'));

  // Auto-pause triggers snapshot (best-effort)
  let triggers = [];
  try {
    if (typeof lifecycle.checkAutoPauseTriggers === 'function') {
      triggers = lifecycle.checkAutoPauseTriggers(sprint) || [];
    }
  } catch (_e) { /* triggers optional */ }

  // Matrix snapshots (best-effort)
  const matrices = {};
  try {
    if (infra.matrixSync && typeof infra.matrixSync.read === 'function') {
      const mods = ['data-flow', 'cumulative-state', 'feature-phase'];
      for (let i = 0; i < mods.length; i++) {
        try {
          matrices[mods[i]] = await infra.matrixSync.read(args.id, mods[i]);
        } catch (_e) {
          matrices[mods[i]] = null;
        }
      }
    }
  } catch (_e) { /* matrices optional */ }

  return {
    ok: true,
    snapshot: sprint,
    triggers: triggers,
    matrices: matrices,
    phase: sprint.phase,
    timestamp: new Date().toISOString(),
  };
}

function handleHelp() {
  return {
    ok: true,
    helpText: [
      'bkit:sprint — Sprint Management',
      '',
      'Actions (15):',
      '  init     /sprint init <id> --name <name> [--trust L0-L4]',
      '  start    /sprint start <id> [--trust L0-L4]',
      '  status   /sprint status <id>',
      '  list     /sprint list',
      '  phase    /sprint phase <id> --to <phase>',
      '  iterate  /sprint iterate <id>',
      '  qa       /sprint qa <id> --feature <name>',
      '  report   /sprint report <id>',
      '  archive  /sprint archive <id>',
      '  pause    /sprint pause <id>',
      '  resume   /sprint resume <id>',
      '  watch    /sprint watch <id>',
      '  fork     /sprint fork <id> --new <newId>',
      '  feature  /sprint feature <id> --action list|add|remove --feature <name>',
      '  help     /sprint help',
    ].join('\n'),
  };
}

module.exports = {
  handleSprintAction,
  VALID_ACTIONS,
  getInfra,
};
