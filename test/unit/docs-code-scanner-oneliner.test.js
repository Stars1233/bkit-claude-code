/**
 * docs-code-scanner-oneliner.test.js — Unit tests for scanOneLiner() (FR-α2-f)
 *
 * @module test/unit/docs-code-scanner-oneliner.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const scanner = require('../../lib/infra/docs-code-scanner');
const { ONE_LINER_EN } = require('../../lib/infra/branding');

test('scanOneLiner: returns expected schema', async () => {
  const r = await scanner.scanOneLiner();
  assert.equal(r.expected, ONE_LINER_EN);
  assert.ok(Array.isArray(r.results));
  assert.ok(Array.isArray(r.mismatches));
  assert.ok(Array.isArray(r.pending));
  assert.equal(typeof r.syncCount, 'number');
});

test('scanOneLiner: enumerates exactly 5 SSoT locations', async () => {
  const r = await scanner.scanOneLiner();
  assert.equal(r.results.length, 5, '5 SSoT locations expected');
  const names = r.results.map((x) => x.name).sort();
  assert.deepEqual(names, [
    'CHANGELOG.md',
    'README-FULL.md',
    'README.md',
    'plugin.json',
    'session-context.js',
  ]);
});

test('scanOneLiner: every result has a valid status', async () => {
  const r = await scanner.scanOneLiner();
  for (const x of r.results) {
    assert.ok(['sync', 'drift', 'missing'].includes(x.status),
      `unexpected status ${x.status} for ${x.name}`);
  }
});

test('scanOneLiner: plugin.json is currently sync (FR-α2-b done)', async () => {
  const r = await scanner.scanOneLiner();
  const plugin = r.results.find((x) => x.name === 'plugin.json');
  assert.ok(plugin, 'plugin.json entry must exist');
  assert.equal(plugin.status, 'sync', 'plugin.json should be sync since FR-α2-b shipped');
});

test('scanOneLiner: mismatches contain ONLY drift entries (not missing)', async () => {
  const r = await scanner.scanOneLiner();
  for (const m of r.mismatches) {
    const fullEntry = r.results.find((x) => x.name === m.name);
    assert.equal(fullEntry.status, 'drift');
  }
});

test('scanOneLiner: pending contains ONLY missing entries', async () => {
  const r = await scanner.scanOneLiner();
  for (const p of r.pending) {
    const fullEntry = r.results.find((x) => x.name === p.name);
    assert.equal(fullEntry.status, 'missing');
  }
});

test('scanOneLiner: syncCount + missing + drift === 5', async () => {
  const r = await scanner.scanOneLiner();
  assert.equal(r.syncCount + r.pending.length + r.mismatches.length, 5);
});

test('scanOneLiner: ONE_LINER_EN ends with a period (matches branding contract)', async () => {
  const r = await scanner.scanOneLiner();
  assert.match(r.expected, /\.$/);
});
