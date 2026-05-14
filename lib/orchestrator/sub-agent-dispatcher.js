/**
 * SubAgentDispatcher — Orchestrator Layer 8-state state machine that decides
 * dispatch strategy (sequential | parallel | fallback) for sub-agent Task spawns.
 *
 * Design Ref: docs/sprint/v2114/design.md §3.2
 * Plan SC: ENH-292 Sub-agent Caching 10x Mitigation.
 * Differentiation: bkit moat #3 — sequential dispatch policy enforcement.
 *
 * Background:
 *   CC #56293 sub-agent caching 10x regression (11-streak across v2.1.128~v2.1.141).
 *   Anthropic blog "fork operations must share the parent's prefix" is not enforced
 *   by CC's parallel Task spawn — parallel dispatches incur 10x cache_creation_tokens
 *   per spawn vs sequential first-spawn-then-parallel. bkit cto-lead.md ships with
 *   18 Task spawn blocks; without this dispatcher each block hits the regression.
 *
 *   This dispatcher converts the *advisory* "Sequential (ENH-292)" comment already
 *   present in agents/cto-lead.md:153-168 into *enforced* policy by computing a
 *   strategy decision before each spawn and exposing it through a state-aware API.
 *
 * Public API:
 *   dispatch(agents, options) → { strategy, plan, state }
 *   getState() → { mode, ... }
 *   onSpawnComplete(metrics) → void  (callback for SubagentStop hook)
 *   reset() → void  (called on SessionStart)
 *
 * State machine (8 states, per design §3.2):
 *   1. INIT                    — fresh dispatcher / post-reset
 *   2. FIRST_SPAWN_SEQUENTIAL  — first agent dispatched sequentially
 *   3. CACHE_WARMUP_DETECTED   — analyzer.warmupDetected() returned true
 *   4. PARALLEL_RESTORE        — subsequent batch can run parallel
 *   5. CACHE_HIT_MEASURED      — most recent spawn yielded hitRate sample
 *   6. LATENCY_GUARD           — first spawn exceeded LATENCY_GUARD_MS → opt-out
 *   7. OPT_OUT_ENABLED         — BKIT_SEQUENTIAL_DISPATCH=0 (force parallel)
 *   8. RESET                   — transient; immediately transitions to INIT
 *
 * Transitions:
 *   INIT → FIRST_SPAWN_SEQUENTIAL (on first dispatch())
 *   FIRST_SPAWN_SEQUENTIAL → CACHE_HIT_MEASURED (on onSpawnComplete)
 *   CACHE_HIT_MEASURED → CACHE_WARMUP_DETECTED (if analyzer.warmupDetected())
 *   CACHE_HIT_MEASURED → FIRST_SPAWN_SEQUENTIAL (if still cold)
 *   CACHE_WARMUP_DETECTED → PARALLEL_RESTORE (on next dispatch())
 *   PARALLEL_RESTORE → CACHE_HIT_MEASURED (on onSpawnComplete)
 *   ANY → LATENCY_GUARD (if first spawn latency > LATENCY_GUARD_MS)
 *   ANY → OPT_OUT_ENABLED (if BKIT_SEQUENTIAL_DISPATCH=0)
 *   LATENCY_GUARD / OPT_OUT_ENABLED → INIT (on reset)
 *
 * Edge cases (design §3.2):
 *   - L4 Trust Level → strategy forced to 'sequential' regardless of state
 *   - L0-L3 default → strategy depends on state + analyzer recommendation
 *   - analyzer.recommend() failure → conservative 'sequential' fallback
 *   - First spawn latency > LATENCY_GUARD_MS (30s) → transitions to LATENCY_GUARD
 *     and subsequent dispatches return 'parallel' (R1 mitigation: don't trap user
 *     in pathologically slow sequential mode)
 *
 * @module lib/orchestrator/sub-agent-dispatcher
 * @version 2.1.14
 * @since 2.1.14
 * @layer Orchestrator
 * @enh ENH-292
 * @differentiation #3
 */

'use strict';

/** First-spawn latency budget (ms). Exceeding triggers LATENCY_GUARD opt-out (R1). */
const LATENCY_GUARD_MS = 30000;

const STATES = Object.freeze({
  INIT: 'INIT',
  FIRST_SPAWN_SEQUENTIAL: 'FIRST_SPAWN_SEQUENTIAL',
  CACHE_WARMUP_DETECTED: 'CACHE_WARMUP_DETECTED',
  PARALLEL_RESTORE: 'PARALLEL_RESTORE',
  CACHE_HIT_MEASURED: 'CACHE_HIT_MEASURED',
  LATENCY_GUARD: 'LATENCY_GUARD',
  OPT_OUT_ENABLED: 'OPT_OUT_ENABLED',
  RESET: 'RESET',
});

const STATE_NAMES = Object.freeze(Object.values(STATES));

/**
 * @typedef {keyof typeof STATES} DispatcherState
 * @typedef {import('../domain/ports/caching-cost.port').DispatchMode} DispatchMode
 * @typedef {import('../domain/ports/caching-cost.port').CacheMetrics} CacheMetrics
 */

/**
 * @typedef {Object} DispatchPlan
 * @property {DispatchMode} strategy   — final decision applied to this batch
 * @property {DispatcherState} state   — state at time of decision
 * @property {string[]} agents         — agent names in dispatch order
 * @property {string} reason           — human-readable justification
 * @property {boolean} forcedByTrust   — true if Trust Level overrode analyzer
 * @property {number} timestamp        — unix ms
 */

/**
 * Create a SubAgentDispatcher instance.
 *
 * @param {Object} deps
 * @param {ReturnType<typeof import('./cache-cost-analyzer').createAnalyzer>} deps.analyzer
 *   CacheCostAnalyzer instance (DI). Provides recommend() / warmupDetected() /
 *   recordSpawn() / reset() — see lib/orchestrator/cache-cost-analyzer.js.
 * @param {() => 'L0'|'L1'|'L2'|'L3'|'L4'} [deps.trustLevelProvider]
 *   Returns current Trust Level. Defaults to 'L2' if omitted.
 * @param {() => string|undefined} [deps.envProvider]
 *   Returns process.env.BKIT_SEQUENTIAL_DISPATCH. Defaults to reading actual env.
 * @param {() => number} [deps.clock] — wallclock (ms). Defaults to Date.now (for tests).
 * @param {(event: string, data: Object) => void} [deps.onTransition]
 *   Observer callback fired on state transitions (audit hook, no IO in deps).
 * @returns {Object}
 */
function createDispatcher(deps) {
  if (!deps || !deps.analyzer || typeof deps.analyzer.recommend !== 'function') {
    throw new TypeError('createDispatcher: deps.analyzer must implement recommend()');
  }
  const analyzer = deps.analyzer;
  const trustLevelProvider = deps.trustLevelProvider || (() => 'L2');
  const envProvider = deps.envProvider || (() => process.env.BKIT_SEQUENTIAL_DISPATCH);
  const clock = typeof deps.clock === 'function' ? deps.clock : () => Date.now();
  const onTransition = typeof deps.onTransition === 'function' ? deps.onTransition : () => {};

  /** @type {DispatcherState} */
  let state = STATES.INIT;
  let firstSpawnStartMs = null;
  let firstSpawnObservedLatencyMs = null;
  let lastDispatchAt = null;
  let lastStrategy = null;
  let dispatchCount = 0;

  function transitionTo(next, reason) {
    if (state === next) return;
    const prev = state;
    state = next;
    onTransition('state_change', { from: prev, to: next, reason, at: clock() });
  }

  /**
   * Compute strategy for the next batch.
   *
   * Order of evaluation (short-circuit):
   *   1) env BKIT_SEQUENTIAL_DISPATCH=0 → OPT_OUT_ENABLED → 'fallback'
   *   2) LATENCY_GUARD state sticky → 'parallel' (R1 mitigation)
   *   3) Trust L4 → forced 'sequential'
   *   4) state CACHE_WARMUP_DETECTED → 'parallel' (PARALLEL_RESTORE)
   *   5) state INIT or FIRST_SPAWN_SEQUENTIAL → 'sequential'
   *   6) Otherwise → analyzer.recommend().strategy
   *
   * @param {string[]} agents
   * @returns {DispatchPlan}
   */
  function dispatch(agents) {
    if (!Array.isArray(agents)) {
      throw new TypeError('dispatch: agents must be an array of agent names');
    }
    dispatchCount += 1;
    lastDispatchAt = clock();

    // 1) opt-out short-circuit (env)
    if (envProvider() === '0') {
      transitionTo(STATES.OPT_OUT_ENABLED, 'env BKIT_SEQUENTIAL_DISPATCH=0');
      const plan = makePlan('fallback', agents, 'opt-out via BKIT_SEQUENTIAL_DISPATCH=0', false);
      lastStrategy = 'fallback';
      return plan;
    }

    // 2) sticky LATENCY_GUARD
    if (state === STATES.LATENCY_GUARD) {
      const plan = makePlan(
        'parallel',
        agents,
        `LATENCY_GUARD sticky (first-spawn latency ${firstSpawnObservedLatencyMs} ms > ${LATENCY_GUARD_MS} ms)`,
        false
      );
      lastStrategy = 'parallel';
      return plan;
    }

    // 3) Trust L4 → enforce sequential
    const trust = trustLevelProvider();
    if (trust === 'L4') {
      const plan = makePlan(
        'sequential',
        agents,
        'Trust Level L4 enforces sequential (design §3.2 edge case)',
        true
      );
      ensureFirstSpawnTimerStarted();
      transitionTo(STATES.FIRST_SPAWN_SEQUENTIAL, 'L4 enforce + first dispatch');
      lastStrategy = 'sequential';
      return plan;
    }

    // 4) parallel restore after warmup detection
    if (state === STATES.CACHE_WARMUP_DETECTED) {
      transitionTo(STATES.PARALLEL_RESTORE, 'warmup detected → restore parallel');
      const plan = makePlan('parallel', agents, 'cache warmup detected; parallel restored', false);
      lastStrategy = 'parallel';
      return plan;
    }

    // 5) cold/initial → analyzer recommend
    let rec;
    try {
      rec = analyzer.recommend();
    } catch (e) {
      rec = { strategy: 'sequential', reason: `analyzer.recommend() threw: ${e.message}`, level: 'low', confidence: 0 };
    }
    if (rec.strategy === 'sequential' || rec.strategy === 'fallback') {
      ensureFirstSpawnTimerStarted();
      transitionTo(STATES.FIRST_SPAWN_SEQUENTIAL, rec.reason);
    } else {
      transitionTo(STATES.PARALLEL_RESTORE, rec.reason);
    }
    const plan = makePlan(rec.strategy, agents, rec.reason, false);
    lastStrategy = rec.strategy;
    return plan;
  }

  /**
   * Notify dispatcher that a spawn completed. Updates analyzer window,
   * measures first-spawn latency, evaluates warmup detection.
   *
   * @param {CacheMetrics & { agent: string }} metrics
   */
  function onSpawnComplete(metrics) {
    if (!metrics || typeof metrics !== 'object') return;
    if (typeof analyzer.recordSpawn === 'function') {
      analyzer.recordSpawn(metrics);
    }

    // Measure first-spawn latency once
    if (firstSpawnStartMs !== null && firstSpawnObservedLatencyMs === null) {
      firstSpawnObservedLatencyMs = clock() - firstSpawnStartMs;
      onTransition('first_spawn_latency_measured', {
        latencyMs: firstSpawnObservedLatencyMs,
        budgetMs: LATENCY_GUARD_MS,
        breached: firstSpawnObservedLatencyMs > LATENCY_GUARD_MS,
      });
      if (firstSpawnObservedLatencyMs > LATENCY_GUARD_MS) {
        transitionTo(STATES.LATENCY_GUARD, `first-spawn latency ${firstSpawnObservedLatencyMs} ms exceeded ${LATENCY_GUARD_MS} ms (R1 mitigation)`);
        return;
      }
    }

    transitionTo(STATES.CACHE_HIT_MEASURED, `spawn complete: agent=${metrics.agent}, hitRate=${(Number(metrics.hitRate) || 0).toFixed(3)}`);

    // Evaluate warmup
    if (typeof analyzer.warmupDetected === 'function' && analyzer.warmupDetected()) {
      transitionTo(STATES.CACHE_WARMUP_DETECTED, 'analyzer reports warmupDetected=true');
    }
  }

  /** Reset dispatcher state. Called on SessionStart hook per design §3.2 state 8. */
  function reset() {
    transitionTo(STATES.RESET, 'reset() invoked');
    if (typeof analyzer.reset === 'function') analyzer.reset();
    firstSpawnStartMs = null;
    firstSpawnObservedLatencyMs = null;
    lastDispatchAt = null;
    lastStrategy = null;
    dispatchCount = 0;
    transitionTo(STATES.INIT, 'reset complete');
  }

  /** Read-only snapshot of dispatcher state for observability / tests. */
  function getState() {
    return {
      mode: state,
      lastStrategy,
      lastDispatchAt,
      dispatchCount,
      firstSpawnLatencyMs: firstSpawnObservedLatencyMs,
      latencyGuardMs: LATENCY_GUARD_MS,
    };
  }

  function ensureFirstSpawnTimerStarted() {
    if (firstSpawnStartMs === null) firstSpawnStartMs = clock();
  }

  function makePlan(strategy, agents, reason, forcedByTrust) {
    return {
      strategy,
      state,
      agents: agents.slice(),
      reason,
      forcedByTrust,
      timestamp: lastDispatchAt,
    };
  }

  return Object.freeze({ dispatch, onSpawnComplete, reset, getState });
}

module.exports = {
  STATES,
  STATE_NAMES,
  LATENCY_GUARD_MS,
  createDispatcher,
};
