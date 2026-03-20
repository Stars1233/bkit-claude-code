#!/usr/bin/env node
'use strict';
/**
 * Regression Test: 35 Skills Full Verification (25 TC)
 * SK-001~025: Each of 35 skills (31 old + 4 new) has SKILL.md with valid frontmatter
 *
 * @version bkit v2.0.0
 */

const fs = require('fs');
const path = require('path');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

const BASE_DIR = path.resolve(__dirname, '../..');
const SKILLS_DIR = path.join(BASE_DIR, 'skills');

console.log('\n=== skills-35.test.js (25 TC) ===\n');

// --- Skill definitions (35 skills: 9W + 20C + 2H + 4 new) ---
const WORKFLOW_SKILLS = [
  'pdca', 'bkit-rules', 'bkit-templates', 'code-review',
  'development-pipeline', 'phase-2-convention', 'phase-8-review',
  'pm-discovery', 'zero-script-qa'
];

const CAPABILITY_SKILLS = [
  'starter', 'dynamic', 'enterprise', 'mobile-app', 'desktop-app',
  'phase-1-schema', 'phase-3-mockup', 'phase-4-api',
  'phase-5-design-system', 'phase-6-ui-integration',
  'phase-7-seo-security', 'phase-9-deployment',
  'claude-code-learning',
  'bkend-quickstart', 'bkend-auth', 'bkend-data',
  'bkend-cookbook', 'bkend-storage'
];

const HYBRID_SKILLS = ['plan-plus'];

// v2.0.0 new skills
const NEW_SKILLS = [
  'audit', 'btw', 'cc-version-analysis', 'control',
  'pdca-batch', 'rollback', 'skill-create', 'skill-status'
];

const ALL_SKILLS = [...WORKFLOW_SKILLS, ...CAPABILITY_SKILLS, ...HYBRID_SKILLS, ...NEW_SKILLS];

/**
 * Parse frontmatter from SKILL.md
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return match[1];
}

// ============================================================
// SK-001~010: First 10 skills have SKILL.md with valid frontmatter
// ============================================================
console.log('--- Skills 1-10 ---');

for (let i = 0; i < 10; i++) {
  const skill = ALL_SKILLS[i];
  if (!skill) {
    skip(`SK-${String(i + 1).padStart(3, '0')}`, `No skill at index ${i}`);
    continue;
  }
  const skillMdPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
  let hasFrontmatter = false;
  let hasName = false;

  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const fm = parseFrontmatter(content);
    hasFrontmatter = fm !== null;
    if (fm) {
      hasName = fm.includes('name:');
    }
  }

  assert(`SK-${String(i + 1).padStart(3, '0')}`, hasFrontmatter && hasName,
    `${skill}: SKILL.md exists with valid frontmatter (name field present)`);
}

// ============================================================
// SK-011~020: Skills 11-20
// ============================================================
console.log('\n--- Skills 11-20 ---');

for (let i = 10; i < 20; i++) {
  const skill = ALL_SKILLS[i];
  if (!skill) {
    skip(`SK-${String(i + 1).padStart(3, '0')}`, `No skill at index ${i}`);
    continue;
  }
  const skillMdPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
  let hasFrontmatter = false;

  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    hasFrontmatter = parseFrontmatter(content) !== null;
  }

  assert(`SK-${String(i + 1).padStart(3, '0')}`, hasFrontmatter,
    `${skill}: SKILL.md exists with valid frontmatter`);
}

// ============================================================
// SK-021~025: Remaining skills and structural checks
// ============================================================
console.log('\n--- Skills 21+ and Structural Checks ---');

// SK-021: Remaining skills all have SKILL.md
const remainingSkills = ALL_SKILLS.slice(20);
let allRemainingHaveSkillMd = true;
const missingSkillMd = [];
for (const skill of remainingSkills) {
  if (!fs.existsSync(path.join(SKILLS_DIR, skill, 'SKILL.md'))) {
    allRemainingHaveSkillMd = false;
    missingSkillMd.push(skill);
  }
}
assert('SK-021', allRemainingHaveSkillMd,
  `Remaining ${remainingSkills.length} skills have SKILL.md${missingSkillMd.length ? ' MISSING: ' + missingSkillMd.join(', ') : ''}`);

// SK-022: Discover actual skill directories
const actualSkillDirs = fs.readdirSync(SKILLS_DIR).filter(d => {
  const dirPath = path.join(SKILLS_DIR, d);
  return fs.statSync(dirPath).isDirectory() && fs.existsSync(path.join(dirPath, 'SKILL.md'));
});
assert('SK-022', actualSkillDirs.length >= 31,
  `At least 31 skill directories with SKILL.md (found ${actualSkillDirs.length})`);

// SK-023: All discovered skills have frontmatter
let allDiscoveredHaveFm = true;
const noFm = [];
for (const skill of actualSkillDirs) {
  const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
  if (!parseFrontmatter(content)) {
    allDiscoveredHaveFm = false;
    noFm.push(skill);
  }
}
assert('SK-023', allDiscoveredHaveFm,
  `All discovered skills have frontmatter${noFm.length ? ' MISSING: ' + noFm.join(', ') : ''}`);

// SK-024: All frontmatters have name field
let allHaveName = true;
const noName = [];
for (const skill of actualSkillDirs) {
  const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
  const fm = parseFrontmatter(content);
  if (fm && !fm.includes('name:')) {
    allHaveName = false;
    noName.push(skill);
  }
}
assert('SK-024', allHaveName,
  `All skills have name in frontmatter${noName.length ? ' MISSING: ' + noName.join(', ') : ''}`);

// SK-025: All frontmatters have description field
let allHaveDesc = true;
const noDesc = [];
for (const skill of actualSkillDirs) {
  const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
  const fm = parseFrontmatter(content);
  if (fm && !fm.includes('description:') && !fm.includes('description: |')) {
    allHaveDesc = false;
    noDesc.push(skill);
  }
}
assert('SK-025', allHaveDesc,
  `All skills have description in frontmatter${noDesc.length ? ' MISSING: ' + noDesc.join(', ') : ''}`);

// ============================================================
// Summary
// ============================================================
const result = summary('35 Skills Regression Tests');
if (result.failed > 0) process.exit(1);
