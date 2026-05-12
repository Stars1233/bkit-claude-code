/**
 * sprint-state-store.adapter.js — Atomic JSON persistence for Sprint state (v2.1.13 Sprint 3).
 *
 * Implements the Sprint 2 `deps.stateStore` interface:
 *   - save(sprint): Promise<void>   — atomic tmp+rename + root index update
 *   - load(id): Promise<Sprint|null>
 *   - list(): Promise<Array<SprintIndexEntry>>
 *   - remove(id): Promise<void>     — idempotent
 *   - getIndex(): Promise<Object>   — raw root index
 *
 * Writes occur under `.bkit/state/sprints/{id}.json` and the root index at
 * `.bkit/state/sprint-status.json`. Both writes use the tmp+rename pattern
 * established by `lib/core/state-store.js` (reference, not imported — to
 * keep this adapter standalone and dependency-light).
 *
 * Design Ref: docs/02-design/features/v2113-sprint-3-infrastructure.design.md §4
 * Cross-Sprint contract: Sprint 2 `start-sprint.usecase.js` deps.stateStore.
 *
 * @module lib/infra/sprint/sprint-state-store.adapter
 * @version 2.1.13
 * @since 2.1.13
 */

const fs = require('node:fs');
const path = require('node:path');

const {
  getSprintStateDir,
  getSprintStateFile,
  getSprintIndexFile,
} = require('./sprint-paths');

/**
 * Write JSON atomically using tmp+rename.
 * Creates parent directories on demand. Cleans up tmp file on failure.
 *
 * @param {string} filePath
 * @param {any} data
 */
function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (_e) { /* ignore cleanup failure */ }
    throw e;
  }
}

/**
 * Read + parse JSON; returns null when file is missing or corrupt.
 *
 * @param {string} filePath
 * @returns {any|null}
 */
function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_e) {
    return null;
  }
}

/**
 * @typedef {Object} SprintIndexEntry
 * @property {string} id
 * @property {string} name
 * @property {string} phase
 * @property {string} status
 * @property {string} [trustLevelAtStart]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} StateStore
 * @property {(sprint: import('../../domain/sprint/entity').Sprint) => Promise<void>} save
 * @property {(id: string) => Promise<import('../../domain/sprint/entity').Sprint|null>} load
 * @property {() => Promise<SprintIndexEntry[]>} list
 * @property {(id: string) => Promise<void>} remove
 * @property {() => Promise<Object>} getIndex
 */

const INDEX_VERSION = '1.1';

/**
 * Factory for a StateStore adapter rooted at `projectRoot`.
 *
 * @param {{ projectRoot: string, clock?: () => string }} opts
 * @returns {StateStore}
 */
function createStateStore(opts) {
  if (!opts || typeof opts.projectRoot !== 'string' || opts.projectRoot.length === 0) {
    throw new TypeError('createStateStore: projectRoot must be a non-empty string');
  }
  const projectRoot = opts.projectRoot;
  const clock = (typeof opts.clock === 'function')
    ? opts.clock
    : () => new Date().toISOString();

  function ensureStateDir() {
    const dir = getSprintStateDir(projectRoot);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  function buildIndexEntry(sprint, updatedAt) {
    return {
      id: sprint.id,
      name: sprint.name,
      phase: sprint.phase,
      status: sprint.status,
      trustLevelAtStart: sprint.autoRun && sprint.autoRun.trustLevelAtStart,
      createdAt: sprint.createdAt,
      updatedAt,
    };
  }

  async function save(sprint) {
    if (!sprint || typeof sprint !== 'object' || typeof sprint.id !== 'string' || sprint.id.length === 0) {
      throw new TypeError('save: sprint must have non-empty string id');
    }
    ensureStateDir();
    const stateFile = getSprintStateFile(projectRoot, sprint.id);
    atomicWriteJson(stateFile, sprint);

    const indexFile = getSprintIndexFile(projectRoot);
    const index = safeReadJson(indexFile) || { version: INDEX_VERSION, entries: {} };
    if (!index.entries || typeof index.entries !== 'object') index.entries = {};
    const updatedAt = clock();
    index.entries[sprint.id] = buildIndexEntry(sprint, updatedAt);
    index.updatedAt = updatedAt;
    atomicWriteJson(indexFile, index);
  }

  async function load(id) {
    if (typeof id !== 'string' || id.length === 0) return null;
    return safeReadJson(getSprintStateFile(projectRoot, id));
  }

  async function list() {
    const indexFile = getSprintIndexFile(projectRoot);
    const index = safeReadJson(indexFile);
    if (!index || !index.entries || typeof index.entries !== 'object') return [];
    return Object.values(index.entries);
  }

  async function remove(id) {
    if (typeof id !== 'string' || id.length === 0) return;
    const stateFile = getSprintStateFile(projectRoot, id);
    try {
      if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
    } catch (_e) { /* idempotent — ignore failure */ }

    const indexFile = getSprintIndexFile(projectRoot);
    const index = safeReadJson(indexFile);
    if (index && index.entries && Object.prototype.hasOwnProperty.call(index.entries, id)) {
      delete index.entries[id];
      index.updatedAt = clock();
      atomicWriteJson(indexFile, index);
    }
  }

  async function getIndex() {
    const indexFile = getSprintIndexFile(projectRoot);
    return safeReadJson(indexFile) || { version: INDEX_VERSION, entries: {} };
  }

  return { save, load, list, remove, getIndex };
}

module.exports = {
  createStateStore,
  // Exposed for sibling adapters that need the same atomic-write semantics
  // (matrix-sync reuses; intentionally NOT a public Port — internal contract).
  atomicWriteJson,
  safeReadJson,
};
