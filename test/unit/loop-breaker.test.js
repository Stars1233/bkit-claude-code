'use strict';
/**
 * Unit Tests for lib/control/loop-breaker.js
 * 15 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/control/loop-breaker');
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

console.log('\n=== loop-breaker.test.js ===\n');

// Reset before tests
mod.reset('all');

// --- LB-001~004: Rules trigger correctly ---

// LB-001: PDCA iteration loop (warnAt=3, maxCount=5)
mod.reset('all');
for (let i = 0; i < 3; i++) mod.recordAction('pdca_iteration', 'feat-a');
const lb1 = mod.checkLoop();
assert('LB-001', lb1.detected === true && lb1.rule === 'LB-001' && lb1.action === 'warn',
  'LB-001: PDCA iteration loop warns at 3');

// Push to max for abort
mod.recordAction('pdca_iteration', 'feat-a');
mod.recordAction('pdca_iteration', 'feat-a');
const lb1b = mod.checkLoop();
assert('LB-002', lb1b.detected === true && lb1b.rule === 'LB-001' && lb1b.action === 'abort',
  'LB-001: PDCA iteration loop aborts at 5');

// LB-002: Same file edit loop (warnAt=7, maxCount=10)
mod.reset('all');
for (let i = 0; i < 7; i++) mod.recordAction('file_edit', 'src/index.js');
const lb2 = mod.checkLoop();
assert('LB-003', lb2.detected === true && lb2.rule === 'LB-002' && lb2.action === 'warn',
  'LB-002: File edit loop warns at 7');

// LB-004: Error retry loop (warnAt=2, maxCount=3)
mod.reset('all');
for (let i = 0; i < 3; i++) mod.recordAction('error', 'TypeError: undefined is not a function');
const lb4 = mod.checkLoop();
assert('LB-004', lb4.detected === true && lb4.rule === 'LB-004' && lb4.action === 'pause',
  'LB-004: Error retry loop pauses at 3');

// --- LB-005~008: recordAction increments counters ---

mod.reset('all');
mod.recordAction('pdca_iteration', 'feat-x');
mod.recordAction('pdca_iteration', 'feat-x');
const counters1 = mod.getCounters();
assert('LB-005', counters1.pdcaIterations['feat-x'] === 2, 'recordAction increments pdca_iteration counter');

mod.recordAction('file_edit', 'test.js');
const counters2 = mod.getCounters();
assert('LB-006', counters2.fileEditCounts['test.js'] === 1, 'recordAction increments file_edit counter');

mod.recordAction('agent_call', 'agentA');
mod.recordAction('agent_call', 'agentB');
const counters3 = mod.getCounters();
assert('LB-007', counters3.agentCallStack.length === 2, 'recordAction pushes to agent call stack');

mod.recordAction('error', 'SomeError');
const counters4 = mod.getCounters();
assert('LB-008', counters4.errorCounts['SomeError'] === 1, 'recordAction increments error counter');

// --- LB-009~011: checkLoop returns correct action ---

mod.reset('all');
const noLoop = mod.checkLoop();
assert('LB-009', noLoop.detected === false && noLoop.rule === null, 'No loop detected when counters are clean');

mod.reset('all');
for (let i = 0; i < 10; i++) mod.recordAction('file_edit', 'heavy.js');
const pauseCheck = mod.checkLoop();
assert('LB-010', pauseCheck.action === 'pause', 'File edit at max triggers pause action');

mod.reset('all');
for (let i = 0; i < 5; i++) mod.recordAction('pdca_iteration', 'feat-loop');
const abortCheck = mod.checkLoop();
assert('LB-011', abortCheck.action === 'abort', 'PDCA iteration at max triggers abort action');

// --- LB-012~013: reset clears counters ---

mod.reset('all');
mod.recordAction('pdca_iteration', 'feat-r');
mod.recordAction('file_edit', 'file.js');
mod.recordAction('error', 'err');
mod.reset('all');
const afterReset = mod.getCounters();
assert('LB-012', Object.keys(afterReset.pdcaIterations).length === 0 &&
  Object.keys(afterReset.fileEditCounts).length === 0 &&
  afterReset.agentCallStack.length === 0 &&
  Object.keys(afterReset.errorCounts).length === 0,
  'reset(all) clears all counters');

mod.recordAction('pdca_iteration', 'feat-keep');
mod.recordAction('pdca_iteration', 'feat-del');
mod.reset('feature', 'feat-del');
const afterPartial = mod.getCounters();
assert('LB-013', afterPartial.pdcaIterations['feat-keep'] === 1 && !afterPartial.pdcaIterations['feat-del'],
  'reset(feature) only clears targeted feature');

// --- LB-014~015: getCounters returns state ---

mod.reset('all');
mod.recordAction('pdca_iteration', 'f1');
mod.recordAction('file_edit', 'a.js');
const state = mod.getCounters();
assert('LB-014', typeof state === 'object' && 'pdcaIterations' in state && 'fileEditCounts' in state,
  'getCounters returns object with expected keys');
assert('LB-015', state.pdcaIterations['f1'] === 1 && state.fileEditCounts['a.js'] === 1,
  'getCounters reflects current state accurately');

// Clean up
mod.reset('all');

// --- Summary ---
console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
