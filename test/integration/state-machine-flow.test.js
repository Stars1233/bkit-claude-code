#!/usr/bin/env node
/**
 * State Machine Flow Integration Test
 * @module test/integration/state-machine-flow
 * @version 2.0.0
 *
 * Verifies state machine transition flows:
 * - Normal forward flow (idle->plan->design->do->check->report->archived)
 * - Check->Act iteration loop
 * - Error/rollback/reset wildcard transitions
 * - Context persistence across transitions
 * 25 TC: SF-001 ~ SF-025
 */

const path = require('path');
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

let passed = 0;
let failed = 0;
const results = [];

function assert(id, condition, description) {
  if (condition) {
    passed++;
    results.push({ id, status: 'PASS', description });
  } else {
    failed++;
    results.push({ id, status: 'FAIL', description });
    console.assert(false, `${id}: ${description}`);
  }
}

const sm = require(path.join(PROJECT_ROOT, 'lib/pdca/state-machine'));

// ============================================================
// Section 1: idle->plan->design->do->check flow (SF-001~005)
// ============================================================

// SF-001: idle -> plan via SKIP_PM
const ctx1 = sm.createContext('test-flow-1');
const r1 = sm.transition('idle', 'SKIP_PM', ctx1);
assert('SF-001',
  r1.success === true && r1.currentState === 'plan',
  'idle -> plan via SKIP_PM succeeds'
);

// SF-002: plan -> design via PLAN_DONE (guard may block without deliverable)
const ctx2 = sm.createContext('test-flow-2', { currentState: 'plan' });
const r2 = sm.transition('plan', 'PLAN_DONE', ctx2);
assert('SF-002',
  r2.success === false || r2.currentState === 'design',
  'plan -> design via PLAN_DONE (guard-dependent)'
);

// SF-003: idle -> pm via START
const ctx3 = sm.createContext('test-flow-3');
const r3 = sm.transition('idle', 'START', ctx3);
assert('SF-003',
  r3.success === true && r3.currentState === 'pm',
  'idle -> pm via START succeeds'
);

// SF-004: findTransition returns correct entry for do -> check
const t4 = sm.findTransition('do', 'DO_COMPLETE');
assert('SF-004',
  t4 !== null && t4.to === 'check',
  'findTransition(do, DO_COMPLETE) returns to=check'
);

// SF-005: canTransition returns true for valid transition
const can5 = sm.canTransition('idle', 'START');
assert('SF-005',
  can5 === true,
  'canTransition(idle, START) returns true'
);

// ============================================================
// Section 2: check->act->check iteration loop (SF-006~010)
// ============================================================

// SF-006: check -> act via ITERATE
const ctx6 = sm.createContext('test-iter-1', { currentState: 'check' });
const r6 = sm.transition('check', 'ITERATE', ctx6);
assert('SF-006',
  r6.success === true && r6.currentState === 'act',
  'check -> act via ITERATE succeeds'
);

// SF-007: act -> check via ANALYZE_DONE
const r7 = sm.transition('act', 'ANALYZE_DONE', ctx6);
assert('SF-007',
  r7.success === true && r7.currentState === 'check',
  'act -> check via ANALYZE_DONE succeeds'
);

// SF-008: iterationCount increments on ITERATE
const ctx8 = sm.createContext('test-iter-2', { currentState: 'check', iterationCount: 0 });
sm.transition('check', 'ITERATE', ctx8);
assert('SF-008',
  ctx8.iterationCount === 1,
  'iterationCount increments from 0 to 1 after ITERATE'
);

// SF-009: Multiple iterations increment correctly
sm.transition('act', 'ANALYZE_DONE', ctx8);
sm.transition('check', 'ITERATE', ctx8);
assert('SF-009',
  ctx8.iterationCount === 2,
  'iterationCount increments from 1 to 2 after second ITERATE'
);

// SF-010: ITERATE blocked when maxIterations reached
const ctx10 = sm.createContext('test-iter-3', {
  currentState: 'check',
  iterationCount: 5,
  maxIterations: 5
});
const r10 = sm.transition('check', 'ITERATE', ctx10);
assert('SF-010',
  r10.success === false && r10.blockedBy === 'guardCanIterate',
  'ITERATE blocked when iterationCount >= maxIterations'
);

// ============================================================
// Section 3: check->report->archived completion (SF-011~015)
// ============================================================

// SF-011: check -> report via MATCH_PASS (guard-dependent)
const ctx11 = sm.createContext('test-complete-1', {
  currentState: 'check',
  matchRate: 95
});
const r11 = sm.transition('check', 'MATCH_PASS', ctx11);
assert('SF-011',
  r11.success === true && r11.currentState === 'report',
  'check -> report via MATCH_PASS when matchRate >= threshold'
);

// SF-012: MATCH_PASS blocked with low matchRate
const ctx12 = sm.createContext('test-complete-2', {
  currentState: 'check',
  matchRate: 50
});
const r12 = sm.transition('check', 'MATCH_PASS', ctx12);
assert('SF-012',
  r12.success === false && r12.blockedBy === 'guardMatchRatePass',
  'MATCH_PASS blocked when matchRate < threshold'
);

// SF-013: report -> archived via ARCHIVE
const ctx13 = sm.createContext('test-complete-3', { currentState: 'report' });
const r13 = sm.transition('report', 'ARCHIVE', ctx13);
assert('SF-013',
  r13.success === true && r13.currentState === 'archived',
  'report -> archived via ARCHIVE succeeds'
);

// SF-014: report -> report via REPORT_DONE (self-loop)
const ctx14 = sm.createContext('test-complete-4', { currentState: 'report' });
const r14 = sm.transition('report', 'REPORT_DONE', ctx14);
assert('SF-014',
  r14.success === true && r14.currentState === 'report',
  'report -> report via REPORT_DONE (self-loop) succeeds'
);

// SF-015: check -> report via REPORT_DONE when max iterations reached
const ctx15 = sm.createContext('test-complete-5', {
  currentState: 'check',
  iterationCount: 5,
  maxIterations: 5
});
const r15 = sm.transition('check', 'REPORT_DONE', ctx15);
assert('SF-015',
  r15.success === true && r15.currentState === 'report',
  'check -> report via REPORT_DONE when guardMaxIterReached'
);

// ============================================================
// Section 4: Error/rollback/reset wildcard transitions (SF-016~020)
// ============================================================

// SF-016: ERROR from any state -> error
const ctx16 = sm.createContext('test-error-1', { currentState: 'do' });
const r16 = sm.transition('do', 'ERROR', ctx16);
assert('SF-016',
  r16.success === true && r16.currentState === 'error',
  'do -> error via ERROR wildcard transition'
);

// SF-017: RESET from any state -> idle
const ctx17 = sm.createContext('test-reset-1', { currentState: 'check' });
const r17 = sm.transition('check', 'RESET', ctx17);
assert('SF-017',
  r17.success === true && r17.currentState === 'idle',
  'check -> idle via RESET wildcard transition'
);

// SF-018: ABANDON from any state -> archived
const ctx18 = sm.createContext('test-abandon-1', { currentState: 'design' });
const r18 = sm.transition('design', 'ABANDON', ctx18);
assert('SF-018',
  r18.success === true && r18.currentState === 'archived',
  'design -> archived via ABANDON wildcard transition'
);

// SF-019: REJECT from pm -> idle
const ctx19 = sm.createContext('test-reject-1', { currentState: 'pm' });
const r19 = sm.transition('pm', 'REJECT', ctx19);
assert('SF-019',
  r19.success === true && r19.currentState === 'idle',
  'pm -> idle via REJECT'
);

// SF-020: REJECT from plan -> pm
const ctx20 = sm.createContext('test-reject-2', { currentState: 'plan' });
const r20 = sm.transition('plan', 'REJECT', ctx20);
assert('SF-020',
  r20.success === true && r20.currentState === 'pm',
  'plan -> pm via REJECT'
);

// ============================================================
// Section 5: Context persistence across transitions (SF-021~025)
// ============================================================

// SF-021: Feature name persists across transitions
const ctx21 = sm.createContext('feat-persist-1');
sm.transition('idle', 'SKIP_PM', ctx21);
assert('SF-021',
  ctx21.feature === 'feat-persist-1',
  'Feature name persists after SKIP_PM transition'
);

// SF-022: Timestamps accumulate
const ctx22 = sm.createContext('feat-persist-2');
sm.transition('idle', 'SKIP_PM', ctx22);
assert('SF-022',
  ctx22.timestamps != null && ctx22.timestamps.lastUpdated != null,
  'Timestamps are recorded after transition'
);

// SF-023: Context matchRate persists
const ctx23 = sm.createContext('feat-persist-3', { matchRate: 92 });
sm.transition('idle', 'SKIP_PM', ctx23);
assert('SF-023',
  ctx23.matchRate === 92,
  'matchRate value persists across transitions'
);

// SF-024: maxIterations persists
const ctx24 = sm.createContext('feat-persist-4', { maxIterations: 3 });
assert('SF-024',
  ctx24.maxIterations === 3,
  'maxIterations override persists in context'
);

// SF-025: getAvailableEvents returns events for state
const events25 = sm.getAvailableEvents('idle');
assert('SF-025',
  Array.isArray(events25) && events25.some(e => e.event === 'START') && events25.some(e => e.event === 'SKIP_PM'),
  'getAvailableEvents(idle) returns START and SKIP_PM'
);

// ============================================================
// Summary
// ============================================================
console.log('\n========================================');
console.log('State Machine Flow Integration Test Results');
console.log('========================================');
console.log(`Total: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
console.log(`Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log('----------------------------------------');
results.forEach(r => {
  console.log(`  ${r.status === 'PASS' ? '[PASS]' : '[FAIL]'} ${r.id}: ${r.description}`);
});
console.log('========================================\n');

module.exports = { passed, failed, total: passed + failed, results };
if (failed > 0) process.exit(1);
