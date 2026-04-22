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
};
