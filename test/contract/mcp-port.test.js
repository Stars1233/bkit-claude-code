/**
 * mcp-port.test.js — Contract tests for FR-δ1 MCP Port abstraction.
 *
 * Verifies:
 *   1. lib/domain/ports/mcp-tool.port.js exposes pure type definitions
 *      (frozen constants, isMCPToolPort, isValidTool).
 *   2. lib/infra/mcp-port-registry.js holds 16 tools = 10 pdca + 6 analysis.
 *   3. Each registered tool has well-formed metadata.
 *   4. Caller-agnostic CALL_PATHS contract honored (ENH-277).
 *
 * Maps to: Sprint δ Plan SC-01 + Design §2.2 / §2.3 / §FR-δ1.
 *
 * @module test/contract/mcp-port.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const port = require('../../lib/domain/ports/mcp-tool.port');
const registry = require('../../lib/infra/mcp-port-registry');

// ── Domain Port: type-only constants ─────────────────────────────────────
test('Port: TOOL_CATEGORIES is frozen 3-tuple', () => {
  assert.equal(Object.isFrozen(port.TOOL_CATEGORIES), true);
  assert.deepEqual([...port.TOOL_CATEGORIES], ['read', 'write', 'analyze']);
});

test('Port: MCP_PROTOCOL_VERSION matches spec 2024-11-05', () => {
  assert.equal(port.MCP_PROTOCOL_VERSION, '2024-11-05');
});

test('Port: CALL_PATHS contract has skill, slash, hook (ENH-277)', () => {
  assert.equal(Object.isFrozen(port.CALL_PATHS), true);
  for (const p of ['skill', 'slash', 'hook']) {
    assert.ok(port.CALL_PATHS.includes(p), `CALL_PATHS missing ${p}`);
  }
});

// ── Port: isMCPToolPort duck-typing ──────────────────────────────────────
test('isMCPToolPort: rejects non-object input', () => {
  for (const bad of [null, undefined, 'string', 42, true]) {
    assert.equal(port.isMCPToolPort(bad).ok, false);
  }
});

test('isMCPToolPort: rejects object missing methods', () => {
  const r = port.isMCPToolPort({ initialize: () => {} }); // missing listTools, callTool
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing.sort(), ['callTool', 'listTools']);
});

test('isMCPToolPort: accepts object with all 3 methods', () => {
  const adapter = {
    initialize: async () => ({ protocolVersion: port.MCP_PROTOCOL_VERSION, capabilities: {} }),
    listTools: async () => [],
    callTool: async () => ({ content: [] }),
  };
  const r = port.isMCPToolPort(adapter);
  assert.equal(r.ok, true);
  assert.deepEqual(r.missing, []);
});

// ── Port: isValidTool ────────────────────────────────────────────────────
test('isValidTool: accepts well-formed tool descriptor', () => {
  const tool = {
    name: 'bkit_pdca_status',
    description: 'Return current PDCA status',
    inputSchema: { type: 'object', properties: {} },
    metadata: { server: 'bkit-pdca', category: 'read' },
  };
  const r = port.isValidTool(tool);
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
});

test('isValidTool: rejects missing name', () => {
  const r = port.isValidTool({
    description: '...',
    inputSchema: {},
    metadata: { server: 'bkit-pdca', category: 'read' },
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes('name'));
});

test('isValidTool: rejects invalid metadata.category', () => {
  const r = port.isValidTool({
    name: 'x', description: 'y', inputSchema: {},
    metadata: { server: 'bkit-pdca', category: 'unknown' },
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes('metadata.category'));
});

// ── Registry: 16 tools = 10 pdca + 6 analysis ────────────────────────────
test('Registry: TOTAL_TOOLS === 16', () => {
  assert.equal(registry.TOTAL_TOOLS, 16);
});

test('Registry: 10 tools belong to bkit-pdca server', () => {
  const pdcaTools = registry.listByServer('bkit-pdca');
  assert.equal(pdcaTools.length, 10);
});

test('Registry: 6 tools belong to bkit-analysis server', () => {
  const analysisTools = registry.listByServer('bkit-analysis');
  assert.equal(analysisTools.length, 6);
});

test('Registry: all 16 tools have valid metadata shape', () => {
  for (const name of Object.keys(registry.TOOL_REGISTRY)) {
    const m = registry.TOOL_REGISTRY[name];
    assert.ok(['bkit-pdca', 'bkit-analysis'].includes(m.server), `bad server for ${name}`);
    assert.ok(port.TOOL_CATEGORIES.includes(m.category), `bad category for ${name}`);
    assert.ok(Array.isArray(m.callPaths) && m.callPaths.length === 3, `${name} callPaths`);
  }
});

test('Registry: every tool supports skill / slash / hook (ENH-277)', () => {
  for (const name of Object.keys(registry.TOOL_REGISTRY)) {
    for (const path of port.CALL_PATHS) {
      assert.equal(registry.supportsCallPath(name, path), true,
        `${name} must support ${path}`);
    }
  }
});

test('Registry: TOOL_REGISTRY is frozen + per-entry frozen', () => {
  assert.equal(Object.isFrozen(registry.TOOL_REGISTRY), true);
  for (const name of Object.keys(registry.TOOL_REGISTRY)) {
    assert.equal(Object.isFrozen(registry.TOOL_REGISTRY[name]), true, `${name} entry`);
  }
});

// ── Registry: lookup helpers ─────────────────────────────────────────────
test('Registry: lookup returns metadata for known tool', () => {
  const m = registry.lookup('bkit_pdca_status');
  assert.ok(m);
  assert.equal(m.server, 'bkit-pdca');
  assert.equal(m.category, 'read');
});

test('Registry: lookup returns null for unknown tool', () => {
  assert.equal(registry.lookup('nonexistent_tool'), null);
  assert.equal(registry.lookup(null), null);
  assert.equal(registry.lookup(123), null);
});

test('Registry: listByCategory groups tools correctly', () => {
  const reads = registry.listByCategory('read');
  const analyzes = registry.listByCategory('analyze');
  // 10 pdca read + 3 analysis read (audit_search, checkpoint_list, checkpoint_detail) = 13
  assert.equal(reads.length, 13);
  // 3 analysis analyze (gap_analysis, code_quality, regression_rules)
  assert.equal(analyzes.length, 3);
});

test('Registry: listByCategory rejects invalid category', () => {
  assert.deepEqual(registry.listByCategory('garbage'), []);
});

// ── Cross-module: Port ↔ Registry consistency ────────────────────────────
test('Cross: Registry uses only Port-defined categories', () => {
  for (const name of Object.keys(registry.TOOL_REGISTRY)) {
    const cat = registry.TOOL_REGISTRY[name].category;
    assert.ok(port.TOOL_CATEGORIES.includes(cat),
      `Registry category ${cat} for ${name} not in Port.TOOL_CATEGORIES`);
  }
});

test('Cross: Registry callPaths subset of Port.CALL_PATHS', () => {
  for (const name of Object.keys(registry.TOOL_REGISTRY)) {
    for (const cp of registry.TOOL_REGISTRY[name].callPaths) {
      assert.ok(port.CALL_PATHS.includes(cp),
        `Registry callPath ${cp} for ${name} not in Port.CALL_PATHS`);
    }
  }
});
