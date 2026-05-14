'use strict';

/**
 * OTEL Environment Capturer — subprocess env propagation for hook hydration.
 *
 * Captures OTEL_* environment variables at SessionStart into a runtime file,
 * then re-hydrates them in hook subprocesses where the parent shell env is
 * lost (CC plugin-hook subprocess invocation does not inherit user env).
 *
 * This closes CARRY-5 (#17 token-meter Adapter zero entries) by ensuring
 * OTEL endpoint configuration survives the CC → bkit hook spawn boundary.
 *
 * Flow:
 *   SessionStart  →  captureEnv()    →  .bkit/runtime/otel-env.json
 *   Hook spawn    →  hydrateEnv()    →  process.env.OTEL_* restored
 *   telemetry.js  →  reads process.env.OTEL_*  →  OTLP HTTP POST succeeds
 *
 * @module lib/infra/otel-env-capturer
 * @layer Infrastructure
 * @version 2.1.14
 * @enh ENH-293 (CARRY-5 closure — OTEL Subprocess Env Propagation)
 */

const fs = require('fs');
const path = require('path');

const CAPTURE_FILE_RELATIVE = '.bkit/runtime/otel-env.json';

const OTEL_ENV_VARS = Object.freeze([
  'OTEL_ENDPOINT',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_SERVICE_NAME',
  'OTEL_REDACT',
  'OTEL_LOG_USER_PROMPTS',
  'OTEL_RESOURCE_ATTRIBUTES',
  'OTEL_EXPORTER_OTLP_HEADERS',
  'OTEL_EXPORTER_OTLP_PROTOCOL',
]);

function resolveRoot(opts) {
  if (opts && opts.root) return opts.root;
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

function resolveCaptureFile(opts) {
  return path.join(resolveRoot(opts), CAPTURE_FILE_RELATIVE);
}

function pickOtelVars(env) {
  const picked = {};
  for (const key of OTEL_ENV_VARS) {
    const value = env[key];
    if (typeof value === 'string' && value.length > 0) {
      picked[key] = value;
    }
  }
  return picked;
}

/**
 * Capture OTEL_* environment variables into the runtime snapshot file.
 *
 * @param {NodeJS.ProcessEnv} [env=process.env] - source environment
 * @param {{root?: string, version?: string}} [opts]
 * @returns {{ok: true, file: string, captured: string[], count: number} | {ok: false, error: string}}
 */
function captureEnv(env, opts) {
  const sourceEnv = env || process.env;
  const options = opts || {};
  try {
    const file = resolveCaptureFile(options);
    const dir = path.dirname(file);
    fs.mkdirSync(dir, { recursive: true });
    const captured = pickOtelVars(sourceEnv);
    const payload = {
      capturedAt: new Date().toISOString(),
      version: options.version || '2.1.14',
      env: captured,
    };
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    return { ok: true, file, captured: Object.keys(captured), count: Object.keys(captured).length };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

/**
 * Hydrate process.env (or supplied target) with captured OTEL_* vars.
 * Does NOT overwrite existing variables unless `overwrite: true`.
 *
 * @param {{root?: string, target?: NodeJS.ProcessEnv, overwrite?: boolean}} [opts]
 * @returns {{ok: true, hydrated: string[], skipped: string[]} | {ok: false, error: string, hydrated: string[]}}
 */
function hydrateEnv(opts) {
  const options = opts || {};
  const target = options.target || process.env;
  const hydrated = [];
  const skipped = [];
  try {
    const file = resolveCaptureFile(options);
    if (!fs.existsSync(file)) {
      return { ok: false, error: 'capture file missing', hydrated };
    }
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    const captured = parsed && parsed.env ? parsed.env : {};
    for (const key of OTEL_ENV_VARS) {
      const value = captured[key];
      if (typeof value !== 'string' || value.length === 0) continue;
      if (!options.overwrite && typeof target[key] === 'string' && target[key].length > 0) {
        skipped.push(key);
        continue;
      }
      target[key] = value;
      hydrated.push(key);
    }
    return { ok: true, hydrated, skipped };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e), hydrated };
  }
}

/**
 * Resolve an OTEL endpoint with env precedence:
 *   OTEL_EXPORTER_OTLP_ENDPOINT (OpenTelemetry standard)
 *   → OTEL_ENDPOINT (bkit legacy, backward-compat)
 *
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {string|null}
 */
function resolveOtelEndpoint(env) {
  const e = env || process.env;
  const standard = typeof e.OTEL_EXPORTER_OTLP_ENDPOINT === 'string' ? e.OTEL_EXPORTER_OTLP_ENDPOINT.trim() : '';
  if (standard.length > 0) return standard;
  const legacy = typeof e.OTEL_ENDPOINT === 'string' ? e.OTEL_ENDPOINT.trim() : '';
  if (legacy.length > 0) return legacy;
  return null;
}

module.exports = {
  OTEL_ENV_VARS,
  CAPTURE_FILE_RELATIVE,
  captureEnv,
  hydrateEnv,
  resolveOtelEndpoint,
  resolveCaptureFile,
};
