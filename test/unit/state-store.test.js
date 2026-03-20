'use strict';
/**
 * Unit Tests for lib/core/state-store.js
 * 25 TC | console.assert based | no external dependencies
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

let mod;
try {
  mod = require('../../lib/core/state-store');
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

// Test directory setup
const TEST_DIR = path.join(os.tmpdir(), `bkit-state-store-test-${process.pid}-${Date.now()}`);
fs.mkdirSync(TEST_DIR, { recursive: true });

function testFile(name) {
  return path.join(TEST_DIR, name);
}

// Cleanup helper
function cleanup() {
  try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch (_) { /* ignore */ }
}

console.log('\n=== state-store.test.js ===\n');

// --- SS-001~005: read() with existing/missing/invalid files ---

const readFile1 = testFile('read-test.json');
fs.writeFileSync(readFile1, JSON.stringify({ key: 'value' }));
const readResult1 = mod.read(readFile1);
assert('SS-001', readResult1 !== null && readResult1.key === 'value', 'read() returns parsed JSON for existing file');

const readResult2 = mod.read(testFile('nonexistent.json'));
assert('SS-002', readResult2 === null, 'read() returns null for missing file');

const invalidFile = testFile('invalid.json');
fs.writeFileSync(invalidFile, '{broken json!!!');
const readResult3 = mod.read(invalidFile);
assert('SS-003', readResult3 === null, 'read() returns null for invalid JSON');

const emptyFile = testFile('empty.json');
fs.writeFileSync(emptyFile, '');
const readResult4 = mod.read(emptyFile);
assert('SS-004', readResult4 === null, 'read() returns null for empty file');

const nestedData = { a: { b: { c: 1 } }, arr: [1, 2, 3] };
const nestedFile = testFile('nested.json');
fs.writeFileSync(nestedFile, JSON.stringify(nestedData));
const readResult5 = mod.read(nestedFile);
assert('SS-005', readResult5 !== null && readResult5.a.b.c === 1 && readResult5.arr.length === 3, 'read() handles nested objects');

// --- SS-006~010: write() atomic (tmp+rename), creates dirs ---

const writeFile1 = testFile('write-test.json');
mod.write(writeFile1, { hello: 'world' });
const written1 = JSON.parse(fs.readFileSync(writeFile1, 'utf8'));
assert('SS-006', written1.hello === 'world', 'write() creates valid JSON file');

const deepDir = path.join(TEST_DIR, 'deep', 'nested', 'dir');
const deepFile = path.join(deepDir, 'data.json');
mod.write(deepFile, { deep: true });
assert('SS-007', fs.existsSync(deepFile), 'write() creates parent directories');

const readBack = mod.read(deepFile);
assert('SS-008', readBack !== null && readBack.deep === true, 'write() + read() roundtrip works');

mod.write(writeFile1, { overwritten: true });
const overwritten = mod.read(writeFile1);
assert('SS-009', overwritten.overwritten === true, 'write() overwrites existing file');

const complexData = { num: 42, str: 'hello', bool: true, nil: null, arr: [1, 'two'] };
const complexFile = testFile('complex.json');
mod.write(complexFile, complexData);
const complexRead = mod.read(complexFile);
assert('SS-010', complexRead.num === 42 && complexRead.str === 'hello' && complexRead.nil === null, 'write() handles complex data types');

// --- SS-011~013: exists(), remove() ---

assert('SS-011', mod.exists(writeFile1) === true, 'exists() returns true for existing file');
assert('SS-012', mod.exists(testFile('nope.json')) === false, 'exists() returns false for missing file');

const removeFile = testFile('remove-me.json');
mod.write(removeFile, { temp: true });
mod.remove(removeFile);
assert('SS-013', mod.exists(removeFile) === false, 'remove() deletes the file');

// --- SS-014~016: appendJsonl() creates file, appends correctly ---

const jsonlFile = testFile('log.jsonl');
mod.appendJsonl(jsonlFile, { event: 'first', ts: 1 });
assert('SS-014', fs.existsSync(jsonlFile), 'appendJsonl() creates file if not exists');

mod.appendJsonl(jsonlFile, { event: 'second', ts: 2 });
const lines = fs.readFileSync(jsonlFile, 'utf8').trim().split('\n');
assert('SS-015', lines.length === 2, 'appendJsonl() appends lines (2 entries)');

const parsed0 = JSON.parse(lines[0]);
const parsed1 = JSON.parse(lines[1]);
assert('SS-016', parsed0.event === 'first' && parsed1.event === 'second', 'appendJsonl() lines are valid JSON');

// --- SS-017~020: lock()/unlock() with timeout ---

const lockTarget = testFile('lockable.json');
mod.write(lockTarget, { locked: false });

const lockPath = mod.lock(lockTarget);
assert('SS-017', typeof lockPath === 'string' && lockPath.endsWith('.lock'), 'lock() returns lock file path');
assert('SS-018', fs.existsSync(lockPath), 'lock() creates .lock file');

const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
assert('SS-019', lockData.pid === process.pid, 'lock file contains current PID');

mod.unlock(lockTarget);
assert('SS-020', !fs.existsSync(lockPath), 'unlock() removes lock file');

// --- SS-021~025: lockedUpdate() read-modify-write ---

const updateFile = testFile('update-target.json');
mod.write(updateFile, { count: 0 });

const result1 = mod.lockedUpdate(updateFile, (data) => {
  return { ...data, count: data.count + 1 };
});
assert('SS-021', result1.count === 1, 'lockedUpdate() modifier receives current data');

const afterUpdate = mod.read(updateFile);
assert('SS-022', afterUpdate.count === 1, 'lockedUpdate() persists modified data');

const result2 = mod.lockedUpdate(updateFile, (data) => {
  return { ...data, count: data.count + 10, extra: 'added' };
});
assert('SS-023', result2.count === 11 && result2.extra === 'added', 'lockedUpdate() supports complex modifications');

const lockFile2 = updateFile + '.lock';
assert('SS-024', !fs.existsSync(lockFile2), 'lockedUpdate() releases lock after completion');

const newLockedFile = testFile('new-locked.json');
const result3 = mod.lockedUpdate(newLockedFile, (data) => {
  return { initialized: true, was: data };
});
assert('SS-025', result3.initialized === true && result3.was === null, 'lockedUpdate() handles missing file (data=null)');

// --- Cleanup ---
cleanup();

// --- Summary ---

console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
