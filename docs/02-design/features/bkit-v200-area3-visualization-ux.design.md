# bkit v2.0.0 영역 3 — 워크플로우 시각화 UX 상세 설계

| 항목 | 내용 |
|------|------|
| **Feature** | bkit v2.0.0 워크플로우 시각화 UX (영역 3) |
| **Phase** | Design |
| **Date** | 2026-03-19 |
| **Author** | Frontend Architect Agent |
| **Status** | Draft |
| **Plan 참조** | `docs/01-plan/features/bkit-v200-enhancement.plan.md` §4.1 영역 3 |

---

## 개요

영역 3은 bkit v2.0.0의 "시각화 Gap"을 해소하는 핵심 컴포넌트 집합이다. PDCA 진행 상황, Agent Team 활동, 변경 영향, 제어 패널을 CLI 터미널에서 즉시 확인할 수 있게 한다. 순수 ANSI escape + Unicode Box Drawing 문자만 사용하며 외부 npm 패키지에 의존하지 않는다.

### 설계 원칙

| 원칙 | 내용 |
|------|------|
| 외부 의존성 금지 | chalk, blessed, ink 사용 불가. Node.js 내장 기능만 허용 |
| 동적 너비 대응 | `process.stdout.columns` 기반, 80/120/160 breakpoints |
| Hook 이벤트 트리거 | setInterval 없음. PDCA/Agent 상태 변경 이벤트 발생 시점에만 렌더링 |
| 하위 호환 | 모든 함수는 `pdcaStatus`, `agentState`가 null/undefined여도 안전하게 렌더링 |
| Studio 준비 | 렌더링 결과와 별개로 데이터를 `agent-state.json` v2.0 스키마에 기록 |

---

## 1. `lib/ui/ansi.js` — ANSI 색상/스타일 유틸리티

### 파일 경로

`/lib/ui/ansi.js`

### Export 함수 시그니처

```js
// 색상 상수 (문자열 — ANSI 이스케이프 코드)
const COLORS = {
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
  reset:   '\x1b[0m',
};

// 스타일 상수
const STYLES = {
  bold:      '\x1b[1m',
  dim:       '\x1b[2m',
  underline: '\x1b[4m',
  reset:     '\x1b[0m',
};

// Box Drawing 문자 상수
const BOX = {
  topLeft:     '┌',
  topRight:    '┐',
  bottomLeft:  '└',
  bottomRight: '┘',
  horizontal:  '─',
  vertical:    '│',
  leftT:       '├',
  rightT:      '┤',
  topT:        '┬',
  bottomT:     '┴',
  cross:       '┼',
  arrowRight:  '→',
  arrowDown:   '↓',
};

// 상태 기호 상수
const SYMBOLS = {
  done:    '✓',
  running: '▶',
  pending: '·',
  failed:  '✗',
  waiting: '!',
  idle:    '◉',
  spawning:'○',
  bullet:  '•',
};

/**
 * 텍스트에 색상 적용
 * @param {string} text
 * @param {keyof COLORS} color
 * @returns {string}
 */
function colorize(text, color) {}

/**
 * 텍스트에 볼드 적용
 * @param {string} text
 * @returns {string}
 */
function bold(text) {}

/**
 * 텍스트에 dim 적용
 * @param {string} text
 * @returns {string}
 */
function dim(text) {}

/**
 * 텍스트에 밑줄 적용
 * @param {string} text
 * @returns {string}
 */
function underline(text) {}

/**
 * 여러 스타일을 순서대로 적용
 * @param {string} text
 * @param {string[]} styles - COLORS 또는 STYLES 값 배열
 * @returns {string}
 */
function styled(text, styles) {}

/**
 * 현재 터미널 너비 반환 (기본값 80)
 * @returns {number}
 */
function getTermWidth() {}

/**
 * 너비 breakpoint 반환: 'narrow'(80미만) | 'normal'(80~119) | 'wide'(120~159) | 'ultrawide'(160+)
 * @returns {'narrow'|'normal'|'wide'|'ultrawide'}
 */
function getWidthBreakpoint() {}

/**
 * 문자열을 maxLen 이내로 자르고 '…' 추가
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(text, maxLen) {}

/**
 * Box Drawing으로 수평선 생성
 * @param {number} width
 * @param {string} [char=BOX.horizontal]
 * @returns {string}
 */
function hline(width, char) {}

/**
 * 텍스트를 지정 너비의 가운데 정렬 문자열로 반환
 * @param {string} text
 * @param {number} width
 * @returns {string}
 */
function center(text, width) {}

module.exports = {
  COLORS, STYLES, BOX, SYMBOLS,
  colorize, bold, dim, underline, styled,
  getTermWidth, getWidthBreakpoint, truncate, hline, center,
};
```

### 설계 메모

- `ANSI_DISABLED` 환경변수 또는 `NO_COLOR` 표준이 설정된 경우 모든 스타일 함수는 text 그대로 반환
- `getTermWidth()`는 `process.stdout.columns || 80` 사용. Hook 환경(비 TTY)에서는 항상 80 반환
- 모든 상수는 `Object.freeze()`로 변경 불가 처리
- 이 모듈은 다른 `lib/ui/` 모듈의 공통 의존성. 순환 참조 방지를 위해 `lib/core` 및 다른 lib 모듈을 require하지 않음

---

## 2. `lib/ui/progress-bar.js` — PdcaProgressBar

### 파일 경로

`/lib/ui/progress-bar.js`

### Export 함수 시그니처

```js
/**
 * PDCA 진행 바 렌더링
 * @param {Object|null} pdcaStatus - .bkit/state/pdca-status.json 내용
 * @param {Object} [opts]
 * @param {boolean} [opts.compact=false]    - true: 1줄 모드, false: 3줄 모드(기본)
 * @param {string}  [opts.feature]          - 표시할 feature 이름 (null이면 primaryFeature 사용)
 * @param {number}  [opts.width]            - 강제 너비 (기본: getTermWidth())
 * @returns {string} 렌더링된 문자열 (개행 포함, 마지막에 \n 없음)
 */
function renderPdcaProgressBar(pdcaStatus, opts = {}) {}

module.exports = { renderPdcaProgressBar };
```

### 렌더링 출력 예시

**compact 모드 (1줄, 80컬럼)**

```
[bkit-v200] PM✓ PLAN✓ DESIGN▶ DO· CHECK· REPORT·  42%  ████████░░░░░░░░░░░
```

**full 모드 (3줄, 80컬럼)**

```
┌─── bkit-v200-enhancement ──────────────────────── 42% ────────────────────┐
│  PM  ✓  PLAN  ✓  DESIGN ▶  DO  ·  CHECK ·  REPORT ·  ████████████░░░░░░  │
└─ design: API 인터페이스 정의 중  ·  last: 3m ago  ·  iter: 2/5 ──────────┘
```

**full 모드 (3줄, 120컬럼)**

```
┌─── bkit-v200-enhancement ─────────────────────────────────────────── 42% ─────────────────────┐
│  PM ✓  PLAN ✓  DESIGN ▶  DO ·  CHECK ·  REPORT ·     ████████████████░░░░░░░░░░░░░░░░░░░░  │
└─ Phase: design · 현재: API 인터페이스 정의 중 · 최근: 3분전 · Iter: 2/5 · matchRate: 87% ────┘
```

**승인 대기 상태 (full 모드)**

```
┌─── bkit-v200-enhancement ──────────────────────── 42% ────────────────────┐
│  PM  ✓  PLAN  ✓  DESIGN !  DO  ·  CHECK ·  REPORT ·  ████████████░░░░░░  │
└─ ! 승인 대기: Design 완료 확인 필요  ·  /pdca approve 로 진행 ────────────┘
```

### 단계별 상태 기호 매핑

| 상태 | 기호 | 색상 |
|------|------|------|
| completed | `✓` | green |
| running | `▶` | cyan |
| pending | `·` | gray |
| failed | `✗` | red |
| approval_waiting | `!` | yellow (bold) |

### 인라인 퍼센트 바 설계

```
전체 bar_width = (termWidth - 오버헤드) 기반 동적 계산
  - narrow(80):    16문자
  - normal(80~119): 20문자
  - wide(120~159): 36문자
  - ultrawide(160+): 50문자

filled = Math.round(bar_width * percent / 100)
bar = '█'.repeat(filled) + '░'.repeat(bar_width - filled)
```

퍼센트 계산식:
```
phases = ['pm', 'plan', 'design', 'do', 'check', 'report']
phaseWeight = 1/6 each
completed단계 = 1.0, running단계 = 0.5, 나머지 = 0
percent = Math.round(sum(weights) * 100)
```

### 데이터 소스

- `pdcaStatus.features[feature].phase` — 현재 단계
- `pdcaStatus.features[feature].timestamps` — 마지막 활동 시각
- `pdcaStatus.features[feature].iterationCount` — 반복 횟수
- `pdcaStatus.features[feature].matchRate` — (v2.0 신규 필드)
- `pdcaStatus.features[feature].pendingApprovals` — (v2.0 신규 필드)
- `pdcaStatus.primaryFeature` — opts.feature 미지정 시 사용

### 갱신 트리거

| 트리거 | 이벤트 소스 |
|--------|------------|
| PDCA 단계 전환 | `PostToolUse` hook (pdca-status.json 쓰기 감지) |
| 승인 게이트 진입 | `pdca-skill-stop.js` AskUserQuestion 직전 |
| matchRate 업데이트 | `gap-detector-stop.js` 완료 후 |
| SessionStart | `session-start.js` 컨텍스트 초기화 완료 후 |

---

## 3. `lib/ui/workflow-map.js` — WorkflowMap

### 파일 경로

`/lib/ui/workflow-map.js`

### Export 함수 시그니처

```js
/**
 * PDCA 워크플로우 맵 렌더링
 * @param {Object|null} pdcaStatus  - .bkit/state/pdca-status.json
 * @param {Object|null} agentState  - .bkit/runtime/agent-state.json
 * @param {Object} [config]
 * @param {string}  [config.feature]       - 표시할 feature
 * @param {boolean} [config.showIteration] - iterationHistory 표시 여부 (기본: true)
 * @param {boolean} [config.showBranch]    - 조건부 경로 분기 표시 여부 (기본: true)
 * @param {number}  [config.width]         - 강제 너비
 * @returns {string} 렌더링된 다이어그램 문자열
 */
function renderWorkflowMap(pdcaStatus, agentState, config = {}) {}

module.exports = { renderWorkflowMap };
```

### 렌더링 출력 예시

**기본 워크플로우 맵 (80컬럼)**

```
┌─── Workflow Map: bkit-v200-enhancement ───────────────────────────────────┐
│                                                                             │
│  [PM ✓]──→[PLAN ✓]──→[DESIGN ▶]──→[DO ·]──→[CHECK ·]──→[REPORT ·]      │
│                            │                      │                         │
│                            └── approved ──→      └─ <90% ──→[ACT ·]      │
│                                                                             │
│  Iter: 2  ·  matchRate: 87%  ·  Next: DO 단계 자동 시작 예정              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**병렬 swarm 서브트리 포함 (120컬럼, Agent Team 활성 상태)**

```
┌─── Workflow Map: bkit-v200-enhancement ─────────────────────────────────────────────────────────┐
│                                                                                                   │
│  [PM ✓]──→[PLAN ✓]──→[DESIGN ▶]──→[DO ·]──────────→[CHECK ·]──→[REPORT ·]                    │
│                            │            │                  │                                      │
│                            │            ├─[CTO-Agent ▶]   └─ <90% ──→[ACT ·]──→[REPORT ·]     │
│                            │            ├─[FE-Agent  ○]                                          │
│                            │            └─[BE-Agent  ·]                                          │
│                            └── approved ──→                                                       │
│                                                                                                   │
│  Iter: 2  ·  matchRate: 87%  ·  Agents: 3 active (1 working, 1 spawning, 1 pending)            │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**iterationHistory 표시 (full)**

```
┌─── Iteration History ─────────────────────────────────────────────────────┐
│  Iter 1: design→check→act  matchRate: 72%  2026-03-18 14:23              │
│  Iter 2: design▶ (current) matchRate: 87%  2026-03-19 09:41              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2D 박스 다이어그램 렌더링 알고리즘

```
1. 단계 목록 생성: phases = ['PM','PLAN','DESIGN','DO','CHECK','REPORT']
2. 각 단계 박스 너비 = max(phaseLabel.length + 4, 8)
3. 단계간 연결선: '──→' (3문자)
4. 전체 맵 너비 계산 후 termWidth 초과 시 2줄로 분할
   - 1행: PM, PLAN, DESIGN, DO
   - 2행: CHECK, REPORT (들여쓰기 + 연결선)
5. 현재 단계: bold + cyan 배경
6. 완료 단계: green
7. 대기 단계: gray + dim
```

**조건부 경로 분기 표시 규칙:**

```
CHECK 단계 아래에 분기 표시:
  ≥90% matchRate → [REPORT] 경로 (green)
  <90%  matchRate → [ACT] 경로 (yellow)
```

**병렬 swarm 서브트리 렌더링 조건:**

```
agentState.teammates.length > 1 이고
agentState.orchestrationPattern === 'parallel' 일 때
DO 단계 아래에 서브트리 표시
```

### 데이터 소스

- `pdcaStatus.features[feature]` — phase, iterationHistory
- `agentState.teammates` — 병렬 에이전트 목록
- `agentState.orchestrationPattern` — 오케스트레이션 패턴

### 갱신 트리거

| 트리거 | 이벤트 소스 |
|--------|------------|
| `/pdca map` 명령 실행 | skill: `pdca` → map 서브커맨드 |
| SessionStart 출력 | `session-start.js` 배너 섹션 |
| 단계 전환 완료 | `PostToolUse` 후 상태 변경 감지 |

---

## 4. `lib/ui/agent-panel.js` — AgentTeamPanel

### 파일 경로

`/lib/ui/agent-panel.js`

### Export 함수 시그니처

```js
/**
 * Agent Team 패널 렌더링
 * @param {Object|null} agentState - .bkit/runtime/agent-state.json
 * @param {Object} [opts]
 * @param {number} [opts.maxMessages=5]    - 표시할 최근 메시지 수
 * @param {boolean} [opts.showPattern=true] - 오케스트레이션 패턴 표시 여부
 * @param {number}  [opts.width]            - 강제 너비
 * @returns {string}
 */
function renderAgentPanel(agentState, opts = {}) {}

module.exports = { renderAgentPanel };
```

### 렌더링 출력 예시

**Agent Team 패널 (80컬럼)**

```
┌─── Agent Team: bkit-cto-team ──────────────── Pattern: leader ────────────┐
│                                                                             │
│  ▶  CTO-Orchestrator  [working]   설계 검토 및 서브태스크 배분 중         │
│  ○  FE-Architect      [spawning]  대기 중                                  │
│  ·  BE-Designer       [pending]   미시작                                   │
│  ✓  QA-Reviewer       [done]      코드 품질 검토 완료                     │
│                                                                             │
│  ─── Recent Communications (최근 5건) ────────────────────────────────── │
│  CTO→FE:    "lib/ui/ 컴포넌트 6개 병렬 설계 시작"         09:41:22       │
│  CTO→BE:    "agent-state.json v2.0 스키마 정의 요청"       09:41:18       │
│  QA→CTO:    "진행 바 ANSI 렌더링 검증 완료"                09:38:05       │
│  FE→CTO:    "ansi.js 설계 완료, 승인 요청"                 09:35:11       │
│  CTO→ALL:   "Phase 3 시작 — 시각화 컴포넌트 설계"          09:30:00       │
│                                                                             │
│  Tasks: 4 total  ·  1 working  ·  1 spawning  ·  1 done  ·  1 pending   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Agent Team 비활성 상태**

```
┌─── Agent Team ────────────────────────────────────────────────────────────┐
│  Agent Team이 비활성 상태입니다.                                           │
│  /pdca team 명령으로 팀 상태를 확인하거나                                  │
│  CTO Team 스킬을 사용해 Agent Team을 시작하세요.                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 상태 아이콘 매핑

| 상태 | 아이콘 | 색상 |
|------|--------|------|
| spawning | `○` | yellow |
| working | `▶` | cyan + bold |
| idle | `◉` | white |
| completed | `✓` | green |
| failed | `✗` | red |
| pending | `·` | gray |

### 오케스트레이션 패턴 표시

| 패턴 | 표시 텍스트 | 설명 |
|------|------------|------|
| `leader` | `Pattern: leader` | 단일 오케스트레이터 |
| `parallel` | `Pattern: parallel swarm` | 병렬 동시 실행 |
| `sequential` | `Pattern: sequential` | 순차 실행 |
| `hybrid` | `Pattern: hybrid` | 혼합 |

### 데이터 소스

- `agentState.teammates` — 에이전트 목록 (이름, 역할, 상태, currentTask)
- `agentState.recentMessages` — 최근 메시지 링 버퍼 (최대 50건, 5건만 표시)
- `agentState.orchestrationPattern` — 패턴
- `agentState.progress` — 태스크 집계

### 갱신 트리거

| 트리거 | 이벤트 소스 |
|--------|------------|
| `/pdca team` 명령 | skill: `pdca` → team 서브커맨드 |
| SubagentStart | `SubagentStart` hook → state-writer.addTeammate() |
| SubagentStop | `SubagentStop` hook → state-writer.updateTeammateStatus() |
| 메시지 수신 | `state-writer.addRecentMessage()` 호출 후 |

---

## 5. `lib/ui/impact-view.js` — ImpactAnalysisView

### 파일 경로

`/lib/ui/impact-view.js`

### Export 함수 시그니처

```js
/**
 * 변경 영향 분석 뷰 렌더링
 * @param {Object|null} pdcaStatus - .bkit/state/pdca-status.json
 * @param {Object|null} gitDiff    - git diff 분석 결과
 * @param {string[]}    [gitDiff.changedFiles]     - 변경된 파일 목록 (절대 경로)
 * @param {Object}      [gitDiff.stats]            - { insertions, deletions, filesChanged }
 * @param {Object} [opts]
 * @param {string}  [opts.feature]     - 표시할 feature
 * @param {number}  [opts.maxFiles=10] - 최대 표시 파일 수
 * @param {number}  [opts.treeDepth=3] - 파일 트리 최대 depth
 * @param {number}  [opts.width]       - 강제 너비
 * @returns {string}
 */
function renderImpactView(pdcaStatus, gitDiff, opts = {}) {}

module.exports = { renderImpactView };
```

### 렌더링 출력 예시

**변경 영향 분석 뷰 (80컬럼)**

```
┌─── Impact Analysis: bkit-v200-enhancement ────────────────────────────────┐
│                                                                             │
│  Match Rate  ████████████████████░░░░   87%  (목표: 90%)                 │
│                                                                             │
│  Changed Files (12 files, +347 / -89)                                     │
│  lib/                                                                       │
│  ├── ui/                                                                    │
│  │   ├── ansi.js                    [신규]  +82                            │
│  │   ├── progress-bar.js            [신규]  +156                           │
│  │   └── workflow-map.js            [신규]  +109                           │
│  ├── team/                                                                  │
│  │   └── state-writer.js            [수정]  +23 / -4                      │
│  └── core/                                                                  │
│      └── paths.js                   [수정]  +8 / -0                       │
│  … 7개 파일 더 있음                                                       │
│                                                                             │
│  ─── Iteration Match Rate Trend ─────────────────────────────────────── │
│  Iter 1 ████████████░░░░░░░░  72%                                         │
│  Iter 2 ████████████████░░░░  87% (current)                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Match Rate 색상 규칙

| 범위 | 색상 | 의미 |
|------|------|------|
| ≥90% | green | 목표 달성 |
| 70%~89% | yellow | 개선 필요 |
| <70% | red | 미달, ACT 필요 |

### Match Rate 바 설계

```
bar_width = termWidth 기준:
  - narrow: 16문자
  - normal: 24문자
  - wide:   36문자

색상은 퍼센트 기준으로 동적 적용
```

### 변경 파일 트리 렌더링 알고리즘

```
1. changedFiles를 공통 prefix(프로젝트 루트) 기준으로 상대 경로 변환
2. path.sep 분할로 트리 구조 생성 (depth 최대 3단계)
3. 각 경로를 디렉토리 → 파일 순으로 정렬
4. 트리 prefix: '├── ' (중간), '└── ' (마지막), '│   ' (연속)
5. maxFiles 초과 시 '… N개 파일 더 있음' 으로 생략
6. 각 파일 옆에 [신규]/[수정]/[삭제] 태그 + diff stats
```

### Iteration별 Match Rate 트렌드 바 차트

```
iterationHistory 배열을 순회하여 각 iteration의 matchRate를 바 차트로 표시
bar_width = 20문자 고정 (narrow에서는 12문자)
현재 iteration에 '(current)' 태그 표시
```

### 데이터 소스

- `pdcaStatus.features[feature].matchRate` — 현재 matchRate (v2.0 신규)
- `pdcaStatus.features[feature].iterationHistory` — 반복 히스토리 (v2.0 신규)
- `gitDiff.changedFiles` — 변경 파일 목록
- `gitDiff.stats` — diff 통계

### 갱신 트리거

| 트리거 | 이벤트 소스 |
|--------|------------|
| `/pdca impact` 명령 | skill: `pdca` → impact 서브커맨드 |
| gap-detector 완료 | `gap-detector-stop.js` matchRate 업데이트 후 |
| Check 단계 완료 | PDCA 상태 머신 `CHECK → ACT/REPORT` 전환 시 |

---

## 6. `lib/ui/control-panel.js` — ControlPanel

### 파일 경로

`/lib/ui/control-panel.js`

### Export 함수 시그니처

```js
/**
 * 제어 패널 렌더링
 * @param {Object|null} controlState     - .bkit/runtime/control-state.json (v2.0 신규 파일)
 * @param {number|null} automationLevel  - 현재 자동화 레벨 (0~4), null이면 controlState에서 읽음
 * @param {Object} [opts]
 * @param {boolean} [opts.showShortcuts=true]  - 단축키 맵 표시 여부
 * @param {boolean} [opts.showApprovals=true]  - 승인 대기 항목 표시 여부
 * @param {number}  [opts.width]               - 강제 너비
 * @returns {string}
 */
function renderControlPanel(controlState, automationLevel, opts = {}) {}

module.exports = { renderControlPanel };
```

### 렌더링 출력 예시

**제어 패널 (L2 Semi-Auto, 80컬럼)**

```
┌─── Control Panel ──────────────────────────────────────────────────────────┐
│                                                                              │
│  Automation Level   L0 ──────────●──────────── L4                         │
│                     Manual  Semi-Auto  Full-Auto                            │
│                             [현재: L2 Semi-Auto]                            │
│                                                                              │
│  ─── Pending Approvals (1건) ─────────────────────────────────────────── │
│  ! [DESIGN→DO]  "Design 단계 완료 확인 및 DO 자동 시작 승인"              │
│    → /pdca approve  또는  /pdca reject                                     │
│                                                                              │
│  ─── Keyboard Shortcuts ──────────────────────────────────────────────── │
│  /pdca status      현재 PDCA 상태 전체 보기                                │
│  /pdca approve     현재 승인 대기 항목 승인                                │
│  /pdca reject      현재 단계 거부 및 피드백 입력                          │
│  /pdca rollback    마지막 체크포인트로 롤백                                │
│  /pdca map         워크플로우 맵 표시                                      │
│  /pdca team        Agent Team 패널 표시                                    │
│  /control level 3  자동화 레벨 변경 (0~4)                                 │
│                                                                              │
│  긴급 중지: /control stop  또는  Ctrl+C → bkit이 안전하게 중단합니다     │
└──────────────────────────────────────────────────────────────────────────────┘
```

**승인 대기 없는 상태 (compact)**

```
┌─── Control Panel ──────────── L2 Semi-Auto ───────── 승인 대기 없음 ────┐
│  /pdca approve·reject·rollback·map·team  ·  /control stop (긴급 중지)  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 자동화 레벨 슬라이더 설계

```
레벨별 슬라이더 위치 (전체 슬라이더 너비 = 22문자 고정):

L0: ●──────────────────── (Manual)
L1: ────●──────────────── (Guided)
L2: ────────●──────────── (Semi-Auto)  ← 기본값
L3: ────────────●──────── (Auto)
L4: ────────────────────● (Full-Auto)

표시 형식:
  L0 ●──────────────────── L4
  Manual  Semi-Auto  Full-Auto
  [현재: L2 Semi-Auto]

색상:
  L0~L1: green (안전)
  L2:    yellow (주의)
  L3~L4: red (고위험)
```

### 승인 대기 항목 하이라이트 규칙

```
pendingApprovals 배열 순회:
  - 각 항목: yellow bold '!' 아이콘 + 전환 표시 + 설명
  - /pdca approve / /pdca reject 안내 표시
  - 항목 없으면 '승인 대기 없음' (green)
```

### 긴급 중지 안내

```
항상 패널 하단에 표시:
  "긴급 중지: /control stop  또는  Ctrl+C"
  → bkit이 현재 상태를 체크포인트로 저장 후 중단합니다
```

### 데이터 소스

- `.bkit/runtime/control-state.json` — `automationLevel`, `pendingApprovals`, `trustScore`
- `bkit.config.json` — `automationLevel` 설정값 (fallback)

### control-state.json 구조 (v2.0 신규 파일)

```json
{
  "version": "2.0",
  "automationLevel": 2,
  "trustScore": 68,
  "pendingApprovals": [
    {
      "id": "approval-001",
      "type": "phase_transition",
      "from": "design",
      "to": "do",
      "description": "Design 단계 완료 확인 및 DO 자동 시작 승인",
      "createdAt": "2026-03-19T09:41:00.000Z"
    }
  ],
  "lastUpdated": "2026-03-19T09:41:00.000Z"
}
```

### 갱신 트리거

| 트리거 | 이벤트 소스 |
|--------|------------|
| `/control` 명령 | skill: `control` (v2.0 신규 skill) |
| 승인 게이트 진입 | `pdca-skill-stop.js` 승인 대기 항목 추가 시 |
| `/control level N` | 자동화 레벨 변경 직후 |
| SessionStart 배너 | 세션 시작 시 요약 포함 |

---

## 7. SessionStart 대시보드 배너 — `session-start.js` 개선

### 수정 파일

`/hooks/startup/session-context.js` (v2.0에서 session-start.js 분할 후)
또는 v1.x 호환 모드: `/hooks/session-start.js`의 배너 출력 섹션

### 변경 범위

기존 session-start.js의 배너 출력 부분을 `lib/ui/` 컴포넌트로 교체.

### 신규 배너 구조

세션 재진입 시 (pdcaStatus에 activeFeature 존재):

```
════════════════════════════════════════════════════════════════════════════════
  bkit v2.0.0  ·  AI Native Development OS  ·  2026-03-19 09:41

  ─── Active Feature ───────────────────────────────────────────────────────
  [bkit-v200-enhancement]  PM✓ PLAN✓ DESIGN▶ DO· CHECK· REPORT·  42%  ████████░░░░
  마지막 활동: 3분 전  ·  Iter: 2/5  ·  matchRate: 87%

  ─── Next Action ──────────────────────────────────────────────────────────
  ▶  DESIGN 단계 진행 중 — API 인터페이스 정의 계속
     승인 대기: [DESIGN→DO] 전환 준비 시 /pdca approve

  ─── Quick Status ─────────────────────────────────────────────────────────
  Automation: L2 Semi-Auto  ·  Trust: 68/100  ·  Agents: inactive
════════════════════════════════════════════════════════════════════════════════
```

신규 세션 시 (activeFeature 없음):

```
════════════════════════════════════════════════════════════════════════════════
  bkit v2.0.0  ·  AI Native Development OS

  새 Feature 시작: /pdca pm {feature-name}
  기존 Feature 재개: /pdca resume {feature-name}
════════════════════════════════════════════════════════════════════════════════
```

### 배너 컴포넌트 조합 방식

```js
// session-context.js 내 배너 생성 로직 (의사코드)
function buildSessionBanner(pdcaStatus, agentState, controlState) {
  const lines = [];
  lines.push(hline(termWidth, '═'));
  lines.push(bkitHeader());

  if (hasActiveFeature(pdcaStatus)) {
    lines.push(renderPdcaProgressBar(pdcaStatus, { compact: true }));
    lines.push(buildNextActionSection(pdcaStatus, controlState));
    lines.push(buildQuickStatusLine(agentState, controlState));
  } else {
    lines.push(newSessionGuide());
  }

  lines.push(hline(termWidth, '═'));
  return lines.join('\n');
}
```

### 데이터 소스

| 데이터 | 출처 |
|--------|------|
| 현재 feature, phase | `pdcaStatus.primaryFeature` + `pdcaStatus.features[f]` |
| 마지막 활동 시각 | `pdcaStatus.features[f].timestamps.lastUpdated` |
| 승인 대기 | `controlState.pendingApprovals` |
| 자동화 레벨 | `controlState.automationLevel` |
| Agent 상태 | `agentState.enabled`, `agentState.teammates.length` |

### 갱신 트리거

SessionStart hook 실행 시 1회 출력. 이후 갱신은 각 컴포넌트의 개별 트리거에 의존.

---

## 8. `agent-state.json` v2.0 스키마 — `state-writer.js` 확장

### 파일 경로

`/lib/team/state-writer.js` (기존 파일 확장)
런타임 파일: `.bkit/runtime/agent-state.json`

### v2.0 스키마 전체 구조

```json
{
  "version": "2.0",
  "enabled": false,
  "teamName": "",
  "feature": "",
  "pdcaPhase": "design",
  "orchestrationPattern": "leader",
  "ctoAgent": "opus",
  "startedAt": "2026-03-19T09:30:00.000Z",
  "lastUpdated": "2026-03-19T09:41:22.000Z",
  "sessionId": "",

  "teammates": [
    {
      "name": "CTO-Orchestrator",
      "role": "orchestrator",
      "model": "opus",
      "status": "working",
      "currentTask": "설계 검토 및 서브태스크 배분 중",
      "taskId": "task-001",
      "startedAt": "2026-03-19T09:30:00.000Z",
      "lastActivityAt": "2026-03-19T09:41:22.000Z"
    }
  ],

  "progress": {
    "totalTasks": 4,
    "completedTasks": 1,
    "inProgressTasks": 1,
    "failedTasks": 0,
    "pendingTasks": 2
  },

  "recentMessages": [
    {
      "from": "CTO-Orchestrator",
      "to": "FE-Architect",
      "content": "lib/ui/ 컴포넌트 6개 병렬 설계 시작",
      "timestamp": "2026-03-19T09:41:22.000Z"
    }
  ],

  "matchRate": 87,

  "iterationHistory": [
    {
      "iteration": 1,
      "phase": "design",
      "matchRate": 72,
      "startedAt": "2026-03-18T14:23:00.000Z",
      "completedAt": "2026-03-18T16:45:00.000Z",
      "outcome": "act"
    },
    {
      "iteration": 2,
      "phase": "design",
      "matchRate": 87,
      "startedAt": "2026-03-19T09:30:00.000Z",
      "completedAt": null,
      "outcome": null
    }
  ],

  "pendingApprovals": [
    {
      "id": "approval-001",
      "type": "phase_transition",
      "from": "design",
      "to": "do",
      "description": "Design 단계 완료 확인 및 DO 자동 시작 승인",
      "createdAt": "2026-03-19T09:41:00.000Z"
    }
  ],

  "agentEvents": [
    {
      "type": "spawned",
      "agentName": "FE-Architect",
      "timestamp": "2026-03-19T09:30:05.000Z",
      "meta": {}
    },
    {
      "type": "message",
      "from": "CTO-Orchestrator",
      "to": "FE-Architect",
      "timestamp": "2026-03-19T09:41:22.000Z",
      "meta": { "taskId": "task-001" }
    }
  ]
}
```

### v1.0 → v2.0 필드 호환성 매트릭스

| 필드 | v1.0 | v2.0 | 비고 |
|------|:----:|:----:|------|
| version | `"1.0"` | `"2.0"` | 마이그레이션 함수 필요 |
| enabled | O | O | 동일 |
| teamName | O | O | 동일 |
| feature | O | O | 동일 |
| pdcaPhase | O | O | 동일 |
| orchestrationPattern | O | O | 동일 |
| ctoAgent | O | O | 동일 |
| startedAt | O | O | 동일 |
| lastUpdated | O | O | 동일 |
| sessionId | O | O | 동일 |
| teammates | O | O | 동일 (스키마 변경 없음) |
| progress | O | O | 동일 |
| recentMessages | O | O | 동일 |
| **matchRate** | X | O | **신규** — gap-detector 결과 |
| **iterationHistory** | X | O | **신규** — PDCA 반복 이력 |
| **pendingApprovals** | X | O | **신규** — 승인 대기 항목 |
| **agentEvents** | X | O | **신규** — Agent 이벤트 스트림 |

### 신규 Export 함수 (state-writer.js 추가)

```js
/**
 * matchRate 업데이트
 * @param {number} rate - 0~100 정수
 */
function updateMatchRate(rate) {}

/**
 * iterationHistory 항목 추가 또는 현재 iteration 업데이트
 * @param {Object} iterData
 * @param {number} iterData.iteration
 * @param {string} iterData.phase
 * @param {number} [iterData.matchRate]
 * @param {string} [iterData.outcome]   - 'act'|'report'|null
 */
function upsertIterationHistory(iterData) {}

/**
 * pendingApprovals 항목 추가
 * @param {Object} approval
 * @param {string} approval.id
 * @param {string} approval.type
 * @param {string} approval.from
 * @param {string} approval.to
 * @param {string} approval.description
 */
function addPendingApproval(approval) {}

/**
 * pendingApprovals 항목 제거 (승인/거부 후)
 * @param {string} approvalId
 */
function removePendingApproval(approvalId) {}

/**
 * agentEvents JSONL 스트림에 이벤트 추가 (링 버퍼, 최대 200건)
 * @param {Object} event
 * @param {string} event.type  - 'spawned'|'completed'|'failed'|'message'|'status_change'
 * @param {string} [event.agentName]
 * @param {string} [event.from]
 * @param {string} [event.to]
 * @param {Object} [event.meta]
 */
function addAgentEvent(event) {}

/**
 * v1.0 agent-state를 v2.0으로 마이그레이션
 * @param {Object} v1State
 * @returns {Object} v2State
 */
function migrateAgentStateToV2(v1State) {}
```

### 마이그레이션 전략

```
1. readAgentState() 호출 시 version 필드 확인
2. version === "1.0" 이면 migrateAgentStateToV2() 자동 실행
3. 신규 필드 기본값:
   - matchRate: null
   - iterationHistory: []
   - pendingApprovals: []
   - agentEvents: []
4. 마이그레이션 후 즉시 writeAgentState() 저장
5. v1.0 파일이 없으면 createDefaultAgentState()로 v2.0 신규 생성
```

---

## 9. `lib/ui/index.js` — 공개 API

### 파일 경로

`/lib/ui/index.js`

### Export 구조

```js
/**
 * lib/ui — 워크플로우 시각화 UX 공개 API
 * @module lib/ui
 * @version 2.0.0
 */
module.exports = {
  // ANSI 유틸
  ...require('./ansi'),

  // 컴포넌트
  renderPdcaProgressBar:  require('./progress-bar').renderPdcaProgressBar,
  renderWorkflowMap:      require('./workflow-map').renderWorkflowMap,
  renderAgentPanel:       require('./agent-panel').renderAgentPanel,
  renderImpactView:       require('./impact-view').renderImpactView,
  renderControlPanel:     require('./control-panel').renderControlPanel,
};
```

---

## 10. 컴포넌트 의존성 다이어그램

```
lib/ui/index.js
├── ansi.js                (외부 의존성 없음)
├── progress-bar.js        → ansi.js
├── workflow-map.js        → ansi.js
├── agent-panel.js         → ansi.js
├── impact-view.js         → ansi.js
└── control-panel.js       → ansi.js

lib/team/state-writer.js   → lib/core (기존 의존성 유지)
  신규 exports: updateMatchRate, upsertIterationHistory,
                addPendingApproval, removePendingApproval,
                addAgentEvent, migrateAgentStateToV2

session-start.js 배너 섹션
├── lib/ui/progress-bar.js
├── lib/ui/workflow-map.js
└── lib/ui/control-panel.js
```

---

## 11. 구현 순서 (Phase 3 로드맵)

계획서 §10 Phase 3 항목을 다음 순서로 구현:

| 순서 | 항목 | 규모 | 선행 조건 |
|:----:|------|:----:|----------|
| 1 | `lib/ui/ansi.js` | ~80 LOC | 없음 |
| 2 | `lib/ui/progress-bar.js` | ~150 LOC | ansi.js |
| 3 | `agent-state.json` v2.0 스키마 + state-writer.js 확장 | ~120 LOC | 없음 |
| 4 | `lib/ui/agent-panel.js` | ~130 LOC | ansi.js, state-writer v2.0 |
| 5 | `lib/ui/workflow-map.js` | ~160 LOC | ansi.js, progress-bar.js |
| 6 | `lib/ui/impact-view.js` | ~110 LOC | ansi.js |
| 7 | `lib/ui/control-panel.js` | ~100 LOC | ansi.js |
| 8 | `lib/ui/index.js` | ~20 LOC | 1~7 완료 |
| 9 | SessionStart 배너 통합 | ~60 LOC | 1~8 완료 |

---

## 12. 테스트 전략

각 컴포넌트는 Node.js `process.stdout.write()` 출력 테스트로 검증:

```
검증 항목:
1. pdcaStatus === null → 에러 없이 빈/기본 상태 렌더링
2. 80컬럼에서 줄바꿈 오버플로우 없음
3. ANSI_DISABLED=1 환경에서 이스케이프 코드 미출력
4. 모든 상태 기호(✓▶·✗!) 정상 렌더링
5. v1.0 agent-state.json → v2.0 마이그레이션 무손실
```

---

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 0.1 | 2026-03-19 | 초안 작성 | Frontend Architect Agent |
