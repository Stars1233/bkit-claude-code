/**
 * archive-sprint.usecase.js — Sprint terminal-state transition (v2.1.13 Sprint 2).
 *
 * Moves a sprint to phase=='archived' + status=='archived'. When archiving
 * from the 'report' phase the S4 archiveReadiness gate must pass; archiving
 * from any other phase (user-initiated abort path allowed by transitions.js)
 * skips the S4 gate by design (the user accepted partial completion).
 *
 * Captures a kpi snapshot and emits SprintArchived.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-2-application.design.md §9
 *
 * @module lib/application/sprint-lifecycle/archive-sprint.usecase
 * @version 2.1.13
 * @since 2.1.13
 */

const { cloneSprint, SprintEvents } = require('../../domain/sprint');
const { canTransitionSprint } = require('./transitions');
const { evaluatePhase } = require('./quality-gates');

/**
 * @param {import('../../domain/sprint/entity').Sprint} sprint
 * @param {{ gateEvaluator?: function, eventEmitter?: function, clock?: () => string }} [deps]
 * @returns {Promise<{ ok: boolean, sprint?: import('../../domain/sprint/entity').Sprint, kpiSnapshot?: Object, archiveEvent?: Object, reason?: string, gateResults?: Object }>}
 */
async function archiveSprint(sprint, deps) {
  if (!sprint || typeof sprint !== 'object') {
    return { ok: false, reason: 'invalid_sprint' };
  }
  if (sprint.phase === 'archived') {
    return { ok: true, sprint, kpiSnapshot: { ...(sprint.kpi || {}) }, reason: 'already_archived' };
  }

  // 1) Transition legality (any → archived allowed by adjacency)
  const transRes = canTransitionSprint(sprint.phase, 'archived');
  if (!transRes.ok) {
    return { ok: false, reason: transRes.reason };
  }

  // 2) S4 archiveReadiness gate — only enforced when archiving from 'report'
  const evaluator = (deps && typeof deps.gateEvaluator === 'function')
    ? deps.gateEvaluator
    : evaluatePhase;
  if (sprint.phase === 'report') {
    const gateResults = evaluator(sprint, 'report');
    const s4 = gateResults && gateResults.results && gateResults.results.S4;
    if (s4 && !s4.passed) {
      return { ok: false, reason: 'archive_readiness_fail', gateResults };
    }
  }

  // 3) Capture snapshot + state transition
  const clock = (deps && typeof deps.clock === 'function')
    ? deps.clock
    : () => new Date().toISOString();
  const archivedAt = clock();
  const kpiSnapshot = { ...(sprint.kpi || {}) };
  const updated = cloneSprint(sprint, {
    phase: 'archived',
    status: 'archived',
    archivedAt,
  });

  const archiveEvent = SprintEvents.SprintArchived({
    sprintId: sprint.id,
    archivedAt,
    reason: 'completion',
    kpiSnapshot,
  });
  if (deps && typeof deps.eventEmitter === 'function') {
    deps.eventEmitter(archiveEvent);
  }

  return { ok: true, sprint: updated, kpiSnapshot, archiveEvent };
}

module.exports = {
  archiveSprint,
};
