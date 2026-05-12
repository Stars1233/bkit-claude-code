# bkit Sprint Management — Master Plan

> **Feature**: sprint-management (bkit user-facing generic capability, NOT bkit 내부 개발 sprint)
> **Target Release**: bkit v2.1.13 (CC v2.1.139+ 환경)
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Date**: 2026-05-12
> **Branch**: `feature/v2113-sprint-management`
> **Base**: main `5f6592b` (+ commit `1aec261` cc-version-analysis report series)
> **Status**: Draft **v1.2** — Sprint 1+2+3+4 GA + Sprint 5 Production Hardening 후 LOC reconciliation
> **사용자 명시 결정**: 사용자 = **bkit 설치한 누구나**. gpters-portal의 30-sprint matrix는 generic primitives만 추출, 도메인 특화 영역은 제외.
>
> **v1.2 변경 사항** (2026-05-12, Sprint 5 추가):
> - **LOC reconciliation 매트릭스** (§19 신규) — Sprint 1+2+3+4 실측 LOC 정정 (estimate 2,400 → actual 4,867 + Sprint 5 ~1,250)
> - Sprint 5 추가 (`v2113-sprint-5-quality-docs`) — Quality + Documentation: L3 Contract test (tracked) + 3 production adapter scaffolds + sprint-handler.js handleFork/Feature/Watch real impl + Korean user/migration guides
> - 사용자 명시 3 (2026-05-12) — Sprint 5 QA = bkit-evals + claude -p + 4-System 공존 + Sprint↔PDCA mapping (다양한 관점)
>
> **v1.1 변경 사항** (2026-05-12 D11-D14 결정 반영):
> - `/sprint start` default behavior = **auto-run** (Plan → Design → Do → Iterate → QA → Report 자율 실행). Trust Level 조건부 scope.
> - Auto-pause triggers 4건 명시 (Quality Gate fail, matchRate, token budget, phase timeout)
> - `/sprint watch` 신규 sub-action 추가 (14 → **15 sub-actions**)
> - Dashboard 모드: SessionStart 기본 + `/sprint watch` 옵션

---

## 0. Executive Summary

| 항목 | 내용 |
|------|------|
| **Mission** | bkit 설치한 임의 사용자가 자신의 프로젝트에서 sprint(작업 묶음)를 정의 + 실행 + 추적 + 보고할 수 있는 **generic capability**를 PDCA처럼 plugin-native로 제공 |
| **Anti-Mission** | gpters-portal 같은 특정 도메인 30-sprint matrix를 강제하지 않음. bkit 내부 개발 sprint (Sprint A Observability 등 cc-version-analysis의 묶음)와 무관 |
| **Core Primitives** | (1) Sprint = 사용자 정의 작업 묶음 (이름/기간/scope/목표) / (2) Sprint Phase = `prd → plan → design → do → iterate → qa → report` 7-phase / (3) Sprint > Feature > Task 3-tier 계층 / (4) State machine 7-state / (5) Master Plan template-driven 문서화 |
| **Phase 흐름 (사용자 요구)** | `prd or plan → design → do → iterate(100% 목표) → qa(UI→API→DB→API→UI 데이터 흐름 검증) → report` |
| **Command Surface** | `/sprint init / start / status / watch / phase / iterate / qa / report / archive / list / feature / pause / resume / fork / help` **15개 sub-action** (PDCA 미러 + auto-run). 핵심: **`/sprint start` = auto-run default** (Trust Level 조건부 scope, v1.1 정정) |
| **Integration Scope** | bkit 기존 자산 통합: PDCA 9-phase / Trust Score (L0~L4) / Quality Gates M1-M10 / Clean Architecture 4-Layer / Defense-in-Depth 4-Layer / Hook 21 events / Skills 43 / Agents 36 / Templates / Memory & State / Code Convention |
| **cc-v2134~v2139 개선점 통합** | ENH-302 (Hook exec form), ENH-303 (PostToolUse continueOnBlock — sprint QA에 활용 결정적), ENH-304 (Agent View — sprint multi-agent visibility), ENH-292 (Sequential Dispatch — sprint orchestrator 패턴), ENH-281 (OTEL 10 — sprint metric 관측), ENH-286 (Memory Enforcer — sprint master plan 보호), ENH-289 (Defense Layer 6 — sprint phase audit) |
| **Architecture Layer Map** | Domain (Sprint entity + ports) / Application (sprint-lifecycle) / Infrastructure (state-store + telemetry) / Presentation (skill + agents + hooks + templates) |
| **Documentation Locations** | `docs/01-plan/features/sprint-management.master-plan.md` (본 문서) / 사용자 sprint는 `docs/01-plan/features/{sprint-name}.prd.md`, `.plan.md`, `.design.md`, `.iterate.md`, `.qa-report.md`, `.report.md` |
| **State Persistence** | `.bkit/state/sprint-status.json` (root state) + `.bkit/state/sprints/{name}.json` (개별 sprint) + `.bkit/runtime/sprint-feature-map.json` (sprint ↔ feature 매핑) |
| **Quality Gates** | bkit M1-M10 + Sprint-specific Gates (S1 data-flow integrity, S2 feature completion rate, S3 sprint velocity, S4 archive readiness) |
| **Implementation Roadmap** | 7-Stage (Domain → Application → Infrastructure → Presentation → Templates → Documentation → Testing), 약 +2,400 LOC + 28 신규 TC + 1 PR (or 7 micro-PRs) |
| **Risk** | Scope creep (사용자 도메인 매트릭스 강제 우려), PDCA-Sprint 개념 혼동, Trust Score 영향, ENH-292 caching 회귀 (multi-agent spawn 시) |
| **Success Criteria (5건)** | (1) `/sprint init my-sprint` → 1분 내 master plan + .bkit/state 생성 / (2) **`/sprint start my-sprint` → Plan부터 Trust Level scope까지 자율 실행** (L4: Archive, L3: Report, L2 이하: 각 phase 승인) / (3) iterate phase가 matchRate 100% 도달까지 자동 반복 (max 5회) / (4) qa phase가 UI→API→DB→API→UI 7-layer 검증 자동 / (5) `/sprint report` cumulative KPI + lesson learned 자동 생성 + (★ v1.1 추가) Auto-pause triggers 4건 모두 작동 (Quality Gate fail / matchRate / token budget / phase timeout) |

---

## 1. Context Anchor (Plan → Design → Do 전파)

> gpters-portal pattern 인용: Plan에서 정의된 Context Anchor를 Design/Do의 모든 산출물에 복사하여 추적성 보장.

| Key | Value |
|-----|-------|
| **WHY** | bkit은 현재 단일 feature 단위 PDCA만 제공. 사용자가 multi-feature 묶음 (release / milestone / 분기 작업)을 운영할 때 **상위 컨테이너**가 없어 cumulative KPI / phase coordination / archive 일관성 부재 |
| **WHO** | (1) Solo 개발자 (자기 프로젝트의 v1.0 launch sprint), (2) 팀 리드 (분기 마일스톤 sprint), (3) 컨설턴트 (클라이언트 프로젝트 phase 분리), (4) Bootcamp 학생 (학습 sprint), (5) AI Native 풀스택 개발자 (multi-feature 동시 진행) |
| **WHAT (도메인)** | Sprint = 1개 이상의 Feature를 묶은 **시간 + scope + 목표** 컨테이너. Feature는 기존 bkit PDCA 9-phase 그대로. Sprint는 그 위에서 **start/track/coordinate/archive** 수준의 메타 워크플로우 |
| **WHAT NOT** | (1) 특정 산업/도메인 매트릭스 (gpters-portal `post-edit`, `write-foundation` 같은 도메인 명사 강제 X), (2) 30개 사전 정의 sprint timeline (사용자가 자유롭게 정의), (3) bkit 내부 개발용 (Sprint A Observability 같은 maintainer-only 묶음과 분리), (4) Agile Scrum framework 강제 (story points / velocity는 옵션) |
| **RISK** | (a) **Scope creep**: gpters의 30-sprint matrix를 그대로 가져오면 generic 실패. (b) **PDCA-Sprint 개념 혼동**: 사용자가 Sprint vs Feature 구분 못 함 → UX 실패. (c) **Trust Score regression**: sprint phase 진입이 Trust 계산 깨뜨림. (d) **ENH-292 caching 회귀**: sprint orchestrator multi-agent spawn 시 cache miss 4%→40%. (e) **사용자 도메인 충돌**: 사용자가 자신의 sprint를 정의할 때 bkit phase 명칭과 충돌 |
| **SUCCESS** | (1) bkit fresh install 30분 내 첫 sprint 운영 성공. (2) PDCA 사용자 90%+가 sprint 추가 학습 < 15분. (3) sprint metric (cumulative KPI) 자동 갱신 100%. (4) Trust Score regression 0건. (5) ENH-292 sequential dispatch 패턴 sprint에 적용 — caching cost +10% 이내 |
| **SCOPE (정량)** | 신규 Skills 1 (sprint primary) + Agents 4 (sprint-orchestrator, sprint-master-planner, sprint-qa-flow, sprint-report-writer) + Templates 7 (master-plan + 6 phase) + Hooks events 신규 0 (기존 21 events 재사용) + State files 3 (root + individual + map) + Lib modules 약 12 (domain + application + infrastructure) + Skill sub-actions 14 + TC 28 (L1 unit + L2 integration + L3 contract) |
| **OUT-OF-SCOPE** | (1) GitHub Issue ↔ Sprint 자동 동기화 (v2.1.14 후보), (2) Jira / Linear 통합 (v2.1.15 후보), (3) Sprint velocity ML 예측 (v2.1.16), (4) Multi-user team mode (v2.2.0 — 현재 single user 가정), (5) Sprint cross-project (현재 single project 가정) |

---

## 2. Phase A 분석 통합 — gpters-portal에서 추출한 generic primitives

> **사용자 명확화 반영**: gpters의 30-sprint matrix / `post-edit` `write-foundation` 같은 domain-특화 영역은 **제외**. 다음 **generic primitives만 추출**하여 bkit user-facing 기능으로 추상화.

### 2.1 채택할 primitive (8건)

| Primitive | gpters 출처 | bkit generic 추상화 | 적용 위치 |
|-----------|------------|-------------------|----------|
| **P1. Sprint State Machine** | `.claude/rules/sprint-rules.md:180~185` | 7-state generic (pending/active/iterating/qa/completed/archived/paused). 도메인 자유. | Domain layer |
| **P2. PDCA 풀세트 7단계** | `.claude/rules/sprint-rules.md:54~69` | `prd or plan → design → do → iterate(100%) → qa → report` 사용자 요구사항과 일치 | Application layer |
| **P3. Quality Gate auto-verify** | `.claude/rules/sprint-rules.md:70~85` (11 gates) | bkit M1-M10 통합 + Sprint S1-S4 추가 (S1 data-flow integrity, S2 feature completion, S3 velocity, S4 archive readiness) | Application + Infrastructure |
| **P4. Template-driven 문서 생성** | `.claude/templates/sprint-plan.template.md` (85줄), `sprint-design.template.md` (112줄) | bkit 자체 templates/ 신설 (7개 template, Context Anchor 패턴 + §8 Test Plan Matrix 5-layer) | Templates |
| **P5. Matrix 자동 동기화 (3개)** | sprint-orchestrator 매트릭스 갱신 패턴 | bkit gap-detector 강화 (data-flow-matrix / api-contract-matrix / test-coverage-matrix) | Skills + Infrastructure |
| **P6. Context Anchor 공유 메타데이터** | `sprint-plan.template.md:§Context Anchor` | Plan → Design → Do → Iterate → QA → Report 전 phase에서 Context Anchor 보존 (사용자 요구사항 추적성) | Templates 전 phase |
| **P7. §8 Test Plan Matrix (5-layer)** | `sprint-design.template.md:§8.1~8.5` (L1 API / L2 UI / L3 E2E / L4 Perf / L5 Security) | Design phase 산출물 필수 항목으로 채택. sprint QA phase의 input | Templates + Application |
| **P8. Specialist Agent 위임 패턴** | `sprint-orchestrator.md` (11 specialists 위임) | bkit 36 agents 중 sprint-relevant 4건 신설 + 기존 agent (cto-lead 10 blocks, qa-lead 4-agent, pm-lead 4-agent, pdca-iterator, report-generator) 재사용 | Agents |

### 2.2 명시적 제외 (5건)

| 제외 항목 | gpters 출처 | 제외 이유 |
|---------|------------|----------|
| **X1. 30-Sprint Timeline** | `docs/01-plan/sprint-master/00-sprint-master-plan.md` | gpters 도메인 특화 (107일 portal 마이그레이션). bkit 사용자는 sprint 수/기간/내용 자유 정의 |
| **X2. 도메인 명사 (`post-edit`, `write-foundation`, `cutover`)** | `01-sprint-grid.md` | bkit 사용자가 자신 도메인 명명. bkit은 sprint name validation만 (kebab-case 권장) |
| **X3. Portal IA / Admin IA matrix** | `01-sprint-grid.md:Portal IA 88 pages / Admin IA 21 menus` | gpters 특화. bkit은 user-defined IA matrix template 옵션만 제공 |
| **X4. arch-baseline 79 violation** | `02-architecture-baseline.md` | gpters 코드베이스 baseline. bkit은 baseline 측정 hook만 제공 (사용자 baseline 자유) |
| **X5. Phase 0-7 hard-coded matrix** | `00-sprint-master-plan.md:Phase 0~7` | bkit phase는 사용자 sprint phase와 독립. PDCA phase 9개만 frozen, sprint phase는 사용자 정의 (선택사항) |

---

## 3. Phase B 분석 통합 — bkit 컨텍스트 엔지니어링과 통합 지점

### 3.1 PDCA Application Layer 통합

**기존 frozen 9-phase** (`lib/application/pdca-lifecycle/phases.js:18-28`):
```javascript
const PHASES = Object.freeze({
  PM: 'pm', PLAN: 'plan', DESIGN: 'design', DO: 'do',
  CHECK: 'check', ACT: 'act', QA: 'qa', REPORT: 'report', ARCHIVE: 'archive',
});
```

**Sprint 통합 방향**: Sprint는 frozen PDCA 9-phase **위에 얹는 메타 컨테이너**. Feature PDCA enum 변경 X (ADR 0005 invariant 보존). 신규 enum:

```javascript
// lib/application/sprint-lifecycle/phases.js (신규)
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

const SPRINT_PHASE_ORDER = [
  SPRINT_PHASES.PRD,
  SPRINT_PHASES.PLAN,
  SPRINT_PHASES.DESIGN,
  SPRINT_PHASES.DO,
  SPRINT_PHASES.ITERATE,
  SPRINT_PHASES.QA,
  SPRINT_PHASES.REPORT,
  SPRINT_PHASES.ARCHIVED,
];
```

**Sprint vs Feature PDCA 매핑** (UX 가이드):
| Sprint Phase | Feature PDCA Phase 매핑 | 의미 |
|-------------|------------------------|------|
| PRD or PLAN | PM, PLAN | 사용자가 PRD부터 시작 (PM-Lead 4-agent 활용) 또는 plan부터 시작 |
| DESIGN | DESIGN | Sprint 내 모든 Feature design 통합 |
| DO | DO | 모든 Feature 병렬 구현 |
| ITERATE | CHECK + ACT 반복 | matchRate < 100% 시 ACT → DO 반복 (사용자 요구) |
| QA | QA | UI→API→DB→API→UI 7-layer 데이터 흐름 검증 |
| REPORT | REPORT | Sprint 종합 보고서 + cumulative KPI |
| ARCHIVED | ARCHIVE | Sprint 종료, 다음 sprint로 carry items 식별 |

### 3.2 Transition Adjacency Map

**기존 PDCA transitions** (`lib/application/pdca-lifecycle/transitions.js:25-35`) **변경 없음**.

**Sprint transitions 신규** (`lib/application/sprint-lifecycle/transitions.js`):
```javascript
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
```

**핵심 전이 규칙**:
- `do → iterate` (matchRate < 100% 자동 트리거, 사용자 요구사항)
- `iterate → do` (auto-fix 1 cycle 후 재구현)
- `qa → do` (QA fail 시 do 복귀)
- 모든 phase → archived 직행 가능 (사용자 abort)

### 3.3 Orchestrator Layer 통합

**기존 lib/orchestrator/** 5 modules (`intent-router`, `next-action-engine`, `team-protocol`, `workflow-state-machine`, `index`).

**확장 지점**:

#### A. `intent-router.js` SKILL_TRIGGER_PATTERNS 15 → 17 확장
```javascript
// 신규 trigger 추가
{
  pattern: /sprint|스프린트|スプリント|冲刺/i,
  skill: 'bkit:sprint',
  confidence: 0.85,
},
{
  pattern: /sprint master plan|마스터 플랜|sprint 시작|sprint 진행/i,
  skill: 'bkit:sprint',
  action: 'init|start|status',
  confidence: 0.90,
},
```

#### B. `next-action-engine.js` PHASE_NEXT_SKILL 확장
```javascript
// 기존 PDCA 9-phase 외 sprint phase 추가
SPRINT_PHASE_NEXT = Object.freeze({
  prd:     (s) => `/sprint plan ${s}`,
  plan:    (s) => `/sprint design ${s}`,
  design:  (s) => `/sprint do ${s}`,
  do:      (s) => `/sprint iterate ${s}`,    // matchRate <100% 자동
  iterate: (s) => `/sprint qa ${s}`,         // 100% 또는 max iter
  qa:      (s) => `/sprint report ${s}`,
  report:  (s) => `/sprint archive ${s}`,
  archived: () => null,
});
```

#### C. `team-protocol.js` Sprint Spawn 패턴 (ENH-292 sequential dispatch 적용)

**ENH-292 P0 9-streak 결정적** — sub-agent caching 10x 회귀. Sprint orchestrator가 multi-agent spawn 시 sequential dispatch (parallel X). bkit 차별화 #3 self-referential 적용.

```javascript
// SPRINT_TASK_TEMPLATE (cto-lead의 10 blocks 패턴 sprint 버전)
const SPRINT_SPAWN_TEMPLATE = {
  prd: ['pm-lead'],                                  // 1 agent (4-agent 내부 spawn은 pm-lead 내에서)
  plan: ['product-manager', 'pm-lead'],              // sequential
  design: ['frontend-architect', 'infra-architect', 'security-architect', 'qa-strategist'], // sequential, ENH-292 적용
  do: ['code-analyzer', 'bkend-expert', 'frontend-architect'], // sequential
  iterate: ['pdca-iterator', 'gap-detector'],        // sequential
  qa: ['qa-lead'],                                   // 1 agent (4-agent 내부 spawn)
  report: ['report-generator'],                      // 1 agent
};
```

#### D. `workflow-state-machine.js` Sprint Control Level 통합

기존 Trust Score 0-100 + Level L0-L4. Sprint phase auto-advance는 Control Level 조건부:
- L0 (Manual): 사용자가 각 phase 명시적 `/sprint phase {name} next`
- L1 (Semi-auto): bkit이 hint만 (next-action-engine)
- L2 (Guided): do → iterate 자동, iterate → qa는 사용자 승인
- L3 (Auto): iterate → qa 자동, qa → report는 사용자 승인 (단 모든 quality gate PASS 시)
- L4 (Full-auto, Trust ≥ 85, fastTrack on): 전 phase 자동, archive까지 자율

### 3.4 Hook 통합 (21 events 24 blocks 재사용)

신규 hook event 없음. **기존 21 events 재사용**:

| 기존 Event | Sprint 통합 |
|-----------|------------|
| **SessionStart** (`scripts/session-start.js:359`) | Sprint dashboard 렌더링 추가 (active sprint, phase, matchRate, next action) |
| **UserPromptSubmit** (`scripts/user-prompt-handler.js`) | `/sprint *` 명령 라우팅 + intent-router의 Sprint trigger 처리 |
| **PostToolUse Skill** (`scripts/skill-post.js`) | sprint skill 실행 후 state 갱신 + next-action-engine 호출 + (★ ENH-303 결합) deny reason 모델 전달 |
| **Stop** (`scripts/unified-stop.js`) | sprint phase 자동 advance 트리거 (Trust Level 조건부) + token-ledger sprint metric 기록 |
| **SubagentStop** | Sprint specialist spawn 후 결과 통합 + next agent dispatch |
| **SessionEnd** | sprint state persist + cumulative KPI snapshot 저장 |
| **PreToolUse Write** (`scripts/pre-write.js`) | sprint master plan / phase doc 보호 (★ ENH-286 Memory Enforcer 적용 — sprint master plan을 PreToolUse deny-list로 보호) |
| **PreToolUse Bash** (`scripts/unified-bash-pre.js`) | sprint archive 명령 시 destructive 확인 |
| **PostToolUse Write** (`scripts/unified-write-post.js`) | sprint phase doc 작성 후 matchRate 재계산 트리거 |
| **PreCompact / PostCompact** | sprint state는 compact 대상 X (memory 절약) |
| **InstructionsLoaded** | sprint 사용자 가이드 컨텍스트 주입 |
| **CwdChanged** | sprint 프로젝트 경계 검증 (cross-project 차단) |

### 3.5 Memory & State 통합

**기존 .bkit/state/**:
- `pdca-status.json` (feature PDCA root state)
- `control-state.json` (L0-L4 level + Trust Score)

**Sprint 신규 state 파일 3건**:

#### A. `.bkit/state/sprint-status.json` (root)
```json
{
  "version": "1.0",
  "schemaVersion": "sprint-v1",
  "activeSprintId": "my-launch-q2-2026",
  "lastActivity": "2026-05-12T14:30:00Z",
  "sprints": {
    "my-launch-q2-2026": {
      "id": "my-launch-q2-2026",
      "name": "Q2 2026 Launch",
      "phase": "design",
      "phaseEnteredAt": "2026-05-12T10:00:00Z",
      "createdAt": "2026-05-10T...",
      "trustLevelAtStart": "L2",
      "features": ["feature-auth", "feature-billing", "feature-onboarding"],
      "kpi": {
        "matchRate": null,
        "criticalIssues": 0,
        "qaPassRate": null,
        "cumulativeTokens": 124500
      }
    },
    "internal-tools-q3": { "status": "archived", "phase": "archived", "archivedAt": "...", ... }
  }
}
```

#### B. `.bkit/state/sprints/{name}.json` (개별 sprint 상세, **v1.1 schema 확장 — auto-run + auto-pause 지원**)
```json
{
  "id": "my-launch-q2-2026",
  "name": "Q2 2026 Launch",
  "version": "1.1",
  "phase": "design",
  "status": "active",
  "autoRun": {
    "enabled": true,
    "scope": "report",
    "trustLevelAtStart": "L3",
    "startedAt": "2026-05-12T10:00:00Z",
    "lastAutoAdvanceAt": "2026-05-12T11:30:00Z"
  },
  "config": {
    "budget": 1000000,
    "phaseTimeoutHours": 4,
    "maxIterations": 5,
    "matchRateTarget": 100,
    "matchRateMinAcceptable": 90,
    "dashboardMode": "session-start",
    "manual": false
  },
  "autoPause": {
    "armed": ["QUALITY_GATE_FAIL", "ITERATION_EXHAUSTED", "BUDGET_EXCEEDED", "PHASE_TIMEOUT"],
    "lastTrigger": null,
    "pauseHistory": []
  },
  "phaseHistory": [
    { "phase": "prd", "enteredAt": "2026-05-10T...", "exitedAt": "2026-05-10T...", "durationMs": 7200000 },
    { "phase": "plan", "enteredAt": "2026-05-10T...", "exitedAt": "2026-05-11T...", "durationMs": 86400000 },
    { "phase": "design", "enteredAt": "2026-05-12T10:00:00Z", "exitedAt": null, "durationMs": null }
  ],
  "iterateHistory": [
    { "iteration": 1, "matchRate": 78, "fixedTaskIds": ["t-23", "t-31"], "durationMs": 2700000 }
  ],
  "docs": {
    "masterPlan": "docs/01-plan/features/my-launch-q2-2026.master-plan.md",
    "prd": "docs/01-plan/features/my-launch-q2-2026.prd.md",
    "plan": "docs/01-plan/features/my-launch-q2-2026.plan.md",
    "design": "docs/02-design/features/my-launch-q2-2026.design.md",
    "iterate": "docs/03-analysis/features/my-launch-q2-2026.iterate.md",
    "qa": "docs/05-qa/features/my-launch-q2-2026.qa-report.md",
    "report": "docs/04-report/features/my-launch-q2-2026.report.md"
  },
  "featureMap": {
    "feature-auth":       { "pdcaPhase": "do",     "matchRate": 92, "qa": "pending" },
    "feature-billing":    { "pdcaPhase": "design", "matchRate": null, "qa": "pending" },
    "feature-onboarding": { "pdcaPhase": "plan",   "matchRate": null, "qa": "pending" }
  },
  "qualityGates": {
    "M1_matchRate":         { "current": null, "threshold": 90, "passed": null },
    "M2_codeQualityScore":  { "current": null, "threshold": 80, "passed": null },
    "M3_criticalIssueCount": { "current": 0,   "threshold": 0,  "passed": true },
    "M8_designCompleteness": { "current": 87,  "threshold": 85, "passed": true },
    "S1_dataFlowIntegrity": { "current": null, "threshold": 100, "passed": null },
    "S2_featureCompletion": { "current": 0,    "threshold": 100, "passed": false },
    "S3_velocity":          { "current": null, "threshold": null, "passed": null },
    "S4_archiveReadiness":  { "current": false, "threshold": true, "passed": false }
  },
  "kpi": {
    "matchRate": null,
    "criticalIssues": 0,
    "qaPassRate": null,
    "dataFlowIntegrity": null,
    "featuresTotal": 3,
    "featuresCompleted": 0,
    "featureCompletionRate": 0,
    "cumulativeTokens": 847234,
    "cumulativeIterations": 1,
    "sprintCycleHours": null
  },
  "context": {
    "WHY": "...",
    "WHO": "...",
    "RISK": "...",
    "SUCCESS": "...",
    "SCOPE": "..."
  }
}
```

**Schema 핵심 확장 (v1.0 → v1.1)**:
- `autoRun` 객체 (enabled / scope / trustLevelAtStart / startedAt / lastAutoAdvanceAt)
- `config` 객체 (budget / phaseTimeoutHours / maxIterations / matchRateTarget / matchRateMinAcceptable / dashboardMode / manual) — `/sprint init --budget --timeout` 명령으로 초기화
- `autoPause` 객체 (armed triggers / lastTrigger / pauseHistory) — auto-pause 발생 시 audit trail
- `status` 필드 명시 (active / paused / completed / archived) — phase와 분리

#### C. `.bkit/runtime/sprint-feature-map.json` (역방향 lookup)
```json
{
  "feature-auth":       "my-launch-q2-2026",
  "feature-billing":    "my-launch-q2-2026",
  "feature-onboarding": "my-launch-q2-2026"
}
```

### 3.6 Clean Architecture 4-Layer 통합

**Domain layer (lib/domain/)** — 신규 추가 (forbidden imports 0건 invariant 보존):

```
lib/domain/sprint/
  ├── sprint-entity.js          # Sprint 순수 도메인 객체 (no I/O)
  ├── sprint-phase.js           # SPRINT_PHASES enum (Object.freeze)
  ├── sprint-transitions.js     # SPRINT_TRANSITIONS adjacency
  ├── sprint-validators.js      # name kebab-case, phase 전이 합법성
  └── sprint-events.js          # SprintCreated / SprintPhaseChanged / SprintArchived 도메인 이벤트
```

**Domain Layer 규칙 (메모리 invariant 보존)**:
- ❌ no fs/child_process/net/http/https/os imports
- ❌ no Application/Infrastructure imports
- ✅ 다른 Domain modules import OK
- ✅ Object.freeze로 enum/transitions 불변

**Application layer (lib/application/sprint-lifecycle/)** — 신규:
```
lib/application/sprint-lifecycle/
  ├── index.js                  # public API exports
  ├── start-sprint.usecase.js   # init + start
  ├── advance-phase.usecase.js  # phase 전이 (Trust Level 조건부)
  ├── iterate-sprint.usecase.js # iterate → do 반복 (matchRate 100% 목표)
  ├── verify-data-flow.usecase.js # qa 7-layer 데이터 흐름 검증
  ├── generate-report.usecase.js  # cumulative KPI report
  ├── archive-sprint.usecase.js   # archive + carry items
  └── quality-gates.js          # S1-S4 sprint gates + M1-M10 통합
```

**Infrastructure layer (lib/infra/)** — 신규:
```
lib/infra/sprint/
  ├── sprint-state-store.js     # .bkit/state/sprint-status.json + sprints/ persistence
  ├── sprint-telemetry.js       # OTEL emission (ENH-281 OTEL 10 누적 + agent_id/parent_agent_id F10-139)
  ├── sprint-doc-scanner.js     # sprint master plan + phase docs 스캔
  └── matrix-sync.js            # data-flow-matrix / api-contract-matrix / test-coverage-matrix 자동 갱신
```

**Presentation layer**:
```
skills/sprint/
  ├── SKILL.md
  ├── PHASES.md
  └── examples/
      ├── basic-sprint.md
      ├── multi-feature-sprint.md
      └── archive-and-carry.md

agents/
  ├── sprint-orchestrator.md
  ├── sprint-master-planner.md
  ├── sprint-qa-flow.md
  └── sprint-report-writer.md

templates/sprint/
  ├── master-plan.template.md
  ├── prd.template.md
  ├── plan.template.md
  ├── design.template.md       # §8 Test Plan Matrix 5-layer 필수
  ├── iterate.template.md
  ├── qa.template.md           # UI→API→DB→API→UI 7-layer matrix
  └── report.template.md

hooks/hooks.json               # 신규 event 없음, 기존 21 events 재사용
```

**Port-Adapter 7 pairs 확장 (선택, 향후)**: Sprint specific Port `sprint-store.port` 추가 가능 (state-store.port와 분리 시). 단 v2.1.13 첫 PR에서는 state-store.port 재사용으로 단순화.

### 3.7 Quality Gates M1-M10 + Sprint Gates S1-S4 통합

**기존 M1-M10** (`bkit.config.json:80-130`) 그대로 보존. Sprint phase별 활성 gates:

| Sprint Phase | 활성 Quality Gates | Pass 기준 |
|-------------|-------------------|----------|
| PRD | (none, document only) | template 완성 |
| Plan | M8 designCompleteness | ≥85 |
| Design | M4 apiComplianceRate, M8 designCompleteness | M4 ≥95 + M8 ≥85 + §8 Test Plan Matrix 5-layer 채워짐 |
| Do | M2 codeQualityScore, M7 conventionCompliance, M5 runtimeErrorRate | M2 ≥80 + M7 ≥90 + M5 ≤1 |
| Iterate | **M1 matchRate** (100% 목표, 사용자 요구) | M1 = 100 (max 5 iterations) — 미달 시 사용자 결정 |
| QA | M1 matchRate, M3 criticalIssueCount, **S1 dataFlowIntegrity** | M1 ≥90 + M3 = 0 + **S1 = 100** (UI→API→DB→API→UI 모든 hop PASS) |
| Report | M10 pdcaCycleTimeHours, **S2 featureCompletion**, **S4 archiveReadiness** | M10 ≤ 사용자 설정 + S2 = 100 + S4 = true |

**Sprint-specific Gates 신규 (S1-S4)**:

| Gate | 정의 | 측정 방법 | Pass 기준 |
|------|------|---------|----------|
| **S1 dataFlowIntegrity** | UI → API → DB → API → UI 7-layer 데이터 흐름 무결성 (사용자 요구) | sprint-qa-flow agent가 각 hop 검증 결과 집계 | 100% (모든 hop PASS) |
| **S2 featureCompletion** | Sprint 내 Feature 완료율 | featureMap에서 pdcaPhase: 'archive' / 'report' 인 features / 전체 features | 100% |
| **S3 sprintVelocity** | Sprint 진행 속도 (옵션) | 시간 / phase 평균 / Trust-adjusted | 사용자 설정 (default null) |
| **S4 archiveReadiness** | Archive 준비 완료 | report.md 생성 + cumulative KPI + carry items 식별 | true |

### 3.8 Trust Score / Control Level 통합

**기존 lib/control/trust-engine.js** Trust Score 6-component weighted sum 그대로 보존.

**Sprint 영향**:
- Sprint 시작 시 현재 Level 기록 (`trustLevelAtStart`)
- Sprint completion 후 Trust Score 자동 갱신:
  - S1 dataFlowIntegrity → codeQuality component 보정
  - S2 featureCompletion → successHistory component 보정
  - matchRate 100% 도달 → designCompleteness +5
- Sprint archive 시 cumulative KPI를 trust-profile.json `history` 배열에 추가

**Control Level Sprint 통합**:
```javascript
// lib/control/automation-controller.js 확장
const SPRINT_ADVANCE_POLICY = Object.freeze({
  L0: { autoAdvance: false, requireApproval: ['prd', 'plan', 'design', 'do', 'iterate', 'qa', 'report'] },
  L1: { autoAdvance: false, requireApproval: ['design', 'do', 'iterate', 'qa', 'report'], hint: true },
  L2: { autoAdvance: ['do→iterate'], requireApproval: ['iterate→qa', 'qa→report'] },
  L3: { autoAdvance: ['do→iterate', 'iterate→qa'], requireApproval: ['qa→report'] },
  L4: { autoAdvance: ['do→iterate', 'iterate→qa', 'qa→report', 'report→archive'], requireApproval: [] }, // fastTrack
});
```

### 3.9 Defense-in-Depth 4-Layer 통합

| Layer | Sprint 통합 |
|-------|------------|
| **Layer 1 CC Built-in** | 변경 없음 |
| **Layer 2 bkit PreToolUse Hook** | (★ ENH-286 Memory Enforcer 적용) `scripts/pre-write.js`에 sprint master plan 보호 deny-list 추가. `docs/01-plan/features/*.master-plan.md` 수정은 명시적 `/sprint phase {name} edit-master-plan` 명령으로만 허용 |
| **Layer 3 audit-logger sanitizer** | sprint phase 전이 audit log 기록 (`lib/audit/audit-logger.js` 활용) |
| **Layer 4 Token Ledger NDJSON** | sprint cumulative token cost 자동 집계 (`.bkit/runtime/token-ledger.ndjson` sprint-prefix 필드 추가) |
| **Layer 5 (선택, ENH-289)** | sprint phase 진행 시 post-hoc audit + alarm + auto-rollback. 5/13 review 결정 후 통합 가능 |

---

## 4. Phase C 통합 — cc-v2134~v2139 보고서 개선점 통합

> 사용자 명확화: 이 ENH들은 **bkit 내부 개발 sprint**가 아니라 **bkit 사용자가 자신의 프로젝트 sprint를 운영할 때 적용될 generic 기능 개선**에 통합.

### 4.1 신규 ENH 후보 3건 통합

| ENH | 원래 정의 (cc-version-analysis 컨텍스트) | Sprint Management에 적용된 방식 |
|-----|---------------------------------------|--------------------------------|
| **ENH-302 P2** Hook exec form (F6-139 `args: string[]`) | bkit 24 hook blocks 마이그레이션 후보 | **Sprint hook scripts 신규 작성 시 exec form 기본 적용**. 사용자 환경 Win path 안정성 + quoting 제거 강제. sprint script template (`templates/sprint/_hook-scaffold.template.json`) exec form 표준 |
| **ENH-303 P2** PostToolUse `continueOnBlock` (F7-139) | PostToolUse 3 blocks deny reason 모델 전달 | **★ Sprint QA phase 핵심 결합**. `scripts/skill-post.js`의 sprint skill 호출 처리 시 deny 발생 (예: matchRate < 100%, dataFlow break) → `continueOnBlock: true` + reason ("S1 dataFlowIntegrity FAIL at UI→API hop /api/v1/order") 모델 전달 → 모델 self-correct loop 자동 진입. **bkit 차별화 #5 sprint moat 결정적 후보**. 5/13 review로 P1 격상 검토 |
| **ENH-304 P3** Agent View sanity check (F1-139) | bkit Task spawn background visibility | **Sprint multi-agent spawn 시 적용**. sprint-orchestrator 4 agents 동시 활성화 시 `claude agents`에서 sprint 컨텍스트 표시 (sprint name + phase + agent role). 정식 ENH 아닌 sanity check |

### 4.2 기존 ENH 강화 5건 통합

| ENH | 원래 강화 | Sprint Management에 적용된 방식 |
|-----|---------|--------------------------------|
| **ENH-292 P0** Sub-agent Caching 10x (#56293 9-streak 결정적) | sub-agent spawn 시 sequential dispatch 강제 | **★ Sprint orchestrator 핵심 패턴**. Sprint phase별 specialist agent spawn (예: design phase의 4 architects)을 **sequential dispatch**로 강제. 평행 spawn 시 caching 10x 회귀로 사용자 토큰 비용 폭증 위험. sprint-orchestrator agent body에 명시적 sequential 지시 + `team-protocol.js`에 sprint context 시 sequential override |
| **ENH-281 P1** OTEL 10 누적 (F10-139 agent_id 추가) | OTEL span attributes 자동수혜 | **Sprint telemetry 자동 적용**. `lib/infra/sprint/sprint-telemetry.js`가 sprint phase 전이 / iterate / qa hop별 OTEL span emit. `agent_id` / `parent_agent_id` (F10-139) + `sprint_id` 신규 attribute. CARRY-5 token-meter zero entries 우회 추적 가능 |
| **ENH-286 P1** Memory Enforcer (CLAUDE.md ignore + I1-139 compaction) | PreToolUse deny-list enforced | **Sprint master plan 보호 결정적**. `scripts/pre-write.js`에 sprint master plan + active sprint phase doc는 PreToolUse deny-list로 보호. `/sprint phase edit-master-plan` 명시적 명령으로만 허용 |
| **ENH-289 P0 → P1 강등 검토 (5/13)** | Defense Layer 6 — post-hoc audit + alarm + auto-rollback | **Sprint archive 후 audit 통합 (선택)**. Sprint completion 후 post-hoc audit (matchRate / dataFlow / quality gates 모두 검증). 실패 시 alarm + `/sprint rollback {name}` 제안. ENH-289 강등되더라도 sprint 통합 가치는 별도 |
| **ENH-290 P3** dist-tag drift +13 framework | stable v2.1.126 ↔ latest v2.1.139 drift 데이터 | **사용자 사용 환경 검증**. Sprint init 시 사용자 CC version 검증 — v2.1.123 (보수적), v2.1.139 (균형), v2.1.128/129 비권장. mismatch 경고 |

### 4.3 5/13 통합 의사결정 의존 항목 (보류)

| 항목 | 결정 후 sprint 영향 |
|------|-------------------|
| ENH-289 P0 → P1 강등 | Sprint Defense Layer 6 (post-hoc audit) 통합 강도 결정 |
| MON-CC-NEW-PLUGIN-HOOK-DROP P2 → P1 | Sprint hook reachability sanity check 통합 |
| **ENH-303 P2 → P1 격상** | **Sprint QA phase `continueOnBlock` 적용 우선순위** — P1 격상 시 v2.1.13 1st PR scope에 sprint와 함께 묶음 |

---

## 5. Sprint 도메인 모델 상세

### 5.1 Sprint Entity

```javascript
// lib/domain/sprint/sprint-entity.js
/**
 * @typedef {Object} Sprint
 * @property {string} id                    - kebab-case unique identifier
 * @property {string} name                  - human-readable name
 * @property {string} version               - sprint schema version (e.g., "1.0")
 * @property {SprintPhase} phase            - 현재 phase (SPRINT_PHASES enum)
 * @property {string|null} description      - 사용자 정의 설명
 * @property {string} createdAt             - ISO 8601 timestamp
 * @property {string|null} startedAt        - active 진입 시각
 * @property {string|null} archivedAt       - archive 시각
 * @property {string|null} startDate        - 사용자 정의 시작일 (옵션)
 * @property {string|null} endDate          - 사용자 정의 종료일 (옵션)
 * @property {string} trustLevelAtStart     - L0~L4
 * @property {string[]} features            - 매핑된 feature names
 * @property {SprintContext} context        - WHY / WHO / RISK / SUCCESS / SCOPE
 * @property {SprintKPI} kpi                - 누적 KPI
 * @property {SprintPhaseHistory[]} phaseHistory
 * @property {SprintIterationHistory[]} iterateHistory
 * @property {SprintDocs} docs              - phase별 문서 경로
 * @property {SprintFeatureMap} featureMap  - feature별 진행 상태
 * @property {SprintQualityGates} qualityGates - M1-M10 + S1-S4 measurements
 */
```

### 5.2 Sprint Phase Enum (Object.freeze)

```javascript
// lib/domain/sprint/sprint-phase.js
const SPRINT_PHASES = Object.freeze({
  PRD: 'prd',           // 사용자 요구사항: prd or plan
  PLAN: 'plan',
  DESIGN: 'design',
  DO: 'do',
  ITERATE: 'iterate',   // 사용자 요구사항: 100% 목표
  QA: 'qa',             // 사용자 요구사항: UI→API→DB→API→UI
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

### 5.3 Sprint Transitions

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

module.exports = { SPRINT_TRANSITIONS, canTransition };
```

### 5.4 Sprint Context Anchor

```javascript
// 사용자가 PRD/Plan phase에서 작성, 모든 phase에서 보존
/**
 * @typedef {Object} SprintContext
 * @property {string} WHY    - 왜 이 sprint? (motivation, problem statement)
 * @property {string} WHO    - 영향받는 사용자 (target users, stakeholders)
 * @property {string} RISK   - 실패 시 영향 (risk + mitigation)
 * @property {string} SUCCESS - 성공 기준 (5W1H 명시적)
 * @property {string} SCOPE  - 정량 scope (features 수, LOC estimate, 기간)
 */
```

### 5.5 Sprint KPI

```javascript
/**
 * @typedef {Object} SprintKPI
 * @property {number|null} matchRate           - M1 % (0-100)
 * @property {number} criticalIssues           - M3
 * @property {number|null} qaPassRate          - QA phase L1-L5 PASS %
 * @property {number|null} dataFlowIntegrity   - S1 % (0-100, 100 = all hops PASS)
 * @property {number} featuresTotal
 * @property {number} featuresCompleted        - pdcaPhase: archive / report
 * @property {number} featureCompletionRate    - S2 = completed / total * 100
 * @property {number} cumulativeTokens         - Token Ledger 집계
 * @property {number} cumulativeIterations     - iterate phase 누적 횟수
 * @property {number|null} sprintCycleHours    - phaseHistory 기반 총 시간
 */
```

---

## 6. Command Surface (14 Sub-Actions)

> PDCA 명령 미러 + Sprint specific. 모두 `/sprint {action} [name] [...args]` 형태.

| Sub-Action | Syntax | 동작 |
|-----------|--------|------|
| **init** | `/sprint init {name} [--phase prd|plan] [--budget <tokens>] [--timeout <hours>]` | 신규 sprint 초기화. master-plan template 자동 생성 (`docs/01-plan/features/{name}.master-plan.md`). `.bkit/state/sprints/{name}.json` 생성. phase는 prd (default) 또는 plan 선택. **budget** (기본 1M tokens) + **timeout** (기본 4시간/phase) auto-pause trigger 사전 설정 |
| **start** | `/sprint start {name} [--from <phase>] [--manual]` | **★ Default = AUTO-RUN** (v1.1 정정). Plan → Design → Do → Iterate(100%) → QA(7-layer) → Report **자율 실행** (Trust Level 조건부 scope, §11.2 참조). `--from <phase>` 시 해당 phase부터 시작 (default: current). `--manual` 시 auto-run 비활성화 + 각 phase 사용자 승인. Auto-pause triggers 4건 활성화 자동 |
| **status** | `/sprint status [name]` | name 미지정: 모든 sprint 요약 dashboard. name 지정: 특정 sprint 상세 (phase / matchRate / features / KPI / next action). auto-run 중에는 elapsed time + cumulative token cost + ETA |
| **watch** | `/sprint watch [name]` | **★ v1.1 신규 sub-action**. Live dashboard mode (`/pdca-watch` pattern). 30초 주기 자동 갱신 (`.bkit/state/sprints/{name}.json` + `.bkit/runtime/token-ledger.ndjson` tail). phase progress / matchRate / token cost / auto-pause trigger 근접도 실시간 시각화. CC `/loop` 활용 |
| **phase** | `/sprint phase {name} {next|prev|<phaseName>}` | 명시적 phase 전이 (manual mode 또는 auto-pause 후 재개). `next` = SPRINT_PHASE_ORDER 다음. `prev` = previous. `<phaseName>` = direct (TRANSITIONS validation) |
| **iterate** | `/sprint iterate {name}` | iterate phase 강제 진입. 자동 트리거: do 종료 후 matchRate < 100% 감지 시. max 5 iterations. 5회 후에도 미달 시 auto-pause + 사용자 결정 |
| **qa** | `/sprint qa {name}` | qa phase 진입. sprint-qa-flow agent 활성화. UI→API→DB→API→UI 7-layer 데이터 흐름 검증 (S1 gate). S1 < 100 시 auto-pause |
| **report** | `/sprint report {name}` | report phase 진입. report-generator + sprint-report-writer 통합. cumulative KPI + lesson learned + carry items 자동 생성. L3 Trust Level에서는 여기서 자율 실행 종료 (사용자 결정) |
| **archive** | `/sprint archive {name}` | sprint 종료 (terminal state). 모든 quality gates final check. archive 후 readonly. **L4 Trust Level에서는 auto-run의 마지막 자동 단계, L3 이하는 명시 명령 필요** |
| **list** | `/sprint list [--filter <phase>|active|archived\|paused]` | sprint 목록. filter 옵션 (default: active + paused + recent archived 5건) |
| **feature** | `/sprint feature {name} {add|remove|move} {feature-name}` | sprint에 feature 매핑/해제/이동. featureMap 업데이트 |
| **pause** | `/sprint pause {name}` | sprint 일시 정지 (state: active → paused). 사용자 결정 또는 auto-pause trigger로 자동 진입. 진행 상태 `.bkit/state/sprints/{name}.json`에 보존 |
| **resume** | `/sprint resume {name}` | paused → active 복귀. auto-run 재개 (남은 phase + Trust Level scope). pause 사유 자동 해소 검증 (예: budget 증액, timeout reset) |
| **fork** | `/sprint fork {old-name} {new-name}` | 기존 sprint를 fork (master-plan + state 복제). carry items 처리 시 활용 |
| **help** | `/sprint help [action]` | help 표시 |

### 6.1 명령 처리 흐름 (intent-router 통합)

```
사용자 입력: "/sprint init my-launch-q2 --phase prd"
  ↓
hooks/hooks.json UserPromptSubmit
  ↓
scripts/user-prompt-handler.js
  ↓
lib/orchestrator/intent-router.js (route function)
  ↓ skill match (confidence 0.95+)
  ↓ skill: bkit:sprint, args: init, name: my-launch-q2, phase: prd
skills/sprint/SKILL.md (action handler)
  ↓
lib/application/sprint-lifecycle/start-sprint.usecase.js
  ↓
lib/domain/sprint/sprint-entity.js + sprint-validators.js
  ↓
lib/infra/sprint/sprint-state-store.js (.bkit/state/sprints/my-launch-q2.json 생성)
  ↓
templates/sprint/master-plan.template.md (docs/01-plan/features/my-launch-q2.master-plan.md 생성)
  ↓
lib/infra/sprint/sprint-telemetry.js (OTEL span emit, sprint_id=my-launch-q2)
  ↓
hooks/hooks.json Stop → next-action-engine.js
  ↓
사용자에게: "[SUGGEST] Next: /sprint phase my-launch-q2 plan"
```

---

## 7. Skill 설계 (skills/sprint/SKILL.md)

### 7.1 SKILL.md frontmatter

```yaml
---
name: sprint
description: Sprint management — initialize, advance, iterate, QA, report, archive. Multi-feature container above PDCA. PDCA 미러 sub-actions 14건. Generic capability, not domain-specific.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, TaskCreate, TaskUpdate
triggers: [sprint, /sprint, 스프린트, スプリント, 冲刺, sprint master plan]
sub-actions: init, start, status, phase, iterate, qa, report, archive, list, feature, pause, resume, fork, help
backing-modules:
  - lib/application/sprint-lifecycle
  - lib/domain/sprint
  - lib/infra/sprint
agents:
  prd:     pm-lead
  plan:    product-manager, pm-lead
  design:  sprint-orchestrator
  do:      cto-lead
  iterate: pdca-iterator, gap-detector
  qa:      sprint-qa-flow, qa-lead
  report:  sprint-report-writer, report-generator
context: project
@version: 2.1.13
---
```

### 7.2 Skill body 구조 (HARD-GATE + Process Flow)

```markdown
# bkit:sprint — Sprint Management Skill

> Generic sprint capability for bkit users. PDCA 9-phase의 메타 컨테이너. 도메인 자유.

## HARD-GATE

<HARD-GATE>
Do NOT enforce domain-specific sprint matrix (e.g., gpters-portal 30-sprint).
Sprint name MUST be kebab-case unique (validated by sprint-validators.js).
Sprint phase advance MUST validate canTransition(from, to) before proceeding.
matchRate < 100% in DO phase MUST auto-trigger ITERATE (사용자 요구사항).
QA phase MUST verify UI→API→DB→API→UI 7-layer (사용자 요구사항).
ALL phase 문서는 templates/sprint/* 사용 (Context Anchor 보존).
Master plan은 PreToolUse deny-list 보호 (ENH-286 적용).
Specialist agent spawn은 SEQUENTIAL (ENH-292 P0 sub-agent caching 10x 회피).
</HARD-GATE>

## Invocation

/sprint {action} [name] [...args]

Actions: init, start, status, phase, iterate, qa, report, archive, list, feature, pause, resume, fork, help

## Process Flow

(상세 흐름도 — Phase 6 참조)

## Sub-Action Details

### `/sprint init {name} [--phase prd|plan]`
...

### `/sprint start {name}`
...

(... 14 actions ...)

## Backing Modules

(lib/application/sprint-lifecycle/ + lib/domain/sprint/ + lib/infra/sprint/ 매핑)

## Quality Checklist

- [ ] Sprint name kebab-case validated
- [ ] Phase transition legal
- [ ] Master plan template used
- [ ] Context Anchor 보존 (Plan → Design → ... 전파)
- [ ] §8 Test Plan Matrix (5-layer) Design phase 필수
- [ ] matchRate 100% 목표 (사용자 요구)
- [ ] UI→API→DB→API→UI 7-layer 검증 (QA phase, 사용자 요구)
- [ ] Cumulative KPI 보고서 자동 생성
- [ ] Trust Score 갱신
- [ ] Sequential agent spawn (ENH-292 적용)
```

---

## 8. Agent 설계 (4 agents)

### 8.1 sprint-orchestrator.md (agents/sprint-orchestrator.md)

```yaml
---
name: sprint-orchestrator
description: Sprint orchestrator agent. Coordinates phase advance, specialist agent dispatch, quality gate verification, KPI tracking. Generic capability above PDCA. Sequential dispatch only (ENH-292).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
maxTurns: 80
model: claude-opus-4-7
effort: high
memoryScope: project
triggers: [sprint orchestrator, sprint orchestration, sprint 조율, スプリント調整, 冲刺协调]
---
```

**역할**:
1. Sprint state load + validate
2. Current phase 확인 + next legal phase 결정
3. Phase별 specialist agent spawn (SEQUENTIAL, ENH-292 적용)
4. Quality gate verification (M1-M10 + S1-S4)
5. matchRate 추적 + iterate auto-trigger (100% 목표)
6. KPI 누적 갱신
7. State persist (`.bkit/state/sprints/{name}.json`)
8. Next-action hint 생성 (`/sprint phase {name} next`)

**Sequential Dispatch 패턴 (ENH-292 P0)**:
```
do phase 진입 시:
  1. cto-lead spawn (1) — sequential, await completion
  2. cto-lead 내부에서 10 blocks Task spawn (이미 sequential pattern 보유)
  3. cto-lead 완료 후 매칭 결과 받아 next agent 결정

design phase 진입 시:
  Step 1: frontend-architect (sequential)
  Step 2: infra-architect (sequential, frontend 완료 후)
  Step 3: security-architect (sequential)
  Step 4: qa-strategist (sequential)
  NOT parallel — caching 10x 회귀 회피
```

### 8.2 sprint-master-planner.md

```yaml
---
name: sprint-master-planner
description: Sprint master plan writer. Generates master-plan.md from template + Context Anchor + user requirements. Validates Context Anchor preservation across phase docs.
allowed-tools: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch
maxTurns: 40
model: claude-opus-4-7
effort: high
memoryScope: project
---
```

**역할**:
1. `/sprint init` 시 사용자 입력 + 프로젝트 컨텍스트 수집
2. `templates/sprint/master-plan.template.md` 적용
3. Context Anchor (WHY/WHO/RISK/SUCCESS/SCOPE) 사용자 협업 수집
4. Feature inventory 초안 (사용자 추가 가능)
5. Sprint scope 정량화 (LOC estimate, 기간, feature 수)

### 8.3 sprint-qa-flow.md

```yaml
---
name: sprint-qa-flow
description: Sprint QA phase — UI→API→DB→API→UI 7-layer data flow verification. Generic capability (no chrome-qa / e2e-verifier dependency — bkit standalone). Sequential dispatch.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
maxTurns: 60
model: claude-opus-4-7
effort: high
memoryScope: project
---
```

**역할 (사용자 핵심 요구)**:
사용자 요구 "qa(ui > api > db > api > ui 등 데이터의 처리 및 흐름, 각 요소들간의 연동으로 실제 동작 검증)" 직접 구현.

**7-Layer 데이터 흐름 검증 매트릭스** (gpters의 7-Layer pattern을 generic 추상화):

```
Hop 1: UI (Browser DOM) → Client State (form data validated)
Hop 2: Client State → API Request (HTTP body / query / header)
Hop 3: API Request → Server Validation (DTO / schema)
Hop 4: Server → DB Operation (CRUD)
Hop 5: DB Operation → API Response (data transformation)
Hop 6: API Response → Client State (parse / merge)
Hop 7: Client State → UI Render (DOM update + side effects)
```

각 hop별 verification:
- **Hop 1-2**: Click → form submit → API call (Network 검증, status 200, request body 일치)
- **Hop 3-4**: DTO validation 통과 + DB write success (Prisma / raw SQL 모두 지원)
- **Hop 5-6**: Response shape + status code + caching invalidation (revalidateTag / revalidatePath 등)
- **Hop 7**: DOM update 확인 (text, button state, redirect, toast)

**검증 방법 (generic, framework-agnostic)**:
- bkit이 chrome-qa / e2e-verifier 가지지 않음 → 사용자가 자신의 framework 선택 (Playwright, Cypress, Puppeteer 등) → 사용자 hook으로 통합
- bkit 기본: `templates/sprint/qa.template.md`의 매트릭스 채우기 가이드 + 검증 결과 집계
- 선택적 통합: 사용자 환경 chrome-devtools MCP / playwright MCP가 있으면 자동 호출

### 8.4 sprint-report-writer.md

```yaml
---
name: sprint-report-writer
description: Sprint completion report writer. Aggregates cumulative KPI, lesson learned, carry items, archive readiness checklist.
allowed-tools: Read, Write, Edit, Glob, Grep
maxTurns: 30
model: claude-opus-4-7
effort: high
memoryScope: project
---
```

**역할**:
1. `.bkit/state/sprints/{name}.json` load
2. Phase별 산출물 (prd/plan/design/iterate/qa) 통합 요약
3. Cumulative KPI 계산 (sprintCycleHours, featureCompletionRate, dataFlowIntegrity 등)
4. Lesson learned (matchRate 도달 시간, iteration 수, qa fail 패턴, agent spawn 효율)
5. Carry items 식별 (incomplete features → 다음 sprint fork 후보)
6. Archive readiness checklist (S4 gate)
7. Trust Score 갱신 권장

---

## 9. Template 설계 (7 templates)

### 9.1 templates/sprint/master-plan.template.md

```markdown
# Sprint Master Plan — {SPRINT_NAME}

> **Sprint ID**: `{sprint-id}` (kebab-case)
> **Status**: Draft / Active / Archived
> **Created**: {ISO-8601}
> **Trust Level at Start**: L{0~4}
> **bkit Version**: {2.1.x}
> **CC Version**: {2.1.x}

## 0. Executive Summary
| 항목 | 내용 |
|------|------|
| **Mission** | (1-2 문장) |
| **Anti-Mission** | (제외할 것) |
| **Scope (정량)** | Features {N}, Phases 7 (prd→plan→design→do→iterate→qa→report), 기간 {N} weeks, LOC estimate {N} |
| **Success Criteria** | (5건, 측정 가능) |

## 1. Context Anchor (Plan → Design → Do 전파 필수)
| Key | Value |
|-----|-------|
| **WHY** | |
| **WHO** | |
| **RISK** | |
| **SUCCESS** | |
| **SCOPE** | |

## 2. Feature Inventory
| Feature ID | 설명 | PDCA Phase | 우선순위 |

## 3. Phase Plan
### Phase 1: PRD or Plan ({기간})
### Phase 2: Design ({기간})
### Phase 3: Do ({기간})
### Phase 4: Iterate ({기간}, 100% 목표)
### Phase 5: QA ({기간}, UI→API→DB→API→UI)
### Phase 6: Report ({기간})

## 4. Quality Gates 활성화
| Gate | Phase | Threshold |
|------|-------|----------|

## 5. Risks & Mitigation
## 6. Implementation Order
## 7. 차후 Sprint 연결 (fork / carry items)
## 8. Document Index
| Phase | Path |
| PRD | docs/01-plan/features/{sprint-id}.prd.md |
| Plan | docs/01-plan/features/{sprint-id}.plan.md |
| Design | docs/02-design/features/{sprint-id}.design.md |
| Iterate | docs/03-analysis/features/{sprint-id}.iterate.md |
| QA | docs/05-qa/features/{sprint-id}.qa-report.md |
| Report | docs/04-report/features/{sprint-id}.report.md |
```

### 9.2 templates/sprint/prd.template.md

```markdown
# Sprint PRD — {SPRINT_NAME}

> 사용자 요구: prd or plan부터 시작 가능. 본 PRD는 PM-Lead 4-agent 워크플로우 (pm-discovery / pm-strategy / pm-research / pm-prd) 활용 권장.

## Context Anchor (Master Plan에서 복사)
## 1. Problem Statement
## 2. Job Stories (Pawel Huryn JTBD 6-Part)
## 3. User Personas
## 4. Competitor Analysis (선택)
## 5. Solution Overview
## 6. Success Metrics
## 7. Out-of-scope
## 8. Stakeholder Map
## 9. Pre-mortem
```

### 9.3 templates/sprint/plan.template.md

```markdown
# Sprint Plan — {SPRINT_NAME}

## Context Anchor (PRD/Master Plan에서 복사)
## 1. Requirements
### 1.1 In-scope
### 1.2 Out-of-scope
## 2. Feature Breakdown
## 3. Phase Plan (이 sprint의 PDCA-equivalent 7 phase)
## 4. Quality Gates
## 5. Risks & Mitigation
## 6. Document Index
## 7. Sub-Sprint 분할 (옵션)
```

### 9.4 templates/sprint/design.template.md (§8 Test Plan Matrix 필수)

```markdown
# Sprint Design — {SPRINT_NAME}

## Context Anchor
## 1. Architecture Options (3 비교)
### Option A — Minimal Changes
### Option B — Clean Architecture
### Option C — Pragmatic Balance (권장)
## 2. Module Mapping
## 3. Data Model 변경
## 4. API Contract Matrix
## 5. UI Action Inventory (Action A###)
## 6. Domain Events
## 7. Error Codes

## §8 Test Plan ★ (필수 5-layer)

### 8.1 L1 — API Contract Tests
| # | Endpoint | Auth | Case | Expected Status | Expected Body |

### 8.2 L2 — UI Action Tests
| # | Page | Action | Pre-state | Expected DOM | Expected Network |

### 8.3 L3 — E2E Scenarios
| # | Scenario | Steps | Expected | DB Verify |

### 8.4 L4 — Performance
| # | Page | Metric | Target |

### 8.5 L5 — Security
| # | Vector | Test | Expected |

## 9. Implementation Order
## 10. Quality Gates
## 11. Architecture Compliance
## 12. Convention Compliance
```

### 9.5 templates/sprint/iterate.template.md

```markdown
# Sprint Iterate — {SPRINT_NAME}

> 사용자 요구사항: matchRate 100% 목표. max 5 iterations.

## Context Anchor
## Iteration Log
### Iteration 1
- **Date**: {ISO}
- **Initial matchRate**: {N}%
- **Gap items**: (missing implementations / extra implementations)
- **Auto-fix actions**: (pdca-iterator + gap-detector 결과)
- **Final matchRate**: {N}%
- **Decision**: [proceed | iterate again | user decision]

### Iteration 2
...

## Final matchRate
| Initial | Iter 1 | Iter 2 | Iter 3 | Final | Target |
| 65% | 78% | 88% | 95% | **100%** | 100% |

## Carry Items (다음 sprint fork 후보)
```

### 9.6 templates/sprint/qa.template.md (UI→API→DB→API→UI 7-Layer)

```markdown
# Sprint QA Report — {SPRINT_NAME}

> 사용자 요구사항: UI→API→DB→API→UI 7-layer 데이터 흐름 검증

## Context Anchor
## 1. QA Scope
| Feature | Test Coverage |
|---------|---------------|

## 2. 7-Layer Data Flow Verification Matrix (S1 Gate)

### Feature: {feature-name}, Action: {action-name}

| Hop | Direction | Verification | Result | Evidence |
|-----|-----------|-------------|--------|----------|
| H1  | UI Browser DOM → Client State | form data validated, no XSS | PASS / FAIL | screenshot / log |
| H2  | Client State → API Request | HTTP body / headers correct | PASS / FAIL | network log |
| H3  | API Request → Server Validation | DTO / schema validation | PASS / FAIL | log |
| H4  | Server → DB Operation | CRUD success | PASS / FAIL | DB query |
| H5  | DB → API Response | data transformation | PASS / FAIL | response body |
| H6  | API Response → Client State | parse / merge | PASS / FAIL | state diff |
| H7  | Client State → UI Render | DOM update + side effects | PASS / FAIL | screenshot |

### S1 dataFlowIntegrity 집계
- Total hops: {N}
- PASS: {N}
- S1 = PASS / Total * 100 = {N}%
- Threshold: 100%
- Gate Pass: [YES / NO]

## 3. L1-L5 Test Execution

### 3.1 L1 API Contract
### 3.2 L2 UI Action
### 3.3 L3 E2E
### 3.4 L4 Performance
### 3.5 L5 Security

## 4. Issues Found
## 5. QA Sign-off
| Quality Gate | Threshold | Actual | PASS? |
| M1 matchRate | ≥90 | | |
| M3 criticalIssues | 0 | | |
| S1 dataFlowIntegrity | 100 | | |
```

### 9.7 templates/sprint/report.template.md

```markdown
# Sprint Final Report — {SPRINT_NAME}

## Context Anchor (Master Plan에서 복사)

## 0. Executive Summary
| 항목 | 값 |
| Sprint Duration | |
| Features Completed | |
| matchRate Final | |
| dataFlowIntegrity | |
| Critical Issues | |
| Trust Score Delta | |

## 1. Cumulative KPI
## 2. Phase-by-Phase Summary
| Phase | Duration | Documents | Quality Gates |

## 3. Quality Gates Final
| Gate | Threshold | Final | Status |
| M1 matchRate | ≥90 | | |
| M2 codeQualityScore | ≥80 | | |
| M3 criticalIssueCount | 0 | | |
| M7 conventionCompliance | ≥90 | | |
| M8 designCompleteness | ≥85 | | |
| M10 pdcaCycleTimeHours | ≤40 | | |
| S1 dataFlowIntegrity | 100 | | |
| S2 featureCompletion | 100 | | |
| S4 archiveReadiness | true | | |

## 4. Lesson Learned
- matchRate 도달 시간:
- Iteration 수 평균:
- QA fail 패턴:
- Agent spawn 효율 (sequential vs parallel cost):

## 5. Carry Items (다음 Sprint fork 후보)
## 6. Trust Score Recommendation
## 7. Archive Checklist
- [ ] All phase docs present
- [ ] All quality gates evaluated
- [ ] Cumulative KPI calculated
- [ ] Lesson learned documented
- [ ] Trust Score updated
```

---

## 10. Hook 통합 상세

### 10.1 SessionStart 확장 (scripts/session-start.js)

기존 dashboard에 sprint section 추가:

```
┌─── Active Sprint: my-launch-q2-2026 ─────────────────────────────────────────┐
│  Phase:   design ··········  next: do                                        │
│  Features: 3 (feature-auth: do, feature-billing: design, ...)                │
│  matchRate: -- (do phase 진입 후 측정)                                       │
│  Trust:   L2 (started L1)                                                    │
│  Next:    /sprint phase my-launch-q2-2026 next  →  do                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 UserPromptSubmit (scripts/user-prompt-handler.js)

기존 intent-router 호출에 sprint trigger 추가 (SKILL_TRIGGER_PATTERNS 15 → 17).

### 10.3 PostToolUse Skill (scripts/skill-post.js) — ★ ENH-303 결합

```javascript
// 사용자 요구사항: matchRate < 100% iterate 자동 트리거 + dataFlow break 시 deny reason 모델 전달
const result = await invokeSkill(name, args);

if (skillName === 'bkit:sprint') {
  const sprintState = loadSprintState();
  
  // matchRate 100% 미달 시 iterate trigger (사용자 요구)
  if (sprintState.phase === 'do' && sprintState.kpi.matchRate < 100 && sprintState.iterateCount < 5) {
    return JSON.stringify({
      continue: true,
      continueOnBlock: true,  // ENH-303 F7-139 적용
      reason: `Sprint policy: matchRate ${sprintState.kpi.matchRate}% < 100% target. Auto-iterate triggered (cycle ${sprintState.iterateCount + 1}/5).`,
      additionalContext: `Run /sprint iterate ${sprintState.id} to enter iterate phase.`
    });
  }
  
  // QA dataFlow break 시 deny + reason
  if (sprintState.phase === 'qa' && sprintState.qualityGates.S1_dataFlowIntegrity.current < 100) {
    return JSON.stringify({
      continue: true,
      continueOnBlock: true,  // ★ ENH-303 핵심 적용
      reason: `Sprint QA fail: S1 dataFlowIntegrity ${sprintState.qualityGates.S1_dataFlowIntegrity.current}% < 100%. Hop failures: ${sprintState.qaHopFailures.join(', ')}.`,
      additionalContext: `Re-implement failed hops or run /sprint phase ${sprintState.id} do to return to implementation.`
    });
  }
}
```

### 10.4 Stop (scripts/unified-stop.js)

기존 next-action-engine 호출에 sprint phase 인식 추가.

### 10.5 PreToolUse Write (scripts/pre-write.js) — ★ ENH-286 결합

```javascript
// Sprint master plan 보호 (memory enforcer)
const SPRINT_MASTER_PLAN_PATTERN = /^docs\/01-plan\/features\/[^/]+\.master-plan\.md$/;
const SPRINT_ACTIVE_PHASE_DOC_PATTERN = /^docs\/0[1-5]-(plan|design|analysis|qa|report)\/features\/[^/]+\.(prd|plan|design|iterate|qa-report|report)\.md$/;

if (SPRINT_MASTER_PLAN_PATTERN.test(filePath)) {
  const sprintId = extractSprintIdFromPath(filePath);
  const sprintState = loadSprintState(sprintId);
  
  if (sprintState && sprintState.phase !== 'archived' && !context.sprintMasterPlanEditAuthorized) {
    return JSON.stringify({
      decision: 'deny',
      reason: `Sprint master plan is memory-protected. Use /sprint phase ${sprintId} edit-master-plan to authorize.`
    });
  }
}
```

---

## 11. Trust Score / Control Level 통합 상세

### 11.1 Trust Score Component 영향

기존 6-component 그대로. Sprint completion 시 component 보정:

```javascript
// lib/control/trust-engine.js 확장 (옵션, v2.1.13에서는 선택)
function updateTrustOnSprintCompletion(sprint) {
  const updates = {};
  
  // M1 matchRate 100% 도달 → designCompleteness +5 (max 100)
  if (sprint.kpi.matchRate === 100) {
    updates.designCompleteness = Math.min(100, currentScore.designCompleteness + 5);
  }
  
  // S1 dataFlowIntegrity 100 → codeQuality +3
  if (sprint.qualityGates.S1_dataFlowIntegrity.current === 100) {
    updates.codeQuality = Math.min(100, currentScore.codeQuality + 3);
  }
  
  // S2 featureCompletion 100 → successHistory +5
  if (sprint.qualityGates.S2_featureCompletion.current === 100) {
    updates.successHistory = Math.min(100, currentScore.successHistory + 5);
  }
  
  // M10 pdcaCycleTimeHours ≤ target → cycleHealth +3
  if (sprint.kpi.sprintCycleHours <= sprint.context.cycleTargetHours) {
    updates.cycleHealth = Math.min(100, currentScore.cycleHealth + 3);
  }
  
  // Sprint history에 append
  trustProfile.history.push({
    timestamp: Date.now(),
    event: 'sprint_completed',
    sprintId: sprint.id,
    deltas: updates,
    componentScores: applyUpdates(currentScore, updates)
  });
}
```

### 11.2 Sprint Advance Policy (Level별, v1.1 재설계 — `/sprint start` auto-run 기준)

**Default behavior**: `/sprint start {name}` 호출 시 **Plan부터 자율 실행**. Trust Level이 **stop point**를 결정 (사용자 결정 D11 반영).

```javascript
// lib/control/automation-controller.js
const SPRINT_AUTORUN_SCOPE = Object.freeze({
  // 각 Level: /sprint start 시 자율 진행하는 last phase + 그 후 stop point
  L0: { lastAutoPhase: null,       stopAfter: 'init',      manual: true  }, // /sprint start = manual (각 phase 사용자 승인)
  L1: { lastAutoPhase: null,       stopAfter: 'init',      manual: true, hint: true }, // hint만, manual 강제
  L2: { lastAutoPhase: 'design',   stopAfter: 'design',    manual: false }, // Plan→Design 자율, Do부터 사용자 승인
  L3: { lastAutoPhase: 'report',   stopAfter: 'report',    manual: false }, // Plan→Report 자율, Archive 사용자 승인 ★ 권장 default
  L4: { lastAutoPhase: 'archived', stopAfter: 'archived',  manual: false }, // Plan→Archive 완전 자율 (Trust ≥85 + fastTrack on)
});

function planSprintRun(sprintId, currentLevel) {
  const scope = SPRINT_AUTORUN_SCOPE[`L${currentLevel}`];
  const fromPhase = loadSprintState(sprintId).phase;
  const targetPhase = scope.lastAutoPhase;
  return { fromPhase, targetPhase, manual: scope.manual };
}
```

**Phase 흐름 (Trust Level별)**:

| Trust | scope | 자율 실행 phase 범위 | Stop after | 사용자 다음 명령 |
|-------|-------|--------------------|-----------|----------------|
| L0 | init only | (none — manual) | init | `/sprint phase {name} next` 매 단계 |
| L1 | init only | (none — hint만 표시) | init | `/sprint phase {name} next` (hint 따라) |
| L2 | Plan→Design | prd/plan → design | design 완료 | `/sprint phase {name} do` (Do부터 사용자 승인) |
| **L3 (default 권장)** | Plan→Report | prd/plan → design → do → iterate → qa → report | report 완료 | `/sprint archive {name}` (사용자 검토 후) |
| L4 (fastTrack) | Plan→Archive | prd/plan → ... → report → archived | archived | (자동 완료, 다음 sprint fork 제안만) |

### 11.3 Auto-Pause Triggers (v1.1 신규, 사용자 결정 D12 반영 — 4건 모두 활성화)

`/sprint start` 자율 실행 중 다음 4건 발생 시 **즉시 일시정지** (state: active → paused) + 사용자 결정 대기:

```javascript
// lib/application/sprint-lifecycle/auto-pause.js
const AUTO_PAUSE_TRIGGERS = Object.freeze({
  // (1) Quality Gate fail
  QUALITY_GATE_FAIL: {
    condition: (sprint) => {
      const gates = sprint.qualityGates;
      return gates.M3_criticalIssueCount?.current > 0 ||
             gates.S1_dataFlowIntegrity?.current < 100;
    },
    severity: 'HIGH',
    message: (sprint) => `Quality Gate fail: M3=${sprint.qualityGates.M3_criticalIssueCount.current}, S1=${sprint.qualityGates.S1_dataFlowIntegrity.current}%`,
    userActions: ['fix & resume', 'forward fix', 'abort sprint']
  },

  // (2) matchRate < 90 after max 5 iterations (사용자 100% 목표지만 안전핀 90)
  ITERATION_EXHAUSTED: {
    condition: (sprint) => {
      const iter = sprint.iterateHistory || [];
      return iter.length >= 5 && (sprint.kpi.matchRate ?? 0) < 90;
    },
    severity: 'HIGH',
    message: (sprint) => `Iteration ${sprint.iterateHistory.length}/5 exhausted, matchRate ${sprint.kpi.matchRate}% < 90`,
    userActions: ['forward fix (Sprint 내 추가 작업)', 'carry to next sprint (fork)', 'abort']
  },

  // (3) Token cost > budget (default 1M tokens)
  BUDGET_EXCEEDED: {
    condition: (sprint) => (sprint.kpi.cumulativeTokens ?? 0) > (sprint.config?.budget ?? 1_000_000),
    severity: 'MEDIUM',
    message: (sprint) => `Cumulative tokens ${sprint.kpi.cumulativeTokens} > budget ${sprint.config.budget}`,
    userActions: ['increase budget & resume', 'abort with partial report', 'archive as-is']
  },

  // (4) Phase duration > timeout (default 4 hours)
  PHASE_TIMEOUT: {
    condition: (sprint) => {
      const enteredAt = sprint.phaseHistory.slice(-1)[0]?.enteredAt;
      if (!enteredAt) return false;
      const elapsedMs = Date.now() - new Date(enteredAt).getTime();
      const timeoutMs = (sprint.config?.phaseTimeoutHours ?? 4) * 3600 * 1000;
      return elapsedMs > timeoutMs;
    },
    severity: 'MEDIUM',
    message: (sprint) => `Phase ${sprint.phase} elapsed > ${sprint.config.phaseTimeoutHours ?? 4}h timeout`,
    userActions: ['extend timeout & resume', 'force-advance phase', 'abort']
  },
});

async function checkAutoPauseTriggers(sprint) {
  const fired = [];
  for (const [key, trigger] of Object.entries(AUTO_PAUSE_TRIGGERS)) {
    if (trigger.condition(sprint)) {
      fired.push({ trigger: key, severity: trigger.severity, message: trigger.message(sprint), userActions: trigger.userActions });
    }
  }
  if (fired.length > 0) {
    await pauseSprint(sprint.id, fired);
    await notifyUser(fired);  // SessionStart dashboard + /sprint status 노출
  }
  return fired;
}
```

**Trigger 실행 시점**:
- **Stop hook** (모든 turn 종료 후): 4 triggers 모두 평가
- **PostToolUse skill-post** (sprint phase 변경 후): trigger 1 & 2 (즉시성 우선)
- **Phase advance pre-check**: trigger 4 (phase timeout 미리 체크)

**Resume 흐름** (`/sprint resume {name}`):
1. Pause 사유 검증 (해소되었는가? 예: budget 증액, timeout reset, fix 적용)
2. 해소되지 않은 경우: AskUserQuestion으로 사용자 결정 수렴
3. 해소된 경우: 자율 실행 재개 (남은 phase + Trust Level scope)

### 11.4 Dashboard Modes (v1.1 신규, 사용자 결정 D13 반영 — 둘 다)

#### 11.4.1 Mode A: SessionStart dashboard (default, 기존 bkit 패턴)

`scripts/session-start.js` 확장. SessionStart hook에서 sprint section 렌더링:

```
┌─── Active Sprint: my-launch-q2-2026 ──────────── L3 / Plan→Report 자율 ─────┐
│  Phase:   do (3/7)  ▓▓▓▓▓░░░░░░░░░  43%                                     │
│  Auto-run: ACTIVE (L3 scope, target: report)                                 │
│  Features: 3 [feature-auth: do, feature-billing: design, feature-onboard: do]│
│  matchRate: -- (do phase, iterate 진입 대기)                                │
│  Tokens:  847,234 / 1,000,000 (84.7%, budget 153K 여유)                    │
│  Time:    Phase 1h 23m / 4h timeout (35%)                                   │
│  Triggers approach: budget 84% / timeout 35% / iter --                      │
│  Next:    auto-advance to iterate (matchRate <100% 감지 시)                 │
│  Pause:   /sprint pause my-launch-q2-2026  |  Watch: /sprint watch          │
└──────────────────────────────────────────────────────────────────────────────┘
```

특징:
- Trust Level (L3) + scope target (report) 명시
- Phase progress bar
- Auto-pause triggers 근접도 (budget %, timeout %, iter count)
- 다음 자동 advance 예측

#### 11.4.2 Mode B: `/sprint watch` Live dashboard (opt-in, `/pdca-watch` 패턴)

30초 주기 자동 갱신. CC `/loop` (또는 ScheduleWakeup) 활용:

```
┌─── /sprint watch — my-launch-q2-2026 ──────── tick 14 / 30s ────────────────┐
│                                                                              │
│  Phase Progress (L3 scope: Plan→Report)                                      │
│  prd → plan → design → DO ◀ ─ iterate → qa → report  [archive: manual]      │
│         ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  43%            │
│                                                                              │
│  Live KPI                                                                    │
│  • matchRate:       -- (do phase, iterate 진입 대기)                        │
│  • Cumulative Tok:  847,234 / 1,000,000 ▓▓▓▓▓▓▓▓░░ 84.7%                   │
│  • Phase elapsed:   1h 23m / 4h ▓▓▓░░░░░░░ 35%                              │
│  • Iteration count: 0 / 5 max                                               │
│                                                                              │
│  Auto-Pause Triggers (4)                                                     │
│  ① Quality Gate:    safe (M3=0, S1=--)                                      │
│  ② Iteration:       safe (0/5)                                              │
│  ③ Budget:          ⚠️  near limit (84.7% / 100%)                          │
│  ④ Phase timeout:   safe (35% / 100%)                                       │
│                                                                              │
│  ETA to next phase: ~28m (matchRate measurement 예상)                       │
│  Commands: /sprint pause | /sprint phase next | Ctrl+C abort                │
└──────────────────────────────────────────────────────────────────────────────┘
```

특징:
- Live 갱신 (30초 tick)
- ETA 예측 (phase별 historical data 기반)
- Auto-pause trigger 근접도 visual (⚠️ 80%+, 🔴 95%+)
- 실시간 명령 hint

**구현 위치**:
- `skills/sprint/SKILL.md` watch sub-action handler
- `scripts/sprint-watch.js` (CC `/loop` 호환 self-pacing)
- `lib/application/sprint-lifecycle/dashboard.js` (data aggregator)

---

## 12. Quality Gates 통합 상세

### 12.1 M1-M10 활성화 매트릭스 (Sprint Phase별)

| Gate | PRD | Plan | Design | Do | Iterate | QA | Report |
|------|:--:|:--:|:----:|:--:|:------:|:--:|:------:|
| M1 matchRate (≥90) | - | - | - | ✓ | ★100% | ✓ | ✓ |
| M2 codeQualityScore (≥80) | - | - | - | ✓ | ✓ | ✓ | ✓ |
| M3 criticalIssueCount (=0) | - | - | - | ✓ | ✓ | ✓ | ✓ |
| M4 apiComplianceRate (≥95) | - | - | ✓ | ✓ | - | ✓ | ✓ |
| M5 runtimeErrorRate (≤1) | - | - | - | ✓ | ✓ | ✓ | ✓ |
| M6 p95ResponseTime (≤500ms) | - | - | - | - | - | ✓ | ✓ |
| M7 conventionCompliance (≥90) | - | - | - | ✓ | ✓ | ✓ | ✓ |
| M8 designCompleteness (≥85) | - | ✓ | ✓ | - | - | - | ✓ |
| M9 iterationEfficiency (≥70) | - | - | - | - | ✓ | - | ✓ |
| M10 pdcaCycleTimeHours (≤사용자정의) | - | - | - | - | - | - | ✓ |
| **S1 dataFlowIntegrity (=100)** | - | - | - | - | - | **★** | ✓ |
| **S2 featureCompletion (=100)** | - | - | - | - | - | ✓ | **★** |
| **S3 sprintVelocity (사용자)** | - | - | - | - | - | - | ✓ |
| **S4 archiveReadiness (=true)** | - | - | - | - | - | - | **★** |

★ = phase 진행을 위한 필수 gate.

### 12.2 Quality Gate evaluator (lib/application/sprint-lifecycle/quality-gates.js)

```javascript
function evaluateGates(sprint, phase) {
  const activeGates = ACTIVE_GATES_BY_PHASE[phase];
  const results = {};
  
  for (const gateKey of activeGates) {
    const gate = GATES_REGISTRY[gateKey];
    const current = measureGate(sprint, gateKey);
    const passed = compareToThreshold(current, gate.threshold, gate.comparator);
    results[gateKey] = { current, threshold: gate.threshold, passed };
  }
  
  const allPassed = Object.values(results).every(r => r.passed);
  return { allPassed, results };
}
```

---

## 13. Coding Convention 통합

### 13.1 bkit 기존 컨벤션 보존

CLAUDE.md project rules 그대로 적용:
- **Conversation**: Korean
- **Code & docs (non-docs/)**: English (sprint codes, comments, commit, sprint name = English 권장 — kebab-case)
- **docs/ subdirs (`01-plan/`, `02-design/`, `03-analysis/`, `04-report/`, `05-qa/`)**: **Korean** (sprint master plan + phase docs 모두)
- **Templates**: English code blocks + Korean explanation OK (bkit templates/ 패턴 따름)

### 13.2 신규 코드 패턴 (sprint-relevant)

```javascript
// ✅ Header Pattern (모든 sprint module 새 파일)
/**
 * Sprint module description
 *
 * Sprint Management (v2.1.13): {summary}
 *
 * Design Ref: docs/01-plan/features/sprint-management.master-plan.md §{section}
 *
 * @module lib/domain/sprint/{module}
 * @version 2.1.13
 */

// ✅ Object.freeze for sprint enums
const SPRINT_PHASES = Object.freeze({...});

// ✅ JSDoc Type for SprintEntity
/** @typedef {Object} Sprint */

// ✅ Error handling (Infrastructure)
try {
  await fs.writeFile(path, JSON.stringify(sprint, null, 2));
} catch (_e) { /* fail-silent */ }

// ✅ Error handling (Application)
try {
  await sprintStateStore.save(sprint);
} catch (e) {
  // fail-open: 사용자에게 알림 + fallback (state in-memory)
  console.error(JSON.stringify({ continue: true, additionalContext: `Sprint state save failed: ${e.message}. Falling back to in-memory.` }));
}
```

### 13.3 ENH-302 (F6-139) — Sprint hook script (신규 시) exec form 적용

새 sprint hook script (`scripts/sprint-*.js`)를 hooks.json에 등록 시:

```json
// BEFORE (shell form, 기존 패턴):
{
  "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/sprint-post.js\""
}

// AFTER (exec form, ENH-302 F6-139 적용):
{
  "command": "node",
  "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/sprint-post.js"]
}
```

**단 v2.1.13 first PR에서는 기존 24 blocks 그대로 유지** (shell form 안정). 신규 sprint 통합 hook이 추가되면 그것만 exec form. ENH-302 자체 마이그레이션은 별도 PR.

---

## 14. 단계별 구현 로드맵 (v2.1.13)

### Stage 1: Domain Layer (Day 1-2, +250 LOC)
- `lib/domain/sprint/sprint-phase.js` (Object.freeze enum)
- `lib/domain/sprint/sprint-transitions.js` (adjacency map + canTransition)
- `lib/domain/sprint/sprint-entity.js` (Sprint type + 순수 도메인 메서드)
- `lib/domain/sprint/sprint-validators.js` (kebab-case validator, phase validation)
- `lib/domain/sprint/sprint-events.js` (SprintCreated / SprintPhaseChanged / SprintArchived)
- **invariant 검증**: 0 forbidden imports (`scripts/check-domain-purity.js` 통과)

### Stage 2: Application Layer (Day 3-5, +650 LOC)
- `lib/application/sprint-lifecycle/index.js` (public exports)
- `lib/application/sprint-lifecycle/start-sprint.usecase.js`
- `lib/application/sprint-lifecycle/advance-phase.usecase.js`
- `lib/application/sprint-lifecycle/iterate-sprint.usecase.js`
- `lib/application/sprint-lifecycle/verify-data-flow.usecase.js`
- `lib/application/sprint-lifecycle/generate-report.usecase.js`
- `lib/application/sprint-lifecycle/archive-sprint.usecase.js`
- `lib/application/sprint-lifecycle/quality-gates.js`

### Stage 3: Infrastructure Layer (Day 6-7, +400 LOC)
- `lib/infra/sprint/sprint-state-store.js` (state-store.port adapter)
- `lib/infra/sprint/sprint-telemetry.js` (OTEL emission)
- `lib/infra/sprint/sprint-doc-scanner.js` (docs scan)
- `lib/infra/sprint/matrix-sync.js` (matrix auto-sync)

### Stage 4: Presentation Layer — Skill + Agents (Day 8-10, +500 LOC)
- `skills/sprint/SKILL.md` (HARD-GATE + 14 sub-actions)
- `skills/sprint/PHASES.md` (phase 설명)
- `skills/sprint/examples/*.md` (3건)
- `agents/sprint-orchestrator.md`
- `agents/sprint-master-planner.md`
- `agents/sprint-qa-flow.md`
- `agents/sprint-report-writer.md`

### Stage 5: Hooks 통합 (Day 11, +200 LOC)
- `scripts/session-start.js` 확장 (sprint dashboard)
- `scripts/user-prompt-handler.js` 확장 (sprint trigger)
- `scripts/skill-post.js` 확장 (ENH-303 continueOnBlock)
- `scripts/unified-stop.js` 확장 (sprint phase advance)
- `scripts/pre-write.js` 확장 (ENH-286 master plan 보호)
- `hooks/hooks.json` — 신규 event 없음, 위 scripts 통합 검증

### Stage 6: Templates (Day 12, +400 LOC)
- `templates/sprint/master-plan.template.md`
- `templates/sprint/prd.template.md`
- `templates/sprint/plan.template.md`
- `templates/sprint/design.template.md` (§8 Test Plan Matrix)
- `templates/sprint/iterate.template.md`
- `templates/sprint/qa.template.md` (7-layer data flow matrix)
- `templates/sprint/report.template.md`

### Stage 7: Testing (Day 13-15, +28 TC, +500 LOC)
- L1 unit: domain (sprint-phase, sprint-transitions, sprint-validators, sprint-entity)
- L2 integration: application (start-sprint, advance-phase, iterate-sprint, verify-data-flow)
- L3 contract: infrastructure (sprint-state-store JSON schema lock)
- L4 acceptance: skill + agent dispatch flow
- L5 E2E (선택, manual)

### Stage 8: Documentation (Day 16, +300 LOC)
- README.md sprint section 추가
- CLAUDE.md "Sprint vs Feature" guide
- docs/06-guides/ 신규 sprint user guide
- CHANGELOG v2.1.13 entry

### Stage 9: ADR (Day 16, 신규 3건 — 0006은 cc-upgrade-policy로 이미 사용 중이라 0007부터 시작)
- `docs/adr/0007-sprint-as-meta-container.md` — Sprint가 frozen PDCA 9-phase의 메타 컨테이너 결정 (Sprint > Feature > Task 3-tier)
- `docs/adr/0008-sprint-phase-enum.md` — Sprint 7-phase + ARCHIVED enum 결정 + Sprint↔PDCA 매핑
- `docs/adr/0009-sprint-autorun-trust-scope.md` — `/sprint start` default auto-run + Trust Level conditional stop point + 4 auto-pause triggers + 2 dashboard modes 결정 (D11-D14 영구화)

### Stage 10: PR & Release (Day 17)
- Commit chain (micro-PR 또는 통합 PR)
- BKIT_VERSION 2.1.12 → 2.1.13 (5-loc SoT)
- `git tag v2.1.13`
- GitHub Release notes

**총 LOC estimate**: ~2,400 LOC + 28 TC + 7 templates + 4 agents + 1 skill + 1 ADR (2건)

---

## 15. Risk & Mitigation

| Risk | 심각도 | 발생 가능성 | Mitigation |
|------|:----:|:---------:|-----------|
| Scope creep (gpters 30-sprint matrix 강제 통합) | HIGH | HIGH | ★ 본 master plan §2.2 "X1-X5 명시적 제외" 가이드라인 + design 단계 validator |
| PDCA-Sprint 개념 혼동 (UX 실패) | HIGH | MEDIUM | README sprint section + CLAUDE.md "Sprint vs Feature" guide + skill HARD-GATE 명시 |
| Trust Score regression | MEDIUM | LOW | trust-engine.js 변경 0 (옵션 통합, v2.1.13 first PR에서는 read-only) |
| ENH-292 caching 회귀 (sprint multi-agent spawn) | HIGH | HIGH | ★ sprint-orchestrator agent body에 sequential dispatch 명시 + team-protocol.js의 sprint context 시 sequential override + ENH-292 P0 mitigation 자기적용 |
| 사용자 도메인 충돌 (sprint name collision) | LOW | MEDIUM | sprint-validators.js의 kebab-case unique check + name reservation 명령 |
| .bkit/state 파일 손상 | MEDIUM | LOW | lock file + atomic write (rename pattern) + 백업 (sprints/{name}.json.bak) |
| iterate max 5 cycle 부족 (matchRate 100% 미달) | MEDIUM | MEDIUM | 사용자 결정 (forward fix / carry / abort) + report에 매트릭스 분석 |
| QA 7-layer 사용자 framework 호환성 (Playwright/Cypress/Puppeteer/Chrome MCP 등) | MEDIUM | HIGH | 사용자 framework-agnostic generic matrix template + 선택적 framework adapter (chrome-devtools MCP 자동 감지) |
| Memory enforcer (ENH-286) 너무 엄격 — 사용자가 master plan 수정 못 함 | LOW | MEDIUM | `/sprint phase edit-master-plan` 명시적 authorization 명령 제공 + AskUserQuestion confirm |
| ENH-303 continueOnBlock 회귀 (CC 환경) | LOW | LOW | v2.1.139 이상 환경 검증 + fallback (continueOnBlock 미설정 시 기존 silent block) |
| **(v1.1) Auto-run runaway loop** — `/sprint start` 무한 반복 / context 폭주 | HIGH | MEDIUM | ★ 4 Auto-Pause Triggers (§11.3) 강제 활성화 (armed: ALL 4) + maxIterations 5 hard cap + phase timeout 4h default + token budget 1M default + Ctrl+C abort + SubagentStop 이상 감지 + Stop hook마다 trigger 평가 |
| **(v1.1) Token budget 의도치 않은 소진** — auto-run 중 토큰 비용 폭증 | HIGH | MEDIUM | `/sprint init --budget <tokens>` 사전 설정 + 사용자 budget default 1M (변경 가능) + 80% 도달 시 SessionStart dashboard ⚠️ 경고 + 100% 초과 시 즉시 auto-pause + `/sprint watch`로 실시간 모니터링 |
| **(v1.1) Trust Level 자동 상승** — sprint completion으로 L3 → L4 자동 진입 시 위험 작업 자율 실행 | MEDIUM | LOW | Trust Score sprint completion 영향은 v2.1.13 first PR 미통합 (Open Decision D4 = defer). 향후 통합 시 destructive ops 별도 분류 유지 |
| **(v1.1) Phase timeout으로 정상 작업 끊김** — 4h timeout이 너무 짧음 | LOW | MEDIUM | `/sprint init --timeout <hours>` 사용자 설정 가능 + 80% 도달 시 SessionStart dashboard ⚠️ 경고 + resume 시 timeout reset 옵션 + 도메인별 권장 timeout 가이드 (web app 4h / mobile 8h / infra 12h) |
| **(v1.1) auto-pause 후 사용자 결정 지연** — paused sprint 방치 | LOW | HIGH | SessionStart dashboard에 paused sprint 강조 + `/sprint list --filter paused`로 식별 + Stale Feature Warning과 유사한 패턴 적용 (idle >7d 경고) |

---

## 16. Success Criteria (정량)

| # | Criterion | 측정 방법 | Target |
|---|-----------|----------|--------|
| 1 | `/sprint init my-sprint` E2E latency | bash 측정 (master-plan.md + state json 생성까지) | ≤ 60s |
| 2 | SessionStart sprint dashboard 렌더링 | session-start.js 출력 점검 | active sprint 노출 100% |
| 3 | iterate phase auto-trigger | PostToolUse skill-post hook 통합 테스트 | matchRate <100% 시 자동 진입 (Trust L2+) |
| 4 | QA phase UI→API→DB→API→UI 검증 | sprint-qa-flow agent 7-hop matrix | 모든 hop 항목 PASS/FAIL 기록 + S1 계산 |
| 5 | `/sprint report` cumulative KPI | report-generator + sprint-report-writer 통합 | M1-M10 + S1-S4 모두 자동 채워짐 |
| 6 | Domain layer purity | scripts/check-domain-purity.js 확장 (sprint domain 추가) | 0 forbidden imports |
| 7 | Test coverage | L1 unit 8 TC + L2 integration 12 TC + L3 contract 4 TC + L4 acceptance 4 TC | 28 TC 100% PASS |
| 8 | Documentation completeness | docs-code-sync 검증 | sprint 추가 문서가 코드와 100% 일치 |
| 9 | Trust Score regression 0 | trust-engine.js 회귀 테스트 | 기존 6 component 변경 없음 |
| 10 | ENH-292 sequential dispatch 적용 | sprint-orchestrator spawn pattern 검증 | parallel spawn 0건 in sprint context |

---

## 17. Quality Checklist (master plan 자체 검증)

- [x] Sprint 정의는 generic (도메인 자유)
- [x] gpters domain-specific 영역 명시적 제외 (§2.2)
- [x] 사용자 요구사항 반영:
  - [x] PRD or Plan 진입 가능
  - [x] iterate(100% 목표)
  - [x] QA UI→API→DB→API→UI 7-layer
  - [x] /sprint start, status, archive (+ 11 additional sub-actions, PDCA 미러)
- [x] bkit 기존 자산 통합:
  - [x] PDCA Application Layer (frozen 9-phase invariant 보존)
  - [x] Orchestrator 5 modules
  - [x] Hook 21 events 24 blocks (재사용)
  - [x] Skill / Agent / Templates / State
  - [x] Trust Score / Control Level
  - [x] Quality Gates M1-M10
  - [x] Clean Architecture 4-Layer + Domain Purity
  - [x] Defense-in-Depth 4-Layer
  - [x] Port-Adapter pattern (state-store 재사용)
- [x] cc-v2134~v2139 개선점 통합:
  - [x] ENH-302 (Hook exec form, 신규 hook 시)
  - [x] ENH-303 (PostToolUse continueOnBlock, sprint QA 결정적 결합)
  - [x] ENH-304 (Agent View, multi-agent sanity)
  - [x] ENH-292 (Sequential Dispatch, sprint orchestrator 핵심)
  - [x] ENH-281 (OTEL 10, sprint telemetry)
  - [x] ENH-286 (Memory Enforcer, master plan 보호)
  - [x] ENH-289 (Defense Layer 6, archive audit 옵션)
- [x] 코딩 컨벤션 통합:
  - [x] English code + Korean docs/
  - [x] Object.freeze enums
  - [x] @version stamp 2.1.13
  - [x] fail-silent infrastructure / fail-open application
  - [x] JSDoc type
- [x] State persistence schema 정의 (3 files)
- [x] Risk & Mitigation 11건 명시
- [x] Success Criteria 10건 정량
- [x] 단계별 구현 로드맵 10 Stages
- [x] LOC estimate 정량 (~2,400 LOC)
- [x] Test plan (28 TC L1-L5)

---

## 18. Document Index (사용자가 sprint 운영 시)

| 단계 | 사용자 산출물 위치 | Template |
|------|------------------|---------|
| Master | `docs/01-plan/features/{sprint}.master-plan.md` | `templates/sprint/master-plan.template.md` |
| PRD | `docs/01-plan/features/{sprint}.prd.md` | `templates/sprint/prd.template.md` |
| Plan | `docs/01-plan/features/{sprint}.plan.md` | `templates/sprint/plan.template.md` |
| Design | `docs/02-design/features/{sprint}.design.md` | `templates/sprint/design.template.md` (§8 5-layer 필수) |
| Iterate | `docs/03-analysis/features/{sprint}.iterate.md` | `templates/sprint/iterate.template.md` |
| QA | `docs/05-qa/features/{sprint}.qa-report.md` | `templates/sprint/qa.template.md` (UI→API→DB→API→UI matrix) |
| Report | `docs/04-report/features/{sprint}.report.md` | `templates/sprint/report.template.md` |

---

## 19. Open Decisions

### 19.1 v1.1 Closed Decisions (2026-05-12 사용자 결정)

| ID | Decision | 결정값 | 근거 |
|----|----------|-------|-----|
| **D11** | `/sprint start` auto-run scope | **Trust Level 조건부** (L4: Archive까지 / L3: Report에서 stop / L2: Design까지 / L1-L0: manual) | 안전성과 자율성 균형. ADR-0008 영구화 |
| **D12** | Auto-pause triggers | **4건 모두 활성화** (Quality Gate fail / matchRate<90 after 5 iter / Token budget / Phase timeout) | 사용자 안전핀 — auto-run runaway 방지 |
| **D13** | Dashboard 모드 | **둘 다 지원** (SessionStart 기본 + `/sprint watch` opt-in) | 유연성 최대화 + 기존 bkit 패턴 일관성 |
| **D14** | 다음 작업 우선순위 | **Master Plan v1.1 + ADR-0006~0008 우선** | 일관성 우선 — 코드 구현 전 alignment |

### 19.2 5/13 Review + 추가 Open Decisions

| # | Decision Point | 옵션 | 권장 |
|---|---------------|------|------|
| D1 | ENH-303 continueOnBlock sprint QA 통합 우선순위 | (a) v2.1.13 first PR (sprint와 함께) / (b) v2.1.13 second PR / (c) v2.1.14 후속 | **(a) — sprint QA의 핵심 UX, D11/D12와 결합 결정적** |
| D2 | Sprint master plan PreToolUse 보호 (ENH-286) 적용 | (a) strict (deny + 명시 authorization) / (b) advisory (warning only) | (a) strict — moat 결정적 |
| D3 | ENH-289 Defense Layer 6 sprint archive 통합 | (a) v2.1.13 first PR / (b) defer to v2.1.14 / (c) drop | (b) defer — sprint 자체 ENH 291/304와 함께 별도 PR |
| D4 | Trust Score sprint completion 영향 | (a) v2.1.13 first PR / (b) defer / (c) drop | (b) defer — 회귀 risk 우려 + D11 Trust Level scope와 결합 시 read-only 우선 |
| D5 | Quality Gates S1-S4 신규 추가 위치 | (a) bkit.config.json 확장 / (b) sprint-specific config (`.bkit/state/sprint-gates.json`) | (a) 통합 — 사용자 일관성 |
| D6 | Sprint sub-action 우선순위 (15 → MVP) | MVP 9건: init / start / status / watch / phase / iterate / qa / report / archive | **Full 15 — 사용자 요구 (manual mode 포함 — pause/resume/fork/feature/help)** |
| D7 | sprint-qa-flow framework adapter | (a) framework-agnostic only / (b) chrome-devtools MCP 우선 통합 / (c) playwright MCP 우선 | (a) generic + (b) optional 감지 |
| D8 | Sprint name collision policy | (a) error / (b) auto-suffix `-2` / (c) fork prompt | (a) error + AskUserQuestion |
| D9 | Master plan 한국어 vs 영어 | (a) 한국어 (docs/ 규칙 따름) / (b) 영어 / (c) 사용자 선택 | (a) 한국어 (CLAUDE.md 규칙 일관) |
| D10 | sprint-orchestrator 5-agent vs 4-agent | (a) 5건 추가 (sprint-feature-coordinator 신설) / (b) 4건 유지 (기존 cto-lead 10 blocks 재사용) | (b) 4건 + cto-lead 재사용 (ENH-292 sequential) |
| **D15** | Phase별 default timeout (hours) | (a) 모든 phase 4h / (b) phase별 차등 (prd 2h / plan 2h / design 4h / do 8h / iterate 4h / qa 6h / report 2h) / (c) 사용자 명시 (no default) | **(b) — 도메인별 권장값 가이드 + 사용자 override 가능** |
| **D16** | `/sprint watch` 갱신 주기 | (a) 30초 (PDCA watch와 일관) / (b) 60초 / (c) 사용자 설정 | **(a) 30초 default + (c) `--interval <seconds>` override** |
| **D17** | Auto-pause 발생 시 사용자 알림 채널 | (a) SessionStart dashboard만 / (b) + Stop hook 즉시 notification / (c) + Slack/email (optional) | **(a) + (b) — 즉각성 보장, (c)는 v2.1.14+** |
| **D18** | budget default 값 (tokens) | (a) 1M (현재 default) / (b) 500K / (c) 사용자 환경별 (Opus 1M / Sonnet 5M) | **(a) 1M baseline, 사용자 설정 가능 (v1.1 schema config.budget 필드)** |

---

## 20. PDCA 다음 단계 권장

본 master plan 작성 완료 → PDCA 단계로 진입 가능:

1. **5/13 (내일) review 통합 의사결정** → ENH-289 강등 / MON-CC-NEW-PLUGIN-HOOK-DROP 격상 / ENH-303 격상 (D1과 결합)
2. **5/13~5/14: Plan 단계** — `/pdca plan sprint-management` (본 master plan 기반 plan.md 작성)
3. **5/15~5/16: Design 단계** — `/pdca design sprint-management` (Architecture 3-option + §8 Test Plan)
4. **5/17~5/30: Do 단계** — 10-Stage 로드맵 실행 (Stage 1-10)
5. **5/31: Check/Iterate** — gap-detector + pdca-iterator (matchRate ≥90%)
6. **6/1: QA** — qa-lead 4-agent orchestration (L1-L5)
7. **6/2: Report + Release** — v2.1.13 GA

또는 PDCA team 활용:
- `/pdca team sprint-management` → CTO Lead 오케스트레이션 (pm-lead 4-agent → qa-lead 4-agent → report-generator 전체 자동)

---

## 21. bkit Feature Usage Report (본 master plan 작성)

| Feature | Usage |
|---------|-------|
| Skill | `bkit:cc-version-analysis` (선행 cycle), Master plan 작성은 메인 thinking |
| Sub-agent | Phase A (gpters reference) + Phase B (bkit context) 병렬 spawn (Explore agents) |
| Phase Strategy | 4-phase Plan Plus (A 분석 → B 매핑 → C 통합 → D 작성) |
| Tools | Bash, Read, Write, Task, TaskCreate |
| Tasks Completed | #6-10 (5 tasks: Master Plan / Phase A / Phase B / Phase C / Phase D) |
| Output Style | bkit-pdca-enterprise |
| Cost Optimization | Phase A/B 병렬 spawn 1회 + 메인 직접 통합 (Phase C/D) |
| Branch | `feature/v2113-sprint-management` (commit `1aec261` cc-version-analysis report + 본 master plan) |

---

---

## 22. LOC Reconciliation (v1.2 신규, 2026-05-12)

본 섹션은 v1.0/v1.1 estimate vs Sprint 1+2+3+4 GA + Sprint 5 실측 LOC 정정.

### 22.1 매트릭스

| Sprint | v1.0/v1.1 estimate | v1.2 actual | Δ | Notes |
|--------|---------------------|-------------|------|-------|
| Sprint 1 (Domain) | ~400 | **685** | +285 | typedef + canTransition `{ok, reason?}` pattern + 7 validators |
| Sprint 2 (Application) | ~600 | **1,337** | +737 | 8 use cases + DI deps interface (14 keys) + ACTIVE_GATES_BY_PHASE matrix |
| Sprint 3 (Infra) | ~400 | **780** | +380 | 4 adapters + composite factory + 3-matrix atomic sync |
| Sprint 4 (Presentation) | ~800 | **2,065** | +1,265 | 7 Korean templates + 4 agents + 15-action handler + skill 8개국어 frontmatter |
| Sprint 5 (Quality + Docs) | ~600 | **~1,250** (code ~750 + docs ~500) | +650 | 3 adapter scaffolds + L3 contract (tracked) + Korean guides + handleFork/Feature/Watch |
| Sprint 6 (Release) | ~200 | TBD | — | BKIT_VERSION bump + CHANGELOG + tag/release |
| **Total** | **~3,000** | **~6,117+** | **+3,117** | actual = 2.04x estimate |

### 22.2 Reconciliation 원인

- **Sprint 1 (+285)**: typedef + canTransition `{ok, reason}` 패턴 (boolean → 객체 return) + frozen enum + validators 7건
- **Sprint 2 (+737)**: ACTIVE_GATES_BY_PHASE matrix + 4 auto-pause triggers + 7-Layer SEVEN_LAYER_HOPS + DI deps interface 14 keys
- **Sprint 3 (+380)**: composite factory `createSprintInfra` + atomic write tmp+rename + 3-matrix sync + OTLP opt-in
- **Sprint 4 (+1,265)**: 7 Korean deep templates + 4 agents (sprint-orchestrator/master-planner/qa-flow/report-writer) + skill 8개국어 frontmatter + 15-action dispatcher + L3 contract 사전 준비
- **Sprint 5 (+650)**: 3 production adapter scaffolds (gap-detector/auto-fixer/data-flow-validator) + tracked L3 contract test (8 TCs) + Korean user/migration guides (~500 LOC) + sprint-handler.js handleFork/Feature/Watch real impl

### 22.3 누적 TCs

| Sprint | TCs | Tracked? |
|--------|-----|----------|
| Sprint 1 | 40 | tests/qa/ local |
| Sprint 2 | 79 | tests/qa/ local |
| Sprint 3 | 66 + 10 CSI | tests/qa/ local |
| Sprint 4 | 41 (incl 8 CSI-04) | tests/qa/ local |
| Sprint 5 | 8 (L3 Contract) + 7-perspective QA | **tests/contract/ tracked** |
| **Cumulative** | **244+ TCs** | **8 tracked + 236 local** |

### 22.4 ★ 사용자 명시 3 (2026-05-12) 통합

> "QA 는 eval 도 활용하고 claude -p 도 활용해서 Sprint 와 pdca, 그리고 각 status 관리나 memory 가 유기적으로 동작하는지도 포함해서 다양한 관점으로 실제 동작 하는지 검증해야해."

Sprint 5 QA 7-perspective 매트릭스 (`docs/01-plan/features/v2113-sprint-5-quality-docs.plan.md` §2 R12 참조):
1. L3 Contract (tracked)
2. Sprint 1+2+3+4 regression (236 TCs)
3. **bkit-evals scenarios** ≥ 4 (eval-score ≥ 0.8)
4. **claude -p headless** 5 scenarios (exit 0)
5. **4-System 공존** (sprint/pdca/trust/memory orthogonal)
6. **Sprint↔PDCA mapping** (8-phase × 9-phase overlap documented)
7. `claude plugin validate .` Exit 0 (F9-120 11-cycle)

---

**End of Master Plan**

> v1.2 (2026-05-12): Sprint 1+2+3+4 GA + Sprint 5 Production Hardening 추가 후 LOC reconciliation.
> 다음 단계: Sprint 5 완료 후 Sprint 6 (Release v2.1.13).
