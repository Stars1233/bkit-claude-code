/**
 * PDCA Status Management Module — Facade (v2.1.10 split).
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §4.1
 * Plan SC: status.js 872→3파일 분할. 본 파일은 **re-export facade**로서
 *   기존 호출자(30+ 위치)에 대해 **import 경로 불변**을 보장한다.
 *
 * Split modules:
 *   - ./status-core.js       — 일상 조회/변경 API (init/load/save/update/history/active features/memory)
 *   - ./status-migration.js  — v1→v2→v3 schema migration (cold path, one-shot)
 *   - ./status-cleanup.js    — delete/enforce-limit/archive-summary
 *
 * @module lib/pdca/status
 * @version 2.1.10
 */

const core = require('./status-core');
const migration = require('./status-migration');
const cleanup = require('./status-cleanup');

module.exports = {
  // Core daily-use API
  getPdcaStatusPath: core.getPdcaStatusPath,
  initPdcaStatusIfNotExists: core.initPdcaStatusIfNotExists,
  getPdcaStatusFull: core.getPdcaStatusFull,
  loadPdcaStatus: core.loadPdcaStatus,
  savePdcaStatus: core.savePdcaStatus,
  getFeatureStatus: core.getFeatureStatus,
  updatePdcaStatus: core.updatePdcaStatus,
  addPdcaHistory: core.addPdcaHistory,
  completePdcaFeature: core.completePdcaFeature,
  setActiveFeature: core.setActiveFeature,
  addActiveFeature: core.addActiveFeature,
  removeActiveFeature: core.removeActiveFeature,
  getActiveFeatures: core.getActiveFeatures,
  switchFeatureContext: core.switchFeatureContext,
  extractFeatureFromContext: core.extractFeatureFromContext,
  readBkitMemory: core.readBkitMemory,
  writeBkitMemory: core.writeBkitMemory,

  // Migration (cold path)
  createInitialStatusV2: migration.createInitialStatusV2,
  migrateStatusToV2: migration.migrateStatusToV2,
  migrateStatusV2toV3: migration.migrateStatusV2toV3,

  // Cleanup (v1.4.8 Features cleanup functions)
  deleteFeatureFromStatus: cleanup.deleteFeatureFromStatus,
  enforceFeatureLimit: cleanup.enforceFeatureLimit,
  getArchivedFeatures: cleanup.getArchivedFeatures,
  cleanupArchivedFeatures: cleanup.cleanupArchivedFeatures,
  archiveFeatureToSummary: cleanup.archiveFeatureToSummary, // FR-04: Summary preservation
};
