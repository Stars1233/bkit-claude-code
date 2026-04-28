/**
 * sprint-alpha-e2e.test.js — End-to-end integration tests for Sprint α
 *
 * Verifies the SessionStart hook + Sprint α adapters interact correctly
 * across realistic environment combinations. Each test spawns the hook in
 * a fresh `mkdtemp`-backed CLAUDE_PROJECT_DIR so the marker file lifecycle
 * and BKIT_VERSION/One-Liner SSoT invariants are exercised end-to-end.
 *
 * Maps to Design §8.3 L2 Integration test plan (15 cases). DoD-bound.
 *
 * @module test/integration/sprint-alpha-e2e.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const HOOK_PATH = path.join(PROJECT_ROOT, 'hooks/session-start.js');

function mkProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-spalpha-'));
}

function runHook(env, projectDir) {
  const baseEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_PATH: process.env.NODE_PATH || '',
    CLAUDE_PLUGIN_ROOT: PROJECT_ROOT,
    CLAUDE_PROJECT_DIR: projectDir,
    DISABLE_UPDATES: '1',
    ...env,
  };
  const r = spawnSync('node', [HOOK_PATH], {
    cwd: projectDir,
    env: baseEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    timeout: 10000,
  });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch { /* parsed stays null */ }
  return { code: r.status, parsed, stderr: r.stderr, stdout: r.stdout };
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* noop */ }
}

// ── L2-01: Hook exits 0 with valid JSON, has hookSpecificOutput ──────────────
test('L2-01: SessionStart hook exits 0 with structured JSON', () => {
  const dir = mkProject();
  try {
    const r = runHook({ CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' }, dir);
    assert.equal(r.code, 0, `expected exit 0, got ${r.code}, stderr=${r.stderr}`);
    assert.ok(r.parsed, 'stdout must be valid JSON');
    assert.ok(r.parsed.hookSpecificOutput, 'hookSpecificOutput must exist');
    assert.equal(r.parsed.hookSpecificOutput.hookEventName, 'SessionStart');
  } finally { cleanup(dir); }
});

// ── L2-02: First run surfaces FR-α3 AUQ tutorial ────────────────────────────
test('L2-02: first run shows First-Run AUQ tutorial', () => {
  const dir = mkProject();
  try {
    const r = runHook({ CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' }, dir);
    assert.equal(r.code, 0);
    const up = r.parsed.hookSpecificOutput.userPrompt;
    assert.ok(up, 'userPrompt must be present on first run');
    const payload = JSON.parse(up);
    assert.equal(payload.questions[0].header, 'First Run');
    assert.equal(payload.questions[0].options.length, 3);
    assert.match(payload.questions[0].options[0].label, /3-min tutorial/);
  } finally { cleanup(dir); }
});

// ── L2-03: Second run NOT shows tutorial (marker exists) ────────────────────
test('L2-03: subsequent run skips First-Run AUQ when marker exists', () => {
  const dir = mkProject();
  try {
    runHook({ CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' }, dir); // first call creates marker
    const markerPath = path.join(dir, '.bkit/runtime/first-run-seen.json');
    assert.ok(fs.existsSync(markerPath), 'marker must be created on first run');

    const r = runHook({ CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' }, dir);
    const up = r.parsed.hookSpecificOutput.userPrompt;
    if (up) {
      const payload = JSON.parse(up);
      assert.notEqual(payload.questions[0].header, 'First Run',
        'Second run must NOT surface First Run AUQ');
    }
  } finally { cleanup(dir); }
});

// ── L2-04: Agent Teams env unset → preflight warning prepended ──────────────
test('L2-04: Agent Teams env unset surfaces preflight warning', () => {
  const dir = mkProject();
  try {
    // Explicitly delete env var
    const env = {};
    const r = spawnSync('node', [HOOK_PATH], {
      cwd: dir,
      env: {
        PATH: process.env.PATH, HOME: process.env.HOME,
        CLAUDE_PLUGIN_ROOT: PROJECT_ROOT,
        CLAUDE_PROJECT_DIR: dir,
        DISABLE_UPDATES: '1',
        ...env,
      },
      encoding: 'utf8', timeout: 10000,
    });
    const parsed = JSON.parse(r.stdout);
    const ctx = parsed.hookSpecificOutput.additionalContext;
    assert.match(ctx, /## Preflight/);
    assert.match(ctx, /Agent Teams inactive/);
    assert.match(ctx, /CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1/);
  } finally { cleanup(dir); }
});

// ── L2-05: Agent Teams env="1" → no preflight section ───────────────────────
test('L2-05: Agent Teams env="1" suppresses preflight warning', () => {
  const dir = mkProject();
  try {
    const r = runHook({ CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' }, dir);
    const ctx = r.parsed.hookSpecificOutput.additionalContext;
    assert.doesNotMatch(ctx, /Agent Teams inactive/);
  } finally { cleanup(dir); }
});

// ── L2-06: DISABLE_UPDATES=1 skips CC version warning entirely ──────────────
test('L2-06: DISABLE_UPDATES=1 skips CC version check (no version warn)', () => {
  const dir = mkProject();
  try {
    const r = runHook({
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
      DISABLE_UPDATES: '1',
    }, dir);
    const ctx = r.parsed.hookSpecificOutput.additionalContext;
    assert.doesNotMatch(ctx, /CC v[\d.]+\+ recommended/);
    assert.doesNotMatch(ctx, /CC v[\d.]+\+ required/);
  } finally { cleanup(dir); }
});

// ── L2-07: SessionStart context contains ONE_LINER (FR-α2-c intro) ──────────
test('L2-07: SessionStart context surfaces ONE_LINER from session-context.js', () => {
  const dir = mkProject();
  try {
    const { ONE_LINER_EN } = require(path.join(PROJECT_ROOT, 'lib/infra/branding'));
    const r = runHook({ CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' }, dir);
    const ctx = r.parsed.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes(ONE_LINER_EN),
      `additionalContext must include ONE_LINER_EN substring`);
  } finally { cleanup(dir); }
});

// ── L2-08: BKIT_VERSION reflected in systemMessage ──────────────────────────
test('L2-08: systemMessage reflects current BKIT_VERSION', () => {
  const dir = mkProject();
  try {
    const { BKIT_VERSION } = require(path.join(PROJECT_ROOT, 'lib/core/version'));
    const r = runHook({ CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' }, dir);
    assert.match(r.parsed.systemMessage, new RegExp(`v${BKIT_VERSION.replace(/\./g, '\\.')}`));
    assert.match(r.parsed.systemMessage, /bkit Vibecoding Kit/);
  } finally { cleanup(dir); }
});

// ── L2-09..13: One-Liner SSoT 5-location enforcement (scanOneLiner) ─────────
test('L2-09: scanOneLiner reports plugin.json sync', async () => {
  const { scanOneLiner } = require(path.join(PROJECT_ROOT, 'lib/infra/docs-code-scanner'));
  const r = await scanOneLiner();
  const e = r.results.find((x) => x.name === 'plugin.json');
  assert.equal(e.status, 'sync');
});

test('L2-10: scanOneLiner reports README.md sync', async () => {
  const { scanOneLiner } = require(path.join(PROJECT_ROOT, 'lib/infra/docs-code-scanner'));
  const r = await scanOneLiner();
  const e = r.results.find((x) => x.name === 'README.md');
  assert.equal(e.status, 'sync');
});

test('L2-11: scanOneLiner reports README-FULL.md sync', async () => {
  const { scanOneLiner } = require(path.join(PROJECT_ROOT, 'lib/infra/docs-code-scanner'));
  const r = await scanOneLiner();
  const e = r.results.find((x) => x.name === 'README-FULL.md');
  assert.equal(e.status, 'sync');
});

test('L2-12: scanOneLiner reports session-context.js sync (JS-aware)', async () => {
  const { scanOneLiner } = require(path.join(PROJECT_ROOT, 'lib/infra/docs-code-scanner'));
  const r = await scanOneLiner();
  const e = r.results.find((x) => x.name === 'session-context.js');
  assert.equal(e.status, 'sync');
});

test('L2-13: scanOneLiner reports CHANGELOG.md sync', async () => {
  const { scanOneLiner } = require(path.join(PROJECT_ROOT, 'lib/infra/docs-code-scanner'));
  const r = await scanOneLiner();
  const e = r.results.find((x) => x.name === 'CHANGELOG.md');
  assert.equal(e.status, 'sync');
});

// ── L2-14: BKIT_VERSION 5-location invariant (scanVersions) ─────────────────
test('L2-14: scanVersions reports zero mismatches across 5 locations', async () => {
  const { scanVersions } = require(path.join(PROJECT_ROOT, 'lib/infra/docs-code-scanner'));
  const r = await scanVersions();
  assert.equal(r.mismatches.length, 0,
    `expected zero version mismatches, got ${JSON.stringify(r.mismatches)}`);
  assert.equal(r.canonical, r.pluginJson);
  assert.equal(r.canonical, r.readme);
  assert.equal(r.canonical, r.changelog);
  assert.equal(r.canonical, r.hooksJson);
});

// ── L2-15: First-Run marker schema lock (ALL 4 fields persist correctly) ────
test('L2-15: first-run marker has all locked fields after exposure', () => {
  const dir = mkProject();
  try {
    runHook({ CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' }, dir);
    const markerPath = path.join(dir, '.bkit/runtime/first-run-seen.json');
    assert.ok(fs.existsSync(markerPath));
    const data = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    assert.ok('version' in data);
    assert.ok('seenAt' in data);
    assert.ok('tutorialResponse' in data);
    assert.ok('ccVersionAtFirstRun' in data);
    assert.match(data.seenAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  } finally { cleanup(dir); }
});
