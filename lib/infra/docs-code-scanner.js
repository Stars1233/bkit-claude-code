/**
 * DocsCodeIndexPort implementation — measures filesystem inventory and cross-checks docs.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.3.5 (Sprint 4)
 * Plan SC: ENH-241 Docs=Code cross-check — single source of truth is `EXPECTED_COUNTS`
 *   in `lib/domain/rules/docs-code-invariants.js`. Scanner returns measured counts;
 *   the domain rule compares and emits discrepancies.
 *
 * @module lib/infra/docs-code-scanner
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/** @typedef {import('../domain/ports/docs-code-index.port').InventoryMeasurement} InventoryMeasurement */
/** @typedef {import('../domain/ports/docs-code-index.port').Discrepancy} Discrepancy */

/**
 * Count entries in skills/ directory (direct children that contain SKILL.md).
 * @returns {number}
 */
function countSkills() {
  const dir = path.join(PROJECT_ROOT, 'skills');
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir)
    .filter((d) => {
      try {
        const sub = path.join(dir, d);
        return fs.statSync(sub).isDirectory() && fs.existsSync(path.join(sub, 'SKILL.md'));
      } catch {
        return false;
      }
    }).length;
}

function countAgents() {
  const dir = path.join(PROJECT_ROOT, 'agents');
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).length;
}

function countHooks() {
  const hooksJson = path.join(PROJECT_ROOT, 'hooks', 'hooks.json');
  if (!fs.existsSync(hooksJson)) return { events: 0, blocks: 0 };
  const data = JSON.parse(fs.readFileSync(hooksJson, 'utf8'));
  const events = Object.keys(data.hooks || {}).length;
  let blocks = 0;
  for (const [, entries] of Object.entries(data.hooks || {})) {
    blocks += entries.length;
  }
  return { events, blocks };
}

function countMCPServers() {
  const dir = path.join(PROJECT_ROOT, 'servers');
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir)
    .filter((d) => fs.statSync(path.join(dir, d)).isDirectory()).length;
}

function countMCPTools() {
  const dir = path.join(PROJECT_ROOT, 'servers');
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const servers = fs.readdirSync(dir).filter((s) => fs.statSync(path.join(dir, s)).isDirectory());
  for (const server of servers) {
    const indexPath = path.join(dir, server, 'index.js');
    if (!fs.existsSync(indexPath)) continue;
    const source = fs.readFileSync(indexPath, 'utf8');
    const matches = source.match(/(?:^|[\s{,])["']?name["']?\s*:\s*['"](bkit_[a-z_]+)['"]/gm) || [];
    const names = new Set();
    for (const m of matches) {
      const inner = m.match(/['"](bkit_[a-z_]+)['"]/);
      if (inner) names.add(inner[1]);
    }
    total += names.size;
  }
  return total;
}

function countLibModules() {
  const dir = path.join(PROJECT_ROOT, 'lib');
  if (!fs.existsSync(dir)) return 0;
  // Count all .js files recursively in lib/.
  function walk(p) {
    let n = 0;
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) n += walk(full);
      else if (entry.isFile() && entry.name.endsWith('.js')) n++;
    }
    return n;
  }
  return walk(dir);
}

function countScripts() {
  const dir = path.join(PROJECT_ROOT, 'scripts');
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith('.js')).length;
}

/**
 * Measure the current inventory.
 *
 * @returns {Promise<InventoryMeasurement>}
 */
async function measure() {
  const hooks = countHooks();
  return {
    skills: countSkills(),
    agents: countAgents(),
    hookEvents: hooks.events,
    hookBlocks: hooks.blocks,
    mcpServers: countMCPServers(),
    mcpTools: countMCPTools(),
    libModules: countLibModules(),
    scripts: countScripts(),
  };
}

/**
 * Scan a document for any explicit inventory count references.
 *
 * Patterns recognised:
 *   "39 Skills", "36 Agents", "21 Hook Events", "24 blocks",
 *   "16 MCP tools", "2 MCP Servers", "101 Lib modules", "43 Scripts"
 *
 * Returns discrepancies compared to measured values (not EXPECTED_COUNTS).
 *
 * @param {string} docPath - absolute or project-relative path
 * @returns {Promise<Discrepancy[]>}
 */
async function crossCheck(docPath) {
  const full = path.isAbsolute(docPath) ? docPath : path.join(PROJECT_ROOT, docPath);
  if (!fs.existsSync(full)) return [];

  const content = fs.readFileSync(full, 'utf8');
  const actual = await measure();
  const discrepancies = [];

  // Sprint 4 scope: Invocation Contract surface only (immutable under Minor).
  // Internal implementation sizes (libModules, scripts) vary naturally per release
  // and are excluded from Docs=Code gate to avoid false positives. Use --strict
  // CLI flag (future) to include them if needed for a full audit.
  const PATTERNS = [
    { re: /(\d+)\s+Skills\b/gi, field: 'skills' },
    { re: /(\d+)\s+Agents\b/gi, field: 'agents' },
    { re: /(\d+)\s+Hook\s+Events\b/gi, field: 'hookEvents' },
    { re: /(\d+)\s+(?:hook\s+)?blocks\b/gi, field: 'hookBlocks' },
    { re: /(\d+)\s+MCP\s+(?:tool|Tool)s?\b/gi, field: 'mcpTools' },
    { re: /(\d+)\s+MCP\s+Server/gi, field: 'mcpServers' },
  ];

  for (const { re, field } of PATTERNS) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const declared = parseInt(m[1], 10);
      if (declared !== actual[field]) {
        discrepancies.push({ docPath, field, declared, actual: actual[field] });
      }
    }
  }

  return discrepancies;
}

/**
 * v2.1.10 Sprint 6 NEW 6-6 (ENH-276): BKIT_VERSION invariant scan.
 *
 * Cross-checks version declarations across:
 *   - bkit.config.json:version (single source of truth)
 *   - .claude-plugin/plugin.json:version
 *   - README.md badge `Version-X.Y.Z`
 *   - CHANGELOG.md latest `## [X.Y.Z]` header
 *   - hooks.json description string (approximate)
 *
 * Reports the canonical version + any file whose declared version disagrees.
 *
 * @returns {Promise<{canonical:string|null, bkitConfig:string|null, pluginJson:string|null, readme:string|null, changelog:string|null, hooksJson:string|null, mismatches:Array<{file:string, field:string, declared:string|null}>}>}
 */
async function scanVersions() {
  function readJSONField(relPath, field) {
    try {
      const full = path.join(PROJECT_ROOT, relPath);
      if (!fs.existsSync(full)) return null;
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      return data && typeof data[field] === 'string' ? data[field] : null;
    } catch {
      return null;
    }
  }

  const bkitConfig = readJSONField('bkit.config.json', 'version');
  const pluginJson = readJSONField('.claude-plugin/plugin.json', 'version');

  let readme = null;
  try {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, 'README.md'), 'utf8');
    const m = content.match(/Version-(\d+\.\d+\.\d+)/);
    readme = m ? m[1] : null;
  } catch {}

  let changelog = null;
  try {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, 'CHANGELOG.md'), 'utf8');
    const m = content.match(/^\s*##\s*\[?(\d+\.\d+\.\d+)\]?/m);
    changelog = m ? m[1] : null;
  } catch {}

  let hooksJson = null;
  try {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, 'hooks', 'hooks.json'), 'utf8');
    const m = content.match(/v(\d+\.\d+\.\d+)/);
    hooksJson = m ? m[1] : null;
  } catch {}

  const canonical = bkitConfig; // single source of truth
  const mismatches = [];
  if (canonical) {
    if (pluginJson !== null && pluginJson !== canonical) mismatches.push({ file: '.claude-plugin/plugin.json', field: 'version', declared: pluginJson });
    if (readme !== null && readme !== canonical) mismatches.push({ file: 'README.md', field: 'badge', declared: readme });
    if (changelog !== null && changelog !== canonical) mismatches.push({ file: 'CHANGELOG.md', field: 'top-header', declared: changelog });
    if (hooksJson !== null && hooksJson !== canonical) mismatches.push({ file: 'hooks/hooks.json', field: 'description', declared: hooksJson });
  }

  return { canonical, bkitConfig, pluginJson, readme, changelog, hooksJson, mismatches };
}

module.exports = {
  measure,
  crossCheck,
  scanVersions, // Sprint 6 NEW 6-6
  // helpers (for testing)
  countSkills,
  countAgents,
  countHooks,
  countMCPServers,
  countMCPTools,
  countLibModules,
  countScripts,
};
