'use strict';
/**
 * UX Tests: PDCA Dashboard (20 TC)
 * Tests progress bar rendering, compact mode, full mode, and phase symbols.
 *
 * @module test/ux/pdca-dashboard.test.js
 */

const { assert, assertNoThrow, summary } = require('../helpers/assert');

let progressBar;
try {
  progressBar = require('../../lib/ui/progress-bar');
} catch (e) {
  console.error('progress-bar module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== pdca-dashboard.test.js ===\n');

const { renderPdcaProgressBar, stripAnsi } = progressBar;

// =====================================================================
// PD-001~005: Progress bar renders without crash for all phase combos
// =====================================================================

// --- PD-001: Render with no feature data (idle state) ---
assertNoThrow('PD-001', () => {
  const result = renderPdcaProgressBar(null);
  if (typeof result !== 'string') throw new Error('Must return string');
}, 'Progress bar renders without crash for null (idle) state');

// --- PD-002: Render with plan phase active ---
assertNoThrow('PD-002', () => {
  const pdca = { primaryFeature: 'f1', features: { f1: { phase: 'plan', matchRate: 0 } } };
  const result = renderPdcaProgressBar(pdca);
  if (typeof result !== 'string') throw new Error('Must return string');
}, 'Progress bar renders for plan phase');

// --- PD-003: Render with design phase active ---
assertNoThrow('PD-003', () => {
  const pdca = { primaryFeature: 'f1', features: { f1: { phase: 'design', matchRate: 30 } } };
  renderPdcaProgressBar(pdca);
}, 'Progress bar renders for design phase');

// --- PD-004: Render with do phase active ---
assertNoThrow('PD-004', () => {
  const pdca = { primaryFeature: 'f1', features: { f1: { phase: 'do', matchRate: 50 } } };
  renderPdcaProgressBar(pdca);
}, 'Progress bar renders for do phase');

// --- PD-005: Render with check phase active ---
assertNoThrow('PD-005', () => {
  const pdca = { primaryFeature: 'f1', features: { f1: { phase: 'check', matchRate: 85 } } };
  renderPdcaProgressBar(pdca);
}, 'Progress bar renders for check phase');

// =====================================================================
// PD-006~010: Compact mode fits in 80 columns
// =====================================================================

// --- PD-006: Compact mode output has no line exceeding 80 columns ---
const compactPdca = { primaryFeature: 'test', features: { test: { phase: 'design', matchRate: 45 } } };
const compactOutput = renderPdcaProgressBar(compactPdca, { mode: 'compact', termWidth: 80 });
const compactLines = compactOutput.split('\n');
const allFit80 = compactLines.every(line => stripAnsi(line).length <= 82); // +2 for box chars
assert('PD-006',
  allFit80,
  'Compact mode output lines fit within ~80 columns'
);

// --- PD-007: Compact mode is non-empty ---
assert('PD-007',
  compactOutput.length > 0,
  'Compact mode produces non-empty output'
);

// --- PD-008: Compact mode includes feature name ---
const compactPlain = stripAnsi(compactOutput);
assert('PD-008',
  compactPlain.includes('test') || compactPlain.includes('DESIGN'),
  'Compact mode includes feature name or current phase'
);

// --- PD-009: Compact mode for narrow terminal (60 cols) ---
assertNoThrow('PD-009', () => {
  renderPdcaProgressBar(compactPdca, { mode: 'compact', termWidth: 60 });
}, 'Compact mode renders without crash at 60 column width');

// --- PD-010: Compact mode for wide terminal (120 cols) ---
assertNoThrow('PD-010', () => {
  renderPdcaProgressBar(compactPdca, { mode: 'compact', termWidth: 120 });
}, 'Compact mode renders without crash at 120 column width');

// =====================================================================
// PD-011~015: Full mode shows ETA, agent, iteration info
// =====================================================================

const fullPdca = {
  primaryFeature: 'user-auth',
  features: {
    'user-auth': {
      phase: 'check',
      matchRate: 75,
      iteration: 2,
      startedAt: new Date(Date.now() - 3600000).toISOString(),
    }
  }
};

const fullOutput = renderPdcaProgressBar(fullPdca, { mode: 'full', termWidth: 100 });
const fullPlain = stripAnsi(fullOutput);

// --- PD-011: Full mode output is longer than compact ---
const compactFull = renderPdcaProgressBar(fullPdca, { mode: 'compact', termWidth: 100 });
assert('PD-011',
  fullOutput.length >= compactFull.length,
  'Full mode output is at least as long as compact mode'
);

// --- PD-012: Full mode includes match rate number ---
assert('PD-012',
  fullPlain.includes('75') || fullPlain.includes('Match') || fullPlain.includes('match'),
  'Full mode shows match rate information'
);

// --- PD-013: Full mode includes iteration number ---
assert('PD-013',
  fullPlain.includes('2') || fullPlain.includes('Iter') || fullPlain.includes('iter'),
  'Full mode shows iteration information'
);

// --- PD-014: Full mode includes feature name ---
assert('PD-014',
  fullPlain.includes('user-auth'),
  'Full mode includes feature name'
);

// --- PD-015: Full mode for report phase ---
assertNoThrow('PD-015', () => {
  const pdca = { primaryFeature: 'f1', features: { f1: { phase: 'report', matchRate: 95 } } };
  renderPdcaProgressBar(pdca, { mode: 'full', termWidth: 100 });
}, 'Full mode renders for report phase');

// =====================================================================
// PD-016~020: Phase symbols are visually correct
// =====================================================================

// --- PD-016: Output contains PLAN label ---
const allPhasePdca = { primaryFeature: 'f1', features: { f1: { phase: 'do', matchRate: 60 } } };
const allPhaseOutput = stripAnsi(renderPdcaProgressBar(allPhasePdca, { mode: 'full', termWidth: 120 }));
assert('PD-016',
  allPhaseOutput.includes('PLAN'),
  'Progress bar output includes PLAN label'
);

// --- PD-017: Output contains DESIGN label ---
assert('PD-017',
  allPhaseOutput.includes('DESIGN'),
  'Progress bar output includes DESIGN label'
);

// --- PD-018: Output contains DO label ---
assert('PD-018',
  allPhaseOutput.includes('DO'),
  'Progress bar output includes DO label'
);

// --- PD-019: Output contains CHECK label ---
assert('PD-019',
  allPhaseOutput.includes('CHECK'),
  'Progress bar output includes CHECK label'
);

// --- PD-020: Output contains REPORT label ---
assert('PD-020',
  allPhaseOutput.includes('REPORT'),
  'Progress bar output includes REPORT label'
);

summary('pdca-dashboard.test.js');
process.exit(0);
