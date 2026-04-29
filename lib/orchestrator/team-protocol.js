/**
 * Team Invocation Protocol — bridges Lead agents to the Task tool spawn surface.
 *
 * Sprint 7a (v2.1.10): PM Lead / CTO Lead / QA Lead가 sub-agent를 실 Task tool로
 * spawn하는 과정에서 bkit이 관여하는 레이어.
 * bkit 코드 자체는 Task tool을 직접 실행할 수 없으므로, 이 모듈은
 *   (1) canSpawn() 가드(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)
 *   (2) registerSpawn() 의도 기록 + state-writer lifecycle 연동
 *   (3) buildPrompt() 표준 프롬프트 생성
 *   (4) completeSpawn() 완료 상태 기록 + cc-regression 이벤트 로그
 * 만 담당하며, 실제 Task 발화는 Lead agent의 LLM 턴에서 수행된다.
 *
 * Design Ref: bkit-v2110-orchestration-integrity.design.md §3.1.1
 * Plan SC: G-T-01/02/05/06 해결
 *
 * @module lib/orchestrator/team-protocol
 *
 * @version 2.1.12
 */

/**
 * @typedef {Object} SpawnRequest
 * @property {'pm-lead'|'cto-lead'|'qa-lead'} lead
 * @property {string} sub                Sub-agent name, e.g. 'pm-discovery'
 * @property {string} prompt             Task prompt body
 * @property {string} [feature]          PDCA feature key
 * @property {string} [phase]            PDCA phase when spawning
 */

/**
 * Check whether CC Agent Teams runtime is available.
 * Required for 1-level sub-agent Task tool spawn.
 * @returns {boolean}
 */
function canSpawn() {
  try {
    const team = require('../team');
    return typeof team.isTeamModeAvailable === 'function'
      ? team.isTeamModeAvailable()
      : process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1';
  } catch (_e) {
    return process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1';
  }
}

/**
 * Register teammate spawn intent and prepare the prompt template.
 * The Lead agent's LLM turn is expected to invoke the Task tool with the
 * returned taskPrompt.
 *
 * @param {SpawnRequest} req
 * @returns {{taskPrompt:string, env:'agent-teams'|'prose-fallback', env_available:boolean}}
 */
function registerSpawn(req) {
  if (!req || !req.lead || !req.sub) {
    throw new TypeError('registerSpawn requires {lead, sub}');
  }

  const available = canSpawn();

  // state-writer lifecycle — best effort, never throws
  try {
    const sw = require('../team/state-writer');
    if (typeof sw.addTeammate === 'function') {
      sw.addTeammate(req.sub, 'pending', {
        lead: req.lead,
        feature: req.feature || null,
        phase: req.phase || null,
      });
    }
  } catch (_e) { /* fail-silent */ }

  // cc-regression attribution (fail-silent)
  try {
    const cc = require('../cc-regression');
    const ccVersion = cc.detectCCVersion();
    if (ccVersion && typeof cc.recordEvent === 'function') {
      cc.recordEvent({
        hookEvent: 'TeamSpawn',
        ccVersion,
        sessionId: process.env.CLAUDE_SESSION_ID || null,
        timestamp: new Date().toISOString(),
        context: {
          lead: req.lead,
          sub: req.sub,
          phase: req.phase || null,
          env: available ? 'agent-teams' : 'prose-fallback',
        },
      });
    }
  } catch (_e) { /* fail-silent */ }

  return {
    taskPrompt: buildPrompt(req),
    env: available ? 'agent-teams' : 'prose-fallback',
    env_available: available,
  };
}

/**
 * Build a standard prompt prefix that binds sub-agent to its Lead context.
 * @param {SpawnRequest} req
 * @returns {string}
 */
function buildPrompt(req) {
  const featurePart = req.feature ? ` for feature "${req.feature}"` : '';
  const phasePart = req.phase ? ` during ${req.phase} phase` : '';
  return [
    `You are the ${req.sub} sub-agent invoked by ${req.lead}${featurePart}${phasePart}.`,
    '',
    req.prompt,
  ].join('\n');
}

/**
 * Mark teammate spawn as completed (or failed).
 * @param {SpawnRequest} req
 * @param {{status:'completed'|'failed', result?:any, error?:string}} result
 * @returns {void}
 */
function completeSpawn(req, result) {
  if (!req || !req.sub) return;
  try {
    const sw = require('../team/state-writer');
    if (typeof sw.updateTeammateStatus === 'function') {
      sw.updateTeammateStatus(req.sub, result && result.status || 'completed', result && result.result || null);
    }
  } catch (_e) { /* fail-silent */ }
}

module.exports = {
  canSpawn,
  registerSpawn,
  buildPrompt,
  completeSpawn,
};
