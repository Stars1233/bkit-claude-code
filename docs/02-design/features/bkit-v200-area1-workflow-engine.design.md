# bkit v2.0.0 영역 1: 워크플로우 자동화 엔진 상세 설계

> **Design Phase** | Feature: bkit-v200-enhancement (Area 1)
> Date: 2026-03-19 | Author: Claude Opus 4.6 + Enterprise Expert Agent

---

## 목차

1. [선언적 PDCA 상태 머신](#1-선언적-pdca-상태-머신)
2. [YAML 워크플로우 DSL](#2-yaml-워크플로우-dsl)
3. [3단계 자동화 레벨](#3-3단계-자동화-레벨)
4. [Do 완료 3-Layer 감지](#4-do-완료-3-layer-감지)
5. [Full-Auto Do](#5-full-auto-do)
6. [병렬 Feature 관리](#6-병렬-feature-관리)
7. [/batch + PDCA 연동](#7-batch--pdca-연동)
8. [에러 복구](#8-에러-복구)
9. [자동 PDCA Cleanup/Archive](#9-자동-pdca-cleanuparchive)
10. [모듈 의존성 총괄도](#10-모듈-의존성-총괄도)

---

## 1. 선언적 PDCA 상태 머신

### 1.1 파일 경로 + 목적

| 파일 | 목적 |
|------|------|
| `lib/pdca/state-machine.js` | PDCA FSM 코어. 단일 TRANSITIONS 테이블로 모든 Phase 전이를 선언적으로 관리 |

### 1.2 핵심 데이터 구조

```javascript
/**
 * @typedef {'idle'|'pm'|'plan'|'design'|'do'|'check'|'act'|'report'|'archived'|'error'} PdcaState
 */

/**
 * @typedef {'START'|'PM_DONE'|'PLAN_DONE'|'DESIGN_DONE'|'DO_COMPLETE'|'ANALYZE_DONE'|'ITERATE'|'MATCH_PASS'|'REPORT_DONE'|'ARCHIVE'|'SKIP_PM'|'REJECT'|'ERROR'|'RECOVER'|'RESET'|'ROLLBACK'|'TIMEOUT'|'ABANDON'} PdcaEvent
 */

/**
 * @typedef {Object} TransitionEntry
 * @property {PdcaState} from - 출발 상태
 * @property {PdcaEvent} event - 트리거 이벤트
 * @property {PdcaState} to - 도착 상태
 * @property {string|null} guard - Guard 함수명 (null이면 무조건 허용)
 * @property {string[]} actions - 전환 시 실행할 Action 함수명 배열
 * @property {string} description - 전환 설명 (디버깅/로깅용)
 */

/**
 * @typedef {Object} StateMachineContext
 * @property {string} feature - Feature 이름
 * @property {PdcaState} currentState - 현재 상태
 * @property {number} matchRate - 현재 Match Rate (0-100)
 * @property {number} iterationCount - 현재 반복 횟수
 * @property {number} maxIterations - 최대 반복 횟수 (기본 5)
 * @property {string} automationLevel - 자동화 레벨 ('guide'|'semi-auto'|'full-auto')
 * @property {string} workflowId - 적용 중인 워크플로우 ID
 * @property {Object} timestamps - Phase별 타임스탬프
 * @property {Object} metadata - 추가 메타데이터
 */

/**
 * @typedef {Object} TransitionResult
 * @property {boolean} success - 전환 성공 여부
 * @property {PdcaState} previousState - 이전 상태
 * @property {PdcaState} currentState - 현재(전환 후) 상태
 * @property {PdcaEvent} event - 트리거된 이벤트
 * @property {string[]} executedActions - 실행된 Action 목록
 * @property {string|null} blockedBy - 실패 시 Guard 이름
 * @property {number} timestamp - 전환 시각 (ms)
 */
```

### 1.3 TRANSITIONS 테이블 전체 정의

```javascript
/**
 * 선언적 PDCA 상태 전이 테이블
 * 모든 허용 가능한 전이를 단일 배열로 정의
 *
 * Guard 함수: context를 받아 boolean 반환. true면 전이 허용.
 * Action 함수: context를 받아 부수효과 실행 (상태 파일 업데이트, 로그 등).
 */
const TRANSITIONS = [
  // ── 정상 전진 흐름 ──────────────────────────────────────────
  {
    from: 'idle',    event: 'START',       to: 'pm',
    guard: null,
    actions: ['initFeature', 'recordTimestamp'],
    description: 'New feature PDCA cycle begins'
  },
  {
    from: 'idle',    event: 'SKIP_PM',     to: 'plan',
    guard: null,
    actions: ['initFeature', 'recordTimestamp'],
    description: 'Skip PM phase, start directly with Plan'
  },
  {
    from: 'pm',      event: 'PM_DONE',     to: 'plan',
    guard: 'guardDeliverableExists',
    actions: ['recordTimestamp', 'notifyPhaseComplete'],
    description: 'PM analysis complete, proceed to Plan'
  },
  {
    from: 'plan',    event: 'PLAN_DONE',   to: 'design',
    guard: 'guardDeliverableExists',
    actions: ['recordTimestamp', 'notifyPhaseComplete'],
    description: 'Plan document complete, proceed to Design'
  },
  {
    from: 'design',  event: 'DESIGN_DONE', to: 'do',
    guard: 'guardDesignApproved',
    actions: ['recordTimestamp', 'notifyPhaseComplete', 'createCheckpoint'],
    description: 'Design approved, proceed to implementation'
  },
  {
    from: 'do',      event: 'DO_COMPLETE', to: 'check',
    guard: 'guardDoComplete',
    actions: ['recordTimestamp', 'notifyPhaseComplete'],
    description: 'Implementation complete, proceed to analysis'
  },
  {
    from: 'check',   event: 'MATCH_PASS',  to: 'report',
    guard: 'guardMatchRatePass',
    actions: ['recordTimestamp', 'notifyPhaseComplete', 'recordMatchRate'],
    description: 'Match rate >= threshold, proceed to Report'
  },
  {
    from: 'check',   event: 'ITERATE',     to: 'act',
    guard: 'guardCanIterate',
    actions: ['recordTimestamp', 'incrementIteration'],
    description: 'Match rate < threshold, iterate improvement'
  },
  {
    from: 'act',     event: 'ANALYZE_DONE', to: 'check',
    guard: null,
    actions: ['recordTimestamp'],
    description: 'Act iteration done, re-analyze'
  },
  {
    from: 'report',  event: 'REPORT_DONE', to: 'report',
    guard: null,
    actions: ['recordTimestamp', 'notifyPhaseComplete'],
    description: 'Report generation complete'
  },
  {
    from: 'report',  event: 'ARCHIVE',     to: 'archived',
    guard: null,
    actions: ['recordTimestamp', 'archiveDocuments', 'cleanupFeature'],
    description: 'Archive completed feature'
  },

  // ── 특수 전환 ──────────────────────────────────────────────
  {
    from: 'check',   event: 'REPORT_DONE', to: 'report',
    guard: 'guardMaxIterReached',
    actions: ['recordTimestamp', 'forceReport'],
    description: 'Max iterations reached, force report generation'
  },
  {
    from: 'pm',      event: 'REJECT',      to: 'idle',
    guard: null,
    actions: ['recordTimestamp', 'cleanupFeature'],
    description: 'PM analysis rejected, return to idle'
  },
  {
    from: 'plan',    event: 'REJECT',      to: 'pm',
    guard: null,
    actions: ['recordTimestamp'],
    description: 'Plan rejected, return to PM'
  },

  // ── 에러 / 복구 ──────────────────────────────────────────────
  {
    from: '*',       event: 'ERROR',       to: 'error',
    guard: null,
    actions: ['recordTimestamp', 'saveResumePoint', 'notifyError'],
    description: 'Error occurred, save state for recovery'
  },
  {
    from: 'error',   event: 'RECOVER',     to: '*',
    guard: 'guardResumeAvailable',
    actions: ['recordTimestamp', 'restoreFromResume'],
    description: 'Recover from error using saved resume point'
  },
  {
    from: '*',       event: 'RESET',       to: 'idle',
    guard: null,
    actions: ['recordTimestamp', 'cleanupFeature'],
    description: 'Reset feature to idle state'
  },
  {
    from: '*',       event: 'ROLLBACK',    to: '*',
    guard: 'guardCheckpointExists',
    actions: ['recordTimestamp', 'restoreCheckpoint'],
    description: 'Rollback to previous checkpoint'
  },

  // ── 타임아웃 / 방기 ────────────────────────────────────────
  {
    from: '*',       event: 'TIMEOUT',     to: 'archived',
    guard: 'guardStaleFeature',
    actions: ['recordTimestamp', 'archiveStale'],
    description: 'Stale feature auto-archived (7 days inactive)'
  },
  {
    from: '*',       event: 'ABANDON',     to: 'archived',
    guard: null,
    actions: ['recordTimestamp', 'archiveAbandoned'],
    description: 'Feature explicitly abandoned'
  },
];
```

> **`*` 와일드카드 규칙**: `from: '*'`는 모든 상태에서 해당 이벤트를 수락. `to: '*'`는 동적 결정(Guard/Action이 실제 목적지를 결정).

### 1.4 Guard 함수 정의

```javascript
/**
 * Guard 함수 레지스트리
 * 각 Guard는 (context: StateMachineContext) => boolean
 */
const GUARDS = {
  /**
   * 해당 Phase의 Deliverable(문서)이 존재하는지 확인
   * @param {StateMachineContext} ctx
   * @returns {boolean}
   */
  guardDeliverableExists(ctx) {
    // phase.checkPhaseDeliverables() 활용
    // ctx.currentState에 해당하는 문서 존재 확인
  },

  /**
   * Design 문서가 승인되었는지 확인 (Semi-Auto/Full-Auto에서만 자동 통과)
   * @param {StateMachineContext} ctx
   * @returns {boolean}
   */
  guardDesignApproved(ctx) {
    // automationLevel이 'full-auto'면 무조건 통과
    // 'semi-auto'면 Design 문서 존재 확인으로 대체
    // 'guide'면 사용자 명시적 승인 필요 (false 반환 후 AskUserQuestion)
  },

  /**
   * Do 완료 여부 확인 (3-Layer 감지 결과)
   * @param {StateMachineContext} ctx
   * @returns {boolean}
   */
  guardDoComplete(ctx) {
    // do-detector.js의 detectDoCompletion() 결과 사용
    // ctx.metadata.doCompletionResult 참조
  },

  /**
   * Match Rate가 임계값(기본 90%) 이상인지 확인
   * @param {StateMachineContext} ctx
   * @returns {boolean}
   */
  guardMatchRatePass(ctx) {
    // ctx.matchRate >= getConfig('pdca.matchRateThreshold', 90)
  },

  /**
   * 추가 반복이 가능한지 확인
   * @param {StateMachineContext} ctx
   * @returns {boolean}
   */
  guardCanIterate(ctx) {
    // ctx.iterationCount < ctx.maxIterations
  },

  /**
   * 최대 반복 횟수에 도달했는지 확인
   * @param {StateMachineContext} ctx
   * @returns {boolean}
   */
  guardMaxIterReached(ctx) {
    // ctx.iterationCount >= ctx.maxIterations
  },

  /**
   * Resume 데이터가 존재하는지 확인
   * @param {StateMachineContext} ctx
   * @returns {boolean}
   */
  guardResumeAvailable(ctx) {
    // .bkit/state/resume/{feature}.resume.json 존재 확인
  },

  /**
   * Checkpoint가 존재하는지 확인
   * @param {StateMachineContext} ctx
   * @returns {boolean}
   */
  guardCheckpointExists(ctx) {
    // .bkit/checkpoints/ 내 해당 feature 체크포인트 확인
  },

  /**
   * Feature가 7일 이상 비활동 상태인지 확인
   * @param {StateMachineContext} ctx
   * @returns {boolean}
   */
  guardStaleFeature(ctx) {
    // ctx.timestamps.lastUpdated 기준 7일(604800000ms) 경과 여부
  },
};
```

### 1.5 Action 함수 정의

```javascript
/**
 * Action 함수 레지스트리
 * 각 Action은 (context: StateMachineContext, event: PdcaEvent) => void
 * Action은 부수효과를 실행하며, 상태 머신의 전이 자체는 변경하지 않음
 */
const ACTIONS = {
  /** Feature 초기 생성 — status.updatePdcaStatus() 호출 */
  initFeature(ctx, event) {},

  /** Phase 타임스탬프 기록 */
  recordTimestamp(ctx, event) {},

  /** Phase 완료 알림 (buildNextActionQuestion 연동) */
  notifyPhaseComplete(ctx, event) {},

  /** 체크포인트 자동 생성 (Design→Do 전환 시) */
  createCheckpoint(ctx, event) {},

  /** matchRate 기록 */
  recordMatchRate(ctx, event) {},

  /** iteration 카운트 증가 */
  incrementIteration(ctx, event) {},

  /** PDCA 문서 아카이브 */
  archiveDocuments(ctx, event) {},

  /** Feature 정리 (activeFeatures에서 제거) */
  cleanupFeature(ctx, event) {},

  /** Max iteration 도달 시 강제 Report */
  forceReport(ctx, event) {},

  /** Resume 데이터 저장 */
  saveResumePoint(ctx, event) {},

  /** 에러 알림 */
  notifyError(ctx, event) {},

  /** Resume 데이터로 복구 */
  restoreFromResume(ctx, event) {},

  /** Checkpoint로 복구 */
  restoreCheckpoint(ctx, event) {},

  /** Stale Feature 아카이브 */
  archiveStale(ctx, event) {},

  /** 방기된 Feature 아카이브 */
  archiveAbandoned(ctx, event) {},
};
```

### 1.6 전체 Export 함수 목록

```javascript
/**
 * @module lib/pdca/state-machine
 * @exports
 */
module.exports = {
  // ── 상수 ──
  TRANSITIONS,        // TransitionEntry[] — 전체 전이 테이블
  STATES,             // PdcaState[] — 유효한 상태 목록
  EVENTS,             // PdcaEvent[] — 유효한 이벤트 목록
  GUARDS,             // { [name]: (ctx) => boolean } — Guard 레지스트리
  ACTIONS,            // { [name]: (ctx, event) => void } — Action 레지스트리

  // ── 코어 API ──
  /**
   * 상태 전이 실행
   * @param {PdcaState} currentState - 현재 상태
   * @param {PdcaEvent} event - 트리거 이벤트
   * @param {StateMachineContext} context - 전이 컨텍스트
   * @returns {TransitionResult} 전이 결과
   */
  transition,

  /**
   * 전이 가능 여부 확인 (실제 전이는 수행하지 않음)
   * @param {PdcaState} currentState
   * @param {PdcaEvent} event
   * @param {StateMachineContext} context
   * @returns {boolean}
   */
  canTransition,

  /**
   * 현재 상태에서 가능한 이벤트 목록
   * @param {PdcaState} currentState
   * @param {StateMachineContext} context
   * @returns {PdcaEvent[]}
   */
  getAvailableEvents,

  /**
   * 전이 테이블에서 특정 전이 조회
   * @param {PdcaState} from
   * @param {PdcaEvent} event
   * @returns {TransitionEntry|null}
   */
  findTransition,

  // ── 컨텍스트 관리 ──
  /**
   * Feature에 대한 StateMachineContext 생성
   * @param {string} feature
   * @param {Object} [overrides] - 오버라이드 값
   * @returns {StateMachineContext}
   */
  createContext,

  /**
   * Feature의 현재 상태를 StateMachineContext로 로드
   * @param {string} feature
   * @returns {StateMachineContext|null}
   */
  loadContext,

  /**
   * StateMachineContext를 pdca-status.json에 동기화
   * @param {StateMachineContext} context
   * @returns {void}
   */
  syncContext,

  // ── 유틸 ──
  /**
   * PdcaEvent를 기존 PDCA phase 문자열에서 변환
   * @param {string} fromPhase - 현재 Phase ('plan', 'design', ...)
   * @param {string} toPhase - 목적 Phase
   * @returns {PdcaEvent|null}
   */
  phaseToEvent,

  /**
   * 상태 머신 다이어그램을 텍스트로 출력 (디버깅용)
   * @returns {string}
   */
  printDiagram,
};
```

### 1.7 기존 코드 연동 방안

| 기존 모듈 | 기존 함수 | 변경 | 상세 |
|----------|----------|------|------|
| `automation.js` | `shouldAutoAdvance()` | **래핑** | 상태 머신의 Guard + automationLevel로 판단. 기존 함수는 `state-machine.canTransition()` 래퍼로 전환 |
| `automation.js` | `autoAdvancePdcaPhase()` | **대체** | `state-machine.transition()` + `syncContext()`로 대체. 기존 함수는 deprecated 경고 후 내부 호출 전환 |
| `automation.js` | `generateAutoTrigger()` | **대체** | `state-machine.getAvailableEvents()` + workflowEngine의 자동 트리거로 대체 |
| `automation.js` | `getNextPdcaActionAfterCompletion()` | **대체** | `state-machine.findTransition()` + Guard 평가로 대체 |
| `phase.js` | `validatePdcaTransition()` | **대체** | `state-machine.canTransition()`으로 완전 대체. 기존 order 기반 검증은 TRANSITIONS 테이블이 흡수 |
| `phase.js` | `getNextPdcaPhase()` | **래핑** | `state-machine.getAvailableEvents()`의 단순화 버전으로 유지 (하위 호환) |
| `phase.js` | `PDCA_PHASES` | **유지** | 상태 머신의 STATES와 공존. 아이콘/이름 매핑은 여전히 필요 |
| `status.js` | `updatePdcaStatus()` | **연동** | Action 함수 내에서 호출. 직접 호출도 여전히 허용 (하위 호환) |
| `status.js` | `savePdcaStatus()` | **연동** | `syncContext()`가 내부적으로 호출 |

**하위 호환 전략**: 기존 `automation.js`의 모든 export는 유지하되, 내부 구현을 `state-machine.js` 호출로 전환. 기존 `/pdca` 명령어는 변경 없이 동작.

---

## 2. YAML 워크플로우 DSL

### 2.1 파일 경로 + 목적

| 파일 | 목적 |
|------|------|
| `lib/pdca/workflow-parser.js` | YAML 워크플로우 파일 파싱 + 검증 (JSON Schema 기반) |
| `lib/pdca/workflow-engine.js` | 파싱된 워크플로우 정의를 실행하는 엔진 |

### 2.2 YAML 스키마 정의 (JSON Schema)

```javascript
/**
 * YAML 워크플로우 파일의 JSON Schema
 * bkit은 npm 외부 의존성 금지이므로, Node.js 내장 YAML 파서가 없음.
 * → YAML 대신 JSON 형식 워크플로우 파일도 지원 (YAML은 경량 자체 파서로 처리)
 */

/**
 * @typedef {Object} WorkflowDefinition
 * @property {string} id - 워크플로우 고유 ID ('default-pdca'|'hotfix-pdca'|'enterprise-pdca'|커스텀)
 * @property {string} name - 표시 이름
 * @property {string} version - 워크플로우 버전
 * @property {string} description - 설명
 * @property {WorkflowTrigger} trigger - 워크플로우 활성화 조건
 * @property {Object<string, StepDefinition>} steps - 단계 정의
 * @property {WorkflowDefaults} defaults - 기본 설정
 */

/**
 * @typedef {Object} WorkflowTrigger
 * @property {'manual'|'auto'|'condition'} type - 트리거 유형
 * @property {string} [condition] - 조건식 (type: 'condition'일 때)
 */

/**
 * @typedef {Object} StepDefinition
 * @property {string} phase - PDCA Phase 이름
 * @property {'sequential'|'parallel'|'gate'} type - 단계 유형
 * @property {string} [next] - 다음 단계 ID (sequential)
 * @property {StepCondition[]} [conditions] - 조건부 분기
 * @property {ParallelBranch[]} [branches] - 병렬 분기 (type: 'parallel')
 * @property {'all'|'any'|'majority'} [mergeStrategy] - 병렬 병합 전략
 * @property {GateConfig} [gate] - 승인 게이트 설정
 * @property {number} [timeout] - 단계 타임아웃 (ms)
 * @property {StepAction[]} [onEnter] - 진입 시 실행 Action
 * @property {StepAction[]} [onExit] - 퇴출 시 실행 Action
 */

/**
 * @typedef {Object} StepCondition
 * @property {string} condition - 조건 표현식 (예: "matchRate >= 90")
 * @property {string} next - 조건 충족 시 다음 단계 ID
 */

/**
 * @typedef {Object} ParallelBranch
 * @property {string} id - 분기 ID
 * @property {string} step - 실행할 단계 ID
 * @property {boolean} [required] - 필수 여부 (mergeStrategy: 'any'일 때)
 */

/**
 * @typedef {Object} GateConfig
 * @property {'user'|'auto'|'conditional'} approval - 승인 방식
 * @property {string} [autoCondition] - 자동 승인 조건 (approval: 'conditional')
 * @property {string} [message] - 사용자에게 표시할 메시지
 */

/**
 * @typedef {Object} StepAction
 * @property {string} action - Action 이름
 * @property {Object} [params] - Action 매개변수
 */

/**
 * @typedef {Object} WorkflowDefaults
 * @property {number} matchRateThreshold - Match Rate 임계값 (기본 90)
 * @property {number} maxIterations - 최대 반복 횟수 (기본 5)
 * @property {'guide'|'semi-auto'|'full-auto'} automationLevel - 기본 자동화 레벨
 * @property {number} staleTimeout - Stale 판단 기준 (ms, 기본 604800000 = 7일)
 */
```

### 2.3 조건부 분기 문법

```javascript
/**
 * 조건 표현식 평가기
 * 지원 구문 (보안상 eval() 사용 금지, 자체 파서):
 *
 * 비교 연산: matchRate >= 90, iterationCount < 5
 * 논리 연산: matchRate >= 90 && iterationCount <= 3
 * 불리언:    designApproved == true
 * 문자열:    automationLevel == "full-auto"
 *
 * 접근 가능한 컨텍스트 변수:
 * - matchRate (number)
 * - iterationCount (number)
 * - automationLevel (string)
 * - maxIterations (number)
 * - hasDeliverable (boolean)
 * - designApproved (boolean)
 * - doComplete (boolean)
 * - featureAge (number, ms)
 */

/**
 * @typedef {Object} ConditionToken
 * @property {'variable'|'operator'|'value'|'logical'} type
 * @property {string} raw
 * @property {*} value
 */
```

### 2.4 병렬 실행 정의

```yaml
# 워크플로우 YAML 내 병렬 정의 예시
steps:
  parallel-check:
    phase: check
    type: parallel
    branches:
      - id: gap-analysis
        step: run-gap-analysis
        required: true
      - id: code-quality
        step: run-code-quality
        required: true
      - id: security-scan
        step: run-security-scan
        required: false
    mergeStrategy: all  # all: 모든 required 완료, any: 하나라도 완료, majority: 과반수
    next: evaluate-results
```

### 2.5 3종 기본 워크플로우

**경로**: `.bkit/workflows/` (설치 시 자동 생성) 또는 `lib/pdca/workflows/` (번들)

#### 2.5.1 default-pdca

```yaml
# default-pdca.workflow.yaml
id: default-pdca
name: Default PDCA Workflow
version: "2.0.0"
description: Standard PDCA cycle for Dynamic/Enterprise projects

trigger:
  type: auto

steps:
  start:
    phase: idle
    type: sequential
    next: pm

  pm:
    phase: pm
    type: gate
    gate:
      approval: conditional
      autoCondition: "automationLevel != 'guide'"
    onEnter:
      - action: recordTimestamp
    next: plan

  plan:
    phase: plan
    type: gate
    gate:
      approval: conditional
      autoCondition: "automationLevel == 'full-auto'"
      message: "Plan document ready. Proceed to Design?"
    onEnter:
      - action: recordTimestamp
    next: design

  design:
    phase: design
    type: gate
    gate:
      approval: conditional
      autoCondition: "automationLevel == 'full-auto'"
      message: "Design document ready. Proceed to implementation?"
    onEnter:
      - action: recordTimestamp
      - action: createCheckpoint
    next: do

  do:
    phase: do
    type: gate
    gate:
      approval: conditional
      autoCondition: "automationLevel != 'guide'"
      message: "Implementation complete?"
    onEnter:
      - action: recordTimestamp
    next: check

  check:
    phase: check
    type: sequential
    onEnter:
      - action: recordTimestamp
      - action: recordMatchRate
    conditions:
      - condition: "matchRate >= 90"
        next: report
      - condition: "iterationCount >= maxIterations"
        next: report
      - condition: "matchRate < 90"
        next: act

  act:
    phase: act
    type: sequential
    onEnter:
      - action: recordTimestamp
      - action: incrementIteration
    next: check

  report:
    phase: report
    type: gate
    gate:
      approval: conditional
      autoCondition: "automationLevel == 'full-auto'"
      message: "Report generated. Archive this feature?"
    onEnter:
      - action: recordTimestamp
    next: archive

  archive:
    phase: archived
    type: sequential
    onEnter:
      - action: recordTimestamp
      - action: archiveDocuments
      - action: cleanupFeature

defaults:
  matchRateThreshold: 90
  maxIterations: 5
  automationLevel: semi-auto
  staleTimeout: 604800000
```

#### 2.5.2 hotfix-pdca

```yaml
# hotfix-pdca.workflow.yaml
id: hotfix-pdca
name: Hotfix PDCA Workflow
version: "2.0.0"
description: Accelerated workflow for hotfix/urgent changes

trigger:
  type: condition
  condition: "feature.startsWith('hotfix-') || feature.startsWith('fix-')"

steps:
  start:
    phase: idle
    type: sequential
    next: plan

  plan:
    phase: plan
    type: sequential
    onEnter:
      - action: recordTimestamp
    next: do

  do:
    phase: do
    type: gate
    gate:
      approval: auto
    onEnter:
      - action: recordTimestamp
    next: check

  check:
    phase: check
    type: sequential
    onEnter:
      - action: recordTimestamp
      - action: recordMatchRate
    conditions:
      - condition: "matchRate >= 80"
        next: report
      - condition: "matchRate < 80"
        next: do

  report:
    phase: report
    type: sequential
    onEnter:
      - action: recordTimestamp
    next: archive

  archive:
    phase: archived
    type: sequential
    onEnter:
      - action: recordTimestamp
      - action: archiveDocuments
      - action: cleanupFeature

defaults:
  matchRateThreshold: 80
  maxIterations: 3
  automationLevel: semi-auto
  staleTimeout: 259200000  # 3 days
```

#### 2.5.3 enterprise-pdca

```yaml
# enterprise-pdca.workflow.yaml
id: enterprise-pdca
name: Enterprise PDCA Workflow
version: "2.0.0"
description: Full governance workflow with team review and parallel checks

trigger:
  type: condition
  condition: "level == 'Enterprise'"

steps:
  start:
    phase: idle
    type: sequential
    next: pm

  pm:
    phase: pm
    type: gate
    gate:
      approval: user
      message: "PM discovery complete. Review PRD before proceeding."
    onEnter:
      - action: recordTimestamp
    next: plan

  plan:
    phase: plan
    type: gate
    gate:
      approval: user
      message: "Plan requires CTO Team review."
    onEnter:
      - action: recordTimestamp
    next: design

  design:
    phase: design
    type: gate
    gate:
      approval: user
      message: "Design requires architecture review."
    onEnter:
      - action: recordTimestamp
      - action: createCheckpoint
    next: do

  do:
    phase: do
    type: gate
    gate:
      approval: conditional
      autoCondition: "automationLevel == 'full-auto'"
    onEnter:
      - action: recordTimestamp
    next: parallel-check

  parallel-check:
    phase: check
    type: parallel
    branches:
      - id: gap-analysis
        step: run-gap-analysis
        required: true
      - id: code-quality
        step: run-code-quality
        required: true
      - id: security-review
        step: run-security-review
        required: true
    mergeStrategy: all
    onEnter:
      - action: recordTimestamp
      - action: recordMatchRate
    conditions:
      - condition: "matchRate >= 90"
        next: report
      - condition: "iterationCount >= maxIterations"
        next: report
      - condition: "matchRate < 90"
        next: act

  act:
    phase: act
    type: sequential
    onEnter:
      - action: recordTimestamp
      - action: incrementIteration
    next: parallel-check

  report:
    phase: report
    type: gate
    gate:
      approval: user
      message: "Report requires final sign-off."
    onEnter:
      - action: recordTimestamp
    next: archive

  archive:
    phase: archived
    type: sequential
    onEnter:
      - action: recordTimestamp
      - action: archiveDocuments
      - action: cleanupFeature

defaults:
  matchRateThreshold: 90
  maxIterations: 5
  automationLevel: guide
  staleTimeout: 1209600000  # 14 days
```

### 2.6 workflow-parser.js Export 함수 목록

```javascript
/**
 * @module lib/pdca/workflow-parser
 * @exports
 */
module.exports = {
  /**
   * YAML/JSON 워크플로우 파일 파싱
   * bkit은 외부 YAML 파서 의존성이 없으므로 경량 자체 파서 사용.
   * JSON 파일도 동시 지원 (.workflow.json)
   * @param {string} filePath - 워크플로우 파일 경로
   * @returns {WorkflowDefinition}
   * @throws {BkitError} 파싱 실패 시
   */
  parseWorkflow,

  /**
   * 워크플로우 정의 검증
   * @param {WorkflowDefinition} workflow
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateWorkflow,

  /**
   * 조건 표현식 파싱 + 평가
   * @param {string} expression - 조건식 (예: "matchRate >= 90")
   * @param {Object} variables - 평가 컨텍스트 변수
   * @returns {boolean}
   */
  evaluateCondition,

  /**
   * 내장 워크플로우 목록 조회
   * @returns {WorkflowDefinition[]}
   */
  getBuiltinWorkflows,

  /**
   * Feature에 적합한 워크플로우 자동 선택
   * @param {string} feature - Feature 이름
   * @param {Object} context - { level, automationLevel }
   * @returns {WorkflowDefinition}
   */
  selectWorkflow,

  /**
   * 경량 YAML 파서 (외부 의존성 없음)
   * 지원 범위: 스칼라, 배열, 오브젝트, 중첩 (flow style 미지원)
   * @param {string} yamlString
   * @returns {Object}
   */
  parseYaml,
};
```

### 2.7 workflow-engine.js Export 함수 목록

```javascript
/**
 * @module lib/pdca/workflow-engine
 * @exports
 */
module.exports = {
  /**
   * 워크플로우 실행 인스턴스 생성
   * @param {string} feature - Feature 이름
   * @param {WorkflowDefinition} workflow - 파싱된 워크플로우
   * @returns {WorkflowInstance}
   */
  createInstance,

  /**
   * 워크플로우 인스턴스 단계 진행
   * state-machine.transition()을 내부적으로 호출
   * @param {WorkflowInstance} instance
   * @param {PdcaEvent} event
   * @param {Object} [eventData] - 이벤트 관련 데이터
   * @returns {StepResult}
   */
  advanceStep,

  /**
   * 현재 단계의 Gate 승인 여부 확인
   * @param {WorkflowInstance} instance
   * @returns {{ needsApproval: boolean, gate: GateConfig|null }}
   */
  checkGate,

  /**
   * Gate 승인 처리
   * @param {WorkflowInstance} instance
   * @param {'approve'|'reject'} decision
   * @returns {StepResult}
   */
  resolveGate,

  /**
   * 병렬 분기 실행
   * @param {WorkflowInstance} instance
   * @param {StepDefinition} parallelStep
   * @returns {Promise<ParallelResult>}
   */
  executeParallel,

  /**
   * 병렬 분기 병합
   * @param {ParallelResult[]} results
   * @param {'all'|'any'|'majority'} strategy
   * @returns {{ merged: boolean, passed: boolean, results: ParallelResult[] }}
   */
  mergeParallel,

  /**
   * 워크플로우 인스턴스 상태 저장
   * @param {WorkflowInstance} instance
   * @returns {void}
   */
  saveInstance,

  /**
   * 워크플로우 인스턴스 로드
   * @param {string} feature
   * @returns {WorkflowInstance|null}
   */
  loadInstance,

  /**
   * 워크플로우 인스턴스 상태 조회
   * @param {WorkflowInstance} instance
   * @returns {WorkflowStatus}
   */
  getStatus,
};
```

### 2.8 핵심 데이터 구조 (Engine)

```javascript
/**
 * @typedef {Object} WorkflowInstance
 * @property {string} feature - Feature 이름
 * @property {string} workflowId - 워크플로우 ID
 * @property {string} currentStepId - 현재 단계 ID
 * @property {PdcaState} currentState - 현재 상태 (state-machine과 동기화)
 * @property {StateMachineContext} context - 상태 머신 컨텍스트
 * @property {StepHistory[]} history - 단계 실행 이력
 * @property {Object} parallelState - 진행 중인 병렬 분기 상태
 * @property {string} createdAt - 생성 시각
 * @property {string} updatedAt - 최종 갱신 시각
 */

/**
 * @typedef {Object} StepResult
 * @property {boolean} success - 단계 진행 성공 여부
 * @property {string} stepId - 진행된 단계 ID
 * @property {string} nextStepId - 다음 단계 ID (성공 시)
 * @property {boolean} needsApproval - 승인 대기 여부
 * @property {string} [message] - 사용자 메시지
 * @property {TransitionResult} [transition] - 상태 머신 전이 결과
 */

/**
 * @typedef {Object} StepHistory
 * @property {string} stepId
 * @property {string} phase
 * @property {string} enteredAt
 * @property {string} exitedAt
 * @property {'completed'|'skipped'|'failed'} result
 */

/**
 * @typedef {Object} WorkflowStatus
 * @property {string} feature
 * @property {string} workflowId
 * @property {string} currentStep
 * @property {PdcaState} state
 * @property {number} progress - 진행률 (0-100)
 * @property {number} completedSteps
 * @property {number} totalSteps
 * @property {boolean} pendingApproval
 * @property {string|null} pendingMessage
 */
```

### 2.9 의존성 관계

```
workflow-parser.js
  └── (자체 YAML 파서, 외부 의존성 없음)
  └── lib/core/errors.js (BkitError)
  └── lib/core/config.js (getConfig)

workflow-engine.js
  └── workflow-parser.js (parseWorkflow, evaluateCondition)
  └── state-machine.js (transition, canTransition, createContext)
  └── lib/pdca/status.js (updatePdcaStatus, savePdcaStatus)
  └── lib/core/paths.js (STATE_PATHS)
  └── lib/core/config.js (getConfig)
```

### 2.10 YAML 파서 설계 참고

bkit은 npm 외부 의존성을 금지하므로, 경량 YAML 파서를 자체 구현합니다.

```javascript
/**
 * 경량 YAML 파서 지원 범위:
 * - 스칼라 값 (string, number, boolean, null)
 * - 블록 매핑 (key: value)
 * - 블록 시퀀스 (- item)
 * - 중첩 (인덴트 기반)
 * - 인라인 주석 (#)
 * - 따옴표 문자열 ("...", '...')
 * - 멀티라인 값 (| 리터럴, > 접힘)
 *
 * 미지원 (bkit 워크플로우에 불필요):
 * - Flow style ({}, [])
 * - 앵커/참조 (&, *)
 * - 태그 (!!)
 * - 복수 문서 (---)
 *
 * ~250 LOC 예상. 파싱 실패 시 JSON 폴백 (.workflow.json)
 */
```

### 2.11 기존 코드 연동 방안

| 기존 | 변경 |
|------|------|
| `bkit.config.json`의 `pdca.automationLevel` | WorkflowDefinition의 `defaults.automationLevel`이 우선. config는 글로벌 기본값으로 유지 |
| `bkit.config.json`의 `pdca.matchRateThreshold` | WorkflowDefinition의 `defaults.matchRateThreshold`이 우선 |
| `bkit.config.json`의 `pdca.maxIterations` | WorkflowDefinition의 `defaults.maxIterations`이 우선 |
| 워크플로우 저장 위치 | `.bkit/workflows/{id}.workflow.yaml` (사용자 정의) 또는 `lib/pdca/workflows/` (내장) |
| `automation.generateAutoTrigger()` | `workflow-engine.advanceStep()` + `checkGate()`로 대체 |

---

## 3. 3단계 자동화 레벨

### 3.1 파일 경로 + 목적

| 파일 | 목적 |
|------|------|
| `lib/control/automation-controller.js` | 3단계 자동화 레벨 관리 + 런타임 전환 + 5단계 L0-L4 세분화 |

### 3.2 각 레벨의 상세 행동 정의

```javascript
/**
 * 3단계 자동화 레벨 (사용자 대면)
 * 내부적으로 5단계 L0-L4로 매핑 (영역 2에서 상세 설계)
 *
 * @typedef {'guide'|'semi-auto'|'full-auto'} AutomationLevel
 */

/**
 * 레벨별 승인 게이트 매트릭스
 * 'auto' = 자동 통과, 'gate' = 사용자 승인 필요, 'confirm' = 확인만 필요
 *
 * @type {Object<AutomationLevel, Object<string, 'auto'|'gate'|'confirm'>>}
 */
const APPROVAL_MATRIX = {
  guide: {
    'idle->pm':      'gate',
    'pm->plan':      'gate',
    'plan->design':  'gate',
    'design->do':    'gate',
    'do->check':     'gate',
    'check->act':    'gate',
    'check->report': 'gate',
    'report->archived': 'gate',
  },
  'semi-auto': {
    'idle->pm':      'gate',      // 첫 진입만 수동
    'pm->plan':      'auto',
    'plan->design':  'auto',
    'design->do':    'auto',
    'do->check':     'confirm',   // Do 완료 확인
    'check->act':    'auto',      // matchRate < 90이면 자동
    'check->report': 'gate',      // Report 진입은 승인
    'report->archived': 'gate',   // Archive는 승인
  },
  'full-auto': {
    'idle->pm':      'gate',      // 최초 1회만 수동
    'pm->plan':      'auto',
    'plan->design':  'auto',
    'design->do':    'auto',
    'do->check':     'auto',
    'check->act':    'auto',
    'check->report': 'auto',
    'report->archived': 'auto',
  },
};

/**
 * @typedef {Object} AutomationState
 * @property {AutomationLevel} currentLevel - 현재 자동화 레벨
 * @property {AutomationLevel} configLevel - 설정 파일 기준 레벨
 * @property {boolean} runtimeOverride - 런타임 오버라이드 여부
 * @property {string} lastChanged - 마지막 변경 시각
 * @property {string} changedBy - 변경 주체 ('user'|'trust-score'|'config')
 */
```

### 3.3 bkit.config.json 스키마 확장

```jsonc
{
  "pdca": {
    // 기존 유지
    "automationLevel": "semi-auto",  // 기존 호환

    // v2.0.0 신규
    "automation": {
      "level": "semi-auto",         // 기본 자동화 레벨
      "trustScore": {
        "enabled": false,            // Trust Score 기반 자동 레벨 전환
        "initialScore": 50,          // 초기 Trust Score (0-100)
        "thresholds": {
          "guide": 0,                // 0-39: Guide
          "semi-auto": 40,           // 40-79: Semi-Auto
          "full-auto": 80            // 80-100: Full-Auto
        }
      },
      "approvalOverrides": {
        // 특정 전환의 승인 방식을 오버라이드
        // "design->do": "gate"      // Full-Auto여도 Design 승인 필수
      }
    }
  }
}
```

### 3.4 `/pdca auto` 런타임 전환 로직

```javascript
/**
 * 런타임 자동화 레벨 전환
 * /pdca auto guide|semi|full 명령으로 호출
 *
 * @param {AutomationLevel} newLevel - 목표 레벨
 * @param {Object} [options] - { persist: boolean }
 * @returns {{ success: boolean, previousLevel: AutomationLevel, currentLevel: AutomationLevel, message: string }}
 *
 * 동작:
 * 1. 현재 레벨 저장
 * 2. 새 레벨로 전환
 * 3. 활성 워크플로우 인스턴스에 전파
 * 4. persist=true이면 bkit.config.json 갱신
 * 5. 감사 로그 기록
 *
 * 제약:
 * - Full-Auto 전환 시 확인 질문 (AskUserQuestion)
 * - Guide 전환은 즉시 적용 (안전 방향)
 */
```

### 3.5 전체 Export 함수 목록

```javascript
/**
 * @module lib/control/automation-controller
 * @exports
 */
module.exports = {
  /** 승인 매트릭스 상수 */
  APPROVAL_MATRIX,

  /**
   * 현재 자동화 레벨 조회
   * @returns {AutomationLevel}
   */
  getLevel,

  /**
   * 자동화 레벨 변경
   * @param {AutomationLevel} level
   * @param {Object} [options] - { persist, changedBy }
   * @returns {{ success: boolean, previousLevel: AutomationLevel, currentLevel: AutomationLevel }}
   */
  setLevel,

  /**
   * 특정 전환의 승인 방식 조회
   * @param {string} transition - 'from->to' 형식
   * @returns {'auto'|'gate'|'confirm'}
   */
  getApprovalType,

  /**
   * 특정 전환이 자동 진행 가능한지 확인
   * @param {string} transition
   * @returns {boolean}
   */
  isAutoApproved,

  /**
   * 자동화 상태 전체 조회
   * @returns {AutomationState}
   */
  getState,

  /**
   * 현재 레벨의 전체 승인 매트릭스 조회
   * @returns {Object<string, 'auto'|'gate'|'confirm'>}
   */
  getApprovalMatrix,

  /**
   * 자동화 레벨 설명 텍스트 생성
   * @param {AutomationLevel} level
   * @returns {string}
   */
  describLevel,
};
```

### 3.6 의존성 관계

```
automation-controller.js
  └── lib/core/config.js (getConfig, getBkitConfig)
  └── lib/pdca/state-machine.js (TRANSITIONS — Guard 평가에 참조)
  └── lib/audit/audit-logger.js (writeAuditLog — 레벨 변경 기록)
```

### 3.7 기존 코드 연동 방안

| 기존 | 변경 |
|------|------|
| `automation.getAutomationLevel()` | `automation-controller.getLevel()` 래핑으로 전환. 기존 반환값 ('manual'→'guide') 매핑 포함 |
| `automation.shouldAutoAdvance()` | `automation-controller.isAutoApproved()` + `state-machine.canTransition()`으로 대체 |
| `automation.isFullAutoMode()` | `automation-controller.getLevel() === 'full-auto'`로 대체 |
| `bkit.config.json` `pdca.automationLevel` | 하위 호환 유지. `pdca.automation.level`이 우선, 없으면 `pdca.automationLevel` 사용 |

**'manual' → 'guide' 매핑**: v1.6.2의 `'manual'`은 v2.0.0의 `'guide'`에 해당. `getLevel()` 내부에서 자동 변환.

---

## 4. Do 완료 3-Layer 감지

### 4.1 파일 경로 + 목적

| 파일 | 목적 |
|------|------|
| `lib/pdca/do-detector.js` | Do Phase 완료를 3계층으로 감지 (명시적/암묵적/사용자 확인) |

### 4.2 핵심 데이터 구조

```javascript
/**
 * @typedef {Object} DoCompletionResult
 * @property {boolean} complete - 완료 판정
 * @property {1|2|3} detectedLayer - 감지 계층
 * @property {number} confidence - 확신도 (0.0-1.0)
 * @property {string} reason - 판정 사유
 * @property {DoCompletionDetail} detail - 상세 정보
 */

/**
 * @typedef {Object} DoCompletionDetail
 * @property {Layer1Result|null} explicit - Layer 1 결과
 * @property {Layer2Result|null} implicit - Layer 2 결과
 * @property {Layer3Result|null} userConfirm - Layer 3 결과
 */

/**
 * @typedef {Object} Layer1Result
 * @property {boolean} matched - 명시적 완료 패턴 매칭 여부
 * @property {string|null} matchedPattern - 매칭된 패턴
 * @property {string|null} source - 소스 (tool_result, task_subject, user_message)
 */

/**
 * @typedef {Object} Layer2Result
 * @property {number} totalFiles - Design 문서에 정의된 파일 수
 * @property {number} existingFiles - 실제 존재하는 파일 수
 * @property {number} completionRate - 구현 완료율 (0-100)
 * @property {string[]} missingFiles - 누락 파일 목록
 * @property {string[]} extraFiles - Design에 없는 추가 파일
 */

/**
 * @typedef {Object} Layer3Result
 * @property {'confirmed'|'denied'|'pending'} userResponse
 * @property {string|null} respondedAt
 */
```

### 4.3 Layer별 상세 동작

#### Layer 1: 명시적 완료 선언

```javascript
/**
 * 명시적 완료 선언 패턴 매칭
 *
 * 감지 대상:
 * 1. Task 완료 이벤트의 subject에 [Do] 패턴
 * 2. 사용자 메시지에 완료 키워드
 * 3. Hook 이벤트 (StopTool, TaskCompleted)
 *
 * 패턴 목록:
 */
const EXPLICIT_PATTERNS = [
  // Task subject 패턴
  /\[Do\]\s+.+/i,
  /\[Implementation\]\s+.+/i,

  // 완료 선언 패턴 (다국어)
  /구현\s*(이\s*)?완료/,
  /implementation\s+complete/i,
  /coding\s+done/i,
  /do\s+phase\s+complete/i,
  /all\s+files?\s+(?:created|implemented)/i,
  /ready\s+for\s+(?:review|analysis|check)/i,

  // /pdca 명령어 패턴
  /\/pdca\s+(?:analyze|check)\s+/i,
];
```

#### Layer 2: 암묵적 완료 감지

```javascript
/**
 * Design 문서에서 정의된 파일 목록 vs 실제 파일 시스템 비교
 *
 * 동작:
 * 1. Design 문서 로드 (phase.findDesignDoc)
 * 2. 파일 경로 패턴 추출 (정규식으로 코드블록 내 경로 추출)
 * 3. 각 파일의 존재 여부 확인 (fs.existsSync)
 * 4. completionRate 계산
 * 5. completionRate >= 80%이면 암묵적 완료 판정
 *
 * 파일 경로 추출 패턴:
 */
const FILE_PATH_PATTERNS = [
  // Markdown 코드블록 내 파일 경로
  /`([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)`/g,
  // 파일 트리 구조
  /[├└│─]\s*([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)/g,
  // 표 내 파일 경로
  /\|\s*`?([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)`?\s*\|/g,
];

/**
 * 무시할 파일 패턴 (Design에 있지만 Do에서 생성 불필요)
 */
const IGNORE_PATTERNS = [
  /\.md$/,           // 문서 파일
  /\.json$/,         // 설정 파일 (자동 생성)
  /test.*\./,        // 테스트 파일 (별도 단계)
  /\.env/,           // 환경 변수
];
```

#### Layer 3: 사용자 확인

```javascript
/**
 * Layer 1, 2로 판단 불가능할 때 사용자에게 직접 확인
 *
 * AskUserQuestion 활용:
 * - question: "Implementation seems complete ({completionRate}%). Proceed to Check?"
 * - options: [Confirm, Not Yet, Show Missing Files]
 *
 * 조건: automationLevel이 'guide' 또는 'semi-auto'일 때만 질문
 *       'full-auto'일 때는 Layer 2 결과 기준 자동 판단
 */
```

### 4.4 전체 Export 함수 목록

```javascript
/**
 * @module lib/pdca/do-detector
 * @exports
 */
module.exports = {
  /**
   * Do 완료 감지 (3-Layer 순차 실행)
   * @param {string} feature - Feature 이름
   * @param {Object} [signals] - 외부 신호
   * @param {string} [signals.taskSubject] - TaskCompleted subject
   * @param {string} [signals.userMessage] - 사용자 메시지
   * @param {string} [signals.toolResult] - Tool 실행 결과
   * @returns {DoCompletionResult}
   */
  detectDoCompletion,

  /**
   * Layer 1만 실행 (명시적 완료 감지)
   * @param {Object} signals
   * @returns {Layer1Result}
   */
  detectExplicit,

  /**
   * Layer 2만 실행 (암묵적 완료 감지)
   * @param {string} feature
   * @returns {Layer2Result}
   */
  detectImplicit,

  /**
   * Design 문서에서 구현 대상 파일 목록 추출
   * @param {string} feature
   * @returns {string[]}
   */
  extractDesignFiles,

  /**
   * 구현 완료율 계산
   * @param {string[]} designFiles - Design에 정의된 파일
   * @param {string[]} existingFiles - 실제 존재하는 파일
   * @returns {number} 0-100
   */
  calculateCompletionRate,

  /** 명시적 완료 패턴 상수 */
  EXPLICIT_PATTERNS,
};
```

### 4.5 의존성 관계

```
do-detector.js
  └── lib/pdca/phase.js (findDesignDoc)
  └── lib/core/paths.js (resolveDocPaths)
  └── lib/core/config.js (getConfig — 임계값)
  └── lib/control/automation-controller.js (getLevel — Layer 3 판단)
```

### 4.6 기존 코드 연동 방안

| 기존 | 변경 |
|------|------|
| `automation.detectPdcaFromTaskSubject()` | Layer 1에서 내부 활용. 기존 함수는 유지 (Do 외 Phase 감지에도 사용) |
| `phase.checkPhaseDeliverables('do', feature)` | Layer 2에서 보완적으로 활용 |
| state-machine Guard `guardDoComplete` | `detectDoCompletion()` 결과를 참조 |

---

## 5. Full-Auto Do

### 5.1 파일 경로 + 목적

| 파일 | 목적 |
|------|------|
| `lib/pdca/full-auto-do.js` | Design 문서 기반 자동 코드 생성 오케스트레이터 |

### 5.2 핵심 데이터 구조

```javascript
/**
 * @typedef {Object} ImplementationPlan
 * @property {string} feature - Feature 이름
 * @property {string} designDocPath - Design 문서 경로
 * @property {ImplementationTask[]} tasks - 구현 태스크 목록
 * @property {number} totalTasks - 총 태스크 수
 * @property {string} estimatedEffort - 예상 공수 ('small'|'medium'|'large')
 * @property {string[]} dependencies - 태스크 간 의존성
 */

/**
 * @typedef {Object} ImplementationTask
 * @property {string} id - 태스크 ID (task-001, task-002, ...)
 * @property {string} type - 'create'|'modify'|'delete'|'config'
 * @property {string} filePath - 대상 파일 경로
 * @property {string} description - 태스크 설명
 * @property {string[]} dependsOn - 의존 태스크 ID 목록
 * @property {'pending'|'in-progress'|'completed'|'failed'} status
 * @property {string|null} agentId - 담당 Agent ID
 * @property {number} priority - 우선순위 (1=highest)
 */

/**
 * @typedef {Object} AutoDoResult
 * @property {boolean} success
 * @property {number} completedTasks
 * @property {number} failedTasks
 * @property {number} totalTasks
 * @property {string[]} createdFiles
 * @property {string[]} modifiedFiles
 * @property {string[]} errors
 * @property {number} elapsedMs
 */
```

### 5.3 Design 문서 파싱 → 태스크 분해

```javascript
/**
 * Design 문서 파싱 전략:
 *
 * 1. Section 분석
 *    - "파일 경로 + 목적" 테이블 → create/modify 태스크
 *    - "Export 함수 목록" → 함수 스켈레톤 생성 태스크
 *    - "핵심 데이터 구조" → typedef/interface 생성 태스크
 *    - "의존성 관계" → 태스크 순서 결정
 *
 * 2. 태스크 우선순위 결정
 *    - 의존성 없는 태스크 → priority 1 (병렬 실행 가능)
 *    - 의존성 있는 태스크 → 의존 태스크 완료 후 (priority 2+)
 *    - 테스트 파일 → 마지막 (priority 최저)
 *
 * 3. Agent Team 구성 (Enterprise 레벨)
 *    - 독립 태스크: 병렬 Task Agent 배분
 *    - 의존 태스크: 순차 실행
 */
```

### 5.4 Agent Team 자동 구성

```javascript
/**
 * Full-Auto Do의 Agent Team 구성:
 *
 * 1인 모드 (Agent Teams 비활성):
 *   - 순차적 태스크 실행
 *   - 각 태스크를 프롬프트로 변환하여 실행
 *
 * Team 모드 (Agent Teams 활성):
 *   - 독립 태스크: SendMessage로 병렬 배분
 *   - 의존 태스크: 선행 완료 대기 후 배분
 *   - 최대 동시 Agent: getConfig('team.maxTeammates', 5)
 *
 * 태스크 → 프롬프트 변환 템플릿:
 *   "[Do] {feature} - Task {id}: {description}
 *    File: {filePath}
 *    Type: {type}
 *    Design reference: {designDocPath}
 *    Dependencies: {dependsOn}
 *    Implementation spec: {extractedSpec}"
 */
```

### 5.5 구현 완료 판단 로직

```javascript
/**
 * 완료 판단:
 * 1. 모든 태스크 status === 'completed' → 성공
 * 2. failedTasks > 0 → do-detector Layer 2로 대체 판단
 * 3. 전체 completionRate >= 80% → 부분 성공으로 Check 진행
 * 4. completionRate < 80% → 실패, 재시도 또는 수동 전환
 *
 * 재시도 정책:
 * - 실패 태스크는 1회 재시도
 * - 재시도 실패 시 에러 보고 + Circuit Breaker 판단
 */
```

### 5.6 전체 Export 함수 목록

```javascript
/**
 * @module lib/pdca/full-auto-do
 * @exports
 */
module.exports = {
  /**
   * Design 문서 파싱 → 구현 태스크 분해
   * @param {string} feature
   * @returns {ImplementationPlan}
   */
  parseDesignToTasks,

  /**
   * Full-Auto Do 실행
   * @param {string} feature
   * @param {ImplementationPlan} plan
   * @param {Object} [options] - { maxConcurrent, retryFailed, dryRun }
   * @returns {Promise<AutoDoResult>}
   */
  executeAutoDo,

  /**
   * 개별 태스크를 Agent 프롬프트로 변환
   * @param {ImplementationTask} task
   * @param {string} designDocPath
   * @returns {string}
   */
  taskToPrompt,

  /**
   * 구현 완료 판단
   * @param {ImplementationPlan} plan
   * @returns {{ complete: boolean, completionRate: number, issues: string[] }}
   */
  evaluateCompletion,

  /**
   * 실행 중인 Auto Do 상태 조회
   * @param {string} feature
   * @returns {AutoDoStatus|null}
   */
  getAutoDoStatus,
};
```

### 5.7 의존성 관계

```
full-auto-do.js
  └── lib/pdca/phase.js (findDesignDoc)
  └── lib/pdca/do-detector.js (detectImplicit — 완료 검증)
  └── lib/pdca/status.js (updatePdcaStatus)
  └── lib/core/config.js (getConfig)
  └── lib/core/paths.js (resolveDocPaths)
```

---

## 6. 병렬 Feature 관리

### 6.1 파일 경로 + 목적

| 파일 | 목적 |
|------|------|
| `lib/pdca/feature-manager.js` | 최대 3개 동시 Feature 관리, 동시성 제어, 의존성 관리 |

### 6.2 핵심 데이터 구조

```javascript
/**
 * @typedef {Object} FeatureWorkflowState
 * @property {string} feature - Feature 이름
 * @property {string} workflowId - 적용 워크플로우 ID
 * @property {PdcaState} state - 현재 상태
 * @property {boolean} isActive - 활성 여부
 * @property {boolean} isPrimary - 주 Feature 여부
 * @property {string} lockedBy - Do 잠금 보유자 ('' = 미잠금)
 * @property {string[]} dependsOn - 의존 Feature 목록
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Feature별 독립 상태 파일 경로:
 * .bkit/state/workflows/{feature}.json
 *
 * @typedef {Object} FeatureWorkflowFile
 * @property {string} feature
 * @property {WorkflowInstance} workflow - 워크플로우 인스턴스
 * @property {StateMachineContext} context - 상태 머신 컨텍스트
 * @property {StepHistory[]} history - 단계 이력
 */
```

### 6.3 동시성 제어

```javascript
/**
 * Do 단계 배타적 잠금:
 * - 동시에 1개 Feature만 Do 상태 가능
 * - 이유: 코드 변경 충돌 방지 (같은 codebase에서 동시 구현 위험)
 * - 다른 Phase (Plan, Design, Check)는 병렬 가능
 *
 * 잠금 메커니즘:
 * 1. Feature가 Do로 전환 시 글로벌 Do Lock 획득
 * 2. Do Lock이 이미 있으면 전환 거부 + 대기 안내
 * 3. Do 완료 또는 에러 시 Lock 해제
 * 4. Lock은 .bkit/runtime/do-lock.json에 저장
 *
 * @typedef {Object} DoLock
 * @property {string|null} feature - Lock 보유 Feature (null = 미잠금)
 * @property {string} acquiredAt - 잠금 시각
 * @property {string} acquiredBy - 잠금 주체 ('user'|'auto')
 * @property {number} timeoutMs - 잠금 타임아웃 (기본 3600000 = 1시간)
 */
```

### 6.4 Feature 간 의존성 관리

```javascript
/**
 * 의존성 정의:
 * - bkit.config.json의 feature 정의에 dependsOn 추가 가능
 * - 또는 /pdca depends {feature-a} on {feature-b} 명령
 *
 * 의존성 규칙:
 * 1. Feature A가 Feature B에 의존하면, B의 Do 완료 전에 A의 Do 진입 불가
 * 2. Plan/Design은 의존성 무관하게 병렬 진행 가능
 * 3. 순환 의존성 감지 시 에러
 */
```

### 6.5 전체 Export 함수 목록

```javascript
/**
 * @module lib/pdca/feature-manager
 * @exports
 */
module.exports = {
  /**
   * 활성 Feature 목록 조회 (워크플로우 상태 포함)
   * @returns {FeatureWorkflowState[]}
   */
  listFeatures,

  /**
   * 새 Feature 시작 (최대 3개 제한)
   * @param {string} feature
   * @param {Object} [options] - { workflowId, dependsOn }
   * @returns {{ success: boolean, reason?: string }}
   */
  startFeature,

  /**
   * Feature 전환 (주 Feature 변경)
   * @param {string} feature
   * @returns {boolean}
   */
  switchTo,

  /**
   * Do Lock 획득
   * @param {string} feature
   * @returns {{ acquired: boolean, heldBy?: string }}
   */
  acquireDoLock,

  /**
   * Do Lock 해제
   * @param {string} feature
   * @returns {boolean}
   */
  releaseDoLock,

  /**
   * Do Lock 상태 조회
   * @returns {DoLock}
   */
  getDoLock,

  /**
   * Feature 의존성 설정
   * @param {string} feature
   * @param {string[]} dependsOn
   * @returns {{ success: boolean, reason?: string }}
   */
  setDependencies,

  /**
   * Feature 의존성 검증 (순환 감지)
   * @param {string} feature
   * @param {string[]} dependsOn
   * @returns {{ valid: boolean, cycle?: string[] }}
   */
  validateDependencies,

  /**
   * Feature 워크플로우 상태 파일 로드
   * @param {string} feature
   * @returns {FeatureWorkflowFile|null}
   */
  loadFeatureWorkflow,

  /**
   * Feature 워크플로우 상태 파일 저장
   * @param {string} feature
   * @param {FeatureWorkflowFile} data
   * @returns {void}
   */
  saveFeatureWorkflow,

  /**
   * 병렬 Feature 현황 요약
   * @returns {{ active: number, maxAllowed: number, doLocked: string|null, features: FeatureWorkflowState[] }}
   */
  getSummary,
};
```

### 6.6 의존성 관계

```
feature-manager.js
  └── lib/pdca/status.js (getActiveFeatures, updatePdcaStatus)
  └── lib/pdca/workflow-engine.js (createInstance, loadInstance)
  └── lib/core/paths.js (STATE_PATHS)
  └── lib/core/config.js (getConfig — maxActiveFeatures)
```

### 6.7 기존 코드 연동 방안

| 기존 | 변경 |
|------|------|
| `status.getActiveFeatures()` | `feature-manager.listFeatures()`의 경량 래퍼로 유지 |
| `status.switchFeatureContext()` | `feature-manager.switchTo()`로 내부 대체 |
| `status.addActiveFeature()` | `feature-manager.startFeature()`로 대체 (최대 3개 제한 추가) |
| `bkit.config.json` `multiFeature.maxActiveFeatures: 5` | 기본값을 3으로 하향. 기존 5는 상태 관리 차원이었고, 워크플로우 레벨에서는 3개 동시 제한 |

---

## 7. /batch + PDCA 연동

### 7.1 파일 경로 + 목적

| 파일 | 목적 |
|------|------|
| `skills/pdca-batch/SKILL.md` | `/pdca-batch` 스킬 정의 (트리거, 액션, 프롬프트) |
| `lib/pdca/batch-orchestrator.js` | 대규모 리팩토링의 Plan→/batch 병렬 실행→Check 자동화 |

### 7.2 pdca-batch 스킬 설계

```markdown
# pdca-batch Skill

## Actions
| Action | Description | Example |
|--------|-------------|---------|
| `start` | Plan 기반 batch 리팩토링 시작 | `/pdca-batch start auth-refactor` |
| `status` | 진행 상황 조회 | `/pdca-batch status` |
| `resume` | 중단된 batch 재개 | `/pdca-batch resume auth-refactor` |

## Workflow
1. Plan/Design 문서에서 리팩토링 대상 추출
2. 대상 파일을 배치 그룹으로 분할
3. 각 그룹을 /batch로 병렬 실행
4. 완료 시 자동 Check (gap-analysis) 트리거
5. matchRate 기준으로 Report 또는 추가 Iteration

## Integration Points
- Plan 문서 자동 참조 (docs/01-plan/features/{feature}.plan.md)
- Design 문서 자동 참조 (docs/02-design/features/{feature}.design.md)
- /batch 스킬 연동 (기존 batch 인프라 활용)
- PDCA 상태 자동 갱신 (Do 단계 자동 진행)
```

### 7.3 batch-orchestrator.js 핵심 데이터 구조

```javascript
/**
 * @typedef {Object} BatchPdcaPlan
 * @property {string} feature - Feature 이름
 * @property {string} planDocPath - Plan 문서 경로
 * @property {string} designDocPath - Design 문서 경로
 * @property {BatchGroup[]} groups - 배치 그룹
 * @property {number} totalFiles - 총 대상 파일 수
 * @property {'pending'|'running'|'completed'|'failed'} status
 */

/**
 * @typedef {Object} BatchGroup
 * @property {string} id - 그룹 ID
 * @property {string[]} files - 대상 파일 목록
 * @property {string} instruction - 리팩토링 지시사항
 * @property {'pending'|'running'|'completed'|'failed'} status
 * @property {number} completedFiles
 */
```

### 7.4 전체 Export 함수 목록

```javascript
/**
 * @module lib/pdca/batch-orchestrator
 * @exports
 */
module.exports = {
  /**
   * Plan/Design 문서에서 배치 리팩토링 계획 생성
   * @param {string} feature
   * @returns {BatchPdcaPlan}
   */
  createBatchPlan,

  /**
   * 배치 실행 시작
   * @param {BatchPdcaPlan} plan
   * @param {Object} [options] - { maxConcurrent, dryRun }
   * @returns {Promise<BatchResult>}
   */
  executeBatch,

  /**
   * 배치 실행 후 자동 Check 트리거
   * @param {string} feature
   * @param {BatchResult} result
   * @returns {void}
   */
  triggerAutoCheck,

  /**
   * 배치 실행 상태 조회
   * @param {string} feature
   * @returns {BatchPdcaPlan|null}
   */
  getBatchStatus,

  /**
   * 중단된 배치 재개
   * @param {string} feature
   * @returns {Promise<BatchResult>}
   */
  resumeBatch,
};
```

### 7.5 의존성 관계

```
batch-orchestrator.js
  └── lib/pdca/phase.js (findPlanDoc, findDesignDoc)
  └── lib/pdca/state-machine.js (transition — Do→Check 자동 전환)
  └── lib/pdca/feature-manager.js (acquireDoLock — 배치 실행 시 Do Lock)
  └── lib/pdca/status.js (updatePdcaStatus)
  └── lib/core/config.js (getConfig)
```

### 7.6 기존 코드 연동 방안

| 기존 | 변경 |
|------|------|
| `automation.generateBatchTrigger()` | `batch-orchestrator.createBatchPlan()`으로 확장. 기존 함수는 호환성 유지 |
| `automation.shouldSuggestBatch()` | 로직 유지, `batch-orchestrator` 존재 시 연동 제안 추가 |
| 기존 `/batch` 스킬 | 독립 유지. `pdca-batch`는 `/batch`를 내부적으로 호출하는 래퍼 |

---

## 8. 에러 복구

### 8.1 파일 경로 + 목적

| 파일 | 목적 |
|------|------|
| `lib/pdca/circuit-breaker.js` | Circuit Breaker 패턴 — 연속 실패 시 자동 차단 + 반자동 복구 |
| `lib/pdca/resume.js` | 세션 복구 — StopFailure/Context Overflow 후 이어서 실행 |

### 8.2 Circuit Breaker

#### 8.2.1 상태 정의

```javascript
/**
 * Circuit Breaker 3 상태:
 *
 * CLOSED  — 정상 동작. 실패 카운트 누적.
 * OPEN    — 차단 상태. 모든 PDCA 전환 거부. 쿨다운 대기.
 * HALF-OPEN — 시범 상태. 1회 전환 허용 후 결과에 따라 CLOSED/OPEN 결정.
 *
 * @typedef {'CLOSED'|'OPEN'|'HALF_OPEN'} CircuitState
 */

/**
 * @typedef {Object} CircuitBreakerState
 * @property {CircuitState} state - 현재 상태
 * @property {number} failureCount - 연속 실패 횟수
 * @property {number} failureThreshold - 차단 임계값 (기본 3)
 * @property {number} lastFailureAt - 마지막 실패 시각 (ms)
 * @property {number} cooldownMs - 쿨다운 시간 (기본 60000 = 1분)
 * @property {number} openedAt - OPEN 진입 시각
 * @property {string} lastError - 마지막 에러 메시지
 * @property {string} feature - 대상 Feature
 */

/**
 * 상태 전이 규칙:
 *
 * CLOSED + 성공  → CLOSED (failureCount = 0)
 * CLOSED + 실패  → failureCount++
 *                  failureCount >= threshold → OPEN
 * OPEN + 쿨다운경과 → HALF_OPEN
 * HALF_OPEN + 성공 → CLOSED
 * HALF_OPEN + 실패 → OPEN (쿨다운 리셋)
 */
```

#### 8.2.2 전체 Export 함수 목록

```javascript
/**
 * @module lib/pdca/circuit-breaker
 * @exports
 */
module.exports = {
  /**
   * Circuit Breaker 상태 조회
   * @param {string} feature
   * @returns {CircuitBreakerState}
   */
  getState,

  /**
   * 성공 기록
   * @param {string} feature
   * @returns {CircuitBreakerState}
   */
  recordSuccess,

  /**
   * 실패 기록
   * @param {string} feature
   * @param {string} error - 에러 메시지
   * @returns {CircuitBreakerState}
   */
  recordFailure,

  /**
   * 전환 허용 여부 확인
   * @param {string} feature
   * @returns {{ allowed: boolean, state: CircuitState, reason: string }}
   */
  canProceed,

  /**
   * 강제 리셋 (사용자 명시 요청)
   * @param {string} feature
   * @returns {CircuitBreakerState}
   */
  reset,

  /**
   * 상태 파일 경로
   * .bkit/state/circuit/{feature}.circuit.json
   */
};
```

### 8.3 Resume (세션 복구)

#### 8.3.1 Resume 데이터 스키마

```javascript
/**
 * Resume 데이터 파일: .bkit/state/resume/{feature}.resume.json
 *
 * @typedef {Object} ResumeData
 * @property {string} feature - Feature 이름
 * @property {PdcaState} savedState - 저장된 상태
 * @property {string} savedStepId - 저장된 워크플로우 단계 ID
 * @property {StateMachineContext} context - 저장된 컨텍스트
 * @property {string} reason - 중단 사유 ('StopFailure'|'ContextOverflow'|'UserAbort'|'Error')
 * @property {string} savedAt - 저장 시각
 * @property {Object} snapshot - 스냅샷 데이터
 * @property {string[]} snapshot.modifiedFiles - 중단 시점 변경된 파일 목록
 * @property {string} snapshot.gitRef - 중단 시점 git ref
 * @property {number} snapshot.matchRate - 중단 시점 matchRate
 * @property {number} snapshot.iterationCount - 중단 시점 iterationCount
 * @property {boolean} isValid - 복구 가능 여부
 * @property {string} expiresAt - 만료 시각 (기본 7일 후)
 */
```

#### 8.3.2 전체 Export 함수 목록

```javascript
/**
 * @module lib/pdca/resume
 * @exports
 */
module.exports = {
  /**
   * Resume 데이터 저장
   * @param {string} feature
   * @param {PdcaState} state
   * @param {StateMachineContext} context
   * @param {string} reason
   * @returns {ResumeData}
   */
  saveResumePoint,

  /**
   * Resume 데이터 로드
   * @param {string} feature
   * @returns {ResumeData|null}
   */
  loadResumePoint,

  /**
   * Resume 실행 (복구)
   * @param {string} feature
   * @returns {{ success: boolean, restoredState: PdcaState, reason: string }}
   */
  executeResume,

  /**
   * Resume 데이터 유효성 검증
   * @param {ResumeData} data
   * @returns {{ valid: boolean, reason: string }}
   */
  validateResumeData,

  /**
   * Resume 데이터 삭제
   * @param {string} feature
   * @returns {boolean}
   */
  clearResumePoint,

  /**
   * 만료된 Resume 데이터 정리
   * @returns {string[]} 정리된 Feature 목록
   */
  cleanupExpired,
};
```

### 8.4 `/pdca resume`, `/pdca rollback`, `/pdca reset` 명령 설계

```javascript
/**
 * /pdca resume {feature}
 * 동작:
 * 1. .bkit/state/resume/{feature}.resume.json 로드
 * 2. 유효성 검증 (만료, git ref 일치)
 * 3. Circuit Breaker 확인 (OPEN이면 거부)
 * 4. state-machine.transition(savedState, 'RECOVER', context) 실행
 * 5. 워크플로우 인스턴스 복원
 * 6. Resume 데이터 삭제
 * 7. 감사 로그 기록
 */

/**
 * /pdca rollback {feature}
 * 동작:
 * 1. .bkit/checkpoints/ 에서 최신 체크포인트 조회
 * 2. 체크포인트 메타데이터 로드
 * 3. state-machine.transition(currentState, 'ROLLBACK', context) 실행
 * 4. 파일 시스템 복원 (체크포인트 스냅샷)
 * 5. pdca-status.json 갱신
 * 6. 감사 로그 기록
 *
 * 체크포인트 자동 생성 시점:
 * - Design→Do 전환 시 (가장 중요)
 * - Check→Act 전환 시 (반복 전)
 * - 사용자 명시 요청 (/pdca checkpoint)
 */

/**
 * /pdca reset {feature}
 * 동작:
 * 1. 확인 질문 (AskUserQuestion: "Reset will delete all progress. Continue?")
 * 2. state-machine.transition(currentState, 'RESET', context) 실행
 * 3. Feature 상태를 idle로 초기화
 * 4. 워크플로우 인스턴스 삭제
 * 5. Resume/Circuit Breaker 데이터 삭제
 * 6. 감사 로그 기록
 * 7. 체크포인트는 유지 (수동 삭제 필요)
 */
```

### 8.5 의존성 관계

```
circuit-breaker.js
  └── lib/core/paths.js (STATE_PATHS)
  └── lib/audit/audit-logger.js (writeAuditLog)

resume.js
  └── lib/pdca/state-machine.js (transition, loadContext, syncContext)
  └── lib/pdca/circuit-breaker.js (canProceed)
  └── lib/core/paths.js (STATE_PATHS)
  └── lib/audit/audit-logger.js (writeAuditLog)
```

### 8.6 기존 코드 연동 방안

| 기존 | 변경 |
|------|------|
| StopFailure Hook (v1.6.2 ENH-118) | Hook 내에서 `resume.saveResumePoint()` + `circuitBreaker.recordFailure()` 자동 호출 |
| PostCompact Hook (v1.6.2 ENH-117) | Context Overflow 감지 시 `resume.saveResumePoint(reason: 'ContextOverflow')` 호출 |
| 기존 PDCA 에러 처리 없음 | state-machine의 `ERROR` 이벤트 + `RECOVER` 이벤트로 체계화 |

---

## 9. 자동 PDCA Cleanup/Archive

### 9.1 파일 경로 + 목적

| 파일 | 목적 |
|------|------|
| `lib/pdca/lifecycle.js` | PDCA Feature의 생명주기 관리 — 완료 감지, Stale 정리, Archive 자동화 |

### 9.2 완료 조건 자동 감지 4가지

```javascript
/**
 * @typedef {'normal'|'timeout'|'abandoned'|'forced'} CompletionType
 *
 * 1. normal — Match Rate >= threshold + Report 생성 완료
 *    트리거: report→archived 전환 시
 *    동작: archiveDocuments + cleanupFeature
 *
 * 2. timeout — 7일(기본) 비활동
 *    트리거: SessionStart 시 stale 검사 또는 주기적 검사
 *    동작: 경고 후 자동 Archive (상태 보존)
 *    설정: bkit.config.json pdca.automation.staleTimeout (ms)
 *
 * 3. abandoned — 사용자 명시적 방기 (/pdca abandon {feature})
 *    트리거: 사용자 명령
 *    동작: 즉시 archived 전환 (reason: 'abandoned')
 *
 * 4. forced — 관리자/시스템 강제 정리 (/pdca cleanup)
 *    트리거: 사용자 명령 또는 Feature 수 초과 시
 *    동작: 확인 후 archived 전환
 */
```

### 9.3 Stale Feature 자동 정리

```javascript
/**
 * Stale Feature 정리 로직 (SessionStart 시 실행):
 *
 * 1. 모든 활성 Feature 순회
 * 2. timestamps.lastUpdated 기준 staleTimeout(기본 7일) 경과 확인
 * 3. Stale Feature 발견 시:
 *    a. automationLevel === 'full-auto': 자동 Archive + 알림
 *    b. automationLevel !== 'full-auto': 경고만 표시
 *       "Feature '{name}' has been inactive for {days} days. Archive? (/pdca archive {name})"
 * 4. 감사 로그 기록
 *
 * 정리 대상 제외:
 * - Do 상태인 Feature (구현 중일 수 있음)
 * - 의존성이 있는 Feature (다른 Feature가 대기 중)
 */
```

### 9.4 전체 Export 함수 목록

```javascript
/**
 * @module lib/pdca/lifecycle
 * @exports
 */
module.exports = {
  /**
   * Stale Feature 검사 (SessionStart 시 호출)
   * @returns {StaleCheckResult}
   */
  checkStaleFeatures,

  /**
   * Feature 자동 Archive
   * @param {string} feature
   * @param {CompletionType} type
   * @returns {{ success: boolean, reason: string }}
   */
  autoArchive,

  /**
   * Feature 정상 완료 처리
   * @param {string} feature
   * @returns {{ success: boolean }}
   */
  completeFeature,

  /**
   * Feature 방기 처리
   * @param {string} feature
   * @returns {{ success: boolean }}
   */
  abandonFeature,

  /**
   * 전체 Cleanup (expired resume + stale features + 초과 features)
   * @param {Object} [options] - { dryRun, force }
   * @returns {CleanupResult}
   */
  runCleanup,

  /**
   * Feature 수 제한 적용 (기존 enforceFeatureLimit 확장)
   * @param {number} [maxFeatures=50]
   * @returns {{ deletedCount: number, deleted: string[] }}
   */
  enforceLimit,
};
```

### 9.5 핵심 데이터 구조

```javascript
/**
 * @typedef {Object} StaleCheckResult
 * @property {StaleFeature[]} stale - Stale Feature 목록
 * @property {number} checked - 검사한 Feature 수
 * @property {string} checkedAt
 */

/**
 * @typedef {Object} StaleFeature
 * @property {string} feature
 * @property {PdcaState} state
 * @property {number} inactiveDays - 비활동 일수
 * @property {boolean} autoArchived - 자동 Archive 여부
 */

/**
 * @typedef {Object} CleanupResult
 * @property {number} archivedCount - Archive된 Feature 수
 * @property {number} resumeCleared - 정리된 Resume 데이터 수
 * @property {number} featurePurged - 삭제된 Feature 수
 * @property {string[]} details - 상세 내역
 */
```

### 9.6 의존성 관계

```
lifecycle.js
  └── lib/pdca/status.js (getPdcaStatusFull, updatePdcaStatus, removeActiveFeature)
  └── lib/pdca/state-machine.js (transition — TIMEOUT, ABANDON 이벤트)
  └── lib/pdca/resume.js (cleanupExpired)
  └── lib/pdca/feature-manager.js (listFeatures)
  └── lib/core/config.js (getConfig — staleTimeout)
  └── lib/core/paths.js (getArchivePath)
  └── lib/audit/audit-logger.js (writeAuditLog)
```

### 9.7 기존 코드 연동 방안

| 기존 | 변경 |
|------|------|
| `status.enforceFeatureLimit()` | `lifecycle.enforceLimit()`으로 래핑. 기존 함수는 deprecated |
| `status.cleanupArchivedFeatures()` | `lifecycle.runCleanup()`에 통합 |
| `status.archiveFeatureToSummary()` | `lifecycle.autoArchive(type: 'normal')`에서 내부 호출 |
| `status.completePdcaFeature()` | `lifecycle.completeFeature()`에서 내부 호출 |
| SessionStart 시 stale 검사 없음 | `lifecycle.checkStaleFeatures()` SessionStart hook에 추가 |

---

## 10. 모듈 의존성 총괄도

```
                    ┌─────────────────────────┐
                    │   lib/core/             │
                    │   config.js, paths.js,   │
                    │   errors.js (신규)       │
                    └───────────┬─────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  state-machine   │ │ automation-ctrl  │ │  audit-logger    │
│  (FSM 코어)       │ │ (자동화 레벨)     │ │  (감사 로그)      │
└────────┬─────────┘ └────────┬─────────┘ └──────────────────┘
         │                    │                     ▲
         │   ┌────────────────┤                     │
         ▼   ▼                ▼                     │
┌──────────────────┐ ┌──────────────────┐          │
│ workflow-parser  │ │ workflow-engine  │───────────┤
│ (YAML 파서)      │ │ (실행 엔진)      │          │
└──────────────────┘ └────────┬─────────┘          │
                              │                     │
         ┌────────────────────┤                     │
         ▼                    ▼                     │
┌──────────────────┐ ┌──────────────────┐          │
│  do-detector     │ │ feature-manager  │          │
│ (Do 완료 감지)    │ │ (병렬 Feature)   │          │
└──────────────────┘ └──────────────────┘          │
                              │                     │
         ┌────────────────────┤                     │
         ▼                    ▼                     │
┌──────────────────┐ ┌──────────────────┐          │
│  full-auto-do    │ │  circuit-breaker │──────────┤
│ (자동 구현)       │ │  (에러 차단)      │          │
└──────────────────┘ └──────────────────┘          │
                              │                     │
                              ▼                     │
                    ┌──────────────────┐            │
                    │     resume       │────────────┤
                    │  (세션 복구)      │            │
                    └──────────────────┘            │
                              │                     │
                              ▼                     │
                    ┌──────────────────┐            │
                    │   lifecycle      │────────────┘
                    │ (생명주기 관리)    │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ batch-orchestr.  │
                    │ (/batch 연동)    │
                    └──────────────────┘

기존 모듈과의 관계:
  lib/pdca/status.js    ← state-machine, lifecycle, feature-manager가 의존
  lib/pdca/phase.js     ← do-detector, full-auto-do가 의존
  lib/pdca/automation.js ← 기존 함수를 state-machine/automation-controller 래핑으로 전환
```

### 신규 파일 요약

| # | 파일 | LOC (예상) | 목적 |
|---|------|:---------:|------|
| 1 | `lib/pdca/state-machine.js` | ~250 | PDCA FSM 코어 |
| 2 | `lib/pdca/workflow-parser.js` | ~350 | YAML/JSON 워크플로우 파서 + 경량 YAML 파서 |
| 3 | `lib/pdca/workflow-engine.js` | ~200 | 워크플로우 실행 엔진 |
| 4 | `lib/control/automation-controller.js` | ~150 | 3단계 자동화 레벨 관리 |
| 5 | `lib/pdca/do-detector.js` | ~120 | Do 완료 3-Layer 감지 |
| 6 | `lib/pdca/full-auto-do.js` | ~180 | Design 기반 자동 코드 생성 |
| 7 | `lib/pdca/feature-manager.js` | ~200 | 병렬 Feature 관리 |
| 8 | `lib/pdca/batch-orchestrator.js` | ~150 | /batch + PDCA 연동 |
| 9 | `lib/pdca/circuit-breaker.js` | ~100 | Circuit Breaker |
| 10 | `lib/pdca/resume.js` | ~130 | 세션 복구 |
| 11 | `lib/pdca/lifecycle.js` | ~120 | PDCA 생명주기 관리 |
| 12 | `lib/pdca/workflows/default-pdca.workflow.yaml` | ~80 | 기본 워크플로우 |
| 13 | `lib/pdca/workflows/hotfix-pdca.workflow.yaml` | ~50 | 핫픽스 워크플로우 |
| 14 | `lib/pdca/workflows/enterprise-pdca.workflow.yaml` | ~90 | Enterprise 워크플로우 |
| 15 | `skills/pdca-batch/SKILL.md` | ~60 | pdca-batch 스킬 |
| | **합계** | **~2,230** | |

### 신규 상태 파일

| 경로 | 목적 |
|------|------|
| `.bkit/state/workflows/{feature}.json` | Feature별 워크플로우 인스턴스 상태 |
| `.bkit/state/resume/{feature}.resume.json` | Resume 복구 데이터 |
| `.bkit/state/circuit/{feature}.circuit.json` | Circuit Breaker 상태 |
| `.bkit/runtime/do-lock.json` | Do Phase 배타적 잠금 |
| `.bkit/workflows/*.workflow.yaml` | 사용자 정의 워크플로우 (선택) |

### 기존 코드 수정 사항 요약

| 기존 파일 | 수정 유형 | 상세 |
|----------|----------|------|
| `lib/pdca/automation.js` | 내부 리팩토링 | 핵심 함수를 state-machine/automation-controller 래핑으로 전환. Export 시그니처 유지 |
| `lib/pdca/phase.js` | 최소 수정 | `validatePdcaTransition()` 내부를 `canTransition()` 호출로 전환 |
| `lib/pdca/status.js` | 확장 | `pdca-status.json` v3.0 스키마 호환 (phaseTimestamps, stateMachine 필드) |
| `lib/pdca/index.js` | 확장 | 신규 모듈 Export 추가 |
| `bkit.config.json` | 확장 | `pdca.automation` 섹션 추가 |
| SessionStart Hook | 추가 | `lifecycle.checkStaleFeatures()` 호출 추가 |
| StopFailure Hook | 추가 | `resume.saveResumePoint()` + `circuitBreaker.recordFailure()` 추가 |

---

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 0.1 | 2026-03-19 | 영역 1 전체 상세 설계 초안 | Claude Opus 4.6 + Enterprise Expert Agent |
