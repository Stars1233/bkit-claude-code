---
name: bkit-explore
classification: capability
classification-reason: Discovery surface — independent of bkit's PDCA workflow
deprecation-risk: none
effort: low
description: |
  Browse installed bkit skills, agents, and evals via lib/discovery/explorer.js (filesystem scan, no subprocess).
  Triggers: bkit explore, list skills, skill discovery, browse skills, 스킬 탐색, スキル探索, 技能探索, explorar, explorer.
argument-hint: "[category] | evals | --level <Starter|Dynamic|Enterprise>"
user-invocable: true
allowed-tools:
  - Read
  - Glob
  - Grep
imports: []
next-skill: null
pdca-phase: null
task-template: "[Explore] {target}"
---

# bkit Explore — Skill / Agent / Eval Discovery

> v2.1.11 Sprint β FR-β1. Wraps `lib/discovery/explorer.js` to give
> Yuki + first-run users a single-command surface that answers
> "what's actually installed and how do I find it?"

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| (none) | Show all categories with counts + first-line description | `/bkit-explore` |
| `<category>` | One of `starter`, `dynamic`, `enterprise`, `pdca-core`, `utility` | `/bkit-explore dynamic` |
| `evals` | List skills with an `evals/{cls}/{skill}/eval.yaml` definition | `/bkit-explore evals` |
| `--level <L>` | Filter by Starter / Dynamic / Enterprise (cumulative) | `/bkit-explore --level Starter` |

## Behavior

### Default (no args) — full tree

1. Call `explorer.listAll()` to read `skills/*/SKILL.md` + `agents/*.md`.
2. Render category-grouped table: skill name + first-sentence description.
3. Footer: `Total: N skills · M agents · K evals`.

### `<category>` — single bucket

1. Validate `category` against `explorer.CATEGORIES`.
2. Render skill table + agent table for that bucket only.
3. Suggest `/bkit-explore --level Starter` if user looks lost.

### `evals` — eval coverage

1. Call `explorer.listEvals()` and group by classification (`workflow`,
   `capability`, `hybrid`).
2. Render counts + skill names per group.
3. Tip: `/bkit-evals run <skill>` to execute one.

### `--level <L>` — Starter / Dynamic / Enterprise filter

1. `Starter` returns `starter` + `pdca-core` + `utility`.
2. `Dynamic` adds `dynamic` (cumulative).
3. `Enterprise` adds `enterprise`.

## Output Layout (Design §5.1)

```
bkit Explore — 39 Skills · 36 Agents · K Evals
─────────────────────────────────────────────────
📂 starter (1 skill / 2 agents)
   /starter         — Static web kit
   🤖 starter-guide — Beginner agent
   🤖 pipeline-guide — Phase walk-through

📂 dynamic (8 skills / 2 agents)
   /dynamic           — bkend.ai fullstack
   /bkend-auth        — Authentication patterns
   ...
─────────────────────────────────────────────────
Footer: Try /bkit-explore --level Starter
```

## Security

- Pure filesystem scan — no `child_process`, no network.
- `category` argument is validated against `explorer.CATEGORIES` (5-tuple
  whitelist); anything else returns `null` and renders a usage hint.
- `--level <L>` validated against `explorer.LEVELS` (`Starter` /
  `Dynamic` / `Enterprise`).
- Agent/skill descriptions read from local `*.md` files only —
  no remote fetch.

## Module Dependencies

| Module | Function | Usage |
|--------|----------|-------|
| `lib/discovery/explorer.js` | `listAll()` | Default tree |
| `lib/discovery/explorer.js` | `listByCategory(cat)` | Single bucket |
| `lib/discovery/explorer.js` | `listByLevel(level)` | Cumulative filter |
| `lib/discovery/explorer.js` | `listEvals()` | `evals/` scan |

## Categories (Design §3.2)

| Category | Scope |
|----------|-------|
| `starter` | Static web + beginner-onboarding skills/agents |
| `dynamic` | bkend.ai fullstack + Phase 1~6 build pipeline |
| `enterprise` | Architecture + Phase 7~9 deployment + audit |
| `pdca-core` | PDCA cycle + QA + PM agents |
| `utility` | Cross-cutting (bkit, control, audit, evals) |

## Examples

```bash
# Full tree
/bkit-explore

# One category
/bkit-explore dynamic

# Cumulative level filter
/bkit-explore --level Starter

# Evals coverage
/bkit-explore evals
```

## Related

- `/bkit-evals run <skill>` — execute eval suite for one skill
- `/control trust` — trust score informs which categories you can self-serve
- `/pdca status` — find your active feature

ARGUMENTS:
