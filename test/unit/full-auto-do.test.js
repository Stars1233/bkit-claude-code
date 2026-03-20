#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for lib/pdca/full-auto-do.js
 * 15 TC | parseDesignForTasks, generateImplementationPlan,
 *         checkFullAutoAvailability, evaluateCompletion, edge cases
 *
 * @version bkit v1.6.2
 */

const path = require('path');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

console.log('\n=== full-auto-do.test.js (15 TC) ===\n');

// Load module
let fad;
try {
  fad = require('../../lib/pdca/full-auto-do');
} catch (e) {
  fad = null;
}

const moduleLoaded = fad !== null;

// ============================================================
// Section 1: parseDesignForTasks (FA-001 ~ FA-005)
// ============================================================
console.log('\n--- Section 1: parseDesignForTasks ---');

// FA-001: Module exports parseDesignForTasks function
{
  assert('FA-001', fad && typeof fad.parseDesignForTasks === 'function',
    'full-auto-do exports parseDesignForTasks');
}

// FA-002: parseDesignForTasks returns object with tasks array
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fad.parseDesignForTasks('nonexistent-feature-fa002');
    } catch (e) { result = null; }
    assert('FA-002', result && Array.isArray(result.tasks) && typeof result.totalFiles === 'number',
      'parseDesignForTasks returns {tasks: [], totalFiles: number}');
  } else {
    skip('FA-002', 'Module not loaded');
  }
}

// FA-003: parseDesignForTasks returns empty tasks for nonexistent feature
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fad.parseDesignForTasks('nonexistent-feature-fa003');
    } catch (e) { result = null; }
    assert('FA-003', result && result.tasks.length === 0 && result.totalFiles === 0,
      'parseDesignForTasks returns empty for nonexistent feature');
  } else {
    skip('FA-003', 'Module not loaded');
  }
}

// FA-004: parseDesignForTasks result includes estimatedLOC field
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fad.parseDesignForTasks('nonexistent-feature-fa004');
    } catch (e) { result = null; }
    assert('FA-004', result && typeof result.estimatedLOC === 'number',
      'parseDesignForTasks includes estimatedLOC field');
  } else {
    skip('FA-004', 'Module not loaded');
  }
}

// FA-005: evaluateCompletion with empty tasks
{
  if (moduleLoaded) {
    const result = fad.evaluateCompletion([]);
    assert('FA-005', result && result.complete === false && result.completionRate === 0,
      'evaluateCompletion returns incomplete for empty tasks');
  } else {
    skip('FA-005', 'Module not loaded');
  }
}

// ============================================================
// Section 2: generateImplementationPlan (FA-006 ~ FA-009)
// ============================================================
console.log('\n--- Section 2: generateImplementationPlan ---');

// FA-006: generateImplementationPlan with empty tasks
{
  if (moduleLoaded) {
    const result = fad.generateImplementationPlan([]);
    assert('FA-006',
      result && result.plan === 'No tasks to implement' && result.agents.length === 0,
      'generateImplementationPlan returns empty plan for no tasks');
  } else {
    skip('FA-006', 'Module not loaded');
  }
}

// FA-007: generateImplementationPlan with tasks returns plan with agents
{
  if (moduleLoaded) {
    const tasks = [
      { id: 'task-001', type: 'create', filePath: 'src/a.js', description: 'Create A', dependsOn: [], priority: 3, status: 'pending' },
      { id: 'task-002', type: 'create', filePath: 'src/b.js', description: 'Create B', dependsOn: [], priority: 3, status: 'pending' },
    ];
    const result = fad.generateImplementationPlan(tasks);
    assert('FA-007',
      result && result.agents.length > 0 && result.plan.includes('Implementation Plan'),
      'generateImplementationPlan creates plan with agents for tasks');
  } else {
    skip('FA-007', 'Module not loaded');
  }
}

// FA-008: generateImplementationPlan returns estimatedTime
{
  if (moduleLoaded) {
    const tasks = [
      { id: 'task-001', type: 'create', filePath: 'src/a.js', description: 'Create A', dependsOn: [], priority: 3, status: 'pending' },
    ];
    const result = fad.generateImplementationPlan(tasks);
    assert('FA-008',
      result && typeof result.estimatedTime === 'string' && result.estimatedTime.length > 0,
      'generateImplementationPlan returns estimatedTime string');
  } else {
    skip('FA-008', 'Module not loaded');
  }
}

// FA-009: generateImplementationPlan separates independent and dependent tasks
{
  if (moduleLoaded) {
    const tasks = [
      { id: 'task-001', type: 'create', filePath: 'src/a.js', description: 'A', dependsOn: [], priority: 3, status: 'pending' },
      { id: 'task-002', type: 'create', filePath: 'test/a.test.js', description: 'Test A', dependsOn: ['task-001'], priority: 10, status: 'pending' },
    ];
    const result = fad.generateImplementationPlan(tasks);
    assert('FA-009',
      result && result.plan.includes('Independent: 1') && result.plan.includes('Dependent: 1'),
      'generateImplementationPlan correctly counts independent and dependent tasks');
  } else {
    skip('FA-009', 'Module not loaded');
  }
}

// ============================================================
// Section 3: checkFullAutoAvailability (FA-010 ~ FA-012)
// ============================================================
console.log('\n--- Section 3: checkFullAutoAvailability ---');

// FA-010: checkFullAutoAvailability returns object with required fields
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fad.checkFullAutoAvailability('nonexistent-feature-fa010');
    } catch (e) { result = null; }
    assert('FA-010',
      result && typeof result.available === 'boolean' && typeof result.reason === 'string' && Array.isArray(result.requirements),
      'checkFullAutoAvailability returns {available, reason, requirements}');
  } else {
    skip('FA-010', 'Module not loaded');
  }
}

// FA-011: checkFullAutoAvailability not available for nonexistent feature
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fad.checkFullAutoAvailability('nonexistent-feature-fa011');
    } catch (e) { result = null; }
    assert('FA-011',
      result && result.available === false,
      'checkFullAutoAvailability returns not available for missing feature');
  } else {
    skip('FA-011', 'Module not loaded');
  }
}

// FA-012: checkFullAutoAvailability lists requirements
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fad.checkFullAutoAvailability('nonexistent-feature-fa012');
    } catch (e) { result = null; }
    assert('FA-012',
      result && result.requirements.length >= 2,
      'checkFullAutoAvailability lists at least 2 requirements');
  } else {
    skip('FA-012', 'Module not loaded');
  }
}

// ============================================================
// Section 4: Edge Cases (FA-013 ~ FA-015)
// ============================================================
console.log('\n--- Section 4: Edge Cases ---');

// FA-013: evaluateCompletion with all completed tasks
{
  if (moduleLoaded) {
    const tasks = [
      { id: 'task-001', status: 'completed', filePath: 'a.js' },
      { id: 'task-002', status: 'completed', filePath: 'b.js' },
    ];
    const result = fad.evaluateCompletion(tasks);
    assert('FA-013',
      result && result.complete === true && result.completionRate === 100 && result.completedCount === 2,
      'evaluateCompletion returns complete=true for all completed tasks');
  } else {
    skip('FA-013', 'Module not loaded');
  }
}

// FA-014: evaluateCompletion with mixed statuses
{
  if (moduleLoaded) {
    const tasks = [
      { id: 'task-001', status: 'completed', filePath: 'a.js' },
      { id: 'task-002', status: 'failed', filePath: 'b.js' },
      { id: 'task-003', status: 'pending', filePath: 'c.js' },
    ];
    const result = fad.evaluateCompletion(tasks);
    assert('FA-014',
      result && result.complete === false && result.completionRate === 33 && result.issues.length > 0,
      'evaluateCompletion handles mixed statuses correctly');
  } else {
    skip('FA-014', 'Module not loaded');
  }
}

// FA-015: evaluateCompletion with null input
{
  if (moduleLoaded) {
    const result = fad.evaluateCompletion(null);
    assert('FA-015',
      result && result.complete === false && result.completionRate === 0,
      'evaluateCompletion handles null input');
  } else {
    skip('FA-015', 'Module not loaded');
  }
}

// ============================================================
// Summary
// ============================================================
const result = summary('full-auto-do.test.js');
module.exports = result;
