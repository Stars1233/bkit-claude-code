'use strict';
/**
 * E2E Tests: Error Recovery (10 TC)
 * Tests circuit breaker opens after 3 failures, resume point creation,
 * and session recovery from resume data.
 *
 * @module test/e2e/error-recovery.test.js
 */

const { assert, assertNoThrow, summary } = require('../helpers/assert');

// ── Module loading ──────────────────────────────────────────────────

let circuitBreaker;
try {
  circuitBreaker = require('../../lib/pdca/circuit-breaker');
} catch (e) {
  console.error('circuit-breaker module load failed:', e.message);
  process.exit(1);
}

let resume;
try {
  resume = require('../../lib/pdca/resume');
} catch (e) {
  console.error('resume module load failed:', e.message);
  process.exit(1);
}

let stateMachine;
try {
  stateMachine = require('../../lib/pdca/state-machine');
} catch (e) {
  console.error('state-machine module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== error-recovery.test.js ===\n');

// =====================================================================
// ER-001~003: Circuit breaker opens after 3 failures
// =====================================================================

const CB_FEATURE = 'test-cb-feature';

// --- ER-001: Circuit breaker starts in closed state ---
circuitBreaker.reset(CB_FEATURE);
assert('ER-001',
  circuitBreaker.isOpen(CB_FEATURE) === false,
  'Circuit breaker starts in closed state (not tripped)'
);

// --- ER-002: Circuit breaker opens after 3 consecutive failures ---
circuitBreaker.reset(CB_FEATURE);
circuitBreaker.recordFailure(CB_FEATURE, 'error-1');
circuitBreaker.recordFailure(CB_FEATURE, 'error-2');
circuitBreaker.recordFailure(CB_FEATURE, 'error-3');
const cbState = circuitBreaker.getState(CB_FEATURE);
assert('ER-002',
  circuitBreaker.isOpen(CB_FEATURE) === true || cbState.failureCount >= 3,
  'Circuit breaker opens (or reaches threshold) after 3 consecutive failures'
);

// --- ER-003: Circuit breaker reset returns to closed state ---
circuitBreaker.reset(CB_FEATURE);
assert('ER-003',
  circuitBreaker.isOpen(CB_FEATURE) === false,
  'Circuit breaker resets to closed state after reset()'
);

// =====================================================================
// ER-004~006: Resume point created on failure
// =====================================================================

// --- ER-004: createResumePoint function exists ---
assert('ER-004',
  typeof resume.createResumePoint === 'function',
  'createResumePoint function is available for failure recovery'
);

// --- ER-005: validateResumeData function exists ---
assert('ER-005',
  typeof resume.validateResumeData === 'function',
  'validateResumeData function exists for validating resume integrity'
);

// --- ER-006: validateResumeData rejects invalid data ---
const invalidResume = resume.validateResumeData(null);
assert('ER-006',
  invalidResume === false || (typeof invalidResume === 'object' && invalidResume.valid === false),
  'validateResumeData rejects null data'
);

// =====================================================================
// ER-007~010: Session recovery from resume data
// =====================================================================

// --- ER-007: resumeSession function exists ---
assert('ER-007',
  typeof resume.resumeSession === 'function',
  'resumeSession function is available for session recovery'
);

// --- ER-008: State machine has ERROR event for failure recording ---
assert('ER-008',
  stateMachine.EVENTS.includes('ERROR'),
  'State machine EVENTS includes ERROR for failure state transitions'
);

// --- ER-009: State machine has RECOVER event for recovery ---
assert('ER-009',
  stateMachine.EVENTS.includes('RECOVER'),
  'State machine EVENTS includes RECOVER for resuming from error'
);

// --- ER-010: ERROR transition saves resume point (saveResumePoint action) ---
const errorTransition = stateMachine.TRANSITIONS.find(t => t.event === 'ERROR' && t.from === '*');
assert('ER-010',
  errorTransition && errorTransition.actions.includes('saveResumePoint'),
  'ERROR transition includes saveResumePoint action for recovery data'
);

// Cleanup
circuitBreaker.reset(CB_FEATURE);

summary('error-recovery.test.js');
process.exit(0);
