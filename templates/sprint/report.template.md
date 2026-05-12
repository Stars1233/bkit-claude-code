---
template: sprint-report
version: 1.0
description: Sprint completion final report — implementation summary, test results, issues, lessons, next steps
variables:
  - feature: Sprint feature name
  - date: Date
---

# {feature} 완료 보고서 — Sprint Management

> **Sprint ID**: `{feature}`
> **Phase**: Report (7/7)
> **Date**: {date}
> **Branch**: (branch name)
> **Base commit**: (commit SHA)

---

## 1. Executive Summary

| 항목 | 값 |
|------|-----|
| **Mission** | (sprint 목표) |
| **Result** | ✅ 완료 — N files M LOC + N TCs PASS |
| **matchRate** | ★ 100% |
| **Cross-Sprint Integration** | ✅ K/K CSI TCs PASS (해당 시) |
| **Invariant** | ✅ 0 변경 (이전 sprint + PDCA) |
| **`claude plugin validate .`** | ✅ Exit 0 |

---

## 2. 산출물

### 2.1 코드

```
(파일 트리 + LOC)
```

### 2.2 Public API Surface

| Category | Items |
|---------|-------|

### 2.3 Documentation

(6 phase docs 목록)

### 2.4 Tests (gitignored local 또는 tracked)

---

## 3. 구현 상세

### 3.1 Module 구현 순서

| Step | Module | 책임 | 의존 |

### 3.2 핵심 아키텍처 결정

(1~10 결정 리스트)

### 3.3 Cross-Sprint 통합 검증 매트릭스 (★ 해당 시)

| 이전 sprint export | 본 sprint 사용 |

---

## 4. PDCA Cycle 진행 결과

| Phase | 산출물 | Result | 소요 |

---

## 5. 사용자 요구사항 충족 매트릭스

| 사용자 요구 | 적용 | Status |

---

## 6. Cross-Sprint 유기적 상호 연동 검증 결과 (★ 해당 시)

(사용자 명시 cross-sprint 요구 충족 evidence)

---

## 7. Issues / Lessons

### 7.1 Issues found

| # | Severity | Issue | Resolution |

### 7.2 학습 (Lessons)

(재사용 가능 인사이트)

---

## 8. 다음 단계

### 8.1 다음 sprint 진입 준비

| 의존성 | 준비 상태 |

### 8.2 사용자 명시 constraint 후속 적용 (보존)

### 8.3 Carry items

| 항목 | Carry to |

---

## 9. Sign-off

| 검증 | 결과 | Evidence |

**Sprint Status**: ✅ COMPLETE
