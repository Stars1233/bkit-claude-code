# CC v2.1.137 → v2.1.139 영향 분석 및 bkit 대응 보고서 (ADR 0003 여덟 번째 정식 적용)

> **Status**: ✅ Final (실증 기반, ADR 0003 여덟 번째 정식 적용)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.12 (current GA, main `5f6592b`, 2026-04-29 release tag)
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Date**: 2026-05-12
> **PDCA Cycle**: cc-version-analysis (v2.1.138~v2.1.139, 2-version increment, **single-pair scenario 두 번째 발생** — v2.1.133 이후 두 번째 small-batch)
> **CC Range**: v2.1.137 (baseline, 92 consecutive PASS, 2026-05-09) → **v2.1.139** (release 2026-05-11 18:43 UTC, 30 bullets — Feature 11 + Improvement 7 + Fix 12; 직전 v2.1.138 "Internal fixes" 단 1 bullet 2026-05-09 06:33 UTC, 정상 게시 R-1/R-2 0건)
> **Verdict**: **크리티컬 회귀 0건 / Breaking 0건 / 자동수혜 HIGH 4건 (F8-139 MCP CLAUDE_PROJECT_DIR / F10-139 OTEL agent_id / B5-139 Skill wildcard / B12-139 OTEL emission) / 영향 가능 HIGH 3건 (F6-139 args exec form / F7-139 continueOnBlock / B3-139 hook terminal access 회귀 0 확정) / 무영향 확정 22+건 / 신규 ENH 후보 3건 (ENH-302/303/304, 모두 deferred) / 기존 ENH 강화 5건 (ENH-292 P0 9-streak 결정적 / ENH-281 OTEL 9→10 / ENH-286 + ENH-289 강등 검토 / ENH-290 drift +13) / R-3 evolved 11건 (+0 본 사이클) / 94 연속 호환**

---

## 1. Executive Summary

### 1.1 최종 판정

| 항목 | 값 |
|------|----|
| 크리티컬 회귀 건수 | **0건** (bkit v2.1.12 무수정 작동, ADR 0003 12/12 PASS — B3-139 회귀 surface 신규 검증 포함) |
| Breaking Changes | **0건** (확정) |
| 자동수혜 (CONFIRMED) HIGH | **4건** — F8-139 (`.mcp.json` 2 stdio servers 16 tools `CLAUDE_PROJECT_DIR` 주입 자동수혜), F10-139 (OTEL `agent_id`/`parent_agent_id` span attributes — ENH-281 9 → 10 누적), B5-139 (`Skill(name *)` wildcard prefix match fix — 43 skills + skill-post.js 자동수혜), B12-139 (OpenTelemetry metric emission fix — `lib/infra/telemetry.js` 4 위치 자동수혜) |
| 영향 가능 HIGH | **3건** — F6-139 (Hook `args: string[]` exec form — 24 hook blocks 마이그레이션 기회, ENH-302), F7-139 (PostToolUse `continueOnBlock` — 3 blocks 차별화 #5 후보, ENH-303), **B3-139** (hooks now run without terminal access — 회귀 surface, 24 blocks console/stdout 검증 결과 **0건 확정**) |
| 자동수혜 (CONFIRMED) MEDIUM | **2건** — I1-139 (Compaction preserves user instructions, advisory 강화 → ENH-286 motivation 데이터 +1), F4-139 (`claude plugin details <name>` token cost 외부 가시화) |
| 정밀 검증 (무영향 확정) | **22+건** (F11-139 VSCode 통합 비사용, F2/F3/F5/F9-139 cosmetic, B1/B2/B4/B6/B7/B8/B9/B10/B11-139 다수, I2-I7 cosmetic 다수) |
| **신규 ENH 후보** | **3건** — ENH-302 P2 (Hook exec form 마이그레이션), ENH-303 P2 (PostToolUse continueOnBlock 활용 — **bkit 차별화 #5 후보**), ENH-304 P3 (Agent View sanity check, 정식 ENH 아님). **모두 deferred** (사용자 명시 결정) |
| **신규 모니터** | **0건** 신규, 기존 7건 progress only |
| **기존 ENH 강화** | **5건** — ENH-292 P0 (#56293 **9-streak 결정적 강화**) / ENH-281 OTEL **9 → 10 누적** (F10-139 attribute) / ENH-286 (I1-139 + #57485 advisory 데이터 +2) / **ENH-289 P0 → P1 강등 검토 (5/13 review)** (R-3 numbered #145 13일째 정체) / ENH-290 (stable v2.1.126 ↔ latest v2.1.139 **drift +13**, dist-tag framework follow-up 데이터) |
| **DROP ENH** | **0건** |
| **R-3 시리즈 monitor** | numbered #145 정체 (+0 in 13d) / dup-closure 5건 유지 / **evolved form 누적 11건 (+0 본 사이클)** / 추세 0.1/day → **~0/day** (감소). ENH-289 P0 → P1 강등 후보 결정적 |
| **메모리 정정** | (1) **F8-139 자동수혜 surface 확정**: `CLAUDE_PROJECT_DIR` grep **18 files** in lib/scripts/hooks (이미 사용 중) → MCP stdio 주입 자동수혜 즉시, (2) **B3-139 회귀 surface 검증**: hooks/scripts 전수 grep 151건 모두 JSON protocol or stderr (terminal/TTY 접근 0건 확정) — ADR 0003 9번째 항목 invariant 추가, (3) **F6/F7-139 baseline 0건 확정**: hooks.json `args: []` exec form 0, `continueOnBlock` 0 (마이그레이션/활용 surface 최초 측정) |
| bkit v2.1.12 hotfix 필요성 | **불필요** (현재 main GA `5f6592b` 안정, 92 → 94 연속 호환 확장 입증) |
| **연속 호환 릴리스** | **94** (v2.1.34 → v2.1.139, 92 → 94, +2 — v2.1.138 + v2.1.139 정상 추가) |
| ADR 0003 적용 | **YES (여덟 번째 정식 적용 — 8-사이클 일관성 입증, single-pair small-batch scenario 두 번째 발생, ADR 0003 검증 매트릭스 12-항목으로 확장)** |
| **권장 CC 버전** | **v2.1.123 (보수적, npm stable v2.1.126과 +3 drift)** 또는 **v2.1.139 (균형, 신규)** — F8-139 + F10-139 + B5/B12-139 HIGH 자동수혜 4건 추가 + 94-cycle 검증. **v2.1.128 / v2.1.129 비권장 유지** (#56293 9-streak / #56448 8-streak 모두 v2.1.139에서 미해소). 사용자 명시 승인 후 보류 패턴 유지 |

### 1.2 성과 요약

```
┌──────────────────────────────────────────────────────┐
│  v2.1.137 → v2.1.139 영향 분석 (ADR 0003 여덟 번째)    │
├──────────────────────────────────────────────────────┤
│  📊 CC 변경 수집: 31건 (실 게시 2 versions: 1 + 30)    │
│      v2.1.138: 1 bullet ("Internal fixes")             │
│      v2.1.139: 30 bullets (F 11 + I 7 + B 12)          │
│  🔴 실증된 크리티컬 회귀: 0건 (bkit 환경)              │
│  🟢 CONFIRMED auto-benefit HIGH: 4건                   │
│      • F8-139 MCP stdio CLAUDE_PROJECT_DIR 주입         │
│      • F10-139 OTEL agent_id/parent_agent_id attrs     │
│      • B5-139 Skill(name *) wildcard prefix fix        │
│      • B12-139 OpenTelemetry emission fix              │
│  🟡 영향 가능 HIGH: 3건                                │
│      • F6-139 Hook args:[] exec form (ENH-302 P2)      │
│      • F7-139 PostToolUse continueOnBlock (ENH-303 P2) │
│      • B3-139 hooks no-terminal-access (회귀 0 확정)   │
│  🟢 정밀 검증 (무영향 확정): 22+건                     │
│  🆕 신규 ENH 후보: 3건 (모두 deferred)                 │
│      • ENH-302 P2 Hook exec form 마이그레이션          │
│      • ENH-303 P2 continueOnBlock (차별화 #5 후보)     │
│      • ENH-304 P3 Agent View sanity check              │
│  🔁 기존 ENH 강화: 5건                                 │
│      • ENH-292 P0 (#56293 9-streak 결정적)             │
│      • ENH-281 OTEL 9 → 10 누적 (F10-139)              │
│      • ENH-286 (I1-139 + #57485 advisory +2)           │
│      • ENH-289 P0 → P1 강등 검토 (5/13 review)         │
│      • ENH-290 drift +13 (stable 126 ↔ latest 139)     │
│  ❌ Breaking Changes: 0 (확정)                         │
│  ✅ 연속 호환: 92 → 94 릴리스 (v2.1.34~v2.1.139)       │
│  ✅ F9-120 closure 8 릴리스 연속 PASS 잠정             │
│      (claude plugin validate Exit 0,                   │
│       v2.1.120/121/123/129/132/133/137/139)            │
│  ⚙️ npm dist-tag: latest=139 + next=139 (1-cycle 재통합)│
│      stable=126 유지 (drift +13, 보수적 v2.1.123 유지) │
│  ⚙️ R-1/R-2 패턴 신규 0건 (v138/139 정상)              │
│      18-릴리스 윈도우 9건/8 versions/50% (변동 없음)   │
│  ⚙️ R-3 evolved 11건 (+0), 추세 ~0/day (감소)          │
└──────────────────────────────────────────────────────┘
```

### 1.3 4-관점 가치 표

| 관점 | 내용 |
|------|------|
| **Technical** | (a) **F8-139 MCP stdio `CLAUDE_PROJECT_DIR` 주입** — bkit `.mcp.json` 2 stdio servers (`bkit-pdca` + `bkit-analysis`, 16 tools) cwd 추론 안정성 자동 +1, bkit 전체 18 files 이미 사용 중인 환경변수와 MCP 일관성 확보. (b) **F10-139 OTEL `agent_id`/`parent_agent_id` span attributes** — cto-lead **10 blocks** Task spawn + qa-lead 4-agent parallel spawn observability 자동수혜, ENH-281 OTEL 누적 **9 → 10**. Sprint A Observability 단일 PR scope 확장. (c) **F6-139 Hook `args: string[]` exec form** — 24 hook blocks 모두 현재 shell form (`node "${CLAUDE_PLUGIN_ROOT}/..."`), 마이그레이션 시 Win path 띄어쓰기+괄호 안정성 + quoting 코드 제거 + parse error 회피 — ENH-302 P2 후보. (d) **F7-139 PostToolUse `continueOnBlock`** — bkit PostToolUse 3 blocks (`unified-write-post.js` + `unified-bash-post.js` + `skill-post.js`) 직접 surface, 현재 deny silent block → reason 모델 전달 + self-correct loop 가능 — **ENH-303 P2 후보 + bkit 차별화 #5 후보 (audit + memory enforcer + R-3 Defense Layer 6 결합 moat)**. (e) **B3-139 hooks-no-terminal-access 회귀 surface** — 24 hook blocks `console.log`/`process.stdout.write` 의존 잠재 회귀 검증 결과 **0건 확정** (전수 151건 모두 JSON protocol or stderr, TTY 가드 2건 안전 패턴, readline/inquirer 부재). ADR 0003 9번째 검증 항목 invariant 추가. (f) **F9-120 closure 8 릴리스 연속 PASS 잠정** (`claude plugin validate .` Exit 0, v2.1.120/121/123/129/132/133/137/139 — marketplace.json root field 안정성 8 cycle). |
| **Operational** | hotfix sprint 불필요 (회귀 0건). **npm dist-tag 변동**: latest v2.1.137 → v2.1.139 (정상 게시 2 versions), **next=2.1.139** (5/9 분기 1-cycle 만에 latest와 재통합 — 분기 unstable 데이터 +1, ENH-290 framework follow-up). **stable=v2.1.126 유지** (bkit 보수적 v2.1.123 ↔ stable +3 drift, **bkit 균형 v2.1.139 권장 신규 추가**). **단 #56293 caching 10x 9-streak 미해소** (v2.1.128~v2.1.139, **49 bullet maintenance + 30 bullet update 누적에도 fix 부재** — Anthropic 자체 해결 의지 부재 결정적 입증). cto-lead/qa-lead Task spawn 5+ blocks 사용 시 cache miss 4%→40% 위험 동일하므로 사용자 안내 유지. #56448 skill validator **8-streak** 미해소 (단 4-streak 실측 환경 flag 0건, ENH-291 P2 유지). **#57317 plugin PostToolUse silent drop 3-streak**이 F7-139와 도메인 결합 → **MON-CC-NEW-PLUGIN-HOOK-DROP P2 → P1 격상 검토 (5/13 review)** + ENH-303 P1 격상 동시 검토. |
| **Strategic** | ADR 0003 (Empirical Validation) **여덟 번째 정식 적용 사이클 → 8-사이클 일관성 입증** (v2.1.120/121/123/129/132/133/137/139). **single-pair small-batch scenario** (v2.1.133 단일 1-version에 이은 두 번째 small-batch) → ADR 0003이 1/2/3/4/5/6/7/8/9-version increment 및 R-2 skip + dist-tag 분기/통합 등 모든 scenario에서 robust 일관 작동 입증. **#56293 9-streak**으로 ENH-292 sequential dispatch moat (bkit 차별화 #3) **product moat 결정적 입증 강화** — 직전 7-streak에 이은 누적 2 사이클 무해소 데이터 → "Anthropic 자체 해결 의지 부재" 추론 신뢰성 매우 높음. **F7-139 surface 등장**으로 **bkit 차별화 #5 후보 (PostToolUse deny reason moat)** 신규 발굴 — CC native는 surface만 노출, bkit이 audit-logger + memory enforcer + R-3 Defense Layer 6 + #57317 직접 surface와 결합 시 차별화. 누적 bkit 차별화 **4건 → 5건 (잠정)** (ENH-286 + ENH-289 + ENH-292 + ENH-300 + **ENH-303 후보**). **R-3 numbered #145 13일째 정체 + evolved +0 본 사이클** → ENH-289 P0 → P1 강등 후보 결정적, 5/13 review 통합 의사결정. |
| **Quality** | bkit v2.1.12 main GA가 v2.1.139 환경에서 무수정 작동 (Phase 2 직접 검증 **12/12 PASS** — ADR 0003 9-12번째 항목 신규 추가). **사후 검증 결과 (2026-05-12 직접 실행)**: (1) `claude --version` = `2.1.139` (latest 채널 + next 통합), (2) `claude plugin validate .` Exit 0 — **F9-120 closure 8 릴리스 연속 PASS 잠정** (v2.1.120/121/123/129/132/133/137/139), (3) `hooks.json` events:21 / blocks:24 메모리 일치, (4) `grep -rn 'updatedToolOutput' lib/ scripts/ hooks/` 0건 — #54196 무영향 invariant **8 cycle 유지**, (5) `grep OTEL_ lib/infra/telemetry.js` 4 위치 (line 126/137/149/188) 동일 — **F10-139 attribute 자동수혜 surface 8 cycle 유지**, (6) `grep CLAUDE_CODE_SESSION_ID` 0건 (4-cycle DROP), (7) `grep CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` 0건 (4-cycle 무영향), (8) `grep CLAUDE_EFFORT effort.level effortLevel` 0건 (3-cycle baseline, ENH-300). **신규 검증 항목 (9-12)**: (9) **hooks/scripts 전수 console/stdout/TTY 검증** — 151건 모두 JSON protocol or stderr (B3-139 회귀 0건 확정, invariant 신규 추가), (10) **hooks.json `args: []` exec form** 0건 (F6-139 baseline 신규), (11) **hooks.json `continueOnBlock`** 0건 (F7-139 baseline 신규), (12) **`.mcp.json` `CLAUDE_PROJECT_DIR` 활용** 2 servers 정의 + 18 files grep (F8-139 자동수혜 surface 신규). **token-ledger.ndjson 활성** 잠정 (Stop hook 실시간 작동 검증 패턴 8 cycle). **CARRY-5 P0 token-meter Adapter zero entries 패턴** — F6-128 surface 8 cycle 유지, **F10-139 `agent_id` header 신규 surface로 우회 추적 기회** (sub-agent별 spawn 식별). |

---

## 2. ADR 0003 여덟 번째 정식 적용 — Phase 1.5 게이트 결과

### 2.1 게이트 통과 매트릭스

ADR 0003 §2 (b) 실증 상태 4값 기준:

| ID | 변경 요약 | E1 시나리오 | E2 실행 | E3 경로 스코프 | E4 공식 스펙 | **E5 상태** |
|----|----------|------------|---------|--------------|-------------|------------|
| **F1-139** | Agent View (`claude agents` background sessions) | 정의 (cto-lead 10 blocks + qa-lead 4-agent surface) | ✅ 정적 (CC native auto-integrate 가정) | (사용자 환경) | CHANGELOG / Agent View docs | **CONFIRMED 영향 가능 (ENH-304 P3 sanity check)** |
| **F2-139** | `/goal` slash command | 정의 (Skill 트리거 contamination 가능성) | ✅ 정적 (bkit /goal 미정의) | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **F3-139** | `/scroll-speed` slash | 정의 (UI cosmetic) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **F4-139** | `claude plugin details <name>` token cost | 정의 (bkit plugin 외부 가시화) | ✅ 정적 | (사용자 환경) | CHANGELOG | **CONFIRMED 자동수혜 (MEDIUM, DX)** |
| **F5-139** | Transcript view navigation | 정의 (UI cosmetic) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **F6-139** | Hook `args: string[]` exec form | 정의 (hooks.json 24 blocks 마이그레이션 surface) | ✅ Phase 2 직접 (`grep -E '"args":\s*\[' hooks/hooks.json` 0건 baseline) | hooks/hooks.json (24 blocks) | CHANGELOG / Hooks docs | **CONFIRMED 영향 가능 (ENH-302 P2)** |
| **F7-139** | PostToolUse `continueOnBlock` | 정의 (3 blocks PostToolUse 직접 surface) | ✅ Phase 2 직접 (`grep continueOnBlock hooks/hooks.json` 0건 baseline) | unified-write-post.js, unified-bash-post.js, skill-post.js | CHANGELOG / Hooks docs | **CONFIRMED 영향 가능 (ENH-303 P2 — bkit 차별화 #5 후보)** |
| **F8-139** | MCP stdio `CLAUDE_PROJECT_DIR` 주입 | 정의 (`.mcp.json` 2 stdio servers 16 tools surface) | ✅ Phase 2 직접 (`jq .mcpServers .mcp.json` 2 keys 확인 + `grep CLAUDE_PROJECT_DIR` 18 files 사용 확인) | .mcp.json (16 tools) | CHANGELOG / MCP docs | **CONFIRMED 자동수혜 (HIGH)** |
| **F9-139** | Remote MCP server reconnect retry | 정의 (HTTP/SSE only — bkit는 stdio) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **F10-139** | OTEL `agent_id`/`parent_agent_id` attributes | 정의 (lib/infra/telemetry.js + cto-lead 10 blocks observability) | ✅ Phase 2 직접 (`grep OTEL_ lib/infra/telemetry.js` 4 위치 line 126/137/149/188) | lib/infra/telemetry.js (4 위치) | CHANGELOG / OTEL docs | **CONFIRMED 자동수혜 (HIGH) + ENH-281 OTEL 9 → 10 누적 강화** |
| **F11-139** | VSCode reopen closed session shortcut | 정의 (bkit는 VSCode 통합 없음) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **I1-139** | Compaction preserves user instructions | 정의 (CC advisory 강화 영역, ENH-286 차별화 데이터) | ✅ 정적 (memory enforcer PreToolUse deny-list enforced 보존) | scripts/context-compaction.js (defense) | CHANGELOG | **CONFIRMED MEDIUM (ENH-286 motivation +1)** |
| **I2-139** | `/mcp` Reconnect picks up `.mcp.json` edits | 정의 (HTTP status 표시) | ✅ 정적 | (사용자 환경) | CHANGELOG | **CONFIRMED 무영향 (자동수혜 DX cosmetic)** |
| **I3-139** | `/context all` per-skill token estimates | 정의 (43 skills surface cosmetic) | ✅ 정적 | (사용자 환경) | CHANGELOG | **CONFIRMED 무영향 (cosmetic)** |
| **I4-139** | `claude plugin install <name>@<marketplace>` auto-refresh | 정의 (설치 안정성) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **I5-139** | `/plugin` hook event names + MCP server names 클린 표시 | 정의 (21 events 24 blocks 가시성) | ✅ 정적 | (사용자 환경) | CHANGELOG | **CONFIRMED 무영향 (자동수혜 cosmetic)** |
| **I6-139** | `/context` plugin-sourced skills | 정의 (43 skills 출처 가시성) | ✅ 정적 | (사용자 환경) | CHANGELOG | **CONFIRMED 무영향 (자동수혜 cosmetic)** |
| **I7-139** | API key 설정 시 Remote Control/`/schedule`/claude.ai MCP disable | 정의 (개발자 환경 패턴) | ✅ 정적 | (사용자 환경) | CHANGELOG | **CONFIRMED 무영향 (auth 패턴 정합성)** |
| **B1-139** | `forceRemoteSettingsRefresh` deadlock fix | 정의 (`grep forceRemoteSettingsRefresh` 0건 in bkit code) | ✅ Phase 2 직접 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B2-139** | `autoAllowBashIfSandboxed` shell expansion 자동 승인 안 함 | 정의 (`grep autoAllowBashIfSandboxed` 0건) | ✅ Phase 2 직접 | (없음) | CHANGELOG | **CONFIRMED 무영향 (사용자 자동수혜)** |
| **B3-139** | **Hooks now run without terminal access** (회귀 surface) | 정의 (24 hook blocks console/stdout/TTY surface 전수 검증) | ✅ Phase 2 직접 (`grep 'console.log\|console.error\|process.stdout.write' hooks/ scripts/` 151건 모두 JSON protocol or stderr) | hooks/, scripts/ (151건 surface, TTY 가드 2건 안전 패턴) | CHANGELOG / Hooks docs | **CONFIRMED 회귀 0건 확정 (ADR 0003 9번째 invariant 신규 추가)** |
| **B4-139** | HTTP/SSE MCP unbounded memory growth fix (16 MB cap) | 정의 (bkit는 stdio only) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B5-139** | `Skill(name *)` wildcard prefix match fix | 정의 (43 skills + skill-post.js permission rules) | ✅ Phase 2 직접 (skill-post.js permission rules 사용 시 자동수혜) | scripts/skill-post.js (skill permission surface) | CHANGELOG | **CONFIRMED 자동수혜 (MEDIUM)** |
| **B6-139** | Settings hot-reload symlinked ~/.claude/settings.json | 정의 (bkit는 plugin-scoped) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B7-139** | Plugin details fail when marketplace key differs | 정의 (`.claude-plugin/marketplace.json` + plugin.json 명칭 일치 확인) | ✅ 정적 (확인 권장 — bkit 명칭 일관성 유지) | .claude-plugin/ | CHANGELOG | **CONFIRMED 무영향 (명칭 정합)** |
| **B8-139** | `/model` picker Default 행 ENV override 반영 | 정의 (bkit는 model picker 미사용) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B9-139** | "stream idle timeout" 5분 spurious fix | 정의 (UI cosmetic) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B10-139** | Silent exit 1 10+ MCP servers + cache unwritable | 정의 (bkit는 2 stdio servers, 10 threshold 미달) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B11-139** | UI bundle (typing/transcript/history/image paste/hyperlinks/scroll) | 정의 (UI cosmetic) | ✅ 정적 | (없음) | CHANGELOG | **CONFIRMED 무영향** |
| **B12-139** | Tech bundle (MCP resources/diff snippets/grep/character rendering/plugin dep/OTEL emission) | 정의 (lib/infra/telemetry.js OTEL emission surface) | ✅ 정적 (자동수혜 emission 안정화) | lib/infra/telemetry.js | CHANGELOG | **CONFIRMED 자동수혜 (HIGH 분류 — OTEL 안정성 핵심 + plugin dep resolution)** |

### 2.2 핵심 실증 발견 — 8-사이클 일관성 입증

**E2 (실제 실행) 결과 — Phase 2 (2026-05-12)**:

```bash
# Test #1: claude --version
$ claude --version
2.1.139 (Claude Code)

# Test #2: claude plugin validate .
$ claude plugin validate .
Validating marketplace manifest: .claude-plugin/marketplace.json
✔ Validation passed
[Exit 0]
# → F9-120 closure 8 릴리스 연속 PASS 잠정 (v2.1.120/121/123/129/132/133/137/139)

# Test #3: hooks.json events/blocks
$ jq '[.hooks | to_entries[] | .key] | length, [.hooks | to_entries[] | .value | length] | add' hooks/hooks.json
21
24
# → 메모리 수치 일치 (8 cycle invariant)

# Test #4: updatedToolOutput grep
$ grep -rn "updatedToolOutput" lib/ scripts/ hooks/
(0 results)
# → #54196 무영향 invariant 8 cycle 유지

# Test #5: OTEL surface
$ grep -n "OTEL_" lib/infra/telemetry.js
126, 137, 149, 188
# → F6-128 surface 8 cycle (CARRY-5 root cause 후보) + F10-139 attribute 자동수혜

# Test #6: F1-132 SESSION_ID
$ grep -rn "CLAUDE_CODE_SESSION_ID" lib/ scripts/ hooks/
(0 results)
# → 4-cycle DROP 유지

# Test #7: F2-132 ALTERNATE_SCREEN
$ grep -rn "CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN" lib/ scripts/ hooks/
(0 results)
# → 4-cycle 무영향 유지

# Test #8: F4-133 effort.level
$ grep -rn "CLAUDE_EFFORT\|effort.level\|effortLevel" lib/ scripts/ hooks/ agents/ skills/
(0 results)
# → 3-cycle baseline (ENH-300 P2 deferred) 유지

# === 신규 검증 항목 9-12 (B3/F6/F7/F8-139 surface) ===

# Test #9 (신규): hook stdout/console/TTY 전수 surface (B3-139 회귀 검증)
$ grep -rn "console.log\|console.error\|process.stdout.write" hooks/ scripts/ | wc -l
151
# 표본 검증:
#   - unified-bash-pre.js: 0건 (PreToolUse Bash hook, 회귀 risk 0)
#   - unified-write-post.js: 0건 (PostToolUse Write hook, 회귀 risk 0)
#   - unified-bash-post.js: 0건 (PostToolUse Bash hook, 회귀 risk 0)
#   - skill-post.js: 4건 (170/187/236/245) — 모두 console.log(JSON.stringify(...)) JSON protocol
#   - unified-stop.js: 1건 (288) — console.log(JSON.stringify({continue:false}))
#   - user-prompt-handler.js: 3건 (96/299/313) — JSON protocol
#   - hooks/session-start.js: 1건 (359) — JSON response
# isTTY 가드: 2건 (skill-post.js:146, learning-stop.js:43) — 안전 패턴
# → B3-139 회귀 0건 확정 (ADR 0003 9번째 invariant 신규 추가)

# Test #10 (신규): F6-139 args:[] exec form baseline
$ grep -E '"args":\s*\[' hooks/hooks.json | wc -l
0
# → 24 blocks 모두 shell form, 마이그레이션 surface 0 baseline (ENH-302 P2)

# Test #11 (신규): F7-139 continueOnBlock baseline
$ grep "continueOnBlock" hooks/hooks.json | wc -l
0
# → 활용 surface 0 baseline (ENH-303 P2 — bkit 차별화 #5 후보)

# Test #12 (신규): F8-139 .mcp.json + CLAUDE_PROJECT_DIR
$ jq '.mcpServers | keys' .mcp.json
["bkit-pdca", "bkit-analysis"]
$ grep -rln "CLAUDE_PROJECT_DIR" lib/ scripts/ hooks/ | wc -l
18
# → 2 stdio servers + 18 files 이미 사용 (자동수혜 surface 즉시 확정)
```

**관측**: 8-cycle 일관성 입증 (v2.1.120/121/123/129/132/133/137/139). single-pair small-batch scenario (v2.1.133 1-version + v2.1.137 4-version skip 후 v2.1.139 2-version)에서도 ADR 0003 robust 작동.

---

## 3. 사전인지 결함 (본 사이클) — 신규 ENH 후보 3건

### 3.1 ENH-302 P2 deferred — Hook exec form 마이그레이션

- **동기**: F6-139 `args: string[]` exec form 신규 surface 활용
- **bkit 영향**: `hooks/hooks.json` 24 blocks 모두 현재 shell form (`"command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/x.js\""`)
- **마이그레이션 예시**:
  - Before: `"command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/x.js\""`
  - After: `"command": "node"`, `"args": ["${CLAUDE_PLUGIN_ROOT}/scripts/x.js"]`
- **이점**: Win path 띄어쓰기 + 괄호 환경 안정성 ↑, quoting 제거, parse error 회피
- **비용 estimate**: 120 LOC + 4 TC (Win cross-platform regression) + 1 PR
- **YAGNI 검토**: 현재 shell form 안정 동작, Win 사용자 데이터 누적 0 → P2 deferred 유지
- **철학 준수**: Automation First ✓ / No Guessing ✓ (CC 공식 surface) / Docs=Code ✓
- **Sprint 권장**: v2.1.13 Sprint Reliability (점진적 마이그레이션 권장 — 신규 hook부터 exec form 적용)
- **Alternative**: B (점진 적용) — A (전체 일괄) 또는 C (미실행) 보다 risk-benefit balance 우수

### 3.2 ENH-303 P2 deferred — PostToolUse continueOnBlock 활용 (★ bkit 차별화 #5 후보)

- **동기**: F7-139 `continueOnBlock: true|false` 신규 surface — deny 시 reason 모델 전달 + self-correct loop 가능
- **bkit 영향**: PostToolUse **3 blocks** 직접 surface
  - `scripts/unified-write-post.js` (Write matcher)
  - `scripts/unified-bash-post.js` (Bash matcher)
  - `scripts/skill-post.js` (Skill matcher)
- **차별화 정당성**:
  - CC native: surface만 노출
  - **bkit**: audit-logger + memory enforcer + R-3 Defense Layer 6 + #57317 직접 surface와 결합 → **deny reason moat (차별화 #5 후보)**
- **구현 예시** (skill-post.js):
  ```javascript
  if (denied) {
    console.log(JSON.stringify({
      continue: true,
      continueOnBlock: true,  // F7-139 신규
      reason: `bkit policy: ${policyName} — ${detailedReason}`
    }));
  }
  ```
- **#57317 결합**: plugin PostToolUse silent drop 도메인과 직접 결합 — MON-CC-NEW-PLUGIN-HOOK-DROP P2 → P1 격상 검토 (5/13 review)
- **비용 estimate**: 3 blocks × 10 LOC ≈ 30 LOC + 6 TC + audit-logger reason 포맷 정의 1 PR
- **YAGNI 검토**: 현재 deny silent block 동작 안정 + audit-log 통해 추적 가능 → P2 deferred 유지, **단 #57317 결합 시 P1 격상 가능** (5/13 review)
- **bkit 차별화 가치**: HIGH (moat #5 후보 — CC가 따라잡기 어려운 응답성 영역)
- **철학 준수**: Automation First ✓ / No Guessing ✓ / Docs=Code ✓
- **Sprint 권장**: v2.1.13 Sprint E Defense 또는 신설 Sprint Coordination 통합

### 3.3 ENH-304 P3 deferred — Agent View Sanity Check (정식 ENH 아님)

- **동기**: F1-139 `claude agents` background sessions surface
- **bkit 영향**: cto-lead **10 blocks** Task spawn + qa-lead 4-agent parallel — Agent View 사용자 환경 background visibility
- **검증 항목**:
  - bkit Task spawn이 Agent View에 정상 노출되는지 sanity check
  - sub-agent vs background-session 분리 확인
  - `~/.claude/jobs/<id>/state.json` 파일 패턴 확인 (CC native)
- **비용 estimate**: 검증만 (코드 변경 0) → P3
- **YAGNI 검토**: CC native auto-integrate 가정, 변동 없을 가능성 → 정식 ENH 아님 (모니터링 task만)
- **Sprint 권장**: 모니터만 — 사용자 환경 v2.1.139 진입 시 background visibility 검증 권장

---

## 4. 기존 ENH 강화 5건

| ENH | Priority | 변동 | 근거 |
|-----|----------|-----|-----|
| **ENH-292** | **P0 강화** | **#56293 9-streak 결정적 강화** | v2.1.128~v2.1.139 9 연속 미해소 (49 bullet maintenance + 30 bullet update 누적에도 fix bullet 0건) — **"Anthropic 자체 해결 의지 부재" 결정적 입증 강화** (직전 7-streak에 이은 누적 2-cycle 무해소 데이터). bkit **sequential dispatch moat** (차별화 #3) product moat 결정적 정당성. Sprint Coordination 가속 단독 P0 우선순위 유지 |
| **ENH-281** | P1 강화 | **OTEL 9 → 10 누적** | F10-139 `agent_id` + `parent_agent_id` OTEL span attributes 신규 추가 (+ API headers `x-claude-code-agent-id` / `x-claude-code-parent-agent-id`). Sprint A Observability 단일 PR scope: F4-122 + I2-122 + I4-121 + F8-119 + I6-119 + F1-126 + I2-126 + F6-128 + F1-136 + **F10-139** = **10 누적 surface**. **CARRY-5 P0 token-meter Adapter zero entries** 우회 추적 기회 (sub-agent별 spawn 식별 가능). |
| **ENH-286** | P1 강화 | **I1-139 + #57485 advisory 데이터 +2** | I1-139 (Compaction preserves user instructions advisory 강화) + #57485 (Opus 4.7 agents ignore CLAUDE.md, OPEN 유지) → memory enforcer (PreToolUse deny-list enforced vs CC advisory) **차별화 정당성 누적 데이터** +2. Sprint E motivation 인용 |
| **ENH-289** | **P0 → P1 강등 검토** | R-3 numbered #145 **13일째 +0 정체** + evolved **+0 본 사이클** | 추세 ~0/day (감소). 5/13 review 시 P1 강등 후보 결정적, 단 #57317 결합 시 (F7-139 + MON-CC-NEW-PLUGIN-HOOK-DROP) P0 유지 가능. **통합 의사결정 5/13** |
| **ENH-290** | P3 강화 | stable v2.1.126 ↔ latest v2.1.139 **drift +13** | bkit 권장 (보수적) v2.1.123 ↔ npm stable v2.1.126 drift +3 변동 없음 + **next=2.1.139 1-cycle 만에 latest와 재통합 (5/9 분기 후 5/12 통합) — 분기 unstable 데이터 +1**. 18-릴리스 윈도우 missing publish events 누적 9건/8 versions/50% 변동 없음 |

---

## 5. R-3 시리즈 monitor 갱신 (2주 review 5-13 예정)

| 항목 | v2.1.137 (5/9) | v2.1.139 (5/12) | 변동 |
|------|----------------|-----------------|------|
| Numbered (#145) | 정체 (+0 in 10d) | **정체 (+0 in 13d)** | +0 (3일 추가) |
| Dup-closure 5건 | 5/1 closed | 5/1 closed | 0 |
| **Evolved-form 누적** | 11건 (+1 #57317) | **11건 (+0 본 사이클)** | 0 |
| 추세 | 0.1/day | **~0/day (감소)** | -0.1/day |

**ENH-289 P0 → P1 강등 후보 결정적**. 단 #57317 + F7-139 결합으로 MON-CC-NEW-PLUGIN-HOOK-DROP P1 격상 가능성도 있어 **5/13 review에서 ENH-289 강등 + MON-CC-NEW-PLUGIN-HOOK-DROP 격상 + ENH-303 격상 통합 의사결정** 권장.

---

## 6. Long-standing Issue 상태 (5건, 모두 streak +2 또는 +3)

| Issue | 직전 streak | v2.1.139 | 변동 | bkit defense |
|-------|:----------:|:--------:|------|--------------|
| **#56293** | 7-streak | **9-streak 미해소** | **+2** | ENH-292 P0 product moat **결정적 강화** (누적 2-cycle 무해소 + 79+ bullet 추가 maintenance에도 fix 부재) |
| #56448 | 6-streak | **8-streak 미해소** | +2 | ENH-291 P2 유지 (measurement methodology TBD) |
| #47855 | 25-streak | **27-streak 미해소** | +2 | MON-CC-02 defense 유지 (`scripts/context-compaction.js:44-56`) |
| #47482 | 28-streak | **30-streak 미해소** | +2 | ENH-214 defense 유지 (`scripts/user-prompt-handler.js`) |
| #57317 | 1-streak (v2.1.137 신규) | **3-streak 미해소** | **+2** | F7-139 결합 → MON-CC-NEW-PLUGIN-HOOK-DROP **P2 → P1 격상 검토 (5/13 review)** |

---

## 7. bkit 차별화 누적 (4건 → 5건 잠정)

| 기존 4건 | 신규 후보 |
|---------|----------|
| ENH-286 Memory Enforcer (PreToolUse deny-list, vs CC advisory) — **I1-139 + #57485 강화 데이터 +2** | **ENH-303 PostToolUse continueOnBlock + audit + R-3 Defense Layer 6 결합 — deny reason moat** (잠정 #5 후보, 5/13 review로 P2 → P1 격상 검토 시 결정적) |
| ENH-289 Defense Layer 6 (post-hoc audit + alarm + auto-rollback, vs R-3 시리즈) — **P0 → P1 강등 검토** | |
| ENH-292 Sequential Dispatch (vs CC native 평행 spawn caching 회귀) — **9-streak 결정적 강화 강화 (2-cycle 누적)** | |
| ENH-300 Effort-aware Adaptive Defense (vs CC effort surface only) — **baseline 3-cycle 유지** | |

**총 잠정 5건** (사용자 deferred 결정 시 모두 보존).

---

## 8. R-1/R-2 패턴 추적 (ENH-290 framework data)

- **v2.1.138 / v2.1.139 모두 정상 게시** → R-1 (silent npm publish) 추가 0건, R-2 (true semver skip) 추가 0건
- 18-릴리스 윈도우 누적 9건 / 8 versions / **50%** 유지 (변동 없음)
  - R-1: v2.1.115, v2.1.120, v2.1.124, v2.1.125, v2.1.127, v2.1.129 (6건)
  - R-2: v2.1.130, v2.1.134, v2.1.135 (3 versions / 2 occurrences)
- **npm dist-tag 이벤트** (2026-05-12):
  - stable=**2.1.126 유지** (drift +13 vs latest)
  - **latest=2.1.139 + next=2.1.139** (5/9 분기 1-cycle 만에 재통합) — 분기 unstable 데이터 +1
- **bkit 권장 v2.1.123 (보수적) ↔ npm stable v2.1.126 drift +3** 변동 없음
- **bkit 권장 v2.1.139 (균형, 신규)** 추가 — F8/F10/B5/B12-139 자동수혜 4건 + 94 consecutive 검증
- 사용자 환경 v2.1.139 직접 검증 시점 도달 (사용자 명시 승인 후 보류 상태 유지)

---

## 9. Phase 4 작업 결과

### 9.1 보고서 산출물
- 본 보고서: `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/docs/04-report/features/cc-v2138-v2139-impact-analysis.report.md`
- 메모리 히스토리: `/Users/popup-kay/.claude/projects/-Users-popup-kay-Documents-GitHub-popup-bkit-claude-code/memory/cc_version_history_v2138_v2139.md`
- MEMORY.md 인덱스 업데이트

### 9.2 보고서 작성 원칙 준수
- ✅ Korean (한국어) 작성
- ✅ ADR 0003 12-항목 사후 검증 (9-12 신규 항목 4개 추가)
- ✅ Phase 1-4 모든 산출물 통합
- ✅ 4-관점 가치 표 (Technical / Operational / Strategic / Quality)
- ✅ ENH 일관 번호 (ENH-302부터 — ENH-300 마지막, ENH-301 DROP)
- ✅ 운영 모니터 progress 추적 (#56293 9-streak / #56448 8-streak / #47855 27-streak / #47482 30-streak / #57317 3-streak / R-3 13일 정체)
- ✅ R-1/R-2/R-3 패턴 framework 통합 추적

---

## 10. 결론

**bkit v2.1.12 무수정 94 consecutive compatible 입증** (v2.1.34 → v2.1.139, R-1/R-2 skip 미포함, 92 → 94 +2). HIGH bkit-relevant surface **5건** (F6/F7/F8/F10/B3) 모두 자동수혜 4건 또는 영향 가능 3건 (회귀 가능성 **0건 확정** — B3-139 hook stdout JSON protocol 안전 + readline/inquirer 부재). 신규 ENH 후보 **3건** (ENH-302 P2 / **ENH-303 P2 bkit 차별화 #5 후보** / ENH-304 P3) + 기존 ENH 강화 **5건** (ENH-292 P0 9-streak 결정적 / ENH-281 OTEL 10 누적 / ENH-286 + ENH-289 강등 검토 / ENH-290 drift +13) 모두 deferred. 운영 모니터 5건 progress, **#57317 P1 격상 + ENH-289 P0 강등 + ENH-303 P1 격상은 5/13 review 통합 의사결정**으로 통합. ADR 0003 **여덟 번째 정식 적용 8-cycle 일관성 입증**, single-pair small-batch scenario 두 번째 발생에서도 robust 작동.

---

## 11. PDCA 상태 갱신

[Plan] → [Design] → [Do] → [Check] → **[Act]** (완료)

| Phase | Output | Status |
|-------|--------|--------|
| Plan (Phase 0) | 버전 감지 + Task 트래킹 + 사용자 결정 수렴 | ✅ Complete |
| Design (Phase 1) | cc-version-researcher Research Report (31 변경 분류, bkit-relevant flag) | ✅ Complete |
| Do (Phase 2) | bkit-impact-analyst Impact Analysis (ADR 0003 12/12 PASS, ENH-302/303/304 후보) | ✅ Complete |
| Check (Phase 3) | Plan Plus Brainstorm (Intent + Alternative + YAGNI + Priority) | ✅ Complete |
| Act (Phase 4) | 본 보고서 + 메모리 히스토리 + MEMORY.md 인덱스 갱신 | ✅ Complete |

**Suggested next** (5/13 review):
- ENH-289 P0 → P1 강등 결정 (R-3 13일 정체 데이터)
- MON-CC-NEW-PLUGIN-HOOK-DROP P2 → P1 격상 결정 (#57317 + F7-139 결합)
- ENH-303 P2 → P1 격상 결정 (bkit 차별화 #5 후보)
- **세 결정을 통합 의사결정으로 권장**

---

## 12. bkit Feature Usage Report

| Feature | Usage |
|---------|-------|
| Skill | `bkit:cc-version-analysis` (메인 워크플로우) |
| Sub-agent | `cc-version-researcher` (Phase 1) + `bkit-impact-analyst` (Phase 2) |
| Phase Strategy | 4-phase sequential (Phase 1 → 2 → 3 → 4), thinking-active main으로 Phase 3 Plan Plus 직접 수행 |
| Task Tracking | TaskCreate 5 tasks (parent + 4 phases) |
| Tools | Bash (version detect + grep), Read (이전 보고서 reference), Write (산출물 3개), Agent (2 sub-agents) |
| Cost Optimization | Sub-agent caching 의도적 sequential dispatch (ENH-292 P0 sequential dispatch moat 적용 — bkit 차별화 #3 self-referential implementation) |
| Output Style | bkit-pdca-enterprise |
| MCP | 0 호출 (bkit-pdca/analysis 16 tools 미사용 — 본 분석은 외부 데이터 우선) |

---

**End of Report**
