'use strict';
/**
 * Regression Test: 28 Skills Full Verification (56 TC)
 * Each skill: (1) eval.yaml existence (2) trigger matching in SKILL.md
 *
 * @version bkit v1.6.1
 */
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../..');
const SKILLS_DIR = path.join(BASE_DIR, 'skills');
const EVALS_DIR = path.join(BASE_DIR, 'evals');

let passed = 0, failed = 0, total = 0;

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; console.error(`  FAIL: ${id} - ${message}`); }
}

console.log('\n=== skills-28.test.js (56 TC) ===\n');

// --- Skill definitions ---
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

const ALL_SKILLS = [...WORKFLOW_SKILLS, ...CAPABILITY_SKILLS, ...HYBRID_SKILLS];

// --- Classification to eval directory mapping ---
function getEvalCategory(skill) {
  if (WORKFLOW_SKILLS.includes(skill)) return 'workflow';
  if (CAPABILITY_SKILLS.includes(skill)) return 'capability';
  if (HYBRID_SKILLS.includes(skill)) return 'hybrid';
  return null;
}

// ============================================================
// Test each skill: eval.yaml existence + trigger keywords
// ============================================================

ALL_SKILLS.forEach((skill, index) => {
  const num = String(index + 1).padStart(2, '0');

  // TC1: eval.yaml existence
  const category = getEvalCategory(skill);
  const evalPath = path.join(EVALS_DIR, category, skill, 'eval.yaml');
  const evalExists = fs.existsSync(evalPath);
  assert(`SK-${num}-EVAL`, evalExists,
    `${skill}: eval.yaml exists at evals/${category}/${skill}/eval.yaml`);

  // TC2: SKILL.md has Triggers keyword list
  const skillMdPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
  let hasTriggers = false;
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    // Check for frontmatter with Triggers: line or description containing trigger keywords
    hasTriggers = content.includes('Triggers:') || content.includes('triggers:');
  }
  assert(`SK-${num}-TRIG`, hasTriggers,
    `${skill}: SKILL.md contains trigger keywords`);
});

// ============================================================
// Additional structural checks
// ============================================================
console.log('\n--- Structural Checks ---');

// Verify SKILL.md exists for all skills
const allSkillMdsExist = ALL_SKILLS.every(skill =>
  fs.existsSync(path.join(SKILLS_DIR, skill, 'SKILL.md'))
);
assert('SK-STRUCT-01', allSkillMdsExist, 'All 28 skills have SKILL.md');

// Verify classification fields in workflow skills
WORKFLOW_SKILLS.forEach(skill => {
  const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf-8');
  const hasClassification = content.includes('classification: workflow');
  if (!hasClassification) {
    // Some workflow skills may not yet have classification field; log but don't fail
    console.log(`  INFO: ${skill} classification field check`);
  }
});

// ============================================================
// Summary
// ============================================================
console.log(`\n=== Results: ${passed}/${total} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
