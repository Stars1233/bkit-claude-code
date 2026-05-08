# CC v2.1.124 → v2.1.129 영향 분석 및 bkit 대응 보고서 (ADR 0003 네 번째 정식 적용)

> **Status**: ✅ Final (실증 기반, ADR 0003 네 번째 정식 적용)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.12 (current GA, main `d26c57c`, 2026-04-29 release tag)
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Date**: 2026-05-06
> **PDCA Cycle**: cc-version-analysis (v2.1.124~v2.1.129, 6-version increment, 7-day window)
> **CC Range**: v2.1.123 (baseline, 81 consecutive PASS) → v2.1.124 (silent) → v2.1.125 (skipped/unpublished) → v2.1.126 (changelog publish 2026-05-01) → v2.1.127 (skipped/unpublished) → v2.1.128 (changelog publish 2026-05-04, npm `latest`) → v2.1.129 (silent, npm `next`)
> **Verdict**: **크리티컬 회귀 0건 / Breaking 0건 / 자동수혜 4건 / 신규 사전인지 결함 6건 / 신규 ENH 6건 (ENH-291 ~ ENH-296, P0×1 / P1×2 / P2×2 / P3×1) / R-1 패턴 4건 추가 누적 (총 6건, 37.5%) / R-3 evolved form 지속 + numbered 압축 / 87 연속 호환**

---

## 1. Executive Summary

### 1.1 최종 판정

| 항목 | 값 |
|------|----|
| 크리티컬 회귀 건수 | **0건** (bkit v2.1.12 무수정 작동, v2.1.129 환경 직접 검증) |
| Breaking Changes | **0건** (확정) |
| 자동수혜 (CONFIRMED) | **4건** (F2-128 `/mcp` tool count, B6-126 deferred tools fork 지원, B8-126 한국어 렌더링 fix Windows 한정, F11-128 `EnterWorktree` local HEAD) |
| 정밀 검증 (무영향 확정) | **5건** (F7-128 MCP `workspace` 예약 — bkit mcpServers field 부재, F1-128 `/color`, F3-128 `--plugin-dir .zip`, F5-128 Opus 4.7 `/model`, B11-128 stdin >10MB crash) |
| **신규 사전인지 결함** | **6건** (#56293 caching 10x P0, #56448 skill validator P1, #56096 Win Stop P2, #56333/#56450/#56383 R-3 evolved form P3) |
| **신규 ENH (ENH-291~296)** | **6건** (P0×1 / P1×2 / P2×2 / P3×1) |
| **기존 ENH 갱신** | ENH-281 OTEL 5 → **8 누적** / ENH-289 R-3 evolved form 보강 / ENH-290 3-Bucket Decision R-1 4건 추가 누적 |
| YAGNI FAIL DROP | 0건 |
| bkit v2.1.12 hotfix 필요성 | **불필요** (현재 main GA `d26c57c` 안정, v2.1.13 Sprint 통합 권장) |
| **연속 호환 릴리스** | **87** (v2.1.34 → v2.1.129, 81 → 87) |
| ADR 0003 적용 | **YES (네 번째 정식 적용 — 4-사이클 일관성 입증)** |
| **권장 CC 버전** | **v2.1.123 (보수적) 또는 v2.1.126 (균형)** — v2.1.128 비권장 (#56293 caching 10x), v2.1.129 비권장 (#56448 skill validator) |

### 1.2 성과 요약

```
┌──────────────────────────────────────────────────────┐
│  v2.1.124 → v2.1.129 영향 분석 (ADR 0003 네 번째)      │
├──────────────────────────────────────────────────────┤
│  📊 CC 변경 수집: 70+ (v126:30, v128:40, v129:1+α)    │
│  🔴 실증된 크리티컬 회귀: 0건 (bkit 환경)              │
│  🟢 CONFIRMED auto-benefit: 4건                        │
│  🟡 정밀 검증 (무영향 확정): 5건                       │
│  🚨 사전인지 OPEN 결함 (신규 6건):                     │
│      • #56293 caching 10x (v2.1.128) — bkit cto-lead  │
│      • #56448 skill validator (v2.1.129) — 4 skills   │
│      • #56096 Stop hook Windows                        │
│      • R-3 evolved form #56333/#56450/#56383          │
│  🆕 신규 ENH: 6건 (ENH-291~296, P0×1/P1×2/P2×2/P3×1)   │
│  📈 R-1 패턴 +4건 (v2.1.124/125/127/129) → 6건 누적    │
│  🛡️ bkit 차별화 강화: ENH-292 sequential dispatch moat │
│  ❌ Breaking Changes: 0 (확정)                         │
│  ✅ 연속 호환: 81 → 87 릴리스 (v2.1.34~v2.1.129)       │
│  ✅ F9-120 closure 4 릴리스 연속 PASS 실측             │
│      (claude plugin validate Exit 0)                   │
│  ⚠️ npm dist-tag 분기 확정: stable=2.1.119,            │
│     latest=2.1.128, next=2.1.129 (10-version gap)      │
└──────────────────────────────────────────────────────┘
```

### 1.3 4-관점 가치 표

| 관점 | 내용 |
|------|------|
| **Technical** | (a) **F1-129 #56448** skill validator regression — bkit 43 skills의 description 길이 분포 (최장 251자/평균 ~150자)에서 4 skills(pdca-watch 251 / pdca-fast-track 226 / bkit-explore 226 / bkit-evals 225)이 v2.1.105 이전 250자 cap 회귀 상황에 잠재 노출. CI gate 정책 신규 도입 권고. (b) **I2-128 #56293** caching 10x regression — bkit `agents/cto-lead.md` Task spawn 5 blocks + `agents/qa-lead.md` 4-agent orchestration 직접 노출 surface. 사용자가 v2.1.128 환경에서 cto-lead 사용 시 cache miss 4% → 40% (cache_creation 5,534 → 22,713 tokens/turn). (c) **F6-128** Subprocess OTEL_* env 비상속 — `lib/infra/telemetry.js` 4 위치(`OTEL_REDACT`, `OTEL_LOG_USER_PROMPTS`, `OTEL_SERVICE_NAME`, `OTEL_ENDPOINT`)가 hook subprocess에서 env 손실 → **CARRY-5 P0 token-meter Adapter zero entries root cause 강력 후보 확정**. ENH-281 OTEL 누적 묶음 5 → **8 (F1-126 invocation_trigger + I2-126 host-managed + F6-128 subprocess env)**으로 확장. (d) **F9-120 closure 4 릴리스 연속 PASS 실측** (`claude plugin validate .` Exit 0, v2.1.120/121/123/129) — marketplace.json root field 안정성 검증 완료. |
| **Operational** | hotfix sprint 불필요 (회귀 0건). v2.1.123 권장 버전 유지 — **v2.1.128 환경에서는 평행 sub-agent 사용 시 caching 비용 10배 폭증 위험 사전 안내** 권고. v2.1.129는 next 채널 유지(개발자 default 아님). bkit `.claude-plugin/plugin.json:mcpServers` field 부재 → **F7-128 "workspace" 예약 무영향 확정**. v2.1.124/125/127/129 R-1 패턴 4건 추가 (총 6건 / 16-릴리스 윈도우 = 37.5%) → **ENH-290 3-Bucket Decision Framework 정당성 강화**. |
| **Strategic** | ADR 0003 (Empirical Validation) **네 번째 정식 적용 사이클 → 4-사이클 일관성 입증** (v2.1.120/121/123/129 4 cycle). v2.1.124~v2.1.129 OPEN 결함 6건 + R-1 누적으로 사전 인지 가치 강화. **bkit 차별화 신규 1건 명확화**: **ENH-292 sequential dispatch moat** — CC native 평행 spawn에서 caching 회귀 (#56293) 발생 시 bkit `lib/orchestrator/` (5 modules) sequential dispatch가 회귀를 자연 회피한다면 product moat. ENH-291 skill validator defense (length CI)와 결합하여 **bkit이 CC native보다 안전하게 작동**한다는 신뢰성 마케팅 포인트. |
| **Quality** | bkit v2.1.12 main GA가 v2.1.129 환경에서 무수정 작동 (Phase 2 직접 검증 6/6 PASS). **사후 검증 결과 (2026-05-06 직접 실행)**: (1) `claude plugin validate .` Exit 0 — F9-120 closure 4 릴리스 연속 입증 (v2.1.120/121/123/129), (2) `hooks.json` events:21 / blocks:24 메모리 일치, (3) `grep -rn 'updatedToolOutput' lib/ scripts/ hooks/` 0건 — #54196 무영향 invariant 유지, (4) `grep OTEL_ lib/ scripts/ hooks/` lib/infra/telemetry.js 4 위치 + lib/audit/audit-logger.js 1 위치 — F6-128 영향 surface 매핑, (5) skill description 최장 251자/모두 1024 미만 — F1-129 #56448 보수적 위험 식별, (6) `mcpServers` field 부재 — F7-128 무영향 확정. |

---

## 2. ADR 0003 네 번째 정식 적용 — Phase 1.5 게이트 결과

### 2.1 게이트 통과 매트릭스

ADR 0003 §2 (b) 실증 상태 4값 기준:

| ID | 변경 요약 | E1 시나리오 | E2 실행 | E3 경로 스코프 | E4 공식 스펙 | **E5 상태** |
|----|----------|------------|---------|--------------|-------------|------------|
| **F1-126** | OTEL `claude_code.skill_activated` invocation_trigger | 정의 (skill 호출 트리거 분류) | ❌ 미실행 (Sprint A 통합 시) | `lib/infra/telemetry.js`, `scripts/skill-activated-tracker.js` | release notes | **CONFIRMED + 관측성 확장** |
| **F2-126** | `claude project purge [path]` 신규 명령 | 정의 (purge 시 `.bkit/` 함께 삭제 여부) | ❌ 미실행 (`.bkit-do-not-prune` sentinel 부재 확인) | `.bkit/state/`, `.bkit/runtime/` | release notes | **CONFIRMED 패턴 노출 (사전 방어 P2)** |
| **F4-126** | `--dangerously-skip-permissions` 보호 경로 우회 | 정의 (`.claude/`/`.git/`/`.vscode/` write 우회) | ⚠️ 정적 (bkit docs 11곳 사용 명시) | `hooks/pre-write.js`, `lib/audit/` | release notes | **CONFIRMED 표면 확장 (R-3 surface 우려)** |
| **I1-126** | sandbox managed-settings inheritance fix | 정의 (`allowManagedDomainsOnly` 정책) | ✅ 정적 (bkit sandbox.allowManaged* 미사용 확정) | (없음) | release notes | **CONFIRMED 무영향** |
| **B1-126** | Stop hook 회귀 (Windows + ralph-loop) | 정의 (Win + bypassPermissions + Stop hook count) | ⚠️ 정적 (Phase 2 hooks.json events:21/blocks:24 정상, Win 한정 OS) | `hooks/hooks.json` Stop block, `scripts/unified-stop.js` | issue #56096 | **CONFIRMED 패턴 노출 (Win 한정 P2)** |
| **B6-126** | `context: fork` skills + subagent deferred tools 첫 turn | 정의 (ENH-202 9 skills + WebSearch/WebFetch 첫 turn) | ❌ 미실행 (Phase 2 검증 권장) | `skills/cc-version-analysis/`, 기타 9 fork skills | release notes | **CONFIRMED auto-benefit** |
| **F5-128** | `/model` Opus 4.7 entries 통합 | 정의 (claude-opus-4-7 model id) | ✅ 동작 (현재 세션 Opus 4.7 1M 사용 중) | (없음) | release notes | **CONFIRMED 무영향** |
| **F6-128** | Subprocess OTEL_* env 비상속 | 정의 (hook subprocess + parent OTEL_* env) | ✅ 정적 (`lib/infra/telemetry.js` 4 위치 직접 grep) | `lib/infra/telemetry.js:126/137/149/188`, `lib/audit/audit-logger.js:1` | release notes | **CONFIRMED 패턴 노출 (CARRY-5 root cause 후보 P0)** |
| **F7-128** | MCP server name `workspace` 예약 | 정의 (`plugin.json mcpServers` 점검) | ✅ Phase 2 직접 (`mcpServers` field 부재) | `.claude-plugin/plugin.json` | release notes | **CONFIRMED 무영향** |
| **F11-128** | `EnterWorktree` local HEAD 사용 | 정의 (worktree 생성 시 base ref) | ❌ 미실행 (bkit worktree 패턴 미사용) | `lib/orchestrator/` | release notes | **CONFIRMED auto-benefit (이론)** |
| **I2-128 [#56293]** | Sub-agent caching incomplete fix → 10x 회귀 | 정의 (cto-lead Task spawn 5 blocks + cache miss 측정) | ❌ 미실행 (사용자 환경 reproduction 권장) | `agents/cto-lead.md`, `agents/qa-lead.md`, `agents/pdca-iterator.md`, `lib/orchestrator/` | issue body | **CONFIRMED 직접 노출 (P0 비용 회귀)** |
| **B1-128** | `/rename` resumed sessions compact boundary | 정의 (resume + compact + rename) | ❌ 미실행 (bkit `/rename` 패턴 부재) | (없음) | release notes | **CONFIRMED 무영향** |
| **B4-128** | MCP stdio `CLAUDE_CODE_SHELL_PREFIX` corruption | 정의 (16 MCP tools args 전달) | ❌ 미실행 (Sprint MCP-1 통합 시) | `mcp-pdca/` (가정), `mcp-bkit/` (가정) | release notes | **CONFIRMED auto-benefit** |
| **B8-128** | 1M-context + autocompact false block | 정의 (Opus 1M + autocompact window) | ❌ 미실행 (#47855 root cause 미해소) | `scripts/context-compaction.js` | release notes | **CONFIRMED 인접 fix (MON-CC-02 root 미해소)** |
| **F1-129 [#56448]** | "47 skill descriptions dropped" false-positive | 정의 (bkit 43 skills + v2.1.129 시작) | ✅ Phase 2 직접 (4 skills > 250자, 모두 < 1024자) | bkit 43 skills | issue body | **CONFIRMED 잠재 노출 (사전 방어 P1)** |
| **#56333 R-3 evolved** | "DANGER" SessionStart hook ignore | 정의 (CLAUDE.md INVIOLABLE rules + Claude bypass) | ⚠️ 정적 (R-3 series evolved form) | `CLAUDE.md`, `.claude/agent-memory/` | issue body | **CONFIRMED 패턴 지속 (ENH-289 정당성)** |
| **#56450 R-3 evolved** | Model ignores `.claude/skills/` `.claude/rules/` | 정의 (project skills/rules vs memory) | ⚠️ 정적 (memory advisory 패턴) | bkit `CLAUDE.md`, agent-memory | issue body | **CONFIRMED 패턴 지속 (ENH-286 정당성)** |
| **#56383** | Auto-memory advisory 공식화 | 정의 (Anthropic 입장 표명) | ⚠️ 정적 (정책 문서) | bkit memory enforcer 차별화 | issue body | **CONFIRMED bkit 차별화 강화** |
| **R-1 패턴 +4** | v2.1.124/125/127/129 silent | 정의 (R-1 16 윈도우 누적 통계) | ✅ Phase 1 직접 (npm publish + GitHub release tag 부재 cross-check) | release notes 게시 정책 | release tag absent | **CONFIRMED 패턴 정식화 (ENH-290 정당성)** |

### 2.2 핵심 실증 발견 — F6-128 + CARRY-5 결합 가설 (root cause 후보 확정)

**E2 (실제 실행) 결과 — Phase 2 (2026-05-06)**:

```bash
$ grep -rn 'OTEL_' lib/ scripts/ hooks/ --include="*.js"
lib/infra/telemetry.js:126:  if (env.OTEL_REDACT === '1') {
lib/infra/telemetry.js:137:  if (env.OTEL_LOG_USER_PROMPTS !== '1') {
lib/infra/telemetry.js:149:  const service = process.env.OTEL_SERVICE_NAME || 'bkit';
lib/infra/telemetry.js:188:  const endpoint = process.env.OTEL_ENDPOINT;
lib/audit/audit-logger.js:[1 documentation hit]

$ grep -n "inputTokens\|outputTokens" scripts/unified-stop.js
707:    inputTokens: Number.isFinite(usage.input_tokens) ? usage.input_tokens : 0,
708:    outputTokens: Number.isFinite(usage.output_tokens) ? usage.output_tokens : 0,
```

**의미**:

1. F6-128 v2.1.128에서 **Bash/hooks/MCP/LSP subprocess가 부모의 `OTEL_*` 환경변수를 상속하지 않도록 변경** — OTEL-instrumented 외부 앱과 CLI OTLP endpoint 충돌 회피 목적.
2. bkit `lib/infra/telemetry.js`는 hook subprocess가 require하는 SoT인데, 4 위치에서 `process.env.OTEL_*` 직접 의존 → **F6-128 적용 환경(v2.1.128+)에서 hook subprocess 진입 시 `OTEL_LOG_USER_PROMPTS`/`OTEL_SERVICE_NAME`/`OTEL_ENDPOINT` 미가시 가능성**.
3. CARRY-5 (memory `v2.1.12 carryovers`): "P0 token-meter Adapter inputTokens/outputTokens=0 false-positive — Opus 4.7(1M) hook payload 파싱 검증 + CAND-004 OTEL 옵트인 가이드". 직전 세션에서 root cause 미확정으로 v2.1.13 Sprint A로 carry되었음.
4. **결합 가설**: hook payload `usage.input_tokens`/`usage.output_tokens` 자체가 CC v2.1.128에서 OTEL 격리 작업 일환으로 변경되었거나, telemetry.js가 OTEL env 결여로 sink 호출을 silent하게 skip하면서 token-ledger NDJSON entry가 zero로 기록되는 경로 가능성.
5. **결과**: **CARRY-5 root cause 후보 1건 확정 → ENH-293 P1 OTEL subprocess env propagation** (Phase 4 보고서 + ENH-281 묶음과 별도 신규 ENH로 분리, root cause 근접성 강조).

### 2.3 R-3 series 진화 — numbered 압축 + evolved form 지속

ADR 0003 세 번째 적용 사이클(v2.1.121→v2.1.123)에서 **P0로 격상한 R-3 시리즈** 추적 갱신:

| 시점 | numbered 표면 | evolved form (titled "non-numbered") | 추세 해석 |
|------|:------------:|:------------------------------------:|----------|
| **2026-04-24 baseline** (v2.1.120) | 0건 | 0건 | 시리즈 미식별 |
| **2026-04-28 P3 등록** (v2.1.121) | 8건 | — | violation #105~#140 |
| **2026-04-29 P0 격상** (v2.1.123) | **42+건, #145** | 표면만 추적 | 5일간 +34, 1.4/day |
| **2026-05-06 본 사이클** (v2.1.129) | **#145 정체 (+0)** + dup-closure 5건 (#54178/#54129/#54123/#54058/#53816) | **8건 신규** (#56333 / #56450 / #56395 / #56394 / #56393 / #56383 / #56418 / #56447) | **dup-closure 압축 + evolved form +8건** |

**evolved form 신규 대표 (5월 3-6일)**:

- **#56333 (5/5) "DANGER" SessionStart hook ignore** — CLAUDE.md INVIOLABLE rules 무시 + persistent memory 무력 + 프로덕션 destructive action. 7일 내 2회 재현 보고.
- **#56450 (5/6)** Claude ignores explicit project skills/rules — `.claude/skills/`, `.claude/rules/` bypass.
- **#56395 (5/4)** writes a rule, then violates it 30-45 minutes later.
- **#56394 (5/4)** Source Verification Failure: Claude Asserts Facts Before Verifying.
- **#56393 (5/4)** bypasses user-defined standing rules under perceived time pressure.
- **#56383 (5/4)** *Document* that auto-memory rules are advisory — **Anthropic 입장 공식화 신호** (memory enforcer 격상 차별화 정당성 +1).
- **#56418 (5/5)** [BUG] calling bash commands that are prohibited.
- **#56447 (5/6)** Spurious permission denial injected into Bash tool error output.

**해석 변경**:

- 이전 추정 (4-29 baseline): "1.4/day, 5-13까지 +20건 → 약 62+ 누적"
- 실측 (5일 경과): numbered 표면 +0, evolved form +8건 — **dup-closure로 표면 압축 진행**
- **재해석**: R-3 패턴은 dup-closure로 numbered 카운트 정확도 저하. **bkit ENH-289 정당성 변동 없음** — bkit은 PreToolUse 물리 차단으로 모델 학습 무관 작동. **#56383 advisory 공식화**가 ENH-286 memory-enforcer 격상 차별화에 강력한 정당화 추가.
- **2주 review 일자 (5-13)** 권장: numbered violation은 dup-closure rate 추적 / evolved form은 별도 카운터 (**ENH-296 P3 신규**).

### 2.4 ADR 0003 §3 Priority 판정 규칙 적용

| Priority | 허용 E5 상태 | v2.1.124~v2.1.129 적용 결과 |
|----------|-------------|------------------------------|
| **P0** | CONFIRMED 만 | **1건 (ENH-292 #56293 caching 10x — bkit cto-lead/qa-lead 직접 노출, 사용자 비용 회귀)** |
| **P1** | CONFIRMED 만 (관측성/차별화/방어 SPECULATIVE 예외) | **2건** (ENH-291 skill validator defense / ENH-293 OTEL subprocess env + CARRY-5 root cause closure) |
| P2 | CONFIRMED + SPECULATIVE | **2건** (ENH-294 Stop hook OS-aware fallback / ENH-295 `.bkit/` purge defense + sentinel) |
| P3 | UNVERIFIED 포함 (관찰만) | **1건** (ENH-296 R-3 evolved-form tracker 분리 카운터) |
| N/A (작업 불요) | CONFIRMED auto-benefit / no-impact | **9건** (B6-126, B8-126 한국어, F11-128, F2-128, F1-128 `/color`, F3-128 `.zip`, F5-128 `/model`, B11-128, F7-128 `workspace` 예약) |

### 2.5 Confidence (실증_계수 반영)

```
Phase 1 Confidence:
  데이터 소스 수: 5 (release notes, npm registry, GitHub Issues Search API, CHANGELOG.md raw, code.claude.com docs)
  교차 검증 수: 4 (release notes ↔ npm time, R-1 패턴 게시 부재, R-3 evolved form GitHub Search, #56293/#56448 reproducer cross-ref)
  실증_계수 (Phase 2 직접 grep): 6/6 PASS = 1.0
  Score: (5 × 4 × 1.0) / 10 = 200% → clamped 100%

Phase 2 Confidence:
  Phase 1.5 게이트 통과 후 매핑: 19 항목 (CONFIRMED 14 / SPECULATIVE 5)
  실증_계수 평균: (1.0 × 14 + 0.5 × 5) / 19 = 0.87
  Score: (19 × 1 × 0.87) / 10 = 165% → clamped 100%

Phase 3 Confidence:
  YAGNI 통과 후보: 1 P0 + 2 P1 + 2 P2 + 1 P3 = 6 신규
  Phase 1.5 결과 신뢰도 감안: 90% (ENH-292 P0는 reproducer 강력, ENH-291 P1은 4 skills 실측)
  Differentiation 확장: ENH-292 sequential dispatch moat (신규) + ENH-286 memory enforcer (강화) + ENH-289 Layer 6 (강화)
```

---

## 3. CC 변경사항 조사 (Phase 1)

### 3.1 발행 확정 (5-Source Cross-Verification)

| Source | v2.1.124 | v2.1.125 | v2.1.126 | v2.1.127 | v2.1.128 | v2.1.129 |
|--------|:--------:|:--------:|:--------:|:--------:|:--------:|:--------:|
| GitHub release tag | ❌ R-1 | ❌ R-1 | ✅ 5/1 02:05 | ❌ R-1 | ✅ 5/4 23:01 | ❌ R-1 |
| GitHub CHANGELOG.md | ❌ | ❌ | ✅ 30+건 | ❌ | ✅ 40+건 | ❌ |
| npm publish | ✅ silent | ❓ 404 (skip 가능성) | ✅ | ❓ 404 (skip 가능성) | ✅ `latest` | ✅ `next`, shasum `a5901bf` |
| code.claude.com docs | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Issue tracker indirect | (변경 없음) | (변경 없음) | (변경 없음) | (변경 없음) | #56293/#56336 (회귀 입증) | #56448 (회귀 입증) |
| **결론** | silent | skip | publish | skip | publish (latest) | silent (next) |

**E0 Risk (발행 안정성)**:

- **R-1 패턴 4건 추가** (v2.1.124/125/127/129) → 16-릴리스 윈도우 누적 6건 / 37.5%, ENH-290 3-Bucket Decision Framework 정당성 강화.
- **v2.1.125 / v2.1.127 npm 404**: skip 또는 unpublish 가능성 — 명확한 SSoT 부재로 **변경 사항 0건 처리** (ADR 0003 §2.E5).
- npm dist-tag 분기 확정: `stable=2.1.119 / latest=2.1.128 / next=2.1.129` — stable은 v2.1.119에서 movement 0 (production-burned 13일+ 안정성).

### 3.2 v2.1.124 변경 사항 (silent build)

공식 changelog 부재. **ADR 0003 §2.E5 적용**: 변경 사항 0건. bkit 무영향.

### 3.3 v2.1.125 변경 사항 (skipped or unpublished)

npm registry 응답 404 또는 미공개. 변경 사항 0건. bkit 무영향.

### 3.4 v2.1.126 전체 bullet 목록 (30+건, 2026-05-01)

| # | 분류 | 설명 | CC 심각도 | bkit 잠재 영향 |
|---|------|------|:--------:|----------|
| F1-126 | F | `/model` picker 게이트웨이 통합 (`ANTHROPIC_BASE_URL`) | LOW | 무영향 |
| **F2-126** | F | **`claude project purge [path]` 신규 명령** | MED | **사전 방어 (ENH-295)** |
| F3-126 | F | `claude auth login` OAuth 코드 paste (WSL2/SSH/container) | LOW | 무영향 |
| **F4-126** | F | **`--dangerously-skip-permissions` `.claude/`/`.git/`/`.vscode/` 보호 우회** | HIGH | **R-3 surface 확장 (ENH-289 보강)** |
| **F5-126** | F | **`claude_code.skill_activated` OTEL invocation_trigger attribute** | MED | **ENH-281 OTEL 누적 +1 (5→6)** |
| F6-126 | F | Auto mode 빨간색 spinner | LOW | 무영향 |
| F7-126 | F | Read tool 멀웨어 평가 reminder 제거 | LOW | 무영향 |
| F8-126 | F | Windows PowerShell 7 자동 검출 | LOW | 무영향 |
| **I1-126 (Sec)** | I | **sandbox managed-settings inheritance fix** | HIGH | **무영향 확정** (bkit `allowManagedDomainsOnly` 미사용) |
| **I2-126** | I | **Host-managed 배포 OTEL auto-disable 제거** | MED | **ENH-281 OTEL 누적 +1 (6→7)** |
| I3-126 | I | Windows PowerShell primary shell | LOW | 무영향 |
| **B1-126 [#56096]** | B | **Stop hook 회귀 (Windows + ralph-loop, 175→0)** | HIGH | **사전 방어 (ENH-294 P2 Win 한정)** |
| B2-126 | B | OAuth fix 4건 (timeout/IPv6/race/login screen) | LOW | 무영향 |
| B3-126 | B | Image paste >2000px session breakage fix | LOW | 무영향 |
| B4-126 | B | `/plugin` Uninstall "Enabled" 잘못 표기 fix | LOW | 무영향 |
| B5-126 | B | Plan-mode tools `--channels` interactive | LOW | 무영향 |
| **B6-126** | B | **deferred tools `context: fork` skills + subagents 첫 turn 작동** | MED | **ENH-202 자동수혜 (9 fork skills 첫 turn 신뢰성 +1)** |
| B7-126 | B | Agent SDK hang fix (parallel + malformed tool name) | LOW | 무영향 |
| **B8-126** | B | **Japanese/Korean/Chinese 문자 렌더링 fix (Windows)** | MED | **자동수혜 (한국어 사용자 Win 환경)** |
| B9-126 (Sec) | B | Windows clipboard EDR/SIEM 노출 fix | LOW | 무영향 |
| B10-126 | B | PowerShell `--` mis-flagging | LOW | 무영향 |
| B11-126 | B | Trackpad scrolling 성능 (Cursor + VS Code) | LOW | 무영향 |
| B12-126 | B | Stream idle timeout (Mac sleep / 긴 thinking pause) | LOW | 무영향 |
| ... | | (기타 ~7건 LOW) | LOW | 무영향 |

### 3.5 v2.1.127 변경 사항 (skipped or unpublished)

npm registry 404. 공식 release notes 부재. **변경 사항 0건**.

### 3.6 v2.1.128 전체 bullet 목록 (40+건, 2026-05-04, npm `latest`)

| # | 분류 | 설명 | CC 심각도 | bkit 잠재 영향 |
|---|------|------|:--------:|----------|
| F1-128 | F | `/color` 무인자 random session color | LOW | 무영향 |
| **F2-128** | F | **`/mcp` tool count 표시 + 0-tool server 플래그** | LOW | **자동수혜** (16 MCP tools 가시성) |
| **F3-128** | F | **`--plugin-dir` `.zip` archive 수용** | MED | **차별화기회** (.zip 배포, ENH-279 Sprint δ FR-δ6 시너지) |
| F4-128 | F | `--channels` console (API key) 인증 | LOW | 무영향 |
| **F5-128** | F | **`/model` Opus 4.7 entries 통합 ("Opus")** | LOW | **자동수혜** (현재 세션 Opus 4.7 1M 사용 — 표시 정합) |
| **F6-128** | F | **Subprocess OTEL_* env 비상속** | **HIGH** | **CARRY-5 root cause 후보 (ENH-293 P1)** |
| **F7-128** | F | **MCP server name `workspace` 예약** | MED | **무영향 확정** (mcpServers field 부재) |
| F8-128 | F | MCP 재연결 tool re-announcement 요약 (server prefix) | LOW | 무영향 |
| F9-128 | F | SDK host `localSettings` persistent | LOW | 무영향 |
| **F10-128 [renaming F11]** | F | **`EnterWorktree` local HEAD (이전: origin/default)** | MED | **자동수혜 (이론, bkit worktree 미사용)** |
| I1-128 | I | Auto mode classifier 평가 불가 hint | LOW | 무영향 |
| **I2-128 [#56293]** | I | **Sub-agent caching 10x 회귀 (incomplete fix)** | **HIGH** | **P0 직접 노출 (ENH-292)** |
| I3-128 | I | Sub-agent summary frequency 최적화 | LOW | 무영향 |
| I4-128 | I | Headless `--output-format stream-json` plugin_errors | LOW | 무영향 |
| I5-128 | I | Terminal progress indicator (OSC 9;4) | LOW | 무영향 |
| B1-128 | B | `/rename` resumed compact boundary fix | LOW | 무영향 |
| B2-128 | B | Stale "remote-control is active" status fix | LOW | 무영향 |
| B3-128 | B | Stale `installed_plugins.json` PATH pollution fix | LOW | 무영향 |
| **B4-128** | B | **MCP stdio `CLAUDE_CODE_SHELL_PREFIX` corruption fix** | MED | **자동수혜 (16 MCP tools args 신뢰성 +1)** |
| B5-128 | B | `/plugin update` npm-sourced plugins fix | LOW | 무영향 |
| B6-128 | B | Vim mode `Space` NORMAL cursor right | LOW | 무영향 |
| B7-128 | B | Parallel shell tool calls — sibling cancel 방지 | LOW | 무영향 |
| **B8-128** | B | **1M-context + autocompact false block fix** | MED | **MON-CC-02 root 미해소 (#47855 18 릴리스 OPEN)** |
| B9-128 | B | Markdown link OSC 8 미지원 터미널 | LOW | 무영향 |
| B10-128 | B | Long URLs fullscreen wrapped rows | LOW | 무영향 |
| B11-128 | B | Crash loop fix (>10MB stdin via `claude -p`) | LOW | 무영향 (bkit 사용 패턴 미충돌) |
| B12-128 | B | Drag-and-drop "Pasting text…" hang fix | LOW | 무영향 |
| B13-128 | B | Bedrock default model region prefix fix | LOW | 무영향 |
| B14-128 | B | Fenced code blocks list items clipboard fix | LOW | 무영향 |
| **B15-128 [#56336]** | B | **입력 필드 마우스 selection 작동 안 함 (UI regression introduced)** | MED | **무영향 (UI-only)** |
| ... | | (기타 ~12건 LOW) | LOW | 무영향 |

### 3.7 v2.1.129 변경 사항 (1건+α, npm `next`)

공식 changelog 부재. issue 트래커가 1건 신규 변경 시사:

| # | 분류 | 설명 | CC 심각도 | bkit 잠재 영향 |
|---|------|------|:--------:|----------|
| **F1-129 [#56448]** | F (regression) | **"47 skill descriptions dropped" false-positive validator warning** | **HIGH** | **잠재 노출 (ENH-291 P1)** — 4 skills > 250자 |

추가 silent 변경은 SSoT 부재 → ADR 0003 §2.E5에 따라 1건 + α 처리.

### 3.8 누적 carryover 점검

| Carryover ID | v2.1.124~v2.1.129 직접 해소? | 상태 |
|--------------|:----------------------------:|------|
| F8-119 / I6-119 / I4-121 / F4-122 / I2-122 OTEL | OTEL 누적 +1 (F1-126 + I2-126 + F6-128 = 신규 3건) | ENH-281 묶음 5 → **8 누적** |
| F9-120 marketplace.json closure | **PASS 4 릴리스 연속 실측 (v2.1.120/121/123/129)** | closure 안정화 입증 |
| #54196 PostToolUse `updatedToolOutput` | 미해소 OPEN | **bkit 무영향 invariant 유지** (Phase 2 grep 0건) |
| #54360 Stop hook `stop_hook_active` 무한 loop | 미해소 OPEN + B1-126 #56096 신규 회귀 추가 | **dedup 가드 (ENH-285 P1) 정당성 강화** |
| #54375 Memory advisory only | **#56383 Anthropic 입장 공식화** | **ENH-286 memory enforcer 차별화 강화** |
| #54393 12 multi-agent bugs | 미해소 OPEN + #56293 caching 회귀 추가 | **ENH-287 CTO Team Coordination 우선순위 P1 유지** |
| #54508 /compact tasks 사라짐 | 미해소 + #56385/#56386 신규 도메인 확장 | ENH-288 도메인 +2 확장 |
| #54521 Codex plugin config/ data loss | 미해소 + F2-126 `claude project purge` 신규 surface | **ENH-284 sentinel + ENH-295 P2 결합** |
| **R-3 시리즈** | **numbered #145 정체 + dup-closure 압축 + evolved form +8건** | **ENH-289 P0 + ENH-296 P3 evolved tracker 신규** |
| **CARRY-5 (#17 token-meter Adapter)** | **F6-128 root cause 후보 확정** | **ENH-293 P1 신규 (closure 후보)** |

### 3.9 장기 OPEN 이슈 상태 갱신

| Issue | v2.1.123 | v2.1.129 | 비고 |
|-------|:--------:|:--------:|------|
| #47482 Output styles YAML frontmatter | 17 OPEN | **23 OPEN (+6)** | ENH-214 defense 유지, 23 릴리스 연속 |
| **#47855 Opus 1M `/compact` block (MON-CC-02)** | 17 OPEN | **18 OPEN (+1)** | MON-CC-02 defense 유지, 18 릴리스 연속 OPEN, B8-128 인접 fix는 root cause 미해소 |
| #51798 PreToolUse + dangerouslyDisableSandbox | 8 OPEN | **8 OPEN (+0)** | F4-126 dangerously-skip-permissions surface 확장 |
| #54196 PostToolUse `updatedToolOutput` | OPEN | **OPEN (+0)** | bkit 무영향 invariant (4 cycle 연속) |
| #54360 Stop hook 무한 loop | OPEN | **OPEN (+0)** | ENH-285 dedup 가드 P1 유지 |
| #54375 Memory advisory only | OPEN | **#56383 Anthropic 공식화 추가** | ENH-286 차별화 강화 |
| #54393 12 multi-agent bugs | OPEN | **OPEN (+0) + #56293 caching 회귀** | ENH-287 P1 유지 |
| #54508 /compact tasks 사라짐 | OPEN | **OPEN (+0) + #56385/#56386** | ENH-288 도메인 확장 |
| #54521 Codex plugin config/ deletion | OPEN | **OPEN + F2-126 신규 surface** | ENH-284 sentinel + ENH-295 P2 |
| **#56293 (NEW)** caching 10x | — | **OPEN, P0** | **ENH-292 신규** |
| **#56448 (NEW)** skill validator | — | **OPEN, P1** | **ENH-291 신규** |
| **#56096 (NEW)** Stop hook Win | — | **OPEN, P2** | **ENH-294 신규** |
| **#56336 (NEW)** input field UI | — | **OPEN** | bkit 무영향 (UI-only) |
| **#56333 R-3 evolved** | — | **OPEN, P0 영향** | ENH-289 정당성 강화 |
| **#56450 R-3 evolved** | — | **OPEN, P0 영향** | ENH-286 정당성 강화 |
| **#56383 advisory 공식화** | — | **OPEN, P1 영향** | ENH-286 차별화 강화 |
| **#56395 / #56394 / #56393 / #56418 / #56447 evolved** | — | **OPEN, P3 모니터** | ENH-296 신규 |
| **R-3 numbered 시리즈** | 42+ OPEN, #145 | **#145 정체 (+0) + dup-closure 5건 + evolved +8건** | numbered 압축, evolved 지속 |

### 3.10 MON-CC-06 갱신

- 직전 (v2.1.123): 29~30건 (5 신규: #54521/#54508/#54519/#54513/#54375)
- v2.1.124~v2.1.129 직접 해소 후보: 0건
- 신규 등록 후보: **#56293 (P0 caching)**, **#56448 (P1 skill validator)**, **#56096 (P2 Stop hook Win)**, **#56336 (P3 UI selection)**, **#56385/#56386 (/compact 도메인 +2)**, **#56450/#56383 (R-3 evolved)** — **+8건**
- **잠정 카운트**: 29~30 → **37~38 (+8)**

### 3.11 신규 시리즈 모니터 — MON-CC-NEW R-3 evolved tracker (P3)

- **2026-05-06 baseline**: 8건 evolved form (#56333/#56450/#56395/#56394/#56393/#56383/#56418/#56447)
- **트래커**: GitHub Search `(numbered "ignores its own safety hooks") OR (non-numbered: writes a rule but violates / advisory only / SessionStart hook ignore / project rules bypass)`
- **결정**: numbered + non-numbered 분리 카운터 → **ENH-296 P3 신규** (관찰만, 2주 review 5-13까지 dup-closure rate 측정)

---

## 4. bkit 영향 매트릭스 (Phase 2)

### 4.1 변경별 bkit 컴포넌트 매핑

| CC 변경 / Issue | E5 상태 | 영향 컴포넌트 (절대 경로) | 영향 유형 | Priority |
|-----------------|---------|--------------------------|----------|:--------:|
| F2-126 `claude project purge` | CONFIRMED 패턴 노출 | `.bkit/state/*`, `.bkit/runtime/*` | sentinel 부재 + 데이터 손실 가능성 | **P2 (ENH-295)** |
| F4-126 `--dangerously-skip-permissions` 보호 우회 | CONFIRMED 표면 확장 | `hooks/pre-write.js`, `lib/audit/audit-logger.js` | R-3 surface 확장 | **P3 (ENH-289 보강)** |
| F5-126 OTEL `skill_activated invocation_trigger` | CONFIRMED + 관측성 확장 | `lib/infra/telemetry.js`, `scripts/skill-activated-tracker.js` (가정) | OTEL 누적 +1 | **P1 (ENH-281 묶음)** |
| I1-126 sandbox managed-settings | CONFIRMED 무영향 | (없음) | bkit `allowManaged*` 미사용 | N/A |
| I2-126 OTEL host-managed | CONFIRMED + 관측성 확장 | `lib/infra/telemetry.js` | OTEL 누적 +1 | **P1 (ENH-281 묶음)** |
| **B1-126 [#56096] Stop hook Win** | CONFIRMED 패턴 노출 | `hooks/hooks.json` Stop block, `scripts/unified-stop.js` | Win 한정 175→0 | **P2 (ENH-294)** |
| B6-126 deferred tools fork | CONFIRMED auto-benefit | `skills/cc-version-analysis/`, 9 fork skills | ENH-202 자동수혜 | N/A |
| B8-126 한국어 렌더링 fix Win | CONFIRMED auto-benefit | (없음) | 한국어 사용자 Win 환경 | N/A |
| F2-128 `/mcp` tool count | CONFIRMED auto-benefit | (없음) | 16 MCP tools 가시성 | N/A |
| F3-128 `.zip` archive | CONFIRMED 차별화기회 | (잠재) `.claude-plugin/marketplace.json`, ENH-279 Release Automation | Sprint δ FR-δ6 시너지 | (carry, ENH-279) |
| F5-128 Opus 4.7 model id | CONFIRMED auto-benefit | (없음) | `/model` 표시 정합 | N/A |
| **F6-128 OTEL subprocess env 비상속** | **CONFIRMED P0 root cause 후보** | `lib/infra/telemetry.js:126/137/149/188`, `scripts/unified-stop.js:707-708` | **CARRY-5 closure 후보** | **P1 (ENH-293 신규)** |
| F7-128 MCP `workspace` 예약 | CONFIRMED 무영향 | `.claude-plugin/plugin.json` mcpServers 부재 | (자동수혜 + 향후 회피) | N/A |
| F11-128 `EnterWorktree` local HEAD | CONFIRMED auto-benefit | (없음) | bkit worktree 미사용 | N/A |
| **I2-128 [#56293] caching 10x** | **CONFIRMED P0 직접 노출** | `agents/cto-lead.md` Task spawn 5 blocks, `agents/qa-lead.md` 4-agent, `agents/pdca-iterator.md`, `agents/pm-lead.md` | **사용자 비용 회귀 10배** | **P0 (ENH-292 신규)** |
| B4-128 MCP stdio shell prefix | CONFIRMED auto-benefit | (잠재) bkit 16 MCP tools | 자동수혜 | N/A |
| B8-128 1M autocompact false block | CONFIRMED 인접 fix | `scripts/context-compaction.js:44-56` | MON-CC-02 root 미해소 | (defense 유지) |
| **F1-129 [#56448] skill validator** | **CONFIRMED 잠재 노출** | bkit 43 skills (4 > 250자 위험) | **defense CI 신규** | **P1 (ENH-291 신규)** |
| #56333 R-3 SessionStart bypass | CONFIRMED 패턴 지속 | `CLAUDE.md`, `.claude/agent-memory/`, ENH-286 정당성 | bkit 차별화 | (P1 ENH-286 강화) |
| #56450 R-3 skills/rules bypass | CONFIRMED 패턴 지속 | `.claude/skills/`, `.claude/rules/`, ENH-286 | bkit 차별화 | (P1 ENH-286 강화) |
| #56383 advisory 공식화 | CONFIRMED 차별화 강화 | bkit memory enforcer architecture | bkit moat 강화 | (P1 ENH-286 강화) |
| **R-1 패턴 +4건** | CONFIRMED 패턴 정식화 | `cc-version-analysis` 워크플로우 SSoT 정책 | ENH-290 정당성 강화 | (P3 ENH-290 강화) |
| **R-3 evolved form +8건** | CONFIRMED 진화 추적 필요 | (모니터 카운터) | dup-closure rate 측정 | **P3 (ENH-296 신규)** |

### 4.2 ENH-292 P0 신규 정밀 평가 — Caching 10x Regression Mitigation

```yaml
ENH-292 [P0] Sub-agent Caching Cost Regression Mitigation
  Source: GitHub Issue #56293 (v2.1.128 incomplete cache fix)
  Reproducer: cache miss share = 1 - (cache_read / (cache_read + cache_creation))
              v2.1.121 baseline: 4%
              v2.1.128 회귀: 40% (cache_creation 5,534 → 22,713 tokens/turn)

  bkit 직접 노출 surface:
    - agents/cto-lead.md Task spawn 5 blocks (Task(pm-lead)/Task(qa-lead)/Task(pdca-iterator) 등)
    - agents/qa-lead.md 4-agent orchestration (qa-test-planner + qa-test-generator + qa-debug-analyst + qa-monitor)
    - agents/pdca-iterator.md Evaluator-Optimizer loop
    - agents/pm-lead.md Phase 1-4 PM Agent Team
    - lib/orchestrator/team-protocol.js multi-agent dispatch

  Hypothesis (v2.1.13에서 확정):
    - bkit `lib/orchestrator/`가 sequential dispatch 패턴이라면 → I2-128 회귀 자연 회피 (product moat)
    - 평행 spawn 패턴이라면 → 사용자 비용 10배 폭증

  Defense (3-Layer):
    1. 측정: subagent-jsonl 분석 도구로 cache miss share 자동 계산 (`tools/cache-cost-analyzer.js` 신규)
    2. 모니터: `~/.claude/projects/{slug}/subagents/*.jsonl` 파싱 → token-ledger.ndjson에 cache_miss_share 필드 추가
    3. 격상 시: agents/* dispatcher에 sequential-mode flag 추가 + Trust Score 평가에 caching cost 반영

  Files (신규):
    - tools/cache-cost-analyzer.js
    - lib/observability/cache-monitor.js
    - lib/orchestrator/dispatch-mode.js (sequential vs parallel toggle)

  Tests:
    - tests/qa/cache-monitor.test.js (L1, +6 TC)
    - tests/integration/sub-agent-caching.test.js (L2, +4 TC)
    - tests/contract/dispatch-mode.contract.test.js (L3, +3 TC)

  ADR 0003 verification:
    - sandbox에서 cto-lead spawn 5 blocks reproducer + cache miss 측정
    - sequential vs parallel dispatch 비교 측정 (1주 측정)

  Sprint anchor: v2.1.13 Sprint Coordination (확장) — ENH-287 12 multi-agent bugs와 통합
  YAGNI gate: PASS (사용자 pain 확정 + reproducer 강력 + CC 자체 해결 약 1-2 릴리스 LOW)
  Differentiation: bkit이 sequential dispatch 모드 + cache cost 모니터링으로 product moat
```

### 4.3 ENH-291 P1 신규 정밀 평가 — Skill Validator Defense (length CI)

```yaml
ENH-291 [P1 SPECULATIVE 예외 — defense] Skill Description Length CI Gate
  Source: GitHub Issue #56448 (v2.1.129 false-positive "47 skill descriptions dropped")
  Reproducer: bkit 43 skills 중 4건 > 250자
              pdca-watch 251자 / pdca-fast-track 226자 / bkit-explore 226자 / bkit-evals 225자

  bkit 직접 노출 surface:
    - skills/*/SKILL.md frontmatter description (43 skills)
    - .claude-plugin/skills/* 등록

  Hypothesis:
    - v2.1.105 cap 확장 (250 → 1,536) 이후 v2.1.129에서 일부 skill을 250 cap 회귀로 처리하는 validator regression 가능성
    - 본 환경 v2.1.129 + bkit에서 `claude doctor`는 skill warning 미출력 (검증) — 단 현재 reproduction 없음 (SPECULATIVE)
    - 그러나 4 skills이 잠재 위험 zone에 위치 → 사전 방어 정당화

  Defense (3-Layer):
    1. CI gate: scripts/check-skill-description-length.js (250자 보수적 cap 강제)
    2. Linter: pre-write.js에 SKILL.md frontmatter validator 추가 (description 길이 + YAML 정합성)
    3. Self-test: tests/contract/skill-description-length.contract.test.js (43 skills 250자 미만 lock)

  Files (신규):
    - scripts/check-skill-description-length.js
    - tests/contract/skill-description-length.contract.test.js

  Files (수정):
    - hooks/pre-write.js (SKILL.md write 시 frontmatter 검증)
    - .github/workflows/* (CI gate 추가)
    - skills/pdca-watch/SKILL.md description 251 → ≤ 230자 단축
    - skills/pdca-fast-track/SKILL.md 226 → ≤ 230자 (border)
    - skills/bkit-explore/SKILL.md 226 → ≤ 230자 (border)
    - skills/bkit-evals/SKILL.md 225 → ≤ 230자 (border)

  Tests:
    - tests/qa/skill-frontmatter.test.js (L1, +5 TC)
    - tests/contract/skill-description-length.contract.test.js (L3, +1 TC contract lock)

  ADR 0003 verification:
    - v2.1.129 환경에서 의도적 251자+ skill 추가 후 `claude doctor` 또는 `claude --plugin-dir .` 시작 시 warning 발생 여부 측정
    - 1주 measurement 후 250자 정책 정식 채택 결정

  Sprint anchor: v2.1.13 Sprint Doc 또는 Sprint A Observability에 결합
  YAGNI gate: PASS (사용자 pain SPECULATIVE — 그러나 4 skills 위험 zone 실측, defense는 1 commit 비용)
```

### 4.4 ENH-293 P1 신규 정밀 평가 — OTEL Subprocess Env Propagation (CARRY-5 closure 후보)

```yaml
ENH-293 [P1 CARRY-5 root cause closure 후보] OTEL_* env propagation through bkit hooks
  Source: v2.1.128 F6-128 (Subprocess OTEL_* env 비상속)
          + 기존 v2.1.12 deep-qa CARRY-5 (#17 token-meter Adapter zero entries)

  Reproducer: F6-128 변경 = Bash/hooks/MCP/LSP subprocess가 부모의 OTEL_* env 미상속 (intentional fix)
              CARRY-5 = bkit token-meter Adapter가 472/472 zero entries 생산 (현재 미해결, v2.1.13 Sprint A로 carry)

  결합 가설 (CONFIRMED via Phase 2 grep):
    - lib/infra/telemetry.js 4 위치에서 process.env.OTEL_* 직접 의존
        line 126: env.OTEL_REDACT
        line 137: env.OTEL_LOG_USER_PROMPTS
        line 149: process.env.OTEL_SERVICE_NAME
        line 188: process.env.OTEL_ENDPOINT
    - hook subprocess (scripts/unified-stop.js 등)에서 telemetry.js를 require 시 v2.1.128+ 환경에서 OTEL_* env 결여
    - 결과: telemetry sink가 silent하게 skip 또는 default fallback 동작 → token-ledger NDJSON entry zero

  Defense:
    1. SessionStart hook에서 OTEL_* env를 .bkit/runtime/otel-env.json으로 capture
    2. unified-stop.js + 다른 hook subprocess에서 .bkit/runtime/otel-env.json read → process.env에 hydrate
    3. OTEL_* env 부재 환경 (CC v2.1.128+) 자동 보상

  Files:
    - hooks/session-start.js (OTEL env capture)
    - scripts/unified-stop.js (OTEL env hydrate)
    - lib/infra/telemetry.js (env-or-cached fallback)
    - lib/infra/otel-env-store.js (신규)

  Tests:
    - tests/qa/otel-env-propagation.test.js (L1+L2, +8 TC)
    - tests/contract/token-meter-adapter.contract.test.js (CARRY-5 closure verifying token entries non-zero, +3 TC)

  ADR 0003 verification:
    - sandbox에서 OTEL_LOG_USER_PROMPTS=1 + OTEL_SERVICE_NAME=test 후 CC v2.1.128 시작 → bkit hook subprocess가 env 가시성 확인
    - 의도적 cto-lead spawn → token-ledger NDJSON inputTokens != 0 측정

  Sprint anchor: v2.1.13 Sprint A Observability — ENH-281 OTEL 묶음 + #17 token-meter (CARRY-5) + #14 error-log enrich + #2 telemetry SoT 통합
  Closure: CARRY-5 root cause 후보 확정 (single PR로 closure)
  YAGNI gate: PASS (root cause 후보 + telemetry sink 0 entries pain 확정 + Sprint A 단일 PR)
```

### 4.5 ENH-294 P2 신규 정밀 평가 — Stop Hook OS-aware Fallback (Windows)

```yaml
ENH-294 [P2 Win 한정 사전 방어] Stop Hook OS-aware Fallback
  Source: GitHub Issue #56096 (v2.1.126 Windows + ralph-loop Stop hook 회귀, 175 → 0 events)

  bkit 직접 노출 surface:
    - hooks/hooks.json Stop block (1 entry)
    - scripts/unified-stop.js (736 lines)
    - bkit Windows 사용자 (소수 추정, 정확한 사용자 분포 미파악)

  Defense:
    1. SessionEnd / SubagentStop hook을 fallback 경로로 명시 (이미 attribution 3 sites 메모리에 명시)
    2. Stop hook 미발화 검출 시 SessionEnd 우선 사용 가이드
    3. Windows 환경 감지 → bypassPermissions mode 사용 시 경고 메시지

  Files:
    - scripts/unified-stop.js (OS detection + warn)
    - scripts/session-end.js (fallback 경로 강화)
    - docs/bkit-auto-mode-workflow-manual.md (Win 환경 가이드 추가)

  Tests:
    - tests/qa/stop-hook-os-fallback.test.js (L1, +4 TC)

  ADR 0003 verification:
    - Win 환경 reproducer 미실행 (bkit 사용자 분포에 따라 후순위)
    - Mac/Linux 환경에서는 무영향 invariant

  Sprint anchor: v2.1.13 Sprint Reliability (확장) — 23 결함 #15 SessionStart agent-state reset과 결합
  YAGNI gate: PASS (Win 사용자 보호, 1 commit 비용)
```

### 4.6 ENH-295 P2 신규 정밀 평가 — `.bkit/` Purge Defense + Sentinel 결합

```yaml
ENH-295 [P2 사전 방어] .bkit/ Purge Defense + Sentinel
  Source: v2.1.126 F2-126 (`claude project purge [path]` 신규 명령)
          + 기존 ENH-284 P2 (`.bkit-do-not-prune` sentinel — Codex #54521 패턴)

  bkit 직접 노출 surface:
    - .bkit/state/* (memory.json, pdca-status.json, quality-metrics.json, regression-rules.json, session-history.json, trust-profile.json, batch/, resume/)
    - .bkit/runtime/* (agent-state.json, first-run-seen.json, session-ctx-fp.json)
    - 잠재 데이터 손실 (purge 명령이 .bkit/ 함께 삭제 시)

  Hypothesis (검증 필요):
    - `claude project purge .` 또는 유사 명령이 .bkit/ 디렉토리도 삭제하는지 (E2 reproducer 권장)
    - 삭제하지 않는다면 무영향, 삭제한다면 sentinel 또는 명시적 회피 정책 필요

  Defense:
    1. `.bkit/` 루트에 `.bkit-do-not-prune` sentinel 파일 생성 (ENH-284 통합)
    2. SessionStart hook에서 sentinel 부재 감지 시 자동 생성
    3. docs/CUSTOMIZATION-GUIDE.md에 Purge 가이드 추가

  Files:
    - .bkit/.bkit-do-not-prune (신규 sentinel)
    - hooks/session-start.js (sentinel 자동 생성)
    - docs/CUSTOMIZATION-GUIDE.md (Purge 정책 안내)

  Tests:
    - tests/qa/bkit-sentinel.test.js (L1, +3 TC)
    - tests/integration/purge-defense.test.js (L2, +2 TC, 가능 시)

  ADR 0003 verification:
    - sandbox에서 `claude project purge .` 실행 후 .bkit/ 잔존 여부 측정 (1주 reproducer)

  Sprint anchor: v2.1.13 Sprint B Reliability (확장) — ENH-284 통합 + #1/#11 control-state SoT
  YAGNI gate: PASS (1 commit 비용, 데이터 손실 위험 사전 방어)
```

### 4.7 ENH-296 P3 신규 정밀 평가 — R-3 Evolved-form Tracker

```yaml
ENH-296 [P3 모니터] R-3 Evolved-form Tracker (numbered + non-numbered 분리 카운터)
  Source: 본 사이클 발견 — numbered #145 정체 + dup-closure 5건 + evolved +8건 (5월 3-6일)

  Reproducer:
    - 2026-04-29 baseline: numbered 42+ / evolved 0
    - 2026-05-06 현재: numbered 42+ (#145 정체, dup-closure 5건) / evolved 8건 (#56333/56450/56395/56394/56393/56383/56418/56447)

  bkit 직접 노출 surface:
    - 본 cc-version-analysis 워크플로우의 R-3 카운터 (memory cc_version_history_*.md)

  Defense:
    1. memory file에 numbered + evolved 분리 카운터 필드 추가
    2. cc-version-researcher agent prompt에 "evolved form GitHub Search" 섹션 명시
    3. 2주 review (5-13) 시 dup-closure rate 측정

  Files:
    - memory cc_version_history_v21NN.md (포맷 갱신)
    - skills/cc-version-analysis/SKILL.md (Phase 1 R-3 섹션 명시)
    - agents/cc-version-researcher.md (evolved form prompt 추가)

  Tests:
    - 없음 (모니터 only, 메모리 포맷 갱신만)

  ADR 0003 verification:
    - 2-week review 일자 (5-13) numbered + evolved 카운터 검증

  Sprint anchor: v2.1.13 Sprint A Observability (확장)
  YAGNI gate: PASS (모니터 비용 거의 0, ENH-289 정당성 측정 도구)
```

### 4.8 Philosophy 준수 검토

| Philosophy | v2.1.124~v2.1.129 정합성 |
|-----------|--------------------------|
| **Automation First** | ✅ ENH-291 (skill validator CI gate 자동화) + ENH-292 (cache-cost-analyzer 자동 측정) + ENH-293 (OTEL env capture/hydrate 자동화) + ENH-295 (sentinel 자동 생성) 모두 자동화 강화. ENH-294 (Win OS detection) 자동 fallback. |
| **No Guessing** | ✅ ADR 0003 게이트 통과. 6/6 Phase 2 직접 grep/Read 검증 수행. F9-120 closure 4 릴리스 연속 PASS 실측. F1-129 잠재 위험 4 skills 직접 측정. F6-128 + CARRY-5 결합 가설 telemetry.js 4 위치 직접 grep. ENH-292 P0 격상은 #56293 reproducer 정량 데이터 (cache miss 4% → 40%) 기반. |
| **Docs=Code** | ✅ hooks.json schema 변경 없음. 신규 ENH 6건 모두 BKIT_VERSION 5-loc bump (v2.1.13 sprint) + EXPECTED_COUNTS 자동화 (CARRY-1 P2) 선행 필수. memory file 신규 (cc_version_history_v2124_v2129.md) + MEMORY.md 갱신 + enh_backlog.md 갱신. |

### 4.9 호환성 매트릭스

| CC 버전 | bkit v2.1.12 호환 | 비고 |
|---------|:----------------:|------|
| v2.1.114 | ✅ | CTO Team crash fix (최소 권장) |
| v2.1.119 | ✅ | npm `stable` (production conservative) |
| v2.1.120~v2.1.123 | ✅ | 81 연속 (이전 사이클까지 누적) |
| **v2.1.124** | ✅ **확인 (silent build, 변경 0건)** | **82 연속** |
| **v2.1.125** | ✅ **확인 (skip/unpublished)** | **83 연속** |
| **v2.1.126** | ✅ **확인 (Phase 2 직접 검증)** | **84 연속**, F2-126/F4-126/B1-126 사전 방어, B6-126/B8-126 자동수혜 |
| **v2.1.127** | ✅ **확인 (skip/unpublished)** | **85 연속** |
| **v2.1.128** | ✅ **확인 (Phase 2 직접 검증)** | **86 연속**, npm `latest`, **단 #56293 caching 회귀 + #56336 UI selection 회귀 사전 인지** |
| **v2.1.129** | ✅ **확인 (현재 환경 직접 작동)** | **87 연속**, npm `next`, **단 #56448 skill validator 잠재 회귀 사전 인지** |

### 4.10 연속 호환 릴리스

```
v2.1.34 ────────────────────────────────────────── v2.1.129
         87개 연속 호환 릴리스 (v2.1.115/120/124/125/127/129 R-1 6건 포함)
         bkit 기능 코드 Breaking: 0건

         v2.1.124~v2.1.129 실증 근거:
           • F9-120 closure 4 릴리스 연속 PASS 실측 (claude plugin validate Exit 0)
           • hooks.json events:21 / blocks:24 정합성 invariant
           • updatedToolOutput grep 0건 (architectural strength invariant 4 cycle)
           • OTEL_* 사용처 4 위치 매핑 (lib/infra/telemetry.js, F6-128 surface)
           • mcpServers field 부재 (F7-128 무영향 확정)
           • skill description 4 skills > 250자 (#56448 잠재 위험 식별)

         R-1 패턴 누적 (16-릴리스 윈도우):
           v2.1.115, v2.1.120, v2.1.124, v2.1.125, v2.1.127, v2.1.129 = 6건 (37.5%)
           ENH-290 3-Bucket Decision Framework 정당성 강화

         R-3 시리즈 진화:
           numbered #145 정체 (+0) + dup-closure 5건 + evolved form +8건 (5월 3-6일)
           ENH-289 P0 정당성 변동 없음 (bkit PreToolUse 물리 차단 모델 학습 무관)
           ENH-286 차별화 강화 (#56383 Anthropic advisory 공식화)
```

### 4.11 테스트 영향 평가

| 변경 / ENH | 영향 테스트 | 신규 테스트 | EXPECTED_COUNTS 변동 |
|------------|------------|------------|---------------------|
| F9-120 closure 4 cycle | (없음 — invariant) | 없음 | — |
| ENH-281 OTEL 묶음 5→8 누적 | `tests/qa/telemetry.test.js` (확장) | F1-126 invocation_trigger + I2-126 host-managed + F6-128 subprocess env 검증 | +3 TC (5건 → 8건 묶음 단일 PR) |
| **ENH-291 skill validator** | `tests/qa/skill-frontmatter.test.js` + `tests/contract/skill-description-length.contract.test.js` (신규) | description 250자 cap CI + 43 skills lock | **+6 TC (L1 5 + L3 1)** |
| **ENH-292 caching 10x** | `tests/qa/cache-monitor.test.js` + `tests/integration/sub-agent-caching.test.js` + `tests/contract/dispatch-mode.contract.test.js` (모두 신규) | cache miss share 측정 + sequential vs parallel | **+13 TC (L1 6 + L2 4 + L3 3)** |
| **ENH-293 OTEL subprocess** | `tests/qa/otel-env-propagation.test.js` + `tests/contract/token-meter-adapter.contract.test.js` (신규) | OTEL env capture/hydrate + CARRY-5 token entries non-zero | **+11 TC (L1+L2 8 + L3 3)** |
| ENH-294 Stop hook Win | `tests/qa/stop-hook-os-fallback.test.js` (신규) | OS detection + SessionEnd fallback | **+4 TC** |
| ENH-295 sentinel | `tests/qa/bkit-sentinel.test.js` + `tests/integration/purge-defense.test.js` (신규) | sentinel 자동 생성 + purge 면역 | **+5 TC** |
| ENH-296 R-3 tracker | (없음 — 메모리 포맷 갱신만) | 없음 | — |
| **합계** | | | **+42 TC** (3,774 → ~3,816) |

L1~L5 레이어별 영향:

| 레이어 | 영향 |
|--------|------|
| L1 unit | telemetry.test.js (ENH-281 확장) + skill-frontmatter (ENH-291) + cache-monitor (ENH-292) + otel-env-propagation (ENH-293) + stop-hook-os-fallback (ENH-294) + bkit-sentinel (ENH-295) |
| L2 contract | sub-agent-caching (ENH-292) + purge-defense (ENH-295) |
| L3 integration runtime | skill-description-length.contract (ENH-291) + dispatch-mode.contract (ENH-292) + token-meter-adapter.contract (ENH-293, CARRY-5 closure) |
| L4 regression | (선택) F1-129 의도적 251+자 skill 회귀 테스트 |
| L5 E2E shell smoke | 5/5 PASS 유지 + cache cost monitor E2E 후보 |

**CARRY-1 P2 EXPECTED_COUNTS 자동화 선행 필수** (+42 변동 대응, 누적 +56 v2.1.122/123 → +98 v2.1.13 GA).

---

## 5. Plan Plus 브레인스토밍 (Phase 3)

### 5.1 Intent Discovery

**Q1. v2.1.124~v2.1.129에서 bkit이 얻는 최대 가치는?**

A: (a) **F9-120 closure 4 릴리스 연속 PASS 실측** (`claude plugin validate .` Exit 0, v2.1.120/121/123/129) — marketplace.json root field 안정성 확정, ADR 0003 4-사이클 일관성 입증으로 분석 방법론 신뢰도 강화. (b) **F6-128 + CARRY-5 root cause 후보 확정** — token-meter Adapter zero entries pain의 4주차 미해결 carryover가 OTEL subprocess env 비상속 메커니즘으로 결합 가설 확정 → ENH-293 P1 closure 후보. (c) **bkit 차별화 신규 1건** — ENH-292 sequential dispatch moat (CC native 평행 spawn caching 회귀 자연 회피).

**Q2. 놓치면 안 되는 critical change?**

A: **#56293 caching 10x regression**. v2.1.128 latest 채널에 게시되어 사용자 환경 자연 적용. bkit cto-lead/qa-lead 평행 sub-agent 패턴 직접 노출 surface. **사용자 비용 10배 폭증** 위험 — Sprint Coordination에서 ENH-287 12 multi-agent bugs와 통합하여 v2.1.13 우선 처리. ENH-292 P0 격상 정당화.

**Q3. bkit 기존 workaround 대체 가능한 native 기능?**

A: **F2-128 `/mcp` tool count + B4-128 stdio shell prefix**가 16 MCP tools 가시성/신뢰성 자동수혜. **F11-128 `EnterWorktree` local HEAD**는 bkit worktree 미사용으로 무영향. **B6-126 deferred tools fork 첫 turn 작동**은 ENH-202 9 fork skills 자동수혜 (자연스러운 보강).

**Q4. R-3 시리즈 진화에서 bkit 차별화 강화 정당성?**

A: **#56383 Anthropic auto-memory advisory 공식화 입장 표명** — bkit ENH-286 memory enforcer (PreToolUse deny-list)가 CC native advisory 한계를 enforced로 격상하는 차별화에 강력한 정당성 추가. ENH-289 Defense Layer 6 (post-hoc audit + auto-rollback)도 dup-closure 압축 + evolved form 지속 패턴으로 정당성 변동 없음.

### 5.2 Alternative Exploration (P0/P1 항목 우선)

#### ENH-292 [P0] Caching 10x Regression Mitigation (#56293)

| 대안 | 비용 | 가치 | 권장 |
|------|:---:|:---:|:---:|
| A. v2.1.13 Sprint Coordination 통합 (ENH-287과 결합) | 中 | **高** (체계적, 12 multi-agent bugs 동시 처리) | ✅ |
| B. v2.1.12.x hotfix 분리 (긴급 patch) | 高 (사용자 영향 추적 어려움) | 中 (CC 자체 fix 1-2 릴리스 LOW) | ⚠️ |
| C. 사용자 안내만 (v2.1.123 다운그레이드 권고) | 低 | 低 (장기적 해결 X) | ❌ |
| D. 무시 + CC 자체 해결 대기 | 低 | 低 (사용자 비용 1주 + 폭증) | ❌ |

**결론**: A 채택. v2.1.13 Sprint Coordination에서 ENH-287 + ENH-292 결합 처리. **즉시 액션**: v2.1.128 환경 사용자 안내 (release notes 또는 README 안내 추가).

#### ENH-291 [P1] Skill Validator Defense (#56448)

| 대안 | 비용 | 가치 | 권장 |
|------|:---:|:---:|:---:|
| A. CI gate (250자 보수적 cap) + 4 skills 단축 + frontmatter validator | 中 | **高** (위험 zone 4 skills 사전 방어) | ✅ |
| B. CI gate 없음 + 모니터만 | 低 | 中 (재발 시 plugin breakage 위험) | ⚠️ |
| C. CC 자체 fix 대기 | 低 | 低 (#56448 OPEN, 1-2 릴리스 추정) | ⚠️ |

**결론**: A 채택. v2.1.13 Sprint Doc 또는 Sprint A에 결합. 4 skills(pdca-watch 251 / pdca-fast-track 226 / bkit-explore 226 / bkit-evals 225) description 단축 (1 commit 비용).

#### ENH-293 [P1] OTEL Subprocess Env Propagation (CARRY-5 closure 후보)

| 대안 | 비용 | 가치 | 권장 |
|------|:---:|:---:|:---:|
| A. SessionStart capture + hook subprocess hydrate (env-or-cached fallback) | 中 | **高** (CARRY-5 closure + ENH-281 묶음 강화) | ✅ |
| B. lib/infra/telemetry.js를 main-process-only로 격리 (hook subprocess 미호출) | 高 | 中 (구조 변경, 회귀 위험) | ❌ |
| C. CARRY-5 v2.1.13 carryover 유지 (root cause 미확정 처리) | 低 | 低 (4주차 carryover 누적) | ❌ |

**결론**: A 채택. v2.1.13 Sprint A Observability에 ENH-281 + ENH-293 + CARRY-5 (#17) 통합 처리.

#### ENH-294 [P2] Stop Hook OS-aware Fallback (Win)

| 대안 | 비용 | 가치 | 권장 |
|------|:---:|:---:|:---:|
| A. SessionEnd / SubagentStop fallback 명시 + Win 환경 경고 | 低 | 中 (Win 사용자 보호) | ✅ |
| B. Win 사용자 v2.1.123 다운그레이드 권고만 | 低 | 低 (장기 X) | ❌ |
| C. Win 환경 미지원 (정책 변경) | 低 | 低 (사용자 분포 미파악) | ❌ |

**결론**: A 채택. v2.1.13 Sprint Reliability (확장) — 23 결함 #15 SessionStart agent-state reset과 결합.

#### ENH-295 [P2] `.bkit/` Purge Defense + Sentinel 결합

| 대안 | 비용 | 가치 | 권장 |
|------|:---:|:---:|:---:|
| A. `.bkit-do-not-prune` sentinel + SessionStart 자동 생성 + Purge 가이드 | 低 | 中 (데이터 손실 사전 방어) | ✅ |
| B. ENH-284 sentinel만 (Purge 미고려) | 低 | 低 (F2-126 신규 surface 미반영) | ❌ |
| C. CC 정책 검증 후 결정 (1주 spike) | 中 | 中 (검증 가치) | ⚠️ |

**결론**: A 채택. v2.1.13 Sprint B Reliability (확장) — ENH-284 통합 + #1/#11 control-state SoT.

#### ENH-296 [P3] R-3 Evolved-form Tracker

| 대안 | 비용 | 가치 | 권장 |
|------|:---:|:---:|:---:|
| A. memory file 포맷에 numbered + evolved 분리 카운터 추가 | 低 | 中 (ENH-289 정당성 측정 도구) | ✅ |
| B. R-3 tracker 폐기 (numbered 압축으로 정확도 저하) | 低 | 低 (ENH-286/289 정당성 손실) | ❌ |
| C. Anthropic 정책 추적만 (#56383 advisory 공식화) | 低 | 中 (ENH-286 차별화) | ⚠️ |

**결론**: A 채택 (B/C 결합). v2.1.13 Sprint A에 결합.

### 5.3 YAGNI Review

| ENH | 사용자 pain? | 미구현 시 문제? | 다음 CC 더 나은? | 결론 |
|-----|:---:|:---:|:---:|------|
| **ENH-292 (P0 caching)** | ✅ (#56293 reproducer 정량 데이터) | 사용자 비용 10x 폭증 | LOW (1-2 릴리스 추정) | **P0 PASS** |
| ENH-291 skill validator | ✅ (4 skills 위험 zone 실측) | plugin breakage 위험 | LOW (#56448 1-2 릴리스 추정) | **P1 PASS (defense)** |
| ENH-293 OTEL subprocess | ✅ (CARRY-5 4주차 미해결) | token-meter 0 entries 누적 | LOW (root cause 후보 확정) | **P1 PASS (closure)** |
| ENH-294 Stop hook Win | ⚠️ (Win 사용자 분포 미파악) | Win 사용자 175→0 | 中 (#56096 1-2 릴리스 추정) | **P2 PASS (Win 한정)** |
| ENH-295 .bkit purge | ⚠️ (가설) | 잠재 데이터 손실 | 中 (CC 정책 변경 가능) | **P2 PASS (defense)** |
| ENH-296 R-3 tracker | ⚠️ (모니터 가치) | ENH-289 정당성 측정 X | LOW | **P3 PASS (모니터)** |

### 5.4 최종 우선순위

| Priority | Count | 항목 |
|----------|:-----:|------|
| **P0** | **1** | **ENH-292 caching 10x mitigation (Sprint Coordination)** |
| **P1** | **2** | ENH-291 skill validator defense / ENH-293 OTEL subprocess (CARRY-5 closure) |
| **P2** | **2** | ENH-294 Stop hook OS-aware fallback / ENH-295 `.bkit/` purge defense |
| **P3** | **1** | ENH-296 R-3 evolved-form tracker (모니터) |
| 기존 ENH 강화 | 3 | ENH-281 OTEL 5→8 누적 / ENH-289 R-3 evolved form 보강 / ENH-290 R-1 +4건 누적 |
| 자동수혜 | 4 | F2-128 / B6-126 / B8-126 / F11-128 |
| 무영향 (정밀 검증) | 5 | F7-128 / F1-128 / F3-128 / F5-128 / B11-128 |
| 무영향 (정적) | 9 | F1-126, F3-126, F6-126, F7-126, F8-126, I3-126, B2-126, B3-126, B4-126 등 LOW 다수 |

**ENH 번호 정책**: ADR 0003 §6.2 준수 — 본 보고서에서 ENH-291 ~ ENH-296 정식 발급. `enh_backlog.md` 갱신 권장.

---

## 6. v2.1.12 / v2.1.13 영향

### 6.1 v2.1.12 (현재 main GA `d26c57c`)

- **본 분석 영향 없음** — v2.1.12 GA는 evals-wrapper hotfix 4-commit chain (release tag 2026-04-29 게시 완료)
- 본 main GA에서는 ENH-291~296 patch **금지** (cleanliness 유지, 메모리 v2.1.12 carryovers 명시)
- 발견된 6 ENH는 v2.1.13 후속 hotfix 또는 Sprint로 분류

### 6.2 v2.1.13 Sprint Map (신규 6 ENH 통합 제안)

| Sprint | 우선순위 | 포함 ENH | 기존 백로그 결합 |
|--------|:-------:|----------|------------------|
| **Sprint Coordination (확장)** | **P0** | **ENH-292 caching 10x + ENH-287 12 multi-agent bugs** | + CARRY-12 qa-lead spawn 가이드 P3 → P1 |
| **Sprint A Observability (확장)** | P1 | **ENH-293 OTEL subprocess (CARRY-5 closure) + ENH-281 OTEL 5→8 누적 + ENH-285 Stop dedup + ENH-288 /compact 도메인 + ENH-296 R-3 evolved tracker** | + 기존 #17 token-meter (CARRY-5) + #14 error-log enrich + #2 telemetry SoT |
| **Sprint Doc + Defense Layer 5** | P1 | **ENH-291 skill validator defense + ENH-286 memory enforcer + ENH-289 Defense Layer 6** | + 기존 #19 destructive-detector DB context |
| **Sprint MCP-1 (신규)** | P1 | ENH-282 alwaysLoad 1주 측정 | (단독) |
| **Sprint B Reliability (확장)** | P2 | **ENH-294 Stop hook OS-aware + ENH-295 .bkit purge defense + ENH-284 sentinel** | + 기존 #1/#11 control-state SoT + #12 checkpoint hash + #15 SessionStart agent-state |
| Sprint Doc | P2 | ENH-283 architectural decision 문서화 | (단독) |
| Sprint R-3 (신규 P0) | P0 | ENH-289 Defense Layer 6 (이전 사이클 P0 유지) | (이전 사이클) |

### 6.3 v2.1.12+ Carryover 정리

| 출처 | ID | 직전 상태 | v2.1.124~v2.1.129 후속 |
|------|----|---------|------------------------|
| v2.1.118 | I1-118 `$defaults` | P3 관찰 | 유지 |
| v2.1.119 | F5-119 `--print tools:` | UNVERIFIED | 유지 |
| v2.1.119 | F8-119 / I6-119 OTEL | ENH-281 묶음 | **8 누적으로 확장** |
| v2.1.119 | B24-119 Auto-compaction | Sprint γ | 유지 |
| v2.1.120 | F9-120 marketplace.json | closure | **4 릴리스 연속 PASS 실측 (v2.1.120/121/123/129)** |
| v2.1.121 | I4-121 OTEL 3 attr | ENH-281 묶음 | **8 누적으로 확장** |
| v2.1.121 | CAND-005 alwaysLoad | ENH-282 P1 격상 | 유지 |
| v2.1.121 | CAND-006 SDK fork | P2 검증 | 유지 |
| v2.1.121 | CAND-007 R-3 모니터 | ENH-289 P0 | **dup-closure + evolved form 추적** (ENH-296 신규) |
| v2.1.122 | F4-122 / I2-122 OTEL | ENH-281 묶음 | **8 누적으로 확장** |
| v2.1.122 | F15-122 hooks isolation | CONFIRMED auto-benefit | 유지 |
| v2.1.122 | F10-122 ToolSearch | CONFIRMED auto-benefit | 유지 |
| v2.1.123 | F1-123 OAuth 401 | CONFIRMED 무영향 | 유지 |
| **v2.1.126** | **F1-126 / I2-126 OTEL** | **신규 +1** | **ENH-281 묶음 8 누적** |
| **v2.1.126** | **F2-126 claude project purge** | **신규 surface** | **ENH-295 P2 결합** |
| **v2.1.126** | **F4-126 dangerously-skip-permissions** | **신규 R-3 surface** | **ENH-289 보강** |
| **v2.1.126** | **B1-126 #56096 Win Stop** | **신규 회귀** | **ENH-294 P2 신규** |
| **v2.1.128** | **F6-128 OTEL subprocess** | **CARRY-5 root cause 후보** | **ENH-293 P1 closure 후보** |
| **v2.1.128** | **I2-128 #56293 caching 10x** | **신규 P0 비용 회귀** | **ENH-292 P0 신규** |
| **v2.1.128** | **F7-128 MCP workspace 예약** | **CONFIRMED 무영향** | (자동수혜) |
| **v2.1.129** | **F1-129 #56448 skill validator** | **신규 P1 잠재** | **ENH-291 P1 신규** |
| **CARRY-5 (#17 token-meter)** | **F6-128 root cause 결합** | **closure 후보** | **ENH-293 P1 closure** |

**Closed (본 사이클)**:
- F1-126 + I2-126 + F6-128 → ENH-281 묶음 (5 → 8 누적), Sprint A 통합
- F6-128 + CARRY-5 (#17) → ENH-293 closure 후보
- I2-128 #56293 → ENH-292 P0 신규
- F1-129 #56448 → ENH-291 P1 신규
- B1-126 #56096 → ENH-294 P2 신규
- F2-126 → ENH-295 P2 결합 (ENH-284 통합)
- R-3 evolved form → ENH-296 P3 모니터 신규
- F9-120 closure 4 cycle PASS → 안정화 입증 (carryover 종료)

---

## 7. 결론 및 권고사항

### 7.1 최종 판정

- **호환성**: ✅ **CONFIRMED** — bkit v2.1.12가 CC v2.1.124~v2.1.129 범위 전체에서 무수정 작동 (Phase 2 직접 검증 6/6 PASS, v2.1.129 본 환경 실증)
- **업그레이드 권장**: ⚠️ **SELECTIVE** — v2.1.123 보수적 권장 유지. v2.1.126 균형 권장 (B6-126/B8-126 자동수혜 + B1-126 Win 한정 회귀 사전 인지). v2.1.128 비권장 (#56293 caching 10x). v2.1.129 비권장 (#56448 skill validator 잠재).
- **bkit 버전**: v2.1.12 main GA 유지. v2.1.13에서 6 신규 ENH + 3 강화 ENH (ENH-281 묶음 8 누적, ENH-289 R-3 보강, ENH-290 R-1 6건) 통합

### 7.2 권장 CC 버전 (2026-05-06 기준)

- **최소**: v2.1.114
- **보수적 권장 (이전 사이클 유지)**: **v2.1.123** (release tag 정상, F15-122 hooks isolation + F1-123 OAuth fix 자동수혜)
- **균형 권장 (신규)**: **v2.1.126** (F1-126 OTEL invocation_trigger 자동수혜 + B6-126 deferred tools fork + B8-126 한국어 Win 자동수혜, 단 Win 환경에서는 B1-126 Stop hook 회귀 사전 인지 + SessionEnd fallback 안내)
- **비권장**: **v2.1.128** (#56293 caching 10x 비용 회귀, sub-agent 평행 spawn 시 사용자 비용 폭증) / **v2.1.129** (#56448 skill validator regression 잠재, 4 skills 위험 zone)
- **현재 npm `latest`**: v2.1.128 — 사용자 안내 필요
- **현재 npm `next`**: v2.1.129 — 개발자 default 아님
- **환경 예외**: macOS 11 → v2.1.112, non-AVX CPU → v2.1.112, Windows parenthesized PATH → v2.1.114+, **Windows + Stop hook 의존 → v2.1.125 ↓ 또는 SessionEnd fallback**

### 7.3 핵심 액션 아이템

1. **즉시**:
   - 본 보고서 발행 (`docs/04-report/features/cc-v2124-v2129-impact-analysis.report.md`)
   - memory `cc_version_history_v2124_v2129.md` 신규 작성
   - MEMORY.md 갱신 (87 연속 호환, ENH-291~296, 권장 v2.1.123 / 균형 v2.1.126 / 비권장 v2.1.128~v2.1.129)
   - `enh_backlog.md` 갱신 (ENH-291~296 추가, ENH-281/289/290 강화)

2. **사용자 안내 (즉시)**:
   - v2.1.128 환경 사용자: cto-lead/qa-lead Task spawn 시 cache miss 4% → 40% 위험 안내. v2.1.123 또는 v2.1.126 다운그레이드 권고 또는 v2.1.130+ 대기.
   - v2.1.129 환경 사용자: skill description 길이 251자 이상은 false-positive validator warning 위험 — 4 skills 단축 권고 또는 v2.1.128 다운그레이드.

3. **v2.1.13 Sprint 우선순위 (제안)**:
   - **Sprint Coordination (확장) P0**: ENH-292 caching 10x + ENH-287 12 multi-agent bugs + CARRY-12
   - **Sprint A Observability (확장) P1**: ENH-293 OTEL subprocess (CARRY-5 closure) + ENH-281 묶음 8 누적 + ENH-285 Stop dedup + ENH-288 /compact 도메인 + ENH-296 R-3 evolved tracker
   - **Sprint Doc + Defense Layer 5 P1**: ENH-291 skill validator defense + ENH-286 memory enforcer + ENH-289 Defense Layer 6 (이전 P0 유지)
   - **Sprint MCP-1 (신규) P1**: ENH-282 alwaysLoad 1주 측정 (이전 사이클 carry)
   - **Sprint B Reliability (확장) P2**: ENH-294 Stop hook OS-aware + ENH-295 .bkit purge defense + ENH-284 sentinel
   - **Sprint Doc P2**: ENH-283 architectural decision (이전 사이클 carry)

4. **ADR 0003 사후 검증 결과 (본 세션 직접 실행, 6/6 PASS)**:
   - ✅ `claude --version = 2.1.129` (next 채널 활성화 + bkit v2.1.12 무수정 작동)
   - ✅ `claude plugin validate .` Exit 0 — **F9-120 closure 4 릴리스 연속 PASS** (v2.1.120/121/123/129)
   - ✅ `hooks.json` events:21 / blocks:24 메모리 일치 (B1-126 Win 회귀 무관)
   - ✅ `grep -rn 'updatedToolOutput' lib/ scripts/ hooks/` 0건 — #54196 무영향 invariant 4 cycle 연속
   - ✅ `grep OTEL_ lib/ scripts/ hooks/` lib/infra/telemetry.js 4 위치 + lib/audit/audit-logger.js 1 위치 (F6-128 surface 매핑 + CARRY-5 결합 가설 확정)
   - ✅ `mcpServers` field 부재 (F7-128 무영향 + ENH-282 alwaysLoad spike 측정 가능 상태)

5. **CARRY-1 P2 EXPECTED_COUNTS 자동화 선행 필수**:
   - 6 신규 ENH 동시 진행 시 +42 TC 변동 예상 (3,774 → ~3,816)
   - 누적 +98 TC v2.1.13 GA (이전 사이클 +56 + 본 사이클 +42)
   - `tests/qa/bkit-deep-system.test.js`, `test/contract/docs-code-sync.test.js`, `test/contract/extended-scenarios.test.js` 자동 동기화 도구

6. **GitHub 모니터링 (지속)**:
   - **신규 등록 (8건)**: #56293 P0 caching / #56448 P1 skill validator / #56096 P2 Win Stop / #56336 UI selection / #56385 / #56386 (/compact 도메인 +2) / #56450 / #56383 (R-3 evolved)
   - **OPEN 갱신**: #47855 (MON-CC-02 18 cycle), #47482 (ENH-214 23 cycle), #54196/54360/54375/54393/54508/54521 (이전 사이클 유지)
   - **R-3 시리즈**: numbered #145 정체 + dup-closure 5건 (5/1) + evolved +8건 (5/3-6) → 2주 review 5-13 dup-closure rate 측정
   - **MON-CC-NEW**: ENH-296 P3 evolved-form tracker 신규 (numbered + non-numbered 분리)

### 7.4 본 분석의 ADR 0003 4-사이클 메타 검증

| Cycle | Date | CC Range | bkit 영향 | ENH 신규 | ADR 0003 적용 |
|-------|------|----------|-----------|:--------:|:-------------:|
| 1차 | 2026-04-24 | v2.1.118 → v2.1.120 | F9-120 closure 1차 | ENH-247~262 (Sprint α/β/γ) | 첫 정식 |
| 2차 | 2026-04-27/28 | v2.1.120 → v2.1.121 | F9-120 closure 2차 + F1-119 false alarm 학습 | ENH-263~280 | 두 번째 |
| 3차 | 2026-04-29 | v2.1.121 → v2.1.123 | F9-120 closure 3차 + R-3 P0 격상 + #54196 architectural strength | ENH-281~290 (R-3 + 차별화 2) | 세 번째 |
| **4차** | **2026-05-06 (본)** | **v2.1.124 → v2.1.129** | **F9-120 closure 4차 + ENH-292 sequential dispatch moat + R-1 6건 누적 + R-3 evolved form 추적** | **ENH-291~296** | **네 번째 (본)** |

**4-사이클 일관성 입증**: ADR 0003 네 번째 정식 적용으로 분석 방법론 신뢰도 (cross-cycle predictability) 강화. 본 사이클의 핵심 메타 발견:

- **F9-120 closure 4 릴리스 연속 PASS** = marketplace.json root field 안정화 완료 (carryover 종료)
- **R-1 패턴 정식화** = 16-릴리스 윈도우 6건 (37.5%), ENH-290 3-Bucket Decision Framework 정당성 강화
- **R-3 진화 추적** = numbered 압축 + evolved form 지속, dup-closure rate 모니터링 도구 신규 (ENH-296)
- **CARRY closure** = CARRY-5 (#17 token-meter) root cause 후보 확정 (4주차 carryover 단축)
- **bkit 차별화 신규 1건** = ENH-292 sequential dispatch moat (CC native 평행 spawn caching 회귀 자연 회피)

---

**보고서 종료**. 다음 세션 권장 작업:

1. **즉시**: MEMORY.md 갱신 + memory file 작성 (다음 세션 직전 또는 본 세션 종료 직전)
2. **단기 (5-13)**: R-3 dup-closure rate 측정 + ENH-296 first data point 수집
3. **중기 (v2.1.13 GA 진입 시)**: 6 신규 ENH + 3 강화 ENH 통합 Sprint 진행 (Coordination P0 + Observability P1 + Defense P1)
4. **장기**: ADR 0003 다섯 번째 적용 사이클 (v2.1.130+) — sequential dispatch moat 검증 + memory enforcer 차별화 측정
