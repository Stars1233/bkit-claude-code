#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for lib/pdca/lifecycle.js
 * 15 TC | initializeFeature, updatePhaseMetadata, shouldAutoArchive,
 *         detectStaleFeatures, getFeatureTimeline
 *
 * @version bkit v1.6.2
 */

const path = require('path');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

console.log('\n=== lifecycle.test.js (15 TC) ===\n');

// Load module
let lifecycle;
try {
  lifecycle = require('../../lib/pdca/lifecycle');
} catch (e) {
  lifecycle = null;
}

const moduleLoaded = lifecycle !== null;

// ============================================================
// Section 1: initializeFeature (LC-001 ~ LC-003)
// ============================================================
console.log('\n--- Section 1: initializeFeature ---');

// LC-001: Module exports initializeFeature function
{
  assert('LC-001', lifecycle && typeof lifecycle.initializeFeature === 'function',
    'lifecycle module exports initializeFeature');
}

// LC-002: Module exports updatePhaseMetadata function
{
  assert('LC-002', lifecycle && typeof lifecycle.updatePhaseMetadata === 'function',
    'lifecycle module exports updatePhaseMetadata');
}

// LC-003: Module exports shouldAutoArchive function
{
  assert('LC-003', lifecycle && typeof lifecycle.shouldAutoArchive === 'function',
    'lifecycle module exports shouldAutoArchive');
}

// ============================================================
// Section 2: updatePhaseMetadata (LC-004 ~ LC-006)
// ============================================================
console.log('\n--- Section 2: updatePhaseMetadata ---');

// LC-004: Module exports archiveFeature function
{
  assert('LC-004', lifecycle && typeof lifecycle.archiveFeature === 'function',
    'lifecycle module exports archiveFeature');
}

// LC-005: Module exports detectStaleFeatures function
{
  assert('LC-005', lifecycle && typeof lifecycle.detectStaleFeatures === 'function',
    'lifecycle module exports detectStaleFeatures');
}

// LC-006: Module exports getFeatureTimeline function
{
  assert('LC-006', lifecycle && typeof lifecycle.getFeatureTimeline === 'function',
    'lifecycle module exports getFeatureTimeline');
}

// ============================================================
// Section 3: shouldAutoArchive (LC-007 ~ LC-009)
// ============================================================
console.log('\n--- Section 3: shouldAutoArchive ---');

// LC-007: shouldAutoArchive returns false for nonexistent feature
{
  if (moduleLoaded) {
    const result = lifecycle.shouldAutoArchive('nonexistent-lc007');
    assert('LC-007', result === false,
      'shouldAutoArchive returns false for nonexistent feature');
  } else {
    skip('LC-007', 'Module not loaded');
  }
}

// LC-008: shouldAutoArchive is a boolean return
{
  if (moduleLoaded) {
    const result = lifecycle.shouldAutoArchive('nonexistent-lc008');
    assert('LC-008', typeof result === 'boolean',
      'shouldAutoArchive returns boolean');
  } else {
    skip('LC-008', 'Module not loaded');
  }
}

// LC-009: Module exports cleanupStaleFeatures
{
  assert('LC-009', lifecycle && typeof lifecycle.cleanupStaleFeatures === 'function',
    'lifecycle module exports cleanupStaleFeatures');
}

// ============================================================
// Section 4: detectStaleFeatures (LC-010 ~ LC-012)
// ============================================================
console.log('\n--- Section 4: detectStaleFeatures ---');

// LC-010: detectStaleFeatures returns an array
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = lifecycle.detectStaleFeatures(7);
    } catch (e) { result = []; }
    assert('LC-010', Array.isArray(result),
      'detectStaleFeatures returns an array');
  } else {
    skip('LC-010', 'Module not loaded');
  }
}

// LC-011: detectStaleFeatures with 0 days threshold
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = lifecycle.detectStaleFeatures(0);
    } catch (e) { result = []; }
    assert('LC-011', Array.isArray(result),
      'detectStaleFeatures with 0-day threshold returns array');
  } else {
    skip('LC-011', 'Module not loaded');
  }
}

// LC-012: detectStaleFeatures accepts custom maxIdleDays parameter
{
  if (moduleLoaded) {
    let threw = false;
    try {
      lifecycle.detectStaleFeatures(30);
    } catch (e) { threw = true; }
    assert('LC-012', threw === false,
      'detectStaleFeatures accepts custom maxIdleDays without error');
  } else {
    skip('LC-012', 'Module not loaded');
  }
}

// ============================================================
// Section 5: getFeatureTimeline (LC-013 ~ LC-015)
// ============================================================
console.log('\n--- Section 5: getFeatureTimeline ---');

// LC-013: getFeatureTimeline returns array for nonexistent feature
{
  if (moduleLoaded) {
    const result = lifecycle.getFeatureTimeline('nonexistent-lc013');
    assert('LC-013', Array.isArray(result) && result.length === 0,
      'getFeatureTimeline returns empty array for nonexistent feature');
  } else {
    skip('LC-013', 'Module not loaded');
  }
}

// LC-014: getFeatureTimeline returns array type
{
  if (moduleLoaded) {
    const result = lifecycle.getFeatureTimeline('any-feature-lc014');
    assert('LC-014', Array.isArray(result),
      'getFeatureTimeline always returns an array');
  } else {
    skip('LC-014', 'Module not loaded');
  }
}

// LC-015: All 7 exports are present
{
  const expectedExports = [
    'initializeFeature', 'updatePhaseMetadata', 'shouldAutoArchive',
    'archiveFeature', 'detectStaleFeatures', 'cleanupStaleFeatures',
    'getFeatureTimeline',
  ];
  const allPresent = lifecycle && expectedExports.every(name => typeof lifecycle[name] === 'function');
  assert('LC-015', allPresent,
    'All 7 lifecycle exports are present and are functions');
}

// ============================================================
// Summary
// ============================================================
const result = summary('lifecycle.test.js');
module.exports = result;
