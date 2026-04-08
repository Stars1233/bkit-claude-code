# Plan: bkit PDCA QA Phase Integration

> **요약**: PDCA 사이클에 독립 QA phase를 추가하고, QA 전문 에이전트팀(qa-lead + 4 sub-agents)을 구성하여 L1~L5 테스트를 자동 수행. Chrome MCP 연동으로 실제 브라우저 동작 검증. iterate 기준 100%로 변경.
>
> **Feature**: bkit-v211-qa-phase-integration
> **Version**: bkit v2.1.1
> **작성자**: Claude Opus 4.6
> **날짜**: 2026-04-08
> **PRD**: docs/00-pm/bkit-v211-qa-phase-integration.prd.md

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | PDCA 사이클에 런타임 검증이 없어 "코드는 있지만 동작하지 않는" 상태를 감지 못함. Check phase는 정적 설계-구현 비교만 수행하며, 실제 UI→API→DB 데이터 흐름이나 브라우저 동작은 미검증 |
| **Solution** | 독립 QA phase 추가 (Check 100% 통과 후 진입) + QA 에이전트팀(qa-lead + 4 sub-agents) + Chrome MCP 연동 L1~L5 테스트 자동 수행 |
| **기능/UX 효과** | `/pdca qa` 명령 하나로 테스트 계획 수립→테스트 코드 생성→Chrome 브라우저 실행→디버그 분석→QA 보고서까지 자동 완성. 개발자가 테스트를 직접 작성하지 않아도 AI QA팀이 전 과정 수행 |
| **핵심 가치** | Vibecoding의 마지막 퍼즐 — "AI가 만든 코드를 AI가 검증". 설계 문서가 곧 테스트 스펙이 되는 Docs=Tests 철학 실현 |

---

## 1. 배경 및 목표

### 1.1 현재 상태
- bkit PDCA: PM → Plan → Design → Do → Check(gap≥90%) ↔ Act → Report
- Check phase: gap-detector(정적 설계-구현 비교)만 수행
- 기존 QA 자산: qa-strategist(sonnet), qa-monitor(haiku), zero-script-qa 스킬
- Chrome MCP: 시스템에 존재하지만 PDCA에 미통합
- 테스트: Node.js 기반 3,278 TC (bkit 자체 테스트), 프로젝트 브라우저 테스트 없음

### 1.2 목표
1. PDCA 사이클에 **독립 QA phase** 추가
2. **QA 전문 에이전트팀** 구성 (PM팀 패턴 복제)
3. **5단계 테스트** 자동화: Unit → API → E2E → UX Flow → Data Flow
4. **Chrome MCP 연동**: 실제 브라우저에서 UI 동작 검증
5. **디버그 로그 시스템**: 구조화된 JSON 로깅 + Request ID 전파
6. **Quality Gate 강화**: Check 기준 90% → 100%

### 1.3 워크플로우 변경

```
현재:  PM → Plan → Design → Do → Check(≥90%) ↔ Act → Report

변경:  PM → Plan → Design → Do → Check(=100%) ↔ Act → QA(L1~L5) → Report
                                                         ↑
                                                   QA 실패 시 Act로 복귀
```

---

## 2. 접근 방식

### 2.1 선택: Option A — Check(100%) → QA → Report

**근거**:
- 설계-구현 100% 일치를 먼저 확인한 후 런타임 동작 검증 (논리적 순서)
- 기존 Check↔Act 루프 완전 유지 (하위 호환)
- QA 실패 시 Act로 복귀하여 수정 후 재검증 가능

### 2.2 대안 (검토 후 기각)
- **Option B (Do→QA→Check)**: 런타임 에러를 빨리 잡지만, 설계와 다른 코드가 QA 통과할 위험
- **Option C (Check 확장)**: 구현 단순하지만 Check phase 비대화, QA 워크플로우 표현 어려움

### 2.3 YAGNI Review

| 항목 | 포함 여부 | 근거 |
|------|:---------:|------|
| QA phase + State Machine 확장 | ✅ In | 핵심 기능 |
| QA Agent Team (5명) | ✅ In | PM팀 패턴 복제, 병렬 분석 |
| Chrome MCP 통합 (L3-L5) | ✅ In | 사용자 요구, graceful fallback 제공 |
| /pdca qa 스킬 + 템플릿 | ✅ In | PDCA 통합 필수 |
| skill-create로 생성 + eval 검증 | ✅ In | 사용자 요구 |
| 부하 테스트 (k6, JMeter) | ❌ Out | v2.2.0 이후 |
| 시각적 회귀 테스트 | ❌ Out | v2.2.0 이후 |
| 접근성 테스트 (axe-core) | ❌ Out | v2.2.0 이후 |

---

## 3. 상세 설계

### 3.1 State Machine 변경

#### 3.1.1 신규 State
```javascript
// lib/pdca/state-machine.js STATES 배열에 추가
'qa'  // order: check(4)와 report(6) 사이
```

#### 3.1.2 신규 Events
```javascript
'QA_PASS',    // QA 테스트 통과 → report
'QA_FAIL',    // QA 테스트 실패 → act
'QA_SKIP',    // QA 스킵 (Chrome 미설치 등) → report
'QA_RETRY'    // 수정 후 QA 재실행 → qa
```

#### 3.1.3 신규 Transitions (4건)
```javascript
// 1. Check 통과 → QA 진입 (기존 MATCH_PASS의 to를 'report'에서 'qa'로 변경)
{ from: 'check', event: 'MATCH_PASS', to: 'qa', guard: 'guardMatchRatePass' }

// 2. QA 통과 → Report
{ from: 'qa', event: 'QA_PASS', to: 'report', guard: 'guardQaPass' }

// 3. QA 실패 → Act (수정 필요)
{ from: 'qa', event: 'QA_FAIL', to: 'act', guard: null }

// 4. QA 스킵 → Report (Chrome 미설치 등)
{ from: 'qa', event: 'QA_SKIP', to: 'report', guard: null }
```

**기존 Transition 변경 (1건)**:
```javascript
// 기존: check → report (MATCH_PASS) → check → qa (MATCH_PASS)로 변경
// act → check (ANALYZE_DONE) 유지
// act → qa (새로운 경로: Act에서 수정 후 QA 재실행)
{ from: 'act', event: 'QA_RETRY', to: 'qa', guard: null }
```

#### 3.1.4 신규 Guards
```javascript
guardQaPass(context) {
  return context.qaPassRate >= 95 && context.qaCriticalCount === 0;
}
```

#### 3.1.5 신규 Actions
```javascript
initQaPhase(context)      // QA 상태 초기화, 테스트 계획 로드
recordQaResult(context)   // QA 결과 기록 (passRate, failures, duration)
generateQaReport(context) // QA 보고서 자동 생성
```

### 3.2 Phase 정의 변경

```javascript
// lib/pdca/phase.js PDCA_PHASES에 추가
qa: { order: 5, name: 'QA', icon: '🧪' }

// 기존 report order 6→7, archived 7→8로 밀림
// 또는 order를 5.5로 하여 기존 숫자 유지 (float 허용 시)
```

**Phase 순서 변경**:
```javascript
const order = ['pm', 'plan', 'design', 'do', 'check', 'act', 'qa', 'report'];
```

### 3.3 QA Agent Team 구성

#### 3.3.1 qa-lead (신규)
```yaml
name: qa-lead
description: "QA Team Lead — orchestrates test planning, generation, execution, and analysis"
model: opus
effort: high
maxTurns: 30
memory: project
tools:
  - Read, Write, Edit, Glob, Grep, Bash
  - Task(qa-test-planner), Task(qa-test-generator)
  - Task(qa-debug-analyst), Task(qa-monitor)
  - Task(Explore)
  - mcp__claude-in-chrome__* (Chrome MCP 전체)
```

**오케스트레이션 패턴**:
```
Phase 1: Context Collection
  - Design 문서 읽기 (docs/02-design/)
  - 구현 코드 탐색 (src/, lib/, components/)
  - 기존 테스트 확인 (test/, tests/)

Phase 2: Parallel Analysis (3 agents 동시 실행)
  - Task(qa-test-planner) → Test Plan
  - Task(qa-test-generator) → Test Code
  - Task(qa-debug-analyst) → Debug Config

Phase 3: Test Execution (qa-lead 직접 수행)
  - L1: Unit Test 실행 (Node.js)
  - L2: API Test 실행 (fetch/curl)
  - L3: E2E Test 실행 (Chrome MCP)
  - L4: UX Flow Test 실행 (Chrome MCP)
  - L5: Data Flow Test 실행 (Chrome MCP + API)

Phase 4: Result Analysis & Report
  - 테스트 결과 종합
  - QA 보고서 생성 → docs/05-qa/{feature}.qa-report.md
  - QA_PASS / QA_FAIL 판정
```

#### 3.3.2 qa-test-planner (신규)
```yaml
name: qa-test-planner
description: "Analyzes design docs and creates comprehensive test plans"
model: sonnet
effort: medium
maxTurns: 20
tools: Read, Glob, Grep, WebSearch
```

**출력물**: 테스트 계획서
- L1~L5 테스트 항목 목록
- 우선순위 (Critical → High → Medium → Low)
- 테스트 데이터 요구사항
- 예상 커버리지

#### 3.3.3 qa-test-generator (신규)
```yaml
name: qa-test-generator
description: "Generates test code from test plans and design specifications"
model: sonnet
effort: medium
maxTurns: 25
tools: Read, Write, Edit, Glob, Grep
```

**출력물**: 테스트 코드
- L1: `tests/unit/{feature}/*.test.ts`
- L2: `tests/api/{feature}/*.test.ts`
- L3: `tests/e2e/{feature}/*.spec.ts`
- L4: `tests/ux/{feature}/*.spec.ts`
- L5: `tests/flow/{feature}/*.spec.ts`

#### 3.3.4 qa-debug-analyst (신규)
```yaml
name: qa-debug-analyst
description: "Designs debug logging systems and analyzes runtime errors"
model: sonnet
effort: medium
maxTurns: 20
tools: Read, Write, Edit, Glob, Grep, Bash
```

**출력물**: 디버그 시스템 설정
- 구조화된 JSON 로깅 설정
- Request ID 미들웨어 설정
- 에러 추적 설정
- 콘솔/네트워크 모니터링 가이드

#### 3.3.5 qa-monitor (기존 유지)
```yaml
name: qa-monitor  # 변경 없음
# 기존 Docker 로그 모니터링 역할 유지
# qa-lead에서 Task(qa-monitor)로 호출
```

### 3.4 Chrome MCP 테스트 실행

#### 3.4.1 L3: E2E Test
```
qa-lead가 Chrome MCP 도구 직접 사용:
1. tabs_create_mcp → 새 탭 열기
2. navigate → 테스트 URL 접속
3. form_input → 폼 데이터 입력
4. find → 요소 확인
5. get_page_text → 결과 텍스트 확인
6. read_console_messages → 콘솔 에러 확인
7. read_network_requests → API 호출 확인
8. gif_creator → 테스트 과정 GIF 녹화
```

#### 3.4.2 L4: UX Flow Test
```
시나리오 기반 (Design 문서의 User Flow 참조):
1. 회원가입 → 로그인 → 대시보드 확인
2. 데이터 생성 → 목록 확인 → 상세 보기
3. 데이터 수정 → 변경 확인 → 삭제 → 삭제 확인
```

#### 3.4.3 L5: Data Flow Test
```
UI→API→DB 방향:
1. Chrome에서 폼 입력 + 제출
2. read_network_requests로 API 호출 확인
3. Bash로 DB 직접 조회 (데이터 저장 확인)

DB→API→UI 방향:
1. Bash로 DB에 테스트 데이터 삽입
2. Chrome에서 페이지 새로고침
3. get_page_text로 데이터 표시 확인
```

#### 3.4.4 Graceful Fallback
```javascript
// Chrome MCP 미설치 시
if (!chromeAvailable) {
  skipL3L4L5();  // L3-L5 스킵
  executeL1L2Only();  // L1+L2만 실행
  qaResult.note = 'Chrome MCP unavailable — L3-L5 skipped';
}
```

### 3.5 Quality Gate 변경

| 게이트 | 현재 | 변경 |
|--------|------|------|
| Check → Report | matchRate ≥ 90% | **삭제** (Check→QA로 변경) |
| Check → QA | (신규) | matchRate = **100%** |
| Check → Act | matchRate < 90% | matchRate < **100%** |
| QA → Report | (신규) | qaPassRate ≥ 95%, qaCriticalCount = 0 |
| QA → Act | (신규) | qaPassRate < 95% 또는 qaCriticalCount > 0 |

### 3.6 신규 Quality Metrics

| ID | 이름 | 단위 | 수집자 | 방향 |
|----|------|------|--------|------|
| M11 | QA Pass Rate | % | qa-lead | higher is better |
| M12 | Test Coverage (L1) | % | qa-test-generator | higher |
| M13 | E2E Scenario Coverage | % | qa-lead | higher |
| M14 | Runtime Error Count | count | qa-debug-analyst | lower |
| M15 | Data Flow Integrity | % | qa-lead | higher |

### 3.7 디버그 로그 시스템

```json
{
  "timestamp": "2026-04-08T12:00:00.000Z",
  "level": "INFO",
  "service": "api-server",
  "request_id": "req_abc123",
  "message": "POST /api/users completed",
  "data": {
    "status": 201,
    "duration_ms": 45,
    "user_id": "usr_xyz"
  }
}
```

**Request ID 전파 체인**:
```
Browser (X-Request-ID 헤더)
  → API Gateway (로그 + 전달)
    → Backend Service (로그 + 전달)
      → Database (쿼리 로그에 태그)
```

### 3.8 문서 출력 경로

| Phase | 경로 | 설명 |
|-------|------|------|
| QA | `docs/05-qa/{feature}.qa-report.md` | QA 결과 보고서 |
| QA | `docs/05-qa/{feature}.test-plan.md` | 테스트 계획서 |

---

## 4. 구현 범위

### 4.1 신규 파일 (~15개)

| 유형 | 파일 | 설명 |
|------|------|------|
| Agent | `agents/qa-lead.md` | QA 팀 리더 (opus) |
| Agent | `agents/qa-test-planner.md` | 테스트 계획 수립 (sonnet) |
| Agent | `agents/qa-test-generator.md` | 테스트 코드 생성 (sonnet) |
| Agent | `agents/qa-debug-analyst.md` | 디버그 로그 분석 (sonnet) |
| Skill | `skills/qa-phase/SKILL.md` | /pdca qa 스킬 정의 |
| Template | `templates/qa-report.template.md` | QA 보고서 템플릿 |
| Template | `templates/qa-test-plan.template.md` | 테스트 계획 템플릿 |
| Lib | `lib/qa/index.js` | QA 모듈 인덱스 |
| Lib | `lib/qa/test-runner.js` | 테스트 실행 엔진 (L1-L5 분기) |
| Lib | `lib/qa/chrome-bridge.js` | Chrome MCP 래퍼 (가용성 체크 + fallback) |
| Lib | `lib/qa/report-generator.js` | QA 보고서 생성 |
| Lib | `lib/qa/test-plan-builder.js` | Design 문서 → 테스트 계획 변환 |
| Script | `scripts/qa-stop.js` | QA phase Stop hook 핸들러 |
| Docs | `docs/05-qa/` | QA 결과 문서 디렉토리 |

### 4.2 수정 파일 (~12개)

| 파일 | 변경 내용 |
|------|----------|
| `lib/pdca/state-machine.js` | +qa state, +4 transitions, +guards, +actions |
| `lib/pdca/phase.js` | +qa phase definition, order 업데이트 |
| `lib/pdca/automation.js` | +qa auto-advance, nextPhaseMap 업데이트 |
| `lib/ui/progress-bar.js` | +QA 단계 렌더링 |
| `lib/ui/workflow-map.js` | +QA 단계 렌더링, QA 분기 표시 |
| `scripts/unified-stop.js` | +qa handler, QA_PASS/QA_FAIL 이벤트 |
| `hooks/hooks.json` | +qa stop hook 등록 |
| `lib/team/strategy.js` | +qa team config (Dynamic/Enterprise) |
| `lib/quality/metrics-collector.js` | +M11~M15 메트릭 정의 |
| `lib/quality/gate-manager.js` | +qa phase gate 정의 |
| `skills/pdca/SKILL.md` | +/pdca qa 서브커맨드 문서화 |
| `lib/core/paths.js` | +QA_DOCS_PATH (`docs/05-qa/`) |

### 4.3 스킬 생성 방식
- `/skill-create`로 qa-phase 스킬 생성
- eval 벤치마크로 스킬 동작 검증
- 기존 스킬 패턴(pm-discovery, plan-plus) 참조

---

## 5. 구현 순서

### Phase 1: State Machine + Phase 정의 (기반)
1. `lib/pdca/state-machine.js` — qa state + transitions + guards + actions
2. `lib/pdca/phase.js` — qa phase definition
3. `lib/pdca/automation.js` — qa auto-advance
4. `lib/quality/metrics-collector.js` — M11~M15 추가
5. `lib/quality/gate-manager.js` — qa gate 추가

### Phase 2: QA Agent Team (에이전트)
6. `agents/qa-lead.md` — 오케스트레이션 패턴 정의
7. `agents/qa-test-planner.md` — 테스트 계획 역할
8. `agents/qa-test-generator.md` — 테스트 생성 역할
9. `agents/qa-debug-analyst.md` — 디버그 분석 역할

### Phase 3: QA Lib 모듈 (비즈니스 로직)
10. `lib/qa/index.js` — 모듈 인덱스
11. `lib/qa/test-runner.js` — L1-L5 테스트 실행 엔진
12. `lib/qa/chrome-bridge.js` — Chrome MCP 가용성 + fallback
13. `lib/qa/report-generator.js` — QA 보고서 생성
14. `lib/qa/test-plan-builder.js` — Design→Test Plan 변환

### Phase 4: Skill + Template + Hook (통합)
15. `skills/qa-phase/SKILL.md` — /pdca qa 스킬 (`/skill-create` 사용)
16. `templates/qa-report.template.md` — QA 보고서 템플릿
17. `templates/qa-test-plan.template.md` — 테스트 계획 템플릿
18. `scripts/qa-stop.js` — QA Stop hook 핸들러
19. `hooks/hooks.json` — qa stop hook 등록
20. `scripts/unified-stop.js` — QA handler 추가

### Phase 5: UI + Dashboard (시각화)
21. `lib/ui/progress-bar.js` — +QA 단계
22. `lib/ui/workflow-map.js` — +QA 단계 + QA 분기 표시

### Phase 6: Team Strategy + PDCA Skill (연동)
23. `lib/team/strategy.js` — qa team config
24. `skills/pdca/SKILL.md` — /pdca qa 서브커맨드
25. `lib/core/paths.js` — QA_DOCS_PATH

### Phase 7: 테스트 + 검증
26. 기존 3,278 TC 회귀 테스트
27. 신규 QA phase transition 테스트
28. eval 벤치마크로 qa-phase 스킬 검증
29. `claude -p --plugin-dir .`로 E2E 검증
30. 실제 프로젝트에서 `/pdca qa` 실행 테스트

---

## 6. 성공 기준

| 지표 | 목표 |
|------|------|
| State Machine 확장 | qa state + 4 transitions + 2 guards 동작 |
| QA Agent Team | 5명 에이전트 정상 오케스트레이션 |
| L1-L2 테스트 | Node.js 기반 자동 실행 100% |
| L3-L5 테스트 | Chrome MCP 연동 실행 (fallback 포함) |
| `/pdca qa` 명령 | 스킬 실행 → 보고서 생성 완전 자동 |
| PDCA 워크플로우 | PM→Plan→Design→Do→Check(100%)→QA→Report 전 구간 |
| 기존 테스트 | 3,278+ TC 회귀 0건 |
| 디버그 로그 | JSON 구조화 로깅 + Request ID 전파 가이드 |

---

## 7. 리스크 및 대응

| 리스크 | 확률 | 영향 | 대응 |
|--------|:----:|:----:|------|
| Chrome MCP 불안정 | Medium | High | L1+L2 fallback, 타임아웃 설정, 재시도 로직 |
| 100% match rate 달성 어려움 | Medium | Medium | intentional-diffs.json 허용 목록 도입 |
| QA 에이전트 토큰 비용 | Low | Medium | sub-agents는 sonnet/haiku, 테스트 범위 제한 |
| State Machine 복잡도 | Low | Low | 24 transitions 제한, 충분한 테스트 |
| 기존 워크플로우 깨짐 | Low | High | QA_SKIP 이벤트로 기존 flow 유지 가능 |

---

## 8. 제약 조건

1. CC v2.1.96+ 호환 필수
2. Agent Teams 필요: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
3. Chrome MCP 의존: claude-in-chrome 확장 설치 필요 (L3-L5)
4. 프로젝트 레벨: Dynamic 이상 (Starter 미지원)
5. 기존 32→36 agents, 37→38 skills 체계와 호환
6. 신규 스킬은 `/skill-create`로 생성, eval로 검증

---

## 9. Brainstorming Log

### Intent Discovery (Phase 1)
- **핵심 문제**: AI 생성 코드의 런타임 동작 미검증
- **대상 사용자**: Vibecoding 개발자 (1인~소규모 팀)
- **성공 기준**: `/pdca qa` 한 번으로 전체 QA 자동 완성

### Alternatives (Phase 2)
- **선택**: Option A — Check(100%)→QA→Report (정적 먼저, 동적 나중)
- **기각**: Option B (Do→QA→Check — 설계 불일치 위험), Option C (Check 확장 — 비대화)

### YAGNI Review (Phase 3)
- **포함**: QA phase, Agent Team, Chrome MCP, Skill+Template (4건 전체)
- **제외**: 부하 테스트, 시각적 회귀, 접근성 테스트 (v2.2.0 이후)

### Architecture Validation (Phase 4)
- **승인**: 아키텍처 개요 1차 승인

---

## Version History

| 버전 | 날짜 | 변경 |
|------|------|------|
| 0.1 | 2026-04-08 | Plan Plus 브레인스토밍으로 초안 작성 |
