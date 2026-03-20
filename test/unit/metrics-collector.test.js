'use strict';
/**
 * Unit Tests for lib/quality/metrics-collector.js
 * 20 TC | console.assert based | no external dependencies
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Set up tmp dir and mock platform
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-metrics-test-'));
const stateDir = path.join(tmpDir, '.bkit', 'state');
fs.mkdirSync(stateDir, { recursive: true });

const platformPath = require.resolve('../../lib/core/platform');
const origPlatform = require(platformPath);
const mockPlatform = { ...origPlatform, PROJECT_DIR: tmpDir };
require.cache[platformPath] = { id: platformPath, filename: platformPath, loaded: true, exports: mockPlatform };

let mod;
try {
  mod = require('../../lib/quality/metrics-collector');
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

console.log('\n=== metrics-collector.test.js ===\n');

// --- MC-001~005: collectMetric for M1-M10 ---

mod.collectMetric('M1', 'feat-a', 92);
mod.collectMetric('M2', 'feat-a', 78);
mod.collectMetric('M3', 'feat-a', 0);
mod.collectMetric('M7', 'feat-a', 88);
mod.collectMetric('M9', 'feat-a', 5);

const current = mod.readCurrentMetrics('feat-a');
assert('MC-001', current !== null, 'collectMetric creates metrics for feature');
assert('MC-002', current.metrics.M1.value === 92, 'M1 match rate recorded correctly');
assert('MC-003', current.metrics.M2.value === 78, 'M2 code quality recorded correctly');
assert('MC-004', current.metrics.M3.value === 0, 'M3 critical issues recorded correctly');
assert('MC-005', current.metrics.M9.value === 5, 'M9 iteration efficiency recorded correctly');

// --- MC-006~009: saveMetrics atomic write ---

const metricsObj = {
  feature: 'feat-b',
  phase: 'check',
  projectLevel: 'Dynamic',
  timestamp: new Date().toISOString(),
  metrics: {
    M1: { value: 85, collector: 'gap-detector', collectedAt: new Date().toISOString() },
    M4: { value: 96, collector: 'gap-detector', collectedAt: new Date().toISOString() },
  },
};

mod.saveMetrics(metricsObj);
const saved = mod.readCurrentMetrics('feat-b');
assert('MC-006', saved !== null, 'saveMetrics persists data');
assert('MC-007', saved.feature === 'feat-b', 'Saved feature name matches');
assert('MC-008', saved.metrics.M1.value === 85, 'Saved M1 value matches');
assert('MC-009', saved.phase === 'check', 'Saved phase matches');

// --- MC-010~013: appendHistory FIFO ---

for (let i = 0; i < 5; i++) {
  mod.appendHistory({
    feature: 'feat-hist',
    phase: 'check',
    cycle: i + 1,
    timestamp: new Date().toISOString(),
    values: { M1: 80 + i, M2: 70 + i },
  });
}

const history1 = mod.readRecentHistory(10, 'feat-hist');
assert('MC-010', history1.length === 5, 'appendHistory stores 5 data points');
assert('MC-011', history1[0].cycle === 1 && history1[4].cycle === 5, 'History is chronologically ordered');

// Test FIFO limit (write 101 points, should keep 100)
for (let i = 0; i < 101; i++) {
  mod.appendHistory({
    feature: 'feat-fifo',
    phase: 'act',
    cycle: i + 1,
    timestamp: new Date().toISOString(),
    values: { M1: 50 + (i % 50) },
  });
}
const allHistory = mod.readRecentHistory(200);
assert('MC-012', allHistory.length <= 100, `FIFO enforced: history <= 100 points (got ${allHistory.length})`);
assert('MC-013', allHistory[allHistory.length - 1].cycle === 101, 'Most recent entry is last cycle');

// --- MC-014~016: readCurrentMetrics/readRecentHistory ---

const readNull = mod.readCurrentMetrics('nonexistent-feature');
assert('MC-014', readNull === null, 'readCurrentMetrics returns null for unknown feature');

const readA = mod.readCurrentMetrics('feat-a');
assert('MC-015', readA && readA.metrics.M1.value === 92, 'readCurrentMetrics returns correct data');

// Write fresh data for this test after FIFO
mod.appendHistory({ feature: 'feat-recent', phase: 'check', cycle: 1, timestamp: new Date().toISOString(), values: { M1: 80 } });
mod.appendHistory({ feature: 'feat-recent', phase: 'check', cycle: 2, timestamp: new Date().toISOString(), values: { M1: 85 } });
mod.appendHistory({ feature: 'feat-recent', phase: 'check', cycle: 3, timestamp: new Date().toISOString(), values: { M1: 90 } });
mod.appendHistory({ feature: 'feat-recent', phase: 'check', cycle: 4, timestamp: new Date().toISOString(), values: { M1: 92 } });
const recentFeat = mod.readRecentHistory(2, 'feat-recent');
assert('MC-016', recentFeat.length === 2 && recentFeat[0].cycle === 3 && recentFeat[1].cycle === 4,
  'readRecentHistory respects cycle limit and returns most recent');

// --- MC-017~020: analyzeTrend ---

// Create enough data for trend analysis
// Reset history for clean trend test
const histPath = path.join(stateDir, 'quality-history.json');
fs.writeFileSync(histPath, JSON.stringify({ points: [] }), 'utf-8');

// Improving trend: M1 increases over 6 cycles
const trendPoints = [
  { M1: 70, M2: 60, M3: 2, M7: 80, M9: 2, M10: 5 },
  { M1: 72, M2: 62, M3: 1, M7: 82, M9: 2.5, M10: 4.5 },
  { M1: 74, M2: 64, M3: 1, M7: 84, M9: 3, M10: 4 },
  { M1: 80, M2: 70, M3: 0, M7: 88, M9: 4, M10: 3.5 },
  { M1: 85, M2: 75, M3: 0, M7: 90, M9: 5, M10: 3 },
  { M1: 90, M2: 80, M3: 0, M7: 92, M9: 6, M10: 2.5 },
];

for (let i = 0; i < trendPoints.length; i++) {
  mod.appendHistory({
    feature: 'trend-feat',
    phase: 'check',
    cycle: i + 1,
    timestamp: new Date().toISOString(),
    values: trendPoints[i],
  });
}

const trend1 = mod.analyzeTrend('trend-feat');
assert('MC-017', trend1.trend === 'improving', 'Improving M1 trend detected');
assert('MC-018', typeof trend1.movingAverages === 'object', 'Moving averages computed');
assert('MC-019', Array.isArray(trend1.alarms), 'Alarms array present');

// Declining trend with alarms
fs.writeFileSync(histPath, JSON.stringify({ points: [] }), 'utf-8');
const decliningPoints = [
  { M1: 90, M2: 80, M3: 0, M7: 90, M9: 5, M10: 3 },
  { M1: 88, M2: 78, M3: 0, M7: 88, M9: 4, M10: 3 },
  { M1: 85, M2: 75, M3: 1, M7: 85, M9: 3, M10: 4 },
  { M1: 80, M2: 70, M3: 2, M7: 80, M9: 2, M10: 5 },
  { M1: 75, M2: 65, M3: 3, M7: 75, M9: 1, M10: 7 },
  { M1: 70, M2: 60, M3: 4, M7: 65, M9: 0.5, M10: 8 },
];

for (let i = 0; i < decliningPoints.length; i++) {
  mod.appendHistory({
    feature: 'decline-feat',
    phase: 'check',
    cycle: i + 1,
    timestamp: new Date().toISOString(),
    values: decliningPoints[i],
  });
}

const trend2 = mod.analyzeTrend('decline-feat');
assert('MC-020', trend2.trend === 'declining' && trend2.alarms.length > 0,
  'Declining trend detected with alarms triggered');

// --- Cleanup ---
delete require.cache[platformPath];
fs.rmSync(tmpDir, { recursive: true, force: true });

// --- Summary ---
console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
