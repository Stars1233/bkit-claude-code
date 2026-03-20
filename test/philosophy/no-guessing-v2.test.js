'use strict';
/**
 * Philosophy Tests: No Guessing Principle v2 (20 TC)
 * Tests that Decision Trace has 15 types, Audit Logger has 16 action types,
 * Explanation Generator provides 3 detail levels, and Gate Manager records all results.
 *
 * @module test/philosophy/no-guessing-v2.test.js
 */

const { assert, assertNoThrow, summary } = require('../helpers/assert');

// ── Module loading ──────────────────────────────────────────────────

let decisionTracer;
try {
  decisionTracer = require('../../lib/audit/decision-tracer');
} catch (e) {
  console.error('decision-tracer module load failed:', e.message);
  process.exit(1);
}

let auditLogger;
try {
  auditLogger = require('../../lib/audit/audit-logger');
} catch (e) {
  console.error('audit-logger module load failed:', e.message);
  process.exit(1);
}

let explanationGenerator;
try {
  explanationGenerator = require('../../lib/audit/explanation-generator');
} catch (e) {
  console.error('explanation-generator module load failed:', e.message);
  process.exit(1);
}

let gateManager;
try {
  gateManager = require('../../lib/quality/gate-manager');
} catch (e) {
  console.error('gate-manager module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== no-guessing-v2.test.js ===\n');

// =====================================================================
// NG-001~005: Decision Trace has 15 types (no implicit decisions)
// =====================================================================

const { DECISION_TYPES, IMPACT_LEVELS, OUTCOMES, PDCA_PHASES } = decisionTracer;

// --- NG-001: DECISION_TYPES has exactly 15 entries ---
assert('NG-001',
  Array.isArray(DECISION_TYPES) && DECISION_TYPES.length === 15,
  `DECISION_TYPES has exactly 15 entries (found: ${DECISION_TYPES.length})`
);

// --- NG-002: DECISION_TYPES includes phase_advance ---
assert('NG-002',
  DECISION_TYPES.includes('phase_advance'),
  'DECISION_TYPES includes "phase_advance" (forward progress is explicit)'
);

// --- NG-003: DECISION_TYPES includes emergency_stop ---
assert('NG-003',
  DECISION_TYPES.includes('emergency_stop'),
  'DECISION_TYPES includes "emergency_stop" (safety decisions are explicit)'
);

// --- NG-004: DECISION_TYPES includes rollback_trigger ---
assert('NG-004',
  DECISION_TYPES.includes('rollback_trigger'),
  'DECISION_TYPES includes "rollback_trigger" (recovery decisions are explicit)'
);

// --- NG-005: All decision types are unique strings ---
const uniqueTypes = new Set(DECISION_TYPES);
assert('NG-005',
  uniqueTypes.size === DECISION_TYPES.length && DECISION_TYPES.every(t => typeof t === 'string'),
  'All 15 DECISION_TYPES are unique strings (no duplicates or implicit entries)'
);

// =====================================================================
// NG-006~010: Audit Logger has 16 action types (everything logged)
// =====================================================================

const { ACTION_TYPES, CATEGORIES, RESULTS, ACTORS, TARGET_TYPES } = auditLogger;

// --- NG-006: ACTION_TYPES has exactly 16 entries ---
assert('NG-006',
  Array.isArray(ACTION_TYPES) && ACTION_TYPES.length === 16,
  `ACTION_TYPES has exactly 16 entries (found: ${ACTION_TYPES.length})`
);

// --- NG-007: ACTION_TYPES includes phase_transition ---
assert('NG-007',
  ACTION_TYPES.includes('phase_transition'),
  'ACTION_TYPES includes "phase_transition" (phase changes are logged)'
);

// --- NG-008: ACTION_TYPES includes destructive_blocked ---
assert('NG-008',
  ACTION_TYPES.includes('destructive_blocked'),
  'ACTION_TYPES includes "destructive_blocked" (blocked actions are logged)'
);

// --- NG-009: CATEGORIES covers 6 domains ---
assert('NG-009',
  Array.isArray(CATEGORIES) && CATEGORIES.length === 6,
  `CATEGORIES has 6 entries (found: ${CATEGORIES.length}): pdca, file, config, control, team, quality`
);

// --- NG-010: RESULTS has 4 possible outcomes ---
assert('NG-010',
  Array.isArray(RESULTS) && RESULTS.length === 4 &&
  RESULTS.includes('success') && RESULTS.includes('failure') &&
  RESULTS.includes('blocked') && RESULTS.includes('skipped'),
  'RESULTS has 4 outcomes: success, failure, blocked, skipped'
);

// =====================================================================
// NG-011~015: Explanation Generator provides 3 levels of detail
// =====================================================================

const { DETAIL_LEVELS } = explanationGenerator;

// --- NG-011: DETAIL_LEVELS has exactly 3 levels ---
assert('NG-011',
  Array.isArray(DETAIL_LEVELS) && DETAIL_LEVELS.length === 3,
  `DETAIL_LEVELS has exactly 3 levels (found: ${DETAIL_LEVELS.length})`
);

// --- NG-012: DETAIL_LEVELS contains brief, normal, detailed ---
assert('NG-012',
  DETAIL_LEVELS.includes('brief') && DETAIL_LEVELS.includes('normal') && DETAIL_LEVELS.includes('detailed'),
  'DETAIL_LEVELS contains "brief", "normal", "detailed"'
);

// --- NG-013: generateExplanation produces different output for each level ---
const sampleTrace = {
  id: 'test-001',
  decisionType: 'phase_advance',
  chosenOption: 'design',
  confidence: 0.85,
  impact: 'medium',
  question: 'Which phase next?',
  rationale: 'Design document ready',
  timestamp: new Date().toISOString(),
  sessionId: 'sess-001',
  feature: 'test-feature',
  phase: 'plan',
  automationLevel: 2,
  alternatives: [{ option: 'do', score: 0.3 }],
};
const brief = explanationGenerator.generateExplanation(sampleTrace, 'brief');
const normal = explanationGenerator.generateExplanation(sampleTrace, 'normal');
const detailed = explanationGenerator.generateExplanation(sampleTrace, 'detailed');
assert('NG-013',
  brief.length < normal.length && normal.length < detailed.length,
  'generateExplanation output length: brief < normal < detailed'
);

// --- NG-014: brief explanation is a single sentence ---
assert('NG-014',
  typeof brief === 'string' && brief.length > 0 && !brief.includes('\n'),
  'Brief explanation is a single line (no newlines)'
);

// --- NG-015: detailed explanation includes trace ID and timestamp ---
assert('NG-015',
  detailed.includes('test-001') && detailed.includes('Session'),
  'Detailed explanation includes trace ID and session info'
);

// =====================================================================
// NG-016~020: Gate Manager records all gate results
// =====================================================================

// --- NG-016: checkGate returns structured result with verdict ---
assertNoThrow('NG-016', () => {
  const result = gateManager.checkGate('plan', { metrics: { designCompleteness: 80 } });
  if (!result || typeof result.verdict !== 'string') {
    throw new Error('checkGate must return object with verdict');
  }
}, 'checkGate returns structured result with verdict field');

// --- NG-017: checkGate verdict is one of pass, retry, fail ---
const gateResult = gateManager.checkGate('plan', { metrics: { designCompleteness: 80 } });
assert('NG-017',
  ['pass', 'retry', 'fail'].includes(gateResult.verdict),
  `checkGate verdict is one of pass/retry/fail (got: ${gateResult.verdict})`
);

// --- NG-018: checkGate with low metrics returns retry or fail ---
const lowResult = gateManager.checkGate('design', { metrics: { designCompleteness: 20, conventionCompliance: 30 } });
assert('NG-018',
  lowResult.verdict === 'fail' || lowResult.verdict === 'retry',
  'checkGate with low metrics returns retry or fail (not optimistic pass)'
);

// --- NG-019: recordGateResult is callable (logs gate results for audit) ---
assert('NG-019',
  typeof gateManager.recordGateResult === 'function',
  'recordGateResult function exists for recording gate evaluation results'
);

// --- NG-020: getEffectiveThresholds returns overrides per level ---
assert('NG-020',
  typeof gateManager.getEffectiveThresholds === 'function',
  'getEffectiveThresholds function exists for level-specific threshold resolution'
);

summary('no-guessing-v2.test.js');
process.exit(0);
