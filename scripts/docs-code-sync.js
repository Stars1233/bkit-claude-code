#!/usr/bin/env node
/*
 * docs-code-sync.js — Docs=Code cross-check CLI (Sprint 4, ENH-241).
 *
 * Scans a predefined set of documentation files for inventory count references
 * and compares them against filesystem-measured values. Exits non-zero if any
 * discrepancy is found (CI gate).
 *
 * Usage:
 *   node scripts/docs-code-sync.js                  # human-readable report
 *   node scripts/docs-code-sync.js --json           # JSON output
 *   node scripts/docs-code-sync.js --docs=foo.md,bar.md  # override scan targets
 *
 * Exit codes:
 *   0 — all declared counts match measured values
 *   1 — one or more discrepancies (CI FAIL)
 *   2 — runner error
 */

const fs = require('fs');
const path = require('path');
const scanner = require('../lib/infra/docs-code-scanner');
const { EXPECTED_COUNTS, diffCounts } = require('../lib/domain/rules/docs-code-invariants');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Default targets: only files with authoritative CURRENT inventory declarations.
// README.md / CHANGELOG.md / marketplace.json are excluded because they accumulate
// release-history snapshots ("at-the-time" counts) that must remain immutable.
// plugin.json `description` field is the single authoritative current-state declaration.
const DEFAULT_DOC_TARGETS = [
  '.claude-plugin/plugin.json',
];

function isJsonFlag() {
  return process.argv.includes('--json');
}

function getDocsArg() {
  const arg = process.argv.find((a) => a.startsWith('--docs='));
  if (!arg) return DEFAULT_DOC_TARGETS;
  return arg.slice('--docs='.length).split(',').map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const docs = getDocsArg();
  const measured = await scanner.measure();

  // Layer 1: EXPECTED_COUNTS vs measured (Docs=Code invariant integrity)
  const invariantDiffs = diffCounts({
    skills: measured.skills,
    agents: measured.agents,
    hookEvents: measured.hookEvents,
    hookBlocks: measured.hookBlocks,
    mcpServers: measured.mcpServers,
    mcpTools: measured.mcpTools,
  });

  // Layer 2: each document vs measured
  const allDocDiffs = [];
  for (const doc of docs) {
    const full = path.isAbsolute(doc) ? doc : path.join(PROJECT_ROOT, doc);
    if (!fs.existsSync(full)) {
      allDocDiffs.push({ docPath: doc, field: '_missing', declared: 0, actual: 0 });
      continue;
    }
    const diffs = await scanner.crossCheck(doc);
    allDocDiffs.push(...diffs);
  }

  const report = {
    measured,
    expected: EXPECTED_COUNTS,
    invariantDiffs,
    docDiffs: allDocDiffs,
    passed: invariantDiffs.length === 0 && allDocDiffs.length === 0,
  };

  if (isJsonFlag()) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    // eslint-disable-next-line no-console
    console.log('[docs-code-sync] Measured inventory:');
    for (const [field, val] of Object.entries(measured)) {
      // eslint-disable-next-line no-console
      console.log(`  ${field}: ${val}`);
    }

    if (invariantDiffs.length > 0) {
      // eslint-disable-next-line no-console
      console.error('\n[docs-code-sync] ✗ EXPECTED_COUNTS mismatch (domain invariant violation):');
      for (const d of invariantDiffs) {
        // eslint-disable-next-line no-console
        console.error(`  ✗ ${d.field}: expected ${d.expected}, measured ${d.actual}`);
      }
    }

    if (allDocDiffs.length > 0) {
      // eslint-disable-next-line no-console
      console.error('\n[docs-code-sync] ✗ Document declaration drift:');
      for (const d of allDocDiffs) {
        if (d.field === '_missing') {
          // eslint-disable-next-line no-console
          console.warn(`  ⚠ ${d.docPath}: not found`);
        } else {
          // eslint-disable-next-line no-console
          console.error(`  ✗ ${d.docPath}: '${d.field}' declared ${d.declared}, measured ${d.actual}`);
        }
      }
    }

    if (report.passed) {
      // eslint-disable-next-line no-console
      console.log('\n[docs-code-sync] ✓ PASSED — all counts consistent across code + docs');
    } else {
      // eslint-disable-next-line no-console
      console.error(
        `\n[docs-code-sync] ✗ FAILED — ${invariantDiffs.length} invariant + ${allDocDiffs.length} doc drift`
      );
    }
  }

  process.exit(report.passed ? 0 : 1);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`[docs-code-sync] runner error: ${e.message}`);
  process.exit(2);
});
