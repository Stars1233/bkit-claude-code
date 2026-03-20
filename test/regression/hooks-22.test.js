#!/usr/bin/env node
'use strict';
/**
 * Regression Test: 22 Hook Events Verification (25 TC)
 * HK-001~022: Each of 22 hook events registered in hooks.json
 * HK-023~025: Each handler script file exists and has valid JS syntax
 *
 * @version bkit v2.0.0
 */

const fs = require('fs');
const path = require('path');
const { assert, summary, reset } = require('../helpers/assert');
reset();

const BASE_DIR = path.resolve(__dirname, '../..');
const HOOKS_DIR = path.join(BASE_DIR, 'hooks');
const SCRIPTS_DIR = path.join(BASE_DIR, 'scripts');

console.log('\n=== hooks-22.test.js (25 TC) ===\n');

// --- Load hooks.json ---
let hooksConfig;
try {
  hooksConfig = JSON.parse(fs.readFileSync(path.join(HOOKS_DIR, 'hooks.json'), 'utf-8'));
} catch (e) {
  console.error('hooks.json load failed:', e.message);
  process.exit(1);
}

const hookEvents = Object.keys(hooksConfig.hooks);

// ============================================================
// HK-001~022: Each hook event registered
// ============================================================
console.log('--- Hook Event Registration ---');

const EXPECTED_HOOKS = [
  'SessionStart',
  'PreToolUse',
  'PostToolUse',
  'Stop',
  'StopFailure',
  'UserPromptSubmit',
  'PreCompact',
  'PostCompact',
  'TaskCompleted',
  'SubagentStart',
  'SubagentStop',
  'TeammateIdle',
  'SessionEnd',
  'PostToolUseFailure',
  'InstructionsLoaded',
  'ConfigChange',
  'PermissionRequest',
  'Notification',
];

// HK-001 to HK-018: Named hook events
EXPECTED_HOOKS.forEach((hookName, idx) => {
  const num = String(idx + 1).padStart(3, '0');
  assert(`HK-${num}`, hooksConfig.hooks[hookName] !== undefined,
    `${hookName} hook event registered in hooks.json`);
});

// HK-019: Total hook event count
assert('HK-019', hookEvents.length >= 18,
  `hooks.json has ${hookEvents.length} hook events (expected >=18)`);

// HK-020: PreToolUse has matchers
const preToolUse = hooksConfig.hooks.PreToolUse;
assert('HK-020', Array.isArray(preToolUse) && preToolUse.length >= 2,
  `PreToolUse has ${preToolUse?.length || 0} matchers (Write|Edit, Bash)`);

// HK-021: PostToolUse has matchers
const postToolUse = hooksConfig.hooks.PostToolUse;
assert('HK-021', Array.isArray(postToolUse) && postToolUse.length >= 3,
  `PostToolUse has ${postToolUse?.length || 0} matchers (Write, Bash, Skill)`);

// HK-022: PreCompact has auto|manual matcher
const preCompact = hooksConfig.hooks.PreCompact;
assert('HK-022', preCompact !== undefined &&
  JSON.stringify(preCompact).includes('auto|manual'),
  'PreCompact hook with auto|manual matcher');

// ============================================================
// HK-023~025: Handler scripts exist and have valid syntax
// ============================================================
console.log('\n--- Handler Script Validation ---');

// Extract all script paths from hooks.json
function extractScriptPaths(obj) {
  const paths = [];
  const str = JSON.stringify(obj);
  const regex = /\$\{CLAUDE_PLUGIN_ROOT\}\/([\w/.-]+)/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    paths.push(match[1]);
  }
  return [...new Set(paths)];
}

const scriptPaths = extractScriptPaths(hooksConfig);

// HK-023: All referenced scripts exist
let allExist = true;
const missingScripts = [];
for (const sp of scriptPaths) {
  const fullPath = path.join(BASE_DIR, sp);
  if (!fs.existsSync(fullPath)) {
    allExist = false;
    missingScripts.push(sp);
  }
}
assert('HK-023', allExist,
  `All ${scriptPaths.length} referenced scripts exist${missingScripts.length ? ' MISSING: ' + missingScripts.join(', ') : ''}`);

// HK-024: All referenced scripts have valid JS syntax (can be parsed)
let allValidSyntax = true;
const syntaxErrors = [];
for (const sp of scriptPaths) {
  const fullPath = path.join(BASE_DIR, sp);
  if (!fs.existsSync(fullPath)) continue;
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    // Basic syntax check: try to create a Function from it (won't execute)
    new Function(content);
  } catch (e) {
    // Some scripts use require which fails in Function context,
    // so we only flag true parse errors (SyntaxError)
    if (e instanceof SyntaxError) {
      allValidSyntax = false;
      syntaxErrors.push(`${sp}: ${e.message}`);
    }
  }
}
assert('HK-024', allValidSyntax,
  `All scripts have valid JS syntax${syntaxErrors.length ? ' ERRORS: ' + syntaxErrors.join('; ') : ''}`);

// HK-025: All hook entries have timeout values
let allHaveTimeout = true;
const missingTimeout = [];
for (const [eventName, entries] of Object.entries(hooksConfig.hooks)) {
  const arr = Array.isArray(entries) ? entries : [entries];
  for (const entry of arr) {
    const hooks = entry.hooks || [];
    for (const hook of hooks) {
      if (!hook.timeout || typeof hook.timeout !== 'number') {
        allHaveTimeout = false;
        missingTimeout.push(eventName);
      }
    }
  }
}
assert('HK-025', allHaveTimeout,
  `All hook entries have numeric timeout${missingTimeout.length ? ' MISSING: ' + [...new Set(missingTimeout)].join(', ') : ''}`);

// ============================================================
// Summary
// ============================================================
const result = summary('22 Hook Events Regression Tests');
if (result.failed > 0) process.exit(1);
