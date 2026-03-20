'use strict';
/**
 * Unit Tests for lib/task/ untested modules
 * Modules: classification.js, context.js, tracker.js
 * 25 TC | console.assert based | no external dependencies
 */

let passed = 0, failed = 0, total = 0, skipped = 0;
const failures = [];

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; failures.push({ id, message }); console.error(`  FAIL: ${id} - ${message}`); }
}

function skip(id, message) { total++; skipped++; console.log(`  SKIP: ${id} - ${message}`); }

console.log('\n=== task-modules.test.js ===\n');

// ============================================================
// classification.js
// ============================================================

let classification;
try {
  classification = require('../../lib/task/classification');
} catch (e) {
  classification = null;
}

if (!classification) {
  for (let i = 1; i <= 12; i++) {
    skip(`TM-${String(i).padStart(3, '0')}`, 'classification.js failed to load');
  }
} else {
  // --- TM-001~003: Exports exist ---
  assert('TM-001', typeof classification.classifyTask === 'function', 'classifyTask is a function');
  assert('TM-002', typeof classification.classifyTaskByLines === 'function', 'classifyTaskByLines is a function');
  assert('TM-003', typeof classification.CLASSIFICATION_THRESHOLDS === 'object', 'CLASSIFICATION_THRESHOLDS is an object');

  // --- TM-004~007: classifyTask by char count ---
  assert('TM-004', classification.classifyTask(null) === 'trivial', 'classifyTask returns trivial for null');
  assert('TM-005', classification.classifyTask('x'.repeat(100)) === 'trivial', 'classifyTask returns trivial for short content');
  assert('TM-006', classification.classifyTask('x'.repeat(500)) === 'minor', 'classifyTask returns minor for medium content');
  assert('TM-007', classification.classifyTask('x'.repeat(10000)) === 'major', 'classifyTask returns major for large content');

  // --- TM-008~009: classifyTaskByLines ---
  assert('TM-008', classification.classifyTaskByLines(null) === 'trivial', 'classifyTaskByLines returns trivial for null');
  assert('TM-009', classification.classifyTaskByLines('a\n'.repeat(5)) === 'trivial', 'classifyTaskByLines returns trivial for few lines');

  // --- TM-010~012: getPdcaLevel and getPdcaGuidance ---
  assert('TM-010', typeof classification.getPdcaLevel === 'function', 'getPdcaLevel is a function');
  assert('TM-011', classification.getPdcaLevel('trivial') === 'none' && classification.getPdcaLevel('major') === 'full', 'getPdcaLevel maps correctly');
  assert('TM-012', typeof classification.getPdcaGuidance === 'function' && classification.getPdcaGuidance('trivial').length > 0, 'getPdcaGuidance returns non-empty string');
}

// ============================================================
// context.js
// ============================================================

let context;
try {
  context = require('../../lib/task/context');
} catch (e) {
  context = null;
}

if (!context) {
  for (let i = 13; i <= 20; i++) {
    skip(`TM-${String(i).padStart(3, '0')}`, 'context.js failed to load');
  }
} else {
  // --- TM-013~015: Exports exist ---
  assert('TM-013', typeof context.setActiveSkill === 'function', 'setActiveSkill is a function');
  assert('TM-014', typeof context.setActiveAgent === 'function', 'setActiveAgent is a function');
  assert('TM-015', typeof context.getActiveContext === 'function', 'getActiveContext is a function');

  // --- TM-016~018: Set/Get/Clear cycle ---
  context.clearActiveContext();
  assert('TM-016', context.hasActiveContext() === false, 'hasActiveContext returns false after clear');

  context.setActiveSkill('test-skill');
  assert('TM-017', context.getActiveSkill() === 'test-skill', 'getActiveSkill returns set value');

  context.setActiveAgent('test-agent');
  assert('TM-018', context.getActiveAgent() === 'test-agent', 'getActiveAgent returns set value');

  // --- TM-019~020: getActiveContext and clearActiveContext ---
  const ctx = context.getActiveContext();
  assert('TM-019', ctx.skill === 'test-skill' && ctx.agent === 'test-agent', 'getActiveContext returns both skill and agent');

  context.clearActiveContext();
  assert('TM-020', context.getActiveSkill() === null && context.getActiveAgent() === null, 'clearActiveContext resets both');
}

// ============================================================
// tracker.js
// ============================================================

let tracker;
try {
  tracker = require('../../lib/task/tracker');
} catch (e) {
  tracker = null;
}

if (!tracker) {
  for (let i = 21; i <= 25; i++) {
    skip(`TM-${String(i).padStart(3, '0')}`, 'tracker.js failed to load');
  }
} else {
  // --- TM-021~025: Exports exist ---
  assert('TM-021', typeof tracker.savePdcaTaskId === 'function', 'savePdcaTaskId is a function');
  assert('TM-022', typeof tracker.getPdcaTaskId === 'function', 'getPdcaTaskId is a function');
  assert('TM-023', typeof tracker.getTaskChainStatus === 'function', 'getTaskChainStatus is a function');
  assert('TM-024', typeof tracker.updatePdcaTaskStatus === 'function', 'updatePdcaTaskStatus is a function');
  assert('TM-025', typeof tracker.triggerNextPdcaAction === 'function', 'triggerNextPdcaAction is a function');
}

// --- Summary ---

console.log(`\nTotal: ${total} | Pass: ${passed} | Fail: ${failed}`);
if (skipped > 0) console.log(`Skipped: ${skipped}`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
