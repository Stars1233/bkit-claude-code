#!/usr/bin/env node
'use strict';
/**
 * Security Test: Hook Path Quoting Validation (12 TC)
 * Ensures all hook commands in hooks.json properly quote ${CLAUDE_PLUGIN_ROOT} paths
 * to prevent bash syntax errors with special characters in paths.
 *
 * @version bkit v2.0.4
 * @see https://github.com/popup-studio-ai/bkit-claude-code/issues/53
 */

const fs = require('fs');
const path = require('path');
const { assert, summary, reset } = require('../helpers/assert');
reset();

const BASE_DIR = path.resolve(__dirname, '../..');
const HOOKS_PATH = path.join(BASE_DIR, 'hooks', 'hooks.json');

console.log('\n=== hook-path-quoting.test.js (12 TC) ===\n');

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

// ============================================================
// HPQ-001: All commands extracted
// ============================================================
console.log('--- Command Extraction ---');

assert('HPQ-001', allCommands.length >= 18,
  `Extracted ${allCommands.length} hook commands (expected >=18)`);

// ============================================================
// HPQ-002: All CLAUDE_PLUGIN_ROOT paths are quoted
// ============================================================
console.log('\n--- Path Quoting Validation ---');

const pluginRootCommands = allCommands.filter(c => c.includes('CLAUDE_PLUGIN_ROOT'));

assert('HPQ-002', pluginRootCommands.length >= 18,
  `${pluginRootCommands.length} commands use CLAUDE_PLUGIN_ROOT (expected >=18)`);

// HPQ-003: Each command has quoted path
const quotedPattern = /node\s+"[^"]*\$\{CLAUDE_PLUGIN_ROOT\}[^"]*"/;
const unquotedPattern = /node\s+\$\{CLAUDE_PLUGIN_ROOT\}/;

let allQuoted = true;
const unquotedCommands = [];
pluginRootCommands.forEach(cmd => {
  if (!quotedPattern.test(cmd)) {
    allQuoted = false;
    unquotedCommands.push(cmd);
  }
});

assert('HPQ-003', allQuoted,
  `All CLAUDE_PLUGIN_ROOT paths are double-quoted (${unquotedCommands.length} unquoted)`);

// HPQ-004: No unquoted CLAUDE_PLUGIN_ROOT usage
assert('HPQ-004', unquotedCommands.length === 0,
  `No unquoted CLAUDE_PLUGIN_ROOT paths found`);

// ============================================================
// HPQ-005~008: Specific hook events have quoted commands
// ============================================================
console.log('\n--- Specific Hook Event Checks ---');

function getHookCommands(eventName) {
  const entries = hooksConfig.hooks[eventName];
  if (!entries) return [];
  return extractCommands({ entries });
}

const criticalHooks = ['SessionStart', 'UserPromptSubmit', 'Stop', 'StopFailure'];
criticalHooks.forEach((hookName, idx) => {
  const cmds = getHookCommands(hookName);
  const allQ = cmds.every(c => !c.includes('CLAUDE_PLUGIN_ROOT') || quotedPattern.test(c));
  assert(`HPQ-00${idx + 5}`, allQ,
    `${hookName} hook commands are properly quoted`);
});

// ============================================================
// HPQ-009: JSON validity after quoting
// ============================================================
console.log('\n--- JSON Integrity ---');

assert('HPQ-009', typeof hooksConfig === 'object' && hooksConfig.hooks !== undefined,
  'hooks.json is valid JSON with hooks object');

// HPQ-010: Escaped quotes in JSON are properly handled
const rawContent = fs.readFileSync(HOOKS_PATH, 'utf-8');
const escapedQuoteCount = (rawContent.match(/\\"/g) || []).length;

assert('HPQ-010', escapedQuoteCount >= 36,
  `hooks.json has ${escapedQuoteCount} escaped quotes (expected >=36 for opening+closing)`);

// ============================================================
// HPQ-011: Variable expansion preserved inside double-quotes
// ============================================================
console.log('\n--- Variable Expansion ---');

assert('HPQ-011', pluginRootCommands.every(c => c.includes('${CLAUDE_PLUGIN_ROOT}')),
  'All commands preserve ${CLAUDE_PLUGIN_ROOT} variable syntax (not $CLAUDE_PLUGIN_ROOT)');

// HPQ-012: No single-quote wrapping (would prevent variable expansion)
const singleQuotePattern = /node\s+'[^']*CLAUDE_PLUGIN_ROOT[^']*'/;
assert('HPQ-012', pluginRootCommands.every(c => !singleQuotePattern.test(c)),
  'No commands use single-quotes around CLAUDE_PLUGIN_ROOT (would prevent expansion)');

// ============================================================
// Summary
// ============================================================
const result = summary('Hook Path Quoting Security');
process.exit(result.failed > 0 ? 1 : 0);
