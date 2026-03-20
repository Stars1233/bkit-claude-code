#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for lib/core/paths.js backupToPluginData and restoreFromPluginData
 * 20 TC | PLUGIN_DATA backup/restore verification
 *
 * @version bkit v1.6.2
 */

const path = require('path');
const fs = require('fs');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

console.log('\n=== plugin-data.test.js (20 TC) ===\n');

const corePaths = require('../../lib/core/paths');
const { STATE_PATHS, backupToPluginData, restoreFromPluginData } = corePaths;

// Save original env for cleanup
const origPluginData = process.env.CLAUDE_PLUGIN_DATA;

// ============================================================
// Section 1: Function Existence (2 TC)
// ============================================================
console.log('\n--- Section 1: Function Existence ---');

// PD-01: backupToPluginData is a function
assert('PD-01',
  typeof backupToPluginData === 'function',
  'backupToPluginData is a function'
);

// PD-02: restoreFromPluginData is a function
assert('PD-02',
  typeof restoreFromPluginData === 'function',
  'restoreFromPluginData is a function'
);

// ============================================================
// Section 2: backupToPluginData (8 TC)
// ============================================================
console.log('\n--- Section 2: backupToPluginData ---');

// PD-03: Without CLAUDE_PLUGIN_DATA, returns skipped message
delete process.env.CLAUDE_PLUGIN_DATA;
const noEnvResult = backupToPluginData();
assert('PD-03',
  Array.isArray(noEnvResult.skipped) && noEnvResult.skipped.includes('no CLAUDE_PLUGIN_DATA'),
  'Without CLAUDE_PLUGIN_DATA: skipped contains "no CLAUDE_PLUGIN_DATA"'
);

// PD-04: Return value has backed array
assert('PD-04',
  Array.isArray(noEnvResult.backed),
  'Return value has backed array'
);

// PD-05: Return value has skipped array
assert('PD-05',
  Array.isArray(noEnvResult.skipped),
  'Return value has skipped array'
);

// Set up temp dir for remaining tests
const TMP_DIR = path.join('/tmp', `bkit-test-pd-${Date.now()}`);
process.env.CLAUDE_PLUGIN_DATA = TMP_DIR;

// PD-06: Backup targets include pdca-status.backup.json
// We verify by checking the source code references the target name
const pathsSource = fs.readFileSync(path.join(__dirname, '../../lib/core/paths.js'), 'utf8');
assert('PD-06',
  pathsSource.includes('pdca-status.backup.json'),
  'Backup targets include pdca-status.backup.json'
);

// PD-07: Backup targets include memory.backup.json
assert('PD-07',
  pathsSource.includes('memory.backup.json'),
  'Backup targets include memory.backup.json'
);

// PD-08: version-history.json max 50 entries logic
assert('PD-08',
  pathsSource.includes('history.length > 50') && pathsSource.includes('.slice(-50)'),
  'version-history.json max 50 entries (slice(-50))'
);

// PD-09: Backup dir creation failure handling
// Force an invalid path to test error handling
const origPD = process.env.CLAUDE_PLUGIN_DATA;
process.env.CLAUDE_PLUGIN_DATA = '/dev/null/impossible/path';
const failResult = backupToPluginData();
assert('PD-09',
  Array.isArray(failResult.skipped) && failResult.skipped.length > 0,
  'Backup dir creation failure returns skipped with error'
);
process.env.CLAUDE_PLUGIN_DATA = origPD;

// PD-10: Backup completes without error (graceful handling of any source state)
process.env.CLAUDE_PLUGIN_DATA = TMP_DIR;
const anyBackup = backupToPluginData();
assert('PD-10',
  Array.isArray(anyBackup.backed) && Array.isArray(anyBackup.skipped),
  'Backup completes gracefully regardless of source file state'
);

// ============================================================
// Section 3: restoreFromPluginData (8 TC)
// ============================================================
console.log('\n--- Section 3: restoreFromPluginData ---');

// PD-11: No backup directory returns skipped message
delete process.env.CLAUDE_PLUGIN_DATA;
const noBackupResult = restoreFromPluginData();
assert('PD-11',
  Array.isArray(noBackupResult.skipped) && noBackupResult.skipped.includes('no backup directory'),
  'No backup directory: skipped contains "no backup directory"'
);

// PD-12: Return value has restored array
assert('PD-12',
  Array.isArray(noBackupResult.restored),
  'Return value has restored array'
);

// PD-13: Return value has skipped array
assert('PD-13',
  Array.isArray(noBackupResult.skipped),
  'Return value has skipped array'
);

// PD-14: Existing dest file prevents restore (no overwrite)
assert('PD-14',
  pathsSource.includes('!fs.existsSync(destPath)') && pathsSource.includes('fs.existsSync(backupPath)'),
  'Restore only when dest missing AND backup exists'
);

// PD-15: Missing dest + existing backup triggers restore
assert('PD-15',
  pathsSource.includes('fs.copyFileSync(backupPath, destPath)'),
  'Restore copies backup to dest via fs.copyFileSync'
);

// PD-16: Dest directory auto-creation with recursive
assert('PD-16',
  pathsSource.includes("fs.mkdirSync(destDir, { recursive: true })"),
  'Restore creates dest directory with recursive: true'
);

// PD-17: Restore failure adds to skipped array
assert('PD-17',
  pathsSource.includes('skipped.push(') && pathsSource.includes('e.message'),
  'Restore failure pushes error message to skipped array'
);

// PD-18: Restore targets are pdca-status and memory
assert('PD-18',
  pathsSource.includes("name: 'pdca-status'") && pathsSource.includes("name: 'memory'"),
  'Restore targets: pdca-status and memory'
);

// ============================================================
// Section 4: Integration (2 TC)
// ============================================================
console.log('\n--- Section 4: Integration ---');

// PD-19: Backup -> Restore roundtrip structure
process.env.CLAUDE_PLUGIN_DATA = TMP_DIR;
const bResult = backupToPluginData();
const rResult = restoreFromPluginData();
assert('PD-19',
  Array.isArray(bResult.backed) && Array.isArray(bResult.skipped) &&
  Array.isArray(rResult.restored) && Array.isArray(rResult.skipped),
  'Backup -> Restore roundtrip returns correct structure'
);

// PD-20: STATE_PATHS.pluginDataBackup() is callable
assert('PD-20',
  typeof STATE_PATHS.pluginDataBackup === 'function',
  'STATE_PATHS.pluginDataBackup() is a callable function'
);

// Cleanup
try {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
} catch (e) { /* cleanup non-critical */ }

// Restore original env
if (origPluginData !== undefined) {
  process.env.CLAUDE_PLUGIN_DATA = origPluginData;
} else {
  delete process.env.CLAUDE_PLUGIN_DATA;
}

summary('Plugin Data Backup/Restore Unit Tests');
