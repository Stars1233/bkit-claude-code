'use strict';

/**
 * gap-detector.adapter.js — Sprint 2 deps.gapDetector production scaffold (v2.1.13 Sprint 5).
 *
 * Returns a function matching Sprint 2 iterate-sprint.usecase.js deps interface:
 *   async function gapDetector(sprint) -> { matchRate: number, gaps: Array }
 *
 * Three-tier strategy:
 *   1. No-op baseline (no agentTaskRunner injected): returns 100% matchRate.
 *   2. Real scaffold (agentTaskRunner injected): invokes agents/gap-detector.md via Task tool.
 *
 * Integration point (Sprint 6 or v2.1.14):
 *   Wire `agentTaskRunner` so it calls the actual Claude Code Task tool with
 *   subagent_type 'gap-detector'. Until then, default no-op preserves
 *   sprint iteration loop without false gap reports.
 *
 * Sprint 5 use case (consumer):
 *
 *   const infra = require('lib/infra/sprint');
 *   const gapDetector = infra.createGapDetector({ projectRoot });
 *   const lifecycle = require('lib/application/sprint-lifecycle');
 *   await lifecycle.iterateSprint(sprint, { gapDetector });
 *
 * @module lib/infra/sprint/gap-detector.adapter
 * @version 2.1.13
 * @since 2.1.13
 */

/**
 * @typedef {Object} GapDetectorOpts
 * @property {string} projectRoot
 * @property {(req:{subagent_type:string, prompt:string}) => Promise<{output:string}>} [agentTaskRunner]
 * @property {() => number} [clock]
 */

/**
 * @typedef {Object} GapResult
 * @property {number} matchRate     - 0-100
 * @property {Array<{id:string, severity:string, description:string}>} gaps
 */

/**
 * Factory — produces a function matching deps.gapDetector signature.
 *
 * @param {GapDetectorOpts} [opts]
 * @returns {(sprint:object) => Promise<GapResult>}
 */
function createGapDetector(opts) {
  const o = opts || {};

  if (typeof o.agentTaskRunner !== 'function') {
    return async function gapDetectorNoop(_sprint) {
      return { matchRate: 100, gaps: [] };
    };
  }

  return async function gapDetectorReal(sprint) {
    const phaseInfo = sprint && sprint.phase ? sprint.phase : 'unknown';
    const sprintId = sprint && sprint.id ? sprint.id : 'unknown';
    const prompt = [
      'Detect gaps in sprint ' + sprintId + ' at phase ' + phaseInfo + '.',
      'Compare design/plan vs current implementation.',
      'Return JSON: { "matchRate": <0-100>, "gaps": [{"id":"...","severity":"low|medium|high","description":"..."}] }',
    ].join('\n');

    try {
      const result = await o.agentTaskRunner({
        subagent_type: 'gap-detector',
        prompt: prompt,
      });
      return parseGapDetectorOutput(result);
    } catch (e) {
      return {
        matchRate: 0,
        gaps: [{ id: 'runner_error', severity: 'high', description: String(e && e.message ? e.message : e) }],
      };
    }
  };
}

/**
 * Parse gap-detector agent output (best-effort JSON extraction).
 *
 * @param {{output?:string}} result
 * @returns {GapResult}
 */
function parseGapDetectorOutput(result) {
  if (!result || typeof result.output !== 'string') {
    return {
      matchRate: 0,
      gaps: [{ id: 'no_output', severity: 'high', description: 'empty agent output' }],
    };
  }
  // Balanced-brace extraction (handles nested objects/arrays in JSON correctly)
  const block = extractBalancedJson(result.output);
  if (!block) {
    return {
      matchRate: 0,
      gaps: [{ id: 'parse_fail', severity: 'high', description: 'no JSON in output' }],
    };
  }
  try {
    const parsed = JSON.parse(block);
    return {
      matchRate: typeof parsed.matchRate === 'number' ? parsed.matchRate : 0,
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    };
  } catch (e) {
    return {
      matchRate: 0,
      gaps: [{ id: 'json_invalid', severity: 'high', description: 'JSON parse fail: ' + e.message }],
    };
  }
}

/**
 * Extract the first balanced JSON object from a string (string-aware).
 * Walks through the input, tracking brace depth and respecting string boundaries.
 *
 * @param {string} text
 * @returns {string|null} - The matched JSON substring, or null if no balanced object found.
 */
function extractBalancedJson(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

module.exports = {
  createGapDetector: createGapDetector,
  parseGapDetectorOutput: parseGapDetectorOutput,
};
