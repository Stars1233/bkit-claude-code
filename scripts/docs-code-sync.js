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

  // v2.1.10 Sprint 6 NEW 6-6 (ENH-276): BKIT_VERSION invariant cross-check
  const versionReport = await scanner.scanVersions();

  // v2.1.11 Sprint α NEW (FR-α2-f): One-Liner SSoT cross-check
  const oneLinerReport = await scanner.scanOneLiner();

  // Incremental rollout: only `plugin.json` is enforced today. As FR-α1
  // (Task #7), FR-α2-e (Task #6), FR-α3 etc. land their respective sync,
  // uncomment the matching entries to widen the CI gate. Sprint α DoD
  // (Task #10) requires all 5 entries enforced.
  const ONE_LINER_ENFORCE = new Set([
    'plugin.json',           // FR-α2-b
    'CHANGELOG.md',          // FR-α2-e
    'README.md',             // FR-α1 + FR-α2-c
    'README-FULL.md',        // FR-α1 + FR-α2-d
    'session-context.js',    // FR-α2-c (SessionStart intro literal)
  ]);
  const fatalOneLinerMismatches    = oneLinerReport.mismatches.filter((m) => ONE_LINER_ENFORCE.has(m.name));
  const advisoryOneLinerMismatches = oneLinerReport.mismatches.filter((m) => !ONE_LINER_ENFORCE.has(m.name));

  const report = {
    measured,
    expected: EXPECTED_COUNTS,
    invariantDiffs,
    docDiffs: allDocDiffs,
    version: versionReport,
    oneLiner: oneLinerReport,
    oneLinerEnforce: Array.from(ONE_LINER_ENFORCE),
    passed:
      invariantDiffs.length === 0 &&
      allDocDiffs.length === 0 &&
      versionReport.mismatches.length === 0 &&
      fatalOneLinerMismatches.length === 0,
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

    // v2.1.10 Sprint 6 NEW 6-6: version invariant report
    // eslint-disable-next-line no-console
    console.log(`\n[docs-code-sync] BKIT_VERSION invariant:`);
    // eslint-disable-next-line no-console
    console.log(`  canonical (bkit.config.json): ${versionReport.canonical || '(none)'}`);
    // eslint-disable-next-line no-console
    console.log(`  plugin.json:    ${versionReport.pluginJson || '(none)'}`);
    // eslint-disable-next-line no-console
    console.log(`  README.md:      ${versionReport.readme || '(none)'}`);
    // eslint-disable-next-line no-console
    console.log(`  CHANGELOG.md:   ${versionReport.changelog || '(none)'}`);
    // eslint-disable-next-line no-console
    console.log(`  hooks/hooks.json: ${versionReport.hooksJson || '(none)'}`);

    if (versionReport.mismatches.length > 0) {
      // eslint-disable-next-line no-console
      console.error('\n[docs-code-sync] ✗ BKIT_VERSION mismatch:');
      for (const m of versionReport.mismatches) {
        // eslint-disable-next-line no-console
        console.error(`  ✗ ${m.file} (${m.field}): declared ${m.declared}, canonical ${versionReport.canonical}`);
      }
    }

    // v2.1.11 Sprint α NEW (FR-α2-f): One-Liner SSoT report
    // eslint-disable-next-line no-console
    console.log(`\n[docs-code-sync] One-Liner SSoT (${oneLinerReport.syncCount}/${oneLinerReport.results.length} synchronised):`);
    for (const r of oneLinerReport.results) {
      const sym = r.status === 'sync' ? '✓' : r.status === 'drift' ? '✗' : '…';
      // eslint-disable-next-line no-console
      console.log(`  ${sym} ${r.name} (${r.path}): ${r.status}`);
    }
    if (fatalOneLinerMismatches.length > 0) {
      // eslint-disable-next-line no-console
      console.error('\n[docs-code-sync] ✗ One-Liner drift in enforced location(s) — must sync verbatim:');
      for (const m of fatalOneLinerMismatches) {
        // eslint-disable-next-line no-console
        console.error(`  ✗ ${m.path} — expected verbatim One-Liner from lib/infra/branding.js`);
      }
    }
    if (advisoryOneLinerMismatches.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`\n[docs-code-sync] ⚠ One-Liner advisory drift (not yet enforced — pending FR-α1/α2-c/d/e/3):`);
      for (const m of advisoryOneLinerMismatches) {
        // eslint-disable-next-line no-console
        console.warn(`  ⚠ ${m.path} — will be enforced once corresponding FR ships`);
      }
    }
    if (oneLinerReport.pending.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`\n[docs-code-sync] ⚠ One-Liner pending sync (file not yet created): ${oneLinerReport.pending.length} location(s)`);
    }

    if (report.passed) {
      // eslint-disable-next-line no-console
      console.log('\n[docs-code-sync] ✓ PASSED — all counts consistent across code + docs');
    } else {
      // eslint-disable-next-line no-console
      console.error(
        `\n[docs-code-sync] ✗ FAILED — ${invariantDiffs.length} invariant + ${allDocDiffs.length} doc drift + ${versionReport.mismatches.length} version drift + ${fatalOneLinerMismatches.length} one-liner drift (enforced)`
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
