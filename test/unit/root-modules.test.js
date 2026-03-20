#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for lib/ root untested modules
 * 30 TC | context-fork.js, context-hierarchy.js, memory-store.js,
 *         permission-manager.js, import-resolver.js
 *
 * @version bkit v2.0.0
 */

const path = require('path');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

console.log('\n=== root-modules.test.js (30 TC) ===\n');

// Load modules
let contextFork, contextHierarchy, memoryStore, permissionManager, importResolver;

try {
  contextFork = require('../../lib/context-fork');
} catch (e) {
  contextFork = null;
}

try {
  contextHierarchy = require('../../lib/context-hierarchy');
} catch (e) {
  contextHierarchy = null;
}

try {
  memoryStore = require('../../lib/memory-store');
} catch (e) {
  memoryStore = null;
}

try {
  permissionManager = require('../../lib/permission-manager');
} catch (e) {
  permissionManager = null;
}

try {
  importResolver = require('../../lib/import-resolver');
} catch (e) {
  importResolver = null;
}

const cfLoaded = contextFork !== null;
const chLoaded = contextHierarchy !== null;
const msLoaded = memoryStore !== null;
const pmLoaded = permissionManager !== null;
const irLoaded = importResolver !== null;

// ============================================================
// Section 1: context-fork.js (RM-001 ~ RM-006)
// ============================================================
console.log('\n--- Section 1: context-fork.js ---');

// RM-001: Module exports forkContext function
{
  assert('RM-001', cfLoaded && typeof contextFork.forkContext === 'function',
    'context-fork exports forkContext');
}

// RM-002: Module exports getForkedContext function
{
  assert('RM-002', cfLoaded && typeof contextFork.getForkedContext === 'function',
    'context-fork exports getForkedContext');
}

// RM-003: Module exports isForkedExecution function
{
  assert('RM-003', cfLoaded && typeof contextFork.isForkedExecution === 'function',
    'context-fork exports isForkedExecution');
}

// RM-004: isForkedExecution returns false for unknown forkId
{
  if (cfLoaded) {
    const result = contextFork.isForkedExecution('nonexistent-fork-id');
    assert('RM-004', result === false,
      'isForkedExecution returns false for unknown forkId');
  } else {
    skip('RM-004', 'Module not loaded');
  }
}

// RM-005: getActiveForks returns array
{
  if (cfLoaded) {
    const result = contextFork.getActiveForks();
    assert('RM-005', Array.isArray(result),
      'getActiveForks returns an array');
  } else {
    skip('RM-005', 'Module not loaded');
  }
}

// RM-006: getForkedContext returns null for unknown forkId
{
  if (cfLoaded) {
    const result = contextFork.getForkedContext('nonexistent-fork-rm006');
    assert('RM-006', result === null,
      'getForkedContext returns null for unknown forkId');
  } else {
    skip('RM-006', 'Module not loaded');
  }
}

// ============================================================
// Section 2: context-fork.js advanced (RM-007 ~ RM-010)
// ============================================================
console.log('\n--- Section 2: context-fork.js advanced ---');

// RM-007: getForkMetadata returns null for unknown forkId
{
  if (cfLoaded) {
    const result = contextFork.getForkMetadata('nonexistent-rm007');
    assert('RM-007', result === null,
      'getForkMetadata returns null for unknown forkId');
  } else {
    skip('RM-007', 'Module not loaded');
  }
}

// RM-008: clearAllForks does not throw
{
  if (cfLoaded) {
    let threw = false;
    try { contextFork.clearAllForks(); } catch (e) { threw = true; }
    assert('RM-008', threw === false,
      'clearAllForks does not throw');
  } else {
    skip('RM-008', 'Module not loaded');
  }
}

// RM-009: discardFork does not throw for unknown forkId
{
  if (cfLoaded) {
    let threw = false;
    try { contextFork.discardFork('nonexistent-rm009'); } catch (e) { threw = true; }
    assert('RM-009', threw === false,
      'discardFork does not throw for unknown forkId');
  } else {
    skip('RM-009', 'Module not loaded');
  }
}

// RM-010: All 9 exports are present
{
  if (cfLoaded) {
    const expected = [
      'forkContext', 'getForkedContext', 'updateForkedContext',
      'mergeForkedContext', 'isForkedExecution', 'discardFork',
      'getActiveForks', 'getForkMetadata', 'clearAllForks'
    ];
    const allPresent = expected.every(name => typeof contextFork[name] === 'function');
    assert('RM-010', allPresent,
      'All 9 context-fork exports are present');
  } else {
    skip('RM-010', 'Module not loaded');
  }
}

// ============================================================
// Section 3: context-hierarchy.js (RM-011 ~ RM-016)
// ============================================================
console.log('\n--- Section 3: context-hierarchy.js ---');

// RM-011: Module exports LEVEL_PRIORITY constant
{
  assert('RM-011', chLoaded && contextHierarchy.LEVEL_PRIORITY !== undefined,
    'context-hierarchy exports LEVEL_PRIORITY');
}

// RM-012: LEVEL_PRIORITY has 4 levels
{
  if (chLoaded) {
    const lp = contextHierarchy.LEVEL_PRIORITY;
    assert('RM-012',
      lp.plugin === 1 && lp.user === 2 && lp.project === 3 && lp.session === 4,
      'LEVEL_PRIORITY has correct 4-level priorities');
  } else {
    skip('RM-012', 'Module not loaded');
  }
}

// RM-013: setSessionContext and getSessionContext work
{
  if (chLoaded) {
    contextHierarchy.setSessionContext('test-rm013', 42);
    const result = contextHierarchy.getSessionContext('test-rm013');
    assert('RM-013', result === 42,
      'setSessionContext/getSessionContext round-trip works');
    // cleanup
    contextHierarchy.clearSessionContext();
  } else {
    skip('RM-013', 'Module not loaded');
  }
}

// RM-014: getSessionContext returns default for missing key
{
  if (chLoaded) {
    const result = contextHierarchy.getSessionContext('nonexistent-rm014', 'default-val');
    assert('RM-014', result === 'default-val',
      'getSessionContext returns default for missing key');
  } else {
    skip('RM-014', 'Module not loaded');
  }
}

// RM-015: clearSessionContext clears all session data
{
  if (chLoaded) {
    contextHierarchy.setSessionContext('temp-rm015', 'val');
    contextHierarchy.clearSessionContext();
    const all = contextHierarchy.getAllSessionContext();
    assert('RM-015', Object.keys(all).length === 0,
      'clearSessionContext clears all session data');
  } else {
    skip('RM-015', 'Module not loaded');
  }
}

// RM-016: getUserConfigDir returns string path
{
  if (chLoaded) {
    const result = contextHierarchy.getUserConfigDir();
    assert('RM-016', typeof result === 'string' && result.includes('.claude'),
      'getUserConfigDir returns path containing .claude');
  } else {
    skip('RM-016', 'Module not loaded');
  }
}

// ============================================================
// Section 4: memory-store.js (RM-017 ~ RM-021)
// ============================================================
console.log('\n--- Section 4: memory-store.js ---');

// RM-017: Module exports getMemory function
{
  assert('RM-017', msLoaded && typeof memoryStore.getMemory === 'function',
    'memory-store exports getMemory');
}

// RM-018: Module exports setMemory function
{
  assert('RM-018', msLoaded && typeof memoryStore.setMemory === 'function',
    'memory-store exports setMemory');
}

// RM-019: Module exports invalidateCache function
{
  assert('RM-019', msLoaded && typeof memoryStore.invalidateCache === 'function',
    'memory-store exports invalidateCache');
}

// RM-020: getMemory returns default for missing key
{
  if (msLoaded) {
    const result = memoryStore.getMemory('nonexistent-rm020-key', 'fallback');
    assert('RM-020', result === 'fallback',
      'getMemory returns default value for missing key');
  } else {
    skip('RM-020', 'Module not loaded');
  }
}

// RM-021: All 10 exports are present
{
  if (msLoaded) {
    const expected = [
      'getMemory', 'setMemory', 'deleteMemory', 'getAllMemory',
      'hasMemory', 'getMemoryKeys', 'updateMemory', 'clearMemory',
      'getMemoryPath', 'invalidateCache'
    ];
    const allPresent = expected.every(name => typeof memoryStore[name] === 'function');
    assert('RM-021', allPresent,
      'All 10 memory-store exports are present');
  } else {
    skip('RM-021', 'Module not loaded');
  }
}

// ============================================================
// Section 5: permission-manager.js (RM-022 ~ RM-026)
// ============================================================
console.log('\n--- Section 5: permission-manager.js ---');

// RM-022: Module exports PERMISSION_LEVELS constant
{
  assert('RM-022', pmLoaded && permissionManager.PERMISSION_LEVELS !== undefined,
    'permission-manager exports PERMISSION_LEVELS');
}

// RM-023: PERMISSION_LEVELS has deny, ask, allow
{
  if (pmLoaded) {
    const pl = permissionManager.PERMISSION_LEVELS;
    assert('RM-023', pl.deny === 0 && pl.ask === 1 && pl.allow === 2,
      'PERMISSION_LEVELS has correct deny=0, ask=1, allow=2');
  } else {
    skip('RM-023', 'Module not loaded');
  }
}

// RM-024: isValidPermission recognizes valid permissions
{
  if (pmLoaded) {
    assert('RM-024',
      permissionManager.isValidPermission('deny') === true &&
      permissionManager.isValidPermission('ask') === true &&
      permissionManager.isValidPermission('allow') === true &&
      permissionManager.isValidPermission('invalid') === false,
      'isValidPermission correctly validates permission strings');
  } else {
    skip('RM-024', 'Module not loaded');
  }
}

// RM-025: isMoreRestrictive compares permissions correctly
{
  if (pmLoaded) {
    assert('RM-025',
      permissionManager.isMoreRestrictive('deny', 'allow') === true &&
      permissionManager.isMoreRestrictive('allow', 'deny') === false,
      'isMoreRestrictive compares deny vs allow correctly');
  } else {
    skip('RM-025', 'Module not loaded');
  }
}

// RM-026: DEFAULT_PERMISSIONS has expected keys
{
  if (pmLoaded) {
    const dp = permissionManager.DEFAULT_PERMISSIONS;
    assert('RM-026', dp.Write === 'allow' && dp.Read === 'allow' && dp['Bash(rm -rf*)'] === 'deny',
      'DEFAULT_PERMISSIONS has expected tool defaults');
  } else {
    skip('RM-026', 'Module not loaded');
  }
}

// ============================================================
// Section 6: import-resolver.js (RM-027 ~ RM-030)
// ============================================================
console.log('\n--- Section 6: import-resolver.js ---');

// RM-027: Module exports parseFrontmatter function
{
  assert('RM-027', irLoaded && typeof importResolver.parseFrontmatter === 'function',
    'import-resolver exports parseFrontmatter');
}

// RM-028: parseFrontmatter parses YAML frontmatter
{
  if (irLoaded) {
    const content = '---\ntitle: Test\n---\n# Body content';
    const result = importResolver.parseFrontmatter(content);
    assert('RM-028', result.frontmatter.title === 'Test' && result.body === '# Body content',
      'parseFrontmatter parses YAML frontmatter correctly');
  } else {
    skip('RM-028', 'Module not loaded');
  }
}

// RM-029: parseFrontmatter returns empty frontmatter for non-YAML content
{
  if (irLoaded) {
    const content = '# Just markdown\nNo frontmatter here';
    const result = importResolver.parseFrontmatter(content);
    assert('RM-029', Object.keys(result.frontmatter).length === 0 && result.body === content,
      'parseFrontmatter returns empty frontmatter for plain markdown');
  } else {
    skip('RM-029', 'Module not loaded');
  }
}

// RM-030: clearImportCache and getCacheStats work
{
  if (irLoaded) {
    importResolver.clearImportCache();
    const stats = importResolver.getCacheStats();
    assert('RM-030', stats.size === 0 && Array.isArray(stats.entries),
      'clearImportCache clears cache and getCacheStats reports correctly');
  } else {
    skip('RM-030', 'Module not loaded');
  }
}

// ============================================================
// Summary
// ============================================================
const result = summary('root-modules.test.js');
module.exports = result;
