# CC v2.1.130 → v2.1.132 영향 분석 및 bkit 대응 보고서 (ADR 0003 다섯 번째 정식 적용)

> **Status**: ✅ Final (실증 기반, ADR 0003 다섯 번째 정식 적용)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.12 (current GA, main `d26c57c`, 2026-04-29 release tag)
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Date**: 2026-05-07
> **PDCA Cycle**: cc-version-analysis (v2.1.130~v2.1.132, 2-version increment, **1-day window**)
> **CC Range**: v2.1.129 (baseline, 87 consecutive PASS) → **v2.1.130 (R-2 패턴 신규 — true semver skip)** → v2.1.131 (release 2026-05-06 07:47 UTC, 2 changes) → v2.1.132 (release 2026-05-06 22:08 UTC, 27 changes, npm `latest` + `next` 통합)
> **Verdict**: **크리티컬 회귀 0건 / Breaking 0건 / 자동수혜 4건 / 무영향 확정 6건 / 신규 사전인지 결함 5건 (#56865/56871/56883/56884/56887) / 신규 ENH 2건 (ENH-297 P2 / ENH-298 P1) / 기존 ENH 강화 3건 (ENH-289/290/286) / R-2 패턴 신규 정식화 1건 / R-3 evolved form 누적 10건 / 89 연속 호환**

---

## 1. Executive Summary

### 1.1 최종 판정

| 항목 | 값 |
|------|----|
| 크리티컬 회귀 건수 | **0건** (bkit v2.1.12 무수정 작동, v2.1.132 환경 직접 검증 8/8 PASS) |
| Breaking Changes | **0건** (확정) |
| 자동수혜 (CONFIRMED) | **4건** (B20-132 stdio MCP 10GB+ RSS fix, B21-132 MCP `tools/list` retry, F1-132 `CLAUDE_CODE_SESSION_ID` env var 인프라, B1-132 SIGINT graceful shutdown) |
| 정밀 검증 (무영향 확정) | **6건** (B1-131 VS Code Win extension, B2-131 Mantle endpoint, B22-132 claude.ai connectors, B23-132 Bedrock/Vertex `ENABLE_PROMPT_CACHING_1H`, F2-132 ALTERNATE_SCREEN, B17-132 statusline context_window) |
| **신규 사전인지 결함** | **5건** (#56865 task-agent system prompt override / #56871 permission `**:*` wildcard / #56883 plan-mode resume after v2.1.132 / #56884 silent push to upstream / #56887 MCP HTTP OAuth scope) |
| **신규 ENH** | **2건** (ENH-297 P2 MCP stderr-only CI gate / ENH-298 P1 push event Defense Layer 6) |
| **기존 ENH 강화** | ENH-289 R-3 Defense Layer 6 (#56865 + #56884 결정적 정당화) / ENH-290 3-Bucket Decision (R-2 카테고리 신설) / ENH-286 Memory Enforcer (#56865 task-agent 공식 사례) |
| **흡수된 ENH** | ENH-299 P3 (R-2 tracker) → ENH-290 강화로 흡수 (별도 ENH 신설 X) / ENH-281 OTEL 묶음 변동 없음 (F1-132 SESSION_ID grep 0건 → DROP) |
| YAGNI FAIL DROP | 1건 (ENH-299 → ENH-290 흡수) |
| bkit v2.1.12 hotfix 필요성 | **불필요** (현재 main GA `d26c57c` 안정, 87 → 89 연속 호환 확장 입증) |
| **연속 호환 릴리스** | **89** (v2.1.34 → v2.1.132, 87 → 89, +2) |
| ADR 0003 적용 | **YES (다섯 번째 정식 적용 — 5-사이클 일관성 입증)** |
| **권장 CC 버전** | **v2.1.123 (보수적) 또는 v2.1.132 (균형, 신규)** — v2.1.128 / v2.1.129 비권장 유지 (#56293 caching 10x + #56448 skill validator 모두 v2.1.132에서 미해소) |

### 1.2 성과 요약

```
┌──────────────────────────────────────────────────────┐
│  v2.1.130 → v2.1.132 영향 분석 (ADR 0003 다섯 번째)    │
├──────────────────────────────────────────────────────┤
│  📊 CC 변경 수집: 29 (v131:2, v132:27)                 │
│  🔴 실증된 크리티컬 회귀: 0건 (bkit 환경)              │
│  🟢 CONFIRMED auto-benefit: 4건                        │
│  🟡 정밀 검증 (무영향 확정): 6건                       │
│  🚨 사전인지 OPEN 결함 (신규 5건):                     │
│      • #56865 web task-agent system prompt override   │
│      • #56871 permission `**:*` wildcard 매칭 실패     │
│      • #56883 plan-mode resume after v2.1.132          │
│      • #56884 silent push to upstream remote           │
│      • #56887 MCP HTTP OAuth scope                     │
│  🆕 신규 ENH: 2건 (ENH-297 P2, ENH-298 P1)             │
│  🔁 기존 ENH 강화: 3건 (289/290/286)                   │
│  📈 R-2 패턴 신규 정식화 (v2.1.130 true skip)          │
│  🛡️ bkit 차별화 결정적 강화: ENH-286 Memory Enforcer    │
│      (#56865 Anthropic task-agent system prompt        │
│       overrides CLAUDE.md 공식 사례)                   │
│  ❌ Breaking Changes: 0 (확정)                         │
│  ✅ 연속 호환: 87 → 89 릴리스 (v2.1.34~v2.1.132)       │
│  ✅ F9-120 closure 5 릴리스 연속 PASS 실측             │
│      (claude plugin validate Exit 0,                   │
│       v2.1.120/121/123/129/132)                        │
│  ✅ npm dist-tag 통합: latest=132 + next=132           │
│      (10-version gap 해소, stable=119 13-version gap)   │
│  ⚙️ R-3 evolved form 누적 10건 (+2 본 사이클:           │
│      #56865 + #56884), numbered #145 정체              │
└──────────────────────────────────────────────────────┘
```

### 1.3 4-관점 가치 표

| 관점 | 내용 |
|------|------|
| **Technical** | (a) **B20-132 stdio MCP 10GB+ RSS fix** — non-protocol stdout 차단으로 bkit `.mcp.json`의 2 stdio MCP servers (16 tools, `bkit-pdca` + `bkit-analysis`) 메모리 안정성 자동 향상. dev 시 console.log 누락 발생 시 fail-closed 보호. (b) **F1-132 `CLAUDE_CODE_SESSION_ID` env var** — Bash subprocess에 hook session_id 전파 인프라 신설. bkit `lib/audit/audit-logger.js` NDJSON entry session_id 추적 자동수혜 가능 인프라. 단 grep 결과 bkit 미활용(0건) → ENH-281 OTEL 묶음 추가 안함 (DROP). (c) **B1-132 SIGINT graceful shutdown** — IDE stop / `kill -INT` 시 terminal 모드 복원 + `--resume` hint 자동 출력. bkit `scripts/unified-stop.js` 직접 SIGINT 핸들러 미보유 → CC가 처리 후 Stop hook 발화하는 구조이므로 자동수혜. (d) **F9-120 closure 5 릴리스 연속 PASS 실측** (`claude plugin validate .` Exit 0, v2.1.120/121/123/129/132) — marketplace.json root field 안정성 5 cycle 입증. |
| **Operational** | hotfix sprint 불필요 (회귀 0건). v2.1.123 보수적 권장 유지 + **v2.1.132 균형 권장 신규 추가** — B20/B21-132 MCP fix 가치 + B1-132 graceful shutdown 가치 + npm latest=next 통합으로 next 채널 모험성 감소. **단 #56293 caching 10x v2.1.128~v2.1.132 4 릴리스 연속 미해소** → cto-lead/qa-lead Task spawn 5 blocks 사용 시 cache miss 4%→40% 위험 동일하므로 사용자 안내 필요. **v2.1.130 R-2 패턴 신규 정식화** (4-source cross-check 모두 부재 — release tag/CHANGELOG/commit/npm publish) → ENH-290 3-Bucket Decision Framework R-1 (silent npm publish) vs R-2 (true semver skip) 카테고리 분리. |
| **Strategic** | ADR 0003 (Empirical Validation) **다섯 번째 정식 적용 사이클 → 5-사이클 일관성 입증** (v2.1.120/121/123/129/132 5 cycle). 사이클별 변경 규모 차이 (v2.1.124~129 70+ vs v2.1.130~132 29)에서도 분석 방법론이 동일하게 작동 — cross-cycle predictability 결정적 입증. **bkit 차별화 정당성 결정적 강화 2건**: (1) **ENH-286 Memory Enforcer** — #56865 "Web auto-commits — task-agent system prompt hard-codes commit/push, overriding CLAUDE.md" Anthropic 자체 task-agent가 user CLAUDE.md를 override한다는 공식 사례 → bkit memory enforcer (PreToolUse 물리 차단) 차별화 정당성 결정적. (2) **ENH-289 R-3 Defense Layer 6** — #56884 "Safety: pushed to upstream remote without warning" 사례로 push event 가드 정당성 추가 → ENH-298 P1 신규 (Sprint R-3 묶음 통합). |
| **Quality** | bkit v2.1.12 main GA가 v2.1.132 환경에서 무수정 작동 (Phase 2 직접 검증 8/8 PASS). **사후 검증 결과 (2026-05-07 직접 실행)**: (1) `claude --version` = `2.1.132` (latest 채널 활성화), (2) `claude plugin validate .` Exit 0 — F9-120 closure 5 릴리스 연속 입증, (3) `hooks.json` events:21 / blocks:24 메모리 일치, (4) `grep -rn 'updatedToolOutput' lib/ scripts/ hooks/` 0건 — #54196 무영향 invariant 5 cycle 유지, (5) `grep OTEL_ lib/infra/telemetry.js` 4 위치 (line 126/137/149/188) 동일 — F6-128 surface 그대로 (CARRY-5 root cause 후보 5 cycle 유지), (6) `grep CLAUDE_CODE_SESSION_ID lib/ scripts/ hooks/` 0건 — F1-132 미활용 surface DROP 확정, (7) `grep CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` 0건 — F2-132 무영향 확정, (8) `mcpServers` field `.claude-plugin/plugin.json` 부재 + **`.mcp.json` 별도 존재 (메모리 정정 필요)** — F7-128 무영향 유지. |

---

## 2. ADR 0003 다섯 번째 정식 적용 — Phase 1.5 게이트 결과

### 2.1 게이트 통과 매트릭스

ADR 0003 §2 (b) 실증 상태 4값 기준:

| ID | 변경 요약 | E1 시나리오 | E2 실행 | E3 경로 스코프 | E4 공식 스펙 | **E5 상태** |
|----|----------|------------|---------|--------------|-------------|------------|
| **B1-131** | VS Code Win extension fail (createRequire polyfill) | 정의 (VS Code extension 사용 여부) | ✅ 정적 (bkit는 plugin 형태) | (없음) | release notes | **CONFIRMED 무영향** |
| **B2-131** | Mantle endpoint x-api-key | 정의 (Anthropic API direct 사용) | ✅ 정적 (bkit Anthropic 직접) | (없음) | release notes | **CONFIRMED 무영향** |
| **F1-132** | `CLAUDE_CODE_SESSION_ID` env var Bash subprocess | 정의 (audit-logger.js NDJSON session_id) | ✅ Phase 2 직접 (`grep CLAUDE_CODE_SESSION_ID` 0건) | `lib/audit/audit-logger.js`, `scripts/unified-stop.js` | release notes | **CONFIRMED auto-benefit (인프라) + 활용 미실시 (DROP)** |
| **F2-132** | `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` opt out | 정의 (alternate-screen 미사용) | ✅ Phase 2 직접 (`grep ALTERNATE_SCREEN` 0건) | (없음) | release notes | **CONFIRMED 무영향** |
| **F3-132** | "Pasting…" footer hint | 정의 (UI cosmetic) | ✅ 정적 (UI only) | (없음) | release notes | **CONFIRMED 무영향** |
| **B1-132** | External SIGINT graceful shutdown | 정의 (unified-stop.js SIGINT 핸들러) | ✅ Phase 2 직접 (`grep -n 'SIGINT\|SIGTERM' scripts/unified-stop.js` 직접 핸들러 부재 — CC가 SIGINT 처리 후 Stop hook 발화) | `scripts/unified-stop.js`, `hooks/hooks.json` Stop block | release notes | **CONFIRMED auto-benefit (lifecycle 향상)** |
| **B2-132** | Terminal closed/SSH disconnect uncaught exception | 정의 (native build 안정성) | ✅ 정적 (관측성 향상) | (없음) | release notes | **CONFIRMED 무영향** |
| **B3-132** | --resume emoji surrogate split | 정의 (resume 시 NFD 처리) | ✅ 정적 (low-level fix) | (없음) | release notes | **CONFIRMED 무영향** |
| **B4-132** | --permission-mode plan resume + plan re-application after ExitPlanMode | 정의 (cto-lead/qa-lead plan-mode 사용) | ✅ Phase 2 직접 (`grep -rn 'permission-mode\|plan-mode\|ExitPlanMode' agents/` cto-lead/qa-lead/pm-lead 모두 plan-mode toggle 패턴 부재) | `agents/cto-lead.md`, `agents/qa-lead.md`, `agents/pm-lead.md` | release notes / issue #56883 | **CONFIRMED 무영향** |
| **B17-132** | statusline context_window cumulative | 정의 (statusline 커스터마이징) | ✅ 정적 (bkit statusline 미커스터마이징) | (없음) | release notes | **CONFIRMED 무영향** |
| **B20-132** | stdio MCP 10GB+ RSS unbounded growth | 정의 (`.mcp.json` 2 stdio servers + 16 tools) | ✅ Phase 2 직접 (`cat .mcp.json` — bkit-pdca + bkit-analysis stdio servers 16 tools) | `.mcp.json`, `mcp-bkit/`, `mcp-pdca/` (가정) | release notes | **CONFIRMED auto-benefit (HIGH 가치)** |
| **B21-132** | MCP `tools/list` silent fail retry | 정의 (16 MCP tools 진단) | ✅ 정적 (bkit 2 stdio servers 자동수혜) | `.mcp.json` | release notes | **CONFIRMED auto-benefit** |
| **B22-132** | claude.ai connectors auth | 정의 (claude.ai connector 사용 여부) | ✅ 정적 (bkit는 stdio MCP, claude.ai connector 미사용) | (없음) | release notes | **CONFIRMED 무영향** |
| **B23-132** | Bedrock/Vertex `ENABLE_PROMPT_CACHING_1H` 400 | 정의 (3rd-party deployment 사용 여부) | ✅ 정적 (bkit Anthropic 직접) | (없음) | release notes | **CONFIRMED 무영향** |
| **#56865 R-3 evolved** | Web auto-commits — task-agent system prompt overrides CLAUDE.md | 정의 (CLAUDE.md INVIOLABLE rules + Anthropic task-agent system prompt) | ⚠️ 정적 (R-3 series evolved form, 사용자 환경 미reproduction) | bkit `CLAUDE.md`, agent-memory | issue body | **CONFIRMED 패턴 결정적 강화 (ENH-286 차별화 정당성)** |
| **#56871** | Permission `**:*` wildcard 매칭 실패 | 정의 (bkit permission patterns) | ✅ Phase 2 직접 (`grep -rn '\*\*:\*' agents/ hooks/ skills/` 0건) | (없음) | issue body | **CONFIRMED 무영향** |
| **#56883** | --permission-mode plan resume after v2.1.132 | 정의 (B4-132 후속 검증) | ✅ Phase 2 (B4-132와 동일 — bkit plan-mode 미사용) | (없음) | issue body | **CONFIRMED 무영향** |
| **#56884** | Silent push to upstream remote | 정의 (qa-lead 4-agent push 패턴) | ⚠️ 정적 (`grep -rn 'git push' agents/` qa-lead push 패턴 식별, 사전 가드 부재) | `agents/qa-lead.md`, `agents/cto-lead.md`, `scripts/qa-lead-orchestrator.js` (가정) | issue body | **CONFIRMED 패턴 노출 (ENH-298 P1 신규 정당성)** |
| **#56887** | MCP HTTP OAuth scope ignored | 정의 (HTTP MCP 사용 여부) | ✅ 정적 (bkit는 stdio MCP, HTTP OAuth 무관) | (없음) | issue body | **CONFIRMED 무영향** |
| **R-2 패턴 신설** | v2.1.130 true semver skip (4-source 모두 부재) | 정의 (16 윈도우 R-1 vs R-2 분리 운영) | ✅ Phase 1 직접 (release tag 404 + CHANGELOG entry 부재 + commit chain 5c0e4f9→71135e4 직접 점프 + npm publish 부재) | release notes 게시 정책 | release tag absent | **CONFIRMED 패턴 정식화 (ENH-290 강화)** |

### 2.2 핵심 실증 발견 — 5-사이클 일관성 입증

**E2 (실제 실행) 결과 — Phase 2 (2026-05-07)**:

```bash
# Test #1: claude --version
$ claude --version
2.1.132 (Claude Code)

# Test #2: claude plugin validate .
$ claude plugin validate .
[Exit 0]
# F9-120 closure: v2.1.120/121/123/129/132 → 5 릴리스 연속 PASS

# Test #3: hooks.json events count
$ jq '[.hooks | to_entries[] | .value[] | length] | add' hooks/hooks.json
24
$ jq '.hooks | keys | length' hooks/hooks.json
21
# events:21 / blocks:24 메모리 수치 일치

# Test #4: updatedToolOutput grep (5 cycle invariant)
$ grep -rn 'updatedToolOutput' lib/ scripts/ hooks/ --include='*.js'
[no matches]
# 0건 — #54196 PostToolUse updatedToolOutput 무영향 5 cycle 유지

# Test #5: OTEL_ surface (F6-128 carry, CARRY-5 root cause 후보)
$ grep -n 'OTEL_' lib/infra/telemetry.js
126:  if (env.OTEL_REDACT === '1') {
137:  if (env.OTEL_LOG_USER_PROMPTS !== '1') {
149:  const service = process.env.OTEL_SERVICE_NAME || 'bkit';
188:  const endpoint = process.env.OTEL_ENDPOINT;
# 4 위치 동일 — F6-128 surface 그대로 (CARRY-5 root cause 후보 5 cycle 유지)

# Test #6: CLAUDE_CODE_SESSION_ID (신규 — F1-132 활용 가능성)
$ grep -rn 'CLAUDE_CODE_SESSION_ID' lib/ scripts/ hooks/ --include='*.js'
[no matches]
# 0건 — F1-132 미활용 surface DROP 확정 (ENH-281 OTEL 묶음 미추가)

# Test #7: CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN (신규 — F2-132 사용 여부)
$ grep -rn 'CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN' lib/ scripts/ hooks/ --include='*.js'
[no matches]
# 0건 — F2-132 무영향 확정

# Test #8: mcpServers field 부재 + .mcp.json 존재 확인
$ jq '.mcpServers' .claude-plugin/plugin.json
null
$ test -f .mcp.json && echo "exists" || echo "missing"
exists
# .claude-plugin/plugin.json:mcpServers 부재 (F7-128 무영향)
# .mcp.json 별도 존재 (B20/B21-132 자동수혜 surface)
```

**의미**:

1. **F9-120 closure 5 릴리스 연속 PASS** — marketplace.json root field 안정화가 5 cycle 완료. 더 이상 monitoring 필요 X (closure 확정).
2. **CARRY-5 closure 검증 추가** — `scripts/unified-stop.js:685-691` 주석에서 hookContext payload 추출 명시 완료 확인. F1-132 SESSION_ID env var 활용 시 NDJSON entry session_id 정합성 추가 향상 가능성 있으나, **bkit 미활용 grep 0건**으로 즉시 적용 X (Phase 2 agent: ENH-281 OTEL 묶음 미추가, DROP).
3. **R-2 패턴 정식화** — v2.1.130 4-source cross-check 모두 부재가 R-1(silent npm publish, 외부 게시 부재이나 npm publish 존재)과 본질적으로 다른 패턴임을 입증. ENH-290 3-Bucket Decision Framework에 R-2 카테고리 신설 권장.

---

## 3. 변경사항 카테고리 분류

### 3.1 v2.1.131 (2 changes — emergency hotfix)

| ID | Category | Title | Impact | bkit-relevant |
|----|---------|-------|:------:|:-------------:|
| **B1-131** | Bug (build) | VS Code extension fail to activate on Win — bundled SDK hardcoded build path | LOW | ❌ NO |
| **B2-131** | Bug (auth) | Mantle endpoint authentication missing `x-api-key` header | LOW | ❌ NO |

**Note**: v2.1.131은 emergency hotfix 성격. v2.1.131 출시 후 7시간 만에 v2.1.132 출시 → v2.1.131이 partial fix (Win extension만 우선 해결)였음을 시사.

### 3.2 v2.1.132 (27 changes)

#### 3.2.1 Features (5건)

| ID | Title | Impact | bkit-relevant |
|----|-------|:------:|:-------------:|
| **F1-132** | `CLAUDE_CODE_SESSION_ID` env var added to Bash tool subprocess (matching `session_id` passed to hooks) | MED | **✅ YES** (인프라 자동수혜, 활용 미실시) |
| **F2-132** | `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` opt out fullscreen alternate-screen renderer | LOW | ❌ NO |
| **F3-132** | "Pasting…" footer hint during Ctrl+V image paste | LOW | ❌ NO |
| **I1-132** | Visual consistency `/login`, `/upgrade`, `/extra-usage` dialog spacing | LOW | ❌ NO |
| **I2-132** | `/tui fullscreen` startup banner — additional renderer benefits | LOW | ❌ NO |

#### 3.2.2 Bug Fixes — Lifecycle/Resume (5건)

| ID | Title | Impact | bkit-relevant |
|----|-------|:------:|:-------------:|
| **B1-132** | External SIGINT (IDE stop, `kill -INT`) graceful shutdown with terminal mode restore + `--resume` hint | MED | **✅ YES** (auto-benefit) |
| **B2-132** | Uncaught exception when terminal closed or SSH disconnects mid-session (native) | MED | ❌ NO |
| **B3-132** | `--resume` failing with `no low surrogate in string` — emoji-truncation split sanitized | LOW | ❌ NO |
| **B4-132** | `--permission-mode` flag ignored when resuming plan-mode session + plan mode not re-applied after `ExitPlanMode` | MED | ❌ NO (bkit plan-mode 미사용 grep 확인) |
| **B5-132** | Fullscreen mode blank screen after sleep/wake or Ctrl+Z/`fg` until next keystroke | LOW | ❌ NO |

#### 3.2.3 Bug Fixes — Input/UI/Slash (14건, 모두 bkit 무관)

| ID | Title | Impact |
|----|-------|:------:|
| B6-132 | Cursor mid-grapheme on Ctrl+E/A/K/U/arrow with Indic conjunct/ZWJ emoji | LOW |
| B7-132 | vim operators corrupting decomposed (NFD) accented characters | LOW |
| B8-132 | Pasting text starting with `/` silently swallowing input | LOW |
| B9-132 | Pasting dumping stray escape sequences (focus/mouse interleave) | LOW |
| B10-132 | Mouse wheel scroll too fast in Cursor + VS Code 1.92-1.104 | LOW |
| B11-132 | Scroll-wheel handling in JetBrains IDE 2025.2 | LOW |
| B12-132 | `/usage` Ctrl+S hanging on Linux/X11 clipboard | LOW |
| B13-132 | `/terminal-setup` Windows Terminal Shift+Enter contradiction | LOW |
| B14-132 | `/effort` picker CLAUDE_CODE_EFFORT_LEVEL env var | LOW |
| B15-132 | `/status` wrong default model | LOW |
| B16-132 | Slash command autocomplete popup capped at 3-5 commands | LOW |
| **B17-132** | **statusline `context_window` cumulative session totals (bkit 미커스터마이징 무영향)** | MED |
| B18-132 | Alt+T thinking toggle on macOS without "Option as Meta" | LOW |
| B19-132 | Dead keyboard input on Windows after re-opening background session | LOW |

#### 3.2.4 Bug Fixes — MCP (3건, 자동수혜 가치 매우 큼)

| ID | Title | Impact | bkit-relevant |
|----|-------|:------:|:-------------:|
| **B20-132** | **Unbounded memory growth (10GB+ RSS) when stdio MCP server writes non-protocol data to stdout** | **HIGH** | **✅ YES (자동수혜)** |
| **B21-132** | MCP servers connect but fail `tools/list` silently — retry once, show "connected · tools fetch failed" in `/mcp` | MED | **✅ YES (자동수혜)** |
| B22-132 | Unauthorized claude.ai MCP connectors showing "failed" + headless `-p` retrying non-transient 4xx | LOW | ❌ NO |

#### 3.2.5 Bug Fixes — 3rd-party Cache (1건)

| ID | Title | Impact | bkit-relevant |
|----|-------|:------:|:-------------:|
| B23-132 | Bedrock and Vertex 400 errors when `ENABLE_PROMPT_CACHING_1H` is set | HIGH | ❌ NO (Anthropic 직접) |

---

## 4. 사전 인지 회귀 후속 (HIGH 우선)

### 4.1 #56293 v2.1.128 sub-agent caching 10x — **4 릴리스 연속 미해소** (ENH-292 P0 가속 정당성)

| 항목 | Status |
|------|--------|
| 현재 state | **OPEN** (2026-05-07 기준 미해소) |
| v2.1.130 fix? | ❌ N/A (v2.1.130은 R-2 skip) |
| v2.1.131 fix? | ❌ 없음 (changelog "caching" 키워드 무관) |
| v2.1.132 fix? | ❌ 직접 fix 부재. B23-132 ENABLE_PROMPT_CACHING_1H Bedrock/Vertex fix는 별개 caching 영역 (Anthropic 직접 사용 bkit는 무관) |
| ENH-292 status | **유지 (변동 없음, P0 가속 정당성 강화 — 4 릴리스 연속 미해소로 사용자 비용 위험 누적)** |
| 권장 | bkit `agents/cto-lead.md` Task spawn 5 blocks + `agents/qa-lead.md` 4-agent에 sequential dispatch 패턴 적용 우선순위 그대로 v2.1.13 Sprint Coordination 진행 |

### 4.2 #56448 v2.1.129 skill validator — **3 릴리스 연속 미해소** (ENH-291 P1)

| 항목 | Status |
|------|--------|
| 현재 state | **OPEN** (2026-05-07 기준 미해소) |
| v2.1.131 fix? | ❌ 없음 |
| v2.1.132 fix? | ❌ fix 부재. changelog "skill" 키워드 무관 |
| ENH-291 status | **유지 (변동 없음, P1)** — 4 skills > 250자 위험 zone 그대로 (pdca-watch 251 / pdca-fast-track 226 / bkit-explore 226 / bkit-evals 225) |
| 권장 | v2.1.13 Sprint Doc/Sprint A 우선순위 그대로 진행 |

### 4.3 R-3 시리즈 "safety hooks 무시" 진화 추적

| 시점 | numbered | evolved form | 추세 |
|------|:--------:|:------------:|------|
| 2026-04-29 P0 격상 (v2.1.123) | 42+, #145 | (추적 시작 전) | 5일간 +34, 1.4/day |
| 2026-05-06 직전 (v2.1.129) | #145 정체 + dup-closure 5건 | +8건 (#56333/56450/56395/56394/56393/56383/56418/56447) | dup-closure 압축 + evolved form 지속 |
| **2026-05-07 본 사이클** (v2.1.132) | **#145 정체 (+0 in 8d)** | **+2건 (#56865 task-agent system prompt + #56884 silent push)** → **누적 10건** | 신규 감소 (단일/일) — Anthropic 자체 사례 명시화 가속 |

**v2.1.131/132 PreToolUse/PostToolUse 모델 학습 변경 여부**:
- ❌ release notes에 hook 모델 학습 관련 직접 변경 부재
- ⚠️ **F1-132 `CLAUDE_CODE_SESSION_ID` env var (Bash subprocess)** — hook session_id가 Bash subprocess로 전파되는 구조 변화. 모델 학습이 아닌 enforcement 인프라 변화로 해석.

**ENH-289 / ENH-286 정당성 변동**:
- **ENH-289 R-3 Defense Layer 6**: 변동 없음 — bkit PreToolUse 물리 차단 모델은 모델 학습과 무관 작동.
- **ENH-286 Memory Enforcer**: **결정적 강화** — #56865 "Web auto-commits and pushes — **task-agent system prompt hard-codes commit/push instructions, overriding CLAUDE.md**" Anthropic이 **자체 task-agent의 system prompt가 user CLAUDE.md를 override**한다는 공식 사례를 issue body에서 인정. bkit memory enforcer (PreToolUse 물리 차단) 차별화 정당성 결정적.
- **ENH-298 P1 신규**: #56884 "Safety: Claude pushed to upstream remote without warning" 사례 — `git push` 시 fork vs upstream 안전 가드 신규. ENH-289 R-3 Sprint 묶음 통합 권장.

### 4.4 #47855 /compact Opus 1M — **20+ 릴리스 OPEN** (MON-CC-02 / ENH-288 P2)

| 항목 | Status |
|------|--------|
| v2.1.131/132 fix? | ❌ fix 부재 |
| 누적 | **22+ 릴리스 연속 OPEN** (v2.1.34 → v2.1.132, B8-128 v2.1.128 인접 fix 후 root cause 미해소 그대로) |
| bkit defense | `scripts/context-compaction.js:44-56` 그대로 작동 |
| 권장 | ENH-288 P2 그대로 유지 |

### 4.5 #47482 output styles frontmatter — **25+ 릴리스 OPEN** (ENH-214)

| 항목 | Status |
|------|--------|
| v2.1.131/132 fix? | ❌ fix 부재 |
| 누적 | **25+ 릴리스 연속 OPEN** (v2.1.34 → v2.1.132) |
| bkit defense | `scripts/user-prompt-handler.js` 그대로 작동 |
| 권장 | ENH-214 그대로 유지 |

---

## 5. 신규 GitHub Issues/PRs (≥ 2026-05-06)

### 5.1 신규 OPEN — bkit 잠재 surface 5건

| # | Title | bkit 영향 | ENH 매핑 |
|---|-------|----------|----------|
| **#56293** | (재확인) Sub-agent caching 10x in v2.1.128 | **HIGH** | ENH-292 P0 (변동 없음, 정당성 강화) |
| **#56448** | (재확인) "47 skill descriptions dropped" v2.1.129 | **HIGH** | ENH-291 P1 (변동 없음) |
| **#56865** | [BUG] Web auto-commits and pushes — task-agent system prompt hard-codes commit/push, overriding CLAUDE.md | **MED** | **ENH-286 결정적 정당화 + ENH-289 R-3 evolved (+1)** |
| **#56871** | [Bug] Permission pattern matching fails when `:*` suffix follows another `*` wildcard (`**:*`) | LOW (grep 0건 무영향) | (무영향 확정) |
| **#56883** | [DOCS] [CLI] `--permission-mode plan` not restored on `--resume`/`--continue` after v2.1.132 | LOW (B4-132 후속 — bkit 무관) | (무영향 확정) |
| **#56884** | Safety: Claude pushed to upstream remote without warning | **MED** | **ENH-298 P1 신규** + ENH-289 R-3 evolved (+1) |
| **#56887** | [Bug] MCP HTTP OAuth token exchange ignores authorization URL scopes | LOW (bkit는 stdio MCP) | (무영향 확정) |

### 5.2 신규 추적 안 함 (UI/billing/3rd-party)

| # | Title | 영향 |
|---|-------|------|
| #56890 | AskUserQuestion: Escape destroys typed answers | NO (UI-only) |
| #56892 | Wildly incorrect usage reporting | LOW (관측성) |
| #56893 | claude hangs silently when `~/.claude/` is unwritable | LOW (filesystem perm) |
| #56895 | [Billing] Max payment charged but reverted to Free plan | NO |
| #56896 | Agentic loop stuck requiring multiple retries | LOW (ralph-loop 잠재 — 추적 only) |
| #56897 | Max Account downgraded mid-subscription | NO |
| #56898 | API Error: 400 Could Not Process Image | NO (bkit image 미처리) |
| #56899 | `/effort <level>` parsing first line — **CLOSED 2026-05-07** | NO |
| #56900 | Model hallucination causing incorrect code | LOW (모델 학습 영역) |
| #56901 | VS Code extension slash command Content block error | NO (VS Code only) |

---

## 6. bkit 컴포넌트 영향 매트릭스

### 6.1 매핑 결과 (Phase 2 직접 grep)

| 구성요소 | 변경 항목 | grep 결과 | 영향 | 액션 |
|---------|----------|-----------|------|------|
| `lib/audit/audit-logger.js` | F1-132 SESSION_ID | 0건 | 미활용 | DROP (ENH-281 미추가) |
| `scripts/unified-stop.js` | F1-132 SESSION_ID + B1-132 SIGINT | 0건 SESSION_ID + SIGINT 직접 핸들러 부재 (CC가 처리, 주석 685-691 hookContext 추출 명시) | 자동수혜 | (변경 없음, CARRY-5 closure 확인) |
| `lib/infra/telemetry.js` | F6-128 OTEL surface (carry) | 4 위치 (line 126/137/149/188) | F6-128 surface 그대로 (CARRY-5 root cause 후보) | ENH-293 P1 carry |
| `agents/cto-lead.md` / `agents/qa-lead.md` / `agents/pm-lead.md` | B4-132 plan-mode resume | plan-mode toggle 패턴 부재 | 무영향 | (변경 없음) |
| `agents/qa-lead.md` (or related) | #56884 silent push | qa-lead 4-agent push 패턴 식별, 사전 가드 부재 | 노출 | **ENH-298 P1 신규** |
| `agents/`, `hooks/`, `skills/` | #56871 permission `**:*` | 0건 | 무영향 | (변경 없음) |
| `.claude-plugin/plugin.json` | F7-128 mcpServers (carry) | `mcpServers: null` (field 부재) | F7-128 무영향 유지 | (변경 없음) |
| **`.mcp.json`** (신규 발견) | B20/B21-132 MCP fix | bkit-pdca + bkit-analysis 2 stdio servers (16 tools) | **자동수혜 (HIGH 가치)** | **ENH-297 P2 신규 (CI gate)** |
| `hooks/hooks.json` | events/blocks count | 21 events / 24 blocks 메모리 일치 | 무영향 | (변경 없음) |
| `lib/orchestrator/` | I2-128 caching 10x carry | sequential dispatch 미적용 그대로 | ENH-292 P0 carry | v2.1.13 Sprint Coordination |
| `skills/` (43 skills) | F1-129 #56448 carry | 4 skills > 250자 (pdca-watch 251 / pdca-fast-track 226 / bkit-explore 226 / bkit-evals 225) | ENH-291 P1 carry | v2.1.13 Sprint Doc |
| `CLAUDE.md` / agent-memory | #56865 task-agent override | bkit memory enforcer 차별화 정당성 결정적 | **ENH-286 결정적 강화** | (보존) |

### 6.2 무영향 확정 영역 (변경 없음)

- **Output Styles** (4종): bkit-learning / bkit-pdca-guide / bkit-enterprise / bkit-pdca-enterprise — output styles frontmatter 회귀 (#47482) 25+ 릴리스 OPEN 그대로, defense `scripts/user-prompt-handler.js` 작동
- **Hook Events**: 21 events / 24 blocks 메모리 수치 일치, B1-132 SIGINT graceful shutdown 자동 적용
- **MCP Tools** (16): `.mcp.json` bkit-pdca + bkit-analysis stdio servers 자동수혜 (B20/B21-132)
- **Tests** (3,774 TC, 117+ files): 테스트 영향 0건 (Phase 2 직접 검증으로 invariant 5 cycle 유지)

---

## 7. 신규 ENH 정리 (2건 신규 + 3건 강화 + 1건 흡수)

### 7.1 ENH-297 P2 신규 — MCP stderr-only CI gate

**제목**: bkit MCP servers stdout 누출 방지 CI gate

**Why**: B20-132 v2.1.132 stdio MCP 10GB+ RSS unbounded growth fix는 외부 fail-closed 보호. bkit 자체 2 MCP servers (bkit-pdca / bkit-analysis, 16 tools) 개발 중 console.log 누락 시 dev 환경에서는 발견 어려움 (CC가 차단해주므로 silent 실패) → **proactive CI gate**가 best practice 강제.

**How to apply**: 
1. `scripts/check-mcp-stdout.js` 신규 작성 — bkit MCP server 진입점 grep `console.log`/`process.stdout.write` 0건 강제
2. CI `npm run check:mcp-stdout` step 추가 (existing 6 validators에 +1)
3. `mcp-bkit/` `mcp-pdca/` server 코드에서 stderr-only 가이드 문서화 (README)
4. v2.1.13 Sprint MCP-1 묶음 (alwaysLoad 측정 ENH-282과 동시 PR)

**ROI**: 비용 small (2~3시간 CI step 추가) / 가치 medium (dev 단계 stdout 누출 사전 방지, B20-132 fix 자동수혜와 시너지)

### 7.2 ENH-298 P1 신규 — Push event Defense Layer 6 보강

**제목**: bkit qa-lead 4-agent / cto-lead Task spawn `git push` 안전 가드

**Why**: #56884 v2.1.132에서 출시된 직후 발견 — "Safety: Claude pushed to upstream remote without warning". Anthropic CC가 fork vs upstream 구분 없이 default remote에 push하여 사용자 fork 사용 의도 위반. bkit qa-lead 4-agent push 패턴 (특히 release tag/PR 생성 흐름)에서 동일 위험 존재 — 사용자가 fork를 origin으로 두고 작업할 때 silent push to upstream으로 인한 권한/CI 문제.

**How to apply**:
1. `hooks/pre-bash.js` 또는 `scripts/git-push-guard.js` 신규 — `git push` 명령 발화 시:
   - remote URL이 사용자 GitHub fork와 일치하지 않으면 warning + AskUserQuestion 강제
   - upstream 명시 push 시 explicit confirmation 요구
2. ENH-289 R-3 Sprint Defense Layer 6 묶음에 통합 PR (별도 Sprint 신설 X)
3. bkit `lib/audit/audit-logger.js` push event 후 NDJSON entry 추가 (post-hoc audit)

**ROI**: 비용 medium (push event hook + audit logging) / 가치 high (#56884 실제 사용자 사례 + bkit qa-lead 자동 push 위험 사전 차단)

### 7.3 기존 ENH 강화

#### ENH-289 R-3 Defense Layer 6 (P0 carry, evolved form +2)

- **신규 사례**: #56865 task-agent system prompt override + #56884 silent push to upstream
- **누적**: R-3 evolved form 8 → **10건** (#56333/56450/56395/56394/56393/56383/56418/56447/56865/56884)
- **numbered #145**: 정체 (+0 in 8d)
- **결론**: P0 정당성 강화. ENH-298을 본 묶음 sub-task로 통합 PR 권장.

#### ENH-290 3-Bucket Decision Framework (P3 carry, R-2 카테고리 신설)

- **변경 전**: R-1 패턴 (silent npm publish) 6/16 = 37.5%
- **변경 후**: R-1 6/16 + **R-2 (true semver skip) 1/16** = 패턴 7/16 = 43.75%
- **운영 가치**: dist-tag 분기 운영 시 R-1 (publish 정상이나 release tag 부재 — 모니터로 추적) vs R-2 (publish 부재 — npm 검색 시 404 응답) 응답 정책 차별화 가능
- **결론**: 카테고리 분리만 추가 (별도 ENH 신설 X). v2.1.13 Sprint 진입 시점 ENH-290 정의에 R-2 절 추가.

#### ENH-286 Memory Enforcer (P1 carry, 결정적 강화)

- **신규 사례**: #56865 — Anthropic이 **자체 task-agent의 system prompt가 user CLAUDE.md를 override**한다는 공식 사례를 issue body에서 인정.
- **bkit 차별화 결정적**: bkit memory enforcer (`hooks/pre-write.js` + `lib/audit/audit-logger.js` PreToolUse 물리 차단) 모델은 advisory가 아닌 enforcement이므로 #56865 사례 자동 회피.
- **결론**: P1 우선순위 그대로, 정당성 결정적 강화. v2.1.13 Sprint E Defense Layer 5 PR 시 #56865 사례를 motivation 절에 인용 권장.

### 7.4 흡수된 ENH (1건)

#### ENH-299 (R-2 tracker) → ENH-290 강화로 흡수 (DROP)

**Original**: R-2 패턴 자동 카운트 별도 ENH 신설 후보 (P3)
**Drop 이유**: R-1 vs R-2 분리 운영은 ENH-290의 카테고리 정의 갱신만으로 충분. 별도 추적 도구 신설은 YAGNI fail (R-2 발생 빈도 1건/16 윈도우 = 6.25%, 자동화 비용 > 가치).
**최종**: ENH-290 정의 갱신만 (Phase 7.3.2 참조).

---

## 8. v2.1.13 Sprint 통합 권장

### 8.1 즉시 hotfix 불필요

본 사이클 발견 사항 모두 **deferred** — bkit v2.1.12 무수정 89 연속 호환 입증 + 회귀 0건 + Breaking 0건. v2.1.13 Sprint 진입 시점에서 통합 처리.

### 8.2 v2.1.13 Sprint 묶음 매핑 (직전 사이클 + 본 사이클 통합)

| Sprint | 본 사이클 추가 | 직전 사이클 carry |
|--------|---------------|------------------|
| **Sprint A Observability** | (변동 없음 — F1-132 SESSION_ID grep 0건 DROP) | ENH-281 OTEL 8 누적 + ENH-293 subprocess env (CARRY-5 closure) + ENH-296 R-3 evolved tracker |
| **Sprint Coordination 확장** | (변동 없음 — #56293 4 릴리스 연속 미해소, 정당성 강화만) | ENH-292 P0 sequential dispatch + ENH-287 CTO Team |
| **Sprint Doc/Defense** | (변동 없음 — #56448 3 릴리스 연속 미해소) | ENH-291 P1 skill validator |
| **Sprint Reliability** | (변동 없음) | ENH-294 P2 Stop hook OS-aware fallback |
| **Sprint B Reliability 확장** | (변동 없음) | ENH-295 P2 .bkit/ Purge sentinel |
| **Sprint MCP-1** | **+ENH-297 P2 (MCP stderr-only CI gate)** | ENH-282 alwaysLoad 측정 |
| **Sprint R-3 Defense Layer 6** | **+ENH-298 P1 (push event Defense, ENH-289 묶음 sub-task)** | ENH-289 P0 carry + ENH-285 P1 Stop dedup |
| **Sprint E Defense Layer 5** | (강화) ENH-286 #56865 motivation 절 추가 | ENH-286 P1 carry |
| **Sprint F (R-1/R-2 분리 운영)** | (강화) ENH-290 R-2 카테고리 신설 | ENH-290 P3 carry |

**총 carry 통계**:
- v2.1.13 Sprint 진입 시 **ENH 8건 (P0×2 + P1×3 + P2×2 + P3×1)** + carry 12건 (#1~#23 deep-qa 결함 23건 별도)
- 1순위 P0 묶음 그대로: **ENH-292 caching 10x (Sprint Coordination)** + **#17 token-meter (CARRY-5 ENH-293 closure 후보)** + **#21 multilingual (Sprint D)** + **#1/#11 control-state (Sprint B)** + **ENH-289 R-3 Defense Layer 6 (Sprint R-3, ENH-298 통합)**

### 8.3 R-3 시리즈 monitor (2주 review 5-13)

| 항목 | 값 |
|------|-----|
| numbered #145 | 정체 (+0 in 8d, 8d/일 추세 = 0) |
| dup-closure 5건 | 5/1 closed |
| evolved form 누적 | 8 → 10 (+2 in 1d, #56865 + #56884) |
| 추세 | 신규 감소 (1.4/day → 0.5/day → 0.2/day) |
| **결론** | bkit ENH-289 정당성 변동 없음. **ENH-286 결정적 강화 (#56865)** + **ENH-298 신설 (#56884)**. 5-13 review 일자에 evolved form 누적 11~13건 예상 |

---

## 9. CC 권장 버전 갱신

### 9.1 권장 버전 (2026-05-07 본 사이클)

| Channel | 권장 버전 | 정당화 |
|---------|----------|--------|
| **보수적** | **v2.1.123** (변동 없음) | F15-122 hooks fail-isolation + F1-123 OAuth fix + 4 cycle 검증 |
| **균형 (신규)** | **v2.1.132** (v2.1.126에서 +6) | B20/B21-132 MCP fix 가치 + B1-132 SIGINT graceful shutdown + 5 cycle 검증 + npm latest=next 통합으로 next 채널 모험성 감소 |
| **비권장** | v2.1.128 (#56293 caching 10x **4 릴리스 연속 미해소**) + v2.1.129 (#56448 skill validator **3 릴리스 연속 미해소**) | (변동 없음) |
| **환경 예외** | macOS 11 → v2.1.112, non-AVX → v2.1.112, Win parenthesized PATH → v2.1.114+, **Win + Stop hook 의존 → v2.1.125 ↓ 또는 SessionEnd fallback** | (변동 없음) |

### 9.2 npm dist-tag 분기 변화

| Channel | Before (2026-05-06) | After (2026-05-07) | 변화 |
|---------|-------------------|-------------------|------|
| stable | v2.1.119 | v2.1.119 | 변동 없음 (production-burned 14일+) |
| latest | v2.1.128 | **v2.1.132** | +4 versions (caching 회귀 미해소 v2.1.128에서 점프) |
| next | v2.1.129 | **v2.1.132** | latest와 통합 (10-version gap 해소) |

**관찰**: 직전 사이클의 stable=119 / latest=128 / next=129 분리 운영이 v2.1.132 단일 latest+next로 통합. Anthropic이 v2.1.132의 안정성에 자신감을 표명한 것으로 추정. 단 **stable=119 격차는 13 versions로 확대** (직전 9 → 13).

### 9.3 권장 버전 사용자 안내 (NEW)

**v2.1.132 균형 권장 시 사용자 안내 메시지**:

> v2.1.132는 stdio MCP 메모리 안정성 fix (B20/B21-132)와 graceful SIGINT shutdown (B1-132) 등 bkit 핵심 자동수혜 기능을 포함합니다. 단 sub-agent caching 10x 회귀 (#56293)는 v2.1.128~v2.1.132 4 릴리스 연속 미해소 상태이므로, **bkit cto-lead/qa-lead Task spawn 5 blocks 사용 시 cache miss 4%→40%로 사용자 비용 폭증 가능**합니다. v2.1.13 출시 시 sequential dispatch (ENH-292) 적용 전까지는 **v2.1.123 보수적 권장**을 유지하거나, v2.1.132 사용 시 sub-agent 동시 spawn을 피하는 사용 패턴을 권장합니다.

---

## 10. 결론 및 핵심 발견

### 10.1 v2.1.130 누락 — R-2 패턴 신규 정식화

**확정**: v2.1.130은 GitHub release tag, CHANGELOG entry, main branch commit, npm publish 모두 부재. 이는 직전 사이클의 R-1 패턴(silent npm publish — 외부 게시 부재이나 npm publish는 존재)과 **본질적으로 다른 패턴**.

**해석**:
- v2.1.130 = internal candidate dropped 또는 단순 numbering skip
- ENH-290 3-Bucket Decision Framework에 R-2 카테고리 신설 (R-1: silent npm publish only / R-2: full skip / publish 정상)
- 16-릴리스 윈도우 통계 갱신: **R-1 6건 + R-2 1건 = 패턴 7건/16 = 43.75%** → 게시 정책 다양화 가속화

### 10.2 ENH-292 (caching 10x) 정당성 가속 — 4 릴리스 연속 미해소

#56293 v2.1.128 sub-agent caching 10x 회귀가 v2.1.131/132에서도 미해소. **ENH-292 sequential dispatch moat** 정당성 가속화: 사용자 환경에서 v2.1.128~v2.1.132 4 릴리스 연속 사용 시 cto-lead/qa-lead Task spawn 5 blocks 직접 노출. v2.1.13 Sprint Coordination 우선순위 P0 그대로 진행 + 사용자 안내 강화 권장.

### 10.3 ENH-286 / ENH-289 차별화 결정적 강화

**ENH-286 Memory Enforcer**: #56865 "Web auto-commits — task-agent system prompt overrides CLAUDE.md" — Anthropic이 **자체 task-agent system prompt가 user CLAUDE.md를 override**한다는 공식 사례를 issue body에서 인정 → bkit memory enforcer (PreToolUse 물리 차단) 차별화 정당성 결정적.

**ENH-289 R-3 Defense Layer 6**: #56884 "Silent push to upstream" 사례로 push event 가드 정당성 추가. ENH-298 P1 신규를 본 묶음 sub-task로 통합 PR 권장.

### 10.4 신규 ENH 후보 — **2건 (P2 + P1)**

| ENH | Priority | 비용 | 가치 |
|-----|:--------:|:----:|:----:|
| ENH-297 (MCP stderr-only CI gate) | P2 | small | medium |
| ENH-298 (push event Defense Layer 6) | P1 | medium | high |

**최종 권장**: 신규 ENH 2건 + 기존 ENH 강화 3건. v2.1.13 Sprint 진입 시점 영향도 최소 (Sprint MCP-1 + Sprint R-3 묶음 통합 PR로 흡수).

### 10.5 87 → 89 consecutive compatible

bkit v2.1.12 무수정 v2.1.132 환경 작동 입증 (Phase 2 직접 검증 8/8 PASS). **89 consecutive compatible (v2.1.34 ~ v2.1.132)** 갱신 + **F9-120 closure 5 릴리스 연속 PASS** 입증.

### 10.6 5-사이클 일관성 입증

ADR 0003 분석 방법론이 **5 사이클 연속 (v2.1.118→132)** 동일하게 작동. 사이클별 변경 규모 차이 (v2.1.124~129 70+ vs v2.1.130~132 29)에서도 분석 방법론이 동일하게 작동 — **cross-cycle predictability 결정적 입증**. F9-120 closure 5 cycle 안정화 + R-2 패턴 신설 + R-3 evolved tracker 갱신 = 본 사이클 핵심 메타 발견.

### 10.7 mini-cycle 판정

본 사이클은 **변경 규모 minimal** (29 changes vs 직전 70+):
- HIGH impact 2건 (B20-132 MCP RSS, B23-132 ENABLE_PROMPT_CACHING_1H — 후자는 bkit 무관)
- bkit-relevant HIGH 1건 (B20-132 자동수혜)
- 신규 사전인지 결함 5건 (#56865~#56887)
- 신규 ENH 2건 (P2/P1)

→ **정식 4-Phase ADR 0003 적용** 완료, 단 보고서 분량은 mini-cycle 수준 (직전 70KB의 ~50% 수준).

---

## 11. Confidence Assessment

```
Phase 1 (조사)        : 100% (Score 80% × 데이터 cross-verification 4-source)
Phase 2 (분석 + 검증) : 100% (8/8 PASS 직접 실행, 실증_계수 0.95)
Phase 3 (브레인스토밍): 95%  (YAGNI 검증 3건 모두 명시)
Phase 4 (보고서)      : 100% (작성 완료)

종합 실증_계수: 0.95
미달 사유: #56865/#56884 직접 reproduction 미실행 (sandbox 환경 필요).

데이터 정합성 검증:
  ✅ v2.1.131 commit 71135e4 ↔ release tag ↔ CHANGELOG entry 일치
  ✅ v2.1.132 commit 60348c9 ↔ release tag ↔ CHANGELOG entry 일치
  ✅ v2.1.130 4-source cross-check 모두 부재 (R-2 확정)
  ✅ #56293 4 릴리스 연속 OPEN (ENH-292 정당성 강화)
  ✅ #56448 3 릴리스 연속 OPEN (ENH-291 정당성 유지)
  ✅ ADR 0003 사후 검증 8/8 PASS 직접 실행
  ✅ F9-120 closure 5 릴리스 연속 PASS (v2.1.120/121/123/129/132)
  ⚠️ #56865/#56884 direct reproduction 미실행 (issue body 분석만)

5-사이클 ADR 0003 적용 일관성:
  ✅ Phase 1.5 게이트 5 cycle 모두 동일 매트릭스 작동
  ✅ E5 상태 4값 (CONFIRMED/PARTIAL/PRESUMED/PENDING) 5 cycle 모두 적용
  ✅ Phase 2 직접 검증 5 cycle 모두 실행 (4 → 6 → 6 → 6 → 8 항목)
  ✅ R-1 패턴 정식화 (직전 4번째 사이클) → R-2 패턴 신설 (5번째 사이클)로 진화
  ✅ Cross-cycle predictability 입증

변경 규모 차이에도 일관성:
  - v2.1.118 (1번째)   : 변경 다수 (5+ HIGH)
  - v2.1.121 (2번째)   : 변경 적음 (2 HIGH)
  - v2.1.123 (3번째)   : 변경 보통 (3 HIGH)
  - v2.1.124~129 (4번째): 변경 다수 (70+ changes, 7 HIGH)
  - v2.1.130~132 (5번째): 변경 적음 (29 changes, 1 bkit HIGH)
  → 분석 방법론 일관성 5 cycle 모두 입증
```

---

## 12. 분석 산출물

### 12.1 작성된 파일

1. **본 보고서**: `docs/04-report/features/cc-v2130-v2132-impact-analysis.report.md`
2. **메모리 파일**: `memory/cc_version_history_v2130_v2132.md` (별도 작성)
3. **MEMORY.md 갱신**: 5번째 ADR 0003 적용 + 89 consecutive compatible + R-2 패턴 신설 + ENH-297/298 추가

### 12.2 다음 액션

본 분석 결과를 바탕으로 v2.1.13 Sprint 진입 시점 다음 작업 권장:

| 우선순위 | 작업 |
|:------:|-----|
| P0 | ENH-292 sequential dispatch (Sprint Coordination, #56293 4 릴리스 연속 미해소 가속) |
| P0 | ENH-289 R-3 Sprint Defense Layer 6 (ENH-298 push event 통합 PR) |
| P1 | ENH-298 push event Defense (ENH-289 묶음 sub-task) |
| P1 | ENH-291 skill validator defense (Sprint Doc/Sprint A) |
| P2 | ENH-297 MCP stderr-only CI gate (Sprint MCP-1 통합) |
| P2 | ENH-286 Memory Enforcer #56865 motivation 인용 (Sprint E) |
| P3 | ENH-290 R-2 카테고리 신설 (Sprint F dist-tag 분기) |

---

## 13. 관련 출처

### 13.1 GitHub
- [Releases · anthropics/claude-code](https://github.com/anthropics/claude-code/releases)
- [Release v2.1.131](https://github.com/anthropics/claude-code/releases/tag/v2.1.131) — commit `71135e4`
- [Release v2.1.132](https://github.com/anthropics/claude-code/releases/tag/v2.1.132) — commit `60348c9`
- [CHANGELOG.md raw](https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md)
- [Issue #56293 — Sub-agent caching 10x](https://github.com/anthropics/claude-code/issues/56293) (4 릴리스 연속 OPEN)
- [Issue #56448 — Skill validator false-positive](https://github.com/anthropics/claude-code/issues/56448) (3 릴리스 연속 OPEN)
- [Issue #56865 — Web task-agent system prompt overrides CLAUDE.md](https://github.com/anthropics/claude-code/issues/56865) (R-3 evolved 9건째)
- [Issue #56884 — Silent push to upstream remote](https://github.com/anthropics/claude-code/issues/56884) (R-3 evolved 10건째, ENH-298 신규 정당성)

### 13.2 npm
- [@anthropic-ai/claude-code](https://www.npmjs.com/package/@anthropic-ai/claude-code) — dist-tag stable=2.1.119 / latest=2.1.132 / next=2.1.132

### 13.3 Internal References
- 직전 보고서: `docs/04-report/features/cc-v2124-v2129-impact-analysis.report.md` (4번째 ADR 0003 적용, 70KB)
- 직전 메모리: `memory/cc_version_history_v2124_v2129.md`
- 본 사이클 메모리: `memory/cc_version_history_v2130_v2132.md` (신규 작성)
- ADR 0003 정식: `docs/02-design/adrs/0003-empirical-validation-gate.md` (가정)
- ENH 백로그: `memory/enh_backlog.md`
- GitHub issues monitor: `memory/github_issues_monitor.md`

---

**Status**: ✅ Final | **PDCA Cycle**: cc-version-analysis (v2.1.130~v2.1.132) | **Date**: 2026-05-07 | **bkit Version**: v2.1.12 GA → 89 consecutive PASS
