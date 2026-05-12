'use strict';

/**
 * sprint-memory-writer.js — Auto-append Sprint archive entries to MEMORY.md
 * (v2.1.13 Sprint 5 V#4, user-mandated 3 — memory orthogonal coexistence).
 *
 * Resolves Claude Code user-scope MEMORY.md path from projectRoot, appends
 * a single-line index entry under "## Sprint History" section. Creates the
 * section if absent. Idempotent — duplicate sprint IDs not appended twice.
 *
 * Path resolution:
 *   ~/.claude/projects/<encoded-projectRoot>/memory/MEMORY.md
 *   where encoded = projectRoot with '/' replaced by '-'
 *
 * Design philosophy: Non-invasive — does NOT modify hooks/hooks.json or
 * lib/application/sprint-lifecycle/ (Sprint 5 Plan §R8 invariant). Called
 * from scripts/sprint-handler.js handleArchive after successful state save.
 *
 * Failure mode: best-effort. If MEMORY.md cannot be written (path missing,
 * permission denied, etc.), returns { ok: false, reason } but does NOT
 * throw — sprint archive operation itself succeeds.
 *
 * @module scripts/sprint-memory-writer
 * @version 2.1.13
 * @since 2.1.13
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const SPRINT_HISTORY_SECTION = '## Sprint History (auto-appended)';
const SECTION_PATTERN = /^## Sprint History \(auto-appended\)/m;

/**
 * Resolve the MEMORY.md path for a given project root.
 * Encoding follows Claude Code convention: '/' → '-'.
 *
 * @param {string} projectRoot - absolute path
 * @returns {string} absolute path to MEMORY.md
 */
function resolveMemoryPath(projectRoot) {
  if (typeof projectRoot !== 'string' || projectRoot.length === 0) {
    throw new TypeError('resolveMemoryPath: projectRoot must be a non-empty string');
  }
  const encoded = projectRoot.replace(/\//g, '-');
  return path.join(os.homedir(), '.claude', 'projects', encoded, 'memory', 'MEMORY.md');
}

/**
 * Build the sprint history entry line.
 *
 * @param {object} sprint - archived Sprint entity
 * @returns {string} markdown line
 */
function formatEntry(sprint) {
  const id = sprint && sprint.id ? sprint.id : 'unknown';
  const name = sprint && sprint.name ? sprint.name : '';
  const archivedAt = sprint && sprint.archivedAt ? sprint.archivedAt : new Date().toISOString();
  const features = sprint && Array.isArray(sprint.features) ? sprint.features.length : 0;
  const kpi = sprint && sprint.kpi ? sprint.kpi : {};
  const matchRate = (kpi.finalMatchRate !== undefined && kpi.finalMatchRate !== null)
    ? kpi.finalMatchRate
    : 'n/a';
  const iter = (kpi.iterations !== undefined && kpi.iterations !== null)
    ? kpi.iterations
    : 0;
  return '- `' + id + '` — ' + name + ' · archived ' + archivedAt
    + ' · ' + features + ' feature(s) · matchRate ' + matchRate + ' · ' + iter + ' iterations';
}

/**
 * Append a sprint archive entry to MEMORY.md. Idempotent — entry for the
 * same sprint id is not appended twice.
 *
 * @param {object} sprint - archived Sprint entity
 * @param {{ projectRoot?: string }} [opts]
 * @returns {Promise<{ ok: boolean, reason?: string, appended?: boolean, path?: string }>}
 */
async function appendSprintToMemory(sprint, opts) {
  if (!sprint || typeof sprint.id !== 'string') {
    return { ok: false, reason: 'invalid_sprint' };
  }
  const projectRoot = (opts && opts.projectRoot) || process.cwd();
  const memoryPath = resolveMemoryPath(projectRoot);

  // 1. Check file exists (Claude Code must have created it on first session)
  if (!fs.existsSync(memoryPath)) {
    return { ok: false, reason: 'memory_file_absent', path: memoryPath };
  }

  // 2. Read current content
  let content;
  try {
    content = fs.readFileSync(memoryPath, 'utf8');
  } catch (e) {
    return { ok: false, reason: 'read_failed: ' + e.message };
  }

  // 3. Idempotency check — sprint id already logged?
  const sprintMarker = '`' + sprint.id + '`';
  if (content.includes(sprintMarker)) {
    return { ok: true, appended: false, reason: 'already_logged', path: memoryPath };
  }

  // 4. Build new content
  const entry = formatEntry(sprint);
  let newContent;
  if (SECTION_PATTERN.test(content)) {
    // Append to existing section (insert after section heading)
    newContent = content.replace(
      SECTION_PATTERN,
      SPRINT_HISTORY_SECTION + '\n' + entry,
    );
  } else {
    // Create new section at end
    const trailing = content.endsWith('\n') ? '' : '\n';
    newContent = content + trailing + '\n' + SPRINT_HISTORY_SECTION + '\n' + entry + '\n';
  }

  // 5. Atomic write (tmp + rename)
  const tmp = memoryPath + '.tmp.' + Date.now();
  try {
    fs.writeFileSync(tmp, newContent, 'utf8');
    fs.renameSync(tmp, memoryPath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (_e) { /* ignore */ }
    return { ok: false, reason: 'write_failed: ' + e.message };
  }

  return { ok: true, appended: true, path: memoryPath, entry: entry };
}

module.exports = {
  appendSprintToMemory: appendSprintToMemory,
  resolveMemoryPath: resolveMemoryPath,
  formatEntry: formatEntry,
};
