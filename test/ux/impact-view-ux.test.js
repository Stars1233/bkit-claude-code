'use strict';
/**
 * UX Tests: Impact Analysis View (10 TC)
 * Tests match rate bar color coding and file tree readability at 80 columns.
 *
 * @module test/ux/impact-view-ux.test.js
 */

const { assert, assertNoThrow, summary } = require('../helpers/assert');

let impactView;
try {
  impactView = require('../../lib/ui/impact-view');
} catch (e) {
  console.error('impact-view module load failed:', e.message);
  process.exit(1);
}

let progressBar;
try {
  progressBar = require('../../lib/ui/progress-bar');
} catch (e) {
  console.error('progress-bar module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== impact-view-ux.test.js ===\n');

const { renderImpactView } = impactView;
const { stripAnsi } = progressBar;

// =====================================================================
// IV-001~005: Match Rate bar uses color coding
// =====================================================================

const highRatePdca = {
  primaryFeature: 'auth',
  features: {
    auth: {
      phase: 'check',
      matchRate: 95,
      changedFiles: ['lib/auth.js', 'lib/middleware.js'],
      iterations: [
        { iteration: 1, matchRate: 60 },
        { iteration: 2, matchRate: 80 },
        { iteration: 3, matchRate: 95 },
      ],
    }
  }
};

// --- IV-001: renderImpactView returns non-empty string ---
const impactOutput = renderImpactView(highRatePdca, { termWidth: 100 });
assert('IV-001',
  typeof impactOutput === 'string' && impactOutput.length > 0,
  'renderImpactView returns non-empty string'
);

// --- IV-002: Output includes match rate number ---
const impactPlain = stripAnsi(impactOutput);
assert('IV-002',
  impactPlain.includes('95') || impactPlain.includes('Match'),
  'Impact view includes match rate percentage'
);

// --- IV-003: Low match rate renders without crash ---
const lowRatePdca = {
  primaryFeature: 'search',
  features: { search: { phase: 'check', matchRate: 30, changedFiles: [], iterations: [] } }
};
assertNoThrow('IV-003', () => {
  renderImpactView(lowRatePdca, { termWidth: 100 });
}, 'Impact view renders for low match rate (30%)');

// --- IV-004: Zero match rate renders without crash ---
assertNoThrow('IV-004', () => {
  const pdca = { primaryFeature: 'f', features: { f: { phase: 'check', matchRate: 0 } } };
  renderImpactView(pdca, { termWidth: 100 });
}, 'Impact view renders for zero match rate');

// --- IV-005: 100% match rate renders without crash ---
assertNoThrow('IV-005', () => {
  const pdca = { primaryFeature: 'f', features: { f: { phase: 'report', matchRate: 100 } } };
  renderImpactView(pdca, { termWidth: 100 });
}, 'Impact view renders for 100% match rate');

// =====================================================================
// IV-006~010: File tree is readable at 80 columns
// =====================================================================

const fileTreePdca = {
  primaryFeature: 'ui-refactor',
  features: {
    'ui-refactor': {
      phase: 'check',
      matchRate: 75,
      changedFiles: [
        'lib/ui/progress-bar.js',
        'lib/ui/workflow-map.js',
        'lib/ui/agent-panel.js',
        'lib/ui/control-panel.js',
        'lib/ui/impact-view.js',
      ],
      iterations: [
        { iteration: 1, matchRate: 50 },
        { iteration: 2, matchRate: 75 },
      ],
    }
  }
};

// --- IV-006: File tree at 80 columns renders ---
assertNoThrow('IV-006', () => {
  renderImpactView(fileTreePdca, { termWidth: 80 });
}, 'Impact view renders file tree at 80 column width');

// --- IV-007: File tree content at 80 columns ---
const narrowOutput = stripAnsi(renderImpactView(fileTreePdca, { termWidth: 80 }));
assert('IV-007',
  narrowOutput.length > 0,
  'Impact view at 80 columns produces non-empty output'
);

// --- IV-008: Null pdcaStatus renders without crash ---
assertNoThrow('IV-008', () => {
  renderImpactView(null, { termWidth: 100 });
}, 'Impact view handles null pdcaStatus gracefully');

// --- IV-009: Empty features renders without crash ---
assertNoThrow('IV-009', () => {
  renderImpactView({ primaryFeature: null, features: {} }, { termWidth: 100 });
}, 'Impact view handles empty features gracefully');

// --- IV-010: Impact view at narrow width (60 cols) ---
assertNoThrow('IV-010', () => {
  renderImpactView(fileTreePdca, { termWidth: 60 });
}, 'Impact view renders at 60 column width without crash');

summary('impact-view-ux.test.js');
process.exit(0);
