/*
 * Guards Edge Case Tests — 4 Guards × many edge cases for ENH-262/263/264/254.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.1
 * Plan SC: Every Guard must be exhaustively tested before v2.1.10 release.
 */

const assert = require('node:assert');

const enh262 = require('../../lib/domain/guards/enh-262-hooks-combo');
const enh263 = require('../../lib/domain/guards/enh-263-claude-write');
const enh264 = require('../../lib/domain/guards/enh-264-token-threshold');
const enh254 = require('../../lib/domain/guards/enh-254-fork-precondition');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; } catch (e) { fail++; console.error(`✗ ${name}: ${e.message}`); }
}

// ==================== ENH-262 ====================
test('ENH-262 null ctx', () => assert.deepStrictEqual(enh262.check(null), { hit: false }));
test('ENH-262 undefined ctx', () => assert.deepStrictEqual(enh262.check(undefined), { hit: false }));
test('ENH-262 empty ctx', () => assert.deepStrictEqual(enh262.check({}), { hit: false }));
test('ENH-262 string ctx', () => assert.deepStrictEqual(enh262.check('not an object'), { hit: false }));
test('ENH-262 wrong tool Write', () => assert.deepStrictEqual(enh262.check({ tool: 'Write' }), { hit: false }));
test('ENH-262 wrong tool Edit', () => assert.deepStrictEqual(enh262.check({ tool: 'Edit' }), { hit: false }));
test('ENH-262 bash no env', () => assert.deepStrictEqual(enh262.check({ tool: 'Bash' }), { hit: false }));
test('ENH-262 bash env false', () => assert.deepStrictEqual(enh262.check({ tool: 'Bash', envOverrides: { dangerouslyDisableSandbox: false } }), { hit: false }));
test('ENH-262 bash env true but no decision', () => assert.deepStrictEqual(enh262.check({ tool: 'Bash', envOverrides: { dangerouslyDisableSandbox: true } }), { hit: false }));
test('ENH-262 bash env true deny', () => assert.deepStrictEqual(enh262.check({ tool: 'Bash', envOverrides: { dangerouslyDisableSandbox: true }, permissionDecision: 'deny' }), { hit: false }));
test('ENH-262 bash env true ask', () => assert.deepStrictEqual(enh262.check({ tool: 'Bash', envOverrides: { dangerouslyDisableSandbox: true }, permissionDecision: 'ask' }), { hit: false }));
test('ENH-262 bash env true defer', () => assert.deepStrictEqual(enh262.check({ tool: 'Bash', envOverrides: { dangerouslyDisableSandbox: true }, permissionDecision: 'defer' }), { hit: false }));
test('ENH-262 full hit', () => {
  const r = enh262.check({ tool: 'Bash', envOverrides: { dangerouslyDisableSandbox: true }, permissionDecision: 'allow' });
  assert.strictEqual(r.hit, true);
  assert.strictEqual(r.meta.id, 'ENH-262');
  assert.strictEqual(r.meta.severity, 'HIGH');
  assert.ok(r.meta.ccIssue.includes('51798'));
});
// removeWhen edge cases
test('ENH-262 removeWhen null', () => assert.strictEqual(enh262.removeWhen(null), false));
test('ENH-262 removeWhen undefined', () => assert.strictEqual(enh262.removeWhen(undefined), false));
test('ENH-262 removeWhen empty string', () => assert.strictEqual(enh262.removeWhen(''), false));
test('ENH-262 removeWhen non-string', () => assert.strictEqual(enh262.removeWhen(42), false));
test('ENH-262 removeWhen v1.x.x', () => assert.strictEqual(enh262.removeWhen('1.0.0'), false));
test('ENH-262 removeWhen v2.0.x', () => assert.strictEqual(enh262.removeWhen('2.0.999'), false));
test('ENH-262 removeWhen v2.1.117', () => assert.strictEqual(enh262.removeWhen('2.1.117'), false));
test('ENH-262 removeWhen v2.1.118', () => assert.strictEqual(enh262.removeWhen('2.1.118'), true));
test('ENH-262 removeWhen v2.1.200', () => assert.strictEqual(enh262.removeWhen('2.1.200'), true));
test('ENH-262 removeWhen v2.2.0', () => assert.strictEqual(enh262.removeWhen('2.2.0'), true));
test('ENH-262 removeWhen v3.0.0', () => assert.strictEqual(enh262.removeWhen('3.0.0'), true));

// ==================== ENH-263 ====================
const base263 = { tool: 'Write', bypassPermissions: true, permissionDecision: 'allow' };
test('ENH-263 null ctx', () => assert.deepStrictEqual(enh263.check(null), { hit: false }));
test('ENH-263 undefined ctx', () => assert.deepStrictEqual(enh263.check(undefined), { hit: false }));
test('ENH-263 non-object', () => assert.deepStrictEqual(enh263.check(true), { hit: false }));
test('ENH-263 wrong tool Read', () => assert.deepStrictEqual(enh263.check({ ...base263, tool: 'Read' }), { hit: false }));
test('ENH-263 wrong tool Bash', () => assert.deepStrictEqual(enh263.check({ ...base263, tool: 'Bash' }), { hit: false }));
test('ENH-263 no bypass', () => assert.deepStrictEqual(enh263.check({ ...base263, bypassPermissions: false, filePath: '.claude/agents/x.md' }), { hit: false }));
test('ENH-263 no decision allow', () => assert.deepStrictEqual(enh263.check({ ...base263, permissionDecision: 'deny', filePath: '.claude/agents/x.md' }), { hit: false }));
test('ENH-263 not claude path', () => assert.deepStrictEqual(enh263.check({ ...base263, filePath: 'src/foo.js' }), { hit: false }));
test('ENH-263 .claude but not protected subdir', () => assert.deepStrictEqual(enh263.check({ ...base263, filePath: '.claude/other.md' }), { hit: false }));
test('ENH-263 agents hit', () => {
  const r = enh263.check({ ...base263, filePath: '.claude/agents/foo.md' });
  assert.strictEqual(r.hit, true);
  assert.strictEqual(r.meta.id, 'ENH-263');
});
test('ENH-263 skills hit', () => assert.strictEqual(enh263.check({ ...base263, filePath: '.claude/skills/foo/SKILL.md' }).hit, true));
test('ENH-263 channels hit', () => assert.strictEqual(enh263.check({ ...base263, filePath: '.claude/channels/foo.md' }).hit, true));
test('ENH-263 commands hit', () => assert.strictEqual(enh263.check({ ...base263, filePath: '.claude/commands/foo.md' }).hit, true));
test('ENH-263 absolute path normalized', () => assert.strictEqual(enh263.check({ ...base263, filePath: '/Users/x/proj/.claude/agents/y.md' }).hit, true));
test('ENH-263 windows path', () => assert.strictEqual(enh263.check({ ...base263, filePath: 'C:\\proj\\.claude\\agents\\y.md' }).hit, true));
test('ENH-263 Edit tool', () => assert.strictEqual(enh263.check({ ...base263, tool: 'Edit', filePath: '.claude/agents/x.md' }).hit, true));
test('ENH-263 NotebookEdit tool', () => assert.strictEqual(enh263.check({ ...base263, tool: 'NotebookEdit', filePath: '.claude/skills/foo/SKILL.md' }).hit, true));
test('ENH-263 writesToClaude null', () => assert.strictEqual(enh263.writesToClaude(null), false));
test('ENH-263 writesToClaude empty', () => assert.strictEqual(enh263.writesToClaude(''), false));
test('ENH-263 writesToClaude non-string', () => assert.strictEqual(enh263.writesToClaude(123), false));
test('ENH-263 CLAUDE_PROTECTED_PREFIXES exposed', () => assert.ok(Array.isArray(enh263.CLAUDE_PROTECTED_PREFIXES)));
test('ENH-263 removeWhen false for v2.1.117', () => assert.strictEqual(enh263.removeWhen('2.1.117'), false));
test('ENH-263 removeWhen true for v2.1.118', () => assert.strictEqual(enh263.removeWhen('2.1.118'), true));

// ==================== ENH-264 ====================
test('ENH-264 null metrics', () => assert.deepStrictEqual(enh264.check(null), { hit: false }));
test('ENH-264 undefined metrics', () => assert.deepStrictEqual(enh264.check(undefined), { hit: false }));
test('ENH-264 non-object', () => assert.deepStrictEqual(enh264.check(42), { hit: false }));
test('ENH-264 unknown model', () => assert.deepStrictEqual(enh264.check({ model: 'gpt-4', overheadDelta: 99999 }), { hit: false }));
test('ENH-264 opus model', () => assert.deepStrictEqual(enh264.check({ model: 'claude-opus-4-7', overheadDelta: 99999 }), { hit: false }));
test('ENH-264 haiku model', () => assert.deepStrictEqual(enh264.check({ model: 'claude-haiku-4-5', overheadDelta: 99999 }), { hit: false }));
test('ENH-264 sonnet 4-6 below threshold', () => assert.strictEqual(enh264.check({ model: 'claude-sonnet-4-6', overheadDelta: 5000 }).hit, false));
test('ENH-264 sonnet 4-6 at threshold', () => assert.strictEqual(enh264.check({ model: 'claude-sonnet-4-6', overheadDelta: 8000 }).hit, false));
test('ENH-264 sonnet 4-6 above threshold', () => {
  const r = enh264.check({ model: 'claude-sonnet-4-6', overheadDelta: 8001 });
  assert.strictEqual(r.hit, true);
  assert.strictEqual(r.meta.id, 'ENH-264');
});
test('ENH-264 sonnet 4-5 above threshold', () => assert.strictEqual(enh264.check({ model: 'claude-sonnet-4-5', overheadDelta: 9000 }).hit, true));
test('ENH-264 session threshold hit', () => assert.strictEqual(enh264.check({ model: 'claude-sonnet-4-6', overheadDelta: 1000, sessionTotalOverhead: 100001 }).hit, true));
test('ENH-264 session threshold exact boundary', () => assert.strictEqual(enh264.check({ model: 'claude-sonnet-4-6', overheadDelta: 1000, sessionTotalOverhead: 100000 }).hit, false));
test('ENH-264 constants exposed', () => {
  assert.strictEqual(typeof enh264.OVERHEAD_THRESHOLD, 'number');
  assert.strictEqual(typeof enh264.SESSION_TOTAL_THRESHOLD, 'number');
  assert.ok(Array.isArray(enh264.KNOWN_REGRESSION_MODELS));
  assert.ok(enh264.KNOWN_REGRESSION_MODELS.includes('claude-sonnet-4-6'));
});
test('ENH-264 removeWhen v2.1.118', () => assert.strictEqual(enh264.removeWhen('2.1.118'), true));
test('ENH-264 removeWhen null', () => assert.strictEqual(enh264.removeWhen(null), false));

// ==================== ENH-254 ====================
test('ENH-254 null ctx', () => assert.deepStrictEqual(enh254.check(null), { hit: false }));
test('ENH-254 non-fork context', () => assert.deepStrictEqual(enh254.check({ skill: 'x', context: 'main' }), { hit: false }));
test('ENH-254 fork no platform', () => assert.deepStrictEqual(enh254.check({ skill: 'x', context: 'fork' }), { hit: false }));
test('ENH-254 fork darwin', () => assert.deepStrictEqual(enh254.check({ skill: 'x', context: 'fork', platform: 'darwin', forkSubagentEnv: true }), { hit: false }));
test('ENH-254 fork linux', () => assert.deepStrictEqual(enh254.check({ skill: 'x', context: 'fork', platform: 'linux', forkSubagentEnv: true }), { hit: false }));
test('ENH-254 fork win32 + disable-model-invocation', () => {
  const r = enh254.check({ skill: 'zero-script-qa', context: 'fork', platform: 'win32', disableModelInvocation: true });
  assert.strictEqual(r.hit, true);
  assert.strictEqual(r.meta.severity, 'HIGH');
  assert.ok(r.meta.note.includes('51165'));
});
test('ENH-254 fork env false', () => {
  const r = enh254.check({ skill: 'x', context: 'fork', platform: 'darwin', forkSubagentEnv: false });
  assert.strictEqual(r.hit, true);
  assert.strictEqual(r.meta.severity, 'MEDIUM');
  assert.ok(r.meta.note.includes('FORK_SUBAGENT'));
});

// Boundary cross-check: every Guard returns identical shape
[
  ['ENH-262', enh262],
  ['ENH-263', enh263],
  ['ENH-264', enh264],
  ['ENH-254', enh254],
].forEach(([name, mod]) => {
  test(`${name} exports check`, () => assert.strictEqual(typeof mod.check, 'function'));
  test(`${name} exports removeWhen`, () => assert.strictEqual(typeof mod.removeWhen, 'function'));
  test(`${name} check returns object with hit:false for empty`, () => {
    const r = mod.check({});
    assert.ok(r && typeof r.hit === 'boolean');
  });
  test(`${name} removeWhen defends invalid input`, () => {
    assert.strictEqual(typeof mod.removeWhen(undefined), 'boolean');
  });
});

console.log(`\nguards-edge-cases.test.js: ${pass}/${pass + fail} PASS, ${fail} FAIL, 0 SKIP`);
if (fail > 0) process.exit(1);
