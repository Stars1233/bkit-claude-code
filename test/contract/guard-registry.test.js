/*
 * Guard Registry validation tests — Sprint 3 CI Gate fixture.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §6
 * Plan SC: every registry entry is structurally sound before lifecycle trusts it.
 */

const assert = require('node:assert');
const registry = require('../../lib/cc-regression/registry');

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error(`✗ ${name}: ${e.message}`); } }

const ALLOWED_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SEMVER_RE = /^\d+\.\d+\.(\d+|x)$/;
const ISSUE_URL_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/;

const guards = registry.CC_REGRESSIONS;

// ============================================================
// Overall registry sanity
// ============================================================
test('registry is non-empty', () => assert.ok(guards.length > 0));
test('registry has ≥19 guards (Design §6 floor)', () => assert.ok(guards.length >= 19));
test('registry.listActive is function', () => assert.strictEqual(typeof registry.listActive, 'function'));
test('registry.getActive is function', () => assert.strictEqual(typeof registry.getActive, 'function'));
test('registry.lookup is function', () => assert.strictEqual(typeof registry.lookup, 'function'));
test('registry.semverLt is function', () => assert.strictEqual(typeof registry.semverLt, 'function'));

// ============================================================
// Uniqueness
// ============================================================
test('no duplicate guard IDs', () => {
  const seen = new Set();
  const dups = [];
  for (const g of guards) {
    if (seen.has(g.id)) dups.push(g.id);
    seen.add(g.id);
  }
  assert.deepStrictEqual(dups, []);
});
test('no duplicate issue URLs', () => {
  const seen = new Set();
  const dups = [];
  for (const g of guards) {
    if (g.issue && seen.has(g.issue)) dups.push(g.issue);
    seen.add(g.issue);
  }
  assert.deepStrictEqual(dups, []);
});

// ============================================================
// Per-guard structural validation (N * K assertions)
// ============================================================
guards.forEach((g) => {
  test(`${g.id}: id is string`, () => assert.strictEqual(typeof g.id, 'string'));
  test(`${g.id}: id non-empty`, () => assert.ok(g.id.length > 0));
  test(`${g.id}: issue is string`, () => assert.strictEqual(typeof g.issue, 'string'));
  test(`${g.id}: issue is github.com URL`, () => assert.ok(ISSUE_URL_RE.test(g.issue)));
  test(`${g.id}: severity in enum`, () => assert.ok(ALLOWED_SEVERITIES.includes(g.severity)));
  test(`${g.id}: since is string`, () => assert.strictEqual(typeof g.since, 'string'));
  test(`${g.id}: since semver-ish`, () => assert.ok(SEMVER_RE.test(g.since)));
  test(`${g.id}: expectedFix null or semver`, () => {
    assert.ok(g.expectedFix === null || SEMVER_RE.test(g.expectedFix));
  });
  test(`${g.id}: affectedFiles is array`, () => assert.ok(Array.isArray(g.affectedFiles)));
  test(`${g.id}: resolvedAt null or ISO`, () => {
    assert.ok(g.resolvedAt === null || /^\d{4}-\d{2}-\d{2}T/.test(g.resolvedAt));
  });
  test(`${g.id}: notes is string`, () => assert.strictEqual(typeof g.notes, 'string'));
});

// ============================================================
// MON-CC-02 + ENH-262/263/264 + v2.1.113 native regressions present
// ============================================================
const REQUIRED_IDS = [
  'MON-CC-02',
  'ENH-262',
  'ENH-263',
  'ENH-264',
  'MON-CC-06-51165',
  'MON-CC-06-50383',
  'MON-CC-06-50384',
];
REQUIRED_IDS.forEach((id) => {
  test(`required guard '${id}' present`, () => assert.ok(registry.lookup(id), `missing ${id}`));
});

// ============================================================
// getActive filters by CC version correctly
// ============================================================
test('getActive at v2.1.117 includes ENH-262', () => {
  const ids = registry.getActive('2.1.117').map((g) => g.id);
  assert.ok(ids.includes('ENH-262'));
});
test('getActive at v2.1.118 excludes ENH-262 (expectedFix reached)', () => {
  const ids = registry.getActive('2.1.118').map((g) => g.id);
  assert.ok(!ids.includes('ENH-262'));
});
test('getActive at v2.1.117 includes ENH-263', () => {
  assert.ok(registry.getActive('2.1.117').some((g) => g.id === 'ENH-263'));
});
test('getActive at v2.1.118 excludes ENH-263', () => {
  assert.ok(!registry.getActive('2.1.118').some((g) => g.id === 'ENH-263'));
});
test('getActive at v2.1.117 includes ENH-264', () => {
  assert.ok(registry.getActive('2.1.117').some((g) => g.id === 'ENH-264'));
});
test('getActive keeps guards with null expectedFix at any version', () => {
  const someNullGuard = guards.find((g) => g.expectedFix === null);
  if (!someNullGuard) return; // none present
  const ids = registry.getActive('99.99.99').map((g) => g.id);
  assert.ok(ids.includes(someNullGuard.id));
});

// ============================================================
// Severity distribution sanity (HIGH >= 4, reflects #51798/51801/51809 + MON-CC-06 HIGH subset)
// ============================================================
test('registry contains ≥4 HIGH severity guards', () => {
  const highCount = guards.filter((g) => g.severity === 'HIGH').length;
  assert.ok(highCount >= 4, `expected ≥4 HIGH, got ${highCount}`);
});
test('registry contains ≥3 MEDIUM severity guards', () => {
  assert.ok(guards.filter((g) => g.severity === 'MEDIUM').length >= 3);
});

// ============================================================
// notes non-empty for triage readiness
// ============================================================
guards.forEach((g) => {
  test(`${g.id}: notes length > 0`, () => assert.ok(g.notes && g.notes.length > 0));
});

console.log(`\nguard-registry.test.js: ${pass}/${pass + fail} PASS, ${fail} FAIL, 0 SKIP`);
if (fail > 0) process.exit(1);
