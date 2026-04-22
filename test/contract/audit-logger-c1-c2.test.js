/*
 * audit-logger C1/C2 regression tests — v2.1.10 Critical fixes.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §4.3
 * Plan SC: C1 dead option + C2 details sanitizer must not regress.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const al = require('../../lib/audit/audit-logger');

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error(`✗ ${name}: ${e.message}`); } }

// ==================== C1: readAuditLogs startDate dead option ====================
test('C1 readAuditLogs accepts date option', () => {
  const logs = al.readAuditLogs({ date: new Date().toISOString().slice(0, 10) });
  assert.ok(Array.isArray(logs));
});
test('C1 readAuditLogs ignores startDate (no throw)', () => {
  // Old code silently accepted startDate; new code should still not throw for back-compat.
  const logs = al.readAuditLogs({ startDate: '2026-04-22' });
  assert.ok(Array.isArray(logs));
});
test('C1 getSessionStats returns shape', () => {
  const s = al.getSessionStats();
  assert.ok(typeof s.totalActions === 'number');
  assert.ok(typeof s.byCategory === 'object');
  assert.ok(typeof s.byResult === 'object');
});
test('C1 readAuditLogs empty options', () => assert.ok(Array.isArray(al.readAuditLogs())));
test('C1 readAuditLogs bogus filters', () => assert.ok(Array.isArray(al.readAuditLogs({ category: 'nonexistent' }))));

// ==================== C2: details sanitizer ====================
// We cannot easily unit-test `normalizeEntry` because it's not exported, but we can
// check the surface contract via writeAuditLog + readAuditLogs in a temp scope.
const TMP = path.join(__dirname, '.tmp-audit');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

// Simulate writeAuditLog by writing a sample and reading back.
function simulateWriteAndRead(entry) {
  // Use the real writeAuditLog; it writes to .bkit/audit/. Read back via readAuditLogs.
  al.writeAuditLog(entry);
  const logs = al.readAuditLogs({ date: new Date().toISOString().slice(0, 10) });
  return logs[logs.length - 1];
}

test('C2 password key redacted', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { password: 'secret123' } });
  assert.ok(e);
  assert.strictEqual(e.details.password, '[REDACTED]');
});
test('C2 secret key redacted', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { secret: 'value' } });
  assert.strictEqual(e.details.secret, '[REDACTED]');
});
test('C2 token key redacted', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { token: 'tok_xyz' } });
  assert.strictEqual(e.details.token, '[REDACTED]');
});
test('C2 apiKey redacted', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { apiKey: 'ak_live' } });
  assert.strictEqual(e.details.apiKey, '[REDACTED]');
});
test('C2 authorization header redacted', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { authorization: 'Bearer abc' } });
  assert.strictEqual(e.details.authorization, '[REDACTED]');
});
test('C2 cookie redacted', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { cookie: 'sid=xyz' } });
  assert.strictEqual(e.details.cookie, '[REDACTED]');
});
test('C2 session_key redacted', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { session_key: 'sk' } });
  assert.strictEqual(e.details.session_key, '[REDACTED]');
});
test('C2 private_key redacted', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { private_key: 'pk' } });
  assert.strictEqual(e.details.private_key, '[REDACTED]');
});
test('C2 benign key NOT redacted', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { featureName: 'auth' } });
  assert.strictEqual(e.details.featureName, 'auth');
});
test('C2 long string truncated', () => {
  const long = 'x'.repeat(1000);
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { blob: long } });
  assert.ok(e.details.blob.length < 1000);
  assert.ok(e.details.blob.endsWith('[truncated]'));
});
test('C2 short string unchanged', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { msg: 'hello' } });
  assert.strictEqual(e.details.msg, 'hello');
});
test('C2 nested password redacted', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { config: { password: 'nested_secret' } } });
  assert.strictEqual(e.details.config.password, '[REDACTED]');
});
test('C2 case insensitive Password', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { Password: 'X' } });
  assert.strictEqual(e.details.Password, '[REDACTED]');
});
test('C2 case insensitive PASSWORD', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { PASSWORD: 'X' } });
  assert.strictEqual(e.details.PASSWORD, '[REDACTED]');
});
test('C2 non-object details becomes {}', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: 'invalid' });
  assert.deepStrictEqual(e.details, {});
});
test('C2 null details becomes {}', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: null });
  assert.deepStrictEqual(e.details, {});
});
test('C2 undefined details becomes {}', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca' });
  assert.deepStrictEqual(e.details, {});
});
test('C2 array details becomes {} (not an object)', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: [1, 2, 3] });
  assert.deepStrictEqual(e.details, {});
});
test('C2 boolean preserved', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { flag: true } });
  assert.strictEqual(e.details.flag, true);
});
test('C2 number preserved', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { count: 42 } });
  assert.strictEqual(e.details.count, 42);
});
test('C2 null value preserved', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca', details: { nothing: null } });
  assert.strictEqual(e.details.nothing, null);
});

// ==================== Constants stability ====================
test('ACTION_TYPES not empty', () => assert.ok(al.ACTION_TYPES.length > 0));
test('CATEGORIES includes pdca', () => assert.ok(al.CATEGORIES.includes('pdca')));
test('CATEGORIES includes permission', () => assert.ok(al.CATEGORIES.includes('permission')));
test('RESULTS includes success/failure', () => {
  assert.ok(al.RESULTS.includes('success'));
  assert.ok(al.RESULTS.includes('failure'));
});
test('ACTORS includes user/agent/system/hook', () => {
  ['user', 'agent', 'system', 'hook'].forEach((a) => assert.ok(al.ACTORS.includes(a)));
});
test('BLAST_RADII includes critical', () => assert.ok(al.BLAST_RADII.includes('critical')));
test('BKIT_VERSION exported', () => assert.strictEqual(typeof al.BKIT_VERSION, 'string'));
test('logControl is function', () => assert.strictEqual(typeof al.logControl, 'function'));
test('logPermission is function', () => assert.strictEqual(typeof al.logPermission, 'function'));
test('logCheckpoint is function', () => assert.strictEqual(typeof al.logCheckpoint, 'function'));
test('logPdca is function', () => assert.strictEqual(typeof al.logPdca, 'function'));
test('logTrust is function', () => assert.strictEqual(typeof al.logTrust, 'function'));
test('logSystem is function', () => assert.strictEqual(typeof al.logSystem, 'function'));
test('generateUUID is function', () => assert.strictEqual(typeof al.generateUUID, 'function'));
test('generateUUID produces valid string', () => {
  const u = al.generateUUID();
  assert.strictEqual(typeof u, 'string');
  assert.ok(u.length > 0);
});
test('generateUUID unique', () => assert.notStrictEqual(al.generateUUID(), al.generateUUID()));

// ==================== Version compatibility ====================
test('bkitVersion field in normalized entry', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca' });
  assert.ok(e.bkitVersion);
});
test('id field in normalized entry', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca' });
  assert.ok(e.id);
});
test('timestamp is ISO string', () => {
  const e = simulateWriteAndRead({ action: 'feature_created', category: 'pdca' });
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(e.timestamp));
});

console.log(`\naudit-logger-c1-c2.test.js: ${pass}/${pass + fail} PASS, ${fail} FAIL, 0 SKIP`);
if (fail > 0) process.exit(1);
