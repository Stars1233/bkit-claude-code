'use strict';
/**
 * Unit Tests for lib/team/coordinator.js
 * 50 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/team/coordinator');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

let passed = 0, failed = 0, total = 0;

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; console.error(`  FAIL: ${id} - ${message}`); }
}

console.log('\n=== coordinator.test.js ===\n');

// --- 7 Exports ---
assert('U-CRD-001', typeof mod.isTeamModeAvailable === 'function', 'isTeamModeAvailable exported');
assert('U-CRD-002', typeof mod.getTeamConfig === 'function', 'getTeamConfig exported');
assert('U-CRD-003', typeof mod.generateTeamStrategy === 'function', 'generateTeamStrategy exported');
assert('U-CRD-004', typeof mod.formatTeamStatus === 'function', 'formatTeamStatus exported');
assert('U-CRD-005', typeof mod.suggestTeamMode === 'function', 'suggestTeamMode exported');
assert('U-CRD-006', typeof mod.buildAgentTeamPlan === 'function', 'buildAgentTeamPlan exported');
assert('U-CRD-007', typeof mod.getFileOwnership === 'function', 'getFileOwnership exported');

// --- isTeamModeAvailable ---
const origEnv = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;

process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';
assert('U-CRD-008', mod.isTeamModeAvailable() === true, 'Available when env=1');

process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '0';
assert('U-CRD-009', mod.isTeamModeAvailable() === false, 'Not available when env=0');

delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
assert('U-CRD-010', mod.isTeamModeAvailable() === false, 'Not available when env not set');

// Restore
if (origEnv !== undefined) {
  process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = origEnv;
} else {
  delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
}

// --- getTeamConfig ---
const config = mod.getTeamConfig();
assert('U-CRD-011', typeof config === 'object', 'Config is object');
assert('U-CRD-012', typeof config.enabled === 'boolean', 'enabled is boolean');
assert('U-CRD-013', typeof config.displayMode === 'string', 'displayMode is string');
assert('U-CRD-014', typeof config.maxTeammates === 'number', 'maxTeammates is number');
assert('U-CRD-015', typeof config.delegateMode === 'boolean', 'delegateMode is boolean');
assert('U-CRD-016', config.maxTeammates >= 1, 'maxTeammates >= 1');

// --- generateTeamStrategy ---
const dynStrategy = mod.generateTeamStrategy('Dynamic', 'feat');
assert('U-CRD-017', dynStrategy !== null, 'Dynamic strategy exists');
assert('U-CRD-018', dynStrategy.teammates === 3, 'Dynamic has 3 teammates');
assert('U-CRD-019', dynStrategy.ctoAgent === 'cto-lead', 'Dynamic CTO is cto-lead');
assert('U-CRD-020', Array.isArray(dynStrategy.roles), 'Dynamic has roles array');

const entStrategy = mod.generateTeamStrategy('Enterprise', 'feat');
assert('U-CRD-021', entStrategy !== null, 'Enterprise strategy exists');
assert('U-CRD-022', entStrategy.teammates === 6, 'Enterprise has 6 teammates');

const starterStrategy = mod.generateTeamStrategy('Starter', 'feat');
// Starter is null in TEAM_STRATEGIES, falls back to Dynamic
assert('U-CRD-023', starterStrategy !== null, 'Starter falls back to Dynamic strategy');

// --- formatTeamStatus ---
const status1 = mod.formatTeamStatus({}, null);
assert('U-CRD-024', status1.includes('Agent Teams Status'), 'Status header');
assert('U-CRD-025', status1.includes('Available:'), 'Contains available');
assert('U-CRD-026', status1.includes('Enabled:'), 'Contains enabled');
assert('U-CRD-027', status1.includes('Display Mode:'), 'Contains display mode');
assert('U-CRD-028', status1.includes('Max Teammates:'), 'Contains max teammates');

const status2 = mod.formatTeamStatus({}, {
  primaryFeature: 'auth',
  features: { auth: { phase: 'do', matchRate: 85 } }
});
assert('U-CRD-029', status2.includes('PDCA Integration'), 'PDCA section present');
assert('U-CRD-030', status2.includes('Feature: auth'), 'Feature name in status');
assert('U-CRD-031', status2.includes('Phase: do'), 'Phase in status');
assert('U-CRD-032', status2.includes('Match Rate: 85%'), 'Match rate in status');

// --- suggestTeamMode ---
// Without Agent Teams env var
const origEnv2 = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;

assert('U-CRD-033', mod.suggestTeamMode('test') === null, 'No suggestion without Agent Teams');

process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';

assert('U-CRD-034', mod.suggestTeamMode('test', { level: 'Starter' }) === null, 'Starter -> null');

const longMsg = 'x'.repeat(1001);
const suggest1 = mod.suggestTeamMode(longMsg, { level: 'Dynamic' });
assert('U-CRD-035', suggest1 !== null && suggest1.suggest === true, 'Long message suggests team');
assert('U-CRD-036', suggest1.level === 'Dynamic', 'Suggestion has level');

// Short message without team keywords
const suggest2 = mod.suggestTeamMode('hello', { level: 'Dynamic' });
assert('U-CRD-037', suggest2 === null, 'Short non-team message -> null');

// Restore
if (origEnv2 !== undefined) {
  process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = origEnv2;
} else {
  delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
}

// --- buildAgentTeamPlan ---
const origEnv3 = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';

// CTO team
const ctoPlan = mod.buildAgentTeamPlan('cto', 'auth-feature', { phase: 'do', level: 'Dynamic' });
assert('U-CRD-038', ctoPlan !== null, 'CTO plan not null');
assert('U-CRD-039', ctoPlan.teamName === 'bkit-cto-auth-feature', 'CTO team name format');
assert('U-CRD-040', Array.isArray(ctoPlan.teammates), 'CTO has teammates array');
assert('U-CRD-041', ctoPlan.teammates.length > 0, 'CTO has at least 1 teammate');
assert('U-CRD-042', ctoPlan.phase === 'do', 'CTO plan phase');
assert('U-CRD-043', Array.isArray(ctoPlan.taskPlan), 'CTO has taskPlan');

// PM team
const pmPlan = mod.buildAgentTeamPlan('pm', 'auth-feature', { level: 'Dynamic' });
assert('U-CRD-044', pmPlan !== null, 'PM plan not null');
assert('U-CRD-045', pmPlan.teamName === 'bkit-pm-auth-feature', 'PM team name format');
assert('U-CRD-046', pmPlan.teammates.length === 4, 'PM team has 4 roles');

// PM roles check
const pmRoleNames = pmPlan.teammates.map(t => t.name);
assert('U-CRD-047', pmRoleNames.includes('pm-discovery'), 'PM has discovery role');
assert('U-CRD-048', pmRoleNames.includes('pm-strategy'), 'PM has strategy role');
assert('U-CRD-049', pmRoleNames.includes('pm-research'), 'PM has research role');
assert('U-CRD-050', pmRoleNames.includes('pm-prd'), 'PM has prd role');

// Starter level -> null
const starterPlan = mod.buildAgentTeamPlan('cto', 'feat', { level: 'Starter' });
assert('U-CRD-051', starterPlan === null, 'Starter level returns null');

// Agent Teams disabled -> null
delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
const disabledPlan = mod.buildAgentTeamPlan('cto', 'feat', { level: 'Dynamic' });
assert('U-CRD-052', disabledPlan === null, 'Disabled Agent Teams returns null');

// Restore
if (origEnv3 !== undefined) {
  process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = origEnv3;
} else {
  delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
}

// --- getFileOwnership ---
const planFiles = mod.getFileOwnership('plan', 'architect', 'auth');
assert('U-CRD-053', Array.isArray(planFiles), 'Returns array');
assert('U-CRD-054', planFiles.length > 0, 'Plan architect has files');
assert('U-CRD-055', planFiles[0].includes('plan'), 'Plan files include plan path');

const doFiles = mod.getFileOwnership('do', 'developer', 'auth');
assert('U-CRD-056', doFiles.some(f => f.includes('lib')), 'Developer do files include lib');

const checkFiles = mod.getFileOwnership('check', 'qa', 'test-feat');
assert('U-CRD-057', checkFiles.some(f => f.includes('analysis')), 'QA check files include analysis');

const defaultFiles = mod.getFileOwnership('do', 'unknown-role', 'feat');
assert('U-CRD-058', defaultFiles.length > 0, 'Unknown role gets default files');

console.log(`\n${'='.repeat(50)}`);
console.log(`coordinator.test.js: ${passed}/${total} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
