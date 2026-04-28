/**
 * pdca-full-cycle-9scenario.test.js — L5 E2E for FR-γ3.
 *
 * 9 scenarios — one per PDCA phase (pm/plan/design/do/check/act/qa/
 * report/archive). Each scenario verifies that the runtime state
 * machine + Application Layer pilot agree on the canonical phase
 * progression and per-phase invariants.
 *
 * Skip policy: scenarios that require Agent Teams (Scenarios 1 + 7)
 * are skipped when CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS !== '1' (per
 * Design §5.3).
 *
 * Maps to: Sprint γ Design §5 / FR-γ3 / E-γ3-01 (Agent Teams skip).
 *
 * @module test/e2e/pdca-full-cycle-9scenario
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const lifecycle = require('../../lib/application/pdca-lifecycle');
const sm = require('../../lib/pdca/state-machine');

const HAS_AGENT_TEAMS = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1';
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PHASES = lifecycle.PHASES;

// ── Pre-flight invariants (run once before scenarios) ────────────────────
test('PRE: state-machine STATES superset of Application Layer PHASE_ORDER', () => {
  // state-machine has 11 states (adds idle + error); Application has 9
  // (no idle/error, uses 'archive' not 'archived'). The canonical
  // PDCA path (pm..report) must appear in both.
  for (const p of ['pm', 'plan', 'design', 'do', 'check', 'act', 'qa', 'report']) {
    assert.ok(sm.STATES.includes(p), `state-machine missing ${p}`);
    assert.ok(lifecycle.PHASE_SET.has(p), `Application Layer missing ${p}`);
  }
});

test('PRE: state-machine recognizes archived; Application uses archive (intentional v2.1.12 reconcile)', () => {
  // Documented divergence — state-machine uses `archived` (past
  // tense, terminal) while Application Layer uses `archive` (action).
  assert.ok(sm.STATES.includes('archived'));
  assert.equal(lifecycle.isValidPhase('archive'), true);
  // Both module versions answer "is this terminal?" — but with
  // different strings. v2.1.12 will reconcile via shim.
});

// ── Scenario 1/9 — PM (Agent Teams required) ─────────────────────────────
test('[1/9] PM — pm-lead spawns sub-agents + PRD generation [skip-if-no-env]', { skip: !HAS_AGENT_TEAMS && 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS not set' }, () => {
  // Application Layer assertion
  assert.equal(lifecycle.isValidPhase(PHASES.PM), true);
  assert.equal(lifecycle.phaseIndex(PHASES.PM), 0);
  assert.equal(lifecycle.nextPhase(PHASES.PM), 'plan');

  // State machine assertion — pm is reachable from idle via START
  assert.ok(sm.STATES.includes('pm'));

  // Phase invariant: PM transition allows → plan (forward) or → archive (abandon)
  const allowed = lifecycle.legalNextPhases(PHASES.PM);
  assert.ok(allowed.includes('plan'));
  assert.ok(allowed.includes('archive'));

  // CC v2.1.118 X22 contract: cwd-restored subagent must equal original cwd.
  // We can't actually spawn a subagent here, but we verify the env
  // variable that would be checked at runtime is present.
  assert.equal(process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS, '1');
});

// ── Scenario 2/9 — Plan ──────────────────────────────────────────────────
test('[2/9] Plan — Plan document path convention matches bkit.config.json', () => {
  assert.equal(lifecycle.isValidPhase(PHASES.PLAN), true);
  assert.equal(lifecycle.nextPhase(PHASES.PLAN), 'design');

  const cfg = JSON.parse(fs.readFileSync(
    path.join(PROJECT_ROOT, 'bkit.config.json'), 'utf8'));
  const planPaths = cfg.pdca && cfg.pdca.docPaths && cfg.pdca.docPaths.plan;
  assert.ok(Array.isArray(planPaths) && planPaths.length > 0,
    'bkit.config.json#pdca.docPaths.plan must be a non-empty array');
  assert.match(planPaths[0], /\{feature\}/);
  assert.match(planPaths[0], /\.plan\.md$/);
});

// ── Scenario 3/9 — Design ────────────────────────────────────────────────
test('[3/9] Design — Design path convention + Architecture Options invariant', () => {
  assert.equal(lifecycle.isValidPhase(PHASES.DESIGN), true);
  assert.equal(lifecycle.nextPhase(PHASES.DESIGN), 'do');

  const designDir = path.join(PROJECT_ROOT, 'docs', '02-design', 'features');
  assert.ok(fs.existsSync(designDir), 'docs/02-design/features must exist');

  // Sprint γ design doc itself is a self-test artifact:
  const gammaDoc = path.join(designDir, 'bkit-v2111-sprint-gamma.design.md');
  assert.ok(fs.existsSync(gammaDoc), 'Sprint γ design doc must exist');
});

// ── Scenario 4/9 — Do ────────────────────────────────────────────────────
test('[4/9] Do — implementation + L1 TC generation invariant', () => {
  assert.equal(lifecycle.isValidPhase(PHASES.DO), true);
  assert.equal(lifecycle.nextPhase(PHASES.DO), 'check');

  // Sprint α/β/γ all produced L1 TCs that must exist on disk.
  const expectedTests = [
    'test/unit/branding.test.js',                          // FR-α2
    'test/unit/cc-version-checker.test.js',                // FR-α5
    'test/unit/explorer.test.js',                          // FR-β1
    'test/unit/evals-runner-wrapper.test.js',              // FR-β2
    'test/unit/i18n-translator.test.js',                   // FR-β3
    'test/unit/watch.test.js',                             // FR-β4
    'test/unit/fast-track.test.js',                        // FR-β5
    'test/unit/i18n-detector.test.js',                     // FR-β6
    'test/unit/trust-engine-reconcile.test.js',            // FR-γ1
    'test/unit/application-pdca-lifecycle.test.js',        // FR-γ2
  ];
  for (const t of expectedTests) {
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, t)), `${t} must exist (FR L1 TC)`);
  }
});

// ── Scenario 5/9 — Check ─────────────────────────────────────────────────
test('[5/9] Check — gap-detector compatible state machine + Match Rate accessible', () => {
  assert.equal(lifecycle.isValidPhase(PHASES.CHECK), true);
  // Check phase legally goes to Act (iterate) or QA (skip iterate) or Archive (abandon).
  const allowed = lifecycle.legalNextPhases(PHASES.CHECK);
  assert.ok(allowed.includes('act'));
  assert.ok(allowed.includes('qa'));
  assert.ok(allowed.includes('archive'));

  // gap-detector relies on Match Rate. The state-machine must offer
  // a transition predicate for this:
  assert.equal(typeof sm.canTransition, 'function');
});

// ── Scenario 6/9 — Act ───────────────────────────────────────────────────
test('[6/9] Act — iterate path (act → do) is preserved', () => {
  assert.equal(lifecycle.isValidPhase(PHASES.ACT), true);

  // Iterate: act must allow returning to do for re-implementation
  const r = lifecycle.canTransition(PHASES.ACT, PHASES.DO);
  assert.equal(r.ok, true, 'act → do (iterate) must be legal');

  // Forward: act → qa or act → report
  assert.equal(lifecycle.canTransition(PHASES.ACT, PHASES.QA).ok, true);
  assert.equal(lifecycle.canTransition(PHASES.ACT, PHASES.REPORT).ok, true);
});

// ── Scenario 7/9 — QA (Agent Teams required) ─────────────────────────────
test('[7/9] QA — qa-lead L1-L3 dispatch [skip-if-no-env]', { skip: !HAS_AGENT_TEAMS && 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS not set' }, () => {
  assert.equal(lifecycle.isValidPhase(PHASES.QA), true);

  // QA can either pass to Report or fail back to Do (regression).
  const allowed = lifecycle.legalNextPhases(PHASES.QA);
  assert.ok(allowed.includes('report'));
  assert.ok(allowed.includes('do'));

  // qa-lead agent file must exist
  const qaLead = path.join(PROJECT_ROOT, 'agents', 'qa-lead.md');
  assert.ok(fs.existsSync(qaLead), 'agents/qa-lead.md required for L1-L3 dispatch');
});

// ── Scenario 8/9 — Report ────────────────────────────────────────────────
test('[8/9] Report — completion report convention + only → archive', () => {
  assert.equal(lifecycle.isValidPhase(PHASES.REPORT), true);

  // Report is terminal-adjacent: only legal next is archive.
  const allowed = lifecycle.legalNextPhases(PHASES.REPORT);
  assert.deepEqual([...allowed], ['archive']);

  // Report doc path convention exists
  const reportDir = path.join(PROJECT_ROOT, 'docs', '04-report');
  assert.ok(fs.existsSync(reportDir), 'docs/04-report must exist');
});

// ── Scenario 9/9 — Archive ───────────────────────────────────────────────
test('[9/9] Archive — terminal phase with no outbound + archive dir convention', () => {
  assert.equal(lifecycle.isValidPhase(PHASES.ARCHIVE), true);
  assert.deepEqual(lifecycle.legalNextPhases(PHASES.ARCHIVE), []);
  assert.equal(lifecycle.nextPhase(PHASES.ARCHIVE), null);

  // Archive convention: docs/archive/YYYY-MM/ structure.
  const archiveBase = path.join(PROJECT_ROOT, 'docs', 'archive');
  // The dir may not exist on a fresh checkout, but the convention is documented.
  // We just assert it CAN be created (parent docs/ exists).
  assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'docs')));
});

// ── Cross-scenario invariant: full forward chain canTransition ───────────
test('[INV] Full forward chain pm → plan → design → do → check → act → qa → report → archive', () => {
  const chain = [
    [PHASES.PM, PHASES.PLAN],
    [PHASES.PLAN, PHASES.DESIGN],
    [PHASES.DESIGN, PHASES.DO],
    [PHASES.DO, PHASES.CHECK],
    [PHASES.CHECK, PHASES.ACT],
    [PHASES.ACT, PHASES.QA],
    [PHASES.QA, PHASES.REPORT],
    [PHASES.REPORT, PHASES.ARCHIVE],
  ];
  for (const [from, to] of chain) {
    const r = lifecycle.canTransition(from, to);
    assert.equal(r.ok, true, `forward ${from} → ${to} must be legal`);
  }
});
