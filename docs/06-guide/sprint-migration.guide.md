# Sprint Migration Guide — PDCA → Sprint Management (v2.1.13)

> **Language**: English (formerly Korean — translated per user direction 2026-05-12)
> **bkit version**: v2.1.13
> **Last updated**: 2026-05-12
> **Audience**: existing bkit `/pdca` users + new Sprint Management adopters
> **Related**: [Sprint Management Guide](./sprint-management.guide.md)

---

## 1. PDCA ↔ Sprint Mapping

### 1.1 Phase Mapping Matrix

Overlap analysis between bkit's existing **PDCA 9-phase enum** and the new **Sprint 8-phase enum**:

| PDCA phase | Sprint phase | Relationship |
|---|---|---|
| `pm` | — | PDCA-only (Product Discovery, Job Stories, etc.) |
| `plan` | `plan` | ✅ overlap (same meaning) |
| `design` | `design` | ✅ overlap (same meaning) |
| `do` | `do` | ✅ overlap (same meaning) |
| `check` | — | PDCA-only (matchRate, gap analysis) |
| `act` | — | PDCA-only (improvement loop) |
| `qa` | `qa` | ✅ overlap (same meaning) |
| `report` | `report` | ✅ overlap (same meaning) |
| `archive` (verb form) | `archived` (state form) | ⚠️ semantic match, string differs |
| — | `prd` | Sprint-only (Product Requirements at sprint level) |
| — | `iterate` | Sprint-only (matchRate 100% loop, fuses PDCA check + act) |

- **Exact string overlap**: 5 phases (`plan` / `design` / `do` / `qa` / `report`)
- **Semantic match (different string)**: PDCA `archive` ↔ Sprint `archived`
- **PDCA-only**: 3 phases (`pm` / `check` / `act`)
- **Sprint-only**: 3 phases (`prd` / `iterate` / `archived` is semantically paired with PDCA `archive`)

**Important**: the PDCA enum uses `archive` (verb form — "to archive") while the Sprint enum uses `archived` (state form — "is archived"). They represent the same terminal state semantically but are different string identities. The L3 Contract test and the Sprint ↔ PDCA mapping verification (P6) explicitly cover this distinction.

### 1.2 Semantic Differences

| Aspect | PDCA | Sprint |
|---|---|---|
| **Unit** | Single feature | 1+ features bundled |
| **Starting point** | `pm` (product management analysis) | `prd` (sprint-level PRD) |
| **Quality loop** | `check → act` (separate phases) | `iterate` (integrated phase) |
| **Termination** | Feature archived | Sprint archived (all contained features) |

---

## 2. Differences in Detail

### 2.1 PDCA `pm` Phase → Sprint `prd` Position

PDCA `pm` is **product-management analysis for a single feature** (user personas, JTBD, market analysis). Sprint `prd` is **product requirements for a sprint containing multiple features** (sprint scope, budget, success criteria).

If you need per-feature product analysis inside a sprint:

- Use Sprint `prd` for the sprint-level summary
- Link each feature's individual product analysis from `featureMap[feature].pmDoc`

### 2.2 PDCA `check + act` ↔ Sprint `iterate`

PDCA `check` (gap-detector measurement) + `act` (pdca-iterator auto-fix) are fused into a **single `iterate` phase** in Sprint. Behaviorally identical, but:

- **PDCA**: explicit 2-phase separation (decide whether to enter `act` after reviewing `check` results)
- **Sprint**: 1-phase auto-loop (continues until the matchRate threshold is met or max iterations is reached)

### 2.3 Sprint-Only Features

| Feature | Description | PDCA equivalent |
|---|---|---|
| **Trust Level Scope (L0–L4)** | Defines the auto-run boundary | Absent (PDCA is per-phase manual) |
| **4 Auto-Pause Triggers** | Auto-pause on quality gate / iteration / budget / timeout | Absent |
| **featureMap (1+ features)** | Track multiple features inside one sprint | Absent (PDCA is single-feature) |
| **fork + carry items** | Carry only incomplete features to a new sprint | Absent |
| **8 use cases + DI** | Application Layer (Sprint 2) | Absent (PDCA is procedural script) |

---

## 3. Concurrent Tracks (Orthogonal Coexistence)

### 3.1 4-System State Files

bkit operates the following 4 files under `.bkit/state/` **independently**:

| File | System | Responsibility |
|---|---|---|
| `sprint-status.json` | ★ Sprint Management (new) | Sprint creation / progress state |
| `pdca-status.json` | Existing PDCA | Per-feature PDCA cycle |
| `trust-profile.json` | Trust Level | L0–L4 + stopAfter |
| `memory.json` | bkit memory | Session memory + context |

**Orthogonality principle**: these 4 files do not mutate each other. Sprint Management updating `sprint-status.json` never changes `pdca-status.json`, and vice versa.

### 3.2 Concurrent-Track Example

```bash
# Run feature blog-redesign through a PDCA cycle
/pdca pm blog-redesign
/pdca plan blog-redesign
# → pdca-status.json updated

# At the same time, bundle into a Sprint
/sprint init q2-launch --name "Q2 Launch" --features blog-redesign,reports
# → sprint-status.json updated; pdca-status.json unchanged

# When the sprint starts, blog-redesign's PDCA state is preserved
/sprint start q2-launch
/pdca status blog-redesign
# → still 'plan' phase (PDCA cycle in progress)
```

The L3 Contract test SC-08 and the `tests/qa/v2113-sprint-5-quality-docs.test.js` P5 (4-System coexistence verification) enforce this orthogonality as a CI gate.

---

## 4. Migration Scenarios

### Scenario A — Preserve existing PDCA work and adopt Sprint

**Situation**: an existing `/pdca` user introducing Sprint for the first time.

```bash
# 1. Check features currently in PDCA cycles
ls docs/01-plan/features/

# 2. Create a new sprint (Trust L0 = safest)
/sprint init my-first-sprint --name "First Sprint" --features feature-a,feature-b --trust L0

# 3. Start the sprint (existing PDCA state unchanged)
/sprint start my-first-sprint
```

**Preservation guarantee**: `/sprint init` and `/sprint start` never modify `pdca-status.json` (orthogonality). PDCA phases of existing features are preserved as-is.

### Scenario B — Wrap PDCA-in-progress features into a Sprint container

**Situation**: features already in PDCA `plan`/`design` phase need to be bundled under a sprint for budget management.

```bash
# 1. Check PDCA state per feature
/pdca status feature-a    # → 'plan'
/pdca status feature-b    # → 'design'

# 2. Create sprint — feature phases are tracked separately from the sprint 'prd' phase
/sprint init wrap-sprint --features feature-a,feature-b --trust L1

# 3. When the sprint enters 'design', it can be matched against the feature PDCA states
/sprint phase wrap-sprint --to plan
# → sprint phase: 'plan' (sprint level)
# → feature-a PDCA phase: 'plan' (unchanged)
# → feature-b PDCA phase: 'design' (unchanged)
```

### Scenario C — Bypass PDCA, use Sprint only

**Situation**: starting new work and skipping PDCA entirely.

```bash
# 1. Single-feature sprint
/sprint init solo-task --features task-1 --trust L4

# 2. Start (L4 = auto-run to archived, halt only on trigger fire)
/sprint start solo-task

# 3. pdca-status.json is untouched (feature was never registered in a PDCA cycle)
```

This scenario demonstrates that PDCA and Sprint are genuinely orthogonal.

---

## 5. Rollback (No Sprint = PDCA Only)

If you do not use Sprint Management:

```bash
# Use existing PDCA only, no sprint commands
/pdca pm feature-name
/pdca plan feature-name
/pdca design feature-name
# ... as before
```

**Guarantees**:

- `sprint-status.json` is not created unless you invoke a sprint command (Sprint 3 lazy-create pattern)
- `pdca-status.json` continues to work normally (PDCA code paths are unchanged by Sprint Management introduction — Sprint 5 invariant)
- `hooks/hooks.json` 21:24 invariant is maintained (Sprint 1–5 invariant)

Sprint Management adoption is **opt-in** and can be introduced incrementally.

---

## Appendix A — User-Explicit Requirement 3 (2026-05-12)

> "QA must combine evals and `claude -p` to verify that Sprint, PDCA, status, and memory work coherently from multiple perspectives — actual runtime behavior, not just contracts."

The Sprint 5 QA phase satisfies this by verifying:

1. **`bkit:bkit-evals` skill** — behavioral evaluation of sprint commands
2. **`claude -p` headless** — real user-experience simulation
3. **4-System coexistence** — `sprint`/`pdca`/`trust`/`memory` state files remain orthogonal
4. **Sprint ↔ PDCA mapping** — 8-phase × 9-phase overlap verification

For the full matrix, see the [Sprint 5 PRD (archived)](../archive/2026-05/01-plan/features/v2113-sprint-5-quality-docs.prd.md) §5.2.

## Appendix B — Troubleshooting

| Problem | Cause | Resolution |
|---|---|---|
| PDCA state changes after a sprint command | (Cannot happen — orthogonal invariant) | Verified by L3 contract test SC-08 |
| `sprint-status.json` missing after `/sprint init` | Lazy create — generated on `/sprint start` | Run `/sprint start <id>` |
| `/sprint fork` produces 0 carry items | All features are phase `archived` or `qa+` | Normal (only completed features remain) |
| Trust Level L4 stops immediately | One of the 4 auto-pause triggers fired | Inspect with `/sprint status <id>` |
| PDCA phase differs from Sprint phase | Orthogonal normal behavior | Each system tracks independently — intended behavior |

---

**Document version**: v1.1 (English, translated from v1.0 Korean — 2026-05-12)
**Contact**: bkit core team via GitHub issues
