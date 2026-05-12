/**
 * Sprint Validators — Pure validation functions for Sprint entity.
 *
 * Enforces kebab-case name policy, context anchor completeness, and
 * phase document path mapping (Master Plan §18 Document Index).
 *
 * Returns boolean for simple checks (PDCA `isValidPhase` pattern) or
 * { ok, errors? } object for composite checks (PDCA `canTransition` pattern).
 *
 * Pure domain functions — no I/O.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.5
 *
 * @module lib/domain/sprint/validators
 * @version 2.1.13
 * @since 2.1.13
 */

const SPRINT_NAME_REGEX = /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/;
const SPRINT_NAME_MIN_LENGTH = 3;
const SPRINT_NAME_MAX_LENGTH = 64;

const REQUIRED_CONTEXT_KEYS = Object.freeze(['WHY', 'WHO', 'RISK', 'SUCCESS', 'SCOPE']);

const PHASE_DOC_PATH_MAP = Object.freeze({
  masterPlan: (id) => `docs/01-plan/features/${id}.master-plan.md`,
  prd:        (id) => `docs/01-plan/features/${id}.prd.md`,
  plan:       (id) => `docs/01-plan/features/${id}.plan.md`,
  design:     (id) => `docs/02-design/features/${id}.design.md`,
  iterate:    (id) => `docs/03-analysis/features/${id}.iterate.md`,
  qa:         (id) => `docs/05-qa/features/${id}.qa-report.md`,
  report:     (id) => `docs/04-report/features/${id}.report.md`,
});

/**
 * Check if sprint name is valid kebab-case.
 *
 * Rules:
 *   - 3-64 chars total
 *   - Lowercase alphanumeric + hyphen only
 *   - Must start with letter, end with alphanumeric (no leading/trailing hyphen)
 *   - No consecutive hyphens (--)
 *
 * @param {string} name
 * @returns {boolean}
 */
function isValidSprintName(name) {
  if (typeof name !== 'string') return false;
  if (name.length < SPRINT_NAME_MIN_LENGTH || name.length > SPRINT_NAME_MAX_LENGTH) return false;
  if (!SPRINT_NAME_REGEX.test(name)) return false;
  if (name.includes('--')) return false;
  return true;
}

/**
 * Check if SprintContext has all required keys with non-empty trimmed values.
 *
 * @param {Object} ctx
 * @returns {boolean}
 */
function isValidSprintContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return false;
  return REQUIRED_CONTEXT_KEYS.every((k) =>
    typeof ctx[k] === 'string' && ctx[k].trim().length > 0
  );
}

/**
 * Returns the file path for a given Sprint phase document.
 * Mapping from Master Plan §18 Document Index.
 *
 * @param {string} sprintId
 * @param {string} phase - 'masterPlan' | 'prd' | 'plan' | 'design' | 'iterate' | 'qa' | 'report'
 * @returns {string|null}
 */
function sprintPhaseDocPath(sprintId, phase) {
  if (typeof sprintId !== 'string' || sprintId.length === 0) return null;
  const builder = PHASE_DOC_PATH_MAP[phase];
  if (typeof builder !== 'function') return null;
  return builder(sprintId);
}

/**
 * Composite validation for SprintInput.
 * Returns { ok, errors? } following PDCA `canTransition` shape pattern.
 *
 * @param {Object} input
 * @returns {{ ok: boolean, errors?: string[] }}
 */
function validateSprintInput(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['input_not_object'] };
  }
  const errors = [];
  if (!isValidSprintName(input.id)) {
    errors.push('invalid_id_kebab_case');
  }
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    errors.push('invalid_name_empty');
  }
  if (input.phase !== undefined && typeof input.phase !== 'string') {
    errors.push('invalid_phase_type');
  }
  if (input.context !== undefined && !isValidSprintContext(input.context)) {
    errors.push('invalid_context_missing_keys');
  }
  if (input.features !== undefined && !Array.isArray(input.features)) {
    errors.push('invalid_features_not_array');
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

module.exports = {
  isValidSprintName,
  isValidSprintContext,
  sprintPhaseDocPath,
  validateSprintInput,
  SPRINT_NAME_REGEX,
  SPRINT_NAME_MIN_LENGTH,
  SPRINT_NAME_MAX_LENGTH,
  REQUIRED_CONTEXT_KEYS,
};
