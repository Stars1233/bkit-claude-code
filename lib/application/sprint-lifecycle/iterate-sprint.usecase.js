/**
 * iterate-sprint.usecase.js — Sprint iterate-phase matchRate 100% loop (v2.1.13 Sprint 2).
 *
 * Sequential (ENH-292) gap-detect → auto-fix → re-measure cycle until either
 *   - matchRate >= sprint.config.matchRateTarget (default 100), OR
 *   - iteration count >= sprint.config.maxIterations (default 5)
 *
 * When the loop exits below `matchRateMinAcceptable` (default 90) the result
 * is marked `blocked: true` so callers (start-sprint orchestrator + Stop hook)
 * can fire ITERATION_EXHAUSTED auto-pause.
 *
 * Pure use case — gap-detector / auto-fixer are injected via deps.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-2-application.design.md §6
 * Master Plan Ref: docs/01-plan/features/sprint-management.master-plan.md §11.3 (ITERATION_EXHAUSTED)
 *
 * @module lib/application/sprint-lifecycle/iterate-sprint.usecase
 * @version 2.1.13
 * @since 2.1.13
 */

const { cloneSprint } = require('../../domain/sprint');

function defaultGapDetector(_sprint) {
  return Promise.resolve({ matchRate: 100, gaps: [] });
}

function defaultAutoFixer(_sprint, _gaps) {
  return Promise.resolve({ fixedTaskIds: [] });
}

/**
 * @typedef {Object} IterateSprintResult
 * @property {boolean} ok
 * @property {import('../../domain/sprint/entity').Sprint} sprint
 * @property {number} finalMatchRate
 * @property {number} iterations
 * @property {boolean} blocked
 * @property {Array<{ iteration: number, matchRate: number|null, fixedTaskIds: string[], durationMs: number|null }>} history
 */

/**
 * Iterate a sprint until matchRate target or maxIterations reached.
 *
 * @param {import('../../domain/sprint/entity').Sprint} sprint - in 'iterate' phase
 * @param {{ gapDetector?: function, autoFixer?: function, eventEmitter?: function, clock?: () => number }} [deps]
 * @returns {Promise<IterateSprintResult>}
 */
async function iterateSprint(sprint, deps) {
  const target = (sprint && sprint.config && sprint.config.matchRateTarget) || 100;
  const maxIter = (sprint && sprint.config && sprint.config.maxIterations) || 5;
  const minOk = (sprint && sprint.config && sprint.config.matchRateMinAcceptable) || 90;
  const gapDetector = (deps && typeof deps.gapDetector === 'function')
    ? deps.gapDetector : defaultGapDetector;
  const autoFixer = (deps && typeof deps.autoFixer === 'function')
    ? deps.autoFixer : defaultAutoFixer;
  const clock = (deps && typeof deps.clock === 'function') ? deps.clock : () => Date.now();

  let working = sprint;
  const historyAppend = [...(working.iterateHistory || [])];

  let measurement = await gapDetector(working);
  let currentMatchRate = (measurement && typeof measurement.matchRate === 'number')
    ? measurement.matchRate
    : 0;

  let iter = 0;
  while (currentMatchRate < target && iter < maxIter) {
    const iterStart = clock();
    const fix = await autoFixer(working, (measurement && measurement.gaps) || []);
    const fixedTaskIds = (fix && Array.isArray(fix.fixedTaskIds)) ? [...fix.fixedTaskIds] : [];
    const remeasure = await gapDetector(working);
    const newRate = (remeasure && typeof remeasure.matchRate === 'number')
      ? remeasure.matchRate
      : currentMatchRate;
    iter += 1;
    historyAppend.push({
      iteration: iter,
      matchRate: newRate,
      fixedTaskIds,
      durationMs: clock() - iterStart,
    });
    measurement = remeasure;
    currentMatchRate = newRate;
  }

  const blocked = (currentMatchRate < minOk) && (iter >= maxIter);

  const prevKpi = (working && working.kpi) || {};
  const prevGates = (working && working.qualityGates) || {};
  const prevM1 = prevGates.M1_matchRate || { current: null, threshold: 90, passed: null };

  const updated = cloneSprint(working, {
    iterateHistory: historyAppend,
    kpi: {
      ...prevKpi,
      matchRate: currentMatchRate,
      cumulativeIterations: (prevKpi.cumulativeIterations || 0) + iter,
    },
    qualityGates: {
      ...prevGates,
      M1_matchRate: {
        current: currentMatchRate,
        threshold: prevM1.threshold || 90,
        passed: currentMatchRate >= (prevM1.threshold || 90),
      },
    },
  });

  return {
    ok: true,
    sprint: updated,
    finalMatchRate: currentMatchRate,
    iterations: iter,
    blocked,
    history: historyAppend,
  };
}

module.exports = {
  iterateSprint,
};
