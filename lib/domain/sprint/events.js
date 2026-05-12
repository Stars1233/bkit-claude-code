/**
 * Sprint Events — Domain event factories for audit + telemetry integration.
 *
 * Defines 5 domain events that Sprint orchestration emits:
 *   - SprintCreated       (init phase 진입)
 *   - SprintPhaseChanged  (phase 전이)
 *   - SprintArchived      (sprint 종료)
 *   - SprintPaused        (auto-pause trigger 발화)
 *   - SprintResumed       (사용자 resume 또는 자동 해소)
 *
 * Each factory returns a new event object with ISO 8601 timestamp.
 * SprintEvents map + SPRINT_EVENT_TYPES are frozen.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.6
 * Plan SC: ADR 0009 — auto-pause trigger audit trail
 *
 * Pure domain module — no FS access (uses Date.toISOString native).
 *
 * @module lib/domain/sprint/events
 * @version 2.1.13
 * @since 2.1.13
 */

const SPRINT_EVENT_TYPES = Object.freeze([
  'SprintCreated',
  'SprintPhaseChanged',
  'SprintArchived',
  'SprintPaused',
  'SprintResumed',
]);

const SPRINT_EVENT_TYPE_SET = new Set(SPRINT_EVENT_TYPES);

/**
 * @typedef {Object} SprintEvent
 * @property {string} type        - One of SPRINT_EVENT_TYPES
 * @property {string} timestamp   - ISO 8601
 * @property {Object} payload     - Event-specific shape
 */

const SprintEvents = Object.freeze({
  /**
   * @param {{ sprintId: string, name: string, phase: string }} payload
   * @returns {SprintEvent}
   */
  SprintCreated: (payload) => ({
    type: 'SprintCreated',
    timestamp: new Date().toISOString(),
    payload: {
      sprintId: payload.sprintId,
      name: payload.name,
      phase: payload.phase,
    },
  }),

  /**
   * @param {{ sprintId: string, fromPhase: string, toPhase: string, reason?: string }} payload
   * @returns {SprintEvent}
   */
  SprintPhaseChanged: (payload) => ({
    type: 'SprintPhaseChanged',
    timestamp: new Date().toISOString(),
    payload: {
      sprintId: payload.sprintId,
      fromPhase: payload.fromPhase,
      toPhase: payload.toPhase,
      reason: payload.reason || null,
    },
  }),

  /**
   * @param {{ sprintId: string, archivedAt?: string, reason?: string, kpiSnapshot?: Object }} payload
   * @returns {SprintEvent}
   */
  SprintArchived: (payload) => ({
    type: 'SprintArchived',
    timestamp: new Date().toISOString(),
    payload: {
      sprintId: payload.sprintId,
      archivedAt: payload.archivedAt || new Date().toISOString(),
      reason: payload.reason || null,
      kpiSnapshot: payload.kpiSnapshot || null,
    },
  }),

  /**
   * @param {{ sprintId: string, trigger: string, severity?: string, message?: string }} payload
   * @returns {SprintEvent}
   */
  SprintPaused: (payload) => ({
    type: 'SprintPaused',
    timestamp: new Date().toISOString(),
    payload: {
      sprintId: payload.sprintId,
      trigger: payload.trigger,
      severity: payload.severity || 'MEDIUM',
      message: payload.message || null,
    },
  }),

  /**
   * @param {{ sprintId: string, pausedAt: string, resumedAt?: string, durationMs?: number }} payload
   * @returns {SprintEvent}
   */
  SprintResumed: (payload) => ({
    type: 'SprintResumed',
    timestamp: new Date().toISOString(),
    payload: {
      sprintId: payload.sprintId,
      pausedAt: payload.pausedAt,
      resumedAt: payload.resumedAt || new Date().toISOString(),
      durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : null,
    },
  }),
});

/**
 * Validate event shape (used by audit-logger sanitizer).
 *
 * @param {SprintEvent} event
 * @returns {boolean}
 */
function isValidSprintEvent(event) {
  if (!event || typeof event !== 'object') return false;
  if (!SPRINT_EVENT_TYPE_SET.has(event.type)) return false;
  if (typeof event.timestamp !== 'string') return false;
  if (!event.payload || typeof event.payload !== 'object') return false;
  if (typeof event.payload.sprintId !== 'string') return false;
  return true;
}

module.exports = {
  SprintEvents,
  SPRINT_EVENT_TYPES,
  SPRINT_EVENT_TYPE_SET,
  isValidSprintEvent,
};
