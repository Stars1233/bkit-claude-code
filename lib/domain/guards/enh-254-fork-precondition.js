/**
 * ENH-254 Guard — FORK_SUBAGENT env precondition + #51165 Windows warning.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.1.4
 * Plan SC: zero-script-qa is bkit's sole `context: fork` user — precondition failure
 *   should yield a clear attribution instead of silent malfunction on Windows.
 *
 * Pure domain function.
 *
 * @module lib/domain/guards/enh-254-fork-precondition
 */

/**
 * @typedef {Object} ForkContext
 * @property {string} skill - Skill name being invoked
 * @property {string} [context] - 'fork' | 'main' from SKILL.md frontmatter
 * @property {string} [platform] - process.platform (win32|darwin|linux)
 * @property {boolean} [forkSubagentEnv] - process.env.CLAUDE_CODE_FORK_SUBAGENT === '1'
 * @property {boolean} [disableModelInvocation] - tool flag
 */

/**
 * Check precondition before forked skill invocation.
 *
 * @param {ForkContext} ctx
 * @returns {{ hit: boolean, meta?: Object }}
 */
function check(ctx) {
  if (!ctx || typeof ctx !== 'object') return { hit: false };
  if (ctx.context !== 'fork') return { hit: false };

  // Condition 1: Windows + disable-model-invocation combination (#51165)
  if (ctx.platform === 'win32' && ctx.disableModelInvocation === true) {
    return {
      hit: true,
      meta: {
        id: 'ENH-254',
        severity: 'HIGH',
        note: `Skill '${ctx.skill}' uses context:fork but Windows + disable-model-invocation combination is known to regress (CC #51165). Expect inconsistent behavior.`,
        ccIssue: 'https://github.com/anthropics/claude-code/issues/51165',
      },
    };
  }

  // Condition 2: External CC build without FORK_SUBAGENT env (v2.1.117 F1)
  if (ctx.forkSubagentEnv === false) {
    return {
      hit: true,
      meta: {
        id: 'ENH-254',
        severity: 'MEDIUM',
        note: `Skill '${ctx.skill}' requires CLAUDE_CODE_FORK_SUBAGENT=1 on external CC builds. Set the env var or expect degraded behavior.`,
        ccIssue: 'https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#v2.1.117',
      },
    };
  }

  return { hit: false };
}

function removeWhen(ccVersion) {
  // ENH-254 remains relevant until #51165 closed; track explicitly when CC documents fix.
  if (!ccVersion) return false;
  return false;
}

module.exports = { check, removeWhen };
