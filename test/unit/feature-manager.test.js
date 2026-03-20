#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for lib/pdca/feature-manager.js
 * 20 TC | getActiveFeatures, canStartFeature, registerFeature,
 *         releaseFeature, checkConflict, dependencies, dashboard
 *
 * @version bkit v1.6.2
 */

const path = require('path');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

console.log('\n=== feature-manager.test.js (20 TC) ===\n');

// Load module
let fm;
try {
  fm = require('../../lib/pdca/feature-manager');
} catch (e) {
  fm = null;
}

const moduleLoaded = fm !== null;

// ============================================================
// Section 1: getActiveFeatures (FM-001 ~ FM-004)
// ============================================================
console.log('\n--- Section 1: getActiveFeatures ---');

// FM-001: Module exports getActiveFeatures function
{
  assert('FM-001', fm && typeof fm.getActiveFeatures === 'function',
    'feature-manager exports getActiveFeatures');
}

// FM-002: getActiveFeatures returns object with expected shape
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fm.getActiveFeatures();
    } catch (e) { result = null; }
    assert('FM-002',
      result && Array.isArray(result.features) && typeof result.activeCount === 'number',
      'getActiveFeatures returns {features: [], activeCount: number}');
  } else {
    skip('FM-002', 'Module not loaded');
  }
}

// FM-003: MAX_CONCURRENT_FEATURES constant is 3
{
  assert('FM-003', fm && fm.MAX_CONCURRENT_FEATURES === 3,
    'MAX_CONCURRENT_FEATURES is 3');
}

// FM-004: MAX_CONCURRENT_DO constant is 1
{
  assert('FM-004', fm && fm.MAX_CONCURRENT_DO === 1,
    'MAX_CONCURRENT_DO is 1');
}

// ============================================================
// Section 2: canStartFeature (FM-005 ~ FM-008)
// ============================================================
console.log('\n--- Section 2: canStartFeature ---');

// FM-005: Module exports canStartFeature function
{
  assert('FM-005', fm && typeof fm.canStartFeature === 'function',
    'feature-manager exports canStartFeature');
}

// FM-006: canStartFeature returns object with allowed field
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fm.canStartFeature('test-fm006');
    } catch (e) { result = null; }
    assert('FM-006',
      result && typeof result.allowed === 'boolean' && typeof result.reason === 'string',
      'canStartFeature returns {allowed: boolean, reason: string}');
  } else {
    skip('FM-006', 'Module not loaded');
  }
}

// FM-007: canStartFeature includes activeCount
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fm.canStartFeature('test-fm007');
    } catch (e) { result = null; }
    assert('FM-007',
      result && typeof result.activeCount === 'number',
      'canStartFeature returns activeCount');
  } else {
    skip('FM-007', 'Module not loaded');
  }
}

// FM-008: canStartFeature allowed is boolean
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fm.canStartFeature('new-feature-fm008');
    } catch (e) { result = null; }
    assert('FM-008',
      result && (result.allowed === true || result.allowed === false),
      'canStartFeature allowed is strictly boolean');
  } else {
    skip('FM-008', 'Module not loaded');
  }
}

// ============================================================
// Section 3: registerFeature / releaseFeature (FM-009 ~ FM-012)
// ============================================================
console.log('\n--- Section 3: registerFeature / releaseFeature ---');

// FM-009: Module exports registerFeature function
{
  assert('FM-009', fm && typeof fm.registerFeature === 'function',
    'feature-manager exports registerFeature');
}

// FM-010: registerFeature returns object with registered field
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fm.registerFeature('test-fm010');
    } catch (e) { result = null; }
    assert('FM-010',
      result && typeof result.registered === 'boolean',
      'registerFeature returns {registered: boolean}');
    // Cleanup
    try { fm.releaseFeature('test-fm010', 'test cleanup'); } catch (_) {}
  } else {
    skip('FM-010', 'Module not loaded');
  }
}

// FM-011: Module exports releaseFeature function
{
  assert('FM-011', fm && typeof fm.releaseFeature === 'function',
    'feature-manager exports releaseFeature');
}

// FM-012: releaseFeature does not throw for unknown feature
{
  if (moduleLoaded) {
    let threw = false;
    try {
      fm.releaseFeature('unknown-fm012', 'test');
    } catch (e) { threw = true; }
    assert('FM-012', threw === false,
      'releaseFeature does not throw for unknown feature');
  } else {
    skip('FM-012', 'Module not loaded');
  }
}

// ============================================================
// Section 4: checkConflict (FM-013 ~ FM-016)
// ============================================================
console.log('\n--- Section 4: checkConflict ---');

// FM-013: Module exports checkConflict function
{
  assert('FM-013', fm && typeof fm.checkConflict === 'function',
    'feature-manager exports checkConflict');
}

// FM-014: checkConflict returns no conflict for non-Do phases
{
  if (moduleLoaded) {
    const result = fm.checkConflict('test-fm014', 'plan');
    assert('FM-014',
      result && result.conflict === false,
      'checkConflict returns no conflict for non-Do target phase');
  } else {
    skip('FM-014', 'Module not loaded');
  }
}

// FM-015: checkConflict result has expected shape
{
  if (moduleLoaded) {
    const result = fm.checkConflict('test-fm015', 'do');
    assert('FM-015',
      result && typeof result.conflict === 'boolean' && typeof result.reason === 'string',
      'checkConflict returns {conflict, conflictWith, reason}');
  } else {
    skip('FM-015', 'Module not loaded');
  }
}

// FM-016: checkConflict conflictWith is null when no conflict
{
  if (moduleLoaded) {
    const result = fm.checkConflict('test-fm016', 'design');
    assert('FM-016',
      result && result.conflictWith === null,
      'checkConflict conflictWith is null when no conflict');
  } else {
    skip('FM-016', 'Module not loaded');
  }
}

// ============================================================
// Section 5: Dependency Validation & Dashboard (FM-017 ~ FM-020)
// ============================================================
console.log('\n--- Section 5: Dependencies & Dashboard ---');

// FM-017: Module exports validateDependencies function
{
  assert('FM-017', fm && typeof fm.validateDependencies === 'function',
    'feature-manager exports validateDependencies');
}

// FM-018: validateDependencies detects no cycle in simple case
{
  if (moduleLoaded) {
    const result = fm.validateDependencies('feat-a', ['feat-b']);
    assert('FM-018',
      result && result.valid === true && result.cycle.length === 0,
      'validateDependencies returns valid for non-cyclic deps');
  } else {
    skip('FM-018', 'Module not loaded');
  }
}

// FM-019: Module exports getFeatureDashboard function
{
  assert('FM-019', fm && typeof fm.getFeatureDashboard === 'function',
    'feature-manager exports getFeatureDashboard');
}

// FM-020: getFeatureDashboard returns string
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = fm.getFeatureDashboard();
    } catch (e) { result = null; }
    assert('FM-020',
      typeof result === 'string' && result.includes('Feature Dashboard'),
      'getFeatureDashboard returns string with "Feature Dashboard"');
  } else {
    skip('FM-020', 'Module not loaded');
  }
}

// ============================================================
// Summary
// ============================================================
const result = summary('feature-manager.test.js');
module.exports = result;
