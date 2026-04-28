---
feature: bkit-v2111-integrated-enhancement
sprint: δ (Delta)
theme: Port Extension & Governance
phase: 02-design
type: sprint-detail
status: Draft — Checkpoint 3 승인 (Option C Pragmatic)
architecture: Option C (Pragmatic Balance)
fr-count: 6
cc-v2118-patched: true
cc-v2121-patched: true
created: 2026-04-23
last-patched: 2026-04-28
author: kay kim
parent: docs/02-design/features/bkit-v2111-integrated-enhancement.design.md
---

# Sprint δ — Port Extension & Governance (Design)

> **Summary**: v2.2.x 확장 기반을 다지는 Sprint. MCP 16 tools 에 Port abstraction 을 도입하여 실제 계약(contract)으로 만들고, M1~M10 Quality Gates 를 catalog 로 단일 SoT 확립, 8 언어 Trigger precision/recall 베이스라인 측정, `/pdca token-report` Token Ledger 집계 skill 추가, CC upgrade policy ADR 로 v2.1.115 skip 같은 판단 기준을 공식화한다.
>
> **CC v2.1.121 patch (2026-04-28)**: FR-δ4 token-report 묶음에 **CAND-004 OTEL 3 누적 통합** — I4-121 (`stop_reason` + `gen_ai.response.finish_reasons` + `user_system_prompt`) + F8-119 (PostToolUse `duration_ms`) + I6-119 (OTEL `tool_use_id` + `tool_input_size_bytes`) 단일 PR 묶음으로 처리. 신규 FR 발급 불요 (FR 카운트 6 유지, FR-δ4 범위 확장).
>
> **Goal**: Yuki NPS +7 → +9, v2.2.x 확장 기반, Governance 명료화
> **Parent Design**: [bkit-v2111-integrated-enhancement.design.md](./bkit-v2111-integrated-enhancement.design.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Arch 분석 §6.2 Important 5건 대응. MCP 16 tools 가 Port 없이 사용되어 추상화 부재, M1-M10 catalog 가 분산, Trigger 정확도 무측정, Token Ledger 접근성 낮음, CC upgrade 기준 문서 부재 |
| **WHO** | Primary: Yuki (Enterprise, 감사·Governance 중심). Secondary: Contributor (M1-M10 catalog 로 기여 진입 용이), Maintainer (ADR 로 정책 명료화) |
| **RISK** | (a) δ1 Port 가 MCP SDK spec 과 drift / (b) Trigger baseline fixture 8 언어 품질 격차 / (c) ADR 결정이 향후 CC 변화로 시행착오 |
| **SUCCESS** | 5 FR × Match Rate ≥ 90%, Port drift 0 (I3 invariant), Trigger precision ≥ 0.85 / recall ≥ 0.80, M1-M10 3-way SSoT 0 drift, ADR 2건 작성 |
| **SCOPE** | IN: MCP Port + M1-M10 + Trigger baseline + token-report + CC policy ADR. OUT: Port 당 구현 파일 분리(v2.2), 전체 M1-M10 10개 rule 파일 분리(v2.2), 500+ fixture(v2.1.12) |

---

## 1. Overview

### 1.1 Design Goals

- **MCP Port 실 계약화** — 16 tools 를 `lib/domain/ports/mcp-tool.js` 1개 Port + `lib/infra/mcp-port-registry.js` map 16개 매핑 으로 실제 검증 가능
- **M1-M10 single SoT** — `docs/reference/quality-gates-m1-m10.md` + `lib/domain/rules/quality-gates.js` + `bkit.config.json:quality.thresholds` 3-way 검증
- **Trigger baseline 측정** — 100~150 fixture 로 8 언어 × precision/recall 최초 측정, v2.1.12 튜닝 근거
- **Token Ledger 투명성** — `/pdca token-report` 로 세션별·feature별 비용 즉시 조회 (CC v2.1.121 I4-121 OTEL 3 attributes + F8-119/I6-119 누적 통합)
- **CC upgrade policy 공식화** — v2.1.115 skip 같은 선택 기준을 ADR 0002 로 문서화

### 1.2 Design Principles

1. **Registry Map over File-per-Tool** — 16 파일 X, 1 Port + 16 map entry
2. **Map Rule over File-per-Gate** — M1-M10 10 파일 X, 1 quality-gates.js 에 map
3. **Fixture Quality over Quantity** — 100~150 fixture, KO/EN 먼저 full quality, 나머지 6 언어 pseudo
4. **Report Skill over Separate Tool** — `/pdca token-report` action 으로 통합 (별도 skill 파일 X)
5. **ADR-Driven Governance** — v2.1.11 에서 2 ADR 신설, v2.1.12+ 에서 ADR 기반 의사결정

---

## 2. Architecture

### 2.0 Selected: Option C Pragmatic

| Aspect | Option A (제외) | Option B (과잉) | **Option C (Selected)** |
|--------|-----|-----|-----|
| δ1 MCP Port | README 표만 | Port 16 파일 | 1 Port + registry map |
| δ2 M1-M10 | markdown only | 10 파일 rule | 1 catalog + 1 rule map |
| δ3 Fixture | 20 prompt | 500+ | 100~150 |
| δ4 token-report | 단일 파일 | 폴더 분리 | 1 파일 + skill action |
| δ5 ADR | markdown only | auto policy script | ADR only (정책 script 는 v2.1.12) |
| δ6 Release Automation (CC v2.1.118 F9) | manual only | plugin tag + gh + sign | **claude plugin tag + scripts 얇은 래퍼** (ENH-279) |

### 2.1 Component Diagram

```
┌────────────────────── Domain (NEW) ─────────────────────────┐
│  lib/domain/ports/mcp-tool.js       (δ1 Port interface)     │
│  lib/domain/rules/quality-gates.js  (δ2 M1-M10 map)         │
└──────────────────────────┬───────────────────────────────────┘
                           │ (pure, no side-effect)
                           ▼
┌────────────────── Infrastructure ───────────────────────────┐
│  lib/infra/mcp-port-registry.js     (δ1 — 16 tool mapping)  │
│  lib/infra/docs-code-scanner.js     (+ I3/I4 invariant)     │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌────────────────── Application ──────────────────────────────┐
│  lib/pdca/token-report.js           (δ4 Token Ledger 집계) │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌────────────────── Presentation ─────────────────────────────┐
│  skills/pdca/SKILL.md               (+ token-report action)  │
└─────────────────────────────────────────────────────────────┘

┌────────────────── Docs & Tests ─────────────────────────────┐
│  docs/reference/quality-gates-m1-m10.md    (δ2 catalog)    │
│  docs/adr/0002-cc-upgrade-policy.md        (δ5 ADR)         │
│  tests/i18n/trigger-accuracy.test.js       (δ3)             │
│  tests/i18n/fixtures/                       (δ3 — 100~150)  │
│    ├── prompts-ko.json                                     │
│    ├── prompts-en.json                                     │
│    ├── ... (8 files)                                       │
│  tests/contract/mcp-port.test.js           (δ1 — 20 TC)    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 MCP Port Contract

`lib/domain/ports/mcp-tool.js` 는 **pure interface definition** (no implementation):

```javascript
/**
 * MCP Tool Port — pure interface for any MCP tool (bkit-analysis, bkit-pdca, future).
 * @version 2.1.11
 * @since 2.1.11
 *
 * MCP Spec: 2024-11-05
 * Each adapter MUST implement:
 *   - initialize(protocolVersion): Promise<InitializeResult>
 *   - listTools(): Promise<Tool[]>
 *   - callTool(name, args): Promise<ToolResult>
 *
 * Tool shape (domain-level):
 *   {
 *     name: string,              // e.g., "bkit_pdca_status"
 *     description: string,
 *     inputSchema: JSONSchema,
 *     metadata: {
 *       server: "bkit-analysis" | "bkit-pdca",
 *       category: "read" | "write" | "analyze"
 *     }
 *   }
 */

const TOOL_CATEGORIES = Object.freeze(['read', 'write', 'analyze']);
const MCP_PROTOCOL_VERSION = '2024-11-05';

module.exports = {
  TOOL_CATEGORIES,
  MCP_PROTOCOL_VERSION,
  // Interface is documented via JSDoc, validated by contract tests
};
```

### 2.2.1 F1 — Hook × MCP Tool 직접 호출 비교 (CC v2.1.118, ENH-277 P0)

| 호출 경로 | v2.1.10 이전 | v2.1.11 + CC v2.1.118 |
|-----------|--------------|----------------------|
| Skill → MCP Tool | ✓ | ✓ 유지 |
| Slash → MCP Tool | ✓ (via skill) | ✓ 유지 |
| Hook → MCP Tool | ✗ (subprocess only) | **✓ (hooks.json `type: "mcp_tool"` 신규)** |

**bkit Port 관점**:
- `mcp-tool.js` Port 는 **caller-agnostic** 으로 설계 (skill/slash/hook 모두 동일 Port)
- `lib/infra/mcp-port-registry.js` 에 `callPaths: ['skill','slash','hook']` 메타데이터 추가 (ENH-277)
- **v2.1.11**: Port 설계만 F1 수용 / **v2.1.12**: 실 hook 전환 pilot (audit-logger 후보)

### 2.3 MCP Registry (δ1 Infrastructure)

`lib/infra/mcp-port-registry.js`:

```javascript
const { TOOL_CATEGORIES } = require('../domain/ports/mcp-tool');

// ENH-277 (CC v2.1.118 F1): callPaths: ['skill', 'slash', 'hook'] — Port caller-agnostic
// v2.1.12 pilot: audit-logger hook → mcp_tool 직접 호출 전환 후보
const TOOL_REGISTRY = Object.freeze({
  // bkit-pdca server — 10 tools
  'bkit_plan_read':              { server: 'bkit-pdca',    category: 'read' },
  'bkit_design_read':            { server: 'bkit-pdca',    category: 'read' },
  'bkit_analysis_read':          { server: 'bkit-pdca',    category: 'read' },
  'bkit_report_read':            { server: 'bkit-pdca',    category: 'read' },
  'bkit_pdca_status':            { server: 'bkit-pdca',    category: 'read' },
  'bkit_pdca_history':           { server: 'bkit-pdca',    category: 'read' },
  'bkit_feature_list':           { server: 'bkit-pdca',    category: 'read' },
  'bkit_feature_detail':         { server: 'bkit-pdca',    category: 'read' },
  'bkit_metrics_get':            { server: 'bkit-pdca',    category: 'read' },
  'bkit_metrics_history':        { server: 'bkit-pdca',    category: 'read' },
  // bkit-analysis server — 6 tools
  'bkit_gap_analysis':           { server: 'bkit-analysis', category: 'analyze' },
  'bkit_code_quality':           { server: 'bkit-analysis', category: 'analyze' },
  'bkit_regression_rules':       { server: 'bkit-analysis', category: 'analyze' },
  'bkit_audit_search':           { server: 'bkit-analysis', category: 'read' },
  'bkit_checkpoint_list':        { server: 'bkit-analysis', category: 'read' },
  'bkit_checkpoint_detail':      { server: 'bkit-analysis', category: 'read' },
});

const TOTAL_TOOLS = Object.keys(TOOL_REGISTRY).length; // === 16

module.exports = { TOOL_REGISTRY, TOTAL_TOOLS };
```

### 2.4 Quality Gates Map (δ2)

`lib/domain/rules/quality-gates.js`:

```javascript
/**
 * M1~M10 Quality Gates — single SoT.
 * @version 2.1.11
 */

const QUALITY_GATES = Object.freeze({
  M1: { phase: 'plan',     metric: 'executive_summary_4_perspective', threshold: 'present'  },
  M2: { phase: 'design',   metric: 'architecture_options',            threshold: 3          },
  M3: { phase: 'design',   metric: 'context_anchor',                  threshold: 'present'  },
  M4: { phase: 'do',       metric: 'code_plus_test',                  threshold: 'both'     },
  M5: { phase: 'check',    metric: 'match_rate',                      threshold: 0.90       },
  M6: { phase: 'check',    metric: 'critical_issues',                 threshold: 0          },
  M7: { phase: 'act',      metric: 'iterate_count_max',               threshold: 5          },
  M8: { phase: 'qa',       metric: 'l1_l3_pass',                      threshold: 1.00       },
  M9: { phase: 'report',   metric: 'success_criteria_coverage',       threshold: 0.80       },
  M10:{ phase: 'archive',  metric: 'docs_code_drift',                 threshold: 0          },
});

module.exports = { QUALITY_GATES };
```

---

## 3. Data Model

### 3.1 Trigger Fixture Schema (δ3)

`tests/i18n/fixtures/prompts-ko.json`:

```json
{
  "version": "2.1.11",
  "language": "ko",
  "fixtures": [
    {
      "id": "ko-001",
      "prompt": "정적 웹사이트 만들고 싶어",
      "expected": { "skill": "starter", "level": "Starter" }
    },
    {
      "id": "ko-002",
      "prompt": "풀스택 웹앱 개발",
      "expected": { "skill": "dynamic", "level": "Dynamic" }
    },
    // ... 15~20 more fixtures per language
  ]
}
```

**Count**: 8 lang × 12~20 = 100~150 fixtures total

### 3.2 Token Report Output Schema (δ4)

`lib/pdca/token-report.js` 출력:

```json
{
  "feature": "bkit-v2111-integrated-enhancement",
  "generatedAt": "2026-04-23T16:00:00.000Z",
  "summary": {
    "totalTokensIn": 1250000,
    "totalTokensOut": 380000,
    "totalCost": 28.50,
    "sessionCount": 7,
    "turnCount": 245
  },
  "byPhase": {
    "plan": {"tokensIn": 50000, "tokensOut": 15000, "cost": 1.20},
    "design": {"tokensIn": 200000, "tokensOut": 60000, "cost": 4.50},
    "do": {"tokensIn": 800000, "tokensOut": 250000, "cost": 18.50},
    "check": {"tokensIn": 150000, "tokensOut": 40000, "cost": 3.30},
    "act": {"tokensIn": 50000, "tokensOut": 15000, "cost": 1.00}
  },
  "byModel": {
    "opus-4-7": {"tokensIn": 400000, "tokensOut": 120000, "cost": 15.00},
    "sonnet-4-6": {"tokensIn": 850000, "tokensOut": 260000, "cost": 13.50}
  },
  "top5Costliest": [
    {"sessionId": "s01", "phase": "do", "cost": 5.80, "feature": "sprint-beta"},
    // ...
  ]
}
```

---

## 4. API Specification

### 4.1 `/pdca token-report` (δ4)

**Arguments**:
- `token-report` — 현재 active feature
- `token-report {feature}` — 지정 feature
- `token-report --all` — 모든 archive 포함
- `token-report --since 7d` — 최근 7일
- `token-report --format json` — 기본 markdown, json 선택 가능

**Behavior**:
1. `.bkit/runtime/token-ledger.json` NDJSON tail
2. feature/phase/model 별 집계
3. Top 5 costliest session 정렬
4. Markdown 표 또는 JSON 출력

### 4.1.1 OTEL 신규 필드 통합 (CAND-004, CC v2.1.121 patch)

`lib/pdca/token-report.js` 와 `lib/infra/telemetry.js` 가 CC v2.1.121 I4-121 (+ v2.1.119 F8-119/I6-119) OTEL 신규 attributes 3 누적을 단일 PR 로 처리.

**누적 OTEL 변경 (3건)**:

| 출처 | 신규 attribute | 게이트 |
|------|----------------|--------|
| I4-121 (CC v2.1.121) | `stop_reason`, `gen_ai.response.finish_reasons`, `user_system_prompt` | `OTEL_LOG_USER_PROMPTS=1` 환경변수로 `user_system_prompt` 활성화 (CC 측 게이트) |
| F8-119 (CC v2.1.119) | PostToolUse `duration_ms` | hookSpecificOutput 자동 노출 |
| I6-119 (CC v2.1.119) | `tool_use_id`, `tool_input_size_bytes` | tool 호출 자동 노출 |

**bkit 통합 사양**:

```javascript
// lib/infra/telemetry.js:109-120 sanitizeForOtel — 2-게이트 합성
function sanitizeForOtel(attributes, env = process.env) {
  const out = { ...attributes };
  // 게이트 1: bkit OTEL_REDACT (default redact 정책)
  if (env.OTEL_REDACT === '1') {
    delete out['user_system_prompt'];
    delete out['user_prompt'];
  }
  // 게이트 2: CC OTEL_LOG_USER_PROMPTS (CC 측 명시 활성화)
  if (env.OTEL_LOG_USER_PROMPTS !== '1') {
    delete out['user_system_prompt'];
  }
  return out;
}

// lib/pdca/token-report.js — OTEL 신규 필드 매핑 (선택적)
{
  "byStopReason": {                          // I4-121
    "end_turn": 180, "tool_use": 65, "max_tokens": 0
  },
  "byFinishReason": { /* I4-121 gen_ai */ },
  "byTool": {                                // I6-119 + F8-119
    "Bash": {"calls": 89, "avgDurationMs": 1200, "totalInputBytes": 450000},
    "Edit": {"calls": 45, "avgDurationMs": 350, "totalInputBytes": 120000}
  }
}
```

**Privacy 정책**:

- 디폴트: `user_system_prompt` 미저장 (`OTEL_LOG_USER_PROMPTS` 미설정 시 CC 자체 비노출)
- bkit `OTEL_REDACT=1` 설정 시 추가 보호 (양 게이트 모두 통과해야 노출)
- bkit OTEL sink 미활성화 환경(default)에서는 영향 0

**테스트** (L1 unit, `test/infra/telemetry.test.js`):

| # | TC | 검증 |
|---|----|------|
| 1 | `sanitizeForOtel` w/ `OTEL_REDACT=1` | user_system_prompt 제거 확인 |
| 2 | `sanitizeForOtel` w/o `OTEL_LOG_USER_PROMPTS` | user_system_prompt 제거 확인 (CC 게이트) |
| 3 | `sanitizeForOtel` 양 게이트 PASS | user_system_prompt 보존 |
| 4 | `token-report` byStopReason 집계 | I4-121 누적 정확 |
| 5 | `token-report` byTool duration_ms 평균 | F8-119 + I6-119 누적 정확 |

**구현 비용**: +10~15 turns (FR-δ4 기존 추정 1 day = 8 turns에 누적, 총 18~23 turns)

### 4.2 MCP Port Interface (δ1)

각 MCP server (`mcp/servers/*/index.js`) 는 Port 계약 준수:

```javascript
// MUST implement:
async initialize(request) { /* returns InitializeResult */ }
async listTools() { /* returns Tool[] */ }
async callTool(name, args) { /* returns ToolResult */ }
```

L3 runtime runner (v2.1.10 에 존재, 42 TC) 확장: 16 tool 각각에 대해 contract 검증.

> **CC v2.1.118 F1 주의 (ENH-277 P0)**: Hook 이 MCP tool 을 직접 호출 가능해졌으나,
> v2.1.11 bkit 은 기존 subprocess 경로 유지. Port interface 설계는 이 미래 경로
> (hooks.json `type: "mcp_tool"`) 까지 수용하도록 **caller-agnostic** 정의.
> 실 hook 전환은 v2.1.12 pilot (audit-logger 후보).

---

## 5. UI/UX Design

### 5.1 `/pdca token-report` Output

```
💰 Token Report — bkit-v2111-integrated-enhancement
═══════════════════════════════════════════════════════════════════════
Generated: 2026-04-23 16:00 UTC
Sessions: 7 · Turns: 245

Total:
  Tokens In:  1,250,000
  Tokens Out:    380,000
  Cost:          $28.50

By Phase:
  Plan   │  50k in /  15k out │ $1.20  │ ████
  Design │ 200k in /  60k out │ $4.50  │ ███████████████
  Do     │ 800k in / 250k out │ $18.50 │ ████████████████████████████████████████████████████████████
  Check  │ 150k in /  40k out │ $3.30  │ ███████████
  Act    │  50k in /  15k out │ $1.00  │ ███

By Model:
  opus-4-7:   $15.00 (53%)
  sonnet-4-6: $13.50 (47%)

Top 5 Costliest Sessions:
  1. s01 — do/sprint-beta       — $5.80
  2. s02 — design/sprint-gamma  — $4.20
  3. s03 — do/sprint-alpha      — $3.90
  4. s04 — do/sprint-delta      — $3.50
  5. s05 — check                — $2.80
```

### 5.2 M1-M10 Catalog Page (δ2 — docs/reference/quality-gates-m1-m10.md)

```markdown
# Quality Gates M1~M10 Catalog

| Gate | Phase | Metric | Threshold | Source |
|------|-------|--------|-----------|--------|
| M1 | Plan | Executive Summary 4-perspective | present | plan.template.md |
| M2 | Design | Architecture Options | ≥ 3 | design.template.md §2 |
| M3 | Design | Context Anchor | present | design.template.md §Context Anchor |
| M4 | Do | Code + Test per module | both | do.template.md |
| M5 | Check | Match Rate | ≥ 90% | bkit.config.json:pdca.matchRateThreshold |
| M6 | Check | Critical Issues | 0 | bkit.config.json:quality.thresholds.criticalIssueCount |
| M7 | Act | Iterate Count Max | ≤ 5 | bkit.config.json:pdca.maxIterations |
| M8 | QA | L1-L3 PASS Rate | 100% | qa-phase skill |
| M9 | Report | Success Criteria Coverage | ≥ 80% | report.template.md |
| M10| Archive | Docs=Code Drift | 0 | docs-code-scanner |
```

---

## 6. Error Handling

| Code | Cause | Handling |
|------|-------|----------|
| E-δ1-01 | Tool name 이 registry 에 없음 | InvalidToolName error |
| E-δ1-02 | MCP server `initialize` 실패 | MCP protocol error surfaced |
| E-δ2-01 | M1-M10 3-way SSoT drift | CI invariant I4 exit 1 |
| E-δ3-01 | Fixture 파일 로드 실패 | 해당 언어 skip + warning |
| E-δ4-01 | token-ledger.json 누락 | empty report + warning |
| E-δ4-02 | --since 형식 오류 | fallback all, warning |
| E-δ5-01 | ADR 0002 문법 오류 | markdown lint 경고 |

---

## 7. Security Considerations

- [x] Token Ledger tail: PII redaction 기존 유지 (7-key)
- [x] MCP Port Registry: read-only const, runtime 변조 불가 (Object.freeze)
- [x] Fixture JSON: schema validation, path traversal 불가
- [x] M1-M10 catalog: 3-way SSoT 검증 (다른 곳에서 매직넘버 사용 차단)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Count |
|------|--------|:---:|
| L1 Unit | token-report 집계 / registry lookup / quality-gates 접근 | 10 |
| L2 Integration | `/pdca token-report` 4 cases + MCP L3 runtime 16 tools | 10 |
| L3 MCP Runtime | 16 tool × (initialize, list, call) | 20 |
| i18n | Trigger fixture × 8 언어 precision/recall | 30 |
| Contract | +4 assertions (Port + Registry) | 4 |

### 8.2 L1 Unit Tests (10)

| # | Function | Check |
|:---:|---|---|
| 1 | `token-report.aggregate(entries)` | 집계 정확 |
| 2 | `token-report.byPhase(entries)` | phase 분리 |
| 3 | `token-report.byModel(entries)` | model 분리 |
| 4 | `token-report.top5(entries)` | 상위 5 정렬 |
| 5 | `TOOL_REGISTRY` frozen | mutation 차단 |
| 6 | `TOTAL_TOOLS === 16` | static assertion |
| 7 | `QUALITY_GATES` frozen | mutation 차단 |
| 8 | `QUALITY_GATES.M5.threshold === 0.90` | SoT 검증 |
| 9 | `MCP_PROTOCOL_VERSION === '2024-11-05'` | spec lock |
| 10 | `TOOL_CATEGORIES.length === 3` | category 닫힘 |

### 8.3 L3 MCP Runtime Tests (16 → +20)

기존 L3 42 TC 에 추가:
- 16 tool × initialize (새 계약 검증) = 16 TC
- 16 tool × metadata.server 등록 일치 (registry vs actual) = 취합 4 TC

**총 L3**: 42 + 20 = **62 TC**

### 8.4 i18n Trigger Tests (30)

| # | Language | Fixture Count | Precision Target | Recall Target |
|:---:|---|:---:|:---:|:---:|
| 1 | ko | 20 | ≥ 0.85 | ≥ 0.80 |
| 2 | en | 20 | ≥ 0.85 | ≥ 0.80 |
| 3 | ja | 15 | ≥ 0.85 | ≥ 0.80 |
| 4 | zh | 15 | ≥ 0.85 | ≥ 0.80 |
| 5 | es | 12 | ≥ 0.80 | ≥ 0.75 |
| 6 | fr | 12 | ≥ 0.80 | ≥ 0.75 |
| 7 | de | 12 | ≥ 0.80 | ≥ 0.75 |
| 8 | it | 12 | ≥ 0.80 | ≥ 0.75 |
| **Total** | — | **118** | — | — |

30 TC: precision×8 + recall×8 + aggregate×8 + edge case×6.

### 8.5 Contract Tests (+4)

- C-δ-01: `TOOL_REGISTRY` length === 16
- C-δ-02: `TOOL_REGISTRY` 의 모든 server ∈ {'bkit-pdca', 'bkit-analysis'}
- C-δ-03: `TOOL_REGISTRY` 의 모든 category ∈ TOOL_CATEGORIES
- C-δ-04: `QUALITY_GATES` key 10개 (M1~M10)

---

## 9. Clean Architecture Layer 배치

| Component | Layer | Path |
|-----------|-------|------|
| `mcp-tool.js` Port | **Domain (NEW)** | `lib/domain/ports/mcp-tool.js` |
| `quality-gates.js` rule | **Domain (NEW)** | `lib/domain/rules/quality-gates.js` |
| `mcp-port-registry.js` | Infrastructure | `lib/infra/mcp-port-registry.js` |
| `token-report.js` | Application | `lib/pdca/token-report.js` |
| `skills/pdca/SKILL.md` +action | Presentation | `skills/pdca/SKILL.md` |
| Fixture 8 JSON | Test assets | `tests/i18n/fixtures/` |
| ADR 2건 | Docs | `docs/adr/` |
| M1-M10 catalog | Docs | `docs/reference/quality-gates-m1-m10.md` |

### 9.1 Domain Purity 검증

`lib/domain/ports/mcp-tool.js` + `lib/domain/rules/quality-gates.js`:
- Import: 없음 (pure constants/JSDoc)
- `check-domain-purity.js` 통과: 0 forbidden import

---

## 10. ADR 0002 Synopsis — CC Upgrade Policy

> 상세 ADR 은 Do phase 에서 `docs/adr/0002-cc-upgrade-policy.md` 로 작성.

### 10.1 Status
- v2.1.11: **Accepted** (처음 도입)

### 10.2 Context
- CC CLI 는 주간 단위 릴리스 (v2.1.34 ~ v2.1.117, 75 연속 호환)
- 일부 버전 (v2.1.115) 은 bkit 에서 건너뛰었으나 기준이 MEMORY 에만 존재
- 외부 contributor/사용자가 "왜 v2.1.115 가 빠졌나" 확인 불가

### 10.3 Decision
- **Skip 기준** 공식화:
  1. CC release 에 environmental breakage (macOS 11 / non-AVX CPU / Windows parenthesized PATH)
  2. bkit 영향 critical hook/skill/agent API 제거 또는 incompatibility
  3. 24시간 내 MON-CC-02/06 에 HIGH severity issue 2건 이상
- **Skip 절차**:
  1. `docs/03-analysis/cc-v2.1.X-skip-rationale.md` 작성
  2. MEMORY.md 업데이트
  3. GitHub issue 로 skip 공표
  4. **F13 대응 (CC v2.1.118)**: plugin version-constraint skip 가시성 활용 — `bkit.config.json engines.claudeCode: "<2.1.X"` 선언 시 CC 가 사용자에게 경고 (/doctor + /plugin Errors tab)
  5. **F5 대응 (CC v2.1.118)**: enterprise 배포 환경에서 `DISABLE_UPDATES=1` 가이드 — 제어된 upgrade 주기 운영 기업을 위한 README 섹션 추가

### 10.4 Consequences
- (+) 외부 contributor 예측 가능성↑
- (+) skip 기준의 드리프트 방지
- (−) 매 skip 마다 rationale 문서 작성 공수 (소규모)

---

## 11. Implementation Guide

### 11.1 File Structure

```
lib/
├── domain/
│   ├── ports/
│   │   └── mcp-tool.js               [NEW] — δ1 Port
│   └── rules/
│       └── quality-gates.js          [NEW] — δ2 M1-M10 map
├── infra/
│   └── mcp-port-registry.js          [NEW] — δ1 registry
└── pdca/
    └── token-report.js               [NEW] — δ4

skills/
└── pdca/
    └── SKILL.md                      [MODIFY] + token-report action

tests/
├── i18n/
│   ├── trigger-accuracy.test.js      [NEW] — δ3
│   └── fixtures/
│       ├── prompts-ko.json           [NEW]
│       ├── prompts-en.json           [NEW]
│       ├── prompts-ja.json           [NEW]
│       ├── prompts-zh.json           [NEW]
│       ├── prompts-es.json           [NEW]
│       ├── prompts-fr.json           [NEW]
│       ├── prompts-de.json           [NEW]
│       └── prompts-it.json           [NEW]
└── contract/
    └── mcp-port.test.js              [NEW] — δ1 contract

docs/
├── reference/
│   └── quality-gates-m1-m10.md       [NEW] — δ2 catalog
└── adr/
    └── 0002-cc-upgrade-policy.md     [NEW] — δ5

scripts/
├── check-mcp-port-drift.js           [NEW] — I3 invariant
├── check-quality-gates-ssot.js       [NEW] — I4 invariant
└── release-plugin-tag.sh             [NEW] — FR-δ6, `claude plugin tag` wrapper (ENH-279, CC v2.1.118 F9)
```

### 11.2 Implementation Order

1. [ ] **δ1-a**: `lib/domain/ports/mcp-tool.js` + Domain Purity CI 통과 확인
2. [ ] **δ1-b**: `lib/infra/mcp-port-registry.js` 16 tool 매핑
3. [ ] **δ1-c**: `scripts/check-mcp-port-drift.js` CI invariant I3
4. [ ] **δ1-d**: L3 runtime runner 확장 (42 → 62 TC)
5. [ ] **δ1-e**: Contract +4 assertions
6. [ ] **δ2-a**: `lib/domain/rules/quality-gates.js` M1-M10 map
7. [ ] **δ2-b**: `docs/reference/quality-gates-m1-m10.md` catalog
8. [ ] **δ2-c**: `scripts/check-quality-gates-ssot.js` CI invariant I4
9. [ ] **δ3-a**: Fixture 8 JSON 파일 (ko/en 먼저, 나머지 6개 pseudo)
10. [ ] **δ3-b**: `tests/i18n/trigger-accuracy.test.js` (30 TC)
11. [ ] **δ3-c**: baseline 결과 저장: `docs/reference/trigger-accuracy-baseline-v2111.md`
12. [ ] **δ4-a**: `lib/pdca/token-report.js` 집계 로직 + L1 TC 4개
13. [ ] **δ4-b**: `skills/pdca/SKILL.md` token-report action 추가
14. [ ] **δ4-c**: L2 integration 4 cases
14. [ ] **δ4-d (CAND-004, CC v2.1.121 patch)**: `lib/infra/telemetry.js` `sanitizeForOtel` 2-게이트 합성 (`OTEL_REDACT × OTEL_LOG_USER_PROMPTS`) + I4-121 신규 attribute 3 매핑
15. [ ] **δ4-e (CAND-004)**: `lib/pdca/token-report.js` byStopReason / byFinishReason / byTool 집계 로직 추가 (F8-119 + I6-119 + I4-121 누적)
16. [ ] **δ4-f (CAND-004)**: `test/infra/telemetry.test.js` L1 TC 5개 (2-게이트 합성 3 + 누적 매핑 2)
15. [ ] **δ5-a**: `docs/adr/0002-cc-upgrade-policy.md` 작성
16. [ ] **δ6-a**: `scripts/release-plugin-tag.sh` — `claude plugin tag v{version}` wrapper (CC v2.1.118 F9, ENH-279)
17. [ ] **δ6-b**: BKIT_VERSION SoT ↔ plugin tag version 일치 검증 (CI gate `check-plugin-tag-version`)
18. [ ] **δ6-c**: Release Notes 템플릿 연동 (`docs/04-report/features/bkit-v2111-*.report.md`)

### 11.3 Session Guide

#### Module Map

| Sub-Module | Scope Key | FR | Est. Turns |
|------------|-----------|:---:|:---:|
| MCP Port | `sprint-delta-port` | δ1 | 10~14 |
| Quality Gates Catalog | `sprint-delta-gates` | δ2 | 6~8 |
| Trigger Baseline | `sprint-delta-trigger` | δ3 | 12~16 (8 fixture files) |
| Token Report | `sprint-delta-report` | δ4 | 8~12 (+ CAND-004 OTEL 누적 +10~15) = 18~27 |
| CC Policy ADR | `sprint-delta-adr` | δ5 | 4~5 |
| Release Automation | `sprint-delta-release` | δ6 | 3~5 |

**총 추정**: 53~75 turns (CC v2.1.118 대응 FR-δ6 +3~5, CC v2.1.121 대응 CAND-004 OTEL 누적 +10~15)

---

## 12. Acceptance Criteria (Sprint δ DoD)

- [ ] 5 FR 전량 Match Rate ≥ 90%
- [ ] `TOOL_REGISTRY` 16 tool 전량, 0 drift (I3 invariant CI)
- [ ] L3 runtime runner 62 TC 전량 PASS
- [ ] M1-M10 3-way SSoT 0 drift (I4 invariant CI)
- [ ] Trigger precision ≥ 0.85 (ko/en/ja/zh), ≥ 0.80 (es/fr/de/it)
- [ ] Trigger recall ≥ 0.80 (ko/en/ja/zh), ≥ 0.75 (es/fr/de/it)
- [ ] `/pdca token-report` L2 integration 4 cases PASS
- [ ] ADR 0002 작성 완료 + MEMORY.md reference
- [ ] Invocation Contract +4 assertions 추가 및 PASS
- [ ] Domain Purity: δ1/δ2 신규 2 파일 0 forbidden import
- [ ] **FR-δ6 (ENH-279, CC v2.1.118 F9)**: `scripts/release-plugin-tag.sh` 실행 시 BKIT_VERSION 불일치 검출 → exit 1, v2.1.11 GA 릴리스 시 실 사용
- [ ] **ENH-277 (CC v2.1.118 F1)**: Port caller-agnostic 설계 Contract +2 assertions PASS
- [ ] **CAND-004 (CC v2.1.121 patch)**: `sanitizeForOtel` 2-게이트 합성 통과 + I4-121 신규 attribute 3 매핑 + F8-119/I6-119 누적 byTool 집계 — L1 TC 5개 PASS
- [ ] **MON-CC-02/06/ENH-214** 방어선 유지 검증 (79 연속 호환 갱신 완료, v2.1.121 까지 검증 완료)
- [ ] **MON-CC-NEW (R-3 safety hooks)**: 2주 카운터 시작 (2026-04-28~2026-05-12), 패턴 확정 시 후속 ENH 검토

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-23 | Initial Sprint δ design — Option C, 1 Port + map, 3-way SSoT, 100~150 fixture, ADR 2건 | kay kim |

---

**Next Step**: Sprint β + γ 완료 후 → `/pdca do bkit-v2111-integrated-enhancement --scope sprint-delta`
