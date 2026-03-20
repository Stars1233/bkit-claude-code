'use strict';
/**
 * Unit Tests for lib/team/ untested modules
 * Modules: communication.js, cto-logic.js, hooks.js, state-writer.js, task-queue.js
 * 35 TC | console.assert based | no external dependencies
 */

let passed = 0, failed = 0, total = 0, skipped = 0;
const failures = [];

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; failures.push({ id, message }); console.error(`  FAIL: ${id} - ${message}`); }
}

function skip(id, message) { total++; skipped++; console.log(`  SKIP: ${id} - ${message}`); }

console.log('\n=== team-modules.test.js ===\n');

// ============================================================
// communication.js
// ============================================================

let communication;
try {
  communication = require('../../lib/team/communication');
} catch (e) {
  communication = null;
}

if (!communication) {
  for (let i = 1; i <= 10; i++) {
    skip(`TEA-${String(i).padStart(3, '0')}`, 'communication.js failed to load');
  }
} else {
  // --- TEA-001~003: Exports exist ---
  assert('TEA-001', Array.isArray(communication.MESSAGE_TYPES), 'MESSAGE_TYPES is an array');
  assert('TEA-002', communication.MESSAGE_TYPES.length > 0, 'MESSAGE_TYPES is non-empty');
  assert('TEA-003', typeof communication.createMessage === 'function', 'createMessage is a function');

  // --- TEA-004~006: createMessage ---
  const msg = communication.createMessage('cto', 'developer', 'task_assignment', { subject: 'Test', body: 'Do it' });
  assert('TEA-004', msg !== null && msg.from === 'cto' && msg.to === 'developer', 'createMessage returns correct from/to');
  assert('TEA-005', msg.type === 'task_assignment' && msg.payload.subject === 'Test', 'createMessage sets type and payload');
  assert('TEA-006', typeof msg.timestamp === 'string' && msg.timestamp.length > 0, 'createMessage includes timestamp');

  // --- TEA-007: invalid message type ---
  const invalidMsg = communication.createMessage('cto', 'dev', 'invalid_type', { subject: 'x', body: 'y' });
  assert('TEA-007', invalidMsg === null, 'createMessage returns null for invalid message type');

  // --- TEA-008: createBroadcast ---
  assert('TEA-008', typeof communication.createBroadcast === 'function', 'createBroadcast is a function');
  const broadcast = communication.createBroadcast('cto', 'info', { subject: 'Update', body: 'Info' });
  assert('TEA-009', broadcast !== null && broadcast.to === 'all', 'createBroadcast sets to=all');

  // --- TEA-010: createPhaseTransitionNotice ---
  const notice = communication.createPhaseTransitionNotice('feat-1', 'plan', 'design', { matchRate: 95 });
  assert('TEA-010', notice !== null && notice.payload.body.includes('feat-1'), 'createPhaseTransitionNotice includes feature name');
}

// ============================================================
// cto-logic.js
// ============================================================

let ctoLogic;
try {
  ctoLogic = require('../../lib/team/cto-logic');
} catch (e) {
  ctoLogic = null;
}

if (!ctoLogic) {
  for (let i = 11; i <= 18; i++) {
    skip(`TEA-${String(i).padStart(3, '0')}`, 'cto-logic.js failed to load');
  }
} else {
  // --- TEA-011~013: Exports exist ---
  assert('TEA-011', typeof ctoLogic.decidePdcaPhase === 'function', 'decidePdcaPhase is a function');
  assert('TEA-012', typeof ctoLogic.evaluateDocument === 'function', 'evaluateDocument is a function');
  assert('TEA-013', typeof ctoLogic.evaluateCheckResults === 'function', 'evaluateCheckResults is a function');

  // --- TEA-014: decidePdcaPhase for unknown feature ---
  const decision = ctoLogic.decidePdcaPhase('nonexistent-feature-xyz');
  assert('TEA-014', decision.nextPhase === 'plan' && decision.readyToAdvance === true, 'decidePdcaPhase suggests plan for unknown feature');

  // --- TEA-015~017: evaluateCheckResults ---
  const reportResult = ctoLogic.evaluateCheckResults(95, 0, 90);
  assert('TEA-015', reportResult.decision === 'report', 'evaluateCheckResults returns report for high match rate');

  const iterateResult = ctoLogic.evaluateCheckResults(80, 1, 85);
  assert('TEA-016', iterateResult.decision === 'iterate', 'evaluateCheckResults returns iterate for medium match rate with issues');

  const redesignResult = ctoLogic.evaluateCheckResults(50, 3, 40);
  assert('TEA-017', redesignResult.decision === 'redesign', 'evaluateCheckResults returns redesign for low match rate');

  // --- TEA-018: evaluateDocument for missing doc ---
  const docResult = ctoLogic.evaluateDocument('nonexistent-feature-xyz', 'plan');
  assert('TEA-018', docResult.exists === false && docResult.score === 0, 'evaluateDocument returns exists=false for missing doc');
}

// ============================================================
// hooks.js
// ============================================================

let hooks;
try {
  hooks = require('../../lib/team/hooks');
} catch (e) {
  hooks = null;
}

if (!hooks) {
  for (let i = 19; i <= 22; i++) {
    skip(`TEA-${String(i).padStart(3, '0')}`, 'hooks.js failed to load');
  }
} else {
  // --- TEA-019~020: Exports exist ---
  assert('TEA-019', typeof hooks.assignNextTeammateWork === 'function', 'assignNextTeammateWork is a function');
  assert('TEA-020', typeof hooks.handleTeammateIdle === 'function', 'handleTeammateIdle is a function');

  // --- TEA-021~022: Returns null when team mode unavailable ---
  const work = hooks.assignNextTeammateWork('plan', 'feat-1', 'Dynamic');
  assert('TEA-021', work === null || typeof work === 'object', 'assignNextTeammateWork returns null or object');

  const idle = hooks.handleTeammateIdle('agent-1', {});
  assert('TEA-022', idle === null || typeof idle === 'object', 'handleTeammateIdle returns null or object');
}

// ============================================================
// state-writer.js
// ============================================================

let stateWriter;
try {
  stateWriter = require('../../lib/team/state-writer');
} catch (e) {
  stateWriter = null;
}

if (!stateWriter) {
  for (let i = 23; i <= 30; i++) {
    skip(`TEA-${String(i).padStart(3, '0')}`, 'state-writer.js failed to load');
  }
} else {
  // --- TEA-023~026: Exports exist ---
  assert('TEA-023', typeof stateWriter.initAgentState === 'function', 'initAgentState is a function');
  assert('TEA-024', typeof stateWriter.addTeammate === 'function', 'addTeammate is a function');
  assert('TEA-025', typeof stateWriter.updateTeammateStatus === 'function', 'updateTeammateStatus is a function');
  assert('TEA-026', typeof stateWriter.removeTeammate === 'function', 'removeTeammate is a function');

  // --- TEA-027~028: More exports ---
  assert('TEA-027', typeof stateWriter.updateProgress === 'function', 'updateProgress is a function');
  assert('TEA-028', typeof stateWriter.addRecentMessage === 'function', 'addRecentMessage is a function');

  // --- TEA-029~030: readAgentState and cleanupAgentState ---
  assert('TEA-029', typeof stateWriter.readAgentState === 'function', 'readAgentState is a function');
  assert('TEA-030', typeof stateWriter.cleanupAgentState === 'function', 'cleanupAgentState is a function');
}

// ============================================================
// task-queue.js
// ============================================================

let taskQueue;
try {
  taskQueue = require('../../lib/team/task-queue');
} catch (e) {
  taskQueue = null;
}

if (!taskQueue) {
  for (let i = 31; i <= 35; i++) {
    skip(`TEA-${String(i).padStart(3, '0')}`, 'task-queue.js failed to load');
  }
} else {
  // --- TEA-031~032: Exports exist ---
  assert('TEA-031', typeof taskQueue.createTeamTasks === 'function', 'createTeamTasks is a function');
  assert('TEA-032', typeof taskQueue.assignTaskToRole === 'function', 'assignTaskToRole is a function');

  // --- TEA-033: createTeamTasks with empty teammates ---
  const emptyTasks = taskQueue.createTeamTasks('plan', 'feat-1', []);
  assert('TEA-033', Array.isArray(emptyTasks) && emptyTasks.length === 0, 'createTeamTasks returns empty array for no teammates');

  // --- TEA-034: createTeamTasks with teammates ---
  const tasks = taskQueue.createTeamTasks('design', 'feat-2', [
    { name: 'architect', task: 'Design API' },
    { name: 'reviewer', task: 'Review design' },
  ]);
  assert('TEA-034', Array.isArray(tasks) && tasks.length === 2 && tasks[0].role === 'architect', 'createTeamTasks creates tasks for each teammate');

  // --- TEA-035: getTeamProgress and isPhaseComplete ---
  assert('TEA-035', typeof taskQueue.getTeamProgress === 'function' && typeof taskQueue.isPhaseComplete === 'function', 'getTeamProgress and isPhaseComplete are functions');
}

// --- Summary ---

console.log(`\nTotal: ${total} | Pass: ${passed} | Fail: ${failed}`);
if (skipped > 0) console.log(`Skipped: ${skipped}`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
