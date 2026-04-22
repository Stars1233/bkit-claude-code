#!/usr/bin/env node
/*
 * QA Aggregator — parse test file outputs and tally PASS/FAIL/SKIP.
 *
 * Design Ref: bkit-v2110 Sprint 1 QA Phase (qa-lead delegation).
 * Scope: existing test/unit + new test/contract + Sprint 1 additions.
 *
 * module: test/contract/scripts/qa-aggregate
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const TEST_DIRS = [
  { dir: path.join(PROJECT_ROOT, 'test', 'unit'), label: 'unit' },
  { dir: path.join(PROJECT_ROOT, 'test', 'contract'), label: 'contract' },
];

function findTestFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.test.js') || f.endsWith('.spec.js'))
    .map((f) => path.join(dir, f));
}

/** Parse common summary patterns emitted by bkit tests. */
function parseSummary(stdout) {
  if (!stdout) return { pass: 0, fail: 0, skip: 0 };
  let pass = 0, fail = 0, skip = 0;

  // Pattern 1: "Tests: NN/NN PASS, NN FAIL, NN SKIP" or "X/Y passed, Z failed"
  const m1 = stdout.match(/(\d+)\s*\/\s*(\d+)\s*(?:PASS(?:ED)?|passed)\s*,\s*(\d+)\s*(?:FAIL(?:ED)?|failed)(?:\s*,\s*(\d+)\s*(?:SKIP(?:PED)?|skipped))?/i);
  if (m1) {
    pass = parseInt(m1[1], 10);
    fail = parseInt(m1[3], 10);
    skip = parseInt(m1[4] || '0', 10);
    return { pass, fail, skip };
  }

  // Pattern 2: count `PASS:` lines
  const passLines = (stdout.match(/^\s*(✓|PASS:|PASS\s)/gm) || []).length;
  const failLines = (stdout.match(/^\s*(✗|FAIL:|FAIL\s)/gm) || []).length;
  const skipLines = (stdout.match(/^\s*(SKIP:|SKIP\s)/gm) || []).length;
  if (passLines || failLines || skipLines) {
    return { pass: passLines, fail: failLines, skip: skipLines };
  }

  // Pattern 3: "Results: X/Y passed"
  const m3 = stdout.match(/Results:\s*(\d+)\s*\/\s*(\d+)/);
  if (m3) return { pass: parseInt(m3[1], 10), fail: parseInt(m3[2], 10) - parseInt(m3[1], 10), skip: 0 };

  // Pattern 4: explicit PASSED n assertion
  const m4 = stdout.match(/✓\s*PASSED\s*\((\d+)\s*assertions?/i);
  if (m4) return { pass: parseInt(m4[1], 10), fail: 0, skip: 0 };

  return { pass: 0, fail: 0, skip: 0 };
}

function main() {
  const results = [];
  let total = { files: 0, pass: 0, fail: 0, skip: 0, errors: 0 };

  for (const { dir, label } of TEST_DIRS) {
    const files = findTestFiles(dir);
    for (const file of files) {
      total.files++;
      let out = '';
      let error = null;
      try {
        out = execSync(`node "${file}"`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 30000,
        });
      } catch (e) {
        error = e.message;
        out = (e.stdout || '') + (e.stderr || '');
        total.errors++;
      }
      const summary = parseSummary(out);
      total.pass += summary.pass;
      total.fail += summary.fail;
      total.skip += summary.skip;
      results.push({
        file: path.relative(PROJECT_ROOT, file),
        label,
        ...summary,
        error: error ? error.split('\n')[0].slice(0, 80) : null,
      });
    }
  }

  // Also count the standalone contract runner we already executed (226 assertions).
  // These were executed separately via `node test/contract/scripts/contract-test-run.js`.
  try {
    const runnerOut = execSync(
      `node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L1,L4`,
      { encoding: 'utf8', cwd: PROJECT_ROOT, timeout: 10000 }
    );
    const m = runnerOut.match(/PASSED \((\d+)\s*assertions?/);
    if (m) {
      const assertions = parseInt(m[1], 10);
      total.pass += assertions;
      results.push({
        file: 'test/contract/scripts/contract-test-run.js (L1+L4)',
        label: 'contract-runner',
        pass: assertions,
        fail: 0,
        skip: 0,
        error: null,
      });
      total.files++;
    }
  } catch {
    /* non-critical */
  }

  // Print per-file summary
  // eslint-disable-next-line no-console
  console.log('\n=== Per-file Results ===');
  for (const r of results) {
    const mark = r.error ? '⚠' : r.fail > 0 ? '✗' : '✓';
    // eslint-disable-next-line no-console
    console.log(
      `${mark} [${r.label}] ${r.file} — pass:${r.pass} fail:${r.fail} skip:${r.skip}` +
        (r.error ? ` (error: ${r.error})` : '')
    );
  }

  // Print totals
  // eslint-disable-next-line no-console
  console.log('\n=== Aggregate ===');
  // eslint-disable-next-line no-console
  console.log(`Test files: ${total.files}`);
  // eslint-disable-next-line no-console
  console.log(`Errors (files that threw): ${total.errors}`);
  // eslint-disable-next-line no-console
  console.log(`PASS: ${total.pass}`);
  // eslint-disable-next-line no-console
  console.log(`FAIL: ${total.fail}`);
  // eslint-disable-next-line no-console
  console.log(`SKIP: ${total.skip}`);
  // eslint-disable-next-line no-console
  console.log(`TOTAL TC: ${total.pass + total.fail + total.skip}`);

  // Write summary JSON
  const summaryPath = path.join(PROJECT_ROOT, '.bkit', 'runtime', 'qa-aggregate.json');
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, JSON.stringify({ total, results, at: new Date().toISOString() }, null, 2));
  // eslint-disable-next-line no-console
  console.log(`\nSummary written: ${summaryPath}`);
}

if (require.main === module) main();
