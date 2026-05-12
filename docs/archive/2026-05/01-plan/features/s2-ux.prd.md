# S2-UX PRD — Sprint UX 개선 Sub-Sprint 2 (Master Plan Generator)

> **Sub-Sprint ID**: `s2-ux` (sprint-ux-improvement master 의 2/4)
> **Phase**: PRD (1/7) — ★ in_progress
> **Depends on**: S1-UX `a128aed` (P0/P1 fix completed, 18/18 AC PASS, F9-120 13-cycle)
> **Master Plan Ref**: `docs/01-plan/features/sprint-ux-improvement.master-plan.md` §4.6 + §3.1 + §3.3 + §3.4 + §7.4
> **Date**: 2026-05-12
> **Author**: kay kim (POPUP STUDIO PTE. LTD.) + bkit AI orchestration
> **Branch**: `feature/v2113-sprint-management`
> **Status**: ★ Draft v1.0 — Master Plan §5.1 S2-UX scope (~45K tokens, 5 files, 90-120분) 시작

---

## 0. Executive Summary

### 0.1 Mission

bkit `/sprint` skill 에 16번째 sub-action `master-plan <project>` 을 추가해 **사용자 명시 4-1 (Master Plan 자동 생성)** 을 충족한다. 이 action 은 `bkit:sprint-master-planner` agent 를 격리(`isolation: subagent`) Task spawn 하여 multi-sprint Master Plan markdown 을 생성하고, `.bkit/state/master-plans/<project>.json` 에 state 를 persist 한다. 본 sub-sprint 자체가 사용자 명시 4 의 실증 — 5 files 가 단일 세션 ~45K tokens 안전 범위 안에서 완성된다.

### 0.2 Anti-Mission

- **Master Plan markdown 의 내용 생성을 본 use case 안에서 LLM 호출로 수행하지 않는다** — agent spawn 은 caller (sprint-handler 또는 LLM dispatcher) 의 책임이며, use case 는 (a) input validation, (b) agent 호출 인터페이스 정의, (c) state persistence, (d) audit emit 만 담당
- **Sprint 1 (Domain) events.js 신규 event factory 추가 금지** — `SPRINT_EVENT_TYPES` frozen 5건 보존. Audit Trail 은 `lib/audit/audit-logger.js` 직접 호출 (옵션 D, §9.3 참조)
- **Master Plan markdown 의 자동 분할 알고리즘 구현 금지** — context-sizer 는 S3-UX scope. 본 sprint 는 분할 stub 만 노출 (`recommendedSprints: []` 빈 배열, S3-UX 에서 채움)
- **Task Management TaskCreate 자동 호출 금지** — Master Plan §3.3 의 `deps.taskCreator` 는 optional inject. caller 가 명시적으로 inject 했을 때만 실행. default 는 dry-run
- **빠르게 끝내기 금지 (사용자 명시 5)** — S1-UX 패턴 (PRD 651 + Plan 768 + Design 846 + Report 600+ lines) 동일 수준 또는 그 이상 깊이로 진행

### 0.3 4-Perspective Value Matrix

| Perspective | 현재 (Before S2-UX) | After S2-UX |
|------------|--------------------|-------------|
| **사용자 UX** | `/sprint init` = 단일 container 생성만, multi-sprint roadmap 부재 → 사용자가 매번 Master Plan markdown 수동 작성 | `/sprint master-plan <project>` 1-command 으로 sprint-master-planner agent 격리 spawn → 자동 master-plan markdown 생성 + state json persist + (optional) Task 등록 |
| **Architecture** | `agents/sprint-master-planner.md` body 가 일반 가이드만 명시, programmatic invocation contract 부재 | Use case (`master-plan.usecase.js`) 가 agent invocation contract 정의 (input schema + output contract). sprint-handler 가 dispatcher 로 wiring. Sprint 1-5 invariant 보존 (events.js, entity.js, transitions.js 0 변경) |
| **Cost/Performance** | (변경 0) | Agent spawn 1회 (Opus, effort: high, isolation: subagent) → main context 오염 0. State persist O(1) atomic write. Audit emit 1회 (master_plan_created action_type) |
| **Risk** | Sprint 1 invariant 보존 위해 events.js 추가 회피 → audit-logger 직접 호출 패턴 사용 (옵션 D). 단 audit-logger ACTION_TYPES 에 `master_plan_created` additive 추가 필요 — 단 lib/audit 는 Sprint 1-4 invariant 스코프 외, Sprint 4 (Presentation) 가 이미 `sprint_paused`/`sprint_resumed` additive 추가했음 (line 49-50). 즉 동일 패턴, justified |

### 0.4 정량 목표 (Master Plan §0.4 → S2-UX 분담)

| # | Master Plan target | S2-UX achievement plan |
|---|--------------------|-----------------------|
| 1 | 신규 sub-action `master-plan <project>` | ✓ S2-UX 핵심 deliverable (SKILL.md + handler + use case) |
| 2 | Master Plan 자동 생성 (agent 격리 spawn) | ✓ sprint-master-planner agent body 강화 + Task spawn contract 명시 |
| 3 | Sprint 분할 자동 추천 | S3-UX scope — 본 sprint 는 stub interface (`recommendedSprints: []`) 만 |
| 4 | ≤ 100K tokens/sprint | S3-UX scope (context-sizer.js) — 본 sprint 는 토큰 추정 X |
| 5 | `/control L4` Full-Auto 안전성 | ✓ master-plan action 은 dry-run option default true, 4 auto-pause trigger 영향 0 (sprint state 미수정) |
| 6 | P0 bug fix | ✓ S1-UX `a128aed` 완료 |
| 7 | P1 gaps fix 4건 | ✓ S1-UX 완료 (3/4 + 1 closed earlier) |
| 8 | L3 Contract test 추가 | S4-UX scope — 단 본 sprint 의 master-plan.usecase.js + sprint-handler.handleMasterPlan 은 Contract testable interface 노출 |
| 9 | Sprint 1-5 invariant 보존 | ✓ Sprint 1 events.js 0 변경, entity.js 0 변경, transitions.js 0 변경. Sprint 2 sprint-lifecycle/index.js additive export 만. Sprint 3 sprint-paths.js 활용 (변경 0). Sprint 4 enhancement zone (sprint-handler.js handleMasterPlan + SKILL.md §10 ext) |
| 10 | `claude plugin validate .` Exit 0 | ✓ F9-120 14-cycle 목표 (S1-UX 13-cycle 위 +1) |
| 11 | Cumulative TCs 250+ | S4-UX scope (SC-09 + SC-10 추가) |

### 0.5 본 sub-sprint 가 충족시키는 Master Plan §0.3 4-Perspective

| Master Plan §0.3 row | S2-UX 기여 |
|---------------------|-----------|
| **사용자 UX** "1-command 으로 Master Plan + Sprint 분할 + PDCA cycle 자동 진입" | ✓ `/sprint master-plan` 1-command 동작. Sprint 분할 stub. PDCA cycle 진입은 S4-UX integration |
| **Architecture** "Sprint 1-5 invariant 보존" | ✓ §9 매트릭스 (Sprint 1 events.js 0 변경 = 핵심 결단) |
| **Cost/Performance** "단일 세션 안전 sprint sizing (~80-100K tokens)" | ✓ 본 sprint ~45K tokens (Master Plan §5.1) — 실증 |
| **Risk** "agent 격리 spawn → main context 오염 0" | ✓ Task spawn `subagent_type: 'bkit:sprint-master-planner'` 명시 |

---

## 1. Master Plan Verbatim Citations + No Guessing Invariant

bkit-system invariant "No Guessing" 준수 — 본 PRD 의 모든 patch location 은 verbatim code line 인용으로 검증된다.

### 1.1 Master Plan §4.6 (★ 사용자 명시 4-1)

> **§4.6 항목**
> | **Gap** | `/sprint init` = 단일 container 생성만, Master Plan 부재 |
> | **Fix** | 신규 sub-action `master-plan <project>` — `bkit:sprint-master-planner` agent 격리 spawn → multi-sprint master plan generate |
> | **난이도** | L (신규 use case + agent body 강화 + persistence + Task wiring) |

본 PRD §3 (Feature Map) 가 이 fix 를 5 deliverable 로 분해.

### 1.2 Master Plan §3.1 (PDCA Application Layer 통합) — 4-step chain

```
1. User: /sprint master-plan <project> --features auth,payment,reports
        ↓
2. Skill bkit:sprint dispatches to handleSprintAction('master-plan', args, deps)
        ↓
3. handleMasterPlan() 신규:
   a. lib/application/sprint-lifecycle/context-sizer.js  ← (S3-UX scope, 본 sprint 는 stub interface 만)
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

본 PRD §4 (Job Stories) + §6 (Quality Gates) 가 이 chain 의 단계별 AC 정의.

### 1.3 Master Plan §3.3 (Task Management 통합) — code skeleton

> ```javascript
> // scripts/sprint-handler.js handleMasterPlan
> async function handleMasterPlan(args, infra, deps) {
>   // 1. Generate master plan (above)
>   const plan = await masterPlanUsecase(args, deps);
>
>   // 2. Task Management persistence
>   if (plan.ok && plan.sprints && deps.taskCreator) {
>     for (const sprint of plan.sprints) {
>       await deps.taskCreator({
>         subject: `Sprint ${sprint.id}: ${sprint.name}`,
>         description: sprint.scope + '\n\nFeatures: ' + sprint.features.join(', '),
>         // Sprint 의존성 reflect
>         addBlockedBy: sprint.dependsOn ? sprint.dependsOn.map(d => taskIds[d]) : [],
>       });
>     }
>   }
>   return plan;
> }
> ```

본 PRD §3.3 (F3 sprint-handler) 가 verbatim 으로 이 skeleton 을 base 로 implementation spec 작성.

### 1.4 Master Plan §3.4 (Memory Persistence) — 2 경로

| 경로 | 위치 | 책임 |
|------|------|------|
| **State** | `.bkit/state/sprints/<id>.json` + `.bkit/state/master-plans/<project>.json` | sprint runtime 상태 + master plan 매트릭스 |
| **Memory** | `~/.claude/projects/<encoded>/memory/MEMORY.md` `## Sprint History` + `## Active Sprints` 섹션 | 세션 자동 컨텍스트 (Sprint 5 verification #4 base 강화) |

본 PRD §3.4 (F4 persistence) 가 `.bkit/state/master-plans/<project>.json` schema 정의.

### 1.5 Master Plan §7.4 (sprint-master-planner agent frontmatter)

> ```yaml
> name: sprint-master-planner
> description: |
>   Sprint Master Plan generator — analyzes user requirements + codebase
>   + recommends sprint 분할 with context window awareness.
>
>   Triggers: sprint master plan, multi-sprint planning,
>   스프린트 마스터 계획, スプリントマスター, 冲刺主计划,
>   plan maestro sprint, plan principal sprint
> allowed-tools:
>   - Read
>   - Glob
>   - Grep
>   - WebSearch
>   - WebFetch
>   - Bash
> isolation: subagent
> model: opus
> ```

본 PRD §3.5 (F5 agent body ext) 가 이 frontmatter contract 의 ext + body work pattern 정의.

### 1.6 현재 sprint-handler.js verbatim — VALID_ACTIONS 15건 (line 41-45)

```javascript
const VALID_ACTIONS = Object.freeze([
  'init', 'start', 'status', 'watch', 'phase',
  'iterate', 'qa', 'report', 'archive', 'list',
  'feature', 'pause', 'resume', 'fork', 'help',
]);
```

S2-UX 패치 위치 — line 41-45 array literal 에 `'master-plan'` 16번째 element 추가 (P0 위치). switch (line 194-211) 에 `case 'master-plan': return handleMasterPlan(a, infra, d);` 추가.

### 1.7 현재 SKILL.md verbatim — frontmatter description (line 7-17)

```yaml
description: |
  Sprint Management — generic sprint capability for ANY bkit user.
  15 sub-actions: init, start, status, watch, phase, iterate, qa, report, archive, list, feature, pause, resume, fork, help.
  Triggers: sprint, sprint start, sprint init, sprint status, sprint list,
  스프린트, 스프린트 시작, 스프린트 상태,
  스프린트, スプリント開始, スプリント状態,
  ... (8-language triggers)
```

S2-UX 패치 위치 — "15 sub-actions" → "16 sub-actions" + "master-plan" 추가. Triggers 에 §11 (사용자 명시 1) 의 8-lang master-plan keywords 추가.

### 1.8 현재 sprint-master-planner.md verbatim — frontmatter (line 1-26)

기존 frontmatter:
```yaml
name: sprint-master-planner
description: |
  Sprint Master Plan + PRD + Plan + Design generation specialist.
  ...
  Triggers: sprint master plan, sprint planning, sprint plan, sprint design,
  스프린트 마스터 플랜, 스프린트 계획, 스프린트 설계, ... (8-language)
model: opus
effort: high
maxTurns: 25
memory: project
```

S2-UX 패치 위치 — frontmatter 는 **변경 0** (Master Plan §7.4 의 `allowed-tools`/`isolation` 은 sprint-master-planner 의 frontmatter 가 아니라 Task spawn 시 caller side parameter — 본 PRD §3.5 에서 정정 명시). body 만 ext.

### 1.9 lib/audit/audit-logger.js verbatim — ACTION_TYPES (line 28-51)

```javascript
const ACTION_TYPES = [
  'phase_transition',
  ...
  // v2.1.13 Sprint 4 — Sprint Management lifecycle events
  'sprint_paused',
  'sprint_resumed',
];
```

S2-UX 패치 위치 — line 50 다음에 `'master_plan_created'` 추가 (additive, line 48 comment 이미 "Sprint Management lifecycle events" 명시 — semantic consistency).

### 1.10 lib/application/sprint-lifecycle/index.js verbatim — export (line 38-76)

기존 export 13 use cases + helpers. S2-UX 패치 위치 — line 38 `const startSprintMod = require('./start-sprint.usecase');` 다음 line 신설:

```javascript
const masterPlanMod = require('./master-plan.usecase');
```

그리고 line 75 `computeNextPhase: startSprintMod.computeNextPhase,` 다음에:

```javascript
generateMasterPlan: masterPlanMod.generateMasterPlan,
MASTER_PLAN_SCHEMA_VERSION: masterPlanMod.MASTER_PLAN_SCHEMA_VERSION,
```

---

## 2. Context Anchor (Plan → Design → Do 전파)

| Key | Value |
|-----|-------|
| **WHY** | Master Plan §4.6 의 "Gap: `/sprint init` = 단일 container 생성만, Master Plan 부재" + 사용자 명시 4-1 "Master Plan 자동 생성기 격상" 충족. S1-UX 가 P0/P1 fix 로 sprint resume 동작을 보장했으므로 이제 master-plan 생성 후 자동 sprint 진입이 가능한 base. |
| **WHO** | (1) bkit 사용자 — `/sprint master-plan <project> --features auth,payment,reports` 1-command 으로 multi-sprint roadmap 자동 작성. (2) `bkit:sprint-master-planner` agent — 본 sprint 의 body ext 로 work pattern 강화 받음 → 일관된 quality 의 master plan 산출. (3) `scripts/sprint-handler.js` dispatcher — `handleMasterPlan` 신규 case 등록. (4) `lib/application/sprint-lifecycle/` Application Layer — `master-plan.usecase.js` 신규 module + index.js export ext. (5) `lib/audit/audit-logger.js` ACTION_TYPES — `master_plan_created` additive 등록. (6) `.bkit/state/master-plans/<project>.json` — 신규 state persistence dir. (7) S3-UX (Context Sizer) — `recommendedSprints` stub interface base 제공 받음. (8) S4-UX (Integration + L3 Contract) — `handleMasterPlan` callable contract base 제공 받음. |
| **RISK** | (a) **Sprint 1 invariant 위배 위험** — events.js 에 `SprintMasterPlanCreated` factory 신규 추가 시 `SPRINT_EVENT_TYPES` frozen array 변경. 회피 = audit-logger 직접 호출 (옵션 D, §9.3) + ACTION_TYPES additive 등록. (b) **Agent spawn 실패** — Task tool `subagent_type` mismatch 또는 격리 깨짐 → main context 오염. 회피 = use case 가 agent 호출을 직접 수행하지 않고, caller (sprint-handler 또는 LLM dispatcher) 가 `deps.agentSpawner` inject. default = dry-run (no spawn, returns stub plan). (c) **State persistence atomic race** — `.bkit/state/master-plans/<project>.json` write 중 SIGKILL → 부분 쓰기. 회피 = Sprint 3 stateStore atomic-write 패턴 (tmp + rename) 재사용 — 단 신규 dir 이므로 `lib/infra/sprint/sprint-paths.js` 활용 + 신규 helper `getMasterPlanStateFile()` 추가 (Sprint 3 invariant additive). (d) **Doc=Code drift** — Master Plan markdown 이 `docs/01-plan/features/` 에 생성되었으나 `.bkit/state/master-plans/<project>.json` 미생성 → `scripts/docs-code-sync.js` drift. 회피 = use case 가 doc + state 둘 다 single transaction 으로 write (state 먼저, doc nakajima). (e) **`/control L4` Full-Auto runaway** — master-plan 생성이 무한 loop 또는 budget exceeded. 회피 = master-plan action 은 sprint state 미수정 → autoRun loop 의 stopAfter 와 무관. 단 master plan 생성 자체에 hard timeout 60s 또는 max output 100KB cap. (f) **Sprint-handler 의 VALID_ACTIONS Object.freeze 깨기** — 신규 element 추가 시 frozen array literal 수정 → S1-UX `a128aed` 와 동일 패턴 (additive). (g) **8-language trigger 일부 누락** — SKILL.md + sprint-master-planner agent 둘 다 master-plan 키워드 8-lang 매트릭스 추가 필요. linting checklist 로 보장. (h) **`bkit-system philosophy 7 invariants` 위배** — Design First / No Guessing / Audit Trail 셋 다 본 sprint 에서 위반 risk 존재 → §10 매트릭스 사전 검증. (i) **F9-120 13-cycle 14-cycle 깨기** — agents/sprint-master-planner.md body ext 후 `claude plugin validate .` Exit 1 → 회피 = 매 commit 후 실행. (j) **Master Plan markdown 생성 시 template substitution 실패** — `templates/sprint/master-plan.template.md` (확인됨, 79+ lines) 의 variables `{feature}/{displayName}/{date}/{author}/{trustLevel}/{duration}` 매칭 실패 → 회피 = use case 가 변수 누락 시 placeholder 보존 + warning 반환. (k) **Sprint 1-4 226 TCs regression** — 본 sprint 가 Sprint 1 events.js 0 변경 보장 → regression 위험 매우 낮음. 단 매 commit 후 L3 Contract SC-01~SC-08 8/8 PASS 재실행. (l) **사용자 명시 5 (꼼꼼함) 위배** — 빠르게 끝내려는 inclination 차단 = PRD ~700+ lines, Plan ~800+ lines, Design ~900+ lines 목표 + 매 phase 의 checklist 강제. |
| **SUCCESS** | (1) `/sprint master-plan <project>` 1-command 동작 — sprint-handler.handleMasterPlan 호출, ok=true 반환. (2) 명시적 `deps.agentSpawner` inject 시 sprint-master-planner agent 격리 spawn → markdown 산출물 받음. (3) `docs/01-plan/features/<project>.master-plan.md` 파일 생성 (`sprintPhaseDocPath('<project>', 'masterPlan')` 활용). (4) `.bkit/state/master-plans/<project>.json` state persist (schema v1.0). (5) Audit: `lib/audit/audit-logger.js` 에 ACTION_TYPE `'master_plan_created'` 추가 + use case 가 logEvent 호출 → `.bkit/audit/<date>.jsonl` 에 entry. (6) `deps.taskCreator` inject 시 N sprints 각각 TaskCreate 호출. (7) Sprint 1 invariant 100% 보존 — events.js / entity.js / transitions.js / validators.js 모두 git diff empty. (8) Sprint 2 invariant 보존 — sprint-lifecycle/index.js additive export 만 (기존 export 0 변경). (9) Sprint 3 invariant 보존 — sprint-paths.js additive helper (`getMasterPlanStateFile`) 만. (10) Sprint 4 enhancement zone — sprint-handler.handleMasterPlan + SKILL.md §10 매트릭스 ext + agents/sprint-master-planner.md body ext. (11) 8-language trigger 보존 — SKILL.md frontmatter triggers 16 matches → 8-lang master-plan keywords 추가 후 16+ matches. (12) hooks.json 21:24 invariant 보존 — 신규 hook 추가 0. (13) `claude plugin validate .` Exit 0 — F9-120 14-cycle 달성. (14) L3 Contract SC-01~SC-08 8/8 PASS (regression). (15) Doc=Code 0 drift — 4 docs (PRD/Plan/Design/Report) + 5 code files 모두 sync. (16) Master Plan §0.4 11개 정량 목표 중 본 sprint 분담 분 7/7 달성 (#1, #2, #5, #6, #7, #9, #10). |
| **SCOPE (정량)** | **In-scope ~5-7 files**: (1) `lib/application/sprint-lifecycle/master-plan.usecase.js` (신규, ~250 LOC), (2) `lib/application/sprint-lifecycle/index.js` (export ext, +5 lines), (3) `scripts/sprint-handler.js` (handleMasterPlan + VALID_ACTIONS ext, +90 LOC), (4) `agents/sprint-master-planner.md` (body ext, +60 LOC, frontmatter 0 변경), (5) `skills/sprint/SKILL.md` (frontmatter description + triggers + §3/Arguments table + body §11 매트릭스 ext, +60 LOC, 영어). 부수 변경: (6) `lib/audit/audit-logger.js` (ACTION_TYPES additive 1 line), (7) `lib/infra/sprint/sprint-paths.js` (`getMasterPlanStateFile` additive, +12 LOC). **신규 dir**: `.bkit/state/master-plans/` (use case 가 runtime 생성). **OUT-OF-SCOPE**: context-sizer.js (S3-UX), L3 Contract SC-09/10 (S4-UX), `bkit.config.json` sprint settings section (S3-UX), `docs/06-guide/sprint-management.guide.md` §9 신규 (S4-UX), `commands/bkit.md` ext (S4-UX), context-sizer threshold algorithm (S3-UX), MEMORY.md `## Active Sprints` hook v2 (v2.1.14). |

---

## 3. Feature Map (5 deliverable + 2 부수)

### F1: `lib/application/sprint-lifecycle/master-plan.usecase.js` (신규)

| 항목 | 내용 |
|------|------|
| **Module path** | `lib/application/sprint-lifecycle/master-plan.usecase.js` |
| **Exports** | `generateMasterPlan(input, deps)`, `MASTER_PLAN_SCHEMA_VERSION = '1.0'`, `validateMasterPlanInput(input)`, `loadMasterPlanState(projectId, infra)`, `saveMasterPlanState(state, infra)` |
| **Input schema** | `{ projectId, projectName, features[], context?, trustLevel?, projectRoot? }` |
| **Output schema** | `{ ok, plan: { projectId, projectName, sprints[], dependencyGraph, generatedAt, schemaVersion }, masterPlanPath, stateFilePath, error? }` |
| **Use case 책임** | (1) validate input (kebab-case projectId, projectName 비공허, features array). (2) load existing master plan state if any (idempotency). (3) call `deps.agentSpawner` (if provided) for markdown generation, OR return stub (dry-run). (4) write markdown to `docs/01-plan/features/<projectId>.master-plan.md` via `deps.fileWriter` (test-injectable). (5) save state json to `.bkit/state/master-plans/<projectId>.json` atomic write. (6) emit `master_plan_created` via `deps.auditLogger.logEvent(...)`. (7) return contract. |
| **Dependencies inject** | `deps.agentSpawner?: ({ subagent_type, prompt }) => Promise<{ output: string }>` (optional, default dry-run) / `deps.fileWriter?: (path, content) => Promise<void>` (default fs.writeFile) / `deps.stateStore?: { saveMasterPlan, loadMasterPlan }` (default Sprint 3 helper) / `deps.auditLogger?: { logEvent }` (default lib/audit/audit-logger) / `deps.taskCreator?: ({ subject, description, addBlockedBy? }) => Promise<{ taskId }>` (optional, default no-op) |
| **Stub mode (default)** | `deps.agentSpawner === undefined` 시 markdown 을 templates/sprint/master-plan.template.md 의 variable substitution 으로 생성 (no LLM). 사용자 명시 4 의 "꼼꼼함" 충족 — agent 없이도 base structure 제공 |
| **Test 가능성** | Pure function 이지만 4 dependency inject 로 모든 외부 영향 격리. unit test 시 fileWriter/stateStore/auditLogger 모두 mock 가능 |

### F2: `lib/application/sprint-lifecycle/index.js` (export ext)

| 항목 | 내용 |
|------|------|
| **변경 type** | Additive only — 기존 13 exports 보존 |
| **추가 항목** | `const masterPlanMod = require('./master-plan.usecase');` (line 38 후), `generateMasterPlan: masterPlanMod.generateMasterPlan` + `MASTER_PLAN_SCHEMA_VERSION: masterPlanMod.MASTER_PLAN_SCHEMA_VERSION` (line 75 후) |
| **JSDoc 갱신** | line 8 의 "Sprint 2:" comment block 에 `master-plan.usecase.js — generateMasterPlan` 1줄 추가 |

### F3: `scripts/sprint-handler.js` (handleMasterPlan + VALID_ACTIONS ext)

| 항목 | 내용 |
|------|------|
| **변경 위치 1** | line 41-45 VALID_ACTIONS array — `'master-plan'` 16번째 element 추가 (P0 위치, archive 다음) |
| **변경 위치 2** | line 194-211 switch — `case 'master-plan': return handleMasterPlan(a, infra, d);` |
| **신규 function** | `async function handleMasterPlan(args, infra, deps)` ~70 LOC. Master Plan §3.3 skeleton 따름 — masterPlanUsecase 호출 + taskCreator iteration + audit-logger emit |
| **CLI mode 호환** | line 527-552 의 `if (require.main === module)` block 변경 X. 단 master-plan action 의 positional args 처리 자동 (positionalId = projectId). flags: `--features=auth,payment`, `--name "Q2 Launch"`, `--trust L3` |
| **handleHelp() ext** | line 492-516 의 helpText array 에 `'  master-plan /sprint master-plan <project> --features <list>'` 추가 |

### F4: `agents/sprint-master-planner.md` (body ext, frontmatter 0 변경)

| 항목 | 내용 |
|------|------|
| **Frontmatter** | 변경 0 (Master Plan §7.4 의 `allowed-tools`/`isolation` 은 Task spawn caller side parameter 임을 본 PRD §1.8 에서 명시). 기존 frontmatter 16 matches 8-language triggers 보존 |
| **Body section 신규** | (a) `## Master Plan Invocation Contract` — input/output schema, (b) `## Working Pattern (Detailed)` — 6-step procedure (현재 5-step ext), (c) `## Sprint Split Heuristics` — S3-UX context-sizer 와 결합되는 stub algorithm hints, (d) `## Output Markdown Contract` — `docs/01-plan/features/<projectId>.master-plan.md` schema strict |
| **언어** | 영어 (agent body 는 사용자 명시 1 의 "@docs 예외 한국어" 제외 영어 원칙) |
| **JSON example block** | input + output JSON example 1쌍 추가 (LLM dispatcher reference) |
| **F9-120 안전** | YAML frontmatter 0 변경 → `claude plugin validate .` Exit 0 보장 |

### F5: `skills/sprint/SKILL.md` (frontmatter description + triggers + body §11 ext)

| 항목 | 내용 |
|------|------|
| **변경 위치 1** | line 9 frontmatter `description:` — "15 sub-actions" → "16 sub-actions" + `master-plan` 16번째 추가 |
| **변경 위치 2** | line 10-17 triggers — 8-language master-plan keywords 추가 (사용자 명시 1) |
| **변경 위치 3** | line 60-77 Arguments table — `| `master-plan <project>` | Generate multi-sprint Master Plan (agent isolated spawn) | `/sprint master-plan q2-launch --features auth,payment` |` row 추가 |
| **변경 위치 4** | line 141-235 body §10 Skill Invocation Contract — §10.1 Args schema table 에 `master-plan` row 추가, §10.3 NL mapping rules 에 master-plan 패턴 추가 |
| **신규 section** | `## 11. Master Plan Generator (16번째 Sub-Action)` — 영어, ~30 LOC. master-plan workflow + agent invocation + state persistence + Task wiring 요약 |
| **언어** | 영어 (body), 한국어 (이미 §10.1 Args 의 examples 안) → 본 sprint 는 영어 일관성 유지 |

### F6: `lib/audit/audit-logger.js` (ACTION_TYPES additive, 1 line)

| 항목 | 내용 |
|------|------|
| **변경 위치** | line 50 `'sprint_resumed'` 다음 line — `'master_plan_created',` 추가 |
| **Justification** | line 48 comment "v2.1.13 Sprint 4 — Sprint Management lifecycle events" 와 semantic consistency. additive only — 기존 entries 변경 0 |
| **Risk** | 매우 낮음 — ACTION_TYPES enum 은 array literal (not frozen), 동일 패턴 신규 entry 추가 이미 v2.1.13 Sprint 4 에서 실증 |

### F7: `lib/infra/sprint/sprint-paths.js` (additive helper, +12 LOC)

| 항목 | 내용 |
|------|------|
| **변경 위치** | line 49 `getSprintIndexFile` 다음 신규 function `getMasterPlanStateDir(projectRoot)` + `getMasterPlanStateFile(projectRoot, projectId)` |
| **module.exports ext** | line 93-101 에 `getMasterPlanStateDir, getMasterPlanStateFile` 2개 추가 |
| **Justification** | Sprint 3 (Infrastructure) 영역 — path helper additive 는 Sprint 3 §R3 enhancement zone (path helper extension OK, file I/O 변경 X). master-plan use case 가 이 helper 활용 → Doc=Code 단일 SoT |

---

## 4. Job Stories (8 stories)

### JS-01: bkit 사용자 — multi-sprint roadmap 1-command 시작

**As a** bkit 사용자 with vague multi-sprint project idea ("Q2 launch with auth + payment + reports"),
**I want to** invoke `/sprint master-plan q2-launch --features auth,payment,reports --name "Q2 Launch"`,
**So that** I receive a generated master plan markdown that I can review + commit + use as base for individual sprint PDCAs.

**Acceptance**:
- handleMasterPlan returns `{ ok: true, plan: {...}, masterPlanPath: 'docs/01-plan/features/q2-launch.master-plan.md', stateFilePath: '.bkit/state/master-plans/q2-launch.json' }`
- master plan markdown contains §0 Executive Summary + §1 Context Anchor + §2 Features (3 rows) + §3 Sprint Phase Roadmap + §4 Quality Gates skeleton + §5 Sprint 분할 stub
- state json schema v1.0 with `{ projectId, projectName, features, sprints: [], generatedAt, schemaVersion: '1.0' }`

### JS-02: LLM dispatcher — agent spawn 격리

**As an** LLM dispatcher within sprint-handler.handleMasterPlan caller,
**I want** master-plan.usecase to NOT spawn the sprint-master-planner agent itself,
**So that** I (the LLM at main session) can decide when/how to invoke Task tool with proper subagent_type (bkit:sprint-master-planner) and isolation parameters.

**Acceptance**:
- master-plan.usecase exposes `deps.agentSpawner: ({ subagent_type, prompt }) => Promise<{ output: string }>`
- when `deps.agentSpawner` is undefined, use case returns stub plan from template substitution (no LLM call)
- when `deps.agentSpawner` is provided, use case calls it once with `{ subagent_type: 'bkit:sprint-master-planner', prompt: <built prompt> }`
- caller (sprint-handler at LLM main session) constructs `deps.agentSpawner` by wrapping Task tool invocation

### JS-03: Sprint 1-5 invariant guardian — Sprint 1 events.js 0 변경

**As a** bkit core CI Sprint 1-5 invariant guardian,
**I want** master-plan feature to NOT modify `lib/domain/sprint/events.js`,
**So that** the frozen `SPRINT_EVENT_TYPES` array and 5 SprintEvents factories remain canonical, and Sprint 1 invariant (Master Plan §0.4 row 9) is preserved at 100%.

**Acceptance**:
- `git diff lib/domain/sprint/events.js` empty after Phase 4 commit
- Master plan creation events logged via `lib/audit/audit-logger.js` directly (옵션 D, §9.3)
- `lib/audit/audit-logger.js` ACTION_TYPES extended additively (line 50 next, additive only)
- L3 Contract SC-01~SC-08 8/8 PASS regression

### JS-04: State persistence reliability — atomic write

**As a** state-persistence-reliant bkit user (long-running multi-sprint projects),
**I want** `.bkit/state/master-plans/<project>.json` to be written atomically,
**So that** mid-write SIGKILL or process crash doesn't corrupt state, and the next `/sprint master-plan <project>` invocation (idempotent) reads valid state.

**Acceptance**:
- save uses tmp file + rename pattern (Sprint 3 stateStore precedent)
- mkdir -p `.bkit/state/master-plans/` if missing
- on second call with same projectId, use case reads existing state and returns `{ ok: true, alreadyExists: true, plan: <existing> }` unless `--force` flag

### JS-05: Doc=Code 0 drift — markdown + state single transaction

**As a** Doc=Code invariant guardian (`scripts/docs-code-sync.js`),
**I want** master-plan use case to write BOTH `docs/01-plan/features/<project>.master-plan.md` AND `.bkit/state/master-plans/<project>.json` in single transaction,
**So that** drift detector never sees orphan markdown (no state) or orphan state (no markdown).

**Acceptance**:
- use case writes state.json first → if successful, writes markdown
- if markdown write fails after state write: rollback (delete state.json) + return error
- if state write fails: do NOT attempt markdown write + return error
- `scripts/docs-code-sync.js` exits 0 after Phase 4 commit

### JS-06: 8-language trigger 사용자 — master-plan 키워드 매트릭스

**As a** Korean/Japanese/Chinese/Spanish/French/German/Italian/English bkit 사용자,
**I want** my native-language master-plan keyword to trigger sprint skill suggestion,
**So that** I don't need to memorize the English slash command `/sprint master-plan`.

**Acceptance**:
- SKILL.md frontmatter triggers field contains keywords 8-language matrix:
  - EN: master plan, multi-sprint plan
  - KO: 마스터 플랜, 멀티 스프린트 계획
  - JA: マスタープラン, マルチスプリント計画
  - ZH: 主计划, 多冲刺计划
  - ES: plan maestro, plan multi-sprint
  - FR: plan maître, plan multi-sprint
  - DE: Masterplan, Multi-Sprint-Plan
  - IT: piano principale, piano multi-sprint
- sprint-master-planner agent frontmatter triggers (이미 존재, 16 matches) 보존
- UserPromptSubmit hook auto-detects + suggests `/sprint master-plan`

### JS-07: `/control L4` Full-Auto — master-plan 안전성

**As a** Trust Level L4 user (Full-Auto mode),
**I want** master-plan action to NOT trigger autoRun phase loop (master-plan is not a sprint phase),
**So that** my L4 sprint cycle continues uninterrupted and 4 auto-pause triggers don't fire spuriously.

**Acceptance**:
- handleMasterPlan does NOT call `startSprint` or `advancePhase`
- handleMasterPlan does NOT mutate `<sprint>.json` (only creates `<project>.json` in master-plans dir)
- 4 auto-pause triggers (QUALITY_GATE_FAIL / ITERATION_EXHAUSTED / BUDGET_EXCEEDED / PHASE_TIMEOUT) impact: 0 (not applicable to master-plan action)

### JS-08: Task Management 통합 — optional, idempotent

**As a** Task Management 사용자 (Claude Code TaskCreate),
**I want** master-plan to optionally register N sprint Tasks (one per planned sprint),
**So that** my Task list reflects the multi-sprint roadmap automatically — but ONLY when I explicitly inject `deps.taskCreator`.

**Acceptance**:
- when `deps.taskCreator` is provided AND `plan.sprints.length > 0`: use case calls taskCreator N times (one per sprint)
- when `deps.taskCreator` is undefined: use case skips Task registration silently (no error)
- TaskCreate calls are sequential (ENH-292 ENH-292 caching mitigation alignment)
- each sprint task includes `addBlockedBy: [<previous-sprint-task-id>]` for sequential dependency

---

## 5. Pre-mortem (15 scenarios)

[[feedback-thorough-complete]] "꼼꼼함" 적용 — 모든 실패 시나리오 사전 식별:

| # | 시나리오 | 방지 | 검증 |
|---|----------|------|------|
| A | Sprint 1 events.js 에 신규 factory 추가 (invariant 위배) | §9.3 옵션 D — audit-logger 직접 호출, events.js 0 변경 | `git diff lib/domain/sprint/events.js` empty |
| B | sprint-master-planner agent frontmatter 변경 → F9-120 14-cycle 깨기 | §3.5 frontmatter 0 변경, body 만 ext | `claude plugin validate .` Exit 0 매 commit 후 |
| C | Agent spawn 실패 (subagent_type mismatch) | §JS-02 use case 가 agent 호출 안 함 — caller 가 책임 + dry-run default | unit test agentSpawner mock + handleMasterPlan return contract |
| D | State persistence atomic race | §JS-04 tmp+rename pattern + Sprint 3 stateStore 재사용 | L3 SC test (SC-09 후속 S4-UX scope) |
| E | Doc=Code drift (markdown vs state mismatch) | §JS-05 state-first write + rollback on markdown failure | `scripts/docs-code-sync.js` Exit 0 |
| F | 8-language trigger 일부 누락 | §JS-06 매트릭스 명시 + linting checklist | `grep -c "master plan\|마스터 플랜\|マスタープラン\|主计划\|plan maestro\|plan maître\|Masterplan\|piano principale" skills/sprint/SKILL.md` ≥ 8 |
| G | handleMasterPlan 의 VALID_ACTIONS Object.freeze 깨기 | §3.3 array literal 직접 수정 (Object.freeze 호출은 외부에서) | runtime test: `VALID_ACTIONS.length === 16` + `VALID_ACTIONS.includes('master-plan')` |
| H | bkit-system "Design First" invariant 위배 | Design phase 후 Do phase 진입 강제 (PDCA cycle) | git log order: PRD → Plan → Design → Do |
| I | "No Guessing" invariant 위배 (matchRate < 100%) | Design ↔ Implementation verbatim 정확 일치 + Phase 5 Iterate | gap-detector matchRate 100% target |
| J | Audit Trail invariant 위배 (master_plan_created entry 부재) | §JS-03 audit-logger.logEvent 호출 + ACTION_TYPES 등록 | `grep -c "master_plan_created" .bkit/audit/$(date +%Y-%m-%d).jsonl` ≥ 1 |
| K | hooks.json 21:24 invariant 위배 | 신규 hook 추가 0 | `node -e "console.log(JSON.parse(require('fs').readFileSync('hooks/hooks.json')).hooks.length)"` events 매트릭스 unchanged |
| L | `/control L4` runaway (master-plan loop) | §JS-07 master-plan 은 sprint phase 미수정 + autoRun loop 영향 0 | sprint state.json after master-plan = before |
| M | Template substitution 실패 (templates/sprint/master-plan.template.md 변수 누락) | §0.2 placeholder 보존 + warning 반환 | unit test template var coverage |
| N | sprint-handler CLI mode 깨기 (positional args parsing) | §3.3 CLI mode 변경 X — positional id 자동 처리 | `node scripts/sprint-handler.js master-plan q2-launch --features=auth` exit 0 |
| O | 사용자 명시 5 (꼼꼼함) 위배 — 빠르게 끝내려는 inclination | PRD ~700+ Plan ~800+ Design ~900+ lines 목표 + 매 phase checklist | git diff stat 별 라인 count |

---

## 6. Quality Gates Activation Matrix

| Gate | Threshold | S2-UX 적용 |
|------|-----------|-----------|
| **M1** matchRate | ≥ 90% (target 100%) | Iterate phase 강제 — Design ↔ Implementation matrix |
| **M2** codeQualityScore | ≥ 80 | code-analyzer / 자체 review — JSDoc + naming convention |
| **M3** criticalIssueCount | = 0 | qa-lead — runtime errors |
| **M4** apiComplianceRate | ≥ 95 | public API signature 보존 (Sprint 1-3 invariant) — additive only |
| **M5** testCoverage | ≥ 70 | unit test 추가 (master-plan.usecase pure logic 부분) |
| **M7** conventionCompliance | ≥ 90 | English code + Korean docs + JSDoc + ESLint clean |
| **M8** designCompleteness | ≥ 85 | Design §2 (interfaces) + §3 (sequence) + §4 (data flow) + §5 (patches) + §6 (Inter-Sprint) + §7 (AC) + §8 (test plan) + §9 (Sprint 1-5 보존) + §10 (Final checklist) |
| **M10** pdcaCycleTimeHours | ≤ 40 | S2-UX 90-120분 (Master Plan §5.1) |
| **S1** dataFlowIntegrity | = 100 | L3 SC-05 4-layer chain (USER → Skill → Handler → UseCase → Infra → Domain → Audit) Phase 6 QA |
| **S2** featureCompletion | = 100 | 5 deliverable + 2 부수 모두 |
| **S4** archiveReadiness | = true | Phase 7 Report 후 task #5 (S2-UX umbrella) close 가능 |

---

## 7. Acceptance Criteria (40 criteria, 5 groups)

### 7.1 AC-Master-Plan-Generator (10 criteria)

- **AC-MPG-1** `handleSprintAction('master-plan', { projectId: 'q2-launch', projectName: 'Q2 Launch', features: ['auth', 'payment', 'reports'] })` returns `{ ok: true, plan, masterPlanPath, stateFilePath }`
- **AC-MPG-2** When `deps.agentSpawner` is undefined: returns stub plan from template substitution (no LLM call) + `plan.sprints = []`
- **AC-MPG-3** When `deps.agentSpawner` is provided: calls it once with `{ subagent_type: 'bkit:sprint-master-planner', prompt: <built prompt> }` + parses output as Master Plan markdown
- **AC-MPG-4** Markdown file created at `docs/01-plan/features/<projectId>.master-plan.md` matches template structure (§0~§15 sections from `templates/sprint/master-plan.template.md`)
- **AC-MPG-5** State json created at `.bkit/state/master-plans/<projectId>.json` with schema v1.0 `{ projectId, projectName, features, sprints, generatedAt, schemaVersion }`
- **AC-MPG-6** Idempotent — second call with same projectId returns `{ ok: true, alreadyExists: true, plan: <existing> }` unless `--force` flag
- **AC-MPG-7** Atomic state write — tmp + rename pattern verified (synthetic SIGKILL test)
- **AC-MPG-8** Audit emit — `.bkit/audit/<date>.jsonl` contains entry `{ action: 'master_plan_created', category: 'pdca', target: { type: 'feature', id: <projectId> }, ... }`
- **AC-MPG-9** Task wiring — when `deps.taskCreator` provided + `plan.sprints.length > 0`: N TaskCreate calls (sequential)
- **AC-MPG-10** Use case returns `{ ok: false, error }` (not throw) on invalid input (kebab-case validation, projectName non-empty)

### 7.2 AC-Sprint-Handler-Integration (8 criteria)

- **AC-SHI-1** `VALID_ACTIONS.length === 16` after Phase 4 commit + `VALID_ACTIONS.includes('master-plan')` true
- **AC-SHI-2** `Object.isFrozen(VALID_ACTIONS) === true` (immutability preserved)
- **AC-SHI-3** `handleHelp()` helpText contains `'master-plan'` action line
- **AC-SHI-4** CLI mode — `node scripts/sprint-handler.js master-plan q2-launch --features=auth,payment` exit 0 + JSON output
- **AC-SHI-5** CLI mode — `node scripts/sprint-handler.js master-plan` (no id) exit 1 + error message
- **AC-SHI-6** require mode — `require('./scripts/sprint-handler').handleSprintAction('master-plan', { projectId: 'q2-launch', projectName: 'Q2 Launch' })` returns promise
- **AC-SHI-7** Master plan action does NOT mutate any sprint state — `git diff .bkit/state/sprints/` empty after master-plan invocation
- **AC-SHI-8** `--features=auth,payment` flag parsed correctly (comma-separated string → array)

### 7.3 AC-Agent-Body-Ext (7 criteria)

- **AC-ABE-1** `agents/sprint-master-planner.md` frontmatter unchanged (line 1-26 git diff empty)
- **AC-ABE-2** Body contains new section `## Master Plan Invocation Contract` with input/output JSON schema
- **AC-ABE-3** Body contains new section `## Working Pattern (Detailed)` 6-step procedure
- **AC-ABE-4** Body contains new section `## Sprint Split Heuristics` stub algorithm (S3-UX-ready)
- **AC-ABE-5** Body contains new section `## Output Markdown Contract` strict schema
- **AC-ABE-6** Agent body language = English (사용자 명시 1 — @docs 예외, agents 영어)
- **AC-ABE-7** Agent body length ≥ +60 LOC (existing 84 lines + new ~60 = ~144 lines)

### 7.4 AC-SKILL-Md-Ext (8 criteria)

- **AC-SME-1** Frontmatter `description:` line "15 sub-actions" → "16 sub-actions"
- **AC-SME-2** Frontmatter `description:` line lists `master-plan` in 16 actions enumeration
- **AC-SME-3** Frontmatter `triggers:` field contains 8-language master-plan keywords:
  - EN "master plan", KO "마스터 플랜", JA "マスタープラン", ZH "主计划", ES "plan maestro", FR "plan maître", DE "Masterplan", IT "piano principale"
- **AC-SME-4** Body §3 Arguments table contains `master-plan <project>` row
- **AC-SME-5** Body §10.1 Args schema table contains `master-plan` row with `Required: id (projectId), name (projectName), features` + `Optional: trust, context, projectRoot`
- **AC-SME-6** Body §10.3 NL mapping rules includes master-plan pattern example
- **AC-SME-7** Body new §11 section `## 11. Master Plan Generator (16번째 Sub-Action)` in English
- **AC-SME-8** Body language remains English (사용자 명시 1)

### 7.5 AC-Invariants-Preservation (7 criteria)

- **AC-INV-1** `git diff lib/domain/sprint/events.js` empty (Sprint 1 events.js 0 change)
- **AC-INV-2** `git diff lib/domain/sprint/entity.js` empty (Sprint 1 entity 0 change)
- **AC-INV-3** `git diff lib/domain/sprint/transitions.js` empty (Sprint 1 transitions 0 change)
- **AC-INV-4** `git diff lib/domain/sprint/validators.js` empty (Sprint 1 validators 0 change)
- **AC-INV-5** `claude plugin validate .` Exit 0 — F9-120 14-cycle 달성
- **AC-INV-6** `hooks/hooks.json` events:21 blocks:24 unchanged
- **AC-INV-7** L3 Contract SC-01~SC-08 8/8 PASS (Sprint 5 baseline regression)

**Cumulative AC**: **40 criteria** (10 + 8 + 7 + 8 + 7) — Master Plan §11.2 5 groups 충족

---

## 8. Inter-Sprint Integration — 15 Integration Points

S1-UX 가 정립한 IP 매트릭스 패턴 (S1-UX report §8 14/15 PASS) 의 S2-UX 분담 분 + 신규:

| IP# | From → To | S2-UX 책임 |
|-----|-----------|-----------|
| **IP-S2-01** | F1 master-plan.usecase → Sprint 1 (Domain) | Sprint 1 events.js 0 변경, validateSprintInput (id pattern) 재사용 |
| **IP-S2-02** | F1 → Sprint 3 (Infrastructure) | sprint-paths.js getMasterPlanStateFile additive helper + atomic write pattern 재사용 |
| **IP-S2-03** | F1 → lib/audit/audit-logger.js | ACTION_TYPES `master_plan_created` additive + logEvent 호출 |
| **IP-S2-04** | F1 → templates/sprint/master-plan.template.md | variable substitution (`{feature}/{displayName}/{date}/{author}/{trustLevel}/{duration}`) |
| **IP-S2-05** | F1 → F5 sprint-master-planner agent | Task spawn contract via `deps.agentSpawner` injection |
| **IP-S2-06** | F2 index.js → F1 use case | additive export — 기존 13 exports 보존 |
| **IP-S2-07** | F3 handleMasterPlan → F1 use case | masterPlanUsecase 호출 + deps composition |
| **IP-S2-08** | F3 → Sprint 4 enhancement zone | sprint-handler.js handleMasterPlan + VALID_ACTIONS ext (enhancement zone only) |
| **IP-S2-09** | F3 → CLI mode | positional `master-plan` action + projectId 자동 처리 (line 527-552 무변경) |
| **IP-S2-10** | F4 SKILL.md → CC LLM dispatcher | §11 NL mapping rules + 8-language trigger 16+ matches |
| **IP-S2-11** | F4 → §10 invocation contract | §10.1 Args schema table row 추가 (S1-UX §10 ext base 활용) |
| **IP-S2-12** | F5 sprint-master-planner agent → main session | Output Markdown Contract — markdown 만 반환, side effect 0 (격리 보장) |
| **IP-S2-13** | F5 → templates/sprint/* | 7 templates (master-plan, prd, plan, design, iterate, qa, report) 활용 — 변경 0 |
| **IP-S2-14** | F6 audit-logger → .bkit/audit/<date>.jsonl | master_plan_created entry NDJSON append |
| **IP-S2-15** | F7 sprint-paths → F1 use case | getMasterPlanStateFile/Dir 신규 helper |

**S3-UX 진입 시 unblock 보장**: F1 use case 의 `recommendedSprints: []` stub interface → S3-UX context-sizer.js 가 채움.
**S4-UX 진입 시 unblock 보장**: F3 handleMasterPlan callable contract → S4-UX L3 Contract SC-09/10 작성 base.

---

## 9. Sprint 1-5 Invariant Preservation Matrix

### 9.1 Sprint 1 (Domain) — 0 변경

| File | 변경 | Justification |
|------|------|--------------|
| `lib/domain/sprint/events.js` | **0 LOC** | ★ §9.3 옵션 D 채택 — 신규 event factory 추가 안 함 |
| `lib/domain/sprint/entity.js` | **0 LOC** | createSprint signature 변경 X, Sprint entity 변경 X |
| `lib/domain/sprint/transitions.js` | **0 LOC** | 8-phase transition graph 보존 |
| `lib/domain/sprint/validators.js` | **0 LOC** | validateSprintInput 재사용 (id pattern + name validation) |
| `lib/domain/sprint/index.js` | **0 LOC** | barrel export 보존 |

### 9.2 Sprint 2 (Application) — additive export only

| File | 변경 | Justification |
|------|------|--------------|
| `lib/application/sprint-lifecycle/master-plan.usecase.js` | **신규 ~250 LOC** | F1 — 신규 module, 기존 12 use case 와 동일 layer |
| `lib/application/sprint-lifecycle/index.js` | **+5 LOC additive** | F2 — barrel export ext (기존 13 export 0 변경) |
| 기존 12 use case (start-sprint / advance-phase / iterate / qa / report / archive / pause / resume / auto-pause / verify-data-flow / phases / transitions / quality-gates) | **0 LOC** | invariant preserved |

### 9.3 Audit Trail 처리 — 옵션 D (events.js 0 변경)

★ 본 sprint 의 핵심 architectural decision:

**옵션 A (rejected)**: lib/domain/sprint/events.js 에 SprintMasterPlanCreated factory 추가 + SPRINT_EVENT_TYPES 'SprintMasterPlanCreated' 추가. Sprint 1 invariant **위배** (frozen array 변경).

**옵션 B (rejected)**: SprintCreated event 재사용. Semantic mismatch (event name vs intent).

**옵션 C (rejected)**: sprint-telemetry eventEmitter.emit 으로 generic event 발화. `isValidSprintEvent` filter (line 174) → silent drop → audit 안 됨.

**옵션 D (selected)**: master-plan.usecase 가 `lib/audit/audit-logger.js` 직접 호출 (`logEvent` 또는 `logPdca`). Sprint 1 events.js 변경 0. audit-logger.js ACTION_TYPES 에 `'master_plan_created'` additive — Sprint 4 (Presentation) 가 `'sprint_paused'/'sprint_resumed'` additive 추가 사례와 동일 패턴 (line 48-50 verbatim).

| 옵션 | events.js 변경 | invariant 위배 | semantic 정확 | audit 작동 |
|------|---------------|--------------|--------------|-----------|
| A | +20 LOC | ★ YES | ✓ | ✓ |
| B | 0 LOC | NO | ★ NO | ✓ |
| C | 0 LOC | NO | ✓ | ★ NO (silent drop) |
| **D (selected)** | **0 LOC** | **NO** | **✓** | **✓** |

### 9.4 Sprint 3 (Infrastructure) — additive helper only

| File | 변경 | Justification |
|------|------|--------------|
| `lib/infra/sprint/sprint-paths.js` | **+12 LOC additive** | F7 — getMasterPlanStateDir/File 신규 함수, 기존 7 helper 0 변경 |
| `lib/infra/sprint/sprint-state-store.adapter.js` | **0 LOC** | atomic write pattern 재사용만 (master-plan.usecase 가 동일 패턴 직접 구현 또는 helper inject) |
| `lib/infra/sprint/sprint-telemetry.adapter.js` | **0 LOC** | eventEmitter 이용 안 함 (옵션 D — audit-logger 직접) |
| `lib/infra/sprint/sprint-doc-scanner.adapter.js` | **0 LOC** | 기존 findAllSprints / *.master-plan.md scan 패턴 그대로 활용 |
| `lib/infra/sprint/matrix-sync.adapter.js` | **0 LOC** | matrix sync 영역 외 |
| `lib/infra/sprint/index.js` | **+2 LOC additive** | sprint-paths re-export 에 신규 helper 2건 추가 |

### 9.5 Sprint 4 (Presentation) — enhancement zone

| File | 변경 | Justification |
|------|------|--------------|
| `scripts/sprint-handler.js` | **+90 LOC additive** | F3 — handleMasterPlan + VALID_ACTIONS 16번째 element + switch case + helpText ext (S1-UX 의 enhancement zone 정당화 정신 동일) |
| `skills/sprint/SKILL.md` | **+60 LOC additive** | F4 — frontmatter description 16 sub-actions + 8-lang triggers + Arguments table + §10/§11 ext (S1-UX §10 신규 패턴 동일) |
| `agents/sprint-master-planner.md` | **+60 LOC additive body only** | F5 — frontmatter 0 변경 (R10 invariant), body §M~§P 신규 sections (영어) |
| `agents/sprint-orchestrator.md` | **0 LOC** | scope 외 |
| `agents/sprint-qa-flow.md` | **0 LOC** | scope 외 |
| `agents/sprint-report-writer.md` | **0 LOC** | scope 외 |

### 9.6 Sprint 5 (Quality + Docs) — regression PASS

| Component | 변경 | Verification |
|-----------|------|-------------|
| L3 Contract `tests/contract/v2113-sprint-contracts.test.js` SC-01~SC-08 | **0 LOC** | Phase 6 QA — 8/8 PASS regression 재실행 |
| Korean guides `docs/06-guide/sprint-*.guide.md` | **0 LOC** | S4-UX scope 의 §9 신규 |
| MEMORY.md sprint-memory-writer | **0 LOC** | scope 외 |

### 9.7 lib/audit (Audit Trail 영역) — additive

| File | 변경 | Justification |
|------|------|--------------|
| `lib/audit/audit-logger.js` | **+1 LOC additive** | F6 — ACTION_TYPES line 50 next `'master_plan_created'` 추가. Sprint 4 (Presentation) 에서 이미 `'sprint_paused'/'sprint_resumed'` additive 추가한 precedent 활용. lib/audit 는 Sprint 1-4 invariant 스코프 외 |

**Sprint 1-5 invariant 종합**: **Sprint 1 0 변경 (100%)**, **Sprint 2 additive export only**, **Sprint 3 additive helper only**, **Sprint 4 enhancement zone**, **Sprint 5 regression PASS**.

---

## 10. bkit-system Philosophy 7 Invariants Preservation Matrix

| Invariant | 본 sprint 적용 | Mitigation |
|-----------|---------------|-----------|
| **Design First** (pre-write.js 차단) | ✅ Phase 3 Design doc 후 Phase 4 Do | git log order 검증 |
| **No Guessing** (gap-detector 강제) | ✅ §1 verbatim code line citation 매트릭스 + Phase 5 Iterate matchRate 100% target | gap-detector + git diff |
| **Gap < 5%** (matchRate ≥ 90%) | ✅ Phase 5 Iterate matchRate 100% target (S1-UX precedent) | gap-detector |
| **State Machine** (PDCA 20 transitions + Sprint 8-phase) | ✅ PDCA + Sprint phase enum 모두 변경 X. master-plan 은 sprint phase 외 action | grep 검증 |
| **Trust Score** (L0-L4) | ✅ master-plan action 은 trust level 영향 안 받음 (sprint state 미수정). 단 SKILL.md §10 의 trust normalize 정신 보존 | normalizeTrustLevel 호출 가능, default L3 |
| **Checkpoint** (auto rollback) | ✅ master-plan 은 sprint state 미수정 → rollback 불필요. 단 markdown 또는 state.json write 실패 시 rollback (§JS-05) | unit test rollback path |
| **Audit Trail** (JSONL logging) | ✅ §9.3 옵션 D — audit-logger 직접 호출 + ACTION_TYPES additive | `.bkit/audit/<date>.jsonl` entry |

---

## 11. 사용자 명시 1-8 충족 매트릭스

| # | Mandate | S2-UX 적용 |
|---|---------|-----------|
| 1 | 8개국어 trigger + @docs 예외 한국어 | ✓ SKILL.md frontmatter 8-lang master-plan keywords + sprint-master-planner agent 16 matches 보존. SKILL.md body §11 영어, agent body 영어, docs/ 한국어 |
| 2 | Sprint 유기적 상호 연동 | ✓ §8 15 IPs + §1 5 use case Application Layer chain + Doc=Code single transaction (§JS-05) |
| 3 | QA = bkit-evals + claude -p + 4-System + diverse perspective | ✓ Phase 6 QA — 7-perspective matrix (S1-UX precedent §3.1/§3.2 패턴) |
| 4 | Master Plan + 컨텍스트 윈도우 sprint sizing | ✓ 본 sub-sprint 의 핵심 deliverable — §3 (Feature Map) + §JS-01 (1-command UX). context-sizer 는 S3-UX |
| 5 | ★ 꼼꼼하고 완벽하게 (빠르게 X) | ✓ PRD ~700 lines target + §5 (15 pre-mortem) + §7 (40 AC) + §13 (final checklist) |
| 6 | ★ skills/agents YAML frontmatter + 8개국어 + @docs 외 영어 | ✓ §3.5 sprint-master-planner frontmatter 0 변경 + body 영어. §3.4 SKILL.md frontmatter 8-lang ext + body §11 영어 |
| 7 | ★ Sprint별 유기적 상호 연동 동작 검증 | ✓ §8 IP-S2-01~IP-S2-15 매트릭스 + Phase 6 QA 검증 |
| 8 | ★ /control L4 완전 자동 모드 + 꼼꼼함 | ✓ §JS-07 L4 영향 0 (master-plan 은 sprint phase 외) + 매 phase checklist + 4 auto-pause trigger 보존 |

---

## 12. Open Questions (PM-S2A~G)

본 PRD 의 unresolved questions — Plan phase 진입 전 또는 Plan phase 내부에서 해결.

### PM-S2A: Agent invocation contract — `deps.agentSpawner` signature

**Question**: `deps.agentSpawner` 의 input/output signature 는 어떻게 정의하는가? Claude Code Task tool 의 invocation pattern 과 1:1 매칭하나, 또는 generic abstraction?

**Candidates**:
1. **1:1 Task tool**: `({ subagent_type, prompt, isolation? }) => Promise<{ text: string }>` — Task tool API surface 와 동일
2. **Generic abstraction**: `({ name, input }) => Promise<{ output: string }>` — Task tool 외 다른 spawn 기법도 지원
3. **Hybrid**: `({ subagent_type, prompt }) => Promise<{ output: string }>` — Task tool input 명명 + output 일반화

**Resolution**: Plan §3 (Implementation Order) 에서 결정. Hybrid (option 3) 가 우세 — Task tool 호환 + use case 가 output 만 알면 됨.

### PM-S2B: master-plan template variable mapping

**Question**: `templates/sprint/master-plan.template.md` 의 6 variables (`{feature}/{displayName}/{date}/{author}/{trustLevel}/{duration}`) 가 use case input 의 어떤 field 와 매핑되나?

**Candidates**:
- `{feature}` ← `projectId` (kebab-case)
- `{displayName}` ← `projectName`
- `{date}` ← `new Date().toISOString().slice(0, 10)`
- `{author}` ← `process.env.GIT_AUTHOR_NAME` || `'bkit user'`
- `{trustLevel}` ← `args.trust || 'L3'`
- `{duration}` ← `args.duration || 'TBD (estimated by master-planner agent)'`

**Resolution**: Plan §2 (Module spec) 에서 mapping table 명시.

### PM-S2C: State json schema v1.0 strict fields

**Question**: `.bkit/state/master-plans/<project>.json` 의 schema v1.0 에 어떤 fields 가 필수인가?

**Proposed**:
```json
{
  "schemaVersion": "1.0",
  "projectId": "q2-launch",
  "projectName": "Q2 Launch",
  "features": ["auth", "payment", "reports"],
  "sprints": [
    {
      "id": "s1-q2",
      "name": "S1 — Auth Foundation",
      "features": ["auth"],
      "scope": "...",
      "tokenEst": 0,
      "dependsOn": []
    }
  ],
  "dependencyGraph": { "s1-q2": [], "s2-q2": ["s1-q2"] },
  "trustLevel": "L3",
  "context": { "WHY": "", "WHO": "", "RISK": "", "SUCCESS": "", "SCOPE": "" },
  "generatedAt": "2026-05-12T20:00:00Z",
  "updatedAt": "2026-05-12T20:00:00Z",
  "masterPlanPath": "docs/01-plan/features/q2-launch.master-plan.md"
}
```

**Resolution**: Plan §4 (State schema) 에서 final. tokenEst 는 S3-UX 가 채움 (stub 0).

### PM-S2D: dry-run mode output contract

**Question**: `deps.agentSpawner === undefined` 시 stub plan 은 무엇을 반환하나? 단순 template substitution 또는 minimal valid markdown?

**Resolution**: Plan §2 — template substitution 으로 minimal valid markdown 생성 (§0~§16 모두 placeholder 보존). state json 도 빈 sprints 배열로 valid.

### PM-S2E: Audit emit timing

**Question**: `master_plan_created` audit entry 는 언제 emit 하나? state write 후 / markdown write 후 / both?

**Resolution**: Plan §4 — state write 성공 직후 1회 emit (markdown write 는 best-effort, fail 시 audit entry 에 markdownWriteSuccess: false 추가).

### PM-S2F: VALID_ACTIONS 16번째 위치

**Question**: `'master-plan'` 을 VALID_ACTIONS array 의 어느 위치에 넣나? 알파벳순 / functional grouping / append?

**Resolution**: Plan §3 — alphabetical 아닌 functional grouping. Master Plan 이 sprint lifecycle 의 pre-init 단계 → `'init'` 보다 앞? 단 backward compatible 위해 array end (16번째) append.

### PM-S2G: idempotency vs --force semantics

**Question**: 두 번째 `/sprint master-plan <project>` 호출 시 기본 동작 = read-only (idempotent), `--force` 시 overwrite?

**Resolution**: Plan §2 — idempotent by default. `--force` 시 overwrite + audit entry `{ action: 'master_plan_overwritten' }` (별도 ACTION_TYPE? 또는 master_plan_created 의 details.forceOverwrite=true field?). 후자 — single ACTION_TYPE 유지.

---

## 13. Out-of-Scope Confirmation (S3-UX / S4-UX / v2.1.14)

| 항목 | 별도 |
|------|------|
| `lib/application/sprint-lifecycle/context-sizer.js` 신규 | S3-UX |
| token estimate algorithm (≤ 100K tokens/sprint) | S3-UX |
| `bkit.config.json` sprint settings section (`sprint.contextSizing.maxTokens`) | S3-UX |
| L3 Contract SC-09 (master-plan invocation) + SC-10 (context-sizing) | S4-UX |
| `commands/bkit.md` master-plan 매트릭스 ext | S4-UX |
| `docs/06-guide/sprint-management.guide.md` §9 Master Plan workflow | S4-UX |
| 7-perspective verification 재실행 (S4-UX QA phase) | S4-UX |
| Inter-sprint IP-S2-15 종합 검증 | S4-UX |
| MEMORY.md `## Active Sprints` hook v2 (multi-feature) | v2.1.14 |
| `/pdca team` sprint 통합 (Enterprise multi-feature) | v2.1.14 |
| Real backend wiring (chrome-qa MCP 실 호출) | v2.1.14 (S4-UX QA scope 외) |
| BKIT_VERSION bump | Sprint 6 (v2.1.13 release) |
| CHANGELOG v2.1.13 | Sprint 6 |
| ADR 0010 신규 (만약 작성) | Sprint 6 |

---

## 14. References

### 14.1 Master Plan + S1-UX 자료

- `docs/01-plan/features/sprint-ux-improvement.master-plan.md` (602 lines) — Master Plan v1.0
- `docs/01-plan/features/s1-ux.prd.md` + `s1-ux.plan.md` + `s1-ux.design.md` — S1-UX 패턴 reference
- `docs/04-report/features/s1-ux.report.md` (~600 lines) — 18/18 AC PASS evidence

### 14.2 코드 base 자료 (verbatim citation)

- `scripts/sprint-handler.js` (559 lines) — VALID_ACTIONS line 41-45, switch line 194-211, CLI mode line 527-552
- `skills/sprint/SKILL.md` (235 lines) — frontmatter description line 7-17, Arguments table line 60-77, §10 invocation contract line 141-235
- `agents/sprint-master-planner.md` (84 lines) — frontmatter line 1-26, body Working Pattern line 48-69
- `lib/application/sprint-lifecycle/index.js` (77 lines) — exports line 38-76
- `lib/application/sprint-lifecycle/start-sprint.usecase.js` (366 lines) — pattern reference
- `lib/audit/audit-logger.js` (508 lines) — ACTION_TYPES line 28-51, module.exports line 481-507
- `lib/domain/sprint/events.js` (138 lines) — SPRINT_EVENT_TYPES line 24-30, SprintEvents line 41-115 (모두 0 변경)
- `lib/infra/sprint/sprint-paths.js` (103 lines) — getSprintPhaseDocAbsPath line 79-91
- `lib/infra/sprint/sprint-doc-scanner.adapter.js` — masterPlan 패턴 처리 (변경 0)
- `templates/sprint/master-plan.template.md` (79+ lines) — variable mapping reference

### 14.3 ADR + Plan 자료

- ADR 0007 (Sprint as Meta Container) — Sprint 도메인 entity
- ADR 0008 (Sprint Phase Enum) — 8-phase 보존
- ADR 0009 (Auto-Run + Auto-Pause) — 4 trigger 보존
- `bkit-system-philosophy.md` — 7 invariants

### 14.4 사용자 명시 보존 reference

- 사용자 명시 1: 8개국어 trigger + @docs 예외 영어 code
- 사용자 명시 2: Sprint 유기적 상호 연동
- 사용자 명시 3: QA = bkit-evals + claude -p + 4-System + diverse
- 사용자 명시 4-1: Master Plan 자동 생성
- 사용자 명시 4-2: 컨텍스트 윈도우 격리 sprint sizing
- 사용자 명시 5: 꼼꼼하고 완벽하게
- 사용자 명시 6: skills/agents YAML frontmatter + 8개국어 + @docs 외 영어
- 사용자 명시 7: Sprint별 유기적 상호 연동 동작 검증
- 사용자 명시 8: /control L4 완전 자동 모드 + 꼼꼼함

---

## 15. PRD Final Checklist (꼼꼼함 §16)

매 row 가 사용자 명시 1-8 또는 bkit-system / Sprint 1-5 invariant 또는 Master Plan §0.4 와 연결:

- [x] **사용자 명시 1 (8개국어)** — §3.4 SKILL.md 8-lang triggers + §3.5 sprint-master-planner agent 16 matches 보존
- [x] **사용자 명시 2 (Sprint 유기적)** — §8 15 IPs + §1 5-use-case chain
- [x] **사용자 명시 3 (eval+claude -p+4-System+diverse)** — §6 Quality Gates + §7 AC 40개 + Phase 6 QA 매트릭스
- [x] **사용자 명시 4-1 (Master Plan 자동 생성)** — §3 Feature Map F1~F5 핵심 deliverable
- [x] **사용자 명시 4-2 (컨텍스트 윈도우 sizing)** — S3-UX scope 명시 + §F1 use case 의 `recommendedSprints: []` stub interface 제공
- [x] **사용자 명시 5 (꼼꼼함)** — 본 PRD 700+ 라인 target + 15 pre-mortem + 40 AC + 7 PM-S2 questions + 15 references
- [x] **사용자 명시 6 (skills/agents YAML + 영어 외 8-lang trigger)** — §3.5 frontmatter 0 변경 + §11 AC-SME-6/8 + AC-ABE-6 검증
- [x] **사용자 명시 7 (Sprint별 유기적 상호 연동 동작 검증)** — §8 IP-S2-01~15 + Phase 6 QA 매트릭스
- [x] **사용자 명시 8 (/control L4 완전 자동)** — §JS-07 + §10 Trust Score row + §5.L pre-mortem
- [x] **bkit-system 7 invariants** — §10 매트릭스 (Design First / No Guessing / Gap < 5% / State Machine / Trust Score / Checkpoint / Audit Trail)
- [x] **Sprint 1 invariant 0 변경** — §9.1 + §9.3 옵션 D 결단
- [x] **Sprint 2 additive export only** — §9.2 + IP-S2-06
- [x] **Sprint 3 additive helper only** — §9.4 + IP-S2-02/15
- [x] **Sprint 4 enhancement zone** — §9.5 + IP-S2-08
- [x] **Sprint 5 regression PASS** — §9.6 + Phase 6 QA L3 SC-01~08
- [x] **lib/audit ACTION_TYPES additive** — §9.7 + IP-S2-03 + IP-S2-14
- [x] **Doc=Code 0 drift** — §JS-05 + state-first single transaction
- [x] **F9-120 14-cycle 목표** — §AC-INV-5 + Phase 6 QA `claude plugin validate .` 매 commit 후
- [x] **hooks.json 21:24 invariant** — §AC-INV-6 + §5.K pre-mortem
- [x] **Pre-mortem 15** — §5 매트릭스 (A~O)
- [x] **AC 40** — §7 5 groups (AC-MPG / AC-SHI / AC-ABE / AC-SME / AC-INV)
- [x] **No Guessing verbatim citations** — §1 10건 (Master Plan §4.6/§3.1/§3.3/§3.4/§7.4 + sprint-handler 6.1/§1.6, SKILL §1.7, agent §1.8, audit-logger §1.9, index.js §1.10)
- [x] **Open questions PM-S2A~G** — §12 7건 Plan phase 에서 해결
- [x] **Out-of-scope confirmed** — §13 13항목 (S3-UX / S4-UX / v2.1.14 / Sprint 6 분리)

---

**PRD Status**: ★ **Draft v1.0 완료**.
**Next**: Phase 2 Plan 진입 — `docs/01-plan/features/s2-ux.plan.md` 작성. Requirements (R1-R12) + AC commit-ready commands + Inter-Sprint Matrix 15 IPs + Implementation Order + Token Budget.
**예상 소요**: Phase 2 Plan ~30분.
**사용자 명시 1-8 보존 확인**: 8/8 (§11 매트릭스 모두 ✓).
