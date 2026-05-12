# bkit v2.1.10 통합 설계 문서 (Integrated Design)

> **Status**: 🏗️ Design Ready (Sprint 0 착수 가능)
>
> **Project**: bkit (bkit-claude-code)
> **타깃 버전**: v2.1.9 → **v2.1.10**
> **Source-of-Truth Plan 문서**:
> 1. `docs/01-plan/features/bkit-v2110-integrated-enhancement.plan.md` (원본, 1,070 lines)
> 2. `docs/01-plan/features/bkit-v2110-invocation-contract-addendum.plan.md` (Addendum, 822 lines, § 9/§ 12/§ 13/§ 15 대체)
> **Architecture**: Clean Architecture 4-layer (Presentation / Application / Domain / Infrastructure)
> **핵심 불변 제약**: Invocation Contract (39 skills + 36 agents + 16 MCP tools + 24 hook event blocks + slash commands)
> **Design Author**: cto-lead (standalone subagent mode, v2.1.69+ 아키텍처)
> **Date**: 2026-04-22
> **Branch**: `feat/v2110-integrated-enhancement`

---

## 📌 Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | CC v2.1.117 회귀 3건 (#51798/#51801/#51809) + MON-CC-06 누적 16건의 수동 문서 추적을 코드 registry로 전환하여 **bkit 자동화 신뢰**를 유지하고, 계층 혼재 5핫스팟을 Clean Architecture 4-layer로 해소해 ENH 추가 시 파급 최소화 |
| **WHO** | (a) 39 skills + 36 agents + 16 MCP tools + 24 hook event blocks를 호출하는 **bkit 사용자 전원** (zero-action 업데이트), (b) `lib/` 직접 참조하는 bkit 기여자 (ADR 참조 1~2h) |
| **RISK** | (1) 리팩토링 중 Invocation Contract 위반 (외부 호출 깨짐) (2) Guard 오탐으로 자동화 체감 저하 (3) status.js v1→v3 migration 깨짐 (4) token-ledger 본문 유출 Critical (5) ENH-257 실측 중 CC v2.1.118 hotfix 배포 |
| **SUCCESS** | Contract Test L1~L4 PASS (619 TC) + Clean Architecture 순환 의존 0 + Critical C1/C2 수정 + Registry ≥19 Guards + Docs=Code 불일치 0 |
| **SCOPE** | 9 ENH (P0 5 / P1 1 / P2 1 / P3 2) + 리팩토링 7파일 + Clean Architecture 신규 3디렉토리 (`lib/domain/`, `lib/cc-regression/`, `lib/infra/`) + Contract Test baseline+runner + CI workflow + ESLint/Prettier |

---

## 0. Executive Summary

### 0.1 범위 수치 (Plan + Addendum 통합)

| 항목 | 수치 | 비고 |
|------|------|------|
| 대응 ENH | **9건** | P0 5 + P1 1 + P2 1 + P3 2 |
| 추적 MON-CC | **21건** | MON-CC-02 1 + MON-CC-06 19 + 장기 OPEN 3 |
| Critical Bug | **2건** | C1 dead option, C2 details sanitizer |
| 리팩토링 파일 | **7개 핵심** | pre-write.js, status.js, audit-logger.js 등 |
| 신규 Domain 모듈 | **15+ 파일** | 6 ports + 4 guards + 1 rules + 6 cc-regression services |
| 신규 Infra 모듈 | **5 파일** | cc-bridge, telemetry, gh-cli, fs-state-store, docs-code-scanner |
| Contract Test TC | **624 TC** | L1 328 + L2 99 + L3 74 + L4 118 + L5 5 |
| CI Gate TC | **619 TC** | L1~L4 전수 PASS 필수, L5 관찰 |
| Sprint | **6 sprints / 22 영업일** | 병렬 시 16일 |
| 코드 변경 추정 | `+2,400 / -1,000 LOC` | Presentation 출력 byte diff 자유 (Addendum) |

### 0.2 2개 Plan 문서 통합 참조

| 구분 | 원본 Plan | Addendum |
|------|---------|--------|
| **UX 정의** | byte-exact 불변 | **Invocation Contract 불변** |
| **CI Gate** | UX Golden diff=0 | **Contract Test L1~L4 PASS** |
| **Sprint 0 기반작업** | UX golden 30 캡처 | Contract baseline 수집 (~195 assertions) |
| **§ 9 / § 12 / § 13 / § 15** | Superseded | **이 Design이 Addendum 기준 구체화** |
| **출력 포맷 개선** | 금지 | **허용** (ENH-264 statusline 자유 변경) |
| **ESLint 목적** | UX 제약 (`no-ui-logic-outside-presentation`) | **유지** (Clean Architecture 목적만) |
| **Presentation LOCKED 마커** | 모든 UI 파일 필수 | **제거** (과잉 제약) |

**충돌 시 Addendum 우선**. 이 Design은 Addendum을 기준선으로 원본 Plan의 나머지 섹션(§0~§8, §10, §11, §14, 부록)을 완전 반영.

### 0.3 Design 승인 후 Sprint 0 즉시 착수 가능 선언

본 Design은 다음 3가지 중 **마지막 질문에 대한 답**을 모두 제공합니다:
1. **어떤 파일에 어떤 코드를 쓸 것인가?** → §3~§5, §11, 부록 B/C
2. **각 모듈의 공개 API는 무엇인가?** → §2.3 (Port 6개), §7 (Contract Test), 부록 D
3. **구현자가 바로 Sprint 1 작업을 시작할 수 있는가?** → §12 Sprint별 체크리스트, §15 DAG

**Checkpoint**: 이후 Sprint 0 착수 시 추가 승인 불필요 (Plan+Addendum의 CTO 승인이 이 Design의 승인을 포함).

---

## 1. 설계 원칙 및 제약

### 1.1 4대 Pillar (Plan+Addendum 통합)

| Pillar | 정의 | 검증 |
|--------|-----|------|
| **P1 Invocation Contract 불변** | skills/agents/MCP tools/hook events/slash commands의 호출 인터페이스 100% 보존 | Contract Test L1~L4 619 TC PASS |
| **P2 Clean Architecture 4-layer** | Presentation ← Application ← Domain → Infrastructure 의존 방향 준수 | `madge --circular .` = 0, ESLint `no-restricted-imports` |
| **P3 Philosophy** | Automation First · No Guessing · Docs=Code | Guard는 차단 없이 attribution, ENH-257/264 2주 실측 필수 |
| **P4 Self-contained** | 외부 npm 의존 추가 금지, No TypeScript | `npm ci`는 dev-only, runtime deps 0 신규 |

### 1.2 설계 원칙 (7가지)

1. **Domain은 의존성 0**: `lib/domain/`, `lib/cc-regression/guards/`는 `require('fs'/'child_process'/'net'/'os')` 금지. ESLint custom rule로 강제.
2. **Port는 Type-only**: `*.port.js`는 `module.exports = {};` (runtime no-op) + JSDoc typedef만 포함.
3. **Adapter는 Infrastructure 전용**: 모든 CC API/fs/gh CLI/OTEL 호출은 `lib/infra/` 어댑터 경유.
4. **Guard는 순수 함수**: `check(ctx) → { hit, meta }` 시그니처, side effect 없음.
5. **Attribution 기반 방어**: Guard는 **차단하지 않고** stderr attribution만 출력 (CC 자체가 prompt 표시한 상황에서 원인 귀속).
6. **Lifecycle 자동 해제**: 각 Guard는 `removeWhen(ccVersion, evidence)` 구현 필수. CI 일 1회 reconcile 실행.
7. **UX 자유, Invocation 엄격**: 출력 포맷(statusline/dashboard/warnings)은 자유 변경, 호출 인터페이스는 Contract Test Gate.

### 1.3 엄격 제약 (Addendum 기준)

| # | 제약 | 준수 수단 |
|---|------|---------|
| C1 | Skill 디렉토리 이름 불변 | `test/contract/` L4 Deprecation Detection |
| C2 | Agent 파일 이름 불변 | L4 Deprecation Detection |
| C3 | MCP tool 이름 불변 | L4 |
| C4 | Hook event 이름 + matcher 축소 금지 | L1 Frontmatter Schema |
| C5 | MCP 필수 파라미터 추가/타입 변경 금지 | L3 Schema Compatibility |
| C6 | `.claude/commands/*.md` 파일명 불변 | L4 |
| C7 | Korean for docs/ | lint scope 제외, 검토 수동 |
| C8 | JSDoc typedef 필수 (new public func) | `tsc --allowJs --checkJs --noEmit` CI step |

---

## 2. Clean Architecture 4-Layer 상세 구조

### 2.1 디렉토리 트리 (before → after)

**Before (v2.1.9)**:
```
bkit-claude-code/
├── lib/
│   ├── core/           # 18 파일 — Domain + Infra 혼재
│   ├── pdca/           # 22 파일, status.js 872 LOC
│   ├── control/        # 7 파일
│   ├── quality/        # 7 파일
│   ├── team/           # coordinator.js 459 LOC
│   ├── audit/          # 3 파일, C1/C2 bugs
│   ├── context/        # 4 파일
│   ├── ui/             # 7 파일 (Presentation)
│   ├── dashboard/
│   ├── task/           # 4 파일
│   ├── intent/
│   └── ... (101 modules, 24,647 LOC)
├── hooks/
│   └── hooks.json      # 24 event blocks
├── scripts/            # 43 handlers
│   ├── pre-write.js    # 286 LOC (Domain + Infra 혼재)
│   ├── config-change-handler.js  # DANGEROUS_PATTERNS 하드코딩
│   └── ...
├── servers/
│   ├── bkit-pdca-server/    # 10 MCP tools
│   └── bkit-analysis-server/ # 6 MCP tools
├── skills/             # 39
├── agents/             # 36
└── test/               # 거의 비어있음
```

**After (v2.1.10)**:
```
bkit-claude-code/
├── lib/
│   ├── domain/                                 [NEW] Layer: Domain (의존성 0)
│   │   ├── ports/
│   │   │   ├── cc-payload.port.js              (Type-only, JSDoc)
│   │   │   ├── state-store.port.js
│   │   │   ├── regression-registry.port.js
│   │   │   ├── audit-sink.port.js
│   │   │   ├── token-meter.port.js
│   │   │   └── docs-code-index.port.js
│   │   ├── guards/
│   │   │   ├── enh-262-hooks-combo.js          (순수 함수 check(ctx))
│   │   │   ├── enh-263-claude-write.js
│   │   │   ├── enh-264-token-threshold.js
│   │   │   ├── enh-254-fork-precondition.js
│   │   │   └── dangerous-patterns.js
│   │   └── rules/
│   │       └── docs-code-invariants.js          (EXPECTED_COUNTS 상수)
│   │
│   ├── cc-regression/                           [NEW] Layer: Domain (Guard 레지스트리)
│   │   ├── registry.js                          (~180 LOC, Guard 메타 배열)
│   │   ├── defense-coordinator.js               (~240 LOC, 호출자)
│   │   ├── token-accountant.js                  (~200 LOC, ENH-264)
│   │   ├── lifecycle.js                         (~160 LOC, removeWhen 일괄)
│   │   ├── attribution-formatter.js             (~120 LOC, stderr 메시지)
│   │   ├── index.js                             (~60 LOC, Facade)
│   │   └── guards/                              (버전별 Guard)
│   │       ├── mon-cc-02.js                     (#47855 /compact block)
│   │       ├── mon-cc-06-native.js              (v2.1.113 회귀 10건 그룹)
│   │       ├── enh-247-precompact.js            (ENH-232 lifecycle)
│   │       └── ... 19+ Guards
│   │
│   ├── infra/                                   [NEW] Layer: Infrastructure
│   │   ├── cc-bridge.js                         (CCPayloadPort 구현)
│   │   ├── fs-state-store.js                    (StateStorePort)
│   │   ├── telemetry.js                         (AuditSinkPort + OTEL)
│   │   ├── gh-cli.js                            (gh issue/PR ops)
│   │   └── docs-code-scanner.js                 (DocsCodeIndexPort)
│   │
│   ├── pdca/
│   │   ├── status-core.js                       [SPLIT, ~300 LOC]
│   │   ├── status-migration.js                  [SPLIT, ~250 LOC]
│   │   ├── status-cleanup.js                    [SPLIT, ~300 LOC]
│   │   └── ... (나머지 20+ 파일 유지)
│   │
│   ├── audit/
│   │   └── audit-logger.js                      [FIX C1/C2 + sanitizer + OTEL bridge]
│   │
│   └── core/pdca/control/... (기존 유지, 단 직접 import는 adapter 경유)
│
├── hooks/
│   └── hooks.json                               [UNCHANGED, 24 blocks]
│
├── scripts/                                     [Layer: Infra entry — 파이프라인화]
│   ├── pre-write.js                             (286 → ~120 LOC)
│   ├── config-change-handler.js                 (DANGEROUS_PATTERNS → Domain 이동)
│   └── ... (41 기존 + 신규 2)
│
├── test/
│   └── contract/                                [NEW, Addendum §9]
│       ├── baseline/v2.1.9/                     (195 assertions)
│       │   ├── skills/                          (39 JSON)
│       │   ├── agents/                          (36 JSON)
│       │   ├── mcp-tools/bkit-pdca/             (10)
│       │   ├── mcp-tools/bkit-analysis/         (6)
│       │   ├── mcp-resources.json
│       │   ├── hook-events.json                 (24 blocks)
│       │   └── slash-commands.json
│       ├── scripts/
│       │   ├── contract-baseline-collect.js
│       │   └── contract-test-run.js
│       ├── fixtures/
│       │   └── minimal-valid-inputs.js          (MINIMAL_VALID_INPUT 매트릭스)
│       └── results/.gitkeep
│
├── .eslintrc.json                               [NEW]
├── .prettierrc                                  [NEW]
├── .github/workflows/
│   ├── contract-check.yml                       [NEW]
│   └── docs-code-check.yml                      [NEW]
│
└── docs/02-design/features/
    └── bkit-v2110-integrated-enhancement.design.md   [본 문서]
```

### 2.2 각 Layer 책임 경계 + 의존성 방향

```
┌──────────────────────────────────────────────────────────────┐
│ Presentation Layer                                           │
│   · lib/ui/*, lib/dashboard/*, lib/pdca/statusline/*         │
│   · 사용자 가시 출력: ANSI, 색상, 이모지, 문자열 포맷        │
│   · console.log / process.stdout.write 허용 (유일)           │
│   · ESLint: no-console OFF                                   │
└────────────────┬─────────────────────────────────────────────┘
                 ▼ depends on
┌──────────────────────────────────────────────────────────────┐
│ Application Layer                                            │
│   · lib/pdca/{status-core, phase, orchestrator}              │
│   · lib/control/*, lib/context/*                             │
│   · lib/team/coordinator (CC Task tool 제외)                 │
│   · UseCase 오케스트레이션, 트랜잭션 경계                     │
│   · Infra 직접 import 금지, Port 경유                         │
└────────────────┬─────────────────────────────────────────────┘
                 ▼ depends on
┌──────────────────────────────────────────────────────────────┐
│ Domain Layer (의존성 0)                                       │
│   · lib/domain/ports/*            (Type-only JSDoc)          │
│   · lib/domain/guards/*           (순수 함수)                │
│   · lib/domain/rules/*                                       │
│   · lib/cc-regression/*           (Guard Registry 포함)      │
│   · 금지: require('fs'/'child_process'/'net'/'os')           │
│   · ESLint: no-restricted-imports "error"                    │
└────────────────▲─────────────────────────────────────────────┘
                 │ implements
┌────────────────┴─────────────────────────────────────────────┐
│ Infrastructure Layer                                          │
│   · lib/infra/*     (Port 구현체)                            │
│   · scripts/*       (hook entry adapter)                     │
│   · hooks/hooks.json (CC 등록 manifest)                      │
│   · servers/*       (MCP 서버)                               │
│   · CC API, fs, child_process, gh CLI, OTEL exporter         │
└──────────────────────────────────────────────────────────────┘
```

**의존성 규칙 (ESLint 강제)**:
- Domain → X (어떤 것도 import 금지, node core 금지)
- Application → Domain ✓, Infra Port type-only ✓, Infra 구현체 ✗
- Presentation → Application ✓, Domain ✗ (표현 로직만), Infra ✗
- Infrastructure → Domain (Port 구현) ✓, Application ✗

### 2.3 DIP Port 6개 JSDoc typedef 상세

```js
// lib/domain/ports/cc-payload.port.js
/**
 * @typedef {Object} HookInput
 * @property {string} [tool_name]         - CC tool name (Bash, Write, Edit, ...)
 * @property {Object} [tool_input]        - CC tool 입력 원본
 * @property {string} [session_id]
 * @property {Object} [env_overrides]     - ENH-262: dangerouslyDisableSandbox 등
 * @property {string} [permission_decision] - 'allow'|'deny'|'ask'|'defer'
 * @property {Object} [additional_context]
 *
 * @typedef {Object} HookOutput
 * @property {'allow'|'deny'|'ask'|'defer'} [decision]
 * @property {string} [permissionDecision]
 * @property {Object} [updatedInput]
 * @property {string} [additionalContext]   - CC 10,000 char cap (ENH-240)
 * @property {string} [stopReason]
 *
 * @typedef {Object} CCPayloadPort
 * @property {() => Promise<HookInput>} read    - stdin JSON parse
 * @property {(out: HookOutput) => void} write  - stdout JSON.stringify
 * @property {(msg: string) => void} warn       - stderr attribution
 */
module.exports = {};  // Type-only, runtime no-op
```

```js
// lib/domain/ports/state-store.port.js
/**
 * @typedef {Object} StateStorePort
 * @property {(key: string) => Promise<any|null>} load
 * @property {(key: string, val: any) => Promise<void>} save
 * @property {(key: string) => Promise<{release: () => Promise<void>}>} lock
 * @property {(key: string) => Promise<void>} delete
 *
 * Concrete keys (Infra 측 규약):
 *   · "pdca-status"         → .bkit/state/pdca-status.json
 *   · "audit-YYYY-MM-DD"    → .bkit/audit/YYYY-MM-DD.jsonl (append-only)
 *   · "token-ledger"        → .bkit/runtime/token-ledger.json (NDJSON)
 *   · "cc-regression-reg"   → .bkit/state/cc-regression-registry.json
 *   · "session-ctx-fp"      → .bkit/runtime/session-ctx-fp.json (ENH-239)
 */
module.exports = {};
```

```js
// lib/domain/ports/regression-registry.port.js
/**
 * @typedef {Object} Guard
 * @property {string} id               - "MON-CC-02", "ENH-262", ...
 * @property {string} issue            - GitHub issue URL
 * @property {'HIGH'|'MEDIUM'|'LOW'} severity
 * @property {string} since            - CC version where regression first seen
 * @property {string|null} expectedFix - CC version where fix expected
 * @property {string[]} affectedFiles
 * @property {string} guardFile
 * @property {string|null} resolvedAt  - ISO timestamp when deactivated
 * @property {(ctx: Object) => {hit: boolean, meta?: Object}} check
 * @property {(ccVersion: string, evidence?: Object) => boolean} removeWhen
 *
 * @typedef {Object} RegressionRegistryPort
 * @property {() => Promise<Guard[]>} listActive
 * @property {(id: string) => Promise<boolean>} isResolved
 * @property {(id: string, reason: string) => Promise<void>} deactivate
 * @property {() => Promise<void>} reconcile   - CI 일 1회 호출
 */
module.exports = {};
```

```js
// lib/domain/ports/audit-sink.port.js
/**
 * @typedef {Object} AuditEvent
 * @property {string} id               - UUID
 * @property {string} timestamp        - ISO 8601
 * @property {string} sessionId
 * @property {string} actor            - 'user'|'system'|'agent'|'hook'
 * @property {string} action
 * @property {string} category
 * @property {string} target
 * @property {Object} details          - Sanitized (C2 fix)
 * @property {string} result           - 'success'|'failure'|'skipped'
 * @property {string} [reason]
 * @property {boolean} destructiveOperation
 * @property {string|null} blastRadius
 * @property {string} bkitVersion
 *
 * @typedef {Object} AuditSinkPort
 * @property {(event: AuditEvent) => Promise<void>} emit
 */
module.exports = {};
```

```js
// lib/domain/ports/token-meter.port.js
/**
 * @typedef {Object} TurnMetrics
 * @property {string} turnId
 * @property {string} sessionHash      - SHA-256(sessionId) — PII 방지
 * @property {string} agent            - 'cto-lead', 'security-architect', ...
 * @property {string} model            - 'claude-sonnet-4-6', 'claude-opus-4-7'
 * @property {string} ccVersion
 * @property {number} turnIndex
 * @property {number} inputTokens
 * @property {number} outputTokens
 * @property {number} overheadDelta    - ENH-264 per-turn 오버헤드
 * @property {string[]} ccRegressionFlags
 *
 * @typedef {Object} TokenMeterPort
 * @property {(turnId: string) => Promise<TurnMetrics|null>} read
 * @property {(metrics: TurnMetrics) => Promise<void>} accumulate
 * @property {() => Promise<number>} rotateIfNeeded  - 30일 rolling
 */
module.exports = {};
```

```js
// lib/domain/ports/docs-code-index.port.js (ENH-241)
/**
 * @typedef {Object} DocsCodeMeasure
 * @property {number} skills       - 39 (SKILL.md count)
 * @property {number} agents       - 36 (agents/*.md count)
 * @property {number} hooks        - 24 (hooks.json event blocks)
 * @property {number} libModules   - 101 (lib/**.js)
 * @property {number} scripts      - 43 (scripts/*.js)
 * @property {number} mcpServers   - 2
 *
 * @typedef {Object} Discrepancy
 * @property {string} doc          - 문서 경로
 * @property {string} field        - 'skills'|'agents'|'hooks'|...
 * @property {number|string} declared
 * @property {number|string} actual
 * @property {string} line         - `README.md:L42`
 *
 * @typedef {Object} DocsCodeIndexPort
 * @property {() => Promise<DocsCodeMeasure>} measure
 * @property {(docPath: string) => Promise<Discrepancy[]>} crossCheck
 */
module.exports = {};
```

---

## 3. 신규 모듈 설계

### 3.1 lib/domain/ — 순수 규칙과 Guard

#### 3.1.1 lib/domain/guards/enh-262-hooks-combo.js (Plan §5.8)

**목적**: CC v2.1.117 #51798 회귀 탐지 (PreToolUse `allow` + `dangerouslyDisableSandbox:true` + Bash 조합 시 prompt 발생).

**공개 API**:
```js
/**
 * @param {import('../ports/cc-payload.port.js').HookInput} ctx
 * @returns {{ hit: boolean, meta?: { id: string, severity: string, note: string, issue: string } }}
 */
function check(ctx) {
  if (ctx.tool_name !== 'Bash') return { hit: false };
  if (!ctx.tool_input?.env_overrides?.dangerouslyDisableSandbox) return { hit: false };
  if (ctx.permission_decision !== 'allow') return { hit: false };
  return {
    hit: true,
    meta: {
      id: 'ENH-262',
      severity: 'HIGH',
      note: 'CC v2.1.117 #51798 regression — not a bkit failure',
      issue: 'https://github.com/anthropics/claude-code/issues/51798',
    },
  };
}

/**
 * @param {string} ccVersion - e.g., "2.1.118"
 * @returns {boolean} true = this guard can be deactivated
 */
function removeWhen(ccVersion) {
  return semverGte(ccVersion, '2.1.118');  // CC hotfix 대기
}

module.exports = { id: 'ENH-262', check, removeWhen };
```

**의존성**: 없음 (Domain). `semverGte`는 Plan+Addendum에서 허용한 유틸(`lib/domain/util/semver.js` 신규, 순수 JS).
**테스트 접근**: L1 unit — 4가지 조합 fixture (tool_name × env_overrides × permission_decision).

#### 3.1.2 lib/domain/guards/enh-263-claude-write.js (Plan §5.9)

**목적**: CC #51801 회귀 — `bypassPermissions` + `.claude/{agents,skills,channels,commands}` write 조합 시 prompt 발생.

**공개 API**:
```js
const CLAUDE_PROTECTED_DIRS = [
  '.claude/agents', '.claude/skills', '.claude/channels', '.claude/commands',
];

function check(ctx) {
  if (!['Write', 'Edit'].includes(ctx.tool_name)) return { hit: false };
  const filePath = ctx.tool_input?.file_path || '';
  if (!CLAUDE_PROTECTED_DIRS.some(dir => filePath.includes(dir))) return { hit: false };
  if (ctx.tool_input?.env_overrides?.bypassPermissions !== true) return { hit: false };
  return {
    hit: true,
    meta: {
      id: 'ENH-263',
      severity: 'HIGH',
      note: 'CC v2.1.117 #51801 regression — built-in .claude/ protection overrides hook allow',
      issue: 'https://github.com/anthropics/claude-code/issues/51801',
    },
  };
}

function removeWhen(ccVersion) {
  return semverGte(ccVersion, '2.1.118');
}

module.exports = { id: 'ENH-263', check, removeWhen };
```

#### 3.1.3 lib/domain/guards/enh-264-token-threshold.js (Plan §5.10)

**목적**: Sonnet 4.6 per-turn 오버헤드 탐지 (임계값 8,000 토큰 초과 시 SessionEnd 경고 트리거).

**공개 API**:
```js
const OVERHEAD_THRESHOLD = 8000;

/**
 * @param {import('../ports/token-meter.port.js').TurnMetrics} metrics
 * @returns {{ hit: boolean, meta?: Object }}
 */
function check(metrics) {
  if (metrics.model !== 'claude-sonnet-4-6') return { hit: false };
  if (metrics.overheadDelta <= OVERHEAD_THRESHOLD) return { hit: false };
  return {
    hit: true,
    meta: {
      id: 'ENH-264',
      severity: 'MEDIUM',
      note: `Sonnet 4.6 overhead +${metrics.overheadDelta} tokens/turn exceeds ${OVERHEAD_THRESHOLD}`,
      issue: 'https://github.com/anthropics/claude-code/issues/51809',
    },
  };
}

function removeWhen(ccVersion) {
  return semverGte(ccVersion, '2.1.118');
}

module.exports = { id: 'ENH-264', check, removeWhen, OVERHEAD_THRESHOLD };
```

#### 3.1.4 lib/domain/guards/enh-254-fork-precondition.js (Plan §5.1)

**목적**: `context: fork` skill 실행 전 precondition 검증 (FORK_SUBAGENT env + 플랫폼 + disable-model-invocation).

**공개 API**:
```js
/**
 * @param {{
 *   envOverrides: Object,
 *   platform: 'darwin'|'linux'|'win32',
 *   skill: { name: string, context: string, disableModelInvocation?: boolean }
 * }} ctx
 * @returns {{ hit: boolean, meta?: { reasons: string[], severity: string } }}
 */
function check(ctx) {
  if (ctx.skill?.context !== 'fork') return { hit: false };
  const reasons = [];

  if (!ctx.envOverrides?.CLAUDE_CODE_FORK_SUBAGENT) {
    reasons.push('CLAUDE_CODE_FORK_SUBAGENT=1 not set (CC v2.1.117 F1 required)');
  }
  if (ctx.platform === 'win32' && ctx.skill?.disableModelInvocation) {
    reasons.push('Windows + disable-model-invocation triggers #51165 regression');
  }

  return reasons.length > 0
    ? { hit: true, meta: { id: 'ENH-254', reasons, severity: 'HIGH' } }
    : { hit: false };
}

function removeWhen(ccVersion) {
  return semverGte(ccVersion, '2.1.120');  // Windows fix 보수적 기대
}

module.exports = { id: 'ENH-254', check, removeWhen };
```

#### 3.1.5 lib/domain/guards/dangerous-patterns.js (Plan §H1)

**목적**: 현재 `scripts/config-change-handler.js:29-35`에 하드코딩된 5-item 블랙리스트를 Domain으로 이동.

**공개 API**:
```js
const DANGEROUS_PATTERNS = Object.freeze([
  'dangerouslyDisableSandbox',
  'excludedCommands',
  'autoAllowBashIfSandboxed',
  'chmod 777',
  'allowRead',
]);

/**
 * @param {{ content: string }} ctx
 * @returns {{ hit: boolean, patterns: string[], severity: string }}
 */
function check(ctx) {
  const found = DANGEROUS_PATTERNS.filter(p => ctx.content?.includes(p));
  return found.length > 0
    ? { hit: true, patterns: found, severity: 'HIGH' }
    : { hit: false, patterns: [], severity: 'NONE' };
}

module.exports = { check, DANGEROUS_PATTERNS };
```

**이점**: config-change-handler(Infra)에서 Domain Guard 경유 호출하게 되어, L1 unit test로 패턴 리스트를 직접 검증 가능. ENH-246 P0 연계 (참조 링크 주석에 포함).

#### 3.1.6 lib/domain/rules/docs-code-invariants.js (ENH-241)

**목적**: Docs=Code 기준 수치 상수화. `measure()` 결과와 비교 대상.

```js
/**
 * 2026-04-22 실측 기준
 * Hooks 수치는 Addendum §3.4 (hooks.json 24 blocks) 기준
 */
const EXPECTED_COUNTS = Object.freeze({
  skills: 39,
  agents: 36,
  hooks: 24,         // 24 event blocks (MEMORY "21" 은 누적 집계, 교정 대상)
  libModules: 101,
  scripts: 43,
  mcpServers: 2,
  mcpTools: 16,      // bkit-pdca 10 + bkit-analysis 6
  mcpResources: 3,   // bkit://pdca/status, bkit://quality/metrics, bkit://audit/latest
});

module.exports = { EXPECTED_COUNTS };
```

### 3.2 lib/cc-regression/ — Guard Registry + Lifecycle

#### 3.2.1 registry.js (~180 LOC)

**목적**: MON-CC-06 19건 + ENH-262/263/264 + MON-CC-02 = **21+ Guards 메타 배열**.

```js
// lib/cc-regression/registry.js
const CC_REGRESSIONS = [
  {
    id: 'MON-CC-02',
    issue: 'https://github.com/anthropics/claude-code/issues/47855',
    severity: 'HIGH',
    since: '2.1.6',
    expectedFix: '2.1.117',                             // ENH-257 실측 대상
    affectedFiles: ['scripts/context-compaction.js:44-56'],
    guardFile: 'lib/cc-regression/guards/mon-cc-02.js',
    resolvedAt: null,
  },
  {
    id: 'ENH-262',
    issue: 'https://github.com/anthropics/claude-code/issues/51798',
    severity: 'HIGH',
    since: '2.1.117',
    expectedFix: null,                                   // CC hotfix 대기
    affectedFiles: ['scripts/pre-write.js:67-77'],
    guardFile: 'lib/domain/guards/enh-262-hooks-combo.js',
    resolvedAt: null,
  },
  {
    id: 'ENH-263',
    issue: 'https://github.com/anthropics/claude-code/issues/51801',
    severity: 'HIGH',
    since: '2.1.117',
    expectedFix: null,
    affectedFiles: ['scripts/pre-write.js:65-76'],
    guardFile: 'lib/domain/guards/enh-263-claude-write.js',
    resolvedAt: null,
  },
  {
    id: 'ENH-264',
    issue: 'https://github.com/anthropics/claude-code/issues/51809',
    severity: 'MEDIUM',
    since: '2.1.117',
    expectedFix: null,
    affectedFiles: ['lib/pdca/status-core.js', 'lib/cc-regression/token-accountant.js'],
    guardFile: 'lib/domain/guards/enh-264-token-threshold.js',
    resolvedAt: null,
  },
  {
    id: 'ENH-254',
    issue: 'https://github.com/anthropics/claude-code/issues/51165',
    severity: 'HIGH',
    since: '2.1.116',
    expectedFix: null,
    affectedFiles: ['skills/zero-script-qa/SKILL.md'],
    guardFile: 'lib/domain/guards/enh-254-fork-precondition.js',
    resolvedAt: null,
  },
  // MON-CC-06 native binary regressions (v2.1.113, 10건 그룹)
  ...['50274', '50383', '50384', '50541', '50567',
      '50609', '50616', '50618', '50640', '50852'].map(num => ({
    id: `MON-CC-06-#${num}`,
    issue: `https://github.com/anthropics/claude-code/issues/${num}`,
    severity: 'MEDIUM',
    since: '2.1.113',
    expectedFix: null,
    affectedFiles: [],                                   // 환경 조건부, 방어 불가, 모니터만
    guardFile: 'lib/cc-regression/guards/mon-cc-06-native.js',
    resolvedAt: null,
  })),
  // v2.1.114~116 HIGH (6건)
  ...['51165', '51234', '51266', '51275', '51391', '50974'].map(num => ({
    id: `MON-CC-06-#${num}`,
    issue: `https://github.com/anthropics/claude-code/issues/${num}`,
    severity: 'HIGH',
    since: '2.1.114',
    expectedFix: null,
    affectedFiles: [],
    guardFile: 'lib/cc-regression/guards/mon-cc-06-native.js',
    resolvedAt: null,
  })),
];

/**
 * @returns {import('../domain/ports/regression-registry.port.js').Guard[]}
 */
function listAll() {
  return CC_REGRESSIONS.slice();
}

function findById(id) {
  return CC_REGRESSIONS.find(r => r.id === id) || null;
}

module.exports = { listAll, findById, CC_REGRESSIONS };
```

#### 3.2.2 defense-coordinator.js (~240 LOC)

**목적**: 모든 Guard의 진입점. `scripts/pre-write.js`가 이 한 함수만 호출.

```js
// lib/cc-regression/defense-coordinator.js
const registry = require('./registry');
const attribution = require('./attribution-formatter');

const HOT_GUARDS = [
  require('../domain/guards/enh-262-hooks-combo'),
  require('../domain/guards/enh-263-claude-write'),
  require('../domain/guards/enh-254-fork-precondition'),
  // enh-264는 metrics 경유이므로 token-accountant에서 별도 호출
];

/**
 * @param {import('../domain/ports/cc-payload.port.js').HookInput} ctx
 * @param {import('../domain/ports/audit-sink.port.js').AuditSinkPort} audit
 * @returns {Promise<{ hits: Array<{id, meta}>, messages: string[] }>}
 */
async function check(ctx, audit) {
  const hits = [];
  const messages = [];

  // bypassFlag: audit-only mode
  const bypass = process.env.BKIT_CC_REGRESSION_BYPASS === '1';

  for (const guard of HOT_GUARDS) {
    try {
      const result = guard.check(ctx);
      if (!result.hit) continue;

      const meta = result.meta || {};
      hits.push({ id: guard.id, meta });

      await audit.emit({
        id: `guard-${Date.now()}-${guard.id}`,
        timestamp: new Date().toISOString(),
        sessionId: ctx.session_id || '',
        actor: 'hook',
        action: 'cc-regression-detected',
        category: 'control',
        target: meta.id,
        targetType: 'guard',
        details: { issue: meta.issue, severity: meta.severity },
        result: 'success',
        destructiveOperation: false,
        blastRadius: null,
        bkitVersion: require('../core/version').BKIT_VERSION,
      });

      if (!bypass) {
        messages.push(attribution.format(meta));
      }
    } catch (e) {
      // Guard 실패는 조용히 넘어가되 audit에 기록
      if (process.env.BKIT_DEBUG) {
        console.error(`[cc-regression] Guard ${guard.id} threw: ${e.message}`);
      }
    }
  }

  return { hits, messages };
}

module.exports = { check };
```

#### 3.2.3 token-accountant.js (~200 LOC, ENH-264)

**목적**: per-turn 토큰 측정 + NDJSON append. **본문 redact 필수 (A03 Injection 방어)**.

```js
// lib/cc-regression/token-accountant.js

const REDACT_KEYS = Object.freeze(['text', 'content', 'prompt', 'message', 'api_key', 'token', 'password']);

/**
 * Redacts sensitive fields from metrics before NDJSON emit.
 * @param {Object} raw
 * @returns {import('../domain/ports/token-meter.port.js').TurnMetrics}
 */
function sanitizeMetrics(raw) {
  const out = Object.assign({}, raw);
  for (const key of REDACT_KEYS) delete out[key];
  return out;
}

/**
 * @param {import('../domain/ports/token-meter.port.js').TokenMeterPort} meter
 * @param {Object} rawTurn - raw data from hook stdin
 * @returns {Promise<void>}
 */
async function recordTurn(meter, rawTurn) {
  const clean = sanitizeMetrics(rawTurn);
  await meter.accumulate(clean);
  await meter.rotateIfNeeded();
}

/**
 * @param {import('../domain/ports/token-meter.port.js').TurnMetrics} metrics
 * @returns {boolean} true = threshold exceeded
 */
function checkThreshold(metrics) {
  const guard = require('../domain/guards/enh-264-token-threshold');
  return guard.check(metrics).hit;
}

module.exports = { recordTurn, checkThreshold, sanitizeMetrics, REDACT_KEYS };
```

**NDJSON 스키마** (`.bkit/runtime/token-ledger.json`):
```
{"ts":"2026-04-22T13:45:12.301Z","sessionHash":"a7f3...9e","agent":"security-architect","model":"claude-sonnet-4-6","ccVersion":"2.1.117","turnIndex":42,"inputTokens":14320,"outputTokens":2108,"overheadDelta":7240,"ccRegressionFlags":["51809"]}
```

Rotate: 30일 rolling, rotate 시 `.bkit/runtime/archive/token-ledger-YYYY-MM.jsonl` 이동.

#### 3.2.4 lifecycle.js (~160 LOC)

**목적**: CI 일 1회 실행. `expectedFix` 도달 Guard는 retest 후 자동 비활성.

```js
// lib/cc-regression/lifecycle.js
const registry = require('./registry');
const semver = require('../domain/util/semver');

/**
 * @param {import('../domain/ports/regression-registry.port.js').RegressionRegistryPort} repo
 * @param {string} ccVersion - e.g., "2.1.118"
 * @returns {Promise<{ deactivated: string[], kept: string[] }>}
 */
async function reconcile(repo, ccVersion) {
  const all = registry.listAll();
  const deactivated = [];
  const kept = [];

  for (const r of all) {
    if (r.resolvedAt) { kept.push(r.id); continue; }
    if (!r.expectedFix) { kept.push(r.id); continue; }

    if (semver.gte(ccVersion, r.expectedFix)) {
      const guard = require('../..' + '/' + r.guardFile);  // resolver
      if (typeof guard.removeWhen === 'function' && guard.removeWhen(ccVersion)) {
        await repo.deactivate(r.id, `auto-resolved at CC ${ccVersion}`);
        deactivated.push(r.id);
      } else {
        kept.push(r.id);
      }
    } else {
      kept.push(r.id);
    }
  }

  return { deactivated, kept };
}

/**
 * Detects current CC version from runtime environment.
 * @returns {string|null}
 */
function detectCCVersion() {
  return process.env.CLAUDE_CODE_VERSION || null;
}

module.exports = { reconcile, detectCCVersion };
```

**주간 자동화**: `cc-version-researcher` agent가 `gh issue view <num> --json state,closedAt,labels` 후 `CC_REGRESSIONS[i].expectedFix` 갱신 PR 생성.

#### 3.2.5 attribution-formatter.js (~120 LOC)

**목적**: Guard hit 시 stderr에 조용히 출력할 메시지 포맷.

```js
// lib/cc-regression/attribution-formatter.js
/**
 * @param {{ id: string, severity: string, note: string, issue?: string }} meta
 * @returns {string}
 */
function format(meta) {
  const prefix = meta.severity === 'HIGH' ? '⚠' : 'ℹ';
  const issueRef = meta.issue ? ` (${meta.issue})` : '';
  return `[bkit ${prefix}] ${meta.id}: ${meta.note}${issueRef}`;
}

module.exports = { format };
```

#### 3.2.6 index.js (Facade, ~60 LOC)

```js
// lib/cc-regression/index.js
module.exports = {
  Defense:   require('./defense-coordinator'),
  Registry:  require('./registry'),
  Lifecycle: require('./lifecycle'),
  Token:     require('./token-accountant'),
  Attribution: require('./attribution-formatter'),
};
```

### 3.3 lib/infra/ — Port 구현체

#### 3.3.1 cc-bridge.js (CCPayloadPort 구현)

```js
// lib/infra/cc-bridge.js
const { readStdinSync, outputAllow, outputBlock, outputEmpty } = require('../core/io');

/** @implements {import('../domain/ports/cc-payload.port.js').CCPayloadPort} */
const CCBridge = {
  async read() {
    return readStdinSync();  // parseHookInput 호환
  },
  write(out) {
    if (out.decision === 'deny') return outputBlock(out.reason || '');
    if (out.decision === 'allow') return outputAllow(out.additionalContext || '');
    return outputEmpty();
  },
  warn(msg) {
    process.stderr.write(msg + '\n');
  },
};

module.exports = CCBridge;
```

#### 3.3.2 telemetry.js (AuditSinkPort + OTEL, ENH-259)

```js
// lib/infra/telemetry.js
const fs = require('fs');
const path = require('path');
const { BKIT_VERSION } = require('../core/version');

/**
 * File sink (기존 audit-logger 호환)
 * @implements {import('../domain/ports/audit-sink.port.js').AuditSinkPort}
 */
function createFileSink(auditDir) {
  return {
    async emit(event) {
      const day = event.timestamp.slice(0, 10);
      const filePath = path.join(auditDir, `${day}.jsonl`);
      await fs.promises.mkdir(auditDir, { recursive: true });
      await fs.promises.appendFile(filePath, JSON.stringify(event) + '\n', 'utf8');
    },
  };
}

/**
 * OTEL sink (ENH-259, 환경변수 OTEL_EXPORTER_OTLP_ENDPOINT 활성 시)
 */
function createOtelSink(endpoint) {
  // Self-contained: 외부 OTEL SDK 의존 금지 → plain HTTP POST (OTLP/HTTP JSON)
  return {
    async emit(event) {
      const body = JSON.stringify({
        resourceLogs: [{
          resource: { attributes: [{ key: 'service.name', value: { stringValue: 'bkit' } }] },
          scopeLogs: [{
            logRecords: [{
              timeUnixNano: String(Date.parse(event.timestamp) * 1e6),
              severityText: event.result === 'failure' ? 'ERROR' : 'INFO',
              body: { stringValue: `${event.actor}:${event.action}` },
              attributes: Object.entries({
                'bkit.id': event.id,
                'bkit.session': event.sessionId,
                'bkit.category': event.category,
                'bkit.target': event.target,
                'bkit.version': BKIT_VERSION,
              }).map(([key, val]) => ({ key, value: { stringValue: String(val) } })),
            }],
          }],
        }],
      });
      try {
        const { request } = require('http');  // or https based on URL
        await new Promise((resolve, reject) => {
          const req = request(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, resolve);
          req.on('error', reject);
          req.write(body);
          req.end();
        });
      } catch (_) { /* OTEL off = zero overhead */ }
    },
  };
}

/**
 * Dual sink: 항상 file + optional OTEL
 */
function createDualSink(auditDir) {
  const sinks = [createFileSink(auditDir)];
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (endpoint) sinks.push(createOtelSink(endpoint));
  return {
    async emit(event) {
      await Promise.all(sinks.map(s => s.emit(event)));
    },
  };
}

module.exports = { createFileSink, createOtelSink, createDualSink };
```

**redact 정책**: `token-accountant`의 `sanitizeMetrics`는 domain 단에서 보장 → sink는 redact 불필요 (이미 cleaned). audit-logger는 `details` sanitizer (§4.3 C2 fix)로 별도 책임.

#### 3.3.3 fs-state-store.js (StateStorePort)

```js
// lib/infra/fs-state-store.js
const fs = require('fs');
const path = require('path');

const KEY_PATHS = {
  'pdca-status':             '.bkit/state/pdca-status.json',
  'cc-regression-registry':  '.bkit/state/cc-regression-registry.json',
  'session-ctx-fp':          '.bkit/runtime/session-ctx-fp.json',
  'token-ledger':            '.bkit/runtime/token-ledger.json',
};

/** @implements {import('../domain/ports/state-store.port.js').StateStorePort} */
const FsStateStore = {
  async load(key) {
    const p = resolve(key);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(await fs.promises.readFile(p, 'utf8'));
  },
  async save(key, val) {
    const p = resolve(key);
    await fs.promises.mkdir(path.dirname(p), { recursive: true });
    await fs.promises.writeFile(p, JSON.stringify(val, null, 2), 'utf8');
  },
  async lock(key) {
    const lockFile = resolve(key) + '.lock';
    const start = Date.now();
    while (fs.existsSync(lockFile)) {
      if (Date.now() - start > 5000) throw new Error(`lock timeout: ${key}`);
      await new Promise(r => setTimeout(r, 50));
    }
    fs.writeFileSync(lockFile, String(process.pid));
    return {
      async release() {
        try { fs.unlinkSync(lockFile); } catch (_) {}
      },
    };
  },
  async delete(key) {
    const p = resolve(key);
    if (fs.existsSync(p)) await fs.promises.unlink(p);
  },
};

function resolve(key) {
  const rel = KEY_PATHS[key];
  if (!rel) throw new Error(`Unknown state key: ${key}`);
  return path.join(process.cwd(), rel);
}

module.exports = FsStateStore;
```

#### 3.3.4 gh-cli.js (GitHub ops)

```js
// lib/infra/gh-cli.js
const { execFileSync } = require('child_process');

/**
 * @param {number} issue
 * @returns {Promise<{state: string, closedAt: string|null, labels: string[]}>}
 */
async function issueView(issue) {
  const out = execFileSync('gh', ['issue', 'view', String(issue), '--json', 'state,closedAt,labels'], { encoding: 'utf8' });
  return JSON.parse(out);
}

/**
 * Used by lifecycle to observe gh rate-limit hints (ENH-262 v2.1.116 I8 수혜).
 */
async function withBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e) {
      if (!/rate limit/i.test(e.message)) throw e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('gh rate-limit exceeded after retries');
}

module.exports = { issueView, withBackoff };
```

#### 3.3.5 docs-code-scanner.js (DocsCodeIndexPort, ENH-241)

```js
// lib/infra/docs-code-scanner.js
const fs = require('fs');
const path = require('path');
const { EXPECTED_COUNTS } = require('../domain/rules/docs-code-invariants');

async function measure() {
  const root = process.cwd();
  return {
    skills: countGlob(root, 'skills', /\/SKILL\.md$/),
    agents: countGlob(root, 'agents', /\.md$/),
    hooks: Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'hooks/hooks.json'), 'utf8')).hooks).length,
    libModules: countGlobRec(root, 'lib', /\.js$/),
    scripts: countGlob(root, 'scripts', /\.js$/),
    mcpServers: fs.readdirSync(path.join(root, 'servers')).filter(d => fs.statSync(path.join(root, 'servers', d)).isDirectory()).length,
  };
}

async function crossCheck(docPath) {
  const content = await fs.promises.readFile(docPath, 'utf8');
  const actual = await measure();
  const discrepancies = [];

  const checks = [
    { field: 'skills', pattern: /(\d+)\s+skills?/gi },
    { field: 'agents', pattern: /(\d+)\s+agents?/gi },
    { field: 'hooks',  pattern: /(\d+)\s+hook\s*events?/gi },
  ];

  for (const { field, pattern } of checks) {
    let m; pattern.lastIndex = 0;
    while ((m = pattern.exec(content))) {
      const declared = parseInt(m[1], 10);
      if (declared !== actual[field]) {
        const line = content.slice(0, m.index).split('\n').length;
        discrepancies.push({ doc: docPath, field, declared, actual: actual[field], line: `${docPath}:L${line}` });
      }
    }
  }
  return discrepancies;
}

function countGlob(root, sub, re) { return fs.readdirSync(path.join(root, sub)).filter(f => re.test(f)).length; }
function countGlobRec(root, sub, re) {
  let count = 0;
  function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (re.test(f)) count++;
    }
  }
  walk(path.join(root, sub));
  return count;
}

module.exports = { measure, crossCheck, EXPECTED_COUNTS };
```

---

## 4. 기존 파일 리팩토링 설계

### 4.1 lib/pdca/status.js — 872 → 3파일 분할 (Plan §11.2)

**Why**: ENH-264 token 상태 통합 + v1→v2→v3 migration 격리. 단일 파일 872 LOC는 권고(300 LOC)의 2.9배.

**분할 기준**:
| 신규 파일 | 포함할 함수 | 예상 LOC |
|----------|-----------|--------|
| `status-core.js` | `getPdcaStatus`, `getPdcaStatusFull`, `updatePdcaStatus`, `setCurrentFeature`, `getSchemaVersion`, cache (`_cache`) | **~300** |
| `status-migration.js` | `migrateV1toV2`, `migrateV2toV3`, `detectSchemaVersion`, cold path one-shot | **~250** |
| `status-cleanup.js` | `deleteFeatureFromStatus`, `enforceFeatureLimit`, `cleanupArchivedFeatures`, `getArchivedFeatures` | **~300** |

**공개 API 동결**: 현재 `module.exports = { ... }` 목록 100% 동일 유지. 내부에서 3파일로 re-export:

```js
// lib/pdca/status.js (신규 facade, ~20 LOC)
module.exports = {
  ...require('./status-core'),
  ...require('./status-migration'),
  ...require('./status-cleanup'),
};
```

→ 모든 호출자(e.g., `scripts/pre-write.js:30` `getPdcaStatusFull`)는 수정 불필요.

**Migration one-shot 격리**: `status-migration.js`는 `migrate()` 단일 공개 함수. `status-core.load()`가 v<current 감지 시 **한 번만** 호출. v2.1.10 신규 세션에서는 cold path 진입 안 됨.

**테스트 접근**:
- L1: 각 파일 단위 테스트 (별도 파일로 분리되어 테스트 작성 용이해짐)
- 회귀 방지: 기존 `module.exports` 20+ 함수 전수 재노출 확인 (Contract Test L4 해당 없음, 내부 구조만)

### 4.2 scripts/pre-write.js — 286 → ~120 LOC 파이프라인화 (Plan §11.3)

**Before (286 LOC)**: top-level 절차형, 8 단계 인라인, silent catch 4회.

**After 구조**:
```js
#!/usr/bin/env node
// scripts/pre-write.js (v2.1.10, ~120 LOC)

const CCBridge = require('../lib/infra/cc-bridge');
const { Defense } = require('../lib/cc-regression');
const DangerousPatterns = require('../lib/domain/guards/dangerous-patterns');
const { createDualSink } = require('../lib/infra/telemetry');
const { auditDir } = require('../lib/core/paths');
const { updatePdcaStatus, getPdcaStatusFull } = require('../lib/pdca/status');
const { classifyTaskByLines, getPdcaLevel } = require('../lib/task/classification');
const { generateTaskGuidance } = require('../lib/task/creator');
const { findDesignDoc, findPlanDoc } = require('../lib/pdca/phase');
const { isSourceFile, extractFeature } = require('../lib/core/file');

async function onPreToolUse() {
  const input = await CCBridge.read();
  if (!input?.tool_input?.file_path) { CCBridge.write({ decision: 'allow' }); return; }

  const audit = createDualSink(auditDir());

  // Layer 2a — CC Regression (Domain)
  const { hits, messages } = await Defense.check(input, audit);
  messages.forEach(m => CCBridge.warn(m));

  // Layer 2b — Dangerous patterns (Domain)
  const dangerous = DangerousPatterns.check({ content: input.tool_input.content || '' });
  if (dangerous.hit) {
    CCBridge.write({ decision: 'deny', additionalContext: `Dangerous pattern: ${dangerous.patterns.join(', ')}` });
    return;
  }

  // Application — PDCA update
  const feature = isSourceFile(input.tool_input.file_path) ? extractFeature(input.tool_input.file_path) : '';
  if (feature && getPdcaStatusFull()?.currentFeature === feature) {
    updatePdcaStatus(feature, 'do', { lastFile: input.tool_input.file_path });
  }

  // Task classification (existing, delegated)
  const classification = input.tool_input.content
    ? classifyTaskByLines(input.tool_input.content) : 'quick_fix';
  const level = getPdcaLevel(classification);
  const hint = generateTaskGuidance({ feature, level, classification });

  CCBridge.write({ decision: 'allow', additionalContext: hint || '' });
}

onPreToolUse().catch(err => {
  if (process.env.BKIT_DEBUG) console.error(`[pre-write] ${err.message}`);
  CCBridge.write({ decision: 'allow' });   // fail-open, 기존 동작과 일치
});
```

**Silent catch 통일**: 전역 `.catch(err => ...)` 1회. 내부 Guard 실패는 `Defense.check` 내 audit + BKIT_DEBUG.

**Contract Test L2 (Invocation Smoke)**: `MINIMAL_VALID_INPUT.Write = { tool_name: 'Write', tool_input: { file_path: '/tmp/test.js', content: 'x' } }` 로 stdin 주입 → stdout JSON parse 가능 확인.

### 4.3 lib/audit/audit-logger.js — C1/C2 fix + sanitizer + OTEL bridge

#### 4.3.1 C1 Fix (dead option) — audit-logger.js:332-344

**Before**:
```js
function getSessionStats() {
  const today = new Date().toISOString().split('T')[0];
  const logs = readAuditLogs({ startDate: today });   // ❌ readAuditLogs는 startDate 미지원
  // ...
}
```

**After**:
```js
function getSessionStats() {
  const today = new Date().toISOString().split('T')[0];
  const logs = readAuditLogs({ date: today });         // ✅ date 파라미터 사용
  // ...
}
```

테스트 L1: `getSessionStats()`가 오늘 날짜 로그만 반환하는지 fixture로 검증.

#### 4.3.2 C2 Fix (details sanitizer) — audit-logger.js:104-122

```js
// lib/audit/audit-logger.js (normalizeEntry 수정)
const DETAILS_BLACKLIST = ['password', 'token', 'apiKey', 'api_key', 'secret', 'auth'];
const DETAILS_VALUE_CAP = 500;

function sanitizeDetails(details) {
  if (!details || typeof details !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(details)) {
    if (DETAILS_BLACKLIST.some(bad => k.toLowerCase().includes(bad))) {
      clean[k] = '***REDACTED***';
    } else if (typeof v === 'string' && v.length > DETAILS_VALUE_CAP) {
      clean[k] = v.slice(0, DETAILS_VALUE_CAP) + '...[truncated]';
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

function normalizeEntry(entry) {
  return {
    // ... (기존 필드 유지)
    details: sanitizeDetails(entry.details),    // ✅ sanitize 적용
    // ...
  };
}
```

**테스트 L1**: `{password: "xxx", prompt: "very long text ×600 chars"}` 입력 → details.password === '***REDACTED***', details.prompt.length ≤ 503 ('...[truncated]' 포함) 확인.

#### 4.3.3 OTEL bridge (ENH-259)

`writeAuditLog` 내부에서 기존 file append는 유지하고, 환경변수 `OTEL_EXPORTER_OTLP_ENDPOINT` 설정 시 `lib/infra/telemetry.createOtelSink`에 병렬 발화. 구현은 §3.3.2 기준.

조건부 강등 기준: audit-logger ↔ OTEL payload 중복 분석 1h 수행 → 중복 ≥ 50%이면 P2 유지, 미만이면 P3 강등 (Sprint 2 착수 시 판정).

### 4.4 scripts/context-compaction.js — ENH-257 lifecycle 훅 포인트 (Plan §5.3)

**현재 역할**: Opus 1M context `/compact` block (MON-CC-02 #47855 방어).

**v2.1.10 훅 추가**:
```js
// scripts/context-compaction.js (기존 로직 유지 + lifecycle 호출 추가)
const { Lifecycle } = require('../lib/cc-regression');

async function main() {
  // ... 기존 MON-CC-02 block 로직 (block 발화 카운터 추가)

  const today = new Date().toISOString().slice(0, 10);
  const store = require('../lib/infra/fs-state-store');
  const tally = (await store.load('cc-regression-registry'))?.mon_cc_02_block_count || {};
  tally[today] = (tally[today] || 0) + 1;
  await store.save('cc-regression-registry', { ...await store.load('cc-regression-registry'), mon_cc_02_block_count: tally });

  // ENH-257 실측: 2주간 샘플 축적 → lifecycle가 판정
}
```

**판정 기준** (Plan §5.3): 2주 100+ 샘플 중 block 발생률 < 5% → `removeWhen()` 자동 해제 / ≥ 5% → 유지.

### 4.5 hooks/startup/session-context.js — ENH-167 BKIT_VERSION + 빌더 통일

#### 4.5.1 BKIT_VERSION 중앙화 (Plan §11.5)

```js
// hooks/startup/session-context.js:233 (교정)
// Before: const version = "v2.1.9";
// After:
const { BKIT_VERSION } = require('../../lib/core/version');
const version = `v${BKIT_VERSION}`;
```

`lib/core/version.js`는 `v2.1.10` (신규 중앙 상수). plugin.json / README / audit-logger 모두 이 모듈 참조.

#### 4.5.2 빌더 통일 (Plan §11.4)

11개 `ctx += ...` 패턴 → `array.push + join` (ENH-240 budget guard 친화적, ~30% 빠름).

```js
// Before:
let ctx = '';
ctx += buildSection1();
ctx += buildSection2();
// ... 11회

// After:
const parts = [];
parts.push(buildSection1());
parts.push(buildSection2());
// ...
const ctx = parts.filter(Boolean).join('\n\n');
```

ENH-240 Budget Guard (`lib/core/context-budget.js:applyBudget`)가 최종 `ctx` 대상으로 8,000자 cap 적용 (이미 구현됨, 확인만).

---

## 5. ENH 9건 모듈 설계

본 섹션은 §3.1 Guards와 §3.2 cc-regression/ 모듈의 **ENH 관점 요약**입니다. 상세 코드는 §3.

### 5.1 ENH-254 (P0) — FORK_SUBAGENT + #51165 (2.5h)

| 축 | 상세 |
|---|---|
| 모듈 | `lib/domain/guards/enh-254-fork-precondition.js` (§3.1.4) |
| 호출자 | `scripts/subagent-start-handler.js` (skill 실행 전 check) |
| 공개 API | `check(ctx)`, `removeWhen(ccVersion)` |
| 의존성 | 없음 (Domain) |
| 구현 예시 | §3.1.4 참조 |
| 테스트 | L1: 4 조합 fixture (env × platform × dim-invocation × skill.context) · L3: #51165 Docker 재현 |
| UX 영향 | `warnings/fork-precondition-fail.txt` 새 형식 (자유 변경, Addendum) |

### 5.2 ENH-256 (P0) — Glob/Grep native 전수 (1.5h)

| 축 | 상세 |
|---|---|
| 모듈 | `scripts/cc-tool-audit.js` (신규 Infra) |
| 작업 | `skills/**/*.md + agents/**/*.md + scripts/*.js + lib/**/*.js` 에서 "Glob\|Grep native" 문자열 grep |
| 대체 | 발견 시 Bash `bfs` / `ugrep` 대체 패턴 기록 |
| 산출물 | `docs/03-analysis/bkit-v2110-glob-grep-audit.md` (결과 0건 기대, 문서만) |
| 테스트 | L5: 3 플랫폼(macOS/Linux/Windows) 크로스 실행 |

### 5.3 ENH-257 (P1) — F6/B14 PreCompact 해제 판정 (2h, 2주 실측)

| 축 | 상세 |
|---|---|
| 모듈 | `lib/cc-regression/guards/mon-cc-02.js` |
| 판정 기준 | 2주 100+ 샘플 / block 발생률 < 5% → 해제, ≥ 5% → 유지 |
| 자동화 | `lifecycle.reconcile()` CI 일 1회 실행이 임계값 계산 |
| 훅 포인트 | `scripts/context-compaction.js` (§4.4) block 발화 시 카운터 증가 |
| 종료 조건 | `removeWhen('2.1.118')` 또는 block rate < 5% 검증 후 `resolvedAt` 설정 |

### 5.4 ENH-259 (P2 조건부) — OTEL dual sink (2.5h)

| 축 | 상세 |
|---|---|
| 모듈 | `lib/infra/telemetry.js` (§3.3.2), `lib/audit/audit-logger.js` bridge |
| 조건부 강등 판정 | audit-logger ↔ OTEL payload 중복 분석 (Sprint 2 진입 시 1h 측정) |
| 활성화 | `OTEL_EXPORTER_OTLP_ENDPOINT` 환경변수 설정 시에만 |
| 오버헤드 | OTEL off 시 0 (sink 배열에 추가되지 않음) |
| 테스트 | L1: redact 확인 (`api_key`→`***`), L2: OTEL endpoint 모킹하여 POST 확인 |

### 5.5 ENH-260 (P3) — B11 subagent malware 자동수혜

**코드 변경 0**. `docs/04-report/features/v2110.report.md`에 "v2.1.117 B11 자동 수혜로 CTO Team 12명 병렬 spawn 안정성 향상" 1-line 기록.

### 5.6 ENH-261 (P3) — B2 WebFetch HTML 자동수혜

**코드 변경 0**. `docs/bkend-cookbook.md` 또는 `docs/04-report/v2110.report.md`에 "v2.1.117+ 대용량 HTML fetch 성능 개선" 1-line.

### 5.7 ENH-262 (P0) — #51798 통합 방어 (1h)

§3.1.1 + §3.2.2 참조. **UX 영향 없음** (CC가 prompt 표시 시 bkit는 stderr attribution만).

### 5.8 ENH-263 (P0) — #51801 `.claude/` write (2h)

§3.1.2 + §3.2.2 참조. Guard check 로직이 ENH-262와 동일 패턴 (module.exports 시그니처 호환).

### 5.9 ENH-264 (P0) — #51809 per-turn 토큰 측정 (3h)

| 축 | 상세 |
|---|---|
| 모듈 | `lib/cc-regression/token-accountant.js` (§3.2.3), `lib/domain/guards/enh-264-token-threshold.js` (§3.1.3) |
| 통합 | `lib/pdca/status-core.js` (분할 후)에 turn index 제공, token-accountant가 write |
| 스키마 | `.bkit/runtime/token-ledger.json` NDJSON (§3.2.3 스키마) |
| Rotate | 30일 rolling, `.bkit/runtime/archive/` |
| 임계값 | `OVERHEAD_THRESHOLD=8000` → SessionEnd 경고 |
| UX 영향 | **statusline에 "Sonnet overhead: +X tokens/turn" 표시** (Addendum 자유 변경 허용) |
| redact | `REDACT_KEYS` 7개 (text/content/prompt/message/api_key/token/password) 강제 삭제 |
| Philosophy | No Guessing — **측정만**, 정책 결정은 2주 실측 후 별도 |

---

## 6. MON-CC 방어선 라이프사이클 설계

### 6.1 Registry 스키마 (19+ Guards)

§3.2.1 참조. 현재 **21+ Guards** 등록:
- MON-CC-02: 1건
- ENH-262/263/264/254: 4건
- MON-CC-06 native binary (v2.1.113): 10건
- MON-CC-06 HIGH (v2.1.114~116): 6건

**성장 가능성**: v2.1.118+ 등장 시 `cc-version-researcher` 주간 자동 분석으로 신규 Guard 추가 PR.

### 6.2 lifecycle.reconcile() 로직

§3.2.4 참조. CI cron (예: GitHub Actions daily):

```yaml
# .github/workflows/cc-regression-reconcile.yml
name: CC Regression Reconcile (Daily)
on:
  schedule: [{ cron: '0 2 * * *' }]   # UTC 02:00
  workflow_dispatch:

jobs:
  reconcile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: node scripts/cc-regression-reconcile.js
      - name: Commit registry updates
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'chore: reconcile cc-regression registry'
          commit-message: 'chore: reconcile cc-regression registry'
          branch: chore/cc-regression-reconcile
```

### 6.3 CC 버전 감지

`lib/cc-regression/lifecycle.js:detectCCVersion()`:

```js
function detectCCVersion() {
  // v2.1.74 autoMemoryDirectory 이후 CLAUDE_CODE_VERSION 공식 제공
  if (process.env.CLAUDE_CODE_VERSION) return process.env.CLAUDE_CODE_VERSION;

  // fallback: gh cli로 최신 npm version 조회
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync('npm', ['view', '@anthropic-ai/claude-code', 'version'], { encoding: 'utf8' });
    return out.trim();
  } catch (_) { return null; }
}
```

### 6.4 주간 cc-version-researcher 자동화

매주 월요일 `cc-version-researcher` agent 실행 조건:
1. CC npm 신규 버전 등장 → `claude-code-vX.X.X-impact-analysis.report.md` 생성
2. Registry 각 Guard의 `expectedFix`가 닫혔는지 `gh issue view` 확인 후 `resolvedAt` 업데이트 PR
3. 신규 MON-CC-06 회귀 발견 시 registry에 추가

---

## 7. Invocation Contract Test 구현 설계 (Addendum §8~9)

### 7.1 Baseline Collector 상세 (contract-baseline-collect.js)

```js
// test/contract/scripts/contract-baseline-collect.js
// Usage: node test/contract/scripts/contract-baseline-collect.js --version v2.1.9

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');

const args = parseArgs({ options: { version: { type: 'string', default: 'v2.1.9' } } }).values;
const baseDir = path.join(__dirname, '..', 'baseline', args.version);

function parseFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // naive list parse
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    }
    if (val === 'true') val = true; if (val === 'false') val = false;
    fm[key] = val;
  }
  return fm;
}

function sortKeysDeep(obj) {
  if (Array.isArray(obj)) return obj.map(sortKeysDeep);
  if (obj && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, k) => { acc[k] = sortKeysDeep(obj[k]); return acc; }, {});
  }
  return obj;
}

function collectSkills() {
  const skillsDir = path.join(__dirname, '..', '..', '..', 'skills');
  for (const name of fs.readdirSync(skillsDir)) {
    const skillFile = path.join(skillsDir, name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const fm = parseFrontmatter(skillFile);
    const canonical = sortKeysDeep({
      name: fm.name,
      context: fm.context || null,
      'user-invocable': fm['user-invocable'] !== false,
      description_len: String(fm.description || '').length,
      'allowed-tools': fm['allowed-tools'] || null,
      agents: fm.agents || null,
    });
    const outFile = path.join(baseDir, 'skills', `${fm.name}.json`);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(canonical, null, 2));
  }
}

function collectAgents() {
  const agentsDir = path.join(__dirname, '..', '..', '..', 'agents');
  for (const file of fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'))) {
    const fm = parseFrontmatter(path.join(agentsDir, file));
    const canonical = sortKeysDeep({
      name: fm.name,
      model: fm.model || null,
      effort: fm.effort || null,
      tools: fm.tools || null,
      mcpServers: fm.mcpServers || null,
    });
    const outFile = path.join(baseDir, 'agents', `${fm.name}.json`);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(canonical, null, 2));
  }
}

function collectMcpTools() {
  // servers/*/index.js 또는 tools.js 에서 definition 정적 파싱
  // (간단: require 후 introspection — MCP 서버는 server.tool('name', schema, handler) 호출 패턴)
  for (const server of ['bkit-pdca-server', 'bkit-analysis-server']) {
    const file = path.join(__dirname, '..', '..', '..', 'servers', server, 'index.js');
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    // Regex: server.tool('name', { ... schema }, ...)
    const re = /server\.tool\(\s*['"]([^'"]+)['"]\s*,\s*(\{[\s\S]*?\})\s*,/g;
    let m;
    while ((m = re.exec(content))) {
      const toolName = m[1];
      // eval-free: rough canonical — in practice we refine regex or use AST parser
      const required = Array.from(m[2].matchAll(/required:\s*\[([^\]]*)\]/g))
        .flatMap(mm => mm[1].split(',').map(s => s.trim().replace(/['"]/g, '')))
        .filter(Boolean);
      const canonical = sortKeysDeep({ name: toolName, required });
      const outFile = path.join(baseDir, 'mcp-tools', server.replace('-server', ''), `${toolName}.json`);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, JSON.stringify(canonical, null, 2));
    }
  }
}

function collectHooks() {
  const hooksJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'hooks', 'hooks.json'), 'utf8'));
  const summary = {};
  for (const [event, entries] of Object.entries(hooksJson.hooks)) {
    summary[event] = entries.map(e => ({
      matcher: e.matcher || null,
      once: e.once || false,
      if: e.if || null,
      handlers: e.hooks.map(h => path.basename(h.command.replace(/.*\//, '').replace(/["']/g, ''))),
    }));
  }
  const outFile = path.join(baseDir, 'hook-events.json');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(sortKeysDeep(summary), null, 2));
}

function main() {
  collectSkills();
  collectAgents();
  collectMcpTools();
  collectHooks();
  console.log(`Baseline collected: ${args.version}`);
}

main();
```

### 7.2 Test Runner 상세 (contract-test-run.js)

§8 확장: L1/L2/L3/L4 구현 pseudocode.

```js
// test/contract/scripts/contract-test-run.js
// Usage: node ... --compare v2.1.9 --level L1,L2,L3,L4

const { parseArgs } = require('util');
const fs = require('fs'); const path = require('path');
const { execSync } = require('child_process');
const { MINIMAL_VALID_INPUT } = require('../fixtures/minimal-valid-inputs');

const args = parseArgs({ options: {
  compare: { type: 'string' },
  level:   { type: 'string', default: 'L1,L2,L3,L4' },
} }).values;

const baseDir = path.join(__dirname, '..', 'baseline', args.compare);
const levels = args.level.split(',');
const failures = [];

// ─── L1: Frontmatter Schema ───
if (levels.includes('L1')) {
  // Skills
  for (const f of fs.readdirSync(path.join(baseDir, 'skills'))) {
    const baseline = JSON.parse(fs.readFileSync(path.join(baseDir, 'skills', f), 'utf8'));
    const current = require('./runner/parse-skill')(baseline.name);    // helper
    if (!current) { failures.push(`L1 FAIL: skill '${baseline.name}' removed`); continue; }
    if (current.name !== baseline.name) failures.push(`L1 FAIL: skill name changed`);
    if (baseline.context && current.context !== baseline.context)
      failures.push(`L1 FAIL: skill '${baseline.name}' context changed`);
    if (current.description_len > 1536) failures.push(`L1 FAIL: skill '${baseline.name}' description > 1536`);
    // user-invocable true→false 금지
    if (baseline['user-invocable'] === true && current['user-invocable'] === false)
      failures.push(`L1 FAIL: skill '${baseline.name}' user-invocable regressed`);
    // allowed-tools 삭제 금지 (superset check)
    if (Array.isArray(baseline['allowed-tools']) && Array.isArray(current['allowed-tools'])) {
      for (const t of baseline['allowed-tools']) {
        if (!current['allowed-tools'].includes(t))
          failures.push(`L1 FAIL: skill '${baseline.name}' allowed-tools '${t}' removed`);
      }
    }
  }
  // Agents
  for (const f of fs.readdirSync(path.join(baseDir, 'agents'))) {
    const baseline = JSON.parse(fs.readFileSync(path.join(baseDir, 'agents', f), 'utf8'));
    const current = require('./runner/parse-agent')(baseline.name);
    if (!current) { failures.push(`L1 FAIL: agent '${baseline.name}' removed`); continue; }
    if (current.name !== baseline.name) failures.push(`L1 FAIL: agent name changed`);
    if (baseline.model && current.model !== baseline.model)
      failures.push(`L1 FAIL: agent '${baseline.name}' model removed/changed`);
    if (Array.isArray(baseline.tools)) {
      for (const t of baseline.tools) {
        if (!current.tools || !current.tools.includes(t))
          failures.push(`L1 FAIL: agent '${baseline.name}' tools '${t}' removed`);
      }
    }
  }
  // MCP tools
  for (const file of glob(path.join(baseDir, 'mcp-tools/**/*.json'))) {
    const baseline = JSON.parse(fs.readFileSync(file, 'utf8'));
    const current = require('./runner/parse-mcp')(baseline.name);
    if (!current) { failures.push(`L1 FAIL: MCP tool '${baseline.name}' removed`); continue; }
    // required[] superset check (기존 필수 유지)
    for (const p of baseline.required) {
      if (!current.required.includes(p))
        failures.push(`L1 FAIL: MCP '${baseline.name}' required '${p}' removed`);
    }
  }
}

// ─── L2: Invocation Smoke (hook stdin→stdout) ───
if (levels.includes('L2')) {
  const baseline = JSON.parse(fs.readFileSync(path.join(baseDir, 'hook-events.json'), 'utf8'));
  for (const [event, entries] of Object.entries(baseline)) {
    for (const entry of entries) {
      for (const handler of entry.handlers) {
        const input = MINIMAL_VALID_INPUT[event] || '{}';
        try {
          const result = execSync(`echo '${JSON.stringify(input)}' | node scripts/${handler}`, { encoding: 'utf8', timeout: 10000 });
          if (result.trim()) JSON.parse(result);          // stdout must be valid JSON if non-empty
        } catch (e) {
          failures.push(`L2 FAIL: ${handler} (${event}): ${e.message.slice(0, 80)}`);
        }
      }
    }
  }
}

// ─── L3: Schema Compatibility (MCP minimal request) ───
if (levels.includes('L3')) {
  for (const file of glob(path.join(baseDir, 'mcp-tools/**/*.json'))) {
    const baseline = JSON.parse(fs.readFileSync(file, 'utf8'));
    // 최소 필수 파라미터만으로 요청 객체 생성
    const minReq = {};
    for (const p of baseline.required) minReq[p] = getDefaultFor(p);
    // 현재 서버가 minReq를 수락하는지 정적 검증 (schema validator 호환)
    const current = require('./runner/parse-mcp')(baseline.name);
    for (const p of current.required) {
      if (!(p in minReq)) failures.push(`L3 FAIL: ${baseline.name} new required param '${p}' (breaking)`);
    }
  }
}

// ─── L4: Deprecation Detection ───
if (levels.includes('L4')) {
  const currentSkills = fs.readdirSync('skills').filter(n => fs.existsSync(`skills/${n}/SKILL.md`));
  const baselineSkills = fs.readdirSync(path.join(baseDir, 'skills')).map(f => f.replace('.json', ''));
  for (const name of baselineSkills) {
    if (!currentSkills.includes(name)) {
      // 삭제된 skill: deprecatedIn 마크 필수
      const fm = safeParseFM(`skills/${name}/SKILL.md`);
      if (!fm || !fm.deprecatedIn)
        failures.push(`L4 FAIL: skill '${name}' removed without deprecatedIn mark`);
    }
  }
  // agents 동일 패턴
  // MCP tools, hook events, slash commands 동일 패턴
}

// ─── Report ───
if (failures.length) {
  console.error('\n=== Contract Test FAILED ===');
  failures.forEach(f => console.error('  ' + f));
  process.exit(1);
}
console.log(`\n=== Contract Test PASSED (${levels.length} levels) ===`);
```

### 7.3 MINIMAL_VALID_INPUT 매트릭스 (fixtures/)

```js
// test/contract/fixtures/minimal-valid-inputs.js
module.exports = {
  MINIMAL_VALID_INPUT: {
    SessionStart:   { session_id: 'test-session' },
    PreToolUse:     { tool_name: 'Write', tool_input: { file_path: '/tmp/x.js', content: 'x' }, session_id: 'test' },
    PostToolUse:    { tool_name: 'Write', tool_input: { file_path: '/tmp/x.js' }, tool_response: { success: true }, session_id: 'test' },
    Stop:           { session_id: 'test' },
    StopFailure:    { session_id: 'test', reason: 'test' },
    UserPromptSubmit: { prompt: 'hello', session_id: 'test' },
    PreCompact:     { trigger: 'manual', session_id: 'test' },
    PostCompact:    { session_id: 'test' },
    TaskCompleted:  { taskId: 'test-task', session_id: 'test' },
    SubagentStart:  { subagent_type: 'cto-lead', session_id: 'test' },
    SubagentStop:   { subagent_type: 'cto-lead', session_id: 'test' },
    TeammateIdle:   { teammate: 'developer', session_id: 'test' },
    SessionEnd:     { session_id: 'test' },
    PostToolUseFailure: { tool_name: 'Bash', error: 'test', session_id: 'test' },
    InstructionsLoaded: { session_id: 'test' },
    ConfigChange:   { source: 'project_settings', file_path: '.claude/settings.json' },
    PermissionRequest: { tool_name: 'Write', file_path: '/tmp/x.js', session_id: 'test' },
    Notification:   { type: 'permission_prompt', session_id: 'test' },
    CwdChanged:     { cwd: '/tmp', session_id: 'test' },
    TaskCreated:    { taskId: 'test-task', session_id: 'test' },
    FileChanged:    { tool_name: 'Write', tool_input: { file_path: 'docs/test.md' }, session_id: 'test' },
  },
};
```

### 7.4 CI Workflow (.github/workflows/contract-check.yml)

Addendum §9.4 기준 전체 YAML:

```yaml
name: Invocation Contract Check

on:
  pull_request: { branches: [main] }
  push:         { branches: [main] }

jobs:
  contract-l1-l4:
    name: Contract Test (L1-L4) - CI Gate
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: L1 - Frontmatter Schema (328 TC)
        run: node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L1
      - name: L2 - Invocation Smoke (99 TC)
        run: node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L2
      - name: L3 - Schema Compatibility (74 TC)
        run: node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L3
      - name: L4 - Deprecation Detection (118 TC)
        run: node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L4

  contract-l5-e2e:
    name: Contract Test (L5 E2E - Observation Only)
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L5
```

### 7.5 L1~L5 구현 pseudocode 확장

| Level | 단위 | 구현 | 실패 예시 |
|-------|-----|------|---------|
| **L1** | skill frontmatter 필드 비교 | baseline JSON ↔ 현재 frontmatter sort/diff | `L1 FAIL: skill 'pdca' context changed (main → fork)` |
| **L2** | hook handler stdin→stdout JSON 유효성 | MINIMAL_VALID_INPUT[event] 주입 → JSON.parse | `L2 FAIL: pre-write.js (PreToolUse): Unexpected token` |
| **L3** | MCP minimal request 수락 | required[] 기반 minimal payload → current schema validate | `L3 FAIL: bkit_plan_read new required param 'version'` |
| **L4** | baseline 존재 항목의 현재 존재 여부 | 없으면 deprecatedIn 마크 필수 | `L4 FAIL: skill 'pdca-batch' removed without deprecatedIn` |
| **L5** | 5 E2E 시나리오 전수 | 실제 CC session 또는 mock으로 실행 | (관찰만, CI 차단 아님) |

---

## 8. Docs=Code 부채 해소 설계 (ENH-241)

### 8.1 DocsCodeIndexPort 구현

§3.3.5 참조. `lib/infra/docs-code-scanner.js`에서 `measure()` + `crossCheck(docPath)`.

### 8.2 hooks 24 blocks vs MEMORY 21 교정 자동화

**Addendum §13 자식 이슈로 편입된 교정 대상**:

| 파일 | 교정 대상 | 방법 |
|------|--------|------|
| `README.md` | "Hook Events: 21" → "Hook Events: 24" (해당 시) | manual patch + docs-code-check CI |
| `MEMORY.md` | "21 Hook Events" (Architecture 실측) → "24 Hook Events" | manual patch |
| `.claude-plugin/plugin.json` | `description` 필드 "21 Hook Events" → "24" | manual patch |
| `lib/audit/audit-logger.js` | `BKIT_VERSION` 근처 상수 (해당 시) | 해당 없음 확인 |
| `docs/02-design/**/*.md` (본 문서 포함) | "hooks 24 blocks" 명시 | 본 문서 §2.3.5, §3.3.5, §7 기 반영 |

**자동 탐지**: `scripts/docs-code-check.js` (신규):

```js
#!/usr/bin/env node
// scripts/docs-code-check.js
const scanner = require('../lib/infra/docs-code-scanner');
const DOCS_TO_CHECK = ['README.md', 'MEMORY.md', '.claude-plugin/plugin.json'];

async function main() {
  const allDiscrepancies = [];
  for (const doc of DOCS_TO_CHECK) {
    const discs = await scanner.crossCheck(doc);
    allDiscrepancies.push(...discs);
  }
  if (allDiscrepancies.length === 0) {
    console.log('Docs=Code check PASSED (0 discrepancies)');
    return;
  }
  console.error('Docs=Code check FAILED:');
  allDiscrepancies.forEach(d => console.error(`  ${d.line}: ${d.field} declared=${d.declared} actual=${d.actual}`));
  process.exit(1);
}
main();
```

### 8.3 CI Gate (.github/workflows/docs-code-check.yml)

```yaml
name: Docs=Code Check
on: { pull_request: { branches: [main] } }
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: node scripts/docs-code-check.js
```

---

## 9. UX/출력 포맷 개선 설계 (Addendum: Invocation 무관 자유 변경)

### 9.1 statusline 토큰 오버헤드 표시 (ENH-264)

**위치**: `lib/pdca/status-core.js`에서 파생되는 `lib/pdca/statusline.js` (기존 또는 신규).

**형식**:
```
[PDCA Design] bkit-v2110 | Match: 95% | Iter 2/5 | ⚠ Sonnet +7,240 tokens/turn
```

조건부 표시: `token-accountant.checkThreshold()` true 시에만. Opus 4.7 세션에서는 표시 안 됨.

### 9.2 warnings/fork-precondition-fail.txt 형식 (ENH-254)

**형식 (stderr 출력)**:
```
⚠ [bkit ENH-254] Fork precondition failed:
  - CLAUDE_CODE_FORK_SUBAGENT=1 not set (CC v2.1.117 F1 required)
  - Windows + disable-model-invocation triggers #51165 regression

Fix:
  export CLAUDE_CODE_FORK_SUBAGENT=1
  or run on macOS/Linux

See: https://github.com/anthropics/claude-code/issues/51165
```

### 9.3 CC regression attribution 포맷 (§3.2.5)

**stderr 메시지 1-line**:
```
[bkit ⚠] ENH-262: CC v2.1.117 #51798 regression — not a bkit failure (https://github.com/anthropics/claude-code/issues/51798)
```

### 9.4 dashboard 개선 (선택적)

`lib/dashboard/dashboard.js` (기존)에 MON-CC 섹션 추가 가능:

```
╔══ CC Regression Monitor ═══════════════════╗
║ Active Guards: 21  (HIGH: 13, MEDIUM: 8)   ║
║ Resolved (auto): 0                          ║
║ Pending CC Fix: ENH-262/263/264 @ v2.1.118  ║
╚═════════════════════════════════════════════╝
```

(선택적 구현; v2.1.10 필수 아님).

---

## 10. 코딩 컨벤션 도입 설계 (Plan §10)

### 10.1 .eslintrc.json 상세 설정

```json
{
  "env": { "node": true, "es2022": true },
  "extends": "eslint:recommended",
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "script" },
  "rules": {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-empty": ["error", { "allowEmptyCatch": false }],
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          { "group": ["**/infra/**"], "message": "Application/Domain must not import Infrastructure directly. Use Port." }
        ],
        "paths": [
          { "name": "fs",              "message": "Domain layer must not use fs. Use StateStorePort." },
          { "name": "child_process",   "message": "Domain layer must not exec commands." },
          { "name": "net",             "message": "Domain layer must not use net." }
        ]
      }
    ],
    "max-lines": ["warn", { "max": 500, "skipBlankLines": true, "skipComments": true }]
  },
  "overrides": [
    {
      "files": ["lib/domain/**"],
      "rules": {
        "max-lines": ["error", { "max": 300 }]
      }
    },
    {
      "files": ["lib/infra/**", "scripts/**", "hooks/**", "servers/**"],
      "rules": {
        "no-restricted-imports": "off",
        "no-console": "off"
      }
    },
    {
      "files": ["lib/ui/**", "lib/dashboard/**", "lib/pdca/statusline*.js"],
      "rules": { "no-console": "off" }
    },
    {
      "files": ["test/**"],
      "env": { "jest": false, "mocha": false }
    }
  ]
}
```

### 10.2 .prettierrc 상세

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 10.3 no-ui-logic-outside-presentation custom rule 구현

**위치**: `scripts/eslint-rules/no-ui-logic-outside-presentation.js` (신규)

**목적**: Plan §9.2의 "Application/Domain/Infra 레이어에서 `process.stdout.write`, ANSI escape, `chalk` 호출 금지"를 강제. (Addendum에서 UX 제약은 해제되었으나 Clean Architecture 목적은 유지.)

```js
// scripts/eslint-rules/no-ui-logic-outside-presentation.js
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow stdout/stderr write outside Presentation layer' },
  },
  create(context) {
    const filename = context.getFilename();
    // Presentation layer 파일만 허용
    if (filename.includes('/lib/ui/') || filename.includes('/lib/dashboard/') ||
        filename.includes('/lib/pdca/statusline') ||
        filename.includes('/scripts/') || filename.includes('/hooks/')) {
      return {};   // exempt
    }
    return {
      MemberExpression(node) {
        if (node.object?.name === 'process' && ['stdout', 'stderr'].includes(node.property?.name)) {
          if (node.parent?.type === 'MemberExpression' && node.parent.property?.name === 'write') {
            context.report({ node, message: 'Use Port.write() or debugLog instead of process.stdout.write' });
          }
        }
      },
    };
  },
};
```

`.eslintrc.json` 에서 등록:
```json
{
  "plugins": ["bkit-local"],
  "rules": { "bkit-local/no-ui-logic-outside-presentation": "error" }
}
```

(`plugins` 섹션은 개발 편의상 `eslint-plugin-bkit-local/index.js`로 진입. dev-dependency 경로 등록.)

### 10.4 pre-commit hook + CI lint gate

**pre-commit** (`.husky/pre-commit` 또는 `scripts/pre-commit.sh`):
```sh
#!/bin/sh
npx eslint lib/ scripts/ hooks/ test/ || exit 1
node scripts/docs-code-check.js       || exit 1
node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L1 || exit 1
```

**CI lint** (`.github/workflows/lint.yml`):
```yaml
name: Lint
on: { pull_request: { branches: [main] } }
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npx eslint lib/ scripts/ hooks/ test/
      - run: npx tsc --allowJs --checkJs --noEmit --moduleResolution node --target es2022 lib/**/*.js scripts/**/*.js || true
```

`tsc --checkJs`는 JSDoc typedef 검증용. 외부 패키지 추가 없이 Node 개발환경에 `typescript` devDep만 필요. (본 Plan의 "Self-contained"는 runtime deps에 한정; dev-only는 허용.)

---

## 11. 테스트 설계 (L1~L5)

### 11.1 L1 Contract Test TC 상세 (328 TC)

| 표면 | 단위 | TC/단위 | 소계 |
|------|-----|---------|------|
| Skills | 39 | 4 (name, context, description_len, allowed-tools superset) | 156 |
| Agents | 36 | 3 (name, model, tools superset) | 108 |
| MCP tools | 16 | 4 (name, required, enum, response envelope) | 64 |
| **L1 합계** | | | **328** |

### 11.2 L2 Smoke Test (99 TC)

| 표면 | 단위 | 소계 |
|------|-----|------|
| Hook handlers | 24 event blocks × 1 stdin→stdout | 24 |
| Skill slash invoke | 39 manifests | 39 |
| Agent manifest 존재 | 36 | 36 |
| **L2 합계** | | **99** |

### 11.3 L3 Schema Compatibility (74 TC)

| 항목 | 단위 | 소계 |
|------|-----|------|
| MCP minimal request | 16 | 16 |
| Hook stdout field | 24 × 2 fields (`decision` 또는 `additionalContext`) | 48 |
| Skill output category | 10 대표 | 10 |
| **L3 합계** | | **74** |

### 11.4 L4 Deprecation Detection (118 TC)

| 항목 | 단위 | 소계 |
|------|-----|------|
| Skill name diff | 39 | 39 |
| Agent name diff | 36 | 36 |
| MCP tool name diff | 16 | 16 |
| Hook event key diff | 24 | 24 |
| MCP Resource URI diff | 3 | 3 |
| **L4 합계** | | **118** |

**CI Gate (L1~L4) 총합**: **619 TC**.

### 11.5 L5 E2E 시나리오 5건 상세 (관찰만)

| # | 시나리오 | 실행 | 성공 기준 |
|---|--------|------|---------|
| E2E-01 | `/pdca pm <feature>` | manual spawn PM agent | `docs/00-pm/<feature>.prd.md` 생성 + 8섹션 포함 |
| E2E-02 | `/bkit:enterprise` slash | CC session | Enterprise 가이드 텍스트 응답 수신, 에러 없음 |
| E2E-03 | Task tool `subagent_type: "cto-lead"` | SDK 호출 | 응답 JSON `isError: false` |
| E2E-04 | MCP `bkit_pdca_status` | MCP client | `{data: {phase, currentFeature, ...}}` envelope 일치 |
| E2E-05 | PreToolUse hook 주입 | `echo '<minimal_input>' \| node scripts/pre-write.js` | stdout `permissionDecision` 필드 포함 또는 빈 출력 |

### 11.6 Zero Script QA 확장 (ENH-257)

Plan §13.2 기준 Zero Script QA 3건:
1. **ENH-239 SessionStart dedup lock** — `docker logs | grep "session-ctx-fp"` 패턴 확인
2. **ENH-203 PreCompact block** — `/compact` 발화 후 decision block/pass 카운트
3. **ENH-257 라이프사이클 실측** — 100+ 샘플 수집 후 block rate < 5% 자동 판정

실행 환경: `skills/zero-script-qa/SKILL.md` (`context: fork` 유지), Docker container.

---

## 12. Sprint별 수용 기준 (구현 체크리스트)

### 12.1 Sprint 0 (3일) — 기반

**Scope**: Contract Baseline 수집 + ESLint 3 rules + madge + BKIT_VERSION 중앙화 + Port 6 정의

- [ ] `test/contract/baseline/v2.1.9/` 생성 (skills 39 + agents 36 + mcp-tools 16 + hooks 24 blocks JSON)
- [ ] `test/contract/scripts/contract-baseline-collect.js` 작성 + 1회 실행
- [ ] `test/contract/fixtures/minimal-valid-inputs.js` 작성
- [ ] `.eslintrc.json` 도입, lint 에러 0
- [ ] `.prettierrc` 도입
- [ ] `scripts/eslint-rules/no-ui-logic-outside-presentation.js` 신규
- [ ] `madge --circular .` = 0 확인
- [ ] `lib/core/version.js` 신규 (BKIT_VERSION = '2.1.10')
- [ ] `lib/domain/ports/*.port.js` 6개 JSDoc typedef 작성
- [ ] `lib/domain/rules/docs-code-invariants.js` EXPECTED_COUNTS 상수

**Owner**: enterprise-expert + qa-strategist + code-analyzer
**Gate**: `node test/contract/scripts/contract-test-run.js --level L1` 통과 (baseline 존재 확인)

### 12.2 Sprint 1 (5일) — Critical Fix + Domain Guards + status.js 분할

- [ ] **C1 fix**: audit-logger `getSessionStats` → `date` 파라미터 (L1 TC 추가)
- [ ] **C2 fix**: `normalizeEntry` → `sanitizeDetails` 도입 + L1 TC 100% 통과
- [ ] `lib/pdca/status-core.js` / `-migration.js` / `-cleanup.js` 분할
- [ ] `lib/pdca/status.js` facade 20 LOC로 축소, 기존 호출자 0건 수정
- [ ] `lib/domain/guards/enh-262-hooks-combo.js` 구현 + L1 TC
- [ ] `lib/domain/guards/enh-263-claude-write.js` 구현 + L1 TC
- [ ] `lib/domain/guards/enh-264-token-threshold.js` 구현 + L1 TC
- [ ] `lib/domain/guards/enh-254-fork-precondition.js` 구현 + L1 TC
- [ ] `lib/domain/guards/dangerous-patterns.js` (from config-change-handler:29-35 이동)
- [ ] `lib/cc-regression/registry.js` (21+ Guards 등록)
- [ ] `lib/cc-regression/defense-coordinator.js`
- [ ] `lib/cc-regression/attribution-formatter.js`
- [ ] `lib/cc-regression/index.js` (Facade)
- [ ] `scripts/pre-write.js` 286 → ~120 LOC 파이프라인화
- [ ] `scripts/config-change-handler.js` DANGEROUS_PATTERNS 제거 → domain guard 경유
- [ ] ESLint 0 에러

**Owner**: security-architect + code-analyzer + qa-strategist
**Gate**: L1+L2 Contract Test PASS, Critical bug 0, pre-write.js ≤ 120 LOC, status.js 3 파일

### 12.3 Sprint 2 (4일) — 관측성 (OTEL dual sink + audit 개선)

- [ ] `lib/infra/telemetry.js` 구현 (createFileSink + createOtelSink + createDualSink)
- [ ] audit-logger ↔ OTEL payload 중복 분석 (1h) → P2 유지/강등 판정
- [ ] `lib/audit/audit-logger.js` OTEL bridge 통합 (writeAuditLog 내부)
- [ ] `lib/cc-regression/token-accountant.js` 구현 (redact + NDJSON append + rotate)
- [ ] `lib/infra/fs-state-store.js` 구현
- [ ] `lib/infra/cc-bridge.js` 구현
- [ ] `lib/pdca/statusline.js` ENH-264 overhead 표시 조건부 (Addendum 자유 변경)
- [ ] token-ledger L1 TC 100% 통과 (prompt 본문 0건)

**Owner**: bkend-expert + security-architect
**Gate**: audit-logger LOC -30% (C1/C2 + sanitizer 포함 delta), OTEL on/off 토글 L2 통과

### 12.4 Sprint 3 (4일) — Guard Registry + lifecycle.js

- [ ] `lib/cc-regression/lifecycle.js` 구현 (reconcile + detectCCVersion)
- [ ] `lib/cc-regression/guards/mon-cc-02.js` (#47855) + `removeWhen('2.1.118')`
- [ ] `lib/cc-regression/guards/mon-cc-06-native.js` (v2.1.113 16건 그룹화)
- [ ] Registry Guard ≥ 19 등록 확인
- [ ] `.github/workflows/cc-regression-reconcile.yml` 신규 (daily cron)
- [ ] `scripts/context-compaction.js` ENH-257 훅 추가 (block 발화 카운터)
- [ ] `scripts/cc-regression-reconcile.js` 신규 (CI 진입점)
- [ ] `lib/infra/gh-cli.js` (issueView + withBackoff)

**Owner**: infra-architect + cc-version-researcher
**Gate**: Registry 21+ Guards, lifecycle reconcile 1회 성공, ENH-257 실측 시작 (2주 카운터 가동)

### 12.5 Sprint 4 (3일) — Docs=Code 교차 검증

- [ ] `lib/infra/docs-code-scanner.js` 구현
- [ ] `scripts/docs-code-check.js` 신규
- [ ] `.github/workflows/docs-code-check.yml` 신규
- [ ] README/MEMORY/plugin.json hooks "21 → 24" 교정
- [ ] 불일치 0건 확인 (discrepancies.length === 0)

**Owner**: design-validator + code-analyzer
**Gate**: docs-code-check CI PASS, 불일치 0

### 12.6 Sprint 5 (3일) — 환경 precondition + 릴리스

- [ ] `skills/zero-script-qa/SKILL.md` ENH-254 precondition 경고 통합
- [ ] `scripts/cc-tool-audit.js` (ENH-256) 실행 + 결과 기록
- [ ] 3 플랫폼 크로스 L5 수동 실행
- [ ] CHANGELOG.md v2.1.10 섹션 작성
- [ ] `docs/04-report/features/bkit-v2110-integrated-enhancement.report.md` 생성
- [ ] gap-detector Match Rate ≥ 95%
- [ ] `plugin.json` version "2.1.10"
- [ ] MEMORY.md v2.1.10 히스토리 항목 추가
- [ ] Release Gate 체크리스트(§12 Addendum §11.2) 전수 통과

**Owner**: cto-lead + gap-detector + report-generator
**Gate**: Contract Test 619 TC PASS, v2.1.10 git tag, 릴리스 노트 Contract 섹션

---

## 13. 마이그레이션/데이터 호환성

### 13.1 .bkit/state/*.json 포맷 동결

v2.1.9 → v2.1.10 schema change **없음**. 기존 `.bkit/state/pdca-status.json` v3 schema 그대로 유지.

### 13.2 v1 → v2 → v3 status.json migration 격리

**Plan §11.2 기준**: `status-migration.js`는 **one-shot cold path**.
- v2.1.10 신규 세션: migration 미진입 (v3 신규 생성)
- v2.1.9 기존 세션: 첫 `getPdcaStatus()` 호출 시 1회 실행, `schemaVersion` 필드 v3로 승격 후 즉시 write-back

**Rollback 테스트 (R4 대응)**:
- Fixture: v1 schema JSON → status-migration 실행 → v3 schema 결과 L1 TC 검증
- Fixture: v2 schema JSON → 동일
- Fixture: v3 schema JSON → no-op 확인

### 13.3 token-ledger NDJSON 초기화

**경로**: `.bkit/runtime/token-ledger.json` (신규, v2.1.10 첫 세션에서 생성)
**Format**: NDJSON (line-delimited JSON)
**첫 write**: `token-accountant.recordTurn` 첫 호출 시 `fs.appendFile` (부모 디렉토리 없으면 생성)
**Retention**: 30일 rolling, rotate 시 `.bkit/runtime/archive/token-ledger-YYYY-MM.jsonl`

**호환성**: 신규 파일이므로 충돌 없음. 삭제되어도 무방 (audit-log와 독립).

---

## 14. 리스크 구체 완화 플랜 (R1~R10 + R1~R5 병합)

| # | 리스크 | 심각도 | 대응 코드/스킴 |
|---|------|------|-------------|
| **R1 (Plan)** | 리팩토링 중 UX byte-diff | → Addendum: Contract Test L1~L4 가 CI Gate. UX 포맷 자유 |
| **R2** | Guard 오탐 | `BKIT_CC_REGRESSION_BYPASS=1` env var + audit-only mode (§3.2.2) |
| **R3** | CC v2.1.118+ 추가 회귀 | `cc-bridge.js` version-pinned 분기 준비, `cc-version-researcher` 주간 |
| **R4** | status.js migration 깨짐 | §13.2 v1/v2/v3 fixture L1 TC, `status-migration.js` one-shot 격리 |
| **R5** | JSDoc typedef 타입 검증 미약 | `tsc --allowJs --checkJs --noEmit` CI 단계 (TS 도입 아님) |
| **R6** | Token ledger prompt 본문 유출 | `sanitizeMetrics` + `REDACT_KEYS` 7개 + L1 TC 100% 필수 통과 |
| **R7** | MON-CC Guard 부채 누적 | 분기별 `expectedFix` 경과 Guard 리뷰 PR 자동 생성 (lifecycle.reconcile) |
| **R8 (Plan)** | Presentation LOCKED 우회 | → Addendum: LOCKED 마커 제거. ESLint `no-restricted-imports`로 대체 |
| **R9** | ENH-257 실측 중 v2.1.118 hotfix | 실측 중단 → 새 CC 버전 기준 재실측 2주 (`mon-cc-02.js` 카운터 reset) |
| **R10** | Critical bug 프로덕션 영향 | v2.1.10 릴리스 전 감사 로그 3개월 회귀 검토 + 사용자 공지 |
| **R1 (Add)** | Skill 디렉토리 이동 충돌 | L4 Contract Test가 탐지, skills/ plugin root 직하 고정 |
| **R2 (Add)** | Agent tools 배열 누락 | L1 tools superset 검증 |
| **R3 (Add)** | MCP required[] 오염 | L1 required[] 검증, 신규 파라미터는 optional 기본값 강제 |
| **R4 (Add)** | Hook handler 경로 이동 비동기 | hooks.json `command` + scripts 이동은 **단일 atomic PR** (PR 체크리스트) |
| **R5 (Add)** | `context: fork` 확대 중 race | READONLY 판정 기준 문서화, write 수반 skill의 fork는 v2.2.0+ (file-lock 도입 후) |

---

## 15. 구현 순서 DAG (의존성 그래프)

```
Sprint 0 기반 (병렬 가능)
  ├── ESLint/Prettier/madge 도입 (독립)
  ├── BKIT_VERSION 중앙화 (독립)
  ├── Port 6개 JSDoc typedef (독립)
  └── Contract baseline 수집 (독립)
                │
                ▼
Sprint 1 Critical (순차 의존)
  ├── C1/C2 audit-logger fix (독립)
  ├── status.js 3 분할 → status-core.js 신규 ─┐
  │                                          │
  ├── 4 Guards (domain/guards/)              │
  │                   │                       │
  │                   ▼                       │
  ├── cc-regression/registry.js ──────────────┤
  ├── cc-regression/defense-coordinator.js ─┐ │
  │                                          │ │
  │   (depends: domain/guards + registry)    │ │
  │                                          ▼ ▼
  └── pre-write.js 파이프라인화 (depends: cc-regression + domain/guards/dangerous-patterns)
                │
                ▼
Sprint 2 관측성 (Sprint 1 완료 후)
  ├── infra/telemetry.js (독립)
  ├── infra/fs-state-store.js (독립)
  ├── infra/cc-bridge.js (독립)
  ├── token-accountant.js (depends: token-meter.port + infra/fs-state-store)
  ├── audit-logger OTEL bridge (depends: infra/telemetry)
  └── statusline ENH-264 (depends: token-accountant)
                │
                ▼
Sprint 3 Guard Registry + lifecycle (Sprint 2 부분 필요, Sprint 1 필수)
  ├── lifecycle.js (depends: registry + infra/gh-cli + detectCCVersion)
  ├── guards/mon-cc-02.js (독립)
  ├── guards/mon-cc-06-native.js (독립)
  ├── context-compaction.js 훅 추가 (depends: mon-cc-02)
  └── CI workflow cc-regression-reconcile.yml
                │
                ▼
Sprint 4 Docs=Code (병렬 가능, Sprint 3과 독립)
  ├── infra/docs-code-scanner.js (독립)
  ├── scripts/docs-code-check.js (depends: scanner)
  └── CI workflow docs-code-check.yml
                │
                ▼
Sprint 5 릴리스 (모든 Sprint 완료 후)
  ├── cc-tool-audit.js (ENH-256 전수 grep)
  ├── zero-script-qa ENH-254 precondition
  ├── CHANGELOG + MEMORY.md
  ├── v2.1.10 git tag
  └── Release Gate 체크리스트
```

**병렬 가능 페어**:
- S0의 모든 항목 (완전 독립)
- S1의 "C1/C2 fix" ↔ "status.js 분할" ↔ "4 Guards" (각각 독립)
- S2 ↔ S4 (Infra telemetry와 Docs=Code 독립)
- S3 ↔ S4 (Registry와 docs-code-scanner 독립)

**순차 필수**:
- Guards → registry → defense-coordinator → pre-write.js 리팩토링
- token-meter.port → token-accountant → statusline ENH-264

---

## 16. 부록

### 부록 A. Plan/Addendum ↔ Design 섹션 매핑

| Plan/Addendum 섹션 | Design 섹션 |
|-----------------|------------|
| Plan §0 Executive Summary | §0 |
| Plan §1 팀 15명 | §12 (Sprint별 Owner) |
| Plan §2 코드베이스 분석 | §4 (기존 파일 리팩토링) |
| Plan §3 Plan Plus 브레인스토밍 | §0.3 Design 승인 = Sprint 0 착수 |
| Plan §4 Clean Architecture | §2 4-Layer 상세, §3 신규 모듈 |
| Plan §5 ENH 9건 | §5 ENH 모듈 설계 |
| Plan §6 MON-CC lifecycle | §6 |
| Plan §7 Docs=Code | §8 |
| Plan §8 Defense-in-Depth | §1.2 Pillar + §5.7~5.8 |
| Plan §9 UX Golden File | **Addendum이 대체** → §7 Contract Test |
| Plan §10 코딩 컨벤션 | §10 |
| Plan §11 리팩토링 | §4 |
| Plan §12 Sprint 0~5 | §12 |
| Plan §13 L1~L5 테스트 | §11 |
| Plan §14 리스크 10건 | §14 |
| Plan §15 수용 기준 | §12.6 Sprint 5 + §14 Addendum §11.2 |
| Addendum §0 UX 재정립 | §0.2 |
| Addendum §1 팀 재편성 | §12 Owner |
| Addendum §2 5-Layer Contract | §1.3 엄격 제약 |
| Addendum §3 Frozen Catalog | §11 TC 수 기반 |
| Addendum §4 변경 허용/금지 매트릭스 | §1.3 + §11.1 L1 |
| Addendum §5 Deprecation Ladder | §12.6 L4 Deprecation Detection |
| Addendum §6 4세그먼트 Migration | §0 Context Anchor WHO |
| Addendum §7 기존 Plan 대체 | 전체 |
| Addendum §8 Contract Test L1~L5 | §11 |
| Addendum §9 Contract Test 구현 | §7 |
| Addendum §10 Contract 위반 대응 | §12.6 + R1~R5 Addendum |
| Addendum §11 릴리스 노트 + Gate | §12.6 |
| Addendum §12 리스크 R1~R5 | §14 |
| Addendum §13 통합 | 본 Design 전체 |
| Addendum Appendix A Contract 파일 | §2.1 디렉토리 트리 + 부록 B |

### 부록 B. 신규 생성 파일 전수 (디렉토리 트리 완전체)

```
[NEW] lib/domain/ports/cc-payload.port.js
[NEW] lib/domain/ports/state-store.port.js
[NEW] lib/domain/ports/regression-registry.port.js
[NEW] lib/domain/ports/audit-sink.port.js
[NEW] lib/domain/ports/token-meter.port.js
[NEW] lib/domain/ports/docs-code-index.port.js
[NEW] lib/domain/guards/enh-262-hooks-combo.js
[NEW] lib/domain/guards/enh-263-claude-write.js
[NEW] lib/domain/guards/enh-264-token-threshold.js
[NEW] lib/domain/guards/enh-254-fork-precondition.js
[NEW] lib/domain/guards/dangerous-patterns.js
[NEW] lib/domain/rules/docs-code-invariants.js
[NEW] lib/domain/util/semver.js
[NEW] lib/cc-regression/registry.js
[NEW] lib/cc-regression/defense-coordinator.js
[NEW] lib/cc-regression/token-accountant.js
[NEW] lib/cc-regression/lifecycle.js
[NEW] lib/cc-regression/attribution-formatter.js
[NEW] lib/cc-regression/index.js
[NEW] lib/cc-regression/guards/mon-cc-02.js
[NEW] lib/cc-regression/guards/mon-cc-06-native.js
[NEW] lib/cc-regression/guards/enh-247-precompact.js
[NEW] lib/infra/cc-bridge.js
[NEW] lib/infra/fs-state-store.js
[NEW] lib/infra/telemetry.js
[NEW] lib/infra/gh-cli.js
[NEW] lib/infra/docs-code-scanner.js
[NEW] lib/pdca/status-core.js          (split from status.js)
[NEW] lib/pdca/status-migration.js     (split)
[NEW] lib/pdca/status-cleanup.js       (split)
[NEW] lib/pdca/statusline.js           (또는 기존 파일 확장)
[NEW] lib/core/version.js              (BKIT_VERSION 중앙화)

[NEW] test/contract/baseline/v2.1.9/skills/*.json          (39)
[NEW] test/contract/baseline/v2.1.9/agents/*.json          (36)
[NEW] test/contract/baseline/v2.1.9/mcp-tools/bkit-pdca/*.json        (10)
[NEW] test/contract/baseline/v2.1.9/mcp-tools/bkit-analysis/*.json    (6)
[NEW] test/contract/baseline/v2.1.9/mcp-resources.json                (3 URI)
[NEW] test/contract/baseline/v2.1.9/hook-events.json                  (24 blocks)
[NEW] test/contract/baseline/v2.1.9/slash-commands.json
[NEW] test/contract/scripts/contract-baseline-collect.js
[NEW] test/contract/scripts/contract-test-run.js
[NEW] test/contract/scripts/runner/parse-skill.js
[NEW] test/contract/scripts/runner/parse-agent.js
[NEW] test/contract/scripts/runner/parse-mcp.js
[NEW] test/contract/fixtures/minimal-valid-inputs.js
[NEW] test/contract/results/.gitkeep

[NEW] scripts/cc-regression-reconcile.js
[NEW] scripts/cc-tool-audit.js
[NEW] scripts/docs-code-check.js
[NEW] scripts/eslint-rules/no-ui-logic-outside-presentation.js

[NEW] .eslintrc.json
[NEW] .prettierrc
[NEW] .github/workflows/contract-check.yml
[NEW] .github/workflows/docs-code-check.yml
[NEW] .github/workflows/cc-regression-reconcile.yml
[NEW] .github/workflows/lint.yml

[NEW] docs/02-design/features/bkit-v2110-integrated-enhancement.design.md   (본 문서)
[NEW] docs/04-report/features/bkit-v2110-integrated-enhancement.report.md   (Sprint 5 산출)
```

**총 신규 파일 (수치)**:
- Domain: 13개 (6 ports + 5 guards + 1 rules + 1 util)
- cc-regression: 9개 (6 module + 3 guards 최소, 실제 19+ guards로 확장)
- Infra: 5개
- pdca: 3 split + 1 statusline + 1 version = 5
- test/contract: 60+ (baseline JSON 포함)
- scripts: 4개
- CI/설정: 6개
- docs: 2개

### 부록 C. 수정 대상 기존 파일 전수 + 변경 유형

| 파일 | 변경 유형 | 주요 변경 |
|------|--------|---------|
| `scripts/pre-write.js` | **재작성** | 286 → ~120 LOC 파이프라인화 |
| `scripts/config-change-handler.js` | **리팩토링** | DANGEROUS_PATTERNS → domain guard 경유 |
| `scripts/context-compaction.js` | **추가** | ENH-257 block 카운터 훅 |
| `lib/pdca/status.js` | **분할 + facade 축소** | 872 → 20 LOC facade (3 파일로 분할) |
| `lib/audit/audit-logger.js` | **Fix + 추가** | C1/C2 fix + sanitizeDetails + OTEL bridge |
| `lib/core/context-budget.js` | **확인** | ENH-240 applyBudget 기존 구현 유지 |
| `hooks/startup/session-context.js` | **교정** | "v2.1.9" 하드코딩 → BKIT_VERSION + ctx 빌더 통일 |
| `skills/zero-script-qa/SKILL.md` | **추가** | ENH-254 precondition 경고 본문 |
| `.claude-plugin/plugin.json` | **버전 승격** | "2.1.9" → "2.1.10", hooks 수치 교정 |
| `README.md` | **교정** | Docs=Code (hooks 21 → 24) |
| `MEMORY.md` | **교정** | 동일 |
| `CHANGELOG.md` | **추가** | v2.1.10 섹션 |

### 부록 D. 공개 API 전수

**Port 6 (JSDoc typedef)**: §2.3 참조 (CCPayload, StateStore, RegressionRegistry, AuditSink, TokenMeter, DocsCodeIndex)

**Guard Contract**: 모든 `lib/domain/guards/*.js` 는 다음 두 함수 export 필수:
```js
/** @returns {{id: string, check: Function, removeWhen: Function}} */
module.exports = { id, check, removeWhen };
```

**OTEL interface** (`lib/infra/telemetry.js`):
```js
module.exports = {
  createFileSink(auditDir):  AuditSinkPort,
  createOtelSink(endpoint):  AuditSinkPort,
  createDualSink(auditDir):  AuditSinkPort,
};
```

**Token Ledger 스키마** (NDJSON):
```
{"ts":ISO8601, "sessionHash":sha256, "agent":string, "model":string,
 "ccVersion":semver, "turnIndex":int, "inputTokens":int, "outputTokens":int,
 "overheadDelta":int, "ccRegressionFlags":[string]}
```

**cc-regression Facade** (`lib/cc-regression/index.js`):
```js
module.exports = { Defense, Registry, Lifecycle, Token, Attribution };
```

### 부록 E. L1~L5 Contract TC 샘플 코드

```js
// test/contract/scripts/runner/parse-skill.js (helper 예시)
const fs = require('fs');
const path = require('path');

module.exports = function parseSkill(name) {
  const file = path.join(process.cwd(), 'skills', name, 'SKILL.md');
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return {
    name: fm.name,
    context: fm.context || null,
    description_len: (fm.description || '').length,
    'allowed-tools': (fm['allowed-tools'] || '').match(/\w+/g) || [],
    'user-invocable': fm['user-invocable'] !== 'false',
  };
};
```

### 부록 F. gap-detector 기준 Plan ↔ Design Match Rate 검증 체크리스트

| Plan 요구사항 | Design 반영 위치 | Match 기준 |
|------------|---------------|---------|
| 9 ENH (P0 5 / P1 1 / P2 1 / P3 2) | §5 ENH 모듈 설계 9개 세부 | 9/9 |
| Critical Bug C1/C2 | §4.3.1, §4.3.2 | 2/2 |
| 7 핵심 파일 리팩토링 | §4 (status.js / pre-write.js / audit-logger / context-compaction / session-context / config-change / zero-script-qa SKILL) | 7/7 |
| Clean Architecture 4-layer | §2 (디렉토리 + 책임 + DIP) | Full |
| Port 6개 | §2.3 | 6/6 |
| Contract Test L1~L5 | §7 + §11 | Full (TC 수 일치) |
| Deprecation Ladder 4단계 | §12.6 L4 + Addendum §5 | Full |
| MON-CC 19+ Guards | §3.2.1 + §6 | 21 등록 |
| Docs=Code | §8 | Full |
| OWASP Top 10 매트릭스 | Plan §8.2 (Design이 재인용, §5.7+§5.8로 실체 구현) | Full |
| 코딩 컨벤션 20 항목 | §10 (ESLint rules로 강제) | Full |
| Sprint 0~5 로드맵 | §12 | 6/6 |
| 리스크 R1~R10 + R1~R5 | §14 (병합) | 15/15 |
| Release Gate 체크리스트 | §12.6 + Addendum §11.2 참조 | Full |

**Estimated Match Rate**: Design → Plan+Addendum 반영률 **≥ 95%** (gap-detector 기준). 미반영 가능 항목: Plan Appendix C 팀 분석 결과 요약(5 문서 참조만, 구현 무관), Addendum §11.1 릴리스 노트 템플릿 전문(Sprint 5 산출물이므로 Design 대상 아님).

---

## 끝.

**본 Design은 2026-04-22 기준 bkit v2.1.10 개발 착수 시 Source of Truth입니다.**

**Design 승인 후 즉시 가능한 Actions**:
1. `/pdca do bkit-v2110-integrated-enhancement --scope sprint-0` — Sprint 0 기반 작업 시작
2. `test/contract/baseline/v2.1.9/` baseline 수집 (contract-baseline-collect.js 1회 실행)
3. ESLint/Prettier 도입 + lint 에러 0 달성
4. `lib/domain/ports/*.port.js` 6개 JSDoc typedef 작성

**Design 수정이 필요한 경우**: 본 문서를 먼저 갱신 후 구현에 반영. 충돌 시 Addendum 우선.

**참조 문서**:
- Plan 원본: `docs/01-plan/features/bkit-v2110-integrated-enhancement.plan.md`
- Plan Addendum: `docs/01-plan/features/bkit-v2110-invocation-contract-addendum.plan.md`
- CC v2.1.117 영향 분석: `docs/04-report/features/cc-v2116-v2117-impact-analysis.report.md`
- CC v2.1.116 영향 분석: `docs/04-report/features/cc-v2114-v2116-impact-analysis.report.md`
