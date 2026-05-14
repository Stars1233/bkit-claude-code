#!/usr/bin/env node
'use strict';

/**
 * Skill frontmatter description-length CI gate (ENH-291 P2).
 *
 * Verifies every skills/<name>/SKILL.md `description` field fits inside the
 * Claude Code skill-validator cap. The CC limit is documented in issue
 * #56448 (CC v2.1.129) as 1536 characters when descriptions are measured
 * as multi-line concatenations (the validator joins continuation lines).
 *
 * Earlier bkit memory entries used a conservative 250-char baseline; that
 * value was over-engineered and never tied to a real CC failure. Switching
 * to the documented 1536-char limit removes the false alarm while still
 * catching genuinely runaway descriptions before they reach CC.
 *
 * Exit codes:
 *   0  — all skills within limit
 *   1  — one or more skills exceed limit (or malformed frontmatter)
 *
 * @module scripts/check-skill-frontmatter
 * @version 2.1.14
 * @enh ENH-291 (Skill validator 1536-char correction)
 */

const fs = require('fs');
const path = require('path');

const SKILL_DESCRIPTION_CAP = 1536;
const SKILLS_DIR = path.resolve(__dirname, '..', 'skills');

/**
 * Extract the description field from a SKILL.md frontmatter block.
 * Supports both single-line `description: text` and YAML-block scalars
 * (`description: |` or `description: >`) that concatenate continuation
 * lines until the next top-level key.
 *
 * @param {string} src - full SKILL.md content
 * @returns {{description: string, mode: 'single'|'block'|'missing', startLine: number}}
 */
function extractDescription(src) {
  const lines = src.split(/\r?\n/);
  // skip optional leading frontmatter fence
  let inFrontmatter = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && /^---\s*$/.test(line)) {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter && /^---\s*$/.test(line)) {
      break;
    }
    const m = /^description:\s*(\|[+-]?|>[+-]?)?\s*(.*)$/.exec(line);
    if (m) {
      const indicator = m[1] || '';
      const firstRest = m[2] || '';
      if (indicator) {
        // Block scalar — collect continuation lines until next top-level key
        const parts = firstRest ? [firstRest] : [];
        for (let j = i + 1; j < lines.length; j++) {
          const ln = lines[j];
          if (/^---\s*$/.test(ln)) break;
          if (/^[A-Za-z_][A-Za-z0-9_-]*:\s*/.test(ln)) break;
          parts.push(ln.replace(/^[ \t]{0,4}/, ''));
        }
        return { description: parts.join('\n').trim(), mode: 'block', startLine: i + 1 };
      }
      return { description: firstRest.trim(), mode: 'single', startLine: i + 1 };
    }
  }
  return { description: '', mode: 'missing', startLine: -1 };
}

function* walkSkills(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(dir, entry.name, 'SKILL.md');
    if (fs.existsSync(skillFile)) yield { name: entry.name, file: skillFile };
  }
}

function main() {
  const violations = [];
  const overview = [];
  let total = 0;

  for (const { name, file } of walkSkills(SKILLS_DIR)) {
    total += 1;
    const src = fs.readFileSync(file, 'utf8');
    const { description, mode, startLine } = extractDescription(src);
    overview.push({ name, len: description.length, mode });
    if (mode === 'missing') {
      violations.push({ name, len: 0, reason: 'description field missing', startLine });
      continue;
    }
    if (description.length > SKILL_DESCRIPTION_CAP) {
      violations.push({
        name,
        len: description.length,
        reason: `description ${description.length} chars exceeds cap ${SKILL_DESCRIPTION_CAP} (#56448)`,
        startLine,
      });
    }
  }

  if (process.env.BKIT_SKILL_REPORT === '1') {
    overview.sort((a, b) => b.len - a.len);
    console.log('Skill description lengths (multi-line concat):');
    for (const o of overview) {
      const flag = o.len > SKILL_DESCRIPTION_CAP ? ' OVER' : '';
      console.log('  ' + o.name.padEnd(30) + ' ' + String(o.len).padStart(5) + ' chars' + flag);
    }
  }

  if (violations.length > 0) {
    console.error('Skill frontmatter cap violations (' + violations.length + '):');
    for (const v of violations) {
      console.error('  - ' + v.name + ': ' + v.reason);
    }
    console.error('\nCap: ' + SKILL_DESCRIPTION_CAP + ' chars (CC #56448 validator).');
    process.exit(1);
  }

  console.log('Skill frontmatter OK — ' + total + ' skills, all under ' + SKILL_DESCRIPTION_CAP + '-char cap.');
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  SKILL_DESCRIPTION_CAP,
  extractDescription,
  walkSkills,
};
