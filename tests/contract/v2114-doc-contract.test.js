'use strict';

/**
 * v2114-doc-contract.test.js — L3 Contract Tests (Sub-Sprint 5 Doc).
 *
 *   C-01  docs/06-guide/version-policy.guide.md exists (ENH-309)
 *   C-02  docs/06-guide/cc-version-monitoring.guide.md exists (ENH-306+296)
 *   C-03  docs/adr/0010-effort-aware-invariant.md exists (Sub-Sprint 4 carry)
 *   C-04  scripts/check-skill-frontmatter.js exists + 1536-char cap (ENH-291)
 *   C-05  agents/cc-version-researcher.md includes R-Series Tracker section
 *   C-06  agents/cc-version-researcher.md includes release_drift_score formula
 *   C-07  agents/cc-version-researcher.md includes 6-differentiation table
 *   C-08  version-policy guide enumerates dist-tag 3-Bucket Framework
 *   C-09  cc-version-monitoring guide enumerates ≥12 R-3 evolved-form entries
 *   C-10  ADR 0010 references ADR 0003 + ENH-307
 *
 * @version 2.1.14
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');

let passed = 0, failed = 0;

function record(name, fn) {
  try { fn(); passed += 1; console.log('  ✅ ' + name + ' PASS'); }
  catch (e) { failed += 1; console.log('  ❌ ' + name + ' FAIL: ' + e.message); }
}

function readFile(rel) {
  return fs.readFileSync(path.join(projectRoot, rel), 'utf8');
}

console.log('\n📋 v2.1.14 Sub-Sprint 5 (Doc) Contract Tests\n');

record('C-01 version-policy.guide.md exists (ENH-309)', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'docs/06-guide/version-policy.guide.md')));
});

record('C-02 cc-version-monitoring.guide.md exists (ENH-306+296)', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'docs/06-guide/cc-version-monitoring.guide.md')));
});

record('C-03 docs/adr/0010-effort-aware-invariant.md exists', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'docs/adr/0010-effort-aware-invariant.md')));
});

record('C-04 check-skill-frontmatter.js exists + 1536-char cap', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'scripts/check-skill-frontmatter.js')));
  const m = require(path.join(projectRoot, 'scripts/check-skill-frontmatter'));
  assert.equal(m.SKILL_DESCRIPTION_CAP, 1536);
  assert.notEqual(m.SKILL_DESCRIPTION_CAP, 250);
});

record('C-05 cc-version-researcher.md includes R-Series Tracker section', () => {
  const src = readFile('agents/cc-version-researcher.md');
  assert.ok(/R-Series Regression Tracker/.test(src));
  assert.ok(/numbered violation/.test(src));
  assert.ok(/evolved form/.test(src));
});

record('C-06 cc-version-researcher.md includes release_drift_score formula', () => {
  const src = readFile('agents/cc-version-researcher.md');
  assert.ok(/release_drift_score/.test(src));
  assert.ok(/dist-tag\(stable\)/.test(src) || /dist-tag/.test(src));
});

record('C-07 cc-version-researcher.md lists 6 differentiations', () => {
  const src = readFile('agents/cc-version-researcher.md');
  assert.ok(/Memory Enforcer/.test(src));
  assert.ok(/Defense Layer 6/.test(src));
  assert.ok(/Sequential dispatch/.test(src));
  assert.ok(/Effort-aware/.test(src));
  assert.ok(/PostToolUse continueOnBlock/.test(src));
  assert.ok(/Heredoc/.test(src));
});

record('C-08 version-policy guide enumerates dist-tag 3-Bucket Framework', () => {
  const src = readFile('docs/06-guide/version-policy.guide.md');
  assert.ok(/3-Bucket Decision Framework/.test(src));
  assert.ok(/`stable`/.test(src));
  assert.ok(/`latest`/.test(src));
  assert.ok(/`next`/.test(src));
});

record('C-09 monitoring guide lists ≥12 R-3 evolved-form entries', () => {
  const src = readFile('docs/06-guide/cc-version-monitoring.guide.md');
  const matches = src.match(/evolved form #\d+/g) || [];
  assert.ok(matches.length >= 12, 'expected ≥12 evolved-form entries, found ' + matches.length);
});

record('C-10 ADR 0010 references ADR 0003 + ENH-307', () => {
  const src = readFile('docs/adr/0010-effort-aware-invariant.md');
  assert.ok(/ADR 0003/.test(src));
  assert.ok(/ENH-307/.test(src));
  assert.ok(/invariant 9.*10/.test(src) || /9 → 10/.test(src) || /9.*→.*10/.test(src));
});

console.log('\n📊 Summary: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
process.exit(0);
