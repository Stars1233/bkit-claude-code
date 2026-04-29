#!/usr/bin/env node
/*
 * L3 Contract Test — bkit v2.1.12 evals wrapper argv contract.
 *
 * Locks two invariants between lib/evals/runner-wrapper.js and
 * evals/runner.js so any future drift breaks CI rather than silently
 * regressing the user-visible /bkit-evals run command.
 *
 *   C1 — Wrapper MUST spawn the runner with `['--skill', skillName]`
 *        argv. v2.1.11 incorrectly used `[skillName]` as a positional
 *        argument, which runner.js silently dropped (Usage banner +
 *        exit 0). The flag form is the runner's documented contract.
 *
 *   C2 — runner.js no-args output MUST equal a fixed Usage banner.
 *        The wrapper's argv_format_mismatch sentinel relies on this
 *        banner exactly starting with "Usage:" — any drift in the
 *        banner spec means the sentinel detection logic must be
 *        re-evaluated.
 *
 * Run:
 *   node test/contract/v2112-evals-wrapper.contract.test.js
 *
 * Design Ref: docs/02-design/features/bkit-v2112-evals-wrapper-hotfix.design.md §8.3
 * Plan SC: FR-13 + FR-12 — wrapper↔runner contract lock
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

let pass = 0;
let fail = 0;
const failures = [];

function tc(id, fn) {
  try { fn(); console.log(`  ✓ ${id}`); pass++; }
  catch (e) {
    fail++;
    failures.push({ id, error: e.message });
    console.error(`  ✗ ${id} — ${e.message.slice(0, 200)}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('=== L3 Contract — v2.1.12 evals wrapper argv lock ===');

// ---------------------------------------------------------------------------
// C1 — wrapper emits ['--skill', skillName] argv
// ---------------------------------------------------------------------------
tc('C1 wrapper passes --skill <name> as argv to runner', () => {
  // PATH-injected node shim. Replaces the runner with a tiny script that
  // dumps process.argv.slice(2) into a temp file. The wrapper's
  // spawnSync('node', [runnerPath, ...]) will therefore execute our shim
  // and we can inspect what the wrapper actually passed.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-argv-spy-'));
  const captureFile = path.join(dir, 'captured-argv.json');
  const shim = path.join(dir, 'argv-shim.js');
  fs.writeFileSync(shim, `#!/usr/bin/env node
const fs = require('fs');
fs.writeFileSync(${JSON.stringify(captureFile)}, JSON.stringify(process.argv.slice(2)));
process.stdout.write('{"pass":true,"details":{"skill":"pdca","classification":"workflow"}}');
process.exit(0);
`);
  try {
    // Bust the require cache so a fresh module is loaded — important when
    // multiple contract tests share a runner.
    Object.keys(require.cache).forEach((k) => {
      if (/lib\/evals\/runner-wrapper/.test(k)) delete require.cache[k];
    });
    const wrapperPath = path.join(ROOT, 'lib/evals/runner-wrapper.js');
    const { invokeEvals } = require(wrapperPath);
    const r = invokeEvals('pdca', { runnerPath: shim, persist: false });

    assert(r && r.ok === true,
      `expected ok:true from shim runner, got ${JSON.stringify(r)}`);

    const captured = JSON.parse(fs.readFileSync(captureFile, 'utf8'));
    const expected = ['--skill', 'pdca'];
    assert(JSON.stringify(captured) === JSON.stringify(expected),
      `argv contract violated: expected ${JSON.stringify(expected)}, got ${JSON.stringify(captured)}`);
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

// ---------------------------------------------------------------------------
// C2 — runner.js Usage banner spec lock
// ---------------------------------------------------------------------------
tc('C2 runner.js no-args Usage banner is byte-exact', () => {
  const result = spawnSync('node', [path.join(ROOT, 'evals/runner.js')], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert(result.status === 0,
    `runner.js no-args must exit 0, got ${result.status}`);
  const expected =
    'Usage: node runner.js --skill <name> | --classification <type> | --benchmark | --parity <name>\n';
  assert(result.stdout === expected,
    `Usage banner spec drift detected.\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(result.stdout)}`);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('');
console.log(`v2.1.12 contract: ${pass} passed / ${fail} failed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  - ${f.id}: ${f.error.slice(0, 200)}`);
}
process.exit(fail === 0 ? 0 : 1);
