# Sprint Eval Prompt 2 — start (resume existing sprint)

User request: `/sprint start q2-launch --trust L3`

Context:
- Sprint q2-launch was previously initialized via `/sprint init` 1 hour ago
- Current state on disk: phase='plan' (user manually advanced via `/sprint phase q2-launch --to plan`)
- `.bkit/state/sprints/q2-launch.json` contains phase='plan' with phaseHistory of 2 entries (prd 1h ago, plan 30min ago)

Test:
1. Skill must LOAD existing sprint from stateStore (not call createSprint again)
2. Must apply Trust Level scope (L3 → stopAfter='qa')
3. Must preserve existing phase='plan' (NOT reset to 'prd')
4. Must preserve phaseHistory 2 entries (NOT replace with 1-entry fresh history)
5. Must emit SprintStarted event with current phase
6. autoRun.startedAt timestamp updated, but sprint.startedAt preserved from init
7. If sprint not found in stateStore, must return error 'use /sprint init <id> first' (not silently create)
