/**
 * phases.js — PDCA phase enum + ordered sequence (FR-γ2 pilot).
 *
 * Single source of truth for the 9-phase PDCA lifecycle:
 *   pm → plan → design → do → check → act → qa → report → archive
 *
 * Frozen constants — any consumer that needs to enumerate phases or
 * compare phase strings must import from here, not from string literals
 * scattered across hooks/skills/scripts.
 *
 * Design Ref: bkit-v2111-sprint-gamma.design.md §2.3 / §3.2
 *
 * @module lib/application/pdca-lifecycle/phases
 * @version 2.1.11
 * @since 2.1.11
 */

const PHASES = Object.freeze({
  PM: 'pm',
  PLAN: 'plan',
  DESIGN: 'design',
  DO: 'do',
  CHECK: 'check',
  ACT: 'act',
  QA: 'qa',
  REPORT: 'report',
  ARCHIVE: 'archive',
});

const PHASE_ORDER = Object.freeze([
  PHASES.PM,
  PHASES.PLAN,
  PHASES.DESIGN,
  PHASES.DO,
  PHASES.CHECK,
  PHASES.ACT,
  PHASES.QA,
  PHASES.REPORT,
  PHASES.ARCHIVE,
]);

const PHASE_SET = new Set(PHASE_ORDER);

/**
 * Check if `phase` is a recognized PDCA phase string.
 * @param {string} phase
 * @returns {boolean}
 */
function isValidPhase(phase) {
  return typeof phase === 'string' && PHASE_SET.has(phase);
}

/**
 * Returns the index of `phase` in canonical order, or -1 if unknown.
 * @param {string} phase
 * @returns {number}
 */
function phaseIndex(phase) {
  if (!isValidPhase(phase)) return -1;
  return PHASE_ORDER.indexOf(phase);
}

/**
 * Returns the next phase in canonical order, or null if at end.
 * @param {string} phase
 * @returns {string|null}
 */
function nextPhase(phase) {
  const i = phaseIndex(phase);
  if (i < 0 || i >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[i + 1];
}

module.exports = {
  PHASES,
  PHASE_ORDER,
  PHASE_SET,
  isValidPhase,
  phaseIndex,
  nextPhase,
};
