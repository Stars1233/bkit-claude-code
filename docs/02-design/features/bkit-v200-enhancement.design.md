# bkit v2.0.0 통합 설계서 (Design Document)

> **Summary**: bkit v2.0.0 "AI Native Development OS" — 7대 영역 통합 상세 설계
>
> **Project**: bkit Vibecoding Kit
> **Version**: v1.6.2 → v2.0.0
> **Author**: 10-Agent Design Team (Claude Opus 4.6)
> **Date**: 2026-03-19
> **Status**: Draft
> **Planning Doc**: [bkit-v200-enhancement.plan.md](../../01-plan/features/bkit-v200-enhancement.plan.md)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | PDCA 12회 수동 개입, AI 행동 블랙박스, 시각화 부재, common.js God Module, State 동시성 부재 |
| **Solution** | 상태 머신 워크플로우 엔진 + 5단계 제어(L0-L4) + CLI 대시보드 + Decision Trace + 품질 게이트 자동화 + MCP Server + Studio 준비 |
| **Function/UX** | "feature 설명 → PDCA 자동 완주", 실시간 진행 바, 승인 게이트에서만 개입, 체크포인트/롤백 |
| **Core Value** | PDCA 완주율 40%→90%, 수동 개입 80%↓, Hook 성능 50%↑, Quality Score 72→85+ |

---

## 설계 문서 구조

본 통합 설계서는 10개 전문 에이전트가 병렬로 작성한 영역별 상세 설계서를 참조합니다.

### 영역별 상세 설계서 목록

| # | 영역 | 설계 에이전트 | 상세 설계서 경로 | 핵심 산출물 |
|---|------|-------------|----------------|-----------|
| 1 | 워크플로우 자동화 엔진 | enterprise-expert | [bkit-v200-area1-workflow-engine.design.md](./bkit-v200-area1-workflow-engine.design.md) | 상태 머신, YAML DSL, 자동화 레벨, Do 감지, Full-Auto, 병렬 Feature, /batch, Resume |
| 2 | 통제 가능한 AI | security-architect | [bkit-v200-controllable-ai.design.md](./bkit-v200-controllable-ai.design.md) | L0-L4 제어, Permission v2.0, 가드레일 20규칙, Trust Score, Decision Trace, 감사 로그 |
| 3 | 시각화 UX | frontend-architect | [bkit-v200-area3-visualization-ux.design.md](./bkit-v200-area3-visualization-ux.design.md) | lib/ui/ 6컴포넌트, ANSI 대시보드, agent-state v2.0 |
| 4 | 아키텍처 리팩토링 | code-analyzer | [bkit-v200-area4-architecture.design.md](./bkit-v200-area4-architecture.design.md) | common.js 제거, session-start 분할, StateStore, BkitError, pdca-status v3.0 |
| 5 | CC 기능 활용 | cc-version-researcher | (에이전트 결과 내 포함) | PLUGIN_DATA v2, Agent Frontmatter, Memory, Hook 6개, 품질 게이트, Marketplace |
| 6 | MCP Server 번들링 | bkend-expert | [bkit-v200-mcp-server-bundling.design.md](./bkit-v200-mcp-server-bundling.design.md) | bkit-pdca-server 10도구, bkit-analysis-server 6도구, .mcp.json |
| 7 | Studio 연동 준비 | product-manager | [bkit-v200-studio-integration.design.md](./bkit-v200-studio-integration.design.md) | 8개 데이터 포맷, 파일 폴링+MCP 이중 아키텍처 |
| 8 | 품질 게이트+QA | qa-strategist | (에이전트 결과 내 포함) | 7단계 게이트, 10대 메트릭, 회귀 방지, Zero Script QA 2.0 |
| 9 | 데이터 모델 통합 | design-validator | (에이전트 결과 내 포함) | 16개 JSON 스키마, 정합성 검증 14항목 |
| 10 | 모듈 통합+Hook 흐름 | Explore | (에이전트 결과 내 포함) | Hook 실행 흐름, 30모듈 의존성 맵, 초기화 9Phase |

---

## 1. 전체 아키텍처 개요

### 1.1 신규 모듈 구조 (30+ 모듈)

```
lib/
├── core/          (기존 8 + 신규 4 = 12)
│   ├── constants.js          매직 넘버 중앙화 (38개 상수)
│   ├── state-store.js        StateStore 추상화 (파일 잠금)
│   ├── hook-io.js            Hook 초경량 I/O
│   ├── errors.js             BkitError (7도메인, 29코드)
│   └── backup-scheduler.js   Debounced 백업
│
├── pdca/          (기존 8 + 신규 7 = 15)
│   ├── state-machine.js      선언적 PDCA FSM (20전이, 10가드, 17액션)
│   ├── workflow-parser.js    YAML 워크플로우 파서 (자체 구현)
│   ├── workflow-engine.js    워크플로우 실행 엔진
│   ├── do-detector.js        Do 완료 3-Layer 감지
│   ├── full-auto-do.js       Design 기반 자동 구현
│   ├── feature-manager.js    병렬 Feature (최대 3개)
│   ├── batch-orchestrator.js /batch + PDCA 연동
│   ├── resume.js             세션 복구
│   ├── circuit-breaker.js    Circuit Breaker
│   └── lifecycle.js          PDCA 라이프사이클 + Cleanup
│
├── ui/            (신규 7)
│   ├── ansi.js               ANSI 색상/스타일
│   ├── progress-bar.js       PDCA 진행 바
│   ├── workflow-map.js       워크플로우 맵
│   ├── agent-panel.js        Agent Team 패널
│   ├── impact-view.js        변경 영향 뷰
│   ├── control-panel.js      제어 패널
│   └── index.js              공개 API
│
├── control/       (신규 7)
│   ├── automation-controller.js  L0-L4 레벨 관리
│   ├── destructive-detector.js   파괴적 작업 감지 (8규칙)
│   ├── checkpoint-manager.js     체크포인트/롤백 (SHA-256)
│   ├── loop-breaker.js           무한 루프 방지 (4규칙)
│   ├── blast-radius.js           변경 영향 범위
│   ├── scope-limiter.js          범위 제한
│   └── trust-engine.js           Trust Score (5컴포넌트)
│
├── audit/         (신규 3)
│   ├── audit-logger.js       JSONL 감사 로그 (16 Action Types)
│   ├── decision-tracer.js    의사결정 추적 (15 Decision Types)
│   └── explanation-generator.js  설명 자동 생성
│
├── quality/       (신규 3)
│   ├── gate-manager.js       7단계 품질 게이트
│   ├── metrics-collector.js  10대 메트릭 수집
│   └── regression-guard.js   회귀 방지 규칙
│
hooks/startup/     (신규 5 — session-start.js 분할)
├── migration.js, restore.js, context-init.js
├── onboarding.js, session-context.js
│
scripts/           (신규 6 Hook 스크립트)
├── session-end-handler.js, tool-failure-handler.js
├── instructions-loaded-handler.js, config-change-handler.js
├── permission-request-handler.js, notification-handler.js
│
skills/            (신규 4)
├── control/SKILL.md, audit/SKILL.md
├── rollback/SKILL.md, pdca-batch/SKILL.md
│
servers/           (신규 2 MCP 서버)
├── bkit-pdca-server/    (10 도구 + 3 리소스)
└── bkit-analysis-server/ (6 도구)
│
.bkit/workflows/   (신규 3 YAML 워크플로우)
├── default.workflow.yaml
├── hotfix.workflow.yaml
└── enterprise.workflow.yaml
```

### 1.2 핵심 수치 요약

| 항목 | v1.6.2 | v2.0.0 | 변화 |
|------|:------:|:------:|:----:|
| lib/ 모듈 | 42 | ~72 | +30 |
| Exports | 210 | ~350 | +140 |
| Hook Events | 12/22 | 18/22 | +6 |
| Skills | 31 | 35 | +4 |
| Agents | 29 | 29 | 최적화 |
| Scripts | 48 | 54 | +6 |
| MCP Servers | 0 | 2 | +2 |
| 데이터 파일 | 3 | 16 | +13 |
| 총 LOC (신규) | — | ~7,000 | — |

### 1.3 상태 머신 다이어그램

```
                    PDCA State Machine v2.0 (20 전이)
  ┌──────┐  auto   ┌──────┐  auto   ┌────────┐  auto   ┌──────┐
  │ IDLE │───────▶│  PM  │───────▶│  PLAN  │───────▶│DESIGN│
  └──────┘         └──┬───┘         └──┬─────┘         └──┬───┘
                      │ SKIP           │ REJECT            │ auto
                      └────────────────┘                   ▼
                                                      ┌──────┐
                                                      │  DO  │ ◀─ Full-Auto
                                                      └──┬───┘    (Design 기반)
                                                         │ COMPLETE (3-Layer 감지)
                                                         ▼
                           ┌─────────────────────────┌──────┐
                           │                         │CHECK │ ◀─ 3-way 병렬
                           │  ┌──────┐               └──┬───┘   (gap+code+qa)
                           │  │ ACT  │◀──── <90% ──────┘
                           │  └──┬───┘          │
                           │     │ re-check     │ ≥90%
                           │     └──────────────▼
                           │               ┌────────┐  auto  ┌─────────┐
                           │               │ REPORT │───────▶│ARCHIVED │
                           │               └────────┘         └─────────┘
                           │ MAX_ITER ─────────┘
```

### 1.4 자동화 레벨별 승인 게이트

```
         L0 Manual   L1 Guided   L2 Semi-Auto   L3 Auto   L4 Full-Auto
idle→pm    Gate        Gate         Gate          Gate      Gate(1회)
pm→plan    Gate        Gate         Auto          Auto      Auto
plan→dsn   Gate        Gate         Auto          Auto      Auto
dsn→do     Gate        Gate         Auto          Auto      Auto
do→check   Gate        Gate         Confirm       Auto      Auto
check→act  Gate        Gate         Auto          Auto      Auto
check→rpt  Gate        Gate         Gate          Auto      Auto
rpt→arch   Gate        Gate         Gate          Gate      Auto
```

### 1.5 Hook 실행 흐름 (v2.0.0)

**PreToolUse 6단계 가드레일:**
```
Permission Check → Level Check → Destructive Op Detection
→ Scope Check → Budget Check → Plan Preview → Tool 실행
```

**PostToolUse 7단계 분석:**
```
PDCA Status → Audit Log → Decision Trace → Trust Score
→ Loop Detection → Quality Gate → Auto Transition
```

---

## 2. 영역별 설계 요약

### 2.1 영역 1: 워크플로우 자동화 엔진

- **상태 머신**: 20전이, 10가드, 17액션, `from: '*'` 와일드카드
- **YAML DSL**: 자체 파서 ~250 LOC, 3종 워크플로우 (default/hotfix/enterprise)
- **Do 감지**: 명시적(패턴매칭) → 암묵적(파일비교) → 확인(AskUserQuestion)
- **Full-Auto Do**: Design 파싱 → 태스크 분해 → Agent Team 자동 구성
- **병렬 Feature**: 최대 3개, Do 배타적 잠금, Feature별 독립 상태
- **Resume**: Circuit Breaker(CLOSED/OPEN/HALF-OPEN) + `.resume.json`

### 2.2 영역 2: 통제 가능한 AI

- **L0-L4**: 16작업 × 5레벨 행동 매트릭스
- **가드레일**: G-001~G-008 파괴적 작업, B-001~B-006 Blast Radius, LB-001~LB-004 루프
- **Trust Score**: 5컴포넌트 가중치, 증가 5규칙 + 감소 7규칙, 쿨다운 30분
- **보안 핵심**: L4에서도 force push/DROP은 gate 유지, 상승 1단계+쿨다운, 하락 즉시

### 2.3 영역 3: 시각화 UX

- **6컴포넌트**: ansi, progress-bar, workflow-map, agent-panel, impact-view, control-panel
- **기술**: 순수 ANSI escape + Unicode Box Drawing (npm 의존성 0)
- **agent-state v2.0**: matchRate, iterationHistory, pendingApprovals, agentEvents

### 2.4 영역 4: 아키텍처 리팩토링

- **common.js 제거**: 210 export 전수 분석, 48 scripts 5단계 점진 마이그레이션
- **session-start 분할**: 787줄 → 5모듈 + orchestrator(60줄)
- **StateStore**: tmp+rename 원자적 쓰기 통일, lock/unlock Team 동시성
- **BkitError**: 7도메인, 29코드, 4단계 severity, safeCatch() 헬퍼
- **pdca-status v3.0**: stateMachine, phaseTimestamps, metrics, team, automation

### 2.5 영역 5: CC 기능 활용

- **PLUGIN_DATA v2**: 6개 하위 디렉토리, Debounced 5초, diff 기반 변경 감지
- **Agent Frontmatter**: 29개 전수 분석 (변경 2개: memory 추가)
- **Agent Memory**: 핵심 10개 학습 정의, PLUGIN_DATA 동기화
- **Hook 6개**: SessionEnd, PostToolUseFailure, InstructionsLoaded, ConfigChange, PermissionRequest, Notification
- **Marketplace**: plugin.json v2.0, displayName, categories, engines

### 2.6 영역 6: MCP Server

- **bkit-pdca-server**: 10 도구 (상태/히스토리/문서CRUD/메트릭) + 3 리소스
- **bkit-analysis-server**: 6 도구 (품질/갭분석/회귀규칙/체크포인트/감사검색)
- **안전성**: 쓰기 도구 1개만 (regression_rules), readJsonOrNull 패턴

### 2.7 영역 7: Studio 연동 준비

- **이중 아키텍처**: 파일 폴링(기본) + MCP(선택), MCP 실패 시 파일 자동 폴백
- **8개 데이터 포맷**: agent-state v2.0, agent-events.jsonl, control-state.json, YAML 스키마, 체크포인트, 메트릭, 감사 로그, MCP 인터페이스
- **핵심 원칙**: Studio 없이 bkit 100% 동작

---

## 3. 데이터 모델 통합

### 3.1 전체 데이터 파일 (16개)

| # | 경로 | 형식 | 신규/확장 | 보존 |
|---|------|:----:|:---------:|:----:|
| 1 | `.bkit/state/pdca-status.json` | JSON | v2.0→v3.0 | 영구 |
| 2 | `.bkit/state/quality-metrics.json` | JSON | 신규 | 영구 |
| 3 | `.bkit/state/quality-history.json` | JSON | 신규 | 100건 |
| 4 | `.bkit/state/regression-rules.json` | JSON | 신규 | 200규칙 |
| 5 | `.bkit/state/trust-profile.json` | JSON | 신규 | 영구 |
| 6 | `.bkit/state/resume/{f}.resume.json` | JSON | 신규 | feature별 |
| 7 | `.bkit/state/workflows/{f}.json` | JSON | 신규 | feature별 |
| 8 | `.bkit/runtime/agent-state.json` | JSON | v1.0→v2.0 | 세션 |
| 9 | `.bkit/runtime/agent-events.jsonl` | JSONL | 신규 | 30일 |
| 10 | `.bkit/runtime/control-state.json` | JSON | 신규 | 영구 |
| 11 | `.bkit/audit/YYYY-MM-DD.jsonl` | JSONL | 신규 | 30일 |
| 12 | `.bkit/decisions/YYYY-MM-DD.jsonl` | JSONL | 신규 | 30일 |
| 13 | `.bkit/checkpoints/cp-{ts}.json` | JSON | 신규 | 100MB |
| 14 | `.bkit/checkpoints/index.json` | JSON | 신규 | 영구 |
| 15 | `.bkit/workflows/*.workflow.yaml` | YAML | 신규 | 영구 |
| 16 | `bkit.config.json` | JSON | v1.6.2→v2.0 | 영구 |

### 3.2 정합성 검증 결과 (14항목)

- **PASS 11**: feature키 일관성, camelCase 통일, ISO 8601, AutomationLevel/PdcaPhase 타입, trustScore 범위, deprecated 경로, 체크포인트 정합성, JSONL 패턴, version 호환, history 상한, 마이그레이션 완전성
- **WARN 3**: pendingApprovals 이중저장 → control-state 정본으로 통일 권고, matchRate 이중저장 → pdca-status 정본, version 형식 불일치 → schemaVersion rename 고려

---

## 4. 구현 로드맵 (11주)

| 주차 | Phase | 핵심 산출물 | LOC |
|:----:|:-----:|-----------|:---:|
| 1-2 | Core Foundation | constants, errors, state-store, hook-io, session-start 분할 | ~800 |
| 3-4 | Workflow Engine | state-machine, automation-controller, do-detector, resume, circuit-breaker, lifecycle | ~1,200 |
| 5-6 | UI + Audit | lib/ui/ 6컴포넌트, audit-logger, decision-tracer, SessionStart 개선 | ~1,400 |
| 7-8 | Safety Guardrails | lib/control/ 7모듈, lib/quality/ 3모듈 | ~1,200 |
| 9-10 | CC Integration | PLUGIN_DATA v2, Hook 6개, Skills 4개, Agent Frontmatter, common.js 제거 완료 | ~1,600 |
| 11 | QA + Launch | 회귀 테스트, 성능 검증, MCP Server, Marketplace 준비 | ~800 |
| **총** | | | **~7,000** |

---

## 5. "통제 가능한 AI" 4원칙

| 원칙 | 구현 |
|------|------|
| **안전 기본값** | L2 Semi-Auto 기본, deny > ask > allow, L4에서도 force push gate |
| **점진적 신뢰** | Trust Score 0-100, 상승 1단계+쿨다운 30분, 하락 즉시 |
| **완전한 가시성** | Decision Trace, 감사 로그 JSONL, Plan Preview, CLI 대시보드 |
| **언제나 중단 가능** | 체크포인트 SHA-256, Emergency Stop, /pdca rollback |

---

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 0.1 | 2026-03-19 | Initial draft (10-Agent Design Team) | Claude Opus 4.6 |
