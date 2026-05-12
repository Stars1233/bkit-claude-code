---
feature: bkit-v2110-gap-closure
status: 🏗️ Design Ready (Sprint 5a 착수 가능)
target: bkit v2.1.10
cc_compat: v2.1.117+
architecture_choice: Option C (Pragmatic Balance) with Sprint 6 Structural Extension
source_plan: docs/01-plan/features/bkit-v2110-gap-closure-plan-plus.plan.md (§20 SCOPE EXTENSION 반영)
created: 2026-04-22
---

# bkit v2.1.10 Gap Closure — Design

> **상위 Plan-Plus §20 (Scope Extension)** 을 기반으로 Sprint 5a/5b/5.5/6 전체의 **구현 가능한 상세 설계**를 제공한다. Plan-Plus가 "무엇을/왜"라면 본 Design은 **"어떻게/어디에/어느 순서로"**를 정의한다.
> **설계 원칙**:
> 1. 기존 Clean Architecture 4-layer 유지 (Domain 의존성 0, no new external npm in lib/)
> 2. 새 adapter 추가는 **integration-runtime.test.js로 방어 필수** (Sprint 4.5 재귀 사건 학습)
> 3. 단일 진실원(Single Source of Truth) 원칙: 버전은 `bkit.config.json:version`, 수치는 `lib/domain/rules/docs-code-invariants.js`
> 4. YAGNI: 본 Design은 Plan-Plus §20.3 MoSCoW 항목만 다룸

---

## 📌 Context Anchor (Plan-Plus 이관)

| 축 | 내용 |
|----|------|
| **WHY** | Sprint 0~4.5의 투자를 "유기적으로 하나의 시스템"으로 완결. 릴리스는 본 브랜치 Complete 후 Main PR로 분리. |
| **WHO** | 1차: 본 브랜치 컨트리뷰터 + 곧 v2.1.10 사용자(Starter/Dynamic/Enterprise). 2차: Sprint 6 구조 확장으로 인한 legacy 영향자. |
| **RISK** | (R1) 새 adapter 추가 중 Sprint 4.5 재귀 재발. (R2) ENH-202 대상 skill의 fork 시 실질 Context Isolation 효과 검증 어려움. (R3) L5 Playwright 도입 시 CI 시간 증가 + 브라우저 바이너리 300MB+. (R4) legacy 3모듈 제거가 상위 호출자(예: dashboard)에서 미감지 참조 발생. (R5) MEMORY 분해 중 기존 `/memory` 참조 깨짐. |
| **SUCCESS** | D1~D18 (Plan-Plus §20.4). Release Gate = D1~D7 ∧ D9~D18. |
| **SCOPE** | Sprint 5a/5b/5.5/6 전량. Main PR 머지 / `git tag v2.1.10` / GitHub Release 노트는 **범위 밖**. |

---

## 1. Overview

### 1.1 현황 (한 단락)

`feat/v2110-integrated-enhancement` 브랜치에는 Sprint 0~4.5의 결과물(+14,016/-1,076 라인, 96 test files, 3,583 TC)이 축적되어 있다. Plan-Plus 4개 분석이 공통적으로 확인한 핵심 gap은 **릴리스 메타 미정비 + Port↔Adapter 매핑 불완전 + 1/39 skill만 context:fork + legacy 3모듈 잔존 + MEMORY/design 대형 문서 정리 필요**이다. 본 Design은 이를 **Sprint 5a(릴리스 메타 + aggregator 확장) → Sprint 5b(CHANGELOG/README) → Sprint 5.5(hook 3곳 + CI + 관찰 counter) → Sprint 6(구조 확장 9건)** 순으로 해결한다. 모든 산출물은 기존 3개 CI 스크립트(`check-guards.js`, `docs-code-sync.js`, `check-deadcode.js`) + 신규 2개(`docs-code-sync.js` BKIT_VERSION 확장, `l3-mcp-runtime.test.js`)로 자동 검증된다.

### 1.2 전체 변경 규모 (견적)

| 카테고리 | 신규 파일 | 수정 파일 | 제거 파일 | 라인 증감 |
|---------|----------|----------|----------|----------|
| Sprint 5a | 2 | 8 | 0 | +500 / -50 |
| Sprint 5b | 0 | 2 | 0 | +200 / -20 |
| Sprint 5.5 | 3 | 5 | 0 | +400 / -20 |
| Sprint 6 | 15 | 20 | 3 | +2,500 / -500 |
| **합계** | **20** | **35** | **3** | **+3,600 / -590** |

### 1.3 전체 Task Count (Plan-Plus T1~T26 + Sprint 6 신규 T27~T60)

- Sprint 5a: T1~T16 (16개)
- Sprint 5b: T17~T18 (2개, T19 PR 생성 / T20 tag 제외)
- Sprint 5.5: T27~T35 (9개)
- Sprint 6: T36~T60 (25개)
- Iterate/QA/문서 동기화: T61~T70 (10개)

---

## 2. Architecture

### 2.1 레이어 배치 (Sprint 6 이후 최종)

```
┌─ Presentation ─────────────────────────────────────────┐
│  hooks/session-start.js (BKIT_VERSION 주입, cc-bridge) │
│  scripts/unified-stop.js (token-accountant)             │
│  scripts/session-end-handler.js (cc-regression attr)    │
│  scripts/subagent-stop-handler.js (cc-regression attr)  │
│  scripts/pre-write.js, unified-bash-pre.js (기존)       │
└────────────────────┬──────────────────────────────────┘
                     ▼
┌─ Application ──────────────────────────────────────────┐
│  lib/pdca/{state-machine, status-core, status-migration,│
│            status-cleanup, automation, feature-manager} │
│  lib/cc-regression/{defense-coordinator, lifecycle,     │
│                     token-accountant, attribution-fmt}  │
│  lib/team/{coordinator, strategy, ...} (기존)           │
│  lib/audit/audit-logger.js (기존, createOtelSink 단일)  │
└────────────────────┬──────────────────────────────────┘
                     ▼
┌─ Domain ───────────────────────────────────────────────┐
│  lib/domain/ports/{cc-payload, state-store,             │
│                    regression-registry, audit-sink,     │
│                    token-meter, docs-code-index}        │
│  lib/domain/guards/{enh-254/262/263/264, dangerous-pat} │
│  lib/domain/rules/docs-code-invariants.js               │
│  lib/cc-regression/registry.js (Guard 데이터)           │
│  (의존성 0 유지, no fs/child_process/net)               │
└────────────────────▲──────────────────────────────────┘
                     │ implements
┌─ Infrastructure ───┴──────────────────────────────────┐
│  lib/infra/cc-bridge.js          [Sprint 6 NEW]        │
│  lib/infra/telemetry.js (기존, createOtelSink only)    │
│  lib/infra/docs-code-scanner.js (기존 + BKIT_VERSION)  │
│  lib/infra/mcp-test-harness.js   [Sprint 6 NEW]        │
│  lib/core/state-store.js, context-budget.js, ...       │
└────────────────────────────────────────────────────────┘
```

### 2.2 신규 Port↔Adapter 매핑 (Sprint 6 완결 후)

| Port | Adapter (구현체) | 주입 지점 | Sprint |
|------|-----------------|----------|:------:|
| `cc-payload.port.js` | `lib/infra/cc-bridge.js` (신규) | `hooks/session-start.js:1` | 6 |
| `state-store.port.js` | `lib/core/state-store.js` (기존) | `lib/pdca/status-core.js`, `lib/cc-regression/lifecycle.js` | 기존 |
| `regression-registry.port.js` | `lib/cc-regression/registry.js` | `lib/cc-regression/defense-coordinator.js` | 기존 |
| `audit-sink.port.js` | `lib/infra/telemetry.js` (`createOtelSink`) | `lib/audit/audit-logger.js:219` | 기존 |
| `token-meter.port.js` | `lib/cc-regression/token-accountant.js` | `scripts/unified-stop.js` | 기존 + 5.5 재검증 |
| `docs-code-index.port.js` | `lib/infra/docs-code-scanner.js` | `scripts/docs-code-sync.js` | 기존 + 6 BKIT_VERSION 확장 |

### 2.3 3-옵션 비교 (Sprint 5a 전체 판단)

| 결정 | Option A (Minimal) | Option B (Full Clean Architecture) | Option C (Pragmatic Balance) | 선택 |
|------|-------------------|-----------------------------------|----------------------------|:----:|
| 전체 접근 | Sprint 5a/5b만, 5.5/6은 v2.1.11 이월 | 전체를 Clean Architecture로 재구조화 (대규모 리팩토링) | Sprint 5a/5b/5.5/6 차례 진행, 기존 구조 유지 | **C** |
| Sprint 5a 버전 전파 | plugin.json 수정만 | bkit.config.json + plugin.json + BKIT_VERSION Port 신설 | bkit.config.json + plugin.json, BKIT_VERSION 기존 lib/core/version.js 활용 | **C** |
| Sprint 5.5 hook 확장 | 1곳만(SessionEnd) | 전 21 hook 통합 | 3곳(Stop, SessionEnd, SubagentStop) | **C** |
| legacy 3모듈 | 유지 (warning only) | 전량 제거 + 호출자 리팩토링 | 10 LOC stub 즉시 제거, 150/261 LOC는 평가 후 흡수 또는 제거 | **C** |
| MEMORY 분해 | 안 함 | 전체 리팩 + 새 index 구조 | 291 → 인덱스 150 + 3 detail 파일 | **C** |
| L5 E2E | skip | 10+ 시나리오 풀 커버리지 | 5 핵심 시나리오 (PDCA 주 경로) | **C** |

**근거**:
- **A는 사용자 Q2 답변(Sprint 5.5/6 편입) 위반**
- **B는 Sprint 4.5 재귀 교훈(새 adapter 방어 필수)을 감당 불가, 범위 폭발**
- **C는 증거 기반 점진 확장 + 기존 구조 재사용. integration-runtime.test.js 방어선 활용 가능**

---

## 3. Sprint별 상세 설계

### 3.1 Sprint 5a — 릴리스 메타 + aggregator + Registry 정합 (T1~T16)

#### 3.1.1 Module Map

| 모듈 | 경로 | 변경 유형 | Session |
|-----|------|:--------:|:------:|
| bkit.config.json | `./bkit.config.json` | Edit (version) | 1 |
| plugin.json | `./.claude-plugin/plugin.json` | Edit (version + description) | 1 |
| session-start.js | `./hooks/session-start.js` | Edit (BKIT_VERSION 참조) | 1 |
| qa-aggregate.js | `./test/contract/scripts/qa-aggregate.js` | Edit (TEST_DIRS 확장 + expectedFailure) | 1 |
| aggregate-scope.test.js | `./test/contract/aggregate-scope.test.js` | **신규** | 1 |
| registry-expected-fix.test.js | `./test/contract/registry-expected-fix.test.js` | **신규** | 1 |
| MEMORY.md | `/Users/popup-kay/.claude/projects/.../memory/MEMORY.md` | Edit (수치 교정) | 2 |
| _skills-overview.md | `./skills/_skills-overview.md` | Edit (v2.1.10 태그) | 2 |
| README.md | `./README.md` | Edit (Port 매핑표 + CTO Team 동적 표) | 2 |
| .bkit/audit/cc-tools.txt | `./.bkit/audit/cc-tools.txt` | **신규** (ENH-256 실행 결과) | 2 |

#### 3.1.2 세부 절차 (Session 1: Core changes ~1.5h)

**T1. lib/core/version.js는 변경 없음** — 이미 bkit.config.json을 우선 참조

**T2. bkit.config.json:2** `"version": "2.1.9"` → `"version": "2.1.10"` — 1줄

**T3. .claude-plugin/plugin.json**:
- `:3` `"version": "2.1.9"` → `"version": "2.1.10"`
- `:5` `"description"` 재서술:
  ```
  "description": "bkit: Claude Code vibecoding plugin — PDCA-driven development automation with CTO-Led Agent Teams. 39 Skills, 36 Agents, 24 Hook Blocks, 16 MCP Tools. Clean Architecture + Defense-in-Depth 4-Layer + Invocation Contract. See docs/ for details."
  ```
  - 근거: Plan-Plus §4.4 옵션 C + 사용자 요청 확장 후 "16 MCP Tools" 추가

**T4. hooks/session-start.js:264** systemMessage 치환:
```javascript
// Before
systemMessage: `bkit Vibecoding Kit v2.1.9 activated (Claude Code)`,
// After (파일 상단에 이미 있는 require 재사용 여부 확인 필요)
const { BKIT_VERSION } = require('../lib/core/version');
// ...
systemMessage: `bkit Vibecoding Kit v${BKIT_VERSION} activated (Claude Code)`,
```

**T5. aggregator 확장**:
- `TEST_DIRS` 상수에 `{ dir: path.join(PROJECT_ROOT, 'tests', 'qa'), label: 'qa-legacy' }` 추가
- `expectedFailure` 배열 추가 (`test/unit/project-isolation.test.js`, `test/unit/runner.test.js` 2건)
- 집계 시 `fail` 계산에서 `expectedFailure`의 `fail` 제거 + `expectedFail` 별도 집계
- 출력에 `Expected Failures: N (tracked, excluded from fail count)` 라인

**T6. 신규 TC `aggregate-scope.test.js`** (단순):
```javascript
// tests/qa/ 디렉토리가 집계 범위에 포함되는지 + expectedFailure 분리 집계
```

**T7. registry-expected-fix.test.js**:
- `semverLt('2.1.117', '2.1.118')` === true
- `getActive('2.1.117')` 결과에 ENH-262 포함
- `getActive('2.1.118')` 결과에 ENH-262 미포함 (자동 해제)
- `expectedFix: null` 항목은 CC 버전 무관 항상 active

#### 3.1.3 Session 2 (Docs sync, ~1h)

**T8. MEMORY.md 3행** (상단):
- Before: `**Architecture** (2026-04-21 실측, ENH-263): **39 Skills, 36 Agents, 21 Hook Events, 101 Lib Modules, 24,616 LOC in lib/, 43 Scripts, 2 MCP Servers**`
- After: `**Architecture** (2026-04-22 실측, v2.1.10 완결): **39 Skills, 36 Agents, 21 Hook Events (24 blocks), 123 Lib Modules, 26,296 LOC in lib/, 46 Scripts, 2 MCP Servers, 16 MCP Tools**`

**T9. skills/_skills-overview.md:3** — v2.1.9 → v2.1.10

**T10. README.md**: 상단에 `## Architecture` 섹션 추가 (Plan-Plus §4.4, 8.1 S5 매핑표). 동적 CTO Team 표기.

**T11. ENH-256 실행**: `node scripts/cc-tool-audit.js > .bkit/audit/cc-tools.txt` (파일 없으면 로컬 skips, Sprint 6에서 신설)

#### 3.1.4 검증 (Gate)

```bash
jq '.version' .claude-plugin/plugin.json  # "2.1.10"
jq '.version' bkit.config.json  # "2.1.10"
echo '{"hook_event_name":"SessionStart"}' | node hooks/session-start.js 2>/dev/null | jq -r '.systemMessage'
# → "bkit Vibecoding Kit v2.1.10 activated (Claude Code)"
grep -r "v2\.1\.9" hooks/ scripts/ lib/core/ README.md | grep -v CHANGELOG | wc -l  # 0
node scripts/check-guards.js  # PASSED
node scripts/docs-code-sync.js  # PASSED (Sprint 6 BKIT_VERSION 검증은 나중)
node scripts/check-deadcode.js  # PASSED
node test/contract/scripts/qa-aggregate.js  # PASS ≥ 3,583
```

### 3.2 Sprint 5b — CHANGELOG + README What's New (T17~T18)

CHANGELOG.md 작성 (Plan-Plus §8.2 템플릿 사용) — Sprint 5 전체 완료 후 작성 예정. README "What's New" 섹션 추가.

**Design 결정**: CHANGELOG는 **Sprint 6 전체 완료 후** 작성하여 최종 수치를 반영. Sprint 5b는 README 업데이트만 선행, CHANGELOG는 Sprint 6 종료 후 배치.

→ **Sprint 5b T17 재분류**: "CHANGELOG 초안 scaffolding"만. T17b "CHANGELOG 최종 작성"은 Sprint 6 후 수행.

### 3.3 Sprint 5.5 — hook attribution + CI domain ESLint + 관찰 counter (T27~T35)

#### 3.3.1 Module Map

| 모듈 | 변경 유형 | 근거 |
|------|:---------:|------|
| scripts/unified-stop.js | Edit | G-W1, cc-regression attribution 추가 |
| scripts/session-end-handler.js | Edit | G-W1 |
| scripts/subagent-stop-handler.js | Edit | G-W1 |
| .github/workflows/contract-check.yml | Edit | C2, eslint lib/domain/ step |
| docs/context-engineering.md | Edit | C3, `once:true` 기술부채 섹션 |
| scripts/precompact-counter.js | **신규** | C4, ENH-247 PreCompact 발화 counter |
| lib/cc-regression/guards/mon-cc-02-counter.js | **신규** | C4, ENH-257 2주 실측 카운터 |
| test/contract/l2-hook-attribution.test.js | **신규** | 3곳 hook attribution 통합 TC |
| scripts/context-compaction.js | Edit | ENH-247 counter 훅 연결 |

#### 3.3.2 hook attribution 패턴 (3곳 통일)

```javascript
// Pattern (각 hook handler 공통):
try {
  const { CCRegression } = require('../lib/cc-regression');
  const ccVersion = CCRegression.detectCCVersion();
  if (ccVersion) {
    // 이 hook에서 발생한 event가 CC 회귀와 관련이 있는지 attribution
    CCRegression.recordEvent({
      hookEvent: 'Stop|SessionEnd|SubagentStop',
      ccVersion,
      sessionId: input.session_id,
      timestamp: new Date().toISOString(),
    });
  }
} catch (e) {
  // fail-open: attribution 실패해도 hook 정상 종료
}
```

- `CCRegression.recordEvent`는 `cc-regression/index.js`에 신규 export (도메인은 영향 없음, Application 레이어)
- 내부 구현은 `.bkit/runtime/cc-event-log.ndjson`에 NDJSON 1줄 append
- integration-runtime.test.js에 "recordEvent 재귀 없음" TC 추가 (Sprint 4.5 방어선 유지)

#### 3.3.3 CI domain ESLint

`.github/workflows/contract-check.yml`에 step 추가:
```yaml
- name: Domain Layer Purity Check
  run: |
    npx eslint lib/domain/ \
      --rule 'no-restricted-imports: [error, {"patterns": ["fs", "child_process", "net", "http", "https", "os"]}]' \
      --no-eslintrc
```

### 3.4 Sprint 6 — 구조 확장 9건 (T36~T60)

#### 3.4.1 NEW 6-1: ENH-202 `context: fork` 확대 (T36~T40)

**대상 skill 선정 (8개)**:
1. `qa-phase` — 이미 Task 기반 무거운 작업
2. `phase-1-schema` — 스키마 탐색 readonly 성격
3. `phase-2-convention` — 컨벤션 탐색 readonly
4. `phase-3-mockup` — UI mockup 생성, 전용 컨텍스트 유리
5. `phase-4-api` — API 설계 readonly
6. `phase-5-design-system` — 탐색 readonly
7. `phase-8-review` — 코드 리뷰, 격리 유리
8. `skill-status` — 스킬 상태 조회 readonly

**제외 사유**:
- `phase-6-ui-integration`, `phase-7-seo-security`, `phase-9-deployment` — 실 코드 수정 유발(race condition 위험)
- `pdca` — 상태 파일 수정
- `bkend-*` — 외부 서버 호출

**변경 패턴** (각 SKILL.md 상단 frontmatter):
```yaml
---
name: qa-phase
description: ...
context: fork
---
```

**L1 TC** (`test/contract/context-fork-l1.test.js` 신규):
- `grep -l "^context: fork" skills/*/SKILL.md | wc -l` ≥ 8
- 각 fork skill이 SKILL.md에서 YAML frontmatter 문법 오류 없음 검증

#### 3.4.2 NEW 6-2: legacy 3모듈 정리 (T41~T44)

**T41 `lib/core/hook-io.js` (10 LOC)**: stub 확인 후 **즉시 제거**. 모든 참조자 grep → 없으면 파일 삭제.

**T42 `lib/context/ops-metrics.js` (150 LOC)**: 참조자 grep → 사용처가 1~2곳이면 **인라인 통합 후 제거**. 사용처 >3이면 `lib/core/ops-metrics.js`로 이동 후 warning 해제.

**T43 `lib/pdca/deploy-state-machine.js` (261 LOC)**: `lib/pdca/state-machine.js`(948 LOC)가 기존 핵심이므로, deploy-state-machine의 고유 로직 추출 후 state-machine.js의 한 섹션으로 흡수. 흡수 불가능한 로직(skills/deploy 관련)은 `lib/pdca/deploy-state.js`(간결화 버전)로 이동.

**T44 `scripts/check-deadcode.js` LEGACY_DEBT 목록 정리**: 제거된 3파일 목록 삭제 + 총 lib 수치 재계산.

#### 3.4.3 NEW 6-3: cc-bridge.js 신설 (T45~T47)

**파일**: `lib/infra/cc-bridge.js` (~120 LOC)

**구현 내용**:
```javascript
/**
 * CC Payload Bridge — Adapter for cc-payload.port.js
 * Extracts CC version, session context, and hook input from raw stdin JSON.
 *
 * Design Ref: bkit-v2110-gap-closure.design.md §3.4.3
 *
 * @module lib/infra/cc-bridge
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {import('../domain/ports/cc-payload.port').CCPayload} CCPayload
 */

function parseHookInput(rawStdin) { /* ... */ }
function detectCCVersion() { /* env CLAUDE_CODE_VERSION or package.json */ }
function getSessionId(input) { /* ... */ }
function isBypassMode() { /* BKIT_CC_REGRESSION_BYPASS */ }

module.exports = { parseHookInput, detectCCVersion, getSessionId, isBypassMode };
```

**주입 지점**: `hooks/session-start.js:1-5`에서 `const cc = require('../lib/infra/cc-bridge');` 후 기존 inline 코드 대체.

**L2 TC** (`test/contract/cc-bridge.test.js`): 각 함수 단위 테스트 10+.

#### 3.4.4 NEW 6-4: MCP stdio L3 런타임 러너 (T48~T50)

**파일**: `test/contract/l3-mcp-runtime.test.js` (~200 LOC)

**알고리즘**:
1. `spawn('node', ['servers/bkit-pdca-server/index.js'])` — stdio 파이프
2. MCP initialize 요청 송신 → capabilities 수신
3. `tools/list` 요청 → 16 tools 목록 확인
4. 각 tool의 inputSchema 파싱 → baseline과 비교
5. (선택) 1개 tool의 minimal 입력으로 `tools/call` 실 호출 → 응답 shape 검증

**의존성**: `node:child_process.spawn`, MCP 메시지는 JSON-RPC 2.0 line-delimited → 자체 구현 (npm 추가 금지).

#### 3.4.5 NEW 6-5: L5 E2E Playwright (T51~T55)

**⚠️ 특이 사항**: `package.json` 존재 여부 확인 필요 (bkit은 Claude Code 플러그인, 자체 package.json 미존재 가능).

**대안 1 (npm 의존 생성 필요)**: `package.json` 신설 + `@playwright/test` devDependency.

**대안 2 (의존 회피)**: Playwright 대신 **shell 기반 smoke** — `expect`/`pexpect`-like 자체 구현. bkit.config.json의 Self-contained 원칙 고려.

**결정**: **대안 2 채택**. `test/e2e/` 5개 시나리오를 **bash 스크립트**로 작성:
- `test/e2e/01-session-start-smoke.sh`: SessionStart → systemMessage check
- `test/e2e/02-pdca-plan-smoke.sh`: /pdca plan placeholder → Plan doc 존재 확인
- `test/e2e/03-pre-write-block.sh`: .claude/ write 시도 → 차단 확인
- `test/e2e/04-session-end-ledger.sh`: SessionEnd → token-ledger.json 쓰기 확인
- `test/e2e/05-check-guards-smoke.sh`: check-guards.js 수행 → 21 Guards 확인

각 스크립트: exit 0 = PASS, exit 1 = FAIL.
CI에 `test/e2e/run-all.sh` 추가.

#### 3.4.6 NEW 6-6: docs-code-scanner BKIT_VERSION 확장 (T56~T58)

**변경**: `lib/infra/docs-code-scanner.js`:
- 기존 `scanCounts()` 외에 `scanVersions()` 신설
- `scanVersions()`: `bkit.config.json.version` + `plugin.json.version` + `lib/core/version.js:FALLBACK_VERSION` + `README.md` 배지 + `CHANGELOG.md` 최상단 `## vX.Y.Z` 일치 검증
- `scripts/docs-code-sync.js`에서 `scanVersions()` 호출 + 불일치 시 exit 1

**L1 TC**: `test/contract/docs-code-version.test.js` — 5곳 버전 일치 확인.

#### 3.4.7 NEW 6-7: MEMORY.md 분해 (T59~T60)

**현재 구조** (291 lines 추정):
- Project Context (Architecture 등)
- Claude Code Version Compatibility (v2.1.34~v2.1.117 이력, 가장 큰 비중)
- ENH Opportunities (ENH-32~248)

**분해 후 구조** (사용자 memory 디렉토리 내):
- `MEMORY.md` (인덱스, ≤150 lines): 목차 + 최신 Architecture + 최근 5개 CC 버전 요약 + v2.1.10 Release Status
- `memory/cc_version_history_v21xx.md`: v2.1.73~v2.1.117 상세 이력
- `memory/enh_backlog.md`: ENH-32~248 전체 목록
- `memory/mon_cc_tracker.md`: MON-CC-02, MON-CC-06 19건 상세

**⚠️ 주의**: 사용자 memory 디렉토리는 `/Users/popup-kay/.claude/projects/-Users-popup-kay-Documents-GitHub-popup-bkit-claude-code/memory/`에 있음. 이 경로는 사용자 자동 메모리 시스템이며, auto memory 규칙에 따라 인덱스는 MEMORY.md (≤200 lines), detail 파일은 별도 .md. 각 detail 파일은 MEMORY.md의 한 줄 링크로 연결.

#### 3.4.8 NEW 6-8: design.md 리팩토링 (T61~T62)

**현재 `docs/02-design/features/bkit-v2110-integrated-enhancement.design.md` 2,644 lines** → 분할:
- `bkit-v2110-integrated-enhancement.design.md` (≤800 lines, overview + Context Anchor + 3-option 비교 + summary)
- `bkit-v2110-integrated-enhancement-addendum-architecture.md`: Clean Architecture 레이어 상세
- `bkit-v2110-integrated-enhancement-addendum-sprint.md`: Sprint 0~4.5 상세
- `bkit-v2110-integrated-enhancement-addendum-risks.md`: Risk Register
- `bkit-v2110-integrated-enhancement-addendum-guards.md`: Domain Guards 4종 + cc-regression 상세

메인 문서에서 각 addendum을 `[See addendum-architecture.md](./...)` 링크.

#### 3.4.9 NEW 6-9 & 6-10: 보조 (Sprint 5a 중 처리)

- `skills/_skills-overview.md` v2.1.10 태그 (Sprint 5a §3.1.3 T9)
- CTO Team 동적 매핑표 (Sprint 5a §3.1.3 T10 README.md)

---

## 4. API/함수 시그니처 (신규)

### 4.1 `lib/infra/cc-bridge.js` (Sprint 6 NEW 6-3)

```javascript
/**
 * @returns {CCPayload | null}
 */
function parseHookInput(rawStdin) { }

/**
 * @returns {string | null}  e.g., "2.1.117"
 */
function detectCCVersion() { }

/**
 * @param {CCPayload} input
 * @returns {string | null}
 */
function getSessionId(input) { }

/**
 * @returns {boolean}
 */
function isBypassMode() { }
```

### 4.2 `lib/cc-regression/index.js` (Sprint 5.5 확장)

```javascript
// 기존 exports 유지
// 신규 추가:
/**
 * @param {{ hookEvent: string, ccVersion: string, sessionId: string|null, timestamp: string }} event
 * @returns {void}
 */
function recordEvent(event) { }

module.exports = { ..., recordEvent };
```

### 4.3 `lib/infra/docs-code-scanner.js` (Sprint 6 NEW 6-6)

```javascript
/**
 * @returns {{ bkitConfig: string, pluginJson: string, fallback: string, readme: string|null, changelog: string|null, allMatch: boolean }}
 */
function scanVersions() { }
```

### 4.4 `lib/infra/mcp-test-harness.js` (Sprint 6 NEW 6-4 helper)

```javascript
/**
 * @param {string} serverPath
 * @returns {Promise<ChildProcess>}
 */
async function spawnMCP(serverPath) { }

/**
 * @param {ChildProcess} proc
 * @param {object} request JSON-RPC 2.0 message
 * @returns {Promise<object>}
 */
async function callMCP(proc, request) { }
```

---

## 5. Data Model

### 5.1 `.bkit/runtime/cc-event-log.ndjson` (Sprint 5.5 신규)

1줄 = 1 event NDJSON:
```json
{"hookEvent":"Stop","ccVersion":"2.1.117","sessionId":"abc123","timestamp":"2026-04-22T11:30:00.000Z"}
```

**회전 정책**: 30일 후 auto-archive (`.bkit/runtime/archive/cc-event-log-YYYY-MM.ndjson`). 추가 로직은 `lib/cc-regression/index.js recordEvent` 내부.

### 5.2 `.bkit/runtime/precompact-counter.json` (Sprint 5.5 신규)

```json
{
  "ccVersion": "2.1.117",
  "startedAt": "2026-04-22T...",
  "blocks": [
    { "at": "2026-04-22T...", "sessionId": "...", "contextSize": 187234 }
  ],
  "blockCount": 1,
  "sampleCount": 1
}
```

**ENH-257 판정**: 2주 후 `blockCount / sampleCount < 5%`이면 ENH-232 해제. counter 삭제.

---

## 6. Error Handling

### 6.1 cc-bridge.js fail-open

모든 함수는 예외 시 `null` 또는 기본값 반환. 로그만 남김 (`console.warn`). Hook 크래시 금지.

### 6.2 recordEvent fail-silent

attribution 실패는 사용자 경험에 영향 없음. try/catch로 감싸고 silent 실패.

### 6.3 MCP L3 러너 격리

서버 spawn 실패 시 test skip (not fail). Windows에서 shell 차이로 실패 가능성 방어.

---

## 7. Invocation Contract 영향 분석

Sprint 5a~6의 모든 변경에 대해 Invocation Contract(226 assertions) 준수를 개별 확인:

| 변경 | Contract 영향 | 대응 |
|------|--------------|------|
| plugin.json version bump | `version` 필드는 Contract 대상 아님 (description도 아님) | 없음 |
| session-start.js systemMessage 문자열 | `systemMessage` 필드 존재/타입 보존. 내용 차이는 Contract 대상 아님 | L1 TC 유지 |
| aggregator 확장 | CI/test 인프라, Contract 대상 아님 | 없음 |
| hook attribution 3곳 (Sprint 5.5) | hook 반환 shape 불변 (recordEvent는 side-effect only) | L2 smoke TC 유지 |
| cc-bridge.js 신설 | Port 구현체는 Contract 대상 아님 | 없음 |
| legacy 3모듈 제거 | lib/ 공개 API 영향 확인 필요 | 각 모듈 사용처 grep → 0건 확인 후 제거 |
| context: fork 8 skills | SKILL.md frontmatter에 `context: fork` 추가 (optional 필드), 기존 호출 불변 | L1 frontmatter schema TC 확장 |
| MEMORY 분해 | 유저 memory 영역, bkit 플러그인 배포 영향 없음 | 없음 |
| design.md 분할 | 문서만, 코드 영향 0 | 없음 |

**결론**: 226 assertions 전수 유지 가능. 신규 optional 필드 추가분만 Contract에 승격 (Addendum §5.3).

---

## 8. Test Plan

### 8.1 L1 (Frontmatter Schema)

- `context-fork-l1.test.js`: 8 skills의 `context: fork` 유효성
- `docs-code-version.test.js`: 5곳 BKIT_VERSION 일치

### 8.2 L2 (Invocation Smoke)

- `l2-hook-attribution.test.js`: 3곳 hook의 recordEvent 호출 재귀 없음 + NDJSON append 성공
- `cc-bridge.test.js`: parseHookInput/detectCCVersion/getSessionId/isBypassMode 단위 10+ TC

### 8.3 L3 (Runtime)

- `l3-mcp-runtime.test.js`: MCP 서버 2종 실 spawn + tools/list + 1 tools/call

### 8.4 L4 (Deprecation Detection)

기존 226 assertions 유지. 변화 없음.

### 8.5 L5 (E2E)

- `test/e2e/run-all.sh`: 5개 shell smoke 시나리오

### 8.6 Integration

- `integration-runtime.test.js` 확장: recordEvent recursion 방어 + cc-bridge fail-open + MCP spawn cleanup

### 8.7 Test Matrix 요약

| Sprint | 신규 TC | 대략 수 |
|:------:|--------|:------:|
| 5a | aggregate-scope + registry-expected-fix | ~10 |
| 5b | (CHANGELOG 변경만, TC 없음) | 0 |
| 5.5 | hook attribution + precompact counter + telemetry redact | ~25 |
| 6 | context-fork-l1 + cc-bridge + mcp-runtime + docs-version + e2e 5 | ~80 |
| **합계** | | **~115** |

실측 TC 3,583 → 목표 **≥ 3,700**.

---

## 9. CI/CD

### 9.1 workflow 변경

- `.github/workflows/contract-check.yml`:
  - **추가 step**: Domain ESLint
  - **추가 step**: BKIT_VERSION docs-code-sync
  - **추가 step**: MCP L3 runtime (Sprint 6)
  - **추가 step**: E2E smoke (optional, non-blocking)

### 9.2 로컬 dev 4-command (→ 6-command)

```
node scripts/check-guards.js
node scripts/docs-code-sync.js
node scripts/check-deadcode.js
node test/contract/scripts/qa-aggregate.js
node test/contract/l3-mcp-runtime.test.js    # NEW
bash test/e2e/run-all.sh                      # NEW
```

---

## 10. Rollback / Compatibility

### 10.1 Sprint별 롤백 가능 지점

| Sprint | 롤백 커밋 단위 | 영향 |
|:------:|:-------------:|------|
| 5a | 단일 커밋 (버전 bump + aggregator + registry + docs) | 전체 이전 상태 |
| 5b | 독립 커밋 (README only) | README 변경 철회 |
| 5.5 | 3 커밋 (hook attribution + CI + 관찰 counter) | 단계별 되돌림 |
| 6 | 9 커밋 (NEW 6-1~6-8 별도) | 부분 롤백 가능 |

### 10.2 Invocation Contract 위반 회피

각 Sprint 종료마다 `contract-test-run.js --compare v2.1.9` 필수 실행. L1+L4 = 226 assertions PASS 유지.

---

## 11. Implementation Guide (Session Plan)

### 11.1 Module Map (전체)

| 레이어 | 모듈 | Sprint | Session | 의존 |
|--------|------|:------:|:------:|------|
| Meta | bkit.config.json | 5a | 1 | - |
| Meta | plugin.json | 5a | 1 | - |
| Presentation | hooks/session-start.js | 5a | 1 | cc-bridge (6) |
| Presentation | scripts/unified-stop.js | 5.5 | 3 | cc-regression |
| Presentation | scripts/session-end-handler.js | 5.5 | 3 | cc-regression |
| Presentation | scripts/subagent-stop-handler.js | 5.5 | 3 | cc-regression |
| Presentation | scripts/context-compaction.js | 5.5 | 3 | precompact-counter |
| Infrastructure | lib/infra/cc-bridge.js | 6 | 4 | cc-payload.port |
| Infrastructure | lib/infra/docs-code-scanner.js | 6 | 4 | - |
| Infrastructure | lib/infra/mcp-test-harness.js | 6 | 5 | (helper only) |
| Application | lib/cc-regression/index.js | 5.5 | 3 | recordEvent 추가 |
| Application | lib/cc-regression/lifecycle.js | 5.5 | 3 | counter 통합 |
| Infrastructure cleanup | lib/context/ops-metrics.js | 6 | 6 | (평가 후 제거) |
| Infrastructure cleanup | lib/core/hook-io.js | 6 | 6 | (즉시 제거) |
| Infrastructure cleanup | lib/pdca/deploy-state-machine.js | 6 | 6 | state-machine.js 흡수 |
| Test | test/contract/aggregate-scope.test.js | 5a | 2 | - |
| Test | test/contract/registry-expected-fix.test.js | 5a | 2 | - |
| Test | test/contract/l2-hook-attribution.test.js | 5.5 | 3 | - |
| Test | test/contract/cc-bridge.test.js | 6 | 4 | cc-bridge |
| Test | test/contract/l3-mcp-runtime.test.js | 6 | 5 | mcp-test-harness |
| Test | test/contract/context-fork-l1.test.js | 6 | 7 | - |
| Test | test/contract/docs-code-version.test.js | 6 | 4 | docs-code-scanner |
| Test | test/e2e/01~05-*.sh | 6 | 8 | - |
| Skills | skills/{qa-phase,phase-1~5,phase-8,skill-status}/SKILL.md | 6 | 7 | - |
| Docs | MEMORY.md + memory/*.md | 6 | 9 | - |
| Docs | design.md + addendum-*.md | 6 | 9 | - |
| Docs | CHANGELOG.md | 5b (initial) + post-Sprint-6 | 10 | - |
| CI | .github/workflows/contract-check.yml | 5.5 + 6 | 3, 4 | - |

### 11.2 Session Plan (권장 세션 수)

| 세션 | 범위 | 예상 시간 |
|:----:|------|:--------:|
| 1 | Sprint 5a core: bkit.config + plugin.json + session-start + aggregator + registry TC | 1.5h |
| 2 | Sprint 5a docs: MEMORY + skills-overview + README + cc-tool-audit | 1h |
| 3 | Sprint 5.5 전체: hook 3곳 + CI + counter + docs | 3h |
| 4 | Sprint 6 cc-bridge + docs-code-scanner BKIT_VERSION | 2h |
| 5 | Sprint 6 MCP L3 런타임 러너 | 3h |
| 6 | Sprint 6 legacy 3모듈 정리 | 3h |
| 7 | Sprint 6 ENH-202 context:fork 8 skills | 5h |
| 8 | Sprint 6 L5 E2E 5 shell scenarios | 4h |
| 9 | Sprint 6 MEMORY + design.md 리팩토링 | 3h |
| 10 | CHANGELOG 최종 + README What's New + Iterate + Final QA | 3h |
| **합계** | | **~28h** |

### 11.3 Session Guide

`/pdca do bkit-v2110-gap-closure --scope sprint-5a` 부터 시작.

---

## 12. 결정 기록 (Decision Record Chain)

| 단계 | 결정 | 근거 |
|------|------|------|
| [PRD/Plan-Plus] | Target: v2.1.10 브랜치 완결성 극대화 (릴리스 작업 제외) | 사용자 Q1 |
| [Plan-Plus] | Sprint 5.5+6 v2.1.10 편입 | 사용자 Q2 |
| [Design] | Option C Pragmatic Balance | 3옵션 비교 §2.3 |
| [Design] | legacy 3모듈 제거 vs 흡수 — 10 LOC 즉시 제거 / 나머지 평가 후 | 참조자 분석 결과 반영 |
| [Design] | L5 Playwright 대신 shell smoke | Self-contained 원칙 + npm 의존 회피 |
| [Design] | MEMORY 인덱스 구조 | auto memory 규칙 200 line cap |
| [Design] | cc-bridge.js Sprint 6 (Sprint 5a inline 유지) | Sprint 5a는 Minimal, Sprint 6에서 구조 확장 |

---

**문서 끝.**

> 본 Design 문서는 Plan-Plus §20을 완전히 구현 가능한 수준으로 상세화했습니다. `/pdca do bkit-v2110-gap-closure --scope sprint-5a`로 Sprint 5a 착수를 권장합니다.
