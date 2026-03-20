#!/usr/bin/env node
'use strict';
/**
 * Performance Test: StateStore Operations (15 TC)
 * SP-001~005: write() completes in <10ms for small files
 * SP-006~010: lockedUpdate() completes in <20ms
 * SP-011~015: appendJsonl() 100 entries in <100ms
 *
 * @version bkit v2.0.0
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE_DIR = path.resolve(__dirname, '../..');

const results = { passed: 0, failed: 0, total: 0, measurements: [] };

function perfAssert(id, condition, message, durationMs) {
  results.total++;
  results.measurements.push({ id, durationMs: durationMs?.toFixed(2) });
  if (condition) {
    results.passed++;
    console.log(`  PASS: ${id} - ${message} (${durationMs?.toFixed(2)}ms)`);
  } else {
    results.failed++;
    console.error(`  FAIL: ${id} - ${message} (${durationMs?.toFixed(2)}ms)`);
  }
}

// --- Load StateStore ---
let stateStore;
try {
  stateStore = require(path.join(BASE_DIR, 'lib/core/state-store'));
} catch (e) {
  console.error('StateStore load failed:', e.message);
  process.exit(1);
}

// Temp directory for testing
const TEMP_DIR = path.join(os.tmpdir(), `bkit-perf-test-${process.pid}`);
fs.mkdirSync(TEMP_DIR, { recursive: true });

console.log('\n=== state-store-perf.test.js (15 TC) ===\n');

// ============================================================
// SP-001~005: write() completes in <10ms for small files
// ============================================================
console.log('--- StateStore write() Performance (<10ms) ---');

const WRITE_THRESHOLD = 10;

// SP-001: Write small JSON object
{
  const filePath = path.join(TEMP_DIR, 'sp-001.json');
  const start = performance.now();
  stateStore.write(filePath, { key: 'value' });
  const elapsed = performance.now() - start;
  perfAssert('SP-001', elapsed < WRITE_THRESHOLD, `Write small object < ${WRITE_THRESHOLD}ms`, elapsed);
}

// SP-002: Write medium JSON (1KB)
{
  const filePath = path.join(TEMP_DIR, 'sp-002.json');
  const data = {};
  for (let i = 0; i < 50; i++) data[`key_${i}`] = `value_${i}_${Date.now()}`;
  const start = performance.now();
  stateStore.write(filePath, data);
  const elapsed = performance.now() - start;
  perfAssert('SP-002', elapsed < WRITE_THRESHOLD, `Write medium object (~1KB) < ${WRITE_THRESHOLD}ms`, elapsed);
}

// SP-003: Write nested JSON
{
  const filePath = path.join(TEMP_DIR, 'sp-003.json');
  const data = { level1: { level2: { level3: { value: 'deep' } } } };
  const start = performance.now();
  stateStore.write(filePath, data);
  const elapsed = performance.now() - start;
  perfAssert('SP-003', elapsed < WRITE_THRESHOLD, `Write nested object < ${WRITE_THRESHOLD}ms`, elapsed);
}

// SP-004: Write array data
{
  const filePath = path.join(TEMP_DIR, 'sp-004.json');
  const data = { items: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `item_${i}` })) };
  const start = performance.now();
  stateStore.write(filePath, data);
  const elapsed = performance.now() - start;
  perfAssert('SP-004', elapsed < WRITE_THRESHOLD, `Write array (100 items) < ${WRITE_THRESHOLD}ms`, elapsed);
}

// SP-005: Write + read roundtrip
{
  const filePath = path.join(TEMP_DIR, 'sp-005.json');
  const data = { roundtrip: true, timestamp: Date.now() };
  const start = performance.now();
  stateStore.write(filePath, data);
  const readBack = stateStore.read(filePath);
  const elapsed = performance.now() - start;
  perfAssert('SP-005', elapsed < WRITE_THRESHOLD && readBack && readBack.roundtrip === true,
    `Write + read roundtrip < ${WRITE_THRESHOLD}ms`, elapsed);
}

// ============================================================
// SP-006~010: lockedUpdate() completes in <20ms
// ============================================================
console.log('\n--- StateStore lockedUpdate() Performance (<20ms) ---');

const LOCKED_THRESHOLD = 20;

// SP-006: Simple locked update
{
  const filePath = path.join(TEMP_DIR, 'sp-006.json');
  stateStore.write(filePath, { count: 0 });
  const start = performance.now();
  stateStore.lockedUpdate(filePath, (data) => ({ ...data, count: data.count + 1 }));
  const elapsed = performance.now() - start;
  perfAssert('SP-006', elapsed < LOCKED_THRESHOLD, `Locked update (increment) < ${LOCKED_THRESHOLD}ms`, elapsed);
}

// SP-007: Locked update with new fields
{
  const filePath = path.join(TEMP_DIR, 'sp-007.json');
  stateStore.write(filePath, { version: '1.0' });
  const start = performance.now();
  stateStore.lockedUpdate(filePath, (data) => ({ ...data, version: '2.0', migrated: true }));
  const elapsed = performance.now() - start;
  perfAssert('SP-007', elapsed < LOCKED_THRESHOLD, `Locked update (add fields) < ${LOCKED_THRESHOLD}ms`, elapsed);
}

// SP-008: Locked update from null (new file)
{
  const filePath = path.join(TEMP_DIR, 'sp-008.json');
  const start = performance.now();
  stateStore.lockedUpdate(filePath, (data) => data || { initialized: true });
  const elapsed = performance.now() - start;
  perfAssert('SP-008', elapsed < LOCKED_THRESHOLD, `Locked update from null < ${LOCKED_THRESHOLD}ms`, elapsed);
}

// SP-009: Locked update with array push
{
  const filePath = path.join(TEMP_DIR, 'sp-009.json');
  stateStore.write(filePath, { history: [] });
  const start = performance.now();
  stateStore.lockedUpdate(filePath, (data) => {
    data.history.push({ event: 'test', ts: Date.now() });
    return data;
  });
  const elapsed = performance.now() - start;
  perfAssert('SP-009', elapsed < LOCKED_THRESHOLD, `Locked update (array push) < ${LOCKED_THRESHOLD}ms`, elapsed);
}

// SP-010: 5 sequential locked updates
{
  const filePath = path.join(TEMP_DIR, 'sp-010.json');
  stateStore.write(filePath, { count: 0 });
  const start = performance.now();
  for (let i = 0; i < 5; i++) {
    stateStore.lockedUpdate(filePath, (data) => ({ ...data, count: data.count + 1 }));
  }
  const elapsed = performance.now() - start;
  const threshold = LOCKED_THRESHOLD * 5;
  perfAssert('SP-010', elapsed < threshold, `5 locked updates < ${threshold}ms`, elapsed);
}

// ============================================================
// SP-011~015: appendJsonl() performance
// ============================================================
console.log('\n--- StateStore appendJsonl() Performance ---');

// SP-011: Single append <5ms
{
  const filePath = path.join(TEMP_DIR, 'sp-011.jsonl');
  const start = performance.now();
  stateStore.appendJsonl(filePath, { event: 'test', timestamp: Date.now() });
  const elapsed = performance.now() - start;
  perfAssert('SP-011', elapsed < 5, 'Single appendJsonl < 5ms', elapsed);
}

// SP-012: 10 appends <20ms
{
  const filePath = path.join(TEMP_DIR, 'sp-012.jsonl');
  const start = performance.now();
  for (let i = 0; i < 10; i++) {
    stateStore.appendJsonl(filePath, { index: i, timestamp: Date.now() });
  }
  const elapsed = performance.now() - start;
  perfAssert('SP-012', elapsed < 20, '10 appendJsonl < 20ms', elapsed);
}

// SP-013: 50 appends <50ms
{
  const filePath = path.join(TEMP_DIR, 'sp-013.jsonl');
  const start = performance.now();
  for (let i = 0; i < 50; i++) {
    stateStore.appendJsonl(filePath, { index: i, data: `entry_${i}` });
  }
  const elapsed = performance.now() - start;
  perfAssert('SP-013', elapsed < 50, '50 appendJsonl < 50ms', elapsed);
}

// SP-014: 100 appends <100ms
{
  const filePath = path.join(TEMP_DIR, 'sp-014.jsonl');
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    stateStore.appendJsonl(filePath, { index: i, data: `entry_${i}`, ts: Date.now() });
  }
  const elapsed = performance.now() - start;
  perfAssert('SP-014', elapsed < 100, '100 appendJsonl < 100ms', elapsed);
}

// SP-015: Verify 100 entries written correctly
{
  const filePath = path.join(TEMP_DIR, 'sp-014.jsonl'); // Read from SP-014 file
  const start = performance.now();
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  const elapsed = performance.now() - start;
  const countOk = lines.length === 100;
  let parseOk = true;
  for (const line of lines) {
    try { JSON.parse(line); } catch { parseOk = false; break; }
  }
  perfAssert('SP-015', countOk && parseOk && elapsed < 10,
    `Read 100 JSONL entries: count=${lines.length}, parseable=${parseOk} < 10ms`, elapsed);
}

// ============================================================
// Cleanup
// ============================================================
try {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
} catch (_) { /* ignore */ }

// ============================================================
// Summary
// ============================================================
console.log(`\n=== Results: ${results.passed}/${results.total} passed, ${results.failed} failed ===`);
if (results.failed > 0) process.exit(1);
