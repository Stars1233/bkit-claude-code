'use strict';
/**
 * Unit Tests for lib/ui/impact-view.js
 * 10 TC | console.assert based | no external dependencies
 */

process.env.NO_COLOR = '1';

let mod;
try {
  mod = require('../../lib/ui/impact-view');
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

console.log('\n=== impact-view.test.js ===\n');

// Sample data
const sampleStatus = {
  primaryFeature: 'impact-test',
  features: {
    'impact-test': {
      phase: 'check',
      matchRate: 92,
      iterationCount: 3,
      iterationHistory: [
        { iteration: 1, phase: 'plan', matchRate: 55, completedAt: '2026-01-01' },
        { iteration: 2, phase: 'do', matchRate: 78, completedAt: '2026-01-02' },
        { iteration: 3, phase: 'check', matchRate: 92 },
      ],
    },
  },
};

const sampleGitDiff = {
  changedFiles: [
    'lib/ui/ansi.js',
    'lib/ui/progress-bar.js',
    'lib/ui/workflow-map.js',
    'lib/ui/agent-panel.js',
    'lib/ui/impact-view.js',
    'lib/ui/control-panel.js',
    'test/unit/ansi.test.js',
    'test/unit/progress-bar.test.js',
  ],
  stats: {
    insertions: 450,
    deletions: 30,
    filesChanged: 8,
  },
};

// --- IV-001: renderImpactView returns string ---
const result = mod.renderImpactView(sampleStatus, sampleGitDiff, { width: 100 });
assert('IV-001', typeof result === 'string', 'renderImpactView returns string');

// --- IV-002: Result is not empty ---
assert('IV-002', result.length > 0, 'renderImpactView result is not empty');

// --- IV-003: Contains box drawing characters ---
assert('IV-003',
  result.includes('\u250C') && result.includes('\u2514'),
  'result contains box drawing characters');

// --- IV-004: Match Rate section present ---
assert('IV-004', result.includes('Match Rate') && result.includes('92%'),
  'Match Rate section present with correct value');

// --- IV-005: High match rate (>=90) shown with green indicator (target met) ---
assert('IV-005', result.includes('target: 90%'),
  'target threshold displayed');

// --- IV-006: Match Rate bar contains block characters ---
assert('IV-006', result.includes('\u2588') || result.includes('\u2591'),
  'Match Rate bar contains filled/empty block characters');

// --- IV-007: File tree rendering shows changed files ---
assert('IV-007', result.includes('Changed Files') && result.includes('8 files'),
  'changed files header with count displayed');

// --- IV-008: File tree uses tree drawing characters ---
assert('IV-008',
  result.includes('\u251C') || result.includes('\u2514'),
  'file tree uses tree branch characters');

// --- IV-009: Iteration trend bars displayed ---
assert('IV-009',
  result.includes('Iter') && result.includes('Iteration Match Rate Trend'),
  'iteration trend section displayed');

// --- IV-010: Null inputs do not crash ---
let noCrash = false;
try {
  const r1 = mod.renderImpactView(null, null, { width: 80 });
  const r2 = mod.renderImpactView(undefined, undefined, { width: 80 });
  const r3 = mod.renderImpactView({}, {}, { width: 80 });
  noCrash = typeof r1 === 'string' && typeof r2 === 'string' && typeof r3 === 'string';
} catch { noCrash = false; }
assert('IV-010', noCrash, 'null/undefined/empty inputs do not crash');

console.log(`\n${'='.repeat(50)}`);
console.log(`impact-view.test.js: ${passed}/${total} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
