'use strict';
/**
 * Unit Tests for lib/audit/decision-tracer.js
 * 15 TC | console.assert based | no external dependencies
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Set up tmp dir and mock platform before requiring module
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-decision-test-'));

const platformPath = require.resolve('../../lib/core/platform');
const origPlatform = require(platformPath);
const mockPlatform = { ...origPlatform, PROJECT_DIR: tmpDir };
require.cache[platformPath] = { id: platformPath, filename: platformPath, loaded: true, exports: mockPlatform };

let mod;
try {
  mod = require('../../lib/audit/decision-tracer');
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

console.log('\n=== decision-tracer.test.js ===\n');

// --- DC-001~005: recordDecision creates JSONL entry ---

mod.recordDecision({
  feature: 'test-feat',
  phase: 'plan',
  decisionType: 'phase_advance',
  question: 'Should we advance to design?',
  chosenOption: 'Yes, proceed',
  rationale: 'All criteria met',
  confidence: 0.9,
  impact: 'medium',
  alternatives: [
    { option: 'Wait', reason: 'More data needed', rejectedBecause: 'Data sufficient' },
  ],
});

const today = new Date().toISOString().slice(0, 10);
const decisionsFilePath = path.join(tmpDir, '.bkit', 'decisions', `${today}.jsonl`);
assert('DC-001', fs.existsSync(decisionsFilePath), 'recordDecision creates JSONL file');

const content = fs.readFileSync(decisionsFilePath, 'utf-8').trim();
const entry = JSON.parse(content);
assert('DC-002', entry.decisionType === 'phase_advance', 'Entry has correct decisionType');
assert('DC-003', entry.feature === 'test-feat', 'Entry has correct feature');
assert('DC-004', entry.confidence === 0.9, 'Entry has correct confidence');
assert('DC-005', Array.isArray(entry.alternatives) && entry.alternatives.length === 1, 'Entry has alternatives');

// --- DC-006~010: 15 DECISION_TYPES all valid ---

assert('DC-006', Array.isArray(mod.DECISION_TYPES), 'DECISION_TYPES is an array');
assert('DC-007', mod.DECISION_TYPES.length === 15, `DECISION_TYPES has 15 entries (got ${mod.DECISION_TYPES.length})`);
assert('DC-008', mod.DECISION_TYPES.includes('phase_advance'), 'Includes phase_advance');
assert('DC-009', mod.DECISION_TYPES.includes('emergency_stop'), 'Includes emergency_stop');
assert('DC-010', mod.DECISION_TYPES.includes('rollback_trigger'), 'Includes rollback_trigger');

// --- DC-011~013: readDecisions with filters ---

mod.recordDecision({
  feature: 'test-feat',
  phase: 'design',
  decisionType: 'architecture_choice',
  chosenOption: 'Microservices',
  confidence: 0.7,
  impact: 'high',
});

mod.recordDecision({
  feature: 'other-feat',
  phase: 'plan',
  decisionType: 'workflow_selection',
  chosenOption: 'PDCA',
  confidence: 0.8,
  impact: 'low',
});

const allDecisions = mod.readDecisions({ date: today });
assert('DC-011', allDecisions.length >= 3, 'readDecisions returns all entries');

const byFeature = mod.readDecisions({ date: today, feature: 'test-feat' });
assert('DC-012', byFeature.length >= 2 && byFeature.every(e => e.feature === 'test-feat'),
  'readDecisions filters by feature');

const byType = mod.readDecisions({ date: today, type: 'architecture_choice' });
assert('DC-013', byType.length >= 1 && byType.every(e => e.decisionType === 'architecture_choice'),
  'readDecisions filters by type');

// --- DC-014~015: getDecisionSummary ---

const summary = mod.getDecisionSummary('test-feat', today);
assert('DC-014', summary.totalDecisions >= 2, 'Summary has correct total decisions');
assert('DC-015', typeof summary.byType === 'object' && typeof summary.avgConfidence === 'number',
  'Summary has byType and avgConfidence');

// --- Cleanup ---
delete require.cache[platformPath];
fs.rmSync(tmpDir, { recursive: true, force: true });

// --- Summary ---
console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
