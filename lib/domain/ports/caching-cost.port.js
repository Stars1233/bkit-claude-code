/**
 * CachingCostPort — Type-only Port (DIP) for sub-agent spawn cache cost observability.
 *
 * Design Ref: docs/sprint/v2114/design.md §3.1 (Sub-Sprint 1 Coordination)
 * Plan SC: ENH-292 Sub-agent Caching 10x Mitigation + Clean Arch Port 7→8.
 *
 * Background:
 *   CC #56293 sub-agent caching 10x regression (11-streak across v2.1.128~v2.1.141,
 *   Anthropic blog "fork operations must share the parent's prefix" not enforced
 *   in current CC parallel Task spawn). bkit cto-lead.md spawns up to 18 Task
 *   blocks — parallel default produces 10x cache_creation_input_tokens.
 *
 * Responsibility:
 *   - Define a caller-agnostic interface for caching cost emission/query/
 *     threshold classification.
 *   - sub-agent-dispatcher (Orchestrator Layer) consumes this Port to decide
 *     dispatch strategy (sequential | parallel | fallback) WITHOUT coupling to
 *     lib/cc-regression internals.
 *
 * Invariants:
 *   1) Domain Layer purity — no fs/child_process/net/http/https/os/dns/tls/cluster
 *      imports (verified by scripts/check-domain-purity.js).
 *   2) 1:1 pair with lib/infra/caching-cost-cli.js adapter (Option B,
 *      docs/sprint/v2114/design.md §3.1).
 *   3) `classifyThreshold` is a pure function — same input always returns same
 *      level; no IO. Co-located here so the policy lives in one place and is
 *      reusable from Application/Orchestrator/tests.
 *
 * Threshold rationale (matches master-plan K1 "cache hit 4%→40%"):
 *   - hitRate < 0.10 → 'low'    (cold cache, sequential strongly recommended)
 *   - 0.10 ≤ hitRate < 0.40 → 'medium' (warmup, sequential)
 *   - hitRate ≥ 0.40 → 'high'   (warm, parallel restore allowed by dispatcher)
 *
 * Pattern: hybrid Port (mirrors lib/domain/ports/mcp-tool.port.js) — typedef-only
 * other Ports + runtime constants + duck-typing validator. Validator is exposed
 * so cross-module contract tests (tests/contract/v2114-caching-cost-contract.test.js)
 * can verify any candidate adapter implements the surface correctly.
 *
 * @module lib/domain/ports/caching-cost.port
 * @version 2.1.14
 * @since 2.1.14
 */

'use strict';

/**
 * @typedef {Object} CacheMetrics
 * @property {number} cacheCreationTokens  — tokens written into cache this turn
 * @property {number} cacheReadTokens      — tokens served from cache this turn
 * @property {number} requestTokens        — total non-cache input tokens this turn
 * @property {number} hitRate              — cacheReadTokens / (cacheReadTokens + cacheCreationTokens), 0.0~1.0
 * @property {string} sessionHash          — SHA-256 hashed session id (no PII)
 * @property {string} agent                — sub-agent name (e.g. "cto-lead", "qa-lead", "code-analyzer")
 * @property {number} timestamp            — unix ms
 * @property {DispatchMode} dispatchMode
 */

/**
 * @typedef {'sequential'|'parallel'|'fallback'} DispatchMode
 *   sequential — one Task spawn at a time, awaits previous before next.
 *   parallel   — concurrent Task spawns via Promise.all.
 *   fallback   — sequential with opt-out reason logged (e.g. BKIT_SEQUENTIAL_DISPATCH=0).
 */

/**
 * @typedef {'low'|'medium'|'high'} ThresholdLevel
 *   low    — cold cache (hitRate < THRESHOLD_LOW). dispatcher MUST sequential.
 *   medium — warming  (THRESHOLD_LOW ≤ hitRate < THRESHOLD_HIGH). dispatcher SHOULD sequential.
 *   high   — warm     (hitRate ≥ THRESHOLD_HIGH). dispatcher MAY parallel.
 */

/**
 * @typedef {Object} CachingCostFilter
 * @property {string} [sessionHash] — exact match (post-hash); omit to read all
 * @property {string} [agent]       — exact agent name match
 * @property {number} [sinceMs]     — unix ms lower bound (inclusive)
 */

/**
 * @typedef {Object} CachingCostPort
 * @property {(metrics: CacheMetrics) => Promise<void>} emit
 *   Persist a single CacheMetrics record. MUST be fail-silent on IO error so
 *   sub-agent-dispatcher hot path is never blocked by adapter failure.
 * @property {(filter: CachingCostFilter) => Promise<CacheMetrics[]>} query
 *   Read accumulated metrics matching filter (most recent first, capped at
 *   QUERY_CAP). MUST be fail-silent — return [] on adapter unavailability.
 * @property {(metrics: CacheMetrics) => ThresholdLevel} threshold
 *   Pure classification — adapter MUST delegate to classifyThreshold() so the
 *   policy stays in one place.
 */

const THRESHOLD_LOW = 0.10;
const THRESHOLD_HIGH = 0.40;
const QUERY_CAP = 100;
const DISPATCH_MODES = Object.freeze(['sequential', 'parallel', 'fallback']);
const THRESHOLD_LEVELS = Object.freeze(['low', 'medium', 'high']);

/**
 * Pure threshold classifier. Domain-resident — same input → same output, no IO.
 * Co-located so dispatcher policy lives in one place and is reusable from any layer.
 *
 * @param {CacheMetrics|{hitRate: number}} m
 * @returns {ThresholdLevel}
 */
function classifyThreshold(m) {
  if (!m || typeof m.hitRate !== 'number' || Number.isNaN(m.hitRate)) {
    return 'low';
  }
  if (m.hitRate >= THRESHOLD_HIGH) return 'high';
  if (m.hitRate >= THRESHOLD_LOW) return 'medium';
  return 'low';
}

/**
 * Pure hit-rate calculator. Returns 0 when both counters are zero (avoids NaN).
 *
 * @param {number} cacheReadTokens
 * @param {number} cacheCreationTokens
 * @returns {number} hitRate in [0, 1]
 */
function computeHitRate(cacheReadTokens, cacheCreationTokens) {
  const r = Number(cacheReadTokens) || 0;
  const c = Number(cacheCreationTokens) || 0;
  const denom = r + c;
  if (denom <= 0) return 0;
  return r / denom;
}

/**
 * Duck-typing validator. Mirrors lib/domain/ports/mcp-tool.port.js `isMCPToolPort`
 * pattern. Used by tests/contract/v2114-caching-cost-contract.test.js to verify
 * any candidate adapter implements the Port surface.
 *
 * @param {unknown} candidate
 * @returns {{ ok: boolean, missing: string[] }}
 */
function isCachingCostPort(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return { ok: false, missing: ['object'] };
  }
  const required = ['emit', 'query', 'threshold'];
  const missing = required.filter((m) => typeof candidate[m] !== 'function');
  return { ok: missing.length === 0, missing };
}

module.exports = {
  THRESHOLD_LOW,
  THRESHOLD_HIGH,
  QUERY_CAP,
  DISPATCH_MODES,
  THRESHOLD_LEVELS,
  classifyThreshold,
  computeHitRate,
  isCachingCostPort,
};
