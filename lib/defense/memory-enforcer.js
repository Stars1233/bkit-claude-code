'use strict';

/**
 * Memory Enforcer — PreToolUse deny-list extracted from CLAUDE.md directives.
 *
 * Closes the gap between CC's advisory CLAUDE.md handling (the model may
 * silently override instructions; see issues #56865, #57485, #58887 and the
 * 12+ R-3 evolved-form sightings) and bkit's enforced posture: directives
 * tagged "Do NOT", "NEVER", "FORBIDDEN", "MUST NOT" become deny-listed regex
 * patterns that PreToolUse hooks can match against tool calls and block
 * outright. This is bkit differentiation #1.
 *
 * Pure functions only — extraction and matching are deterministic. File IO
 * and audit emission live in the caller (hook script), keeping this module
 * trivially unit-testable and Domain-Layer friendly.
 *
 * @module lib/defense/memory-enforcer
 * @layer Defense
 * @version 2.1.14
 * @enh ENH-286 (Memory Enforcer — CC advisory → bkit enforced)
 * @differentiation #1
 */

const DIRECTIVE_RULES = Object.freeze([
  Object.freeze({ name: 'do-not', regex: /(?:^|\n)\s*[-*]?\s*(?:Do NOT|do not|don[''`]t)\b\s+([^\n]+)/gi, action: 'deny' }),
  Object.freeze({ name: 'never',  regex: /(?:^|\n)\s*[-*]?\s*NEVER\b\s+([^\n]+)/g,                       action: 'deny' }),
  Object.freeze({ name: 'must-not', regex: /(?:^|\n)\s*[-*]?\s*MUST NOT\b\s+([^\n]+)/g,                  action: 'deny' }),
  Object.freeze({ name: 'forbidden', regex: /(?:^|\n)\s*[-*]?\s*FORBIDDEN\b[:\s]\s*([^\n]+)/gi,          action: 'deny' }),
  Object.freeze({ name: 'avoid', regex: /(?:^|\n)\s*[-*]?\s*Avoid\b\s+([^\n]+)/g,                        action: 'warn' }),
]);

const MAX_DIRECTIVE_LENGTH = 240;
const MAX_DIRECTIVES = 200;

function cleanDirective(text) {
  if (typeof text !== 'string') return '';
  let t = text.trim();
  if (t.length === 0) return '';
  if (t.length > MAX_DIRECTIVE_LENGTH) t = t.slice(0, MAX_DIRECTIVE_LENGTH);
  // strip trailing markdown decorations
  t = t.replace(/\s*[\.,;:]+\s*$/, '').replace(/^\*+\s*/, '').trim();
  return t;
}

function escapeRegexMeta(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract enforceable directives from CLAUDE.md (or any markdown source).
 *
 * @param {string} markdown - full CLAUDE.md contents
 * @param {{source?: string}} [opts]
 * @returns {Array<{pattern: string, regex: RegExp, action: 'deny'|'warn', rule: string, text: string, source: string}>}
 */
function extractDirectives(markdown, opts) {
  if (typeof markdown !== 'string' || markdown.length === 0) return [];
  const source = (opts && opts.source) || 'CLAUDE.md';
  const seen = new Set();
  const out = [];
  for (const rule of DIRECTIVE_RULES) {
    const re = new RegExp(rule.regex.source, rule.regex.flags);
    let m;
    while ((m = re.exec(markdown)) !== null) {
      const text = cleanDirective(m[1]);
      if (text.length < 3) continue;
      if (seen.has(rule.name + '::' + text)) continue;
      seen.add(rule.name + '::' + text);
      out.push({
        pattern: text,
        regex: new RegExp(escapeRegexMeta(text), 'i'),
        action: rule.action,
        rule: rule.name,
        text,
        source,
      });
      if (out.length >= MAX_DIRECTIVES) return out;
    }
  }
  return out;
}

/**
 * Evaluate a tool call against a set of extracted directives.
 *
 * Tool call shape (subset bkit cares about):
 *   { tool: string, command?: string, file_path?: string, content?: string, args?: object }
 *
 * @param {object} toolCall
 * @param {Array} directives - output of extractDirectives()
 * @returns {{allowed: boolean, deniedBy: object | null, warnings: object[], matched: number}}
 */
function enforce(toolCall, directives) {
  if (!Array.isArray(directives) || directives.length === 0) {
    return { allowed: true, deniedBy: null, warnings: [], matched: 0 };
  }
  if (!toolCall || typeof toolCall !== 'object') {
    return { allowed: true, deniedBy: null, warnings: [], matched: 0 };
  }
  const haystackParts = [];
  if (typeof toolCall.command === 'string') haystackParts.push(toolCall.command);
  if (typeof toolCall.file_path === 'string') haystackParts.push(toolCall.file_path);
  if (typeof toolCall.content === 'string') haystackParts.push(toolCall.content);
  if (typeof toolCall.tool === 'string') haystackParts.push(toolCall.tool);
  if (toolCall.args && typeof toolCall.args === 'object') {
    for (const k of Object.keys(toolCall.args)) {
      const v = toolCall.args[k];
      if (typeof v === 'string') haystackParts.push(v);
    }
  }
  const haystack = haystackParts.join('\n');
  if (haystack.length === 0) {
    return { allowed: true, deniedBy: null, warnings: [], matched: 0 };
  }
  const warnings = [];
  let matched = 0;
  for (const d of directives) {
    if (!d || !(d.regex instanceof RegExp)) continue;
    if (d.regex.test(haystack)) {
      matched += 1;
      if (d.action === 'deny') {
        return { allowed: false, deniedBy: d, warnings, matched };
      }
      warnings.push(d);
    }
  }
  return { allowed: true, deniedBy: null, warnings, matched };
}

/**
 * Build a stable serializable form for caching to .bkit/runtime/memory-directives.json.
 *
 * @param {Array} directives
 * @returns {{version: string, count: number, items: Array<{pattern: string, action: string, rule: string, source: string}>}}
 */
function serializeDirectives(directives) {
  const items = (Array.isArray(directives) ? directives : []).map((d) => ({
    pattern: d.pattern,
    action: d.action,
    rule: d.rule,
    source: d.source,
  }));
  return { version: '2.1.14', count: items.length, items };
}

/**
 * Inverse of serializeDirectives — rehydrate live RegExp objects from cache.
 *
 * @param {{items?: Array}} payload
 * @returns {Array}
 */
function deserializeDirectives(payload) {
  if (!payload || !Array.isArray(payload.items)) return [];
  const out = [];
  for (const item of payload.items) {
    if (!item || typeof item.pattern !== 'string') continue;
    out.push({
      pattern: item.pattern,
      regex: new RegExp(escapeRegexMeta(item.pattern), 'i'),
      action: item.action === 'warn' ? 'warn' : 'deny',
      rule: item.rule || 'unknown',
      text: item.pattern,
      source: item.source || 'cache',
    });
  }
  return out;
}

module.exports = {
  DIRECTIVE_RULES,
  MAX_DIRECTIVE_LENGTH,
  MAX_DIRECTIVES,
  extractDirectives,
  enforce,
  serializeDirectives,
  deserializeDirectives,
};
