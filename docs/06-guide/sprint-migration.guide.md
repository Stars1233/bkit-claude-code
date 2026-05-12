# Sprint Migration 가이드 — PDCA → Sprint Management (v2.1.13)

> **언어**: 한국어
> **bkit 버전**: v2.1.13
> **마지막 갱신**: 2026-05-12
> **대상**: 기존 bkit `/pdca` 사용자 + Sprint Management 신규 도입자
> **관련**: [Sprint Management Guide](./sprint-management.guide.md)

---

## 1. PDCA ↔ Sprint 매핑

### 1.1 Phase 매핑 매트릭스

bkit 의 기존 **PDCA 9-phase enum** 과 신규 **Sprint 8-phase enum** 의 overlap 분석:

| PDCA phase | Sprint phase | 관계 |
|-----------|-------------|------|
| `pm` | — | PDCA 전용 (Product Discovery, Job Stories 등) |
| `plan` | `plan` | ✅ overlap (의미 동일) |
| `design` | `design` | ✅ overlap (의미 동일) |
| `do` | `do` | ✅ overlap (의미 동일) |
| `check` | — | PDCA 전용 (matchRate, gap analysis) |
| `act` | — | PDCA 전용 (개선 루프) |
| `qa` | `qa` | ✅ overlap (의미 동일) |
| `report` | `report` | ✅ overlap (의미 동일) |
| `archive` (verb-form) | `archived` (state-form) | ⚠️ semantic match, string 다름 |
| — | `prd` | Sprint 전용 (Product Requirements, sprint 수준) |
| — | `iterate` | Sprint 전용 (matchRate 100% loop, PDCA check+act 통합) |

- **Exact string overlap**: 5 phases (plan / design / do / qa / report)
- **Semantic match (다른 string)**: PDCA `archive` ↔ Sprint `archived`
- **PDCA 전용**: 3 phases (pm / check / act)
- **Sprint 전용**: 3 phases (prd / iterate / archived는 PDCA `archive` 와 semantic 매칭)

**중요**: PDCA enum 은 `archive` (동사형 — "to archive") 를 사용하고, Sprint enum 은 `archived` (상태형 — "is archived") 를 사용합니다. 의미적으로 같은 종료 상태이지만 string identity 는 다릅니다. L3 Contract test 와 Sprint↔PDCA mapping verification (P6) 이 이 차이를 명시적으로 다룹니다.

### 1.2 의미적 차이

| 측면 | PDCA | Sprint |
|------|------|--------|
| **단위** | 단일 feature | 1+ features 묶음 |
| **시작점** | `pm` (product management 분석) | `prd` (sprint 수준 PRD) |
| **품질 루프** | `check → act` (별도 phase) | `iterate` (통합 phase) |
| **종료** | feature archived | sprint archived (포함 features 모두) |

---

## 2. 차이점 상세

### 2.1 PDCA `pm` phase → Sprint `prd` 위치

PDCA `pm` 은 **단일 feature 의 product management 분석** (사용자 페르소나, JTBD, market analysis). Sprint `prd` 는 **여러 feature 가 묶인 sprint 의 product requirements** (sprint scope, budget, success criteria).

Sprint 내에서 feature 별 product 분석이 필요하면:
- Sprint `prd` 에서 sprint 수준 요약
- 각 feature 의 `featureMap[feature].pmDoc` 에 개별 product 분석 link

### 2.2 PDCA `check + act` ↔ Sprint `iterate`

PDCA `check` (gap-detector 측정) + `act` (pdca-iterator 자동 수정) 가 Sprint 에서는 **단일 `iterate` phase** 로 통합. 행위적 차이는 없으나:
- PDCA: 2-phase 명시 분리 (`check` 결과 보고 후 `act` 진입 결정)
- Sprint: 1-phase 자동 루프 (matchRate 임계값 도달 또는 max iterations 까지)

### 2.3 Sprint 만의 신규 기능

| 기능 | 설명 | PDCA 동등 |
|------|------|----------|
| **Trust Level Scope (L0-L4)** | 자동 진행 boundary 정의 | 부재 (PDCA 는 phase 단위 수동) |
| **4 Auto-Pause Triggers** | quality gate / iteration / budget / timeout 자동 정지 | 부재 |
| **featureMap (1+ feature)** | sprint 내 여러 feature 트랙 | 부재 (PDCA 는 단일 feature) |
| **fork + carry items** | 미완료 features 만 새 sprint 로 이월 | 부재 |
| **8 use cases + DI** | Application Layer (Sprint 2) | 부재 (PDCA 는 절차적 script) |

---

## 3. 동시 트랙 (Orthogonal Coexistence)

### 3.1 4-System 상태 파일

bkit 은 다음 4 파일을 `.bkit/state/` 에서 **독립적** 으로 운영합니다:

| 파일 | 시스템 | 책임 |
|------|--------|------|
| `sprint-status.json` | ★ Sprint Management (신규) | sprint 생성/진행 상태 |
| `pdca-status.json` | 기존 PDCA | feature 단위 PDCA 사이클 |
| `trust-profile.json` | Trust Level | L0-L4 + stopAfter |
| `memory.json` | bkit memory | 세션 메모리 + 컨텍스트 |

**Orthogonal 원칙**: 4 파일은 서로 mutate 하지 않습니다. Sprint Management 가 `sprint-status.json` 을 갱신해도 `pdca-status.json` 은 변경되지 않으며, 그 역도 성립.

### 3.2 동시 트랙 예시

```bash
# Feature blog-redesign 을 PDCA 사이클로 진행
/pdca pm blog-redesign
/pdca plan blog-redesign
# → pdca-status.json 갱신

# 동시에 Sprint Management 로 묶기
/sprint init q2-launch --name "Q2 Launch" --features blog-redesign,reports
# → sprint-status.json 갱신, pdca-status.json 무변경

# Sprint 시작 시 blog-redesign 의 PDCA 상태는 보존
/sprint start q2-launch
/pdca status blog-redesign
# → 여전히 'plan' phase (PDCA 사이클 진행 중)
```

L3 Contract test SC-08 + `tests/qa/v2113-sprint-5-quality-docs.test.js` 의 P5 (4-System 공존 검증) 가 본 orthogonality 를 CI gate 로 자동 검증합니다.

---

## 4. Migration Scenarios

### Scenario A: 기존 PDCA 작업 보존하며 Sprint 도입

**상황**: 기존 `/pdca` 사용자가 처음 Sprint 도입.

```bash
# 1. 기존 PDCA 사이클 진행 중인 features 확인
ls docs/01-plan/features/

# 2. 신규 sprint 생성 (Trust L0 = 가장 안전)
/sprint init my-first-sprint --name "First Sprint" --features feature-a,feature-b --trust L0

# 3. Sprint 시작 (기존 PDCA 상태 무변경)
/sprint start my-first-sprint
```

**보존 보장**: Sprint init/start 는 `pdca-status.json` 을 일절 수정하지 않습니다 (orthogonal). 기존 features 의 PDCA phase 는 그대로 유지.

### Scenario B: PDCA → Sprint 컨테이너 wrap

**상황**: 이미 PDCA `plan` phase 에 있는 features 를 Sprint 로 묶어 budget 관리.

```bash
# 1. PDCA 상태 확인 (feature 각각 phase 추적)
/pdca status feature-a    # → 'plan'
/pdca status feature-b    # → 'design'

# 2. Sprint 생성 — features 의 현재 phase 는 sprint 'prd' phase 와 별도로 트랙
/sprint init wrap-sprint --features feature-a,feature-b --trust L1

# 3. Sprint 가 'design' 진입 시 features 의 PDCA 상태와 매칭 가능
/sprint phase wrap-sprint --to plan
# → sprint phase: 'plan' (sprint 단위)
# → feature-a PDCA phase: 'plan' (변경 없음)
# → feature-b PDCA phase: 'design' (변경 없음)
```

### Scenario C: feature 별 분리 (Sprint 만 사용)

**상황**: 새 작업에서 PDCA 를 우회하고 Sprint 만 사용.

```bash
# 1. 단일 feature sprint
/sprint init solo-task --features task-1 --trust L4

# 2. 시작 (L4 = archived 까지 자동, 4 triggers 발동 시 정지)
/sprint start solo-task

# 3. pdca-status.json 은 무영향 (feature 가 PDCA 사이클에 등록되지 않았으므로)
```

이 시나리오는 PDCA 와 Sprint 가 진정 orthogonal 임을 보여줍니다.

---

## 5. Rollback (Sprint 미사용 = PDCA 만)

Sprint Management 를 사용하지 않을 경우:

```bash
# Sprint 명령 없이 기존 PDCA 만 사용
/pdca pm feature-name
/pdca plan feature-name
/pdca design feature-name
# ... 기존과 동일
```

**보장**:
- `sprint-status.json` 은 sprint 명령을 호출하지 않는 한 생성되지 않습니다 (Sprint 3 lazy create 패턴)
- `pdca-status.json` 정상 작동 (Sprint Management 가 도입되어도 PDCA 코드는 변경되지 않음, Sprint 5 invariant)
- hooks/hooks.json 21:24 invariant 유지 (Sprint 1-5 모두 invariant)

Sprint Management 도입은 **opt-in** 이며 점진적 도입 가능합니다.

---

## 부록 A: 사용자 명시 3 (2026-05-12)

> "QA 는 eval 도 활용하고 claude -p 도 활용해서 Sprint 와 pdca, 그리고 각 status 관리나 memory 가 유기적으로 동작하는지도 포함해서 다양한 관점으로 실제 동작 하는지 검증해야해."

Sprint 5 QA phase 는 위 요구사항에 따라 다음을 검증합니다:
1. **`bkit:bkit-evals` skill** — sprint 명령 행위 평가
2. **`claude -p` headless** — 실 사용자 경험 시뮬레이션
3. **4-System 공존** — sprint/pdca/trust/memory 4 파일 orthogonal
4. **Sprint ↔ PDCA mapping** — 8-phase × 9-phase overlap 검증

자세한 매트릭스는 [Sprint 5 PRD](../01-plan/features/v2113-sprint-5-quality-docs.prd.md) §5.2 참조.

## 부록 B: 트러블슈팅

| 문제 | 원인 | 해결 |
|------|------|------|
| Sprint 명령 후 PDCA 상태 변경됨 | (발생 불가, orthogonal invariant) | L3 contract test SC-08 으로 검증 |
| Sprint init 후 sprint-status.json 부재 | lazy create — sprint start 시 생성 | `/sprint start <id>` 호출 |
| `/sprint fork` carry items 0건 | 모든 features 가 phase=archived 또는 phase=qa+ | 정상 (완료된 features 만 있음) |
| Trust Level L4 인데 즉시 정지 | 4 auto-pause triggers 중 하나 발동 | `/sprint status <id>` 로 trigger 확인 |
| PDCA phase 가 Sprint phase 와 다름 | orthogonal 정상 동작 | 각 시스템 독립 트랙 — 의도된 동작 |

---

**문서 버전**: v1.0 (Sprint 5 initial)
**문의**: bkit core team via GitHub issues
