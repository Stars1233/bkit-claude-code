/**
 * HeredocDetector — Defense Layer pure-fn detector for heredoc-pipe permission bypass.
 *
 * Design Ref: docs/sprint/v2114/design.md §3.3
 * Plan SC: ENH-310 Heredoc Pipe Bypass Defense.
 * Differentiation: bkit moat #6 — CC permission system regression self-defense.
 *
 * Background:
 *   CC #58904 (regression of #48518, present v2.1.73 through v2.1.141, ~68
 *   unfixed versions) lets a Bash command of the form
 *
 *     cat <<'EOF' | bash
 *     rm -rf /
 *     EOF
 *
 *   bypass CC's permission system: CC inspects only the outer `cat` token,
 *   never the heredoc body or its pipe-target. bkit's PreToolUse defense
 *   stack inherited the same blind spot — `scripts/unified-bash-pre.js`
 *   substring patterns and `lib/control/destructive-detector.js` G-001~G-011
 *   evaluate only top-level argv. This module closes that gap.
 *
 * Responsibility:
 *   detect(command) inspects an entire Bash command string for the
 *   `heredoc + (command-substitution | pipe-to-shell | eval/source)`
 *   combination that defines the bypass. It returns a structured verdict
 *   so the calling hook can emit a deterministic deny with safe-alternative
 *   suggestions via `outputBlockWithContext`.
 *
 * Design invariants:
 *   1) Pure function — no fs, child_process, http, network, env reads.
 *      Domain-grade purity even though this lives in Defense Layer.
 *   2) Conservative false-positive policy: lone `<<` heredoc returns
 *      severity='warning' (audit-only, allow), never 'critical'. Only the
 *      combination with `$(`, backtick, or pipe-to-shell promotes to
 *      severity='critical' (deny).
 *   3) 30+ patterns categorized by attack vector (sub / pipe-shell /
 *      eval-source / sudo). PATTERNS array is Object.freeze'd so callers
 *      cannot mutate the policy at runtime.
 *   4) Deterministic ordering: critical patterns are evaluated before
 *      warning patterns, then short-circuit on first critical match.
 *
 * Calling site (Step 6, scripts/unified-bash-pre.js):
 *   const { detect } = require('../lib/defense/heredoc-detector');
 *   const verdict = detect(command);
 *   if (verdict.matched && verdict.severity === 'critical') {
 *     outputBlockWithContext(verdict.reason, {
 *       additionalContext: verdict.alternatives.join('\n'),
 *     }, 'PreToolUse');
 *   }
 *
 * @module lib/defense/heredoc-detector
 * @version 2.1.14
 * @since 2.1.14
 * @layer Defense
 * @enh ENH-310
 * @differentiation #6
 */

'use strict';

/**
 * @typedef {'critical'|'warning'|null} Severity
 *   critical — heredoc COMBINED with a payload-execution vector. Hook MUST deny.
 *   warning  — heredoc present but no execution vector detected. Hook MAY allow + audit.
 *   null     — no heredoc detected; out of scope for this detector.
 */

/**
 * @typedef {Object} HeredocVerdict
 * @property {boolean} matched         — true when at least one pattern matched
 * @property {Severity} severity       — see Severity typedef
 * @property {string|null} pattern     — regex source string of the matched pattern (debugging)
 * @property {string|null} vector      — semantic vector: 'sub'|'pipe-shell'|'eval-source'|'sudo'|'lone-heredoc'|null
 * @property {string} reason           — human-readable explanation (for hook deny message)
 * @property {string[]} alternatives   — safe alternative suggestions for the user/model
 */

/**
 * Critical patterns: heredoc combined with payload-execution vector.
 *
 * Conservative regex design: each pattern requires the explicit
 * `<<` (heredoc start) AND an unambiguous execution token. Single
 * tokens (e.g. lone `$(`) never produce critical here — that is
 * destructive-detector territory.
 *
 * Pattern source strings are kept on each entry so the verdict can
 * report which pattern matched (debug + audit-log richness).
 */
const CRITICAL_PATTERNS = Object.freeze([
  // -------- vector: 'sub' (heredoc inside $() command substitution) --------
  {
    vector: 'sub',
    re: /\$\(\s*[\w./-]*\s*<<-?\s*['"]?\w+['"]?[\s\S]*?\)/,
    description: '$(cmd <<TAG ... TAG)  — heredoc inside $() substitution',
  },
  {
    vector: 'sub',
    re: /`\s*[\w./-]*\s*<<-?\s*['"]?\w+['"]?[\s\S]*?`/,
    description: '`cmd <<TAG ... TAG`  — heredoc inside backtick substitution',
  },
  {
    vector: 'sub',
    re: /\$\(\s*cat\s+<<-?\s*['"]?\w+['"]?/,
    description: '$(cat <<TAG …)  — bypass via cat heredoc + substitution',
  },
  {
    vector: 'sub',
    re: /`\s*cat\s+<<-?\s*['"]?\w+['"]?/,
    description: '`cat <<TAG …`  — bypass via cat heredoc + backtick',
  },

  // -------- vector: 'pipe-shell' (heredoc piped to interpreter) -----------
  {
    vector: 'pipe-shell',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\bbash\b/,
    description: 'heredoc | bash  — pipe to bash interpreter',
  },
  {
    vector: 'pipe-shell',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\bsh\b/,
    description: 'heredoc | sh   — pipe to POSIX sh',
  },
  {
    vector: 'pipe-shell',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\bzsh\b/,
    description: 'heredoc | zsh  — pipe to zsh',
  },
  {
    vector: 'pipe-shell',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\bksh\b/,
    description: 'heredoc | ksh  — pipe to ksh',
  },
  {
    vector: 'pipe-shell',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\bdash\b/,
    description: 'heredoc | dash — pipe to dash',
  },
  {
    vector: 'pipe-shell',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\bfish\b/,
    description: 'heredoc | fish — pipe to fish shell',
  },
  {
    vector: 'pipe-shell',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\bexec\b/,
    description: 'heredoc | exec — exec call replacing current process',
  },
  {
    vector: 'pipe-shell',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\benv\b/,
    description: 'heredoc | env  — env wrapper invoking interpreter',
  },

  // -------- vector: 'eval-source' (heredoc piped to eval/source/.) --------
  {
    vector: 'eval-source',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\beval\b/,
    description: 'heredoc | eval   — pipe to eval',
  },
  {
    vector: 'eval-source',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\bsource\b/,
    description: 'heredoc | source — pipe to source',
  },
  {
    vector: 'eval-source',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\.\s/,
    description: 'heredoc | . path — pipe to POSIX `.` (source)',
  },

  // -------- vector: 'sudo' (heredoc piped to sudo) ------------------------
  {
    vector: 'sudo',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\bsudo\b/,
    description: 'heredoc | sudo — escalated pipe',
  },
  {
    vector: 'sudo',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\bdoas\b/,
    description: 'heredoc | doas — OpenBSD escalated pipe',
  },

  // -------- vector: 'sub' with shell-as-arg ($(bash <<EOF …)) -------------
  {
    vector: 'sub',
    re: /\$\(\s*(?:bash|sh|zsh|ksh|dash|fish)\s+-c\s*['"]?<<-?\s*['"]?\w+['"]?/,
    description: '$(bash -c "<<TAG …") — substitution wrapping shell -c heredoc',
  },
  {
    vector: 'sub',
    re: /\$\(\s*(?:bash|sh|zsh|ksh|dash|fish)\s+<<-?\s*['"]?\w+['"]?/,
    description: '$(bash <<TAG …) — substitution wrapping shell heredoc',
  },

  // -------- vector: 'pipe-shell' (here-string + shell, less common variant)
  {
    vector: 'pipe-shell',
    re: /<<<\s*[\s\S]*?\|\s*\b(?:bash|sh|zsh|ksh|dash|fish|exec)\b/,
    description: 'here-string (<<<) | shell — variant of heredoc-pipe',
  },

  // -------- vector: 'pipe-shell' (heredoc → curl|bash anti-pattern) --------
  {
    vector: 'pipe-shell',
    re: /<<-?\s*['"]?\w+['"]?[\s\S]*?\|\s*\bxargs\b\s+(?:bash|sh|zsh|ksh|dash|fish|exec)\b/,
    description: 'heredoc | xargs (bash|sh|…)  — xargs-shell escalation',
  },
]);

/**
 * Warning patterns: heredoc present but no execution vector detected.
 * Returns severity='warning' (allow + audit). This list intentionally
 * captures only the heredoc-start surface so audit logs can attribute
 * the pattern without triggering false-positive denies.
 */
const WARNING_PATTERNS = Object.freeze([
  {
    vector: 'lone-heredoc',
    re: /<<-?\s*['"]?\w+['"]?/,
    description: '<<TAG — lone heredoc start (no exec vector detected)',
  },
  {
    vector: 'lone-heredoc',
    re: /<<<\s*\S/,
    description: '<<< — here-string (no exec vector detected)',
  },
]);

/** Safe alternatives to suggest when severity='critical'. */
const CRITICAL_ALTERNATIVES = Object.freeze([
  'Write the script to a file first, audit it, then run with explicit permission: bkit \'cat > script.sh && cat script.sh && bash script.sh\' (3 separate tool calls)',
  'Inline a single safe command without heredoc: e.g. `echo "..." | grep foo` instead of `<<EOF … EOF | bash`',
  'Use bkit checkpoint + manual review: /pdca checkpoint create  → review the planned changes → confirm before executing',
]);

/** Safe alternatives to suggest when severity='warning'. */
const WARNING_ALTERNATIVES = Object.freeze([
  'Heredoc usage is acceptable for static input (e.g. SQL, JSON, plain text). Verify no `$(`/backtick/pipe-to-shell follows the heredoc.',
]);

/**
 * Detect heredoc-pipe bypass attempt in a Bash command string.
 *
 * Pure function — same input always returns the same verdict. No IO.
 * Returns a structured verdict; callers (hooks) own the decision to
 * deny / allow / audit.
 *
 * @param {string|unknown} command
 * @returns {HeredocVerdict}
 */
function detect(command) {
  if (typeof command !== 'string' || command.length === 0) {
    return emptyVerdict();
  }

  // Strip escaped sequences that should not count toward matching:
  //   \$\( and \` are escaped substitutions — treat as inert.
  //   \\<< is an escaped heredoc start — treat as inert.
  const stripped = command
    .replace(/\\\$\(/g, '__BKIT_ESCAPED_DOLLAR_PAREN__')
    .replace(/\\`/g, '__BKIT_ESCAPED_BACKTICK__')
    .replace(/\\<</g, '__BKIT_ESCAPED_HEREDOC__');

  // Evaluate critical patterns first; short-circuit on first hit.
  for (const p of CRITICAL_PATTERNS) {
    if (p.re.test(stripped)) {
      return {
        matched: true,
        severity: 'critical',
        pattern: p.re.source,
        vector: p.vector,
        reason: `bkit ENH-310 heredoc-bypass guard: ${p.description}`,
        alternatives: CRITICAL_ALTERNATIVES.slice(),
      };
    }
  }

  // Then warning patterns (heredoc present but no exec vector).
  for (const p of WARNING_PATTERNS) {
    if (p.re.test(stripped)) {
      return {
        matched: true,
        severity: 'warning',
        pattern: p.re.source,
        vector: p.vector,
        reason: `bkit ENH-310 heredoc audit: ${p.description}`,
        alternatives: WARNING_ALTERNATIVES.slice(),
      };
    }
  }

  return emptyVerdict();
}

function emptyVerdict() {
  return {
    matched: false,
    severity: null,
    pattern: null,
    vector: null,
    reason: '',
    alternatives: [],
  };
}

module.exports = {
  detect,
  // Exposed for contract tests + observability — DO NOT mutate at runtime
  // (Object.freeze enforces immutability; mutation in non-strict mode is silent,
  // in strict mode throws).
  CRITICAL_PATTERNS,
  WARNING_PATTERNS,
  CRITICAL_ALTERNATIVES,
  WARNING_ALTERNATIVES,
};
