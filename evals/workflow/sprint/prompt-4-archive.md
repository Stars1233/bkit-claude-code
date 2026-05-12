# Sprint Eval Prompt 4 — archive (terminal state enforcement)

User request: `/sprint archive q2-launch`

Context:
- Sprint q2-launch current state: phase='report', status='active'
- S4 archiveReadiness gate: current=true, threshold=true, passed=true ✅
- Report document exists at docs/04-report/features/q2-launch.report.md
- All 3 features (auth/payment/reports) completed (S2 featureCompletion = 100/100 ✅)

Test:
1. Skill must validate sprint.phase !== 'archived' (idempotent rejection if already archived)
2. Must check S4 archiveReadiness gate before allowing archive
3. Must check canTransitionSprint('report', 'archived') returns `{ ok: true }`
4. Must set phase='archived', status='archived', archivedAt=now
5. Must persist final state atomically + emit SprintArchived event
6. After archive, must enforce terminal state (subsequent /sprint phase X must reject)
7. If S4 fails (e.g., features incomplete) → reject with explicit S4 failure reason
