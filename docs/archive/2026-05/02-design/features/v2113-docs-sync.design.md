# v2113-docs-sync — Design (Exact Edit Hunks)

> **Sprint ID**: `v2113-docs-sync` · **Phase**: design · **Date**: 2026-05-12
> **Upstream**: PRD + Plan · **Downstream**: Do phase (F0-F8 실행)

## Context Anchor
- **WHY**: v2.1.13 코드 완료 / 문서 v2.1.12 잔재
- **WHO**: 신규/maintainer/CI/Sprint 베타 사용자/marketplace
- **WHAT**: 11 doc + BKIT_VERSION 5-loc + 89 archive + dogfood
- **WHAT NOT**: 신규 기능/코드 회귀/lib @version bulk/docs/06-guide 재작성 (모두 X)
- **SUCCESS**: 8건 (master plan §10)

---

## F0 — baseline-verify Design

### Output 산출물
- `docs/03-analysis/v2113-baseline-count.analysis.md` (1 page, ~50 LOC)

### Schema
```markdown
# v2.1.13 Baseline Component Count Analysis

> Sprint: v2113-docs-sync · Phase: do/F0 · Date: 2026-05-12

## Measurement Results

| Component | Memory (claim) | Measured | Delta | Source |
|---|---|---|---|---|
| Skills | 43 | {T0.1} | {±} | `ls skills/ \| wc -l` |
| Agents (.md files) | 36 | {T0.2} | {±} | `find agents -name "*.md" \| wc -l` |
| Templates | 18 | {T0.3} | {±} | `find templates -name "*.md" -o -name "*.template.md" \| wc -l` |
| Lib modules | 142 | {T0.4} | {±} | `find lib -name "*.js" -type f \| wc -l` |
| Lib subdirs | 16 | {T0.5} | {±} | `find lib -type d -mindepth 1 -maxdepth 1 \| wc -l` |
| MCP tools | 16 | 19 | +3 | `grep -c "name:" servers/bkit-pdca-server/index.js` |
| ACTION_TYPES | 18 | {T0.7} | {±} | `lib/audit/audit-logger.js ACTION_TYPES enumeration` |
| Contract test cases | 0 (v2.1.12) | {T0.8} | +N | `tests/contract/v2113-sprint-contracts.test.js SC-01~08` |
| Scripts | 49 | {추정 +2} | {+sprint-handler, sprint-memory-writer} | `find scripts -name "*.js" \| wc -l` |

## Memory Correction Required
- {discrepancies list}

## Anchor Values for Downstream Features
- Skills count: **{X}** → README/_GRAPH-INDEX/CHANGELOG에서 사용
- Agents count: **{Y}** → README/_GRAPH-INDEX에서 사용
- Lib modules: **{Z}** → README-FULL/_GRAPH-INDEX에서 사용
- Templates: **{T}** → README-FULL/_GRAPH-INDEX에서 사용
```

---

## F1 — version-bump Edit Hunks (8 edits)

### T1.1 `bkit.config.json:2`
```diff
- "version": "2.1.12",
+ "version": "2.1.13",
```

### T1.2 `.claude-plugin/plugin.json:3`
```diff
- "version": "2.1.12",
+ "version": "2.1.13",
```

### T1.3a `.claude-plugin/marketplace.json:4`
```diff
- "version": "2.1.12",
+ "version": "2.1.13",
```

### T1.3b `.claude-plugin/marketplace.json:37`
```diff
- "version": "2.1.12",
+ "version": "2.1.13",
```

### T1.4 `hooks/hooks.json:3`
```diff
- "description": "bkit Vibecoding Kit v2.1.12 - Claude Code",
+ "description": "bkit Vibecoding Kit v2.1.13 - Claude Code",
```

### T1.5 `hooks/session-start.js:3`
```diff
- * bkit Vibecoding Kit - SessionStart Hook (v2.1.12, uses BKIT_VERSION from lib/core/version)
+ * bkit Vibecoding Kit - SessionStart Hook (v2.1.13, uses BKIT_VERSION from lib/core/version)
```

### T1.6 `README.md:7`
```diff
- [![Version](https://img.shields.io/badge/Version-2.1.12-green.svg)](CHANGELOG.md)
+ [![Version](https://img.shields.io/badge/Version-2.1.13-green.svg)](CHANGELOG.md)
```

### T1.7 `README-FULL.md:9`
```diff
- [![Version](https://img.shields.io/badge/Version-2.1.12-green.svg)](CHANGELOG.md)
+ [![Version](https://img.shields.io/badge/Version-2.1.13-green.svg)](CHANGELOG.md)
```

### Verification
- `node scripts/docs-code-sync.js 2>&1` → Exit 0 + 0 drift
- `claude plugin validate . 2>&1` → Exit 0

---

## F2 — CHANGELOG v2.1.13 Section Insert (full content)

**Insert Position**: `CHANGELOG.md` line 8 직전 (즉 `## [2.1.12]` section 위, line 7 `... [Semantic Versioning](...).` 다음 빈 줄 추가 후 prepend).

**Content** (master plan §F2 표 채택):

```markdown

## [2.1.13] - 2026-05-12 (branch: `feature/v2113-sprint-management`)

> **Status**: GA — Sprint Management feature release + tech debt cleanup.
> **One-Liner (EN)**: The only Claude Code plugin that verifies AI-generated code against its own design specs.
> **One-Liner (KO)**: AI가 만든 코드를 AI가 만든 설계로 검증하는 유일한 Claude Code 플러그인.

### Added — Sprint Management (Major Feature)

A new **meta-container** that groups one or more features under shared scope,
budget, and timeline. Sprint runs an 8-phase lifecycle independent of (and
orthogonal to) the per-feature PDCA 9-phase cycle.

- **Sprint 8-phase lifecycle**: `prd → plan → design → do → iterate → qa → report → archived`
- **16 sub-actions**: `/sprint init / start / status / list / watch / phase / iterate / qa / report / archive / pause / resume / fork / feature / help / master-plan`
- **4 Auto-Pause Triggers**: `QUALITY_GATE_FAIL` / `ITERATION_EXHAUSTED` / `BUDGET_EXCEEDED` / `PHASE_TIMEOUT`
- **Trust Level scope L0-L4** via `SPRINT_AUTORUN_SCOPE` (L0 stop-after-plan / L1 design / L2 do / L3 qa / L4 archived = full-auto)
- **7-Layer S1 dataFlowIntegrity QA** — `UI → Client → API → Validation → DB → Response → Client → UI` hop traversal (`sprint-qa-flow` agent)
- **3 new MCP tools** in `bkit-pdca-server`: `bkit_sprint_list` / `bkit_sprint_status` / `bkit_master_plan_read`
- **4 new agents**: `sprint-master-planner` / `sprint-orchestrator` / `sprint-qa-flow` / `sprint-report-writer`
- **1 new skill**: `skills/sprint/SKILL.md` (327 LOC) + `PHASES.md` (83 LOC) + 3 examples (`basic-sprint.md`, `multi-feature-sprint.md`, `archive-and-carry.md`)
- **7 new templates**: `templates/sprint/{master-plan, prd, plan, design, iterate, qa, report}.template.md`
- **2 new infrastructure adapters**: `sprint-state-store.adapter.js` (181 LOC) + `sprint-telemetry.adapter.js` (200 LOC)
- **1 new L3 contract test**: `tests/contract/v2113-sprint-contracts.test.js` (366 LOC, 8 cross-sprint contracts SC-01 ~ SC-08: entity shape · deps interface · infra adapters · handler signature · 4-layer chain · ACTION_TYPES 19 · SPRINT_AUTORUN_SCOPE mirror · hooks 21:24)
- **2 Korean user guides**: `docs/06-guide/sprint-management.guide.md` (~330 lines, 8 sections) + `sprint-migration.guide.md` (~200 lines, PDCA ↔ Sprint orthogonal coexistence)
- **2 new ADRs**: `0006-cc-upgrade-policy.md` + `0007-sprint-as-meta-container.md`
- **3 production adapter scaffolds** (Sprint 2 deps injection): `createGapDetector` / `createAutoFixer` / `createDataFlowValidator` (no-op baseline + agentTaskRunner-injected real impl path)
- **Context Sizer** (S3-UX) — Kahn topological sort + greedy bin-packing for sprint feature size estimation (`lib/application/sprint-lifecycle/context-sizer.js`)
- **Sprint Master Plan Generator** (S2-UX) — `sprint-master-planner` agent that produces Context-Anchor-driven sprint planning documents from bkit Sprint 4 templates

### Added — Sprint UX Improvement (4 sub-sprints)

Sub-sprints S1-UX through S4-UX iteratively hardened the Sprint Management UX:

- **S1-UX**: P0 phase reset + P1 trust/CLI/skill args fixes
- **S2-UX**: Master Plan Generator implementation (`sprint-master-planner` agent body + frontmatter)
- **S3-UX**: Context Sizer with Kahn topological sort + greedy bin-packing
- **S4-UX**: Integration + L3 contract test 10/10 PASS + 16-cycle iteration verification

### Changed — Skill Cross-References (14 skills)

The following skills received minor edits to document Sprint coexistence:

`audit` · `bkit-rules` · `bkit-templates` · `bkit` · `control` · `deploy` ·
`development-pipeline` · `enterprise` · `pdca-batch` · `pdca` · `plan-plus` ·
`pm-discovery` · `qa-phase` · `rollback`

Each surfaces a one-line note clarifying the orthogonal coexistence model (PDCA 9-phase per-feature ↔ Sprint 8-phase meta-container).

### Changed — Architecture

- `ACTION_TYPES` 18 → **19** (added `master_plan_created`)
- `lib/orchestrator/next-action-engine.js` +48 LOC — sprint phase transition integration (Stop-family hook routing)
- `lib/orchestrator/team-protocol.js` +36 LOC — sprint Task spawn coordination
- `lib/intent/language.js` +58 LOC — sprint trigger pattern expansion (`/sprint` 16 sub-actions + master-plan)
- `scripts/sprint-handler.js` — new (660 LOC) — sprint sub-action router
- `scripts/sprint-memory-writer.js` — new (138 LOC) — sprint state persistence
- `servers/bkit-pdca-server/index.js` +170 LOC — 3 new MCP tools registered

### Removed — Tech Debt Cleanup (net −2,333 LOC)

Legacy infrastructure templates removed (Sprint integration gaps + dead code):

- `templates/infra/argocd/application.yaml.template`
- `templates/infra/deploy-dynamic.yml`
- `templates/infra/deploy-enterprise.yml`
- `templates/infra/staging-eks-ondemand.yml`
- `templates/infra/observability/kube-prometheus-stack.values.yaml`
- `templates/infra/observability/loki-stack.values.yaml`
- `templates/infra/observability/otel-tempo.values.yaml`
- `templates/infra/security/security-layer.yaml.template`
- `templates/infra/terraform/main.tf.template`

These were unmaintained and superseded by `/enterprise` skill guidance + bkend.ai BaaS integration.

### Fixed — Inline Root Fixes (Final QA)

- **Intent ordering** — `lib/intent/language.js` trigger pattern conflict between `/sprint` and `/pdca` sub-actions resolved (sprint pattern priority + early-return on exact match)
- **Audit category migration** — `ACTION_TYPES.master_plan_created` routing path corrected in `lib/audit/audit-logger.js` (sprint events now correctly emit under the sprint category, not generic PDCA category)

### Fixed — v2.1.12 Carryovers Closed

The following carryovers from v2.1.12 (`MEMORY.md` CARRY-7 through CARRY-12) closed in v2.1.13:

- **CARRY-7**: `handleStart` idempotent resume (sprint resume after pause did not restore state correctly — fixed in `scripts/sprint-handler.js`)
- **CARRY-8 ~ CARRY-12**: sprint integration gaps (MCP tool registration / audit category routing / config defaults)

### Verified — CC v2.1.139 Compatibility

- **94 consecutive compatible releases** (v2.1.34 → v2.1.139, R-2 v2.1.134/135 skip excluded)
- **ADR 0003 8th application** (single-pair small-batch scenario second occurrence: v2.1.138 1 bullet + v2.1.139 30 bullets — robust under all observed scenarios)
- **F9-120 closure 9-streak** — `claude plugin validate .` Exit 0 across v2.1.120 / 121 / 123 / 129 / 132 / 133 / 137 / 139 (carryover monitoring closed)
- bkit's **conservative recommendation**: Claude Code v2.1.123+ (79 consecutive compatible at recommendation point)
- bkit's **balanced recommendation**: Claude Code v2.1.139 (94 consecutive compatible)

### Documentation

- README.md badge + architecture section + Sprint Management section updated to v2.1.13
- README-FULL.md v2.1.13 inventory section added (Sprint Management deliverables + 4 UX sub-sprints + tech debt cleanup)
- CUSTOMIZATION-GUIDE.md Component Inventory bumped to v2.1.13
- AI-NATIVE-DEVELOPMENT.md Context Engineering Layers updated to v2.1.13
- bkit-system/_GRAPH-INDEX.md current release v2.1.13 + Sprint Skill (1) + Sprint Agents (4) + Sprint Templates (7) categories added
- 89+ legacy docs archived to `docs/archive/2026-05/` (v2.1.10 / v2.1.11 / v2.1.12 cycles + cc-v2110~v2137 + stale features)

```

(End of `## [2.1.13]` section — total ~250 LOC prepend)

---

## F3 — README.md Edit Hunks

### T3.2 Line 43 (CC recommended version)
```diff
- First-time users see an interactive 3-minute tutorial on the very first session. Recommended runtime: Claude Code **v2.1.118+** (79 consecutive compatible releases since v2.1.34); minimum **v2.1.78**.
+ First-time users see an interactive 3-minute tutorial on the very first session. Recommended runtime: Claude Code **v2.1.123+** (conservative, 79 consecutive compatible at recommendation point); balanced choice **v2.1.139** (94 consecutive compatible); minimum **v2.1.78**.
```

### T3.3 Line 45
```diff
- ## Architecture (v2.1.12)
+ ## Architecture (v2.1.13)
```

### T3.4 Line 48-54 (architecture table — F0 결과 반영, placeholder는 do 단계에서 실측 치환)
```diff
- | Skills | 43 |
- | Agents | 36 |
- | Hook Events / blocks | 21 / 24 |
- | MCP Servers / Tools | 2 / 16 |
- | Lib modules / Scripts | 142 / 49 |
- | Test files / cases | 117+ / 4,000+ PASS · 0 FAIL |
+ | Skills | {F0_SKILLS} |
+ | Agents | {F0_AGENTS} |
+ | Hook Events / blocks | 21 / 24 |
+ | MCP Servers / Tools | 2 / 19 |
+ | Lib modules / Scripts | {F0_LIB} / {F0_SCRIPTS} |
+ | Test files / cases | 118+ / 4,000+ PASS · 0 FAIL |
```

### T3.5 Line 56 (architecture paragraph)
```diff
- Clean Architecture 4-Layer (Domain ports/guards/rules · Application · Infrastructure · Presentation) with 7 Port↔Adapter pairs (cc-payload · state-store · regression-registry · audit-sink · token-meter · docs-code-index · mcp-tool) and a 3-Layer Orchestration core (intent-router · next-action-engine · team-protocol · workflow-state-machine). v2.1.11 added 4 Sprints (α Onboarding · β Discoverability · γ Trust · δ Port + Governance) covering 20 FRs; v2.1.12 hotfix patches the `lib/evals/runner-wrapper.js` argv mismatch (silent failure of `/bkit-evals run`) plus false-positive defense and JSON-parse robustness.
+ Clean Architecture 4-Layer (Domain ports/guards/rules · Application · Infrastructure · Presentation) with 7 Port↔Adapter pairs (cc-payload · state-store · regression-registry · audit-sink · token-meter · docs-code-index · mcp-tool) and a 3-Layer Orchestration core (intent-router · next-action-engine · team-protocol · workflow-state-machine). v2.1.11 added 4 Sprints (α Onboarding · β Discoverability · γ Trust · δ Port + Governance) covering 20 FRs; v2.1.12 hotfix patched the `lib/evals/runner-wrapper.js` argv mismatch and deep functional QA defects; **v2.1.13 GA adds Sprint Management** — a meta-container that groups one or more features under shared scope/budget/timeline, with an 8-phase lifecycle, 16 sub-actions, 4 auto-pause triggers, and Trust Level scope L0-L4. Net −2,333 LOC tech debt removed.
```

### T3.6 Line 58-79 Sprint Management section
**현재 content (이미 v2.1.13 표기)**: 검증 + 16 sub-actions 정정.

```diff
- ## Sprint Management (v2.1.13)
- 
- bkit Sprint Management groups one or more features under a shared scope,
- budget, and timeline. Each sprint runs its own 8-phase lifecycle:
- `prd → plan → design → do → iterate → qa → report → archived`.
- 
- ```
- /sprint init my-launch --name "Q2 Launch" --trust L3
- /sprint start my-launch
- /sprint status my-launch
- ```
- 
- **15 sub-actions**: init / start / status / list / phase / iterate / qa / report /
- archive / pause / resume / fork / feature / watch / help.
- 
- **4 Auto-Pause Triggers**: quality gate fail · iteration exhausted · budget exceeded ·
- phase timeout. Trust Level scope (`L0`–`L4`) controls auto-run boundaries; at `L4`
- Full-Auto the orchestrator advances phases until any trigger fires.
- 
- Sprint Management coexists with the existing PDCA 9-phase enum — both may track
- concurrently. See `skills/sprint/SKILL.md` for the full reference and
- `docs/06-guide/sprint-management.guide.md` for the Korean deep-dive guide.
+ ## Sprint Management (v2.1.13 — new)
+ 
+ bkit Sprint Management groups one or more features under a shared scope,
+ budget, and timeline. Each sprint runs its own 8-phase lifecycle:
+ `prd → plan → design → do → iterate → qa → report → archived`.
+ 
+ ```
+ /sprint init my-launch --name "Q2 Launch" --trust L3
+ /sprint start my-launch
+ /sprint status my-launch
+ ```
+ 
+ **16 sub-actions**: `init` / `start` / `status` / `list` / `watch` / `phase` /
+ `iterate` / `qa` / `report` / `archive` / `pause` / `resume` / `fork` /
+ `feature` / `help` / `master-plan`.
+ 
+ **4 Auto-Pause Triggers**: quality gate fail · iteration exhausted · budget exceeded ·
+ phase timeout. Trust Level scope (`L0`–`L4`) controls auto-run boundaries; at `L4`
+ Full-Auto the orchestrator advances phases until any trigger fires.
+ 
+ Sprint Management coexists with the existing PDCA 9-phase enum — both may track
+ concurrently. See `skills/sprint/SKILL.md` for the full reference,
+ `docs/06-guide/sprint-management.guide.md` for the Korean deep-dive guide, and
+ `docs/01-plan/features/v2113-docs-sync.master-plan.md` for a real working
+ example (this release's own documentation sync sprint).
```

---

## F4 — README-FULL.md Edit Hunks

### T4.2 Line 5
```diff
- > **Quick start lives in [README.md](README.md).** This file preserves the complete v2.1.12 feature inventory, version history, and deep architecture for contributors and audit consumers (v2.1.12 is a silent hotfix on top of v2.1.11; the v2.1.11 4-Sprint feature set remains the active inventory).
+ > **Quick start lives in [README.md](README.md).** This file preserves the complete v2.1.13 feature inventory, version history, and deep architecture for contributors and audit consumers (v2.1.13 GA adds Sprint Management as a new meta-container capability on top of the v2.1.11 4-Sprint foundation; v2.1.12 hotfix between).
```

### T4.3 Insert v2.1.13 section (before line 68, prepend ~150 LOC)

```markdown
- **v2.1.13 GA — Sprint Management + Tech Debt Cleanup** — A new **meta-container** capability that groups one or more features under shared scope/budget/timeline. Sprint runs an 8-phase lifecycle (`prd → plan → design → do → iterate → qa → report → archived`) orthogonal to the per-feature PDCA 9-phase cycle. **Sprint Deliverables**: 16 sub-actions (init/start/status/list/watch/phase/iterate/qa/report/archive/pause/resume/fork/feature/help/master-plan), 4 Auto-Pause Triggers (QUALITY_GATE_FAIL/ITERATION_EXHAUSTED/BUDGET_EXCEEDED/PHASE_TIMEOUT), Trust Level scope L0-L4 via `SPRINT_AUTORUN_SCOPE`, 7-Layer S1 dataFlowIntegrity QA via sprint-qa-flow, 3 new MCP tools (bkit_sprint_list/status/master_plan_read), 4 new agents (sprint-master-planner/orchestrator/qa-flow/report-writer), 1 new skill (skills/sprint with 327-LOC SKILL.md + PHASES.md + 3 examples), 7 new templates (master-plan/prd/plan/design/iterate/qa/report), 2 infrastructure adapters (sprint-state-store 181 LOC + sprint-telemetry 200 LOC), 1 L3 contract test (8 cross-sprint contracts SC-01~08), 2 Korean user guides (sprint-management ~330 lines + sprint-migration ~200 lines), 2 new ADRs (0006 CC Upgrade Policy + 0007 Sprint as Meta-Container), 3 production adapter scaffolds (createGapDetector/createAutoFixer/createDataFlowValidator), Context Sizer with Kahn topological sort + greedy bin-packing. **Sprint UX Improvement** (S1-UX through S4-UX 4 sub-sprints): P0 phase reset + Master Plan Generator + Context Sizer + L3 10/10 PASS verified. **Tech Debt Cleanup**: net −2,333 LOC removed (7 legacy templates/infra/* removed: argocd/deploy-dynamic/deploy-enterprise/staging-eks-ondemand/observability x3/security/terraform). **Inline Root Fixes**: intent ordering + audit category migration. **v2.1.12 Carryovers Closed**: CARRY-7 (handleStart idempotent resume) + CARRY-8~12 (sprint integration gaps). **Compatibility**: CC v2.1.139 verified (94 consecutive compatible releases v2.1.34-v2.1.139, ADR 0003 8th application). Architecture: {F0 baseline 결과 반영} Skills, {F0} Agents, 21 Hook Events (24 blocks), 19 MCP Tools (3 new sprint tools), 2 MCP Servers, {F0} Lib Modules ({F0} subdirs including lib/application/sprint-lifecycle/ + lib/infra/sprint/), {F0} Scripts (+ sprint-handler 660 LOC + sprint-memory-writer 138 LOC), 118+ test files / 4,000+ TC (+ 8 contract). **ENH closures**: CARRY-7~12. **CC recommended (conservative)**: v2.1.123+; **balanced**: v2.1.139.
```

### T4.5 Lib subdirectories list
Add `lib/application/sprint-lifecycle/` + `lib/infra/sprint/` to the subdirs enumeration wherever it appears.

---

## F5 — CUSTOMIZATION-GUIDE + AI-NATIVE-DEVELOPMENT Edit Hunks

### T5.1 `CUSTOMIZATION-GUIDE.md:180`
```diff
- ### Component Inventory (v2.1.12 — runtime-measured 2026-04-28)
+ ### Component Inventory (v2.1.13 — runtime-measured 2026-05-12)
```

### T5.2 `CUSTOMIZATION-GUIDE.md:194`
```diff
- | **BKIT_VERSION** | 2.1.12 | `bkit.config.json` single source of truth; 5-location invariant enforced by `scripts/docs-code-sync.js` |
+ | **BKIT_VERSION** | 2.1.13 | `bkit.config.json` single source of truth; 5-location invariant enforced by `scripts/docs-code-sync.js` |
```

### T5.3 `CUSTOMIZATION-GUIDE.md:196` Total components
```diff
- **Total: 700+ components** working in harmony across **Clean Architecture 4-Layer + Defense-in-Depth 4-Layer + Invocation Contract L1~L5 + 3-Layer Orchestration + Application Layer pilot (v2.1.11 γ2 introduction; v2.1.12 hardens the evals path that exercises this layer)**.
+ **Total: 730+ components** working in harmony across **Clean Architecture 4-Layer + Defense-in-Depth 4-Layer + Invocation Contract L1~L5 + 3-Layer Orchestration + Application Layer pilot (v2.1.11 γ2 introduction; v2.1.12 hardens the evals path; v2.1.13 GA introduces Sprint Management as the first non-PDCA workflow primitive: +1 skill + 4 agents + 7 templates + 3 MCP tools + 2 infrastructure adapters + 8 contract test cases = 25+ new components, plus −2,333 LOC tech debt cleanup)**.
```

### T5.4 `AI-NATIVE-DEVELOPMENT.md:143`
```diff
- **bkit v2.1.12 Implementation**:
+ **bkit v2.1.13 Implementation**:
```

### T5.5 `AI-NATIVE-DEVELOPMENT.md:200`
```diff
- **Context Engineering Architecture (v2.1.12)**:
+ **Context Engineering Architecture (v2.1.13)**:
```

### T5.6 `AI-NATIVE-DEVELOPMENT.md:203`
```diff
- │              bkit v2.1.12 Context Engineering Layers             │
+ │              bkit v2.1.13 Context Engineering Layers             │
```

### T5.7 Add Sprint as a meta-container capability note
**Position**: AI-NATIVE-DEVELOPMENT.md "## How bkit Realizes AI-Native Development" section, after Principle 5 (CTO-Led Agent Teams), add **Principle 6**:

```markdown
### Principle 6: Sprint as Meta-Container (v2.1.13)

**Principle**: For multi-feature initiatives that share scope, budget, or timeline, bkit groups features under a Sprint meta-container with its own 8-phase lifecycle and 4 auto-pause triggers — providing release-level orchestration on top of per-feature PDCA.

| bkit Feature | Implementation |
|--------------|----------------|
| **Sprint 8-phase lifecycle** | `prd → plan → design → do → iterate → qa → report → archived` (orthogonal to PDCA 9-phase) |
| **16 sub-actions** | init / start / status / list / watch / phase / iterate / qa / report / archive / pause / resume / fork / feature / help / master-plan |
| **4 Auto-Pause Triggers** | QUALITY_GATE_FAIL · ITERATION_EXHAUSTED · BUDGET_EXCEEDED · PHASE_TIMEOUT |
| **Trust Level scope L0-L4** | SPRINT_AUTORUN_SCOPE controls auto-run boundary (L4 Full-Auto = orchestrator advances until trigger fires) |
| **7-Layer S1 dataFlowIntegrity QA** | UI → Client → API → Validation → DB → Response → Client → UI hop traversal |
| **4 Sprint Agents** | sprint-master-planner (plan generation) + sprint-orchestrator (lifecycle) + sprint-qa-flow (S1 verification) + sprint-report-writer (cumulative KPI) |

**Sprint Workflow**:
```
/sprint init my-launch --features f1,f2,f3 --trust L3
  → sprint-master-planner generates master plan + PRD + plan + design
  → /sprint start advances phases auto-run scope=Trust Level
  → 4 auto-pause triggers monitor in background
  → /sprint qa runs 7-Layer S1 dataFlowIntegrity
  → /sprint report aggregates KPI + lessons learned
  → /sprint archive transitions to terminal state
```

See [skills/sprint/SKILL.md](../skills/sprint/SKILL.md), [docs/06-guide/sprint-management.guide.md](../docs/06-guide/sprint-management.guide.md), [docs/06-guide/sprint-migration.guide.md](../docs/06-guide/sprint-migration.guide.md), and [docs/01-plan/features/v2113-docs-sync.master-plan.md](../docs/01-plan/features/v2113-docs-sync.master-plan.md) (real working example).
```

---

## F6 — bkit-system/ Edit Hunks (요약)

### T6.1 `bkit-system/_GRAPH-INDEX.md:3`
```diff
- > Obsidian graph view central hub. All components connect from this file. **Current release: v2.1.12 (silent hotfix on top of v2.1.11 4 Sprints × 20 FRs Integrated Enhancement)**.
+ > Obsidian graph view central hub. All components connect from this file. **Current release: v2.1.13 GA (Sprint Management major feature + tech debt cleanup on top of v2.1.11 4 Sprints × 20 FRs foundation)**.
```

### T6.2 `bkit-system/_GRAPH-INDEX.md:7-16` highlights — Sprint Management 추가
Add after "4 Sprints × 20 FRs..." bullet:
```diff
+ > - **Sprint Management (v2.1.13 GA)** — 8-phase meta-container (prd→plan→design→do→iterate→qa→report→archived), 16 sub-actions, 4 Auto-Pause Triggers (QUALITY_GATE_FAIL/ITERATION_EXHAUSTED/BUDGET_EXCEEDED/PHASE_TIMEOUT), Trust Level scope L0-L4, 7-Layer S1 dataFlowIntegrity QA
+ > - **Tech Debt Cleanup (v2.1.13)** — net −2,333 LOC (7 legacy templates/infra/* removed)
```

### T6.3 `bkit-system/_GRAPH-INDEX.md:45` Skills section
```diff
- ## Skills (39)
+ ## Skills ({F0_SKILLS})

  ### PDCA Skills (2)
  ...

+ ### Sprint Skill (1) (v2.1.13)
+ - [[../skills/sprint/SKILL|sprint]] - Sprint Management meta-container (8-phase, 16 sub-actions, 4 auto-pause triggers, Trust L0-L4) [Workflow]
```

### T6.4 `bkit-system/_GRAPH-INDEX.md:91` Agents section
```diff
- ## Agents (36)
+ ## Agents ({F0_AGENTS})
  ...

+ ### Sprint Agents (4) (v2.1.13)
+ - [[../agents/sprint-master-planner|sprint-master-planner]] - Sprint Master Plan + PRD + Plan + Design generation (Context-Anchor-driven)
+ - [[../agents/sprint-orchestrator|sprint-orchestrator]] - Sprint full-lifecycle orchestrator (Sequential dispatch ENH-292 pattern)
+ - [[../agents/sprint-qa-flow|sprint-qa-flow]] - 7-Layer S1 dataFlowIntegrity verification (UI→Client→API→Validation→DB→Response→Client→UI)
+ - [[../agents/sprint-report-writer|sprint-report-writer]] - phaseHistory + iterateHistory + featureMap + kpi aggregation → markdown report
```

### T6.6 Scripts section
Add sprint-handler.js + sprint-memory-writer.js to Sprint Scripts category.

### T6.7 `bkit-system/_GRAPH-INDEX.md:338` Components
```diff
- **Components (v2.1.12 Final, 2026-04-28)**:
+ **Components (v2.1.13 GA, 2026-05-12)**:
- - `skills/` - 43 skills (v2.1.11 added bkit-evals, bkit-explore, pdca-watch, pdca-fast-track)
+ - `skills/` - {F0_SKILLS} skills (v2.1.13 added sprint)
- - `agents/` - 36 agents (13 opus / 21 sonnet / 2 haiku)
+ - `agents/` - {F0_AGENTS} agents (v2.1.13 added sprint-master-planner / sprint-orchestrator / sprint-qa-flow / sprint-report-writer)
- - `scripts/` - 49 scripts (Node.js)
+ - `scripts/` - {F0_SCRIPTS} scripts (v2.1.13 added sprint-handler.js + sprint-memory-writer.js)
- - `lib/` - 16 subdirectories, 142 modules — Clean Architecture 4-Layer with 7 Port↔Adapter pairs
+ - `lib/` - {F0_SUBDIRS} subdirectories ({F0_LIB} modules) — Clean Architecture 4-Layer with 7 Port↔Adapter pairs (v2.1.13 added lib/application/sprint-lifecycle/ + lib/infra/sprint/)
- - `templates/` - 18 templates
+ - `templates/` - {F0_TEMPLATES} templates (v2.1.13 added 7 sprint templates: master-plan/prd/plan/design/iterate/qa/report)
- - `servers/` - 2 MCP servers (bkit-pdca, bkit-analysis; 16 tools registered via `lib/infra/mcp-port-registry.js`)
+ - `servers/` - 2 MCP servers (bkit-pdca, bkit-analysis; 19 tools registered via `lib/infra/mcp-port-registry.js` — v2.1.13 added bkit_sprint_list / bkit_sprint_status / bkit_master_plan_read)
- - Test files - 117+ (qa-aggregate scope), 4,000+ TC (3,762 baseline + 261 v2.1.11)
+ - Test files - 118+ (qa-aggregate scope), 4,000+ TC (3,762 baseline + 261 v2.1.11 + 8 v2.1.13 contract SC-01~08)
- - BKIT_VERSION - 2.1.12 (`bkit.config.json` SSoT; 5-location invariant)
+ - BKIT_VERSION - 2.1.13 (`bkit.config.json` SSoT; 5-location invariant)
```

### T6.8 Templates section
```diff
- ## Templates (18)
+ ## Templates ({F0_TEMPLATES})
  ...

+ ### Sprint Templates (7) (v2.1.13)
+ - `sprint/master-plan.template.md` - Sprint master plan
+ - `sprint/prd.template.md` - Sprint PRD
+ - `sprint/plan.template.md` - Sprint plan
+ - `sprint/design.template.md` - Sprint design
+ - `sprint/iterate.template.md` - Sprint iterate report
+ - `sprint/qa.template.md` - Sprint QA report
+ - `sprint/report.template.md` - Sprint final report
```

### T6.9 ~ T6.15 (components/* + philosophy/ + scenarios/ + triggers/)
- `components/skills/_skills-overview.md`: sprint skill 항목 추가 (Sprint Skill 카테고리)
- `components/agents/_agents-overview.md`: 4 sprint agents 추가
- `components/scripts/_scripts-overview.md`: sprint-handler.js (660 LOC) + sprint-memory-writer.js (138 LOC) 추가
- `components/hooks/_hooks-overview.md`: Sprint 통합점 (next-action-engine + team-protocol)
- `philosophy/pdca-methodology.md`: Sprint coexistence 단락 추가
- `scenarios/scenario-sprint.md`: 신규 시나리오 (사용자 sprint init → archive 흐름)
- `triggers/trigger-matrix.md`: `/sprint` 16 sub-action trigger pattern

---

## F7 — hooks-commands Edit Hunks

### T7.4 `commands/bkit.md` line 56 (15 sub-actions → 16 sub-actions)
**현재** (이미 v2.1.13 표기, 15 명시):
```
**15 sub-actions**: init / start / status / list / phase / iterate / qa / report /
archive / pause / resume / fork / feature / watch / help.
```

```diff
- **15 sub-actions**: init / start / status / list / phase / iterate / qa / report /
- archive / pause / resume / fork / feature / watch / help.
+ **16 sub-actions**: init / start / status / list / watch / phase / iterate / qa /
+ report / archive / pause / resume / fork / feature / help / master-plan.
```

(commands/bkit.md 다른 위치도 `15 sub-actions` 표기 있을 시 동일하게 16으로 정정)

---

## F8 — docs-archive Whitelist + Archive Plan

### Whitelist (보관 X — 활성 영역 유지)

활성 영역 유지 (archive X):
- 본 sprint 산출물: `v2113-docs-sync.*`
- ADR 0004 / 0005 / 0006 / 0007 (살아있는)
- cc-v2138-v2139-impact-analysis.report.md (가장 최근)
- sprint-management.master-plan.md (v2.1.13 working example)
- sprint-ux-improvement.master-plan.md (v2.1.13 history)
- v2113-sprint-1-domain / v2113-sprint-2-application / v2113-sprint-3-infrastructure / v2113-sprint-4-presentation / v2113-sprint-5-quality-docs (각 PRD/Plan/Design/QA/Report 5세트, v2.1.13 GA 산출물)
- bkit-v2112-deep-functional-qa-issues.report.md (CARRY 식별 출처)
- ai-agent-security-audit-2026.report.md (정기 보안 감사 결과)
- bkit-architecture-completeness.analysis.md (general — not version-specific)

### Archive List (대상 ~80 파일)

| Category | Pattern | Files (예상) | Move To |
|---|---|---|---|
| v2.1.10 cycle | `bkit-v2110-*` | 8 | `docs/archive/2026-05/{category}/features/` |
| v2.1.11 cycle | `bkit-v2111-*` | 6 | 동일 |
| v2.1.12 cycle | `bkit-v2112-*` (sans deep-functional-qa-issues) | 8 | 동일 |
| Legacy versions | `bkit-v216-*`, `bkit-v217-*`, `bkit-v219-*` | 6 | 동일 |
| CC version analyses | `cc-v211*`, `cc-v212*` ~ `cc-v2137*` (sans v2138-v2139) | 14 | `docs/archive/2026-05/04-report/features/` |
| Stale test features (in .pdca-status.json) | `test-*`, `feat-persist-*`, `test-feature-lc*`, `test-iter-*`, `test-flow-*`, `test-complete-*`, `test-abandon-*` | 20+ (mostly state cleanup, no docs) | `/pdca cleanup` 실행 (`.pdca-status.json` 갱신) |
| Old docs sync | `v2110-docs-sync.*`, `bkit-v219-docs-sync.*` | 4 | `docs/archive/2026-05/01-plan/features/` |
| Old retrospectives | `cc-v2119-phase2-retrospective.md`, `cc-v2117-v2118-bkit-v2111-impact.md` | 2 | `docs/archive/2026-05/03-analysis/` |

### Archive Commands (dry-run preview 후 실 execute)

```bash
# 1. Directory create
mkdir -p docs/archive/2026-05/{00-pm,01-plan,02-design,03-analysis,04-report,05-qa}/features

# 2. Dry-run preview
for pattern in "bkit-v2110*" "bkit-v2111*" "bkit-v2112*" "bkit-v216*" "bkit-v217*" "bkit-v219*" "cc-v211*" "cc-v212*" "cc-v2130*" "cc-v2132*" "cc-v2133*" "cc-v2134*" "cc-v2137*" "v2110-docs-sync*" "cc-v2119*" "cc-v2117*"; do
  find docs/{00-pm,01-plan,02-design,03-analysis,04-report,05-qa}/features -name "$pattern" 2>/dev/null
done > /tmp/archive-plan.txt
# (whitelist 필터링)

# 3. Execute (whitelist 적용 후)
# git mv each file to corresponding docs/archive/2026-05/{category}/features/
```

### /pdca cleanup
- `node scripts/pdca-cleanup.js` 또는 `/pdca cleanup` skill 실행
- `.bkit/state/pdca-status.json` 갱신 — stale (idle > 7d) features 제거 또는 archived 표시
- 결과 검증: `cat .bkit/state/pdca-status.json | jq '[.features[] | select(.daysSinceLastActivity > 7)] | length'` → 0

---

## F9 — Real-Use Self-Validation Design

### Sprint Lifecycle 호출 순서

```bash
# Phase 1: init
/sprint init v2113-docs-sync \
  --name "v2.1.13 Documentation Synchronization & Self-Validation Sprint" \
  --features f0-baseline,f1-version-bump,f2-changelog,f3-readme,f4-readme-full,f5-customization,f6-bkit-system,f7-hooks-commands,f8-archive-cleanup,f9-real-use-validation \
  --trust L4 \
  --base-master-plan docs/01-plan/features/v2113-docs-sync.master-plan.md

# Phase 2~5: start (auto-run L4 scope=archived)
/sprint start v2113-docs-sync

# Phase monitoring
/sprint status v2113-docs-sync

# QA phase (S1 dataFlow integrity)
/sprint qa v2113-docs-sync

# Iterate if matchRate < 90% (max 5)
/sprint iterate v2113-docs-sync

# Report
/sprint report v2113-docs-sync

# Archive (terminal)
/sprint archive v2113-docs-sync
```

### Gap-detector

```bash
# Master plan ↔ 산출물 매치율
node lib/cc-regression/doc-scanner.js --master-plan docs/01-plan/features/v2113-docs-sync.master-plan.md \
  --outputs docs/00-pm/v2113-docs-sync.prd.md,docs/01-plan/features/v2113-docs-sync.plan.md,docs/02-design/features/v2113-docs-sync.design.md
# Or via agent: Task(gap-detector)
```

### MCP Tool Verification

```javascript
// 1. /mcp bkit_sprint_list — 본 sprint 등록 확인
// 2. /mcp bkit_sprint_status v2113-docs-sync — 현재 phase 정확 반영
// 3. /mcp bkit_master_plan_read v2113-docs-sync — 본 master plan 정확 반환
```

### Final Report Schema

`docs/04-report/features/v2113-docs-sync.report.md` — sprint-report-writer 출력:
- KPI: phaseHistory, iterateHistory, featureMap, autoPause.pauseHistory
- Quality Gates: M1/M3/M8/S1 결과
- Lessons Learned (≥ 5건)
- Carry Items (목표 0건)

---

## Edit Summary

| File | Edits | Estimated LOC change |
|---|---|---|
| `bkit.config.json` | 1 | +0/-0 (constant change) |
| `.claude-plugin/plugin.json` | 1 | +0/-0 |
| `.claude-plugin/marketplace.json` | 2 | +0/-0 |
| `hooks/hooks.json` | 1 | +0/-0 |
| `hooks/session-start.js` | 1 | +0/-0 |
| `README.md` | 4 | +5/-5 |
| `README-FULL.md` | 3 | +150/-3 |
| `CHANGELOG.md` | 1 (prepend) | +250/0 |
| `CUSTOMIZATION-GUIDE.md` | 3 | +3/-3 |
| `AI-NATIVE-DEVELOPMENT.md` | 4 (3 + Principle 6 add) | +30/-3 |
| `bkit-system/_GRAPH-INDEX.md` | 8 | +50/-10 |
| `bkit-system/components/skills/_skills-overview.md` | 1 | +10/0 |
| `bkit-system/components/agents/_agents-overview.md` | 1 | +20/0 |
| `bkit-system/components/scripts/_scripts-overview.md` | 1 | +10/0 |
| `bkit-system/components/hooks/_hooks-overview.md` | 1 | +5/0 |
| `bkit-system/philosophy/pdca-methodology.md` | 1 | +10/0 |
| `bkit-system/scenarios/scenario-sprint.md` | 1 (new file) | +80/0 |
| `bkit-system/triggers/trigger-matrix.md` | 1 | +10/0 |
| `commands/bkit.md` | 1-2 | +0/-0 |
| **Total Edit** | ~36 file ops | **+633/-37 LOC docs** |
| **+ New Docs (this sprint)** | 4 (master/PRD/plan/design) | +1,600 LOC docs |
| **+ Archive (git mv)** | ~80 files moved | 0 LOC (move only) |
| **Total** | **~120 file ops** | **~+2,200 LOC docs** |

---

## Verification Plan (after Do phase)

1. `node scripts/docs-code-sync.js` Exit 0
2. `claude plugin validate .` Exit 0
3. `grep -rn "2\.1\.12" --include="*.md" --include="*.json" --include="*.js" | grep -v "memory/\|docs/archive/\|docs/03-analysis\|docs/04-report\|docs/05-qa\|docs/00-pm\|CHANGELOG.md\|docs/adr/"` → 0 lines
4. `node tests/contract/v2113-sprint-contracts.test.js` → 8/8 PASS
5. `find docs/archive/2026-05 -type f | wc -l` → ~80
6. `cat .bkit/state/pdca-status.json | jq '[.features[] | select(.daysSinceLastActivity > 7)] | length'` → 0

---

**End of Design**
