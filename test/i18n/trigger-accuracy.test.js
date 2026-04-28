/**
 * trigger-accuracy.test.js — FR-δ3 baseline accuracy regression guard.
 *
 * Loads 8 fixture files (10 prompts each = 80 prompts total) and
 * verifies the language detector accuracy meets or exceeds the
 * baseline frozen in `trigger-accuracy-baseline.json`.
 *
 * Strategy: instead of arbitrary thresholds, lock in the v2.1.11 GA
 * measured accuracy as the baseline. Each subsequent release MUST
 * match or improve every per-language number — regressions fail CI.
 *
 * The baseline reflects v2.1.11 RD-5 narrowed scope: KO/EN are
 * full-quality (≥ 90%), CJK languages detect via Unicode script
 * properties (high accuracy), Romance languages currently fall back
 * to EN (low accuracy is expected — improvement scheduled v2.1.12).
 *
 * Maps to: Sprint δ Plan SC-03 + Design §FR-δ3.
 *
 * @module test/i18n/trigger-accuracy.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const detector = require('../../lib/i18n/detector');

const FIXTURE_DIR = path.resolve(__dirname, 'fixtures');
const BASELINE_PATH = path.resolve(__dirname, 'trigger-accuracy-baseline.json');
const LANGS = ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de', 'it'];

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));

function loadFixture(lang) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, `prompts-${lang}.json`), 'utf8'));
}

function measureLang(lang) {
  const fixture = loadFixture(lang);
  let correct = 0;
  for (const p of fixture.prompts) {
    const det = detector.detectFromPrompt(p.text);
    if (det.lang === p.expectedLang) correct++;
  }
  return { lang, total: fixture.prompts.length, correct,
           accuracy: correct / fixture.prompts.length };
}

// ── Per-language regression guard ────────────────────────────────────────
for (const lang of LANGS) {
  test(`FR-δ3 regression guard: ${lang} accuracy ≥ baseline ${(baseline.perLanguageAccuracy[lang] * 100).toFixed(0)}%`, () => {
    const r = measureLang(lang);
    const target = baseline.perLanguageAccuracy[lang];
    assert.ok(r.accuracy >= target,
      `${lang}: measured ${(r.accuracy * 100).toFixed(1)}% < baseline ${(target * 100).toFixed(0)}% (${r.correct}/${r.total} correct)`);
  });
}

// ── Aggregate regression guard ───────────────────────────────────────────
test(`FR-δ3 regression guard: aggregate accuracy ≥ baseline ${(baseline.aggregateAccuracy * 100).toFixed(0)}%`, () => {
  let total = 0, correct = 0;
  for (const lang of LANGS) {
    const r = measureLang(lang);
    total += r.total;
    correct += r.correct;
  }
  const overall = correct / total;
  assert.ok(overall >= baseline.aggregateAccuracy,
    `aggregate ${(overall * 100).toFixed(1)}% < baseline ${(baseline.aggregateAccuracy * 100).toFixed(1)}% (${correct}/${total} correct)`);
});

// ── Fixture invariants ───────────────────────────────────────────────────
test('FR-δ3 fixtures: 8 language files present', () => {
  for (const lang of LANGS) {
    assert.ok(fs.existsSync(path.join(FIXTURE_DIR, `prompts-${lang}.json`)),
      `fixture for ${lang} must exist`);
  }
});

test('FR-δ3 fixtures: each file has ≥ 5 prompts and self-consistent expectedLang', () => {
  for (const lang of LANGS) {
    const fix = loadFixture(lang);
    assert.equal(fix.language, lang);
    assert.ok(fix.prompts.length >= 5, `${lang} must have ≥ 5 prompts`);
    for (const p of fix.prompts) {
      assert.equal(p.expectedLang, lang, `${lang} prompt expectedLang mismatch`);
    }
  }
});

// ── Baseline integrity ───────────────────────────────────────────────────
test('FR-δ3 baseline JSON: structure valid', () => {
  assert.equal(baseline.version, '2.1.11');
  assert.equal(typeof baseline.aggregateAccuracy, 'number');
  for (const lang of LANGS) {
    assert.equal(typeof baseline.perLanguageAccuracy[lang], 'number');
  }
});

// ── Coverage report (informational) ──────────────────────────────────────
test('FR-δ3 measurement: print per-language accuracy report', () => {
  const report = [];
  let total = 0, correct = 0;
  for (const lang of LANGS) {
    const r = measureLang(lang);
    report.push(`  ${lang}: ${r.correct}/${r.total} = ${(r.accuracy * 100).toFixed(0)}% (baseline: ${(baseline.perLanguageAccuracy[lang] * 100).toFixed(0)}%)`);
    total += r.total;
    correct += r.correct;
  }
  console.log('\nFR-δ3 Trigger Accuracy Report:');
  for (const line of report) console.log(line);
  console.log(`  AGGREGATE: ${correct}/${total} = ${(correct / total * 100).toFixed(1)}% (baseline: ${(baseline.aggregateAccuracy * 100).toFixed(1)}%)`);
});
