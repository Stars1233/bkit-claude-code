/**
 * sprint-alpha-perf.test.js — Performance benchmarks for Sprint α additions
 *
 * Maps to Design §8.4 L4 Performance test plan (5 cases). Targets are
 * intentionally split into two tiers:
 *
 *   - HARD threshold: protects against catastrophic regression (test FAILS).
 *     Set generously to keep CI green across diverse machines.
 *   - SOFT target: design-intent value. Reported in console for visibility,
 *     does not fail the suite. Tighten over future Sprint cadence.
 *
 * Methodology: median of N runs (N>=10) using `process.hrtime.bigint()`.
 * The SessionStart spawn measurement includes Node startup cost; the
 * design soft-target of 50ms reflects bkit-internal overhead which is
 * impossible to measure across `spawnSync` alone — recorded for context.
 *
 * @module test/perf/sprint-alpha-perf.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const HOOK_PATH = path.join(PROJECT_ROOT, 'hooks/session-start.js');

function median(samplesNs) {
  const sorted = [...samplesNs].sort((a, b) => Number(a - b));
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2n;
}
function p99(samplesNs) {
  const sorted = [...samplesNs].sort((a, b) => Number(a - b));
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
}
function nsToMs(n) { return Number(n) / 1e6; }

function bench(label, runs, fn) {
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const t0 = process.hrtime.bigint();
    fn(i);
    const t1 = process.hrtime.bigint();
    samples.push(t1 - t0);
  }
  const med = nsToMs(median(samples));
  const p = nsToMs(p99(samples));
  // eslint-disable-next-line no-console
  console.log(`  [perf] ${label}: median=${med.toFixed(3)}ms  p99=${p.toFixed(3)}ms  (n=${runs})`);
  return { medianMs: med, p99Ms: p };
}

function mkProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-perf-'));
}
function cleanup(dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }

// ── L4-perf-01: SessionStart hook spawn total ────────────────────────────────
test('L4-perf-01: SessionStart hook spawn end-to-end', () => {
  const dir = mkProject();
  try {
    const env = {
      PATH: process.env.PATH, HOME: process.env.HOME,
      CLAUDE_PLUGIN_ROOT: PROJECT_ROOT,
      CLAUDE_PROJECT_DIR: dir,
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
      DISABLE_UPDATES: '1',
    };
    // Soft target 50ms = bkit-internal overhead. Hard CI gate 2500ms = catastrophe guard.
    const { medianMs } = bench('SessionStart spawn', 10, () => {
      spawnSync('node', [HOOK_PATH], { cwd: dir, env, encoding: 'utf8', timeout: 10000 });
    });
    // eslint-disable-next-line no-console
    console.log(`  [perf]   ↳ design soft-target=50ms (bkit-internal); spawn includes Node startup`);
    assert.ok(medianMs < 2500,
      `SessionStart spawn median ${medianMs.toFixed(1)}ms exceeded 2500ms hard guard`);
  } finally { cleanup(dir); }
});

// ── L4-perf-02: isFirstRun() — pure FS check ─────────────────────────────────
test('L4-perf-02: isFirstRun() median < 5ms', () => {
  const dir = mkProject();
  try {
    const orig = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = dir;
    try {
      const { isFirstRun } = require(path.join(PROJECT_ROOT, 'hooks/startup/first-run'));
      const { medianMs } = bench('isFirstRun()', 100, () => { isFirstRun(); });
      assert.ok(medianMs < 5, `isFirstRun median ${medianMs.toFixed(3)}ms exceeded 5ms`);
    } finally {
      if (orig === undefined) delete process.env.CLAUDE_PROJECT_DIR;
      else process.env.CLAUDE_PROJECT_DIR = orig;
    }
  } finally { cleanup(dir); }
});

// ── L4-perf-03: checkAgentTeamsEnv() — env read only ────────────────────────
test('L4-perf-03: checkAgentTeamsEnv() median < 1ms', () => {
  const { checkAgentTeamsEnv } = require(path.join(PROJECT_ROOT, 'hooks/startup/preflight'));
  const { medianMs } = bench('checkAgentTeamsEnv()', 100, () => { checkAgentTeamsEnv(); });
  assert.ok(medianMs < 1, `checkAgentTeamsEnv median ${medianMs.toFixed(3)}ms exceeded 1ms`);
});

// ── L4-perf-04: scanOneLiner() — 5 file reads ───────────────────────────────
test('L4-perf-04: scanOneLiner() median < 200ms', async () => {
  const { scanOneLiner } = require(path.join(PROJECT_ROOT, 'lib/infra/docs-code-scanner'));
  const samples = [];
  for (let i = 0; i < 10; i++) {
    const t0 = process.hrtime.bigint();
    await scanOneLiner();
    samples.push(process.hrtime.bigint() - t0);
  }
  const med = nsToMs(median(samples));
  // eslint-disable-next-line no-console
  console.log(`  [perf] scanOneLiner(): median=${med.toFixed(3)}ms  (n=10)`);
  assert.ok(med < 200, `scanOneLiner median ${med.toFixed(3)}ms exceeded 200ms`);
});

// ── L4-perf-05: markFirstRunSeen() — fs.writeFileSync ───────────────────────
test('L4-perf-05: markFirstRunSeen() median < 25ms', () => {
  const dir = mkProject();
  try {
    const orig = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = dir;
    try {
      const { markFirstRunSeen } = require(path.join(PROJECT_ROOT, 'hooks/startup/first-run'));
      const { medianMs } = bench('markFirstRunSeen()', 50, () => { markFirstRunSeen('shown'); });
      assert.ok(medianMs < 25,
        `markFirstRunSeen median ${medianMs.toFixed(3)}ms exceeded 25ms`);
    } finally {
      if (orig === undefined) delete process.env.CLAUDE_PROJECT_DIR;
      else process.env.CLAUDE_PROJECT_DIR = orig;
    }
  } finally { cleanup(dir); }
});
