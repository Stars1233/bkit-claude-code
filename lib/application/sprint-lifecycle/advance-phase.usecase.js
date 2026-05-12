/**
 * advance-phase.usecase.js — Sprint phase transition use case (v2.1.13 Sprint 2).
 *
 * Five sequential steps (ENH-292):
 *   1) Transition legality        — canTransitionSprint
 *   2) Trust Level scope check    — sprint.autoRun.scope.{stopAfter, requireApproval}
 *   3) Active gates evaluation    — current-phase exit gates via gateEvaluator
 *   4) phaseHistory append        — exitedAt + durationMs for previous phase
 *   5) cloneSprint + emit         — new phase + SprintPhaseChanged event
 *
 * Returns the PDCA-pattern shape: { ok: boolean, reason?: string, sprint?: Sprint, event?: SprintEvent, gateResults?: Object }.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-2-application.design.md §7
 *
 * @module lib/application/sprint-lifecycle/advance-phase.usecase
 * @version 2.1.13
 * @since 2.1.13
 */

const { cloneSprint, SprintEvents } = require('../../domain/sprint');
const { canTransitionSprint } = require('./transitions');
const { sprintPhaseIndex } = require('./phases');
const { evaluatePhase } = require('./quality-gates');

/**
 * Append exit time to the latest phase entry if it matches `currentPhase`
 * and has not already been exited. Returns the new history array (immutable).
 *
 * @param {Array} history
 * @param {string} currentPhase
 * @param {string} exitedAt - ISO 8601
 * @returns {Array}
 */
function appendExitToHistory(history, currentPhase, exitedAt) {
  const arr = Array.isArray(history) ? history : [];
  if (arr.length === 0) return [];
  const last = arr[arr.length - 1];
  if (!last || last.phase !== currentPhase || last.exitedAt) return arr;
  const enteredMs = new Date(last.enteredAt).getTime();
  const exitedMs = new Date(exitedAt).getTime();
  const durationMs = (Number.isNaN(enteredMs) || Number.isNaN(exitedMs))
    ? null
    : (exitedMs - enteredMs);
  const closedLast = { ...last, exitedAt, durationMs };
  return [...arr.slice(0, -1), closedLast];
}

/**
 * Advance a sprint to the next phase, enforcing transition legality, Trust
 * Level scope, and active quality gates.
 *
 * @param {import('../../domain/sprint/entity').Sprint} sprint
 * @param {string} toPhase
 * @param {{ gateEvaluator?: function, eventEmitter?: function, clock?: () => string, allowGateOverride?: boolean }} [deps]
 * @returns {Promise<{ ok: boolean, sprint?: import('../../domain/sprint/entity').Sprint, event?: Object, gateResults?: Object, reason?: string, stopAfter?: string }>}
 */
async function advancePhase(sprint, toPhase, deps) {
  // Step 1: transition legality
  const transRes = canTransitionSprint(sprint && sprint.phase, toPhase);
  if (!transRes.ok) {
    return { ok: false, reason: transRes.reason };
  }
  if (sprint.phase === toPhase) {
    // Idempotent — no state change, no event
    return { ok: true, sprint, gateResults: null };
  }

  // Step 2: Trust Level scope check
  const scope = sprint.autoRun && sprint.autoRun.scope;
  if (scope && scope.stopAfter && scope.requireApproval) {
    const stopIdx = sprintPhaseIndex(scope.stopAfter);
    const toIdx = sprintPhaseIndex(toPhase);
    if (stopIdx >= 0 && toIdx > stopIdx) {
      return { ok: false, reason: 'requires_user_approval', stopAfter: scope.stopAfter };
    }
  }

  // Step 3: Active gates evaluation (exiting current phase)
  const evaluator = (deps && typeof deps.gateEvaluator === 'function')
    ? deps.gateEvaluator
    : evaluatePhase;
  const gateResults = evaluator(sprint, sprint.phase);
  if (!gateResults.allPassed && !(deps && deps.allowGateOverride)) {
    return { ok: false, reason: 'gate_fail', gateResults };
  }

  // Step 4: phaseHistory append (close previous phase + open new phase)
  const clock = (deps && typeof deps.clock === 'function')
    ? deps.clock
    : () => new Date().toISOString();
  const now = clock();
  const closed = appendExitToHistory(sprint.phaseHistory, sprint.phase, now);
  const opened = [...closed, { phase: toPhase, enteredAt: now, exitedAt: null, durationMs: null }];

  // Step 5: cloneSprint with new phase + emit event
  const updated = cloneSprint(sprint, {
    phase: toPhase,
    phaseHistory: opened,
    autoRun: {
      ...(sprint.autoRun || {}),
      lastAutoAdvanceAt: now,
    },
  });
  const event = SprintEvents.SprintPhaseChanged({
    sprintId: sprint.id,
    fromPhase: sprint.phase,
    toPhase,
    reason: 'auto_advance',
  });
  if (deps && typeof deps.eventEmitter === 'function') {
    deps.eventEmitter(event);
  }
  return { ok: true, sprint: updated, event, gateResults };
}

module.exports = {
  advancePhase,
};
