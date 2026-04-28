/**
 * cc-version-checker.test.js — Unit tests for CC version detection adapter (FR-α5)
 *
 * Covers L1 cases enumerated in
 *   docs/02-design/features/bkit-v2111-sprint-alpha.design.md §8.2
 *
 * @module test/unit/cc-version-checker.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const ccv = require('../../lib/infra/cc-version-checker');

test('parseVersion handles canonical semver', () => {
  assert.deepEqual(ccv.parseVersion('2.1.117'), [2, 1, 117]);
  assert.deepEqual(ccv.parseVersion('  2.1.118-beta '), [2, 1, 118]);
});

test('parseVersion returns null on malformed input', () => {
  assert.equal(ccv.parseVersion(null), null);
  assert.equal(ccv.parseVersion('not a version'), null);
  assert.equal(ccv.parseVersion(2), null);
});

test('compareVersion: newer > older', () => {
  assert.equal(ccv.compareVersion('2.1.117', '2.1.78'), 1);
  assert.equal(ccv.compareVersion('2.2.0', '2.1.999'), 1);
  assert.equal(ccv.compareVersion('3.0.0', '2.99.99'), 1);
});

test('compareVersion: older < newer', () => {
  assert.equal(ccv.compareVersion('2.1.78', '2.1.117'), -1);
  assert.equal(ccv.compareVersion('2.0.500', '2.1.0'), -1);
});

test('compareVersion: equal returns 0', () => {
  assert.equal(ccv.compareVersion('2.1.117', '2.1.117'), 0);
});

test('compareVersion: unparsable inputs fail-open as equal', () => {
  assert.equal(ccv.compareVersion('garbage', '2.1.117'), 0);
  assert.equal(ccv.compareVersion('2.1.117', null), 0);
});

test('listInactiveFeatures excludes features whose version <= current', () => {
  const inactive = ccv.listInactiveFeatures('2.1.78');
  assert.ok(Array.isArray(inactive));
  assert.ok(!inactive.includes('loopCommand'),
    'loopCommand requires 2.1.71, must be active at 2.1.78');
  assert.ok(inactive.includes('agentTeams'),
    'agentTeams requires 2.1.117, must be inactive at 2.1.78');
  assert.ok(inactive.includes('hookMcpToolDirect'),
    'hookMcpToolDirect requires 2.1.118, must be inactive at 2.1.78');
});

test('listInactiveFeatures returns empty list when current >= all required', () => {
  const inactive = ccv.listInactiveFeatures('9.9.9');
  assert.deepEqual(inactive, []);
});

test('listInactiveFeatures returns empty list on malformed current', () => {
  assert.deepEqual(ccv.listInactiveFeatures('garbage'), []);
});

test('FEATURE_VERSION_MAP is frozen and contains expected v2.1.118 keys', () => {
  assert.ok(Object.isFrozen(ccv.FEATURE_VERSION_MAP));
  assert.equal(ccv.FEATURE_VERSION_MAP.agentTeams, '2.1.117');
  assert.equal(ccv.FEATURE_VERSION_MAP.hookMcpToolDirect, '2.1.118');
  assert.equal(ccv.FEATURE_VERSION_MAP.pluginTagCommand, '2.1.118');
  assert.equal(ccv.FEATURE_VERSION_MAP.agentHookMultiEvent, '2.1.118');
});

test('checkCCVersion honors DISABLE_UPDATES env (F5 mitigation)', () => {
  const orig = process.env.DISABLE_UPDATES;
  process.env.DISABLE_UPDATES = '1';
  try {
    const r = ccv.checkCCVersion();
    assert.equal(r.skipped, true);
    assert.equal(r.reason, 'DISABLE_UPDATES env');
  } finally {
    if (orig === undefined) delete process.env.DISABLE_UPDATES;
    else process.env.DISABLE_UPDATES = orig;
  }
});

test('checkCCVersion returns a typed report when not skipped', () => {
  const orig = process.env.DISABLE_UPDATES;
  delete process.env.DISABLE_UPDATES;
  try {
    const r = ccv.checkCCVersion();
    // Either undetectable (current: null) or a structured severity result.
    if (r.current === null) {
      assert.equal(r.skipped, undefined);
    } else {
      assert.ok(['ok', 'warn', 'error'].includes(r.severity));
      assert.ok(Array.isArray(r.inactive));
      assert.equal(typeof r.recommended, 'string');
      assert.equal(typeof r.min, 'string');
    }
  } finally {
    if (orig === undefined) delete process.env.DISABLE_UPDATES;
    else process.env.DISABLE_UPDATES = orig;
  }
});

test('getCurrent returns either a parseable string or null', () => {
  const v = ccv.getCurrent();
  if (v !== null) {
    assert.equal(typeof v, 'string');
    assert.ok(ccv.parseVersion(v), `getCurrent returned non-parseable: ${v}`);
  }
});
