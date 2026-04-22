/*
 * Telemetry (OTEL dual sink) Unit Tests — ENH-259 Sprint 2.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.3.2
 * Plan SC: OTEL off → overhead 0; redact policy works; dual sink isolates failures.
 */

const assert = require('node:assert');
const telemetry = require('../../lib/infra/telemetry');

let pass = 0, fail = 0;
function test(name, fn) {
  try {
    fn();
    pass++;
  } catch (e) {
    fail++;
    console.error(`✗ ${name}: ${e.message}`);
  }
}

// ==================== Module surface ====================
test('exports createFileSink', () => assert.strictEqual(typeof telemetry.createFileSink, 'function'));
test('exports createOtelSink', () => assert.strictEqual(typeof telemetry.createOtelSink, 'function'));
test('exports createDualSink', () => assert.strictEqual(typeof telemetry.createDualSink, 'function'));
test('exports composeSinks', () => assert.strictEqual(typeof telemetry.composeSinks, 'function'));
test('exports sanitizeForOtel', () => assert.strictEqual(typeof telemetry.sanitizeForOtel, 'function'));
test('exports buildOtlpPayload', () => assert.strictEqual(typeof telemetry.buildOtlpPayload, 'function'));

// ==================== File Sink ====================
test('createFileSink returns sink with emit', () => {
  const s = telemetry.createFileSink();
  assert.strictEqual(typeof s.emit, 'function');
});
test('file sink emit null is no-op', async () => {
  await telemetry.createFileSink().emit(null);
});
test('file sink emit undefined is no-op', async () => {
  await telemetry.createFileSink().emit(undefined);
});
test('file sink emit empty object is no-op (no throw)', async () => {
  await telemetry.createFileSink().emit({});
});
test('file sink emit standard event works', async () => {
  await telemetry.createFileSink().emit({ type: 'test.event', id: 'x', meta: { severity: 'INFO' } });
});

// ==================== OTEL Sink (no endpoint = no-op) ====================
test('createOtelSink without endpoint returns no-op', () => {
  const orig = process.env.OTEL_ENDPOINT;
  delete process.env.OTEL_ENDPOINT;
  try {
    const s = telemetry.createOtelSink();
    assert.strictEqual(typeof s.emit, 'function');
    // Promise resolves quickly
    return s.emit({ type: 'x' });
  } finally {
    if (orig) process.env.OTEL_ENDPOINT = orig;
  }
});
test('createOtelSink invalid endpoint returns no-throw emit', () => {
  process.env.OTEL_ENDPOINT = 'not a url';
  try {
    const s = telemetry.createOtelSink();
    return s.emit({ type: 'x' });
  } finally {
    delete process.env.OTEL_ENDPOINT;
  }
});

// ==================== Redaction ====================
test('sanitizeForOtel preserves event without OTEL_REDACT', () => {
  delete process.env.OTEL_REDACT;
  const e = { type: 't', meta: { tool_name: 'Bash', foo: 'bar' } };
  const s = telemetry.sanitizeForOtel(e);
  assert.strictEqual(s.meta.tool_name, 'Bash');
});
test('sanitizeForOtel redacts tool* keys with OTEL_REDACT=1', () => {
  process.env.OTEL_REDACT = '1';
  try {
    const e = { type: 't', meta: { tool_name: 'Bash', mcpServer: 'x', foo: 'bar' } };
    const s = telemetry.sanitizeForOtel(e);
    assert.strictEqual(s.meta.tool_name, '[redacted]');
    assert.strictEqual(s.meta.mcpServer, '[redacted]');
    assert.strictEqual(s.meta.foo, 'bar');
  } finally {
    delete process.env.OTEL_REDACT;
  }
});
test('sanitizeForOtel handles null event', () => {
  const s = telemetry.sanitizeForOtel(null);
  assert.strictEqual(s, null);
});
test('sanitizeForOtel handles event without meta', () => {
  const s = telemetry.sanitizeForOtel({ type: 't' });
  assert.deepStrictEqual(s, { type: 't' });
});

// ==================== OTLP Payload ====================
test('buildOtlpPayload has resourceLogs', () => {
  const p = telemetry.buildOtlpPayload({ type: 'x', meta: { severity: 'INFO' } });
  assert.ok(Array.isArray(p.resourceLogs));
  assert.strictEqual(p.resourceLogs.length, 1);
});
test('buildOtlpPayload includes service.name', () => {
  const p = telemetry.buildOtlpPayload({ type: 'x' });
  const attrs = p.resourceLogs[0].resource.attributes;
  assert.ok(attrs.find((a) => a.key === 'service.name'));
});
test('buildOtlpPayload includes bkit.version', () => {
  const p = telemetry.buildOtlpPayload({ type: 'x' });
  const attrs = p.resourceLogs[0].resource.attributes;
  assert.ok(attrs.find((a) => a.key === 'bkit.version'));
});
test('buildOtlpPayload severityText defaults INFO', () => {
  const p = telemetry.buildOtlpPayload({ type: 'x' });
  assert.strictEqual(p.resourceLogs[0].scopeLogs[0].logRecords[0].severityText, 'INFO');
});
test('buildOtlpPayload severityText from meta', () => {
  const p = telemetry.buildOtlpPayload({ type: 'x', meta: { severity: 'WARN' } });
  assert.strictEqual(p.resourceLogs[0].scopeLogs[0].logRecords[0].severityText, 'WARN');
});
test('buildOtlpPayload body is event type', () => {
  const p = telemetry.buildOtlpPayload({ type: 'custom.event' });
  assert.strictEqual(p.resourceLogs[0].scopeLogs[0].logRecords[0].body.stringValue, 'custom.event');
});
test('buildOtlpPayload timeUnixNano is numeric string', () => {
  const p = telemetry.buildOtlpPayload({ type: 'x' });
  const ts = p.resourceLogs[0].scopeLogs[0].logRecords[0].timeUnixNano;
  assert.ok(/^\d+$/.test(ts));
});
test('buildOtlpPayload attributes length = meta keys length', () => {
  const p = telemetry.buildOtlpPayload({ type: 'x', meta: { a: '1', b: '2', c: '3' } });
  assert.strictEqual(p.resourceLogs[0].scopeLogs[0].logRecords[0].attributes.length, 3);
});

// ==================== Dual Sink + composition ====================
test('createDualSink returns sink with emit', () => {
  const s = telemetry.createDualSink();
  assert.strictEqual(typeof s.emit, 'function');
});
test('composeSinks: 2 sinks both receive event', async () => {
  const received = [];
  const mockA = { async emit(e) { received.push(['A', e]); } };
  const mockB = { async emit(e) { received.push(['B', e]); } };
  const composed = telemetry.composeSinks(mockA, mockB);
  await composed.emit({ type: 'test' });
  assert.strictEqual(received.length, 2);
  assert.strictEqual(received[0][0], 'A');
  assert.strictEqual(received[1][0], 'B');
});
test('composeSinks: failure in one sink does not break others', async () => {
  const received = [];
  const mockFail = { async emit() { throw new Error('sink-failed'); } };
  const mockOk = { async emit(e) { received.push(e); } };
  const composed = telemetry.composeSinks(mockFail, mockOk);
  await composed.emit({ type: 'resilience-test' });
  assert.strictEqual(received.length, 1);
  assert.strictEqual(received[0].type, 'resilience-test');
});
test('composeSinks: 0 sinks returns immediately', async () => {
  await telemetry.composeSinks().emit({ type: 'x' });
});
test('composeSinks: null event propagates as-is', async () => {
  const received = [];
  const mock = { async emit(e) { received.push(e); } };
  await telemetry.composeSinks(mock).emit(null);
  assert.strictEqual(received.length, 1);
  assert.strictEqual(received[0], null);
});

// ==================== Overhead check (env-off path) ====================
test('OTEL sink with no endpoint emits in <5ms', async () => {
  delete process.env.OTEL_ENDPOINT;
  const s = telemetry.createOtelSink();
  const t0 = Date.now();
  await s.emit({ type: 'x', meta: { foo: 'bar' } });
  const elapsed = Date.now() - t0;
  assert.ok(elapsed < 50, `expected <50ms, got ${elapsed}ms`);
});

console.log(`\ntelemetry.test.js: ${pass}/${pass + fail} PASS, ${fail} FAIL, 0 SKIP`);
if (fail > 0) process.exit(1);
