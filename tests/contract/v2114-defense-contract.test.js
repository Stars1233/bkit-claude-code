'use strict';

/**
 * v2114-defense-contract.test.js — L3 Contract Tests (tracked, CI gate).
 *
 * Enforces Sub-Sprint 2 (Defense) structural contracts:
 *   C-01  lib/defense/heredoc-detector.js exists at canonical path
 *   C-02  Heredoc detect() public API + PATTERNS frozen
 *   C-03  lib/defense/push-event-guard.js exists at canonical path
 *   C-04  Push guard 3 public fns (detectPushCommand/classifyRemote/shouldGuard)
 *   C-05  lib/defense/layer-6-audit.js exists at canonical path
 *   C-06  Layer 6 public API (createLayer6Audit/classifySeverity/isInLayer6Audit)
 *   C-07  lib/defense/index.js barrel re-exports all 3 modules
 *   C-08  audit-logger ACTION_TYPES contains all 7 Sub-Sprint 2 ENH actions
 *   C-09  scripts/unified-bash-pre.js wires heredoc + push-event-guard
 *   C-10  PostToolUse 3 scripts wire Layer 6 Tier 1 + reachability ping
 *
 * Sprint Ref: v2114-differentiation-release (Sub-Sprint 2 Defense)
 * @version 2.1.14
 * @since 2.1.14
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');

let passed = 0;
let failed = 0;

function record(name, fn) {
  try {
    fn();
    passed += 1;
    // eslint-disable-next-line no-console
    console.log('  ✅ ' + name + ' PASS');
  } catch (e) {
    failed += 1;
    // eslint-disable-next-line no-console
    console.log('  ❌ ' + name + ' FAIL: ' + e.message);
  }
}

// eslint-disable-next-line no-console
console.log('\n📋 v2.1.14 Sub-Sprint 2 (Defense) Contract Tests\n');

// C-01 heredoc-detector canonical path
record('C-01 heredoc-detector at lib/defense/heredoc-detector.js', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'lib/defense/heredoc-detector.js')));
});

// C-02 Heredoc detect API + frozen patterns
record('C-02 Heredoc detect API + PATTERNS frozen', () => {
  const h = require(path.join(projectRoot, 'lib/defense/heredoc-detector'));
  assert.equal(typeof h.detect, 'function');
  assert.ok(Object.isFrozen(h.CRITICAL_PATTERNS));
  assert.ok(Object.isFrozen(h.WARNING_PATTERNS));
  assert.ok(h.CRITICAL_PATTERNS.length >= 20, '≥20 critical patterns required');
  assert.ok(h.WARNING_PATTERNS.length >= 2, '≥2 warning patterns required');
});

// C-03 push-event-guard canonical path
record('C-03 push-event-guard at lib/defense/push-event-guard.js', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'lib/defense/push-event-guard.js')));
});

// C-04 Push guard 3 public fns
record('C-04 Push guard exports detectPushCommand/classifyRemote/shouldGuard', () => {
  const g = require(path.join(projectRoot, 'lib/defense/push-event-guard'));
  assert.equal(typeof g.detectPushCommand, 'function');
  assert.equal(typeof g.classifyRemote, 'function');
  assert.equal(typeof g.shouldGuard, 'function');
  assert.ok(Object.isFrozen(g.UPSTREAM_URL_HEURISTICS));
  assert.ok(Object.isFrozen(g.FORK_URL_HEURISTICS));
});

// C-05 layer-6-audit canonical path
record('C-05 layer-6-audit at lib/defense/layer-6-audit.js', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'lib/defense/layer-6-audit.js')));
});

// C-06 Layer 6 public API + SEVERITY_ORDER frozen
record('C-06 Layer 6 API surface + SEVERITY_ORDER frozen', () => {
  const l = require(path.join(projectRoot, 'lib/defense/layer-6-audit'));
  assert.equal(typeof l.createLayer6Audit, 'function');
  assert.equal(typeof l.classifySeverity, 'function');
  assert.equal(typeof l.isInLayer6Audit, 'function');
  assert.ok(Object.isFrozen(l.SEVERITY_ORDER));
  assert.deepEqual([...l.SEVERITY_ORDER], ['low', 'medium', 'high', 'critical']);
  assert.equal(l.ROLLBACK_RATE_LIMIT_MS, 5 * 60 * 1000);
});

// C-07 Defense Layer barrel re-exports all 3
record('C-07 lib/defense/index.js barrel re-exports 3 modules', () => {
  const d = require(path.join(projectRoot, 'lib/defense'));
  assert.equal(typeof d.detectHeredoc, 'function');
  assert.equal(typeof d.detectPushCommand, 'function');
  assert.equal(typeof d.classifyRemote, 'function');
  assert.equal(typeof d.shouldGuardPush, 'function');
  assert.equal(typeof d.createLayer6Audit, 'function');
  assert.equal(typeof d.classifySeverity, 'function');
  assert.equal(typeof d.isInLayer6Audit, 'function');
});

// C-08 audit-logger ACTION_TYPES contains all 7 Sub-Sprint 2 actions
record('C-08 audit-logger ACTION_TYPES contains all Sub-Sprint 2 actions', () => {
  const a = require(path.join(projectRoot, 'lib/audit/audit-logger'));
  const required = [
    'layer_6_audit_completed',
    'layer_6_alarm_triggered',
    'heredoc_bypass_blocked',
    'git_push_intercepted',
    'post_tool_block_recorded',
    'hook_reachability_lost',
    'memory_directive_enforced', // Sub-Sprint 4 carry slot
  ];
  for (const action of required) {
    assert.ok(a.ACTION_TYPES.includes(action), 'ACTION_TYPES missing: ' + action);
  }
  // Total = 20 baseline + 7 new = 27
  assert.ok(a.ACTION_TYPES.length >= 27, 'expected ≥27 ACTION_TYPES, got ' + a.ACTION_TYPES.length);
});

// C-09 unified-bash-pre wires heredoc-detector + push-event-guard
record('C-09 unified-bash-pre.js wires heredoc + push-event-guard', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'scripts/unified-bash-pre.js'), 'utf8');
  assert.ok(/heredoc-detector/.test(src), 'heredoc-detector require missing');
  assert.ok(/push-event-guard/.test(src), 'push-event-guard require missing');
  assert.ok(/heredoc_bypass_blocked/.test(src), 'heredoc audit action missing');
  assert.ok(/git_push_intercepted/.test(src), 'push audit action missing');
});

// C-10 PostToolUse 3 scripts + session-start wired
record('C-10 PostToolUse hooks + session-start wire Layer 6 + reachability', () => {
  for (const f of ['scripts/unified-bash-post.js', 'scripts/unified-write-post.js', 'scripts/skill-post.js']) {
    const src = fs.readFileSync(path.join(projectRoot, f), 'utf8');
    assert.ok(/hook-reachability\.json/.test(src), f + ': reachability ping missing');
  }
  // Layer 6 wired in bash-post + write-post (skill-post is reachability-only)
  for (const f of ['scripts/unified-bash-post.js', 'scripts/unified-write-post.js']) {
    const src = fs.readFileSync(path.join(projectRoot, f), 'utf8');
    assert.ok(/layer-6-audit/.test(src), f + ': layer-6-audit require missing');
    assert.ok(/auditPostHoc/.test(src), f + ': auditPostHoc call missing');
  }
  // session-start reachability check
  const ss = fs.readFileSync(path.join(projectRoot, 'hooks/session-start.js'), 'utf8');
  assert.ok(/hook-reachability\.json/.test(ss), 'session-start reachability check missing');
  assert.ok(/hook_reachability_lost/.test(ss), 'session-start audit action missing');
});

// eslint-disable-next-line no-console
console.log('\n📊 Summary: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
process.exit(0);
