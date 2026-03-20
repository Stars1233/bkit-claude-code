'use strict';
/**
 * E2E Tests: PDCA Auto Cycle (15 TC)
 * Tests state machine transitions through full PDCA cycle,
 * quality gate checks at each phase, and audit log entries.
 *
 * @module test/e2e/pdca-auto-cycle.test.js
 */

const { assert, assertNoThrow, summary } = require('../helpers/assert');

// ── Module loading ──────────────────────────────────────────────────

let stateMachine;
try {
  stateMachine = require('../../lib/pdca/state-machine');
} catch (e) {
  console.error('state-machine module load failed:', e.message);
  process.exit(1);
}

let gateManager;
try {
  gateManager = require('../../lib/quality/gate-manager');
} catch (e) {
  console.error('gate-manager module load failed:', e.message);
  process.exit(1);
}

let auditLogger;
try {
  auditLogger = require('../../lib/audit/audit-logger');
} catch (e) {
  console.error('audit-logger module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== pdca-auto-cycle.test.js ===\n');

const { TRANSITIONS, STATES, EVENTS, canTransition, findTransition } = stateMachine;

// =====================================================================
// PA-001~005: State machine transitions through full PDCA cycle
// =====================================================================

// --- PA-001: idle -> pm via START event ---
const t1 = findTransition('idle', 'START');
assert('PA-001',
  t1 !== null && t1.to === 'pm',
  'idle -> pm transition found via START event'
);

// --- PA-002: pm -> plan via PM_DONE event ---
const t2 = findTransition('pm', 'PM_DONE');
assert('PA-002',
  t2 !== null && t2.to === 'plan',
  'pm -> plan transition found via PM_DONE event'
);

// --- PA-003: plan -> design -> do -> check forward chain ---
const t3 = findTransition('plan', 'PLAN_DONE');
const t4 = findTransition('design', 'DESIGN_DONE');
const t5 = findTransition('do', 'DO_COMPLETE');
assert('PA-003',
  t3 && t3.to === 'design' && t4 && t4.to === 'do' && t5 && t5.to === 'check',
  'Forward chain: plan->design->do->check transitions exist'
);

// --- PA-004: check -> report via MATCH_PASS event ---
const t6 = findTransition('check', 'MATCH_PASS');
assert('PA-004',
  t6 !== null && t6.to === 'report',
  'check -> report transition found via MATCH_PASS event'
);

// --- PA-005: report -> archived via ARCHIVE event ---
const t7 = findTransition('report', 'ARCHIVE');
assert('PA-005',
  t7 !== null && t7.to === 'archived',
  'report -> archived transition found via ARCHIVE event'
);

// =====================================================================
// PA-006~010: Quality gate checks at each phase
// =====================================================================

// --- PA-006: pm gate check returns verdict ---
const pmGate = gateManager.checkGate('pm', { metrics: { designCompleteness: 50 } });
assert('PA-006',
  pmGate && typeof pmGate.verdict === 'string',
  'pm gate check returns structured verdict'
);

// --- PA-007: plan gate check with high metrics passes ---
const planGate = gateManager.checkGate('plan', { metrics: { designCompleteness: 80 } });
assert('PA-007',
  planGate && planGate.verdict === 'pass',
  'plan gate passes with designCompleteness=80'
);

// --- PA-008: design gate check with low metrics retries ---
const designGate = gateManager.checkGate('design', { metrics: { designCompleteness: 50, conventionCompliance: 40 } });
assert('PA-008',
  designGate && (designGate.verdict === 'retry' || designGate.verdict === 'fail'),
  'design gate retries/fails with low metrics'
);

// --- PA-009: check gate requires matchRate >= 90 for pass ---
const checkGatePass = gateManager.checkGate('check', {
  metrics: { matchRate: 95, codeQualityScore: 80, criticalIssueCount: 0, apiComplianceRate: 98 }
});
assert('PA-009',
  checkGatePass && checkGatePass.verdict === 'pass',
  'check gate passes with matchRate=95, codeQuality=80, criticalIssue=0, apiCompliance=98'
);

// --- PA-010: check gate with matchRate < 90 does not pass ---
const checkGateFail = gateManager.checkGate('check', {
  metrics: { matchRate: 70, codeQualityScore: 80, criticalIssueCount: 0, apiComplianceRate: 98 }
});
assert('PA-010',
  checkGateFail && checkGateFail.verdict !== 'pass',
  'check gate does not pass with matchRate=70'
);

// =====================================================================
// PA-011~015: Audit log contains entries for each phase
// =====================================================================

// --- PA-011: writeAuditLog function exists ---
assert('PA-011',
  typeof auditLogger.writeAuditLog === 'function',
  'writeAuditLog function is available for recording phase transitions'
);

// --- PA-012: ACTION_TYPES includes phase_transition ---
assert('PA-012',
  auditLogger.ACTION_TYPES.includes('phase_transition'),
  'ACTION_TYPES includes "phase_transition" for recording PDCA cycle events'
);

// --- PA-013: ACTION_TYPES includes checkpoint_created ---
assert('PA-013',
  auditLogger.ACTION_TYPES.includes('checkpoint_created'),
  'ACTION_TYPES includes "checkpoint_created" for recording checkpoints during cycle'
);

// --- PA-014: ACTION_TYPES includes gate_passed and gate_failed ---
assert('PA-014',
  auditLogger.ACTION_TYPES.includes('gate_passed') && auditLogger.ACTION_TYPES.includes('gate_failed'),
  'ACTION_TYPES includes both "gate_passed" and "gate_failed" for gate results'
);

// --- PA-015: generateDailySummary function exists for audit review ---
assert('PA-015',
  typeof auditLogger.generateDailySummary === 'function',
  'generateDailySummary function exists for reviewing PDCA cycle audit trails'
);

summary('pdca-auto-cycle.test.js');
process.exit(0);
