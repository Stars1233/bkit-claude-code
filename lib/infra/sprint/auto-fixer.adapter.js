'use strict';

/**
 * auto-fixer.adapter.js — Sprint 2 deps.autoFixer production scaffold (v2.1.13 Sprint 5).
 *
 * Returns a function matching Sprint 2 iterate-sprint.usecase.js deps interface:
 *   async function autoFixer(sprint, gaps) -> { fixedTaskIds: string[] }
 *
 * Three-tier strategy:
 *   1. No-op baseline (no agentTaskRunner injected): returns no fixes.
 *   2. Real scaffold (agentTaskRunner injected): invokes agents/pdca-iterator.md via Task tool.
 *
 * Integration point (Sprint 6 or v2.1.14):
 *   Wire `agentTaskRunner` so it calls the actual Claude Code Task tool with
 *   subagent_type 'pdca-iterator'. Until then, default no-op preserves
 *   sprint iteration loop without phantom fixes.
 *
 * @module lib/infra/sprint/auto-fixer.adapter
 * @version 2.1.13
 * @since 2.1.13
 */

/**
 * @typedef {Object} AutoFixerOpts
 * @property {string} projectRoot
 * @property {(req:{subagent_type:string, prompt:string}) => Promise<{output:string}>} [agentTaskRunner]
 * @property {() => number} [clock]
 */

/**
 * @typedef {Object} AutoFixerResult
 * @property {string[]} fixedTaskIds
 * @property {string} [error]
 */

/**
 * Factory — produces a function matching deps.autoFixer signature.
 *
 * @param {AutoFixerOpts} [opts]
 * @returns {(sprint:object, gaps:Array) => Promise<AutoFixerResult>}
 */
function createAutoFixer(opts) {
  const o = opts || {};

  if (typeof o.agentTaskRunner !== 'function') {
    return async function autoFixerNoop(_sprint, _gaps) {
      return { fixedTaskIds: [] };
    };
  }

  return async function autoFixerReal(sprint, gaps) {
    if (!Array.isArray(gaps) || gaps.length === 0) {
      return { fixedTaskIds: [] };
    }
    const sprintId = sprint && sprint.id ? sprint.id : 'unknown';
    const gapLines = gaps.map(function (g, i) {
      const sev = (g && g.severity) || 'medium';
      const id = (g && g.id) || ('gap_' + (i + 1));
      const desc = (g && g.description) || '';
      return '  ' + (i + 1) + '. [' + sev + '] ' + id + ': ' + desc;
    });
    const prompt = [
      'Auto-fix gaps in sprint ' + sprintId + ':',
    ].concat(gapLines).concat([
      'Return JSON: { "fixedTaskIds": ["task_id_1","task_id_2",...] }',
    ]).join('\n');

    try {
      const result = await o.agentTaskRunner({
        subagent_type: 'pdca-iterator',
        prompt: prompt,
      });
      return parseAutoFixerOutput(result);
    } catch (e) {
      return { fixedTaskIds: [], error: String(e && e.message ? e.message : e) };
    }
  };
}

/**
 * Parse auto-fixer agent output (best-effort JSON extraction).
 *
 * @param {{output?:string}} result
 * @returns {AutoFixerResult}
 */
function parseAutoFixerOutput(result) {
  if (!result || typeof result.output !== 'string') {
    return { fixedTaskIds: [] };
  }
  const m = result.output.match(/\{[\s\S]*?"fixedTaskIds"[\s\S]*?\}/);
  if (!m) return { fixedTaskIds: [] };
  try {
    const parsed = JSON.parse(m[0]);
    return {
      fixedTaskIds: Array.isArray(parsed.fixedTaskIds) ? parsed.fixedTaskIds : [],
    };
  } catch (_e) {
    return { fixedTaskIds: [] };
  }
}

module.exports = {
  createAutoFixer: createAutoFixer,
  parseAutoFixerOutput: parseAutoFixerOutput,
};
