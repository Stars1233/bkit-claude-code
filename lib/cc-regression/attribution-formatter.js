/**
 * Attribution Formatter — pretty-print regression attribution messages.
 *
 * Design Ref: bkit-v2110-integrated-enhancement.design.md §3.2.5
 * Plan SC: Invocation Contract unchanged — text only, no decision change.
 *
 * @module lib/cc-regression/attribution-formatter
 */

// v2.1.10: Extended from 4 to 6 patterns to align with audit-logger SENSITIVE_KEY_PATTERNS.
const REDACT_PATTERNS = [
  /password\s*=\s*\S+/gi,
  /token\s*=\s*\S+/gi,
  /api[_-]?key\s*=\s*\S+/gi,
  /authorization:\s*\S+/gi,
  /cookie:\s*\S+/gi,
  /[a-z_]*secret\s*=\s*\S+/gi,
];

/**
 * Redact sensitive tokens from free-form text.
 * @param {string} text
 * @returns {string}
 */
function redact(text) {
  if (typeof text !== 'string') return '';
  let out = text;
  for (const re of REDACT_PATTERNS) out = out.replace(re, '[REDACTED]');
  return out;
}

/**
 * Format a regression attribution line for stderr/audit.
 *
 * @param {{ id: string, severity: string, note: string, ccIssue?: string }} meta
 * @returns {string}
 */
function formatAttribution(meta) {
  if (!meta || !meta.id) return '';
  const sev = meta.severity ? `[${meta.severity}]` : '';
  const link = meta.ccIssue ? ` (${meta.ccIssue})` : '';
  return `[bkit:${meta.id}] ${sev} ${redact(meta.note || '')}${link}`.replace(/\s+/g, ' ').trim();
}

module.exports = { formatAttribution, redact, REDACT_PATTERNS };
