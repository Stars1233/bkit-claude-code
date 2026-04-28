---
number: 0004
title: Agent-Hook Multi-Event Support — Defer to v2.1.12 (ENH-280)
status: Accepted
date: 2026-04-28
deciders: kay kim (POPUP STUDIO PTE. LTD.)
consulted: cc-version-researcher agent (CC v2.1.118 X13 fix)
informed: bkit contributors
trigger: CC v2.1.118 X13 — agent-type hooks now bindable to events beyond Stop/SubagentStop
related:
  - design: docs/02-design/features/bkit-v2111-sprint-gamma.design.md §FR-γ4
  - enh: ENH-280 (P1 Agent-Hook 다중이벤트 조사)
  - cc-history: cc_version_history_v2117_v2119.md
supersedes: (none)
superseded-by: (none)
---

# ADR 0004 — Agent-Hook Multi-Event Support: Defer to v2.1.12

## Status

**Accepted** (2026-04-28) — Defer expansion. v2.1.11 ships with current Stop/SubagentStop binding only.

## Context

CC v2.1.118 (X13) extended `claude-plugin/hooks.json` `hooks` map so
agent-type matchers can attach to events beyond `Stop` /
`SubagentStop` (previously the only two). The fix opens the door to
agent-aware logic on `PreToolUse`, `PostToolUse`, `UserPromptSubmit`,
`StopFailure`, `PostToolUseFailure`.

Sprint γ FR-γ4 was scoped as a **research-only** task: grep bkit's
existing hook configuration to determine whether bkit currently has
any workaround that exists *because* agent-type hooks were once
restricted, and to record an explicit accept/defer decision before
v2.1.11 GA.

## Investigation (Sprint γ Do Turn 1)

### Targets

- `hooks/hooks.json` — bkit hook event map
- `lib/orchestrator/` — Sprint 7 next-action engine + workflow state machine

### Method

```bash
# 1. Enumerate hook events bkit currently binds.
grep -nE "PreToolUse|PostToolUse|Stop|SubagentStop|UserPromptSubmit|StopFailure|PostToolUseFailure" \
  hooks/hooks.json

# 2. Check for agent-type matchers (would indicate workaround usage).
grep -nE "agent.type|agentType|matcher.*agent" hooks/hooks.json

# 3. Look for orchestrator-level multi-event agent-hook wiring.
grep -rn "agent.*hook|agent.*Stop|agent.*Subagent" lib/orchestrator/
grep -rn "PreToolUse|PostToolUse|UserPromptSubmit" lib/orchestrator/
```

### Findings (실측 2026-04-28)

| Question | Result |
|----------|--------|
| Hook events currently bound | 7 (PreToolUse, PostToolUse, Stop, StopFailure, UserPromptSubmit, SubagentStop, PostToolUseFailure) |
| `agent-type` matcher entries in hooks.json | **0** |
| Multi-event agent-hook workaround in lib/orchestrator | **None** — `next-action-engine.js` only generates SubagentStop hints; no other event-level agent dispatch |
| References to event names in lib/orchestrator | 0 PreToolUse / 0 PostToolUse / 0 UserPromptSubmit |

### Interpretation

bkit's architecture binds **events to scripts**, not events to
agent types. Agents are spawned by skills (slash commands) or by
delegation from `cto-lead` / `pm-lead` / `qa-lead`, with hooks
firing on tool boundaries regardless of which agent owns the call.

Because there is **no existing workaround** that the v2.1.118 X13
fix would unblock, FR-γ4 finds no actionable wiring change for
v2.1.11 GA.

## Decision

**Defer the agent-hook multi-event expansion to v2.1.12** (ENH-280).

v2.1.11 GA ships unchanged: Stop / SubagentStop remain the only
events that consult agent context, and bkit's existing event-to-
script binding stays as-is.

### Rationale

1. **No regression risk** — bkit doesn't use agent-type matchers,
   so the X13 fix neither helps nor hurts the current code path.
2. **No new opportunity within v2.1.11 scope** — Sprint γ closed
   Trust Score (γ1) + Application Layer pilot (γ2) + L5 E2E
   coverage (γ3). FR-γ4 was always *optional*; a forced design
   here would be solution-in-search-of-problem.
3. **v2.1.12 carryover discipline** — defer + tag as ENH-280,
   evaluate alongside Sprint δ FR-δ4 (CAND-004 OTEL) and other
   deferred items in next release planning.

## Consequences

### Positive

- v2.1.11 GA ships sooner with no scope creep.
- Sprint γ DoD focuses on R1 (Trust dead-code) + R2 (Application
  Layer pilot) — the actual top risks from arch analysis.
- ENH-280 stays alive with explicit decision context for v2.1.12.

### Negative (acceptable)

- bkit doesn't yet exercise the X13 fix. If agent-type matchers
  become useful (e.g. agent-specific `PreToolUse` quotas, agent
  attribution on `PostToolUseFailure`), the design work waits
  one release.

### Re-evaluation Trigger

Re-open ADR if any of:
- A new FR requires agent-aware routing on `PreToolUse` /
  `PostToolUse` / `UserPromptSubmit` (e.g. per-agent Token Ledger
  quotas, agent-specific Defense Layer rules).
- CC introduces a fix that *requires* agent-type hooks for some
  baseline guarantee.
- bkit adopts a multi-tenant model where agent identity is part
  of the trust scoring path.

## Verification

```bash
# Re-run the same checks before v2.1.12 planning to confirm
# state hasn't drifted:
grep -nE "agent.type|agentType" hooks/hooks.json
# Expected: 0 matches (else: re-open ADR)
```

If at v2.1.12 planning the count is still 0, ENH-280 may be
re-deferred or closed as `wontfix-no-need`.

## References

- CC v2.1.118 changelog — X13 fix
- bkit `hooks/hooks.json` — current event binding catalog
- bkit `lib/orchestrator/next-action-engine.js` — only Stop/SubagentStop consumer
- Sprint γ Design §FR-γ4 — this ADR's source spec
