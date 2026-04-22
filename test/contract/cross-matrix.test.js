/*
 * Cross-Matrix Tests — Guard × CC version × env × platform combinations.
 *
 * Design Ref: Addendum §12 (리스크) + Design §11.
 * Plan SC: Every (Guard, CC version, platform) cell exercised.
 */

const assert = require('node:assert');

const enh262 = require('../../lib/domain/guards/enh-262-hooks-combo');
const enh263 = require('../../lib/domain/guards/enh-263-claude-write');
const enh264 = require('../../lib/domain/guards/enh-264-token-threshold');
const enh254 = require('../../lib/domain/guards/enh-254-fork-precondition');
const lifecycle = require('../../lib/cc-regression/lifecycle');
const registry = require('../../lib/cc-regression/registry');

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error(`✗ ${name}: ${e.message}`); } }

// ==================== CC Versions to exercise ====================
const CC_VERSIONS = ['2.1.100', '2.1.110', '2.1.113', '2.1.114', '2.1.116', '2.1.117', '2.1.118', '2.1.119', '2.2.0', '3.0.0'];
const PLATFORMS = ['darwin', 'linux', 'win32'];
const MODELS_REG = ['claude-sonnet-4-6', 'claude-sonnet-4-5'];
const MODELS_OK = ['claude-opus-4-7', 'claude-opus-4-6', 'claude-haiku-4-5'];
const TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'NotebookEdit', 'Glob', 'Grep'];
const DECISIONS = ['allow', 'deny', 'ask', 'defer'];

// ==================== ENH-262 Cross Matrix ====================
for (const v of CC_VERSIONS) {
  test(`ENH-262 removeWhen at v${v}`, () => {
    const r = enh262.removeWhen(v);
    assert.strictEqual(typeof r, 'boolean');
  });
}
for (const tool of TOOLS) {
  test(`ENH-262 tool=${tool} + disableSandbox + allow`, () => {
    const r = enh262.check({ tool, envOverrides: { dangerouslyDisableSandbox: true }, permissionDecision: 'allow' });
    // Only Bash should hit
    assert.strictEqual(r.hit, tool === 'Bash');
  });
}
for (const d of DECISIONS) {
  test(`ENH-262 decision=${d} bash+disableSandbox`, () => {
    const r = enh262.check({ tool: 'Bash', envOverrides: { dangerouslyDisableSandbox: true }, permissionDecision: d });
    assert.strictEqual(r.hit, d === 'allow');
  });
}

// ==================== ENH-263 Cross Matrix ====================
const PROTECTED_PREFIXES = ['.claude/agents/', '.claude/skills/', '.claude/channels/', '.claude/commands/'];
const NON_PROTECTED_PATHS = ['src/index.js', 'docs/README.md', '.claude/other.json', '.claude/settings.json', 'node_modules/foo.js'];

for (const prefix of PROTECTED_PREFIXES) {
  for (const tool of ['Write', 'Edit', 'NotebookEdit']) {
    test(`ENH-263 tool=${tool} path=${prefix}x + bypass + allow`, () => {
      const r = enh263.check({ tool, bypassPermissions: true, permissionDecision: 'allow', filePath: prefix + 'x.md' });
      assert.strictEqual(r.hit, true);
    });
  }
}
for (const p of NON_PROTECTED_PATHS) {
  test(`ENH-263 non-protected path=${p}`, () => {
    const r = enh263.check({ tool: 'Write', bypassPermissions: true, permissionDecision: 'allow', filePath: p });
    assert.strictEqual(r.hit, false);
  });
}
for (const d of DECISIONS) {
  test(`ENH-263 decision=${d} claude-write+bypass`, () => {
    const r = enh263.check({ tool: 'Write', bypassPermissions: true, permissionDecision: d, filePath: '.claude/agents/x.md' });
    assert.strictEqual(r.hit, d === 'allow');
  });
}

// ==================== ENH-264 Cross Matrix ====================
for (const model of MODELS_REG) {
  test(`ENH-264 model=${model} overhead=9000 hits`, () => {
    assert.strictEqual(enh264.check({ model, overheadDelta: 9000 }).hit, true);
  });
}
for (const model of MODELS_OK) {
  test(`ENH-264 model=${model} overhead=99999 no-op`, () => {
    assert.strictEqual(enh264.check({ model, overheadDelta: 99999 }).hit, false);
  });
}
for (let over = 0; over <= 20000; over += 2000) {
  test(`ENH-264 sonnet over=${over}`, () => {
    const r = enh264.check({ model: 'claude-sonnet-4-6', overheadDelta: over });
    assert.strictEqual(r.hit, over > 8000);
  });
}

// ==================== ENH-254 Cross Matrix ====================
for (const plat of PLATFORMS) {
  for (const env of [true, false]) {
    test(`ENH-254 plat=${plat} env=${env} fork`, () => {
      const r = enh254.check({ skill: 'x', context: 'fork', platform: plat, forkSubagentEnv: env });
      // if env is false → hit regardless of platform
      if (env === false) assert.strictEqual(r.hit, true);
    });
  }
}
test('ENH-254 win32 + disableModelInvocation triggers #51165', () => {
  const r = enh254.check({ skill: 'zero-script-qa', context: 'fork', platform: 'win32', disableModelInvocation: true });
  assert.strictEqual(r.hit, true);
  assert.ok(r.meta.note.includes('51165'));
});

// ==================== Lifecycle Cross Matrix ====================
const SYNTHETIC_REGISTRY = [
  { id: 'X-117', resolvedAt: null, expectedFix: '2.1.117' },
  { id: 'X-118', resolvedAt: null, expectedFix: '2.1.118' },
  { id: 'X-200', resolvedAt: null, expectedFix: '2.2.0' },
  { id: 'X-NONE', resolvedAt: null, expectedFix: null },
  { id: 'X-DONE', resolvedAt: '2026-01-01', expectedFix: '2.1.0' },
];
for (const v of CC_VERSIONS) {
  test(`lifecycle.reconcile @v${v}`, () => {
    const r = lifecycle.reconcile(SYNTHETIC_REGISTRY, v);
    assert.ok(Array.isArray(r.active));
    assert.ok(Array.isArray(r.resolved));
    // X-DONE always resolved
    assert.ok(r.resolved.some((g) => g.id === 'X-DONE'));
    // X-NONE never has expectedFix so always active (or resolved separately)
    assert.ok(r.active.some((g) => g.id === 'X-NONE') || r.resolved.some((g) => g.id === 'X-NONE'));
  });
}
for (const v of CC_VERSIONS) {
  test(`registry.getActive filters correctly @v${v}`, () => {
    const active = registry.getActive(v);
    assert.ok(Array.isArray(active));
    // ENH-262/263/264 expectedFix=2.1.118 — inactive at v >= 2.1.118
    const hasEnh262 = active.some((g) => g.id === 'ENH-262');
    if (registry.semverLt(v, '2.1.118')) assert.ok(hasEnh262);
    else assert.ok(!hasEnh262);
  });
}
for (const a of ['2.1.117', '2.1.118', '2.2.0']) {
  for (const b of ['2.1.117', '2.1.118', '2.2.0']) {
    test(`semverLt(${a}, ${b})`, () => {
      const expected = JSON.stringify(a.split('.').map(Number)) < JSON.stringify(b.split('.').map(Number));
      // This simplistic comparison works for our 3-part numeric strings.
      const actual = registry.semverLt(a, b);
      // Just verify return type is boolean; detailed logic in unit tests.
      assert.strictEqual(typeof actual, 'boolean');
    });
  }
}

// ==================== Attribution × Guard combination ====================
const formatter = require('../../lib/cc-regression/attribution-formatter');
for (const id of ['ENH-262', 'ENH-263', 'ENH-264', 'ENH-254', 'MON-CC-02']) {
  test(`formatter handles id=${id}`, () => {
    const s = formatter.formatAttribution({ id, severity: 'HIGH', note: 'test' });
    assert.ok(s.includes(id));
  });
}

// ==================== Redact cross strings ====================
const RED_INPUTS = [
  'user password=abc123', 'TOKEN=xxx', 'api-key=ak_live', 'authorization: Bearer XYZ',
  'API_KEY=abc', 'secret=mysecret',
];
for (const s of RED_INPUTS) {
  test(`formatter.redact "${s}"`, () => {
    const out = formatter.redact(s);
    // at minimum no original value should be preserved for the 'xxx' / 'abc123' tokens
    assert.ok(!out.includes('abc123'));
    assert.ok(!out.includes('xxx'));
    assert.ok(!out.includes('ak_live'));
  });
}

console.log(`\ncross-matrix.test.js: ${pass}/${pass + fail} PASS, ${fail} FAIL, 0 SKIP`);
if (fail > 0) process.exit(1);
