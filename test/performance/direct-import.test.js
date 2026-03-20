#!/usr/bin/env node
'use strict';
/**
 * Performance Test: Direct Import vs Common.js (20 TC)
 * DI-001~010: Direct import is faster than common.js
 * DI-011~020: Individual module sizes reasonable
 *
 * @version bkit v2.0.0
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../..');

const results = { passed: 0, failed: 0, total: 0, measurements: [] };

function perfAssert(id, condition, message, extra) {
  results.total++;
  results.measurements.push({ id, message, ...extra });
  if (condition) {
    results.passed++;
    console.log(`  PASS: ${id} - ${message}`);
  } else {
    results.failed++;
    console.error(`  FAIL: ${id} - ${message}`);
  }
}

/**
 * Measure cold-start require time
 */
function measureColdLoad(modulePath) {
  // Clear all related caches for fair measurement
  Object.keys(require.cache).forEach(key => {
    if (key.includes('lib/')) delete require.cache[key];
  });

  const start = performance.now();
  try {
    require(modulePath);
    return performance.now() - start;
  } catch (e) {
    return performance.now() - start;
  }
}

/**
 * Get file size in KB
 */
function getFileSize(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.size / 1024;
  } catch (e) {
    return -1;
  }
}

console.log('\n=== direct-import.test.js (20 TC) ===\n');

// ============================================================
// DI-001~010: Direct import is faster than common.js
// ============================================================
console.log('--- Direct Import vs Common.js ---');

const DIRECT_MODULES = [
  { id: 'DI-001', direct: 'lib/core',   name: 'core' },
  { id: 'DI-002', direct: 'lib/pdca',   name: 'pdca' },
  { id: 'DI-003', direct: 'lib/intent', name: 'intent' },
  { id: 'DI-004', direct: 'lib/task',   name: 'task' },
  { id: 'DI-005', direct: 'lib/team',   name: 'team' },
  { id: 'DI-006', direct: 'lib/core/state-store', name: 'state-store' },
  { id: 'DI-007', direct: 'lib/core/config',      name: 'config' },
  { id: 'DI-008', direct: 'lib/core/debug',        name: 'debug' },
  { id: 'DI-009', direct: 'lib/pdca/phase',        name: 'phase' },
  { id: 'DI-010', direct: 'lib/pdca/status',       name: 'status' },
];

for (const mod of DIRECT_MODULES) {
  // Measure direct import
  const directTime = measureColdLoad(path.join(BASE_DIR, mod.direct));

  // Measure common.js import
  const commonTime = measureColdLoad(path.join(BASE_DIR, 'lib/common'));

  const ratio = commonTime > 0 ? (directTime / commonTime).toFixed(2) : 'N/A';
  const faster = directTime <= commonTime;

  perfAssert(mod.id, faster,
    `${mod.name} direct (${directTime.toFixed(2)}ms) <= common.js (${commonTime.toFixed(2)}ms), ratio=${ratio}`,
    { directMs: directTime.toFixed(2), commonMs: commonTime.toFixed(2), ratio });
}

// ============================================================
// DI-011~020: Individual module sizes reasonable
// ============================================================
console.log('\n--- Module Size Check ---');

const MAX_SIZE_KB = 50; // Individual module should be <50KB

const SIZE_MODULES = [
  { id: 'DI-011', path: 'lib/core/state-store.js',      name: 'state-store' },
  { id: 'DI-012', path: 'lib/core/config.js',            name: 'config' },
  { id: 'DI-013', path: 'lib/core/debug.js',             name: 'debug' },
  { id: 'DI-014', path: 'lib/core/cache.js',             name: 'cache' },
  { id: 'DI-015', path: 'lib/core/platform.js',          name: 'platform' },
  { id: 'DI-016', path: 'lib/pdca/phase.js',             name: 'phase' },
  { id: 'DI-017', path: 'lib/pdca/status.js',            name: 'status' },
  { id: 'DI-018', path: 'lib/audit/audit-logger.js',     name: 'audit-logger' },
  { id: 'DI-019', path: 'lib/core/hook-io.js',           name: 'hook-io' },
  { id: 'DI-020', path: 'lib/pdca/state-machine.js',     name: 'state-machine' },
];

for (const mod of SIZE_MODULES) {
  const sizeKB = getFileSize(path.join(BASE_DIR, mod.path));
  perfAssert(mod.id, sizeKB > 0 && sizeKB < MAX_SIZE_KB,
    `${mod.name} size = ${sizeKB.toFixed(1)}KB (< ${MAX_SIZE_KB}KB)`,
    { sizeKB: sizeKB.toFixed(1) });
}

// ============================================================
// Summary
// ============================================================
console.log(`\n=== Results: ${results.passed}/${results.total} passed, ${results.failed} failed ===`);

if (results.failed > 0) process.exit(1);
