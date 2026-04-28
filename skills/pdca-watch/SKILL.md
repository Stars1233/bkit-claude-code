---
name: pdca-watch
classification: workflow
classification-reason: Live PDCA dashboard tied to bkit's state machine + token ledger
deprecation-risk: none
effort: low
description: |
  Live PDCA dashboard ticking every 30s — reads pdca-status.json + token-ledger.ndjson tail, renders fixed-width panel via CC /loop.
  Triggers: pdca watch, live dashboard, watch progress, 실시간 대시보드, ライブダッシュボード, 实时仪表板, panel en vivo, tableau de bord.
argument-hint: "[feature]"
user-invocable: true
allowed-tools:
  - Read
  - Glob
imports: []
next-skill: null
pdca-phase: null
task-template: "[Watch] {feature}"
---

# PDCA Watch — Live Tick Dashboard

> v2.1.11 Sprint β FR-β4. Wraps `lib/dashboard/watch.js` over CC's
> `/loop` (v2.1.71+). Read-only — only consumes state files; never
> writes. Falls back to a single render when `/loop` is unsupported
> (E-β4-01).

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| (none) | Auto-resolve active feature from `pdca-status.primaryFeature` | `/pdca-watch` |
| `<feature>` | Watch a specific feature by name | `/pdca-watch bkit-v2111-integrated-enhancement` |

## Behavior

### Resolution

1. If `<feature>` is provided, use it verbatim.
2. Else read `.bkit/state/pdca-status.json` → `primaryFeature`, then
   `activeFeatures[0]` as fallback.
3. If still no feature → render `"No active PDCA feature. Start one
   with /pdca pm <feature>"` and exit.

### Tick (every 30s via `/loop`)

For each tick, `lib/dashboard/watch.js#renderTick` produces a panel with:

```
Watch  <feature> — tick N (HH:MM:SS)
─────────────────────────────────────────────────────────────
Phase: <phase>     Match: <%>    Iter: <n / 5>
Tokens: <in> in / <out> out · samples <N>
Est cost: $<USD>
─────────────────────────────────────────────────────────────
```

Data sources:
- Phase / matchRate / iterationCount: `pdca-status.features[<feature>]`
- Token totals: last 50 lines of `token-ledger.ndjson`
- Cost: Sonnet-class flat estimate ($3/Mtok in, $15/Mtok out)

### Termination

- Ctrl-C from user
- Feature `phase === 'completed'` or `phase === 'archived'`
- After max 60 ticks (≈30 min) — caller restarts if more time needed

## CC `/loop` Support

| CC Version | Behavior |
|------------|----------|
| ≥ 2.1.71 | Native `/loop 30s` ticker |
| < 2.1.71 | E-β4-01: single render + warning, no loop |
| Unknown | Same as < 2.1.71 (fail-safe) |

The check is performed via `watch.checkLoopSupport({ ccVersion })` —
caller passes the resolved CC version from `lib/infra/cc-version-checker`.

## Security

- Pure read on `.bkit/state/pdca-status.json` and `.bkit/runtime/token-ledger.ndjson`.
- Tail bounded to `MAX_TAIL_LINES = 200` regardless of caller input —
  defends against pathological NDJSON growth.
- No subprocess spawning, no network.
- PII redaction on the ledger is owned by the writer (Token Accountant);
  watch only reads what's already redacted.

## Module Dependencies

| Module | Function | Usage |
|--------|----------|-------|
| `lib/dashboard/watch.js` | `resolveFeature()` | Auto-detect when no arg |
| `lib/dashboard/watch.js` | `renderTick()` | One frame per tick |
| `lib/dashboard/watch.js` | `tailLedger()` | NDJSON tail (≤200) |
| `lib/dashboard/watch.js` | `checkLoopSupport()` | CC version gate |
| `lib/infra/cc-version-checker.js` | `getCurrent()` | Version source |

## Examples

```bash
# Auto-detect active feature
/pdca-watch

# Watch a specific feature
/pdca-watch bkit-v2111-integrated-enhancement
```

## Related

- `/pdca status` — single snapshot (no loop)
- `/control trust` — trust score informs auto-escalation
- `/pdca-fast-track` — Daniel-mode auto-approve checkpoints

ARGUMENTS:
