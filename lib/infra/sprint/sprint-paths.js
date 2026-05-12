/**
 * sprint-paths.js — Pure path helper for Sprint Infrastructure (v2.1.13 Sprint 3).
 *
 * Centralizes all .bkit/state/sprints/ + .bkit/runtime/sprint-* path
 * computations. No fs/I/O — caller decides when to read/write.
 *
 * Delegates phase doc path mapping to Sprint 1 sprintPhaseDocPath() and
 * adds project-root prefix for absolute paths.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-3-infrastructure.design.md §3
 * ADR Ref: 0009 (state schema v1.1 — .bkit/state/sprints/{id}.json)
 *
 * @module lib/infra/sprint/sprint-paths
 * @version 2.1.13
 * @since 2.1.13
 */

const path = require('node:path');
const { sprintPhaseDocPath } = require('../../domain/sprint');

/**
 * Supported matrix types. Frozen — extension requires explicit code change.
 * @type {ReadonlyArray<string>}
 */
const MATRIX_TYPES = Object.freeze(['data-flow', 'api-contract', 'test-coverage']);

/**
 * @param {string} projectRoot - absolute path to project root
 * @returns {string} `<projectRoot>/.bkit/state/sprints/`
 */
function getSprintStateDir(projectRoot) {
  return path.join(projectRoot, '.bkit', 'state', 'sprints');
}

/**
 * @param {string} projectRoot
 * @param {string} id - sprint id (kebab-case)
 * @returns {string} `<projectRoot>/.bkit/state/sprints/{id}.json`
 */
function getSprintStateFile(projectRoot, id) {
  return path.join(getSprintStateDir(projectRoot), `${id}.json`);
}

/**
 * @param {string} projectRoot
 * @returns {string} `<projectRoot>/.bkit/state/sprint-status.json` (root index)
 */
function getSprintIndexFile(projectRoot) {
  return path.join(projectRoot, '.bkit', 'state', 'sprint-status.json');
}

/**
 * @param {string} projectRoot
 * @returns {string} `<projectRoot>/.bkit/runtime/sprint-feature-map.json`
 */
function getSprintFeatureMapFile(projectRoot) {
  return path.join(projectRoot, '.bkit', 'runtime', 'sprint-feature-map.json');
}

/**
 * @param {string} projectRoot
 * @returns {string} `<projectRoot>/.bkit/runtime/sprint-matrices/`
 */
function getSprintMatrixDir(projectRoot) {
  return path.join(projectRoot, '.bkit', 'runtime', 'sprint-matrices');
}

/**
 * @param {string} projectRoot
 * @param {string} type - one of MATRIX_TYPES
 * @returns {string|null} `<dir>/{type}-matrix.json` or null when type unknown
 */
function getSprintMatrixFile(projectRoot, type) {
  if (!MATRIX_TYPES.includes(type)) return null;
  return path.join(getSprintMatrixDir(projectRoot), `${type}-matrix.json`);
}

/**
 * Resolve the absolute path to a Sprint phase doc (delegates to Sprint 1
 * sprintPhaseDocPath for the relative portion, then prefixes projectRoot).
 *
 * @param {string} projectRoot
 * @param {string} sprintId
 * @param {string} phase - 'masterPlan' | 'prd' | 'plan' | 'design' | 'iterate' | 'qa' | 'report'
 * @returns {string|null}
 */
function getSprintPhaseDocAbsPath(projectRoot, sprintId, phase) {
  const rel = sprintPhaseDocPath(sprintId, phase);
  if (!rel) return null;
  return path.join(projectRoot, rel);
}

module.exports = {
  MATRIX_TYPES,
  getSprintStateDir,
  getSprintStateFile,
  getSprintIndexFile,
  getSprintFeatureMapFile,
  getSprintMatrixDir,
  getSprintMatrixFile,
  getSprintPhaseDocAbsPath,
};
