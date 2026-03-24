/**
 * Living Context System — Entry point
 * @module lib/context
 * @version 3.0.0
 */
module.exports = {
  ...require('./context-loader'),
  ...require('./invariant-checker'),
  ...require('./impact-analyzer'),
  ...require('./scenario-runner'),
};
