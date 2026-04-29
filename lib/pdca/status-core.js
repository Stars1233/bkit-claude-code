/**
 * PDCA Status — Core daily-use functions.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §4.1
 * Plan SC: Sprint 1 status.js 872→3파일 분할 — 핵심 조회/변경 API.
 *
 * Split from `lib/pdca/status.js` (v2.1.9 baseline).
 *
 * @module lib/pdca/status-core
 *
 * @version 2.1.12
 */

const fs = require('fs');
const path = require('path');

// Lazy imports to avoid circular deps.
let _core = null;
function getCore() {
  if (!_core) _core = require('../core');
  return _core;
}
let _phase = null;
function getPhase() {
  if (!_phase) _phase = require('./phase');
  return _phase;
}
let _migration = null;
function getMigration() {
  if (!_migration) _migration = require('./status-migration');
  return _migration;
}

/** Project-scoped cache key (#48 project isolation). */
function _getCacheKey() {
  try {
    const { PROJECT_DIR } = require('../core/platform');
    return `pdca-status:${PROJECT_DIR}`;
  } catch {
    return 'pdca-status';
  }
}

/**
 * Get PDCA status file path
 * @returns {string}
 */
function getPdcaStatusPath() {
  const { STATE_PATHS } = require('../core/paths');
  return STATE_PATHS.pdcaStatus();
}

/**
 * Initialize PDCA status file if not exists
 */
function initPdcaStatusIfNotExists() {
  const { globalCache, debugLog } = getCore();
  const { createInitialStatusV2 } = getMigration();
  const statusPath = getPdcaStatusPath();

  if (fs.existsSync(statusPath)) return;

  const docsDir = path.dirname(statusPath);
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const initialStatus = createInitialStatusV2();
  fs.writeFileSync(statusPath, JSON.stringify(initialStatus, null, 2));
  globalCache.set(_getCacheKey(), initialStatus);
  debugLog('PDCA', 'Status file initialized (v2.0)', { path: statusPath });
}

/**
 * Get current PDCA status with caching and auto-migration
 * @param {boolean} forceRefresh - Skip cache and read from file
 * @returns {Object|null}
 */
function getPdcaStatusFull(forceRefresh = false) {
  const { globalCache, debugLog } = getCore();
  const { migrateStatusToV2, migrateStatusV2toV3 } = getMigration();
  const statusPath = getPdcaStatusPath();

  try {
    if (!forceRefresh) {
      const cached = globalCache.get(_getCacheKey(), 3000);
      if (cached) return cached;
    }
    if (!fs.existsSync(statusPath)) return null;

    let status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

    // Auto-migrate: v1.0 -> v2.0 -> v3.0
    if (!status.version || status.version === '1.0') {
      status = migrateStatusToV2(status);
      status = migrateStatusV2toV3(status);
      savePdcaStatus(status);
    } else if (status.version === '2.0') {
      status = migrateStatusV2toV3(status);
      savePdcaStatus(status);
    }

    globalCache.set(_getCacheKey(), status);
    return status;
  } catch (e) {
    debugLog('PDCA', 'Failed to read status', { error: e.message });
    return null;
  }
}

/**
 * Alias for getPdcaStatusFull
 * @returns {Object|null}
 */
function loadPdcaStatus() {
  return getPdcaStatusFull();
}

/**
 * Save PDCA status to file and update cache
 * @param {Object} status
 */
function savePdcaStatus(status) {
  const { globalCache, debugLog } = getCore();
  const statusPath = getPdcaStatusPath();

  try {
    status.lastUpdated = new Date().toISOString();
    if (status.session) status.session.lastActivity = status.lastUpdated;

    const docsDir = path.dirname(statusPath);
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    globalCache.set(_getCacheKey(), status);
    debugLog('PDCA', 'Status saved', { version: status.version });

    // v1.6.2: Backup to ${CLAUDE_PLUGIN_DATA} (ENH-119)
    try {
      const { backupToPluginData } = require('../core/paths');
      backupToPluginData();
    } catch {
      /* non-critical */
    }
  } catch (e) {
    debugLog('PDCA', 'Failed to save status', { error: e.message });
  }
}

/**
 * Get feature status
 * @param {string} feature
 * @returns {Object|null}
 */
function getFeatureStatus(feature) {
  const status = getPdcaStatusFull();
  return status?.features?.[feature] || null;
}

/**
 * Update PDCA status for feature
 * @param {string} feature
 * @param {string} phase
 * @param {Object} data
 */
function updatePdcaStatus(feature, phase, data = {}) {
  const { debugLog } = getCore();
  const { getPhaseNumber } = getPhase();
  const { createInitialStatusV2 } = getMigration();

  let status = getPdcaStatusFull(true) || createInitialStatusV2();

  if (!status.features[feature]) {
    status.features[feature] = {
      phase: phase,
      phaseNumber: getPhaseNumber(phase),
      matchRate: null,
      iterationCount: 0,
      requirements: [],
      documents: {},
      timestamps: { started: new Date().toISOString() },
    };
  }

  Object.assign(status.features[feature], {
    phase,
    phaseNumber: getPhaseNumber(phase),
    ...data,
    timestamps: {
      ...status.features[feature].timestamps,
      lastUpdated: new Date().toISOString(),
    },
  });

  // v2.0.5: Sync quality metrics from metrics-collector → pdca-status.metrics
  try {
    const mc = require('../quality/metrics-collector');
    const metricsData = mc.toPdcaStatusFormat(feature);
    if (metricsData) {
      status.features[feature].metrics = {
        ...(status.features[feature].metrics || {}),
        ...metricsData,
      };
    }
  } catch {
    /* metrics-collector may not be available */
  }

  if (!status.activeFeatures.includes(feature)) status.activeFeatures.push(feature);
  if (!status.primaryFeature) status.primaryFeature = feature;

  status.history.push({
    timestamp: new Date().toISOString(),
    feature,
    phase,
    action: 'updated',
  });

  savePdcaStatus(status);
  debugLog('PDCA', `Updated ${feature} to ${phase}`, data);
}

/**
 * Add history entry
 * @param {Object} entry
 */
function addPdcaHistory(entry) {
  const status = getPdcaStatusFull(true);
  if (!status) return;
  if (!Array.isArray(status.history)) status.history = [];

  status.history.push({ timestamp: new Date().toISOString(), ...entry });
  if (status.history.length > 100) status.history = status.history.slice(-100);

  savePdcaStatus(status);
}

/**
 * Mark feature as completed
 * @param {string} feature
 */
function completePdcaFeature(feature) {
  updatePdcaStatus(feature, 'completed', {
    timestamps: { completed: new Date().toISOString() },
  });
}

/**
 * Set primary active feature
 * @param {string} feature
 */
function setActiveFeature(feature) {
  const { debugLog } = getCore();
  const status = getPdcaStatusFull(true);
  if (!status) return;

  status.primaryFeature = feature;
  if (!status.activeFeatures.includes(feature)) status.activeFeatures.push(feature);

  savePdcaStatus(status);
  debugLog('PDCA', 'Set active feature', { feature });
}

/**
 * Add feature to active list
 * @param {string} feature
 * @param {boolean} setAsPrimary
 */
function addActiveFeature(feature, setAsPrimary = false) {
  const status = getPdcaStatusFull(true);
  if (!status) return;
  if (!status.activeFeatures.includes(feature)) status.activeFeatures.push(feature);
  if (setAsPrimary) status.primaryFeature = feature;
  savePdcaStatus(status);
}

/**
 * Remove feature from active list
 * @param {string} feature
 */
function removeActiveFeature(feature) {
  const status = getPdcaStatusFull(true);
  if (!status) return;
  status.activeFeatures = status.activeFeatures.filter((f) => f !== feature);
  if (status.primaryFeature === feature) {
    status.primaryFeature = status.activeFeatures[0] || null;
  }
  savePdcaStatus(status);
}

/**
 * Get active features list
 * @returns {string[]}
 */
function getActiveFeatures() {
  const status = getPdcaStatusFull();
  return status?.activeFeatures || [];
}

/**
 * Switch to a different feature context
 * @param {string} feature
 * @returns {boolean}
 */
function switchFeatureContext(feature) {
  const status = getPdcaStatusFull(true);
  if (!status) return false;
  if (!status.features[feature]) return false;

  status.primaryFeature = feature;
  if (!status.activeFeatures.includes(feature)) status.activeFeatures.push(feature);

  savePdcaStatus(status);
  return true;
}

/**
 * Extract feature from context sources
 * @param {Object} sources
 * @returns {string}
 */
function extractFeatureFromContext(sources = {}) {
  if (sources.feature) return sources.feature;

  if (sources.filePath) {
    const { getConfig } = getCore();
    const featurePatterns = getConfig('featurePatterns', [
      'features',
      'modules',
      'packages',
      'domains',
    ]);
    for (const pattern of featurePatterns) {
      const regex = new RegExp(`${pattern}/([^/]+)`);
      const match = sources.filePath.match(regex);
      if (match && match[1]) return match[1];
    }
  }

  const status = getPdcaStatusFull();
  return status?.primaryFeature || '';
}

/**
 * Read bkit memory state from .bkit/state/memory.json
 * @returns {Object|null}
 */
function readBkitMemory() {
  const { safeJsonParse } = getCore();
  const { STATE_PATHS } = require('../core/paths');
  const memoryPath = STATE_PATHS.memory();
  try {
    if (fs.existsSync(memoryPath)) {
      const content = fs.readFileSync(memoryPath, 'utf8');
      return safeJsonParse(content);
    }
  } catch {
    /* silent */
  }
  return null;
}

/**
 * Write bkit memory state
 * @param {Object} memory
 * @returns {boolean}
 */
function writeBkitMemory(memory) {
  const { STATE_PATHS } = require('../core/paths');
  const memoryPath = STATE_PATHS.memory();
  try {
    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2) + '\n', 'utf8');
    try {
      const { backupToPluginData } = require('../core/paths');
      backupToPluginData();
    } catch {
      /* non-critical */
    }
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getPdcaStatusPath,
  initPdcaStatusIfNotExists,
  getPdcaStatusFull,
  loadPdcaStatus,
  savePdcaStatus,
  getFeatureStatus,
  updatePdcaStatus,
  addPdcaHistory,
  completePdcaFeature,
  setActiveFeature,
  addActiveFeature,
  removeActiveFeature,
  getActiveFeatures,
  switchFeatureContext,
  extractFeatureFromContext,
  readBkitMemory,
  writeBkitMemory,
};
