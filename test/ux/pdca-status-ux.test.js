'use strict';
/**
 * UX Tests: PDCA Status Display UX (10 TC)
 * Tests Team Status formatting, Phase display, and status output quality
 *
 * @module test/ux/pdca-status-ux.test.js
 */

const { assert, summary } = require('../helpers/assert');

let coordinator;
try {
  coordinator = require('../../lib/team/coordinator');
} catch (e) {
  console.error('coordinator module load failed:', e.message);
  process.exit(1);
}

let taskCreator;
try {
  taskCreator = require('../../lib/task/creator');
} catch (e) {
  console.error('task/creator module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== pdca-status-ux.test.js ===\n');

// --- UX-STATUS-001: formatTeamStatus 함수가 export 되어야 함 ---
assert('UX-STATUS-001',
  typeof coordinator.formatTeamStatus === 'function',
  'formatTeamStatus is exported from coordinator'
);

// --- UX-STATUS-002: formatTeamStatus 결과는 문자열이어야 함 ---
const statusOutput = coordinator.formatTeamStatus({}, {});
assert('UX-STATUS-002',
  typeof statusOutput === 'string',
  'formatTeamStatus returns a string'
);

// --- UX-STATUS-003: Team Status에 Available 정보 포함 ---
assert('UX-STATUS-003',
  statusOutput.includes('Available'),
  'Team status output includes Available field'
);

// --- UX-STATUS-004: Team Status에 Enabled 정보 포함 ---
assert('UX-STATUS-004',
  statusOutput.includes('Enabled'),
  'Team status output includes Enabled field'
);

// --- UX-STATUS-005: Team Status에 Display Mode 정보 포함 ---
assert('UX-STATUS-005',
  statusOutput.includes('Display Mode') || statusOutput.includes('displayMode'),
  'Team status output includes Display Mode field'
);

// --- UX-STATUS-006: PDCA feature 정보가 있으면 표시됨 ---
const pdcaStatus = { primaryFeature: 'user-auth', features: { 'user-auth': { phase: 'design', matchRate: 75 } } };
const statusWithFeature = coordinator.formatTeamStatus({}, pdcaStatus);
assert('UX-STATUS-006',
  statusWithFeature.includes('user-auth'),
  'Team status shows PDCA feature name when available'
);

// --- UX-STATUS-007: matchRate가 있으면 표시됨 ---
assert('UX-STATUS-007',
  statusWithFeature.includes('75'),
  'Team status shows match rate when available'
);

// --- UX-STATUS-008: generatePdcaTaskSubject는 phase와 feature를 포함해야 함 ---
const subject = taskCreator.generatePdcaTaskSubject('plan', 'user-auth');
assert('UX-STATUS-008',
  subject.includes('Plan') && subject.includes('user-auth'),
  'Task subject includes capitalized phase and feature name'
);

// --- UX-STATUS-009: generatePdcaTaskDescription은 의미 있는 설명을 포함해야 함 ---
const desc = taskCreator.generatePdcaTaskDescription('design', 'user-auth');
assert('UX-STATUS-009',
  typeof desc === 'string' && desc.length > 10 && desc.includes('user-auth'),
  'Task description is meaningful and includes feature name'
);

// --- UX-STATUS-010: generateTaskGuidance는 blockedBy 정보를 포함해야 함 ---
const guidance = taskCreator.generateTaskGuidance('design', 'user-auth', 'plan');
assert('UX-STATUS-010',
  guidance.includes('plan') || guidance.includes('Blocked'),
  'Task guidance includes blockedBy information when provided'
);

summary('pdca-status-ux.test.js');
process.exit(0);
