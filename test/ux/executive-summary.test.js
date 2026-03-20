'use strict';
/**
 * UX Tests: Executive Summary Output UX (10 TC)
 * Tests PDCA task subject/description quality for Executive Summary output
 * and template path consistency (Docs=Code)
 *
 * @module test/ux/executive-summary.test.js
 */

const fs = require('fs');
const path = require('path');
const { assert, summary } = require('../helpers/assert');

let taskCreator;
try {
  taskCreator = require('../../lib/task/creator');
} catch (e) {
  console.error('task/creator module load failed:', e.message);
  process.exit(1);
}

const PROJECT_ROOT = path.resolve(__dirname, '../..');

console.log('\n=== executive-summary.test.js ===\n');

// --- UX-EXEC-001: plan phase subject에 아이콘 포함 ---
const planSubject = taskCreator.generatePdcaTaskSubject('plan', 'test-feature');
assert('UX-EXEC-001',
  /[\u{1F300}-\u{1FFFF}]/u.test(planSubject) || planSubject.includes('['),
  'Plan phase task subject contains visual indicator (emoji or bracket)'
);

// --- UX-EXEC-002: 각 phase별 subject는 feature 이름을 포함해야 함 ---
const phases = ['plan', 'design', 'do', 'check', 'act', 'report'];
const allSubjectsIncludeFeature = phases.every(phase => {
  const s = taskCreator.generatePdcaTaskSubject(phase, 'my-feature');
  return s.includes('my-feature');
});
assert('UX-EXEC-002',
  allSubjectsIncludeFeature,
  'All PDCA phase subjects include the feature name'
);

// --- UX-EXEC-003: 각 phase별 description은 의미 있는 내용을 포함 ---
const allDescsAreMeaningful = phases.every(phase => {
  const d = taskCreator.generatePdcaTaskDescription(phase, 'my-feature');
  return typeof d === 'string' && d.length > 15 && d.includes('my-feature');
});
assert('UX-EXEC-003',
  allDescsAreMeaningful,
  'All PDCA phase descriptions are meaningful and include feature name'
);

// --- UX-EXEC-004: plan.template.md 파일이 실제로 존재해야 함 ---
const planTemplatePath = path.join(PROJECT_ROOT, 'templates', 'plan.template.md');
assert('UX-EXEC-004',
  fs.existsSync(planTemplatePath),
  `plan.template.md exists at ${planTemplatePath}`
);

// --- UX-EXEC-005: design.template.md 파일이 실제로 존재해야 함 ---
const designTemplatePath = path.join(PROJECT_ROOT, 'templates', 'design.template.md');
assert('UX-EXEC-005',
  fs.existsSync(designTemplatePath),
  `design.template.md exists at ${designTemplatePath}`
);

// --- UX-EXEC-006: report.template.md 파일이 실제로 존재해야 함 ---
const reportTemplatePath = path.join(PROJECT_ROOT, 'templates', 'report.template.md');
assert('UX-EXEC-006',
  fs.existsSync(reportTemplatePath),
  `report.template.md exists at ${reportTemplatePath}`
);

// --- UX-EXEC-007: bkit.config.json에 plan docPath가 정의되어야 함 ---
const configPath = path.join(PROJECT_ROOT, 'bkit.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
assert('UX-EXEC-007',
  Array.isArray(config.pdca.docPaths.plan) && config.pdca.docPaths.plan.length > 0,
  'bkit.config.json defines plan docPaths array'
);

// --- UX-EXEC-008: config의 primary plan path가 실제 docs 구조와 일치 ---
const primaryPlanPath = config.pdca.docPaths.plan[0];
assert('UX-EXEC-008',
  primaryPlanPath.includes('docs/01-plan') && primaryPlanPath.includes('{feature}'),
  'Primary plan doc path includes docs/01-plan and {feature} placeholder'
);

// --- UX-EXEC-009: config의 primary report path가 실제 docs 구조와 일치 ---
const primaryReportPath = config.pdca.docPaths.report[0];
assert('UX-EXEC-009',
  primaryReportPath.includes('docs/04-report') && primaryReportPath.includes('{feature}'),
  'Primary report doc path includes docs/04-report and {feature} placeholder'
);

// --- UX-EXEC-010: generateTaskGuidance는 phase-specific 가이드를 제공해야 함 ---
const checkGuidance = taskCreator.generateTaskGuidance('check', 'my-feature');
assert('UX-EXEC-010',
  checkGuidance.includes('analyze') || checkGuidance.includes('gap') || checkGuidance.includes('verify'),
  'Check phase guidance mentions analysis/gap/verify action'
);

summary('executive-summary.test.js');
process.exit(0);
