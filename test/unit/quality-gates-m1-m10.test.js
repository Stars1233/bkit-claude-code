/**
 * quality-gates-m1-m10.test.js — FR-δ2 catalog parsing + 3-way SSoT invariant.
 *
 * Maps to Sprint δ Design §5.2 + §6 E-δ2-01 (3-way SSoT drift).
 *
 * @module test/unit/quality-gates-m1-m10.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const CATALOG = path.join(ROOT, 'docs', 'reference', 'quality-gates-m1-m10.md');
const CONFIG = path.join(ROOT, 'bkit.config.json');
const SCRIPT = path.join(ROOT, 'scripts', 'check-quality-gates-m1-m10.js');

// ── Catalog presence + structure ─────────────────────────────────────────
test('catalog file exists at canonical path', () => {
  assert.ok(fs.existsSync(CATALOG),
    'docs/reference/quality-gates-m1-m10.md must exist');
});

test('catalog contains all 10 gates M1..M10', () => {
  const src = fs.readFileSync(CATALOG, 'utf8');
  for (let i = 1; i <= 10; i++) {
    assert.ok(src.includes(`**M${i}**`),
      `catalog must contain row for M${i}`);
  }
});

test('catalog table has Threshold column structure', () => {
  const src = fs.readFileSync(CATALOG, 'utf8');
  assert.match(src, /\|\s*Gate\s*\|\s*Phase\s*\|\s*Metric\s*\|\s*Threshold\s*\|/);
});

// ── Numeric thresholds extractable ───────────────────────────────────────
function extractThresholds(src) {
  const out = {};
  for (const line of src.split('\n')) {
    const m5 = line.match(/\|\s*\*\*M5\*\*\s*\|.*\|\s*≥\s*(\d+)\s*\|/);
    if (m5) out.matchRate = parseInt(m5[1], 10);
    const m6 = line.match(/\|\s*\*\*M6\*\*\s*\|.*\|\s*(\d+)\s*\|/);
    if (m6) out.criticalIssueCount = parseInt(m6[1], 10);
    const m7 = line.match(/\|\s*\*\*M7\*\*\s*\|.*\|\s*≤\s*(\d+)\s*\|/);
    if (m7) out.maxIterations = parseInt(m7[1], 10);
  }
  return out;
}

test('M5 Match Rate threshold is 90', () => {
  const t = extractThresholds(fs.readFileSync(CATALOG, 'utf8'));
  assert.equal(t.matchRate, 90);
});

test('M6 Critical Issue Count threshold is 0', () => {
  const t = extractThresholds(fs.readFileSync(CATALOG, 'utf8'));
  assert.equal(t.criticalIssueCount, 0);
});

test('M7 Max Iterations threshold is 5', () => {
  const t = extractThresholds(fs.readFileSync(CATALOG, 'utf8'));
  assert.equal(t.maxIterations, 5);
});

// ── 3-way SSoT alignment ─────────────────────────────────────────────────
test('M5 catalog == bkit.config.json#pdca.matchRateThreshold', () => {
  const cat = extractThresholds(fs.readFileSync(CATALOG, 'utf8'));
  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  assert.equal(cfg.pdca.matchRateThreshold, cat.matchRate);
});

test('M5 catalog == bkit.config.json#quality.thresholds.matchRate', () => {
  const cat = extractThresholds(fs.readFileSync(CATALOG, 'utf8'));
  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  assert.equal(cfg.quality.thresholds.matchRate, cat.matchRate);
});

test('M6 catalog == bkit.config.json#quality.thresholds.criticalIssueCount', () => {
  const cat = extractThresholds(fs.readFileSync(CATALOG, 'utf8'));
  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  assert.equal(cfg.quality.thresholds.criticalIssueCount, cat.criticalIssueCount);
});

test('M7 catalog == bkit.config.json#pdca.maxIterations', () => {
  const cat = extractThresholds(fs.readFileSync(CATALOG, 'utf8'));
  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  assert.equal(cfg.pdca.maxIterations, cat.maxIterations);
});

// ── CI invariant runs successfully ───────────────────────────────────────
test('CI invariant script exits 0 (no drift)', () => {
  const out = execFileSync('node', [SCRIPT], { encoding: 'utf8' });
  assert.match(out, /OK quality-gates M1-M10 invariant/);
});
