---
template: sprint-design
version: 1.0
description: Sprint Design phase document — codebase analysis, module spec, Test Plan Matrix L1-L5, cross-sprint integration
variables:
  - feature: Sprint feature name
  - date: Creation date
  - author: Author
---

# {feature} Design — Sprint Management

> **Sprint ID**: `{feature}`
> **Phase**: Design (3/7)
> **Date**: {date}
> **Author**: {author}
> **PRD/Plan Reference**: docs/01-plan/features/{feature}.prd.md + .plan.md

---

## 0. Context Anchor (PRD §0 + Plan §0 일치, 보존)

---

## 1. 코드베이스 깊이 분석 (필수)

### 1.1 기존 모듈 분석
(현 codebase 의 관련 모듈 file:line 명시 + 함수 signature + 통합 지점)

### 1.2 의존성 매트릭스
(본 sprint 가 import 할 기존 자산 + 변경 금지 invariant 명시)

---

## 2. Module 구조 + Implementation Order

```
(파일 트리)
```

| Step | File | LOC | 책임 |
|:----:|------|-----|------|

---

## 3. Module 상세 spec

### 3.1 Module 1

**Header**:
```
@module ...
@version ...
```

**Public API**:
```javascript
function ... (...): ...
```

**Behavior** (단계별 설명)

**Edge cases** (입력 검증 + 에러 path)

---

## 4. Cross-Sprint Integration (★ 사용자 명시)

(Sprint 1+2+3 연동 데이터 흐름 다이어그램 또는 매트릭스)

---

## 5. ENH-292 Sequential Dispatch 자기적용 (해당 시)

| Use case | Sequential 위치 |

---

## 6. Test Plan Matrix L1-L5

### 6.1 L1 Unit
| TC ID | Coverage |

### 6.2 L2 Integration
| TC ID | Coverage |

### 6.3 L3 Contract / Cross-Sprint Integration ★
| TC ID | Coverage |

### 6.4 L4 E2E (선택)
### 6.5 L5 Performance (선택)

---

## 7. Quality Gates Activation

| Gate | Phase 진행 시 활성 |

---

## 8. Risks (PRD/Plan + Design specific)

---

## 9. Design 완료 Checklist

- [ ] Context Anchor 보존
- [ ] 코드베이스 분석
- [ ] Module 구조 + Implementation Order
- [ ] Module 상세 spec (각 file)
- [ ] Cross-Sprint Integration (★)
- [ ] Test Plan Matrix L1-L5
- [ ] Quality Gates Activation
- [ ] Risks

---

**Next Phase**: Phase 4 Do — Implementation (leaf-first → orchestrator-last).
