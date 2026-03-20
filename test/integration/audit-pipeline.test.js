#!/usr/bin/env node
/**
 * Audit Pipeline Integration Test
 * @module test/integration/audit-pipeline
 * @version 2.0.0
 *
 * Verifies audit-logger write/read/summary/cleanup pipeline using temp directory.
 * 20 TC: AP-001 ~ AP-020
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

// Setup: Override PROJECT_DIR to temp directory for isolated testing
const TEST_DIR = path.join(os.tmpdir(), `bkit-audit-test-${process.pid}-${Date.now()}`);
fs.mkdirSync(path.join(TEST_DIR, '.bkit', 'audit'), { recursive: true });

// Patch platform module to use temp directory
const platform = require(path.join(PROJECT_ROOT, 'lib/core/platform'));
const origProjectDir = platform.PROJECT_DIR;
platform.PROJECT_DIR = TEST_DIR;

const auditLogger = require(path.join(PROJECT_ROOT, 'lib/audit/audit-logger'));

// ============================================================
// Section 1: writeAuditLog creates file (AP-001~005)
// ============================================================

// AP-001: writeAuditLog creates a JSONL file
auditLogger.writeAuditLog({
  action: 'phase_transition',
  category: 'pdca',
  target: 'test-feature',
  targetType: 'feature',
  actor: 'system',
  result: 'success',
});
const auditDir = path.join(TEST_DIR, '.bkit', 'audit');
const todayStr = new Date().toISOString().slice(0, 10);
const auditFile = path.join(auditDir, `${todayStr}.jsonl`);
assert('AP-001',
  fs.existsSync(auditFile),
  'writeAuditLog creates daily JSONL file'
);

// AP-002: JSONL file contains valid JSON line
const lines2 = fs.readFileSync(auditFile, 'utf8').trim().split('\n');
let parsed2 = null;
try { parsed2 = JSON.parse(lines2[0]); } catch (_) {}
assert('AP-002',
  parsed2 !== null && parsed2.action === 'phase_transition',
  'JSONL file contains valid JSON with correct action'
);

// AP-003: Entry has required fields
assert('AP-003',
  parsed2 !== null && parsed2.id && parsed2.timestamp && parsed2.actor && parsed2.bkitVersion,
  'Audit entry has id, timestamp, actor, and bkitVersion'
);

// AP-004: Multiple writes append to same file
auditLogger.writeAuditLog({
  action: 'feature_created',
  category: 'pdca',
  target: 'test-feature-2',
  targetType: 'feature',
  actor: 'user',
  result: 'success',
});
const lines4 = fs.readFileSync(auditFile, 'utf8').trim().split('\n');
assert('AP-004',
  lines4.length === 2,
  'Second writeAuditLog appends to same file (2 lines total)'
);

// AP-005: Destructive operation flag is recorded
auditLogger.writeAuditLog({
  action: 'destructive_blocked',
  category: 'control',
  target: 'rm -rf /',
  targetType: 'file',
  actor: 'hook',
  result: 'blocked',
  destructiveOperation: true,
  blastRadius: 'critical',
});
const lines5 = fs.readFileSync(auditFile, 'utf8').trim().split('\n');
const entry5 = JSON.parse(lines5[2]);
assert('AP-005',
  entry5.destructiveOperation === true && entry5.blastRadius === 'critical',
  'Destructive operation and blastRadius recorded correctly'
);

// ============================================================
// Section 2: readAuditLogs reads back (AP-006~010)
// ============================================================

// AP-006: readAuditLogs returns all entries for today
const allEntries = auditLogger.readAuditLogs();
assert('AP-006',
  Array.isArray(allEntries) && allEntries.length === 3,
  'readAuditLogs() returns all 3 entries for today'
);

// AP-007: readAuditLogs filters by feature
const featureEntries = auditLogger.readAuditLogs({ feature: 'test-feature' });
assert('AP-007',
  featureEntries.length === 1 && featureEntries[0].target === 'test-feature',
  'readAuditLogs({ feature }) filters correctly'
);

// AP-008: readAuditLogs filters by action
const actionEntries = auditLogger.readAuditLogs({ action: 'destructive_blocked' });
assert('AP-008',
  actionEntries.length === 1 && actionEntries[0].action === 'destructive_blocked',
  'readAuditLogs({ action }) filters correctly'
);

// AP-009: readAuditLogs filters by category
const categoryEntries = auditLogger.readAuditLogs({ category: 'control' });
assert('AP-009',
  categoryEntries.length === 1 && categoryEntries[0].category === 'control',
  'readAuditLogs({ category }) filters correctly'
);

// AP-010: readAuditLogs with limit returns limited results
const limitEntries = auditLogger.readAuditLogs({ limit: 1 });
assert('AP-010',
  limitEntries.length === 1,
  'readAuditLogs({ limit: 1 }) returns only 1 entry'
);

// ============================================================
// Section 3: generateDailySummary aggregation (AP-011~015)
// ============================================================

// AP-011: generateDailySummary returns summary object
const summary = auditLogger.generateDailySummary();
assert('AP-011',
  summary !== null && typeof summary === 'object' && summary.totalEntries === 3,
  'generateDailySummary returns summary with totalEntries=3'
);

// AP-012: Summary has byAction counts
assert('AP-012',
  summary.byAction.phase_transition === 1 && summary.byAction.feature_created === 1,
  'Summary byAction counts are correct'
);

// AP-013: Summary has byCategory counts
assert('AP-013',
  summary.byCategory.pdca === 2 && summary.byCategory.control === 1,
  'Summary byCategory counts are correct'
);

// AP-014: Summary tracks destructive operations
assert('AP-014',
  summary.destructiveCount === 1 && summary.criticalCount === 1,
  'Summary tracks destructiveCount and criticalCount'
);

// AP-015: Summary collects unique features
assert('AP-015',
  Array.isArray(summary.features) && summary.features.includes('test-feature'),
  'Summary collects unique feature names'
);

// ============================================================
// Section 4: cleanupOldLogs retention (AP-016~020)
// ============================================================

// AP-016: Create old audit file for cleanup test
const oldDate = new Date();
oldDate.setDate(oldDate.getDate() - 60);
const oldDateStr = oldDate.toISOString().slice(0, 10);
const oldFile = path.join(auditDir, `${oldDateStr}.jsonl`);
fs.writeFileSync(oldFile, JSON.stringify({ id: 'old-entry', timestamp: oldDate.toISOString() }) + '\n');
assert('AP-016',
  fs.existsSync(oldFile),
  'Old audit file created for cleanup test'
);

// AP-017: cleanupOldLogs removes old files
const deleted17 = auditLogger.cleanupOldLogs(30);
assert('AP-017',
  deleted17 >= 1,
  'cleanupOldLogs(30) deletes files older than 30 days'
);

// AP-018: Old file is removed after cleanup
assert('AP-018',
  !fs.existsSync(oldFile),
  'Old audit file is deleted after cleanup'
);

// AP-019: Current day file is preserved
assert('AP-019',
  fs.existsSync(auditFile),
  'Current day audit file is preserved after cleanup'
);

// AP-020: cleanupOldLogs returns 0 when no old files
const deleted20 = auditLogger.cleanupOldLogs(30);
assert('AP-020',
  deleted20 === 0,
  'cleanupOldLogs returns 0 when no more old files'
);

// ============================================================
// Cleanup
// ============================================================
platform.PROJECT_DIR = origProjectDir;
try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch (_) {}

// ============================================================
// Summary
// ============================================================
console.log('\n========================================');
console.log('Audit Pipeline Integration Test Results');
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
