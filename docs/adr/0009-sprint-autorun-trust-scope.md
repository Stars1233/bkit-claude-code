---
number: 0009
title: /sprint start Default Auto-Run + Trust Level Conditional Scope + Auto-Pause Triggers
status: Proposed
date: 2026-05-12
deciders: kay kim (POPUP STUDIO PTE. LTD.)
consulted: user (D11-D14 결정 — auto-run scope, auto-pause, dashboard, prioritization)
informed: bkit contributors, plugin end-users
trigger: User explicit intent clarification — "/sprint start 하면 Plan → Design → Do → Iterate → QA → Report가 모두 자동으로 진행되어야"
related:
  - master-plan: docs/01-plan/features/sprint-management.master-plan.md §6, §11
  - depends-on: 0007, 0008
  - module: (pending) lib/application/sprint-lifecycle/start-sprint.usecase.js, advance-phase.usecase.js, auto-pause.js, lib/control/automation-controller.js (확장)
  - related-adr: 0005 (Application Layer)
supersedes: (none)
superseded-by: (none)
---

# ADR 0009 — /sprint start Default Auto-Run + Trust Level Conditional Scope + Auto-Pause Triggers

## Status

**Proposed** (2026-05-12) — Target acceptance: v2.1.13 Plan phase completion (5/14).

## Context

ADR 0008에서 Sprint phase enum + transitions 결정. 이제 `/sprint start` 명령의 **default behavior**를 영구화해야 한다.

사용자 의도 (명시 클래리피케이션 2026-05-12):
> "/sprint start 하면 Plan → Design → Do → Iterate → QA → Report가 모두 자동으로 진행되어야 하는데"

사용자 결정 (D11-D14, 2026-05-12 수렴):
- **D11**: Trust Level 조건부 scope (L4: Archive까지 / L3: Report에서 stop / L2: Design까지 / L1-L0: manual)
- **D12**: Auto-pause triggers 4건 모두 활성화 (Quality Gate fail / matchRate < 90 after 5 iter / Token budget / Phase timeout)
- **D13**: Dashboard 둘 다 (SessionStart 기본 + `/sprint watch` opt-in)
- **D14**: Master Plan v1.1 + ADR 우선

핵심 결정 사항:
1. `/sprint start` default behavior = auto-run
2. Trust Level별 stop point 정의
3. Auto-pause trigger 정책 + state schema
4. Dashboard 운영 정책

## Decision

### 결정 1 — `/sprint start` Default = Auto-Run

`/sprint start {name}`는 **자율 실행** (auto-run)이 default. `--manual` 플래그로 명시적 비활성화 가능.

```bash
/sprint start my-launch-q2-2026             # Auto-run, Trust Level scope
/sprint start my-launch-q2-2026 --manual    # Manual mode (각 phase 사용자 승인)
/sprint start my-launch-q2-2026 --from do   # do phase부터 시작
```

### 결정 2 — Trust Level Conditional Scope (D11 영구화)

```javascript
// lib/control/automation-controller.js
const SPRINT_AUTORUN_SCOPE = Object.freeze({
  L0: { lastAutoPhase: null,       stopAfter: 'init',      manual: true,  hint: false },
  L1: { lastAutoPhase: null,       stopAfter: 'init',      manual: true,  hint: true  },
  L2: { lastAutoPhase: 'design',   stopAfter: 'design',    manual: false, hint: true  },
  L3: { lastAutoPhase: 'report',   stopAfter: 'report',    manual: false, hint: true  },  // ★ default 권장
  L4: { lastAutoPhase: 'archived', stopAfter: 'archived',  manual: false, hint: false },  // fastTrack on 조건
});
```

Trust Level scope 매트릭스:

| Trust | 자율 실행 phase 범위 | Stop after | 사용자 다음 명령 |
|-------|--------------------|-----------|----------------|
| L0 (Manual) | (none) | init | `/sprint phase next` 매 단계 |
| L1 (Semi-auto) | (none, hint만) | init | `/sprint phase next` (hint 따라) |
| L2 (Guided) | prd/plan → design | design 완료 | `/sprint phase do` (Do부터 사용자 승인) |
| L3 (Auto, default) | prd/plan → ... → report | report 완료 | `/sprint archive` (검토 후) |
| L4 (Full-auto, fastTrack on) | prd/plan → ... → archived | archived | (자동 완료) |

### 결정 3 — Auto-Pause Triggers (4건 모두 활성화, D12 영구화)

자율 실행 중 다음 4건 발생 시 즉시 일시정지 (state: active → paused) + 사용자 결정 대기:

```javascript
// lib/application/sprint-lifecycle/auto-pause.js
const AUTO_PAUSE_TRIGGERS = Object.freeze({
  QUALITY_GATE_FAIL: {
    condition: (sprint) =>
      sprint.qualityGates.M3_criticalIssueCount?.current > 0 ||
      sprint.qualityGates.S1_dataFlowIntegrity?.current < 100,
    severity: 'HIGH',
  },
  ITERATION_EXHAUSTED: {
    condition: (sprint) =>
      (sprint.iterateHistory?.length ?? 0) >= 5 &&
      (sprint.kpi.matchRate ?? 0) < 90,
    severity: 'HIGH',
  },
  BUDGET_EXCEEDED: {
    condition: (sprint) =>
      (sprint.kpi.cumulativeTokens ?? 0) > (sprint.config?.budget ?? 1_000_000),
    severity: 'MEDIUM',
  },
  PHASE_TIMEOUT: {
    condition: (sprint) => {
      const enteredAt = sprint.phaseHistory.slice(-1)[0]?.enteredAt;
      if (!enteredAt) return false;
      const elapsedMs = Date.now() - new Date(enteredAt).getTime();
      const timeoutMs = (sprint.config?.phaseTimeoutHours ?? 4) * 3600 * 1000;
      return elapsedMs > timeoutMs;
    },
    severity: 'MEDIUM',
  },
});
```

Trigger 평가 시점:
- **Stop hook** (모든 turn 종료): 4 triggers 모두 평가
- **PostToolUse skill-post** (sprint phase 변경 후): Trigger 1 & 2 (즉시성 우선)
- **Phase advance pre-check**: Trigger 4 (phase timeout 미리 체크)

Default 값:
- Budget: 1,000,000 tokens
- Phase timeout: 4 hours (사용자 `--timeout` override 가능, 권장 D15: phase별 차등)
- Max iterations: 5
- matchRate min acceptable after 5 iter: 90 (100 목표 미달 시 fallback)

### 결정 4 — Dashboard Modes (D13 영구화, 둘 다 지원)

**Mode A: SessionStart dashboard (default, 기존 bkit 패턴)**:
- `scripts/session-start.js` 확장
- 모든 세션 시작 시 active sprint section 렌더링
- 진행률 / matchRate / token cost / phase elapsed / auto-pause trigger 근접도 표시
- Stop hook마다 갱신 (재시작 불요)

**Mode B: `/sprint watch` Live dashboard (opt-in, `/pdca-watch` 패턴)**:
- `/sprint watch {name}` 명시적 명령
- 30초 주기 자동 갱신 (CC `/loop` 활용)
- ETA 예측 (phase별 historical data 기반)
- Auto-pause trigger 근접도 visual (⚠️ 80%+ / 🔴 95%+)
- 실시간 명령 hint

### 결정 5 — Resume 흐름

`/sprint resume {name}`:
1. Pause 사유 자동 검증 (해소되었는가?)
2. 해소되지 않은 경우: AskUserQuestion으로 사용자 결정 (forward fix / increase budget / extend timeout / abort)
3. 해소된 경우: auto-run 재개 (남은 phase + Trust Level scope)

### 결정 6 — State Schema 확장 (v1.0 → v1.1)

`.bkit/state/sprints/{name}.json`에 다음 필드 추가:
- `autoRun.enabled` (boolean)
- `autoRun.scope` (string: SPRINT_PHASES 값)
- `autoRun.trustLevelAtStart` (string: L0~L4)
- `config.budget` (number, default 1_000_000)
- `config.phaseTimeoutHours` (number, default 4)
- `config.maxIterations` (number, default 5)
- `config.matchRateTarget` (number, default 100)
- `config.matchRateMinAcceptable` (number, default 90)
- `config.dashboardMode` (string: 'session-start' | 'watch' | 'both')
- `config.manual` (boolean, default false)
- `autoPause.armed` (string[])
- `autoPause.lastTrigger` (string | null)
- `autoPause.pauseHistory` (array)
- `status` (string: 'active' | 'paused' | 'completed' | 'archived')

## Consequences

### Positive

1. **사용자 의도 정확 반영** — `/sprint start`가 자율 실행 default (Plan→Report 자동 진행).
2. **안전핀 4건** — Quality Gate fail / matchRate / budget / timeout 모두 활성화로 runaway 방지.
3. **Trust Level과 자연 통합** — 기존 bkit Trust Score 6-component 그대로 활용 (변경 없음).
4. **선택 가능 manual mode** — `--manual` 플래그로 단계별 진행 옵션 유지.
5. **Dashboard 유연성** — SessionStart 기본 + watch opt-in으로 사용자 선택.
6. **State 영구화** — `.bkit/state/sprints/{name}.json` schema 확장 (auto-run audit trail).
7. **resume 명확** — pause 사유 자동 검증 + 사용자 결정 흐름.

### Negative

1. **Auto-run runaway 위험 (mitigated by D12)** — 4 auto-pause triggers로 mitigated, 단 v2.1.13 first PR에서 trigger 평가 누락 시 위험. → Stop hook + PostToolUse skill-post 양쪽에서 평가하여 redundancy 확보.
2. **Token cost 폭증 위험 (mitigated by budget)** — budget default 1M으로 cap, 80% 도달 시 warning.
3. **Trust Score 의존 — 사용자 Trust가 낮으면 sprint 활용 제한** — L0/L1에서 manual 강제는 의도된 동작 (safety first).
4. **Dashboard 구현 비용 +20% (D13으로 인한 mode 둘 다)** — 단 SessionStart 기본만 v2.1.13 first PR, watch opt-in은 second PR로 분리 가능.

### Neutral

- v2.1.13 first PR 추가 LOC: ~400 (auto-run + auto-pause + Trust Level scope 통합)
- 신규 hook event 0건 (기존 Stop + PostToolUse 재사용)

## Alternatives Considered

### Alternative 1 — `/sprint start`가 단순 active 진입 (rejected, v1.0 master plan)

`/sprint start`는 상태 전환만, 각 phase는 사용자 명시. → 거부:
- 사용자 의도 명시 위반 ("모두 자동으로 진행")

### Alternative 2 — Trust Level 무관, 항상 Plan→Archive 자율 (rejected)

L0 사용자도 무조건 자율. → 거부:
- L0은 신뢰도 낮은 사용자 — 위험 작업 자율 위험
- 사용자 D11 결정 위반

### Alternative 3 — Auto-pause trigger 일부만 (rejected)

Quality Gate + matchRate만 + budget/timeout 제외. → 거부:
- 사용자 D12 결정 (4건 모두) 위반
- runaway 위험 미해소

### Alternative 4 — Dashboard SessionStart만 (rejected)

watch 모드 제외. → 거부:
- 사용자 D13 결정 위반
- long-running sprint 모니터링 UX 부족

## Implementation Notes

### v2.1.13 first PR (필수)
- `lib/application/sprint-lifecycle/start-sprint.usecase.js` (~100 LOC, auto-run loop)
- `lib/application/sprint-lifecycle/advance-phase.usecase.js` (~150 LOC, Trust Level scope check)
- `lib/application/sprint-lifecycle/auto-pause.js` (~120 LOC, 4 triggers)
- `lib/control/automation-controller.js` 확장 (~50 LOC, SPRINT_AUTORUN_SCOPE)
- `scripts/session-start.js` 확장 (~80 LOC, sprint dashboard)
- `scripts/unified-stop.js` 확장 (~60 LOC, auto-advance + auto-pause 평가)
- `scripts/skill-post.js` 확장 (~50 LOC, ENH-303 continueOnBlock + auto-pause)

### v2.1.13 second PR (선택, watch 모드)
- `scripts/sprint-watch.js` (~150 LOC, CC `/loop` 호환 self-pacing)
- `lib/application/sprint-lifecycle/dashboard.js` (~80 LOC, live data aggregator)
- skills/sprint/SKILL.md `watch` sub-action

## Verification

- `/sprint start my-test --manual` → 각 phase 사용자 승인 (auto-run 비활성)
- `/sprint start my-test` (Trust L2) → Design 완료 후 stop, "/sprint phase do" hint
- `/sprint start my-test` (Trust L3) → Report 완료 후 stop, "/sprint archive" hint
- `/sprint start my-test` (Trust L4 + fastTrack) → Archive 완료 (자율)
- Critical issue 발생 시 즉시 auto-pause
- matchRate < 100 after 5 iter → ITERATION_EXHAUSTED auto-pause
- Token cost > budget → BUDGET_EXCEEDED auto-pause
- Phase duration > 4h → PHASE_TIMEOUT auto-pause
- SessionStart dashboard에 active sprint 항상 노출
- `/sprint watch my-test` → 30초 주기 live 갱신

## References

- Master plan: `docs/01-plan/features/sprint-management.master-plan.md` §6, §11
- User decisions: D11-D14 (2026-05-12)
- Depends on: ADR 0007 (Sprint as Meta Container), ADR 0008 (Sprint Phase Enum)
- Related: ADR 0005 (Application Layer Pilot)
- ENH-303 (PostToolUse continueOnBlock — auto-pause deny reason 결합)
- ENH-292 (Sequential Dispatch — sprint orchestrator caching 회피)
