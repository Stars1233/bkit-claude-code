'use strict';

/**
 * v2114-e-defense-contract.test.js — L3 Contract Tests (Sub-Sprint 4).
 *
 *   C-01  lib/defense/memory-enforcer.js at canonical path
 *   C-02  memory-enforcer exports extractDirectives/enforce/serialize/deserialize
 *   C-03  DIRECTIVE_RULES frozen + ≥4 entries (do-not, never, must-not, forbidden)
 *   C-04  lib/domain/guards/invariant-10-effort-aware.js at canonical path
 *   C-05  invariant-10 exports check/normalize/removeWhen + VALID_EFFORT_LEVELS frozen 3 entries
 *   C-06  lib/defense/index.js barrel re-exports memory-enforcer 4 functions
 *   C-07  audit-logger ACTION_TYPES includes memory_directive_enforced
 *   C-08  scripts/unified-bash-pre.js wires memory-enforcer + invariant-10 effort-aware
 *   C-09  hooks/session-start.js wires extractDirectives + serializeDirectives caching
 *   C-10  Domain Layer Purity — invariant-10 has 0 forbidden imports
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

console.log('\n📋 v2.1.14 Sub-Sprint 4 (E Defense 확장) Contract Tests\n');

record('C-01 memory-enforcer at lib/defense/memory-enforcer.js', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'lib/defense/memory-enforcer.js')));
});

record('C-02 memory-enforcer public API', () => {
  const m = require(path.join(projectRoot, 'lib/defense/memory-enforcer'));
  for (const k of ['extractDirectives', 'enforce', 'serializeDirectives', 'deserializeDirectives']) {
    assert.equal(typeof m[k], 'function', 'missing: ' + k);
  }
});

record('C-03 DIRECTIVE_RULES frozen + ≥4 entries', () => {
  const m = require(path.join(projectRoot, 'lib/defense/memory-enforcer'));
  assert.ok(Object.isFrozen(m.DIRECTIVE_RULES));
  assert.ok(m.DIRECTIVE_RULES.length >= 4);
  const names = m.DIRECTIVE_RULES.map((r) => r.name);
  for (const n of ['do-not', 'never', 'must-not', 'forbidden']) {
    assert.ok(names.includes(n), 'missing rule: ' + n);
  }
});

record('C-04 invariant-10 at lib/domain/guards/invariant-10-effort-aware.js', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'lib/domain/guards/invariant-10-effort-aware.js')));
});

record('C-05 invariant-10 API + VALID_EFFORT_LEVELS frozen 3 entries', () => {
  const g = require(path.join(projectRoot, 'lib/domain/guards/invariant-10-effort-aware'));
  for (const k of ['check', 'normalize', 'removeWhen']) {
    assert.equal(typeof g[k], 'function', 'missing: ' + k);
  }
  assert.ok(Object.isFrozen(g.VALID_EFFORT_LEVELS));
  assert.deepEqual([...g.VALID_EFFORT_LEVELS], ['low', 'medium', 'high']);
});

record('C-06 lib/defense/index.js barrel re-exports memory-enforcer', () => {
  const d = require(path.join(projectRoot, 'lib/defense'));
  for (const k of ['extractMemoryDirectives', 'enforceMemoryDirectives',
    'serializeMemoryDirectives', 'deserializeMemoryDirectives']) {
    assert.equal(typeof d[k], 'function', 'barrel missing: ' + k);
  }
});

record('C-07 audit-logger ACTION_TYPES contains memory_directive_enforced', () => {
  const a = require(path.join(projectRoot, 'lib/audit/audit-logger'));
  assert.ok(a.ACTION_TYPES.includes('memory_directive_enforced'),
    'ACTION_TYPES missing memory_directive_enforced');
});

record('C-08 unified-bash-pre.js wires memory-enforcer + invariant-10', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'scripts/unified-bash-pre.js'), 'utf8');
  assert.ok(/invariant-10-effort-aware/.test(src), 'invariant-10 require missing');
  assert.ok(/enforceMemoryDirectives/.test(src), 'enforceMemoryDirectives wire missing');
  assert.ok(/deserializeMemoryDirectives/.test(src), 'deserializeMemoryDirectives wire missing');
  assert.ok(/memory_directive_enforced/.test(src), 'audit action missing');
  assert.ok(/CLAUDE_EFFORT/.test(src) || /effort.level/.test(src), 'effort-aware surface missing');
});

record('C-09 session-start.js wires memory directive caching', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'hooks/session-start.js'), 'utf8');
  assert.ok(/extractMemoryDirectives/.test(src), 'extractMemoryDirectives wire missing');
  assert.ok(/serializeMemoryDirectives/.test(src), 'serializeMemoryDirectives wire missing');
  assert.ok(/memory-directives\.json/.test(src), 'cache file name missing');
  assert.ok(/Sub-Sprint 4/.test(src) || /ENH-286/.test(src), 'ENH-286 marker missing');
});

record('C-10 invariant-10 Domain Layer Purity (0 forbidden imports)', () => {
  const file = path.join(projectRoot, 'lib/domain/guards/invariant-10-effort-aware.js');
  const src = fs.readFileSync(file, 'utf8');
  const forbidden = ['fs', 'child_process', 'net', 'http', 'https', 'os', 'dns', 'tls', 'cluster'];
  for (const m of forbidden) {
    const re = new RegExp(`require\\(\\s*['"]${m}['"]`);
    assert.equal(re.test(src), false, 'invariant-10 must not require Node built-in: ' + m);
  }
});

console.log('\n📊 Summary: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
process.exit(0);
