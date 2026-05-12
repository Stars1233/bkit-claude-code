/**
 * context-sizer.js — Sprint context window sizing + split recommendation (S3-UX, v2.1.13).
 *
 * Pure function module — no fs/path I/O at module top-level (loadContextSizingConfig
 * uses lazy require for fs.promises). Provides token estimation + dependency-aware
 * sprint split recommendations to ensure single-session safety (<= 100K tokens/sprint
 * by default, configurable via bkit.config.json sprint.contextSizing section).
 *
 * Algorithm pillars:
 *   - Token estimation: tokens = ceil(LOC * tokensPerLOC), defaults 5000 * 6.67 ~= 33350
 *   - Dependency graph: adjacency list, Kahn's topological sort + cycle detection
 *   - Bin-packing: greedy, with effectiveBudget = maxTokensPerSprint * (1 - safetyMargin)
 *   - Single-feature spillover: feature > maxTokensPerSprint -> own sprint + warning
 *
 * Sprint object shape matches S2-UX master-plan.usecase plan.sprints[] schema:
 *   { id: '<projectId>-s<N>', name, features[], scope, tokenEst, dependsOn[] }
 *
 * @module lib/application/sprint-lifecycle/context-sizer
 * @version 2.1.13
 * @since 2.1.13
 *
 * Design Ref: docs/02-design/features/s3-ux.design.md §1
 * PRD Ref: docs/01-plan/features/s3-ux.prd.md §3 (F1)
 * Plan Ref: docs/01-plan/features/s3-ux.plan.md R1-R6, §2.1~2.5
 */

'use strict';

// ============================================================================
// Constants
// ============================================================================

const CONTEXT_SIZING_SCHEMA_VERSION = '1.0';

const KEBAB_CASE_RE = /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/;

const CONTEXT_SIZING_DEFAULTS = Object.freeze({
  enabled: true,
  schemaVersion: '1.0',
  maxTokensPerSprint: 100000,
  safetyMargin: 0.25,
  tokensPerLOC: 6.67,
  baselineLOC: 5000,
  minSprints: 1,
  maxSprints: 12,
  dependencyAware: true,
});

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Estimate token consumption for a single feature.
 *
 * @param {string} featureName - free-form feature description or id
 * @param {Object} [opts]
 * @param {number} [opts.locHint] - explicit LOC override (>= 0)
 * @param {number} [opts.tokensPerLOC] - default CONTEXT_SIZING_DEFAULTS.tokensPerLOC
 * @param {number} [opts.baselineLOC] - default CONTEXT_SIZING_DEFAULTS.baselineLOC
 * @returns {number} Math.ceil(loc * tokensPerLOC)
 */
function estimateTokensForFeature(featureName, opts) {
  const o = opts || {};
  const tpl = typeof o.tokensPerLOC === 'number' && o.tokensPerLOC > 0
    ? o.tokensPerLOC
    : CONTEXT_SIZING_DEFAULTS.tokensPerLOC;
  const loc = typeof o.locHint === 'number' && o.locHint >= 0
    ? o.locHint
    : (typeof o.baselineLOC === 'number' && o.baselineLOC >= 0
        ? o.baselineLOC
        : CONTEXT_SIZING_DEFAULTS.baselineLOC);
  return Math.ceil(loc * tpl);
}

// ============================================================================
// Topological Sort (Kahn's algorithm)
// ============================================================================

/**
 * Kahn's algorithm topological sort.
 *
 * @param {Object<string, string[]>} graph - adjacency list { node: [deps...] }
 * @returns {{ ok: boolean, order?: string[], cycle?: string[] }}
 */
function topologicalSort(graph) {
  if (!graph || typeof graph !== 'object') {
    return { ok: true, order: [] };
  }
  // Collect all nodes (keys + values referenced)
  const allNodes = new Set();
  for (const k of Object.keys(graph)) {
    allNodes.add(k);
    const deps = Array.isArray(graph[k]) ? graph[k] : [];
    for (const d of deps) allNodes.add(d);
  }
  if (allNodes.size === 0) {
    return { ok: true, order: [] };
  }

  // Compute in-degree: how many deps each node has
  const inDegree = {};
  for (const n of allNodes) inDegree[n] = 0;
  for (const n of Object.keys(graph)) {
    const deps = Array.isArray(graph[n]) ? graph[n] : [];
    inDegree[n] = deps.length;
  }

  const queue = [];
  for (const n of Object.keys(inDegree)) {
    if (inDegree[n] === 0) queue.push(n);
  }

  const order = [];
  while (queue.length > 0) {
    const n = queue.shift();
    order.push(n);
    // For each node M that depends on n, decrement in-degree
    for (const m of Object.keys(graph)) {
      const deps = Array.isArray(graph[m]) ? graph[m] : [];
      if (deps.indexOf(n) !== -1) {
        inDegree[m]--;
        if (inDegree[m] === 0) queue.push(m);
      }
    }
  }

  if (order.length !== allNodes.size) {
    const cycle = Array.from(allNodes).filter(function (n) {
      return order.indexOf(n) === -1;
    });
    return { ok: false, cycle: cycle };
  }
  return { ok: true, order: order };
}

/**
 * @param {Object<string, string[]>} graph
 * @returns {boolean} true if a cycle exists
 */
function detectCycle(graph) {
  return !topologicalSort(graph).ok;
}

// ============================================================================
// Config Loader (lazy fs require)
// ============================================================================

/**
 * Load context-sizing config from bkit.config.json (lazy require fs).
 *
 * @param {Object} [opts]
 * @param {string} [opts.projectRoot] - default process.cwd()
 * @param {Function} [opts.fileReader] - default fs.promises.readFile
 * @returns {Promise<Object>} merged config (CONTEXT_SIZING_DEFAULTS + user overrides)
 */
async function loadContextSizingConfig(opts) {
  const o = opts || {};
  const projectRoot = o.projectRoot || process.cwd();
  const path = require('node:path');
  const fs = require('node:fs');
  const fileReader = o.fileReader || fs.promises.readFile;
  const configPath = path.join(projectRoot, 'bkit.config.json');
  try {
    const content = await fileReader(configPath, 'utf8');
    const config = JSON.parse(content);
    const sizing = config && config.sprint && config.sprint.contextSizing;
    if (!sizing || typeof sizing !== 'object') {
      return Object.assign({}, CONTEXT_SIZING_DEFAULTS);
    }
    return Object.assign({}, CONTEXT_SIZING_DEFAULTS, sizing);
  } catch (e) {
    // Missing file, malformed JSON, etc. -> defaults (silent fallback per PRD §JS-05)
    return Object.assign({}, CONTEXT_SIZING_DEFAULTS);
  }
}

// ============================================================================
// Sprint Split Recommendation
// ============================================================================

/**
 * Recommend sprint split with token-budget awareness + dependency graph.
 *
 * @param {Object} input
 * @param {string} input.projectId - kebab-case
 * @param {string[]} input.features
 * @param {Object<string, string[]>} [input.dependencyGraph] - adjacency list
 * @param {Object<string, number>} [input.locHints] - per-feature locHint overrides
 *
 * @param {Object} [opts] - merged config from loadContextSizingConfig (or DEFAULTS)
 *
 * @returns {{
 *   ok: boolean,
 *   sprints?: Array<Object>,
 *   dependencyGraph?: Object,
 *   totalTokenEst?: number,
 *   warning?: string,
 *   error?: string,
 *   suggestedAction?: string,
 *   cycle?: string[],
 *   errors?: string[]
 * }}
 */
function recommendSprintSplit(input, opts) {
  // Step 1: validate input
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'invalid_input', errors: ['input must be an object'] };
  }
  if (typeof input.projectId !== 'string' || input.projectId.length === 0) {
    errors.push('projectId required');
  } else if (!KEBAB_CASE_RE.test(input.projectId)) {
    errors.push('projectId must match kebab-case');
  }
  if (!Array.isArray(input.features)) {
    errors.push('features must be an array');
  }
  if (errors.length > 0) {
    return { ok: false, error: 'invalid_input', errors: errors };
  }

  const cfg = Object.assign({}, CONTEXT_SIZING_DEFAULTS, opts || {});
  const features = input.features.slice();

  // Empty features -> empty sprints
  if (features.length === 0) {
    return {
      ok: true,
      sprints: [],
      dependencyGraph: input.dependencyGraph || {},
      totalTokenEst: 0,
    };
  }

  // Step 2: estimate tokens per feature
  const locHints = input.locHints || {};
  const featureEstimates = features.map(function (f) {
    return {
      feature: f,
      tokenEst: estimateTokensForFeature(f, {
        locHint: locHints[f],
        tokensPerLOC: cfg.tokensPerLOC,
        baselineLOC: cfg.baselineLOC,
      }),
    };
  });

  // Step 3: topological sort if dependencyGraph + dependencyAware
  let depGraph = {};
  if (input.dependencyGraph && cfg.dependencyAware) {
    // Validate: all referenced features must exist in input.features
    for (const k of Object.keys(input.dependencyGraph)) {
      if (features.indexOf(k) === -1) {
        return {
          ok: false,
          error: 'unknown_feature_in_graph',
          errors: ['feature "' + k + '" in dependencyGraph but not in features list'],
        };
      }
      const deps = input.dependencyGraph[k];
      if (Array.isArray(deps)) {
        for (const d of deps) {
          if (features.indexOf(d) === -1) {
            return {
              ok: false,
              error: 'unknown_feature_in_graph',
              errors: ['dependency "' + d + '" of feature "' + k + '" not in features list'],
            };
          }
        }
      }
    }
    depGraph = input.dependencyGraph;
    const sortResult = topologicalSort(depGraph);
    if (!sortResult.ok) {
      return { ok: false, error: 'dependency_cycle', cycle: sortResult.cycle };
    }
    // Reorder featureEstimates by topological order
    const orderMap = {};
    sortResult.order.forEach(function (f, i) { orderMap[f] = i; });
    const indexed = featureEstimates.map(function (fe, idx) {
      return Object.assign({}, fe, {
        topoIdx: orderMap[fe.feature] !== undefined ? orderMap[fe.feature] : (sortResult.order.length + idx),
      });
    });
    indexed.sort(function (a, b) { return a.topoIdx - b.topoIdx; });
    featureEstimates.length = 0;
    indexed.forEach(function (fe) {
      featureEstimates.push({ feature: fe.feature, tokenEst: fe.tokenEst });
    });
  }

  // Step 4: greedy bin-packing
  const effectiveBudget = cfg.maxTokensPerSprint * (1 - cfg.safetyMargin);
  const sprints = [];
  let current = { features: [], tokenEst: 0 };
  let warning = null;
  for (const fe of featureEstimates) {
    // Single-feature spillover
    if (fe.tokenEst > cfg.maxTokensPerSprint) {
      if (current.features.length > 0) {
        sprints.push(current);
        current = { features: [], tokenEst: 0 };
      }
      sprints.push({ features: [fe.feature], tokenEst: fe.tokenEst, oversized: true });
      warning = warning || ('feature "' + fe.feature + '" exceeds maxTokensPerSprint (' +
        fe.tokenEst + ' > ' + cfg.maxTokensPerSprint + '); consider further decomposition');
      continue;
    }
    if (current.tokenEst + fe.tokenEst > effectiveBudget && current.features.length > 0) {
      sprints.push(current);
      current = { features: [], tokenEst: 0 };
    }
    current.features.push(fe.feature);
    current.tokenEst += fe.tokenEst;
  }
  if (current.features.length > 0) sprints.push(current);

  // Step 5: maxSprints cap check
  if (sprints.length > cfg.maxSprints) {
    return {
      ok: false,
      error: 'exceeds_maxSprints',
      computedSprintCount: sprints.length,
      maxSprints: cfg.maxSprints,
      suggestedAction: 'Increase bkit.config.json sprint.contextSizing.maxSprints (current: ' +
        cfg.maxSprints + ') or decompose features into fewer, larger items.',
    };
  }

  // Step 6: assign sprint dependencies + finalize shape
  const finalSprints = sprints.map(function (s, idx) {
    const sprintN = idx + 1;
    const id = input.projectId + '-s' + sprintN;
    return {
      id: id,
      name: 'Sprint ' + sprintN + ' of ' + input.projectId,
      features: s.features.slice(),
      scope: s.features.join(', '),
      tokenEst: s.tokenEst,
      dependsOn: [],
    };
  });
  // Cross-sprint dep edges
  if (cfg.dependencyAware && depGraph && Object.keys(depGraph).length > 0) {
    const featureToSprint = {};
    finalSprints.forEach(function (s) {
      s.features.forEach(function (f) { featureToSprint[f] = s.id; });
    });
    finalSprints.forEach(function (s) {
      const dependsSet = new Set();
      s.features.forEach(function (f) {
        const deps = depGraph[f];
        if (Array.isArray(deps)) {
          deps.forEach(function (d) {
            const depSprintId = featureToSprint[d];
            if (depSprintId && depSprintId !== s.id) {
              dependsSet.add(depSprintId);
            }
          });
        }
      });
      s.dependsOn = Array.from(dependsSet);
    });
  }

  const totalTokenEst = finalSprints.reduce(function (sum, s) { return sum + s.tokenEst; }, 0);
  const result = {
    ok: true,
    sprints: finalSprints,
    dependencyGraph: depGraph,
    totalTokenEst: totalTokenEst,
  };
  if (warning) result.warning = warning;
  return result;
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  estimateTokensForFeature,
  recommendSprintSplit,
  loadContextSizingConfig,
  topologicalSort,
  detectCycle,
  CONTEXT_SIZING_DEFAULTS,
  CONTEXT_SIZING_SCHEMA_VERSION,
  // exported for testing
  KEBAB_CASE_RE,
};
