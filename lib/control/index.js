/**
 * Control Module — Entry point re-exporting all control sub-modules
 * @module lib/control
 * @version 2.1.5
 *
 * Sub-modules:
 *   - automation-controller: Automation level management (L0-L4)
 *   - blast-radius: Change impact analysis
 *   - checkpoint-manager: State checkpoint creation and rollback
 *   - destructive-detector: Destructive operation detection and blocking
 *   - loop-breaker: Infinite loop detection and prevention
 *   - scope-limiter: Operation scope enforcement
 *   - trust-engine: Trust score calculation and escalation
 */

const automationController = require('./automation-controller');
const blastRadius = require('./blast-radius');
const checkpointManager = require('./checkpoint-manager');
const destructiveDetector = require('./destructive-detector');
const loopBreaker = require('./loop-breaker');
const scopeLimiter = require('./scope-limiter');
const trustEngine = require('./trust-engine');

module.exports = {
  ...automationController,
  ...blastRadius,
  ...checkpointManager,
  ...destructiveDetector,
  ...loopBreaker,
  ...scopeLimiter,
  ...trustEngine,
};
