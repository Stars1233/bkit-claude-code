/**
 * PDCA Status — Migration functions (v1 → v2 → v3).
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §4.1
 * Plan SC: Sprint 1 status.js 872→3파일 분할 — migration은 one-shot cold path로 격리.
 *
 * Split from `lib/pdca/status.js` (v2.1.9 baseline).
 *
 * @module lib/pdca/status-migration
 *
 * @version 2.1.12
 */

// Lazy core import to avoid circular dependency during module load.
let _core = null;
function getCore() {
  if (!_core) _core = require('../core');
  return _core;
}

/**
 * v2.0 Schema: Default initial status
 * @returns {Object}
 */
function createInitialStatusV2() {
  const now = new Date().toISOString();
  return {
    version: '2.0',
    lastUpdated: now,
    activeFeatures: [],
    primaryFeature: null,
    features: {},
    pipeline: {
      currentPhase: 1,
      level: 'Dynamic',
      phaseHistory: [],
    },
    session: {
      startedAt: now,
      onboardingCompleted: false,
      lastActivity: now,
    },
    history: [],
  };
}

/**
 * Migrate v1.0 schema to v2.0.
 * @param {Object} oldStatus - v1.0 status object
 * @returns {Object} v2.0 status object
 */
function migrateStatusToV2(oldStatus) {
  const { debugLog } = getCore();
  const now = new Date().toISOString();
  const newStatus = createInitialStatusV2();

  if (oldStatus.features) {
    newStatus.features = oldStatus.features;
    for (const [name, feat] of Object.entries(newStatus.features)) {
      if (!feat.requirements) feat.requirements = [];
      if (!feat.documents) feat.documents = {};
      if (!feat.timestamps) {
        feat.timestamps = {
          started: feat.startedAt || now,
          lastUpdated: feat.updatedAt || now,
        };
      }
    }
    newStatus.activeFeatures = Object.keys(newStatus.features).filter(
      (f) => newStatus.features[f].phase !== 'completed'
    );
  }

  if (oldStatus.currentFeature) {
    newStatus.primaryFeature = oldStatus.currentFeature;
    if (!newStatus.activeFeatures.includes(oldStatus.currentFeature)) {
      newStatus.activeFeatures.push(oldStatus.currentFeature);
    }
  }
  if (oldStatus.currentPhase) newStatus.pipeline.currentPhase = oldStatus.currentPhase;
  if (oldStatus.history) newStatus.history = oldStatus.history;

  newStatus.lastUpdated = now;
  newStatus.session.lastActivity = now;

  debugLog('PDCA', 'Migrated status from v1.0 to v2.0');
  return newStatus;
}

/**
 * Migrate v2.0 schema to v3.0.
 * Adds: stateMachine, metrics, phaseTimestamps, automationLevel per feature
 * Adds: global stateMachine, automation, team sections.
 * All v2.0 fields preserved unchanged.
 *
 * @param {Object} v2 - v2.0 status object
 * @returns {Object} v3.0 status object
 */
function migrateStatusV2toV3(v2) {
  if (v2.version === '3.0') return v2;

  const { debugLog } = getCore();
  const v3 = { ...v2, version: '3.0' };

  // Migrate each feature
  for (const [, feat] of Object.entries(v3.features || {})) {
    feat.stateMachine = feat.stateMachine || {
      currentState: feat.phase || 'idle',
      previousState: null,
      stateHistory: [],
      retryCount: 0,
      maxRetries: 5,
      circuitBreakerOpen: false,
    };
    feat.metrics = feat.metrics || {
      qualityScore: null,
      conventionCompliance: null,
      apiCompliance: null,
      cycleTimeMs: null,
      iterationEfficiency: null,
    };
    feat.phaseTimestamps = feat.phaseTimestamps || {};
    feat.automationLevel = feat.automationLevel || 2; // L2 default
  }

  // Add global sections
  v3.stateMachine = v3.stateMachine || {
    defaultWorkflow: 'default',
    activeWorkflows: {},
    totalTransitions: 0,
  };
  let _ts = 40;
  try {
    _ts = require('../control/trust-engine').getScore();
  } catch {
    /* non-critical */
  }
  v3.automation = v3.automation || {
    globalLevel: 2,
    trustScore: _ts,
    pendingApprovals: 0,
    lastGateResult: null,
  };
  v3.team = v3.team || {
    enabled: true,
    stateFile: '.bkit/runtime/agent-state.json',
    eventsFile: '.bkit/runtime/agent-events.jsonl',
  };

  debugLog('PDCA', 'Migrated status from v2.0 to v3.0');
  return v3;
}

module.exports = {
  createInitialStatusV2,
  migrateStatusToV2,
  migrateStatusV2toV3,
};
