/**
 * Operational Metrics — Extends gap-detector with runtime metrics
 * @module lib/context/ops-metrics
 * @version 3.0.0
 *
 * FR-21: Integrates error rate, latency, uptime, log anomaly into Check phase.
 * Reads from Observability stack data (Prometheus/Loki/Tempo) when available,
 * or falls back to file-based metrics for local development.
 */
const fs = require('fs');
const path = require('path');

/**
 * Collect operational metrics for Check phase
 * @param {string} feature - Feature name
 * @param {Object} options - { metricsFile, environment }
 * @returns {OpsMetrics}
 */
async function collectOpsMetrics(feature, options = {}) {
  const metricsFile = options.metricsFile ||
    path.join(process.cwd(), '.bkit', 'ops-metrics.json');

  // Try to read metrics file (populated by monitoring bridge or CI/CD)
  let metrics = {
    error_rate: null,
    p99_latency_ms: null,
    uptime_percent: null,
    log_anomaly_count: null,
    last_updated: null,
    source: 'none',
  };

  if (fs.existsSync(metricsFile)) {
    try {
      metrics = { ...metrics, ...JSON.parse(fs.readFileSync(metricsFile, 'utf8')) };
      metrics.source = 'file';
    } catch { /* use defaults */ }
  }

  return metrics;
}

/**
 * Evaluate operational metrics against thresholds
 * @param {OpsMetrics} metrics
 * @returns {OpsEvaluation}
 */
function evaluateOpsMetrics(metrics) {
  const thresholds = {
    error_rate: { warn: 1.0, critical: 5.0, unit: '%' },
    p99_latency_ms: { warn: 500, critical: 2000, unit: 'ms' },
    uptime_percent: { warn: 99.5, critical: 99.0, unit: '%', inverted: true },
    log_anomaly_count: { warn: 10, critical: 50, unit: 'count' },
  };

  const results = [];

  for (const [key, threshold] of Object.entries(thresholds)) {
    const value = metrics[key];
    if (value === null || value === undefined) {
      results.push({ metric: key, status: 'no-data', value: null });
      continue;
    }

    let status = 'pass';
    if (threshold.inverted) {
      if (value < threshold.critical) status = 'critical';
      else if (value < threshold.warn) status = 'warning';
    } else {
      if (value >= threshold.critical) status = 'critical';
      else if (value >= threshold.warn) status = 'warning';
    }

    results.push({
      metric: key,
      status,
      value,
      threshold: threshold.inverted ? `>= ${threshold.warn}${threshold.unit}` : `< ${threshold.warn}${threshold.unit}`,
    });
  }

  const hasCritical = results.some(r => r.status === 'critical');
  const hasWarning = results.some(r => r.status === 'warning');
  const opsScore = calculateOpsScore(results);

  return {
    results,
    hasCritical,
    hasWarning,
    opsScore,
    summary: formatOpsReport(results, opsScore),
  };
}

/**
 * Calculate operational health score (0-100)
 */
function calculateOpsScore(results) {
  const scored = results.filter(r => r.status !== 'no-data');
  if (scored.length === 0) return null;

  const points = scored.map(r => {
    if (r.status === 'pass') return 100;
    if (r.status === 'warning') return 60;
    return 20;
  });

  return Math.round(points.reduce((a, b) => a + b, 0) / points.length);
}

/**
 * Format operational metrics report
 */
function formatOpsReport(results, opsScore) {
  const lines = ['### Operational Metrics'];

  if (opsScore !== null) {
    lines.push(`Ops Health Score: ${opsScore}/100\n`);
  }

  const icons = { pass: '✅', warning: '⚠️', critical: '🔴', 'no-data': '⬜' };

  for (const r of results) {
    const icon = icons[r.status] || '❓';
    const val = r.value !== null ? `${r.value}` : 'N/A';
    lines.push(`${icon} ${r.metric}: ${val} (${r.status})`);
  }

  return lines.join('\n');
}

/**
 * Merge ops metrics into gap analysis match rate
 * @param {number} codeMatchRate - Code-only match rate (0-100)
 * @param {number|null} opsScore - Ops health score (0-100)
 * @returns {number} Combined match rate
 */
function mergeMatchRate(codeMatchRate, opsScore) {
  if (opsScore === null) return codeMatchRate;
  // Weight: 80% code, 20% ops
  return Math.round(codeMatchRate * 0.8 + opsScore * 0.2);
}

module.exports = {
  collectOpsMetrics,
  evaluateOpsMetrics,
  calculateOpsScore,
  mergeMatchRate,
  formatOpsReport,
};
