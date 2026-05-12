/**
 * index.js — Sprint Domain Layer public API (v2.1.13).
 *
 * Re-exports the Sprint entity factory + validators + events for
 * use by Application Layer (Sprint 2~) and Infrastructure (Sprint 3).
 *
 * Module structure:
 *   - entity.js     — createSprint, cloneSprint, DEFAULT_CONFIG, DEFAULT_QUALITY_GATES, DEFAULT_AUTO_PAUSE_ARMED
 *   - validators.js — isValidSprintName, isValidSprintContext, sprintPhaseDocPath, validateSprintInput
 *   - events.js     — SprintEvents, SPRINT_EVENT_TYPES, isValidSprintEvent
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.7
 * ADR Ref: 0007 (Sprint as Meta Container)
 *
 * Pure domain module — no FS access.
 *
 * @module lib/domain/sprint
 * @version 2.1.13
 * @since 2.1.13
 */

const entity = require('./entity');
const validators = require('./validators');
const events = require('./events');

module.exports = {
  // Entity factory + helpers
  createSprint: entity.createSprint,
  cloneSprint: entity.cloneSprint,
  DEFAULT_CONFIG: entity.DEFAULT_CONFIG,
  DEFAULT_QUALITY_GATES: entity.DEFAULT_QUALITY_GATES,
  DEFAULT_AUTO_PAUSE_ARMED: entity.DEFAULT_AUTO_PAUSE_ARMED,

  // Validators
  isValidSprintName: validators.isValidSprintName,
  isValidSprintContext: validators.isValidSprintContext,
  sprintPhaseDocPath: validators.sprintPhaseDocPath,
  validateSprintInput: validators.validateSprintInput,
  SPRINT_NAME_REGEX: validators.SPRINT_NAME_REGEX,
  SPRINT_NAME_MIN_LENGTH: validators.SPRINT_NAME_MIN_LENGTH,
  SPRINT_NAME_MAX_LENGTH: validators.SPRINT_NAME_MAX_LENGTH,
  REQUIRED_CONTEXT_KEYS: validators.REQUIRED_CONTEXT_KEYS,

  // Events
  SprintEvents: events.SprintEvents,
  SPRINT_EVENT_TYPES: events.SPRINT_EVENT_TYPES,
  SPRINT_EVENT_TYPE_SET: events.SPRINT_EVENT_TYPE_SET,
  isValidSprintEvent: events.isValidSprintEvent,
};
