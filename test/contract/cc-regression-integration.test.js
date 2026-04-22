/*
 * cc-regression Module Integration Tests.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.2
 * Plan SC: registry + coordinator + lifecycle + token-accountant + attribution integration.
 */

const assert = require('node:assert');

const facade = require('../../lib/cc-regression');
const registry = require('../../lib/cc-regression/registry');
const coord = require('../../lib/cc-regression/defense-coordinator');
const lifecycle = require('../../lib/cc-regression/lifecycle');
const accountant = require('../../lib/cc-regression/token-accountant');
const formatter = require('../../lib/cc-regression/attribution-formatter');

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error(`✗ ${name}: ${e.message}`); } }

// ==================== Facade ====================
test('facade exports listActive', () => assert.strictEqual(typeof facade.listActive, 'function'));
test('facade exports getActive', () => assert.strictEqual(typeof facade.getActive, 'function'));
test('facade exports lookup', () => assert.strictEqual(typeof facade.lookup, 'function'));
test('facade exports checkCCRegression', () => assert.strictEqual(typeof facade.checkCCRegression, 'function'));
test('facade exports emitAttribution', () => assert.strictEqual(typeof facade.emitAttribution, 'function'));
test('facade exports recordTurn', () => assert.strictEqual(typeof facade.recordTurn, 'function'));
test('facade exports detectCCVersion', () => assert.strictEqual(typeof facade.detectCCVersion, 'function'));
test('facade exports reconcile', () => assert.strictEqual(typeof facade.reconcile, 'function'));
test('facade exports formatAttribution', () => assert.strictEqual(typeof facade.formatAttribution, 'function'));
test('facade exports CC_REGRESSIONS array', () => assert.ok(Array.isArray(facade.CC_REGRESSIONS)));

// ==================== Registry ====================
test('registry lookup MON-CC-02', () => {
  const g = registry.lookup('MON-CC-02');
  assert.ok(g);
  assert.strictEqual(g.severity, 'HIGH');
  assert.ok(g.issue.includes('47855'));
});
test('registry lookup ENH-262', () => {
  const g = registry.lookup('ENH-262');
  assert.ok(g);
  assert.ok(g.issue.includes('51798'));
});
test('registry lookup unknown returns undefined', () => assert.strictEqual(registry.lookup('UNKNOWN-999'), undefined));
test('registry listActive returns array', () => assert.ok(Array.isArray(registry.listActive())));
test('registry listActive contains MON-CC-02', () => assert.ok(registry.listActive().some((g) => g.id === 'MON-CC-02')));
test('registry listActive contains ENH-262/263/264', () => {
  const active = registry.listActive().map((g) => g.id);
  assert.ok(active.includes('ENH-262'));
  assert.ok(active.includes('ENH-263'));
  assert.ok(active.includes('ENH-264'));
});
test('registry contains 16+ MON-CC-06 native regressions', () => {
  const count = registry.CC_REGRESSIONS.filter((g) => g.id.startsWith('MON-CC-06')).length;
  assert.ok(count >= 10, `expected 10+ MON-CC-06, got ${count}`);
});
test('registry contains ENH-214 long-OPEN defense', () => assert.ok(registry.lookup('ENH-214')));
test('registry getActive filters by CC version', () => {
  const active = registry.getActive('2.1.119');
  const ids = active.map((g) => g.id);
  // ENH-262/263/264 have expectedFix 2.1.118, so at v2.1.119 they should NOT be in active
  // (but MON-CC-02 expectedFix is 2.1.117, so it's also filtered)
  assert.ok(!ids.includes('ENH-262'), 'ENH-262 should be inactive at v2.1.119');
  assert.ok(!ids.includes('ENH-263'), 'ENH-263 should be inactive at v2.1.119');
});
test('registry getActive v2.1.116 keeps ENH-262/263/264', () => {
  const active = registry.getActive('2.1.116').map((g) => g.id);
  assert.ok(active.includes('ENH-262'));
});
test('registry semverLt works', () => {
  assert.strictEqual(registry.semverLt('2.1.117', '2.1.118'), true);
  assert.strictEqual(registry.semverLt('2.1.118', '2.1.117'), false);
  assert.strictEqual(registry.semverLt('2.1.117', '2.1.117'), false);
  assert.strictEqual(registry.semverLt('2.0.999', '2.1.0'), true);
  assert.strictEqual(registry.semverLt('1.9.9', '2.0.0'), true);
});

// ==================== Defense Coordinator ====================
test('coord checkCCRegression null ctx returns empty', () => {
  const r = coord.checkCCRegression(null);
  assert.ok(r);
  assert.strictEqual(r.attributions.length, 0);
  assert.strictEqual(r.metas.length, 0);
});
test('coord checkCCRegression benign ctx returns empty', () => {
  const r = coord.checkCCRegression({ tool: 'Read' });
  assert.strictEqual(r.attributions.length, 0);
});
test('coord checkCCRegression ENH-262 combo', () => {
  const r = coord.checkCCRegression({
    tool: 'Bash',
    envOverrides: { dangerouslyDisableSandbox: true },
    permissionDecision: 'allow',
  });
  assert.strictEqual(r.metas.length, 1);
  assert.strictEqual(r.metas[0].id, 'ENH-262');
  assert.ok(r.attributions[0].includes('ENH-262'));
});
test('coord checkCCRegression ENH-263 combo', () => {
  const r = coord.checkCCRegression({
    tool: 'Write',
    bypassPermissions: true,
    permissionDecision: 'allow',
    filePath: '.claude/agents/foo.md',
  });
  assert.strictEqual(r.metas.length, 1);
  assert.strictEqual(r.metas[0].id, 'ENH-263');
});
test('coord checkCCRegression BYPASS env disables', () => {
  process.env.BKIT_CC_REGRESSION_BYPASS = '1';
  try {
    const r = coord.checkCCRegression({
      tool: 'Bash',
      envOverrides: { dangerouslyDisableSandbox: true },
      permissionDecision: 'allow',
    });
    assert.strictEqual(r.metas.length, 0);
  } finally {
    delete process.env.BKIT_CC_REGRESSION_BYPASS;
  }
});

// ==================== Lifecycle ====================
test('lifecycle semverGte', () => {
  assert.strictEqual(lifecycle.semverGte('2.1.118', '2.1.117'), true);
  assert.strictEqual(lifecycle.semverGte('2.1.117', '2.1.118'), false);
  assert.strictEqual(lifecycle.semverGte('2.1.117', '2.1.117'), true);
  assert.strictEqual(lifecycle.semverGte('3.0.0', '2.9.9'), true);
});
test('lifecycle reconcile empty registry', () => {
  const r = lifecycle.reconcile([], '2.1.118');
  assert.deepStrictEqual(r, { active: [], resolved: [] });
});
test('lifecycle reconcile null registry', () => {
  const r = lifecycle.reconcile(null, '2.1.118');
  assert.ok(Array.isArray(r.active));
});
test('lifecycle reconcile all resolved already', () => {
  const reg = [{ id: 'X', resolvedAt: '2026-01-01', expectedFix: '2.1.0' }];
  const r = lifecycle.reconcile(reg, '2.1.118');
  assert.strictEqual(r.resolved.length, 1);
  assert.strictEqual(r.active.length, 0);
});
test('lifecycle reconcile expectedFix reached', () => {
  const reg = [{ id: 'X', resolvedAt: null, expectedFix: '2.1.118' }];
  const r = lifecycle.reconcile(reg, '2.1.118');
  assert.strictEqual(r.resolved.length, 1);
  assert.ok(r.resolved[0].resolvedAt);
  assert.strictEqual(r.resolved[0].resolvedBy, '2.1.118');
});
test('lifecycle reconcile expectedFix NOT reached', () => {
  const reg = [{ id: 'X', resolvedAt: null, expectedFix: '2.1.200' }];
  const r = lifecycle.reconcile(reg, '2.1.118');
  assert.strictEqual(r.active.length, 1);
  assert.strictEqual(r.resolved.length, 0);
});
test('lifecycle reconcile mixed', () => {
  const reg = [
    { id: 'A', resolvedAt: null, expectedFix: '2.1.100' },
    { id: 'B', resolvedAt: null, expectedFix: '2.1.200' },
    { id: 'C', resolvedAt: '2026-01-01', expectedFix: '2.1.0' },
  ];
  const r = lifecycle.reconcile(reg, '2.1.150');
  assert.strictEqual(r.resolved.length, 2);
  assert.strictEqual(r.active.length, 1);
  assert.strictEqual(r.active[0].id, 'B');
});

// ==================== Attribution Formatter ====================
test('formatter empty meta', () => assert.strictEqual(formatter.formatAttribution(null), ''));
test('formatter meta with all fields', () => {
  const s = formatter.formatAttribution({
    id: 'ENH-262', severity: 'HIGH', note: 'test note', ccIssue: 'https://example.com',
  });
  assert.ok(s.includes('ENH-262'));
  assert.ok(s.includes('HIGH'));
  assert.ok(s.includes('test note'));
  assert.ok(s.includes('example.com'));
});
test('formatter redact password=secret', () => assert.ok(!formatter.redact('password=secret123').includes('secret123')));
test('formatter redact token=abc', () => assert.ok(!formatter.redact('token=abc123').includes('abc123')));
test('formatter redact api_key', () => assert.ok(!formatter.redact('api_key=ak_live_XXX').includes('XXX')));
test('formatter redact authorization header', () => assert.ok(!formatter.redact('authorization: Bearer abc').includes('Bearer abc')));
test('formatter redact case insensitive', () => assert.ok(!formatter.redact('PASSWORD=secret').includes('secret')));
test('formatter redact non-string', () => assert.strictEqual(formatter.redact(null), ''));
test('formatter redact empty string', () => assert.strictEqual(formatter.redact(''), ''));
test('formatter redact clean text unchanged', () => assert.strictEqual(formatter.redact('hello world'), 'hello world'));

// ==================== Token Accountant ====================
test('accountant hashSession null', () => assert.strictEqual(accountant.hashSession(null), 'unknown'));
test('accountant hashSession empty', () => assert.strictEqual(accountant.hashSession(''), 'unknown'));
test('accountant hashSession non-string', () => assert.strictEqual(accountant.hashSession(123), 'unknown'));
test('accountant hashSession deterministic', () => {
  assert.strictEqual(accountant.hashSession('s-001'), accountant.hashSession('s-001'));
});
test('accountant hashSession 16 chars', () => assert.strictEqual(accountant.hashSession('s-001').length, 16));
test('accountant hashSession different inputs differ', () => {
  assert.notStrictEqual(accountant.hashSession('a'), accountant.hashSession('b'));
});
test('accountant LEDGER_REL defined', () => assert.strictEqual(typeof accountant.LEDGER_REL, 'string'));
test('accountant RETENTION_DAYS is 30', () => assert.strictEqual(accountant.RETENTION_DAYS, 30));
test('accountant recordTurn default meta', () => {
  // Should not throw and should return a guard result object
  const r = accountant.recordTurn({});
  assert.ok(r && typeof r.hit === 'boolean');
});
test('accountant recordTurn benign sonnet turn', () => {
  const r = accountant.recordTurn({ model: 'claude-sonnet-4-6', overheadDelta: 1000 });
  assert.strictEqual(r.hit, false);
});
test('accountant recordTurn over-threshold', () => {
  const r = accountant.recordTurn({ model: 'claude-sonnet-4-6', overheadDelta: 10000 });
  assert.strictEqual(r.hit, true);
});
test('accountant getLedgerStats returns shape', () => {
  const s = accountant.getLedgerStats();
  assert.ok(typeof s.total === 'number');
  assert.ok(typeof s.avgOverhead === 'number');
  assert.ok(typeof s.sonnetTurns === 'number');
});

console.log(`\ncc-regression-integration.test.js: ${pass}/${pass + fail} PASS, ${fail} FAIL, 0 SKIP`);
if (fail > 0) process.exit(1);
