/**
 * Telemetry — AuditSinkPort dual sink (file + OTEL).
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.3.2
 * Plan SC: ENH-259 OTEL dual sink (조건부 P2). OTEL off → overhead 0.
 *
 * This is the Infrastructure implementation of AuditSinkPort.
 * Self-contained — no runtime npm deps. Uses Node `https`/`http` only.
 *
 * Enable by setting env:
 *   OTEL_ENDPOINT      — e.g. "https://otel-collector.example/v1/logs"
 *   OTEL_SERVICE_NAME  — default "bkit"
 *   OTEL_REDACT        — "1" to mask MCP/custom tool names (v2.1.117 I7 default)
 *
 * @module lib/infra/telemetry
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
// ============================================================

/**
 * Create a file-backed AuditSinkPort implementation.
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
 */
function sanitizeForOtel(event) {
  if (!event || !event.meta) return event;
  const redact = process.env.OTEL_REDACT === '1';
  if (!redact) return event;
  const clone = { ...event, meta: { ...event.meta } };
  for (const key of Object.keys(clone.meta)) {
    if (/tool|mcp|agent|skill/i.test(key)) {
      clone.meta[key] = '[redacted]';
    }
  }
  return clone;
}

/**
 * Build the OTLP/HTTP logs payload for a single AuditEvent.
 */
function buildOtlpPayload(event) {
  const now = String(Date.now() * 1e6); // nanoseconds
  const service = process.env.OTEL_SERVICE_NAME || 'bkit';
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
 * If OTEL_ENDPOINT is not set, emit becomes a no-op (zero overhead).
 *
 * @returns {{ emit: (event: AuditEvent) => Promise<void> }}
 */
function createOtelSink() {
  const endpoint = process.env.OTEL_ENDPOINT;
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
      const payload = JSON.stringify(buildOtlpPayload(sanitizeForOtel(event)));
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
 * Create the default dual sink: file (always) + OTEL (only if OTEL_ENDPOINT set).
 *
 * @returns {{ emit: (event: AuditEvent) => Promise<void> }}
 */
function createDualSink() {
  return composeSinks(createFileSink(), createOtelSink());
}

module.exports = {
  createFileSink,
  createOtelSink,
  createDualSink,
  composeSinks,
  sanitizeForOtel,
  buildOtlpPayload,
};
