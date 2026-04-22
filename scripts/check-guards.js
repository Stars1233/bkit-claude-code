#!/usr/bin/env node
/*
 * check-guards.js — CLI Guard Registry validator for CI.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §6
 * Plan SC: Sprint 3 — CI gate for Guard Registry drift prevention.
 *
 * Validates that every entry in `lib/cc-regression/registry.js` has:
 *   - id (unique, non-empty string)
 *   - issue (valid GitHub issue URL)
 *   - severity in {LOW, MEDIUM, HIGH, CRITICAL}
 *   - since (semver-ish string)
 *   - expectedFix (null or semver string)
 *   - resolvedAt (null or ISO timestamp)
 *   - notes (non-empty string)
 *   - If `guardFile` specified: file exists
 *
 * Exit codes:
 *   0 — all guards valid
 *   1 — one or more guards invalid
 *   2 — runner error
 *
 * Usage: node scripts/check-guards.js [--json]
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const registry = require('../lib/cc-regression/registry');

const ALLOWED_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SEMVER_RE = /^\d+\.\d+\.(\d+|x)$/;
const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}T/;
const ISSUE_URL_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/;

function isJsonFlag() {
  return process.argv.includes('--json');
}

function main() {
  const issues = [];
  const seenIds = new Set();
  const guards = registry.CC_REGRESSIONS;

  if (!Array.isArray(guards) || guards.length === 0) {
    issues.push({ level: 'fatal', msg: 'registry.CC_REGRESSIONS is empty or not an array' });
  }

  for (const g of guards) {
    const ctx = `Guard '${g.id || '<unnamed>'}'`;

    // Required: id
    if (!g.id || typeof g.id !== 'string') {
      issues.push({ level: 'error', msg: `${ctx}: missing or invalid 'id'` });
      continue;
    }
    if (seenIds.has(g.id)) {
      issues.push({ level: 'error', msg: `${ctx}: duplicate id` });
    }
    seenIds.add(g.id);

    // issue URL
    if (!g.issue || typeof g.issue !== 'string') {
      issues.push({ level: 'error', msg: `${ctx}: missing 'issue' URL` });
    } else if (!ISSUE_URL_RE.test(g.issue)) {
      issues.push({ level: 'warn', msg: `${ctx}: 'issue' is not a github.com/.../issues/N URL: ${g.issue}` });
    }

    // severity
    if (!ALLOWED_SEVERITIES.includes(g.severity)) {
      issues.push({ level: 'error', msg: `${ctx}: severity must be one of ${ALLOWED_SEVERITIES.join('|')}, got '${g.severity}'` });
    }

    // since
    if (!g.since || typeof g.since !== 'string') {
      issues.push({ level: 'error', msg: `${ctx}: missing 'since'` });
    } else if (!SEMVER_RE.test(g.since)) {
      issues.push({ level: 'warn', msg: `${ctx}: 'since' not in semver form: ${g.since}` });
    }

    // expectedFix (optional, null OK)
    if (g.expectedFix !== null && g.expectedFix !== undefined) {
      if (typeof g.expectedFix !== 'string' || !SEMVER_RE.test(g.expectedFix)) {
        issues.push({ level: 'warn', msg: `${ctx}: 'expectedFix' not semver: ${g.expectedFix}` });
      }
    }

    // resolvedAt
    if (g.resolvedAt !== null && g.resolvedAt !== undefined) {
      if (typeof g.resolvedAt !== 'string' || !ISO_TS_RE.test(g.resolvedAt)) {
        issues.push({ level: 'warn', msg: `${ctx}: 'resolvedAt' not ISO timestamp: ${g.resolvedAt}` });
      }
    }

    // notes
    if (!g.notes || typeof g.notes !== 'string') {
      issues.push({ level: 'warn', msg: `${ctx}: missing 'notes' (recommended for triage)` });
    }

    // guardFile existence (optional)
    if (g.guardFile) {
      const full = path.join(PROJECT_ROOT, g.guardFile);
      if (!fs.existsSync(full)) {
        issues.push({ level: 'error', msg: `${ctx}: guardFile '${g.guardFile}' does not exist` });
      }
    }

    // affectedFiles existence (warn only — path:line format common)
    if (Array.isArray(g.affectedFiles)) {
      for (const ref of g.affectedFiles) {
        const filePart = String(ref).split(':')[0];
        if (!filePart) continue;
        const full = path.join(PROJECT_ROOT, filePart);
        if (!fs.existsSync(full)) {
          issues.push({ level: 'warn', msg: `${ctx}: affectedFile '${ref}' not found` });
        }
      }
    }
  }

  // Deactivation lifecycle sanity: if resolvedAt set, expectedFix usually set too
  for (const g of guards) {
    if (g.resolvedAt && !g.expectedFix) {
      issues.push({ level: 'warn', msg: `Guard '${g.id}': resolvedAt set but expectedFix is null — consider documenting the fix version` });
    }
  }

  // Summary
  const errors = issues.filter((i) => i.level === 'error' || i.level === 'fatal');
  const warnings = issues.filter((i) => i.level === 'warn');

  if (isJsonFlag()) {
    process.stdout.write(
      JSON.stringify(
        {
          guardCount: guards.length,
          errors: errors.length,
          warnings: warnings.length,
          issues,
          passed: errors.length === 0,
        },
        null,
        2
      ) + '\n'
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(`[check-guards] Scanning ${guards.length} registry entries...`);
    for (const i of issues) {
      const prefix = i.level === 'error' || i.level === 'fatal' ? '✗' : '⚠';
      const stream = i.level === 'error' || i.level === 'fatal' ? console.error : console.warn;
      // eslint-disable-next-line no-console
      stream(`  ${prefix} [${i.level}] ${i.msg}`);
    }
    // eslint-disable-next-line no-console
    if (errors.length === 0) {
      console.log(`[check-guards] ✓ PASSED — ${guards.length} guards, ${warnings.length} warning(s)`);
    } else {
      // eslint-disable-next-line no-console
      console.error(`[check-guards] ✗ FAILED — ${errors.length} error(s), ${warnings.length} warning(s)`);
    }
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

try {
  main();
} catch (e) {
  // eslint-disable-next-line no-console
  console.error(`[check-guards] runner error: ${e.message}`);
  process.exit(2);
}
