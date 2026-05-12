/**
 * index.js — Sprint lifecycle Application Layer public API (v2.1.13).
 *
 * Re-exports the Sprint phase enum + transition graph (Sprint 1) plus the
 * Sprint 2 auto-run engine: 8 use case + helper modules + frozen constants.
 *
 * Module structure:
 *   Sprint 1:
 *     phases.js               — SPRINT_PHASES enum, order, set, helpers
 *     transitions.js          — SPRINT_TRANSITIONS, canTransitionSprint, legalNextSprintPhases
 *   Sprint 2:
 *     quality-gates.js        — ACTIVE_GATES_BY_PHASE, GATE_DEFINITIONS, evaluateGate, evaluatePhase
 *     auto-pause.js           — AUTO_PAUSE_TRIGGERS, checkAutoPauseTriggers, pauseSprint, resumeSprint
 *     verify-data-flow.usecase.js — SEVEN_LAYER_HOPS, verifyDataFlow
 *     iterate-sprint.usecase.js   — iterateSprint
 *     advance-phase.usecase.js    — advancePhase
 *     generate-report.usecase.js  — generateReport
 *     archive-sprint.usecase.js   — archiveSprint
 *     start-sprint.usecase.js     — startSprint, SPRINT_AUTORUN_SCOPE, computeNextPhase
 *
 * Design Ref: docs/02-design/features/v2113-sprint-2-application.design.md §11
 * ADR Ref: 0007 (Sprint as Meta Container), 0008 (Sprint Phase Enum), 0009 (Auto-Run + Auto-Pause)
 *
 * @module lib/application/sprint-lifecycle
 * @version 2.1.13
 * @since 2.1.13
 */

const phases = require('./phases');
const transitions = require('./transitions');
const qualityGates = require('./quality-gates');
const autoPause = require('./auto-pause');
const verifyDataFlowMod = require('./verify-data-flow.usecase');
const iterateSprintMod = require('./iterate-sprint.usecase');
const advancePhaseMod = require('./advance-phase.usecase');
const generateReportMod = require('./generate-report.usecase');
const archiveSprintMod = require('./archive-sprint.usecase');
const startSprintMod = require('./start-sprint.usecase');

module.exports = {
  // Sprint 1 — Phase enum + utilities
  SPRINT_PHASES: phases.SPRINT_PHASES,
  SPRINT_PHASE_ORDER: phases.SPRINT_PHASE_ORDER,
  SPRINT_PHASE_SET: phases.SPRINT_PHASE_SET,
  isValidSprintPhase: phases.isValidSprintPhase,
  sprintPhaseIndex: phases.sprintPhaseIndex,
  nextSprintPhase: phases.nextSprintPhase,

  // Sprint 1 — Transition graph + utilities
  SPRINT_TRANSITIONS: transitions.SPRINT_TRANSITIONS,
  canTransitionSprint: transitions.canTransitionSprint,
  legalNextSprintPhases: transitions.legalNextSprintPhases,

  // Sprint 2 — Quality gates
  evaluateGate: qualityGates.evaluateGate,
  evaluatePhase: qualityGates.evaluatePhase,
  ACTIVE_GATES_BY_PHASE: qualityGates.ACTIVE_GATES_BY_PHASE,
  GATE_DEFINITIONS: qualityGates.GATE_DEFINITIONS,

  // Sprint 2 — Auto-pause
  AUTO_PAUSE_TRIGGERS: autoPause.AUTO_PAUSE_TRIGGERS,
  checkAutoPauseTriggers: autoPause.checkAutoPauseTriggers,
  pauseSprint: autoPause.pauseSprint,
  resumeSprint: autoPause.resumeSprint,

  // Sprint 2 — Use cases
  verifyDataFlow: verifyDataFlowMod.verifyDataFlow,
  SEVEN_LAYER_HOPS: verifyDataFlowMod.SEVEN_LAYER_HOPS,
  iterateSprint: iterateSprintMod.iterateSprint,
  advancePhase: advancePhaseMod.advancePhase,
  generateReport: generateReportMod.generateReport,
  archiveSprint: archiveSprintMod.archiveSprint,
  startSprint: startSprintMod.startSprint,
  SPRINT_AUTORUN_SCOPE: startSprintMod.SPRINT_AUTORUN_SCOPE,
  computeNextPhase: startSprintMod.computeNextPhase,
};
