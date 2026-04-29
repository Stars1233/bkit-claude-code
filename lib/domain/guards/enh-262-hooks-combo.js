/**
 * ENH-262 Guard — CC v2.1.117 #51798 regression attribution.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.1.1
 * Plan SC: bkit does NOT block; CC shows prompt and bkit attributes the cause.
 *
 * Regression: PreToolUse permissionDecision:"allow" + dangerouslyDisableSandbox:true
 * on Bash tool used to be silent (v2.1.112) → now prompts (v2.1.117).
 * bkit's role: emit attribution to stderr so user knows "not a bkit failure".
 *
 * Pure domain function — no FS, no network, no child_process.
 *
 * @module lib/domain/guards/enh-262-hooks-combo
 *
 * @version 2.1.12
 */

/**
 * @typedef {Object} PreToolUseContext
 * @property {string} tool - Tool name (Bash/Write/Edit/etc.)
 * @property {Object} [envOverrides] - Hook-level overrides including dangerouslyDisableSandbox
 * @property {'allow'|'deny'|'ask'|'defer'} [permissionDecision]
 */

/**
 * @typedef {Object} CheckResult
 * @property {boolean} hit
 * @property {{ id: string, severity: string, note: string, ccIssue: string }} [meta]
 */

/**
 * Check if the current PreToolUse context matches the #51798 combo.
 *
 * @param {PreToolUseContext} ctx
 * @returns {CheckResult}
 */
function check(ctx) {
  if (!ctx || typeof ctx !== 'object') return { hit: false };
  if (ctx.tool !== 'Bash') return { hit: false };
  if (!ctx.envOverrides || ctx.envOverrides.dangerouslyDisableSandbox !== true) {
    return { hit: false };
  }
  if (ctx.permissionDecision !== 'allow') return { hit: false };

  return {
    hit: true,
    meta: {
      id: 'ENH-262',
      severity: 'HIGH',
      note: 'CC v2.1.117 prompt regression — not a bkit failure',
      ccIssue: 'https://github.com/anthropics/claude-code/issues/51798',
    },
  };
}

/**
 * Lifecycle predicate: Guard can be removed when CC version reaches the fix.
 *
 * @param {string} ccVersion - Semver string (e.g. "2.1.118")
 * @returns {boolean} true if guard should be deactivated
 */
function removeWhen(ccVersion) {
  if (!ccVersion || typeof ccVersion !== 'string') return false;
  // Guard is removed once CC ships a hotfix (expected v2.1.118+)
  const [maj, min, pat] = ccVersion.split('.').map((n) => parseInt(n, 10) || 0);
  if (maj < 2) return false;
  if (maj > 2) return true;
  if (min > 1) return true;
  return min === 1 && pat >= 118;
}

module.exports = { check, removeWhen };
