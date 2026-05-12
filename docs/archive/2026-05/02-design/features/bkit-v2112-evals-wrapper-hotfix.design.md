---
template: design
version: 1.3
feature: bkit-v2112-evals-wrapper-hotfix
date: 2026-04-28
author: bkit PDCA (CTO-Led, L4 Full-Auto)
project: bkit
project_version: 2.1.11 → 2.1.12
---

# bkit v2.1.12 Evals Wrapper Hotfix Design Document

> **Summary**: `lib/evals/runner-wrapper.js` argv 불일치 결함 수술적 패치 + false-positive 방어 2단 + L1/L2/L3 테스트 + Docs=Code 8지점 동기화 설계
>
> **Project**: bkit
> **Version**: 2.1.11 → 2.1.12
> **Author**: PDCA Cycle (CTO-Led, L4 Full-Auto)
> **Date**: 2026-04-28
> **Status**: Draft
> **Planning Doc**: [bkit-v2112-evals-wrapper-hotfix.plan.md](../../01-plan/features/bkit-v2112-evals-wrapper-hotfix.plan.md)
> **PRD**: [bkit-v2112-evals-wrapper-hotfix.prd.md](../../00-pm/bkit-v2112-evals-wrapper-hotfix.prd.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 (Schema) | N/A | N/A — hotfix 범위 |
| Phase 2 (Convention) | `.claude/CLAUDE.md` | ✅ |
| Phase 3 (Mockup) | N/A | N/A |
| Phase 4 (API Spec) | N/A | N/A — wrapper 시그니처 무변경 |

---

## Context Anchor

> Plan 문서에서 복사. Design → Do → Analysis → Report로 전파.

| Key | Value |
|-----|-------|
| **WHY** | v2.1.11 Sprint β FR-β2 wrapper의 argv 형식과 runner.js CLI 명세 contract 불일치 → 모든 `/bkit-evals run` 호출이 false-positive PASS 반환. 자동화 신뢰 기반 훼손. |
| **WHO** | Daniel (Dynamic 파운더), Yuki (Enterprise 거버넌스) — v2.1.11 설치 사용자 100% |
| **RISK** | (1) 30 eval 카탈로그 회귀 → L3 Contract Test로 방지. (2) false-positive 방어가 정상 결과 차단 → L1 정상 케이스 명시. (3) Docs=Code 8지점 누락 → docs-code-sync validator 강제. |
| **SUCCESS** | gap-detector Match Rate **100%**, CI 7-suite 0 FAIL, 기존 3,754 TC 회귀 0건, 신규 ~12 TC 전체 PASS, false-positive 0건. |
| **SCOPE** | PDCA 전 사이클 + Docs=Code 8지점 + 4-commit chain. v2.1.12 GA 단일 릴리스. |

---

## 1. Overview

### 1.1 Design Goals

1. **수술적 정확성** — wrapper 단일 파일 ≤30 LOC 변경으로 argv 불일치 + false-positive 모두 해소
2. **회귀 보호** — L3 Contract Test로 wrapper↔runner argv 명세 lock (향후 ENH-277 등 변경 시 fail-fast)
3. **API 시그니처 무변경** — `invokeEvals()`, `isValidSkillName()`, `resultPath()` 모두 동일. 반환 객체에 `reason` 필드만 신설(미실패 시 omit)
4. **Docs=Code 정합성** — BKIT_VERSION 5/5 + One-Liner SSoT 5/5 + 8지점 동기화 100%
5. **forward-compatible** — 외부 호출자 0건이므로 모든 변경이 forward-compatible (Breaking 없음)

### 1.2 Design Principles

- **Single Responsibility** — wrapper의 책임은 (a) 입력 검증 (b) safe spawn (c) 결과 영구화 (d) 구조화된 반환 — 4가지에 한정
- **Fail-Closed Defense** — 결정적 결함 시 항상 `ok:false` 반환. exit 0이라도 의미 검증 후에만 PASS 인정
- **Contract Lock** — runner.js argv 명세를 L3 contract test로 명문화 (positional rejection + flag form acceptance)
- **Domain Layer Purity 유지** — wrapper는 infra layer. domain layer 무변경. forbidden import 0건 baseline 유지
- **Docs=Code 무결성** — 코드 변경 시 동등하게 문서 변경. validator로 자동 강제

---

## 2. Architecture Options

### 2.0 Architecture Comparison

3가지 옵션을 평가하고 사용자 명시 기준("꼼꼼·완벽")에 따라 선정.

| Criteria | Option A: Minimal argv-only | Option B: argv + Defense + Tests | Option C: B + ExecResult Refactor |
|----------|:-:|:-:|:-:|
| **Approach** | 1줄 argv 교정만 | argv + 방어 2단 + L1/L2/L3 + 문서 | B + invokeEvals 반환 객체 spec refactor (`ExecResult` typed) |
| **New Files** | 0 | 3 (test files) | 5 (test + types + adapter) |
| **Modified Files** | 1 (wrapper) | 4 (wrapper + SKILL.md + 5-loc version) | 8+ (B + 30 eval YAML metadata) |
| **Code LOC delta** | +1 / -1 | +30 / -3 | +200 / -50 |
| **Complexity** | Low | Medium | High |
| **Maintainability** | Low (silent failure 재발 가능) | High (방어 + contract lock) | High but YAGNI 위반 |
| **Effort** | 5 min | 2-3 hour | 8+ hour |
| **Risk** | Medium (재발 가능) | Low (다층 방어) | Medium (refactor 회귀) |
| **Hotfix 적합성** | 부적합 (방어 누락) | **적합** | 부적합 (범위 초과) |
| **Recommendation** | 응급 1-line fix | **Selected (default)** | v2.1.13+ carryover |

**Selected**: **Option B — argv + Defense + Tests**

**Rationale**:

- **A**는 silent failure의 근본 원인(false-positive 방어 부재)을 해결하지 못함. 같은 패턴의 결함이 다른 곳에서 재발하면 또 false-positive PASS. 사용자 명시 "꼼꼼·완벽" 기준 위배.
- **C**는 `ExecResult` typed contract refactor + 30 eval YAML metadata 통합 등을 포함하지만, 이는 hotfix 범위를 초과한다. caller가 0건이므로 refactor의 비즈니스 가치도 낮음. v2.1.13+ enhancement로 carryover.
- **B**가 hotfix 정신("최소 변경 + 다층 방어 + 회귀 가드")에 부합. 사용자 요구한 "/pdca team으로 코드베이스 심층 분석" 결과(영향 surface 11 file, caller 0건)와도 일치.

---

### 2.1 Component Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│  Presentation Layer                                                │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ skills/bkit-evals/SKILL.md                                  │  │
│  │   ├─ /bkit-evals run <skill>  (slash invocation)            │  │
│  │   └─ /bkit-evals list                                       │  │
│  └─────────────────────────────────┬───────────────────────────┘  │
└────────────────────────────────────┼───────────────────────────────┘
                                     │ require()
                                     ▼
┌────────────────────────────────────────────────────────────────────┐
│  Infrastructure Layer (lib/evals/)                                │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ runner-wrapper.js (HOTFIX TARGET)                           │  │
│  │   ├─ isValidSkillName(name)        ★ 무변경                  │  │
│  │   ├─ resultPath(skill, ts)         ★ 무변경                  │  │
│  │   └─ invokeEvals(skill, opts)      ★ 핵심 변경               │  │
│  │       ├─ argv: ['--skill', skill]  (FR-01)                  │  │
│  │       ├─ defense: parsed null      (FR-02)                  │  │
│  │       ├─ defense: Usage banner     (FR-03)                  │  │
│  │       └─ ok: 다층 검증 후 결정                                │  │
│  └─────────────────────────────────┬───────────────────────────┘  │
└────────────────────────────────────┼───────────────────────────────┘
                                     │ spawnSync('node', argv)
                                     ▼
┌────────────────────────────────────────────────────────────────────┐
│  Subprocess (evals/runner.js, 무변경)                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ CLI flag parser (line 409-414)                              │  │
│  │   for (i; i<args.length; i++) {                             │  │
│  │     if (args[i].startsWith('--')) flags[args[i].slice(2)]…  │  │
│  │   }                                                         │  │
│  │ flags.skill === 'pdca' → runEval('pdca')                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼ (test layer)
┌────────────────────────────────────────────────────────────────────┐
│  Test Layer (NEW)                                                  │
│  ├─ tests/unit/evals/runner-wrapper.test.js          (L1, 6 TC)   │
│  ├─ tests/integration/evals/runner-wrapper-           (L2, 3 TC)   │
│  │  integration.test.js                                            │
│  └─ tests/contract/evals/wrapper-runner-              (L3, 2 TC)   │
│     argv.contract.test.js                                          │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
사용자: /bkit-evals run pdca
   │
   ▼
SKILL.md body → require('lib/evals/runner-wrapper') → invokeEvals('pdca')
   │
   ├─[정상 경로]─────────────────────────────────────────────────────────┐
   │                                                                    │
   ▼                                                                    │
Step 1: isValidSkillName('pdca')                                       │
   ├─ regex match → continue                                            │
   └─ no match  → return { ok:false, reason:'invalid_skill_name' }     │
   │                                                                    │
   ▼                                                                    │
Step 2: spawnSync('node', [runner, '--skill', 'pdca'])  ★ FR-01        │
   │                                                                    │
   ▼                                                                    │
Step 3: result.error 검사                                               │
   ├─ ETIMEDOUT → return { ok:false, reason:'timeout' }                 │
   └─ no error  → continue                                              │
   │                                                                    │
   ▼                                                                    │
Step 4: parsed = JSON.parse(stdout 마지막 { 블록)                       │
   ├─ JSON 파싱 성공 → parsed = {pass, details, ...}                    │
   └─ JSON 파싱 실패 → parsed = null                                    │
   │                                                                    │
   ▼                                                                    │
Step 5: false-positive 방어 (NEW, FR-02 + FR-03)                       │
   ├─ if (parsed === null && stdout.includes('Usage:'))                 │
   │     → return { ok:false, reason:'argv_format_mismatch', ... }     │
   ├─ if (parsed === null)                                              │
   │     → return { ok:false, reason:'parsed_null', ... }              │
   └─ otherwise → continue                                              │
   │                                                                    │
   ▼                                                                    │
Step 6: 결과 영구화 (.bkit/runtime/evals-{skill}-{ts}.json)             │
   │                                                                    │
   ▼                                                                    │
Step 7: return { ok: parsed?.pass ?? (result.status===0), ... }        │
                                                                        │
                                                                        │
   ▲                                                                    │
   ├─[error 경로 합류 — 모두 결과 파일 영구화 후 반환]──────────────────┘
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `lib/evals/runner-wrapper.js` | `child_process.spawnSync` | safe argv-array spawn |
| `lib/evals/runner-wrapper.js` | `fs/path` (Node built-in) | result file 영구화 |
| `lib/evals/runner-wrapper.js` | `evals/runner.js` (subprocess) | actual eval execution |
| `skills/bkit-evals/SKILL.md` | `lib/evals/runner-wrapper.js` | 단일 호출자 (caller=1) |
| L1 unit tests | `node:test`, `node:assert/strict` | 표준 테스트 러너 |
| L2 integration tests | L1 + 실 `evals/runner.js` + `evals/{cls}/{skill}/eval.yaml` | subprocess 실행 검증 |
| L3 contract tests | L1 + spawnSync mock | argv 명세 lock |

---

## 3. Data Model

본 hotfix는 신규 데이터 모델 도입 없음. 기존 wrapper 반환 객체에 optional `reason` 필드 신설:

### 3.1 invokeEvals 반환 객체 (TypeScript-style)

```typescript
interface InvokeEvalsResult {
  ok: boolean;
  skill: string;
  code?: number | null;
  reason?:
    | 'invalid_skill_name'
    | 'runner_missing'
    | 'spawn_threw'
    | 'timeout'
    | 'argv_format_mismatch'  // NEW (FR-03)
    | 'parsed_null';          // NEW (FR-02)
  stdout?: string;
  stderr?: string;
  parsed?: {
    pass: boolean;
    details?: {
      skill: string;
      classification: 'workflow' | 'capability' | 'hybrid';
      score?: number;
      matchedCriteria?: string[];
      failedCriteria?: string[];
    };
  } | null;
  resultFile?: string | null;
}
```

### 3.2 Result File JSON 스키마 (`.bkit/runtime/evals-{skill}-{ts}.json`)

```json
{
  "skill": "pdca",
  "invokedAt": "2026-04-28T13:45:44.776Z",
  "exitCode": 0,
  "timedOut": false,
  "stdoutTail": "{ \"pass\": true, ... }",
  "stderrTail": "",
  "parsed": { "pass": true, "details": { ... } },
  "reason": null
}
```

`reason` 필드는 v2.1.12에서 신설. 정상 시 `null`, 실패 시 위 union 중 하나.

---

## 4. API Specification

### 4.1 invokeEvals(skill, opts)

| 항목 | Spec |
|------|------|
| **Signature** | `function invokeEvals(skill: string, opts?: InvokeOpts): InvokeEvalsResult` |
| **`skill`** | 필수. `/^[a-z][a-z0-9-]{0,63}$/` 정규식 매치 필요 |
| **`opts.timeoutMs`** | 선택. 기본 30,000 / 최대 120,000 |
| **`opts.runnerPath`** | 선택. 테스트용 runner 경로 override |
| **`opts.persist`** | 선택. `false`이면 result file 영구화 skip |
| **변경 사항** | 본문만 변경 — `spawnSync` argv `[runnerPath, '--skill', skill]`. 시그니처 무변경 |

### 4.2 isValidSkillName(name)

| 항목 | Spec |
|------|------|
| **Signature** | `function isValidSkillName(name: unknown): boolean` |
| **변경 사항** | **무변경** |

### 4.3 resultPath(skill, isoTimestamp?)

| 항목 | Spec |
|------|------|
| **Signature** | `function resultPath(skill: string, isoTimestamp?: string): string` |
| **변경 사항** | **무변경** |

### 4.4 runner.js CLI Contract (참조)

| 항목 | Spec |
|------|------|
| **valid argv** | `--skill <name>` / `--classification <cls>` / `--benchmark` / `--parity <name>` |
| **invalid argv** | positional argument (e.g., `pdca` without `--skill`) |
| **invalid 동작** | "Usage: ..." 출력 + exit 0 |
| **변경 사항** | **무변경** — runner.js 자체는 정상 (positional 미지원이 의도된 설계) |

---

## 5. UI/UX Design

본 hotfix는 UI 변경 없음. CLI/slash 출력 텍스트 변경 없음 (단, `/bkit-evals run` 결과가 정상화되면서 사용자가 보는 출력이 "Usage 배너"에서 "JSON 결과"로 자연 변경됨).

---

## 6. Error Handling

### 6.1 Error Reason 정의 (FR-02 / FR-03 신규)

| `reason` | 트리거 조건 | 동작 |
|---|---|---|
| `invalid_skill_name` | skill name regex 미일치 | spawnSync 미호출, 즉시 반환 |
| `runner_missing` | `evals/runner.js` 파일 부재 | 즉시 반환 |
| `spawn_threw` | spawnSync exception (file not found 등) | error.message 포함 반환 |
| `timeout` | `result.error.code === 'ETIMEDOUT'` | timeoutMs 포함 반환 |
| `argv_format_mismatch` ★ NEW | `parsed === null && stdout.includes('Usage:')` | exit 0이어도 ok:false |
| `parsed_null` ★ NEW | `parsed === null && !Usage banner` | exit 0이어도 ok:false (방어적) |

### 6.1.1 `_extractTrailingJson(stdout)` 헬퍼 (FR-13, Phase 4a 발견 2차 결함 대응)

v2.1.11 wrapper의 `stdout.lastIndexOf('{')` 로직은 **nested object의 마지막 `{`** (e.g., `details: { ... }`의 시작)를 잡아서 outer object의 closing `}`이 trailing data로 남으면서 `JSON.parse`가 실패하는 결함이 있었다. 결과적으로 정상 JSON 출력에 대해서도 `parsed === null` 분기로 떨어져 `parsed_null` reason을 반환.

해결 알고리즘 (2-step):

1. **Whole-stdout parse** — `JSON.parse(stdout.trim())` 직접 시도 (most common case)
2. **Balanced-brace fallback** — 실패 시 `stdout.lastIndexOf('}')`부터 역방향 스캔 + string-aware brace counter (escape + `"` 추적) → 매칭되는 `{` 발견 시 그 슬라이스를 parse 시도

string-aware는 `{ "msg": "value with { brace inside }" }` 같은 string 내 brace를 brace counter가 잘못 세지 않도록 한다.

### 6.2 ok 결정 로직 (NEW)

```javascript
// FR-02 + FR-03: false-positive 방어 다층화
if (parsed === null) {
  if (stdout.includes('Usage:')) {
    return { ok: false, skill, code: result.status, reason: 'argv_format_mismatch',
             stdout, stderr, parsed: null, resultFile };
  }
  return { ok: false, skill, code: result.status, reason: 'parsed_null',
           stdout, stderr, parsed: null, resultFile };
}

// 정상 경로 — parsed 객체 존재
return {
  ok: result.status === 0 && parsed.pass !== false,  // exit 0 + eval pass
  skill,
  code: result.status,
  stdout,
  stderr,
  parsed,
  resultFile,
};
```

### 6.3 Caller 측 처리 가이드

| 결과 | Caller 권장 처리 |
|------|-----------------|
| `ok: true, parsed: {pass: true}` | 정상 — score/criteria 표시 |
| `ok: false, reason: 'invalid_skill_name'` | 입력 검증 실패 — usage hint |
| `ok: false, reason: 'argv_format_mismatch'` | wrapper/runner contract 위반 — bug report 권장 |
| `ok: false, reason: 'parsed_null'` | runner output unparseable — runner.js 문제 가능 |
| `ok: false, reason: 'timeout'` | timeout — 더 큰 timeoutMs로 재시도 |

---

## 7. Security Considerations

- [x] **Input Validation** — `SKILL_NAME_RE = /^[a-z][a-z0-9-]{0,63}$/` 유지 (변경 없음). path traversal, shell injection 차단
- [x] **Argv-array Spawn** — `spawnSync('node', argvArray, { shell: false })` 유지. 문자열 concatenation 0
- [x] **No Shell Interpolation** — argv 형식 변경(`['--skill', skill]`)에도 spawn shell 옵션 default(false) 유지
- [x] **Timeout Hard Cap** — `MAX_TIMEOUT_MS = 120_000` 유지 (DoS 방지)
- [x] **Result File Path** — `path.join(root, '.bkit', 'runtime', filename)` 유지 — traversal 불가능
- [x] **Stdout/stderr 검사** — `includes('Usage:')` 검사가 attacker가 조작 가능한 stdout에 노출되지 않음 (subprocess는 신뢰된 runner.js만)
- [x] **Domain Layer 격리** — wrapper는 infra layer, domain 무영향 (purity 유지)

---

## 8. Test Plan (L1 ~ L5)

> v2.1.11 baseline 3,754 TC + 신규 ~12 TC 추가, 0 회귀 + 0 FAIL 목표.

> **Test file location**: 기존 컨벤션(`tests/qa/*.test.js` 단일 디렉토리)을 따라 `tests/qa/v2112-evals-wrapper.test.js` 단일 파일에 L1+L2+L3 통합 (Plan §8.1의 디렉토리 분할 계획에서 회수). 18 TC 실측.

### 8.1 L1 — Unit Tests (`tests/qa/v2112-evals-wrapper.test.js` L1 섹션, 13 TC)

| TC ID | Subject | Verifies |
|---|---|---|
| L1-00 | `isValidSkillName` regex boundary (12 inputs: valid + over-length + uppercase + slash + traversal + shell metachar + leading digit + empty + null + undefined + number) | 보안 regex |
| L1-01 | `_extractTrailingJson` parses nested object | FR-13 happy path |
| L1-02 | `_extractTrailingJson` handles preceding logs + trailing JSON | FR-13 future-runner 호환 |
| L1-03 | `_extractTrailingJson` returns null for non-JSON (5 cases) | FR-13 graceful failure |
| L1-04 | `_extractTrailingJson` string-aware (브레이스 in JSON string 무영향) | FR-13 robustness |
| L1-05 | `invokeEvals('../etc/passwd')` short-circuits before spawn | 보안 |
| L1-06 | Usage 배너 시 `reason: 'argv_format_mismatch'` | FR-03 |
| L1-07 | empty stdout 시 `reason: 'parsed_null'` | FR-02 |
| L1-08 | plain text stdout 시 `reason: 'parsed_null'` | FR-02 |
| L1-09 | `runnerPath` absent 시 `reason: 'runner_missing'` | 안정성 |
| L1-10 | happy path with fake runner (JSON pass) → `ok: true` | 정상 경로 |
| L1-11 | JSON `pass: false` → `ok: false`, no reason (legitimate fail) | 의미 검증 |
| L1-12 | persist:true → resultFile에 `reason` 필드 영구화 | 결과 영구화 |

### 8.2 L2 — Integration Tests (`tests/qa/v2112-evals-wrapper.test.js` L2 섹션, 3 TC)

| TC ID | Subject | Verifies |
|---|---|---|
| L2-01 | 실 `runner.js` + `pdca` workflow eval → `parsed.details.classification === 'workflow'`, ok:true | 실 경로 |
| L2-02 | 실 `runner.js` + `starter` capability eval → `parsed.details.classification === 'capability'` | classification 정확성. (gap-detector는 agent로 capability eval 미등록이라 starter 사용) |
| L2-03 | 실 `runner.js` + `qa-phase` workflow eval → `parsed.details.skill === 'qa-phase'` | 다양한 workflow skill 정상 동작 |

### 8.3 L3 — Contract Tests (`tests/qa/v2112-evals-wrapper.test.js` L3 섹션, 2 TC)

| TC ID | Subject | Verifies |
|---|---|---|
| L3-01 | argv 형식 lock — PATH-injected node 셰임이 wrapper가 spawn한 argv를 캡처. `argv === ['--skill', skill]` 정확히 매치 | wrapper→runner contract |
| L3-02 | `evals/runner.js` 직접 호출(no args) → Usage 배너가 정확한 spec 문자열과 byte-by-byte 매치 | runner CLI spec |

### 8.4 L4 — Performance / NFR

- wrapper overhead (spawnSync 제외) < 50ms — L1 perf TC: 10회 평균
- 본 hotfix는 별도 L4 perf 신설 없음 (NFR 영향 미미)

### 8.5 L5 — End-to-End

- 직접 `/bkit-evals run pdca` 실행 (CC session 또는 hooks/session-start.js 경로) — 수동 검증
- 결과 파일 `.bkit/runtime/evals-*.json` 영구화 확인
- 별도 L5 자동 테스트 신설 없음 (CC session 자동화 부담 대비 가치 낮음)

### 8.6 Regression Tests (기존)

| 기존 TC | 영향 분석 |
|---|---|
| `tests/qa/bug-fixes-v218.test.js:B6-1` (runner.js 직접 호출 `--skill`) | **무영향** — runner.js 자체 미변경 |
| `tests/qa/bug-fixes-v218.test.js:B7-1` (no args → Usage) | **무영향** — runner.js 자체 미변경 |
| `tests/qa/bug-fixes-v218.test.js:B8-1` (`failedCriteria === 0`) | **무영향** — eval 로직 미변경 |
| `tests/qa/bkit-deep-system.test.js:A8-4~6` (syntax check) | **무영향** — wrapper 구문은 정상 |

---

## 9. Performance Considerations

| 메트릭 | 변경 전 | 변경 후 | 영향 |
|---|---|---|---|
| spawnSync overhead | ~50ms | ~50ms | 무변경 |
| stdout JSON parse | O(stdout) | O(stdout) + O(`includes('Usage:')`) | 무시 가능 (수십 byte 추가) |
| Result file write | ~3ms | ~3ms (reason 필드 +20 byte) | 무변경 |
| Total wrapper overhead | ~55ms | ~55ms | 무변경 |

---

## 10. Deployment Plan

### 10.1 Branch & PR Strategy

| 단계 | 작업 |
|---|---|
| 1 | `hotfix/v2112-evals-wrapper-argv` 브랜치 main에서 분기 ✅ (Phase 0 완료) |
| 2 | 4-commit chain (fix / test / version / docs sync) |
| 3 | hotfix branch push + PR open |
| 4 | CI 7-suite 자동 검증 |
| 5 | main 머지 |
| 6 | `git tag v2.1.12` + GitHub Release notes |

### 10.2 Rollback Plan

- main `85955cb` (v2.1.11) 복귀: `git revert <merge-commit>` 또는 `git reset --hard 85955cb` (force-push 동의 필요)
- 4-commit chain은 `git revert` 친화적 (의미 단위 분리)
- Release tag `v2.1.12` 삭제: `git tag -d v2.1.12 && git push origin :refs/tags/v2.1.12`

### 10.3 Cache Invalidation

- `bkit.config.json:version` bump → CC plugin reload trigger
- 사용자: `/plugin update bkit` 또는 CC 세션 재시작
- `/bkit version` 명령으로 배포 버전 검증 권장

---

## 11. Implementation Guide

### 11.1 File Map

| 파일 | 변경 유형 | LOC delta | Phase |
|---|---|---:|---|
| `lib/evals/runner-wrapper.js` | Modify | +30 / -3 | 4a |
| `tests/qa/v2112-evals-wrapper.test.js` | Create | +260 (L1+L2+L3 통합 18 TC) | 4b/4c/4d |
| `skills/bkit-evals/SKILL.md` | Modify | +1 / -1 | 4e |
| `bkit.config.json` | Modify | +1 / -1 | 7a |
| `.claude-plugin/plugin.json` | Modify | +1 / -1 | 7a |
| `.claude-plugin/marketplace.json` | Modify | +1 / -1 | 7g |
| `README.md` | Modify | +1 / -1 (badge) | 7b |
| `README-FULL.md` | Modify | ~5 LOC | 7b |
| `CHANGELOG.md` | Modify | +25 LOC (new section) | 7c |
| `AI-NATIVE-DEVELOPMENT.md` | Modify | +1 / -1 (version label) | 7d |
| `bkit-system/README.md` | Modify | ≤2 LOC | 7f |
| `hooks/hooks.json` | Modify | +1 / -1 (BKIT_VERSION ref if exists) | 7h |
| `lib/core/version.js` | Modify | +1 / -1 (if hardcoded) | 7i |
| `docs/00-pm/...` | Created | (Phase 1) | done |
| `docs/01-plan/...` | Created | (Phase 2) | done |
| `docs/02-design/...` | Creating | this doc | now |
| `docs/03-analysis/...` | Create | (Phase 5) | future |
| `docs/04-report/...` | Create | (Phase 8b) | future |
| `docs/05-qa/...` | Create | (Phase 8c) | future |

### 11.2 Implementation Order

1. **Phase 4a** wrapper 코드 수정 (argv + 방어 + @version bump)
2. **Phase 4b** L1 unit test 작성 (mock-runner stdouts via `--runnerPath` opt)
3. **Phase 4c** L2 integration test (실 runner.js + 실 eval.yaml)
4. **Phase 4d** L3 contract test (spawnSync 모니터링 + Usage banner 명세 lock)
5. **Phase 4e** SKILL.md 수정
6. **Phase 5** gap-detector 실행 → 100% 미달 시 iterate (max 5)
7. **Phase 6a-c** L1-L5 + CI 7-suite + 회귀
8. **Phase 7a-i** Doc Sync 9 task
9. **Phase 8a-d** 최종 validator + report + commit

### 11.3 Session Guide

| 세션 | 모듈 | 예상 LOC | 시간 |
|------|------|---:|---:|
| Session 1 (현 세션) | PM + Plan + Design + Phase 4a-e + Phase 5 | ~600 | 2-3h |
| Session 2 (선택) | Phase 6 QA + Phase 7 Docs + Phase 8 Report | ~400 | 1-2h |

L4 Full-Auto이므로 사용자 검토 게이트 최소. 단 Phase 8d commit 직전 git diff 단계별 검토 권장.

---

## 12. Convention Compliance

- [x] **English** — wrapper 코드, 테스트 코드, 코드 주석, CHANGELOG, root *.md 모두 영어
- [x] **Korean** — `docs/` 하위 PDCA 문서만 한국어 (이 design 문서 포함)
- [x] **8-language 트리거** — SKILL.md frontmatter 내 trigger 키워드는 변경 없음 (8개 언어 유지)
- [x] **Conventional Commits** — `fix(evals):`, `test(evals):`, `docs(v2.1.12):` 형식
- [x] **Co-Authored-By** — Claude Opus 4.7 (1M context) attribution
- [x] **JSDoc @version** — `@version 2.1.11` → `@version 2.1.12`. `@since` 무변경(2.1.11 도입 시점 보존)
- [x] **ENH-162 ≤250자** — SKILL.md description 한도 유지
- [x] **No emoji in code** — wrapper 본문 emoji 없음
- [x] **Domain Purity** — wrapper는 infra layer, domain 무영향

---

## 13. Risk Mitigation Checkpoint

| Risk (Plan §5) | Mitigation 적용 위치 |
|---|---|
| R1 30 eval 회귀 | L3-01 contract test argv lock + L2-01~03 다양한 classification 검증 |
| R2 정상 결과 차단 | L1-01 정상 경로 명시 + Step 5 short-circuit (`parsed !== null` 시 banner 검사 skip) |
| R3 prefix 변형 | `stdout.includes('Usage:')` 사용 (startsWith 대신) + AND `parsed === null` 보강 |
| R4 cache 잔존 | bkit.config.json bump (Phase 7a) + 4-commit chain 마지막 docs commit이 모든 SoT 동시 갱신 |
| R5 Docs=Code 누락 | Phase 7a~i 9 task 분할 + Phase 8a docs-code-sync.js 게이트 |
| R6 unintended 수정 | guardrails: blastRadius 10, checkpoint, write lock + git diff 단계별 검토 |
| R7 ENH-277 충돌 | `reason` 필드 신설은 caller-agnostic (omit 시 기존 동작과 호환) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-28 | Initial design, Option B 선정, L1+L2+L3 11 TC plan | bkit PDCA (CTO-Led, L4) |
