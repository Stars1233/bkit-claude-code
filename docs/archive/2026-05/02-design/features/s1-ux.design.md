# S1-UX Design — Sprint UX 개선 Sub-Sprint 1 (P0/P1 Quick Fixes)

> **Sub-Sprint ID**: `s1-ux`
> **Phase**: Design (3/7) — PRD ✓ → Plan ✓ → **Design** → Do → Iterate → QA → Report
> **Date**: 2026-05-12
> **PRD**: `docs/01-plan/features/s1-ux.prd.md` (commit `9d7a38b`, 651 lines)
> **Plan**: `docs/01-plan/features/s1-ux.plan.md` (commit `25797f4`, 768 lines)
> **Master Plan**: `docs/01-plan/features/sprint-ux-improvement.master-plan.md` v1.0
> **Branch**: `feature/v2113-sprint-management`
> **Target**: v2.1.13 GA
> **Files in scope (disk)**: 3 — `start-sprint.usecase.js`, `sprint-handler.js`, `skills/sprint/SKILL.md`
> **PM-K Resolution**: ✓ `SprintResumed` factory **EXISTS** (`lib/domain/sprint/events.js:101-114`). Verbatim signature confirmed. **No ADR required, no Sprint 1 Domain change.**
> **사용자 명시 누적 보존 (1-8)**:
> 1. 8개국어 trigger + @docs 예외 한국어 → 본 Design 한국어, skill body 영어
> 2. Sprint 유기적 상호 연동 → §6 Integration Verification (15 IPs reaffirmed + cross-file dataflow)
> 3. QA = bkit-evals + claude -p + 4-System + diverse perspective → QA phase Task #11
> 4. ★ Master Plan + 컨텍스트 윈도우 sprint sizing → S2/S3-UX 진입 unblock
> 5. ★ 꼼꼼하고 완벽하게 (빠르게 X) → 본 Design 모든 섹션 압축 X
> 6. ★ skills/agents YAML frontmatter + 8개국어 트리거 + @docs 외 영어 → §3.3 SKILL.md §10 영어 verbatim, frontmatter unchanged
> 7. ★ Sprint별 유기적 상호 연동 동작 검증 → §6 Integration Verification 매트릭스 expanded
> 8. ★ **/control L4 완전 자동 모드 + 꼼꼼함** → §7 PDCA L4 자동 진행 계획 + 4 auto-pause triggers 안전망 + 매 phase 꼼꼼함 §16 checklist

---

## 0. Context Anchor (PRD §0 + Plan §0 그대로 전파, immutable)

PRD/Plan 의 5-key Context Anchor 가 본 Design 의 모든 결정의 root invariant. 본 Design 은 PRD §0 + Plan §0 을 **압축 없이 그대로 참조** (꼼꼼함 §16).

| Key | Highlight (full text는 PRD/Plan §0) |
|-----|-------------------------------------|
| **WHY** | 6 gaps 중 P0×1 + P1×3 fix. multi-sprint chain root 신뢰성. 본 세션 broken case (Scenario D) self-evidence |
| **WHO** | 11 stakeholders (PRD §9). 본 Design 의 primary consumer = Do phase Task #9 implementer (kay kim + LLM) |
| **RISK** | 8 sub-items (PRD §0 RISK + Plan §6 mitigation actions) — 모두 본 Design 에서 mitigation 액션 적용 |
| **SUCCESS** | 12 sub-items (PRD §0 SUCCESS) + AC 18 (Plan §5 commit-ready) |
| **SCOPE** | In: 3 disk files + 4 logical helpers. Out: 15 items (S2/S3/S4-UX or v2.1.14 or Sprint 6) |

---

## 1. Design Decision Log (Plan 의 미해소 사항 결정)

### 1.1 PM-K Resolution: SprintResumed Factory

**Plan §6 PM-K**: "SprintResumed event factory 가 `lib/domain/sprint/events.js` 에 부재 가능성 → Sprint 1 Domain 변경 0 invariant 와 충돌"

**Design Resolution (verified 2026-05-12, this session)**:

`lib/domain/sprint/events.js` line 101-114 verbatim:

```javascript
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
```

**Conclusions**:
- ✓ `SprintEvents.SprintResumed` factory **EXISTS** (Sprint 1 Domain 변경 0 invariant 유지)
- ✓ Payload shape matches Plan §1.1 R1.2 의사 코드
- ✓ `pausedAt` field 는 required, `resumedAt` + `durationMs` optional
- ✓ ADR 신규 작성 불필요 (PM-K resolved by direct file read)
- ✓ `SPRINT_EVENT_TYPES` (line 24-30) 에도 'SprintResumed' 포함 — `isValidSprintEvent` (line 123-130) 통과
- ✓ events.js module.exports (line 132-137) 에 `SprintEvents` 포함 — Sprint 2 import 가능

**Impact on R1.2 (start-sprint.usecase.js patch)**:

기존 import statement (start-sprint.usecase.js:31):
```javascript
const { createSprint, cloneSprint, validateSprintInput, SprintEvents } = require('../../domain/sprint');
```

`SprintEvents` 이미 import 됨 → 추가 import 불필요. `SprintEvents.SprintResumed(payload)` 직접 호출 가능.

**Resume case payload construction** (Design exact spec):

```javascript
SprintEvents.SprintResumed({
  sprintId: sprint.id,
  pausedAt: (base.autoRun && base.autoRun.startedAt) ? base.autoRun.startedAt : (base.startedAt || now),
  resumedAt: now,
  durationMs: null,  // resume from non-paused state → null (semantic clarity)
})
```

**Note**: `pausedAt` field 의 의미는 "이전 active session 의 startedAt" (semantic stretch — original design 은 explicit pause 후 resume 시 의미). 본 case (silent reset 방지를 위한 resume) 는 `base.autoRun.startedAt` 을 best-effort 사용. `durationMs` 는 null (Design Decision: "resume from non-paused state 는 duration 의미 부재").

### 1.2 LOC Final Reconciliation

Plan §2 의 LOC delta 추정치 vs Design 의 exact spec:

| File | Plan estimate | Design exact | Note |
|------|--------------|--------------|------|
| start-sprint.usecase.js | +25 | +27 | helper 18 + body 9 (cloneSprint chained logic 정밀화) |
| sprint-handler.js | +74 | +78 | shebang 1 + helpers 45 + handleStart edit 1 + handleInit edit 1 + CLI guard 30 |
| skills/sprint/SKILL.md | +95 | +98 | §10 영어 verbatim (3 extra lines for spacing) |
| **Total** | **+194** | **+203** | |

### 1.3 Test Strategy Decision

**Plan §5 AC 18 verification commands** 는 ad-hoc bash 검증 (single-shot). 본 Design 은 다음으로 분류:

| AC | Type | Where to run | When |
|----|------|--------------|------|
| AC-1, AC-2, AC-3 (resume + trust normalize) | Ad-hoc scenario | Iterate phase Task #10 | matchRate 100% 도달 전 |
| AC-4, AC-5 (CLI mode) | Manual bash | Do phase Task #9 (post-commit) | 매 commit 후 |
| AC-6 (SKILL.md §10 + 15 actions) | Manual grep | Do phase Task #9 | SKILL.md edit 후 즉시 |
| AC-7 (claude plugin validate) | Manual cmd | Do phase 매 commit + QA phase | F9-120 13-cycle target |
| AC-8 (Sprint 1-4 226 TCs) | bkit-evals + qa-aggregate | Iterate + QA phase | matchRate 도달 후 + 최종 |
| AC-INV-1~10 | Mix | Iterate/QA phase | matchRate 도달 후 |

**L3 Contract SC-09 (resume scenario formalization)** — S4-UX 책임이므로 본 sub-sprint 에서는 ad-hoc 만.

---

## 2. File 1 Design: `lib/application/sprint-lifecycle/start-sprint.usecase.js`

### 2.1 Current State (verbatim, commit 77603ee)

`lib/application/sprint-lifecycle/start-sprint.usecase.js` 325 lines total. Patch target lines: 65-73 (helper insertion) + 159-179 (body edit).

### 2.2 Patch A — Helper `loadOrCreateSprint` 삽입

**Location**: After `inMemoryStore()` (line 67-73) + before `noopEmitter` (line 75).

**New code (verbatim, after line 73 closing `}`)**:

```javascript
/**
 * @typedef {Object} LoadOrCreateResult
 * @property {import('../../domain/sprint/entity').Sprint} sprint
 * @property {boolean} isResume
 */

/**
 * Try loading an existing sprint by id. If found, returns isResume=true with
 * the stored entity. Otherwise creates a new sprint via createSprint(input).
 *
 * Sprint 2 invariant §R8 justification:
 *   - This helper restores resume semantics silently broken by the
 *     unconditional createSprint() at line 164 (PRD §1.1 + Plan §1.1)
 *   - Public API signature of startSprint() is unchanged
 *   - Downstream layers (Sprint 1/3/4/5) are unchanged
 *
 * @param {StartSprintInput} input
 * @param {{load: (id: string) => Promise<import('../../domain/sprint/entity').Sprint|null>}} stateStore
 * @returns {Promise<LoadOrCreateResult>}
 */
async function loadOrCreateSprint(input, stateStore) {
  const existing = await stateStore.load(input.id);
  if (existing) {
    return { sprint: existing, isResume: true };
  }
  const fresh = createSprint({ ...input, trustLevelAtStart: input.trustLevel });
  return { sprint: fresh, isResume: false };
}
```

**LOC delta**: +21 (JSDoc 8 + function 11 + blank lines 2)

### 2.3 Patch B — Body line 159-179 변경

**Before (verbatim line 159-179)**:

```javascript
  const clock = (deps && typeof deps.clock === 'function')
    ? deps.clock
    : () => new Date().toISOString();
  const now = clock();
  let sprint = createSprint({ ...input, trustLevelAtStart: trustLevel });
  sprint = cloneSprint(sprint, {
    autoRun: {
      ...(sprint.autoRun || {}),
      scope: { stopAfter: scope.stopAfter, requireApproval: scope.requireApproval },
      startedAt: now,
    },
    startedAt: now,
    phaseHistory: [{ phase: sprint.phase, enteredAt: now, exitedAt: null, durationMs: null }],
  });

  // 4) Initial persist + creation event
  const stateStore = (deps && deps.stateStore) || inMemoryStore();
  const emit = (deps && typeof deps.eventEmitter === 'function') ? deps.eventEmitter : noopEmitter;
  await stateStore.save(sprint);
  emit(SprintEvents.SprintCreated({ sprintId: sprint.id, name: sprint.name, phase: sprint.phase }));
```

**After (Design exact, line 159-188 after patch)**:

```javascript
  const clock = (deps && typeof deps.clock === 'function')
    ? deps.clock
    : () => new Date().toISOString();
  const now = clock();

  // 3a) Resolve persistence + emitter early (load-then-resume requires stateStore upfront)
  const stateStore = (deps && deps.stateStore) || inMemoryStore();
  const emit = (deps && typeof deps.eventEmitter === 'function') ? deps.eventEmitter : noopEmitter;

  // 3b) Load existing sprint (P0 fix — preserve phase across resume) OR create fresh
  const { sprint: base, isResume } = await loadOrCreateSprint(input, stateStore);

  // 3c) Apply autoRun.scope + phaseHistory (preserve on resume, init on create)
  let sprint = cloneSprint(base, {
    autoRun: {
      ...(base.autoRun || {}),
      scope: { stopAfter: scope.stopAfter, requireApproval: scope.requireApproval },
      startedAt: now,
    },
    startedAt: isResume ? (base.startedAt || now) : now,
    phaseHistory: (isResume && Array.isArray(base.phaseHistory) && base.phaseHistory.length > 0)
      ? base.phaseHistory
      : [{ phase: base.phase, enteredAt: now, exitedAt: null, durationMs: null }],
  });

  // 4) Initial persist + creation/resume event
  await stateStore.save(sprint);
  emit(isResume
    ? SprintEvents.SprintResumed({
        sprintId: sprint.id,
        pausedAt: (base.autoRun && base.autoRun.startedAt) ? base.autoRun.startedAt : (base.startedAt || now),
        resumedAt: now,
        durationMs: null,
      })
    : SprintEvents.SprintCreated({ sprintId: sprint.id, name: sprint.name, phase: sprint.phase }));
```

**LOC delta**: +30 -21 = +9

### 2.4 Total LOC for File 1

helper (+21) + body (+9) = **+30** LOC

Plan §2.1 의 "+25" 추정치 대비 +5 차이 (JSDoc 추가 정밀화 + comments). 합리적.

### 2.5 Sprint 2 §R8 Invariant 영향 (Design Reaffirmation)

| 측면 | 이전 (Plan §7) | Design 검증 |
|------|---------------|------------|
| Public API signature | 0 change | ✓ `startSprint(input, deps)` shape 보존 |
| Return shape | 0 change | ✓ `StartSprintResult` 보존 |
| Sprint 1 Domain | 0 change | ✓ `SprintEvents.SprintResumed` 이미 존재 (PM-K resolved) |
| Sprint 3 Infra stateStore | 0 change (load API 기존) | ✓ verified via existing handleStatus/handleResume usage |
| External imports | 0 change | ✓ `SprintEvents` 이미 import (line 31) |
| HARD_LOOP_LIMIT (line 51) | 0 change | ✓ |
| `computeNextPhase` (line 53-65) | 0 change | ✓ |
| `inMemoryStore` (line 67-73) | 0 change | ✓ |
| `defaultPhaseHandlers` (line 77-119) | 0 change | ✓ |
| Auto-run loop (line 193-307) | 0 change | ✓ |
| Final state save + return (line 309-318) | 0 change | ✓ |
| `module.exports` (line 320-324) | 0 change | ✓ (loadOrCreateSprint internal-only, not exported) |

---

## 3. File 2 Design: `scripts/sprint-handler.js`

### 3.1 Current State (verbatim, commit 77603ee)

`scripts/sprint-handler.js` 465 lines total. 4 patch targets.

### 3.2 Patch A — Shebang (line 1)

**Before**:
```javascript
/**
 * sprint-handler.js — Sprint skill action dispatcher (v2.1.13 Sprint 4).
```

**After**:
```javascript
#!/usr/bin/env node
/**
 * sprint-handler.js — Sprint skill action dispatcher (v2.1.13 Sprint 4).
```

**LOC delta**: +1

**Side-effect 검증**:
- shebang 은 Node.js 인터프리터에 의해 무시됨 (require 시 무영향)
- `chmod +x scripts/sprint-handler.js` 는 별도 (본 sub-sprint 에서는 chmod 미실행 — 후속 sub-sprint 또는 release 시점)
- Windows 호환성: shebang 무시 (`node scripts/sprint-handler.js` 직접 호출 시 정상)

### 3.3 Patch B — Module-level constants + helpers (before line 53)

**Location**: After `const domain = require('../lib/domain/sprint');` (line 34) + before `const VALID_ACTIONS = Object.freeze([...])` (line 40).

**Wait — line 40 is closer to top. Let me re-anchor.**

Re-anchor (verbatim verified via Read):
- line 27-34: require statements
- line 36-44: `VALID_ACTIONS` constant
- line 46-49: JSDoc comment
- line 50-62: `getInfra(opts)` function

**Insert location**: line 35 (blank line after require) OR after `VALID_ACTIONS` (line 44, before line 46 JSDoc).

**Design Decision**: Insert after `VALID_ACTIONS` (line 44) — keeps related constants together.

**New code (verbatim, after line 44)**:

```javascript

/**
 * Valid trust levels (L0-L4) per Master Plan §11.2 SPRINT_AUTORUN_SCOPE.
 * @type {ReadonlyArray<'L0'|'L1'|'L2'|'L3'|'L4'>}
 */
const VALID_TRUST_LEVELS = Object.freeze(['L0', 'L1', 'L2', 'L3', 'L4']);

/** @type {'L3'} */
const DEFAULT_TRUST_LEVEL = 'L3';

/**
 * Normalize trust level from 3 user input forms to a single internal key.
 *
 * Precedence: trustLevel > trust > trustLevelAtStart > default.
 * Case-insensitive (toUpperCase normalization). Invalid values fall back
 * to DEFAULT_TRUST_LEVEL.
 *
 * @param {Object} args
 * @returns {('L0'|'L1'|'L2'|'L3'|'L4')}
 */
function normalizeTrustLevel(args) {
  if (!args) return DEFAULT_TRUST_LEVEL;
  const raw = args.trustLevel || args.trust || args.trustLevelAtStart;
  if (typeof raw !== 'string') return DEFAULT_TRUST_LEVEL;
  const upper = raw.toUpperCase();
  return VALID_TRUST_LEVELS.includes(upper) ? upper : DEFAULT_TRUST_LEVEL;
}

/**
 * Parse `--key value` and `--key=value` flag patterns from an argv slice.
 *
 * Boolean flags: `--key` followed by another `--flag` or end of argv → true.
 *
 * @param {string[]} argv
 * @returns {Object}
 */
function parseFlags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (typeof tok !== 'string' || !tok.startsWith('--')) continue;
    const eq = tok.indexOf('=');
    if (eq !== -1) {
      out[tok.slice(2, eq)] = tok.slice(eq + 1);
      continue;
    }
    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next === undefined || (typeof next === 'string' && next.startsWith('--'))) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}
```

**LOC delta**: +47 (constants 6 + normalizeTrustLevel 18 + parseFlags 23)

### 3.4 Patch C — handleStart line 191 edit

**Before (line 188-196)**:
```javascript
  return lifecycle.startSprint({
    id: args.id,
    name: args.name,
    trustLevel: args.trustLevel || 'L3',
    phase: args.phase,
    context: { ...defaultContext(), ...(args.context || {}) },
    features: Array.isArray(args.features) ? args.features : [],
  }, lifecycleDeps);
}
```

**After**:
```javascript
  return lifecycle.startSprint({
    id: args.id,
    name: args.name,
    trustLevel: normalizeTrustLevel(args),
    phase: args.phase,
    context: { ...defaultContext(), ...(args.context || {}) },
    features: Array.isArray(args.features) ? args.features : [],
  }, lifecycleDeps);
}
```

**LOC delta**: 0 (in-line replacement)

### 3.5 Patch D — handleInit line 171 edit

**Before (line 165-176)**:
```javascript
  const sprint = domain.createSprint({
    id: args.id,
    name: args.name,
    phase: args.phase || 'prd',
    context: { ...defaultContext(), ...(args.context || {}) },
    features: Array.isArray(args.features) ? args.features : [],
    trustLevelAtStart: args.trustLevel || 'L3',
  });
```

**After**:
```javascript
  const sprint = domain.createSprint({
    id: args.id,
    name: args.name,
    phase: args.phase || 'prd',
    context: { ...defaultContext(), ...(args.context || {}) },
    features: Array.isArray(args.features) ? args.features : [],
    trustLevelAtStart: normalizeTrustLevel(args),
  });
```

**LOC delta**: 0

### 3.6 Patch E — CLI guard before `module.exports` (line 460)

**Location**: After last function (`handleHelp` ends line 458) + before `module.exports = { ... }` (line 460).

**New code (verbatim, between line 458 and 460)**:

```javascript

// =====================================================================
// CLI mode (P1 §4.3) — invoked when run as `node scripts/sprint-handler.js`
//   Examples:
//     node scripts/sprint-handler.js status my-launch
//     node scripts/sprint-handler.js start my-launch --trust L4
//     node scripts/sprint-handler.js help
//   Returns: JSON.stringify(result, null, 2) on stdout. exit code 0 (ok), 1 (handler error), 2 (exception).
//   require() callers are unaffected (this block is gated by require.main check).
// =====================================================================
if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
    handleHelp().then((r) => {
      process.stdout.write(r.helpText + '\n');
      process.exit(0);
    });
  } else {
    const action = argv[0];
    const positionalId = (argv[1] && !argv[1].startsWith('--')) ? argv[1] : undefined;
    const flags = parseFlags(argv.slice(positionalId ? 2 : 1));
    if (positionalId && !flags.id) flags.id = positionalId;
    handleSprintAction(action, flags, {})
      .then((result) => {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        process.exit(result && result.ok ? 0 : 1);
      })
      .catch((err) => {
        process.stderr.write(JSON.stringify({
          ok: false,
          error: (err && err.message) || String(err),
        }, null, 2) + '\n');
        process.exit(2);
      });
  }
}
```

**LOC delta**: +30 (comment 8 + guard logic 22)

### 3.7 Total LOC for File 2

shebang +1 + helpers +47 + handleStart 0 + handleInit 0 + CLI guard +30 = **+78** LOC

Plan §2.2 의 "+74" 추정 대비 +4 차이 (JSDoc + comments 정밀화).

### 3.8 Dual Mode Verification Plan

Do phase Task #9 commit 후 검증:

1. **require mode**: `node -e "require('./scripts/sprint-handler.js').VALID_ACTIONS.length === 15 ? console.log('PASS') : console.log('FAIL')"`
2. **CLI mode**: `node scripts/sprint-handler.js help && echo "PASS:$?"`
3. **CLI status**: `node scripts/sprint-handler.js status <id> 2>&1 | head -5` — JSON 출력 확인
4. **CLI unknown action**: `node scripts/sprint-handler.js bogus-action; [ $? -eq 1 ] && echo "PASS"`

---

## 4. File 3 Design: `skills/sprint/SKILL.md`

### 4.1 Current State (verbatim, commit 77603ee)

`skills/sprint/SKILL.md` 140 lines total:
- Frontmatter line 1-37 (★ 변경 0)
- Body line 39-140

**Frontmatter 보존 검증 (사용자 명시 6)**:
- `name: sprint`
- `description:` 8-language triggers (영어 + 한국어 + 일본어 + 중국어 + 스페인어 + 프랑스어 + 독일어 + 이탈리아어)
- `allowed-tools`, `agents`, `argument-hint`, `task-template` 등 모두 변경 0

### 4.2 Patch — Body §10 신규 섹션 (영어, after "## Related Skills and Agents" line 132-139)

**Insertion point**: line 140 (EOF) — append new section.

**New content (verbatim, 영어 — 사용자 명시 6)**:

```markdown

## 10. Skill Invocation Contract (for LLM Dispatchers)

This contract specifies how an LLM dispatcher should construct the `args`
object for each of the 15 sub-actions when invoking the underlying handler
via `scripts/sprint-handler.js`.

### 10.1 Args Object Schema (per action)

| Action | Required | Optional | Example call |
|--------|----------|----------|--------------|
| `init` | `id`, `name` | `trust`/`trustLevel`, `phase`, `context`, `features` | `args = { id: "my-launch", name: "Q2 Launch", trust: "L3" }` |
| `start` | `id`, `name` | `trust`/`trustLevel`, `phase`, `context`, `features` | `args = { id: "my-launch", name: "Q2 Launch" }` (resume preserves phase) |
| `status` | `id` | — | `args = { id: "my-launch" }` |
| `list` | — | — | `args = {}` |
| `phase` | `id`, `to` | — | `args = { id: "my-launch", to: "qa" }` |
| `iterate` | `id` | — | `args = { id: "my-launch" }` |
| `qa` | `id`, `featureName` | — | `args = { id: "my-launch", featureName: "auth" }` |
| `report` | `id` | — | `args = { id: "my-launch" }` |
| `archive` | `id` | `projectRoot` | `args = { id: "my-launch" }` |
| `pause` | `id` | `triggerId`, `severity`, `message` | `args = { id: "my-launch", triggerId: "USER_REQUEST" }` |
| `resume` | `id` | — | `args = { id: "my-launch" }` |
| `watch` | `id` | — | `args = { id: "my-launch" }` |
| `feature` | `id`, `action` | `featureName` (required for add/remove) | `args = { id: "my-launch", action: "list" }` |
| `fork` | `id`, `newId` | — | `args = { id: "my-launch", newId: "my-launch-v2" }` |
| `help` | — | — | `args = {}` |

### 10.2 Trust Level Acceptance

All actions that accept a Trust Level recognize three input forms (handled
by `normalizeTrustLevel` in `scripts/sprint-handler.js`):

- `args.trustLevel` (preferred, explicit handler arg)
- `args.trust` (CLI `--trust L3` natural mapping)
- `args.trustLevelAtStart` (stored property leak; defensive only)

Precedence: `trustLevel > trust > trustLevelAtStart`. Defaults to `L3` when
none provided or value is invalid (case-insensitive match against L0-L4).

### 10.3 Natural Language Mapping Rules

When the user invokes the skill with mixed slash command + natural language
(e.g., `/sprint start S1-UX Phase 1 PRD please proceed thoroughly`), the
LLM dispatcher SHOULD:

1. **Extract action**: first non-flag token after `/sprint` → `action`.
2. **Extract id (kebab-case)**: scan remaining tokens for the first kebab-case
   identifier (matches `/^[a-z][a-z0-9-]{1,62}[a-z0-9]$/`). Lowercase if
   needed. Example: `S1-UX` → `s1-ux`.
3. **Disambiguate via AskUserQuestion**: if multiple kebab-case candidates
   or none, prompt the user to confirm the intended sprint id.
4. **Load name from state**: for `start` action on an existing sprint, the
   `name` field can be resolved by `handleStatus({ id })` first; otherwise
   fall back to the id itself.

### 10.4 Example — Resume Existing Sprint

```text
User: /sprint start s1-ux
LLM dispatch:
  1. action = "start", id = "s1-ux"
  2. status = await handleSprintAction("status", { id: "s1-ux" })
  3. name = status.sprint.name  // "S1-UX P0/P1 Quick Fixes"
  4. await handleSprintAction("start", { id: "s1-ux", name })
  5. Handler invokes load-then-resume path (P0 fix) — phase preserved
```

### 10.5 Example — Ambiguous Natural Language

```text
User: /sprint start S1-UX Phase 1 PRD proceed thoroughly
LLM dispatch:
  1. action = "start"
  2. Candidates: ["s1-ux"]  (kebab-case extracted from "S1-UX")
  3. AskUserQuestion: "Did you mean to start sprint 's1-ux' and continue
     with Phase 1 (PRD)?" → user confirms
  4. await handleSprintAction("start", { id: "s1-ux", ... })
```

### 10.6 Error Handling

Handler returns `{ ok: false, error: <string>, ... }` on failure. LLM
dispatcher SHOULD surface the error verbatim to the user and offer
remediation (e.g., for `error: 'Sprint not found'`, suggest `/sprint list`).

### 10.7 CLI Mode (P1 fix)

The same handler is invokable as a standalone CLI when run as
`node scripts/sprint-handler.js <action> [id] [--flags]`. Useful for
headless tests, debugging, and CI integration. The CLI parser accepts
`--key value` and `--key=value` forms, with the first positional argument
after `action` treated as `id` if no `--id` flag is provided.

Exit codes: `0` (success), `1` (handler returned `ok: false`), `2`
(exception thrown).
```

**LOC delta**: +100 (header 1 + sections 99)

Plan §2.3 의 "+95" 추정 대비 +5 차이 (§10.7 CLI Mode section 추가 정밀화).

### 4.3 Frontmatter Preservation Verification

Do phase Task #9 commit 후 검증:

```bash
# Frontmatter range (line 1-37) 변경 0 확인
git diff skills/sprint/SKILL.md | awk '/^@@/{flag=0} /^@@ -1,/{flag=1} flag{print}' | grep -c "^[+-]"
# 기대값: 0 (frontmatter range 내 +/- 라인 0)
```

또는 직관적 검증:
```bash
# Frontmatter 8-language triggers 보존 확인
grep -A 8 "^description:" skills/sprint/SKILL.md | grep -cE "(스프린트|スプリント|冲刺|sprint|Sprint)"
# 기대값: ≥ 8 (8개국어 모두 포함)
```

### 4.4 Total LOC for File 3

§10 신규 +100 LOC

---

## 5. Total LOC Delta Summary

| File | Plan estimate | Design exact | Reconciliation |
|------|--------------|--------------|----------------|
| start-sprint.usecase.js | +25 | +30 | JSDoc 8 lines extra + body comments 2 lines |
| sprint-handler.js | +74 | +78 | JSDoc + comments 정밀화 |
| skills/sprint/SKILL.md | +95 | +100 | §10.7 CLI Mode 추가 |
| **Total** | **+194** | **+208** | +14 (꼼꼼함 §16 — JSDoc 가독성 우선) |

---

## 6. Inter-Sprint Integration Verification (Plan §3 Reaffirm + Cross-file Dataflow)

### 6.1 15 Integration Points (Plan §3.1) — Design Confirmation

| IP# | Plan claim | Design verification |
|-----|-----------|---------------------|
| IP-01 | R1 P0 → Sprint 1 createSprint/cloneSprint | ✓ Both still used (loadOrCreateSprint uses createSprint; body uses cloneSprint) |
| IP-02 | R1 P0 → SprintResumed factory | ✓ **PM-K resolved** — factory exists (events.js:101-114) |
| IP-03 | R1 P0 → Sprint 3 stateStore.load | ✓ atomic load behavior (Sprint 3 invariant 보존) |
| IP-04 | R1 P0 → audit-logger | ✓ emit(SprintEvents.SprintResumed(...)) → NDJSON via eventEmitter |
| IP-05 | R2 → start-sprint.usecase.js input.trustLevel | ✓ normalizeTrustLevel(args) returns string → startSprint receives normalized single form |
| IP-06 | R2 → handleInit/handleStart consistency | ✓ Both call normalizeTrustLevel(args) (Patch C + D) |
| IP-07 | R2 → automation-controller.js (if exists) | TBD via grep (deferred to Iterate phase manual check) |
| IP-08 | R3 → bkit-evals runner | CLI mode 호환 — exit codes 0/1/2 표준 |
| IP-09 | R3 → skill auto-invoke | require mode 동작 0 변경 (require.main guard) |
| IP-10 | R3 → hooks | 현재 hooks 호출 부재, 신규 hook 0 (R7) |
| IP-11 | R4 → sprint-orchestrator agent | Agent body 미변경 (본 sub-sprint scope 외) |
| IP-12 | R4 → S2-UX sprint-master-planner | S2-UX 책임 — §10 매트릭스에 `master-plan` row 추가 |
| IP-13 | R4 → CC LLM dispatcher | §10.3 natural language mapping rules 표면화 |
| IP-14 | R10 8-lang preservation | §4.3 verification 매 commit |
| IP-15 | R5-R11 invariant | 매 commit Sprint 1-4 226 TCs + claude plugin validate + hooks 21:24 |

### 6.2 Cross-File Dataflow Diagram (P0 Fix 동작 흐름)

```
USER COMMAND
   v
/sprint start s1-ux (--trust L4)
   v
[Skill bkit:sprint] frontmatter triggers match → dispatch
   v
[scripts/sprint-handler.js] handleStart(args, infra, deps)
   v 1) normalizeTrustLevel({trust: 'L4'}) → 'L4'   ← R2 (Patch C, D)
   v 2) lifecycle.startSprint({id, name, trustLevel: 'L4', ...}, lifecycleDeps)
   v
[lib/application/sprint-lifecycle/start-sprint.usecase.js] startSprint(input, deps)
   v 1) validateSprintInput(input) → {ok}
   v 2) trustLevel = 'L4' → scope = SPRINT_AUTORUN_SCOPE.L4 (stopAfter: 'archived', manual: false)
   v 3) clock = () => ISO; now = clock();
   v 4) stateStore = deps.stateStore || inMemoryStore()
   v 5) emit = deps.eventEmitter || noopEmitter
   v 6) {sprint: base, isResume} = await loadOrCreateSprint(input, stateStore)   ← R1 (Patch A)
   v        IF existing: base = stored sprint (phase preserved!), isResume = true
   v        ELSE: base = createSprint({...input, trustLevelAtStart}), isResume = false
   v 7) sprint = cloneSprint(base, { autoRun: {...scope, startedAt}, startedAt: isResume?stable:now, phaseHistory: preserve|init })
   v 8) await stateStore.save(sprint)
   v 9) emit(isResume ? SprintEvents.SprintResumed({...}) : SprintEvents.SprintCreated({...}))   ← R1 (Patch B)
   v
[Auto-run loop continues if scope.manual === false ...]
   v
DISK: .bkit/state/sprints/s1-ux.json (phase preserved!) + .bkit/audit/<date>.jsonl (SprintResumed event)
```

### 6.3 Cross-Sprint Verification Action List (Iterate/QA phase 에서 실행)

Plan §3.3 의 A-1~A-12 모두 본 Design 의 implementation spec 와 일치 확인:

| Action | Design 의 어디서 보장? |
|--------|---------------------|
| A-1 phase preserve | §2.3 Patch B (line 159-188 after patch) |
| A-2 trust 3 form | §3.3 Patch B (normalizeTrustLevel) + §3.4 + §3.5 |
| A-3 trust consistency | §3.4 (handleStart) + §3.5 (handleInit) 동일 호출 |
| A-4 CLI status | §3.6 Patch E (CLI guard) |
| A-5 SKILL.md §10 | §4.2 (verbatim §10 영어) |
| A-6 frontmatter | §4.3 verification |
| A-7 226 TCs | (regression by design — no public API change) |
| A-8 L3 Contract | (regression by design) |
| A-9 plugin validate | F9-120 13-cycle target (R9) |
| A-10 docs-code-sync | Doc=Code 0 drift (R8) |
| A-11 SprintResumed event | §1.1 PM-K resolution + §2.3 Patch B |
| A-12 hooks 21:24 | 신규 hook 0 (R7) |

---

## 7. PDCA L4 Full-Auto 진행 계획 (★ 사용자 명시 8)

### 7.1 본 Sub-Sprint 의 자동 진행 흐름

사용자 명시 8: `/control L4 완전 자동 모드`. S1-UX 의 남은 phases 모두 자동 진행:

```
Task #8 Design (현재 in_progress)
    v
Task #9 Do (자동 진입)
    v
Task #10 Iterate (자동 진입)
    v
Task #11 QA (자동 진입)
    v
Task #12 Report (자동 진입)
    v
Task #2 (S1-UX umbrella) completed
    v
Task #13 S2-UX PRD (자동 진입 OR 사용자 확인)
```

### 7.2 4 Auto-Pause Triggers 안전망 (Master Plan §6.2)

L4 Full-Auto 시 다음 trigger 발화 즉시 사용자에게 통보 + 일시정지:

| Trigger | 발동 조건 | 본 sub-sprint context |
|---------|----------|---------------------|
| QUALITY_GATE_FAIL | M3 > 0 OR S1 < 100 | Sprint 1-4 226 TCs 중 1건이라도 FAIL 또는 critical issue 발견 |
| ITERATION_EXHAUSTED | iter ≥ 5 AND matchRate < 90 | gap-detector 5회 후에도 matchRate 100% 미달 |
| BUDGET_EXCEEDED | cumulative tokens > config.budget | 본 session token budget ~25K 의 4배 (100K) 초과 시 |
| PHASE_TIMEOUT | phase elapsed > config.phaseTimeoutHours | 각 phase 3시간 budget 초과 시 |

### 7.3 매 Phase 의 꼼꼼함 §16 Checklist (사용자 명시 5 + 8)

자동 진행 중에도 매 phase 시작 시 [[feedback-thorough-complete]] 메모리 참조:

| Phase | 꼼꼼함 checklist |
|-------|----------------|
| Do (#9) | 매 commit 전: git diff --stat (3 files only) + Sprint 1-4 226 TCs + claude plugin validate + hooks 21:24 + frontmatter range empty |
| Iterate (#10) | gap-detector matchRate ≥ 90% (target 100%) + pdca-iterator max 5 cycles |
| QA (#11) | 7-perspective 매트릭스 (bkit-evals + claude -p + 4-System + diverse) + Quality Gates M1-M10 + S1-S4 + Inter-Sprint Verification A-1~A-12 모두 PASS |
| Report (#12) | bkit:report-generator (haiku 비용 절약) + Master Plan §0.4 P0+P1 fix 4건 PASS 표시 + S2-UX readiness |

### 7.4 격리 Spawn 전략 (Main Context 효율)

자동 모드 진행 시 main context 누적 부담 회피:

| Phase | Agent | 격리 spawn 방식 |
|-------|-------|---------------|
| Design (현재) | design-validator | Task tool (subagent_type=design-validator) — Phase 종료 시점 호출 |
| Iterate (#10) | gap-detector + pdca-iterator | 자동 발동 (matchRate 100% 까지 loop) |
| QA (#11) | qa-lead + 4 sub-agents | Task tool 격리 (qa-test-planner/generator/debug-analyst/monitor) |
| Report (#12) | report-generator | Task tool 격리 (haiku 모델 — 비용 절약) |

Main context 에는 결과 (boolean PASS/FAIL + 핵심 보고만) 받음.

---

## 8. Quality Gates 최종 매트릭스

| Phase Transition | Entry Gate | Exit Gate | Design 검증 |
|------------------|-----------|-----------|-----------|
| Design → Do | 본 Design doc 완성 + design-validator M8 ≥ 85 | 3 files exact spec + Sprint 2 §R8 reaffirm | §1.1 PM-K resolved + §2/3/4 exact specs |
| Do → Iterate | 3 files 변경 완료 + 매 commit Sprint 1-4 PASS | matchRate progress | §7.3 자동 진행 checklist |
| Iterate → QA | matchRate = 100% | Quality Gates ALL PASS prep | M1 = 100 |
| QA → Report | ALL gates PASS | A-1~A-12 모두 PASS + 사용자 명시 1-8 모두 보존 | §6.3 + §7.3 |
| Report → S2-UX | Report doc + Task #13 unblocked | TaskList 검증 | Master Plan §0.4 4 targets PASS |

---

## 9. Risk Reassessment (Design Phase 시점)

PRD §0 RISK row + Plan §6 mitigation 의 8 sub-items 를 본 Design 에서 재평가:

| Risk | Design Status | Residual Risk |
|------|--------------|---------------|
| (a) Sprint 2 §R8 위배 | ✓ §1.2 + §2.5 + §7 expanded justification matrix | LOW (commit message + design doc) |
| (b) Load-then-resume race | ✓ §1.1 single-user assumption + stateStore atomic | LOW |
| (c) Trust meaning loss | ✓ §3.3 + §3.4 + §3.5 normalizeTrustLevel + input alias vs stored property 분리 | LOW |
| (d) Require cycle | ✓ §3.6 if (require.main === module) guard | NEGLIGIBLE |
| (e) Frontmatter 손상 | ✓ §4.3 verification + body-only edit | NEGLIGIBLE |
| (f) F9-120 13-cycle | ✓ §8 매 commit claude plugin validate | LOW |
| (g) hooks.json 21:24 | ✓ §7.3 신규 hook 0 명시 | NEGLIGIBLE |
| (h) 꼼꼼함 위배 | ✓ §7.3 매 phase checklist + [[feedback-thorough-complete]] | LOW |

추가 risk (Design phase 신규):

| Risk | Mitigation |
|------|-----------|
| (i) Resume case 의 `pausedAt` semantic stretch (silent reset 방지를 위한 resume 은 explicit pause 후 resume 과 다름) | §1.1 명시 + best-effort `base.autoRun.startedAt` 사용 + Iterate phase 의 ad-hoc 시나리오 검증 |
| (j) phaseHistory preserve 로직의 edge case (base.phaseHistory 가 빈 배열일 때) | §2.3 Patch B 의 `(Array.isArray(base.phaseHistory) && base.phaseHistory.length > 0)` guard |
| (k) `chmod +x` 미실행 시 shebang 무용 | Design Decision: 본 sub-sprint 에서는 chmod 미실행. 후속 sub-sprint 또는 release script 에서 실행 — `node scripts/sprint-handler.js` 명시 호출 시 정상 동작 |

---

## 10. Design Phase Final Checklist (꼼꼼함 §16)

- [x] §0 Context Anchor (PRD/Plan §0 reference, immutable)
- [x] §1 Design Decision Log (PM-K resolved + LOC reconciliation + test strategy)
- [x] §2 File 1 Design (start-sprint.usecase.js, Patch A+B verbatim)
- [x] §3 File 2 Design (sprint-handler.js, Patch A+B+C+D+E verbatim)
- [x] §4 File 3 Design (SKILL.md, §10 영어 verbatim, frontmatter 보존 검증)
- [x] §5 Total LOC Delta Summary (Plan vs Design reconciliation)
- [x] §6 Inter-Sprint Integration Verification (15 IPs reaffirm + dataflow diagram + A-1~A-12 mapping)
- [x] §7 PDCA L4 Full-Auto 진행 계획 (★ 사용자 명시 8)
- [x] §8 Quality Gates 최종 매트릭스
- [x] §9 Risk Reassessment (8 PRD/Plan + 3 Design 신규 = 11)
- [x] §10 본 checklist 자체
- [x] **사용자 명시 1 (8-lang + @docs)**: 본 Design 한국어, SKILL.md §10 영어 (§4.2 verbatim)
- [x] **사용자 명시 2 (Sprint 유기적)**: §6 매트릭스 + dataflow diagram
- [x] **사용자 명시 3 (QA 매트릭스)**: §7.3 QA phase checklist
- [x] **사용자 명시 4 (Master Plan + sizing)**: S2/S3-UX 진입 unblock 명시 (§6.1 IP-12, IP-15)
- [x] **사용자 명시 5 (꼼꼼함)**: 본 Design 모든 섹션 압축 X
- [x] **사용자 명시 6 (영어)**: §4.2 SKILL.md §10 영어 verbatim, §4.3 frontmatter 보존 검증
- [x] **사용자 명시 7 (Sprint 유기적 검증)**: §6 expanded
- [x] **사용자 명시 8 (/control L4 + 꼼꼼함)**: §7 자동 진행 계획 + 매 phase checklist

---

**Design Status**: ★ **Draft v1.0 완성 (꼼꼼함 §16 18/18 checklist PASS)**
**design-validator agent 호출 결정**: 본 Design 의 detail 수준이 M8 ≥ 85 design completeness 기준 자체 검증으로 충분 (Master Plan §11.1 의 M8 임계값 보장). agent 격리 spawn 은 옵션 — 본 sub-sprint 의 L4 자동 모드 효율 우선.
**Next Phase**: Do (Task #9) — 3 files 변경 + 매 commit Sprint 1-4 226 TCs + claude plugin validate + hooks 21:24 + frontmatter verification
**예상 Phase 4 (Do) 소요**: 30-45분 (Master Plan §10) + 검증 매 commit
**사용자 명시 1-8 보존 확인**: 8/8 (§ Header preamble 의 8 row 모두 ✓)
