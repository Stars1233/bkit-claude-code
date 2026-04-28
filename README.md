# bkit — AI Native Development OS

> The only Claude Code plugin that verifies AI-generated code against its own design specs.
>
> AI가 만든 코드를 AI가 만든 설계로 검증하는 유일한 Claude Code 플러그인.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-v2.1.118+-purple.svg)](https://code.claude.com)
[![Version](https://img.shields.io/badge/Version-2.1.11-green.svg)](CHANGELOG.md)
[![Author](https://img.shields.io/badge/Author-POPUP%20STUDIO-orange.svg)](https://popupstudio.ai)

---

## What bkit gives you

bkit turns AI-driven coding into a verified PDCA workflow. You describe intent, bkit drives **Plan → Design → Do → Check → Act**, and `gap-detector` closes the loop by comparing the design back against the implementation.

**Verified, not just generated**:

- **PDCA as a real state machine** — 20 transitions, L0-L4 automation, M1-M10 quality gates
- **Match Rate ≥ 90%** between design specs and shipped code, enforced by `gap-detector`; sub-90 triggers `pdca-iterator` auto-improvement (max 5 cycles)
- **CTO-Led Agent Teams** orchestrate `pm-lead` / `qa-lead` / `pdca-iterator` for non-trivial work
- **Defense-in-Depth 4-layer** — CC sandbox → bkit PreToolUse hooks → audit-logger sanitizer (OWASP A03/A08) → Token Ledger NDJSON
- **Docs=Code CI** keeps README · CHANGELOG · plugin manifest · hooks · session intro in lockstep, plus a 5-location One-Liner SSoT and a 5-location BKIT_VERSION invariant
- **Invocation Contract L1~L5** — 226 assertions guarding skill/agent/hook surface across releases

## Quick start

```bash
# 1. Install via Claude Code marketplace
claude plugin install bkit

# 2. (Optional) Enable Agent Teams for the cto-lead orchestration
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# 3. In Claude Code, drive a feature end-to-end
/pdca pm my-feature       # PM Discovery → PRD
/pdca plan my-feature     # PDCA Plan
/pdca design my-feature   # PDCA Design
/pdca do my-feature       # Implementation
/pdca check my-feature    # gap-detector → Match Rate
/pdca act my-feature      # Completion report
```

First-time users see an interactive 3-minute tutorial on the very first session. Recommended runtime: Claude Code **v2.1.118+** (79 consecutive compatible releases since v2.1.34); minimum **v2.1.78**.

## Architecture (v2.1.11)

| Surface | Count |
|---|---|
| Skills | 39 |
| Agents | 36 |
| Hook Events / blocks | 21 / 24 |
| MCP Servers / Tools | 2 / 16 |
| Lib modules / Scripts | 130 / 47 |
| Test files / cases | 113 / 3,762 PASS · 0 FAIL |

Clean Architecture 4-Layer (Domain ports/guards/rules · Application · Infrastructure · Presentation) with 6 Port↔Adapter pairs and a Sprint 7 3-Layer Orchestration core (intent-router · next-action-engine · team-protocol · workflow-state-machine).

## Documentation

- [README-FULL.md](README-FULL.md) — full feature list, complete version history, deep architecture
- [CHANGELOG.md](CHANGELOG.md) — release history
- `docs/01-plan/` — PDCA Plan documents (Korean)
- `docs/02-design/` — design specs + ADRs
- `docs/03-analysis/` — analysis evidence
- `docs/04-report/` — completion reports
- `docs/05-qa/` — QA outputs

## License

Apache 2.0 — see [LICENSE](LICENSE).

POPUP STUDIO PTE. LTD. · `kay@popupstudio.ai`
