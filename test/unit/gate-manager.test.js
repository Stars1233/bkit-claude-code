'use strict';
/**
 * Unit Tests for lib/quality/gate-manager.js
 * 25 TC | console.assert based | no external dependencies
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Set up tmp dir and mock platform/state-store for file I/O
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-gate-test-'));
const stateDir = path.join(tmpDir, '.bkit', 'state');
fs.mkdirSync(stateDir, { recursive: true });

// Mock platform to use tmpDir
const platformPath = require.resolve('../../lib/core/platform');
const origPlatform = require(platformPath);
const mockPlatform = { ...origPlatform, PROJECT_DIR: tmpDir };
require.cache[platformPath] = { id: platformPath, filename: platformPath, loaded: true, exports: mockPlatform };

let mod;
try {
  mod = require('../../lib/quality/gate-manager');
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

console.log('\n=== gate-manager.test.js ===\n');

// --- GM-001~007: 7 phase gates exist ---

assert('GM-001', mod.GATE_DEFINITIONS.pm !== undefined, 'PM gate defined');
assert('GM-002', mod.GATE_DEFINITIONS.plan !== undefined, 'Plan gate defined');
assert('GM-003', mod.GATE_DEFINITIONS.design !== undefined, 'Design gate defined');
assert('GM-004', mod.GATE_DEFINITIONS['do'] !== undefined, 'Do gate defined');
assert('GM-005', mod.GATE_DEFINITIONS.check !== undefined, 'Check gate defined');
assert('GM-006', mod.GATE_DEFINITIONS.act !== undefined, 'Act gate defined');
assert('GM-007', mod.GATE_DEFINITIONS.report !== undefined, 'Report gate defined');

// --- GM-008~012: checkGate returns pass/retry/fail ---

// pass: all conditions met
const passResult = mod.checkGate('pm', {
  metrics: { designCompleteness: 50 },
  projectLevel: 'Dynamic',
});
assert('GM-008', passResult.verdict === 'pass', 'PM gate passes with designCompleteness=50');

// retry: not all pass conditions met, retry conditions match
const retryResult = mod.checkGate('plan', {
  metrics: { designCompleteness: 30 },
  projectLevel: 'Dynamic',
});
assert('GM-009', retryResult.verdict === 'retry', 'Plan gate retries with designCompleteness=30');

// fail: hard fail condition triggered
const failResult = mod.checkGate('check', {
  metrics: { matchRate: 95, codeQualityScore: 80, criticalIssueCount: 2, apiComplianceRate: 96 },
  projectLevel: 'Dynamic',
});
assert('GM-010', failResult.verdict === 'fail', 'Check gate fails with criticalIssueCount=2');

// Verify result shape
assert('GM-011', typeof passResult.score === 'number' && passResult.score >= 0 && passResult.score <= 100,
  'checkGate returns numeric score 0-100');
assert('GM-012', typeof passResult.recommendation === 'string' && passResult.recommendation.length > 0,
  'checkGate returns recommendation string');

// --- GM-013~017: Level threshold overrides ---

// Starter: lower thresholds (matchRate=80 instead of 90)
const starterResult = mod.checkGate('check', {
  metrics: { matchRate: 82, codeQualityScore: 62, criticalIssueCount: 0, apiComplianceRate: 92 },
  projectLevel: 'Starter',
});
assert('GM-013', starterResult.verdict === 'pass', 'Starter level passes with lower thresholds');

// Enterprise: higher thresholds (matchRate=95)
const enterpriseResult = mod.checkGate('check', {
  metrics: { matchRate: 92, codeQualityScore: 75, criticalIssueCount: 0, apiComplianceRate: 96 },
  projectLevel: 'Enterprise',
});
assert('GM-014', enterpriseResult.verdict === 'retry', 'Enterprise level retries at matchRate=92 (needs 95)');

// getEffectiveThresholds
const starterThresholds = mod.getEffectiveThresholds('check', 'Starter');
assert('GM-015', starterThresholds.matchRate && starterThresholds.matchRate.effective === 80,
  'Starter matchRate threshold is 80');

const enterpriseThresholds = mod.getEffectiveThresholds('check', 'Enterprise');
assert('GM-016', enterpriseThresholds.matchRate && enterpriseThresholds.matchRate.effective === 100,
  'Enterprise matchRate threshold is 100');

const dynamicThresholds = mod.getEffectiveThresholds('check', 'Dynamic');
assert('GM-017', dynamicThresholds.matchRate && dynamicThresholds.matchRate.effective === 100,
  'Dynamic matchRate uses default threshold 100');

// --- GM-018~021: resolveAction per automation level ---

assert('GM-018', mod.resolveAction('pass', 'guide', 'check') === 'notify',
  'Guide mode: pass -> notify');
assert('GM-019', mod.resolveAction('pass', 'semi', 'check') === 'auto_branch',
  'Semi mode: pass -> auto_branch');
assert('GM-020', mod.resolveAction('retry', 'full', 'check') === 'auto_proceed',
  'Full mode: retry -> auto_proceed');
assert('GM-021', mod.resolveAction('fail', 'semi', 'check') === 'block',
  'Semi mode: fail -> block');

// --- GM-022~025: recordGateResult persistence ---

mod.recordGateResult('plan', { verdict: 'pass', score: 100, blockers: [] }, 'test-feature');
mod.recordGateResult('design', { verdict: 'retry', score: 60, blockers: [] }, 'test-feature');
mod.recordGateResult('check', { verdict: 'fail', score: 30, blockers: ['crit issue'] }, 'test-feature');

const gateResultsPath = path.join(stateDir, 'gate-results.json');
assert('GM-022', fs.existsSync(gateResultsPath), 'Gate results file created');

const gateData = JSON.parse(fs.readFileSync(gateResultsPath, 'utf-8'));
assert('GM-023', Array.isArray(gateData.results), 'Gate results has results array');
assert('GM-024', gateData.results.length === 3, 'Three gate results recorded');
assert('GM-025', gateData.results[2].verdict === 'fail' && gateData.results[2].phase === 'check',
  'Last result has correct verdict and phase');

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
