---
number: 0008
title: Sprint Phase Enum (7-phase + ARCHIVED) + PDCA Mapping
status: Proposed
date: 2026-05-12
deciders: kay kim (POPUP STUDIO PTE. LTD.)
consulted: bkit-impact-analyst, user (intent clarification — PRD/Plan→Design→Do→Iterate→QA→Report flow)
informed: bkit contributors, plugin end-users
trigger: User explicit requirement — Sprint별 (prd or plan) > design > do > iterate(100%) > qa > report 흐름
related:
  - master-plan: docs/01-plan/features/sprint-management.master-plan.md §5
  - depends-on: 0007-sprint-as-meta-container
  - module: (pending) lib/domain/sprint/sprint-phase.js, sprint-transitions.js
  - related-adr: 0005 (PDCA 9-phase frozen invariant)
supersedes: (none)
superseded-by: (none)
---

# ADR 0008 — Sprint Phase Enum (7-phase + ARCHIVED) + PDCA Mapping

## Status

**Proposed** (2026-05-12) — Target acceptance: v2.1.13 Plan phase completion (5/14).

## Context

ADR 0007에서 Sprint를 PDCA 9-phase의 메타 컨테이너로 결정. 이제 Sprint 자체의 phase enum + transitions adjacency map + PDCA 9-phase 매핑을 frozen 형태로 영구화해야 한다.

사용자 명시 요구사항:
> "sprint 별로 prd or plan > design > do > iterate(100% 목표) > qa(ui > api > db > api > ui 등 데이터의 처리 및 흐름) > report"

핵심 차이점 (PDCA 9-phase vs Sprint phase):
- PDCA는 `pm` (Product Manager initial) + `plan` (separate) — Sprint는 `prd` (사용자 시작 옵션) + `plan` (사용자 시작 옵션) 양자택일
- PDCA는 `check` + `act` 분리 — Sprint는 `iterate`로 통합 (matchRate 100% 목표, max 5 iter)
- PDCA는 `report` → `archive` 별도 — Sprint도 `report` → `archived` 별도

## Decision

### 결정 1 — Sprint Phase Enum (8값, frozen Object.freeze)

```javascript
// lib/domain/sprint/sprint-phase.js
const SPRINT_PHASES = Object.freeze({
  PRD: 'prd',
  PLAN: 'plan',
  DESIGN: 'design',
  DO: 'do',
  ITERATE: 'iterate',
  QA: 'qa',
  REPORT: 'report',
  ARCHIVED: 'archived',
});

const SPRINT_PHASE_ORDER = Object.freeze([
  SPRINT_PHASES.PRD,
  SPRINT_PHASES.PLAN,
  SPRINT_PHASES.DESIGN,
  SPRINT_PHASES.DO,
  SPRINT_PHASES.ITERATE,
  SPRINT_PHASES.QA,
  SPRINT_PHASES.REPORT,
  SPRINT_PHASES.ARCHIVED,
]);

module.exports = { SPRINT_PHASES, SPRINT_PHASE_ORDER };
```

### 결정 2 — Sprint Transitions Adjacency Map (frozen Object.freeze)

```javascript
// lib/domain/sprint/sprint-transitions.js
const SPRINT_TRANSITIONS = Object.freeze({
  prd:      [SPRINT_PHASES.PLAN, SPRINT_PHASES.ARCHIVED],
  plan:     [SPRINT_PHASES.DESIGN, SPRINT_PHASES.ARCHIVED],
  design:   [SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED],
  do:       [SPRINT_PHASES.ITERATE, SPRINT_PHASES.QA, SPRINT_PHASES.ARCHIVED],
  iterate:  [SPRINT_PHASES.QA, SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED],
  qa:       [SPRINT_PHASES.REPORT, SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED],
  report:   [SPRINT_PHASES.ARCHIVED],
  archived: [],
});

function canTransition(from, to) {
  return SPRINT_TRANSITIONS[from]?.includes(to) ?? false;
}

function legalNextPhases(from) {
  return SPRINT_TRANSITIONS[from] || [];
}

module.exports = { SPRINT_TRANSITIONS, canTransition, legalNextPhases };
```

핵심 전이 규칙:
- **prd ↔ plan 시작 옵션**: 사용자가 `/sprint init --phase prd` 또는 `--phase plan` 선택. 양자택일.
- **do → iterate** (auto-trigger): matchRate < 100% 감지 시 자동 진입 (사용자 100% 목표).
- **iterate → do**: max 5 iter 내 auto-fix 후 재구현 필요 시.
- **qa → do**: QA fail (S1 dataFlowIntegrity < 100) 시 implementation 복귀.
- **All → archived**: 모든 phase에서 archived 직행 가능 (사용자 abort).
- **report → archived only**: report 후에는 archived만 가능 (terminal path).
- **archived → []**: terminal state, 전이 불가 (readonly).

### 결정 3 — Sprint↔PDCA Phase 매핑 (참고용, 강제 없음)

| Sprint Phase | Feature PDCA Phase (참고) | 의미 |
|-------------|--------------------------|------|
| PRD or PLAN | pm, plan | 사용자 시작 선택 |
| DESIGN | design | Sprint 내 모든 Feature design 통합 |
| DO | do | 모든 Feature 병렬 구현 |
| ITERATE | check + act 반복 | matchRate < 100% 시 ACT → DO loop |
| QA | qa | UI→API→DB→API→UI 7-Layer 검증 (S1 gate) |
| REPORT | report | Sprint 종합 보고서 + cumulative KPI |
| ARCHIVED | archive | Sprint 종료, carry items 식별 |

**매핑은 참고용** — Sprint phase 진입 시 Feature PDCA phase 자동 동기화 X (각 Feature는 자체 PDCA 사이클 독립 유지). Sprint orchestrator가 phase 코디네이션만 담당.

### 결정 4 — PRD or PLAN 양자택일 시작

`/sprint init {name} --phase prd` 또는 `--phase plan` 명시. Default = `prd` (PM-Lead 4-agent workflow 권장).

`prd` 시작 시: PRD 작성 후 `plan` 진입.
`plan` 시작 시: PRD skip, 바로 plan 작성. (실험적 sprint, prototype 등에 적합)

## Consequences

### Positive

1. **사용자 요구사항 100% 반영** — PRD/Plan → Design → Do → Iterate → QA → Report 흐름 그대로.
2. **PDCA 9-phase invariant 보존** — ADR 0005 깨지 않음.
3. **Frozen enum → 안정성 보장** — Object.freeze로 runtime 변경 불가, ADR 0008 영구화.
4. **iterate phase에 100% 목표 명시** — 사용자 의도 (matchRate 100%) 명확.
5. **qa → do 역방향 transition** — QA fail 시 implementation 복귀 자연스럽게 표현.

### Negative

1. **PDCA vs Sprint phase 인지 부담** — 사용자가 두 enum 학습. 가이드 문서 필수.
2. **iterate가 PDCA check+act 통합** — bkit 기존 사용자 직관과 다름. CLAUDE.md update에 명시.
3. **prd or plan 양자택일** — 사용자에게 시작 시점 결정 요구 (가이드 필요).

## Alternatives Considered

### Alternative 1 — Sprint phase = PDCA 9-phase 동일 (rejected)

Sprint phase enum = PDCA `PHASES` 그대로. → 거부:
- 사용자 요구사항 `iterate(100% 목표)` 명시 미충족 (PDCA에는 iterate 명시 phase 없음)
- check / act 분리 vs iterate 통합 차이

### Alternative 2 — 6-phase (PRD/Plan 통합) (rejected)

PRD와 Plan을 하나의 phase로. → 거부:
- 사용자 요구사항 `prd or plan` 양자택일 명시
- PRD vs Plan은 다른 활동 (PRD = 제품 요구 / Plan = 구현 계획)

### Alternative 3 — Plan→Design→Build→Test→Deploy (5-phase) (rejected)

전통 Waterfall 흐름. → 거부:
- 사용자 요구사항 미충족 (iterate phase 명시 안 됨)
- bkit PDCA와 정합성 부족

## Implementation Notes

- `lib/domain/sprint/sprint-phase.js` ~50 LOC
- `lib/domain/sprint/sprint-transitions.js` ~80 LOC (TRANSITIONS + canTransition + legalNextPhases + visualize helper)
- Domain layer 0 forbidden imports invariant 보존
- ESLint `no-restricted-imports` 규칙 적용

## Verification

- `lib/domain/sprint/sprint-phase.js` Object.freeze 검증 (runtime mutation 시 throw)
- `lib/domain/sprint/sprint-transitions.js` adjacency map 검증
  - `canTransition('prd', 'plan')` === true
  - `canTransition('plan', 'design')` === true
  - `canTransition('do', 'iterate')` === true (auto-iterate 핵심)
  - `canTransition('qa', 'do')` === true (역방향 fail-back)
  - `canTransition('report', 'do')` === false
  - `canTransition('archived', 'plan')` === false
- `scripts/check-domain-purity.js` 통과 (sprint domain 0 forbidden imports)

## References

- Master plan: `docs/01-plan/features/sprint-management.master-plan.md` §5
- User requirement: "(prd or plan) > design > do > iterate(100%) > qa > report"
- gpters PDCA 7-phase reference: `/Users/popup-kay/Documents/GitHub/agentkay/gpters-renewal/gpters-portal/.claude/rules/sprint-rules.md` (줄 54~69)
- Depends on: ADR 0007 (Sprint as Meta Container)
