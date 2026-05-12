---
template: sprint-master-plan
version: 1.0
description: Sprint Master Plan template — overall sprint orchestration map
variables:
  - feature: Sprint feature name (kebab-case id)
  - displayName: Human-readable sprint name
  - date: Creation date (YYYY-MM-DD)
  - author: Author name
  - trustLevel: Initial Trust Level (L0~L4)
  - duration: Estimated duration
---

# {displayName} — Sprint Master Plan

> **Sprint ID**: `{feature}`
> **Date**: {date}
> **Author**: {author}
> **Trust Level (시작)**: {trustLevel}
> **예상 기간**: {duration}
> **Master Plan template**: bkit v2.1.13 (Sprint 4 Presentation 산출)

---

## 0. Executive Summary

| 항목 | 내용 |
|------|------|
| **Mission** | (Sprint 의 핵심 목표 한 줄) |
| **Anti-Mission** | (이 sprint 가 다루지 않는 영역 명시) |
| **Core Primitives** | (구성 features + phases + 자원) |
| **Trust Level** | {trustLevel} — 자동 진행 범위 명시 |
| **Auto-pause 조건** | 4 triggers 활성 (QUALITY_GATE_FAIL / ITERATION_EXHAUSTED / BUDGET_EXCEEDED / PHASE_TIMEOUT) |
| **Success Criteria** | 5건 (매트릭스 § 5 참고) |

---

## 1. Context Anchor (Plan → Design → Do 전파)

| Key | Value |
|-----|-------|
| **WHY** | (왜 이 sprint 가 필요한가) |
| **WHO** | (대상 사용자 또는 stakeholders) |
| **WHAT (도메인)** | (Sprint 가 다루는 작업 묶음) |
| **WHAT NOT** | (명시적 제외) |
| **RISK** | (실패 시 영향 + 사전 식별 위험) |
| **SUCCESS** | (성공 측정 기준) |
| **SCOPE (정량)** | (Features 수 / 예상 LOC / 기간 / 비용) |
| **OUT-OF-SCOPE** | (다른 sprint 으로 이월 항목) |

---

## 2. Features (sprint 구성 작업 묶음)

| # | Feature | 우선순위 | 상태 | 담당 |
|---|---------|--------|------|------|
| 1 | (feature-name-1) | P0 | pending | - |
| 2 | (feature-name-2) | P1 | pending | - |

---

## 3. Sprint Phase Roadmap

| Phase | 활성 시점 | 산출물 | Quality Gates |
|-------|---------|------|-------------|
| prd | sprint 시작 | PRD 문서 | M8 |
| plan | PRD 후 | Plan 문서 | M8 |
| design | Plan 후 | Design 문서 (코드베이스 분석 포함) | M4, M8 |
| do | Design 후 | 구현 코드 | M2, M3, M5, M7 |
| iterate | matchRate < 100 시 | matchRate 100% 달성 | M1 (100%) |
| qa | iterate 후 | 7-Layer S1 검증 | M3 (=0), S1 (=100) |
| report | qa 후 | 종합 보고서 | M10, S2, S4 |
| archived | report 후 (L4) 또는 사용자 명시 | terminal state | - |

---

## 4. Quality Gates 활성화 매트릭스

(Master Plan §12.1 참고. M1-M10 + S1-S4 각 phase 별 적용 표.)

---

## 5. Success Metrics (5건)

| # | Metric | Target | 측정 방법 |
|---|--------|--------|----------|
| 1 | matchRate (Design ↔ Code) | 100% | gap-detector |
| 2 | criticalIssueCount | 0 | code-analyzer |
| 3 | dataFlowIntegrity (7-Layer S1) | 100% | sprint-qa-flow agent |
| 4 | featureCompletion | 100% | featureMap 집계 |
| 5 | sprint cycle time | (사용자 정의) | M10 |

---

## 6. Auto-Pause Triggers (4 활성)

| Trigger | 조건 | 사용자 결정 옵션 |
|---------|------|----------------|
| QUALITY_GATE_FAIL | M3 > 0 OR S1 < 100 | fix & resume / forward fix / abort |
| ITERATION_EXHAUSTED | iter ≥ 5 AND matchRate < 90 | forward fix / carry / abort |
| BUDGET_EXCEEDED | cumulativeTokens > budget | budget 증액 & resume / abort / archive |
| PHASE_TIMEOUT | phase 진행 시간 > config.phaseTimeoutHours | timeout 연장 / force-advance / abort |

---

## 7. Cross-Sprint Dependency

(다른 sprint 가 본 sprint 산출물을 어떻게 활용하는가, 또는 본 sprint 가 다른 sprint 의존성)

---

## 8. Risks & Mitigation

(시나리오별 가능성 + 영향도 + 대응 계획)

---

## 9. Resume / Abort 흐름

| 상황 | 절차 |
|------|------|
| Auto-pause 후 resume | `/sprint resume {feature}` — 사유 해소 검증 |
| 사용자 abort | `/sprint archive {feature}` — terminal state |

---

## 10. Sprint 추적 (Living document)

본 master plan 은 sprint 진행 중 cumulative KPI 갱신 + phase 전이 시 history append. archived 시 readonly 전환.
