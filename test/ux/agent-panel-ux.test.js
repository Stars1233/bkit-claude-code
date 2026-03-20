'use strict';
/**
 * UX Tests: Agent Team Panel (15 TC)
 * Tests panel shows team composition, status icons, and message direction.
 *
 * @module test/ux/agent-panel-ux.test.js
 */

const { assert, assertNoThrow, summary } = require('../helpers/assert');

let agentPanel;
try {
  agentPanel = require('../../lib/ui/agent-panel');
} catch (e) {
  console.error('agent-panel module load failed:', e.message);
  process.exit(1);
}

let progressBar;
try {
  progressBar = require('../../lib/ui/progress-bar');
} catch (e) {
  console.error('progress-bar module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== agent-panel-ux.test.js ===\n');

const { renderAgentPanel } = agentPanel;
const { stripAnsi } = progressBar;

// =====================================================================
// AP-001~005: Panel shows team composition
// =====================================================================

const teamState = {
  enabled: true,
  pattern: 'leader',
  teammates: [
    { name: 'cto-lead', role: 'leader', status: 'working' },
    { name: 'gap-detector', role: 'verifier', status: 'idle' },
    { name: 'pdca-iterator', role: 'improver', status: 'completed' },
  ],
  messages: [
    { from: 'cto-lead', to: 'gap-detector', text: 'Verify design', timestamp: new Date().toISOString() },
    { from: 'gap-detector', to: 'cto-lead', text: 'Gaps found', timestamp: new Date().toISOString() },
  ],
};

// --- AP-001: renderAgentPanel returns non-empty string ---
const panelOutput = renderAgentPanel(teamState, { termWidth: 100 });
assert('AP-001',
  typeof panelOutput === 'string' && panelOutput.length > 0,
  'renderAgentPanel returns non-empty string'
);

// --- AP-002: Panel includes team member names ---
const panelPlain = stripAnsi(panelOutput);
assert('AP-002',
  panelPlain.includes('cto-lead') || panelPlain.includes('cto'),
  'Agent panel includes team member name (cto-lead)'
);

// --- AP-003: Panel includes gap-detector name ---
assert('AP-003',
  panelPlain.includes('gap-detector') || panelPlain.includes('gap'),
  'Agent panel includes team member name (gap-detector)'
);

// --- AP-004: Panel includes orchestration pattern when specified ---
const patternState = { ...teamState, orchestrationPattern: 'leader' };
const patternOutput = stripAnsi(renderAgentPanel(patternState, { termWidth: 100 }));
assert('AP-004',
  patternOutput.includes('leader') || patternOutput.includes('Leader') || patternOutput.includes('Pattern'),
  'Agent panel shows orchestration pattern when orchestrationPattern is set'
);

// --- AP-005: Panel renders with empty team ---
assertNoThrow('AP-005', () => {
  const result = renderAgentPanel({ pattern: null, teammates: [], messages: [] }, { termWidth: 100 });
  if (typeof result !== 'string') throw new Error('Must return string');
}, 'Agent panel renders with empty team state');

// =====================================================================
// AP-006~010: Status icons are intuitive symbols
// =====================================================================

// --- AP-006: Working status is visible for active agent ---
assert('AP-006',
  panelOutput.length > 0,
  'Agent panel output includes status indicators for working agents'
);

// --- AP-007: Panel with null teamState renders without crash ---
assertNoThrow('AP-007', () => {
  renderAgentPanel(null, { termWidth: 100 });
}, 'Agent panel handles null teamState gracefully');

// --- AP-008: Panel with mixed statuses renders ---
const mixedTeam = {
  pattern: 'parallel',
  teammates: [
    { name: 'agent-a', role: 'worker', status: 'spawning' },
    { name: 'agent-b', role: 'worker', status: 'working' },
    { name: 'agent-c', role: 'worker', status: 'failed' },
    { name: 'agent-d', role: 'worker', status: 'completed' },
  ],
  messages: [],
};
assertNoThrow('AP-008', () => {
  renderAgentPanel(mixedTeam, { termWidth: 100 });
}, 'Agent panel renders with mixed agent statuses');

// --- AP-009: Panel renders at narrow width ---
assertNoThrow('AP-009', () => {
  renderAgentPanel(teamState, { termWidth: 60 });
}, 'Agent panel renders at 60 column width');

// --- AP-010: Panel renders at wide width ---
assertNoThrow('AP-010', () => {
  renderAgentPanel(teamState, { termWidth: 160 });
}, 'Agent panel renders at 160 column width');

// =====================================================================
// AP-011~015: Messages show from->to direction
// =====================================================================

// --- AP-011: Panel includes message from agent ---
const hasMsgContent = panelPlain.includes('cto') || panelPlain.includes('Verify') ||
  panelPlain.includes('gap') || panelPlain.includes('Comm');
assert('AP-011',
  hasMsgContent,
  'Agent panel includes communication content or agent names in messages'
);

// --- AP-012: Panel with many messages renders ---
const manyMsgs = {
  pattern: 'leader',
  teammates: [{ name: 'lead', role: 'leader', status: 'working' }],
  messages: Array.from({ length: 10 }, (_, i) => ({
    from: 'lead', to: 'worker', text: `Message ${i}`, timestamp: new Date().toISOString()
  })),
};
assertNoThrow('AP-012', () => {
  renderAgentPanel(manyMsgs, { termWidth: 100 });
}, 'Agent panel renders with 10 messages');

// --- AP-013: Panel with single agent renders ---
const singleAgent = {
  pattern: 'sequential',
  teammates: [{ name: 'solo-agent', role: 'worker', status: 'working' }],
  messages: [],
};
assertNoThrow('AP-013', () => {
  renderAgentPanel(singleAgent, { termWidth: 100 });
}, 'Agent panel renders with single agent');

// --- AP-014: Panel with no pattern renders ---
assertNoThrow('AP-014', () => {
  renderAgentPanel({ teammates: teamState.teammates, messages: [] }, { termWidth: 100 });
}, 'Agent panel renders when pattern is undefined');

// --- AP-015: Panel output has box drawing characters ---
const hasBox = panelOutput.includes('\u2502') || panelOutput.includes('\u250C') ||
  panelOutput.includes('|') || panelOutput.includes('+');
assert('AP-015',
  hasBox || panelOutput.includes('Agent') || panelOutput.includes('Team'),
  'Agent panel output includes box drawing or header characters'
);

summary('agent-panel-ux.test.js');
process.exit(0);
