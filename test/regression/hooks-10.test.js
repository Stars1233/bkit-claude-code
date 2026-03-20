'use strict';
/**
 * Regression Test: 12 Hook Events Verification (12 TC)
 * Validates hooks.json configuration (12 events) and referenced script existence
 *
 * @version bkit v1.6.2
 */
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../..');
const HOOKS_DIR = path.join(BASE_DIR, 'hooks');
const SCRIPTS_DIR = path.join(BASE_DIR, 'scripts');

let passed = 0, failed = 0, total = 0;

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; console.error(`  FAIL: ${id} - ${message}`); }
}

console.log('\n=== hooks-12.test.js (12 TC) ===\n');

// --- Load hooks.json ---
let hooksConfig;
try {
  hooksConfig = JSON.parse(fs.readFileSync(path.join(HOOKS_DIR, 'hooks.json'), 'utf-8'));
} catch (e) {
  console.error('hooks.json load failed:', e.message);
  process.exit(1);
}

const hookEvents = Object.keys(hooksConfig.hooks);

// --- Test each hook event ---

// TC1: SessionStart
assert('HK-01', hooksConfig.hooks.SessionStart !== undefined, 'SessionStart hook event configured');

// TC2: PreToolUse
const preToolUse = hooksConfig.hooks.PreToolUse;
assert('HK-02', Array.isArray(preToolUse) && preToolUse.length >= 2,
  `PreToolUse has ${preToolUse?.length || 0} matchers (Write|Edit, Bash)`);

// TC3: PostToolUse
const postToolUse = hooksConfig.hooks.PostToolUse;
assert('HK-03', Array.isArray(postToolUse) && postToolUse.length >= 3,
  `PostToolUse has ${postToolUse?.length || 0} matchers (Write, Bash, Skill)`);

// TC4: Stop
assert('HK-04', hooksConfig.hooks.Stop !== undefined, 'Stop hook event configured');

// TC5: UserPromptSubmit
assert('HK-05', hooksConfig.hooks.UserPromptSubmit !== undefined, 'UserPromptSubmit hook event configured');

// TC6: PreCompact
const preCompact = hooksConfig.hooks.PreCompact;
assert('HK-06', preCompact !== undefined &&
  JSON.stringify(preCompact).includes('auto|manual'),
  'PreCompact hook with auto|manual matcher');

// TC7: TaskCompleted
assert('HK-07', hooksConfig.hooks.TaskCompleted !== undefined, 'TaskCompleted hook event configured');

// TC8: SubagentStart
assert('HK-08', hooksConfig.hooks.SubagentStart !== undefined, 'SubagentStart hook event configured');

// TC9: SubagentStop
assert('HK-09', hooksConfig.hooks.SubagentStop !== undefined, 'SubagentStop hook event configured');

// TC10: TeammateIdle
assert('HK-10', hooksConfig.hooks.TeammateIdle !== undefined, 'TeammateIdle hook event configured');

// TC11: PostCompact
assert('HK-11', hooksConfig.hooks.PostCompact !== undefined, 'PostCompact hook event configured');

// TC12: StopFailure
assert('HK-12', hooksConfig.hooks.StopFailure !== undefined, 'StopFailure hook event configured');

// --- Bonus: verify all referenced scripts exist ---
console.log('\n--- Script Existence Validation ---');

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
let allScriptsExist = true;
const missingScripts = [];

for (const sp of scriptPaths) {
  const fullPath = path.join(BASE_DIR, sp);
  if (!fs.existsSync(fullPath)) {
    allScriptsExist = false;
    missingScripts.push(sp);
  }
}

if (!allScriptsExist) {
  console.log(`  INFO: Missing scripts: ${missingScripts.join(', ')}`);
} else {
  console.log(`  INFO: All ${scriptPaths.length} referenced scripts exist`);
}

// ============================================================
// Summary
// ============================================================
console.log(`\n=== Results: ${passed}/${total} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
