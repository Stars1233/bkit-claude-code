/**
 * transitions.js — Legal Sprint phase transitions (v2.1.13 Sprint 1).
 *
 * Defines the directed graph of allowed Sprint phase transitions:
 *   - Forward: linear prd→plan→design→do→iterate→qa→report→archived
 *   - Iterate loop: do→iterate (matchRate <100% auto-trigger, user requirement)
 *                   iterate→do (max 5 cycles)
 *   - QA fail-back: qa→do (S1 dataFlowIntegrity <100)
 *   - Skip-iterate: do→qa (matchRate 100% allows iterate bypass)
 *   - Abandon: any → archived
 *
 * PDCA-pattern parity (lib/application/pdca-lifecycle/transitions.js).
 * Returns { ok: boolean, reason?: string } object (NOT plain boolean).
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.2
 * ADR Ref: 0008-sprint-phase-enum
 *
 * @module lib/application/sprint-lifecycle/transitions
 * @version 2.1.13
 * @since 2.1.13
 */

const { SPRINT_PHASES, isValidSprintPhase } = require('./phases');

/**
 * Adjacency map: each phase → array of legal next phases.
 * Nested Object.freeze() ensures both outer + inner immutability.
 */
const SPRINT_TRANSITIONS = Object.freeze({
  [SPRINT_PHASES.PRD]:      Object.freeze([SPRINT_PHASES.PLAN, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.PLAN]:     Object.freeze([SPRINT_PHASES.DESIGN, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.DESIGN]:   Object.freeze([SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.DO]:       Object.freeze([SPRINT_PHASES.ITERATE, SPRINT_PHASES.QA, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.ITERATE]:  Object.freeze([SPRINT_PHASES.QA, SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.QA]:       Object.freeze([SPRINT_PHASES.REPORT, SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.REPORT]:   Object.freeze([SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.ARCHIVED]: Object.freeze([]),
});

/**
 * Determines whether a Sprint phase transition is permitted.
 * PDCA-pattern parity: returns { ok, reason } object.
 *
 * @param {string} from
 * @param {string} to
 * @returns {{ ok: boolean, reason?: string }}
 */
function canTransitionSprint(from, to) {
  if (!isValidSprintPhase(from)) return { ok: false, reason: 'invalid_from_phase' };
  if (!isValidSprintPhase(to))   return { ok: false, reason: 'invalid_to_phase' };
  if (from === to)               return { ok: true }; // idempotent (status refresh)
  const allowed = SPRINT_TRANSITIONS[from] || [];
  if (allowed.includes(to))      return { ok: true };
  return { ok: false, reason: 'transition_not_allowed' };
}

/**
 * Returns the legal next-phase set as a plain (mutable) array copy.
 * Spread copy prevents external mutation of the frozen TRANSITIONS array.
 *
 * @param {string} from
 * @returns {string[]}
 */
function legalNextSprintPhases(from) {
  if (!isValidSprintPhase(from)) return [];
  return [...(SPRINT_TRANSITIONS[from] || [])];
}

module.exports = {
  SPRINT_TRANSITIONS,
  canTransitionSprint,
  legalNextSprintPhases,
};
