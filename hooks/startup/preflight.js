/**
 * preflight.js — SessionStart preflight checks (FR-α4 + FR-α5)
 *
 * Two warnings rendered into additionalContext, in order:
 *   1. Agent Teams env (FR-α4): warns when CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS != "1"
 *   2. CC version (FR-α5):     warns when current CC < recommended (or < min)
 *
 * Fail-open: any internal error returns an empty section. The hook never blocks
 * the user's session because of preflight checks.
 *
 * @module hooks/startup/preflight
 * @version 2.1.11
 * @since 2.1.11
 */

const { debugLog } = require('../../lib/core/debug');

const AGENT_TEAMS_ENV = 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS';

/**
 * Inspect the Agent Teams env var.
 *
 * @returns {{active: boolean, warning: string | null}}
 */
function checkAgentTeamsEnv() {
  const active = process.env[AGENT_TEAMS_ENV] === '1';
  if (active) return { active: true, warning: null };
  return {
    active: false,
    warning: `Agent Teams inactive — set ${AGENT_TEAMS_ENV}=1 to enable cto-lead / pm-lead / qa-lead orchestration.`,
  };
}

/**
 * Render a CC version-check report into a single human-readable warning string,
 * or null when no warning should surface.
 *
 * @param {object} report from cc-version-checker.checkCCVersion()
 * @returns {string | null}
 */
function renderCCVersionWarning(report) {
  if (!report || report.skipped) return null;
  if (!report.current) return null;
  if (report.severity === 'ok') return null;

  const featureList = (report.inactive || []).join(', ') || 'none';
  if (report.severity === 'error') {
    return `CC v${report.min}+ required — current v${report.current}. Inactive features: ${featureList}.`;
  }
  return `CC v${report.recommended}+ recommended — current v${report.current}. Inactive features: ${featureList}.`;
}

/**
 * Run all preflight checks and return a single ready-to-prepend section, or
 * an empty string when nothing needs to be surfaced.
 *
 * @returns {string} additionalContext fragment (may be empty)
 */
function run() {
  const lines = [];

  try {
    const teams = checkAgentTeamsEnv();
    if (teams.warning) lines.push(`⚠️ ${teams.warning}`);
  } catch (e) {
    debugLog('SessionStart', 'preflight Agent Teams check failed', { error: e.message });
  }

  try {
    const { checkCCVersion } = require('../../lib/infra/cc-version-checker');
    const warning = renderCCVersionWarning(checkCCVersion());
    if (warning) lines.push(`⚠️ ${warning}`);
  } catch (e) {
    debugLog('SessionStart', 'preflight CC version check failed', { error: e.message });
  }

  if (lines.length === 0) return '';
  return ['', '## Preflight', ...lines, ''].join('\n');
}

module.exports = {
  run,
  checkAgentTeamsEnv,
  renderCCVersionWarning,
  AGENT_TEAMS_ENV,
};
