---
number: 0006
title: CC Version Upgrade Policy — Selective Adoption Criteria
status: Accepted
date: 2026-04-28
deciders: kay kim (POPUP STUDIO PTE. LTD.)
consulted: cc-version-researcher agent, bkit-impact-analyst agent
informed: bkit contributors
trigger: v2.1.115 selective skip + 79 consecutive compatible release tracking discipline
related:
  - design: docs/02-design/features/bkit-v2111-sprint-delta.design.md §FR-δ5
  - history: cc_version_history_v21xx.md (v2.1.73 ~ v2.1.116)
  - history: cc_version_history_v2117_v2119.md (empirical reissue post-Sprint ε)
  - history: cc_version_history_v2120.md (ADR 0003 first formal application)
  - history: cc_version_history_v2121.md (ADR 0003 second application)
  - precedent: docs/adr/0003-cc-version-impact-empirical-validation.md
supersedes: (none)
superseded-by: (none)
---

# ADR 0006 — CC Version Upgrade Policy

## Status

**Accepted** (2026-04-28) — Codifies the selective-adoption discipline
that v2.1.115 skip established. Effective immediately for all CC
version reviews going forward.

## Context

Between v2.1.34 and v2.1.121, bkit tracked **79 consecutive compatible
releases**. One release in that window — **v2.1.115** — was skipped
based on a documented decision; the others were either auto-benefit,
no-impact, or required defensive bkit code changes.

The community-observable record (release tags, GitHub issues,
changelog notes) is incomplete: rationale for skipping v2.1.115 lived
in conversation context. Without an ADR, future maintainers facing
similar decisions have no precedent to cite, and Sprint ε's
"v2.1.117~119 false alarm" retrospective showed that ad-hoc rationale
**produces inconsistent decisions** under time pressure.

This ADR formalizes the criteria.

## Decision

bkit adopts a **selective per-version review** policy — every CC
release is examined; bkit recommends specific versions, not "always
latest" and not "never upgrade." The recommendation produces one of
five outcomes per release:

| Outcome | Meaning | Example |
|---------|---------|---------|
| **adopt** | New CC features improve bkit; no changes needed | v2.1.118 X22 cwd fix |
| **adopt-with-defense** | Adopt + add bkit defense code | v2.1.118 X14 prompt-hooks-verifier |
| **adopt-no-benefit** | Compatible but no exercised feature | most maintenance releases |
| **skip** | Known regression / breaking change for bkit | v2.1.115 |
| **defer** | Wait for next release; insufficient signal | (none in tracked window) |

### Skip Criteria

A version may be **skipped** only when ≥ 1 of:

1. **Hard breakage**: a change makes existing bkit feature fail
   (test red).
2. **Unresolved regression**: the release introduces a bug that
   affects a critical bkit code path AND no defense workaround
   is feasible within 1 sprint.
3. **Unverified upstream behavior**: the release modifies a
   contract bkit relies on (hooks payload schema, plugin
   loader semantics) AND empirical validation has not yet
   completed.

### Empirical Validation Gate (per ADR 0003)

Adopt-track decisions require **empirical validation before**
publishing the recommendation:

- Run `npm i -g @anthropic-ai/claude-code@<version>` in a
  scratch shell and verify `claude --version` returns the
  expected build.
- Execute `claude plugin validate .` against the bkit plugin
  manifest. Exit 0 required.
- Run the bkit smoke suite: 8/8 validators (`check-guards`,
  `docs-code-sync`, `check-deadcode`, `qa-aggregate`,
  `l3-mcp-runtime`, `test/e2e/run-all.sh`,
  `check-trust-score-reconcile`, plus the version-specific
  CC contract test if any).
- Document each finding (B/F/I/R/X) in
  `cc_version_history_v21xx.md` with the per-version pattern.

This gate exists because the v2.1.117~119 false alarm proved that
pure changelog reading is insufficient.

### Defer vs Skip

Use **defer** when the issue is *unknown signal*; use **skip**
when the issue is *known broken*. A defer must be re-evaluated
within 1 release; a skip is permanent for that version unless
upstream patches it.

## Rationale

### Why not "always latest"

CC is a **dependency**, not a part of bkit. Treating it like an
app dependency (auto-update on release) ignores the empirical
fact that 1 in 79 releases (v2.1.115) had a real bkit-impacting
issue that pure trust would have shipped to users. The 1-in-79
rate is low enough to make automation tempting and high enough
to make it risky.

### Why not "manual on-demand"

Without a written policy, decisions drift between maintainers.
The Sprint ε retrospective (Sprint deprecated 2026-04-22) showed
that decisions made under time pressure without explicit
criteria produce false alarms — three releases (v2.1.117/118/119)
were initially flagged as critical and later proven safe after
empirical validation, costing 1 sprint of effort.

### Why this matrix instead of binary adopt/skip

Real CC releases land in 5 zones: pure adopt (most common),
adopt-with-defense (we ship a workaround), adopt-no-benefit
(maintenance), skip (rare), defer (signals incomplete). Binary
classification forces ambiguous cases into a wrong bucket.

## Consequences

### Positive

- Selective skip becomes a **documented action**, not an exception.
  Future maintainers can cite ADR 0006 § "Skip Criteria" as the
  basis for their decision.
- Empirical validation gate (ADR 0003) is now wired into a
  named outcome (adopt vs adopt-with-defense vs skip).
- Release notes can reference outcome categories, making bkit
  recommendations more legible to plugin users.

### Negative (acceptable)

- Per-release review takes ~30 min cc-version-researcher work
  + bkit-impact-analyst review per release. With ~10 CC releases/
  month at peak, this is ~5 hours/month — explicitly accepted as
  the cost of correctness.
- Defer outcomes can chain (defer → defer → defer) if signals stay
  weak. Counter: re-evaluation MUST occur within 1 release; if
  three deferrals stack, the version is auto-skipped pending
  retrospective.

### Re-evaluation Trigger

Re-open this ADR if any of:
- A skipped version's underlying issue gets patched upstream
  (then revisit as adopt/defer).
- Skip rate exceeds 5% across a rolling 20-release window
  (suggests systemic CC-bkit divergence; warrants deeper
  architectural decision).
- Anthropic publishes a contract / SLA for plugin compatibility
  that obviates the need for per-version review.

## Verification

The policy itself is documentary. Compliance verification:

```bash
# 1. Every CC version flagged in MEMORY.md must have an outcome.
grep -E "v2\.1\.[0-9]+" .claude/projects/*/memory/cc_version_*.md \
  | grep -cE "adopt|adopt-with-defense|adopt-no-benefit|skip|defer"

# 2. Each "skip" outcome must cite at least one ADR-0006 criterion.
grep -A 5 "outcome: skip" docs/adr/cc-version-*.md

# 3. ADR 0003 empirical validation must precede any "adopt" decision.
# (manual review during PR)
```

## References

- ADR 0003 — Empirical Validation Requirement (precedent)
- ADR 0004 — Agent-Hook Multi-Event Deferral (defer outcome example)
- `cc_version_history_v21xx.md` — full per-release record
- `cc_version_history_v2117_v2119.md` — Sprint ε retrospective
- `cc_version_history_v2120.md` — ADR 0003 first formal application
- `cc_version_history_v2121.md` — ADR 0003 second application
- v2.1.115 skip rationale — original decision context
