'use strict';
/**
 * Unit Tests for lib/audit/explanation-generator.js
 * 10 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/audit/explanation-generator');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

let passed = 0, failed = 0, total = 0, skipped = 0;
const failures = [];

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; failures.push({ id, message }); console.error(`  FAIL: ${id} - ${message}`); }
}

console.log('\n=== explanation-gen.test.js ===\n');

// Sample trace for testing
const sampleTrace = {
  id: 'test-trace-001',
  timestamp: '2026-03-20T10:00:00.000Z',
  sessionId: 'sess-123',
  feature: 'my-feature',
  phase: 'design',
  automationLevel: 2,
  decisionType: 'architecture_choice',
  question: 'Which pattern to use?',
  chosenOption: 'Repository pattern',
  rationale: 'Better separation of concerns',
  confidence: 0.85,
  impact: 'high',
  reversible: true,
  outcome: 'positive',
  alternatives: [
    { option: 'Active Record', reason: 'Simpler', rejectedBecause: 'Less testable' },
    { option: 'CQRS', reason: 'Scalable', rejectedBecause: 'Overkill for scope' },
  ],
  affectedFiles: ['src/repo.js', 'src/service.js'],
};

// --- EG-001~003: generateExplanation at different levels ---

const brief = mod.generateExplanation(sampleTrace, 'brief');
assert('EG-001', typeof brief === 'string' && brief.includes('architecture choice') && brief.includes('85%'),
  'Brief explanation is single sentence with type and confidence');

const normal = mod.generateExplanation(sampleTrace, 'normal');
assert('EG-002', normal.includes('Decision:') && normal.includes('Rationale:') && normal.includes('Chosen:'),
  'Normal explanation has Decision, Chosen, and Rationale');

const detailed = mod.generateExplanation(sampleTrace, 'detailed');
assert('EG-003', detailed.includes('=== Decision Trace') && detailed.includes('Alternatives considered') &&
  detailed.includes('Affected files') && detailed.includes('Active Record'),
  'Detailed explanation includes trace header, alternatives, and affected files');

// --- EG-004~006: formatDecisionForDisplay ---

const display1 = mod.formatDecisionForDisplay(sampleTrace);
assert('EG-004', typeof display1 === 'string' && display1.includes('10:00:00'),
  'formatDecisionForDisplay includes time');
assert('EG-005', display1.includes('[HIGH]') && display1.includes('Repository pattern'),
  'Display includes impact level and chosen option');

const irreversibleTrace = { ...sampleTrace, reversible: false };
const display2 = mod.formatDecisionForDisplay(irreversibleTrace);
assert('EG-006', display2.includes('[IRREVERSIBLE]'),
  'Irreversible trace shows IRREVERSIBLE tag');

// --- EG-007~010: summarizeDecisionHistory ---

const trace2 = {
  ...sampleTrace,
  id: 'test-trace-002',
  phase: 'plan',
  decisionType: 'workflow_selection',
  chosenOption: 'PDCA',
  confidence: 0.7,
  impact: 'low',
  reversible: true,
};

const trace3 = {
  ...sampleTrace,
  id: 'test-trace-003',
  phase: 'design',
  decisionType: 'file_generation',
  chosenOption: 'Generate schema',
  confidence: 0.6,
  impact: 'critical',
  reversible: false,
};

const summary = mod.summarizeDecisionHistory([sampleTrace, trace2, trace3]);
assert('EG-007', summary.includes('Decision History: 3 decision(s)'), 'Summary header shows count');
assert('EG-008', summary.includes('[DESIGN]') && summary.includes('[PLAN]'), 'Summary groups by phase');
assert('EG-009', summary.includes('Avg confidence:'), 'Summary includes avg confidence');
assert('EG-010', summary.includes('High/Critical impact: 2/3'), 'Summary counts high/critical impact');

// --- Summary ---
console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
