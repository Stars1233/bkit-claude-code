/**
 * sprint-alpha-contract.test.js — Invocation Contract additions for Sprint α
 *
 * Maps to Design §8.5 contract assertions C-α-01 and C-α-02. Joins the
 * existing 226-assertion baseline without disturbing it.
 *
 * @module test/contract/sprint-alpha-contract.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

// ── C-α-01: hooks.json SessionStart matcher unchanged shape ─────────────────
test('C-α-01: hooks.json SessionStart entry exists with the locked schema', () => {
  const hooksJsonPath = path.join(PROJECT_ROOT, 'hooks/hooks.json');
  const data = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));

  assert.ok(data.hooks, 'hooks root must exist');
  assert.ok(Array.isArray(data.hooks.SessionStart),
    'hooks.SessionStart must be an array');
  assert.ok(data.hooks.SessionStart.length >= 1,
    'hooks.SessionStart must have at least one entry');

  // Each entry must conform to the locked structure: { matcher, hooks: [{ type, command }] }
  for (const entry of data.hooks.SessionStart) {
    assert.ok('matcher' in entry || 'hooks' in entry,
      'SessionStart entry must declare matcher and/or hooks');
    if (Array.isArray(entry.hooks)) {
      for (const h of entry.hooks) {
        assert.ok(h.type, 'hook entry must declare type');
        assert.ok(h.command || h.script || h.path,
          'hook entry must declare a command/script/path target');
      }
    }
  }

  // bkit own SessionStart hook must be wired to hooks/session-start.js
  const allCommands = data.hooks.SessionStart.flatMap((e) =>
    (e.hooks || []).map((h) => h.command || h.script || h.path || '')
  );
  const wired = allCommands.some((c) => /session-start\.js/.test(c));
  assert.ok(wired, 'session-start.js must be wired in hooks.SessionStart');
});

// ── C-α-02: First-Run AUQ options array length === 3 (locked) ───────────────
test('C-α-02: First-Run AUQ exposes exactly 3 options in locked order', () => {
  const { buildFirstRunPrompt } = require(
    path.join(PROJECT_ROOT, 'hooks/startup/first-run')
  );
  const payload = buildFirstRunPrompt();

  assert.equal(payload.questions.length, 1,
    'AUQ payload must contain exactly one question');
  const q = payload.questions[0];
  assert.equal(q.options.length, 3,
    `expected exactly 3 options, got ${q.options.length}`);

  // Locked label order — see design anchor §1.5 / §2
  const labels = q.options.map((o) => o.label);
  assert.match(labels[0], /Start 3-min tutorial/);
  assert.match(labels[1], /Later/);
  assert.match(labels[2], /Skip permanently/);

  // Locked AUQ contract — header constant + multiSelect false
  assert.equal(q.header, 'First Run');
  assert.equal(q.multiSelect, false);
});

// ── Bonus: Sprint α surface invariant — preflight + first-run modules wired ─
test('C-α-bonus: hooks/session-start.js wires preflight + first-run modules', () => {
  const sessionStartSrc = fs.readFileSync(
    path.join(PROJECT_ROOT, 'hooks/session-start.js'),
    'utf8'
  );
  assert.match(sessionStartSrc, /require\(['"]\.\/startup\/preflight['"]\)/,
    'session-start.js must require ./startup/preflight');
  assert.match(sessionStartSrc, /require\(['"]\.\/startup\/first-run['"]\)/,
    'session-start.js must require ./startup/first-run');
});
