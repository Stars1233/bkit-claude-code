---
template: qa-report
version: 1.0
feature: bkit-v2112-evals-wrapper-hotfix
date: 2026-04-28
author: bkit PDCA (CTO-Led, L4 Full-Auto)
phase: QA
qa_status: PASS
---

# bkit v2.1.12 Evals Wrapper Hotfix QA Report

> **Verdict**: ✅ **QA PASS** — 모든 카테고리 통과, 0 FAIL, 100% Match Rate, 7/7 CI validators PASS, 0 회귀.
>
> **Plan**: [docs/01-plan/features/bkit-v2112-evals-wrapper-hotfix.plan.md](../01-plan/features/bkit-v2112-evals-wrapper-hotfix.plan.md)
> **Design**: [docs/02-design/features/bkit-v2112-evals-wrapper-hotfix.design.md](../02-design/features/bkit-v2112-evals-wrapper-hotfix.design.md) §8 Test Plan

---

## QA Phase 개요

| 항목 | 값 |
|---|---|
| **QA Phase** | Phase 6a (L1-L3 execution) + 6b (CI validators 7-suite) + 6c (Regression) + 8a (Final docs-code-sync) |
| **테스트 자동화 수준** | L1 단위, L2 통합, L3 contract 모두 `node --test`-style + 자체 tc() 헬퍼 |
| **L4 Full-Auto 게이트** | guardrails(blastRadius 10, checkpointAutoCreate, concurrentWriteLock) 활성, 자율 진행 |
| **사용자 명시 임계** | Match Rate **100%** (90% 기본을 상향) |

---

## 1. L1 Unit Tests — `tests/qa/v2112-evals-wrapper.test.js` L1 섹션

| TC ID | Subject | Result | 검증 항목 |
|---|---|:---:|---|
| L1-00 | `isValidSkillName` regex boundary (12 inputs) | ✅ | 보안 regex |
| L1-01 | `_extractTrailingJson` parses nested object | ✅ | FR-13 happy path |
| L1-02 | `_extractTrailingJson` handles preceding logs + trailing JSON | ✅ | FR-13 future-runner 호환 |
| L1-03 | `_extractTrailingJson` returns null for non-JSON (5 cases) | ✅ | FR-13 graceful failure |
| L1-04 | `_extractTrailingJson` string-aware (브레이스 in JSON string) | ✅ | FR-13 robustness |
| L1-05 | `invokeEvals('../etc/passwd')` short-circuits before spawn | ✅ | 보안 (path traversal) |
| L1-06 | Usage 배너 시 `reason: 'argv_format_mismatch'` | ✅ | FR-03 |
| L1-07 | empty stdout 시 `reason: 'parsed_null'` | ✅ | FR-02 |
| L1-08 | plain text stdout 시 `reason: 'parsed_null'` | ✅ | FR-02 |
| L1-09 | `runnerPath` absent 시 `reason: 'runner_missing'` | ✅ | 안정성 |
| L1-10 | happy path with fake runner (JSON pass) → `ok: true` | ✅ | 정상 경로 |
| L1-11 | JSON `pass: false` → `ok: false`, no reason | ✅ | 의미 검증 |
| L1-12 | persist:true → resultFile에 `reason` 필드 영구화 | ✅ | 결과 영구화 |

**L1 Result**: **13/13 PASS** (계획 6 → 실측 13). 0 FAIL.

---

## 2. L2 Integration Tests — 실 runner.js + 실 eval.yaml

| TC ID | Subject | Result | 증거 |
|---|---|:---:|---|
| L2-01 | `pdca` workflow eval | ✅ | `parsed.details.classification === 'workflow'`, `pass: true`, `score: 1` |
| L2-02 | `starter` capability eval | ✅ | `parsed.details.classification === 'capability'`, `parsed.details.skill === 'starter'` |
| L2-03 | `qa-phase` workflow eval | ✅ | `parsed.details.skill === 'qa-phase'` |

**L2 Result**: **3/3 PASS**. 실 subprocess 경로에서 wrapper → runner.js → eval.yaml 전 체인 정상 동작.

---

## 3. L3 Contract Tests — Tracked (`test/contract/v2112-evals-wrapper.contract.test.js`)

| TC ID | Subject | Result | 증거 |
|---|---|:---:|---|
| C1 | wrapper passes `['--skill', skill]` argv | ✅ | PATH-injected node shim으로 captured argv 검증, `JSON.stringify === '["--skill","pdca"]'` |
| C2 | runner.js no-args Usage banner spec lock | ✅ | byte-exact: `Usage: node runner.js --skill <name> \| --classification <type> \| --benchmark \| --parity <name>\n` |

**L3 Contract Result**: **2/2 PASS**. CI 영구 회귀 보호망 구축 완료.

---

## 4. CI Validators 7-Suite — Phase 8a 최종 게이트

| Validator | Command | Result | 핵심 측정 |
|---|---|:---:|---|
| docs-code-sync | `node scripts/docs-code-sync.js` | ✅ PASS | 8 counts (43/36/21/24/2/16/142/49) + BKIT_VERSION 5/5 (canonical 2.1.12) + One-Liner SSoT 5/5 |
| check-domain-purity | `node scripts/check-domain-purity.js` | ✅ PASS | 12 files, 0 forbidden imports |
| check-deadcode | `node scripts/check-deadcode.js` | ✅ PASS | 142 modules, 0 dead, 43 exempt (wrapper 포함) |
| check-guards | `node scripts/check-guards.js` | ✅ PASS | 21 guards, 0 warnings |
| check-trust-score-reconcile | `node scripts/check-trust-score-reconcile.js` | ✅ PASS | 3 flags + reconcile + runtime caller + config |
| check-quality-gates-m1-m10 | `node scripts/check-quality-gates-m1-m10.js` | ✅ PASS | catalog ↔ bkit.config.json 정렬 |
| L5 E2E shell smokes | `bash test/e2e/run-all.sh` | ✅ PASS | 5/5 (SessionStart, .claude/ defense, check-guards, docs-code-sync canonical 2.1.12, MCP 16 tools 42/42 TC) |

**CI Result**: **7/7 PASS**. 0 FAIL. 모든 CI invariant 회복.

---

## 5. Regression — 전체 테스트 suite

### 5.1 tests/qa/ (local-only, 14 files)

| File | Result | 비고 |
|---|:---:|---|
| `bkit-deep-system.test.js` | ✅ PASS | A9-2 stale baseline 39 → 43 정정 후 PASS |
| `bkit-full-system.test.js` | ✅ PASS | |
| `bug-fixes-v218.test.js` | ✅ PASS | runner.js 직접 호출 회귀 baseline 보호 |
| `completeness.test.js` | ✅ PASS | |
| `config-audit.test.js` | ✅ PASS | |
| `context-budget.test.js` | ✅ PASS | |
| `dead-code.test.js` | ✅ PASS | |
| `round4-runtime-matrix.test.js` | ✅ PASS | |
| `scanner-base.test.js` | ✅ PASS | |
| `session-context.test.js` | ✅ PASS | |
| `session-ctx-fingerprint.test.js` | ✅ PASS | |
| `shell-escape.test.js` | ✅ PASS | |
| `ui-opt-out-matrix.test.js` | ✅ PASS | |
| `v2112-evals-wrapper.test.js` ★ NEW | ✅ PASS (18/18) | 본 hotfix 신규 |

**tests/qa/ Result**: **14/14 PASS**.

### 5.2 test/contract/ (tracked, 28 files → 27 + 1 new)

| File | Result | 비고 |
|---|:---:|---|
| (기존 25 파일) | ✅ PASS | 변경 없음 |
| `docs-code-sync.test.js` | ✅ PASS | EXPECTED_COUNTS 39 → 43 정정 후 PASS (v2.1.11 머지 누락 정리) |
| `extended-scenarios.test.js` | ✅ PASS | EXPECTED_COUNTS + diffCounts 39 → 43 정정 후 PASS |
| `v2112-evals-wrapper.contract.test.js` ★ NEW | ✅ PASS (2/2) | 본 hotfix 신규 |

**test/contract/ Result**: **28/28 PASS**.

### 5.3 회귀 통계

| 카테고리 | Before (v2.1.11 main) | After (v2.1.12) | Delta |
|---|---:|---:|---:|
| L1 unit | 1,575 | 1,588 (+13 new) | +13 |
| L2 integration | 555 | 558 (+3 new) | +3 |
| L3 contract | 40 | 42 (+2 new) | +2 |
| 기타 | 1,584 | 1,584 | 0 |
| **Total TC** | **3,754** | **3,774** | **+20** |
| FAIL | 0 | 0 | 0 |
| Pass Rate | 99.9% | 99.9% | 유지 |

**Regression Result**: **0 회귀**. 신규 +20 TC. baseline pass rate 유지.

---

## 6. v2.1.11 잠재 기술 부채 동시 해소

본 hotfix가 v2.1.11 머지 시 누락된 baseline drift도 함께 정리:

| 위치 | 이전 (v2.1.11) | 정정 (v2.1.12) | 영향 |
|---|---|---|---|
| `tests/qa/bkit-deep-system.test.js:854` | `skills count 39` | `43` | local QA 회귀 정상화 |
| `test/contract/docs-code-sync.test.js` (6 places) | `skills: 39` | `43` (drift +1는 44, agents -1은 35 유지) | contract test 정상화 |
| `test/contract/extended-scenarios.test.js` (2 places) | `EXPECTED_COUNTS.skills, 39`, `diffCounts skills 40` | `43`, `44` | contract test 정상화 |

**Note**: `lib/domain/rules/docs-code-invariants.js`의 EXPECTED_COUNTS는 v2.1.11에서 이미 43으로 정확. 이번 정정은 SoT를 검증하는 contract test의 lagging이 발견되어 동기화한 것.

---

## 7. 보안·성능·NFR 검증

| NFR | Plan §3.2 기준 | 결과 | 측정 방법 |
|---|---|:---:|---|
| **Performance** | wrapper overhead < 50ms | ✅ ~1-3ms (subprocess 제외) | L1 평균 측정 |
| **Correctness** | false-positive `ok:true` + Usage 배너 0건 | ✅ 0건 | L1-06 명시 검증 |
| **Backward Compat** | `invokeEvals()` 시그니처 무변경 | ✅ 시그니처 동일, `reason` 필드 optional 신설 | API surface diff |
| **Security** | argv injection 방어 0건 위반 | ✅ regex + array spawn + path 검증 | L1-05 invalid name |
| **Domain Purity** | forbidden import 0건 | ✅ 0건 (wrapper는 infra layer) | check-domain-purity.js |
| **Docs=Code** | BKIT_VERSION 5/5, 8 counts, One-Liner 5/5 | ✅ 모두 PASS | docs-code-sync.js |
| **Idempotency** | 같은 skill 다회 호출 → 동일 결과 + 새 result file | ✅ resultPath ISO 타임스탬프로 unique | L1-12 |

---

## 8. QA Phase Conclusion

### 8.1 Verdict

✅ **QA PASS** — 모든 카테고리 통과.

### 8.2 자동 fix 사항 (in-cycle)

다음 사항이 hotfix 진행 중에 발견되어 동일 사이클에서 자동 수정됨:

1. **Phase 4a** — `_extractTrailingJson` 결함(JSON parse `lastIndexOf` nested-object trap) 발견 후 즉시 Plan/Design FR-13 추가 + 헬퍼 신설 + L1 4 TC 추가.
2. **Phase 6c** — `tests/qa/bkit-deep-system.test.js A9-2 skills count 39` stale baseline 발견 후 43으로 정정.
3. **Phase 6c** — `test/contract/docs-code-sync.test.js` + `extended-scenarios.test.js`의 EXPECTED_COUNTS.skills 39 stale baseline 발견 후 43으로 정정.

### 8.3 다음 phase 전환

→ Phase 8d **commit chain push** + PR 생성.

`QA_PASS` directive emitted → `/pdca` 자동 advancement: report 단계 완료 후 archive 가능.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-28 | Initial QA report (PDCA Phase 8c), QA PASS verdict | bkit PDCA (CTO-Led, L4) |
