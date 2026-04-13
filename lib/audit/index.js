/**
 * Audit Module — Entry point re-exporting all audit sub-modules
 * @module lib/audit
 * @version 2.1.5
 *
 * Sub-modules:
 *   - audit-logger: JSONL-based audit logging system
 *   - decision-tracer: Decision trace recording for AI transparency
 *   - explanation-generator: Human-readable explanation generator
 */

const auditLogger = require('./audit-logger');
const decisionTracer = require('./decision-tracer');
const explanationGenerator = require('./explanation-generator');

module.exports = {
  ...auditLogger,
  ...decisionTracer,
  ...explanationGenerator,
};
