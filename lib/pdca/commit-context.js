/**
 * Commit Context — PDCA-aware commit message generation
 * @module lib/pdca/commit-context
 * @version 1.0.0
 *
 * Generates commit messages that reference PDCA documents,
 * creating traceable links from git history to design decisions.
 */

const fs = require('fs');

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
 * Analyze implementation changes and generate a PDCA-aware commit message.
 *
 * @param {string} feature - Feature name
 * @param {string[]} changedFiles - List of changed file paths
 * @param {string} description - Human-readable description of changes
 * @returns {{ message: string, refs: Object }}
 */
function generateContextualCommit(feature, changedFiles, description) {
  const { findDoc } = getPaths();
  const { extractSuccessCriteriaList, extractSection } = getContextLoader();

  const refs = {
    planRefs: [],
    designRefs: [],
    successCriteria: [],
    prdRef: false,
  };

  // Check which PDCA documents exist
  const prdPath = findDoc('pm', feature);
  const planPath = findDoc('plan', feature);
  const designPath = findDoc('design', feature);

  if (prdPath) refs.prdRef = true;

  // Extract relevant Plan references
  if (planPath && fs.existsSync(planPath)) {
    const planContent = fs.readFileSync(planPath, 'utf8');

    // Match changed files to Functional Requirements
    const frMatches = planContent.match(/\|\s*(FR-\d+)\s*\|/g);
    if (frMatches) {
      refs.planRefs = [...new Set(frMatches.map(m => m.match(/FR-\d+/)[0]))].slice(0, 3);
    }

    // Extract success criteria for reference
    refs.successCriteria = extractSuccessCriteriaList(planContent).slice(0, 3);
  }

  // Extract relevant Design section references
  if (designPath && fs.existsSync(designPath)) {
    const designContent = fs.readFileSync(designPath, 'utf8');

    // Detect which Design sections are affected by changed files
    for (const file of changedFiles) {
      if (file.match(/types?\.(ts|js)|model|entity|schema/i)) {
        refs.designRefs.push('§3-DataModel');
      } else if (file.match(/api|route|endpoint/i)) {
        refs.designRefs.push('§4-API');
      } else if (file.match(/component|page|layout|ui/i)) {
        refs.designRefs.push('§5-UI');
      } else if (file.match(/service|hook|store|state/i)) {
        refs.designRefs.push('§9-Architecture');
      }
    }
    refs.designRefs = [...new Set(refs.designRefs)].slice(0, 3);
  }

  // Build commit message
  const tagParts = [];
  if (refs.planRefs.length > 0) tagParts.push(refs.planRefs.map(r => `[${r}]`).join(''));
  if (refs.designRefs.length > 0) tagParts.push(refs.designRefs.map(r => `[${r}]`).join(''));

  const subject = `feat(${feature}): ${description}${tagParts.length > 0 ? ' ' + tagParts.join(' ') : ''}`;

  const bodyParts = [];
  if (refs.successCriteria.length > 0) {
    bodyParts.push('', 'Success Criteria addressed:');
    refs.successCriteria.forEach(sc => bodyParts.push(`- ${sc}`));
  }

  bodyParts.push('', 'PDCA References:');
  if (refs.prdRef) bodyParts.push(`- PRD: docs/00-pm/${feature}.prd.md`);
  if (planPath) bodyParts.push(`- Plan: docs/01-plan/features/${feature}.plan.md`);
  if (designPath) bodyParts.push(`- Design: docs/02-design/features/${feature}.design.md`);

  const message = [subject, ...bodyParts].join('\n');

  return { message, refs };
}

/**
 * Generate a short PDCA reference tag for inline use.
 *
 * @param {string} feature - Feature name
 * @returns {string} Short reference tag (e.g., "[relo:Plan+Design]")
 */
function shortRef(feature) {
  const { findDoc } = getPaths();
  const docs = [];
  if (findDoc('pm', feature)) docs.push('PRD');
  if (findDoc('plan', feature)) docs.push('Plan');
  if (findDoc('design', feature)) docs.push('Design');
  return docs.length > 0 ? `[${feature}:${docs.join('+')}]` : `[${feature}]`;
}

module.exports = {
  generateContextualCommit,
  shortRef,
};
