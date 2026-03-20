#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for lib/pdca/resume.js
 * 15 TC | createResumePoint, loadResumePoint, resumeSession, clear, list, cleanup
 *
 * @version bkit v1.6.2
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

console.log('\n=== resume.test.js (15 TC) ===\n');

// Load module
let resume;
try {
  resume = require('../../lib/pdca/resume');
} catch (e) {
  resume = null;
}

// Check module loaded
const moduleLoaded = resume !== null;

// ============================================================
// Section 1: createResumePoint (RS-001 ~ RS-004)
// ============================================================
console.log('\n--- Section 1: createResumePoint ---');

// RS-001: Module exports createResumePoint function
{
  assert('RS-001', resume && typeof resume.createResumePoint === 'function',
    'resume module exports createResumePoint');
}

// RS-002: createResumePoint returns object with resumeId and path
{
  if (moduleLoaded) {
    let result = null;
    try {
      result = resume.createResumePoint('test-feat-rs002', { phase: 'do', reason: 'StopFailure' });
    } catch (e) { result = null; }
    assert('RS-002', result && result.resumeId && result.path,
      'createResumePoint returns {resumeId, path}');
    // Cleanup
    try { fs.unlinkSync(result.path); } catch (_) {}
  } else {
    skip('RS-002', 'Module not loaded');
  }
}

// RS-003: Resume file contains correct schema fields
{
  if (moduleLoaded) {
    let data = null;
    try {
      const result = resume.createResumePoint('test-feat-rs003', {
        phase: 'check', reason: 'ContextOverflow', matchRate: 85,
      });
      data = JSON.parse(fs.readFileSync(result.path, 'utf8'));
      // Cleanup
      try { fs.unlinkSync(result.path); } catch (_) {}
    } catch (e) { data = null; }
    assert('RS-003',
      data && data.feature === 'test-feat-rs003' && data.phase === 'check' &&
      data.reason === 'ContextOverflow' && data.isValid === true &&
      data.savedAt && data.expiresAt && data.context,
      'Resume file has correct schema: feature, phase, reason, isValid, savedAt, expiresAt, context');
  } else {
    skip('RS-003', 'Module not loaded');
  }
}

// RS-004: Resume context stores matchRate and iterationCount
{
  if (moduleLoaded) {
    let data = null;
    try {
      const result = resume.createResumePoint('test-feat-rs004', {
        phase: 'do', matchRate: 72, iterationCount: 3,
      });
      data = JSON.parse(fs.readFileSync(result.path, 'utf8'));
      try { fs.unlinkSync(result.path); } catch (_) {}
    } catch (e) { data = null; }
    assert('RS-004',
      data && data.context && data.context.matchRate === 72 && data.context.iterationCount === 3,
      'Resume context stores matchRate and iterationCount');
  } else {
    skip('RS-004', 'Module not loaded');
  }
}

// ============================================================
// Section 2: loadResumePoint (RS-005 ~ RS-007)
// ============================================================
console.log('\n--- Section 2: loadResumePoint ---');

// RS-005: loadResumePoint reads saved data
{
  if (moduleLoaded) {
    let loaded = null;
    try {
      resume.createResumePoint('test-feat-rs005', { phase: 'plan', reason: 'UserAbort' });
      loaded = resume.loadResumePoint('test-feat-rs005');
    } catch (e) { loaded = null; }
    assert('RS-005', loaded && loaded.feature === 'test-feat-rs005' && loaded.phase === 'plan',
      'loadResumePoint reads correct feature and phase');
    try { resume.clearResumePoint('test-feat-rs005'); } catch (_) {}
  } else {
    skip('RS-005', 'Module not loaded');
  }
}

// RS-006: loadResumePoint returns null for non-existent feature
{
  if (moduleLoaded) {
    const loaded = resume.loadResumePoint('nonexistent-feature-rs006');
    assert('RS-006', loaded === null,
      'loadResumePoint returns null for non-existent feature');
  } else {
    skip('RS-006', 'Module not loaded');
  }
}

// RS-007: validateResumeData validates correctly
{
  if (moduleLoaded) {
    const validResult = resume.validateResumeData({
      isValid: true, feature: 'test', phase: 'do',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const invalidResult = resume.validateResumeData(null);
    assert('RS-007',
      validResult && validResult.valid === true &&
      invalidResult && invalidResult.valid === false,
      'validateResumeData validates correctly');
  } else {
    skip('RS-007', 'Module not loaded');
  }
}

// ============================================================
// Section 3: resumeSession (RS-008 ~ RS-010)
// ============================================================
console.log('\n--- Section 3: resumeSession ---');

// RS-008: resumeSession restores phase from saved data
{
  if (moduleLoaded) {
    let restored = null;
    try {
      resume.createResumePoint('test-feat-rs008', { phase: 'design', reason: 'StopFailure' });
      restored = resume.resumeSession('test-feat-rs008');
    } catch (e) { restored = null; }
    assert('RS-008', restored && restored.phase === 'design',
      'resumeSession restores phase from saved data');
    try { resume.clearResumePoint('test-feat-rs008'); } catch (_) {}
  } else {
    skip('RS-008', 'Module not loaded');
  }
}

// RS-009: resumeSession restores context object
{
  if (moduleLoaded) {
    let restored = null;
    try {
      resume.createResumePoint('test-feat-rs009', {
        phase: 'check', matchRate: 55, pendingTasks: ['task-1'],
      });
      restored = resume.resumeSession('test-feat-rs009');
    } catch (e) { restored = null; }
    assert('RS-009',
      restored && restored.context && restored.context.matchRate === 55,
      'resumeSession restores context with matchRate');
    try { resume.clearResumePoint('test-feat-rs009'); } catch (_) {}
  } else {
    skip('RS-009', 'Module not loaded');
  }
}

// RS-010: resumeSession returns null for non-existent feature
{
  if (moduleLoaded) {
    const restored = resume.resumeSession('nonexistent-feat-rs010');
    assert('RS-010', restored === null,
      'resumeSession returns null for non-existent feature');
  } else {
    skip('RS-010', 'Module not loaded');
  }
}

// ============================================================
// Section 4: clearResumePoint (RS-011 ~ RS-012)
// ============================================================
console.log('\n--- Section 4: clearResumePoint ---');

// RS-011: clearResumePoint deletes the file
{
  if (moduleLoaded) {
    let exists = true;
    try {
      const result = resume.createResumePoint('test-feat-rs011', { phase: 'do' });
      resume.clearResumePoint('test-feat-rs011');
      exists = fs.existsSync(result.path);
    } catch (e) { exists = true; }
    assert('RS-011', exists === false,
      'clearResumePoint deletes the resume file');
  } else {
    skip('RS-011', 'Module not loaded');
  }
}

// RS-012: clearResumePoint on non-existent feature does not throw
{
  if (moduleLoaded) {
    let threw = false;
    try {
      resume.clearResumePoint('nonexistent-feature-rs012');
    } catch (e) { threw = true; }
    assert('RS-012', threw === false,
      'clearResumePoint does not throw for non-existent feature');
  } else {
    skip('RS-012', 'Module not loaded');
  }
}

// ============================================================
// Section 5: listResumePoints, cleanupExpired (RS-013 ~ RS-015)
// ============================================================
console.log('\n--- Section 5: listResumePoints & cleanupExpired ---');

// RS-013: listResumePoints returns array
{
  if (moduleLoaded) {
    const list = resume.listResumePoints();
    assert('RS-013', Array.isArray(list),
      'listResumePoints returns an array');
  } else {
    skip('RS-013', 'Module not loaded');
  }
}

// RS-014: listResumePoints includes created resume point
{
  if (moduleLoaded) {
    let found = false;
    try {
      resume.createResumePoint('test-feat-rs014', { phase: 'act', reason: 'Error' });
      const list = resume.listResumePoints();
      found = list.some(r => r.feature === 'test-feat-rs014');
    } catch (e) { found = false; }
    assert('RS-014', found === true,
      'listResumePoints includes recently created resume point');
    try { resume.clearResumePoint('test-feat-rs014'); } catch (_) {}
  } else {
    skip('RS-014', 'Module not loaded');
  }
}

// RS-015: cleanupExpired returns array
{
  if (moduleLoaded) {
    const cleaned = resume.cleanupExpired();
    assert('RS-015', Array.isArray(cleaned),
      'cleanupExpired returns an array');
  } else {
    skip('RS-015', 'Module not loaded');
  }
}

// ============================================================
// Summary
// ============================================================
const result = summary('resume.test.js');
module.exports = result;
