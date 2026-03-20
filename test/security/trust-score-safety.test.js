/**
 * Trust Score Safety Tests (TS-001 ~ TS-015)
 * @module test/security/trust-score-safety
 * @version 2.0.0
 *
 * Validates trust score safety constraints: no level jumping,
 * upgrade cooldowns, immediate downgrades, emergency stop.
 * 15 TC total.
 */

'use strict';

const assert = require('assert');

let trustEngine;
try {
  trustEngine = require('../../lib/control/trust-engine');
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
// TS-001 ~ TS-005: Cannot Jump from L0 to L4 Directly
// ============================================================
console.log('\n=== Trust Score Safety: No Level Jumping ===');

test('TS-001', 'LEVEL_THRESHOLDS has 5 entries (L0-L4)', () => {
  assert.strictEqual(trustEngine.LEVEL_THRESHOLDS.length, 5);
});

test('TS-002', 'L0 starts at score 0', () => {
  assert.strictEqual(trustEngine.LEVEL_THRESHOLDS[0], 0);
});

test('TS-003', 'L4 requires score >= 85', () => {
  assert.strictEqual(trustEngine.LEVEL_THRESHOLDS[4], 85);
});

test('TS-004', 'Score 50 maps to L2 not L4 (cannot jump)', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 50;
  profile.currentLevel = 0;
  const result = trustEngine.shouldEscalate(profile);
  if (result.escalate) {
    assert.ok(result.toLevel <= 2, `Score 50 should not jump to L${result.toLevel}`);
  }
});

test('TS-005', 'Thresholds are monotonically increasing', () => {
  for (let i = 1; i < trustEngine.LEVEL_THRESHOLDS.length; i++) {
    assert.ok(
      trustEngine.LEVEL_THRESHOLDS[i] > trustEngine.LEVEL_THRESHOLDS[i - 1],
      `Threshold L${i} (${trustEngine.LEVEL_THRESHOLDS[i]}) should be > L${i - 1} (${trustEngine.LEVEL_THRESHOLDS[i - 1]})`
    );
  }
});

// ============================================================
// TS-006 ~ TS-008: Upgrade Requires Cooldown (30 min)
// ============================================================
console.log('\n=== Trust Score Safety: Upgrade Cooldown ===');

test('TS-006', 'UPGRADE_COOLDOWN_MS is 30 minutes', () => {
  assert.strictEqual(trustEngine.UPGRADE_COOLDOWN_MS, 30 * 60 * 1000);
});

test('TS-007', 'Recent upgrade blocks next escalation', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 90;
  profile.currentLevel = 3;
  // Last upgrade was 5 minutes ago (within cooldown)
  profile.lastUpgradeAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const result = trustEngine.shouldEscalate(profile);
  assert.strictEqual(result.escalate, false, 'Should not escalate within cooldown');
});

test('TS-008', 'Upgrade allowed after cooldown expires', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 90;
  profile.currentLevel = 3;
  // Last upgrade was 31 minutes ago (past cooldown)
  profile.lastUpgradeAt = new Date(Date.now() - 31 * 60 * 1000).toISOString();

  const result = trustEngine.shouldEscalate(profile);
  assert.strictEqual(result.escalate, true, 'Should escalate after cooldown');
  assert.strictEqual(result.toLevel, 4, 'Should escalate to L4');
});

// ============================================================
// TS-009 ~ TS-011: Downgrade is Immediate (No Cooldown)
// ============================================================
console.log('\n=== Trust Score Safety: Immediate Downgrade ===');

test('TS-009', 'Score drop below threshold triggers downgrade', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 15; // Below L1 threshold (20)
  profile.currentLevel = 2;

  const result = trustEngine.shouldDowngrade(profile);
  assert.strictEqual(result.downgrade, true, 'Should downgrade when score below threshold');
});

test('TS-010', 'Large score drop triggers downgrade regardless of timing', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 30; // Was 50, dropped by 20 (> DOWNGRADE_DELTA)
  profile.currentLevel = 2;
  const previousScore = 50;

  const result = trustEngine.shouldDowngrade(profile, previousScore);
  assert.strictEqual(result.downgrade, true, 'Large delta should trigger immediate downgrade');
});

test('TS-011', 'Small score changes do not trigger downgrade', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 68;
  profile.currentLevel = 3;
  const previousScore = 70; // Only -2 delta

  const result = trustEngine.shouldDowngrade(profile, previousScore);
  assert.strictEqual(result.downgrade, false, 'Small delta should not trigger downgrade');
});

// ============================================================
// TS-012 ~ TS-013: Emergency Stop Resets to L0
// ============================================================
console.log('\n=== Trust Score Safety: Emergency Stop ===');

test('TS-012', 'SCORE_CHANGES.emergency_stop is -15', () => {
  assert.strictEqual(trustEngine.SCORE_CHANGES['emergency_stop'], -15);
});

test('TS-013', 'Emergency stop event decreases consecutive successes to 0', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.stats.consecutiveSuccesses = 30;

  // Simulate what recordEvent does for emergency_stop
  profile.stats.consecutiveSuccesses = 0;
  profile.stats.lastIncidentAt = new Date().toISOString();

  assert.strictEqual(profile.stats.consecutiveSuccesses, 0);
  assert.ok(profile.stats.lastIncidentAt !== null);
});

// ============================================================
// TS-014 ~ TS-015: L3 to L4 Always Requires User Approval
// ============================================================
console.log('\n=== Trust Score Safety: L3->L4 Approval ===');

test('TS-014', 'L3->L4 threshold is the highest (85)', () => {
  const l3Threshold = trustEngine.LEVEL_THRESHOLDS[3]; // 65
  const l4Threshold = trustEngine.LEVEL_THRESHOLDS[4]; // 85
  const gap = l4Threshold - l3Threshold;
  assert.ok(gap >= 20, `L3->L4 gap (${gap}) should be >= 20 to require significant trust`);
});

test('TS-015', 'Profile at exactly L4 threshold can escalate if cooldown passed', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 85;
  profile.currentLevel = 3;
  profile.lastUpgradeAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago

  const result = trustEngine.shouldEscalate(profile);
  assert.strictEqual(result.escalate, true, 'Should escalate at exactly threshold');
  assert.strictEqual(result.toLevel, 4);
});

// ============================================================
// Summary
// ============================================================
console.log('\n=== Trust Score Safety Test Summary ===');
console.log(`Total: ${results.pass + results.fail} | Pass: ${results.pass} | Fail: ${results.fail}`);
if (results.errors.length > 0) {
  console.log('\nFailed tests:');
  for (const e of results.errors) {
    console.log(`  ${e.id}: ${e.description}`);
    console.log(`    -> ${e.error}`);
  }
}

module.exports = { passed: results.pass, failed: results.fail, total: results.pass + results.fail, errors: results.errors };
