---
template: sprint-prd
version: 1.0
sprintId: v2114-differentiation-release
displayName: bkit v2.1.14 — Differentiation Release + Clean Arch Maturity
date: 2026-05-14
author: kay (POPUP STUDIO) + bkit:sprint-master-planner agent (1st spawn dogfooding)
trustLevel: L2
---

# v2114-differentiation-release PRD — Sprint Management

> **Sprint ID**: `v2114-differentiation-release`
> **Phase**: PRD (1/8)
> **Date**: 2026-05-14
> **Author**: kay (POPUP STUDIO) + `bkit:sprint-master-planner` agent (dogfooding)
> **Trust Level**: L2
> **Master Plan Reference**: `docs/sprint/v2114/master-plan.md`

---

## 0. Context Anchor (Master Plan §1 복사, 보존 — 후속 phase 모두 동일 적용)

| Key | Value |
|-----|-------|
| **WHY** | (1) Sprint Management v2.1.13 GA 직후 실 사용 사례 0건 → dogfooding으로 self-validation 누적 / (2) v2.1.123→v2.1.141 95→96 consecutive 호환 데이터 누적으로 bkit 차별화 6건이 **결정적 입증**됨 (특히 ENH-292 11-streak, ENH-310 #58904 v2.1.73~v2.1.141 회귀) → 사용자 가시화·명시화 필요 / (3) Clean Architecture 4-Layer (v2.1.10/11)에서 7 Port 정착 후 caching-cost.port 신규 1건 추가가 자연스러운 다음 단계 / (4) CARRY-5 token-meter zero entries 근본 원인 (ENH-293 OTEL subprocess env propagation) 파악 완료, closure 시점 도래 |
| **WHO** | 1차 vibecoder (Sprint v2.1.13 GA 사용 first wave) / 2차 kay (메인테이너 + 본 sprint dogfooding 검증 의무) / 3차 외부 도구 사용자 (Cursor/Windsurf/Aider/Continue.dev migration 후보) / 4차 CC stable v2.1.128 drift +13 노출 사용자 |
| **RISK** | R1 ENH-292 latency / R2 ENH-310 false-positive / R3 sprint-master-planner 0 사용 사례 / R4 Port + Application 동시 변경 회귀 / R5 Trust L4 auto-pause 0 발화 baseline / R6 차별화 동시 명시화 → CC 모방 시 동시 무력화 |
| **SUCCESS** | K10 차별화 6/6 명시화 + K1 cache hit ≥36pp 상승 + K2 Heredoc 차단 100% + K4 Port 7→8 + K8 회귀 0건 + K9 dogfooding 1건 완료 |
| **SCOPE** | in: 13 ENHs (P0×1, P1×9, P2×3) + 4 Doc + 2 Observation, 6 sub-sprints, 35 days, 750K effective tokens, ~3,500 LOC / out: Application Layer 3 도메인 (v2.1.15), 차별화 #7 정식화, bkit-gemini 통합, MCP 3rd server, Trust L3/L4 default 변경 |

---

## 1. Problem Statement

### 1.1 현 상태 (As-is, 2026-05-14)

| 영역 | 현 상태 | 부재 / 미흡 |
|------|--------|------------|
| **bkit 차별화** | 4 차별화 implicit (ENH-286, ENH-289, ENH-292, ENH-300) | 명시화 부재 (README + battlecard + SNS 0건), #5 #6 정식 편입 부재 |
| **Sub-agent caching** | cto-lead 18 blocks parallel default + CC #56293 11-streak 무해소 | sequential dispatch 미적용 → cache hit 4% 추정, 사용자 체감 토큰 폭증 |
| **Heredoc Pipe Bypass** | CC #58904 v2.1.73~v2.1.141 (68 versions) 회귀 OPEN | bkit `hooks/unified-bash-pre.js` heredoc 감지 부재 → Defense Layer 2 우회 가능 |
| **PostToolUse continueOnBlock** | CC #57317 5-streak silent drop | bkit hook 결과 audit log 무손실 명시 X |
| **Defense Layer 6** | Layer 1-5 (PreToolUse + intent-router + memory advisory + audit + rollback) | post-hoc audit + alarm + auto-rollback 단일 layer 부재 |
| **OTEL emit** | telemetry.js 4 위치 (env-dependent), subprocess env 손실 | gen_ai.* semantic conventions 미적용, CARRY-5 #17 token-meter zero entries |
| **Memory Enforcer** | CC advisory (#56865, #57485, #58887 R-3 evolved) | PreToolUse deny-list enforced 미격상 → CC 모델 무시 가능 |
| **Effort-aware Adaptive Defense** | CC F4-133 `effort.level` + `$CLAUDE_EFFORT` surface only | bkit 미활용 → defense intensity 분기 정책 부재 |
| **Sprint Management dogfooding** | v2.1.13 GA 완료, `.bkit/state/sprint/` 부재 | sprint-master-planner agent 0 사용 사례, self-validation 부재 |
| **Port↔Adapter** | 7쌍 (v2.1.11 ENH-277) | caching-cost.port 부재 → ENH-292 observability 통합 지점 부재 |

### 1.2 기대 상태 (To-be, v2.1.14 archived 시점)

| 영역 | 기대 상태 |
|------|---------|
| **bkit 차별화** | 6/6 명시화 (README + battlecard + SNS) + streak 추적 dashboard |
| **Sub-agent caching** | sequential dispatch (L4 강제 + opt-in) + cache-cost-analyzer OTEL trace + cache hit ≥40% |
| **Heredoc Pipe Bypass** | `heredoc-detector.js` + 30+ adversarial TC PASS + 20+ legitimate TC NOT-FALSE-POSITIVE |
| **PostToolUse continueOnBlock** | continueOnBlock + reason audit log 무손실 명시 + #57317 streak 추적 |
| **Defense Layer 6** | post-hoc audit + alarm + auto-rollback 단일 layer + R-3 evolved form tracker |
| **OTEL emit** | gen_ai.* 10 metrics 통합 emit + subprocess env hydrate (CARRY-5 closure) |
| **Memory Enforcer** | PreToolUse deny-list enforced + audit log + advisory 무력화 차단 |
| **Effort-aware Adaptive Defense** | effort.level 분기 (low/medium/high → defense intensity 분기) + audit log verbosity 조정 |
| **Sprint Management dogfooding** | 본 sprint 1건 완료 + 8-phase × 6 sub-sprints 통과 + 4 auto-pause trigger N건 발화 데이터 |
| **Port↔Adapter** | 8쌍 (caching-cost.port +1) + Adapter 1건 (caching-cost-cli) |

---

## 2. Job Stories (JTBD 6-Part)

### Job Story 1 — sub-agent caching mitigation

- **When** 사용자가 cto-lead Task spawn 5+ blocks 호출 (예: `/pdca qa <feature>` Enterprise stack 5-agent),
- **I want to** bkit가 첫 spawn만 sequential dispatch로 prefix를 공유한 후 cache hit 정착 시 parallel로 복원하기,
- **so I can** CC parallel default 회귀 (#56293 11-streak)로 인한 cache_creation 5,534→22,713 토큰 폭증을 회피하고 토큰 비용 ≥36pp 절감할 수 있다.

### Job Story 2 — heredoc bypass defense

- **When** 사용자가 Bash heredoc 패턴 (`bash -c "$(cat <<EOF ... EOF)"`)을 호출 (CC #58904 회귀 활용 또는 우연),
- **I want to** bkit `hooks/unified-bash-pre.js`가 heredoc 감지 후 AskUserQuestion (deny가 아닌 warning + confirm) 발화하기,
- **so I can** CC PreToolUse Defense Layer 2 우회 위험을 차단하면서 legitimate heredoc 사용을 보존할 수 있다.

### Job Story 3 — defense layer 6 (post-hoc audit)

- **When** Layer 1-5 (PreToolUse + intent-router + memory advisory + audit + rollback)가 모두 통과한 후에도 사용자가 의도하지 않은 변경이 발생,
- **I want to** Layer 6가 post-hoc audit + alarm + auto-rollback을 단일 layer로 제공하기,
- **so I can** CC R-3 numbered #145 (16d 정체) + evolved 12건 등 모델 무시 패턴이 산발적으로 발생해도 사후 복구 가능하다.

### Job Story 4 — postToolUse continueOnBlock moat

- **When** PostToolUse hook가 무언가 차단 결정을 내림 (예: 위험한 git push to upstream),
- **I want to** bkit가 continueOnBlock + reason을 audit log에 무손실 기록하기,
- **so I can** CC #57317 5-streak silent drop을 우회하고 사용자가 차단 사유를 사후 추적할 수 있다.

### Job Story 5 — OTEL gen_ai.* unified emit

- **When** Sprint 진행 중 OTEL trace를 외부 백엔드 (Langfuse/OpenLIT/Uptrace)로 emit,
- **I want to** bkit가 gen_ai.* semantic conventions 10 metrics + subprocess env hydrate (CARRY-5 closure)를 통합 제공하기,
- **so I can** 외부 GenAI observability 백엔드 0-config 연동 + token-meter zero entries 해소를 동시 달성할 수 있다.

### Job Story 6 — sprint master planner dogfooding

- **When** 사용자가 v2.1.13 GA Sprint Management 활용 시작 (본 sprint = first spawn),
- **I want to** sprint-master-planner agent가 master plan + PRD + Plan + Design 4 문서를 단일 spawn에서 생성하기,
- **so I can** Sprint v2.1.13 GA self-validation 데이터를 축적하고 K9 dogfooding KPI 1건을 충족할 수 있다.

### Job Story 7 — Memory Enforcer 격상

- **When** 모델 (Opus 4.7)이 CLAUDE.md directive를 advisory로 처리하고 무시하는 패턴 (#56865, #57485, #58887 R-3 evolved),
- **I want to** bkit가 PreToolUse deny-list enforced로 격상하기 (CC advisory → bkit enforced),
- **so I can** advisory 우회를 물리적으로 차단하고 차별화 #1 product moat를 명시화할 수 있다.

### Job Story 8 — Effort-aware Adaptive Defense

- **When** Sprint Phase Timeout 4h 임박 또는 사용자가 `effort.level=high` 명시,
- **I want to** bkit가 defense intensity를 effort.level에 따라 분기하기 (low → minimum, high → maximum),
- **so I can** CC F4-133 surface를 활용한 차별화 #4 (bkit 모방 어려운 영역)를 정식 출시할 수 있다.

---

## 3. User Personas

### 3.1 Persona 1 — vibecoder (1차 사용자, first wave)

- **목표**: Sprint v2.1.13 GA 활용해 multi-feature initiative를 8-phase container로 통합 관리
- **요구사항**: (a) Trust L2 default 안전망 / (b) 차별화 6/6 가시화 / (c) cache 토큰 절감 효과 가시화 / (d) dogfooding 데이터 신뢰
- **Pain point**:
  - CC parallel default로 cache_creation 폭증 (체감 토큰 5,534 → 22,713 회복 필요)
  - PreToolUse Defense 우회 (heredoc/push event) 위험 인지 부족
  - Sprint Management v2.1.13 GA 사용 사례 0건 → 신뢰 baseline 부족

### 3.2 Persona 2 — kay (POPUP STUDIO, 메인테이너)

- **목표**: bkit 차별화 product moat 강화 + sprint-master-planner agent 첫 spawn 검증
- **요구사항**: (a) 차별화 streak 추적 dashboard / (b) dogfooding 자가평가 누적 / (c) Clean Architecture 4-Layer Maturity 유지 (Port 7→8)
- **Pain point**:
  - 차별화 implicit (4건) → 사용자 onboarding 시 명시화 부재
  - CARRY-5 #17 token-meter zero entries 1+ sprint 미해결
  - Application Layer 도메인 2 → 3 시점 결정 부담 (v2.1.14 vs v2.1.15)

### 3.3 Persona 3 — 외부 도구 사용자 (Cursor/Windsurf/Aider/Continue.dev migration 후보)

- **목표**: Claude Code plugin 비교 검토 + bkit 차별화 외부 검증
- **요구사항**: (a) "유일한 verified spec compliance plugin" 주장 명확 / (b) battlecard 표 / (c) 기능 비교 demo (cache 절감 GIF)
- **Pain point**:
  - bkit README/SNS 차별화 명시 부재 → 비교 어려움
  - Sprint Management 8-phase 외부 0건 패턴 신뢰 baseline 부족

---

## 4. Solution Overview

### 4.1 구조 + 모듈

```
[User] --> [/sprint v2114-differentiation-release ...]
              │
              v
[sprint-orchestrator agent] (v2.1.13)
              │
              ├─> [sprint-master-planner agent] (1st spawn dogfooding ← 본 sprint)
              │
              └─> Sub-sprint 1-6 8-phase 진행
                          │
                          v
                  [4-Layer Clean Architecture]
                          │
              ┌───────────┼───────────────────────────────┐
              v           v                               v
      [Application] [Domain]                        [Infrastructure]
      (pdca + sprint) (ports/×8 + guards/ + rules/) (adapters/×6+1)
              │           │                               │
              │           └─> caching-cost.port (NEW)     │
              │                       │                   │
              │                       v                   │
              │             [caching-cost-cli adapter] ───┘
              │                       │
              v                       v
      [Orchestrator Layer]    [Domain Guards (invariant 9 → 10)]
      (5 modules + sub-agent-dispatcher NEW)
              │
              v
      [Hooks Layer] (21 events / 24 blocks)
              │
              v
      [User PRE-WORK + POST-WORK]
```

### 4.2 핵심 결정 5건

1. **Port +1만 우선** (caching-cost.port), Application Layer 3 도메인은 v2.1.15 명시 이관
2. **차별화 6건 동시 명시화** + streak 추적 (R6 완화 = 분기 별 보강 정책)
3. **L4만 강제 sequential** + L2/L3 opt-in (ENH-292 R1 완화)
4. **Heredoc 보수적 regex MVP** + AskUserQuestion (R2 완화)
5. **L2 default 강제** + phase-timeout 4h + budget 1M (R5 완화)

### 4.3 데이터 흐름 (단순화)

```
[CC tool call] -> [PreToolUse hook] -> [unified-bash-pre.js (heredoc-detector + memory-enforcer + effort-aware)] -> [tool 실행]
                                                                                                                       │
                                                                                                                       v
                                                                                              [PostToolUse hook (continueOnBlock + reason audit)]
                                                                                                                       │
                                                                                                                       v
                                                                                                       [Layer 6: post-hoc audit + alarm + auto-rollback]
                                                                                                                       │
                                                                                                                       v
                                                                                                                  [OTEL emit (gen_ai.*) + cache-cost-analyzer]
```

---

## 5. Success Metrics

### 5.1 정량 메트릭

| Metric | Target | 측정 방법 |
|--------|--------|----------|
| **K1** 토큰 비용 절감률 (cache hit 4% → 40%) | ≥36 pp 상승 | `cache-cost-analyzer` + OTEL `gen_ai.cache_*` |
| **K2** Heredoc 차단율 (30+ adversarial TC) | =100% | unit TC + L3 contract |
| **K3** OTEL coverage (10 metrics × phases) | ≥80% | OTEL ndjson trace |
| **K4** Port 신설 (7 → 8) | =8 | `check-domain-purity` CI |
| **K6** matchRate (Design ↔ Code) | ≥90 (100 목표) | gap-detector |
| **K7** dataFlowIntegrity (7-Layer S1) | =100 | sprint-qa-flow agent |
| **K8** 회귀 0건 (consecutive 96 유지) | =0 critical | regression-rules-checker |
| **K9** dogfooding | =1 (본 sprint) | 본 문서 + Report |
| **K10** 차별화 명시화 (README + battlecard) | =6/6 | docs-code-scanner |

### 5.2 정성 메트릭

- 코드 품질: Clean Architecture 4-Layer Maturity 유지 + invariant 10 신설 (ENH-307)
- UX 일관성: 차별화 6/6 README + battlecard + SNS 캠페인 톤 통일
- 문서 완성도: master-plan + PRD + Plan + Design 4종 + Report = 5종 100%

---

## 6. Out-of-scope (v2.1.14 명시 제외)

| 항목 | 이월 sprint / release | 사유 |
|------|---------------------|------|
| Application Layer 3 도메인 (`agent-dispatch/`) | v2.1.15 | R4 동시 변경 회귀 위험 |
| 차별화 #7 (Workflow Durability Native, #58895) | v2.1.16+ (1-2 cycles 관찰) | external 신호 발굴 단계, 정식 편입 시기 미정 |
| bkit-gemini fork 통합 (CARRY-6) | 별도 branch / sprint | scope 분리 |
| MCP 3rd server | v2.1.15+ (alwaysLoad 측정 후) | ENH-282 측정 결과 의존 |
| Trust Level L3/L4 default 변경 | v2.1.15+ (auto-pause baseline 누적 후) | R5 안전망 baseline 부족 |
| v2.1.142+ CC 버전 분석 | 별도 분석 사이클 | 본 sprint scope 격리 |
| sprint-orchestrator agent 자체 개선 | v2.1.15+ | sprint-master-planner dogfooding 완료 후 분기 |

---

## 7. Stakeholder Map

| Stakeholder | Role | Sprint 영향 | 응답 의무 |
|-------------|------|-----------|---------|
| **kay (POPUP STUDIO)** | Decision maker + 메인테이너 | 전 phase (gate별 confirm) | 본 sprint dogfooding 검증 + Open Questions 5건 결정 |
| **vibecoder (1차 사용자)** | first wave Sprint v2.1.13 GA | PRD Job Stories 출처 + Report 활용 | feedback 데이터 (cache 절감 체감, heredoc false-positive 보고) |
| **외부 도구 사용자** | 비교 검토 대상 | PRD Battlecard + Report 차별화 명시 | (없음, observation only) |
| **CC stable v2.1.128 drift +13 사용자** | 보호 안내 대상 | README + Plan CC 권장 버전 안내 | v2.1.123 보수 권장 (drift +18 경고) |
| **bkit:sprint-master-planner agent** | 본 sprint 첫 spawn 대상 | 본 master plan + PRD + Plan + Design + Report | K9 dogfooding KPI 충족 (1건) |

---

## 8. Pre-mortem (실패 시나리오 + 사전 방지) — 6 critical + 3 observation

### Scenario A: ENH-292 sequential dispatch latency 증가 (R1)

- **영향**: 첫 spawn 1.5-2x 지연 → 사용자 체감 속도 저하 → opt-out 폭증 → 차별화 #3 product moat 손상
- **방지**:
  - 첫 spawn만 sequential, cache hit 후 parallel 복원 (state machine)
  - L4만 강제, L2/L3 user-choice (`BKIT_SEQUENTIAL_DISPATCH=0` opt-out)
  - cache-cost-analyzer OTEL trace 실시간 측정 + sub-agent-dispatcher 자가조정

### Scenario B: ENH-310 regex false-positive (R2)

- **영향**: legitimate heredoc 패턴 차단 → 사용자 unblock 호출 폭증 → Defense Layer 2 신뢰성 손상
- **방지**:
  - 보수적 패턴 (`\$\(` + `<<` 동시 명시)
  - Defense Layer 2 격리 (warning + AskUserQuestion, deny 아님)
  - 30+ adversarial TC + 20+ legitimate TC 명시
  - opt-out flag (`BKIT_HEREDOC_DEFENSE=0`)

### Scenario C: sprint-master-planner agent 0 사용 사례 (R3)

- **영향**: 본 spawn 출력 품질 미보장 → dogfooding 신뢰 baseline 부족 → 다음 sprint 활용 망설임
- **방지**:
  - Step A thinking amplifier 선행 (본 사이클 적용 완료)
  - 사람 review 필수 (kay)
  - 첫 sprint 최소 scope (13 ENHs 중 P0 단독 + P1 통합으로 분할)
  - dogfooding 자체가 K9 KPI (자가검증)

### Scenario D: Port 7→8 + Application Layer 동시 변경 회귀 (R4)

- **영향**: 96 consecutive 호환 손상 → ADR 0003 17/17 PASS 무력화 → 사용자 신뢰 손상
- **방지**:
  - **Port +1만 우선** (caching-cost.port)
  - **Application 추가는 v2.1.15 명시 이관** (Anti-Mission 명시)
  - check-domain-purity CI gate 유지
  - docs-code-scanner trace + 회귀 가드 invariant 10 신설 (ENH-307)

### Scenario E: Trust L4 + auto-pause 0 발화 baseline (R5)

- **영향**: 사용자 무한 실행 → 토큰 폭증 → budget 1M 초과 후 abort 강제
- **방지**:
  - v2.1.14 default **L2 강제** (`bkit.config.json:sprint.defaultTrustLevel`)
  - phase-timeout 4h (1M token budget 내 safety margin 250K)
  - sub-sprint 별 8-phase 명시
  - `/sprint pause` 사용자 옵션 명시

### Scenario F: 차별화 6건 동시 명시화 후 CC 따라잡기 시 동시 무력화 (R6)

- **영향**: 차별화 모두 명시화 → CC가 모방하면 product moat 동시 손실 → SaaS 차별화 손상
- **방지**:
  - streak 추적 dashboard 도입 (각 차별화별 streak 모니터링)
  - 분기 별 보강 정책 (v2.1.15 차별화 #7 정식 편입 검토)
  - bkit 차별화 SaaS / open-source 양면 전략 (PRD §3 GTM)
  - bkit 자체 진화 속도 가속 (sprint cycle 4-5주 유지)

### Scenario G: MON-CC-NEW-NOTIFICATION (#58909) regression 증가 (R7)

- **영향**: 1-cycle 관찰 후 v2.1.15 결정 지연
- **방지**: 1-cycle 관찰 + 카운터 누적 + 의사결정 시점 v2.1.15 명시

### Scenario H: 차별화 #7 (Workflow Durability) 정식 편입 시기 (R8)

- **영향**: 1-2 cycles 관찰 → v2.1.16+ 결정 지연
- **방지**: 1-2 cycles 관찰 + #58895 streak 추적 + 의사결정 v2.1.16+

### Scenario I: bkit-gemini fork stale 채택 (CARRY-6, R9)

- **영향**: fork 환경 사용자에 영향, 본 sprint scope 외
- **방지**: CARRY-6 별도, 본 sprint Out-of-scope 명시

---

## 9. GTM (Go-To-Market) — v2.1.14 차별화 명시화 캠페인

### 9.1 README 차별화 6+1 명시 섹션 (v2.1.14 추가)

```markdown
## bkit Differentiation (6 + observation)

| # | 차별화 | vs CC | streak | bkit ENH |
|---|--------|-------|--------|---------|
| 1 | Memory Enforcer | CC advisory only | R-3 evolved 12+건 | ENH-286 |
| 2 | Defense Layer 6 (post-hoc audit + auto-rollback) | CC R-3 numbered #145 (16d 정체) | violation 11+건 | ENH-289 |
| 3 | Sequential Dispatch (sub-agent caching 10x mitigation) | CC #56293 11-streak | streak 11+ | ENH-292 |
| 4 | Effort-aware Adaptive Defense | CC F4-133 surface only | (활용 0) | ENH-300 |
| 5 | PostToolUse continueOnBlock Moat | CC #57317 5-streak silent drop | streak 5+ | ENH-303 |
| 6 | Heredoc Pipe Bypass Defense | CC #58904 v2.1.73~v2.1.141 회귀 (68 versions) | 68+ versions | ENH-310 |
| 7 (observation) | Workflow Durability Native | CC #58895 UserIdle 자기충족 | observation | (v2.1.16+) |
```

### 9.2 SNS 차별화 캠페인 (각 차별화별 GIF demo)

- 캠페인 1: "ENH-292 sequential dispatch — cache hit 4% → 40% 비포 애프터 GIF"
- 캠페인 2: "ENH-310 heredoc bypass defense — CC #58904 68 versions 회귀 차단 demo"
- 캠페인 3: "ENH-303 continueOnBlock — CC silent drop 우회 audit log demo"
- 캠페인 4: "ENH-286 Memory Enforcer — CC advisory vs bkit enforced 비교"
- 캠페인 5: "ENH-289 Layer 6 — post-hoc audit + auto-rollback demo"
- 캠페인 6: "ENH-300 Effort-aware — defense intensity 분기 demo"

### 9.3 양면 전략

- **open-source (bkit GitHub)**: 차별화 6/6 명시화 + README battlecard + 외부 도구 비교 표 (Cursor/Windsurf/Aider/Continue.dev)
- **SaaS (POPUP STUDIO)**: 사용자 dashboard에 cache-cost-analyzer + streak 추적 + dogfooding 사례 누적

---

## 10. Beachhead Segment + ICP (Ideal Customer Profile)

### 10.1 Beachhead Segment

**vibecoder Sprint v2.1.13 GA 사용자 first wave** — Sprint Management v2.1.13 GA를 활용해 multi-feature initiative를 8-phase container로 통합 관리하려는 사용자 (0건 baseline, 본 sprint 1건 추가 후 1건).

### 10.2 ICP (Ideal Customer Profile)

| 차원 | 값 |
|------|---|
| **Role** | Solo developer / small team lead (1-5명) |
| **Stack** | Claude Code CLI (v2.1.123 ~ v2.1.141 권장) + Node.js + Git |
| **Pain** | (a) sub-agent caching 10x 비용 폭증 / (b) heredoc bypass 위험 / (c) Sprint Management 패턴 외부 0건 신뢰 부족 / (d) Multi-feature initiative 통합 관리 부재 |
| **Budget** | $200/month Anthropic Max (M5 plan) ~ $1,000/month Anthropic API |
| **Migration source** | Cursor (verified spec 부재) / Windsurf (logging-based) / Aider (2-phase 부족) / Continue.dev (4-step 부족) |
| **Trust Level 선호** | L2 (default) → 안정 후 L3 |

---

## 11. Battlecard (외부 도구 대비)

§ Master Plan 8.1 매트릭스 인용. 추가 비교:

| 기능 | bkit v2.1.14 | Cursor | Windsurf | Aider | Continue.dev |
|------|:------------:|:------:|:--------:|:-----:|:------------:|
| **License** | Apache 2.0 | Proprietary | Proprietary | Apache 2.0 | Apache 2.0 |
| **Plugin runtime** | Claude Code | VSCode fork | VSCode fork | CLI | VSCode/JetBrains |
| **Sprint Management 8-phase** | ✅ (v2.1.13 GA) | ❌ | ❌ | ❌ | ❌ |
| **PDCA 9-phase per-feature** | ✅ | ❌ | ❌ | partial (2-phase) | partial (4-step) |
| **Trust Level L0-L4 + 4 auto-pause** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Sub-agent caching mitigation** | ✅ (v2.1.14) | ❌ | ❌ | ❌ | ❌ |
| **Heredoc Bypass Defense** | ✅ (v2.1.14) | ❌ | ❌ | ❌ | ❌ |
| **PostToolUse continueOnBlock** | ✅ (v2.1.14) | ❌ | ❌ | ❌ | ❌ |
| **OTEL gen_ai.* emit** | ✅ (v2.1.14) | ❌ | partial | ❌ | ❌ |
| **Verified spec compliance** | ✅ (matchRate + S1) | ❌ | ❌ | ❌ | ❌ |
| **외부 검증 인용** | "외부 0건 확인" (External B.4) | - | - | - | - |

---

## 12. Test Scenarios (PRD 수준 outline, Design에서 상세)

### 12.1 L1 Unit Test 시나리오 (sub-sprint 별)

- Coordination: sub-agent-dispatcher state machine 진행 (8 states) + cache-cost-analyzer threshold 분기
- Defense: heredoc-detector regex 30+ adversarial + 20+ legitimate / memory-enforcer deny-list / continueOnBlock + reason
- A Observability: OTEL emit gen_ai.* 10 metrics / otel-env-capturer write/hydrate
- E Defense: memory-enforcer PreToolUse / effort-aware 분기 / invariant 10 guard
- Doc: release_drift_score 정확도 / skill frontmatter 1536-char

### 12.2 L2 Integration

- Coordination → Defense → A Observability sub-sprint cross-flow
- caching-cost.port ↔ caching-cost-cli adapter 통합
- session-start.js → otel-env-capturer 통합

### 12.3 L3 Contract / Cross-Sprint Integration

- v2.1.13 sprint-orchestrator + sprint-master-planner ↔ 본 sprint 14 sub-sprint
- Port 8쌍 contract (check-domain-purity invariant CI)
- gap-detector matchRate ≥90 cross-sprint
- regression-rules-checker 96 consecutive 유지

### 12.4 L4 E2E (선택)

- `/sprint init v2114-differentiation-release` → 8-phase 통과 → archived 1건 (dogfooding)

### 12.5 L5 Performance (선택)

- cache hit 4% → ≥40% 측정 (1주 trace)
- heredoc-detector throughput (1000+ events/sec)

---

## 13. PRD 완료 Checklist

- [x] Context Anchor 5건 모두 작성 (§0)
- [x] Problem Statement 부재 매트릭스 (§1.1) + 기대 상태 (§1.2)
- [x] Job Stories 8건 (§2, 최소 5건 초과)
- [x] User Personas 3건 (§3, 1+ 충족)
- [x] Solution Overview 구조 + 데이터 흐름 (§4)
- [x] Success Metrics 정량 K1-K10 + 정성 (§5)
- [x] Out-of-scope 매트릭스 (§6)
- [x] Stakeholder Map 5명 (§7)
- [x] Pre-mortem 9 시나리오 (§8, 최소 5 초과)
- [x] GTM 차별화 6+1 캠페인 (§9, 사용자 요구)
- [x] Beachhead + ICP (§10, 사용자 요구)
- [x] Battlecard (§11, 사용자 요구)
- [x] Test Scenarios outline (§12)

---

**Next Phase**: Phase 2 Plan — Requirements + Feature Breakdown + Quality Gates + Risks + Implementation Order (`docs/sprint/v2114/plan.md`).
