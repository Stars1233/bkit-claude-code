/**
 * Workflow State Machine — PDCA phase × Control Level 통합 의사결정.
 *
 * Sprint 7b (v2.1.10): 기존 분리된 3 시스템을 단일 진입점으로 묶음.
 *   (1) lib/pdca/state-machine.js     — 선언적 FSM (24 transitions, 11 guards)
 *   (2) lib/pdca/automation.js         — shouldAutoAdvance / generateAutoTrigger
 *   (3) lib/control/automation-controller.js — L0~L4 + GATE_CONFIG
 *
 * decideNextAction()은 세 시스템을 합쳐 일관된 advance mode를 반환하며,
 * G-P-10(ARCHIVE dispatcher)와 G-P-13(DO_COMPLETE setter)도 여기서 제공.
 *
 * Design Ref: bkit-v2110-orchestration-integrity.design.md §3.2.2
 * Plan SC: G-P-01 (matchRate SSoT), G-P-02 (GATE 연결), G-P-10, G-P-13
 *
 * @module lib/orchestrator/workflow-state-machine
 *
 * @version 2.1.12
 */

const NEXT_PHASE = Object.freeze({
  idle: 'pm',
  pm: 'plan',
  plan: 'design',
  design: 'do',
  do: 'check',
  check: 'qa',
  qa: 'report',
  report: 'archived',
});

/**
 * @typedef {Object} NextActionDecision
 * @property {string} phase              Current phase
 * @property {string|null} nextPhase
 * @property {object|null} autoTrigger   { skill, args } or null
 * @property {boolean} canAdvanceByLevel Control L 기준 auto advance 가능
 * @property {boolean} shouldAdvance     pdca automation 기준 advance 권고
 * @property {'auto'|'soft'|'gate'} advanceMode
 * @property {number} level
 */

function nextPhase(phase) {
  return NEXT_PHASE[phase] || null;
}

/**
 * Decide the advance mode for a given phase and feature context.
 * @param {string} phase
 * @param {object} context  { feature, matchRate, qaPassRate, qaCriticalCount, iterationCount, ... }
 * @returns {NextActionDecision}
 */
function decideNextAction(phase, context = {}) {
  let canAdvance = true;
  let shouldAdv = true;
  let trigger = null;
  let level = 2;

  try {
    const ctl = require('../control/automation-controller');
    level = typeof ctl.getCurrentLevel === 'function' ? ctl.getCurrentLevel() : 2;
    const next = nextPhase(phase);
    if (next && typeof ctl.canAutoAdvance === 'function') {
      canAdvance = ctl.canAutoAdvance(phase, next, level);
    }
  } catch (_e) { /* fail-open */ }

  try {
    const auto = require('../pdca/automation');
    shouldAdv = typeof auto.shouldAutoAdvance === 'function' ? auto.shouldAutoAdvance(phase) : true;
    trigger = typeof auto.generateAutoTrigger === 'function'
      ? auto.generateAutoTrigger(phase, context)
      : null;
  } catch (_e) { /* fail-open */ }

  let advanceMode = 'gate';
  if (canAdvance && shouldAdv) {
    advanceMode = level >= 3 ? 'auto' : 'soft';
  } else if (canAdvance || shouldAdv) {
    advanceMode = 'soft';
  }

  return {
    phase,
    nextPhase: nextPhase(phase),
    autoTrigger: trigger,
    canAdvanceByLevel: canAdvance,
    shouldAdvance: shouldAdv,
    advanceMode,
    level,
  };
}

/**
 * G-P-10: report → archived 자동 dispatch.
 * report-generator agent 완료 직후 호출되어야 함.
 * @param {string} feature
 * @returns {object|null}  state-machine transition result
 */
function dispatchArchive(feature) {
  try {
    const sm = require('../pdca/state-machine');
    const ctx = typeof sm.loadContext === 'function' ? sm.loadContext(feature) : null;
    if (ctx && ctx.currentState === 'report' && typeof sm.transition === 'function') {
      return sm.transition('report', 'ARCHIVE', ctx);
    }
  } catch (_e) { /* fail-silent */ }
  return null;
}

/**
 * G-P-13: Do phase completion을 메타데이터로 기록.
 * Do skill이 완료될 때 호출되어야 guardDoComplete가 통과.
 * @param {string} feature
 * @param {object} result  { tasksCompleted, filesChanged, ... }
 * @returns {object|null}
 */
function markDoComplete(feature, result = {}) {
  try {
    const sm = require('../pdca/state-machine');
    let ctx = typeof sm.loadContext === 'function' ? sm.loadContext(feature) : null;
    if (!ctx && typeof sm.createContext === 'function') {
      ctx = sm.createContext(feature);
    }
    if (!ctx) return null;
    ctx.metadata = ctx.metadata || {};
    ctx.metadata.doCompletionResult = Object.assign({ complete: true, at: new Date().toISOString() }, result);
    if (typeof sm.saveContext === 'function') {
      sm.saveContext(ctx);
    }
    return ctx;
  } catch (_e) {
    return null;
  }
}

/**
 * G-P-01: matchRate threshold 단일 진실원(`bkit.config.json:pdca.matchRateThreshold`).
 * 기본값 90.
 * @returns {number}
 */
function getMatchRateThreshold() {
  try {
    const { getConfig } = require('../core/config');
    return getConfig('pdca.matchRateThreshold', 90);
  } catch (_e) {
    return 90;
  }
}

module.exports = {
  nextPhase,
  decideNextAction,
  dispatchArchive,
  markDoComplete,
  getMatchRateThreshold,
  NEXT_PHASE,
};
