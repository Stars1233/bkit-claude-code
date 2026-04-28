/**
 * mcp-port-registry.js — bkit MCP tool registry (FR-δ1).
 *
 * Single SoT for the 16 MCP tools shipped by bkit (10 in bkit-pdca
 * + 6 in bkit-analysis). Backed by `lib/domain/ports/mcp-tool.port.js`
 * type definitions; this file is the Infrastructure-layer adapter.
 *
 * ENH-277 (CC v2.1.118 F1) — Port is caller-agnostic:
 *   `callPaths: ['skill', 'slash', 'hook']`
 *   v2.1.11 ships the metadata; v2.1.12 will pilot hook → tool direct.
 *
 * Design Ref: bkit-v2111-sprint-delta.design.md §2.3
 *
 * @module lib/infra/mcp-port-registry
 * @version 2.1.11
 * @since 2.1.11
 */

const { TOOL_CATEGORIES, CALL_PATHS } = require('../domain/ports/mcp-tool.port');

const ALL_CALL_PATHS = Object.freeze(['skill', 'slash', 'hook']);

const TOOL_REGISTRY = Object.freeze({
  // bkit-pdca server — 10 tools
  bkit_plan_read:        Object.freeze({ server: 'bkit-pdca',     category: 'read',    callPaths: ALL_CALL_PATHS }),
  bkit_design_read:      Object.freeze({ server: 'bkit-pdca',     category: 'read',    callPaths: ALL_CALL_PATHS }),
  bkit_analysis_read:    Object.freeze({ server: 'bkit-pdca',     category: 'read',    callPaths: ALL_CALL_PATHS }),
  bkit_report_read:      Object.freeze({ server: 'bkit-pdca',     category: 'read',    callPaths: ALL_CALL_PATHS }),
  bkit_pdca_status:      Object.freeze({ server: 'bkit-pdca',     category: 'read',    callPaths: ALL_CALL_PATHS }),
  bkit_pdca_history:     Object.freeze({ server: 'bkit-pdca',     category: 'read',    callPaths: ALL_CALL_PATHS }),
  bkit_feature_list:     Object.freeze({ server: 'bkit-pdca',     category: 'read',    callPaths: ALL_CALL_PATHS }),
  bkit_feature_detail:   Object.freeze({ server: 'bkit-pdca',     category: 'read',    callPaths: ALL_CALL_PATHS }),
  bkit_metrics_get:      Object.freeze({ server: 'bkit-pdca',     category: 'read',    callPaths: ALL_CALL_PATHS }),
  bkit_metrics_history:  Object.freeze({ server: 'bkit-pdca',     category: 'read',    callPaths: ALL_CALL_PATHS }),
  // bkit-analysis server — 6 tools
  bkit_gap_analysis:       Object.freeze({ server: 'bkit-analysis', category: 'analyze', callPaths: ALL_CALL_PATHS }),
  bkit_code_quality:       Object.freeze({ server: 'bkit-analysis', category: 'analyze', callPaths: ALL_CALL_PATHS }),
  bkit_regression_rules:   Object.freeze({ server: 'bkit-analysis', category: 'analyze', callPaths: ALL_CALL_PATHS }),
  bkit_audit_search:       Object.freeze({ server: 'bkit-analysis', category: 'read',    callPaths: ALL_CALL_PATHS }),
  bkit_checkpoint_list:    Object.freeze({ server: 'bkit-analysis', category: 'read',    callPaths: ALL_CALL_PATHS }),
  bkit_checkpoint_detail:  Object.freeze({ server: 'bkit-analysis', category: 'read',    callPaths: ALL_CALL_PATHS }),
});

const TOTAL_TOOLS = Object.keys(TOOL_REGISTRY).length;

/**
 * Look up a tool's registry metadata by name.
 *
 * @param {string} name
 * @returns {{ server: string, category: string, callPaths: string[] }|null}
 */
function lookup(name) {
  if (typeof name !== 'string') return null;
  return TOOL_REGISTRY[name] || null;
}

/**
 * List all tool names belonging to a server.
 *
 * @param {string} server
 * @returns {string[]}
 */
function listByServer(server) {
  return Object.keys(TOOL_REGISTRY).filter(
    (n) => TOOL_REGISTRY[n].server === server,
  );
}

/**
 * List all tool names matching a category.
 *
 * @param {string} category
 * @returns {string[]}
 */
function listByCategory(category) {
  if (!TOOL_CATEGORIES.includes(category)) return [];
  return Object.keys(TOOL_REGISTRY).filter(
    (n) => TOOL_REGISTRY[n].category === category,
  );
}

/**
 * Whether a tool supports a given call path (skill / slash / hook).
 *
 * @param {string} name
 * @param {string} path
 * @returns {boolean}
 */
function supportsCallPath(name, path) {
  const meta = lookup(name);
  if (!meta) return false;
  return Array.isArray(meta.callPaths) && meta.callPaths.includes(path);
}

module.exports = {
  TOOL_REGISTRY,
  TOTAL_TOOLS,
  ALL_CALL_PATHS,
  lookup,
  listByServer,
  listByCategory,
  supportsCallPath,
};
