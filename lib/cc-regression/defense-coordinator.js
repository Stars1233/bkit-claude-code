/**
 * Defense Coordinator — run active Guards against a PreToolUse context.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.2.2
 * Plan SC: bkit never blocks regressions — attribution only.
 *
 * @module lib/cc-regression/defense-coordinator
 */

const enh262 = require('../domain/guards/enh-262-hooks-combo');
const enh263 = require('../domain/guards/enh-263-claude-write');
const enh254 = require('../domain/guards/enh-254-fork-precondition');
const { formatAttribution } = require('./attribution-formatter');

/**
 * Run all non-bypassed Guards against a unified context object.
 * Returns a list of attribution lines (never blocks).
 *
 * @param {Object} ctx - PreToolUse context (tool, envOverrides, permissionDecision, filePath, ...)
 * @returns {{ attributions: string[], metas: Object[] }}
 */
function checkCCRegression(ctx) {
  if (process.env.BKIT_CC_REGRESSION_BYPASS === '1') {
    return { attributions: [], metas: [] };
  }
  // null/non-object ctx guard: every Guard returns {hit:false} for non-objects
  // but we also short-circuit here to avoid touching properties.
  if (!ctx || typeof ctx !== 'object') {
    return { attributions: [], metas: [] };
  }

  const results = [];

  // ENH-262 (Bash + dangerouslyDisableSandbox + allow)
  const r262 = enh262.check(ctx);
  if (r262.hit && r262.meta) results.push(r262.meta);

  // ENH-263 (.claude/ write + bypassPermissions + allow)
  const r263 = enh263.check(ctx);
  if (r263.hit && r263.meta) results.push(r263.meta);

  // Sprint 4.5: ENH-254 (fork precondition — Windows + disable-model-invocation, or missing FORK_SUBAGENT env)
  const r254 = enh254.check({
    skill: ctx.skill,
    context: ctx.context,
    platform: ctx.platform || process.platform,
    forkSubagentEnv: ctx.forkSubagentEnv,
    disableModelInvocation: ctx.disableModelInvocation,
  });
  if (r254.hit && r254.meta) results.push(r254.meta);

  return {
    metas: results,
    attributions: results.map((m) => formatAttribution(m)),
  };
}

/**
 * Emit attribution lines to stderr (used by pre-write.js).
 * @param {Object[]} metas
 */
function emitAttribution(metas) {
  if (!Array.isArray(metas) || metas.length === 0) return;
  for (const meta of metas) {
    // eslint-disable-next-line no-console
    console.warn(formatAttribution(meta));
  }
}

module.exports = { checkCCRegression, emitAttribution };
