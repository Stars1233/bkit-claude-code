'use strict';
/**
 * Unit Tests for lib/control/destructive-detector.js
 * 20 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/control/destructive-detector');
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

console.log('\n=== destructive-detector.test.js ===\n');

// --- DT-001~008: G-001 to G-008 rule detection ---

const dt1 = mod.detect('Bash', 'rm -rf /tmp/foo');
assert('DT-001', dt1.detected && dt1.rules.some(r => r.id === 'G-001'), 'G-001: rm -rf detected');

const dt2 = mod.detect('Bash', 'git push origin main --force');
assert('DT-002', dt2.detected && dt2.rules.some(r => r.id === 'G-002'), 'G-002: git push --force detected');

const dt3 = mod.detect('Bash', 'git reset --hard HEAD~3');
assert('DT-003', dt3.detected && dt3.rules.some(r => r.id === 'G-003'), 'G-003: git reset --hard detected');

const dt4 = mod.detect('Bash', 'git push origin main');
assert('DT-004', dt4.detected && dt4.rules.some(r => r.id === 'G-004'), 'G-004: protected branch push detected');

const dt5 = mod.detect('Edit', 'modify config.env.production');
assert('DT-005', dt5.detected && dt5.rules.some(r => r.id === 'G-005'), 'G-005: .env file modification detected');

const dt6 = mod.detect('Bash', 'cat server.key');
assert('DT-006', dt6.detected && dt6.rules.some(r => r.id === 'G-006'), 'G-006: secret key access detected');

const dt7 = mod.detect('Bash', 'rm file1 file2 file3 file4 file5 file6');
assert('DT-007', dt7.detected && dt7.rules.some(r => r.id === 'G-007'), 'G-007: mass file deletion detected');

const dt8 = mod.detect('Bash', 'rm -r stuff / ');
assert('DT-008', dt8.detected && dt8.rules.some(r => r.id === 'G-008'), 'G-008: root directory operation detected');

// --- DT-009~013: detect() return shape and confidence ---

const dt9 = mod.detect('Bash', 'rm -rf /important');
assert('DT-009', typeof dt9.detected === 'boolean', 'detect() returns detected boolean');
assert('DT-010', Array.isArray(dt9.rules), 'detect() returns rules array');
assert('DT-011', typeof dt9.confidence === 'number' && dt9.confidence > 0, 'detect() returns positive confidence for match');
assert('DT-012', dt9.rules.length >= 1, 'detect() returns at least one matched rule');
assert('DT-013', dt9.rules[0].id && dt9.rules[0].name && dt9.rules[0].severity, 'Matched rule has id, name, severity');

// --- DT-014~016: isDestructive() quick check ---

assert('DT-014', mod.isDestructive('rm -rf /tmp') === true, 'isDestructive true for rm -rf');
assert('DT-015', mod.isDestructive('git push --force origin main') === true, 'isDestructive true for force push');
assert('DT-016', mod.isDestructive('git reset --hard') === true, 'isDestructive true for hard reset');

// --- DT-017~020: Safe commands NOT detected ---

assert('DT-017', mod.isDestructive('ls -la') === false, 'ls is safe');
assert('DT-018', mod.isDestructive('cat README.md') === false, 'cat is safe');
assert('DT-019', mod.isDestructive('npm run test') === false, 'npm run is safe');

const dt20 = mod.detect('Bash', 'echo hello world');
assert('DT-020', dt20.detected === false && dt20.confidence === 0, 'echo hello world not detected');

// --- Summary ---

console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
