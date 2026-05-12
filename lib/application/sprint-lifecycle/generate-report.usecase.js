/**
 * generate-report.usecase.js — Sprint report-phase aggregator + renderer (v2.1.13 Sprint 2).
 *
 * Pure aggregation: walks the sprint state (phaseHistory + iterateHistory +
 * featureMap + qualityGates + kpi) to produce a markdown report + KPI snapshot
 * + carry-items list. File write is delegated to deps.fileWriter when present.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-2-application.design.md §8
 *
 * @module lib/application/sprint-lifecycle/generate-report.usecase
 * @version 2.1.13
 * @since 2.1.13
 */

const { sprintPhaseDocPath } = require('../../domain/sprint');

function defaultKpiCalculator(sprint) {
  const featureMap = (sprint && sprint.featureMap) || {};
  const featureEntries = Object.values(featureMap);
  const featuresTotal = featureEntries.length || ((sprint && sprint.features) || []).length || 0;
  const featuresCompleted = featureEntries.filter((f) => {
    return f && f.matchRate === 100 && f.qa === 'pass';
  }).length;
  const featureCompletionRate = featuresTotal > 0
    ? (featuresCompleted / featuresTotal) * 100
    : 0;

  const s1Values = featureEntries
    .map((f) => (f && typeof f.s1Score === 'number') ? f.s1Score : null)
    .filter((v) => v !== null);
  const dataFlowIntegrity = s1Values.length > 0
    ? (s1Values.reduce((a, b) => a + b, 0) / s1Values.length)
    : null;

  const prevKpi = (sprint && sprint.kpi) || {};
  return {
    matchRate: typeof prevKpi.matchRate === 'number' ? prevKpi.matchRate : null,
    criticalIssues: typeof prevKpi.criticalIssues === 'number' ? prevKpi.criticalIssues : 0,
    qaPassRate: typeof prevKpi.qaPassRate === 'number' ? prevKpi.qaPassRate : null,
    dataFlowIntegrity,
    featuresTotal,
    featuresCompleted,
    featureCompletionRate,
    cumulativeTokens: typeof prevKpi.cumulativeTokens === 'number' ? prevKpi.cumulativeTokens : 0,
    cumulativeIterations: typeof prevKpi.cumulativeIterations === 'number' ? prevKpi.cumulativeIterations : 0,
    sprintCycleHours: typeof prevKpi.sprintCycleHours === 'number' ? prevKpi.sprintCycleHours : null,
  };
}

function identifyCarryItems(sprint) {
  const featureMap = (sprint && sprint.featureMap) || {};
  const carry = [];
  for (const [featureName, f] of Object.entries(featureMap)) {
    if (!f) continue;
    const matchIncomplete = typeof f.matchRate === 'number' && f.matchRate < 100;
    const s1Incomplete = typeof f.s1Score === 'number' && f.s1Score < 100;
    if (matchIncomplete || s1Incomplete) {
      const reasons = [];
      if (matchIncomplete) reasons.push(`matchRate ${f.matchRate}`);
      if (s1Incomplete) reasons.push(`s1Score ${f.s1Score}`);
      carry.push({
        featureName,
        reason: reasons.join(', '),
        currentPhase: f.pdcaPhase || 'unknown',
      });
    }
  }
  return carry;
}

function extractLessons(sprint) {
  const lessons = [];
  const iterations = (sprint && sprint.iterateHistory) || [];
  if (iterations.length > 0) {
    const failed = iterations.filter((i) => typeof i.matchRate === 'number' && i.matchRate < 90);
    if (failed.length > 0) {
      lessons.push(`${failed.length} iteration cycle(s) below 90% — review gap-detector accuracy`);
    }
  }
  const pauseHistory = (sprint && sprint.autoPause && sprint.autoPause.pauseHistory) || [];
  if (pauseHistory.length > 0) {
    const triggers = pauseHistory.map((p) => p && p.trigger).filter(Boolean);
    lessons.push(`Paused ${triggers.length} time(s): ${triggers.join(', ')}`);
  }
  const phaseHistory = (sprint && sprint.phaseHistory) || [];
  const slowPhases = phaseHistory.filter((h) => {
    return typeof h.durationMs === 'number' && h.durationMs > 4 * 3600 * 1000;
  });
  if (slowPhases.length > 0) {
    lessons.push(`${slowPhases.length} phase(s) exceeded 4h — consider phaseTimeoutHours review`);
  }
  return lessons;
}

function renderReport(sprint, kpi, carryItems, lessons, generatedAt) {
  const lines = [];
  lines.push(`# Sprint Report — ${sprint.name || sprint.id}`);
  lines.push('');
  lines.push(`> Sprint ID: \`${sprint.id}\``);
  lines.push(`> Generated at: ${generatedAt}`);
  lines.push(`> Final phase: \`${sprint.phase}\``);
  lines.push(`> Status: \`${sprint.status}\``);
  lines.push('');
  lines.push('## 1. Context');
  const ctx = (sprint && sprint.context) || {};
  lines.push(`- **WHY**: ${ctx.WHY || '(not set)'}`);
  lines.push(`- **WHO**: ${ctx.WHO || '(not set)'}`);
  lines.push(`- **RISK**: ${ctx.RISK || '(not set)'}`);
  lines.push(`- **SUCCESS**: ${ctx.SUCCESS || '(not set)'}`);
  lines.push(`- **SCOPE**: ${ctx.SCOPE || '(not set)'}`);
  lines.push('');
  lines.push('## 2. KPI Snapshot');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| matchRate | ${kpi.matchRate === null ? '--' : `${kpi.matchRate}%`} |`);
  lines.push(`| criticalIssues | ${kpi.criticalIssues} |`);
  lines.push(`| dataFlowIntegrity (S1 avg) | ${kpi.dataFlowIntegrity === null ? '--' : `${kpi.dataFlowIntegrity.toFixed(2)}%`} |`);
  lines.push(`| features (completed/total) | ${kpi.featuresCompleted}/${kpi.featuresTotal} (${kpi.featureCompletionRate.toFixed(1)}%) |`);
  lines.push(`| cumulativeTokens | ${kpi.cumulativeTokens} |`);
  lines.push(`| cumulativeIterations | ${kpi.cumulativeIterations} |`);
  lines.push('');
  lines.push('## 3. Phase History');
  const phaseHistory = (sprint && sprint.phaseHistory) || [];
  if (phaseHistory.length === 0) {
    lines.push('_No phase history recorded._');
  } else {
    lines.push('| Phase | Entered | Exited | Duration (ms) |');
    lines.push('|-------|---------|--------|---------------|');
    for (const h of phaseHistory) {
      lines.push(`| ${h.phase} | ${h.enteredAt || '--'} | ${h.exitedAt || '--'} | ${h.durationMs === null || typeof h.durationMs === 'undefined' ? '--' : h.durationMs} |`);
    }
  }
  lines.push('');
  lines.push('## 4. Iteration History');
  const iterations = (sprint && sprint.iterateHistory) || [];
  if (iterations.length === 0) {
    lines.push('_No iterations executed._');
  } else {
    lines.push('| # | matchRate | fixedTaskIds | durationMs |');
    lines.push('|---|-----------|--------------|-----------|');
    for (const it of iterations) {
      const ids = Array.isArray(it.fixedTaskIds) ? it.fixedTaskIds.join(',') : '';
      lines.push(`| ${it.iteration} | ${it.matchRate === null ? '--' : `${it.matchRate}%`} | ${ids} | ${it.durationMs === null ? '--' : it.durationMs} |`);
    }
  }
  lines.push('');
  lines.push('## 5. Carry Items (next sprint candidates)');
  if (carryItems.length === 0) {
    lines.push('_No carry items — all features completed._');
  } else {
    lines.push('| Feature | Reason | Current Phase |');
    lines.push('|---------|--------|---------------|');
    for (const c of carryItems) {
      lines.push(`| ${c.featureName} | ${c.reason} | ${c.currentPhase} |`);
    }
  }
  lines.push('');
  lines.push('## 6. Lessons Learned');
  if (lessons.length === 0) {
    lines.push('_No notable lessons recorded._');
  } else {
    for (const l of lessons) {
      lines.push(`- ${l}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * @param {import('../../domain/sprint/entity').Sprint} sprint
 * @param {{ docPathResolver?: function, fileWriter?: function, kpiCalculator?: function, clock?: () => string }} [deps]
 * @returns {Promise<{ ok: boolean, reportContent: string, kpiSnapshot: Object, carryItems: Array, reportPath: string|null }>}
 */
async function generateReport(sprint, deps) {
  const resolvePath = (deps && typeof deps.docPathResolver === 'function')
    ? deps.docPathResolver
    : sprintPhaseDocPath;
  const writer = (deps && typeof deps.fileWriter === 'function') ? deps.fileWriter : null;
  const kpiCalc = (deps && typeof deps.kpiCalculator === 'function') ? deps.kpiCalculator : defaultKpiCalculator;
  const clock = (deps && typeof deps.clock === 'function')
    ? deps.clock
    : () => new Date().toISOString();

  const kpiSnapshot = kpiCalc(sprint);
  const carryItems = identifyCarryItems(sprint);
  const lessons = extractLessons(sprint);
  const generatedAt = clock();
  const reportContent = renderReport(sprint, kpiSnapshot, carryItems, lessons, generatedAt);
  const reportPath = resolvePath(sprint.id, 'report');

  if (writer && reportPath) {
    await writer(reportPath, reportContent);
  }

  return { ok: true, reportContent, kpiSnapshot, carryItems, reportPath };
}

module.exports = {
  generateReport,
};
