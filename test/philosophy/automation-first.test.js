'use strict';
/**
 * Philosophy Tests: Automation First Principle (15 TC)
 * Tests that bkit auto-detects, auto-suggests, and auto-creates
 * without requiring manual user intervention where possible
 *
 * @module test/philosophy/automation-first.test.js
 */

const { assert, summary } = require('../helpers/assert');

let coordinator;
try {
  coordinator = require('../../lib/team/coordinator');
} catch (e) {
  console.error('coordinator module load failed:', e.message);
  process.exit(1);
}

let trigger;
try {
  trigger = require('../../lib/intent/trigger');
} catch (e) {
  console.error('trigger module load failed:', e.message);
  process.exit(1);
}

let taskCreator;
try {
  taskCreator = require('../../lib/task/creator');
} catch (e) {
  console.error('task/creator module load failed:', e.message);
  process.exit(1);
}

let lang;
try {
  lang = require('../../lib/intent/language');
} catch (e) {
  console.error('language module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== automation-first.test.js ===\n');

// --- PHI-AF-001: suggestTeamMode — 조건 충족 시 자동 제안 ---
process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';
const longMsg = 'a'.repeat(1000);
const suggestion = coordinator.suggestTeamMode(longMsg, { level: 'Dynamic', messageLength: 1000 });
assert('PHI-AF-001',
  suggestion !== null && suggestion.suggest === true,
  'suggestTeamMode auto-suggests for major features (Automation First)'
);

// --- PHI-AF-002: suggestTeamMode — reason 필드로 자동 제안 이유 설명 ---
assert('PHI-AF-002',
  suggestion !== null && typeof suggestion.reason === 'string' && suggestion.reason.length > 0,
  'Auto-suggestion includes reason (transparent automation)'
);

// --- PHI-AF-003: matchImplicitAgentTrigger — 키워드 자동 매칭 ---
const agentResult = trigger.matchImplicitAgentTrigger('verify this implementation');
assert('PHI-AF-003',
  agentResult !== null && agentResult.agent.includes('gap-detector'),
  'Agent trigger auto-matched from "verify" keyword without explicit command'
);

// --- PHI-AF-004: matchImplicitAgentTrigger — confidence 반환 ---
assert('PHI-AF-004',
  agentResult !== null && typeof agentResult.confidence === 'number' && agentResult.confidence > 0,
  'Agent trigger match returns confidence score'
);

// --- PHI-AF-005: matchImplicitSkillTrigger — 스킬 자동 매칭 ---
const skillResult = trigger.matchImplicitSkillTrigger('I need a login page with database');
assert('PHI-AF-005',
  skillResult !== null && skillResult.skill.includes('dynamic'),
  'Skill trigger auto-matched for "login" + "database" → dynamic skill'
);

// --- PHI-AF-006: matchImplicitSkillTrigger — level 반환 ---
assert('PHI-AF-006',
  skillResult !== null && typeof skillResult.level === 'string',
  'Skill trigger match returns project level'
);

// --- PHI-AF-007: detectNewFeatureIntent — 새 기능 의도 자동 감지 ---
const intent = trigger.detectNewFeatureIntent('implement a new user authentication feature');
assert('PHI-AF-007',
  intent.isNewFeature === true,
  'New feature intent auto-detected from "implement" + "new" keywords'
);

// --- PHI-AF-008: autoCreatePdcaTask — 자동 task 생성 ---
const task = taskCreator.autoCreatePdcaTask('test-feature', 'plan');
assert('PHI-AF-008',
  typeof task === 'object' && task.id && task.subject && task.status === 'pending',
  'autoCreatePdcaTask auto-creates task with id, subject, and pending status'
);

// --- PHI-AF-009: autoCreatePdcaTask — phase별 subject 자동 생성 ---
const taskDesign = taskCreator.autoCreatePdcaTask('my-feature', 'design');
assert('PHI-AF-009',
  taskDesign.subject.includes('Design') && taskDesign.subject.includes('my-feature'),
  'autoCreatePdcaTask auto-generates phase-appropriate subject'
);

// --- PHI-AF-010: generatePdcaTaskSubject — 모든 phase에 대해 자동 생성 ---
const phases = ['plan', 'design', 'do', 'check', 'act', 'report'];
const allGenerated = phases.every(phase => {
  const s = taskCreator.generatePdcaTaskSubject(phase, 'feature-x');
  return typeof s === 'string' && s.length > 0;
});
assert('PHI-AF-010',
  allGenerated,
  'generatePdcaTaskSubject auto-generates subject for all 6 PDCA phases'
);

// --- PHI-AF-011: matchMultiLangPattern — 8개 언어 자동 매칭 ---
const gapPatterns = lang.AGENT_TRIGGER_PATTERNS['gap-detector'];
const multiLangMatches = [
  lang.matchMultiLangPattern('verify this', gapPatterns),        // EN
  lang.matchMultiLangPattern('확인해줘', gapPatterns),             // KO
  lang.matchMultiLangPattern('確認して', gapPatterns),             // JA
  lang.matchMultiLangPattern('验证一下', gapPatterns),             // ZH
];
assert('PHI-AF-011',
  multiLangMatches.every(m => m === true),
  'matchMultiLangPattern auto-detects trigger across EN/KO/JA/ZH'
);

// --- PHI-AF-012: Starter 레벨 → Team Mode 자동 차단 ---
const starterSuggestion = coordinator.suggestTeamMode(longMsg, { level: 'Starter', messageLength: 1000 });
assert('PHI-AF-012',
  starterSuggestion === null,
  'Starter level auto-blocked from Team Mode (Automation First safety gate)'
);

// --- PHI-AF-013: matchImplicitAgentTrigger — null 입력 시 null 반환 ---
const nullResult = trigger.matchImplicitAgentTrigger(null);
assert('PHI-AF-013',
  nullResult === null,
  'matchImplicitAgentTrigger returns null for null input (safe auto-detection)'
);

// --- PHI-AF-014: matchImplicitSkillTrigger — null 입력 시 null 반환 ---
const nullSkill = trigger.matchImplicitSkillTrigger(null);
assert('PHI-AF-014',
  nullSkill === null,
  'matchImplicitSkillTrigger returns null for null input (safe auto-detection)'
);

// --- PHI-AF-015: bkit.config.json automationLevel 설정 존재 확인 ---
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../../bkit.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
assert('PHI-AF-015',
  typeof config.pdca.automationLevel === 'string' && config.pdca.automationLevel.length > 0,
  'bkit.config.json defines pdca.automationLevel (automation is configurable)'
);

// 환경 변수 정리
delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;

summary('automation-first.test.js');
process.exit(0);
