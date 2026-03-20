# Claude Code v2.1.79 영향 분석 보고서

> **Status**: ✅ Complete (Analysis Only)
>
> **Project**: bkit Vibecoding Kit
> **Version**: v1.6.2 (변경 없음)
> **Author**: CC Version Analysis Workflow
> **Completion Date**: 2026-03-19
> **PDCA Cycle**: #18

---

## Executive Summary

### 1.1 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **기능** | Claude Code v2.1.79 (1개 릴리스, ~18건 변경) 영향 분석 |
| **시작일** | 2026-03-19 |
| **완료일** | 2026-03-19 |
| **기간** | 1일 (분석만) |

### 1.2 성과 요약

```
┌──────────────────────────────────────────────┐
│  호환성: ✅ 100% 호환                         │
├──────────────────────────────────────────────┤
│  ✅ 변경사항:    18건 분석 완료               │
│  ✅ Breaking:   0건                          │
│  ✅ 호환성:     45 연속 호환 릴리스 확인      │
│  📋 ENH 기회:   3건 (ENH-131~133)            │
│  ⚠️  신규 모니터링: #36059 (hook regression)  │
└──────────────────────────────────────────────┘
```

### 1.3 전달된 가치

| 관점 | 내용 |
|------|------|
| **문제** | CC v2.1.79 릴리스의 ~18건 변경사항 중 bkit 영향 범위 확인 필요 |
| **해결 방법** | 4-Phase 워크플로우 (Research → Analyze → Brainstorm → Report) 자동 분석 |
| **기능/UX 효과** | /btw streaming fix 자동 혜택, PLUGIN_SEED_DIR multi-dir 지원 확인, SessionEnd /resume fix 확인 |
| **핵심 가치** | 45번째 연속 호환 릴리스 확인 (v2.1.34~v2.1.79, zero-downtime 업그레이드 보장) + bkit v1.6.2 코드 변경 불필요 |

---

## 2. CC v2.1.79 변경사항 전체 목록

**릴리스 일자**: 2026-03-18 (npm), 2026-03-18T22:29:36Z (GitHub)
**이전 버전**: v2.1.78 (2026-03-17)

### 2.1 변경사항 분류

| # | 분류 | 변경사항 | 영향도 | bkit 영향 |
|---|------|---------|--------|-----------|
| 1 | Feature | `--console` flag for `claude auth login` (API billing auth) | LOW | ❌ 없음 |
| 2 | Feature | "Show turn duration" toggle in `/config` | LOW | 📋 가이드 가능 |
| 3 | Fix | `claude -p` hanging without explicit stdin (subprocess) | MEDIUM | ❌ 없음 (bkit은 -p 미사용) |
| 4 | Fix | Ctrl+C not working in `-p` mode | MEDIUM | ❌ 없음 |
| 5 | Fix | `/btw` returning main agent output during streaming | **HIGH** | ✅ bkit /btw 스킬 직접 혜택 |
| 6 | Fix | Voice mode not activating on startup (`voiceEnabled: true`) | LOW | ❌ 없음 |
| 7 | Fix | Left/right arrow in `/permissions` navigation | LOW | ❌ 없음 |
| 8 | Fix | `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` not working on startup | LOW | ❌ 없음 |
| 9 | Fix | Custom status line blocked by workspace trust | MEDIUM | ⚠️ bkit statusline 간접 영향 |
| 10 | Fix | Enterprise users unable to retry on 429 errors | MEDIUM | ❌ 없음 (Enterprise 전용) |
| 11 | Fix | `SessionEnd` hooks not firing on `/resume` session switch | **HIGH** | ✅ 미래 SessionEnd hook 구현 시 혜택 |
| 12 | Perf | Startup memory usage improved ~18MB | MEDIUM | ✅ 전체 성능 혜택 |
| 13 | Perf | Non-streaming API fallback 2-min timeout | MEDIUM | ✅ 안정성 혜택 |
| 14 | Feature | `CLAUDE_CODE_PLUGIN_SEED_DIR` supports multiple directories | **HIGH** | 📋 ENH-131 (multi-plugin 지원) |
| 15 | Feature | [VSCode] `/remote-control` bridge to claude.ai/code | LOW | ❌ IDE 전용 |
| 16 | Feature | [VSCode] AI-generated session tab titles | LOW | ❌ IDE 전용 |
| 17 | Fix | [VSCode] Thinking pill text fix | LOW | ❌ IDE 전용 |
| 18 | Fix | [VSCode] Missing session diff button fix | LOW | ❌ IDE 전용 |

### 2.2 영향도 분포

```
HIGH:   3건 (#5, #11, #14) — bkit 직접 관련
MEDIUM: 5건 (#3, #4, #9, #10, #12, #13) — 간접 혜택
LOW:    10건 — bkit 무관
```

---

## 3. bkit 영향 분석

### 3.1 직접 영향 (코드 변경 불필요)

| 변경 | bkit 컴포넌트 | 영향 | 필요 조치 |
|------|--------------|------|-----------|
| /btw streaming fix (#5) | `skills/btw/SKILL.md` | /btw 스킬이 streaming 중 올바른 응답 반환 | 없음 (자동 혜택) |
| Startup memory -18MB (#12) | session-start.js | 전체 세션 성능 향상 | 없음 (자동 혜택) |
| Non-streaming timeout (#13) | 전체 | API hang 방지 | 없음 (자동 혜택) |
| Status line + trust fix (#9) | statusline 설정 | statusline 표시 정상화 | 없음 (자동 혜택) |

### 3.2 미래 활용 기회

| 변경 | bkit 컴포넌트 | 영향 | 필요 조치 |
|------|--------------|------|-----------|
| PLUGIN_SEED_DIR multi-dir (#14) | plugin.json | multi-plugin 환경 지원 가능 | ENH-131 (P3) |
| SessionEnd /resume fix (#11) | hooks.json | SessionEnd hook 구현 시 /resume 호환 | ENH-132 (P2) |
| Turn duration toggle (#2) | 문서 | 사용자 가이드 | ENH-133 (P3) |

### 3.3 호환성 검증

| 검증 항목 | 결과 |
|-----------|------|
| hooks.json 호환성 | ✅ 12개 hook 이벤트 모두 정상 동작 |
| PreToolUse permissionDecision | ✅ bkit 미사용 (#36059 영향 없음) |
| Agent frontmatter | ✅ effort/maxTurns 정상 (29개 agent) |
| ${CLAUDE_PLUGIN_DATA} | ✅ 정상 동작 |
| Skills (31개) | ✅ /btw streaming fix 자동 혜택 |
| lib exports (210개) | ✅ 변경 없음 |

### 3.4 Breaking Change 여부

**없음.** v2.1.79는 bkit v1.6.2와 100% 호환.

---

## 4. ENH 기회 목록

### 4.1 신규 ENH (ENH-131 ~ ENH-133)

| ENH | Priority | 설명 | YAGNI 검증 | 구현 시간 |
|-----|----------|------|------------|-----------|
| ENH-131 | P3 | `CLAUDE_CODE_PLUGIN_SEED_DIR` multi-directory 문서화 | ⚠️ bkit 단일 플러그인, 현재 불필요 | 0.5h |
| ENH-132 | P2 | SessionEnd hook 구현 (세션 종료 통계/정리) | ✅ Stop hook 보완, /resume 호환 | 4h |
| ENH-133 | P3 | Turn duration toggle 사용자 가이드 | ⚠️ 사소한 UI 옵션, 문서만 | 0.5h |

### 4.2 Plan Plus 브레인스토밍 결과

**의도 탐색:**
- v2.1.79의 최대 가치: /btw streaming fix (자동 혜택), 성능 향상 (자동 혜택)
- Critical change: 없음 (bugfix 릴리스)
- Native 대체 기회: 없음

**YAGNI 검토:**
- ENH-131: YAGNI fail → P3 강등 (단일 플러그인 환경에서 multi-dir 불필요)
- ENH-132: YAGNI pass → P2 유지 (세션 종료 시 통계 수집, 상태 정리 가치)
- ENH-133: YAGNI fail → P3 유지 (사소한 문서 업데이트)

---

## 5. GitHub Issues 모니터링

### 5.1 기존 모니터링 이슈 (변동 없음)

| # | 제목 | 상태 | 영향도 | 변동 |
|---|------|------|--------|------|
| #29423 | Task subagents ignore CLAUDE.md | OPEN | HIGH | 변동 없음 |
| #34197 | CLAUDE.md ignored | OPEN | HIGH | 변동 없음 |
| #30613 | HTTP hooks JSON broken | OPEN | LOW | 변동 없음 |
| #33656 | PostToolUse bash non-zero | OPEN | MEDIUM | 변동 없음 |
| #35296 | 1M context 미작동 | OPEN | MEDIUM | 변동 없음 |
| #33963 | OOM crash | OPEN | LOW | 변동 없음 |

### 5.2 신규 모니터링 이슈

| # | 제목 | 상태 | 영향도 | bkit 영향 |
|---|------|------|--------|-----------|
| #36059 | PreToolUse permissionDecision regression | OPEN | **HIGH** | ❌ bkit 미영향 (permissionDecision 미사용). 모니터링만 필요 |
| #36058 | session_name in hook input JSON | OPEN | LOW | 📋 향후 활용 가능 (ENH 후보) |
| #36060 | MCP integrations 미작동 in -p mode | OPEN | LOW | ❌ bkit 미영향 |

---

## 6. 연속 호환 릴리스 현황

```
v2.1.34 ──────────────────────────────── v2.1.79
         45 연속 호환 릴리스
         0 Breaking Changes (bkit 기준)
         Zero-Downtime 업그레이드 보장

Timeline:
v2.1.34~v2.1.72: 38 releases (see cc_version_history_v2134_v2172.md)
v2.1.73~v2.1.78: 6 releases (~166 changes, ENH-117~130)
v2.1.79:         1 release (~18 changes, ENH-131~133) ← NEW
```

---

## 7. 권장 사항

### 7.1 즉시 조치 (필요 없음)

v2.1.79는 bkit v1.6.2 코드 변경 없이 100% 호환됩니다.

### 7.2 향후 고려 사항

1. **ENH-132 (P2)**: SessionEnd hook 구현 → v2.1.79의 /resume fix로 안정적 구현 가능
2. **#36059 모니터링**: PreToolUse regression이 bkit의 PreToolUse hook에 영향을 줄 가능성 추적
3. **CC 권장 버전 업데이트**: v2.1.78+ → v2.1.79+ (startup memory, /btw fix 포함)

---

## 8. 결론

CC v2.1.79는 **주로 bugfix/polish 릴리스**로 bkit에 직접적인 영향은 미미합니다.

- **자동 혜택**: /btw streaming fix, startup memory -18MB, non-streaming timeout
- **신규 ENH**: 3건 (P2 1건, P3 2건) — 긴급 구현 불필요
- **호환성**: 45번째 연속 호환 릴리스 확인
- **코드 변경**: 불필요 (bkit v1.6.2 유지)
