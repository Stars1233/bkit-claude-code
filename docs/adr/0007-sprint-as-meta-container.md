---
number: 0007
title: Sprint as Meta Container Above PDCA 9-Phase
status: Proposed
date: 2026-05-12
deciders: kay kim (POPUP STUDIO PTE. LTD.)
consulted: bkit-impact-analyst (sprint primitives extraction), user (intent clarification)
informed: bkit contributors, plugin end-users
trigger: User request — generic sprint capability for bkit plugin (not bkit internal dev sprint)
related:
  - master-plan: docs/01-plan/features/sprint-management.master-plan.md
  - design: (pending) docs/02-design/features/sprint-management.design.md
  - module: (pending) lib/domain/sprint/, lib/application/sprint-lifecycle/
  - existing: lib/domain/pdca-lifecycle/, lib/application/pdca-lifecycle/
  - related-adr: 0005-application-layer-pilot
supersedes: (none)
superseded-by: (none)
---

# ADR 0007 — Sprint as Meta Container Above PDCA 9-Phase

## Status

**Proposed** (2026-05-12) — Target acceptance: v2.1.13 Plan phase completion (5/14).

## Context

bkit 사용자가 multi-feature 작업 묶음 (release, milestone, 분기 작업)을 운영할 때 **상위 컨테이너**가 부재. 현재 bkit은 단일 feature 단위 PDCA만 제공 (frozen 9-phase: pm/plan/design/do/check/act/qa/report/archive — ADR 0005 invariant).

사용자 의도:
- bkit 설치한 누구나 사용할 수 있는 generic capability (gpters-portal 같은 도메인 특화 X)
- Sprint별 PDCA-equivalent 7-phase 흐름 (PRD/Plan → Design → Do → Iterate → QA → Report)
- 여러 Feature를 하나의 Sprint로 묶기

gpters-portal reference (`/Users/popup-kay/Documents/GitHub/agentkay/gpters-renewal/gpters-portal/.claude`)에서 30-sprint matrix는 도메인 특화이므로 **추상 primitives만 추출**:
- Sprint State Machine
- 7-phase 흐름
- Quality Gate auto-verify
- Template-driven 문서
- Matrix 자동 동기화
- Context Anchor 보존
- §8 Test Plan Matrix (5-layer)
- Specialist Agent 위임

이 primitives를 bkit의 기존 자산 (PDCA 9-phase / Orchestrator 5 modules / Hook 21 events / Quality Gates M1-M10 / Clean Architecture 4-Layer / Trust Score L0-L4 / Port-Adapter 7 pairs)과 통합하면서 **PDCA 9-phase invariant**를 깨지 않는 설계가 필요.

## Decision

Sprint는 **frozen PDCA 9-phase의 메타 컨테이너**로 정의한다. 핵심 결정 4건:

### 결정 1 — PDCA 9-phase enum 변경 없음

`lib/domain/pdca-lifecycle/phases.js`의 `PHASES` enum은 `Object.freeze`로 그대로 보존 (ADR 0005 invariant). Sprint는 별도 enum (`SPRINT_PHASES`)으로 정의하여 PDCA 9-phase와 독립 운영.

### 결정 2 — 3-tier 계층 구조

```
Sprint (사용자 정의 작업 묶음)
  └─ Feature (기존 bkit PDCA 단위, 9-phase frozen)
      └─ Task (TaskCreate / TaskUpdate Task Management System)
```

- **Sprint**: 메타 컨테이너. 자체 7-phase 흐름 (별도 enum). 1개 이상 Feature 포함.
- **Feature**: 기존 bkit PDCA 9-phase 단위. Sprint 없이도 운영 가능 (backward compat).
- **Task**: bkit Task Management System의 최소 단위. Sprint phase 진입 시 자동 spawn.

### 결정 3 — Sprint↔Feature 매핑 보존

`.bkit/state/sprint-status.json` root state + `.bkit/state/sprints/{name}.json` 개별 state + `.bkit/runtime/sprint-feature-map.json` 역방향 lookup. 한 feature는 한 sprint에만 매핑 (1:N 관계, sprint:features = 1:many).

### 결정 4 — Sprint 미사용 시 backward compat

기존 PDCA 사용자는 **변경 없음**. `/pdca *` 명령은 그대로 작동. Sprint는 **opt-in** 기능 (사용자가 `/sprint init {name}` 호출 시에만 활성화). `.bkit/state/sprint-status.json` 파일이 없으면 PDCA만 동작.

## Consequences

### Positive

1. **Backward compat 보장** — 기존 PDCA 사용자 영향 0건. v2.1.12 작업 흐름 그대로.
2. **PDCA 9-phase invariant 보존** — ADR 0005 깨지 않음. Domain layer purity 유지 (0 forbidden imports).
3. **Clean Architecture 일관성** — Sprint도 4-Layer (Domain / Application / Infrastructure / Presentation) 그대로 적용. 새 Port `sprint-store.port` 추가 가능 (옵션, v2.1.14+).
4. **Generic capability** — 도메인 자유 (사용자가 sprint name + scope + 기간 자유 정의). gpters의 30-sprint matrix 같은 강제 X.
5. **Quality Gates 확장 가능** — 기존 M1-M10에 Sprint-specific S1-S4 (dataFlowIntegrity / featureCompletion / velocity / archiveReadiness) 추가. bkit.config.json 통합.

### Negative

1. **사용자 인지 부담** — Sprint vs Feature 구분 학습 필요. 가이드 문서 + CLAUDE.md update 필수.
2. **상태 동기화 복잡도** — Feature PDCA 상태 + Sprint phase 상태 이중 추적. 충돌 가능성 (예: Sprint phase=qa인데 매핑된 feature는 pdcaPhase=do). state-store.port에서 일관성 검증 필요.
3. **Trust Score 영향 평가 필요** — Sprint completion이 Trust Score 6-component에 어떻게 반영될지 별도 ADR / 결정 필요 (Open Decision D4 = defer).

### Neutral

- Sprint 신규 LOC ~2,400 (Domain 250 + Application 650 + Infrastructure 400 + Presentation 500 + Templates 400 + Tests 500 + Docs 300).
- 신규 hook event 0건 (기존 21 events 24 blocks 재사용).
- 신규 Port 0건 in v2.1.13 first PR (state-store.port 재사용).

## Alternatives Considered

### Alternative 1 — Sprint를 PDCA 9-phase에 통합 (rejected)

PDCA enum에 `SPRINT` phase 추가. → **거부** 이유:
- ADR 0005 invariant 깨짐 (frozen 9-phase 변경)
- 30+ import 사이트 영향
- Sprint는 메타 컨테이너 성격 — PDCA와 다른 차원

### Alternative 2 — Sprint = Multi-feature parallel batch (rejected)

Sprint를 feature parallel 실행기로만 정의 (state machine 없이). → **거부** 이유:
- 사용자 요구사항 미충족 (PRD/Plan/Design/Iterate/QA/Report 흐름 명시)
- 단순 batch는 기존 TaskCreate parallel로 가능

### Alternative 3 — Sprint를 별도 plugin으로 분리 (rejected)

`bkit-sprint` 별도 plugin. → **거부** 이유:
- Trust Score / Quality Gates / Orchestrator 통합 비용 큼
- 사용자 설치 부담 증가
- 메모리 enforcer / Defense Layer 통합 어려움

## Implementation Notes

- Domain layer 신규: `lib/domain/sprint/` 5 files (phases / transitions / entity / validators / events)
- Application layer 신규: `lib/application/sprint-lifecycle/` 8 files
- Infrastructure layer 신규: `lib/infra/sprint/` 4 files
- 변경 0: `lib/domain/pdca-lifecycle/` (PDCA 9-phase invariant)
- 변경 0: `lib/application/pdca-lifecycle/` (PDCA transitions)

## Verification

- `scripts/check-domain-purity.js` 통과 (sprint domain 0 forbidden imports)
- `scripts/check-deadcode.js` 통과 (sprint 신규 모듈 모두 사용처 있음)
- ADR 0005 ADR 0007 양립 가능 검증 (PDCA enum 변경 0)
- L1 unit 8 TC + L2 integration 12 TC 모두 PASS

## References

- Master plan: `docs/01-plan/features/sprint-management.master-plan.md` §3.1
- gpters reference: `/Users/popup-kay/Documents/GitHub/agentkay/gpters-renewal/gpters-portal/.claude/rules/sprint-rules.md`
- bkit context analysis: Phase B Explore agent (cf. master plan §3)
- Related: ADR 0005 (Application Layer Pilot)
