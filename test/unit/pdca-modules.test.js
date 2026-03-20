#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for lib/pdca/ untested modules
 * 30 TC | automation.js, executive-summary.js, tier.js, template-validator.js
 *
 * @version bkit v2.0.0
 */

const path = require('path');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

console.log('\n=== pdca-modules.test.js (30 TC) ===\n');

// Load modules
let automation, executiveSummary, tier, templateValidator;

try {
  automation = require('../../lib/pdca/automation');
} catch (e) {
  automation = null;
}

try {
  executiveSummary = require('../../lib/pdca/executive-summary');
} catch (e) {
  executiveSummary = null;
}

try {
  tier = require('../../lib/pdca/tier');
} catch (e) {
  tier = null;
}

try {
  templateValidator = require('../../lib/pdca/template-validator');
} catch (e) {
  templateValidator = null;
}

const autoLoaded = automation !== null;
const esLoaded = executiveSummary !== null;
const tierLoaded = tier !== null;
const tvLoaded = templateValidator !== null;

// ============================================================
// Section 1: automation.js exports (PM-001 ~ PM-008)
// ============================================================
console.log('\n--- Section 1: automation.js ---');

// PM-001: Module exports emitUserPrompt function
{
  assert('PM-001', autoLoaded && typeof automation.emitUserPrompt === 'function',
    'automation exports emitUserPrompt');
}

// PM-002: Module exports formatAskUserQuestion function
{
  assert('PM-002', autoLoaded && typeof automation.formatAskUserQuestion === 'function',
    'automation exports formatAskUserQuestion');
}

// PM-003: Module exports detectPdcaFromTaskSubject function
{
  assert('PM-003', autoLoaded && typeof automation.detectPdcaFromTaskSubject === 'function',
    'automation exports detectPdcaFromTaskSubject');
}

// PM-004: emitUserPrompt returns string
{
  if (autoLoaded) {
    const result = automation.emitUserPrompt({ message: 'hello' });
    assert('PM-004', typeof result === 'string' && result.includes('hello'),
      'emitUserPrompt returns string containing message');
  } else {
    skip('PM-004', 'Module not loaded');
  }
}

// PM-005: emitUserPrompt with feature and phase
{
  if (autoLoaded) {
    const result = automation.emitUserPrompt({ feature: 'test-feat', phase: 'plan' });
    assert('PM-005', result.includes('test-feat') && result.includes('plan'),
      'emitUserPrompt includes feature and phase');
  } else {
    skip('PM-005', 'Module not loaded');
  }
}

// PM-006: emitUserPrompt with suggestions
{
  if (autoLoaded) {
    const result = automation.emitUserPrompt({ suggestions: ['Do X', 'Do Y'] });
    assert('PM-006', result.includes('Do X') && result.includes('Do Y'),
      'emitUserPrompt includes suggestions');
  } else {
    skip('PM-006', 'Module not loaded');
  }
}

// PM-007: detectPdcaFromTaskSubject parses [Plan] subject
{
  if (autoLoaded) {
    const result = automation.detectPdcaFromTaskSubject('[Plan] my-feature');
    assert('PM-007', result && result.phase === 'plan' && result.feature === 'my-feature',
      'detectPdcaFromTaskSubject parses [Plan] subject');
  } else {
    skip('PM-007', 'Module not loaded');
  }
}

// PM-008: detectPdcaFromTaskSubject returns null for invalid
{
  if (autoLoaded) {
    const result = automation.detectPdcaFromTaskSubject('random text');
    assert('PM-008', result === null,
      'detectPdcaFromTaskSubject returns null for non-PDCA subject');
  } else {
    skip('PM-008', 'Module not loaded');
  }
}

// ============================================================
// Section 2: automation.js formatAskUserQuestion (PM-009 ~ PM-013)
// ============================================================
console.log('\n--- Section 2: automation.js formatAskUserQuestion ---');

// PM-009: formatAskUserQuestion returns object with questions array
{
  if (autoLoaded) {
    const result = automation.formatAskUserQuestion({ question: 'Test?' });
    assert('PM-009', result && Array.isArray(result.questions) && result.questions.length === 1,
      'formatAskUserQuestion returns object with questions array');
  } else {
    skip('PM-009', 'Module not loaded');
  }
}

// PM-010: formatAskUserQuestion default options
{
  if (autoLoaded) {
    const result = automation.formatAskUserQuestion({});
    const opts = result.questions[0].options;
    assert('PM-010', opts.length === 2 && opts[0].label === 'Continue',
      'formatAskUserQuestion provides default options');
  } else {
    skip('PM-010', 'Module not loaded');
  }
}

// PM-011: formatAskUserQuestion custom options with preview
{
  if (autoLoaded) {
    const result = automation.formatAskUserQuestion({
      options: [{ label: 'Go', description: 'desc', preview: '## Preview' }]
    });
    assert('PM-011', result.questions[0].options[0].preview === '## Preview',
      'formatAskUserQuestion preserves preview field');
  } else {
    skip('PM-011', 'Module not loaded');
  }
}

// PM-012: buildNextActionQuestion returns valid structure for plan phase
{
  if (autoLoaded) {
    const result = automation.buildNextActionQuestion('plan', 'test-feat');
    assert('PM-012', result && result.question && Array.isArray(result.options) && result.options.length >= 2,
      'buildNextActionQuestion returns valid structure for plan phase');
  } else {
    skip('PM-012', 'Module not loaded');
  }
}

// PM-013: buildNextActionQuestion handles report phase with matchRate
{
  if (autoLoaded) {
    const result = automation.buildNextActionQuestion('report', 'feat', { matchRate: 95 });
    assert('PM-013', result.question.includes('95%'),
      'buildNextActionQuestion report phase includes matchRate');
  } else {
    skip('PM-013', 'Module not loaded');
  }
}

// ============================================================
// Section 3: automation.js generateBatchTrigger (PM-014 ~ PM-016)
// ============================================================
console.log('\n--- Section 3: automation.js generateBatchTrigger ---');

// PM-014: generateBatchTrigger returns null for single feature
{
  if (autoLoaded) {
    const result = automation.generateBatchTrigger(['one'], 'plan');
    assert('PM-014', result === null,
      'generateBatchTrigger returns null for single feature');
  } else {
    skip('PM-014', 'Module not loaded');
  }
}

// PM-015: generateBatchTrigger returns batch object for 2+ features
{
  if (autoLoaded) {
    const result = automation.generateBatchTrigger(['a', 'b'], 'plan');
    assert('PM-015', result && result.type === 'batch' && result.commands.length === 2,
      'generateBatchTrigger returns batch object for 2+ features');
  } else {
    skip('PM-015', 'Module not loaded');
  }
}

// PM-016: detectPdcaFromTaskSubject parses [Do] and [Act-1]
{
  if (autoLoaded) {
    const r1 = automation.detectPdcaFromTaskSubject('[Do] feat-x');
    const r2 = automation.detectPdcaFromTaskSubject('[Act-1] feat-y');
    assert('PM-016', r1 && r1.phase === 'do' && r2 && r2.phase === 'act',
      'detectPdcaFromTaskSubject parses [Do] and [Act-N] subjects');
  } else {
    skip('PM-016', 'Module not loaded');
  }
}

// ============================================================
// Section 4: executive-summary.js (PM-017 ~ PM-021)
// ============================================================
console.log('\n--- Section 4: executive-summary.js ---');

// PM-017: Module exports generateExecutiveSummary
{
  assert('PM-017', esLoaded && typeof executiveSummary.generateExecutiveSummary === 'function',
    'executive-summary exports generateExecutiveSummary');
}

// PM-018: Module exports formatExecutiveSummary
{
  assert('PM-018', esLoaded && typeof executiveSummary.formatExecutiveSummary === 'function',
    'executive-summary exports formatExecutiveSummary');
}

// PM-019: Module exports generateBatchSummary
{
  assert('PM-019', esLoaded && typeof executiveSummary.generateBatchSummary === 'function',
    'executive-summary exports generateBatchSummary');
}

// PM-020: formatExecutiveSummary returns empty string for null
{
  if (esLoaded) {
    const result = executiveSummary.formatExecutiveSummary(null);
    assert('PM-020', result === '',
      'formatExecutiveSummary returns empty string for null input');
  } else {
    skip('PM-020', 'Module not loaded');
  }
}

// PM-021: generateBatchSummary returns null for empty array
{
  if (esLoaded) {
    const result = executiveSummary.generateBatchSummary([]);
    assert('PM-021', result === null,
      'generateBatchSummary returns null for empty array');
  } else {
    skip('PM-021', 'Module not loaded');
  }
}

// ============================================================
// Section 5: tier.js (PM-022 ~ PM-026)
// ============================================================
console.log('\n--- Section 5: tier.js ---');

// PM-022: getLanguageTier returns tier for .js file
{
  if (tierLoaded) {
    const result = tier.getLanguageTier('app.js');
    assert('PM-022', ['1', '2', '3', '4', 'experimental'].includes(result),
      'getLanguageTier returns valid tier for .js file');
  } else {
    skip('PM-022', 'Module not loaded');
  }
}

// PM-023: getLanguageTier returns unknown for extensionless file
{
  if (tierLoaded) {
    const result = tier.getLanguageTier('Makefile');
    assert('PM-023', result === 'unknown',
      'getLanguageTier returns unknown for extensionless file');
  } else {
    skip('PM-023', 'Module not loaded');
  }
}

// PM-024: getTierDescription returns string for tier 1
{
  if (tierLoaded) {
    const result = tier.getTierDescription('1');
    assert('PM-024', typeof result === 'string' && result.length > 0,
      'getTierDescription returns non-empty string for tier 1');
  } else {
    skip('PM-024', 'Module not loaded');
  }
}

// PM-025: isTier1 convenience function works
{
  if (tierLoaded) {
    const result = typeof tier.isTier1 === 'function';
    assert('PM-025', result,
      'isTier1 convenience function exists');
  } else {
    skip('PM-025', 'Module not loaded');
  }
}

// PM-026: getTierPdcaGuidance returns guidance for known tier
{
  if (tierLoaded) {
    const result = tier.getTierPdcaGuidance('2');
    assert('PM-026', typeof result === 'string' && result.includes('Tier 2'),
      'getTierPdcaGuidance returns tier-specific guidance');
  } else {
    skip('PM-026', 'Module not loaded');
  }
}

// ============================================================
// Section 6: template-validator.js (PM-027 ~ PM-030)
// ============================================================
console.log('\n--- Section 6: template-validator.js ---');

// PM-027: detectDocumentType identifies plan document
{
  if (tvLoaded) {
    const result = templateValidator.detectDocumentType('docs/01-plan/features/my-feat.plan.md');
    assert('PM-027', result === 'plan',
      'detectDocumentType identifies plan document');
  } else {
    skip('PM-027', 'Module not loaded');
  }
}

// PM-028: extractSections extracts ## headers
{
  if (tvLoaded) {
    const content = '## Overview\ntext\n## Requirements\nmore text\n## 1.2 Scope\nscoped';
    const result = templateValidator.extractSections(content);
    assert('PM-028', Array.isArray(result) && result.length === 3 && result.includes('Overview'),
      'extractSections extracts ## headers correctly');
  } else {
    skip('PM-028', 'Module not loaded');
  }
}

// PM-029: isPlanPlus detects plan-plus content
{
  if (tvLoaded) {
    assert('PM-029',
      templateValidator.isPlanPlus('This is a Plan-Plus document') === true &&
      templateValidator.isPlanPlus('This is a regular plan') === false,
      'isPlanPlus correctly detects plan-plus content');
  } else {
    skip('PM-029', 'Module not loaded');
  }
}

// PM-030: formatValidationWarning returns null for valid result
{
  if (tvLoaded) {
    const result = templateValidator.formatValidationWarning({ valid: true, missing: [], type: 'plan' });
    assert('PM-030', result === null,
      'formatValidationWarning returns null for valid document');
  } else {
    skip('PM-030', 'Module not loaded');
  }
}

// ============================================================
// Summary
// ============================================================
const result = summary('pdca-modules.test.js');
module.exports = result;
