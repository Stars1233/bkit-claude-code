# Plan: gap-detector + pdca-iterator 의미론적 평가 고도화

> **요약**: gap-detector의 평가 방식을 구조적 패턴 매칭에서 의미론적(semantic) 평가로 고도화. "코드가 있다" → "설계 의도를 달성한다"로 판정 기준 진화. pdca-iterator도 의미론적 gap 이해 기반 수정으로 개선.
>
> **프로젝트**: bkit (Claude Code Vibecoding Plugin)
> **버전**: v2.1.1
> **날짜**: 2026-04-09
> **상태**: Draft
> **Feature**: bkit-v211-semantic-gap-analysis

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | gap-detector가 Grep 패턴 매칭 위주 평가 → "파일 존재 = 구현 완료"로 판정. 설계 의도 충족 여부, 엣지케이스 커버리지, UX 흐름 일치 등 정성적 품질을 놓침 |
| **Solution** | 3개 의미론적 평가 축(Intent Match, Behavioral Completeness, UX Fidelity) 추가 + Scoring Rubric 도입 + pdca-iterator sonnet→opus 업그레이드 |
| **기능 UX 효과** | Match Rate가 "구조 존재율"에서 "설계 달성율"로 진화. 100% = 설계 의도를 완전히 구현함 |
| **핵심 가치** | AI가 AI 코드를 "이해"하고 평가 — 키워드 검색이 아닌 문맥 기반 판단 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 현재 Match Rate는 구조적 존재 여부만 측정. 코드가 설계 의도를 달성하는지, 비즈니스 로직이 완전한지, UX 흐름이 일치하는지 판단 불가 |
| **WHO** | 모든 레벨 사용자 (gap-detector 사용하는 모든 PDCA 워크플로우) |
| **RISK** | 평가 시간 증가 (의미론적 분석은 Grep보다 느림), 주관성 문제 (LLM 판단의 재현성), agent body 변경으로 기존 평가 결과와의 비호환 |
| **SUCCESS** | 동일 코드에 대해 구조적 평가 100% + 의미론적 평가 <80% 케이스를 감지, Match Rate 재현성 ±5% 이내 |
| **SCOPE** | gap-detector.md agent body 개선, pdca-iterator.md 개선, scoring formula 변경. 신규 파일 최소화 (agent md 수정 중심) |

---

## 1. 배경 및 목표

### 1.1 현재 상태

gap-detector는 opus 모델이지만 agent body 지침이 패턴 매칭 위주:

```
현재 평가 흐름:
Design 문서 읽기 → 구현 코드 Grep/Glob → 패턴 존재 확인 → 점수 산출

예시:
  Design: "사용자가 검색 필터를 적용하면 결과가 실시간 업데이트"
  현재 판정: Grep "filter" in SearchPage.tsx → ✅ found → 100%
  실제: onChange마다 debounce 없이 API 호출 → UX 의도 미충족 → 80%이어야 함
```

현재 Match Rate 공식:

```
Runtime 있을 때: Structural×0.15 + Functional×0.25 + Contract×0.25 + Runtime×0.35
Runtime 없을 때: Structural×0.2 + Functional×0.4 + Contract×0.4
```

### 1.2 문제점

1. **Functional Depth 평가가 Grep 기반**: TODO/console.log/hardcoded array 등 키워드 탐지만 수행. 실제 비즈니스 로직 완성도 미평가
2. **Intent Match 부재**: Design의 "왜"(목적)와 구현이 같은 목표를 달성하는지 판단하지 않음
3. **Behavioral Completeness 부재**: 엣지케이스, 에러 처리, 경계 조건이 Design 명세대로인지 확인 안 함
4. **UX Fidelity 부재**: 사용자 경험 흐름(loading state, error feedback, transition) 일치 여부 무시
5. **pdca-iterator가 sonnet**: 의미론적 gap을 이해하려면 opus 수준의 추론 필요

### 1.3 목표

| # | 목표 | 측정 |
|---|------|------|
| G1 | 의미론적 평가 축 3개 추가 (Intent, Behavioral, UX) | agent body에 명시 |
| G2 | Scoring Rubric 도입 (0-100 기준표) | 각 축별 5단계 기준 |
| G3 | 가중치 공식 변경 | 의미론적 축 합계 ≥ 40% |
| G4 | pdca-iterator 의미론적 수정 능력 강화 | model: opus, effort: high |
| G5 | 재현성 확보 | Rubric 기반 판정으로 ±5% 이내 |
| G6 | 하위 호환 | 기존 Match Rate 패턴 유지 (gap-detector-stop.js 수정 불필요) |

---

## 2. 접근 방법

### 2.1 선택: Agent Body 개선 (Option A)

| Option | 설명 | 장단점 |
|--------|------|--------|
| **A: Agent Body 개선** | gap-detector.md, pdca-iterator.md의 지침 고도화 | ✅ 신규 파일 최소, 기존 흐름 유지 |
| B: 새 에이전트 추가 | semantic-evaluator 에이전트 신규 | ❌ 복잡도 증가, 토큰 낭비 |
| C: lib/qa 모듈 확장 | 코드 레벨 의미론적 분석 | ❌ LLM 없이 의미 분석 불가 |

**Option A 선택 근거**: gap-detector는 이미 opus 모델. agent body 지침만 고도화하면 LLM의 의미론적 이해 능력을 충분히 활용 가능. 신규 파일 없이 2개 agent md 수정으로 완료.

### 2.2 YAGNI 검토

| 항목 | 판정 | 근거 |
|------|------|------|
| Intent Match 축 | ✅ IN | 핵심 가치 — "있다"와 "의도대로다"의 차이 |
| Behavioral Completeness 축 | ✅ IN | 엣지케이스/에러처리는 품질의 핵심 |
| UX Fidelity 축 | ✅ IN | 프론트엔드 프로젝트에서 필수 |
| Scoring Rubric | ✅ IN | 재현성 확보의 핵심 수단 |
| pdca-iterator opus 업그레이드 | ✅ IN | 의미론적 gap 수정에 opus 추론 필요 |
| 자동 A/B 테스트 | ❌ OUT | YAGNI — 수동 비교로 충분 |
| 평가 이력 DB | ❌ OUT | YAGNI — 기존 metrics-collector로 충분 |
| 커스텀 가중치 UI | ❌ OUT | YAGNI — config로 충분 |

---

## 3. 상세 설계

### 3.1 의미론적 평가 축 (Semantic Evaluation Axes)

#### 3.1.1 Intent Match (설계 의도 충족도)

```
Design의 Context Anchor(WHY/SUCCESS)와 구현이 같은 목적을 달성하는지 평가.
코드를 읽고 "이 코드가 설계가 해결하려는 문제를 실제로 해결하는가?"를 판단.

Scoring Rubric:
  100: 설계 의도를 완전히 달성. 핵심 가치 제안이 코드에 반영됨
   80: 핵심 의도는 달성하지만 부수적 목적 일부 미충족
   60: 의도의 방향은 맞지만 핵심 기능이 불완전
   40: 구조만 존재. 설계 의도와 구현 목적이 괴리
   20: 설계와 무관한 코드. 완전히 다른 방향
    0: 구현 없음

평가 방법:
  1. Design의 Context Anchor(WHY/SUCCESS) 섹션 읽기
  2. Plan의 Success Criteria 목록 추출
  3. 구현 코드의 핵심 로직을 LLM이 이해
  4. 각 Success Criteria에 대해 "구현이 이를 달성하는가?" 판단
  5. 달성 비율로 점수 산출
```

#### 3.1.2 Behavioral Completeness (행동 완전성)

```
Design에 명시된 엣지케이스, 에러 처리, 경계 조건이 구현에 반영되었는지 평가.
"정상 경로만 되는 코드" vs "모든 경로가 되는 코드" 구분.

Scoring Rubric:
  100: 모든 엣지케이스, 에러 처리, 경계 조건 구현됨
   80: 주요 엣지케이스 처리됨, 일부 마이너 케이스 누락
   60: 정상 경로 + 기본 에러 처리만 존재
   40: 정상 경로만 동작. 에러 시 crash 또는 무반응
   20: 일부 경로만 동작. 핵심 시나리오도 불완전
    0: 구현 없음

평가 방법:
  1. Design의 에러 처리 섹션, API 스펙의 에러 응답, UX 스펙의 에러 상태 추출
  2. 구현 코드에서 try-catch, if-error, validation, null check 패턴을 LLM이 이해
  3. "Design에서 요구한 에러 시나리오 N개 중 M개 처리됨" 판단
  4. 누락된 에러 처리를 구체적으로 목록화
```

#### 3.1.3 UX Fidelity (UX 충실도)

```
사용자 경험 흐름이 Design 명세와 일치하는지 평가.
Loading state, empty state, error feedback, transition, accessibility.

Scoring Rubric:
  100: 모든 UX 상태(loading, empty, error, success)가 Design대로 구현
   80: 주요 UX 상태 구현됨, 일부 피드백/트랜지션 누락
   60: 기본 UI 존재하지만 상태 관리 불완전 (loading 없음 등)
   40: 정적 UI만 존재. 인터랙션/피드백 없음
   20: 레이아웃만 존재. 기능적 UI 요소 없음
    0: UI 구현 없음

평가 방법:
  1. Design의 UI 스펙에서 상태별 동작 추출 (loading, error, empty, success)
  2. 구현 코드에서 상태 관리 로직을 LLM이 이해
  3. 각 상태에 대해 "적절한 UI 피드백이 있는가?" 판단
  4. 비-프론트엔드 프로젝트는 이 축을 0 가중치로 자동 조정

주의: UI가 없는 프로젝트(CLI, 라이브러리, 백엔드 only)에서는
  이 축을 자동 비활성화하고 다른 축에 가중치 재분배
```

### 3.2 새 Match Rate 공식

```
Runtime 있을 때 (QA phase 통과 후):
  Overall = (Structural × 0.10) + (Functional × 0.15)
          + (Contract × 0.15) + (Intent × 0.20)
          + (Behavioral × 0.15) + (UX × 0.10)
          + (Runtime × 0.15)

Runtime 없을 때 (static only):
  Overall = (Structural × 0.10) + (Functional × 0.20)
          + (Contract × 0.20) + (Intent × 0.25)
          + (Behavioral × 0.15) + (UX × 0.10)

비-프론트엔드 프로젝트 (UX 축 비활성화):
  UX 가중치를 Intent에 재분배
  Overall = (Structural × 0.10) + (Functional × 0.20)
          + (Contract × 0.20) + (Intent × 0.35)
          + (Behavioral × 0.15)
```

### 3.3 gap-detector.md 변경 사항

기존 7개 비교 항목 유지 + 의미론적 평가 섹션 추가:

```
변경 항목:
1. "## Comparison Items" 섹션 끝에 "### 8. Semantic Evaluation" 추가
2. Scoring Rubric 3개 축 + 기준표 추가
3. "## Detection Result Format"에 Semantic Score 테이블 추가
4. Match Rate 공식 변경 (§4.1 업데이트)
5. 평가 절차에 "Design 의도 이해 → 코드 의미 파악 → Rubric 기반 판정" 추가
```

변경 규모: gap-detector.md에 ~150줄 추가 (기존 627줄 → ~780줄)

### 3.4 pdca-iterator.md 변경 사항

```
변경 항목:
1. model: sonnet → opus (의미론적 gap 이해에 opus 추론 필요)
2. effort: medium → high
3. "## Evaluator Types" 섹션에 "### 4. Semantic Evaluator" 추가
4. "## Improvement Generation"에 의미론적 수정 지침 추가:
   - Intent gap: "설계 의도를 코드 로직에 반영하는 방향으로 수정"
   - Behavioral gap: "누락된 엣지케이스/에러 처리 추가"
   - UX gap: "상태 관리 + 사용자 피드백 코드 추가"
5. 수정 후 재평가 시 의미론적 축도 포함하도록 지침 업데이트
```

변경 규모: pdca-iterator.md에 ~80줄 추가, frontmatter 2줄 변경

---

## 4. 구현 범위

### 4.1 수정 파일 (2개)

| # | 파일 | 변경 내용 | 영향도 |
|---|------|-----------|--------|
| 1 | agents/gap-detector.md | +Semantic Evaluation 섹션, +Scoring Rubric, 공식 변경 | High |
| 2 | agents/pdca-iterator.md | model→opus, effort→high, +Semantic Evaluator | Medium |

### 4.2 신규 파일 (0개)

Agent body 수정만으로 완료. 신규 코드 파일 불필요.

### 4.3 테스트 영향

- gap-detector-stop.js: 변경 없음 (출력 포맷 "Match Rate: XX%" 유지)
- metrics-collector: 변경 없음 (M1 수집 방식 동일)
- state-machine: 변경 없음 (threshold 판정 로직 동일)
- 기존 테스트: 회귀 0건 (agent body만 변경, 코드 수정 없음)

---

## 5. 구현 순서

| Phase | 작업 | 파일 |
|-------|------|------|
| 1 | gap-detector.md에 Semantic Evaluation 섹션 추가 | agents/gap-detector.md |
| 2 | gap-detector.md의 Match Rate 공식 + 결과 포맷 업데이트 | agents/gap-detector.md |
| 3 | pdca-iterator.md model/effort 업그레이드 + Semantic Evaluator 추가 | agents/pdca-iterator.md |
| 4 | 검증 (기존 테스트 회귀 확인) | test/ |

---

## 6. 성공 기준

| # | 기준 | 측정 방법 |
|---|------|-----------|
| SC1 | gap-detector agent body에 3개 의미론적 평가 축 명시 | agent md 확인 |
| SC2 | 각 축에 5단계 Scoring Rubric 존재 | agent md 확인 |
| SC3 | Match Rate 공식에 의미론적 축 합계 ≥ 40% | 공식 검증 |
| SC4 | pdca-iterator가 opus + high effort | frontmatter 확인 |
| SC5 | 기존 테스트 회귀 0건 | 전체 테스트 통과 |
| SC6 | 출력 포맷 하위 호환 ("Match Rate: XX%" 패턴 유지) | gap-detector-stop.js 호환 확인 |

---

## 7. 리스크

| # | 리스크 | 확률 | 영향 | 완화 |
|---|--------|------|------|------|
| R1 | 의미론적 평가의 주관성 → 동일 코드에 다른 점수 | 중 | 중 | Scoring Rubric으로 기준 명시, ±5% 허용 |
| R2 | 평가 시간 증가 (더 많은 코드를 읽어야 함) | 고 | 저 | maxTurns 유지, 핵심 파일만 deep read |
| R3 | pdca-iterator opus 업그레이드 → 토큰 비용 증가 | 고 | 중 | iteration 횟수 감소로 상쇄 (더 정확한 수정) |
| R4 | 기존 Match Rate와의 비호환 (같은 코드에 낮은 점수) | 중 | 중 | "Overall" 점수 유지, Semantic은 별도 섹션으로 보고 |

---

## 8. 제약 사항

| # | 제약 | 대응 |
|---|------|------|
| C1 | agent body만 변경, lib/ 코드 수정 없음 | 기존 infra 100% 재사용 |
| C2 | gap-detector-stop.js의 regex 패턴 유지 | "Overall" 또는 "Match Rate" 패턴 출력 필수 |
| C3 | pdca-iterator는 Write/Edit 도구 사용 가능해야 함 | 기존 도구 유지 |

---

## 9. 브레인스토밍 로그

### 의도 발견

- 사용자 핵심 니즈: "코드가 있다"와 "설계대로 동작한다"를 구분하는 평가
- gap-detector가 opus인데 grep 위주 지침 = LLM 능력 낭비
- pdca-iterator가 sonnet = 의미론적 gap 수정에 부족

### 대안 탐색

- Option B (새 에이전트): 과도한 복잡도 → 기각
- Option C (코드 분석 모듈): LLM 없이 의미 분석 불가 → 기각

### YAGNI 검토

- A/B 테스트 자동화: 수동 비교로 충분 → OUT
- 평가 이력 DB: metrics-collector가 이미 M1 추적 → OUT
- 커스텀 가중치 UI: bkit.config.json으로 충분 → OUT
