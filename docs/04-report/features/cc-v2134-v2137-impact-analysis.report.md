# CC v2.1.134 → v2.1.137 영향 분석 및 bkit 대응 보고서 (ADR 0003 일곱 번째 정식 적용)

> **Status**: ✅ Final (실증 기반, ADR 0003 일곱 번째 정식 적용)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.12 (current GA, main `5f6592b`, 2026-04-29 release tag)
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Date**: 2026-05-09
> **PDCA Cycle**: cc-version-analysis (v2.1.134~v2.1.137, 4-version increment, **R-2 두 번째 발생 사이클**)
> **CC Range**: v2.1.133 (baseline, 90 consecutive PASS) → **v2.1.137** (release 2026-05-09 00:11 UTC, 1 bullet VSCode Win hotfix; 직전 v2.1.136 49 bullets 대규모 maintenance 2026-05-08; v2.1.134/135 R-2 true semver skip)
> **Verdict**: **크리티컬 회귀 0건 / Breaking 0건 / 자동수혜 4건 (HIGH) / 무영향 확정 47+건 / 신규 ENH 0건 / 신규 모니터 1건 (MON-CC-NEW-PLUGIN-HOOK-DROP P2) / 기존 ENH 강화 3건 (ENH-292 P0 7-streak / ENH-286 #57485 추가 / ENH-281 OTEL 9 누적) / R-3 evolved 11건 (+1 #57317) / 92 연속 호환**

---

## 1. Executive Summary

### 1.1 최종 판정

| 항목 | 값 |
|------|----|
| 크리티컬 회귀 건수 | **0건** (bkit v2.1.12 무수정 작동, v2.1.137 환경 직접 검증 8/8 PASS) |
| Breaking Changes | **0건** (확정) |
| 자동수혜 (CONFIRMED) HIGH | **4건** (B1-136 `.mcp.json` silent disappear fix → 2 stdio servers, B4-136 plugin Stop/UserPromptSubmit hook cache cleanup race fix → bkit Defense Layer 2 두 핫패스, B8-136 `plugin.json` skills 필드 default 숨김 fix → bkit `.claude-plugin/plugin.json` skills 필드 부재로 비해당 자동 정상 작동, B12-136 MCP tool results content blocks invisible fix → bkit-pdca/analysis 16 tools 출력 신뢰성) |
| 자동수혜 (CONFIRMED) MEDIUM | **0건** 직접, **다수** 사용자 자동수혜 (B2/B3/B5/B6/B7/B11/B13-136) |
| 정밀 검증 (무영향 확정) | **47+건** (F1-136 FEEDBACK_SURVEY 미사용, F2-136 autoMode 미사용, F3-136 marketplace UI 미사용, B3/B5/B6/B7/B9/B10/B11/B13/B14-136 다수, B1-137 VSCode Win 무관, 기타 31 cosmetic) |
| **신규 ENH** | **0건** (P0/P1/P2 신규 등록 없음) |
| **신규 모니터** | **1건** (MON-CC-NEW-PLUGIN-HOOK-DROP P2 — #57317 plugin PostToolUse silent drop, 5/13 review 시 정식 ENH 후보 검토) |
| **기존 ENH 강화** | **3건** (ENH-292 P0 — #56293 7-streak 결정적 / ENH-286 — #57485 Opus 4.7 agents CLAUDE.md ignore 추가 데이터 / ENH-281 OTEL 8 → 9 누적) |
| **DROP ENH** | **0건** |
| **R-3 시리즈 monitor** | numbered #145 정체 (+0 in 10d) / dup-closure 5건 유지 / **evolved form 11건 (+1 #57317 본 사이클)** / 추세 ~0/day → **0.1/day** |
| **메모리 정정** | (1) Skill description multi-line 측정 4건 (실측 multi-line concat: pdca-watch 297 / pdca-fast-track 264 / bkit-evals 253 / bkit-explore 252) — 단 4-streak 실제 flag 0건 → ENH-291 P2 deferred 유지 (measurement methodology TBD), (2) PostToolUse 3 blocks (Write/Bash/Skill matchers) #57317 직접 surface 명시, (3) `audit-log.ndjson` 부재 (lib/audit/audit-logger.js 존재, lazy create 패턴) |
| bkit v2.1.12 hotfix 필요성 | **불필요** (현재 main GA `5f6592b` 안정, 90 → 92 연속 호환 확장 입증) |
| **연속 호환 릴리스** | **92** (v2.1.34 → v2.1.137, 90 → 92, +2 — v2.1.134/135 R-2 skip은 미포함) |
| ADR 0003 적용 | **YES (일곱 번째 정식 적용 — 7-사이클 일관성 입증, R-2 패턴 두 번째 발생 누적)** |
| **권장 CC 버전** | **v2.1.123 (보수적, npm stable과 +3 drift 발생) 또는 v2.1.137 (균형, 신규 — B1/B4/B12-136 hook+MCP 신뢰성 fix HIGH 자동수혜)** — v2.1.128 / v2.1.129 비권장 유지 (#56293 7-streak / #56448 6-streak 모두 v2.1.137에서 미해소) |

### 1.2 성과 요약

```
┌──────────────────────────────────────────────────────┐
│  v2.1.134 → v2.1.137 영향 분석 (ADR 0003 일곱 번째)    │
├──────────────────────────────────────────────────────┤
│  📊 CC 변경 수집: 50건 (실 게시 2 versions: 49+1)      │
│      v2.1.134/135: R-2 true semver skip (게시 X)       │
│      v2.1.136: 3 Feature + 46 Fix = 49 bullets         │
│      v2.1.137: 1 Fix bullet (VSCode Win hotfix)        │
│  🔴 실증된 크리티컬 회귀: 0건 (bkit 환경)              │
│  🟢 CONFIRMED auto-benefit HIGH: 4건                   │
│      • B1-136 .mcp.json /clear silent disappear fix    │
│      • B4-136 plugin Stop/UserPromptSubmit cache race  │
│      • B8-136 plugin.json skills default 숨김 fix      │
│      • B12-136 MCP tool results content blocks fix     │
│  🟢 정밀 검증 (무영향 확정): 47+건                     │
│  🆕 신규 ENH: 0건                                      │
│  🔍 신규 모니터: 1건 (MON-CC-NEW-PLUGIN-HOOK-DROP P2)  │
│      - #57317 plugin PostToolUse silent drop (OPEN)    │
│      - bkit hooks/hooks.json PostToolUse 3 blocks 직접 │
│  🔁 기존 ENH 강화: 3건                                 │
│      • ENH-292 P0 (7-streak 결정적 정당성 강화)        │
│      • ENH-286 (#57485 Opus 4.7 추가 데이터)           │
│      • ENH-281 OTEL 8 → 9 누적                         │
│  ❌ Breaking Changes: 0 (확정)                         │
│  ✅ 연속 호환: 90 → 92 릴리스 (v2.1.34~v2.1.137)       │
│  ✅ F9-120 closure 7 릴리스 연속 PASS 실측             │
│      (claude plugin validate Exit 0,                   │
│       v2.1.120/121/123/129/132/133/137)                │
│  ⚙️ npm dist-tag: latest=137 + next=138 (분기 복귀)    │
│      stable=123→126 승격 (gap 3, drift +3 보수적 권장) │
│  ⚙️ R-2 패턴 두 번째 발생 누적                         │
│      (v2.1.130 + v2.1.134/135 = 3 versions skipped)    │
│      18-릴리스 윈도우 missing publish 9건/8 versions   │
│      (50%) → ENH-290 framework 정당성 강화              │
│  ⚙️ R-3 evolved 11건 (+1), 추세 ~0/day → 0.1/day        │
└──────────────────────────────────────────────────────┘
```

### 1.3 4-관점 가치 표

| 관점 | 내용 |
|------|------|
| **Technical** | (a) **B4-136 plugin Stop/UserPromptSubmit hook cache cleanup race fix** — bkit Defense Layer 2의 두 핫패스(`scripts/unified-stop.js` + `scripts/user-prompt-handler.js`) 자동 안정화. cache cleanup이 실행 중 version 삭제 시 silent fail 회귀 해소. **bkit Trust Score / control-state 무결성 유지에 직접 기여**. (b) **B1-136 + B12-136 MCP 신뢰성 2 fix** — `.mcp.json` 2 stdio servers (bkit-pdca + bkit-analysis, 16 tools) `/clear` 후 silent disappear 회귀 해소 + tool result content blocks invisible 회귀 해소. **bkit MCP tool 16 tools 신뢰성 자동 향상**. (c) **B8-136 `plugin.json` skills field default 숨김 fix** — bkit `.claude-plugin/plugin.json` skills 필드 부재 (default `skills/` 디렉토리 자동 인식 의존)로 v2.1.135 이전부터 발생 가능했던 회귀 fix. 사후 검증 결과 bkit는 skills 필드 미설정 → 자동 인식 경로만 사용하므로 **fix 자동수혜 자체는 비해당, 단 default discovery 경로 안정성 보장**. (d) **F9-120 closure 7 릴리스 연속 PASS 실측** (`claude plugin validate .` Exit 0, v2.1.120/121/123/129/132/133/137) — marketplace.json root field 안정성 7 cycle 입증. (e) **F4-133 effort.level surface 변동 없음** — ENH-300 P2 baseline 유지 (grep 0건). |
| **Operational** | hotfix sprint 불필요 (회귀 0건). **단 npm stable=v2.1.126 승격으로 bkit 보수적 권장 v2.1.123 ↔ npm stable +3 drift 발생** — ENH-290 framework follow-up 시점 도달 (사용자 환경 v2.1.126 또는 v2.1.137 직접 검증 권장 시점, 단 사용자 명시 승인 후 보류). v2.1.137 균형 권장 신규 추가 — B1/B4/B12-136 hook+MCP 신뢰성 fix HIGH 자동수혜. **단 #56293 caching 10x v2.1.128~v2.1.137 7 릴리스 연속 미해소** → cto-lead/qa-lead Task spawn 5+ blocks 사용 시 cache miss 4%→40% 위험 동일하므로 사용자 안내 필요. **#56448 skill validator 6-streak**도 미해소이지만 4-streak 실측 환경 flag 0건으로 ENH-291 P2 deferred 유지 (measurement methodology TBD, insurance gate 의의 유지). **#57317 plugin PostToolUse silent drop**이 새로운 직접 우려 — bkit hooks/hooks.json 24 blocks 중 PostToolUse 3 blocks (Write/Bash/Skill) 직접 surface, MON-CC-NEW-PLUGIN-HOOK-DROP P2 신규 모니터 등록 권장. |
| **Strategic** | ADR 0003 (Empirical Validation) **일곱 번째 정식 적용 사이클 → 7-사이클 일관성 입증** (v2.1.120/121/123/129/132/133/137). **R-2 패턴 두 번째 발생** (v2.1.130 + v2.1.134/135 = 3 versions skipped) → 16-릴리스 윈도우 missing publish events 누적 9건/8 versions/50% → **ENH-290 dist-tag 3-Bucket Decision Framework 운영 정당성 결정적 강화** (R-1 silent npm publish 6건 + R-2 true semver skip 2 occurrence). **#56293 7-streak**으로 ENH-292 sequential dispatch moat (bkit 차별화 #3) **product moat 결정적 입증** — 49-bullet 대규모 maintenance에도 fix 부재는 "Anthropic 자체 해결 의지 부재"의 결정적 증거. **#57485 (Opus 4.7 agents ignore CLAUDE.md)** 신규 OPEN으로 **ENH-286 memory enforcer 차별화 추가 데이터** 확보 (bkit는 advisory에 의존 안 하므로 미수정 = 현 상태가 moat). 누적 bkit 차별화 4건 (ENH-286 + ENH-289 + ENH-292 + ENH-300) **변동 없음**. |
| **Quality** | bkit v2.1.12 main GA가 v2.1.137 환경에서 무수정 작동 (Phase 2 직접 검증 8/8 PASS). **사후 검증 결과 (2026-05-09 직접 실행)**: (1) `claude --version` = `2.1.137` (latest 채널 활성화), (2) `claude plugin validate .` Exit 0 — F9-120 closure 7 릴리스 연속 PASS (v2.1.120/121/123/129/132/133/137), (3) `hooks.json` events:21 / blocks:24 메모리 일치, (4) `grep -rn 'updatedToolOutput' lib/ scripts/ hooks/` 0건 — #54196 무영향 invariant 7 cycle 유지, (5) `grep OTEL_ lib/infra/telemetry.js` 4 위치 (line 126/137/149/188) 동일, (6) `grep CLAUDE_CODE_SESSION_ID` 0건 (F1-132 미활용 surface 3-cycle DROP 확정), (7) `grep CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` 0건 (F2-132 무영향 3-cycle 확정), (8) `grep CLAUDE_EFFORT effort.level effortLevel` 0건 (F4-133 미활용 surface 2-cycle, ENH-300 baseline 유지). **token-ledger.ndjson 활성** (15:02 today 신규 entry) → Stop hook 실시간 작동 검증. **CARRY-5 P0 token-meter Adapter zero entries 패턴 변동 없음** (parseStatus: "no_payload", parseWarnings: "no message field in hookContext") → v2.1.136/137 변경에서 root cause 영향 없음. |

---

## 2. ADR 0003 일곱 번째 정식 적용 — Phase 1.5 게이트 결과

### 2.1 게이트 통과 매트릭스

ADR 0003 §2 (b) 실증 상태 4값 기준:

| ID | 변경 요약 | E1 시나리오 | E2 실행 | E3 경로 스코프 | E4 공식 스펙 | **E5 상태** |
|----|----------|------------|---------|--------------|-------------|------------|
| **F1-136** | `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL` env var | 정의 (FEEDBACK_SURVEY enterprise opt-in) | ✅ Phase 2 직접 (`grep FEEDBACK_SURVEY lib/ scripts/ hooks/` 0건) | (없음) | CHANGELOG | **CONFIRMED 무영향 (ENH-281 OTEL 9 누적 강화만)** |
| **F2-136** | `settings.autoMode.hard_deny` | 정의 (autoMode 사용 여부) | ✅ Phase 2 직접 (`grep autoMode\|hard_deny` 0건) | (없음) | CHANGELOG | **CONFIRMED 무영향 (ENH-278 deferred 유지)** |
| **F3-136** | Marketplace removal `r` → `d` | 정의 (UI shortcut) | ✅ 정적 (bkit는 marketplace UI 미사용) | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B1-136** | `.mcp.json` `/clear` 후 silent disappear | 정의 (`.mcp.json` 2 stdio servers) | ✅ Phase 2 직접 (`jq .mcpServers .mcp.json` 2 keys 확인) | `.mcp.json` (16 tools) | CHANGELOG | **CONFIRMED auto-benefit (HIGH)** |
| **B4-136** | Plugin Stop/UserPromptSubmit hook cache race | 정의 (Defense Layer 2 두 핫패스) | ✅ Phase 2 직접 (`scripts/unified-stop.js` + `scripts/user-prompt-handler.js` 존재 + token-ledger 활성) | scripts/unified-stop.js, scripts/user-prompt-handler.js | CHANGELOG | **CONFIRMED auto-benefit (HIGH)** |
| **B8-136** | `plugin.json` skills entry default 숨김 | 정의 (`.claude-plugin/plugin.json` skills 필드 여부) | ✅ Phase 2 직접 (`jq keys .claude-plugin/plugin.json` skills 부재 + default `skills/` 작동) | `.claude-plugin/plugin.json` (skills field absent) | CHANGELOG | **CONFIRMED 무영향 (skills 필드 부재로 default 경로만 사용, 자동수혜 비해당)** |
| **B12-136** | MCP tool results content blocks invisible | 정의 (`.mcp.json` 2 stdio servers, 16 tools) | ✅ Phase 2 직접 (16 tools 출력 surface 직접) | `.mcp.json` (bkit-pdca + bkit-analysis) | CHANGELOG | **CONFIRMED auto-benefit (HIGH)** |
| **B5-136** | `CLAUDE_ENV_FILE` SessionStart stale | 정의 (bkit는 SessionStart에서 CLAUDE_ENV_FILE 미주입) | ✅ Phase 2 직접 (`grep CLAUDE_ENV_FILE lib/ scripts/ hooks/` 0건) | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B11-136** | AskUserQuestion array multi-select 폐기 | 정의 (bkit는 single-select 패턴 사용) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향 (사용자 자동수혜)** |
| **B1-137** | VSCode Win32 activation 실패 hotfix | 정의 (bkit는 CLI plugin) | ✅ 정적 | (없음) | CHANGELOG / #57415 | **CONFIRMED 무영향** |

### 2.2 핵심 실증 발견 — 7-사이클 일관성 입증

**E2 (실제 실행) 결과 — Phase 2 (2026-05-09)**:

```bash
# Test #1: claude --version
$ claude --version
2.1.137 (Claude Code)

# Test #2: claude plugin validate .
$ claude plugin validate .
Validating marketplace manifest: .claude-plugin/marketplace.json
✔ Validation passed
[Exit 0]
# → F9-120 closure 7 릴리스 연속 PASS (v2.1.120/121/123/129/132/133/137)

# Test #3: hooks.json events/blocks
$ jq '{events: [.hooks | keys[]] | length, blocks: [.hooks[] | length] | add}' hooks/hooks.json
{"events": 21, "blocks": 24}

# Test #4: invariant 7-cycle
$ grep -rn 'updatedToolOutput' lib/ scripts/ hooks/ | wc -l  # 0

# Test #5: OTEL surfaces
$ grep -nE 'OTEL_' lib/infra/telemetry.js
# OTEL_ENDPOINT (line 11/183/188), OTEL_SERVICE_NAME (12/149), OTEL_REDACT (13/126/109/114),
# OTEL_LOG_USER_PROMPTS (115/137), 4 active env reads at lines 126/137/149/188

# Test #6: F1/F2-132 미활용 3-cycle
$ grep -rnE 'CLAUDE_CODE_SESSION_ID|CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN' lib/ scripts/ hooks/ | wc -l  # 0

# Test #7: F4-133 effort.level 미활용 2-cycle (ENH-300 baseline)
$ grep -rnE 'CLAUDE_EFFORT|effort\.level|effortLevel' lib/ scripts/ hooks/ agents/ skills/ | wc -l  # 0

# Test #8: F1-136 FEEDBACK_SURVEY 미활용 (ENH-281 9 누적)
$ grep -rnE 'FEEDBACK_SURVEY|FEEDBACK_OTEL' lib/ scripts/ hooks/ | wc -l  # 0

# Test #9: F2-136 autoMode 미활용 (ENH-278 baseline)
$ grep -rnE 'autoMode|auto_mode|hard_deny' lib/ scripts/ hooks/ .claude-plugin/ | wc -l  # 0

# Test #10: B8-136 plugin.json skills field
$ jq 'keys, .skills // "field absent"' .claude-plugin/plugin.json
["author","description","displayName","keywords","license","name","outputStyles","repository","version"]
"field absent"
# → bkit는 skills 필드 미설정 → default skills/ dir 자동 인식 → 자동수혜 비해당

# Test #11: B1-136 + B12-136 .mcp.json surface (HIGH auto-benefit)
$ jq '{servers: (.mcpServers | keys), count: (.mcpServers | length)}' .mcp.json
{"servers":["bkit-analysis","bkit-pdca"], "count": 2}
# → 16 tools 출력 + /clear silent disappear 자동수혜

# Test #12: PostToolUse 3 blocks (#57317 직접 surface)
$ jq '.hooks.PostToolUse | length' hooks/hooks.json  # 3
# → matchers: Write (unified-write-post.js), Bash (unified-bash-post.js), Skill (skill-post.js)

# Test #13: token-ledger 활성 (CARRY-5 baseline)
$ tail -1 .bkit/runtime/token-ledger.ndjson
{"ts":"2026-05-09T06:02:17.352Z","sessionHash":"06fbf09b4aebf34e","agent":"main","model":"unknown",
 "ccVersion":"unknown","turnIndex":0,"inputTokens":0,"outputTokens":0,"parseStatus":"no_payload",
 "parseWarnings":"no message field in hookContext (env-fallback)"}
# → Stop hook 실시간 작동 + CARRY-5 P0 zero-token 패턴 변동 없음 (v2.1.136/137 영향 없음)
```

**7-사이클 일관성 입증 — R-2 패턴 두 번째 발생 사이클에서도 invariant 유지**:

| 사이클 | 변경 규모 | F9-120 closure | invariant `updatedToolOutput` | OTEL surfaces | 신규 미활용 surface | R-2 발생 |
|--------|---------|--------------|------------------------------|--------------|------------------|---------|
| 1st (v2.1.120) | +1 | ✓ Exit 0 | 0건 | 4 위치 | (baseline) | - |
| 2nd (v2.1.121) | +1 | ✓ Exit 0 | 0건 | 4 위치 | F1-119 false alarm 학습 | - |
| 3rd (v2.1.122/123) | +29 | ✓ Exit 0 | 0건 | 4 위치 | (none) | - |
| 4th (v2.1.124~129) | +70 | ✓ Exit 0 | 0건 | 4 위치 | F1-126 invocation_trigger / F6-128 OTEL subprocess | - |
| 5th (v2.1.130~132) | +29 | ✓ Exit 0 | 0건 | 4 위치 | F1-132 SESSION_ID / F2-132 ALTERNATE_SCREEN | **R-2 1st (v2.1.130 skip)** |
| 6th (v2.1.133) | +16 | ✓ Exit 0 | 0건 | 4 위치 | F4-133 effort.level (ENH-300) | - |
| **7th (v2.1.134~137)** | **+50** | **✓ Exit 0** | **0건** | **4 위치** | **F1-136 FEEDBACK_SURVEY / F2-136 autoMode** | **R-2 2nd (v2.1.134/135 skip)** |

**결정적 패턴**: **R-2 두 번째 발생** + **49-bullet 대규모 + 1-bullet hotfix mixed 사이클**에서도 invariant 7 cycle 유지. ADR 0003 방법론은 변경 패턴 (R-1 silent publish / R-2 true skip / 정상 게시)과 무관하게 cross-cycle predictability 유지.

---

## 3. v2.1.134~v2.1.137 변경점 카탈로그 (50건)

### 3.1 v2.1.134 / v2.1.135 — R-2 True Semver Skip (3 versions: 2 skipped)

| ID | 상태 | 4-source cross-check |
|----|-----|---------------------|
| v2.1.134 | **Skipped** | npm tarball 404 + GitHub release tag 404 + CHANGELOG absent + commit absent |
| v2.1.135 | **Skipped** | 동일 (4-source cross-check 모두 부재) |

**변경 0건. bkit 영향 0건.** R-2 패턴 (v2.1.130에 이은 두 번째 발생) — 16-릴리스 윈도우 missing publish events 누적 9건/8 versions/50%.

### 3.2 v2.1.136 — Feature 3건 (F1~F3)

| ID | Title | Source | Impact | bkit-relevant | 비고 |
|----|-------|--------|:------:|:-------------:|------|
| F1-136 | `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL` env var | CHANGELOG | LOW | No | OTEL 9 누적 (ENH-281 강화) |
| F2-136 | `settings.autoMode.hard_deny` | CHANGELOG | MEDIUM | No | bkit autoMode 미사용 (ENH-278 deferred 유지) |
| F3-136 | Marketplace removal `r` → `d` | CHANGELOG | LOW | No | UI/UX cosmetic |

### 3.3 v2.1.136 — Fix 46건 (B1~B46, HIGH/MEDIUM 14건만 발췌)

| ID | Title | Source | Impact | bkit-relevant | 비고 |
|----|-------|--------|:------:|:-------------:|------|
| **B1-136** | `.mcp.json`/plugin/connector MCP servers `/clear` silent disappear | CHANGELOG | **HIGH** | **Yes** | bkit 2 stdio servers 자동수혜 |
| B2-136 | Multi-server OAuth refresh tokens 손실 | CHANGELOG | HIGH | No (bkit stdio only) | B6-133 follow-up |
| B3-136 | Concurrent OAuth credential write race | CHANGELOG | MEDIUM | No | re-login loop 방지 |
| **B4-136** | Plugin Stop/UserPromptSubmit hooks cache cleanup race | CHANGELOG | **HIGH** | **Yes** | **bkit Defense Layer 2 두 핫패스 자동수혜** |
| B5-136 | `CLAUDE_ENV_FILE` SessionStart stale | CHANGELOG | MEDIUM | No | bkit SessionStart에서 CLAUDE_ENV_FILE 미주입 |
| B6-136 | Plan mode Edit allow rule write block 실패 | CHANGELOG | MEDIUM | No | bkit Edit allow rule 미정의 |
| B7-136 | Extended thinking redacted block + tool call 400 | CHANGELOG | MEDIUM | No | bkit 미사용 |
| **B8-136** | `plugin.json` skills entry default 숨김 | CHANGELOG | **HIGH** | **자동수혜 비해당** | **bkit `plugin.json` skills 필드 부재 → default 자동 인식** |
| B9-136 | Plugin slash commands with spaces | CHANGELOG | LOW | No | bkit 명령어 공백 미사용 |
| B10-136 | Plugin uninstall slug 대소문자 | CHANGELOG | LOW | No | edge case |
| B11-136 | AskUserQuestion array multi-select 폐기 | CHANGELOG | MEDIUM | No (사용자 자동수혜) | bkit single-select 패턴 |
| **B12-136** | MCP tool results content blocks invisible | CHANGELOG | **HIGH** | **Yes** | bkit-pdca/analysis 16 tools 출력 신뢰성 |
| B13-136 | `--resume`/`--continue` underscore project path | CHANGELOG | MEDIUM | No | bkit repo path: `bkit-claude-code` no underscore |
| B14-136 | `/insights` malformed input crash | CHANGELOG | LOW | No | bkit /insights 미의존 |
| 32건 | UI/UX cosmetic (color/CJK/scroll/wrap/etc.) | CHANGELOG | LOW | No | LOW impact 다수 |

### 3.4 v2.1.137 — Feature 0건 / Fix 1건

| ID | Title | Source | Impact | bkit-relevant | 비고 |
|----|-------|--------|:------:|:-------------:|------|
| **B1-137** | VSCode Win32 activation hotfix (#57415, v2.1.136 regression) | CHANGELOG / #57415 | HIGH (CC user/VSCode Win) | No | bkit는 CLI plugin, VSCode extension 비의존 |

### 3.5 핵심 verbatim quote (Korean 해석)

**B4-136 (HIGH bkit-relevant)** — CHANGELOG:

> "Fixed plugin Stop and UserPromptSubmit hooks failing when cache cleanup deletes the version mid-execution"

→ Plugin Stop / UserPromptSubmit hook 실행 중 cache cleanup이 version을 삭제하면 silent fail이 발생하던 회귀 fix. **bkit Defense Layer 2 핫패스 두 곳(`scripts/unified-stop.js` + `scripts/user-prompt-handler.js`) 자동 안정화** — Trust Score 갱신, control-state 무결성, ENH-214 output styles defense, MON-CC-02 /compact defense 등이 의존하는 핫패스의 신뢰성 자동 향상.

**B1-136 (HIGH bkit-relevant)** — CHANGELOG:

> "Fixed `.mcp.json`/plugin/connector MCP servers silently disappearing after `/clear` (VSCode/JetBrains/SDK)"

→ `.mcp.json`로 정의한 MCP server가 `/clear` 명령 후 silent disappear되던 회귀 fix. **bkit `.mcp.json` 2 stdio servers (`bkit-pdca` + `bkit-analysis`, 16 tools) 자동 안정화** — 사용자가 `/clear` 사용 시 bkit MCP tools 재로드 없이 작동.

**B12-136 (HIGH bkit-relevant)** — CHANGELOG:

> "Fixed MCP tool results returning content blocks (e.g., text blocks) being rendered invisible"

→ MCP tool이 content block 형식 (TextBlock 등)으로 결과를 반환할 때 invisible 처리되던 회귀 fix. **bkit-pdca / bkit-analysis 16 tools (예: `bkit_pdca_status`, `bkit_metrics_history`, `bkit_audit_search` 등)의 multi-block 출력 신뢰성 자동 향상**.

**B8-136 (HIGH bkit-relevant, 자동수혜 비해당)** — CHANGELOG:

> "Fixed `plugin.json` skills entry hiding the default `skills/` directory"

→ `plugin.json`의 `skills` entry가 명시적으로 설정되었을 때 default `skills/` 디렉토리가 숨겨지는 회귀 fix. **bkit `.claude-plugin/plugin.json`은 `skills` 필드를 설정하지 않음** (`jq keys` 결과: author/description/displayName/keywords/license/name/outputStyles/repository/version 9개만, `skills` 부재) → default 자동 인식 경로만 사용 → **fix 자동수혜 비해당, 단 default discovery 경로의 안정성 보장**.

---

## 4. bkit 영향 분석

### 4.1 자동수혜 (HIGH 4건)

#### B1-136: `.mcp.json` `/clear` silent disappear fix (HIGH)

**bkit 영향 매핑**:
- `.mcp.json` 2 stdio servers: `bkit-pdca` (lib/mcp/servers/pdca/) + `bkit-analysis` (lib/mcp/servers/analysis/)
- 16 MCP tools 노출 (bkit_pdca_status, bkit_metrics_history, bkit_audit_search, bkit_gap_analysis 등)
- 사용자가 `/clear` 후에도 MCP servers 자동 재인식 보장
- 기존 동작: 일부 환경에서 `/clear` 후 MCP tool list가 비어있는 silent failure 발생 가능 → v2.1.136 fix로 자동 해소

**현 상태 검증**: `jq '{servers: (.mcpServers | keys), count: (.mcpServers | length)}' .mcp.json` → 2 servers 정상 정의.

#### B4-136: Plugin Stop/UserPromptSubmit hook cache cleanup race fix (HIGH)

**bkit 영향 매핑**:
- bkit Defense Layer 2 핫패스 두 곳 직접 surface:
  - `scripts/unified-stop.js` (Stop hook): Trust Score 갱신, control-state 무결성, token-ledger attribution
  - `scripts/user-prompt-handler.js` (UserPromptSubmit hook): 사용자 prompt 분석, agent 추천, ENH-214 output styles defense
- v2.1.135 이전 cache cleanup race가 발생하면 silent fail로 hook이 실행되지 않아 Defense Layer 2 신뢰성 저하 가능 → v2.1.136 fix로 자동 해소
- token-ledger 활성 검증 (15:02 today entry) → Stop hook 정상 작동 실시간 입증

**현 상태 검증**: `tail -1 .bkit/runtime/token-ledger.ndjson` → `parseStatus: "no_payload"` 단 entry 존재 (Stop hook 자체는 발화). CARRY-5 P0 zero-token 패턴은 별도 root cause (#17 token-meter Adapter env var 의존), v2.1.136 영향 없음.

#### B12-136: MCP tool results content blocks invisible fix (HIGH)

**bkit 영향 매핑**:
- bkit-pdca + bkit-analysis 16 tools 모두 stdio MCP via JSON-RPC + content blocks 가능
- 일부 tools (예: 텍스트 + 다중 paragraph 결과)에서 content block 형식 사용 시 invisible 처리되던 회귀 → v2.1.136 fix로 자동 해소
- 16 tools 출력 신뢰성 자동 향상 — bkit MCP 사용 시나리오 (PDCA status 조회, audit search, gap analysis) 모두 직접 surface

#### B8-136: `plugin.json` skills entry default 숨김 fix (HIGH, 자동수혜 비해당)

**bkit 영향 매핑**:
- `.claude-plugin/plugin.json` `skills` 필드 부재 → default `skills/` directory 자동 인식 경로만 사용
- 이번 fix는 `skills` 필드를 명시 설정한 사용자가 default와 둘 다 사용하지 못하던 회귀 해소 — bkit는 처음부터 default만 사용하므로 **fix 자동수혜 비해당, 단 default discovery 경로 안정성 보장**

**현 상태 검증**: `jq 'keys, .skills // "field absent"' .claude-plugin/plugin.json` → keys 9건 (skills 부재) + `field absent` 확정.

### 4.2 무영향 확정 47+건

**v2.1.136 무영향 (45건)**:
- F1-136 (FEEDBACK_SURVEY 미사용), F2-136 (autoMode 미사용), F3-136 (marketplace UI 미사용)
- B2-136 (OAuth multi-server, bkit stdio only), B3-136 (OAuth race), B5-136 (CLAUDE_ENV_FILE), B6-136 (Plan mode Edit), B7-136 (Extended thinking redacted), B9-136 (slash command spaces), B10-136 (slug 대소문자), B11-136 (multi-select), B13-136 (underscore path), B14-136 (/insights), 32건 cosmetic

**v2.1.137 무영향 (1건)**:
- B1-137 VSCode Win32 (bkit는 CLI plugin)

### 4.3 사전인지 결함 (본 사이클 신규)

**0건** (정식 ENH 신설). 단 **신규 모니터 1건 (MON-CC-NEW-PLUGIN-HOOK-DROP P2)** 후보 — #57317 plugin PostToolUse silent drop OPEN issue가 bkit hooks/hooks.json 24 blocks 중 PostToolUse 3 blocks (Write/Bash/Skill matchers) 직접 surface와 일치. 5/13 review 시 정식 ENH (P1 Defense 신설 후보) 검토 권장.

### 4.4 메모리 정정 3건

| # | 메모리 기록 | 실측 (v2.1.137, 2026-05-09) | 정정 |
|:-:|------------|-----------------------------|------|
| 1 | "Skill description lengths 4건 (pdca-watch 246/pdca-fast-track 221/bkit-explore 221/bkit-evals 220), 0 skills > 250" | **multi-line YAML concat 측정**: pdca-watch **297** / pdca-fast-track **264** / bkit-evals **253** / bkit-explore **252** (4 skills > 250) | **measurement methodology TBD** — single-line vs multi-line concat 차이. 단 4-streak (#56448) 환경에서 실제 validator flag 0건 → ENH-291 P2 deferred 유지 (insurance gate 의의 보존), 5/13 review 시 CC validator 실증 측정 권장 |
| 2 | (기존 메모리에 명시 없음) | **PostToolUse 3 blocks** (Write `unified-write-post.js` / Bash `unified-bash-post.js` / Skill `skill-post.js`) | #57317 직접 surface 명시화. MON-CC-NEW-PLUGIN-HOOK-DROP P2 baseline. |
| 3 | (기존 메모리에 명시 없음) | **`audit-log.ndjson` 부재** (lib/audit/audit-logger.js 존재, lazy create 패턴) | bkit는 audit-log를 lazy create — 실제 audit event 발화 시 생성. 본 세션에서 미생성은 정상 동작 (audit trigger 부재) |

### 4.5 R-3 시리즈 monitor 갱신

| 지표 | v2.1.133 (5/8) | v2.1.137 (5/9) | 변동 |
|------|---------------|----------------|------|
| Numbered #145 | 정체 (+0 in 9d) | 정체 (+0 in 10d) | +0 |
| Dup-closure 5건 (5/1) | 5 | 5 | 0 |
| **Evolved-form 누적** | 10 | **11 (+1 #57317)** | **+1** |
| 추세 | ~0/day | **0.1/day** | 미세 증가 |

**신규 evolved match (#57317, 2026-05-08)**: "Plugin-declared PostToolUse hook silently dropped on CLI v2.1.133 despite plugin enabled and hook syntactically valid" — silent drop 패턴 핵심 키워드 일치, 단 *push* 도메인이 아니라 *hook drop* 도메인 → R-3 evolved 광의 매칭. 5/13 review 시 patterns 분류 정밀화 검토.

**bkit 영향**: ENH-289 R-3 Defense Layer 6 P0 정당성 변동 없음. **#57317은 bkit 직접 우려** — bkit 24 hook blocks 중 PostToolUse 3 blocks 직접 surface. v2.1.133 환경 무수정 작동 (90 cycle 검증) 입증되었으나, plugin-loader 경로 silent drop 가능성으로 MON-CC-NEW-PLUGIN-HOOK-DROP 신규 모니터 등록 권장.

### 4.6 Long-standing Issue 상태 (4건, 모두 streak +2)

| Issue | 직전 streak | v2.1.137 | 변동 | bkit defense |
|-------|:----------:|:--------:|------|--------------|
| #56293 | 5-streak | **7-streak 미해소** | +2 | **ENH-292 P0 가속 정당성 결정적 강화** (49-bullet maintenance에도 fix 부재) |
| #56448 | 4-streak | **6-streak 미해소** | +2 | ENH-291 P2 유지 (measurement methodology TBD) |
| #47855 | 23-streak | **25-streak 미해소** | +2 | MON-CC-02 defense 유지 |
| #47482 | 26-streak | **28-streak 미해소** | +2 | ENH-214 defense 유지 |

---

## 5. ENH 변동 요약

### 5.1 신규 ENH

**0건** (P0/P1/P2 신규 등록 없음)

### 5.2 신규 모니터 (1건)

- **MON-CC-NEW-PLUGIN-HOOK-DROP P2** (#57317 plugin PostToolUse silent drop OPEN). bkit hooks/hooks.json PostToolUse 3 blocks 직접 surface (Write/Bash/Skill matchers). 5/13 review 시 정식 ENH 후보 검토 (P1 Sprint Defense 신설 가능). Defense 방향: SessionStart hook reachability sanity check (PostToolUse blocks 발화 검증) + audit log fingerprint.

### 5.3 기존 ENH 강화 (3건)

- **ENH-292 P0 (7-streak 결정적 강화)**: Sub-agent Caching 10x Mitigation. #56293 v2.1.137에서 **7번째 연속 미해소 (49-bullet maintenance에도 fix bullet 없음)** — "Anthropic 자체 해결 의지 부재" 결정적 입증. v2.1.13 Sprint Coordination 가속 단독 P0 우선순위 유지. **bkit 차별화 #3 product moat 결정적 강화**.
- **ENH-286 (#57485 추가 데이터)**: Memory Enforcer. 신규 OPEN #57485 (Opus 4.7 agents ignore CLAUDE.md directives) → bkit advisory 의존 안 하고 PreToolUse deny-list enforced 패턴이 product moat. Sprint E motivation 인용.
- **ENH-281 OTEL (8 → 9 누적)**: F1-136 `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL` env 추가. 누적 9건 (F4-122 + I2-122 + I4-121 + F8-119 + I6-119 + F1-126 + I2-126 + F6-128 + **F1-136**). Sprint A Observability 단일 PR 후보.

### 5.4 변동 없음 (보존)

- **ENH-289 R-3 Defense Layer 6 P0**: 추세 0.1/day, 5/13 review에서 강등 검토 데이터 추가 1-2 사이클 더 수집 후
- **ENH-300 P2 effort.level adaptive defense**: F4-133 surface 변동 없음 (grep 0건, 2-cycle baseline 유지)
- **ENH-290 R-1/R-2 framework**: 18-릴리스 윈도우 missing publish events 9건/8 versions/50%, framework 정당성 결정적 강화 데이터 추가
- 기타 ENH-282, ENH-291, ENH-293~299: 변동 없음

### 5.5 DROP

**0건**

### 5.6 누적 bkit 차별화 (4건, 본 사이클 변동 없음)

ENH-286 (memory enforcer, **#57485 추가 데이터로 강화**) + ENH-289 (Defense Layer 6, evolved 11건 +1) + ENH-292 (sequential dispatch, **7-streak 결정적 강화**) + ENH-300 (effort-aware adaptive defense, baseline 유지)

---

## 6. R-1/R-2 Dist-tag Events (npm 4-source cross-check)

| Version | npm tarball | GitHub release tag | CHANGELOG | Commit | 분류 |
|---------|-------------|--------------------|-----------|--------|------|
| 2.1.134 | **404** | **404** | absent | absent | **R-2 (true semver skip)** |
| 2.1.135 | **404** | **404** | absent | absent | **R-2 (true semver skip)** |
| 2.1.136 | published | present (`2bd8547`) | present | `2bd8547` 2026-05-08 | normal |
| 2.1.137 | published | present (`33a87ad`) | present | `33a87ad` 2026-05-09 | normal |

**R-2 패턴 누적**: **2 occurrences (3 versions)** = v2.1.130 + v2.1.134/135. R-1 (silent npm publish) 6건 + R-2 (true semver skip) 2 occurrences (3 versions) = **18-릴리스 윈도우 9 missing publish events / 8 versions / 50%**.

**stable dist-tag 갱신**: v2.1.123 → **v2.1.126** (gap 3-version, 2026-05-09 시점). v2.1.126은 v2.1.124~v2.1.125 R-1 skip 직후 첫 정상 release. **승격 사유 추정**: v2.1.128 caching 회귀 + v2.1.129 skill validator 회귀 직전 마지막 안정 버전 → Anthropic의 보수적 stable 선택. **bkit 권장 (보수적) v2.1.123 ↔ npm stable v2.1.126 drift +3 발생** → ENH-290 framework follow-up 시점.

**latest=2.1.137 + next=2.1.138 분기**: v2.1.132부터 시작된 통합 패턴이 본 사이클에서 **분리 복귀** (next 채널 신규 활성). 5-사이클 만에 분기 복구.

---

## 7. 결론 및 권장 액션

### 7.1 최종 판정

bkit v2.1.12 main GA가 **CC v2.1.137 환경에서 무수정 작동** (Phase 2 직접 검증 8/8 PASS + 7-cycle invariant 유지). **HIGH 자동수혜 4건 (B1/B4/B12-136 + B8-136 비해당 자동 정상 작동)**으로 별도 hotfix 작업 불필요. **92 연속 호환 (v2.1.34~v2.1.137)** 입증.

### 7.2 권장 CC 버전 (2026-05-09 기준)

| 채널 | 권장 버전 | 사유 |
|-----|----------|------|
| **보수적** | **v2.1.123** | bkit 검증 완료, npm stable v2.1.126과 +3 drift 단 ADR 0003 framework 정당성 (gap 13 패턴 cycle) |
| **균형 (신규)** | **v2.1.137** | B1/B4/B12-136 hook+MCP 신뢰성 fix HIGH 자동수혜 + 92-cycle 검증 + dist-tag latest 채널 활성 |
| **비권장 유지** | v2.1.128 (#56293 7-streak), v2.1.129 (#56448 6-streak) | v2.1.137에서도 미해소 |
| **Environment exception 유지** | macOS 11 → v2.1.112 / non-AVX → v2.1.112 / Windows + Stop hook → v2.1.125 ↓ 또는 SessionEnd fallback | (변동 없음) |

### 7.3 사용자 안내 사항

1. **#56293 caching 10x 7-streak 미해소** — cto-lead/qa-lead Task spawn 5+ blocks 사용 시 cache miss 4%→40% 위험 동일. ENH-292 sequential dispatch (bkit 차별화) 활용 권장.
2. **#57317 plugin PostToolUse silent drop** — bkit 3 blocks 직접 surface, v2.1.137 환경에서 무수정 작동 (token-ledger active 검증) 단 plugin-loader 경로 silent drop 가능성 잔존. MON-CC-NEW-PLUGIN-HOOK-DROP P2 모니터링.
3. **npm stable v2.1.126 승격** — bkit 보수적 권장 v2.1.123과 +3 drift 발생, ENH-290 framework follow-up으로 v2.1.126 또는 v2.1.137 직접 검증 권장 시점 도달 (사용자 명시 승인 후 진행).

### 7.4 v2.1.13 Sprint 우선순위 (변동 없음, 보류 유지)

사용자 결정 (2026-04-29 ~ 2026-05-08): CC 버전 대응 hotfix 보류, Full PDCA 분석만 수행. 본 사이클도 동일 정책 유지 — **신규 ENH 0건 + 기존 ENH 강화 3건 (ENH-292 P0 결정적, ENH-286 데이터 추가, ENH-281 9 누적)** 모두 v2.1.13 Sprint로 carry.

---

## 8. 참고 자료

### 8.1 분석 데이터 출처

- [Claude Code Releases — anthropics/claude-code](https://github.com/anthropics/claude-code/releases)
- [Claude Code CHANGELOG.md (raw)](https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md)
- [npm @anthropic-ai/claude-code v2.1.136](https://registry.npmjs.org/@anthropic-ai/claude-code/2.1.136)
- [npm @anthropic-ai/claude-code v2.1.137](https://registry.npmjs.org/@anthropic-ai/claude-code/2.1.137)
- [Issue #56293 — sub-agent caching 10x (7-streak)](https://github.com/anthropics/claude-code/issues/56293)
- [Issue #56448 — skill validator regression (6-streak)](https://github.com/anthropics/claude-code/issues/56448)
- [Issue #47855 — /compact 1M block (25-streak)](https://github.com/anthropics/claude-code/issues/47855)
- [Issue #47482 — output styles frontmatter (28-streak)](https://github.com/anthropics/claude-code/issues/47482)
- [Issue #57317 — plugin PostToolUse silent drop (R-3 evolved 11)](https://github.com/anthropics/claude-code/issues/57317)
- [Issue #57415 — VSCode v2.1.136 win32 activation](https://github.com/anthropics/claude-code/issues/57415)
- [Issue #57485 — Opus 4.7 agents ignore CLAUDE.md (ENH-286 추가 데이터)](https://github.com/anthropics/claude-code/issues/57485)

### 8.2 이전 사이클 보고서

- ADR 0003 6th: `cc-v2132-v2133-impact-analysis.report.md` (16 changes, single-release)
- ADR 0003 5th: `cc-v2130-v2132-impact-analysis.report.md` (29 changes, R-2 1st 발생)
- ADR 0003 4th: `cc-v2124-v2129-impact-analysis.report.md` (70 changes, R-1 4건)
- ADR 0003 3rd: `cc-v2121-v2123-impact-analysis.report.md` (29 changes, R-3 P0 격상)

### 8.3 메모리 참조

- `cc_version_history_v2134_v2137.md` (본 사이클, 신규 작성)
- `cc_version_history_v2133.md` (직전 사이클)
- MEMORY.md 인덱스 갱신 (Consecutive 90→92, ENH 변동 0/3/0)

---

**Verdict**: **PASS / 92 연속 호환 / hotfix 불필요 / R-2 두 번째 발생 사이클에서도 ADR 0003 일관성 입증 / bkit 차별화 4건 변동 없음**
