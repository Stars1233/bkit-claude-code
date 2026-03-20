'use strict';
/**
 * Unit Tests for lib/core/errors.js
 * 20 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/core/errors');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

const { BkitError, ERROR_CODES, SEVERITY, safeCatch } = mod;

let passed = 0, failed = 0, total = 0, skipped = 0;
const failures = [];

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; failures.push({ id, message }); console.error(`  FAIL: ${id} - ${message}`); }
}

function skip(id, message) { total++; skipped++; console.log(`  SKIP: ${id} - ${message}`); }

console.log('\n=== errors.test.js ===\n');

// --- ER-001~005: BkitError creation with code/severity/cause ---

const err1 = new BkitError('test error');
assert('ER-001', err1 instanceof Error, 'BkitError extends Error');
assert('ER-002', err1.name === 'BkitError', 'BkitError.name is BkitError');
assert('ER-003', err1.code === 'BKIT_UNKNOWN', 'Default code is BKIT_UNKNOWN');

const cause = new Error('original');
const err2 = new BkitError('wrapped', {
  code: 'BKIT_PDCA_STATUS_READ',
  severity: SEVERITY.CRITICAL,
  cause,
  context: { file: '/tmp/test.json' },
});
assert('ER-004', err2.code === 'BKIT_PDCA_STATUS_READ' && err2.severity === 'critical', 'Custom code and severity');
assert('ER-005', err2.cause === cause && err2.context.file === '/tmp/test.json', 'Cause and context stored');

// --- ER-006~010: ERROR_CODES 30 codes across 7 domains ---

const allCodes = Object.keys(ERROR_CODES);
assert('ER-006', allCodes.length >= 28, `ERROR_CODES has ${allCodes.length} codes (expected 28+)`);
assert('ER-007', allCodes.filter(k => k.startsWith('BKIT_PDCA_')).length >= 5, 'PDCA domain has 5+ codes');
assert('ER-008', allCodes.filter(k => k.startsWith('BKIT_STATE_')).length >= 4, 'State domain has 4+ codes');
assert('ER-009', allCodes.filter(k => k.startsWith('BKIT_HOOK_')).length >= 3, 'Hook domain has 3+ codes');
assert('ER-010', allCodes.filter(k => k.startsWith('BKIT_TEAM_')).length >= 3, 'Team domain has 3+ codes');

// --- ER-011~014: SEVERITY levels ---

assert('ER-011', SEVERITY.CRITICAL === 'critical', 'SEVERITY.CRITICAL is critical');
assert('ER-012', SEVERITY.ERROR === 'error', 'SEVERITY.ERROR is error');
assert('ER-013', SEVERITY.WARNING === 'warning', 'SEVERITY.WARNING is warning');
assert('ER-014', SEVERITY.INFO === 'info', 'SEVERITY.INFO is info');

// --- ER-015~017: safeCatch wraps errors correctly ---

const result1 = safeCatch(() => 42, -1);
assert('ER-015', result1 === 42, 'safeCatch returns function result on success');

const result2 = safeCatch(() => { throw new Error('boom'); }, -1, { code: 'BKIT_STATE_READ' });
assert('ER-016', result2 === -1, 'safeCatch returns fallback on error');

const bkitErr = new BkitError('already wrapped', { code: 'BKIT_HOOK_TIMEOUT' });
const result3 = safeCatch(() => { throw bkitErr; }, null);
assert('ER-017', result3 === null, 'safeCatch returns fallback when BkitError is thrown');

// --- ER-018~020: toJSON, isCritical, toDebugString ---

const errJson = err2.toJSON();
assert('ER-018',
  errJson.name === 'BkitError' &&
  errJson.code === 'BKIT_PDCA_STATUS_READ' &&
  errJson.severity === 'critical' &&
  errJson.cause !== null &&
  errJson.cause.message === 'original',
  'toJSON returns correct structure with cause'
);

assert('ER-019', err2.isCritical() === true && err1.isCritical() === false, 'isCritical true for critical, false for error');

const debugStr = err2.toDebugString();
assert('ER-020',
  debugStr.includes('[BKIT_PDCA_STATUS_READ]') &&
  debugStr.includes('wrapped') &&
  debugStr.includes('caused by: original'),
  'toDebugString includes code, message, and cause'
);

// --- Summary ---

console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
