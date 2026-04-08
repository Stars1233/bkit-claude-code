#!/usr/bin/env node
'use strict';
/**
 * Regression Test: v1.6.2 Compatibility (30 TC)
 * VC-001~010: All v1.6.2 PDCA commands still work
 * VC-011~020: pdca-status.json v2.0 data loads correctly in v3.0 module
 * VC-021~030: Existing agent/skill definitions not broken
 *
 * @version bkit v2.0.0
 */

const fs = require('fs');
const path = require('path');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

const BASE_DIR = path.resolve(__dirname, '../..');
const AGENTS_DIR = path.join(BASE_DIR, 'agents');
const SKILLS_DIR = path.join(BASE_DIR, 'skills');

console.log('\n=== v162-compat.test.js (30 TC) ===\n');

// ============================================================
// VC-001~010: All v1.6.2 PDCA commands still work
// ============================================================
console.log('--- PDCA Commands Compatibility ---');

let phase, status, bkitConfig;
try {
  phase = require(path.join(BASE_DIR, 'lib/pdca/phase'));
  status = require(path.join(BASE_DIR, 'lib/pdca/status'));
  bkitConfig = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'bkit.config.json'), 'utf-8'));
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

// VC-001: plan command support
assert('VC-001', typeof phase.getPhaseNumber === 'function' && phase.getPhaseNumber('plan') === 1,
  'plan command: phase module recognizes plan phase (number=1)');

// VC-002: design command support
assert('VC-002', phase.getPhaseNumber('design') === 2,
  'design command: phase module recognizes design phase (number=2)');

// VC-003: do command support
assert('VC-003', phase.getPhaseNumber('do') === 3,
  'do command: phase module recognizes do phase (number=3)');

// VC-004: analyze/check command support
assert('VC-004', phase.getPhaseNumber('check') === 4,
  'analyze/check command: phase module recognizes check phase (number=4)');

// VC-005: iterate/act command support
assert('VC-005', phase.getPhaseNumber('act') === 5,
  'iterate/act command: phase module recognizes act phase (number=5)');

// VC-006: report command support (v2.1.1: order 6→7 due to qa phase insertion)
assert('VC-006', phase.getPhaseNumber('report') === 7,
  'report command: phase module recognizes report phase (number=7)');

// VC-007: status function available
assert('VC-007', typeof status.getPdcaStatusFull === 'function',
  'status command: getPdcaStatusFull function exists');

// VC-008: next phase navigation
assert('VC-008', typeof phase.getNextPdcaPhase === 'function' && phase.getNextPdcaPhase('plan') === 'design',
  'next command: getNextPdcaPhase navigates plan->design');

// VC-009: archive support
assert('VC-009', bkitConfig.pdca && bkitConfig.pdca.docPaths && bkitConfig.pdca.docPaths.archive,
  'archive command: archive doc path configured in bkit.config.json');

// VC-010: cleanup function available
assert('VC-010', typeof status.enforceFeatureLimit === 'function',
  'cleanup command: enforceFeatureLimit function exists');

// ============================================================
// VC-011~020: pdca-status.json v2.0 data loads correctly in v3.0 module
// ============================================================
console.log('\n--- v2.0 -> v3.0 Status Migration ---');

// VC-011: migrateStatusV2toV3 exists
assert('VC-011', typeof status.migrateStatusV2toV3 === 'function',
  'migrateStatusV2toV3 function exists');

// VC-012: v2.0 structure migrates without error
let v2Status;
try {
  v2Status = {
    version: '2.0',
    lastUpdated: new Date().toISOString(),
    activeFeatures: ['test-feature'],
    primaryFeature: 'test-feature',
    features: {
      'test-feature': {
        phase: 'plan',
        phaseNumber: 1,
        matchRate: 85,
        iterationCount: 2,
        requirements: ['req-1'],
        documents: { plan: 'docs/01-plan/test.md' },
        timestamps: { started: new Date().toISOString() }
      }
    },
    pipeline: { currentPhase: 1, level: 'Dynamic', phaseHistory: [] },
    session: { startedAt: new Date().toISOString(), onboardingCompleted: true, lastActivity: new Date().toISOString() },
    history: [{ action: 'phase_transition', from: 'pm', to: 'plan' }]
  };
  const v3 = status.migrateStatusV2toV3(v2Status);
  assert('VC-012', v3.version === '3.0', 'v2.0 status migrates to v3.0 version');
} catch (e) {
  assert('VC-012', false, `v2.0 migration failed: ${e.message}`);
}

// VC-013: Features preserved after migration
try {
  const v3 = status.migrateStatusV2toV3({ ...v2Status });
  assert('VC-013', v3.features['test-feature'] && v3.features['test-feature'].phase === 'plan',
    'Feature data preserved after migration (phase=plan)');
} catch (e) {
  assert('VC-013', false, `Feature preservation check failed: ${e.message}`);
}

// VC-014: activeFeatures preserved
try {
  const v3 = status.migrateStatusV2toV3({ ...v2Status });
  assert('VC-014', Array.isArray(v3.activeFeatures) && v3.activeFeatures.includes('test-feature'),
    'activeFeatures array preserved after migration');
} catch (e) {
  assert('VC-014', false, `activeFeatures check failed: ${e.message}`);
}

// VC-015: primaryFeature preserved
try {
  const v3 = status.migrateStatusV2toV3({ ...v2Status });
  assert('VC-015', v3.primaryFeature === 'test-feature',
    'primaryFeature preserved after migration');
} catch (e) {
  assert('VC-015', false, `primaryFeature check failed: ${e.message}`);
}

// VC-016: history preserved
try {
  const v3 = status.migrateStatusV2toV3({ ...v2Status });
  assert('VC-016', Array.isArray(v3.history) && v3.history.length === 1,
    'history array preserved after migration (1 entry)');
} catch (e) {
  assert('VC-016', false, `history check failed: ${e.message}`);
}

// VC-017: pipeline preserved
try {
  const v3 = status.migrateStatusV2toV3({ ...v2Status });
  assert('VC-017', v3.pipeline && v3.pipeline.currentPhase === 1,
    'pipeline data preserved (currentPhase=1)');
} catch (e) {
  assert('VC-017', false, `pipeline check failed: ${e.message}`);
}

// VC-018: session preserved
try {
  const v3 = status.migrateStatusV2toV3({ ...v2Status });
  assert('VC-018', v3.session && v3.session.onboardingCompleted === true,
    'session data preserved (onboardingCompleted=true)');
} catch (e) {
  assert('VC-018', false, `session check failed: ${e.message}`);
}

// VC-019: feature matchRate preserved
try {
  const v3 = status.migrateStatusV2toV3({ ...v2Status });
  assert('VC-019', v3.features['test-feature'].matchRate === 85,
    'Feature matchRate preserved (85)');
} catch (e) {
  assert('VC-019', false, `matchRate check failed: ${e.message}`);
}

// VC-020: feature requirements preserved
try {
  const v3 = status.migrateStatusV2toV3({ ...v2Status });
  assert('VC-020', Array.isArray(v3.features['test-feature'].requirements) &&
    v3.features['test-feature'].requirements.includes('req-1'),
    'Feature requirements preserved (contains req-1)');
} catch (e) {
  assert('VC-020', false, `requirements check failed: ${e.message}`);
}

// ============================================================
// VC-021~030: Existing agent/skill definitions not broken
// ============================================================
console.log('\n--- Agent/Skill Definitions Integrity ---');

// VC-021: All agent .md files parseable
const agentFiles = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
let allParseable = true;
const unparseable = [];
for (const file of agentFiles) {
  const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
  if (!content.match(/^---\n[\s\S]*?\n---/)) {
    allParseable = false;
    unparseable.push(file);
  }
}
assert('VC-021', allParseable,
  `All ${agentFiles.length} agent files have valid frontmatter${unparseable.length ? ' MISSING: ' + unparseable.join(', ') : ''}`);

// VC-022: All agents have model field
let allHaveModel = true;
const missingModel = [];
for (const file of agentFiles) {
  const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
  if (!content.match(/^model:\s*\S+/m)) {
    allHaveModel = false;
    missingModel.push(file);
  }
}
assert('VC-022', allHaveModel,
  `All agents have model field${missingModel.length ? ' MISSING: ' + missingModel.join(', ') : ''}`);

// VC-023: All agents have effort field
let allHaveEffort = true;
const missingEffort = [];
for (const file of agentFiles) {
  const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
  if (!content.match(/^effort:\s*\S+/m)) {
    allHaveEffort = false;
    missingEffort.push(file);
  }
}
assert('VC-023', allHaveEffort,
  `All agents have effort field${missingEffort.length ? ' MISSING: ' + missingEffort.join(', ') : ''}`);

// VC-024: All agents have maxTurns field
let allHaveMaxTurns = true;
const missingMaxTurns = [];
for (const file of agentFiles) {
  const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
  if (!content.match(/^maxTurns:\s*\d+/m)) {
    allHaveMaxTurns = false;
    missingMaxTurns.push(file);
  }
}
assert('VC-024', allHaveMaxTurns,
  `All agents have maxTurns field${missingMaxTurns.length ? ' MISSING: ' + missingMaxTurns.join(', ') : ''}`);

// VC-025: Skill directories have SKILL.md
const skillDirs = fs.readdirSync(SKILLS_DIR).filter(d => {
  const dirPath = path.join(SKILLS_DIR, d);
  return fs.statSync(dirPath).isDirectory() && fs.existsSync(path.join(dirPath, 'SKILL.md'));
});
assert('VC-025', skillDirs.length >= 31,
  `At least 31 skills have SKILL.md (found ${skillDirs.length})`);

// VC-026: v1.6.2 core skills still present
const coreSkills = ['pdca', 'starter', 'plan-plus', 'code-review', 'development-pipeline'];
const allCorePresent = coreSkills.every(s => skillDirs.includes(s));
assert('VC-026', allCorePresent,
  'Core skills (pdca, starter, plan-plus, code-review, development-pipeline) present');

// VC-027: v1.6.2 core agents still present
const coreAgents = ['cto-lead', 'pm-lead', 'code-analyzer', 'starter-guide'];
const allCoreAgentsPresent = coreAgents.every(a =>
  fs.existsSync(path.join(AGENTS_DIR, `${a}.md`))
);
assert('VC-027', allCoreAgentsPresent,
  'Core agents (cto-lead, pm-lead, code-analyzer, starter-guide) present');

// VC-028: PDCA phase navigation chain unbroken (v2.1.1: qa phase added)
const navChain = ['plan', 'design', 'do', 'check', 'act', 'qa', 'report'];
let chainOk = true;
for (let i = 0; i < navChain.length - 1; i++) {
  if (phase.getNextPdcaPhase(navChain[i]) !== navChain[i + 1]) {
    chainOk = false;
    break;
  }
}
assert('VC-028', chainOk,
  'PDCA phase navigation chain: plan->design->do->check->act->qa->report');

// VC-029: bkit.config.json has all required PDCA docPaths
const requiredDocPaths = ['plan', 'design', 'analysis', 'report'];
const hasAllDocPaths = requiredDocPaths.every(p => bkitConfig.pdca.docPaths[p]);
assert('VC-029', hasAllDocPaths,
  'bkit.config.json has all PDCA docPaths (plan, design, analysis, report)');

// VC-030: Plugin JSON version coherent
const pluginJson = JSON.parse(fs.readFileSync(path.join(BASE_DIR, '.claude-plugin', 'plugin.json'), 'utf-8'));
assert('VC-030', pluginJson.version === bkitConfig.version,
  `plugin.json version (${pluginJson.version}) matches bkit.config.json (${bkitConfig.version})`);

// ============================================================
// Summary
// ============================================================
const result = summary('v1.6.2 Compatibility Regression Tests');
if (result.failed > 0) process.exit(1);
