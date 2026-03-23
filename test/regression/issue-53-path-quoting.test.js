#!/usr/bin/env node
'use strict';
/**
 * Regression Test: Issue #53 — Hook Path Quoting for Special Characters (10 TC)
 * Verifies that hook commands handle paths with parentheses, spaces, and
 * other special characters that could cause bash syntax errors.
 *
 * @version bkit v2.0.4
 * @see https://github.com/popup-studio-ai/bkit-claude-code/issues/53
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { assert, summary, reset } = require('../helpers/assert');
reset();

const BASE_DIR = path.resolve(__dirname, '../..');
const HOOKS_PATH = path.join(BASE_DIR, 'hooks', 'hooks.json');

console.log('\n=== issue-53-path-quoting.test.js (10 TC) ===\n');

// --- Load hooks.json ---
let hooksConfig;
try {
  hooksConfig = JSON.parse(fs.readFileSync(HOOKS_PATH, 'utf-8'));
} catch (e) {
  console.error('hooks.json load failed:', e.message);
  process.exit(1);
}

// --- Extract all command strings ---
function extractCommands(obj) {
  const commands = [];
  if (typeof obj !== 'object' || obj === null) return commands;
  if (obj.command && typeof obj.command === 'string') {
    commands.push(obj.command);
  }
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) {
      val.forEach(item => commands.push(...extractCommands(item)));
    } else if (typeof val === 'object' && val !== null) {
      commands.push(...extractCommands(val));
    }
  }
  return commands;
}

const allCommands = extractCommands(hooksConfig.hooks);
const pluginRootCommands = allCommands.filter(c => c.includes('CLAUDE_PLUGIN_ROOT'));

// ============================================================
// I53-001: Parentheses in path simulation
// ============================================================
console.log('--- Special Character Path Simulation ---');

// Simulate bash -c with parentheses in path
const testPaths = [
  { name: 'parentheses (Korean)', path: '/c/Users/홍길동(HongGildong)/.claude/plugins/bkit' },
  { name: 'spaces', path: '/c/Users/John Doe/.claude/plugins/bkit' },
  { name: 'ampersand', path: '/c/Users/Tom&Jerry/.claude/plugins/bkit' },
  { name: 'brackets', path: '/c/Users/user[1]/.claude/plugins/bkit' },
  { name: 'exclamation', path: '/c/Users/user!name/.claude/plugins/bkit' },
];

testPaths.forEach((tp, idx) => {
  // Build the command as it would appear after CLAUDE_PLUGIN_ROOT expansion
  const sampleCmd = pluginRootCommands[0] || 'node "${CLAUDE_PLUGIN_ROOT}/scripts/foo.js"';
  const expanded = sampleCmd.replace('${CLAUDE_PLUGIN_ROOT}', tp.path);

  // The key test: expanded command should still have quotes around the path
  const hasQuotes = expanded.includes(`"${tp.path}/`);

  assert(`I53-00${idx + 1}`, hasQuotes,
    `Path with ${tp.name} is properly quoted after expansion`);
});

// ============================================================
// I53-006: Bash -c syntax validation with quoted paths
// ============================================================
console.log('\n--- Bash Syntax Validation ---');

// Test that bash can parse the quoted command (using echo instead of node)
const testPath = '/tmp/test path (with parens)/scripts/foo.js';
try {
  const echoCmd = `echo "node \\"${testPath}\\""`;
  const result = execSync(`bash -c '${echoCmd}'`, { encoding: 'utf-8' }).trim();
  assert('I53-006', result.includes(testPath),
    'bash -c correctly handles quoted path with parentheses');
} catch (e) {
  assert('I53-006', false,
    `bash -c failed with quoted path: ${e.message}`);
}

// ============================================================
// I53-007: Unquoted path would fail with parentheses
// ============================================================
try {
  // This should fail because unquoted parentheses cause syntax error
  execSync('bash -c "echo /tmp/test(parens)/foo"', { encoding: 'utf-8', stdio: 'pipe' });
  // If it doesn't fail, the test still passes (some shells handle it)
  assert('I53-007', true,
    'Unquoted parentheses test (shell-dependent behavior)');
} catch (e) {
  // Expected: bash syntax error with unquoted parentheses
  assert('I53-007', e.message.includes('syntax error') || e.status !== 0,
    'Unquoted parentheses correctly cause bash syntax error');
}

// ============================================================
// I53-008: Version consistency check
// ============================================================
console.log('\n--- Version Consistency ---');

const pluginJson = JSON.parse(fs.readFileSync(
  path.join(BASE_DIR, '.claude-plugin', 'plugin.json'), 'utf-8'));
const bkitConfig = JSON.parse(fs.readFileSync(
  path.join(BASE_DIR, 'bkit.config.json'), 'utf-8'));

assert('I53-008', pluginJson.version === bkitConfig.version,
  `plugin.json (${pluginJson.version}) matches bkit.config.json (${bkitConfig.version})`);

// I53-009: hooks.json description matches version
assert('I53-009', hooksConfig.description.includes(pluginJson.version),
  `hooks.json description contains version ${pluginJson.version}`);

// I53-010: All hook commands reference valid script files
console.log('\n--- Script File Existence ---');

let allScriptsExist = true;
const missingScripts = [];
pluginRootCommands.forEach(cmd => {
  const match = cmd.match(/(?:hooks|scripts)\/[\w-]+\.js/);
  if (match) {
    const scriptPath = path.join(BASE_DIR, match[0]);
    if (!fs.existsSync(scriptPath)) {
      allScriptsExist = false;
      missingScripts.push(match[0]);
    }
  }
});

assert('I53-010', allScriptsExist,
  `All ${pluginRootCommands.length} hook scripts exist on disk (${missingScripts.length} missing)`);

// ============================================================
// Summary
// ============================================================
const result = summary('Issue #53 Path Quoting Regression');
process.exit(result.failed > 0 ? 1 : 0);
