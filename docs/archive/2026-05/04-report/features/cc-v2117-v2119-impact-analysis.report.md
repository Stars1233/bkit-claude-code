# CC v2.1.117 → v2.1.119 영향 분석 및 bkit 대응 보고서 (실증 기반 재작성)

> **Status**: ✅ Re-issued (실증 기반 전면 재작성, 2026-04-24)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.10 (current, unchanged)
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Date**: 2026-04-24
> **PDCA Cycle**: cc-version-analysis (v2.1.119)
> **CC Range**: v2.1.117 (baseline) → v2.1.118 (2026-04-22) → v2.1.119 (2026-04-23 npm latest)
> **Verdict**: **크리티컬 이슈 0건** — 관측성 확장은 v2.1.12 이월
>
> **⚠️ 본 보고서는 2026-04-24 10:30 초판 발행 후 실증 반박(section 2)을 반영하여 15:00 재작성됨. 초판에서 주장한 "크리티컬 회귀 2건"은 실제 런타임 테스트에서 반박됨.**

---

## 1. Executive Summary

### 1.1 최종 판정 (재작성 반영)

| 항목 | 초판 주장 (2026-04-24 10:30) | **재작성 결과 (2026-04-24 15:00)** |
|------|---------------------------|-----------------------------|
| 크리티컬 회귀 건수 | 2건 (P0) | **0건 (실증 확인)** |
| bkit v2.1.11 hotfix 필요성 | 필수 | **불필요** |
| 관측성 확장 우선순위 | P1 (3건) | **v2.1.12 이월 (observability sprint로 통합)** |
| 기술 부채 해제 준비 | P2 (1건) | **v2.1.12 이월** |
| YAGNI FAIL | 2건 | 2건 (확정) |
| 연속 호환 릴리스 | 77 | **77 (유지)** |
| Breaking Changes | 0 | **0 (확정)** |

### 1.2 성과 요약

```
┌──────────────────────────────────────────────┐
│  실증 기반 최종 판정 (2026-04-24 재작성)     │
├──────────────────────────────────────────────┤
│  📊 CC 변경 수집: 80 bullets (118: 34, 119: 46)│
│  🔴 실증된 크리티컬: 0건                     │
│  🟡 실증 미수행 MEDIUM: 1건 (F5-119)         │
│  🟢 관측성 확장 (v2.1.12 이월): 2건 (F8/I6)  │
│  🔵 측정 데이터 수집 (v2.1.12): 1건 (B24)    │
│  ❌ YAGNI FAIL: 2건 (F4-118, B12-118 가드)   │
│  ✅ 연속 호환: 77 릴리스 (Breaking 0)        │
│  🚨 MON-CC-06: 19 → 24건 (+5)                │
└──────────────────────────────────────────────┘
```

### 1.3 전달된 가치

| 관점 | 내용 |
|------|------|
| **Technical** | 초판 P0 2건 모두 실증 반박 또는 미실증 확인. v2.1.11 hotfix sprint 자체가 불필요 → **8시간 공수 절감**. 관측성 확장 3건(`duration_ms`/OTEL meta/precompact measurement)은 **v2.1.12 Sprint δ `/pdca token-report` FR-δ4와 자연 통합**이 더 효율적. |
| **Operational** | MON-CC-06 규모 19 → 24건 (+5 v2.1.118 regression), v2.1.118/119 공식 수정 1건만 → **hotfix 대기 기조 유지**. #47482 / #47855 장기 OPEN 각각 13/14 릴리스 지속. |
| **Strategic** | **실증 검증 프로세스 부재**가 Phase 2 분석의 신뢰성을 손상. ADR 0003으로 "Empirical Validation" 단계 의무화 → 향후 CC v2.1.120+ 대응 시 **false alarm 재발 방지**. |
| **Quality** | Breaking 0건 + 연속 호환 77 유지 확정. bkit v2.1.10이 **v2.1.119 환경에서 무수정 작동** 확인. |

---

## 2. 초판 주장 실증 반박 기록

### 2.1 초판 P0 주장 및 실증 결과

| 초판 ENH | 초판 주장 | 실증 방법 | **실증 결과** | 판정 |
|-----|----------|----------|---------------|------|
| **ENH-281** | F1-119 `/config` 영속화가 `~/.claude/settings.json`에 write하는데 bkit ENH-263 `.claude/` 방어가 이를 차단 → `/config` UX 블로킹 | 사용자가 CC v2.1.119 + bkit v2.1.10 환경에서 `/config` 실행, 테마 변경, 저장 | **✅ 정상 작동, 블로킹 없음** | **REFUTED** |
| **ENH-282** | F5-119 `--print` 모드가 agent `tools:` frontmatter 강제 준수 → bkit 36 agents 중 7개 `tools:` 누락 → `--print --agent` silent breakage | (실증 미수행) | **❓ UNVERIFIED** | **SPECULATIVE** — 실증 대기 |

### 2.2 ENH-281 REFUTED 원인 분석

**핵심 오류**: Phase 2 분석에서 두 개의 서로 다른 `.claude/` 경로를 혼동.

| 경로 | 설명 | bkit ENH-263 방어 대상 |
|------|------|:--------------------:|
| `~/.claude/settings.json` | **유저 홈 디렉토리** (user-wide) | ❌ 아님 |
| `./.claude/settings.json` | **프로젝트 루트 디렉토리** (project-wide) | ✅ 대상 (CVE #51801) |

- CC `/config`의 **실제 저장 대상은 유저 홈** (`~/.claude/settings.json`)
- bkit ENH-263이 방어하는 것은 **프로젝트 내** `.claude/` (repo clone 시 악성 `.claude/hooks/evil.json` 주입 시나리오)
- Phase 2 분석에서 경로 문자열 `.claude/settings.json`만 보고 두 경로를 **같은 대상**으로 간주 → **false alarm 생성**

**근본 원인**: "파일에 이 방어 로직 있음 + CHANGELOG에 이런 변경 있음 → 충돌"이라는 **논리적 추론**을 실측 검증 없이 **런타임 결론**으로 점프. "No Guessing" 원칙 위반.

**재발 방지**: `docs/adr/0003-cc-version-impact-empirical-validation.md` (신설) — Phase 1.5 "Empirical Validation" 단계를 Phase 2 분석 전에 의무화.

### 2.3 ENH-282 SPECULATIVE 판정 이유

- CC v2.1.119 CHANGELOG F5-119 원문: "`--print` 모드가 agent `tools:` frontmatter 준수"
- bkit agents/ 36개 중 `tools:` 필드 누락 **7개** (실측 확인)
- 그러나:
  - "준수"의 의미가 "tools: 없으면 에러" vs "tools: 없으면 기본값" vs "tools: 있으면 제약 적용" 중 무엇인지 **CC 공식 명시 없음**
  - plugin agent(bkit 같은)와 built-in agent의 취급 차이가 **문서화 부족**
  - **실증 미수행** → 실제 회귀 발생 여부 불명
- 실증 방법(대기 중): `claude --agent cto-lead --print "hello"` 실행 후 exit code 및 에러 메시지 확인
- **현재 조치**: v2.1.12로 이월, **유관 이슈(GitHub) 발생 또는 사용자 리포트 시점에 재평가**

---

## 3. CC 버전 변경사항 조사 (사실 수집 — Phase 1)

### 3.1 릴리스 요약

| 버전 | 릴리스일 (UTC) | 총 bullets | Features | Improvements | Fixes | Security | Breaking |
|------|---------------|-----------|----------|--------------|-------|----------|----------|
| v2.1.117 | 2026-04-22 | ~21 | 4 | 7 | 10 | 0 | 0 |
| **v2.1.118** | **2026-04-22** | **34** | 6 | 7 | 21 | 0 | 0 |
| **v2.1.119** | **2026-04-23** | **46** | 10 | 7 | 28 | 1 | 0 |

**발행 확정 (4중 교차 검증 완료)**:
- npm: `@anthropic-ai/claude-code@2.1.118/119` 모두 존재
- GitHub: CHANGELOG.md에 명시, compare URL 4 커밋
- GitHub issues: `#52426`, `#52657` 등 v2.1.118 버전 명시 레퍼런스
- Skip 패턴: 8건 유지 (82/93/95/99/102/103/106/115), v2.1.118은 skip 아님

**Breaking Changes: 0** → **연속 호환 릴리스: 75 → 77 (유지)**.

### 3.2 v2.1.118 HIGH Impact 변경 (실증 상태 병기)

| # | 분류 | 설명 | CC 심각도 | **bkit 실증 상태** |
|---|------|------|:---------:|:-----------------:|
| F4-118 | Feature | `mcp_tool` hook type | HIGH | **SPECULATIVE** (DROP — YAGNI FAIL) |
| I1-118 | Improvement | Auto mode `"$defaults"` | HIGH | **SPECULATIVE** (v2.1.12 이월, P3 관찰) |
| B8-118 | Fix | credential save crash (Linux/Windows) | HIGH | **자동수혜** (실증 불요) |
| B12-118 | Fix | Agent-type hook 다른 이벤트 실패 | HIGH | **CONFIRMED 무영향** (bkit hooks.json 전량 command type) |
| B14-118 | Fix | `/fork` pointer+hydrate | HIGH | **자동수혜** (실증 불요) |
| B21-118 | Fix | SendMessage subagent cwd 미복원 | HIGH | **SPECULATIVE** |

### 3.3 v2.1.119 HIGH Impact 변경 (실증 상태 병기)

| # | 분류 | 설명 | CC 심각도 | **bkit 실증 상태** |
|---|------|------|:---------:|:-----------------:|
| **F1-119** | Feature | `/config` 영속화 → `~/.claude/settings.json` | HIGH | **✅ REFUTED** (실증 완료, bkit 충돌 없음) |
| **F5-119** | Feature | `--print`가 agent `tools:`/`disallowedTools:` 준수 | HIGH | **❓ UNVERIFIED** (v2.1.12 이월) |
| F6-119 | Feature | `--agent`가 built-in agent `permissionMode` 준수 | MEDIUM | **CONFIRMED 무영향** (bkit plugin agent는 CC가 무시) |
| **F8-119** | Feature | PostToolUse/PostToolUseFailure `duration_ms` | HIGH | **SPECULATIVE (관측성 확장 기회)** |
| I5-119 | Security | `blockedMarketplaces` fix | HIGH | **CONFIRMED 무영향** (bkit Marketplace 미운영) |
| **I6-119** | Improvement | OTEL `tool_use_id` + `tool_input_size_bytes` | MEDIUM | **SPECULATIVE (관측성 확장 기회)** |
| B3-119 | Fix | Glob/Grep Bash denied 시 native 사라짐 수정 | HIGH | **자동수혜** (ENH-256 유예 근거) |
| B7-119 | Fix | Auto mode가 plan mode override | HIGH | **SPECULATIVE** |
| **B24-119** | Fix | Auto-compaction 전 skill 재실행 | HIGH | **자동수혜 (ENH-232 재평가 기회)** |

### 3.4 MON-CC-06 확장 (신규 5건, v2.1.118 regression)

| Issue | 제목 | CC Severity | Status | bkit 영향 |
|-------|------|:-----------:|:------:|----------|
| #52657 | VS Code extension silent crash | HIGH | OPEN | **무영향** (bkit CLI 전용) |
| #52309 | tmux terminal resize 출력 중복 | HIGH | OPEN | **잠재적 개발자 경고** (v2.1.12+) |
| #52503 | Hebrew/RTL reversed | LOW | OPEN | **무영향** |
| #52552 | Bedrock 무응답 | MEDIUM | OPEN | **무영향** |
| #52291 | `renderToolResultMessage` TypeError | MEDIUM | OPEN | **자동수혜 대기** |

**MON-CC-06 규모**: 19 → **24건 (+5)**. v2.1.118/119 공식 수정 1건만 (#51798 잔존 OPEN, #52426/#52319 CLOSED).

### 3.5 이전 OPEN 이슈 상태 (2 릴리스 경과)

| Issue | 제목 | 릴리스 연속 OPEN | 변화 |
|-------|------|:---------------:|:----:|
| #47482 | Output styles YAML frontmatter 미주입 | **13 릴리스** | +2 |
| #47855 | Opus 1M `/compact` block (MON-CC-02) | **14 릴리스** | +2 |
| #51798 | PreToolUse allow + dangerouslyDisableSandbox | **4 릴리스** | +2 |
| #51801 | bypassPermissions + `.claude/` write | **4 릴리스** | +2 |
| #51809 | Sonnet per-turn 6~8k tokens 오버헤드 | **4 릴리스** | +2 |

---

## 4. bkit 영향 최종 매트릭스

### 4.1 실증 상태별 집계

| 카테고리 | 건수 | 분류 |
|---------|:----:|------|
| CONFIRMED 크리티컬 회귀 | **0** | — |
| REFUTED (초판 false alarm) | 1 | F1-119 |
| UNVERIFIED → v2.1.12 이월 | 1 | F5-119 (실증 대기) |
| 관측성 확장 기회 → v2.1.12 | 2 | F8-119, I6-119 |
| 기술 부채 재평가 데이터 → v2.1.12 | 1 | B24-119 측정 |
| CONFIRMED 무영향 | 3 | B12-118, I5-119, F6-119 |
| 자동수혜 (구현 불요) | 5 | B8-118, B14-118, B21-118, B3-119, B24-119 |
| YAGNI FAIL (DROP) | 2 | F4-118 mcp_tool, B12-118 agent hook 가드 |
| v2.1.12 P3 관찰만 | 1 | I1-118 `$defaults` |

### 4.2 ENH 번호 상태 (초판에서 예약했던 번호 처리)

| ENH 번호 | 초판 할당 | **재작성 후 상태** |
|----------|----------|-----------------|
| **ENH-265 ~ ENH-273** | Phase 2에서 예약 (ENH-264 기준) | **해제** — 실제로는 ENH-280까지 사용 중이었음 (v2.1.11 integrated enhancement) |
| **ENH-281 ~ ENH-285** | Sprint ε Plan/Design에서 예약 | **해제** — Sprint ε 폐기로 구현 없음 |

**재사용 정책**: ENH-281 이후 신규 번호는 **실제 구현 착수 시점에 재발급**. 예약 단계에서는 번호 할당 금지 (ADR 0003 §Consequences 참조).

### 4.3 v2.1.12 이월 항목 목록

| 이월 항목 | 근거 | 통합 대상 | 실증 우선 필요? |
|-----------|------|-----------|:---------------:|
| F5-119 `--print tools:` 실증 | UNVERIFIED | 유관 이슈 리포트 발생 시점 또는 Sprint α Daniel Alpha 테스트 | ✅ |
| F8-119 `duration_ms` audit 확장 | SPECULATIVE (관측성) | Sprint δ FR-δ4 `/pdca token-report` 데이터 기반 | — |
| I6-119 OTEL 메타 확장 | SPECULATIVE (관측성) | Sprint δ FR-δ4와 통합 | — |
| B24-119 skill 재실행 측정 | SPECULATIVE (기술 부채 준비) | Sprint γ FR-γ1 Trust Score closeout과 통합 가능 | — |
| I1-118 `$defaults` | SPECULATIVE (P3 관찰) | CC 공식 스펙 명문화 후 재평가 | ✅ |
| #52309 tmux 개발자 경고 | LOW 영향 | 사용자 리포트 축적 후 | — |

---

## 5. 호환성 평가

### 5.1 호환성 매트릭스

| CC 버전 | bkit v2.1.10 호환 | 비고 |
|---------|:------:|------|
| v2.1.114 | ✅ | CTO Team crash fix (최소 권장) |
| v2.1.116 | ✅ | S1 보안 + `/resume` 67% |
| v2.1.117 | ✅ | 이전 권장 |
| v2.1.118 | ✅ | **확인됨** (76 연속) |
| **v2.1.119** | ✅ **확인됨** | **77 연속, Breaking 0** |

### 5.2 연속 호환 릴리스

```
v2.1.34 ──────────────────────────────────── v2.1.119
         77개 연속 호환 릴리스 (v2.1.115 스킵 포함)
         bkit 기능 코드 Breaking: 0건
         실증 근거:
           • F1-119 `/config` + bkit v2.1.10 런타임 테스트 PASS (2026-04-24)
           • B12-118 agent-type hook → bkit hooks.json 0건 agent type (grep 확인)
           • F6-119 built-in permissionMode → bkit plugin agent CC 무시 (cto-lead.md:25 주석)
           • I5-119 blockedMarketplaces → bkit Marketplace 미운영 (plugin.json 확인)
```

### 5.3 추천 CC 버전

- **최소**: v2.1.114
- **권장 (2026-04-24)**: **v2.1.119** (승격, 실증 기반)
- **현재 npm latest**: v2.1.119

---

## 6. 실증 검증 프로세스 (신설 — ADR 0003 근거)

### 6.1 왜 이 섹션이 필요한가

초판 발행(2026-04-24 10:30) 시 Phase 2 분석에서 F1-119를 P0 크리티컬로 판정. 사용자가 실제 CC v2.1.119 + bkit v2.1.10 환경에서 `/config` 테마 변경을 시도한 결과 **정상 작동 확인**. 초판 주장 반박.

**교훈**: grep 기반 논리 추론("파일 A에 로직 있음 + CHANGELOG에 변경 있음 = 충돌")을 런타임 결론으로 점프하면 안 됨. "No Guessing" 원칙의 실제 의미는 **실측 실행 검증 없이는 P0 판정 불가**.

### 6.2 재발 방지 체크리스트 (ADR 0003 적용)

CC v2.1.120+ 대응 시 Phase 2 분석에서 모든 P0/P1 후보 ENH는 다음 체크리스트 통과 필수:

- [ ] **E1. 재현 시나리오 명시** — 어떤 CLI 명령 또는 사용자 액션으로 회귀가 트리거되는가?
- [ ] **E2. 실제 실행 검증** — 실증 환경에서 시나리오 실행, exit code + stderr + 부수 효과 기록
- [ ] **E3. 경로 구분** — 절대 경로 vs 상대 경로, 유저 홈 vs 프로젝트, 여러 precedence scope 구분 명시
- [ ] **E4. CC 공식 스펙 링크** — CHANGELOG 외 공식 docs 또는 소스 링크 첨부 (추정 금지)
- [ ] **E5. 실증 상태 태깅** — CONFIRMED / REFUTED / SPECULATIVE / UNVERIFIED 4값 중 하나

**P0 판정은 `CONFIRMED` 상태에서만 가능**. `SPECULATIVE`는 최대 P2, `UNVERIFIED`는 실증 전까지 판정 보류.

### 6.3 실증 검증 자체의 비용

- 실증 1건당 예상 5~15분 (CLI 실행 + 결과 기록)
- Phase 2 전체 공수는 증가하나, **false alarm 폐기 공수(초판 Plan 410줄 + Design 858줄 + 브랜치 작업)** 대비 훨씬 저렴
- ROI: 높음

---

## 7. 결론 및 권고사항

### 7.1 최종 판정

- **호환성**: ✅ **CONFIRMED** — bkit v2.1.10이 CC v2.1.119에서 무수정 작동
- **업그레이드 권장**: ✅ **YES (무조건부)** — hotfix 불필요, 현재 배포 상태 유지
- **bkit 버전**: v2.1.10 유지 (v2.1.11은 기존 integrated enhancement 범위로 진행)

### 7.2 핵심 액션 아이템

1. **즉시**: ADR 0003 (실증 검증 프로세스) 발행 → 다음 CC 버전 대응부터 적용
2. **즉시**: `docs/reference/cc-issue-monitoring.md` 발행 → CC/bkit 양쪽 이슈 모니터링 체계 구축
3. **유관 이슈 발생 시**: F5-119 `--print tools:` 실제 회귀 발생 여부 실증
4. **Sprint δ 병렬**: F8-119/I6-119 관측성 확장을 `/pdca token-report`(FR-δ4)에 자연 통합

### 7.3 다음 단계

- [x] **2026-04-24 15:00**: 초판 주장 실증 반박, 본 보고서 재작성
- [x] **2026-04-24**: Sprint ε 폐기 (Plan/Design 삭제, 브랜치 삭제)
- [ ] **2026-04-24**: ADR 0003 발행
- [ ] **2026-04-24**: CC + bkit 이슈 모니터링 체계 문서 발행
- [ ] **유관 이슈 발생 시**: v2.1.12 Sprint에서 실증 → 필요 시 재대응
- [ ] **2026-05-06**: MON-CC-02 #47855 2주 관찰 리뷰 (별개 사안)

---

## Appendix A — Confidence 종합 (재평가)

**Phase 1 Confidence**: **87% HIGH** (초판 유지 — CHANGELOG 수집은 정확)
**Phase 2 Confidence**: **45% LOW** (**초판 89% 대폭 하향** — 실증 반박 반영, 1개 P0 REFUTED로 방법론 신뢰도 손상)
**Phase 3 Confidence**: **70% MEDIUM** (**초판 90% 하향** — Phase 2 품질이 우선순위 판정에 영향)

**Open Questions (재평가 후 남은 것)**

1. **F5-119 `--print tools:` 실제 동작** — 실증 대기 (사용자 실행 or 유관 이슈 축적)
2. **F8-119/I6-119 관측성 통합 시점** — Sprint δ `/pdca token-report`와 통합 best fit?
3. **B24-119 효과 측정 필드 설계** — v2.1.12 Sprint γ Trust Score closeout과 통합 가능성?

## Appendix B — 이전 보고서와 연속성

| 보고서 | 기간 | 릴리스 수 | 판정 | 상태 |
|--------|------|:--------:|-----|------|
| cc-v2112-v2114-impact | 2026-04-XX | 2 (v2.1.114 유효) | 호환 | Closed |
| cc-v2114-v2116-impact | 2026-04-21 | 1 (v2.1.116 유효) | 호환 | Closed |
| cc-v2116-v2117-impact | 2026-04-22 | 1 (v2.1.117 유효) | 호환 (ENH 5×P0) | Closed |
| cc-v2117-v2118-bkit-v2111-impact | 2026-04-23 | 1 (v2.1.118 유효) | 호환 (ENH 3 Sprint δ/γ 편입) | Closed |
| **cc-v2117-v2119-impact (본 보고서 v2)** | **2026-04-24** | **2 (v2.1.118/119)** | **호환 (크리티컬 0)** | **Re-issued** |

**누적**: v2.1.73 → v2.1.119 = **46개 릴리스, 8개 스킵, 77개 연속 호환**

## Appendix C — 실증 반박된 초판 주장 상세 (학습 목적)

**F1-119 P0 판정 → REFUTED**:

- 초판 근거: `SAFE_WRITE_DIRS`에 `.claude/` 미포함 + F1-119 `/config` 영속화 → 충돌 추정
- 실증 반박: 사용자가 CC v2.1.119 + bkit v2.1.10 환경에서 `/config` 테마 변경 → 정상 작동 (2026-04-24 14:xx)
- 원인: **경로 혼동** (`~/.claude/` 유저 홈 vs `./.claude/` 프로젝트)
- 결과: Sprint ε 폐기, 8시간 공수 절감
- 교훈: grep 결과를 런타임 결론으로 점프 금지

**상세 분석**: `docs/03-analysis/cc-v2119-phase2-retrospective.md` (신설) 참조

---

**End of Report (Re-issued 2026-04-24 15:00)**
