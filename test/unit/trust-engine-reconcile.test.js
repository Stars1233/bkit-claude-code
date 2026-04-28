/**
 * trust-engine-reconcile.test.js — Unit tests for FR-γ1 reconcile API.
 *
 * Maps to Sprint γ Design §4.1 reconcile() contract + dead-code
 * invariant (3 flags must be read at runtime).
 *
 * @module test/unit/trust-engine-reconcile.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const trustEngine = require('../../lib/control/trust-engine');

// ── Public surface ───────────────────────────────────────────────────────
test('trust-engine exports reconcile()', () => {
  assert.equal(typeof trustEngine.reconcile, 'function');
});

test('trust-engine exports syncToControlState()', () => {
  assert.equal(typeof trustEngine.syncToControlState, 'function');
});

test('reconcile: returns ok when not skipped', () => {
  const r = trustEngine.reconcile({ trigger: 'test.unit' });
  assert.equal(r.ok, true);
  assert.equal(typeof r.flags, 'object');
});

test('reconcile: surfaces all 3 flags in result', () => {
  const r = trustEngine.reconcile();
  assert.ok(r.flags);
  for (const k of ['trustEnabled', 'autoEscalation', 'autoDowngrade']) {
    assert.ok(Object.prototype.hasOwnProperty.call(r.flags, k),
      `flag ${k} must surface in reconcile result`);
    assert.equal(typeof r.flags[k], 'boolean', `${k} must be boolean`);
  }
});

test('reconcile: trigger defaults to "manual" when omitted', () => {
  const r = trustEngine.reconcile();
  // ok or skipped — both acceptable depending on config.trustScoreEnabled
  if (!r.skipped) {
    assert.equal(r.trigger, 'manual');
  }
});

test('reconcile: explicit trigger preserved', () => {
  const r = trustEngine.reconcile({ trigger: 'pdca.do.completed' });
  if (!r.skipped) {
    assert.equal(r.trigger, 'pdca.do.completed');
  }
});

// ── Dead-code invariant: 3 flags MUST be read in trust-engine.js ─────────
test('dead-code invariant: trust-engine.js reads automation.trustScoreEnabled', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../lib/control/trust-engine.js'), 'utf8');
  assert.ok(src.includes("'automation.trustScoreEnabled'"),
    'trustScoreEnabled flag must be read at runtime');
});

test('dead-code invariant: trust-engine.js reads automation.autoEscalation', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../lib/control/trust-engine.js'), 'utf8');
  assert.ok(src.includes("'automation.autoEscalation'"));
});

test('dead-code invariant: trust-engine.js reads automation.autoDowngrade', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../lib/control/trust-engine.js'), 'utf8');
  assert.ok(src.includes("'automation.autoDowngrade'"));
});

// ── Config presence (bkit.config.json#automation 3 flags) ────────────────
test('config invariant: bkit.config.json#automation.trustScoreEnabled present', () => {
  const cfg = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, '../../bkit.config.json'), 'utf8'));
  assert.ok(cfg.automation, 'automation block must exist');
  assert.ok(Object.prototype.hasOwnProperty.call(cfg.automation, 'trustScoreEnabled'));
});

test('config invariant: bkit.config.json#automation.autoEscalation present', () => {
  const cfg = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, '../../bkit.config.json'), 'utf8'));
  assert.ok(Object.prototype.hasOwnProperty.call(cfg.automation, 'autoEscalation'));
});

test('config invariant: bkit.config.json#automation.autoDowngrade present', () => {
  const cfg = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, '../../bkit.config.json'), 'utf8'));
  assert.ok(Object.prototype.hasOwnProperty.call(cfg.automation, 'autoDowngrade'));
});

// ── Runtime caller invariant: at least 1 runtime caller wires it up ──────
test('runtime caller invariant: syncToControlState or reconcile called outside trust-engine', () => {
  const candidates = [
    path.resolve(__dirname, '../../scripts/unified-stop.js'),
    path.resolve(__dirname, '../../lib/control/automation-controller.js'),
  ];
  let found = false;
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    if (/syncToControlState\s*\(/.test(src) || /\.reconcile\s*\(/.test(src)) {
      found = true; break;
    }
  }
  assert.equal(found, true,
    'At least one runtime caller must invoke syncToControlState() or reconcile()');
});
