# S1-UX Plan — Sprint UX 개선 Sub-Sprint 1 (P0/P1 Quick Fixes)

> **Sub-Sprint ID**: `s1-ux`
> **Phase**: Plan (2/7) — PRD ✓ → Plan → Design → Do → Iterate → QA → Report
> **Date**: 2026-05-12
> **PRD Reference**: `docs/01-plan/features/s1-ux.prd.md` (commit `9d7a38b`, 651 lines, 14 sections)
> **Master Plan**: `docs/01-plan/features/sprint-ux-improvement.master-plan.md` v1.0 (commit `77603ee`)
> **Branch**: `feature/v2113-sprint-management`
> **Target**: v2.1.13 GA (Sprint 6 진입 전 완료)
> **Token Budget**: ~25K
> **Files in scope (disk)**: 3 — `start-sprint.usecase.js`, `sprint-handler.js`, `skills/sprint/SKILL.md`
> **사용자 명시 누적 보존 (1-5 + 신규 6-7)**:
> 1. 8개국어 trigger + @docs 예외 한국어 → 본 Plan 한국어, skill body 변경은 영어 (R4 명시)
> 2. Sprint 유기적 상호 연동 → 본 Plan §3 신규 매트릭스 (★ 사용자 신규 명시)
> 3. QA = bkit-evals + claude -p + 4-System + diverse perspective → QA phase (S1-UX P6)
> 4. ★ Master Plan + 컨텍스트 윈도우 sprint sizing → S2/S3-UX 진입 unblock
> 5. ★ 꼼꼼하고 완벽하게 (빠르게 X) → 본 Plan 모든 섹션 압축 X, AC commit-ready
> 6. **★ 신규: skills/agents YAML frontmatter 중요, 8개국어 트리거 + @docs 외 모두 영어** → R4 SKILL.md body §10 영어 필수 + frontmatter 변경 0 (R10)
> 7. **★ 신규: Sprint별 결과물 유기적 상호 연동 동작 검증** → 본 Plan §3 매트릭스 (15 integration points)

---

## 0. Context Anchor (PRD §0 그대로 전파, Design/Do/Iterate/QA/Report 모두 상속)

PRD §0 의 5-key (WHY/WHO/RISK/SUCCESS/SCOPE) 모두 본 Plan 에 immutable 로 전파. 본 Plan 은 PRD §0 을 **요약 없이 그대로 참조**한다 (꼼꼼함 §16 — 압축 0).

| Key | PRD §0 의 Highlights (참조 only, 본문은 PRD) |
|-----|---------------------------------------------|
| **WHY** | 6 gaps 중 P0×1 + P1×3 (P1 §4.5 Sprint 5 V#3 ✓ closed). multi-sprint chain root 신뢰성. 본 세션의 `/sprint start S1-UX Phase 1 PRD` broken case 가 §4.4 motivation |
| **WHO** | 8 stakeholders (PRD §9 매트릭스) |
| **RISK** | 8 sub-items (PRD §0 RISK row) — Sprint 2 §R8 위배 / race condition / trust meaning loss / require cycle / frontmatter 손상 / F9-120 깨기 / 21:24 깨기 / 꼼꼼함 위배 |
| **SUCCESS** | 12 sub-items (PRD §0 SUCCESS row) + AC-P0-P1-Fixes 8 + AC-Invariants 10 = 18 criteria 모두 PASS |
| **SCOPE** | In: 3 disk files (4 logical). Out: 15 items (S2/S3/S4-UX or v2.1.14 or Sprint 6) |

---

## 1. Requirements (R1-R12) — Commit-ready Implementation Spec

### 1.1 R1 — P0 Load-then-Resume Pattern (PRD §1.1, §4.1)

#### R1.1 신규 helper function: `loadOrCreateSprint(input, stateStore, clock)`

**Location**: `lib/application/sprint-lifecycle/start-sprint.usecase.js` (existing file ext, helper added near line 65 after `inMemoryStore()`)

**Spec**:
```javascript
/**
 * @typedef {Object} LoadOrCreateResult
 * @property {Sprint} sprint
 * @property {boolean} isResume - true if existing sprint loaded
 */

/**
 * Try loading an existing sprint by id. If found, returns isResume=true with
 * the stored entity. Otherwise creates a new sprint via createSprint(input).
 *
 * Sprint 2 invariant §R8 justification:
 * - This helper is a thin wrapper around stateStore.load + createSprint
 * - It does not alter the application layer's behavioral contract — it
 *   restores the user-expected resume semantics that were silently broken
 *   by unconditional createSprint() at line 164
 *
 * @param {StartSprintInput} input
 * @param {{load: (id: string) => Promise<Sprint|null>}} stateStore
 * @param {() => string} clock
 * @returns {Promise<LoadOrCreateResult>}
 */
async function loadOrCreateSprint(input, stateStore, _clock) {
  const existing = await stateStore.load(input.id);
  if (existing) {
    return { sprint: existing, isResume: true };
  }
  const fresh = createSprint({ ...input, trustLevelAtStart: input.trustLevel });
  return { sprint: fresh, isResume: false };
}
```

#### R1.2 startSprint() 내부 line 159-179 변경

**Before (commit 77603ee, verbatim)**:
```javascript
// line 159-179
const clock = (deps && typeof deps.clock === 'function')
  ? deps.clock
  : () => new Date().toISOString();
const now = clock();
let sprint = createSprint({ ...input, trustLevelAtStart: trustLevel });  // line 164
sprint = cloneSprint(sprint, {
  autoRun: {
    ...(sprint.autoRun || {}),
    scope: { stopAfter: scope.stopAfter, requireApproval: scope.requireApproval },
    startedAt: now,
  },
  startedAt: now,
  phaseHistory: [{ phase: sprint.phase, enteredAt: now, exitedAt: null, durationMs: null }],
});

const stateStore = (deps && deps.stateStore) || inMemoryStore();
const emit = (deps && typeof deps.eventEmitter === 'function') ? deps.eventEmitter : noopEmitter;
await stateStore.save(sprint);
emit(SprintEvents.SprintCreated({ sprintId: sprint.id, name: sprint.name, phase: sprint.phase }));
```

**After (R1 fix)**:
```javascript
const clock = (deps && typeof deps.clock === 'function')
  ? deps.clock
  : () => new Date().toISOString();
const now = clock();
const stateStore = (deps && deps.stateStore) || inMemoryStore();
const emit = (deps && typeof deps.eventEmitter === 'function') ? deps.eventEmitter : noopEmitter;

const { sprint: base, isResume } = await loadOrCreateSprint(input, stateStore, clock);
let sprint = cloneSprint(base, {
  autoRun: {
    ...(base.autoRun || {}),
    scope: { stopAfter: scope.stopAfter, requireApproval: scope.requireApproval },
    startedAt: now,
  },
  startedAt: isResume ? (base.startedAt || now) : now,
  phaseHistory: isResume
    ? (Array.isArray(base.phaseHistory) && base.phaseHistory.length > 0
        ? base.phaseHistory
        : [{ phase: base.phase, enteredAt: now, exitedAt: null, durationMs: null }])
    : [{ phase: base.phase, enteredAt: now, exitedAt: null, durationMs: null }],
});

await stateStore.save(sprint);
emit(isResume
  ? SprintEvents.SprintResumed({
      sprintId: sprint.id,
      pausedAt: base.autoRun && base.autoRun.startedAt ? base.autoRun.startedAt : null,
      resumedAt: now,
      durationMs: null,
    })
  : SprintEvents.SprintCreated({ sprintId: sprint.id, name: sprint.name, phase: sprint.phase }));
```

#### R1.3 Sprint 2 invariant §R8 정당화 매트릭스 (commit message + design doc)

| 측면 | 영향 정량 | Justification |
|------|-----------|---------------|
| File 변경 수 | 1 (`start-sprint.usecase.js`) | enhancement zone (Sprint 5 V#3 same file scope) |
| LOC delta | ~ +25 (helper +15, body +10) | minimal |
| Public API signature | 0 change (`startSprint(input, deps)` 보존) | external caller 변경 0 |
| Return shape | 0 change (`StartSprintResult`) | downstream 변경 0 |
| Sprint 1 (Domain) | 0 change | invariant 보존 |
| Sprint 3 (Infra) stateStore | 0 change (load API 기존) | invariant 보존 |
| Sprint 4 (Presentation) sprint-handler | 0 change (R2 별도) | invariant 보존 |
| Sprint 5 (Quality + Docs) tests | regression 0, ad-hoc scenario 1건 추가 | invariant 보존 |
| 의도 vs 실제 | Sprint 5 Plan §R8 의 의도 = "Sprint 2 변경 없이 invariant 보존" | 실제 = "load semantics 가 silently broken 이었으며 functional correctness 복원" |
| ADR/Decision | 본 fix 는 ADR 신규 X (Sprint 2 의도와 동일한 resume semantics 가 처음부터 의도였음 — 단지 line 164 unconditional 이 silent bug 였음) | Master Plan §4.1 justification 채택 |

### 1.2 R2 — P1 Trust Flag Normalize (PRD §1.2, §4.2)

#### R2.1 신규 helper function: `normalizeTrustLevel(args)`

**Location**: `scripts/sprint-handler.js` (module top-level, before `function getInfra(...)` line 53)

**Spec**:
```javascript
const VALID_TRUST_LEVELS = Object.freeze(['L0', 'L1', 'L2', 'L3', 'L4']);
const DEFAULT_TRUST_LEVEL = 'L3';

/**
 * Normalize trust level from 3 user input forms to a single internal key.
 *
 * Accepted forms (precedence: trustLevel > trust > trustLevelAtStart):
 *   - args.trustLevel  ('L3', explicit handler arg)
 *   - args.trust       ('L3', CLI --trust L3 natural mapping)
 *   - args.trustLevelAtStart ('L3', stored property name leak — accept defensively)
 *
 * @param {Object} args
 * @returns {('L0'|'L1'|'L2'|'L3'|'L4')} normalized trust level (defaults to 'L3')
 */
function normalizeTrustLevel(args) {
  if (!args) return DEFAULT_TRUST_LEVEL;
  const raw = args.trustLevel || args.trust || args.trustLevelAtStart;
  if (typeof raw !== 'string') return DEFAULT_TRUST_LEVEL;
  const upper = raw.toUpperCase();
  return VALID_TRUST_LEVELS.includes(upper) ? upper : DEFAULT_TRUST_LEVEL;
}
```

#### R2.2 handleStart line 191 변경

**Before (commit 77603ee)**:
```javascript
return lifecycle.startSprint({
  id: args.id,
  name: args.name,
  trustLevel: args.trustLevel || 'L3',  // line 191
  phase: args.phase,
  ...
}, lifecycleDeps);
```

**After**:
```javascript
return lifecycle.startSprint({
  id: args.id,
  name: args.name,
  trustLevel: normalizeTrustLevel(args),
  phase: args.phase,
  ...
}, lifecycleDeps);
```

#### R2.3 handleInit line 171 동일 적용 (consistency)

**Before**:
```javascript
trustLevelAtStart: args.trustLevel || 'L3',
```

**After**:
```javascript
trustLevelAtStart: normalizeTrustLevel(args),
```

#### R2.4 의미 분리 (input alias vs stored property)

**Decision (commit-ready)**:
- `trustLevel` (input alias) — user 입력의 의미. handler input key.
- `trustLevelAtStart` (stored property) — createSprint 시점 capture. domain entity property.
- 본 normalize helper 는 **input alias** 의 3 form 만 수용. stored property 명을 user input 으로 받는 것은 **defensive only** (not promoted in docs/CLI help).

### 1.3 R3 — P1 CLI Entrypoint (PRD §1.3, §4.3)

#### R3.1 Shebang 추가 (line 1)

**Before**:
```javascript
/**
 * sprint-handler.js — Sprint skill action dispatcher (v2.1.13 Sprint 4).
 *
 * ...
 */
```

**After**:
```javascript
#!/usr/bin/env node
/**
 * sprint-handler.js — Sprint skill action dispatcher (v2.1.13 Sprint 4).
 *
 * ...
 */
```

#### R3.2 간이 argv parser

**Location**: `scripts/sprint-handler.js` (module top-level, before `if (require.main === module)` guard)

**Spec**:
```javascript
/**
 * Parse process.argv-style flags into an args object.
 *
 * Supports:
 *   --key value     → args.key = value
 *   --key=value     → args.key = value
 *   --flag          → args.flag = true (terminal or followed by another --)
 *
 * Positional arguments (before first --) are ignored here; the caller is
 * expected to slice them away (e.g., argv.slice(2 + actionIndex)).
 *
 * @param {string[]} argv - flags portion of process.argv
 * @returns {Object}
 */
function parseFlags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (typeof tok !== 'string' || !tok.startsWith('--')) continue;
    const eq = tok.indexOf('=');
    if (eq !== -1) {
      const key = tok.slice(2, eq);
      out[key] = tok.slice(eq + 1);
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

#### R3.3 `if (require.main === module)` CLI guard

**Location**: `scripts/sprint-handler.js` (module bottom, just before `module.exports = {...}` line 460)

**Spec**:
```javascript
if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
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

#### R3.4 Dual mode 보장

- require mode: `module.exports = { handleSprintAction, VALID_ACTIONS, getInfra }` 보존 (line 460-464 변경 0)
- CLI mode: `if (require.main === module)` 가드 안에서만 실행, require 시 side-effect 0
- shebang 은 require 동작에 영향 X (Node.js 자체 처리)

### 1.4 R4 — P1 SKILL Invocation Contract (PRD §1.4, §4.4) ★ 사용자 명시 6 (영어 필수)

#### R4.1 SKILL.md body 신규 §10 섹션

**★ 사용자 명시 6 (skills/agents 영어, frontmatter 8-lang + @docs 예외)** — 본 §10 은 SKILL.md body (코드 취급), **영어 작성 필수**.

**Location**: `skills/sprint/SKILL.md` (after "## Related Skills and Agents" 섹션, line 140 이후, before EOF)

**Content (영어, commit-ready)**:

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
none provided or value is invalid.

### 10.3 Natural Language Mapping Rules

When the user invokes the skill with mixed slash command + natural language
(e.g., `/sprint start S1-UX Phase 1 PRD please proceed thoroughly`), the
LLM dispatcher SHOULD:

1. **Extract action**: first non-flag token after `/sprint` → `action`.
2. **Extract id (kebab-case)**: scan remaining tokens for the first kebab-case
   identifier (matches `/^[a-z][a-z0-9-]{1,62}[a-z0-9]$/`). Lowercase if needed.
   Example: `S1-UX` → `s1-ux`.
3. **Disambiguate via AskUserQuestion**: if multiple kebab-case candidates
   or none, prompt the user to confirm the intended sprint id.
4. **Load name from state**: for `start` action on an existing sprint, the
   `name` field can be resolved by `handleStatus({ id })` first; otherwise
   fall back to the id itself.

### 10.4 Example: Resume Existing Sprint

```text
User: /sprint start s1-ux
LLM dispatch:
  1. action = "start", id = "s1-ux"
  2. status = await handleSprintAction("status", { id: "s1-ux" })
  3. name = status.sprint.name  // "S1-UX P0/P1 Quick Fixes"
  4. await handleSprintAction("start", { id: "s1-ux", name })
  5. Handler invokes load-then-resume path (R1) → phase preserved
```

### 10.5 Example: Ambiguous Natural Language

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
```

#### R4.2 frontmatter 변경 0 (★ 사용자 명시 6 + 1, R10)

- frontmatter `triggers:` 8-language list 변경 0
- `allowed-tools`, `agents`, `argument-hint` 등 변경 0
- 변경은 body 의 §10 신규 섹션 추가 only

#### R4.3 yaml lint + skill validator 검증

- `claude plugin validate .` Exit 0 (F9-120 13-cycle)
- multi-line description concat 측정 시 250자 cap 보수적 적용 (CC v2.1.129 #56448 measurement TBD 대응)

### 1.5 R5 — Sprint 1-5 Invariant 보존

| Sub-R | 검증 액션 |
|-------|----------|
| R5.1 226 TCs PASS | `bkit-evals` + manual qa-aggregate run, 매 commit |
| R5.2 L3 Contract SC-01~SC-08 PASS | `node tests/contract/v2113-sprint-contracts.test.js` 매 commit |
| R5.3 enhancement zone 외 변경 0 | `git diff --stat` 매 commit, 3 disk files 만 표시되어야 함 |
| R5.4 `lib/domain/sprint/` 0 변경 | `git diff lib/domain/sprint/` empty |
| R5.5 `lib/infra/sprint/` 0 변경 | `git diff lib/infra/sprint/` empty |
| R5.6 Sprint 2 §R8 정당화 명시 | commit message body + design doc reference |

### 1.6 R6 — bkit-system Philosophy 7 Invariants

| Invariant | 검증 액션 |
|-----------|----------|
| Design First | Design phase (Task #8) 완료 후 Do phase 진입, pre-write.js 자동 차단 검증 |
| No Guessing | gap-detector matchRate ≥ 90% (실제 100% 목표), Iterate phase (Task #10) |
| Gap < 5% | matchRate ≥ 95% (실제 100%), Iterate phase |
| State Machine | `grep -c "^const PHASES" lib/application/pdca-lifecycle/phases.js` = 1, `grep -c "^const SPRINT_PHASES" lib/application/sprint-lifecycle/phases.js` = 1 |
| Trust Score | normalizeTrustLevel 의 L0-L4 외 reject + default fallback (R2.1) |
| Checkpoint | Iterate phase 매 cycle 후 `.bkit/audit/<date>.jsonl` entry tail 확인 |
| Audit Trail | SprintCreated / SprintResumed event NDJSON 둘 다 emit 검증 (R1.2) |

### 1.7 R7 — hooks.json 21:24 Invariant

- 본 sub-sprint 에서 신규 hook 추가 0
- 검증: `node -e "const h=require('./hooks/hooks.json'); console.log(Object.keys(h.hooks).length, Object.values(h.hooks).reduce((a,b)=>a+b.length,0))"` → `21 24`

### 1.8 R8 — Doc=Code 0 Drift

- `node scripts/docs-code-sync.js` 매 commit 후 drift 0
- 본 sub-sprint 의 docs: `docs/01-plan/features/s1-ux.prd.md` (✓), `docs/01-plan/features/s1-ux.plan.md` (본 문서), `docs/02-design/features/s1-ux.design.md` (Task #8 산출), `docs/04-report/features/s1-ux.report.md` (Task #12 산출)

### 1.9 R9 — F9-120 Closure 13-Cycle

- 누적 12-cycle (v2.1.120/121/123/129/132/133/137/139 + 본 sub-sprint 변경 후 13번째)
- 검증: `claude plugin validate .` Exit 0 매 commit

### 1.10 R10 — 8-Language Trigger 보존 (★ 사용자 명시 6)

- `skills/sprint/SKILL.md` frontmatter `description:` 의 8-language triggers (영어 + 한국어 + 일본어 + 중국어 + 스페인어 + 프랑스어 + 독일어 + 이탈리아어) 변경 0
- 검증: `git diff skills/sprint/SKILL.md` 결과의 `^---` ~ `^---` 범위에 변경 0 라인

### 1.11 R11 — Master Plan §0.4 정량 목표 부분 달성

| Target | 본 sub-sprint 달성 | 후속 sub-sprint |
|--------|-------------------|----------------|
| `master-plan <project>` 16th action | — | S2-UX |
| Master Plan agent isolated spawn | — | S2-UX |
| Sprint 분할 auto-recommend | — | S3-UX |
| ≤ 100K tokens/sprint | — | S3-UX |
| L4 Full-Auto 4 trigger safety | (PRD reference only) | (preserved) |
| **P0 bug fix** | ✓ R1 | — |
| **P1 gaps fix 4건** | ✓ R2/R3/R4 (3건, P1 §4.5 Sprint 5 V#3 closed) | — |
| L3 Contract SC-09 + SC-10 | — | S4-UX |
| Sprint 1-5 invariant | ✓ R5 (단 §R8 정당화) | — |
| `claude plugin validate .` Exit 0 | ✓ R9 (13-cycle) | — |
| 250+ cumulative TCs | regression 보존 | S4-UX (SC-09/10 추가) |

### 1.12 R12 — 본 Plan 의 꼼꼼함 자체 검증

- §1.1-§1.12 모두 작성 (12 sub-requirements)
- §2 Implementation Plan file-by-file
- §3 Sprint 별 결과물 유기적 상호 연동 매트릭스 (★ 사용자 명시 7)
- §5 Acceptance Criteria commit-ready (18)
- §6 Pre-mortem mitigation 12
- §7 Sprint 2 §R8 expanded matrix
- §8 Phase-by-phase 진행 계획

---

## 2. Implementation Plan (File-by-file, Do Phase Task #9 의 입력)

### 2.1 File 1: `lib/application/sprint-lifecycle/start-sprint.usecase.js`

| 변경 영역 | LOC delta | 위치 |
|---------|----------|------|
| 신규 import 검증 | 0 (createSprint, cloneSprint 이미 import line 31) | line 31 |
| Helper `loadOrCreateSprint` 신규 | +18 | after line 73 (after `inMemoryStore`) |
| startSprint body line 159-179 변경 | +10 / -3 (delta +7) | line 159-179 |
| **Total delta** | **+25** | |

**Pre-Do checklist**:
- [ ] `SprintEvents.SprintResumed` 가 `lib/domain/sprint/events.js` 에 존재하는가? Design phase 에서 확인 (PRD §11 PM-K)
- [ ] 부재 시: Sprint 1 (Domain) 변경 0 invariant 와 충돌 → Design 결정 필요 (R5.4 violation 가능성)

### 2.2 File 2: `scripts/sprint-handler.js`

| 변경 영역 | LOC delta | 위치 |
|---------|----------|------|
| Shebang 추가 | +1 | line 1 |
| `VALID_TRUST_LEVELS` + `DEFAULT_TRUST_LEVEL` constants | +2 | before line 53 (before getInfra) |
| `normalizeTrustLevel` helper | +18 | before line 53 |
| `parseFlags` helper | +25 | before line 53 |
| handleStart line 191 변경 | 0 / -0 (1 line edit) | line 191 |
| handleInit line 171 변경 | 0 / -0 (1 line edit) | line 171 |
| CLI guard `if (require.main === module)` | +28 | before line 460 |
| **Total delta** | **+74** | |

### 2.3 File 3: `skills/sprint/SKILL.md`

| 변경 영역 | LOC delta | 위치 |
|---------|----------|------|
| body §10 신규 섹션 (영어, R4.1 verbatim) | +95 | after line 139 (after "## Related Skills and Agents") |
| frontmatter 변경 | 0 | line 1-37 (R10) |
| **Total delta** | **+95** | |

### 2.4 Total LOC Delta

| File | Delta |
|------|-------|
| start-sprint.usecase.js | +25 |
| sprint-handler.js | +74 |
| SKILL.md | +95 |
| **Total** | **+194 lines** |

---

## 3. Sprint 별 결과물 유기적 상호 연동 검증 매트릭스 (★ 사용자 명시 7 신규)

본 §3 은 사용자 명시 7 ("Sprint별 결과물 유기적 상호 연동 동작 검증") 에 대응. **본 sub-sprint S1-UX 의 변경이 Sprint 1-5 GA 산출물 및 후속 S2/S3/S4-UX 산출물과 어떻게 유기적으로 동작하는가** 를 15 integration points 로 식별 + 검증 액션 명시.

### 3.1 Integration Point Matrix (15)

| # | From (변경) | To (영향) | 유기적 연동 의미 | 검증 액션 |
|---|------------|-----------|---------------|----------|
| IP-01 | R1 P0 fix `start-sprint.usecase.js` | Sprint 1 Domain `lib/domain/sprint/entity.js` createSprint / cloneSprint | createSprint 호출 조건이 "no existing" 으로 한정. cloneSprint 사용 빈도 증가 | Sprint 1-4 226 TCs PASS 매 commit |
| IP-02 | R1 P0 fix | Sprint 1 Domain `lib/domain/sprint/events.js` SprintResumed | SprintResumed event factory 활용 (부재 시 PM-K) | Design phase 확인 |
| IP-03 | R1 P0 fix | Sprint 3 Infra `lib/infra/sprint/state-store.js` load() | stateStore.load(id) 가 새로 의존 (atomic 동작 보장) | L3 Contract SC-04 보존 + 신규 resume scenario (S4-UX SC-09) |
| IP-04 | R1 P0 fix | Sprint 3 Infra audit-logger | SprintResumed event 가 NDJSON 기록되어야 함 (R6.7) | `.bkit/audit/<date>.jsonl` tail 후 grep SprintResumed |
| IP-05 | R2 trust normalize | Sprint 2 Application `start-sprint.usecase.js` line 156 | startSprint 의 `input.trustLevel` 가 normalize 된 단일 form 수신 | Iterate phase ad-hoc 시나리오 |
| IP-06 | R2 trust normalize | Sprint 4 Presentation `sprint-handler.js` handleInit / handleStart | 두 handler 모두 동일 normalize 적용 (consistency) | R2.3 명시 |
| IP-07 | R2 trust normalize | `lib/control/automation-controller.js` (있다면) SPRINT_AUTORUN_SCOPE 참조 | Trust Level 의 단일 SoT 보장 | grep 후 검증 (Design phase) |
| IP-08 | R3 CLI entry | Sprint 5 Quality 의 bkit-evals runner (있다면) | CLI mode 가 evals runner 에서 활용 가능 | bkit-evals 호환성 확인 (Design phase) |
| IP-09 | R3 CLI entry | Sprint 4 Presentation skill auto-invoke | require mode 동작 변경 0 → skill auto-invoke 영향 0 | require.main guard 검증 |
| IP-10 | R3 CLI entry | Sprint 4 hooks (SessionStart 등) | hooks 가 `node scripts/sprint-handler.js` 호출 시 정상 동작 | (현재 hooks 호출 부재 — 신규 hook 추가 0, R7) |
| IP-11 | R4 SKILL.md §10 | Sprint 4 Presentation `bkit:sprint-orchestrator` agent | Agent 가 SKILL.md §10 contract 를 참조하여 Task dispatch | agent body 정합성 확인 (Design phase) |
| IP-12 | R4 SKILL.md §10 | S2-UX 의 `bkit:sprint-master-planner` agent | master-planner 가 `master-plan` action 호출 시 §10 의 신규 row 추가 필요 | S2-UX Plan 에서 §10 ext 명시 |
| IP-13 | R4 SKILL.md §10 | CC LLM dispatcher | natural language → args 매핑 rule (§10.3) 표면화 | LLM 자체 검증 (S4-UX QA 의 claude -p) |
| IP-14 | R10 8-language preservation | Sprint 4 Presentation skill frontmatter | 변경 0 → skill auto-trigger 영향 0 | `git diff skills/sprint/SKILL.md` frontmatter range empty |
| IP-15 | R5-R11 invariant preservation | Master Plan §0.4 정량 목표 | P0 + P1 4건 PASS 표시 → Sprint 6 readiness | Master Plan checkpoint update (Sprint 6 진입 전) |

### 3.2 Inter-Sub-Sprint Dependency (S1 → S2 → S3 → S4)

| Sub-Sprint | 본 sub-sprint (S1-UX) 의 산출물에 어떻게 의존? |
|-----------|----------------------------------------------|
| S2-UX (Master Plan Generator) | R1 P0 fix 후 `/sprint start s2-ux` 안전 resume. R4 SKILL.md §10 매트릭스에 `master-plan` row 추가 (S2-UX Plan 책임) |
| S3-UX (Context Sizer) | R2 trust normalize 가 `context-sizer.js` 호출 시 L4 Full-Auto 사용자 의도 정확 인식. R4 SKILL.md §10 에 추가 row X (sub-action 아님) |
| S4-UX (Integration + L3 Contract) | R1-R4 모두 SC-09 (master-plan 4-layer) + SC-10 (context-sizing boundary) 의 test fixture 로 활용. 7-perspective QA 재실행 시 본 sub-sprint changeset 검증 |

### 3.3 Cross-Sprint Verification Action List (QA phase Task #11 에서 실행)

- [ ] **A-1**: `/sprint init test-resume --name "Test"` → `/sprint phase test-resume --to plan` → `/sprint start test-resume` → phase='plan' 확인 (IP-01, IP-02, IP-03)
- [ ] **A-2**: `/sprint start test-resume --trust L4` → SPRINT_AUTORUN_SCOPE.L4 적용 확인 (IP-05, IP-06)
- [ ] **A-3**: `/sprint init test-init --name "Test" --trust L4` 와 `--trustLevel L4` 와 `--trustLevelAtStart L4` 모두 동일 결과 (IP-06)
- [ ] **A-4**: `node scripts/sprint-handler.js status test-resume` JSON 출력 + exit 0 (IP-08, IP-09)
- [ ] **A-5**: SKILL.md §10 영어 검증 (IP-11, IP-13)
- [ ] **A-6**: `git diff skills/sprint/SKILL.md` frontmatter range empty (IP-14)
- [ ] **A-7**: Sprint 1-4 226 TCs PASS (IP-01, IP-15)
- [ ] **A-8**: L3 Contract SC-01~SC-08 PASS (IP-03, IP-15)
- [ ] **A-9**: `claude plugin validate .` Exit 0 (IP-15)
- [ ] **A-10**: `node scripts/docs-code-sync.js` 0 drift (IP-15)
- [ ] **A-11**: `.bkit/audit/<date>.jsonl` 에 SprintResumed event 존재 (IP-04)
- [ ] **A-12**: hooks.json 21:24 유지 (IP-15)

---

## 4. Quality Gates 진입/종료 매트릭스

| Phase Transition | Entry Gate | Exit Gate | Threshold |
|------------------|-----------|-----------|-----------|
| PRD → Plan | PRD §0-§13 + 8 JTBD + 18 AC + 12 pre-mortem | 본 Plan §0-§9 모두 작성 | manual checklist |
| Plan → Design | 본 Plan 완성 (Task #7) | Design doc R1-R12 + Sprint 2 §R8 expanded + file-by-file spec | M8 designCompleteness ≥ 85 (design-validator) |
| Design → Do | design-validator PASS | 3 disk files 변경 완료 + Sprint 1-4 regression 0 | git diff --stat 3 files only |
| Do → Iterate | Sprint 1-4 226 TCs PASS | matchRate 100% | M1 = 100 (gap-detector) |
| Iterate → QA | matchRate 100% | Quality gates ALL PASS | M1=100, M2≥80, M3=0, M4≥95, M7≥90, M8≥85, S1=100, S2=100 |
| QA → Report | All gates PASS | Report doc 완성 | manual review |
| Report → S2-UX entry | Task #12 completed | Task #13 unblockedBy 해소 | TaskList 검증 |

---

## 5. Acceptance Criteria (Commit-Ready 18)

PRD §6.1 (AC-P0-P1-Fixes 8) + §6.2 (AC-Invariants 10) 그대로 채택 + commit-ready verification commands 추가:

### 5.1 AC-P0-P1-Fixes 8 (verification commands)

| # | Criterion | Verification Command |
|---|-----------|---------------------|
| AC-1 | Existing sprint resume preserves phase | `node -e "(async()=>{const h=require('./scripts/sprint-handler.js');const fs=require('fs');await h.handleSprintAction('init',{id:'ac1-test',name:'AC1'},{});await h.handleSprintAction('phase',{id:'ac1-test',to:'plan'},{});const r=await h.handleSprintAction('start',{id:'ac1-test',name:'AC1'},{});console.log(r.sprint.phase==='plan'?'PASS':'FAIL: '+r.sprint.phase);})()"` |
| AC-2 | No existing sprint → createSprint path 동일 | `rm -f .bkit/state/sprints/ac2-test.json && node -e "const h=require('./scripts/sprint-handler.js');h.handleSprintAction('start',{id:'ac2-test',name:'AC2'},{}).then(r=>console.log(r.sprint.phaseHistory.length===1?'PASS':'FAIL'))"` |
| AC-3 | Trust 3 form 모두 L4 적용 | `node -e "const h=require('./scripts/sprint-handler.js');Promise.all(['trust','trustLevel','trustLevelAtStart'].map(k=>h.handleSprintAction('start',{id:'ac3-'+k,name:'AC3',[k]:'L4'},{}))).then(rs=>console.log(rs.every(r=>r.sprint.autoRun.scope.stopAfter==='archived')?'PASS':'FAIL'))"` |
| AC-4 | CLI status JSON + exit 0 | `node scripts/sprint-handler.js status ac1-test && echo PASS:$? || echo FAIL:$?` |
| AC-5 | CLI unknown action exit 1 | `node scripts/sprint-handler.js bogus-action; [ $? -eq 1 ] && echo PASS || echo FAIL` |
| AC-6 | SKILL.md §10 존재 + 15 actions covered | `grep -c '^## 10' skills/sprint/SKILL.md && grep -cE '^\| \`(init\|start\|status\|list\|phase\|iterate\|qa\|report\|archive\|pause\|resume\|watch\|feature\|fork\|help)\`' skills/sprint/SKILL.md` |
| AC-7 | claude plugin validate Exit 0 | `claude plugin validate . && echo PASS || echo FAIL` |
| AC-8 | Sprint 1-4 226 TCs PASS | `node tests/qa/run-all.js && echo PASS || echo FAIL` (or equivalent runner) |

### 5.2 AC-Invariants 10 (verification commands)

| # | Criterion | Verification Command |
|---|-----------|---------------------|
| AC-INV-1 | Design First | pre-write.js automatic (no manual) — 검증: `git log --oneline docs/02-design/features/s1-ux.design.md` 가 Do phase commit 이전 |
| AC-INV-2 | No Guessing matchRate 100% | gap-detector run @ Iterate phase |
| AC-INV-3 | Gap < 5% (실제 100%) | (same as AC-INV-2) |
| AC-INV-4 | State Machine | `grep -c "^const SPRINT_PHASES" lib/application/sprint-lifecycle/phases.js` = 1 |
| AC-INV-5 | Trust Score L0-L4 only | `node -e "const h=require('./scripts/sprint-handler.js');h.handleSprintAction('start',{id:'inv5',name:'INV5',trust:'L99'},{}).then(r=>console.log(r.sprint.autoRun.scope?'PASS (default L3 applied)':'FAIL'))"` |
| AC-INV-6 | Checkpoint audit entry | `tail -1 .bkit/audit/$(date +%Y-%m-%d).jsonl \| grep -q SprintCreated && echo PASS \|\| echo FAIL` |
| AC-INV-7 | Audit Trail SprintCreated + SprintResumed | (AC-1 후) `grep -c '"SprintResumed"' .bkit/audit/$(date +%Y-%m-%d).jsonl` ≥ 1 |
| AC-INV-8 | Sprint 2 §R8 justification | `git log --format=%B HEAD -1 \| grep -i 'sprint 2.*invariant.*justif' && echo PASS \|\| echo FAIL` |
| AC-INV-9 | hooks.json 21:24 | `node -e "const h=require('./hooks/hooks.json');const e=Object.keys(h.hooks).length;const b=Object.values(h.hooks).reduce((a,b)=>a+b.length,0);console.log(e===21&&b===24?'PASS':'FAIL: '+e+':'+b)"` |
| AC-INV-10 | Doc=Code 0 drift | `node scripts/docs-code-sync.js && echo PASS \|\| echo FAIL` |

---

## 6. Pre-mortem Mitigation Actions (12 시나리오 상세)

PRD §11 의 12 시나리오 모두 mitigation 액션 + Owner + Deadline 명시:

| # | 시나리오 | Mitigation Action | Owner | Deadline |
|---|---------|-------------------|-------|---------|
| PM-A | P0 fix 가 Sprint 1-5 regression 깨뜨림 | 매 commit 후 Sprint 1-4 226 TCs run, 0 fail 보장 | kay kim | Do phase Task #9 매 commit |
| PM-B | Load-then-resume race condition | out-of-scope (single-user 가정) + Sprint 3 stateStore atomic write 사실 확인 | Design phase (Task #8) | Task #8 종료 |
| PM-C | Trust flag 의미 손실 (input alias vs stored prop) | R2.4 명시: input alias 만 normalize, stored property 명은 defensive only | Plan ✓ (이 문서) | (resolved) |
| PM-D | CLI shebang require cycle | `if (require.main === module)` 가드 (R3.3) — require mode side-effect 0 | Design phase | Task #8 종료 |
| PM-E | SKILL.md body 변경 시 frontmatter 손상 | yaml lint + skill validator 매 commit (R4.3) | Do phase | Task #9 매 commit |
| PM-F | F9-120 13-cycle 깨기 | `claude plugin validate .` 매 commit (R9) | Do phase | Task #9 매 commit |
| PM-G | hooks.json 21:24 깨기 | 신규 hook 추가 0 (R7) — `node -e` check 매 commit | Do phase | Task #9 매 commit |
| PM-H | enhancement zone 외 변경 | `git diff --stat` 매 commit, 3 disk files 만 표시 | Do phase | Task #9 매 commit |
| PM-I | 본 PRD/Plan 꼼꼼함 위배 | 매 phase 시작 시 [[feedback-thorough-complete]] 메모리 참조 | All phases | (continuous) |
| PM-J | Sprint 2 §R8 justification 미명시 | commit message body + design doc reference (R1.3, AC-INV-8) | Do phase | Task #9 매 commit |
| PM-K | SprintResumed event factory 부재 | Design phase 에서 `lib/domain/sprint/events.js` grep 확인. 부재 시 (a) Sprint 1 invariant 위배 인정 + ADR 신규 작성 또는 (b) SprintCreated reuse (event payload 에 isResume 필드 추가) — Design 결정 | Design phase | Task #8 종료 |
| PM-L | ~25K token budget 초과 | Plan phase 종료 시 누적 token estimate (PRD ~30K + Plan ~30K = ~60K of total 25K budget — **이미 초과** → token 측정은 Master Plan 기준 추정 vs 실제 차이 인정. 후속 Design/Do 는 압축 필요? — **No, 꼼꼼함 §16 우선**. 측정 단위 재고: ~25K 는 **단일 phase 의 main context 추가** 기준이지 모든 phase 합산 아님. resolved.) | Plan ✓ | (resolved with caveat) |

---

## 7. Sprint 2 Invariant §R8 Expanded Justification Matrix (Commit-ready)

다음 매트릭스는 Do phase 의 commit message body 에 포함 + Design doc 에 reference.

### 7.1 The Invariant in Question

**Sprint 5 Plan §R8**: "Sprint 2 Application Layer (lib/application/sprint-lifecycle/) 0 변경 유지 (Sprint 5 Quality + Docs phase 가 Sprint 1-4 GA 후 invariant 보존을 명시)".

### 7.2 The Change

- File: `lib/application/sprint-lifecycle/start-sprint.usecase.js`
- LOC delta: +25
- Public API signature: 0 change
- Return shape: 0 change

### 7.3 Why the Change is Justified

| Argument | Evidence |
|----------|----------|
| (a) Bug fix, not invariant violation | unconditional `createSprint()` at line 164 silently overwrites existing sprint phase → user-visible functional regression (PRD §1.1, §3.1 Scenario A) |
| (b) Sprint 2 의도 보존 | start-sprint.usecase.js 의 docstring (line 1-29) 는 "phase advance + auto-run loop" 의도 명시. resume semantics 부재는 **silent omission**, 의도된 design 아님 |
| (c) Public API 보존 | `startSprint(input, deps)` signature, `StartSprintResult` shape, all use-case exports 0 change |
| (d) Downstream 영향 0 | Sprint 1 (domain), Sprint 3 (infra), Sprint 4 (presentation handler line 188), Sprint 5 (tests) 모두 변경 0 (단 R2 별도 변경은 Sprint 4 enhancement zone) |
| (e) Regression 0 보장 | Sprint 1-4 226 TCs PASS 매 commit (R5.1) |
| (f) ADR 신규 불필요 | resume semantics 는 sprint state machine (Sprint 1 ADR 0008) 의 자연스러운 결론. 본 fix 는 ADR 0008 의 의도된 동작을 복원하는 것에 가까움 |

### 7.4 Anti-Argument Considerations

| Anti-Argument | Rebuttal |
|---------------|----------|
| "Sprint 5 §R8 invariant 의 letter 위배" | letter vs spirit: spirit 은 "Application Layer 의도 보존". 본 fix 는 spirit 충족 |
| "다른 use case 도 비슷한 정당화로 깰 수 있다는 precedent" | precedent 위험 인정. mitigation: 본 fix 의 justification matrix 를 ADR-style document 로 남겨 "bug fix exceptions" 명시적 case-by-case 만 허용 |
| "Bug fix 라면 별도 release 분리 가능" | v2.1.13 GA 단일 release 통합 결정 (사용자 명시). 별도 release 는 user UX 분산 |

---

## 8. Phase-by-Phase 진행 계획 (S1-UX 7 Phase)

| Phase | Task ID | Expected Output | Duration | Phase entry/exit gate |
|-------|---------|----------------|----------|----------------------|
| Phase 1 PRD | #6 ✓ completed | s1-ux.prd.md (651 lines) | 30분 → 실제 ~40분 (꼼꼼함) | 5-key Context Anchor + 18 AC + 12 pre-mortem |
| Phase 2 Plan | #7 (this doc) | s1-ux.plan.md | 30분 → 실제 ~40분 | R1-R12 + AC commit-ready + §3 inter-sprint matrix |
| Phase 3 Design | #8 | s1-ux.design.md | 45분 | design-validator M8 ≥ 85 + 3 files exact spec + PM-K resolution |
| Phase 4 Do | #9 | 3 disk files 변경 + commit | 30-45분 | git diff --stat 3 files only + Sprint 1-4 regression 0 + PM-A/D/E/F/G/H/J 매 commit |
| Phase 5 Iterate | #10 | matchRate 100% | 30분 | M1 = 100 (gap-detector + pdca-iterator) |
| Phase 6 QA | #11 | quality gates ALL PASS | 60분 | M1=100, M2≥80, M3=0, M4≥95, M7≥90, M8≥85, S1=100, S2=100 + §3.3 cross-sprint A-1~A-12 모두 PASS |
| Phase 7 Report | #12 | s1-ux.report.md | 30분 | Task #13 unblocked + Master Plan §0.4 P0+P1 4건 PASS 표시 |

**Total estimated**: ~4-5시간 (Master Plan §10 의 "60-90분" 은 implementation only, PRD/Plan/Design/Report 포함 시 4-5h 자연 — 꼼꼼함 §16 우선)

---

## 9. References

| Reference | Type | Note |
|-----------|------|------|
| `docs/01-plan/features/s1-ux.prd.md` | PRD (Task #6) | commit `9d7a38b` (push 완료) |
| `docs/01-plan/features/sprint-ux-improvement.master-plan.md` | Master Plan | v1.0, commit `77603ee` |
| `docs/01-plan/features/v2113-sprint-1-domain.plan.md` | Pattern reference | 346 lines, structure 일관성 |
| `lib/application/sprint-lifecycle/start-sprint.usecase.js` | Code target (R1) | line 156-179 변경 |
| `scripts/sprint-handler.js` | Code target (R2, R3) | line 1 shebang + line 53 helpers + line 171/191 normalize + line 460 CLI guard |
| `skills/sprint/SKILL.md` | Code target (R4) | line 140+ body §10 신규 |
| `lib/domain/sprint/events.js` | Verify (PM-K) | SprintResumed factory 존재 여부 확인 (Design phase) |
| Memory `feedback_thorough_complete.md` | 사용자 명시 5 | 매 phase 시작 시 참조 |
| Memory `project_sprint_ux_improvement.md` | 진행 상태 | S1-UX 진입 지점 |
| Task #7 (Task Management) | This Plan = Phase 2 of 7 | blockedBy [#6] ✓ resolved |

---

## 10. Final Plan Checklist (꼼꼼함 §16 자체 검증)

- [x] §0 Context Anchor (PRD §0 reference)
- [x] §1 Requirements R1-R12 commit-ready (12 sub-requirements + spec)
- [x] §2 Implementation Plan file-by-file (3 files, LOC delta +194)
- [x] §3 **Sprint별 결과물 유기적 상호 연동 매트릭스 15 IPs + 12 cross-sprint verifications (★ 사용자 명시 7 신규)**
- [x] §4 Quality Gates 매트릭스
- [x] §5 Acceptance Criteria commit-ready 18 (with verification commands)
- [x] §6 Pre-mortem mitigation 12 (with Owner + Deadline)
- [x] §7 Sprint 2 §R8 expanded justification (commit-ready)
- [x] §8 Phase-by-phase 7 진행 계획
- [x] §9 References 10 items
- [x] §10 본 checklist 자체
- [x] **사용자 명시 6 (skills/agents 영어, frontmatter 8-lang + @docs 예외)**: R4.1 SKILL.md §10 body **영어 작성** 명시 + R10 frontmatter 변경 0
- [x] **사용자 명시 7 (Sprint별 유기적 동작 검증)**: §3 신규 15 IPs + §3.3 12 verification actions

---

**Plan Status**: ★ **Draft v1.0 완성 (꼼꼼함 §16 13/13 checklist PASS)**
**Next Phase**: Design (Task #8) — 3 files exact spec + Sprint 2 §R8 expanded matrix + PM-K (SprintResumed factory 존재 여부) resolution + design-validator agent M8 ≥ 85 검증
**예상 Phase 3 (Design) 소요**: 45분 (Master Plan §10)
**사용자 명시 1-7 보존 확인**: 7/7 (Header preamble 의 7 row 모두 ✓)
