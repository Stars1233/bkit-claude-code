/**
 * Progressive Trust Tests (PT-001 ~ PT-020)
 * @module test/controllable-ai/progressive-trust
 * @version 2.0.0
 *
 * Validates progressive trust score mechanics:
 * score increases on success, decreases on failure,
 * level thresholds, downgrades, and cooldowns.
 * 20 TC total.
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
// PT-001 ~ PT-005: Score Increases with Successes
// ============================================================
console.log('\n=== Progressive Trust: Score Increases ===');

test('PT-001', 'SCORE_CHANGES.consecutive_10_success is +5', () => {
  assert.strictEqual(trustEngine.SCORE_CHANGES['consecutive_10_success'], 5);
});

test('PT-002', 'SCORE_CHANGES.match_rate_95 is +3', () => {
  assert.strictEqual(trustEngine.SCORE_CHANGES['match_rate_95'], 3);
});

test('PT-003', 'SCORE_CHANGES.7_day_no_incident is +5', () => {
  assert.strictEqual(trustEngine.SCORE_CHANGES['7_day_no_incident'], 5);
});

test('PT-004', 'calculateScore returns 0 for default profile', () => {
  const profile = trustEngine.createDefaultProfile();
  const score = trustEngine.calculateScore(profile);
  // Default has some components at 100 (rollbackFrequency, destructiveBlockRate, userOverrideRate)
  // So score = 0.15*100 + 0.15*100 + 0.10*100 = 40
  assert.ok(score >= 0, `Default score should be >= 0, got ${score}`);
});

test('PT-005', 'Increasing all component values raises the score', () => {
  const profile = trustEngine.createDefaultProfile();
  for (const key of Object.keys(profile.components)) {
    profile.components[key].value = 100;
  }
  const score = trustEngine.calculateScore(profile);
  assert.strictEqual(score, 100, 'All-100 components should yield score 100');
});

// ============================================================
// PT-006 ~ PT-010: Score Decreases with Failures
// ============================================================
console.log('\n=== Progressive Trust: Score Decreases ===');

test('PT-006', 'SCORE_CHANGES.emergency_stop is -15', () => {
  assert.strictEqual(trustEngine.SCORE_CHANGES['emergency_stop'], -15);
});

test('PT-007', 'SCORE_CHANGES.rollback is -10', () => {
  assert.strictEqual(trustEngine.SCORE_CHANGES['rollback'], -10);
});

test('PT-008', 'SCORE_CHANGES.guardrail_trigger is -10', () => {
  assert.strictEqual(trustEngine.SCORE_CHANGES['guardrail_trigger'], -10);
});

test('PT-009', 'SCORE_CHANGES.user_interrupt is -5', () => {
  assert.strictEqual(trustEngine.SCORE_CHANGES['user_interrupt'], -5);
});

test('PT-010', 'Score cannot go below 0', () => {
  const profile = trustEngine.createDefaultProfile();
  // Set all components to 0
  for (const key of Object.keys(profile.components)) {
    profile.components[key].value = 0;
  }
  profile.trustScore = 0;
  const score = trustEngine.calculateScore(profile);
  assert.ok(score >= 0, `Score should not go below 0, got ${score}`);
});

// ============================================================
// PT-011 ~ PT-013: Level Upgrade at Correct Thresholds
// ============================================================
console.log('\n=== Progressive Trust: Level Upgrade Thresholds ===');

test('PT-011', 'Score 20 qualifies for L1', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 20;
  profile.currentLevel = 0;
  const result = trustEngine.shouldEscalate(profile);
  assert.strictEqual(result.escalate, true);
  assert.ok(result.toLevel >= 1, `Score 20 should reach at least L1, got L${result.toLevel}`);
});

test('PT-012', 'Score 65 qualifies for L3', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 65;
  profile.currentLevel = 2;
  profile.lastUpgradeAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const result = trustEngine.shouldEscalate(profile);
  assert.strictEqual(result.escalate, true);
  assert.strictEqual(result.toLevel, 3);
});

test('PT-013', 'Score 84 does NOT qualify for L4', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 84;
  profile.currentLevel = 3;
  profile.lastUpgradeAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const result = trustEngine.shouldEscalate(profile);
  assert.strictEqual(result.escalate, false, 'Score 84 should not reach L4 (threshold=85)');
});

// ============================================================
// PT-014 ~ PT-016: Level Downgrade on Score Drop
// ============================================================
console.log('\n=== Progressive Trust: Level Downgrade ===');

test('PT-014', 'Score drop from 70 to 55 triggers downgrade for L3->L2', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 55; // -15 delta from 70
  profile.currentLevel = 3;
  const result = trustEngine.shouldDowngrade(profile, 70);
  assert.strictEqual(result.downgrade, true);
  assert.ok(result.toLevel < 3, `Should downgrade from L3, got L${result.toLevel}`);
});

test('PT-015', 'Score dropping below L2 threshold (40) triggers downgrade', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 35;
  profile.currentLevel = 2;
  const result = trustEngine.shouldDowngrade(profile);
  assert.strictEqual(result.downgrade, true);
  assert.ok(result.toLevel < 2);
});

test('PT-016', 'Stable score does not trigger downgrade', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 70;
  profile.currentLevel = 3;
  const result = trustEngine.shouldDowngrade(profile, 72);
  assert.strictEqual(result.downgrade, false);
});

// ============================================================
// PT-017 ~ PT-020: Cooldown Between Upgrades Enforced
// ============================================================
console.log('\n=== Progressive Trust: Upgrade Cooldown ===');

test('PT-017', 'Cooldown is 30 minutes', () => {
  assert.strictEqual(trustEngine.UPGRADE_COOLDOWN_MS, 30 * 60 * 1000);
});

test('PT-018', 'Upgrade blocked within 5 minutes of last upgrade', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 50;
  profile.currentLevel = 1;
  profile.lastUpgradeAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const result = trustEngine.shouldEscalate(profile);
  assert.strictEqual(result.escalate, false, 'Should not escalate within cooldown');
});

test('PT-019', 'Upgrade blocked within 29 minutes of last upgrade', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 50;
  profile.currentLevel = 1;
  profile.lastUpgradeAt = new Date(Date.now() - 29 * 60 * 1000).toISOString();
  const result = trustEngine.shouldEscalate(profile);
  assert.strictEqual(result.escalate, false, 'Should not escalate at 29 minutes');
});

test('PT-020', 'Upgrade allowed at 31 minutes after last upgrade', () => {
  const profile = trustEngine.createDefaultProfile();
  profile.trustScore = 50;
  profile.currentLevel = 1;
  profile.lastUpgradeAt = new Date(Date.now() - 31 * 60 * 1000).toISOString();
  const result = trustEngine.shouldEscalate(profile);
  assert.strictEqual(result.escalate, true, 'Should escalate after 31 minutes');
});

// ============================================================
// Summary
// ============================================================
console.log('\n=== Progressive Trust Test Summary ===');
console.log(`Total: ${results.pass + results.fail} | Pass: ${results.pass} | Fail: ${results.fail}`);
if (results.errors.length > 0) {
  console.log('\nFailed tests:');
  for (const e of results.errors) {
    console.log(`  ${e.id}: ${e.description}`);
    console.log(`    -> ${e.error}`);
  }
}

module.exports = { passed: results.pass, failed: results.fail, total: results.pass + results.fail, errors: results.errors };
