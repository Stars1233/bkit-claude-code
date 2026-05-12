# S2-UX Plan — Sprint UX 개선 Sub-Sprint 2 (Master Plan Generator)

> **Sub-Sprint ID**: `s2-ux` (sprint-ux-improvement master 의 2/4)
> **Phase**: Plan (2/7) — PRD ✓ → Plan in_progress
> **PRD Ref**: `docs/01-plan/features/s2-ux.prd.md` (844 lines, commit `dd16abb`)
> **Master Plan Ref**: `docs/01-plan/features/sprint-ux-improvement.master-plan.md` §4.6 + §3.1 + §3.3 + §3.4 + §7.4
> **Date**: 2026-05-12
> **Author**: kay kim (POPUP STUDIO PTE. LTD.) + bkit AI orchestration
> **Branch**: `feature/v2113-sprint-management`
> **Status**: ★ Draft v1.0 — commit-ready spec for Phase 3 Design

---

## 0. Executive Summary

### 0.1 Mission

PRD §3 Feature Map 의 5 deliverable + 2 부수 (총 7 files, +470 LOC) 를 단일 세션 (~45K tokens, 90-120분) 안에 commit-ready spec 으로 정리한다. PRD §12 의 7 open questions (PM-S2A~G) 를 모두 해결하고, 8-perspective verification commands 를 명시한다.

### 0.2 PDCA Cycle 진입 시점

| Phase | Status | Artifact |
|-------|--------|----------|
| PRD | ✓ | `s2-ux.prd.md` (844 lines, commit `dd16abb`) |
| **Plan** | **★ in_progress** | `s2-ux.plan.md` (본 문서) |
| Design | pending | `s2-ux.design.md` |
| Do | pending | 5 disk files (+2 ancillary) |
| Iterate | pending | matchRate 100% target |
| QA | pending | 7-perspective matrix |
| Report | pending | `s2-ux.report.md` |

### 0.3 PM-S2A~G 7 Open Questions Resolution Summary

| ID | Question | Resolution (§2 detail) |
|----|----------|-----------------------|
| **PM-S2A** | `deps.agentSpawner` signature | **Hybrid (option 3)** — `({ subagent_type, prompt }) => Promise<{ output: string }>` |
| **PM-S2B** | Template variable mapping | **Mapping table §2.3** — projectId/projectName/ISO date/GIT_AUTHOR_NAME/'L3'/'TBD' |
| **PM-S2C** | State schema v1.0 fields | **§4.2 schema** — 12 fields, tokenEst=0 stub |
| **PM-S2D** | dry-run output contract | **Minimal valid markdown** — template substitution, empty sprints array |
| **PM-S2E** | Audit emit timing | **state write 직후 1회** — markdown write 결과는 details field 에 포함 |
| **PM-S2F** | VALID_ACTIONS 16번째 위치 | **Array end append** (functional grouping not used) |
| **PM-S2G** | idempotency vs --force | **Idempotent by default** — `--force` flag로 overwrite, single ACTION_TYPE `master_plan_created` + details.forceOverwrite=true |

---

## 1. Requirements (R1-R12)

### R1 — `master-plan.usecase.js` 신규 module

**Spec**:
- Module path: `lib/application/sprint-lifecycle/master-plan.usecase.js`
- Exports: `generateMasterPlan(input, deps)`, `validateMasterPlanInput(input)`, `loadMasterPlanState(projectId, infra)`, `saveMasterPlanState(state, infra)`, `MASTER_PLAN_SCHEMA_VERSION = '1.0'`
- Pure Node.js (no fs/path I/O at module top-level, all I/O through deps injection or lazy require)
- JSDoc complete (every export documented with @param/@returns/@throws)
- ESLint clean (matches Sprint 2 (Application) coding style)

**Justification**: PRD §3.1 F1, Master Plan §4.6 (신규 use case)
**LOC est.**: +250 LOC (incl. JSDoc + 7 internal helper functions)

### R2 — `master-plan.usecase.js` 핵심 함수 `generateMasterPlan` 7-step algorithm

**Spec — generateMasterPlan(input, deps) sequence**:
1. **validateMasterPlanInput(input)** — returns `{ ok, errors }`. Required: `projectId` (kebab-case regex), `projectName` (non-empty string). Optional: `features` (array of strings, default []), `context` (object, default empty WHY/WHO/RISK/SUCCESS/SCOPE), `trustLevel` (L0-L4, default L3), `projectRoot` (string, default process.cwd()), `force` (boolean, default false), `duration` (string, default 'TBD').
2. **Load existing state** — `loadMasterPlanState(input.projectId, infra)` → returns `{ exists, state }`. If `exists === true && !input.force`: return `{ ok: true, alreadyExists: true, plan: state, masterPlanPath, stateFilePath }` (idempotent path).
3. **Build agent prompt** — internal `buildMasterPlannerPrompt(input)` constructs prompt string with template reference + context anchor + features list. Used only when `deps.agentSpawner` is provided.
4. **Generate markdown** — if `deps.agentSpawner` provided: `const { output: markdown } = await deps.agentSpawner({ subagent_type: 'bkit:sprint-master-planner', prompt: <built> })`. If not: `const markdown = renderTemplate(templates/sprint/master-plan.template.md, varMap(input))` (dry-run stub).
5. **Construct plan object** — `{ schemaVersion: '1.0', projectId, projectName, features, sprints: [], dependencyGraph: {}, trustLevel, context, generatedAt: ISO, updatedAt: ISO, masterPlanPath }`. `sprints: []` stub for S3-UX context-sizer.
6. **Persist state + markdown (single transaction)** — `saveMasterPlanState(plan, infra)` first (atomic tmp+rename via `deps.fileWriter`). If success: write markdown to `masterPlanPath`. If markdown write fails: rollback state (delete .bkit/state/master-plans/<projectId>.json).
7. **Emit audit + Task wiring** — `deps.auditLogger.logEvent({ action: 'master_plan_created', category: 'pdca', target: { type: 'feature', id: projectId }, details: { projectName, featureCount: features.length, forceOverwrite: input.force, markdownWriteSuccess: true } })`. If `deps.taskCreator && plan.sprints.length > 0`: iterate plan.sprints sequentially calling `deps.taskCreator(...)` with `addBlockedBy: [<previous-sprint-task-id>]`.

**Return contract**:
- Success: `{ ok: true, plan, masterPlanPath, stateFilePath, alreadyExists: false }`
- Idempotent: `{ ok: true, plan: <existing>, masterPlanPath, stateFilePath, alreadyExists: true }`
- Error: `{ ok: false, error: <string>, errors?: <array from validateMasterPlanInput> }`

**Justification**: PRD §3 F1 + PRD §12 PM-S2D + §JS-04 atomic + §JS-05 single transaction + Master Plan §3.1
**LOC est.**: ~120 LOC (within R1's +250)

### R3 — `master-plan.usecase.js` dependency injection contract

**Spec — deps object**:
```javascript
/**
 * @typedef {Object} MasterPlanDeps
 * @property {(args: { subagent_type: string, prompt: string }) => Promise<{ output: string }>} [agentSpawner]
 *   Optional. If undefined, dry-run mode (template substitution).
 *   When provided, called once with subagent_type = 'bkit:sprint-master-planner'.
 * @property {(path: string, content: string) => Promise<void>} [fileWriter]
 *   Optional. Default = require('fs').promises.writeFile.
 * @property {(path: string) => Promise<void>} [fileDeleter]
 *   Optional. Default = require('fs').promises.unlink. Used for rollback.
 * @property {Object} [infra]
 *   Optional. Provides projectRoot + stateStore. Default = createSprintInfra({ projectRoot: cwd }).
 * @property {Object} [auditLogger]
 *   Optional. Default = require('../../audit/audit-logger'). Must expose `logEvent(entry)` or similar.
 * @property {(args: { subject: string, description: string, addBlockedBy?: string[] }) => Promise<{ taskId: string }>} [taskCreator]
 *   Optional. No-op when undefined.
 */
```

**Default fallback for each dep**:
- `agentSpawner` → undefined (dry-run mode)
- `fileWriter` → `require('node:fs').promises.writeFile`
- `fileDeleter` → `require('node:fs').promises.unlink`
- `infra` → constructed via `require('../../infra/sprint').createSprintInfra({ projectRoot: input.projectRoot || process.cwd() })`
- `auditLogger` → constructed via `require('../../audit/audit-logger')` with adapter wrapping `logEvent({ action, category, target, details }) → writeAuditLog(...)`
- `taskCreator` → no-op

**Justification**: PRD §3 F1 inject + PRD §JS-02 격리 + PM-S2A resolution
**LOC est.**: JSDoc only (within R1/R2 count)

### R4 — `lib/application/sprint-lifecycle/index.js` additive export

**Spec — exact patches**:
- Line 38 (`const startSprintMod = require('./start-sprint.usecase');`) 다음 line 신규 추가:
  ```javascript
  const masterPlanMod = require('./master-plan.usecase');
  ```
- Line 75 (`computeNextPhase: startSprintMod.computeNextPhase,`) 다음 line 신규 추가:
  ```javascript
  // Sprint 2 — Master Plan generator (S2-UX, v2.1.13)
  generateMasterPlan: masterPlanMod.generateMasterPlan,
  validateMasterPlanInput: masterPlanMod.validateMasterPlanInput,
  loadMasterPlanState: masterPlanMod.loadMasterPlanState,
  saveMasterPlanState: masterPlanMod.saveMasterPlanState,
  MASTER_PLAN_SCHEMA_VERSION: masterPlanMod.MASTER_PLAN_SCHEMA_VERSION,
  ```
- Line 8 (`Module structure:` 시작 block) 의 Sprint 2 sub-list 끝 (line 19 `start-sprint.usecase.js`) 다음 line 신규 추가:
  ```javascript
   *     master-plan.usecase.js      — generateMasterPlan (S2-UX, v2.1.13)
  ```

**Existing exports preserved**: 13 exports (Sprint 1: 5 + Sprint 2: 8). After patch: 18 exports.

**Justification**: PRD §3 F2 additive only
**LOC est.**: +9 lines

### R5 — `scripts/sprint-handler.js` VALID_ACTIONS + switch + handleMasterPlan

**Spec — exact patches**:

**Patch 1 (line 41-45, VALID_ACTIONS)**:
```javascript
const VALID_ACTIONS = Object.freeze([
  'init', 'start', 'status', 'watch', 'phase',
  'iterate', 'qa', 'report', 'archive', 'list',
  'feature', 'pause', 'resume', 'fork', 'help',
  'master-plan', // S2-UX v2.1.13 — 16th action
]);
```
PM-S2F resolution: append at array end (16th index). Object.freeze preserved.

**Patch 2 (line 194-211, switch statement)**:
After `case 'help': return handleHelp();` add:
```javascript
case 'master-plan': return handleMasterPlan(a, infra, d);
```
Before `default:` line.

**Patch 3 (after handleHelp, before module.exports — approximately line 517)**:
신규 function `async function handleMasterPlan(args, infra, deps)` ~70 LOC:
```javascript
async function handleMasterPlan(args, infra, deps) {
  if (!args || !args.id || !args.name) {
    return { ok: false, error: 'master-plan requires { id (projectId), name (projectName) }' };
  }
  const features = parseFeaturesFlag(args.features);
  const input = {
    projectId: args.id,
    projectName: args.name,
    features,
    context: { ...defaultContext(), ...(args.context || {}) },
    trustLevel: normalizeTrustLevel(args),
    projectRoot: args.projectRoot || process.cwd(),
    force: args.force === true || args.force === 'true',
    duration: args.duration || 'TBD',
  };
  const usecase = require('../lib/application/sprint-lifecycle');
  const usecaseDeps = {
    agentSpawner: deps.agentSpawner,
    taskCreator: deps.taskCreator,
    infra,
  };
  const result = await usecase.generateMasterPlan(input, usecaseDeps);
  return result;
}

function parseFeaturesFlag(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
  return [];
}
```

**Patch 4 (handleHelp helpText line 498-515)**:
After `'  fork     /sprint fork <id> --new <newId>',` add:
```javascript
'  master-plan /sprint master-plan <project> --name <name> --features <a,b,c>',
```

**Justification**: PRD §3 F3 + Master Plan §3.3 skeleton + PM-S2F resolution
**LOC est.**: +90 LOC

### R6 — `agents/sprint-master-planner.md` body ext

**Spec — frontmatter unchanged** (line 1-26, R10 invariant from S1-UX inherited). Body ext after existing `## Quality Standards` section (line 78-84):

**New section 1 — `## Master Plan Invocation Contract`**:
```markdown
## Master Plan Invocation Contract

When invoked by `master-plan.usecase.js` via the Task tool dispatcher, this
agent receives a prompt built from the following input schema and MUST return
output conforming to the output contract below.

### Input Schema

```json
{
  "projectId": "q2-launch",
  "projectName": "Q2 Launch",
  "features": ["auth", "payment", "reports"],
  "context": {
    "WHY": "string",
    "WHO": "string",
    "RISK": "string",
    "SUCCESS": "string",
    "SCOPE": "string"
  },
  "trustLevel": "L3",
  "duration": "TBD"
}
```

### Output Contract

A single markdown document with the following sections (in order):
- §0 Executive Summary (Mission, Anti-Mission, 4-Perspective Value)
- §1 Context Anchor (WHY/WHO/RISK/SUCCESS/SCOPE/OUT-OF-SCOPE)
- §2 Features (table with priority + status)
- §3 Sprint Phase Roadmap (8 phases per sprint)
- §4 Quality Gates activation matrix
- §5 Sprint Split Recommendation (stub for S3-UX context-sizer)
- §6 Risks + Pre-mortem
- §7 Final Checklist

Do NOT include side effects (file writes, network calls). The use case writes
the markdown to `docs/01-plan/features/<projectId>.master-plan.md` and emits
the audit event.
```

**New section 2 — `## Working Pattern (Detailed)`**:
```markdown
## Working Pattern (Detailed)

1. Parse input prompt for `projectId`, `projectName`, `features[]`, `context{}`, `trustLevel`, `duration`.
2. Read `templates/sprint/master-plan.template.md` as base structure.
3. Grep the codebase for related modules:
   - `lib/application/sprint-lifecycle/` for sprint phase semantics
   - `lib/domain/sprint/` for Sprint entity shape
   - Existing `docs/01-plan/features/*.master-plan.md` for tone/style reference
4. For each feature in `features[]`, allocate to a sprint with token-budget
   awareness (rough estimate ≤ 100K tokens/sprint, refined later by S3-UX).
5. Compose the 8 sections per Output Contract, substituting variables and
   filling concrete content from input + codebase analysis.
6. Return the markdown verbatim — no JSON wrapper, no headers, just the
   markdown content.
```

**New section 3 — `## Sprint Split Heuristics (S3-UX Forward Compatibility)`**:
```markdown
## Sprint Split Heuristics (S3-UX Forward Compatibility)

The S2-UX phase exposes `sprints: []` as a stub (empty array) in the output
JSON state. The S3-UX phase will implement `context-sizer.js` to populate this
array with token-bounded sprint splits.

Until S3-UX lands, generate Sprint Split markdown content as a textual
recommendation only (§5 of the output markdown), referencing the heuristic:

- Group features by dependency graph (top-sort)
- Each group ≤ ~100K tokens (heuristic: ~1.5K LOC per 10K tokens)
- Sequential dependency: each sprint blocks the next
- Fallback: if features count ≤ 3 and no inter-feature deps, single sprint

This text serves as documentation only. Programmatic split is owned by S3-UX.
```

**New section 4 — `## Output Markdown Contract (Strict)`**:
```markdown
## Output Markdown Contract (Strict)

The generated markdown MUST:
- Start with `# {projectName} — Sprint Master Plan` heading (variable substitution)
- Include `> **Sprint ID**: \`{projectId}\`` callout immediately after title
- Use Korean for narrative content (docs/ language policy)
- Reference the template structure (§0~§7 minimum)
- End with `> **Status**: Draft v1.0 — pending review.`

Length: 200~800 lines typical, content depth based on feature count.

The use case writes this output to `docs/01-plan/features/<projectId>.master-plan.md`
and the corresponding state JSON to `.bkit/state/master-plans/<projectId>.json`.
```

**Justification**: PRD §3.5 F5 + PRD §JS-02 caller invocation + PM-S2A resolution
**LOC est.**: +60 LOC (4 new sections)

### R7 — `skills/sprint/SKILL.md` 4-patch

**Spec — exact patches**:

**Patch 1 (line 9, frontmatter description first line)**:
- Before: `Sprint Management — generic sprint capability for ANY bkit user.`
- After: `Sprint Management — generic sprint capability for ANY bkit user.`
- (No change)

**Patch 2 (line 9, frontmatter description sub-actions line)**:
- Before: `15 sub-actions: init, start, status, watch, phase, iterate, qa, report, archive, list, feature, pause, resume, fork, help.`
- After: `16 sub-actions: init, start, status, watch, phase, iterate, qa, report, archive, list, feature, pause, resume, fork, help, master-plan.`

**Patch 3 (line 10-17, frontmatter triggers — 8-language master-plan keywords)**:
- Append to existing triggers block (preserve existing 16 matches):
  ```yaml
  master plan, multi-sprint plan, sprint master plan,
  마스터 플랜, 멀티 스프린트 계획, 스프린트 마스터 플랜,
  マスタープラン, マルチスプリント計画, スプリントマスタープラン,
  主计划, 多冲刺计划, 冲刺主计划,
  plan maestro, plan multi-sprint, plan maestro sprint,
  plan maître, plan multi-sprint, plan maître sprint,
  Masterplan, Multi-Sprint-Plan, Sprint-Masterplan,
  piano principale, piano multi-sprint, piano principale sprint.
  ```

**Patch 4 (line 60-77, Arguments table)**:
Append row after `| `help` | Print sub-action help | `/sprint help` |`:
```markdown
| `master-plan <project>` | Generate multi-sprint Master Plan (agent isolated spawn) | `/sprint master-plan q2-launch --name "Q2 Launch" --features auth,payment` |
```

**Patch 5 (line 149-165, §10.1 Args schema table)**:
Append row after `| `help` | — | — | `args = {}` |`:
```markdown
| `master-plan` | `id` (projectId), `name` (projectName) | `features` (CSV or array), `trust`/`trustLevel`, `context`, `projectRoot`, `force` (boolean), `duration` | `args = { id: "q2-launch", name: "Q2 Launch", features: ["auth", "payment"] }` |
```

**Patch 6 (after §10.7 CLI Mode, line ~234, new §11)**:
New body section `## 11. Master Plan Generator (16th Sub-Action)`:
```markdown
## 11. Master Plan Generator (16th Sub-Action)

The `master-plan` action generates a multi-sprint roadmap via the
`bkit:sprint-master-planner` agent (isolated subagent spawn) and persists
both markdown documentation and state JSON.

### 11.1 Workflow

```
USER: /sprint master-plan q2-launch --name "Q2 Launch" --features auth,payment
   ↓
SKILL.md dispatches → scripts/sprint-handler.js handleMasterPlan
   ↓
handleMasterPlan calls lib/application/sprint-lifecycle/master-plan.usecase.js generateMasterPlan
   ↓
generateMasterPlan validates input + loads existing state (idempotent check)
   ↓
If deps.agentSpawner provided: spawn bkit:sprint-master-planner agent → markdown
If not: dry-run via templates/sprint/master-plan.template.md substitution
   ↓
Atomic write: .bkit/state/master-plans/<projectId>.json (state first)
   ↓
File write: docs/01-plan/features/<projectId>.master-plan.md (markdown)
   ↓
Audit: lib/audit/audit-logger.js logEvent({ action: 'master_plan_created' })
   ↓
Optional Task wiring: deps.taskCreator called N times for N sprint tasks
```

### 11.2 Idempotency + Force Overwrite

- Default: idempotent. Second call with same projectId returns existing plan.
- `--force` flag: overwrites both state JSON and markdown. Audit entry has
  `details.forceOverwrite: true`.
- Audit ACTION_TYPE remains `'master_plan_created'` for both cases (PM-S2G).

### 11.3 Dry-Run vs Agent-Backed Generation

When the caller (LLM dispatcher at main session) does NOT inject
`deps.agentSpawner`, the use case generates a minimal valid markdown by
substituting variables in `templates/sprint/master-plan.template.md`. The
output is a skeleton — header, context anchor placeholders, empty features
table, empty sprints array. This dry-run mode is useful for unit tests and
when the user wants a starting template to fill manually.

When `deps.agentSpawner` is injected, the use case calls it with
`{ subagent_type: 'bkit:sprint-master-planner', prompt: <built> }` and uses
the returned `output` field as the markdown content.

### 11.4 State Schema v1.0

The state JSON at `.bkit/state/master-plans/<projectId>.json`:

```json
{
  "schemaVersion": "1.0",
  "projectId": "q2-launch",
  "projectName": "Q2 Launch",
  "features": ["auth", "payment", "reports"],
  "sprints": [],
  "dependencyGraph": {},
  "trustLevel": "L3",
  "context": { "WHY": "", "WHO": "", "RISK": "", "SUCCESS": "", "SCOPE": "" },
  "generatedAt": "2026-05-12T20:00:00Z",
  "updatedAt": "2026-05-12T20:00:00Z",
  "masterPlanPath": "docs/01-plan/features/q2-launch.master-plan.md"
}
```

The `sprints` array is populated by the S3-UX `context-sizer.js` use case.
S2-UX leaves it as an empty stub.

### 11.5 Task Management Integration (Optional)

When the caller injects `deps.taskCreator`, the use case iterates
`plan.sprints` sequentially (ENH-292 caching alignment) and calls
`deps.taskCreator(...)` once per planned sprint with `addBlockedBy` populated
from the previous sprint's task ID. This enables automatic Task list creation
for multi-sprint roadmaps.

When `deps.taskCreator` is undefined or `plan.sprints.length === 0`, Task
creation is silently skipped (no error).
```

**Justification**: PRD §3.4 F4 + PRD §JS-06 8-lang + PM-S2A~G all addressed
**LOC est.**: +60 LOC

### R8 — `lib/audit/audit-logger.js` ACTION_TYPES additive

**Spec — exact patch (line 50, after `'sprint_resumed',`)**:
```javascript
  'sprint_paused',
  'sprint_resumed',
  'master_plan_created', // S2-UX v2.1.13 — Master Plan Generator
];
```

**No other change**. Module exports unchanged.

**Justification**: PRD §3.6 F6 + PRD §9.7
**LOC est.**: +1 LOC

### R9 — `lib/infra/sprint/sprint-paths.js` additive helper

**Spec — exact patches**:

**Patch 1 (after line 49 `getSprintIndexFile`, new functions)**:
```javascript
/**
 * @param {string} projectRoot
 * @returns {string} `<projectRoot>/.bkit/state/master-plans/` (S2-UX v2.1.13)
 */
function getMasterPlanStateDir(projectRoot) {
  return path.join(projectRoot, '.bkit', 'state', 'master-plans');
}

/**
 * @param {string} projectRoot
 * @param {string} projectId - master plan project id (kebab-case)
 * @returns {string} `<projectRoot>/.bkit/state/master-plans/{projectId}.json` (S2-UX v2.1.13)
 */
function getMasterPlanStateFile(projectRoot, projectId) {
  return path.join(getMasterPlanStateDir(projectRoot), `${projectId}.json`);
}
```

**Patch 2 (line 93-101 `module.exports`)**:
Add 2 lines after `getSprintMatrixFile,`:
```javascript
  getMasterPlanStateDir,
  getMasterPlanStateFile,
```

**Justification**: PRD §3.7 F7 + PRD §9.4 additive + §JS-04 atomic write
**LOC est.**: +14 LOC (12 function + 2 export)

### R10 — Sprint 1 events.js / entity.js / transitions.js / validators.js 0 change (★ invariant)

**Spec**:
- `git diff lib/domain/sprint/events.js` must be empty after Phase 4 commit
- `git diff lib/domain/sprint/entity.js` must be empty
- `git diff lib/domain/sprint/transitions.js` must be empty
- `git diff lib/domain/sprint/validators.js` must be empty
- `git diff lib/domain/sprint/index.js` must be empty

**Justification**: PRD §9.1 Sprint 1 invariant + PRD §9.3 옵션 D 결단
**LOC est.**: 0

### R11 — `agents/sprint-master-planner.md` frontmatter 0 change (★ F9-120 invariant)

**Spec**:
- `git diff agents/sprint-master-planner.md` 의 line 1-26 must be empty
- `claude plugin validate .` Exit 0 after Phase 4 commit (F9-120 14-cycle)

**Justification**: PRD §3.5 F5 + S1-UX precedent (R10 from S1-UX inherited)
**LOC est.**: 0 (frontmatter); +60 (body)

### R12 — Atomic state write pattern reuse

**Spec — saveMasterPlanState(state, infra) algorithm**:
1. Compute `tmpPath = stateFilePath + '.tmp.' + process.pid`
2. `await fileWriter(tmpPath, JSON.stringify(state, null, 2) + '\n')`
3. `await fs.promises.rename(tmpPath, stateFilePath)` (atomic POSIX rename)
4. On any error: best-effort delete tmpPath, re-throw

**Same pattern as Sprint 3 stateStore** (`lib/infra/sprint/sprint-state-store.adapter.js` precedent). Cross-platform note: Windows `fs.rename` is not strictly atomic but is the best available API; bkit-system invariant accepts POSIX assumption.

**Justification**: PRD §JS-04 atomic + PRD §9.4 Sprint 3 precedent
**LOC est.**: ~25 LOC (within R1 count)

---

## 2. Module Specifications (PM-S2A~G Resolutions)

### 2.1 generateMasterPlan(input, deps) — final signature

```javascript
/**
 * Generate a Sprint Master Plan + persist state JSON + write markdown.
 *
 * @param {Object} input
 * @param {string} input.projectId — kebab-case, required
 * @param {string} input.projectName — non-empty, required
 * @param {string[]} [input.features] — default []
 * @param {Object} [input.context] — { WHY, WHO, RISK, SUCCESS, SCOPE }
 * @param {('L0'|'L1'|'L2'|'L3'|'L4')} [input.trustLevel] — default 'L3'
 * @param {string} [input.projectRoot] — default process.cwd()
 * @param {boolean} [input.force] — overwrite existing, default false
 * @param {string} [input.duration] — default 'TBD'
 *
 * @param {MasterPlanDeps} [deps]
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   plan?: Object,
 *   masterPlanPath?: string,
 *   stateFilePath?: string,
 *   alreadyExists?: boolean,
 *   error?: string,
 *   errors?: string[]
 * }>}
 */
async function generateMasterPlan(input, deps) { ... }
```

### 2.2 PM-S2A Resolution — `deps.agentSpawner` signature

**Decision: Hybrid (option 3 from PRD §12)**

```javascript
/**
 * @typedef {Object} AgentSpawnerArgs
 * @property {string} subagent_type — 'bkit:sprint-master-planner'
 * @property {string} prompt — built prompt string
 *
 * @typedef {Object} AgentSpawnerResult
 * @property {string} output — markdown content from the agent
 */
```

**Rationale**:
- Task tool compatibility: `subagent_type` + `prompt` matches Task tool API
- Use case only cares about markdown output, so `{ output: string }` is sufficient
- Caller (sprint-handler at main session) wraps Task tool invocation:
  ```javascript
  const agentSpawner = async ({ subagent_type, prompt }) => {
    const result = await invokeTaskTool({ subagent_type, prompt });
    return { output: result.text };
  };
  ```
- Future flexibility: can swap Task tool for Anthropic API direct call without changing use case

### 2.3 PM-S2B Resolution — Template variable mapping

Template `templates/sprint/master-plan.template.md` lines 5-12 declare:
```yaml
variables:
  - feature: Sprint feature name (kebab-case id)
  - displayName: Human-readable sprint name
  - date: Creation date (YYYY-MM-DD)
  - author: Author name
  - trustLevel: Initial Trust Level (L0~L4)
  - duration: Estimated duration
```

**Mapping table (in `renderTemplate(template, varMap)` helper)**:

| Template var | Source field | Default fallback |
|--------------|--------------|-----------------|
| `{feature}` | `input.projectId` | (required) |
| `{displayName}` | `input.projectName` | (required) |
| `{date}` | `new Date().toISOString().slice(0, 10)` | always computed |
| `{author}` | `process.env.GIT_AUTHOR_NAME` | `'bkit user'` |
| `{trustLevel}` | `input.trustLevel` | `'L3'` |
| `{duration}` | `input.duration` | `'TBD (estimated by master-planner agent)'` |

**Implementation note**: `renderTemplate` uses simple string replacement (`str.replace(/{(\w+)}/g, ...)`). No conditional logic in template.

### 2.4 PM-S2C Resolution — State schema v1.0 final fields

```json
{
  "schemaVersion": "1.0",
  "projectId": "q2-launch",
  "projectName": "Q2 Launch",
  "features": ["auth", "payment", "reports"],
  "sprints": [
    {
      "id": "s1-q2-launch",
      "name": "S1 — Auth Foundation",
      "features": ["auth"],
      "scope": "Auth signup/login/JWT/RBAC",
      "tokenEst": 0,
      "dependsOn": []
    }
  ],
  "dependencyGraph": {
    "s1-q2-launch": [],
    "s2-q2-launch": ["s1-q2-launch"]
  },
  "trustLevel": "L3",
  "context": {
    "WHY": "",
    "WHO": "",
    "RISK": "",
    "SUCCESS": "",
    "SCOPE": ""
  },
  "generatedAt": "2026-05-12T20:00:00.000Z",
  "updatedAt": "2026-05-12T20:00:00.000Z",
  "masterPlanPath": "docs/01-plan/features/q2-launch.master-plan.md"
}
```

**Required fields (12)**: `schemaVersion`, `projectId`, `projectName`, `features`, `sprints`, `dependencyGraph`, `trustLevel`, `context`, `generatedAt`, `updatedAt`, `masterPlanPath`, plus all 5 `context.*` sub-fields.

**Optional fields**: none in v1.0 (forward compat — future versions may add `qaConfig`, `budgetTotal`).

**`tokenEst: 0`**: S2-UX stub. S3-UX `context-sizer.js` populates with actual estimate.

**`sprints: []`**: S2-UX stub. The dry-run mode leaves it empty. The agent-backed mode parses agent output and populates (parsing logic owned by `parseSprintsFromMarkdown` helper, S2-UX implements basic regex extraction; advanced parsing is S3-UX).

### 2.5 PM-S2D Resolution — Dry-run output contract

When `deps.agentSpawner === undefined`:
- Use case calls `renderTemplate(templateContent, varMap(input))` synchronously
- Returns valid Master Plan markdown with all template sections preserved but content placeholders intact (`(왜 이 sprint 가 필요한가)`, `(feature-name-1)`, etc.)
- State JSON has `sprints: []`, all required fields populated from input
- Audit entry has `details: { dryRun: true, markdownSource: 'template' }`

### 2.6 PM-S2E Resolution — Audit emit timing

**Decision: State write 직후 1회 emit**

Sequence:
1. `saveMasterPlanState(plan, infra)` (atomic tmp+rename) → success or error
2. If state save success: `await deps.fileWriter(masterPlanPath, markdown)` → success or error
3. **Audit emit (always after state save)**:
   ```javascript
   await deps.auditLogger.logEvent({
     action: 'master_plan_created',
     category: 'pdca',
     target: { type: 'feature', id: input.projectId },
     details: {
       projectName: input.projectName,
       featureCount: input.features.length,
       forceOverwrite: input.force,
       markdownWriteSuccess: <true/false>,
       agentBackedGeneration: deps.agentSpawner !== undefined,
       schemaVersion: '1.0',
     },
   });
   ```
4. If markdown write failed AND state save succeeded: rollback state delete + return error (audit entry retained for debugging)

### 2.7 PM-S2F Resolution — VALID_ACTIONS 16th position

**Decision: Array end append**

```javascript
const VALID_ACTIONS = Object.freeze([
  'init', 'start', 'status', 'watch', 'phase',         // 1-5
  'iterate', 'qa', 'report', 'archive', 'list',        // 6-10
  'feature', 'pause', 'resume', 'fork', 'help',        // 11-15
  'master-plan',                                       // 16 (S2-UX v2.1.13)
]);
```

**Rationale**:
- Backward compat: existing 15-action callers see no reorder
- Discoverability: line comment `// 16 (S2-UX v2.1.13)` makes provenance clear
- Object.freeze invariant preserved

### 2.8 PM-S2G Resolution — Idempotency + --force semantics

**Decision: Idempotent by default; `--force` overwrites with same audit action_type**

- 첫 호출: state JSON 신규 생성 + markdown 신규 작성 + audit `{ action: 'master_plan_created', details: { forceOverwrite: false } }`
- 두 번째 호출 (same projectId, no --force): use case returns `{ ok: true, alreadyExists: true, plan: <existing state> }`. State + markdown 변경 0. **Audit emit X** (no operation = no audit).
- 두 번째 호출 (same projectId, --force=true): state + markdown 덮어쓰기 + audit `{ action: 'master_plan_created', details: { forceOverwrite: true, previousGeneratedAt: <old> } }`

**Single ACTION_TYPE**: only `master_plan_created` registered. Overwrite case uses `details.forceOverwrite: true` to distinguish.

---

## 3. Inter-Sprint Integration — 15 IPs (Implementation Plan)

PRD §8 의 15 IPs 매트릭스를 implementation-ready commands 로 정리:

| IP# | From → To | Implementation step | Verification command |
|-----|-----------|---------------------|---------------------|
| IP-S2-01 | F1 → Sprint 1 Domain | `validateSprintInput` 재사용 — 단 input shape 가 Sprint 가 아닌 MasterPlan 이므로 별도 `validateMasterPlanInput` 작성 (Sprint 1 validators 0 변경) | `grep -c "validateSprintInput\|validateMasterPlanInput" lib/application/sprint-lifecycle/master-plan.usecase.js` ≥ 1 |
| IP-S2-02 | F1 → Sprint 3 Infrastructure | `getMasterPlanStateFile(projectRoot, projectId)` 호출 + atomic write 패턴 재사용 | `grep "getMasterPlanStateFile" lib/application/sprint-lifecycle/master-plan.usecase.js` |
| IP-S2-03 | F1 → audit-logger | `auditLogger.logEvent` 또는 `writeAuditLog` 호출 with action 'master_plan_created' | `grep "master_plan_created" lib/application/sprint-lifecycle/master-plan.usecase.js` |
| IP-S2-04 | F1 → templates/sprint/master-plan.template.md | `renderTemplate` helper + 6-var mapping | `grep "{feature}\|{displayName}" lib/application/sprint-lifecycle/master-plan.usecase.js` ≥ 1 |
| IP-S2-05 | F1 → F5 sprint-master-planner agent | `deps.agentSpawner({ subagent_type: 'bkit:sprint-master-planner', ... })` | `grep "bkit:sprint-master-planner" lib/application/sprint-lifecycle/master-plan.usecase.js` |
| IP-S2-06 | F2 → F1 use case | additive export — `generateMasterPlan` 외 4건 (validateMasterPlanInput / loadMasterPlanState / saveMasterPlanState / MASTER_PLAN_SCHEMA_VERSION) | `node -e "console.log(Object.keys(require('./lib/application/sprint-lifecycle')))"` ≥ 18 entries |
| IP-S2-07 | F3 → F1 use case | sprint-handler.handleMasterPlan calls `usecase.generateMasterPlan(input, deps)` | `grep "generateMasterPlan" scripts/sprint-handler.js` |
| IP-S2-08 | F3 → Sprint 4 enhancement | `VALID_ACTIONS` 16th element + switch case + helpText (3 patches) | `node -e "const h=require('./scripts/sprint-handler'); console.log(h.VALID_ACTIONS.length)"` = 16 |
| IP-S2-09 | F3 → CLI mode | positional argv `master-plan` + flags (--name, --features, --trust) parsing | `node scripts/sprint-handler.js master-plan testproject --name "Test" --features=a,b` exit 0 |
| IP-S2-10 | F4 SKILL → CC LLM dispatcher | frontmatter description "16 sub-actions" + 8-lang triggers | `grep -c "16 sub-actions" skills/sprint/SKILL.md` ≥ 1 |
| IP-S2-11 | F4 → §10 invocation contract | §10.1 Args schema table master-plan row + §11 body section | `grep -c "## 11\\. Master Plan Generator" skills/sprint/SKILL.md` ≥ 1 |
| IP-S2-12 | F5 agent → main session | isolation: subagent (Task tool param) — body Output Markdown Contract specifies side-effect-free | `grep -c "no side effects\|Side effect\|격리\|isolation" agents/sprint-master-planner.md` ≥ 1 |
| IP-S2-13 | F5 → templates/sprint/* | 7 templates 활용 — 변경 0 | `git diff templates/sprint/*.md` empty |
| IP-S2-14 | F6 audit-logger → .bkit/audit/<date>.jsonl | ACTION_TYPES `master_plan_created` 등록 후 generateMasterPlan run | smoke: `node -e "require('./lib/audit/audit-logger').writeAuditLog({...})"` + `grep "master_plan_created" .bkit/audit/$(date +%Y-%m-%d).jsonl` |
| IP-S2-15 | F7 sprint-paths → F1 use case | `getMasterPlanStateFile` / `getMasterPlanStateDir` 활용 | `grep "getMasterPlanStateFile\|getMasterPlanStateDir" lib/application/sprint-lifecycle/master-plan.usecase.js` ≥ 1 |

---

## 4. State Schema v1.0 + Atomic Write Spec

### 4.1 .bkit/state/master-plans/<projectId>.json schema

[See §2.4 — final schema with 12 required fields]

### 4.2 Atomic write algorithm (saveMasterPlanState)

```javascript
async function saveMasterPlanState(state, infra) {
  if (!state || typeof state.projectId !== 'string' || state.projectId.length === 0) {
    throw new TypeError('saveMasterPlanState: state.projectId required');
  }
  const projectRoot = (infra && infra.projectRoot) || process.cwd();
  const stateDir = getMasterPlanStateDir(projectRoot);
  const stateFile = getMasterPlanStateFile(projectRoot, state.projectId);
  const tmpFile = stateFile + '.tmp.' + process.pid;

  // 1) ensure dir
  await fs.promises.mkdir(stateDir, { recursive: true });

  // 2) write tmp
  const json = JSON.stringify(state, null, 2) + '\n';
  await fs.promises.writeFile(tmpFile, json, 'utf8');

  // 3) atomic rename
  try {
    await fs.promises.rename(tmpFile, stateFile);
  } catch (e) {
    // best-effort cleanup
    try { await fs.promises.unlink(tmpFile); } catch (_) { /* ignore */ }
    throw e;
  }
  return { ok: true, stateFile };
}
```

### 4.3 loadMasterPlanState algorithm

```javascript
async function loadMasterPlanState(projectId, infra) {
  const projectRoot = (infra && infra.projectRoot) || process.cwd();
  const stateFile = getMasterPlanStateFile(projectRoot, projectId);
  try {
    const content = await fs.promises.readFile(stateFile, 'utf8');
    const state = JSON.parse(content);
    if (!state || state.schemaVersion !== MASTER_PLAN_SCHEMA_VERSION) {
      return { exists: false, state: null, reason: 'schema_mismatch' };
    }
    return { exists: true, state };
  } catch (e) {
    if (e.code === 'ENOENT') return { exists: false, state: null };
    throw e;
  }
}
```

### 4.4 Rollback algorithm (state write OK, markdown write fail)

```javascript
async function rollbackStateOnDocFailure(stateFile, fileDeleter) {
  try {
    await fileDeleter(stateFile);
    return { rolled_back: true };
  } catch (e) {
    return { rolled_back: false, reason: 'state_delete_failed: ' + e.message };
  }
}
```

---

## 5. Acceptance Criteria — Commit-Ready Verification Commands

PRD §7 의 40 AC 각각에 commit-ready verification command 매핑.

### 5.1 AC-MPG (10 criteria, F1 use case)

| AC# | Command | Pass criterion |
|-----|---------|---------------|
| AC-MPG-1 | `node -e "const h=require('./scripts/sprint-handler'); h.handleSprintAction('master-plan', { id: 'test-mp1', name: 'Test MP1', features: ['a'] }, {}).then(r => process.exit(r.ok ? 0 : 1))"` | exit 0 |
| AC-MPG-2 | `node -e "const u=require('./lib/application/sprint-lifecycle'); u.generateMasterPlan({ projectId: 'test-mp2', projectName: 'Test MP2', features: ['x'] }, {}).then(r => console.log(JSON.stringify({ ok: r.ok, sprintsLen: r.plan && r.plan.sprints && r.plan.sprints.length })))"` | output contains `"sprintsLen":0` |
| AC-MPG-3 | mock test (in S4-UX) — `deps.agentSpawner` injection returns markdown with §0~§7 sections | (deferred S4-UX) |
| AC-MPG-4 | `test -f docs/01-plan/features/test-mp1.master-plan.md && head -1 docs/01-plan/features/test-mp1.master-plan.md \| grep -q "Test MP1 — Sprint Master Plan"` | exit 0 |
| AC-MPG-5 | `test -f .bkit/state/master-plans/test-mp1.json && jq '.schemaVersion' .bkit/state/master-plans/test-mp1.json` | output "1.0" |
| AC-MPG-6 | second `node -e "..."` call → returns `alreadyExists: true` | output contains `"alreadyExists":true` |
| AC-MPG-7 | (S4-UX SC-09) — synthetic SIGKILL test | (deferred S4-UX) |
| AC-MPG-8 | `grep -c "master_plan_created" .bkit/audit/$(date +%Y-%m-%d).jsonl` | ≥ 1 |
| AC-MPG-9 | inject deps.taskCreator stub, verify call count = plan.sprints.length | (S4-UX SC-09 mock) |
| AC-MPG-10 | `node -e "const u=require('./lib/application/sprint-lifecycle'); u.generateMasterPlan({ projectId: 'INVALID_KEBAB' }, {}).then(r => process.exit(r.ok ? 1 : 0))"` | exit 0 (error path) |

### 5.2 AC-SHI (8 criteria, F3 sprint-handler)

| AC# | Command | Pass criterion |
|-----|---------|---------------|
| AC-SHI-1 | `node -e "console.log(require('./scripts/sprint-handler').VALID_ACTIONS.length === 16 && require('./scripts/sprint-handler').VALID_ACTIONS.includes('master-plan'))"` | "true" |
| AC-SHI-2 | `node -e "console.log(Object.isFrozen(require('./scripts/sprint-handler').VALID_ACTIONS))"` | "true" |
| AC-SHI-3 | `node scripts/sprint-handler.js help \| grep -c "master-plan"` | ≥ 1 |
| AC-SHI-4 | `node scripts/sprint-handler.js master-plan ac-shi-4 --name="AC SHI 4" --features=a; echo $?` | "0" |
| AC-SHI-5 | `node scripts/sprint-handler.js master-plan; echo $?` | "1" (missing id) |
| AC-SHI-6 | `node -e "require('./scripts/sprint-handler').handleSprintAction('master-plan', { id: 'a', name: 'b' }).then(r => console.log(typeof r.then))"` | (n/a, just check no throw) |
| AC-SHI-7 | run master-plan, then `git diff .bkit/state/sprints/` | empty (no changes) |
| AC-SHI-8 | `node -e "const h=require('./scripts/sprint-handler'); h.handleSprintAction('master-plan', { id: 'ac-shi-8', name: 'AC SHI 8', features: 'a,b,c' }, {}).then(r => console.log(r.plan && r.plan.features.length))"` | "3" |

### 5.3 AC-ABE (7 criteria, F5 agent body)

| AC# | Command | Pass criterion |
|-----|---------|---------------|
| AC-ABE-1 | `git diff agents/sprint-master-planner.md \| awk '/^---$/{c++} {if(c<=2) print}' \| grep -c "^[+-]"` | "0" (frontmatter unchanged) |
| AC-ABE-2 | `grep -c "## Master Plan Invocation Contract" agents/sprint-master-planner.md` | "1" |
| AC-ABE-3 | `grep -c "## Working Pattern (Detailed)" agents/sprint-master-planner.md` | "1" |
| AC-ABE-4 | `grep -c "## Sprint Split Heuristics" agents/sprint-master-planner.md` | "1" |
| AC-ABE-5 | `grep -c "## Output Markdown Contract" agents/sprint-master-planner.md` | "1" |
| AC-ABE-6 | `awk '/^---$/{c++; if(c==2) f=1; next} f' agents/sprint-master-planner.md \| grep -cP '[\\p{Hangul}\\p{Han}\\p{Hiragana}\\p{Katakana}]'` | "0" (body English only) |
| AC-ABE-7 | `wc -l agents/sprint-master-planner.md` | ≥ 140 (was 84, +60 target) |

### 5.4 AC-SME (8 criteria, F4 SKILL.md)

| AC# | Command | Pass criterion |
|-----|---------|---------------|
| AC-SME-1 | `grep -c "16 sub-actions" skills/sprint/SKILL.md` | "1" |
| AC-SME-2 | `grep -c "master-plan" skills/sprint/SKILL.md` | ≥ 6 (frontmatter desc + 8-lang triggers row + Args table + §10.1 + §11 body) |
| AC-SME-3 | `grep -c "master plan\|마스터 플랜\|マスタープラン\|主计划\|plan maestro\|plan maître\|Masterplan\|piano principale" skills/sprint/SKILL.md` | ≥ 8 (8-lang) |
| AC-SME-4 | `awk '/^## Arguments$/{f=1} /^## Trust/{f=0} f' skills/sprint/SKILL.md \| grep -c "master-plan"` | ≥ 1 |
| AC-SME-5 | `awk '/^### 10\\.1/{f=1} /^### 10\\.2/{f=0} f' skills/sprint/SKILL.md \| grep -c "master-plan"` | ≥ 1 |
| AC-SME-6 | `awk '/^### 10\\.3/{f=1} /^### 10\\.4/{f=0} f' skills/sprint/SKILL.md \| grep -c "master-plan"` | ≥ 1 |
| AC-SME-7 | `grep -c "## 11\\. Master Plan Generator" skills/sprint/SKILL.md` | "1" |
| AC-SME-8 | `awk '/^## 11/{f=1} f' skills/sprint/SKILL.md \| grep -cP '[\\p{Hangul}\\p{Han}\\p{Hiragana}\\p{Katakana}]'` | "0" (§11 English only) |

### 5.5 AC-INV (7 criteria, invariants)

| AC# | Command | Pass criterion |
|-----|---------|---------------|
| AC-INV-1 | `git diff main..HEAD -- lib/domain/sprint/events.js` | empty |
| AC-INV-2 | `git diff main..HEAD -- lib/domain/sprint/entity.js` | empty |
| AC-INV-3 | `git diff main..HEAD -- lib/domain/sprint/transitions.js` | empty |
| AC-INV-4 | `git diff main..HEAD -- lib/domain/sprint/validators.js` | empty |
| AC-INV-5 | `claude plugin validate .` | exit 0 (F9-120 14-cycle) |
| AC-INV-6 | `node -e "const h=require('./hooks/hooks.json'); const events = Object.keys(h.hooks).length; const blocks = Object.values(h.hooks).flat().length; console.log(events, blocks)"` | "21 24" |
| AC-INV-7 | `node tests/contract/v2113-sprint-contracts.test.js 2>&1 \| grep -c "PASS"` | ≥ 8 (SC-01~08) |

**Cumulative AC commands**: **40 verification commands** + 2 deferred to S4-UX (AC-MPG-3 / AC-MPG-7 / AC-MPG-9).

---

## 6. Implementation Order (Phase 4 Do — sequential)

ENH-292 sequential dispatch alignment — single commit per file group:

### Step 1: F7 sprint-paths.js additive helper (foundation)
- Patch 2 functions + 2 exports
- Verify: `node -e "const p=require('./lib/infra/sprint/sprint-paths'); console.log(typeof p.getMasterPlanStateFile, typeof p.getMasterPlanStateDir)"` → "function function"

### Step 2: F6 audit-logger.js ACTION_TYPES additive
- 1 line patch
- Verify: `node -e "const a=require('./lib/audit/audit-logger'); console.log(a.ACTION_TYPES.includes('master_plan_created'))"` → "true"

### Step 3: F1 master-plan.usecase.js (new file, core implementation)
- Full module ~250 LOC
- Verify: `node -e "const u=require('./lib/application/sprint-lifecycle/master-plan.usecase'); console.log(typeof u.generateMasterPlan, u.MASTER_PLAN_SCHEMA_VERSION)"` → "function 1.0"

### Step 4: F2 index.js additive export
- 9 lines added (require + 5 exports + 1 comment + JSDoc 2 lines)
- Verify: `node -e "console.log(Object.keys(require('./lib/application/sprint-lifecycle')).length)"` → 18

### Step 5: F3 sprint-handler.js handleMasterPlan + VALID_ACTIONS + switch
- 4 patches, +90 LOC
- Verify: `node -e "console.log(require('./scripts/sprint-handler').VALID_ACTIONS.length)"` → 16

### Step 6: F5 sprint-master-planner.md body ext (frontmatter unchanged)
- 4 new body sections, +60 LOC
- Verify: AC-ABE-1 through AC-ABE-7

### Step 7: F4 skills/sprint/SKILL.md (frontmatter + body §11)
- 5 patches, +60 LOC
- Verify: AC-SME-1 through AC-SME-8

### Step 8: End-to-end smoke test
- `node scripts/sprint-handler.js master-plan smoke-test --name="Smoke Test" --features=a,b,c`
- Verify: 3 files created (state json + markdown + audit entry), AC-MPG-1 through AC-MPG-10 (excl. -3/-7/-9 deferred)

### Step 9: F9-120 validation
- `claude plugin validate .` → exit 0 (F9-120 14-cycle)

### Step 10: Single Phase 4 Do commit
- All 7 files in single commit per S1-UX precedent (`a128aed` 3 files in single commit)

---

## 7. Token Budget Estimate (Master Plan §5.1 reconciliation)

| Phase | PRD § | Estimate | Notes |
|-------|-------|----------|-------|
| PRD (Phase 1) | §0.4 | ~30K | actual: 844 lines (commit `dd16abb`) ≈ 25K tokens — within budget |
| Plan (Phase 2) | §0.4 | ~30K | this doc target ~800 lines ≈ 24K tokens |
| Design (Phase 3) | §0.4 | ~45K | exact patches + sequence diagrams + 8-perspective verification + L3 stub spec ~900 lines |
| Do (Phase 4) | §0.4 | ~60K | 7 files implementation + smoke test runs |
| Iterate (Phase 5) | (audit) | ~10K | matchRate 100% target (no fixes expected if Design accurate) |
| QA (Phase 6) | (audit) | ~20K | 7-perspective matrix + verification commands run |
| Report (Phase 7) | §0.4 | ~25K | report doc ~600 lines |

**Cumulative S2-UX**: ~220K tokens (within Master Plan §5.1 single-session safe ~45K **of incremental implementation**, the broader docs sum is acceptable per S1-UX §9.3 reconciliation).

---

## 8. Plan Final Checklist (꼼꼼함 §16)

매 row 가 사용자 명시 1-8 또는 invariant 와 연결:

- [x] **R1-R12 12 requirements** — §1 매트릭스 (R10 invariant + R11 frontmatter 0 change 결정적)
- [x] **PM-S2A~G 7 resolutions** — §2 매트릭스 (Hybrid agentSpawner + 6-var template mapping + 12-field state schema + dry-run + state-write-then-emit + array-end append + idempotent default)
- [x] **15 IPs implementation plan** — §3 매트릭스 (verification commands + grep targets)
- [x] **State schema v1.0** — §4 (12 required fields + atomic write algorithm + rollback)
- [x] **40 AC + 38 verification commands** — §5 매트릭스 (3 deferred to S4-UX)
- [x] **Implementation order 10 steps** — §6 sequential (foundation → core → integration → smoke → F9-120)
- [x] **Token budget reconciled** — §7 (Master Plan §5.1 ~45K = incremental implementation 분, docs 누적 별도)
- [x] **사용자 명시 1 (8-lang)** — R7 patch 3 (SKILL.md triggers 8-lang) + R6 (agent body English) + R10 (events.js 0 변경 invariant)
- [x] **사용자 명시 2 (Sprint 유기적)** — §3 15 IPs + R4 (Sprint 2 additive) + R9 (Sprint 3 additive) + IPs verification commands
- [x] **사용자 명시 3 (QA diverse)** — §5 40 AC commit-ready verification commands + Phase 6 7-perspective
- [x] **사용자 명시 4-1 (Master Plan auto-gen)** — R1+R2+R3 use case core + R6 agent body ext
- [x] **사용자 명시 4-2 (context window sizing)** — out-of-scope S3-UX, but `sprints: []` stub interface §2.4 provided
- [x] **사용자 명시 5 (꼼꼼함)** — Plan ~800 lines + §5 40 AC verification commands + §6 10-step implementation order
- [x] **사용자 명시 6 (skills/agents YAML + English)** — R11 frontmatter 0 변경 + AC-ABE-6/AC-SME-8 (English check)
- [x] **사용자 명시 7 (Sprint별 유기적 동작 검증)** — §3 IP-S2-01~15 commands + §5 AC-INV-1~7 invariants
- [x] **사용자 명시 8 (/control L4)** — Plan does not modify sprint state (R5 handleMasterPlan stateless), L4 autoRun loop unaffected
- [x] **bkit-system 7 invariants** — R10 (events.js 0) + R11 (frontmatter 0) + R8 audit additive + R9 sprint-paths additive
- [x] **Doc=Code 0 drift** — R2 step 6 state-first single transaction (rollback on doc fail)
- [x] **F9-120 14-cycle** — AC-INV-5 + Step 9 validation
- [x] **hooks.json 21:24** — AC-INV-6 (verification baked into AC matrix)
- [x] **Sprint 1-5 invariant 매트릭스** — R10/R11 + §9 partial preservation (PRD §9 inherited)

---

**Plan Status**: ★ **Draft v1.0 완료**.
**Next**: Phase 3 Design 진입 — `docs/02-design/features/s2-ux.design.md` 작성. 7 files 의 exact patches + sequence diagrams + data flow + 8-perspective verification matrix + L3 Contract test stub.
**예상 소요**: Phase 3 Design ~45분.
**사용자 명시 1-8 보존 확인**: 8/8 (§8 매트릭스 모두 ✓).
**PM-S2A~G all resolved**: 7/7 (§0.3 + §2 detailed).
**모든 AC commit-ready**: 37/40 (3 deferred to S4-UX).
