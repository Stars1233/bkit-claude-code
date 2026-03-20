'use strict';
/**
 * Unit Tests for lib/core/constants.js
 * 15 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/core/constants');
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

function skip(id, message) { total++; skipped++; console.log(`  SKIP: ${id} - ${message}`); }

console.log('\n=== constants.test.js ===\n');

// --- CT-001~005: PDCA constants exist and have correct types ---

assert('CT-001', Array.isArray(mod.PDCA_PHASES), 'PDCA_PHASES is an array');
assert('CT-002', mod.PDCA_PHASES.length === 7, 'PDCA_PHASES has 7 phases');
assert('CT-003', typeof mod.MATCH_RATE_THRESHOLD === 'number' && mod.MATCH_RATE_THRESHOLD === 90, 'MATCH_RATE_THRESHOLD is 90');
assert('CT-004', typeof mod.MAX_PDCA_ITERATIONS === 'number' && mod.MAX_PDCA_ITERATIONS > 0, 'MAX_PDCA_ITERATIONS is a positive number');
assert('CT-005', typeof mod.MAX_FEATURES === 'number' && mod.MAX_FEATURES > 0, 'MAX_FEATURES is a positive number');

// --- CT-006~008: AUTOMATION_LEVELS L0-L4 defined ---

assert('CT-006', typeof mod.AUTOMATION_LEVELS === 'object' && mod.AUTOMATION_LEVELS !== null, 'AUTOMATION_LEVELS is an object');
assert('CT-007', mod.AUTOMATION_LEVELS.L0_MANUAL === 0 && mod.AUTOMATION_LEVELS.L4_FULL_AUTO === 4, 'L0=0 and L4=4');
assert('CT-008',
  mod.AUTOMATION_LEVELS.L1_GUIDE === 1 &&
  mod.AUTOMATION_LEVELS.L2_SEMI_AUTO === 2 &&
  mod.AUTOMATION_LEVELS.L3_AUTO === 3,
  'L1=1, L2=2, L3=3'
);

// --- CT-009~011: DESTRUCTIVE_PATTERNS are valid RegExp ---

assert('CT-009', Array.isArray(mod.DESTRUCTIVE_PATTERNS), 'DESTRUCTIVE_PATTERNS is an array');
assert('CT-010', mod.DESTRUCTIVE_PATTERNS.every(p => p instanceof RegExp), 'All DESTRUCTIVE_PATTERNS are RegExp instances');
assert('CT-011', mod.DESTRUCTIVE_PATTERNS.some(p => p.test('rm -rf /')), 'rm -rf matches a destructive pattern');

// --- CT-012~013: LOOP_DETECT_LIMITS positive numbers ---

assert('CT-012', typeof mod.LOOP_DETECT_LIMITS === 'object' && mod.LOOP_DETECT_LIMITS.maxRecursionDepth > 0, 'maxRecursionDepth is positive');
assert('CT-013', mod.LOOP_DETECT_LIMITS.maxIterationsPerPhase > 0 && mod.LOOP_DETECT_LIMITS.maxRetries > 0, 'maxIterationsPerPhase and maxRetries are positive');

// --- CT-014~015: CACHE/IO timeouts positive ---

assert('CT-014', typeof mod.DEFAULT_CACHE_TTL === 'number' && mod.DEFAULT_CACHE_TTL > 0, 'DEFAULT_CACHE_TTL is positive');
assert('CT-015', typeof mod.HOOK_TIMEOUT_MS === 'number' && mod.HOOK_TIMEOUT_MS > 0, 'HOOK_TIMEOUT_MS is positive');

// --- Summary ---

console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
