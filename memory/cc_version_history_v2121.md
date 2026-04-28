# CC Version History v2.1.121 (ADR 0003 두 번째 정식 적용)

> **Analysis Date**: 2026-04-28
> **Analyst**: cc-version-analysis (Phase 1 cc-version-researcher + Phase 2 bkit-impact-analyst + Phase 3 inline Plan Plus + Phase 4 inline 보고서)
> **Source Report**: `docs/04-report/features/cc-v2120-v2121-impact-analysis.report.md`
> **ADR**: `docs/adr/0003-cc-version-impact-empirical-validation.md` (두 번째 정식 적용)
> **Previous memory**: `memory/cc_version_history_v2120.md`

---

## v2.1.121 (2026-04-28 publish, release tag 정상 게시)

**38 bullets** (Features 14 + Improvements 6 + Fixes 19, Security 0, Breaking 0) + 외부 commit 1 (Sec1-121 GHA #43824)

### 발행 상태 (E0 Risk)

- npm publish 완료: 2026-04-27 후반 ~ 2026-04-28 초반 (정확 시각 ±수시간, R-4)
- GitHub CHANGELOG: commit `1586204` (2026-04-28T00:31:24Z, +67 lines, v2.1.120 + v2.1.121 동시 추가)
- GitHub Release tag: **v2.1.121 정상 게시** (2026-04-28T00:31:31Z, CHANGELOG commit과 7초 차)
- v2.1.120 release tag: **영구 누락** (R-1, releases API에서 v2.1.119 → v2.1.121 직행)
- 분석 기준: `1586204` snapshot

### HIGH Impact 변경 (실증 상태 병기)

| # | 분류 | 설명 | CC 심각도 | **bkit 실증 상태 (E5)** |
|---|------|------|:--------:|:---------------------:|
| **F4-121** | Feature | PostToolUse `hookSpecificOutput.updatedToolOutput` 전 도구 확장 | HIGH | **SPECULATIVE → CAND-003 P2 spike** (audit-logger 통합 기회) |
| **F9-121** | Feature | `--dangerously-skip-permissions` `.claude/skills|agents|commands/` 권한 완화 | HIGH | **CONFIRMED 무영향** (Layer 분리 정밀 검증) |
| **I4-121** | Improvement | OTEL `stop_reason` + `finish_reasons` + `user_system_prompt` | HIGH | **CONFIRMED auto-benefit + CAND-004 P1** (Sprint δ FR-δ4) |
| **B1-121** | Fix | multi-image multi-GB RSS 누수 fix | HIGH | **CONFIRMED auto-benefit** |
| **B2-121** | Fix | `/usage` ~2GB 누수 fix (large transcripts) | HIGH | **CONFIRMED auto-benefit** (kay 24일+ 세션 직접 수혜) |
| **B4-121** | Fix | Bash dir delete/move 영구 사용 불가 fix | HIGH | **CONFIRMED auto-benefit** (CTO Team worktree workflow) |

### F9-120 closure 후속 검증 (2 릴리스 연속 PASS) ⭐

```bash
$ claude --version
2.1.121 (Claude Code)

$ claude plugin validate .
✔ Validation passed
[Exit: 0]
```

- v2.1.120 ADR 0003 첫 사이클 발견 항목 → v2.1.121에서도 안정 유지
- CC F9-120 fix가 **2 릴리스 연속 안정화 입증**
- ADR 0003 §7.4 미완료 체크리스트 자동 closure
- ADR 0003 가치 강화: "False alarm 차단" + "잠재 결함 능동 발견" + **"fix 지속 안정화 입증"**

### F9-121 정밀 검증 — Layer 분리 (F1-119 false alarm 학습 적용)

| Layer | 책임 | F9-121 영향 영역 | bkit 방어 |
|-------|------|----------------|-----------|
| Layer 0 (CC 내장) | `--dangerously-skip-permissions` prompt | `.claude/skills|agents|commands/` write prompt 생략 | 없음 |
| Layer 1 | `PermissionRequest` Hook | bkit `permission-request-handler.js:43-47` SAFE_WRITE_DIRS | `docs/`, `.bkit/`만 — `.claude/` 미포함 (분리) |
| Layer 2 | `PreToolUse` Hook | `pre-write.js`, `unified-bash-pre.js` | 독립 동작 |
| Layer 3 | audit-logger | 모든 path 기록 | 독립 |
| Layer 4 | Token Ledger NDJSON | 모든 호출 기록 | 독립 |

**최종 판정**: **무영향 확정** — bkit hook 정의 SoT (`hooks/hooks.json`)는 F9-121 영향권 외부.

### MEDIUM/LOW (간략)

- F1-121 MCP `alwaysLoad` (CAND-005 P2 spike)
- F2-121 `claude plugin prune` (P3 관찰)
- F8-121 `CLAUDE_CODE_FORK_SUBAGENT=1` SDK 비대화형 (CAND-006 P2 검증)
- F11-121 MCP startup transient retry 3회 (auto-benefit)
- B9-121 tmux scrollback fix (#52309 매핑 후보)
- B19-121 find peak FD 감소 (B12-120 후속 auto-benefit)
- B15-121 settings.json invalid enum fix (auto-benefit)
- B18-121 grep/find/rg deleted binary fallback (auto-benefit)

---

## bkit 영향 요약 (ADR 0003 두 번째 적용 통과)

| 카테고리 | 건수 |
|---------|:---:|
| CONFIRMED 크리티컬 회귀 | **0** |
| CONFIRMED auto-benefit | 6 (B1, B2, B4, F11, B19, F9-120 closure) |
| 무영향 확정 (정밀 검증) | 1 (F9-121 Layer 분리) |
| 잠재 결함 자동 해소 (신규) | 0 (v2.1.121 자체) |
| F9-120 지속 해소 (실증) | **1 (2 릴리스 연속 PASS)** |
| SPECULATIVE/CONFIRMED 신규 기회 | 5 CAND |
| YAGNI FAIL DROP | 0 |
| Breaking Changes | **0 (확정)** |
| 연속 호환 릴리스 | 78 → **79** |

**ENH 번호 상태**: ADR 0003 §6.2 준수 — 분석 단계 미할당. 후보 ID:
- **CAND-003**: F4-121 PostToolUse `updatedToolOutput` audit-logger 통합 (P2 spike, v2.1.12)
- **CAND-004**: I4-121 + F8-119 + I6-119 OTEL 3 누적 (P1, **v2.1.11 Sprint δ FR-δ4 묶음**)
- **CAND-005**: F1-121 MCP `alwaysLoad` (P2 spike, v2.1.12 측정 1주)
- **CAND-006**: F8-121 SDK fork 검증 (P2 1회, v2.1.12)
- **CAND-007**: R-3 "safety hooks 무시" 시리즈 응답 (P3 모니터, MON-CC-NEW 2주)

---

## v2.1.12 Carryover (누적 8건)

| 출처 | ID | 상태 | 통합 대상 |
|------|----|------|----------|
| v2.1.118 | I1-118 `$defaults` | P3 관찰 | CC spec 명문화 후 |
| v2.1.119 | F5-119 `--print tools:` | UNVERIFIED | 유관 issue 발생 시 |
| v2.1.119 | B24-119 Auto-compaction | Sprint γ FR-γ1 | 측정 |
| v2.1.120 | CAND-001 ultrareview | P3 관찰 | 사용 사례 축적 |
| v2.1.120 | CAND-002 `${CLAUDE_EFFORT}` | P2 spike | 1 skill |
| **v2.1.121** | **CAND-003** F4-121 PostToolUse | **P2 spike** | audit-logger 1 hook |
| **v2.1.121** | **CAND-005** F1-121 alwaysLoad | **P2 spike** | 측정 1주 |
| **v2.1.121** | **CAND-006** F8-121 SDK fork | **P2 검증** | 1회 실험 |
| **v2.1.121** | **CAND-007** R-3 safety hooks | **P3 모니터** | MON-CC-NEW 2주 |

**Closed**:
- F8-119 + I6-119 → CAND-004 (Sprint δ FR-δ4) 승급, carryover 종료
- F9-120 marketplace.json → 2 릴리스 연속 PASS, **closure 완료**

---

## GitHub Issues 스냅샷 (2026-04-28 기준)

### 장기 OPEN 지속 (1 릴리스 추가 경과)

- #47482 Output styles YAML frontmatter: **15 릴리스 OPEN** (+1)
- #47855 Opus 1M `/compact` block (MON-CC-02): **16 릴리스 OPEN** (+1)
- #51798 PreToolUse + dangerouslyDisableSandbox: **6 릴리스 OPEN** (+1, F9-121 인접 미해소)

### 상태 변경 (행정 처리)

- #51801 bypassPermissions + `.claude/` write: 5 OPEN → **CLOSED (duplicate, 2026-04-25T09:21:36Z)** ⭐
- #51809 Sonnet per-turn 6~8k tokens: 5 OPEN → **CLOSED (duplicate, 2026-04-25T09:21:33Z)** ⭐

**중요**: 위 2건은 수정 fix 아닌 행정 처리. bkit 방어 코드는 본 목적(ENH-263, token-ledger 측정)으로 유지.

### MON-CC-06 (24건 → 24~25건)

- B9-121 tmux scrollback fix ↔ #52309 매핑 후보 (Phase 2 실측 권고, 미확정)
- 신규 등록 후보: #54127 cap drop ~2x (HIGH, has repro), #54135 NodeJS NVM Path (MEDIUM)
- 슈퍼이슈 그룹화: "Claude ignores safety hooks" 시리즈 8건 (#54129~#54041) → **MON-CC-NEW 별도 추적**

---

## 결론

- **CC 추천 버전**: **v2.1.121로 승격** (release tag 정상 게시 완료, F9-120 closure 안정 입증, ADR 0003 두 번째 적용 통과)
- **연속 호환**: 78 → **79** (Breaking 0 확정)
- **bkit 버전**: v2.1.10 유지 (hotfix 불필요)
- **v2.1.11**: 기존 integrated enhancement 범위 + **CAND-004 Sprint δ FR-δ4 묶음 확장** (신규 FR 발급 불요, 기존 묶음에 I4-121 통합)
- **v2.1.12**: 누적 carryover 8건 통합 (Sprint γ + spike 4건 + 모니터 1건)
- **ADR 0003 두 번째 적용 결과**: (a) HIGH 6건 모두 적절 게이트 처리, (b) F9-120 closure 2 릴리스 연속 입증 (프로세스 가치 강화), (c) F9-121 정밀 검증 → Layer 분리 무영향 확정 (F1-119 학습 적용 첫 사례), (d) R-3 SPECULATIVE 게이트 보류 결정 (MON-CC-NEW 등록)

---

## 관련 파일

- 보고서: `docs/04-report/features/cc-v2120-v2121-impact-analysis.report.md` (Final 2026-04-28)
- ADR: `docs/adr/0003-cc-version-impact-empirical-validation.md`
- 이전 memory: `memory/cc_version_history_v2120.md` (v2.1.120, ADR 0003 첫 적용)
- v2.1.117~119 memory: `memory/cc_version_history_v2117_v2119.md`
- 모니터링: `docs/reference/cc-issue-monitoring.md`
- bkit 권한 방어 (F9-121 정밀 검증): `scripts/permission-request-handler.js:43-47`
- bkit OTEL sink (CAND-004 통합 대상): `lib/infra/telemetry.js:165-228`
- bkit hooks SoT: `hooks/hooks.json`
- bkit marketplace SoT (F9-120 closure): `.claude-plugin/marketplace.json`
