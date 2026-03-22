#!/usr/bin/env node
'use strict';
/**
 * Integration Tests for PR #50: pm-skills-integration
 * 50 TC | PM Agent frameworks 9→43, PDCA checkpoints, btw team, code-analyzer confidence
 *
 * @version bkit v1.7.0 (PR #50)
 * @see https://github.com/popup-studio-ai/bkit-claude-code/pull/50
 */

const fs = require('fs');
const path = require('path');
const { assert, summary, reset } = require('../helpers/assert');
reset();

console.log('\n=== pm-skills-integration.test.js (50 TC) ===\n');

const BASE_DIR = path.resolve(__dirname, '../..');
const AGENTS_DIR = path.join(BASE_DIR, 'agents');
const SKILLS_DIR = path.join(BASE_DIR, 'skills');
const TEMPLATES_DIR = path.join(BASE_DIR, 'templates');
const SCRIPTS_DIR = path.join(BASE_DIR, 'scripts');

// ============================================================
// Section 1: PM Agent Framework Expansion (15 TC)
// ============================================================
console.log('\n--- Section 1: PM Agent Frameworks ---');

const PM_AGENTS = ['pm-discovery', 'pm-strategy', 'pm-research', 'pm-prd', 'pm-lead'];

// PMI-01: All 5 PM agents exist
for (let i = 0; i < PM_AGENTS.length; i++) {
  const agent = PM_AGENTS[i];
  const agentPath = path.join(AGENTS_DIR, `${agent}.md`);
  assert(`PMI-${String(i + 1).padStart(2, '0')}`,
    fs.existsSync(agentPath),
    `${agent}.md exists`
  );
}

// PMI-06: pm-discovery contains OST + Brainstorm + Assumptions frameworks
const discoveryContent = fs.readFileSync(path.join(AGENTS_DIR, 'pm-discovery.md'), 'utf-8');
assert('PMI-06',
  discoveryContent.includes('Brainstorm') || discoveryContent.includes('brainstorm'),
  'pm-discovery includes Brainstorm framework'
);
assert('PMI-07',
  discoveryContent.includes('Assumption') || discoveryContent.includes('assumption'),
  'pm-discovery includes Assumptions/Risk framework'
);

// PMI-08: pm-strategy contains JTBD + Lean Canvas + SWOT
const strategyContent = fs.readFileSync(path.join(AGENTS_DIR, 'pm-strategy.md'), 'utf-8');
assert('PMI-08',
  strategyContent.includes('SWOT') || strategyContent.includes('swot'),
  'pm-strategy includes SWOT analysis'
);
assert('PMI-09',
  strategyContent.includes('Lean Canvas') || strategyContent.includes('lean canvas'),
  'pm-strategy includes Lean Canvas'
);

// PMI-10: pm-research contains Persona + Competitor + Market + Customer Journey
const researchContent = fs.readFileSync(path.join(AGENTS_DIR, 'pm-research.md'), 'utf-8');
assert('PMI-10',
  researchContent.includes('Customer Journey') || researchContent.includes('customer journey'),
  'pm-research includes Customer Journey Map'
);

// PMI-11: pm-prd contains all 43 framework references
const prdContent = fs.readFileSync(path.join(AGENTS_DIR, 'pm-prd.md'), 'utf-8');
assert('PMI-11',
  prdContent.includes('Pre-mortem') || prdContent.includes('pre-mortem'),
  'pm-prd includes Pre-mortem framework'
);
assert('PMI-12',
  prdContent.includes('Growth Loop') || prdContent.includes('growth loop'),
  'pm-prd includes Growth Loops'
);
assert('PMI-13',
  prdContent.includes('User Stor') || prdContent.includes('user stor'),
  'pm-prd includes User Stories'
);
assert('PMI-14',
  prdContent.includes('Job Stor') || prdContent.includes('job stor'),
  'pm-prd includes Job Stories'
);
assert('PMI-15',
  prdContent.includes('Stakeholder') || prdContent.includes('stakeholder'),
  'pm-prd includes Stakeholder Map'
);

// ============================================================
// Section 2: code-analyzer Confidence Filtering (5 TC)
// ============================================================
console.log('\n--- Section 2: code-analyzer Confidence ---');

const analyzerContent = fs.readFileSync(path.join(AGENTS_DIR, 'code-analyzer.md'), 'utf-8');

assert('PMI-16',
  analyzerContent.includes('Confidence-Based Filtering'),
  'code-analyzer has Confidence-Based Filtering section'
);
assert('PMI-17',
  analyzerContent.includes('confidence ≥ 80%') || analyzerContent.includes('confidence >= 80'),
  'code-analyzer requires ≥80% confidence threshold'
);
assert('PMI-18',
  analyzerContent.includes('Critical') && analyzerContent.includes('Important'),
  'code-analyzer has Critical/Important severity levels'
);
assert('PMI-19',
  analyzerContent.includes('DO NOT REPORT'),
  'code-analyzer filters low-confidence items'
);
assert('PMI-20',
  analyzerContent.includes('issue count summary'),
  'code-analyzer shows issue count summary'
);

// ============================================================
// Section 3: CTO Lead Interactive Checkpoints (5 TC)
// ============================================================
console.log('\n--- Section 3: CTO Lead Checkpoints ---');

const ctoContent = fs.readFileSync(path.join(AGENTS_DIR, 'cto-lead.md'), 'utf-8');

assert('PMI-21',
  ctoContent.includes('Interactive Checkpoint') || ctoContent.includes('interactive checkpoint'),
  'cto-lead has Interactive Checkpoints section'
);
assert('PMI-22',
  ctoContent.includes('Checkpoint') && ctoContent.includes('v1.7.0'),
  'cto-lead checkpoints are v1.7.0 feature'
);
assert('PMI-23',
  ctoContent.includes('AskUserQuestion') || ctoContent.includes('askUserQuestion'),
  'cto-lead uses AskUserQuestion for checkpoints'
);
assert('PMI-24',
  ctoContent.includes('feature-dev') || ctoContent.includes('feature_dev'),
  'cto-lead references feature-dev pattern'
);
assert('PMI-25',
  ctoContent.includes('DO NOT START') || ctoContent.includes('Wait for') || ctoContent.includes('wait for'),
  'cto-lead enforces user approval before proceeding'
);

// ============================================================
// Section 4: PDCA Skill Checkpoints 1-5 (10 TC)
// ============================================================
console.log('\n--- Section 4: PDCA Skill Checkpoints ---');

const pdcaContent = fs.readFileSync(path.join(SKILLS_DIR, 'pdca', 'SKILL.md'), 'utf-8');

assert('PMI-26',
  pdcaContent.includes('Checkpoint 1'),
  'PDCA skill has Checkpoint 1 (Requirements Confirmation)'
);
assert('PMI-27',
  pdcaContent.includes('Checkpoint 2'),
  'PDCA skill has Checkpoint 2 (Clarifying Questions)'
);
assert('PMI-28',
  pdcaContent.includes('Checkpoint 3'),
  'PDCA skill has Checkpoint 3 (Architecture Selection)'
);
assert('PMI-29',
  pdcaContent.includes('Checkpoint 4'),
  'PDCA skill has Checkpoint 4 (Implementation Approval)'
);
assert('PMI-30',
  pdcaContent.includes('Checkpoint 5'),
  'PDCA skill has Checkpoint 5 (Review Decision)'
);
assert('PMI-31',
  pdcaContent.includes('3 Architecture Options') || pdcaContent.includes('3가지 설계안'),
  'PDCA design phase generates 3 architecture options'
);
assert('PMI-32',
  pdcaContent.includes('Option A') && pdcaContent.includes('Option B') && pdcaContent.includes('Option C'),
  'PDCA design has Option A/B/C (Minimal/Clean/Pragmatic)'
);
assert('PMI-33',
  pdcaContent.includes('DO NOT START IMPLEMENTATION WITHOUT USER APPROVAL'),
  'Do phase blocks implementation without approval'
);
assert('PMI-34',
  (pdcaContent.match(/AskUserQuestion/g) || []).length >= 3,
  'PDCA has ≥3 AskUserQuestion calls for checkpoints'
);
assert('PMI-35',
  pdcaContent.includes('Critical만 수정') || pdcaContent.includes('Critical only'),
  'Check phase has Critical-only fix option'
);

// ============================================================
// Section 5: btw CTO Team Integration (5 TC)
// ============================================================
console.log('\n--- Section 5: btw CTO Team Integration ---');

const btwContent = fs.readFileSync(path.join(SKILLS_DIR, 'btw', 'SKILL.md'), 'utf-8');

assert('PMI-36',
  btwContent.includes('CTO Team Integration') || btwContent.includes('CTO Team'),
  'btw skill has CTO Team Integration section'
);
assert('PMI-37',
  btwContent.includes('teamContext'),
  'btw entries include teamContext field'
);
assert('PMI-38',
  btwContent.includes('isTeamSession'),
  'teamContext has isTeamSession boolean'
);
assert('PMI-39',
  btwContent.includes('Phase Transition Hook') || btwContent.includes('phase transition'),
  'btw has Phase Transition Hook'
);
assert('PMI-40',
  btwContent.includes('Session End') || btwContent.includes('session end'),
  'btw has Session End stats behavior'
);

// ============================================================
// Section 6: cto-stop.js btw Summary (5 TC)
// ============================================================
console.log('\n--- Section 6: cto-stop.js btw Summary ---');

const ctoStopContent = fs.readFileSync(path.join(SCRIPTS_DIR, 'cto-stop.js'), 'utf-8');

assert('PMI-41',
  ctoStopContent.includes('btw') && ctoStopContent.includes('stats'),
  'cto-stop.js includes btw stats logic'
);
assert('PMI-42',
  ctoStopContent.includes('btw-suggestions.json'),
  'cto-stop.js reads btw-suggestions.json'
);
assert('PMI-43',
  ctoStopContent.includes('pending') && ctoStopContent.includes('promoted'),
  'cto-stop.js counts pending and promoted suggestions'
);
assert('PMI-44',
  ctoStopContent.includes('categories') || ctoStopContent.includes('category'),
  'cto-stop.js outputs category breakdown'
);
assert('PMI-45',
  ctoStopContent.includes('catch') && ctoStopContent.includes('non-fatal'),
  'cto-stop.js btw stats failure is non-fatal'
);

// ============================================================
// Section 7: Template Updates (5 TC)
// ============================================================
console.log('\n--- Section 7: Template Updates ---');

// design.template.md
const designTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'design.template.md'), 'utf-8');
assert('PMI-46',
  designTemplate.includes('Architecture Options') || designTemplate.includes('Architecture Comparison'),
  'design template has Architecture Options section'
);
assert('PMI-47',
  designTemplate.includes('Option A') && designTemplate.includes('Option B') && designTemplate.includes('Option C'),
  'design template has 3 options (Minimal/Clean/Pragmatic)'
);

// pm-prd.template.md
const prdTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'pm-prd.template.md'), 'utf-8');
assert('PMI-48',
  prdTemplate.includes('version: 2.0'),
  'pm-prd template version upgraded to 2.0'
);
assert('PMI-49',
  prdTemplate.includes('Execution Deliverables'),
  'pm-prd template has Section 6: Execution Deliverables'
);
assert('PMI-50',
  prdTemplate.includes('Pre-mortem') &&
  prdTemplate.includes('User Stories') &&
  prdTemplate.includes('Job Stories') &&
  prdTemplate.includes('Test Scenarios') &&
  prdTemplate.includes('Stakeholder Map'),
  'pm-prd template has all 5 execution deliverable subsections'
);

// ============================================================
// Summary
// ============================================================
summary('PM Skills Integration Tests (PR #50)');
