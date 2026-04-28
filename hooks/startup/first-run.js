/**
 * first-run.js — SessionStart First-Run AUQ tutorial (FR-α3-b/c)
 *
 * Detects whether this is the first bkit session for this project and, if so,
 * surfaces a 3-option AskUserQuestion tutorial prompt:
 *
 *   1. "Start 3-min tutorial (Recommended)"
 *   2. "Later — just start"
 *   3. "Skip permanently"
 *
 * The marker file `.bkit/runtime/first-run-seen.json` records that the prompt
 * has been surfaced. Idempotent by design: re-shown only when the marker is
 * missing (never replayed for the same user state).
 *
 * Design Anchor: docs/02-design/styles/bkit-v2111-alpha-tutorial.design-anchor.md
 *
 * Fail-open: any I/O / detection error logs via debugLog and returns null so
 * the SessionStart hook continues uninterrupted.
 *
 * @module hooks/startup/first-run
 * @version 2.1.11
 * @since 2.1.11
 */

const fs = require('fs');
const path = require('path');
const { debugLog } = require('../../lib/core/debug');

const MARKER_REL_PATH = path.join('.bkit', 'runtime', 'first-run-seen.json');

/**
 * Resolve the absolute path of the marker file in the active project.
 * Honors `CLAUDE_PROJECT_DIR` (matches session-context.test pattern).
 *
 * @returns {string}
 */
function markerPath() {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return path.join(root, MARKER_REL_PATH);
}

/**
 * Detect whether bkit has been seen in this project before.
 * Pure check — no side effects.
 *
 * @returns {boolean}
 */
function isFirstRun() {
  try {
    return !fs.existsSync(markerPath());
  } catch (e) {
    debugLog('SessionStart', 'first-run isFirstRun failed', { error: e.message });
    // Conservative fallback: when the FS is unhealthy, treat as NOT first-run
    // to avoid spamming the AUQ on every session.
    return false;
  }
}

/**
 * Persist the marker so the AUQ is not shown again. Idempotent:
 * any input value writes the same shape (only `tutorialResponse` differs).
 *
 * @param {'tutorial'|'later'|'skip'|'shown'} response
 * @returns {boolean} true if marker was written, false on failure (fail-open)
 */
function markFirstRunSeen(response) {
  try {
    const dir = path.dirname(markerPath());
    fs.mkdirSync(dir, { recursive: true });

    let ccVersion = null;
    try {
      const { getCurrent } = require('../../lib/infra/cc-version-checker');
      ccVersion = getCurrent();
    } catch {
      // fall through — ccVersion stays null
    }

    let bkitVersion = null;
    try {
      bkitVersion = require('../../lib/core/version').BKIT_VERSION;
    } catch {
      // fall through
    }

    const payload = {
      version: bkitVersion,
      seenAt: new Date().toISOString(),
      tutorialResponse: response,
      ccVersionAtFirstRun: ccVersion,
    };
    fs.writeFileSync(markerPath(), JSON.stringify(payload, null, 2) + '\n');
    return true;
  } catch (e) {
    debugLog('SessionStart', 'first-run markFirstRunSeen failed', { error: e.message });
    return false;
  }
}

/**
 * Build the AskUserQuestion payload locked by the design anchor.
 * Always returns the same shape — locale resolution stays inside this
 * function so the rest of the codebase has a single integration point.
 *
 * @param {{lang?: string}} [opts]
 * @returns {object} AUQ payload (compatible with formatAskUserQuestion shape)
 */
function buildFirstRunPrompt(opts = {}) {
  const lang = (opts.lang || process.env.LANG || 'en').toLowerCase();
  const ko = lang.startsWith('ko');

  const question = ko
    ? 'bkit 처음이시군요! 3분 튜토리얼을 시작할까요?'
    : 'Welcome to bkit! Want a 3-minute tour?';

  return {
    questions: [
      {
        question,
        header: 'First Run',
        multiSelect: false,
        options: [
          {
            label: 'Start 3-min tutorial (Recommended)',
            description:
              'Walk through PDCA basics, output styles, and your first /pdca plan example via /claude-code-learning.',
          },
          {
            label: 'Later — just start',
            description:
              'Skip this prompt. Run /claude-code-learning anytime to revisit the tutorial.',
          },
          {
            label: 'Skip permanently',
            description:
              'Disable this prompt forever. onboarding.firstRun = false will be persisted.',
          },
        ],
      },
    ],
  };
}

/**
 * SessionStart entry point. When this is the first run:
 *   - mark the marker as `shown` (idempotent — exposure counts)
 *   - return `{ userPrompt }` ready to be merged into the hook response
 *
 * Otherwise returns null, leaving downstream onboarding paths intact.
 *
 * @returns {{userPrompt: string} | null}
 */
function run() {
  try {
    if (!isFirstRun()) return null;
    const payload = buildFirstRunPrompt();
    markFirstRunSeen('shown');
    return { userPrompt: JSON.stringify(payload) };
  } catch (e) {
    debugLog('SessionStart', 'first-run run failed', { error: e.message });
    return null;
  }
}

module.exports = {
  run,
  isFirstRun,
  markFirstRunSeen,
  buildFirstRunPrompt,
  markerPath,
  MARKER_REL_PATH,
};
