# Sprint 4 PRD — v2.1.13 Sprint Management Presentation (Skill + Agents + Hooks + Templates + Control/Audit Integration)

> **Sprint ID**: `v2113-sprint-4-presentation`
> **Sprint of Master Plan**: 4/6 (Presentation — User surface + cross-layer integration)
> **Phase**: PRD (1/7)
> **Status**: Active
> **Date**: 2026-05-12
> **Trust Level (override)**: L4 (사용자 명시)
> **Master Plan**: `docs/01-plan/features/sprint-management.master-plan.md` v1.1 §3.6
> **ADRs**: 0007 / 0008 / 0009 (Proposed)
> **Depends on**: Sprint 1 (`a7009a5`) + Sprint 2 (`97e48b1`) + Sprint 3 (`232c1a6`) — all completed + invariant
> **Branch**: `feature/v2113-sprint-management`
> **★ User-Mandated Constraints (보존)**:
> 1. "skills, agents는 YAML frontmatter가 중요하며 8개국어 자동 트리거 키워드와 @docs 문서를 제외하고는 모두 영어로 구현해야해" — **본 Sprint 4 결정적 적용**
> 2. "Sprint 별로 만들어진 결과물들이 유기적으로 상호 연동되어 동작 되어야 해" — Sprint 1+2+3+4 4-layer end-to-end 검증

---

## 0. Context Anchor (Master Plan §1 + Sprint 3 §0에서 갱신 — Plan/Design/Do/Iterate/QA/Report 모든 phase에 전파)

| Key | Value |
|-----|-------|
| **WHY** | Sprint 1 (Domain frozen schema) + Sprint 2 (Application auto-run engine) + Sprint 3 (Infrastructure adapter) 위 **Presentation 사용자 표면 layer 영구화**. 사용자가 실제 `/sprint start` 같은 명령으로 Sprint 1+2+3을 활용할 수 있게 만드는 마지막 사용자 경로. **★ 사용자 명시 1 (8개국어 트리거)**: skills/sprint/SKILL.md + 4 agents/sprint-*.md 의 YAML frontmatter `triggers:` 필드에 EN/KO/JA/ZH/ES/FR/DE/IT 8개국어 풀세트 명시 — 본 Sprint 4 결정적 적용. **★ 사용자 명시 2 (유기적 상호 연동)**: skill handler 가 lib/infra/sprint/.createSprintInfra → Sprint 2 startSprint 호출 → Sprint 1 entity + Sprint 3 adapter end-to-end 단일 명령 경로 검증. |
| **WHO** | (1차) **bkit 사용자** — `/sprint init/start/status/list/phase/iterate/qa/report/archive/pause/resume/fork/watch/help` 15 sub-actions 사용 가능. (2차) **8개국어 사용자** — 모국어 키워드 자동 트리거 (한국어 사용자가 "스프린트 시작" 입력 시 skill 활성화). (3차) **Sprint 5 user guide 작성자** — 본 Sprint 4 사용자 경로 문서화 기반. (4차) **bkit core CI** — Sprint 1/2/3 invariant 0 변경 + plugin validate Exit 0 + skill frontmatter validator (B1-133 fix) PASS. (5차) **audit-logger** — sprint_paused/sprint_resumed ACTION_TYPES enum 확장 후 normalize 보존. (6차) **/control automation-controller** — SPRINT_AUTORUN_SCOPE 통합으로 Trust Level 별 scope 명시. (7차) **OTEL collector / Defense Layer 3 sanitizer** — SprintEvents 5건 자동 통합 (Sprint 3 telemetry adapter 경유). |
| **RISK** | (a) **★ 8개국어 트리거 키워드 누락**: skills/sprint/SKILL.md + 4 agents 중 일부가 EN/KO/JA/ZH/ES/FR/DE/IT 8개국어 풀세트 빠짐 → 사용자 명시 위반. (b) **★ 코드 영어 일관성 위반**: skill body / agent body / hook script 에 한국어 mixed → 사용자 명시 위반. (c) **★ Cross-sprint 유기적 연동 단절**: skill handler 가 Sprint 3 adapter inject 누락 → Sprint 1+2+3 자율 진행 불가 → 사용자 명시 2 위반. (d) **Skill frontmatter validator (B1-133, v2.1.133+) regression**: description 길이 250+ 자 시 CC validator fail. (e) **claude plugin validate Exit 1**: marketplace.json / plugin.json mismatch 또는 skill name 충돌. (f) **Sprint 1/2/3 invariant 깨짐**: 본 Sprint 4 가 Sprint 1/2/3 코드 수정 시 누적 무결성 깨짐. (g) **audit-logger ACTION_TYPES enum 확장 시 회귀**: 기존 ACTION_TYPES 16개 + 신규 2개 (sprint_paused/sprint_resumed) → 18개 — 기존 test/contract 회귀 위험. (h) **lib/control/automation-controller.js 변경 시 회귀**: SPRINT_AUTORUN_SCOPE 추가 시 기존 L0~L4 PDCA scope 영향. (i) **Skill 'sprint' name 충돌**: 기존 skills/sprint/ 디렉터리 존재 여부 확인 필요. (j) **Hook script 신규 추가 시 hooks.json 21 events 24 blocks invariant**: Sprint 4 가 신규 hook event 추가 X (기존 21 events 재사용 — Master Plan §3.6 명시). (k) **L4 모드 안전성**: 사용자 결정 존중하되 검증 단계 abbreviation 0건. |
| **SUCCESS** | (1) **`skills/sprint/SKILL.md`** + PHASES.md + 3 examples — frontmatter 8개국어 triggers 모두 명시 + 모든 코드 영어. (2) **4 agents 신규**: `sprint-orchestrator.md` (main, Task spawn pattern) + `sprint-master-planner.md` (PRD/Plan PMR analysis) + `sprint-qa-flow.md` (7-layer S1 검증) + `sprint-report-writer.md` (KPI + carry items). 각 frontmatter 8개국어 triggers + 모든 코드 영어. (3) **7 templates** in `templates/sprint/`: master-plan/prd/plan/design/iterate/qa/report — **한국어** (사용자 명시 `@docs` 문서 예외, docs/ 폴더에 한국어 생성). (4) **`scripts/sprint-handler.js`** — skill action dispatcher (init/start/status/list/...). createSprintInfra (Sprint 3) → startSprint (Sprint 2) → createSprint (Sprint 1) 단일 호출 경로. (5) **`lib/control/automation-controller.js` 확장**: SPRINT_AUTORUN_SCOPE Object.freeze 통합 (Sprint 2 inline 정의를 정식 이동). (6) **`lib/audit/audit-logger.js` ACTION_TYPES enum 확장**: 16 → 18 (sprint_paused + sprint_resumed). (7) **hooks/hooks.json 21 events 24 blocks invariant 유지** (Master Plan 명시 — 신규 hook event 0). (8) **Sprint 1/2/3 invariant 0 변경**. (9) **`claude plugin validate .` Exit 0** (F9-120 closure **10-cycle 연속 PASS** 목표). (10) **L2 + L3 integration TC 30+건 + ★ Cross-Sprint 통합 8+건 100% PASS** (skill handler가 Sprint 3 → Sprint 2 → Sprint 1 호출 검증). (11) **8개국어 triggers regex 자동 검증** — frontmatter parser TC. (12) **Defense Layer 6 / ENH-303 deferred** (5/13 review 의존). |
| **SCOPE** | **In-scope ~15 files**: (a) `skills/sprint/SKILL.md` (★ frontmatter 8개국어 triggers + 영어 body), (b) `skills/sprint/PHASES.md` (참조 문서, 영어), (c) `skills/sprint/examples/basic-sprint.md` + `multi-feature-sprint.md` + `archive-and-carry.md` (예제, 영어), (d) `agents/sprint-orchestrator.md` (★ frontmatter 8개국어 + 영어 body, Task spawn pattern), (e) `agents/sprint-master-planner.md` (★), (f) `agents/sprint-qa-flow.md` (★), (g) `agents/sprint-report-writer.md` (★), (h) `templates/sprint/master-plan.template.md` + 6 phase templates (한국어), (i) `scripts/sprint-handler.js` (skill dispatcher, 영어), (j) `lib/control/automation-controller.js` 확장 (SPRINT_AUTORUN_SCOPE), (k) `lib/audit/audit-logger.js` ACTION_TYPES 확장 (2 신규). **Out-of-scope (Sprint 5~6)**: (a) Sprint user guide / migration guide / README update (Sprint 5), (b) BKIT_VERSION bump (Sprint 6), (c) ADR 0007/0008/0009 Accepted (Sprint 6), (d) L4/L5 perf test (Sprint 5), (e) Real gap-detector/auto-fixer/chrome-qa wiring (Sprint 5 — 본 Sprint 4 는 mock placeholder), (f) test/contract/ tracked (Sprint 5), (g) `/sprint watch` Live dashboard 30-tick loop 구현 (Sprint 5 — 본 Sprint 4 는 SKILL.md sub-action 명시만), (h) Master Plan v1.2 LOC 정정 (Sprint 5), (i) ENH-303 PostToolUse continueOnBlock 통합 (5/13 review 후), (j) ENH-286 Memory Enforcer master plan 보호 (Sprint 5). **Tests**: L2 frontmatter + skill handler + L3 cross-sprint integration. **★ 사용자 명시 1 (8개국어 트리거 결정적 적용)** + **★ 사용자 명시 2 (Sprint 1+2+3+4 유기적 상호 연동)** 본 Sprint 결정적 적용. |

---

## 1. Problem Statement

Sprint 1 + 2 + 3 완료로 사용자가 자신의 sprint를 운영할 수 있는 **모든 기반 코드** 영구화됨. 그러나 **사용자 표면 (skill / agent / hook / template) 부재** → 사용자가 실제로 `/sprint start my-launch` 같은 명령 실행 불가. 본 Sprint 4 가 **마지막 1마일** 사용자 경로 영구화.

### 1.1 부재한 사용자 surface (현 commit `232c1a6` 상태)

| 부재 | 영향 |
|------|------|
| `skills/sprint/SKILL.md` 없음 | `/sprint` slash command 사용자 호출 불가 — 모든 lib/* 코드가 사용자에게 invisible |
| `skills/sprint/PHASES.md` 없음 | sprint phase 사용자 가이드 부재 |
| `skills/sprint/examples/` 없음 | 사용자가 어떻게 sprint 운영하는지 예제 부재 |
| `agents/sprint-orchestrator.md` 없음 | sprint 전체 조율 specialist agent 부재 (Task spawn 시 호출 대상) |
| `agents/sprint-master-planner.md` 없음 | Master Plan 작성 specialist 부재 |
| `agents/sprint-qa-flow.md` 없음 | 7-layer S1 dataFlowIntegrity QA specialist 부재 |
| `agents/sprint-report-writer.md` 없음 | Sprint cumulative report 작성 specialist 부재 |
| `templates/sprint/*.template.md` 없음 (7건) | Sprint user 가 docs/ 작성 시 템플릿 부재 |
| `scripts/sprint-handler.js` 없음 | skill action dispatcher 부재 — skill body 가 직접 lib/* 호출 불가 |
| `lib/control/automation-controller.js` SPRINT_AUTORUN_SCOPE | Sprint 2 inline 정의 (start-sprint.usecase 내) — `/control` 명령에서 surface 안 됨 |
| `lib/audit/audit-logger.js` ACTION_TYPES enum | sprint_paused/sprint_resumed 미등록 → unknown action fallback 동작 (passthrough OK 이지만 standard enum 권장) |

### 1.2 ★ 사용자 명시 1: 8개국어 트리거 키워드 + 영어 코드 (본 Sprint 결정적 적용)

사용자 인용:
> "skills, agents는 YAML frontmatter가 중요하며 8개국어 자동 트리거 키워드와 @docs 문서를 제외하고는 모두 영어로 구현해야해"

**해석 + 적용**:
- **YAML frontmatter `triggers:`** 필드에 EN/KO/JA/ZH/ES/FR/DE/IT 8개국어 키워드 풀세트
- **YAML frontmatter 자체** (`name:` `description:` 등) 영어
- **skill body / agent body** (markdown 본문) 영어
- **`scripts/sprint-handler.js`** (skill 보조 code) 영어
- **lib/control + lib/audit 확장** 영어 (주석 포함)
- **예외 (한국어 허용)**:
  - `templates/sprint/*.template.md` (이들은 docs/ 폴더 생성용 template → 본 sprint 의 docs 파일은 사용자 명시 `@docs 문서 예외`)
  - `docs/01-plan` ~ `docs/05-qa` 본 Sprint 4 의 PDCA artifacts (한국어, CLAUDE.md 정책)

**검증 매트릭스** (Phase 6 QA TC):
| 항목 | 검증 |
|------|------|
| skills/sprint/SKILL.md frontmatter `triggers:` 8개국어 풀세트 | regex parser TC |
| 4 agents/sprint-*.md frontmatter `description:` Triggers 8개국어 풀세트 | regex parser TC |
| skill body 한글 0건 (markdown headers + content) | grep TC |
| 4 agents body 한글 0건 | grep TC |
| scripts/sprint-handler.js 한글 0건 (주석/identifier) | grep TC |
| lib/control + lib/audit 신규 변경 부분 한글 0건 | grep TC |
| templates/sprint/*.template.md 한국어 (사용자 docs 생성용) | OK (예외) |

### 1.3 ★ 사용자 명시 2: Sprint 1+2+3+4 유기적 상호 연동 (본 Sprint 결정적 입증)

사용자 인용 (보존):
> "Sprint 별로 만들어진 결과물들이 유기적으로 상호 연동되어 동작 되어야 해"

**적용**:
| 검증 시나리오 | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 |
|-------------|---------|---------|---------|---------|
| 사용자 `/sprint start my-launch --trust L3` 호출 | ✓ entity factory | ✓ orchestrator | ✓ adapter inject | ✓ skill handler 진입 |
| skill handler → createSprintInfra → startSprint | (Sprint 1 typedef) | ✓ deps consumer | ✓ adapter provider | ✓ orchestration |
| L3 sprint 자율 진행 + 디스크 영구화 + audit log + 7 events | createSprint | advancePhase + iterateSprint + ... | stateStore.save + eventEmitter.emit | sprint-handler.js wires all |
| `/sprint status my-launch` 호출 → 디스크 load + render | (entity typedef) | (status field) | stateStore.load | skill handler render |
| `/sprint resume my-launch` (paused 후) | (SprintResumed event) | resumeSprint | eventEmitter audit | skill handler |
| `/sprint list` → state-store + doc-scanner 통합 | (entity typedef) | (read-only) | stateStore.list + docScanner.findAllSprints | skill handler union |

### 1.4 Defense Layer 6 / ENH-303 (5/13 review 의존, 본 Sprint 4 deferred)

본 Sprint 4 는 5/13 통합 의사결정 대기 — ENH-303 PostToolUse continueOnBlock + ENH-286 Memory Enforcer + ENH-289 Defense Layer 6 모두 Sprint 5 또는 v2.1.13 1st PR 후 단계 의존.

### 1.5 audit-logger ACTION_TYPES enum 확장 (현 16 → 18)

기존 16건 (`phase_transition`, `feature_created`, `feature_archived`, ...). 신규 2건 (Sprint 3 telemetry adapter 가 SprintPaused/SprintResumed 변환 시 passthrough 동작 — 정식 enum 등록 권장):
- `sprint_paused` (auto-pause trigger fire 시)
- `sprint_resumed` (resume 성공 시)

### 1.6 lib/control/automation-controller.js SPRINT_AUTORUN_SCOPE 정식 이동

Sprint 2 의 `start-sprint.usecase.js` 에 inline 정의된 SPRINT_AUTORUN_SCOPE 를 lib/control/automation-controller.js 로 정식 이동 (Master Plan §3.8 결정). 본 Sprint 4 에서:
- lib/control/automation-controller.js 에 SPRINT_AUTORUN_SCOPE 추가 (export)
- Sprint 2 start-sprint.usecase.js 의 inline 정의는 유지 (Sprint 2 invariant 0 변경) — `lib/control` 의 export 도 동일 shape 으로 sync
- 미래 Sprint 5 / 6 에서 Sprint 2 inline 정의 제거 + lib/control reference 만 사용 (Sprint 2 invariant 깨짐 OK, v2.1.14 후속 PR)

본 Sprint 4 는 **Sprint 2 invariant 보존을 우선** — lib/control 에 mirror 정의만 추가, Sprint 2 코드 수정 X.

---

## 2. Job Stories (JTBD 6-Part)

### Job Story 1 — bkit 사용자 (sprint 시작)
- **When** 사용자가 자신의 프로젝트에서 `/sprint init my-launch --trust L3` 입력 시,
- **I want to** skill handler 가 Sprint 1 createSprint + Sprint 3 stateStore.save 호출 + 디스크에 sprint state 영구화
- **so I can** 즉시 sprint 생성 + 다음 명령 (`/sprint start`) 사용 가능.

### Job Story 2 — bkit 사용자 (sprint 자율 실행)
- **When** 사용자가 `/sprint start my-launch` 입력 시,
- **I want to** skill handler 가 Sprint 3 createSprintInfra → Sprint 2 startSprint (L3 scope) 자율 실행 + 7 events emit + audit log + disk 영구화
- **so I can** 단일 명령으로 Sprint 1+2+3+4 4-layer 통합 자율 진행 (사용자 명시 2 핵심).

### Job Story 3 — 8개국어 사용자 (자동 트리거)
- **When** 한국어 사용자가 "스프린트 시작" 입력 또는 일본어 사용자가 "スプリント開始" 입력 시,
- **I want to** skill frontmatter triggers 의 모국어 키워드 매칭 → bkit:sprint skill 자동 활성화
- **so I can** 8개국어 풀세트 사용자 cohort 가 모국어로 sprint 운영.

### Job Story 4 — bkit 사용자 (sprint 발견 + 재개)
- **When** 사용자가 `/sprint list` 또는 `/sprint resume my-launch` 입력 시,
- **I want to** Sprint 3 stateStore.list + docScanner.findAllSprints 통합 결과 또는 Sprint 2 resumeSprint 호출
- **so I can** 활성/보관 sprint 모두 조회 + 정확한 phase 부터 재개.

### Job Story 5 — Sprint orchestrator agent (Task spawn)
- **When** main session 이 `Task({subagent_type: 'sprint-orchestrator'})` spawn 시,
- **I want to** agent body 가 Sprint 2 startSprint + Sprint 3 adapter + multi-agent specialist (sprint-master-planner / sprint-qa-flow / sprint-report-writer) sequential 호출 (ENH-292)
- **so I can** sprint 전체 phase 자율 진행 + bkit 차별화 #3 sequential dispatch moat 자기적용.

### Job Story 6 — Sprint user (template-driven 문서 작성)
- **When** sprint phase 별 docs 작성 시 (예: PRD 작성),
- **I want to** `templates/sprint/prd.template.md` 변수 치환으로 docs/01-plan/features/{id}.prd.md 자동 생성
- **so I can** Context Anchor + Section 구조 일관성 보장 (Master Plan §3.4 Phase B 통합).

### Job Story 7 — bkit core CI / audit-logger
- **When** SprintPaused event emit 시 audit-logger normalizeEntry 호출,
- **I want to** ACTION_TYPES enum 에 `sprint_paused` 정식 등록 → entry.action 값 그대로 유지 (passthrough → enum-validated 격상)
- **so I can** 사후 audit log 분석 시 sprint 관련 action 식별이 standard enum 으로 정합.

### Job Story 8 — bkit 사용자 (control level 확인)
- **When** 사용자가 `/control status` 입력 시,
- **I want to** lib/control/automation-controller.js 에 등록된 SPRINT_AUTORUN_SCOPE 표시 (Trust Level 별 stopAfter)
- **so I can** 자신의 trust level 에서 sprint auto-run 이 어디까지 진행되는지 사전 확인.

### Job Story 9 — Sprint 4 후속 Sprint 5 작업자
- **When** Sprint 5 user guide 작성 시,
- **I want to** 본 Sprint 4 의 15 sub-action + 4 agent 사양 + 7 template 위치 명확
- **so I can** README / CLAUDE.md / migration guide 작성 시 본 Sprint 4 가 single source of truth.

### Job Story 10 — bkit 사용자 (★ user-mandated cross-sprint 유기적 동작)
- **When** 사용자가 단일 `/sprint start my-launch --trust L3` 명령 입력 시 (★ 사용자 명시 2 핵심),
- **I want to** Sprint 4 skill handler → Sprint 3 createSprintInfra → Sprint 2 startSprint → Sprint 1 createSprint 자동 chain → 디스크 영구화 + 7 events + audit log
- **so I can** 4 sprint 결과물이 단일 사용자 경로로 organic 통합 동작 (사용자 명시 검증 완료).

---

## 3. User Personas

### Persona A: bkit 사용자 (Sprint End-user, ★ 본 Sprint 4 결정적 표면)
- **목표**: 15 sub-action 사용 (init / start / status / watch / phase / iterate / qa / report / archive / list / feature / pause / resume / fork / help).
- **요구사항**:
  - 8개국어 트리거 키워드 (모국어 입력)
  - 단일 명령으로 4 sprint 통합 동작
  - audit trail + OTEL 자동
  - Trust Level 별 scope 사전 확인 (`/control status`)

### Persona B: 8개국어 사용자
- **목표**: EN/KO/JA/ZH/ES/FR/DE/IT 중 하나의 모국어로 sprint 운영.
- **요구사항**: skill/agent frontmatter `triggers:` 모국어 키워드 풀세트.

### Persona C: bkit core CI / agent-auditor
- **목표**: skill frontmatter validator (B1-133) Exit 0 + plugin validate Exit 0 + Sprint 1/2/3 invariant 0 변경.
- **요구사항**:
  - 4 agents/sprint-*.md frontmatter B1-133 일치 (description 250자 미만 sanity)
  - hooks/hooks.json 21 events 24 blocks invariant 유지 (Sprint 4 신규 hook 0)

### Persona D: Sprint 5 후속 작업자
- **목표**: 본 Sprint 4 산출물을 single source of truth 로 user guide + README 작성.
- **요구사항**: skill SKILL.md + PHASES.md + 4 agent body + 3 examples 자체 완결성.

---

## 4. Solution Overview

### 4.1 12+ files 구조

```
skills/sprint/                                # 신규 디렉터리
├── SKILL.md                                  # ★ frontmatter 8개국어 triggers + 영어 body
├── PHASES.md                                 # 영어 참조 문서
└── examples/
    ├── basic-sprint.md                       # 영어 예제
    ├── multi-feature-sprint.md
    └── archive-and-carry.md

agents/                                       # 4 신규
├── sprint-orchestrator.md                    # ★ frontmatter 8개국어 triggers + 영어 body
├── sprint-master-planner.md                  # ★
├── sprint-qa-flow.md                         # ★
└── sprint-report-writer.md                   # ★

templates/sprint/                             # 신규 디렉터리 — 한국어 (사용자 docs 생성용)
├── master-plan.template.md
├── prd.template.md
├── plan.template.md
├── design.template.md
├── iterate.template.md
├── qa.template.md
└── report.template.md

scripts/                                      # 1 신규
└── sprint-handler.js                         # 영어, skill action dispatcher

lib/control/                                  # 1 확장
└── automation-controller.js                  # SPRINT_AUTORUN_SCOPE 추가

lib/audit/                                    # 1 확장
└── audit-logger.js                           # ACTION_TYPES enum 16 → 18
```

**Total**: 신규 13 files (1 skill + 1 phases + 3 examples + 4 agents + 7 templates - 3 examples count) — 정정: **신규 14 files** (5 in skills/ + 4 agents + 7 templates + 1 script + 0 lib new + 2 lib extensions). 명세상 ~16 files.

### 4.2 skills/sprint/SKILL.md frontmatter (★ 8개국어 triggers 결정적)

```yaml
---
name: sprint
classification: workflow
classification-reason: Sprint orchestration independent of model capability
deprecation-risk: none
effort: medium
description: |
  Sprint Management — generic sprint capability for ANY bkit user.
  15 sub-actions: init, start, status, watch, phase, iterate, qa, report, archive, list, feature, pause, resume, fork, help.
  Triggers: sprint, sprint start, sprint init, sprint status, sprint list,
  스프린트, 스프린트 시작, 스프린트 상태,
  スプリント, スプリント開始, スプリント状態,
  冲刺, 冲刺开始, 冲刺状态,
  sprint, iniciar sprint, estado sprint,
  sprint, demarrer sprint, statut sprint,
  Sprint, Sprint starten, Sprint Status,
  sprint, avviare sprint, stato sprint.
argument-hint: "[action] [name] [--trust L0-L4] [--from <phase>]"
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
agents:
  orchestrate: bkit:sprint-orchestrator
  plan: bkit:sprint-master-planner
  qa: bkit:sprint-qa-flow
  report: bkit:sprint-report-writer
imports: []
next-skill: null
pdca-phase: null
task-template: "[Sprint] {action} {name}"
---

# Sprint Skill — Generic Sprint Management for bkit Users

... (영어 body)
```

### 4.3 agents/sprint-orchestrator.md frontmatter (★ 8개국어 triggers)

```yaml
---
name: sprint-orchestrator
description: |
  Sprint orchestration specialist. Coordinates the full sprint lifecycle:
  PRD/Plan → Design → Do → Iterate → QA → Report → Archive across Sprint 1/2/3.
  Sequential dispatch (ENH-292) when spawning specialists.

  Use proactively when user invokes /sprint start with auto-run enabled
  or when sprint phase transition needs coordinated multi-agent work.

  Triggers: sprint, sprint orchestrator, sprint coordination, sprint lifecycle,
  스프린트, 스프린트 조율, 스프린트 진행,
  スプリント, スプリント調整, スプリント進行,
  冲刺, 冲刺协调, 冲刺进行,
  sprint, coordinacion sprint, ciclo sprint,
  sprint, coordination sprint, cycle sprint,
  Sprint, Sprint-Koordination, Sprint-Zyklus,
  sprint, coordinamento sprint, ciclo sprint

  Do NOT use for: single-feature PDCA (use bkit:pdca), Starter level projects,
  or when Sprint Management is not activated.
model: opus
effort: high
maxTurns: 30
memory: project
---

... (영어 body)
```

### 4.4 scripts/sprint-handler.js — skill action dispatcher

```javascript
// scripts/sprint-handler.js
// English only — orchestrates Sprint 1 + 2 + 3 + 4 from user command.
'use strict';
const path = require('node:path');
const { createSprintInfra } = require('../lib/infra/sprint');
const lifecycle = require('../lib/application/sprint-lifecycle');
const domain = require('../lib/domain/sprint');

async function handleSprintAction(action, args) {
  const projectRoot = process.cwd();
  const infra = createSprintInfra({
    projectRoot,
    otelEndpoint: process.env.OTEL_ENDPOINT,
    otelServiceName: process.env.OTEL_SERVICE_NAME,
    agentId: process.env.CLAUDE_AGENT_ID,
    parentAgentId: process.env.CLAUDE_PARENT_AGENT_ID,
  });

  switch (action) {
    case 'init':   return handleInit(args, infra);
    case 'start':  return handleStart(args, infra);
    case 'status': return handleStatus(args, infra);
    case 'list':   return handleList(args, infra);
    case 'phase':  return handlePhase(args, infra);
    case 'iterate':return handleIterate(args, infra);
    case 'qa':     return handleQA(args, infra);
    case 'report': return handleReport(args, infra);
    case 'archive':return handleArchive(args, infra);
    case 'pause':  return handlePause(args, infra);
    case 'resume': return handleResume(args, infra);
    case 'fork':   return handleFork(args, infra);
    case 'feature':return handleFeature(args, infra);
    case 'watch':  return handleWatch(args, infra);
    case 'help':   return handleHelp();
    default:       return { ok: false, error: `Unknown action: ${action}` };
  }
}

async function handleStart({ id, name, trustLevel = 'L3', features = [], context = {} }, infra) {
  const result = await lifecycle.startSprint({
    id, name, trustLevel,
    context: { WHY: '', WHO: '', RISK: '', SUCCESS: '', SCOPE: '', ...context },
    features,
  }, {
    stateStore: infra.stateStore,
    eventEmitter: infra.eventEmitter.emit,
    // gateEvaluator / autoPauseChecker / phaseHandlers — Sprint 2 defaults
    // gapDetector / autoFixer / dataFlowValidator — placeholder for Sprint 5
  });
  return result;
}

// ... (other handlers)

module.exports = { handleSprintAction };
```

### 4.5 Cross-Sprint 통합 데이터 흐름 (★ 사용자 명시 2)

```
사용자 → /sprint start my-launch --trust L3 (Sprint 4 skill)
              │
              ▼
   skills/sprint/SKILL.md handler 진입
              │
              ▼
   scripts/sprint-handler.js handleSprintAction('start', args)
              │
              ▼
   Sprint 3: createSprintInfra({projectRoot}) → 4 adapter
              │
              ▼
   Sprint 2: lifecycle.startSprint(input, deps)
              │
              ▼
   ┌──────────┴──────────────────────────────────────┐
   │ Sprint 2 orchestrator:                          │
   │   1) Sprint 1: createSprint(input)              │
   │   2) Sprint 3: stateStore.save → disk           │
   │   3) Sprint 3: eventEmitter(SprintCreated)      │
   │      → audit-log + OTEL                         │
   │   4) auto-run loop (Trust L3 → 'report')        │
   │      - advancePhase per phase                   │
   │      - iterateSprint (matchRate 100%)           │
   │      - verifyDataFlow per feature (7-Layer)     │
   │      - generateReport                           │
   │      - (L4 only: archiveSprint)                 │
   │   5) Final: stateStore.save + final event       │
   └─────────────────────────────────────────────────┘
              │
              ▼
   결과: Sprint 4 사용자 단일 명령 → Sprint 1+2+3 자율 동작 + 디스크 영구화 ★
```

### 4.6 templates/sprint/*.template.md (★ 한국어 예외, 사용자 docs 생성용)

각 template 는 변수 치환 (`{feature}`, `{date}`, `{author}`, ...) 으로 docs/01-plan/features/{id}.prd.md 등 생성. 본 Sprint 4 의 docs 자체가 본 template 의 첫 사용 사례.

### 4.7 lib/control/automation-controller.js SPRINT_AUTORUN_SCOPE 통합

```javascript
// lib/control/automation-controller.js (확장)
const SPRINT_AUTORUN_SCOPE = Object.freeze({
  L0: Object.freeze({ stopAfter: 'prd',      manual: true,  requireApproval: true,  hint: false }),
  L1: Object.freeze({ stopAfter: 'prd',      manual: true,  requireApproval: true,  hint: true  }),
  L2: Object.freeze({ stopAfter: 'design',   manual: false, requireApproval: true,  hint: false }),
  L3: Object.freeze({ stopAfter: 'report',   manual: false, requireApproval: true,  hint: false }),
  L4: Object.freeze({ stopAfter: 'archived', manual: false, requireApproval: false, hint: false }),
});

// Existing exports retained (Sprint 2 invariant 0 변경)
module.exports = {
  ... existing ...,
  SPRINT_AUTORUN_SCOPE,
};
```

### 4.8 lib/audit/audit-logger.js ACTION_TYPES enum 확장

```javascript
const ACTION_TYPES = [
  'phase_transition', 'feature_created', 'feature_archived',
  'file_created', 'file_modified', 'file_deleted',
  'config_changed', 'automation_level_changed', 'checkpoint_created',
  'rollback_executed', 'agent_spawned', 'agent_completed', 'agent_failed',
  'gate_passed', 'gate_failed', 'destructive_blocked',
  'sprint_paused',    // ★ Sprint 4 신규
  'sprint_resumed',   // ★ Sprint 4 신규
];
```

### 4.9 ENH-292 Sequential Dispatch (sprint-orchestrator agent body)

```markdown
## Sequential Dispatch (ENH-292 Self-Application)

When spawning specialists, NEVER use Promise.all. Sequential only:

1. Task({subagent_type: 'sprint-master-planner', ...}) — wait for completion
2. Task({subagent_type: 'sprint-qa-flow', ...}) — wait for completion
3. Task({subagent_type: 'sprint-report-writer', ...}) — wait for completion
```

---

## 5. Success Metrics

### 5.1 정량 메트릭

| Metric | Target | 측정 방법 |
|--------|--------|----------|
| Files created | 14+ | file existence |
| LOC estimate | ~1,500~1,800 | wc -l |
| ★ 8개국어 triggers (skill + 4 agents) | 5/5 모두 EN/KO/JA/ZH/ES/FR/DE/IT 풀세트 | regex parser TC |
| ★ Code English-only (skill body + agents body + scripts) | 한글 0건 | grep TC |
| Templates Korean (예외) | 7/7 한국어 | manual review |
| skill frontmatter B1-133 validator | description < 250자 | length check |
| `claude plugin validate .` | Exit 0 (F9-120 closure 10-cycle) | claude command |
| Sprint 1 invariant | 0 변경 | git diff |
| Sprint 2 invariant | 0 변경 | git diff |
| Sprint 3 invariant | 0 변경 | git diff |
| PDCA 9-phase invariant | 0 변경 | git diff |
| Domain Purity (16 files) | 0 forbidden | check-domain-purity.js |
| audit-logger ACTION_TYPES enum | 16 → 18 (2 신규) | grep |
| automation-controller SPRINT_AUTORUN_SCOPE | 1 신규 export | grep |
| hooks/hooks.json invariant | 21 events 24 blocks | jq count |
| L2 + L3 TC pass | 30+ TCs 100% | node test runner |
| ★ Cross-Sprint Integration TC (Sprint 4-anchored) | 8+ TCs 100% | node test runner |
| Sprint 1 L1 40 + Sprint 2 L2 79 + Sprint 3 L2 76 (regression) | 195/195 PASS | re-run |

### 5.2 정성 메트릭

- skill SKILL.md frontmatter 가 bkit:pdca / bkit:control 패턴 정합
- 4 agents frontmatter 가 cto-lead / qa-lead 패턴 정합
- 7 templates 가 기존 templates/plan.template.md 등 패턴 정합 (Frontmatter `template:` + `variables:`)
- sprint-handler.js 가 단일 entry point 패턴 (handleSprintAction)
- audit-logger / automation-controller 확장 minimal — invariant 보존

---

## 6. Out-of-scope (Sprint 4 명시 제외)

| 항목 | Sprint |
|------|--------|
| Sprint user guide / migration guide / README update | Sprint 5 |
| BKIT_VERSION bump (5-loc sync) | Sprint 6 |
| ADR 0007/0008/0009 Proposed → Accepted | Sprint 6 |
| L4 E2E + L5 Performance tests | Sprint 5 |
| Real gap-detector / auto-fixer / chrome-qa adapter wiring | Sprint 5 |
| test/contract/ tracked tests | Sprint 5 |
| `/sprint watch` Live dashboard 30-tick loop 실 구현 (skill action 명세만) | Sprint 5 |
| Master Plan v1.2 LOC reconciliation | Sprint 5 |
| ENH-303 PostToolUse continueOnBlock 통합 | 5/13 review 후 |
| ENH-286 Memory Enforcer master plan 보호 | Sprint 5 |
| ENH-289 Defense Layer 6 audit + alarm + auto-rollback | 5/13 review 후 |
| `/sprint fork` 실 구현 (skill action 명세만) | Sprint 5 |
| Sprint 2 start-sprint.usecase SPRINT_AUTORUN_SCOPE 제거 (lib/control 으로 fully 이동) | v2.1.14 (Sprint 2 invariant 깨짐 OK 시점) |

### 6.1 ★ 사용자 명시 1 (8개국어 트리거 + 영어 코드) — 본 Sprint 결정적 적용

**검증 매트릭스** (Phase 6 QA TC):
- skills/sprint/SKILL.md frontmatter `triggers:` 8개국어 풀세트 ✓
- 4 agents/sprint-*.md frontmatter `description:` Triggers 8개국어 풀세트 ✓
- skill body / agents body / scripts/sprint-handler.js 한글 0건 ✓
- templates/sprint/*.template.md 한국어 OK (사용자 명시 `@docs 예외`)
- lib/control + lib/audit 확장부분 한글 0건 ✓

### 6.2 ★ 사용자 명시 2 (cross-sprint 유기적 상호 연동) — 본 Sprint 결정적 입증

**검증 매트릭스** (TC L2-CSI-04-01 ~ L2-CSI-04-08, 8+ TCs):
- CSI-04-01: skill 'start' action → Sprint 3 createSprintInfra → Sprint 2 startSprint → Sprint 1 createSprint → 디스크 영구화 + 7 events
- CSI-04-02: skill 'list' → Sprint 3 stateStore.list + docScanner.findAllSprints union
- CSI-04-03: skill 'status' → Sprint 3 stateStore.load + render
- CSI-04-04: skill 'pause' → Sprint 2 pauseSprint + Sprint 3 audit log
- CSI-04-05: skill 'resume' → Sprint 2 resumeSprint + Sprint 3 audit log
- CSI-04-06: skill 'archive' → Sprint 2 archiveSprint + Sprint 3 stateStore status='archived'
- CSI-04-07: agent sprint-orchestrator → Sprint 4 skill 호출 → 4-layer 통합
- CSI-04-08: audit-logger ACTION_TYPES 'sprint_paused' enum 통합 검증

---

## 7. Stakeholder Map

| Stakeholder | Role | Sprint 4 영향 |
|------------|------|--------------|
| **kay kim** | Decision maker | 모든 phase 진행 |
| **Sprint 1 Domain (immutable)** | Foundation | 0 변경 |
| **Sprint 2 Application (immutable)** | Orchestrator | 0 변경 |
| **Sprint 3 Infrastructure (immutable)** | Adapter | 0 변경 |
| **Sprint 5 사용자 가이드 작성자** | Future consumer | 본 Sprint 4 사양을 SoT 로 작성 |
| **`lib/control/automation-controller.js`** | Existing | +SPRINT_AUTORUN_SCOPE export |
| **`lib/audit/audit-logger.js`** | Existing | +2 ACTION_TYPES |
| **`hooks/hooks.json`** | 21 events invariant | 0 변경 (Master Plan 명시) |
| **CC plugin frontmatter validator (B1-133)** | CI gate | skill description < 250자 |
| **bkit 8개국어 사용자** | End-user | ★ frontmatter triggers 풀세트 |
| **OTEL collector / audit-logger** | Defense Layer 3 | sprint_paused/resumed enum 등록 |

---

## 8. Pre-mortem (실패 시나리오 + 사전 방지)

### Scenario A: ★ 8개국어 트리거 누락 → 사용자 명시 1 위반
- **영향**: 한국어/일본어/스페인어 등 모국어 사용자가 sprint 활성화 불가
- **방지**:
  - PRD §1.2 + §4.2 + §4.3 8개국어 풀세트 명시
  - Phase 6 QA TC TRIG-01~05 (skill + 4 agents 모두 regex parse)
  - 8개국어 reference: cto-lead.md / qa-lead.md 기존 패턴 정합

### Scenario B: 코드 한글 mixed → 사용자 명시 1 위반
- **영향**: 사용자 명시 위반 + skill/agent body 가 international scope 깨짐
- **방지**:
  - skill body / agent body 작성 시 영어 일관
  - Phase 6 QA TC ENG-01 grep [ㄱ-ㆎ가-힣] 0건
  - templates/sprint/ 한국어 OK (사용자 명시 docs 예외)

### Scenario C: ★ Sprint 1+2+3+4 단절 → 사용자 명시 2 위반
- **영향**: 사용자 단일 명령으로 4-layer 자율 진행 불가
- **방지**:
  - Phase 6 QA TC CSI-04-01~08 (Sprint 4-anchored cross-sprint, 본 Sprint Sprint 3 의 10 CSI 확장)
  - sprint-handler.js 가 createSprintInfra → startSprint chain 명시
  - Cross-Sprint Integration L3 test 신설

### Scenario D: claude plugin validate Exit 1 (F9-120 closure 깨짐)
- **영향**: F9-120 closure 9-cycle 연속 PASS 무너짐
- **방지**:
  - skill SKILL.md + 4 agents frontmatter YAML 정합 사전 검증
  - `claude plugin validate .` Phase 6 QA 실행

### Scenario E: skill frontmatter validator (B1-133, v2.1.133+) regression
- **영향**: skill description 250자 초과 시 silent drop
- **방지**:
  - description 200자 이하 작성 (PRD §4.2 sample 적용)
  - Phase 6 QA TC DESC-01 (length check)

### Scenario F: Sprint 1/2/3 invariant 깨짐
- **영향**: 누적 무결성 깨짐 + 누적 185 TCs regression
- **방지**:
  - 본 Sprint 4 는 lib/control + lib/audit 만 확장 (Sprint 1/2/3 코드 미수정)
  - Phase 6 QA git diff 검증

### Scenario G: audit-logger ACTION_TYPES enum 확장 회귀
- **영향**: 기존 16 entry 회귀 + Sprint 3 telemetry passthrough 깨짐
- **방지**:
  - 단순 array push (기존 entry 변경 0)
  - Phase 6 QA TC enum 16 → 18 검증 + Sprint 3 telemetry T-01~T-09 재실행

### Scenario H: lib/control/automation-controller.js SPRINT_AUTORUN_SCOPE 추가 회귀
- **영향**: 기존 L0~L4 PDCA scope 영향
- **방지**:
  - export 추가만 (기존 export 변경 0)
  - Phase 6 QA Sprint 2 79 TCs regression

### Scenario I: hooks/hooks.json 21 events 24 blocks 변경 (Master Plan 명시 위반)
- **영향**: hook event 신규 추가 → CC version 회귀 risk (F15-122)
- **방지**:
  - 본 Sprint 4 는 hooks.json 변경 0 (Master Plan §3.6 명시)
  - Phase 6 QA jq count 검증

### Scenario J: L4 모드 자율 진행 중 검증 단계 abbreviation
- **영향**: 꼼꼼하지 않은 구현 → 사용자 명시 ("빠르게가 아닌 꼼꼼하고 완벽하게") 위반
- **방지**:
  - Design 단계 코드베이스 깊이 분석 완수
  - Test Plan Matrix 30+ TCs pre-scoped (skill + 8개국어 + cross-sprint)

---

## 9. Sprint 4 Phase 흐름 (자체 PDCA 7-phase)

| Phase | Status | 산출물 | 소요 |
|-------|--------|--------|------|
| PRD | ✅ 본 문서 | `docs/01-plan/features/v2113-sprint-4-presentation.prd.md` | (완료) |
| Plan | ⏳ | `docs/01-plan/features/v2113-sprint-4-presentation.plan.md` | 25분 |
| Design | ⏳ | `docs/02-design/features/v2113-sprint-4-presentation.design.md` (★ 코드베이스 분석 + 8개국어 + cross-sprint integration spec) | 45분 |
| Do | ⏳ | 14+ files 구현 (~1,500-1,800 LOC) | 80-100분 |
| Iterate | ⏳ | matchRate 100% + cross-sprint TC | 30-45분 |
| QA | ⏳ | --plugin-dir . 30+ TC + ★ 8개국어 검증 + ★ cross-sprint 검증 | 30-45분 |
| Report | ⏳ | 종합 보고서 + 8개국어 + cross-sprint 결과 | 15-20분 |

**총 소요 estimate**: 4-5시간 (Sprint 3 의 2.75h 대비 약간 더 — files 수 증가 + 8개국어 검증 부담)

---

## 10. PRD 완료 Checklist

- [x] Context Anchor 5건 (사용자 명시 2건 결정적 보존)
- [x] Problem Statement 6건 (사용자 surface 부재 + 8개국어 + cross-sprint + Defense Layer + audit + control)
- [x] Job Stories 10건 (사용자 × 5 + 8개국어 + Sprint 5 + audit + control + ★ cross-sprint 유기적)
- [x] User Personas 4건
- [x] Solution Overview (14 files + frontmatter 패턴 + Cross-Sprint 데이터 흐름 + control/audit 확장)
- [x] Success Metrics 정량 18건 + 정성 5건
- [x] Out-of-scope 매트릭스 + 사용자 명시 1/2 결정적 적용 명시
- [x] Stakeholder Map 11건
- [x] Pre-mortem 10 시나리오 (사용자 명시 1/2 회귀 명시)

---

**Next Phase**: Phase 2 Plan — Requirements R1-R10 + Out-of-scope + Feature Breakdown + Quality Gates + Risks + Document Index + Implementation Order + ★ 8개국어 triggers spec + ★ Cross-Sprint Integration spec.
