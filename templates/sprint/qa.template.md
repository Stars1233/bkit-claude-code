---
template: sprint-qa
version: 1.0
description: Sprint QA phase report — 7-Layer S1 verification, regression check, invariant verification
variables:
  - feature: Sprint feature name
  - date: Date
---

# {feature} QA Report — Sprint Management

> **Sprint ID**: `{feature}`
> **Phase**: QA (6/7)
> **Date**: {date}
> **Environment**: `--plugin-dir .` active session

---

## 0. Context Anchor (보존)

---

## 1. QA 실행 요약

### 1.1 Test Layer 매트릭스

| Layer | Coverage | Result |
|-------|---------|--------|
| L1 Unit | N TCs | ✅/❌ |
| L2 Integration | N TCs | ✅/❌ |
| L3 Contract / Cross-Sprint Integration | N TCs | ✅/❌ |
| L4 E2E | (선택) | - |
| L5 Performance | (선택) | - |
| **누적** | **N TCs** | **✅/❌** |

### 1.2 검증 방법

(static checks / runtime / regression / plugin validate / invariant)

---

## 2. Test Group 결과

| Group | TCs | Coverage |
|-------|-----|---------|

---

## 3. 7-Layer S1 dataFlowIntegrity 검증

| Hop | feature-A | feature-B | ... |
|-----|---------|---------|-----|
| H1 UI→Client | ✅ | ✅ | |
| H2 Client→API | ✅ | ✅ | |
| H3 API→Validation | ✅ | ✅ | |
| H4 Validation→DB | ✅ | ✅ | |
| H5 DB→Response | ✅ | ✅ | |
| H6 Response→Client | ✅ | ✅ | |
| H7 Client→UI | ✅ | ✅ | |
| **s1Score** | 100 | 100 | |

---

## 4. Diverse Runtime Scenarios

| # | 시나리오 | 결과 |
|---|---------|------|

---

## 5. Invariant 검증 결과

| Invariant | Pre | Post | Change |
|-----------|-----|------|--------|

---

## 6. Cross-Sprint Integration 검증 결과 (★ 해당 시)

(Sprint 1+2+3+... 결과물 유기적 동작 검증)

---

## 7. Issues 발견

### 7.1 Critical / Blockers
- (있다면)

### 7.2 Minor / Future enhancements

| Issue | Severity | 후속 |
|-------|---------|-----|

---

## 8. CC Version Compatibility

(`claude plugin validate .` Exit 0 + F9-120 closure cycle 누적)

---

## 9. QA 완료 Checklist

- [ ] L1/L2/L3 TC PASS
- [ ] Cross-Sprint Integration PASS (★)
- [ ] 7-Layer S1 검증
- [ ] Invariant 보존 (PDCA + 이전 sprint)
- [ ] Regression 0
- [ ] Domain Purity
- [ ] plugin validate Exit 0

---

**QA Verdict**: ✅/❌ Sprint X (status)
**Next Phase**: Phase 7 Report — 종합 완료 보고서.
