# Sprint Eval Prompt 1 — init action routing

User request: `/sprint init q2-launch --name "Q2 Launch" --features auth,payment --trust L3`

Test:
1. Skill routing — `/sprint init` must invoke `bkit:sprint` skill (not `/pdca`)
2. Args parsing — id='q2-launch', name='Q2 Launch', features=['auth','payment'], trust='L3'
3. Defaults — phase='prd', context auto-populated with WHY/WHO/RISK/SUCCESS/SCOPE blank fields
4. Persistence — atomic write to `.bkit/state/sprints/q2-launch.json` via `lib/infra/sprint/sprint-state-store.adapter.js`
5. Validation — invalid id (e.g., uppercase or spaces) must reject via `validateSprintInput`

Context: No existing sprint with id='q2-launch'. PDCA `.bkit/state/pdca-status.json` exists with other features — must NOT be mutated (orthogonal coexistence, L3 contract SC-08 invariant).
