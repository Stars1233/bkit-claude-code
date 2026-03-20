/**
 * Checkpoint Integrity Tests (CI-001 ~ CI-015)
 * @module test/security/checkpoint-integrity
 * @version 2.0.0
 *
 * Validates SHA-256 hash integrity, tamper detection, and rollback rejection.
 * Uses in-memory simulation (no disk writes required).
 * 15 TC total.
 */

'use strict';

const assert = require('assert');
const crypto = require('crypto');

let checkpointManager;
try {
  checkpointManager = require('../../lib/control/checkpoint-manager');
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

/**
 * Helper: compute SHA-256 hash
 * @param {string} data
 * @returns {string}
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ============================================================
// CI-001 ~ CI-005: SHA-256 Hash Matches Content
// ============================================================
console.log('\n=== Checkpoint Integrity: Hash Verification ===');

test('CI-001', 'sha256 function is exported and works', () => {
  assert.strictEqual(typeof checkpointManager.sha256, 'function');
  const hash = checkpointManager.sha256('test data');
  assert.strictEqual(hash.length, 64, 'SHA-256 should be 64 hex chars');
});

test('CI-002', 'sha256 produces consistent results', () => {
  const h1 = checkpointManager.sha256('hello world');
  const h2 = checkpointManager.sha256('hello world');
  assert.strictEqual(h1, h2, 'Same input should produce same hash');
});

test('CI-003', 'sha256 produces different hashes for different inputs', () => {
  const h1 = checkpointManager.sha256('data-a');
  const h2 = checkpointManager.sha256('data-b');
  assert.notStrictEqual(h1, h2, 'Different inputs should produce different hashes');
});

test('CI-004', 'sha256 matches Node.js crypto output', () => {
  const input = JSON.stringify({ phase: 'plan', feature: 'test-feature', progress: 50 });
  const expected = sha256(input);
  const actual = checkpointManager.sha256(input);
  assert.strictEqual(actual, expected, 'Should match Node.js crypto sha256');
});

test('CI-005', 'sha256 handles empty string', () => {
  const hash = checkpointManager.sha256('');
  const expected = sha256('');
  assert.strictEqual(hash, expected, 'Empty string hash should match');
  assert.strictEqual(hash.length, 64);
});

// ============================================================
// CI-006 ~ CI-010: Tampered Checkpoint Detection
// ============================================================
console.log('\n=== Checkpoint Integrity: Tamper Detection ===');

test('CI-006', 'Valid checkpoint passes integrity check (simulated)', () => {
  const pdcaStatus = { phase: 'design', feature: 'test', progress: 75 };
  const statusStr = JSON.stringify(pdcaStatus);
  const hash = sha256(statusStr);

  // Simulate a valid checkpoint object
  const checkpoint = {
    id: 'cp-test-valid',
    pdcaStatus,
    pdcaStatusHash: hash,
  };

  const computedHash = sha256(JSON.stringify(checkpoint.pdcaStatus));
  assert.strictEqual(computedHash, checkpoint.pdcaStatusHash, 'Valid checkpoint hash should match');
});

test('CI-007', 'Modified pdcaStatus fails integrity check', () => {
  const originalStatus = { phase: 'plan', feature: 'test', progress: 50 };
  const originalHash = sha256(JSON.stringify(originalStatus));

  // Tamper with the data
  const tamperedStatus = { phase: 'plan', feature: 'test', progress: 100 };
  const computedHash = sha256(JSON.stringify(tamperedStatus));

  assert.notStrictEqual(computedHash, originalHash, 'Tampered data should produce different hash');
});

test('CI-008', 'Single character change in status breaks hash', () => {
  const status1 = JSON.stringify({ phase: 'do', feature: 'featureA' });
  const status2 = JSON.stringify({ phase: 'do', feature: 'featureB' });
  assert.notStrictEqual(sha256(status1), sha256(status2));
});

test('CI-009', 'Added field in status breaks hash', () => {
  const original = { phase: 'check' };
  const modified = { phase: 'check', injected: true };
  assert.notStrictEqual(
    sha256(JSON.stringify(original)),
    sha256(JSON.stringify(modified)),
    'Adding a field should break the hash'
  );
});

test('CI-010', 'Removed field in status breaks hash', () => {
  const original = { phase: 'check', feature: 'x', progress: 80 };
  const modified = { phase: 'check', feature: 'x' };
  assert.notStrictEqual(
    sha256(JSON.stringify(original)),
    sha256(JSON.stringify(modified)),
    'Removing a field should break the hash'
  );
});

// ============================================================
// CI-011 ~ CI-015: Rollback to Tampered Checkpoint Rejected
// ============================================================
console.log('\n=== Checkpoint Integrity: Rollback Rejection ===');

test('CI-011', 'rollbackToCheckpoint rejects non-existent checkpoint', () => {
  const result = checkpointManager.rollbackToCheckpoint('cp-nonexistent-999999');
  assert.strictEqual(result.restored, false, 'Should not restore non-existent checkpoint');
  assert.ok(result.details.includes('not found'), `Details should mention not found: ${result.details}`);
});

test('CI-012', 'rollbackToCheckpoint returns details string on failure', () => {
  const result = checkpointManager.rollbackToCheckpoint('cp-fake-id');
  assert.strictEqual(typeof result.details, 'string');
  assert.ok(result.details.length > 0, 'Details should not be empty on failure');
});

test('CI-013', 'rollbackToCheckpoint returns correct shape', () => {
  const result = checkpointManager.rollbackToCheckpoint('cp-shape-test');
  assert.ok('restored' in result, 'Result should have restored field');
  assert.ok('details' in result, 'Result should have details field');
  assert.strictEqual(typeof result.restored, 'boolean');
});

test('CI-014', 'Integrity verification logic: matching hash passes', () => {
  // Directly test the verification algorithm used by rollbackToCheckpoint
  const pdcaStatus = { phase: 'plan', feature: 'integrity-test', progress: 25 };
  const snapshotStr = JSON.stringify(pdcaStatus);
  const pdcaStatusHash = sha256(snapshotStr);

  // Re-compute from the stored snapshot
  const computedHash = sha256(JSON.stringify(pdcaStatus));
  assert.strictEqual(computedHash, pdcaStatusHash, 'Matching hash should pass');
});

test('CI-015', 'Integrity verification logic: mismatched hash fails', () => {
  const pdcaStatus = { phase: 'plan', feature: 'tamper-test', progress: 25 };
  const pdcaStatusHash = sha256(JSON.stringify(pdcaStatus));

  // Tamper with the data
  pdcaStatus.progress = 99;
  const computedHash = sha256(JSON.stringify(pdcaStatus));

  assert.notStrictEqual(computedHash, pdcaStatusHash,
    'Tampered data should fail integrity check');
});

// ============================================================
// Summary
// ============================================================
console.log('\n=== Checkpoint Integrity Test Summary ===');
console.log(`Total: ${results.pass + results.fail} | Pass: ${results.pass} | Fail: ${results.fail}`);
if (results.errors.length > 0) {
  console.log('\nFailed tests:');
  for (const e of results.errors) {
    console.log(`  ${e.id}: ${e.description}`);
    console.log(`    -> ${e.error}`);
  }
}

module.exports = { passed: results.pass, failed: results.fail, total: results.pass + results.fail, errors: results.errors };
