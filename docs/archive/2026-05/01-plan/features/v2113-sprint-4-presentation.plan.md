# Sprint 4 Plan — v2.1.13 Sprint Management Presentation

> **Sprint ID**: `v2113-sprint-4-presentation`
> **Phase**: Plan (2/7)
> **Date**: 2026-05-12
> **PRD Reference**: `docs/01-plan/features/v2113-sprint-4-presentation.prd.md`
> **Master Plan**: v1.1 §3.6
> **Depends on**: Sprint 1 (a7009a5) + Sprint 2 (97e48b1) + Sprint 3 (232c1a6) — invariant

---

## 0. Context Anchor (PRD §0, 보존)

| Key | Value |
|-----|-------|
| WHY | 사용자 표면 layer 영구화 + ★ 8개국어 트리거 결정적 적용 + ★ Sprint 1+2+3+4 4-layer 유기적 상호 연동 |
| WHO | bkit 사용자 / 8개국어 사용자 / Sprint 5 / CI / audit-logger / control |
| RISK | 8개국어 누락 / 코드 한글 / cross-sprint 단절 / plugin validate fail / B1-133 regression / Sprint 1/2/3 invariant 깨짐 / audit enum / control / hooks 21 events / L4 abbreviation |
| SUCCESS | 14+ files + 5/5 8개국어 + 영어 코드 0 한글 + 7 templates 한국어 OK + plugin validate Exit 0 + Sprint 1/2/3 invariant 0 변경 + L2+L3 30+ + 8+ CSI-04 100% PASS |
| SCOPE | In: skills/sprint/ 5 + agents 4 + templates 7 + script 1 + lib/control + lib/audit 확장 2 = ~16 files. Out: Sprint 5~6 |

---

## 1. Requirements

### 1.1 In-scope (반드시 구현)

#### R1. `skills/sprint/SKILL.md` ★

**Frontmatter (YAML, 영어, 8개국어 triggers)**:
```yaml
name: sprint
classification: workflow
classification-reason: Sprint orchestration independent of model capability evolution
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
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion]
agents:
  orchestrate: bkit:sprint-orchestrator
  plan: bkit:sprint-master-planner
  qa: bkit:sprint-qa-flow
  report: bkit:sprint-report-writer
```

**Body (영어)**: 15 sub-action 사용법 + Cross-Sprint 통합 흐름.

**B1-133 validator**: description 250자 미만 확보 (frontmatter description 약 200자).

#### R2. `skills/sprint/PHASES.md`
**영어 참조 문서**. Sprint 8-phase 설명 + Trust Level scope 표.

#### R3-R5. `skills/sprint/examples/{basic-sprint,multi-feature-sprint,archive-and-carry}.md`
**영어 예제 3건**. 각 50~100 LOC.

#### R6. `agents/sprint-orchestrator.md` ★

**Frontmatter (8개국어 triggers in description)**:
```yaml
name: sprint-orchestrator
description: |
  Sprint orchestration specialist. Coordinates the full sprint lifecycle.
  Use proactively when /sprint start auto-run enabled or phase transition.
  Triggers: sprint, sprint orchestrator, sprint coordination,
  스프린트, 스프린트 조율, 스프린트 진행,
  スプリント, スプリント調整, スプリント進行,
  冲刺, 冲刺协调, 冲刺进行,
  sprint, coordinacion sprint, ciclo sprint,
  sprint, coordination sprint, cycle sprint,
  Sprint, Sprint-Koordination, Sprint-Zyklus,
  sprint, coordinamento sprint, ciclo sprint
  Do NOT use for: single-feature PDCA (use bkit:pdca).
model: opus
effort: high
maxTurns: 30
memory: project
```

**Body (영어)**: ENH-292 sequential dispatch + Task spawn pattern.

#### R7. `agents/sprint-master-planner.md` ★
**Frontmatter (8개국어 triggers + description)** + body. Specialist for PRD/Plan/Design generation.

#### R8. `agents/sprint-qa-flow.md` ★
**Frontmatter (8개국어 triggers)** + body. 7-Layer S1 검증 specialist.

#### R9. `agents/sprint-report-writer.md` ★
**Frontmatter (8개국어 triggers)** + body. KPI + carry items report generation.

#### R10. `templates/sprint/*.template.md` (7 files, 한국어)
- `master-plan.template.md` (메인)
- `prd.template.md`
- `plan.template.md`
- `design.template.md`
- `iterate.template.md`
- `qa.template.md`
- `report.template.md`

각 frontmatter `template:`, `version:`, `description:`, `variables:` 일치 (templates/plan.template.md 패턴).

#### R11. `scripts/sprint-handler.js` (영어, ~250 LOC)

**Exports**:
- `handleSprintAction(action, args)` — main dispatcher
- 15 handler functions (handleInit, handleStart, handleStatus, ...)

**Behavior**:
- `createSprintInfra({ projectRoot, otelEndpoint, agentId })` (Sprint 3)
- `lifecycle.startSprint(input, deps)` (Sprint 2 with Sprint 3 adapter inject)
- 15 sub-action 분기

#### R12. `lib/control/automation-controller.js` 확장

**Add**: `SPRINT_AUTORUN_SCOPE` Object.freeze (mirror of Sprint 2 start-sprint.usecase inline).

**Export**: Push to existing `module.exports`.

**Sprint 2 invariant 보존**: lib/application/sprint-lifecycle/ 0 변경.

#### R13. `lib/audit/audit-logger.js` ACTION_TYPES enum 확장

**Change**: ACTION_TYPES array push 2 entries:
- `sprint_paused`
- `sprint_resumed`

**Sprint 1/2/3 invariant 보존**: 다른 코드 0 변경.

### 1.2 Out-of-scope (Sprint 4 명시 제외)

- Sprint user guide / README / CLAUDE.md update — Sprint 5
- BKIT_VERSION bump (5-loc sync) — Sprint 6
- ADR 0007/0008/0009 Accepted — Sprint 6
- L4/L5 perf tests — Sprint 5
- Real gap-detector / auto-fixer / chrome-qa wiring — Sprint 5
- test/contract/ tracked — Sprint 5
- `/sprint watch` Live dashboard 실 구현 — Sprint 5 (skill action 명세만 본 Sprint)
- `/sprint fork` 실 구현 — Sprint 5
- Master Plan v1.2 LOC 정정 — Sprint 5
- ENH-303 PostToolUse continueOnBlock — 5/13 review 후
- ENH-286 Memory Enforcer — Sprint 5
- ENH-289 Defense Layer 6 — 5/13 review 후
- Sprint 2 start-sprint.usecase SPRINT_AUTORUN_SCOPE inline 제거 — v2.1.14
- hooks/hooks.json 변경 — 본 Sprint 0 변경 (Master Plan 명시)

---

## 2. Feature Breakdown

| # | File | Type | LOC est. | Language |
|---|------|------|---------|---------|
| 1 | `skills/sprint/SKILL.md` | Skill (★ frontmatter + body) | ~280 | English |
| 2 | `skills/sprint/PHASES.md` | Reference doc | ~120 | English |
| 3 | `skills/sprint/examples/basic-sprint.md` | Example | ~80 | English |
| 4 | `skills/sprint/examples/multi-feature-sprint.md` | Example | ~100 | English |
| 5 | `skills/sprint/examples/archive-and-carry.md` | Example | ~90 | English |
| 6 | `agents/sprint-orchestrator.md` | Agent ★ | ~140 | English |
| 7 | `agents/sprint-master-planner.md` | Agent ★ | ~120 | English |
| 8 | `agents/sprint-qa-flow.md` | Agent ★ | ~130 | English |
| 9 | `agents/sprint-report-writer.md` | Agent ★ | ~120 | English |
| 10 | `templates/sprint/master-plan.template.md` | Template | ~140 | **Korean** |
| 11 | `templates/sprint/prd.template.md` | Template | ~100 | **Korean** |
| 12 | `templates/sprint/plan.template.md` | Template | ~90 | **Korean** |
| 13 | `templates/sprint/design.template.md` | Template | ~110 | **Korean** |
| 14 | `templates/sprint/iterate.template.md` | Template | ~70 | **Korean** |
| 15 | `templates/sprint/qa.template.md` | Template | ~85 | **Korean** |
| 16 | `templates/sprint/report.template.md` | Template | ~85 | **Korean** |
| 17 | `scripts/sprint-handler.js` | Script (★ dispatcher) | ~260 | English |
| 18 | `lib/control/automation-controller.js` (확장) | Lib extension | +20 | English |
| 19 | `lib/audit/audit-logger.js` (확장) | Lib extension | +2 | English |
| **합계** | 19 changes (17 new + 2 extension) | | **~2,055 LOC net new** | |

---

## 3. Quality Gates (Sprint 4 활성)

| Gate | Threshold | Phase | 측정 |
|------|----------|-------|------|
| M2 codeQualityScore | ≥80 | Do/QA | code-analyzer |
| M3 criticalIssueCount | 0 | Do/QA | code-analyzer |
| M4 apiComplianceRate | ≥95 | Design/QA | handler signature match |
| M5 runtimeErrorRate | ≤1 | QA | TC execution |
| M7 conventionCompliance | ≥90 | Do/QA | ESLint + frontmatter validator |
| M8 designCompleteness | ≥85 | Design | doc structure |
| M1 matchRate | ≥90 (100 목표) | Iterate | manual + grep |
| S2 featureCompletion | 100 (19/19 changes) | Iterate/QA | file existence |
| Sprint 1 invariant | 0 변경 | Do/QA | git diff |
| Sprint 2 invariant | 0 변경 | Do/QA | git diff |
| Sprint 3 invariant | 0 변경 | Do/QA | git diff |
| PDCA invariant | 0 변경 | Do/QA | git diff |
| Domain Purity (16 files) | 0 forbidden | Do/QA | check-domain-purity.js |
| **★ 8개국어 triggers (5 frontmatters)** | 5/5 모두 EN/KO/JA/ZH/ES/FR/DE/IT 풀세트 | QA | regex parser TC |
| **★ Code English-only (skill + 4 agents body + sprint-handler.js)** | 한글 0건 | QA | grep TC `[ㄱ-ㆎ가-힣]` |
| Templates Korean (예외 OK) | 7/7 한국어 | QA | manual review |
| skill frontmatter B1-133 validator | description < 250 chars | QA | length check |
| `claude plugin validate .` | Exit 0 (F9-120 10-cycle) | QA | claude command |
| audit-logger ACTION_TYPES | 16 → 18 | QA | grep |
| automation-controller SPRINT_AUTORUN_SCOPE | 1 신규 export | QA | grep |
| hooks/hooks.json 21 events 24 blocks | invariant | QA | jq count |
| L2 + L3 TC pass | 30+/100% | QA | node test runner |
| **★ Cross-Sprint (Sprint 4-anchored) TC** | **8+/100%** | QA | node test runner |
| Sprint 1+2+3 regression (40 + 79 + 76 = 195) | 195/195 PASS | QA | re-run |

---

## 4. Risks & Mitigation

### 4.1 PRD §8 Pre-mortem 매핑

| PRD Risk | Sprint 4 phase-specific 대응 |
|----------|---------------------------|
| A. 8개국어 누락 | Design §X 5 frontmatter 8개국어 풀세트 명시 + Phase 6 QA TC TRIG-01~05 |
| B. 코드 한글 mixed | Phase 6 QA TC ENG-01 grep |
| C. Cross-sprint 단절 | Design §X cross-sprint data flow + sprint-handler.js 명시 + Phase 6 QA CSI-04-01~08 |
| D. plugin validate Exit 1 | YAML 정합 + Phase 6 QA `claude plugin validate .` |
| E. B1-133 validator regression | description 200자 미만 + Phase 6 QA length check |
| F. Sprint 1/2/3 invariant 깨짐 | lib/control + lib/audit 만 확장 + Phase 6 QA git diff |
| G. audit-logger enum 회귀 | array push 만 + Phase 6 QA Sprint 3 telemetry T-01~T-09 재실행 |
| H. automation-controller 회귀 | export 추가만 + Phase 6 QA Sprint 2 79 TCs 재실행 |
| I. hooks.json 21 events 변경 | 본 Sprint 0 변경 + Phase 6 QA jq count |
| J. L4 abbreviation | Design 코드베이스 깊이 분석 + Plan TC pre-scope |

### 4.2 Sprint 4 phase-specific risks

| Risk | Likelihood | Severity | Mitigation |
|------|:---------:|:--------:|-----------|
| R1 skill 'sprint' name 충돌 (기존 skills/sprint/) | LOW | HIGH | `ls skills/` 사전 확인 (실측 sprint/ 부재 — PASS) |
| R2 agent 'sprint-*' name 충돌 | LOW | HIGH | `ls agents/sprint-*.md` 사전 확인 |
| R3 templates/ frontmatter 충돌 (`templates/sprint/` 부재) | LOW | LOW | 신규 디렉터리 — 충돌 0 |
| R4 sprint-handler.js Sprint 3 adapter inject 불완전 | MEDIUM | HIGH | Plan §X handler signature 명세 + Phase 4 Do checklist |
| R5 8개국어 키워드 다양성 부족 (예: ES 2개만) | MEDIUM | LOW | 기존 cto-lead / qa-lead 패턴 (3+ 키워드/언어) 정합 |
| R6 4 agents body 가 사용자 ENG 페어링 시 한글 오타 | LOW | MEDIUM | Do 직후 grep 검증 |
| R7 LOC 초과 (~2,055 vs estimate) | MEDIUM | LOW | Master Plan v1.2 정정 |
| R8 sprint-handler.js mock-only (Sprint 5 wiring 의존) | MEDIUM | LOW | 본 Sprint 4 는 placeholder OK — Sprint 5 real adapter 약속 |
| R9 hooks.json 신규 hook 추가 검토 압박 | LOW | LOW | Master Plan §3.6 명시 — 본 Sprint 0 변경 강제 |
| R10 audit-logger ACTION_TYPES enum 확장이 audit-logger TC 회귀 | LOW | MEDIUM | 단순 array push + 기존 entry 0 변경 |

---

## 5. Document Index (Sprint 4 산출물)

| Phase | Document | Path | Status |
|-------|----------|------|--------|
| PRD | Sprint 4 PRD | `docs/01-plan/features/v2113-sprint-4-presentation.prd.md` | ✅ |
| Plan | 본 문서 | `docs/01-plan/features/v2113-sprint-4-presentation.plan.md` | ✅ (작성 중) |
| Design | Sprint 4 Design | `docs/02-design/features/v2113-sprint-4-presentation.design.md` | ⏳ |
| Iterate | Sprint 4 Iterate | `docs/03-analysis/features/v2113-sprint-4-presentation.iterate.md` | ⏳ |
| QA | Sprint 4 QA Report | `docs/05-qa/features/v2113-sprint-4-presentation.qa-report.md` | ⏳ |
| Report | Sprint 4 Final Report | `docs/04-report/features/v2113-sprint-4-presentation.report.md` | ⏳ |

---

## 6. Implementation Order (Phase 4 Do)

leaf-first, then orchestrator:

| Step | File | 이유 |
|:----:|------|------|
| 1 | `lib/audit/audit-logger.js` 확장 (ACTION_TYPES 2 신규) | Smallest change, foundation |
| 2 | `lib/control/automation-controller.js` 확장 (SPRINT_AUTORUN_SCOPE) | Foundation |
| 3 | `templates/sprint/*.template.md` (7 files, 한국어) | Independent — leaf |
| 4 | `scripts/sprint-handler.js` (영어, dispatcher) | Wires Sprint 1+2+3 — core integration |
| 5 | `agents/sprint-master-planner.md` (영어 + 8개국어 triggers) | Specialist agent — leaf |
| 6 | `agents/sprint-qa-flow.md` (영어 + 8개국어 triggers) | Specialist agent — leaf |
| 7 | `agents/sprint-report-writer.md` (영어 + 8개국어 triggers) | Specialist agent — leaf |
| 8 | `agents/sprint-orchestrator.md` (영어 + 8개국어 triggers) | Coordinates above 3 — pseudo-orchestrator |
| 9 | `skills/sprint/SKILL.md` (영어 body + 8개국어 frontmatter) | User entry point |
| 10 | `skills/sprint/PHASES.md` (영어 참조) | Skill reference |
| 11 | `skills/sprint/examples/*.md` (3 영어 예제) | Skill examples |
| 12 | Static checks (`node -c` scripts/sprint-handler.js + JSON validity) | Syntax |
| 13 | Runtime check (`claude plugin validate .` Exit 0) | Plugin validator |
| 14 | Cross-Sprint Integration TC (Sprint 4-anchored CSI-04-01~08) | Sprint 1+2+3+4 e2e |

---

## 7. Acceptance Criteria (Phase 6 QA)

### 7.1 Static + Plugin Validate
- [ ] `claude plugin validate .` Exit 0 (F9-120 closure 10-cycle 연속)
- [ ] skill SKILL.md frontmatter YAML 정합
- [ ] 4 agents frontmatter YAML 정합
- [ ] 7 templates frontmatter YAML 정합
- [ ] sprint-handler.js `node -c` OK
- [ ] hooks/hooks.json `jq` valid + 21 events 24 blocks (invariant)
- [ ] Sprint 1/2/3 invariant: git diff lib/domain/sprint/ + lib/application/sprint-lifecycle/ + lib/infra/sprint/ empty
- [ ] PDCA invariant: git diff lib/application/pdca-lifecycle/ empty
- [ ] Domain Purity 16 files 0 forbidden

### 7.2 ★ 8개국어 Triggers (TRIG-01~05)
- [ ] TRIG-01: skill SKILL.md description Triggers 풀세트 8개국어 (EN/KO/JA/ZH/ES/FR/DE/IT)
- [ ] TRIG-02: agents/sprint-orchestrator.md Triggers 풀세트 8개국어
- [ ] TRIG-03: agents/sprint-master-planner.md Triggers 풀세트 8개국어
- [ ] TRIG-04: agents/sprint-qa-flow.md Triggers 풀세트 8개국어
- [ ] TRIG-05: agents/sprint-report-writer.md Triggers 풀세트 8개국어

### 7.3 ★ Code English-only (ENG-01~03)
- [ ] ENG-01: skills/sprint/SKILL.md body 한글 0건 (frontmatter 8개국어 triggers 제외)
- [ ] ENG-02: agents/sprint-*.md body 한글 0건 (frontmatter 8개국어 triggers 제외)
- [ ] ENG-03: scripts/sprint-handler.js 한글 0건 (주석 + identifier)
- [ ] ENG-04: lib/control + lib/audit 신규 변경부분 한글 0건

### 7.4 Templates Korean (예외 OK)
- [ ] TEMPL-01: 7 templates/sprint/*.template.md 한국어 (frontmatter 영어 OK — `template:`, `variables:` 등)

### 7.5 sprint-handler.js TC (10+)
- [ ] H-01: handleSprintAction('start', ...) → Sprint 3 createSprintInfra + Sprint 2 startSprint 호출
- [ ] H-02: handleSprintAction('init', ...) → Sprint 1 createSprint + Sprint 3 stateStore.save
- [ ] H-03: handleSprintAction('status', ...) → Sprint 3 stateStore.load + render
- [ ] H-04: handleSprintAction('list', ...) → Sprint 3 stateStore.list + docScanner union
- [ ] H-05: handleSprintAction('pause', ...) → Sprint 2 pauseSprint
- [ ] H-06: handleSprintAction('resume', ...) → Sprint 2 resumeSprint
- [ ] H-07: handleSprintAction('archive', ...) → Sprint 2 archiveSprint + Sprint 3 save
- [ ] H-08: handleSprintAction('help') → static help text
- [ ] H-09: handleSprintAction('unknown') → { ok: false, error: ... }
- [ ] H-10: createSprintInfra inject 자동 (env-aware)

### 7.6 lib/control + lib/audit 확장 TC (5+)
- [ ] CTRL-01: SPRINT_AUTORUN_SCOPE 5 levels frozen
- [ ] CTRL-02: lib/control/automation-controller.js export SPRINT_AUTORUN_SCOPE
- [ ] AUDIT-01: ACTION_TYPES 18 entries (16 기존 + 2 신규)
- [ ] AUDIT-02: sprint_paused entry exists
- [ ] AUDIT-03: sprint_resumed entry exists

### 7.7 ★ Cross-Sprint Integration (Sprint 4-anchored, CSI-04-01~08)
- [ ] CSI-04-01: skill 'start' action via handler → Sprint 1+2+3 자율 + 디스크 영구화 + 7 events
- [ ] CSI-04-02: skill 'list' → stateStore.list + docScanner.findAllSprints union
- [ ] CSI-04-03: skill 'status' → stateStore.load + render
- [ ] CSI-04-04: skill 'pause' → Sprint 2 pauseSprint + Sprint 3 audit log
- [ ] CSI-04-05: skill 'resume' → Sprint 2 resumeSprint + Sprint 3 audit log
- [ ] CSI-04-06: skill 'archive' → Sprint 2 archiveSprint + Sprint 3 status='archived' on disk
- [ ] CSI-04-07: agent sprint-orchestrator (mock spawn) → Task pattern verified
- [ ] CSI-04-08: ACTION_TYPES enum 'sprint_paused' 정합 → audit-logger normalize 그대로 보존

### 7.8 Regression (no break)
- [ ] Sprint 1 L1 40 TCs PASS
- [ ] Sprint 2 L2 79 TCs PASS
- [ ] Sprint 3 L2 66 + 10 CSI TCs PASS

---

## 8. Cross-Sprint Dependency

### 8.1 Sprint 1+2+3 → Sprint 4 (consumer)

| Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 사용 |
|---------|---------|---------|-------------|
| createSprint, cloneSprint, validateSprintInput, sprintPhaseDocPath, SprintEvents, SPRINT_NAME_REGEX, SPRINT_EVENT_TYPES, isValidSprintEvent | startSprint, pauseSprint, resumeSprint, archiveSprint, verifyDataFlow, advancePhase, iterateSprint, generateReport, SPRINT_AUTORUN_SCOPE (inline) | createSprintInfra (composite), createStateStore, createEventEmitter, createDocScanner, createMatrixSync | skills/sprint/SKILL.md handler + 4 agents body + sprint-handler.js dispatcher |

### 8.2 Sprint 4 → Sprint 5 (future consumer)

| Sprint 4 산출 | Sprint 5 사용 |
|--------------|-------------|
| skill SKILL.md sub-actions 15건 | README + CLAUDE.md user guide |
| 4 agents specifications | docs/02-design/sprint-orchestration.md |
| 7 templates | Migration guide + first user sprint examples |
| sprint-handler.js entry point | L3+ contract tests (real adapter wiring) |
| SPRINT_AUTORUN_SCOPE in lib/control | `/control` extended display |

### 8.3 invariant — 변경 0건

| 자산 | 변경 |
|------|------|
| `lib/domain/sprint/*` (Sprint 1) | 0 |
| `lib/application/sprint-lifecycle/*` (Sprint 2) | 0 |
| `lib/infra/sprint/*` (Sprint 3) | 0 |
| `lib/application/pdca-lifecycle/*` (PDCA) | 0 |
| `hooks/hooks.json` (21 events 24 blocks) | 0 |

---

## 9. Plan 완료 Checklist

- [x] Context Anchor 보존
- [x] Requirements R1-R13 (13 changes — 17 new + lib extension 2)
- [x] Out-of-scope 매트릭스 (Sprint 5~6 분배)
- [x] Feature Breakdown 19 changes (~2,055 LOC)
- [x] Quality Gates 22건 활성 (8개국어 + 영어 코드 + invariants + cross-sprint)
- [x] Risks (PRD 10 + Sprint 4 specific 10 = 20 risks)
- [x] Document Index 6 phase
- [x] Implementation Order 14 steps (leaf → orchestrator)
- [x] Acceptance Criteria 8 groups (Static / TRIG / ENG / Templates / Handler / Control+Audit / **★ CSI-04** / Regression)
- [x] Cross-Sprint Dependency 명시 + ★ user-mandated 보존

---

**Next Phase**: Phase 3 Design — 현재 코드베이스 깊이 분석 (existing skills/agents/templates/hooks/control/audit 패턴) + 16 files 정확한 spec + ★ 8개국어 triggers 정합 매트릭스 + ★ Cross-Sprint Integration 데이터 흐름 spec + Test Plan Matrix 30+ TCs.
