/**
 * Chrome MCP Bridge — Wrapper for Chrome MCP tools with availability check
 * @module lib/qa/chrome-bridge
 * @version 2.1.1
 *
 * Provides graceful fallback when Chrome MCP is not available.
 * Used by qa-lead agent for L3-L5 test execution.
 */

let _core = null;
function getCore() {
  if (!_core) { _core = require('../core'); }
  return _core;
}

/**
 * @typedef {Object} ChromeAvailability
 * @property {boolean} available - Chrome MCP is accessible
 * @property {string} reason - Availability reason
 * @property {string[]} tools - Available Chrome MCP tool names
 */

/**
 * Check Chrome MCP availability
 * Detection strategy:
 * 1. MCP_SERVERS env var includes 'claude-in-chrome'
 *
 * @returns {ChromeAvailability}
 */
function checkChromeAvailable() {
  const { debugLog } = getCore();

  // Strategy 1: Environment variable
  const mcpServers = process.env.MCP_SERVERS || '';
  if (mcpServers.includes('claude-in-chrome')) {
    debugLog('QA-Chrome', 'Chrome MCP detected via MCP_SERVERS');
    return {
      available: true,
      reason: 'Chrome MCP detected via MCP_SERVERS environment',
      tools: [
        'tabs_create_mcp', 'navigate', 'form_input', 'find',
        'get_page_text', 'read_console_messages', 'read_network_requests',
        'gif_creator',
      ],
    };
  }

  // Not found
  debugLog('QA-Chrome', 'Chrome MCP not available');
  return {
    available: false,
    reason: 'Chrome MCP (claude-in-chrome) not found in MCP_SERVERS',
    tools: [],
  };
}

/**
 * @typedef {Object} ChromeBridge
 * @property {boolean} available
 * @property {function(string): Promise<Object>} navigate - Navigate to URL
 * @property {function(string, string): Promise<Object>} formInput - Input to form
 * @property {function(string): Promise<string>} getPageText - Get page text
 * @property {function(): Promise<string[]>} getConsoleMessages - Read console
 * @property {function(): Promise<Object[]>} getNetworkRequests - Read network
 * @property {function(): Promise<void>} noop - No-op for unavailable state
 */

/**
 * Create Chrome bridge instance
 * Returns noop functions when Chrome is unavailable (graceful degradation)
 *
 * @returns {ChromeBridge}
 */
function createChromeBridge() {
  const status = checkChromeAvailable();

  if (!status.available) {
    return {
      available: false,
      navigate: async () => ({ success: false, reason: 'Chrome MCP unavailable' }),
      formInput: async () => ({ success: false, reason: 'Chrome MCP unavailable' }),
      getPageText: async () => '',
      getConsoleMessages: async () => [],
      getNetworkRequests: async () => [],
      noop: async () => {},
    };
  }

  // When available, Chrome MCP tools are invoked by qa-lead agent directly
  // This bridge provides the availability status for test-runner decisions
  return {
    available: true,
    navigate: async (url) => ({ success: true, url }),
    formInput: async (selector, value) => ({ success: true, selector, value }),
    getPageText: async () => '(delegated to qa-lead Chrome MCP tools)',
    getConsoleMessages: async () => [],
    getNetworkRequests: async () => [],
    noop: async () => {},
  };
}

module.exports = {
  checkChromeAvailable,
  createChromeBridge,
};
