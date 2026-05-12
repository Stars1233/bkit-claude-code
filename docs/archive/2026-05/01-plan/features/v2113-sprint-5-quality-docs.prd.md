# Sprint 5 PRD — v2.1.13 Sprint Management Quality + Documentation

> **Sprint ID**: `v2113-sprint-5-quality-docs`
> **Sprint of Master Plan**: 5/6 (Quality + Documentation — production-grade hardening + user-facing docs)
> **Phase**: PRD (1/7)
> **Status**: Active
> **Date**: 2026-05-12
> **Trust Level (override)**: L4 (사용자 명시)
> **Master Plan**: v1.1 §3.6 (carry items + Stage 7-8)
> **ADRs**: 0007 / 0008 / 0009 (Proposed)
> **Depends on**: Sprint 1 (a7009a5) + Sprint 2 (97e48b1) + Sprint 3 (232c1a6) + Sprint 4 (d4484e1) — immutable
> **Branch**: `feature/v2113-sprint-management`
> **★ User-Mandated Constraints (보존)**:
> 1. "skills, agents YAML frontmatter 8개국어 + @docs 제외 영어" — Sprint 5는 skills/agents 미생성 → 영어 코드 일관
> 2. "Sprint 별 결과물 유기적 상호 연동" — ★ L3 Contract tests 로 엄격 검증
> 3. **(신규 2026-05-12 user directive)** "QA 는 eval 도 활용하고 claude -p 도 활용해서 Sprint 와 pdca, 그리고 각 status 관리나 memory 가 유기적으로 동작하는지도 포함해서 다양한 관점으로 실제 동작 하는지 검증해야해" — Sprint 5 QA 단계 **확장 검증 의무**: (a) `bkit:bkit-evals` skill 활용 (행위 평가), (b) `claude -p` headless 호출 (실제 사용자 경험 simulation), (c) Sprint ↔ PDCA 9-phase ↔ pdca-status.json + sprint-status.json + trust-profile.json ↔ memory.json + MEMORY.md 4-system 유기적 공존 검증, (d) 다양한 관점 (단일 test approach X)

---

## 0. Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Sprint 1+2+3+4 산출물 production-grade hardening. (a) **L3 Contract tests** (tests/contract/ tracked) 으로 Sprint 1↔2↔3↔4 통합 contract 엄격 검증 (★ 사용자 명시 2 유기적 상호 연동 결정적 입증). (b) **3 real adapter scaffolds** (gap-detector / auto-fixer / data-flow-validator) — Sprint 4 sprint-handler placeholder 완성. (c) **handleFork/Feature/Watch real implementation** — 15 sub-actions 모두 진짜 동작. (d) **README/CLAUDE.md sprint section** — bkit 사용자 표면 문서화. (e) **Korean 사용자 가이드 + migration guide** — `docs/06-guide/` 신규. (f) **Master Plan v1.2** — LOC reconciliation (estimate 2,400 vs actual 4,867 across Sprint 1+2+3+4). |
| **WHO** | (1차) bkit 사용자 — README/CLAUDE.md sprint section 통한 onboarding + Korean guide. (2차) bkit 후속 작업자 — L3 contract tests 가 cross-sprint contract 위반 자동 감지. (3차) Sprint 6 release 준비 — 모든 LOC + invariant + contract 매트릭스 정합. (4차) bkit core CI — tracked test/contract/ 가 CI 의 정식 stage. (5차) 8개국어 사용자 — Korean guide 가 향후 EN/JA/ZH 번역 reference. |
| **RISK** | (a) **★ L3 Contract test design 부족** → cross-sprint contract drift 미감지 risk. (b) **3 adapter scaffold가 mock-only**: real backend (gap-detector agent / pdca-iterator agent / chrome-qa MCP) 통합 시 인터페이스 mismatch — 본 Sprint 5는 **production-ready scaffold + 명확한 integration point** 만 제공 (Sprint 6 release 시 real wiring 결정). (c) **README/CLAUDE.md 변경 → docs-code-scanner 회귀**: 본 sprint 변경부분이 5-loc BKIT_VERSION sync 영향 가능 (단 BKIT_VERSION bump 자체는 Sprint 6). (d) **Sprint 1/2/3/4 invariant 깨짐**: Sprint 5 가 lib/ 의 4 sprint 코드 수정 시 누적 무결성 깨짐. (e) **docs-code-invariants 매트릭스 회귀**: tests/contract/ 신규 폴더 추가 시 docs-code-scanner 가 측정. (f) **claude plugin validate F9-120 closure 11-cycle 깨짐**. (g) **Cross-sprint test/contract/ 위치 선택**: Sprint 5는 `tests/contract/` (기존 빈 디렉터리 활용) 선택. (h) **Korean guide vs CLAUDE.md 일관성**: docs/ 폴더 한국어 OK, README + CLAUDE.md 영어 (사용자 명시 + bkit global service 정책 일관). (i) **8개국어 트리거 sprint 5 적용**: 본 sprint 는 skills/agents 미생성 → constraint 위반 위험 0. (j) **L4 모드 abbreviation**: 사용자 명시 "꼼꼼하고 완벽하게" — Design 단계 코드베이스 깊이 분석 + 14+ files pre-scope 필수. |
| **SUCCESS** | (1) **`tests/contract/v2113-sprint-contracts.test.js`** — L3 tracked contract test (8+ TCs). 본 test 는 git tracked, CI gate. (2) **3 real adapter scaffolds** in `lib/infra/sprint/`: `gap-detector.adapter.js` + `auto-fixer.adapter.js` + `data-flow-validator.adapter.js`. 각 production-ready scaffold + clear integration point. (3) **`scripts/sprint-handler.js` enhancement**: `handleFork` / `handleFeature` / `handleWatch` real impl (Sprint 4 placeholder 대체). (4) **`README.md` sprint section** + **`CLAUDE.md` sprint section** (English, 사용자 onboarding). (5) **`docs/06-guide/sprint-management.guide.md`** (Korean user guide, 사용자 명시 `@docs 예외`). (6) **`docs/06-guide/sprint-migration.guide.md`** (Korean migration guide). (7) **`docs/01-plan/features/sprint-management.master-plan.md` v1.2** — LOC reconciliation (estimate 2,400 → actual 4,867 + 본 Sprint 5 추가). (8) **Sprint 1/2/3/4 invariant 0 변경**. (9) **`claude plugin validate .` Exit 0** (F9-120 closure **11-cycle 연속 PASS** 목표). (10) **L3 Contract tests + L2 Sprint 1+2+3+4 누적 regression 280+ TCs 100% PASS**. (11) **cross-sprint contract drift 0건** (L3 test 가 자동 감지). **(12) ★ 사용자 명시 3 — Multi-perspective QA**: (a) `bkit:bkit-evals` skill 호출로 행위 평가 ≥ 4건 (eval-score ≥ 0.8/1.0), (b) `claude -p` headless 호출 실 시나리오 5건 (sprint init/start/status/phase/list 실 user prompt 행위 검증), (c) **4-system 유기적 공존 검증** — Sprint Management 의 `.bkit/state/sprint-status.json` ↔ 기존 PDCA `pdca-status.json` ↔ Trust `trust-profile.json` ↔ Memory `.bkit/state/memory.json` 동시 존재 + 상호 영향 0건 (orthogonal), (d) **Sprint ↔ PDCA phase 매핑 검증** — Sprint 8-phase (prd/plan/design/do/iterate/qa/report/archived) ↔ PDCA 9-phase (pm/plan/design/do/check/act/qa/report/archived) 동시 트랙 가능 검증, (e) Memory MEMORY.md 자동 갱신 검증 (sprint 완료 시 entry 자동 추가). |
| **SCOPE** | **In-scope ~14 files**: (a) `tests/contract/v2113-sprint-contracts.test.js` (★ L3 tracked, 8+ TCs), (b) `lib/infra/sprint/gap-detector.adapter.js` (Sprint 2 deps.gapDetector 인터페이스 production scaffold), (c) `lib/infra/sprint/auto-fixer.adapter.js` (deps.autoFixer scaffold), (d) `lib/infra/sprint/data-flow-validator.adapter.js` (deps.dataFlowValidator scaffold), (e) `lib/infra/sprint/index.js` 확장 (3 new factories barrel), (f) `scripts/sprint-handler.js` 확장 (handleFork / handleFeature / handleWatch real impl), (g) `README.md` 확장 (sprint section), (h) `CLAUDE.md` 확장 (sprint section), (i) `docs/06-guide/sprint-management.guide.md` (Korean), (j) `docs/06-guide/sprint-migration.guide.md` (Korean), (k) `docs/01-plan/features/sprint-management.master-plan.md` v1.2 (LOC update). **Out-of-scope (Sprint 6)**: BKIT_VERSION bump (5-loc sync), ADR 0007/0008/0009 Proposed→Accepted, CHANGELOG, GitHub release notes. **Tests**: L3 contract tracked + Sprint 1+2+3+4 regression. |

---

## 1. Problem Statement

Sprint 1+2+3+4 완료로 Sprint Management feature 의 **모든 사용자 surface + 4-layer 통합 동작** 구현 완료. 그러나:

### 1.1 부재한 production-grade hardening

| 부재 | 영향 |
|------|------|
| `tests/contract/` tracked L3 contract test | cross-sprint contract drift 미감지 → 사용자 명시 2 (유기적 상호 연동) regression risk |
| `lib/infra/sprint/gap-detector.adapter.js` | Sprint 2 iterateSprint 가 default no-op gapDetector 사용 → matchRate 측정 실 동작 X |
| `lib/infra/sprint/auto-fixer.adapter.js` | iterateSprint autoFixer default no-op → fix 실 동작 X |
| `lib/infra/sprint/data-flow-validator.adapter.js` | verifyDataFlow 가 default `{passed:false, reason:'no_validator_injected'}` 반환 → 7-Layer 실 검증 X |
| sprint-handler.js handleFork/Feature/Watch placeholder | 15 actions 중 3 미구현 → user experience 단절 |
| README/CLAUDE.md sprint section 부재 | 사용자가 `/sprint` 명령 발견 경로 없음 |
| `docs/06-guide/` Korean user/migration guide 부재 | 한국어 사용자 onboarding 부재 |
| Master Plan v1.2 LOC reconciliation | estimate 2,400 vs actual 4,867 (+2,467, 103%) gap 미정정 |

### 1.2 ★ 사용자 명시 2 (cross-sprint 유기적) 강화

> "Sprint 별로 만들어진 결과물들이 유기적으로 상호 연동되어 동작 되어야 해"

본 Sprint 5 가 **L3 Contract test (tracked)** 를 통해 cross-sprint contract 를 **CI gate** 로 격상:

| Contract | 검증 |
|---------|------|
| Sprint 1 entity shape (Sprint, SprintInput, SprintEvents, ...) | typedef contract |
| Sprint 2 deps interface (stateStore / eventEmitter / gateEvaluator / autoPauseChecker / ...) | signature contract |
| Sprint 3 adapter return (createSprintInfra → 4 adapter) | shape contract |
| Sprint 4 sprint-handler.handleSprintAction signature | dispatch contract |
| 4-layer end-to-end chain (skill → handler → infra → use case → entity) | integration contract |
| audit-logger ACTION_TYPES 18 entries | enum contract |
| automation-controller SPRINT_AUTORUN_SCOPE 5 levels | constant contract |
| hooks/hooks.json 21:24 invariant | structural contract |

### 1.3 ★ 사용자 명시 1 (8개국어 + 영어 코드) — Sprint 5 적용

Sprint 5 는 **skills/agents 미생성** → constraint 위반 risk 0. 본 Sprint 코드 모두 영어 (Sprint 1+2+3+4 일관). docs/06-guide 한국어 (CLAUDE.md docs/ 정책 + 사용자 명시 `@docs 예외`).

### 1.4 ★ 사용자 명시 3 (Multi-perspective QA) — Sprint 5 QA 결정적 확장

> "QA 는 eval 도 활용하고 claude -p 도 활용해서 Sprint 와 pdca, 그리고 각 status 관리나 memory 가 유기적으로 동작하는지도 포함해서 다양한 관점으로 실제 동작 하는지 검증해야해."

본 Sprint 5 QA 단계 (Phase 6) **확장 검증 의무**:

| 검증 도구 | 목적 | Sprint 5 적용 |
|----------|------|-------------|
| **`bkit:bkit-evals` skill** | 행위 평가 (LLM-as-judge eval-score) | sprint 명령 응답 quality + correctness ≥ 0.8/1.0 |
| **`claude -p` headless** | 실 사용자 경험 simulation (programmatic CC 호출) | 5 시나리오 (init/start/status/phase/list) 무인 실행 |
| **4-System 공존 검증** | Sprint ↔ PDCA ↔ status ↔ memory 유기 | `.bkit/state/` 4 파일 동시 존재 + orthogonal |
| **Sprint↔PDCA mapping** | 8-phase ↔ 9-phase 동시 트랙 | Sprint phase 와 PDCA phase 충돌 0건 검증 |
| **Memory auto-update** | MEMORY.md 자동 갱신 | sprint 완료 시 entry 추가 회귀 검증 |

**Diverse perspectives (다양한 관점)** — 단일 test approach 금지:
1. **L3 Contract** (static structural) — 8+ TCs
2. **L2 Sprint 1+2+3+4 regression** (실 코드 호출) — 236 TCs
3. **bkit-evals LLM-as-judge** (행위 평가) — 4+ scenarios
4. **claude -p headless** (실 사용자 simulation) — 5 scenarios
5. **4-system 공존 (state-level integration)** — 4 files 동시 존재 + diff 검증
6. **Sprint↔PDCA mapping (cross-feature integration)** — 8-phase + 9-phase concurrent state
7. **`claude plugin validate .` invariant** — Exit 0 (F9-120 11-cycle)

### 1.5 Out-of-scope: Sprint 6 release

본 Sprint 5 는 **production hardening + documentation** 에 한정. v2.1.13 BKIT_VERSION bump (5-loc sync) + ADR Accepted + CHANGELOG + GitHub release 는 Sprint 6.

---

## 2. Job Stories (JTBD 6-Part)

### Job Story 1 — bkit core CI / contract auditor
- **When** Sprint 5 후속 작업자 또는 외부 contributor 가 Sprint 1/2/3/4 코드 수정 시,
- **I want to** `node tests/contract/v2113-sprint-contracts.test.js` 가 cross-sprint contract drift 자동 감지
- **so I can** invariant 깨짐을 PR review 단계 이전에 차단.

### Job Story 2 — bkit 사용자 (Sprint 4 real adapter wiring)
- **When** 사용자가 `/sprint start my-launch --trust L3` 호출 시,
- **I want to** sprint-handler 가 real gap-detector / auto-fixer / data-flow-validator scaffold inject + Sprint 2 use case 실 동작
- **so I can** matchRate 측정 + 7-Layer S1 실 검증 (사용자 production environment).

### Job Story 3 — bkit 사용자 (15 actions 완전)
- **When** 사용자가 `/sprint fork`, `/sprint feature`, `/sprint watch` 호출 시,
- **I want to** Sprint 4 placeholder 대신 real implementation 동작
- **so I can** 15 sub-actions 모두 사용 가능 (UX 완전).

### Job Story 4 — bkit 사용자 (English README onboarding)
- **When** 사용자가 GitHub README 첫 방문 시,
- **I want to** Sprint Management section 발견 + 1분 내 첫 sprint 실행 quick start
- **so I can** Sprint Management feature 인지 + 즉시 사용.

### Job Story 5 — Korean bkit 사용자 (모국어 가이드)
- **When** 한국어 사용자가 sprint feature 깊이 학습 시,
- **I want to** `docs/06-guide/sprint-management.guide.md` Korean user guide
- **so I can** 모국어로 15 actions + 8 phases + 4 auto-pause triggers 학습.

### Job Story 6 — bkit migrator (기존 PDCA 사용자)
- **When** 기존 PDCA 사용자가 Sprint Management 로 marriage migration 시,
- **I want to** `docs/06-guide/sprint-migration.guide.md` 가 PDCA → Sprint 매핑 명시
- **so I can** 기존 작업 보존하면서 Sprint Management 통합.

### Job Story 7 — Sprint 6 release manager
- **When** v2.1.13 release 준비 시,
- **I want to** Master Plan v1.2 가 정확한 LOC (4,867 + 본 Sprint) + invariant matrix 갱신
- **so I can** release notes 작성 시 single source of truth 참조.

### Job Story 8 — bkit core invariant 보호자
- **When** 본 Sprint 5 PR 가 lib/ 또는 hooks/ 변경 포함 시,
- **I want to** L3 contract test 가 Sprint 1/2/3/4 invariant 자동 검증 + Sprint 5 신규 추가 invariant (3 adapter shape) 추가
- **so I can** 사용자 명시 2 cross-sprint 유기적 보존 enforce.

---

## 3. User Personas

### Persona A: bkit 사용자 (English onboarding)
- **목표**: README 첫 방문 1분 내 Sprint Management 인지 + quick start.
- **요구사항**: README Sprint section (10 lines, link to docs/06-guide).

### Persona B: Korean bkit 사용자
- **목표**: 모국어 깊이 가이드.
- **요구사항**: `docs/06-guide/sprint-management.guide.md` (15 actions / 8 phases / 4 triggers).

### Persona C: bkit core CI / 후속 작업자
- **목표**: cross-sprint contract drift 0 보장.
- **요구사항**: `tests/contract/v2113-sprint-contracts.test.js` tracked.

### Persona D: bkit migrator (기존 PDCA 사용자)
- **목표**: PDCA → Sprint 안전 마이그레이션.
- **요구사항**: `docs/06-guide/sprint-migration.guide.md`.

### Persona E: Sprint 6 release manager
- **목표**: 정확한 LOC + invariant matrix.
- **요구사항**: Master Plan v1.2.

---

## 4. Solution Overview

### 4.1 14 files 구조

```
tests/contract/                                       # 신규 (tracked, L3)
└── v2113-sprint-contracts.test.js                    # ★ 8+ TCs cross-sprint contract

lib/infra/sprint/                                     # 3 new + 1 ext
├── gap-detector.adapter.js                           # production scaffold
├── auto-fixer.adapter.js                             # production scaffold
├── data-flow-validator.adapter.js                    # production scaffold
└── index.js                                          # +3 factory exports

scripts/sprint-handler.js                             # ext (handleFork/Feature/Watch)

README.md                                             # ext (sprint section, English)
CLAUDE.md                                             # ext (sprint section, English)

docs/06-guide/                                        # 신규 디렉터리 (Korean)
├── sprint-management.guide.md                        # user guide
└── sprint-migration.guide.md                         # migration guide

docs/01-plan/features/sprint-management.master-plan.md  # v1.1 → v1.2 (LOC reconciliation)
```

### 4.2 3 real adapter scaffolds (Sprint 2 deps interface 매칭)

#### gap-detector.adapter.js

```javascript
function createGapDetector({ projectRoot, agentTaskRunner? }): GapDetector {
  return {
    detect: async (sprint) => {
      // production: invokes agents/gap-detector.md via agentTaskRunner
      // scaffold: returns { matchRate: 100, gaps: [] } when no runner
      if (!agentTaskRunner) {
        return { matchRate: 100, gaps: [] };
      }
      const result = await agentTaskRunner({
        subagent_type: 'gap-detector',
        prompt: `Detect gaps in sprint ${sprint.id}, current phase ${sprint.phase}`,
      });
      return parseGapDetectorOutput(result);
    },
  };
}
```

#### auto-fixer.adapter.js (similar pattern wraps pdca-iterator)

#### data-flow-validator.adapter.js (similar pattern wraps chrome-qa MCP)

### 4.3 sprint-handler.js enhancement (Sprint 4 placeholder 대체)

```javascript
// handleFork — load source sprint, derive new sprint id, copy carry-items
async function handleFork({ id, newId }, infra) {
  const source = await infra.stateStore.load(id);
  if (!source) return { ok: false, error: `Sprint not found: ${id}` };
  const carryItems = identifyCarryItems(source);
  const newSprint = domain.createSprint({
    id: newId,
    name: `${source.name} (fork)`,
    features: carryItems.map(c => c.featureName),
    context: source.context,
    trustLevelAtStart: source.autoRun.trustLevelAtStart,
  });
  await infra.stateStore.save(newSprint);
  return { ok: true, sourceId: id, newSprint, carryItems };
}

// handleFeature — list/add/remove feature in featureMap
async function handleFeature({ id, action, featureName }, infra) {
  const sprint = await infra.stateStore.load(id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${id}` };
  switch (action) {
    case 'list': return { ok: true, features: Object.keys(sprint.featureMap), all: sprint.features };
    case 'add': {
      const features = [...sprint.features];
      if (!features.includes(featureName)) features.push(featureName);
      const updated = domain.cloneSprint(sprint, { features });
      await infra.stateStore.save(updated);
      return { ok: true, sprint: updated };
    }
    case 'remove': {
      const features = sprint.features.filter(f => f !== featureName);
      const updated = domain.cloneSprint(sprint, { features });
      await infra.stateStore.save(updated);
      return { ok: true, sprint: updated };
    }
    default: return { ok: false, error: 'feature action must be list|add|remove' };
  }
}

// handleWatch — return live snapshot + computed metrics
async function handleWatch({ id }, infra) {
  const sprint = await infra.stateStore.load(id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${id}` };
  const triggers = require('../lib/application/sprint-lifecycle').checkAutoPauseTriggers(sprint);
  const matrices = {
    dataFlow: await infra.matrixSync.read('data-flow').catch(() => null),
  };
  return { ok: true, snapshot: sprint, triggers, matrices };
}
```

### 4.4 L3 Contract Test Matrix (★ cross-sprint contract drift 감지)

```javascript
// tests/contract/v2113-sprint-contracts.test.js

// Contract 1: Sprint 1 entity shape (frozen typedef contract)
test('SC-01: Sprint entity shape', () => { ... });

// Contract 2: Sprint 2 deps interface
test('SC-02: startSprint deps interface (11 keys)', () => { ... });

// Contract 3: Sprint 3 createSprintInfra return shape
test('SC-03: createSprintInfra returns 4 adapters', () => { ... });

// Contract 4: Sprint 4 sprint-handler signature
test('SC-04: handleSprintAction(action, args, deps) signature', () => { ... });

// Contract 5: 4-layer end-to-end chain
test('SC-05: skill → handler → infra → use case → entity chain', async () => { ... });

// Contract 6: audit-logger ACTION_TYPES 18 entries
test('SC-06: ACTION_TYPES enum 18 entries (incl sprint_paused/resumed)', () => { ... });

// Contract 7: SPRINT_AUTORUN_SCOPE 5 levels
test('SC-07: SPRINT_AUTORUN_SCOPE shape (Sprint 2 inline ↔ lib/control mirror)', () => { ... });

// Contract 8: hooks/hooks.json 21:24 invariant
test('SC-08: hooks.json 21 events 24 blocks unchanged', () => { ... });
```

### 4.5 README + CLAUDE.md sprint section (English, ~25 lines each)

```markdown
## Sprint Management (v2.1.13)

bkit Sprint Management groups one or more features under a shared scope,
budget, and timeline. Each sprint runs its own 8-phase lifecycle:
`prd → plan → design → do → iterate → qa → report → archived`.

Quick start:
\`\`\`
/sprint init my-launch --name "Q2 Launch" --trust L3
/sprint start my-launch
\`\`\`

See `skills/sprint/SKILL.md` for the 15 sub-actions and `docs/06-guide/sprint-management.guide.md`
for a deep-dive Korean user guide.
```

### 4.6 docs/06-guide/sprint-management.guide.md (Korean, ~250 lines)

Korean user guide covering: 15 actions / 8 phases / 4 auto-pause triggers / Trust Level scope / 7-Layer QA / cross-sprint integration / examples.

### 4.7 Master Plan v1.2 LOC reconciliation

```
v1.1 estimate (이전):
- Total Sprint 1-6: ~2,400 LOC + 28 TC

v1.2 actual (Sprint 1+2+3+4 완료 후 본 sprint 추가 전):
- Sprint 1: 685 LOC, 40 TCs
- Sprint 2: 1,337 LOC, 79 TCs
- Sprint 3: 780 LOC, 66+10 CSI TCs
- Sprint 4: 2,065 LOC, 41 TCs (incl 8 CSI-04)
- Cumulative: 4,867 LOC, 236 TCs + 18 CSI

v1.2 Sprint 5 추가 estimate:
- Sprint 5: ~750 LOC, 8+ contract TCs
- Final cumulative: ~5,617 LOC + Master Plan/README/CLAUDE.md/guide docs
```

---

## 5. Success Metrics

### 5.1 정량 메트릭

| Metric | Target |
|--------|--------|
| Files created/modified | 11+ |
| Code LOC (Sprint 5) | ~600-750 |
| Docs LOC (Sprint 5, Korean) | ~500 |
| L3 Contract tests | 8+ TCs PASS |
| Sprint 1/2/3/4 regression | 236/236 PASS |
| Cumulative TCs | 244+ |
| Sprint 1 invariant | 0 변경 |
| Sprint 2 invariant | 0 변경 |
| Sprint 3 invariant | 0 변경 |
| Sprint 4 invariant | 0 변경 (단 sprint-handler.js 확장은 OK — Sprint 4 명시 enhancement zone) |
| PDCA invariant | 0 변경 |
| Domain Purity | 0 forbidden |
| hooks/hooks.json invariant | 21:24 유지 |
| `claude plugin validate .` | Exit 0 (F9-120 11-cycle) |

### 5.2 ★ Multi-perspective QA 정량 메트릭 (사용자 명시 3)

| Metric | Target |
|--------|--------|
| **bkit-evals scenarios** | ≥ 4 scenarios (eval-score ≥ 0.8/1.0 평균) |
| **claude -p headless tests** | ≥ 5 시나리오 (init/start/status/phase/list 모두 0 exit code) |
| **4-System 공존 verification** | `.bkit/state/` 4 파일 (pdca-status.json + sprint-status.json + trust-profile.json + memory.json) 동시 존재 + diff 0 (orthogonal) |
| **Sprint ↔ PDCA mapping verification** | Sprint 8-phase + PDCA 9-phase 동시 트랙 가능 (state 충돌 0건) |
| **MEMORY.md auto-update** | sprint archived 후 memory entry 자동 추가 검증 |
| **Diverse perspectives count** | 7+ (Contract / Regression / Evals / Headless / 4-System / Mapping / Plugin Validate) |

### 5.3 정성 메트릭
- README/CLAUDE.md sprint section 30-line 이내 (간결)
- Korean guide 자체 완결 (Sprint 1+2+3+4 reference 불필요)
- 3 adapter scaffolds production-ready (real backend integration point 명확)
- **★ Multi-perspective QA**: 단일 test approach 의존 X — 7+ 관점 매트릭스

---

## 6. Out-of-scope (Sprint 5 명시 제외)

| 항목 | Sprint |
|------|--------|
| BKIT_VERSION bump (bkit.config.json 등 5-loc sync) | Sprint 6 |
| ADR 0007/0008/0009 Proposed → Accepted | Sprint 6 |
| CHANGELOG v2.1.13 section | Sprint 6 |
| GitHub release notes + tag | Sprint 6 |
| Sprint 2 SPRINT_AUTORUN_SCOPE inline 제거 + lib/control mirror reference 만 사용 | v2.1.14 |
| Real backend integration (gap-detector / pdca-iterator / chrome-qa 실 호출 wiring) | Sprint 6 또는 v2.1.14 |
| L4/L5 E2E + Performance tests | v2.1.14 |
| skills/agents 신규 (Sprint 5는 docs + adapters + tests) | (해당 없음) |

### 6.1 사용자 명시 1 (8개국어 + 영어 코드) — Sprint 5 적용

Sprint 5는 skills/agents 미생성 → constraint 자연 충족:
- 모든 코드 (lib/infra/sprint/3 adapters + scripts/sprint-handler.js ext + tests/contract/) 영어
- README + CLAUDE.md 영어
- `docs/06-guide/` Korean (사용자 명시 `@docs 예외`)
- Master Plan v1.2 Korean (기존 v1.1 한국어 정책 유지)

### 6.2 사용자 명시 2 (cross-sprint 유기적 상호 연동) — Sprint 5 결정적 강화

> "Sprint 별로 만들어진 결과물들이 유기적으로 상호 연동되어 동작 되어야 해"

본 Sprint 5는 **L3 Contract test (tracked)** 로 cross-sprint contract 를 **CI gate** 격상:
- Sprint 1 entity / Sprint 2 deps / Sprint 3 adapter / Sprint 4 dispatcher 모두 shape contract 검증
- 4-layer end-to-end chain test (SC-05)
- 본 contract 가 향후 v2.1.14+ 어떤 변경에도 cross-sprint drift 0 보장

---

## 7. Stakeholder Map

| Stakeholder | Role | Sprint 5 영향 |
|------------|------|--------------|
| **kay kim** | Decision maker | 모든 phase |
| **Sprint 1/2/3/4 (immutable)** | Foundation | 0 변경 (sprint-handler.js Sprint 4 enhancement zone 제외) |
| **bkit 사용자** | End-user | README + Korean guide |
| **bkit migrator** | Existing PDCA user | Migration guide |
| **bkit core CI** | Invariant guardian | L3 contract test (tracked, CI gate) |
| **Sprint 6 release manager** | Release | Master Plan v1.2 + LOC reconciliation |
| **8개국어 사용자 (KO 첫 적용)** | Korean docs | docs/06-guide/sprint-*.guide.md |

---

## 8. Pre-mortem (실패 시나리오 + 사전 방지)

### Scenario A: ★ L3 Contract test cross-sprint drift 미감지
- **영향**: Sprint 1/2/3/4 후속 변경 시 contract 깨짐 미감지
- **방지**: SC-01~08 매트릭스에 Sprint 1 entity 모든 typedef + Sprint 2 deps 11 keys + Sprint 3 adapter 4 methods 명시

### Scenario B: 3 adapter scaffold mock-only → real wiring 시 mismatch
- **영향**: Sprint 6 / v2.1.14 real backend 통합 시 인터페이스 불일치
- **방지**: scaffold factory signature 가 Sprint 2 deps interface 와 정확 일치 + integration point 코드 주석 명시

### Scenario C: README/CLAUDE.md 변경 → docs-code-scanner 회귀
- **영향**: 5-loc BKIT_VERSION sync 또는 ENH-241 Docs=Code 위반
- **방지**: 본 Sprint 5는 sprint section 추가만 (BKIT_VERSION 변경 X) + 추가 line 만, 기존 변경 0

### Scenario D: Sprint 1/2/3/4 invariant 깨짐
- **영향**: 누적 invariant + 누적 236 TCs regression
- **방지**: Sprint 5는 lib/ 의 sprint 코드 변경 X (sprint-handler.js Sprint 4 enhancement zone 만 ext)

### Scenario E: Korean guide vs CLAUDE.md 언어 정책 충돌
- **영향**: CLAUDE.md 영어 vs Korean guide 충돌
- **방지**: CLAUDE.md 정책 명시 — `docs/` 한국어 + 다른 모두 영어. Korean guide는 docs/06-guide 위치 (정책 부합)

### Scenario F: tests/contract/ 신규 추가 → docs-code-scanner 측정 회귀
- **영향**: scripts/check-domain-purity 또는 docs-code-scanner 의 expected counts 불일치
- **방지**: tests/contract/ 는 tests 폴더 하위 — 기존 패턴 정합

### Scenario G: claude plugin validate F9-120 closure 11-cycle 깨짐
- **영향**: 누적 invariant 깨짐
- **방지**: Sprint 4 frontmatter 변경 0 + 본 Sprint Markdown 추가만 (YAML 변경 0)

### Scenario H: Master Plan v1.2 정정 시 v1.1 호환성 깨짐
- **영향**: v1.1 reference link 회귀
- **방지**: Master Plan §0 v1.2 변경 사항 명시 + Sprint 1/2/3/4 산출물 의존성 보존

### Scenario I: 사용자 명시 8개국어 트리거 sprint 5 적용 불일치
- **영향**: 사용자 명시 1 위반
- **방지**: Sprint 5 는 skills/agents 미생성 → constraint 자연 충족. README/CLAUDE.md sprint section 영어 + Korean guide docs 예외.

### Scenario J: L4 모드 abbreviation → 꼼꼼함 부족
- **영향**: 사용자 명시 ("빠르게가 아닌 꼼꼼하고 완벽하게") 위반
- **방지**: Design 단계 코드베이스 깊이 분석 + 14+ files pre-scope + L3 contract 8+ TCs pre-design + 누적 regression 236 TCs verification

### Scenario K: ★ bkit-evals skill 미활용 → 사용자 명시 3 위반
- **영향**: 단일 L3 contract test approach 의존 → 사용자 명시 3 ("eval 도 활용") 누락
- **방지**: QA Phase 6 mandate — `bkit:bkit-evals` 호출 ≥ 4 scenarios (sprint init / start / phase / archive 행위 평가), eval-score ≥ 0.8/1.0 cutoff

### Scenario L: ★ claude -p headless 미활용 → 실 사용자 경험 검증 부재
- **영향**: 사용자 명시 3 ("claude -p 도 활용") 누락 + 실 user prompt 시나리오 검증 부재
- **방지**: QA Phase 6 mandate — `claude -p` headless 5 scenarios (5 sub-actions 실 sprint:* 명령 invocation), exit code 0 + stdout sanity check

### Scenario M: ★ 4-System (sprint/pdca/trust/memory) 충돌
- **영향**: Sprint Management 의 `sprint-status.json` 이 기존 `pdca-status.json` / `trust-profile.json` / `memory.json` 와 mutate 또는 read collision → 사용자 명시 3 ("status 관리나 memory 가 유기적으로 동작") 위반
- **방지**: QA Phase 6 mandate — 4 파일 동시 존재 sanity (`fs.existsSync` 4건) + Sprint start 후 기타 3 파일 diff 0 검증 (orthogonal) + atomic write 충돌 0건 (concurrent 시나리오)

### Scenario N: ★ Sprint 8-phase ↔ PDCA 9-phase 매핑 충돌
- **영향**: Sprint Management 가 PDCA 9-phase frozen enum override 시도 → 누적 PDCA invariant 깨짐
- **방지**: QA Phase 6 mandate — Sprint phase enum 과 PDCA phase enum 동시 import + 8-phase ⊥ 9-phase orthogonal 검증 (overlap 키 0건 또는 명시 매핑 documented)

### Scenario O: ★ MEMORY.md auto-update 회귀
- **영향**: sprint archived 시 MEMORY.md entry 자동 추가 안 됨 → 사용자 명시 3 ("memory 가 유기적으로 동작") 위반
- **방지**: QA Phase 6 — sprint archive 시나리오 후 MEMORY.md grep + entry 존재 검증 (단 Sprint 4 generateReport 가 MEMORY.md 직접 write 안 함 → Sprint 5에서 hook 추가 검토 또는 manual procedure 문서화)

---

## 9. Sprint 5 Phase 흐름

| Phase | Status | 산출물 | 소요 |
|-------|--------|--------|------|
| PRD | ✅ 본 문서 | docs/01-plan/features/v2113-sprint-5-quality-docs.prd.md | (완료) |
| Plan | ⏳ | docs/01-plan/features/v2113-sprint-5-quality-docs.plan.md | 25분 |
| Design | ⏳ | docs/02-design/features/v2113-sprint-5-quality-docs.design.md | 35분 |
| Do | ⏳ | 14 files 구현 (~750 + ~500 docs LOC) | 60-80분 |
| Iterate | ⏳ | matchRate 100% + 8+ L3 contract TC | 20분 |
| **★ QA (확장)** | ⏳ | 7-perspective: (1) L3 Contract 8+ + (2) Sprint 1+2+3+4 regression 236 + (3) bkit-evals ≥4 scenarios + (4) claude -p headless 5 scenarios + (5) 4-System 공존 verification + (6) Sprint↔PDCA mapping + (7) plugin validate Exit 0 | **50-60분** |
| Report | ⏳ | 종합 보고서 (7-perspective 결과 매트릭스 포함) | 20분 |

**총 소요 estimate**: 4-4.5 시간 (★ QA 확장으로 +30분)

---

## 10. PRD 완료 Checklist

- [x] Context Anchor 5건 (사용자 명시 1/2/3 보존, 3 신규 2026-05-12)
- [x] Problem Statement 6건 (부재 + 사용자 명시 2/3 강화 + 사용자 명시 1 자연 충족 + out-of-scope Sprint 6)
- [x] Job Stories 8건 (CI / 사용자 ×4 + migrator + release + invariant 보호자)
- [x] User Personas 5건
- [x] Solution Overview (14 files + 3 adapter scaffolds + handler ext + L3 contract matrix + Korean guide + Master Plan v1.2)
- [x] Success Metrics 정량 14건 + ★ Multi-perspective QA 6건 + 정성 4건
- [x] Out-of-scope 매트릭스 + 사용자 명시 1/2/3 보존
- [x] Stakeholder Map 7건
- [x] Pre-mortem **15 시나리오** (★ K-O 5건 신규 — bkit-evals / claude -p / 4-System / Sprint↔PDCA / MEMORY)

---

**Next Phase**: Phase 2 Plan — Requirements R1-R12 + Quality Gates + Risks + Implementation Order + ★ L3 Contract spec + ★ 7-perspective QA Plan.
