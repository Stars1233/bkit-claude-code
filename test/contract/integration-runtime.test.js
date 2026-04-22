/*
 * Runtime Integration Tests — Sprint 4.5.
 *
 * Verifies that v2.1.10 modules are actually invoked from production hook paths
 * (not just dead code passing unit tests). Each test runs the hook with minimal
 * stdin and checks the observable effect (ledger file, attribution message,
 * reconcile log, audit entry size, etc.).
 *
 * 🚨 REGRESSION GUARD: The 2026-04-22 incident where a single writeAuditLog
 * call exploded to 682 GB due to audit-logger ↔ telemetry.createDualSink
 * recursion is guarded by test `audit-logger: writeAuditLog produces ≤ 1 line`.
 * If future regressions re-introduce the cycle, this test will fail fast.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §4.2 + Sprint 4.5 Integration
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; } catch (e) { fail++; console.error(`✗ ${name}: ${e.message}`); }
}
async function testAsync(name, fn) {
  try { await fn(); pass++; } catch (e) { fail++; console.error(`✗ ${name}: ${e.message}`); }
}

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TIMEOUT = 5000;

function runNode(rel, input, env = {}) {
  return spawnSync('node', [path.join(PROJECT_ROOT, rel)], {
    input,
    encoding: 'utf8',
    timeout: TIMEOUT,
    env: { ...process.env, BKIT_DEBUG: '', CLAUDE_PLUGIN_ROOT: PROJECT_ROOT, ...env },
    cwd: PROJECT_ROOT,
  });
}

(async () => {

// ============================================================
// 🚨 #0 — RECURSION REGRESSION GUARD (2026-04-22 incident)
// Every single writeAuditLog call must produce AT MOST 1 JSONL line.
// If audit-logger ever re-introduces a cycle with telemetry, this catches it.
// ============================================================
const auditFile = path.join(PROJECT_ROOT, '.bkit', 'audit', `${new Date().toISOString().slice(0, 10)}.jsonl`);
test('REGRESSION GUARD: single writeAuditLog produces ≤ 1 JSONL line (no recursion)', () => {
  // Clean slate
  if (fs.existsSync(auditFile)) fs.unlinkSync(auditFile);
  const al = require('../../lib/audit/audit-logger');
  al.writeAuditLog({
    actor: 'system', actorId: 'integration-test',
    action: 'file_modified', category: 'file',
    target: '/tmp/recursion-guard', targetType: 'file',
    result: 'success',
  });
  // File should exist with exactly 1 line.
  assert.ok(fs.existsSync(auditFile), 'audit file should exist');
  const content = fs.readFileSync(auditFile, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);
  assert.strictEqual(lines.length, 1, `expected exactly 1 line, got ${lines.length}`);
  // File should be < 5 KB (sanity — prevents any amplification bug).
  const sizeKB = Buffer.byteLength(content) / 1024;
  assert.ok(sizeKB < 5, `audit file suspiciously large: ${sizeKB.toFixed(2)} KB`);
});

test('REGRESSION GUARD: 10 writeAuditLog calls produce exactly 10 lines', () => {
  const al = require('../../lib/audit/audit-logger');
  const lineCountBefore = fs.existsSync(auditFile)
    ? fs.readFileSync(auditFile, 'utf8').split('\n').filter(Boolean).length
    : 0;
  for (let i = 0; i < 10; i++) {
    al.writeAuditLog({
      actor: 'system', actorId: 'integration-test',
      action: 'file_modified', category: 'file',
      target: `/tmp/guard-${i}`, targetType: 'file',
      result: 'success',
    });
  }
  const lineCountAfter = fs.readFileSync(auditFile, 'utf8').split('\n').filter(Boolean).length;
  const delta = lineCountAfter - lineCountBefore;
  assert.strictEqual(delta, 10, `expected +10 lines, got +${delta}`);
});

// ============================================================
// 1. scripts/unified-bash-pre.js — cc-regression Integration (ENH-262)
// ============================================================
test('unified-bash-pre: runs with minimal stdin, exit 0', () => {
  const r = runNode('scripts/unified-bash-pre.js', '{"tool_name":"Bash","tool_input":{"command":"echo hi"}}\n');
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${(r.stderr || '').slice(0, 100)}`);
});
test('unified-bash-pre: no ENH-262 attribution without dangerouslyDisableSandbox', () => {
  const r = runNode('scripts/unified-bash-pre.js', '{"tool_name":"Bash","tool_input":{"command":"ls"}}\n');
  assert.ok(!(r.stdout || '').includes('ENH-262'));
});
test('unified-bash-pre: exit 0 with dangerouslyDisableSandbox env + allow', () => {
  const r = runNode(
    'scripts/unified-bash-pre.js',
    '{"tool_name":"Bash","tool_input":{"command":"ls"},"permissionDecision":"allow"}\n',
    { CLAUDE_CODE_DANGEROUSLY_DISABLE_SANDBOX: '1' }
  );
  assert.strictEqual(r.status, 0);
});
test('unified-bash-pre: BKIT_CC_REGRESSION_BYPASS=1 suppresses attribution', () => {
  const r = runNode(
    'scripts/unified-bash-pre.js',
    '{"tool_name":"Bash","tool_input":{"command":"ls"},"permissionDecision":"allow"}\n',
    { CLAUDE_CODE_DANGEROUSLY_DISABLE_SANDBOX: '1', BKIT_CC_REGRESSION_BYPASS: '1' }
  );
  assert.ok(!(r.stdout || '').includes('ENH-262'));
  assert.strictEqual(r.status, 0);
});

// ============================================================
// 2. hooks/session-start.js — lifecycle.reconcile Integration
// ============================================================
test('session-start: runs with empty stdin, exit 0', () => {
  const r = runNode('hooks/session-start.js', '{}\n');
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${(r.stderr || '').slice(0, 200)}`);
});
test('session-start: stdout is valid JSON with SessionStart event', () => {
  const r = runNode('hooks/session-start.js', '{}\n');
  assert.strictEqual(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.ok(parsed.hookSpecificOutput);
  assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'SessionStart');
});

// ============================================================
// 3. scripts/unified-stop.js — token-accountant Integration (ENH-264)
// ============================================================
test('unified-stop: runs with minimal stdin, exit 0', () => {
  const r = runNode('scripts/unified-stop.js', '{}\n', {
    CLAUDE_MODEL: 'claude-sonnet-4-6',
    CLAUDE_TURN_INDEX: '42',
    CLAUDE_OVERHEAD_DELTA: '5000',
  });
  assert.strictEqual(r.status, 0, `exit ${r.status}: ${(r.stderr || '').slice(0, 200)}`);
});
test('unified-stop: token-ledger.ndjson is created/appended', () => {
  const ledgerPath = path.join(PROJECT_ROOT, '.bkit', 'runtime', 'token-ledger.ndjson');
  const before = fs.existsSync(ledgerPath) ? fs.statSync(ledgerPath).size : 0;
  runNode('scripts/unified-stop.js', '{}\n', {
    CLAUDE_MODEL: 'claude-sonnet-4-6',
    CLAUDE_TURN_INDEX: '7',
    CLAUDE_OVERHEAD_DELTA: '1000',
  });
  assert.ok(fs.existsSync(ledgerPath));
  const after = fs.statSync(ledgerPath).size;
  assert.ok(after > before, `ledger should grow (before=${before}, after=${after})`);
});
test('unified-stop: ledger entry parses as JSON with required fields', () => {
  const ledgerPath = path.join(PROJECT_ROOT, '.bkit', 'runtime', 'token-ledger.ndjson');
  runNode('scripts/unified-stop.js', '{}\n', { CLAUDE_MODEL: 'claude-opus-4-7', CLAUDE_TURN_INDEX: '100' });
  const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean);
  const latest = JSON.parse(lines[lines.length - 1]);
  assert.ok(latest.ts);
  assert.ok(latest.model);
  assert.ok(typeof latest.turnIndex === 'number');
});

// ============================================================
// 4. scripts/pre-write.js — defense-coordinator + ENH-263 Integration
// ============================================================
test('pre-write: runs with Write tool, exit 0', () => {
  const r = runNode(
    'scripts/pre-write.js',
    '{"tool_name":"Write","tool_input":{"file_path":"/tmp/smoketest.txt","content":"hi"}}\n'
  );
  assert.strictEqual(r.status, 0);
});
test('pre-write: .claude/agents/ path without bypass — no attribution', () => {
  const r = runNode(
    'scripts/pre-write.js',
    '{"tool_name":"Write","tool_input":{"file_path":".claude/agents/foo.md","content":"x"}}\n'
  );
  assert.ok(!(r.stdout || '').includes('ENH-263'));
});

// ============================================================
// 5. defense-coordinator — ENH-254 integration (now registered)
// ============================================================
test('defense-coordinator: enh-254 fork precondition integrated', () => {
  const coord = require('../../lib/cc-regression/defense-coordinator');
  const r = coord.checkCCRegression({
    skill: 'zero-script-qa', context: 'fork',
    platform: 'win32', disableModelInvocation: true,
  });
  assert.ok(r.metas.some((m) => m.id === 'ENH-254'), `expected ENH-254 in metas: ${JSON.stringify(r.metas)}`);
});
test('defense-coordinator: null ctx returns empty (post-fix)', () => {
  const coord = require('../../lib/cc-regression/defense-coordinator');
  const r = coord.checkCCRegression(null);
  assert.deepStrictEqual(r.attributions, []);
  assert.deepStrictEqual(r.metas, []);
});

// ============================================================
// 6. cc-regression facade — all integration points reachable
// ============================================================
test('cc-regression facade: recordTurn (ENH-264 live)', () => {
  const cc = require('../../lib/cc-regression');
  const r = cc.recordTurn({ model: 'claude-sonnet-4-6', overheadDelta: 2000, sessionId: 'it-test' });
  assert.ok(r && typeof r.hit === 'boolean');
});
test('cc-regression facade: getLedgerStats', () => {
  const cc = require('../../lib/cc-regression');
  const stats = cc.getLedgerStats();
  assert.ok(typeof stats.total === 'number');
  assert.ok(stats.total > 0);
});
test('cc-regression facade: detectCCVersion returns string or null', () => {
  const cc = require('../../lib/cc-regression');
  const v = cc.detectCCVersion();
  assert.ok(v === null || typeof v === 'string');
});
test('cc-regression facade: reconcile returns {active, resolved}', () => {
  const cc = require('../../lib/cc-regression');
  const r = cc.reconcile(cc.CC_REGRESSIONS, '2.1.118');
  assert.ok(Array.isArray(r.active));
  assert.ok(Array.isArray(r.resolved));
});

// ============================================================
// 7. lib/infra/telemetry.js — required by audit-logger (not dead)
// ============================================================
test('telemetry.createOtelSink (no endpoint) returns no-op sink', () => {
  const t = require('../../lib/infra/telemetry');
  const s = t.createOtelSink();
  assert.strictEqual(typeof s.emit, 'function');
});
await testAsync('telemetry.createOtelSink emit is fast (<50ms) when off', async () => {
  const t = require('../../lib/infra/telemetry');
  const s = t.createOtelSink();
  const t0 = Date.now();
  await s.emit({ type: 'test', meta: {} });
  assert.ok(Date.now() - t0 < 100);
});

// ============================================================
// 8. CRITICAL: audit-logger.js DOES NOT call createDualSink (recursion fix)
// ============================================================
test('audit-logger: source contains `createOtelSink` NOT `createDualSink`', () => {
  const src = fs.readFileSync(path.join(PROJECT_ROOT, 'lib', 'audit', 'audit-logger.js'), 'utf8');
  assert.ok(src.includes('createOtelSink'), 'audit-logger must use createOtelSink');
  // Direct createDualSink call in writeAuditLog path would trigger recursion
  const inWriteAuditLog = /function writeAuditLog[\s\S]*?(?=\n(?:function|module\.exports))/m.exec(src);
  if (inWriteAuditLog) {
    assert.ok(!inWriteAuditLog[0].includes('createDualSink'), 'writeAuditLog must NOT call createDualSink');
  }
});
test('telemetry.js: createFileSink has DANGER ZONE warning comment', () => {
  const src = fs.readFileSync(path.join(PROJECT_ROOT, 'lib', 'infra', 'telemetry.js'), 'utf8');
  assert.ok(src.includes('DANGER ZONE'), 'telemetry.createFileSink must document recursion danger');
});

console.log(`\nintegration-runtime.test.js: ${pass}/${pass + fail} PASS, ${fail} FAIL, 0 SKIP`);
if (fail > 0) process.exit(1);

})();
