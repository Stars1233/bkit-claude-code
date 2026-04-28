/**
 * evals-runner-wrapper.test.js — Unit tests for FR-β2 eval runner wrapper.
 *
 * Maps to Design §8.2 L1 TC #3 + §7 Security §6 E-β2-01.
 *
 * @module test/unit/evals-runner-wrapper.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const wrapper = require('../../lib/evals/runner-wrapper');

function withTempProject(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-evals-'));
  const orig = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = dir;
  try { return fn(dir); }
  finally {
    if (orig === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = orig;
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

// ── Skill name validation (security boundary) ────────────────────────────
test('isValidSkillName: accepts hyphenated lower-case names', () => {
  assert.equal(wrapper.isValidSkillName('gap-detector'), true);
  assert.equal(wrapper.isValidSkillName('a'), true);
  assert.equal(wrapper.isValidSkillName('skill-1-2'), true);
});

test('isValidSkillName: rejects shell metacharacters', () => {
  for (const bad of [
    'gap-detector;rm -rf /',
    'a$(ls)',
    'a`whoami`',
    'a|ls',
    'a&ls',
    'a>file',
    'a/b',
    '../etc/passwd',
    'a b',
    '',
    'A',
    null,
    undefined,
    123,
  ]) {
    assert.equal(wrapper.isValidSkillName(bad), false, `must reject ${JSON.stringify(bad)}`);
  }
});

test('isValidSkillName: rejects names that exceed 64 chars', () => {
  assert.equal(wrapper.isValidSkillName('a'.repeat(64)), true);
  assert.equal(wrapper.isValidSkillName('a'.repeat(65)), false);
});

test('isValidSkillName: rejects names starting with digit/hyphen', () => {
  assert.equal(wrapper.isValidSkillName('1abc'), false);
  assert.equal(wrapper.isValidSkillName('-abc'), false);
});

// ── invokeEvals: invalid input short-circuits before spawn ────────────────
test('invokeEvals: invalid skill name returns reason without spawning', () => {
  const r = wrapper.invokeEvals('a; rm -rf /', { persist: false });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'invalid_skill_name');
});

test('invokeEvals: missing runner_path returns runner_missing', () => {
  const r = wrapper.invokeEvals('gap-detector', {
    runnerPath: '/nonexistent/path/runner.js',
    persist: false,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'runner_missing');
});

// ── invokeEvals: success path with stub runner ────────────────────────────
test('invokeEvals: spawns stub runner and parses JSON tail', () => {
  withTempProject(() => {
    const stub = path.join(os.tmpdir(), `bkit-stub-runner-${Date.now()}.js`);
    fs.writeFileSync(stub,
      `console.log('runner log line');\nconsole.log(JSON.stringify({skill:'demo',pass:5,fail:0}));\n`);
    try {
      const r = wrapper.invokeEvals('demo', { runnerPath: stub });
      assert.equal(r.ok, true);
      assert.equal(r.code, 0);
      assert.ok(r.parsed);
      assert.equal(r.parsed.skill, 'demo');
      assert.equal(r.parsed.pass, 5);
      assert.ok(r.resultFile, 'result file path must be returned');
      assert.ok(fs.existsSync(r.resultFile), 'result file must exist on disk');

      const persisted = JSON.parse(fs.readFileSync(r.resultFile, 'utf8'));
      assert.equal(persisted.skill, 'demo');
      assert.equal(persisted.exitCode, 0);
      assert.match(persisted.invokedAt, /^\d{4}-\d{2}-\d{2}T/);
    } finally {
      try { fs.unlinkSync(stub); } catch {}
    }
  });
});

test('invokeEvals: non-zero exit propagates ok=false but still persists', () => {
  withTempProject(() => {
    const stub = path.join(os.tmpdir(), `bkit-stub-fail-${Date.now()}.js`);
    fs.writeFileSync(stub, `console.error('boom'); process.exit(2);\n`);
    try {
      const r = wrapper.invokeEvals('demo', { runnerPath: stub });
      assert.equal(r.ok, false);
      assert.equal(r.code, 2);
      assert.match(r.stderr, /boom/);
      assert.ok(r.resultFile);
      const persisted = JSON.parse(fs.readFileSync(r.resultFile, 'utf8'));
      assert.equal(persisted.exitCode, 2);
    } finally {
      try { fs.unlinkSync(stub); } catch {}
    }
  });
});

test('invokeEvals: persist=false skips file write', () => {
  withTempProject((dir) => {
    const stub = path.join(os.tmpdir(), `bkit-stub-nopersist-${Date.now()}.js`);
    fs.writeFileSync(stub, `console.log('{}');\n`);
    try {
      const r = wrapper.invokeEvals('demo', { runnerPath: stub, persist: false });
      assert.equal(r.ok, true);
      assert.equal(r.resultFile, null);
      const runtimeDir = path.join(dir, '.bkit', 'runtime');
      // Either runtime dir doesn't exist or doesn't contain evals-*
      if (fs.existsSync(runtimeDir)) {
        const files = fs.readdirSync(runtimeDir).filter((f) => f.startsWith('evals-'));
        assert.equal(files.length, 0);
      }
    } finally {
      try { fs.unlinkSync(stub); } catch {}
    }
  });
});

test('resultPath: ISO timestamp colons sanitized for filenames', () => {
  withTempProject((dir) => {
    const p = wrapper.resultPath('skill-a', '2026-04-28T19:34:56.789Z');
    assert.ok(p.includes('evals-skill-a-2026-04-28T19-34-56-789Z.json'));
    assert.ok(p.startsWith(dir));
    assert.ok(!p.includes(':'));
  });
});
