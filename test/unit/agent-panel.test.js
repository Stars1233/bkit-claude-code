'use strict';
/**
 * Unit Tests for lib/ui/agent-panel.js
 * 10 TC | console.assert based | no external dependencies
 */

process.env.NO_COLOR = '1';

let mod;
try {
  mod = require('../../lib/ui/agent-panel');
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

console.log('\n=== agent-panel.test.js ===\n');

// Sample agent state
const sampleAgentState = {
  enabled: true,
  teamName: 'CTO Team',
  orchestrationPattern: 'parallel',
  teammates: [
    { name: 'spawning-agent', status: 'spawning', currentTask: 'initializing' },
    { name: 'working-agent', status: 'working', currentTask: 'analyzing code' },
    { name: 'idle-agent', status: 'idle', currentTask: '' },
    { name: 'done-agent', status: 'completed', currentTask: 'report written' },
    { name: 'fail-agent', status: 'failed', currentTask: 'error occurred' },
  ],
  recentMessages: [
    { from: 'agent-1', to: 'leader', content: 'Phase complete', timestamp: new Date().toISOString() },
    { from: 'leader', to: 'agent-2', content: 'Start next task', timestamp: new Date().toISOString() },
  ],
  progress: {
    totalTasks: 5,
    inProgressTasks: 1,
    completedTasks: 1,
    failedTasks: 1,
    pendingTasks: 2,
  },
};

// --- AP-001: renderAgentPanel returns string ---
const result = mod.renderAgentPanel(sampleAgentState, { width: 100 });
assert('AP-001', typeof result === 'string', 'renderAgentPanel returns string');

// --- AP-002: Result is not empty ---
assert('AP-002', result.length > 0, 'renderAgentPanel result is not empty');

// --- AP-003: Contains box drawing characters ---
assert('AP-003',
  result.includes('\u250C') && result.includes('\u2514'),
  'result contains box drawing characters');

// --- AP-004: Spawning icon displayed (circle) ---
assert('AP-004', result.includes('\u25CB'),
  'spawning status shows circle icon');

// --- AP-005: Working/running icon displayed (play triangle) ---
assert('AP-005', result.includes('\u25B6'),
  'working status shows play icon');

// --- AP-006: Completed icon displayed (checkmark) ---
assert('AP-006', result.includes('\u2713'),
  'completed status shows checkmark icon');

// --- AP-007: Recent messages section displayed ---
assert('AP-007', result.includes('Recent Communications'),
  'recent messages section header displayed');

// --- AP-008: Message content shown ---
assert('AP-008', result.includes('Phase complete') || result.includes('Start next task'),
  'message content is displayed');

// --- AP-009: Empty teammates handled ---
let noCrashEmpty = false;
try {
  const r = mod.renderAgentPanel({ enabled: true, teammates: [], orchestrationPattern: 'leader' }, { width: 80 });
  noCrashEmpty = typeof r === 'string' && r.includes('No teammates');
} catch { noCrashEmpty = false; }
assert('AP-009', noCrashEmpty, 'empty teammates array shows "No teammates" message');

// --- AP-010: Null agentState handled (inactive fallback) ---
let noCrashNull = false;
try {
  const r = mod.renderAgentPanel(null, { width: 80 });
  noCrashNull = typeof r === 'string' && r.includes('inactive');
} catch { noCrashNull = false; }
assert('AP-010', noCrashNull, 'null agentState shows inactive fallback message');

console.log(`\n${'='.repeat(50)}`);
console.log(`agent-panel.test.js: ${passed}/${total} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
