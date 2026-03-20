#!/usr/bin/env node
/**
 * v2.0.0 Dashboard Integration Test
 * @module test/integration/v200-dashboard
 * @version 2.0.0
 *
 * Verifies SessionStart dashboard integration.
 * Tests UI module exports, rendering with mock data, and null/undefined handling.
 * 25 TC: VD-001 ~ VD-025
 */

const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

let passed = 0;
let failed = 0;
const results = [];

function assert(id, condition, description) {
  if (condition) {
    passed++;
    results.push({ id, status: 'PASS', description });
  } else {
    failed++;
    results.push({ id, status: 'FAIL', description });
    console.assert(false, `${id}: ${description}`);
  }
}

// ============================================================
// Section 1: lib/ui/ modules export their render functions (VD-001~005)
// ============================================================

let progressBar, workflowMap, controlPanel, impactView, agentPanel;

try { progressBar = require(path.join(PROJECT_ROOT, 'lib/ui/progress-bar')); } catch (_) {}
try { workflowMap = require(path.join(PROJECT_ROOT, 'lib/ui/workflow-map')); } catch (_) {}
try { controlPanel = require(path.join(PROJECT_ROOT, 'lib/ui/control-panel')); } catch (_) {}
try { impactView = require(path.join(PROJECT_ROOT, 'lib/ui/impact-view')); } catch (_) {}
try { agentPanel = require(path.join(PROJECT_ROOT, 'lib/ui/agent-panel')); } catch (_) {}

// VD-001: progress-bar exports renderPdcaProgressBar
assert('VD-001',
  progressBar && typeof progressBar.renderPdcaProgressBar === 'function',
  'lib/ui/progress-bar exports renderPdcaProgressBar function'
);

// VD-002: workflow-map exports renderWorkflowMap
assert('VD-002',
  workflowMap && typeof workflowMap.renderWorkflowMap === 'function',
  'lib/ui/workflow-map exports renderWorkflowMap function'
);

// VD-003: control-panel exports renderControlPanel
assert('VD-003',
  controlPanel && typeof controlPanel.renderControlPanel === 'function',
  'lib/ui/control-panel exports renderControlPanel function'
);

// VD-004: impact-view exports renderImpactView
assert('VD-004',
  impactView && typeof impactView.renderImpactView === 'function',
  'lib/ui/impact-view exports renderImpactView function'
);

// VD-005: agent-panel exports renderAgentPanel
assert('VD-005',
  agentPanel && typeof agentPanel.renderAgentPanel === 'function',
  'lib/ui/agent-panel exports renderAgentPanel function'
);

// ============================================================
// Section 2: progress-bar renders with mock PDCA status (VD-006~010)
// ============================================================

const mockPdcaStatus = {
  primaryFeature: 'test-feature',
  features: {
    'test-feature': {
      phase: 'do',
      matchRate: 75,
      iteration: 2,
      phases: {
        pm: 'completed', plan: 'completed', design: 'completed',
        do: 'running', check: 'pending', report: 'pending'
      }
    }
  }
};

let progressBarOutput = null;
try {
  progressBarOutput = progressBar.renderPdcaProgressBar(mockPdcaStatus, { compact: false });
} catch (_) {}

// VD-006: renderPdcaProgressBar returns a string
assert('VD-006',
  typeof progressBarOutput === 'string',
  'renderPdcaProgressBar returns a string with mock PDCA status'
);

// VD-007: progress bar output contains feature name
assert('VD-007',
  typeof progressBarOutput === 'string' && progressBarOutput.includes('test-feature'),
  'progress bar output contains feature name'
);

// VD-008: progress bar output contains phase indicators
assert('VD-008',
  typeof progressBarOutput === 'string' && /(?:PLAN|DESIGN|DO|CHECK)/.test(progressBarOutput),
  'progress bar output contains phase indicators'
);

// VD-009: renderPdcaProgressBar compact mode returns a string
let compactOutput = null;
try {
  compactOutput = progressBar.renderPdcaProgressBar(mockPdcaStatus, { compact: true });
} catch (_) {}
assert('VD-009',
  typeof compactOutput === 'string',
  'renderPdcaProgressBar compact mode returns a string'
);

// VD-010: compact output is shorter than full output
assert('VD-010',
  typeof compactOutput === 'string' && typeof progressBarOutput === 'string' &&
  compactOutput.length <= progressBarOutput.length,
  'compact output is shorter than or equal to full output'
);

// ============================================================
// Section 3: workflow-map renders with mock state (VD-011~015)
// ============================================================

const mockAgentState = {
  activeAgent: 'gap-detector',
  teammates: ['cto-lead', 'qa-monitor'],
  orchestration: 'swarm'
};

let workflowMapOutput = null;
try {
  workflowMapOutput = workflowMap.renderWorkflowMap(mockPdcaStatus, mockAgentState, {
    feature: 'test-feature',
    showIteration: true,
    showBranch: true
  });
} catch (_) {}

// VD-011: renderWorkflowMap returns a string
assert('VD-011',
  typeof workflowMapOutput === 'string',
  'renderWorkflowMap returns a string with mock data'
);

// VD-012: workflow map output contains phase labels
assert('VD-012',
  typeof workflowMapOutput === 'string' && /(?:PLAN|DESIGN|DO|CHECK|REPORT)/.test(workflowMapOutput),
  'workflow map output contains phase labels'
);

// VD-013: workflow map output contains feature reference
assert('VD-013',
  typeof workflowMapOutput === 'string' && workflowMapOutput.includes('test-feature'),
  'workflow map output contains feature name'
);

// VD-014: renderWorkflowMap with minimal options returns a string
let minimalMapOutput = null;
try {
  minimalMapOutput = workflowMap.renderWorkflowMap(mockPdcaStatus, null, {
    feature: 'test-feature'
  });
} catch (_) {}
assert('VD-014',
  typeof minimalMapOutput === 'string',
  'renderWorkflowMap with minimal options returns a string'
);

// VD-015: workflow map handles missing agent state gracefully
assert('VD-015',
  typeof minimalMapOutput === 'string' && minimalMapOutput.length > 0,
  'workflow map renders even when agent state is null'
);

// ============================================================
// Section 4: control-panel renders with mock control state (VD-016~020)
// ============================================================

const mockControlState = {
  automationLevel: 2,
  trustScore: 0.8,
  pendingApprovals: [],
  emergencyStop: false
};

let controlPanelOutput = null;
try {
  controlPanelOutput = controlPanel.renderControlPanel(mockControlState, null, {
    showShortcuts: false,
    showApprovals: true
  });
} catch (_) {}

// VD-016: renderControlPanel returns a string
assert('VD-016',
  typeof controlPanelOutput === 'string',
  'renderControlPanel returns a string with mock control state'
);

// VD-017: control panel output contains automation level
assert('VD-017',
  typeof controlPanelOutput === 'string' && /(?:Semi-Auto|Level|automation|L\d)/i.test(controlPanelOutput),
  'control panel output contains automation level indicator'
);

// VD-018: control panel output is non-empty
assert('VD-018',
  typeof controlPanelOutput === 'string' && controlPanelOutput.length > 10,
  'control panel output has meaningful content'
);

// VD-019: renderControlPanel with showShortcuts=true works
let shortcutsOutput = null;
try {
  shortcutsOutput = controlPanel.renderControlPanel(mockControlState, null, {
    showShortcuts: true,
    showApprovals: true
  });
} catch (_) {}
assert('VD-019',
  typeof shortcutsOutput === 'string',
  'renderControlPanel with showShortcuts=true returns a string'
);

// VD-020: control panel with shortcuts may include shortcut indicators
assert('VD-020',
  typeof shortcutsOutput === 'string' && shortcutsOutput.length >= controlPanelOutput.length,
  'control panel with shortcuts is equal or longer than without'
);

// ============================================================
// Section 5: All UI modules handle null/undefined inputs (VD-021~025)
// ============================================================

// VD-021: renderPdcaProgressBar handles null input
let nullProgressResult = null;
let nullProgressNoError = true;
try {
  nullProgressResult = progressBar.renderPdcaProgressBar(null, {});
} catch (_) { nullProgressNoError = false; }
assert('VD-021',
  nullProgressNoError,
  'renderPdcaProgressBar handles null input without throwing'
);

// VD-022: renderWorkflowMap handles null input
let nullMapNoError = true;
try {
  workflowMap.renderWorkflowMap(null, null, {});
} catch (_) { nullMapNoError = false; }
assert('VD-022',
  nullMapNoError,
  'renderWorkflowMap handles null input without throwing'
);

// VD-023: renderControlPanel handles null input
let nullPanelNoError = true;
try {
  controlPanel.renderControlPanel(null, null, {});
} catch (_) { nullPanelNoError = false; }
assert('VD-023',
  nullPanelNoError,
  'renderControlPanel handles null input without throwing'
);

// VD-024: renderImpactView handles null input
let nullImpactNoError = true;
try {
  impactView.renderImpactView(null, {});
} catch (_) { nullImpactNoError = false; }
assert('VD-024',
  nullImpactNoError,
  'renderImpactView handles null input without throwing'
);

// VD-025: renderAgentPanel handles null input
let nullAgentNoError = true;
try {
  agentPanel.renderAgentPanel(null, {});
} catch (_) { nullAgentNoError = false; }
assert('VD-025',
  nullAgentNoError,
  'renderAgentPanel handles null input without throwing'
);

// ============================================================
// Summary
// ============================================================
console.log('\n========================================');
console.log('v2.0.0 Dashboard Integration Test Results');
console.log('========================================');
console.log(`Total: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
console.log(`Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log('----------------------------------------');
results.forEach(r => {
  console.log(`  ${r.status === 'PASS' ? '[PASS]' : '[FAIL]'} ${r.id}: ${r.description}`);
});
console.log('========================================\n');

module.exports = { passed, failed, total: passed + failed, results };
if (failed > 0) process.exit(1);
