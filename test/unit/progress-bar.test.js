'use strict';
/**
 * Unit Tests for lib/ui/progress-bar.js
 * 15 TC | console.assert based | no external dependencies
 */

process.env.NO_COLOR = '1';

let mod;
try {
  mod = require('../../lib/ui/progress-bar');
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

console.log('\n=== progress-bar.test.js ===\n');

// Sample PDCA status data
const sampleStatus = {
  primaryFeature: 'test-feature',
  features: {
    'test-feature': {
      phase: 'do',
      matchRate: 75,
      iterationCount: 3,
      timestamps: { lastUpdated: new Date().toISOString() },
      iterationHistory: [
        { iteration: 1, phase: 'plan', matchRate: 60, completedAt: '2026-01-01' },
        { iteration: 2, phase: 'design', matchRate: 70, completedAt: '2026-01-02' },
        { iteration: 3, phase: 'do', matchRate: 75 },
      ],
    },
  },
};

// --- PB-001: renderPdcaProgressBar returns string ---
const result1 = mod.renderPdcaProgressBar(sampleStatus, { width: 80 });
assert('PB-001', typeof result1 === 'string', 'renderPdcaProgressBar returns string');

// --- PB-002: Result is not empty ---
assert('PB-002', result1.length > 0, 'renderPdcaProgressBar result is not empty');

// --- PB-003: stripAnsi exported and works ---
assert('PB-003', typeof mod.stripAnsi === 'function' && mod.stripAnsi('\x1b[31mhello\x1b[0m') === 'hello',
  'stripAnsi is exported and strips ANSI codes');

// --- PB-004: Compact mode returns single line (no newlines) ---
const compact = mod.renderPdcaProgressBar(sampleStatus, { compact: true, width: 80 });
assert('PB-004', !compact.includes('\n'), 'compact mode returns single line (no newlines)');

// --- PB-005: Compact mode includes phase names ---
assert('PB-005',
  compact.includes('PM') && compact.includes('PLAN') && compact.includes('DO'),
  'compact mode includes phase names (PM, PLAN, DO)');

// --- PB-006: Compact mode includes percentage ---
assert('PB-006', compact.includes('%'), 'compact mode includes percentage');

// --- PB-007: Full mode returns multiple lines ---
const full = mod.renderPdcaProgressBar(sampleStatus, { compact: false, width: 80 });
assert('PB-007', full.includes('\n'), 'full mode returns multiple lines');

// --- PB-008: Full mode includes box characters ---
assert('PB-008',
  full.includes('\u250C') && full.includes('\u2514'),
  'full mode includes box drawing characters (top-left, bottom-left corners)');

// --- PB-009: Full mode includes feature name ---
assert('PB-009', full.includes('test-feature'), 'full mode includes feature name');

// --- PB-010: Phase symbol for completed phase (done = checkmark) ---
// PM and PLAN should be completed (before DO). With NO_COLOR, symbols are plain text.
assert('PB-010', compact.includes('\u2713'), 'completed phase shows checkmark symbol');

// --- PB-011: Phase symbol for running phase (running = play) ---
assert('PB-011', compact.includes('\u25B6'), 'running phase shows play symbol');

// --- PB-012: Phase symbol for pending phase (pending = dot) ---
assert('PB-012', compact.includes('\u00B7'), 'pending phase shows dot symbol');

// --- PB-013: Null pdcaStatus input does not crash ---
let noCrash1 = false;
try {
  const r = mod.renderPdcaProgressBar(null, { width: 80 });
  noCrash1 = typeof r === 'string';
} catch { noCrash1 = false; }
assert('PB-013', noCrash1, 'null pdcaStatus does not crash');

// --- PB-014: Undefined pdcaStatus input does not crash ---
let noCrash2 = false;
try {
  const r = mod.renderPdcaProgressBar(undefined, { width: 80 });
  noCrash2 = typeof r === 'string';
} catch { noCrash2 = false; }
assert('PB-014', noCrash2, 'undefined pdcaStatus does not crash');

// --- PB-015: Empty features object does not crash ---
let noCrash3 = false;
try {
  const r = mod.renderPdcaProgressBar({ features: {} }, { width: 80 });
  noCrash3 = typeof r === 'string';
} catch { noCrash3 = false; }
assert('PB-015', noCrash3, 'empty features object does not crash');

console.log(`\n${'='.repeat(50)}`);
console.log(`progress-bar.test.js: ${passed}/${total} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
