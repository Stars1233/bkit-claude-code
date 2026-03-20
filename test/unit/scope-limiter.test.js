'use strict';
/**
 * Unit Tests for lib/control/scope-limiter.js
 * 15 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/control/scope-limiter');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

let passed = 0, failed = 0, total = 0, skipped = 0;
const failures = [];

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; failures.push({ id, message }); console.error(`  FAIL: ${id} - ${message}`); }
}

console.log('\n=== scope-limiter.test.js ===\n');

// --- SL-001~005: checkPathScope allowed paths per level ---

// L0-L1 (strict): only docs/** and .bkit/**
const sl1 = mod.checkPathScope('docs/plan/feature.md', 0);
assert('SL-001', sl1.allowed === true, 'L0: docs/ path is allowed');

const sl2 = mod.checkPathScope('.bkit/state/pdca-status.json', 1);
assert('SL-002', sl2.allowed === true, 'L1: .bkit/ path is allowed');

// L2 (moderate): src, lib, docs, test, .bkit
const sl3 = mod.checkPathScope('src/index.js', 2);
assert('SL-003', sl3.allowed === true, 'L2: src/ path is allowed');

const sl4 = mod.checkPathScope('lib/core/utils.js', 2);
assert('SL-004', sl4.allowed === true, 'L2: lib/ path is allowed');

// L3-L4 (wide): everything in allowedPaths
const sl5 = mod.checkPathScope('skills/pdca/SKILL.md', 4);
assert('SL-005', sl5.allowed === true, 'L4: skills/ path is allowed');

// --- SL-006~009: checkPathScope denied paths ---

const sl6 = mod.checkPathScope('.env', 4);
assert('SL-006', sl6.allowed === false && sl6.rule === 'DENIED_PATH', '.env denied at any level');

const sl7 = mod.checkPathScope('.git/config', 3);
assert('SL-007', sl7.allowed === false && sl7.rule === 'DENIED_PATH', '.git/ denied at any level');

const sl8 = mod.checkPathScope('node_modules/lodash/index.js', 4);
assert('SL-008', sl8.allowed === false && sl8.rule === 'DENIED_PATH', 'node_modules/ denied at any level');

const sl9 = mod.checkPathScope('src/index.js', 0);
assert('SL-009', sl9.allowed === false && sl9.rule === 'NOT_IN_SCOPE', 'src/ not in scope at L0');

// --- SL-010~012: checkOperationScope ---

const op1 = mod.checkOperationScope(3, 2000, 2);
assert('SL-010', op1.allowed === true, 'Operation within L2 limits allowed');

const op2 = mod.checkOperationScope(15, 1000, 2);
assert('SL-011', op2.allowed === false, 'File count exceeding L2 limit denied');

const op3 = mod.checkOperationScope(2, 100000, 0);
assert('SL-012', op3.allowed === false, 'Byte size exceeding L0 limit denied');

// --- SL-013~015: matchesPattern glob matching ---

assert('SL-013', mod.matchesPattern('src/utils.js', ['src/**']) === true,
  'matchesPattern: ** matches deep paths');

assert('SL-014', mod.matchesPattern('.env.production', ['.env*']) === true,
  'matchesPattern: * matches extension');

assert('SL-015', mod.matchesPattern('docs/plan.md', ['docs/*']) === true,
  'matchesPattern: single * matches single segment');

// --- Summary ---
console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
