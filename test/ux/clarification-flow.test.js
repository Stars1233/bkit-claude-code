'use strict';
/**
 * UX Tests: Clarification Flow (15 TC)
 * Tests ambiguity detection UX — question generation quality & user experience
 *
 * @module test/ux/clarification-flow.test.js
 */

const { assert, summary } = require('../helpers/assert');

let ambiguity;
try {
  ambiguity = require('../../lib/intent/ambiguity');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== clarification-flow.test.js ===\n');

// --- UX-CLF-001: shouldClarify=true 시 질문이 생성되어야 함 ---
const vague = ambiguity.calculateAmbiguityScore('fix it');
assert('UX-CLF-001',
  vague.shouldClarify === true,
  'shouldClarify=true for highly vague request "fix it"'
);

// --- UX-CLF-002: shouldClarify=true 결과에 factors 배열이 포함되어야 함 ---
assert('UX-CLF-002',
  Array.isArray(vague.factors) && vague.factors.length >= 2,
  'Ambiguous request returns factors array with >= 2 items'
);

// --- UX-CLF-003: 명확한 요청은 shouldClarify=false ---
const clear = ambiguity.calculateAmbiguityScore('add authentication middleware to lib/auth.js');
assert('UX-CLF-003',
  clear.shouldClarify === false,
  'Clear specific request shouldClarify=false'
);

// --- UX-CLF-004: no_file_path factor → Location 질문 생성 ---
const q1 = ambiguity.generateClarifyingQuestions('fix it', ['no_file_path']);
assert('UX-CLF-004',
  q1.length === 1 && q1[0].header === 'Location',
  'no_file_path factor generates Location question'
);

// --- UX-CLF-005: Location 질문은 3개 선택지를 포함해야 함 ---
assert('UX-CLF-005',
  q1.length > 0 && Array.isArray(q1[0].options) && q1[0].options.length === 3,
  'Location question has exactly 3 options'
);

// --- UX-CLF-006: no_scope factor → Scope 질문 생성 ---
const q2 = ambiguity.generateClarifyingQuestions('do something', ['no_scope']);
assert('UX-CLF-006',
  q2.length === 1 && q2[0].header === 'Scope',
  'no_scope factor generates Scope question'
);

// --- UX-CLF-007: multiple_interpretations factor → Clarification 질문 생성 ---
const q3 = ambiguity.generateClarifyingQuestions('fix this', ['multiple_interpretations']);
assert('UX-CLF-007',
  q3.length === 1 && q3[0].header === 'Clarification',
  'multiple_interpretations factor generates Clarification question'
);

// --- UX-CLF-008: Clarification 질문은 4개 선택지 포함 (Add/Modify/Fix/Refactor) ---
assert('UX-CLF-008',
  q3.length > 0 && Array.isArray(q3[0].options) && q3[0].options.length === 4,
  'Clarification question has 4 action-oriented options'
);

// --- UX-CLF-009: 3개 factor → 3개 질문 생성 ---
const q4 = ambiguity.generateClarifyingQuestions('fix it', ['no_file_path', 'no_scope', 'multiple_interpretations']);
assert('UX-CLF-009',
  q4.length === 3,
  'Three factors produce three distinct questions'
);

// --- UX-CLF-010: 빈 factors → 질문 없음 (불필요한 interruption 방지) ---
const q5 = ambiguity.generateClarifyingQuestions('clear request', []);
assert('UX-CLF-010',
  q5.length === 0,
  'Empty factors produce no questions (no unnecessary interruption)'
);

// --- UX-CLF-011: 각 질문은 question 텍스트가 비어있지 않아야 함 ---
const q6 = ambiguity.generateClarifyingQuestions('vague', ['no_file_path', 'no_scope', 'multiple_interpretations']);
const allHaveQuestionText = q6.every(q => typeof q.question === 'string' && q.question.length > 5);
assert('UX-CLF-011',
  allHaveQuestionText,
  'All generated questions have non-empty question text (>5 chars)'
);

// --- UX-CLF-012: 각 선택지는 label과 description 포함 ---
const firstQuestion = q4[0];
const optionsHaveLabels = firstQuestion.options.every(o => o.label && o.description);
assert('UX-CLF-012',
  optionsHaveLabels,
  'Each option has both label and description for user clarity'
);

// --- UX-CLF-013: multiSelect는 boolean 타입이어야 함 ---
assert('UX-CLF-013',
  typeof firstQuestion.multiSelect === 'boolean',
  'multiSelect field is boolean type'
);

// --- UX-CLF-014: 점수 범위는 0-1 이어야 함 ---
const scores = [
  ambiguity.calculateAmbiguityScore('x').score,
  ambiguity.calculateAmbiguityScore('update all authentication middleware').score,
  ambiguity.calculateAmbiguityScore('fix it maybe or change that or something').score,
];
const allInRange = scores.every(s => s >= 0 && s <= 1);
assert('UX-CLF-014',
  allInRange,
  'Ambiguity score always stays within [0, 1] range'
);

// --- UX-CLF-015: context conflict가 있으면 score가 높아짐 ---
const noConflict = ambiguity.calculateAmbiguityScore('create a plan', {});
const withConflict = ambiguity.calculateAmbiguityScore('implement the feature', { currentPhase: 'plan' });
assert('UX-CLF-015',
  withConflict.score >= noConflict.score,
  'Context conflict increases ambiguity score'
);

summary('clarification-flow.test.js');
process.exit(0);
