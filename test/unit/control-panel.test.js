'use strict';
/**
 * Unit Tests for lib/ui/control-panel.js
 * 10 TC | console.assert based | no external dependencies
 */

process.env.NO_COLOR = '1';

let mod;
try {
  mod = require('../../lib/ui/control-panel');
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

console.log('\n=== control-panel.test.js ===\n');

// Sample control state
const sampleControlState = {
  automationLevel: 2,
  pendingApprovals: [
    { from: 'design', to: 'do', description: 'Design phase complete, proceed to implementation?' },
    { from: 'check', to: 'report', description: 'Match rate 92%, approve report generation?' },
  ],
};

// --- CP-001: renderControlPanel returns string ---
const result = mod.renderControlPanel(sampleControlState, null, { width: 100 });
assert('CP-001', typeof result === 'string', 'renderControlPanel returns string');

// --- CP-002: Result is not empty ---
assert('CP-002', result.length > 0, 'renderControlPanel result is not empty');

// --- CP-003: Contains box drawing characters ---
assert('CP-003',
  result.includes('\u250C') && result.includes('\u2514'),
  'result contains box drawing characters');

// --- CP-004: Automation level slider shows level name ---
assert('CP-004', result.includes('Semi-Auto'),
  'automation level slider shows Semi-Auto for level 2');

// --- CP-005: Slider shows L0 and L4 range ---
assert('CP-005', result.includes('L0') && result.includes('L4'),
  'slider shows L0-L4 range markers');

// --- CP-006: Current level indicator shown ---
assert('CP-006', result.includes('Current: L2'),
  'current level indicator displayed');

// --- CP-007: Pending approvals section displayed ---
assert('CP-007',
  result.includes('Pending Approvals') && result.includes('2'),
  'pending approvals section with count displayed');

// --- CP-008: Approval details shown ---
assert('CP-008',
  result.includes('DESIGN') && result.includes('DO'),
  'approval transition details shown');

// --- CP-009: Emergency stop notice present ---
assert('CP-009',
  result.includes('Emergency stop') && result.includes('/control stop'),
  'emergency stop notice displayed');

// --- CP-010: Null inputs do not crash ---
let noCrash = false;
try {
  const r1 = mod.renderControlPanel(null, null, { width: 80 });
  const r2 = mod.renderControlPanel(null, 0, { width: 80 });
  const r3 = mod.renderControlPanel(undefined, undefined, { width: 80 });
  noCrash = typeof r1 === 'string' && typeof r2 === 'string' && typeof r3 === 'string';
} catch { noCrash = false; }
assert('CP-010', noCrash, 'null/undefined inputs do not crash');

console.log(`\n${'='.repeat(50)}`);
console.log(`control-panel.test.js: ${passed}/${total} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
