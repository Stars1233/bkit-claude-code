# Sprint Eval Prompt 3 — phase transition validation

User request: `/sprint phase q2-launch --to design`

Context:
- Sprint q2-launch current state on disk: phase='plan', status='active'
- Plan document exists at docs/01-plan/features/q2-launch.plan.md
- Quality gates: M3 criticalIssueCount=0 ✅, M8 designCompleteness=null (not yet measured)
- phaseHistory: [{phase:'prd', enteredAt: T-2h, exitedAt: T-1h}, {phase:'plan', enteredAt: T-1h, exitedAt: null}]

Test:
1. Skill must validate transition plan → design via `canTransitionSprint('plan', 'design')` returning `{ ok: true }` (NOT boolean)
2. Must check active quality gates for exiting 'plan' phase (M8 designCompleteness gate)
3. If quality gate fails → reject with `{ ok: false, reason: 'gate_failed', gates: [...] }`
4. Must update phaseHistory: prior 'plan' entry gets exitedAt + durationMs, new 'design' entry appended
5. Must emit SprintPhaseChanged event with from='plan', to='design', reason='manual_advance'
6. Must persist updated state atomically
7. Invalid transition (e.g., `/sprint phase q2-launch --to archived`) must reject — `canTransitionSprint('plan', 'archived')` returns `{ ok: false, reason: 'illegal_transition' }`
