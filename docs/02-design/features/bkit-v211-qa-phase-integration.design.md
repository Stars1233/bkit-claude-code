# Design: bkit PDCA QA Phase Integration

> **요약**: PDCA 사이클에 독립 QA phase를 추가하고, State Machine에 qa state + 5 transitions를 확장하며, QA 전문 에이전트팀(qa-lead + 3 sub-agents)을 구성하여 L1~L5 테스트를 자동 수행. Chrome MCP 연동 + graceful fallback, Quality Gate 강화(Check 100% → QA 95%), 신규 Metrics M11~M15 추가.
>
> **Feature**: bkit-v211-qa-phase-integration
> **Version**: bkit v2.1.1
> **작성자**: Claude Opus 4.6
> **날짜**: 2026-04-08
> **상태**: Draft
> **Plan 문서**: [bkit-v211-qa-phase-integration.plan.md](../../01-plan/features/bkit-v211-qa-phase-integration.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | PDCA Check phase는 정적 설계-구현 비교(gap-detector)만 수행. 런타임 동작(UI→API→DB)은 미검증. "코드는 있지만 동작하지 않는" 상태 감지 불가 |
| **WHO** | Dynamic/Enterprise 레벨 사용자 (Starter 미지원) |
| **RISK** | Chrome MCP 불안정(fallback 설계), State Machine 복잡도 증가(24→29 transitions), 기존 워크플로우 깨짐(QA_SKIP으로 방어) |
| **SUCCESS** | PM→Plan→Design→Do→Check(100%)→QA(L1~L5)→Report 전 구간 자동 워크플로우, `/pdca qa` 명령 1회로 전체 QA 완수 |
| **SCOPE** | QA phase + Agent Team + Chrome MCP 통합. 부하 테스트, 시각적 회귀, 접근성 테스트는 v2.2.0 이후 |

---

## 1. 아키텍처 개요

### 1.1 전체 워크플로우

```
PM → Plan → Design → Do → Check(=100%) ↔ Act → QA(L1~L5) → Report
                                                  ↑          │
                                                  └── QA_FAIL ┘
                                                       (Act로 복귀)
```

### 1.2 QA Phase 위치와 데이터 흐름

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    PDCA + QA Phase Architecture                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ State Machine (state-machine.js) ──────────────────────────────┐    │
│  │  STATES: +qa (기존 10 → 11)                                      │    │
│  │  TRANSITIONS: +5 (기존 20 → 25)                                   │    │
│  │  GUARDS: +guardQaPass                                            │    │
│  │  ACTIONS: +initQaPhase, +recordQaResult, +generateQaReport       │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─ QA Agent Team ─────────────────────────────────────────────────┐    │
│  │                                                                  │    │
│  │  qa-lead (opus) ─── orchestrator                                 │    │
│  │    ├─ Task(qa-test-planner)   → Test Plan 생성                   │    │
│  │    ├─ Task(qa-test-generator) → Test Code 생성                   │    │
│  │    ├─ Task(qa-debug-analyst)  → Debug Config + Error 분석         │    │
│  │    └─ Task(qa-monitor)        → Docker 로그 모니터링 (기존)       │    │
│  │                                                                  │    │
│  │  mcp__claude-in-chrome__* → L3-L5 브라우저 테스트                 │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─ QA Lib Modules (lib/qa/) ──────────────────────────────────────┐    │
│  │  index.js          → exports                                     │    │
│  │  test-runner.js    → L1-L5 실행 엔진                              │    │
│  │  chrome-bridge.js  → Chrome MCP 래퍼 + fallback                  │    │
│  │  report-generator.js → QA 보고서 생성                             │    │
│  │  test-plan-builder.js → Design→Test Plan 변환                    │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─ Integration Points ────────────────────────────────────────────┐    │
│  │  unified-stop.js   → +qa handler (QA_PASS/QA_FAIL/QA_SKIP)      │    │
│  │  gate-manager.js   → +qa gate definition                         │    │
│  │  metrics-collector → +M11~M15                                     │    │
│  │  progress-bar.js   → +QA 단계 렌더링                              │    │
│  │  workflow-map.js   → +QA 단계 + 분기 표시                         │    │
│  │  strategy.js       → +qa role (Dynamic/Enterprise)                │    │
│  │  paths.js          → +qa doc paths                                │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.3 설계 원칙

- **Plan 충실 반영**: Plan 문서의 모든 항목을 코드 수준으로 구체화
- **기존 패턴 복제**: PM Agent Team(pm-lead 패턴) 구조를 QA에 적용
- **Backward Compatible**: QA_SKIP 이벤트로 기존 flow 유지 가능
- **Graceful Degradation**: Chrome MCP 미설치 시 L1+L2만 실행

---

## 2. State Machine 변경 상세

**파일**: `lib/pdca/state-machine.js`

### 2.1 STATES 변경

```javascript
// 현재 (라인 35-38):
const STATES = [
  'idle', 'pm', 'plan', 'design', 'do',
  'check', 'act', 'report', 'archived', 'error'
];

// 변경 후:
const STATES = [
  'idle', 'pm', 'plan', 'design', 'do',
  'check', 'act', 'qa', 'report', 'archived', 'error'
];
```

### 2.2 EVENTS 변경

```javascript
// 현재 (라인 41-49):
const EVENTS = [
  'START', 'SKIP_PM',
  'PM_DONE', 'PLAN_DONE', 'DESIGN_DONE', 'DO_COMPLETE',
  'MATCH_PASS', 'ITERATE', 'ANALYZE_DONE',
  'REPORT_DONE', 'ARCHIVE',
  'REJECT',
  'ERROR', 'RECOVER', 'RESET', 'ROLLBACK',
  'TIMEOUT', 'ABANDON'
];

// 변경 후:
const EVENTS = [
  'START', 'SKIP_PM',
  'PM_DONE', 'PLAN_DONE', 'DESIGN_DONE', 'DO_COMPLETE',
  'MATCH_PASS', 'ITERATE', 'ANALYZE_DONE',
  'QA_PASS', 'QA_FAIL', 'QA_SKIP', 'QA_RETRY',
  'REPORT_DONE', 'ARCHIVE',
  'REJECT',
  'ERROR', 'RECOVER', 'RESET', 'ROLLBACK',
  'TIMEOUT', 'ABANDON'
];
```

### 2.3 TRANSITIONS 변경 (기존 1건 수정 + 신규 5건)

#### 2.3.1 기존 Transition 변경 — check→report를 check→qa로

```javascript
// 현재 (라인 97-101):
{
  from: 'check', event: 'MATCH_PASS', to: 'report',
  guard: 'guardMatchRatePass',
  actions: ['recordTimestamp', 'notifyPhaseComplete', 'recordMatchRate'],
  description: 'Match rate >= threshold, proceed to Report'
},

// 변경 후:
{
  from: 'check', event: 'MATCH_PASS', to: 'qa',
  guard: 'guardMatchRatePass',
  actions: ['recordTimestamp', 'notifyPhaseComplete', 'recordMatchRate', 'initQaPhase'],
  description: 'Match rate >= threshold, proceed to QA testing'
},
```

#### 2.3.2 신규 Transition — QA 통과 → Report

```javascript
{
  from: 'qa', event: 'QA_PASS', to: 'report',
  guard: 'guardQaPass',
  actions: ['recordTimestamp', 'notifyPhaseComplete', 'recordQaResult', 'generateQaReport'],
  description: 'QA tests passed, proceed to Report'
},
```

#### 2.3.3 신규 Transition — QA 실패 → Act

```javascript
{
  from: 'qa', event: 'QA_FAIL', to: 'act',
  guard: null,
  actions: ['recordTimestamp', 'recordQaResult'],
  description: 'QA tests failed, return to Act for fixes'
},
```

#### 2.3.4 신규 Transition — QA 스킵 → Report

```javascript
{
  from: 'qa', event: 'QA_SKIP', to: 'report',
  guard: null,
  actions: ['recordTimestamp', 'recordQaResult'],
  description: 'QA skipped (Chrome unavailable or user opt-out), proceed to Report'
},
```

#### 2.3.5 신규 Transition — Act → QA 재실행

```javascript
{
  from: 'act', event: 'QA_RETRY', to: 'qa',
  guard: null,
  actions: ['recordTimestamp', 'initQaPhase'],
  description: 'After Act fixes, retry QA testing'
},
```

#### 2.3.6 신규 Transition — QA max iteration 시 강제 Report

```javascript
{
  from: 'qa', event: 'REPORT_DONE', to: 'report',
  guard: 'guardQaMaxRetryReached',
  actions: ['recordTimestamp', 'forceReport', 'recordQaResult'],
  description: 'Max QA retries reached, force report generation'
},
```

### 2.4 Guards 구현

```javascript
// GUARDS 객체에 추가 (라인 194 이후)

/**
 * QA pass rate meets threshold and no critical failures
 * @param {Object} ctx - StateMachineContext
 * @returns {boolean}
 */
guardQaPass(ctx) {
  const passRate = ctx.qaPassRate || 0;
  const criticalCount = ctx.qaCriticalCount || 0;
  return passRate >= 95 && criticalCount === 0;
},

/**
 * Max QA retry attempts reached
 * @param {Object} ctx - StateMachineContext
 * @returns {boolean}
 */
guardQaMaxRetryReached(ctx) {
  return (ctx.qaRetryCount || 0) >= (ctx.maxQaRetries || 3);
},
```

**guardMatchRatePass 변경** — threshold를 100으로 변경:

```javascript
// 현재 (라인 236-240):
guardMatchRatePass(ctx) {
  const { getConfig } = getCore();
  const threshold = getConfig('pdca.matchRateThreshold', 90);
  return (ctx.matchRate || 0) >= threshold;
},

// 변경 후:
guardMatchRatePass(ctx) {
  const { getConfig } = getCore();
  // v2.1.1: QA phase 도입으로 100% 일치 후 QA 진입
  const threshold = getConfig('pdca.matchRateThreshold', 100);
  return (ctx.matchRate || 0) >= threshold;
},
```

> **Note**: `pdca.matchRateThreshold` config로 프로젝트별 override 가능. 기존 프로젝트는 `bkit.config.json`에서 `90`으로 유지하면 하위 호환 가능.

### 2.5 Actions 구현

```javascript
// ACTIONS 객체에 추가 (라인 310 이후)

/**
 * Initialize QA phase state
 * Sets up QA context: test plan reference, Chrome availability, retry count
 */
initQaPhase(ctx, _event) {
  const { debugLog } = getCore();
  const { updatePdcaStatus } = getStatus();

  ctx.qaPassRate = null;
  ctx.qaCriticalCount = null;
  ctx.qaRetryCount = ctx.qaRetryCount || 0;
  ctx.qaStartTime = new Date().toISOString();

  // Chrome MCP availability check
  ctx.chromeAvailable = _checkChromeMcpAvailable();

  updatePdcaStatus(ctx.feature, 'qa', {
    qaRetryCount: ctx.qaRetryCount,
    chromeAvailable: ctx.chromeAvailable,
    qaStartTime: ctx.qaStartTime,
  });

  debugLog('PDCA-SM', 'QA phase initialized', {
    feature: ctx.feature,
    chromeAvailable: ctx.chromeAvailable,
    retryCount: ctx.qaRetryCount,
  });
},

/**
 * Record QA test results in context and status
 */
recordQaResult(ctx, _event) {
  const { updatePdcaStatus } = getStatus();
  updatePdcaStatus(ctx.feature, ctx.currentState, {
    qaPassRate: ctx.qaPassRate,
    qaCriticalCount: ctx.qaCriticalCount,
    qaTestCount: ctx.qaTestCount || 0,
    qaFailedTests: ctx.qaFailedTests || [],
    qaDuration: ctx.qaStartTime
      ? Date.now() - new Date(ctx.qaStartTime).getTime()
      : null,
  });
},

/**
 * Auto-generate QA report document
 */
generateQaReport(ctx, _event) {
  const { debugLog, PROJECT_DIR } = getCore();
  debugLog('PDCA-SM', 'QA report generation triggered', {
    feature: ctx.feature,
    passRate: ctx.qaPassRate,
  });
  // Actual report generation delegated to qa-lead agent or lib/qa/report-generator
},
```

**Chrome MCP 가용성 체크 헬퍼**:

```javascript
// state-machine.js 파일 상단에 추가 (module-level helper)

/**
 * Check Chrome MCP availability
 * @returns {boolean}
 */
function _checkChromeMcpAvailable() {
  try {
    // Chrome MCP tools are available if claude-in-chrome extension is installed
    // Detection: check if MCP server name exists in environment
    const mcpServers = process.env.MCP_SERVERS || '';
    return mcpServers.includes('claude-in-chrome');
  } catch (_) {
    return false;
  }
}
```

---

## 3. Phase 정의 변경

**파일**: `lib/pdca/phase.js`

### 3.1 PDCA_PHASES 변경

```javascript
// 현재 (라인 22-31):
const PDCA_PHASES = {
  pm: { order: 0, name: 'PM', icon: '🎯' },
  plan: { order: 1, name: 'Plan', icon: '📋' },
  design: { order: 2, name: 'Design', icon: '📐' },
  do: { order: 3, name: 'Do', icon: '🔨' },
  check: { order: 4, name: 'Check', icon: '🔍' },
  act: { order: 5, name: 'Act', icon: '🔄' },
  report: { order: 6, name: 'Report', icon: '📊' },
  archived: { order: 7, name: 'Archived', icon: '📦' }
};

// 변경 후:
const PDCA_PHASES = {
  pm: { order: 0, name: 'PM', icon: '🎯' },
  plan: { order: 1, name: 'Plan', icon: '📋' },
  design: { order: 2, name: 'Design', icon: '📐' },
  do: { order: 3, name: 'Do', icon: '🔨' },
  check: { order: 4, name: 'Check', icon: '🔍' },
  act: { order: 5, name: 'Act', icon: '🔄' },
  qa: { order: 6, name: 'QA', icon: '🧪' },
  report: { order: 7, name: 'Report', icon: '📊' },
  archived: { order: 8, name: 'Archived', icon: '📦' }
};
```

### 3.2 Order 배열 변경

```javascript
// 현재 getPreviousPdcaPhase (라인 60):
const order = ['pm', 'plan', 'design', 'do', 'check', 'act', 'report'];

// 변경 후:
const order = ['pm', 'plan', 'design', 'do', 'check', 'act', 'qa', 'report'];

// 현재 getNextPdcaPhase (라인 71):
const order = ['pm', 'plan', 'design', 'do', 'check', 'act', 'report'];

// 변경 후:
const order = ['pm', 'plan', 'design', 'do', 'check', 'act', 'qa', 'report'];
```

### 3.3 checkPhaseDeliverables 변경

```javascript
// 현재 phaseMap (라인 113):
const phaseMap = { check: 'analysis' };

// 변경 후:
const phaseMap = { check: 'analysis', qa: 'qa' };
```

### 3.4 validatePdcaTransition 변경

QA phase에서는 deliverable 검증을 스킵해야 함 (QA 보고서는 phase 완료 후 생성):

```javascript
// 현재 (라인 206):
if (!deliverable.exists && fromPhase !== 'do' && fromPhase !== 'act') {

// 변경 후:
if (!deliverable.exists && fromPhase !== 'do' && fromPhase !== 'act' && fromPhase !== 'qa') {
```

### 3.5 모듈 exports는 변경 없음

기존 export 목록 유지. PDCA_PHASES 객체에 qa를 추가하면 모든 참조 코드에 자동 반영.

---

## 4. QA Agent Team 상세 설계

### 4.1 qa-lead (신규)

**파일**: `agents/qa-lead.md`

```yaml
---
name: qa-lead
description: |
  QA Team Lead — orchestrates test planning, generation, execution, and analysis.
  Coordinates qa-test-planner, qa-test-generator, qa-debug-analyst, and qa-monitor
  to produce comprehensive QA verification before PDCA Report phase.

  Triggers: qa team, QA lead, test execution, QA phase, QA 실행,
  QA팀, QAリード, テスト実行, QA执行, QA ejecucion, QA execution,
  QA-Ausfuhrung, esecuzione QA

  Do NOT use for: static gap analysis (use gap-detector), code review (use code-analyzer),
  or Starter level projects without Agent Teams.
model: opus
effort: high
maxTurns: 30
memory: project
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task(qa-test-planner)
  - Task(qa-test-generator)
  - Task(qa-debug-analyst)
  - Task(qa-monitor)
  - Task(Explore)
  - mcp__claude-in-chrome__tabs_create_mcp
  - mcp__claude-in-chrome__navigate
  - mcp__claude-in-chrome__form_input
  - mcp__claude-in-chrome__find
  - mcp__claude-in-chrome__get_page_text
  - mcp__claude-in-chrome__read_console_messages
  - mcp__claude-in-chrome__read_network_requests
  - mcp__claude-in-chrome__gif_creator
skills:
  - pdca
  - zero-script-qa
  - bkit-rules
---
```

**오케스트레이션 로직** (agent body):

```markdown
## Orchestration Protocol

### Phase 1: Context Collection (qa-lead 직접 수행)
1. Design 문서 읽기: `docs/02-design/features/{feature}.design.md`
2. 구현 코드 탐색: Glob + Grep으로 src/, lib/, components/ 스캔
3. 기존 테스트 확인: test/, tests/, __tests__/ 디렉토리 탐색
4. Check phase 결과 읽기: `docs/03-analysis/{feature}.analysis.md`

### Phase 2: Parallel Analysis (3 agents 동시 실행)
- Task(qa-test-planner): Design 문서 → Test Plan 생성
- Task(qa-test-generator): Test Plan + 코드 → Test Code 생성
- Task(qa-debug-analyst): Debug 설정 + 에러 모니터링 준비

### Phase 3: Test Execution (qa-lead 직접 수행)
L1 (Unit): `node --test` 또는 `npx jest` 실행 (Bash)
L2 (API): curl/fetch 기반 API 엔드포인트 검증 (Bash)
L3 (E2E): Chrome MCP로 페이지 탐색 + 폼 입력 + 결과 확인
L4 (UX Flow): Chrome MCP로 시나리오 기반 사용자 여정 검증
L5 (Data Flow): Chrome + Bash 조합으로 UI→API→DB 데이터 흐름 검증

Chrome 미설치 시:
- L3-L5 자동 스킵
- L1+L2 결과만으로 QA 판정
- QA 보고서에 "Chrome MCP unavailable — L3-L5 skipped" 기록

### Phase 4: Result Analysis & Report
1. 테스트 결과 종합 (passRate, failedTests, criticalCount)
2. QA 보고서 생성 → `docs/05-qa/{feature}.qa-report.md`
3. QA_PASS / QA_FAIL / QA_SKIP 판정

### QA Pass 기준
- qaPassRate >= 95%
- qaCriticalCount === 0
- L1 100% 통과 필수
- L2 95% 이상 통과
- L3-L5 가용 시 90% 이상 통과 (미가용 시 무시)
```

### 4.2 qa-test-planner (신규)

**파일**: `agents/qa-test-planner.md`

```yaml
---
name: qa-test-planner
description: |
  Analyzes design docs and creates comprehensive test plans with L1-L5 test items.
  Produces structured test plan documents with prioritized test cases.

  Triggers: test plan, test planning, QA plan, 테스트 계획, テスト計画,
  测试计划, plan de pruebas, plan de test, Testplan, piano di test

  Do NOT use for: actual test code generation (use qa-test-generator),
  or test execution (qa-lead handles execution).
model: sonnet
effort: medium
maxTurns: 20
memory: project
disallowedTools:
  - Write
  - Edit
  - Bash
tools:
  - Read
  - Glob
  - Grep
  - Task(Explore)
  - WebSearch
skills:
  - pdca
---
```

**역할 정의** (agent body):

```markdown
## Role
Design 문서와 구현 코드를 분석하여 L1~L5 테스트 계획서를 생성한다.

## Output Format
테스트 계획서 JSON 구조:
{
  "feature": "{feature-name}",
  "testPlan": {
    "L1_unit": [
      { "id": "L1-001", "target": "함수/모듈명", "description": "테스트 설명", "priority": "critical|high|medium|low", "testData": "요구 데이터" }
    ],
    "L2_api": [...],
    "L3_e2e": [...],
    "L4_ux_flow": [...],
    "L5_data_flow": [...]
  },
  "coverage": { "estimated": "80%", "target": "95%" },
  "dependencies": ["Chrome MCP (L3-L5)", "DB access (L5)"]
}

## Priority Rules
- Critical: 핵심 비즈니스 로직, 인증/인가, 데이터 무결성
- High: 주요 사용자 시나리오, API 응답 형식
- Medium: 엣지 케이스, 에러 메시지
- Low: UI 세부 레이아웃, 비기능적 요소
```

### 4.3 qa-test-generator (신규)

**파일**: `agents/qa-test-generator.md`

```yaml
---
name: qa-test-generator
description: |
  Generates test code from test plans and design specifications.
  Creates L1-L5 test files following project conventions.

  Triggers: test generation, generate tests, test code, 테스트 생성,
  テスト生成, 测试生成, generar pruebas, generer tests, Tests generieren, generare test

  Do NOT use for: test planning (use qa-test-planner),
  or test execution (qa-lead handles execution).
model: sonnet
effort: medium
maxTurns: 25
memory: project
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task(Explore)
skills:
  - pdca
---
```

**역할 정의** (agent body):

```markdown
## Role
Test Plan을 기반으로 실행 가능한 테스트 코드를 생성한다.

## Output Paths
- L1: `tests/unit/{feature}/*.test.js` (또는 .test.ts)
- L2: `tests/api/{feature}/*.test.js`
- L3: `tests/e2e/{feature}/*.spec.js`
- L4: `tests/ux/{feature}/*.spec.js`
- L5: `tests/flow/{feature}/*.spec.js`

## Test Framework Detection
1. package.json의 devDependencies 확인
2. 기존 테스트 파일 패턴 확인 (jest, vitest, mocha, node:test)
3. 프레임워크 미설치 시 Node.js 내장 test runner 사용

## Code Generation Rules
- 테스트당 하나의 관심사
- Arrange-Act-Assert 패턴
- 테스트 데이터는 인라인 또는 fixtures/
- Mock/Stub 최소화, 실제 동작 우선
```

### 4.4 qa-debug-analyst (신규)

**파일**: `agents/qa-debug-analyst.md`

```yaml
---
name: qa-debug-analyst
description: |
  Designs debug logging systems and analyzes runtime errors.
  Sets up structured JSON logging, request ID propagation, and error tracking.

  Triggers: debug analysis, runtime error, logging, debug log, 디버그 분석,
  デバッグ分析, 调试分析, analisis de debug, analyse de debug, Debug-Analyse, analisi debug

  Do NOT use for: test planning or generation (use qa-test-planner/generator),
  or static code analysis (use code-analyzer).
model: sonnet
effort: medium
maxTurns: 20
memory: project
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task(Explore)
skills:
  - zero-script-qa
---
```

**역할 정의** (agent body):

```markdown
## Role
프로젝트에 구조화된 디버그 로깅 시스템을 설정하고, 런타임 에러를 분석한다.

## Debug Log Schema
{
  "timestamp": "ISO 8601",
  "level": "DEBUG|INFO|WARN|ERROR|FATAL",
  "service": "서비스 식별자",
  "request_id": "req_xxxxxxxx",
  "message": "사람이 읽을 수 있는 메시지",
  "data": { /* 구조화된 추가 데이터 */ },
  "error": { "name": "...", "message": "...", "stack": "..." }
}

## Request ID Propagation
Browser (X-Request-ID header)
  → API Gateway (log + forward)
    → Backend Service (log + forward)
      → Database (query comment tag)

## Deliverables
1. 로깅 미들웨어 설정 코드
2. Request ID 생성/전파 미들웨어
3. 에러 추적 유틸리티
4. 콘솔/네트워크 모니터링 가이드 문서
```

### 4.5 qa-monitor (기존 유지)

**파일**: `agents/qa-monitor.md` — 변경 없음

기존 Docker 로그 모니터링 역할 그대로 유지. qa-lead에서 `Task(qa-monitor)`로 호출하여 런타임 로그 수집에 활용.

---

## 5. QA Lib 모듈 상세 설계

### 5.1 lib/qa/index.js

```javascript
/**
 * QA Module — Test execution, Chrome bridge, report generation
 * @module lib/qa
 * @version 2.1.1
 */

const testRunner = require('./test-runner');
const chromeBridge = require('./chrome-bridge');
const reportGenerator = require('./report-generator');
const testPlanBuilder = require('./test-plan-builder');

module.exports = {
  // Test Runner
  runTests: testRunner.runTests,
  runTestLevel: testRunner.runTestLevel,
  getTestSummary: testRunner.getTestSummary,
  TEST_LEVELS: testRunner.TEST_LEVELS,

  // Chrome Bridge
  checkChromeAvailable: chromeBridge.checkChromeAvailable,
  createChromeBridge: chromeBridge.createChromeBridge,

  // Report Generator
  generateQaReport: reportGenerator.generateQaReport,
  formatQaReportMd: reportGenerator.formatQaReportMd,

  // Test Plan Builder
  buildTestPlan: testPlanBuilder.buildTestPlan,
  parseDesignDoc: testPlanBuilder.parseDesignDoc,
};
```

### 5.2 lib/qa/test-runner.js

```javascript
/**
 * QA Test Runner — L1-L5 test execution engine
 * @module lib/qa/test-runner
 * @version 2.1.1
 *
 * Executes tests at 5 levels with Chrome MCP fallback.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Lazy require to avoid circular deps
let _core = null;
function getCore() {
  if (!_core) { _core = require('../core'); }
  return _core;
}

/**
 * @typedef {'L1'|'L2'|'L3'|'L4'|'L5'} TestLevel
 */

/** @type {Record<TestLevel, {name: string, requiresChrome: boolean, dir: string}>} */
const TEST_LEVELS = {
  L1: { name: 'Unit Test', requiresChrome: false, dir: 'tests/unit' },
  L2: { name: 'API Test', requiresChrome: false, dir: 'tests/api' },
  L3: { name: 'E2E Test', requiresChrome: true, dir: 'tests/e2e' },
  L4: { name: 'UX Flow Test', requiresChrome: true, dir: 'tests/ux' },
  L5: { name: 'Data Flow Test', requiresChrome: true, dir: 'tests/flow' },
};

/**
 * @typedef {Object} TestResult
 * @property {TestLevel} level
 * @property {string} name
 * @property {number} total - Total test count
 * @property {number} passed - Passed test count
 * @property {number} failed - Failed test count
 * @property {number} skipped - Skipped test count
 * @property {Array<{test: string, error: string}>} failures - Failed test details
 * @property {number} duration - Duration in ms
 * @property {boolean} chromeRequired
 * @property {boolean} executed
 */

/**
 * @typedef {Object} QaRunResult
 * @property {string} feature
 * @property {TestResult[]} results
 * @property {number} passRate - Overall pass rate (0-100)
 * @property {number} criticalCount - Critical failure count
 * @property {number} totalTests
 * @property {number} totalPassed
 * @property {number} totalFailed
 * @property {number} duration - Total duration in ms
 * @property {boolean} chromeAvailable
 * @property {string[]} skippedLevels
 */

/**
 * Run all test levels for a feature
 * @param {string} feature - Feature name
 * @param {Object} [options]
 * @param {boolean} [options.chromeAvailable=false]
 * @param {string[]} [options.levels=['L1','L2','L3','L4','L5']]
 * @returns {QaRunResult}
 */
function runTests(feature, options = {}) {
  const { debugLog, PROJECT_DIR } = getCore();
  const chromeAvailable = options.chromeAvailable || false;
  const levels = options.levels || ['L1', 'L2', 'L3', 'L4', 'L5'];

  const results = [];
  const skippedLevels = [];
  const startTime = Date.now();

  for (const level of levels) {
    const spec = TEST_LEVELS[level];
    if (!spec) continue;

    if (spec.requiresChrome && !chromeAvailable) {
      skippedLevels.push(level);
      results.push({
        level,
        name: spec.name,
        total: 0, passed: 0, failed: 0, skipped: 0,
        failures: [],
        duration: 0,
        chromeRequired: true,
        executed: false,
      });
      continue;
    }

    const testDir = path.join(PROJECT_DIR, spec.dir, feature);
    if (!fs.existsSync(testDir)) {
      debugLog('QA', `Test directory not found: ${testDir}`, { level });
      results.push({
        level,
        name: spec.name,
        total: 0, passed: 0, failed: 0, skipped: 0,
        failures: [],
        duration: 0,
        chromeRequired: spec.requiresChrome,
        executed: false,
      });
      continue;
    }

    const result = runTestLevel(level, testDir);
    results.push(result);
  }

  // Calculate summary
  const totalTests = results.reduce((s, r) => s + r.total, 0);
  const totalPassed = results.reduce((s, r) => s + r.passed, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);
  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  // Critical = any L1 failure or L2 auth/data failure
  const criticalCount = _countCriticalFailures(results);

  return {
    feature,
    results,
    passRate,
    criticalCount,
    totalTests,
    totalPassed,
    totalFailed,
    duration: Date.now() - startTime,
    chromeAvailable,
    skippedLevels,
  };
}

/**
 * Run tests for a single level
 * @param {TestLevel} level
 * @param {string} testDir - Absolute path to test directory
 * @returns {TestResult}
 */
function runTestLevel(level, testDir) {
  const { debugLog } = getCore();
  const spec = TEST_LEVELS[level];
  const startTime = Date.now();

  try {
    // Detect test framework from package.json
    const framework = _detectTestFramework();
    const cmd = _buildTestCommand(framework, testDir);

    debugLog('QA', `Running ${level}: ${cmd}`, { testDir });

    const output = execSync(cmd, {
      cwd: testDir,
      timeout: 120000, // 2 min per level
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const parsed = _parseTestOutput(output, framework);

    return {
      level,
      name: spec.name,
      ...parsed,
      duration: Date.now() - startTime,
      chromeRequired: spec.requiresChrome,
      executed: true,
    };
  } catch (err) {
    // Test command failed (non-zero exit = some tests failed)
    const output = (err.stdout || '') + (err.stderr || '');
    const parsed = _parseTestOutput(output, 'unknown');

    return {
      level,
      name: spec.name,
      total: parsed.total || 1,
      passed: parsed.passed || 0,
      failed: parsed.failed || 1,
      skipped: parsed.skipped || 0,
      failures: parsed.failures || [{ test: 'unknown', error: err.message }],
      duration: Date.now() - startTime,
      chromeRequired: spec.requiresChrome,
      executed: true,
    };
  }
}

/**
 * Get test summary for QA report
 * @param {QaRunResult} runResult
 * @returns {Object} Summary object
 */
function getTestSummary(runResult) {
  return {
    feature: runResult.feature,
    passRate: runResult.passRate,
    criticalCount: runResult.criticalCount,
    verdict: runResult.passRate >= 95 && runResult.criticalCount === 0 ? 'PASS' : 'FAIL',
    totalTests: runResult.totalTests,
    totalPassed: runResult.totalPassed,
    totalFailed: runResult.totalFailed,
    skippedLevels: runResult.skippedLevels,
    duration: runResult.duration,
    chromeAvailable: runResult.chromeAvailable,
    levels: runResult.results.map(r => ({
      level: r.level,
      name: r.name,
      executed: r.executed,
      passRate: r.total > 0 ? Math.round((r.passed / r.total) * 100) : null,
      failCount: r.failed,
    })),
  };
}

// ── Private Helpers ──

function _detectTestFramework() {
  const { PROJECT_DIR } = getCore();
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'package.json'), 'utf8'));
    const devDeps = pkg.devDependencies || {};
    const deps = pkg.dependencies || {};
    const allDeps = { ...deps, ...devDeps };

    if (allDeps.vitest) return 'vitest';
    if (allDeps.jest) return 'jest';
    if (allDeps.mocha) return 'mocha';
    return 'node'; // Node.js built-in test runner
  } catch (_) {
    return 'node';
  }
}

function _buildTestCommand(framework, testDir) {
  switch (framework) {
    case 'vitest': return `npx vitest run --reporter=json ${testDir}`;
    case 'jest': return `npx jest --json --testPathPattern="${testDir}"`;
    case 'mocha': return `npx mocha "${testDir}/**/*.test.{js,ts}" --reporter json`;
    default: return `node --test "${testDir}"`;
  }
}

function _parseTestOutput(output, framework) {
  // Framework-agnostic parsing — tries JSON first, then regex
  try {
    const json = JSON.parse(output);
    // Jest/Vitest JSON format
    if (json.numTotalTests != null) {
      return {
        total: json.numTotalTests,
        passed: json.numPassedTests || 0,
        failed: json.numFailedTests || 0,
        skipped: json.numPendingTests || 0,
        failures: (json.testResults || [])
          .flatMap(r => (r.assertionResults || [])
            .filter(a => a.status === 'failed')
            .map(a => ({ test: a.fullName, error: (a.failureMessages || []).join('\n') }))
          ),
      };
    }
  } catch (_) {}

  // Regex fallback for Node.js test runner or text output
  const passMatch = output.match(/(\d+)\s*pass/i);
  const failMatch = output.match(/(\d+)\s*fail/i);
  const totalMatch = output.match(/(\d+)\s*(test|spec)/i);

  return {
    total: totalMatch ? parseInt(totalMatch[1]) : 0,
    passed: passMatch ? parseInt(passMatch[1]) : 0,
    failed: failMatch ? parseInt(failMatch[1]) : 0,
    skipped: 0,
    failures: [],
  };
}

function _countCriticalFailures(results) {
  let count = 0;
  for (const r of results) {
    if (!r.executed) continue;
    // L1 failures are always critical
    if (r.level === 'L1' && r.failed > 0) count += r.failed;
    // L2 auth/data failures are critical
    if (r.level === 'L2') {
      count += r.failures.filter(f =>
        /auth|token|permission|data.*integrit/i.test(f.test + f.error)
      ).length;
    }
  }
  return count;
}

module.exports = {
  TEST_LEVELS,
  runTests,
  runTestLevel,
  getTestSummary,
};
```

### 5.3 lib/qa/chrome-bridge.js

```javascript
/**
 * Chrome MCP Bridge — Wrapper for Chrome MCP tools with availability check
 * @module lib/qa/chrome-bridge
 * @version 2.1.1
 *
 * Provides graceful fallback when Chrome MCP is not available.
 * Used by qa-lead agent for L3-L5 test execution.
 */

let _core = null;
function getCore() {
  if (!_core) { _core = require('../core'); }
  return _core;
}

/**
 * @typedef {Object} ChromeAvailability
 * @property {boolean} available - Chrome MCP is accessible
 * @property {string} reason - Availability reason
 * @property {string[]} tools - Available Chrome MCP tool names
 */

/**
 * Check Chrome MCP availability
 * Detection strategy:
 * 1. MCP_SERVERS env var includes 'claude-in-chrome'
 * 2. Alternatively, try to detect chrome extension
 *
 * @returns {ChromeAvailability}
 */
function checkChromeAvailable() {
  const { debugLog } = getCore();

  // Strategy 1: Environment variable
  const mcpServers = process.env.MCP_SERVERS || '';
  if (mcpServers.includes('claude-in-chrome')) {
    debugLog('QA-Chrome', 'Chrome MCP detected via MCP_SERVERS');
    return {
      available: true,
      reason: 'Chrome MCP detected via MCP_SERVERS environment',
      tools: [
        'tabs_create_mcp', 'navigate', 'form_input', 'find',
        'get_page_text', 'read_console_messages', 'read_network_requests',
        'gif_creator',
      ],
    };
  }

  // Not found
  debugLog('QA-Chrome', 'Chrome MCP not available');
  return {
    available: false,
    reason: 'Chrome MCP (claude-in-chrome) not found in MCP_SERVERS',
    tools: [],
  };
}

/**
 * @typedef {Object} ChromeBridge
 * @property {boolean} available
 * @property {function(string): Promise<Object>} navigate - Navigate to URL
 * @property {function(string, string): Promise<Object>} formInput - Input to form
 * @property {function(string): Promise<string>} getPageText - Get page text
 * @property {function(): Promise<string[]>} getConsoleMessages - Read console
 * @property {function(): Promise<Object[]>} getNetworkRequests - Read network
 * @property {function(): Promise<void>} noop - No-op for unavailable state
 */

/**
 * Create Chrome bridge instance
 * Returns noop functions when Chrome is unavailable (graceful degradation)
 *
 * @returns {ChromeBridge}
 */
function createChromeBridge() {
  const status = checkChromeAvailable();

  if (!status.available) {
    return {
      available: false,
      navigate: async () => ({ success: false, reason: 'Chrome MCP unavailable' }),
      formInput: async () => ({ success: false, reason: 'Chrome MCP unavailable' }),
      getPageText: async () => '',
      getConsoleMessages: async () => [],
      getNetworkRequests: async () => [],
      noop: async () => {},
    };
  }

  // When available, Chrome MCP tools are invoked by qa-lead agent directly
  // This bridge provides the availability status for test-runner decisions
  return {
    available: true,
    navigate: async (url) => ({ success: true, url }),
    formInput: async (selector, value) => ({ success: true, selector, value }),
    getPageText: async () => '(delegated to qa-lead Chrome MCP tools)',
    getConsoleMessages: async () => [],
    getNetworkRequests: async () => [],
    noop: async () => {},
  };
}

module.exports = {
  checkChromeAvailable,
  createChromeBridge,
};
```

### 5.4 lib/qa/report-generator.js

```javascript
/**
 * QA Report Generator — Produces QA report documents
 * @module lib/qa/report-generator
 * @version 2.1.1
 */

const fs = require('fs');
const path = require('path');

let _core = null;
function getCore() {
  if (!_core) { _core = require('../core'); }
  return _core;
}

/**
 * @typedef {Object} QaReportData
 * @property {string} feature
 * @property {import('./test-runner').QaRunResult} runResult
 * @property {string} testPlanPath - Path to test plan document
 * @property {string} designDocPath - Path to design document
 * @property {Object} debugAnalysis - Debug analyst output
 */

/**
 * Generate QA report and write to docs/05-qa/
 * @param {QaReportData} data
 * @returns {{path: string, content: string}}
 */
function generateQaReport(data) {
  const { PROJECT_DIR } = getCore();
  const { feature, runResult } = data;

  const qaDir = path.join(PROJECT_DIR, 'docs', '05-qa');
  if (!fs.existsSync(qaDir)) {
    fs.mkdirSync(qaDir, { recursive: true });
  }

  const content = formatQaReportMd(data);
  const reportPath = path.join(qaDir, `${feature}.qa-report.md`);
  fs.writeFileSync(reportPath, content, 'utf8');

  return { path: reportPath, content };
}

/**
 * Format QA report as Markdown
 * @param {QaReportData} data
 * @returns {string}
 */
function formatQaReportMd(data) {
  const { feature, runResult } = data;
  const summary = require('./test-runner').getTestSummary(runResult);
  const now = new Date().toISOString().slice(0, 10);

  let md = `# QA Report: ${feature}\n\n`;
  md += `> **Date**: ${now}\n`;
  md += `> **Verdict**: ${summary.verdict}\n`;
  md += `> **Pass Rate**: ${summary.passRate}%\n`;
  md += `> **Critical Issues**: ${summary.criticalCount}\n\n`;
  md += `---\n\n`;

  // Summary table
  md += `## Test Summary\n\n`;
  md += `| Level | Name | Executed | Pass Rate | Failed |\n`;
  md += `|-------|------|:--------:|:---------:|:------:|\n`;
  for (const level of summary.levels) {
    const exec = level.executed ? 'Yes' : 'Skipped';
    const rate = level.passRate != null ? `${level.passRate}%` : 'N/A';
    md += `| ${level.level} | ${level.name} | ${exec} | ${rate} | ${level.failCount} |\n`;
  }
  md += `\n`;

  // Skipped levels note
  if (summary.skippedLevels.length > 0) {
    md += `> **Note**: ${summary.skippedLevels.join(', ')} skipped — `;
    md += summary.chromeAvailable
      ? 'no test files found\n\n'
      : 'Chrome MCP unavailable\n\n';
  }

  // Failed tests detail
  const failures = runResult.results.flatMap(r =>
    r.failures.map(f => ({ level: r.level, ...f }))
  );
  if (failures.length > 0) {
    md += `## Failed Tests\n\n`;
    for (const f of failures) {
      md += `### ${f.level}: ${f.test}\n\n`;
      md += `\`\`\`\n${f.error}\n\`\`\`\n\n`;
    }
  }

  // Metrics
  md += `## Metrics\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Tests | ${summary.totalTests} |\n`;
  md += `| Passed | ${summary.totalPassed} |\n`;
  md += `| Failed | ${summary.totalFailed} |\n`;
  md += `| Duration | ${summary.duration}ms |\n`;
  md += `| Chrome Available | ${summary.chromeAvailable ? 'Yes' : 'No'} |\n`;

  return md;
}

module.exports = {
  generateQaReport,
  formatQaReportMd,
};
```

### 5.5 lib/qa/test-plan-builder.js

```javascript
/**
 * Test Plan Builder — Design doc to test plan conversion
 * @module lib/qa/test-plan-builder
 * @version 2.1.1
 */

const fs = require('fs');
const path = require('path');

let _core = null;
function getCore() {
  if (!_core) { _core = require('../core'); }
  return _core;
}

/**
 * @typedef {Object} TestPlanItem
 * @property {string} id - Test item ID (e.g., L1-001)
 * @property {string} target - Target function/module/endpoint
 * @property {string} description - Test description
 * @property {'critical'|'high'|'medium'|'low'} priority
 * @property {string} [testData] - Required test data
 */

/**
 * @typedef {Object} TestPlan
 * @property {string} feature
 * @property {Record<string, TestPlanItem[]>} levels - L1_unit, L2_api, etc.
 * @property {{estimated: string, target: string}} coverage
 * @property {string[]} dependencies
 */

/**
 * Build test plan from design document
 * @param {string} feature - Feature name
 * @param {Object} [options]
 * @param {string} [options.designDocPath] - Override design doc path
 * @returns {TestPlan}
 */
function buildTestPlan(feature, options = {}) {
  const { PROJECT_DIR, debugLog } = getCore();

  const designPath = options.designDocPath ||
    path.join(PROJECT_DIR, 'docs', '02-design', 'features', `${feature}.design.md`);

  if (!fs.existsSync(designPath)) {
    debugLog('QA-TestPlan', 'Design doc not found', { designPath });
    return _emptyTestPlan(feature);
  }

  const designContent = fs.readFileSync(designPath, 'utf8');
  const parsed = parseDesignDoc(designContent);

  return {
    feature,
    levels: {
      L1_unit: _extractUnitTargets(parsed),
      L2_api: _extractApiTargets(parsed),
      L3_e2e: _extractE2eScenarios(parsed),
      L4_ux_flow: _extractUxFlows(parsed),
      L5_data_flow: _extractDataFlows(parsed),
    },
    coverage: { estimated: '0%', target: '95%' },
    dependencies: _detectDependencies(parsed),
  };
}

/**
 * Parse design document into structured data
 * @param {string} content - Markdown content
 * @returns {Object} Parsed design data
 */
function parseDesignDoc(content) {
  const sections = {};
  let currentSection = 'intro';
  const lines = content.split('\n');

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headerMatch) {
      currentSection = headerMatch[1].toLowerCase().trim();
    }
    if (!sections[currentSection]) sections[currentSection] = [];
    sections[currentSection].push(line);
  }

  return {
    sections,
    hasApiEndpoints: /endpoint|api|route|path/i.test(content),
    hasBrowserUi: /component|page|view|form|button|input/i.test(content),
    hasDatabase: /database|table|schema|model|entity/i.test(content),
    hasAuth: /auth|login|token|session|permission/i.test(content),
    codeBlocks: _extractCodeBlocks(content),
  };
}

// ── Private Helpers ──

function _emptyTestPlan(feature) {
  return {
    feature,
    levels: { L1_unit: [], L2_api: [], L3_e2e: [], L4_ux_flow: [], L5_data_flow: [] },
    coverage: { estimated: '0%', target: '95%' },
    dependencies: [],
  };
}

function _extractUnitTargets(parsed) {
  // Extract function/module names from code blocks
  const items = [];
  let id = 1;
  for (const block of parsed.codeBlocks) {
    const funcMatch = block.match(/(?:function|const|class)\s+(\w+)/g);
    if (funcMatch) {
      for (const match of funcMatch) {
        const name = match.replace(/(?:function|const|class)\s+/, '');
        items.push({
          id: `L1-${String(id++).padStart(3, '0')}`,
          target: name,
          description: `Unit test for ${name}`,
          priority: 'high',
        });
      }
    }
  }
  return items;
}

function _extractApiTargets(parsed) {
  const items = [];
  if (!parsed.hasApiEndpoints) return items;
  // Placeholder — actual extraction done by qa-test-planner agent
  items.push({
    id: 'L2-001',
    target: 'API endpoints',
    description: 'API endpoint tests (generated by qa-test-planner)',
    priority: 'high',
  });
  return items;
}

function _extractE2eScenarios(parsed) {
  if (!parsed.hasBrowserUi) return [];
  return [{
    id: 'L3-001',
    target: 'E2E scenarios',
    description: 'E2E browser scenarios (generated by qa-test-planner)',
    priority: 'high',
  }];
}

function _extractUxFlows(parsed) {
  if (!parsed.hasBrowserUi) return [];
  return [{
    id: 'L4-001',
    target: 'UX flows',
    description: 'UX flow scenarios (generated by qa-test-planner)',
    priority: 'medium',
  }];
}

function _extractDataFlows(parsed) {
  if (!parsed.hasDatabase) return [];
  return [{
    id: 'L5-001',
    target: 'Data flows',
    description: 'UI-API-DB data flow tests (generated by qa-test-planner)',
    priority: 'high',
  }];
}

function _detectDependencies(parsed) {
  const deps = [];
  if (parsed.hasBrowserUi) deps.push('Chrome MCP (L3-L5)');
  if (parsed.hasDatabase) deps.push('Database access (L5)');
  if (parsed.hasAuth) deps.push('Auth credentials (L2-L4)');
  return deps;
}

function _extractCodeBlocks(content) {
  const blocks = [];
  const regex = /```[\w]*\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

module.exports = {
  buildTestPlan,
  parseDesignDoc,
};
```

---

## 6. Skill + Template + Hook 설계

### 6.1 skills/qa-phase/SKILL.md

```yaml
---
name: qa-phase
classification: workflow
classification-reason: QA phase automation within PDCA cycle
deprecation-risk: none
effort: high
description: |
  QA Phase execution — L1-L5 test planning, generation, execution, and reporting.
  Triggers: qa phase, QA test, qa run, QA 실행, QAフェーズ, QA阶段, fase QA, phase QA, QA-Phase, fase QA.
argument-hint: "[feature]"
user-invocable: true
agents:
  lead: bkit:qa-lead
  planner: bkit:qa-test-planner
  generator: bkit:qa-test-generator
  debug: bkit:qa-debug-analyst
  monitor: bkit:qa-monitor
  default: bkit:qa-lead
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - AskUserQuestion
imports:
  - ${PLUGIN_ROOT}/templates/qa-report.template.md
  - ${PLUGIN_ROOT}/templates/qa-test-plan.template.md
next-skill: pdca
pdca-phase: qa
task-template: "[QA] {feature}"
---

# QA Phase Skill

> Execute QA phase of the PDCA cycle. Automatically runs L1-L5 tests with Chrome MCP integration.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `[feature]` | Target feature to test | `/qa-phase user-auth` |

## Workflow

1. **Context**: Read design doc and Check phase analysis
2. **Plan**: Generate test plan (L1-L5 items with priorities)
3. **Generate**: Create test code files
4. **Execute**: Run L1-L5 tests (L3-L5 require Chrome MCP)
5. **Report**: Generate QA report to `docs/05-qa/{feature}.qa-report.md`

## Test Levels

| Level | Type | Tool | Chrome Required |
|-------|------|------|:---------------:|
| L1 | Unit Test | Node.js / Jest / Vitest | No |
| L2 | API Test | fetch / curl | No |
| L3 | E2E Test | Chrome MCP | Yes |
| L4 | UX Flow Test | Chrome MCP | Yes |
| L5 | Data Flow Test | Chrome MCP + Bash | Yes |

## Fallback

Chrome MCP unavailable:
- L1 + L2 only
- QA report notes "L3-L5 skipped"
- QA pass/fail based on L1+L2 results only
```

### 6.2 templates/qa-report.template.md

**파일**: `templates/qa-report.template.md`

```markdown
---
template: qa-report
version: 2.1.1
variables:
  - feature
  - date
  - verdict
  - passRate
  - criticalCount
---

# QA Report: {{feature}}

> **Date**: {{date}}
> **Verdict**: {{verdict}}
> **Pass Rate**: {{passRate}}%
> **Critical Issues**: {{criticalCount}}
> **Feature**: {{feature}}

---

## 1. Test Summary

| Level | Type | Status | Pass Rate | Failed |
|-------|------|:------:|:---------:|:------:|
| L1 | Unit Test | | | |
| L2 | API Test | | | |
| L3 | E2E Test | | | |
| L4 | UX Flow Test | | | |
| L5 | Data Flow Test | | | |

## 2. Failed Tests

<!-- List each failed test with error details -->

## 3. Critical Issues

<!-- Critical failures requiring immediate fix -->

## 4. Debug Analysis

<!-- Runtime error analysis, logging recommendations -->

## 5. Metrics

| Metric | Value |
|--------|-------|
| M11 QA Pass Rate | |
| M12 Test Coverage (L1) | |
| M13 E2E Coverage | |
| M14 Runtime Error Count | |
| M15 Data Flow Integrity | |

## 6. Recommendations

<!-- Improvement recommendations based on test results -->

## 7. Chrome MCP Status

<!-- Chrome availability, tools used, fallback notes -->

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | {{date}} | Initial QA report |
```

### 6.3 templates/qa-test-plan.template.md

**파일**: `templates/qa-test-plan.template.md`

```markdown
---
template: qa-test-plan
version: 2.1.1
variables:
  - feature
  - date
---

# Test Plan: {{feature}}

> **Date**: {{date}}
> **Feature**: {{feature}}
> **Design Doc**: docs/02-design/features/{{feature}}.design.md

---

## 1. Test Scope

### In Scope
<!-- List features and behaviors to test -->

### Out of Scope
<!-- Explicitly excluded items -->

## 2. Test Items

### L1: Unit Tests

| ID | Target | Description | Priority | Test Data |
|----|--------|-------------|----------|-----------|
| L1-001 | | | | |

### L2: API Tests

| ID | Endpoint | Method | Description | Priority |
|----|----------|--------|-------------|----------|
| L2-001 | | | | |

### L3: E2E Tests

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| L3-001 | | | | |

### L4: UX Flow Tests

| ID | User Journey | Steps | Expected Result | Priority |
|----|-------------|-------|-----------------|----------|
| L4-001 | | | | |

### L5: Data Flow Tests

| ID | Direction | Steps | Validation | Priority |
|----|-----------|-------|------------|----------|
| L5-001 | UI→API→DB | | | |
| L5-002 | DB→API→UI | | | |

## 3. Test Data Requirements

<!-- Required test data, fixtures, mock data -->

## 4. Dependencies

<!-- External dependencies: Chrome MCP, DB, Auth, etc. -->

## 5. Coverage Target

| Level | Target |
|-------|--------|
| L1 | 100% of critical paths |
| L2 | 95% of API endpoints |
| L3 | 90% of user scenarios |
| L4 | Core user journeys |
| L5 | All data write paths |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | {{date}} | Initial test plan |
```

### 6.4 scripts/qa-phase-stop.js

**파일**: `scripts/qa-phase-stop.js`

```javascript
#!/usr/bin/env node
/**
 * qa-phase-stop.js - QA Phase Stop Event Handler
 *
 * Collects M11-M15 metrics from QA execution results
 * and triggers appropriate state machine event (QA_PASS/QA_FAIL/QA_SKIP).
 */

const { readStdinSync, outputAllow } = require('../lib/core/io');
const { debugLog } = require('../lib/core/debug');

try {
  const mc = require('../lib/quality/metrics-collector');
  const { extractFeatureFromContext, getPdcaStatusFull } = require('../lib/pdca/status');
  const currentStatus = getPdcaStatusFull();
  const feature = extractFeatureFromContext({ currentStatus }) || 'unknown';

  // Read QA phase output from stdin
  let qaOutput = '';
  try { qaOutput = readStdinSync() || ''; } catch (_) {}

  // M11: QA Pass Rate
  const passRateMatch = qaOutput.match(/pass\s*rate[^0-9]*(\d+\.?\d*)\s*%/i);
  const qaPassRate = passRateMatch ? parseFloat(passRateMatch[1]) : 0;
  mc.collectMetric('M11', feature, qaPassRate, 'qa-lead');

  // M12: Test Coverage L1
  const coverageMatch = qaOutput.match(/coverage[^0-9]*(\d+\.?\d*)\s*%/i);
  const testCoverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
  mc.collectMetric('M12', feature, testCoverage, 'qa-test-generator');

  // M13: E2E Scenario Coverage
  const e2eMatch = qaOutput.match(/e2e[^0-9]*coverage[^0-9]*(\d+\.?\d*)\s*%/i);
  const e2eCoverage = e2eMatch ? parseFloat(e2eMatch[1]) : 0;
  mc.collectMetric('M13', feature, e2eCoverage, 'qa-lead');

  // M14: Runtime Error Count
  const errorCountMatch = qaOutput.match(/runtime\s*error[^0-9]*(\d+)/i);
  const runtimeErrors = errorCountMatch ? parseInt(errorCountMatch[1]) : 0;
  mc.collectMetric('M14', feature, runtimeErrors, 'qa-debug-analyst');

  // M15: Data Flow Integrity
  const integrityMatch = qaOutput.match(/data\s*flow\s*integrity[^0-9]*(\d+\.?\d*)\s*%/i);
  const dataFlowIntegrity = integrityMatch ? parseFloat(integrityMatch[1]) : 100;
  mc.collectMetric('M15', feature, dataFlowIntegrity, 'qa-lead');

  debugLog('QA-Phase-Stop', 'Metrics collected', {
    feature, qaPassRate, testCoverage, e2eCoverage, runtimeErrors, dataFlowIntegrity
  });
} catch (e) {
  debugLog('QA-Phase-Stop', 'Metric collection failed', { error: e.message });
}

const message = `QA Phase completed.

Next steps:
1. Review QA report in docs/05-qa/
2. If QA PASS: proceed to /pdca report
3. If QA FAIL: review failures and /pdca iterate`;

outputAllow(message, 'Stop');
```

### 6.5 hooks/hooks.json 변경

hooks.json에는 변경 불필요. QA phase의 Stop 처리는 기존 unified-stop.js가 담당. 단, unified-stop.js 내부에 qa-phase handler를 추가해야 함 (6.6절 참조).

### 6.6 unified-stop.js 변경

**파일**: `scripts/unified-stop.js`

#### SKILL_HANDLERS 추가 (라인 95-108)

```javascript
// 현재:
const SKILL_HANDLERS = {
  'pdca': './pdca-skill-stop.js',
  // ...
  'zero-script-qa': './qa-stop.js',
  'development-pipeline': null
};

// 변경 후:
const SKILL_HANDLERS = {
  'pdca': './pdca-skill-stop.js',
  // ...
  'zero-script-qa': './qa-stop.js',
  'qa-phase': './qa-phase-stop.js',  // v2.1.1: QA Phase stop handler
  'development-pipeline': null
};
```

#### AGENT_HANDLERS 추가 (라인 118-127)

```javascript
// 현재:
const AGENT_HANDLERS = {
  'gap-detector': './gap-detector-stop.js',
  // ...
  'pm-lead': './pdca-skill-stop.js',
};

// 변경 후:
const AGENT_HANDLERS = {
  'gap-detector': './gap-detector-stop.js',
  // ...
  'pm-lead': './pdca-skill-stop.js',
  'qa-lead': './qa-phase-stop.js',  // v2.1.1: QA Lead agent stop handler
};
```

#### Quality Gate — QA phase 이벤트 추가 (라인 367-410)

기존 `phase === 'check'` 분기 아래에 qa phase 분기 추가:

```javascript
// 기존 (라인 377-384):
if (phase === 'check' && gateVerdict) {
  if (gateVerdict === 'pass') {
    event = 'MATCH_PASS';
  } else if (gateVerdict === 'retry') {
    event = 'ITERATE';
  }
}

// 변경 후:
if (phase === 'check' && gateVerdict) {
  if (gateVerdict === 'pass') {
    event = 'MATCH_PASS';  // Now goes to 'qa' instead of 'report'
  } else if (gateVerdict === 'retry') {
    event = 'ITERATE';
  }
} else if (phase === 'qa' && gateVerdict) {
  // v2.1.1: QA phase gate evaluation
  if (gateVerdict === 'pass') {
    event = 'QA_PASS';
  } else if (gateVerdict === 'retry') {
    event = 'QA_FAIL';  // retry = go to act for fixes
  } else if (gateVerdict === 'fail') {
    event = 'QA_FAIL';
  }
} else if (phase === 'qa' && !gateVerdict) {
  // No gate metrics available — check if QA was skipped
  const featureData = pdcaStatus?.features?.[feature];
  if (featureData?.chromeAvailable === false && featureData?.qaPassRate == null) {
    event = 'QA_SKIP';
  }
}
// ... existing else-if chain for pm, plan, design, do, act, report
```

---

## 7. UI 변경 상세

### 7.1 progress-bar.js 변경

**파일**: `lib/ui/progress-bar.js`

```javascript
// 현재 (라인 21):
const PHASES = ['pm', 'plan', 'design', 'do', 'check', 'report'];

// 변경 후:
const PHASES = ['pm', 'plan', 'design', 'do', 'check', 'qa', 'report'];

// 현재 (라인 22-25):
const PHASE_LABELS = {
  pm: 'PM', plan: 'PLAN', design: 'DESIGN',
  do: 'DO', check: 'CHECK', report: 'REPORT',
};

// 변경 후:
const PHASE_LABELS = {
  pm: 'PM', plan: 'PLAN', design: 'DESIGN',
  do: 'DO', check: 'CHECK', qa: 'QA', report: 'REPORT',
};
```

### 7.2 workflow-map.js 변경

**파일**: `lib/ui/workflow-map.js`

```javascript
// 현재 (라인 21-22):
const PHASES = ['PM', 'PLAN', 'DESIGN', 'DO', 'CHECK', 'REPORT'];
const PHASE_KEYS = ['pm', 'plan', 'design', 'do', 'check', 'report'];

// 변경 후:
const PHASES = ['PM', 'PLAN', 'DESIGN', 'DO', 'CHECK', 'QA', 'REPORT'];
const PHASE_KEYS = ['pm', 'plan', 'design', 'do', 'check', 'qa', 'report'];
```

QA 단계 렌더링 시 분기 표시 (QA↔Act 루프):

```
[PM] → [PLAN] → [DESIGN] → [DO] → [CHECK] ↔ [ACT]
                                       ↓
                                     [QA] ↔ [ACT]
                                       ↓
                                    [REPORT]
```

workflow-map.js의 다이어그램 렌더링 함수에서 QA→ACT 연결선을 추가해야 함. 기존 CHECK↔ACT 루프 렌더링 로직을 참조하여 QA↔ACT 루프도 동일 패턴으로 추가.

---

## 8. Quality Gate + Metrics 변경

### 8.1 gate-manager.js 변경

**파일**: `lib/quality/gate-manager.js`

#### GATE_DEFINITIONS에 qa 추가 (라인 36-119)

```javascript
// 기존 check 게이트 변경:
check: {
  pass: [
    { metric: 'matchRate', op: '>=', value: 100 },  // 변경: 90→100
    { metric: 'codeQualityScore', op: '>=', value: 70 },
    { metric: 'criticalIssueCount', op: '===', value: 0 },
    { metric: 'apiComplianceRate', op: '>=', value: 95 },
  ],
  retry: [
    { metric: 'matchRate', op: '<', value: 100 },  // 변경: 90→100
    { metric: 'codeQualityScore', op: '<', value: 70 },
  ],
  fail: [
    { metric: 'criticalIssueCount', op: '>', value: 0 },
    { metric: 'apiComplianceRate', op: '<', value: 80 },
  ],
},

// 신규 qa 게이트:
qa: {
  pass: [
    { metric: 'qaPassRate', op: '>=', value: 95 },
    { metric: 'qaCriticalCount', op: '===', value: 0 },
    { metric: 'runtimeErrorCount', op: '===', value: 0 },
  ],
  retry: [
    { metric: 'qaPassRate', op: '<', value: 95 },
    { metric: 'qaPassRate', op: '>=', value: 70 },
  ],
  fail: [
    { metric: 'qaCriticalCount', op: '>', value: 0 },
    { metric: 'qaPassRate', op: '<', value: 70 },
  ],
},
```

#### LEVEL_THRESHOLD_OVERRIDES 변경 (라인 130-148)

```javascript
const LEVEL_THRESHOLD_OVERRIDES = {
  Starter: {
    matchRate: 80,
    codeQualityScore: 60,
    apiComplianceRate: 90,
    designCompleteness: 60,
    conventionCompliance: 60,
    // Starter: QA phase 미지원 (별도 override 불필요)
  },
  Dynamic: {
    // Default values — qa gate 기본값 적용
  },
  Enterprise: {
    matchRate: 100,       // 변경: 95→100
    codeQualityScore: 80,
    apiComplianceRate: 98,
    designCompleteness: 90,
    conventionCompliance: 90,
    qaPassRate: 98,       // 신규: Enterprise는 98% 이상
    qaCriticalCount: 0,   // 동일
    runtimeErrorCount: 0, // 동일
  },
};
```

### 8.2 metrics-collector.js 변경

**파일**: `lib/quality/metrics-collector.js`

#### METRIC_SPECS에 M11~M15 추가 (라인 32-43)

```javascript
// 기존 M1-M10 유지 + M11-M15 추가:
const METRIC_SPECS = {
  M1: { id: 'M1', name: 'Match Rate', collector: 'gap-detector', unit: '%', direction: 'higher' },
  // ... M2-M10 기존 유지 ...
  M10: { id: 'M10', name: 'PDCA Cycle Time', collector: 'computed', unit: 'hours', direction: 'lower' },

  // v2.1.1: QA Phase Metrics
  M11: { id: 'M11', name: 'QA Pass Rate', collector: 'qa-lead', unit: '%', direction: 'higher' },
  M12: { id: 'M12', name: 'Test Coverage L1', collector: 'qa-test-generator', unit: '%', direction: 'higher' },
  M13: { id: 'M13', name: 'E2E Scenario Coverage', collector: 'qa-lead', unit: '%', direction: 'higher' },
  M14: { id: 'M14', name: 'Runtime Error Count', collector: 'qa-debug-analyst', unit: 'count', direction: 'lower' },
  M15: { id: 'M15', name: 'Data Flow Integrity', collector: 'qa-lead', unit: '%', direction: 'higher' },
};
```

#### METRIC_ID_TO_GATE_NAME에 M11~M15 매핑 추가 (라인 54-65)

```javascript
const METRIC_ID_TO_GATE_NAME = {
  // ... 기존 M1-M10 ...
  M11: 'qaPassRate',
  M12: 'testCoverageL1',
  M13: 'e2eScenarioCoverage',
  M14: 'runtimeErrorCount',
  M15: 'dataFlowIntegrity',
};
```

---

## 9. Automation 변경

**파일**: `lib/pdca/automation.js`

### 9.1 nextPhaseMap 변경

```javascript
// 현재 generateAutoTrigger (라인 75-84):
const phaseMap = {
  pm: { skill: 'pdca', args: `plan ${context.feature}` },
  plan: { skill: 'pdca', args: `design ${context.feature}` },
  design: { skill: 'pdca', args: `do ${context.feature}` },
  do: { skill: 'pdca', args: `analyze ${context.feature}` },
  check: context.matchRate >= 90
    ? { skill: 'pdca', args: `report ${context.feature}` }
    : { skill: 'pdca', args: `iterate ${context.feature}` },
  act: { skill: 'pdca', args: `analyze ${context.feature}` },
};

// 변경 후:
const phaseMap = {
  pm: { skill: 'pdca', args: `plan ${context.feature}` },
  plan: { skill: 'pdca', args: `design ${context.feature}` },
  design: { skill: 'pdca', args: `do ${context.feature}` },
  do: { skill: 'pdca', args: `analyze ${context.feature}` },
  check: context.matchRate >= 100
    ? { skill: 'qa-phase', args: context.feature }
    : { skill: 'pdca', args: `iterate ${context.feature}` },
  act: { skill: 'pdca', args: `analyze ${context.feature}` },
  qa: context.qaPassRate >= 95 && context.qaCriticalCount === 0
    ? { skill: 'pdca', args: `report ${context.feature}` }
    : { skill: 'pdca', args: `iterate ${context.feature}` },
};
```

### 9.2 autoAdvancePdcaPhase의 nextPhaseMap 변경

```javascript
// 현재 (라인 166-173):
const nextPhaseMap = {
  pm: 'plan',
  plan: 'design',
  design: 'do',
  do: 'check',
  check: result.matchRate >= 90 ? 'report' : 'act',
  act: 'check'
};

// 변경 후:
const nextPhaseMap = {
  pm: 'plan',
  plan: 'design',
  design: 'do',
  do: 'check',
  check: result.matchRate >= 100 ? 'qa' : 'act',
  act: 'check',
  qa: (result.qaPassRate >= 95 && result.qaCriticalCount === 0) ? 'report' : 'act',
};
```

### 9.3 shouldAutoAdvance 변경

```javascript
// 현재 (라인 50-64):
function shouldAutoAdvance(phase) {
  // ...
  // semi-auto: only auto-advance from check to act (when matchRate < 90)
  return phase === 'check';
}

// 변경 후:
function shouldAutoAdvance(phase) {
  const { getConfig } = getCore();
  const level = getAutomationLevel();

  if (level === 'manual') return false;

  const reviewCheckpoints = getConfig('pdca.fullAuto.reviewCheckpoints', ['design']);

  if (level === 'full-auto') {
    return !reviewCheckpoints.includes(phase);
  }

  // semi-auto: auto-advance from check and qa phases
  return phase === 'check' || phase === 'qa';
}
```

### 9.4 buildNextActionQuestion — qa phase 추가

```javascript
// questionSets 객체에 'qa' 키 추가:
'qa': {
  question: `QA Phase completed (Pass Rate: ${context.qaPassRate || 0}%). Please select next step.`,
  header: 'QA Complete',
  options: [
    {
      label: 'Generate Report (Recommended)',
      description: 'All QA tests passed, generate completion report',
      preview: [
        '## Report Phase',
        '',
        `**Command**: \`/pdca report ${feature}\``,
        '',
        `**QA Pass Rate**: ${context.qaPassRate || 0}%`,
        `**Critical Issues**: ${context.qaCriticalCount || 0}`,
        '',
        '**PDCA Status**:',
        '[Check] OK -> [QA] OK -> **[Report]**'
      ].join('\n')
    },
    {
      label: 'Fix & Retry QA',
      description: 'Fix failed tests and re-run QA phase',
      preview: [
        '## Fix & Retry',
        '',
        `**Command**: \`/pdca iterate ${feature}\` then \`/qa-phase ${feature}\``,
        '',
        '**Failed Tests**: Review docs/05-qa/ for details'
      ].join('\n')
    },
    {
      label: 'Skip QA → Report',
      description: 'Skip remaining QA tests and proceed to report',
      preview: [
        '## Skip QA',
        '',
        `**Command**: \`/pdca report ${feature}\``,
        '',
        '**Warning**: QA results will be recorded as "skipped"'
      ].join('\n')
    }
  ]
},
```

### 9.5 getNextPdcaActionAfterCompletion 변경

```javascript
// 현재 (라인 537-546):
const nextPhaseMap = {
  pm: { nextPhase: 'plan', command: `/pdca plan ${feature}` },
  plan: { nextPhase: 'design', command: `/pdca design ${feature}` },
  design: { nextPhase: 'do', command: `/pdca do ${feature}` },
  do: { nextPhase: 'check', command: `/pdca analyze ${feature}` },
  check: matchRate >= 90
    ? { nextPhase: 'report', command: `/pdca report ${feature}` }
    : { nextPhase: 'act', command: `/pdca iterate ${feature}` },
  act: { nextPhase: 'check', command: `/pdca analyze ${feature}` },
  report: { nextPhase: 'completed', command: `/pdca archive ${feature}` },
};

// 변경 후:
const nextPhaseMap = {
  pm: { nextPhase: 'plan', command: `/pdca plan ${feature}` },
  plan: { nextPhase: 'design', command: `/pdca design ${feature}` },
  design: { nextPhase: 'do', command: `/pdca do ${feature}` },
  do: { nextPhase: 'check', command: `/pdca analyze ${feature}` },
  check: matchRate >= 100
    ? { nextPhase: 'qa', command: `/qa-phase ${feature}` }
    : { nextPhase: 'act', command: `/pdca iterate ${feature}` },
  act: { nextPhase: 'check', command: `/pdca analyze ${feature}` },
  qa: featureData?.qaPassRate >= 95
    ? { nextPhase: 'report', command: `/pdca report ${feature}` }
    : { nextPhase: 'act', command: `/pdca iterate ${feature}` },
  report: { nextPhase: 'completed', command: `/pdca archive ${feature}` },
};
```

### 9.6 detectPdcaFromTaskSubject 변경

```javascript
// 현재 patterns (라인 500-508):
const patterns = {
  pm:     /\[PM\]\s+(.+)/,
  plan:   /\[Plan\]\s+(.+)/,
  design: /\[Design\]\s+(.+)/,
  do:     /\[Do\]\s+(.+)/,
  check:  /\[Check\]\s+(.+)/,
  act:    /\[Act(?:-\d+)?\]\s+(.+)/,
  report: /\[Report\]\s+(.+)/,
};

// 변경 후:
const patterns = {
  pm:     /\[PM\]\s+(.+)/,
  plan:   /\[Plan\]\s+(.+)/,
  design: /\[Design\]\s+(.+)/,
  do:     /\[Do\]\s+(.+)/,
  check:  /\[Check\]\s+(.+)/,
  act:    /\[Act(?:-\d+)?\]\s+(.+)/,
  qa:     /\[QA\]\s+(.+)/,
  report: /\[Report\]\s+(.+)/,
};
```

---

## 10. Team Strategy 변경

**파일**: `lib/team/strategy.js`

### 10.1 Dynamic roles에 qa 추가

```javascript
// 현재 Dynamic.roles (라인 15-33):
roles: [
  { name: 'developer', ... },
  { name: 'frontend', ... },
  {
    name: 'qa',
    description: 'Testing and gap analysis',
    agents: ['qa-monitor', 'gap-detector'],
    phases: ['check'],
  },
],

// 변경 후:
roles: [
  { name: 'developer', ... },
  { name: 'frontend', ... },
  {
    name: 'qa',
    description: 'Testing, gap analysis, and QA verification',
    agents: ['qa-monitor', 'gap-detector', 'qa-lead'],
    phases: ['check', 'qa'],
  },
],
```

### 10.2 Dynamic phaseStrategy에 qa 추가

```javascript
// 현재 (라인 36-43):
phaseStrategy: {
  pm: 'single',
  plan: 'single',
  design: 'single',
  do: 'parallel',
  check: 'parallel',
  act: 'parallel',
},

// 변경 후:
phaseStrategy: {
  pm: 'single',
  plan: 'single',
  design: 'single',
  do: 'parallel',
  check: 'parallel',
  act: 'parallel',
  qa: 'parallel',
},
```

### 10.3 Enterprise roles에 qa-lead 추가

```javascript
// 현재 Enterprise.qa role (라인 67-72):
{
  name: 'qa',
  description: 'Quality strategy and verification',
  agents: ['qa-strategist', 'qa-monitor', 'gap-detector'],
  phases: ['check'],
},

// 변경 후:
{
  name: 'qa',
  description: 'Quality strategy, verification, and QA testing',
  agents: ['qa-strategist', 'qa-monitor', 'gap-detector', 'qa-lead', 'qa-test-planner', 'qa-test-generator', 'qa-debug-analyst'],
  phases: ['check', 'qa'],
},
```

### 10.4 Enterprise phaseStrategy에 qa 추가

```javascript
// 현재 (라인 86-93):
phaseStrategy: {
  pm: 'single',
  plan: 'single',
  design: 'council',
  do: 'swarm',
  check: 'council',
  act: 'watchdog',
},

// 변경 후:
phaseStrategy: {
  pm: 'single',
  plan: 'single',
  design: 'council',
  do: 'swarm',
  check: 'council',
  act: 'watchdog',
  qa: 'council',  // qa-lead orchestrates, sub-agents participate
},
```

### 10.5 teammates 카운트 업데이트

```javascript
// Dynamic: 3 → 4 (qa-lead 추가)
// Enterprise: 6 → 7 (qa-lead, qa-test-planner, qa-test-generator, qa-debug-analyst 추가하지만 role은 1개이므로 teammate 1 증가)
```

---

## 11. Core Paths 변경

**파일**: `lib/core/paths.js`

### 11.1 DEFAULT_DOC_PATHS에 qa 추가

```javascript
// 현재 (라인 114-140):
const DEFAULT_DOC_PATHS = {
  pm: [...],
  plan: [...],
  design: [...],
  analysis: [...],
  report: [...],
  archive: 'docs/archive/{date}/{feature}',
};

// 변경 후:
const DEFAULT_DOC_PATHS = {
  pm: [...],
  plan: [...],
  design: [...],
  analysis: [...],
  qa: [
    'docs/05-qa/{feature}.qa-report.md',
    'docs/05-qa/{feature}.test-plan.md',
  ],
  report: [...],
  archive: 'docs/archive/{date}/{feature}',
};
```

### 11.2 getDocPaths에 qa 추가

```javascript
// 현재 (라인 146-156):
function getDocPaths() {
  const { getConfig } = getConfigModule();
  return {
    pm: getConfig('pdca.docPaths.pm', DEFAULT_DOC_PATHS.pm),
    plan: getConfig('pdca.docPaths.plan', DEFAULT_DOC_PATHS.plan),
    design: getConfig('pdca.docPaths.design', DEFAULT_DOC_PATHS.design),
    analysis: getConfig('pdca.docPaths.analysis', DEFAULT_DOC_PATHS.analysis),
    report: getConfig('pdca.docPaths.report', DEFAULT_DOC_PATHS.report),
    archive: getConfig('pdca.docPaths.archive', DEFAULT_DOC_PATHS.archive),
  };
}

// 변경 후:
function getDocPaths() {
  const { getConfig } = getConfigModule();
  return {
    pm: getConfig('pdca.docPaths.pm', DEFAULT_DOC_PATHS.pm),
    plan: getConfig('pdca.docPaths.plan', DEFAULT_DOC_PATHS.plan),
    design: getConfig('pdca.docPaths.design', DEFAULT_DOC_PATHS.design),
    analysis: getConfig('pdca.docPaths.analysis', DEFAULT_DOC_PATHS.analysis),
    qa: getConfig('pdca.docPaths.qa', DEFAULT_DOC_PATHS.qa),
    report: getConfig('pdca.docPaths.report', DEFAULT_DOC_PATHS.report),
    archive: getConfig('pdca.docPaths.archive', DEFAULT_DOC_PATHS.archive),
  };
}
```

---

## 12. PDCA Skill 변경

**파일**: `skills/pdca/SKILL.md`

### 12.1 agents에 qa 추가

```yaml
# 현재:
agents:
  analyze: bkit:gap-detector
  iterate: bkit:pdca-iterator
  report: bkit:report-generator
  team: null
  pm: null
  default: null

# 변경 후:
agents:
  analyze: bkit:gap-detector
  iterate: bkit:pdca-iterator
  report: bkit:report-generator
  qa: bkit:qa-lead
  team: null
  pm: null
  default: null
```

### 12.2 imports에 qa 템플릿 추가

```yaml
# 현재:
imports:
  - ${PLUGIN_ROOT}/templates/plan.template.md
  - ${PLUGIN_ROOT}/templates/design.template.md
  - ${PLUGIN_ROOT}/templates/do.template.md
  - ${PLUGIN_ROOT}/templates/analysis.template.md
  - ${PLUGIN_ROOT}/templates/report.template.md
  - ${PLUGIN_ROOT}/templates/iteration-report.template.md

# 변경 후:
imports:
  - ${PLUGIN_ROOT}/templates/plan.template.md
  - ${PLUGIN_ROOT}/templates/design.template.md
  - ${PLUGIN_ROOT}/templates/do.template.md
  - ${PLUGIN_ROOT}/templates/analysis.template.md
  - ${PLUGIN_ROOT}/templates/qa-report.template.md
  - ${PLUGIN_ROOT}/templates/qa-test-plan.template.md
  - ${PLUGIN_ROOT}/templates/report.template.md
  - ${PLUGIN_ROOT}/templates/iteration-report.template.md
```

### 12.3 Arguments 테이블에 qa 추가

```markdown
| `qa [feature]` | Run QA phase (L1-L5 tests) | `/pdca qa user-auth` |
```

---

## 13. 에러 처리 + 엣지 케이스

### 13.1 Chrome MCP 타임아웃

| 상황 | 처리 |
|------|------|
| Chrome MCP 연결 타임아웃 (>10s) | L3-L5 스킵, QA_SKIP 이벤트 아님 (L1+L2로 판정) |
| Chrome 탭 크래시 | 해당 테스트 FAIL 기록, 다음 테스트 계속 |
| Chrome MCP 서버 다운 | `checkChromeAvailable()` false 반환, L1+L2 only |

### 13.2 테스트 실행 에러

| 상황 | 처리 |
|------|------|
| 테스트 디렉토리 미존재 | 해당 레벨 skip (total=0), passRate 계산에서 제외 |
| 테스트 프레임워크 미설치 | Node.js 내장 test runner fallback |
| 테스트 타임아웃 (120s) | FAIL 기록 (error: "timeout") |
| execSync 예외 | stderr에서 결과 파싱 시도, 실패 시 failed=1 |

### 13.3 State Machine 엣지 케이스

| 상황 | 처리 |
|------|------|
| QA phase에서 ERROR 이벤트 | 기존 `from:'*', event:'ERROR'` wildcard 처리 |
| QA phase에서 RESET 이벤트 | 기존 wildcard → idle 복귀 |
| QA retry 3회 초과 | `guardQaMaxRetryReached` → 강제 Report |
| Check→QA 후 즉시 QA_SKIP | 허용 (Chrome 미설치 시 정상 경로) |
| act→qa→act→qa 루프 | maxQaRetries(기본 3)로 제한 |

### 13.4 하위 호환

| 항목 | 호환 전략 |
|------|----------|
| 기존 90% matchRate 프로젝트 | `bkit.config.json`에 `pdca.matchRateThreshold: 90` 설정으로 override |
| QA phase 없는 기존 워크플로우 | `pdca.qaPhaseEnabled: false` config로 비활성화 가능 (기본 true) |
| Starter 레벨 | Team Strategy에서 QA phase 미지원, Check→Report 직행 유지 |
| 기존 pdca-status.json | qa 필드 없으면 null 처리, 기존 데이터 호환 |

### 13.5 QA Phase 비활성화 config

```javascript
// state-machine.js guardMatchRatePass에서 QA 비활성화 처리:
guardMatchRatePass(ctx) {
  const { getConfig } = getCore();
  const qaEnabled = getConfig('pdca.qaPhaseEnabled', true);

  if (!qaEnabled) {
    // QA 비활성화 시 기존 동작: 90% → report
    const threshold = getConfig('pdca.matchRateThreshold', 90);
    return (ctx.matchRate || 0) >= threshold;
  }

  // QA 활성화 시: 100% → qa
  const threshold = getConfig('pdca.matchRateThreshold', 100);
  return (ctx.matchRate || 0) >= threshold;
},
```

**MATCH_PASS의 to 결정도 동적으로**:

```javascript
// TRANSITIONS에서 check→qa transition을 수정:
{
  from: 'check', event: 'MATCH_PASS',
  to: '*',  // Dynamic: resolved by action
  guard: 'guardMatchRatePass',
  actions: ['recordTimestamp', 'notifyPhaseComplete', 'recordMatchRate', 'resolvePostCheckTarget'],
  description: 'Match rate >= threshold, proceed to QA or Report'
},
```

```javascript
// ACTIONS에 resolvePostCheckTarget 추가:
resolvePostCheckTarget(ctx, _event) {
  const { getConfig } = getCore();
  const qaEnabled = getConfig('pdca.qaPhaseEnabled', true);

  if (qaEnabled) {
    ctx.currentState = 'qa';
    ACTIONS.initQaPhase(ctx, _event);
  } else {
    ctx.currentState = 'report';
  }
},
```

> **대안**: `to:'*'` 접근이 복잡하면, QA 비활성화 시 별도 transition `{ from: 'check', event: 'MATCH_PASS', to: 'report', guard: 'guardQaDisabled' }`를 추가하고 transition 순서로 우선순위 결정. QA disabled guard가 먼저 매칭되면 report로 직행.

---

## 14. 테스트 시나리오

### 14.1 State Machine 테스트

| # | 시나리오 | 입력 | 기대 결과 |
|:-:|---------|------|----------|
| T1 | Check 100% → QA 진입 | `check` + `MATCH_PASS` + matchRate=100 | state → `qa` |
| T2 | Check <100% → Act | `check` + `ITERATE` + matchRate=85 | state → `act` |
| T3 | QA 통과 → Report | `qa` + `QA_PASS` + passRate=98, critical=0 | state → `report` |
| T4 | QA 실패 → Act | `qa` + `QA_FAIL` + passRate=80 | state → `act` |
| T5 | QA 스킵 → Report | `qa` + `QA_SKIP` | state → `report` |
| T6 | Act → QA 재실행 | `act` + `QA_RETRY` | state → `qa` |
| T7 | QA max retry → Report | `qa` + `REPORT_DONE` + qaRetryCount=3 | state → `report` |
| T8 | QA 비활성화 → Report | `check` + `MATCH_PASS` + qaEnabled=false | state → `report` |
| T9 | QA에서 ERROR | `qa` + `ERROR` | state → `error` |
| T10 | QA에서 RESET | `qa` + `RESET` | state → `idle` |

### 14.2 Phase 정의 테스트

| # | 시나리오 | 기대 결과 |
|:-:|---------|----------|
| T11 | getPhaseNumber('qa') | 6 |
| T12 | getPhaseName(6) | 'qa' |
| T13 | getNextPdcaPhase('act') | 'qa' |
| T14 | getPreviousPdcaPhase('qa') | 'act' |
| T15 | getNextPdcaPhase('qa') | 'report' |
| T16 | validatePdcaTransition(f, 'qa', 'report') | valid: true |

### 14.3 Automation 테스트

| # | 시나리오 | 기대 결과 |
|:-:|---------|----------|
| T17 | shouldAutoAdvance('qa') semi-auto | true |
| T18 | generateAutoTrigger('check', {matchRate:100}) | skill: 'qa-phase' |
| T19 | autoAdvancePdcaPhase(f, 'check', {matchRate:100}) | phase → 'qa' |
| T20 | autoAdvancePdcaPhase(f, 'qa', {qaPassRate:98}) | phase → 'report' |

### 14.4 Chrome Bridge 테스트

| # | 시나리오 | 기대 결과 |
|:-:|---------|----------|
| T21 | Chrome 미설치 + runTests | L3-L5 skipped, L1+L2만 실행 |
| T22 | Chrome 설치 + runTests | L1-L5 전체 실행 |
| T23 | checkChromeAvailable (MCP 없음) | { available: false } |
| T24 | createChromeBridge (MCP 없음) | noop 함수 반환 |

### 14.5 통합 테스트

| # | 시나리오 | 기대 결과 |
|:-:|---------|----------|
| T25 | `/pdca qa {feature}` 전체 실행 | QA 보고서 생성 + QA_PASS/FAIL 판정 |
| T26 | unified-stop.js qa phase 처리 | gate 평가 + FSM transition |
| T27 | progress-bar QA 렌더링 | QA 단계 표시 |
| T28 | 기존 3,278+ TC 회귀 | 0건 회귀 |

### 14.6 회귀 테스트 (필수)

| # | 시나리오 | 기대 결과 |
|:-:|---------|----------|
| T29 | 기존 PM→Plan→Design→Do→Check(90%)→Report 경로 | qaEnabled=false config로 동작 유지 |
| T30 | 기존 Check↔Act 루프 | 변경 없이 동작 |
| T31 | 기존 qa-monitor agent 호출 | 독립 동작 유지 |
| T32 | 기존 zero-script-qa skill | 독립 동작 유지 |

---

## 15. 파일 변경 요약 (체크리스트)

### 신규 파일 (~14개)

| # | 유형 | 파일 | 설명 |
|:-:|------|------|------|
| 1 | Agent | `agents/qa-lead.md` | QA 팀 리더 (opus) |
| 2 | Agent | `agents/qa-test-planner.md` | 테스트 계획 수립 (sonnet) |
| 3 | Agent | `agents/qa-test-generator.md` | 테스트 코드 생성 (sonnet) |
| 4 | Agent | `agents/qa-debug-analyst.md` | 디버그 로그 분석 (sonnet) |
| 5 | Skill | `skills/qa-phase/SKILL.md` | /qa-phase 스킬 정의 |
| 6 | Template | `templates/qa-report.template.md` | QA 보고서 템플릿 |
| 7 | Template | `templates/qa-test-plan.template.md` | 테스트 계획 템플릿 |
| 8 | Lib | `lib/qa/index.js` | QA 모듈 인덱스 |
| 9 | Lib | `lib/qa/test-runner.js` | 테스트 실행 엔진 (L1-L5) |
| 10 | Lib | `lib/qa/chrome-bridge.js` | Chrome MCP 래퍼 + fallback |
| 11 | Lib | `lib/qa/report-generator.js` | QA 보고서 생성 |
| 12 | Lib | `lib/qa/test-plan-builder.js` | Design→Test Plan 변환 |
| 13 | Script | `scripts/qa-phase-stop.js` | QA phase Stop handler |
| 14 | Dir | `docs/05-qa/` | QA 결과 문서 디렉토리 |

### 수정 파일 (~12개)

| # | 파일 | 변경 내용 | 영향도 |
|:-:|------|----------|:------:|
| 1 | `lib/pdca/state-machine.js` | +qa state, +5 transitions, +2 guards, +3 actions | High |
| 2 | `lib/pdca/phase.js` | +qa phase, order 재배치 (report 6→7, archived 7→8) | High |
| 3 | `lib/pdca/automation.js` | +qa phase map, shouldAutoAdvance, buildNextActionQuestion | High |
| 4 | `lib/ui/progress-bar.js` | +QA 단계 렌더링 | Low |
| 5 | `lib/ui/workflow-map.js` | +QA 단계 + QA↔Act 분기 렌더링 | Low |
| 6 | `scripts/unified-stop.js` | +qa handler, +qa phase FSM 이벤트 매핑 | Medium |
| 7 | `lib/team/strategy.js` | +qa role agents + phaseStrategy | Medium |
| 8 | `lib/quality/metrics-collector.js` | +M11~M15 spec + gate name mapping | Medium |
| 9 | `lib/quality/gate-manager.js` | +qa gate definition, check threshold 90→100 | Medium |
| 10 | `skills/pdca/SKILL.md` | +qa agent, +qa templates, +qa argument | Low |
| 11 | `lib/core/paths.js` | +qa doc paths | Low |
| 12 | `lib/core/constants.js` | +QA 관련 상수 (있으면) | Low |

---

## Version History

| 버전 | 날짜 | 변경 |
|------|------|------|
| 0.1 | 2026-04-08 | Design 초안 작성 — Plan의 모든 항목을 코드 수준으로 상세화 |
