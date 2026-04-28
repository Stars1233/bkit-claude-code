---
title: CC v2.1.119 Phase 2 Analysis Retrospective
feature: cc-v2117-v2119-impact-analysis
phase: 03-analysis
type: retrospective
status: Published
created: 2026-04-24
author: kay kim + bkit-impact-analyst post-mortem
triggers_adr: 0003-cc-version-impact-empirical-validation
related:
  - report: docs/04-report/features/cc-v2117-v2119-impact-analysis.report.md (v2 re-issued)
  - memory: memory/cc_version_history_v2117_v2119.md
  - deleted-docs:
      - docs/01-plan/features/bkit-v2111-sprint-epsilon-ccv2119-hotfix.plan.md (410줄, 폐기)
      - docs/02-design/features/bkit-v2111-sprint-epsilon-ccv2119-hotfix.design.md (858줄, 폐기)
---

# CC v2.1.119 Phase 2 Analysis — Retrospective

> **무엇이 잘못되었는가**: Phase 2 영향 분석에서 F1-119 `/config` 영속화를 **P0 크리티컬 회귀**로 판정하여 Sprint ε Plan(410줄) + Design(858줄) 문서 작성 + 브랜치 생성 + 8시간 구현 계획 수립. 사용자의 실제 런타임 검증 결과 **정상 작동 확인** → 초판 주장 반박, Sprint ε 전면 폐기, 1,268줄 문서 삭제.

## 1. 사건 개요

### 1.1 타임라인

| 시각 (2026-04-24 UTC) | 이벤트 |
|----------------------|-------|
| 10:00 | `/bkit:cc-version-analysis` skill 시작 |
| 10:05 | Phase 1 (cc-version-researcher) 배경 실행 — CC v2.1.118/119 CHANGELOG 수집 |
| 10:10 | Phase 1 완료, **87% HIGH confidence** 보고 |
| 10:12 | Phase 2 (bkit-impact-analyst) 배경 실행 — bkit 코드베이스 매핑 |
| 10:16 | Phase 2 완료, **8.7/10 HIGH confidence** 보고, ENH-265~273 제시 |
| 10:20 | Phase 3 (main thread Plan Plus) — 우선순위 확정, P0 2건(ENH-265 F5-119, ENH-266 F1-119), P1 2건, P2 1건 |
| 10:25 | Phase 4 (report-generator) — Impact Report 3건 생성 |
| 10:30 | **초판 Impact Report 발행**, "크리티컬 2건 → v2.1.11 hotfix 필요" 주장 |
| 11:00 | 사용자: "v2.1.11 브랜치 만들어서 Plan/Design 작성해줘" |
| 11:10 | 기존 v2.1.11 작업 발견 (Sprint α/β/γ/δ 이미 있음), ENH-281~285 재조정 |
| 11:15 | feature/bkit-v2111-sprint-epsilon-ccv2119 브랜치 생성 |
| 11:20 | Explore agent로 bkit 코드베이스 심층 분석 |
| 11:25 | 심층 분석 완료 (36 agents 중 7개 tools 누락 등) |
| 11:30 | Sprint ε Plan 410줄 작성 완료 |
| 12:00 | Sprint ε Design 858줄 작성 완료 |
| 12:05 | 사용자: 브리핑 요청 |
| 12:10 | 내가 5 FR 브리핑, 확인받기 요청 |
| 12:15 | **사용자 실증**: "다른 세션에서 bkit v2.1.10 + CC v2.1.119로 `/config` 실행 → 잘 됨" + 스크린샷 |
| 12:20 | **초판 주장 F1-119 반박 인정**, 경로 혼동 원인 분석 |
| 12:25 | 사용자: "테마 변경해도 잘 됨 → 크리티컬 이슈 없는 거 아니야?" |
| 12:30 | 나: "FR-ε1 REFUTED 확정, FR-ε2 실증 필요" |
| 12:35 | 사용자: "유관 이슈 나올 때까지 대기 + 전면 재평가" |
| 12:40 | 레벨 3 재평가 결정, Sprint ε 문서 폐기 |
| 15:00 | 본 retrospective 작성 + ADR 0003 + 모니터링 체계 문서 발행 |

**총 소요 시간**: ~2.5시간 (초판 발행 10:30 → 재작성 완료 15:00)

### 1.2 피해 규모

| 항목 | 수치 |
|------|:---:|
| 작성 후 폐기된 문서 | 2건 (Plan 410줄 + Design 858줄 = 1,268줄) |
| 폐기된 브랜치 | 1건 (feature/bkit-v2111-sprint-epsilon-ccv2119) |
| 폐기된 ENH 번호 | 5건 (ENH-281~285 예약 해제) |
| 절감된 구현 공수 | 8시간 (사용자가 실증 안 했다면 실구현 진행) |
| 재작성 공수 | 약 2시간 (Impact Report + Memory + Retrospective + ADR + 모니터링) |
| **Net 손실** | 약 4시간 (실증 확인 덕분에 훨씬 큰 손실 차단) |

---

## 2. 근본 원인 분석 (Root Cause)

### 2.1 False Alarm 사슬 재구성

**초판 Phase 2 논리 체인 (F1-119 ENH-281 P0 판정)**:

```
Evidence A: grep scripts/permission-request-handler.js:43-47
           → SAFE_WRITE_DIRS = ['docs/', '.bkit/', '.bkit\\']
           → `.claude/` 없음

Evidence B: CC CHANGELOG F1-119 원문
           → "`/config` settings 영속화 → ~/.claude/settings.json
             project/local/policy precedence 참여"

Evidence C: bkit ENH-263 문서
           → "bypassPermissions + .claude/ write 방어"
           → CVE #51801 대응

Inferred Conclusion (잘못된 점프):
  A + B + C → "CC `/config`가 `.claude/` write하는데
              bkit이 `.claude/` write 방어하니까 충돌 발생
              → P0 크리티컬"

실증 결과:
  `/config` 실행 → bkit 차단 없음, 정상 작동
  → 추론 체인 어딘가에 허점 있음
```

### 2.2 발견된 논리적 허점 3건

**허점 1: 경로 문자열 매칭의 모호성**

- Evidence A의 `.claude/`는 **프로젝트 루트 기준 상대 경로**
- Evidence B의 `~/.claude/settings.json`은 **유저 홈 기준 절대 경로** (`~` 확장)
- Phase 2 분석이 두 경로를 **같은 논리 대상**으로 취급
- **실제로는**: `./.claude/` ≠ `~/.claude/` — bkit 방어는 프로젝트 내만, `/config`는 유저 홈에만 쓰기

**허점 2: "정책에 포함되지 않음" ≠ "차단됨"**

- Phase 2 결론: "SAFE_WRITE_DIRS에 `.claude/` 없음 → 차단"
- 실제 의미: "SAFE_WRITE_DIRS는 **자동 승인 목록**" — 없으면 "prompt" or "기본 정책 적용"이지 "차단" 아님
- Phase 2가 permission-request-handler의 **else 분기 실제 동작**을 실측하지 않음

**허점 3: CC 공식 동작 추측**

- F1-119 원문 `project/local/policy precedence 참여`는 CC가 **3개 scope 중 어디에 쓸지 상황별 결정**한다는 의미
- Phase 2는 이를 **"무조건 ~/.claude/에 쓴다"**로 단순화
- 실제로는 기본적으로 **user scope**(~/.claude/) 우선, 명시적 요청 시만 project/local
- `/config` 테마 변경 같은 user-wide 설정 → user scope → 프로젝트 `.claude/` 안 건드림

### 2.3 프로세스 차원의 근본 원인

**"No Guessing" 원칙의 오해**:
- 원래 의도: "실제 데이터/측정 없이 추측하지 말라"
- Phase 2 해석: "grep으로 파일에 로직 존재 확인하면 실측으로 간주"
- 올바른 해석: "**런타임 실행 검증** 없이 시나리오 결론 내리지 말라" — grep은 정적 분석, 런타임 동작 아님

**Phase 2 Confidence 85% HIGH 점수의 과신**:
- Phase 2 agent가 보고한 근거: "hooks.json 21 events 전수 확인, cto-lead/bkend-expert/qa-monitor tools frontmatter 실측"
- 하지만 이 "실측"은 **코드 파일 읽기** 수준이지 **런타임 행동 검증**이 아님
- Confidence 계산에 "런타임 검증 완료" 요소 **미포함** → 실제 신뢰도 대비 점수 과대평가

**Phase 1.5 (Empirical Validation) 단계 부재**:
- 기존 프로세스: Phase 1 (Research) → Phase 2 (Analysis) → Phase 3 (Prioritize) → Phase 4 (Report)
- 각 Phase 간 **실증 검증 게이트 없음**
- HIGH/P0 판정 시에도 실행 증명 요구 없음

---

## 3. 재발 방지 — 프로세스 개선안

### 3.1 Phase 1.5 "Empirical Validation" 신설 (ADR 0003 §Decision)

각 Phase 1 → Phase 2 사이에 HIGH-impact 항목에 대한 실증 의무 단계 추가:

```
Phase 1 (Research)
  ↓ CC CHANGELOG 수집, HIGH 후보 식별
Phase 1.5 (Empirical Validation) ← 신규
  ↓ 각 HIGH 후보에 대해:
    (a) 재현 시나리오 정의 (CLI 명령 + 예상 결과)
    (b) 실제 실행 (현재 bkit 상태 + 신규 CC 버전)
    (c) 실측 결과 기록 (exit code, stderr, side effects)
    (d) 실증 상태 태깅: CONFIRMED / REFUTED / SPECULATIVE / UNVERIFIED
Phase 2 (Analysis)
  ↓ 오직 CONFIRMED 항목만 P0/P1 후보, 나머지는 최대 P2
Phase 3 (Prioritize)
Phase 4 (Report)
```

### 3.2 Priority 판정 규칙 (신설)

| 실증 상태 | 최대 허용 Priority |
|----------|:-----------------:|
| CONFIRMED | P0 |
| REFUTED | — (DROP) |
| SPECULATIVE | **P2** (P0/P1 금지) |
| UNVERIFIED | **판정 보류** (실증 대기) |

### 3.3 Phase 2 실측 체크리스트 (agent prompt 개선)

bkit-impact-analyst agent 프롬프트에 다음 체크리스트 강제:

- [ ] 매핑한 각 파일의 **실제 실행 경로**를 설명할 수 있는가? (함수가 언제 호출되는가?)
- [ ] 절대 경로 vs 상대 경로를 명확히 구분했는가?
- [ ] 유저 스코프 vs 프로젝트 스코프를 명확히 구분했는가?
- [ ] CC 공식 스펙에 **직접 링크**를 제공할 수 있는가? (CHANGELOG 외)
- [ ] "이 파일에 이 로직 있음" vs "이 시나리오에서 그 로직이 트리거됨"을 구분했는가?
- [ ] P0/P1 판정 근거에 **실증 실행 결과**가 포함되는가?

### 3.4 Confidence 계산 공식 수정

기존: `Confidence = (데이터 소스 수 × 교차 검증 수) / 10`

신규: `Confidence = (데이터 소스 수 × 교차 검증 수 × 실증_계수) / 10`

- 실증_계수: CONFIRMED=1.0, SPECULATIVE=0.5, UNVERIFIED=0.3, 미실증=0.2

---

## 4. 구체적 교훈 (5개)

### 교훈 1: grep ≠ 런타임 동작
**"파일 X에 로직 Y가 있음"**이 증명하는 것: 파일에 그 코드가 존재함.
**증명하지 않는 것**: 특정 시나리오에서 그 코드가 실제로 실행됨.

### 교훈 2: 경로 문자열의 스코프 혼동 주의
`.claude/`, `~/.claude/`, `$HOME/.claude/`, `/Users/x/.claude/`, `./.claude/`, `./project/.claude/` — 모두 **다른 경로**일 수 있음. 매칭 로직 분석 시 절대/상대/홈/프로젝트 스코프 명시 필수.

### 교훈 3: CC precedence scope는 상황별
CC 설정은 `user > project > local > policy` 같은 precedence. "어디에 쓴다"는 단일 경로가 아닌 **상황별 선택**. 기본 동작 추정 시 CC 공식 문서 직접 확인 필수.

### 교훈 4: 30초의 실증이 8시간의 삽질을 막는다
`/config` 한 번 실행하는 데 걸리는 시간은 30초. Sprint ε Plan/Design 작성+구현에 걸린 예상 시간은 9시간+. 실증 ROI = 9 × 120 / 0.5 = **2,160배**.

### 교훈 5: "High Confidence" 스스로 보고된 점수를 의심하라
Phase 2 agent가 보고한 8.7/10 HIGH confidence는 **자기 보고 점수**. 에이전트는 자기 점수를 보정할 메커니즘이 없음. **외부 검증(실증)** 없는 high confidence는 경계 대상.

---

## 5. 후속 조치

| 조치 | 책임 | 기한 | 상태 |
|------|------|------|:----:|
| Sprint ε Plan/Design 2 문서 폐기 | kay | 2026-04-24 | ✅ 완료 |
| Impact Report 재작성 (v2) | kay | 2026-04-24 | ✅ 완료 |
| Memory 히스토리 재작성 | kay | 2026-04-24 | ✅ 완료 |
| 본 Retrospective 작성 | kay | 2026-04-24 | ✅ 완료 |
| ADR 0003 발행 (Empirical Validation 의무화) | kay | 2026-04-24 | ⏳ 진행 중 |
| CC + bkit 이슈 모니터링 체계 문서 | kay | 2026-04-24 | ⏳ 진행 중 |
| bkit-impact-analyst agent 프롬프트 개선 (Phase 1.5 호출) | kay | v2.1.12 | 📋 대기 |
| cc-version-analysis skill flow 수정 (Phase 1.5 단계 추가) | kay | v2.1.12 | 📋 대기 |
| F5-119 실증 (유관 이슈 발생 시) | kay | TBD | 📋 대기 |

---

## 6. 결론

본 사건은 **방법론 실패** 케이스이지 **기술적 실패**가 아님. CC v2.1.119는 실제로 bkit v2.1.10과 호환되며(실증 확인), 초판 주장은 논리 추론의 허점으로 생성된 **phantom P0**였음.

재발 방지의 핵심은 **실증 단계의 제도화**: 공수 부담이 작은(실증 1건 5~15분) 반면 false alarm 방지 가치(공수 수 시간~수십 시간 절감)는 훨씬 큼. ADR 0003으로 이 원칙을 고정.

**긍정적 교훈**: 사용자의 **"유관된 이슈 나올 때까지 기다려보자"** 판단이 이번 재평가의 계기. 완벽히 분석하려 하지 말고 **실세계 신호(이슈 리포트, 사용자 피드백)**를 기다리는 여유가 오히려 정확성을 높였음. 이 태도는 향후 CC 버전 대응에서 기본 원칙으로 채택.

---

**End of Retrospective**
