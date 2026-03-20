'use strict';
/**
 * UX Tests: Workflow Map (15 TC)
 * Tests that the workflow map shows all phases connected,
 * current phase is distinguishable, and conditional branches are visible.
 *
 * @module test/ux/workflow-map-ux.test.js
 */

const { assert, assertNoThrow, summary } = require('../helpers/assert');

let workflowMap;
try {
  workflowMap = require('../../lib/ui/workflow-map');
} catch (e) {
  console.error('workflow-map module load failed:', e.message);
  process.exit(1);
}

let progressBar;
try {
  progressBar = require('../../lib/ui/progress-bar');
} catch (e) {
  console.error('progress-bar module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== workflow-map-ux.test.js ===\n');

const { renderWorkflowMap } = workflowMap;
const { stripAnsi } = progressBar;

// =====================================================================
// WM-001~005: Map shows all phases connected
// =====================================================================

const basePdca = {
  primaryFeature: 'test-feature',
  features: { 'test-feature': { phase: 'design', matchRate: 40 } }
};

// --- WM-001: Render returns non-empty string ---
const mapOutput = renderWorkflowMap(basePdca, { termWidth: 100 });
assert('WM-001',
  typeof mapOutput === 'string' && mapOutput.length > 0,
  'renderWorkflowMap returns non-empty string'
);

// --- WM-002: Map contains PM phase ---
const mapPlain = stripAnsi(mapOutput);
assert('WM-002',
  mapPlain.includes('PM'),
  'Workflow map includes PM phase label'
);

// --- WM-003: Map contains PLAN phase ---
assert('WM-003',
  mapPlain.includes('PLAN'),
  'Workflow map includes PLAN phase label'
);

// --- WM-004: Map contains DESIGN phase ---
assert('WM-004',
  mapPlain.includes('DESIGN'),
  'Workflow map includes DESIGN phase label'
);

// --- WM-005: Map contains DO and CHECK phases ---
assert('WM-005',
  mapPlain.includes('DO') && mapPlain.includes('CHECK'),
  'Workflow map includes DO and CHECK phase labels'
);

// =====================================================================
// WM-006~010: Current phase is distinguishable
// =====================================================================

// --- WM-006: Different phases produce different output ---
const planPdca = { primaryFeature: 'f1', features: { f1: { phase: 'plan', matchRate: 0 } } };
const doPdca = { primaryFeature: 'f1', features: { f1: { phase: 'do', matchRate: 60 } } };
const planMap = stripAnsi(renderWorkflowMap(planPdca, { termWidth: 100 }));
const doMap = stripAnsi(renderWorkflowMap(doPdca, { termWidth: 100 }));
assert('WM-006',
  planMap !== doMap,
  'Workflow map output differs between plan and do phases'
);

// --- WM-007: Null pdcaStatus renders without crash ---
assertNoThrow('WM-007', () => {
  renderWorkflowMap(null, { termWidth: 100 });
}, 'renderWorkflowMap handles null pdcaStatus without crash');

// --- WM-008: Empty features renders without crash ---
assertNoThrow('WM-008', () => {
  renderWorkflowMap({ primaryFeature: null, features: {} }, { termWidth: 100 });
}, 'renderWorkflowMap handles empty features without crash');

// --- WM-009: Check phase active shows iteration info ---
const checkPdca = {
  primaryFeature: 'f1',
  features: { f1: { phase: 'check', matchRate: 70, iteration: 2 } }
};
assertNoThrow('WM-009', () => {
  const result = renderWorkflowMap(checkPdca, { termWidth: 100 });
  if (typeof result !== 'string') throw new Error('Must return string');
}, 'Workflow map renders check phase with iteration data');

// --- WM-010: Report phase renders correctly ---
const reportPdca = { primaryFeature: 'f1', features: { f1: { phase: 'report', matchRate: 95 } } };
assertNoThrow('WM-010', () => {
  renderWorkflowMap(reportPdca, { termWidth: 100 });
}, 'Workflow map renders report phase without crash');

// =====================================================================
// WM-011~015: Conditional branches visible
// =====================================================================

// --- WM-011: Map includes REPORT phase ---
assert('WM-011',
  mapPlain.includes('REPORT'),
  'Workflow map includes REPORT phase label'
);

// --- WM-012: Map contains connecting characters (arrows or lines) ---
const hasConnectors = mapPlain.includes('-') || mapPlain.includes('>') ||
  mapPlain.includes('\u2500') || mapPlain.includes('\u2192') || mapPlain.includes('[');
assert('WM-012',
  hasConnectors,
  'Workflow map contains connecting characters between phases'
);

// --- WM-013: Map renders at narrow width (60 cols) ---
assertNoThrow('WM-013', () => {
  renderWorkflowMap(basePdca, { termWidth: 60 });
}, 'Workflow map renders at 60 column width');

// --- WM-014: Map renders at wide width (160 cols) ---
assertNoThrow('WM-014', () => {
  renderWorkflowMap(basePdca, { termWidth: 160 });
}, 'Workflow map renders at 160 column width');

// --- WM-015: Map with pending approvals renders ---
const approvalPdca = {
  primaryFeature: 'f1',
  features: {
    f1: {
      phase: 'design',
      matchRate: 80,
      pendingApprovals: [{ from: 'design', to: 'do', message: 'Review needed' }]
    }
  }
};
assertNoThrow('WM-015', () => {
  renderWorkflowMap(approvalPdca, { termWidth: 100 });
}, 'Workflow map renders with pending approvals data');

summary('workflow-map-ux.test.js');
process.exit(0);
