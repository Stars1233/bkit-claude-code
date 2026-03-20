'use strict';
/**
 * Unit Tests for lib/control/checkpoint-manager.js
 * 20 TC | console.assert based | no external dependencies
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Set up tmp dir as working directory before requiring module
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-cp-test-'));
const origCwd = process.cwd();
process.chdir(tmpDir);

// Create required state directory
fs.mkdirSync(path.join(tmpDir, '.bkit', 'state'), { recursive: true });
fs.writeFileSync(
  path.join(tmpDir, '.bkit', 'state', 'pdca-status.json'),
  JSON.stringify({ feature: 'test-feat', phase: 'plan', progress: 50 }),
  'utf-8'
);

let mod;
try {
  mod = require('../../lib/control/checkpoint-manager');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.chdir(origCwd);
  process.exit(1);
}

let passed = 0, failed = 0, total = 0, skipped = 0;
const failures = [];

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; failures.push({ id, message }); console.error(`  FAIL: ${id} - ${message}`); }
}

console.log('\n=== checkpoint-manager.test.js ===\n');

// --- CP-001~005: createCheckpoint ---

const cp1 = mod.createCheckpoint('test-feat', 'plan', 'auto', 'Auto checkpoint at plan');
assert('CP-001', cp1.id && cp1.id.startsWith('cp-'), 'Auto checkpoint creates id with cp- prefix');
assert('CP-002', fs.existsSync(cp1.path), 'Checkpoint file created on disk');

const cp2 = mod.createCheckpoint('test-feat', 'design', 'manual', 'Manual checkpoint');
assert('CP-003', cp2.id !== cp1.id, 'Manual checkpoint gets unique id');

const cp3 = mod.createCheckpoint('test-feat', 'do', 'phase_transition', 'Phase transition checkpoint');
assert('CP-004', cp3.id.startsWith('cp-'), 'Phase transition checkpoint created');

const cpData = JSON.parse(fs.readFileSync(cp3.path, 'utf-8'));
assert('CP-005', cpData.type === 'phase_transition' && cpData.phase === 'do' && cpData.feature === 'test-feat',
  'Checkpoint file contains correct type, phase, feature');

// --- CP-006~009: listCheckpoints ---

const list1 = mod.listCheckpoints('test-feat');
assert('CP-006', Array.isArray(list1) && list1.length >= 3, 'listCheckpoints returns array with 3+ entries');
assert('CP-007', list1[0].createdAt <= list1[list1.length - 1].createdAt, 'Checkpoints sorted chronologically');

const list2 = mod.listCheckpoints('nonexistent-feature');
assert('CP-008', Array.isArray(list2) && list2.length === 0, 'listCheckpoints returns empty for unknown feature');

const listAll = mod.listCheckpoints();
assert('CP-009', listAll.length >= 3, 'listCheckpoints without filter returns all');

// --- CP-010~013: rollbackToCheckpoint ---

const rollback1 = mod.rollbackToCheckpoint(cp1.id);
assert('CP-010', rollback1.restored === true, 'Rollback to valid checkpoint succeeds');
assert('CP-011', rollback1.details.includes(cp1.id), 'Rollback details mention checkpoint id');

const restoredStatus = JSON.parse(
  fs.readFileSync(path.join(tmpDir, '.bkit', 'state', 'pdca-status.json'), 'utf-8')
);
assert('CP-012', restoredStatus.feature === 'test-feat', 'Restored pdca-status has correct feature');

const rollback2 = mod.rollbackToCheckpoint('cp-nonexistent');
assert('CP-013', rollback2.restored === false, 'Rollback to nonexistent checkpoint fails');

// --- CP-014~016: SHA-256 integrity ---

const testData = 'hello world';
const hash1 = mod.sha256(testData);
const hash2 = mod.sha256(testData);
assert('CP-014', hash1 === hash2, 'sha256 produces consistent hashes');
assert('CP-015', typeof hash1 === 'string' && hash1.length === 64, 'sha256 returns 64-char hex string');

// Verify checkpoint has pdcaStatusHash
const cpFull = mod.getCheckpoint(cp1.id);
assert('CP-016', cpFull && typeof cpFull.pdcaStatusHash === 'string' && cpFull.pdcaStatusHash.length === 64,
  'Checkpoint contains SHA-256 pdcaStatusHash');

// --- CP-017~020: pruneCheckpoints ---

// Create many auto checkpoints to test pruning
for (let i = 0; i < 5; i++) {
  mod.createCheckpoint('prune-feat', 'plan', 'auto', `Auto ${i}`);
}

const prune1 = mod.pruneCheckpoints({ maxAutoCount: 2 });
assert('CP-017', prune1.removed >= 3, 'pruneCheckpoints removes auto checkpoints beyond limit');

const prune2 = mod.pruneCheckpoints({ maxAutoCount: 50, maxManualCount: 20, maxSizeBytes: 100 * 1024 * 1024 });
assert('CP-018', typeof prune2.removed === 'number', 'pruneCheckpoints returns removed count');

// Size-based pruning
for (let i = 0; i < 3; i++) {
  mod.createCheckpoint('size-feat', 'plan', 'auto', `Size test ${i}`);
}
const prune3 = mod.pruneCheckpoints({ maxAutoCount: 50, maxSizeBytes: 1 }); // 1 byte limit forces prune
assert('CP-019', prune3.removed > 0, 'Size-based pruning removes checkpoints when over budget');

const afterPrune = mod.listCheckpoints();
assert('CP-020', Array.isArray(afterPrune), 'Index is valid after pruning');

// --- Cleanup ---
process.chdir(origCwd);
fs.rmSync(tmpDir, { recursive: true, force: true });

// --- Summary ---
console.log(`\nResults: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.id}: ${f.message}`));
}

module.exports = { passed, failed, total, skipped, failures };
