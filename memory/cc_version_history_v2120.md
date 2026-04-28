# CC Version History v2.1.120 (ADR 0003 첫 정식 적용)

> **Analysis Date**: 2026-04-25
> **Analyst**: Single-pass cc-version-analysis (Phase 1 cc-version-researcher + inline Phase 1.5/2/3/4)
> **Source Report**: `docs/04-report/features/cc-v2119-v2120-impact-analysis.report.md`
> **ADR**: `docs/adr/0003-cc-version-impact-empirical-validation.md` (첫 정식 적용 사례)
> **Previous memory**: `memory/cc_version_history_v2117_v2119.md`

---

## v2.1.120 (2026-04-24 publish, CHANGELOG add → revert 동일자)

**22 bullets** (Features 9 + Improvements 1 + Fixes 12, Security 0, Breaking 0)

### 발행 상태 (E0 Risk)

- npm publish 완료: 2026-04-24T23:02:49 UTC (`@anthropic-ai/claude-code@2.1.120`)
- GitHub CHANGELOG: commit `c393344`(2026-04-25) ADD → `7e93645`(2026-04-25) REVERT
- GitHub Release tag: 미생성 (latest tag = v2.1.119)
- 분석 기준: `c393344` snapshot

### HIGH Impact 변경 (실증 상태 병기)

| # | 분류 | 설명 | CC 심각도 | **bkit 실증 상태 (E5)** |
|---|------|------|:--------:|:---------------------:|
| F2-120 | Feature | `claude ultrareview [target]` 비대화형 subcommand | HIGH | **SPECULATIVE** (신규 통합 기회 → P3 관찰) |
| F3-120 | Feature | Skills `${CLAUDE_EFFORT}` 변수 치환 | HIGH | **SPECULATIVE** (신규 동작 분기 기회 → P2 조건부 spike) |
| **F9-120** | Feature | `claude plugin validate` `$schema`/`version`/`description` root 허용 | HIGH | **CONFIRMED auto-benefit (잠재 결함 해소)** |
| **B1-120** | Fix | stdio MCP Esc 키 서버 연결 종료 회귀 (v2.1.105 도입) 수정 | HIGH | **CONFIRMED auto-benefit (2 MCP servers)** |
| **B4-120** | Fix | `DISABLE_TELEMETRY`/`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` enforcement | HIGH | **CONFIRMED no-impact** (bkit 미참조) |
| **B12-120** | Fix | Bash `find` file descriptor 고갈 host crash 수정 | HIGH | **CONFIRMED auto-benefit (간접)** |

### F9-120 실증 발견 (ADR 0003 적용 첫 성과)

```bash
$ claude --version  # v2.1.119
$ claude plugin validate .
✘ Found 1 error:
  ❯ root: Unrecognized keys: "$schema", "version", "description"
✘ Validation failed
```

- bkit `.claude-plugin/marketplace.json` 잠재 결함 (사전 인지 0)
- v2.1.120 F9-120 변경이 정확히 이 3 필드를 수용 → **자동 해소**
- ADR 0003 가치 명세 확장: "false alarm 차단" → "능동적 결함 발견"

### MEDIUM/LOW (간략)

- F1-120 PowerShell shell (Windows only) — macOS dev 무영향
- F4-120 AI_AGENT envvar 자동 설정 — bkit 미참조, 무영향
- F5~F8-120 UX 개선 (spinner/scroll/connector/auto mode docs)
- I1-120 auto mode 표시 정리 — bkit autoMode 미사용
- B2-120 `--resume` 후 `/rewind` 키 무반응 수정 (간접 UX)
- B3/B6/B7/B8/B10/B11-120 UX/cosmetic
- B5-120 auto mode false-positive 권한 프롬프트 수정 (간접)
- B9-120 `/plugin` marketplace graceful 처리 (bkit-marketplace 안정성)

---

## bkit 영향 요약 (ADR 0003 게이트 통과)

| 카테고리 | 건수 |
|---------|:---:|
| CONFIRMED 크리티컬 회귀 | **0** |
| CONFIRMED auto-benefit (정적/실측 검증) | 4 (F9-120, B1-120, B12-120 + B4 no-impact) |
| 잠재 결함 자동 해소 (사전 인지 0) | **1 (F9-120 marketplace.json)** |
| SPECULATIVE 신규 기회 (P2 max) | 2 (F2-120, F3-120) |
| YAGNI FAIL DROP | 0 |
| Breaking Changes | **0 (확정)** |
| 연속 호환 릴리스 | 77 → **78** |

**ENH 번호 상태**: ADR 0003 §6.2 준수 — 분석 단계 미할당. 후보 ID 사용:
- **CAND-001**: F2-120 `claude ultrareview` 통합 (P3 관찰, v2.1.12+)
- **CAND-002**: F3-120 `${CLAUDE_EFFORT}` skill spike (P2 조건부, v2.1.12)

---

## v2.1.12 Carryover (누적 7건)

| 출처 | ID | 상태 | 통합 대상 |
|------|----|------|----------|
| v2.1.118 | I1-118 `$defaults` | P3 관찰 | CC spec 명문화 후 재평가 |
| v2.1.119 | F5-119 `--print tools:` | UNVERIFIED | 유관 issue 발생 시 즉시 실증 |
| v2.1.119 | F8-119 PostToolUse `duration_ms` | SPECULATIVE | Sprint δ FR-δ4 통합 |
| v2.1.119 | I6-119 OTEL `tool_use_id` + `size` | SPECULATIVE | Sprint δ FR-δ4 통합 |
| v2.1.119 | B24-119 Auto-compaction skill 재실행 측정 | Auto-benefit + measurement | Sprint γ FR-γ1 |
| **v2.1.120** | **CAND-001** ultrareview 관찰 | SPECULATIVE | v2.1.12 사용 사례 축적 |
| **v2.1.120** | **CAND-002** ${CLAUDE_EFFORT} spike | SPECULATIVE | v2.1.12 spike 1 skill |

---

## GitHub Issues 스냅샷 (2026-04-25 기준)

### 장기 OPEN 지속 (1 릴리스 추가 경과)

- #47482 Output styles YAML frontmatter: **14 릴리스 OPEN** (+1)
- #47855 Opus 1M `/compact` block (MON-CC-02): **15 릴리스 OPEN** (+1)
- #51798 PreToolUse + dangerouslyDisableSandbox: **5 릴리스 OPEN** (+1)
- #51801 bypassPermissions + `.claude/` write: **5 릴리스 OPEN** (+1)
- #51809 Sonnet per-turn 6~8k tokens: **5 릴리스 OPEN** (+1)

### MON-CC-06 (24건 유지, +1 릴리스 경과)

| Issue | 제목 | Severity | Status |
|-------|------|:-----------:|:------:|
| #52657 | VS Code extension silent crash | HIGH | OPEN (2 릴리스) |
| #52309 | tmux terminal resize 출력 중복 | HIGH | OPEN (2 릴리스) |
| #52503 | Hebrew/RTL reversed | LOW | OPEN (2 릴리스) |
| #52552 | Bedrock 무응답 | MEDIUM | OPEN (2 릴리스) |
| #52291 | `renderToolResultMessage` TypeError | MEDIUM | OPEN (2 릴리스) |

**v2.1.120 공식 수정 (MON-CC-06 관련)**: **0건** — 모니터링 연속

---

## 결론

- **CC 추천 버전**: v2.1.119+ 유지 (CHANGELOG/release tag 정식 게시 후 v2.1.120+ 승격 검토)
- **연속 호환**: 77 → **78** (Breaking 0 확정)
- **bkit 버전**: v2.1.10 유지 (hotfix 불필요)
- **v2.1.11**: 기존 integrated enhancement 범위 그대로 진행
- **v2.1.12**: 누적 carryover 7건 통합 (Sprint γ/δ + 신규 spike CAND-002)
- **ADR 0003 적용 결과**: 첫 정식 적용 사이클에서 (a) HIGH 6건 모두 적절 게이트 처리, (b) 1건 실측 실행으로 잠재 결함 자동 해소 발견 — 프로세스 가치 입증

---

## 관련 파일

- 보고서: `docs/04-report/features/cc-v2119-v2120-impact-analysis.report.md` (Final 2026-04-25)
- ADR: `docs/adr/0003-cc-version-impact-empirical-validation.md`
- 이전 memory: `memory/cc_version_history_v2117_v2119.md` (v2.1.118 + v2.1.119)
- 모니터링: `docs/reference/cc-issue-monitoring.md`
