/**
 * bkit Orchestrator — Sprint 7 단일 진입점.
 *
 * 3-Layer Orchestration (Plan-Plus §21, Design §1.1):
 *   Layer 1: IntentRouter         — 사용자 프롬프트 → 우선순위 suggestions
 *   Layer 2: NextActionEngine     — Hook Stop-family → 표준 Next Action hint
 *   Layer 3: TeamProtocol         — PM/CTO/QA Lead → sub-agent Task spawn
 *   Layer X: WorkflowStateMachine — PDCA phase × Control Level matrix
 *   Layer D: SubAgentDispatcher   — ENH-292 sequential dispatch (v2.1.14, #3 moat)
 *   Layer D: CacheCostAnalyzer    — ENH-292 cache hit-rate analyzer  (v2.1.14)
 *
 * @module lib/orchestrator
 *
 * @version 2.1.14
 */

const intentRouter = require('./intent-router');
const nextActionEngine = require('./next-action-engine');
const teamProtocol = require('./team-protocol');
const workflowStateMachine = require('./workflow-state-machine');
const cacheCostAnalyzer = require('./cache-cost-analyzer');
const subAgentDispatcher = require('./sub-agent-dispatcher');

module.exports = {
  // Layer 1 — Intent
  route: intentRouter.route,
  formatSuggestion: intentRouter.formatSuggestion,
  intent: intentRouter,

  // Layer 2 — Next Action
  generatePhaseNext: nextActionEngine.generatePhaseNext,
  generateGeneric: nextActionEngine.generateGeneric,
  generateSessionEnd: nextActionEngine.generateSessionEnd,
  generateSubagentStop: nextActionEngine.generateSubagentStop,
  toStructuredSuggestions: nextActionEngine.toStructuredSuggestions,
  nextAction: nextActionEngine,

  // Layer 3 — Team
  canSpawn: teamProtocol.canSpawn,
  registerSpawn: teamProtocol.registerSpawn,
  buildPrompt: teamProtocol.buildPrompt,
  completeSpawn: teamProtocol.completeSpawn,
  team: teamProtocol,

  // Layer X — Workflow SM
  decideNextAction: workflowStateMachine.decideNextAction,
  dispatchArchive: workflowStateMachine.dispatchArchive,
  markDoComplete: workflowStateMachine.markDoComplete,
  getMatchRateThreshold: workflowStateMachine.getMatchRateThreshold,
  workflow: workflowStateMachine,

  // Layer D — Sub-agent Dispatch (v2.1.14, ENH-292 #3 moat)
  createAnalyzer: cacheCostAnalyzer.createAnalyzer,
  cacheCostAnalyzer,
  createDispatcher: subAgentDispatcher.createDispatcher,
  subAgentDispatcher,
};
