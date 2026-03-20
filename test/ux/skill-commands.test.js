'use strict';
/**
 * UX Tests: Skill Command Documentation (15 TC)
 * Tests /control, /audit, /rollback, /pdca-batch SKILL.md completeness.
 *
 * @module test/ux/skill-commands.test.js
 */

const fs = require('fs');
const path = require('path');
const { assert, summary } = require('../helpers/assert');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SKILLS_DIR = path.join(PROJECT_ROOT, 'skills');

console.log('\n=== skill-commands.test.js ===\n');

// =====================================================================
// SC-001~005: /control SKILL.md has all action docs
// =====================================================================

const controlSkill = fs.readFileSync(path.join(SKILLS_DIR, 'control', 'SKILL.md'), 'utf-8');

// --- SC-001: /control SKILL.md has status action ---
assert('SC-001',
  controlSkill.includes('`status`') && controlSkill.includes('Show automation level'),
  '/control SKILL.md documents the "status" action'
);

// --- SC-002: /control SKILL.md has level action ---
assert('SC-002',
  controlSkill.includes('level') && (controlSkill.includes('0-4') || controlSkill.includes('L0')),
  '/control SKILL.md documents the "level" action with L0-L4 range'
);

// --- SC-003: /control SKILL.md has pause action ---
assert('SC-003',
  controlSkill.includes('pause') && controlSkill.includes('Pause'),
  '/control SKILL.md documents the "pause" action'
);

// --- SC-004: /control SKILL.md has resume action ---
assert('SC-004',
  controlSkill.includes('resume') && controlSkill.includes('Resume'),
  '/control SKILL.md documents the "resume" action'
);

// --- SC-005: /control SKILL.md has trust action ---
assert('SC-005',
  controlSkill.includes('trust') && controlSkill.includes('Trust'),
  '/control SKILL.md documents the "trust" action'
);

// =====================================================================
// SC-006~010: /audit SKILL.md has all action docs
// =====================================================================

const auditSkill = fs.readFileSync(path.join(SKILLS_DIR, 'audit', 'SKILL.md'), 'utf-8');

// --- SC-006: /audit SKILL.md has log action ---
assert('SC-006',
  auditSkill.includes('log') && auditSkill.includes('Log') || auditSkill.includes('log'),
  '/audit SKILL.md documents the "log" action'
);

// --- SC-007: /audit SKILL.md has trace action ---
assert('SC-007',
  auditSkill.includes('trace'),
  '/audit SKILL.md documents the "trace" action'
);

// --- SC-008: /audit SKILL.md has summary action ---
assert('SC-008',
  auditSkill.includes('summary'),
  '/audit SKILL.md documents the "summary" action'
);

// --- SC-009: /audit SKILL.md has search action ---
assert('SC-009',
  auditSkill.includes('search'),
  '/audit SKILL.md documents the "search" action'
);

// --- SC-010: /audit SKILL.md has argument-hint ---
assert('SC-010',
  auditSkill.includes('argument-hint'),
  '/audit SKILL.md has argument-hint for CLI usage guidance'
);

// =====================================================================
// SC-011~015: /rollback and /pdca-batch complete
// =====================================================================

const rollbackSkill = fs.readFileSync(path.join(SKILLS_DIR, 'rollback', 'SKILL.md'), 'utf-8');
const batchSkill = fs.readFileSync(path.join(SKILLS_DIR, 'pdca-batch', 'SKILL.md'), 'utf-8');

// --- SC-011: /rollback SKILL.md has list action ---
assert('SC-011',
  rollbackSkill.includes('list') && rollbackSkill.includes('List'),
  '/rollback SKILL.md documents the "list" action'
);

// --- SC-012: /rollback SKILL.md has to <checkpoint-id> action ---
assert('SC-012',
  rollbackSkill.includes('to') && rollbackSkill.includes('checkpoint'),
  '/rollback SKILL.md documents the "to <checkpoint-id>" action'
);

// --- SC-013: /rollback SKILL.md has reset action ---
assert('SC-013',
  rollbackSkill.includes('reset'),
  '/rollback SKILL.md documents the "reset" action'
);

// --- SC-014: /pdca-batch SKILL.md has status action ---
assert('SC-014',
  batchSkill.includes('status') && batchSkill.includes('Status'),
  '/pdca-batch SKILL.md documents the "status" action'
);

// --- SC-015: /pdca-batch SKILL.md has plan action for multiple features ---
assert('SC-015',
  batchSkill.includes('plan') && batchSkill.includes('multiple'),
  '/pdca-batch SKILL.md documents the "plan" action for multiple features'
);

summary('skill-commands.test.js');
process.exit(0);
