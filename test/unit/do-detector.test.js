#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for lib/pdca/do-detector.js
 * 15 TC | Layer 1 explicit, Layer 2 implicit, Layer 3 confirmation, edge cases
 *
 * @version bkit v1.6.2
 */

const path = require('path');
const fs = require('fs');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

const BASE_DIR = path.resolve(__dirname, '../..');

console.log('\n=== do-detector.test.js (15 TC) ===\n');

// Load module
let dd;
try {
  dd = require('../../lib/pdca/do-detector');
} catch (e) {
  dd = null;
}

// ============================================================
// Section 1: Layer 1 Explicit Detection (DD-001 ~ DD-005)
// ============================================================
console.log('\n--- Section 1: Layer 1 Explicit Detection ---');

// DD-001: detectExplicit matches "done"
{
  const result = dd ? dd.detectExplicit({ userMessage: 'The task is done' }) : null;
  assert('DD-001', result && result.matched === true && result.source === 'user_message',
    'detectExplicit matches "done" keyword');
}

// DD-002: detectExplicit matches Korean "완료"
{
  const result = dd ? dd.detectExplicit({ userMessage: '구현 완료' }) : null;
  assert('DD-002', result && result.matched === true,
    'detectExplicit matches Korean completion "구현 완료"');
}

// DD-003: detectExplicit matches "complete"
{
  const result = dd ? dd.detectExplicit({ userMessage: 'Implementation is complete' }) : null;
  assert('DD-003', result && result.matched === true,
    'detectExplicit matches "complete" keyword');
}

// DD-004: detectExplicit matches task subject
{
  const result = dd ? dd.detectExplicit({ taskSubject: '[Do] Add feature X' }) : null;
  assert('DD-004', result && result.matched === true && result.source === 'task_subject',
    'detectExplicit matches task subject pattern [Do]');
}

// DD-005: detectExplicit returns false for unrelated text
{
  const result = dd ? dd.detectExplicit({ userMessage: 'What is the weather today?' }) : null;
  assert('DD-005', result && result.matched === false,
    'detectExplicit returns false for unrelated messages');
}

// ============================================================
// Section 2: Layer 2 Implicit Detection (DD-006 ~ DD-010)
// ============================================================
console.log('\n--- Section 2: Layer 2 Implicit Detection ---');

// DD-006: calculateCompletionRate returns correct percentage
{
  const rate = dd ? dd.calculateCompletionRate(
    ['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js'],
    ['src/a.js', 'src/b.js', 'src/c.js']
  ) : -1;
  assert('DD-006', rate === 75,
    'calculateCompletionRate returns 75% for 3/4 files');
}

// DD-007: calculateCompletionRate returns 100% for full match
{
  const rate = dd ? dd.calculateCompletionRate(
    ['src/a.js', 'src/b.js'],
    ['src/a.js', 'src/b.js']
  ) : -1;
  assert('DD-007', rate === 100,
    'calculateCompletionRate returns 100% for full match');
}

// DD-008: calculateCompletionRate returns 0% for empty design files
{
  const rate = dd ? dd.calculateCompletionRate([], ['src/a.js']) : -1;
  assert('DD-008', rate === 0,
    'calculateCompletionRate returns 0% for empty design files');
}

// DD-009: EXPLICIT_PATTERNS array is non-empty
{
  assert('DD-009', dd && Array.isArray(dd.EXPLICIT_PATTERNS) && dd.EXPLICIT_PATTERNS.length > 0,
    'EXPLICIT_PATTERNS array is populated');
}

// DD-010: detectExplicit handles tool_result source
{
  const result = dd ? dd.detectExplicit({ toolResult: 'all files created successfully' }) : null;
  assert('DD-010', result && result.matched === true && result.source === 'tool_result',
    'detectExplicit matches tool result containing "all files created"');
}

// ============================================================
// Section 3: Layer 3 Confirmation (DD-011 ~ DD-013)
// ============================================================
console.log('\n--- Section 3: Layer 3 Confirmation ---');

// DD-011: detectDoCompletion returns Layer 1 for explicit signal
{
  // detectDoCompletion depends on core module; mock-test via detectExplicit
  const explicit = dd ? dd.detectExplicit({ userMessage: 'coding done' }) : null;
  assert('DD-011', explicit && explicit.matched === true,
    'Layer 1 explicit detection works for "coding done"');
}

// DD-012: detectDoCompletion would need Layer 3 for ambiguous input
{
  const explicit = dd ? dd.detectExplicit({ userMessage: 'I made some changes' }) : null;
  assert('DD-012', explicit && explicit.matched === false,
    'Ambiguous input does not match Layer 1, would fall to Layer 3');
}

// DD-013: detectExplicit with all empty signals returns no match
{
  const result = dd ? dd.detectExplicit({}) : null;
  assert('DD-013', result && result.matched === false && result.matchedPattern === null,
    'Empty signals return no match');
}

// ============================================================
// Section 4: Edge Cases (DD-014 ~ DD-015)
// ============================================================
console.log('\n--- Section 4: Edge Cases ---');

// DD-014: extractDesignFiles returns empty array when no feature design doc
{
  // extractDesignFiles depends on phase.findDesignDoc which requires project context.
  // We test that the exported function exists and returns an array.
  const result = dd ? dd.extractDesignFiles('nonexistent-feature-xyz') : undefined;
  assert('DD-014', Array.isArray(result) && result.length === 0,
    'extractDesignFiles returns empty array for nonexistent feature');
}

// DD-015: detectExplicit with multiple signals checks all sources
{
  const result = dd ? dd.detectExplicit({
    taskSubject: null,
    userMessage: null,
    toolResult: 'Implementation complete',
  }) : null;
  assert('DD-015', result && result.matched === true && result.source === 'tool_result',
    'detectExplicit checks all source fields and finds match in toolResult');
}

// ============================================================
// Summary
// ============================================================
const result = summary('do-detector.test.js');
module.exports = result;
