/**
 * index.js — Application Layer pilot public API (FR-γ2).
 *
 * Re-exports the phase enum + transition graph. v2.1.11 ships this as
 * a NEW module; existing `lib/pdca/lifecycle.js` stays in place
 * untouched. v2.1.12 will migrate full lifecycle implementation here
 * and turn `lib/pdca/lifecycle.js` into a deprecation shim.
 *
 * Pilot scope (v2.1.11):
 *   - phases.js    — PHASES enum, PHASE_ORDER, isValidPhase, nextPhase
 *   - transitions.js — TRANSITIONS map, canTransition, legalNextPhases
 *
 * Deferred (v2.1.12 ENH carryover):
 *   - Full lifecycle migration (initializeFeature, archiveFeature, ...)
 *   - lib/pdca/lifecycle.js shim re-export
 *   - Consumer call-site updates (30+ imports)
 *
 * Design Ref: bkit-v2111-sprint-gamma.design.md §2.3 / §3.2 / §FR-γ2
 *
 * @module lib/application/pdca-lifecycle
 * @version 2.1.11
 * @since 2.1.11
 */

const phases = require('./phases');
const transitions = require('./transitions');

module.exports = {
  // Phase enum + utilities
  PHASES: phases.PHASES,
  PHASE_ORDER: phases.PHASE_ORDER,
  PHASE_SET: phases.PHASE_SET,
  isValidPhase: phases.isValidPhase,
  phaseIndex: phases.phaseIndex,
  nextPhase: phases.nextPhase,

  // Transition graph + utilities
  TRANSITIONS: transitions.TRANSITIONS,
  canTransition: transitions.canTransition,
  legalNextPhases: transitions.legalNextPhases,
};
