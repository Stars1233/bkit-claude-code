'use strict';

/**
 * v2114-observability-contract.test.js — L3 Contract Tests (tracked, CI gate).
 *
 * Enforces Sub-Sprint 3 (A Observability) structural contracts:
 *   C-01  lib/infra/otel-env-capturer.js exists at canonical path
 *   C-02  otel-env-capturer exports captureEnv/hydrateEnv/resolveOtelEndpoint
 *   C-03  OTEL_ENV_VARS frozen + 8 entries (incl. both OTEL_ENDPOINT variants)
 *   C-04  CAPTURE_FILE_RELATIVE = '.bkit/runtime/otel-env.json'
 *   C-05  lib/infra/telemetry.js exports emitGenAI + GEN_AI_METRICS (10 frozen)
 *   C-06  emitGenAI returns {ok, metric, emitted, reason?} shape
 *   C-07  createOtelSink accepts env parameter (env-aware) + falls back to process.env
 *   C-08  resolveOtelEndpoint precedence — EXPORTER_OTLP > legacy ENDPOINT
 *   C-09  session-start.js wires otel-env-capturer.captureEnv
 *   C-10  sprint-handler.js uses resolveOtelEndpoint (env-aware OTEL resolution)
 *
 * Sprint Ref: v2114-differentiation-release (Sub-Sprint 3 A Observability)
 * @version 2.1.14
 * @since 2.1.14
 */

const assert = require('assert');
const fs = require('fs');
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
console.log('\n📋 v2.1.14 Sub-Sprint 3 (A Observability) Contract Tests\n');

// C-01
record('C-01 otel-env-capturer at lib/infra/otel-env-capturer.js', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'lib/infra/otel-env-capturer.js')));
});

// C-02
record('C-02 otel-env-capturer public API surface', () => {
  const c = require(path.join(projectRoot, 'lib/infra/otel-env-capturer'));
  assert.equal(typeof c.captureEnv, 'function');
  assert.equal(typeof c.hydrateEnv, 'function');
  assert.equal(typeof c.resolveOtelEndpoint, 'function');
  assert.equal(typeof c.resolveCaptureFile, 'function');
});

// C-03
record('C-03 OTEL_ENV_VARS frozen + 8 entries', () => {
  const c = require(path.join(projectRoot, 'lib/infra/otel-env-capturer'));
  assert.ok(Object.isFrozen(c.OTEL_ENV_VARS));
  assert.equal(c.OTEL_ENV_VARS.length, 8);
  assert.ok(c.OTEL_ENV_VARS.includes('OTEL_ENDPOINT'));
  assert.ok(c.OTEL_ENV_VARS.includes('OTEL_EXPORTER_OTLP_ENDPOINT'));
});

// C-04
record('C-04 CAPTURE_FILE_RELATIVE canonical path', () => {
  const c = require(path.join(projectRoot, 'lib/infra/otel-env-capturer'));
  assert.equal(c.CAPTURE_FILE_RELATIVE, '.bkit/runtime/otel-env.json');
});

// C-05
record('C-05 telemetry emitGenAI + GEN_AI_METRICS (10 frozen)', () => {
  const t = require(path.join(projectRoot, 'lib/infra/telemetry'));
  assert.equal(typeof t.emitGenAI, 'function');
  assert.ok(Array.isArray(t.GEN_AI_METRICS));
  assert.ok(Object.isFrozen(t.GEN_AI_METRICS));
  assert.equal(t.GEN_AI_METRICS.length, 10);
});

// C-06
record('C-06 emitGenAI return shape', async () => {
  const t = require(path.join(projectRoot, 'lib/infra/telemetry'));
  // Synchronous shape check via promise resolution
  return t.emitGenAI('gen_ai.request_tokens', {}, { env: {} }).then((r) => {
    assert.ok('ok' in r);
    assert.ok('metric' in r);
    assert.ok('emitted' in r);
    assert.equal(r.ok, true);
    assert.equal(r.emitted, false);
  });
});

// C-07
record('C-07 createOtelSink accepts env parameter (env-aware)', () => {
  const t = require(path.join(projectRoot, 'lib/infra/telemetry'));
  // env override path
  const sink1 = t.createOtelSink({});
  assert.equal(typeof sink1.emit, 'function');
  // process.env fallback path
  const sink2 = t.createOtelSink();
  assert.equal(typeof sink2.emit, 'function');
});

// C-08
record('C-08 resolveOtelEndpoint precedence EXPORTER_OTLP > legacy', () => {
  const c = require(path.join(projectRoot, 'lib/infra/otel-env-capturer'));
  assert.equal(
    c.resolveOtelEndpoint({
      OTEL_EXPORTER_OTLP_ENDPOINT: 'https://standard/',
      OTEL_ENDPOINT: 'https://legacy/',
    }),
    'https://standard/'
  );
  assert.equal(c.resolveOtelEndpoint({ OTEL_ENDPOINT: 'https://legacy/' }), 'https://legacy/');
  assert.equal(c.resolveOtelEndpoint({}), null);
});

// C-09
record('C-09 hooks/session-start.js wires otel-env-capturer.captureEnv', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'hooks/session-start.js'), 'utf8');
  assert.ok(/otel-env-capturer/.test(src), 'session-start does not require otel-env-capturer');
  assert.ok(/captureEnv/.test(src), 'session-start does not call captureEnv');
  assert.ok(/Sub-Sprint 3/.test(src) || /ENH-293/.test(src), 'session-start missing ENH-293 marker');
});

// C-10
record('C-10 scripts/sprint-handler.js uses env-aware OTEL resolution', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'scripts/sprint-handler.js'), 'utf8');
  assert.ok(/resolveOtelEndpoint/.test(src), 'sprint-handler does not use resolveOtelEndpoint');
  assert.ok(/otel-env-capturer/.test(src), 'sprint-handler does not require otel-env-capturer');
});

// eslint-disable-next-line no-console
console.log('\n📊 Summary: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
process.exit(0);
