/**
 * start-sprint.usecase.js — Sprint auto-run orchestrator entry point (v2.1.13 Sprint 2).
 *
 * `/sprint start {name}` enters here. Performs:
 *   1) Input validation (Sprint 1 validateSprintInput)
 *   2) Sprint factory (Sprint 1 createSprint) + autoRun.scope assignment from
 *      SPRINT_AUTORUN_SCOPE keyed by Trust Level
 *   3) Initial save + SprintCreated emit
 *   4) For manual levels (L0/L1) — short-circuit return
 *   5) Auto-run loop:
 *        - check auto-pause triggers (pause + return on any hit)
 *        - run phase handler (iterate / qa / report / archived)
 *        - re-check triggers after handler (block detection)
 *        - advance to computed next phase
 *      Loops until sprint.phase === scope.stopAfter (or hard limit 100).
 *
 * ENH-292: every multi-step inside the loop is sequential (no Promise.all).
 *
 * Note on SPRINT_AUTORUN_SCOPE placement: defined locally per Design §10.1.
 * Sprint 4 will move ownership to lib/control/automation-controller.js and
 * re-export from here via barrel.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-2-application.design.md §10
 * Master Plan Ref: docs/01-plan/features/sprint-management.master-plan.md §11.2
 *
 * @module lib/application/sprint-lifecycle/start-sprint.usecase
 * @version 2.1.13
 * @since 2.1.13
 */

const { createSprint, cloneSprint, validateSprintInput, SprintEvents } = require('../../domain/sprint');
const { evaluatePhase } = require('./quality-gates');
const { checkAutoPauseTriggers, pauseSprint } = require('./auto-pause');
const { advancePhase } = require('./advance-phase.usecase');
const { iterateSprint } = require('./iterate-sprint.usecase');
const { verifyDataFlow } = require('./verify-data-flow.usecase');
const { generateReport } = require('./generate-report.usecase');
const { archiveSprint } = require('./archive-sprint.usecase');

/**
 * Trust-Level-keyed auto-run scope, mirrors Master Plan §11.2 SPRINT_AUTORUN_SCOPE.
 */
const SPRINT_AUTORUN_SCOPE = Object.freeze({
  L0: Object.freeze({ stopAfter: 'prd',      manual: true,  requireApproval: true,  hint: false }),
  L1: Object.freeze({ stopAfter: 'prd',      manual: true,  requireApproval: true,  hint: true  }),
  L2: Object.freeze({ stopAfter: 'design',   manual: false, requireApproval: true,  hint: false }),
  L3: Object.freeze({ stopAfter: 'report',   manual: false, requireApproval: true,  hint: false }),
  L4: Object.freeze({ stopAfter: 'archived', manual: false, requireApproval: false, hint: false }),
});

const HARD_LOOP_LIMIT = 100;

function computeNextPhase(currentPhase) {
  switch (currentPhase) {
    case 'prd':      return 'plan';
    case 'plan':     return 'design';
    case 'design':   return 'do';
    case 'do':       return 'iterate';
    case 'iterate':  return 'qa';
    case 'qa':       return 'report';
    case 'report':   return 'archived';
    case 'archived': return null;
    default:         return null;
  }
}

function inMemoryStore() {
  const store = new Map();
  return {
    async save(s) { store.set(s.id, s); },
    async load(id) { return store.get(id); },
  };
}

function noopEmitter(_event) { /* no-op */ }

function defaultPhaseHandlers(deps) {
  return {
    iterate: async (sprint) => {
      const result = await iterateSprint(sprint, deps);
      return { sprint: result.sprint, blocked: result.blocked };
    },
    qa: async (sprint) => {
      let working = sprint;
      const featureList = (Array.isArray(working.features) && working.features.length > 0)
        ? working.features
        : Object.keys(working.featureMap || {});
      const featureResults = [];
      // ENH-292: sequential per feature
      for (const featureName of featureList) {
        const r = await verifyDataFlow(working, featureName, deps);
        featureResults.push(r);
      }
      const avgS1 = featureResults.length === 0
        ? 0
        : featureResults.reduce((a, b) => a + (typeof b.s1Score === 'number' ? b.s1Score : 0), 0) / featureResults.length;
      working = cloneSprint(working, {
        kpi: { ...(working.kpi || {}), dataFlowIntegrity: avgS1 },
        qualityGates: {
          ...(working.qualityGates || {}),
          S1_dataFlowIntegrity: {
            current: avgS1,
            threshold: 100,
            passed: avgS1 >= 100,
          },
        },
      });
      return { sprint: working, blocked: false };
    },
    report: async (sprint) => {
      await generateReport(sprint, deps);
      return { sprint };
    },
    archived: async (sprint) => {
      const r = await archiveSprint(sprint, deps);
      return { sprint: r.sprint || sprint };
    },
  };
}

/**
 * @typedef {Object} StartSprintInput
 * @property {string} id
 * @property {string} name
 * @property {string} [phase]
 * @property {Object} [context]
 * @property {string[]} [features]
 * @property {Object} [config]
 * @property {('L0'|'L1'|'L2'|'L3'|'L4')} [trustLevel]
 */

/**
 * @typedef {Object} StartSprintResult
 * @property {boolean} ok
 * @property {string} [sprintId]
 * @property {string} [finalPhase]
 * @property {string|null} [pauseTrigger]
 * @property {import('../../domain/sprint/entity').Sprint} [sprint]
 * @property {string} [reason]
 * @property {string[]} [errors]
 */

/**
 * @param {StartSprintInput} input
 * @param {{ stateStore?: Object, eventEmitter?: function, gateEvaluator?: function, autoPauseChecker?: function, phaseHandlers?: Object, clock?: () => string, env?: { now?: number } }} [deps]
 * @returns {Promise<StartSprintResult>}
 */
async function startSprint(input, deps) {
  // 1) Validate input
  const v = validateSprintInput(input);
  if (!v.ok) {
    return { ok: false, reason: 'invalid_input', errors: v.errors };
  }

  // 2) Resolve scope
  const trustLevel = (input && input.trustLevel) || 'L2';
  const scope = SPRINT_AUTORUN_SCOPE[trustLevel] || SPRINT_AUTORUN_SCOPE.L2;

  // 3) Create sprint + attach scope + open initial phase history entry
  const clock = (deps && typeof deps.clock === 'function')
    ? deps.clock
    : () => new Date().toISOString();
  const now = clock();
  let sprint = createSprint({ ...input, trustLevelAtStart: trustLevel });
  sprint = cloneSprint(sprint, {
    autoRun: {
      ...(sprint.autoRun || {}),
      scope: { stopAfter: scope.stopAfter, requireApproval: scope.requireApproval },
      startedAt: now,
    },
    startedAt: now,
    phaseHistory: [{ phase: sprint.phase, enteredAt: now, exitedAt: null, durationMs: null }],
  });

  // 4) Initial persist + creation event
  const stateStore = (deps && deps.stateStore) || inMemoryStore();
  const emit = (deps && typeof deps.eventEmitter === 'function') ? deps.eventEmitter : noopEmitter;
  await stateStore.save(sprint);
  emit(SprintEvents.SprintCreated({ sprintId: sprint.id, name: sprint.name, phase: sprint.phase }));

  // 5) Manual mode short-circuit
  if (scope.manual) {
    return {
      ok: true,
      sprintId: sprint.id,
      finalPhase: sprint.phase,
      pauseTrigger: null,
      sprint,
      reason: 'manual_mode',
    };
  }

  // 6) Auto-run loop
  const gateEvaluator = (deps && typeof deps.gateEvaluator === 'function')
    ? deps.gateEvaluator
    : evaluatePhase;
  const pauseChecker = (deps && typeof deps.autoPauseChecker === 'function')
    ? deps.autoPauseChecker
    : checkAutoPauseTriggers;
  const handlers = (deps && deps.phaseHandlers) || defaultPhaseHandlers(deps);
  const env = (deps && deps.env) || {};
  let loopCount = 0;

  while (sprint.phase !== scope.stopAfter && loopCount < HARD_LOOP_LIMIT) {
    loopCount += 1;

    // 6a) Pre-handler auto-pause check
    let hits = pauseChecker(sprint, env);
    if (hits.length > 0) {
      const paused = pauseSprint(sprint, hits, { eventEmitter: emit, clock });
      sprint = paused.sprint;
      await stateStore.save(sprint);
      return {
        ok: false,
        sprintId: sprint.id,
        finalPhase: sprint.phase,
        pauseTrigger: hits[0].triggerId,
        sprint,
      };
    }

    // 6b) Phase-specific handler
    const handler = handlers[sprint.phase];
    if (handler) {
      const handlerRes = await handler(sprint);
      if (handlerRes && handlerRes.sprint) sprint = handlerRes.sprint;
      if (handlerRes && handlerRes.blocked) {
        // Re-evaluate triggers (likely ITERATION_EXHAUSTED)
        const reHits = pauseChecker(sprint, env);
        if (reHits.length > 0) {
          const paused = pauseSprint(sprint, reHits, { eventEmitter: emit, clock });
          sprint = paused.sprint;
          await stateStore.save(sprint);
          return {
            ok: false,
            sprintId: sprint.id,
            finalPhase: sprint.phase,
            pauseTrigger: reHits[0].triggerId,
            sprint,
          };
        }
      }
    }

    // 6c) Compute next phase
    const next = computeNextPhase(sprint.phase);
    if (!next) {
      // Reached archived (or unknown) — terminate
      await stateStore.save(sprint);
      break;
    }

    // 6d) Advance phase
    const advRes = await advancePhase(sprint, next, {
      gateEvaluator,
      eventEmitter: emit,
      clock,
    });
    if (!advRes.ok) {
      if (advRes.reason === 'gate_fail') {
        // Re-evaluate triggers (likely QUALITY_GATE_FAIL)
        const reHits = pauseChecker(sprint, env);
        if (reHits.length > 0) {
          const paused = pauseSprint(sprint, reHits, { eventEmitter: emit, clock });
          sprint = paused.sprint;
          await stateStore.save(sprint);
          return {
            ok: false,
            sprintId: sprint.id,
            finalPhase: sprint.phase,
            pauseTrigger: reHits[0].triggerId,
            sprint,
            reason: 'gate_fail',
          };
        }
        await stateStore.save(sprint);
        return {
          ok: false,
          sprintId: sprint.id,
          finalPhase: sprint.phase,
          sprint,
          reason: 'gate_fail',
        };
      }
      if (advRes.reason === 'requires_user_approval') {
        await stateStore.save(sprint);
        return {
          ok: true,
          sprintId: sprint.id,
          finalPhase: sprint.phase,
          pauseTrigger: null,
          sprint,
          reason: 'stopped_at_scope_boundary',
        };
      }
      await stateStore.save(sprint);
      return {
        ok: false,
        sprintId: sprint.id,
        finalPhase: sprint.phase,
        sprint,
        reason: advRes.reason,
      };
    }
    sprint = advRes.sprint;
    await stateStore.save(sprint);
  }

  // 7) Final state save
  await stateStore.save(sprint);
  return {
    ok: true,
    sprintId: sprint.id,
    finalPhase: sprint.phase,
    pauseTrigger: null,
    sprint,
  };
}

module.exports = {
  startSprint,
  SPRINT_AUTORUN_SCOPE,
  computeNextPhase,
};
