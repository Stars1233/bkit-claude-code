---
template: sprint-plan
version: 1.0
description: Sprint Plan phase document — Requirements, Feature Breakdown, Quality Gates, Risks
variables:
  - feature: Sprint feature name
  - date: Creation date
  - author: Author
---

# {feature} Plan — Sprint Management

> **Sprint ID**: `{feature}`
> **Phase**: Plan (2/7)
> **Date**: {date}
> **Author**: {author}
> **PRD Reference**: `docs/01-plan/features/{feature}.prd.md`

---

## 0. Context Anchor (PRD §0 복사, 보존)

(PRD §0 내용 복사 — Plan 전체에 동일 적용)

---

## 1. Requirements

### 1.1 In-scope (반드시 구현)

#### R1. (요구사항 1)
**Public API / Behavior / Acceptance criteria**

#### R2. (요구사항 2)
...

### 1.2 Out-of-scope (Sprint 명시 제외)
- 항목 1 — (이월 sprint 또는 release)

---

## 2. Feature Breakdown

| # | Feature | LOC est. | Public Exports | Imports |
|---|---------|---------|----------------|---------|
| 1 | (feature-1) | ~100 | ... | ... |

---

## 3. Quality Gates (Sprint 활성)

| Gate | Threshold | Phase | 측정 |
|------|----------|-------|------|
| M1 matchRate | ≥90 (100 목표) | Iterate | gap-detector |
| ... | ... | ... | ... |

---

## 4. Risks & Mitigation

| Risk | Likelihood | Severity | Mitigation |
|------|:---------:|:--------:|-----------|

---

## 5. Document Index

| Phase | Document | Path |
|-------|----------|------|
| PRD | (현재) | docs/01-plan/features/{feature}.prd.md |
| Plan | 본 문서 | docs/01-plan/features/{feature}.plan.md |
| Design | ⏳ | docs/02-design/features/{feature}.design.md |
| Iterate | ⏳ | docs/03-analysis/features/{feature}.iterate.md |
| QA | ⏳ | docs/05-qa/features/{feature}.qa-report.md |
| Report | ⏳ | docs/04-report/features/{feature}.report.md |

---

## 6. Implementation Order (Phase 4 Do)

| Step | File | 이유 |
|:----:|------|------|
| 1 | ... | ... |

---

## 7. Acceptance Criteria (Phase 6 QA)

- [ ] Static checks (syntax + lint)
- [ ] Runtime checks (require + integration)
- [ ] L1/L2/L3 TC PASS
- [ ] Invariant 보존

---

## 8. Cross-Sprint Dependency

(다른 sprint 가 본 sprint 산출 사용 매트릭스 또는 본 sprint 가 다른 sprint 의존)

---

## 9. Plan 완료 Checklist

- [ ] Requirements R1+
- [ ] Out-of-scope 매트릭스
- [ ] Feature Breakdown
- [ ] Quality Gates
- [ ] Risks
- [ ] Document Index
- [ ] Implementation Order
- [ ] Acceptance Criteria
- [ ] Cross-Sprint Dependency

---

**Next Phase**: Phase 3 Design — 코드베이스 깊이 분석 + 구현 spec + Test Plan Matrix.
