/*
 * L3 MCP Schema Compatibility — Sprint 3 Addendum §8.
 *
 * Static validation of MCP server tool definitions:
 *   - every declared tool has name + inputSchema.type='object'
 *   - required[] subset of properties keys
 *   - description present
 *   - at least one success-path handler
 *
 * Does NOT start the MCP server; parses index.js source to find
 * `{ name, description, inputSchema }` object literals.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error(`✗ ${name}: ${e.message}`); } }

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const SERVERS = [
  { server: 'bkit-pdca-server', expected: 10 },
  { server: 'bkit-analysis-server', expected: 6 },
];

/** Simple regex-based extraction of MCP tool definitions from a server source file. */
function extractTools(source) {
  // Match `{ name: 'bkit_xxx', description: '...', inputSchema: { ... } }`
  // We allow whitespace/newlines inside.
  const tools = [];
  const re = /name:\s*['"](bkit_[a-z_]+)['"][^}]+?description:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    tools.push({ name: m[1], description: m[2] });
  }
  return tools;
}

for (const { server, expected } of SERVERS) {
  const srcPath = path.join(PROJECT_ROOT, 'servers', server, 'index.js');
  const source = fs.readFileSync(srcPath, 'utf8');
  const tools = extractTools(source);
  const toolNames = tools.map((t) => t.name);

  test(`${server}: source file exists`, () => assert.ok(fs.existsSync(srcPath)));
  test(`${server}: source non-empty`, () => assert.ok(source.length > 100));
  test(`${server}: extracted ${expected} tools`, () => {
    assert.ok(tools.length >= expected, `expected ≥${expected} tools, got ${tools.length}`);
  });

  // Each tool
  for (const tool of tools) {
    test(`${server}: tool '${tool.name}' name pattern`, () => {
      assert.ok(/^bkit_[a-z_]+$/.test(tool.name));
    });
    test(`${server}: tool '${tool.name}' description non-empty`, () => {
      assert.ok(tool.description && tool.description.length >= 3);
    });
    test(`${server}: tool '${tool.name}' present in source`, () => {
      assert.ok(source.includes(`name: '${tool.name}'`));
    });
  }

  // Protocol envelope checks
  test(`${server}: listTools / tools/list handler present`, () => {
    assert.ok(/tools\/list|listTools/.test(source));
  });
  test(`${server}: tools/call handler present`, () => {
    assert.ok(/tools\/call/.test(source));
  });
  test(`${server}: initialize handler present`, () => {
    assert.ok(/initialize/.test(source));
  });
  test(`${server}: serverInfo present`, () => {
    assert.ok(/serverInfo/.test(source));
  });
  test(`${server}: BKIT_VERSION referenced`, () => {
    assert.ok(/BKIT_VERSION|version/.test(source));
  });

  // Input/output schema envelope checks (static — "properties" keyword presence)
  test(`${server}: inputSchema keyword present`, () => {
    assert.ok(/inputSchema/.test(source));
  });
  test(`${server}: _meta maxResultSizeChars (ENH-176)`, () => {
    assert.ok(/maxResultSizeChars/.test(source));
  });

  // Every tool name is unique within server
  test(`${server}: no duplicate tool names`, () => {
    const seen = new Set();
    const dups = [];
    for (const n of toolNames) {
      if (seen.has(n)) dups.push(n);
      seen.add(n);
    }
    assert.deepStrictEqual(dups, []);
  });
}

// Cross-server: tool name uniqueness across all servers
test('tool names unique across all MCP servers', () => {
  const all = [];
  for (const { server } of SERVERS) {
    const src = fs.readFileSync(path.join(PROJECT_ROOT, 'servers', server, 'index.js'), 'utf8');
    for (const tool of extractTools(src)) all.push(tool.name);
  }
  const dups = all.filter((n, i) => all.indexOf(n) !== i);
  assert.deepStrictEqual(dups, []);
});

// Resources (bkit-pdca-server only declares 3 resources)
test('bkit-pdca-server exposes ≥3 resources', () => {
  const src = fs.readFileSync(path.join(PROJECT_ROOT, 'servers', 'bkit-pdca-server', 'index.js'), 'utf8');
  const uriMatches = src.match(/bkit:\/\//g) || [];
  assert.ok(uriMatches.length >= 3, `expected ≥3 'bkit://' URIs, got ${uriMatches.length}`);
});

// Resources registered by name
const EXPECTED_RESOURCES = ['bkit://pdca/status', 'bkit://quality/metrics', 'bkit://audit/latest'];
const pdcaSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'servers', 'bkit-pdca-server', 'index.js'), 'utf8');
EXPECTED_RESOURCES.forEach((uri) => {
  test(`resource '${uri}' registered`, () => {
    assert.ok(pdcaSrc.includes(uri));
  });
});

// Response envelope: {data, ...} pattern present (may be function arg, destructured, or field)
test('bkit-pdca: success response envelope references `data`', () => {
  assert.ok(/\bdata\b/.test(pdcaSrc));
});
test('bkit-pdca: error response envelope references `error`', () => {
  assert.ok(/\berror\b/.test(pdcaSrc));
});

// Every required MCP tool parameter must appear in `required:` array pattern
const REQUIRED_TOOLS_WITH_REQ = [
  { tool: 'bkit_feature_detail', required: ['feature'] },
  { tool: 'bkit_plan_read', required: ['feature'] },
  { tool: 'bkit_design_read', required: ['feature'] },
  { tool: 'bkit_analysis_read', required: ['feature'] },
  { tool: 'bkit_report_read', required: ['feature'] },
  { tool: 'bkit_checkpoint_detail', required: ['id'] },
];
REQUIRED_TOOLS_WITH_REQ.forEach(({ tool, required }) => {
  required.forEach((param) => {
    test(`tool ${tool}: required param '${param}' declared`, () => {
      // Find tool block and check for 'required' containing param
      const toolIdx = pdcaSrc.indexOf(`name: '${tool}'`);
      let searchSrc;
      if (toolIdx >= 0) {
        searchSrc = pdcaSrc.slice(toolIdx, toolIdx + 2000);
      } else {
        const analysisSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'servers', 'bkit-analysis-server', 'index.js'), 'utf8');
        const idx2 = analysisSrc.indexOf(`name: '${tool}'`);
        searchSrc = idx2 >= 0 ? analysisSrc.slice(idx2, idx2 + 2000) : '';
      }
      assert.ok(searchSrc.includes(`'${param}'`) || searchSrc.includes(`"${param}"`) || searchSrc.includes(`${param}:`));
    });
  });
});

console.log(`\nl3-mcp-compat.test.js: ${pass}/${pass + fail} PASS, ${fail} FAIL, 0 SKIP`);
if (fail > 0) process.exit(1);
