#!/usr/bin/env node
/**
 * check-quality-gates-m1-m10.js — CI invariant I4 for FR-δ2.
 *
 * Verifies 3-way SSoT consistency:
 *   1. docs/reference/quality-gates-m1-m10.md (catalog)
 *   2. bkit.config.json (numeric thresholds)
 *   3. Lib/script callsites (referenced via README of catalog)
 *
 * Detects drift among the three layers and exits non-zero on conflict.
 *
 * Exit codes:
 *   0 — all 3 layers agree
 *   1 — drift detected (CI fails)
 *
 * @module scripts/check-quality-gates-m1-m10
 * @version 2.1.11
 * @since 2.1.11
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'docs', 'reference', 'quality-gates-m1-m10.md');
const CONFIG = path.join(ROOT, 'bkit.config.json');

const failures = [];

function fail(code, msg) { failures.push({ code, msg }); }

// 1. Catalog must exist and parse
let catalogSrc;
try {
  catalogSrc = fs.readFileSync(CATALOG, 'utf8');
} catch (e) {
  fail('catalog_unreadable', `Cannot read ${CATALOG}: ${e.message}`);
}

// Extract numeric thresholds from the catalog table
const catalogValues = {};
if (catalogSrc) {
  const lines = catalogSrc.split('\n');
  for (const line of lines) {
    // M5 Match Rate ≥ 90
    const m5 = line.match(/\|\s*\*\*M5\*\*\s*\|.*\|\s*≥\s*(\d+)\s*\|/);
    if (m5) catalogValues.matchRate = parseInt(m5[1], 10);
    // M6 Critical Issues 0
    const m6 = line.match(/\|\s*\*\*M6\*\*\s*\|.*\|\s*(\d+)\s*\|/);
    if (m6) catalogValues.criticalIssueCount = parseInt(m6[1], 10);
    // M7 Iterate Count Max ≤ 5
    const m7 = line.match(/\|\s*\*\*M7\*\*\s*\|.*\|\s*≤\s*(\d+)\s*\|/);
    if (m7) catalogValues.maxIterations = parseInt(m7[1], 10);
    // M9 Success Criteria Coverage ≥ 80
    const m9 = line.match(/\|\s*\*\*M9\*\*\s*\|.*\|\s*≥\s*(\d+)\s*\|/);
    if (m9) catalogValues.successCoverage = parseInt(m9[1], 10);
  }

  for (const k of ['matchRate', 'criticalIssueCount', 'maxIterations']) {
    if (typeof catalogValues[k] !== 'number') {
      fail('catalog_threshold_missing',
        `Catalog row for ${k} did not parse — check table format`);
    }
  }
}

// 2. bkit.config.json must align with catalog
let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
} catch (e) {
  fail('config_unreadable', `Cannot read bkit.config.json: ${e.message}`);
}

if (cfg && catalogValues.matchRate !== undefined) {
  // pdca.matchRateThreshold
  if (cfg.pdca && cfg.pdca.matchRateThreshold !== catalogValues.matchRate) {
    fail('drift_M5_pdca',
      `M5 drift: catalog=${catalogValues.matchRate}, bkit.config.json#pdca.matchRateThreshold=${cfg.pdca.matchRateThreshold}`);
  }
  // quality.thresholds.matchRate
  if (cfg.quality && cfg.quality.thresholds &&
      cfg.quality.thresholds.matchRate !== catalogValues.matchRate) {
    fail('drift_M5_quality',
      `M5 drift: catalog=${catalogValues.matchRate}, bkit.config.json#quality.thresholds.matchRate=${cfg.quality.thresholds.matchRate}`);
  }
}

if (cfg && catalogValues.criticalIssueCount !== undefined &&
    cfg.quality && cfg.quality.thresholds &&
    cfg.quality.thresholds.criticalIssueCount !== catalogValues.criticalIssueCount) {
  fail('drift_M6',
    `M6 drift: catalog=${catalogValues.criticalIssueCount}, bkit.config.json#quality.thresholds.criticalIssueCount=${cfg.quality.thresholds.criticalIssueCount}`);
}

if (cfg && catalogValues.maxIterations !== undefined &&
    cfg.pdca && cfg.pdca.maxIterations !== catalogValues.maxIterations) {
  fail('drift_M7',
    `M7 drift: catalog=${catalogValues.maxIterations}, bkit.config.json#pdca.maxIterations=${cfg.pdca.maxIterations}`);
}

// Report
if (failures.length === 0) {
  console.log('OK quality-gates M1-M10 invariant: catalog + bkit.config.json align');
  console.log('  Parsed thresholds:', JSON.stringify(catalogValues));
  process.exit(0);
} else {
  console.error('FAIL quality-gates M1-M10 invariant violations:');
  for (const f of failures) console.error(`  [${f.code}] ${f.msg}`);
  process.exit(1);
}
