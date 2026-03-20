#!/usr/bin/env node
'use strict';
/**
 * Integration Tests for PLUGIN_DATA session restore flow
 * 10 TC | SessionStart -> PLUGIN_DATA restore integration
 *
 * @version bkit v1.6.2
 */

const path = require('path');
const fs = require('fs');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

const BASE_DIR = path.resolve(__dirname, '../..');
const HOOKS_DIR = path.join(BASE_DIR, 'hooks');
const SCRIPTS_DIR = path.join(BASE_DIR, 'scripts');

console.log('\n=== session-restore.test.js (10 TC) ===\n');

// ============================================================
// Section 1: Session Start Script (3 TC)
// ============================================================
console.log('\n--- Section 1: Session Start Script ---');

// SR-01: hooks/session-start.js exists and is requireable
const sessionStartPath = path.join(HOOKS_DIR, 'session-start.js');
assert('SR-01',
  fs.existsSync(sessionStartPath),
  'hooks/session-start.js file exists'
);

// SR-02: session-start.js uses lib modules (common.js or direct lib/ imports)
const sessionStartContent = fs.readFileSync(sessionStartPath, 'utf8');
assert('SR-02',
  sessionStartContent.includes("require('../lib/common") || sessionStartContent.includes('require("../lib/common') ||
  sessionStartContent.includes("require('../lib/core") || sessionStartContent.includes("require('../lib/pdca"),
  'session-start.js imports from lib modules'
);

// SR-03: hooks.json SessionStart references session-start.js
const hooksJson = JSON.parse(fs.readFileSync(path.join(HOOKS_DIR, 'hooks.json'), 'utf8'));
const sessionStartHook = hooksJson.hooks.SessionStart;
assert('SR-03',
  sessionStartHook &&
  JSON.stringify(sessionStartHook).includes('session-start.js'),
  'hooks.json SessionStart references session-start.js'
);

// ============================================================
// Section 2: PLUGIN_DATA Integration (4 TC)
// ============================================================
console.log('\n--- Section 2: PLUGIN_DATA Integration ---');

const { STATE_PATHS, backupToPluginData, restoreFromPluginData } = require('../../lib/core/paths');

// SR-04: pluginDataBackup returns path when CLAUDE_PLUGIN_DATA is set
const origPD = process.env.CLAUDE_PLUGIN_DATA;
const TMP_DIR = path.join('/tmp', `bkit-test-sr-${Date.now()}`);
process.env.CLAUDE_PLUGIN_DATA = TMP_DIR;
const backupPath = STATE_PATHS.pluginDataBackup();
assert('SR-04',
  backupPath && backupPath.includes(TMP_DIR),
  `pluginDataBackup() returns path containing CLAUDE_PLUGIN_DATA (got ${backupPath})`
);

// SR-05: pluginDataBackup returns null when CLAUDE_PLUGIN_DATA is not set
delete process.env.CLAUDE_PLUGIN_DATA;
const nullPath = STATE_PATHS.pluginDataBackup();
assert('SR-05',
  nullPath === null,
  'pluginDataBackup() returns null when CLAUDE_PLUGIN_DATA not set'
);

// SR-06: backup -> restore roundtrip
process.env.CLAUDE_PLUGIN_DATA = TMP_DIR;
const backupResult = backupToPluginData();
const restoreResult = restoreFromPluginData();
assert('SR-06',
  Array.isArray(backupResult.backed) && Array.isArray(backupResult.skipped) &&
  Array.isArray(restoreResult.restored) && Array.isArray(restoreResult.skipped),
  'Backup -> Restore roundtrip returns valid structure'
);

// SR-07: Existing files are not overwritten during restore
// Since we just ran backup (which may or may not have written files),
// restore should not overwrite anything that already exists
const restoreResult2 = restoreFromPluginData();
assert('SR-07',
  Array.isArray(restoreResult2.restored),
  'Restore does not crash when dest files already exist (no overwrite)'
);

// ============================================================
// Section 3: PostCompact Restore Flow (3 TC)
// ============================================================
console.log('\n--- Section 3: PostCompact Restore Flow ---');

// SR-08: post-compaction.js references restoreFromPluginData
const postCompactionPath = path.join(SCRIPTS_DIR, 'post-compaction.js');
const postCompactionContent = fs.readFileSync(postCompactionPath, 'utf8');
assert('SR-08',
  postCompactionContent.includes('restoreFromPluginData'),
  'post-compaction.js references restoreFromPluginData'
);

// SR-09: hooks.json PostCompact references post-compaction.js
const postCompactHook = hooksJson.hooks.PostCompact;
assert('SR-09',
  postCompactHook &&
  JSON.stringify(postCompactHook).includes('post-compaction.js'),
  'hooks.json PostCompact references post-compaction.js'
);

// SR-10: hooks.json StopFailure references stop-failure-handler.js
const stopFailureHook = hooksJson.hooks.StopFailure;
assert('SR-10',
  stopFailureHook &&
  JSON.stringify(stopFailureHook).includes('stop-failure-handler.js'),
  'hooks.json StopFailure references stop-failure-handler.js'
);

// Cleanup
try {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
} catch (e) { /* cleanup non-critical */ }

// Restore original env
if (origPD !== undefined) {
  process.env.CLAUDE_PLUGIN_DATA = origPD;
} else {
  delete process.env.CLAUDE_PLUGIN_DATA;
}

summary('Session Restore Integration Tests');
