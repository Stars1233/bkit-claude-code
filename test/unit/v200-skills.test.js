#!/usr/bin/env node
'use strict';
/**
 * Unit Test: v2.0.0 New Skills Verification (30 TC)
 * VS-001~030: Test 4+1 new v2.0.0 skills (control, audit, rollback, pdca-batch, btw)
 *
 * @version bkit v2.0.0
 */

const fs = require('fs');
const path = require('path');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

const BASE_DIR = path.resolve(__dirname, '../..');
const SKILLS_DIR = path.join(BASE_DIR, 'skills');

console.log('\n=== v200-skills.test.js (30 TC) ===\n');

// --- New v2.0.0 skills ---
const NEW_SKILLS = ['control', 'audit', 'rollback', 'pdca-batch', 'btw'];

/**
 * Parse frontmatter from SKILL.md content
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return match[1];
}

/**
 * Extract value from frontmatter by key
 */
function getFrontmatterValue(frontmatter, key) {
  if (!frontmatter) return null;
  // Handle multi-line values (e.g., description with |)
  const regex = new RegExp(`^${key}:\\s*(.*)`, 'm');
  const match = frontmatter.match(regex);
  if (!match) return null;
  return match[1].trim();
}

// ============================================================
// VS-001~005: Each new skill SKILL.md exists and loads
// ============================================================
console.log('--- VS-001~005: SKILL.md exists and loads ---');

const skillContents = {};
for (let i = 0; i < NEW_SKILLS.length; i++) {
  const skill = NEW_SKILLS[i];
  const skillMdPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
  const id = `VS-${String(i + 1).padStart(3, '0')}`;

  let exists = false;
  try {
    exists = fs.existsSync(skillMdPath);
    if (exists) {
      skillContents[skill] = fs.readFileSync(skillMdPath, 'utf8');
    }
  } catch (_) {
    exists = false;
  }

  assert(id, exists && skillContents[skill] && skillContents[skill].length > 0,
    `${skill}/SKILL.md exists and is non-empty`);
}

// ============================================================
// VS-006~010: Each SKILL.md has proper frontmatter (name, description)
// ============================================================
console.log('\n--- VS-006~010: Frontmatter has name and description ---');

const frontmatters = {};
for (let i = 0; i < NEW_SKILLS.length; i++) {
  const skill = NEW_SKILLS[i];
  const id = `VS-${String(i + 6).padStart(3, '0')}`;
  const content = skillContents[skill];

  if (!content) {
    skip(id, `${skill}/SKILL.md not loaded, cannot check frontmatter`);
    continue;
  }

  const fm = parseFrontmatter(content);
  frontmatters[skill] = fm;

  const hasName = fm && fm.includes('name:');
  const hasDescription = fm && fm.includes('description:');

  assert(id, hasName && hasDescription,
    `${skill}/SKILL.md has name and description in frontmatter`);
}

// ============================================================
// VS-011~015: Each SKILL.md has triggers in multiple languages (EN, KO)
// ============================================================
console.log('\n--- VS-011~015: Triggers in multiple languages (EN, KO) ---');

for (let i = 0; i < NEW_SKILLS.length; i++) {
  const skill = NEW_SKILLS[i];
  const id = `VS-${String(i + 11).padStart(3, '0')}`;
  const content = skillContents[skill];

  if (!content) {
    skip(id, `${skill}/SKILL.md not loaded, cannot check triggers`);
    continue;
  }

  const fm = frontmatters[skill];
  if (!fm) {
    skip(id, `${skill}/SKILL.md has no frontmatter`);
    continue;
  }

  // Check for English triggers (lowercase ascii words) and Korean triggers (hangul characters)
  const hasEnglishTrigger = /Triggers:.*[a-z]+/i.test(fm) || /Keywords:.*[a-z]+/i.test(fm);
  // Korean characters in the Hangul Syllables range
  const hasKoreanTrigger = /[\uAC00-\uD7AF]/.test(fm);

  assert(id, hasEnglishTrigger && hasKoreanTrigger,
    `${skill}/SKILL.md has triggers in EN and KO`);
}

// ============================================================
// VS-016~020: /control SKILL.md contains level, pause, resume, trust commands
// ============================================================
console.log('\n--- VS-016~020: /control SKILL.md command coverage ---');

const controlContent = skillContents['control'] || '';
const controlCommands = ['level', 'pause', 'resume', 'trust', 'status'];

for (let i = 0; i < controlCommands.length; i++) {
  const cmd = controlCommands[i];
  const id = `VS-${String(i + 16).padStart(3, '0')}`;

  if (!controlContent) {
    skip(id, 'control/SKILL.md not loaded');
    continue;
  }

  // Check both argument-hint and body content for command
  const inArgHint = controlContent.includes(`argument-hint:`) &&
    controlContent.match(/argument-hint:.*$/m)?.[0]?.includes(cmd);
  const inBody = controlContent.includes(`### ${cmd}`) ||
    controlContent.includes(`| \`${cmd}\``) ||
    controlContent.includes(`| \`${cmd} `);

  assert(id, inArgHint || inBody,
    `/control SKILL.md documents "${cmd}" command`);
}

// ============================================================
// VS-021~025: /audit SKILL.md contains log, trace, summary, search commands
// ============================================================
console.log('\n--- VS-021~025: /audit SKILL.md command coverage ---');

const auditContent = skillContents['audit'] || '';
const auditCommands = ['log', 'trace', 'summary', 'search'];

for (let i = 0; i < auditCommands.length; i++) {
  const cmd = auditCommands[i];
  const id = `VS-${String(i + 21).padStart(3, '0')}`;

  if (!auditContent) {
    skip(id, 'audit/SKILL.md not loaded');
    continue;
  }

  const inArgHint = auditContent.includes(`argument-hint:`) &&
    auditContent.match(/argument-hint:.*$/m)?.[0]?.includes(cmd);
  const inBody = auditContent.includes(`### ${cmd}`) ||
    auditContent.includes(`| \`${cmd}\``) ||
    auditContent.includes(`| \`${cmd} `);

  assert(id, inArgHint || inBody,
    `/audit SKILL.md documents "${cmd}" command`);
}

// VS-025: /audit has readonly tools only (no Write)
{
  const id = 'VS-025';
  if (!auditContent) {
    skip(id, 'audit/SKILL.md not loaded');
  } else {
    const hasWrite = auditContent.includes('- Write');
    assert(id, !hasWrite,
      '/audit SKILL.md does not include Write in allowed-tools (readonly)');
  }
}

// ============================================================
// VS-026~028: /rollback SKILL.md contains list, to, reset commands
// ============================================================
console.log('\n--- VS-026~028: /rollback SKILL.md command coverage ---');

const rollbackContent = skillContents['rollback'] || '';
const rollbackCommands = ['list', 'to', 'reset'];

for (let i = 0; i < rollbackCommands.length; i++) {
  const cmd = rollbackCommands[i];
  const id = `VS-${String(i + 26).padStart(3, '0')}`;

  if (!rollbackContent) {
    skip(id, 'rollback/SKILL.md not loaded');
    continue;
  }

  const inArgHint = rollbackContent.includes(`argument-hint:`) &&
    rollbackContent.match(/argument-hint:.*$/m)?.[0]?.includes(cmd);
  const inBody = rollbackContent.includes(`### ${cmd}`) ||
    rollbackContent.includes(`| \`${cmd}\``) ||
    rollbackContent.includes(`| \`${cmd} `);

  assert(id, inArgHint || inBody,
    `/rollback SKILL.md documents "${cmd}" command`);
}

// ============================================================
// VS-029~030: /pdca-batch SKILL.md contains status, plan commands
// ============================================================
console.log('\n--- VS-029~030: /pdca-batch SKILL.md command coverage ---');

const batchContent = skillContents['pdca-batch'] || '';
const batchCommands = ['status', 'plan'];

for (let i = 0; i < batchCommands.length; i++) {
  const cmd = batchCommands[i];
  const id = `VS-${String(i + 29).padStart(3, '0')}`;

  if (!batchContent) {
    skip(id, 'pdca-batch/SKILL.md not loaded');
    continue;
  }

  const inArgHint = batchContent.includes(`argument-hint:`) &&
    batchContent.match(/argument-hint:.*$/m)?.[0]?.includes(cmd);
  const inBody = batchContent.includes(`### ${cmd}`) ||
    batchContent.includes(`| \`${cmd}\``) ||
    batchContent.includes(`| \`${cmd} `);

  assert(id, inArgHint || inBody,
    `/pdca-batch SKILL.md documents "${cmd}" command`);
}

// ============================================================
// Summary
// ============================================================

const result = summary('v200-skills.test.js');
process.exitCode = result.failed > 0 ? 1 : 0;
