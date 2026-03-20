# bkit v2.0.0 영역 2 — 통제 가능한 AI 아키텍처 상세 설계

> **Summary**: 5단계 자동화 레벨(L0-L4), Permission Manager v2.0, 파괴적 작업 감지, Blast Radius 분석, 체크포인트/롤백, 무한 루프 방지, Decision Trace, 감사 로그, Plan Preview, Trust Score, 사용자 피드백 학습 — 통제 가능한 AI 4원칙을 구현하는 11개 모듈 상세 설계
>
> **Project**: bkit v2.0.0
> **Author**: Security Architect (bkit-security-architect)
> **Date**: 2026-03-19
> **Status**: Draft
> **Planning Doc**: [bkit-v200-enhancement.plan.md](../../01-plan/features/bkit-v200-enhancement.plan.md)
> **관련 FR**: FR-03, FR-10, FR-11, FR-12, FR-13, FR-14, FR-25
> **4원칙**: 안전 기본값, 점진적 신뢰, 완전한 가시성, 언제나 중단 가능

---

## 목차

1. [아키텍처 총괄](#1-아키텍처-총괄)
2. [자동화 레벨 컨트롤러 (L0-L4)](#2-자동화-레벨-컨트롤러-l0-l4)
3. [Permission Manager v2.0](#3-permission-manager-v20)
4. [파괴적 작업 감지기](#4-파괴적-작업-감지기)
5. [Blast Radius 분석기](#5-blast-radius-분석기)
6. [체크포인트/롤백 매니저](#6-체크포인트롤백-매니저)
7. [무한 루프 방지기](#7-무한-루프-방지기)
8. [Decision Trace](#8-decision-trace)
9. [감사 로그](#9-감사-로그)
10. [Plan Preview](#10-plan-preview)
11. [Trust Score 엔진](#11-trust-score-엔진)
12. [사용자 피드백 학습](#12-사용자-피드백-학습)
13. [모듈 간 의존성 및 통합](#13-모듈-간-의존성-및-통합)
14. [보안 분석](#14-보안-분석)

---

## 1. 아키텍처 총괄

### 1.1 디렉토리 구조

```
lib/
├── control/
│   ├── automation-controller.js   # L0-L4 자동화 레벨 관리 (FR-03)
│   ├── destructive-detector.js    # 파괴적 작업 감지 8규칙 (FR-10)
│   ├── blast-radius.js            # 변경 영향 범위 분석 (FR-10)
│   ├── checkpoint-manager.js      # 체크포인트/롤백 (FR-11)
│   ├── loop-breaker.js            # 무한 루프 방지 4규칙 (FR-12)
│   ├── trust-engine.js            # Trust Score 0-100 (FR-03)
│   └── feedback-learner.js        # 사용자 피드백 학습
│
├── audit/
│   ├── audit-logger.js            # 감사 로그 JSONL (FR-14)
│   └── decision-tracer.js         # 의사결정 추적 (FR-13)
│
├── permission-manager.js          # v2.0 확장 — 레벨 인식 (FR-03)
│
.bkit/
├── audit/
│   ├── YYYY-MM-DD.jsonl           # 일별 감사 로그
│   └── summary/
│       ├── daily-YYYY-MM-DD.json  # 일별 요약
│       └── weekly-YYYY-WNN.json   # 주별 요약
├── checkpoints/
│   └── cp-{timestamp}.json        # 체크포인트 스냅샷
├── decisions/
│   └── YYYY-MM-DD.jsonl           # 일별 의사결정 로그
└── runtime/
    └── control-state.json         # 런타임 제어 상태
```

### 1.2 모듈 간 데이터 흐름

```
                          ┌─────────────────┐
                          │  bkit.config.json │
                          │ automation section│
                          └────────┬──────────┘
                                   │ 초기 레벨 설정
                                   ▼
    ┌───────────────────────────────────────────────────────┐
    │           automation-controller.js (L0-L4)            │
    │  getCurrentLevel() / setLevel() / getRuntimeState()   │
    └──┬──────────┬──────────┬──────────┬──────────┬────────┘
       │          │          │          │          │
       ▼          ▼          ▼          ▼          ▼
  permission  destructive  checkpoint  loop     plan
  -manager    -detector    -manager    -breaker  preview
  (v2.0)      + blast                           (L0-L2)
              -radius
       │          │          │          │          │
       └──────────┴──────────┴──────────┴──────────┘
                          │
                   ┌──────┴──────┐
                   ▼             ▼
              audit-logger  decision-tracer
              (.bkit/audit) (.bkit/decisions)
                   │             │
                   └──────┬──────┘
                          ▼
               ┌───────────────────┐
               │  trust-engine.js  │
               │ (Trust Score 계산) │
               └────────┬──────────┘
                        │ 레벨 변경 제안
                        ▼
               ┌───────────────────┐
               │ feedback-learner  │
               │  (패턴 학습/반영)  │
               └───────────────────┘
```

### 1.3 설계 원칙

| 원칙 | 구현 |
|------|------|
| npm 외부 의존성 금지 | 모든 모듈 Node.js 내장만 사용 |
| 하위 호환성 | `checkPermission()` 기존 시그니처 유지 |
| 파일 I/O | StateStore 추상화 사용 (v2.0) |
| 에러 처리 | BkitError 클래스 사용 |
| 상수 관리 | `lib/core/constants.js`에서 import |
| JSDoc 100% | 모든 public 함수 JSDoc 필수 |

---

## 2. 자동화 레벨 컨트롤러 (L0-L4)

### 2.1 파일 경로

`lib/control/automation-controller.js`

### 2.2 레벨 정의

| 레벨 | 이름 | 설명 | 사용자 개입 수준 |
|:----:|------|------|:---------------:|
| L0 | Manual | 모든 단계마다 사용자 승인 필요 | 매 작업마다 |
| L1 | Guided | AI가 제안하고 사용자가 확인 (현 v1.6.2 기본) | 단계별 1회 |
| L2 | Semi-Auto | 저위험 작업 자동, 고위험만 승인 (v2.0.0 기본) | PDCA 전환 시 |
| L3 | Auto | 대부분 자동, 고위험 + 파괴적 작업만 승인 | 고위험만 |
| L4 | Full-Auto | 전부 자동, 최초 Feature 시작 시 1회 승인 | 시작 시 1회 |

### 2.3 레벨별 행동 매트릭스

행(도구/작업) × 열(레벨)에서 각 셀은 `gate`(사용자 승인), `auto`(자동 실행), `deny`(차단)

| 작업 | L0 | L1 | L2 | L3 | L4 |
|------|:--:|:--:|:--:|:--:|:--:|
| **PDCA Phase 전환** | gate | gate | auto | auto | auto |
| **파일 생성 (docs/)** | gate | auto | auto | auto | auto |
| **파일 생성 (src/)** | gate | gate | auto | auto | auto |
| **파일 수정 (기존)** | gate | gate | auto | auto | auto |
| **파일 삭제** | gate | gate | gate | gate | auto |
| **Bash 일반** | gate | gate | auto | auto | auto |
| **Bash 위험 (rm -r 등)** | deny | deny | gate | gate | gate |
| **Bash 파괴적 (rm -rf, force push)** | deny | deny | deny | gate | gate |
| **git commit** | gate | gate | auto | auto | auto |
| **git push** | gate | gate | gate | auto | auto |
| **git push --force** | deny | deny | deny | deny | gate |
| **Agent Team 생성** | gate | gate | auto | auto | auto |
| **외부 API 호출** | gate | gate | gate | auto | auto |
| **설정 파일 변경** | gate | gate | gate | gate | auto |
| **Do→Check 전환** | gate | gate | gate(확인) | auto | auto |
| **Report→Archive** | gate | gate | gate | gate | auto |

### 2.4 bkit.config.json `automation` 섹션 전체 스키마

```jsonc
{
  "automation": {
    // 기본 자동화 레벨 (L0-L4)
    "defaultLevel": 2,

    // 레벨 이름 매핑 (사용자 표시용)
    // 내부적으로 숫자로 관리, 문자열은 표시/CLI용
    "levelNames": {
      "0": "manual",
      "1": "guided",
      "2": "semi-auto",
      "3": "auto",
      "4": "full-auto"
    },

    // Trust Score 자동 레벨 전환 활성화
    "trustBasedEscalation": true,

    // 레벨별 오버라이드 (선택)
    "levelOverrides": {
      // 특정 도구에 대한 레벨별 퍼미션 재정의
      // 형식: "TOOL_NAME": { "levelN": "permission" }
      "Bash(npm publish*)": { "0": "deny", "1": "deny", "2": "deny", "3": "gate", "4": "gate" },
      "Bash(docker*)": { "0": "deny", "1": "gate", "2": "auto", "3": "auto", "4": "auto" }
    },

    // 에스컬레이션 쿨다운 (분)
    "escalationCooldownMinutes": 30,

    // 다운그레이드 유예 기간 (분) — 일시적 실수로 바로 다운그레이드 방지
    "downgradeGracePeriodMinutes": 5,

    // L4 진입 최소 Trust Score
    "fullAutoMinTrustScore": 85,

    // L3 진입 최소 Trust Score
    "autoMinTrustScore": 70,

    // 비상 중지 시 돌아갈 레벨
    "emergencyFallbackLevel": 1,

    // 세션 시작 시 레벨 리셋 여부
    "resetLevelOnSessionStart": false,

    // Plan Preview 설정
    "planPreview": {
      "alwaysShow": [0, 1],           // 항상 미리보기 표시하는 레벨
      "showOnRequest": [2],            // 요청 시만 표시하는 레벨
      "showHighRiskOnly": [3],         // 고위험 작업만 표시하는 레벨
      "neverShow": [4]                 // 표시하지 않는 레벨
    },

    // 체크포인트 설정
    "checkpoint": {
      "autoCreateOnPhaseTransition": true,
      "autoCreateBeforeDestructive": true,
      "maxAutoCheckpoints": 50,
      "maxManualCheckpoints": 20,
      "maxTotalSizeMB": 100,
      "retentionDays": 30
    },

    // 파괴적 작업 감지 설정
    "destructiveDetection": {
      "enabled": true,
      "customRules": []              // 사용자 정의 추가 규칙 (G-xxx)
    },

    // 무한 루프 방지 설정
    "loopBreaker": {
      "enabled": true,
      "maxPdcaIterations": 5,
      "maxSameFileEdits": 10,
      "maxAgentRecursionDepth": 5,
      "maxErrorRetries": 3
    }
  }
}
```

### 2.5 런타임 상태 파일 (`.bkit/runtime/control-state.json`)

```jsonc
{
  "version": "1.0",
  "currentLevel": 2,
  "previousLevel": 1,
  "levelChangedAt": "2026-03-19T10:00:00.000Z",
  "levelChangeReason": "trust_escalation",
  "trustScore": 72,
  "sessionStats": {
    "approvals": 15,
    "rejections": 2,
    "modifications": 3,
    "destructiveBlocked": 1,
    "checkpointsCreated": 8,
    "rollbacksPerformed": 0
  },
  "emergencyStop": false,
  "cooldownUntil": null,
  "lastEscalation": "2026-03-19T09:30:00.000Z",
  "lastDowngrade": null
}
```

### 2.6 Export 함수 목록

```js
/**
 * @module lib/control/automation-controller
 */

/**
 * 현재 자동화 레벨 조회
 * @returns {number} 0-4
 */
function getCurrentLevel() {}

/**
 * 자동화 레벨 설정 (명시적 변경)
 * @param {number} level - 0-4
 * @param {Object} options
 * @param {string} options.reason - 변경 사유
 * @param {boolean} [options.force=false] - Trust Score 무시
 * @returns {{ success: boolean, previousLevel: number, newLevel: number, reason?: string }}
 */
function setLevel(level, options = {}) {}

/**
 * 특정 작업에 대한 행동 결정
 * @param {string} action - 작업 식별자 (e.g., 'phase_transition', 'file_delete', 'bash_destructive')
 * @param {Object} context - 작업 컨텍스트 (toolName, toolInput, phase 등)
 * @returns {'auto' | 'gate' | 'deny'}
 */
function resolveAction(action, context = {}) {}

/**
 * 레벨 이름 → 숫자 변환
 * @param {string} name - 'manual' | 'guided' | 'semi-auto' | 'auto' | 'full-auto'
 * @returns {number}
 */
function levelFromName(name) {}

/**
 * 레벨 숫자 → 이름 변환
 * @param {number} level - 0-4
 * @returns {string}
 */
function levelToName(level) {}

/**
 * 런타임 제어 상태 전체 조회
 * @returns {Object} control-state.json 내용
 */
function getRuntimeState() {}

/**
 * 런타임 제어 상태 업데이트
 * @param {Object} patch - 갱신할 필드
 */
function updateRuntimeState(patch) {}

/**
 * 비상 중지 — 즉시 emergencyFallbackLevel로 전환
 * @param {string} reason - 비상 중지 사유
 * @returns {{ previousLevel: number, fallbackLevel: number }}
 */
function emergencyStop(reason) {}

/**
 * 비상 중지 해제
 * @param {number} resumeLevel - 복귀 레벨
 * @returns {{ success: boolean }}
 */
function emergencyResume(resumeLevel) {}

/**
 * 기존 automationLevel 호환 — 'manual'|'semi-auto'|'full-auto' 매핑
 * v1.6.2 하위 호환: getAutomationLevel()이 반환하던 문자열 유지
 * @returns {'manual' | 'semi-auto' | 'full-auto'}
 */
function getLegacyAutomationLevel() {}

/**
 * 세션 통계 증가
 * @param {'approvals' | 'rejections' | 'modifications' | 'destructiveBlocked' | ...} stat
 * @param {number} [delta=1]
 */
function incrementStat(stat, delta = 1) {}
```

### 2.7 `/control` 스킬 설계

```
skills/control/SKILL.md
```

| 명령 | 설명 | 예시 |
|------|------|------|
| `/control status` | 현재 레벨, Trust Score, 세션 통계 표시 | `/control status` |
| `/control level {N}` | 레벨 수동 변경 (0-4 또는 이름) | `/control level semi-auto` |
| `/control emergency` | 비상 중지 (즉시 L1로 다운그레이드) | `/control emergency` |
| `/control resume [level]` | 비상 중지 해제 + 지정 레벨 복귀 | `/control resume 2` |
| `/control history` | 레벨 변경 이력 표시 | `/control history` |
| `/control rules` | 현재 레벨의 행동 매트릭스 표시 | `/control rules` |

### 2.8 기존 코드 연동

| 기존 모듈 | 연동 방안 |
|-----------|----------|
| `lib/pdca/automation.js` → `getAutomationLevel()` | `getLegacyAutomationLevel()` 위임. 기존 `'manual'/'semi-auto'/'full-auto'` 3단계를 L0-L4 매핑: manual→L0, semi-auto→L2, full-auto→L4 |
| `lib/pdca/automation.js` → `shouldAutoAdvance()` | `resolveAction('phase_transition', { phase })` 결과가 `'auto'`이면 true |
| `bkit.config.json` → `pdca.automationLevel` | v2.0.0에서 `automation.defaultLevel`이 우선, 없으면 기존 `pdca.automationLevel`을 매핑하여 호환 |
| `lib/core/config.js` → `getConfig()` | `automation.*` 경로 추가, 기존 경로도 동작 유지 |

### 2.9 보안 고려사항

- **레벨 상승은 명시적**: L0→L4 방향 전환은 Trust Score 임계값 충족 또는 사용자 명시 명령 필요
- **레벨 하락은 자동**: 파괴적 작업 감지 시 자동 다운그레이드
- **비상 중지는 무조건**: `emergencyStop()`는 Trust Score, 쿨다운 무시
- **설정 파일 변조 방지**: `control-state.json` 쓰기 시 이전 상태 감사 로그 기록

---

## 3. Permission Manager v2.0

### 3.1 파일 경로

`lib/permission-manager.js` (기존 파일 확장)

### 3.2 LEVEL_PERMISSIONS 전체 매핑

```js
/**
 * Level-aware permission map
 * Key: 도구/패턴, Value: 레벨별 퍼미션 배열 [L0, L1, L2, L3, L4]
 *
 * 'deny'  = 차단 (실행 불가)
 * 'gate'  = 사용자 승인 필요 (AskUserQuestion)
 * 'auto'  = 자동 허용
 */
const LEVEL_PERMISSIONS = {
  // 기본 도구
  'Read':                    ['gate', 'auto', 'auto', 'auto', 'auto'],
  'Write':                   ['gate', 'gate', 'auto', 'auto', 'auto'],
  'Edit':                    ['gate', 'gate', 'auto', 'auto', 'auto'],
  'Bash':                    ['gate', 'gate', 'auto', 'auto', 'auto'],

  // 파일 삭제 (위험)
  'Bash(rm *)':              ['deny', 'deny', 'gate', 'gate', 'auto'],
  'Bash(rm -r*)':            ['deny', 'deny', 'gate', 'gate', 'gate'],
  'Bash(rm -rf*)':           ['deny', 'deny', 'deny', 'gate', 'gate'],

  // Git 작업
  'Bash(git commit*)':       ['gate', 'gate', 'auto', 'auto', 'auto'],
  'Bash(git push)':          ['gate', 'gate', 'gate', 'auto', 'auto'],
  'Bash(git push --force*)': ['deny', 'deny', 'deny', 'deny', 'gate'],
  'Bash(git reset --hard*)': ['deny', 'deny', 'deny', 'gate', 'gate'],
  'Bash(git rebase*)':       ['gate', 'gate', 'gate', 'gate', 'auto'],
  'Bash(git merge*)':        ['gate', 'gate', 'auto', 'auto', 'auto'],

  // 패키지/빌드
  'Bash(npm publish*)':      ['deny', 'deny', 'deny', 'gate', 'gate'],
  'Bash(npm install*)':      ['gate', 'gate', 'auto', 'auto', 'auto'],
  'Bash(npx*)':              ['gate', 'gate', 'auto', 'auto', 'auto'],

  // Docker/인프라
  'Bash(docker*)':           ['deny', 'gate', 'auto', 'auto', 'auto'],
  'Bash(kubectl*)':          ['deny', 'deny', 'gate', 'gate', 'auto'],

  // 데이터베이스
  'Bash(*DROP TABLE*)':      ['deny', 'deny', 'deny', 'deny', 'gate'],
  'Bash(*DROP DATABASE*)':   ['deny', 'deny', 'deny', 'deny', 'deny'],
  'Bash(*TRUNCATE*)':        ['deny', 'deny', 'deny', 'gate', 'gate'],

  // 네트워크/외부
  'Bash(curl*)':             ['gate', 'gate', 'auto', 'auto', 'auto'],
  'Bash(wget*)':             ['gate', 'gate', 'auto', 'auto', 'auto'],

  // 파일 시스템 위험 작업
  'Bash(chmod 777*)':        ['deny', 'deny', 'deny', 'gate', 'gate'],
  'Bash(chown*)':            ['deny', 'deny', 'gate', 'gate', 'auto'],
  'Write(*.env*)':           ['gate', 'gate', 'gate', 'gate', 'gate'],
  'Edit(*.env*)':            ['gate', 'gate', 'gate', 'gate', 'gate'],
};
```

### 3.3 확장된 API

```js
/**
 * v2.0: 레벨 인식 퍼미션 체크
 * 기존 checkPermission() 시그니처 100% 호환 유지
 *
 * @param {string} toolName - 도구 이름 (e.g., "Write", "Bash")
 * @param {string} [toolInput=''] - 도구 입력/명령
 * @param {Object} [options={}] - v2.0 확장 옵션
 * @param {number} [options.level] - 명시 레벨 (미지정 시 현재 레벨 사용)
 * @param {string} [options.feature] - 현재 Feature 이름 (컨텍스트)
 * @param {string} [options.phase] - 현재 PDCA Phase (컨텍스트)
 * @returns {'deny' | 'ask' | 'allow'}
 *
 * 호환 매핑: 'gate' → 'ask', 'auto' → 'allow'
 */
function checkPermission(toolName, toolInput = '', options = {}) {}

/**
 * v2.0: 레벨별 전체 퍼미션 매트릭스 조회
 * @param {number} [level] - 특정 레벨 (미지정 시 전체)
 * @returns {Object} { pattern: permission } 또는 { level: { pattern: permission } }
 */
function getLevelPermissions(level) {}

/**
 * v2.0: 패턴 매칭 테스트 (디버깅/UI용)
 * @param {string} toolName
 * @param {string} toolInput
 * @returns {{ matched: string|null, permission: string, level: number, source: string }}
 */
function testPermission(toolName, toolInput) {}
```

### 3.4 패턴 매칭 확장

기존 `*` glob 패턴에 더해 v2.0에서 확장:

```js
/**
 * 패턴 매칭 규칙 (우선순위 순):
 *
 * 1. 정확한 패턴: 'Bash(rm -rf /)'  → 완전 일치
 * 2. Glob 와일드카드: 'Bash(rm -rf*)' → rm -rf로 시작하는 모든 명령
 * 3. 중간 와일드카드: 'Bash(*DROP TABLE*)' → DROP TABLE이 포함된 모든 명령
 * 4. 파일 패턴: 'Write(*.env*)' → .env 파일명 패턴 매칭
 * 5. 도구 기본값: 'Bash' → 위 패턴에 매칭되지 않는 모든 Bash 명령
 *
 * 매칭 우선순위: 더 구체적(긴) 패턴이 우선
 * 보안 원칙: 여러 패턴이 매칭되면 가장 제한적인 퍼미션 적용
 */

/**
 * glob-like 패턴을 RegExp로 변환
 * @param {string} pattern - glob 패턴
 * @returns {RegExp}
 */
function patternToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // 특수문자 이스케이프 (* 제외)
    .replace(/\*/g, '.*');                   // * → .*
  return new RegExp(`^${escaped}$`, 'i');    // 대소문자 무시
}
```

### 3.5 기존 코드 호환 보장

```js
// v1.6.2 호환 레이어
// 기존 DEFAULT_PERMISSIONS는 유지하되, LEVEL_PERMISSIONS가 있으면 우선 사용
// 기존 bkit.config.json의 "permissions" 섹션도 계속 동작
// 결정 순서:
//   1. bkit.config.json "permissions" (사용자 정의) — 최우선
//   2. LEVEL_PERMISSIONS[현재 레벨] — 레벨 기반
//   3. DEFAULT_PERMISSIONS — 폴백

function checkPermission(toolName, toolInput = '', options = {}) {
  const hierarchy = getHierarchy();
  const userPermissions = hierarchy.getHierarchicalConfig('permissions', null);

  // 1. 사용자 정의 퍼미션이 있으면 기존 로직 그대로 (하위 호환)
  if (userPermissions) {
    const userResult = _checkUserPermission(userPermissions, toolName, toolInput);
    if (userResult !== null) return userResult;
  }

  // 2. 레벨 기반 퍼미션
  const level = options.level ?? _getCurrentLevel();
  const levelResult = _checkLevelPermission(level, toolName, toolInput);
  if (levelResult !== null) return _mapToLegacy(levelResult);

  // 3. 기존 DEFAULT_PERMISSIONS 폴백
  return _checkUserPermission(DEFAULT_PERMISSIONS, toolName, toolInput) || 'allow';
}

// 내부 매핑: v2.0 → v1.x 호환
function _mapToLegacy(perm) {
  return { 'auto': 'allow', 'gate': 'ask', 'deny': 'deny' }[perm] || 'allow';
}
```

### 3.6 의존성

| 의존 모듈 | 용도 |
|-----------|------|
| `lib/control/automation-controller.js` | `getCurrentLevel()` 호출 |
| `lib/context-hierarchy.js` | 사용자 정의 퍼미션 조회 |
| `lib/audit/audit-logger.js` | deny/gate 이벤트 기록 |

---

## 4. 파괴적 작업 감지기

### 4.1 파일 경로

`lib/control/destructive-detector.js`

### 4.2 8개 규칙 전체

| 규칙 ID | 카테고리 | 설명 | 심각도 |
|---------|---------|------|:------:|
| G-001 | 파일 삭제 | `rm -rf`, `rm -r`, 디렉토리 삭제 | Critical |
| G-002 | Git 이력 변조 | `git push --force`, `git reset --hard`, `git rebase -i` (remote) | Critical |
| G-003 | 데이터베이스 파괴 | DROP TABLE, DROP DATABASE, TRUNCATE, DELETE without WHERE | Critical |
| G-004 | 환경/인프라 변경 | `.env` 파일 수정, `docker rm`, `kubectl delete` | High |
| G-005 | 권한 변경 | `chmod 777`, `chown`, `setfacl` | High |
| G-006 | 대량 파일 변경 | 10개 이상 파일 동시 변경 | Medium |
| G-007 | 설정 파일 변경 | `bkit.config.json`, `package.json`, `tsconfig.json` 등 핵심 설정 | Medium |
| G-008 | 네트워크 작업 | `curl -X POST/PUT/DELETE`, `wget --post-data` | Low |

### 4.3 규칙별 상세 패턴 + 정규식

```js
/**
 * 파괴적 작업 감지 규칙
 * @type {Array<DestructiveRule>}
 */
const DESTRUCTIVE_RULES = [
  // G-001: 파일 삭제
  {
    id: 'G-001',
    category: 'file_deletion',
    severity: 'critical',
    patterns: [
      { regex: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|--recursive\s+--force)\s+/i, desc: 'rm -rf (recursive force delete)' },
      { regex: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*|--recursive)\s+/i, desc: 'rm -r (recursive delete)' },
      { regex: /\brmdir\s+/i, desc: 'rmdir (directory removal)' },
      { regex: /\brm\s+(?!.*--dry-run).*\s+\//i, desc: 'rm with absolute path' },
      { regex: /\bfind\s+.*-delete\b/i, desc: 'find with -delete' },
      { regex: /\bfind\s+.*-exec\s+rm\b/i, desc: 'find -exec rm' },
    ],
    action: 'block',  // L0-L2: 차단, L3-L4: gate
    message: 'Destructive file deletion detected'
  },

  // G-002: Git 이력 변조
  {
    id: 'G-002',
    category: 'git_history',
    severity: 'critical',
    patterns: [
      { regex: /\bgit\s+push\s+.*--force\b/i, desc: 'git push --force' },
      { regex: /\bgit\s+push\s+.*-f\b/i, desc: 'git push -f' },
      { regex: /\bgit\s+reset\s+--hard\b/i, desc: 'git reset --hard' },
      { regex: /\bgit\s+rebase\s+(-i|--interactive)\b/i, desc: 'git rebase -i' },
      { regex: /\bgit\s+filter-branch\b/i, desc: 'git filter-branch' },
      { regex: /\bgit\s+reflog\s+expire\b/i, desc: 'git reflog expire' },
    ],
    action: 'block',
    message: 'Git history modification detected'
  },

  // G-003: 데이터베이스 파괴
  {
    id: 'G-003',
    category: 'database',
    severity: 'critical',
    patterns: [
      { regex: /\bDROP\s+TABLE\b/i, desc: 'DROP TABLE' },
      { regex: /\bDROP\s+DATABASE\b/i, desc: 'DROP DATABASE' },
      { regex: /\bTRUNCATE\s+(TABLE\s+)?\w/i, desc: 'TRUNCATE TABLE' },
      { regex: /\bDELETE\s+FROM\s+\w+\s*(?!WHERE)/i, desc: 'DELETE without WHERE' },
      { regex: /\bDROP\s+SCHEMA\b/i, desc: 'DROP SCHEMA' },
    ],
    action: 'block',
    message: 'Database destructive operation detected'
  },

  // G-004: 환경/인프라 변경
  {
    id: 'G-004',
    category: 'environment',
    severity: 'high',
    patterns: [
      { regex: /\.env(\.\w+)?$/i, desc: '.env file modification', type: 'file_path' },
      { regex: /\bdocker\s+(rm|rmi|system\s+prune)\b/i, desc: 'docker destructive' },
      { regex: /\bkubectl\s+delete\b/i, desc: 'kubectl delete' },
      { regex: /\bterraform\s+destroy\b/i, desc: 'terraform destroy' },
    ],
    action: 'gate',
    message: 'Environment/infrastructure change detected'
  },

  // G-005: 권한 변경
  {
    id: 'G-005',
    category: 'permissions',
    severity: 'high',
    patterns: [
      { regex: /\bchmod\s+777\b/i, desc: 'chmod 777 (world writable)' },
      { regex: /\bchmod\s+666\b/i, desc: 'chmod 666' },
      { regex: /\bchmod\s+-R\b/i, desc: 'chmod recursive' },
      { regex: /\bchown\s+/i, desc: 'ownership change' },
      { regex: /\bsetfacl\b/i, desc: 'ACL modification' },
    ],
    action: 'gate',
    message: 'File permission change detected'
  },

  // G-006: 대량 파일 변경
  {
    id: 'G-006',
    category: 'bulk_change',
    severity: 'medium',
    // 이 규칙은 정규식이 아닌 파일 카운트 기반
    patterns: [],
    threshold: 10,  // 10개 이상 파일 동시 변경
    action: 'warn',
    message: 'Bulk file change detected (10+ files)'
  },

  // G-007: 설정 파일 변경
  {
    id: 'G-007',
    category: 'config_change',
    severity: 'medium',
    patterns: [
      { regex: /bkit\.config\.json$/i, desc: 'bkit config', type: 'file_path' },
      { regex: /package\.json$/i, desc: 'package.json', type: 'file_path' },
      { regex: /tsconfig(\.\w+)?\.json$/i, desc: 'tsconfig', type: 'file_path' },
      { regex: /\.eslintrc/i, desc: 'eslint config', type: 'file_path' },
      { regex: /next\.config\./i, desc: 'next.config', type: 'file_path' },
      { regex: /webpack\.config\./i, desc: 'webpack config', type: 'file_path' },
    ],
    action: 'warn',
    message: 'Configuration file change detected'
  },

  // G-008: 네트워크 작업 (쓰기 계열)
  {
    id: 'G-008',
    category: 'network',
    severity: 'low',
    patterns: [
      { regex: /\bcurl\s+.*-X\s+(POST|PUT|DELETE|PATCH)\b/i, desc: 'curl mutating request' },
      { regex: /\bcurl\s+.*--data\b/i, desc: 'curl with data' },
      { regex: /\bwget\s+.*--post-data\b/i, desc: 'wget POST' },
      { regex: /\bfetch\s*\(.*method:\s*['"]?(POST|PUT|DELETE)/i, desc: 'fetch mutating' },
    ],
    action: 'log',
    message: 'Network mutating operation detected'
  },
];
```

### 4.4 감지 → 차단/경고/로그 플로우

```
도구 호출 (PreToolUse Hook)
    │
    ▼
detect(toolName, toolInput, filePath)
    │
    ├── 규칙 순회 (G-001 ~ G-008)
    │   ├── 정규식 매칭 (command 기반)
    │   └── 파일 경로 매칭 (file_path 타입)
    │
    ├── 매칭된 규칙 수집
    │   └── 가장 높은 severity 결정
    │
    ▼
┌─ severity + 현재 레벨 → 행동 결정 ─┐
│                                     │
│  action='block' + level ≤ L2       │ → return { blocked: true, ... }
│  action='block' + level ≥ L3       │ → return { gate: true, ... }
│  action='gate'                      │ → return { gate: true, ... }
│  action='warn'                      │ → return { warn: true, ... }
│  action='log'                       │ → return { log: true, ... }
│                                     │
└─────────────────────────────────────┘
    │
    ├── 감사 로그 기록 (모든 감지)
    ├── 체크포인트 생성 (block/gate 시, autoCreateBeforeDestructive)
    └── Trust Score 반영 (block → 감점)
```

### 4.5 Export 함수

```js
/**
 * @module lib/control/destructive-detector
 */

/**
 * 파괴적 작업 감지
 * @param {string} toolName - 'Write' | 'Edit' | 'Bash' 등
 * @param {string} toolInput - 명령 또는 파일 내용
 * @param {Object} [context={}]
 * @param {string} [context.filePath] - 대상 파일 경로
 * @param {number} [context.level] - 현재 자동화 레벨
 * @param {number} [context.fileCount] - 동시 변경 파일 수 (G-006)
 * @returns {DetectionResult}
 */
function detect(toolName, toolInput, context = {}) {}

/**
 * @typedef {Object} DetectionResult
 * @property {boolean} detected - 파괴적 작업이 감지되었는지
 * @property {string|null} ruleId - 매칭된 규칙 ID (e.g., 'G-001')
 * @property {string} severity - 'critical' | 'high' | 'medium' | 'low'
 * @property {'block' | 'gate' | 'warn' | 'log' | 'allow'} action - 취할 행동
 * @property {string} message - 사용자 표시 메시지
 * @property {string|null} matchedPattern - 매칭된 패턴 설명
 */

/**
 * 사용자 정의 규칙 추가
 * @param {DestructiveRule} rule
 */
function addCustomRule(rule) {}

/**
 * 전체 규칙 목록 조회
 * @returns {DestructiveRule[]}
 */
function getRules() {}

/**
 * 특정 규칙 비활성화 (세션 내)
 * @param {string} ruleId - 규칙 ID (e.g., 'G-003')
 * @param {string} reason - 비활성화 사유 (감사 로그 기록)
 */
function disableRule(ruleId, reason) {}
```

### 4.6 의존성

| 의존 모듈 | 용도 |
|-----------|------|
| `lib/control/automation-controller.js` | 현재 레벨 조회 |
| `lib/control/checkpoint-manager.js` | 감지 시 체크포인트 생성 |
| `lib/audit/audit-logger.js` | 감지 이벤트 기록 |
| `lib/control/trust-engine.js` | block 시 Trust Score 감점 |

---

## 5. Blast Radius 분석기

### 5.1 파일 경로

`lib/control/blast-radius.js`

### 5.2 6개 규칙 상세

| 규칙 ID | 설명 | 임계값 | 심각도 |
|---------|------|:------:|:------:|
| B-001 | 변경 파일 수 | >10 files: warn, >30: block | Medium→High |
| B-002 | 변경 LOC (추가+삭제) | >500 LOC: warn, >2000: block | Medium→High |
| B-003 | 영향 범위 (import 의존 트리) | >20 files affected: warn | Medium |
| B-004 | 핵심 파일 변경 | core/, config 파일 변경 시 가중치 2x | High |
| B-005 | 테스트 커버리지 영향 | 변경 파일에 대응 테스트 없으면 warn | Medium |
| B-006 | 공개 API 변경 | module.exports 변경 감지 | High |

### 5.3 변경 영향 범위 계산 알고리즘

```js
/**
 * Blast Radius 계산
 *
 * 알고리즘:
 * 1. 변경 대상 파일 목록 수집 (git diff --name-only 또는 직접 전달)
 * 2. 각 파일의 import/require 의존 트리 1-depth 역추적
 *    - require('./target') 또는 import ... from './target' 검색
 * 3. 가중치 계산:
 *    - 일반 파일: 1x
 *    - core/ 파일: 2x
 *    - config 파일: 2x
 *    - public export (module.exports 변경): 3x
 *    - test 파일: 0.5x
 * 4. Blast Radius Score = sum(파일별 가중치) + (영향 파일 수 * 0.5)
 * 5. 점수 → 등급:
 *    - 0-10: low (녹색)
 *    - 11-30: medium (노랑)
 *    - 31-60: high (주황)
 *    - 61+: critical (빨강)
 */

/**
 * @typedef {Object} BlastRadiusResult
 * @property {number} score - Blast Radius 점수
 * @property {'low' | 'medium' | 'high' | 'critical'} grade - 등급
 * @property {number} changedFiles - 직접 변경 파일 수
 * @property {number} affectedFiles - 간접 영향 파일 수
 * @property {number} totalLOC - 변경 LOC
 * @property {string[]} coreChanges - 핵심 파일 변경 목록
 * @property {string[]} apiChanges - 공개 API 변경 목록
 * @property {string[]} untested - 테스트 미커버 변경 파일
 * @property {Array<{ruleId: string, triggered: boolean, detail: string}>} ruleResults
 */
```

### 5.4 Export 함수

```js
/**
 * @module lib/control/blast-radius
 */

/**
 * Blast Radius 분석 실행
 * @param {string[]} changedFiles - 변경 파일 경로 목록
 * @param {Object} [options={}]
 * @param {boolean} [options.includeImportTree=true] - import 의존 트리 분석 포함
 * @param {boolean} [options.checkTestCoverage=true] - 테스트 커버리지 확인
 * @returns {BlastRadiusResult}
 */
function analyze(changedFiles, options = {}) {}

/**
 * Git diff 기반 Blast Radius 분석
 * @param {string} [ref='HEAD'] - 비교 기준 (기본 HEAD)
 * @returns {BlastRadiusResult}
 */
function analyzeFromGitDiff(ref = 'HEAD') {}

/**
 * 파일의 1-depth 역방향 의존성 조회
 * @param {string} filePath - 대상 파일
 * @returns {string[]} - 해당 파일을 import/require하는 파일 목록
 */
function getReverseDependencies(filePath) {}

/**
 * module.exports 변경 감지
 * @param {string} filePath - 대상 파일
 * @param {string} oldContent - 변경 전 내용
 * @param {string} newContent - 변경 후 내용
 * @returns {{ changed: boolean, added: string[], removed: string[], modified: string[] }}
 */
function detectExportChanges(filePath, oldContent, newContent) {}
```

### 5.5 의존성

| 의존 모듈 | 용도 |
|-----------|------|
| `child_process` (내장) | `git diff` 실행 |
| `fs`, `path` (내장) | 파일 읽기, import 분석 |
| `lib/core/file.js` | `isSourceFile()`, `isCodeFile()` 판별 |
| `lib/audit/audit-logger.js` | 분석 결과 기록 |

---

## 6. 체크포인트/롤백 매니저

### 6.1 파일 경로

`lib/control/checkpoint-manager.js`

### 6.2 CheckpointSchema 전체

```js
/**
 * @typedef {Object} Checkpoint
 * @property {string} id - 고유 ID: 'cp-{timestamp}-{type}-{seq}'
 * @property {string} type - 'auto' | 'manual' | 'phase_transition'
 * @property {string} createdAt - ISO 8601 타임스탬프
 * @property {string} feature - 관련 Feature 이름
 * @property {string} phase - 생성 시점 PDCA Phase
 * @property {number} automationLevel - 생성 시점 자동화 레벨
 * @property {string} reason - 생성 사유
 * @property {string|null} triggeredBy - 트리거 (hook event 이름 또는 command)
 *
 * @property {Object} metadata
 * @property {number} metadata.fileCount - 스냅샷 파일 수
 * @property {number} metadata.totalSizeBytes - 총 크기 (바이트)
 * @property {string} metadata.gitRef - 생성 시점 git HEAD SHA
 * @property {string} metadata.gitBranch - 생성 시점 git 브랜치
 * @property {string[]} metadata.changedSinceLastCheckpoint - 이전 체크포인트 이후 변경 파일
 *
 * @property {Object} pdcaSnapshot
 * @property {Object} pdcaSnapshot.status - pdca-status.json 스냅샷
 * @property {Object} pdcaSnapshot.controlState - control-state.json 스냅샷
 *
 * @property {Array<FileSnapshot>} files - 파일 스냅샷 목록
 */

/**
 * @typedef {Object} FileSnapshot
 * @property {string} path - 프로젝트 루트 기준 상대 경로
 * @property {string} hash - SHA-256 해시 (내용 검증용)
 * @property {number} size - 파일 크기 (바이트)
 * @property {string} content - 파일 내용 (Base64 인코딩, 바이너리 안전)
 * @property {string} mode - 파일 퍼미션 (e.g., '644')
 */
```

### 6.3 생성 시나리오

| 생성 유형 | 트리거 | 포함 파일 | 보존 정책 |
|-----------|--------|----------|----------|
| **auto** | PreToolUse hook에서 파괴적 작업 감지 시 | 변경 대상 파일 + 직접 의존 파일 | 최대 50개, FIFO |
| **manual** | `/checkpoint` 또는 `/pdca checkpoint` 명령 | 사용자 지정 또는 현재 Feature 관련 전체 | 최대 20개, 수동 삭제 |
| **phase_transition** | PDCA Phase 전환 시 (Plan→Design, Design→Do 등) | 해당 Phase 산출물 + pdca-status.json | **영구 보존** (Phase별 1개만) |

### 6.4 생성 플로우

```
[auto 체크포인트 — PreToolUse Hook]

PreToolUse 이벤트
    │
    ▼
destructive-detector.detect()
    │ detected === true
    ▼
checkpoint.autoCreateBeforeDestructive === true?
    │ yes
    ▼
createCheckpoint('auto', {
  reason: `Before destructive: ${ruleId}`,
  triggeredBy: 'PreToolUse',
  files: getAffectedFiles(toolInput)
})
    │
    ├── 파일 스냅샷 생성 (읽기 → Base64 인코딩 → SHA-256 해시)
    ├── pdca-status.json + control-state.json 스냅샷
    ├── git ref 기록
    ├── .bkit/checkpoints/cp-{timestamp}.json 저장
    ├── 보존 정책 실행 (50개 초과 시 가장 오래된 auto 삭제)
    └── 감사 로그 기록
```

```
[manual 체크포인트 — /checkpoint 명령]

/checkpoint [name] [--files pattern]
    │
    ▼
createCheckpoint('manual', {
  reason: name || 'Manual checkpoint',
  triggeredBy: '/checkpoint',
  files: resolveFilePattern(pattern) || getFeatureFiles(feature)
})
```

```
[phase_transition 체크포인트 — State Machine]

state-machine.transition(feature, nextPhase)
    │
    ▼
checkpoint.autoCreateOnPhaseTransition === true?
    │ yes
    ▼
createCheckpoint('phase_transition', {
  reason: `Phase: ${prevPhase} → ${nextPhase}`,
  triggeredBy: 'state-machine',
  files: getPhaseDeliverables(prevPhase, feature)
})
```

### 6.5 롤백 플로우

```
/pdca rollback [checkpoint-id]
    │
    ▼
┌── checkpoint-id 제공? ──┐
│ yes                     │ no
│ ▼                       │ ▼
│ loadCheckpoint(id)      │ listCheckpoints(feature)
│                         │ → AskUserQuestion으로
│                         │   체크포인트 선택 UI
│                         │   (최근 10개 표시)
│                         │ ▼
│                         │ 사용자 선택
└─────────┬───────────────┘
          │
          ▼
   검증 단계:
   ├── 체크포인트 존재 확인
   ├── 파일 해시 무결성 검증
   └── 현재 상태 auto 체크포인트 생성 (롤백 전 백업)
          │
          ▼
   파일 복원:
   ├── 각 FileSnapshot의 content → Base64 디코딩
   ├── 원래 path에 writeFileSync
   ├── 파일 퍼미션 복원 (mode)
   └── 삭제된 파일은 unlink 불가 (생성 전 경고)
          │
          ▼
   상태 복원:
   ├── pdca-status.json ← pdcaSnapshot.status
   ├── control-state.json ← pdcaSnapshot.controlState
   └── globalCache 무효화
          │
          ▼
   후처리:
   ├── 감사 로그: 'rollback_performed' 기록
   ├── Trust Score: 롤백 수행 기록 (경미 감점)
   └── 사용자 알림: 복원된 파일 목록 + 복원 시점 표시
```

### 6.6 보존 정책

```js
const RETENTION_POLICY = {
  auto: {
    maxCount: 50,            // 최대 50개
    evictionStrategy: 'fifo', // 가장 오래된 것부터 삭제
    // phase_transition은 영구 보존이므로 auto만 삭제
  },
  manual: {
    maxCount: 20,
    evictionStrategy: 'none', // 자동 삭제 안함, 사용자가 직접 삭제
  },
  phase_transition: {
    maxCount: Infinity,       // 영구 보존
    evictionStrategy: 'none',
    // 단, Feature별 Phase당 최신 1개만 유지
    // 같은 Phase 재실행 시 이전 것 교체
  },
  total: {
    maxSizeMB: 100,           // 전체 100MB 제한
    // 초과 시 가장 오래된 auto 체크포인트부터 삭제
    // phase_transition은 보존
  },
};
```

### 6.7 Export 함수

```js
/**
 * @module lib/control/checkpoint-manager
 */

/**
 * 체크포인트 생성
 * @param {'auto' | 'manual' | 'phase_transition'} type
 * @param {Object} options
 * @param {string} options.reason - 생성 사유
 * @param {string} [options.triggeredBy] - 트리거 소스
 * @param {string[]} [options.files] - 스냅샷 파일 경로 목록
 * @param {string} [options.feature] - Feature 이름
 * @param {string} [options.phase] - PDCA Phase
 * @returns {{ success: boolean, checkpointId: string, fileCount: number, sizeBytes: number }}
 */
function createCheckpoint(type, options = {}) {}

/**
 * 체크포인트로 롤백
 * @param {string} checkpointId
 * @param {Object} [options={}]
 * @param {boolean} [options.backupCurrent=true] - 롤백 전 현재 상태 백업
 * @param {boolean} [options.restoreState=true] - PDCA/Control 상태도 복원
 * @returns {{ success: boolean, restoredFiles: string[], errors: string[] }}
 */
function rollback(checkpointId, options = {}) {}

/**
 * 체크포인트 목록 조회
 * @param {Object} [filter={}]
 * @param {string} [filter.feature] - Feature 필터
 * @param {string} [filter.type] - 유형 필터
 * @param {number} [filter.limit=10] - 최대 조회 수
 * @returns {Array<{id: string, type: string, createdAt: string, reason: string, fileCount: number}>}
 */
function listCheckpoints(filter = {}) {}

/**
 * 체크포인트 상세 조회
 * @param {string} checkpointId
 * @returns {Checkpoint|null}
 */
function getCheckpoint(checkpointId) {}

/**
 * 체크포인트 삭제 (manual 전용)
 * @param {string} checkpointId
 * @returns {{ success: boolean }}
 */
function deleteCheckpoint(checkpointId) {}

/**
 * 보존 정책 실행 (자동)
 * @returns {{ deleted: string[], freedBytes: number }}
 */
function enforceRetentionPolicy() {}

/**
 * 체크포인트 무결성 검증
 * @param {string} checkpointId
 * @returns {{ valid: boolean, errors: string[] }}
 */
function verifyCheckpoint(checkpointId) {}
```

### 6.8 보안 고려사항

- **Base64 인코딩**: 파일 내용이 바이너리 안전. JSON 내 저장 가능
- **SHA-256 해시**: 복원 전 무결성 검증 필수. 해시 불일치 시 롤백 중단
- **롤백 전 백업**: 롤백 자체가 파괴적 작업이므로, 롤백 전 auto 체크포인트 생성
- **100MB 제한**: 대용량 바이너리 파일 포함 방지. 텍스트 파일만 스냅샷
- **.env 파일**: 체크포인트에 포함 시 보안 경고. 민감 정보 마스킹 옵션 제공

### 6.9 의존성

| 의존 모듈 | 용도 |
|-----------|------|
| `crypto` (내장) | SHA-256 해시 계산 |
| `fs`, `path` (내장) | 파일 읽기/쓰기 |
| `lib/core/state-store.js` | 원자적 파일 쓰기 |
| `lib/pdca/status.js` | PDCA 상태 스냅샷/복원 |
| `lib/audit/audit-logger.js` | 체크포인트/롤백 이벤트 기록 |

---

## 7. 무한 루프 방지기

### 7.1 파일 경로

`lib/control/loop-breaker.js`

### 7.2 4개 규칙 상세

| 규칙 ID | 카테고리 | 감지 조건 | 임계값 | 에스컬레이션 |
|---------|---------|----------|:------:|------------|
| LB-001 | PDCA Iteration | 동일 Feature의 Check→Act→Check 반복 | 5회 (config.loopBreaker.maxPdcaIterations) | 강제 Report 전환 또는 사용자 개입 |
| LB-002 | Same File Edit | 동일 파일에 대한 연속 Edit/Write 호출 | 10회 (config.loopBreaker.maxSameFileEdits) | 작업 일시 정지 + 사용자 확인 |
| LB-003 | Agent Recursion | Agent Team 내 동일 에이전트 재귀 호출 | 5회 (config.loopBreaker.maxAgentRecursionDepth) | 해당 Agent 호출 차단 |
| LB-004 | Error Retry | 동일 에러 반복 (같은 명령, 같은 에러 메시지) | 3회 (config.loopBreaker.maxErrorRetries) | 작업 중단 + 대안 제시 |

### 7.3 카운터 관리

```js
/**
 * 루프 카운터 (세션 내 메모리)
 * @type {Map<string, LoopCounter>}
 */
const _counters = new Map();

/**
 * @typedef {Object} LoopCounter
 * @property {string} ruleId - 규칙 ID
 * @property {string} key - 고유 키 (규칙별 다름)
 * @property {number} count - 현재 카운트
 * @property {number} threshold - 임계값
 * @property {string} firstOccurrence - 첫 발생 시각
 * @property {string} lastOccurrence - 최근 발생 시각
 * @property {boolean} escalated - 에스컬레이션 여부
 */

/**
 * 카운터 키 생성 규칙:
 *
 * LB-001: "pdca-iter:{feature}"
 *   → Feature별로 PDCA iteration 횟수 추적
 *
 * LB-002: "same-file:{filePath}"
 *   → 파일 경로별 연속 편집 횟수 추적
 *   → 다른 파일이 편집되면 카운터 리셋
 *
 * LB-003: "agent-recurse:{agentName}"
 *   → Agent 이름별 재귀 깊이 추적
 *   → Team 호출 시작 시 0으로 리셋
 *
 * LB-004: "error-retry:{commandHash}:{errorHash}"
 *   → 명령+에러 조합의 해시별 재시도 횟수
 *   → 명령이 성공하면 카운터 삭제
 */
```

### 7.4 에스컬레이션 로직

```js
/**
 * 루프 감지 및 에스컬레이션
 * @param {string} ruleId - 'LB-001' ~ 'LB-004'
 * @param {Object} context - 규칙별 컨텍스트
 * @returns {LoopCheckResult}
 */
function check(ruleId, context) {
  // 1. 카운터 키 생성
  // 2. 카운터 증가
  // 3. 임계값 도달 시:
  //    a. 감사 로그 기록
  //    b. Trust Score 감점 (반복 = 비효율)
  //    c. 에스컬레이션 행동 결정
  // 4. 결과 반환
}

/**
 * @typedef {Object} LoopCheckResult
 * @property {boolean} loopDetected - 루프 감지 여부
 * @property {number} currentCount - 현재 카운트
 * @property {number} threshold - 임계값
 * @property {'continue' | 'warn' | 'pause' | 'abort'} action
 * @property {string|null} escalationMessage - 에스컬레이션 메시지
 * @property {string[]} suggestions - 대안 제시
 */
```

에스컬레이션 행동 매트릭스:

| 규칙 | 50% 임계값 | 100% 임계값 | 초과 |
|------|:----------:|:----------:|:----:|
| LB-001 (PDCA Iter) | warn | pause (Report 전환 제안) | abort (강제 Report) |
| LB-002 (Same File) | warn | pause (사용자 확인) | abort (파일 잠금) |
| LB-003 (Agent Recurse) | warn | abort (Agent 차단) | - |
| LB-004 (Error Retry) | warn | abort (대안 제시) | - |

### 7.5 Export 함수

```js
/**
 * @module lib/control/loop-breaker
 */

/**
 * 루프 감지 체크
 * @param {string} ruleId - 'LB-001' | 'LB-002' | 'LB-003' | 'LB-004'
 * @param {Object} context
 * @returns {LoopCheckResult}
 */
function check(ruleId, context) {}

/**
 * 카운터 리셋 (성공 시)
 * @param {string} ruleId
 * @param {string} key - 카운터 키
 */
function resetCounter(ruleId, key) {}

/**
 * 특정 규칙의 카운터 전체 리셋
 * @param {string} ruleId
 */
function resetRule(ruleId) {}

/**
 * 모든 카운터 리셋 (세션 시작 시)
 */
function resetAll() {}

/**
 * 현재 카운터 상태 조회 (디버깅/UI용)
 * @returns {Object} { ruleId: { key: LoopCounter } }
 */
function getCounterState() {}

/**
 * 임계값 동적 변경
 * @param {string} ruleId
 * @param {number} newThreshold
 */
function setThreshold(ruleId, newThreshold) {}
```

### 7.6 의존성

| 의존 모듈 | 용도 |
|-----------|------|
| `crypto` (내장) | 에러/명령 해시 (LB-004) |
| `lib/core/config.js` | `getConfig('automation.loopBreaker.*')` |
| `lib/audit/audit-logger.js` | 루프 감지 이벤트 기록 |
| `lib/control/trust-engine.js` | 반복 시 Trust Score 감점 |

---

## 8. Decision Trace

### 8.1 파일 경로

`lib/audit/decision-tracer.js`

### 8.2 DecisionTrace 전체 스키마

```js
/**
 * @typedef {Object} DecisionTrace
 * @property {string} id - 고유 ID: 'dt-{timestamp}-{seq}'
 * @property {string} timestamp - ISO 8601
 * @property {string} feature - 관련 Feature
 * @property {string} phase - PDCA Phase
 * @property {number} automationLevel - 당시 자동화 레벨
 *
 * @property {Object} context - 결정 컨텍스트
 * @property {string} context.hook - 트리거 Hook 이벤트 (e.g., 'PostToolUse', 'PreToolUse')
 * @property {string} context.toolName - 사용된 도구
 * @property {string} context.toolInput - 도구 입력 (truncated)
 * @property {string} [context.agentName] - Agent 이름 (Team 모드)
 * @property {string} [context.parentDecisionId] - 상위 결정 ID (계층 추적)
 *
 * @property {Object} decision - 결정 내용
 * @property {string} decision.type - 결정 유형 (아래 목록 참조)
 * @property {string} decision.action - 취한 행동 ('approve'|'deny'|'modify'|'auto'|'escalate')
 * @property {string} decision.target - 대상 (파일 경로, 명령, Phase 이름 등)
 *
 * @property {Object} reasoning - 결정 근거
 * @property {string} reasoning.rule - 적용된 규칙 (e.g., 'G-001', 'LB-002', 'permission:L2:Bash')
 * @property {string} reasoning.explanation - 자연어 설명
 * @property {string[]} [reasoning.alternatives] - 고려된 대안
 * @property {Object} [reasoning.metrics] - 판단 근거 메트릭 (matchRate, trustScore 등)
 *
 * @property {Object} impact - 영향
 * @property {string[]} impact.filesAffected - 영향받은 파일
 * @property {number} [impact.blastRadius] - Blast Radius 점수
 * @property {string} [impact.trustScoreChange] - Trust Score 변화 (e.g., '+1', '-5')
 * @property {string} [impact.levelChange] - 레벨 변화 (e.g., 'L2→L3')
 *
 * @property {Object} [userInteraction] - 사용자 상호작용 (gate 시)
 * @property {string} userInteraction.question - 물어본 질문
 * @property {string} userInteraction.response - 사용자 응답
 * @property {number} userInteraction.responseTimeMs - 응답 시간
 */
```

### 8.3 Decision Types 전체 목록

| Type | 설명 | 주요 Hook |
|------|------|----------|
| `phase_transition` | PDCA Phase 전환 결정 | PostToolUse |
| `permission_check` | 도구 퍼미션 체크 | PreToolUse |
| `destructive_block` | 파괴적 작업 차단 | PreToolUse |
| `checkpoint_create` | 체크포인트 생성 | PreToolUse, Phase 전환 |
| `rollback_execute` | 롤백 실행 | 사용자 명령 |
| `loop_detection` | 루프 감지 및 조치 | PostToolUse |
| `trust_change` | Trust Score 변경 | PostToolUse, 피드백 |
| `level_change` | 자동화 레벨 변경 | Trust 변경 후 |
| `quality_gate` | 품질 게이트 통과/실패 | Check Phase |
| `emergency_stop` | 비상 중지 | 사용자 명령 |
| `error_recovery` | 에러 복구 결정 | StopFailure |
| `plan_preview` | Plan Preview 생성/승인 | Phase 시작 전 |
| `blast_radius` | Blast Radius 분석 결과 | Do Phase |
| `auto_advance` | 자동 Phase 진행 결정 | PostToolUse |
| `agent_delegation` | Agent Team 작업 위임 | Team 호출 |

### 8.4 PostToolUse Hook 통합 방안

```js
/**
 * PostToolUse hook에서 Decision Trace 기록
 *
 * hooks.json에서 PostToolUse 이벤트 핸들러 내부:
 *
 * 1. Hook 입력에서 toolName, toolInput, output 추출
 * 2. 중요 결정인지 판단 (필터링):
 *    - 모든 Write/Edit → 기록
 *    - Bash 명령 → 기록
 *    - 단순 Read → 기록 안함 (노이즈 방지)
 * 3. DecisionTrace 생성 + JSONL 추가
 *
 * 필터링 규칙:
 *   - toolName === 'Read' && context.phase !== 'check' → SKIP
 *   - toolName === 'Glob' || toolName === 'Grep' → SKIP
 *   - 나머지 → RECORD
 */

// hooks/post-tool-use.js 내부 (의사코드)
function handlePostToolUse(hookInput) {
  const { toolName, toolInput, output } = hookInput;

  // Decision Trace 기록 (필터링 후)
  if (shouldTraceDecision(toolName)) {
    const tracer = require('../lib/audit/decision-tracer');
    tracer.record({
      context: { hook: 'PostToolUse', toolName, toolInput: truncate(toolInput, 200) },
      decision: { type: inferDecisionType(toolName, toolInput), action: 'auto', target: extractTarget(toolInput) },
      reasoning: { rule: 'auto-execution', explanation: `L${level} auto-approved ${toolName}` },
      impact: { filesAffected: extractFiles(toolInput, output) }
    });
  }
}
```

### 8.5 저장 형식

저장 경로: `.bkit/decisions/YYYY-MM-DD.jsonl`

각 줄이 하나의 JSON 객체 (JSONL = JSON Lines):

```jsonl
{"id":"dt-1710820800000-001","timestamp":"2026-03-19T10:00:00.000Z","feature":"bkit-v200","phase":"do","automationLevel":2,"context":{"hook":"PreToolUse","toolName":"Bash","toolInput":"rm -rf dist/"},"decision":{"type":"destructive_block","action":"deny","target":"dist/"},"reasoning":{"rule":"G-001","explanation":"Recursive force deletion detected at L2","alternatives":["rm -r dist/ (with confirmation)","git clean -fd"]},"impact":{"filesAffected":["dist/"],"trustScoreChange":"-3"}}
```

### 8.6 Export 함수

```js
/**
 * @module lib/audit/decision-tracer
 */

/**
 * 의사결정 기록
 * @param {Object} trace - DecisionTrace의 context, decision, reasoning, impact 부분
 * @returns {{ id: string, recorded: boolean }}
 */
function record(trace) {}

/**
 * 최근 의사결정 조회
 * @param {Object} [filter={}]
 * @param {string} [filter.feature] - Feature 필터
 * @param {string} [filter.type] - Decision Type 필터
 * @param {string} [filter.date] - 날짜 (YYYY-MM-DD)
 * @param {number} [filter.limit=20] - 최대 조회 수
 * @returns {DecisionTrace[]}
 */
function query(filter = {}) {}

/**
 * 특정 결정의 전체 추적 체인 조회 (parentDecisionId 역추적)
 * @param {string} decisionId
 * @returns {DecisionTrace[]}
 */
function getDecisionChain(decisionId) {}

/**
 * 일별 의사결정 요약 생성
 * @param {string} date - YYYY-MM-DD
 * @returns {{ total: number, byType: Object, byAction: Object, keyDecisions: DecisionTrace[] }}
 */
function generateDailySummary(date) {}

/**
 * 의사결정 기록 여부 판단 (필터링)
 * @param {string} toolName
 * @param {string} [phase]
 * @returns {boolean}
 */
function shouldTraceDecision(toolName, phase) {}
```

### 8.7 의존성

| 의존 모듈 | 용도 |
|-----------|------|
| `fs`, `path` (내장) | JSONL 파일 읽기/쓰기 |
| `lib/core/state-store.js` | 원자적 쓰기 (append) |
| `lib/control/automation-controller.js` | 현재 레벨 조회 |
| `lib/pdca/status.js` | 현재 Feature/Phase 조회 |

---

## 9. 감사 로그

### 9.1 파일 경로

`lib/audit/audit-logger.js`

### 9.2 AuditLogEntry 전체 스키마

```js
/**
 * @typedef {Object} AuditLogEntry
 *
 * === 식별 (4 필드) ===
 * @property {string} id - 고유 ID: 'al-{timestamp}-{seq}'
 * @property {string} timestamp - ISO 8601
 * @property {string} sessionId - CC 세션 ID (process.env.SESSION_ID 또는 생성)
 * @property {number} sequenceNumber - 세션 내 순차 번호
 *
 * === 행위자 (3 필드) ===
 * @property {'system' | 'user' | 'agent' | 'hook' | 'trust'} actor - 행위 주체 유형
 * @property {string} actorName - 행위자 이름 (e.g., 'cto-lead', 'user', 'PreToolUse')
 * @property {string|null} agentTeam - Agent Team 이름 (Team 모드 시)
 *
 * === 행동 (5 필드) ===
 * @property {string} action - Action Type (아래 목록 참조)
 * @property {string} category - 카테고리 ('control'|'permission'|'checkpoint'|'pdca'|'trust'|'system'|'error')
 * @property {string} severity - 'critical' | 'high' | 'medium' | 'low' | 'info'
 * @property {string} description - 자연어 설명
 * @property {Object} [details] - 행동 상세 (자유 형식)
 *
 * === 대상 (4 필드) ===
 * @property {string|null} targetType - 'file' | 'command' | 'phase' | 'feature' | 'config' | 'level'
 * @property {string|null} targetName - 대상 이름/경로
 * @property {string|null} feature - 관련 Feature
 * @property {string|null} phase - 관련 PDCA Phase
 *
 * === 컨텍스트 (5 필드) ===
 * @property {number} automationLevel - 당시 자동화 레벨 (0-4)
 * @property {number} trustScore - 당시 Trust Score (0-100)
 * @property {string|null} hookEvent - 트리거 Hook 이벤트
 * @property {string|null} decisionTraceId - 연결된 Decision Trace ID
 * @property {string|null} checkpointId - 연결된 Checkpoint ID
 *
 * === 결과 (4 필드) ===
 * @property {'success' | 'failure' | 'blocked' | 'pending' | 'skipped'} outcome - 결과
 * @property {string|null} errorCode - 에러 코드 (BkitError.code)
 * @property {string|null} errorMessage - 에러 메시지
 * @property {number|null} durationMs - 소요 시간 (밀리초)
 */
```

**총 25개 필드**

### 9.3 Action Types 전체 목록

```js
/**
 * 감사 로그 Action Types (16개)
 */
const ACTION_TYPES = {
  // Control (5)
  LEVEL_CHANGE:       'level_change',        // 자동화 레벨 변경
  EMERGENCY_STOP:     'emergency_stop',       // 비상 중지
  EMERGENCY_RESUME:   'emergency_resume',     // 비상 중지 해제
  RULE_DISABLED:      'rule_disabled',        // 규칙 비활성화
  RULE_ENABLED:       'rule_enabled',         // 규칙 재활성화

  // Permission (3)
  PERMISSION_DENIED:  'permission_denied',    // 퍼미션 거부
  PERMISSION_GATED:   'permission_gated',     // 사용자 승인 요청
  PERMISSION_ALLOWED: 'permission_allowed',   // 자동 허용 (L2+ 중요 작업만)

  // Checkpoint (3)
  CHECKPOINT_CREATED: 'checkpoint_created',   // 체크포인트 생성
  ROLLBACK_PERFORMED: 'rollback_performed',   // 롤백 실행
  CHECKPOINT_DELETED: 'checkpoint_deleted',   // 체크포인트 삭제

  // PDCA (2)
  PHASE_TRANSITION:   'phase_transition',     // Phase 전환
  QUALITY_GATE:       'quality_gate',         // 품질 게이트 결과

  // Trust (2)
  TRUST_CHANGED:      'trust_changed',        // Trust Score 변경
  TRUST_ESCALATION:   'trust_escalation',     // 레벨 에스컬레이션/다운그레이드

  // System (1)
  LOOP_DETECTED:      'loop_detected',        // 무한 루프 감지
};
```

### 9.4 보존 정책

```js
const AUDIT_RETENTION = {
  // 원본 JSONL 보존
  rawRetentionDays: 30,           // 30일 후 자동 삭제

  // 일별 최대 크기
  maxDailySizeMB: 10,             // 10MB/일 제한
  // 초과 시 severity='info' 로그부터 truncate

  // 총 저장 용량
  maxTotalSizeMB: 100,            // 총 100MB

  // 요약 보존
  dailySummaryRetentionDays: 90,  // 일별 요약 90일
  weeklySummaryRetentionDays: 365, // 주별 요약 1년

  // 자동 정리 실행 시점
  cleanupTrigger: 'session_start', // 세션 시작 시 1회 실행
};
```

### 9.5 요약 생성

```js
/**
 * 일별 요약 스키마
 * 저장: .bkit/audit/summary/daily-YYYY-MM-DD.json
 */
const dailySummary = {
  date: '2026-03-19',
  totalEntries: 145,
  byCategory: {
    control: 12,
    permission: 58,
    checkpoint: 8,
    pdca: 15,
    trust: 7,
    system: 3,
    error: 2
  },
  bySeverity: {
    critical: 1,
    high: 5,
    medium: 23,
    low: 48,
    info: 68
  },
  byOutcome: {
    success: 120,
    blocked: 8,
    failure: 2,
    pending: 5,
    skipped: 10
  },
  keyEvents: [
    // severity critical/high만 포함 (최대 20개)
  ],
  trustScoreHistory: [
    // { time, score, change, reason }
  ],
  levelHistory: [
    // { time, from, to, reason }
  ]
};

/**
 * 주별 요약 스키마
 * 저장: .bkit/audit/summary/weekly-YYYY-WNN.json
 */
const weeklySummary = {
  week: '2026-W12',
  dateRange: { from: '2026-03-16', to: '2026-03-22' },
  totalEntries: 892,
  dailyBreakdown: [/* 7일간 일별 요약 */],
  trends: {
    avgTrustScore: 72,
    levelDistribution: { L0: 0, L1: 5, L2: 80, L3: 15, L4: 0 },
    topBlockedActions: [/* 가장 많이 차단된 작업 */],
    topFeatures: [/* 가장 활발한 Feature */]
  }
};
```

### 9.6 Export 함수

```js
/**
 * @module lib/audit/audit-logger
 */

/**
 * 감사 로그 기록
 * @param {Object} entry - AuditLogEntry의 action, category, severity, description 등
 * @returns {{ id: string, recorded: boolean }}
 */
function log(entry) {}

/**
 * 편의 함수: 특정 카테고리 로그
 * @param {string} action - Action Type
 * @param {Object} details - 상세
 * @param {Object} [context] - 추가 컨텍스트
 */
function logControl(action, details, context) {}
function logPermission(action, details, context) {}
function logCheckpoint(action, details, context) {}
function logPdca(action, details, context) {}
function logTrust(action, details, context) {}
function logSystem(action, details, context) {}

/**
 * 감사 로그 조회
 * @param {Object} [filter={}]
 * @param {string} [filter.date] - 날짜
 * @param {string} [filter.category] - 카테고리
 * @param {string} [filter.severity] - 최소 심각도
 * @param {string} [filter.feature] - Feature
 * @param {number} [filter.limit=50] - 최대 조회 수
 * @returns {AuditLogEntry[]}
 */
function query(filter = {}) {}

/**
 * 일별 요약 생성 (수동/자동)
 * @param {string} [date] - YYYY-MM-DD (미지정 시 오늘)
 * @returns {Object} daily summary
 */
function generateDailySummary(date) {}

/**
 * 주별 요약 생성
 * @param {string} [week] - YYYY-WNN (미지정 시 이번 주)
 * @returns {Object} weekly summary
 */
function generateWeeklySummary(week) {}

/**
 * 보존 정책 실행 (오래된 로그 삭제)
 * @returns {{ deletedFiles: string[], freedMB: number }}
 */
function enforceRetention() {}

/**
 * 현재 세션의 감사 통계
 * @returns {{ totalEntries: number, byCategory: Object, bySeverity: Object }}
 */
function getSessionStats() {}
```

### 9.7 의존성

| 의존 모듈 | 용도 |
|-----------|------|
| `fs`, `path` (내장) | JSONL 파일 읽기/쓰기 |
| `lib/core/state-store.js` | 원자적 append 쓰기 |
| `lib/control/automation-controller.js` | 현재 레벨/Trust Score 조회 |
| `lib/pdca/status.js` | 현재 Feature/Phase 조회 |

---

## 10. Plan Preview

### 10.1 기능 개요

Plan Preview는 AI가 실행하려는 작업 계획을 사용자에게 미리 보여주고 승인을 받는 메커니즘.

### 10.2 레벨별 동작

| 레벨 | 동작 | 구현 |
|:----:|------|------|
| L0, L1 | **항상** 미리보기 표시 후 승인 대기 | `AskUserQuestion` with preview |
| L2 | **요청 시만** (`/preview` 명령으로 다음 작업 미리보기) | 자동 실행, 요청 시 중단 후 preview |
| L3 | **고위험 작업만** (destructive-detector 감지 시) | severity=critical/high 시 preview |
| L4 | **표시하지 않음** | 자동 실행 (Decision Trace에만 기록) |

### 10.3 미리보기 생성 → 승인 플로우

```
Phase 전환 또는 도구 실행 직전
    │
    ▼
shouldShowPreview(level, action, context)?
    │
    ├── false → 자동 실행, Decision Trace에 기록
    │
    ├── true
    │   │
    │   ▼
    │   generatePreview(action, context)
    │   │
    │   ├── Phase 전환 Preview:
    │   │   - 다음 Phase 설명
    │   │   - 예상 산출물 목록
    │   │   - 예상 소요 시간
    │   │   - 영향 범위 (Blast Radius 요약)
    │   │   - 필요한 입력/전제 조건
    │   │
    │   ├── 도구 실행 Preview:
    │   │   - 실행할 명령/작업 설명
    │   │   - 영향받는 파일 목록
    │   │   - 감지된 위험 (destructive rules)
    │   │   - 대안 제시
    │   │
    │   ▼
    │   formatAskUserQuestion({
    │     question: preview.summary,
    │     options: [
    │       { label: 'Approve', description: '계획대로 진행' },
    │       { label: 'Modify', description: '계획 수정 후 진행' },
    │       { label: 'Cancel', description: '이 작업 건너뛰기' }
    │     ]
    │   })
    │   │
    │   ▼
    │   사용자 응답:
    │   ├── Approve → 실행 + Decision Trace('plan_preview', 'approve')
    │   ├── Modify → 수정 내용 반영 후 재생성
    │   └── Cancel → 건너뛰기 + Decision Trace('plan_preview', 'deny')
    │
    └── 모든 경로에서 감사 로그 기록
```

### 10.4 구현 위치

Plan Preview는 독립 모듈이 아닌 `automation-controller.js`의 `resolveAction()` 내부에 통합:

```js
// automation-controller.js 내부
function resolveAction(action, context = {}) {
  const level = getCurrentLevel();
  const config = getConfig('automation.planPreview', {});

  // Plan Preview 표시 여부 결정
  if (config.alwaysShow?.includes(level)) {
    return 'gate';  // 항상 사용자 승인 (preview 포함)
  }

  if (config.showHighRiskOnly?.includes(level)) {
    // 파괴적 작업 감지 시에만 gate
    const detection = destructiveDetector.detect(context.toolName, context.toolInput, context);
    if (detection.detected && ['critical', 'high'].includes(detection.severity)) {
      return 'gate';
    }
    return 'auto';
  }

  if (config.neverShow?.includes(level)) {
    return 'auto';  // Decision Trace에만 기록
  }

  // showOnRequest: 기본 auto, /preview 호출 시 gate
  return 'auto';
}
```

### 10.5 기존 코드 연동

| 기존 모듈 | 연동 방안 |
|-----------|----------|
| `lib/pdca/automation.js` → `formatAskUserQuestion()` | Plan Preview의 사용자 질문 생성에 재사용 |
| `lib/pdca/automation.js` → `buildNextActionQuestion()` | Phase 전환 Preview에서 AskUserQuestion options 구성 |
| PreToolUse Hook | `resolveAction()` 결과에 따라 `outputBlock()` 또는 `outputAllow()` |

---

## 11. Trust Score 엔진

### 11.1 파일 경로

`lib/control/trust-engine.js`

### 11.2 TrustProfile 전체 스키마

```js
/**
 * @typedef {Object} TrustProfile
 * @property {number} score - 종합 Trust Score (0-100)
 * @property {string} updatedAt - 최종 업데이트 시각
 *
 * @property {Object} components - 5개 구성 요소
 * @property {number} components.approvalRate - 승인율 점수 (0-100)
 *   가중치 0.30 — 사용자가 AI 제안을 승인한 비율
 * @property {number} components.taskCompletion - 작업 완료율 점수 (0-100)
 *   가중치 0.25 — PDCA 사이클 성공 완주율
 * @property {number} components.errorRate - 에러 역산 점수 (0-100, 높을수록 에러 적음)
 *   가중치 0.20 — 에러/롤백이 적을수록 높음
 * @property {number} components.destructiveViolations - 위반 역산 점수 (0-100, 높을수록 위반 적음)
 *   가중치 0.15 — 파괴적 작업 차단/롤백이 적을수록 높음
 * @property {number} components.sessionStability - 세션 안정성 점수 (0-100)
 *   가중치 0.10 — 세션 비정상 종료, StopFailure 빈도
 *
 * @property {Object} weights - 가중치 (합 = 1.0)
 * @property {number} weights.approvalRate - 0.30
 * @property {number} weights.taskCompletion - 0.25
 * @property {number} weights.errorRate - 0.20
 * @property {number} weights.destructiveViolations - 0.15
 * @property {number} weights.sessionStability - 0.10
 *
 * @property {Object} stats - 통계
 * @property {number} stats.totalApprovals - 총 승인 수
 * @property {number} stats.totalRejections - 총 거부 수
 * @property {number} stats.totalModifications - 총 수정 수
 * @property {number} stats.pdcaCyclesCompleted - 완료 PDCA 사이클 수
 * @property {number} stats.pdcaCyclesFailed - 실패 PDCA 사이클 수
 * @property {number} stats.errorsEncountered - 에러 발생 수
 * @property {number} stats.rollbacksPerformed - 롤백 수
 * @property {number} stats.destructiveBlocked - 파괴적 차단 수
 * @property {number} stats.sessionCrashes - 세션 비정상 종료 수
 *
 * @property {Array<{timestamp: string, oldScore: number, newScore: number, reason: string}>} history
 *   최근 50개 변경 이력
 */
```

### 11.3 점수 증감 규칙

**증가 규칙 (5개)**

| # | 이벤트 | 점수 변화 | 적용 컴포넌트 | 조건 |
|---|--------|:---------:|:------------:|------|
| T+ 1 | 사용자 승인 (approve) | +1 | approvalRate | gate 결과 approve |
| T+ 2 | PDCA 사이클 성공 완주 | +5 | taskCompletion | matchRate >= 90%, Report 생성 |
| T+ 3 | 연속 3회 에러 없는 작업 | +2 | errorRate | 3회 연속 성공 |
| T+ 4 | 고위험 작업 성공 (사용자 승인 후) | +3 | destructiveViolations | gate → approve → 성공 |
| T+ 5 | 안정적 세션 종료 | +1 | sessionStability | SessionEnd 정상 도달 |

**감소 규칙 (7개)**

| # | 이벤트 | 점수 변화 | 적용 컴포넌트 | 조건 |
|---|--------|:---------:|:------------:|------|
| T- 1 | 사용자 거부 (reject) | -3 | approvalRate | gate 결과 reject |
| T- 2 | 사용자 수정 (modify) | -1 | approvalRate | gate 결과 modify |
| T- 3 | 롤백 수행 | -5 | errorRate | rollback 실행 |
| T- 4 | 파괴적 작업 차단 | -5 | destructiveViolations | destructive-detector block |
| T- 5 | 무한 루프 감지 | -3 | errorRate | loop-breaker escalation |
| T- 6 | StopFailure/세션 비정상 종료 | -10 | sessionStability | StopFailure hook 발생 |
| T- 7 | PDCA 사이클 실패 (maxIterations 도달) | -3 | taskCompletion | maxIterations 도달 후 matchRate < 90% |

### 11.4 종합 점수 계산

```js
/**
 * Trust Score 계산
 *
 * score = Σ(component_i * weight_i)
 *
 * 각 component는 0-100 범위로 정규화:
 *   approvalRate = (approvals / (approvals + rejections + modifications)) * 100
 *                  (최소 10회 이상이어야 의미 있음, 미달 시 70 기본)
 *
 *   taskCompletion = (completed / (completed + failed)) * 100
 *                    (최소 3회 이상, 미달 시 60 기본)
 *
 *   errorRate = max(0, 100 - (errors * 5))
 *               (에러 1건당 -5, 최소 0)
 *
 *   destructiveViolations = max(0, 100 - (blocked * 10))
 *                           (차단 1건당 -10, 최소 0)
 *
 *   sessionStability = max(0, 100 - (crashes * 20))
 *                      (비정상 종료 1건당 -20, 최소 0)
 */
function calculateScore(profile) {
  const c = profile.components;
  const w = profile.weights;

  return Math.round(
    c.approvalRate * w.approvalRate +
    c.taskCompletion * w.taskCompletion +
    c.errorRate * w.errorRate +
    c.destructiveViolations * w.destructiveViolations +
    c.sessionStability * w.sessionStability
  );
}
```

### 11.5 레벨 전환 임계값

```js
/**
 * Trust Score → 자동화 레벨 매핑
 *
 * 에스컬레이션 (상승):
 *   score >= autoMinTrustScore (70)   → L2 → L3 가능
 *   score >= fullAutoMinTrustScore (85) → L3 → L4 가능
 *
 * 다운그레이드 (하락):
 *   score < 50  → 현재 레벨에서 1단계 다운그레이드
 *   score < 30  → 즉시 L1로 다운그레이드
 *   score < 10  → 즉시 L0로 다운그레이드
 *
 * 안전 규칙:
 *   1. 에스컬레이션 후 쿨다운 30분 (연속 에스컬레이션 방지)
 *   2. 다운그레이드는 즉시 (유예 없음, 안전 우선)
 *   3. L4는 사용자 명시 확인 없이 자동 진입 불가
 *      (score >= 85이더라도 AskUserQuestion으로 확인)
 *   4. 에스컬레이션은 최대 1단계씩 (L1→L3 불가)
 *   5. 세션 시작 시 score는 이전 세션 값 유지 (리셋 안함)
 *      단, resetLevelOnSessionStart === true면 레벨만 리셋
 */

const ESCALATION_THRESHOLDS = {
  L0_to_L1: { minScore: 20, cooldown: 0 },       // L0은 항상 L1로 올릴 수 있음
  L1_to_L2: { minScore: 50, cooldown: 1800000 },  // 30분
  L2_to_L3: { minScore: 70, cooldown: 1800000 },  // 30분
  L3_to_L4: { minScore: 85, cooldown: 1800000, requireUserConfirm: true },
};

const DOWNGRADE_THRESHOLDS = {
  immediate_to_L0: { maxScore: 10 },
  immediate_to_L1: { maxScore: 30 },
  one_step_down:   { maxScore: 50 },
};
```

### 11.6 자동 에스컬레이션/다운그레이드 로직

```
Trust Score 변경 이벤트
    │
    ▼
evaluateLevel(newScore, currentLevel)
    │
    ├── newScore < 10 → 즉시 L0 + emergencyStop(auto)
    │
    ├── newScore < 30 → 즉시 L1 + 감사 로그
    │
    ├── newScore < 50 → currentLevel - 1 (하한 L1) + 감사 로그
    │
    ├── newScore >= ESCALATION_THRESHOLDS[next].minScore
    │   ├── 쿨다운 확인 (30분)
    │   ├── L3→L4: AskUserQuestion 확인 필요
    │   ├── 통과 시: currentLevel + 1 + 감사 로그
    │   └── 미통과: 유지
    │
    └── 변화 없음 → 유지
    │
    ▼
levelChange 발생 시:
    ├── control-state.json 업데이트
    ├── 감사 로그 (TRUST_ESCALATION)
    ├── Decision Trace 기록
    └── 사용자 알림 (레벨 변경 안내)
```

### 11.7 Export 함수

```js
/**
 * @module lib/control/trust-engine
 */

/**
 * 현재 Trust Score 조회
 * @returns {number} 0-100
 */
function getScore() {}

/**
 * 전체 Trust Profile 조회
 * @returns {TrustProfile}
 */
function getProfile() {}

/**
 * Trust Score 증가 이벤트 기록
 * @param {string} event - 이벤트 식별자 (e.g., 'approve', 'pdca_complete')
 * @param {Object} [context] - 이벤트 컨텍스트
 * @returns {{ oldScore: number, newScore: number, levelChanged: boolean, newLevel?: number }}
 */
function recordPositive(event, context = {}) {}

/**
 * Trust Score 감소 이벤트 기록
 * @param {string} event - 이벤트 식별자 (e.g., 'reject', 'rollback')
 * @param {Object} [context] - 이벤트 컨텍스트
 * @returns {{ oldScore: number, newScore: number, levelChanged: boolean, newLevel?: number }}
 */
function recordNegative(event, context = {}) {}

/**
 * 레벨 전환 평가 (Score 변경 후 자동 호출)
 * @param {number} currentScore
 * @param {number} currentLevel
 * @returns {{ shouldChange: boolean, suggestedLevel: number, reason: string, requiresConfirm: boolean }}
 */
function evaluateLevel(currentScore, currentLevel) {}

/**
 * Trust Score 수동 리셋 (관리용)
 * @param {number} [initialScore=60] - 초기값
 * @param {string} reason - 리셋 사유
 */
function resetScore(initialScore = 60, reason) {}

/**
 * Trust Profile 저장 경로
 * ${CLAUDE_PLUGIN_DATA}/trust-profile.json (영구)
 * .bkit/runtime/trust-profile.json (프로젝트별 캐시)
 */
function saveTrustProfile() {}
function loadTrustProfile() {}
```

### 11.8 Trust Profile 영구 저장

Trust Profile은 세션 간 유지가 핵심:

```
저장 우선순위:
1. ${CLAUDE_PLUGIN_DATA}/trust-profile.json  — CC가 제공하는 영구 스토리지 (ENH-119)
2. .bkit/runtime/trust-profile.json          — 프로젝트 로컬 폴백

로딩 순서:
1. PLUGIN_DATA에서 로딩 시도
2. 실패 시 프로젝트 로컬에서 로딩
3. 둘 다 없으면 초기 프로파일 생성 (score: 60, L2 기본)

저장 트리거:
- Trust Score 변경 시마다 즉시 저장 (양쪽 모두)
```

### 11.9 의존성

| 의존 모듈 | 용도 |
|-----------|------|
| `lib/control/automation-controller.js` | `setLevel()`, `getCurrentLevel()` |
| `lib/audit/audit-logger.js` | Trust 변경 이벤트 기록 |
| `lib/audit/decision-tracer.js` | 레벨 변경 Decision Trace |
| `lib/core/paths.js` | `${CLAUDE_PLUGIN_DATA}` 경로 |

---

## 12. 사용자 피드백 학습

### 12.1 파일 경로

`lib/control/feedback-learner.js`

### 12.2 피드백 수집 대상

| 피드백 소스 | 수집 방법 | 데이터 |
|------------|----------|--------|
| AskUserQuestion 승인 | Hook output 파싱 | (approve, 대상 작업, 응답 시간) |
| AskUserQuestion 거부 | Hook output 파싱 | (reject, 대상 작업, 거부 사유) |
| AskUserQuestion 수정 | Hook output 파싱 | (modify, 원본, 수정 내용) |
| `/control level` 명시 변경 | 명령 감지 | (explicit_level, from, to) |
| 롤백 실행 | checkpoint-manager 이벤트 | (rollback, 대상 체크포인트, 사유) |
| 직접 피드백 | `/feedback` 명령 (선택) | (text, sentiment) |

### 12.3 패턴 분석

```js
/**
 * 피드백 패턴 분석
 *
 * 수집된 피드백에서 패턴 추출:
 *
 * 1. 거부 패턴 클러스터링:
 *    - 특정 도구에서 반복 거부 → 해당 도구 퍼미션 하향 제안
 *    - 특정 Phase에서 반복 거부 → 해당 Phase gate 추가 제안
 *    - 특정 파일 패턴 거부 → 파일별 퍼미션 규칙 제안
 *
 * 2. 승인 패턴 클러스터링:
 *    - 특정 도구에서 항상 승인 → 해당 도구 auto 승격 제안
 *    - 빠른 응답 (< 2초) → 사용자가 확인 불필요하다고 판단
 *
 * 3. 수정 패턴 분석:
 *    - 수정 빈도 높은 작업 유형 → AI 제안 품질 개선 필요 영역
 *
 * 패턴 임계값:
 *   - 최소 5회 동일 패턴 → 유의미 판단
 *   - 80% 이상 동일 반응 → 강한 패턴
 *   - 50-79% 동일 반응 → 약한 패턴
 */

/**
 * @typedef {Object} FeedbackPattern
 * @property {string} patternId - 패턴 ID
 * @property {string} type - 'approval_tendency' | 'rejection_tendency' | 'modification_tendency'
 * @property {string} scope - 패턴 범위 (tool, phase, file_pattern)
 * @property {string} target - 대상 (e.g., 'Bash(npm*)', 'design', '*.test.js')
 * @property {number} confidence - 신뢰도 (0-1)
 * @property {number} sampleSize - 샘플 수
 * @property {string} suggestion - 제안 (e.g., 'Bash(npm*) 퍼미션을 auto로 승격')
 */
```

### 12.4 Trust Score 반영 로직

```js
/**
 * 피드백 → Trust Score 반영
 *
 * 1. 즉각 반영:
 *    - 승인 → trustEngine.recordPositive('approve')     → +1
 *    - 거부 → trustEngine.recordNegative('reject')       → -3
 *    - 수정 → trustEngine.recordNegative('modify')       → -1
 *
 * 2. 패턴 기반 반영 (5회 이상 축적 시):
 *    - 강한 승인 패턴 (80%+) → 해당 작업 auto 승격 제안 (level override)
 *    - 강한 거부 패턴 (80%+) → 해당 작업 gate/deny 강화 제안
 *    - 패턴 제안은 사용자에게 AskUserQuestion으로 확인 후 적용
 *
 * 3. 비상 반영:
 *    - 3회 연속 거부 → 즉시 1단계 다운그레이드
 *    - 5회 연속 거부 → emergencyStop
 */
```

### 12.5 Export 함수

```js
/**
 * @module lib/control/feedback-learner
 */

/**
 * 피드백 이벤트 기록
 * @param {'approve' | 'reject' | 'modify' | 'rollback' | 'explicit_level'} type
 * @param {Object} context
 * @param {string} [context.toolName] - 관련 도구
 * @param {string} [context.phase] - 관련 Phase
 * @param {string} [context.filePattern] - 관련 파일 패턴
 * @param {number} [context.responseTimeMs] - 응답 시간
 * @param {string} [context.reason] - 거부/수정 사유
 */
function recordFeedback(type, context = {}) {}

/**
 * 현재까지 분석된 패턴 조회
 * @returns {FeedbackPattern[]}
 */
function getPatterns() {}

/**
 * 패턴 기반 제안 생성
 * @returns {Array<{pattern: FeedbackPattern, action: string, description: string}>}
 */
function generateSuggestions() {}

/**
 * 제안 수락 — levelOverrides에 반영
 * @param {string} patternId
 * @returns {{ applied: boolean }}
 */
function applySuggestion(patternId) {}

/**
 * 피드백 통계 조회
 * @returns {{ totalFeedback: number, approvalRate: number, avgResponseTimeMs: number, patterns: number }}
 */
function getStats() {}

/**
 * 연속 거부 감지 + 비상 다운그레이드
 * @returns {boolean} - 비상 다운그레이드 발생 여부
 */
function checkConsecutiveRejections() {}
```

### 12.6 의존성

| 의존 모듈 | 용도 |
|-----------|------|
| `lib/control/trust-engine.js` | Trust Score 증감 반영 |
| `lib/control/automation-controller.js` | 레벨 변경 (패턴 기반) |
| `lib/audit/audit-logger.js` | 피드백 이벤트 기록 |
| `lib/pdca/automation.js` | `formatAskUserQuestion()` (제안 표시) |

---

## 13. 모듈 간 의존성 및 통합

### 13.1 의존성 그래프

```
                        ┌──────────────────┐
                        │ bkit.config.json │
                        └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼             ▼
           ┌──────────────┐ ┌────────┐ ┌───────────┐
           │ automation-  │ │ trust- │ │ feedback- │
           │ controller   │ │ engine │ │ learner   │
           └──┬───┬───┬───┘ └──┬─┬───┘ └────┬──────┘
              │   │   │        │ │           │
    ┌─────────┘   │   └──────┐ │ └─────────┐ │
    ▼             ▼          ▼ │           ▼ ▼
┌────────┐ ┌───────────┐ ┌────┴──────┐ ┌────────┐
│permis- │ │destructive│ │checkpoint-│ │  loop- │
│sion-   │ │-detector  │ │ manager   │ │breaker │
│manager │ └─────┬─────┘ └───────────┘ └────────┘
│ (v2.0) │       │
└────────┘  ┌────┴─────┐
            │  blast-   │
            │  radius   │
            └──────────┘
              │         │
              ▼         ▼
        ┌──────────┐ ┌──────────────┐
        │ audit-   │ │ decision-    │
        │ logger   │ │ tracer       │
        └──────────┘ └──────────────┘

의존 방향: 위 → 아래 (순환 의존 없음)
```

### 13.2 순환 의존 방지 전략

모든 하위 모듈(`audit-logger`, `decision-tracer`)은 상위 모듈을 직접 require하지 않음. 대신:

```js
// 패턴: 이벤트 콜백으로 역방향 통신
// audit-logger.js는 trust-engine을 import하지 않음
// 대신 automation-controller가 양쪽을 호출

// automation-controller.js
function handleDestructiveDetection(result) {
  auditLogger.log({ action: 'PERMISSION_DENIED', ... });
  decisionTracer.record({ type: 'destructive_block', ... });
  trustEngine.recordNegative('destructive_blocked');  // 여기서 호출
}
```

### 13.3 Hook 통합 매트릭스

| Hook Event | 호출 모듈 | 동작 |
|------------|----------|------|
| **PreToolUse** | permission-manager, destructive-detector, checkpoint-manager | 퍼미션 체크 → 파괴적 감지 → 필요 시 체크포인트 |
| **PostToolUse** | decision-tracer, loop-breaker, feedback-learner | 결정 기록, 루프 체크, 피드백 수집 |
| **StopFailure** | trust-engine, audit-logger | Trust -10, 비정상 종료 기록 |
| **SessionStart** | trust-engine, audit-logger, loop-breaker | Profile 로딩, 보존 정책, 카운터 리셋 |
| **PostCompact** | audit-logger | Context 압축 이벤트 기록 |

### 13.4 전체 파일 크기 예상

| 모듈 | 예상 LOC | 신규/확장 |
|------|:--------:|:---------:|
| `automation-controller.js` | ~200 | 신규 |
| `permission-manager.js` (v2.0) | ~300 (+100) | 확장 |
| `destructive-detector.js` | ~180 | 신규 |
| `blast-radius.js` | ~150 | 신규 |
| `checkpoint-manager.js` | ~280 | 신규 |
| `loop-breaker.js` | ~130 | 신규 |
| `decision-tracer.js` | ~170 | 신규 |
| `audit-logger.js` | ~220 | 신규 |
| `trust-engine.js` | ~250 | 신규 |
| `feedback-learner.js` | ~180 | 신규 |
| **합계** | **~2,060** | |

---

## 14. 보안 분석

### 14.1 OWASP Top 10 대응

| OWASP | 위험 | 대응 |
|-------|------|------|
| **A01 Broken Access Control** | L4에서 파괴적 작업 무제한 실행 가능 | L4에서도 `git push --force`, `DROP DATABASE`는 gate 유지. L4 진입 시 사용자 확인 필수 |
| **A02 Cryptographic Failures** | 체크포인트에 민감 정보 포함 가능 | `.env` 파일 체크포인트 포함 시 경고. SHA-256 해시로 무결성 검증 |
| **A03 Injection** | 정규식 패턴에 대한 ReDoS 공격 | 모든 정규식 사전 컴파일 + 입력 길이 제한 (1KB) |
| **A04 Insecure Design** | Trust Score 조작으로 L4 진입 | Trust Profile 파일 변조 감지 (해시 검증), L4 진입 시 사용자 확인 |
| **A05 Security Misconfiguration** | `automation.defaultLevel: 4` 설정 | L4 기본값 경고, 첫 세션에서 확인 질문 |
| **A08 Software Integrity Failures** | 체크포인트 파일 변조 | SHA-256 해시 검증 필수 (복원 전) |
| **A09 Logging Failures** | 감사 로그 삭제/변조 | 감사 로그 삭제 시 메타 로그 기록, 일별 요약은 별도 보존 |

### 14.2 보안 원칙 이행 점검

| 4원칙 | 구현 | 검증 방법 |
|-------|------|----------|
| **안전 기본값** | L2 기본, deny→ask→allow 체인 유지 | bkit.config.json 기본 스키마 검증 |
| **점진적 신뢰** | Trust Score 기반 에스컬레이션, 1단계씩만 상승 | evaluateLevel() 단위 테스트 |
| **완전한 가시성** | 모든 결정에 Decision Trace + Audit Log | JSONL 파일 존재 + 빈 파일 경고 |
| **언제나 중단 가능** | emergencyStop() 즉시 실행, 체크포인트 롤백 | emergency 시나리오 통합 테스트 |

### 14.3 공격 벡터 및 완화

| 공격 벡터 | 위험도 | 완화 |
|-----------|:------:|------|
| Trust Profile JSON 직접 편집으로 score 조작 | Medium | 파일 해시 검증, L4 진입 시 사용자 확인 필수 |
| control-state.json 편집으로 레벨 변경 | Medium | 세션 시작 시 Trust Score와 레벨 일관성 검증 |
| 감사 로그 삭제 | Low | 삭제 불가 설정 없음 (CLI 환경 제약), 일별 요약 별도 보존으로 감사 추적 유지 |
| ReDoS via 악의적 도구 입력 | Low | 입력 길이 1KB 제한, 정규식 사전 컴파일 |
| 체크포인트를 통한 이전 취약 코드 복원 | Medium | 롤백 시 Blast Radius 분석 + 감사 기록 |

---

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 0.1 | 2026-03-19 | 영역 2 전체 11개 모듈 상세 설계 초안 | Security Architect (bkit-security-architect) |
