'use strict';
/**
 * Unit Tests for lib/ui/workflow-map.js
 * 10 TC | console.assert based | no external dependencies
 */

process.env.NO_COLOR = '1';

let mod;
try {
  mod = require('../../lib/ui/workflow-map');
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

console.log('\n=== workflow-map.test.js ===\n');

// Sample data
const sampleStatus = {
  primaryFeature: 'auth-feature',
  features: {
    'auth-feature': {
      phase: 'check',
      matchRate: 85,
      iterationCount: 2,
      iterationHistory: [
        { iteration: 1, phase: 'plan', matchRate: 60, completedAt: '2026-01-01' },
        { iteration: 2, phase: 'check', matchRate: 85 },
      ],
    },
  },
};

const sampleAgentState = {
  orchestrationPattern: 'parallel',
  teammates: [
    { name: 'agent-1', status: 'working' },
    { name: 'agent-2', status: 'completed' },
  ],
};

// --- WM-001: renderWorkflowMap returns string ---
const result = mod.renderWorkflowMap(sampleStatus, sampleAgentState, { width: 100 });
assert('WM-001', typeof result === 'string', 'renderWorkflowMap returns string');

// --- WM-002: Result is not empty ---
assert('WM-002', result.length > 0, 'renderWorkflowMap result is not empty');

// --- WM-003: Contains box drawing characters ---
assert('WM-003',
  result.includes('\u250C') && result.includes('\u2514') && result.includes('\u2502'),
  'result contains box drawing characters (corners and vertical)');

// --- WM-004: Shows current phase (CHECK) highlighted with running symbol ---
assert('WM-004', result.includes('CHECK') && result.includes('\u25B6'),
  'shows CHECK phase with running symbol');

// --- WM-005: Completed phases show done symbol ---
assert('WM-005', result.includes('\u2713'),
  'completed phases show checkmark symbol');

// --- WM-006: Pending phases show pending symbol ---
assert('WM-006', result.includes('REPORT') && result.includes('\u00B7'),
  'REPORT phase shown with pending symbol');

// --- WM-007: Conditional branch shows CHECK threshold ---
assert('WM-007', result.includes('REPORT') && result.includes('ACT'),
  'conditional branch shows REPORT and ACT paths');

// --- WM-008: Branch shows threshold percentage ---
assert('WM-008', result.includes('90%'),
  'branch shows 90% threshold');

// --- WM-009: Null pdcaStatus does not crash ---
let noCrash1 = false;
try {
  const r = mod.renderWorkflowMap(null, null, { width: 80 });
  noCrash1 = typeof r === 'string' && r.length > 0;
} catch { noCrash1 = false; }
assert('WM-009', noCrash1, 'null pdcaStatus does not crash, returns fallback string');

// --- WM-010: Null agentState does not crash ---
let noCrash2 = false;
try {
  const r = mod.renderWorkflowMap(sampleStatus, null, { width: 80 });
  noCrash2 = typeof r === 'string' && r.length > 0;
} catch { noCrash2 = false; }
assert('WM-010', noCrash2, 'null agentState does not crash');

console.log(`\n${'='.repeat(50)}`);
console.log(`workflow-map.test.js: ${passed}/${total} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
