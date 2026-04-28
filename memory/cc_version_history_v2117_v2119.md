# CC Version History v2.1.117 ~ v2.1.119 (실증 반영 재작성)

> **Analysis Date**: 2026-04-24 (초판) → 2026-04-24 15:00 (재작성)
> **Analyst**: CTO Team (cc-version-researcher Phase 1 + bkit-impact-analyst Phase 2) + kay kim 실증 검증
> **Source Report**: `docs/04-report/features/cc-v2117-v2119-impact-analysis.report.md` (v2 re-issued)
> **Retrospective**: `docs/03-analysis/cc-v2119-phase2-retrospective.md`
> **ADR**: `docs/adr/0003-cc-version-impact-empirical-validation.md`

---

## v2.1.118 (2026-04-22 publish)

**34 bullets** (Features 6 + Improvements 7 + Fixes 21, Security 0, Breaking 0)

### 주요 Features

- **F1-118 Vim visual mode** (LOW, 무영향)
- **F2-118 `/cost`+`/stats` → `/usage` 병합** (MEDIUM, bkit docs grep 필요)
- **F3-118 Custom themes** (`~/.claude/themes/`) (LOW, 무영향)
- **F4-118 Hooks `type: "mcp_tool"`** (HIGH, YAGNI FAIL DROP) — speculative refactor, CC 공식 예시 부족
- **F5-118 `DISABLE_UPDATES` env var** (MEDIUM, 자동수혜)
- **F6-118 `wslInheritsWindowsSettings` policy** (LOW, 무영향)

### 주요 Improvements

- **I1-118 Auto mode `"$defaults"` 기본 규칙 확장** (HIGH, v2.1.12 이월 P3 관찰) — bkit `automation.defaultLevel: 2` 충돌 가능성만 추정, 실 pain 없음
- **I3-118 `claude plugin tag` 명령** (MEDIUM, ENH-279 Sprint δ 편입 이미 계획됨)
- **I7-118 Plugin auto-update 오류 `/doctor` 노출** (LOW, 자동수혜)

### 주요 Fixes

- **B8-118 credential save crash** (Linux/Windows) (HIGH, 자동수혜)
- **B12-118 Agent-type hook 다른 이벤트 실패** (HIGH, **CONFIRMED 무영향** — bkit hooks.json 전량 `"type": "command"`, agent hook 미사용)
- **B14-118 `/fork` pointer+hydrate** (HIGH, 자동수혜 — CTO Team fork 디스크 회복)
- **B21-118 SendMessage subagent cwd 미복원** (HIGH, SPECULATIVE)
- MCP OAuth 수정 6건 (B2~B7) (MEDIUM, 자동수혜)

---

## v2.1.119 (2026-04-23 npm latest)

**46 bullets** (Features 10 + Improvements 7 + Fixes 28 + Security 1, Breaking 0)

### 주요 Features

- **F1-119 `/config` settings 영속화** → `~/.claude/settings.json` (HIGH, **✅ REFUTED**)
  - **초판 주장**: bkit ENH-263 `.claude/` 방어와 충돌 → `/config` UX 블로킹 P0
  - **실증 결과 (2026-04-24)**: 사용자가 CC v2.1.119 + bkit v2.1.10에서 `/config` 테마 변경 → **정상 작동, 블로킹 없음**
  - **원인**: 경로 혼동 — `~/.claude/` (유저 홈) vs `./.claude/` (프로젝트). ENH-263은 프로젝트만 방어, `/config`는 유저 홈에 write
  - **교훈**: grep + CHANGELOG 논리 추론을 런타임 결론으로 점프 금지
- **F4-119 `--from-pr` GitLab MR + Bitbucket + GitHub Enterprise** (MEDIUM, 무영향)
- **F5-119 `--print`가 agent `tools:`/`disallowedTools:` 준수** (HIGH, **❓ UNVERIFIED**)
  - 초판 주장: 36 agents 중 7개 `tools:` 누락 → `--print --agent` silent breakage P0
  - 실증 미수행, v2.1.12 이월
  - **대응**: 유관 이슈(GitHub `anthropics/claude-code` 또는 `bkit-claude-code`) 리포트 발생 시 실증 후 재평가
- **F6-119 `--agent`가 built-in `permissionMode` 준수** (MEDIUM, CONFIRMED 무영향 — bkit plugin agent는 CC가 무시, cto-lead.md:25 주석 확인)
- **F7-119 PowerShell 도구 auto-approve** (MEDIUM, 무영향)
- **F8-119 PostToolUse `duration_ms`** (HIGH, SPECULATIVE 관측성 확장 기회, v2.1.12 이월 → Sprint δ `/pdca token-report` 통합)
- **F9-119 Subagent SDK MCP 병렬 재구성** (MEDIUM, CTO Team 자동수혜)

### 주요 Improvements / Security

- **I5-119 (Security) `blockedMarketplaces` hostPattern/pathPattern fix** (HIGH, CONFIRMED 무영향 — bkit Marketplace 미운영)
- **I6-119 OTEL `tool_use_id` + `tool_input_size_bytes`** (MEDIUM, SPECULATIVE 관측성 확장, v2.1.12 이월 → Sprint δ 통합)
- **I7-119 Status line `effort.level` + `thinking.enabled`** (MEDIUM, 무영향 — bkit status line 미등록)

### 주요 Fixes

- **B3-119 Glob/Grep Bash denied 시 native 사라짐 수정** (HIGH, 자동수혜 — ENH-256 P0 → P2 강등 근거)
- **B7-119 Auto mode가 plan mode override** (HIGH, SPECULATIVE)
- **B19-119 verbose setting restart 지속** (MEDIUM, 자동수혜)
- **B23-119 `/plan open` 기존 plan 무시 fix** (MEDIUM, bkit PDCA Plan 자동수혜)
- **B24-119 Auto-compaction 전 호출된 skill 재실행 fix** (HIGH, 자동수혜 + ENH-232 재평가 기회, v2.1.12 측정 필드 추가 예정)
- **B28-119 TaskList ID 정렬 fix** (MEDIUM, 자동수혜)
- **B29-119 PR 제목 rate limit 오탐 제거** (MEDIUM, 자동수혜)
- **B30-119 SDK/bridge read_file size cap** (MEDIUM, 자동수혜)

---

## bkit 영향 요약 (실증 반영)

| 카테고리 | 건수 |
|---------|:---:|
| CONFIRMED 크리티컬 회귀 | **0** |
| REFUTED (초판 false alarm) | 1 (F1-119) |
| UNVERIFIED → v2.1.12 이월 | 1 (F5-119) |
| 관측성 확장 기회 → v2.1.12 | 2 (F8-119, I6-119) |
| 기술 부채 재평가 → v2.1.12 | 1 (B24-119 측정) |
| CONFIRMED 무영향 | 3 (B12-118, I5-119, F6-119) |
| 자동수혜 | 5+ (B8/B14/B21/B3/B24 외 MCP OAuth 6) |
| YAGNI FAIL DROP | 2 (F4-118 mcp_tool hook, B12-118 agent hook 가드) |
| v2.1.12 P3 관찰 | 1 (I1-118 `$defaults`) |

**ENH 번호 상태**: ENH-281 ~ ENH-285 **해제** (Sprint ε 폐기로 구현 없음). 실제 구현 착수 시점에 재발급.

**Breaking Changes**: **0건 (확정)**

**연속 호환 릴리스**: 75 (v2.1.117) → **77 (v2.1.119 확인)**, Breaking 0

---

## 실증 반박된 초판 주장 (학습 목적)

### F1-119 P0 초판 주장 → REFUTED (2026-04-24 14:xx)

**초판 논리 체인**:
```
1. bkit scripts/permission-request-handler.js:43-47 SAFE_WRITE_DIRS에 `.claude/` 없음
2. F1-119 CHANGELOG: `/config`가 `~/.claude/settings.json`에 write
3. 따라서 `/config` 실행 → bkit 방어에 의해 차단됨 (P0)
```

**실증 결과**: 사용자가 해당 환경에서 `/config` 실행, 테마 변경, 저장 → **전부 정상**. bkit prompt도 차단도 없었음.

**원인**:
- **경로 혼동**: `~/.claude/settings.json` (유저 홈, absolute path expansion) ≠ `./.claude/settings.json` (프로젝트, relative path)
- bkit ENH-263 방어는 **프로젝트 내** `.claude/` 대상 (CVE #51801의 repo clone 공격 벡터)
- `/config`는 **유저 홈** `~/.claude/`에 write → bkit 방어 경로와 무관
- Phase 2 분석에서 경로 문자열만 보고 같은 대상으로 간주

**결과**:
- Sprint ε Plan/Design 2 문서 폐기 (1,268 줄)
- feature 브랜치 삭제
- 8시간 구현 공수 절감
- ADR 0003 (Empirical Validation) 발행 → CC v2.1.120+ 대응부터 적용

**교훈**:
1. grep 결과는 "이 파일에 이 로직이 있음"만 증명, "이 시나리오에서 그 로직이 트리거됨"은 증명 안 함
2. "No Guessing" 원칙 = 실측 실행 검증 없이는 P0 판정 불가
3. 경로 문자열 매칭 시 절대/상대 경로, 홈/프로젝트 스코프 구분 필수

---

## GitHub Issues 스냅샷 (2026-04-24 기준)

### 장기 OPEN 지속 (2 릴리스 추가 경과)

- **#47482** Output styles YAML frontmatter: **13 릴리스 OPEN** (+2)
- **#47855** Opus 1M `/compact` block (MON-CC-02): **14 릴리스 OPEN** (+2)
- **#51798** PreToolUse + dangerouslyDisableSandbox: **4 릴리스 OPEN** (+2)
- **#51801** bypassPermissions + `.claude/` write: **4 릴리스 OPEN** (+2)
- **#51809** Sonnet per-turn 6~8k tokens: **4 릴리스 OPEN** (+2)

### MON-CC-06 확장 19 → 24 (+5 v2.1.118 regression)

| Issue | 제목 | Severity | Status | bkit 영향 |
|-------|------|:-----------:|:------:|----------|
| #52657 | VS Code extension silent crash | HIGH | OPEN | 무영향 |
| #52309 | tmux terminal resize 출력 중복 | HIGH | OPEN | 개발자 경고 후보 |
| #52503 | Hebrew/RTL reversed | LOW | OPEN | 무영향 |
| #52552 | Bedrock 무응답 | MEDIUM | OPEN | 무영향 |
| #52291 | `renderToolResultMessage` TypeError | MEDIUM | OPEN | 자동수혜 대기 |

**v2.1.118/119 공식 수정 (MON-CC-06 관련)**: **1건** (#52426 v2.1.119 CLOSED, #52319 CLOSED)

---

## 결론

- **CC 추천 버전**: v2.1.117+ → **v2.1.119+** 승격 (2026-04-24, **실증 기반**)
- **연속 호환**: 75 → **77** (Breaking 0 확정)
- **bkit 버전**: v2.1.10 유지 (hotfix 불필요)
- **v2.1.11**: 기존 integrated enhancement 범위로 진행 (Sprint α/β/γ/δ, Sprint ε 삭제)
- **v2.1.12**: F5-119 실증 + 관측성 3건 + B24 측정을 Sprint δ에 통합

---

## 관련 파일

- 보고서: `docs/04-report/features/cc-v2117-v2119-impact-analysis.report.md` (v2 re-issued)
- Retrospective: `docs/03-analysis/cc-v2119-phase2-retrospective.md` (신설)
- ADR: `docs/adr/0003-cc-version-impact-empirical-validation.md` (신설)
- 모니터링: `docs/reference/cc-issue-monitoring.md` (신설)
- 이전 memory: `memory/cc_version_history_v2115_v2116.md`
