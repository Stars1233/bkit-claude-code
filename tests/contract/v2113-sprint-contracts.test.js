'use strict';

/**
 * v2113-sprint-contracts.test.js — L3 Contract Tests (tracked, CI gate).
 *
 * Enforces cross-sprint structural contracts between Sprint 1+2+3+4 outputs.
 * This file is git-tracked (unlike tests/qa/*) and serves as the canonical
 * regression suite preventing contract drift across:
 *   - Sprint 1 Sprint entity shape
 *   - Sprint 2 deps interface keys
 *   - Sprint 3 createSprintInfra return shape
 *   - Sprint 4 sprint-handler signature + audit + control mirror
 *   - Sprint 1+2+3+4 hooks.json invariant
 *
 * Run: node tests/contract/v2113-sprint-contracts.test.js
 *
 * Exit code 0 = all contracts hold. Non-zero = drift detected.
 *
 * Sprint Ref: v2113-sprint-5-quality-docs
 * @version 2.1.13
 * @since 2.1.13
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');

let passed = 0;
let failed = 0;

function record(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      return r.then(
        () => { passed++; console.log('  ✅ ' + name + ' PASS'); },
        (e) => { failed++; console.log('  ❌ ' + name + ' FAIL: ' + e.message); }
      );
    }
    passed++;
    console.log('  ✅ ' + name + ' PASS');
  } catch (e) {
    failed++;
    console.log('  ❌ ' + name + ' FAIL: ' + e.message);
  }
}

// === SC-01: Sprint entity shape ===
function sc01() {
  const domain = require(path.join(projectRoot, 'lib/domain/sprint'));
  const s = domain.createSprint({
    id: 'sc01',
    name: 'SC01Test',
    features: ['f1'],
    context: { WHY: 'x', WHO: 'x', RISK: 'x', SUCCESS: 'x', SCOPE: 'x' },
  });
  // Core 12 keys (subset of full 19, allowing entity growth without breaking contract)
  const coreKeys = ['id', 'name', 'features', 'featureMap', 'status', 'phase',
                    'autoRun', 'qualityGates', 'autoPause', 'config', 'docs', 'context'];
  coreKeys.forEach(k => assert(k in s, 'Sprint missing core key: ' + k));
  assert.strictEqual(s.id, 'sc01');
  assert.strictEqual(s.name, 'SC01Test');
  assert.deepStrictEqual(s.features, ['f1']);
  assert.strictEqual(typeof s.featureMap, 'object');
  // status starts in 'pending' or similar (not archived)
  assert.notStrictEqual(s.status, 'archived');
}

// === SC-02: Sprint 2 deps interface keys ===
function sc02() {
  const startSrc = fs.readFileSync(
    path.join(projectRoot, 'lib/application/sprint-lifecycle/start-sprint.usecase.js'),
    'utf8'
  );
  const iterSrc = fs.readFileSync(
    path.join(projectRoot, 'lib/application/sprint-lifecycle/iterate-sprint.usecase.js'),
    'utf8'
  );
  const validateSrc = fs.readFileSync(
    path.join(projectRoot, 'lib/application/sprint-lifecycle/verify-data-flow.usecase.js'),
    'utf8'
  );

  const startKeys = ['stateStore', 'eventEmitter', 'clock', 'gateEvaluator',
                     'autoPauseChecker', 'phaseHandlers', 'env'];
  startKeys.forEach(k => {
    assert(startSrc.includes('deps.' + k) || startSrc.includes('deps && deps.' + k),
      'start-sprint missing deps key: ' + k);
  });

  ['gapDetector', 'autoFixer'].forEach(k => {
    assert(iterSrc.includes('deps.' + k) || iterSrc.includes('deps && deps.' + k),
      'iterate-sprint missing deps key: ' + k);
  });

  assert(validateSrc.includes('dataFlowValidator'),
    'verify-data-flow missing dataFlowValidator');
}

// === SC-03: Sprint 3 createSprintInfra return shape ===
function sc03() {
  const infraMod = require(path.join(projectRoot, 'lib/infra/sprint'));
  assert.strictEqual(typeof infraMod.createSprintInfra, 'function');
  const infra = infraMod.createSprintInfra({ projectRoot: projectRoot });

  // 4 baseline adapters (Sprint 3 invariant)
  ['stateStore', 'eventEmitter', 'docScanner', 'matrixSync'].forEach(k => {
    assert(k in infra, 'createSprintInfra missing adapter: ' + k);
  });

  // stateStore must expose load/save/list/remove (Sprint 3 baseline naming)
  ['load', 'save', 'list', 'remove'].forEach(m => {
    assert.strictEqual(typeof infra.stateStore[m], 'function',
      'stateStore.' + m + ' must be function');
  });

  // Sprint 5 production scaffolds (3 new factories on barrel, NOT inside createSprintInfra)
  assert.strictEqual(typeof infraMod.createGapDetector, 'function');
  assert.strictEqual(typeof infraMod.createAutoFixer, 'function');
  assert.strictEqual(typeof infraMod.createDataFlowValidator, 'function');
}

// === SC-04: Sprint 4 sprint-handler signature ===
function sc04() {
  const handlerMod = require(path.join(projectRoot, 'scripts/sprint-handler'));
  assert.strictEqual(typeof handlerMod.handleSprintAction, 'function');
  assert.strictEqual(handlerMod.handleSprintAction.length, 3,
    'handleSprintAction must take (action, args, deps)');
  assert(Array.isArray(handlerMod.VALID_ACTIONS));
  assert.strictEqual(handlerMod.VALID_ACTIONS.length, 15,
    'VALID_ACTIONS must list 15 sub-actions');
  // 15 expected actions
  const expected = ['init', 'start', 'status', 'list', 'phase', 'iterate',
                    'qa', 'report', 'archive', 'pause', 'resume', 'fork',
                    'feature', 'watch', 'help'];
  expected.forEach(a => assert(handlerMod.VALID_ACTIONS.includes(a),
    'VALID_ACTIONS missing: ' + a));
}

// === SC-05: 4-layer end-to-end chain ===
async function sc05() {
  const handler = require(path.join(projectRoot, 'scripts/sprint-handler'));
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sc05-'));
  try {
    const initRes = await handler.handleSprintAction('init', {
      id: 'sc05-test',
      name: 'SC05Test',
      features: ['f1'],
      context: { WHY: 'x', WHO: 'x', RISK: 'x', SUCCESS: 'x', SCOPE: 'x' },
    }, { projectRoot: tmpRoot });
    assert.strictEqual(initRes.ok, true, 'init failed: ' + JSON.stringify(initRes));

    const statusRes = await handler.handleSprintAction('status', {
      id: 'sc05-test',
    }, { projectRoot: tmpRoot });
    assert.strictEqual(statusRes.ok, true, 'status failed');
    assert(statusRes.sprint, 'status missing sprint');
    assert.strictEqual(statusRes.sprint.id, 'sc05-test');

    const listRes = await handler.handleSprintAction('list', {}, { projectRoot: tmpRoot });
    assert.strictEqual(listRes.ok, true, 'list failed');
    assert(Array.isArray(listRes.sprints), 'list missing sprints array');
  } finally {
    // best-effort cleanup
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (_e) {}
  }
}

// === SC-06: audit-logger ACTION_TYPES 18 entries ===
function sc06() {
  const src = fs.readFileSync(
    path.join(projectRoot, 'lib/audit/audit-logger.js'),
    'utf8'
  );
  // Match `const ACTION_TYPES = [ ... ]` (Sprint 4 baseline shape, no Object.freeze wrap)
  const match = src.match(/const\s+ACTION_TYPES\s*=\s*\[([\s\S]*?)\];/);
  assert(match, 'ACTION_TYPES array literal not found');
  const entries = match[1].match(/'[^']+'/g) || [];
  assert.strictEqual(entries.length, 18,
    'ACTION_TYPES expected 18 entries, got ' + entries.length);
  const flat = entries.join(',');
  assert(flat.includes('sprint_paused'), 'sprint_paused missing from ACTION_TYPES');
  assert(flat.includes('sprint_resumed'), 'sprint_resumed missing from ACTION_TYPES');
}

// === SC-07: SPRINT_AUTORUN_SCOPE mirror (Sprint 2 inline ↔ Sprint 4 lib/control) ===
function sc07() {
  const controlSrc = fs.readFileSync(
    path.join(projectRoot, 'lib/control/automation-controller.js'),
    'utf8'
  );
  const sprintSrc = fs.readFileSync(
    path.join(projectRoot, 'lib/application/sprint-lifecycle/start-sprint.usecase.js'),
    'utf8'
  );

  // Both must declare SPRINT_AUTORUN_SCOPE
  assert(controlSrc.includes('SPRINT_AUTORUN_SCOPE'),
    'lib/control missing SPRINT_AUTORUN_SCOPE');
  assert(sprintSrc.includes('SPRINT_AUTORUN_SCOPE'),
    'sprint-lifecycle inline missing SPRINT_AUTORUN_SCOPE');

  // 5 levels L0-L4
  ['L0', 'L1', 'L2', 'L3', 'L4'].forEach(lvl => {
    assert(controlSrc.includes(lvl), 'control missing level: ' + lvl);
    assert(sprintSrc.includes(lvl), 'sprint inline missing level: ' + lvl);
  });

  // stopAfter sentinel must appear in both
  assert(controlSrc.includes('stopAfter'), 'control missing stopAfter');
  assert(sprintSrc.includes('stopAfter'), 'sprint inline missing stopAfter');
}

// === SC-08: hooks/hooks.json 21:24 invariant ===
function sc08() {
  const hooks = JSON.parse(fs.readFileSync(
    path.join(projectRoot, 'hooks/hooks.json'),
    'utf8'
  ));
  const eventKeys = Object.keys(hooks.hooks || {});
  let blockCount = 0;
  eventKeys.forEach(k => {
    const arr = hooks.hooks[k];
    if (Array.isArray(arr)) blockCount += arr.length;
  });
  assert.strictEqual(eventKeys.length, 21,
    'hooks events expected 21, got ' + eventKeys.length);
  assert.strictEqual(blockCount, 24,
    'hooks blocks expected 24, got ' + blockCount);
}

// === Runner ===
(async () => {
  console.log('=== L3 Contract Tests (Sprint 5 SC-01~08) ===\n');
  record('SC-01 Sprint entity shape (12 core keys)', sc01);
  record('SC-02 deps interface (start: 7 + iterate: 2 + verify: 1)', sc02);
  record('SC-03 createSprintInfra 4 adapters + Sprint 5 3 scaffolds', sc03);
  record('SC-04 handleSprintAction(action,args,deps) + 15 VALID_ACTIONS', sc04);
  await record('SC-05 4-layer end-to-end chain (init → status → list)', sc05);
  record('SC-06 ACTION_TYPES enum 18 entries (incl sprint_paused/resumed)', sc06);
  record('SC-07 SPRINT_AUTORUN_SCOPE inline ↔ lib/control mirror (5 levels)', sc07);
  record('SC-08 hooks.json 21 events 24 blocks invariant', sc08);
  console.log('\n=== L3 Contract: ' + passed + '/' + (passed + failed) + ' PASS ===');
  if (failed > 0) {
    console.error('\n❌ ' + failed + ' contract(s) FAILED — cross-sprint drift detected.');
    process.exit(1);
  }
})().catch(e => { console.error(e); process.exit(1); });
