# CC v2.1.116 → v2.1.123 stable→latest 갭 종합 메타 분석

> **Status**: ✅ Final (메타 분석, 5개 단계별 보고서 통합 + production 운영 시각 추가)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.12 (current, hotfix released 2026-04-29 — 본 분석 무영향)
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Date**: 2026-04-30
> **PDCA Cycle**: cc-version-analysis (meta-analysis, 7-release gap)
> **CC Range**: v2.1.116 (npm `stable`, 2026-04-20) → v2.1.123 (npm `latest`, 2026-04-29) — 9-day window, 7 releases
> **Verdict**: **누적 Breaking 0건 / 자동수혜 17건 / 누적 ENH 19건 (P0×1 / P1×9 / P2×6 / P3×3) / R-3 시리즈 P0 격상 / dist-tag 운영 가이드 정식화 (ENH-290)**

---

## 1. Executive Summary

### 1.1 메타 분석 위치

본 보고서는 **이미 발행된 5개 단계별 보고서를 통합**하여 production 운영 의사결정 시각으로 재해석합니다:

| # | 단계별 보고서 | 발행일 | 상태 |
|:-:|-----|:-:|:-:|
| 1 | `cc-v2116-v2117-impact-analysis.report.md` | 2026-04-22 | ✅ |
| 2 | `cc-v2117-v2119-impact-analysis.report.md` (재작성판) | 2026-04-24 | ✅ |
| 3 | `cc-v2119-v2120-impact-analysis.report.md` (ADR 0003 1차) | 2026-04-25 | ✅ |
| 4 | `cc-v2120-v2121-impact-analysis.report.md` (ADR 0003 2차) | 2026-04-28 | ✅ |
| 5 | `cc-v2121-v2123-impact-analysis.report.md` (ADR 0003 3차) | 2026-04-29 | ✅ |

본 메타 분석의 신규 가치:
1. **production stable(v2.1.116) 유지 vs latest(v2.1.123) 승격** trade-off 정량화
2. 7-릴리스 갭 누적 영향 매트릭스 (bkit 컴포넌트 단위 집계)
3. **ENH-290 dist-tag 운영 가이드 정식화** (3-Bucket Decision Framework)
4. v2.1.13 Sprint 진입 시 우선순위 의도 탐색·대안·YAGNI 통합 검토

### 1.2 최종 판정

| 항목 | 누적 값 (7 릴리스) | 비고 |
|------|----:|------|
| 분석 릴리스 수 | **7** | v2.1.117 / v2.1.118 / v2.1.119 / v2.1.120 / v2.1.121 / v2.1.122 / v2.1.123 |
| 분석 기간 | **9일** | 2026-04-20 ~ 2026-04-29 |
| **Breaking Changes** | **0건** | 7 릴리스 전체 확정 |
| 누적 변경 수집 | **~181 bullets** | 24 + 80 + 22 + 38 + 17 |
| **CONFIRMED 자동수혜** | **17건** | F9-120 / B1-121 / B2-121 / B4-121 / F11-121 / B19-121 / F15-122 / F10-122 / F1-123 외 |
| 정밀 검증 (무영향 확정) | **6건** | F4-118 / B12-118 / F4-120 / F9-121 / F7-122 / F1-123 / #54196 |
| YAGNI FAIL DROP | **10건+** | F2-117 / I4-117 / F4-118 / B12-118 / 외 |
| 신규 ENH (누적) | **19건** | ENH-254~264 (11) + ENH-281~290 (10) — **본 보고서에서 ENH-290 정식화** |
| **R-3 시리즈** | **P3 → P0 격상** | 0 → 8 → 42+건 (5일 폭증, +1.4 violations/day) |
| 잠재 결함 자동해소 | **1건** | F9-120 (`claude plugin validate .` 사전 미인지) |
| F9-120 closure 안정화 | **2-3 릴리스 연속 PASS** | v2.1.120 / v2.1.121 / v2.1.123 |
| 연속 호환 릴리스 | **75 → 81 (+6)** | bkit v2.1.10/11/12 모두 무수정 작동 |
| MON-CC-06 갱신 | **16 → 29~30건** | 13~14건 신규 등록 |
| ADR 0003 적용 | **3 사이클 일관성 입증** | v2.1.120 1차 / v2.1.121 2차 / v2.1.122/123 3차 |
| **bkit hotfix 발생** | **v2.1.12 1건** | evals-wrapper-argv (CC 무관 내부 결함) |

### 1.3 4-관점 가치 표

| 관점 | 내용 |
|------|------|
| **Technical** | 7 릴리스 갭에서 **17건 자동수혜**가 누적됨 — F9-120 marketplace.json validation 자동해소(잠재 결함 능동 발견) + B1/B2/B4-121 메모리/worktree 안정성 + F15-122 hooks.json fail-isolation(Defense Layer 2 신뢰성 +1) + F10-122 ToolSearch nonblocking(16 MCP tools) + F1-123 OAuth 401. 그러나 stable 환경(v2.1.116) 운영자는 **이 17건을 모두 미수혜**. 특히 F15-122 / B2-121 / F9-120 / F1-123 4건은 production 환경에서도 직접 가치(메모리 누수 fix, hooks 신뢰성, OAuth 무한 retry 차단). 누적 OTEL 5건 묶음(F8-119 + I6-119 + I4-121 + F4-122 + I2-122)은 **Sprint δ FR-δ4 단일 PR로 처리** 권장. |
| **Operational** | **stable v2.1.116 유지의 안정성 가치는 v2.1.117~v2.1.119 false alarm 사이클 회피로 입증됨** (초판 P0 2건 REFUTED). 그러나 v2.1.120 이후 ADR 0003이 안정화되면서 false alarm 빈도가 0건으로 감소 → stable 유지 정당성이 점진 약화. **dist-tag 정책 권고**: bkit 권장 채널을 **stable=장기운영(보수적), latest=주력개발, next=사전대응(RC)** 3-Bucket으로 분리하고, 환경별 권장값을 docs/01-plan/에 명시(ENH-290). v2.1.120 release tag 영구 누락(R-1)은 v2.1.121 이후 정상화. |
| **Strategic** | ADR 0003 (Empirical Validation) **3-사이클 일관성 입증**으로 분석 프로세스 신뢰도 회복. **bkit 차별화 기회 2건 명확화**: ENH-286 (PreToolUse memory-enforced deny-list, CC advisory → bkit enforced 격상) + ENH-289 (Defense Layer 6 post-hoc audit, R-3 P0 응답). 이 2건은 **CC 채널 선택과 독립적**(R-3는 모델 학습 동작이라 stable에서도 동일 위험) → 채널 정책과 무관한 bkit 제품 moat. v2.1.13 sprint 진입 시 본 메타 분석을 SSoT로 사용. |
| **Quality** | bkit v2.1.10 / v2.1.11 / v2.1.12 모두 7 릴리스 전체에서 **무수정 작동** 확정. v2.1.12 hotfix(evals-wrapper-argv)는 CC와 무관한 내부 결함. bkit Defense-in-Depth 4-Layer는 7 릴리스 동안 견고성 유지. ENH-289 Defense Layer 6 신규 도입 시 **6-Layer 모델로 격상**. CC stable 채널이 누락하는 fix를 bkit이 자체 patch로 보완할 수 있는 영역(예: F15-122 hooks.json 외부 검증)을 docs/01-plan/에 정리. |

### 1.4 핵심 의사결정 — production 채널 선택

```
┌────────────────────────────────────────────────────────────────────┐
│  3-Bucket Decision Framework (ENH-290 정식화)                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Bucket A: stable 유지 (v2.1.116)                                  │
│   ├─ 적합: 장기 무인 운영, regression risk 회피 1순위              │
│   ├─ 미수혜: F9-120 / B1/B2/B4-121 / F15-122 / F10-122 / F1-123   │
│   └─ 권장 보완: bkit 자체 patch (선택적), R-3 ENH-289 직접 적용    │
│                                                                    │
│  Bucket B: latest 승격 (v2.1.123) — 주력 개발 환경, kay 환경       │
│   ├─ 적합: 개발자 환경, 빠른 fix 수혜, ADR 0003 적용 검증 가능     │
│   ├─ 자동수혜: 17건 모두 활성                                       │
│   └─ 잔여 위험: false alarm 가능성 (v2.1.120 이후 0건)              │
│                                                                    │
│  Bucket C: next 선행 (v2.1.124+)                                   │
│   ├─ 적합: bkit 메인테이너 환경 (사전 대응 + 본 워크플로우 입력)    │
│   ├─ 가치: ADR 0003 P1.5 게이트 사전 실행 + ENH 사전 도출           │
│   └─ 잔여 위험: pre-release noise (RC 변경 가능성)                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**bkit 권장 매트릭스**:

| 환경 유형 | 권장 채널 | 권장 버전 | 권고 사항 |
|---|---|---|---|
| Production 장기 운영 | **stable** | v2.1.116 | bkit Defense Layer 6 (ENH-289) 채널 무관 직접 적용 |
| 일반 개발자 (95%) | **latest** | **v2.1.123** | F15-122/B2-121 등 17건 자동수혜 + ADR 0003 게이트 활용 |
| bkit 메인테이너 | **next** | v2.1.124+ | 본 워크플로우 사전 실행, ENH 사전 도출 |
| macOS 11 환경 | (latest pin) | v2.1.112 | ADR 환경 예외 (변경 없음) |
| non-AVX CPU | (latest pin) | v2.1.112 | ADR 환경 예외 (변경 없음) |
| Windows parenthesized PATH | (latest pin) | v2.1.114+ | ADR 환경 예외 (변경 없음) |

---

## 2. 누적 변경 매트릭스 (7 릴리스)

### 2.1 릴리스별 요약 (publish 시각 UTC)

| 버전 | 발행일시 | bullets | HIGH | MEDIUM | LOW | bkit ENH | Verdict |
|------|---|:---:|:---:|:---:|:---:|---|---|
| v2.1.116 | 2026-04-20T19:24Z | (baseline) | — | — | — | — | npm `stable` anchor |
| **v2.1.117** | 2026-04-21T21:54Z | 24 | 6 | 9 | 9 | ENH-254~264 (11건) | F1 FORK_SUBAGENT / F3 Glob/Grep / F6 Opus 4.7 1M |
| **v2.1.118** | 2026-04-22T23:48Z | 34 | (병합 분석) | — | — | (포함) | (재작성 시 통합) |
| **v2.1.119** | 2026-04-23T21:36Z | 46 | 0 (REFUTED) | 1 | — | (carryover) | npm `latest` (당시), ADR 0003 신설 |
| **v2.1.120** | 2026-04-24T23:02Z | 22 | — | — | — | — | F9-120 자동해소 (ADR 0003 1차) |
| **v2.1.121** | 2026-04-27T19:39Z | 38 | — | — | — | CAND-003~007 (5건) | F9-120 closure 2-릴리스 연속, R-3 시리즈 8건 |
| **v2.1.122** | 2026-04-28T17:35Z | 16 | 1 | 4 | 11 | ENH-281~288 (8건) | F15-122 hooks fail-isolation, R-3 폭증 시작 |
| **v2.1.123** | 2026-04-29T01:52Z | 1 | 1 | 0 | 0 | ENH-289 (1건) | F1-123 OAuth fix, R-3 42+ P0 격상 |
| **누적** | **9 days** | **~181** | — | — | — | **19건 + ENH-290** | Breaking 0, 연속호환 75→81 |

### 2.2 릴리스별 핵심 변경 (HIGH 영향)

| 릴리스 | ID | 분류 | 설명 | E5 상태 | bkit ENH |
|---|---|:-:|---|---|---|
| v2.1.117 | F1-117 | F | `CLAUDE_CODE_FORK_SUBAGENT` env | CONFIRMED | ENH-254 P0 (zero-script-qa 가드) |
| v2.1.117 | F3-117 | F | Native build에서 Glob/Grep 제거 | CONFIRMED | ENH-256 P0 (전수 grep 재검증) |
| v2.1.117 | F6/B14-117 | F/B | Opus 4.7 `/context` 1M 기준 수정 | CONFIRMED | ENH-257 P1 (PreCompact 재평가) |
| v2.1.117 | B11-117 | B | Subagent malware 오탐 fix | CONFIRMED auto-benefit | ENH-260 P3 |
| v2.1.117 | B2-117 | B | WebFetch 대용량 HTML hang fix | CONFIRMED auto-benefit | ENH-261 P3 |
| v2.1.117 | #51798 | R | PreToolUse + dangerouslyDisableSandbox | CONFIRMED | ENH-262 P0 |
| v2.1.117 | #51801 | R | bypassPermissions + `.claude/` write | CONFIRMED | ENH-263 P0 |
| v2.1.117 | #51809 | R | Sonnet per-turn 6~8k overhead | CONFIRMED | ENH-264 P0 |
| v2.1.119 | F1-119 | F | `/config` UI persistence | CONFIRMED 무영향 | (ENH-281 REFUTED) |
| v2.1.119 | F5-119 | F | `--print` agent `tools:` 준수 | UNVERIFIED | (ENH-282 SPECULATIVE) |
| v2.1.120 | F9-120 | F | `claude plugin validate` 3 root field 허용 | **CONFIRMED 잠재해소** | **자동수혜 (직접 가치)** |
| v2.1.120 | B1-120 | B | stdio MCP Esc 회귀 fix | CONFIRMED auto-benefit | — |
| v2.1.120 | B12-120 | B | Bash `find` FD 고갈 host crash fix | CONFIRMED auto-benefit | — |
| v2.1.121 | B1-121 | B | multi-image multi-GB RSS 누수 fix | CONFIRMED auto-benefit | — |
| v2.1.121 | B2-121 | B | `/usage` ~2GB 누수 fix | CONFIRMED auto-benefit | — (kay 환경 24일+ 자동) |
| v2.1.121 | B4-121 | B | Bash dir delete/move fix | CONFIRMED auto-benefit | — (CTO Team `context: fork` 직접) |
| v2.1.121 | F11-121 | F | MCP retry 안정화 | CONFIRMED auto-benefit | — |
| v2.1.121 | I4-121 | I | OTEL 3 attributes (`stop_reason`/`finish_reasons`/`user_system_prompt`) | CONFIRMED + 확장 | ENH-281 누적 |
| v2.1.121 | F9-121 | F | `--dangerously-skip-permissions` `.claude/` 부분 완화 | CONFIRMED 무영향 | (Layer 분리 명시화) |
| **v2.1.122** | **F15-122** | **B** | **settings.json malformed hooks 격리** | **CONFIRMED auto-benefit** | **(Defense Layer 2 신뢰성 +1)** |
| v2.1.122 | F10-122 | B | ToolSearch nonblocking late-connect MCP | CONFIRMED auto-benefit | ENH-282 P1 격상 |
| v2.1.122 | F4-122 | F | OTEL `claude_code.at_mention` event | CONFIRMED + 확장 | ENH-281 누적 +1 |
| v2.1.122 | I2-122 | I | OTEL number attr 직렬화 | CONFIRMED auto-benefit | ENH-281 누적 +1 |
| v2.1.122 | F7-122 | B | Vertex/Bedrock output_config 400 fix | CONFIRMED 무영향 | (Anthropic API 직접) |
| **v2.1.123** | **F1-123** | **B** | **OAuth 401 retry loop fix** | **CONFIRMED 무영향** | (env 미설정) |

### 2.3 OPEN GitHub Issues 누적 추이

| Issue | v2.1.116 | v2.1.117 | v2.1.119 | v2.1.121 | v2.1.123 | bkit ENH |
|---|:-:|:-:|:-:|:-:|:-:|---|
| #47482 Output styles YAML | 8 | 9 | 13 | 15 | **17** | ENH-214 defense (양 채널 동일) |
| #47855 Opus 1M `/compact` (MON-CC-02) | 8 | 10 | 14 | 16 | **17** | MON-CC-02 defense (양 채널 동일) |
| #51798 PreToolUse + dangerouslyDisableSandbox | NEW | NEW | 4 | 6 | **8** | ENH-262 (양 채널) |
| #51801 bypassPermissions `.claude/` | NEW | NEW | 4 | 6 | **6** | ENH-263 (양 채널) |
| #51809 Sonnet per-turn overhead | NEW | NEW | 5 | 7 | **8** | ENH-264 (양 채널) |
| #54196 PostToolUse `updatedToolOutput` | — | — | — | — | **NEW OPEN** | ENH-283 (architectural strength) |
| #54360 Stop hook `stop_hook_active` loop | — | — | — | — | **NEW OPEN** | ENH-285 (양 채널) |
| #54375 Memory advisory only | — | — | — | — | **NEW OPEN** | **ENH-286 차별화** (양 채널) |
| #54393 12 multi-agent bugs | — | — | — | — | **NEW OPEN** | ENH-287 (양 채널) |
| #54508 /compact tasks 사라짐 | — | — | — | — | **NEW OPEN** | ENH-288 (latest only repro) |
| #54521 Codex plugin config/ deletion | — | — | — | — | **NEW OPEN** | ENH-284 (사전 방어) |
| **R-3 시리즈** | (미식별) | — | — | **8** | **42+** | **ENH-289 P0** (모델 행동 — 양 채널) |

**핵심 통찰**: OPEN issue 13건 중 **10건이 stable / latest 양 채널에 동일 영향** (모델 행동·hook 정책·CLAUDE.md 처리 등 채널 무관 영역). stable 운영자는 fix는 못 받지만 위험은 동일하게 노출 → bkit 자체 방어(Defense Layer 6)의 채널 독립적 가치 정당화.

---

## 3. bkit 컴포넌트별 누적 영향 매트릭스

### 3.1 bkit 핵심 파일 7-릴리스 누적 영향

| bkit 파일 / 디렉토리 | 누적 영향 항목 | 영향 유형 | stable 미수혜? | latest 수혜? | bkit ENH |
|---|---|---|:-:|:-:|---|
| `.claude-plugin/marketplace.json` | F9-120 / F9-121 closure | validation 자동해소 | ✅ | ✅ | (auto-benefit, ADR 0003) |
| `.claude-plugin/hooks.json` (24 blocks) | F15-122 fail-isolation | Defense Layer 2 신뢰성 +1 | ✅ | ✅ | (auto-benefit) |
| `.claude-plugin/plugin.json` (mcpServers 미선언) | F10-122 nonblocking + alwaysLoad 격상 | 16 MCP tools 자동수혜 | ✅ | ✅ | **ENH-282 P1** |
| `lib/infra/telemetry.js:147-179` | F8-119 + I6-119 + I4-121 + F4-122 + I2-122 | OTEL 5건 누적 묶음 | ✅ | ✅ | **ENH-281 P1 (Sprint δ FR-δ4)** |
| `lib/audit/audit-logger.js:99-189 sanitizeDetails` | #54196 무영향 확정 | architectural strength (8 patterns + 500-char cap) | — | — | ENH-283 P2 (doc) |
| `scripts/unified-stop.js:241-732` | #54360 dedup 가드 부재 | 무한 loop 가능성 (양 채널) | ⚠️ | ⚠️ | **ENH-285 P1** |
| `scripts/context-compaction.js:44-56` | #47855 + #54508 | MON-CC-02 도메인 확장 (17 릴리스 OPEN) | ⚠️ | ⚠️ | ENH-288 P2 |
| `agents/cto-lead.md` + `lib/orchestrator/` 5 modules | #54393 4건 직접 (#2/#3/#5/#10) | CTO Team Coordination | ⚠️ | ⚠️ | **ENH-287 P1** |
| `CLAUDE.md` + `.claude/agent-memory/` + `scripts/pre-write.js` | #54375 advisory only | bkit 차별화 (enforced 격상) | ⚠️ | ⚠️ | **ENH-286 P1 차별화** |
| `.bkit/state/` + `.bkit/runtime/` | #54521 Codex 패턴 (sentinel 부재) | 사전 방어 | ⚠️ | ⚠️ | ENH-284 P2 |
| `scripts/post-tool-use.js` + `lib/orchestrator/r3-detector.js` (신규) | R-3 시리즈 폭증 | Defense Layer 6 신규 도입 | ⚠️ | ⚠️ | **ENH-289 P0** |
| `bkit.config.json` + `docs/01-plan/` | dist-tag 정책 부재 | 운영 가이드 정식화 | — | — | **ENH-290 P3 (본 보고서 정식화)** |

**범례**: ✅ = 자동수혜 (latest 전용) / ⚠️ = 양 채널 동일 영향 / — = 무관

### 3.2 stable 채널 미수혜 갭 분석 (latest only 자동수혜)

stable v2.1.116 운영자가 latest 승격 시 즉시 얻는 가치:

| 자동수혜 | 직접 가치 | production 영향도 |
|---|---|---|
| **F15-122** hooks.json fail-isolation | bkit Defense Layer 2 (24 blocks) malformed entry 격리 | **HIGH** (전체 hook chain 실패 방지) |
| **B2-121** `/usage` 2GB 누수 fix | 24일+ 장기 세션 메모리 안정성 | **HIGH** (kay 환경 직접 영향) |
| **B1-121** multi-image RSS 누수 fix | 이미지 다수 처리 안정성 | MEDIUM |
| **B4-121** Bash worktree dir delete fix | CTO Team `context: fork` 직접 영향 | **HIGH** (CTO Team 사용 시) |
| **F10-122** ToolSearch nonblocking | 16 MCP tools 누락 방지 | MEDIUM |
| **F11-121** MCP retry 안정화 | 일시 네트워크 장애 복구 | MEDIUM |
| **F9-120** marketplace.json validation | bkit 잠재 결함 자동해소 (사전 미인지) | MEDIUM (validate 실행 시 발견) |
| **F1-123** OAuth 401 retry loop fix | OAuth 환경 직접 영향 | env 미설정 시 N/A |
| **B12-120** Bash `find` FD 고갈 fix | host crash 방지 | MEDIUM |
| **B19-121** Bash find FD 후속 | (B12-120 후속) | LOW |

**누적 가치 추정**: latest 승격 시 **HIGH 영향 4건 + MEDIUM 영향 5건 + LOW 영향 1건 자동수혜**. stable 유지 정당화는 **regression risk 0%** + **검증 비용 0** 두 가지뿐.

### 3.3 양 채널 공통 영향 (channel-agnostic)

| 항목 | 영향 본질 | bkit 대응 |
|---|---|---|
| #47482 Output styles YAML frontmatter | output style 정의 영역 (CC core 기능) | ENH-214 defense — 양 채널 동일 |
| #47855 Opus 1M `/compact` block (MON-CC-02) | `/compact` 명령 내부 (CC core) | MON-CC-02 defense — 양 채널 동일 |
| #54360 Stop hook `stop_hook_active` loop | Stop hook lifecycle 영역 | ENH-285 dedup 가드 — 양 채널 동일 |
| #54375 Memory advisory only | CC 모델 학습 vs CLAUDE.md 우선순위 | ENH-286 enforced 격상 — 양 채널 동일 |
| #54393 12 multi-agent bugs | Task spawn coordination | ENH-287 — 양 채널 부분 동일 |
| **R-3 시리즈 (42+건)** | **모델 학습 동작 (Anthropic 통제 영역)** | **ENH-289 Defense Layer 6 — 양 채널 동일** |

**핵심**: 6 항목 모두 stable / latest 모두에 동일하게 영향 → bkit 자체 방어(Defense Layer 5/6)는 **CC 채널 선택과 독립적인 product moat** 역할.

---

## 4. ENH-290 dist-tag 운영 가이드 정식화 (Plan Plus 결과)

### 4.1 의도 탐색 (Phase 3.1)

**Q1**: 7-릴리스 갭 분석에서 bkit이 얻을 수 있는 최대 가치는?
**A1**: stable / latest / next 3-Bucket을 환경별로 명시적으로 분리하여 운영하는 정책. 현재 bkit은 단일 권장값(latest=v2.1.123)만 제시하지만, **production 장기 운영 + 일반 개발 + 메인테이너** 3가지 환경의 위험 허용도가 다르므로 분리 권장이 필요.

**Q2**: 놓치면 안 되는 critical change는?
**A2**: 단일 channel 정책의 부작용 — 만약 다음 CC 릴리스에 false alarm이 재발생할 경우 latest 단일 권장은 **production 환경에 즉시 노이즈를 전파**한다. 3-Bucket이 있으면 production은 stable 유지로 차단 가능.

**Q3**: 기존 workaround를 대체할 수 있는 native 기능은?
**A3**: 없음. `bkit.config.json`에 `recommended_cc_versions: { stable, latest, next }` 필드 신설 + SessionStart hook이 사용자 환경 유형 감지 후 권장값 표시. CC 자체에는 dist-tag 권장 메커니즘 없음.

### 4.2 대안 탐색 (Phase 3.2)

| 대안 | 구현 비용 | 유지 비용 | 장점 | 단점 |
|---|---|---|---|---|
| **A. 단일 권장값 유지 (현재)** | 0 | 0 | 단순함 | production 환경 위험 노출, stable 운영자 자체 보완 부담 |
| **B. 단순 stable+latest 2-Bucket** | LOW (config 1 field) | LOW | 95% 사용자 커버 | next 채널 메인테이너 부재 → 사전 대응 ENH 도출 luck-based |
| **C. 3-Bucket (본 보고서 권장)** | MEDIUM (config 3 fields + SessionStart 환경 감지) | MEDIUM (3 채널 추적) | 위험 허용도별 정밀 분리, 메인테이너 사전 대응 입력 | docs/01-plan/ + scripts/ 추가 |
| **D. 환경 변수 기반 동적 (`BKIT_CC_CHANNEL`)** | HIGH (CI/CD 통합) | HIGH | 자동화 | 학습 비용 |

**선택**: **C. 3-Bucket** — production 운영 위험 차단 가치가 MEDIUM 비용 정당화. D는 v2.1.14+ 후속.

### 4.3 YAGNI 검토 (Phase 3.3)

| 검토 항목 | 결과 | 근거 |
|---|---|---|
| 현재 사용자가 실제로 필요로 하는가? | ✅ PASS | kay 환경 24일+ 장기 세션 + production 사용자 5+ → 3-Bucket 직접 가치 |
| 구현하지 않으면 어떤 문제가 발생하는가? | ✅ PASS | 다음 false alarm 재발 시 production 환경 즉시 노이즈 전파, 환경별 권고 부재로 사용자 자체 판단 부담 |
| 다음 CC 버전에서 더 나은 방법이 나올 가능성은? | ✅ PASS | CC 자체는 npm dist-tag 외 정책 메커니즘 없음, 향후 발전 가능성 LOW (Anthropic 정책 영역) |
| YAGNI FAIL 가능성? | ❌ NO FAIL | 3개 환경 모두 실측 사용자 존재 (production / 개발자 / 메인테이너) |

**결정**: **PASS — P3로 v2.1.13 sprint 후보 유지** (구현 우선순위는 ENH-289 P0 / ENH-281~287 P1 이후).

### 4.4 ENH-290 정식 권고서

```yaml
ENH-290 [P3] dist-tag 운영 가이드 정식화 (3-Bucket Decision Framework)
  Source: 본 메타 분석 (v2.1.116 → v2.1.123 7-릴리스 갭)
  Discovery: npm dist-tags { stable: '2.1.116', next: '2.1.124', latest: '2.1.123' } — 7-릴리스 분리 운영 발견
  Hypothesis:
    - production 운영자, 개발자, 메인테이너의 위험 허용도가 다르므로 단일 권장값은 부적합
    - 다음 false alarm 사이클 재발 시 production 환경 즉시 노이즈 전파 위험
  Implementation:
    1. bkit.config.json 확장:
       recommended_cc_versions:
         stable: "2.1.116"   # production 장기 운영
         latest: "2.1.123"   # 일반 개발자 (95%)
         next:   "2.1.124"   # bkit 메인테이너
       channel_recommendation:
         default: "latest"
         long_term_production: "stable"
         maintainer: "next"
    2. SessionStart hook 확장:
       - 환경 유형 감지 (.bkit/runtime/env-profile.json)
       - 권장 채널 표시 + 현재 채널 미스매치 시 경고
    3. docs/01-plan/cc-channel-policy.plan.md (신설):
       - 3-Bucket 의사결정 가이드
       - 환경별 권장값 + 보완 패치 매트릭스 (stable 미수혜 17건 보완 옵션)
       - 채널 전환 절차 (npm install -g @anthropic-ai/claude-code@<channel>)
  Files:
    - bkit.config.json (확장 +2 필드)
    - hooks/session-start.js (~20 LOC, 환경 감지 + 권장 표시)
    - docs/01-plan/cc-channel-policy.plan.md (신설, ~150 LOC)
    - .bkit/runtime/env-profile.json (신설 schema)
  Tests:
    - tests/qa/dist-tag-policy.test.js (L1, channel 매칭 검증)
    - tests/qa/session-start-channel-warning.test.js (L2, 미스매치 경고 검증)
  Estimate:
    - 구현: 4시간 (config + hook + plan doc)
    - 테스트: 2시간 (L1 + L2)
    - 검토: 1시간 (gap-detector + 사용자 검토)
  Sprint: v2.1.13 후순위 (P3, ENH-289/281~287 이후 진입)
  Status: deferred (본 보고서에서 정식화, 사용자 결정 2026-04-29 v2.1.13 sprint 진입 시 재평가)
```

---

## 5. v2.1.13 Sprint 진입 시 ENH 우선순위 재조정

### 5.1 누적 ENH 백로그 (37건)

본 메타 분석 시점 누적 ENH 후보 = **37건**:

| 출처 | ENH | 우선순위 | 상태 |
|---|---|:-:|---|
| v2.1.117 | ENH-254~264 (11건) | P0×4 / P1×3 / P2×1 / P3×3 | v2.1.10에서 일부 closed, 잔존 carryover 유지 |
| v2.1.121 (CAND) | ENH-281~287 carry-in (CAND-003~007) | P1×1 / P2×3 / P3×1 | v2.1.13 후보 |
| **v2.1.122/123** | **ENH-281~289 (9건)** | **P0×1 / P1×5 / P2×3** | **본 보고서 SSoT** |
| **본 보고서** | **ENH-290 (1건)** | **P3** | **신규 정식화** |
| v2.1.12 hotfix | CARRY-1~12 (12건) | P0×1 / P1×1 / P2×3 / P3×7 | 후속 발견 |
| deep-functional QA | #1~#23 (23건 결함) | P0×2 / CRITICAL×3 / IMPORTANT×9 / P2×1 / P3×8 | v2.1.13 1순위 |

### 5.2 v2.1.13 1순위 P0 묶음 (재조정)

| ENH/Defect | 출처 | 1순위 정당화 |
|---|---|---|
| **ENH-289 P0** Defense Layer 6 (R-3 응답) | v2.1.122/123 | R-3 8→42+ 폭증, 2주 추세 +24건 = 66+ 누적 예상, **bkit 차별화** |
| **#17 P0** token-meter Adapter (CARRY-5 root cause) | deep-qa | 472/472 zero entries, telemetry 신뢰성 근본 결함 |
| **#21 P0** intent-router 다국어 trigger | deep-qa | bkit "8-language" 마케팅 모순 직접 영향 |
| **#1+#11 CRITICAL** control-state.json 자기모순 | deep-qa | level/levelCode/currentLevel 비대칭 |
| **#12 CRITICAL** verifyCheckpoint 항상 false | deep-qa | rollback 신뢰성 결함 |
| **#14 CRITICAL** error-log.json 모든 entry unknown | deep-qa | logger context 캡처 실패 |

**v2.1.13 Sprint A (Observability)**: token-meter 재작성 (#17) + error-log enrich (#14) + telemetry SoT (#2)
**v2.1.13 Sprint B (Reliability)**: control-state SoT 통일 (#1/#11) + checkpoint hash 정합 (#12) + state-machine API 통일 (#13)
**v2.1.13 Sprint D (Multilingual)**: intent-router 다국어 normalize (#21)
**v2.1.13 Sprint R-3 (NEW 최우선 Defense)**: ENH-289 Layer 6 + R-3 monitor

### 5.3 v2.1.13 2순위 P1 묶음

| ENH | 출처 | Sprint |
|---|---|---|
| ENH-281 OTEL 5건 누적 (F4-122 + I2-122 + I4-121 + F8-119 + I6-119) | v2.1.122/123 | A (Observability 통합) |
| ENH-282 alwaysLoad 1주 측정 | v2.1.122 | MCP-1 |
| ENH-285 Stop dedup 가드 (#54360) | v2.1.122/123 | C (Lifecycle) |
| **ENH-286 Memory Enforcer (#54375)** | v2.1.122/123 | **E (Defense Layer 5 확장 — 차별화)** |
| **ENH-287 CTO Team Coordination (#54393)** | v2.1.122/123 | **Coordination 신규** |
| ENH-279 Release Automation | v2.1.118 | (carry-in) |
| ENH-280 Agent-Hook 다중이벤트 | v2.1.118 | (carry-in) |

### 5.4 v2.1.13 3순위 P2/P3 묶음

| ENH | Sprint |
|---|---|
| ENH-283 Architectural decision 문서화 (#54196) | F (Architecture cleanup) |
| ENH-284 .bkit/ sentinel (#54521) | E (Defense) |
| ENH-288 /compact 도메인 모니터 확장 | F |
| **ENH-290 dist-tag 운영 가이드 (3-Bucket)** | **F (Architecture cleanup)** |
| CARRY-7 LLM-based parity test | (deferred) |

---

## 6. ADR 0003 3-사이클 일관성 결산

본 메타 분석은 ADR 0003 (Empirical Validation) 적용 사이클을 통합 검증:

| 사이클 | 릴리스 | E1 시나리오 | E2 실행 | E5 결과 | 가치 |
|:-:|---|:-:|:-:|---|---|
| **1차** | v2.1.120 | 6 항목 | 1 실행 (`plugin validate`) | 잠재 결함 발견 (F9-120) | "신규 결함 발견 도구" 입증 |
| **2차** | v2.1.121 | 7 항목 | 2 실행 | F9-120 closure 2-릴리스 연속 | "fix 안정화 입증" 추가 |
| **3차** | v2.1.122/123 | 13 항목 | 5 실행 | #54196 무영향 (architectural strength) + R-3 P0 격상 | "architectural strength 발굴 + 시리즈 monitor 격상" 추가 |

**3-사이클 누적 가치**:
- **False alarm 차단**: 3 사이클 0건 (v2.1.119 초판 REFUTED 사례 학습 후 적용 완료)
- **잠재 결함 발견**: 1건 (F9-120, ADR 0003 1차)
- **Architectural strength 입증**: 1건 (#54196 audit-logger sanitize, ADR 0003 3차)
- **시리즈 monitor 격상**: 1건 (R-3, ADR 0003 3차)
- **Sprint 가속**: OTEL 5건 누적 묶음, dist-tag 정책 정식화

**ADR 0003 검증 score**: **3/3 PASS** — v2.1.13 Sprint 진입 후에도 본 워크플로우 유지 권고.

---

## 7. Quality Checklist

| 항목 | 상태 | 비고 |
|---|:-:|---|
| 7 릴리스 모든 변경 capture | ✅ | 5개 단계별 보고서 통합 |
| 모든 변경에 영향 분류 (HIGH/MEDIUM/LOW) | ✅ | §2.2 매트릭스 |
| 모든 ENH에 우선순위 (P0/P1/P2/P3) | ✅ | §5 재조정 표 |
| 모든 ENH 철학 준수 검토 (Automation First / No Guessing / Docs=Code) | ✅ | ENH-290 §4.3 YAGNI 4 항목 PASS |
| 파일 영향 매트릭스 완전성 | ✅ | §3.1 12 컴포넌트 |
| ENH별 테스트 영향 평가 | ✅ | ENH-290 §4.4 L1+L2 명시 |
| 한국어 작성 | ✅ | 본 보고서 전체 |
| MEMORY.md 갱신 | 🔜 | Phase 4 진행 중 |
| Task tracking 완료 | 🔜 | Phase 4 진행 중 |
| Executive Summary 4-perspective | ✅ | §1.3 |

---

## 8. 권고 행동 (Recommendation)

### 8.1 즉시 적용 (No Code Change)

1. **운영 환경 분류**: production 사용자에게는 stable v2.1.116 유지 권고, 개발자에게는 latest v2.1.123 권고. 환경 매트릭스 §1.4 직접 사용.
2. **kay 환경 latest 유지**: B2-121 `/usage` 2GB 누수 fix + B4-121 worktree fix 등 고가치 자동수혜 활성 유지. 본 보고서 시점 이미 v2.1.123 사용 중.
3. **MEMORY.md 본 메타 보고서 인덱스 추가**: 미래 세션의 단일 진입점.

### 8.2 v2.1.13 Sprint 진입 시 (Code Change)

1. **Sprint R-3 (NEW 최우선)**: ENH-289 Defense Layer 6 (P0)
2. **Sprint A (Observability)**: token-meter Adapter 재작성 (#17 P0) + error-log enrich (#14 CRITICAL) + ENH-281 OTEL 5건 누적 (P1)
3. **Sprint D (Multilingual)**: intent-router 다국어 normalize (#21 P0)
4. **Sprint B (Reliability)**: control-state SoT 통일 (#1/#11) + checkpoint hash (#12)
5. **Sprint E (Defense)**: ENH-286 Memory Enforcer (P1 차별화) + ENH-284 sentinel (P2)
6. **Sprint Coordination (NEW)**: ENH-287 CTO Team (P1)
7. **Sprint F (Architecture)**: ENH-283 doc + ENH-288 /compact monitor + **ENH-290 dist-tag 가이드 정식 구현 (P3)**
8. **Sprint MCP-1**: ENH-282 alwaysLoad 1주 측정

### 8.3 본 hotfix 브랜치 (v2.1.12)

코드 변경 없음 (분석 전용). v2.1.12 cleanliness 유지 (사용자 결정 2026-04-29 동일 적용).

---

## 9. 메모리 인덱스 갱신 권고

MEMORY.md `## Memory Index` 섹션에 다음 항목 추가:

```markdown
- [CC v2.1.116→v2.1.123 stable→latest Gap Analysis](../../docs/04-report/features/cc-v2116-v2123-stable-latest-gap-analysis.report.md) — 7-릴리스 갭 메타 분석 + 3-Bucket Decision Framework + ENH-290 정식화 (2026-04-30)
```

및 `## ENH Backlog` 섹션에 ENH-290 항목 추가:
```markdown
- **ENH-290 P3 deferred** (본 메타 분석 정식화) dist-tag 3-Bucket Decision Framework — production stable / 개발자 latest / 메인테이너 next 채널 분리 운영 정책. bkit.config.json `recommended_cc_versions` 확장 + SessionStart 환경 감지 + docs/01-plan/cc-channel-policy.plan.md.
```

---

**보고서 종료**.

> 본 보고서는 분석 전용입니다. 코드/설정 변경 없음. ENH 구현은 v2.1.13 sprint 진입 시점에 사용자 명시 승인 후 수행합니다.
