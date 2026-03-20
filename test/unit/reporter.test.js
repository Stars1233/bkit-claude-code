'use strict';
/**
 * Unit Tests for evals/reporter.js
 * 25 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../evals/reporter');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

let passed = 0, failed = 0, total = 0;

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; console.error(`  FAIL: ${id} - ${message}`); }
}

console.log('\n=== reporter.test.js ===\n');

// --- Exports ---
assert('U-RPT-001', typeof mod.formatMarkdownReport === 'function', 'formatMarkdownReport exported');
assert('U-RPT-002', typeof mod.formatDetailedReport === 'function', 'formatDetailedReport exported');
assert('U-RPT-003', typeof mod.formatJsonSummary === 'function', 'formatJsonSummary exported');

// --- Test data ---
const benchmarkResult = {
  timestamp: '2026-03-08T10:00:00.000Z',
  version: '1.6.0',
  model: 'claude-sonnet-4-6',
  summary: {
    workflow: { total: 9, passed: 9 },
    capability: { total: 18, passed: 16 },
    hybrid: { total: 1, passed: 1 }
  },
  details: {
    workflow: [
      { skill: 'pdca', pass: true, details: { message: 'OK' } },
      { skill: 'code-review', pass: true, details: {} }
    ],
    capability: [
      { skill: 'starter', pass: true, details: { score: 1.0 } },
      { skill: 'dynamic', pass: false, details: { error: 'Missing criteria', score: 0.5, failedCriteria: ['placeholder content'] } }
    ],
    hybrid: [
      { skill: 'plan-plus', pass: true, details: { score: 0.9 } }
    ]
  }
};

// --- formatMarkdownReport ---
const mdReport = mod.formatMarkdownReport(benchmarkResult);
assert('U-RPT-004', typeof mdReport === 'string', 'Returns string');
assert('U-RPT-005', mdReport.includes('# bkit Skill Evals Report'), 'Has title');
assert('U-RPT-006', mdReport.includes('2026-03-08'), 'Has timestamp');
assert('U-RPT-007', mdReport.includes('1.6.0'), 'Has version');
assert('U-RPT-008', mdReport.includes('claude-sonnet-4-6'), 'Has model');
assert('U-RPT-009', mdReport.includes('Workflow'), 'Has workflow section');
assert('U-RPT-010', mdReport.includes('Capability'), 'Has capability section');
assert('U-RPT-011', mdReport.includes('Hybrid'), 'Has hybrid section');
assert('U-RPT-012', mdReport.includes('PASS'), 'Contains PASS');
assert('U-RPT-013', mdReport.includes('FAIL'), 'Contains FAIL');
assert('U-RPT-014', mdReport.includes('pdca'), 'Contains skill name');

// --- formatDetailedReport ---
const detailReport = mod.formatDetailedReport(benchmarkResult);
assert('U-RPT-015', detailReport.includes('Detailed Report'), 'Has detailed title');
assert('U-RPT-016', detailReport.includes('Overall Summary'), 'Has overall summary');
assert('U-RPT-017', detailReport.includes('Category Breakdown'), 'Has category breakdown');
assert('U-RPT-018', detailReport.includes('Failed Skills Detail'), 'Has failed detail (dynamic failed)');
assert('U-RPT-019', detailReport.includes('dynamic'), 'Failed skill name present');
assert('U-RPT-020', detailReport.includes('Missing criteria'), 'Error message present');
assert('U-RPT-021', detailReport.includes('Score Distribution'), 'Has score distribution');
assert('U-RPT-022', detailReport.includes('Placeholder'), 'Has placeholder count');

// --- formatJsonSummary ---
const jsonSummary = mod.formatJsonSummary(benchmarkResult);
assert('U-RPT-023', typeof jsonSummary === 'object', 'Returns object');
assert('U-RPT-024', jsonSummary.total === 28, `Total is 28 (got ${jsonSummary.total})`);
assert('U-RPT-025', jsonSummary.passed === 26, `Passed is 26 (got ${jsonSummary.passed})`);
assert('U-RPT-026', jsonSummary.rate === 93, `Rate is 93% (got ${jsonSummary.rate})`);
assert('U-RPT-027', jsonSummary.timestamp === '2026-03-08T10:00:00.000Z', 'Timestamp preserved');

// Edge case: all zeros
const emptyResult = {
  timestamp: 'now', version: '0', model: 'test',
  summary: { workflow: { total: 0, passed: 0 }, capability: { total: 0, passed: 0 }, hybrid: { total: 0, passed: 0 } },
  details: { workflow: [], capability: [], hybrid: [] }
};
const emptyMd = mod.formatMarkdownReport(emptyResult);
assert('U-RPT-028', emptyMd.includes('N/A'), 'Zero total shows N/A for rate');

const emptyJson = mod.formatJsonSummary(emptyResult);
assert('U-RPT-029', emptyJson.total === 0, 'Empty total is 0');
assert('U-RPT-030', emptyJson.rate === 0, 'Empty rate is 0');

console.log(`\n${'='.repeat(50)}`);
console.log(`reporter.test.js: ${passed}/${total} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
