/**
 * Safe Defaults Tests (SD-001 ~ SD-020)
 * @module test/controllable-ai/safe-defaults
 * @version 2.0.0
 *
 * Validates that bkit starts with safe defaults:
 * L2 semi-auto, deny > ask > allow priority, L4 still blocks absolute dangers.
 * 20 TC total.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let controller, detector;
try {
  controller = require('../../lib/control/automation-controller');
  detector = require('../../lib/control/destructive-detector');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

const CONFIG_PATH = path.resolve(__dirname, '../../bkit.config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

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
// SD-001 ~ SD-005: Default Level is L2 (Semi-Auto)
// ============================================================
console.log('\n=== Safe Defaults: Default Level L2 ===');

test('SD-001', 'DEFAULT_LEVEL constant is 2', () => {
  assert.strictEqual(controller.DEFAULT_LEVEL, 2);
});

test('SD-002', 'Config automation.defaultLevel is 2', () => {
  assert.strictEqual(config.automation.defaultLevel, 2);
});

test('SD-003', 'L2 name is semi-auto', () => {
  assert.strictEqual(controller.getLevelName(2), 'semi-auto');
});

test('SD-004', 'AUTOMATION_LEVELS.SEMI_AUTO equals 2', () => {
  assert.strictEqual(controller.AUTOMATION_LEVELS.SEMI_AUTO, 2);
});

test('SD-005', 'levelFromName("semi-auto") returns 2', () => {
  assert.strictEqual(controller.levelFromName('semi-auto'), 2);
});

// ============================================================
// SD-006 ~ SD-010: deny > ask > allow Priority Preserved
// ============================================================
console.log('\n=== Safe Defaults: Priority Order ===');

test('SD-006', 'Config has deny rules for rm -rf and git push --force', () => {
  assert.strictEqual(config.permissions['Bash(rm -rf*)'], 'deny');
  assert.strictEqual(config.permissions['Bash(git push --force*)'], 'deny');
});

test('SD-007', 'Config has ask rules for rm -r and git reset --hard', () => {
  assert.strictEqual(config.permissions['Bash(rm -r*)'], 'ask');
  assert.strictEqual(config.permissions['Bash(git reset --hard*)'], 'ask');
});

test('SD-008', 'Config has allow for general Bash', () => {
  assert.strictEqual(config.permissions['Bash'], 'allow');
});

test('SD-009', 'deny rules are always more specific than allow rules', () => {
  const denyKeys = Object.keys(config.permissions).filter(k => config.permissions[k] === 'deny');
  const allowKeys = Object.keys(config.permissions).filter(k => config.permissions[k] === 'allow');
  for (const dk of denyKeys) {
    assert.ok(dk.includes('('), `Deny key '${dk}' is pattern-specific`);
  }
  for (const ak of allowKeys) {
    if (ak.includes('(')) {
      // Allow with pattern should not overlap with deny
      const denyOverlap = denyKeys.some(dk => dk === ak);
      assert.ok(!denyOverlap, `Allow pattern '${ak}' should not also be denied`);
    }
  }
});

test('SD-010', 'Destructive detector critical rules default to deny action', () => {
  const rules = detector.getRules();
  const critical = rules.filter(r => r.severity === 'critical');
  for (const rule of critical) {
    assert.strictEqual(rule.defaultAction, 'deny',
      `Critical rule ${rule.id} should default to deny`);
  }
});

// ============================================================
// SD-011 ~ SD-015: L4 Still Blocks Force Push and Hard Reset
// ============================================================
console.log('\n=== Safe Defaults: L4 Safety Floor ===');

test('SD-011', 'L4 allows git_push_force via automation controller', () => {
  // At L4, automation controller allows it — but bkit.config.json deny takes precedence
  const r = controller.isDestructiveAllowed('git_push_force', 4);
  assert.strictEqual(r, 'allow', 'Controller allows at L4');
});

test('SD-012', 'Config permanently denies Bash(rm -rf*) regardless of level', () => {
  // Config deny is a hard wall that automation level cannot override
  assert.strictEqual(config.permissions['Bash(rm -rf*)'], 'deny');
});

test('SD-013', 'Config permanently denies Bash(git push --force*) regardless of level', () => {
  assert.strictEqual(config.permissions['Bash(git push --force*)'], 'deny');
});

test('SD-014', 'Destructive detector still detects rm -rf at any automation level', () => {
  const r = detector.detect('Bash', 'rm -rf /');
  assert.ok(r.detected, 'Detector still flags rm -rf');
});

test('SD-015', 'Destructive detector still detects git push --force at any level', () => {
  const r = detector.detect('Bash', 'git push --force origin main');
  assert.ok(r.detected, 'Detector still flags git push --force');
});

// ============================================================
// SD-016 ~ SD-020: New Features Start at L2
// ============================================================
console.log('\n=== Safe Defaults: New Features Start at L2 ===');

test('SD-016', 'GATE_CONFIG plan:design requires at least L2', () => {
  const gate = controller.GATE_CONFIG['plan:design'];
  assert.ok(gate, 'plan:design gate exists');
  assert.ok(gate.autoApproveLevel >= 2, 'Requires at least L2');
});

test('SD-017', 'GATE_CONFIG design:do requires at least L2', () => {
  const gate = controller.GATE_CONFIG['design:do'];
  assert.ok(gate, 'design:do gate exists');
  assert.ok(gate.autoApproveLevel >= 2, 'Requires at least L2');
});

test('SD-018', 'L0 cannot auto-advance any gate', () => {
  for (const [key, gate] of Object.entries(controller.GATE_CONFIG)) {
    if (gate.required) {
      const canAdvance = controller.canAutoAdvance(
        key.split(':')[0], key.split(':')[1], 0
      );
      assert.strictEqual(canAdvance, false,
        `L0 should not auto-advance ${key}`);
    }
  }
});

test('SD-019', 'L1 cannot auto-advance required gates above L1', () => {
  for (const [key, gate] of Object.entries(controller.GATE_CONFIG)) {
    if (gate.autoApproveLevel > 1) {
      const canAdvance = controller.canAutoAdvance(
        key.split(':')[0], key.split(':')[1], 1
      );
      assert.strictEqual(canAdvance, false,
        `L1 should not auto-advance ${key} (requires L${gate.autoApproveLevel})`);
    }
  }
});

test('SD-020', 'autoEscalation is disabled by default in config', () => {
  assert.strictEqual(config.automation.autoEscalation, false,
    'autoEscalation should default to false');
});

// ============================================================
// Summary
// ============================================================
console.log('\n=== Safe Defaults Test Summary ===');
console.log(`Total: ${results.pass + results.fail} | Pass: ${results.pass} | Fail: ${results.fail}`);
if (results.errors.length > 0) {
  console.log('\nFailed tests:');
  for (const e of results.errors) {
    console.log(`  ${e.id}: ${e.description}`);
    console.log(`    -> ${e.error}`);
  }
}

module.exports = { passed: results.pass, failed: results.fail, total: results.pass + results.fail, errors: results.errors };
