/**
 * Scope Limiter Tests (SL-001 ~ SL-015)
 * @module test/security/scope-limiter
 * @version 2.0.0
 *
 * Validates path scope limiting per automation level.
 * Tests denied paths, L0 restrictions, and L4 wide access.
 * 15 TC total.
 */

'use strict';

const assert = require('assert');

let scopeLimiter;
try {
  scopeLimiter = require('../../lib/control/scope-limiter');
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
// SL-001 ~ SL-005: Always-Denied Patterns
// ============================================================
console.log('\n=== Scope Limiter: Always Denied ===');

test('SL-001', '.env file is always denied at any level', () => {
  for (let level = 0; level <= 4; level++) {
    const r = scopeLimiter.checkPathScope('.env', level);
    assert.strictEqual(r.allowed, false, `L${level} should deny .env`);
    assert.strictEqual(r.rule, 'DENIED_PATH');
  }
});

test('SL-002', '.env.production is always denied', () => {
  for (let level = 0; level <= 4; level++) {
    const r = scopeLimiter.checkPathScope('.env.production', level);
    assert.strictEqual(r.allowed, false, `L${level} should deny .env.production`);
  }
});

test('SL-003', '.git directory is always denied', () => {
  for (let level = 0; level <= 4; level++) {
    const r = scopeLimiter.checkPathScope('.git/config', level);
    assert.strictEqual(r.allowed, false, `L${level} should deny .git/config`);
  }
});

test('SL-004', 'node_modules is always denied', () => {
  for (let level = 0; level <= 4; level++) {
    const r = scopeLimiter.checkPathScope('node_modules/package/index.js', level);
    assert.strictEqual(r.allowed, false, `L${level} should deny node_modules`);
  }
});

test('SL-005', '*.key files are always denied', () => {
  for (let level = 0; level <= 4; level++) {
    const r = scopeLimiter.checkPathScope('server.key', level);
    assert.strictEqual(r.allowed, false, `L${level} should deny .key files`);
  }
});

// ============================================================
// SL-006 ~ SL-010: L0 Strict Scope (docs/, .bkit/ only)
// ============================================================
console.log('\n=== Scope Limiter: L0 Strict ===');

test('SL-006', 'L0 allows docs/ directory', () => {
  const r = scopeLimiter.checkPathScope('docs/plan.md', 0);
  assert.strictEqual(r.allowed, true, 'L0 should allow docs/');
});

test('SL-007', 'L0 allows .bkit/ directory', () => {
  const r = scopeLimiter.checkPathScope('.bkit/state/status.json', 0);
  assert.strictEqual(r.allowed, true, 'L0 should allow .bkit/');
});

test('SL-008', 'L0 denies src/ directory', () => {
  const r = scopeLimiter.checkPathScope('src/index.js', 0);
  assert.strictEqual(r.allowed, false, 'L0 should deny src/');
  assert.strictEqual(r.rule, 'NOT_IN_SCOPE');
});

test('SL-009', 'L0 denies lib/ directory', () => {
  const r = scopeLimiter.checkPathScope('lib/core.js', 0);
  assert.strictEqual(r.allowed, false, 'L0 should deny lib/');
});

test('SL-010', 'L0 denies test/ directory', () => {
  const r = scopeLimiter.checkPathScope('test/unit/sample.test.js', 0);
  assert.strictEqual(r.allowed, false, 'L0 should deny test/');
});

// ============================================================
// SL-011 ~ SL-015: L4 Wide Access (all except denied)
// ============================================================
console.log('\n=== Scope Limiter: L4 Wide ===');

test('SL-011', 'L4 allows src/ directory', () => {
  const r = scopeLimiter.checkPathScope('src/components/App.js', 4);
  assert.strictEqual(r.allowed, true, 'L4 should allow src/');
});

test('SL-012', 'L4 allows lib/ directory', () => {
  const r = scopeLimiter.checkPathScope('lib/control/trust-engine.js', 4);
  assert.strictEqual(r.allowed, true, 'L4 should allow lib/');
});

test('SL-013', 'L4 allows test/ directory', () => {
  const r = scopeLimiter.checkPathScope('test/security/scope-limiter.test.js', 4);
  assert.strictEqual(r.allowed, true, 'L4 should allow test/');
});

test('SL-014', 'L4 still denies .env files', () => {
  const r = scopeLimiter.checkPathScope('.env.local', 4);
  assert.strictEqual(r.allowed, false, 'L4 should still deny .env');
});

test('SL-015', 'L4 still denies .pem files', () => {
  const r = scopeLimiter.checkPathScope('certs/private.pem', 4);
  assert.strictEqual(r.allowed, false, 'L4 should still deny .pem files');
});

// ============================================================
// Summary
// ============================================================
console.log('\n=== Scope Limiter Test Summary ===');
console.log(`Total: ${results.pass + results.fail} | Pass: ${results.pass} | Fail: ${results.fail}`);
if (results.errors.length > 0) {
  console.log('\nFailed tests:');
  for (const e of results.errors) {
    console.log(`  ${e.id}: ${e.description}`);
    console.log(`    -> ${e.error}`);
  }
}

module.exports = { passed: results.pass, failed: results.fail, total: results.pass + results.fail, errors: results.errors };
