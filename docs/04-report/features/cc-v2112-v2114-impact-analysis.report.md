# CC v2.1.112 → v2.1.114 영향 분석 및 bkit 개선 보고서

> **Status**: ✅ Complete (Analysis-Only, 구현 전)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.8
> **Author**: CTO Team (cc-version-researcher + bkit-impact-analyst + Plan Plus)
> **Date**: 2026-04-20
> **PDCA Cycle**: cc-version-analysis (v2.1.113~v2.1.114)
> **분석 기반**: Phase 1 (Research, 240s, 50K tokens) + Phase 2 (Analyst, 306s, 66K tokens) + Phase 3 (Plan Plus)

---

## 1. Executive Summary

### 1.1 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **분석 대상** | Claude Code CLI v2.1.112 → v2.1.114 |
| **분석 범위** | 릴리스 2개 (v2.1.113, v2.1.114) — v2.1.112는 이전 분석 완료 |
| **시작일** | 2026-04-20 |
| **완료일** | 2026-04-20 |
| **기간** | ~15분 (Phase 1 + Phase 2 병렬 실행) |

### 1.2 성과 요약

```
┌──────────────────────────────────────────────┐
│  분석 완료율: 100%                            │
├──────────────────────────────────────────────┤
│  📊 총 변경사항:  41건 (v2.1.113 40 + v2.1.114 1) │
│  🔴 HIGH 영향:    6건                         │
│  🟡 MEDIUM 영향:  8건                         │
│  🟢 LOW 영향:     27건                        │
│  🆕 ENH 기회:     8건 (ENH-245 ~ ENH-252)     │
│  ❌ YAGNI FAIL:   6건                         │
│  ✅ 연속 호환:    73 릴리스 (조건부 유지)      │
└──────────────────────────────────────────────┘
```

### 1.3 전달된 가치 (4-Perspective)

| 관점 | 내용 |
|------|------|
| **Technical** | v2.1.113 대형 구조 변경(네이티브 바이너리 전환) + 보안 강화 5건 + v2.1.114 CTO Team crash 핫픽스에 대한 bkit 영향 완전 매핑 |
| **Operational** | 환경 제약 사용자(macOS 11/AVX 미지원/Windows 괄호 PATH) 식별 및 fallback 경로 제공 방안 확보 |
| **Strategic** | 회귀 카운트 5건→3건 감소, #47855 MON-CC-02 잠정 해결 후보 확인, ENH-230/232 투자 보호 재검증 |
| **Quality** | `dangerouslyDisableSandbox` 보안 우회 수정이 bkit 방어선(DANGEROUS_PATTERNS) 가치 강화 확인 |

---

## 2. 관련 문서

| Phase | 문서 | 상태 |
|-------|------|------|
| Research | CC v2.1.113~v2.1.114 변경사항 조사 (Phase 1 결과 본 보고서 섹션 3) | ✅ |
| Impact | bkit 영향 분석 (Phase 2 결과 본 보고서 섹션 4) | ✅ |
| Plan | `docs/01-plan/features/cc-v2112-v2114-impact-analysis.plan.md` | ✅ |
| Report | 본 문서 | ✅ |

---

## 3. CC 버전 변경사항 조사

### 3.1 릴리스 요약

| 버전 | 릴리스일 (UTC) | 주요 변경 | 변경 수 | 스킵 여부 |
|------|---------|----------|---------|---------|
| v2.1.113 | 2026-04-17 19:34 | 네이티브 바이너리 전환 + Bash 보안 강화 + compact/recap 수정 | 40 | ❌ 발행됨 (3중 교차검증 완료) |
| v2.1.114 | 2026-04-18 01:34 | Agent teams permission dialog crash 핫픽스 | 1 | ❌ 발행됨 |

### 3.2 Breaking Changes (환경 요구사항 변경)

| 변경사항 | 영향도 | bkit 영향 | 마이그레이션 |
|---------|--------|----------|-------------|
| **네이티브 바이너리 per-platform optional dep** (v2.1.113 #1) | HIGH | **간접** — bkit 실행 경로 무관 (`hooks.json` 22건 `node ${CLAUDE_PLUGIN_ROOT}/...` 직접 spawn), **환경 요구사항 추가** | ENH-245 문서화 (macOS 12+, AVX CPU, Windows 괄호 PATH 주의) |

### 3.3 신규 기능 (bkit 관련만)

| 기능 | 설명 | bkit ENH 기회 |
|------|------|--------------|
| `sandbox.network.deniedDomains` 설정 | allowedDomains 와일드카드 우회 차단 | **ENH-248** (사용자 프로젝트 가이드, bkit 자체 미사용) |

### 3.4 버그 수정 (bkit 관련 HIGH/MEDIUM)

| 이슈 | 설명 | bkit 영향 |
|------|------|----------|
| v2.1.113 #23 | `Bash dangerouslyDisableSandbox` 권한 프롬프트 없이 sandbox 밖 실행되던 버그 수정 | **간접 자동 수혜** — bkit `config-change-handler.js:19` DANGEROUS_PATTERNS 방어선 가치 강화 |
| v2.1.113 #14 | macOS `/private/{etc,var,tmp,home}` `Bash(rm:*)` 위험 제거 대상 | 무영향 — bkit `Bash(rm:*)` 미사용 |
| v2.1.113 #15 | Bash deny rule이 `env`/`sudo`/`watch`/`ionice`/`setsid` wrapper 매칭 | **간접 자동 수혜** — `Bash(rm -rf*)=deny`가 `env rm -rf /` 우회 차단 |
| v2.1.113 #16 | `Bash(find:*)` allow 하의 `-exec`/`-delete` 자동 승인 중단 | 무영향 — bkit `Bash(find:*)` 미사용 |
| v2.1.113 #32 | 재개된 long-context 세션 `/compact` 실패 수정 | **직접 수혜** — **#47855 MON-CC-02 잠정 해결 후보**, ENH-232 PreCompact 방어 재검증 필요 |
| v2.1.113 #11 | subagent 스트림 중단 10분 timeout | 간접 자동 수혜 — bg agent 안정성 |
| v2.1.113 #17 | MCP 동시 호출 watchdog 수정 | 간접 자동 수혜 — bkit-pdca/bkit-analysis 2 MCP |
| v2.1.113 #20 | Session recap auto-fire 수정 | **직접 수혜** — ENH-230 `/recap` 방어 투자 보호 |
| v2.1.113 #22 | subagent viewing 중 메시지 오귀속 수정 | 간접 자동 수혜 — CTO Team 세션 정확성 |
| v2.1.113 #33 | plugin install range-conflict 리포트 | 간접 — ENH-139/191 freshness 정합성 |
| **v2.1.114 #1** | **Agent teams 팀메이트 권한 요청 permission dialog crash** | **직접 자동 수혜** — bkit CTO Team 12명 (cto-lead + 11 experts) |

### 3.5 시스템 프롬프트 변경

| 항목 | 변경 전 | 변경 후 | 토큰 변화 |
|------|--------|--------|----------|
| CHANGELOG상 SP 변경 명시 | 없음 | 없음 | **TBD** (실측 권고, Phase 1 Confidence §8 #1) |

### 3.6 Hook 이벤트 변경

| 이벤트 | 상태 | bkit 사용 여부 |
|--------|------|---------------|
| 신규 Hook event | **없음** (25개 공식 유지, bkit 구현 21개 유지) | — |
| Hook decision 신규 값 | **없음** (allow/deny/ask/defer 유지) | — |
| CC tools 증감 | **없음** (런타임 32, docs 35 유지) | — |

---

## 4. bkit 영향 분석

### 4.1 영향 요약

| 카테고리 | 건수 | HIGH | MEDIUM | LOW |
|---------|------|------|--------|-----|
| Breaking (환경) | 1 | 1 | 0 | 0 |
| Enhancement | 6 | 2 | 4 | 0 |
| Neutral (자동 수혜) | 6 | 0 | 4 | 2 |
| No Impact | 28 | 3 | 0 | 25 |

### 4.2 ENH 기회 목록 (ENH-245 ~ ENH-252, 8건)

| ENH | Priority | CC 기능 | bkit 영향 | 영향 파일 |
|-----|----------|--------|----------|----------|
| **ENH-245** | **P0** | 네이티브 바이너리 전환 (v2.1.113 #1) | 환경 요구사항 문서화 필요 | `README.md`, `plugin.json` engines, `docs/CUSTOMIZATION-GUIDE.md` |
| **ENH-246** | **P0** | `dangerouslyDisableSandbox` fix (v2.1.113 #23) | DANGEROUS_PATTERNS 경고 강도 상향 + 공식 fix 참조 | `scripts/config-change-handler.js:17-24` |
| **ENH-247** | **P0** | long-context `/compact` fix (v2.1.113 #32) | #47855 MON-CC-02 실측 검증 (ENH-232 판단 근거) | `scripts/context-compaction.js:44-56` (테스트만) |
| **ENH-248** | P1 | `sandbox.network.deniedDomains` 신설 | 사용자 프로젝트 채택 가이드 | `docs/bkit-auto-mode-workflow-manual.md` |
| **ENH-249** | P1 | 네이티브 바이너리 비호환 환경 | Troubleshooting fallback 가이드 (macOS 11/AVX/Windows) | `docs/` troubleshooting 신규 |
| **ENH-250** | P2 | Bash wrapper 감지 강화 (v2.1.113 #15) | PRD 예제 정리 (`Bash(sudo:*)` 사용 금지) | `docs/01-plan/features/bkit-v216-enhancement.plan.md:282` |
| **ENH-251** | P3 | Bash allow rule 보안 예제 (v2.1.113 #14/#16) | 금지 예제 스타일 가이드 | `docs/` style guide 신설 |
| **ENH-252** | P3 | Session recap auto-fire fix (v2.1.113 #20) | ENH-230 중첩 방어 투자 보호 관찰 | 관찰만 |

### 4.3 파일 영향 매트릭스

| 파일 | 변경 유형 | ENH 참조 | 테스트 영향 |
|------|----------|----------|-----------|
| `README.md` | Edit (환경 요구사항 섹션) | ENH-245 | — |
| `.claude-plugin/plugin.json` | Edit (engines 필드 추가 고려) | ENH-245 | — |
| `docs/CUSTOMIZATION-GUIDE.md` | Edit (환경 제약 섹션) | ENH-245 | — |
| `scripts/config-change-handler.js` | Edit (경고 메시지 강화) | ENH-246 | L2 TC 1건 추가 |
| `scripts/context-compaction.js` | **검증만** (수정 없음) | ENH-247 | L3 TC 1건 추가 (MON-CC-02 재현) |
| `docs/bkit-auto-mode-workflow-manual.md` | Edit (sandbox.deniedDomains 예제) | ENH-248 | — |
| `docs/` (신규) | New (troubleshooting 가이드) | ENH-249 | — |
| `docs/01-plan/features/bkit-v216-enhancement.plan.md` | Edit (line 282 정리) | ENH-250 | — |
| `MEMORY.md` | Edit (v2.1.113/114 히스토리 + ENH-245~252) | all | — |
| `memory/cc_version_history_v2113_v2114.md` | New (상세 변경 기록) | all | — |

### 4.4 철학 준수 검증

| ENH | Automation First | No Guessing | Docs=Code | 판정 |
|-----|-----------------|-------------|-----------|------|
| ENH-245 | N/A (문서) | 불확실 환경 명시 | plugin.json↔README 동기화 | ✅ PASS |
| ENH-246 | 경고 자동화 강화 | DANGEROUS_PATTERNS 명시 | scripts↔docs 양방향 | ✅ PASS |
| ENH-247 | TC 자동화 | fail-fast 테스트 | context-compaction.js↔plan | ✅ PASS |
| ENH-248 | 사용자측 자동화 가이드 | 명시적 deniedDomains 예제 | docs only | ✅ PASS |
| ENH-249 | 환경 진단 힌트 | 환경 검사 명시 | troubleshooting docs | ✅ PASS |
| ENH-250 | N/A | PRD 예제 정리 | plan.md:282 수정 | ✅ PASS |
| ENH-251 | N/A | 금지 사례 명시 | style guide 신설 | ✅ PASS |
| ENH-252 | 관찰만 | 측정 기준 명시 | changelog 항목 | ✅ PASS |

**전체 판정**: 8 ENH 모두 3원칙 준수 확인.

---

## 5. 호환성 평가

### 5.1 호환성 매트릭스

| CC 버전 | bkit 호환 | 테스트 결과 | 비고 |
|---------|----------|-----------|------|
| v2.1.111 | ✅ PASS | (이전 분석 승계) | 기존 권장 하한 |
| v2.1.112 | ✅ PASS | (이전 분석 승계) | 핫픽스 단건, bkit 무관 |
| v2.1.113 | ⚠️ **CONDITIONAL** | 조건부 PASS | macOS 12+, AVX CPU, Windows 괄호 PATH 제약 |
| **v2.1.114** | ✅ **PASS** (권장) | CTO Team crash 해결 자동 수혜 | **신규 권장 최소 버전** |

### 5.2 연속 호환 릴리스

```
v2.1.34 ──────────────────────────── v2.1.114
         73개 연속 호환 릴리스 (조건부)
         bkit 기능 코드 Breaking: 0건
         환경 요구사항 추가: macOS 12+ / AVX CPU / Windows PATH
         조건부 유지: ENH-245 문서화 완료 필요
```

### 5.3 추천 CC 버전

- **최소**: v2.1.111 (기존 권장, 회귀 4건 방어 완비 필요)
- **추천**: **v2.1.114+** (CTO Team crash 해결 포함)
- **최적**: **v2.1.114** (현재 최신, 대체재 없음)

**환경별 예외**
- macOS 11 이하 → **v2.1.112 이하 고정** (#50383 dyld 회귀)
- non-AVX CPU → **v2.1.112 이하 고정** (#50384, #50852 SIGKILL)
- Windows 괄호 PATH → v2.1.114 사용 가능하나 Bash 기능 제한 가능 (#50541)

---

## 6. 브레인스토밍 결과 (Plan Plus)

### 6.1 의도 탐색

| 질문 | 답변 |
|------|------|
| 이 업그레이드의 핵심 목표는? | (1) v2.1.113 보안 강화 5건 수혜, (2) v2.1.114 CTO Team crash 핫픽스 적용, (3) MON-CC-02 잠정 해결 실측 검증 |
| 가장 큰 리스크는? | 네이티브 바이너리 전환 회귀 10+건 → macOS 11/AVX/Windows 사용자 bkit 완전 차단 가능성 |
| 놓치기 쉬운 기회는? | Session recap fix (v2.1.113 #20)는 ENH-230 투자 보호 효과 무료 획득; MCP watchdog fix (#17)는 bkit 2 MCP 서버 stale session 자동 해결 |

### 6.2 대안 탐색 (P0 3건)

| 접근법 | 장점 | 단점 | 선택 |
|--------|------|------|------|
| ENH-245 A: `plugin.json` engines 필드만 | 최소 공수 | README에 환경 요구 부재 → 신규 사용자 진입 실패 | ❌ |
| **ENH-245 B: README + CUSTOMIZATION-GUIDE + engines 3중** | Docs=Code 준수, 사용자 인지율 ↑ | 공수 1.5h | ✅ **선택** |
| ENH-246 A: DANGEROUS_PATTERNS 주석만 추가 | 15min | v2.1.113 fix 컨텍스트 부재 | ❌ |
| **ENH-246 B: 경고 레벨 상향 + fix 참조 + scripts↔docs** | 방어선 가치 명시 | 1h | ✅ **선택** |
| **ENH-247 A: 수동 재현 1회 실측** | YAGNI 최소 비용 | 재현 불안정 리스크 | ✅ **선택** (TC 1건 추가는 선택적) |
| ENH-247 B: L3 회귀 TC 자동화 | 재발 방지 보장 | 3h+, Opus 1M 환경 요구 | ❌ |

### 6.3 YAGNI 검토

| ENH | 필요성 | 판정 | 근거 |
|-----|--------|------|------|
| ENH-245 | ✅ 환경 차단 리스크 (10+ 회귀 이슈) | **PASS P0** | 신규 사용자 진입 실패 직접 방지 |
| ENH-246 | ✅ 보안 방어선 강화 | **PASS P0** | DANGEROUS_PATTERNS 기존 5건 중 dangerouslyDisableSandbox 최우선 |
| ENH-247 | ✅ ENH-232 투자 보호 결정 근거 | **PASS P0** | MON-CC-02 해결 시 방어 해제 판단 |
| ENH-248 | ✅ 사용자 프로젝트 보안 가이드 | **PASS P1** | bkit 자체 미사용이나 fullstack 예제 가치 |
| ENH-249 | ✅ #50383/#50384 사용자 유입 대비 | **PASS P1** | 환경 진단 힌트 |
| ENH-250 | ✅ PRD 문서 혼선 제거 | **PASS P2** | `Bash(sudo:*)` 예제 1회성 정리 |
| ENH-251 | ⚠️ 재발 방지 스타일 가이드 | **PASS P3** | 수요 불명, 관찰 대기 |
| ENH-252 | ⚠️ ENH-230 관찰만 | **PASS P3** | 측정 비용 낮음 |
| ENH-253 (Phase 2 초안) | ❌ MCP watchdog 효과 측정 | **YAGNI FAIL** | 측정 비용 > 가치, 자동 수혜 |
| Matrix #11/#14/#16/#33 | ❌ 자동 수혜 또는 미사용 | **YAGNI FAIL** | 개별 대응 불필요 |
| v2.1.114 #1 | ❌ 자동 수혜 | **YAGNI FAIL** | 코드 수정 불필요, 권장 버전 승격만 |

---

## 7. 구현 제안

### 7.1 우선순위별 구현 로드맵

#### P0 (즉시 구현, 3건)

| ENH | 설명 | 예상 작업량 |
|-----|------|-----------|
| ENH-245 | 최소 요구사항 문서화 (macOS 12+ / AVX CPU / Windows) | 1.5h |
| ENH-246 | DANGEROUS_PATTERNS 경고 강도 상향 + v2.1.113 fix 참조 | 1h |
| ENH-247 | #47855 MON-CC-02 v2.1.113 fix 실측 (수동 1회) | 1h (TC 추가 시 +2h) |
| **P0 합계** | | **3.5h ~ 5.5h** |

#### P1 (이번 사이클, 2건)

| ENH | 설명 | 예상 작업량 |
|-----|------|-----------|
| ENH-248 | sandbox.network.deniedDomains 채택 가이드 | 1.5h |
| ENH-249 | 네이티브 바이너리 비호환 환경 troubleshooting | 2h |
| **P1 합계** | | **3.5h** |

#### P2 (다음 사이클, 1건)

| ENH | 설명 | 예상 작업량 |
|-----|------|-----------|
| ENH-250 | bkit-v216-enhancement.plan.md:282 Bash(sudo:*) 예제 정리 | 1h |

#### P3 (백로그, 2건)

| ENH | 설명 | 비고 |
|-----|------|------|
| ENH-251 | 금지 Bash allow rule 예제 스타일 가이드 | 수요 발생 시 |
| ENH-252 | ENH-230 투자 보호 관찰 | 지속 모니터링 |

**전체 총 공수**: **9h ~ 11h** (P0 3.5~5.5h + P1 3.5h + P2 1h + P3 1h 관찰)

### 7.2 테스트 계획

| ENH | 테스트 유형 | 대상 파일 | TC 수 |
|-----|-----------|----------|-------|
| ENH-246 | L2 Integration | `scripts/config-change-handler.js` | 1건 (경고 상향 검증) |
| ENH-247 | L3 Hook E2E (선택적) | `scripts/context-compaction.js:44-56` | 1건 (MON-CC-02 재현) |
| ENH-249 | L5 Runtime Matrix | 환경별 smoke | 3건 (macOS 11, AVX, Windows 괄호 PATH) |
| **신규 TC 합계** | | | **5건** (P0~P1 범위) |

---

## 8. GitHub Issues 모니터링

### 8.1 관련 Open Issues

| Issue # | 제목 | 영향도 | bkit 대응 |
|---------|------|--------|----------|
| #47855 | Opus 1M context `/compact` block | MEDIUM | **ENH-247 실측 검증 대기** (v2.1.113 #32 잠정 해결 후보) |
| #47482 | Output styles YAML frontmatter 미주입 | LOW | ENH-214 방어 유지 |
| #47828 | SessionStart systemMessage+remoteControl | LOW | bkit 미사용 확인, 해제 고려 |
| #50274 | v2.1.113 native binary Windows 세션 종료 | HIGH | ENH-245/249 문서 대응 |
| #50383 | macOS 11 dyld 심볼 오류 | HIGH | ENH-245/249 (macOS 12+ 요구) |
| #50384 | AVX-less CPU 크래시 | HIGH | ENH-245/249 (AVX 필수) |
| #50541 | Windows 괄호 PATH Bash 실패 | MEDIUM | ENH-249 Windows 주의 |
| #50618 | macOS 26 Gatekeeper SIGKILL 병렬 | HIGH | ENH-249 CTO Team 주의 |
| #50640 | v2.1.112+ Windows 11 segfault | HIGH | ENH-249 Windows 주의 |
| #50952 | Opus 4.7 `docker rm` destructive | MEDIUM | security skill 방어선 모니터링 |

### 8.2 관련 Closed Issues (이번 버전)

| Issue # | 제목 | 해결 버전 | bkit 영향 |
|---------|------|----------|----------|
| #47810 | skip-perm + PreToolUse bypass | CLOSED (duplicate, 2026-04-14) | **MON-CC-01 해제** |
| #48963 | Plugin skills `/` 메뉴 미표시 (Desktop) | CLOSED (v2.1.113 또는 v2.1.114) | **MON-CC-05 해제** |

### 8.3 신설 모니터링 (MON-CC-06)

**MON-CC-06**: v2.1.113 네이티브 바이너리 전환 회귀 10+건 통합 추적 (#50274/#50383/#50384/#50609/#50616/#50618/#50640/#50852/#50567/#50541). Anthropic 후속 핫픽스 릴리스(v2.1.115+) 시점까지 사용자 보고 유입 모니터링.

---

## 9. 결론 (Verdict)

### 9.1 최종 판정

- **호환성**: ✅ **PASS** (조건부 — ENH-245 문서화 선결)
- **업그레이드 권장**: ✅ **YES** (CONDITIONAL — 환경 제약 사용자 v2.1.112 고정)
- **bkit 버전 업데이트 필요**: ✅ **YES** (v2.1.9, P0 3건 반영)

### 9.2 핵심 권고사항

1. **ENH-245 P0 즉시 구현**: README/CUSTOMIZATION-GUIDE에 macOS 12+/AVX CPU/Windows 괄호 PATH 요구사항 명시. 신규 사용자 진입 실패 방지 (신규 회귀 10+건 리스크 대응).
2. **ENH-246 P0 보안 방어 강화**: `config-change-handler.js:17-24` DANGEROUS_PATTERNS 경고를 v2.1.113 #23 공식 fix와 연결하여 경고 강도 상향. bkit 보안 아키텍처 정합성 강화.
3. **ENH-247 P0 MON-CC-02 실측**: Opus 1M + `/compact` 재현 1회로 #47855 잠정 해결 확인. 확인 시 ENH-232 PreCompact 방어를 "투자 보호"에서 "상시 방어"로 재분류.
4. **권장 CC 버전 v2.1.114+ 승격**: CTO Team 12명 crash 수혜, 연속 호환 73 릴리스 조건부 유지.
5. **회귀 카운트 5→3 감소 반영**: MON-CC-01/05 해제, MON-CC-02/ENH-214/#47828 유지, MON-CC-06 신설.

### 9.3 다음 단계

- [ ] ENH-245 P0 즉시 구현 (README + plugin.json + CUSTOMIZATION-GUIDE)
- [ ] ENH-246 P0 DANGEROUS_PATTERNS 경고 강화
- [ ] ENH-247 P0 MON-CC-02 실측 검증 (Opus 1M + /compact 재현)
- [ ] `bkit.config.json` CC 추천 버전 v2.1.111+ → **v2.1.114+** 업데이트
- [ ] MEMORY.md CC 버전 히스토리 + ENH-245~252 등록
- [ ] `memory/cc_version_history_v2113_v2114.md` 신규 생성
- [ ] 연속 호환 릴리스 카운트 **73개 연속 (v2.1.34~v2.1.114, 조건부)** 업데이트
- [ ] Plan 문서(`docs/01-plan/features/cc-v2112-v2114-impact-analysis.plan.md`) 기반 Design/Do 진입

---

## Appendix A — Confidence & Open Questions

**Phase 1 Research Confidence**: 85% (v2.1.113 SP 토큰 실측, #47855 해결 여부, #48963 해결 커밋 식별, config-change-handler 동작 미검증 시점)
**Phase 2 Analysis Confidence**: **High** (모든 HIGH 영향 항목 라인 단위 검증 완료)

**Open Questions**
1. ENH-247 실측 결과 — Matrix #32 fix가 실제로 #47855 Opus 1M `/compact` block을 해결하는가?
2. v2.1.113 네이티브 바이너리 전환 이후 Anthropic 핫픽스 로드맵 — v2.1.115+ 릴리스 시점 및 범위
3. #47828 SessionStart systemMessage OPEN 5릴리스 연속 — 모니터링 해제 시점
4. MON-CC-06 신설 이후 사용자 보고 유입 추이

**첨부 아티팩트**
- Phase 1 Research 원본: `/private/tmp/claude-501/.../tasks/ad9f7e02e27f6b461.output`
- Phase 2 Analyst 원본: `/private/tmp/claude-501/.../tasks/a692a73be124bb4ab.output`
- Agent memory: `.claude/agent-memory/bkit-bkit-impact-analyst/cc_v21113_v21114_analysis.md`
