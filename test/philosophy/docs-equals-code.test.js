'use strict';
/**
 * Philosophy Tests: Docs=Code Principle (15 TC)
 * Tests that bkit.config.json values are consistent with code defaults,
 * and that documentation paths match actual file structure
 *
 * @module test/philosophy/docs-equals-code.test.js
 */

const fs = require('fs');
const path = require('path');
const { assert, summary } = require('../helpers/assert');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'bkit.config.json'), 'utf-8'));
} catch (e) {
  console.error('bkit.config.json load failed:', e.message);
  process.exit(1);
}

let orchestrator;
try {
  orchestrator = require('../../lib/team/orchestrator');
} catch (e) {
  console.error('orchestrator module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== docs-equals-code.test.js ===\n');

// --- PHI-DC-001: config orchestrationPatterns.Dynamic === orchestrator DEFAULT_PHASE_PATTERN_MAP.Dynamic ---
const configDynamic = config.team.orchestrationPatterns.Dynamic;
const codeDynamic = orchestrator.DEFAULT_PHASE_PATTERN_MAP.Dynamic;
assert('PHI-DC-001',
  configDynamic.plan === codeDynamic.plan &&
  configDynamic.design === codeDynamic.design &&
  configDynamic.do === codeDynamic.do,
  'Dynamic orchestration patterns: config matches code DEFAULT_PHASE_PATTERN_MAP'
);

// --- PHI-DC-002: config orchestrationPatterns.Enterprise === orchestrator DEFAULT_PHASE_PATTERN_MAP.Enterprise ---
const configEnterprise = config.team.orchestrationPatterns.Enterprise;
const codeEnterprise = orchestrator.DEFAULT_PHASE_PATTERN_MAP.Enterprise;
assert('PHI-DC-002',
  configEnterprise.plan === codeEnterprise.plan &&
  configEnterprise.design === codeEnterprise.design &&
  configEnterprise.act === codeEnterprise.act,
  'Enterprise orchestration patterns: config matches code DEFAULT_PHASE_PATTERN_MAP'
);

// --- PHI-DC-003: config.triggers.confidenceThreshold === ambiguity.js 기본값 (0.7) ---
assert('PHI-DC-003',
  config.triggers.confidenceThreshold === 0.7,
  'config.triggers.confidenceThreshold === 0.7 (matches ambiguity.js default)'
);

// --- PHI-DC-004: config.triggers.confidenceThreshold === trigger.js 기본값 (0.7) ---
// trigger.js: getConfig('triggers.confidenceThreshold', 0.7)
assert('PHI-DC-004',
  config.triggers.confidenceThreshold === 0.7,
  'config.triggers.confidenceThreshold === 0.7 (matches trigger.js default)'
);

// --- PHI-DC-005: docs/01-plan/features/ 디렉토리가 실제로 존재해야 함 ---
const planDir = path.join(PROJECT_ROOT, 'docs', '01-plan', 'features');
assert('PHI-DC-005',
  fs.existsSync(planDir),
  'docs/01-plan/features/ directory exists (matches config primary plan path)'
);

// --- PHI-DC-006: docs/02-design/features/ 디렉토리가 실제로 존재해야 함 ---
const designDir = path.join(PROJECT_ROOT, 'docs', '02-design', 'features');
assert('PHI-DC-006',
  fs.existsSync(designDir),
  'docs/02-design/features/ directory exists (matches config primary design path)'
);

// --- PHI-DC-007: docs/03-analysis/ 디렉토리가 실제로 존재해야 함 ---
const analysisDir = path.join(PROJECT_ROOT, 'docs', '03-analysis');
assert('PHI-DC-007',
  fs.existsSync(analysisDir),
  'docs/03-analysis/ directory exists (matches config primary analysis path)'
);

// --- PHI-DC-008: docs/04-report/features/ 디렉토리가 실제로 존재해야 함 ---
const reportDir = path.join(PROJECT_ROOT, 'docs', '04-report', 'features');
assert('PHI-DC-008',
  fs.existsSync(reportDir),
  'docs/04-report/features/ directory exists (matches config primary report path)'
);

// --- PHI-DC-009: config matchRateThreshold === 90 (문서와 코드 일치) ---
assert('PHI-DC-009',
  config.pdca.matchRateThreshold === 90,
  'config.pdca.matchRateThreshold === 90 (PDCA quality gate threshold)'
);

// --- PHI-DC-010: config maxIterations가 정의되어 있어야 함 ---
assert('PHI-DC-010',
  typeof config.pdca.maxIterations === 'number' && config.pdca.maxIterations > 0,
  'config.pdca.maxIterations is defined and positive'
);

// --- PHI-DC-011: config permissions에 파괴적 명령 deny가 포함되어야 함 ---
assert('PHI-DC-011',
  config.permissions['Bash(rm -rf*)'] === 'deny',
  'config.permissions blocks "Bash(rm -rf*)" with deny'
);

// --- PHI-DC-012: config permissions에 force push deny가 포함되어야 함 ---
assert('PHI-DC-012',
  config.permissions['Bash(git push --force*)'] === 'deny',
  'config.permissions blocks "Bash(git push --force*)" with deny'
);

// --- PHI-DC-013: agents/*.md 파일들이 실제로 존재해야 함 ---
const agentsDir = path.join(PROJECT_ROOT, 'agents');
const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
assert('PHI-DC-013',
  agentFiles.length >= 10,
  `agents/ directory contains >= 10 .md agent files (found: ${agentFiles.length})`
);

// --- PHI-DC-014: cto-lead.md에 disallowedTools가 정의되어 있어야 함 ---
const ctoLeadPath = path.join(PROJECT_ROOT, 'agents', 'cto-lead.md');
const ctoLeadContent = fs.readFileSync(ctoLeadPath, 'utf-8');
assert('PHI-DC-014',
  ctoLeadContent.includes('disallowedTools'),
  'cto-lead.md defines disallowedTools (Docs=Code: agent file reflects security policy)'
);

// --- PHI-DC-015: gap-detector.md에 disallowedTools(Write)가 정의되어 있어야 함 ---
const gapDetectorPath = path.join(PROJECT_ROOT, 'agents', 'gap-detector.md');
const gapDetectorContent = fs.readFileSync(gapDetectorPath, 'utf-8');
assert('PHI-DC-015',
  gapDetectorContent.includes('disallowedTools') && gapDetectorContent.includes('Write'),
  'gap-detector.md blocks Write tool (read-only verification agent — Docs=Code)'
);

summary('docs-equals-code.test.js');
process.exit(0);
