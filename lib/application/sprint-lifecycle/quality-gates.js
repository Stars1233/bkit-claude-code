/**
 * quality-gates.js — Sprint Quality Gate evaluator (v2.1.13 Sprint 2).
 *
 * Evaluates M1-M10 + S1-S4 gates per phase against
 * Master Plan §12.1 ACTIVE_GATES_BY_PHASE matrix.
 *
 * Pure module — no I/O, no clock dependency.
 * Reads `sprint.qualityGates[gateKey].{current,threshold,passed}` shape.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-2-application.design.md §3
 * Master Plan Ref: docs/01-plan/features/sprint-management.master-plan.md §12.1
 * ADR Ref: 0009 (Quality Gates per phase + Sprint S1-S4)
 *
 * @module lib/application/sprint-lifecycle/quality-gates
 * @version 2.1.13
 * @since 2.1.13
 */

/**
 * Active gates per Sprint phase. Mirrors Master Plan §12.1 matrix exactly.
 * Nested Object.freeze ensures both outer + inner immutability.
 */
const ACTIVE_GATES_BY_PHASE = Object.freeze({
  prd:      Object.freeze([]),
  plan:     Object.freeze(['M8']),
  design:   Object.freeze(['M4', 'M8']),
  do:       Object.freeze(['M1', 'M2', 'M3', 'M4', 'M5', 'M7']),
  iterate:  Object.freeze(['M1', 'M2', 'M3', 'M5', 'M7']),
  qa:       Object.freeze(['M1', 'M2', 'M3', 'M4', 'M5', 'M7', 'S1', 'S2']),
  report:   Object.freeze(['M1', 'M2', 'M3', 'M4', 'M5', 'M7', 'M8', 'M10', 'S1', 'S2', 'S4']),
  archived: Object.freeze([]),
});

/**
 * Gate definitions — map gateKey to qualityGates field + comparison op + default threshold.
 * Sprint 1 entity stores gates under field names like 'M1_matchRate', so the
 * `field` property points to the snake-case suffixed key.
 */
const GATE_DEFINITIONS = Object.freeze({
  M1:  Object.freeze({ field: 'M1_matchRate',            op: '>=',  defaultThreshold: 90  }),
  M2:  Object.freeze({ field: 'M2_codeQualityScore',     op: '>=',  defaultThreshold: 80  }),
  M3:  Object.freeze({ field: 'M3_criticalIssueCount',   op: '<=',  defaultThreshold: 0   }),
  M4:  Object.freeze({ field: 'M4_apiComplianceRate',    op: '>=',  defaultThreshold: 95  }),
  M5:  Object.freeze({ field: 'M5_runtimeErrorRate',     op: '<=',  defaultThreshold: 1   }),
  M7:  Object.freeze({ field: 'M7_conventionCompliance', op: '>=',  defaultThreshold: 90  }),
  M8:  Object.freeze({ field: 'M8_designCompleteness',   op: '>=',  defaultThreshold: 85  }),
  M10: Object.freeze({ field: 'M10_pdcaCycleTimeHours',  op: '<=',  defaultThreshold: 40  }),
  S1:  Object.freeze({ field: 'S1_dataFlowIntegrity',    op: '>=',  defaultThreshold: 100 }),
  S2:  Object.freeze({ field: 'S2_featureCompletion',    op: '>=',  defaultThreshold: 100 }),
  S4:  Object.freeze({ field: 'S4_archiveReadiness',     op: '===', defaultThreshold: true }),
});

/**
 * @typedef {Object} GateResult
 * @property {string} gateKey
 * @property {number|boolean|null} current
 * @property {number|boolean|null} threshold
 * @property {boolean} passed
 * @property {string} [reason]
 */

/**
 * Evaluate a single gate against sprint state.
 *
 * @param {import('../../domain/sprint/entity').Sprint} sprint
 * @param {string} gateKey
 * @returns {GateResult}
 */
function evaluateGate(sprint, gateKey) {
  const def = GATE_DEFINITIONS[gateKey];
  if (!def) {
    return { gateKey, current: null, threshold: null, passed: false, reason: 'unknown_gate' };
  }
  const gates = (sprint && sprint.qualityGates) || {};
  const slot = gates[def.field];
  if (!slot) {
    return { gateKey, current: null, threshold: def.defaultThreshold, passed: false, reason: 'gate_slot_missing' };
  }
  const current = slot.current;
  const threshold = (typeof slot.threshold !== 'undefined' && slot.threshold !== null)
    ? slot.threshold
    : def.defaultThreshold;
  if (current === null || typeof current === 'undefined') {
    return { gateKey, current: null, threshold, passed: false, reason: 'not_measured' };
  }
  let passed = false;
  switch (def.op) {
    case '>=':
      passed = (typeof current === 'number') && current >= threshold;
      break;
    case '<=':
      passed = (typeof current === 'number') && current <= threshold;
      break;
    case '===':
      passed = current === threshold;
      break;
    default:
      passed = false;
  }
  return { gateKey, current, threshold, passed };
}

/**
 * Evaluate all active gates for the given phase.
 *
 * @param {import('../../domain/sprint/entity').Sprint} sprint
 * @param {string} phase - one of SPRINT_PHASES values
 * @returns {{ allPassed: boolean, phase: string, results: Object<string, GateResult> }}
 */
function evaluatePhase(sprint, phase) {
  const active = ACTIVE_GATES_BY_PHASE[phase] || [];
  const results = {};
  let allPassed = true;
  for (const gateKey of active) {
    const r = evaluateGate(sprint, gateKey);
    results[gateKey] = r;
    if (!r.passed) allPassed = false;
  }
  return { allPassed, phase, results };
}

module.exports = {
  evaluateGate,
  evaluatePhase,
  ACTIVE_GATES_BY_PHASE,
  GATE_DEFINITIONS,
};
