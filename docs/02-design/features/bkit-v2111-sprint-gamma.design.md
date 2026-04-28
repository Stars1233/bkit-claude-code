---
feature: bkit-v2111-integrated-enhancement
sprint: γ (Gamma)
theme: Trust Foundation
phase: 02-design
type: sprint-detail
status: Draft — Checkpoint 3 승인 (Option C Pragmatic, D3 정합)
architecture: Option C (Pragmatic Balance)
pilot-folder: lib/pdca/lifecycle.js → lib/application/pdca-lifecycle/ (D3)
fr-count: 3
created: 2026-04-23
author: kay kim
parent: docs/02-design/features/bkit-v2111-integrated-enhancement.design.md
---

# Sprint γ — Trust Foundation (Design)

> **Summary**: v2.1.10 잔존 **Trust Score dead-code 위험**을 E2E 런타임 검증으로 완전 종결하고, **Application Layer 경계 모호** 문제를 `lib/pdca/lifecycle.js → lib/application/pdca-lifecycle/` pilot 이관 + ADR 로 v2.2.0 full refactor 근거를 축적한다. L5 E2E 커버리지를 5 → 9 scenario (pm/plan/design/do/check/act/qa/report/archive 각 1 smoke) 로 확장한다.
>
> **Goal**: Arch 88 → 90+, dead code 0 잔존 보증, Application Layer pilot evidence
> **Parent Design**: [bkit-v2111-integrated-enhancement.design.md](./bkit-v2111-integrated-enhancement.design.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Arch 분석 Top 3 Risk 중 2개(R1 Trust Score dead code, R2 Application Layer 경계 모호)를 v2.1.11에서 정면 해결. Sprint 7d "복원" 표기에도 실제 reconcile E2E 미검증 상태 잔존 가능성 |
| **WHO** | Primary: Yuki (감사·구조 중심) / Contributor (Bounded Context 명료화) / Maintainer (Trust Score 동작 확증) |
| **RISK** | (a) γ2 pilot import path 전파 시 β 신규 slash 가 깨짐 → 하위호환 shim 필수 / (b) Trust Score E2E 재현성 (`.bkit/runtime/control-state.json` 가변) / (c) L5 9 scenario 중 Agent Teams 의존 scenario 가 CI env 없을 때 skip |
| **SUCCESS** | 3 FR × Match Rate ≥ 90%, Trust Score grep 0 dead code (I2 invariant), pilot import path 전파 0 break, L5 9/9 PASS (with env) or 6/9 PASS (CI without env, 3 skip tolerated) |
| **SCOPE** | IN: Trust reconcile + Application pilot 1폴더 + L5 9 scenario. OUT: Application Layer full refactor(v2.2.0), Domain Purity 가드 확장(v2.1.12) |

---

## 1. Overview

### 1.1 Design Goals

- **Trust Score dead-code 완전 제거** — 3 flag 전부 런타임 호출 경로 도달, CI invariant I2 로 영구 방어
- **Application Layer pilot evidence** — 1 폴더만 이관하되 **import path 전파 메트릭** 수집하여 v2.2.0 full refactor 의사결정 근거 축적
- **L5 커버리지 5 → 9** — PDCA 9 phase 각 1 smoke scenario, CI env-aware skip
- **하위호환 100%** — `lib/pdca/lifecycle.js` 에 re-export shim 유지, 기존 import 0 break
- **Agent-Hook 다중 이벤트 활용 검증** (FR-γ4, 선택적, CC v2.1.118 X13 fix 활용): agent-type hook 을 Stop/SubagentStop 외 이벤트에도 연결 가능해짐. Do Turn 1 에 `grep -rn "Stop\|SubagentStop" hooks/hooks.json lib/orchestrator/` 로 workaround 실존 조사, L5 scenario 1 에 regression assertion 추가. 확장 구현은 v2.1.12 (ENH-280)

### 1.2 Design Principles

1. **Runtime Verification over Static** — Trust Score 는 E2E spec 으로 실제 상태 변화 확인 (grep 통과는 필요조건, 충분조건 아님)
2. **Pilot + Shim over Big Bang** — Application Layer 이관은 1폴더 + shim 2주 유지 → metrics 수집 후 v2.1.12 shim 제거
3. **Scenario-First L5** — 9 scenario 를 Design 에서 먼저 확정, Do phase 에서 구현
4. **Env-Aware Skip** — Agent Teams env 없으면 warning + exit 0 (fail-open), CI matrix 분기

---

## 2. Architecture

### 2.0 Selected: Option C Pragmatic (D3 정합)

| Aspect | Option A (제외) | Option B (⚠️ D3 위반) | **Option C (Selected)** |
|--------|-----|-----|-----|
| γ1 Trust Score | inline reconcile | 별도 reconciler | trust-engine.js + state.js reconcile + E2E spec |
| γ2 Application Layer | ADR only | 완전 이관 (⚠️ pilot 1폴더 위반) | ADR + pilot 1폴더 + shim 2주 |
| γ3 L5 Scenario | 기존 5 파일에 4 append | 9 독립 파일 | 1 파일 9 it() 통합 |
| 하위호환 | 보장 | 파괴 | 보장 (shim) |
| D3 정합 | OK | ❌ | ✅ |

### 2.1 Component Diagram

```
┌────────────────────── Presentation ──────────────────────┐
│  (no direct changes in γ)                                │
└──────────────────────────┬────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
┌────────────────────────┐   ┌─────────────────────────────┐
│ Application Layer      │   │ Application Layer (기존)    │
│  [NEW DIR]             │   │                             │
│  lib/application/      │   │  lib/pdca/lifecycle.js      │
│   └── pdca-lifecycle/  │◀──┤   (하위호환 shim —         │
│        ├── index.js    │   │    re-export from          │
│        ├── phases.js   │   │    lib/application/...)    │
│        └── transitions │   │                             │
└────────────────────────┘   └─────────────────────────────┘
                           │
┌──────────────────────────┴────────────────────────────────┐
│ Control Layer (γ1)                                        │
│  lib/control/trust-engine.js   [MODIFY] + reconcile()     │
│  lib/control/state.js          [MODIFY] + write flow      │
│  lib/control/automation-       [MODIFY] + invoke reconcile│
│      controller.js                                        │
└───────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────┐
│ Test Layer (γ3)                                           │
│  tests/e2e/                                               │
│   └── trust-score-reconcile.spec.ts    [NEW]              │
│   └── pdca-full-cycle-9scenario.spec.ts [NEW]             │
│       (9 it() blocks: pm/plan/design/do/check/            │
│                       act/qa/report/archive)              │
└───────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow — Trust Score Reconcile (γ1)

```
Any PDCA phase completes
    │
    ▼
trust-engine.updateScore(event)
    │
    ▼
If bkit.config.control.trustScoreEnabled === true
    │
    ├─▶ reconcile() [NEW]
    │    ├── compute new score delta
    │    ├── if delta crosses threshold & autoEscalation=true → L2→L3
    │    ├── if delta crosses threshold & autoDowngrade=true  → L3→L2
    │    └── write .bkit/runtime/control-state.json atomic
    │
    └─▶ audit: lib/core/audit-logger.js trace
```

### 2.3 Data Flow — Application Layer Pilot (γ2)

```
v2.1.10:
  consumer.js → require('lib/pdca/lifecycle')
                     └── lifecycle.js (21 LOC ~ implementation)

v2.1.11 (γ2 pilot):
  consumer.js → require('lib/pdca/lifecycle')    ← 기존 경로 그대로
                     │
                     ▼
                lifecycle.js (shim, ~20 LOC)
                     └── module.exports = require('lib/application/pdca-lifecycle')
                                               │
                                               ▼
                              lib/application/pdca-lifecycle/
                                ├── index.js       (public API)
                                ├── phases.js      (PDCA phase enum + metadata)
                                └── transitions.js (legal state transitions)

v2.1.12 계획:
  consumer.js → require('lib/application/pdca-lifecycle')  ← 직접 경로로 전환
  lib/pdca/lifecycle.js → DELETE (shim 제거, 2주 유예 후)
```

---

## 3. Data Model

### 3.1 `.bkit/runtime/control-state.json` (γ1 갱신 대상)

```json
{
  "version": "2.1.11",
  "trustScore": 85,
  "automationLevel": "L3",
  "lastUpdatedAt": "2026-04-23T14:23:45.123Z",
  "reconcileHistory": [
    {
      "at": "2026-04-23T14:23:45.123Z",
      "previousScore": 75,
      "newScore": 85,
      "previousLevel": "L2",
      "newLevel": "L3",
      "trigger": "pdca.do.completed.sprint-alpha",
      "autoEscalationApplied": true
    }
  ]
}
```

### 3.2 `lib/application/pdca-lifecycle/phases.js`

```javascript
// Design Ref: §2.3 — Application Layer pilot
// Plan SC: SC-01 (Arch 88→92+)

const PHASES = Object.freeze({
  PM: 'pm',
  PLAN: 'plan',
  DESIGN: 'design',
  DO: 'do',
  CHECK: 'check',
  ACT: 'act',
  QA: 'qa',
  REPORT: 'report',
  ARCHIVE: 'archive',
});

const PHASE_ORDER = [
  PHASES.PM, PHASES.PLAN, PHASES.DESIGN, PHASES.DO,
  PHASES.CHECK, PHASES.ACT, PHASES.QA, PHASES.REPORT, PHASES.ARCHIVE,
];

module.exports = { PHASES, PHASE_ORDER };
```

### 3.3 Import Path Propagation Map (γ2)

`lib/pdca/lifecycle.js` 를 현재 import 하는 파일 목록 (사전 조사 결과, 예상):

| File | Import 방식 | 전파 필요 | 전략 |
|------|-------------|:---:|------|
| `lib/pdca/state-machine.js` | `require('./lifecycle')` | Yes | v2.1.11 shim 유지, v2.1.12 `require('../application/pdca-lifecycle')` |
| `lib/pdca/index.js` | `require('./lifecycle')` | Yes | 동일 |
| `lib/orchestrator/workflow-state-machine.js` | `require('../pdca/lifecycle')` | Yes | 동일 |
| `scripts/*.js` (4 files 추정) | `require('../lib/pdca/lifecycle')` | Partial | shim 유지만 |
| `tests/unit/pdca/lifecycle.test.js` | `require('../../../lib/pdca/lifecycle')` | Yes | Do phase 에서 신규 path 경유 TC 추가 |

> **실측**: Do phase Turn 1 에서 `grep -rn "require.*pdca/lifecycle" lib/ hooks/ scripts/ tests/` 로 정확한 전파 범위 확정.

---

## 4. API Specification

### 4.1 `trust-engine.reconcile()` (γ1 NEW)

```javascript
/**
 * Reconcile trust score + automation level based on config flags.
 * Idempotent + atomic write.
 *
 * @version 2.1.11
 * @since 2.1.11
 * @param {Object} opts
 * @param {string} opts.trigger - event that triggered reconcile
 * @param {number} opts.scoreDelta - score change (-100 ~ +100)
 * @returns {Promise<ReconcileResult>}
 */
async function reconcile({ trigger, scoreDelta }) {
  const config = loadConfig();
  if (!config.control.trustScoreEnabled) return { skipped: true };

  const current = await loadState();
  const newScore = clamp(current.trustScore + scoreDelta, 0, 100);
  let newLevel = current.automationLevel;

  if (config.control.autoEscalation && newScore >= config.control.escalationThreshold) {
    newLevel = escalate(current.automationLevel);
  }
  if (config.control.autoDowngrade && newScore <= config.control.downgradeThreshold) {
    newLevel = downgrade(current.automationLevel);
  }

  const result = {
    previousScore: current.trustScore,
    newScore,
    previousLevel: current.automationLevel,
    newLevel,
    trigger,
    autoEscalationApplied: newLevel !== current.automationLevel,
  };

  await atomicWriteState({ ...current, trustScore: newScore, automationLevel: newLevel,
                           reconcileHistory: [...current.reconcileHistory, result] });
  return result;
}
```

### 4.2 `lib/application/pdca-lifecycle/index.js` (γ2 NEW)

```javascript
// Design Ref: §2.3 — Application Layer pilot
// v2.1.11 pilot: 1 폴더만 이관, lib/pdca/lifecycle.js 는 shim 유지

const { PHASES, PHASE_ORDER } = require('./phases');
const { isLegalTransition, nextPhase, previousPhase } = require('./transitions');

module.exports = {
  PHASES,
  PHASE_ORDER,
  isLegalTransition,
  nextPhase,
  previousPhase,
};
```

### 4.3 `lib/pdca/lifecycle.js` (γ2 MODIFY — shim)

```javascript
// Design Ref: §2.3 — Pilot shim for v2.1.11
// This file re-exports from lib/application/pdca-lifecycle for backward compatibility.
// Scheduled removal: v2.1.12 (2 weeks after v2.1.11 GA).

module.exports = require('../application/pdca-lifecycle');
```

---

## 5. L5 E2E Scenario Design (γ3) — 9 scenarios

### 5.1 Scenario Matrix

| # | Phase | Scenario | Agent Teams 필요 | CI 실행 |
|:---:|---|---|:---:|:---:|
| 1 | PM | pm-lead spawns 3 sub-agents + PRD generated + **cwd 복원 (CC v2.1.118 X22)** | Yes | Skip-if-no-env |
| 2 | Plan | Plan document generated with 4-perspective Executive Summary | No | Always |
| 3 | Design | 3 Architecture Options 제시 + Checkpoint 3 → Design doc 생성 | No | Always |
| 4 | Do | `--scope module-N` 구현 + L1 TC 생성 | No | Always |
| 5 | Check | gap-detector static + runtime, Match Rate 계산 | No | Always |
| 6 | Act | iterate 1회 + Match Rate 재계산 | No | Always |
| 7 | QA | qa-lead L1-L3 실행 + QA_PASS | Yes | Skip-if-no-env |
| 8 | Report | Completion report 생성 + Executive Summary | No | Always |
| 9 | Archive | `docs/archive/YYYY-MM/` 이관 + status cleanup | No | Always |

### 5.2 Implementation — 1 파일 9 it()

```typescript
// tests/e2e/pdca-full-cycle-9scenario.spec.ts

describe('PDCA 9-Phase Full Cycle E2E', () => {
  const FEATURE = 'test-e2e-feature';
  const hasAgentTeams = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1';

  it('[1/9] PM — pm-lead spawns sub-agents + PRD + cwd 복원', async () => {
    if (!hasAgentTeams) return test.skip(true, 'Agent Teams env required');
    // ... executes /pdca pm, verifies docs/00-pm/{feature}.prd.md exists
    // NEW (CC v2.1.118 X22 대응): resumed subagent 의 cwd === original cwd
    // expect(resumedSubagentCwd).toBe(originalCwd);
  });

  it('[2/9] Plan — Plan document generated with 4-perspective Executive Summary', async () => {
    // ... executes /pdca plan, verifies docs/01-plan/features/{feature}.plan.md
  });

  // ... 7 more it() blocks
});
```

### 5.3 Skip Policy

- `process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS !== '1'` → scenarios 1, 7 skip
- CI matrix: Agent Teams job (env set) + no-Agent-Teams job (env unset) 병렬 실행
- 기본 개발 환경: env unset → 9 중 7 PASS 기대

---

## 6. Error Handling

| Code | Cause | Handling |
|------|-------|----------|
| E-γ1-01 | control-state.json write 충돌 (동시 reconcile) | atomic write with lock file (`.bkit/runtime/state.lock`) |
| E-γ1-02 | config.control.* 플래그 누락 | fail-open (reconcile skip) + warning log |
| E-γ2-01 | shim require 순환 (lib/pdca → lib/application → lib/pdca) | 없음 — 단방향 re-export, 순환 아님 |
| E-γ2-02 | Import path 전파 중 1곳 누락 | CI grep test 로 사전 감지 |
| E-γ3-01 | Agent Teams env 없는데 scenario 1/7 실행 시도 | test.skip() with reason |

---

## 7. Security Considerations

- [x] `control-state.json` atomic write: partial write 방지 (lock file 또는 write-then-rename)
- [x] Trust Score 조작 방지: state.json 은 `.bkit/runtime/` (gitignored), PII redaction 통과
- [x] E2E test feature: `test-e2e-*` 정규식으로만 archive target (사용자 feature 삭제 방지)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Count |
|------|--------|:---:|
| L1 Unit | reconcile / clamp / escalate / downgrade / PHASES const / isLegalTransition / nextPhase | 10 |
| L5 E2E | PDCA 9-scenario full cycle | 9 |
| E2E Spec | Trust Score reconcile dedicated | — (in L2) |
| Contract | Invocation Contract +12 assertions | 12 |

### 8.2 L1 Unit Tests (10)

| # | Function | Check |
|:---:|---|---|
| 1 | `trust-engine.reconcile({scoreDelta:+10})` | score 증가 + state.json 갱신 |
| 2 | `trust-engine.reconcile({...})` with trustScoreEnabled=false | skipped:true |
| 3 | `clamp(150, 0, 100)` | 100 |
| 4 | `escalate('L2')` | 'L3' |
| 5 | `escalate('L4')` | 'L4' (ceil) |
| 6 | `downgrade('L2')` | 'L1' |
| 7 | `PHASES.PM` | 'pm' (frozen) |
| 8 | `isLegalTransition('plan','design')` | true |
| 9 | `isLegalTransition('archive','pm')` | false |
| 10 | `nextPhase('check')` | 'act' (or 'report' if >=90) |

### 8.3 L5 E2E — 9 scenarios (see §5)

### 8.4 E2E Trust Score Reconcile Spec

`tests/e2e/trust-score-reconcile.spec.ts` (dedicated):
- Setup: control-state.json = {score:70, level:L2}, config.autoEscalation=true, threshold=80
- Action: `/pdca do ... --scope module-1` 성공
- Expect: control-state.json 읽어 score≥80, level='L3', reconcileHistory[-1].trigger='pdca.do.completed'

### 8.5 Contract Tests (+12)

| # | Assertion |
|:---:|---|
| 1 | PHASES export 9 keys |
| 2 | PHASE_ORDER length === 9 |
| 3 | lib/pdca/lifecycle.js re-exports from lib/application/pdca-lifecycle |
| 4 | shim module.exports === target module.exports (identity check) |
| 5 | trust-engine exports reconcile function |
| 6 | reconcile() returns ReconcileResult shape |
| 7 | control-state.json schema validates after reconcile |
| 8~12 | 9-scenario each has expected phase transition assertion |

---

## 9. Clean Architecture Layer 배치

| Component | Layer | Path | Note |
|-----------|-------|------|------|
| `lib/application/pdca-lifecycle/` | **Application (NEW)** | `lib/application/pdca-lifecycle/` | pilot 1폴더 |
| `lib/pdca/lifecycle.js` | Application (shim) | `lib/pdca/lifecycle.js` | v2.1.12 까지 유지 |
| `lib/control/trust-engine.js` | Application | `lib/control/trust-engine.js` | +reconcile |
| `lib/control/state.js` | Application | `lib/control/state.js` | +atomic write |
| `tests/e2e/*.spec.ts` | Test | `tests/e2e/` | — |

### 9.1 Layer Dependency 검증

```
lib/application/pdca-lifecycle/
    └─▶ (only Domain, if any) — 현재는 순수 enum/rules, 외부 의존 0
lib/pdca/lifecycle.js (shim)
    └─▶ lib/application/pdca-lifecycle/ (단방향)
```

**Domain Purity**: `lib/application/pdca-lifecycle/phases.js` 는 상수만 export, 9 forbidden import 0 (`check-domain-purity.js` 통과).

---

## 10. ADR 0001 Synopsis — Application Layer Consolidation

> 상세 ADR 은 Do phase 에서 `docs/adr/0001-application-layer-consolidation.md` 로 작성.
> 본 Design 에서는 요약만.

### 10.1 Status
- v2.1.11: **Proposed** (pilot 진행)
- v2.1.12: **Accepted** or **Rejected** (pilot metrics 기반)
- v2.2.0: full refactor 착수 (if accepted)

### 10.2 Context
- `lib/pdca/` 21 파일, `lib/control/` 8 파일, `lib/orchestrator/` 5 파일, `lib/team/`, `lib/intent/` 5 폴더가 모두 Application 성격인데 `lib/application/` 미존재 → Bounded Context 경계 모호

### 10.3 Decision (v2.1.11 pilot scope)
- **lib/pdca/lifecycle.js 만** `lib/application/pdca-lifecycle/` 로 이관
- 하위호환 shim 2주 유지
- Pilot metrics 수집: import path 전파 파일 수 · shim 유지 난이도 · 테스트 영향도

### 10.4 Consequences
- (+) 경계 명료화 시작점, v2.2.0 refactor evidence
- (+) 하위호환 0 break
- (−) 일시적 2단계 경로 (shim) → v2.1.12 에 정리 필요
- (−) 단 1폴더라 효과 검증 한계 — 메트릭 필수

---

## 11. Implementation Guide

### 11.1 File Structure

```
lib/
├── application/                        [NEW DIR]
│   └── pdca-lifecycle/                 [NEW]
│       ├── index.js
│       ├── phases.js
│       └── transitions.js
├── pdca/
│   └── lifecycle.js                    [MODIFY] → shim
└── control/
    ├── trust-engine.js                 [MODIFY] + reconcile()
    ├── state.js                        [MODIFY] + atomic write
    └── automation-controller.js        [MODIFY] + invoke reconcile

tests/e2e/
├── trust-score-reconcile.spec.ts       [NEW]
└── pdca-full-cycle-9scenario.spec.ts   [NEW]

docs/adr/
└── 0001-application-layer-consolidation.md  [NEW]

scripts/
└── check-trust-score-reconcile.js      [NEW] — CI invariant I2
```

### 11.2 Implementation Order

1. [ ] **γ1-a**: `lib/control/trust-engine.js` + reconcile() 함수 추가
2. [ ] **γ1-b**: `lib/control/state.js` + atomic write 메서드
3. [ ] **γ1-c**: `lib/control/automation-controller.js` 에서 reconcile() 호출 연동
4. [ ] **γ1-d**: `scripts/check-trust-score-reconcile.js` CI invariant
5. [ ] **γ1-e**: `tests/e2e/trust-score-reconcile.spec.ts` 작성 및 PASS
6. [ ] **γ2-a**: Import path 전파 범위 조사 (`grep -rn`)
7. [ ] **γ2-b**: `lib/application/pdca-lifecycle/` 폴더 생성 (index/phases/transitions)
8. [ ] **γ2-c**: `lib/pdca/lifecycle.js` shim 으로 교체
9. [ ] **γ2-d**: Contract TC 1~4 추가
10. [ ] **γ2-e**: `docs/adr/0001-application-layer-consolidation.md` 작성
11. [ ] **γ3-a**: `tests/e2e/pdca-full-cycle-9scenario.spec.ts` 작성 (9 it() blocks)
12. [ ] **γ3-b**: CI matrix 분기 (Agent Teams env job + no-env job)
13. [ ] **γ3-c**: L5 9/9 PASS (with env) 또는 6/9 PASS (without env)
14. [ ] **L1 Unit TC 10개** 전량 PASS
15. [ ] **Contract +12 assertions** 전량 PASS

### 11.3 Session Guide

#### Module Map

| Sub-Module | Scope Key | FR | Est. Turns |
|------------|-----------|:---:|:---:|
| Trust Score Reconcile | `sprint-gamma-trust` | γ1 | 10~14 |
| Application Layer Pilot | `sprint-gamma-pilot` | γ2 | 12~16 |
| L5 9-Scenario | `sprint-gamma-e2e` | γ3 | 13~17 |

**총 추정**: 35~47 turns

---

## 12. Acceptance Criteria (Sprint γ DoD)

- [ ] 3 FR 전량 Match Rate ≥ 90%
- [ ] Trust Score grep `autoEscalation|autoDowngrade|trustScoreEnabled` 모두 **런타임 호출 경로 도달 확인**
- [ ] CI invariant I2 `check-trust-score-reconcile` 통과
- [ ] `lib/pdca/lifecycle.js` import 하는 모든 파일 정상 동작 (0 break)
- [ ] `lib/application/pdca-lifecycle/` 3 파일 Domain Purity 통과
- [ ] ADR 0001 작성 완료 (`docs/adr/0001-application-layer-consolidation.md`)
- [ ] L5 9-scenario: 최소 7/9 PASS (env 없는 CI 기준), 9/9 (env 있는 환경)
- [ ] E2E Trust Score reconcile spec PASS
- [ ] Invocation Contract +12 assertions 추가 및 PASS
- [ ] β fast-track.js 와 경로 분리 유지 확인 (RD-1 검증)
- [ ] **FR-γ3 X22 대응 (CC v2.1.118)**: L5 scenario 1 에 "resumed subagent cwd 복원" assertion 추가 및 PASS
- [ ] **FR-γ4 선택적 검증 (CC v2.1.118 X13)**: Do Turn 1 에 agent-hook 다중 이벤트 workaround 실태 grep 조사 완료, 결정 문서화 (확장 구현은 v2.1.12 ENH-280)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-23 | Initial Sprint γ design — Option C, D3 pilot 1폴더, shim 2주, L5 9 scenario 1파일 9 it() | kay kim |

---

**Next Step**: Sprint α 완료 + β와 병렬 가능 → `/pdca do bkit-v2111-integrated-enhancement --scope sprint-gamma`
