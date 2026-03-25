/**
 * Decision Record Chain — PRD→Code context penetration
 * @module lib/pdca/decision-record
 * @version 1.0.0
 *
 * Extracts key decisions from PDCA documents and creates a unified
 * Decision Record Chain that propagates from PRD through to code.
 */

const fs = require('fs');
const path = require('path');

let _paths = null;
function getPaths() {
  if (!_paths) { _paths = require('../core/paths'); }
  return _paths;
}

let _contextLoader = null;
function getContextLoader() {
  if (!_contextLoader) { _contextLoader = require('../context/context-loader'); }
  return _contextLoader;
}

/**
 * Build a complete Decision Record Chain for a feature.
 * Aggregates decisions from PRD → Plan → Design into a single chain.
 *
 * @param {string} feature - Feature name
 * @returns {{ chain: Decision[], summary: string, commitPrefix: string }}
 */
function buildDecisionChain(feature) {
  const { loadFullUpstream } = getContextLoader();

  // loadFullUpstream is async but we need sync — use the extracted functions directly
  const { findDoc } = getPaths();
  const { extractDecisions } = getContextLoader();

  const chain = [];

  // PRD decisions
  const prdPath = findDoc('pm', feature);
  if (prdPath && fs.existsSync(prdPath)) {
    const content = fs.readFileSync(prdPath, 'utf8');
    chain.push(...extractDecisions(content, 'PRD'));
  }

  // Plan decisions
  const planPath = findDoc('plan', feature);
  if (planPath && fs.existsSync(planPath)) {
    const content = fs.readFileSync(planPath, 'utf8');
    chain.push(...extractDecisions(content, 'Plan'));
  }

  // Design decisions
  const designPath = findDoc('design', feature);
  if (designPath && fs.existsSync(designPath)) {
    const content = fs.readFileSync(designPath, 'utf8');
    chain.push(...extractDecisions(content, 'Design'));
  }

  const summary = formatDecisionChain(chain);
  const commitPrefix = generateCommitPrefix(feature, chain);

  return { chain, summary, commitPrefix };
}

/**
 * Format Decision Record Chain as markdown for document embedding.
 * @param {Array<{ source: string, decision: string, rationale: string }>} chain
 * @returns {string} Markdown formatted chain
 */
function formatDecisionChain(chain) {
  if (chain.length === 0) return '> No decisions extracted from upstream documents.';

  const lines = [
    '### Decision Record Chain',
    '',
    '> Key decisions from PRD→Plan→Design that guide implementation.',
    '',
    '| # | Source | Decision | Rationale |',
    '|---|--------|----------|-----------|',
  ];

  chain.forEach((d, i) => {
    lines.push(`| ${i + 1} | [${d.source}] | ${d.decision} | ${d.rationale || 'N/A'} |`);
  });

  return lines.join('\n');
}

/**
 * Generate a PDCA-aware commit message prefix.
 * Format: feat(feature): [Plan:FR-01] [Design:§3.1]
 *
 * @param {string} feature - Feature name
 * @param {Array} chain - Decision chain (optional, for context)
 * @returns {string} Commit prefix template
 */
function generateCommitPrefix(feature, chain = []) {
  return `feat(${feature})`;
}

/**
 * Generate a full PDCA-aware commit message.
 *
 * @param {string} feature - Feature name
 * @param {string} description - What was done
 * @param {Object} refs - { planRefs: string[], designRefs: string[], successCriteria: string[] }
 * @returns {string} Full commit message
 */
function generateCommitMessage(feature, description, refs = {}) {
  const parts = [`feat(${feature}): ${description}`];

  const refTags = [];
  if (refs.planRefs && refs.planRefs.length > 0) {
    refTags.push(...refs.planRefs.map(r => `[Plan:${r}]`));
  }
  if (refs.designRefs && refs.designRefs.length > 0) {
    refTags.push(...refs.designRefs.map(r => `[Design:${r}]`));
  }
  if (refTags.length > 0) {
    parts[0] += ' ' + refTags.join(' ');
  }

  // Add PDCA context in commit body
  const body = [];
  if (refs.successCriteria && refs.successCriteria.length > 0) {
    body.push('');
    body.push('Success Criteria addressed:');
    refs.successCriteria.forEach(sc => body.push(`- ${sc}`));
  }

  if (refs.planRefs && refs.planRefs.length > 0) {
    body.push('');
    body.push(`Plan: docs/01-plan/features/${feature}.plan.md`);
  }
  if (refs.designRefs && refs.designRefs.length > 0) {
    body.push(`Design: docs/02-design/features/${feature}.design.md`);
  }

  return parts.concat(body).join('\n');
}

/**
 * Generate code comment templates for Design references.
 *
 * @param {string} feature - Feature name
 * @param {string} designSection - Design section number (e.g., "3.1")
 * @param {string} summary - Brief decision summary
 * @returns {string} Code comment
 */
function generateDesignRef(feature, designSection, summary) {
  return `// Design Ref: §${designSection} — ${summary}`;
}

/**
 * Generate code comment for Success Criteria tracking.
 *
 * @param {string} criteria - Success criteria text
 * @returns {string} Code comment
 */
function generateSuccessCriteriaRef(criteria) {
  return `// Plan SC: ${criteria}`;
}

module.exports = {
  buildDecisionChain,
  formatDecisionChain,
  generateCommitPrefix,
  generateCommitMessage,
  generateDesignRef,
  generateSuccessCriteriaRef,
};
