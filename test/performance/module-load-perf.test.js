#!/usr/bin/env node
'use strict';
/**
 * Performance Test: Module Loading - All 72+ Modules (10 TC)
 * ML-001~010: All modules load without error (require test)
 *
 * @version bkit v2.0.0
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../..');

const results = { passed: 0, failed: 0, total: 0, errors: [] };

function perfAssert(id, condition, message) {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  PASS: ${id} - ${message}`);
  } else {
    results.failed++;
    console.error(`  FAIL: ${id} - ${message}`);
  }
}

/**
 * Try to require a module, return success/failure + time
 */
function tryRequire(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch (_) { /* not cached */ }

  const start = performance.now();
  try {
    require(modulePath);
    return { success: true, elapsed: performance.now() - start };
  } catch (e) {
    return { success: false, elapsed: performance.now() - start, error: e.message };
  }
}

console.log('\n=== module-load-perf.test.js (10 TC) ===\n');

// ============================================================
// ML-001: Core modules (lib/core/*)
// ============================================================
console.log('--- Core Modules ---');

const CORE_MODULES = [
  'lib/core/index.js', 'lib/core/state-store.js', 'lib/core/constants.js',
  'lib/core/errors.js', 'lib/core/paths.js', 'lib/core/config.js',
  'lib/core/cache.js', 'lib/core/debug.js', 'lib/core/platform.js',
  'lib/core/io.js', 'lib/core/file.js',
];

let coreAllOk = true;
const coreErrors = [];
let coreTotalTime = 0;
for (const mod of CORE_MODULES) {
  const fullPath = path.join(BASE_DIR, mod);
  if (!fs.existsSync(fullPath)) continue;
  const r = tryRequire(fullPath);
  coreTotalTime += r.elapsed;
  if (!r.success) { coreAllOk = false; coreErrors.push(`${mod}: ${r.error}`); }
}
perfAssert('ML-001', coreAllOk,
  `All ${CORE_MODULES.length} core modules load (${coreTotalTime.toFixed(1)}ms)${coreErrors.length ? ' ERRORS: ' + coreErrors.join('; ') : ''}`);

// ============================================================
// ML-002: PDCA modules (lib/pdca/*)
// ============================================================
console.log('\n--- PDCA Modules ---');

const PDCA_MODULES = [
  'lib/pdca/index.js', 'lib/pdca/phase.js', 'lib/pdca/status.js',
  'lib/pdca/level.js', 'lib/pdca/tier.js', 'lib/pdca/automation.js',
  'lib/pdca/state-machine.js', 'lib/pdca/workflow-engine.js',
  'lib/pdca/feature-manager.js', 'lib/pdca/lifecycle.js',
  'lib/pdca/batch-orchestrator.js', 'lib/pdca/circuit-breaker.js',
  'lib/pdca/do-detector.js', 'lib/pdca/executive-summary.js',
  'lib/pdca/full-auto-do.js', 'lib/pdca/resume.js',
  'lib/pdca/template-validator.js', 'lib/pdca/workflow-parser.js',
];

let pdcaAllOk = true;
const pdcaErrors = [];
let pdcaTotalTime = 0;
for (const mod of PDCA_MODULES) {
  const fullPath = path.join(BASE_DIR, mod);
  if (!fs.existsSync(fullPath)) continue;
  const r = tryRequire(fullPath);
  pdcaTotalTime += r.elapsed;
  if (!r.success) { pdcaAllOk = false; pdcaErrors.push(`${mod}: ${r.error}`); }
}
perfAssert('ML-002', pdcaAllOk,
  `All PDCA modules load (${pdcaTotalTime.toFixed(1)}ms)${pdcaErrors.length ? ' ERRORS: ' + pdcaErrors.join('; ') : ''}`);

// ============================================================
// ML-003: Intent modules (lib/intent/*)
// ============================================================
const intentDir = path.join(BASE_DIR, 'lib/intent');
const intentFiles = fs.existsSync(intentDir) ?
  fs.readdirSync(intentDir).filter(f => f.endsWith('.js')) : [];
let intentAllOk = true;
for (const file of intentFiles) {
  const r = tryRequire(path.join(intentDir, file));
  if (!r.success) intentAllOk = false;
}
perfAssert('ML-003', intentAllOk,
  `All ${intentFiles.length} intent modules load`);

// ============================================================
// ML-004: Task modules (lib/task/*)
// ============================================================
const taskDir = path.join(BASE_DIR, 'lib/task');
const taskFiles = fs.existsSync(taskDir) ?
  fs.readdirSync(taskDir).filter(f => f.endsWith('.js')) : [];
let taskAllOk = true;
for (const file of taskFiles) {
  const r = tryRequire(path.join(taskDir, file));
  if (!r.success) taskAllOk = false;
}
perfAssert('ML-004', taskAllOk,
  `All ${taskFiles.length} task modules load`);

// ============================================================
// ML-005: Team modules (lib/team/*)
// ============================================================
const teamDir = path.join(BASE_DIR, 'lib/team');
const teamFiles = fs.existsSync(teamDir) ?
  fs.readdirSync(teamDir).filter(f => f.endsWith('.js')) : [];
let teamAllOk = true;
for (const file of teamFiles) {
  const r = tryRequire(path.join(teamDir, file));
  if (!r.success) teamAllOk = false;
}
perfAssert('ML-005', teamAllOk,
  `All ${teamFiles.length} team modules load`);

// ============================================================
// ML-006: UI modules (lib/ui/*)
// ============================================================
const uiDir = path.join(BASE_DIR, 'lib/ui');
const uiFiles = fs.existsSync(uiDir) ?
  fs.readdirSync(uiDir).filter(f => f.endsWith('.js')) : [];
let uiAllOk = true;
for (const file of uiFiles) {
  const r = tryRequire(path.join(uiDir, file));
  if (!r.success) uiAllOk = false;
}
perfAssert('ML-006', uiAllOk,
  `All ${uiFiles.length} UI modules load`);

// ============================================================
// ML-007: Audit modules (lib/audit/*)
// ============================================================
const auditDir = path.join(BASE_DIR, 'lib/audit');
const auditFiles = fs.existsSync(auditDir) ?
  fs.readdirSync(auditDir).filter(f => f.endsWith('.js')) : [];
let auditAllOk = true;
for (const file of auditFiles) {
  const r = tryRequire(path.join(auditDir, file));
  if (!r.success) auditAllOk = false;
}
perfAssert('ML-007', auditAllOk,
  `All ${auditFiles.length} audit modules load`);

// ============================================================
// ML-008: Control modules (lib/control/*)
// ============================================================
const controlDir = path.join(BASE_DIR, 'lib/control');
const controlFiles = fs.existsSync(controlDir) ?
  fs.readdirSync(controlDir).filter(f => f.endsWith('.js')) : [];
let controlAllOk = true;
for (const file of controlFiles) {
  const r = tryRequire(path.join(controlDir, file));
  if (!r.success) controlAllOk = false;
}
perfAssert('ML-008', controlAllOk,
  `All ${controlFiles.length} control modules load`);

// ============================================================
// ML-009: Quality modules (lib/quality/*)
// ============================================================
const qualityDir = path.join(BASE_DIR, 'lib/quality');
const qualityFiles = fs.existsSync(qualityDir) ?
  fs.readdirSync(qualityDir).filter(f => f.endsWith('.js')) : [];
let qualityAllOk = true;
for (const file of qualityFiles) {
  const r = tryRequire(path.join(qualityDir, file));
  if (!r.success) qualityAllOk = false;
}
perfAssert('ML-009', qualityAllOk,
  `All ${qualityFiles.length} quality modules load`);

// ============================================================
// ML-010: Standalone lib modules
// ============================================================
const STANDALONE = [
  'lib/common.js', 'lib/skill-loader.js', 'lib/skill-orchestrator.js',
  'lib/skill-quality-reporter.js', 'lib/memory-store.js',
  'lib/context-fork.js', 'lib/context-hierarchy.js',
  'lib/import-resolver.js', 'lib/permission-manager.js',
];
let standaloneAllOk = true;
let standaloneCount = 0;
for (const mod of STANDALONE) {
  const fullPath = path.join(BASE_DIR, mod);
  if (!fs.existsSync(fullPath)) continue;
  standaloneCount++;
  const r = tryRequire(fullPath);
  if (!r.success) standaloneAllOk = false;
}
perfAssert('ML-010', standaloneAllOk,
  `All ${standaloneCount} standalone lib modules load`);

// ============================================================
// Summary
// ============================================================
const totalModules = CORE_MODULES.length + PDCA_MODULES.length +
  intentFiles.length + taskFiles.length + teamFiles.length +
  uiFiles.length + auditFiles.length + controlFiles.length +
  qualityFiles.length + standaloneCount;

console.log(`\n--- Total Modules Tested: ${totalModules} ---`);
console.log(`=== Results: ${results.passed}/${results.total} passed, ${results.failed} failed ===`);
if (results.failed > 0) process.exit(1);
