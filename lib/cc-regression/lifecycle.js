/**
 * CC Regression Lifecycle — detect CC version, reconcile registry, emit resolution log.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.2.4
 * Plan SC: Automatic guard deactivation when CC ships fix.
 *
 * @module lib/cc-regression/lifecycle
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Detect the installed CC CLI version from ~/.claude/node_modules.
 * Falls back to reading @anthropic-ai/claude-code package.json if present.
 *
 * @returns {string|null} Semver string or null if not found
 */
function detectCCVersion() {
  const candidates = [
    path.join(os.homedir(), '.claude', 'node_modules', '@anthropic-ai', 'claude-code', 'package.json'),
    path.join(os.homedir(), '.npm-global', 'lib', 'node_modules', '@anthropic-ai', 'claude-code', 'package.json'),
    path.join('/usr/local/lib/node_modules', '@anthropic-ai', 'claude-code', 'package.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (pkg.version) return String(pkg.version);
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

function semverGte(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return true;
    if (pa[i] < pb[i]) return false;
  }
  return true; // equal
}

/**
 * Compare registry's expected fixes against actual CC version.
 * Marks guards as resolved when CC >= expectedFix.
 *
 * @param {Array<{id:string,expectedFix:string|null,resolvedAt:string|null}>} registry
 * @param {string} ccVersion
 * @returns {{ active: Array, resolved: Array }}
 */
function reconcile(registry, ccVersion) {
  if (!Array.isArray(registry) || !ccVersion) return { active: registry || [], resolved: [] };
  const resolved = [];
  const active = [];

  for (const g of registry) {
    if (g.resolvedAt) {
      resolved.push(g);
      continue;
    }
    if (g.expectedFix && semverGte(ccVersion, g.expectedFix)) {
      resolved.push({ ...g, resolvedAt: new Date().toISOString(), resolvedBy: ccVersion });
    } else {
      active.push(g);
    }
  }
  return { active, resolved };
}

/**
 * Emit a resolution log line (best-effort; lifecycle shouldn't throw).
 *
 * @param {Object} guard
 * @param {string} ccVersion
 */
function emitResolutionLog(guard, ccVersion) {
  try {
    // eslint-disable-next-line no-console
    console.warn(`[bkit:lifecycle] ${guard.id} resolved by CC ${ccVersion}`);
  } catch {
    /* non-critical */
  }
}

module.exports = { detectCCVersion, reconcile, emitResolutionLog, semverGte };
