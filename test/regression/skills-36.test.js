#!/usr/bin/env node
'use strict';
/**
 * Regression Test: 36 Skills Full Verification (40 TC)
 * SK36-001~040: Each of 36 skills has SKILL.md with valid frontmatter
 *
 * @version bkit v2.0.0
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../..');
const SKILLS_DIR = path.join(BASE_DIR, 'skills');

// --- Inline assert ---
let _passed = 0;
let _failed = 0;
let _total = 0;
const _failures = [];

function assert(id, condition, message) {
  _total++;
  if (condition) {
    _passed++;
    console.log(`  PASS: ${id} - ${message}`);
  } else {
    _failed++;
    _failures.push({ id, message });
    console.error(`  FAIL: ${id} - ${message}`);
  }
}

console.log('\n=== skills-36.test.js (40 TC) ===\n');

// --- All 36 skills ---
const ALL_SKILLS = [
  'audit', 'bkend-auth', 'bkend-cookbook', 'bkend-data', 'bkend-quickstart',
  'bkend-storage', 'bkit-rules', 'bkit-templates', 'btw', 'cc-version-analysis',
  'claude-code-learning', 'code-review', 'control', 'desktop-app',
  'development-pipeline', 'dynamic', 'enterprise', 'mobile-app', 'pdca',
  'pdca-batch', 'phase-1-schema', 'phase-2-convention', 'phase-3-mockup',
  'phase-4-api', 'phase-5-design-system', 'phase-6-ui-integration',
  'phase-7-seo-security', 'phase-8-review', 'phase-9-deployment',
  'plan-plus', 'pm-discovery', 'rollback', 'skill-create', 'skill-status',
  'starter', 'zero-script-qa'
];

// v2.0.0 new skills
const V2_NEW_SKILLS = ['control', 'audit', 'rollback', 'pdca-batch', 'btw'];

/**
 * Parse frontmatter from SKILL.md
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const raw = match[1];
  const result = {};
  const lines = raw.split('\n');
  for (const line of lines) {
    const keyMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (keyMatch) {
      result[keyMatch[1]] = keyMatch[2].trim();
    }
  }
  return result;
}

// ============================================================
// SK36-001: Total skill count = 36
// ============================================================
console.log('--- SK36-001: Total Skill Count ---');

const actualSkillDirs = fs.readdirSync(SKILLS_DIR).filter(d => {
  const dirPath = path.join(SKILLS_DIR, d);
  return fs.statSync(dirPath).isDirectory() && fs.existsSync(path.join(dirPath, 'SKILL.md'));
});
assert('SK36-001', actualSkillDirs.length >= 36,
  `Total skill count >= 36 (found ${actualSkillDirs.length})`);

// ============================================================
// SK36-002~037: Each skill has SKILL.md with valid frontmatter
// ============================================================
console.log('\n--- SK36-002~037: Individual Skill Verification ---');

for (let i = 0; i < ALL_SKILLS.length; i++) {
  const skill = ALL_SKILLS[i];
  const num = String(i + 2).padStart(3, '0');
  const skillMdPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
  let hasFrontmatter = false;
  let hasName = false;
  let hasDescription = false;
  let hasTriggers = false;

  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const fm = parseFrontmatter(content);
    hasFrontmatter = fm !== null;
    if (fm) {
      hasName = !!fm.name;
      hasDescription = !!fm.description;
      hasTriggers = content.toLowerCase().includes('trigger');
    }
  }

  assert(`SK36-${num}`, hasFrontmatter && hasName && hasDescription,
    `${skill}: SKILL.md exists with valid frontmatter (name=${hasName}, desc=${hasDescription})`);
}

// ============================================================
// SK36-038: v2.0.0 new skills exist
// ============================================================
console.log('\n--- SK36-038: v2.0.0 New Skills ---');

const missingNew = [];
for (const skill of V2_NEW_SKILLS) {
  if (!fs.existsSync(path.join(SKILLS_DIR, skill, 'SKILL.md'))) {
    missingNew.push(skill);
  }
}
assert('SK36-038', missingNew.length === 0,
  `v2.0.0 new skills all exist (control, audit, rollback, pdca-batch, btw)${missingNew.length ? ' MISSING: ' + missingNew.join(', ') : ''}`);

// ============================================================
// SK36-039: No orphaned skills
// ============================================================
console.log('\n--- SK36-039: No Orphaned Skills ---');

const orphaned = [];
for (const dir of actualSkillDirs) {
  const skillMdPath = path.join(SKILLS_DIR, dir, 'SKILL.md');
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  const fm = parseFrontmatter(content);
  if (!fm || !fm.name) {
    orphaned.push(dir);
  }
}
assert('SK36-039', orphaned.length === 0,
  `No orphaned skills (every SKILL.md has valid name)${orphaned.length ? ' ORPHANED: ' + orphaned.join(', ') : ''}`);

// ============================================================
// SK36-040: All SKILL.md files have proper trigger keywords
// ============================================================
console.log('\n--- SK36-040: Trigger Keywords ---');

const noTriggers = [];
for (const skill of ALL_SKILLS) {
  const skillMdPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    if (!content.toLowerCase().includes('trigger')) {
      noTriggers.push(skill);
    }
  } else {
    noTriggers.push(skill);
  }
}
assert('SK36-040', noTriggers.length === 0,
  `All SKILL.md files have trigger keywords${noTriggers.length ? ' MISSING: ' + noTriggers.join(', ') : ''}`);

// ============================================================
// Summary
// ============================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`36 Skills Regression Tests: ${_passed}/${_total} PASS, ${_failed} FAIL`);
if (_failures.length > 0) {
  console.log(`\nFailures:`);
  _failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}
console.log(`${'='.repeat(60)}\n`);
if (_failed > 0) process.exit(1);
