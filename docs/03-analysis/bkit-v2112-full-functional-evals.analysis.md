# bkit v2.1.12 — 30 Skill Eval Batch 분석

- **세션**: bkit-v2112-evals-wrapper-hotfix 후속 검증 (Phase 1)
- **브랜치**: `hotfix/v2112-evals-wrapper-argv` (HEAD `bdf8b5a`)
- **자동화 레벨**: L4 Full-Auto (user-explicit)
- **실측 일자**: 2026-04-28
- **요약 파일**: `.bkit/runtime/v2112-batch-summary.json`
- **per-skill 결과 30종**: `.bkit/runtime/evals-{skill}-2026-04-28T14-45-27*.json`

## 1. 결과 매트릭스

| Classification | Total | Pass | Fail | Pass Rate | evalName 분포 |
|---|:---:|:---:|:---:|:---:|---|
| workflow | 11 | 11 | 0 | 100% | trigger-accuracy ×10 + version-range-trigger ×1 (cc-version-analysis) |
| capability | 18 | 18 | 0 | 100% | output-quality ×18 |
| hybrid | 1 | 1 | 0 | 100% | trigger-accuracy ×1 (plan-plus) |
| **합계** | **30** | **30** | **0** | **100%** | trigger-accuracy 11 + output-quality 18 + version-range-trigger 1 |

- **Score**: min=1.0 / max=1.0 / avg=1.0 (saturated, 구분 신호 0건)
- **Total wall time**: 620 ms (평균 20.7 ms/skill, no LLM call)
- **wrapper.ok flag**: 30/30 true (exit 0 + parsed!=null + parsed.pass!==false)
- **fail-closed defense triggered**: 0건 (`reason` 필드 모두 null)

## 2. 30 Skill 상세 결과

### Workflow (11)

| # | Skill | evalName | Score | code | Duration |
|---|---|---|:---:|:---:|:---:|
| 1 | bkit-rules | trigger-accuracy | 1.00 | 0 | 23 ms |
| 2 | bkit-templates | trigger-accuracy | 1.00 | 0 | 20 ms |
| 3 | pdca | trigger-accuracy | 1.00 | 0 | 21 ms |
| 4 | qa-phase | trigger-accuracy | 1.00 | 0 | 21 ms |
| 5 | development-pipeline | trigger-accuracy | 1.00 | 0 | 20 ms |
| 6 | phase-2-convention | trigger-accuracy | 1.00 | 0 | 20 ms |
| 7 | phase-8-review | trigger-accuracy | 1.00 | 0 | 21 ms |
| 8 | zero-script-qa | trigger-accuracy | 1.00 | 0 | 19 ms |
| 9 | code-review | trigger-accuracy | 1.00 | 0 | 20 ms |
| 10 | pm-discovery | trigger-accuracy | 1.00 | 0 | 20 ms |
| 11 | cc-version-analysis | **version-range-trigger** | 1.00 | 0 | 23 ms |

### Capability (18)

| # | Skill | evalName | Score | code | Duration |
|---|---|---|:---:|:---:|:---:|
| 12 | starter | output-quality | 1.00 | 0 | 20 ms |
| 13 | dynamic | output-quality | 1.00 | 0 | 20 ms |
| 14 | enterprise | output-quality | 1.00 | 0 | 23 ms |
| 15 | phase-1-schema | output-quality | 1.00 | 0 | 20 ms |
| 16 | phase-3-mockup | output-quality | 1.00 | 0 | 20 ms |
| 17 | phase-4-api | output-quality | 1.00 | 0 | 20 ms |
| 18 | phase-5-design-system | output-quality | 1.00 | 0 | 21 ms |
| 19 | phase-6-ui-integration | output-quality | 1.00 | 0 | 22 ms |
| 20 | phase-7-seo-security | output-quality | 1.00 | 0 | 21 ms |
| 21 | phase-9-deployment | output-quality | 1.00 | 0 | 20 ms |
| 22 | mobile-app | output-quality | 1.00 | 0 | 20 ms |
| 23 | desktop-app | output-quality | 1.00 | 0 | 20 ms |
| 24 | claude-code-learning | output-quality | 1.00 | 0 | 22 ms |
| 25 | bkend-quickstart | output-quality | 1.00 | 0 | 20 ms |
| 26 | bkend-auth | output-quality | 1.00 | 0 | 21 ms |
| 27 | bkend-data | output-quality | 1.00 | 0 | 19 ms |
| 28 | bkend-cookbook | output-quality | 1.00 | 0 | 20 ms |
| 29 | bkend-storage | output-quality | 1.00 | 0 | 20 ms |

### Hybrid (1)

| # | Skill | evalName | Score | code | Duration |
|---|---|---|:---:|:---:|:---:|
| 30 | plan-plus | trigger-accuracy | 1.00 | 0 | 19 ms |

## 3. wrapper-runner contract 입증 (v2.1.12 fix 검증)

### 3.1 Archeological evidence (이전 bugged state vs 현재)

`.bkit/runtime/evals-pdca-*.json` 시계열에서 v2.1.12 fix의 효과를 직접 관찰 가능:

| 시점 (ISO) | stdoutTail 패턴 | parsed | reason | 단계 |
|---|---|---|---|---|
| 2026-04-28T13:45:40Z | `Usage: node runner.js --skill <name> | --classification ...` | null | (없음, v2.1.11 BUG) | **B1 detection** — argv positional 형태로 호출하여 runner가 Usage banner 출력 |
| 2026-04-28T14:01:33Z | `{"pass":true,"details":{...}}\n` | null | `parsed_null` | **B2/B3 detection** — argv fix 후 JSON 출력은 정상이나 `lastIndexOf('{')` 트랩으로 parse 실패 |
| 2026-04-28T14:02:33Z | `{"pass":true,"details":{...}}\n` | `{pass:true,details:{...}}` | null | **B3 fix 적용** — `_extractTrailingJson` 2-strategy 도입 후 정상 |
| 2026-04-28T14:45:27Z (오늘) | `{"pass":true,"details":{score:1,...}}\n` | `{pass:true,details:{...}}` | null | **GA state** — 30/30 skill에서 일관되게 정상 |

### 3.2 fail-closed defense 확증

오늘 30 batch 어디에서도 다음 실패 분기 trigger 안 됨:
- `reason: 'argv_format_mismatch'` (Usage banner 감지) → 0건
- `reason: 'parsed_null'` (JSON 추출 실패) → 0건
- `reason: 'invalid_skill_name'` (regex 미매치) → 0건
- `reason: 'timeout'` → 0건
- `reason: 'spawn_threw'` / `'runner_missing'` → 0건

→ wrapper의 6개 실패 분기가 **runtime에서 정상 경로로 분류되는** 단순 시나리오에서 noise 없이 동작함이 입증됨. 부정 시나리오는 `tests/qa/v2112-evals-wrapper.test.js` (L1 13 TC) + `test/contract/v2112-evals-wrapper.contract.test.js` (L3 2 TC) 가 커버.

## 4. 발견 사항

### 4.1 Confirmed (확정)

- ✅ **v2.1.12 wrapper-runner contract** 30 skill 전체에서 0 false-positive로 작동
- ✅ **30 eval.yaml + 30 SKILL.md** 정합성 (placeholder/criteria-match 통과)
- ✅ **classification 분포 정확** (config.json 11/18/1 → runner 출력 11/18/1)
- ✅ **reproducibility** — invokeEvals batch는 결정론적 (LLM 호출 부재로 jitter 없음)

### 4.2 Score Saturation (관찰)

- 30 skill 모두 score=1.0 → eval framework가 binary pass/fail에 가까운 동작 (failedCriteria.length===0 → pass=true, score=matchedCriteria/effectiveCriteria)
- 중간 score 0.5/0.7 등이 나오는 사례 0건 — partial-match 케이스 부재
- 대부분의 SKILL.md가 모든 criteria의 keyword 포함 → **현 매칭 알고리즘은 quality discriminator로 한계** (학술적으로 saturated metric 문제)

### 4.3 Static-only Limitation

**근본 발견**: `evals/runner.js` (v1.6.1, 449 LOC)는 LLM/HTTP 호출이 0건 (`grep -nE 'fetch|axios|anthropic|sonnet|opus|haiku|claude|http' evals/runner.js` → 0 matches). 동작 메커니즘:

1. `evals/{classification}/{skill}/eval.yaml` parse (자체 YAML parser)
2. `prompt-1.md` + `expected-1.md` length/placeholder 체크 (`< 50 chars or single line` → fail)
3. SKILL.md 파일에서 criteria keyword 매칭 (regex-based)
4. score = matchedCriteria / effectiveCriteria
5. pass = failedCriteria.length === 0

**한계**: 실제 LLM이 skill을 발동/사용했을 때의 quality는 측정 불가. config.json에 `parityThreshold: 0.85` + `benchmarkModel: claude-sonnet-4-6` 가 정의되어 있으나 runner는 이를 사용하지 않음 (parity_test.enabled: false in eval.yaml들).

### 4.4 신규 개선 후보

| ID | 우선순위 | 항목 | 근거 |
|---|---|---|---|
| **CARRY-7** | P2 | LLM-based parity test 활성화 (parity_test.enabled: true + ab-tester.js 연결) | static-only로는 skill regression 검출 한계. CARRY-4 token-meter false-positive(0/0)와 동일하게 OTEL/observability 옵트인 형태로 진행 권장. |
| **CARRY-8** | P3 | Score saturation 해소 — partial credit (각 criterion에 weight 부여) 또는 multi-prompt 평균 도입 | 30/30 score=1.0은 quality discriminator 부재 신호. v2.1.13+ |
| **CARRY-9** | P3 | invokeEvals batch CLI 정식 추가 (`evals/runner.js --all` 또는 `--classification {workflow,capability,hybrid}`) | 본 검증에서 외부 batch script(`v2112-batch-evals.js`) 작성 필요했음. 정식 CLI 형태로 노출 권장. |

## 5. 결론

| 항목 | 결과 |
|---|---|
| **v2.1.12 hotfix** | ✅ **PASS** (30/30 wrapper contract 정상, archeological evidence로 fix-before/after 차이 명확) |
| **eval framework integrity** | ✅ **PASS** (30 eval.yaml + classification + criteria-match 정합) |
| **regression detection power** | ⚠️ **LIMITED** (static-only, score saturated, LLM parity 비활성) — CARRY-7/8/9 후보 |
| **Phase 1 verdict** | ✅ **L1 PASS** — 다음 phase 진행 (skill smoke + qa-lead L1-L5) |

다음 phase: user-invocable skill 28종 enumerate + smoke test (Phase 2).
