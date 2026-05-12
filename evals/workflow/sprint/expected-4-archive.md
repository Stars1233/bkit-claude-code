# Sprint Eval Expected 4 — archive

## Step 1: Action Routing
1. Parse `/sprint archive q2-launch` → action='archive', args={id:'q2-launch'}
2. Dispatch to `handleArchive(args, infra)` (no deps needed beyond infra)

## Step 2: Load + Idempotency Check
3. `infra.stateStore.load('q2-launch')` returns existing sprint
4. If sprint.phase === 'archived' → return `{ ok: true, alreadyArchived: true }` (idempotent)
5. If sprint not found → return `{ ok: false, error: 'Sprint not found' }`

## Step 3: Transition Validation
6. `canTransitionSprint(sprint.phase, 'archived')` returns `{ ok: true }`
7. Allowed transitions to archived: report → archived OR any phase if explicit force flag (not in current scope)

## Step 4: S4 Quality Gate Check
8. Check sprint.qualityGates.S4_archiveReadiness
9. If S4.passed !== true → return `{ ok: false, reason: 'gate_failed', gate: 'S4_archiveReadiness', current: false }`
10. S4 is unique terminal gate — must be true to allow archive

## Step 5: Apply Terminal State
11. cloneSprint(sprint, { phase: 'archived', status: 'archived', archivedAt: now })
12. phaseHistory: close current entry (exitedAt + durationMs), append final {phase:'archived', enteredAt:now}

## Step 6: Persist + Emit
13. `infra.stateStore.save(sprint)` atomic write
14. Emit `SprintEvents.SprintArchived({ sprintId, archivedAt, finalPhase: previous })`

## Step 7: Return
15. `{ ok: true, sprint: <final>, archivedAt: <ISO>, message: 'Sprint archived. State preserved.' }`

## Terminal State Enforcement (post-archive)
- `/sprint phase <archived-id> --to <anything>` must reject with `{ ok: false, reason: 'sprint_archived' }`
- `/sprint start <archived-id>` must reject with `{ ok: false, reason: 'sprint_archived' }`
- `/sprint status <archived-id>` must still work (read-only allowed)
- `/sprint list` must show archived sprints distinctly (status='archived')
- Only `/sprint fork <archived-id> --new <newId>` is allowed (creates new sprint from archived template)

## Failure Modes
- S4 fail: explicit gate failure with measurement
- Invalid transition (rare — only if sprint.phase is itself invalid): reject
- Concurrent archive request: atomic stateStore.save prevents race (Sprint 3 baseline)
