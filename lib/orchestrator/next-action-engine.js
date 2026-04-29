/**
 * Next Action Engine — unified Next-Action hint generator for Stop-family hooks.
 *
 * Sprint 7c (v2.1.10): Stop/SubagentStop/SessionEnd의 모든 경로에서 사용자에게
 * "다음 단계 `/pdca X`"를 제안하는 표준 포맷 생성.
 *
 * 기존에는 scripts/pdca-skill-stop.js 만 Next Action 완비. unified-stop.js 기본
 * 경로와 session-end-handler.js, subagent-stop-handler.js는 Next Action 부재.
 * 본 모듈은 그 gap을 일관된 hint 생성기로 메움.
 *
 * Design Ref: bkit-v2110-orchestration-integrity.design.md §3.3.5
 * Plan SC: G-J-05/06/07
 *
 * @module lib/orchestrator/next-action-engine
 *
 * @version 2.1.12
 */

const PHASE_NEXT_SKILL = Object.freeze({
  pm: (f) => `/pdca plan ${f || ''}`.trim(),
  plan: (f) => `/pdca design ${f || ''}`.trim(),
  design: (f) => `/pdca do ${f || ''}`.trim(),
  do: (f) => `/pdca analyze ${f || ''}`.trim(),
  check: (f) => `/pdca iterate ${f || ''}`.trim(),
  act: (f) => `/pdca analyze ${f || ''}`.trim(),
  qa: (f) => `/pdca report ${f || ''}`.trim(),
  report: (f) => `/pdca archive ${f || ''}`.trim(),
  archived: () => null,
});

/**
 * Generate a phase-based next command string.
 * @param {string} phase
 * @param {string} [feature]
 * @returns {string|null}
 */
function generatePhaseNext(phase, feature) {
  const gen = PHASE_NEXT_SKILL[phase];
  if (typeof gen !== 'function') return null;
  return gen(feature) || null;
}

/**
 * Build a single-line user-facing suggestion message.
 * @param {object} ctx  { activeSkill?, activeAgent?, pdcaStatus?, advanceMode? }
 * @returns {string|null}
 */
function generateGeneric(ctx = {}) {
  const phase = ctx.pdcaStatus && ctx.pdcaStatus.currentPhase;
  const feature = ctx.pdcaStatus && ctx.pdcaStatus.primaryFeature;
  if (phase && feature) {
    const cmd = generatePhaseNext(phase, feature);
    if (cmd) {
      const mode = ctx.advanceMode || 'soft';
      const marker = mode === 'auto' ? '[AUTO]' : mode === 'gate' ? '[GATE]' : '[SUGGEST]';
      return `${marker} Next action: ${cmd}`;
    }
  }
  if (ctx.activeSkill === 'pdca' || ctx.activeSkill === 'bkit:pdca') {
    return '[SUGGEST] Continue PDCA cycle: /pdca next  |  /pdca status';
  }
  return null;
}

/**
 * Build a SessionEnd-specific next-action hint.
 * @param {object} ctx
 * @returns {string|null}
 */
function generateSessionEnd(ctx = {}) {
  const phase = ctx.pdcaStatus && ctx.pdcaStatus.currentPhase;
  const feature = ctx.pdcaStatus && ctx.pdcaStatus.primaryFeature;
  if (phase && feature) {
    return `[RESUME] When resuming, continue with: ${generatePhaseNext(phase, feature) || '/pdca status'}`;
  }
  return '[RESUME] Tip: use /pdca status on resume to see any in-progress feature.';
}

/**
 * Build a SubagentStop next-action hint.
 * @param {object} ctx
 * @returns {string|null}
 */
function generateSubagentStop(ctx = {}) {
  const { agentName, status, pdcaStatus } = ctx;
  const phase = pdcaStatus && pdcaStatus.currentPhase;
  const feature = pdcaStatus && pdcaStatus.primaryFeature;
  if (status === 'failed') {
    return `[SUGGEST] Sub-agent ${agentName || 'unknown'} failed. Check /pdca status, then /pdca iterate ${feature || ''}`.trim();
  }
  if (phase && feature) {
    const cmd = generatePhaseNext(phase, feature);
    if (cmd) return `[SUGGEST] Sub-agent ${agentName || 'unknown'} completed. Next: ${cmd}`;
  }
  return null;
}

/**
 * Structured suggestions array for user-prompt-handler's hookSpecificOutput.
 * Consumers may render these as chips/buttons in clients that support them.
 * @param {object[]} routed  IntentRouter output
 * @returns {object[]}
 */
function toStructuredSuggestions(routed) {
  if (!Array.isArray(routed)) return [];
  return routed
    .filter((r) => r && r.name)
    .map((r) => ({
      type: r.type || 'skill',
      name: r.name,
      args: r.args || null,
      confidence: typeof r.confidence === 'number' ? r.confidence : null,
      rationale: r.rationale || null,
    }));
}

module.exports = {
  PHASE_NEXT_SKILL,
  generatePhaseNext,
  generateGeneric,
  generateSessionEnd,
  generateSubagentStop,
  toStructuredSuggestions,
};
