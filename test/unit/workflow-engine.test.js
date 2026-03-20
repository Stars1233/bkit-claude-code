#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for lib/pdca/workflow-engine.js
 * 20 TC | Condition evaluator, executeWorkflow, advanceWorkflow, selectWorkflow
 *
 * @version bkit v1.6.2
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { assert, skip, assertThrows, assertNoThrow, summary, reset } = require('../helpers/assert');
reset();

const BASE_DIR = path.resolve(__dirname, '../..');

console.log('\n=== workflow-engine.test.js (20 TC) ===\n');

// Load module
let we;
try {
  we = require('../../lib/pdca/workflow-engine');
} catch (e) {
  we = null;
}

// ============================================================
// Section 1: Safe Condition Evaluator (WE-001 ~ WE-005)
// ============================================================
console.log('\n--- Section 1: Condition Evaluator ---');

// WE-001: Equality operator ==
{
  const result = we ? we.evaluateCondition('matchRate == 90', { matchRate: 90 }) : null;
  assert('WE-001', result === true, 'evaluateCondition handles == operator');
}

// WE-002: Inequality operator !=
{
  const result = we ? we.evaluateCondition('status != "done"', { status: 'running' }) : null;
  assert('WE-002', result === true, 'evaluateCondition handles != operator');
}

// WE-003: Greater-than-or-equal >=
{
  const result = we ? we.evaluateCondition('matchRate >= 80', { matchRate: 85 }) : null;
  assert('WE-003', result === true, 'evaluateCondition handles >= operator');
}

// WE-004: Less-than-or-equal <=
{
  const result = we ? we.evaluateCondition('count <= 5', { count: 3 }) : null;
  assert('WE-004', result === true, 'evaluateCondition handles <= operator');
}

// WE-005: Logical AND (&&) and OR (||)
{
  const andResult = we ? we.evaluateCondition('a >= 1 && b >= 2', { a: 1, b: 2 }) : null;
  const orResult = we ? we.evaluateCondition('a == 0 || b == 2', { a: 1, b: 2 }) : null;
  assert('WE-005', andResult === true && orResult === true,
    'evaluateCondition handles && and || operators');
}

// ============================================================
// Section 2: executeWorkflow (WE-006 ~ WE-010)
// ============================================================
console.log('\n--- Section 2: executeWorkflow ---');

// Prepare a tmp dir for workflow state persistence
const tmpDir = path.join(os.tmpdir(), `bkit-we-test-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });
const origCwd = process.cwd();
process.chdir(tmpDir);

const sampleWorkflow = {
  id: 'test-wf',
  name: 'Test Workflow',
  version: '1.0',
  description: 'Test',
  steps: {
    start: { phase: 'idle', type: 'sequential', next: 'plan' },
    plan: { phase: 'plan', type: 'sequential', next: 'design' },
    design: { phase: 'design', type: 'sequential', next: 'do' },
    do: { phase: 'do', type: 'sequential' },
  },
  defaults: { matchRateThreshold: 90, maxIterations: 5, automationLevel: 'semi-auto' },
};

// WE-006: executeWorkflow returns execution object
{
  let exec = null;
  try { exec = we ? we.executeWorkflow(sampleWorkflow, 'feat-001') : null; } catch (e) { exec = null; }
  assert('WE-006', exec && exec.workflowId === 'test-wf' && exec.feature === 'feat-001',
    'executeWorkflow returns execution with correct workflowId and feature');
}

// WE-007: executeWorkflow starts at first step
{
  let exec = null;
  try { exec = we ? we.executeWorkflow(sampleWorkflow, 'feat-002') : null; } catch (e) { exec = null; }
  assert('WE-007', exec && exec.currentStep === 'start',
    'executeWorkflow starts at "start" step');
}

// WE-008: executeWorkflow status is running
{
  let exec = null;
  try { exec = we ? we.executeWorkflow(sampleWorkflow, 'feat-003') : null; } catch (e) { exec = null; }
  assert('WE-008', exec && exec.status === 'running',
    'executeWorkflow sets status to running');
}

// WE-009: executeWorkflow applies default context
{
  let exec = null;
  try { exec = we ? we.executeWorkflow(sampleWorkflow, 'feat-004') : null; } catch (e) { exec = null; }
  assert('WE-009', exec && exec.context && exec.context.matchRateThreshold === 90,
    'executeWorkflow applies defaults to context');
}

// WE-010: executeWorkflow throws on invalid definition
{
  let threw = false;
  try { we && we.executeWorkflow({}, 'feat-005'); } catch (e) { threw = true; }
  assert('WE-010', threw, 'executeWorkflow throws on invalid workflow definition');
}

// ============================================================
// Section 3: advanceWorkflow (WE-011 ~ WE-015)
// ============================================================
console.log('\n--- Section 3: advanceWorkflow ---');

// WE-011: advanceWorkflow moves to next step
{
  let exec = null;
  try { exec = we ? we.executeWorkflow(sampleWorkflow, 'feat-adv-1') : null; } catch (e) {}
  let result = null;
  try { result = we && exec ? we.advanceWorkflow(exec, sampleWorkflow) : null; } catch (e) {}
  assert('WE-011', result && result.nextPhase === 'plan' && result.action === 'advance',
    'advanceWorkflow advances to next step');
}

// WE-012: advanceWorkflow marks previous step as completed
{
  let exec = null;
  try { exec = we ? we.executeWorkflow(sampleWorkflow, 'feat-adv-2') : null; } catch (e) {}
  try { we && exec && we.advanceWorkflow(exec, sampleWorkflow); } catch (e) {}
  assert('WE-012', exec && exec.completedSteps.includes('start'),
    'advanceWorkflow adds previous step to completedSteps');
}

// WE-013: advanceWorkflow completes at final step
{
  let exec = null;
  try { exec = we ? we.executeWorkflow(sampleWorkflow, 'feat-adv-3') : null; } catch (e) {}
  try {
    we && exec && we.advanceWorkflow(exec, sampleWorkflow); // start -> plan
    we && exec && we.advanceWorkflow(exec, sampleWorkflow); // plan -> design
    we && exec && we.advanceWorkflow(exec, sampleWorkflow); // design -> do
  } catch (e) {}
  let result = null;
  try { result = we && exec ? we.advanceWorkflow(exec, sampleWorkflow) : null; } catch (e) {}
  assert('WE-013', result && result.completed === true && result.action === 'complete',
    'advanceWorkflow returns completed=true at final step');
}

// WE-014: advanceWorkflow returns none for non-running execution
{
  const stopped = { status: 'completed', currentStep: 'do' };
  const result = we ? we.advanceWorkflow(stopped, sampleWorkflow) : null;
  assert('WE-014', result && result.action === 'none',
    'advanceWorkflow returns action=none for non-running execution');
}

// WE-015: advanceWorkflow handles conditional branching
{
  const condWorkflow = {
    id: 'cond-wf', name: 'Cond', version: '1.0', description: 'Cond test',
    steps: {
      start: {
        phase: 'check', type: 'sequential',
        conditions: [
          { condition: 'matchRate >= 90', next: 'done' },
        ],
        next: 'redo',
      },
      done: { phase: 'report', type: 'sequential' },
      redo: { phase: 'do', type: 'sequential' },
    },
    defaults: {},
  };
  let exec = null;
  try { exec = we ? we.executeWorkflow(condWorkflow, 'feat-cond', { matchRate: 95 }) : null; } catch (e) {}
  let result = null;
  try { result = we && exec ? we.advanceWorkflow(exec, condWorkflow) : null; } catch (e) {}
  assert('WE-015', result && result.nextPhase === 'report',
    'advanceWorkflow follows conditional branch when condition is true');
}

// ============================================================
// Section 4: selectWorkflow (WE-016 ~ WE-020)
// ============================================================
console.log('\n--- Section 4: selectWorkflow ---');

// WE-016: selectWorkflow returns null when no workflows exist
{
  const emptyDir = path.join(tmpDir, 'empty-project');
  fs.mkdirSync(emptyDir, { recursive: true });
  const result = we ? we.selectWorkflow('my-feat', undefined, emptyDir) : undefined;
  assert('WE-016', result === null,
    'selectWorkflow returns null with no workflow files');
}

// WE-017: selectWorkflow detects hotfix prefix
{
  // Create a hotfix workflow
  const wfDir = path.join(tmpDir, 'hotfix-proj', 'lib/pdca/workflows');
  fs.mkdirSync(wfDir, { recursive: true });
  const hotfixWf = {
    id: 'hotfix', name: 'Hotfix Workflow', version: '1.0', description: 'hotfix',
    steps: { start: { phase: 'do', type: 'sequential' } },
    defaults: {},
  };
  fs.writeFileSync(path.join(wfDir, 'hotfix.workflow.json'), JSON.stringify(hotfixWf));
  const result = we ? we.selectWorkflow('hotfix-urgent-bug', undefined, path.join(tmpDir, 'hotfix-proj')) : null;
  assert('WE-017', result && result.id === 'hotfix',
    'selectWorkflow selects hotfix workflow for hotfix- prefixed features');
}

// WE-018: selectWorkflow detects fix- prefix
{
  const result = we ? we.selectWorkflow('fix-crash-issue', undefined, path.join(tmpDir, 'hotfix-proj')) : null;
  assert('WE-018', result && result.id === 'hotfix',
    'selectWorkflow selects hotfix workflow for fix- prefixed features');
}

// WE-019: selectWorkflow selects enterprise for Enterprise level
{
  const wfDir = path.join(tmpDir, 'ent-proj', 'lib/pdca/workflows');
  fs.mkdirSync(wfDir, { recursive: true });
  const entWf = {
    id: 'enterprise', name: 'Enterprise Workflow', version: '1.0', description: 'ent',
    steps: { start: { phase: 'pm', type: 'sequential' } },
    defaults: {},
  };
  fs.writeFileSync(path.join(wfDir, 'enterprise.workflow.json'), JSON.stringify(entWf));
  const result = we ? we.selectWorkflow('big-feature', 'Enterprise', path.join(tmpDir, 'ent-proj')) : null;
  assert('WE-019', result && result.id === 'enterprise',
    'selectWorkflow selects enterprise workflow for Enterprise level');
}

// WE-020: selectWorkflow falls back to default
{
  const wfDir = path.join(tmpDir, 'def-proj', 'lib/pdca/workflows');
  fs.mkdirSync(wfDir, { recursive: true });
  const defWf = {
    id: 'default', name: 'Default Workflow', version: '1.0', description: 'default',
    steps: { start: { phase: 'idle', type: 'sequential' } },
    defaults: {},
  };
  fs.writeFileSync(path.join(wfDir, 'default.workflow.json'), JSON.stringify(defWf));
  const result = we ? we.selectWorkflow('normal-feature', undefined, path.join(tmpDir, 'def-proj')) : null;
  assert('WE-020', result && result.id === 'default',
    'selectWorkflow falls back to default workflow');
}

// Restore cwd and cleanup
process.chdir(origCwd);
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

// ============================================================
// Summary
// ============================================================
const result = summary('workflow-engine.test.js');
module.exports = result;
