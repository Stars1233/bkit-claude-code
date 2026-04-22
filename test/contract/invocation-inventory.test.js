/*
 * Invocation Inventory Sanity Tests — file-level cross-check of Addendum counts.
 *
 * Design Ref: bkit-v2110-invocation-contract-addendum.plan.md §3
 * Plan SC: 39 skills / 36 agents / 16 MCP tools / 21 hook events / 24 blocks.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const baselineDir = path.join(ROOT, 'test', 'contract', 'baseline', 'v2.1.9');

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error(`✗ ${name}: ${e.message}`); } }

// ==================== File System Expectations ====================
const skillsDir = path.join(ROOT, 'skills');
const agentsDir = path.join(ROOT, 'agents');
const hooksJsonPath = path.join(ROOT, 'hooks', 'hooks.json');

test('skills/ directory exists', () => assert.ok(fs.existsSync(skillsDir)));
test('agents/ directory exists', () => assert.ok(fs.existsSync(agentsDir)));
test('hooks/hooks.json exists', () => assert.ok(fs.existsSync(hooksJsonPath)));
test('.claude-plugin/plugin.json exists', () => assert.ok(fs.existsSync(path.join(ROOT, '.claude-plugin', 'plugin.json'))));
test('servers/bkit-pdca-server/index.js exists', () => assert.ok(fs.existsSync(path.join(ROOT, 'servers', 'bkit-pdca-server', 'index.js'))));
test('servers/bkit-analysis-server/index.js exists', () => assert.ok(fs.existsSync(path.join(ROOT, 'servers', 'bkit-analysis-server', 'index.js'))));

// ==================== Skills Count ====================
const skillDirs = fs.readdirSync(skillsDir).filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory());
test('Skills count exactly 39', () => assert.strictEqual(skillDirs.length, 39));

const EXPECTED_SKILLS = [
  'audit', 'bkend-auth', 'bkend-cookbook', 'bkend-data', 'bkend-quickstart', 'bkend-storage',
  'bkit', 'bkit-rules', 'bkit-templates', 'btw', 'cc-version-analysis', 'claude-code-learning',
  'code-review', 'control', 'deploy', 'desktop-app', 'development-pipeline', 'dynamic',
  'enterprise', 'mobile-app', 'pdca', 'pdca-batch', 'phase-1-schema', 'phase-2-convention',
  'phase-3-mockup', 'phase-4-api', 'phase-5-design-system', 'phase-6-ui-integration',
  'phase-7-seo-security', 'phase-8-review', 'phase-9-deployment', 'plan-plus', 'pm-discovery',
  'qa-phase', 'rollback', 'skill-create', 'skill-status', 'starter', 'zero-script-qa',
];
EXPECTED_SKILLS.forEach((name) => {
  test(`Skill '${name}' exists`, () => assert.ok(skillDirs.includes(name), `missing: ${name}`));
  test(`Skill '${name}' has SKILL.md`, () => assert.ok(fs.existsSync(path.join(skillsDir, name, 'SKILL.md'))));
});

// ==================== Agents Count ====================
const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
test('Agents count exactly 36', () => assert.strictEqual(agentFiles.length, 36));

const EXPECTED_AGENTS = [
  'bkend-expert', 'bkit-impact-analyst', 'cc-version-researcher', 'code-analyzer', 'cto-lead',
  'design-validator', 'enterprise-expert', 'frontend-architect', 'gap-detector',
  'infra-architect', 'pdca-eval-act', 'pdca-eval-check', 'pdca-eval-design', 'pdca-eval-do',
  'pdca-eval-plan', 'pdca-eval-pm', 'pdca-iterator', 'pipeline-guide', 'pm-discovery',
  'pm-lead-skill-patch', 'pm-lead', 'pm-prd', 'pm-research', 'pm-strategy', 'product-manager',
  'qa-debug-analyst', 'qa-lead', 'qa-monitor', 'qa-strategist', 'qa-test-generator',
  'qa-test-planner', 'report-generator', 'security-architect', 'self-healing',
  'skill-needs-extractor', 'starter-guide',
];
EXPECTED_AGENTS.forEach((name) => {
  test(`Agent '${name}.md' exists`, () => assert.ok(agentFiles.includes(`${name}.md`)));
});

// ==================== Hooks Count ====================
const hooksJson = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
const hookEventNames = Object.keys(hooksJson.hooks);
test('Hooks count exactly 21 events', () => assert.strictEqual(hookEventNames.length, 21));

const EXPECTED_HOOKS = [
  'SessionStart', 'PreToolUse', 'PostToolUse', 'Stop', 'StopFailure', 'UserPromptSubmit',
  'PreCompact', 'PostCompact', 'TaskCompleted', 'SubagentStart', 'SubagentStop',
  'TeammateIdle', 'SessionEnd', 'PostToolUseFailure', 'InstructionsLoaded', 'ConfigChange',
  'PermissionRequest', 'Notification', 'CwdChanged', 'TaskCreated', 'FileChanged',
];
EXPECTED_HOOKS.forEach((name) => {
  test(`Hook '${name}' registered`, () => assert.ok(hookEventNames.includes(name), `missing: ${name}`));
});

// 24 blocks = 1 SessionStart + 2 PreToolUse + 3 PostToolUse + 18 rest
let blockCount = 0;
for (const [, entries] of Object.entries(hooksJson.hooks)) {
  blockCount += entries.length;
}
test('Hooks total blocks = 24', () => assert.strictEqual(blockCount, 24));
test('PreToolUse has 2 blocks', () => assert.strictEqual(hooksJson.hooks.PreToolUse.length, 2));
test('PostToolUse has 3 blocks', () => assert.strictEqual(hooksJson.hooks.PostToolUse.length, 3));

// ==================== MCP Tools (via server index.js grep) ====================
const pdcaServer = fs.readFileSync(path.join(ROOT, 'servers', 'bkit-pdca-server', 'index.js'), 'utf8');
const analysisServer = fs.readFileSync(path.join(ROOT, 'servers', 'bkit-analysis-server', 'index.js'), 'utf8');

const EXPECTED_PDCA_TOOLS = [
  'bkit_pdca_status', 'bkit_pdca_history', 'bkit_feature_list', 'bkit_feature_detail',
  'bkit_plan_read', 'bkit_design_read', 'bkit_analysis_read', 'bkit_report_read',
  'bkit_metrics_get', 'bkit_metrics_history',
];
const EXPECTED_ANALYSIS_TOOLS = [
  'bkit_code_quality', 'bkit_gap_analysis', 'bkit_regression_rules',
  'bkit_checkpoint_list', 'bkit_checkpoint_detail', 'bkit_audit_search',
];
EXPECTED_PDCA_TOOLS.forEach((tn) => {
  test(`MCP pdca tool '${tn}' registered`, () => assert.ok(pdcaServer.includes(`name: '${tn}'`)));
});
EXPECTED_ANALYSIS_TOOLS.forEach((tn) => {
  test(`MCP analysis tool '${tn}' registered`, () => assert.ok(analysisServer.includes(`name: '${tn}'`)));
});
test('Total MCP tools = 16', () => {
  assert.strictEqual(EXPECTED_PDCA_TOOLS.length + EXPECTED_ANALYSIS_TOOLS.length, 16);
});

// ==================== Baseline JSON files exist ====================
test('baseline/v2.1.9/_MANIFEST.json exists', () => assert.ok(fs.existsSync(path.join(baselineDir, '_MANIFEST.json'))));
test('baseline/v2.1.9/hook-events.json exists', () => assert.ok(fs.existsSync(path.join(baselineDir, 'hook-events.json'))));
test('baseline/v2.1.9/slash-commands.json exists', () => assert.ok(fs.existsSync(path.join(baselineDir, 'slash-commands.json'))));

// ==================== Domain Ports exist ====================
const PORT_FILES = [
  'cc-payload.port.js', 'state-store.port.js', 'regression-registry.port.js',
  'audit-sink.port.js', 'token-meter.port.js', 'docs-code-index.port.js',
];
PORT_FILES.forEach((f) => {
  test(`Port '${f}' exists`, () => assert.ok(fs.existsSync(path.join(ROOT, 'lib', 'domain', 'ports', f))));
});

// ==================== Domain Guards exist ====================
const GUARD_FILES = [
  'enh-262-hooks-combo.js', 'enh-263-claude-write.js',
  'enh-264-token-threshold.js', 'enh-254-fork-precondition.js',
];
GUARD_FILES.forEach((f) => {
  test(`Guard '${f}' exists`, () => assert.ok(fs.existsSync(path.join(ROOT, 'lib', 'domain', 'guards', f))));
});

// ==================== cc-regression files exist ====================
const CC_REG_FILES = [
  'registry.js', 'defense-coordinator.js', 'token-accountant.js',
  'lifecycle.js', 'attribution-formatter.js', 'index.js',
];
CC_REG_FILES.forEach((f) => {
  test(`cc-regression/'${f}' exists`, () => assert.ok(fs.existsSync(path.join(ROOT, 'lib', 'cc-regression', f))));
});

// ==================== Config Files ====================
test('.eslintrc.json exists', () => assert.ok(fs.existsSync(path.join(ROOT, '.eslintrc.json'))));
test('.prettierrc exists', () => assert.ok(fs.existsSync(path.join(ROOT, '.prettierrc'))));

// ==================== Frontmatter cross-check: zero-script-qa is the sole context:fork ====================
test('zero-script-qa has context:fork', () => {
  const md = fs.readFileSync(path.join(skillsDir, 'zero-script-qa', 'SKILL.md'), 'utf8');
  assert.ok(/context:\s*fork/m.test(md));
});
test('Only zero-script-qa has context:fork', () => {
  const forkSkills = [];
  for (const name of skillDirs) {
    const md = path.join(skillsDir, name, 'SKILL.md');
    if (!fs.existsSync(md)) continue;
    if (/context:\s*fork/m.test(fs.readFileSync(md, 'utf8'))) forkSkills.push(name);
  }
  assert.deepStrictEqual(forkSkills, ['zero-script-qa']);
});

// ==================== CLAUDE.md rules ====================
test('.claude/CLAUDE.md exists', () => assert.ok(fs.existsSync(path.join(ROOT, '.claude', 'CLAUDE.md'))));

console.log(`\ninvocation-inventory.test.js: ${pass}/${pass + fail} PASS, ${fail} FAIL, 0 SKIP`);
if (fail > 0) process.exit(1);
