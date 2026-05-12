# CC v2.1.114 → v2.1.116 영향 분석 및 bkit 개선 보고서

> **Status**: ✅ Complete (Analysis-Only, 구현 전)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.8 → v2.1.10 (예정)
> **Author**: CTO Team (cc-version-researcher + bkit-impact-analyst + Plan Plus)
> **Date**: 2026-04-21
> **PDCA Cycle**: cc-version-analysis (v2.1.115~v2.1.116)
> **분석 기반**: Phase 1 (Research, 371s, 55K tokens) + Phase 2 (Analyst, 211s, 45K tokens) + Phase 3 (Plan Plus, main)

---

## 1. Executive Summary

### 1.1 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **분석 대상** | Claude Code CLI v2.1.114 → v2.1.116 |
| **분석 범위** | 릴리스 1개 유효 (**v2.1.115 미발행**, v2.1.116 24건 변경) |
| **시작일** | 2026-04-21 |
| **완료일** | 2026-04-21 |
| **기간** | ~12분 (Phase 1 6.2분 + Phase 2 3.5분 백그라운드 병렬) |

### 1.2 성과 요약

```
┌──────────────────────────────────────────────┐
│  분석 완료율: 100%                            │
├──────────────────────────────────────────────┤
│  📊 총 변경사항:  24건 (v2.1.116 단독)         │
│  ⏭  스킵 릴리스:  v2.1.115 (8번째 스킵)        │
│  🔴 HIGH 영향:    3건 (I1, S1, B10)           │
│  🟡 MEDIUM 영향:  7건                         │
│  🟢 LOW 영향:    14건                         │
│  🆕 ENH 기회:     9건 (ENH-253~263, 256/257결 │
│                       번은 YAGNI FAIL 기록)   │
│  ❌ YAGNI FAIL:   3건 (F1, I7, I2)           │
│  ✅ 연속 호환:   74 릴리스 (조건부 유지)       │
└──────────────────────────────────────────────┘
```

### 1.3 전달된 가치 (4-Perspective)

| 관점 | 내용 |
|------|------|
| **Technical** | v2.1.116 `/resume` 67% 가속(I1) + empty-conversation 에러 보고(B10)로 장기 PDCA 세션 복원 신뢰성 자동 수혜. Agent `hooks:` frontmatter 메인스레드 발화(F1) behavior change는 bkit 36 agents 전부 미사용으로 **무영향 확정** |
| **Operational** | MON-CC-06 네이티브 바이너리 회귀가 10건 → **16건으로 확장** (v2.1.116 공식 수정 0건). #51165 `context: fork` 회귀는 bkit 유일 사용 스킬 `zero-script-qa` 직접 위협 — ENH-253 P0 실측 즉시 필요 |
| **Strategic** | v2.1.116 S1 `rm` dangerous-path 차단은 v2.1.113 #23 `dangerouslyDisableSandbox` fix와 연속. bkit `DANGEROUS_PATTERNS`(`scripts/config-change-handler.js:17-24`)는 CC 런타임 방어와 **서로 다른 표면** 방어 → **defense-in-depth 아키텍처 첫 공식 문서화 기회** |
| **Quality** | 실측 중 plugin.json + MEMORY.md skills/agents 개수 3중 오기 발견 (실제 39/36) — ENH-241 Docs=Code 교차 검증 스킴의 실적용 사례 확보 |

---

## 2. 관련 문서

| Phase | 문서 | 상태 |
|-------|------|------|
| Research | CC v2.1.114~v2.1.116 변경사항 조사 (Phase 1 결과 본 보고서 섹션 3) | ✅ |
| Impact | bkit 영향 분석 (Phase 2 결과 본 보고서 섹션 4) | ✅ |
| Plan | `docs/01-plan/features/cc-v2114-v2116-impact-analysis.plan.md` | ✅ |
| Report | 본 문서 | ✅ |

---

## 3. CC 버전 변경사항 조사

### 3.1 릴리스 요약

| 버전 | 릴리스일 (UTC) | CHANGELOG 요약 | 변경 수 | 스킵 여부 |
|------|---------|----------|---------|---------|
| v2.1.115 | — | (CHANGELOG 항목 없음) | 0 | ✅ **스킵 8번째** (82/93/95/99/102/103/106/115) |
| v2.1.116 | 2026-04-20 22:18 | `/resume` 67% 가속, MCP 지연 로딩, thinking 인라인, 다수 수정 | **24** | ❌ 발행 |

**스킵 4중 교차 검증 (v2.1.115)**: npm `HTTP 404` + `tags` 부재 + CHANGELOG 항목 부재 + `compare v2.1.114...v2.1.116` 단 1 커밋(CHANGELOG.md update).

### 3.2 Breaking Changes

**0건**. Agent/Skill/Hook/Lib/Script 모든 표면에서 기존 동작 보존.

### 3.3 신규 기능 및 성능 개선 (v2.1.116 HIGH/MEDIUM)

| # | 분류 | 설명 | 영향도 | bkit 영향 |
|---|------|------|--------|----------|
| **I1** | Performance | `/resume` 40MB+ 세션 최대 **67% 가속** + dead-fork entries 효율 처리 | **HIGH** | 자동 수혜 — 장기 PDCA 세션 복원 (ENH-255) |
| **B10** | Fix | `/resume` 대형 세션 empty conversation 조용히 표시 → **load error 보고로 변경** | **HIGH** | 자동 수혜 — 데이터 무결성 회복 |
| **S1** | **Security** | Sandbox auto-allow가 `rm`/`rmdir`의 `/`, `$HOME`, critical dirs에 대해 dangerous-path safety check bypass하지 않음 | **HIGH** | **ENH-254 대상** — `DANGEROUS_PATTERNS`와 이중 방어선 |
| **F1** | Feature/Hook | Agent frontmatter `hooks:` fire when main-thread agent via `--agent` | MEDIUM | **무영향 확정** — 36 agents 전부 `hooks:` 미사용 |
| **I2** | Performance | MCP `resources/templates/list` → 첫 `@`-mention 지연 로드 | MEDIUM | **무영향** — bkit MCP 2 서버 모두 미구현 |
| **I7** | Plugin | `/reload-plugins` + bg auto-update가 누락 plugin dependencies 자동 설치 | MEDIUM | **무영향** — bkit plugin self-contained |
| **I8** | Bash | `gh` rate-limit 힌트 표시 → agent backoff 유도 | MEDIUM | 자동 수혜 (ENH-262) |
| **B4** | Fix | Ctrl+Z hang when launched via `npx`/`bun run` wrapper | MEDIUM | 자동 수혜 (ENH-261) |
| **B8** | Fix | 간헐적 API 400 cache TTL ordering 수정 | MEDIUM | 자동 수혜 — CTO Team 12명 병렬 spawn 안정화 |
| **B9** | Fix | `/branch` 50MB+ transcript 허용 | MEDIUM | 자동 수혜 — 장기 PDCA 세션 분기 |
| **B12** | Fix | worktree 중 `/update`, `/tui` 미작동 수정 | MEDIUM | **ENH-258 대상** — ENH-231 TUI 재검증 트리거 |

### 3.4 시스템 프롬프트 변경

| 항목 | 변경 전 | 변경 후 | 토큰 변화 |
|------|--------|--------|----------|
| CHANGELOG 명시 | 없음 | 없음 | **TBD** (실측 미실시, Confidence 60%) |

**주의**: v2.1.104 heading-rename 전례가 CHANGELOG 미명시로 발생했으므로 실측 권고 (Open Question §Appendix A #3).

### 3.5 Hook 이벤트 변경

| 이벤트 | 상태 | bkit 영향 |
|--------|------|---------|
| F1 Agent `hooks:` frontmatter | Behavior change (메인스레드 발화) | **0건 사용** → 무영향 |
| 그 외 25 events | 변동 없음 | bkit 21 구현 무영향 |
| PreToolUse decisions | 4종 유지 (allow/deny/ask/defer) | 변동 없음 |

---

## 4. bkit 영향 분석

### 4.1 영향 요약

| 카테고리 | 건수 | HIGH | MEDIUM | LOW |
|---------|------|------|--------|-----|
| Breaking | 0 | 0 | 0 | 0 |
| Enhancement (ENH 대상) | 9 | 2 | 2 | 3 P2 + 2 P3 |
| Neutral (자동 수혜) | 7 | 2 | 4 | 1 |
| No Impact (bkit 무관) | 14 | 0 | 0 | 14 |

### 4.2 실측 근거 (Phase 2)

| 항목 | 실측 결과 | 영향 |
|------|----------|------|
| **agents/** 개수 | 실제 **36** (plugin.json desc "36" 일치, MEMORY "32" 오기) | ENH-263 정정 |
| **skills/** 개수 | 실제 **39** (plugin.json desc "38", MEMORY "37" 모두 오기) | ENH-263 정정 |
| agent `hooks:` frontmatter | **0건** | F1 무영향 (ENH-256 YAGNI FAIL) |
| `context: fork` 사용 skill | **1건** (`skills/zero-script-qa/SKILL.md:10-11`) | ENH-253 P0 대상 단일화 |
| MCP `resources/templates/list` | **미구현** (bkit-pdca, bkit-analysis 모두) | I2 측정 불가 (ENH-257 YAGNI FAIL) |
| `DANGEROUS_PATTERNS` | `scripts/config-change-handler.js:17-24` 5항목 확인 | ENH-254 이중 방어선 기반 |
| bkit skills 경로 | `${CLAUDE_PLUGIN_ROOT}/skills/` (plugin 번들) | #51234 `~/.claude/skills/` 무영향 |

### 4.3 ENH 기회 목록 (ENH-253 ~ ENH-263, 9건 할당, 256/257 YAGNI FAIL 기록)

| ENH | Priority | CC 근거 | bkit 영향 | 영향 파일 |
|-----|----------|--------|----------|----------|
| **ENH-253** | **P0** | #51165 `context:fork`+`disable-model-invocation` 실패 | `zero-script-qa` 투자 보호 (ENH-196/202) | `skills/zero-script-qa/SKILL.md:10-11` + L3 회귀 TC 신설 |
| **ENH-254** | **P0** | v2.1.116 S1 + v2.1.113 #23 | `DANGEROUS_PATTERNS` 이중 방어선 공식 문서화 | `scripts/config-change-handler.js:17-24`, `docs/03-analysis/security-architecture.md` (신설) |
| **ENH-258** | **P1** | v2.1.116 B12 | ENH-231 `/tui` 호환 검증 재실행 | `lib/ui/ansi.js:20-26`, `test/l2-integration/tui-worktree.test.js` (신설) |
| **ENH-259** | **P1** | #51234 | 사용자 custom skill 손실 경고 (bkit 자체 무영향) | `docs/CUSTOMIZATION-GUIDE.md`, `README.md` |
| **ENH-255** | **P2** (강등) | v2.1.116 I1+B10 | `/resume` 장기세션 자동 수혜 벤치 | `docs/03-analysis/long-session-performance.md` (신설) |
| **ENH-260** | **P2** | MON-CC-06 확장 | 10→16건 추적 (#51165/#51234/#51266/#51275/#51391/#50974 편입) | `memory/MEMORY.md` MON 섹션 |
| **ENH-263** | **P2** (신설) | 실측 불일치 발견 | `plugin.json` description "38 Skills, 36 Agents" → "39 Skills, 36 Agents" + MEMORY 일괄 정정 | `.claude-plugin/plugin.json`, `memory/MEMORY.md` |
| **ENH-261** | **P3** (강등) | v2.1.116 B4 | `npx`/`bun run` wrapper 가이드 | `README.md` Troubleshooting |
| **ENH-262** | **P3** | v2.1.116 I8 | agent backoff 패턴 명시 | `agents/cc-version-researcher.md`, `agents/pm-research.md` |
| ~~ENH-256~~ | **YAGNI FAIL** | v2.1.116 F1 | 36 agents `hooks:` 0건 사용, pain 없음 | — |
| ~~ENH-257~~ | **YAGNI FAIL** | v2.1.116 I2 | bkit MCP `resources/templates/list` 미구현 | — |

### 4.4 파일 영향 매트릭스

| 파일 | 변경 유형 | ENH 참조 | 테스트 영향 |
|------|----------|----------|-----------|
| `skills/zero-script-qa/SKILL.md` | 검증 (변경 없음) | ENH-253 | **L3 회귀 TC 1건 신설** |
| `test/l3-regression/zero-script-qa-fork.test.js` | **신설** (~60 LOC) | ENH-253 | L3 |
| `scripts/config-change-handler.js` | 주석 보강 (17-24) | ENH-254 | 기존 L1 통과 |
| `docs/03-analysis/security-architecture.md` | **신설** | ENH-254 | 문서 |
| `lib/ui/ansi.js` | 재검증 (20-26, 변경 없음) | ENH-258 | **L2 통합 TC 1건 신설** |
| `test/l2-integration/tui-worktree.test.js` | **신설** | ENH-258 | L2 |
| `docs/CUSTOMIZATION-GUIDE.md` | 섹션 추가 | ENH-259 | 문서 |
| `README.md` | Troubleshooting 2건 | ENH-259, ENH-261 | 문서 |
| `docs/03-analysis/long-session-performance.md` | **신설** | ENH-255 | 문서 |
| `memory/MEMORY.md` | MON-CC-06 확장 + skills/agents 정정 | ENH-260, ENH-263 | 메모리 |
| `.claude-plugin/plugin.json` | description 정정 | ENH-263 | 문서 |
| `agents/cc-version-researcher.md` | description 주석 | ENH-262 | 문서 |
| `agents/pm-research.md` | description 주석 | ENH-262 | 문서 |

### 4.5 철학 준수 검증

| ENH | Automation First | No Guessing | Docs=Code | 판정 |
|-----|-----------------|-------------|-----------|------|
| ENH-253 | ✅ L3 회귀 TC 자동화 | ✅ #51165 실측 | ✅ SKILL.md↔TC | ✅ PASS |
| ENH-254 | ✅ ConfigChange hook | ✅ CC 공식 fix 참조 | ✅ 주석↔문서 | ✅ PASS |
| ENH-258 | ✅ L2 통합 TC | ✅ B12 fix 검증 | ✅ lib↔TC | ✅ PASS |
| ENH-259 | ⚠️ 문서만 | ✅ #51234 참조 | ✅ 명시 | ✅ PASS |
| ENH-255 | ✅ 벤치 자동화 | ✅ 실측 데이터 | ✅ 분석 문서 | ✅ PASS |
| ENH-260 | ⚠️ 메모리 갱신 | ✅ 이슈 번호 추적 | ✅ MON 명시 | ✅ PASS |
| ENH-263 | ⚠️ 문서 정정 | ✅ Glob 실측 기반 | ✅ 3중 동기화 | ✅ PASS |
| ENH-261 | ⚠️ 문서만 | ✅ B4 참조 | ✅ README | ✅ PASS |
| ENH-262 | ⚠️ 주석만 | ✅ I8 참조 | ✅ agent 주석 | ✅ PASS |

**전체 판정**: 9 ENH 모두 3원칙 준수.

---

## 5. 호환성 평가

### 5.1 호환성 매트릭스

| CC 버전 | bkit 호환 | 비고 |
|---------|----------|------|
| v2.1.114 | ✅ 완전 호환 | CTO Team crash fix, 이전 추천 최소 |
| v2.1.115 | — | **미발행** (8번째 스킵: 82/93/95/99/102/103/106/115) |
| **v2.1.116** | ✅ **완전 호환** (**74 연속, 조건부**) | Breaking 0, S1 보안 강화 + B8/B10 안정성 |

### 5.2 연속 호환 릴리스

```
v2.1.34 ──────────────────────────────────── v2.1.116
         74개 연속 호환 릴리스 (조건부, v2.1.115 스킵 포함)
         bkit 기능 코드 Breaking: 0건
         조건부 유지 사유:
           • MON-CC-02 #47855 (ENH-247 실측 대기)
           • ENH-214 #47482 (8 릴리스 연속 OPEN)
           • MON-CC-06 (10건 → 16건 확장, v2.1.116 공식 수정 0건)
         환경 제약 지속: macOS 11 이하 / AVX 미지원 CPU / Windows 괄호 PATH
```

### 5.3 추천 CC 버전

- **최소**: v2.1.114 (CTO Team crash fix 필수)
- **추천 (2026-04-21)**: **v2.1.116** (S1 보안 + I1/B10 `/resume` 안정성 + B8 병렬 400 fix)
- **최적**: **v2.1.116** (현재 기준 최신, v2.1.115 미발행)

**환경별 예외** (v2.1.113 이후 변화 없음)
- macOS 11 이하 → **v2.1.112 고정** (#50383 dyld 회귀)
- non-AVX CPU → **v2.1.112 고정** (#50384/#50852 SIGKILL)
- Windows 괄호 PATH → **v2.1.114+** (B12 worktree 안정성 일부 개선, 여전히 제한)

---

## 6. 브레인스토밍 결과 (Plan Plus)

### 6.1 의도 탐색

| 질문 | 답변 |
|------|------|
| 이 업그레이드의 핵심 목표는? | (1) S1 + DANGEROUS_PATTERNS 이중 방어선 공식화, (2) `/resume` 67% 가속 자동 수혜, (3) #51165 fork 회귀 실측으로 ENH-196 투자 보호 |
| 가장 큰 리스크는? | MON-CC-06 네이티브 바이너리 회귀 **10→16건 확장**, v2.1.116 공식 수정 **0건**. `v2.1.117+` hotfix 대기 지속 |
| 놓치기 쉬운 기회는? | **B8 cache TTL ordering fix**는 CTO Team 병렬 spawn 안정성 숨은 보강. **B12 worktree `/tui` fix**는 ENH-231 재실행 트리거 |

### 6.2 대안 탐색 (P0 2건)

| 접근법 | 장점 | 단점 | 선택 |
|--------|------|------|------|
| ENH-253 A: 수동 재현만 | 최소 공수 | ENH-196/202 투자 재실패 시 재발 방지 불가 | ❌ |
| **ENH-253 B: 수동 + L3 회귀 TC 1건** | 재발 방지 + 자동화 | 2~3h 공수 | ✅ **선택** |
| ENH-253 C: 전 platform matrix | 완전 커버리지 | bkit CI 리소스 부재 | ❌ YAGNI |
| ENH-254 A: 주석 1줄만 | 15min | 보안 아키텍처 전체 컨텍스트 부재 | ❌ |
| ENH-254 B: 주석 + fix URL | 45min | 구조적 문서화 여전히 부재 | ❌ |
| **ENH-254 C: 주석 + defense-in-depth 다이어그램 문서** | 구조적 문서화, v2.1.113/116 연속 대응 | 1.5h | ✅ **선택** |

### 6.3 YAGNI 검토

| ENH | 필요성 | 판정 | 근거 |
|-----|--------|------|------|
| ENH-253 | ✅ ENH-196/202 투자 훼손 방지 | **PASS P0** | zero-script-qa 단일 fork 사용자 보호 |
| ENH-254 | ✅ 보안 아키텍처 정합성 | **PASS P0** | v2.1.113/116 연속 보안 fix 대응 |
| ENH-258 | ✅ ENH-231 투자 재검증 | **PASS P1** | 현재 worktree 활성 + TUI 호환 실측 |
| ENH-259 | ✅ 데이터 손실 불가역 | **PASS P1** | 사용자 custom skill 보호 문서만이라도 필요 |
| ENH-255 | ⚠️ 자동 수혜, 벤치 선택적 | **PASS P2 (강등)** | 가치는 있으나 P1 자리 할양 |
| ENH-260 | ✅ MON 대시보드 유지 | **PASS P2** | 16건 통합 추적 운영 편의 |
| ENH-263 | ✅ Docs=Code 위반 정정 | **PASS P2** | 3중 오기 (plugin.json + MEMORY) 1회 정리 |
| ENH-261 | ⚠️ bun 사용자 비율 낮음 | **PASS P3 (강등)** | 저비용 0.5h, 관찰 가치 |
| ENH-262 | ⚠️ gh 의존 미확정 | **PASS P3** | agent 주석 0.5h |
| ~~ENH-256~~ F1 agent hooks | ❌ 36 agents 전부 미사용 | **YAGNI FAIL** | pain 없음, 기회 불명 |
| ~~ENH-257~~ I2 MCP cold-start | ❌ resources/templates/list 미구현 | **YAGNI FAIL** | 측정 대상 없음 |
| I7 plugin deps 자동설치 | ❌ bkit self-contained | **YAGNI FAIL** | dependencies 선언 없음 |
| #51021 MCP Linux hang | ❌ Playwright 미사용 | **YAGNI FAIL** | 실측 전 예방 ENH 불필요 |
| MON-CC-07 신설 | ❌ MON-CC-06 통합 우수 | **YAGNI FAIL** | 단일 대시보드 운영 편의 |

---

## 7. 구현 제안

### 7.1 우선순위별 구현 로드맵

#### P0 (즉시 구현, 2건)

| ENH | 설명 | 공수 |
|-----|------|------|
| ENH-253 | #51165 context:fork + disable-model-invocation 회귀 재현 검증 (zero-script-qa) + L3 TC | 2~3h |
| ENH-254 | S1 + DANGEROUS_PATTERNS 이중 방어선 문서화 | 1.5h |
| **P0 합계** | | **3.5 ~ 4.5h** |

#### P1 (이번 사이클, 2건)

| ENH | 설명 | 공수 |
|-----|------|------|
| ENH-258 | B12 worktree `/tui` fix → ENH-231 재검증 + L2 TC | 2h |
| ENH-259 | #51234 custom skill 손실 경고 + 백업 가이드 | 1.5h |
| **P1 합계** | | **3.5h** |

#### P2 (다음 사이클, 3건)

| ENH | 설명 | 공수 |
|-----|------|------|
| ENH-255 | I1/B10 `/resume` 장기세션 벤치 | 2h |
| ENH-260 | MON-CC-06 10→16건 확장 (메모리 즉시) | 1h |
| ENH-263 | plugin.json 39 skills / 36 agents 정정 + MEMORY 일괄 | 0.5h |
| **P2 합계** | | **3.5h** |

#### P3 (백로그, 2건)

| ENH | 설명 | 비고 |
|-----|------|------|
| ENH-261 | B4 `npx`/`bun run` wrapper 가이드 | 수요 관찰 |
| ENH-262 | I8 gh rate-limit agent 주석 | 의존 확인 후 |

**전체 총 공수**: **11.5 ~ 12.5h** (P0 3.5~4.5h + P1 3.5h + P2 3.5h + P3 1h)

### 7.2 테스트 계획

| ENH | 테스트 유형 | 대상 파일 | TC 수 |
|-----|-----------|----------|-------|
| ENH-253 | L3 회귀 | `test/l3-regression/zero-script-qa-fork.test.js` | **1건 신설** |
| ENH-254 | L1 유닛 | `test/l1-unit/config-change-handler.test.js` | 기존 통과 재확인 |
| ENH-258 | L2 통합 | `test/l2-integration/tui-worktree.test.js` | **1건 신설** |
| **신규 TC 합계** | | | **2건** (P0 1건 + P1 1건) |

---

## 8. GitHub Issues 모니터링

### 8.1 기존 모니터링 항목 상태 (v2.1.116 기준)

| Issue # | 제목 | 상태 | bkit 대응 |
|---------|------|------|----------|
| **#47855** | Opus 1M `/compact` block | **OPEN 유지** (v2.1.113 #32 fix 후 무 활동, reporter duplicate 반박) | **MON-CC-02 유지, ENH-247 실측 대기, ENH-232 PreCompact 방어 유지** |
| **#47482** | Output styles YAML frontmatter 미주입 | **OPEN 8 릴리스 연속** | ENH-214 방어 유지 |
| **#47828** | SessionStart systemMessage + remoteControl | **OPEN 6 릴리스 연속** | bkit 미사용 확인, 관찰만 |
| **#50952** | Opus 4.7 `docker rm` destructive | OPEN 유지 | S1은 `/`/$HOME 전용, docker 미커버 — security skill 방어선 모니터링 |

### 8.2 MON-CC-06 확장 (**10 → 16건**)

**v2.1.113 시점 10건 (OPEN 유지)**:
- #50274 (native binary 세션 종료), #50383 (macOS 11 dyld), #50384 (non-AVX SIGILL, API 응답 실패 재조사 필요), #50541 (Windows 괄호 PATH), #50609 (OTLP exporter 미번들), #50616 (Windows hang), #50618 (macOS 26 Gatekeeper SIGKILL), #50640 (Windows 11 Segfault), #50567 (postinstall 실패), #50852 (non-AVX)

**v2.1.114~v2.1.116 신규 편입 6건**:

| Issue | 심각도 | 편입 사유 |
|-------|--------|---------|
| **#51165** | HIGH | `context:fork` + `disable-model-invocation` 실패 — bkit zero-script-qa 직접 위협 (ENH-253 P0) |
| **#51234** | HIGH | `~/.claude/skills/` first-run 삭제 — 사용자 custom skill 손실 (ENH-259 P1) |
| **#51266** | HIGH | `vendor/ripgrep` 미생성 (`ignore-scripts=true` 환경) — Grep tool 불능 |
| **#51275** | HIGH | Windows EEXIST on every API call — `.claude` recursive mkdir 누락 |
| **#51391** | HIGH | 병렬 read 데이터 스왑 (MON-CC-07 신설 대신 통합) |
| **#50974** | HIGH | v2.1.112+ npm postinstall 미완료 — ENH-245 연결 |

### 8.3 신설/해제 MON

- **신설**: 없음 (MON-CC-07 #51391 판정: MON-CC-06 통합)
- **해제**: 없음 (MON-CC-01, MON-CC-05 이전 해제 유지)

---

## 9. 결론 (Verdict)

### 9.1 최종 판정

- **호환성**: ✅ **PASS** (조건부 — MON-CC-06 16건 방어 전제)
- **업그레이드 권장**: ✅ **YES** (CONDITIONAL — 환경 제약 사용자 v2.1.112 고정)
- **bkit 버전 업데이트 필요**: ✅ **YES** (**v2.1.10**, P0 2건 + P2 정정 반영)

### 9.2 핵심 권고사항

1. **ENH-253 P0 즉시 실행**: #51165 `context: fork` 회귀를 `zero-script-qa` 환경에서 실측. 재현 시 ENH-196/202 투자 블로킹 알림 + 완화책 검토. L3 회귀 TC 1건 신설로 재발 방지.
2. **ENH-254 P0 defense-in-depth 문서화**: `scripts/config-change-handler.js:17-24` 주석 + `docs/03-analysis/security-architecture.md` 신설로 CC 런타임 방어(S1/#23)와 bkit 설정 방어(DANGEROUS_PATTERNS) 이중 레이어 공식화. 사용자가 어느 한쪽에 의존하지 않도록.
3. **MON-CC-06 즉시 확장 (ENH-260)**: 10→16건으로 `memory/MEMORY.md` 갱신. v2.1.117+ hotfix 대기 권고 지속.
4. **v2.1.114 → v2.1.116 권장 승격**: 현재 최신. S1 보안 강화 + `/resume` 67% 가속 + B8/B10 안정성 가치.
5. **ENH-263 Docs=Code 즉시 정정**: `plugin.json` description "38 Skills, 36 Agents" → "**39** Skills, 36 Agents", MEMORY.md "37 Skills, 32 Agents" → "**39** Skills, **36** Agents". ENH-241 교차 검증 스킴의 첫 실적용 사례.

### 9.3 다음 단계

- [ ] ENH-253 P0 실측 (`zero-script-qa` fork 재현)
- [ ] ENH-254 P0 `docs/03-analysis/security-architecture.md` 신설
- [ ] ENH-258 P1 `test/l2-integration/tui-worktree.test.js` 신설 + ENH-231 재검증
- [ ] ENH-259 P1 `docs/CUSTOMIZATION-GUIDE.md` + `README.md` custom skill 경고
- [ ] ENH-260 P2 `memory/MEMORY.md` MON-CC-06 16건 확장 **즉시**
- [ ] ENH-263 P2 `plugin.json` + MEMORY 일괄 정정 **즉시**
- [ ] ENH-255 P2 `docs/03-analysis/long-session-performance.md` 벤치
- [ ] `bkit.config.json` CC 추천 버전 v2.1.114+ → **v2.1.116+** 업데이트
- [ ] `memory/cc_version_history_v2115_v2116.md` 신규 생성 (v2.1.115 스킵 + v2.1.116 24건)
- [ ] 연속 호환 릴리스 카운트 **74개 연속 (v2.1.34~v2.1.116, 조건부)** 업데이트

---

## Appendix A — Confidence & Open Questions

**Phase 1 Research Confidence**: **88%** (v2.1.115 미발행 4중 교차 검증, v2.1.116 24 bullets 완전 수집, 시스템 프롬프트 실측 미실시, #50384 API 응답 실패)
**Phase 2 Analysis Confidence**: **92%** (agent/skill 수 실측 완료, context:fork 1건 단일화 확인, MCP templates/list 미구현 확인, DANGEROUS_PATTERNS 라인 확인)

**Open Questions**
1. **ENH-253 #51165 macOS 재현 여부** — reporter Windows 한정 단언 가능한가? cross-platform 재현 시 P0 확장 필요.
2. **시스템 프롬프트 v2.1.114 → v2.1.116 토큰 증감 실측** — CHANGELOG 미명시지만 v2.1.104 heading-rename 전례 존재. `/context` 스냅 베이스라인 권고.
3. **#50384 non-AVX SIGILL 상태** — API 응답 실패로 MON-CC-06 내 1건 TBD. 재조사 필요.
4. **#51388 "SKILL.md 하드 제약이 연속 slash-command 호출 간 무시됨" CLOSED 사유** — not_planned vs fixed 불명. bkit 37/39 skills 제약 준수 영향 확인 필요.
5. **v2.1.117+ hotfix 로드맵** — MON-CC-06 16건 공식 수정 언제? Anthropic 신호 지속 모니터링.

**첨부 아티팩트**
- Phase 1 Research 원본: `/private/tmp/claude-501/.../tasks/a16fb3a84e728f8cb.output` (371s, 55K tokens)
- Phase 2 Analyst 원본: `/private/tmp/claude-501/.../tasks/a08a34d57bb40f17d.output` (211s, 45K tokens)
- 이전 분석: `docs/04-report/features/cc-v2112-v2114-impact-analysis.report.md` (ENH-245~252)
