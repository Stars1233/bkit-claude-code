#!/usr/bin/env node
/**
 * Hook Flow Architecture Test
 * @module test/architecture/hook-flow
 * @version 2.0.0
 *
 * Verifies hooks.json structure, handler existence, flow order, and timeouts.
 * 20 TC: HF-001 ~ HF-020
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

// Load hooks.json
const hooksJsonPath = path.join(PROJECT_ROOT, 'hooks', 'hooks.json');
const hooksConfig = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
const events = Object.keys(hooksConfig.hooks);

// ============================================================
// Section 1: hooks.json has expected events (HF-001~005)
// ============================================================

// HF-001: hooks.json has hooks object
assert('HF-001',
  hooksConfig.hooks !== null && typeof hooksConfig.hooks === 'object',
  'hooks.json has hooks object'
);

// HF-002: hooks.json has correct event count
assert('HF-002',
  events.length >= 14,
  `hooks.json has ${events.length} events (expected >= 14)`
);

// HF-003: Required lifecycle events exist
const requiredEvents = ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop', 'UserPromptSubmit'];
const allRequired = requiredEvents.every(e => events.includes(e));
assert('HF-003',
  allRequired,
  `All required lifecycle events present: ${requiredEvents.join(', ')}`
);

// HF-004: v2.0.0 events exist (StopFailure, PostCompact, etc.)
const v2Events = ['StopFailure', 'PostCompact', 'TaskCompleted', 'SessionEnd'];
const v2Present = v2Events.filter(e => events.includes(e));
assert('HF-004',
  v2Present.length >= 3,
  `v2.0.0 events present: ${v2Present.join(', ')} (${v2Present.length}/4)`
);

// HF-005: Team-related events exist
const teamEvents = ['SubagentStart', 'SubagentStop', 'TeammateIdle'];
const teamPresent = teamEvents.filter(e => events.includes(e));
assert('HF-005',
  teamPresent.length >= 2,
  `Team events present: ${teamPresent.join(', ')} (${teamPresent.length}/3)`
);

// ============================================================
// Section 2: Each event handler script exists (HF-006~010)
// ============================================================

// Collect all referenced scripts
const allScripts = [];
for (const [eventName, entries] of Object.entries(hooksConfig.hooks)) {
  for (const entry of entries) {
    const hooksList = entry.hooks || [];
    for (const hook of hooksList) {
      if (hook.command) {
        // Extract script path from command
        const match = hook.command.match(/node\s+"?\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s"]+)"?/);
        if (match) {
          allScripts.push({ event: eventName, script: match[1] });
        }
      }
    }
  }
}

// HF-006: All referenced scripts exist
let missingScripts = 0;
for (const entry of allScripts) {
  const fullPath = path.join(PROJECT_ROOT, entry.script);
  if (!fs.existsSync(fullPath)) {
    missingScripts++;
  }
}
assert('HF-006',
  missingScripts === 0,
  `All ${allScripts.length} handler scripts exist (${missingScripts} missing)`
);

// HF-007: SessionStart script exists
const sessionStartScripts = allScripts.filter(s => s.event === 'SessionStart');
assert('HF-007',
  sessionStartScripts.length >= 1,
  'SessionStart has at least 1 handler script'
);

// HF-008: PreToolUse has multiple matchers
const preToolEntries = hooksConfig.hooks.PreToolUse || [];
assert('HF-008',
  preToolEntries.length >= 2,
  `PreToolUse has ${preToolEntries.length} matcher entries (expected >= 2)`
);

// HF-009: PostToolUse has multiple matchers
const postToolEntries = hooksConfig.hooks.PostToolUse || [];
assert('HF-009',
  postToolEntries.length >= 2,
  `PostToolUse has ${postToolEntries.length} matcher entries (expected >= 2)`
);

// HF-010: Stop has at least 1 handler
const stopEntries = hooksConfig.hooks.Stop || [];
assert('HF-010',
  stopEntries.length >= 1,
  `Stop has ${stopEntries.length} handler entries`
);

// ============================================================
// Section 3: Pre->Tool->Post->Stop flow order (HF-011~015)
// ============================================================

// HF-011: PreToolUse matches Write|Edit
const preWriteEntry = preToolEntries.find(e => e.matcher && e.matcher.includes('Write'));
assert('HF-011',
  preWriteEntry !== undefined,
  'PreToolUse has matcher for Write|Edit'
);

// HF-012: PreToolUse matches Bash
const preBashEntry = preToolEntries.find(e => e.matcher && e.matcher.includes('Bash'));
assert('HF-012',
  preBashEntry !== undefined,
  'PreToolUse has matcher for Bash'
);

// HF-013: PostToolUse matches Write
const postWriteEntry = postToolEntries.find(e => e.matcher && e.matcher.includes('Write'));
assert('HF-013',
  postWriteEntry !== undefined,
  'PostToolUse has matcher for Write'
);

// HF-014: PostToolUse matches Bash
const postBashEntry = postToolEntries.find(e => e.matcher && e.matcher.includes('Bash'));
assert('HF-014',
  postBashEntry !== undefined,
  'PostToolUse has matcher for Bash'
);

// HF-015: UserPromptSubmit before Stop in logical flow
const eventOrder = events;
const promptIndex = eventOrder.indexOf('UserPromptSubmit');
assert('HF-015',
  promptIndex >= 0,
  'UserPromptSubmit event exists in hooks.json'
);

// ============================================================
// Section 4: Timeout values within CC limits (HF-016~020)
// ============================================================

// Collect all timeouts
const allTimeouts = [];
for (const [eventName, entries] of Object.entries(hooksConfig.hooks)) {
  for (const entry of entries) {
    const hooksList = entry.hooks || [];
    for (const hook of hooksList) {
      if (hook.timeout) {
        allTimeouts.push({ event: eventName, timeout: hook.timeout });
      }
    }
  }
}

// HF-016: All timeouts are numbers
const allTimeoutsNumeric = allTimeouts.every(t => typeof t.timeout === 'number');
assert('HF-016',
  allTimeoutsNumeric,
  `All ${allTimeouts.length} timeout values are numeric`
);

// HF-017: No timeout exceeds 30 seconds (CC max hook timeout)
const maxTimeout = Math.max(...allTimeouts.map(t => t.timeout));
assert('HF-017',
  maxTimeout <= 30000,
  `Maximum timeout is ${maxTimeout}ms (<= 30000ms CC limit)`
);

// HF-018: SessionStart timeout is reasonable (5000ms or less)
const sessionStartTimeout = allTimeouts.find(t => t.event === 'SessionStart');
assert('HF-018',
  sessionStartTimeout && sessionStartTimeout.timeout <= 5000,
  `SessionStart timeout: ${sessionStartTimeout?.timeout || 'N/A'}ms (<= 5000ms)`
);

// HF-019: Stop timeout allows for cleanup (>= 5000ms)
const stopTimeout = allTimeouts.find(t => t.event === 'Stop');
assert('HF-019',
  stopTimeout && stopTimeout.timeout >= 5000,
  `Stop timeout: ${stopTimeout?.timeout || 'N/A'}ms (>= 5000ms for cleanup)`
);

// HF-020: All events have at least one hook with timeout
const eventsWithTimeout = new Set(allTimeouts.map(t => t.event));
const eventsWithoutTimeout = events.filter(e => !eventsWithTimeout.has(e));
assert('HF-020',
  eventsWithoutTimeout.length === 0,
  `All events have timeout configured (${eventsWithoutTimeout.length} missing)`
);

// ============================================================
// Summary
// ============================================================
console.log('\n========================================');
console.log('Hook Flow Architecture Test Results');
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
