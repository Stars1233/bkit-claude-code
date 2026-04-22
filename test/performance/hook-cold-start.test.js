#!/usr/bin/env node
'use strict';
/**
 * Performance Test: Hook Cold Start (20 TC)
 * HS-001~010: Each new module loads in <50ms
 * HS-011~020: Hook scripts load in <100ms
 *
 * @version bkit v2.0.0
 */

const { performance } = require('perf_hooks');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../..');

const results = { passed: 0, failed: 0, total: 0, measurements: [] };

function perfAssert(id, condition, message, durationMs) {
  results.total++;
  const measurement = { id, message, durationMs: durationMs?.toFixed(2) };
  results.measurements.push(measurement);
  if (condition) {
    results.passed++;
    console.log(`  PASS: ${id} - ${message} (${durationMs?.toFixed(2)}ms)`);
  } else {
    results.failed++;
    console.error(`  FAIL: ${id} - ${message} (${durationMs?.toFixed(2)}ms)`);
  }
}

/**
 * Measure cold-start require time (clears cache)
 */
function measureColdLoad(modulePath) {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];

  const start = performance.now();
  try {
    require(modulePath);
    const elapsed = performance.now() - start;
    return { success: true, elapsed };
  } catch (e) {
    const elapsed = performance.now() - start;
    return { success: false, elapsed, error: e.message };
  }
}

console.log('\n=== hook-cold-start.test.js (20 TC) ===\n');

// ============================================================
// HS-001~010: New modules load in <50ms
// ============================================================
console.log('--- Module Cold Start (<50ms) ---');

const MODULE_THRESHOLD = 50;
const NEW_MODULES = [
  { id: 'HS-001', path: path.join(BASE_DIR, 'lib/core/state-store'),   name: 'core/state-store' },
  { id: 'HS-002', path: path.join(BASE_DIR, 'lib/core/constants'),     name: 'core/constants' },
  { id: 'HS-003', path: path.join(BASE_DIR, 'lib/core/errors'),        name: 'core/errors' },
  { id: 'HS-004', path: path.join(BASE_DIR, 'lib/core/paths'),         name: 'core/paths' },
  { id: 'HS-005', path: path.join(BASE_DIR, 'lib/core/config'),        name: 'core/config' },
  { id: 'HS-006', path: path.join(BASE_DIR, 'lib/core/cache'),         name: 'core/cache' },
  { id: 'HS-007', path: path.join(BASE_DIR, 'lib/core/debug'),         name: 'core/debug' },
  { id: 'HS-008', path: path.join(BASE_DIR, 'lib/core/platform'),      name: 'core/platform' },
  { id: 'HS-009', path: path.join(BASE_DIR, 'lib/core/io'),            name: 'core/io' },
];

for (const mod of NEW_MODULES) {
  const result = measureColdLoad(mod.path);
  perfAssert(mod.id,
    result.success && result.elapsed < MODULE_THRESHOLD,
    `${mod.name} cold-start < ${MODULE_THRESHOLD}ms`,
    result.elapsed);
}

// ============================================================
// HS-011~020: Hook scripts load in <100ms
// ============================================================
console.log('\n--- Hook Scripts Cold Start (<100ms) ---');

const HOOK_THRESHOLD = 100;
const HOOK_SCRIPTS = [
  { id: 'HS-011', path: path.join(BASE_DIR, 'scripts/unified-stop'),         name: 'unified-stop' },
  { id: 'HS-012', path: path.join(BASE_DIR, 'scripts/unified-bash-pre'),     name: 'unified-bash-pre' },
  { id: 'HS-013', path: path.join(BASE_DIR, 'scripts/unified-bash-post'),    name: 'unified-bash-post' },
  { id: 'HS-014', path: path.join(BASE_DIR, 'scripts/unified-write-post'),   name: 'unified-write-post' },
  { id: 'HS-015', path: path.join(BASE_DIR, 'scripts/user-prompt-handler'),  name: 'user-prompt-handler' },
  { id: 'HS-016', path: path.join(BASE_DIR, 'scripts/pre-write'),            name: 'pre-write' },
  { id: 'HS-017', path: path.join(BASE_DIR, 'scripts/skill-post'),           name: 'skill-post' },
  { id: 'HS-018', path: path.join(BASE_DIR, 'scripts/context-compaction'),   name: 'context-compaction' },
  { id: 'HS-019', path: path.join(BASE_DIR, 'scripts/stop-failure-handler'), name: 'stop-failure-handler' },
  { id: 'HS-020', path: path.join(BASE_DIR, 'scripts/post-compaction'),      name: 'post-compaction' },
];

for (const hook of HOOK_SCRIPTS) {
  const result = measureColdLoad(hook.path);
  perfAssert(hook.id,
    result.success && result.elapsed < HOOK_THRESHOLD,
    `${hook.name} cold-start < ${HOOK_THRESHOLD}ms`,
    result.elapsed);
}

// ============================================================
// Summary
// ============================================================
console.log(`\n=== Results: ${results.passed}/${results.total} passed, ${results.failed} failed ===`);

// Show slowest modules
const sorted = results.measurements
  .filter(m => m.durationMs)
  .sort((a, b) => parseFloat(b.durationMs) - parseFloat(a.durationMs));
if (sorted.length > 0) {
  console.log('\n--- Top 5 Slowest ---');
  sorted.slice(0, 5).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.id}: ${m.durationMs}ms`);
  });
}

if (results.failed > 0) process.exit(1);
