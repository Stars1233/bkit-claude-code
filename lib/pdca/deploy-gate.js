/**
 * Deploy Promotion Gate — Environment promotion conditions
 * @module lib/pdca/deploy-gate
 * @version 3.0.0
 *
 * FR-16: Automation Level L5/L6
 * FR-17: Environment promotion gates (DEV 90%+ → STAGING, STAGING 95%+ → PROD)
 * FR-18: Rollback support
 */
const fs = require('fs');

let _dsm = null;
function getDsm() {
  if (!_dsm) { _dsm = require('./deploy-state-machine'); }
  return _dsm;
}

// ── Automation Levels ──

const AUTOMATION_LEVELS = {
  0: { name: 'Manual', deploy: false, heal: false, description: 'All manual' },
  1: { name: 'Guide', deploy: false, heal: false, description: 'Guide + suggestions' },
  2: { name: 'Semi-Auto', deploy: false, heal: false, description: 'Confirm before actions' },
  3: { name: 'Auto', deploy: false, heal: false, description: 'Auto with review' },
  4: { name: 'Full-Auto', deploy: false, heal: false, description: 'Full automation' },
  5: { name: 'Deploy-Auto', deploy: true, heal: false, description: 'CI/CD + env promotion auto' },
  6: { name: 'Self-Heal-Auto', deploy: true, heal: true, description: 'Error→Fix→PR auto, review only human' },
};

/**
 * Check if environment promotion is allowed
 * @param {string} fromEnv - Current environment
 * @param {string} toEnv - Target environment
 * @param {number} matchRate - Current match rate
 * @param {number} automationLevel - Current automation level (0-6)
 * @returns {PromotionResult}
 */
function checkPromotion(fromEnv, toEnv, matchRate, automationLevel = 2) {
  const gates = {
    'dev->staging': { minMatchRate: 90, requiresApproval: automationLevel < 5 },
    'staging->prod': { minMatchRate: 95, requiresApproval: true },  // Always requires human for prod
  };

  const key = `${fromEnv}->${toEnv}`;
  const gate = gates[key];

  if (!gate) {
    return { allowed: false, reason: `Unknown promotion path: ${key}` };
  }

  if (matchRate < gate.minMatchRate) {
    return {
      allowed: false,
      reason: `Match Rate ${matchRate}% < ${gate.minMatchRate}% threshold for ${toEnv}`,
      matchRate,
      required: gate.minMatchRate,
    };
  }

  if (gate.requiresApproval) {
    return {
      allowed: true,
      requiresApproval: true,
      reason: `Match Rate ${matchRate}% meets ${gate.minMatchRate}% threshold. Human approval required for ${toEnv}.`,
      matchRate,
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    reason: `Auto-promoted to ${toEnv} (L${automationLevel} + ${matchRate}% >= ${gate.minMatchRate}%)`,
    matchRate,
  };
}

/**
 * Execute rollback for a feature/environment
 * @param {string} feature - Feature name
 * @param {string} env - Environment to rollback
 * @returns {RollbackResult}
 */
function executeRollback(feature, env) {
  const dsm = getDsm();
  const state = dsm.getDeployState(feature);

  if (state.state === 'idle') {
    return { success: false, reason: 'No active deploy to rollback' };
  }

  const result = dsm.transitionDeploy(feature, 'DEPLOY_ROLLBACK');
  if (!result.success) {
    // Try direct rollback from current state
    const directResult = dsm.transitionDeploy(feature, 'DEPLOY_FAIL');
    if (directResult.success) {
      return dsm.transitionDeploy(feature, 'DEPLOY_ROLLBACK');
    }
    return { success: false, reason: result.error };
  }

  // Complete rollback
  dsm.transitionDeploy(feature, 'DEPLOY_COMPLETE');

  return {
    success: true,
    env,
    previousState: state.state,
    message: `Rolled back ${feature} in ${env}. Deploy state reset to idle.`,
  };
}

/**
 * Get automation level info
 */
function getAutomationLevel(level) {
  return AUTOMATION_LEVELS[level] || AUTOMATION_LEVELS[2];
}

/**
 * Format promotion gate status
 */
function formatGateStatus(fromEnv, toEnv, matchRate, automationLevel) {
  const result = checkPromotion(fromEnv, toEnv, matchRate, automationLevel);
  const icon = result.allowed ? (result.requiresApproval ? '🧑‍💻' : '✅') : '❌';
  return `${icon} ${fromEnv} → ${toEnv}: ${result.reason}`;
}

/**
 * Check if auto-rollback should trigger based on ops metrics
 * FR-26: Integrates with ops-metrics to detect error rate spike post-deploy
 * @param {string} feature - Feature name
 * @param {Object} options - { metricsFile }
 * @returns {AutoRollbackResult}
 */
async function checkAutoRollback(feature, options = {}) {
  let opsMetrics;
  try {
    opsMetrics = require('../context/ops-metrics');
  } catch {
    return { shouldRollback: false, reason: 'ops-metrics module not available' };
  }

  const metrics = await opsMetrics.collectOpsMetrics(feature, options);
  const evaluation = opsMetrics.evaluateOpsMetrics(metrics);

  if (evaluation.hasCritical) {
    // Auto-rollback on critical ops metrics
    const criticals = evaluation.results.filter(r => r.status === 'critical');
    const reasons = criticals.map(r => `${r.metric}: ${r.value}`).join(', ');

    return {
      shouldRollback: true,
      reason: `Critical ops metrics detected: ${reasons}`,
      metrics: evaluation,
      action: 'auto-rollback',
    };
  }

  return {
    shouldRollback: false,
    reason: evaluation.hasCritical ? 'Warning level only' : 'All metrics healthy',
    metrics: evaluation,
  };
}

module.exports = {
  AUTOMATION_LEVELS,
  checkPromotion,
  executeRollback,
  checkAutoRollback,
  getAutomationLevel,
  formatGateStatus,
};
