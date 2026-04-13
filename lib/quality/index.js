/**
 * Quality Module — Entry point re-exporting all quality sub-modules
 * @module lib/quality
 * @version 2.1.5
 *
 * Sub-modules:
 *   - gate-manager: Quality gate definitions and evaluation
 *   - metrics-collector: Metric collection and trend analysis
 *   - regression-guard: Regression detection from iteration results
 */

const gateManager = require('./gate-manager');
const metricsCollector = require('./metrics-collector');
const regressionGuard = require('./regression-guard');

module.exports = {
  ...gateManager,
  ...metricsCollector,
  ...regressionGuard,
};
