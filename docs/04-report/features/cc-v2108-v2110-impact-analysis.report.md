# CC v2.1.108 → v2.1.110 영향 분석 보고서

> **분석 일자**: 2026-04-16
> **분석 범위**: CC v2.1.109 ~ v2.1.110 (2개 릴리스, 스킵 0건)
> **설치 버전**: v2.1.110
> **이전 분석**: cc-v2107-v2108-impact-analysis (2026-04-15)

---

## Executive Summary

CC v2.1.108 이후 **2건 정상 발행** (v2.1.109/v2.1.110, 스킵 없음). v2.1.109는 UX 단건(extended-thinking indicator), v2.1.110은 **33건 대형 릴리스**(Features 9 + Improvements 4 + Fixes 20)로 `/tui`·`/focus` 명령 신설, MCP SSE/HTTP hang 수정, PreToolUse 보안 수정 2건(B13/B14), stdio MCP stray line 회귀 수정(B15)이 핵심.

**bkit 코드 점검 결과**: 6개 핵심 항목(plugin.json deps, disable-model-invocation, updatedInput, MCP stdout, Bash timeout, recap 충돌) **모두 "영향 없음/자동 수혜"** 확인. **코드 수정 필요 0건**.

**YAGNI 검토**: Phase 1 ENH 후보 8건 중 **5건 FAIL**(226~231), 3건 유지(P2 1건, P3 2건). **이번 릴리스는 bkit에 순수 자동 수혜**.

**연속 호환: 71개** (v2.1.34 → v2.1.110, breaking 0건). **회귀 4건(#47810/#47855/#47482/#47828) 모두 OPEN 유지** (5개 릴리스 연속 미해결). CC 추천 버전: **v2.1.110+** 승격 (MCP/PreToolUse 안정성 대폭 향상, 단 MON-CC-01/02 + ENH-214 방어 유지 필수).

---

## 4-Perspective 가치 평가

| Perspective | v2.1.109 영향 | v2.1.110 영향 | bkit 수혜 |
|-------------|--------------|--------------|----------|
| **PDCA Workflow** | 없음 | B9 subagent transcript 정리, F6 --resume scheduled task 부활 | 자동 수혜 |
| **Developer Experience** | 자동 수혜 (thinking indicator) | F1 /tui, F3 /focus, B11 macOS garbled fix, B7 --resume /rename | 자동 수혜 |
| **Security/Quality** | 없음 | B12 command injection 보호, B13 PreToolUse 보안, B14 additionalContext | 자동 수혜 |
| **Maintainability** | 없음 | B1 MCP hang fix, B15 MCP stray line fix, B5 plugin deps | 자동 수혜 |

---

## 버전별 변경사항

### v2.1.109 (1건, 2026-04-15 04:02 UTC)

| # | Type | Change | Impact | bkit 영향 |
|---|------|--------|--------|----------|
| I1 | Improvement | Extended-thinking indicator rotating progress hint | LOW | 자동 수혜 (UI only) |

**구조적 변경 0건**. 시스템 프롬프트 변동 0.

### v2.1.110 (33건, 2026-04-15 22:07 UTC)

#### Features (9건)

| # | Change | Impact | bkit 영향 |
|---|--------|--------|----------|
| F1 | `/tui` 명령 + `tui` 설정 (flicker-free fullscreen) | HIGH | 자동 수혜 (사용자 UX) |
| F2 | Push notification tool 추가 (Remote Control + 모바일 푸시) | MEDIUM | 무관 (CC native tool) |
| F3 | `/focus` 명령 신설 + `Ctrl+O` 동작 변경 | MEDIUM | 자동 수혜 |
| F4 | `autoScrollEnabled` config | LOW | 무영향 |
| F5 | `Ctrl+G` external editor 마지막 응답 context 표시 | LOW | 자동 수혜 |
| F6 | `--resume`/`--continue` scheduled task 부활 | MEDIUM | ENH-144 미구현이므로 무영향 |
| F7 | `/autocompact`, `/context`, `/exit`, `/reload-plugins` Remote Control 지원 | MEDIUM | ENH-194 자동 수혜 확장 |
| F8 | Write tool IDE diff 사용자 편집 시 모델 통보 | MEDIUM | 25/37 skills Write 사용, 자동 수혜 |
| F9 | SDK/headless `TRACEPARENT`/`TRACESTATE` (분산 트레이스) | LOW | headless 미사용 |

#### Improvements (4건)

| # | Change | Impact | bkit 영향 |
|---|--------|--------|----------|
| I1 | `/plugin` Installed tab UX 개선 | MEDIUM | bkit plugin 사용자 UX |
| I2 | `/doctor` 다중 scope MCP 충돌 경고 | MEDIUM | bkit 2 MCP servers 검증 유용 |
| I3 | Bash tool max timeout 강제 (임의 큰 값 거부) | MEDIUM | **점검 완료: bkit timeout override 0건, 무영향** |
| I4 | Session recap telemetry-disabled 사용자 확대 | MEDIUM | ENH-216 모니터링 (현재 충돌 없음) |

#### Fixes (20건)

| # | Change | Impact | bkit 영향 |
|---|--------|--------|----------|
| B1 | MCP SSE/HTTP connection drop hang 수정 | HIGH | bkit 2 MCP 안정성 ↑ |
| B2 | Non-streaming fallback multi-minute hang 수정 | HIGH | 장기 PDCA 세션 안정성 |
| B3 | Session recap/slash-cmd focus mode 미표시 수정 | LOW | F3 부수 |
| B4 | Fullscreen 도구 실행 중 high CPU 수정 | LOW | 자동 수혜 |
| B5 | Plugin dependencies 자동설치 수정 | HIGH | **점검 완료: bkit dependencies 없음, 무영향** |
| B6 | `disable-model-invocation` skill 호출 실패 수정 | HIGH | **점검 완료: 0/37 skills 사용, 무영향** |
| B7 | `--resume` /rename 이름 미표시 수정 | MEDIUM | ENH-187 모니터링 |
| B8 | Multi-tool-call queued message 중복 수정 | LOW | 자동 수혜 |
| B9 | Session cleanup subagent transcript 미삭제 수정 | MEDIUM | CTO Team 12 agents 디스크 정리 |
| B10 | CLI relaunch dropped keystroke 수정 | LOW | F1 보강 |
| B11 | macOS Terminal.app garbled startup 수정 | MEDIUM | macOS 사용자 다수 |
| B12 | "Open in editor" command injection 보호 강화 | HIGH | OWASP A03 자동 수혜 |
| B13 | **PreToolUse `updatedInput` permissions.deny 재검사 + bypassPermissions 정책 준수** | HIGH | **점검 완료: bkit updatedInput=null 항상, 자동 수혜** |
| B14 | **PreToolUse `additionalContext` tool 실패 시 drop 수정** | HIGH | bkit PreToolUse hook 안정화 |
| B15 | **Stdio MCP stray non-JSON stdout disconnect (v2.1.105 회귀) 수정** | HIGH | **점검 완료: bkit MCP console.log 0건, 무영향** |
| B16 | Headless auto-title 추가 Haiku 요청 수정 | LOW | headless 미사용 |
| B17 | 파이프 Ink output 과도한 메모리 할당 수정 | LOW | CI/CD (ENH-138) |
| B18 | Fullscreen /skills modal overflow 미스크롤 수정 | LOW | F1 부수 |
| B19 | Remote Control 재로그인 prompt | LOW | 미사용 |
| B20 | Remote Control 세션 rename persist 수정 | LOW | 미사용 |

---

## 회귀 4건 상태 (v2.1.108 → v2.1.110)

| Issue | 제목 | v2.1.110 상태 | 누적 릴리스 | bkit 방어 |
|-------|------|--------------|-----------|----------|
| **#47810** | skip-perm + PreToolUse bypass | **OPEN** (B13이 인접 수정, root cause 미해결) | 5개 (108~110+109) | MON-CC-01 유지 |
| **#47855** | Opus 1M /compact block | **OPEN** | 5개 | MON-CC-02 유지 |
| **#47482** | output styles YAML frontmatter 미주입 | **OPEN** | 5개 | ENH-214 방어 유지 |
| **#47828** | SessionStart systemMessage + remoteControl | **OPEN** | 5개 | bkit 미사용 (모니터링) |

**결론**: v2.1.107 회귀 4건이 **5개 릴리스(v2.1.108~v2.1.110) 동안 미해결**. v2.1.111+ hotfix 대기 권고로 갱신.

---

## 코드 점검 상세 결과

### A1. plugin.json dependencies (B5)
- **경로**: `.claude-plugin/plugin.json`
- **결과**: `dependencies` 필드 없음. bkit은 standalone plugin.
- **판정**: B5 무영향

### A2. disable-model-invocation (B6)
- **경로**: `skills/*/SKILL.md` 전체 grep
- **결과**: 37 skills 중 0건 사용
- **판정**: B6 무영향

### A3. PreToolUse updatedInput (B13)
- **경로**: `scripts/permission-request-handler.js:55,102,149`
- **결과**: `updatedInput: null` 항상 반환 (input 수정 안 함)
- **판정**: B13 자동 수혜 (bkit이 input 수정하지 않으므로 재검사 로직 미해당)

### A4. MCP servers stdout (B15)
- **경로**: `servers/bkit-pdca-server/index.js`, `servers/bkit-analysis-server/index.js`
- **결과**: `console.log/warn/error` 0건
- **판정**: B15 무영향 (stdout 청정)

### A5. Bash timeout override (I3)
- **경로**: `skills/*/SKILL.md` 전체 grep
- **결과**: Bash tool timeout 설정 0건 (2건 발견은 UI/business logic timeout)
- **판정**: I3 무영향

### A6. session-start.js recap 충돌 (I4)
- **경로**: `hooks/session-start.js`, `hooks/startup/session-context.js`
- **결과**: PDCA context inject와 CC recap은 별도 경로. 충돌 코드 없음.
- **판정**: ENH-216 P1 유지 (P0 승격 불필요)

---

## ENH YAGNI 검토

### Phase 1 후보 → YAGNI 결과

| 후보 | 설명 | 코드 점검 | YAGNI | 판정 |
|------|------|----------|-------|------|
| ENH-226 | PreToolUse updatedInput audit | updatedInput=null 항상 | ❌ FAIL | 제거 |
| ENH-227 | plugin.json deps verify | deps 필드 없음 | ❌ FAIL | 제거 |
| ENH-228 | ENH-216 /recap P0 승격 | 충돌 없음 | △ | **P2 강등** (P1→P2, 현재 무충돌) |
| ENH-229 | Bash timeout audit | override 0건 | ❌ FAIL | 제거 |
| ENH-230 | MCP stdout cleanup | console.log 0건 | ❌ FAIL | 제거 |
| ENH-231 | skill direct invocation audit | 0 skills 사용 | ❌ FAIL | 제거 |
| ENH-232 | /tui mode guide | 자동 수혜 문서화 | △ | **P3 유지** |
| ENH-233 | CC tools 수 검증 (push notification) | 검증 필요 | △ | **P3 모니터링** |

**최종: 8건 중 5건 YAGNI FAIL, 3건 유지 (P2 1건, P3 2건)**

### 기존 ENH 갱신

| ENH | 설명 | 갱신 사항 |
|-----|------|----------|
| ENH-187 | sessionTitle | B7 --resume /rename 수정으로 CC 측 정상화, bkit 재검증 우선순위 ↓ |
| ENH-194 | /reload-plugins | F7 Remote Control 지원 확장, P3 유지 |
| ENH-214 | output styles frontmatter | #47482 OPEN 유지, 방어 레이어 유지 필수 |
| ENH-216 | /recap PDCA 통합 | I4로 적용 범위 확대, 현재 충돌 없음, **P1 유지** |

---

## 통계

| 항목 | v2.1.109 | v2.1.110 | 합계 |
|------|----------|----------|------|
| Breaking | 0 | 0 | **0** |
| Feature | 0 | 9 | 9 |
| Improvement | 1 | 4 | 5 |
| Fix | 0 | 20 | 20 |
| **합계** | **1** | **33** | **34** |

| bkit 영향 분류 | 건수 |
|---------------|------|
| 자동 수혜 | 20 |
| 무영향 | 14 |
| 코드 수정 필요 | **0** |

---

## 구조적 변경 요약

| 항목 | v2.1.108 기준 | v2.1.110 현재 | 변동 |
|------|-------------|-------------|------|
| Hook events (CC 총) | 26 | 26 | 0 |
| Hook events (bkit 구현) | 21 | 21 | 0 |
| PreToolUse decisions | 4 (allow/deny/ask/defer) | 4 | 0 |
| CC tools (런타임) | 32 | 32~33 (F2 검증 필요) | +0~1 |
| CC tools (공식 docs) | 35 | 35+ | TBD |
| Agent frontmatter 필드 | 4 (effort/maxTurns/disallowedTools/initialPrompt) | 4 | 0 |
| Plugin manifest 키 | monitors (v2.1.105) | 변동 없음 | 0 |

---

## 시스템 프롬프트 변동

**추정 +60~160 토큰** (v2.1.108 baseline 대비):
- F1 `/tui`, F3 `/focus`: 신규 슬래시 명령 목록 등재 시 +20~50
- F2 push notification tool: tool 설명 +30~80
- F8 Write tool IDE diff: +10~30

**정확한 diff는 별도 sysprompt 비교 필요** (확인 불가 - 추가 조사 필요)

---

## Philosophy 준수 체크

| Philosophy | 준수 | 근거 |
|-----------|------|------|
| **Automation First** | ✅ | 코드 수정 0건, 모든 수혜가 자동 |
| **No Guessing** | ✅ | 6개 코드 점검으로 추측 배제, YAGNI 5건 제거 |
| **Docs=Code** | ✅ | 보고서 즉시 작성, MEMORY 갱신 예정 |

---

## 권장 사항

### CC 추천 버전 갱신
- **기존**: v2.1.108+ (MON-CC-01/02 + ENH-214 방어 유지)
- **갱신**: **v2.1.110+** (MCP/PreToolUse 안정성 대폭 향상)
- **조건**: MON-CC-01/02 + ENH-214 방어 레이어 유지 필수, v2.1.111+ hotfix 대기 권고

### 연속 호환
- **기존**: 69개 (v2.1.34 → v2.1.108)
- **갱신**: **71개** (v2.1.34 → v2.1.110)
- **스킵 포함 전체**: v2.1.82/93/95/99/102/103/106 스킵 7개 제외

### MEMORY 갱신 대상
1. v2.1.109 이력 추가 (1건)
2. v2.1.110 이력 추가 (33건)
3. 연속 호환 69→71개
4. CC recommended version v2.1.108+ → v2.1.110+
5. ENH-226~231 YAGNI FAIL 기록
6. ENH-228 P2 강등 (P1→P2)
7. ENH-232/233 P3 신규
8. 회귀 4건 v2.1.111+ 대기 갱신

---

## 출처 레퍼런스

- GitHub Releases: anthropics/claude-code releases
  - v2.1.110 (2026-04-15 22:07 UTC)
  - v2.1.109 (2026-04-15 04:02 UTC, commit f348a16)
- npm: @anthropic-ai/claude-code (latest: 2.1.110, stable: 2.1.92)
- Issue #47810: OPEN (skip-perm+PreToolUse bypass)
- Issue #47855: OPEN (Opus 1M /compact block)
- Issue #47482: OPEN (output styles YAML frontmatter)
- Issue #47828: OPEN (SessionStart systemMessage+remoteControl)
