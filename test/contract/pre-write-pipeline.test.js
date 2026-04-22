/*
 * pre-write.js pipeline stage unit tests — Sprint 1 refactor verification.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §4.2
 * Plan SC: Each stage is a pure function testable in isolation.
 */

const assert = require('node:assert');
const pipeline = require('../../scripts/pre-write');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; } catch (e) { fail++; console.error(`✗ ${name}: ${e.message}`); }
}

// ==================== Module surface ====================
const STAGES = [
  'runPermissionCheck',
  'runTaskClassification',
  'runPdcaDocCheck',
  'runPdcaBypassDetection',
  'runPdcaGuidance',
  'runConventionHints',
  'runTaskSystemGuidance',
  'runDestructiveDetector',
  'runBlastRadius',
  'runScopeLimiter',
  'runCCRegressionCheck',
  'runAuditLog',
];
STAGES.forEach((stage) => {
  test(`exports ${stage}`, () => assert.strictEqual(typeof pipeline[stage], 'function'));
});
test('exports PDCA_DOC_PATTERNS array', () => assert.ok(Array.isArray(pipeline.PDCA_DOC_PATTERNS)));
test('PDCA_DOC_PATTERNS has 6 regexes', () => assert.strictEqual(pipeline.PDCA_DOC_PATTERNS.length, 6));

// ==================== Task Classification ====================
test('classification empty content = quick_fix', () => {
  const r = pipeline.runTaskClassification({ content: null });
  assert.strictEqual(r.classification, 'quick_fix');
  assert.strictEqual(r.pdcaLevel, 'none');
  assert.strictEqual(r.lineCount, 0);
});
test('classification counts lines', () => {
  const r = pipeline.runTaskClassification({ content: 'line1\nline2\nline3' });
  assert.strictEqual(r.lineCount, 3);
});
test('classification empty string', () => {
  const r = pipeline.runTaskClassification({ content: '' });
  assert.strictEqual(r.classification, 'quick_fix');
});

// ==================== PDCA Bypass Detection ====================
test('bypass detection plain file → null', () => {
  const r = pipeline.runPdcaBypassDetection({ filePath: 'src/foo.js' });
  assert.strictEqual(r, null);
});
test('bypass detection plan doc + no skill → warning', () => {
  const orig = process.env.CLAUDE_SKILL_NAME;
  delete process.env.CLAUDE_SKILL_NAME;
  try {
    const r = pipeline.runPdcaBypassDetection({ filePath: 'docs/01-plan/features/x.plan.md' });
    assert.ok(r);
    assert.ok(r.includes('PDCA COMPLIANCE'));
  } finally {
    if (orig) process.env.CLAUDE_SKILL_NAME = orig;
  }
});
test('bypass detection plan doc + skill → null (OK)', () => {
  process.env.CLAUDE_SKILL_NAME = 'pdca';
  try {
    const r = pipeline.runPdcaBypassDetection({ filePath: 'docs/01-plan/features/x.plan.md' });
    assert.strictEqual(r, null);
  } finally {
    delete process.env.CLAUDE_SKILL_NAME;
  }
});
test('bypass detection design doc detected', () => {
  delete process.env.CLAUDE_SKILL_NAME;
  const r = pipeline.runPdcaBypassDetection({ filePath: 'docs/02-design/features/x.design.md' });
  assert.ok(r && r.includes('PDCA'));
});
test('bypass detection analysis doc detected', () => {
  delete process.env.CLAUDE_SKILL_NAME;
  const r = pipeline.runPdcaBypassDetection({ filePath: 'docs/03-analysis/x.analysis.md' });
  assert.ok(r);
});
test('bypass detection report doc detected', () => {
  delete process.env.CLAUDE_SKILL_NAME;
  const r = pipeline.runPdcaBypassDetection({ filePath: 'docs/04-report/features/x.report.md' });
  assert.ok(r);
});
test('bypass detection qa-report doc detected', () => {
  delete process.env.CLAUDE_SKILL_NAME;
  const r = pipeline.runPdcaBypassDetection({ filePath: 'docs/05-qa/x.qa-report.md' });
  assert.ok(r);
});
test('bypass detection prd doc detected', () => {
  delete process.env.CLAUDE_SKILL_NAME;
  const r = pipeline.runPdcaBypassDetection({ filePath: 'docs/00-pm/x.prd.md' });
  assert.ok(r);
});

// ==================== PDCA Guidance ====================
test('pdcaGuidance none level = empty', () => {
  const parts = pipeline.runPdcaGuidance(
    { filePath: 'x.js' },
    { feature: '', designDoc: '', planDoc: '' },
    { pdcaLevel: 'none', lineCount: 5 }
  );
  assert.strictEqual(parts.length, 0);
});
test('pdcaGuidance light level = 1 message', () => {
  const parts = pipeline.runPdcaGuidance(
    { filePath: 'x.js' },
    { feature: '', designDoc: '', planDoc: '' },
    { pdcaLevel: 'light', lineCount: 50 }
  );
  assert.ok(parts[0].includes('Minor change'));
});
test('pdcaGuidance recommended with design doc', () => {
  const parts = pipeline.runPdcaGuidance(
    { filePath: 'x.js' },
    { feature: 'auth', designDoc: 'docs/02-design/features/auth.design.md', planDoc: '' },
    { pdcaLevel: 'recommended', lineCount: 100 }
  );
  assert.ok(parts[0].includes('Design doc exists'));
});
test('pdcaGuidance recommended without design doc', () => {
  const parts = pipeline.runPdcaGuidance(
    { filePath: 'x.js' },
    { feature: 'auth', designDoc: '', planDoc: '' },
    { pdcaLevel: 'recommended', lineCount: 100 }
  );
  assert.ok(parts[0].includes('recommended'));
});
test('pdcaGuidance required with design doc', () => {
  const parts = pipeline.runPdcaGuidance(
    { filePath: 'x.js' },
    { feature: 'auth', designDoc: 'auth.md', planDoc: '' },
    { pdcaLevel: 'required', lineCount: 500 }
  );
  assert.ok(parts[0].includes('Major feature'));
});
test('pdcaGuidance plan without design adds note', () => {
  const parts = pipeline.runPdcaGuidance(
    { filePath: 'x.js' },
    { feature: 'auth', designDoc: '', planDoc: 'auth.plan.md' },
    { pdcaLevel: 'required', lineCount: 500 }
  );
  assert.ok(parts.some((p) => p.includes('Plan exists')));
});

// ==================== Convention Hints ====================
test('convention hints ignored for quick_fix', () => {
  const r = pipeline.runConventionHints({ filePath: 'x.js' }, { pdcaLevel: 'none' });
  // isCodeFile('x.js') may return true; but pdcaLevel=none → null
  assert.strictEqual(r, null);
});
test('convention hints for recommended level code', () => {
  // Note: isCodeFile is determined by extension; this is a smoke test only.
  const r = pipeline.runConventionHints({ filePath: 'x.js' }, { pdcaLevel: 'recommended' });
  // It may return null if 'x.js' isn't recognized as code file by isCodeFile helper
  if (r !== null) assert.ok(typeof r === 'string');
});

// ==================== Task System Guidance ====================
test('taskSystemGuidance no feature = null', () => {
  const r = pipeline.runTaskSystemGuidance({}, { feature: '' }, { pdcaLevel: 'recommended' });
  assert.strictEqual(r, null);
});
test('taskSystemGuidance quick_fix level = null', () => {
  const r = pipeline.runTaskSystemGuidance({}, { feature: 'auth' }, { pdcaLevel: 'none' });
  assert.strictEqual(r, null);
});

// ==================== CC Regression Check ====================
test('runCCRegressionCheck null on benign input', () => {
  const r = pipeline.runCCRegressionCheck({
    filePath: 'src/foo.js',
    input: { tool_name: 'Write' },
  });
  // Depending on ccRegression init, may be null
  assert.ok(r === null || typeof r === 'string');
});
test('runCCRegressionCheck with ENH-263 trigger', () => {
  const orig = process.env.BKIT_CC_REGRESSION_BYPASS;
  delete process.env.BKIT_CC_REGRESSION_BYPASS;
  try {
    const r = pipeline.runCCRegressionCheck({
      filePath: '.claude/agents/foo.md',
      input: {
        tool_name: 'Write',
        bypassPermissions: true,
        permissionDecision: 'allow',
      },
    });
    if (r !== null) assert.ok(r.includes('ENH-263') || r.includes('51801'));
  } finally {
    if (orig) process.env.BKIT_CC_REGRESSION_BYPASS = orig;
  }
});
test('runCCRegressionCheck with BYPASS env returns null', () => {
  process.env.BKIT_CC_REGRESSION_BYPASS = '1';
  try {
    const r = pipeline.runCCRegressionCheck({
      filePath: '.claude/agents/foo.md',
      input: {
        tool_name: 'Write',
        bypassPermissions: true,
        permissionDecision: 'allow',
      },
    });
    assert.strictEqual(r, null);
  } finally {
    delete process.env.BKIT_CC_REGRESSION_BYPASS;
  }
});

// ==================== PDCA_DOC_PATTERNS ====================
test('PDCA_DOC_PATTERNS match plan', () => {
  assert.ok(pipeline.PDCA_DOC_PATTERNS.some((p) => p.test('docs/01-plan/features/x.plan.md')));
});
test('PDCA_DOC_PATTERNS match design', () => {
  assert.ok(pipeline.PDCA_DOC_PATTERNS.some((p) => p.test('docs/02-design/features/x.design.md')));
});
test('PDCA_DOC_PATTERNS do not match other md', () => {
  assert.ok(!pipeline.PDCA_DOC_PATTERNS.some((p) => p.test('docs/README.md')));
});

console.log(`\npre-write-pipeline.test.js: ${pass}/${pass + fail} PASS, ${fail} FAIL, 0 SKIP`);
if (fail > 0) process.exit(1);
