/**
 * Docs=Code Invariants — single source of truth for inventory counts.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.1.6
 * Plan SC: ENH-241 cross-check prevents drift across README/MEMORY/plugin.json/audit-logger.
 *
 * When bkit adds/removes a Skill/Agent/Hook/MCP tool, update HERE first
 * and let CI verify that README.md, MEMORY.md, plugin.json, audit-logger.js
 * all reflect the same numbers.
 *
 * Pure domain module — no FS access.
 *
 * @module lib/domain/rules/docs-code-invariants
 *
 * @version 2.1.13
 */

/** @type {Readonly<{skills: number, agents: number, hookEvents: number, hookBlocks: number, mcpServers: number, mcpTools: number}>} */
const EXPECTED_COUNTS = Object.freeze({
  skills: 44,    // v2.1.13: 43 + 1 new (sprint) — Sprint Management major feature
  agents: 34,    // v2.1.13: 30 baseline + 4 new sprint agents (master-planner/orchestrator/qa-flow/report-writer). Prior memory of 36 was a miscount; actual v2.1.12 baseline was 30.
  hookEvents: 21, // unique event names (invariant maintained)
  hookBlocks: 24, // matcher-separated blocks (PreToolUse: 2 + PostToolUse: 3 + rest: 1 each, invariant maintained)
  mcpServers: 2,
  mcpTools: 19, // v2.1.13: 13 (bkit-pdca: 10 + 3 new sprint: bkit_sprint_list/bkit_sprint_status/bkit_master_plan_read) + 6 (bkit-analysis)
});

/**
 * Compare a measured inventory against EXPECTED_COUNTS.
 *
 * @param {Object} measured
 * @returns {Array<{ field: string, expected: number, actual: number }>}
 */
function diffCounts(measured) {
  if (!measured || typeof measured !== 'object') return Object.keys(EXPECTED_COUNTS).map((field) => ({
    field,
    expected: EXPECTED_COUNTS[field],
    actual: 0,
  }));
  const diffs = [];
  for (const field of Object.keys(EXPECTED_COUNTS)) {
    const actual = measured[field];
    if (actual !== EXPECTED_COUNTS[field]) {
      diffs.push({ field, expected: EXPECTED_COUNTS[field], actual: actual || 0 });
    }
  }
  return diffs;
}

module.exports = { EXPECTED_COUNTS, diffCounts };
