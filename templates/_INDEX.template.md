---
template: index
version: 1.0
description: Folder document index template
variables:
  - folder: Folder name
  - phase: PDCA phase (Plan/Design/Check/Act)
---

# {folder} Index

> **PDCA Phase**: {phase}
> **Last Updated**: {date}

---

## Document List

| Document | Status | Last Modified | Owner | Description |
|----------|--------|---------------|-------|-------------|
| [example.md](./example.md) | ✅ Approved | YYYY-MM-DD | - | Description |

---

## Status Legend

| Status | Meaning | Description |
|--------|---------|-------------|
| ✅ Approved | Finalized | Review complete, reference baseline |
| 🔄 In Progress | Working | Currently being written |
| 👀 In Review | Pending Review | Awaiting review |
| ⏸️ On Hold | Paused | Temporarily stopped |
| ❌ Deprecated | Obsolete | No longer valid |

---

## PDCA Status (per-feature, 9-phase)

```
Current Phase: [{phase}] ← You are here

┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│  Plan  │───▶│ Design │───▶│   Do   │───▶│ Check  │
│        │    │        │    │ (Impl) │    │(Analyze)│
└────────┘    └────────┘    └────────┘    └────────┘
                                               │
                                               ▼
                                         ┌────────┐
                                         │  Act   │
                                         │(Improve)│
                                         └────────┘
```

## Sprint Status (v2.1.13, multi-feature container, 8-phase)

```
For multi-feature initiatives sharing scope/budget/timeline:

PRD → Plan → Design → Do → Iterate → QA → Report → Archived
                                  ▲     │
                                  └──no─┘  (matchRate < 90 → ITERATION_EXHAUSTED auto-pause)

4 Auto-Pause Triggers:
  • QUALITY_GATE_FAIL — M1-M10 gate failure
  • ITERATION_EXHAUSTED — maxIterations reached
  • BUDGET_EXCEEDED — token budget overflow
  • PHASE_TIMEOUT — phaseTimeoutHours exceeded

Trust Level (L0-L4) gates auto-advance scope:
  L0 stopAfter=prd (manual)  L4 stopAfter=archived (full-auto)
```

---

## Folder Structure

```
{folder}/
├── _INDEX.md          ← Current file
├── {category1}/
│   └── ...
└── {category2}/
    └── ...
```

---

## Related Links

| Phase | Folder | Description |
|-------|--------|-------------|
| Plan | [01-plan/](../01-plan/_INDEX.md) | Planning documents |
| Design | [02-design/](../02-design/_INDEX.md) | Design documents |
| Analysis | [03-analysis/](../03-analysis/_INDEX.md) | Analysis results |
| Report | [04-report/](../04-report/_INDEX.md) | Completion reports |

---

## Notes

{Additional notes or considerations about this folder}

---

## Update History

| Date | Changes |
|------|---------|
| {date} | Index created |
