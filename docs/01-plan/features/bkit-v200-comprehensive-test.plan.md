# bkit v2.0.0 Comprehensive Test Plan (Plan-Plus)

> **Summary**: v2.0.0 전체 기능 + 아키텍처 + 사용자 경험 관점 종합 테스트 계획
>
> **Project**: bkit Vibecoding Kit
> **Version**: v2.0.0
> **Date**: 2026-03-20
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)
> **Baseline**: v1.6.2 기존 1,151 TC (8 perspectives)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | v2.0.0에서 42개 신규 모듈 + 58개 scripts 리팩토링 + 6개 신규 Hook + 4개 Skills 추가. 기존 1,151 TC는 v1.6.2 기준으로 신규 영역을 커버하지 않음 |
| **Solution** | 10개 테스트 관점(기존 8 + 신규 2)으로 1,200+ TC 설계. 기존 45개 테스트 파일 개선 + 신규 30+ 파일 추가 |
| **Function/UX Effect** | v2.0.0 전 기능 검증, 하위 호환성 100% 보장, 신규 모듈 커버리지 90%+ |
| **Core Value** | "코드가 존재한다"가 아닌 "코드가 동작한다"를 증명 |

---

## 1. 테스트 관점 (10 Perspectives)

### 기존 8개 관점 (v1.6.2에서 계승 + 확장)

| # | 관점 | v1.6.2 TC | v2.0.0 목표 | 설명 |
|---|------|:---------:|:----------:|------|
| 1 | **Unit** | 400 | 500+ | 개별 모듈 함수 단위 테스트 |
| 2 | **Integration** | 120 | 180+ | 모듈 간 연동 테스트 |
| 3 | **Security** | 80 | 120+ | 보안 규칙, 권한, 파괴적 작업 차단 |
| 4 | **Regression** | 150 | 180+ | 하위 호환성, CC 버전 호환 |
| 5 | **Performance** | 70 | 90+ | Hook 실행 시간, 모듈 로딩 성능 |
| 6 | **Philosophy** | 60 | 80+ | 3대 철학 (Automation First, No Guessing, Docs=Code) |
| 7 | **UX** | 60 | 100+ | 사용자 경험, CLI 출력, 대시보드 |
| 8 | **E2E** | 20 | 40+ | 종단간 PDCA 사이클 시나리오 |

### 신규 2개 관점

| # | 관점 | v2.0.0 목표 | 설명 |
|---|------|:----------:|------|
| 9 | **Architecture** | 100+ | v2.0.0 아키텍처 검증 (상태 머신, 제어 계층, 감사 시스템) |
| 10 | **Controllable AI** | 80+ | 통제 가능한 AI 4원칙 검증 (안전 기본값, 점진적 신뢰, 가시성, 중단 가능) |

### TC 총 목표: **1,200+ TC** (기존 ~1,151 → v2.0.0 확장)

---

## 2. 관점별 테스트 범위

### 2.1 Unit Tests (500+ TC)

**기존 유지 (400 TC)**:
- common.js exports (→ v2.0.0: 직접 import 검증으로 전환)
- pdca/status, level, phase, automation
- core/config, io, debug, platform, paths, cache, file
- intent/trigger, ambiguity, language
- task/classification, creator, tracker, context
- team/coordinator, orchestrator, state-writer, communication

**신규 추가 (100+ TC)**:

| 모듈 | 테스트 파일 | TC 수 | 핵심 검증 항목 |
|------|-----------|:-----:|-------------|
| `lib/core/constants.js` | `test/unit/constants.test.js` | 15 | 33개 상수 존재, 타입, 범위 |
| `lib/core/errors.js` | `test/unit/errors.test.js` | 20 | BkitError 생성, severity, safeCatch, toJSON |
| `lib/core/state-store.js` | `test/unit/state-store.test.js` | 25 | read/write/lock/unlock/lockedUpdate/appendJsonl 원자성 |
| `lib/core/hook-io.js` | `test/unit/hook-io.test.js` | 10 | readStdinSync, outputAllow/Block/Empty |
| `lib/core/backup-scheduler.js` | `test/unit/backup-scheduler.test.js` | 10 | scheduleBackup, flushBackup, cancel |
| `lib/pdca/state-machine.js` | `test/unit/state-machine.test.js` | 40 | 20전이 각각 검증, guard 10개, action 15개, context |
| `lib/pdca/workflow-parser.js` | `test/unit/workflow-parser.test.js` | 25 | YAML 파싱, 유효성 검증, 3종 템플릿 |
| `lib/pdca/workflow-engine.js` | `test/unit/workflow-engine.test.js` | 20 | 조건 평가, 워크플로우 실행, 상태 관리 |
| `lib/pdca/do-detector.js` | `test/unit/do-detector.test.js` | 15 | 3-Layer 감지, 명시적/암묵적/확인 |
| `lib/pdca/circuit-breaker.js` | `test/unit/circuit-breaker.test.js` | 15 | CLOSED/OPEN/HALF_OPEN 전이, reset |
| `lib/pdca/resume.js` | `test/unit/resume.test.js` | 15 | 생성/로드/복구/정리/만료 |
| `lib/pdca/lifecycle.js` | `test/unit/lifecycle.test.js` | 15 | 초기화/아카이브/stale 감지/타임라인 |
| `lib/pdca/full-auto-do.js` | `test/unit/full-auto-do.test.js` | 15 | Design 파싱, 태스크 분해, 가용성 체크 |
| `lib/pdca/feature-manager.js` | `test/unit/feature-manager.test.js` | 20 | 동시 3개, Do 잠금, 의존성 순환 감지 |
| `lib/pdca/batch-orchestrator.js` | `test/unit/batch-orchestrator.test.js` | 15 | 배치 계획, 그룹 분할, 취소/재개 |
| `lib/control/automation-controller.js` | `test/unit/automation-controller.test.js` | 25 | L0-L4 레벨, gate config, emergency |
| `lib/control/destructive-detector.js` | `test/unit/destructive-detector.test.js` | 20 | G-001~G-008 규칙, 정규식 매칭 |
| `lib/control/checkpoint-manager.js` | `test/unit/checkpoint-manager.test.js` | 20 | 생성/롤백/정리/SHA-256 무결성 |
| `lib/control/loop-breaker.js` | `test/unit/loop-breaker.test.js` | 15 | LB-001~LB-004, 카운터, 에스컬레이션 |
| `lib/control/blast-radius.js` | `test/unit/blast-radius.test.js` | 15 | B-001~B-006, 가중치 점수 |
| `lib/control/trust-engine.js` | `test/unit/trust-engine.test.js` | 25 | Trust Score, 5컴포넌트, 에스컬레이션/다운그레이드 |
| `lib/control/scope-limiter.js` | `test/unit/scope-limiter.test.js` | 15 | 경로 검증, glob 매칭, L0-L4별 범위 |
| `lib/audit/audit-logger.js` | `test/unit/audit-logger.test.js` | 20 | JSONL 기록/조회/요약/정리, 16 Action Types |
| `lib/audit/decision-tracer.js` | `test/unit/decision-tracer.test.js` | 15 | 기록/조회/요약, 15 Decision Types |
| `lib/audit/explanation-generator.js` | `test/unit/explanation-gen.test.js` | 10 | 3단계 상세도 (brief/normal/detailed) |
| `lib/quality/gate-manager.js` | `test/unit/gate-manager.test.js` | 25 | 7단계 게이트, 레벨별 임계값, verdict |
| `lib/quality/metrics-collector.js` | `test/unit/metrics-collector.test.js` | 20 | M1-M10 수집, 히스토리, 트렌드, 6알람 |
| `lib/quality/regression-guard.js` | `test/unit/regression-guard.test.js` | 15 | 규칙 CRUD, 회귀 감지, stale 정리 |
| `lib/ui/ansi.js` | `test/unit/ansi.test.js` | 10 | 색상, 스타일, NO_COLOR, 터미널 너비 |
| `lib/ui/progress-bar.js` | `test/unit/progress-bar.test.js` | 15 | compact/full, 6단계, 퍼센트 바 |
| `lib/ui/workflow-map.js` | `test/unit/workflow-map.test.js` | 10 | 2D 다이어그램, 조건부 분기, swarm |
| `lib/ui/agent-panel.js` | `test/unit/agent-panel.test.js` | 10 | 팀원 목록, 상태 아이콘, 메시지 |
| `lib/ui/impact-view.js` | `test/unit/impact-view.test.js` | 10 | Match Rate 바, 파일 트리, 트렌드 |
| `lib/ui/control-panel.js` | `test/unit/control-panel.test.js` | 10 | 슬라이더, 승인 대기, 긴급 중지 |

### 2.2 Integration Tests (180+ TC)

| 테스트 파일 | TC 수 | 검증 항목 |
|-----------|:-----:|---------|
| `test/integration/hook-wiring.test.js` | 30 | 6개 기존 Hook에서 v2.0.0 모듈 호출 확인 |
| `test/integration/state-machine-flow.test.js` | 25 | 상태 머신 → 기존 status.js 연동 |
| `test/integration/audit-pipeline.test.js` | 20 | Hook → audit-logger → JSONL 기록 체인 |
| `test/integration/quality-pipeline.test.js` | 20 | gap-detector → metrics-collector → gate-manager 체인 |
| `test/integration/control-pipeline.test.js` | 20 | PreToolUse → destructive+blast+scope → Block/Allow |
| `test/integration/common-removal.test.js` | 25 | 58개 scripts 직접 import 동작 확인 |
| `test/integration/config-sync.test.js` (개선) | 15 | bkit.config.json v2.0.0 섹션 로드 |
| `test/integration/module-chain.test.js` (개선) | 15 | 신규 모듈 간 의존성 체인 |
| `test/integration/mcp-server.test.js` | 15 | MCP Server JSON-RPC 프로토콜 |

### 2.3 Security Tests (120+ TC)

| 테스트 파일 | TC 수 | 검증 항목 |
|-----------|:-----:|---------|
| `test/security/destructive-rules.test.js` | 25 | G-001~G-008 전체 규칙 + 우회 불가 검증 |
| `test/security/automation-levels.test.js` | 25 | L0-L4별 행동 매트릭스 (16작업×5레벨) |
| `test/security/checkpoint-integrity.test.js` | 15 | SHA-256 해시 검증, 변조 감지 |
| `test/security/scope-limiter.test.js` | 15 | 경로 제한 우회 불가 (.env, .key, .git) |
| `test/security/trust-score-safety.test.js` | 15 | 레벨 상승 쿨다운, 하락 즉시, L4 gate 유지 |
| `test/security/agent-frontmatter.test.js` (개선) | 15 | 29개 에이전트 disallowedTools, permissionMode |
| `test/security/config-permissions.test.js` (개선) | 10 | 위험 설정 변경 감지 |

### 2.4 Regression Tests (180+ TC)

| 테스트 파일 | TC 수 | 검증 항목 |
|-----------|:-----:|---------|
| `test/regression/v162-compat.test.js` | 30 | v1.6.2 모든 기능 하위 호환 |
| `test/regression/common-removal.test.js` | 25 | common.js 제거 후 기존 기능 동작 |
| `test/regression/pdca-core.test.js` (개선) | 25 | 기존 PDCA 명령어 정상 동작 |
| `test/regression/hooks-22.test.js` | 25 | 22개 Hook 이벤트 등록 + 스크립트 존재 |
| `test/regression/skills-35.test.js` | 25 | 35개 Skills frontmatter + classification |
| `test/regression/agents-29.test.js` | 25 | 29개 Agents frontmatter + memory + effort |
| `test/regression/status-v3-migration.test.js` | 15 | pdca-status v2.0→v3.0 자동 마이그레이션 |
| `test/regression/cc-compat.test.js` (개선) | 15 | CC v2.1.78+ 호환성 |

### 2.5 Performance Tests (90+ TC)

| 테스트 파일 | TC 수 | 검증 항목 |
|-----------|:-----:|---------|
| `test/performance/hook-cold-start.test.js` | 20 | Hook 초기 로딩 시간 (목표: 50% 감소) |
| `test/performance/direct-import.test.js` | 20 | 직접 import vs common.js 성능 비교 |
| `test/performance/state-store-perf.test.js` | 15 | 원자적 쓰기 성능, 잠금 오버헤드 |
| `test/performance/audit-write-perf.test.js` | 15 | JSONL append 성능 (1000건 기록) |
| `test/performance/module-load-perf.test.js` (개선) | 10 | 72개 모듈 개별 로딩 시간 |
| `test/performance/ui-render-perf.test.js` | 10 | UI 컴포넌트 렌더링 시간 |

### 2.6 Philosophy Tests (80+ TC)

| 테스트 파일 | TC 수 | 검증 항목 |
|-----------|:-----:|---------|
| `test/philosophy/automation-first-v2.test.js` | 25 | 상태 머신 자동 전환, Semi-Auto 기본, 게이트 |
| `test/philosophy/no-guessing-v2.test.js` | 20 | Decision Trace, 감사 로그, 설명 생성 |
| `test/philosophy/docs-equals-code-v2.test.js` | 20 | YAML 워크플로우, 품질 게이트, regression guard |
| `test/philosophy/security-by-default.test.js` (개선) | 15 | L2 기본, 파괴적 차단, Trust Score |

### 2.7 UX Tests (100+ TC)

| 테스트 파일 | TC 수 | 검증 항목 |
|-----------|:-----:|---------|
| `test/ux/pdca-dashboard.test.js` | 20 | 진행 바 렌더링, compact/full, 6단계 |
| `test/ux/workflow-map-ux.test.js` | 15 | 워크플로우 맵 가독성, 조건부 분기 |
| `test/ux/agent-panel-ux.test.js` | 15 | Agent 패널, 상태 아이콘, 메시지 |
| `test/ux/control-panel-ux.test.js` | 15 | 슬라이더, 승인 대기, 긴급 중지 |
| `test/ux/impact-view-ux.test.js` | 10 | Match Rate 바, 파일 트리, 트렌드 |
| `test/ux/skill-commands.test.js` | 15 | 4개 신규 Skills 사용성 |
| `test/ux/language-support.test.js` (개선) | 10 | 8개국어 트리거 키워드 |

### 2.8 E2E Tests (40+ TC)

| 테스트 파일 | TC 수 | 검증 항목 |
|-----------|:-----:|---------|
| `test/e2e/pdca-auto-cycle.test.js` | 15 | Semi-Auto PDCA 전체 사이클 |
| `test/e2e/error-recovery.test.js` | 10 | Circuit Breaker → Resume → 재개 |
| `test/e2e/checkpoint-rollback.test.js` | 10 | 체크포인트 생성 → 롤백 → 복구 |
| `test/e2e/run-e2e.sh` (개선) | 5 | claude -p 기반 E2E |

### 2.9 Architecture Tests (100+ TC) — 신규

| 테스트 파일 | TC 수 | 검증 항목 |
|-----------|:-----:|---------|
| `test/architecture/state-machine.test.js` | 25 | 20전이 정합성, 도달 불가 상태 없음, 교착 없음 |
| `test/architecture/module-dependencies.test.js` | 20 | 순환 의존성 0건, DAG 구조 검증 |
| `test/architecture/hook-flow.test.js` | 20 | PreToolUse→Tool→PostToolUse→Stop 흐름 |
| `test/architecture/data-schema.test.js` | 20 | 16개 데이터 파일 스키마 정합성 |
| `test/architecture/export-completeness.test.js` | 15 | 설계서 명시 export vs 실제 export |

### 2.10 Controllable AI Tests (80+ TC) — 신규

| 테스트 파일 | TC 수 | 검증 항목 |
|-----------|:-----:|---------|
| `test/controllable-ai/safe-defaults.test.js` | 20 | L2 기본, deny>ask>allow, L4 force-push gate |
| `test/controllable-ai/progressive-trust.test.js` | 20 | Trust Score 증감, 쿨다운, 에스컬레이션 |
| `test/controllable-ai/full-visibility.test.js` | 20 | audit-logger 기록 완전성, Decision Trace |
| `test/controllable-ai/always-interruptible.test.js` | 20 | emergency stop, checkpoint, rollback |

---

## 3. TC 총 합계

| 관점 | TC 수 | 테스트 파일 수 |
|------|:-----:|:------------:|
| Unit | 500+ | 34 |
| Integration | 180+ | 9 |
| Security | 120+ | 7 |
| Regression | 180+ | 8 |
| Performance | 90+ | 6 |
| Philosophy | 80+ | 4 |
| UX | 100+ | 7 |
| E2E | 40+ | 4 |
| Architecture | 100+ | 5 |
| Controllable AI | 80+ | 4 |
| **총** | **1,470+** | **88** |

---

## 4. 기존 테스트 활용 전략

| 기존 파일 | 처리 | 설명 |
|----------|:----:|------|
| `test/unit/other-modules.test.js` | 개선 | common.js 241→직접 import + 신규 모듈 추가 |
| `test/unit/orchestrator.test.js` | 유지 | 기존 로직 동일 |
| `test/unit/trigger.test.js` | 유지 | 기존 로직 동일 |
| `test/unit/ambiguity.test.js` | 유지 | 기존 로직 동일 |
| `test/regression/hooks-10.test.js` | 대체 | hooks-22.test.js로 확장 |
| `test/regression/agents-21.test.js` | 대체 | agents-29.test.js로 확장 |
| `test/regression/skills-28.test.js` | 대체 | skills-35.test.js로 확장 |
| `test/helpers/assert.js` | 유지 | 기존 assert 프레임워크 활용 |
| `test/helpers/report.js` | 개선 | v2.0.0 report 형식 업데이트 |
| `test/run-all.js` | 개선 | 10개 관점 + 신규 파일 등록 |

---

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 0.1 | 2026-03-20 | Initial draft (Plan-Plus) | Claude Opus 4.6 |
