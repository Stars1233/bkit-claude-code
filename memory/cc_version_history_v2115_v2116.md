# CC Version History v2.1.115 ~ v2.1.116

> **Analysis Date**: 2026-04-21
> **Analyst**: CTO Team (cc-version-researcher + bkit-impact-analyst + Plan Plus)
> **Source Report**: `docs/04-report/features/cc-v2114-v2116-impact-analysis.report.md`
> **Source Plan**: `docs/01-plan/features/cc-v2114-v2116-impact-analysis.plan.md`

---

## v2.1.115 — ❌ 미발행 (8번째 스킵)

**4중 교차 검증**:
- `npm view @anthropic-ai/claude-code@2.1.115` → HTTP 404
- `https://github.com/anthropics/claude-code/tags` → v2.1.115 태그 부재
- `CHANGELOG.md` → v2.1.115 섹션 부재
- `compare v2.1.114...v2.1.116` → 단 1 커밋 (`chore: Update CHANGELOG.md` fe53778)

**스킵 패턴 확정**: v2.1.82 / 93 / 95 / 99 / 102 / 103 / 106 / **115** (8건)
**최근 4 릴리스 중 2건 스킵** (106, 115) — 빈도 상승

---

## v2.1.116 (2026-04-20 22:18 UTC)

**24 bullets** (Features 1 + Improvements 10 + Security 1 + Fixes 12)

### Features

- **F1 — Agent frontmatter `hooks:` fire on main-thread `--agent`** (MEDIUM, bkit 영향 없음)
  - bkit 36 agents 전부 `hooks:` frontmatter 미사용 (grep 실측) → ENH-256 **YAGNI FAIL**

### Improvements

- **I1 — `/resume` 67% 가속 (40MB+ 세션) + dead-fork entries 효율 처리** (HIGH, 자동 수혜)
  - ENH-221 (v2.1.108 `--resume` self-ref truncate fix) 연장 → **ENH-255 P2**
- **I2 — MCP `resources/templates/list` 첫 `@`-mention 지연 로드** (MEDIUM, 무영향)
  - bkit MCP 2 서버(bkit-pdca, bkit-analysis) `resources/templates/list` 미구현 → ENH-257 **YAGNI FAIL**
- **I3** — VS Code/Cursor/Windsurf 터미널 fullscreen 스크롤 민감도 (LOW)
- **I4** — Thinking spinner 인라인 진행률 (LOW, v2.1.109/107 패턴 흡수)
- **I5** — `/config` 검색이 옵션 값 매칭 (LOW)
- **I6** — `/doctor`를 Claude 응답 중에도 열림 (LOW)
- **I7 — `/reload-plugins` + bg auto-update가 누락 plugin deps 자동 설치** (MEDIUM, bkit self-contained 무영향)
- **I8 — `gh` API rate-limit 힌트 표시 → agent backoff 유도** (MEDIUM, 자동 수혜)
  - ENH-262 **P3** `cc-version-researcher`, `pm-research` description 주석
- **I9** — Settings Usage tab 5h/주간 사용량 즉시 표시 (LOW)
- **I10** — Slash command menu "No commands match" 표시 (LOW)

### Security

- **S1 — Sandbox auto-allow가 `rm`/`rmdir`의 `/`, `$HOME`, critical dirs에 대해 dangerous-path check bypass 금지** (**HIGH**)
  - v2.1.113 #23 (`dangerouslyDisableSandbox` bypass fix)와 연속 보안 강화
  - bkit `scripts/config-change-handler.js:17-24` `DANGEROUS_PATTERNS` 5항목 (dangerouslyDisableSandbox, excludedCommands, autoAllowBashIfSandboxed, chmod 777, allowRead)와 **서로 다른 표면적 방어** (defense-in-depth)
  - → **ENH-254 P0** 이중 방어선 공식 문서화

### Fixes

- **B1** — Devanagari/Indic 문자 컬럼 정렬 (LOW)
- **B2** — Ctrl+- undo in Kitty keyboard protocol terminals (LOW)
- **B3** — Cmd+Left/Right in Kitty protocol (LOW)
- **B4 — Ctrl+Z terminal hang via `npx`/`bun run` wrapper** (MEDIUM, 자동 수혜)
  - ENH-261 **P3** (P2→P3 강등) README Troubleshooting 가이드
- **B5** — Inline mode scrollback 중복 (LOW)
- **B6** — Modal search dialog overflow (LOW)
- **B7** — VS Code integrated terminal blank cells (LOW)
- **B8 — 간헐적 API 400 cache control TTL ordering fix** (MEDIUM, 자동 수혜)
  - CTO Team 12명 병렬 spawn 안정화, ENH-215 1H caching 투자 보조
- **B9 — `/branch` 50MB+ transcript 허용** (MEDIUM, 자동 수혜)
- **B10 — `/resume` 대형 세션 empty conversation → load error 보고** (**HIGH**, 자동 수혜)
  - 장기 PDCA 세션 복원 데이터 무결성 회복
- **B11** — `/plugin` Installed tab 중복 표시 (LOW)
- **B12 — worktree 중 `/update`, `/tui` 미작동 fix** (MEDIUM)
  - ENH-258 **P1** ENH-231 `/tui` ANSI 호환 재검증 트리거

---

## bkit 영향 요약

| 카테고리 | 건수 |
|---------|------|
| Breaking | **0** |
| HIGH 영향 | 3 (I1, S1, B10) |
| MEDIUM 영향 | 8 (F1, I2, I7, I8, B4, B8, B9, B12) |
| LOW 영향 | 13 |
| ENH 대상 | **9** (ENH-253~263, 256/257 YAGNI FAIL 기록) |
| YAGNI FAIL | 5 (ENH-256 F1, ENH-257 I2, I7, #51021, MON-CC-07) |
| 신규 TC | 2 (L3 ENH-253, L2 ENH-258) |

---

## 실측 중 발견된 Docs=Code 위반

**3중 오기** (ENH-263 정정 대상):

| 소스 | 기록값 | 실제 (Glob) |
|------|--------|------------|
| `.claude-plugin/plugin.json` description | "38 Skills, 36 Agents, 21 Hook Events" | **39 Skills, 36 Agents**, 21 Hook Events |
| `memory/MEMORY.md` Project Context "Architecture" | "36 Skills, 31 Agents" | **39 Skills, 36 Agents** |
| `memory/MEMORY.md` Key Architecture Decisions | "37 Skills, 32 Agents" | **39 Skills, 36 Agents** |

ENH-241 Docs=Code 교차 검증 스킴의 첫 실적용 사례. 3 소스 일괄 정정 필요.

---

## GitHub Issues 스냅샷 (2026-04-21 기준)

### OPEN 유지 (v2.1.116 미해결)

- **#47855** MON-CC-02 — Opus 1M `/compact` block (v2.1.113 #32 fix 후 추가 활동 없음, reporter duplicate 반박)
- **#47482** ENH-214 — Output styles YAML frontmatter 미주입 (**8 릴리스 연속 OPEN**)
- **#47828** — SessionStart systemMessage + remoteControl (**6 릴리스 연속 OPEN**, bkit 미사용)
- **#50952** — Opus 4.7 `docker rm` destructive (S1은 `/`/$HOME 전용, docker 미커버)

### MON-CC-06 확장: 10 → 16건

**v2.1.113 시점 10건**: #50274, #50383, #50384(API 응답 실패 재조사 필요), #50541, #50567, #50609, #50616, #50618, #50640, #50852

**v2.1.114~v2.1.116 신규 편입 6건**:
- **#51165** (HIGH) — `context:fork` + `disable-model-invocation` 실패 (ENH-253 P0 대상)
- **#51234** (HIGH) — `~/.claude/skills/` first-run 삭제 (ENH-259 P1 대상)
- **#51266** (HIGH) — `vendor/ripgrep` 미생성 (`ignore-scripts=true`)
- **#51275** (HIGH) — Windows EEXIST on every API call
- **#51391** (HIGH) — 병렬 read 데이터 스왑 (MON-CC-07 대신 MON-CC-06 통합)
- **#50974** (HIGH) — v2.1.112+ npm postinstall 미완료

### 장기 OPEN stale (v2.1.116에서 변동 없음)

- #29423 (subagents CLAUDE.md ignore), #34197 (CLAUDE.md ignored), #36059 (PreToolUse regression, bkit 미영향)
- #37520 (**병렬 agent OAuth 401**, CTO Team 직접 영향), #37745 (PreToolUse skip-permissions 리셋)
- #40506 (PreToolUse hooks -p mode 미작동), #40502 (**bg agents write 불가**, CTO Team 영향)
- #41930 (**광범위 비정상 사용량 소진**, 2026-04-20 최근 댓글, 96 comments)

---

## 결론

- **CC 추천 버전**: v2.1.114 → **v2.1.116** 승격 (2026-04-21)
- **연속 호환**: 73 → **74** (조건부, v2.1.115 스킵 포함)
- **Breaking**: 0건
- **bkit 버전**: v2.1.8 → **v2.1.10** (P0 2건 + P1 2건 + P2 2건 반영)
- **총 공수**: **11.5 ~ 12.5h** (P0 3.5~4.5h + P1 3.5h + P2 3.5h + P3 1h)

---

## 관련 파일

- `docs/04-report/features/cc-v2114-v2116-impact-analysis.report.md`
- `docs/01-plan/features/cc-v2114-v2116-impact-analysis.plan.md`
- `memory/cc_version_history_v2113_v2114.md` (선행 분석)
- `memory/cc_version_history_v2134_v2172.md` (초기 분석)
