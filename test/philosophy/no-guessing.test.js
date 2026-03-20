'use strict';
/**
 * Philosophy Tests: No Guessing Principle (20 TC)
 * Tests that bkit never guesses — it asks questions when ambiguous,
 * uses config values (not hardcoded), and uses Code as Source of Record
 *
 * @module test/philosophy/no-guessing.test.js
 */

const fs = require('fs');
const path = require('path');
const { assert, summary } = require('../helpers/assert');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

let ambiguity;
try {
  ambiguity = require('../../lib/intent/ambiguity');
} catch (e) {
  console.error('ambiguity module load failed:', e.message);
  process.exit(1);
}

let trigger;
try {
  trigger = require('../../lib/intent/trigger');
} catch (e) {
  console.error('trigger module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== no-guessing.test.js ===\n');

// --- PHI-NG-001: 모호한 요청 → shouldClarify=true (추측하지 않음) ---
const vague1 = ambiguity.calculateAmbiguityScore('fix it');
assert('PHI-NG-001',
  vague1.shouldClarify === true,
  'Vague "fix it" → shouldClarify=true (system asks, not guesses)'
);

// --- PHI-NG-002: 모호한 요청 → factors로 이유를 설명 ---
assert('PHI-NG-002',
  vague1.factors.length >= 2,
  'Ambiguous request explains why via factors array (not silent)'
);

// --- PHI-NG-003: 명확한 요청 → shouldClarify=false (질문 없음) ---
const clear1 = ambiguity.calculateAmbiguityScore('add JWT validation to lib/auth/middleware.js');
assert('PHI-NG-003',
  clear1.shouldClarify === false,
  'Clear request shouldClarify=false (no unnecessary questions)'
);

// --- PHI-NG-004: calculateAmbiguityScore는 score와 factors를 모두 반환 ---
const result = ambiguity.calculateAmbiguityScore('update something');
assert('PHI-NG-004',
  typeof result.score === 'number' && Array.isArray(result.factors) && typeof result.shouldClarify === 'boolean',
  'calculateAmbiguityScore returns score, factors, and shouldClarify (structured result)'
);

// --- PHI-NG-005: bkit.config.json에 confidenceThreshold가 정의되어 있어야 함 ---
const configPath = path.join(PROJECT_ROOT, 'bkit.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
assert('PHI-NG-005',
  typeof config.triggers.confidenceThreshold === 'number',
  'bkit.config.json defines triggers.confidenceThreshold (not hardcoded)'
);

// --- PHI-NG-006: config의 confidenceThreshold 기본값이 코드 기본값과 일치 ---
// ambiguity.js: getConfig('triggers.confidenceThreshold', 0.7)
// trigger.js: getConfig('triggers.confidenceThreshold', 0.7)
assert('PHI-NG-006',
  config.triggers.confidenceThreshold === 0.7,
  'config.triggers.confidenceThreshold === 0.7 (matches code default)'
);

// --- PHI-NG-007: shouldClarify 기준 = score >= (1 - threshold) AND factors >= 2 ---
// threshold=0.7 → 1-0.7 = 0.3
// short_request(0.15) + no_technical_terms(0.1) + no_specific_nouns(0.15) = 0.4 → shouldClarify=true
const shortVague = ambiguity.calculateAmbiguityScore('do stuff');
assert('PHI-NG-007',
  shortVague.shouldClarify === true,
  '"do stuff" triggers shouldClarify=true by threshold logic'
);

// --- PHI-NG-008: no_file_path factor → generateClarifyingQuestions에서 Location 질문 생성 ---
const questions = ambiguity.generateClarifyingQuestions('fix it', ['no_file_path']);
assert('PHI-NG-008',
  questions.length === 1 && questions[0].header === 'Location',
  'no_file_path factor generates Location question (asks, not assumes location)'
);

// --- PHI-NG-009: multiple_interpretations factor → Clarification 질문 생성 ---
const qMulti = ambiguity.generateClarifyingQuestions('change it', ['multiple_interpretations']);
assert('PHI-NG-009',
  qMulti.length > 0 && qMulti[0].options.length === 4,
  'multiple_interpretations factor generates 4-option clarification question'
);

// --- PHI-NG-010: extractFeatureNameFromRequest — 명확한 이름은 추출 성공 ---
const name1 = trigger.extractFeatureNameFromRequest("implement feature called 'user-auth'");
assert('PHI-NG-010',
  name1 === 'user-auth',
  'Feature name extracted correctly from clear request'
);

// --- PHI-NG-011: extractFeatureNameFromRequest — 이름 없으면 null 반환 (추측 안함) ---
const name2 = trigger.extractFeatureNameFromRequest('do something new');
assert('PHI-NG-011',
  name2 === null,
  'extractFeatureNameFromRequest returns null when name cannot be extracted (no guessing)'
);

// --- PHI-NG-012: detectNewFeatureIntent — 불분명하면 confidence < 0.9 ---
const intent1 = trigger.detectNewFeatureIntent('implement something');
assert('PHI-NG-012',
  intent1.isNewFeature === true && (intent1.featureName === null || intent1.confidence < 0.9),
  'Feature intent without name has confidence < 0.9 (not overconfident)'
);

// --- PHI-NG-013: detectNewFeatureIntent — 이름 있으면 confidence === 0.9 ---
const intent2 = trigger.detectNewFeatureIntent("implement feature called 'user-login'");
assert('PHI-NG-013',
  intent2.isNewFeature === true && intent2.featureName !== null && intent2.confidence === 0.9,
  'Feature intent with explicit name has confidence === 0.9'
);

// --- PHI-NG-014: context conflict 감지 — plan phase에서 implement 요청 ---
const conflicts = ambiguity.detectContextConflicts('implement the feature', { currentPhase: 'plan' });
assert('PHI-NG-014',
  conflicts.length > 0,
  'Context conflict detected: "implement" during plan phase'
);

// --- PHI-NG-015: context conflict 없으면 빈 배열 반환 ---
const noConflicts = ambiguity.detectContextConflicts('update the plan document', {});
assert('PHI-NG-015',
  Array.isArray(noConflicts) && noConflicts.length === 0,
  'No context conflicts returns empty array (not false/null)'
);

// --- PHI-NG-016: 매우 짧은 요청 (1자) → short_request factor 포함 ---
const tiny = ambiguity.calculateAmbiguityScore('x');
assert('PHI-NG-016',
  tiny.factors.includes('short_request'),
  'Single char request includes short_request factor'
);

// --- PHI-NG-017: 파일 경로 포함 시 no_file_path factor 없음 ---
const withPath = ambiguity.calculateAmbiguityScore('update /lib/auth.js');
assert('PHI-NG-017',
  !withPath.factors.includes('no_file_path'),
  'Request with file path does not include no_file_path factor'
);

// --- PHI-NG-018: 기술 용어 포함 시 no_technical_terms factor 없음 ---
const withTech = ambiguity.calculateAmbiguityScore('add authentication middleware');
assert('PHI-NG-018',
  !withTech.factors.includes('no_technical_terms'),
  'Request with technical terms does not include no_technical_terms factor'
);

// --- PHI-NG-019: score는 항상 0-1 범위 내 (clamp 검증) ---
const extremeScores = [
  ambiguity.calculateAmbiguityScore('').score,
  ambiguity.calculateAmbiguityScore('fix it and change that and update this').score,
];
const allClamped = extremeScores.every(s => s >= 0 && s <= 1);
assert('PHI-NG-019',
  allClamped,
  'Ambiguity score is always clamped to [0, 1] range'
);

// --- PHI-NG-020: containsFilePath — 확장자만 있어도 감지 ---
assert('PHI-NG-020',
  ambiguity.containsFilePath('config.json') === true,
  'File extension (.json) alone triggers containsFilePath detection'
);

summary('no-guessing.test.js');
process.exit(0);
