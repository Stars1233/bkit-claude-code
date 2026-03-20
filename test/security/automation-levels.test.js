/**
 * Automation Levels Tests (AL-001 ~ AL-025)
 * @module test/security/automation-levels
 * @version 2.0.0
 *
 * Validates 5-level automation control (L0-L4) for destructive operation handling.
 * Tests that each level allows/asks/denies the correct operations.
 * 25 TC total.
 */

'use strict';

const assert = require('assert');

let controller;
try {
  controller = require('../../lib/control/automation-controller');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

// ============================================================
// Test Results Collector
// ============================================================
const results = { pass: 0, fail: 0, errors: [] };

function test(id, description, fn) {
  try {
    fn();
    results.pass++;
    console.log(`  PASS  ${id}: ${description}`);
  } catch (e) {
    results.fail++;
    results.errors.push({ id, description, error: e.message });
    console.log(`  FAIL  ${id}: ${description}`);
    console.log(`        ${e.message}`);
  }
}

// ============================================================
// AL-001 ~ AL-005: L0 (Manual) — blocks everything except read
// ============================================================
console.log('\n=== Automation Levels: L0 Manual ===');

test('AL-001', 'L0 asks for file_delete (denyBelow=0, autoLevel=4)', () => {
  const r = controller.isDestructiveAllowed('file_delete', 0);
  assert.strictEqual(r, 'ask', `L0 should ask for file_delete (denyBelow=0), got ${r}`);
});

test('AL-002', 'L0 denies bash_dangerous', () => {
  const r = controller.isDestructiveAllowed('bash_dangerous', 0);
  assert.strictEqual(r, 'deny', `L0 should deny bash_dangerous, got ${r}`);
});

test('AL-003', 'L0 denies git_push_force', () => {
  const r = controller.isDestructiveAllowed('git_push_force', 0);
  assert.strictEqual(r, 'deny', `L0 should deny git_push_force, got ${r}`);
});

test('AL-004', 'L0 denies config_change', () => {
  const r = controller.isDestructiveAllowed('config_change', 0);
  assert.strictEqual(r, 'deny', `L0 should deny config_change, got ${r}`);
});

test('AL-005', 'L0 denies unknown operations', () => {
  const r = controller.isDestructiveAllowed('unknown_op', 0);
  assert.strictEqual(r, 'deny', `L0 should deny unknown ops, got ${r}`);
});

// ============================================================
// AL-006 ~ AL-010: L1 (Guided) — allows read, asks for write
// ============================================================
console.log('\n=== Automation Levels: L1 Guided ===');

test('AL-006', 'L1 asks for unknown operations (read-like)', () => {
  const r = controller.isDestructiveAllowed('unknown_op', 1);
  assert.strictEqual(r, 'ask', `L1 should ask for unknown ops, got ${r}`);
});

test('AL-007', 'L1 denies bash_dangerous (denyBelow=2)', () => {
  const r = controller.isDestructiveAllowed('bash_dangerous', 1);
  assert.strictEqual(r, 'deny', `L1 should deny bash_dangerous, got ${r}`);
});

test('AL-008', 'L1 asks for git_push (between denyBelow=2 threshold)', () => {
  const r = controller.isDestructiveAllowed('git_push', 1);
  assert.strictEqual(r, 'deny', `L1 should deny git_push (denyBelow=2), got ${r}`);
});

test('AL-009', 'L1 denies bash_destructive', () => {
  const r = controller.isDestructiveAllowed('bash_destructive', 1);
  assert.strictEqual(r, 'deny', `L1 should deny bash_destructive, got ${r}`);
});

test('AL-010', 'L1 asks for file_delete (denyBelow=0)', () => {
  const r = controller.isDestructiveAllowed('file_delete', 1);
  assert.strictEqual(r, 'ask', `L1 should ask for file_delete (denyBelow=0), got ${r}`);
});

// ============================================================
// AL-011 ~ AL-015: L2 (Semi-Auto) — allows most, asks for destructive
// ============================================================
console.log('\n=== Automation Levels: L2 Semi-Auto ===');

test('AL-011', 'L2 asks for bash_dangerous (autoLevel=3)', () => {
  const r = controller.isDestructiveAllowed('bash_dangerous', 2);
  assert.strictEqual(r, 'ask', `L2 should ask for bash_dangerous, got ${r}`);
});

test('AL-012', 'L2 asks for git_push (autoLevel=3)', () => {
  const r = controller.isDestructiveAllowed('git_push', 2);
  assert.strictEqual(r, 'ask', `L2 should ask for git_push, got ${r}`);
});

test('AL-013', 'L2 allows unknown operations', () => {
  const r = controller.isDestructiveAllowed('unknown_op', 2);
  assert.strictEqual(r, 'allow', `L2 should allow unknown ops, got ${r}`);
});

test('AL-014', 'L2 asks for file_delete (autoLevel=4)', () => {
  const r = controller.isDestructiveAllowed('file_delete', 2);
  assert.strictEqual(r, 'ask', `L2 should ask for file_delete, got ${r}`);
});

test('AL-015', 'L2 denies bash_destructive (denyBelow=3)', () => {
  const r = controller.isDestructiveAllowed('bash_destructive', 2);
  assert.strictEqual(r, 'deny', `L2 should deny bash_destructive, got ${r}`);
});

// ============================================================
// AL-016 ~ AL-020: L3 (Auto) — allows most, asks for high-risk only
// ============================================================
console.log('\n=== Automation Levels: L3 Auto ===');

test('AL-016', 'L3 allows bash_dangerous (autoLevel=3)', () => {
  const r = controller.isDestructiveAllowed('bash_dangerous', 3);
  assert.strictEqual(r, 'allow', `L3 should allow bash_dangerous, got ${r}`);
});

test('AL-017', 'L3 allows git_push (autoLevel=3)', () => {
  const r = controller.isDestructiveAllowed('git_push', 3);
  assert.strictEqual(r, 'allow', `L3 should allow git_push, got ${r}`);
});

test('AL-018', 'L3 allows external_api (autoLevel=3)', () => {
  const r = controller.isDestructiveAllowed('external_api', 3);
  assert.strictEqual(r, 'allow', `L3 should allow external_api, got ${r}`);
});

test('AL-019', 'L3 asks for git_push_force (autoLevel=4)', () => {
  const r = controller.isDestructiveAllowed('git_push_force', 3);
  assert.strictEqual(r, 'deny', `L3 should deny git_push_force (denyBelow=4), got ${r}`);
});

test('AL-020', 'L3 asks for bash_destructive (autoLevel=4)', () => {
  const r = controller.isDestructiveAllowed('bash_destructive', 3);
  assert.strictEqual(r, 'ask', `L3 should ask for bash_destructive, got ${r}`);
});

// ============================================================
// AL-021 ~ AL-025: L4 (Full Auto) — allows all but STILL blocks absolute dangers
// ============================================================
console.log('\n=== Automation Levels: L4 Full Auto ===');

test('AL-021', 'L4 allows file_delete', () => {
  const r = controller.isDestructiveAllowed('file_delete', 4);
  assert.strictEqual(r, 'allow', `L4 should allow file_delete, got ${r}`);
});

test('AL-022', 'L4 allows bash_destructive', () => {
  const r = controller.isDestructiveAllowed('bash_destructive', 4);
  assert.strictEqual(r, 'allow', `L4 should allow bash_destructive, got ${r}`);
});

test('AL-023', 'L4 allows git_push_force (autoLevel=4)', () => {
  const r = controller.isDestructiveAllowed('git_push_force', 4);
  assert.strictEqual(r, 'allow', `L4 should allow git_push_force at L4, got ${r}`);
});

test('AL-024', 'L4 allows config_change', () => {
  const r = controller.isDestructiveAllowed('config_change', 4);
  assert.strictEqual(r, 'allow', `L4 should allow config_change, got ${r}`);
});

test('AL-025', 'L4 allows all defined operations', () => {
  const ops = Object.keys(controller.DESTRUCTIVE_OPS);
  for (const op of ops) {
    const r = controller.isDestructiveAllowed(op, 4);
    assert.strictEqual(r, 'allow', `L4 should allow ${op}, got ${r}`);
  }
});

// ============================================================
// Summary
// ============================================================
console.log('\n=== Automation Levels Test Summary ===');
console.log(`Total: ${results.pass + results.fail} | Pass: ${results.pass} | Fail: ${results.fail}`);
if (results.errors.length > 0) {
  console.log('\nFailed tests:');
  for (const e of results.errors) {
    console.log(`  ${e.id}: ${e.description}`);
    console.log(`    -> ${e.error}`);
  }
}

module.exports = { passed: results.pass, failed: results.fail, total: results.pass + results.fail, errors: results.errors };
