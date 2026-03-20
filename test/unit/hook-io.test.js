'use strict';
/**
 * Unit Tests for lib/core/hook-io.js
 * 10 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/core/hook-io');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

let passed = 0, failed = 0, total = 0, skipped = 0;
const failures = [];

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; failures.push({ id, message }); console.error(`  FAIL: ${id} - ${message}`); }
}

function skip(id, message) { total++; skipped++; console.log(`  SKIP: ${id} - ${message}`); }

console.log('\n=== hook-io.test.js ===\n');

// --- HI-001~003: outputAllow/outputBlock/outputEmpty format ---

// outputAllow: captures console.log output
{
  const origLog = console.log;
  let captured = null;
  console.log = (msg) => { captured = msg; };
  mod.outputAllow('test context');
  console.log = origLog;
  assert('HI-001', captured === 'test context', 'outputAllow() outputs context string');
}

// outputBlock: captures console.log output (note: process.exit is called, we must intercept)
{
  const origLog = console.log;
  const origExit = process.exit;
  let captured = null;
  let exitCode = null;
  console.log = (msg) => { captured = msg; };
  process.exit = (code) => { exitCode = code; };
  mod.outputBlock('not allowed');
  console.log = origLog;
  process.exit = origExit;
  const parsed = JSON.parse(captured);
  assert('HI-002', parsed.decision === 'block' && parsed.reason === 'not allowed', 'outputBlock() outputs JSON with decision=block');
  assert('HI-003', exitCode === 0, 'outputBlock() calls process.exit(0)');
}

// --- HI-004~006: parseHookInput valid/invalid JSON ---

{
  const input = {
    tool_name: 'Write',
    tool_input: {
      file_path: '/tmp/test.js',
      content: 'hello',
      command: 'echo hi',
      old_string: 'old',
    },
  };
  const result = mod.parseHookInput(input);
  assert('HI-004', result.toolName === 'Write', 'parseHookInput extracts tool_name as toolName');
  assert('HI-005', result.filePath === '/tmp/test.js' && result.content === 'hello', 'parseHookInput extracts filePath and content');
}

{
  // camelCase input
  const input = {
    toolName: 'Bash',
    tool_input: { command: 'ls -la' },
  };
  const result = mod.parseHookInput(input);
  assert('HI-006', result.toolName === 'Bash' && result.command === 'ls -la', 'parseHookInput handles camelCase toolName');
}

// --- HI-007~010: edge cases (null, undefined, empty) ---

{
  const result = mod.parseHookInput(null);
  assert('HI-007', result.toolName === '' && result.filePath === '', 'parseHookInput(null) returns empty strings');
}

{
  const result = mod.parseHookInput(undefined);
  assert('HI-008', result.toolName === '' && result.content === '', 'parseHookInput(undefined) returns empty strings');
}

{
  const result = mod.parseHookInput({});
  assert('HI-009', result.toolName === '' && result.command === '' && result.oldString === '', 'parseHookInput({}) returns empty strings');
}

{
  // outputEmpty does nothing
  const origLog = console.log;
  let called = false;
  console.log = () => { called = true; };
  mod.outputEmpty();
  console.log = origLog;
  assert('HI-010', called === false, 'outputEmpty() produces no output');
}

// --- Summary ---

console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
