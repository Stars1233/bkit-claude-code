'use strict';
/**
 * Unit Tests for lib/core/backup-scheduler.js
 * 10 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/core/backup-scheduler');
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

console.log('\n=== backup-scheduler.test.js ===\n');

// Reset state before tests by cancelling any pending
mod.cancelPendingBackups();

// --- BS-001~003: scheduleBackup adds to pending ---

assert('BS-001', typeof mod.scheduleBackup === 'function', 'scheduleBackup is a function');

mod.scheduleBackup('pdca-status', 60000); // very long delay so it won't fire
const status1 = mod.getPendingStatus();
assert('BS-002', status1.pending.includes('pdca-status'), 'scheduleBackup adds filename to pending');
assert('BS-003', status1.timerActive === true, 'scheduleBackup activates timer');

// Cancel for clean state
mod.cancelPendingBackups();

// --- BS-004~006: flushBackup clears pending ---

assert('BS-004', typeof mod.flushBackup === 'function', 'flushBackup is a function');

const emptyFlush = mod.flushBackup();
assert('BS-005', emptyFlush.backed.length === 0, 'flushBackup with no pending returns empty backed array');

mod.scheduleBackup('memory', 60000);
const flushResult = mod.flushBackup();
// flushBackup tries to call backupToPluginData which may fail in test env
// but it should at least clear pending
const statusAfterFlush = mod.getPendingStatus();
assert('BS-006', statusAfterFlush.pending.length === 0 && statusAfterFlush.timerActive === false, 'flushBackup clears pending and timer');

// --- BS-007~008: cancelPendingBackups ---

mod.scheduleBackup('quality-metrics', 60000);
mod.scheduleBackup('pdca-status', 60000);
const beforeCancel = mod.getPendingStatus();
assert('BS-007', beforeCancel.pending.length === 2, 'Two files scheduled before cancel');

mod.cancelPendingBackups();
const afterCancel = mod.getPendingStatus();
assert('BS-008', afterCancel.pending.length === 0 && afterCancel.timerActive === false, 'cancelPendingBackups clears all pending and timer');

// --- BS-009~010: getPendingStatus ---

assert('BS-009', typeof mod.getPendingStatus === 'function', 'getPendingStatus is a function');

const cleanStatus = mod.getPendingStatus();
assert('BS-010',
  Array.isArray(cleanStatus.pending) && typeof cleanStatus.timerActive === 'boolean',
  'getPendingStatus returns { pending: [], timerActive: bool }'
);

// --- Summary ---

console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
