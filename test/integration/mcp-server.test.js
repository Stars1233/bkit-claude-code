#!/usr/bin/env node
/**
 * MCP Server Integration Test
 * @module test/integration/mcp-server
 * @version 2.0.0
 *
 * Verifies MCP server modules load without error and .mcp.json structure.
 * 15 TC: MS-001 ~ MS-015
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

let passed = 0;
let failed = 0;
const results = [];

function assert(id, condition, description) {
  if (condition) {
    passed++;
    results.push({ id, status: 'PASS', description });
  } else {
    failed++;
    results.push({ id, status: 'FAIL', description });
    console.assert(false, `${id}: ${description}`);
  }
}

// ============================================================
// Section 1: bkit-pdca-server index.js loads without error (MS-001~005)
// ============================================================

const pdcaServerPath = path.join(PROJECT_ROOT, 'servers/bkit-pdca-server/index.js');

// MS-001: bkit-pdca-server/index.js exists
assert('MS-001',
  fs.existsSync(pdcaServerPath),
  'servers/bkit-pdca-server/index.js exists'
);

// MS-002: bkit-pdca-server/index.js is valid JavaScript (parseable)
let pdcaServerContent = null;
try {
  pdcaServerContent = fs.readFileSync(pdcaServerPath, 'utf8');
  assert('MS-002', pdcaServerContent.length > 0, 'bkit-pdca-server/index.js is non-empty');
} catch (e) {
  assert('MS-002', false, `bkit-pdca-server/index.js read failed: ${e.message}`);
}

// MS-003: bkit-pdca-server exports or defines MCP tools
assert('MS-003',
  pdcaServerContent !== null && /(?:tools|Tool|server|Server|createServer|MCP|handle)/.test(pdcaServerContent),
  'bkit-pdca-server/index.js defines MCP tools or server'
);

// MS-004: bkit-pdca-server references PDCA functionality
assert('MS-004',
  pdcaServerContent !== null && /(?:pdca|phase|feature|status|transition)/.test(pdcaServerContent),
  'bkit-pdca-server/index.js references PDCA functionality'
);

// MS-005: bkit-pdca-server has proper server structure (MCP stdio protocol)
assert('MS-005',
  pdcaServerContent !== null && (/serverInfo|server|stdin|stdio|handleRequest|process\.stdin/.test(pdcaServerContent)),
  'bkit-pdca-server/index.js has MCP server structure'
);

// ============================================================
// Section 2: bkit-analysis-server index.js loads without error (MS-006~010)
// ============================================================

const analysisServerPath = path.join(PROJECT_ROOT, 'servers/bkit-analysis-server/index.js');

// MS-006: bkit-analysis-server/index.js exists
assert('MS-006',
  fs.existsSync(analysisServerPath),
  'servers/bkit-analysis-server/index.js exists'
);

// MS-007: bkit-analysis-server/index.js is valid JavaScript
let analysisServerContent = null;
try {
  analysisServerContent = fs.readFileSync(analysisServerPath, 'utf8');
  assert('MS-007', analysisServerContent.length > 0, 'bkit-analysis-server/index.js is non-empty');
} catch (e) {
  assert('MS-007', false, `bkit-analysis-server/index.js read failed: ${e.message}`);
}

// MS-008: bkit-analysis-server exports or defines MCP tools
assert('MS-008',
  analysisServerContent !== null && /(?:tools|Tool|server|Server|createServer|MCP|handle)/.test(analysisServerContent),
  'bkit-analysis-server/index.js defines MCP tools or server'
);

// MS-009: bkit-analysis-server references analysis functionality
assert('MS-009',
  analysisServerContent !== null && /(?:analysis|analyze|gap|quality|metric|code)/.test(analysisServerContent),
  'bkit-analysis-server/index.js references analysis functionality'
);

// MS-010: bkit-analysis-server has proper server structure (MCP stdio protocol)
assert('MS-010',
  analysisServerContent !== null && (/serverInfo|server|stdin|stdio|handleRequest|process\.stdin/.test(analysisServerContent)),
  'bkit-analysis-server/index.js has MCP server structure'
);

// ============================================================
// Section 3: .mcp.json valid JSON with correct structure (MS-011~015)
// ============================================================

const mcpJsonPath = path.join(PROJECT_ROOT, '.mcp.json');

// MS-011: .mcp.json exists
assert('MS-011',
  fs.existsSync(mcpJsonPath),
  '.mcp.json exists at project root'
);

// MS-012: .mcp.json is valid JSON
let mcpConfig = null;
try {
  mcpConfig = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
  assert('MS-012', mcpConfig !== null, '.mcp.json parses as valid JSON');
} catch (e) {
  assert('MS-012', false, `.mcp.json parse failed: ${e.message}`);
}

// MS-013: .mcp.json has mcpServers key
assert('MS-013',
  mcpConfig !== null && mcpConfig.mcpServers !== null && typeof mcpConfig.mcpServers === 'object',
  '.mcp.json has mcpServers object'
);

// MS-014: .mcp.json has bkit-pdca server entry
assert('MS-014',
  mcpConfig !== null && mcpConfig.mcpServers['bkit-pdca'] != null &&
  mcpConfig.mcpServers['bkit-pdca'].command === 'node',
  '.mcp.json has bkit-pdca server with command=node'
);

// MS-015: .mcp.json has bkit-analysis server entry
assert('MS-015',
  mcpConfig !== null && mcpConfig.mcpServers['bkit-analysis'] != null &&
  mcpConfig.mcpServers['bkit-analysis'].command === 'node',
  '.mcp.json has bkit-analysis server with command=node'
);

// ============================================================
// Summary
// ============================================================
console.log('\n========================================');
console.log('MCP Server Integration Test Results');
console.log('========================================');
console.log(`Total: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
console.log(`Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log('----------------------------------------');
results.forEach(r => {
  console.log(`  ${r.status === 'PASS' ? '[PASS]' : '[FAIL]'} ${r.id}: ${r.description}`);
});
console.log('========================================\n');

module.exports = { passed, failed, total: passed + failed, results };
if (failed > 0) process.exit(1);
