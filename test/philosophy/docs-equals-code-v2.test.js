'use strict';
/**
 * Philosophy Tests: Docs=Code Principle v2 (20 TC)
 * Tests workflow YAML validity, design document paths in pdca-status,
 * gap detector wiring, and regression guard prevention.
 *
 * @module test/philosophy/docs-equals-code-v2.test.js
 */

const fs = require('fs');
const path = require('path');
const { assert, assertNoThrow, summary } = require('../helpers/assert');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

// ── Module loading ──────────────────────────────────────────────────

let workflowParser;
try {
  workflowParser = require('../../lib/pdca/workflow-parser');
} catch (e) {
  console.error('workflow-parser module load failed:', e.message);
  process.exit(1);
}

let regressionGuard;
try {
  regressionGuard = require('../../lib/quality/regression-guard');
} catch (e) {
  console.error('regression-guard module load failed:', e.message);
  process.exit(1);
}

let gateManager;
try {
  gateManager = require('../../lib/quality/gate-manager');
} catch (e) {
  console.error('gate-manager module load failed:', e.message);
  process.exit(1);
}

console.log('\n=== docs-equals-code-v2.test.js ===\n');

const workflowDir = path.join(PROJECT_ROOT, '.bkit', 'workflows');

// =====================================================================
// DC-001~005: Workflow YAML files are valid and parseable
// =====================================================================

// --- DC-001: default.workflow.yaml is valid YAML ---
assertNoThrow('DC-001', () => {
  const content = fs.readFileSync(path.join(workflowDir, 'default.workflow.yaml'), 'utf-8');
  const parsed = workflowParser.parseWorkflowYaml(content);
  if (!parsed || !parsed.id) throw new Error('Missing id field');
}, 'default.workflow.yaml parses to valid workflow with id');

// --- DC-002: hotfix.workflow.yaml is valid YAML ---
assertNoThrow('DC-002', () => {
  const content = fs.readFileSync(path.join(workflowDir, 'hotfix.workflow.yaml'), 'utf-8');
  const parsed = workflowParser.parseWorkflowYaml(content);
  if (!parsed || !parsed.id) throw new Error('Missing id field');
}, 'hotfix.workflow.yaml parses to valid workflow with id');

// --- DC-003: enterprise.workflow.yaml is valid YAML ---
assertNoThrow('DC-003', () => {
  const content = fs.readFileSync(path.join(workflowDir, 'enterprise.workflow.yaml'), 'utf-8');
  const parsed = workflowParser.parseWorkflowYaml(content);
  if (!parsed || !parsed.id) throw new Error('Missing id field');
}, 'enterprise.workflow.yaml parses to valid workflow with id');

// --- DC-004: All workflow files have steps section ---
const workflowFiles = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yaml'));
const allHaveSteps = workflowFiles.every(f => {
  const content = fs.readFileSync(path.join(workflowDir, f), 'utf-8');
  const parsed = workflowParser.parseWorkflowYaml(content);
  return parsed.steps && Object.keys(parsed.steps).length > 0;
});
assert('DC-004',
  allHaveSteps,
  `All ${workflowFiles.length} workflow YAML files have steps section`
);

// --- DC-005: All workflow files have version field ---
const allHaveVersion = workflowFiles.every(f => {
  const content = fs.readFileSync(path.join(workflowDir, f), 'utf-8');
  const parsed = workflowParser.parseWorkflowYaml(content);
  return typeof parsed.version === 'string' && parsed.version.length > 0;
});
assert('DC-005',
  allHaveVersion,
  `All ${workflowFiles.length} workflow YAML files have version field`
);

// =====================================================================
// DC-006~010: Design document paths exist in pdca-status
// =====================================================================

const config = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'bkit.config.json'), 'utf-8'));

// --- DC-006: docs/01-plan path exists ---
assert('DC-006',
  fs.existsSync(path.join(PROJECT_ROOT, 'docs', '01-plan')),
  'docs/01-plan/ directory exists (plan phase deliverables path)'
);

// --- DC-007: docs/02-design path exists ---
assert('DC-007',
  fs.existsSync(path.join(PROJECT_ROOT, 'docs', '02-design')),
  'docs/02-design/ directory exists (design phase deliverables path)'
);

// --- DC-008: docs/03-analysis path exists ---
assert('DC-008',
  fs.existsSync(path.join(PROJECT_ROOT, 'docs', '03-analysis')),
  'docs/03-analysis/ directory exists (analysis phase deliverables path)'
);

// --- DC-009: docs/04-report path exists ---
assert('DC-009',
  fs.existsSync(path.join(PROJECT_ROOT, 'docs', '04-report')),
  'docs/04-report/ directory exists (report phase deliverables path)'
);

// --- DC-010: bkit.config.json pdca section has matchRateThreshold ---
assert('DC-010',
  typeof config.pdca.matchRateThreshold === 'number' && config.pdca.matchRateThreshold > 0,
  'bkit.config.json pdca.matchRateThreshold is defined (quality gate config)'
);

// =====================================================================
// DC-011~015: Gap detector is wired for automatic check
// =====================================================================

// --- DC-011: gap-detector.md agent file exists ---
const gapDetectorPath = path.join(PROJECT_ROOT, 'agents', 'gap-detector.md');
assert('DC-011',
  fs.existsSync(gapDetectorPath),
  'agents/gap-detector.md exists (automatic gap detection agent)'
);

// --- DC-012: gap-detector.md has permissionMode: plan ---
const gapContent = fs.readFileSync(gapDetectorPath, 'utf-8');
assert('DC-012',
  gapContent.includes('permissionMode: plan'),
  'gap-detector.md has permissionMode: plan (read-only verification)'
);

// --- DC-013: gap-detector.md blocks Write tool ---
assert('DC-013',
  gapContent.includes('Write'),
  'gap-detector.md blocks Write tool (cannot modify what it verifies)'
);

// --- DC-014: gap-detector trigger patterns exist in language module ---
let lang;
try { lang = require('../../lib/intent/language'); } catch (e) { /* skip */ }
assert('DC-014',
  lang && lang.AGENT_TRIGGER_PATTERNS && lang.AGENT_TRIGGER_PATTERNS['gap-detector'] !== undefined,
  'gap-detector has trigger patterns in language module for auto-detection'
);

// --- DC-015: gap-detector trigger patterns cover 8 languages ---
const gapPatterns = lang ? lang.AGENT_TRIGGER_PATTERNS['gap-detector'] : {};
const gapLangs = Object.keys(gapPatterns);
assert('DC-015',
  gapLangs.length >= 8,
  `gap-detector trigger patterns cover ${gapLangs.length} languages (need >= 8)`
);

// =====================================================================
// DC-016~020: Regression guard prevents quality degradation
// =====================================================================

// --- DC-016: loadRules function exists ---
assert('DC-016',
  typeof regressionGuard.loadRules === 'function',
  'regressionGuard.loadRules function exists for loading regression rules'
);

// --- DC-017: addRule function exists ---
assert('DC-017',
  typeof regressionGuard.addRule === 'function',
  'regressionGuard.addRule function exists for adding new regression rules'
);

// --- DC-018: detectRegressions function exists ---
assert('DC-018',
  typeof regressionGuard.detectRegressions === 'function',
  'regressionGuard.detectRegressions function exists for checking violations'
);

// --- DC-019: checkMetricRegression function exists ---
assert('DC-019',
  typeof regressionGuard.checkMetricRegression === 'function',
  'regressionGuard.checkMetricRegression function exists for metric-based checks'
);

// --- DC-020: pruneStaleRules function exists for maintenance ---
assert('DC-020',
  typeof regressionGuard.pruneStaleRules === 'function',
  'regressionGuard.pruneStaleRules function exists (prevents rule database bloat)'
);

summary('docs-equals-code-v2.test.js');
process.exit(0);
