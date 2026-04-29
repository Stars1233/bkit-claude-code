/**
 * ENH-263 Guard — CC v2.1.117 #51801 regression attribution (.claude/ write).
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.1.2
 * Plan SC: bkit does NOT block; attribution only.
 *
 * Regression: bypassPermissions mode + PreToolUse allow combination on
 *   .claude/agents|skills|channels|commands/* write — CC's built-in
 *   .claude/ guard overrides hook allow → user prompt appears.
 *
 * Pure domain function.
 *
 * @module lib/domain/guards/enh-263-claude-write
 *
 * @version 2.1.12
 */

const CLAUDE_PROTECTED_PREFIXES = [
  '.claude/agents/',
  '.claude/skills/',
  '.claude/channels/',
  '.claude/commands/',
];

/**
 * @typedef {Object} WriteContext
 * @property {string} tool - Write|Edit|NotebookEdit
 * @property {string} [filePath] - Absolute or relative path being written
 * @property {boolean} [bypassPermissions]
 * @property {'allow'|'deny'|'ask'|'defer'} [permissionDecision]
 */

function writesToClaude(filePath) {
  if (typeof filePath !== 'string' || !filePath) return false;
  // Normalize: drop any leading absolute segment to match relative prefixes.
  const normalized = filePath.replace(/\\/g, '/').replace(/.*?\/?\.claude\//, '.claude/');
  return CLAUDE_PROTECTED_PREFIXES.some((p) => normalized.startsWith(p));
}

/**
 * @param {WriteContext} ctx
 * @returns {{ hit: boolean, meta?: Object }}
 */
function check(ctx) {
  if (!ctx || typeof ctx !== 'object') return { hit: false };
  if (!['Write', 'Edit', 'NotebookEdit'].includes(ctx.tool)) return { hit: false };
  if (!ctx.bypassPermissions) return { hit: false };
  if (ctx.permissionDecision !== 'allow') return { hit: false };
  if (!writesToClaude(ctx.filePath)) return { hit: false };

  return {
    hit: true,
    meta: {
      id: 'ENH-263',
      severity: 'HIGH',
      note: "CC's .claude/ built-in guard overrides hook allow — manual confirm expected this turn",
      ccIssue: 'https://github.com/anthropics/claude-code/issues/51801',
    },
  };
}

function removeWhen(ccVersion) {
  if (!ccVersion || typeof ccVersion !== 'string') return false;
  const [maj, min, pat] = ccVersion.split('.').map((n) => parseInt(n, 10) || 0);
  if (maj < 2) return false;
  if (maj > 2) return true;
  if (min > 1) return true;
  return min === 1 && pat >= 118;
}

module.exports = { check, removeWhen, writesToClaude, CLAUDE_PROTECTED_PREFIXES };
