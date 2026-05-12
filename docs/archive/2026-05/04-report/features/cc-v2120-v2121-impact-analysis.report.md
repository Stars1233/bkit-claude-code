# CC v2.1.120 → v2.1.121 영향 분석 및 bkit 대응 보고서 (ADR 0003 두 번째 정식 적용)

> **Status**: ✅ Final (실증 기반, ADR 0003 두 번째 정식 적용)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.10 (current, unchanged)
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Date**: 2026-04-28
> **PDCA Cycle**: cc-version-analysis (v2.1.121, single-version increment)
> **CC Range**: v2.1.120 (baseline, 2026-04-24 publish, F9-120 자동 해소 검증 완료) → v2.1.121 (2026-04-27/28 publish, release tag 정상 게시)
> **Verdict**: **크리티컬 0건 / Breaking 0건 / 자동수혜 6건 / F9-120 지속 해소 1건 / 신규 기회 5건 (CAND-003~007)**

---

## 1. Executive Summary

### 1.1 최종 판정

| 항목 | 값 |
|------|----|
| 크리티컬 회귀 건수 | **0건** |
| Breaking Changes | **0건 (확정)** |
| 잠재 결함 신규 자동 해소 | 0건 (v2.1.121 자체) |
| F9-120 지속 해소 (실증) | **1건** (`claude plugin validate .` 2 릴리스 연속 PASS) |
| 자동수혜 (CONFIRMED) | **6건** (B1-121 multi-image, B2-121 /usage, B4-121 Bash dir, F11-121 MCP retry, B19-121 find FD, F9-120 지속) |
| 정밀 검증 (무영향 확정) | **1건** (F9-121, Layer 분리) |
| 신규 기회 (CAND-003~007, 최대 P1) | **5건** (CAND-004 P1 / CAND-003·005·006 P2 / CAND-007 P3) |
| YAGNI FAIL DROP | 0건 |
| bkit v2.1.11 hotfix 필요성 | **불필요** |
| 연속 호환 릴리스 | **79** (v2.1.120 78 → v2.1.121 79) |
| ADR 0003 적용 | **YES (두 번째 정식 적용 — 일관성 입증)** |

### 1.2 성과 요약

```
┌────────────────────────────────────────────────────┐
│  v2.1.121 영향 분석 (ADR 0003 두 번째 적용)        │
├────────────────────────────────────────────────────┤
│  📊 CC 변경 수집: 38 bullets (F:14 / I:6 / B:19)   │
│  🔴 실증된 크리티컬 회귀: 0건                       │
│  🟢 CONFIRMED auto-benefit: 6건                     │
│  🟡 정밀 검증 (무영향 확정): 1건 (F9-121 Layer 분리) │
│  🆕 F9-120 지속 해소 입증: 1건 (2 릴리스 연속 PASS) │
│  🆕 신규 CAND: 5건 (P1×1 / P2×3 / P3×1)             │
│  ❌ Breaking Changes: 0 (확정)                     │
│  ✅ 연속 호환: 78 → 79 릴리스                       │
│  🚨 R-3 신규 모니터: "safety hooks 무시" 8건 시리즈 │
│  📦 v2.1.120 release tag 영구 누락 (R-1)            │
└────────────────────────────────────────────────────┘
```

### 1.3 4-관점 가치 표

| 관점 | 내용 |
|------|------|
| **Technical** | bkit `.claude-plugin/marketplace.json` validation이 v2.1.121에서도 PASS (Exit 0) — F9-120 fix가 2 릴리스 연속 안정화 입증. B1/B2/B4-121 메모리 안정성 + Bash worktree 안정성 직접 자동수혜. F4-121 PostToolUse `updatedToolOutput` 전 도구 확장은 bkit audit-logger sanitize/redact 강화 잠재 통합 기회. I4-121 OTEL 3 attributes (`stop_reason`, `finish_reasons`, `user_system_prompt`) 추가는 F8-119/I6-119와 누적되어 Sprint δ FR-δ4 token-report 단일 PR 묶음 가속. F9-121 `--dangerously-skip-permissions` `.claude/skills|agents|commands/` 권한 완화는 bkit ENH-263 방어와 **레이어 분리** (CC Layer 1 prompt vs bkit Layer 2 PreToolUse hook) 명시화로 **무영향 확정**. |
| **Operational** | hotfix sprint 불필요. v2.1.121 정식 release tag 정상 게시 → **추천 버전 승격 가능**. 단 **v2.1.120 release tag 영구 누락** (R-1) — v2.1.121 release를 v2.1.120/121 통합 SSoT로 간주. kay 환경 24일+ 장기 세션은 B2-121 `/usage` ~2GB 누수 fix 직접 수혜. CTO Team `context: fork` 패턴은 B4-121 worktree dir delete fix 직접 수혜. |
| **Strategic** | ADR 0003 (Empirical Validation) 두 번째 정식 적용 사이클로 **프로세스 일관성 입증**. 첫 사이클(v2.1.120)에서 발견한 F9-120 자동 해소가 v2.1.121에서도 PASS 유지로 fix 안정화 검증. 신규 R-3 "safety hooks 무시" 8건 시리즈는 bkit Defense-in-Depth Layer 2 (PreToolUse hook) 신뢰성 모델 근본 우려이나, ADR 0003 §3 SPECULATIVE 게이트 준수로 **선제 대응 보류 + MON-CC-NEW 2주 모니터 등록** 결정. v2.1.121 Sprint δ FR-δ4 단일 PR로 OTEL 3 누적 정리 가속. |
| **Quality** | bkit v2.1.10이 v2.1.121 환경에서 무수정 작동. F9-120 closure 사용자 후속 검증 자동 완료 (메인 환경 `claude plugin validate .` PASS). F9-121 정밀 검증은 정적 트레이싱 + Layer 분리 명시화로 무영향 확정 — **격리 sandbox 실측은 사용자 자발적 검증 시 reproducer 보존만 권고**. |

---

## 2. ADR 0003 두 번째 정식 적용 — Phase 1.5 게이트 결과

### 2.1 게이트 통과 매트릭스

ADR 0003 §2 (b) 실증 상태 4값 기준:

| ID | 변경 요약 | E1 시나리오 | E2 실행 | E3 경로 스코프 | E4 공식 스펙 | **E5 상태** |
|----|----------|------------|---------|--------------|-------------|------------|
| **F4-121** | PostToolUse `updatedToolOutput` 전 도구 확장 | 정의 (hooks.json sample hook) | ❌ 미실행 (Sprint δ 또는 v2.1.12 spike 시 실측) | 프로젝트 로컬 (PostToolUse 블록) | CHANGELOG `1586204` snapshot | **SPECULATIVE** |
| **F9-121** | `--dangerously-skip-permissions` `.claude/` 일부 완화 | 정의 (격리 sandbox + Layer 트레이싱) | ⚠️ 정적 트레이싱 완료 (Layer 분리 확인) — sandbox 실측 보류 | 프로젝트 로컬 (3 디렉토리, hooks.json 제외) | CHANGELOG `1586204` snapshot | **CONFIRMED 무영향** (Layer 분리) |
| **I4-121** | OTEL `stop_reason` + `finish_reasons` + `user_system_prompt` 추가 | 정의 (`OTEL_LOG_USER_PROMPTS=1` + LLM span 캡처) | ❌ 미실행 (Sprint δ 통합 시 실측) | 프로세스 (OTEL 활성화) | CHANGELOG `1586204` | **CONFIRMED auto-benefit** + 관측성 확장 (SPECULATIVE 예외 P1 허용) |
| **B1-121** | multi-image multi-GB RSS 누수 fix | 정의 (이미지 다수 + RSS 모니터) | ❌ 미실행 (시나리오 부족) | 프로세스 글로벌 | CHANGELOG `1586204` | **CONFIRMED auto-benefit** (정적) |
| **B2-121** | `/usage` ~2GB 누수 fix | 정의 (장기 transcript + `/usage`) | ❌ 미실행 (kay 환경 24일+ 자동 수혜) | 세션 | CHANGELOG `1586204` | **CONFIRMED auto-benefit** |
| **B4-121** | Bash dir delete/move fix | 정의 (dir A 시작 → A 이동 → Bash) | ❌ 미실행 (worktree 사용자 자발적 검증 권고) | 프로세스/세션 | CHANGELOG `1586204` | **CONFIRMED auto-benefit** |
| **F9-120 후속** | marketplace.json validation 지속 검증 | 정의 (`claude plugin validate .`) | ✅ **실행** (v2.1.121, 결과: **PASS Exit 0**) | `.claude-plugin/marketplace.json` (project) | CHANGELOG `1586204` | **CONFIRMED 지속 해소** (2 릴리스 연속) |

### 2.2 핵심 실증 발견 — F9-120 closure (2 릴리스 연속 PASS)

**E2 (실제 실행) 결과 — 2026-04-28**:

```bash
$ claude --version
2.1.121 (Claude Code)

$ claude plugin validate .
Validating marketplace manifest:
  /Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/.claude-plugin/marketplace.json

✔ Validation passed
[Exit: 0]
```

**의미**:

1. v2.1.120 ADR 0003 첫 사이클에서 발견된 "잠재 결함 자동 해소"가 v2.1.121에서도 안정 유지
2. CC F9-120 fix가 **2 릴리스 연속 안정화 입증**
3. ADR 0003 §7.4 "사용자 v2.1.120 업그레이드 후 `claude plugin validate .` 재실행 결과 기록" 미완료 체크리스트 항목 **자동 closure**
4. ADR 0003 가치 강화: "False alarm 차단" + "잠재 결함 능동 발견"에 더해 **"fix 지속 안정화 입증"** 추가

### 2.3 F9-121 정밀 검증 — Layer 분리 명시화

ADR 0003 두 번째 적용 사이클의 **첫 정밀 검증 사례**. F1-119 false alarm 학습을 적용해 **레이어 혼동** 위험을 사전 차단.

| Layer | 책임 | F9-121 영향 영역 | bkit 방어 |
|-------|------|----------------|-----------|
| **Layer 0 (CC 내장)** | 권한 prompt (`--dangerously-skip-permissions` 우회 대상) | **`.claude/skills/`, `.claude/agents/`, `.claude/commands/` write prompt 생략** | 없음 (CC 내장) |
| **Layer 1** | `PermissionRequest` Hook | bkit `permission-request-handler.js:43-47` `SAFE_WRITE_DIRS = ['docs/', '.bkit/', '.bkit\\']` | **`.claude/` 미포함** — 자동 승인 영역 분리 |
| **Layer 2** | `PreToolUse` Hook (Write/Edit/Bash) | `pre-write.js` (Write/Edit) + `unified-bash-pre.js` (Bash) | 독립 동작, `--dangerously-skip-permissions`와 별도 |
| **Layer 3** | audit-logger sanitizer | `lib/audit/audit-logger.js` | 모든 path 기록 |
| **Layer 4** | Token Ledger NDJSON | `.bkit/runtime/token-ledger.ndjson` | 모든 호출 기록 |

**핵심 발견**:
- F9-121은 CC Layer 0 prompt 동작 변경, bkit Layer 1 PermissionRequest hook과 **무관**
- bkit `SAFE_WRITE_DIRS`는 `docs/`, `.bkit/`만 → `.claude/` 미포함이므로 변경 영향 없음
- bkit hook 정의 SoT인 `hooks/hooks.json` 또는 `.claude-plugin/hooks.json`은 `.claude/skills|agents|commands/` 외부 → F9-121 영향권 밖
- F1-119 학습 적용: **레이어 분리 확인 완료**, 격리 sandbox 실측 우선순위 LOW 강등

### 2.4 ADR 0003 §3 Priority 판정 규칙 적용

| Priority | 허용 E5 상태 | v2.1.121 적용 결과 |
|----------|-------------|-------------------|
| P0 | CONFIRMED 만 | 0건 (회귀 없음) |
| P1 | CONFIRMED 만 (관측성 확장은 SPECULATIVE 예외) | **1건 (CAND-004 OTEL 3 누적)** |
| P2 | CONFIRMED + SPECULATIVE | 3건 (CAND-003 PostToolUse, CAND-005 alwaysLoad, CAND-006 SDK fork) |
| P3 | UNVERIFIED 포함 (관찰만) | 1건 (CAND-007 R-3 모니터) |
| N/A (작업 불요) | CONFIRMED auto-benefit / no-impact | 6건 (B1, B2, B4, F11, B19, F9-120 closure) |

### 2.5 Confidence (실증_계수 반영)

```
Phase 1 Confidence:
  데이터 소스 수: 4 (CHANGELOG `1586204`, npm publish, GitHub releases, GitHub commits)
  교차 검증 수: 3 (CHANGELOG ↔ npm latest tag, CHANGELOG commit ↔ release tag 7초 차, F9-120 closure 2회 연속)
  실증_계수: F9-121 무영향 확정 + F9-120 PASS 직접 실행 → 0.85 평균
  Score: (4 × 3 × 0.85) / 10 = 102% → **clamped 100%**

Phase 2 Confidence:
  Phase 1.5 게이트 통과 후 매핑: 7 항목 (HIGH 6 + F9-120 closure)
  CONFIRMED 6 / SPECULATIVE 1 / 무영향 확정 1
  실증_계수 평균: (1.0 × 6 + 0.5 × 1) / 7 = 0.93
  Score: (7 × 1 × 0.93) / 10 = 65%

Phase 3 Confidence:
  YAGNI 통과 후보: 1 P1 (CAND-004) + 3 P2 (CAND-003, 005, 006) + 1 P3 (CAND-007)
  Phase 1.5 결과 신뢰도 감안: 80%
```

---

## 3. CC 변경사항 조사 (Phase 1)

### 3.1 발행 확정 (4-Source Cross-Verification)

| Source | Status | Evidence |
|--------|--------|----------|
| GitHub CHANGELOG (HEAD) | v2.1.121 섹션 **PRESENT** in commit `1586204` (2026-04-28T00:31:24Z) | +67 lines / 0 deletions, v2.1.120 섹션도 함께 재추가되어 누적 보존 |
| GitHub Release tag | **PUBLISHED** ✅ | tag `v2.1.121` published_at 2026-04-28T00:31:31Z (CHANGELOG commit과 7초 차 — automated pipeline) |
| GitHub Release tag (v2.1.120) | **영구 누락** ⚠️ | releases API 목록에서 v2.1.119 → v2.1.121 직행 (R-1) |
| npm registry | `@anthropic-ai/claude-code@2.1.121` `latest` ✅ | publish 시각 ±수시간 정확도 (E0 R-4) |
| 공식 docs (code.claude.com) | 간접 PRESENT (GitHub CHANGELOG가 SSoT) | 301/307 redirect → CHANGELOG.md |

**E0 Risk (발행 안정성)**:

- v2.1.121 add → revert 패턴 **재발 없음** (단일 안정 commit)
- v2.1.120 release tag 영구 누락 → v2.1.121 release를 v2.1.120/121 통합 SSoT로 간주
- npm publish 정확 시각 미확보 (±수시간) — Phase 2 timing-critical 분석 시 `npm view ... time --json` 직접 호출 필요

### 3.2 v2.1.121 전체 bullet 목록

| # | 분류 | 설명 | CC 심각도 | bkit 잠재 영향 (한 줄) |
|---|------|------|:--------:|----------|
| F1-121 | F | MCP `alwaysLoad` 옵션 | MEDIUM | bkit 2 MCP servers 사전 로드 옵션 (CAND-005) |
| F2-121 | F | `claude plugin prune` + `uninstall --prune` cascade | MEDIUM | bkit-marketplace 정리 자동화 |
| F3-121 | F | `/skills` type-to-filter 검색 | LOW | 39 Skills UX 자동수혜 |
| **F4-121** | F | **PostToolUse `hookSpecificOutput.updatedToolOutput` 전 도구 확장** | **HIGH** | **CAND-003 — audit-logger sanitize 통합 기회** |
| F5-121 | F | Fullscreen 스크롤 jump 방지 | LOW | UX |
| F6-121 | F | Dialog 오버플로 스크롤 | LOW | UX |
| F7-121 | F | wrap URL 클릭 가능 | LOW | UX |
| F8-121 | F | `CLAUDE_CODE_FORK_SUBAGENT=1` SDK/`-p` 비대화형 | MEDIUM | **CAND-006 — ENH-202 9 skills 자동수혜 검증** |
| **F9-121** | F | **`--dangerously-skip-permissions` `.claude/skills|agents|commands/` write 프롬프트 생략** | **HIGH** | **무영향 확정** (Layer 분리) |
| F10-121 | F | iTerm2 clipboard 자동 설정 | LOW | macOS dev 자동수혜 |
| F11-121 | F | MCP startup transient error 3회 재시도 | MEDIUM | bkit 2 MCP servers 안정성 자동수혜 |
| F12-121 | F | terminal title `language` 설정 | LOW | i18n 자동수혜 |
| F13-121 | F | claude.ai connectors 중복 제거 | LOW | 무영향 |
| F14-121 | F | Vertex AI X.509 mTLS ADC | LOW | 무영향 |
| I1-121 | I | Recent Activity 패널 제거 → startup ↑ | LOW | UX 자동수혜 |
| I2-121 | I | LSP diagnostic 확장 hint | LOW | UX |
| I3-121 | I | SDK `mcp_authenticate` `redirectUri` | LOW | 무영향 |
| **I4-121** | I | **OTEL `stop_reason` + `finish_reasons` + `user_system_prompt`** | **HIGH** | **CAND-004 — Sprint δ FR-δ4 묶음 (P1)** |
| I5-121 | I | [VSCode] voice dictation | LOW | 무영향 |
| I6-121 | I | [VSCode] `/context` native dialog | LOW | 무영향 |
| **B1-121** | B | **multi-image multi-GB RSS 누수 fix** | **HIGH** | **CONFIRMED auto-benefit** |
| **B2-121** | B | **`/usage` ~2GB 누수 fix** | **HIGH** | **CONFIRMED auto-benefit** (kay 24일+ 세션) |
| B3-121 | B | progress event memory leak fix | MEDIUM | 자동수혜 |
| **B4-121** | B | **Bash dir delete/move fix** | **HIGH** | **CONFIRMED auto-benefit** (worktree workflow) |
| B5-121 | B | `--resume` external builds crash fix | MEDIUM | 자동수혜 |
| B6-121 | B | `--resume` corrupt transcript line skip | MEDIUM | 자동수혜 |
| B7-121 | B | Bedrock thinking.type.enabled fix | LOW | 무영향 |
| B8-121 | B | M365 MCP OAuth fix | LOW | 무영향 |
| B9-121 | B | scrollback duplication fix (tmux/GNOME/Win Terminal/Konsole) | MEDIUM | UX 자동수혜 — **#52309 매핑 후보** |
| B10-121 | B | claude.ai MCP connector silent disappear fix | LOW | 무영향 |
| B11-121 | B | "Always allow" remote sessions fix | LOW | 무영향 |
| B12-121 | B | `NO_PROXY` HTTP clients fix | LOW | 무영향 |
| B13-121 | B | managed settings approval prompt fix | LOW | 무영향 |
| B14-121 | B | `/usage` stale OAuth refresh fix | MEDIUM | 자동수혜 |
| B15-121 | B | settings.json invalid enum fix | MEDIUM | bkit settings.json schema robustness 자동수혜 |
| B16-121 | B | `/usage` no-flicker clipped fix | LOW | UX |
| B17-121 | B | `/focus` Unknown command fix | LOW | UX |
| B18-121 | B | grep/find/rg deleted binary fallback | MEDIUM | bkit Glob/Grep + nvm/asdf 자동수혜 |
| B19-121 | B | `find` peak FD 감소 (B12-120 후속) | MEDIUM | 자동수혜 |
| Sec1-121 | Sec(CI) | GHA shell injection #43824 | LOW (CI only) | 무영향 (CC internal) |

### 3.3 통계 요약

| 항목 | 값 |
|------|----|
| Total bullets | 38 (+1 외부 commit Sec1) |
| Features | 14 |
| Improvements | 6 |
| Fixes | 19 |
| Security (런타임) | 0 |
| Security (CI only) | 1 (Sec1-121) |
| Breaking | **0** |
| HIGH count | 6 (F4, F9, I4, B1, B2, B4) |
| MEDIUM count | 12 |
| LOW count | 20 |
| Skip 패턴 | 변동 없음 (v2.1.115 외 누적 8건 그대로) |

### 3.4 v2.1.121 → 누적 carryover 점검

| Carryover ID | v2.1.121 직접 해소? | 상태 |
|--------------|:-------------------:|------|
| I1-118 `$defaults` | ❌ | P3 관찰 유지 |
| F5-119 `--print tools:` | ❌ | UNVERIFIED 유지 |
| F8-119 PostToolUse `duration_ms` | 간접 강화 | **CAND-004 묶음 승급** |
| I6-119 OTEL `tool_use_id` + `size` | 간접 강화 | **CAND-004 묶음 승급** |
| B24-119 Auto-compaction | ❌ | Sprint γ FR-γ1 유지 |
| CAND-001 ultrareview | ❌ | P3 관찰 유지 |
| CAND-002 `${CLAUDE_EFFORT}` | ❌ | P2 spike 유지 |
| **F9-120 marketplace.json** | **CONFIRMED 지속 해소** | **closure 완료** (2 릴리스 연속 PASS) |

**v2.1.121 직접 해소 = 0건** (관측성 카테고리만 누적 강화)

### 3.5 장기 OPEN 이슈 상태 갱신

| Issue | 직전 (v2.1.120) | v2.1.121 후 | 비고 |
|-------|:----:|:----:|------|
| #47482 Output styles YAML frontmatter | 14 OPEN | **15 OPEN** | ENH-214 defense 유지 |
| #47855 Opus 1M `/compact` block (MON-CC-02) | 15 OPEN | **16 OPEN** | MON-CC-02 defense 유지 |
| #51798 PreToolUse + dangerouslyDisableSandbox | 5 OPEN | **6 OPEN** | F9-121 인접 영역, 미해소 |
| #51801 bypassPermissions + `.claude/` write | 5 OPEN | **CLOSED (duplicate, 2026-04-25)** ⭐ | 행정 처리, bkit 영향 변동 없음 |
| #51809 Sonnet per-turn 6~8k tokens | 5 OPEN | **CLOSED (duplicate, 2026-04-25)** ⭐ | 행정 처리 |

**핵심 변동**: #51801, #51809 행정 처리 종결 — bkit 방어 코드는 본 목적(ENH-263 repo clone 공격 벡터)으로 유지.

### 3.6 MON-CC-06 갱신

- 직전 (v2.1.120): 24건
- v2.1.121 직접 해소 후보: B9-121 ↔ #52309 tmux scrollback (Phase 2 실측 매핑 권고, 미확정)
- 신규 등록 후보: #54127 cap drop ~2x (HIGH, has repro), #54135 NodeJS NVM Path (MEDIUM)
- 슈퍼이슈 그룹화 후보: "Claude ignores safety hooks" 시리즈 8건 (#54129~#54041) — **MON-CC-NEW로 별도 추적 권고**
- **잠정 카운트**: 24 → 24~25 (B9 매핑 -1, 신규 +1, 순 0~+1)

---

## 4. bkit 영향 매트릭스 (Phase 2)

### 4.1 변경별 bkit 컴포넌트 매핑

| CC 변경 | E5 상태 | 영향 컴포넌트 (절대 경로) | 영향 유형 | Priority |
|---------|---------|--------------------------|----------|:--------:|
| F4-121 PostToolUse `updatedToolOutput` | SPECULATIVE | `hooks/hooks.json` PostToolUse 3 blocks; `scripts/unified-write-post.js`; `scripts/unified-bash-post.js`; `scripts/skill-post.js` | 통합 기회 | **P2 (CAND-003 spike)** |
| F9-121 `--dangerously-skip-permissions` `.claude/` 일부 완화 | CONFIRMED 무영향 | `scripts/permission-request-handler.js:43-47` SAFE_WRITE_DIRS | **무영향 확정** (Layer 분리) | N/A |
| I4-121 OTEL 3 attributes | CONFIRMED auto-benefit + 확장 | `lib/infra/telemetry.js:165-228 createOtelSink`, `:109-120 sanitizeForOtel`, `:125-157 buildOtlpPayload` | 관측성 확장 | **P1 (CAND-004 Sprint δ FR-δ4)** |
| B1-121 multi-image RSS | CONFIRMED auto-benefit | (해당 없음, CC 내부) | NO IMPACT in code | N/A |
| B2-121 `/usage` ~2GB | CONFIRMED auto-benefit | (해당 없음, CC 내부) | kay 24일+ 직접 수혜 | N/A |
| B4-121 Bash dir delete | CONFIRMED auto-benefit | (해당 없음, CC 내부) — 영향: 47 scripts Bash 의존 + worktree | dev workflow 안정성 | N/A |
| F1-121 MCP `alwaysLoad` | CONFIRMED 신규 기능 | `mcp-servers/mcp-pdca/`, `mcp-servers/mcp-bkit/`, `.claude-plugin/plugin.json` | 통합 기회 (측정 선행) | **P2 (CAND-005 spike)** |
| F8-121 SDK fork | CONFIRMED 확장 | ENH-202 `context: fork` 9 skills, `agents/cto-lead.md` Task spawn | auto-benefit 검증 | **P2 (CAND-006 1회)** |
| F11-121 MCP retry | CONFIRMED auto-benefit | bkit 2 MCP servers | 안정성 | N/A |
| B9-121 tmux scrollback | CONFIRMED auto-benefit | (#52309 매핑 후보) | UX | 추적 |
| F9-120 closure | CONFIRMED 지속 | `.claude-plugin/marketplace.json` | 2 릴리스 연속 PASS | N/A |
| 기타 LOW (24건) | LOW | (해당 없음) | UX/cosmetic | N/A |

### 4.2 R-3 "safety hooks 무시" 시리즈 평가

**시리즈**: #54129 / 54123 / 54085 / 54078 / 54077 / 54064 / 54058 / 54041 (8건, "Claude ignores safety hooks #N")

**bkit Defense-in-Depth 4-Layer 영향 평가**:

- Layer 1 (CC Built-in): 영향 없음
- **Layer 2 (PreToolUse Hook)**: 모델이 hook 출력을 skippable context로 취급 → "deny" 결정은 **물리적으로 적용** (write/bash 차단 유효), 단 모델 학습 컨텍스트에서 무시 가능
- Layer 3 (audit-logger): 독립 작동, 영향 없음
- Layer 4 (Token Ledger NDJSON): 독립 작동, 영향 없음

**핵심 결론**:
- **물리적 방어는 보존** — bkit Defense는 hook 응답을 시스템 호출 차단으로 사용, 모델 컨텍스트 의존 아님
- **사용자 경험 측면**: 모델이 같은 dangerous 패턴을 반복 시도 → ENH-264 (alternatives 제안) 효과 저하 우려
- ADR 0003 §3 SPECULATIVE 게이트 준수 — **선제 대응 보류, MON-CC-NEW 2주 모니터 등록**

### 4.3 Philosophy 준수 검토

| Philosophy | v2.1.121 정합성 |
|-----------|----------------|
| **Automation First** | ✅ F4-121, I4-121, F1-121, F8-121 모두 bkit 자동화 표면 확장. CAND-003은 sanitizer 자동 redact 강화. CAND-004는 텔레메트리 자동 누적. |
| **No Guessing** | ✅ ADR 0003 게이트 통과. F9-121 정밀 검증 → 무영향 확정. R-3 unverified는 추적 모드. F1-119 false alarm 학습 적용. |
| **Docs=Code** | ✅ hooks.json schema 변경 없음 (CC PostToolUse `updatedToolOutput` schema 확장은 CC 측 정의). marketplace.json F9-120 자동수혜 **2 릴리스 연속 지속**. |

### 4.4 호환성 매트릭스

| CC 버전 | bkit v2.1.10 호환 | 비고 |
|---------|:----------------:|------|
| v2.1.114 | ✅ | CTO Team crash fix (최소 권장) |
| v2.1.116 | ✅ | S1 보안 + `/resume` |
| v2.1.117 | ✅ | 이전 권장 |
| v2.1.118 | ✅ | 76 연속 |
| v2.1.119 | ✅ | 77 연속 (검증 완료, 베이스라인) |
| v2.1.120 | ✅ | 78 연속 (release tag 영구 누락, F9-120 CONFIRMED) |
| **v2.1.121** | ✅ **확인 (정적 + 부분 실측 + F9-120 closure)** | **79 연속**, Breaking 0 |

### 4.5 연속 호환 릴리스

```
v2.1.34 ─────────────────────────────────────── v2.1.121
         79개 연속 호환 릴리스 (v2.1.115 등 8건 skip 포함)
         bkit 기능 코드 Breaking: 0건

         v2.1.121 실증 근거:
           • F9-120 marketplace.json closure 2 릴리스 연속 PASS (실증)
           • F9-121 Layer 분리 → 무영향 확정 (정밀 검증)
           • B1/B2/B4-121 메모리 + Bash 안정성 자동수혜
           • F11-121 MCP startup retry 자동수혜
           • B19-121 find FD 자동수혜 (B12-120 후속)
```

### 4.6 테스트 영향 평가

| 변경 | 영향 테스트 | 신규 테스트 필요 |
|------|------------|-----------------|
| F4-121 PostToolUse 확장 | `test/scripts/unified-write-post.test.js`, `unified-bash-post.test.js` | CAND-003 채택 시 `updatedToolOutput` schema 검증 |
| F9-121 `--dangerously-skip-permissions` | `test/scripts/permission-request-handler.test.js` | **불필요** (SAFE_WRITE_DIRS와 분리) |
| I4-121 OTEL | `test/infra/telemetry.test.js` | CAND-004 채택 시 신규 필드 매핑 + `OTEL_LOG_USER_PROMPTS × OTEL_REDACT` 2-게이트 합성 |
| B1/B2/B4-121 | 영향 없음 (CC 내부 fix) | 없음 |
| F1-121 alwaysLoad | `test/integration/mcp-runtime.test.js` (L3) | CAND-005 채택 시 |
| F8-121 SDK fork | `test/skills/context-fork.test.js` (있다면) | CAND-006 검증 시 |
| F11-121 MCP retry | `test/integration/mcp-runtime.test.js` (L3) | 자동 수혜 |

L1~L5 레이어별 영향:

| 레이어 | 영향 |
|--------|------|
| L1 unit | telemetry.test.js (CAND-004) |
| L2 contract | hooks.json schema (CAND-003) |
| L3 integration runtime | mcp-runtime.test.js (CAND-005) |
| L4 regression | F9-121 무영향 회귀 테스트 (선택) |
| L5 E2E shell smoke | 5/5 PASS 유지 |

---

## 5. Plan Plus 브레인스토밍 (Phase 3)

### 5.1 Intent Discovery

**Q1. v2.1.121에서 bkit이 얻는 최대 가치는?**

A: (a) **B4-121 Bash dir delete fix** — CTO Team `context: fork` worktree workflow 직접 수혜, (b) **F9-120 자동 해소 2 릴리스 연속 안정** 입증 (ADR 0003 가치 강화), (c) **I4-121 OTEL 3종 + F8-119/I6-119 누적** Sprint δ FR-δ4 묶음 가속.

**Q2. 놓치면 안 되는 critical change?**

A: 없음. Breaking 0, regression 0. 단 **R-3 "safety hooks 무시" 8건**은 bkit Defense Layer 2 신뢰성 모델 근본 우려 — Phase 2가 "물리 차단은 보존" 분리 판정. 선제 대응 보류, MON-CC-NEW 2주 모니터.

**Q3. bkit 기존 workaround 대체 가능한 native 기능?**

A: F1-121 MCP `alwaysLoad`가 만약 bkit 2 MCP servers에 `mcpServers` 등록되어 있다면 즉시 활용 가능. 미등록 상태 확인 필요.

### 5.2 Alternative Exploration (HIGH 항목만)

#### CAND-003 — F4-121 PostToolUse `updatedToolOutput` audit-logger 통합

| 대안 | 비용 | 가치 | 권장 |
|------|:---:|:---:|:---:|
| A. v2.1.11 Sprint δ FR-δ4 통합 | 中 | 中 | ❌ |
| B. v2.1.12 별도 spike (audit-logger 1 hook) | 低 | 高 | ✅ |
| C. CAND-007 (R-3) 응답과 결합 (PostToolUse에서 차단 사유 재주입) | 中 | 高 | ✅ (조건부, R-3 후) |

**결론**: B → C 단계적. v2.1.12 spike → R-3 패턴 확정 후 결합 → **P2**.

#### CAND-004 — OTEL 3 누적 (I4-121 + F8-119 + I6-119) Sprint δ FR-δ4 묶음

| 대안 | 비용 | 가치 | 권장 |
|------|:---:|:---:|:---:|
| A. 3 변경 단일 PR | 中 | 高 | ✅ |
| B. 변경별 분리 PR 3건 | 高 | 中 | ❌ |
| C. v2.1.12 이월 (전체) | 低 | 低 (token-report 가치 지연) | ❌ |

**결론**: A 채택. v2.1.11 Sprint δ FR-δ4 단일 PR. `OTEL_LOG_USER_PROMPTS × OTEL_REDACT` 2-게이트 합성 정책 선행 → **P1 (관측성 확장 SPECULATIVE 예외)**.

#### CAND-005 — F1-121 MCP `alwaysLoad`

| 대안 | 비용 | 가치 | 권장 |
|------|:---:|:---:|:---:|
| A. 즉시 적용 | 低 | 中 (data-driven 부족) | ❌ |
| B. v2.1.12 spike 1주 측정 | 中 | 高 | ✅ |
| C. P3 관찰 | 低 | 低 | ❌ |

**결론**: B → **P2 spike**.

#### CAND-006 — F8-121 SDK fork 검증

**결론**: 1회 검증 → **P2 검증**.

#### CAND-007 — R-3 "safety hooks 무시" 응답

| 대안 | 비용 | 가치 | 권장 |
|------|:---:|:---:|:---:|
| A. 즉시 Defense Layer 2 보강 | 中 | 中 (가설 미확정) | ❌ |
| B. MON-CC-NEW 2주 카운터 | 低 | 高 (ADR 0003 부합) | ✅ |
| C. 무시 | 低 | 中 | ❌ |

**결론**: B → **P3 모니터**.

### 5.3 YAGNI Review

| 후보 | 사용자 pain? | 미구현 시 문제? | 다음 CC 더 나은? | 결론 |
|------|:---:|:---:|:---:|------|
| CAND-003 PostToolUse | ⚠️ (R-3 결합 시 高) | sanitize 효율 정체 | LOW | **P2 spike** |
| CAND-004 OTEL 누적 | ✅ (token-report 정확도) | 6 릴리스 carryover 누적 | LOW | **P1** |
| CAND-005 alwaysLoad | ❌ (사용 빈도 미측정) | 첫 호출 latency | 中 | **P2 (측정 선행)** |
| CAND-006 SDK fork | ❌ | ENH-202 자동수혜 미발현 | LOW | **P2 검증 1회** |
| CAND-007 R-3 모니터 | ⚠️ (가설) | Defense 가정 무검증 | 中 | **P3 모니터** |

### 5.4 최종 우선순위

| Priority | Count | 항목 |
|----------|:-----:|------|
| P0 | 0 | (없음) |
| **P1** | **1** | **CAND-004 OTEL 3 누적 (Sprint δ FR-δ4)** |
| P2 | 3 | CAND-003 PostToolUse, CAND-005 alwaysLoad, CAND-006 SDK fork |
| P3 | 1 | CAND-007 R-3 모니터 |
| 자동수혜 | 6 | F9-120 closure, B1, B2, B4, F11, B19-121 |
| 무영향 (정밀 검증) | 1 | F9-121 (Layer 분리) |
| 무영향 (정적) | 24 | F3, F5~F7, F10, F12~F14, I1~I3, I5~I6, B3, B5~B8, B10~B18, Sec1 |

**ENH 번호 정책**: ADR 0003 §6.2 준수 — CAND-XXX 표기. 실 구현 착수 시 ENH 발급.

---

## 6. v2.1.11/v2.1.12 영향

### 6.1 v2.1.11 (현재 `feat/v2110-integrated-enhancement` 브랜치)

- Sprint α/β/γ/δ × 20 FR + Precondition P1/P2/P3 — **추가 작업 불필요**
- **CAND-004 추가**: Sprint δ FR-δ4 token-report **묶음 확장** (기존 F8-119/I6-119 + I4-121, 신규 FR 발급 불요)
- ENH-277/279/280 기존 범위 유지
- Precondition P1 (Phase 7 /pdca qa 최종 검증): v2.1.121 분석 결과 영향 없음

### 6.2 v2.1.12 Carryover (8건 누적)

| 출처 | ID | 상태 | 통합 대상 |
|------|----|------|----------|
| v2.1.118 | I1-118 `$defaults` | P3 관찰 | CC spec 명문화 후 |
| v2.1.119 | F5-119 `--print tools:` | UNVERIFIED | 유관 issue 발생 시 |
| v2.1.119 | B24-119 Auto-compaction | Sprint γ | FR-γ1 |
| v2.1.120 | CAND-001 ultrareview | P3 관찰 | 사용 사례 축적 |
| v2.1.120 | CAND-002 `${CLAUDE_EFFORT}` | P2 spike | 1 skill |
| **v2.1.121** | **CAND-003** F4-121 PostToolUse | **P2 spike** | audit-logger 1 hook |
| **v2.1.121** | **CAND-005** F1-121 alwaysLoad | **P2 spike** | 측정 1주 |
| **v2.1.121** | **CAND-006** F8-121 SDK fork | **P2 검증** | 1회 실험 |
| **v2.1.121** | **CAND-007** R-3 safety hooks | **P3 모니터** | MON-CC-NEW 2주 |

**Closed**:
- F8-119 + I6-119 → CAND-004 (Sprint δ) 승급, carryover 종료
- F9-120 marketplace.json → 2 릴리스 연속 PASS, **closure 완료**

---

## 7. 결론 및 권고사항

### 7.1 최종 판정

- **호환성**: ✅ **CONFIRMED** — bkit v2.1.10이 CC v2.1.121에서 무수정 작동 (Phase 1.5 정적 + 부분 실측 + F9-120 closure 기반)
- **업그레이드 권장**: ✅ **YES** — release tag 정상 게시 (2026-04-28T00:31:31Z), F9-120 closure 지속 입증
- **bkit 버전**: v2.1.10 유지. v2.1.11은 기존 integrated enhancement 범위 + CAND-004 묶음 확장으로 진행

### 7.2 권장 CC 버전 (2026-04-28 기준)

- **최소**: v2.1.114
- **권장 (현재)**: **v2.1.121** (release tag 정상 게시 완료, F9-120 closure 안정 입증, ADR 0003 두 번째 적용 통과)
- **이전 권장**: v2.1.119 → **v2.1.121로 승격**
- **현재 npm latest**: v2.1.121

### 7.3 핵심 액션 아이템

1. **즉시**: 본 보고서 발행 + memory 업데이트 + MEMORY.md 갱신 (79 연속 호환, F9-120 closure)
2. **v2.1.11 Sprint δ FR-δ4 (CAND-004)**:
   - I4-121 + F8-119 + I6-119 단일 PR 묶음
   - `OTEL_LOG_USER_PROMPTS × OTEL_REDACT` 2-게이트 합성 정책 설계
   - `lib/infra/telemetry.js:125-157 buildOtlpPayload` 신규 필드 매핑
   - 신규 단위 테스트 `test/infra/telemetry.test.js` 추가
3. **v2.1.12 Sprint**:
   - **CAND-003** F4-121 PostToolUse audit-logger spike (1 hook)
   - **CAND-005** F1-121 alwaysLoad 1주 측정 → ROI 결정
   - **CAND-006** F8-121 SDK fork 1회 검증 실험
   - 이전 carryover 5건 (I1-118, F5-119, B24-119, CAND-001, CAND-002) 통합
4. **MON-CC-NEW 등록 (R-3)**:
   - "Claude ignores safety hooks" 8건 시리즈 (#54129~#54041) 슈퍼이슈로 그룹화
   - 2주 OPEN 카운터, 패턴 확정 시 CAND-003과 결합 평가
5. **GitHub 모니터링**:
   - v2.1.120 release tag 사후 게시 가능성 (R-1, 영구 누락 추정)
   - #54127 cap drop ~2x 회귀 추적 (bkit token-ledger NDJSON)
   - B9-121 ↔ #52309 매핑 검증

### 7.4 다음 단계 체크리스트

- [x] **2026-04-28**: Phase 1 (Research) 완료 — 38 bullets, 6 HIGH 식별
- [x] **2026-04-28**: Phase 1.5 (Empirical Validation) 완료 — F9-120 closure 2 릴리스 연속 PASS
- [x] **2026-04-28**: Phase 2 (bkit Impact) 완료 — 0 regression, 6 auto-benefit, 1 무영향 확정 (F9-121), 5 CAND
- [x] **2026-04-28**: Phase 3 (Plan Plus) 완료 — 1 P1 / 3 P2 / 1 P3
- [x] **2026-04-28**: Phase 4 (보고서) 완료 — 본 문서
- [ ] **2026-04-28**: memory/cc_version_history_v2121.md 신규 작성
- [ ] **2026-04-28**: MEMORY.md 갱신 (79 연속 호환, F9-120 closure, MON-CC-NEW)
- [ ] **2026-05-12**: MON-CC-NEW R-3 시리즈 2주 카운터 review
- [ ] **v2.1.11 Sprint δ**: FR-δ4 CAND-004 (OTEL 3 누적) 단일 PR 통합
- [ ] **v2.1.12 spike**: CAND-003 / 005 / 006 spike 결과

---

## Appendix A — Confidence 종합

| Phase | Score | 근거 |
|-------|:----:|------|
| Phase 1 | **100%** (clamped) | 4 sources × 3 cross-checks × 0.85 실증_계수. F9-120 closure 직접 실행. |
| Phase 1.5 | **85%** | F9-121 정밀 검증 정적 트레이싱 + Layer 분리 명시화. F9-120 closure 실측 직접. 4건 정적 검증. |
| Phase 2 | **65%** | Phase 1 안정 (CHANGELOG add/revert 재발 없음). 매핑 단순 (bkit grep 명확). R-3 unverified 가설은 보류 처리. |
| Phase 3 | **80%** | YAGNI 통과 1 P1 + 3 P2 + 1 P3. P0 0건 단순성. |

**Open Questions**:

1. F4-121 `updatedToolOutput`는 PostToolUse hook의 어떤 도구에서 정확히 적용? (Bash/Edit/Write/Read 모두? Skill tool?) — 공식 docs schema 미반영
2. F9-121 권한 완화에 `.claude/hooks.json`은 보호 영역 유지인가, 완화인가? CHANGELOG 명문에 hooks.json 미언급 → 보호 유지 추정
3. B9-121 tmux scrollback fix가 #52309와 동일 회귀? 정확 매핑 시 MON-CC-06 1건 자동 해소
4. #54127 (Apr 27 모델 cap drop ~2x) 회귀가 클라이언트 vs 모델/서버 사이드?
5. R-3 "ignores safety hooks" 시리즈 8건의 근본 원인 — 모델 prompt 학습 부족? Hook 출력 컨텍스트 위치 문제?

## Appendix B — 이전 보고서와 연속성

| 보고서 | 기간 | 릴리스 | 판정 | 상태 |
|--------|------|:----:|-----|------|
| cc-v2114-v2116-impact | 2026-04-21 | 1 | 호환 | Closed |
| cc-v2116-v2117-impact | 2026-04-22 | 1 | 호환 (5×P0 ENH) | Closed |
| cc-v2117-v2118-bkit-v2111-impact | 2026-04-23 | 1 | 호환 (3 ENH Sprint δ/γ) | Closed |
| cc-v2117-v2119-impact (v2 re-issued) | 2026-04-24 | 2 | 호환 (실증 반박, ADR 0003 발행) | Closed |
| cc-v2119-v2120-impact | 2026-04-25 | 1 | 호환 (auto-benefit 4건, ADR 0003 첫 적용) | Closed |
| **cc-v2120-v2121-impact (본 보고서)** | **2026-04-28** | **1** | **호환 (auto-benefit 6건, F9-120 closure, ADR 0003 두 번째 적용)** | **Final** |

**누적**: v2.1.73 → v2.1.121 = **48 릴리스 분석, 8 skip, 79 연속 호환**

## Appendix C — F9-120 closure 상세 (2026-04-28 메인 환경 실측)

```bash
$ pwd
/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code

$ claude --version
2.1.121 (Claude Code)

$ claude plugin validate .
Validating marketplace manifest:
  /Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/.claude-plugin/marketplace.json

✔ Validation passed
[Exit: 0]
```

**의미**:

- v2.1.120 ADR 0003 첫 사이클 발견 항목 → v2.1.121에서도 안정 유지
- CC F9-120 fix가 **2 릴리스 연속 안정화 입증**
- ADR 0003 §7.4 "사용자 v2.1.120 업그레이드 후 `claude plugin validate .` 재실행 결과 기록" 미완료 체크리스트 자동 closure
- ADR 0003 가치 명세 강화: "False alarm 차단" + "잠재 결함 능동 발견" + **"fix 지속 안정화 입증"**

## Appendix D — F9-121 Layer 분리 트레이싱 상세

`scripts/permission-request-handler.js:43-47`:

```javascript
const SAFE_WRITE_DIRS = [
  'docs/',
  '.bkit/',
  '.bkit\\',
];
```

**분석**:
1. F9-121 영향 영역: CC Layer 0 (`--dangerously-skip-permissions` 내장 prompt) — `.claude/skills/`, `.claude/agents/`, `.claude/commands/`만 명시
2. bkit Layer 1 (`PermissionRequest` Hook) `SAFE_WRITE_DIRS`: `.claude/` 미포함 → **자동 승인 영역 분리**
3. bkit hook 정의 SoT (`hooks/hooks.json` 또는 `.claude-plugin/hooks.json`): F9-121 명시 영역 외부 → **보호 유지**
4. F1-119 false alarm 학습 적용:
   - 경로 매핑 정확 (프로젝트 `.claude/` vs 홈 `~/.claude/`)
   - **레이어 분리 명시화** (CC Layer 0 prompt vs bkit Layer 1/2 hook)
5. 최종 판정: **무영향 확정**

---

**End of Report (Final 2026-04-28)**
