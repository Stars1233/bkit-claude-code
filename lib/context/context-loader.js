/**
 * Context Loader — 4-Layer Living Context unified loader
 * @module lib/context/context-loader
 * @version 3.0.0
 *
 * Loads contextual information for a given file path:
 *   Layer 1: Scenario Matrix (docs/02-design/scenarios/*.yaml)
 *   Layer 2: Invariants Registry (.bkit/invariants.yaml)
 *   Layer 3: Impact Map (.bkit/impact-map.yaml)
 *   Layer 4: Incident Memory (.bkit/incident-memory.yaml)
 *   + PDCA Plan/Design documents
 */
const fs = require('fs');
const path = require('path');

let _paths = null;
function getPaths() {
  if (!_paths) { _paths = require('../core/paths'); }
  return _paths;
}

/**
 * Parse YAML file safely (simple key-value parser, no external deps)
 * For complex YAML, falls back to JSON-like structure
 */
function parseYamlFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    // Try JSON first (YAML superset)
    try { return JSON.parse(content); } catch {}
    // Simple YAML parse for our structured schemas
    return parseSimpleYaml(content);
  } catch { return null; }
}

/**
 * Minimal YAML parser for our structured scenario/invariant files.
 * Handles arrays of objects with string/number/boolean/array values.
 */
function parseSimpleYaml(content) {
  const lines = content.split('\n');
  const result = {};
  let currentArray = null;
  let currentItem = null;
  let arrayKey = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);

    // Top-level key: value
    if (indent === 0 && line.includes(':')) {
      const [key, ...rest] = line.split(':');
      const val = rest.join(':').trim();
      if (val === '' || val === '[]' || val === '{}') {
        result[key.trim()] = val === '[]' ? [] : val === '{}' ? {} : undefined;
        currentArray = null;
        arrayKey = key.trim();
      } else {
        result[key.trim()] = cleanYamlValue(val);
        currentArray = null;
      }
      continue;
    }

    // Array item start: "  - key: value"
    if (line.trim().startsWith('- ')) {
      if (!arrayKey) continue;
      if (!Array.isArray(result[arrayKey])) result[arrayKey] = [];
      currentItem = {};
      const itemContent = line.trim().slice(2);
      if (itemContent.includes(':')) {
        const [k, ...v] = itemContent.split(':');
        currentItem[k.trim()] = cleanYamlValue(v.join(':').trim());
      }
      result[arrayKey].push(currentItem);
      currentArray = result[arrayKey];
      continue;
    }

    // Nested property in current item
    if (currentItem && indent >= 4 && line.trim().includes(':')) {
      const [k, ...v] = line.trim().split(':');
      const key = k.trim();
      const val = v.join(':').trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        // Inline array: ["a", "b"]
        currentItem[key] = val.slice(1, -1).split(',').map(s => cleanYamlValue(s.trim()));
      } else if (val === '' || val === '[]') {
        currentItem[key] = [];
      } else {
        currentItem[key] = cleanYamlValue(val);
      }
    }
  }

  return result;
}

function cleanYamlValue(val) {
  if (!val || val === '""' || val === "''") return '';
  // Remove quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  // Booleans
  if (val === 'true') return true;
  if (val === 'false') return false;
  // Numbers
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  return val;
}

/**
 * Load scenarios matching a given file path
 */
async function loadScenarios(filePath) {
  const scenariosDir = getPaths().STATE_PATHS.scenariosDir();
  if (!fs.existsSync(scenariosDir)) return [];

  const scenarios = [];
  const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

  for (const f of files) {
    const data = parseYamlFile(path.join(scenariosDir, f));
    if (!data) continue;

    // Match by file path
    const targetFile = data.file || '';
    if (targetFile && filePath.includes(targetFile)) {
      const items = data.scenarios || [];
      scenarios.push(...items.map(s => ({ ...s, _source: f, _module: data.module })));
    }
  }
  return scenarios;
}

/**
 * Load invariants that apply to a given file path
 */
async function loadInvariants(filePath) {
  const invPath = getPaths().STATE_PATHS.invariants();
  const data = parseYamlFile(invPath);
  if (!data || !data.invariants) return [];

  return data.invariants.filter(inv => {
    const files = inv.files || [];
    return files.some(f => filePath.includes(f));
  });
}

/**
 * Load impact map info for a given file path
 */
async function loadImpactMap(filePath) {
  const mapPath = getPaths().STATE_PATHS.impactMap();
  try {
    if (!fs.existsSync(mapPath)) return null;
    const data = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    if (!data || !data.modules) return null;

    for (const [key, info] of Object.entries(data.modules)) {
      if (filePath.includes(key) || key.includes(filePath)) {
        return {
          file: key,
          depends_on: info.depends_on || [],
          depended_by: info.depended_by || [],
          blast_radius: info.blast_radius || 0,
          change_risk: info.change_risk || 'unknown',
        };
      }
    }
  } catch { /* ignore parse errors */ }
  return null;
}

/**
 * Load past incidents related to a file path
 */
async function loadIncidents(filePath) {
  const memPath = getPaths().STATE_PATHS.incidentMemory();
  const data = parseYamlFile(memPath);
  if (!data || !data.incidents) return [];

  return data.incidents.filter(inc => {
    const incFile = inc.file || '';
    return filePath.includes(incFile) || incFile.includes(filePath);
  });
}

/**
 * Load PDCA Plan/Design context for a feature
 */
async function loadDesignContext(feature) {
  if (!feature) return null;
  const { findDoc } = getPaths();

  const planPath = findDoc('plan', feature);
  const designPath = findDoc('design', feature);

  const result = { plan_summary: '', design_intent: '', success_criteria: '' };

  if (planPath && fs.existsSync(planPath)) {
    const content = fs.readFileSync(planPath, 'utf8');
    const execMatch = content.match(/## Executive Summary[\s\S]*?\n---/);
    if (execMatch) result.plan_summary = execMatch[0].slice(0, 500);
    const successMatch = content.match(/## 4\. Success Criteria[\s\S]*?\n---/);
    if (successMatch) result.success_criteria = successMatch[0].slice(0, 500);
  }

  if (designPath && fs.existsSync(designPath)) {
    const content = fs.readFileSync(designPath, 'utf8');
    const overviewMatch = content.match(/## 1\. Overview[\s\S]*?\n---/);
    if (overviewMatch) result.design_intent = overviewMatch[0].slice(0, 500);
  }

  return result;
}

/**
 * Load full upstream document chain for a given PDCA phase.
 * Each phase reads ALL upstream documents to minimize handoff context loss.
 *
 * Phase hierarchy: PRD → Plan → Design → Do → Analyze → Report
 *
 * @param {string} feature - Feature name
 * @param {string} currentPhase - Current PDCA phase (plan|design|do|analyze|report)
 * @returns {{ prd: UpstreamDoc|null, plan: UpstreamDoc|null, design: UpstreamDoc|null, decisions: Decision[], successCriteria: string[] }}
 */
async function loadFullUpstream(feature, currentPhase) {
  if (!feature) return { prd: null, plan: null, design: null, decisions: [], successCriteria: [] };
  const { findDoc } = getPaths();

  const phases = ['pm', 'plan', 'design'];
  const phaseIndex = { plan: 0, design: 1, do: 2, analyze: 2, report: 2 };
  const maxPhase = phaseIndex[currentPhase] ?? 2;

  const result = { prd: null, plan: null, design: null, decisions: [], successCriteria: [] };

  // Load PRD (upstream for all phases except pm itself)
  if (maxPhase >= 0) {
    const prdPath = findDoc('pm', feature);
    if (prdPath && fs.existsSync(prdPath)) {
      const content = fs.readFileSync(prdPath, 'utf8');
      result.prd = {
        path: prdPath,
        contextAnchor: extractSection(content, 'Context Anchor'),
        executiveSummary: extractSection(content, 'Executive Summary'),
        keyDecisions: extractDecisions(content, 'PRD'),
        whyContext: extractSection(content, 'JTBD') || extractSection(content, 'Value Proposition'),
      };
    }
  }

  // Load Plan (upstream for design, do, analyze, report)
  if (maxPhase >= 1) {
    const planPath = findDoc('plan', feature);
    if (planPath && fs.existsSync(planPath)) {
      const content = fs.readFileSync(planPath, 'utf8');
      result.plan = {
        path: planPath,
        contextAnchor: extractSection(content, 'Context Anchor'),
        executiveSummary: extractSection(content, 'Executive Summary'),
        successCriteria: extractSection(content, 'Success Criteria'),
        keyDecisions: extractDecisions(content, 'Plan'),
        requirements: extractSection(content, 'Requirements'),
      };
      result.successCriteria = extractSuccessCriteriaList(content);
    }
  }

  // Load Design (upstream for do, analyze, report)
  if (maxPhase >= 2) {
    const designPath = findDoc('design', feature);
    if (designPath && fs.existsSync(designPath)) {
      const content = fs.readFileSync(designPath, 'utf8');
      result.design = {
        path: designPath,
        contextAnchor: extractSection(content, 'Context Anchor'),
        architectureSelection: extractSection(content, 'Architecture Options') || extractSection(content, 'Architecture Comparison'),
        dataModel: extractSection(content, 'Data Model'),
        apiSpec: extractSection(content, 'API Specification'),
        keyDecisions: extractDecisions(content, 'Design'),
        implementationGuide: extractSection(content, 'Implementation Guide'),
      };
    }
  }

  // Aggregate all decisions across documents
  const allDecisions = [
    ...(result.prd?.keyDecisions || []),
    ...(result.plan?.keyDecisions || []),
    ...(result.design?.keyDecisions || []),
  ];
  result.decisions = allDecisions;

  return result;
}

/**
 * Extract a markdown section by heading name (## or ###).
 * Returns content up to the next heading of same or higher level, or --- separator.
 * @param {string} content - Full markdown content
 * @param {string} heading - Heading text to find (without ##)
 * @returns {string|null} Section content or null
 */
function extractSection(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^#{1,4}\\s+(?:\\d+\\.?\\d*\\s+)?${escaped}[\\s\\S]*?(?=\\n#{1,3}\\s|\\n---\\n|$)`, 'm');
  const match = content.match(regex);
  if (!match) return null;
  const text = match[0].trim();
  return text.length > 2000 ? text.slice(0, 2000) + '\n...(truncated)' : text;
}

/**
 * Extract key decisions from a PDCA document.
 * Looks for decision tables, architecture selections, and rationale patterns.
 * @param {string} content - Document content
 * @param {string} source - Source document type (PRD|Plan|Design)
 * @returns {Array<{ source: string, decision: string, rationale: string }>}
 */
function extractDecisions(content, source) {
  const decisions = [];

  // Pattern 1: "Selected: Option X — Rationale: ..."
  const selectedMatch = content.match(/\*\*Selected\*\*:\s*(.+?)(?:\n|$)/g);
  if (selectedMatch) {
    for (const m of selectedMatch) {
      const clean = m.replace(/\*\*/g, '').replace('Selected:', '').trim();
      const [decision, ...rationale] = clean.split(/[—\-]/);
      decisions.push({
        source,
        decision: decision.trim(),
        rationale: rationale.join('-').replace('Rationale:', '').trim(),
      });
    }
  }

  // Pattern 2: Architecture Decision table rows: | Decision | Options | Selected | Rationale |
  const tableRows = content.match(/\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*\{?selected\}?[^|]*\s*\|\s*[^|]+\s*\|/gi);
  if (tableRows) {
    for (const row of tableRows) {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 4 && !cols[0].match(/^[-\s]+$/) && cols[0] !== 'Decision') {
        decisions.push({
          source,
          decision: `${cols[0]}: ${cols[2]}`,
          rationale: cols[3],
        });
      }
    }
  }

  // Pattern 3: "Rationale: ..." standalone
  const rationaleMatches = content.match(/>\s*\*\*Rationale\*\*:\s*(.+?)(?:\n|$)/g);
  if (rationaleMatches) {
    for (const m of rationaleMatches) {
      decisions.push({
        source,
        decision: '(design rationale)',
        rationale: m.replace(/>\s*\*\*Rationale\*\*:\s*/, '').trim(),
      });
    }
  }

  return decisions;
}

/**
 * Extract Success Criteria as a checklist from Plan document.
 * @param {string} content - Plan document content
 * @returns {string[]} List of success criteria items
 */
function extractSuccessCriteriaList(content) {
  const section = extractSection(content, 'Success Criteria');
  if (!section) return [];
  const items = section.match(/- \[.\]\s*(.+?)(?:\n|$)/g);
  if (!items) return [];
  return items.map(item => item.replace(/- \[.\]\s*/, '').trim());
}

/**
 * Format upstream context as a compact summary for Claude Code injection.
 * @param {{ prd: object|null, plan: object|null, design: object|null, decisions: Array, successCriteria: string[] }} upstream
 * @returns {string} Formatted markdown
 */
function formatUpstreamSummary(upstream) {
  const parts = ['## Upstream Context Chain\n'];

  if (upstream.prd) {
    parts.push('### PRD Context');
    if (upstream.prd.executiveSummary) parts.push(upstream.prd.executiveSummary.slice(0, 500));
    if (upstream.prd.whyContext) parts.push(upstream.prd.whyContext.slice(0, 300));
    parts.push('');
  }

  if (upstream.plan) {
    parts.push('### Plan Context');
    if (upstream.plan.contextAnchor) parts.push(upstream.plan.contextAnchor);
    if (upstream.plan.successCriteria) parts.push(upstream.plan.successCriteria.slice(0, 500));
    parts.push('');
  }

  if (upstream.design) {
    parts.push('### Design Context');
    if (upstream.design.contextAnchor) parts.push(upstream.design.contextAnchor);
    if (upstream.design.architectureSelection) parts.push(upstream.design.architectureSelection.slice(0, 500));
    parts.push('');
  }

  if (upstream.decisions.length > 0) {
    parts.push('### Decision Record Chain');
    for (const d of upstream.decisions.slice(0, 15)) {
      parts.push(`- **[${d.source}]** ${d.decision}${d.rationale ? ` — ${d.rationale}` : ''}`);
    }
    parts.push('');
  }

  if (upstream.successCriteria.length > 0) {
    parts.push('### Success Criteria (from Plan)');
    for (const sc of upstream.successCriteria) {
      parts.push(`- [ ] ${sc}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Load full 4-layer context for a file path
 * @param {string} filePath - Source file path (absolute or relative)
 * @param {Object} options - { feature?: string }
 * @returns {ContextResult}
 */
async function loadContext(filePath, options = {}) {
  const [scenarios, invariants, impact, incidents, design] = await Promise.all([
    loadScenarios(filePath),
    loadInvariants(filePath),
    loadImpactMap(filePath),
    loadIncidents(filePath),
    loadDesignContext(options.feature || null),
  ]);

  const summary = formatContextSummary({ filePath, scenarios, invariants, impact, incidents, design });

  return {
    filePath,
    scenarios,
    invariants,
    impact,
    incidents,
    design,
    summary,
    hasContext: scenarios.length > 0 || invariants.length > 0 || (impact !== null) || incidents.length > 0,
  };
}

/**
 * Format context into a summary string for Claude Code injection
 */
function formatContextSummary({ filePath, scenarios, invariants, impact, incidents, design }) {
  const parts = [];
  parts.push(`## Living Context for: ${filePath}\n`);

  if (scenarios.length > 0) {
    parts.push(`### Scenarios (${scenarios.length})`);
    for (const s of scenarios) {
      parts.push(`- **${s.id}: ${s.name}**`);
      if (s.why) parts.push(`  WHY: ${s.why}`);
      if (s.constraint) parts.push(`  CONSTRAINT: ${s.constraint}`);
    }
    parts.push('');
  }

  if (invariants.length > 0) {
    parts.push(`### Invariants (${invariants.length})`);
    for (const inv of invariants) {
      const sev = inv.severity === 'critical' ? '[CRITICAL]' : '[WARNING]';
      parts.push(`- ${sev} **${inv.id}**: ${inv.rule}`);
    }
    parts.push('');
  }

  if (impact) {
    parts.push(`### Impact Analysis`);
    parts.push(`- Blast Radius: ${impact.blast_radius} files`);
    parts.push(`- Change Risk: ${impact.change_risk}`);
    if (impact.depended_by.length > 0) {
      parts.push(`- Affected Files: ${impact.depended_by.join(', ')}`);
    }
    parts.push('');
  }

  if (incidents.length > 0) {
    parts.push(`### Past Incidents (${incidents.length})`);
    for (const inc of incidents) {
      parts.push(`- **${inc.id}**: ${inc.error}`);
      parts.push(`  Root Cause: ${inc.root_cause}`);
      if (inc.anti_pattern) parts.push(`  ANTI-PATTERN: ${inc.anti_pattern}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

module.exports = {
  loadContext,
  loadScenarios,
  loadInvariants,
  loadImpactMap,
  loadIncidents,
  loadDesignContext,
  loadFullUpstream,
  formatContextSummary,
  formatUpstreamSummary,
  extractSection,
  extractDecisions,
  extractSuccessCriteriaList,
  parseYamlFile,
};
