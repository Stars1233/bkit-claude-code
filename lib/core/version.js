/**
 * Centralized version constant for bkit plugin.
 *
 * v2.1.6 (ENH-167): bkitVersion made dynamic — prefers `version` field in bkit.config.json.
 * Fallback chain: PLUGIN_ROOT/.claude-plugin/plugin.json, then hard-coded default.
 * Docs=Code principle: read version from a single source of truth (bkit.config.json)
 * to prevent hard-coded mismatch regressions.
 *
 * @module lib/core/version
 */

const path = require('path');
const fs = require('fs');

const FALLBACK_VERSION = '2.1.6';

function _detectVersion() {
  // 1. Prefer bkit.config.json from PROJECT_DIR or PLUGIN_ROOT
  try {
    const candidates = [
      path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), 'bkit.config.json'),
      path.resolve(__dirname, '../../bkit.config.json'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (cfg && typeof cfg.version === 'string') return cfg.version;
      }
    }
  } catch (_e) { /* fallthrough */ }

  // 2. plugin.json fallback
  try {
    const pluginJson = path.resolve(__dirname, '../../.claude-plugin/plugin.json');
    if (fs.existsSync(pluginJson)) {
      const meta = JSON.parse(fs.readFileSync(pluginJson, 'utf8'));
      if (meta && typeof meta.version === 'string') return meta.version;
    }
  } catch (_e) { /* fallthrough */ }

  return FALLBACK_VERSION;
}

const BKIT_VERSION = _detectVersion();

module.exports = { BKIT_VERSION };
