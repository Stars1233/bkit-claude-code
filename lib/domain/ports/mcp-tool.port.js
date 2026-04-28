/**
 * MCPToolPort — Type-only Port (DIP) for MCP tool adapters.
 *
 * Design Ref: bkit-v2111-sprint-delta.design.md §2.2 + §FR-δ1
 * Plan SC-01: Domain depends on this Port; Infrastructure adapters
 * (lib/infra/mcp-* registries) implement it.
 *
 * This file is a Type-only module. Runtime exports are constants
 * (TOOL_CATEGORIES, MCP_PROTOCOL_VERSION, ToolCategory enum). The
 * adapter interface is documented via JSDoc typedefs and validated
 * by contract tests in `test/contract/mcp-port.test.js`.
 *
 * MCP Spec: 2024-11-05
 * Each adapter MUST implement:
 *   - initialize(protocolVersion): Promise<InitializeResult>
 *   - listTools(): Promise<Tool[]>
 *   - callTool(name, args): Promise<ToolResult>
 *
 * Caller-agnostic: Skill, Slash command, AND Hook (CC v2.1.118 F1)
 * may all invoke the same adapter — see `lib/infra/mcp-port-registry.js`
 * `callPaths` metadata (ENH-277).
 *
 * @module lib/domain/ports/mcp-tool.port
 * @version 2.1.11
 * @since 2.1.11
 */

const TOOL_CATEGORIES = Object.freeze(['read', 'write', 'analyze']);
const MCP_PROTOCOL_VERSION = '2024-11-05';
const CALL_PATHS = Object.freeze(['skill', 'slash', 'hook']);

/**
 * @typedef {'read'|'write'|'analyze'} ToolCategory
 */

/**
 * @typedef {'skill'|'slash'|'hook'} CallPath
 */

/**
 * @typedef {Object} ToolMetadata
 * @property {string} server     — MCP server name (e.g. 'bkit-analysis', 'bkit-pdca')
 * @property {ToolCategory} category — read / write / analyze
 * @property {CallPath[]} [callPaths] — supported invocation paths (ENH-277)
 */

/**
 * @typedef {Object} Tool
 * @property {string} name           — e.g. 'bkit_pdca_status'
 * @property {string} description    — human-readable purpose
 * @property {Object} inputSchema    — JSON Schema for arguments
 * @property {ToolMetadata} metadata — registry metadata
 */

/**
 * @typedef {Object} InitializeResult
 * @property {string} protocolVersion        — must equal MCP_PROTOCOL_VERSION
 * @property {Object} capabilities           — server capability flags
 * @property {Object} [serverInfo]
 * @property {string} [serverInfo.name]
 * @property {string} [serverInfo.version]
 */

/**
 * @typedef {Object} ToolResult
 * @property {Array<{type:string, text:string}|{type:string, data:any}>} content
 * @property {boolean} [isError]
 * @property {Object} [_meta]                — server-specific telemetry
 */

/**
 * Adapter interface. Each MCP adapter (e.g. lib/infra/mcp-*-server.js)
 * MUST conform to this shape.
 *
 * @typedef {Object} MCPToolPort
 * @property {function(string): Promise<InitializeResult>} initialize
 * @property {function(): Promise<Tool[]>} listTools
 * @property {function(string, Object): Promise<ToolResult>} callTool
 */

/**
 * Validate that a candidate object satisfies the MCPToolPort
 * interface (duck-typing). Used by contract tests.
 *
 * @param {object} candidate
 * @returns {{ ok: boolean, missing: string[] }}
 */
function isMCPToolPort(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return { ok: false, missing: ['object'] };
  }
  const required = ['initialize', 'listTools', 'callTool'];
  const missing = required.filter((m) => typeof candidate[m] !== 'function');
  return { ok: missing.length === 0, missing };
}

/**
 * Validate a Tool descriptor's structural shape.
 *
 * @param {object} tool
 * @returns {{ ok: boolean, errors: string[] }}
 */
function isValidTool(tool) {
  const errors = [];
  if (!tool || typeof tool !== 'object') {
    return { ok: false, errors: ['not_an_object'] };
  }
  if (typeof tool.name !== 'string' || !tool.name) errors.push('name');
  if (typeof tool.description !== 'string') errors.push('description');
  if (!tool.inputSchema || typeof tool.inputSchema !== 'object') errors.push('inputSchema');
  if (!tool.metadata || typeof tool.metadata !== 'object') {
    errors.push('metadata');
  } else {
    if (typeof tool.metadata.server !== 'string') errors.push('metadata.server');
    if (!TOOL_CATEGORIES.includes(tool.metadata.category)) errors.push('metadata.category');
  }
  return { ok: errors.length === 0, errors };
}

module.exports = {
  TOOL_CATEGORIES,
  MCP_PROTOCOL_VERSION,
  CALL_PATHS,
  isMCPToolPort,
  isValidTool,
};
