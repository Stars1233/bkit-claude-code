#!/usr/bin/env node
/**
 * check-trust-score-reconcile.js — CI invariant for FR-γ1.
 *
 * Asserts that the three Trust Score reconcile flags
 * (`automation.trustScoreEnabled`, `automation.autoEscalation`,
 * `automation.autoDowngrade`) remain wired to the runtime path:
 *
 *   1. All three keys are READ in `lib/control/trust-engine.js`
 *      (otherwise they are dead-code invariant violations).
 *   2. `reconcile()` is exported from `trust-engine.js`.
 *   3. `syncToControlState()` (or `reconcile()`) is CALLED from at
 *      least one runtime caller (`scripts/unified-stop.js` or peer).
 *   4. All three keys are PRESENT in `bkit.config.json#automation`.
 *
 * Exit codes:
 *   0 — all invariants hold
 *   1 — one or more invariants violated (CI fails)
 *
 * @module scripts/check-trust-score-reconcile
 * @version 2.1.11
 * @since 2.1.11
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TRUST_ENGINE = path.join(ROOT, 'lib', 'control', 'trust-engine.js');
const BKIT_CONFIG = path.join(ROOT, 'bkit.config.json');
const FLAG_KEYS = [
  'automation.trustScoreEnabled',
  'automation.autoEscalation',
  'automation.autoDowngrade',
];
const RUNTIME_CALLER_GLOBS = [
  path.join(ROOT, 'scripts', 'unified-stop.js'),
  path.join(ROOT, 'lib', 'control', 'automation-controller.js'),
];

const failures = [];

function fail(code, msg) {
  failures.push({ code, msg });
}

// 1. flags are read in trust-engine.js
let engineSrc;
try {
  engineSrc = fs.readFileSync(TRUST_ENGINE, 'utf8');
} catch (e) {
  fail('engine_unreadable', `Cannot read ${TRUST_ENGINE}: ${e.message}`);
}

if (engineSrc) {
  for (const key of FLAG_KEYS) {
    if (!engineSrc.includes(`'${key}'`)) {
      fail('flag_not_read', `${key} not referenced in lib/control/trust-engine.js — possible dead-code regression`);
    }
  }

  // 2. reconcile() exported
  if (!/exports\s*=\s*\{[\s\S]*\breconcile\b/.test(engineSrc)) {
    fail('reconcile_not_exported', 'reconcile() must be exported from trust-engine.js (FR-γ1 §4.1)');
  }

  // 3. syncToControlState defined
  if (!/function\s+syncToControlState\s*\(/.test(engineSrc)) {
    fail('sync_helper_missing', 'syncToControlState() helper missing from trust-engine.js');
  }
}

// 3b. runtime caller wires it up
let foundCaller = false;
for (const file of RUNTIME_CALLER_GLOBS) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  if (/syncToControlState\s*\(\s*\)/.test(src) || /\.reconcile\s*\(/.test(src)) {
    foundCaller = true;
    break;
  }
}
if (!foundCaller) {
  fail('runtime_caller_missing',
    `No runtime caller found for syncToControlState() / reconcile() in ${RUNTIME_CALLER_GLOBS.join(' or ')}`);
}

// 4. config keys present
let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(BKIT_CONFIG, 'utf8'));
} catch (e) {
  fail('config_unreadable', `Cannot read bkit.config.json: ${e.message}`);
}

if (cfg && cfg.automation) {
  for (const key of ['trustScoreEnabled', 'autoEscalation', 'autoDowngrade']) {
    if (!Object.prototype.hasOwnProperty.call(cfg.automation, key)) {
      fail('config_flag_missing', `bkit.config.json#automation.${key} missing — dead-code defense gap`);
    }
  }
} else {
  fail('config_automation_missing', 'bkit.config.json#automation block missing');
}

// Report
if (failures.length === 0) {
  console.log('OK trust-score-reconcile invariant: 3 flags read, reconcile exported, runtime caller wired, config present');
  process.exit(0);
} else {
  console.error('FAIL trust-score-reconcile invariant violations:');
  for (const f of failures) {
    console.error(`  [${f.code}] ${f.msg}`);
  }
  process.exit(1);
}
