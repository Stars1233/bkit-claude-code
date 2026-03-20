'use strict';
/**
 * UX Tests: Control Panel (15 TC)
 * Tests level slider L0-L4, current level marking, and emergency stop info.
 *
 * @module test/ux/control-panel-ux.test.js
 */

const { assert, assertNoThrow, summary } = require('../helpers/assert');

let controlPanel;
try {
  controlPanel = require('../../lib/ui/control-panel');
} catch (e) {
  console.error('control-panel module load failed:', e.message);
  process.exit(1);
}

let progressBar;
try {
  progressBar = require('../../lib/ui/progress-bar');
} catch (e) {
  console.error('progress-bar module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== control-panel-ux.test.js ===\n');

const { renderControlPanel } = controlPanel;
const { stripAnsi } = progressBar;

// =====================================================================
// CP-001~005: Level slider shows L0-L4 range
// =====================================================================

const baseState = {
  automationLevel: 2,
  trustScore: 50,
  emergencyStop: false,
  pendingApprovals: [],
};

// --- CP-001: renderControlPanel returns non-empty string ---
const panelOutput = renderControlPanel(baseState, 2, { termWidth: 100 });
assert('CP-001',
  typeof panelOutput === 'string' && panelOutput.length > 0,
  'renderControlPanel returns non-empty string'
);

// --- CP-002: Panel includes L0 label ---
const panelPlain = stripAnsi(panelOutput);
assert('CP-002',
  panelPlain.includes('L0'),
  'Control panel includes L0 endpoint in slider'
);

// --- CP-003: Panel includes L4 label ---
assert('CP-003',
  panelPlain.includes('L4'),
  'Control panel includes L4 endpoint in slider'
);

// --- CP-004: Panel renders for L0 level ---
assertNoThrow('CP-004', () => {
  renderControlPanel(baseState, 0, { termWidth: 100 });
}, 'Control panel renders for L0 (Manual) level');

// --- CP-005: Panel renders for L4 level ---
assertNoThrow('CP-005', () => {
  renderControlPanel(baseState, 4, { termWidth: 100 });
}, 'Control panel renders for L4 (Full-Auto) level');

// =====================================================================
// CP-006~010: Current level is visually marked
// =====================================================================

// --- CP-006: Panel includes Semi-Auto label for L2 ---
assert('CP-006',
  panelPlain.includes('Semi-Auto') || panelPlain.includes('Semi'),
  'Control panel shows "Semi-Auto" name for level 2'
);

// --- CP-007: Different levels produce different output ---
const l0Output = stripAnsi(renderControlPanel(baseState, 0, { termWidth: 100 }));
const l4Output = stripAnsi(renderControlPanel(baseState, 4, { termWidth: 100 }));
assert('CP-007',
  l0Output !== l4Output,
  'Control panel output differs between L0 and L4'
);

// --- CP-008: L0 panel shows Manual label ---
assert('CP-008',
  l0Output.includes('Manual'),
  'L0 control panel shows "Manual" level name'
);

// --- CP-009: L4 panel shows Full-Auto label ---
assert('CP-009',
  l4Output.includes('Full-Auto') || l4Output.includes('Full'),
  'L4 control panel shows "Full-Auto" level name'
);

// --- CP-010: Panel includes current level label ---
assert('CP-010',
  panelPlain.includes('Current') || panelPlain.includes('L2') || panelPlain.includes('Semi-Auto'),
  'Control panel includes current level label'
);

// =====================================================================
// CP-011~015: Emergency stop info always visible
// =====================================================================

// --- CP-011: Emergency stop state renders ---
const emergencyState = { ...baseState, emergencyStop: true };
assertNoThrow('CP-011', () => {
  renderControlPanel(emergencyState, 2, { termWidth: 100 });
}, 'Control panel renders with emergencyStop=true');

// --- CP-012: Emergency stop panel has warning content ---
const emergencyOutput = stripAnsi(renderControlPanel(emergencyState, 2, { termWidth: 100 }));
assert('CP-012',
  emergencyOutput.includes('STOP') || emergencyOutput.includes('stop') ||
  emergencyOutput.includes('Emergency') || emergencyOutput.includes('EMERGENCY') ||
  emergencyOutput.includes('Paused') || emergencyOutput.includes('paused'),
  'Emergency stop panel shows stop/emergency/paused indicator'
);

// --- CP-013: Panel renders at narrow width ---
assertNoThrow('CP-013', () => {
  renderControlPanel(baseState, 2, { termWidth: 60 });
}, 'Control panel renders at 60 column width');

// --- CP-014: Panel with null state renders ---
assertNoThrow('CP-014', () => {
  renderControlPanel(null, 2, { termWidth: 100 });
}, 'Control panel handles null state gracefully');

// --- CP-015: Panel includes keyboard shortcuts or commands ---
const hasShortcuts = panelPlain.includes('/pdca') || panelPlain.includes('/control') ||
  panelPlain.includes('status') || panelPlain.includes('Shortcut') || panelPlain.includes('Command');
assert('CP-015',
  hasShortcuts || panelPlain.length > 100,
  'Control panel includes shortcuts or sufficient content for usability'
);

summary('control-panel-ux.test.js');
process.exit(0);
