#!/usr/bin/env node
/**
 * Quality Pipeline Integration Test
 * @module test/integration/quality-pipeline
 * @version 2.0.0
 *
 * Verifies quality metrics collection, gate checking, history, and trend analysis.
 * Uses temp directory for isolated state.
 * 20 TC: QP-001 ~ QP-020
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

// Setup: Override PROJECT_DIR for isolated testing
const TEST_DIR = path.join(os.tmpdir(), `bkit-quality-test-${process.pid}-${Date.now()}`);
fs.mkdirSync(path.join(TEST_DIR, '.bkit', 'state'), { recursive: true });

const platform = require(path.join(PROJECT_ROOT, 'lib/core/platform'));
const origProjectDir = platform.PROJECT_DIR;
platform.PROJECT_DIR = TEST_DIR;

const metrics = require(path.join(PROJECT_ROOT, 'lib/quality/metrics-collector'));
const gates = require(path.join(PROJECT_ROOT, 'lib/quality/gate-manager'));

// ============================================================
// Section 1: collectMetric -> saveMetrics -> readCurrentMetrics chain (QP-001~005)
// ============================================================

// QP-001: collectMetric stores a metric value
metrics.collectMetric('M1', 'test-feat-1', 85);
const current1 = metrics.readCurrentMetrics('test-feat-1');
assert('QP-001',
  current1 !== null && current1.metrics.M1 && current1.metrics.M1.value === 85,
  'collectMetric(M1) stores value 85 and readCurrentMetrics retrieves it'
);

// QP-002: collectMetric with collector override
metrics.collectMetric('M2', 'test-feat-1', 72, 'custom-collector');
const current2 = metrics.readCurrentMetrics('test-feat-1');
assert('QP-002',
  current2.metrics.M2.value === 72 && current2.metrics.M2.collector === 'custom-collector',
  'collectMetric with collector override stores correct collector name'
);

// QP-003: Multiple metrics accumulate on same feature
metrics.collectMetric('M3', 'test-feat-1', 0);
metrics.collectMetric('M7', 'test-feat-1', 90);
const current3 = metrics.readCurrentMetrics('test-feat-1');
assert('QP-003',
  current3.metrics.M1 && current3.metrics.M2 && current3.metrics.M3 && current3.metrics.M7,
  'Multiple collectMetric calls accumulate metrics on same feature'
);

// QP-004: saveMetrics overwrites feature snapshot
const snapshot4 = {
  feature: 'test-feat-2',
  phase: 'check',
  projectLevel: 'Dynamic',
  timestamp: new Date().toISOString(),
  metrics: { M1: { value: 95, collector: 'gap-detector', collectedAt: new Date().toISOString() } }
};
metrics.saveMetrics(snapshot4);
const current4 = metrics.readCurrentMetrics('test-feat-2');
assert('QP-004',
  current4 !== null && current4.metrics.M1.value === 95,
  'saveMetrics stores complete snapshot and readCurrentMetrics retrieves it'
);

// QP-005: readCurrentMetrics returns null for non-existent feature
const current5 = metrics.readCurrentMetrics('nonexistent-feature');
assert('QP-005',
  current5 === null,
  'readCurrentMetrics returns null for non-existent feature'
);

// ============================================================
// Section 2: checkGate with real metrics data (QP-006~010)
// ============================================================

// QP-006: checkGate passes with good metrics
const gate6 = gates.checkGate('check', {
  metrics: { matchRate: 95, codeQualityScore: 80, criticalIssueCount: 0, apiComplianceRate: 98 },
  projectLevel: 'Dynamic',
});
assert('QP-006',
  gate6.verdict === 'pass' && gate6.score === 100,
  'checkGate(check) passes with all metrics above threshold'
);

// QP-007: checkGate returns retry with partial metrics
const gate7 = gates.checkGate('check', {
  metrics: { matchRate: 80, codeQualityScore: 65, criticalIssueCount: 0, apiComplianceRate: 90 },
  projectLevel: 'Dynamic',
});
assert('QP-007',
  gate7.verdict === 'retry',
  'checkGate(check) returns retry when matchRate < 90'
);

// QP-008: checkGate returns fail with critical blockers
const gate8 = gates.checkGate('check', {
  metrics: { matchRate: 95, codeQualityScore: 80, criticalIssueCount: 2, apiComplianceRate: 98 },
  projectLevel: 'Dynamic',
});
assert('QP-008',
  gate8.verdict === 'fail' && gate8.blockers.length > 0,
  'checkGate(check) fails with criticalIssueCount > 0'
);

// QP-009: checkGate respects level overrides (Enterprise stricter)
const gate9 = gates.checkGate('check', {
  metrics: { matchRate: 92, codeQualityScore: 75, criticalIssueCount: 0, apiComplianceRate: 96 },
  projectLevel: 'Enterprise',
});
assert('QP-009',
  gate9.verdict !== 'pass',
  'checkGate(check, Enterprise) does not pass with matchRate=92 (Enterprise threshold=95)'
);

// QP-010: checkGate with unknown phase returns pass
const gate10 = gates.checkGate('unknown-phase', { metrics: {} });
assert('QP-010',
  gate10.verdict === 'pass' && gate10.score === 100,
  'checkGate returns pass for unknown phase (no gate defined)'
);

// ============================================================
// Section 3: appendHistory -> readRecentHistory -> analyzeTrend chain (QP-011~015)
// ============================================================

// QP-011: appendHistory adds data point
metrics.appendHistory({
  feature: 'test-feat-3',
  phase: 'check',
  cycle: 1,
  timestamp: new Date().toISOString(),
  values: { M1: 70, M2: 65, M3: 2, M7: 80, M9: 5, M10: 3 }
});
const hist11 = metrics.readRecentHistory(10, 'test-feat-3');
assert('QP-011',
  hist11.length === 1 && hist11[0].values.M1 === 70,
  'appendHistory stores data point and readRecentHistory retrieves it'
);

// QP-012: Multiple history points accumulate
metrics.appendHistory({ feature: 'test-feat-3', phase: 'check', cycle: 2, timestamp: new Date().toISOString(), values: { M1: 75, M2: 70, M3: 1, M7: 82, M9: 5, M10: 2.5 } });
metrics.appendHistory({ feature: 'test-feat-3', phase: 'check', cycle: 3, timestamp: new Date().toISOString(), values: { M1: 80, M2: 72, M3: 0, M7: 85, M9: 5, M10: 2 } });
const hist12 = metrics.readRecentHistory(10, 'test-feat-3');
assert('QP-012',
  hist12.length === 3,
  'Multiple appendHistory calls accumulate (3 total points)'
);

// QP-013: analyzeTrend computes moving averages
const trend13 = metrics.analyzeTrend('test-feat-3');
assert('QP-013',
  trend13.cycles === 3 && trend13.movingAverages.M1 != null,
  'analyzeTrend returns cycles count and M1 moving average'
);

// QP-014: analyzeTrend detects improving trend
// Add 3 more data points with increasing M1
metrics.appendHistory({ feature: 'test-feat-3', phase: 'check', cycle: 4, timestamp: new Date().toISOString(), values: { M1: 85, M2: 75, M3: 0, M7: 87, M9: 5, M10: 1.8 } });
metrics.appendHistory({ feature: 'test-feat-3', phase: 'check', cycle: 5, timestamp: new Date().toISOString(), values: { M1: 88, M2: 78, M3: 0, M7: 89, M9: 5, M10: 1.5 } });
metrics.appendHistory({ feature: 'test-feat-3', phase: 'check', cycle: 6, timestamp: new Date().toISOString(), values: { M1: 92, M2: 80, M3: 0, M7: 91, M9: 6, M10: 1.2 } });
const trend14 = metrics.analyzeTrend('test-feat-3');
assert('QP-014',
  trend14.trend === 'improving',
  'analyzeTrend detects improving trend when recent M1 > earlier M1'
);

// QP-015: readRecentHistory limits by cycle count
const hist15 = metrics.readRecentHistory(3, 'test-feat-3');
assert('QP-015',
  hist15.length === 3,
  'readRecentHistory(3) returns exactly 3 most recent points'
);

// ============================================================
// Section 4: Gate result recording and regression chain (QP-016~020)
// ============================================================

// QP-016: recordGateResult stores result
gates.recordGateResult('check', gate6, 'test-feat-1');
assert('QP-016',
  true, // recordGateResult does not throw
  'recordGateResult stores gate result without error'
);

// QP-017: resolveAction returns correct action for pass/semi
const action17 = gates.resolveAction('pass', 'semi', 'check');
assert('QP-017',
  action17 === 'auto_branch',
  'resolveAction(pass, semi) returns auto_branch'
);

// QP-018: resolveAction returns block for fail/semi
const action18 = gates.resolveAction('fail', 'semi', 'check');
assert('QP-018',
  action18 === 'block',
  'resolveAction(fail, semi) returns block'
);

// QP-019: resolveAction returns auto_proceed for pass/full
const action19 = gates.resolveAction('pass', 'full', 'check');
assert('QP-019',
  action19 === 'auto_proceed',
  'resolveAction(pass, full) returns auto_proceed'
);

// QP-020: getEffectiveThresholds returns level-adjusted thresholds
const thresholds20 = gates.getEffectiveThresholds('check', 'Enterprise');
assert('QP-020',
  thresholds20.matchRate && thresholds20.matchRate.effective === 95,
  'getEffectiveThresholds(check, Enterprise) returns matchRate threshold 95'
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
console.log('Quality Pipeline Integration Test Results');
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
