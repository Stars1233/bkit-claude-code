/**
 * matrix-sync.adapter.js — 3-matrix atomic synchronizer (v2.1.13 Sprint 3).
 *
 * Maintains three cross-sprint observability matrices under
 * `.bkit/runtime/sprint-matrices/`:
 *   - data-flow-matrix.json     (feature × 7-Layer hop × passed)
 *   - api-contract-matrix.json  (feature × endpoint × contract)
 *   - test-coverage-matrix.json (feature × test layer L1-L5 × counts)
 *
 * Each update is a read-modify-write cycle using the same atomic tmp+rename
 * pattern as sprint-state-store. Sequential by design (ENH-292) so two
 * concurrent syncs within a single process cannot interleave partial writes.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-3-infrastructure.design.md §7
 *
 * @module lib/infra/sprint/matrix-sync.adapter
 * @version 2.1.13
 * @since 2.1.13
 */

const fs = require('node:fs');

const { MATRIX_TYPES, getSprintMatrixFile } = require('./sprint-paths');
const { atomicWriteJson, safeReadJson } = require('./sprint-state-store.adapter');

const MATRIX_VERSION = '1.0';

/**
 * @typedef {Object} MatrixSync
 * @property {(sprintId: string, featureName: string, hopResults: Array) => Promise<void>} syncDataFlow
 * @property {(sprintId: string, featureName: string, contractResults: Array) => Promise<void>} syncApiContract
 * @property {(sprintId: string, featureName: string, layerCounts: Object) => Promise<void>} syncTestCoverage
 * @property {(type: string) => Promise<Object>} read
 * @property {(type: string) => Promise<void>} clear
 */

/**
 * Factory for a matrix-sync adapter.
 *
 * @param {{ projectRoot: string, clock?: () => string }} opts
 * @returns {MatrixSync}
 */
function createMatrixSync(opts) {
  if (!opts || typeof opts.projectRoot !== 'string' || opts.projectRoot.length === 0) {
    throw new TypeError('createMatrixSync: projectRoot must be a non-empty string');
  }
  const projectRoot = opts.projectRoot;
  const clock = (typeof opts.clock === 'function')
    ? opts.clock
    : () => new Date().toISOString();

  function emptyMatrix(type) {
    return { type, version: MATRIX_VERSION, updatedAt: clock(), sprints: {} };
  }

  function readMatrix(type) {
    const file = getSprintMatrixFile(projectRoot, type);
    if (!file) return null;
    const data = safeReadJson(file);
    if (data && typeof data === 'object' && data.sprints && typeof data.sprints === 'object') {
      return data;
    }
    return emptyMatrix(type);
  }

  function writeMatrix(type, data) {
    const file = getSprintMatrixFile(projectRoot, type);
    if (!file) throw new Error(`matrix-sync: unknown matrix type ${type}`);
    data.updatedAt = clock();
    atomicWriteJson(file, data);
  }

  function ensureSprintBucket(matrix, sprintId) {
    if (!matrix.sprints[sprintId]) matrix.sprints[sprintId] = { features: {} };
    if (!matrix.sprints[sprintId].features) matrix.sprints[sprintId].features = {};
  }

  async function syncDataFlow(sprintId, featureName, hopResults) {
    if (typeof sprintId !== 'string' || typeof featureName !== 'string') {
      throw new TypeError('syncDataFlow: sprintId + featureName must be strings');
    }
    const matrix = readMatrix('data-flow');
    ensureSprintBucket(matrix, sprintId);
    const hops = Array.isArray(hopResults) ? hopResults : [];
    const passed = hops.filter((h) => h && h.passed).length;
    const total = hops.length || 7;
    matrix.sprints[sprintId].features[featureName] = {
      hopResults: hops,
      s1Score: total > 0 ? (passed / total) * 100 : 0,
      lastUpdated: clock(),
    };
    writeMatrix('data-flow', matrix);
  }

  async function syncApiContract(sprintId, featureName, contractResults) {
    if (typeof sprintId !== 'string' || typeof featureName !== 'string') {
      throw new TypeError('syncApiContract: sprintId + featureName must be strings');
    }
    const matrix = readMatrix('api-contract');
    ensureSprintBucket(matrix, sprintId);
    matrix.sprints[sprintId].features[featureName] = {
      contracts: Array.isArray(contractResults) ? contractResults : [],
      lastUpdated: clock(),
    };
    writeMatrix('api-contract', matrix);
  }

  async function syncTestCoverage(sprintId, featureName, layerCounts) {
    if (typeof sprintId !== 'string' || typeof featureName !== 'string') {
      throw new TypeError('syncTestCoverage: sprintId + featureName must be strings');
    }
    const matrix = readMatrix('test-coverage');
    ensureSprintBucket(matrix, sprintId);
    matrix.sprints[sprintId].features[featureName] = {
      layers: (layerCounts && typeof layerCounts === 'object') ? layerCounts : {},
      lastUpdated: clock(),
    };
    writeMatrix('test-coverage', matrix);
  }

  async function read(type) {
    if (!MATRIX_TYPES.includes(type)) {
      throw new Error(`matrix-sync.read: unknown type ${type}`);
    }
    return readMatrix(type);
  }

  async function clear(type) {
    const file = getSprintMatrixFile(projectRoot, type);
    if (!file) return;
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (_e) { /* idempotent */ }
  }

  return { syncDataFlow, syncApiContract, syncTestCoverage, read, clear };
}

module.exports = {
  createMatrixSync,
  MATRIX_VERSION,
};
