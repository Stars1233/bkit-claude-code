---
feature: bkit-v2110-orchestration-integrity
phase: 03-analysis
status: ✅ Phase B 완료 (Gap Taxonomy 종합)
target: bkit v2.1.10 (추가 Sprint 7)
created: 2026-04-22
source: Phase A 4 + Phase A+ 1 = 5개 분석 에이전트 병렬 실측
---

# Workflow Orchestration Integrity — Gap Taxonomy

> **정의**: bkit의 "유기적 동작"을 **사용자 경험·워크플로우 관점**에서 재정의. 프롬프트 입력 → 의도 감지 → skill/agent 자동 호출 → Hook 라이프사이클 → PDCA 단계 전환 → Next Action 제안 → 팀 오케스트레이션 → Control Level 자동화까지의 체인이 끊김 없이 동작하는가.
> **본 문서는 Plan-Plus §21 입력·Design 근거·Do 구현 우선순위의 단일 진실원이다.**

---

## 1. 7축 Gap Taxonomy

| 축 | 클래스 | 정의 | Gap 수 |
|----|:---:|------|:-----:|
| G-J | **Journey** | 사용자 프롬프트 → 의도 감지 → skill/agent 자동 호출 체인 | 15 |
| G-P | **Phase Transition** | PDCA 단계(plan→design→do→check→act→qa→report) 자동 전환 메커니즘 | 14 |
| G-T | **Team Orchestration** | PM/CTO/QA Lead가 sub-agent를 실제 Task tool로 spawn하는 경로 | 13 |
| G-C | **Control Level** | L0~L4 자동화, Trust Score, guardrails, gate | 15 |
| G-F | **Frontmatter** | Skills(39)·Agents(36) YAML frontmatter 일관성 및 CC 스키마 준수 | 7 |
| G-I | **Import Graph** | lib/hooks/scripts require 누락·순환·facade 정책 | 3 |
| G-D | **Dead Code/Legacy** | v2.0.x → v2.1.10 승급 시 남은 주석·태그·중복·미참조 모듈 | 5 |
| **계** | | | **72** |

---

## 2. Critical Gap 10건 (P0, 즉시 조치)

| ID | 축 | 내용 | 파일/라인 | 영향 |
|----|:-:|------|-----------|------|
| **G-J-01** | Journey | `SKILL_TRIGGER_PATTERNS` 4/39 skills만 등록 (35개 미커버) | `lib/intent/language.js:125-166` | 사용자 프롬프트 "PM 분석해줘" → pm-discovery 감지 불가, PDCA 진입 90% 수동 |
| **G-J-02** | Journey | Confidence score 사실상 고정 상수 0.8, 랭킹 부재 | `lib/intent/trigger.js:48,82` | `bkit.config.triggers.confidenceThreshold` 튜닝 무의미 |
| **G-J-03** | Journey | featureName 미추출 시 confidence 0.7 → 임계 0.8 미달 → PDCA 진입 제안 누락 | `lib/intent/trigger.js:126-130` | "로그인 기능 만들어줘"에서 PDCA pm/plan 제안이 **주입 안됨** |
| **G-J-04** | Journey | Agent-Skill 힌트 경쟁 해결 부재 (bkend-expert와 dynamic 동시 힌트 시 우선순위 없음) | `scripts/user-prompt-handler.js:124-149` | LLM 자유 선택 → 비결정 |
| **G-P-01** | Phase | matchRate 임계 **3중 불일치** (state-machine=100, automation.js=100, bkit.config=90) | `state-machine.js:288`, `automation.js:82`, `bkit.config.json:58` | check→qa/report 자동 advance 시 Guard block 가능 |
| **G-T-01** | Team | cto-lead body에 Task() spawn 예시 **0건** (pm-lead/qa-lead는 명시) | `agents/cto-lead.md:82-88` 표 only | 12명 팀 오케스트레이션 무효 |
| **G-T-02** | Team | `Task(pm-lead)`/`Task(qa-lead)` cto-lead frontmatter **미선언** | `agents/cto-lead.md:38-48` tools | Enterprise pm/qa roles silent blocked |
| **G-T-03** | Team | Enterprise teammates 숫자 **3중 불일치** (pdca SKILL.md=5, strategy.js=6, MEMORY="12") | `skills/pdca/SKILL.md:380-384` vs `lib/team/strategy.js:47` | Docs=Code 위반, 사용자 혼동 |
| **G-C-01** | Control | Trust Score 자동 escalate/downgrade **미구현** (profile currentLevel 변경되어도 control-state.json 미반영) | `lib/control/trust-engine.js:429-445` | Trust 시스템 dead feature |
| **G-C-02** | Control | `autoEscalation`, `autoDowngrade`, `trustScoreEnabled` 플래그 코드 **미참조** | `bkit.config.json:129-131` grep = 0 | 3개 설정 값이 시스템 제어에 무효 |

---

## 3. Important Gap 17건 (P1, 릴리스 전 조치)

| ID | 축 | 요약 |
|----|:-:|------|
| G-J-05 | Journey | `unified-stop.js:637-671` 기본 경로 Next Action 전무 |
| G-J-06 | Journey | `session-end-handler.js`, `subagent-stop-handler.js` Next Action 로직 부재 (grep 0 hit) |
| G-J-07 | Journey | SKILL_HANDLERS 13개 + AGENT_HANDLERS 7개 외 skill/agent의 Stop은 Next Action 없음 |
| G-J-08 | Journey | Skill Auto-Trigger **이중화**: CC description-based(외부) vs bkit-local pattern(내부), 동기화 보장 없음 |
| G-J-09 | Journey | `additionalContext`가 pipe-joined string → LLM 무시 위험, 구조화 필드(`skillSuggestions`/`agentSuggestions`) 미사용 |
| G-J-10 | Journey | Ambiguity threshold 0.7 **하드코딩** (`bkit.config.json:15 ambiguityThreshold` 있음에도 미연결) |
| G-J-11 | Journey | Team Suggestion 임계값 1000자가 비현실적 (실제 프롬프트 100자 미만) |
| G-P-02 | Phase | L0~L4 `GATE_CONFIG`/`canAutoAdvance` hook/stop 스크립트에서 **미호출** |
| G-P-10 | Phase | `report → archived` 자동 dispatcher **부재**, report-generator 완료 후 수동 `/pdca archive` 필수 |
| G-P-13 | Phase | `guardDoComplete`가 `metadata.doCompletionResult` 의존하나 **세팅 hook/스크립트 없음** |
| G-T-04 | Team | `buildPmTeamPlan()`/`generateSpawnTeamCommand()` 반환 plan 객체 **소비자 0** (dead code) |
| G-T-05 | Team | `qa-monitor` frontmatter 선언만 존재, qa-lead body 호출 경로 **미구현** |
| G-T-06 | Team | `state-writer.js` 5단계 lifecycle API 호출자 **0건** (teammate state 기록 silent drop) |
| G-C-04 | Control | `guardrails.*` 전 블록 (destructiveDetection, blastRadiusLimit, loopBreaker.* etc.) 코드 grep **0건** |
| G-C-08 | Control | `executeFullAutoDo` **stub 상태** (`lib/pdca/full-auto-do.js:234`), L4에서도 실제 agent dispatch 안 됨 |
| G-C-15 | Control | L4 자동 체인이 CC runtime 한계로 **soft chain** (LLM 순응 의존) — 공식화 필요 |
| G-F-05 | Frontmatter | Agents 18/36이 "Use proactively when…" 표준 문구 부재 (CC auto-invoke 품질 저하) |

---

## 4. Cosmetic Gap 45건 (P2~P3)

**축별 대표**:
- **G-J (5)**: next-skill 정적 테이블, Feature name 추출 조사 일부 미지원, Full-Auto 지시문 LLM 순응 의존 등
- **G-P (10)**: 전이 주석 "25 entries" vs 실측 24, `pdca.autoIterate` dead config, `pipeline.autoTransition` inert 등
- **G-T (8)**: `Task(product-manager)` 고아 선언, spawnAgentsSequentially dead, MEMORY "12명" 허구 등
- **G-C (10)**: `emergencyStopEnabled` 플래그 무효, `/control pause/resume` API 부재, `trust-profile.json` 경로 불일치 등
- **G-F (2)**: phase-4-api/phase-5-design-system `user-invocable` 중복 선언
- **G-D (5)**: `@version 2.0.0` lib 66건 + scripts 13건(총 79), `@deprecated v1.6.0` 1건, bkend-expert desc 1,203자, 36 agents `memory: project` 비공식 필드

---

## 5. 사용자 여정 시뮬레이션 — "로그인 기능 만들어줘"

실측 기반 step-by-step trace:

| # | 단계 | 결과 | Gap |
|---|------|------|:---:|
| 1 | UserPromptSubmit hook | `user-prompt-handler.js` 실행 | - |
| 2 | `detectNewFeatureIntent` | confidence 0.7 (featureName 추출 실패) < 0.8 임계 → **주입 안됨** | G-J-03 |
| 3 | `matchImplicitAgentTrigger` | bkend-expert.ko에 "로그인" 매칭 → "Suggested agent: bkit:bkend-expert" | - |
| 4 | `matchImplicitSkillTrigger` | dynamic.ko에 "로그인" 매칭 → "Relevant skill: bkit:dynamic" | - |
| 5 | **힌트 경쟁** | bkend-expert vs dynamic 우선순위 없음 | G-J-04 |
| 6 | `calculateAmbiguityScore` | 0.65 (5 factors) < 0.7 임계 → AskUserQuestion 발사 안됨 | G-J-10 |
| 7 | Team suggestion | 11자 < 1000자 → null | G-J-11 |
| 8 | additionalContext emit | pipe-joined string으로 LLM 전달 | G-J-09 |
| 9 | **LLM 선택** | `/dynamic`? `/pdca pm`? `/pdca plan`? 자유 선택 | - |
| 10 | **체인 진입 실패 시** | 사용자가 명시 `/pdca pm login-feature` 타이핑 필요 | G-J-01,03 |

**결론**: 사용자가 **자연어로 PDCA 사이클 진입 불가**. 최소 1회 수동 `/pdca` 명령 필요. **Control L4도 무의미** (진입 전이라 적용 안됨).

---

## 6. Plan → Design → Do → Iterate → QA → Report 자동 체인 실효성 (L4 가정)

| 전이 | 실효성 | 근거 |
|------|:---:|------|
| pm → plan | 🟡 소프트 | `pdca-skill-stop.js` [AUTO-TRANSITION] 지시문 emit, LLM 순응 필요 |
| plan → design | 🟡 소프트 | 동일. full-auto에서도 AskUserQuestion 분기와 경쟁 |
| **design → do** | 🔴 **차단** | `fullAuto.reviewCheckpoints:["design"]` 기본값 → `shouldAutoAdvance('design')=false` |
| do → check | 🟡 소프트 | `guardDoComplete`가 `doCompletionResult` 메타 의존, 세터 없음 (G-P-13) |
| check → act (iterate) | ✅ | `gap-detector-stop.js:582-587` state-machine transition 호출 |
| check → qa | 🟡 | matchRate ≥ 100 (hardcoded) vs config 90 → threshold 혼란 (G-P-01) |
| qa → report | ✅ | qaPassRate ≥ 95 && critical=0 시 autoTrigger |
| **report → archived** | 🔴 **차단** | ARCHIVE 이벤트 dispatcher 부재 (G-P-10) |

**종합**: L4 소프트 체인 55% 작동. **2개 결정적 차단** (design→do, report→archived) + **1개 임계 불일치** (matchRate).

---

## 7. 팀 오케스트레이션 현실

| 팀 | Task() 선언 | Body spawn | Runtime 가능 | 종합 |
|----|:----------:|:---------:|:----------:|:---:|
| PM Team (pm-lead → 4 agents) | ✅ 4/4 | ✅ body 명시 | 🟡 AGENT_TEAMS=1 필수 | **구조 OK, 게이트만** |
| **CTO Team (cto-lead → 11 agents)** | ✅ 11/11 | ❌ body 0건 | 🔴 Task(pm-lead)/Task(qa-lead) 미선언 | **가장 심각** |
| QA Team (qa-lead → 4 agents) | ✅ 4/4 | ✅ planner/generator/debug-analyst | 🟡 qa-monitor 미호출 | **qa-monitor만 보강** |

**결론**: CTO Team의 사용자-기대(12명 병렬 오케스트레이션)가 **실제로는 구조적으로 불가능**.

---

## 8. v2.1.10 Sprint 7 범위 정의 (Phase C Plan-Plus §21 근거)

**P0 필수 (반드시 릴리스 전 해결)** — **10건**:
1. G-J-01: `SKILL_TRIGGER_PATTERNS` 4→≥15 skills 확장
2. G-J-03: featureName 없어도 "New feature suspected" 힌트 주입 (threshold 0.7)
3. G-J-04: agent vs skill 우선순위 규칙 (skill > agent, PDCA skill 최우선)
4. G-P-01: matchRate threshold SSoT 통일 (`bkit.config:90` 기준 전역)
5. G-T-01: cto-lead body에 Phase별 Task spawn 예시 삽입 (pm-lead/qa-lead 패턴 복제)
6. G-T-02: cto-lead frontmatter `Task(pm-lead)`, `Task(qa-lead)` 추가 + strategy.js와 동기
7. G-T-03: Enterprise teammates 숫자 SKILL.md 6으로 교정, MEMORY "12명" 삭제
8. G-C-01: `trust-engine.syncToControlState` level 반영 경로 복원
9. G-C-02: `autoEscalation`/`autoDowngrade`/`trustScoreEnabled` 실 구현 or 설정 제거(YAGNI)
10. G-T-02 번들: `cto-lead` 실 Task spawn runtime 검증 TC

**P1 보강 (릴리스 전 권장)** — **12건**:
- G-J-05/06: `unified-stop.js` + `session-end-handler.js` + `subagent-stop-handler.js` Next Action 주입
- G-J-07: SKILL_HANDLERS 13 → 모든 skill에 fallback Next Action
- G-J-09: additionalContext 구조화 → `skillSuggestions` JSON 배열 병행 emit
- G-J-10: `ambiguityThreshold` config 연결
- G-P-02: hook에서 `canAutoAdvance(L)` 호출 경로 추가
- G-P-10: `report-generator` 종료 시 ARCHIVE dispatch
- G-P-13: `doCompletionResult` 세터 추가 (Do skill 완료 훅)
- G-T-05: `qa-monitor` qa-lead body 호출 경로
- G-T-06: `state-writer` lifecycle API를 pm-lead/cto-lead/qa-lead 호출에 연결
- G-C-04: `guardrails.*` 설정 연결 (최소 loopBreaker/destructiveDetection)
- G-C-08: `executeFullAutoDo` stub → 실 agent dispatch (Task tool)
- G-F-05: Agents 18개 "Use proactively" 문구 추가

**P2~P3 정리 (cosmetic)** — **50건**:
- `@version 2.0.0` lib 66건 + scripts 13건 → 2.1.10 일괄
- `@deprecated v1.6.0` 1건 제거
- Skills 중복 `user-invocable` 2건 정리
- `zero-script-qa` `allowed-tools` 명시
- bkend-expert description 축약 (1,203 → ≤800자)
- MEMORY.md "12명" 표현 제거

---

## 9. Invocation Contract 영향 사전 판정

**모든 P0~P3 변경의 Contract 226 assertions 영향 = 0**:
- Skill **이름**·slash 명령어 불변
- Agent **이름** 불변
- MCP tool 이름·inputSchema 불변
- Hook event 이름 불변

변경 대상은 **frontmatter 필드 추가/수정**, **description 내용 강화**, **internal wiring**, **주석 정리**만 해당.

**Contract Test baseline 재생성 불필요** (ENH-241 Docs=Code 자동 검증).

---

## 10. Dependency Graph — 무엇부터 해야 하나

```
G-T-02 (cto-lead frontmatter Task 선언)
   └─ G-T-01 (cto-lead body spawn 예시) ← 프레임 먼저 확정
        └─ G-T-06 (lifecycle API 연결)
             └─ G-C-08 (executeFullAutoDo 실 dispatch)

G-P-01 (matchRate threshold SSoT)
   └─ G-P-02 (L0~L4 GATE_CONFIG 연결)
        └─ G-P-10 (ARCHIVE dispatcher)
             └─ G-P-13 (doCompletionResult 세터)

G-J-01 (SKILL_TRIGGER_PATTERNS 확장)
   └─ G-J-03 (threshold 0.7 lowering)
        └─ G-J-04 (경쟁 해결 규칙)
             └─ G-J-09 (구조화 필드)

G-C-01 (Trust Score level 반영)
   └─ G-C-02 (auto flags 구현)
```

**실행 순서**: Team → Phase Transition → Journey → Control → Frontmatter/Debt (정리는 마지막).

---

## 11. 측정 가능한 Success Criteria (D19~D30)

| # | 기준 | 측정 | 목표 |
|---|------|------|:---:|
| D19 | Skill trigger coverage | `Object.keys(SKILL_TRIGGER_PATTERNS).length` | **≥ 15** |
| D20 | Feature intent 주입율 | 프롬프트 10개 smoke test 중 PDCA 제안 주입 횟수 | **≥ 8** |
| D21 | Agent-Skill 경쟁 resolver | 코드 존재 + 우선순위 로그 | **구현됨** |
| D22 | matchRate threshold SSoT | `grep -rn "matchRateThreshold" lib/ scripts/` 값 일관 | **90 only** |
| D23 | cto-lead body spawn 예시 | `grep "Task(" agents/cto-lead.md \| wc -l` | **≥ 5** |
| D24 | CTO teammates Task 선언 | Task(pm-lead) AND Task(qa-lead) cto-lead frontmatter | **Both true** |
| D25 | Enterprise teammates 수 일관 | SKILL.md = strategy.js teammates | **6 = 6** |
| D26 | Next Action 제안 범위 | 21 hook 중 Next Action emit 수 | **≥ 15** |
| D27 | L4 자동 체인 smoke | `/control level 4` 후 PDCA 전 사이클 프롬프트 최소 개입 | **≤ 2 manual step** |
| D28 | Trust Score level 반영 | recordEvent → control-state.json.currentLevel 갱신 | **작동** |
| D29 | Agents "Use proactively" 커버리지 | 36 agents 중 문구 존재 수 | **≥ 30** |
| D30 | Legacy `@version 2.0.0` 잔재 | `grep -c "@version 2\.0\.0" lib/ scripts/` | **0** |

---

## 12. 예상 공수

| Sprint | 작업 | 예상 |
|:------:|------|:---:|
| **7a** | G-T 5건 (cto-lead body + Task 선언 + state-writer 연결) | 4h |
| **7b** | G-P 4건 (matchRate SSoT + GATE 연결 + ARCHIVE + DO_COMPLETE) | 3h |
| **7c** | G-J 6건 (SKILL pattern 확장 + threshold + resolver + 구조화 필드 + Next Action 범위) | 5h |
| **7d** | G-C 4건 (Trust Score 복원 + auto flags + executeFullAutoDo) | 4h |
| **7e** | G-F + G-D (Frontmatter 정리 + legacy @version 일괄) | 2h |
| **Iterate** | Workflow Integration Tests + User Journey L5 확장 + Control L4 smoke | 3h |
| **QA** | 전체 6 validators + /pdca qa | 2h |
| **문서** | CHANGELOG + MEMORY + report | 1h |
| **합계** | | **~24h** |

---

## 13. 리스크

| # | Risk | Sev | 완화 |
|---|------|:---:|------|
| R1 | CTO Team Task spawn 추가 후 AGENT_TEAMS 환경 없으면 silent fallback | M | `isTeamModeAvailable()` 가드 + prose-only fallback 문서화 |
| R2 | `SKILL_TRIGGER_PATTERNS` 확장 시 false-positive 증가 (의도하지 않은 skill 자동 호출) | M | 임계 0.7은 Agent, Skill은 0.8 유지 + 8-language 엄격 |
| R3 | Trust Score level 자동 변경으로 사용자 예기치 않은 tool 권한 변동 | H | `autoEscalation: false` 유지 + downgrade만 활성화 |
| R4 | `executeFullAutoDo` stub 해제가 Sprint 4.5 recursion 유형 사고 재발 | H | Integration runtime TC 방어선 유지, Task dispatch는 lazy require |
| R5 | @version 일괄 교체가 Git diff 큰 노이즈 | L | 별도 커밋 분리 (Sprint 7e) |

---

## 14. 결론

- **"유기적 동작"은 현재 ~40% 수준**. 코드 구조는 우수하나 **wiring 결여 + 설정-코드 단절 + CTO Team 구조적 공백 + entry point 빈약**이 주원인.
- Sprint 7(Phase C~F)에서 **P0 10건 + P1 12건 + P2/3 50건**을 **예상 ~24h 내** 해결 가능. Invocation Contract 영향 0.
- 본 문서 기반으로 Plan-Plus §21 추가 → Design → Do → Iterate(100%) → /pdca qa로 Phase 7(전체 유기적 동작 검증) 진행.
