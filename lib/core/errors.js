/**
 * BkitError - Standardized Error Class
 * @module lib/core/errors
 * @version 2.0.0
 *
 * Unified error handling with error codes, severity levels, and context.
 * Error code format: BKIT_{DOMAIN}_{DETAIL}
 */

// ============================================================
// Error Severity Levels
// ============================================================

/**
 * @typedef {'critical'|'error'|'warning'|'info'} ErrorSeverity
 */
const SEVERITY = {
  /** Immediate action required, workflow halted */
  CRITICAL: 'critical',
  /** Operation failed, fallback used */
  ERROR: 'error',
  /** Non-fatal issue, operation continues */
  WARNING: 'warning',
  /** Informational, logged only */
  INFO: 'info',
};

// ============================================================
// Error Codes by Domain
// ============================================================

const ERROR_CODES = {
  // PDCA Domain
  BKIT_PDCA_STATUS_READ: 'BKIT_PDCA_STATUS_READ',
  BKIT_PDCA_STATUS_WRITE: 'BKIT_PDCA_STATUS_WRITE',
  BKIT_PDCA_STATUS_MIGRATE: 'BKIT_PDCA_STATUS_MIGRATE',
  BKIT_PDCA_PHASE_INVALID: 'BKIT_PDCA_PHASE_INVALID',
  BKIT_PDCA_TRANSITION_FAIL: 'BKIT_PDCA_TRANSITION_FAIL',
  BKIT_PDCA_FEATURE_LIMIT: 'BKIT_PDCA_FEATURE_LIMIT',
  BKIT_PDCA_ITERATION_LIMIT: 'BKIT_PDCA_ITERATION_LIMIT',

  // State Domain
  BKIT_STATE_READ: 'BKIT_STATE_READ',
  BKIT_STATE_WRITE: 'BKIT_STATE_WRITE',
  BKIT_STATE_LOCK_TIMEOUT: 'BKIT_STATE_LOCK_TIMEOUT',
  BKIT_STATE_LOCK_STALE: 'BKIT_STATE_LOCK_STALE',
  BKIT_STATE_CORRUPT: 'BKIT_STATE_CORRUPT',
  BKIT_STATE_MIGRATION: 'BKIT_STATE_MIGRATION',

  // Hook Domain
  BKIT_HOOK_STDIN_PARSE: 'BKIT_HOOK_STDIN_PARSE',
  BKIT_HOOK_OUTPUT_FAIL: 'BKIT_HOOK_OUTPUT_FAIL',
  BKIT_HOOK_TIMEOUT: 'BKIT_HOOK_TIMEOUT',
  BKIT_HOOK_MODULE_LOAD: 'BKIT_HOOK_MODULE_LOAD',

  // Team Domain
  BKIT_TEAM_STATE_READ: 'BKIT_TEAM_STATE_READ',
  BKIT_TEAM_STATE_WRITE: 'BKIT_TEAM_STATE_WRITE',
  BKIT_TEAM_MAX_TEAMMATES: 'BKIT_TEAM_MAX_TEAMMATES',
  BKIT_TEAM_NOT_AVAILABLE: 'BKIT_TEAM_NOT_AVAILABLE',

  // Config Domain
  BKIT_CONFIG_LOAD: 'BKIT_CONFIG_LOAD',
  BKIT_CONFIG_PARSE: 'BKIT_CONFIG_PARSE',
  BKIT_CONFIG_MISSING: 'BKIT_CONFIG_MISSING',

  // Intent Domain
  BKIT_INTENT_DETECT: 'BKIT_INTENT_DETECT',
  BKIT_INTENT_AMBIGUOUS: 'BKIT_INTENT_AMBIGUOUS',

  // Plugin Domain
  BKIT_PLUGIN_DATA_BACKUP: 'BKIT_PLUGIN_DATA_BACKUP',
  BKIT_PLUGIN_DATA_RESTORE: 'BKIT_PLUGIN_DATA_RESTORE',
  BKIT_PLUGIN_INIT: 'BKIT_PLUGIN_INIT',
};

// ============================================================
// BkitError Class
// ============================================================

/**
 * Standardized bkit error with code, severity, and context.
 * @extends Error
 */
class BkitError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {Object} [options]
   * @param {string} [options.code='BKIT_UNKNOWN'] - Error code from ERROR_CODES
   * @param {ErrorSeverity} [options.severity='error'] - Severity level
   * @param {Error} [options.cause] - Original error that caused this
   * @param {Object} [options.context] - Additional context (file path, feature name, etc.)
   */
  constructor(message, { code, severity, cause, context } = {}) {
    super(message);
    this.name = 'BkitError';
    this.code = code || 'BKIT_UNKNOWN';
    this.severity = severity || SEVERITY.ERROR;
    this.cause = cause || null;
    this.context = context || {};
    this.timestamp = new Date().toISOString();
  }

  /**
   * Convert to JSON-safe object for logging/serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      cause: this.cause
        ? { name: this.cause.name, message: this.cause.message, code: this.cause.code }
        : null,
    };
  }

  /**
   * Check if this is a critical error requiring workflow halt
   * @returns {boolean}
   */
  isCritical() {
    return this.severity === SEVERITY.CRITICAL;
  }

  /**
   * Format for debug log output
   * @returns {string}
   */
  toDebugString() {
    const causePart = this.cause ? ` (caused by: ${this.cause.message})` : '';
    return `[${this.code}] ${this.message}${causePart}`;
  }
}

// ============================================================
// Helper: Safe Catch Wrapper
// ============================================================

/**
 * Wrap a synchronous function call with standardized error handling.
 * On error, logs via debugLog (if available) and returns fallback.
 *
 * @param {Function} fn - Synchronous function to execute
 * @param {*} fallback - Fallback value returned on error
 * @param {Object} [context] - Error context options
 * @param {string} [context.code] - Error code for wrapping
 * @param {string} [context.module='bkit'] - Module name for debug logging
 * @returns {*} Function result or fallback value
 */
function safeCatch(fn, fallback, context) {
  const { code, module: mod } = context || {};
  try {
    return fn();
  } catch (e) {
    const bkitError =
      e instanceof BkitError
        ? e
        : new BkitError(e.message, {
            code: code || 'BKIT_UNKNOWN',
            severity: SEVERITY.WARNING,
            cause: e,
          });

    // Log via debugLog if available (lazy require to avoid circular deps)
    try {
      const { debugLog } = require('./debug');
      debugLog(mod || 'bkit', bkitError.toDebugString(), bkitError.context);
    } catch (_) {
      // Debug module unavailable — silently ignore
    }

    return fallback;
  }
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  BkitError,
  ERROR_CODES,
  SEVERITY,
  safeCatch,
};
