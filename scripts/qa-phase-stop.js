#!/usr/bin/env node
/**
 * qa-phase-stop.js - QA Phase Stop Event Handler
 *
 * Collects M11-M15 metrics from QA execution results
 * and triggers appropriate state machine event (QA_PASS/QA_FAIL/QA_SKIP).
 */

const { readStdinSync, outputAllow } = require('../lib/core/io');
const { debugLog } = require('../lib/core/debug');

try {
  const mc = require('../lib/quality/metrics-collector');
  const { extractFeatureFromContext, getPdcaStatusFull } = require('../lib/pdca/status');
  const currentStatus = getPdcaStatusFull();
  const feature = extractFeatureFromContext({ currentStatus }) || 'unknown';

  // Read QA phase output from stdin
  let qaOutput = '';
  try { qaOutput = readStdinSync() || ''; } catch (_) {}

  // M11: QA Pass Rate
  const passRateMatch = qaOutput.match(/pass\s*rate[^0-9]*(\d+\.?\d*)\s*%/i);
  const qaPassRate = passRateMatch ? parseFloat(passRateMatch[1]) : 0;
  mc.collectMetric('M11', feature, qaPassRate, 'qa-lead');

  // M12: Test Coverage L1
  const coverageMatch = qaOutput.match(/coverage[^0-9]*(\d+\.?\d*)\s*%/i);
  const testCoverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
  mc.collectMetric('M12', feature, testCoverage, 'qa-test-generator');

  // M13: E2E Scenario Coverage
  const e2eMatch = qaOutput.match(/e2e[^0-9]*coverage[^0-9]*(\d+\.?\d*)\s*%/i);
  const e2eCoverage = e2eMatch ? parseFloat(e2eMatch[1]) : 0;
  mc.collectMetric('M13', feature, e2eCoverage, 'qa-lead');

  // M14: Runtime Error Count
  const errorCountMatch = qaOutput.match(/runtime\s*error[^0-9]*(\d+)/i);
  const runtimeErrors = errorCountMatch ? parseInt(errorCountMatch[1]) : 0;
  mc.collectMetric('M14', feature, runtimeErrors, 'qa-debug-analyst');

  // M15: Data Flow Integrity
  const integrityMatch = qaOutput.match(/data\s*flow\s*integrity[^0-9]*(\d+\.?\d*)\s*%/i);
  const dataFlowIntegrity = integrityMatch ? parseFloat(integrityMatch[1]) : 100;
  mc.collectMetric('M15', feature, dataFlowIntegrity, 'qa-lead');

  debugLog('QA-Phase-Stop', 'Metrics collected', {
    feature, qaPassRate, testCoverage, e2eCoverage, runtimeErrors, dataFlowIntegrity
  });
} catch (e) {
  debugLog('QA-Phase-Stop', 'Metric collection failed', { error: e.message });
}

const message = `QA Phase completed.

Next steps:
1. Review QA report in docs/05-qa/
2. If QA PASS: proceed to /pdca report
3. If QA FAIL: review failures and /pdca iterate`;

outputAllow(message, 'Stop');
