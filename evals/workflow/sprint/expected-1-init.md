# Sprint Eval Expected 1 — init action

## Step 1: Action Routing
1. Parse `/sprint init` → action='init', dispatch to `bkit:sprint` skill (not `/pdca`)
2. Skill invokes `scripts/sprint-handler.js` `handleSprintAction('init', args, deps)`

## Step 2: Args Parsing
3. id='q2-launch', name='Q2 Launch', features=['auth', 'payment'], trustLevel='L3'
4. Defaults applied: phase='prd', context filled with empty WHY/WHO/RISK/SUCCESS/SCOPE
5. validateSprintInput → `{ ok: true }`

## Step 3: Entity Creation
6. Domain `createSprint(input)` returns Sprint entity (19 fields) with:
   - id, name, features, featureMap
   - phase='prd', status='pending'
   - autoRun with trustLevelAtStart='L3'
   - qualityGates initialized (M3:0/0 ✅, S2:0/100 ❌, S4:false/true ❌, others null)
   - autoPause.armed = ['QUALITY_GATE_FAIL', 'ITERATION_EXHAUSTED', 'BUDGET_EXCEEDED', 'PHASE_TIMEOUT']

## Step 4: Persistence
7. `infra.stateStore.save(sprint)` atomic write to `.bkit/state/sprints/q2-launch.json`
8. Atomic = tmp file + rename (matches `lib/core/state-store.js` baseline)
9. PDCA `.bkit/state/pdca-status.json` byte-unchanged (orthogonal)

## Step 5: Event Emission
10. `SprintEvents.SprintCreated({ sprintId, name, phase: 'prd' })` emitted via `infra.eventEmitter`

## Step 6: Return Value
11. `{ ok: true, sprint: <entity>, sprintId: 'q2-launch' }`

## Failure Modes (must reject)
- Invalid id: `Q2-Launch` (uppercase) → `{ ok: false, error: 'invalid_input', errors: [...] }`
- Invalid id: `q2 launch` (space) → reject
- Missing name: `{ id: 'q2-launch' }` → `{ ok: false, error: 'init requires { id, name }' }`
- Duplicate id: second init with same id → state overwrite warning (or reject — currently overwrites, gap)
