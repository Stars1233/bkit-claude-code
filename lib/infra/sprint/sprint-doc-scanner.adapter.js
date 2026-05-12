/**
 * sprint-doc-scanner.adapter.js — Discover Sprint master plan + phase docs (v2.1.13 Sprint 3).
 *
 * Walks `docs/01-plan/features/` for `*.master-plan.md` files, extracts the
 * Sprint id (kebab-case validated against Sprint 1 SPRINT_NAME_REGEX), and
 * resolves the existence of all 7 phase docs (masterPlan, prd, plan, design,
 * iterate, qa, report) via Sprint 1 sprintPhaseDocPath().
 *
 * Used by Sprint 4 `/sprint list` skill handler + Sprint 5 cumulative
 * reporting.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-3-infrastructure.design.md §6
 *
 * @module lib/infra/sprint/sprint-doc-scanner.adapter
 * @version 2.1.13
 * @since 2.1.13
 */

const fs = require('node:fs');
const path = require('node:path');

const { SPRINT_NAME_REGEX } = require('../../domain/sprint');
const { getSprintPhaseDocAbsPath } = require('./sprint-paths');

const MASTER_PLAN_SUFFIX = '.master-plan.md';

/**
 * The 7 phase keys defined by Sprint 1 SprintDocs typedef.
 * @type {ReadonlyArray<string>}
 */
const PHASE_KEYS = Object.freeze([
  'masterPlan', 'prd', 'plan', 'design', 'iterate', 'qa', 'report',
]);

/**
 * @param {string} filename - basename to test
 * @returns {string|null} the extracted sprint id or null when invalid
 */
function extractSprintId(filename) {
  if (typeof filename !== 'string') return null;
  if (!filename.endsWith(MASTER_PLAN_SUFFIX)) return null;
  const candidate = filename.slice(0, -MASTER_PLAN_SUFFIX.length);
  if (!SPRINT_NAME_REGEX.test(candidate)) return null;
  if (candidate.includes('--')) return null;
  return candidate;
}

/**
 * Build the empty SprintDocs result for an invalid or missing sprint.
 * @returns {Object} { masterPlan: null, prd: null, ... }
 */
function emptyDocs() {
  const out = {};
  for (const k of PHASE_KEYS) out[k] = null;
  return out;
}

/**
 * @typedef {Object} DocScanner
 * @property {() => Promise<Array<{id: string, masterPlanPath: string|null, docs: Object}>>} findAllSprints
 * @property {(id: string) => Promise<Object>} findSprintDocs
 * @property {(id: string, phase: string) => Promise<boolean>} hasPhaseDoc
 */

/**
 * Factory for a doc-scanner adapter rooted at `projectRoot`.
 *
 * @param {{ projectRoot: string }} opts
 * @returns {DocScanner}
 */
function createDocScanner(opts) {
  if (!opts || typeof opts.projectRoot !== 'string' || opts.projectRoot.length === 0) {
    throw new TypeError('createDocScanner: projectRoot must be a non-empty string');
  }
  const projectRoot = opts.projectRoot;

  async function findSprintDocs(id) {
    if (typeof id !== 'string' || !SPRINT_NAME_REGEX.test(id) || id.includes('--')) {
      return emptyDocs();
    }
    const out = {};
    for (const phase of PHASE_KEYS) {
      const abs = getSprintPhaseDocAbsPath(projectRoot, id, phase);
      out[phase] = (abs && fs.existsSync(abs)) ? abs : null;
    }
    return out;
  }

  async function findAllSprints() {
    const planDir = path.join(projectRoot, 'docs', '01-plan', 'features');
    if (!fs.existsSync(planDir)) return [];
    let files;
    try {
      files = fs.readdirSync(planDir);
    } catch (_e) {
      return [];
    }
    const sprints = [];
    // Sequential iteration (ENH-292 — even though pure IO, keep pattern consistent).
    for (const f of files) {
      const id = extractSprintId(f);
      if (!id) continue;
      // Avoid duplicate when multiple master-plan files for same id exist (defensive).
      if (sprints.find((s) => s.id === id)) continue;
      // eslint-disable-next-line no-await-in-loop
      const docs = await findSprintDocs(id);
      sprints.push({ id, masterPlanPath: docs.masterPlan, docs });
    }
    return sprints;
  }

  async function hasPhaseDoc(id, phase) {
    if (!PHASE_KEYS.includes(phase)) return false;
    const abs = getSprintPhaseDocAbsPath(projectRoot, id, phase);
    return Boolean(abs && fs.existsSync(abs));
  }

  return { findAllSprints, findSprintDocs, hasPhaseDoc };
}

module.exports = {
  createDocScanner,
  PHASE_KEYS,
  extractSprintId,
};
