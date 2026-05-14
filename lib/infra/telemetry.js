/**
 * Telemetry — AuditSinkPort dual sink (file + OTEL) + gen_ai.* unified emit.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.3.2
 *             docs/sprint/v2114/design.md §3.6 (ENH-281 + ENH-293)
 *
 * This is the Infrastructure implementation of AuditSinkPort.
 * Self-contained — no runtime npm deps. Uses Node `https`/`http` only.
 *
 * Enable by setting env (both supported, standard precedes legacy):
 *   OTEL_EXPORTER_OTLP_ENDPOINT — OpenTelemetry standard (preferred)
 *   OTEL_ENDPOINT               — bkit legacy (backward-compat fallback)
 *   OTEL_SERVICE_NAME           — default "bkit"
 *   OTEL_REDACT                 — "1" to mask MCP/custom tool names
 *   OTEL_LOG_USER_PROMPTS       — "1" to opt-in CC user-prompt export (I4-121)
 *
 * ENH-281: gen_ai.* semantic conventions unified emit via emitGenAI().
 * ENH-293: env hydration via otel-env-capturer to close CARRY-5 subprocess
 *          env loss at the CC plugin-hook spawn boundary.
 *
 * @module lib/infra/telemetry
 * @layer Infrastructure
 * @version 2.1.14
 * @enh ENH-281 (OTEL 10 unified emit), ENH-293 (Subprocess Env Propagation)
 */

const http = require('http');
const https = require('https');
const url = require('url');

/** @typedef {import('../domain/ports/audit-sink.port').AuditEvent} AuditEvent */

// Lazy requires
let _audit = null;
function getAudit() {
  if (!_audit) _audit = require('../audit/audit-logger');
  return _audit;
}

let _envCapturer = null;
function getEnvCapturer() {
  if (!_envCapturer) _envCapturer = require('./otel-env-capturer');
  return _envCapturer;
}

// ENH-281 OTEL gen_ai.* semantic conventions — 10 unified metrics
const GEN_AI_METRICS = Object.freeze([
  'gen_ai.request_tokens',
  'gen_ai.response_tokens',
  'gen_ai.cache_creation_tokens',
  'gen_ai.cache_read_tokens',
  'gen_ai.tool_call_count',
  'gen_ai.subagent_dispatch_count',
  'gen_ai.subagent_dispatch_mode',
  'gen_ai.hook_trigger_count',
  'gen_ai.hook_trigger_event',
  'gen_ai.sprint_phase',
]);

function isKnownGenAIMetric(name) {
  return typeof name === 'string' && GEN_AI_METRICS.indexOf(name) !== -1;
}

// ENH-293 CARRY-5 closure: hydrate OTEL_* env from .bkit/runtime/otel-env.json
// exactly once per process. Hook subprocesses lose the parent shell env when
// CC spawns plugin hooks; without this, createOtelSink resolves no endpoint
// and silently no-ops (the root cause of token-meter Adapter zero entries).
let _envHydrated = false;
function ensureEnvHydrated(env) {
  if (_envHydrated) return;
  if (env && env !== process.env) return; // caller injected env — do not mutate
  try { getEnvCapturer().hydrateEnv({ overwrite: false }); } catch (_) { /* graceful */ }
  _envHydrated = true;
}

// Test-only: reset the once-flag so unit tests can verify hydrate behavior.
function _resetEnvHydrateForTest() {
  _envHydrated = false;
}

let _ccVersion = null;
function getCCVersion() {
  if (_ccVersion !== null) return _ccVersion;
  try {
    _ccVersion = require('../cc-regression/lifecycle').detectCCVersion() || 'unknown';
  } catch {
    _ccVersion = 'unknown';
  }
  return _ccVersion;
}

let _bkitVersion = null;
function getBkitVersion() {
  if (_bkitVersion) return _bkitVersion;
  try {
    _bkitVersion = require('../core/version').BKIT_VERSION || 'unknown';
  } catch {
    _bkitVersion = 'unknown';
  }
  return _bkitVersion;
}

// ============================================================
// File Sink — delegates to existing audit-logger
//
// 🚨 DANGER ZONE (2026-04-22 incident learning):
// This sink calls `audit-logger.writeAuditLog()`. If audit-logger ALSO calls
// back into telemetry (via createDualSink or this sink), infinite recursion
// occurs and JSONL files explode (the 2026-04-22 bug produced a 682 GB file).
//
// Rules:
//   1. `audit-logger.writeAuditLog` MUST NOT call `createFileSink()` or any
//      composition that includes it. Use `createOtelSink()` directly.
//   2. `createDualSink()` should ONLY be used by callers OUTSIDE of audit-logger
//      (e.g., a future telemetry-init module or external integrations).
//   3. Prefer `createOtelSink()` alone when caller already handles file writes.
// ============================================================

/**
 * Create a file-backed AuditSinkPort implementation.
 *
 * ⚠️ Do NOT call this from `audit-logger.js` — it causes self-recursion.
 * Use `createOtelSink()` directly instead.
 *
 * @returns {{ emit: (event: AuditEvent) => Promise<void> }}
 */
function createFileSink() {
  return {
    async emit(event) {
      if (!event || typeof event !== 'object') return;
      try {
        getAudit().writeAuditLog({
          actor: 'system',
          actorId: 'telemetry',
          action: event.type || 'unknown',
          category: 'system',
          target: event.id || '',
          targetType: 'feature',
          details: event.meta || {},
          result: 'success',
        });
      } catch (e) {
        if (process.env.BKIT_DEBUG) {
          // eslint-disable-next-line no-console
          console.error(`[telemetry:file] emit failed: ${e.message}`);
        }
      }
    },
  };
}

// ============================================================
// OTEL Sink — fire-and-forget HTTP POST
// ============================================================

/**
 * Sanitize event meta for OTEL — strip MCP/custom tool names when OTEL_REDACT=1.
 *
 * v2.1.11 CAND-004 (CC v2.1.121 I4-121): 2-gate sanitization for the
 * `user_system_prompt` attribute introduced by CC's user-prompt OTEL
 * logging. Both gates must align before user-prompt content is exported:
 *   - bkit OTEL_REDACT=1  → strip user_system_prompt + user_prompt
 *   - CC   OTEL_LOG_USER_PROMPTS=1 → CC-side opt-in to expose them
 *
 * @param {object} event
 * @param {object} [env=process.env]
 * @returns {object}
 */
function sanitizeForOtel(event, env = process.env) {
  if (!event || !event.meta) return event;
  const clone = { ...event, meta: { ...event.meta } };

  // Gate 1: bkit-side default redact (MCP/custom tool names + user prompts)
  if (env.OTEL_REDACT === '1') {
    for (const key of Object.keys(clone.meta)) {
      if (/tool|mcp|agent|skill/i.test(key)) {
        clone.meta[key] = '[redacted]';
      }
    }
    delete clone.meta.user_system_prompt;
    delete clone.meta.user_prompt;
  }

  // Gate 2: CC-side opt-in for user-prompt OTEL logging (I4-121)
  if (env.OTEL_LOG_USER_PROMPTS !== '1') {
    delete clone.meta.user_system_prompt;
  }

  return clone;
}

/**
 * Build the OTLP/HTTP logs payload for a single AuditEvent.
 *
 * @param {AuditEvent} event
 * @param {NodeJS.ProcessEnv} [env=process.env] - injectable env for testing
 */
function buildOtlpPayload(event, env) {
  const sourceEnv = env || process.env;
  const now = String(Date.now() * 1e6); // nanoseconds
  const service = sourceEnv.OTEL_SERVICE_NAME || 'bkit';
  return {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: service } },
            { key: 'bkit.version', value: { stringValue: getBkitVersion() } },
            { key: 'cc.version', value: { stringValue: getCCVersion() } },
          ],
        },
        scopeLogs: [
          {
            scope: { name: 'bkit.audit', version: getBkitVersion() },
            logRecords: [
              {
                timeUnixNano: now,
                severityText: (event.meta && event.meta.severity) || 'INFO',
                body: { stringValue: event.type || 'audit' },
                attributes: Object.entries(event.meta || {}).map(([k, v]) => ({
                  key: `bkit.${k}`,
                  value: { stringValue: String(v) },
                })),
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Create an OTEL-backed AuditSinkPort.
 * If neither OTEL_EXPORTER_OTLP_ENDPOINT (standard) nor OTEL_ENDPOINT (legacy)
 * is set, emit becomes a no-op (zero overhead).
 *
 * @param {NodeJS.ProcessEnv} [env=process.env] - injectable env for testing
 * @returns {{ emit: (event: AuditEvent) => Promise<void> }}
 */
function createOtelSink(env) {
  ensureEnvHydrated(env);
  const sourceEnv = env || process.env;
  const endpoint = getEnvCapturer().resolveOtelEndpoint(sourceEnv);
  if (!endpoint) {
    return {
      async emit() {
        /* no-op */
      },
    };
  }

  let parsed;
  try {
    parsed = new url.URL(endpoint);
  } catch {
    return {
      async emit() {
        if (process.env.BKIT_DEBUG) {
          // eslint-disable-next-line no-console
          console.error('[telemetry:otel] invalid OTEL_ENDPOINT');
        }
      },
    };
  }

  const lib = parsed.protocol === 'https:' ? https : http;

  return {
    async emit(event) {
      if (!event) return;
      const payload = JSON.stringify(buildOtlpPayload(sanitizeForOtel(event, sourceEnv), sourceEnv));
      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 2000,
      };
      return new Promise((resolve) => {
        const req = lib.request(options, (res) => {
          // Drain response to free the socket.
          res.on('data', () => {});
          res.on('end', () => resolve());
        });
        req.on('error', (e) => {
          if (process.env.BKIT_DEBUG) {
            // eslint-disable-next-line no-console
            console.error(`[telemetry:otel] emit failed: ${e.message}`);
          }
          resolve();
        });
        req.on('timeout', () => {
          req.destroy();
          resolve();
        });
        req.write(payload);
        req.end();
      });
    },
  };
}

// ============================================================
// Dual Sink — compose file + otel
// ============================================================

/**
 * Compose multiple AuditSinkPort implementations into one.
 * All sinks receive the event in parallel; failures are isolated.
 *
 * @param {...{ emit: (event: AuditEvent) => Promise<void> }} sinks
 */
function composeSinks(...sinks) {
  return {
    async emit(event) {
      await Promise.all(
        sinks.map((s) =>
          Promise.resolve()
            .then(() => s.emit(event))
            .catch((e) => {
              if (process.env.BKIT_DEBUG) {
                // eslint-disable-next-line no-console
                console.error(`[telemetry:compose] sink failed: ${e.message}`);
              }
            })
        )
      );
    },
  };
}

/**
 * Create the default dual sink: file (always) + OTEL (only if endpoint set).
 *
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {{ emit: (event: AuditEvent) => Promise<void> }}
 */
function createDualSink(env) {
  return composeSinks(createFileSink(), createOtelSink(env));
}

// ============================================================
// gen_ai.* unified emit (ENH-281)
// ============================================================

/**
 * Emit an OTEL gen_ai.* semantic-conventions metric/event.
 *
 * The metric name SHOULD be one of GEN_AI_METRICS (10 unified metrics).
 * Unknown metrics are still emitted (caller knows best) but flagged when
 * BKIT_DEBUG is set so drift can be caught in CI.
 *
 * Endpoint resolution honors ENH-293 (otel-env-capturer.resolveOtelEndpoint)
 * so OTEL_EXPORTER_OTLP_ENDPOINT (standard) takes precedence over the legacy
 * OTEL_ENDPOINT — captured at SessionStart and hydrated in hook subprocesses.
 *
 * Returns immediately when no OTEL endpoint is configured (zero overhead).
 *
 * @param {string} metric - gen_ai.* metric name (e.g. "gen_ai.request_tokens")
 * @param {object} [attributes] - metric attributes (numeric values, ids, labels)
 * @param {{env?: NodeJS.ProcessEnv}} [opts]
 * @returns {Promise<{ok: boolean, metric: string, emitted: boolean, reason?: string}>}
 */
async function emitGenAI(metric, attributes, opts) {
  const options = opts || {};
  const sourceEnv = options.env || process.env;
  if (typeof metric !== 'string' || metric.length === 0) {
    return { ok: false, metric: String(metric), emitted: false, reason: 'invalid metric name' };
  }
  if (!isKnownGenAIMetric(metric) && sourceEnv.BKIT_DEBUG) {
    // eslint-disable-next-line no-console
    console.error('[telemetry:gen_ai] unknown metric — not in GEN_AI_METRICS: ' + metric);
  }
  ensureEnvHydrated(options.env);
  const endpoint = getEnvCapturer().resolveOtelEndpoint(sourceEnv);
  if (!endpoint) {
    return { ok: true, metric, emitted: false, reason: 'no OTEL endpoint configured' };
  }
  const attrs = attributes && typeof attributes === 'object' ? attributes : {};
  const event = {
    type: metric,
    id: typeof attrs.id === 'string' ? attrs.id : '',
    meta: Object.assign({}, attrs, { gen_ai_metric: metric }),
  };
  try {
    await createOtelSink(sourceEnv).emit(event);
    return { ok: true, metric, emitted: true };
  } catch (e) {
    return { ok: false, metric, emitted: false, reason: e && e.message ? e.message : String(e) };
  }
}

module.exports = {
  createFileSink,
  createOtelSink,
  createDualSink,
  composeSinks,
  sanitizeForOtel,
  buildOtlpPayload,
  emitGenAI,
  GEN_AI_METRICS,
  isKnownGenAIMetric,
  _resetEnvHydrateForTest,
};
