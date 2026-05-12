# Sprint Management 사용자 가이드 (v2.1.13)

> **언어**: 한국어 (영어 사용자는 [`README.md`](../../README.md#sprint-management-v2113) 또는 [`skills/sprint/SKILL.md`](../../skills/sprint/SKILL.md) 참조)
> **bkit 버전**: v2.1.13
> **마지막 갱신**: 2026-05-12
> **관련 문서**: [Migration Guide](./sprint-migration.guide.md) · [Master Plan](../01-plan/features/sprint-management.master-plan.md)

---

## 1. Sprint Management 개념

### 1.1 정의

**Sprint** 는 하나 이상의 feature 를 **공유 scope · 예산 · 일정** 아래 묶는 메타 컨테이너입니다. 각 sprint 는 **8-phase 라이프사이클** 을 따라 자율적으로 진행되며, 사용자가 정의한 **Trust Level** 에 따라 자동/수동 모드를 선택할 수 있습니다.

### 1.2 PDCA 와의 관계

| 항목 | PDCA (기존) | Sprint Management (신규) |
|------|-------------|-------------------------|
| 단위 | 단일 feature | 1+ feature 묶음 |
| Phase | 9개 (pm/plan/design/do/check/act/qa/report/archived) | 8개 (prd/plan/design/do/iterate/qa/report/archived) |
| 목적 | feature 단위 PDCA 사이클 | sprint 단위 예산 + 시간 박스 |
| 자율 실행 | `/pdca` 명령 | `/sprint <action>` 명령 + Trust Scope |
| 상호 운용 | ✅ 공존 가능 (orthogonal storage) | ✅ 공존 가능 |

**핵심 원칙**: Sprint Management 는 PDCA 를 **대체하지 않습니다**. 두 시스템은 `.bkit/state/` 의 별도 파일에 독립적으로 상태를 저장하며, 동일 feature 가 PDCA 사이클 + Sprint 컨테이너에 동시 포함될 수 있습니다 (orthogonal coexistence).

### 1.3 언제 사용해야 하는가?

- ✅ **여러 feature 를 한 분기/스프린트 일정에 묶고 싶을 때** — Sprint Management
- ✅ **단일 feature 의 PDCA 사이클을 돌릴 때** — 기존 PDCA `/pdca`
- ✅ **두 가지를 동시에 사용** — sprint 안에 여러 feature 의 개별 PDCA 사이클을 트랙

---

## 2. 15 Sub-actions

### 2.1 매트릭스

| Action | 명령 | 목적 | 입력 |
|--------|------|------|------|
| `init` | `/sprint init <id>` | Sprint 생성 | `--name <name> --trust L0-L4 --features <a,b>` |
| `start` | `/sprint start <id>` | Sprint 실행 시작 | `--trust L0-L4` (선택) |
| `status` | `/sprint status <id>` | 현재 상태 조회 | — |
| `list` | `/sprint list` | 모든 sprint 목록 | — |
| `phase` | `/sprint phase <id>` | 다음 phase 로 진행 | `--to <phase>` |
| `iterate` | `/sprint iterate <id>` | matchRate 반복 개선 루프 실행 | — |
| `qa` | `/sprint qa <id>` | QA phase 실행 | `--feature <name>` (선택) |
| `report` | `/sprint report <id>` | 보고서 생성 | — |
| `archive` | `/sprint archive <id>` | 보존 처리 | — |
| `pause` | `/sprint pause <id>` | 자동 진행 중지 | — |
| `resume` | `/sprint resume <id>` | 자동 진행 재개 | — |
| `fork` | `/sprint fork <id>` | 다른 sprint 로 분기 | `--new <newId>` |
| `feature` | `/sprint feature <id>` | feature 관리 | `--action list/add/remove --feature <name>` |
| `watch` | `/sprint watch <id>` | 실시간 상태 + 트리거 + 매트릭스 스냅샷 | — |
| `help` | `/sprint help` | 도움말 | — |

### 2.2 예시

```bash
# Sprint 생성 + 시작 + 상태 조회
/sprint init q2-launch --name "Q2 Launch" --trust L3
/sprint start q2-launch
/sprint status q2-launch

# Phase 직접 전환
/sprint phase q2-launch --to design

# feature 추가/제거
/sprint feature q2-launch --action add --feature payment-flow
/sprint feature q2-launch --action remove --feature legacy-module

# 일시 중지 + 재개
/sprint pause q2-launch
/sprint resume q2-launch

# 분기 (carry items 만 새 sprint 로 이월)
/sprint fork q2-launch --new q3-carry

# 실시간 모니터
/sprint watch q2-launch
```

---

## 3. 8-Phase Lifecycle

```
prd → plan → design → do → iterate → qa → report → archived
```

### 3.1 각 Phase 의 목적

| Phase | 산출물 | bkit 문서 위치 |
|-------|--------|---------------|
| `prd` | Product Requirements Document | `docs/01-plan/features/<id>.prd.md` |
| `plan` | Implementation Plan | `docs/01-plan/features/<id>.plan.md` |
| `design` | Detailed Design | `docs/02-design/features/<id>.design.md` |
| `do` | Implementation (code) | `lib/`, `scripts/`, `skills/`, `agents/` |
| `iterate` | Iterate Analysis (matchRate 100%) | `docs/03-analysis/features/<id>.iterate.md` |
| `qa` | QA Report | `docs/05-qa/features/<id>.qa-report.md` |
| `report` | Completion Report | `docs/04-report/features/<id>.report.md` |
| `archived` | (보존됨) | sprint 메타데이터에만 표시 |

### 3.2 전환 규칙

- 순차 진행: `prd → plan` 만 가능, `prd → design` 불가 (단, `pause` 후 archival 은 어디서든 가능)
- `iterate → qa` 는 matchRate 가 임계값 (기본 90, sprint config 변경 가능) 통과 시
- `archived` 는 terminal state — 더 이상 진행 불가
- 각 전환은 `canTransitionSprint(currentPhase, toPhase) → { ok, reason? }` 패턴으로 검증

---

## 4. 4 Auto-Pause Triggers

Sprint 자동 실행 중 다음 4개 트리거 중 하나가 발동하면 sprint 가 **자동 일시 중지** 됩니다:

| Trigger | 발동 조건 | 권장 대응 |
|---------|----------|----------|
| `QUALITY_GATE_FAIL` | M1-M10/S1-S4 quality gate 미달 | gate 측정 결과 검토, plan 수정 |
| `ITERATION_EXHAUSTED` | iterate phase 최대 5회 반복 후에도 matchRate < 임계값 | design 재검토 또는 임계값 조정 |
| `BUDGET_EXCEEDED` | 토큰/시간 예산 초과 | sprint 분할 또는 fork |
| `PHASE_TIMEOUT` | 단일 phase 가 budget.phaseTimeoutMs 초과 | phase manual 진행 |

**armed triggers 설정**: sprint 생성 시 `sprint.autoPause.armed` 배열로 활성 트리거 지정 (기본: 4개 모두 활성).

`/sprint resume <id>` 명령으로 트리거 발동 후 재개할 수 있습니다 (단, 근본 원인 해결 권장).

---

## 5. Trust Level Scope (L0-L4)

`SPRINT_AUTORUN_SCOPE` 5 levels — 각 level 은 `stopAfter` (어디까지 자동 진행할지) 를 정의:

| Level | stopAfter | 동작 | 추천 시나리오 |
|-------|-----------|------|-------------|
| **L0** | `plan` | manual after plan | 첫 sprint, 사용자 모든 단계 확인 |
| **L1** | `design` | manual after design | design 검토 후 do 진입 결정 |
| **L2** | `do` | manual after do | 구현 결과 검토 후 iterate 결정 |
| **L3** | `qa` | semi-auto, manual at qa | 일상적 production sprint |
| **L4** | `archived` | full-auto until trigger | 신뢰도 높은 자동 sprint |

**원칙**:
- L0 는 가장 보수적 — 모든 phase 전환에 사용자 승인 필요
- L4 는 자동 진행하되 4 auto-pause triggers 가 발동하면 즉시 정지
- 사용자가 명시적으로 `--trust L4` 지정한 경우만 L4 진입 (기본 L0)

`lib/control/automation-controller.js` 의 `SPRINT_AUTORUN_SCOPE` 와 `lib/application/sprint-lifecycle/start-sprint.usecase.js` 의 inline scope 는 **1:1 미러** (Sprint 4 invariant, L3 contract test SC-07 자동 검증).

---

## 6. 7-Layer Data Flow QA (S1)

Sprint QA phase 는 feature 의 데이터 흐름을 **7개 hop** 으로 분할하여 검증합니다 (S1 quality gate):

```
H1 UI → H2 Client → H3 API → H4 Validation → H5 DB → H6 Response → H7 Client → UI
```

### 6.1 각 Hop 의 의미

| Hop | 검증 대상 |
|-----|----------|
| H1 | UI 입력 캡처 |
| H2 | Client 측 검증 + 직렬화 |
| H3 | API endpoint 도달 |
| H4 | Server 측 검증 + 인증 |
| H5 | DB persist |
| H6 | API response 직렬화 |
| H7 | Client deserialize + UI 반영 |

### 6.2 dataFlowValidator 주입

Sprint 5 부터 `lib/infra/sprint/data-flow-validator.adapter.js` 가 3-tier validation 을 제공:
- **Tier 1 (no-op)**: 의존성 미주입 (개발 환경 기본값)
- **Tier 2 (static)**: `sprint.dataFlow` 매트릭스 기반 정적 heuristic
- **Tier 3 (live)**: chrome-qa MCP 통한 실제 브라우저 probe

S1 `100%` 통과 = 모든 hop PASS.

---

## 7. Cross-feature / Cross-sprint Integration

### 7.1 다중 feature 운영

```bash
/sprint init q2-launch --name "Q2" --features auth,payment,reporting
/sprint feature q2-launch --action add --feature analytics
/sprint feature q2-launch --action list
# → [auth, payment, reporting, analytics]
```

각 feature 는 sprint 의 `featureMap[featureName]` 에 자체 phase/lifecycle 상태를 가지며, sprint phase 와 feature phase 는 **독립** 입니다.

### 7.2 Sprint fork 와 carry items

```bash
/sprint fork q2-launch --new q3-carry
# → carry items: features still in 'do' or 'iterate' phase
```

미완료 (still in `do`/`iterate`) features 만 자동 식별되어 신규 sprint 로 이월. 완료된 features (qa/report/archived) 는 원본 sprint 에 보존.

### 7.3 Sprint 1+2+3+4 architecture 와의 cross-layer 통합

| Layer | 디렉토리 | 본 가이드 관련 |
|-------|---------|--------------|
| Domain (Sprint 1) | `lib/domain/sprint/` | Sprint entity + frozen enum + validators |
| Application (Sprint 2) | `lib/application/sprint-lifecycle/` | 8 use cases + DI deps interface |
| Infrastructure (Sprint 3+5) | `lib/infra/sprint/` | 7 adapters (4 baseline + 3 production scaffold) |
| Presentation (Sprint 4) | `skills/sprint/`, `agents/sprint-*.md`, `templates/sprint/`, `scripts/sprint-handler.js` | 사용자 표면 (15 actions) |

L3 Contract test (`tests/contract/v2113-sprint-contracts.test.js`) 가 이 4-layer 통합 무결성을 CI gate 로 자동 검증합니다.

---

## 8. Worked Examples

### Example 1: 단일 feature sprint (입문)

```bash
# 1. 단일 feature 로 sprint 생성 (Trust L0 = 모든 단계 수동 확인)
/sprint init blog-redesign --name "Blog Redesign" --features blog-page --trust L0

# 2. Sprint 시작 → plan phase 까지 자동, 그 후 사용자 승인 대기
/sprint start blog-redesign

# 3. 사용자가 plan 검토 후 design 으로 진행
/sprint phase blog-redesign --to design

# 4. 모든 phase 통과 후 archive
/sprint archive blog-redesign
```

### Example 2: 다중 feature 동시 진행 (중급)

```bash
# 1. 3개 feature 묶음 (Trust L3 = qa 까지 자동, qa 만 수동)
/sprint init q2-release --name "Q2 Release" --features auth,payment,reports --trust L3

# 2. Sprint 시작 → iterate phase 까지 자동 진행
/sprint start q2-release

# 3. iterate phase 진입 시 matchRate 측정 시작
# (4 auto-pause triggers 중 ITERATION_EXHAUSTED 발동 가능)

# 4. iterate matchRate 100% 통과 → qa 진입 시 자동 정지
/sprint status q2-release
# → phase: qa, status: paused (manual approval needed)

# 5. QA 실행 → report → archive
/sprint qa q2-release
/sprint report q2-release
/sprint archive q2-release
```

### Example 3: Fork + carry items (고급)

```bash
# 1. Q2 sprint 진행 중 일부 features 가 budget exceeded → 자동 정지
/sprint status q2-release
# → status: paused, trigger: BUDGET_EXCEEDED

# 2. 완료된 features 는 q2-release 에 두고, 미완료만 q3 으로 이월
/sprint fork q2-release --new q3-carry
# → carry items: payment (phase: do), reports (phase: iterate)
# → auth 는 phase: archived 이므로 carry 되지 않음

# 3. q3-carry 에서 계속 진행
/sprint start q3-carry --trust L4
```

---

## 부록 A: 디렉토리 구조

```
.bkit/state/
├── sprint-status.json          # Sprint Management 상태 (신규, runtime 생성)
├── pdca-status.json            # 기존 PDCA 상태 (orthogonal)
├── trust-profile.json          # Trust Level 프로필
└── memory.json                 # bkit memory state

lib/
├── domain/sprint/              # Sprint 1 — Domain Foundation
├── application/sprint-lifecycle/  # Sprint 2 — Application Core
└── infra/sprint/               # Sprint 3+5 — Infrastructure
    ├── sprint-state-store.adapter.js   # Sprint 3
    ├── sprint-telemetry.adapter.js     # Sprint 3
    ├── sprint-doc-scanner.adapter.js   # Sprint 3
    ├── matrix-sync.adapter.js          # Sprint 3
    ├── gap-detector.adapter.js         # Sprint 5 신규
    ├── auto-fixer.adapter.js           # Sprint 5 신규
    └── data-flow-validator.adapter.js  # Sprint 5 신규

skills/sprint/                  # Sprint 4 — Presentation (skill)
agents/sprint-*.md              # Sprint 4 — 4 agents
templates/sprint/               # Sprint 4 — 7 Korean templates
scripts/sprint-handler.js       # Sprint 4 — 15-action dispatcher

tests/contract/                 # Sprint 5 — L3 Contract test (tracked, CI gate)
└── v2113-sprint-contracts.test.js
```

## 부록 B: 관련 문서

- [Migration Guide](./sprint-migration.guide.md) — PDCA → Sprint 마이그레이션
- [Master Plan](../01-plan/features/sprint-management.master-plan.md) — 전체 sprint 계획
- [Sprint 5 PRD](../01-plan/features/v2113-sprint-5-quality-docs.prd.md) — 본 sprint 의 요구사항
- [`skills/sprint/SKILL.md`](../../skills/sprint/SKILL.md) — 영어 reference

---

**문서 버전**: v1.0 (Sprint 5 initial)
**문의**: bkit core team via GitHub issues
