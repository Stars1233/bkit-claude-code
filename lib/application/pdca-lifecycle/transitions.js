/**
 * transitions.js — Legal PDCA phase transitions (FR-γ2 pilot).
 *
 * Defines the directed graph of allowed phase transitions plus
 * special-case backflows (iterate within `do`, abandon-to-archive,
 * etc.). Used by `pdca status` validation and gap-detector when
 * inferring whether a state change is legal.
 *
 * Design Ref: bkit-v2111-sprint-gamma.design.md §2.3
 *
 * @module lib/application/pdca-lifecycle/transitions
 * @version 2.1.11
 * @since 2.1.11
 */

const { PHASES, isValidPhase } = require('./phases');

/**
 * Adjacency map: each phase → array of legal next phases.
 * - Forward: linear pm→plan→design→do→check→act→qa→report→archive
 * - Iterate: act → do (re-enter implementation)
 * - Skip-forward: report → archive (auto-archive on success)
 * - Abandon: any → archive (with completionType = abandoned)
 */
const TRANSITIONS = Object.freeze({
  [PHASES.PM]:      Object.freeze([PHASES.PLAN, PHASES.ARCHIVE]),
  [PHASES.PLAN]:    Object.freeze([PHASES.DESIGN, PHASES.ARCHIVE]),
  [PHASES.DESIGN]:  Object.freeze([PHASES.DO, PHASES.ARCHIVE]),
  [PHASES.DO]:      Object.freeze([PHASES.CHECK, PHASES.ARCHIVE]),
  [PHASES.CHECK]:   Object.freeze([PHASES.ACT, PHASES.QA, PHASES.ARCHIVE]),
  [PHASES.ACT]:     Object.freeze([PHASES.DO, PHASES.QA, PHASES.REPORT, PHASES.ARCHIVE]),
  [PHASES.QA]:      Object.freeze([PHASES.REPORT, PHASES.DO, PHASES.ARCHIVE]),
  [PHASES.REPORT]:  Object.freeze([PHASES.ARCHIVE]),
  [PHASES.ARCHIVE]: Object.freeze([]),
});

/**
 * Determines whether a phase transition is permitted.
 *
 * @param {string} from
 * @param {string} to
 * @returns {{ ok: boolean, reason?: string }}
 */
function canTransition(from, to) {
  if (!isValidPhase(from)) return { ok: false, reason: 'invalid_from_phase' };
  if (!isValidPhase(to))   return { ok: false, reason: 'invalid_to_phase' };
  if (from === to)         return { ok: true }; // idempotent (status refresh)
  const allowed = TRANSITIONS[from] || [];
  if (allowed.includes(to)) return { ok: true };
  return { ok: false, reason: 'transition_not_allowed' };
}

/**
 * Returns the legal next-phase set as a plain array.
 *
 * @param {string} from
 * @returns {string[]}
 */
function legalNextPhases(from) {
  if (!isValidPhase(from)) return [];
  return [...(TRANSITIONS[from] || [])];
}

module.exports = {
  TRANSITIONS,
  canTransition,
  legalNextPhases,
};
