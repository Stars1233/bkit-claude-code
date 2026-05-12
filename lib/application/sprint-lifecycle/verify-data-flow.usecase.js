/**
 * verify-data-flow.usecase.js — Sprint 7-Layer data-flow verification (v2.1.13 Sprint 2).
 *
 * Implements S1 dataFlowIntegrity gate input: walks the seven UI↔DB
 * hops sequentially (ENH-292) and aggregates pass/fail into an s1Score.
 *
 * Pure use case — actual validation is provided via deps.dataFlowValidator
 * (Sprint 4 chrome-qa / API contract adapter). Default validator returns
 * `{ passed: false, reason: 'no_validator_injected' }` so the use case is
 * safe to call before adapters land.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-2-application.design.md §5
 * ADR Ref: 0009 (Quality Gate S1 dataFlowIntegrity)
 *
 * @module lib/application/sprint-lifecycle/verify-data-flow.usecase
 * @version 2.1.13
 * @since 2.1.13
 */

/**
 * The fixed seven hops in a full UI→DB→UI round trip. Frozen at both layers.
 */
const SEVEN_LAYER_HOPS = Object.freeze([
  Object.freeze({ id: 'H1', from: 'UI',         to: 'Client'     }),
  Object.freeze({ id: 'H2', from: 'Client',     to: 'API'        }),
  Object.freeze({ id: 'H3', from: 'API',        to: 'Validation' }),
  Object.freeze({ id: 'H4', from: 'Validation', to: 'DB'         }),
  Object.freeze({ id: 'H5', from: 'DB',         to: 'Response'   }),
  Object.freeze({ id: 'H6', from: 'Response',   to: 'Client'     }),
  Object.freeze({ id: 'H7', from: 'Client',     to: 'UI'         }),
]);

/**
 * @typedef {Object} HopResult
 * @property {string} hopId
 * @property {string} from
 * @property {string} to
 * @property {boolean} passed
 * @property {string|null} evidence
 * @property {string|null} reason
 */

function defaultValidator(_feature, _hopId, _sprint) {
  return Promise.resolve({ passed: false, reason: 'no_validator_injected' });
}

/**
 * Verify all 7 layer hops for a single feature, sequentially (ENH-292).
 *
 * @param {import('../../domain/sprint/entity').Sprint} sprint
 * @param {string} featureName
 * @param {{ dataFlowValidator?: (feature: string, hopId: string, sprint: object) => Promise<{ passed: boolean, evidence?: string, reason?: string }> }} [deps]
 * @returns {Promise<{ ok: boolean, featureName: string, s1Score: number, hopResults: HopResult[] }>}
 */
async function verifyDataFlow(sprint, featureName, deps) {
  const validator = (deps && typeof deps.dataFlowValidator === 'function')
    ? deps.dataFlowValidator
    : defaultValidator;

  const hopResults = [];
  // ENH-292 sequential dispatch — one hop at a time, never Promise.all.
  for (const hop of SEVEN_LAYER_HOPS) {
    const r = await validator(featureName, hop.id, sprint);
    hopResults.push({
      hopId: hop.id,
      from: hop.from,
      to: hop.to,
      passed: !!(r && r.passed),
      evidence: (r && typeof r.evidence === 'string') ? r.evidence : null,
      reason: (r && typeof r.reason === 'string') ? r.reason : null,
    });
  }

  const passedCount = hopResults.filter((r) => r.passed).length;
  const s1Score = (passedCount / SEVEN_LAYER_HOPS.length) * 100;
  return { ok: true, featureName, s1Score, hopResults };
}

module.exports = {
  verifyDataFlow,
  SEVEN_LAYER_HOPS,
};
