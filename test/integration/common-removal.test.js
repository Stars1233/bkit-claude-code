#!/usr/bin/env node
/**
 * Common.js Removal Verification Test
 * @module test/integration/common-removal
 * @version 2.0.0
 *
 * Verifies that 25 key scripts can be required without common.js dependency.
 * Each script is checked for 'require.*common' pattern absence.
 * 25 TC: CR-001 ~ CR-025
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

let passed = 0;
let failed = 0;
const results = [];

function assert(id, condition, description) {
  if (condition) {
    passed++;
    results.push({ id, status: 'PASS', description });
  } else {
    failed++;
    results.push({ id, status: 'FAIL', description });
    console.assert(false, `${id}: ${description}`);
  }
}

/**
 * Check if a module file avoids direct common.js dependency.
 * v2.0.0 modules should use lib/core/, lib/pdca/, etc. instead of common.js
 */
function checkNoDirectCommonDep(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  if (!fs.existsSync(fullPath)) return { exists: false, hasCommon: false };
  const content = fs.readFileSync(fullPath, 'utf8');
  // Check for require('...common') or require("...common") patterns
  // Exclude comments and string mentions
  const lines = content.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
  const hasCommon = lines.some(l => /require\s*\(\s*['"][^'"]*common['"]\s*\)/.test(l));
  return { exists: true, hasCommon };
}

// List of 25 key v2.0.0 modules that should NOT depend on common.js
const V2_MODULES = [
  // Core modules (5)
  { id: 'CR-001', path: 'lib/core/constants.js', name: 'core/constants' },
  { id: 'CR-002', path: 'lib/core/errors.js', name: 'core/errors' },
  { id: 'CR-003', path: 'lib/core/state-store.js', name: 'core/state-store' },
  { id: 'CR-004', path: 'lib/core/hook-io.js', name: 'core/hook-io' },
  { id: 'CR-005', path: 'lib/core/paths.js', name: 'core/paths' },

  // PDCA modules (5)
  { id: 'CR-006', path: 'lib/pdca/state-machine.js', name: 'pdca/state-machine' },
  { id: 'CR-007', path: 'lib/pdca/lifecycle.js', name: 'pdca/lifecycle' },
  { id: 'CR-008', path: 'lib/pdca/workflow-engine.js', name: 'pdca/workflow-engine' },
  { id: 'CR-009', path: 'lib/pdca/feature-manager.js', name: 'pdca/feature-manager' },
  { id: 'CR-010', path: 'lib/pdca/batch-orchestrator.js', name: 'pdca/batch-orchestrator' },

  // Control modules (5)
  { id: 'CR-011', path: 'lib/control/destructive-detector.js', name: 'control/destructive-detector' },
  { id: 'CR-012', path: 'lib/control/blast-radius.js', name: 'control/blast-radius' },
  { id: 'CR-013', path: 'lib/control/scope-limiter.js', name: 'control/scope-limiter' },
  { id: 'CR-014', path: 'lib/control/checkpoint-manager.js', name: 'control/checkpoint-manager' },
  { id: 'CR-015', path: 'lib/control/trust-engine.js', name: 'control/trust-engine' },

  // Audit modules (3)
  { id: 'CR-016', path: 'lib/audit/audit-logger.js', name: 'audit/audit-logger' },
  { id: 'CR-017', path: 'lib/audit/decision-tracer.js', name: 'audit/decision-tracer' },
  { id: 'CR-018', path: 'lib/audit/explanation-generator.js', name: 'audit/explanation-generator' },

  // Quality modules (3)
  { id: 'CR-019', path: 'lib/quality/metrics-collector.js', name: 'quality/metrics-collector' },
  { id: 'CR-020', path: 'lib/quality/gate-manager.js', name: 'quality/gate-manager' },
  { id: 'CR-021', path: 'lib/quality/regression-guard.js', name: 'quality/regression-guard' },

  // Control additional (2)
  { id: 'CR-022', path: 'lib/control/loop-breaker.js', name: 'control/loop-breaker' },
  { id: 'CR-023', path: 'lib/control/automation-controller.js', name: 'control/automation-controller' },

  // UI modules (2)
  { id: 'CR-024', path: 'lib/ui/index.js', name: 'ui/index' },
  { id: 'CR-025', path: 'lib/pdca/full-auto-do.js', name: 'pdca/full-auto-do' },
];

for (const mod of V2_MODULES) {
  const result = checkNoDirectCommonDep(mod.path);
  if (!result.exists) {
    assert(mod.id,
      false,
      `${mod.name} does not exist at ${mod.path}`
    );
  } else {
    assert(mod.id,
      !result.hasCommon,
      `${mod.name} does not directly require common.js`
    );
  }
}

// ============================================================
// Summary
// ============================================================
console.log('\n========================================');
console.log('Common.js Removal Verification Test Results');
console.log('========================================');
console.log(`Total: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
console.log(`Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log('----------------------------------------');
results.forEach(r => {
  console.log(`  ${r.status === 'PASS' ? '[PASS]' : '[FAIL]'} ${r.id}: ${r.description}`);
});
console.log('========================================\n');

module.exports = { passed, failed, total: passed + failed, results };
if (failed > 0) process.exit(1);
