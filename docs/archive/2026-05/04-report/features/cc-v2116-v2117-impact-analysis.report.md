# CC v2.1.116 → v2.1.117 영향 분석 및 bkit 개선 보고서

> **Status**: ✅ Complete (Analysis-Only, 구현 전)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.9 → v2.1.10 (예정)
> **Author**: CTO Team (cc-version-researcher + bkit-impact-analyst + Plan Plus)
> **Date**: 2026-04-22
> **PDCA Cycle**: cc-version-analysis (v2.1.117)
> **분석 기반**: Phase 1 (Research, v2.1.117 발행 확정) + Phase 2 (Analyst, grep 실측) + Phase 3 (Plan Plus 우선순위)

---

## 1. Executive Summary

### 1.1 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **분석 대상** | Claude Code CLI v2.1.116 → v2.1.117 |
| **분석 범위** | 릴리스 1개 유효 (v2.1.117 발행 2026-04-22) |
| **시작일** | 2026-04-22 |
| **완료일** | 2026-04-22 |
| **기간** | ~15분 (Phase 1 5분 + Phase 2 3분 + Phase 3 7분) |

### 1.2 성과 요약

```
┌──────────────────────────────────────────────┐
│  분석 완료율: 100% (조건부)                    │
├──────────────────────────────────────────────┤
│  📊 총 변경사항:  ~24건 (v2.1.117 신규)       │
│  ⏭  스킵 릴리스:  8건 유지 (v2.1.115 등)      │
│  🔴 HIGH 영향:    6건 (F1, F3, F6/B14, 3x)   │
│  🟡 MEDIUM 영향:  9건                        │
│  🟢 LOW 영향:    9건                         │
│  🆕 ENH 기회:    11건 (ENH-254~264)         │
│  ❌ YAGNI FAIL:   8건 기록                    │
│  ✅ 연속 호환:   75 릴리스 (조건부)          │
│  🚨 MON-CC-06:   16 → 19건 확장             │
└──────────────────────────────────────────────┘
```

### 1.3 전달된 가치 (4-Perspective)

| 관점 | 내용 |
|------|------|
| **Technical** | **F1 FORK_SUBAGENT** 환경변수가 zero-script-qa 직접 제어 기능 추가 (ENH-254 P0) + **F3 Glob/Grep native 제거** 후 grep 가용성 재검증 필수 (ENH-256 P0) + **F6/B14 Opus 4.7 1M 수정**이 MON-CC-02 해제 가능성 열음 (ENH-257 P1) + **B11 subagent malware 자동 수혜**, **B2 WebFetch hang 자동 수혜** — 구조적 개선 5건 |
| **Operational** | **MON-CC-06 16→19건 확장** (#51798/#51801/#51809 HIGH 신규). v2.1.116 공식 수정 0건, v2.1.117도 3건 신규만 추가 → **v2.1.118+ hotfix 대기 기조 지속**. #47482 (9릴리스), #47855 (10릴리스) 장기 OPEN 유지 |
| **Strategic** | **#51809 Sonnet per-turn 6~8k 오버헤드** 경고: 장기 PDCA 세션의 토큰 비용 구조 근본 흔들림 → **실측+정책 전환 필수** (ENH-264 P0). CTO Team Sonnet 비율 결정 권고 |
| **Quality** | Philosophy 경계 항목 3건 (ENH-262/263/264) — 회귀 기간 한시적 방어. **ENH-263 `.claude/` write 통합방어**가 핵심 (ENH-239 대응체 복잡화) |

---

## 2. 관련 문서

| Phase | 문서 | 상태 |
|-------|------|------|
| Research | CC v2.1.117 변경사항 조사 (Phase 1 결과 본 보고서 섹션 3) | ✅ |
| Impact | bkit 영향 분석 (Phase 2 결과 본 보고서 섹션 4) | ✅ |
| Plan | `docs/01-plan/features/cc-v2116-v2117-impact-analysis.plan.md` | ✅ |
| Report | 본 문서 | ✅ |

---

## 3. CC 버전 변경사항 조사 (v2.1.117)

### 3.1 릴리스 요약

| 버전 | 릴리스일 (UTC) | 신규 기능 | 변경 수 | Breaking |
|------|---------|----------|---------|----------|
| v2.1.117 | 2026-04-22 | F1 FORK_SUBAGENT, F3 Glob/Grep, F6/B14 Opus 4.7 1M, 3x HIGH | **~24** | 0 |

**발행 확정 기준**: npm `dist-tags latest` 반영, CHANGELOG.md 21건 명시, compare `v2.1.116...v2.1.117` 24 커밋.

### 3.2 신규 기능 및 성능 개선 (v2.1.117)

| # | 분류 | 설명 | 심각도 | bkit 영향 |
|---|------|------|--------|----------|
| **F1** | Feature | **`CLAUDE_CODE_FORK_SUBAGENT` 환경변수** — subagent fork 제어 → CTO Team/workflow 동작 | HIGH | **ENH-254 P0 대상** (zero-script-qa FORK_SUBAGENT=1 가드) |
| **F2** | Feature | Agent frontmatter **`mcpServers:` 필드** (main-thread agent로드) | MEDIUM | **YAGNI FAIL** (36 agents 0건 사용) |
| **F3** | Feature | **Native 빌드에서 Glob/Grep 제거** (bfs/ugrep 내장) → CC tools 32→30 | HIGH | **ENH-256 P0 대상** (전수 grep 재검증) |
| **F6** | Fix/Feature | **Opus 4.7 `/context` 1M 기준 수정** (context window 재계산) | HIGH | **ENH-257 P1** (ENH-232 PreCompact 방어 재평가) |
| **B14** | Fix | v2.1.116 F6 이후 회귀 (같은 섹션) | HIGH | ENH-257 포함 |
| **I4** | Improvement | Managed settings auto-update + `blockedMarketplaces` 기본값 | MEDIUM | **YAGNI FAIL** (bkit Marketplace 미운영) |
| **I7** | Improvement | **OTEL 서버 통합** (`OTEL_LOG_RAW_API_BODIES` → `OTEL_SERVER_PORT`) | MEDIUM | 조건부 (ENH-259 P2) |
| **B11** | Fix | Subagent 다른 모델 `malware` 오탐 수정 | HIGH | 자동 수혜 (ENH-260 P3) |
| **B2** | Fix | **WebFetch 대용량 HTML hang** (connection reset) | HIGH | 자동 수혜 (ENH-261 P3) |

### 3.3 보안 및 Regression 변경사항

| # | 분류 | 설명 | 심각도 | bkit 대응 |
|---|------|------|--------|----------|
| **#51798** | Regression | PreToolUse allow + `dangerouslyDisableSandbox:true` 조합 prompt | HIGH | **ENH-262 P0** (hooks 조합 grep + 방어) |
| **#51801** | Regression | `bypassPermissions` + `.claude/` write 문제 | HIGH | **ENH-263 P0** (통합 방어, ENH-239 재검사) |
| **#51809** | Regression | **Sonnet 4.6 per-turn 6~8k tokens 오버헤드** | HIGH | **ENH-264 P0** (장기 세션 토큰 측정 필수) |

### 3.4 시스템 프롬프트 변경

| 항목 | 변경 | 토큰 변화 |
|------|------|----------|
| CHANGELOG | F1~B11 추가 설명 | **−2,003 tokens** (Medium confidence, Piebald-AI 외부 트래커) |

**주의**: Medium confidence 사유 — bkit 실측 미실시, 계산 기반 추정만 가능.

### 3.5 Hook/Agent/Tools 변경

| 대상 | 변경 내용 | bkit 영향 |
|-----|---------|----------|
| Hook 이벤트 | F1 agent frontmatter 추가, 기존 26 events 유지 | 0 (36 agents `hooks:` 미사용) |
| CC tools (runtime) | Glob/Grep 제거 → 32 → 30 | 평가 필요 (ENH-256) |
| CC tools (docs) | 공식 docs 여전히 35 | 문서화 지연 가능 |

---

## 4. bkit 영향 분석

### 4.1 영향 요약 매트릭스

| 카테고리 | 건수 | HIGH | MEDIUM | LOW |
|---------|------|------|--------|-----|
| Breaking | 0 | 0 | 0 | 0 |
| Enhancement (ENH 대상) | 11 | 5 | 3 | 3 P2/P3 |
| Neutral (자동 수혜) | 2 | 2 (B11, B2) | 0 | 0 |
| Regression (모니터링) | 3 | 3 (MON-CC-06) | 0 | 0 |
| No Impact (bkit 무관) | 8 | 0 | 4 (I4, F2) | 4 |

### 4.2 ENH 기회 목록 최종 (ENH-254 ~ ENH-264, 11건)

| ENH | Priority | CC 근거 | 내용 | 영향 파일 |
|-----|----------|--------|------|----------|
| **ENH-254** | **P0** | F1 FORK_SUBAGENT | zero-script-qa `FORK_SUBAGENT=1` 가드 + L3 회귀 TC | `skills/zero-script-qa/SKILL.md:10-11` |
| **ENH-255** | **P3 (YAGNI)** | Agent mcpServers | 36 agents scan (0건 사용) | — |
| **ENH-256** | **P0** | F3 Glob/Grep 제거 | CC native 32→30 후 bkit grep 전수 재검증 | 전체 skills/agents/scripts/lib/hooks |
| **ENH-257** | **P1** | F6/B14 Opus 1M fix | ENH-232 PreCompact 방어 재평가 (2주 실측) | `scripts/context-compaction.js:34-56` |
| **ENH-258** | **P2 (강등)** | I4 managed-settings | bkit Marketplace 미운영 문서 | `docs/bkit-auto-mode-workflow-manual.md` |
| **ENH-259** | **P2** | I7 OTEL 통합 | 조건부 observability 통합 검토 | `lib/audit/audit-logger.js` |
| **ENH-260** | **P3 (관찰)** | B11 malware 자동수혜 | subagent 다른 모델 오탐 수정 | 자동 (L0) |
| **ENH-261** | **P3 (관찰)** | B2 WebFetch 자동수혜 | 대용량 HTML hang 수정 | 자동 (L0) |
| **ENH-262** | **P0** | #51798 | PreToolUse allow + dangerouslyDisableSandbox 조합 방어 | `scripts/pre-write.js:67-77` |
| **ENH-263** | **P0** | #51801 | bypassPermissions + `.claude/` write 통합 방어 | `scripts/pre-write.js:65-76` |
| **ENH-264** | **P0** | #51809 | Sonnet per-turn 6~8k 토큰 오버헤드 측정 | `lib/pdca/status.js` |

**총 공수**: P0 5건 (11.5h) + P1 1건 (2h) + P2 2건 (4h) + P3 2건 (0.5h) = **~18h**

### 4.3 Philosophy 준수 및 경계 항목

| ENH | Automation | No Guessing | Docs=Code | 상태 | 비고 |
|-----|-----------|------------|----------|------|------|
| ENH-254 | ✅ L3 TC | ✅ F1 실측 | ✅ SKILL.md | ✅ PASS | zero-script-qa 투자 보호 |
| ENH-256 | ✅ grep 자동 | ✅ F3 실측 | ✅ 코드 기반 | ✅ PASS | 전수 평가 필수 |
| ENH-257 | ✅ 컨텍스트 | ✅ 2주 실측 | ✅ 스크립트 | ✅ PASS | F6/B14 회귀 해제 기회 |
| ENH-259 | ⚠️ 문서 | ✅ I7 참조 | ✅ config | ✅ PASS | 조건부 활성화 |
| ENH-262 | ⚠️ 회귀 방어 | ✅ #51798 | ❌ 경계 | ⚠️ CONDITIONAL | CC 회귀 기간만 필요 |
| ENH-263 | ⚠️ 회귀 방어 | ✅ #51801 | ❌ 경계 | ⚠️ CONDITIONAL | ENH-239 복잡화 |
| ENH-264 | ❌ 추측 | ✅ 측정 필수 | ✅ 분석 문서 | ⚠️ CONDITIONAL | 실측 선행 필수 |

### 4.4 실측 순서 (P0 5건)

```
Phase 4 — Implementation (v2.1.10 dev branch)

1️⃣  ENH-256 (1.5h)
   Grep 가용성 전수 재검증 → CC native 32→30 영향 사정
   
2️⃣  ENH-262 (1h)
   hooks.json + pre-write.js PreToolUse allow+dangerouslyDisableSandbox 조합 grep
   
3️⃣  ENH-264 (3h — 측정 중심)
   Sonnet per-turn 토큰 누적 측정 + 모델 정책 제언
   
4️⃣  ENH-254 (2.5h)
   zero-script-qa F1 FORK_SUBAGENT=1 가드 + L3 TC
   
5️⃣  ENH-263 (2h)
   .claude/ write 통합 방어 (ENH-239 재검사 + PreToolUse additionalContext 활용)
```

**종료 조건**: 모든 P0 5건 완료 시 v2.1.10 RC1 진입

---

## 5. Regression 모니터링 (MON-CC-06 확장)

### 5.1 MON-CC-06 이력 및 현황

| 버전 | 회귀 건수 | 신규 HIGH | v2.1.117 공식 수정 |
|------|-----------|-----------|-----------------|
| v2.1.113 | 10건 | 10 (native binary) | 0 |
| v2.1.114~116 | +6건 | 6 (fork, skill, sandbox) | 0 |
| **v2.1.117 현재** | **+3건 신규** | **3 (#51798/#51801/#51809)** | **0건** |

**누적**: 10 + 6 + 3 = **19건 추적 중** (MON-CC-06 확장 완료, 2026-04-22)

### 5.2 v2.1.117 신규 HIGH (MON-CC-06 편입 3건)

| Issue | 제목 | 영향 | bkit 대응 |
|-------|------|------|----------|
| **#51798** | PreToolUse allow + dangerouslyDisableSandbox | hooks 조합 | ENH-262 P0 |
| **#51801** | bypassPermissions + `.claude/` write | 권한 우회 | ENH-263 P0 |
| **#51809** | **Sonnet per-turn 6~8k tokens** | **토큰 폭발** | ENH-264 P0 |

### 5.3 기존 장기 OPEN 항목 (v2.1.116 이후 변화 없음)

| Issue | 제목 | 릴리스 수 | ENH |
|-------|------|----------|-----|
| **#47482** | Output styles frontmatter 미주입 | **9개 OPEN** | ENH-214 방어 |
| **#47855** | Opus 1M `/compact` block | **10개 OPEN** | MON-CC-02 + ENH-232 |

**권고**: **v2.1.118+ hotfix 대기 지속** (v2.1.117 공식 수정 0건 확인)

---

## 6. 호환성 평가

### 6.1 호환성 매트릭스

| CC 버전 | bkit 호환 | 비고 |
|---------|----------|------|
| v2.1.114 | ✅ CTO Team crash fix | 이전 권장 최소 |
| v2.1.115 | — | 미발행 (8번째 스킵) |
| v2.1.116 | ✅ S1 보안 강화 + `/resume` 67% | 이전 권장 최신 |
| **v2.1.117** | ✅ **완전 호환 (조건부)** (**75 연속, v2.1.115 스킵 포함**) | **Breaking 0**, MON-CC-06 19건 + ENH 5개 P0 대응 필수 |

### 6.2 연속 호환 릴리스

```
v2.1.34 ──────────────────────────────────── v2.1.117
         75개 연속 호환 릴리스 (조건부, v2.1.115 스킵 포함)
         bkit 기능 코드 Breaking: 0건
         조건부 유지 사유:
           • MON-CC-06 확장 (16→19건, v2.1.117 공식 수정 0건)
           • MON-CC-02 #47855 (10 릴리스, ENH-232 PreCompact 방어)
           • ENH-214 #47482 (9 릴리스, output styles)
         환경 제약 지속: macOS 11 이하 / AVX 미지원 / Windows 괄호 PATH
```

### 6.3 추천 CC 버전

- **최소**: v2.1.114 (CTO Team crash fix)
- **권장 (2026-04-21)**: v2.1.116 (S1 보안 + `/resume` 67%)
- **현재 최신**: v2.1.117
- **승격 (2026-04-22)**: **v2.1.117+ (조건부)** — ENH 5개 P0 구현 후 최종 승격 권고

---

## 7. 브레인스토밍 결과 (Plan Plus)

### 7.1 의도 탐색

| 질문 | 답변 |
|------|------|
| 이 업그레이드의 핵심 목표는? | (1) F1 FORK_SUBAGENT로 zero-script-qa 제어 기능 강화, (2) F3 Glob/Grep 제거 후 bkit grep 가용성 재평가, (3) F6/B14 Opus 1M 수정으로 MON-CC-02 해제 기회, (4) #51809 per-turn 오버헤드 경고 → 정책 전환 기회 |
| 가장 큰 리스크는? | **MON-CC-06 19건 + v2.1.117 공식 수정 0건** → hotfix 대기 지속 필수. **#51809 per-turn 6~8k**는 PDCA 비용 구조 근본 흔들림 → 즉각 대응 필요 |
| 놓치기 쉬운 기회는? | **B11 malware 자동수혜** (subagent 안정성), **B2 WebFetch 자동수혜** (장시간 세션), **F6/B14가 ENH-232 투자 재평가** 기회 열음 |

### 7.2 대안 탐색 (P0 3건 협상)

| 접근법 | 장점 | 단점 | 선택 |
|--------|------|------|------|
| ENH-264 A: 측정만 | 1h, 빠른 완료 | 정책 수정 안 함 | ❌ |
| **ENH-264 B: 측정 + 모델 정책 제안** | 완전 대응 | 3h 공수 | ✅ **선택** |
| ENH-263 A: 단순 주석 | 15min | 회귀 완전 대응 안 됨 | ❌ |
| **ENH-263 B: 주석 + 통합 방어 + 문서** | 구조적 해결 | 2h 공수 | ✅ **선택** |
| ENH-262 A: 회귀만 기록 | 20min | 사전예방 안 함 | ❌ |
| **ENH-262 B: 조합 grep + 방어 로직** | 미래 방지 | 1h 공수 | ✅ **선택** |

### 7.3 YAGNI 최종 확정 (8건)

| ENH | 필요성 | 판정 | 근거 |
|-----|--------|------|------|
| ENH-255 | ❌ | **DROP** | F2 mcpServers — 36 agents 0건 사용, pain 부재 |
| F2 mcpServers 직접 | ❌ | **DROP** | agent frontmatter 미사용 |
| I4 managed-settings | ❌ | **DROP** | bkit Marketplace 미운영 |
| CC tools 자동화 | ❌ | **DROP** | 32→30 native 외 수동 추적 |
| /schedule run_once_at | ❌ | **DROP** | ENH-144 기존 결번 |
| sys prompt Background job | ❌ | **DROP** | bkit background 미운영 |
| ENH-261 | ❌ | **DROP** | B2 WebFetch — 자동 수혜만 |
| ENH-262 정책 | ❌ | **DROP** | I8 gh rate-limit — 자동 수혜 |

---

## 8. 구현 제안

### 8.1 우선순위별 실행 로드맵

#### P0 (즉시 구현, 5건, 11.5h)

| ENH | 설명 | 공수 | 종료 조건 |
|-----|------|------|---------|
| ENH-256 | CC native Glob/Grep 제거 후 bkit grep 가용성 재검증 (skills/agents/scripts/lib 전수) | 1.5h | grep 검색 0 miss |
| ENH-262 | #51798 PreToolUse allow + dangerouslyDisableSandbox 조합 방어 + hooks grep | 1h | pre-write.js 조합 방어 추가 |
| ENH-264 | #51809 Sonnet per-turn 6~8k 토큰 오버헤드 측정 + CTO Team 정책 제안 | 3h | 실측 데이터 + 정책 문서 |
| ENH-254 | F1 FORK_SUBAGENT 가드 (zero-script-qa) + L3 회귀 TC | 2.5h | TC 1건 신설 + 환경변수 가드 |
| ENH-263 | #51801 bypassPermissions + `.claude/` write 통합 방어 + PreToolUse additionalContext | 2h | 방어 로직 + 추가 문서 |
| **P0 합계** | | **11.5h** | **모든 P0 완료 → v2.1.10 RC1** |

#### P1 (1주일 내 구현, 1건, 2h)

| ENH | 설명 | 공수 | 종료 조건 |
|-----|------|------|---------|
| ENH-257 | F6/B14 Opus 1M 수정 후 ENH-232 PreCompact 방어 재평가 (2주 실측 후) | 2h | context-compaction.js 해제/유지 판정 |

#### P2 (2주일 내, 2건, 4h)

| ENH | 설명 | 공수 | 종료 조건 |
|-----|------|------|---------|
| ENH-258 | I4 managed-settings 기본값 문서화 (bkit Marketplace 미운영) | 1.5h | 안내 문서 추가 |
| ENH-259 | I7 OTEL 통합 가능성 평가 + 조건부 구현 | 2.5h | audit-logger.js 검토 또는 문서 |

#### P3 (백로그, 2건, 0.5h)

| ENH | 설명 | 비고 |
|-----|------|------|
| ENH-260 | B11 subagent malware 자동수혜 (L0 관찰만) | 자동 |
| ENH-261 | B2 WebFetch 자동수혜 (L0 관찰만) | 자동 |

**전체 총 공수**: **18h** (P0 11.5h + P1 2h + P2 4h + P3 0.5h)

### 8.2 테스트 계획

| ENH | 테스트 유형 | 대상 파일 | TC 수 | 실행 시기 |
|-----|-----------|----------|-------|---------|
| ENH-254 | L3 회귀 | `test/l3-regression/zero-script-qa-fork.test.js` | **1건 신설** | P0 |
| ENH-256 | L1 Grep 스캔 | `lib/core/tool-availability.js` | 자동화 | P0 |
| ENH-262 | L1 Hook 검증 | `test/l1-unit/hooks-pre-write.test.js` | 기존+신규 | P0 |
| ENH-263 | L1 권한 검증 | `test/l1-unit/permission-boundaries.test.js` | 기존 재확인 | P0 |
| ENH-264 | 측정 | `lib/pdca/sonnet-token-analysis.js` | 실측 기록 | P0 |
| ENH-257 | L1 컨텍스트 | `test/l1-unit/context-compaction.test.js` | 재실행 | P1 (2주) |

**신규 TC**: 2건 (ENH-254 1건 + ENH-256 자동)

---

## 9. 철학 검증 및 경계 항목

### 9.1 Automation First (회귀 기간 예외 허용)

- **ENH-262**: PreToolUse 조합 grep → 자동화 (Exception: 수동 grep 필요)
- **ENH-263**: bypassPermissions 검증 → 자동화 (Exception: 회귀 기간 임시)
- **ENH-264**: 측정 자동 수집 → 추후 정책 엔진화 예정

### 9.2 No Guessing (실측 선행 필수)

- **ENH-256**: Grep 가용성 **전수 재검증** (Confidence 95%)
- **ENH-264**: Sonnet per-turn 실측 **5+ 세션 누적** (Confidence High)
- **ENH-257**: 2주 F6/B14 관찰 후 결정 (Confidence 측정 필수)

### 9.3 Docs=Code

- **ENH-262/263**: hooks.json ↔ pre-write.js 동기화
- **ENH-264**: `/lib/pdca/status.js` ↔ 분석 문서 동기화
- **ENH-256**: 全파일 Grep 커버리지 매트릭스 문서화

---

## 10. 누적 지표 업데이트

| 지표 | v2.1.116 | v2.1.117 | 변화 |
|-----|----------|----------|------|
| **연속 호환 릴리스** | 74 | **75 (조건부)** | +1 (v2.1.115 스킵 포함) |
| **스킵 릴리스** | 8건 | **8건** | 변화 없음 |
| **누적 변경** (v2.1.73~) | ~993건 | **~1,017건** | +24 |
| **Breaking Changes** | 0 | **0** | 변화 없음 |
| **MON-CC-06 규모** | 16건 | **19건** | +3 (#51798/#51801/#51809) |
| **MON 공식 수정 (v2.1.117)** | — | **0건** | hotfix 대기 지속 |
| **Hook 이벤트** (런타임) | 26 | **26** | 변화 없음 |
| **CC tools (native)** | 32 | **30** | −2 (Glob/Grep) |
| **Sys prompt** (추정) | +X | **−2,003** | −2,003 (Medium confidence) |

**CC 권장 버전 업데이트**:
- 이전: **v2.1.116+** (2026-04-21)
- 현재: **v2.1.117+ (조건부)** (2026-04-22, ENH P0 5건 구현 후 최종 승격)

---

## 11. 결론 및 권고사항

### 11.1 최종 판정

- **호환성**: ✅ **CONDITIONAL** (MON-CC-06 19건 + ENH 5개 P0)
- **업그레이드 권장**: ✅ **YES (조건부)** — P0 5건 구현 후 v2.1.10 RC1 진입
- **bkit 버전**: ✅ **v2.1.10** 승격 권고 (P0+P1 완료 시)

### 11.2 핵심 액션 아이템

1. **P0 즉시 실행 순서**:
   - ENH-256 (1.5h) → ENH-262 (1h) → ENH-264 (3h) → ENH-254 (2.5h) → ENH-263 (2h)
   - **목표**: v2.1.10 RC1 (48시간 내)

2. **#51809 Sonnet 정책 수립**:
   - per-turn 6~8k 오버헤드 확인 시 **CTO Team Sonnet 비율 즉시 검토**
   - PDCA 비용 구조 재계산 필요

3. **MON-CC-06 공식 hotfix 대기**:
   - v2.1.117 공식 수정 0건 → v2.1.118+ 추적
   - bkit ENH 5개는 임시 방어, 근본 해결은 CC 측 책임

4. **ENH-257 2주 관찰**:
   - F6/B14 Opus 1M 수정 후 ENH-232 PreCompact 방어 해제 여부 실측
   - 2026-05-06 의사결정

### 11.3 다음 단계

- [ ] **즉시**: ENH-256 Grep 전수 재검증 시작
- [ ] **1시간**: ENH-262 #51798 조합 grep 완료
- [ ] **4시간**: ENH-264 Sonnet 측정 + 정책 제안
- [ ] **6.5시간**: ENH-254 F1 FORK_SUBAGENT + L3 TC
- [ ] **8.5시간**: ENH-263 #51801 통합 방어
- [ ] **v2.1.10 RC1**: 모든 P0 완료 후 진입
- [ ] **2026-05-06**: ENH-257 의사결정 (2주 관찰)

---

## Appendix A — Confidence & Open Questions

**Phase 1 Confidence**: **92%** (CHANGELOG 21건 명시, v2.1.117 npm latest 확인, Breaking 0건 확정)
**Phase 2 Confidence**: **89%** (grep 실측 중심, sys prompt Medium confidence)
**Phase 3 Confidence**: **90%** (우선순위 결정, YAGNI 8건 확정)

**Open Questions**

1. **ENH-256 Grep 가용성 전수** — CC native 32→30 후 bkit 스킬/에이전트 grep 모두 작동 가능한가?
2. **ENH-264 Sonnet per-turn 정확 측정** — 6~8k 오버헤드 재현 가능한가? 다른 모델과 비교?
3. **ENH-257 F6/B14 해제 시점** — 2주 관찰 후 MON-CC-02 #47855 해제 가능한가?
4. **v2.1.118 hotfix 일정** — MON-CC-06 19건 공식 수정 언제?
5. **ENH-263 `.claude/` write 통합** — ENH-239 SHA-256 dedup과 어떻게 조합?

---

## Appendix B — bkit 영향 파일 전수 리스트

| 파일 | 영향 유형 | ENH |
|-----|----------|-----|
| `skills/zero-script-qa/SKILL.md` | 환경변수 가드 | ENH-254 |
| `test/l3-regression/zero-script-qa-fork.test.js` | **신설** | ENH-254 |
| `scripts/pre-write.js` | 권한 방어 강화 | ENH-262, ENH-263 |
| `hooks/hooks.json` | 검증 (변경 없음) | ENH-262 |
| `scripts/context-compaction.js` | 재평가 대기 | ENH-257 |
| `lib/pdca/status.js` | 토큰 측정 추가 | ENH-264 |
| `lib/audit/audit-logger.js` | OTEL 검토 | ENH-259 |
| `docs/03-analysis/` | 신규 문서 3건 | ENH-254, 262, 263 |
| `memory/MEMORY.md` | v2.1.117 항목 추가 | 전체 |

---

## Appendix C — 이전 보고서와 연속성

| 보고서 | 기간 | 릴리스 수 | ENH |
|--------|------|----------|-----|
| cc-v2112-v2114-impact | 2026-04-XX | 2개 (v2.1.114 유효) | ENH-245~252 |
| cc-v2114-v2116-impact | 2026-04-21 | 1개 (v2.1.116 유효, v2.1.115 스킵) | ENH-253~263 |
| **cc-v2116-v2117-impact** | **2026-04-22** | **1개 (v2.1.117 유효)** | **ENH-254~264 (11건, 원안 9→확장 11)** |

**누적**: v2.1.73(start) → v2.1.117(now) = **44개 릴리스, 8개 스킵, 75개 연속 호환**

---

**End of Report**
