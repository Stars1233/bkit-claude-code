# Sprint Eval Expected 3 — phase transition

## Step 1: Action Routing
1. Parse `/sprint phase q2-launch --to design` → action='phase', args={id:'q2-launch', to:'design'}
2. Dispatch to `handleSprintAction('phase', args, deps)` → `handlePhase(args, infra, deps)`

## Step 2: Load + Validate
3. `infra.stateStore.load('q2-launch')` returns existing sprint with phase='plan'
4. `canTransitionSprint('plan', 'design')` returns `{ ok: true }` (valid forward transition)
5. Pattern is `{ ok: boolean, reason?: string }` — NOT boolean (Sprint 1 invariant)

## Step 3: Quality Gate Check (if gateEvaluator injected)
6. Resolve gates active for exiting 'plan' phase from ACTIVE_GATES_BY_PHASE[plan].exit
7. Evaluate each gate via deps.gateEvaluator(sprint, gateId)
8. If any gate.passed === false → return `{ ok: false, reason: 'gate_failed', gates: [...failed] }`
9. M8 (designCompleteness) is typically design-entry, may or may not gate 'plan' exit

## Step 4: Update PhaseHistory (Sprint 1 invariant pattern)
10. Find current entry (phase='plan', exitedAt=null), set exitedAt=now, compute durationMs=now-enteredAt
11. Append new entry: {phase:'design', enteredAt:now, exitedAt:null, durationMs:null}
12. cloneSprint(sprint, { phase: 'design', phaseHistory: [...updated] })

## Step 5: Emit + Persist
13. Emit `SprintEvents.SprintPhaseChanged({ sprintId, from:'plan', to:'design', reason:'manual_advance' })`
14. `infra.stateStore.save(sprint)` atomic write

## Step 6: Return
15. `{ ok: true, sprint: <updated>, from: 'plan', to: 'design' }`

## Failure Modes
- Invalid transition (plan → archived): `{ ok: false, reason: 'illegal_transition', expected: ['design'] }`
- Same phase (plan → plan): no-op or `{ ok: true, noop: true }`
- Sprint not found: `{ ok: false, error: 'Sprint not found' }`
- Sprint archived (terminal): `{ ok: false, reason: 'sprint_archived' }`
- Gate fail: documented above, no state change

## Sprint 1 Domain Layer Pattern Compliance
- canTransitionSprint MUST return `{ ok, reason? }` object (not boolean)
- All transitions go through canTransitionSprint, never direct phase assignment
