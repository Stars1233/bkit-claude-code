/**
 * CC Regression — public facade.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.2.6
 * Plan SC: Single-entry facade for hook handlers and audit loggers.
 *
 * @module lib/cc-regression
 */

const registry = require('./registry');
const coordinator = require('./defense-coordinator');
const accountant = require('./token-accountant');
const lifecycle = require('./lifecycle');
const formatter = require('./attribution-formatter');
const eventRecorder = require('./event-recorder');
const precompactCounter = require('./precompact-counter');

// v2.1.10 Sprint 6 NEW 6-3: cc-payload Port adapter (infrastructure layer).
// Exposed through this facade so hook handlers can access centralized CC
// payload parsing without importing lib/infra/ directly.
const ccBridge = require('../infra/cc-bridge');

module.exports = {
  // Registry
  listActive: registry.listActive,
  getActive: registry.getActive,
  lookup: registry.lookup,
  CC_REGRESSIONS: registry.CC_REGRESSIONS,

  // Coordination
  checkCCRegression: coordinator.checkCCRegression,
  emitAttribution: coordinator.emitAttribution,

  // Token ledger
  recordTurn: accountant.recordTurn,
  getLedgerStats: accountant.getLedgerStats,
  rotateLedger: accountant.rotate,

  // Lifecycle
  detectCCVersion: lifecycle.detectCCVersion,
  reconcile: lifecycle.reconcile,

  // Utilities
  formatAttribution: formatter.formatAttribution,

  // v2.1.10 Sprint 5.5: Event attribution (hook extension)
  recordEvent: eventRecorder.recordEvent,
  readEventTail: eventRecorder.readTail,
  getEventLogPath: eventRecorder.getEventLogPath,

  // v2.1.10 Sprint 5.5: PreCompact counter (ENH-247/257 2-week measurement)
  recordPrecompactEvent: precompactCounter.recordEvent,
  getPrecompactSummary: precompactCounter.summary,

  // v2.1.10 Sprint 6 NEW 6-3: cc-payload Port adapter
  ccBridge,
};
