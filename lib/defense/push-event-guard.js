/**
 * PushEventGuard — Defense Layer guard for `git push` to upstream vs fork.
 *
 * Design Ref: docs/sprint/v2114/design.md §1.2 (audit-logger imports) — body
 *             spec authored in Sub-Sprint 2 Phase 0 Pre-impl Analysis §2.3.
 * Plan SC: ENH-298 Push event Defense (bundled with ENH-289 Defense Layer 6).
 *
 * Background:
 *   CC #56884 (v2.1.132): an evolved-form R-3 case where the model issued a
 *   silent `git push` to the upstream remote without user confirmation. bkit
 *   already blocks `git push --force` / `git push -f` via
 *   scripts/permission-request-handler.js ALWAYS_DENY_PATTERNS, but plain
 *   non-force pushes to **upstream** (not the developer's own fork) are not
 *   distinguished today. This module supplies that distinction.
 *
 * Public API (3 pure-ish functions):
 *   detectPushCommand(command) → { isPush, force, remote, branch }
 *   classifyRemote(remoteName, opts?) → { kind, isFork }
 *   shouldGuard(parsed, classified, trustLevel) → { action, reason, alternatives }
 *
 * Purity split:
 *   - detectPushCommand: pure regex parser, no IO
 *   - classifyRemote: requires git context (uses `git remote -v` via opts.exec,
 *     so it can be injected for tests; default uses child_process synchronously)
 *   - shouldGuard: pure decision function over the two inputs above
 *
 * Calling site (Step 6, scripts/unified-bash-pre.js Stage 2):
 *   const guard = require('../lib/defense/push-event-guard');
 *   const parsed = guard.detectPushCommand(command);
 *   if (parsed.isPush) {
 *     const classified = guard.classifyRemote(parsed.remote, { cwd });
 *     const verdict = guard.shouldGuard(parsed, classified, trustLevel);
 *     if (verdict.action === 'deny' || verdict.action === 'ask') {
 *       outputBlockWithContext(verdict.reason, {
 *         additionalContext: verdict.alternatives.join('\n'),
 *       }, 'PreToolUse');
 *     }
 *   }
 *
 * @module lib/defense/push-event-guard
 * @version 2.1.14
 * @since 2.1.14
 * @layer Defense
 * @enh ENH-298
 */

'use strict';

// child_process is only loaded when classifyRemote() is invoked without an
// injected exec — keeps imports lazy and lets tests pass a mock without
// touching the real git command.
let _child_process = null;
function getChildProcess() {
  if (!_child_process) _child_process = require('child_process');
  return _child_process;
}

/**
 * @typedef {Object} PushParse
 * @property {boolean} isPush  — command matches `git push` shape
 * @property {boolean} force   — `--force`/`-f`/`--force-with-lease` flag detected
 * @property {string|null} remote — remote name (default 'origin' when omitted)
 * @property {string|null} branch — branch refspec (best-effort, may be null)
 */

/**
 * @typedef {'origin'|'upstream'|'fork'|'unknown'} RemoteKind
 *   origin   — the developer's own remote (default for first-time clones)
 *   upstream — the canonical project remote (anthropics/*, popup-studio-ai/*, etc.)
 *   fork     — alias for origin when origin is a fork (most common in bkit dev flow)
 *   unknown  — could not classify (git not available, remote not found, etc.)
 */

/**
 * @typedef {Object} RemoteClass
 * @property {RemoteKind} kind
 * @property {boolean} isFork  — true iff kind ∈ {'origin','fork'} OR url contains fork heuristic
 * @property {string|null} url — resolved push URL (debug)
 */

/**
 * @typedef {'allow'|'ask'|'deny'} GuardAction
 */

/**
 * @typedef {Object} GuardVerdict
 * @property {GuardAction} action
 * @property {string} reason
 * @property {string[]} alternatives
 */

const PUSH_REGEX = /^\s*git\s+push(\s|$)/;
const FORCE_FLAGS_REGEX = /\s(--force(?:-with-lease)?(?:=\S*)?|-f)(\s|$)/;
const REMOTE_REGEX = /^\s*git\s+push\b[^|;&]*?\s+([\w./-]+)(?:\s+([\w./*+:-]+))?/;

// Heuristic patterns identifying upstream remotes — these are the canonical
// public organizations bkit-claude-code interacts with. Pushes here MUST be
// guarded. (Lowercased URL is matched.)
const UPSTREAM_URL_HEURISTICS = Object.freeze([
  /github\.com[:/]anthropics\//i,
  /github\.com[:/]anthropic\//i,
  /github\.com[:/]openai\//i,
  /github\.com[:/]google\//i,
  /github\.com[:/]microsoft\//i,
]);

// Heuristic patterns identifying the developer's fork (origin in bkit flow).
const FORK_URL_HEURISTICS = Object.freeze([
  /github\.com[:/]popup-studio-ai\//i,
  /github\.com[:/]popup\//i,
  /github\.com[:/]tomo-kay\//i,
]);

/**
 * Pure parser. Recognizes `git push [flags] [remote [refspec]]` shape.
 *
 * @param {string|unknown} command
 * @returns {PushParse}
 */
function detectPushCommand(command) {
  if (typeof command !== 'string' || command.length === 0 || !PUSH_REGEX.test(command)) {
    return { isPush: false, force: false, remote: null, branch: null };
  }
  const force = FORCE_FLAGS_REGEX.test(command);
  const m = command.match(REMOTE_REGEX);
  // When the user omits remote, git defaults to the tracking remote (often
  // 'origin'). We surface 'origin' so classifyRemote() can still resolve.
  const remote = m && m[1] && !m[1].startsWith('-') ? m[1] : 'origin';
  const branch = m && m[2] && !m[2].startsWith('-') ? m[2] : null;
  return { isPush: true, force, remote, branch };
}

/**
 * Resolve the push URL for a remote and classify it as fork / upstream / unknown.
 *
 * Uses `git remote get-url --push <remote>` (lighter than `git remote -v`).
 * Failure modes (git missing, remote missing, non-zero exit) → kind:'unknown'.
 *
 * @param {string} remoteName
 * @param {{ cwd?: string, exec?: (cmd: string, opts: object) => string }} [opts]
 * @returns {RemoteClass}
 */
function classifyRemote(remoteName, opts) {
  if (typeof remoteName !== 'string' || remoteName.length === 0) {
    return { kind: 'unknown', isFork: false, url: null };
  }
  const cwd = (opts && typeof opts.cwd === 'string') ? opts.cwd : process.cwd();
  const exec = (opts && typeof opts.exec === 'function')
    ? opts.exec
    : (cmd, o) => getChildProcess().execSync(cmd, o).toString();

  let url = null;
  try {
    url = String(exec(`git remote get-url --push ${shellEscape(remoteName)}`, {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    })).trim();
  } catch {
    return { kind: 'unknown', isFork: false, url: null };
  }
  if (!url) return { kind: 'unknown', isFork: false, url: null };

  for (const re of UPSTREAM_URL_HEURISTICS) {
    if (re.test(url)) return { kind: 'upstream', isFork: false, url };
  }
  for (const re of FORK_URL_HEURISTICS) {
    if (re.test(url)) return { kind: 'fork', isFork: true, url };
  }
  // Default convention: remote literally named 'origin' is treated as fork
  // (the bkit developer flow keeps origin pointed at their own fork).
  if (remoteName === 'origin') return { kind: 'origin', isFork: true, url };
  if (remoteName === 'upstream') return { kind: 'upstream', isFork: false, url };
  return { kind: 'unknown', isFork: false, url };
}

/**
 * Pure decision function: should bkit guard this push, and how strictly?
 *
 *   force      → deny  (force pushes never auto-approved; align with
 *                 ALWAYS_DENY_PATTERNS scripts/permission-request-handler.js)
 *   upstream   → ask   (require explicit confirmation regardless of Trust Level)
 *   unknown remote at L4 → ask  (conservative when classification failed)
 *   fork/origin at L0-L3 → allow
 *   fork/origin at L4 → ask  (L4 sub-agent dispatch enforces sequential AND
 *                              extra caution on cross-trust boundary ops)
 *
 * Note: shouldGuard never returns 'allow' for force=true regardless of
 * trustLevel — this matches the existing permission-request-handler stance.
 *
 * @param {PushParse} parsed
 * @param {RemoteClass} classified
 * @param {'L0'|'L1'|'L2'|'L3'|'L4'|string} trustLevel
 * @returns {GuardVerdict}
 */
function shouldGuard(parsed, classified, trustLevel) {
  if (!parsed || !parsed.isPush) {
    return { action: 'allow', reason: 'not a git push command', alternatives: [] };
  }
  if (parsed.force) {
    return {
      action: 'deny',
      reason: `bkit ENH-298 push-event guard: force push detected (${parsed.remote || '?'}). Force pushes overwrite remote history.`,
      alternatives: [
        'Use a non-force push: `git push <remote> <branch>`',
        'If you must rewrite history, open a draft PR + co-ordinate via the team channel first.',
        'Use `--force-with-lease` only when you have read upstream\'s current sha.',
      ],
    };
  }
  if (!classified || classified.kind === 'upstream') {
    return {
      action: 'ask',
      reason: `bkit ENH-298 push-event guard: pushing to upstream remote (${parsed.remote}).`,
      alternatives: [
        'Push to your fork first: `git push origin <branch>` then open a PR via `gh pr create`.',
        'Confirm this is intended: upstream pushes affect every downstream user.',
      ],
    };
  }
  if (classified.kind === 'unknown') {
    if (trustLevel === 'L4') {
      return {
        action: 'ask',
        reason: `bkit ENH-298 push-event guard: remote '${parsed.remote}' could not be classified (kind=unknown) and Trust Level is L4. Confirm destination.`,
        alternatives: ['Run `git remote -v` to verify the remote URL before pushing.'],
      };
    }
    return { action: 'allow', reason: `remote=${parsed.remote} unknown but trustLevel < L4`, alternatives: [] };
  }
  // fork / origin
  if (trustLevel === 'L4') {
    return {
      action: 'ask',
      reason: `bkit ENH-298 push-event guard: Trust Level L4 requires explicit confirmation for any push, including to fork (${parsed.remote}).`,
      alternatives: ['Confirm and proceed, or adjust Trust Level via `/control level 3`.'],
    };
  }
  return { action: 'allow', reason: `push to ${classified.kind} '${parsed.remote}' OK at ${trustLevel}`, alternatives: [] };
}

/** Minimal shell-arg escape for `git remote get-url --push <remote>`. */
function shellEscape(s) {
  if (/^[\w./-]+$/.test(s)) return s;
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

module.exports = {
  detectPushCommand,
  classifyRemote,
  shouldGuard,
  UPSTREAM_URL_HEURISTICS,
  FORK_URL_HEURISTICS,
};
