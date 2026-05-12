# bkit — AI Native Development OS

> The only Claude Code plugin that verifies AI-generated code against its own design specs.

**Six `/pdca` commands drive your feature from PRD to release-ready report.** Quality gates catch what AI misses; sub-90% match auto-fires `pdca-iterator` to repair the gap.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-v2.1.123+-purple.svg)](https://code.claude.com)
[![Version](https://img.shields.io/badge/Version-2.1.13-green.svg)](CHANGELOG.md)
[![Author](https://img.shields.io/badge/Author-POPUP%20STUDIO-orange.svg)](https://popupstudio.ai)

---

## The problem with "just prompt and ship"

AI produces plausible code fast. Plausible isn't correct. You only notice the spec drift at PR review — far too late, and far too expensive to fix.

bkit closes that loop: **every implementation is gap-checked against its own design**, sub-90% match triggers automatic iteration, and a 7-stage quality gate refuses to advance until thresholds pass.

## 30-second demo

```mermaid
flowchart TB
    Start(["User intent:<br/>ship features"])
    Start --> Choice{"Scope?"}
    Choice -- "Multi-feature" --> SM["1.&nbsp;/sprint master-plan project"]
    SM --> Tasks["2.&nbsp;Task Management System<br/>auto-registers each sprint"]
    Tasks --> SS["3.&nbsp;/sprint start sprint-id"]
    SS --> PDCA["bkit PDCA 9-phase loop"]
    Choice -- "Single feature" --> Direct["/pdca pm my-feature"]
    Direct --> PDCA
    PDCA --> Iter{"matchRate &ge; 90%?"}
    Iter -- "No, auto-fix" --> Heal["pdca-iterator<br/>max 5 cycles"]
    Heal --> Iter
    Iter -- "Yes" --> Done(["Release-ready<br/>feature + report"])
    Control["4.&nbsp;/control level 0..4"] -.->|"scopes autonomy"| SS
    Control -.->|"scopes autonomy"| PDCA

    style Start fill:#e3f2fd
    style SM fill:#fff3e0
    style Tasks fill:#fff3e0
    style SS fill:#fff3e0
    style PDCA fill:#fce4ec
    style Heal fill:#ffe0b2
    style Done fill:#c8e6c9
    style Control fill:#f3e5f5
```

**Two pathways, one autonomous loop.** Single feature goes straight into PDCA; multi-feature releases flow through Sprint master-plan → Task Management → Sprint start → PDCA per feature. `/control` scopes how much runs unattended.

## What you actually get

| Outcome | How bkit delivers it |
|---|---|
| **Sprint-orchestrated multi-feature releases** | `/sprint master-plan <project>` splits the release into context-budgeted sprints (Kahn topological + greedy bin-packing). Every sprint is auto-registered in the Task Management System. `/sprint start <id>` then drives each sprint through bkit's PDCA 9-phase workflow. |
| **Autonomous per-feature workflow** | Inside a sprint (or standalone), `/pdca team` spawns 4–6 specialist agents in parallel (cto-lead orchestrates frontend / backend / QA / security). Phases auto-advance until a checkpoint or quality gate stops them. |
| **Self-verification + self-repair** | `gap-detector` measures design ↔ code match rate. Below 90% auto-fires `pdca-iterator` (Evaluator-Optimizer, max 5 cycles). The AI that wrote the code does **not** judge the code — a different agent does. |
| **Trust Level dial L0–L4** | `/control level N` is the single autonomy knob — it scopes **both** sprint phase transitions **and** PDCA phase transitions. L2 default keeps human-in-the-loop on QA/Report. L4 stops only on a quality-gate failure or auto-pause trigger. |
| **Quality Gates M1–M10 + S1** | Every phase transition is gated (matchRate, criticalIssue count, convention compliance, dataFlow integrity, …). Fail = phase pauses, audit log captures the reason. |

## Quick start

```bash
# 1. Install through the Claude Code marketplace
claude plugin install bkit

# 2. (Optional) Enable parallel team execution
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# 3. Drive your first feature end-to-end
/pdca pm my-feature        # 4 PM agents → PRD with 43 frameworks
/pdca team my-feature      # cto-lead spawns specialists; check + iterate run automatically
/pdca qa my-feature        # L1–L5 testing
/pdca report my-feature    # Completion report with KPIs
```

First-time users see a 3-minute interactive tutorial on session start. Recommended Claude Code runtime: **v2.1.123+** (conservative, 79 consecutive compatible at recommendation point) or **v2.1.139** (balanced, 94 consecutive compatible). Minimum **v2.1.78**.

## The autonomous workflow

bkit integrates **five layers** into one automation system. Sprint Management sits on top of PDCA, and `/control` scopes autonomy across both.

```mermaid
flowchart TB
    subgraph L5["L5 — Sprint Management (multi-feature container)"]
        direction LR
        SM["/sprint master-plan project<br/>(Context Sizer: Kahn + bin-pack)"]
        --> TASK["Task Management System<br/>auto-registers each sprint"]
        --> SS["/sprint start sprint-id<br/>(8-phase, 4 auto-pause triggers)"]
    end

    subgraph L4["L4 — PDCA 9-phase (per feature, runs inside a sprint)"]
        direction LR
        pm["pm"] --> plan["plan"] --> design["design"] --> do["do/team"] --> check["check"] --> act["act"] --> qa["qa"] --> report["report"] --> archive["archive"]
    end

    subgraph L3["L3 — Trust Level (single autonomy dial for both L4 + L5)"]
        L0["L0 Manual"] --- L1["L1 Guided"] --- L2["L2 Semi-Auto (default)"] --- LL3["L3 Auto"] --- LL4["L4 Full-Auto"]
    end

    subgraph L2["L2 — Quality Gates M1–M10 + S1"]
        M1["M1 matchRate &ge; 90%"]
        M3["M3 critical = 0"]
        S1["S1 dataFlow &ge; 85%"]
        more["M2 M4–M7 M9 M10"]
    end

    subgraph L1["L1 — Auto-Iterate (self-repair)"]
        detector["gap-detector measures"] --> sub90{"&lt; 90%?"}
        sub90 -- "yes" --> iter["pdca-iterator<br/>auto-fix max 5 cycles"]
        iter --> detector
        sub90 -- "no" --> nextp["advance"]
    end

    L5 ==> L4
    L3 -.->|"scopes auto-run"| L5
    L3 -.->|"scopes auto-run"| L4
    L4 -.->|"gated by"| L2
    check -.->|"triggers"| detector
```

| Layer | What you control | What bkit does |
|---|---|---|
| **L5 Sprint Management** | `/sprint master-plan <project>` → `/sprint start <id>` | Splits a multi-feature release into context-budgeted sprints via the Context Sizer (Kahn topological sort + greedy bin-packing). Auto-registers every sprint as a task. `/sprint start` runs each sprint's 8-phase lifecycle (`prd → plan → design → do → iterate → qa → report → archived`); the inner `do` calls into the PDCA layer per feature. |
| **L4 PDCA 9-phase** | `/pdca <phase> <feature>` | Each phase spawns the right agent: pm-lead, product-manager, cto-lead, gap-detector, qa-monitor, report-generator. Inside a sprint, this layer runs once per feature. |
| **L3 Trust Level** | `/control level 0..4` | Single autonomy knob for both L4 (PDCA) and L5 (Sprint). L2 is default (auto through `do`, manual on QA/Report). L4 is fire-and-forget; auto-pauses only on quality gate failure or one of the 4 auto-pause triggers. |
| **L2 Quality Gates** | Thresholds in `bkit.config.json` | Halt phase transition if matchRate / criticalIssues / coverage / dataFlow fall below threshold. Audit log captures every gate decision. |
| **L1 Auto-Iterate** | `pdca.autoIterate = true` | Fires `pdca-iterator` automatically on sub-90% matchRate; runs up to 5 cycles before escalating with `ITERATION_EXHAUSTED`. |

### Sprint user journey (4 steps)

```mermaid
flowchart LR
    Step1["1.&nbsp;&nbsp;/sprint master-plan<br/>my-project --features a,b,c"]
    --> Step2["2.&nbsp;&nbsp;Each sprint auto-registered<br/>in Task Management System"]
    --> Step3["3.&nbsp;&nbsp;/sprint start sprint-1<br/>→ bkit PDCA 9-phase runs<br/>for every feature inside"]
    --> Step4["4.&nbsp;&nbsp;/control level 0..4<br/>scopes autonomy<br/>across all phases"]

    style Step1 fill:#fff3e0
    style Step2 fill:#fff3e0
    style Step3 fill:#fce4ec
    style Step4 fill:#f3e5f5
```

| Step | User command | What happens automatically |
|---|---|---|
| **1. Master plan** | `/sprint master-plan my-project --name "Q2 Launch" --features auth,payment,reports` | `sprint-master-planner` writes the master plan with Context Anchor + Context-budgeted sprint split (≤ 75K effective tokens/sprint, dependency-aware) + per-sprint plan & design templates. |
| **2. Task registration** | _(automatic)_ | Every sprint in the plan is registered as a task in bkit's Task Management System with proper dependencies (Kahn topological order). |
| **3. Sprint execution** | `/sprint start sprint-1` | `sprint-orchestrator` runs the 8-phase sprint lifecycle. Inside the `do` phase, bkit PDCA 9-phase runs for **every feature** in the sprint — pm-lead writes the PRD, cto-lead spawns the team, gap-detector measures, pdca-iterator self-repairs. |
| **4. Autonomy control** | `/control level 0..4` _(any time)_ | The dial scopes how far the orchestrator runs unattended. Set L4 once for fire-and-forget; downgrade to L2 if you want manual checkpoints on QA/Report. |

## Sprint Management — when one feature isn't enough

For multi-feature releases (Q2 launch, v1.x.y milestone) bkit groups features into a **Sprint** meta-container with its own 8-phase lifecycle and 4 auto-pause triggers.

```mermaid
flowchart LR
    init["/sprint init my-launch<br/>--features a,b,c<br/>--trust L3"]
    --> prd[prd] --> sp[plan] --> sd[design] --> sdo[do]
    --> iterate[iterate] --> qa[qa] --> rpt[report] --> arch[archived]

    style init fill:#e3f2fd
    style arch fill:#c8e6c9
```

| Pick this | When |
|---|---|
| **`/pdca <feature>`** | Single feature, isolated work |
| **`/sprint init <id> --features ...`** | 2+ features sharing scope, budget, or timeline |
| **`/pdca-batch`** | Multiple unrelated features running in parallel (no shared scope) |

**4 Auto-Pause Triggers** (sprint stops automatically):
`QUALITY_GATE_FAIL` · `ITERATION_EXHAUSTED` · `BUDGET_EXCEEDED` · `PHASE_TIMEOUT`

Full reference: [`skills/sprint/SKILL.md`](skills/sprint/SKILL.md) · Deep-dive guide: [`docs/06-guide/sprint-management.guide.md`](docs/06-guide/sprint-management.guide.md) · Migration: [`docs/06-guide/sprint-migration.guide.md`](docs/06-guide/sprint-migration.guide.md).

## Architecture at a glance

| Surface | Count |
|---|---|
| Skills · Agents | 44 · 34 |
| Hook events · blocks | 21 · 24 |
| MCP servers · tools | 2 · 19 |
| Lib modules · subdirs · scripts | 163 · 19 · 51 |
| Templates · Tests | 39 · 118+ files / 4,000+ cases |

Clean Architecture 4-Layer with 7 Port↔Adapter pairs · Defense-in-Depth 4-Layer (CC sandbox → bkit PreToolUse → audit sanitizer → Token Ledger) · Invocation Contract L1–L5 (226 CI-gated assertions). Full inventory in [README-FULL.md](README-FULL.md).

## Documentation

| Path | What's there |
|---|---|
| [README-FULL.md](README-FULL.md) | Deep architecture, full command reference, Skill Evals framework |
| [CHANGELOG.md](CHANGELOG.md) | Release history (single source of truth — *not* duplicated here) |
| [CUSTOMIZATION-GUIDE.md](CUSTOMIZATION-GUIDE.md) | Override bkit components in your `.claude/` directory |
| [AI-NATIVE-DEVELOPMENT.md](AI-NATIVE-DEVELOPMENT.md) | AI-Native principles and bkit's implementation |
| [`docs/06-guide/`](docs/06-guide/) | Korean deep-dive guides for Sprint Management + migration |
| [`bkit-system/`](bkit-system/) | Obsidian-graph documentation of skills, agents, philosophy |

## License

Apache 2.0 — see [LICENSE](LICENSE). POPUP STUDIO PTE. LTD. · `kay@popupstudio.ai`
