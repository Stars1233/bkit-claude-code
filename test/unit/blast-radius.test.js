'use strict';
/**
 * Unit Tests for lib/control/blast-radius.js
 * 15 TC | console.assert based | no external dependencies
 */

let mod;
try {
  mod = require('../../lib/control/blast-radius');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

let passed = 0, failed = 0, total = 0, skipped = 0;
const failures = [];

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; failures.push({ id, message }); console.error(`  FAIL: ${id} - ${message}`); }
}

console.log('\n=== blast-radius.test.js ===\n');

// --- BR-001~006: B-001 to B-006 rules ---

// B-001: Single file > 500 lines
const br1 = mod.analyzeBlastRadius(['src/big.js'], { linesPerFile: { 'src/big.js': 600 } });
assert('BR-001', br1.rules.some(r => r.id === 'B-001'), 'B-001: Large single file change (>500 lines) detected');

// B-002: 10+ files changed
const manyFiles = Array.from({ length: 12 }, (_, i) => `src/file${i}.js`);
const br2 = mod.analyzeBlastRadius(manyFiles);
assert('BR-002', br2.rules.some(r => r.id === 'B-002'), 'B-002: 10+ files changed simultaneously detected');

// B-003: 20+ new files in session
const br3 = mod.analyzeBlastRadius(['src/a.js'], { newFilesInSession: 25 });
assert('BR-003', br3.rules.some(r => r.id === 'B-003'), 'B-003: Mass file creation (20+) detected');

// B-004: package.json change
const br4 = mod.analyzeBlastRadius(['package.json']);
assert('BR-004', br4.rules.some(r => r.id === 'B-004'), 'B-004: Dependency file change detected');

// B-005: Migration file
const br5 = mod.analyzeBlastRadius(['db/migrations/001_create_users.sql']);
assert('BR-005', br5.rules.some(r => r.id === 'B-005'), 'B-005: Database migration/schema change detected');

// B-006: Config file
const br6 = mod.analyzeBlastRadius(['tsconfig.json']);
assert('BR-006', br6.rules.some(r => r.id === 'B-006'), 'B-006: Config/settings file change detected');

// --- BR-007~009: analyzeBlastRadius returns correct level ---

const brLow = mod.analyzeBlastRadius(['src/utils.js'], { linesPerFile: { 'src/utils.js': 10 } });
assert('BR-007', brLow.level === 'low', 'Small change returns low risk level');

const brMedium = mod.analyzeBlastRadius(['src/big.js'], { linesPerFile: { 'src/big.js': 600 } });
assert('BR-008', brMedium.level === 'medium', 'Large single file returns medium level');

const brCritical = mod.analyzeBlastRadius(['schema.sql']);
assert('BR-009', brCritical.level === 'critical', 'Migration file returns critical level');

// --- BR-010~012: checkSingleFile ---

const sf1 = mod.checkSingleFile('src/big.js', 600);
assert('BR-010', sf1.warning === true && sf1.rule.includes('B-001'), 'checkSingleFile warns for >500 lines');

const sf2 = mod.checkSingleFile('db/migration_001.sql', 10);
assert('BR-011', sf2.warning === true && sf2.rule.includes('B-005'), 'checkSingleFile warns for migration file');

const sf3 = mod.checkSingleFile('src/utils.js', 10);
assert('BR-012', sf3.warning === false && sf3.rule === null, 'checkSingleFile no warning for small safe file');

// --- BR-013~015: checkSessionScope ---

const ss1 = mod.checkSessionScope({ filesChanged: 15, newFiles: 5, totalLinesChanged: 100 });
assert('BR-013', ss1.warning === true && ss1.details.includes('B-002'), 'Session scope warns for 15 files changed');

const ss2 = mod.checkSessionScope({ filesChanged: 2, newFiles: 25, totalLinesChanged: 100 });
assert('BR-014', ss2.warning === true && ss2.details.includes('B-003'), 'Session scope warns for 25 new files');

const ss3 = mod.checkSessionScope({ filesChanged: 3, newFiles: 2, totalLinesChanged: 50 });
assert('BR-015', ss3.warning === false, 'Session scope no warning for small changes');

// --- Summary ---
console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
