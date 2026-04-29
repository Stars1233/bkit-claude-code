/**
 * PreCompact Block Counter — ENH-247 / ENH-257 2-week measurement
 *
 * Tracks PreCompact `decision: block` events to judge whether ENH-232
 * defensive block logic should be retained or removed in v2.1.11+.
 *
 * Design Ref: bkit-v2110-gap-closure.design.md §3.3.1 T32-T34 + §5.2
 * Plan SC: Sprint 5.5 C4 (PreCompact counter 가동)
 *
 * @module lib/cc-regression/precompact-counter
 *
 * @version 2.1.12
 */

const fs = require('fs');
const path = require('path');

const COUNTER_PATH_RELATIVE = path.join('.bkit', 'runtime', 'precompact-counter.json');

function getProjectRoot() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

function getCounterPath() {
  return path.join(getProjectRoot(), COUNTER_PATH_RELATIVE);
}

function readCounter() {
  try {
    const p = getCounterPath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_e) {
    return null;
  }
}

function writeCounter(counter) {
  try {
    const p = getCounterPath();
    if (!fs.existsSync(path.dirname(p))) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
    }
    fs.writeFileSync(p, JSON.stringify(counter, null, 2), 'utf8');
  } catch (_e) { /* fail-silent */ }
}

/**
 * Initialize counter for a given CC version if not present.
 * @param {string} ccVersion
 */
function ensureCounter(ccVersion) {
  let c = readCounter();
  if (!c || c.ccVersion !== ccVersion) {
    c = {
      ccVersion: ccVersion || 'unknown',
      startedAt: new Date().toISOString(),
      blocks: [],
      blockCount: 0,
      sampleCount: 0,
    };
    writeCounter(c);
  }
  return c;
}

/**
 * Record a PreCompact event.
 * @param {object} params
 * @param {boolean} params.blocked  whether the hook issued decision:block
 * @param {string} params.reason  compaction reason (e.g. 'manual', 'auto')
 * @param {string} params.ccVersion
 * @param {string} [params.phase]  PDCA phase when block decided
 * @param {number} [params.contextSize]  rough size estimate
 * @param {string|null} [params.sessionId]
 */
function recordEvent(params) {
  try {
    const { blocked, ccVersion } = params || {};
    if (!ccVersion) return;

    const c = ensureCounter(ccVersion);
    c.sampleCount = (c.sampleCount || 0) + 1;

    if (blocked) {
      c.blockCount = (c.blockCount || 0) + 1;
      c.blocks.push({
        at: new Date().toISOString(),
        reason: params.reason || 'unknown',
        phase: params.phase || null,
        contextSize: params.contextSize || null,
        sessionId: params.sessionId || null,
      });
      // keep last 100 entries
      if (c.blocks.length > 100) {
        c.blocks = c.blocks.slice(-100);
      }
    }

    writeCounter(c);
  } catch (_e) { /* fail-silent */ }
}

/**
 * Compute block rate and suggest action.
 * @returns {{ccVersion:string, sampleCount:number, blockCount:number, blockRate:number, suggest:string}}
 */
function summary() {
  const c = readCounter();
  if (!c) return { ccVersion: null, sampleCount: 0, blockCount: 0, blockRate: 0, suggest: 'no data' };
  const rate = c.sampleCount > 0 ? c.blockCount / c.sampleCount : 0;
  let suggest;
  if (c.sampleCount < 100) suggest = 'collecting (need 100+ samples)';
  else if (rate < 0.05) suggest = 'ENH-232 defensive block can be removed (<5% block rate)';
  else suggest = 'keep ENH-232 defensive block (>=5% block rate)';
  return {
    ccVersion: c.ccVersion,
    sampleCount: c.sampleCount,
    blockCount: c.blockCount,
    blockRate: rate,
    suggest,
  };
}

module.exports = { recordEvent, readCounter, summary, ensureCounter };
