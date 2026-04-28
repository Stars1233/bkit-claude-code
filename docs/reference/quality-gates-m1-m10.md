# Quality Gates M1~M10 Catalog

> **Single source of truth** for bkit quality thresholds.
> v2.1.11 Sprint δ FR-δ2.
>
> Any value referenced in this document must agree with `bkit.config.json`
> and the corresponding template / runtime callsite. The 3-way SSoT
> drift is detected by `scripts/check-quality-gates-m1-m10.js` (CI
> invariant **I4**).

## Catalog

| Gate | Phase | Metric | Threshold | Source (config) | Source (template) |
|------|-------|--------|-----------|-----------------|-------------------|
| **M1** | Plan | Executive Summary 4-perspective | present | (template-only) | `templates/plan.template.md` |
| **M2** | Design | Architecture Options | ≥ 3 | (template-only) | `templates/design.template.md` |
| **M3** | Design | Context Anchor | present | (template-only) | `templates/design.template.md` |
| **M4** | Do | Code + Test per module | both | (template-only) | `templates/do.template.md` |
| **M5** | Check | Match Rate | ≥ 90 | `pdca.matchRateThreshold` / `quality.thresholds.matchRate` | `templates/analysis.template.md` |
| **M6** | Check | Critical Issues | 0 | `quality.thresholds.criticalIssueCount` | `templates/analysis.template.md` |
| **M7** | Act | Iterate Count Max | ≤ 5 | `pdca.maxIterations` | `templates/analysis.template.md` |
| **M8** | QA | L1-L3 PASS Rate | 100 | (skill-only) | `skills/qa-phase/SKILL.md` |
| **M9** | Report | Success Criteria Coverage | ≥ 80 | (template-only) | `templates/report.template.md` |
| **M10** | Archive | Docs=Code Drift | 0 | (script-only) | `scripts/docs-code-sync.js` |

## Threshold Resolution Order

When a metric appears in multiple sources (e.g., M5 Match Rate in both
`pdca.matchRateThreshold` and `quality.thresholds.matchRate`), the
runtime resolution order is:

1. `bkit.config.json` value (operator override)
2. Catalog default (this file)
3. Hard-coded fallback in code (last resort)

The CI invariant verifies all three layers agree numerically, then
warns when only the catalog vs config differ (operator override
intentional vs accidental).

## Per-Gate Detail

### M1 — Plan Executive Summary 4-Perspective

Plan documents must contain an Executive Summary section covering 4
perspectives: WHO/WHAT/WHY/HOW. Verified by `templates/plan.template.md`
section requirement and gap-detector's plan parser.

### M2 — Design Architecture Options

Every Design document must enumerate ≥ 3 Architecture Options (e.g.,
"Option A / B / C"). Single-option designs trigger M2 violation
unless the alternatives section explicitly says "rejected
alternatives" with rationale.

### M3 — Design Context Anchor

Every Design document must contain a "Context Anchor" section that
captures version-stamped state (CC version, bkit version, related
plan hash). Prevents cross-version Design drift.

### M4 — Do Code + Test per Module

Every module landed in Do phase must ship both implementation and
test files. Verified by `gap-detector` and the L1 unit test
existence check.

### M5 — Check Match Rate ≥ 90

`gap-detector` computes the Match Rate; the threshold is set via
`pdca.matchRateThreshold` (default 90). Below threshold → trigger
`pdca-iterator` automatically (max 5 iterations per M7).

### M6 — Check Critical Issues = 0

`code-analyzer` reports issues classified `critical`, `major`,
`minor`. M6 fails when `critical` count > 0. Configurable via
`quality.thresholds.criticalIssueCount`.

### M7 — Act Iterate Count ≤ 5

`pdca-iterator` enforces a maximum of 5 iterate cycles per Check-Act
loop. After exhaustion, control returns to the user with a partial
report. Configurable via `pdca.maxIterations`.

### M8 — QA L1-L3 PASS Rate

`qa-lead` orchestrates L1 unit + L2 integration + L3 contract test
runs. M8 requires 100% PASS rate before the QA→Report transition.
Documented in `skills/qa-phase/SKILL.md`.

### M9 — Report Success Criteria Coverage ≥ 80%

Completion reports must address ≥ 80% of the Plan's Success Criteria
(SC-01, SC-02, ...). Coverage is computed by `report-generator`
which counts `<SC-NN>` references against `<SC-NN>` definitions.

### M10 — Archive Docs=Code Drift = 0

Before archiving, `scripts/docs-code-sync.js` must report 0 drift
between `docs/` and `lib/`/`scripts/`/`hooks/`. Drift > 0 blocks
archive until reconciled.

## SSoT Verification

```bash
# CI invariant — runs in pre-commit + GitHub Actions
node scripts/check-quality-gates-m1-m10.js
# Expected exit 0; non-zero indicates 3-way drift.
```

The invariant compares:
1. This catalog (extracts numeric thresholds from the table)
2. `bkit.config.json` (`pdca.matchRateThreshold`, `pdca.maxIterations`,
   `quality.thresholds.matchRate`, `quality.thresholds.criticalIssueCount`)
3. Tests assert M5/M6/M7 numeric values match the catalog

## Change Procedure

1. Open a PR that updates this catalog with the new threshold.
2. Update `bkit.config.json` to match (if applicable).
3. Update affected templates (M1~M4, M9) to match.
4. Run `node scripts/check-quality-gates-m1-m10.js` — must Exit 0.
5. Reviewer verifies the change is reflected in all three SSoT layers.

## Related

- ADR 0005 — Application Layer pilot (transitions referenced by M5)
- `lib/application/pdca-lifecycle/transitions.js` — phase transitions
  enforced by quality gates
- `scripts/docs-code-sync.js` — backs M10
- `bkit.config.json#pdca` — backs M5/M6/M7 numeric thresholds

---

## Catalog Version

- **v2.1.11** — initial catalog (10 gates, 4 numeric thresholds in
  bkit.config.json, 5 template-only, 1 script-only)
