# Sprint UX 개선 — Master Plan v1.0

> **Feature**: sprint-ux-improvement (bkit v2.1.13 sprint feature 의 사용자 경험 + ★ 사용자 명시 4 충족)
> **Target Release**: **v2.1.13 (단일 release 내 통합, 사용자 명시 2026-05-12)** — Sprint 1-5 GA + UX 개선 (S1-UX~S4-UX) + Sprint 6 release 모두 v2.1.13 단일 버전. UX 개선이 v2.1.13 GA 의 일부.
> **Author**: kay kim + bkit AI orchestration
> **Date**: 2026-05-12
> **Branch**: `feature/v2113-sprint-management` (Sprint 5 GA commit `1337e1f` 위에서 진행)
> **Status**: Draft v1.0 — Plan 진입 가능
> **Depends on (immutable)**: Sprint 1-5 (모두 GA `1337e1f`) + bkit-system philosophy + Sprint 5 verification 4건 (commit pending)
> **사용자 명시 누적 (1-5)**:
> 1. 8개국어 트리거 + @docs 예외 영어 코드
> 2. Sprint 별 유기적 상호 연동
> 3. QA = bkit-evals + claude -p + 4-System + diverse perspective
> 4. **★ Master Plan 자동 생성 + 컨텍스트 윈도우 고려 sprint 분할** (본 sprint 핵심 동기)
> 5. **★ 꼼꼼하고 완벽하게 (빠르게 X), 허투루 작업 금지**

---

## 0. Executive Summary

### 0.1 Mission

bkit 의 **Sprint Management** 가 사용자 명시 4 + 발견된 6 gaps (P0×1, P1×4, ★ 사용자 경험 ×2) 를 충족하여 **`/sprint`, `/pdca`, `/control` 3 skills 의 유기적 통합으로 자율 PDCA cycle 수행 가능한 master plan 자동 생성기** 로 격상.

### 0.2 Anti-Mission

- **단순 sprint container CRUD** 강화 X (이미 v2.1.13 GA)
- **commands/*.md 추가** 금지 (skills/ 우선, [[feedback-skills-vs-commands]])
- **Sprint 1-5 invariants 깨기** X (lib/domain/sprint/, lib/application/sprint-lifecycle/ 모두 0 변경 목표)
- **bkit-system philosophy 위배** X (Automation First / No Guessing / Docs=Code, 7 invariants)
- **빠르게 끝내기** X — 사용자 명시 5 (꼼꼼하고 완벽하게)

### 0.3 4-Perspective Value Matrix

| Perspective | Value |
|------------|-------|
| **사용자 UX** | `/sprint master-plan <project>` 1-command 으로 Master Plan + Sprint 분할 + PDCA cycle 자동 진입. `/control L4` 로 사용자 명시 4 (컨텍스트 윈도우 격리) 자동 보장 |
| **Architecture** | 발견된 P0 bug (start phase reset) + P1×4 gaps + parser fix 통합. Sprint 1-5 invariant 보존 하면서 sprint-handler enhancement zone 활용 |
| **Cost/Performance** | 단일 세션 안전 sprint sizing (~80-100K tokens 이내) → 1H prompt cache 활용 + context summary 회피 |
| **Risk** | Sprint master-planner agent 격리 spawn → main context 오염 0. `/control` trust-level 통한 사용자 통제 boundary 명확 |

### 0.4 정량 목표

| Metric | Target |
|--------|--------|
| 신규 sub-action `master-plan <project>` | sprint skill 16번째 action |
| Master Plan 자동 생성 | `bkit:sprint-master-planner` agent 격리 spawn |
| Sprint 분할 | 자동 추천 (token estimate + dependency graph) |
| 컨텍스트 윈도우 안전 sprint size | ≤ 100K tokens/sprint |
| `/control L4` Full-Auto 진입 시 안전성 | 4 auto-pause triggers 모두 active |
| P0 bug fix | `/sprint start` existing sprint resume (phase 보존) |
| P1 gaps fix | 4건 모두 (--trust flag, CLI entry, parser, skill args) |
| L3 Contract test 추가 | SC-09 master-plan + SC-10 context-sizing |
| Sprint 1-5 invariant | 0 변경 (단 sprint-handler.js enhancement zone 만 변경 허용) |
| `claude plugin validate .` | Exit 0 (F9-120 13-cycle 누적 목표) |
| Cumulative TCs | 250+ (241 baseline + ~10 신규) |

---

## 1. Context Anchor (Plan → Design → Do 전파)

| Key | Value |
|-----|-------|
| **WHY** | Sprint 5 (Quality + Docs) GA 후 P4 verification 중 6 gaps 발견 + 사용자 명시 4 (Master Plan 자동 생성 + 컨텍스트 윈도우 격리 sprint sizing) 신규 요구. **사용자가 sprint feature 실제 사용 → UX gap 발견 → 즉시 PDCA cycle 로 fix** ([[feedback-thorough-complete]] §How to apply 1). |
| **WHO** | (1) bkit 사용자 — `/sprint master-plan <project>` 1-command 으로 multi-sprint project 시작. (2) bkit core developer — Sprint 1-5 invariant 보존 + Sprint 6 release 전 사용자 명시 4 충족. (3) Long-running projects (다중 sprint) 사용자 — 컨텍스트 윈도우 안전성 보장. (4) Memory persistence 사용자 — 세션 clear 후 sprint 이어서 진행. (5) `/control L4` Full-Auto 사용자 — 자율 주행 + 4 trigger 안전망. |
| **RISK** | (a) P0 bug fix (start phase reset) 가 **lib/application/sprint-lifecycle/ Sprint 2 invariant 깨뜨림** — Sprint 5 Plan §R8 위배. justify 로 "bug fix 는 invariant 보존 의도와 무관" 명시 + 최소 변경 + Sprint 1-4 regression 모두 PASS 보장. (b) Master Plan 자동 생성 시 `bkit:sprint-master-planner` agent 격리 spawn 실패 → main context 오염 risk. (c) Context window sizing 자동 추천 알고리즘 부정확 → 잘못된 sprint 분할. (d) `/control L4` Full-Auto + 4 auto-pause triggers 미발동 → 무한 loop 또는 runaway cost. (e) Memory persistence (sprint-status.json + memory.json) atomic write race condition. (f) 8개국어 trigger sprint master-plan 미지원 → 사용자 명시 1 위반. (g) hooks/hooks.json 21:24 invariant 깨기 risk (신규 hook 추가 검토 시). |
| **SUCCESS** | (1) `/sprint master-plan <project>` 1-command 동작, Master Plan 자동 생성. (2) Master Plan 에 Sprint 분할 매트릭스 + 의존성 그래프 + 예상 token consumption 포함. (3) 사용자 승인 후 Task Management 자동 등록 (TaskCreate, dependency 포함). (4) 각 Sprint = `/pdca` 자동 cycle (PRD/Plan→Design→Do→Iterate→QA→Report). (5) `/control L0-L4` 적용 가능, L4 시 4 trigger 안전 보장. (6) Memory persistence — 세션 clear 후 `/sprint status <project>` 로 이어서. (7) Sprint 1-5 invariant 보존 (단 P0 bug fix 정당화). (8) bkit-system philosophy 7 invariants 보존. (9) 8-language trigger 지원. (10) `claude plugin validate .` Exit 0 (F9-120 13-cycle). (11) L3 Contract test 8 → 10 TCs (SC-09 + SC-10 추가). (12) 누적 250+ TCs PASS. |
| **SCOPE** | **In-scope ~12-15 files**: (a) sprint skill 16번째 action `master-plan` (skills/sprint/SKILL.md frontmatter ext + body), (b) lib/application/sprint-lifecycle/master-plan.usecase.js (신규 use case), (c) lib/application/sprint-lifecycle/context-sizer.js (신규 — token estimate + sprint 분할 추천), (d) agents/sprint-master-planner.md ext (Task spawn 시 사용되는 agent body 강화), (e) scripts/sprint-handler.js handleMasterPlan 추가 + P0/P1 5 fix, (f) lib/application/sprint-lifecycle/start-sprint.usecase.js P0 fix (load-then-resume 패턴, ★ Sprint 2 invariant 정당화된 깨기), (g) lib/application/sprint-lifecycle/index.js ext (master-plan 추가 export), (h) tests/contract/v2113-sprint-contracts.test.js SC-09 + SC-10 추가, (i) commands/bkit.md ext (master-plan 매트릭스 추가), (j) docs/06-guide/sprint-management.guide.md §9 신규 — Master Plan workflow, (k) bkit.config.json sprint settings 신규 section. **Out-of-scope (별도 sprint 또는 v2.1.14)**: BKIT_VERSION bump (Sprint 6 별도), CHANGELOG (Sprint 6), real backend wiring 확장 (verification #3 base 만), MEMORY.md hook v2 강화 (Sprint 5 verification #4 base 만). |

---

## 2. Phase A 분석 통합 — bkit-system Philosophy 정합성

### 2.1 7 Invariants 보존 검증 매트릭스

[[feedback-thorough-complete]] 의 "꼼꼼함" 적용 — 본 sprint 가 위배 risk 있는 invariants 모두 사전 검증:

| Invariant | 본 Sprint 영향 | Mitigation |
|-----------|--------------|-----------|
| **Design First** (pre-write.js 차단) | ✅ 안전 — 모든 신규 코드는 본 Master Plan + 후속 design doc 후 구현 | Plan → Design → Do 순서 강제 |
| **No Guessing** (gap-detector 강제) | ✅ 안전 — Master Plan 자동 생성 시 사용자 prompt 우선, 추측 X | `bkit:sprint-master-planner` agent prompt 에 "no guessing" 명시 |
| **Gap < 5%** (matchRate ≥ 90%) | ✅ 본 sprint 도 PDCA iterate phase 거침 | matchRate 100% 목표 (Sprint 1-5 일관) |
| **State Machine** (PDCA 20 transitions) | ✅ 안전 — PDCA invariant lib/application/pdca-lifecycle/ 변경 0 | sprint state machine 도 8-phase 보존 |
| **Trust Score** (L0-L4) | ✅ 본 sprint 의 `/control L4` 통합 ← Trust Score 기반 | L0-L4 외 값 reject |
| **Checkpoint** (auto rollback) | ⚠️ Master Plan 생성 시 multiple sprint Task 등록 → checkpoint 보존 필요 | 각 Task 등록 시 audit-logger entry |
| **Audit Trail** (JSONL logging) | ✅ Sprint events (SprintCreated/Started/PhaseChanged 등) 모두 audit | 신규 `MasterPlanCreated` event 추가 |

### 2.2 Context Engineering 5 Layers 정합

본 sprint 가 5 layers 어떻게 활용하는가:

| Layer | 본 Sprint 활용 |
|-------|--------------|
| L1 Plugin Policy | bkit `.claude-plugin/plugin.json` 신규 변경 X |
| L2 User Config | `~/.claude/bkit/` 별도 변경 X |
| L3 Project Config | `.bkit/state/sprints/` + `.bkit/state/master-plans/` 신규 dir |
| L4 Session Runtime | Master Plan 생성 시 격리된 agent context (main 오염 X) |
| L5 Hook System | 신규 hook 추가 X (21 events 24 blocks 유지). SessionStart 의 Sprint dashboard 만 사용 |

### 2.3 8-Language Trigger 통합 (사용자 명시 1)

`master-plan` action 의 sprint skill frontmatter triggers ext:

```yaml
triggers: master plan, sprint plan, project plan,
  마스터 계획, 스프린트 계획, 프로젝트 계획,
  マスタープラン, スプリント計画,
  主计划, 冲刺计划,
  plan maestro, plan de sprint,
  plan maitre, plan de sprint,
  Masterplan, Sprintplan,
  piano principale, piano sprint.
```

---

## 3. Phase B 분석 통합 — Architecture 통합 지점

### 3.1 PDCA Application Layer 통합

`/sprint master-plan` 호출 시 다음 4-step Application Layer chain:

```
1. User: /sprint master-plan <project> --features auth,payment,reports
        ↓
2. Skill bkit:sprint dispatches to handleSprintAction('master-plan', args, deps)
        ↓
3. handleMasterPlan() 신규:
   a. lib/application/sprint-lifecycle/context-sizer.js
      → estimate token consumption per feature
      → recommend N sprints (each ≤ 100K tokens)
   b. lib/application/sprint-lifecycle/master-plan.usecase.js
      → generate master plan structure
      → spawn bkit:sprint-master-planner agent (Task tool, 격리)
   c. Agent returns Master Plan markdown
        ↓
4. Persist:
   a. docs/01-plan/features/<project>.master-plan.md (Doc=Code invariant 충족)
   b. .bkit/state/master-plans/<project>.json (state)
   c. TaskCreate for each Sprint (Task Management persistence, 사용자 명시 4-2)
   d. audit-logger: MasterPlanCreated event
```

### 3.2 `/pdca` + `/sprint` + `/control` 3-Skill 유기 매트릭스

| User Intent | Primary skill | Sub-actions | Agent Wiring |
|-------------|--------------|-------------|--------------|
| 새 multi-sprint project 시작 | `/sprint master-plan` | + auto-fork to Sprint 1 | sprint-master-planner |
| 개별 Sprint PDCA cycle | `/pdca team` or `/pdca pm` (sprint 안) | pm → plan → design → do → check → act → qa → report | pm-lead → pdca-iterator → qa-lead → report-generator |
| Sprint 자율 주행 모드 | `/control L4` | trust-engine.syncToControlState | (none, state-only) |
| Quality gate fail | (auto, 4 triggers) | `/sprint pause <id>` 자동 호출 | (none) |
| Context window 임박 | (auto, BUDGET_EXCEEDED trigger) | `/sprint pause <id>` + memory persist | (none) |
| 세션 clear 후 이어서 | `/sprint status <project>` + `/sprint resume <id>` | state-store.load | (none) |

### 3.3 Task Management 통합 (사용자 명시 4-2)

Master Plan 승인 시 자동 등록:

```javascript
// scripts/sprint-handler.js handleMasterPlan
async function handleMasterPlan(args, infra, deps) {
  // 1. Generate master plan (above)
  const plan = await masterPlanUsecase(args, deps);

  // 2. Task Management persistence
  if (plan.ok && plan.sprints && deps.taskCreator) {
    for (const sprint of plan.sprints) {
      await deps.taskCreator({
        subject: `Sprint ${sprint.id}: ${sprint.name}`,
        description: sprint.scope + '\n\nFeatures: ' + sprint.features.join(', '),
        // Sprint 의존성 reflect
        addBlockedBy: sprint.dependsOn ? sprint.dependsOn.map(d => taskIds[d]) : [],
      });
    }
  }
  return plan;
}
```

### 3.4 Memory Persistence (사용자 명시 4-2)

세션 clear 후에도 이어서 진행 — 2 경로:

| 경로 | 위치 | 책임 |
|------|------|------|
| **State** | `.bkit/state/sprints/<id>.json` + `.bkit/state/master-plans/<project>.json` | sprint runtime 상태 (Sprint 3 stateStore 패턴) |
| **Memory** | `~/.claude/projects/<encoded>/memory/MEMORY.md` `## Sprint History` + `## Active Sprints` 섹션 | 세션 자동 컨텍스트 (Sprint 5 verification #4 base 강화) |

세션 시작 시 SessionStart hook 의 staleDetect 가 active sprint 발견 → "Sprint <project> 진행 중 (phase: <X>). 이어서? `/sprint resume <id>`" 자동 안내.

### 3.5 hooks/hooks.json 21:24 Invariant 보존

본 sprint 는 **신규 hook 추가 0** — 21 events 24 blocks 유지. 대신:
- Sprint 5 verification #4 의 sprint-memory-writer 가 이미 handleArchive 내부 best-effort 호출 (hooks 변경 X)
- SessionStart 의 staleDetect 기존 코드 활용 (이미 idle features 경고)

---

## 4. Phase C 통합 — Sprint UX 개선의 6 Gaps Resolution

### 4.1 P0: `/sprint start` Phase Reset Bug

| 항목 | 내용 |
|------|------|
| **Bug** | `lib/application/sprint-lifecycle/start-sprint.usecase.js:164` createSprint() unconditional → existing sprint phase='prd' reset |
| **Fix 방향** | Load-then-resume 패턴: stateStore.load 우선 → 있으면 cloneSprint with autoRun.scope, 없으면 createSprint (현재 path) |
| **Sprint 2 Invariant 영향** | lib/application/sprint-lifecycle/start-sprint.usecase.js 변경 — **Sprint 5 Plan §R8 위배** |
| **Justification** | "Bug fix 는 invariant 보존 의도가 아닌 functional correctness 의 일부". Sprint 1-4 regression 226 TCs PASS 유지 보장 + L3 SC-05 4-layer chain 보강 (start 후 phase 보존 검증) |
| **Fix 난이도** | M (1-line change with conditional + 새 helper `loadOrCreate`) |

### 4.2 P1: --trust flag Key 불일치

| 항목 | 내용 |
|------|------|
| **Gap** | `scripts/sprint-handler.js:188` handleStart 가 `args.trustLevel` 사용. start-sprint.usecase.js:156 는 `input.trustLevel`. 그러나 createSprint() 는 `input.trustLevelAtStart` 기대 |
| **Fix** | handler 에서 args.trust / args.trustLevel / args.trustLevelAtStart 3 form 모두 수용 + 통일된 internal key 로 normalize |
| **난이도** | XS (1 helper function) |

### 4.3 P1: scripts/sprint-handler.js CLI Entrypoint 부재

| 항목 | 내용 |
|------|------|
| **Gap** | require-only module, CLI 호출 불가 → headless test / debug 어려움 |
| **Fix** | shebang `#!/usr/bin/env node` + main argv parser + module.exports 유지 (dual mode) |
| **난이도** | S |

### 4.4 P1: bkit:sprint Skill Args 전달

| 항목 | 내용 |
|------|------|
| **Gap** | SKILL.md 가 LLM 에 dispatch 방식 충분히 명시 X → args 있는 actions 실패 |
| **Fix** | SKILL.md body 에 정확한 sub-action invocation 매트릭스 + JSON args schema 추가 |
| **난이도** | S (docs only) |

### 4.5 P1: gap-detector / auto-fixer regex Parser

| 항목 | 내용 |
|------|------|
| **Status** | ✅ Sprint 5 verification #3 에서 이미 FIXED (balanced-brace extraction) |

### 4.6 ★ 사용자 명시 4-1: Master Plan 자동 생성

| 항목 | 내용 |
|------|------|
| **Gap** | `/sprint init` = 단일 container 생성만, Master Plan 부재 |
| **Fix** | 신규 sub-action `master-plan <project>` — `bkit:sprint-master-planner` agent 격리 spawn → multi-sprint master plan generate |
| **난이도** | L (신규 use case + agent body 강화 + persistence + Task wiring) |

### 4.7 ★ 사용자 명시 4-2: Context Window Sizing

| 항목 | 내용 |
|------|------|
| **Gap** | sprint 분할 시 token estimate 부재 → 단일 세션 안전 보장 X |
| **Fix** | `lib/application/sprint-lifecycle/context-sizer.js` 신규 — feature 별 token estimate + sprint 분할 추천 (≤ 100K tokens/sprint 기본) |
| **난이도** | M (heuristic algorithm + tunable threshold via bkit.config.json) |

---

## 5. Phase D 통합 — Sprint 분할 (컨텍스트 윈도우 격리)

본 master plan 자체가 사용자 명시 4-2 를 실증해야 함. 다음 sprint 분할:

### 5.1 분할 매트릭스

| Sprint | 이름 | Scope | Token Est. | Files | Time |
|--------|-----|-------|-----------|-------|------|
| **S1-UX** | P0/P1 Quick Fixes | start phase reset bug + trust flag normalize + CLI entry + skill args | ~25K | 4 files | 60-90분 |
| **S2-UX** | Master Plan Generator | master-plan sub-action + master-plan.usecase.js + sprint-master-planner agent ext | ~45K | 5 files | 90-120분 |
| **S3-UX** | Context Sizer | context-sizer.js + bkit.config.json threshold + 추천 알고리즘 | ~30K | 3 files | 60-90분 |
| **S4-UX** | Integration + L3 Contract | SC-09 + SC-10 + 7-perspective verification 재실행 + commands/bkit.md ext + Korean guide §9 | ~35K | 3 files + tests | 60-90분 |

**총 ~135K tokens, 4 sprints**. 각 sprint **단일 세션 안전** (≤ 100K tokens, 1H prompt cache 활용 가능). 의존성: S1 → S2 → S3 → S4 (sequential).

### 5.2 Sprint 의존성 그래프

```
S1-UX (P0/P1 fixes)
  ↓ (start phase reset 해결 후 master-plan 가능)
S2-UX (Master Plan Generator)
  ↓ (Master Plan 생성 후 분할 알고리즘 필요)
S3-UX (Context Sizer)
  ↓ (3건 통합 후 verification)
S4-UX (Integration + Contracts)
```

### 5.3 각 Sprint 의 PDCA Cycle

매 sprint 7 phases (Sprint 1-5 패턴 동일):

```
PRD → Plan → Design → Do → Iterate (matchRate 100%) → QA (quality gates) → Report
```

**필수 Agent 활용 (3-Skill 조합)**:

| Phase | Skill | Agent |
|-------|-------|-------|
| PM (optional) | `/pdca pm` | `bkit:pm-lead` → discovery/strategy/research/prd (Sprint 5 verification 사례) |
| Plan | (skill 자체) | (LLM main) |
| Design | (skill 자체) | (LLM main, 단 deep code analysis 시 Explore agents 격리 spawn) |
| Do | (skill 자체) | (LLM main + 격리 sub-agents for batch ops) |
| Iterate | `bkit:pdca-iterator` | gap-detector + pdca-iterator (자동, max 5) |
| QA | `/pdca qa` | `bkit:qa-lead` → qa-test-planner/generator/monitor/debug-analyst |
| Report | `bkit:report-generator` | (haiku 모델 사용, 비용 절약) |

---

## 6. `/control` Auto-Run Scope 통합 (사용자 명시 4-3)

### 6.1 Trust Level 매트릭스

| Level | stopAfter | 본 Sprint UX 추천 | 이유 |
|-------|-----------|------------------|------|
| L0 | plan | 첫 sprint 추천 | 모든 단계 사용자 승인 |
| L1 | design | (skip) | hint mode |
| L2 | do | 일반 sprint | plan + design auto, do 승인 |
| L3 | qa | **권장 default** | plan → qa auto, archive 만 승인 |
| L4 | archived | 검증된 multi-sprint cycle | full-auto, 4 trigger 안전망 |

### 6.2 4 Auto-Pause Triggers 안전망

L4 Full-Auto 진입 시에도 다음 발동:

| Trigger | 발동 조건 | 동작 |
|---------|----------|------|
| QUALITY_GATE_FAIL | M1-M10/S1-S4 미달 | 즉시 정지, `/sprint resume` 으로 manual approval |
| ITERATION_EXHAUSTED | iterate 5회 후 matchRate < 임계값 | 정지, design 재검토 권장 |
| BUDGET_EXCEEDED | token 또는 시간 예산 초과 | 정지, sprint 분할 권장 |
| PHASE_TIMEOUT | 단일 phase budget 초과 | 정지, manual 진행 |

### 6.3 사용자 명시 4-1 / 4-2 충족

- 4-1 (Master Plan generator): `/sprint master-plan <project>` → multi-sprint plan + Task 자동 등록
- 4-2 (Context window 격리): context-sizer 가 sprint 별 token estimate → 100K 초과 시 자동 분할 추천 → 단일 세션 안전

---

## 7. Skills + Agents 활용 매트릭스 (사용자 명시 4)

### 7.1 `/pdca pm` (Sprint 진입 전 user discovery)

**언제 활용**: 사용자가 vague requirement 제공 시 (e.g., "Q2 launch project 시작") — Master Plan 작성 전에 PM Analysis 필요

**Agent chain**:
```
pm-lead (orchestrator)
  ├─ pm-discovery (5-Step Discovery Chain + OST)
  ├─ pm-strategy (JTBD + Lean Canvas)
  ├─ pm-research (Personas + Competitors + TAM/SAM)
  └─ pm-prd (PRD v2.0 synthesis)
```

**Sprint master-plan 통합**: `bkit:sprint-master-planner` agent 가 `/pdca pm <project>` 의 PRD 결과를 input 으로 받아 Sprint 분할 결정.

### 7.2 `/pdca team` (각 Sprint Do phase 대규모 구현)

**언제 활용**: Sprint Do phase 가 multi-component implementation (e.g., frontend + backend + infra) — CTO Team 활용

**Enterprise-only**: Trust L3+ + project level Enterprise

### 7.3 `/pdca qa` (각 Sprint QA phase)

**언제 활용**: Sprint QA phase = 7-Layer S1 dataFlow 검증 + bkit-evals + claude -p (사용자 명시 3)

**Agent chain**:
```
qa-lead (orchestrator)
  ├─ qa-test-planner (L1-L5 test plan)
  ├─ qa-test-generator (test code generation)
  ├─ qa-debug-analyst (runtime error analysis)
  └─ qa-monitor (Docker log monitoring)
```

### 7.4 신규: `bkit:sprint-master-planner` Agent 강화

본 sprint 의 핵심 deliverable. 다음 frontmatter:

```yaml
name: sprint-master-planner
description: |
  Sprint Master Plan generator — analyzes user requirements + codebase
  + recommends sprint 분할 with context window awareness.

  Triggers: sprint master plan, multi-sprint planning,
  스프린트 마스터 계획, スプリントマスター, 冲刺主计划,
  plan maestro sprint, plan principal sprint
allowed-tools:
  - Read
  - Glob
  - Grep
  - WebSearch
  - WebFetch
  - Bash
isolation: subagent
model: opus
```

Agent body 가 다음 work:
1. 사용자 requirement 읽기 (`/pdca pm` PRD 우선 참조)
2. 코드베이스 grep (관련 파일 식별)
3. Web research (필요 시 — 도메인 trend, 경쟁사 등)
4. context-sizer 호출 → token estimate per feature
5. Sprint 분할 추천 (≤ 100K tokens/sprint, 의존성 그래프)
6. Master Plan markdown 생성 → `docs/01-plan/features/<project>.master-plan.md`

---

## 8. Hooks Lifecycle 통합 (사용자 명시 5-3)

### 8.1 본 Sprint 가 활용하는 hooks (변경 0)

| Hook Event | 본 Sprint UX 활용 |
|-----------|------------------|
| SessionStart | active sprint 발견 → 이어서 진행 자동 안내 (사용자 명시 4-2) |
| UserPromptSubmit | 8개국어 trigger 감지 → bkit:sprint master-plan suggested |
| PreToolUse (Write\|Edit) | Master Plan 작성 시 pre-write.js 가 docs/01-plan/ 경로 허용 |
| PostToolUse | sprint state 변경 시 audit-logger NDJSON |
| Stop/SubagentStop | Master Plan 작성 sub-agent 완료 시 main context 으로 결과 전달 |
| TaskCreated/Completed | Master Plan 승인 후 N Sprint Task 자동 등록 |

### 8.2 8개국어 자동 trigger (사용자 명시 1)

skills/sprint/SKILL.md frontmatter 의 description triggers field 에 8-language master plan 키워드 추가 (위 §2.3 참조).

trigger 매칭 알고리즘 (`lib/intent/language.js`):
- 사용자 prompt 에 "master plan" / "마스터 계획" / "マスタープラン" 등 발견 시 → bkit:sprint skill suggested + master-plan action 추천
- 우선순위 chain: explicit `/sprint master-plan` > keyword > file context

---

## 9. Doc = Code Invariant 보존

본 sprint 의 deliverable 모두 Doc=Code 충족:

| Code | Doc |
|------|-----|
| `lib/application/sprint-lifecycle/master-plan.usecase.js` | `docs/02-design/features/sprint-ux-improvement.design.md` |
| `lib/application/sprint-lifecycle/context-sizer.js` | (same design doc) |
| `scripts/sprint-handler.js` handleMasterPlan | (same) |
| Master Plan generator output | `docs/01-plan/features/<project>.master-plan.md` (사용자 project) |
| L3 Contract SC-09 + SC-10 | `tests/contract/v2113-sprint-contracts.test.js` |

`scripts/docs-code-sync.js` 0 drift 유지.

---

## 10. Sprint UX 자체 Phase 흐름

| Phase | 산출물 | 소요 |
|-------|--------|------|
| **PRD** (본 sprint 의 PRD) | `docs/01-plan/features/sprint-ux-improvement.prd.md` | 30분 |
| **Plan** | `docs/01-plan/features/sprint-ux-improvement.plan.md` (R1-R12 + AC-01~40) | 30분 |
| **Design** | `docs/02-design/features/sprint-ux-improvement.design.md` (코드베이스 깊이 분석 + 12-15 files spec) | 45분 |
| **Sub-Sprint S1-UX** (P0/P1 fixes) | 4 files + Sprint 1-5 regression | 60-90분 |
| **Sub-Sprint S2-UX** (Master Plan generator) | 5 files | 90-120분 |
| **Sub-Sprint S3-UX** (Context Sizer) | 3 files | 60-90분 |
| **Sub-Sprint S4-UX** (Integration + Contracts) | 3 files + tests | 60-90분 |
| **Iterate** (Sprint UX 전체) | matchRate 100% | 30분 |
| **QA** (7-perspective 재실행) | 사용자 명시 3 매트릭스 | 60분 |
| **Report** | 종합 보고서 | 30분 |

**총 estimate**: 8-10시간 (multi-session, 4 sub-sprints 단일 세션 안전 분할)

---

## 11. Quality Gates + Acceptance Criteria (요약)

### 11.1 Quality Gates (M1-M10 + S1-S4)

| Gate | Threshold | 본 sprint 적용 |
|------|-----------|---------------|
| M1 matchRate | ≥ 90% | iterate phase 강제 |
| M2 codeQualityScore | ≥ 80 | code-analyzer agent |
| M3 criticalIssueCount | = 0 | qa-lead |
| M4 apiComplianceRate | ≥ 95 | qa-monitor |
| M7 conventionCompliance | ≥ 90 | phase-2-convention |
| M8 designCompleteness | ≥ 85 | design-validator |
| M10 pdcaCycleTimeHours | ≤ 40 | 본 sprint 8-10h estimate |
| S1 dataFlowIntegrity | = 100 | 7-Layer QA |
| S2 featureCompletion | = 100 | acceptance |
| S4 archiveReadiness | = true | sprint archive |

### 11.2 Acceptance Criteria (5 groups)

1. **AC-Master-Plan-Generator** (6 criteria) — `/sprint master-plan <project>` 동작, agent 격리 spawn, Master Plan markdown 생성, Task 자동 등록, 사용자 승인 flow
2. **AC-Context-Sizer** (5 criteria) — token estimate 정확도, ≤ 100K threshold, 자동 분할 추천, bkit.config.json 설정 가능, edge cases
3. **AC-P0-P1-Fixes** (6 criteria) — start phase reset, trust flag normalize, CLI entry, skill args
4. **AC-Persistence** (4 criteria) — 세션 clear 후 이어서, MEMORY.md 자동 update, Task Management 보존
5. **AC-Invariants** (10 criteria) — bkit-system philosophy 7 invariants + Sprint 1-5 invariants (수정 가능 zone 명시)

---

## 12. Pre-mortem (15 시나리오)

[[feedback-thorough-complete]] 의 "꼼꼼함" 적용 — 모든 실패 시나리오 사전 식별:

| # | 시나리오 | 방지 |
|---|---------|------|
| A | P0 bug fix 가 Sprint 1-5 regression 깨뜨림 | Sprint 1-4 226 TCs 매 변경 후 재실행 |
| B | Master Plan agent 격리 spawn 실패 (main context 오염) | Task tool subagent_type 정확 명시 + isolation: subagent |
| C | Context sizer 토큰 추정 부정확 | 보수적 알고리즘 (75K margin) + 사용자 override 옵션 |
| D | `/control L4` Full-Auto runaway | 4 trigger 모두 active + max 100 iterations hard limit |
| E | Task Management race condition | atomic write + TaskCreate sequential (parallel 금지) |
| F | Memory persistence 실패 (file system error) | best-effort + fallback (sprint-status.json 만 보장) |
| G | 8-language trigger 일부 누락 | 기존 8-lang patterns reference + linting |
| H | bkit-system philosophy 위배 | 본 plan §2.1 매트릭스 사전 검증 + design doc 재확인 |
| I | sprint-handler.js enhancement zone 외 변경 | git diff --stat 매 commit 검증 |
| J | L3 Contract SC-09/10 누락 | tests/contract/ 우선 작성 후 implementation |
| K | hooks.json 21:24 깨기 | 신규 hook 추가 0 명시 |
| L | skills/sprint/SKILL.md frontmatter 깨기 | YAML lint + skill validator |
| M | `/pdca pm` PRD 우선 참조 누락 | sprint-master-planner agent prompt 명시 |
| N | claude plugin validate F9-120 12-cycle 깨기 | 매 변경 후 실행 |
| O | 사용자 명시 5 (꼼꼼함) 위배 — 빠르게 끝내려는 inclination | [[feedback-thorough-complete]] 매 phase 시작 시 참조 |

---

## 13. Out-of-scope Confirmation

| 항목 | 별도 |
|------|------|
| BKIT_VERSION 5-loc bump | Sprint 6 (v2.1.13 release) |
| ADR 0007/0008/0009 Accepted | Sprint 6 |
| CHANGELOG v2.1.13 | Sprint 6 |
| GitHub tag/release | Sprint 6 |
| Real backend wiring 확장 (chrome-qa MCP 실 호출) | v2.1.14 (verification #3 base 만) |
| MEMORY.md hook v2 (active sprint section, multi-feature) | v2.1.14 (verification #4 base 만) |
| P3 bkit-evals interactive execution | 별도 (Sprint 5 verification 2 design 충족) |
| P4 claude -p interactive execution | 별도 (Sprint 5 verification 1 충족) |
| `/pdca team` Sprint 통합 (Enterprise multi-feature) | v2.1.14 |

---

## 14. Stakeholder Map

| Stakeholder | Role | 본 Sprint UX 영향 |
|------------|------|-----------------|
| **kay kim** | Decision maker | 모든 phase, 사용자 명시 1-5 |
| **Sprint 1-5 (immutable)** | Foundation | invariant 보존 (단 P0 bug fix 정당화) |
| **bkit 사용자** | End-user | `/sprint master-plan` 1-command UX |
| **bkit core CI** | Invariant guardian | L3 SC-09/10 + Sprint 1-4 regression |
| **Sprint 6 release manager** | v2.1.13 release | 본 Sprint UX 완료 후 진입 |
| **Memory + Task persistence 사용자** | Long-running projects | 세션 clear 후 이어서 |
| **8개국어 사용자** | Multi-lingual | trigger 매트릭스 |
| **bkit-system 철학 보존** | Philosophy guardian | 7 invariants 보존 |

---

## 15. Memory Persistence Strategy (사용자 명시 4-2 detailed)

### 15.1 3-Layer Persistence

| Layer | 위치 | 책임 | 세션 clear 후 복원 |
|-------|------|------|-------------------|
| L1 State | `.bkit/state/sprints/<id>.json` | Sprint runtime (phase, status, autoRun, kpi) | atomic load (Sprint 3 stateStore) |
| L1 Master Plan | `.bkit/state/master-plans/<project>.json` | Sprint 분할 매트릭스 + 의존성 + 진행률 | 신규 dir |
| L2 Memory | `~/.claude/projects/<encoded>/memory/MEMORY.md` `## Active Sprints` + `## Sprint History` | 사용자 facing context (next session prompt 우선 참조) | SessionStart hook 자동 read |
| L3 Task Mgmt | (Claude Code TaskList) | Sprint 별 Task entry (status, addBlockedBy) | SessionStart hook 의 TaskList read |

### 15.2 세션 시작 시 자동 복원 flow

```
SessionStart hook:
  1. read .bkit/state/master-plans/ (active projects)
  2. read MEMORY.md ## Active Sprints
  3. for each active:
     - check sprint phase + last activity
     - if idle > 7days: prompt "Sprint <id> idle <N>d, resume? archive?"
     - else: show in dashboard
  4. UserPromptSubmit hook:
     - if user mentions sprint id → auto suggest /sprint resume
```

---

## 16. Final Master Plan Checklist (꼼꼼함 최종 검증)

매 row 가 사용자 명시 1-5 또는 bkit-system invariant 와 연결:

- [x] **사용자 명시 1 (8개국어)** — §2.3 master-plan trigger 추가
- [x] **사용자 명시 2 (Sprint 유기적)** — §3.2 3-Skill 매트릭스 + L3 Contract SC-09/10
- [x] **사용자 명시 3 (eval+claude -p+4-System+diverse)** — §11.2 AC + Sprint 5 verification 결과 통합
- [x] **사용자 명시 4 (Master Plan + context window)** — §3.1 +§4.6+§4.7+§5.1+§15 핵심 deliverable
- [x] **사용자 명시 5 (꼼꼼함)** — 16 sections + 15 pre-mortem + [[feedback-thorough-complete]] reference 매 phase
- [x] **bkit-system philosophy 7 invariants** — §2.1 매트릭스 사전 검증
- [x] **Sprint 1-5 invariants** — §4.1 P0 fix 정당화 + Plan §R8 명시
- [x] **3-Skill 통합** — §3.2 `/sprint`+`/pdca`+`/control` 매트릭스
- [x] **`/pdca pm`+`/pdca team`+`/pdca qa` 활용** — §7 매트릭스
- [x] **Memory persistence (사용자 명시 4-2)** — §15 3-Layer
- [x] **Hooks 21:24 invariant** — §3.5 + §12.K 명시
- [x] **`/control` L0-L4** — §6 매트릭스 + 4 trigger 안전망
- [x] **Doc=Code** — §9 매트릭스
- [x] **F9-120 13-cycle 목표** — §0.4 + §12.N
- [x] **Pre-mortem 15** — §12 매트릭스
- [x] **Sprint 분할 (단일 세션 안전)** — §5.1 4 sub-sprints (~25-45K tokens/sprint)

---

**Master Plan Status**: ★ **Draft v1.0 완료**.
**Next**: 사용자 승인 후 → Plan phase → Design phase → S1-UX Sprint 진입 (P0/P1 fixes).
**예상 총 소요**: 8-10시간 (multi-session, 4 sub-sprints 단일 세션 안전 분할).
**사용자 명시 1-5 보존 확인**: 16/16 checklist row PASS.
