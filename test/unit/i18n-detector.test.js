/**
 * i18n-detector.test.js — Unit tests for FR-β6 8-language auto-detector
 *
 * Maps to Design §8.2 (L1 TC #6 detectFromPrompt 8-lang) and §8.3 (L2 TC #23-25).
 *
 * @module test/unit/i18n-detector.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const detector = require('../../lib/i18n/detector');

function withTempProject(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-i18n-'));
  const orig = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = dir;
  try { return fn(dir); }
  finally {
    if (orig === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = orig;
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

// ── 8-language detection (one TC per language) ─────────────────────────────
test('detectFromPrompt: Korean → ko, high confidence', () => {
  const r = detector.detectFromPrompt('이거 정말 중요한 작업이에요');
  assert.equal(r.lang, 'ko');
  assert.ok(r.confidence >= 0.9);
});

test('detectFromPrompt: Japanese → ja, high confidence', () => {
  const r = detector.detectFromPrompt('これは大切な仕事です');
  assert.equal(r.lang, 'ja');
  assert.ok(r.confidence >= 0.9);
});

test('detectFromPrompt: Chinese → zh, high confidence', () => {
  const r = detector.detectFromPrompt('这是一个非常重要的工作');
  assert.equal(r.lang, 'zh');
  assert.ok(r.confidence >= 0.9);
});

test('detectFromPrompt: English → en', () => {
  const r = detector.detectFromPrompt('please review this code change carefully');
  assert.equal(r.lang, 'en');
  assert.ok(r.confidence >= 0.5);
});

test('detectFromPrompt: Spanish → es', () => {
  const r = detector.detectFromPrompt('por favor ayúdame con este código muy importante');
  assert.equal(r.lang, 'es');
  assert.ok(r.confidence >= 0.6);
});

test('detectFromPrompt: French → fr', () => {
  const r = detector.detectFromPrompt("s'il vous plaît aidez-moi à déboguer ce code");
  assert.equal(r.lang, 'fr');
  assert.ok(r.confidence >= 0.6);
});

test('detectFromPrompt: German → de', () => {
  const r = detector.detectFromPrompt('bitte hilf mir diesen Code zu debuggen für mich');
  assert.equal(r.lang, 'de');
  assert.ok(r.confidence >= 0.6);
});

test('detectFromPrompt: Italian → it', () => {
  const r = detector.detectFromPrompt('per favore aiutami con questo codice della funzione');
  assert.equal(r.lang, 'it');
  assert.ok(r.confidence >= 0.6);
});

// ── L2-23..25: edge cases (mixed / empty / fallback) ──────────────────────
test('detectFromPrompt: KO+EN mixed → strongest signal wins (ko)', () => {
  const r = detector.detectFromPrompt('please 이거 review 해줘');
  assert.equal(r.lang, 'ko'); // Hangul block dominates
  assert.ok(r.confidence >= 0.9);
});

test('detectFromPrompt: empty input → en, confidence 0', () => {
  const r = detector.detectFromPrompt('');
  assert.equal(r.lang, 'en');
  assert.equal(r.confidence, 0);
});

test('detectFromPrompt: nullish input → en, confidence 0', () => {
  const r = detector.detectFromPrompt(null);
  assert.equal(r.lang, 'en');
  assert.equal(r.confidence, 0);
});

// ── mergeWithEnv: env tiebreaker only when text confidence < 0.6 ──────────
test('mergeWithEnv: high text confidence beats env', () => {
  const r = detector.mergeWithEnv(
    { lang: 'ko', confidence: 0.95 },
    { envLang: 'ja_JP.UTF-8' },
  );
  assert.equal(r.lang, 'ko');
  assert.equal(r.source, 'text');
});

test('mergeWithEnv: low text confidence falls back to env', () => {
  const r = detector.mergeWithEnv(
    { lang: 'en', confidence: 0.3 },
    { envLang: 'ko_KR.UTF-8' },
  );
  assert.equal(r.lang, 'ko');
  assert.equal(r.source, 'env');
});

test('mergeWithEnv: unknown env code → fallback', () => {
  const r = detector.mergeWithEnv(
    { lang: 'en', confidence: 0.3 },
    { envLang: 'xx_YY' },
  );
  assert.equal(r.lang, 'en');
  assert.equal(r.source, 'fallback');
});

// ── persistLanguage / readLanguage round-trip ─────────────────────────────
test('persist + read round-trip with full schema', () => {
  withTempProject((dir) => {
    const ok = detector.persistLanguage('ko', { confidence: 0.95, source: 'text' });
    assert.equal(ok, true);
    assert.ok(fs.existsSync(path.join(dir, '.bkit/runtime/language-detected.json')));
    const data = detector.readLanguage();
    assert.equal(data.lang, 'ko');
    assert.equal(data.confidence, 0.95);
    assert.equal(data.source, 'text');
    assert.match(data.detectedAt, /^\d{4}-\d{2}-\d{2}T/);
  });
});

test('persistLanguage: rejects unsupported lang', () => {
  withTempProject(() => {
    assert.equal(detector.persistLanguage('xx'), false);
    assert.equal(detector.readLanguage(), null);
  });
});

test('readLanguage: missing file → null (no throw)', () => {
  withTempProject(() => {
    assert.equal(detector.readLanguage(), null);
  });
});

test('SUPPORTED list shape matches design §3.2 enum', () => {
  assert.deepEqual([...detector.SUPPORTED].sort(),
    ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'zh']);
});
