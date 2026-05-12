/**
 * index.js — Sprint lifecycle Application Layer public API (v2.1.13).
 *
 * Re-exports the Sprint phase enum + transition graph for use cases.
 *
 * v2.1.13 ships this NEW module alongside lib/application/pdca-lifecycle/
 * for Sprint Management feature. Sprint 2~6 use cases import from here.
 *
 * Module structure:
 *   - phases.js      — SPRINT_PHASES enum, SPRINT_PHASE_ORDER, helpers
 *   - transitions.js — SPRINT_TRANSITIONS map, canTransitionSprint, legalNextSprintPhases
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.3
 * ADR Ref: 0007 (Sprint as Meta Container), 0008 (Sprint Phase Enum)
 *
 * @module lib/application/sprint-lifecycle
 * @version 2.1.13
 * @since 2.1.13
 */

const phases = require('./phases');
const transitions = require('./transitions');

module.exports = {
  // Phase enum + utilities (6 exports from phases.js)
  SPRINT_PHASES: phases.SPRINT_PHASES,
  SPRINT_PHASE_ORDER: phases.SPRINT_PHASE_ORDER,
  SPRINT_PHASE_SET: phases.SPRINT_PHASE_SET,
  isValidSprintPhase: phases.isValidSprintPhase,
  sprintPhaseIndex: phases.sprintPhaseIndex,
  nextSprintPhase: phases.nextSprintPhase,

  // Transition graph + utilities (3 exports from transitions.js)
  SPRINT_TRANSITIONS: transitions.SPRINT_TRANSITIONS,
  canTransitionSprint: transitions.canTransitionSprint,
  legalNextSprintPhases: transitions.legalNextSprintPhases,
};
