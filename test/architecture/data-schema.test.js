#!/usr/bin/env node
/**
 * Data Schema Architecture Test
 * @module test/architecture/data-schema
 * @version 2.0.0
 *
 * Verifies:
 * - pdca-status v3.0 migration function exists
 * - STATE_PATHS has 18+ new entries
 * - ensureBkitDirs creates all directories
 * - paths.js helper functions return valid paths
 * 20 TC: DS-001 ~ DS-020
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

let passed = 0;
let failed = 0;
const results = [];

function assert(id, condition, description) {
  if (condition) {
    passed++;
    results.push({ id, status: 'PASS', description });
  } else {
    failed++;
    results.push({ id, status: 'FAIL', description });
    console.assert(false, `${id}: ${description}`);
  }
}

const corePaths = require(path.join(PROJECT_ROOT, 'lib/core/paths'));
const pdcaStatus = require(path.join(PROJECT_ROOT, 'lib/pdca/status'));
const constants = require(path.join(PROJECT_ROOT, 'lib/core/constants'));

// ============================================================
// Section 1: pdca-status v3.0 migration function exists (DS-001~005)
// ============================================================

// DS-001: createInitialStatusV2 exists
assert('DS-001',
  typeof pdcaStatus.createInitialStatusV2 === 'function',
  'createInitialStatusV2 function exists in pdca/status'
);

// DS-002: createInitialStatusV2 returns valid structure
const initial2 = pdcaStatus.createInitialStatusV2();
assert('DS-002',
  initial2 !== null && typeof initial2 === 'object' && initial2.version != null,
  'createInitialStatusV2 returns object with version field'
);

// DS-003: migrateStatusToV2 exists
assert('DS-003',
  typeof pdcaStatus.migrateStatusToV2 === 'function',
  'migrateStatusToV2 function exists for schema migration'
);

// DS-004: migrateStatusToV2 handles v1 format
const v1Status = { currentFeature: 'test', phase: 'plan', history: [] };
const migrated4 = pdcaStatus.migrateStatusToV2(v1Status);
assert('DS-004',
  migrated4 !== null && migrated4.version != null,
  'migrateStatusToV2 converts v1 format to v2+ with version'
);

// DS-005: migrateStatusToV2 handles empty object input
const migrated5 = pdcaStatus.migrateStatusToV2({});
assert('DS-005',
  migrated5 !== null && migrated5.version != null,
  'migrateStatusToV2 handles empty object input gracefully'
);

// ============================================================
// Section 2: STATE_PATHS has 18+ new entries (DS-006~010)
// ============================================================

const { STATE_PATHS } = corePaths;

// DS-006: STATE_PATHS has basic entries
assert('DS-006',
  typeof STATE_PATHS.root === 'function' &&
  typeof STATE_PATHS.state === 'function' &&
  typeof STATE_PATHS.runtime === 'function',
  'STATE_PATHS has root, state, runtime functions'
);

// DS-007: STATE_PATHS has v2.0.0 quality entries
assert('DS-007',
  typeof STATE_PATHS.qualityMetrics === 'function' &&
  typeof STATE_PATHS.qualityHistory === 'function' &&
  typeof STATE_PATHS.regressionRules === 'function',
  'STATE_PATHS has qualityMetrics, qualityHistory, regressionRules'
);

// DS-008: STATE_PATHS has v2.0.0 audit entries
assert('DS-008',
  typeof STATE_PATHS.auditDir === 'function' &&
  typeof STATE_PATHS.decisionsDir === 'function',
  'STATE_PATHS has auditDir, decisionsDir'
);

// DS-009: STATE_PATHS has v2.0.0 checkpoint entries
assert('DS-009',
  typeof STATE_PATHS.checkpointsDir === 'function' &&
  typeof STATE_PATHS.checkpointIndex === 'function',
  'STATE_PATHS has checkpointsDir, checkpointIndex'
);

// DS-010: STATE_PATHS has total 18+ entries
const statePathKeys = Object.keys(STATE_PATHS);
assert('DS-010',
  statePathKeys.length >= 18,
  `STATE_PATHS has ${statePathKeys.length} entries (expected >= 18)`
);

// ============================================================
// Section 3: ensureBkitDirs creates all directories (DS-011~015)
// ============================================================

// Setup temp directory
const SCHEMA_TEST_DIR = path.join(os.tmpdir(), `bkit-schema-test-${process.pid}-${Date.now()}`);
const platform = require(path.join(PROJECT_ROOT, 'lib/core/platform'));
const origProjectDir = platform.PROJECT_DIR;
platform.PROJECT_DIR = SCHEMA_TEST_DIR;

// DS-011: ensureBkitDirs creates root .bkit directory
corePaths.ensureBkitDirs();
assert('DS-011',
  fs.existsSync(path.join(SCHEMA_TEST_DIR, '.bkit')),
  'ensureBkitDirs creates .bkit root directory'
);

// DS-012: ensureBkitDirs creates state directory
assert('DS-012',
  fs.existsSync(path.join(SCHEMA_TEST_DIR, '.bkit', 'state')),
  'ensureBkitDirs creates .bkit/state directory'
);

// DS-013: ensureBkitDirs creates runtime directory
assert('DS-013',
  fs.existsSync(path.join(SCHEMA_TEST_DIR, '.bkit', 'runtime')),
  'ensureBkitDirs creates .bkit/runtime directory'
);

// DS-014: ensureBkitDirs creates audit directory
assert('DS-014',
  fs.existsSync(path.join(SCHEMA_TEST_DIR, '.bkit', 'audit')),
  'ensureBkitDirs creates .bkit/audit directory'
);

// DS-015: ensureBkitDirs creates checkpoints directory
assert('DS-015',
  fs.existsSync(path.join(SCHEMA_TEST_DIR, '.bkit', 'checkpoints')),
  'ensureBkitDirs creates .bkit/checkpoints directory'
);

// ============================================================
// Section 4: paths.js helper functions return valid paths (DS-016~020)
// ============================================================

// DS-016: getDocPaths returns phase templates
const docPaths = corePaths.getDocPaths();
assert('DS-016',
  docPaths.plan && Array.isArray(docPaths.plan) && docPaths.plan.length > 0,
  'getDocPaths returns plan templates array'
);

// DS-017: resolveDocPaths returns absolute paths
const resolved17 = corePaths.resolveDocPaths('plan', 'test-feature');
assert('DS-017',
  resolved17.length > 0 && path.isAbsolute(resolved17[0]),
  'resolveDocPaths returns absolute paths for plan/test-feature'
);

// DS-018: getArchivePath returns valid path
const archive18 = corePaths.getArchivePath('test-feature');
assert('DS-018',
  typeof archive18 === 'string' && archive18.includes('test-feature'),
  'getArchivePath returns path containing feature name'
);

// DS-019: CONFIG_PATHS has required entries
const { CONFIG_PATHS } = corePaths;
assert('DS-019',
  typeof CONFIG_PATHS.bkitConfig === 'function' &&
  typeof CONFIG_PATHS.pluginJson === 'function' &&
  typeof CONFIG_PATHS.hooksJson === 'function',
  'CONFIG_PATHS has bkitConfig, pluginJson, hooksJson'
);

// DS-020: Constants module exports quality-related constants
assert('DS-020',
  constants.MAX_QUALITY_HISTORY != null &&
  constants.MATCH_RATE_THRESHOLD != null &&
  constants.AUTOMATION_LEVELS != null,
  'Constants exports MAX_QUALITY_HISTORY, MATCH_RATE_THRESHOLD, AUTOMATION_LEVELS'
);

// ============================================================
// Cleanup
// ============================================================
platform.PROJECT_DIR = origProjectDir;
try { fs.rmSync(SCHEMA_TEST_DIR, { recursive: true, force: true }); } catch (_) {}

// ============================================================
// Summary
// ============================================================
console.log('\n========================================');
console.log('Data Schema Architecture Test Results');
console.log('========================================');
console.log(`Total: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
console.log(`Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log('----------------------------------------');
results.forEach(r => {
  console.log(`  ${r.status === 'PASS' ? '[PASS]' : '[FAIL]'} ${r.id}: ${r.description}`);
});
console.log('========================================\n');

module.exports = { passed, failed, total: passed + failed, results };
if (failed > 0) process.exit(1);
