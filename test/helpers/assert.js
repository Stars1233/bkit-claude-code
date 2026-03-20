'use strict';

let _passed = 0;
let _failed = 0;
let _total = 0;
let _skipped = 0;
const _failures = [];

function assert(id, condition, message) {
  _total++;
  if (condition) {
    _passed++;
    console.log(`  PASS: ${id} - ${message}`);
  } else {
    _failed++;
    _failures.push({ id, message });
    console.error(`  FAIL: ${id} - ${message}`);
  }
}

function skip(id, message) {
  _total++;
  _skipped++;
  console.log(`  SKIP: ${id} - ${message}`);
}

function assertThrows(id, fn, message) {
  _total++;
  try {
    fn();
    _failed++;
    _failures.push({ id, message: `${message} (no error thrown)` });
    console.error(`  FAIL: ${id} - ${message} (no error thrown)`);
  } catch (e) {
    _passed++;
    console.log(`  PASS: ${id} - ${message}`);
  }
}

function assertNoThrow(id, fn, message) {
  _total++;
  try {
    fn();
    _passed++;
    console.log(`  PASS: ${id} - ${message}`);
  } catch (e) {
    _failed++;
    _failures.push({ id, message: `${message} (threw: ${e.message})` });
    console.error(`  FAIL: ${id} - ${message} (threw: ${e.message})`);
  }
}

function assertType(id, value, expectedType, message) {
  assert(id, typeof value === expectedType, `${message} (type: ${typeof value}, expected: ${expectedType})`);
}

function assertExists(id, obj, key, message) {
  _total++;
  if (obj && obj[key] !== undefined) {
    _passed++;
    console.log(`  PASS: ${id} - ${message}`);
  } else {
    _failed++;
    _failures.push({ id, message });
    console.error(`  FAIL: ${id} - ${message}`);
  }
}

function assertDeepEqual(id, actual, expected, message) {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  assert(id, isEqual, message);
}

function summary(testName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${testName}: ${_passed}/${_total} PASS, ${_failed} FAIL, ${_skipped} SKIP`);
  if (_failures.length > 0) {
    console.log(`\nFailures:`);
    _failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
  }
  console.log(`${'='.repeat(60)}\n`);
  return { passed: _passed, failed: _failed, total: _total, skipped: _skipped, failures: _failures };
}

function reset() {
  _passed = 0;
  _failed = 0;
  _total = 0;
  _skipped = 0;
  _failures.length = 0;
}

function getStats() {
  return { passed: _passed, failed: _failed, total: _total, skipped: _skipped };
}

module.exports = { assert, skip, assertThrows, assertNoThrow, assertType, assertExists, assertDeepEqual, summary, reset, getStats };
