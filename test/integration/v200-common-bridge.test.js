#!/usr/bin/env node
/**
 * v2.1.0+ Module Architecture Compatibility Test
 * @module test/integration/v200-common-bridge
 * @version 2.1.1
 *
 * Originally tested lib/common.js backward compatibility bridge.
 * Updated for v2.1.0+ where common.js was removed and replaced by
 * direct submodule imports: lib/core, lib/pdca, lib/intent, lib/task, lib/team, lib/ui.
 *
 * 20 TC: CB-001 ~ CB-020
 */

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

// ============================================================
// Section 1: Core module loads and has expected exports (CB-001~005)
// ============================================================

let core = null;
let coreLoadError = null;
try {
  core = require(path.join(PROJECT_ROOT, 'lib/core'));
} catch (e) {
  coreLoadError = e;
}

// CB-001: core/index.js loads without error
assert('CB-001',
  core !== null && coreLoadError === null,
  'lib/core/index.js loads without error'
);

// CB-002: core/index.js exports 40+ functions/values
const exportCount = core ? Object.keys(core).length : 0;
assert('CB-002',
  exportCount >= 40,
  `lib/core/index.js exports >=40 functions/values (actual: ${exportCount})`
);

// CB-003: Core exports are not all undefined
const definedExports = core ? Object.values(core).filter(v => v !== undefined).length : 0;
assert('CB-003',
  definedExports >= 40,
  `lib/core/index.js has >=40 defined (non-undefined) exports (actual: ${definedExports})`
);

// CB-004: Core exports include function types
const functionExports = core ? Object.values(core).filter(v => typeof v === 'function').length : 0;
assert('CB-004',
  functionExports >= 20,
  `lib/core/index.js exports >=20 functions (actual: ${functionExports})`
);

// CB-005: core module.exports is a plain object (not a class)
assert('CB-005',
  core !== null && typeof core === 'object' && !Array.isArray(core),
  'lib/core/index.js exports a plain object'
);

// ============================================================
// Section 2: Key functions from each submodule accessible (CB-006~010)
// ============================================================

// CB-006: Core functions accessible - debugLog, getBkitConfig, readStdinSync
assert('CB-006',
  core && typeof core.debugLog === 'function' &&
  typeof core.getBkitConfig === 'function' &&
  typeof core.readStdinSync === 'function',
  'Core functions (debugLog, getBkitConfig, readStdinSync) accessible via core/index.js'
);

// CB-007: PDCA functions accessible
let pdca = null;
try { pdca = require(path.join(PROJECT_ROOT, 'lib/pdca')); } catch (_) {}
assert('CB-007',
  pdca && typeof pdca.getPdcaStatusFull === 'function' &&
  typeof pdca.updatePdcaStatus === 'function',
  'PDCA functions (getPdcaStatusFull, updatePdcaStatus) accessible via pdca/index.js'
);

// CB-008: Intent functions accessible
let intent = null;
try { intent = require(path.join(PROJECT_ROOT, 'lib/intent')); } catch (_) {}
assert('CB-008',
  intent && typeof intent.detectLanguage === 'function' &&
  typeof intent.calculateAmbiguityScore === 'function',
  'Intent functions (detectLanguage, calculateAmbiguityScore) accessible via intent/index.js'
);

// CB-009: Task functions accessible
let task = null;
try { task = require(path.join(PROJECT_ROOT, 'lib/task')); } catch (_) {}
assert('CB-009',
  task && typeof task.classifyTaskByLines === 'function' &&
  typeof task.getPdcaLevel === 'function',
  'Task functions (classifyTaskByLines, getPdcaLevel) accessible via task/index.js'
);

// CB-010: Team functions accessible
let team = null;
try { team = require(path.join(PROJECT_ROOT, 'lib/team')); } catch (_) {}
assert('CB-010',
  team && typeof team.getTeamConfig === 'function',
  'Team functions accessible via team/index.js'
);

// ============================================================
// Section 3: Direct imports from lib submodules work independently (CB-011~015)
// ============================================================

// CB-011: lib/core loads and exports debugLog
assert('CB-011',
  core && typeof core.debugLog === 'function',
  'lib/core debugLog is a function'
);

// CB-012: lib/pdca loads and exports getPdcaStatusFull
assert('CB-012',
  pdca && typeof pdca.getPdcaStatusFull === 'function',
  'lib/pdca getPdcaStatusFull is a function'
);

// CB-013: lib/intent loads and exports detectLanguage
assert('CB-013',
  intent && typeof intent.detectLanguage === 'function',
  'lib/intent detectLanguage is a function'
);

// CB-014: lib/task loads and exports classifyTaskByLines
assert('CB-014',
  task && typeof task.classifyTaskByLines === 'function',
  'lib/task classifyTaskByLines is a function'
);

// CB-015: lib/team loads without error
assert('CB-015',
  team !== null,
  'lib/team loads without error'
);

// ============================================================
// Section 4: No circular dependency issues (CB-016~020)
// ============================================================

// CB-016: Re-requiring core returns cached module (no infinite loop)
let coreSecond = null;
let reloadError = null;
try {
  const corePath = require.resolve(path.join(PROJECT_ROOT, 'lib/core'));
  coreSecond = require(corePath);
} catch (e) {
  reloadError = e;
}
assert('CB-016',
  coreSecond !== null && reloadError === null,
  'Re-requiring lib/core returns cached module without circular dependency error'
);

// CB-017: lib/core loads independently without circular dependency
let coreIndependent = null;
try {
  coreIndependent = require(path.join(PROJECT_ROOT, 'lib/core'));
} catch (e) {}
assert('CB-017',
  coreIndependent !== null && Object.keys(coreIndependent).length > 0,
  'lib/core loads independently without circular dependency'
);

// CB-018: lib/pdca loads independently without circular dependency
let pdcaIndependent = null;
try {
  pdcaIndependent = require(path.join(PROJECT_ROOT, 'lib/pdca'));
} catch (e) {}
assert('CB-018',
  pdcaIndependent !== null && Object.keys(pdcaIndependent).length > 0,
  'lib/pdca loads independently without circular dependency'
);

// CB-019: lib/ui loads independently and exports all 5 render functions
let ui = null;
try { ui = require(path.join(PROJECT_ROOT, 'lib/ui')); } catch (_) {}
assert('CB-019',
  ui !== null &&
  typeof ui.renderPdcaProgressBar === 'function' &&
  typeof ui.renderWorkflowMap === 'function' &&
  typeof ui.renderControlPanel === 'function' &&
  typeof ui.renderImpactView === 'function' &&
  typeof ui.renderAgentPanel === 'function',
  'lib/ui loads and exports all 5 render functions'
);

// CB-020: All 6 submodule index.js files load without error
const submodules = ['core', 'pdca', 'intent', 'task', 'team', 'ui'];
const allLoaded = submodules.every(m => {
  try {
    require(path.join(PROJECT_ROOT, 'lib', m));
    return true;
  } catch (_) {
    return false;
  }
});
assert('CB-020',
  allLoaded,
  'All 6 submodule index.js files (core, pdca, intent, task, team, ui) load without error'
);

// ============================================================
// Summary
// ============================================================
console.log('\n========================================');
console.log('v2.1.0+ Module Architecture Compatibility Test Results');
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
