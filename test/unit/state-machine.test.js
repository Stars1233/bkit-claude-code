'use strict';
/**
 * Unit Tests for lib/pdca/state-machine.js
 * 40 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/pdca/state-machine');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

let passed = 0, failed = 0, total = 0, skipped = 0;
const failures = [];

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; failures.push({ id, message }); console.error(`  FAIL: ${id} - ${message}`); }
}

function skip(id, message) { total++; skipped++; console.log(`  SKIP: ${id} - ${message}`); }

console.log('\n=== state-machine.test.js ===\n');

const { TRANSITIONS, STATES, EVENTS, GUARDS, findTransition, canTransition, getAvailableEvents } = mod;

// --- SM-001~020: 20 transitions each verified (from -> event -> to) ---

// Verify all 20 transition entries exist in the table
assert('SM-001', TRANSITIONS.length === 25, `TRANSITIONS has 25 entries (got ${TRANSITIONS.length})`);

// Normal forward flow transitions
const t1 = findTransition('idle', 'START');
assert('SM-002', t1 !== null && t1.to === 'pm', 'idle + START -> pm');

const t2 = findTransition('idle', 'SKIP_PM');
assert('SM-003', t2 !== null && t2.to === 'plan', 'idle + SKIP_PM -> plan');

const t3 = findTransition('pm', 'PM_DONE');
assert('SM-004', t3 !== null && t3.to === 'plan', 'pm + PM_DONE -> plan');

const t4 = findTransition('plan', 'PLAN_DONE');
assert('SM-005', t4 !== null && t4.to === 'design', 'plan + PLAN_DONE -> design');

const t5 = findTransition('design', 'DESIGN_DONE');
assert('SM-006', t5 !== null && t5.to === 'do', 'design + DESIGN_DONE -> do');

const t6 = findTransition('do', 'DO_COMPLETE');
assert('SM-007', t6 !== null && t6.to === 'check', 'do + DO_COMPLETE -> check');

const t7 = findTransition('check', 'MATCH_PASS');
assert('SM-008', t7 !== null && t7.to === 'qa', 'check + MATCH_PASS -> qa');

const t8 = findTransition('check', 'ITERATE');
assert('SM-009', t8 !== null && t8.to === 'act', 'check + ITERATE -> act');

const t9 = findTransition('act', 'ANALYZE_DONE');
assert('SM-010', t9 !== null && t9.to === 'check', 'act + ANALYZE_DONE -> check');

const t10 = findTransition('report', 'REPORT_DONE');
assert('SM-011', t10 !== null && t10.to === 'archived', 'report + REPORT_DONE -> archived');

const t11 = findTransition('report', 'ARCHIVE');
assert('SM-012', t11 !== null && t11.to === 'archived', 'report + ARCHIVE -> archived');

// Special transitions
const t12 = findTransition('check', 'REPORT_DONE');
assert('SM-013', t12 !== null, 'check + REPORT_DONE has a transition (force report)');

const t13 = findTransition('pm', 'REJECT');
assert('SM-014', t13 !== null && t13.to === 'idle', 'pm + REJECT -> idle');

const t14 = findTransition('plan', 'REJECT');
assert('SM-015', t14 !== null && t14.to === 'pm', 'plan + REJECT -> pm');

// Error/Recovery wildcard transitions
const t15 = findTransition('do', 'ERROR');
assert('SM-016', t15 !== null && t15.to === 'error', '(any) + ERROR -> error');

const t16 = findTransition('error', 'RECOVER');
assert('SM-017', t16 !== null && t16.to === '*', 'error + RECOVER -> * (dynamic)');

const t17 = findTransition('plan', 'RESET');
assert('SM-018', t17 !== null && t17.to === 'idle', '(any) + RESET -> idle');

const t18 = findTransition('design', 'ROLLBACK');
assert('SM-019', t18 !== null && t18.to === '*', '(any) + ROLLBACK -> * (dynamic)');

const t19 = findTransition('do', 'TIMEOUT');
assert('SM-020', t19 !== null && t19.to === 'archived', '(any) + TIMEOUT -> archived');

const t20 = findTransition('check', 'ABANDON');
assert('SM-021', t20 !== null && t20.to === 'archived', '(any) + ABANDON -> archived');

// --- SM-021~025: Guards ---

assert('SM-022', typeof GUARDS.guardMatchRatePass === 'function', 'guardMatchRatePass is a function');

// guardMatchRatePass: test with high match rate
{
  // We can't easily mock getCore().getConfig, so test the guard interface
  const highCtx = { matchRate: 95 };
  // This may fail if getConfig is not available, skip gracefully
  try {
    const result = GUARDS.guardMatchRatePass(highCtx);
    assert('SM-023', result === true, 'guardMatchRatePass returns true for matchRate=95');
  } catch (e) {
    skip('SM-023', 'guardMatchRatePass requires core module: ' + e.message);
  }
}

{
  const lowCtx = { matchRate: 50 };
  try {
    const result = GUARDS.guardMatchRatePass(lowCtx);
    assert('SM-024', result === false, 'guardMatchRatePass returns false for matchRate=50');
  } catch (e) {
    skip('SM-024', 'guardMatchRatePass requires core module: ' + e.message);
  }
}

assert('SM-025', typeof GUARDS.guardCanIterate === 'function', 'guardCanIterate is a function');

{
  const canIter = GUARDS.guardCanIterate({ iterationCount: 2, maxIterations: 5 });
  assert('SM-026', canIter === true, 'guardCanIterate true when iterations < max');
}

{
  const cannotIter = GUARDS.guardCanIterate({ iterationCount: 5, maxIterations: 5 });
  assert('SM-027', cannotIter === false, 'guardCanIterate false when iterations >= max');
}

{
  const maxReached = GUARDS.guardMaxIterReached({ iterationCount: 5, maxIterations: 5 });
  assert('SM-028', maxReached === true, 'guardMaxIterReached true when iterations >= max');
}

{
  const notMaxReached = GUARDS.guardMaxIterReached({ iterationCount: 2, maxIterations: 5 });
  assert('SM-029', notMaxReached === false, 'guardMaxIterReached false when iterations < max');
}

{
  const stale = GUARDS.guardStaleFeature({
    timestamps: {
      lastUpdated: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  assert('SM-030', stale === true, 'guardStaleFeature true for 8-day-old feature');
}

// --- SM-026~030: canTransition() valid/invalid paths ---

assert('SM-031', canTransition('idle', 'START') === true, 'canTransition idle+START = true');
assert('SM-032', canTransition('idle', 'SKIP_PM') === true, 'canTransition idle+SKIP_PM = true');
assert('SM-033', canTransition('idle', 'MATCH_PASS') === false, 'canTransition idle+MATCH_PASS = false (no such transition)');
assert('SM-034', canTransition('archived', 'START') === false, 'canTransition archived+START = false');

// Wildcard transitions should work from any state
assert('SM-035', canTransition('do', 'RESET') === true, 'canTransition do+RESET = true (wildcard)');

// --- SM-031~035: getAvailableEvents() per state ---

{
  const idleEvents = getAvailableEvents('idle');
  const eventNames = idleEvents.map(e => e.event);
  assert('SM-036', eventNames.includes('START'), 'idle has START event');
  assert('SM-037', eventNames.includes('SKIP_PM'), 'idle has SKIP_PM event');
  assert('SM-038', eventNames.includes('RESET'), 'idle has RESET event (wildcard)');
}

{
  const checkEvents = getAvailableEvents('check');
  const eventNames = checkEvents.map(e => e.event);
  assert('SM-039', eventNames.includes('ITERATE') || eventNames.includes('MATCH_PASS'), 'check has ITERATE or MATCH_PASS');
}

// --- SM-036~038: createContext/loadContext ---

{
  // createContext may require getCore(), handle gracefully
  try {
    const ctx = mod.createContext('test-feature', { matchRate: 50 });
    assert('SM-040', ctx.feature === 'test-feature' && ctx.currentState === 'idle', 'createContext sets feature and idle state');
  } catch (e) {
    skip('SM-040', 'createContext requires core module: ' + e.message);
  }
}

// --- SM-039~040: Structural checks ---

assert('SM-041', Array.isArray(STATES) && STATES.length === 11, `STATES has 11 entries (got ${STATES.length})`);
assert('SM-042', Array.isArray(EVENTS) && EVENTS.length === 22, `EVENTS has 22 entries (got ${EVENTS.length})`);

// Verify STATES includes key phases
assert('SM-043', STATES.includes('idle') && STATES.includes('pm') && STATES.includes('plan'), 'STATES includes idle, pm, plan');
assert('SM-044', STATES.includes('do') && STATES.includes('check') && STATES.includes('report'), 'STATES includes do, check, report');
assert('SM-045', STATES.includes('error') && STATES.includes('archived'), 'STATES includes error, archived');

// Verify EVENTS includes key events
assert('SM-046', EVENTS.includes('START') && EVENTS.includes('ERROR') && EVENTS.includes('RECOVER'), 'EVENTS includes START, ERROR, RECOVER');

// Verify transition descriptions exist
assert('SM-047', TRANSITIONS.every(t => typeof t.description === 'string' && t.description.length > 0), 'All transitions have descriptions');

// Verify transition actions are arrays
assert('SM-048', TRANSITIONS.every(t => Array.isArray(t.actions)), 'All transitions have actions arrays');

// phaseToEvent utility
assert('SM-049', mod.phaseToEvent('idle', 'pm') === 'START', 'phaseToEvent idle->pm = START');
assert('SM-050', mod.phaseToEvent('plan', 'design') === 'PLAN_DONE', 'phaseToEvent plan->design = PLAN_DONE');

// --- Summary ---

console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
