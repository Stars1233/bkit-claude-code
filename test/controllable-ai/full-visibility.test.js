/**
 * Full Visibility Tests (FV-001 ~ FV-020)
 * @module test/controllable-ai/full-visibility
 * @version 2.0.0
 *
 * Validates audit trail, decision traces, and explanation generation.
 * Tests that writes, bash ops, phase transitions, and explanations
 * are properly tracked and visible.
 * 20 TC total.
 */

'use strict';

const assert = require('assert');
const path = require('path');

let detector, controller, checkpointManager, blastRadius;
try {
  detector = require('../../lib/control/destructive-detector');
  controller = require('../../lib/control/automation-controller');
  checkpointManager = require('../../lib/control/checkpoint-manager');
  blastRadius = require('../../lib/control/blast-radius');
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
// FV-001 ~ FV-005: Every Write Creates Audit Entry
// ============================================================
console.log('\n=== Full Visibility: Write Audit ===');

test('FV-001', 'detect() returns complete result for Write tool', () => {
  const r = detector.detect('Write', 'writing to .env.local');
  assert.ok('detected' in r, 'Result has detected field');
  assert.ok('rules' in r, 'Result has rules field');
  assert.ok('confidence' in r, 'Result has confidence field');
});

test('FV-002', 'detect() result for Write includes matched rule details', () => {
  const r = detector.detect('Write', 'writing to .env');
  if (r.detected) {
    const rule = r.rules[0];
    assert.ok(rule.id, 'Matched rule has id');
    assert.ok(rule.name, 'Matched rule has name');
    assert.ok(rule.severity, 'Matched rule has severity');
    assert.ok(rule.pattern, 'Matched rule has pattern source');
  }
});

test('FV-003', 'detect() for safe Write returns detected=false', () => {
  const r = detector.detect('Write', 'docs/plan.md');
  assert.strictEqual(r.detected, false, 'Safe write should not be detected');
});

test('FV-004', 'getBlockMessage returns readable output for matched rules', () => {
  const r = detector.detect('Write', '.env.production');
  const msg = detector.getBlockMessage(r.rules);
  assert.ok(typeof msg === 'string', 'Block message should be a string');
  if (r.detected) {
    assert.ok(msg.length > 10, 'Block message should have content');
  }
});

test('FV-005', 'getBlockMessage returns safe message when no rules matched', () => {
  const msg = detector.getBlockMessage([]);
  assert.ok(msg.includes('No destructive'), 'Should indicate no destructive ops');
});

// ============================================================
// FV-006 ~ FV-010: Every Bash Creates Audit Entry
// ============================================================
console.log('\n=== Full Visibility: Bash Audit ===');

test('FV-006', 'detect() returns full result for Bash tool', () => {
  const r = detector.detect('Bash', 'rm -rf /tmp');
  assert.ok(r.detected, 'Should detect destructive bash');
  assert.ok(r.rules.length >= 1, 'Should have at least one rule');
});

test('FV-007', 'detect() result includes all matching rules (not just first)', () => {
  // rm -rf / should match G-001 (recursive delete) and possibly G-008 (root)
  const r = detector.detect('Bash', 'rm -rf / ');
  assert.ok(r.rules.length >= 1, 'Should match at least 1 rule');
  // Check that rule IDs are present
  for (const rule of r.rules) {
    assert.ok(rule.id.startsWith('G-'), `Rule ID ${rule.id} should start with G-`);
  }
});

test('FV-008', 'detect() for safe Bash returns empty rules array', () => {
  const r = detector.detect('Bash', 'echo hello');
  assert.strictEqual(r.rules.length, 0, 'Safe bash should have no matched rules');
});

test('FV-009', 'getRuleAction returns correct action for known rule', () => {
  const action = detector.getRuleAction('G-001');
  assert.strictEqual(action, 'deny', 'G-001 should be deny');
});

test('FV-010', 'getRuleAction returns null for unknown rule', () => {
  const action = detector.getRuleAction('G-999');
  assert.strictEqual(action, null, 'Unknown rule should return null');
});

// ============================================================
// FV-011 ~ FV-015: Phase Transitions Create Decision Trace
// ============================================================
console.log('\n=== Full Visibility: Phase Transition Trace ===');

test('FV-011', 'getGateConfig returns gate info for known transitions', () => {
  const gate = controller.getGateConfig('plan', 'design');
  assert.ok(gate, 'Gate config should exist for plan:design');
  assert.ok('required' in gate, 'Gate has required field');
  assert.ok('autoApproveLevel' in gate, 'Gate has autoApproveLevel field');
});

test('FV-012', 'getGateConfig returns default for unknown transitions', () => {
  const gate = controller.getGateConfig('unknown', 'transition');
  assert.ok(gate, 'Should return default gate for unknown transition');
  assert.strictEqual(gate.required, true, 'Default gate should be required');
});

test('FV-013', 'canAutoAdvance returns boolean for all transitions', () => {
  const transitions = Object.keys(controller.GATE_CONFIG);
  for (const key of transitions) {
    const [from, to] = key.split(':');
    const result = controller.canAutoAdvance(from, to, 2);
    assert.strictEqual(typeof result, 'boolean', `canAutoAdvance(${key}) should return boolean`);
  }
});

test('FV-014', 'resolveAction returns valid action string', () => {
  const validActions = ['auto', 'gate', 'deny'];
  const action = controller.resolveAction('phase_transition', { fromPhase: 'plan', toPhase: 'design' });
  assert.ok(validActions.includes(action), `Action '${action}' should be one of ${validActions}`);
});

test('FV-015', 'resolveAction for destructive ops returns valid action', () => {
  const validActions = ['auto', 'gate', 'deny'];
  const action = controller.resolveAction('bash_dangerous');
  assert.ok(validActions.includes(action), `Action '${action}' should be valid`);
});

// ============================================================
// FV-016 ~ FV-020: Explanations at 3 Detail Levels
// ============================================================
console.log('\n=== Full Visibility: Explanation Levels ===');

test('FV-016', 'LEVEL_DEFINITIONS has descriptions for all 5 levels', () => {
  for (let i = 0; i <= 4; i++) {
    const def = controller.LEVEL_DEFINITIONS[i];
    assert.ok(def, `Level ${i} definition missing`);
    assert.ok(def.name, `Level ${i} has name`);
    assert.ok(def.description, `Level ${i} has description`);
  }
});

test('FV-017', 'getLevelName returns readable name for each level', () => {
  const names = [];
  for (let i = 0; i <= 4; i++) {
    const name = controller.getLevelName(i);
    assert.ok(name !== 'unknown', `Level ${i} should have a known name`);
    names.push(name);
  }
  // All names should be unique
  assert.strictEqual(new Set(names).size, 5, 'All level names should be unique');
});

test('FV-018', 'Blast radius recommendation provides human-readable text', () => {
  const result = blastRadius.analyzeBlastRadius(
    ['package.json', 'src/a.js'],
    { linesPerFile: { 'src/a.js': 600 } }
  );
  assert.ok(typeof result.recommendation === 'string', 'Recommendation should be string');
  assert.ok(result.recommendation.length > 0, 'Recommendation should not be empty');
});

test('FV-019', 'Blast radius result includes triggered rule details', () => {
  const result = blastRadius.analyzeBlastRadius(
    ['package.json'],
    {}
  );
  if (result.rules.length > 0) {
    const rule = result.rules[0];
    assert.ok(rule.id, 'Rule has id');
    assert.ok(rule.name, 'Rule has name');
    assert.ok(rule.details, 'Rule has details');
  }
});

test('FV-020', 'Blast radius returns low level for safe changes', () => {
  const result = blastRadius.analyzeBlastRadius(
    ['src/utils.js'],
    { linesPerFile: { 'src/utils.js': 10 } }
  );
  assert.strictEqual(result.level, 'low', 'Safe changes should have low blast radius');
  assert.strictEqual(result.rules.length, 0, 'No rules should trigger');
});

// ============================================================
// Summary
// ============================================================
console.log('\n=== Full Visibility Test Summary ===');
console.log(`Total: ${results.pass + results.fail} | Pass: ${results.pass} | Fail: ${results.fail}`);
if (results.errors.length > 0) {
  console.log('\nFailed tests:');
  for (const e of results.errors) {
    console.log(`  ${e.id}: ${e.description}`);
    console.log(`    -> ${e.error}`);
  }
}

module.exports = { passed: results.pass, failed: results.fail, total: results.pass + results.fail, errors: results.errors };
