/**
 * first-run.test.js — Unit tests for FR-α3 First-Run AUQ + seen.json
 *
 * Each test isolates `CLAUDE_PROJECT_DIR` to a temp directory so the marker
 * file lifecycle is verified end-to-end.
 *
 * Validation rules referenced from the design anchor:
 *   docs/02-design/styles/bkit-v2111-alpha-tutorial.design-anchor.md §4
 *
 * @module test/unit/first-run.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const firstRun = require('../../hooks/startup/first-run');

function withTempProject(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-first-run-'));
  const orig = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = dir;
  try {
    return fn(dir);
  } finally {
    if (orig === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = orig;
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* noop */ }
  }
}

test('isFirstRun: true when marker missing', () => {
  withTempProject(() => {
    assert.equal(firstRun.isFirstRun(), true);
  });
});

test('isFirstRun: false when marker exists', () => {
  withTempProject((dir) => {
    const target = path.join(dir, '.bkit', 'runtime', 'first-run-seen.json');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '{}');
    assert.equal(firstRun.isFirstRun(), false);
  });
});

test('markFirstRunSeen: creates marker with correct schema', () => {
  withTempProject((dir) => {
    const ok = firstRun.markFirstRunSeen('shown');
    assert.equal(ok, true);

    const target = path.join(dir, '.bkit', 'runtime', 'first-run-seen.json');
    assert.ok(fs.existsSync(target));

    const data = JSON.parse(fs.readFileSync(target, 'utf8'));
    assert.equal(data.tutorialResponse, 'shown');
    assert.match(data.seenAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok('version' in data);
    assert.ok('ccVersionAtFirstRun' in data);
  });
});

test('markFirstRunSeen: idempotent — overwrite on second call', () => {
  withTempProject(() => {
    firstRun.markFirstRunSeen('shown');
    const ok = firstRun.markFirstRunSeen('skip');
    assert.equal(ok, true);
    assert.equal(firstRun.isFirstRun(), false);
  });
});

test('buildFirstRunPrompt: VAL-01 exactly 3 options', () => {
  const p = firstRun.buildFirstRunPrompt();
  assert.equal(p.questions.length, 1);
  assert.equal(p.questions[0].options.length, 3);
});

test('buildFirstRunPrompt: VAL-02 every option has label + description', () => {
  const p = firstRun.buildFirstRunPrompt();
  for (const opt of p.questions[0].options) {
    assert.equal(typeof opt.label, 'string');
    assert.ok(opt.label.length > 0);
    assert.equal(typeof opt.description, 'string');
    assert.ok(opt.description.length > 0);
  }
});

test('buildFirstRunPrompt: VAL-03 first option mentions "3-min tutorial"', () => {
  const p = firstRun.buildFirstRunPrompt();
  assert.match(p.questions[0].options[0].label, /3-min tutorial/);
});

test('buildFirstRunPrompt: VAL-04 Korean opener when LANG=ko', () => {
  const p = firstRun.buildFirstRunPrompt({ lang: 'ko_KR.UTF-8' });
  assert.match(p.questions[0].question, /처음이시군요/);
});

test('buildFirstRunPrompt: VAL-04 English opener when LANG=en', () => {
  const p = firstRun.buildFirstRunPrompt({ lang: 'en_US.UTF-8' });
  assert.match(p.questions[0].question, /Welcome to bkit/);
});

test('buildFirstRunPrompt: locked AUQ contract — header / multiSelect', () => {
  const p = firstRun.buildFirstRunPrompt();
  assert.equal(p.questions[0].header, 'First Run');
  assert.equal(p.questions[0].multiSelect, false);
});

test('run: returns { userPrompt } on first run AND marks seen', () => {
  withTempProject(() => {
    const r = firstRun.run();
    assert.ok(r);
    assert.equal(typeof r.userPrompt, 'string');
    assert.ok(r.userPrompt.includes('First Run'));
    // VAL-05: seen.json now exists
    assert.equal(firstRun.isFirstRun(), false);
  });
});

test('run: returns null on subsequent runs', () => {
  withTempProject(() => {
    firstRun.run(); // first call
    const second = firstRun.run();
    assert.equal(second, null);
  });
});

test('VAL-06: tutorialResponse value persisted exactly as supplied', () => {
  withTempProject((dir) => {
    firstRun.markFirstRunSeen('skip');
    const data = JSON.parse(
      fs.readFileSync(path.join(dir, '.bkit/runtime/first-run-seen.json'), 'utf8'),
    );
    assert.equal(data.tutorialResponse, 'skip');
  });
});
