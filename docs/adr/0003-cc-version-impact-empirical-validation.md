---
number: 0003
title: CC Version Impact Analysis — Empirical Validation Requirement
status: Accepted
date: 2026-04-24
deciders: kay kim (POPUP STUDIO PTE. LTD.)
consulted: cc-version-researcher agent, bkit-impact-analyst agent (retrospective input)
informed: bkit contributors, CTO Team
trigger: cc-v2117-v2119 false alarm (Sprint ε 폐기 사건)
related:
  - retrospective: docs/03-analysis/cc-v2119-phase2-retrospective.md
  - report: docs/04-report/features/cc-v2117-v2119-impact-analysis.report.md (v2 re-issued)
supersedes: (none)
superseded-by: (none)
---

# ADR 0003 — CC Version Impact Analysis: Empirical Validation Requirement

## Status

**Accepted** (2026-04-24)

## Context

### 기존 프로세스

bkit의 CC(Claude Code) 버전 업그레이드 영향 분석은 `/bkit:cc-version-analysis` skill을 통해 4-phase PDCA로 수행:

```
Phase 1 (Research)    — cc-version-researcher agent: CC CHANGELOG/GitHub/npm 조사
Phase 2 (Analysis)    — bkit-impact-analyst agent: bkit 코드베이스 grep 기반 영향 매핑
Phase 3 (Prioritize)  — Plan Plus: 의도/대안/YAGNI/우선순위 확정
Phase 4 (Report)      — report-generator: 최종 문서 생성
```

### 2026-04-24 False Alarm 사건

CC v2.1.117 → v2.1.119 분석에서 Phase 2가 F1-119 `/config` 영속화를 **P0 크리티컬 회귀**로 판정:
- 근거: `bkit scripts/permission-request-handler.js:43-47`의 `SAFE_WRITE_DIRS`에 `.claude/` 미포함
- 추론: CC `/config`가 `.claude/` write → bkit 방어에 의해 차단
- 결과: Sprint ε 신설, Plan 410줄 + Design 858줄 작성, 구현 브랜치 생성

사용자 실제 환경 실증:
- CC v2.1.119 + bkit v2.1.10 + `/config` 테마 변경 → **정상 작동**
- Sprint ε 주장 전면 반박
- 1,268줄 문서 폐기, 8시간 구현 공수 차단

상세 분석: `docs/03-analysis/cc-v2119-phase2-retrospective.md`

### 근본 원인

Phase 2 분석이 **grep 기반 정적 추론**을 **런타임 동작 결론**으로 점프:
1. 경로 문자열 혼동 (`~/.claude/` 유저 홈 vs `./.claude/` 프로젝트)
2. "SAFE_WRITE_DIRS에 없음" = "차단됨"으로 단순화
3. CC precedence scope(user/project/local/policy) 단일 경로로 축소 추정

bkit Philosophy의 **"No Guessing"** 원칙을 "grep 확인 = 실측"으로 오해 적용.

### 문제의 구조적 성격

- Phase 2 agent가 self-reported **8.7/10 HIGH confidence** 보고
- 하지만 **외부 검증 메커니즘 없음** — 에이전트는 자기 점수를 보정할 수 없음
- Confidence 계산에 "런타임 검증 완료" 요소 미포함
- HIGH/P0 판정 시에도 실행 증명 요구 없음

---

## Decision

**Phase 1.5 "Empirical Validation" 단계를 CC 버전 영향 분석 프로세스에 의무 추가**한다.

### 1. 새 Phase 구조

```
Phase 1 (Research)           — HIGH 후보 식별 (CHANGELOG 기반)
Phase 1.5 (Empirical Validation)  ← 신설
Phase 2 (Analysis)           — CONFIRMED 항목만 P0/P1 후보
Phase 3 (Prioritize)
Phase 4 (Report)
```

### 2. Phase 1.5 규칙

Phase 1에서 HIGH impact로 식별된 각 CC 변경에 대해:

**(a) 재현 시나리오 정의 필수**
- CLI 명령 또는 사용자 액션 수준
- 예상 결과 명시
- 예: "`/config` 열기 → 테마 선택 → 저장 → `~/.claude/settings.json` 타임스탬프 갱신"

**(b) 실제 실행 (현재 bkit + 신규 CC)**
- 실증 환경 구성: 현재 설치된 bkit 버전 + 분석 대상 CC 버전
- 시나리오 실행, exit code/stderr/side effects 기록
- 기록 위치: Phase 1 보고서의 각 변경 항목에 "실증 결과" 섹션

**(c) 실증 상태 태깅 (4값 중 하나)**

| 태그 | 정의 | Phase 2 허용 Priority |
|------|------|:-------------------:|
| **CONFIRMED** | 실증 결과 기대 회귀 또는 영향 확인됨 | P0, P1, P2, P3 |
| **REFUTED** | 실증 결과 기대 회귀 발생 안 함 (false alarm) | **DROP** |
| **SPECULATIVE** | 재현 시나리오 정의했으나 실증 미완료, 논리적 가능성은 있음 | **최대 P2** |
| **UNVERIFIED** | 재현 시나리오 불확실, 실증 불가능 또는 비용 과다 | **판정 보류** (P3 관찰만) |

### 3. Phase 2 Priority 판정 규칙

- **P0 판정은 CONFIRMED 상태에서만 가능**
- **P1 판정은 CONFIRMED 상태에서만 가능** (단, 관측성/성능 확장은 SPECULATIVE도 P1 허용 — 구현해도 회귀 없음이 자명한 경우)
- **SPECULATIVE → 최대 P2**
- **UNVERIFIED → 판정 보류**, 실증 자료 축적 후 재분석

### 4. Confidence 계산 공식 수정

```
Confidence = (데이터 소스 수 × 교차 검증 수 × 실증_계수) / 10

실증_계수:
  CONFIRMED   : 1.0
  SPECULATIVE : 0.5
  UNVERIFIED  : 0.3
  미실증      : 0.2
```

### 5. bkit-impact-analyst Agent Prompt 개선

기존 "grep 기반 실측" 요구를 다음으로 **확장**:

추가 체크리스트:
- [ ] 매핑한 각 파일의 **실제 실행 경로** 설명 가능? (함수가 언제 호출되는가?)
- [ ] 절대 경로 vs 상대 경로 명확히 구분했나?
- [ ] 유저 스코프 vs 프로젝트 스코프 명확히 구분했나?
- [ ] CC 공식 스펙에 **직접 링크** 제공 가능? (CHANGELOG 외 docs.claude.com 또는 source)
- [ ] "파일에 로직 있음" vs "시나리오에서 트리거됨" 구분했나?
- [ ] P0/P1 판정 근거에 **Phase 1.5 실증 결과**가 포함되었나?

### 6. cc-version-analysis Skill Flow 수정

`/bkit:cc-version-analysis` skill의 `SKILL.md` 업데이트:
- Phase 1과 Phase 2 사이에 **Phase 1.5 게이트** 추가
- HIGH 항목은 Phase 1.5 통과 없이 Phase 2 진입 금지
- Phase 2 보고서에 "실증 상태" 컬럼 필수

---

## Consequences

### Positive

1. **False Alarm 차단**: 정적 추론 기반 P0 오판 방지 → Sprint/구현 공수 낭비 제거
2. **Confidence 신뢰도 회복**: 자기 보고 점수에 실측 계수 반영으로 과신 경계
3. **ENH 번호 품질 관리**: CONFIRMED 상태에서만 번호 할당 → reserved but unused 상태 방지
4. **사용자 신뢰**: 실증 기반 보고서는 근거가 명확하여 "정말 문제인가?" 반복 질문 감소
5. **학습 축적**: 실증 기록이 쌓이면 "이 유형의 CC 변경은 bkit에 이렇게 작동한다" 패턴 학습 가능

### Negative

1. **Phase 1.5 추가 공수**: HIGH 항목당 5~15분 실증 시간. 단 false alarm 공수(수 시간~수십 시간) 대비 훨씬 저렴
2. **실증 환경 준비 필요**: CC 신규 버전을 빠르게 테스트할 수 있는 로컬 환경 상시 유지
3. **실증 불가능 항목 처리**: 일부 변경(예: 성능 향상, 외부 서비스 의존)은 5~15분에 실증 불가 → UNVERIFIED로 분류 후 P3 관찰만
4. **Phase 1.5 자체가 실수 가능**: 재현 시나리오가 부정확하면 여전히 잘못된 CONFIRMED/REFUTED 판정 가능 → Phase 1.5 결과도 리뷰 필요

### Neutral

1. **기존 보고서들 소급 적용 안 함**: cc-v2112-v2114, cc-v2114-v2116, cc-v2116-v2117, cc-v2117-v2118 등 이전 분석은 그대로 유지. 본 ADR은 cc-v2119 이후부터 적용
2. **ENH-281~285 예약 번호 해제**: Sprint ε 폐기로 미사용 번호는 **다음 실구현 시 재발급**. ENH 번호 연속성 유지보다 **실제 구현과 1:1 매칭** 우선

---

## Compliance & Enforcement

### 준수 검증 방법

1. **Phase 2 보고서 리뷰 시 체크리스트**:
   - [ ] 모든 P0/P1 항목에 실증 상태 태그 있음?
   - [ ] CONFIRMED 외 상태의 P0/P1 있는가? (있으면 반려)
   - [ ] Confidence 계산에 실증_계수 포함되었나?
2. **cc-version-analysis skill 실행 로그에 Phase 1.5 단계 기록**
3. **본 ADR 위반 발생 시**: retrospective 작성 의무, 원인 분석 후 프로세스 개선

### Grace Period

- **2026-04-24 ~ 2026-05-08 (2주)**: 다음 CC 버전 분석 시까지 skill/agent 프롬프트 수정 완료
- **이후**: 본 ADR 강제 적용

---

## Related Documents

- **Retrospective**: `docs/03-analysis/cc-v2119-phase2-retrospective.md` (사건 분석)
- **Impact Report (v2)**: `docs/04-report/features/cc-v2117-v2119-impact-analysis.report.md` (실증 기반 재작성)
- **Monitoring Framework**: `docs/reference/cc-issue-monitoring.md` (본 ADR 후속 — 실증 대기 항목 관리)
- **bkit Philosophy**: `CLAUDE.md` §Automation First/No Guessing/Docs=Code (재해석 — No Guessing의 의미)

---

## References

- Sprint ε 폐기 기록: `docs/03-analysis/cc-v2119-phase2-retrospective.md` §1.2 피해 규모
- 초판 Phase 2 결과 (archived, 참고만): Sprint ε Plan 410줄 + Design 858줄 (git 히스토리에 없음, 삭제됨)
- CC CHANGELOG F1-119: https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
- ENH-263 설계 문서: `docs/02-design/features/cc-v2114-v2116-impact-analysis.design.md`
