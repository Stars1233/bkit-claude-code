'use strict';

/**
 * data-flow-validator.adapter.js — Sprint 2 deps.dataFlowValidator production scaffold (v2.1.13 Sprint 5).
 *
 * Returns a function matching Sprint 2 verify-data-flow.usecase.js deps interface:
 *   async function dataFlowValidator(feature, hopId, sprint)
 *     -> { passed: boolean, evidence?: string, reason?: string }
 *
 * Three-tier strategy:
 *   1. No-op baseline (no opts): returns passed:false reason:'no_validator_injected'.
 *   2. Static heuristic (staticMatrix:true, no mcpClient): reads sprint.dataFlow matrix.
 *   3. Live probe (mcpClient injected): invokes chrome-qa MCP probe_hop tool.
 *
 * Integration point (Sprint 6 or v2.1.14):
 *   Wire `mcpClient` so it dispatches to the actual chrome-qa MCP server.
 *   Until then, static heuristic provides reliable matrix-based validation.
 *
 * @module lib/infra/sprint/data-flow-validator.adapter
 * @version 2.1.13
 * @since 2.1.13
 */

const FROZEN_HOP_IDS = Object.freeze(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7']);

/**
 * @typedef {Object} DataFlowValidatorOpts
 * @property {string} projectRoot
 * @property {boolean} [staticMatrix] - enable static heuristic tier
 * @property {{ callTool: (req:{name:string,arguments:object}) => Promise<object> }} [mcpClient]
 */

/**
 * @typedef {Object} ValidatorResult
 * @property {boolean} passed
 * @property {string} [evidence]
 * @property {string} [reason]
 */

/**
 * Factory — produces a function matching deps.dataFlowValidator signature.
 *
 * @param {DataFlowValidatorOpts} [opts]
 * @returns {(feature:string, hopId:string, sprint:object) => Promise<ValidatorResult>}
 */
function createDataFlowValidator(opts) {
  const o = opts || {};

  // Tier 1: no-op baseline (Sprint 2 verify-data-flow default behavior)
  if (!o.mcpClient && !o.staticMatrix) {
    return async function validatorNoop(_feature, _hopId, _sprint) {
      return { passed: false, reason: 'no_validator_injected' };
    };
  }

  // Tier 2: static heuristic from sprint.dataFlow matrix
  if (!o.mcpClient && o.staticMatrix === true) {
    return async function validatorStatic(feature, hopId, sprint) {
      if (!FROZEN_HOP_IDS.includes(hopId)) {
        return { passed: false, reason: 'invalid_hop: ' + hopId };
      }
      const matrix = sprint && sprint.dataFlow && sprint.dataFlow[feature];
      if (!matrix) {
        return { passed: false, reason: 'no_matrix_for_feature: ' + feature };
      }
      const hop = matrix[hopId];
      if (hop && hop.status === 'pass') {
        return { passed: true, evidence: hop.evidence || 'static_matrix_pass' };
      }
      const statusVal = hop ? hop.status : 'missing';
      return { passed: false, reason: 'hop_' + hopId + '_status_' + statusVal };
    };
  }

  // Tier 3: live probe via chrome-qa MCP
  return async function validatorLive(feature, hopId, sprint) {
    if (!FROZEN_HOP_IDS.includes(hopId)) {
      return { passed: false, reason: 'invalid_hop: ' + hopId };
    }
    try {
      const sprintId = sprint && sprint.id ? sprint.id : 'unknown';
      const result = await o.mcpClient.callTool({
        name: 'chrome-qa.probe_hop',
        arguments: { feature: feature, hopId: hopId, sprintId: sprintId },
      });
      const out = result || {};
      return {
        passed: !!out.passed,
        evidence: out.evidence || 'live_probe',
        reason: out.reason,
      };
    } catch (e) {
      return { passed: false, reason: 'mcp_error: ' + String(e && e.message ? e.message : e) };
    }
  };
}

module.exports = {
  createDataFlowValidator: createDataFlowValidator,
  FROZEN_HOP_IDS: FROZEN_HOP_IDS,
};
