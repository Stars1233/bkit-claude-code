'use strict';
/**
 * Unit Tests for lib/core/ untested modules
 * Modules: platform.js, io.js, debug.js, cache.js, file.js
 * 40 TC | console.assert based | no external dependencies
 */

let passed = 0, failed = 0, total = 0, skipped = 0;
const failures = [];

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; failures.push({ id, message }); console.error(`  FAIL: ${id} - ${message}`); }
}

function skip(id, message) { total++; skipped++; console.log(`  SKIP: ${id} - ${message}`); }

console.log('\n=== core-modules.test.js ===\n');

// ============================================================
// platform.js
// ============================================================

let platform;
try {
  platform = require('../../lib/core/platform');
} catch (e) {
  platform = null;
}

if (!platform) {
  skip('CM-001', 'platform.js failed to load');
  skip('CM-002', 'platform.js failed to load');
  skip('CM-003', 'platform.js failed to load');
  skip('CM-004', 'platform.js failed to load');
  skip('CM-005', 'platform.js failed to load');
  skip('CM-006', 'platform.js failed to load');
  skip('CM-007', 'platform.js failed to load');
  skip('CM-008', 'platform.js failed to load');
} else {
  assert('CM-001', typeof platform.detectPlatform === 'function', 'detectPlatform is a function');
  assert('CM-002', typeof platform.isClaudeCode === 'function', 'isClaudeCode is a function');
  assert('CM-003', typeof platform.BKIT_PLATFORM === 'string', 'BKIT_PLATFORM is a string');
  assert('CM-004', ['claude', 'unknown'].includes(platform.BKIT_PLATFORM), 'BKIT_PLATFORM is claude or unknown');
  assert('CM-005', typeof platform.PLUGIN_ROOT === 'string' && platform.PLUGIN_ROOT.length > 0, 'PLUGIN_ROOT is a non-empty string');
  assert('CM-006', typeof platform.PROJECT_DIR === 'string' && platform.PROJECT_DIR.length > 0, 'PROJECT_DIR is a non-empty string');
  assert('CM-007', typeof platform.getPluginPath === 'function' && typeof platform.getPluginPath('test') === 'string', 'getPluginPath returns string');
  assert('CM-008', typeof platform.getTemplatePath === 'function' && platform.getTemplatePath('foo.md').includes('templates/foo.md'), 'getTemplatePath includes templates/');
}

// ============================================================
// io.js
// ============================================================

let io;
try {
  io = require('../../lib/core/io');
} catch (e) {
  io = null;
}

if (!io) {
  skip('CM-009', 'io.js failed to load');
  skip('CM-010', 'io.js failed to load');
  skip('CM-011', 'io.js failed to load');
  skip('CM-012', 'io.js failed to load');
  skip('CM-013', 'io.js failed to load');
  skip('CM-014', 'io.js failed to load');
  skip('CM-015', 'io.js failed to load');
  skip('CM-016', 'io.js failed to load');
} else {
  assert('CM-009', typeof io.MAX_CONTEXT_LENGTH === 'number' && io.MAX_CONTEXT_LENGTH === 500, 'MAX_CONTEXT_LENGTH is 500');
  assert('CM-010', typeof io.truncateContext === 'function', 'truncateContext is a function');
  assert('CM-011', io.truncateContext('short') === 'short', 'truncateContext returns short string unchanged');
  assert('CM-012', io.truncateContext('a'.repeat(600)).includes('... (truncated)'), 'truncateContext truncates long string');
  assert('CM-013', io.truncateContext(null) === '', 'truncateContext handles null input');
  assert('CM-014', io.truncateContext('') === '', 'truncateContext handles empty string');

  // parseHookInput
  assert('CM-015', typeof io.parseHookInput === 'function', 'parseHookInput is a function');
  const parsed = io.parseHookInput({ tool_name: 'Write', tool_input: { file_path: '/test.js', content: 'hello' } });
  assert('CM-016', parsed.toolName === 'Write' && parsed.filePath === '/test.js' && parsed.content === 'hello', 'parseHookInput parses tool_name and tool_input');
}

// --- CM-017~018: parseHookInput edge cases ---

if (!io) {
  skip('CM-017', 'io.js failed to load');
  skip('CM-018', 'io.js failed to load');
} else {
  const emptyParsed = io.parseHookInput({});
  assert('CM-017', emptyParsed.toolName === '' && emptyParsed.filePath === '', 'parseHookInput handles empty object');
  const nullParsed = io.parseHookInput(null);
  assert('CM-018', nullParsed.toolName === '' && nullParsed.filePath === '', 'parseHookInput handles null input');
}

// --- CM-019~020: xmlSafeOutput ---

if (!io) {
  skip('CM-019', 'io.js failed to load');
  skip('CM-020', 'io.js failed to load');
} else {
  assert('CM-019', typeof io.xmlSafeOutput === 'function', 'xmlSafeOutput is a function');
  assert('CM-020', io.xmlSafeOutput('<div>&"test"</div>') === '&lt;div&gt;&amp;&quot;test&quot;&lt;/div&gt;', 'xmlSafeOutput escapes special characters');
}

// ============================================================
// debug.js
// ============================================================

let debug;
try {
  debug = require('../../lib/core/debug');
} catch (e) {
  debug = null;
}

if (!debug) {
  skip('CM-021', 'debug.js failed to load');
  skip('CM-022', 'debug.js failed to load');
  skip('CM-023', 'debug.js failed to load');
  skip('CM-024', 'debug.js failed to load');
  skip('CM-025', 'debug.js failed to load');
} else {
  assert('CM-021', typeof debug.debugLog === 'function', 'debugLog is a function');
  assert('CM-022', typeof debug.getDebugLogPath === 'function', 'getDebugLogPath is a function');
  assert('CM-023', typeof debug.getDebugLogPath() === 'string', 'getDebugLogPath returns a string');
  assert('CM-024', typeof debug.DEBUG_LOG_PATHS === 'object' && debug.DEBUG_LOG_PATHS !== null, 'DEBUG_LOG_PATHS is an object');

  // debugLog should not throw when BKIT_DEBUG is not set
  let noThrow = true;
  try { debug.debugLog('test', 'message', { data: 1 }); } catch (e) { noThrow = false; }
  assert('CM-025', noThrow, 'debugLog does not throw when BKIT_DEBUG is not set');
}

// ============================================================
// cache.js
// ============================================================

let cache;
try {
  cache = require('../../lib/core/cache');
} catch (e) {
  cache = null;
}

if (!cache) {
  skip('CM-026', 'cache.js failed to load');
  skip('CM-027', 'cache.js failed to load');
  skip('CM-028', 'cache.js failed to load');
  skip('CM-029', 'cache.js failed to load');
  skip('CM-030', 'cache.js failed to load');
  skip('CM-031', 'cache.js failed to load');
  skip('CM-032', 'cache.js failed to load');
  skip('CM-033', 'cache.js failed to load');
  skip('CM-034', 'cache.js failed to load');
} else {
  assert('CM-026', typeof cache.get === 'function', 'cache.get is a function');
  assert('CM-027', typeof cache.set === 'function', 'cache.set is a function');
  assert('CM-028', typeof cache.invalidate === 'function', 'cache.invalidate is a function');
  assert('CM-029', typeof cache.clear === 'function', 'cache.clear is a function');

  // Functional tests
  cache.clear();
  cache.set('test-key', 42);
  assert('CM-030', cache.get('test-key') === 42, 'set/get round-trip returns correct value');

  cache.invalidate('test-key');
  assert('CM-031', cache.get('test-key') === null, 'invalidate removes key');

  cache.set('pattern-a', 1);
  cache.set('pattern-b', 2);
  cache.invalidate(/^pattern-/);
  assert('CM-032', cache.get('pattern-a') === null && cache.get('pattern-b') === null, 'invalidate with RegExp removes matching keys');

  assert('CM-033', typeof cache.DEFAULT_TTL === 'number' && cache.DEFAULT_TTL === 5000, 'DEFAULT_TTL is 5000');
  assert('CM-034', typeof cache.TOOLSEARCH_TTL === 'number' && cache.TOOLSEARCH_TTL === 60000, 'TOOLSEARCH_TTL is 60000');

  cache.clear();
}

// --- CM-035~036: ToolSearch cache helpers ---

if (!cache) {
  skip('CM-035', 'cache.js failed to load');
  skip('CM-036', 'cache.js failed to load');
} else {
  cache.clear();
  assert('CM-035', typeof cache.getToolSearchCache === 'function' && typeof cache.setToolSearchCache === 'function', 'ToolSearch cache helpers exist');
  cache.setToolSearchCache('query1', ['result1']);
  assert('CM-036', JSON.stringify(cache.getToolSearchCache('query1')) === JSON.stringify(['result1']), 'ToolSearch cache set/get works');
  cache.clear();
}

// ============================================================
// file.js
// ============================================================

let file;
try {
  file = require('../../lib/core/file');
} catch (e) {
  file = null;
}

if (!file) {
  skip('CM-037', 'file.js failed to load');
  skip('CM-038', 'file.js failed to load');
  skip('CM-039', 'file.js failed to load');
  skip('CM-040', 'file.js failed to load');
} else {
  assert('CM-037', typeof file.TIER_EXTENSIONS === 'object' && Array.isArray(file.TIER_EXTENSIONS[1]), 'TIER_EXTENSIONS has tier 1 array');
  assert('CM-038', typeof file.isCodeFile === 'function' && file.isCodeFile('test.js') === true && file.isCodeFile('test.txt') === false, 'isCodeFile detects code files');
  assert('CM-039', typeof file.isUiFile === 'function' && file.isUiFile('App.tsx') === true && file.isUiFile('main.py') === false, 'isUiFile detects UI files');
  assert('CM-040', typeof file.isEnvFile === 'function' && file.isEnvFile('.env') === true && file.isEnvFile('config.js') === false, 'isEnvFile detects env files');
}

// --- Summary ---

console.log(`\nTotal: ${total} | Pass: ${passed} | Fail: ${failed}`);
if (skipped > 0) console.log(`Skipped: ${skipped}`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
