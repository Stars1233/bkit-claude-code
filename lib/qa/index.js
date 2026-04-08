/**
 * QA Module — Test execution, Chrome bridge, report generation
 * @module lib/qa
 * @version 2.1.1
 */

const testRunner = require('./test-runner');
const chromeBridge = require('./chrome-bridge');
const reportGenerator = require('./report-generator');
const testPlanBuilder = require('./test-plan-builder');

module.exports = {
  // Test Runner
  runTests: testRunner.runTests,
  runTestLevel: testRunner.runTestLevel,
  getTestSummary: testRunner.getTestSummary,
  TEST_LEVELS: testRunner.TEST_LEVELS,

  // Chrome Bridge
  checkChromeAvailable: chromeBridge.checkChromeAvailable,
  createChromeBridge: chromeBridge.createChromeBridge,

  // Report Generator
  generateQaReport: reportGenerator.generateQaReport,
  formatQaReportMd: reportGenerator.formatQaReportMd,

  // Test Plan Builder
  buildTestPlan: testPlanBuilder.buildTestPlan,
  parseDesignDoc: testPlanBuilder.parseDesignDoc,
};
