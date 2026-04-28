/**
 * application-pdca-lifecycle.test.js — Unit tests for FR-γ2 pilot.
 *
 * Maps to ADR 0005 + Sprint γ Design §2.3 / §3.2.
 *
 * @module test/unit/application-pdca-lifecycle.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const lifecycle = require('../../lib/application/pdca-lifecycle');
const phases = require('../../lib/application/pdca-lifecycle/phases');
const transitions = require('../../lib/application/pdca-lifecycle/transitions');

// ── 1. PHASES enum surface ───────────────────────────────────────────────
test('PHASES is frozen and contains 9 canonical phases', () => {
  assert.equal(Object.isFrozen(phases.PHASES), true);
  const keys = Object.keys(phases.PHASES);
  assert.equal(keys.length, 9);
  for (const k of ['PM', 'PLAN', 'DESIGN', 'DO', 'CHECK', 'ACT', 'QA', 'REPORT', 'ARCHIVE']) {
    assert.ok(keys.includes(k), `missing phase ${k}`);
  }
});

test('PHASE_ORDER is frozen 9-tuple in canonical order', () => {
  assert.equal(Object.isFrozen(phases.PHASE_ORDER), true);
  assert.deepEqual([...phases.PHASE_ORDER],
    ['pm', 'plan', 'design', 'do', 'check', 'act', 'qa', 'report', 'archive']);
});

test('PHASE_SET supports O(1) membership check', () => {
  assert.equal(phases.PHASE_SET.has('do'), true);
  assert.equal(phases.PHASE_SET.has('not-a-phase'), false);
});

test('isValidPhase: accepts all canonical phase strings', () => {
  for (const p of phases.PHASE_ORDER) {
    assert.equal(phases.isValidPhase(p), true, p);
  }
});

test('isValidPhase: rejects unknown / non-string input', () => {
  assert.equal(phases.isValidPhase('completed'), false); // legacy term
  assert.equal(phases.isValidPhase(''), false);
  assert.equal(phases.isValidPhase(null), false);
  assert.equal(phases.isValidPhase(undefined), false);
  assert.equal(phases.isValidPhase(123), false);
  assert.equal(phases.isValidPhase('PM'), false); // case-sensitive
});

test('phaseIndex: returns canonical index 0..8', () => {
  assert.equal(phases.phaseIndex('pm'), 0);
  assert.equal(phases.phaseIndex('do'), 3);
  assert.equal(phases.phaseIndex('archive'), 8);
  assert.equal(phases.phaseIndex('unknown'), -1);
});

test('nextPhase: forward chain', () => {
  assert.equal(phases.nextPhase('pm'), 'plan');
  assert.equal(phases.nextPhase('do'), 'check');
  assert.equal(phases.nextPhase('report'), 'archive');
});

test('nextPhase: archive has no next', () => {
  assert.equal(phases.nextPhase('archive'), null);
});

test('nextPhase: unknown returns null', () => {
  assert.equal(phases.nextPhase('not-a-phase'), null);
});

// ── 2. transitions.js graph ──────────────────────────────────────────────
test('TRANSITIONS map is frozen and covers all 9 phases', () => {
  assert.equal(Object.isFrozen(transitions.TRANSITIONS), true);
  for (const p of phases.PHASE_ORDER) {
    assert.ok(transitions.TRANSITIONS[p], `phase ${p} missing from TRANSITIONS`);
  }
});

test('TRANSITIONS: each adjacency list is frozen', () => {
  for (const p of phases.PHASE_ORDER) {
    assert.equal(Object.isFrozen(transitions.TRANSITIONS[p]), true, p);
  }
});

test('canTransition: linear forward path is allowed', () => {
  for (let i = 0; i < phases.PHASE_ORDER.length - 1; i++) {
    const from = phases.PHASE_ORDER[i];
    const to = phases.PHASE_ORDER[i + 1];
    const r = transitions.canTransition(from, to);
    assert.equal(r.ok, true, `${from} → ${to} must be allowed`);
  }
});

test('canTransition: act → do (iterate) is allowed', () => {
  assert.equal(transitions.canTransition('act', 'do').ok, true);
});

test('canTransition: any → archive is allowed (abandon path)', () => {
  for (const p of phases.PHASE_ORDER) {
    if (p === 'archive') continue;
    assert.equal(transitions.canTransition(p, 'archive').ok, true,
      `${p} → archive (abandon) must be allowed`);
  }
});

test('canTransition: archive is terminal (no outbound)', () => {
  for (const p of phases.PHASE_ORDER) {
    const r = transitions.canTransition('archive', p);
    if (p === 'archive') {
      assert.equal(r.ok, true, 'idempotent self-transition allowed');
    } else {
      assert.equal(r.ok, false, `archive → ${p} must be blocked`);
      assert.equal(r.reason, 'transition_not_allowed');
    }
  }
});

test('canTransition: invalid from-phase returns invalid_from_phase', () => {
  const r = transitions.canTransition('garbage', 'plan');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'invalid_from_phase');
});

test('canTransition: invalid to-phase returns invalid_to_phase', () => {
  const r = transitions.canTransition('pm', 'garbage');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'invalid_to_phase');
});

test('canTransition: idempotent self-transition returns ok', () => {
  for (const p of phases.PHASE_ORDER) {
    assert.equal(transitions.canTransition(p, p).ok, true);
  }
});

test('canTransition: backward jump (do → plan) is blocked', () => {
  const r = transitions.canTransition('do', 'plan');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'transition_not_allowed');
});

test('legalNextPhases: returns array including archive for all non-archive phases', () => {
  for (const p of phases.PHASE_ORDER) {
    if (p === 'archive') continue;
    const nexts = transitions.legalNextPhases(p);
    assert.ok(Array.isArray(nexts));
    assert.ok(nexts.includes('archive'),
      `${p} must allow → archive`);
  }
});

test('legalNextPhases: invalid phase returns []', () => {
  assert.deepEqual(transitions.legalNextPhases('garbage'), []);
});

// ── 3. Public barrel (index.js) ──────────────────────────────────────────
test('index.js re-exports phases + transitions surface', () => {
  for (const k of ['PHASES', 'PHASE_ORDER', 'PHASE_SET', 'isValidPhase',
                   'phaseIndex', 'nextPhase', 'TRANSITIONS', 'canTransition',
                   'legalNextPhases']) {
    assert.ok(k in lifecycle, `index.js missing export: ${k}`);
  }
});

test('index.js exports are reference-identical to source modules', () => {
  assert.equal(lifecycle.PHASES, phases.PHASES);
  assert.equal(lifecycle.PHASE_ORDER, phases.PHASE_ORDER);
  assert.equal(lifecycle.canTransition, transitions.canTransition);
});

// ── 4. v2.1.10 import path stays untouched (regression guard) ────────────
test('v2.1.10: lib/pdca/lifecycle.js remains independent (no shim yet)', () => {
  const oldLifecycle = require('../../lib/pdca/lifecycle');
  for (const fn of ['initializeFeature', 'archiveFeature', 'detectStaleFeatures',
                    'getFeatureTimeline', 'completeFeature', 'abandonFeature']) {
    assert.equal(typeof oldLifecycle[fn], 'function',
      `legacy lib/pdca/lifecycle.${fn} must still be a function`);
  }
});
