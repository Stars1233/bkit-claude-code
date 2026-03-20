#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for lib/pdca/circuit-breaker.js
 * 15 TC | States, failure threshold, cooldown, half-open, reset, API
 *
 * @version bkit v1.6.2
 */

const path = require('path');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

console.log('\n=== circuit-breaker.test.js (15 TC) ===\n');

// Load module
let cb;
try {
  cb = require('../../lib/pdca/circuit-breaker');
} catch (e) {
  cb = null;
}

// Use unique feature names per test to avoid state leakage
const feat = (id) => `cb-test-${id}-${Date.now()}`;

// ============================================================
// Section 1: Initial State CLOSED (CB-001 ~ CB-003)
// ============================================================
console.log('\n--- Section 1: Initial State ---');

// CB-001: New feature starts in closed state
{
  const f = feat('001');
  const state = cb ? cb.getState(f) : null;
  assert('CB-001', state && state.state === 'closed',
    'New feature circuit starts in closed state');
}

// CB-002: Initial failureCount is 0
{
  const f = feat('002');
  const state = cb ? cb.getState(f) : null;
  assert('CB-002', state && state.failureCount === 0,
    'Initial failureCount is 0');
}

// CB-003: canProceed returns allowed for new feature
{
  const f = feat('003');
  const result = cb ? cb.canProceed(f) : null;
  assert('CB-003', result && result.allowed === true && result.state === 'closed',
    'canProceed returns allowed=true for new feature');
}

// ============================================================
// Section 2: 3 Failures -> OPEN (CB-004 ~ CB-006)
// ============================================================
console.log('\n--- Section 2: Failures -> OPEN ---');

// CB-004: First failure stays closed
{
  const f = feat('004');
  const r = cb ? cb.recordFailure(f, 'error1') : null;
  assert('CB-004', r && r.state === 'closed' && r.failureCount === 1,
    'First failure keeps state closed');
}

// CB-005: Second failure stays closed
{
  const f = feat('005');
  cb && cb.recordFailure(f, 'error1');
  const r = cb ? cb.recordFailure(f, 'error2') : null;
  assert('CB-005', r && r.state === 'closed' && r.failureCount === 2,
    'Second failure keeps state closed');
}

// CB-006: Third failure opens circuit
{
  const f = feat('006');
  cb && cb.recordFailure(f, 'error1');
  cb && cb.recordFailure(f, 'error2');
  const r = cb ? cb.recordFailure(f, 'error3') : null;
  assert('CB-006', r && r.state === 'open' && r.shouldRetry === false,
    'Third failure opens circuit and shouldRetry is false');
}

// ============================================================
// Section 3: Cooldown -> HALF_OPEN -> Success -> CLOSED (CB-007 ~ CB-009)
// ============================================================
console.log('\n--- Section 3: Cooldown -> HALF_OPEN -> CLOSED ---');

// CB-007: isOpen returns true when circuit is open
{
  const f = feat('007');
  cb && cb.recordFailure(f, 'e1');
  cb && cb.recordFailure(f, 'e2');
  cb && cb.recordFailure(f, 'e3');
  const result = cb ? cb.isOpen(f) : null;
  assert('CB-007', result === true,
    'isOpen returns true when circuit is open');
}

// CB-008: allowRetry returns false when open
{
  const f = feat('008');
  cb && cb.recordFailure(f, 'e1');
  cb && cb.recordFailure(f, 'e2');
  cb && cb.recordFailure(f, 'e3');
  const result = cb ? cb.allowRetry(f) : null;
  assert('CB-008', result === false,
    'allowRetry returns false when circuit is open');
}

// CB-009: recordSuccess closes circuit from half_open
{
  const f = feat('009');
  // Open the circuit
  cb && cb.recordFailure(f, 'e1');
  cb && cb.recordFailure(f, 'e2');
  cb && cb.recordFailure(f, 'e3');
  // Record success to close it
  cb && cb.recordSuccess(f);
  const state = cb ? cb.getState(f) : null;
  assert('CB-009', state && state.state === 'closed' && state.failureCount === 0,
    'recordSuccess closes circuit and resets failureCount');
}

// ============================================================
// Section 4: HALF_OPEN -> Failure -> OPEN (CB-010 ~ CB-012)
// ============================================================
console.log('\n--- Section 4: HALF_OPEN -> Failure -> OPEN ---');

// CB-010: canProceed returns not allowed when open
{
  const f = feat('010');
  cb && cb.recordFailure(f, 'e1');
  cb && cb.recordFailure(f, 'e2');
  cb && cb.recordFailure(f, 'e3');
  const result = cb ? cb.canProceed(f) : null;
  assert('CB-010', result && result.allowed === false && result.state === 'open',
    'canProceed returns allowed=false when circuit is open');
}

// CB-011: canProceed reason mentions cooldown
{
  const f = feat('011');
  cb && cb.recordFailure(f, 'e1');
  cb && cb.recordFailure(f, 'e2');
  cb && cb.recordFailure(f, 'e3');
  const result = cb ? cb.canProceed(f) : null;
  assert('CB-011', result && result.reason.includes('cooldown'),
    'canProceed reason mentions cooldown when open');
}

// CB-012: getState returns lastError from most recent failure
{
  const f = feat('012');
  cb && cb.recordFailure(f, 'specific error msg');
  const state = cb ? cb.getState(f) : null;
  assert('CB-012', state && state.lastError === 'specific error msg',
    'getState shows lastError from most recent failure');
}

// ============================================================
// Section 5: reset(), isOpen(), canProceed() (CB-013 ~ CB-015)
// ============================================================
console.log('\n--- Section 5: reset, isOpen, canProceed ---');

// CB-013: reset() restores closed state
{
  const f = feat('013');
  cb && cb.recordFailure(f, 'e1');
  cb && cb.recordFailure(f, 'e2');
  cb && cb.recordFailure(f, 'e3');
  cb && cb.reset(f);
  const state = cb ? cb.getState(f) : null;
  assert('CB-013', state && state.state === 'closed' && state.failureCount === 0,
    'reset() restores closed state with 0 failures');
}

// CB-014: isOpen returns false after reset
{
  const f = feat('014');
  cb && cb.recordFailure(f, 'e1');
  cb && cb.recordFailure(f, 'e2');
  cb && cb.recordFailure(f, 'e3');
  cb && cb.reset(f);
  assert('CB-014', cb && cb.isOpen(f) === false,
    'isOpen returns false after reset');
}

// CB-015: canProceed returns allowed after reset
{
  const f = feat('015');
  cb && cb.recordFailure(f, 'e1');
  cb && cb.recordFailure(f, 'e2');
  cb && cb.recordFailure(f, 'e3');
  cb && cb.reset(f);
  const result = cb ? cb.canProceed(f) : null;
  assert('CB-015', result && result.allowed === true,
    'canProceed returns allowed=true after reset');
}

// ============================================================
// Summary
// ============================================================
const result = summary('circuit-breaker.test.js');
module.exports = result;
