'use strict';
/**
 * Unit Tests for lib/team/orchestrator.js
 * 45 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/team/orchestrator');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

let stratMod;
try {
  stratMod = require('../../lib/team/strategy');
} catch (e) {
  console.error('Strategy module load failed:', e.message);
  process.exit(1);
}

let passed = 0, failed = 0, total = 0;

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; console.error(`  FAIL: ${id} - ${message}`); }
}

console.log('\n=== orchestrator.test.js ===\n');

// --- Exports (8 total) ---
assert('U-ORC-001', typeof mod.selectOrchestrationPattern === 'function', 'selectOrchestrationPattern exported');
assert('U-ORC-002', typeof mod.composeTeamForPhase === 'function', 'composeTeamForPhase exported');
assert('U-ORC-003', typeof mod.generateSpawnTeamCommand === 'function', 'generateSpawnTeamCommand exported');
assert('U-ORC-004', typeof mod.createPhaseContext === 'function', 'createPhaseContext exported');
assert('U-ORC-005', typeof mod.shouldRecomposeTeam === 'function', 'shouldRecomposeTeam exported');
assert('U-ORC-006', typeof mod.generateSubagentSpawnPrompt === 'function', 'generateSubagentSpawnPrompt exported');
assert('U-ORC-007', mod.PHASE_PATTERN_MAP !== undefined, 'PHASE_PATTERN_MAP exported');
assert('U-ORC-008', mod.DEFAULT_PHASE_PATTERN_MAP !== undefined, 'DEFAULT_PHASE_PATTERN_MAP exported');

// --- PHASE_PATTERN_MAP === DEFAULT_PHASE_PATTERN_MAP alias ---
assert('U-ORC-009', mod.PHASE_PATTERN_MAP === mod.DEFAULT_PHASE_PATTERN_MAP,
  'PHASE_PATTERN_MAP is same reference as DEFAULT_PHASE_PATTERN_MAP');

// --- selectOrchestrationPattern: Config -> Code sync ---
// Starter always returns 'single'
assert('U-ORC-010', mod.selectOrchestrationPattern('plan', 'Starter') === 'single', 'Starter plan -> single');
assert('U-ORC-011', mod.selectOrchestrationPattern('do', 'Starter') === 'single', 'Starter do -> single');
assert('U-ORC-012', mod.selectOrchestrationPattern('check', 'Starter') === 'single', 'Starter check -> single');

// Dynamic patterns (from config or fallback)
assert('U-ORC-013', mod.selectOrchestrationPattern('plan', 'Dynamic') === 'leader', 'Dynamic plan -> leader');
assert('U-ORC-014', mod.selectOrchestrationPattern('design', 'Dynamic') === 'leader', 'Dynamic design -> leader');
assert('U-ORC-015', mod.selectOrchestrationPattern('do', 'Dynamic') === 'swarm', 'Dynamic do -> swarm');
assert('U-ORC-016', mod.selectOrchestrationPattern('check', 'Dynamic') === 'council', 'Dynamic check -> council');
assert('U-ORC-017', mod.selectOrchestrationPattern('act', 'Dynamic') === 'leader', 'Dynamic act -> leader');

// Enterprise patterns
assert('U-ORC-018', mod.selectOrchestrationPattern('plan', 'Enterprise') === 'leader', 'Enterprise plan -> leader');
assert('U-ORC-019', mod.selectOrchestrationPattern('design', 'Enterprise') === 'council', 'Enterprise design -> council');
assert('U-ORC-020', mod.selectOrchestrationPattern('do', 'Enterprise') === 'swarm', 'Enterprise do -> swarm');
assert('U-ORC-021', mod.selectOrchestrationPattern('check', 'Enterprise') === 'council', 'Enterprise check -> council');
assert('U-ORC-022', mod.selectOrchestrationPattern('act', 'Enterprise') === 'watchdog', 'Enterprise act -> watchdog');

// Unknown level fallback
assert('U-ORC-023', mod.selectOrchestrationPattern('plan', 'Unknown') === 'single', 'Unknown level -> single');

// --- composeTeamForPhase ---
const dynTeam = mod.composeTeamForPhase('do', 'Dynamic', 'test-feature');
assert('U-ORC-024', dynTeam !== null, 'Dynamic do phase has team');
assert('U-ORC-025', dynTeam.pattern === 'swarm', 'Dynamic do pattern is swarm');
assert('U-ORC-026', Array.isArray(dynTeam.teammates), 'teammates is array');
assert('U-ORC-027', dynTeam.teammates.length > 0, 'has teammates');
assert('U-ORC-028', dynTeam.teammates[0].name !== undefined, 'Teammate has name');
assert('U-ORC-029', dynTeam.teammates[0].agentType !== undefined, 'Teammate has agentType');
assert('U-ORC-030', dynTeam.teammates[0].task !== undefined, 'Teammate has task');
assert('U-ORC-031', dynTeam.phaseStrategy === 'parallel', 'Dynamic do phaseStrategy is parallel');

// Enterprise design
const entTeam = mod.composeTeamForPhase('design', 'Enterprise', 'feat');
assert('U-ORC-032', entTeam !== null, 'Enterprise design has team');
assert('U-ORC-033', entTeam.pattern === 'council', 'Enterprise design is council');
assert('U-ORC-034', entTeam.ctoAgent === 'cto-lead', 'CTO agent is cto-lead');

// Starter returns null (no strategy)
assert('U-ORC-035', mod.composeTeamForPhase('do', 'Starter', 'feat') === null, 'Starter returns null');

// No roles for phase
const dynPlan = mod.composeTeamForPhase('plan', 'Dynamic', 'feat');
assert('U-ORC-036', dynPlan === null, 'Dynamic plan phase has no roles -> null');

// --- shouldRecomposeTeam ---
assert('U-ORC-037', typeof mod.shouldRecomposeTeam('do', 'check', 'Dynamic') === 'boolean', 'Returns boolean');
assert('U-ORC-038', mod.shouldRecomposeTeam('do', 'check', 'Dynamic') === true, 'do->check recomposes (different roles)');
assert('U-ORC-039', mod.shouldRecomposeTeam('do', 'act', 'Dynamic') === true, 'do->act different roles (developer+frontend vs developer)');
assert('U-ORC-040', mod.shouldRecomposeTeam('do', 'check', 'Starter') === false, 'Starter no strategy -> false');

// --- generateSubagentSpawnPrompt ---
const prompt = mod.generateSubagentSpawnPrompt(
  { description: 'Backend dev', task: 'Implement API', files: ['lib/api.js'] },
  { feature: 'auth', phase: 'do', level: 'Dynamic', pattern: 'swarm' }
);
assert('U-ORC-041', prompt.includes('Feature: auth'), 'Prompt contains feature');
assert('U-ORC-042', prompt.includes('do phase'), 'Prompt contains phase');
assert('U-ORC-043', prompt.includes('lib/api.js'), 'Prompt contains file');
assert('U-ORC-044', prompt.includes('bkit conventions'), 'Prompt contains conventions');

// No files
const prompt2 = mod.generateSubagentSpawnPrompt(
  { description: 'Dev', task: 'Do work', files: [] },
  { feature: 'f', phase: 'do', level: 'Dynamic', pattern: 'leader' }
);
assert('U-ORC-045', prompt2.includes('no specific file restriction'), 'Empty files shows fallback');

// With previousOutput
const prompt3 = mod.generateSubagentSpawnPrompt(
  { description: 'Dev', task: 'Fix', files: [] },
  { feature: 'f', phase: 'act', level: 'Dynamic', pattern: 'leader', previousOutput: 'Previous result data' }
);
assert('U-ORC-046', prompt3.includes('Previous Phase Output'), 'Previous output included');
assert('U-ORC-047', prompt3.includes('Previous result data'), 'Previous output content included');

// --- createPhaseContext ---
const ctx = mod.createPhaseContext('do', 'my-feature', { level: 'Dynamic' });
assert('U-ORC-048', ctx.phase === 'do', 'Context phase');
assert('U-ORC-049', ctx.feature === 'my-feature', 'Context feature');
assert('U-ORC-050', ctx.level === 'Dynamic', 'Context level');
assert('U-ORC-051', ctx.pattern === 'swarm', 'Context pattern for Dynamic do');
assert('U-ORC-052', typeof ctx.context === 'object', 'Context object exists');
assert('U-ORC-053', typeof ctx.context.teamAvailable === 'boolean', 'teamAvailable is boolean');

console.log(`\n${'='.repeat(50)}`);
console.log(`orchestrator.test.js: ${passed}/${total} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
