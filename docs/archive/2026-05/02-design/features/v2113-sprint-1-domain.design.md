# Sprint 1 Design — v2.1.13 Sprint Management Domain Foundation

> **Sprint ID**: `v2113-sprint-1-domain`
> **Phase**: Design (3/7)
> **Date**: 2026-05-12
> **PRD**: `docs/01-plan/features/v2113-sprint-1-domain.prd.md`
> **Plan**: `docs/01-plan/features/v2113-sprint-1-domain.plan.md`
> **Master Plan**: `docs/01-plan/features/sprint-management.master-plan.md` v1.1
> **ADRs**: 0007 / 0008 / 0009
> **Author**: kay kim
> **Codebase analysis depth**: 6 reference files (PDCA 3 + Domain 3)

---

## 0. Context Anchor (PRD/Plan §0 복사)

(생략 없이 PRD §0 동일, Do/Iterate/QA/Report에 전파)

| Key | Value (한 줄 요약) |
|-----|------|
| WHY | Sprint Management v2.1.13 frozen domain model 영구화 |
| WHO | Sprint 2~6 작업자 / bkit core CI / reviewer / audit-logger |
| RISK | ADR 0005 패턴 위반 / Domain Purity 깨짐 / canTransition 시그니처 불일치 / Object.freeze nested 누락 / kebab-case regex 부정확 |
| SUCCESS | 9 정량 metrics PASS / 7 files / matchRate 100% / forbidden imports 0 |
| SCOPE | In: lib/application/sprint-lifecycle/ 3 + lib/domain/sprint/ 4 = 7 files |

---

## 1. 코드베이스 깊이 분석 (★ 사용자 강조 영역)

> "현재 코드베이스의 아키텍처와 기능 처리 로직 완벽하게 이해하여 어떻게 구현할지 상세하게 문서로 작성"

### 1.1 lib/ 디렉토리 구조 (실측 2026-05-12)

```
lib/
├── application/              # Use case orchestration layer (ADR 0005 Pilot)
│   └── pdca-lifecycle/       # Frozen PDCA 9-phase + transitions
│       ├── phases.js         # 82 LOC — PHASES enum + 5 helpers
│       ├── transitions.js    # 69 LOC — TRANSITIONS adjacency + 2 helpers
│       └── index.js          # 42 LOC — barrel
├── domain/                   # Pure business rules (12 files, 0 forbidden imports invariant)
│   ├── ports/                # 7 files — Type-only Port interfaces
│   │   ├── audit-sink.port.js
│   │   ├── cc-payload.port.js
│   │   ├── docs-code-index.port.js
│   │   ├── mcp-tool.port.js
│   │   ├── regression-registry.port.js
│   │   ├── state-store.port.js     # ← Sprint 3 재사용 대상
│   │   └── token-meter.port.js
│   ├── rules/                # 1 file — Cross-cutting invariants
│   │   └── docs-code-invariants.js
│   └── guards/               # 4 files — Per-ENH detection logic
│       ├── enh-254-fork-precondition.js
│       ├── enh-262-hooks-combo.js
│       ├── enh-263-claude-write.js
│       └── enh-264-token-threshold.js
├── infra/                    # I/O + external systems (Adapter)
├── orchestrator/             # 5 modules — workflow coordination
├── control/                  # Trust Score + Automation Level
├── pdca/                     # Legacy PDCA (점진 마이그레이션 중, ADR 0005)
├── audit/                    # Audit logger (Defense Layer 3)
├── cc-regression/            # CC version regression tracking
├── ...                       # 16 subdirs 총
```

**Sprint 1 신규 추가 위치 (정합)**:
```
lib/
├── application/
│   └── sprint-lifecycle/     # ★ 신규 (PDCA Pilot pattern 정합)
│       ├── phases.js
│       ├── transitions.js
│       └── index.js
└── domain/
    └── sprint/               # ★ 신규 (forbidden imports 0건 invariant)
        ├── entity.js
        ├── validators.js
        ├── events.js
        └── index.js
```

### 1.2 PDCA Application Pilot 패턴 정확한 인용

#### 1.2.1 `lib/application/pdca-lifecycle/phases.js` (file:1-82)

**Header pattern** (lines 1-16):
```javascript
/**
 * phases.js — PDCA phase enum + ordered sequence (FR-γ2 pilot).
 *
 * Single source of truth for the 9-phase PDCA lifecycle:
 *   pm → plan → design → do → check → act → qa → report → archive
 *
 * Frozen constants — any consumer that needs to enumerate phases or
 * compare phase strings must import from here, not from string literals
 * scattered across hooks/skills/scripts.
 *
 * Design Ref: bkit-v2111-sprint-gamma.design.md §2.3 / §3.2
 *
 * @module lib/application/pdca-lifecycle/phases
 * @version 2.1.11
 * @since 2.1.11
 */
```

**Export pattern**:
- `PHASES` (Object.freeze enum, 9 keys)
- `PHASE_ORDER` (Object.freeze array, 9 entries)
- `PHASE_SET` (`new Set(PHASE_ORDER)`)
- `isValidPhase(phase)` → boolean
- `phaseIndex(phase)` → number (-1 if unknown)
- `nextPhase(phase)` → string | null

**Sprint 1 적용 (file: lib/application/sprint-lifecycle/phases.js)**:
- 동일 구조, 8 keys (PRD/PLAN/DESIGN/DO/ITERATE/QA/REPORT/ARCHIVED)
- Helper 함수 이름은 `sprintPhase*` prefix (namespace collision 회피)
- `isValidSprintPhase` / `sprintPhaseIndex` / `nextSprintPhase`

#### 1.2.2 `lib/application/pdca-lifecycle/transitions.js` (file:1-69)

**핵심 발견 — canTransition 반환 시그니처**:
```javascript
function canTransition(from, to) {
  if (!isValidPhase(from)) return { ok: false, reason: 'invalid_from_phase' };
  if (!isValidPhase(to))   return { ok: false, reason: 'invalid_to_phase' };
  if (from === to)         return { ok: true }; // idempotent (status refresh)
  const allowed = TRANSITIONS[from] || [];
  if (allowed.includes(to)) return { ok: true };
  return { ok: false, reason: 'transition_not_allowed' };
}
```

→ **`{ ok: boolean, reason?: string }` 객체 반환 — boolean 아님**.

**Adjacency map의 Object.freeze nested**:
```javascript
const TRANSITIONS = Object.freeze({
  [PHASES.PM]:      Object.freeze([PHASES.PLAN, PHASES.ARCHIVE]),
  [PHASES.PLAN]:    Object.freeze([PHASES.DESIGN, PHASES.ARCHIVE]),
  // ...
});
```

→ **outer Object.freeze + inner Object.freeze([...]) 깊이 적용** (mutation 차단 100%).

**legalNextPhases** 반환:
```javascript
function legalNextPhases(from) {
  if (!isValidPhase(from)) return [];
  return [...(TRANSITIONS[from] || [])];  // ← spread copy
}
```

→ **spread copy로 외부 mutation 차단** (frozen 배열의 reference 노출 회피).

**Sprint 1 적용 (file: lib/application/sprint-lifecycle/transitions.js)**:
- 동일 nested Object.freeze 깊이 적용
- `canTransitionSprint` 시그니처 PDCA와 동일
- `legalNextSprintPhases` spread copy 패턴 그대로

#### 1.2.3 `lib/application/pdca-lifecycle/index.js` (file:1-42)

**Barrel export pattern**:
```javascript
const phases = require('./phases');
const transitions = require('./transitions');

module.exports = {
  // Phase enum + utilities
  PHASES: phases.PHASES,
  PHASE_ORDER: phases.PHASE_ORDER,
  PHASE_SET: phases.PHASE_SET,
  isValidPhase: phases.isValidPhase,
  phaseIndex: phases.phaseIndex,
  nextPhase: phases.nextPhase,

  // Transition graph + utilities
  TRANSITIONS: transitions.TRANSITIONS,
  canTransition: transitions.canTransition,
  legalNextPhases: transitions.legalNextPhases,
};
```

**Sprint 1 적용 (file: lib/application/sprint-lifecycle/index.js)**:
- 동일 barrel 패턴. 9 exports (6 phases + 3 transitions).

### 1.3 Domain Layer 패턴 (3 archetypes)

#### 1.3.1 Port pattern — `lib/domain/ports/state-store.port.js`

**핵심 특징**:
- **Type-only** (runtime code 0건, `module.exports = {}`)
- JSDoc `@typedef` 로 interface 정의
- `@property`로 method signature 명시
- `@module` + `@version` stamp

**예시**:
```javascript
/**
 * @typedef {Object} StateStorePort
 * @property {(key: string) => Promise<any>} load
 * @property {(key: string, val: any) => Promise<void>} save
 * @property {(key: string) => Promise<void>} lock
 * @property {(key: string) => Promise<void>} unlock
 */
module.exports = {};
```

**Sprint 1 적용**: Sprint port는 Sprint 3에서 추가. Sprint 1은 Port 신규 0건.

#### 1.3.2 Rules pattern — `lib/domain/rules/docs-code-invariants.js`

**핵심 특징**:
- `EXPECTED_COUNTS` Object.freeze 상수
- Pure 함수 (`diffCounts`)
- "Pure domain module — no FS access" 명시 (header comment)
- `@version` + `@module`

**예시**:
```javascript
const EXPECTED_COUNTS = Object.freeze({
  skills: 43, agents: 36, hookEvents: 21, // ...
});

function diffCounts(measured) { /* pure */ }

module.exports = { EXPECTED_COUNTS, diffCounts };
```

**Sprint 1 적용 — entity.js / events.js**:
- entity.js: factory function `createSprint` + `cloneSprint` (pure)
- events.js: `SprintEvents` Object.freeze map (5 factory functions)

#### 1.3.3 Guards pattern — `lib/domain/guards/enh-264-token-threshold.js`

**핵심 특징**:
- 상수 export (THRESHOLD / SET / 등)
- `check(metrics): { hit: boolean, meta?: Object }` ← **PDCA `canTransition`과 동일 패턴**
- `removeWhen(ccVersion): boolean` (lifecycle marker)
- "Pure domain function" 명시
- JSDoc `@typedef` + `@returns`

**핵심 인사이트**: bkit domain의 모든 검증 함수는 **`{ hit/ok, meta/reason }` 객체 반환 패턴**.

**Sprint 1 적용 — validators.js**:
- `isValidSprintName(name): boolean` (간단 케이스 → boolean 반환 OK, PDCA `isValidPhase` 패턴)
- `validateSprintInput(input): { ok: boolean, errors?: string[] }` (composite case → 객체 반환, PDCA `canTransition` 패턴)

### 1.4 Domain Purity Invariant 검증 (`scripts/check-domain-purity.js`)

```javascript
const FORBIDDEN = ['fs', 'child_process', 'net', 'http', 'https', 'os', 'dns', 'tls', 'cluster'];

function checkFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  for (const mod of FORBIDDEN) {
    const reqPattern = new RegExp(`require\\(\\s*['\"]${mod}['\"]\\s*\\)`, 'g');
    const impPattern = new RegExp(`from\\s+['\"]${mod}['\"]`, 'g');
    if (reqPattern.test(src) || impPattern.test(src)) {
      violations.push(mod);
    }
  }
  return violations;
}
```

**검증 메커니즘**:
- regex로 `require('fs')` / `import ... from 'fs'` 등 검출
- 9개 forbidden modules 전수 검사
- 위반 1건이라도 발견 시 `process.exit(1)`

**Sprint 1 영향**:
- lib/domain/sprint/ 4 files 모두 위 regex 통과 필수
- `require('fs')` / `require('child_process')` 등 절대 사용 X
- timestamp 생성: `new Date().toISOString()` (built-in Date, no fs needed) ✓
- regex / kebab-case / Object.freeze 등 모두 native ✓

### 1.5 EXPECTED_COUNTS 영향 (docs-code-invariants.js)

현재 `EXPECTED_COUNTS`:
- skills: 43
- agents: 36
- hookEvents: 21
- hookBlocks: 24
- mcpServers: 2
- mcpTools: 16

**Sprint 1 영향**: **변경 0건** (Sprint 1은 lib/ 신규 7 files만, skills/agents/hooks/MCP 변경 없음). EXPECTED_COUNTS 갱신은 Sprint 4 (Presentation)에서 +1 skill (sprint) + 4 agents (sprint-orchestrator / sprint-master-planner / sprint-qa-flow / sprint-report-writer) → 44 / 40.

### 1.6 @version stamp 정책

기존 PDCA-lifecycle 3 files:
- phases.js: `@version 2.1.11`
- transitions.js: `@version 2.1.11`
- index.js: `@version 2.1.11`

Domain 12 files (확인):
- state-store.port.js: `@version 2.1.12`
- docs-code-invariants.js: `@version 2.1.12`
- enh-264-token-threshold.js: `@version 2.1.12`

**Sprint 1 신규 7 files**: 모두 `@version 2.1.13` + `@since 2.1.13` stamp.

---

## 2. Architecture Options (3 비교 → Pragmatic Balance 권장)

### Option A — Minimal (Domain만, Application 통합)

**구조**:
```
lib/domain/sprint/
  ├── phases.js
  ├── transitions.js
  ├── entity.js
  ├── validators.js
  ├── events.js
  └── index.js
```

**Pros**: 단일 위치, import path 단순  
**Cons**: ADR 0005 (Application Pilot)과 불일치. PDCA 패턴과 layer 분리 깨짐. → **거부**.

### Option B — Strict Clean Architecture (Application + Domain 명확 분리)

**구조**:
```
lib/application/sprint-lifecycle/
  ├── phases.js
  ├── transitions.js
  └── index.js
lib/domain/sprint/
  ├── entity.js
  ├── validators.js
  ├── events.js
  └── index.js
```

**Pros**: ADR 0005 패턴 정합. Layer 책임 명확 (Application = lifecycle orchestration, Domain = data + rules).  
**Cons**: 두 layer 분산 import path. → 본 옵션 **권장**.

**Layer rationale**:
- **Application**: phases enum + transitions adjacency = lifecycle orchestration의 일부 (use case가 import). PDCA 패턴 정합.
- **Domain**: entity + validators + events = 순수 비즈니스 데이터 + 규칙 (no I/O).

### Option C — Hybrid (Phases/Transitions은 Domain에, Use Cases는 Application)

**구조**:
```
lib/domain/sprint/
  ├── phases.js          # 자체 phases도 Domain에 (pure enum + transitions)
  ├── transitions.js
  ├── entity.js
  ├── validators.js
  ├── events.js
  └── index.js
lib/application/sprint-lifecycle/
  └── (Sprint 2에서 use cases)
```

**Pros**: 모든 sprint 데이터/규칙 한 위치. Domain 12 → 16 files.  
**Cons**: PDCA 패턴 (Application Pilot)과 정면 충돌. ADR 0005 의도와 일치 X. → **거부**.

### 결론

**Option B (Pragmatic Balance) 권장**. ADR 0005 패턴 + Clean Architecture 정합 + import path 분명. 두 layer 분산은 barrel index로 흡수 가능 (Sprint 2~6 작업자는 `require('lib/application/sprint-lifecycle')` + `require('lib/domain/sprint')` 두 호출).

---

## 3. Module Dependency Graph

```
                                    (외부 consumer - Sprint 2~6)
                                              │
                                              ▼
                  ┌──────────── lib/application/sprint-lifecycle/index.js ────────────┐
                  │                                                                   │
                  │  re-export from:                                                  │
                  │  - lib/application/sprint-lifecycle/phases.js                     │
                  │  - lib/application/sprint-lifecycle/transitions.js                │
                  │                                                                   │
                  └────────────────────────────┬──────────────────────────────────────┘
                                               │ require('./phases'), require('./transitions')
                                               ▼
                  ┌─────────────────────────────────────┐  ┌──────────────────────────────────┐
                  │  phases.js                          │  │  transitions.js                   │
                  │  - SPRINT_PHASES                    │  │  - SPRINT_TRANSITIONS             │
                  │  - SPRINT_PHASE_ORDER               │  │  - canTransitionSprint            │
                  │  - SPRINT_PHASE_SET                 │  │  - legalNextSprintPhases          │
                  │  - isValidSprintPhase               │◀─┤  require('./phases')              │
                  │  - sprintPhaseIndex                 │  │  (uses SPRINT_PHASES + isValid)   │
                  │  - nextSprintPhase                  │  │                                   │
                  └─────────────────────────────────────┘  └───────────────────────────────────┘


                                    (외부 consumer - Sprint 2~6)
                                              │
                                              ▼
                  ┌──────────────── lib/domain/sprint/index.js ────────────────────────┐
                  │                                                                    │
                  │  re-export from:                                                   │
                  │  - lib/domain/sprint/entity.js                                     │
                  │  - lib/domain/sprint/validators.js                                 │
                  │  - lib/domain/sprint/events.js                                     │
                  │                                                                    │
                  └────────────────────────────┬───────────────────────────────────────┘
                                               │
                       ┌───────────────────────┼─────────────────────────┐
                       │                       │                         │
                       ▼                       ▼                         ▼
            ┌──────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
            │  entity.js       │    │  validators.js       │    │  events.js          │
            │  - createSprint  │    │  - isValidSprintName │    │  - SprintEvents     │
            │  - cloneSprint   │    │  - isValidContext... │    │  - SPRINT_EVENT...  │
            │  - 12 @typedef   │    │  - sprintPhaseDoc... │    │  - isValidSprintEv..│
            │                  │◀───┤  - validateSprint... │    │                     │
            │                  │    │  (typedef only)      │    │                     │
            └──────────────────┘    └──────────────────────┘    └─────────────────────┘
```

**핵심**:
- Application sprint-lifecycle ↔ Domain sprint: **상호 import 0건** (loosely coupled)
- Sprint 2 use cases가 **양쪽 모두** import 가능 (`require('lib/application/sprint-lifecycle')` + `require('lib/domain/sprint')`)
- Domain layer는 자기 자신만 import (no Application, no Infrastructure)

---

## 4. 7 Files 정확한 구현 Spec

### 4.1 `lib/application/sprint-lifecycle/phases.js`

```javascript
/**
 * phases.js — Sprint phase enum + ordered sequence (v2.1.13 Sprint 1).
 *
 * Single source of truth for the 8-phase Sprint lifecycle:
 *   prd → plan → design → do → iterate → qa → report → archived
 *
 * Frozen constants — Sprint orchestration code must import from here.
 * PDCA-pattern parity (lib/application/pdca-lifecycle/phases.js).
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.1
 * ADR Ref: 0008-sprint-phase-enum
 *
 * @module lib/application/sprint-lifecycle/phases
 * @version 2.1.13
 * @since 2.1.13
 */

const SPRINT_PHASES = Object.freeze({
  PRD: 'prd',
  PLAN: 'plan',
  DESIGN: 'design',
  DO: 'do',
  ITERATE: 'iterate',
  QA: 'qa',
  REPORT: 'report',
  ARCHIVED: 'archived',
});

const SPRINT_PHASE_ORDER = Object.freeze([
  SPRINT_PHASES.PRD,
  SPRINT_PHASES.PLAN,
  SPRINT_PHASES.DESIGN,
  SPRINT_PHASES.DO,
  SPRINT_PHASES.ITERATE,
  SPRINT_PHASES.QA,
  SPRINT_PHASES.REPORT,
  SPRINT_PHASES.ARCHIVED,
]);

const SPRINT_PHASE_SET = new Set(SPRINT_PHASE_ORDER);

/**
 * Check if `phase` is a recognized Sprint phase string.
 * @param {string} phase
 * @returns {boolean}
 */
function isValidSprintPhase(phase) {
  return typeof phase === 'string' && SPRINT_PHASE_SET.has(phase);
}

/**
 * Returns the index of `phase` in canonical Sprint order, or -1 if unknown.
 * @param {string} phase
 * @returns {number}
 */
function sprintPhaseIndex(phase) {
  if (!isValidSprintPhase(phase)) return -1;
  return SPRINT_PHASE_ORDER.indexOf(phase);
}

/**
 * Returns the next Sprint phase in canonical order, or null if at end.
 * @param {string} phase
 * @returns {string|null}
 */
function nextSprintPhase(phase) {
  const i = sprintPhaseIndex(phase);
  if (i < 0 || i >= SPRINT_PHASE_ORDER.length - 1) return null;
  return SPRINT_PHASE_ORDER[i + 1];
}

module.exports = {
  SPRINT_PHASES,
  SPRINT_PHASE_ORDER,
  SPRINT_PHASE_SET,
  isValidSprintPhase,
  sprintPhaseIndex,
  nextSprintPhase,
};
```

**LOC**: ~85 (header 19 + code 66)

### 4.2 `lib/application/sprint-lifecycle/transitions.js`

```javascript
/**
 * transitions.js — Legal Sprint phase transitions (v2.1.13 Sprint 1).
 *
 * Defines the directed graph of allowed Sprint phase transitions:
 *   - Forward: linear prd→plan→design→do→iterate→qa→report→archived
 *   - Iterate loop: do→iterate (matchRate <100% auto-trigger, 사용자 요구)
 *                   iterate→do (max 5 cycles)
 *   - QA fail-back: qa→do (S1 dataFlowIntegrity <100)
 *   - Skip-iterate: do→qa (matchRate 100% 시 iterate 우회)
 *   - Abandon: any → archived
 *
 * PDCA-pattern parity (lib/application/pdca-lifecycle/transitions.js).
 * Returns { ok: boolean, reason?: string } object (NOT plain boolean).
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.2
 * ADR Ref: 0008-sprint-phase-enum
 *
 * @module lib/application/sprint-lifecycle/transitions
 * @version 2.1.13
 * @since 2.1.13
 */

const { SPRINT_PHASES, isValidSprintPhase } = require('./phases');

/**
 * Adjacency map: each phase → array of legal next phases.
 * Nested Object.freeze() ensures both outer + inner immutability.
 */
const SPRINT_TRANSITIONS = Object.freeze({
  [SPRINT_PHASES.PRD]:      Object.freeze([SPRINT_PHASES.PLAN, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.PLAN]:     Object.freeze([SPRINT_PHASES.DESIGN, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.DESIGN]:   Object.freeze([SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.DO]:       Object.freeze([SPRINT_PHASES.ITERATE, SPRINT_PHASES.QA, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.ITERATE]:  Object.freeze([SPRINT_PHASES.QA, SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.QA]:       Object.freeze([SPRINT_PHASES.REPORT, SPRINT_PHASES.DO, SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.REPORT]:   Object.freeze([SPRINT_PHASES.ARCHIVED]),
  [SPRINT_PHASES.ARCHIVED]: Object.freeze([]),
});

/**
 * Determines whether a Sprint phase transition is permitted.
 * PDCA-pattern parity: returns { ok, reason } object.
 *
 * @param {string} from
 * @param {string} to
 * @returns {{ ok: boolean, reason?: string }}
 */
function canTransitionSprint(from, to) {
  if (!isValidSprintPhase(from)) return { ok: false, reason: 'invalid_from_phase' };
  if (!isValidSprintPhase(to))   return { ok: false, reason: 'invalid_to_phase' };
  if (from === to)               return { ok: true }; // idempotent (status refresh)
  const allowed = SPRINT_TRANSITIONS[from] || [];
  if (allowed.includes(to))      return { ok: true };
  return { ok: false, reason: 'transition_not_allowed' };
}

/**
 * Returns the legal next-phase set as a plain (mutable) array copy.
 * Spread copy prevents external mutation of the frozen TRANSITIONS array.
 *
 * @param {string} from
 * @returns {string[]}
 */
function legalNextSprintPhases(from) {
  if (!isValidSprintPhase(from)) return [];
  return [...(SPRINT_TRANSITIONS[from] || [])];
}

module.exports = {
  SPRINT_TRANSITIONS,
  canTransitionSprint,
  legalNextSprintPhases,
};
```

**LOC**: ~75 (header 23 + code 52)

### 4.3 `lib/application/sprint-lifecycle/index.js`

```javascript
/**
 * index.js — Sprint lifecycle Application Layer public API (v2.1.13).
 *
 * Re-exports the Sprint phase enum + transition graph for use cases.
 *
 * v2.1.13 ships this NEW module alongside lib/application/pdca-lifecycle/
 * for Sprint Management feature. Sprint 2~6 use cases import from here.
 *
 * Module structure:
 *   - phases.js      — SPRINT_PHASES enum, SPRINT_PHASE_ORDER, helpers
 *   - transitions.js — SPRINT_TRANSITIONS map, canTransitionSprint, legalNextSprintPhases
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.3
 * ADR Ref: 0007 (Sprint as Meta Container), 0008 (Sprint Phase Enum)
 *
 * @module lib/application/sprint-lifecycle
 * @version 2.1.13
 * @since 2.1.13
 */

const phases = require('./phases');
const transitions = require('./transitions');

module.exports = {
  // Phase enum + utilities (6 exports from phases.js)
  SPRINT_PHASES: phases.SPRINT_PHASES,
  SPRINT_PHASE_ORDER: phases.SPRINT_PHASE_ORDER,
  SPRINT_PHASE_SET: phases.SPRINT_PHASE_SET,
  isValidSprintPhase: phases.isValidSprintPhase,
  sprintPhaseIndex: phases.sprintPhaseIndex,
  nextSprintPhase: phases.nextSprintPhase,

  // Transition graph + utilities (3 exports from transitions.js)
  SPRINT_TRANSITIONS: transitions.SPRINT_TRANSITIONS,
  canTransitionSprint: transitions.canTransitionSprint,
  legalNextSprintPhases: transitions.legalNextSprintPhases,
};
```

**LOC**: ~45 (header 19 + code 26)

### 4.4 `lib/domain/sprint/entity.js`

```javascript
/**
 * Sprint Entity — Pure domain object factory + immutable update helpers.
 *
 * Defines the Sprint JSDoc type (state schema v1.1) and provides
 * factory functions for construction and cloning. No I/O, no external
 * dependencies — pure domain module.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.4
 * ADR Ref: 0007 (Sprint as Meta Container), 0009 (Auto-Run + Auto-Pause schema)
 *
 * Pure domain module — no FS access.
 *
 * @module lib/domain/sprint/entity
 * @version 2.1.13
 * @since 2.1.13
 */

/**
 * @typedef {Object} SprintContext
 * @property {string} WHY     - Motivation / problem statement
 * @property {string} WHO     - Target users / stakeholders
 * @property {string} RISK    - Failure impact + mitigation
 * @property {string} SUCCESS - Success criteria (5W1H)
 * @property {string} SCOPE   - Quantitative scope (features, LOC, duration)
 */

/**
 * @typedef {Object} SprintConfig
 * @property {number} budget                  - Token budget (default 1_000_000)
 * @property {number} phaseTimeoutHours       - Phase auto-pause timeout (default 4)
 * @property {number} maxIterations           - Max iterate cycles (default 5)
 * @property {number} matchRateTarget         - Target matchRate (default 100)
 * @property {number} matchRateMinAcceptable  - Min acceptable after max iter (default 90)
 * @property {string} dashboardMode           - 'session-start' | 'watch' | 'both'
 * @property {boolean} manual                 - true = each phase user-approved
 */

/**
 * @typedef {Object} SprintAutoRun
 * @property {boolean} enabled                - Auto-run mode on?
 * @property {string|null} scope              - Target phase (last auto-advanced)
 * @property {string} trustLevelAtStart       - L0~L4 at sprint start
 * @property {string|null} startedAt          - ISO 8601
 * @property {string|null} lastAutoAdvanceAt  - ISO 8601
 */

/**
 * @typedef {Object} SprintAutoPause
 * @property {string[]} armed                 - Active trigger names
 * @property {string|null} lastTrigger        - Most recent trigger
 * @property {Array<Object>} pauseHistory     - Pause event audit trail
 */

/**
 * @typedef {Object} SprintPhaseHistory
 * @property {string} phase
 * @property {string} enteredAt               - ISO 8601
 * @property {string|null} exitedAt           - ISO 8601 or null if active
 * @property {number|null} durationMs         - Computed on exit
 */

/**
 * @typedef {Object} SprintIterationHistory
 * @property {number} iteration               - 1-indexed
 * @property {number|null} matchRate          - 0-100
 * @property {string[]} fixedTaskIds          - Task IDs touched
 * @property {number|null} durationMs
 */

/**
 * @typedef {Object} SprintDocs
 * @property {string|null} masterPlan
 * @property {string|null} prd
 * @property {string|null} plan
 * @property {string|null} design
 * @property {string|null} iterate
 * @property {string|null} qa
 * @property {string|null} report
 */

/**
 * @typedef {Object} SprintFeatureMapEntry
 * @property {string} pdcaPhase               - Feature's current PDCA phase
 * @property {number|null} matchRate          - 0-100
 * @property {string} qa                      - 'pending' | 'in_progress' | 'pass' | 'fail'
 */

/**
 * @typedef {Object<string, SprintFeatureMapEntry>} SprintFeatureMap
 */

/**
 * @typedef {Object} SprintQualityGateValue
 * @property {number|boolean|null} current
 * @property {number|boolean} threshold
 * @property {boolean|null} passed
 */

/**
 * @typedef {Object} SprintQualityGates
 * @property {SprintQualityGateValue} M1_matchRate
 * @property {SprintQualityGateValue} M2_codeQualityScore
 * @property {SprintQualityGateValue} M3_criticalIssueCount
 * @property {SprintQualityGateValue} M4_apiComplianceRate
 * @property {SprintQualityGateValue} M7_conventionCompliance
 * @property {SprintQualityGateValue} M8_designCompleteness
 * @property {SprintQualityGateValue} M10_pdcaCycleTimeHours
 * @property {SprintQualityGateValue} S1_dataFlowIntegrity
 * @property {SprintQualityGateValue} S2_featureCompletion
 * @property {SprintQualityGateValue} S3_velocity
 * @property {SprintQualityGateValue} S4_archiveReadiness
 */

/**
 * @typedef {Object} SprintKPI
 * @property {number|null} matchRate
 * @property {number} criticalIssues
 * @property {number|null} qaPassRate
 * @property {number|null} dataFlowIntegrity
 * @property {number} featuresTotal
 * @property {number} featuresCompleted
 * @property {number} featureCompletionRate
 * @property {number} cumulativeTokens
 * @property {number} cumulativeIterations
 * @property {number|null} sprintCycleHours
 */

/**
 * @typedef {Object} Sprint
 * @property {string} id                            - kebab-case unique
 * @property {string} name                          - Human-readable
 * @property {string} version                       - schema version (e.g., "1.1")
 * @property {string} phase                         - SPRINT_PHASES value
 * @property {string} status                        - 'active'|'paused'|'completed'|'archived'
 * @property {SprintContext} context
 * @property {string[]} features
 * @property {SprintConfig} config
 * @property {SprintAutoRun} autoRun
 * @property {SprintAutoPause} autoPause
 * @property {SprintPhaseHistory[]} phaseHistory
 * @property {SprintIterationHistory[]} iterateHistory
 * @property {SprintDocs} docs
 * @property {SprintFeatureMap} featureMap
 * @property {SprintQualityGates} qualityGates
 * @property {SprintKPI} kpi
 * @property {string} createdAt                     - ISO 8601
 * @property {string|null} startedAt
 * @property {string|null} archivedAt
 */

/**
 * @typedef {Object} SprintInput
 * @property {string} id                            - required
 * @property {string} name                          - required
 * @property {string} [phase]                       - default 'prd'
 * @property {SprintContext} [context]              - default empty
 * @property {string[]} [features]                  - default []
 * @property {Partial<SprintConfig>} [config]       - merged with defaults
 * @property {string} [trustLevelAtStart]           - default 'L2'
 */

const DEFAULT_CONFIG = Object.freeze({
  budget: 1_000_000,
  phaseTimeoutHours: 4,
  maxIterations: 5,
  matchRateTarget: 100,
  matchRateMinAcceptable: 90,
  dashboardMode: 'session-start',
  manual: false,
});

const DEFAULT_QUALITY_GATES = Object.freeze({
  M1_matchRate:           Object.freeze({ current: null, threshold: 90, passed: null }),
  M2_codeQualityScore:    Object.freeze({ current: null, threshold: 80, passed: null }),
  M3_criticalIssueCount:  Object.freeze({ current: 0,    threshold: 0,  passed: true }),
  M4_apiComplianceRate:   Object.freeze({ current: null, threshold: 95, passed: null }),
  M7_conventionCompliance:Object.freeze({ current: null, threshold: 90, passed: null }),
  M8_designCompleteness:  Object.freeze({ current: null, threshold: 85, passed: null }),
  M10_pdcaCycleTimeHours: Object.freeze({ current: null, threshold: 40, passed: null }),
  S1_dataFlowIntegrity:   Object.freeze({ current: null, threshold: 100, passed: null }),
  S2_featureCompletion:   Object.freeze({ current: 0,    threshold: 100, passed: false }),
  S3_velocity:            Object.freeze({ current: null, threshold: null, passed: null }),
  S4_archiveReadiness:    Object.freeze({ current: false, threshold: true, passed: false }),
});

/**
 * Factory for a new Sprint entity with defaults applied.
 *
 * @param {SprintInput} input
 * @returns {Sprint}
 */
function createSprint(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('createSprint: input must be an object');
  }
  if (typeof input.id !== 'string' || input.id.length === 0) {
    throw new TypeError('createSprint: input.id must be non-empty string');
  }
  if (typeof input.name !== 'string' || input.name.length === 0) {
    throw new TypeError('createSprint: input.name must be non-empty string');
  }
  const now = new Date().toISOString();
  return {
    id: input.id,
    name: input.name,
    version: '1.1',
    phase: input.phase || 'prd',
    status: 'active',
    context: input.context || { WHY: '', WHO: '', RISK: '', SUCCESS: '', SCOPE: '' },
    features: Array.isArray(input.features) ? [...input.features] : [],
    config: { ...DEFAULT_CONFIG, ...(input.config || {}) },
    autoRun: {
      enabled: true,
      scope: null,
      trustLevelAtStart: input.trustLevelAtStart || 'L2',
      startedAt: null,
      lastAutoAdvanceAt: null,
    },
    autoPause: {
      armed: ['QUALITY_GATE_FAIL', 'ITERATION_EXHAUSTED', 'BUDGET_EXCEEDED', 'PHASE_TIMEOUT'],
      lastTrigger: null,
      pauseHistory: [],
    },
    phaseHistory: [],
    iterateHistory: [],
    docs: {
      masterPlan: null, prd: null, plan: null,
      design: null, iterate: null, qa: null, report: null,
    },
    featureMap: {},
    qualityGates: JSON.parse(JSON.stringify(DEFAULT_QUALITY_GATES)),
    kpi: {
      matchRate: null,
      criticalIssues: 0,
      qaPassRate: null,
      dataFlowIntegrity: null,
      featuresTotal: 0,
      featuresCompleted: 0,
      featureCompletionRate: 0,
      cumulativeTokens: 0,
      cumulativeIterations: 0,
      sprintCycleHours: null,
    },
    createdAt: now,
    startedAt: null,
    archivedAt: null,
  };
}

/**
 * Immutable update helper: returns a new Sprint with updates applied.
 *
 * @param {Sprint} sprint
 * @param {Partial<Sprint>} updates
 * @returns {Sprint}
 */
function cloneSprint(sprint, updates) {
  if (!sprint || typeof sprint !== 'object') {
    throw new TypeError('cloneSprint: sprint must be an object');
  }
  return { ...sprint, ...(updates || {}) };
}

module.exports = {
  createSprint,
  cloneSprint,
  DEFAULT_CONFIG,
  DEFAULT_QUALITY_GATES,
};
```

**LOC**: ~220 (JSDoc-heavy)

### 4.5 `lib/domain/sprint/validators.js`

```javascript
/**
 * Sprint Validators — Pure validation functions for Sprint entity.
 *
 * Enforces kebab-case name policy, context anchor completeness, and
 * phase document path mapping (Master Plan §18 Document Index).
 *
 * Returns boolean for simple checks (PDCA `isValidPhase` pattern) or
 * { ok, errors? } object for composite checks (PDCA `canTransition` pattern).
 *
 * Pure domain functions — no I/O.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.5
 *
 * @module lib/domain/sprint/validators
 * @version 2.1.13
 * @since 2.1.13
 */

const SPRINT_NAME_REGEX = /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/;
const SPRINT_NAME_MIN_LENGTH = 3;
const SPRINT_NAME_MAX_LENGTH = 64;

const REQUIRED_CONTEXT_KEYS = Object.freeze(['WHY', 'WHO', 'RISK', 'SUCCESS', 'SCOPE']);

const PHASE_DOC_PATH_MAP = Object.freeze({
  masterPlan: (id) => `docs/01-plan/features/${id}.master-plan.md`,
  prd:        (id) => `docs/01-plan/features/${id}.prd.md`,
  plan:       (id) => `docs/01-plan/features/${id}.plan.md`,
  design:     (id) => `docs/02-design/features/${id}.design.md`,
  iterate:    (id) => `docs/03-analysis/features/${id}.iterate.md`,
  qa:         (id) => `docs/05-qa/features/${id}.qa-report.md`,
  report:     (id) => `docs/04-report/features/${id}.report.md`,
});

/**
 * Check if sprint name is valid kebab-case.
 * Rules:
 *   - 3-64 chars
 *   - Lowercase alphanumeric + hyphen only
 *   - Must start with letter, end with alphanumeric
 *   - No consecutive hyphens (--)
 *
 * @param {string} name
 * @returns {boolean}
 */
function isValidSprintName(name) {
  if (typeof name !== 'string') return false;
  if (name.length < SPRINT_NAME_MIN_LENGTH || name.length > SPRINT_NAME_MAX_LENGTH) return false;
  if (!SPRINT_NAME_REGEX.test(name)) return false;
  if (name.includes('--')) return false;
  return true;
}

/**
 * Check if SprintContext has all required keys with non-empty values.
 *
 * @param {Object} ctx
 * @returns {boolean}
 */
function isValidSprintContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return false;
  return REQUIRED_CONTEXT_KEYS.every((k) =>
    typeof ctx[k] === 'string' && ctx[k].trim().length > 0
  );
}

/**
 * Returns the file path for a given Sprint phase document.
 * Mapping from Master Plan §18 Document Index.
 *
 * @param {string} sprintId
 * @param {string} phase - 'masterPlan' | 'prd' | 'plan' | 'design' | 'iterate' | 'qa' | 'report'
 * @returns {string|null}
 */
function sprintPhaseDocPath(sprintId, phase) {
  if (typeof sprintId !== 'string' || sprintId.length === 0) return null;
  const builder = PHASE_DOC_PATH_MAP[phase];
  if (!builder) return null;
  return builder(sprintId);
}

/**
 * Composite validation for SprintInput.
 * PDCA `canTransition` pattern: returns { ok, errors? }.
 *
 * @param {Object} input
 * @returns {{ ok: boolean, errors?: string[] }}
 */
function validateSprintInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['input_not_object'] };
  }
  if (!isValidSprintName(input.id)) {
    errors.push('invalid_id_kebab_case');
  }
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    errors.push('invalid_name_empty');
  }
  if (input.phase !== undefined && typeof input.phase !== 'string') {
    errors.push('invalid_phase_type');
  }
  if (input.context !== undefined && !isValidSprintContext(input.context)) {
    errors.push('invalid_context_missing_keys');
  }
  if (input.features !== undefined && !Array.isArray(input.features)) {
    errors.push('invalid_features_not_array');
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

module.exports = {
  isValidSprintName,
  isValidSprintContext,
  sprintPhaseDocPath,
  validateSprintInput,
  SPRINT_NAME_REGEX,
  REQUIRED_CONTEXT_KEYS,
};
```

**LOC**: ~115

### 4.6 `lib/domain/sprint/events.js`

```javascript
/**
 * Sprint Events — Domain event factories for audit + telemetry integration.
 *
 * Defines 5 domain events that Sprint orchestration emits:
 *   - SprintCreated     (init phase 진입)
 *   - SprintPhaseChanged (phase 전이)
 *   - SprintArchived    (sprint 종료)
 *   - SprintPaused      (auto-pause trigger 발화)
 *   - SprintResumed     (사용자 resume 또는 자동 해소)
 *
 * Each factory returns a new event object with timestamp.
 * SprintEvents map + SPRINT_EVENT_TYPES are frozen.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.6
 * Plan SC: ADR 0009 — auto-pause trigger audit trail
 *
 * Pure domain module — no FS access (uses Date.toISOString native).
 *
 * @module lib/domain/sprint/events
 * @version 2.1.13
 * @since 2.1.13
 */

const SPRINT_EVENT_TYPES = Object.freeze([
  'SprintCreated',
  'SprintPhaseChanged',
  'SprintArchived',
  'SprintPaused',
  'SprintResumed',
]);

const SPRINT_EVENT_TYPE_SET = new Set(SPRINT_EVENT_TYPES);

/**
 * @typedef {Object} SprintEvent
 * @property {string} type        - One of SPRINT_EVENT_TYPES
 * @property {string} timestamp   - ISO 8601
 * @property {Object} payload     - Event-specific shape
 */

const SprintEvents = Object.freeze({
  /**
   * @param {{ sprintId: string, name: string, phase: string }} payload
   * @returns {SprintEvent}
   */
  SprintCreated: (payload) => ({
    type: 'SprintCreated',
    timestamp: new Date().toISOString(),
    payload: {
      sprintId: payload.sprintId,
      name: payload.name,
      phase: payload.phase,
    },
  }),

  /**
   * @param {{ sprintId: string, fromPhase: string, toPhase: string, reason?: string }} payload
   * @returns {SprintEvent}
   */
  SprintPhaseChanged: (payload) => ({
    type: 'SprintPhaseChanged',
    timestamp: new Date().toISOString(),
    payload: {
      sprintId: payload.sprintId,
      fromPhase: payload.fromPhase,
      toPhase: payload.toPhase,
      reason: payload.reason || null,
    },
  }),

  /**
   * @param {{ sprintId: string, archivedAt: string, reason?: string, kpiSnapshot?: Object }} payload
   * @returns {SprintEvent}
   */
  SprintArchived: (payload) => ({
    type: 'SprintArchived',
    timestamp: new Date().toISOString(),
    payload: {
      sprintId: payload.sprintId,
      archivedAt: payload.archivedAt || new Date().toISOString(),
      reason: payload.reason || null,
      kpiSnapshot: payload.kpiSnapshot || null,
    },
  }),

  /**
   * @param {{ sprintId: string, trigger: string, severity?: string, message?: string }} payload
   * @returns {SprintEvent}
   */
  SprintPaused: (payload) => ({
    type: 'SprintPaused',
    timestamp: new Date().toISOString(),
    payload: {
      sprintId: payload.sprintId,
      trigger: payload.trigger,
      severity: payload.severity || 'MEDIUM',
      message: payload.message || null,
    },
  }),

  /**
   * @param {{ sprintId: string, pausedAt: string, resumedAt?: string, durationMs?: number }} payload
   * @returns {SprintEvent}
   */
  SprintResumed: (payload) => ({
    type: 'SprintResumed',
    timestamp: new Date().toISOString(),
    payload: {
      sprintId: payload.sprintId,
      pausedAt: payload.pausedAt,
      resumedAt: payload.resumedAt || new Date().toISOString(),
      durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : null,
    },
  }),
});

/**
 * Validate event shape (used by audit-logger sanitizer).
 *
 * @param {SprintEvent} event
 * @returns {boolean}
 */
function isValidSprintEvent(event) {
  if (!event || typeof event !== 'object') return false;
  if (!SPRINT_EVENT_TYPE_SET.has(event.type)) return false;
  if (typeof event.timestamp !== 'string') return false;
  if (!event.payload || typeof event.payload !== 'object') return false;
  if (typeof event.payload.sprintId !== 'string') return false;
  return true;
}

module.exports = {
  SprintEvents,
  SPRINT_EVENT_TYPES,
  SPRINT_EVENT_TYPE_SET,
  isValidSprintEvent,
};
```

**LOC**: ~120

### 4.7 `lib/domain/sprint/index.js`

```javascript
/**
 * index.js — Sprint Domain Layer public API (v2.1.13).
 *
 * Re-exports the Sprint entity factory + validators + events for
 * use by Application Layer (Sprint 2~) and Infrastructure (Sprint 3).
 *
 * Module structure:
 *   - entity.js     — createSprint, cloneSprint, DEFAULT_CONFIG, DEFAULT_QUALITY_GATES
 *   - validators.js — isValidSprintName, isValidSprintContext, sprintPhaseDocPath, validateSprintInput
 *   - events.js     — SprintEvents, SPRINT_EVENT_TYPES, isValidSprintEvent
 *
 * Design Ref: docs/02-design/features/v2113-sprint-1-domain.design.md §4.7
 * ADR Ref: 0007 (Sprint as Meta Container)
 *
 * Pure domain module — no FS access.
 *
 * @module lib/domain/sprint
 * @version 2.1.13
 * @since 2.1.13
 */

const entity = require('./entity');
const validators = require('./validators');
const events = require('./events');

module.exports = {
  // Entity factory + helpers
  createSprint: entity.createSprint,
  cloneSprint: entity.cloneSprint,
  DEFAULT_CONFIG: entity.DEFAULT_CONFIG,
  DEFAULT_QUALITY_GATES: entity.DEFAULT_QUALITY_GATES,

  // Validators
  isValidSprintName: validators.isValidSprintName,
  isValidSprintContext: validators.isValidSprintContext,
  sprintPhaseDocPath: validators.sprintPhaseDocPath,
  validateSprintInput: validators.validateSprintInput,
  SPRINT_NAME_REGEX: validators.SPRINT_NAME_REGEX,
  REQUIRED_CONTEXT_KEYS: validators.REQUIRED_CONTEXT_KEYS,

  // Events
  SprintEvents: events.SprintEvents,
  SPRINT_EVENT_TYPES: events.SPRINT_EVENT_TYPES,
  SPRINT_EVENT_TYPE_SET: events.SPRINT_EVENT_TYPE_SET,
  isValidSprintEvent: events.isValidSprintEvent,
};
```

**LOC**: ~50

### 4.8 LOC 합계 정정

| File | LOC est. | LOC actual (design) |
|------|----------|---------------------|
| application/sprint-lifecycle/phases.js | 85 | 85 |
| application/sprint-lifecycle/transitions.js | 75 | 75 |
| application/sprint-lifecycle/index.js | 45 | 45 |
| domain/sprint/entity.js | 95 | **220** (JSDoc-heavy) |
| domain/sprint/validators.js | 65 | 115 |
| domain/sprint/events.js | 75 | 120 |
| domain/sprint/index.js | 25 | 50 |
| **합계** | **465** | **~710 LOC** |

**Update**: Master Plan v1.1 §14 Stage 1 LOC est. 250 → 정정 **~710 LOC** (Iterate phase에서 v1.2 갱신).

---

## 5. §8 Test Plan Matrix (5-Layer)

### §8.1 L1 — Unit Tests (Sprint 1 핵심)

#### TC-L1-01: `SPRINT_PHASES` Object.freeze immutability
```javascript
const { SPRINT_PHASES } = require('lib/application/sprint-lifecycle');
expect(() => { SPRINT_PHASES.NEW_PHASE = 'new'; }).to.throw(TypeError);  // strict mode
expect(Object.isFrozen(SPRINT_PHASES)).to.be.true;
expect(SPRINT_PHASES.PRD).to.equal('prd');
expect(Object.keys(SPRINT_PHASES).length).to.equal(8);
```

#### TC-L1-02: `SPRINT_PHASE_ORDER` linear sequence
```javascript
const { SPRINT_PHASE_ORDER } = require('lib/application/sprint-lifecycle');
expect(SPRINT_PHASE_ORDER).to.have.lengthOf(8);
expect(SPRINT_PHASE_ORDER[0]).to.equal('prd');
expect(SPRINT_PHASE_ORDER[7]).to.equal('archived');
expect(Object.isFrozen(SPRINT_PHASE_ORDER)).to.be.true;
```

#### TC-L1-03: `isValidSprintPhase` boolean returns
```javascript
const { isValidSprintPhase } = require('lib/application/sprint-lifecycle');
expect(isValidSprintPhase('prd')).to.be.true;
expect(isValidSprintPhase('unknown')).to.be.false;
expect(isValidSprintPhase(null)).to.be.false;
expect(isValidSprintPhase(123)).to.be.false;
```

#### TC-L1-04: `canTransitionSprint` { ok, reason } shape
```javascript
const { canTransitionSprint } = require('lib/application/sprint-lifecycle');
expect(canTransitionSprint('prd', 'plan')).to.deep.equal({ ok: true });
expect(canTransitionSprint('prd', 'archived')).to.deep.equal({ ok: true });
expect(canTransitionSprint('do', 'iterate')).to.deep.equal({ ok: true });    // auto-iterate
expect(canTransitionSprint('qa', 'do')).to.deep.equal({ ok: true });         // fail-back
expect(canTransitionSprint('archived', 'plan')).to.deep.equal({ ok: false, reason: 'transition_not_allowed' });
expect(canTransitionSprint('invalid', 'plan')).to.deep.equal({ ok: false, reason: 'invalid_from_phase' });
expect(canTransitionSprint('plan', 'invalid')).to.deep.equal({ ok: false, reason: 'invalid_to_phase' });
expect(canTransitionSprint('plan', 'plan')).to.deep.equal({ ok: true });     // idempotent
```

#### TC-L1-05: `SPRINT_TRANSITIONS` nested immutability
```javascript
const { SPRINT_TRANSITIONS } = require('lib/application/sprint-lifecycle');
expect(Object.isFrozen(SPRINT_TRANSITIONS)).to.be.true;
expect(Object.isFrozen(SPRINT_TRANSITIONS.prd)).to.be.true;  // ★ nested
expect(() => { SPRINT_TRANSITIONS.prd.push('do'); }).to.throw(TypeError);
```

#### TC-L1-06: `legalNextSprintPhases` mutable copy
```javascript
const { legalNextSprintPhases, SPRINT_TRANSITIONS } = require('lib/application/sprint-lifecycle');
const next = legalNextSprintPhases('prd');
next.push('hacked');  // mutation on copy, not original
expect(SPRINT_TRANSITIONS.prd).to.have.lengthOf(2);  // unchanged
```

#### TC-L1-07: `createSprint` factory + defaults
```javascript
const { createSprint } = require('lib/domain/sprint');
const sprint = createSprint({ id: 'my-sprint', name: 'My Sprint' });
expect(sprint.id).to.equal('my-sprint');
expect(sprint.phase).to.equal('prd');
expect(sprint.config.budget).to.equal(1_000_000);
expect(sprint.config.maxIterations).to.equal(5);
expect(sprint.autoPause.armed).to.deep.equal(['QUALITY_GATE_FAIL', 'ITERATION_EXHAUSTED', 'BUDGET_EXCEEDED', 'PHASE_TIMEOUT']);
expect(sprint.createdAt).to.match(/^\d{4}-\d{2}-\d{2}T/);
```

#### TC-L1-08: `isValidSprintName` edge cases
```javascript
const { isValidSprintName } = require('lib/domain/sprint');
// Valid
expect(isValidSprintName('my-sprint')).to.be.true;
expect(isValidSprintName('q2-2026-launch')).to.be.true;
expect(isValidSprintName('a-b')).to.be.true;  // min 3 chars
// Invalid
expect(isValidSprintName('My-Sprint')).to.be.false;   // uppercase
expect(isValidSprintName('-leading')).to.be.false;
expect(isValidSprintName('trailing-')).to.be.false;
expect(isValidSprintName('my--double')).to.be.false;
expect(isValidSprintName('a')).to.be.false;            // too short
expect(isValidSprintName('a'.repeat(65))).to.be.false; // too long
expect(isValidSprintName('with space')).to.be.false;
expect(isValidSprintName('with/slash')).to.be.false;
```

#### TC-L1-09: `SprintEvents.SprintCreated` factory
```javascript
const { SprintEvents } = require('lib/domain/sprint');
const event = SprintEvents.SprintCreated({ sprintId: 'my', name: 'My', phase: 'prd' });
expect(event.type).to.equal('SprintCreated');
expect(event.timestamp).to.match(/^\d{4}-\d{2}-\d{2}T/);
expect(event.payload).to.deep.equal({ sprintId: 'my', name: 'My', phase: 'prd' });
```

#### TC-L1-10: `SprintEvents` immutability
```javascript
const { SprintEvents } = require('lib/domain/sprint');
expect(Object.isFrozen(SprintEvents)).to.be.true;
expect(() => { SprintEvents.NewEvent = () => {}; }).to.throw(TypeError);
```

#### TC-L1-11: `isValidSprintEvent` validation
```javascript
const { isValidSprintEvent, SprintEvents } = require('lib/domain/sprint');
const valid = SprintEvents.SprintCreated({ sprintId: 'x', name: 'X', phase: 'prd' });
expect(isValidSprintEvent(valid)).to.be.true;
expect(isValidSprintEvent({})).to.be.false;
expect(isValidSprintEvent({ type: 'Unknown', timestamp: '...', payload: { sprintId: 'x' } })).to.be.false;
```

#### TC-L1-12: `sprintPhaseDocPath` mapping
```javascript
const { sprintPhaseDocPath } = require('lib/domain/sprint');
expect(sprintPhaseDocPath('my', 'prd')).to.equal('docs/01-plan/features/my.prd.md');
expect(sprintPhaseDocPath('my', 'design')).to.equal('docs/02-design/features/my.design.md');
expect(sprintPhaseDocPath('my', 'qa')).to.equal('docs/05-qa/features/my.qa-report.md');
expect(sprintPhaseDocPath('my', 'unknown')).to.be.null;
expect(sprintPhaseDocPath('', 'prd')).to.be.null;
```

#### TC-L1-13: `validateSprintInput` composite
```javascript
const { validateSprintInput } = require('lib/domain/sprint');
expect(validateSprintInput({ id: 'my-sprint', name: 'My' })).to.deep.equal({ ok: true });
expect(validateSprintInput({ id: 'Bad-Name', name: 'X' })).to.deep.equal({ ok: false, errors: ['invalid_id_kebab_case'] });
expect(validateSprintInput(null)).to.deep.equal({ ok: false, errors: ['input_not_object'] });
expect(validateSprintInput({ id: 'my', name: '' }).errors).to.include('invalid_name_empty');
```

**합계**: L1 unit TC **13건** (Plan §3 12건 → 13건으로 +1).

### §8.2 L2 — Integration Tests (제한적, Sprint 5에서 통합)

- Sprint 2 mock use case가 require() 후 SPRINT_PHASES 사용 — Sprint 2 작업 시
- Sprint 3 mock state store가 createSprint() 후 schema 검증 — Sprint 3 작업 시

### §8.3 L3 — Contract Tests (Sprint 5에서 통합)

- JSON Schema lock for Sprint entity v1.1 (state schema)

### §8.4 L4 — Performance (없음, Sprint 1 scope 외)

### §8.5 L5 — Security
- Object.freeze runtime mutation throw (TC-L1-01, 05, 10에서 검증)
- forbidden imports 0건 (`scripts/check-domain-purity.js` 통합)
- regex injection prevention (kebab-case 정확한 정의)

---

## 6. Implementation Order (Phase 4 Do)

Plan §6 패턴 따름. 8 steps:

1. `lib/domain/sprint/entity.js` (220 LOC, JSDoc 풀세트 + factory)
2. `lib/domain/sprint/validators.js` (115 LOC)
3. `lib/domain/sprint/events.js` (120 LOC)
4. `lib/domain/sprint/index.js` (50 LOC barrel)
5. `lib/application/sprint-lifecycle/phases.js` (85 LOC, PDCA 패턴 정합)
6. `lib/application/sprint-lifecycle/transitions.js` (75 LOC, PDCA 패턴 정합)
7. `lib/application/sprint-lifecycle/index.js` (45 LOC barrel)
8. `node scripts/check-domain-purity.js` 직접 실행 검증 (Exit 0)

---

## 7. Architecture Compliance

| Compliance | 검증 방법 | Pass 기준 |
|----------|---------|----------|
| ADR 0005 (Application Pilot) | 정성 review | phases/transitions이 lib/application/sprint-lifecycle/에 위치 ✓ |
| ADR 0007 (Sprint as Meta Container) | 정성 review | Sprint > Feature > Task 3-tier 보존 ✓ |
| ADR 0008 (Sprint Phase Enum) | TC-L1-01,02,05 | 8-phase frozen + transitions adjacency 정확 |
| ADR 0009 (Auto-run + Trust scope) | (Sprint 2-3에서 검증) | entity schema v1.1 (autoRun + autoPause field 포함) |
| Clean Architecture 4-Layer | scripts/check-domain-purity.js | lib/domain/sprint/ 4 files 0 forbidden imports |
| ADR 0005 invariant (PDCA 9-phase 변경 X) | git diff lib/application/pdca-lifecycle/ | 변경 0건 |

---

## 8. Convention Compliance

| Convention | Pass 기준 |
|----------|----------|
| Code/comments English | 7 files 모두 영문 ✓ |
| @version 2.1.13 stamp | 모든 file header에 ✓ |
| @module path | `lib/...` 형식 ✓ |
| @since 2.1.13 | 모든 신규 file ✓ |
| Header comment 패턴 | PDCA pattern 정합 (Design Ref + ADR Ref + Pure 명시) ✓ |
| Object.freeze 깊이 적용 | nested array도 Object.freeze ✓ |
| `{ ok, reason }` 패턴 | validators.js composite + transitions.js canTransitionSprint ✓ |
| JSDoc @typedef 풀세트 | entity.js 12 @typedef ✓ |
| Pure domain comment | "Pure domain module — no FS access" 명시 ✓ |
| 영문 변수명 | camelCase + UPPER_SNAKE ✓ |

---

## 9. Design 완료 Checklist

- [x] Context Anchor 복사 (PRD/Plan §0)
- [x] **코드베이스 깊이 분석** — 6 reference files (PDCA 3 + Domain 3) file:line 인용
- [x] Architecture Options 3 비교 (Option B Pragmatic Balance 권장)
- [x] Module Dependency Graph 정확한 그림
- [x] 7 Files 정확한 구현 spec (전체 code 인용)
- [x] LOC 정정 (250 → ~710)
- [x] §8 Test Plan Matrix 5-Layer (L1 13 TC 명시)
- [x] Implementation Order 8 steps
- [x] Architecture Compliance 6건 (ADR 0005/0007/0008/0009 + Clean Arch + invariant)
- [x] Convention Compliance 10건 (English / @version / Object.freeze / JSDoc / Pure ...)

---

**Next Phase**: Phase 4 Do — 위 spec 그대로 7 files 구현 + scripts/check-domain-purity.js 검증.
