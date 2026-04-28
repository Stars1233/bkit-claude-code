---
name: pdca-fast-track
classification: workflow
classification-reason: PDCA flow modifier — bypasses Checkpoint 1-8 user gates
deprecation-risk: none
effort: low
description: |
  Daniel-mode fast-track that auto-approves Checkpoint 1-8 when Trust ≥ 80, fastTrack enabled, and Design doc exists. Falls back to L2 + manual gates when any precondition fails. Decisions logged to .bkit/runtime/fast-track-log.json.
  Triggers: pdca fast-track, fast track, skip checkpoints, auto approve, daniel mode,
  pdca 패스트 트랙, 체크포인트 스킵, 자동 승인, 다니엘 모드,
  pdca ファストトラック, チェックポイント省略,
  pdca 快速通道, 跳过检查点,
  pdca via rapida, omitir puntos de control,
  pdca voie rapide, ignorer points de controle,
  pdca Schnellspur, Checkpoints uberspringen,
  pdca corsia veloce, salta i checkpoint.
argument-hint: "<feature>"
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Glob
imports: []
next-skill: null
pdca-phase: null
task-template: "[Fast-Track] {feature}"
---

# PDCA Fast Track — Daniel's Track

> v2.1.11 Sprint β FR-β5. Wraps `lib/control/fast-track.js`. Provides a
> single auto-escalation gate for users who have already earned Trust
> ≥ 80 and produced a Design doc — Checkpoints 1-8 default to
> Recommended without prompting. Falls back to L2 + manual review the
> moment any preconditions fails (E-β5-01 / E-β5-02).

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `<feature>` | Feature name to engage fast-track for | `/pdca-fast-track bkit-v2111-integrated-enhancement` |

## Behavior

### Preconditions (all must pass; fail-open)

1. **Config enabled** — `bkit.config.json#control.fastTrack.enabled === true`
2. **Trust Score ≥ 80** — `.bkit/state/trust-profile.json#trustScore`
   ≥ `fastTrack.minTrustScore` (default 80)
3. **Design doc exists** — resolved via `bkit.config.json#pdca.docPaths.design`
   templates against `<feature>`

When any block, surface the reason with a remedy hint:

| Block | Remedy hint |
|-------|-------------|
| `disabled_in_config` | "Set `control.fastTrack.enabled = true` in bkit.config.json" |
| `trust_score_too_low` | "Run a few `/pdca check` cycles to raise trust" |
| `design_doc_missing` | "Run `/pdca design <feature>` first" |

### On engage (all preconditions pass)

1. Recommend Automation Level escalation L2 → `fastTrack.autoLevel`
   (default `L3`).
2. Persist engagement record to `.bkit/runtime/fast-track-log.json`:
   ```json
   {
     "engaged": true,
     "feature": "<feature>",
     "engagedAt": "<ISO>",
     "trustScore": 85,
     "autoLevel": "L3",
     "fallbackLevel": "L2",
     "skipCheckpoints": [1,2,3,4,5,6,7,8],
     "designPath": "docs/02-design/features/<feature>.design.md",
     "decisions": []
   }
   ```
3. Each Checkpoint 1-8 invocation calls `fast-track.recordCheckpoint`
   to append a decision entry (audit trail).
4. If a Checkpoint surfaces NO "Recommended" option, call
   `recordCheckpoint({ decision: 'fallback', reason: 'no_recommended' })`
   and pause to `fallbackLevel`.

## Security

- All file IO is rooted at `process.env.CLAUDE_PROJECT_DIR` (or repo root).
- Audit log JSON is OWASP A08-clean: no user-controlled keys; only
  whitelisted `checkpoint` (number), `decision` (enum), `reason`
  (sanitized string).
- Design doc patterns are read from `bkit.config.json` — no traversal
  via untrusted `feature` arg (pattern is `{feature}` placeholder only).
- Trust score read is fail-safe: missing file returns 0 (blocks engage).

## Module Dependencies

| Module | Function | Usage |
|--------|----------|-------|
| `lib/control/fast-track.js` | `evaluatePreconditions(feature)` | Block list |
| `lib/control/fast-track.js` | `engage(feature)` | Audit + record |
| `lib/control/fast-track.js` | `recordCheckpoint({...})` | Per-CP decision |
| `lib/control/fast-track.js` | `isCheckpointSkipped(n)` | Should we skip? |

## Examples

```bash
# Engage on a Design-complete feature
/pdca-fast-track bkit-v2111-integrated-enhancement

# Result if Trust < 80
# Block: trust_score_too_low (current 68 < required 80)

# Result if Design missing
# Block: design_doc_missing → run /pdca design first
```

## Related

- `/control trust` — current Trust Score breakdown
- `/control level <0-4>` — manual override
- `/pdca-watch` — observe progress while fast-tracking
- `/pdca design <feature>` — required prerequisite

ARGUMENTS:
