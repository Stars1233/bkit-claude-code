'use strict';

/**
 * Invariant 10 Guard — effort.level field regression check.
 *
 * Pure domain function. Enforces ADR 0003 invariant #10 (added v2.1.14):
 *
 *   Effort-aware defense intensity MUST be bound to a valid effort.level
 *   value of 'low' | 'medium' | 'high'. Any out-of-range value (null/empty/
 *   misspelled/extended) must be flagged so downstream defense modules
 *   degrade safely instead of silently disabling guards.
 *
 * The guard is read-only (no fs / no env). It accepts a context object and
 * returns the standard { hit, meta? } shape used across lib/domain/guards/.
 *
 * Design Ref: docs/sprint/v2114/design.md §1.2 invariant 10
 *
 * @module lib/domain/guards/invariant-10-effort-aware
 * @layer Domain
 * @version 2.1.14
 * @enh ENH-307 (ADR 0003 invariant 10)
 */

const VALID_EFFORT_LEVELS = Object.freeze(['low', 'medium', 'high']);

/**
 * @typedef {Object} EffortCtx
 * @property {string} [effortLevel] - raw effort.level field from CC payload or $CLAUDE_EFFORT env
 * @property {string} [source]      - 'payload' | 'env' | 'default'
 * @property {string} [scope]       - module name reporting the value (e.g. 'unified-bash-pre')
 */

/**
 * Check the effort.level value for invariant-10 compliance.
 *
 * @param {EffortCtx} ctx
 * @returns {{hit: boolean, meta?: Object}}
 */
function check(ctx) {
  if (!ctx || typeof ctx !== 'object') return { hit: false };
  const raw = ctx.effortLevel;
  // Missing/unset is OK — defense modules treat as 'medium' default elsewhere.
  if (raw === undefined || raw === null) return { hit: false };
  if (typeof raw !== 'string') {
    return {
      hit: true,
      meta: {
        id: 'INV-10',
        severity: 'HIGH',
        kind: 'type-mismatch',
        rawType: typeof raw,
        scope: ctx.scope || 'unknown',
        source: ctx.source || 'unknown',
        note: 'effort.level must be a string in {low|medium|high}',
      },
    };
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized.length === 0) {
    return {
      hit: true,
      meta: {
        id: 'INV-10',
        severity: 'MEDIUM',
        kind: 'empty-string',
        scope: ctx.scope || 'unknown',
        source: ctx.source || 'unknown',
        note: 'effort.level empty — treat as default but flag',
      },
    };
  }
  if (VALID_EFFORT_LEVELS.indexOf(normalized) === -1) {
    return {
      hit: true,
      meta: {
        id: 'INV-10',
        severity: 'HIGH',
        kind: 'out-of-range',
        raw,
        normalized,
        validValues: VALID_EFFORT_LEVELS,
        scope: ctx.scope || 'unknown',
        source: ctx.source || 'unknown',
        note: 'effort.level out of range — defense modules will degrade safely',
      },
    };
  }
  return { hit: false };
}

/**
 * Normalize raw effort.level into a safe enum value.
 * Returns 'medium' as the conservative default for invalid input.
 *
 * @param {string|null|undefined} raw
 * @returns {'low'|'medium'|'high'}
 */
function normalize(raw) {
  if (typeof raw !== 'string') return 'medium';
  const lower = raw.trim().toLowerCase();
  if (VALID_EFFORT_LEVELS.indexOf(lower) !== -1) return lower;
  return 'medium';
}

function removeWhen(ccVersion) {
  // Invariant 10 is permanent — bound to ADR 0003. No removal.
  void ccVersion;
  return false;
}

module.exports = {
  VALID_EFFORT_LEVELS,
  check,
  normalize,
  removeWhen,
};
