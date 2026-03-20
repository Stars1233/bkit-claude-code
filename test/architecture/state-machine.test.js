#!/usr/bin/env node
/**
 * State Machine Architecture Test
 * @module test/architecture/state-machine
 * @version 2.0.0
 *
 * Verifies structural properties of the PDCA state machine:
 * - Every state has at least one outgoing transition
 * - No unreachable states
 * - No deadlock cycles (except terminal 'completed'/archived)
 * - All events are handled in at least one state
 * 25 TC: AS-001 ~ AS-025
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

const sm = require(path.join(PROJECT_ROOT, 'lib/pdca/state-machine'));

const { STATES, EVENTS, TRANSITIONS, GUARDS, ACTIONS } = sm;

// ============================================================
// Section 1: Every state has at least one outgoing transition (AS-001~010)
// ============================================================

// Build outgoing map: state -> set of events
const outgoing = {};
for (const s of STATES) { outgoing[s] = new Set(); }

for (const t of TRANSITIONS) {
  if (t.from === '*') {
    // Wildcard applies to all states
    for (const s of STATES) { outgoing[s].add(t.event); }
  } else {
    if (outgoing[t.from]) outgoing[t.from].add(t.event);
  }
}

// AS-001: 'idle' has outgoing transitions
assert('AS-001', outgoing.idle.size > 0, 'idle has outgoing transitions');

// AS-002: 'pm' has outgoing transitions
assert('AS-002', outgoing.pm.size > 0, 'pm has outgoing transitions');

// AS-003: 'plan' has outgoing transitions
assert('AS-003', outgoing.plan.size > 0, 'plan has outgoing transitions');

// AS-004: 'design' has outgoing transitions
assert('AS-004', outgoing.design.size > 0, 'design has outgoing transitions');

// AS-005: 'do' has outgoing transitions
assert('AS-005', outgoing.do.size > 0, 'do has outgoing transitions');

// AS-006: 'check' has outgoing transitions
assert('AS-006', outgoing.check.size > 0, 'check has outgoing transitions');

// AS-007: 'act' has outgoing transitions
assert('AS-007', outgoing.act.size > 0, 'act has outgoing transitions');

// AS-008: 'report' has outgoing transitions
assert('AS-008', outgoing.report.size > 0, 'report has outgoing transitions');

// AS-009: 'archived' has outgoing transitions (at least wildcards)
assert('AS-009', outgoing.archived.size > 0, 'archived has outgoing transitions (wildcards)');

// AS-010: 'error' has outgoing transitions
assert('AS-010', outgoing.error.size > 0, 'error has outgoing transitions');

// ============================================================
// Section 2: No unreachable states (AS-011~015)
// ============================================================

// Build reachable set from 'idle' via BFS
const reachable = new Set(['idle']);
const queue = ['idle'];

while (queue.length > 0) {
  const current = queue.shift();
  for (const t of TRANSITIONS) {
    if (t.from === current || t.from === '*') {
      const target = t.to === '*' ? null : t.to;
      if (target && !reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
}

// AS-011: All STATES are reachable from idle (excluding wildcard dynamic targets)
const nonWildcardStates = STATES.filter(s => s !== 'idle');
const allReachable = nonWildcardStates.every(s => reachable.has(s));
assert('AS-011',
  allReachable,
  `All states reachable from idle (reachable: ${[...reachable].join(',')})`
);

// AS-012: 'pm' reachable
assert('AS-012', reachable.has('pm'), 'pm is reachable from idle');

// AS-013: 'design' reachable
assert('AS-013', reachable.has('design'), 'design is reachable');

// AS-014: 'report' reachable
assert('AS-014', reachable.has('report'), 'report is reachable');

// AS-015: 'error' reachable
assert('AS-015', reachable.has('error'), 'error is reachable');

// ============================================================
// Section 3: No deadlock cycles except terminal (AS-016~020)
// ============================================================

// A state is a deadlock if it has no outgoing transitions except to itself.
// Terminal states: 'archived' (by design). 'error' has RECOVER.

// AS-016: 'archived' can only be left via wildcards (RESET, ERROR, etc.)
const archivedExits = TRANSITIONS.filter(t =>
  (t.from === 'archived' || t.from === '*') && t.to !== 'archived'
);
assert('AS-016',
  archivedExits.length > 0,
  'archived can be exited via wildcard transitions'
);

// AS-017: 'error' has RECOVER transition to exit
const errorExits = TRANSITIONS.filter(t =>
  (t.from === 'error' && t.event === 'RECOVER')
);
assert('AS-017',
  errorExits.length > 0,
  'error state has RECOVER transition'
);

// AS-018: check->act->check loop has termination (maxIterations)
const iterateTransition = TRANSITIONS.find(t => t.from === 'check' && t.event === 'ITERATE');
assert('AS-018',
  iterateTransition && iterateTransition.guard === 'guardCanIterate',
  'check->act ITERATE has guardCanIterate preventing infinite loop'
);

// AS-019: check has forced report path when max iterations reached
const forceReport = TRANSITIONS.find(t =>
  t.from === 'check' && t.event === 'REPORT_DONE' && t.guard === 'guardMaxIterReached'
);
assert('AS-019',
  forceReport !== null && forceReport !== undefined,
  'check has forced REPORT_DONE path via guardMaxIterReached'
);

// AS-020: No state has ONLY self-loop transitions (deadlock detection)
const deadlockedStates = STATES.filter(state => {
  const exits = TRANSITIONS.filter(t =>
    (t.from === state || t.from === '*') && (t.to !== state || t.to === '*')
  );
  return exits.length === 0;
});
assert('AS-020',
  deadlockedStates.length === 0,
  `No deadlocked states found (checked: ${STATES.join(',')})`
);

// ============================================================
// Section 4: All events are handled in at least one state (AS-021~025)
// ============================================================

// Build event->handler map
const handledEvents = new Set();
for (const t of TRANSITIONS) {
  handledEvents.add(t.event);
}

// AS-021: All EVENTS are handled
const allHandled = EVENTS.every(e => handledEvents.has(e));
assert('AS-021',
  allHandled,
  `All ${EVENTS.length} events have at least one transition handler`
);

// AS-022: START event is handled
assert('AS-022', handledEvents.has('START'), 'START event has a handler');

// AS-023: ERROR event is handled (wildcard)
assert('AS-023', handledEvents.has('ERROR'), 'ERROR event has a handler');

// AS-024: All guards reference valid functions
const allGuards = TRANSITIONS.filter(t => t.guard).map(t => t.guard);
const uniqueGuards = [...new Set(allGuards)];
const allGuardsExist = uniqueGuards.every(g => typeof GUARDS[g] === 'function');
assert('AS-024',
  allGuardsExist,
  `All ${uniqueGuards.length} guard functions exist in GUARDS registry`
);

// AS-025: All actions reference valid functions
const allActions = TRANSITIONS.flatMap(t => t.actions);
const uniqueActions = [...new Set(allActions)];
const allActionsExist = uniqueActions.every(a => typeof ACTIONS[a] === 'function');
assert('AS-025',
  allActionsExist,
  `All ${uniqueActions.length} action functions exist in ACTIONS registry`
);

// ============================================================
// Summary
// ============================================================
console.log('\n========================================');
console.log('State Machine Architecture Test Results');
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
