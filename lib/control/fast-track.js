/**
 * fast-track.js — Daniel-mode Checkpoint auto-approve gate (FR-β5)
 *
 * Pure-data helpers for the `/pdca-fast-track` slash command. Decides
 * whether the engaging conditions are met and records the audit trail
 * to `.bkit/runtime/fast-track-log.json`.
 *
 * Three preconditions (all must pass; fail-open with reason):
 *   1. config.control.fastTrack.enabled === true
 *   2. trustProfile.trustScore >= config.minTrustScore (default 80)
 *   3. design doc exists for `feature` (resolved via config.pdca.docPaths.design)
 *
 * On success:
 *   - Recommend escalating Automation Level → fastTrack.autoLevel (default 'L3')
 *   - Append entry to `.bkit/runtime/fast-track-log.json` (audit trail)
 *   - Caller is responsible for actually skipping checkpoints — this
 *     module only stores the policy + records decisions.
 *
 * @module lib/control/fast-track
 * @version 2.1.11
 * @since 2.1.11
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR ||
  path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'bkit.config.json');
const TRUST_PROFILE_PATH = path.join(PROJECT_ROOT, '.bkit', 'state', 'trust-profile.json');
const FAST_TRACK_LOG_PATH = path.join(PROJECT_ROOT, '.bkit', 'runtime', 'fast-track-log.json');

const DEFAULT_FAST_TRACK = Object.freeze({
  enabled: true,
  minTrustScore: 80,
  autoLevel: 'L3',
  skipCheckpoints: [1, 2, 3, 4, 5, 6, 7, 8],
  fallbackLevel: 'L2',
});

const DEFAULT_DESIGN_PATTERNS = Object.freeze([
  'docs/02-design/features/{feature}.design.md',
  'docs/02-design/{feature}.design.md',
  'docs/design/{feature}.md',
]);

function _readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return null; }
}

/**
 * Load the fast-track config block from bkit.config.json. Returns the
 * merged config (DEFAULT_FAST_TRACK overlaid by user values). When
 * bkit.config.json is missing or unparseable, returns the defaults.
 *
 * @param {{ configPath?: string }} [opts]
 * @returns {object}
 */
function loadConfig(opts = {}) {
  const cfg = _readJson(opts.configPath || CONFIG_PATH);
  const userBlock = cfg && cfg.control && cfg.control.fastTrack || {};
  const designPatterns = (cfg && cfg.pdca && cfg.pdca.docPaths && cfg.pdca.docPaths.design) ||
    DEFAULT_DESIGN_PATTERNS;
  return {
    ...DEFAULT_FAST_TRACK,
    ...userBlock,
    designPatterns: [...designPatterns],
  };
}

/**
 * Resolve the trust score from .bkit/state/trust-profile.json.
 * Returns 0 when missing — fail-safe (low score blocks engagement).
 *
 * @param {{ trustProfilePath?: string }} [opts]
 * @returns {number}
 */
function getTrustScore(opts = {}) {
  const profile = _readJson(opts.trustProfilePath || TRUST_PROFILE_PATH);
  if (!profile) return 0;
  return typeof profile.trustScore === 'number' ? profile.trustScore : 0;
}

/**
 * Look up whether a design doc exists for the feature.
 *
 * @param {string} feature
 * @param {{ patterns?: string[], projectRoot?: string }} [opts]
 * @returns {{ found: boolean, path: string|null }}
 */
function findDesignDoc(feature, opts = {}) {
  if (!feature || typeof feature !== 'string') return { found: false, path: null };
  const root = opts.projectRoot || PROJECT_ROOT;
  const patterns = opts.patterns || DEFAULT_DESIGN_PATTERNS;
  for (const tpl of patterns) {
    const rel = tpl.replace('{feature}', feature);
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) return { found: true, path: abs };
  }
  return { found: false, path: null };
}

/**
 * Evaluate all preconditions for engaging fast-track on `feature`.
 *
 * @param {string} feature
 * @param {{ configPath?: string, trustProfilePath?: string, projectRoot?: string }} [opts]
 * @returns {{
 *   ok: boolean,
 *   blocks: string[],
 *   trustScore: number,
 *   minTrustScore: number,
 *   designPath: string|null,
 *   config: object
 * }}
 */
function evaluatePreconditions(feature, opts = {}) {
  const config = loadConfig(opts);
  const blocks = [];

  if (config.enabled !== true) blocks.push('disabled_in_config');

  const trustScore = getTrustScore(opts);
  if (trustScore < config.minTrustScore) blocks.push('trust_score_too_low');

  const design = findDesignDoc(feature, {
    patterns: config.designPatterns,
    projectRoot: opts.projectRoot,
  });
  if (!design.found) blocks.push('design_doc_missing');

  return {
    ok: blocks.length === 0,
    blocks,
    trustScore,
    minTrustScore: config.minTrustScore,
    designPath: design.path,
    config,
  };
}

/**
 * Engage fast-track for `feature`. Persists the decision and the
 * scheduled checkpoint skips to the audit log. Returns the engagement
 * record. When preconditions fail, returns `{ engaged: false, blocks }`.
 *
 * @param {string} feature
 * @param {{ logPath?: string, now?: Date, projectRoot?: string,
 *           configPath?: string, trustProfilePath?: string }} [opts]
 * @returns {object}
 */
function engage(feature, opts = {}) {
  const pre = evaluatePreconditions(feature, opts);
  if (!pre.ok) {
    return {
      engaged: false,
      feature,
      blocks: pre.blocks,
      trustScore: pre.trustScore,
      minTrustScore: pre.minTrustScore,
    };
  }

  const now = (opts.now || new Date()).toISOString();
  const record = {
    engaged: true,
    feature,
    engagedAt: now,
    trustScore: pre.trustScore,
    autoLevel: pre.config.autoLevel,
    fallbackLevel: pre.config.fallbackLevel,
    skipCheckpoints: [...pre.config.skipCheckpoints],
    designPath: pre.designPath,
    decisions: [],
  };

  const target = opts.logPath || FAST_TRACK_LOG_PATH;
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(record, null, 2) + '\n');
  } catch {
    // Audit failure is non-fatal — caller can re-engage.
  }
  return record;
}

/**
 * Append a checkpoint decision to the audit log. Caller calls this each
 * time a Checkpoint 1-8 is auto-approved (or falls back).
 *
 * @param {{ checkpoint: number, decision: 'auto-approved'|'fallback', reason?: string,
 *           logPath?: string, now?: Date }} input
 * @returns {{ appended: boolean, total: number }}
 */
function recordCheckpoint(input) {
  const target = input.logPath || FAST_TRACK_LOG_PATH;
  if (!fs.existsSync(target)) return { appended: false, total: 0 };
  let record;
  try { record = JSON.parse(fs.readFileSync(target, 'utf8')); }
  catch { return { appended: false, total: 0 }; }
  if (!record || !Array.isArray(record.decisions)) return { appended: false, total: 0 };

  record.decisions.push({
    checkpoint: input.checkpoint,
    decision: input.decision,
    reason: input.reason || null,
    at: (input.now || new Date()).toISOString(),
  });

  try {
    fs.writeFileSync(target, JSON.stringify(record, null, 2) + '\n');
    return { appended: true, total: record.decisions.length };
  } catch {
    return { appended: false, total: record.decisions.length - 1 };
  }
}

/**
 * Check if a given checkpoint should be auto-skipped per config.
 *
 * @param {number} checkpoint
 * @param {{ configPath?: string }} [opts]
 * @returns {boolean}
 */
function isCheckpointSkipped(checkpoint, opts = {}) {
  const config = loadConfig(opts);
  return config.enabled === true &&
    Array.isArray(config.skipCheckpoints) &&
    config.skipCheckpoints.includes(checkpoint);
}

module.exports = {
  CONFIG_PATH,
  TRUST_PROFILE_PATH,
  FAST_TRACK_LOG_PATH,
  DEFAULT_FAST_TRACK,
  DEFAULT_DESIGN_PATTERNS,
  loadConfig,
  getTrustScore,
  findDesignDoc,
  evaluatePreconditions,
  engage,
  recordCheckpoint,
  isCheckpointSkipped,
};
