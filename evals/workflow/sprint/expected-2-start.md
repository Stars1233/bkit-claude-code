# Sprint Eval Expected 2 — start (resume existing)

## Step 1: Action Routing + Args
1. Parse `/sprint start` → action='start', id='q2-launch', trustLevel='L3'
2. Dispatch to `handleSprintAction('start', args, deps)` → `handleStart(args, infra, deps)`

## Step 2: Load Existing State
3. `infra.stateStore.load('q2-launch')` returns existing sprint entity from `.bkit/state/sprints/q2-launch.json`
4. If load returns null → return `{ ok: false, error: 'Sprint not found: q2-launch. Use /sprint init q2-launch first' }`
5. Loaded sprint must have phase='plan', phaseHistory.length=2 (preserved from init + phase advance)

## Step 3: Apply Trust Scope (NOT recreate)
6. Resolve scope from SPRINT_AUTORUN_SCOPE['L3'] → { stopAfter: 'qa', requireApproval: false, manual: false }
7. `cloneSprint(existing, { autoRun: {...existing.autoRun, scope, startedAt: now}, startedAt: existing.startedAt || now })`
8. **CRITICAL**: Do NOT call createSprint() — that would reset phase='prd' and overwrite phaseHistory
9. phaseHistory PRESERVED (existing 2 entries intact)
10. phase='plan' PRESERVED (do not reset to 'prd')

## Step 4: Persist + Emit
11. `infra.stateStore.save(sprint)` atomic write
12. Emit `SprintEvents.SprintStarted({ sprintId, startedAt, finalPhase: 'plan', trustLevel: 'L3' })`

## Step 5: Auto-run Loop (if scope.manual === false)
13. Enter auto-run loop: while sprint.phase !== scope.stopAfter && loopCount < HARD_LOOP_LIMIT
14. At each iteration: invoke phaseHandlers[sprint.phase], check quality gates, advance via computeNextPhase
15. L3 stopAfter='qa' → loop until phase reaches 'qa', then exit
16. If auto-pause trigger fires → return early with `{ ok: true, paused: true, trigger: '...' }`

## Step 6: Return
17. `{ ok: true, sprint: <final>, finalPhase: 'qa' (or paused phase), iterations: N }`

## Failure Modes
- Sprint not initialized: return error, do not silently create
- Sprint already archived (terminal): return `{ ok: false, error: 'sprint archived, cannot start' }`
- Invalid trustLevel (e.g., 'L99'): fallback to L2 default + warning

## ★ BUG (currently fails this eval)
Current implementation (lib/application/sprint-lifecycle/start-sprint.usecase.js:164):
```
let sprint = createSprint({ ...input, trustLevelAtStart: trustLevel });
```
This unconditionally creates a NEW sprint, ignoring existing state. Result:
- phase reset to 'prd' (overwrites 'plan')
- phaseHistory replaced with 1 fresh entry (loses 2 prior entries)
- This eval will fail until fix: load existing → cloneSprint OR createSprint only if absent
