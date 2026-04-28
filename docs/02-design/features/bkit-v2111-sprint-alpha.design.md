---
feature: bkit-v2111-integrated-enhancement
sprint: α (Alpha)
theme: Onboarding Revolution
phase: 02-design
type: sprint-detail
status: Draft — Checkpoint 3 승인 (Option C Pragmatic)
architecture: Option C (Pragmatic Balance)
pencil-anchor: α3 tutorial 1개만 pilot (D4 정합)
fr-count: 5
created: 2026-04-23
author: kay kim
parent: docs/02-design/features/bkit-v2111-integrated-enhancement.design.md
---

# Sprint α — Onboarding Revolution (Design)

> **Summary**: 설치 후 "첫 5분 경험" 전체를 재설계한다. README 2층 분리, One-Liner SSoT 5곳 동기, First-run 3분 튜토리얼(Pencil Design Anchor pilot), CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS 자동 검출, CC 버전 체크의 5 FR 을 Option C Pragmatic (adapter-first) 로 구현한다.
>
> **Goal**: Daniel 첫 세션 이탈 40% → 15%, UX U1 (First-Run) ★2.5 → ★4
> **Parent Design**: [bkit-v2111-integrated-enhancement.design.md](./bkit-v2111-integrated-enhancement.design.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | bkit 설치 직후 39 skills · 36 agents 폭격으로 "어디서 시작해야 할지" 모름 → 이탈 40% 추정. First-run wizard 부재가 marketplace 등록 Blocker B1 |
| **WHO** | Primary: Daniel (Dynamic, 첫 세션 감동 필요) / Secondary: 전 persona (Yuki 포함) |
| **RISK** | (a) SessionStart hook 추가 overhead < 50ms 유지 / (b) One-Liner 5곳 동기 drift 방지 / (c) Pencil Design Anchor pilot 의 CC 기본 AUQ 와 일관성 |
| **SUCCESS** | 5 FR × Match Rate ≥ 90%, UX U1 ★2.5→★4, SessionStart overhead ≤ 50ms, One-Liner 5곳 0 drift |
| **SCOPE** | IN: README.md/README-FULL.md 분리, One-Liner SSoT, First-run 튜토리얼, env/version 체크. OUT: 에러 번역(β3), 언어 감지(β6) |

---

## Design Anchor (Pencil MCP Pilot — FR-α3 한정)

> D4 결정: α3 tutorial AskUserQuestion UI 1개만 Pencil Design Anchor pilot. 나머지 AUQ 는 CC 기본 렌더링 유지.
> Capture 명령: `/design-anchor capture bkit-v2111-alpha-tutorial` (FR-α3 구현 직전 실행)
> File: `docs/02-design/styles/bkit-v2111-alpha-tutorial.design-anchor.md`

| Category | Tokens (초기 제안, Pencil capture 후 확정) |
|----------|-----|
| **Colors** | primary: `#0969da` (CC accent 호환), bg: terminal default, text: terminal default |
| **Typography** | monospace (terminal native), 헤더 ≤ 60 columns |
| **Spacing** | AUQ option 간 1줄 간격, 헤더 전 2줄 |
| **Radius** | N/A (terminal) |
| **Tone** | 따뜻한 친근형 — "bkit 처음이시군요! 3분 튜토리얼을 시작할까요?" |
| **Layout** | 표 형태 X, bullet + bold key phrase |

> 구현 시 `/design-anchor capture` 로 위 토큰을 실제 Pencil UI 로 잠그고, FR-α3 AskUserQuestion options 을 해당 토큰 기준으로 작성.

---

## 1. Overview

### 1.1 Design Goals

- **Zero-friction First-Run**: 설치 후 첫 SessionStart 에서 "다음 한 줄"이 자동 제시되도록
- **One-Liner 정체성 확정**: 4개 혼재 메시지 → 1개 통일. D5 = Option 1 Verification-Focused
- **Sandbox 외부 의존 최소화**: 신규 Node built-in 의존 0, 외부 npm 0
- **Adapter 패턴 일관성**: cc-version-checker + branding 2개 adapter 로 Port/Adapter 확장

### 1.2 Design Principles

1. **Lazy First-Run Detection** — `.bkit/runtime/first-run-seen.json` 존재 여부로 판정, 매 SessionStart 마다 < 5ms
2. **Single String SoT** — One-Liner 문자열은 `lib/infra/branding.js` 의 `ONE_LINER` export 를 5곳이 import (하드코딩 금지)
3. **Graceful Degradation** — CC 버전 미달 시 경고만, 동작 차단 ❌
4. **Idempotent Tutorial** — 사용자가 "예"를 골라도 "다음에"를 골라도 seen.json 생성 (재노출 1회만)

---

## 2. Architecture

### 2.0 Selected: Option C Pragmatic

| Aspect | v2.1.10 Baseline | Sprint α 변경 |
|--------|-----|-----|
| session-start.js 역할 | 경량 orchestrator | **유지** (비대화 방지) + 3개 lazy import 추가 |
| Infrastructure Layer | cc-bridge + telemetry + docs-code-scanner + state-store + mcp-test-harness | **+ cc-version-checker + branding** |
| Docs=Code count | 8 | **9** (README-FULL.md 추가) |
| BKIT_VERSION location | 5 | **6** (README-FULL.md 추가) |

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  hooks/session-start.js (Presentation — 경량 orchestrator)  │
│  ├── isFirstRun()                                           │
│  ├── checkAgentTeamsEnv()                                   │
│  └── checkCCVersion()                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │ lazy require
     ┌─────────────┼─────────────┬──────────────┐
     ▼             ▼             ▼              ▼
┌────────┐  ┌──────────────┐ ┌────────────┐ ┌────────────┐
│branding│  │cc-version-   │ │isFirstRun  │ │AUQ Tutorial│
│.js     │  │checker.js    │ │(inline)    │ │ (Pencil    │
│(SSoT)  │  │(Infra)       │ │            │ │  Anchor)   │
└────────┘  └──────────────┘ └────────────┘ └────────────┘
     │             │
     │             └───▶ Reads: ~/.claude/claude/version.json
     │                          or `claude --version` subprocess
     │
     └───▶ Exported: ONE_LINER constant (Option 1 string)
```

### 2.2 Data Flow

```
SessionStart Event
    │
    ▼
session-start.js 진입
    │
    ├── 1. generateContextHeader() — 기존 유지
    │
    ├── 2. NEW: isFirstRun() check
    │   └── .bkit/runtime/first-run-seen.json 존재? 
    │        No → AUQ 3분 튜토리얼 (α3, Pencil Design Anchor)
    │              → 사용자 응답 후 seen.json 생성
    │        Yes → skip
    │
    ├── 3. NEW: checkAgentTeamsEnv() — α4
    │   └── process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1"?
    │        Yes → ✓ active (no output)
    │        No → additionalContext 에 "⚠️ Agent Teams 비활성: 
    │                                     CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 설정" 추가
    │
    ├── 4. NEW: checkCCVersion() — α5
    │   └── cc-version-checker.getCurrent() < 2.1.117?
    │        Yes → additionalContext 에 "⚠️ CC v2.1.117+ 권고: 
    │                                     현재 {version}, 비활성 기능: {list}" 추가
    │        No  → ✓ latest (no output)
    │
    └── 5. emit additionalContext (OTEL dual-sink 유지)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| hooks/session-start.js | lib/infra/branding, lib/infra/cc-version-checker | lazy require, overhead 최소 |
| lib/infra/branding.js | (none) | ONE_LINER 상수 export |
| lib/infra/cc-version-checker.js | child_process (exec) | `claude --version` subprocess 또는 `~/.claude/claude/version.json` 읽기 |

---

## 3. Data Model

### 3.1 `.bkit/runtime/first-run-seen.json`

```json
{
  "version": "2.1.11",
  "seenAt": "2026-04-23T12:34:56.789Z",
  "tutorialResponse": "yes" | "later" | "skip",
  "ccVersionAtFirstRun": "2.1.117"
}
```

### 3.2 `lib/infra/branding.js` (ONE_LINER SSoT)

```javascript
// Single Source of Truth for bkit identity
// All 5 locations MUST import from here (or reference via docs-code-scanner)
const ONE_LINER_EN = "The only Claude Code plugin that verifies AI-generated code against its own design specs.";
const ONE_LINER_KO = "AI가 만든 코드를 AI가 만든 설계로 검증하는 유일한 Claude Code 플러그인.";

module.exports = {
  ONE_LINER_EN,
  ONE_LINER_KO,
  ONE_LINER: ONE_LINER_EN, // default for programmatic use
};
```

### 3.3 CC Version Compat Map (α5)

`lib/infra/cc-version-checker.js` 내부 상수:

```javascript
const FEATURE_VERSION_MAP = {
  "agentTeams": "2.1.117",             // CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
  "loopCommand": "2.1.71",              // /loop
  "promptCaching1h": "2.1.108",         // 1-hour cache
  "contextFork": "2.1.113",             // context: fork
  "opus1MCompact": "2.1.113",           // Opus 1M /compact fix (tentative)
  "hookMcpToolDirect": "2.1.118",       // F1 — ENH-277 (hooks.json type: "mcp_tool")
  "pluginTagCommand": "2.1.118",        // F9 — ENH-279 (claude plugin tag)
  "agentHookMultiEvent": "2.1.118",     // X13 — ENH-280 (agent-hook 다중 이벤트 fix)
};

const MIN_VERSION = "2.1.78";      // 필수
const RECOMMENDED_VERSION = "2.1.118"; // 권고 (2026-04-23 업데이트, 76 연속 호환)
```

**F5 대응 — `DISABLE_UPDATES` env 가드** (v2.1.118):
```javascript
function checkCCVersion() {
  if (process.env.DISABLE_UPDATES === '1') return { skipped: true, reason: 'DISABLE_UPDATES env' };
  // ... 기존 version 체크 로직
}
```

---

## 4. API Specification (SessionStart Hook 변경)

### 4.1 hooks/session-start.js Interface (v2.1.11)

```javascript
// Input (CC provides)
{
  "event": "SessionStart",
  "session_id": "...",
  "cwd": "/path/to/project"
}

// Output (stdout)
{
  "hookSpecificOutput": {
    "additionalContext": "..."   // 기존 context header + α3/α4/α5 추가 섹션
  }
}
```

### 4.2 First-Run Tutorial AUQ Schema (FR-α3)

```javascript
AskUserQuestion({
  questions: [{
    question: "bkit 처음이시군요! 3분 튜토리얼을 시작할까요?",
    header: "First Run",
    multiSelect: false,
    options: [
      {
        label: "Start 3-min tutorial (Recommended)",
        description: "/claude-code-learning 으로 PDCA 기본 + Output Style 선택 + 첫 /pdca plan 예제를 안내"
      },
      {
        label: "Later — 그냥 시작",
        description: "이 안내 다시 보지 않음. 언제든 /claude-code-learning 으로 튜토리얼 실행 가능"
      },
      {
        label: "Skip permanently",
        description: "onboarding.firstRun = false 설정. 자동 안내 영구 비활성"
      }
    ]
  }]
})
```

---

## 5. UI/UX Design

### 5.1 SessionStart 첫 실행 화면 Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ╔═════════════════════════════════════════════════════════════════════════╗ │
│  ║ bkit v2.1.11 — The only Claude Code plugin that verifies AI-generated   ║ │
│  ║                code against its own design specs.                        ║ │
│  ║                                                                          ║ │
│  ║ AI가 만든 코드를 AI가 만든 설계로 검증하는 유일한 Claude Code 플러그인. ║ │
│  ╚═════════════════════════════════════════════════════════════════════════╝ │
│                                                                              │
│  📖 bkit 처음이시군요! 3분 튜토리얼을 시작할까요?                            │
│  → Start 3-min tutorial (Recommended)                                        │
│  → Later — 그냥 시작                                                         │
│  → Skip permanently                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 CC 버전 미달 경고 (FR-α5)

```
⚠️ CC v2.1.117+ 권고 — 현재 v2.1.114
   비활성 기능:
   - Agent Teams (v2.1.117+ 필요)
   - Prompt Caching 1h (v2.1.108+, ✓ active)
```

### 5.3 Page UI Checklist

#### SessionStart First-Run Tutorial Page

- [ ] 헤더 박스: One-Liner EN + KO (2줄 + 1줄 간격)
- [ ] 질문 텍스트: "bkit 처음이시군요! 3분 튜토리얼을 시작할까요?" (한국어 우선)
- [ ] Option 1 Label: "Start 3-min tutorial (Recommended)"
- [ ] Option 1 Description: /claude-code-learning 안내
- [ ] Option 2 Label: "Later — 그냥 시작"
- [ ] Option 3 Label: "Skip permanently"
- [ ] 응답 후 `.bkit/runtime/first-run-seen.json` 생성 확인

#### SessionStart Env/Version Warning Page

- [ ] Agent Teams env 미설정 시 ⚠️ 메시지 출력
- [ ] CC 버전 미달 시 ⚠️ 메시지 + 비활성 기능 리스트

---

## 6. Error Handling

| Code | Cause | Handling |
|------|-------|----------|
| E-α3-01 | `.bkit/runtime/` 디렉토리 write 실패 (퍼미션) | Silent degrade — seen.json 생성 실패해도 다른 동작 정상, 매 SessionStart 마다 튜토리얼 재노출 (user 인지 가능) |
| E-α5-01 | `claude --version` subprocess timeout (>500ms) | Silent degrade — 버전 체크 skip, warning 미출력 |
| E-α5-02 | `~/.claude/claude/version.json` 파싱 실패 | Fallback: subprocess. 둘 다 실패 시 warning 미출력 |
| E-α2-01 | branding.js 5곳 중 1곳 drift 발견 (CI) | CI gate exit 1 (`docs-code-scanner.scanOneLiner()`) |

### 6.1 Fail-Open Policy

모든 α FR 은 **fail-open** — 내부 에러가 사용자 작업을 차단하지 않는다. 단 CI 시점 검증은 fail-fast.

---

## 7. Security Considerations

- [x] **No external network** — cc-version-checker 는 로컬 `claude --version` 또는 파일 읽기만 (외부 API 호출 0)
- [x] **No sensitive data** — first-run-seen.json 에 버전/타임스탬프만 저장 (PII 0)
- [x] **Subprocess hardening** — `claude --version` 만 실행, shell escape 불필요 (인자 없음)
- [x] **File read sandboxing** — `~/.claude/claude/version.json` 경로 하드코딩 (traversal 불가)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1 Unit | isFirstRun() / getCurrent() / FEATURE_VERSION_MAP | Node test | Do |
| L2 Integration | SessionStart hook end-to-end (first run + re-run + env missing + version low) | bash fixture | Do |
| L4 Perf | SessionStart overhead < 50ms | benchmark script | Do |
| Contract | Invocation Contract SessionStart 첫 실행 AUQ flow | tests/contract/ | Do |

### 8.2 L1 Unit Tests (10)

| # | Function | Input | Expected |
|:---:|---|---|---|
| 1 | `isFirstRun()` | seen.json 없음 | true |
| 2 | `isFirstRun()` | seen.json 존재 | false |
| 3 | `markFirstRunSeen()` | response="yes" | seen.json 생성, tutorialResponse="yes" |
| 4 | `getCurrent()` | `claude --version` returns "2.1.117" | "2.1.117" |
| 5 | `getCurrent()` | subprocess timeout | null (silent) |
| 6 | `compareVersion(a, b)` | ("2.1.117", "2.1.78") | 1 |
| 7 | `compareVersion(a, b)` | ("2.1.78", "2.1.117") | -1 |
| 8 | `listInactiveFeatures(current)` | "2.1.114" | ["agentTeams", "opus1MCompact", "contextFork"] |
| 9 | `branding.ONE_LINER` | - | Option 1 EN string |
| 10 | `checkAgentTeamsEnv()` | env unset | returns warning object |

### 8.3 L2 Integration Tests (15)

| # | Scenario | Setup | Expected |
|:---:|---|---|---|
| 1 | 첫 SessionStart — 튜토리얼 AUQ 노출 | seen.json 없음 | additionalContext 에 AUQ flow 포함 |
| 2 | 2회차 SessionStart — 튜토리얼 skip | seen.json 존재 | AUQ 미노출 |
| 3 | Agent Teams env 없을 때 | unset | warning 메시지 출력 |
| 4 | Agent Teams env 있을 때 | "1" | warning 미출력 |
| 5 | CC 버전 v2.1.78 | fixture | "CC v2.1.117+ 권고" warning |
| 6 | CC 버전 v2.1.117 | fixture | warning 미출력 |
| 7 | CC 버전 < v2.1.78 (MIN) | fixture | ERROR 수준 warning ("필수 버전 미달") |
| 8~15 | One-Liner 5곳 동기 검증 | docs-code-scanner | 5곳 전량 동일 문자열 |

### 8.4 L4 Perf Test (5)

| # | Metric | Target | Measurement |
|:---:|---|---|---|
| 1 | SessionStart overhead (total) | < 50ms | `time node hooks/session-start.js` median of 10 runs |
| 2 | isFirstRun() | < 5ms | stopwatch |
| 3 | checkCCVersion() — cache hit | < 10ms | stopwatch, version.json 존재 |
| 4 | checkCCVersion() — subprocess | < 200ms | stopwatch, `claude --version` |
| 5 | checkAgentTeamsEnv() | < 1ms | stopwatch |

### 8.5 Contract Tests (2 신규 assertions)

- C-α-01: `hooks.json` SessionStart 매처 unchanged
- C-α-02: First-run AUQ options array length === 3

---

## 9. Clean Architecture Layer 배치

| Component | Layer | Path |
|-----------|-------|------|
| `session-start.js` | Presentation | `hooks/session-start.js` |
| `branding.js` | Infrastructure | `lib/infra/branding.js` |
| `cc-version-checker.js` | Infrastructure | `lib/infra/cc-version-checker.js` |
| `.bkit/runtime/first-run-seen.json` | Infrastructure state | runtime-only |
| `README.md` / `README-FULL.md` | Presentation (docs) | repo root |
| `plugin.json description` | Presentation metadata | `.claude-plugin/plugin.json` |

### 9.1 Dependency Direction

```
hooks/session-start.js (Presentation)
    ├─▶ lib/infra/branding.js         (Infrastructure)
    ├─▶ lib/infra/cc-version-checker.js (Infrastructure)
    └─▶ (inline) isFirstRun / markFirstRunSeen (Infrastructure ops)

Domain Layer: 변경 없음 (α 는 pure UX/Infra Sprint)
```

---

## 10. Coding Convention Reference

### 10.1 File Naming

| Target | Rule | Example |
|--------|------|---------|
| Infra modules | kebab-case.js | `cc-version-checker.js`, `branding.js` |
| JSON states | kebab-case.json | `first-run-seen.json` |

### 10.2 JSDoc

모든 신규 함수는 v2.1.10 관례 따라 `@version 2.1.11` + `@since 2.1.11` 태그.

```javascript
/**
 * Check if this is the first bkit run for this project.
 * @version 2.1.11
 * @since 2.1.11
 * @returns {boolean}
 */
function isFirstRun() { /* ... */ }
```

---

## 11. Implementation Guide

### 11.1 File Structure (변경)

```
hooks/
└── session-start.js                  [MODIFY] +α3/α4/α5 blocks

lib/infra/
├── branding.js                       [NEW]    — ONE_LINER SSoT
├── cc-version-checker.js             [NEW]    — CC version adapter
└── docs-code-scanner.js              [MODIFY] + scanOneLiner() + 9th count

.bkit/runtime/
└── first-run-seen.json               [RUNTIME] — gitignored

README.md                             [REWRITE] ≤100 lines 요약판
README-FULL.md                        [NEW]    기존 633줄 이관

.claude-plugin/plugin.json            [MODIFY] description = ONE_LINER_EN
CHANGELOG.md                          [MODIFY] v2.1.11 헤더 추가
```

### 11.2 Implementation Order

1. [ ] **α2-a**: `lib/infra/branding.js` 작성 + `tests/unit/branding.test.js`
2. [ ] **α2-b**: `plugin.json:description` = ONE_LINER_EN
3. [ ] **α2-c**: `README.md` 재작성 (≤100 lines) + One-Liner in L1
4. [ ] **α2-d**: `README-FULL.md` 생성 (기존 README 내용 이관)
5. [ ] **α2-e**: CHANGELOG.md v2.1.11 블록에 ONE_LINER 삽입
6. [ ] **α2-f**: `lib/infra/docs-code-scanner.js` + `scanOneLiner()` + 9th count
7. [ ] **α5-a**: `lib/infra/cc-version-checker.js` 작성 + L1 TC 6개
8. [ ] **α5-b**: `hooks/session-start.js` 에서 checkCCVersion() 호출
9. [ ] **α4**: `hooks/session-start.js` 에서 checkAgentTeamsEnv() 호출
10. [ ] **α3-a**: `/design-anchor capture bkit-v2111-alpha-tutorial` (Pencil MCP)
11. [ ] **α3-b**: `hooks/session-start.js` 에서 isFirstRun() + AUQ tutorial flow
12. [ ] **α3-c**: `.bkit/runtime/first-run-seen.json` schema 반영
13. [ ] **L2 Integration**: 15 TC 작성 및 실행
14. [ ] **L4 Perf**: overhead < 50ms 검증
15. [ ] **CI gate**: `docs-code-sync.js` 9 count 검증 PASS

### 11.3 Session Guide

#### Module Map (α 내부)

| Sub-Module | Scope Key | Files | Est. Turns |
|------------|-----------|-------|:---:|
| Branding SSoT | `sprint-alpha-branding` | branding.js + 5 location 동기 | 8~12 |
| Version Checker | `sprint-alpha-version` | cc-version-checker.js + session-start integration | 10~15 |
| First-Run Tutorial | `sprint-alpha-tutorial` | session-start.js isFirstRun + AUQ + Pencil anchor | 12~18 |

#### Session Plan

| Session | Scope | Turns |
|---------|-------|:---:|
| 1 | `sprint-alpha-branding` | 10 |
| 2 | `sprint-alpha-version` | 12 |
| 3 | `sprint-alpha-tutorial` | 15 |
| 4 | L2/L4 integration + CI gate | 8 |

**총 추정**: 35~45 turns

---

## 12. Acceptance Criteria (Sprint α DoD)

- [ ] 5 FR 전량 Match Rate ≥ 90%
- [ ] SessionStart overhead < 50ms (L4 TC 통과)
- [ ] One-Liner 5곳 (plugin.json / README L1 / README-FULL.md header / SessionStart intro / CHANGELOG Highlights) 동일 문자열 (CI scanOneLiner 0 drift)
- [ ] Docs=Code count 8 → 9 (CI docs-code-sync PASS)
- [ ] First-Run AUQ 3 option 동작 + seen.json 생성 (L2 TC 통과)
- [ ] Agent Teams env 자동 검출 + warning 동작 (L2 TC 통과)
- [ ] CC 버전 체크 + 비활성 기능 list 출력 (L2 TC 통과)
- [ ] Pencil Design Anchor pilot 캡처 완료: `docs/02-design/styles/bkit-v2111-alpha-tutorial.design-anchor.md`
- [ ] Invocation Contract +2 assertions 추가 및 PASS

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-23 | Initial Sprint α design — Option C Pragmatic, Pencil pilot(α3), D5 One-Liner 반영 | kay kim |

---

**Next Step**: `/pdca do bkit-v2111-integrated-enhancement --scope sprint-alpha` (Precondition P1~P3 완료 후)
