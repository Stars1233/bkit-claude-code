---
number: 0005
title: Application Layer Pilot — lib/application/pdca-lifecycle/
status: Accepted
date: 2026-04-28
deciders: kay kim (POPUP STUDIO PTE. LTD.)
consulted: bkit-impact-analyst (arch analysis Top R2), code-analyzer
informed: bkit contributors
trigger: Arch analysis Top R2 — Application Layer 경계 모호 (88/100 → target 90+)
related:
  - design: docs/02-design/features/bkit-v2111-sprint-gamma.design.md §2.3 / §FR-γ2
  - module: lib/application/pdca-lifecycle/{index.js,phases.js,transitions.js}
  - existing: lib/pdca/lifecycle.js (421 LOC, untouched in pilot)
supersedes: (none)
superseded-by: (none)
---

# ADR 0005 — Application Layer Pilot: lib/application/pdca-lifecycle/

## Status

**Accepted** (2026-04-28) — Pilot ships in v2.1.11. Full migration is
v2.1.12 carryover.

## Context

The arch analysis from 2026-03-29 identified Application Layer
boundary ambiguity as Top R2 (Architecture score 88/100, lifecycle
+ workflow + state-machine code mixing concerns under `lib/pdca/`).

Sprint γ FR-γ2 piloted a Clean Architecture-aligned Application
Layer at `lib/application/pdca-lifecycle/` to:

1. Establish the directory convention (`lib/application/`) before
   broader migration.
2. Land a small, low-risk subset (PHASES enum + transition graph)
   for v2.1.11 GA without touching the 30+ existing import sites.
3. Document the v2.1.12 migration plan with explicit ADR provenance.

## Decision

### Pilot Scope (v2.1.11)

Ship **3 new files** under `lib/application/pdca-lifecycle/`:

| File | Purpose | LOC |
|------|---------|-----|
| `phases.js` | `PHASES` enum, `PHASE_ORDER`, `isValidPhase`, `phaseIndex`, `nextPhase` | ~70 |
| `transitions.js` | `TRANSITIONS` graph, `canTransition`, `legalNextPhases` | ~60 |
| `index.js` | Public API barrel | ~35 |

**Touchless to v2.1.10**: `lib/pdca/lifecycle.js` (421 LOC) remains
unchanged. Existing 30+ consumers continue to import from `lib/pdca/`
without modification.

### Deferred to v2.1.12

| Item | Rationale |
|------|-----------|
| Move 11 lifecycle functions (initializeFeature, archiveFeature, ...) into `lib/application/pdca-lifecycle/` | High blast radius. Needs propagation map + shim period. |
| Convert `lib/pdca/lifecycle.js` → re-export shim | After 1-release deprecation window. |
| Update consumers in `lib/pdca/state-machine.js`, `lib/pdca/index.js`, `lib/orchestrator/workflow-state-machine.js`, `scripts/*.js` | Import path change in 30+ sites. |

## Rationale

### Why pilot, not full migration

1. **Scope discipline** — Sprint γ targets 3 FR (γ1 trust + γ2 layer
   + γ3 L5 E2E). γ2 must not crowd out the L5 expansion.
2. **Forward compatibility evidence** — landing the directory + 2
   data-only modules proves the pattern works without forcing the
   full refactor. Future PRs can add modules incrementally.
3. **Reversibility** — if v2.1.12 planning rejects the layer
   convention, pilot can be reverted in 1 commit (3 file deletes).

### Why phases.js + transitions.js as the seed

Phase enum + transition graph are:
- **Stateless** — no I/O, no module side-effects, easy to test.
- **Universal** — every PDCA-aware module eventually compares phase
  strings; centralizing them eliminates magic-string drift.
- **Low coupling** — the new module has zero `require` dependencies
  beyond Node stdlib.

### Why NOT relocate lifecycle.js verbatim

`lib/pdca/lifecycle.js` (421 LOC) imports `getCore`, `getStatus`,
`getArchivePath`, `resume` — relocating it would either drag those
deps into `lib/application/` (boundary violation) or require
inverting them (port/adapter work). Both are in scope for v2.1.12,
not v2.1.11.

## Consequences

### Positive

- Architecture score targets +2 (88 → 90) on layer-existence credit.
- New canonical home for PDCA phase logic (no more magic strings).
- `lib/orchestrator/workflow-state-machine.js` can adopt
  `canTransition()` in a follow-up commit (1-line diff).
- Sets precedent for `lib/application/<bounded-context>/` pattern.

### Negative (acceptable)

- Two locations briefly coexist (`lib/pdca/lifecycle.js` for
  state-changing functions, `lib/application/pdca-lifecycle/` for
  enum/transition data) until v2.1.12.
- Code review needs to direct new phase-aware logic to the new
  location, not the old one.

### Re-evaluation Trigger

If at v2.1.12 planning the new module is unused (no consumers in 1
release), revert the pilot and drop the layer convention.

## Verification

```bash
# 1. New module loads cleanly.
node -e "console.log(require('./lib/application/pdca-lifecycle'))"

# 2. Existing PDCA tests still pass (no break risk).
node --test test/unit/pdca-status-core.test.js

# 3. New unit tests for the pilot.
node --test test/unit/application-pdca-lifecycle.test.js

# 4. Architecture score recompute (manual, post-merge).
```

## References

- Arch analysis 2026-03-29 — Top R2
- Sprint γ Plan SC-01 (Arch 88→92+)
- Sprint γ Design §2.3 (data flow), §3.2 (phases.js spec), §FR-γ2
- Clean Architecture (Martin, 2017) — chapter 22 "The Clean Architecture"
