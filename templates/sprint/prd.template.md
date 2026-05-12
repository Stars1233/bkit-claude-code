---
template: sprint-prd
version: 1.0
description: Sprint PRD phase document — Context Anchor, Job Stories, Solution, Success Metrics, Pre-mortem
variables:
  - feature: Sprint feature name
  - date: Creation date
  - author: Author
  - trustLevel: Trust Level
---

# {feature} PRD — Sprint Management

> **Sprint ID**: `{feature}`
> **Phase**: PRD (1/7)
> **Date**: {date}
> **Author**: {author}
> **Trust Level**: {trustLevel}

---

## 0. Context Anchor (보존 — 후속 phase 모두 복사)

| Key | Value |
|-----|-------|
| **WHY** | (Sprint 가 해결할 핵심 문제) |
| **WHO** | (1차/2차/n차 사용자) |
| **RISK** | (실패 시나리오 + 사전 식별 위험) |
| **SUCCESS** | (성공 기준) |
| **SCOPE** | (in-scope + out-of-scope 정량 명시) |

---

## 1. Problem Statement

(현 상태 vs 기대 상태 + 부재한 기능 매트릭스)

---

## 2. Job Stories (JTBD 6-Part)

### Job Story 1
- **When** (상황),
- **I want to** (행동)
- **so I can** (가치).

(필요 시 8건 이상 추가)

---

## 3. User Personas

(1~3 personas 정의: 목표 / 요구사항 / pain point)

---

## 4. Solution Overview

(구조 + 모듈 + 데이터 흐름 + 핵심 결정)

---

## 5. Success Metrics

### 5.1 정량 메트릭

| Metric | Target | 측정 방법 |
|--------|--------|----------|
| (M1 matchRate) | ≥90 (100 목표) | gap-detector |
| ... | ... | ... |

### 5.2 정성 메트릭

(코드 품질 / UX 일관성 / 문서 완성도 등)

---

## 6. Out-of-scope

(다른 sprint 또는 후속 release 이월 항목 매트릭스)

---

## 7. Stakeholder Map

| Stakeholder | Role | Sprint 영향 |
|------------|------|------------|
| (예: kay kim) | Decision maker | 전 phase |

---

## 8. Pre-mortem (실패 시나리오 + 사전 방지)

### Scenario A: (실패 시나리오 1)
- **영향**: ...
- **방지**: ...

(필요 시 10건 이상)

---

## 9. PRD 완료 Checklist

- [ ] Context Anchor 5건 모두 작성
- [ ] Problem Statement 부재 매트릭스
- [ ] Job Stories 최소 5건
- [ ] User Personas 1+
- [ ] Solution Overview 구조 + 데이터 흐름
- [ ] Success Metrics 정량 + 정성
- [ ] Out-of-scope 매트릭스
- [ ] Stakeholder Map
- [ ] Pre-mortem 최소 5 시나리오

---

**Next Phase**: Phase 2 Plan — Requirements + Feature Breakdown + Quality Gates + Risks.
