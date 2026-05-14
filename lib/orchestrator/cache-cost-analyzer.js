/**
 * CacheCostAnalyzer — Orchestrator Layer aggregator and recommendation engine
 * for the sub-agent-dispatcher state machine.
 *
 * Design Ref: docs/sprint/v2114/design.md §3.2 (state machine input) + §1.1.4
 * Plan SC: ENH-292 Sub-agent Caching 10x Mitigation.
 * Differentiation: bkit moat #3 — sequential dispatch policy enforcement.
 *
 * Responsibility:
 *   This module sits between the CachingCostPort (Domain) and the
 *   sub-agent-dispatcher (Orchestrator). Given a CachingCostPort adapter and
 *   a window of recent metrics, it answers three questions:
 *
 *     1) What is the current cache hit-rate trend? (analyze)
 *     2) Should the next sub-agent spawn be sequential or parallel? (recommend)
 *     3) Did the warmup detection trigger fire? (warmupDetected)
 *
 *   The recommendation policy lives here so the dispatcher state machine stays
 *   focused on state transitions, and so the policy is testable in isolation
 *   (L1 unit tests do not need to instantiate the full dispatcher).
 *
 * Dependency direction:
 *   Orchestrator → Domain Port (interface) ← Infrastructure Adapter (impl)
 *   This file imports the Port (for THRESHOLD_LOW / THRESHOLD_HIGH /
 *   classifyThreshold pure fn) but NEVER imports the Adapter directly — the
 *   adapter instance is passed in via DI (createAnalyzer({port})).
 *
 * Statelessness:
 *   The analyzer keeps a small rolling window (RECENT_WINDOW samples) in-memory
 *   for fast recommend() calls without re-querying the ledger on every spawn.
 *   The window is bounded; on overflow oldest entries are dropped (FIFO).
 *   No persistence — restart resets window. The Port adapter holds the source
 *   of truth on disk.
 *
 * @module lib/orchestrator/cache-cost-analyzer
 * @version 2.1.14
 * @since 2.1.14
 * @layer Orchestrator
 * @enh ENH-292
 * @differentiation #3
 */

'use strict';

const {
  THRESHOLD_LOW,
  THRESHOLD_HIGH,
  classifyThreshold,
  isCachingCostPort,
} = require('../domain/ports/caching-cost.port');

/** Rolling window cap. Recent samples drive recommend() without re-querying. */
const RECENT_WINDOW = 20;

/** Minimum samples before recommend() trusts the in-memory window. Below this
 *  threshold, recommend() falls back to a conservative 'sequential' answer
 *  (cold-start safety). */
const MIN_SAMPLES_FOR_TREND = 3;

/**
 * @typedef {import('../domain/ports/caching-cost.port').CacheMetrics} CacheMetrics
 * @typedef {import('../domain/ports/caching-cost.port').CachingCostPort} CachingCostPort
 * @typedef {import('../domain/ports/caching-cost.port').ThresholdLevel} ThresholdLevel
 * @typedef {import('../domain/ports/caching-cost.port').DispatchMode} DispatchMode
 */

/**
 * @typedef {Object} AnalysisSummary
 * @property {number} sampleCount      — number of metrics in the window
 * @property {number} avgHitRate       — mean hitRate across window, 0.0~1.0
 * @property {ThresholdLevel} level    — classification of avgHitRate
 * @property {number} latestHitRate    — most recent sample's hitRate
 * @property {boolean} warmupDetected  — true once avgHitRate ≥ THRESHOLD_LOW
 * @property {number} cacheCreationTotal — sum of cacheCreationTokens in window
 * @property {number} cacheReadTotal     — sum of cacheReadTokens in window
 */

/**
 * @typedef {Object} Recommendation
 * @property {DispatchMode} strategy   — 'sequential' | 'parallel' | 'fallback'
 * @property {string} reason           — human-readable explanation
 * @property {ThresholdLevel} level    — current threshold classification
 * @property {number} confidence       — 0.0~1.0, increases with sampleCount
 */

/**
 * Internal: compute aggregate statistics from a window of metrics.
 * Pure function — no IO, no state mutation.
 *
 * @param {CacheMetrics[]} window
 * @returns {AnalysisSummary}
 */
function summarize(window) {
  if (!Array.isArray(window) || window.length === 0) {
    return {
      sampleCount: 0,
      avgHitRate: 0,
      level: 'low',
      latestHitRate: 0,
      warmupDetected: false,
      cacheCreationTotal: 0,
      cacheReadTotal: 0,
    };
  }
  let sumHit = 0;
  let sumCreate = 0;
  let sumRead = 0;
  for (const m of window) {
    sumHit += Number(m.hitRate) || 0;
    sumCreate += Number(m.cacheCreationTokens) || 0;
    sumRead += Number(m.cacheReadTokens) || 0;
  }
  const avgHitRate = sumHit / window.length;
  const latestHitRate = Number(window[0].hitRate) || 0;
  return {
    sampleCount: window.length,
    avgHitRate,
    level: classifyThreshold({ hitRate: avgHitRate }),
    latestHitRate,
    warmupDetected: avgHitRate >= THRESHOLD_LOW,
    cacheCreationTotal: sumCreate,
    cacheReadTotal: sumRead,
  };
}

/**
 * Create a CacheCostAnalyzer instance.
 *
 * @param {Object} deps
 * @param {CachingCostPort} deps.port              — adapter implementing the Port
 * @param {() => 'L0'|'L1'|'L2'|'L3'|'L4'} [deps.trustLevelProvider]
 *   Returns current Trust Level. If omitted, analyzer assumes 'L2' (semi-auto
 *   default). L4 forces 'sequential' regardless of cache state per design §3.2
 *   edge case. L0-L3 follow threshold-driven recommendation.
 * @param {() => string|undefined} [deps.envProvider]
 *   Returns BKIT_SEQUENTIAL_DISPATCH env var ('0' | '1' | undefined). When '0',
 *   recommend() returns 'fallback' (opt-out path).
 * @returns {Object}
 */
function createAnalyzer(deps) {
  const port = deps && deps.port;
  const check = isCachingCostPort(port);
  if (!check.ok) {
    throw new TypeError(
      `createAnalyzer: deps.port must implement CachingCostPort (missing: ${check.missing.join(',')})`
    );
  }
  const trustLevelProvider = (deps && deps.trustLevelProvider) || (() => 'L2');
  const envProvider = (deps && deps.envProvider) || (() => process.env.BKIT_SEQUENTIAL_DISPATCH);

  /** @type {CacheMetrics[]} Rolling window, most-recent-first. */
  const window = [];

  /** Push a metric onto the rolling window (FIFO bounded). */
  function recordSpawn(metrics) {
    if (!metrics || typeof metrics !== 'object') return;
    window.unshift(metrics);
    if (window.length > RECENT_WINDOW) window.length = RECENT_WINDOW;
  }

  /**
   * Hydrate the window from the Port (e.g. on dispatcher INIT). Fail-silent.
   * @param {Object} [filter] — optional Port query filter
   * @returns {Promise<number>} number of samples hydrated
   */
  async function hydrate(filter) {
    try {
      const samples = await port.query(filter || {});
      window.length = 0;
      for (let i = 0; i < Math.min(samples.length, RECENT_WINDOW); i += 1) {
        window.push(samples[i]);
      }
      return window.length;
    } catch {
      return 0;
    }
  }

  /**
   * Return summary statistics for the current in-memory window.
   * Pure (no IO). For source-of-truth queries, call hydrate() first.
   * @returns {AnalysisSummary}
   */
  function analyze() {
    return summarize(window);
  }

  /**
   * Recommend dispatch strategy for the next spawn.
   *
   * Decision tree (in order):
   *   1) BKIT_SEQUENTIAL_DISPATCH === '0' → 'fallback' (opt-out path, dispatcher
   *      will accept user's parallel choice but log reason).
   *   2) trustLevel === 'L4' → 'sequential' (design §3.2 edge case: L4 enforces).
   *   3) sampleCount < MIN_SAMPLES_FOR_TREND → 'sequential' (cold start safety).
   *   4) level === 'high' → 'parallel' (cache warm, restore parallel).
   *   5) level === 'medium' → 'sequential' (warming, keep prefix sharing).
   *   6) level === 'low' → 'sequential' (cold, must share prefix).
   *
   * Confidence: sampleCount / RECENT_WINDOW, clamped [0, 1].
   *
   * @returns {Recommendation}
   */
  function recommend() {
    const env = envProvider();
    if (env === '0') {
      return {
        strategy: 'fallback',
        reason: 'BKIT_SEQUENTIAL_DISPATCH=0 (user opt-out)',
        level: 'low',
        confidence: 1,
      };
    }
    const trust = trustLevelProvider();
    const summary = summarize(window);
    const confidence = Math.min(1, summary.sampleCount / RECENT_WINDOW);

    if (trust === 'L4') {
      return {
        strategy: 'sequential',
        reason: 'Trust Level L4 enforces sequential dispatch (design §3.2)',
        level: summary.level,
        confidence,
      };
    }
    if (summary.sampleCount < MIN_SAMPLES_FOR_TREND) {
      return {
        strategy: 'sequential',
        reason: `cold start (samples=${summary.sampleCount} < ${MIN_SAMPLES_FOR_TREND})`,
        level: summary.level,
        confidence,
      };
    }
    if (summary.level === 'high') {
      return {
        strategy: 'parallel',
        reason: `cache warm (avgHitRate=${summary.avgHitRate.toFixed(3)} ≥ ${THRESHOLD_HIGH})`,
        level: 'high',
        confidence,
      };
    }
    if (summary.level === 'medium') {
      return {
        strategy: 'sequential',
        reason: `cache warming (avgHitRate=${summary.avgHitRate.toFixed(3)} in [${THRESHOLD_LOW}, ${THRESHOLD_HIGH}))`,
        level: 'medium',
        confidence,
      };
    }
    return {
      strategy: 'sequential',
      reason: `cache cold (avgHitRate=${summary.avgHitRate.toFixed(3)} < ${THRESHOLD_LOW})`,
      level: 'low',
      confidence,
    };
  }

  /** Has the warmup threshold been crossed? Used by dispatcher CACHE_WARMUP_DETECTED. */
  function warmupDetected() {
    return summarize(window).warmupDetected;
  }

  /** Clear the in-memory window. Called on SessionStart per design §3.2 RESET state. */
  function reset() {
    window.length = 0;
  }

  return Object.freeze({
    recordSpawn,
    hydrate,
    analyze,
    recommend,
    warmupDetected,
    reset,
  });
}

module.exports = {
  RECENT_WINDOW,
  MIN_SAMPLES_FOR_TREND,
  summarize,
  createAnalyzer,
};
