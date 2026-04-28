/**
 * runner-wrapper.js — Safe wrapper around evals/runner.js (FR-β2)
 *
 * Validates user-supplied skill names, invokes the eval runner via
 * `child_process.spawn`, captures stdout/stderr, and persists the JSON
 * result to `.bkit/runtime/evals-{skill}-{timestamp}.json`.
 *
 * Security:
 *   - skill name MUST match `/^[a-z][a-z0-9-]{0,63}$/` (no spaces, no `/`,
 *     no shell metacharacters). Anything else is rejected before spawn.
 *   - argv array form (no shell). No string concatenation into a command.
 *   - Subprocess timeout 30s default, max 120s.
 *
 * Fail-open from caller's perspective:
 *   - Returns `{ ok: false, code, reason, ... }` on any failure
 *   - Never throws beyond programmer errors (TypeError on misuse)
 *
 * Design Ref: docs/02-design/features/bkit-v2111-sprint-beta.design.md §4.2
 *
 * @module lib/evals/runner-wrapper
 * @version 2.1.11
 * @since 2.1.11
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const RUNNER_PATH = path.join(PROJECT_ROOT, 'evals', 'runner.js');
const SKILL_NAME_RE = /^[a-z][a-z0-9-]{0,63}$/;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;

/**
 * Validate skill name against the locked regex.
 * @param {string} name
 * @returns {boolean}
 */
function isValidSkillName(name) {
  return typeof name === 'string' && SKILL_NAME_RE.test(name);
}

/**
 * Compute the absolute path of the result file for a given skill + timestamp.
 *
 * @param {string} skill
 * @param {string} [isoTimestamp]
 * @returns {string}
 */
function resultPath(skill, isoTimestamp) {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  // Filename-safe timestamp (no colons / dots).
  const stamp = (isoTimestamp || new Date().toISOString())
    .replace(/[:.]/g, '-');
  return path.join(root, '.bkit', 'runtime', `evals-${skill}-${stamp}.json`);
}

/**
 * Invoke the eval runner for a single skill. Streams stdout/stderr but does
 * NOT echo them — caller renders the structured result.
 *
 * @param {string} skill
 * @param {{ timeoutMs?: number, runnerPath?: string, persist?: boolean }} [opts]
 * @returns {{
 *   ok: boolean,
 *   skill: string,
 *   code?: number|null,
 *   reason?: string,
 *   stdout?: string,
 *   stderr?: string,
 *   parsed?: object|null,
 *   resultFile?: string|null
 * }}
 */
function invokeEvals(skill, opts = {}) {
  if (!isValidSkillName(skill)) {
    return { ok: false, skill: String(skill), reason: 'invalid_skill_name' };
  }

  const timeoutMs = Math.min(
    Math.max(Number(opts.timeoutMs) || DEFAULT_TIMEOUT_MS, 1_000),
    MAX_TIMEOUT_MS,
  );
  const runnerPath = opts.runnerPath || RUNNER_PATH;

  if (!fs.existsSync(runnerPath)) {
    return { ok: false, skill, reason: 'runner_missing', runnerPath };
  }

  let result;
  try {
    result = spawnSync('node', [runnerPath, skill], {
      cwd: PROJECT_ROOT,
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
  } catch (e) {
    return { ok: false, skill, reason: 'spawn_threw', error: e.message };
  }

  if (result.error && result.error.code === 'ETIMEDOUT') {
    return { ok: false, skill, reason: 'timeout', code: result.status, timeoutMs };
  }

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  let parsed = null;
  // Try to parse the LAST JSON-shaped block in stdout (runner may print logs first).
  try {
    const jsonStart = stdout.lastIndexOf('{');
    if (jsonStart >= 0) parsed = JSON.parse(stdout.slice(jsonStart));
  } catch {
    parsed = null;
  }

  let resultFile = null;
  if (opts.persist !== false) {
    try {
      const target = resultPath(skill);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const payload = {
        skill,
        invokedAt: new Date().toISOString(),
        exitCode: result.status,
        timedOut: false,
        stdoutTail: stdout.slice(-2000),
        stderrTail: stderr.slice(-2000),
        parsed,
      };
      fs.writeFileSync(target, JSON.stringify(payload, null, 2) + '\n');
      resultFile = target;
    } catch {
      resultFile = null;
    }
  }

  return {
    ok: result.status === 0,
    skill,
    code: result.status,
    stdout,
    stderr,
    parsed,
    resultFile,
  };
}

module.exports = {
  RUNNER_PATH,
  SKILL_NAME_RE,
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  isValidSkillName,
  resultPath,
  invokeEvals,
};
