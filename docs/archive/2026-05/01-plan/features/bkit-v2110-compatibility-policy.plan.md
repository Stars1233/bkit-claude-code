---
template: plan
version: 1.3
feature: bkit-v2110-compatibility-policy
date: 2026-04-22
author: PM Agent
project: bkit
version: v2.1.10
---

# bkit v2.1.10 사용자 호환성 정책 Planning Document

> **Summary**: bkit plugin v2.1.10 출시를 위한 SemVer 규칙, Deprecation Ladder, 사용자 세그먼트별 Migration Path, 릴리스 커뮤니케이션 전략을 수립한다.
>
> **Project**: bkit
> **Version**: v2.1.10
> **Author**: PM Agent
> **Date**: 2026-04-22
> **Status**: Draft

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | v2.1.10이 Minor 릴리스임에도 불구하고, 호환성 계약·Deprecation 기준·출시 커뮤니케이션 방식이 문서화되지 않아 사용자와 기여자 모두 혼란 가능성이 있다. |
| **Solution** | bkit 전용 SemVer 규칙, 4단계 Deprecation Ladder, 사용자 4세그먼트 Migration Table, 릴리스 노트 템플릿, Contract Test Gate를 수립하고 공식화한다. |
| **Function/UX Effect** | 업데이트 시 사용자가 필요한 조치를 즉시 파악할 수 있고, 개발자는 릴리스 전 체크리스트 하나로 Ship/Hold 결정이 가능해진다. |
| **Core Value** | "Invocation Contract 100% 보존"을 공식 약속으로 격상하여 bkit 생태계 신뢰성을 확보한다. |

---

## Context Anchor

> Auto-generated from Executive Summary. Propagated to Design/Do documents for context continuity.

| Key | Value |
|-----|-------|
| **WHY** | 호환성 정책 부재로 릴리스마다 사용자 혼란 및 기여자 판단 불일치 발생 |
| **WHO** | bkit 사용자 4세그먼트(Starter/Dynamic/Enterprise/Developer) + CC plugin marketplace 운영자 |
| **RISK** | 정책이 너무 엄격하면 내부 리팩토링 속도 저하 / 너무 느슨하면 사용자 breaking change 노출 |
| **SUCCESS** | v2.1.10 릴리스 시 Contract Test L1~L5 100% 통과 + 사용자 "migration 필요 없음" 확인 |
| **SCOPE** | SemVer 규칙 + Deprecation Ladder + Migration Table + 릴리스 노트 템플릿 + Release Gate |

---

## 1. 개요

### 1.1 목적

bkit plugin v2.1.10은 Clean Architecture 도입 및 CC regression 방어를 포함하는 **Minor 릴리스**다.
Invocation Contract(39 skills · 36 agents · 2 MCP servers · 21 hook events)의 100% 보존이
이번 릴리스의 핵심 계약이다.

본 문서는 이 계약을 공식화하고, 미래 릴리스에서도 일관되게 적용될 수 있도록
다음 정책 영역을 정의한다:

1. bkit 전용 Semantic Versioning 규칙
2. Deprecation Ladder (4단계)
3. 사용자 4세그먼트 × Migration Path
4. 릴리스 노트 표준 템플릿
5. Contract 위반 허용 예외
6. Release Gate 체크리스트
7. 출력 포맷 변경 정책
8. 사용자 공지 채널

### 1.2 배경

- v2.1.9 → v2.1.10: CC plugin marketplace 배포 또는 git pull 자동 업데이트
- 내부 리팩토링(lib/ 재구조화, 출력 포맷 개선)은 허용되나, 외부 호출 인터페이스는 불변
- 기존에 공식 정책이 없어, 릴리스마다 호환성 판단이 임시방편으로 이루어짐

### 1.3 관련 문서

- MEMORY.md: CC 버전 호환성 이력 (v2.1.34~v2.1.116)
- ENH-196/202: `context: fork` + Skills frontmatter 검증
- ENH-253: v2.1.116 회귀 검증

---

## 2. 범위

### 2.1 In Scope

- [ ] bkit 전용 SemVer 정의 (Patch / Minor / Major 기준)
- [ ] Deprecation Ladder 4단계 정의 및 예시
- [ ] 사용자 4세그먼트(Starter / Dynamic / Enterprise / Developer) 정의
- [ ] 세그먼트별 v2.1.10 Migration Path 표
- [ ] 릴리스 노트 표준 템플릿 (마크다운)
- [ ] Contract 위반 허용 예외 2케이스 (보안 긴급 / CC upstream breaking)
- [ ] Release Gate 체크리스트 (L1~L5 + L4 Deprecation + L5 Regression)
- [ ] 출력 포맷 변경 허용/금지 매트릭스
- [ ] 사용자 공지 채널 4개 + SessionStart 1회성 옵션

### 2.2 Out of Scope

- 실제 v2.1.10 코드 구현 (별도 Plan 문서에서 다룸)
- CC upstream API 변경 대응 구체적 구현
- Marketing 채널 (GitHub Discussions, SNS 등)

---

## 3. 요구사항

### 3.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|----------|----------|------|
| FR-01 | bkit 전용 SemVer 규칙 문서화 (Patch/Minor/Major 기준 명확화) | Must | Pending |
| FR-02 | Deprecation Ladder 4단계 정의 (Announce → Warn → Silent Dead → Remove) | Must | Pending |
| FR-03 | 사용자 4세그먼트 정의 및 각 세그먼트별 v2.1.10 Migration Path 문서화 | Must | Pending |
| FR-04 | 릴리스 노트 표준 템플릿 제공 (v2.1.10 즉시 사용 가능) | Must | Pending |
| FR-05 | Contract 위반 허용 예외 2케이스 공식화 | Should | Pending |
| FR-06 | Release Gate 체크리스트 정의 (L1~L5 모두 통과해야 Ship 가능) | Must | Pending |
| FR-07 | 출력 포맷 변경 허용/금지 매트릭스 정의 | Should | Pending |
| FR-08 | 사용자 공지 채널 4개 + SessionStart 1회성 옵션 (`NO_WHATS_NEW=1`) 정의 | Should | Pending |

### 3.2 비기능 요구사항

| 범주 | 기준 | 측정 방법 |
|------|------|-----------|
| 명확성 | 정책 문서를 읽은 기여자가 Ship/Hold 판단에 5분 이내 도달 | 팀 내 walkthrough 검증 |
| 일관성 | 미래 릴리스(v2.1.11~v2.2.0)에 동일 정책 재적용 가능 | 체크리스트 항목 수 ≤ 10개 |
| 접근성 | 사용자 4세그먼트 중 Starter도 Migration 부담 0 확인 가능 | Migration Table 가독성 |

---

## 4. 정책 정의

### 4.1 bkit 전용 Semantic Versioning 규칙

bkit은 CC plugin 생태계에서 동작하는 플러그인으로, 일반 npm 패키지와 다른 버전 체계를 사용한다.

| 버전 유형 | 예시 | 허용 변경 | Invocation Contract |
|-----------|------|-----------|---------------------|
| **Patch** | v2.1.9 → v2.1.9-hotfix | 버그 수정만, 기능 추가 없음 | 100% 불변 |
| **Minor** | v2.1.9 → v2.1.10 | 신규 기능, optional frontmatter 추가, 내부 리팩토링 | 100% 불변 |
| **Major** | v2.x → v3.0 | Breaking 허용, 단 2 minor 이전 Deprecation 필수 | 변경 허용 (사전 공지) |

**v2.1.10 분류: Minor** — Invocation Contract 100% 보존이 계약.

- Minor에서 허용: lib/ 재구조화, 출력 메시지 개선, 파일 경로 변경, 신규 skill/agent 추가
- Minor에서 금지: skill 이름 변경, agent 제거, MCP server endpoint 변경, hook event 삭제

### 4.2 Deprecation Ladder (4단계)

| 단계 | 시점 | 동작 | 사용자 가시성 |
|------|------|------|---------------|
| **1. Announce** | Minor N | 릴리스 노트에 공지, SKILL.md에 `deprecated_in: vX.Y.Z` 마크 | 릴리스 노트 독자 |
| **2. Warn** | Minor N~N+2 | 호출 시 `console.warn` + audit log 기록 | 모든 호출 사용자 |
| **3. Silent Dead** | Minor N+3 | 기능 동작, 문서에서 숨김, 새 대안 안내 | 직접 탐색 사용자만 |
| **4. Remove** | Major N+1.0 | 완전 제거, migration guide 동봉 | 모든 사용자 |

**v2.1.10 현황**: Announce/Warn 대상 deprecation 없음 (첫 정책 도입).

Ladder 예시 (미래 시나리오):
```
v2.1.10: [Announce] `/old-skill` → `/new-skill` 대체 공지
v2.1.11: [Warn]     `/old-skill` 호출 시 "Deprecated in v2.1.10. Use /new-skill." 출력
v2.1.12: [Warn]     동일
v2.1.13: [Silent Dead] 문서에서 제거, 동작은 유지
v3.0.0:  [Remove]   완전 제거 + migration guide
```

### 4.3 사용자 4세그먼트 × v2.1.10 Migration Path

| 세그먼트 | 대표 사용 패턴 | v2.1.10 영향 | 필요 조치 | 예상 부담 |
|----------|---------------|--------------|-----------|-----------|
| **Starter** | HTML/CSS 정적 사이트, `/pdca plan` 위주 | 없음 | 없음 (자동 업데이트) | 0 |
| **Dynamic** | bkend.ai 연동, skill/agent 호출 | 호출 경로 동일 | 없음 (자동 업데이트) | 0 |
| **Enterprise** | cto-lead, CTO Team orchestration | agent 이름 동일, 출력 포맷 개선 수혜 | 없음. 개선된 출력 확인 권장 | 0 (선택적 확인) |
| **Developer** | lib/ 직접 참조, bkit 기여 | lib/ 내부 구조 변경 가능 | ADR 문서 참조 후 import 경로 확인 | Low (1~2h) |

> **공통 결론**: Starter/Dynamic/Enterprise 사용자는 zero-action 업데이트.
> Developer 기여자만 `lib/` 재구조화 ADR 문서 확인 필요.

### 4.4 릴리스 노트 표준 템플릿

v2.1.10 릴리스 시 GitHub Releases 페이지에 사용할 템플릿:

```markdown
# bkit v2.1.10 — Clean Architecture + CC Regression Defense

## Highlights
- CC v2.1.117 회귀 방어 (MON-CC-06 자동화 추적)
- Clean Architecture 4-layer 도입 (lib/domain/, lib/cc-regression/, lib/infra/)
- ENH-253: `context: fork` + `disable-model-invocation` 회귀 실측 검증

## Changes (User-visible)
- [Added] CC regression attribution 파일: `warnings/fork-precondition-fail.txt`
- [Improved] statusline token overhead 표시 (Sonnet 4.6 사용 시)
- [Improved] audit log 출력 포맷 가독성 향상

## Contract (Invocation surface — 불변)
- 39 skills · 36 agents · 2 MCP servers · 21 hook events 호출 방식 100% 동일
- No migration required for Starter / Dynamic / Enterprise users
- Developer: `lib/` 재구조화 ADR 참조 권장

## Internal
- `lib/domain/`, `lib/cc-regression/`, `lib/infra/` 디렉토리 신설
- `status.js` 단일 파일 → 300×3 분할
- `pre-write.js` 파이프라인화 (~120 LOC)

## Bug Fixes
- audit-logger `startDate` dead option 제거 (C1)
- audit-logger `details` sanitizer 도입 (C2)

## Deprecations
- None

## Breaking Changes
- None
```

### 4.5 Contract 위반 허용 예외

"공개 인터페이스 불변" 원칙에 대해 두 가지 예외만 허용한다:

| 예외 케이스 | 조건 | 처리 방식 |
|-------------|------|-----------|
| **보안 긴급** | 악용 가능한 skill 즉시 비활성이 필요한 경우 | 비활성 전 24h 이상 사전 공지. GitHub Security Advisory 발행. |
| **CC upstream breaking** | CC가 API 변경을 강제하여 bkit도 따를 수밖에 없는 경우 | 책임을 CC 공식 공지로 귀속. bkit 릴리스 노트에 "CC vX.X.X upstream change로 인한 영향" 명시. |

그 외 모든 경우는 Deprecation Ladder를 따르며, Major 버전 전까지 즉시 제거 불가.

### 4.6 Release Gate 체크리스트

릴리스 전 다음 Gate를 **모두** 통과해야 Ship 가능. 하나라도 FAIL 시 릴리스 보류 + 수정 PR 필수.

```
Release Gate — bkit v2.1.10
────────────────────────────────────────────
[ ] L1 Contract Test: 39 skills 호출 방식 100% 동일 확인
[ ] L2 Contract Test: 36 agents 호출 방식 100% 동일 확인
[ ] L3 Contract Test: 2 MCP servers endpoint/response 동일 확인
[ ] L4 Deprecation: 이번 릴리스에 Announce 대상 deprecation 없거나, 있다면 릴리스 노트에 명시
[ ] L5 Regression: MON-CC-06 추적 중인 회귀 이슈 중 bkit 영향 항목 0건 또는 workaround 명시
[ ] 릴리스 노트 템플릿 모든 섹션 채워짐 (특히 Contract 섹션)
[ ] CHANGELOG.md 업데이트
[ ] plugin.json version 업데이트
────────────────────────────────────────────
ALL PASS → Ship
ANY FAIL → Hold + Fix PR
```

### 4.7 출력 포맷 변경 정책

| 변경 유형 | 허용 여부 | 이유 |
|-----------|-----------|------|
| 메시지 명확성 개선 (더 읽기 쉬운 문장) | 허용 | UX 향상, 기능 동일 |
| 추가 컨텍스트 출력 (optional 정보 추가) | 허용 | 확장, 기존 파서 호환 |
| 포맷 가독성 향상 (정렬, 줄바꿈) | 허용 | Cosmetic |
| 에러 코드 변경 | 금지 | 기존 파서 깨짐 |
| skill/agent 호출 결과 카테고리 변경 | 금지 | 하위 호환 깨짐 |
| MCP response 필드 삭제 | 금지 | client 깨짐 |
| Golden File 불일치 | 참고용 FAIL (릴리스 보류 기준 아님) | 개발자 참고자료로 격하 |

> **Golden File 정책 변경**: v2.1.10부터 Golden File은 회귀 감지 도움용 참고자료로 격하.
> byte-exact 일치는 더 이상 릴리스 FAIL 기준이 아니다.

### 4.8 사용자 공지 채널

| 채널 | 내용 | 필수/선택 |
|------|------|-----------|
| GitHub Releases 페이지 | 릴리스 노트 템플릿 전문 게시 | 필수 |
| `plugin.json` description 업데이트 | 버전 + 한 줄 요약 | 필수 |
| MEMORY.md (프로젝트) | v2.1.10 히스토리 항목 추가 | 필수 |
| SessionStart additionalContext | "What's New in v2.1.10" 1회 표시 (`NO_WHATS_NEW=1` env로 끄기 가능) | 선택 (기본 ON) |

**SessionStart 공지 옵션 상세**:
- 기본 동작: v2.1.10 첫 실행 시 What's New 요약 1회 출력
- 끄는 방법: `NO_WHATS_NEW=1` 환경변수 설정
- 재출력 방지: `.bkit/state/whats-new-seen.json`에 버전 기록 (중복 방지)
- 최대 길이: 500자 이하 (SessionStart additionalContext 예산 내)

---

## 5. 성공 기준

### 5.1 Definition of Done

- [ ] 본 Plan 문서 CTO 승인
- [ ] v2.1.10 릴리스 시 Release Gate 체크리스트 모든 항목 통과
- [ ] 릴리스 노트에 "Contract" 섹션 포함 + "No migration required" 명시
- [ ] Deprecation Ladder 문서 `docs/01-plan/` 또는 CONTRIBUTING.md에 링크

### 5.2 품질 기준

- [ ] 사용자 4세그먼트 중 "Developer" 외 3개 세그먼트: Migration Path = 0 action 확인
- [ ] Release Gate 체크리스트 10개 항목 이하 유지
- [ ] 정책 문서 접근 후 Ship/Hold 판단 시간 ≤ 5분 (팀 검증 기준)

---

## 6. 리스크 및 완화

| 리스크 | 영향도 | 발생 가능성 | 완화 방안 |
|--------|--------|-------------|-----------|
| 정책이 너무 엄격해 내부 리팩토링 속도 저하 | Medium | Medium | Minor에서 lib/ 내부 변경 명시적 허용 |
| CC upstream breaking change 발생 시 bkit Major 강제 | High | Low | CC upstream 예외 조항 공식화 + 책임 귀속 명확화 |
| Deprecation Ladder 첫 도입 후 실제 적용 누락 | Medium | Medium | Release Gate L4 항목에 Deprecation 확인 포함 |
| SessionStart 공지가 사용자 context를 과도하게 소비 | Low | Low | 500자 cap + `NO_WHATS_NEW=1` opt-out 제공 |

---

## 7. 영향 분석

### 7.1 변경 리소스

| 리소스 | 유형 | 변경 내용 |
|--------|------|-----------|
| `docs/01-plan/` | 문서 | 호환성 정책 Plan 신규 추가 |
| `CONTRIBUTING.md` (예정) | 문서 | Deprecation Ladder 링크 추가 |
| `plugin.json` | Config | v2.1.10 버전 및 description 업데이트 |
| `.bkit/state/whats-new-seen.json` | 상태 파일 | SessionStart 공지 중복 방지용 신규 |
| `hooks/startup/session-context.js` | 코드 | What's New 조건부 출력 로직 추가 (선택) |

### 7.2 현재 소비자

| 리소스 | 작업 | 코드 경로 | 영향 |
|--------|------|-----------|------|
| `plugin.json` description | READ | CC plugin marketplace 자동 읽기 | 없음 (description 변경만) |
| `hooks/startup/session-context.js` | EXEC | SessionStart 훅 실행 | 검증 필요 (500자 cap 준수) |

### 7.3 검증

- [ ] SessionStart additionalContext 총 길이 8,000자 cap 준수 (ENH-240 기준)
- [ ] `NO_WHATS_NEW=1` env 동작 검증
- [ ] plugin.json 업데이트 후 marketplace 표시 확인

---

## 8. 아키텍처 고려사항

### 8.1 프로젝트 레벨 선택

| 레벨 | 특성 | 선택 |
|------|------|:----:|
| **Starter** | 정적 사이트 | ☐ |
| **Dynamic** | bkend.ai 연동 | ☐ |
| **Enterprise** | 레이어 분리, DI | ☑ |

정책 문서는 **Enterprise 레벨** 기준으로 작성 (bkit 자체가 Enterprise 아키텍처 대상).

### 8.2 주요 설계 결정

| 결정 | 옵션 | 선택 | 근거 |
|------|------|------|------|
| Deprecation 최소 경고 기간 | 1 minor / 2 minor / 3 minor | 2 minor | 너무 짧으면 사용자 혼란, 너무 길면 기술 부채 누적 |
| Golden File 역할 | FAIL 기준 / 참고자료 | 참고자료 | 포맷 개선을 막지 않기 위해 격하 |
| SessionStart 공지 | 항상 ON / opt-in / opt-out | opt-out (기본 ON) | 신규 기능 인지율 최대화, 원치 않는 사용자 배려 |
| Release Gate 항목 수 | ≤10 / ≤15 / 제한 없음 | ≤10 | 빠른 판단, 실행 가능성 |

---

## 9. 다음 단계

1. [ ] CTO(팀 리드) 승인 요청
2. [ ] v2.1.10 릴리스 준비 시 Release Gate 체크리스트 실행
3. [ ] CONTRIBUTING.md에 Deprecation Ladder 링크 추가
4. [ ] SessionStart What's New 구현 여부 결정 (선택 사항)
5. [ ] 정책 적용 첫 릴리스(v2.1.10) 이후 정책 유효성 회고 (v2.1.11 Plan 단계)

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1 | 2026-04-22 | 초안 작성 | PM Agent |
