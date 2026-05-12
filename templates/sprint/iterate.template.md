---
template: sprint-iterate
version: 1.0
description: Sprint Iterate phase analysis — matchRate measurement, iteration history, blocked detection
variables:
  - feature: Sprint feature name
  - date: Date
---

# {feature} Iterate Analysis — Sprint Management

> **Sprint ID**: `{feature}`
> **Phase**: Iterate (5/7)
> **Date**: {date}
> **Target**: matchRate **100%**

---

## 0. Context Anchor (보존)

---

## 1. matchRate 측정

### 1.1 Module 단위 정합

| Design § | File | LOC actual | Status |
|---------|------|------------|--------|

### 1.2 Requirements 정합

| Req | Status |
|-----|--------|

### 1.3 Plan Acceptance Criteria 정합

| Group | Plan Target | Actual | matchRate |
|-------|----------|--------|----------|

### 1.4 Quality Gates Evaluation

| Gate | Target | 측정 | Status |
|------|-------|-----|--------|

---

## 2. Iteration History

| Iter | matchRate (전) | 수정 작업 | matchRate (후) | durationMs |
|------|--------------|---------|--------------|-----------|

---

## 3. Cross-Sprint Integration 검증 결과 (해당 시)

(이전 sprint 와의 통합 TC 결과)

---

## 4. Risks 잔존 점검

(PRD/Plan/Design risks 의 mitigation 결과)

---

## 5. Iteration 결과

- Tests written: N TCs
- First run: M/N PASS
- matchRate: P%
- 최종 iteration count: I (max 5)

---

## 6. Iterate 완료 Checklist

- [ ] Module 단위 정합
- [ ] Requirements 모두 ✅
- [ ] Plan Acceptance Criteria
- [ ] Quality Gates 모두 PASS
- [ ] Cross-Sprint Integration (해당 시)
- [ ] matchRate **100%** 달성 또는 blocked 명시

---

**matchRate**: ★ N% (M/N TCs, P/Q Requirements, R/S CSI)
**Next Phase**: Phase 6 QA — `--plugin-dir .` 환경 다양한 케이스 검증
