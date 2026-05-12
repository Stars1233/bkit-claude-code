# v2.1.13 Dead-Code Audit + Sprint Integration Gap Analysis

> **Scope**: bkit v2.1.13 sprint 기능 추가 + sprint/pdca/control 통합 완료 후 전 컴포넌트(skills/agents/templates/hooks/libs)를 2 관점으로 심층 분석
>
> **Date**: 2026-05-12
> **Branch**: feature/v2113-sprint-management
> **Method**: cross-reference grep + git history + frontmatter inspection + bash invocation pattern detection
>
> **두 관점**:
> 1. **관점 1-1 (Integration Gap)**: v2.1.13 sprint와 연동되었어야 했지만 미연동된 컴포넌트 → 개선 필요
> 2. **관점 1-2 (Dead Code)**: 어디서도 사용 안 되는 컴포넌트 → 삭제하여 plugin 용량/혼란 감소

---

## Executive Summary

| 카테고리 | 발견 항목 | 액션 |
|---------|---------|------|
| **A. Sprint Integration Gaps (관점 1-1)** | 8 항목 | HIGH/MEDIUM 우선순위 fix |
| **B. Dead Code (관점 1-2)** | 19 항목 (1,086 LOC + 25KB templates + 6 agents + 3 dead hook blocks) | 삭제 후보 |
| **C. Observations (non-action)** | 3 항목 | 문서화 / monitor only |

총 LOC 영향 (관점 1-2 삭제 적용 시): **약 −1,300 LOC + −25KB**

---

## A. Sprint Integration Gaps (관점 1-1)

### A-1 (★ HIGH) `lib/intent/language.js` — Sprint trigger patterns 부재

**영향**: 사용자 자연어 인식 ↔ Sprint routing 단절

| 누락 trigger | 효과 |
|------------|------|
| `sprint` skill | "스프린트", "sprint", 8-lang 모두 — system이 sprint skill 추천 안 함 |
| `master-plan` action | "마스터 플랜", "master plan" 등 — system이 sprint master-plan 인식 안 함 |
| `sprint-orchestrator` agent | "스프린트 조율", "sprint orchestration" — agent 추천 안 함 |
| `sprint-master-planner` agent | "스프린트 마스터 플랜" — agent 추천 안 함 |
| `sprint-qa-flow` agent | "스프린트 QA", "data flow integrity" — agent 추천 안 함 |
| `sprint-report-writer` agent | "스프린트 보고서", "sprint report" — agent 추천 안 함 |

**파일**:
- `lib/intent/language.js:128` SKILL_TRIGGER_PATTERNS — 현재 15 entries, sprint 누락
- `lib/intent/language.js:15` AGENT_TRIGGER_PATTERNS — 현재 8 entries, sprint-* 4개 누락

**액션**: SKILL_TRIGGER_PATTERNS + AGENT_TRIGGER_PATTERNS에 sprint 패턴 추가 (각 8-lang triggers 포함, skills/sprint/SKILL.md + agents/sprint-*.md 기존 frontmatter triggers 일치)

---

### A-2 (★ HIGH) Core skills — Sprint mention 부재

| Skill | 현재 description | 갭 |
|-------|----------------|----|
| `bkit/SKILL.md` (entry) | "bkit plugin help" | sprint를 `/bkit help` 응답에 안내 안 함 |
| `pdca/SKILL.md` | "Unified PDCA cycle management" | PDCA ↔ sprint orthogonal coexistence (8 vs 9 phase) 안내 부재 |
| `control/SKILL.md` | "Control bkit automation level" | L0~L4의 SPRINT_AUTORUN_SCOPE 직접 노출 사실 명시 안 함 |
| `plan-plus/SKILL.md` | "Brainstorming-enhanced PDCA planning" | sprint master-plan과의 관계 (when to use which) 안내 부재 |

**액션**: 각 SKILL.md에 sprint cross-reference 1~2 문장 추가 (description 또는 본문 § 추가).

---

### A-3 (MEDIUM) Orchestrator agents — sprint-* agent spawn 패턴 부재

| Agent | 현재 | 갭 |
|-------|------|----|
| `agents/cto-lead.md` | Task(enterprise-expert/...) 5+ blocks | sprint-orchestrator Task spawn 예시 없음 |
| `agents/pm-lead.md` | PM workflow 분석만 | sprint PM phase (prd) 연결 부재 |
| `agents/qa-lead.md` | QA test execution | sprint qa phase (sprint-qa-flow agent 위임) 연결 부재 |

**액션**: 각 \*-lead.md body의 Task spawn 예시 블록에 sprint 시나리오 1개 추가.

---

### A-4 (MEDIUM) `lib/orchestrator/next-action-engine.js` — Sprint phase 미인식

**현재**: `PHASE_NEXT_SKILL` 테이블이 PDCA 9-phase only.
**갭**: 사용자가 `sprint phase --to plan`으로 Sprint 8-phase에서 작업해도 next-action 안내 부재.

**액션**: SPRINT_PHASE_NEXT_SKILL 별도 테이블 추가 + `ctx.sprintStatus` 분기 처리.

---

### A-5 (MEDIUM) `lib/orchestrator/team-protocol.js` — sprint-orchestrator 미인식

**현재**: PM Lead / CTO Lead / QA Lead Task spawn protocol만 정의.
**갭**: sprint-orchestrator를 별도 protocol entry로 등록 안 함.

**액션**: 사용자 sprint 시작 의도 감지 시 sprint-orchestrator Task spawn 안내 protocol 추가.

---

### A-6 (LOW) hooks 측 sprint audit 인식

**현재**: 24 hook scripts 중 sprint mention 0 인 것 12개. 단 generic audit-logger를 통해 sprint_paused/sprint_resumed/master_plan_created가 ndjson에 기록됨.
**판단**: design상 hooks는 raw events만 다루고 domain audit은 audit-logger 책임 — **갭 아님**.

---

### A-7 (LOW) bkit/SKILL.md `Triggers` 행에 sprint 없음

**현재**: `Triggers: bkit, help, functions, 도움말, 기능, ヘルプ, ...`
**갭**: `/bkit sprint` 같은 sub-command shortcut 미지원.
**액션**: argument-hint 또는 본문에 `bkit sprint` shortcut 안내 (optional).

---

### A-8 (LOW) `docs/06-guide/sprint-management.guide.md` cross-link

**현재**: §9에 master plan 안내 (S4-UX 추가).
**확인**: 다른 guides에서 sprint guide로 cross-link 있는지 확인 필요.
**액션**: README.md / CHANGELOG.md / pdca skill 본문에 cross-reference 추가 (이미 일부 적용).

---

## B. Dead Code (관점 1-2)

### B-1 (★ HIGH) `lib/context/` 5 files — Living Context System v3.0.0

| 파일 | 라인 수 | Caller |
|-----|--------|--------|
| `lib/context/context-loader.js` | 526 | 0 (self-only) |
| `lib/context/impact-analyzer.js` | 205 | 0 |
| `lib/context/index.js` | 11 | 0 |
| `lib/context/invariant-checker.js` | 140 | 0 |
| `lib/context/scenario-runner.js` | 204 | 0 |
| **Total** | **1,086 LOC** | |

**증거**:
- JS 코드 전체에서 `require('lib/context')` 또는 `require('../context')` 0건 (외부)
- `hooks/startup/context-init.js`는 다른 path (`lib/context-hierarchy.js`)를 require하고 그것도 missing
- `agents/self-healing.md` + `skills/enterprise/SKILL.md`에서 "Living Context" 개념 mention하지만 invocation 코드 없음
- docs (LIVING-CONTEXT-GUIDE.md) 만 reference

**액션**: ★ **삭제** (lib/context 디렉토리 전체) — 1,086 LOC 절감.

---

### B-2 (★ HIGH) `hooks/startup/context-init.js` 3 dead if-blocks

**증거** (git commit `21d35d6` 2026-04-08 S1 cleanup):
- v2.1.1에서 `lib/context-hierarchy.js` + `lib/memory-store.js` + `lib/context-fork.js` **삭제됨**
- context-init.js는 이 3 missing 모듈을 lazy require (safeRequire) — 모두 null 받음
- 본문 3개 `if (contextHierarchy)`, `if (memoryStore)`, `if (contextFork)` 블록 **영구 silent skip**

| 위치 | 블록 | 라인 |
|-----|------|------|
| line 72-90 | contextHierarchy 분기 (Context Hierarchy init) | ~20 LOC |
| line 92-135 | memoryStore 분기 (Memory Store sessionCount tracking) | ~45 LOC |
| line 138-160+ | contextFork 분기 (stale fork cleanup) | ~25 LOC |

**액션**: ★ **3 if-블록 삭제 + safeRequire 호출도 제거** — ~90 LOC 절감.

---

### B-3 (★ MEDIUM) `templates/infra/` 9 files

| 파일 | 크기 | Caller |
|-----|-----|--------|
| `templates/infra/argocd/application.yaml.template` | 2,257B | 0 |
| `templates/infra/deploy-dynamic.yml` | 2,183B | 0 |
| `templates/infra/deploy-enterprise.yml` | 6,181B | 0 |
| `templates/infra/observability/kube-prometheus-stack.values.yaml` | 3,773B | 0 |
| `templates/infra/observability/loki-stack.values.yaml` | 712B | 0 |
| `templates/infra/observability/otel-tempo.values.yaml` | 2,236B | 0 |
| `templates/infra/security/security-layer.yaml.template` | 3,085B | 0 |
| `templates/infra/staging-eks-ondemand.yml` | 2,387B | 0 |
| `templates/infra/terraform/main.tf.template` | 2,406B | 0 |
| **Total** | **~25KB / 9 files** | |

**증거**: CHANGELOG.md만 reference (역사적 record). agents/infra-architect.md line 95에 "argocd/" 디렉토리명만 generic mention.

**판단**: 두 옵션 — 
- (a) **삭제** (사용 의도가 끊김) — 25KB 절감
- (b) **infra-architect.md 본문에 명시적 reference 추가** (참조 자료로 보존)

**액션**: 사용자 결정 — 본 분석은 (a) 삭제를 default 추천 (v2.1.13까지 활용 0건).

---

### B-4 (MEDIUM) PDCA Evaluation Agents 7개

| Agent | 목적 | Caller |
|-------|------|--------|
| `agents/pdca-eval-pm.md` | "v1.6.1 baseline vs Customized bkit 비교 분석" | 0 spawn site |
| `agents/pdca-eval-plan.md` | (동일 시리즈) | 0 |
| `agents/pdca-eval-design.md` | (동일) | 0 |
| `agents/pdca-eval-do.md` | (동일) | 0 |
| `agents/pdca-eval-check.md` | (동일) | 0 |
| `agents/pdca-eval-act.md` | (동일) | 0 |

**증거**:
- 어떤 다른 agent/script에서도 `Task(pdca-eval-*)` 또는 `subagent_type='pdca-eval-*'` 패턴 grep 0건
- 모두 v1.6.1 baseline 비교 전용 (v1.6.1은 v2.1.13보다 14+ minor versions 차이 = stale baseline)
- 한국어 description (8-lang trigger 없음 = user-invocable 아님)
- lib/discovery/explorer.js category mapping에만 등록

**액션**: 두 옵션:
- (a) **6개 모두 삭제** (v1.6.1 비교 일회성 작업 종료, 재사용 의도 없음 추정)
- (b) **archive/agents/** 디렉토리로 이동 (역사적 record 보존)

**액션 추천**: (a) 삭제 — 한국어 frontmatter는 bkit의 global service 원칙 위반 + stale baseline.

---

### B-5 (LOW) `agents/self-healing.md` `linked-from-skills: [deploy]` 끊김

**증거**:
- self-healing.md frontmatter `linked-from-skills: [deploy]` 선언
- skills/deploy/SKILL.md 본문에 `self-healing` mention **0건**
- 의도된 연결이 끊겨 있음

**액션**: 두 옵션:
- (a) **skills/deploy/SKILL.md에 self-healing 통합 안내 추가** (declared intent 복원)
- (b) **self-healing.md frontmatter `linked-from-skills` 삭제** (orphan reference 정리)
- (c) agent 자체 삭제 (단 user-invocable triggers 있어서 위험)

**액션 추천**: (b) — agent는 보존하되 끊긴 link 메타데이터 제거.

---

## C. Observations (Non-Action)

### C-1 ACTION_TYPES 비-frozen
`lib/audit/audit-logger.js` ACTION_TYPES 19개 array가 `Object.isFrozen() === false`. VALID_ACTIONS / SPRINT_PHASE_ORDER / PHASE_ORDER 다른 enum은 모두 frozen — consistency 갭. 단 L3 SC-06 contract는 count + content만 검사. 기록만.

### C-2 Sprint `archived` vs PDCA `archive` enum divergence
이전 deep-qa.report.md §10 Observation #2에 이미 기록. v2.1.14+ ADR.

### C-3 Dual PDCA SoT (`lib/pdca/phase.js` vs `lib/application/pdca-lifecycle/`)
이전 deep-qa.report.md §14.5에 이미 기록. v2.1.14+ migration.

---

## D. 액션 매트릭스 — 사용자 승인용

| ID | 항목 | 카테고리 | 위험도 | LOC 영향 | 추천 |
|----|-----|---------|-------|---------|------|
| A1 | lib/intent/language.js sprint trigger patterns 추가 | 1-1 | LOW (additive) | +30 | ✓ **승인 추천** |
| A2 | bkit/pdca/control/plan-plus SKILL.md sprint reference | 1-1 | LOW (description only) | +20 | ✓ **승인 추천** |
| A3 | cto-lead/pm-lead/qa-lead body sprint Task spawn 예시 | 1-1 | LOW (additive) | +30 | ✓ **승인 추천** |
| A4 | next-action-engine.js SPRINT_PHASE_NEXT_SKILL 테이블 | 1-1 | MEDIUM (logic addition) | +25 | ? **승인 시 진행** |
| A5 | team-protocol.js sprint-orchestrator entry | 1-1 | MEDIUM (logic addition) | +15 | ? **승인 시 진행** |
| B1 | lib/context/* 5 files 삭제 | 1-2 | LOW (zero callers verified) | -1,086 | ✓ **승인 추천** |
| B2 | context-init.js 3 dead if-blocks 정리 | 1-2 | LOW (silent dead) | -90 | ✓ **승인 추천** |
| B3 | templates/infra/* 9 files 삭제 | 1-2 | LOW (zero callers + CHANGELOG only) | -25KB | ? **(a)/(b) 선택** |
| B4 | pdca-eval-* 6 agents 삭제 | 1-2 | LOW (zero spawn + Korean frontmatter) | -6 files | ? **(a)/(b) 선택** |
| B5 | self-healing.md linked-from-skills 정리 | 1-2 | LOW (metadata cleanup) | -1 line | ✓ **승인 추천** |

**총 변경 추정** (A1-A5 + B1-B5 모두 승인 시):
- 추가 LOC: ~120 (sprint integration)
- 삭제 LOC: ~1,180 (dead code) + 25KB templates + 6 agent files

---

## E. 회귀 검증 계획

각 액션 적용 후 다음 baseline 재실행:
- L3 Contract: **10/10 PASS** 유지
- Sprint 1 Domain: **40/40 PASS**
- Sprint 2 Application: **79/79 PASS**
- Sprint 3 Infrastructure: **66/66 PASS**
- Sprint 4 Presentation: **41/41 PASS**
- Sprint 5 Quality+Docs: **7/7 PASS**
- `claude plugin validate .`: **Exit 0** (F9-120 9-cycle 목표)

추가:
- intent-router smoke: 새 sprint pattern으로 자연어 → skill suggestion 검증
- hooks/session-start dry-run: context-init 정리 후 session start 정상 동작 확인

---

## F. 적용 결과 (2026-05-12 본 세션 완료)

### F.1 모든 액션 적용 — Phase A + Phase B

| ID | 항목 | 결과 | LOC 영향 |
|----|-----|------|---------|
| A1 | lib/intent/language.js — SKILL +1 (sprint), AGENT +4 (sprint-*), audit `err:` → `en:` typo fix | ✅ | +60 |
| A2 | skills/bkit + pdca + control + plan-plus SKILL.md description sprint reference | ✅ | +4 lines |
| A3 | agents/cto-lead + pm-lead + qa-lead Task spawn 패턴 + body 시나리오 | ✅ | +60 |
| A4 | lib/orchestrator/next-action-engine.js — SPRINT_PHASE_NEXT_SKILL 신설 + generateGeneric sprint-aware | ✅ | +35 |
| A5 | lib/orchestrator/team-protocol.js — sprint-orchestrator + SPRINT_SUB_AGENTS + buildPrompt sprint mode | ✅ | +30 |
| B1 | lib/context/* 5 files 삭제 | ✅ | **−1,086** |
| B2 | hooks/startup/context-init.js 근본적 재작성 (3 dead blocks 제거) | ✅ | net −80 (224 → 184 lines, plus 명시적 cleanup comment) |
| B3 | templates/infra/* 9 files 삭제 (lib/discovery/explorer.js AGENT_CATEGORY 매핑도 업데이트) | ✅ | **−25KB** + 9 files |
| B4 | agents/pdca-eval-* 6 files 삭제 + explorer.js 6 entries 제거 + sprint-* 4 entries 추가 | ✅ | **−6 files** + explorer 정리 |
| B5 | skills/deploy/SKILL.md — self-healing 통합 § 추가 (근본적 해결) | ✅ | +28 lines |

### F.2 회귀 검증 결과

```
L3 Contract:              10/10 PASS (S4-UX baseline 유지)
Sprint 1 Domain QA:       40/40 PASS
Sprint 2 Application QA:  79/79 PASS
Sprint 3 Infrastructure:  66/66 PASS
Sprint 4 Presentation:    41/41 PASS
Sprint 5 Quality+Docs:    7/7  PASS
claude plugin validate:   Exit 0 (F9-120 9-cycle PASS)
```

### F.3 Intent Router Smoke (A1 검증)

| 사용자 자연어 | router.primary | 평가 |
|-------------|---------------|------|
| "스프린트 만들어줘" | skill:bkit:sprint (0.8) | ✅ A1 효과 |
| "create new sprint" | skill:bkit:sprint (0.8) | ✅ A1 효과 |
| "마스터 플랜 생성" | skill:bkit:sprint (0.8) | ✅ A1 효과 |
| "sprint orchestrator 시작" | skill:bkit:sprint + agent:sprint-orchestrator | ✅ A1 효과 |
| "pdca 진행" | skill:bkit:pdca (0.8) | ✅ 회귀 무 |
| "코드 리뷰" | skill:bkit:code-review (0.8) | ✅ 회귀 무 |

### F.4 총 LOC/파일 영향

- **추가**: ~217 LOC (sprint integration A1-A5)
- **삭제**: ~1,166 LOC + 25KB + 15 files (B1-B4)
- **순 영향**: 약 **−950 LOC + 25KB + −15 files** (기술 부채 감소)

### F.5 v2.1.13 릴리즈 포함

본 정리 작업은 사용자 요청에 따라 v2.1.13 릴리즈에 포함:
- sprint 기능 추가 (master sprint)
- sprint/pdca/control 통합 검증 (deep-qa.report.md)
- 본 dead code 정리 + integration gap fix (현 문서)
