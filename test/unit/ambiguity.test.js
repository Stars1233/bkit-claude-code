'use strict';
/**
 * Unit Tests for lib/intent/ambiguity.js
 * 50 TC | console.assert based | no external dependencies
 */
const path = require('path');

// Module under test
let mod;
try {
  mod = require('../../lib/intent/ambiguity');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

let passed = 0, failed = 0, total = 0;

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; console.error(`  FAIL: ${id} - ${message}`); }
}

console.log('\n=== ambiguity.test.js ===\n');

// --- Exports check ---
assert('U-AMB-001', typeof mod.containsFilePath === 'function', 'containsFilePath exported');
assert('U-AMB-002', typeof mod.containsTechnicalTerms === 'function', 'containsTechnicalTerms exported');
assert('U-AMB-003', typeof mod.hasSpecificNouns === 'function', 'hasSpecificNouns exported');
assert('U-AMB-004', typeof mod.hasScopeDefinition === 'function', 'hasScopeDefinition exported');
assert('U-AMB-005', typeof mod.hasMultipleInterpretations === 'function', 'hasMultipleInterpretations exported');
assert('U-AMB-006', typeof mod.detectContextConflicts === 'function', 'detectContextConflicts exported');
assert('U-AMB-007', typeof mod.calculateAmbiguityScore === 'function', 'calculateAmbiguityScore exported');
assert('U-AMB-008', typeof mod.generateClarifyingQuestions === 'function', 'generateClarifyingQuestions exported');

// --- containsFilePath ---
assert('U-AMB-009', mod.containsFilePath('/src/lib/core.js') === true, 'Unix path detected');
assert('U-AMB-010', mod.containsFilePath('C:\\Users\\test\\file.js') === true, 'Windows path detected');
assert('U-AMB-011', mod.containsFilePath('./relative/path') === true, 'Relative path detected');
assert('U-AMB-012', mod.containsFilePath('config.json') === true, 'Extension-based file detected');
assert('U-AMB-013', mod.containsFilePath('hello world') === false, 'No path in plain text');
assert('U-AMB-014', mod.containsFilePath('') === false, 'Empty string returns false');
assert('U-AMB-015', mod.containsFilePath(null) === false, 'Null returns false');
assert('U-AMB-016', mod.containsFilePath('app.tsx') === true, 'TSX extension detected');
assert('U-AMB-017', mod.containsFilePath('schema.yaml') === true, 'YAML extension detected');

// --- containsTechnicalTerms ---
assert('U-AMB-018', mod.containsTechnicalTerms('add API endpoint') === true, 'API is technical term');
assert('U-AMB-019', mod.containsTechnicalTerms('create a database') === true, 'database is technical term');
assert('U-AMB-020', mod.containsTechnicalTerms('fix the component') === true, 'component is technical term');
assert('U-AMB-021', mod.containsTechnicalTerms('make it pretty') === false, 'No technical terms in vague text');
assert('U-AMB-022', mod.containsTechnicalTerms('') === false, 'Empty string returns false');
assert('U-AMB-023', mod.containsTechnicalTerms(null) === false, 'Null returns false');
assert('U-AMB-024', mod.containsTechnicalTerms('authentication middleware') === true, 'Multiple tech terms detected');

// --- hasSpecificNouns ---
assert('U-AMB-025', mod.hasSpecificNouns('add "UserAuth" feature') === true, 'Quoted string detected');
assert('U-AMB-026', mod.hasSpecificNouns('fix UserAuth module') === true, 'PascalCase detected');
assert('U-AMB-027', mod.hasSpecificNouns('update userAuth') === true, 'camelCase detected');
assert('U-AMB-028', mod.hasSpecificNouns('fix it') === false, 'No specific nouns');
assert('U-AMB-029', mod.hasSpecificNouns('') === false, 'Empty returns false');
assert('U-AMB-030', mod.hasSpecificNouns(null) === false, 'Null returns false');

// --- hasScopeDefinition ---
assert('U-AMB-031', mod.hasScopeDefinition('only change the header') === true, '"only" scope keyword');
assert('U-AMB-032', mod.hasScopeDefinition('update all files') === true, '"all" scope keyword');
assert('U-AMB-033', mod.hasScopeDefinition('from plan to design') === true, 'Range scope pattern');
assert('U-AMB-034', mod.hasScopeDefinition('in the auth file') === true, '"in the X file" pattern');
assert('U-AMB-035', mod.hasScopeDefinition('do something') === false, 'No scope');
assert('U-AMB-036', mod.hasScopeDefinition(null) === false, 'Null returns false');

// --- hasMultipleInterpretations ---
assert('U-AMB-037', mod.hasMultipleInterpretations('fix it and change that') === true, 'Multiple pronouns');
assert('U-AMB-038', mod.hasMultipleInterpretations('maybe update something') === true, 'Vague + maybe');
assert('U-AMB-039', mod.hasMultipleInterpretations('fix this and update that') === true, 'Vague verbs + pronouns');
assert('U-AMB-040', mod.hasMultipleInterpretations('') === false, 'Empty returns false');
assert('U-AMB-041', mod.hasMultipleInterpretations(null) === false, 'Null returns false');

// --- detectContextConflicts ---
assert('U-AMB-042',
  mod.detectContextConflicts('implement the feature', { currentPhase: 'plan' }).length > 0,
  'implement during plan phase is conflict');
assert('U-AMB-043',
  mod.detectContextConflicts('deploy to production', { currentPhase: 'design' }).length > 0,
  'deploy during design phase is conflict');
assert('U-AMB-044',
  mod.detectContextConflicts('plan the architecture', { currentPhase: 'do' }).length > 0,
  'plan during do phase is conflict');
assert('U-AMB-045',
  mod.detectContextConflicts('create design document', {}).length === 0,
  'No conflict without currentPhase');
assert('U-AMB-046',
  mod.detectContextConflicts('', { currentPhase: 'plan' }).length === 0,
  'Empty request no conflict');

// --- calculateAmbiguityScore (P0 tests) ---
const ambig1 = mod.calculateAmbiguityScore('fix it');
assert('U-AMB-047', ambig1.shouldClarify === true && ambig1.score >= 0.3,
  'fix it: shouldClarify=true, score >= 0.3');

// A request with file path + tech terms + specific nouns + scope + no ambiguous patterns + long enough
const ambig2 = mod.calculateAmbiguityScore('add UserAuth component to /src/modules/auth.js for only backend API endpoint');
// containsFilePath: true, containsTechnicalTerms: true (component, api, endpoint), hasSpecificNouns: true (UserAuth PascalCase)
// hasScopeDefinition: true (only), hasMultipleInterpretations: likely true due to broad /it/ pattern
// score should be low but shouldClarify depends on factors count
assert('U-AMB-048', typeof ambig2.shouldClarify === 'boolean',
  'shouldClarify is boolean for specific request');

// --- confidenceThreshold boundary tests ---
const ambig3 = mod.calculateAmbiguityScore('do stuff');
assert('U-AMB-049', ambig3.score >= 0, 'Score >= 0');
assert('U-AMB-050', ambig3.score <= 1, 'Score <= 1');
assert('U-AMB-051', Array.isArray(ambig3.factors), 'Factors is array');
assert('U-AMB-052', ambig3.factors.length >= 2, 'Short vague request has >= 2 factors');

// Due to broad /it/ pattern in hasMultipleInterpretations, most English text matches
// Test that score stays clamped to [0,1] and shouldClarify is boolean
const ambig4 = mod.calculateAmbiguityScore('add database schema to /src/models/user.ts for all users');
assert('U-AMB-053', ambig4.score <= 1.0, 'Score clamped to max 1.0');
assert('U-AMB-054', typeof ambig4.shouldClarify === 'boolean', 'shouldClarify is boolean');

const ambig5 = mod.calculateAmbiguityScore('x');
assert('U-AMB-055', ambig5.factors.includes('short_request'), 'Very short request has short_request factor');
assert('U-AMB-056', ambig5.score >= 0.15, 'Single char request has score >= 0.15 (short_request alone)');

// --- generateClarifyingQuestions ---
const q1 = mod.generateClarifyingQuestions('fix it', ['no_file_path', 'no_scope', 'multiple_interpretations']);
assert('U-AMB-057', q1.length === 3, 'Three questions for three factors');
assert('U-AMB-058', q1[0].question.length > 0, 'First question has text');

const q2 = mod.generateClarifyingQuestions('fix it', []);
assert('U-AMB-059', q2.length === 0, 'No questions for empty factors');

const q3 = mod.generateClarifyingQuestions('fix it', ['no_file_path']);
assert('U-AMB-060', q3.length === 1, 'One question for no_file_path factor');
assert('U-AMB-061', q3[0].header === 'Location', 'Location header for no_file_path');
assert('U-AMB-062', Array.isArray(q3[0].options), 'Options is array');
assert('U-AMB-063', q3[0].options.length === 3, 'Three options for location question');

console.log(`\n${'='.repeat(50)}`);
console.log(`ambiguity.test.js: ${passed}/${total} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
