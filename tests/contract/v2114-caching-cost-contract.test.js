'use strict';

/**
 * v2114-caching-cost-contract.test.js — L3 Contract Tests (tracked, CI gate).
 *
 * Enforces Sub-Sprint 1 (Coordination, ENH-292 Sequential Sub-agent Dispatch)
 * structural contracts between Domain Port, Infrastructure Adapter, and the
 * two Orchestrator consumers (cache-cost-analyzer + sub-agent-dispatcher).
 *
 * Invariants enforced (10 TCs):
 *   C-01  Port file exists at canonical path lib/domain/ports/caching-cost.port.js
 *   C-02  Port pure-fn surface matches spec (classifyThreshold/computeHitRate/isCachingCostPort)
 *   C-03  Port constants are frozen (THRESHOLD_LOW=0.10 / THRESHOLD_HIGH=0.40)
 *   C-04  Adapter at lib/infra/caching-cost-cli.js — 1:1 pair invariant (Sub-Sprint 1 spec)
 *   C-05  Adapter exports createCachingCostCli + buildMetrics factory pair
 *   C-06  Adapter instance satisfies isCachingCostPort duck-type
 *   C-07  Analyzer requires deps.port + delegates classification to Port
 *   C-08  Dispatcher state machine exposes exactly 8 STATES (design §3.2)
 *   C-09  Domain Layer Purity invariant — caching-cost.port has 0 forbidden imports
 *   C-10  lib/orchestrator/index.js re-exports new Layer D entries (createAnalyzer + createDispatcher)
 *
 * This file is git-tracked (unlike tests/qa/*) and serves as the canonical
 * regression suite preventing contract drift across Sub-Sprint 1 modules.
 *
 * Run: node tests/contract/v2114-caching-cost-contract.test.js
 *
 * Exit code 0 = all contracts hold. Non-zero = drift detected.
 *
 * Sprint Ref: v2114-differentiation-release (Sub-Sprint 1 Coordination)
 * @version 2.1.14
 * @since 2.1.14
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
    fn();
    passed += 1;
    // eslint-disable-next-line no-console
    console.log('  ✅ ' + name + ' PASS');
  } catch (e) {
    failed += 1;
    // eslint-disable-next-line no-console
    console.log('  ❌ ' + name + ' FAIL: ' + e.message);
  }
}

// eslint-disable-next-line no-console
console.log('\n📋 v2.1.14 Sub-Sprint 1 Contract Tests\n');

// C-01: Port file exists at canonical path
record('C-01 Port at canonical path', () => {
  const portPath = path.join(projectRoot, 'lib/domain/ports/caching-cost.port.js');
  assert.ok(fs.existsSync(portPath), 'caching-cost.port.js missing at canonical path');
});

// C-02: Port pure-fn surface matches spec
record('C-02 Port pure-fn surface', () => {
  const p = require(path.join(projectRoot, 'lib/domain/ports/caching-cost.port'));
  assert.equal(typeof p.classifyThreshold, 'function', 'classifyThreshold missing');
  assert.equal(typeof p.computeHitRate, 'function', 'computeHitRate missing');
  assert.equal(typeof p.isCachingCostPort, 'function', 'isCachingCostPort missing');
});

// C-03: Port constants are frozen with exact thresholds
record('C-03 Port constants THRESHOLD_LOW=0.10 THRESHOLD_HIGH=0.40 frozen', () => {
  const p = require(path.join(projectRoot, 'lib/domain/ports/caching-cost.port'));
  assert.equal(p.THRESHOLD_LOW, 0.10, 'THRESHOLD_LOW drift');
  assert.equal(p.THRESHOLD_HIGH, 0.40, 'THRESHOLD_HIGH drift');
  assert.ok(Object.isFrozen(p.DISPATCH_MODES), 'DISPATCH_MODES must be frozen');
  assert.ok(Object.isFrozen(p.THRESHOLD_LEVELS), 'THRESHOLD_LEVELS must be frozen');
});

// C-04: Adapter at canonical 1:1 path
record('C-04 Adapter at lib/infra/caching-cost-cli.js (1:1 pair)', () => {
  const adapterPath = path.join(projectRoot, 'lib/infra/caching-cost-cli.js');
  assert.ok(fs.existsSync(adapterPath), 'caching-cost-cli.js missing — 1:1 pair invariant violated');
});

// C-05: Adapter factory exports
record('C-05 Adapter exports createCachingCostCli + buildMetrics', () => {
  const a = require(path.join(projectRoot, 'lib/infra/caching-cost-cli'));
  assert.equal(typeof a.createCachingCostCli, 'function');
  assert.equal(typeof a.buildMetrics, 'function');
});

// C-06: Adapter instance satisfies Port duck-type
record('C-06 Adapter instance satisfies isCachingCostPort', () => {
  const { createCachingCostCli, isCachingCostPort } = require(path.join(projectRoot, 'lib/infra/caching-cost-cli'));
  const tmpdir = path.join(os.tmpdir(), 'bkit-contract-c06-' + Date.now());
  const inst = createCachingCostCli({ projectRoot: tmpdir });
  const r = isCachingCostPort(inst);
  assert.equal(r.ok, true, 'duck-type fail: missing=' + JSON.stringify(r.missing));
});

// C-07: Analyzer requires deps.port + delegates classification
record('C-07 Analyzer requires deps.port + delegates to Port', () => {
  const an = require(path.join(projectRoot, 'lib/orchestrator/cache-cost-analyzer'));
  assert.equal(typeof an.createAnalyzer, 'function');
  assert.equal(an.RECENT_WINDOW, 20, 'RECENT_WINDOW drift');
  assert.equal(an.MIN_SAMPLES_FOR_TREND, 3, 'MIN_SAMPLES_FOR_TREND drift');
  assert.throws(() => an.createAnalyzer({}), /port must implement CachingCostPort/);
});

// C-08: Dispatcher state machine has exactly 8 states (design §3.2)
record('C-08 Dispatcher STATES count = 8 (design §3.2)', () => {
  const d = require(path.join(projectRoot, 'lib/orchestrator/sub-agent-dispatcher'));
  assert.equal(d.STATE_NAMES.length, 8, 'expected 8 states');
  const expected = ['CACHE_HIT_MEASURED', 'CACHE_WARMUP_DETECTED', 'FIRST_SPAWN_SEQUENTIAL', 'INIT', 'LATENCY_GUARD', 'OPT_OUT_ENABLED', 'PARALLEL_RESTORE', 'RESET'];
  assert.deepEqual(d.STATE_NAMES.slice().sort(), expected);
  assert.equal(d.LATENCY_GUARD_MS, 30000, 'LATENCY_GUARD_MS drift');
});

// C-09: Domain Layer Purity — caching-cost.port has 0 forbidden imports
record('C-09 Domain Purity — caching-cost.port has 0 forbidden imports', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'lib/domain/ports/caching-cost.port.js'), 'utf8');
  const FORBIDDEN = ['fs', 'child_process', 'net', 'http', 'https', 'os', 'dns', 'tls', 'cluster'];
  for (const mod of FORBIDDEN) {
    const re = new RegExp("require\\(['\"]" + mod + "['\"]\\)|require\\(['\"]" + mod + "/", 'm');
    assert.ok(!re.test(src), 'Domain purity violated — forbidden import: ' + mod);
  }
});

// C-10: lib/orchestrator/index.js re-exports new Layer D entries
record('C-10 Orchestrator index re-exports Layer D (createAnalyzer + createDispatcher)', () => {
  const orch = require(path.join(projectRoot, 'lib/orchestrator'));
  assert.equal(typeof orch.createAnalyzer, 'function', 'createAnalyzer not re-exported');
  assert.equal(typeof orch.createDispatcher, 'function', 'createDispatcher not re-exported');
  assert.equal(typeof orch.cacheCostAnalyzer, 'object', 'cacheCostAnalyzer namespace missing');
  assert.equal(typeof orch.subAgentDispatcher, 'object', 'subAgentDispatcher namespace missing');
});

// eslint-disable-next-line no-console
console.log('\n📊 Summary: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
process.exit(0);
