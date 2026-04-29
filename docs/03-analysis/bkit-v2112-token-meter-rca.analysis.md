# bkit v2.1.12 Token Meter Adapter — Root Cause Analysis

**Document type**: Analysis  
**Feature**: bkit-v2112-token-meter-rca  
**Date**: 2026-04-28  
**Status**: OPEN (v2.1.13 후보)  
**Severity**: P0 — CARRY-5  
**Analyst**: QA Debug Analyst Agent  

---

## 요약 (Executive Summary)

`token-ledger.ndjson` 472개 항목 전체가 `inputTokens:0 / outputTokens:0 / model:"unknown" / ccVersion:"unknown" / sessionHash:"unknown"` 상태임이 확인됨. 이는 데이터 손실이 아니라 **설계 전제가 잘못된 수집 구조** 문제임. Adapter(`token-accountant.js`)가 CC Hook stdin 페이로드에서 직접 데이터를 추출하지 않고, CC가 실제로 제공하지 않는 환경 변수(`CLAUDE_SESSION_ID`, `CLAUDE_MODEL`, `CLAUDE_INPUT_TOKENS` 등)에만 의존한다. 결과적으로 모든 필드가 fallback 기본값으로 기록된다.

---

## 1. RCA — 정확한 결함 위치

### 1-A. 핵심 결함: unified-stop.js 688~701번째 줄

```
scripts/unified-stop.js:688-701
```

```js
// Sprint 4.5 Integration: Record turn marker for ENH-264 per-turn tracking.
try {
  const ccRegression = require('../lib/cc-regression');
  ccRegression.recordTurn({
    sessionId:    process.env.CLAUDE_SESSION_ID || '',      // 688 라인 결함 근원
    agent:        activeAgent || 'main',
    model:        process.env.CLAUDE_MODEL || 'unknown',    // 695 라인 결함 근원
    ccVersion:    process.env.CLAUDE_CODE_VERSION || 'unknown', // 696 라인 결함 근원
    turnIndex:    parseInt(process.env.CLAUDE_TURN_INDEX || '0', 10),
    inputTokens:  parseInt(process.env.CLAUDE_INPUT_TOKENS || '0', 10),  // 698 라인 결함 근원
    outputTokens: parseInt(process.env.CLAUDE_OUTPUT_TOKENS || '0', 10), // 699 라인 결함 근원
    overheadDelta: parseInt(process.env.CLAUDE_OVERHEAD_DELTA || '0', 10),
  });
```

**문제**: 6개 필드 전부 `process.env.CLAUDE_*` 환경 변수에서 읽음. 그런데 CC v2.1.x는 **Stop 훅에서 이 환경 변수들을 전혀 설정하지 않는다.** 실제 토큰/세션/모델 데이터는 CC가 stdin 페이로드(JSON)로 전달하며, `hookContext` 변수에 이미 파싱되어 있음.

### 1-B. hookContext가 사용 가능했지만 무시됨

`unified-stop.js`는 244~250번째 줄에서 stdin을 올바르게 파싱함:

```js
// scripts/unified-stop.js:244-250
let hookContext = {};
try {
  const input = readStdinSync();
  hookContext = typeof input === 'string' ? JSON.parse(input) : input;
} catch (e) { ... }
```

이후 `hookContext`는 `skill_name`, `agent_name`, `tool_input`, `agent_id` 추출에만 사용되고, 688~701번째 줄의 `recordTurn()` 호출에서는 **완전히 무시됨**. `hookContext.session_id`, `hookContext.message.usage`, `hookContext.message.model` 중 어느 것도 읽지 않음.

### 1-C. token-accountant.js의 fallback 동작 (65~76번째 줄)

```
lib/cc-regression/token-accountant.js:65-76
```

```js
function recordTurn(meta = {}) {
  const entry = {
    sessionHash: hashSession(meta.sessionId),  // 빈 문자열 → 'unknown'
    model:       typeof meta.model === 'string' ? meta.model : 'unknown',
    ccVersion:   typeof meta.ccVersion === 'string' ? meta.ccVersion : 'unknown',
    inputTokens: Number.isFinite(meta.inputTokens) ? meta.inputTokens : 0,
    outputTokens: Number.isFinite(meta.outputTokens) ? meta.outputTokens : 0,
  };
```

`hashSession('')`은 46번째 줄에서 `'unknown'`을 반환:

```js
function hashSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return 'unknown';  // 빈 문자열은 falsy
  ...
}
```

모든 env var가 미설정이면 → `sessionId = ''` → `hashSession('')` → `'unknown'`. 결과적으로 472개 항목 전부 동일한 fallback 값.

### 1-D. 환경 변수 실측 확인

현재 세션의 실제 환경 변수 검사 결과 (`printenv | grep CLAUDE`):

```
CLAUDE_CODE_ENTRYPOINT=cli
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
CLAUDE_CODE_EXECPATH=/Users/popup-kay/.local/share/claude/versions/2.1.121
CLAUDECODE=1
```

`CLAUDE_SESSION_ID`, `CLAUDE_MODEL`, `CLAUDE_INPUT_TOKENS`, `CLAUDE_OUTPUT_TOKENS`, `CLAUDE_CODE_VERSION`, `CLAUDE_TURN_INDEX` — **모두 미설정**. 이는 우연이 아니라 CC의 설계이다. CC는 이 환경 변수들을 훅 프로세스에 주입하지 않는다.

---

## 2. Schema Gap — CC v2.1.118+ 실제 페이로드 vs. 현재 Adapter 파싱

### 2-A. CC Stop Hook 실제 stdin 페이로드 구조 (CC v2.1.x 기준)

CC가 `Stop` 이벤트에서 훅 프로세스 stdin으로 전달하는 실제 JSON 스키마:

```json
{
  "session_id": "sess_<uuid>",
  "transcript_path": "/path/to/transcript.jsonl",
  "stop_hook_active": false,
  "message": {
    "role": "assistant",
    "model": "claude-opus-4-5-20251101",
    "usage": {
      "input_tokens": 12340,
      "output_tokens": 5670,
      "cache_read_input_tokens": 8900,
      "cache_creation_input_tokens": 1000
    }
  }
}
```

### 2-B. CC SubagentStop 페이로드 구조

```json
{
  "session_id": "sess_<uuid>",
  "agent_id": "agent_<uuid>",
  "agent_type": "task",
  "agent_name": "qa-lead",
  "exit_code": 0,
  "transcript_path": "/path/to/transcript.jsonl",
  "message": {
    "role": "assistant",
    "model": "claude-sonnet-4-5",
    "usage": {
      "input_tokens": 4200,
      "output_tokens": 1800,
      "cache_read_input_tokens": 3100,
      "cache_creation_input_tokens": 200
    }
  }
}
```

### 2-C. 필드 대응 Gap 테이블

| 원하는 데이터 | CC 실제 제공 경로 | 현재 Adapter 읽는 경로 | Gap 유형 |
|---|---|---|---|
| session 식별자 | `payload.session_id` | `process.env.CLAUDE_SESSION_ID` | **MISSING — env 없음** |
| model 이름 | `payload.message.model` | `process.env.CLAUDE_MODEL` | **MISSING — env 없음** |
| CC 버전 | `process.env.CLAUDE_CODE_EXECPATH` (경로에서 파싱) 또는 `cc-bridge.detectCCVersion()` | `process.env.CLAUDE_CODE_VERSION` | **WRONG KEY — 존재하지 않는 env** |
| input tokens | `payload.message.usage.input_tokens` | `process.env.CLAUDE_INPUT_TOKENS` | **MISSING — env 없음** |
| output tokens | `payload.message.usage.output_tokens` | `process.env.CLAUDE_OUTPUT_TOKENS` | **MISSING — env 없음** |
| cache read tokens | `payload.message.usage.cache_read_input_tokens` | 미수집 (Port spec에도 없음) | **NOT TRACKED** |
| cache creation tokens | `payload.message.usage.cache_creation_input_tokens` | 미수집 | **NOT TRACKED** |
| turn index | CC가 명시적으로 제공하지 않음 | `process.env.CLAUDE_TURN_INDEX` | **BOTH MISSING** |

### 2-D. 올바른 추출 경로 (수정 시 참고)

```js
// hookContext는 unified-stop.js:244-250에서 이미 파싱됨
const sessionId   = hookContext.session_id || null;
const model       = hookContext.message?.model || 'unknown';
const usage       = hookContext.message?.usage || {};
const inputTokens = usage.input_tokens || 0;
const outputTokens = usage.output_tokens || 0;
const cacheReadTokens      = usage.cache_read_input_tokens || 0;
const cacheCreationTokens  = usage.cache_creation_input_tokens || 0;

// CC 버전은 cc-bridge를 통해 획득 (execpath 파싱)
const ccVersion   = ccRegression.detectCCVersion() || 'unknown';
```

---

## 3. Structured Logging Proposal

### 3-A. 확장 NDJSON 스키마 (token-ledger v2)

```json
{
  "ts": "2026-04-28T10:30:00.000Z",
  "schemaVersion": "2",
  "event": "stop",
  "sessionHash": "a3f7b2c1d4e5f6a7",
  "agent": "qa-lead",
  "model": "claude-opus-4-5-20251101",
  "ccVersion": "2.1.121",
  "turnId": "turn_<sessionHash_8>_<ts_epoch_ms>",
  "inputTokens": 12340,
  "outputTokens": 5670,
  "cacheReadInputTokens": 8900,
  "cacheCreationInputTokens": 1000,
  "totalBillableTokens": 18010,
  "overheadDelta": 0,
  "parseStatus": "ok",
  "parseWarnings": []
}
```

**핵심 추가 필드:**

| 필드 | 타입 | 근거 |
|---|---|---|
| `schemaVersion` | `"2"` | 레거시 v1 항목과 구분 |
| `event` | `"stop" \| "subagent_stop"` | 훅 이벤트 출처 식별 |
| `turnId` | string | 세션 내 turn-level 상관 ID |
| `cacheReadInputTokens` | number | Opus 4.7 1M context 핵심 지표 |
| `cacheCreationInputTokens` | number | 프롬프트 캐싱 비용 추적 |
| `totalBillableTokens` | number | `inputTokens + cacheCreationTokens` (cacheRead는 할인율 적용) |
| `parseStatus` | `"ok" \| "partial" \| "fallback"` | 방어 계층 가시성 |
| `parseWarnings` | string[] | 어떤 필드가 fallback됐는지 명시 |

### 3-B. turn-level 상관 ID 생성 방식

```js
// 제안: recordTurn 내부에서 자동 생성
function generateTurnId(sessionHash, ts) {
  const epoch = new Date(ts).getTime();
  return `turn_${sessionHash.slice(0, 8)}_${epoch}`;
}
```

이 ID는 audit-logger의 `actorId` 필드, cc-event-log의 `context.turnId` 필드와 연결 가능. 에이전트 팀 환경에서는 `SubagentStop` 이벤트의 `agent_id`를 포함해 agent-level 상관 ID도 병행 사용:

```json
{
  "turnId": "turn_a3f7b2c1_1745834600000",
  "agentCorrelationId": "agent_<uuid>",
  "parentSessionHash": "a3f7b2c1d4e5f6a7"
}
```

### 3-C. sessionHash 소스 수정

현재 `hashSession(process.env.CLAUDE_SESSION_ID || '')` → 항상 `'unknown'`

수정 후:
```js
// 우선순위: stdin payload → env (fallback) → 생성 불가
const sessionId = hookContext.session_id            // 1순위: stdin
               || process.env.CLAUDE_SESSION_ID     // 2순위: env (향후 CC 변경 대비)
               || null;
const sessionHash = hashSession(sessionId);         // null → 'unknown' + warning
```

### 3-D. model 및 ccVersion 소스 수정

```js
// model: stdin payload에서 직접
const model = hookContext.message?.model
           || process.env.CLAUDE_MODEL    // 대비책
           || 'unknown';

// ccVersion: cc-bridge.detectCCVersion() 사용 (CLAUDE_CODE_EXECPATH 파싱)
// lib/infra/cc-bridge.js:46-59에 이미 구현됨
const ccVersionDetected = (() => {
  try { return require('../lib/cc-regression').detectCCVersion(); } catch { return null; }
})();
const ccVersion = ccVersionDetected || 'unknown';
```

---

## 4. Request ID Propagation — Turn-level + Agent-level 상관 ID

### 4-A. 현재 상태 (Gap)

bkit은 현재 request/turn 수준의 상관 ID 체계가 없음. audit-logger의 `actorId`는 스크립트 이름(`'unified-stop'`)으로 고정되어 있어 특정 turn을 추적할 수 없음.

### 4-B. 제안 ID 계층 구조

```
Session Level:   sessionHash (SHA-256 of session_id, 16 hex chars)
  └── Turn Level:   turnId = "turn_{sessionHash[0:8]}_{epoch_ms}"
        └── Agent Level:  agentCorrelationId = agent_id from SubagentStop payload
              └── Tool Level: (PostToolUse 이벤트의 tool_name + timestamp)
```

### 4-C. 훅 이벤트별 전파 매핑

| 훅 이벤트 | stdin payload에서 추출 | 상관 ID 전파 대상 |
|---|---|---|
| `SessionStart` | `session_id` → `sessionHash` | `.bkit/runtime/session-ctx-fp` 에 저장 |
| `Stop` | `session_id`, `message.model`, `message.usage` | `token-ledger.ndjson` + `cc-event-log.ndjson` |
| `SubagentStop` | `session_id`, `agent_id`, `message.model`, `message.usage` | `token-ledger.ndjson` (agent 필드 포함) |
| `PostToolUse` | `session_id`, `tool_name` | 현재 미수집; v2.1.13에서 옵션 검토 |
| `PreCompact` | `session_id` | `precompact-counter.ndjson` (이미 수집) |

### 4-D. SessionStart에서 sessionHash 초기화

`hooks/session-start.js`가 이미 stdin 페이로드를 수신함. SessionStart에서 sessionHash를 계산해 `.bkit/runtime/session-ctx-fp`에 저장하면, 이후 Stop/SubagentStop에서 파일 읽기로 재사용 가능:

```js
// hooks/startup/session-context.js (제안 추가)
const { parseHookInput, getSessionId } = require('../../lib/infra/cc-bridge');
const { hashSession } = require('../../lib/cc-regression/token-accountant');

function initSessionHash(rawStdin) {
  const input = parseHookInput(rawStdin);
  const sessionId = getSessionId(input);
  const sessionHash = hashSession(sessionId);
  // 세션 컨텍스트에 저장 (기존 session-ctx-fp 패턴 사용)
  return sessionHash;
}
```

---

## 5. Hotfix Patch Sketch — v2.1.13 Sprint

> **경고**: 이 섹션은 설계 스케치이며 구현 코드가 아님. 실제 패치는 v2.1.13 sprint에서 전체 테스트와 함께 적용할 것.

### 5-A. unified-stop.js 변경 (688~701번째 줄)

**현재 (결함)**:
```js
ccRegression.recordTurn({
  sessionId:    process.env.CLAUDE_SESSION_ID || '',
  model:        process.env.CLAUDE_MODEL || 'unknown',
  ccVersion:    process.env.CLAUDE_CODE_VERSION || 'unknown',
  inputTokens:  parseInt(process.env.CLAUDE_INPUT_TOKENS || '0', 10),
  outputTokens: parseInt(process.env.CLAUDE_OUTPUT_TOKENS || '0', 10),
  overheadDelta: parseInt(process.env.CLAUDE_OVERHEAD_DELTA || '0', 10),
});
```

**패치 스케치**:
```js
// hookContext는 이미 파싱되어 있음 (unified-stop.js:244-250)
const _usage = hookContext.message?.usage || {};
ccRegression.recordTurn({
  sessionId:    hookContext.session_id || process.env.CLAUDE_SESSION_ID || '',
  agent:        activeAgent || 'main',
  model:        hookContext.message?.model || process.env.CLAUDE_MODEL || 'unknown',
  ccVersion:    ccRegression.detectCCVersion() || 'unknown',
  turnIndex:    0,  // CC가 제공하지 않음 — 향후 CAND-004 OTEL으로 대체 고려
  inputTokens:  _usage.input_tokens || 0,
  outputTokens: _usage.output_tokens || 0,
  cacheReadInputTokens:     _usage.cache_read_input_tokens || 0,
  cacheCreationInputTokens: _usage.cache_creation_input_tokens || 0,
  overheadDelta: 0,
});
```

### 5-B. token-accountant.js 변경

**recordTurn signature 확장** (v1 → v2):

```js
// 추가 필드 (lib/cc-regression/token-accountant.js:65-76)
function recordTurn(meta = {}) {
  const parseWarnings = [];

  // sessionHash: 빈 문자열 → warning 추가
  let sessionHash = hashSession(meta.sessionId);
  if (sessionHash === 'unknown') {
    parseWarnings.push('session_id_missing');
  }

  const entry = {
    ts: new Date().toISOString(),
    schemaVersion: '2',
    event: meta.event || 'stop',
    sessionHash,
    agent: typeof meta.agent === 'string' ? meta.agent : 'unknown',
    model: (typeof meta.model === 'string' && meta.model) ? meta.model : (() => { parseWarnings.push('model_missing'); return 'unknown'; })(),
    ccVersion: (typeof meta.ccVersion === 'string' && meta.ccVersion !== 'unknown') ? meta.ccVersion : (() => { parseWarnings.push('ccVersion_missing'); return 'unknown'; })(),
    inputTokens: Number.isFinite(meta.inputTokens) ? meta.inputTokens : 0,
    outputTokens: Number.isFinite(meta.outputTokens) ? meta.outputTokens : 0,
    cacheReadInputTokens: Number.isFinite(meta.cacheReadInputTokens) ? meta.cacheReadInputTokens : 0,
    cacheCreationInputTokens: Number.isFinite(meta.cacheCreationInputTokens) ? meta.cacheCreationInputTokens : 0,
    overheadDelta: Number.isFinite(meta.overheadDelta) ? meta.overheadDelta : 0,
    parseStatus: parseWarnings.length === 0 ? 'ok' : 'partial',
    parseWarnings,
  };
  // ... 나머지 동일
}
```

### 5-C. Port spec 확장 (token-meter.port.js)

`TurnMetadata` typedef에 추가 필요:

```js
/**
 * @typedef {Object} TurnMetadata
 * @property {string} ts
 * @property {string} sessionHash
 * @property {string} agent
 * @property {string} model
 * @property {string} ccVersion
 * @property {string} event            // NEW: 'stop' | 'subagent_stop'
 * @property {number} turnIndex
 * @property {number} inputTokens
 * @property {number} outputTokens
 * @property {number} cacheReadInputTokens     // NEW: Opus 4.7 1M cache hit
 * @property {number} cacheCreationInputTokens // NEW: cache write cost
 * @property {number} overheadDelta
 * @property {string} parseStatus      // NEW: 'ok' | 'partial' | 'fallback'
 * @property {string[]} parseWarnings  // NEW: 어떤 필드가 fallback됐는지
 */
```

### 5-D. SubagentStop도 동일 패턴으로 수정

`scripts/subagent-stop-handler.js`에 현재 `recordTurn` 호출이 없음. SubagentStop에서도 토큰 기록이 필요하다면 추가:

```js
// subagent-stop-handler.js 마지막 블록에 추가 (패치 스케치)
try {
  const _usage = hookContext.message?.usage || {};
  const cc = require('../lib/cc-regression');
  cc.recordTurn({
    event: 'subagent_stop',
    sessionId: hookContext.session_id || null,
    agent: agentName,
    model: hookContext.message?.model || 'unknown',
    ccVersion: cc.detectCCVersion() || 'unknown',
    inputTokens: _usage.input_tokens || 0,
    outputTokens: _usage.output_tokens || 0,
    cacheReadInputTokens: _usage.cache_read_input_tokens || 0,
    cacheCreationInputTokens: _usage.cache_creation_input_tokens || 0,
  });
} catch (_e) { /* fail-silent */ }
```

---

## 6. Defense-in-Depth — Silent Zero 문제 해결

### 6-A. 현재 문제: 완전한 침묵 실패

현재 코드는:
1. env var가 없으면 → `0` 또는 `'unknown'` fallback
2. 아무런 경고/로그 없이 조용히 쓰레기 데이터를 ledger에 기록
3. `parseWarnings` 필드가 없어서 나중에 어떤 항목이 신뢰할 수 없는지 판단 불가

### 6-B. 방어 계층 제안 (4단계)

#### Layer 1: Parse Status 추적 (token-accountant.js)

위 5-B에서 제안한 `parseStatus: 'ok' | 'partial' | 'fallback'` 및 `parseWarnings` 배열.

`parseStatus === 'fallback'`이면 핵심 필드(session, model, tokens) 전부 미수집 상태. 이 항목은 통계 집계에서 제외해야 함.

#### Layer 2: BKIT_DEBUG 경고 로그 (token-accountant.js)

```js
// recordTurn 내부 (현재 BKIT_DEBUG 패턴 이미 사용 중 — 84번째 줄 참조)
if (parseWarnings.length > 0 && process.env.BKIT_DEBUG) {
  console.error(`[TokenAccountant] WARN partial record: ${parseWarnings.join(', ')}`);
}

// parseStatus === 'fallback'이면 ERROR 레벨
if (parseStatus === 'fallback' && process.env.BKIT_DEBUG) {
  console.error('[TokenAccountant] ERROR all fields fallback — stdin payload not read');
}
```

#### Layer 3: 통계 쿼리에서 partial/fallback 제외

`getLedgerStats()` 수정:

```js
function getLedgerStats() {
  // ...
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      total++;
      if (entry.parseStatus === 'fallback') { fallbackCount++; continue; }  // 집계 제외
      // ... 나머지 집계 로직
    }
  }
  return { total, validEntries: total - fallbackCount, fallbackCount, avgOverhead, sonnetTurns };
}
```

#### Layer 4: cc-event-log에 WARN 이벤트 기록

특히 연속 N개 항목이 `parseStatus === 'fallback'`인 경우 `cc-event-log.ndjson`에 시스템 경고 이벤트 기록:

```js
// 연속 10개 이상 fallback 시 (비동기 non-blocking)
if (consecutiveFallbacks >= 10) {
  ccRegression.recordEvent({
    hookEvent: 'token_meter_degraded',
    ccVersion: 'unknown',
    sessionId: null,
    timestamp: new Date().toISOString(),
    context: {
      level: 'WARN',
      message: 'TokenMeter all entries are fallback — payload extraction likely broken',
      consecutiveFallbacks,
    },
  });
}
```

---

## 7. 근본 원인 요약 다이어그램

```
CC Runtime (Stop 이벤트 발생)
        │
        ├── stdin → JSON payload (session_id, message.model, message.usage.*)
        │
        └── 환경 변수 → CLAUDE_CODE_ENTRYPOINT, CLAUDECODE, ... (CLAUDE_SESSION_ID 등 없음)
                │
                ▼
unified-stop.js (scripts/unified-stop.js:244-250)
        │
        ├── hookContext = JSON.parse(stdin)  ← 올바른 파싱 (사용됨)
        │     └── hookContext.session_id     ← 존재하지만 사용 안 됨
        │     └── hookContext.message.model  ← 존재하지만 사용 안 됨
        │     └── hookContext.message.usage  ← 존재하지만 사용 안 됨
        │
        └── recordTurn (688-701번째 줄)     ← 결함 지점
              └── process.env.CLAUDE_SESSION_ID → ''   → 'unknown'
              └── process.env.CLAUDE_MODEL      → undefined → 'unknown'
              └── process.env.CLAUDE_INPUT_TOKENS → undefined → 0
                        │
                        ▼
              token-accountant.js:recordTurn()
                        │
                        └── ledger entry: 모든 필드 fallback 기본값
                                          472/472 항목 동일 증상
```

---

## 8. v2.1.13 Sprint 권장 작업 범위

### 필수 (P0)

1. `scripts/unified-stop.js:688-701` — `hookContext` 기반으로 7개 필드 추출로 전환
2. `lib/cc-regression/token-accountant.js:65-76` — `cacheReadInputTokens`, `cacheCreationInputTokens`, `parseStatus`, `parseWarnings` 필드 추가
3. `lib/domain/ports/token-meter.port.js` — `TurnMetadata` typedef 확장 (Port spec 동기화)

### 권장 (P1)

4. `scripts/subagent-stop-handler.js` — SubagentStop에서도 `recordTurn()` 호출 추가 (현재 없음)
5. `lib/cc-regression/token-accountant.js:getLedgerStats()` — `fallbackCount` 반환 + partial 항목 집계 제외
6. BKIT_DEBUG 모드에서 `parseWarnings` 콘솔 출력

### 선택 (P2)

7. `hooks/startup/session-context.js` — SessionStart에서 sessionHash 계산 → `.bkit/runtime/session-ctx-fp`에 저장 (Stop 훅에서 재사용)
8. 레거시 v1 항목 마이그레이션 스크립트 (472개 항목에 `schemaVersion: "1"` 태깅)
9. CARRY-4 해결 후 `tests/qa/` 정책 재검토와 함께 token-meter contract test 추가

---

## 9. 참고 파일 위치 요약

| 파일 | 라인 | 역할 |
|---|---|---|
| `scripts/unified-stop.js` | 688-701 | **결함 지점** — env var 기반 recordTurn 호출 |
| `scripts/unified-stop.js` | 244-250 | hookContext 파싱 (올바름, 재활용 가능) |
| `lib/cc-regression/token-accountant.js` | 65-76 | Adapter recordTurn — fallback 처리 |
| `lib/cc-regression/token-accountant.js` | 46-48 | hashSession — 빈 문자열 → 'unknown' |
| `lib/domain/ports/token-meter.port.js` | 11-22 | Port TurnMetadata typedef (확장 필요) |
| `lib/infra/cc-bridge.js` | 46-59 | detectCCVersion() (재활용 가능) |
| `lib/infra/cc-bridge.js` | 69-73 | getSessionId() (재활용 가능) |
| `scripts/subagent-stop-handler.js` | 전체 | SubagentStop — recordTurn 호출 없음 |
| `.bkit/runtime/token-ledger.ndjson` | 472 lines | 전부 fallback 데이터 |

---

*분석 완료: 2026-04-28. 다음 단계: v2.1.13 sprint 계획 수립 시 이 분석 문서를 Plan 단계 입력으로 사용.*
