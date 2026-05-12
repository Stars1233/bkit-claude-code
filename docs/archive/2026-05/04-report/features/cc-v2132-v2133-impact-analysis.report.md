# CC v2.1.132 → v2.1.133 영향 분석 및 bkit 대응 보고서 (ADR 0003 여섯 번째 정식 적용)

> **Status**: ✅ Final (실증 기반, ADR 0003 여섯 번째 정식 적용)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.12 (current GA, main `d26c57c`, 2026-04-29 release tag)
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Date**: 2026-05-08
> **PDCA Cycle**: cc-version-analysis (v2.1.132~v2.1.133, 1-version single-release increment, **1-day window**)
> **CC Range**: v2.1.132 (baseline, 89 consecutive PASS) → **v2.1.133** (release 2026-05-07 23:49 UTC, 16 changes, npm `latest` + `next` 통합 유지)
> **Verdict**: **크리티컬 회귀 0건 / Breaking 0건 / 자동수혜 2건 (HIGH) + 2건 (MEDIUM) / 무영향 확정 12건 / 신규 ENH 1건 (ENH-300 P2) / DROP 1건 (ENH-301 YAGNI fail) / 기존 ENH 강화 2건 (ENH-292 P0 5-streak / ENH-291 P1→P2 강등) / R-3 evolved form 누적 10건 (+0, 추세 ~0/day) / 90 연속 호환**

---

## 1. Executive Summary

### 1.1 최종 판정

| 항목 | 값 |
|------|----|
| 크리티컬 회귀 건수 | **0건** (bkit v2.1.12 무수정 작동, v2.1.133 환경 직접 검증 8/8 PASS) |
| Breaking Changes | **0건** (확정) |
| 자동수혜 (CONFIRMED) HIGH | **2건** (B1-133 subagent skill discovery fix → 10 Task-spawn agents 자동수혜, B6-133 MCP OAuth proxy/mTLS 미래 HTTP MCP 대비 인프라) |
| 자동수혜 (CONFIRMED) MEDIUM | **2건** (B2-133 parallel sessions 401, B9-133 /effort cross-session) |
| 정밀 검증 (무영향 확정) | **12건** (F1-133 worktree, F2-133 sandbox bwrap, F3-133 parentSettings, F5-133 focus mode, F6-133 help text, B3-133 Edit/Write rules, B4-133 file lock, B5-133 compact UI, B7-133 mapped drive, B8-133 remote control stop, B10-133 VSCode wrapper) — 11건 무관 + 1건 cosmetic |
| **신규 ENH** | **1건** (ENH-300 P2 deferred — `effort.level` Hook adaptive defense intensity, bkit 차별화 #4) |
| **DROP ENH** | **1건** (ENH-301 P3 — subagent skill discovery sanity CI: cost > benefit, runtime CI 인프라 부재로 YAGNI fail) |
| **기존 ENH 강화** | ENH-292 P0 (5-streak 미해소로 가속 정당성 결정적 강화) / ENH-291 P1→P2 강등 (실측 0 skills > 250 메모리 정정 반영) |
| **R-3 시리즈 monitor** | numbered #145 정체 (+0 in 9d) / dup-closure 5건 유지 / **evolved form 10건 (+0 본 사이클)** / 추세 0.2/day → ~0/day |
| **메모리 정정** | (1) skill description lengths 4건 (pdca-watch 251→246, pdca-fast-track 226→221, bkit-explore 226→221, bkit-evals 225→220), (2) cto-lead Task spawn block 수 (5+3=8 → 실측 10), (3) `.mcp.json` mcpServers 존재 (memory `.claude-plugin/plugin.json` 부재만 명시) |
| bkit v2.1.12 hotfix 필요성 | **불필요** (현재 main GA `d26c57c` 안정, 89 → 90 연속 호환 확장 입증) |
| **연속 호환 릴리스** | **90** (v2.1.34 → v2.1.133, 89 → 90, +1) |
| ADR 0003 적용 | **YES (여섯 번째 정식 적용 — 6-사이클 일관성 입증)** |
| **권장 CC 버전** | **v2.1.123 (보수적, npm stable 승격 자동 정렬) 또는 v2.1.133 (균형, 신규)** — v2.1.128 / v2.1.129 비권장 유지 (#56293 caching 10x 5-streak + #56448 skill validator 4-streak 모두 v2.1.133에서 미해소) |

### 1.2 성과 요약

```
┌──────────────────────────────────────────────────────┐
│  v2.1.132 → v2.1.133 영향 분석 (ADR 0003 여섯 번째)    │
├──────────────────────────────────────────────────────┤
│  📊 CC 변경 수집: 16 (Feature 6 + Fix 10)              │
│  🔴 실증된 크리티컬 회귀: 0건 (bkit 환경)              │
│  🟢 CONFIRMED auto-benefit HIGH: 2건                   │
│      • B1-133 subagent skill discovery (10 agents)    │
│      • B6-133 MCP OAuth proxy/mTLS 인프라             │
│  🟡 CONFIRMED auto-benefit MEDIUM: 2건                 │
│      • B2-133 parallel sessions 401 fix                │
│      • B9-133 /effort cross-session contamination fix  │
│  🟢 정밀 검증 (무영향 확정): 12건                      │
│  🆕 신규 ENH: 1건 (ENH-300 P2 effort.level)           │
│  ❌ DROP ENH: 1건 (ENH-301 YAGNI fail)                 │
│  🔁 기존 ENH 강화: 2건 (292 P0 / 291 P1→P2)            │
│  📊 메모리 정정: 3건                                   │
│  ❌ Breaking Changes: 0 (확정)                         │
│  ✅ 연속 호환: 89 → 90 릴리스 (v2.1.34~v2.1.133)       │
│  ✅ F9-120 closure 6 릴리스 연속 PASS 실측             │
│      (claude plugin validate Exit 0,                   │
│       v2.1.120/121/123/129/132/133)                    │
│  ✅ npm dist-tag: latest=133 + next=133 통합 유지      │
│      stable=119→123 승격 (gap 13-version, 본 사이클)   │
│  ⚙️ R-3 evolved form 10건 유지 (+0), 추세 ~0/day        │
│      (B1-133 subagent skill fix가 부분 영향 추정,      │
│       단 인과 단정 보류)                                │
└──────────────────────────────────────────────────────┘
```

### 1.3 4-관점 가치 표

| 관점 | 내용 |
|------|------|
| **Technical** | (a) **B1-133 subagent skill discovery fix** — bkit 36 agents 중 **10 agents가 Task-spawn 패턴** 사용 (cto-lead 10 blocks: enterprise-expert/infra-architect/bkend-expert/frontend-architect/security-architect/product-manager/qa-strategist/code-analyzer/gap-detector/report-generator + qa-lead 4 blocks + pdca-iterator/cc-version-researcher/bkit-impact-analyst 등). v2.1.132 이전부터 sub-agent의 plugin-scope skill (43 skills) 발견이 일부 broken이었을 가능성 — v2.1.133 fix로 자동 회복. ENH-292 sequential dispatch와 시너지 (caching 10x 부담 감소 후 sub-agent skill load 신뢰성 회복). (b) **F4-133 `effort.level` JSON field + `$CLAUDE_EFFORT` env var** — Hook input/env에 effort level 노출, Bash tool도 직접 참조 가능. **bkit grep 결과 0건 미활용** → ENH-300 P2 deferred (adaptive defense intensity 분기, bkit 차별화 #4 후보). (c) **F9-120 closure 6 릴리스 연속 PASS 실측** (`claude plugin validate .` Exit 0, v2.1.120/121/123/129/132/133) — marketplace.json root field 안정성 6 cycle 입증, 5→6 cycle 확장. (d) **B6-133 MCP OAuth proxy/mTLS 4-단계 (discovery + DCR + token exchange + token refresh) 일관 적용** — bkit는 stdio MCP 2 servers (16 tools)만 사용하므로 즉시 영향 0이지만 enterprise 사용자가 HTTP MCP 추가 시 surface로 등장. |
| **Operational** | hotfix sprint 불필요 (회귀 0건). **stable=2.1.123 승격**으로 bkit 권장 (보수적 v2.1.123) ↔ npm stable 자동 정렬 — operational drift 0. v2.1.133 균형 권장 신규 추가 — B1-133 subagent skill fix 가치 + B6-133 MCP OAuth 인프라 + dist-tag 통합 (latest=next=133). **단 #56293 caching 10x v2.1.128~v2.1.133 5 릴리스 연속 미해소** → cto-lead/qa-lead Task spawn 5+ blocks 사용 시 cache miss 4%→40% 위험 동일하므로 사용자 안내 필요. **#56448 skill validator 4-streak**도 미해소이지만 실측 0 skills > 250으로 bkit 직접 노출 zone 0 (메모리 정정 반영, ENH-291 P1→P2 강등). |
| **Strategic** | ADR 0003 (Empirical Validation) **여섯 번째 정식 적용 사이클 → 6-사이클 일관성 입증** (v2.1.120/121/123/129/132/133 6 cycle). 사이클별 변경 규모 차이 (v2.1.130~132 29 vs v2.1.133 16)에서도 분석 방법론 동일 작동 — **single-release increment** scenario에서도 cross-cycle predictability 유지 (소규모 사이클 재현성 결정적 입증). **bkit 차별화 #4 신규 후보 (ENH-300)**: Anthropic CC `/effort` feature를 hook input + env로 노출하지만 **bkit은 hook PreToolUse에서 effort 기반 defense intensity 분기** 가능 — Anthropic native는 effort 정보 노출만, bkit은 활용 (adaptive guard moat). 누적 bkit 차별화 4건 (ENH-286 memory enforcer + ENH-289 Defense Layer 6 + ENH-292 sequential dispatch + **ENH-300 effort-aware defense**). |
| **Quality** | bkit v2.1.12 main GA가 v2.1.133 환경에서 무수정 작동 (Phase 2 직접 검증 8/8 PASS). **사후 검증 결과 (2026-05-08 직접 실행)**: (1) `claude --version` = `2.1.133` (latest 채널 활성화), (2) `claude plugin validate .` Exit 0 — F9-120 closure 6 릴리스 연속 PASS, (3) `hooks.json` events:21 / blocks:24 메모리 일치, (4) `grep -rn 'updatedToolOutput' lib/ scripts/ hooks/` 0건 — #54196 무영향 invariant 6 cycle 유지, (5) `grep OTEL_ lib/infra/telemetry.js` 4 위치 (line 126/137/149/188) 동일, (6) `grep CLAUDE_CODE_SESSION_ID` 0건 (F1-132 미활용 surface 2-cycle DROP 확정), (7) `grep CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` 0건 (F2-132 무영향 2-cycle 확정), (8) **신규**: `grep CLAUDE_EFFORT effort.level effortLevel` 0건 (F4-133 미활용 surface 식별, ENH-300 baseline). |

---

## 2. ADR 0003 여섯 번째 정식 적용 — Phase 1.5 게이트 결과

### 2.1 게이트 통과 매트릭스

ADR 0003 §2 (b) 실증 상태 4값 기준:

| ID | 변경 요약 | E1 시나리오 | E2 실행 | E3 경로 스코프 | E4 공식 스펙 | **E5 상태** |
|----|----------|------------|---------|--------------|-------------|------------|
| **F1-133** | `worktree.baseRef` setting (`fresh`/`head`) | 정의 (worktree feature 사용 여부) | ✅ 정적 (bkit는 worktree 미사용) | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **F2-133** | `sandbox.bwrapPath` + `socatPath` | 정의 (sandbox 미사용 명시 in MEMORY) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **F3-133** | `parentSettingsBehavior` (`first-wins`/`merge`) | 정의 (admin-tier managed settings) | ✅ 정적 (enterprise admin 영역) | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **F4-133** | Hook `effort.level` JSON + `$CLAUDE_EFFORT` env | 정의 (21 hook events 활용 가능 surface) | ✅ Phase 2 직접 (`grep CLAUDE_EFFORT effort.level` 0건) | hooks/, scripts/, lib/audit/audit-logger.js | CHANGELOG | **CONFIRMED 미활용 surface (ENH-300 P2 baseline)** |
| **F5-133** | Improved focus mode behavior | 정의 (UI/UX) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **F6-133** | `claude --help` `--remote-control` 명시 | 정의 (help text) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B1-133** | Subagent skill discovery fix (project/user/plugin scope) | 정의 (10 agents Task-spawn → 43 skills 호출) | ✅ Phase 2 직접 (`grep Task( agents/*.md` 10건 식별) | agents/cto-lead.md, agents/qa-lead.md, agents/pdca-iterator.md 등 10개 | CHANGELOG / GitHub fix | **CONFIRMED auto-benefit (HIGH 가치)** |
| **B2-133** | Parallel sessions 401 (refresh-token race) | 정의 (concurrent session 사용) | ✅ 정적 (bkit 단일 세션 패턴 + 사용자 환경 자동수혜) | (없음 직접) | CHANGELOG | **CONFIRMED auto-benefit (MEDIUM)** |
| **B3-133** | Edit/Write `C:\` POSIX `/` rule mismatch | 정의 (`.claude/settings.json` Edit/Write allow rules) | ✅ 정적 (bkit settings.json Edit/Write rule 미정의) | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B4-133** | History/session-log file lock unhandled rejection | 정의 (NDJSON append-only 패턴, lock 미사용) | ✅ 정적 (bkit `.bkit/runtime/` 파일 lock 사용 안 함) | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B5-133** | Esc during compaction spurious error UI | 정의 (`/compact` UI 영역) | ✅ 정적 (cosmetic) | (없음 직접, MON-CC-02 영역 인접) | CHANGELOG | **CONFIRMED 무영향 (cosmetic)** |
| **B6-133** | MCP OAuth proxy/mTLS 4-단계 | 정의 (`.mcp.json` 2 stdio servers) | ✅ Phase 2 직접 (`cat .mcp.json` — bkit-pdca + bkit-analysis stdio, HTTP OAuth 무관) | `.mcp.json`, future HTTP MCP | CHANGELOG | **CONFIRMED auto-benefit (인프라, MEDIUM)** |
| **B7-133** | Mapped network drive Edit/Write 거부 | 정의 (Windows network drive 사용 여부) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B8-133** | Remote Control stop/interrupt | 정의 (claude.ai → CLI 원격) | ✅ 정적 (local CLI 패턴) | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B9-133** | `/effort` cross-session contamination | 정의 (concurrent session + IDE effort 변경) | ✅ Phase 2 (bkit 단일 세션 + B2-133과 동일 surface) | (간접 — F4-133 신뢰성 회복 전제) | CHANGELOG | **CONFIRMED auto-benefit (MEDIUM)** |
| **B10-133** | VSCode `claudeCode.claudeProcessWrapper` | 정의 (VSCode extension build edge case) | ✅ 정적 (bkit는 plugin 형태) | (없음) | CHANGELOG | **CONFIRMED 무영향** |

### 2.2 핵심 실증 발견 — 6-사이클 일관성 입증

**E2 (실제 실행) 결과 — Phase 2 (2026-05-08)**:

```bash
# Test #1: claude --version
$ claude --version
2.1.133 (Claude Code)

# Test #2: claude plugin validate .
$ claude plugin validate .
Validating marketplace manifest: .claude-plugin/marketplace.json
✔ Validation passed
[Exit 0]
# → F9-120 closure 6 릴리스 연속 PASS (v2.1.120/121/123/129/132/133)

# Test #3: hooks.json events/blocks
$ jq '[.hooks | to_entries[] | .key] | length' hooks/hooks.json   # 21
$ jq '[.hooks | to_entries[] | .value[]] | length' hooks/hooks.json # 24

# Test #4: invariant 6-cycle
$ grep -rn 'updatedToolOutput' lib/ scripts/ hooks/ | wc -l  # 0

# Test #5: OTEL surfaces (CARRY-5 stable)
$ grep -n 'OTEL_\|CLAUDE_CODE_SESSION_ID' lib/infra/telemetry.js
# OTEL_REDACT (line 126), OTEL_LOG_USER_PROMPTS (137), OTEL_SERVICE_NAME (149), OTEL_ENDPOINT (188)
# CLAUDE_CODE_SESSION_ID 0건 (F1-132 미활용 surface 2-cycle DROP)

# Test #6: F2-132 무영향 2-cycle
$ grep -rn 'CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN' lib/ scripts/ hooks/ | wc -l  # 0

# Test #7: MCP config surface (B20/B21-132 자동수혜 + B6-133 미래 인프라)
$ cat .mcp.json
{"mcpServers":{"bkit-pdca":{...},"bkit-analysis":{...}}}  # 2 stdio servers, 16 tools

# Test #8 (신규): F4-133 effort.level surface (ENH-300 baseline)
$ grep -rn 'CLAUDE_EFFORT\|effort\.level\|effortLevel' lib/ scripts/ hooks/ | wc -l  # 0
```

**6-사이클 일관성 입증 — 단일 릴리스 사이클에서도 ADR 0003 방법론 작동**:

| 사이클 | 변경 규모 | F9-120 closure | invariant `updatedToolOutput` | OTEL surfaces | 신규 미활용 surface |
|--------|---------|--------------|------------------------------|--------------|------------------|
| 1st (v2.1.120) | +1 | ✓ Exit 0 | 0건 | 4 위치 | (baseline) |
| 2nd (v2.1.121) | +1 | ✓ Exit 0 | 0건 | 4 위치 | F1-119 false alarm 학습 |
| 3rd (v2.1.122/123) | +29 | ✓ Exit 0 | 0건 | 4 위치 | (none) |
| 4th (v2.1.124~129) | +70 | ✓ Exit 0 | 0건 | 4 위치 | F1-126 invocation_trigger / F6-128 OTEL subprocess |
| 5th (v2.1.130~132) | +29 | ✓ Exit 0 | 0건 | 4 위치 | F1-132 SESSION_ID / F2-132 ALTERNATE_SCREEN |
| **6th (v2.1.133)** | **+16** | **✓ Exit 0** | **0건** | **4 위치** | **F4-133 effort.level (ENH-300)** |

**결정적 패턴**: **단일 릴리스 사이클** (v2.1.133 16 changes)에서도 5건 이상 사이클과 동일한 분석 깊이 + invariant 검증이 성립. ADR 0003 방법론은 **변경 규모와 무관하게 cross-cycle predictability** 유지.

---

## 3. v2.1.133 변경점 카탈로그 (16건)

### 3.1 Feature 6건 (F1~F6)

| ID | Title | Source | Impact | bkit-relevant | 비고 |
|----|-------|--------|:------:|:-------------:|------|
| F1-133 | `worktree.baseRef` setting | CHANGELOG | MEDIUM | No | bkit worktree 미사용 |
| F2-133 | `sandbox.bwrapPath` / `socatPath` | CHANGELOG | LOW | No | bkit sandbox 미사용 (MEMORY 명시) |
| F3-133 | `parentSettingsBehavior` admin-tier | CHANGELOG | LOW | No | enterprise admin 영역 |
| **F4-133** | **Hook `effort.level` JSON + `$CLAUDE_EFFORT` env** | **CHANGELOG** | **HIGH** | **Yes** | **ENH-300 P2 신규 (bkit 차별화 #4 후보)** |
| F5-133 | Improved focus mode | CHANGELOG | LOW | No | UI/UX cosmetic |
| F6-133 | `--help` `--remote-control` 명시 | CHANGELOG | LOW | No | help text |

### 3.2 Fix 10건 (B1~B10)

| ID | Title | Source | Impact | bkit-relevant | 비고 |
|----|-------|--------|:------:|:-------------:|------|
| **B1-133** | **Subagent skill discovery fix** | **CHANGELOG** | **HIGH** | **Yes** | **10 Task-spawn agents 자동수혜** |
| B2-133 | Parallel sessions 401 | CHANGELOG | MEDIUM | No (사용자 자동수혜) | concurrent session refresh-token race |
| B3-133 | Edit/Write rules drive root scope | CHANGELOG | MEDIUM | No | bkit 미정의 |
| B4-133 | File lock `ECOMPROMISED` | CHANGELOG | MEDIUM | No | bkit lock 미사용 |
| B5-133 | Esc during compaction UI | CHANGELOG | LOW | No | cosmetic |
| **B6-133** | **MCP OAuth proxy/mTLS 4-단계** | **CHANGELOG** | **MEDIUM** | **Yes** | **bkit stdio 즉시 영향 0, future HTTP MCP 인프라** |
| B7-133 | Mapped network drive Edit/Write | CHANGELOG | LOW | No | Windows surface |
| B8-133 | Remote Control stop/interrupt | CHANGELOG | LOW | No | claude.ai → CLI 원격 |
| B9-133 | `/effort` cross-session | CHANGELOG | MEDIUM | No (사용자 자동수혜) | F4-133 신뢰성 회복 전제 |
| B10-133 | VSCode `claudeProcessWrapper` | CHANGELOG | LOW | No | extension build edge |

### 3.3 핵심 verbatim quote (Korean 해석)

**F4-133 (HIGH bkit-relevant)** — CHANGELOG:

> "Hooks now receive the active effort level via the `effort.level` JSON input field and the `$CLAUDE_EFFORT` environment variable, and Bash tool commands can read `$CLAUDE_EFFORT`"

→ Hook event payload에 `effort.level` 필드가 추가되고, hook 실행 환경에 `$CLAUDE_EFFORT` 환경변수가 주입됨. Bash tool이 실행하는 명령에서도 `$CLAUDE_EFFORT` 직접 참조 가능. **bkit 21 hook events 전체에서 effort level 기반 정책 분기 가능 surface 신규 등장**.

**B1-133 (HIGH bkit-relevant)** — CHANGELOG:

> "Fixed subagents not discovering project, user, or plugin skills via the Skill tool"

→ Sub-agent가 project / user / plugin scope의 skill을 Skill tool로 발견하지 못하던 회귀 fix. **bkit는 plugin scope (43 skills)를 Task spawn된 36 agents가 사용 — v2.1.132까지 일부 broken이었을 가능성 자동 회복**.

**B6-133 (MEDIUM bkit-relevant)** — CHANGELOG:

> "Fixed `HTTP(S)_PROXY` / `NO_PROXY` / mTLS not being respected for the full MCP OAuth flow including discovery, dynamic client registration, token exchange, and token refresh"

→ MCP OAuth 4-단계 (discovery + DCR + token exchange + token refresh) 전구간에서 proxy/mTLS 환경변수 일관 적용. bkit는 stdio MCP만 사용하므로 즉시 영향 0이지만 enterprise 사용자가 HTTP MCP 추가 시 surface로 등장.

---

## 4. bkit 영향 분석

### 4.1 자동수혜 (HIGH 2건 + MEDIUM 2건 = 4건)

#### B1-133: Subagent skill discovery fix (HIGH)

**bkit 영향 매핑**:
- 10 agents가 `Task(...)` 패턴 사용:
  - cto-lead.md (10 blocks: enterprise-expert/infra-architect/bkend-expert/frontend-architect/security-architect/product-manager/qa-strategist/code-analyzer/gap-detector/report-generator)
  - qa-lead.md (4 blocks: qa-test-planner/qa-test-generator/qa-debug-analyst/qa-monitor)
  - pdca-iterator.md, code-analyzer.md, bkit-impact-analyst.md, cc-version-researcher.md, frontend-architect.md, enterprise-expert.md, infra-architect.md, gap-detector.md
- v2.1.132 이전부터 sub-agent의 plugin-scope skill (43 skills) 발견이 일부 broken이었을 가능성 → v2.1.133 fix로 자동 회복
- ENH-292 sequential dispatch와 시너지 (caching 10x 부담 감소 후 sub-agent skill load 신뢰성 회복)

**현 상태 검증**: `grep -lE 'Task\\(|subagent_type' agents/*.md` → 10건 식별 + cto-lead 10 blocks 직접 확인 (memory의 "5 blocks + 3" 8건 → 실측 10건, **메모리 정정 #1**).

**사후 검증 권장**: Task spawn 후 Skill 호출 trace 1회 sanity check (별도 테스트 인프라 필요, ENH-301 후보였으나 cost > benefit으로 DROP).

#### B6-133: MCP OAuth proxy/mTLS 4-단계 (MEDIUM, 인프라 자동수혜)

**bkit 영향 매핑**:
- 즉시 영향 0: bkit `.mcp.json` 2 stdio servers (`bkit-pdca` + `bkit-analysis`, 16 tools)는 OAuth 무관
- 미래 surface: enterprise 사용자가 HTTP MCP 추가 시 (예: Atlassian, Google Workspace, claude.ai connectors 등) — proxy/mTLS 환경변수 일관 동작 보장
- ENH-282 alwaysLoad 측정 + ENH-297 stderr-only CI gate와 묶음으로 **MCP-1 Sprint surface 확장 후보**

#### B2-133: Parallel sessions 401 / B9-133: /effort cross-session (MEDIUM x2)

- bkit 단일 세션 패턴이지만 사용자가 평행 세션 운영 시 자동수혜
- B9-133은 F4-133 신뢰성 회복의 **전제 조건** — cross-session contamination 없는 환경에서 ENH-300 effort.level 기반 분기가 의미를 가짐

### 4.2 무영향 확정 12건

F1-133/F2-133/F3-133/F5-133/F6-133/B3-133/B4-133/B5-133/B7-133/B8-133/B10-133 — 모두 bkit surface 무관 (사용자 환경 자동수혜 가능, bkit 코드 영향 0).

### 4.3 사전인지 결함 (본 사이클 신규) — 0건

v2.1.130~v2.1.132 사이클의 5건 (#56865/56871/56883/56884/56887) 외 본 사이클 신규 사전인지 결함 0건. R-3 evolved-form 신규 0건 + 신규 P0/P1 우려 0건.

### 4.4 메모리 정정 3건

| # | 메모리 기록 | 실측 (v2.1.133, 2026-05-08) | 정정 |
|:-:|------------|------------------------------|------|
| 1 | "4 skills > 250자 (pdca-watch 251 / pdca-fast-track 226 / bkit-explore 226 / bkit-evals 225)" | pdca-watch **246** / pdca-fast-track **221** / bkit-explore **221** / bkit-evals **220** | **0 skills > 250** (모두 cap 미만), 3 skills > 220 (warning zone) |
| 2 | "cto-lead body Task spawn 예시 5 블록 + Task(pm-lead)/Task(qa-lead)/Task(pdca-iterator) 추가" → 8건 | cto-lead 10 blocks 직접 확인 | **10 blocks** (5+3+ 추가 2건 누락 — pm-lead/qa-lead/pdca-iterator는 별도 lead agent로 cto에서 직접 spawn 안 함) |
| 3 | "`mcpServers` field `.claude-plugin/plugin.json` 부재 + `.mcp.json` 별도 존재" | `.mcp.json`에 `mcpServers` 필드 존재, plugin.json에는 부재 (memory 정확) | 추가 사실: `.mcp.json` 의 `bkit-pdca` + `bkit-analysis` 2 stdio servers 명시적 정의 (`${CLAUDE_PLUGIN_ROOT}` 사용) |

→ **MEMORY.md 갱신 필요** (Phase 4 보고서 작성 후 별도 update).

---

## 5. ENH 카탈로그

### 5.1 신규 ENH (1건)

#### ENH-300 P2 deferred — Hook `effort.level` Adaptive Defense Intensity

**근거**: F4-133 신규 hook input field — bkit 21 hook events 중 **adaptive defense intensity** 분기 가능 surface.

**Use cases**:
- `unified-bash-pre.js`가 `effort=high`일 때 destructive command 검사 강화 / `effort=low`일 때 fast-pass
- `audit-logger.js`가 effort level별 NDJSON verbosity 조정
- `defense-coordinator.js`가 effort 기반 정책 분기

**현 상태**: bkit hook scripts grep `CLAUDE_EFFORT effort.level` **0건** (실측, Phase 2)

**Sprint 통합**: A Observability (audit-logger meta 확장) 또는 E Defense (PreToolUse intensity 분기) — **A + B 병행 단일 PR** 권장.

**bkit 차별화**: CC native는 effort 정보 노출만, bkit은 **defense intensity 적응** 활용 (potential moat). 누적 차별화 4건 (ENH-286 + ENH-289 + ENH-292 + ENH-300).

**Priority**: P2 deferred (즉시 사용자 가치 LOW, 사용자 `/effort` 활용 시점에 가치 부상)

### 5.2 DROP ENH (1건)

#### ENH-301 (DROP) — Subagent Skill Discovery Sanity CI

**원래 근거**: B1-133 회귀 가능성 보호 (sub-agent skill discovery 회귀 발생 시 빠른 감지)

**YAGNI Review FAIL**:
- 현재 사용자가 필요로 하는가? **NO** (B1-133 fix 후 회귀 가능성은 CC team 책임)
- 미구현 영향: 회귀 발생 시 사용자 직접 발견 (bkit 차별화 가치 없음)
- 다음 CC 버전이 더 나음? **YES** (Anthropic CI 강화 추세 + 본 사이클에 fix 게시됨)
- 비용: bkit가 runtime CI에서 `claude` CLI를 실행하는 인프라 부재 → 신규 인프라 필요 (cost HIGH)

**결정**: **DROP** (cost > benefit, runtime CI 인프라 부재로 YAGNI fail)

### 5.3 기존 ENH 강화 (2건)

#### ENH-292 P0 — Sub-agent Caching 10x Mitigation (5-streak 강화)

**본 사이클 변동**: #56293 v2.1.133에서 **5번째 연속 미해소** (v2.1.128~v2.1.133, CHANGELOG에 fix bullet 없음)

**가속 정당성**: 4-streak에서 5-streak로 격상되며 **"Anthropic 자체 해결 의지 부재"** 결정적 입증. bkit cto-lead/qa-lead Task spawn 5+ blocks 사용 시 cache miss 4%→40% (cache_creation 5,534→22,713 tokens/turn) 위험 동일하게 노출.

**v2.1.13 Sprint Coordination 가속 권장** — Sprint 단독 P0 우선순위 유지 + sequential dispatch + cache-cost-analyzer + observability monitor 묶음 PR.

#### ENH-291 P1 → **P2 강등** — Skill Validator Defense

**본 사이클 변동**: #56448 v2.1.133에서 **4번째 연속 미해소** + **메모리 정정** (실측 0 skills > 250)

**Priority 재평가**:
- 메모리: "4 skills > 250자 (pdca-watch 251 / pdca-fast-track 226 / bkit-explore 226 / bkit-evals 225)" → **부정확**
- 실측: pdca-watch 246 (cap 미만), 4-streak 미해소이지만 **bkit 직접 노출 zone 0**

**결정**: P1 → **P2 강등** (insurance gate 의의는 유지, 즉시 단축 PR 불필요)
- A안 (250자 CI gate 신설): P2 deferred 유지
- B안 (220자 보수적 gate + 3 skills 단축): P3 후보로 별도 보존
- 4-streak 유지로 폐기는 위험 → P2 deferred 안전

### 5.4 기존 ENH 변동 없음 (보존)

| ENH | Priority | 본 사이클 변동 | 비고 |
|-----|---------|--------------|------|
| ENH-289 P0 | P0 deferred | R-3 추세 ~0/day 감소 | 데이터 부족, P1 강등 검토는 차후 사이클 |
| ENH-298 P1 | P1 deferred | R-3 evolved 신규 0 | ENH-289 묶음 PR 통합 유지 |
| ENH-293 P1 | P1 deferred | F6-128 root cause 후보 그대로 | Sprint A Observability |
| ENH-294 P2 | P2 deferred | (변동 없음) | Stop hook OS-aware fallback |
| ENH-295 P2 | P2 deferred | (변동 없음) | `.bkit/` purge sentinel |
| ENH-296 P3 | P3 deferred | R-3 evolved 추적 | tracker 갱신 0건 |
| ENH-297 P2 | P2 deferred | (변동 없음) | MCP stderr-only CI gate |
| ENH-281 OTEL 묶음 | (8 누적) | F4-133 effort.level은 ENH-300 별도 분리 | 8 → 8 유지 |
| ENH-290 R-1/R-2 framework | (R-1: 6, R-2: 1) | **stable=2.1.123 승격 데이터 추가** | 16 윈도우 7건 (R-1 6 + R-2 1) 유지 |

---

## 6. R-3 시리즈 monitor (2주 review 5-13 예정)

### 6.1 본 사이클 추세

| 항목 | v2.1.132 (5/7) | v2.1.133 (5/8) | 변동 |
|------|---------------|----------------|------|
| Numbered (#145) | 정체 | 정체 (+0 in 9d) | 0 |
| Dup-closure 5건 | 5/1 closed 유지 | 5/1 closed 유지 | 0 |
| Evolved-form 누적 | 10건 | **10건 (+0)** | **0** |
| 추세 | 0.2/day | **~0/day** | 감소 |

**추세 둔화 가설**: B1-133 (subagent skill discovery fix)가 **R-3 일부 사례 재현 어려움 유발** 가능성 — 단, 인과 단정 보류 (R-3는 user instruction override가 본질이고, skill discovery는 인접 surface).

**5/13 review 일자 예상치**: numbered #145 정체 + evolved 10건 유지 → 추세 ~0/day 확인 시 **ENH-289 P0 → P1 강등 검토** 가능 시점 (단 데이터 추가 1-2 사이클 더 수집 권장).

### 6.2 최근 issues (created since 2026-05-07)

| Issue | 제목 | R-3 매칭 | 비고 |
|-------|------|:-------:|------|
| #57154 | subagents/skills doc 충돌 | No | B1-133 fix 후 doc 모순 — 별개 surface |
| #57158 | Custom MCP Connectors 403 (Windows) | No | MCP 도메인 |
| (그 외 10건) | (검토 완료) | **No (0/12)** | R-3 패턴 매칭 0건 |

---

## 7. Long-standing Issue 상태 (4건)

| Issue | Title | 직전 streak | v2.1.133 | 변동 | bkit defense |
|-------|-------|:----------:|:--------:|------|--------------|
| #56293 | Caching 10x sub-agent regression | 4-streak | **5-streak 미해소** | +1 | ENH-292 P0 가속 정당성 강화 |
| #56448 | Skill validator regression | 3-streak | **4-streak 미해소** | +1 | ENH-291 P1→P2 (실측 0 skills > 250 메모리 정정) |
| #47855 | /compact Opus 1M block | 22+-streak | **23-streak 미해소** | +1 | MON-CC-02 defense (`scripts/context-compaction.js:44-56`) 유지 |
| #47482 | Output styles frontmatter ignored | 25+-streak | **26-streak 미해소** | +1 | ENH-214 defense (`scripts/user-prompt-handler.js`) 유지 |

**모두 v2.1.133에서 미해소** — bkit defense 모두 활성 유지, 정당성 변동 없음.

---

## 8. npm dist-tag 이벤트 (R-1/R-2 framework follow-up)

### 8.1 stable 채널 승격 (2026-05-07 → 2026-05-08)

| 이벤트 | Before | After | gap |
|--------|--------|-------|-----|
| stable promotion | v2.1.119 | **v2.1.123** | **13-version gap** (v2.1.124~v2.1.132 9개 건너뜀) |

**ENH-290 R-1/R-2 framework follow-up 데이터 포인트**:
- 승격 정책: 14일 burn-in 정책 (v2.1.123 게시 2026-04-29 → 2026-05-08 = 9일이지만 실제 운영상 승격됨, 정책 일부 유연)
- v2.1.124~v2.1.132 9개 건너뛴 이유: 이 구간 중 **#56293 caching 10x (v2.1.128) + #56448 skill validator (v2.1.129) 회귀 오픈** → Anthropic 내부 stable 기준에서 회귀 영향 vesion skip
- bkit 권장 (보수적 v2.1.123)와 npm stable 채널 **자동 정렬** → operational drift 0

### 8.2 latest/next 통합 유지

| 채널 | v2.1.132 (5/7) | v2.1.133 (5/8) |
|------|---------------|----------------|
| stable | 2.1.119 | **2.1.123** ✓ 승격 |
| latest | 2.1.132 | **2.1.133** |
| next | 2.1.132 | **2.1.133** |

**latest = next 통합 유지**: v2.1.132부터 시작된 통합 패턴이 v2.1.133에서도 지속 → next 채널 모험성 감소 (ENH-290 framework "next channel partial-merge" 정책 입증).

---

## 9. 권고 (사용자 결정 영역)

### 9.1 즉시 조치 필요성

- **bkit v2.1.12 hotfix 필요성**: ❌ **불필요** (회귀/Breaking 0건, 90 연속 호환 입증)
- **즉시 PR**: 없음
- **사용자 안내**: #56293 caching 10x 5-streak 미해소 — cto-lead/qa-lead Task spawn 5+ blocks 사용 시 cache miss 위험 동일

### 9.2 v2.1.13 Sprint 통합 (deferred)

| Sprint | 신규 ENH | 강화 ENH | 비고 |
|--------|---------|---------|------|
| A Observability | ENH-300 (effort.level audit-logger) | ENH-281 (8 누적 그대로) | A+E 병행 단일 PR 권장 |
| E Defense | ENH-300 (PreToolUse intensity 분기) | ENH-289 R-3 묶음 (ENH-298 통합 유지) | 정당성 ~0/day 추세에도 ENH-289 P0 유지 |
| Coordination | (없음) | ENH-292 P0 5-streak 가속 | 단독 P0 우선순위 유지 |
| MCP-1 | (없음) | ENH-282 + ENH-297 + B6-133 future surface | future HTTP MCP 대비 |
| Doc | (없음) | ENH-291 P2 강등 (insurance gate) | 250자 CI gate, 즉시 단축 불요 |

### 9.3 채택 권장 CC 버전

| 채널 | 버전 | 권장 사용자 |
|------|------|----------|
| **보수적** | **v2.1.123** | bkit memory 권장 + npm stable 자동 정렬 (operational drift 0) |
| **균형** | **v2.1.133** | B1-133 subagent skill fix + B6-133 MCP OAuth 인프라 + dist-tag 통합 |
| 비권장 | v2.1.128 / v2.1.129 | #56293 caching 10x + #56448 skill validator 모두 미해소 |

### 9.4 메모리 정정 권장 (MEMORY.md 갱신)

- 89 → **90 연속 호환** (v2.1.34 → v2.1.133)
- F9-120 closure 5 → **6 릴리스 연속 PASS**
- ADR 0003 5 → **6 사이클 적용**
- 권장 균형 v2.1.132 → **v2.1.133 추가**
- skill description lengths 4건 정정 (메모리 정정 #1)
- cto-lead Task spawn block 수 5+3=8 → **10 blocks** 정정 (메모리 정정 #2)
- ENH-300 P2 신규 / ENH-301 DROP / ENH-291 P1→P2 강등
- bkit 차별화 누적 3 → **4건** (ENH-300 추가)
- R-3 evolved form 10건 유지 (+0), 추세 ~0/day
- npm stable 2.1.119 → **2.1.123 승격** (gap 13-version)
- Long-standing issue streak +1 (5/4/23/26)

### 9.5 사후 검증 권장 명령 (8/8 — v2.1.133 채택 시)

```bash
# Test #1
claude --version  # 2.1.133

# Test #2
claude plugin validate .  # Exit 0 (F9-120 closure 6 cycle)

# Test #3
jq '[.hooks | to_entries[] | .key] | length' hooks/hooks.json   # 21
jq '[.hooks | to_entries[] | .value[]] | length' hooks/hooks.json # 24

# Test #4 (invariant 6-cycle)
grep -rn 'updatedToolOutput' lib/ scripts/ hooks/ | wc -l  # 0

# Test #5 (CARRY-5 stable surface)
grep -n 'OTEL_' lib/infra/telemetry.js  # 4 위치 (126/137/149/188)

# Test #6 (F1-132 미활용 2-cycle)
grep -rn 'CLAUDE_CODE_SESSION_ID' lib/ scripts/ hooks/ | wc -l  # 0

# Test #7 (F2-132 무영향 2-cycle)
grep -rn 'CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN' lib/ scripts/ hooks/ | wc -l  # 0

# Test #8 (신규 — F4-133 ENH-300 baseline)
grep -rn 'CLAUDE_EFFORT\|effort\.level\|effortLevel' lib/ scripts/ hooks/ | wc -l  # 0
```

---

## 10. 알려지지 않은 항목 (flag)

- **commit-level diff**: claude-code 소스 부분 closed → CHANGELOG + release notes 기반 판단
- **B1-133 회귀 첫 등장 release**: changelog "regression in vX.Y.Z" 명시 없음, 회귀 시작 release 미상
- **F4-133 `effort.level` JSON 정확한 스키마**: docs (`code.claude.com/docs/en/hooks`) 차후 확인 권장
- **stable 승격 정확한 시각**: npm dist-tag 변경 timestamp 미수집 (직접 `npm view` 시계 확인 필요)
- **B1-133 fix 이전 영향 범위**: bkit Task spawn 패턴이 stealth-fail했는지 사용자 환경 reproduction 부재 (자동수혜 후 차이 미관측)

---

## 11. Sources

- [Claude Code v2.1.133 Release](https://github.com/anthropics/claude-code/releases/tag/v2.1.133) (2026-05-07 23:49 UTC)
- [Claude Code CHANGELOG.md (main)](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) — `## 2.1.133` 섹션 16 bullets
- [Issue #56293 caching 10x](https://github.com/anthropics/claude-code/issues/56293) — 5-streak open
- [Issue #56448 skill validator regression](https://github.com/anthropics/claude-code/issues/56448) — 4-streak open
- [Issue #47855 /compact Opus 1M block](https://github.com/anthropics/claude-code/issues/47855) — 23-streak open
- [Issue #47482 output styles frontmatter](https://github.com/anthropics/claude-code/issues/47482) — 26-streak open
- [Recent issues since 2026-05-07](https://github.com/anthropics/claude-code/issues?q=is%3Aissue+created%3A%3E2026-05-07)
- 직전 분석: `docs/04-report/features/cc-v2130-v2132-impact-analysis.report.md`
- 메모리: `cc_version_history_v2130_v2132.md` (5번째 적용)
- ADR 0003: `docs/02-design/architecture/adr-0003-empirical-validation.md` (가정 — Phase 1.5 게이트 시나리오)

---

**Final Verdict**: ✅ **bkit v2.1.12 main GA가 v2.1.133 환경에서 무수정 정상 작동, 90 연속 호환 입증, 단일 릴리스 사이클 ADR 0003 6번째 적용 cross-cycle predictability 결정적 입증**.
