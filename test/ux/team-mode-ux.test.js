'use strict';
/**
 * UX Tests: Team Mode Suggestion UX (10 TC)
 * Tests suggestTeamMode UX — conditions, message quality, level enforcement
 *
 * @module test/ux/team-mode-ux.test.js
 */

const { assert, summary } = require('../helpers/assert');

let coordinator;
try {
  coordinator = require('../../lib/team/coordinator');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== team-mode-ux.test.js ===\n');

// Agent Teams 강제 활성화 (테스트 환경)
const originalEnv = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';

// --- UX-TEAM-001: suggestTeamMode 함수가 export 되어야 함 ---
assert('UX-TEAM-001',
  typeof coordinator.suggestTeamMode === 'function',
  'suggestTeamMode is exported from coordinator'
);

// --- UX-TEAM-002: 1000자 이상 메시지 → 제안 발생 ---
const longMessage = 'a'.repeat(1000);
const result1 = coordinator.suggestTeamMode(longMessage, { level: 'Dynamic', messageLength: 1000 });
assert('UX-TEAM-002',
  result1 !== null && result1.suggest === true,
  'Message length >= 1000 triggers Team Mode suggestion'
);

// --- UX-TEAM-003: 1000자 이상 제안에 reason이 포함되어야 함 ---
assert('UX-TEAM-003',
  result1 !== null && typeof result1.reason === 'string' && result1.reason.length > 0,
  'Team Mode suggestion includes a reason string'
);

// --- UX-TEAM-004: 1000자 이상 제안에 level이 포함되어야 함 ---
assert('UX-TEAM-004',
  result1 !== null && typeof result1.level === 'string',
  'Team Mode suggestion includes project level'
);

// --- UX-TEAM-005: 999자 이하 + CTO 키워드 없음 → 제안 없음 ---
const shortMessage = 'add a button to the UI';
const result2 = coordinator.suggestTeamMode(shortMessage, { level: 'Dynamic', messageLength: shortMessage.length });
assert('UX-TEAM-005',
  result2 === null || result2.suggest === false,
  'Short message without team keywords does not trigger suggestion'
);

// --- UX-TEAM-006: Starter 레벨 → 절대 제안 안 함 ---
const longMessageForStarter = 'a'.repeat(2000);
const result3 = coordinator.suggestTeamMode(longMessageForStarter, { level: 'Starter', messageLength: 2000 });
assert('UX-TEAM-006',
  result3 === null,
  'Starter level never receives Team Mode suggestion (blocked)'
);

// --- UX-TEAM-007: Dynamic 레벨 → 1000자 이상에서 제안 가능 ---
const result4 = coordinator.suggestTeamMode(longMessage, { level: 'Dynamic', messageLength: 1000 });
assert('UX-TEAM-007',
  result4 !== null && result4.suggest === true && result4.level === 'Dynamic',
  'Dynamic level receives Team Mode suggestion for major features'
);

// --- UX-TEAM-008: Enterprise 레벨 → 1000자 이상에서 제안 가능 ---
const result5 = coordinator.suggestTeamMode(longMessage, { level: 'Enterprise', messageLength: 1000 });
assert('UX-TEAM-008',
  result5 !== null && result5.suggest === true,
  'Enterprise level receives Team Mode suggestion for major features'
);

// --- UX-TEAM-009: isTeamModeAvailable 함수 export 확인 ---
assert('UX-TEAM-009',
  typeof coordinator.isTeamModeAvailable === 'function',
  'isTeamModeAvailable is exported'
);

// --- UX-TEAM-010: Agent Teams 비활성화 시 suggestTeamMode → null ---
process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '0';
const result6 = coordinator.suggestTeamMode(longMessage, { level: 'Dynamic', messageLength: 1000 });
assert('UX-TEAM-010',
  result6 === null,
  'suggestTeamMode returns null when Agent Teams env var is not "1"'
);

// 환경 변수 복원
if (originalEnv !== undefined) {
  process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = originalEnv;
} else {
  delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
}

summary('team-mode-ux.test.js');
process.exit(0);
