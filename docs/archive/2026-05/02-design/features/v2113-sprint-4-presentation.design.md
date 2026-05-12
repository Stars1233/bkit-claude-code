# Sprint 4 Design — v2.1.13 Sprint Management Presentation

> **Sprint ID**: `v2113-sprint-4-presentation`
> **Phase**: Design (3/7)
> **Date**: 2026-05-12
> **PRD**: v2113-sprint-4-presentation.prd.md
> **Plan**: v2113-sprint-4-presentation.plan.md
> **Depends on**: Sprint 1/2/3 (immutable)

---

## 0. Context Anchor (보존)

| Key | Value |
|-----|-------|
| WHY | 사용자 표면 영구화 + ★ 8개국어 트리거 결정적 + ★ Sprint 1+2+3+4 유기적 |
| WHO | bkit 사용자 (8개국어) + Sprint 5 + CI + audit/control |
| RISK | 8개국어 누락 / 코드 한글 / cross-sprint 단절 / plugin validate / B1-133 / Sprint 1/2/3 invariant / audit enum / control / hooks invariant / abbreviation |
| SUCCESS | 19 changes (17 new + 2 ext) + 5/5 8개국어 + 영어 코드 + 7 templates 한국어 + plugin validate Exit 0 + invariant 0 + 30+ TC + 8+ CSI-04 PASS |
| SCOPE | In: skills/sprint/ + agents/sprint-* + templates/sprint/ + scripts/sprint-handler.js + lib/control & lib/audit ext. Out: Sprint 5~6 |

---

## 1. 코드베이스 깊이 분석

### 1.1 Existing Skill 패턴 (bkit:control / bkit:pdca / bkit:bkit)

| Pattern | Reference |
|---------|----------|
| Frontmatter `name` (lowercase, kebab-case) | `skills/control/SKILL.md:2` |
| Frontmatter `classification: workflow` | `skills/control/SKILL.md:3` |
| Frontmatter `description: |` multiline + Triggers line | `skills/control/SKILL.md:7-9` |
| Frontmatter `argument-hint` | `skills/control/SKILL.md:10` |
| Frontmatter `user-invocable: true` | `skills/control/SKILL.md:11` |
| Frontmatter `allowed-tools` array | `skills/control/SKILL.md:12-18` |
| Frontmatter `agents:` map | `skills/pdca/SKILL.md:12-15` |
| Frontmatter `task-template` | `skills/control/SKILL.md:23` |

**Sprint skill frontmatter**: PDCA + Control 패턴 정합. 8개국어 triggers 추가 시 description 230자 미만 보장.

### 1.2 Existing Agent 패턴 (cto-lead.md / qa-lead.md)

8개국어 triggers 풀세트 reference (`agents/cto-lead.md:7-15`):
```
Triggers: team, project lead, architecture decision, CTO, tech lead, team coordination,
팀 구성, 프로젝트 리드, 기술 결정, CTO, 팀장, 팀 조율,
チームリード, プロジェクト開始, 技術決定, CTO, チーム編成,
团队领导, 项目启动, 技术决策, CTO, 团队协调,
líder del equipo, decisión técnica, CTO, coordinación de equipo,
chef d'équipe, décision technique, CTO, coordination d'équipe,
Teamleiter, technische Entscheidung, CTO, Teamkoordination,
leader del team, decisione tecnica, CTO, coordinamento del team
```

**8개국어 풀세트 패턴**:
- Each language line: 3+ keywords separated by ","
- Order: EN → KO → JA → ZH → ES → FR → DE → IT (cto-lead 패턴)

### 1.3 audit-logger ACTION_TYPES enum (lib/audit/audit-logger.js:31-49)

```javascript
// CURRENT (16 entries):
const ACTION_TYPES = [
  'phase_transition', 'feature_created', 'feature_archived',
  'file_created', 'file_modified', 'file_deleted',
  'config_changed', 'automation_level_changed', 'checkpoint_created',
  'rollback_executed', 'agent_spawned', 'agent_completed', 'agent_failed',
  'gate_passed', 'gate_failed', 'destructive_blocked',
];
```

**Sprint 4 변경**: push 2 entries (`sprint_paused`, `sprint_resumed`). 기존 16 entry 0 변경.

### 1.4 automation-controller.js (lib/control/automation-controller.js:26-32)

```javascript
const AUTOMATION_LEVELS = {
  MANUAL: 0, GUIDED: 1, SEMI_AUTO: 2, AUTO: 3, FULL_AUTO: 4,
};
```

**Sprint 4 변경**: 신규 `SPRINT_AUTORUN_SCOPE` Object.freeze (5 levels L0~L4) + module.exports 에 추가. 기존 export 0 변경.

### 1.5 Sprint 2 `start-sprint.usecase.js` SPRINT_AUTORUN_SCOPE inline (line 41~)

```javascript
const SPRINT_AUTORUN_SCOPE = Object.freeze({
  L0: Object.freeze({ stopAfter: 'prd',      manual: true,  requireApproval: true,  hint: false }),
  L1: Object.freeze({ stopAfter: 'prd',      manual: true,  requireApproval: true,  hint: true  }),
  L2: Object.freeze({ stopAfter: 'design',   manual: false, requireApproval: true,  hint: false }),
  L3: Object.freeze({ stopAfter: 'report',   manual: false, requireApproval: true,  hint: false }),
  L4: Object.freeze({ stopAfter: 'archived', manual: false, requireApproval: false, hint: false }),
});
```

**Sprint 4 변경**: lib/control 에 동일 shape mirror 추가 (Sprint 2 inline 보존 — invariant 0 변경). Sprint 5 또는 v2.1.14 에서 Sprint 2 inline 제거 + lib/control reference 만 사용.

### 1.6 Sprint 3 createSprintInfra (lib/infra/sprint/index.js)

```javascript
function createSprintInfra({ projectRoot, otelEndpoint?, agentId?, parentAgentId? }) → {
  stateStore, eventEmitter, docScanner, matrixSync,
}
```

**Sprint 4 sprint-handler.js 사용**:
```javascript
const infra = createSprintInfra({
  projectRoot: process.cwd(),
  otelEndpoint: process.env.OTEL_ENDPOINT,
  agentId: process.env.CLAUDE_AGENT_ID,
});
// → use lifecycle.startSprint(input, { stateStore: infra.stateStore, eventEmitter: infra.eventEmitter.emit, ... })
```

### 1.7 templates/ 패턴 (templates/plan.template.md)

```yaml
---
template: plan
version: 1.3
description: PDCA Plan phase document template
variables:
  - feature: Feature name
  - date: Creation date
  - author: Author
---
```

**Sprint 4 templates/sprint/* frontmatter** 동일 패턴. 본문 한국어 (사용자 docs 생성용, ★ 사용자 명시 `@docs 예외`).

### 1.8 hooks/hooks.json 21 events 24 blocks invariant

```bash
$ jq '.hooks | keys' hooks/hooks.json
# 21 keys (event names)
$ jq '[.hooks[][]?.hooks[]?] | length' hooks/hooks.json
# 24 hook blocks
```

**Sprint 4 변경**: 0 (Master Plan §3.6 명시).

---

## 2. Module 구조 + Implementation Order

### 2.1 14+5 = 19 files/changes

```
skills/sprint/                              # 신규 디렉터리 (5 files)
├── SKILL.md                                # ★ 280 LOC + frontmatter
├── PHASES.md                               # 120 LOC English
└── examples/
    ├── basic-sprint.md                     # 80 LOC English
    ├── multi-feature-sprint.md             # 100 LOC English
    └── archive-and-carry.md                # 90 LOC English

agents/                                     # 4 새 파일
├── sprint-orchestrator.md                  # ★ 140 LOC English + 8개국어 triggers
├── sprint-master-planner.md                # ★ 120 LOC English
├── sprint-qa-flow.md                       # ★ 130 LOC English
└── sprint-report-writer.md                 # ★ 120 LOC English

templates/sprint/                           # 신규 디렉터리 (7 files, ★ 한국어)
├── master-plan.template.md                 # 140 LOC Korean
├── prd.template.md                         # 100 LOC Korean
├── plan.template.md                        # 90 LOC Korean
├── design.template.md                      # 110 LOC Korean
├── iterate.template.md                     # 70 LOC Korean
├── qa.template.md                          # 85 LOC Korean
└── report.template.md                      # 85 LOC Korean

scripts/                                    # 1 new
└── sprint-handler.js                       # ★ 260 LOC English

lib/control/automation-controller.js        # +20 LOC ext (SPRINT_AUTORUN_SCOPE)
lib/audit/audit-logger.js                   # +2 LOC ext (ACTION_TYPES push)
```

### 2.2 Implementation Order (leaf → orchestrator)

| Step | File | LOC | Action |
|:----:|------|-----|--------|
| 1 | `lib/audit/audit-logger.js` ext | +2 | array push |
| 2 | `lib/control/automation-controller.js` ext | +20 | Object.freeze + export |
| 3 | `templates/sprint/master-plan.template.md` | 140 | Korean template |
| 4 | `templates/sprint/prd.template.md` | 100 | Korean template |
| 5 | `templates/sprint/plan.template.md` | 90 | Korean template |
| 6 | `templates/sprint/design.template.md` | 110 | Korean template |
| 7 | `templates/sprint/iterate.template.md` | 70 | Korean template |
| 8 | `templates/sprint/qa.template.md` | 85 | Korean template |
| 9 | `templates/sprint/report.template.md` | 85 | Korean template |
| 10 | `scripts/sprint-handler.js` | 260 | English dispatcher |
| 11 | `agents/sprint-master-planner.md` | 120 | English + 8개국어 |
| 12 | `agents/sprint-qa-flow.md` | 130 | English + 8개국어 |
| 13 | `agents/sprint-report-writer.md` | 120 | English + 8개국어 |
| 14 | `agents/sprint-orchestrator.md` | 140 | English + 8개국어 (Task spawn pattern) |
| 15 | `skills/sprint/SKILL.md` | 280 | English + 8개국어 frontmatter |
| 16 | `skills/sprint/PHASES.md` | 120 | English |
| 17 | `skills/sprint/examples/basic-sprint.md` | 80 | English |
| 18 | `skills/sprint/examples/multi-feature-sprint.md` | 100 | English |
| 19 | `skills/sprint/examples/archive-and-carry.md` | 90 | English |
| **Total** | | **~2,065 LOC** | |

---

## 3. ★ 8개국어 Triggers 정합 매트릭스

5 frontmatters (1 skill + 4 agents) 모두 다음 9 lines 포함:

```
Triggers: <english keywords>,
<korean keywords>,
<japanese keywords>,
<chinese keywords>,
<spanish keywords>,
<french keywords>,
<german keywords>,
<italian keywords>
```

각 라인당 3+ 키워드. Total: 24+ 키워드 across 8 languages. cto-lead.md 패턴 정합.

---

## 4. scripts/sprint-handler.js spec

```javascript
'use strict';
const { createSprintInfra } = require('../lib/infra/sprint');
const lifecycle = require('../lib/application/sprint-lifecycle');
const domain = require('../lib/domain/sprint');

const VALID_ACTIONS = Object.freeze([
  'init','start','status','watch','phase','iterate','qa','report',
  'archive','list','feature','pause','resume','fork','help',
]);

function getInfra(opts) {
  return createSprintInfra({
    projectRoot: (opts && opts.projectRoot) || process.cwd(),
    otelEndpoint: process.env.OTEL_ENDPOINT,
    otelServiceName: process.env.OTEL_SERVICE_NAME,
    agentId: process.env.CLAUDE_AGENT_ID,
    parentAgentId: process.env.CLAUDE_PARENT_AGENT_ID,
  });
}

async function handleSprintAction(action, args = {}, deps = {}) {
  if (!VALID_ACTIONS.includes(action)) {
    return { ok: false, error: `Unknown action: ${action}`, validActions: [...VALID_ACTIONS] };
  }
  const infra = deps.infra || getInfra(args);
  switch (action) {
    case 'init':    return handleInit(args, infra, deps);
    case 'start':   return handleStart(args, infra, deps);
    case 'status':  return handleStatus(args, infra);
    case 'list':    return handleList(args, infra);
    case 'phase':   return handlePhase(args, infra, deps);
    case 'iterate': return handleIterate(args, infra, deps);
    case 'qa':      return handleQA(args, infra, deps);
    case 'report':  return handleReport(args, infra, deps);
    case 'archive': return handleArchive(args, infra, deps);
    case 'pause':   return handlePause(args, infra, deps);
    case 'resume':  return handleResume(args, infra, deps);
    case 'fork':    return handleFork(args, infra);
    case 'feature': return handleFeature(args, infra);
    case 'watch':   return handleWatch(args, infra);
    case 'help':    return handleHelp();
  }
}

async function handleInit({ id, name, trustLevel = 'L3', features = [], context = {} }, infra) {
  const sprint = domain.createSprint({
    id, name, trustLevel: undefined,
    context: { WHY: '', WHO: '', RISK: '', SUCCESS: '', SCOPE: '', ...context },
    features,
    trustLevelAtStart: trustLevel,
  });
  await infra.stateStore.save(sprint);
  infra.eventEmitter.emit(domain.SprintEvents.SprintCreated({
    sprintId: sprint.id, name: sprint.name, phase: sprint.phase,
  }));
  return { ok: true, sprint, sprintId: sprint.id };
}

async function handleStart({ id, name, trustLevel = 'L3', features = [], context = {} }, infra, deps) {
  return lifecycle.startSprint({
    id, name, trustLevel,
    context: { WHY: '', WHO: '', RISK: '', SUCCESS: '', SCOPE: '', ...context },
    features,
  }, {
    stateStore: infra.stateStore,
    eventEmitter: infra.eventEmitter.emit,
    ...deps.lifecycleDeps,
  });
}

async function handleStatus({ id }, infra) {
  const sprint = await infra.stateStore.load(id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${id}` };
  return { ok: true, sprint };
}

async function handleList(_args, infra) {
  const fromState = await infra.stateStore.list();
  const fromDocs = await infra.docScanner.findAllSprints();
  const seen = new Set();
  const merged = [];
  for (const e of fromState) { merged.push({ source: 'state', ...e }); seen.add(e.id); }
  for (const d of fromDocs) {
    if (seen.has(d.id)) continue;
    merged.push({ source: 'docs', id: d.id, masterPlanPath: d.masterPlanPath });
  }
  return { ok: true, sprints: merged };
}

async function handlePause({ id, triggerId = 'USER_REQUEST', severity = 'MEDIUM', message = '' }, infra) {
  const sprint = await infra.stateStore.load(id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${id}` };
  const r = lifecycle.pauseSprint(sprint, [{ triggerId, severity, message, userActions: [] }],
    { eventEmitter: infra.eventEmitter.emit });
  if (r.ok) await infra.stateStore.save(r.sprint);
  return r;
}

async function handleResume({ id }, infra) {
  const sprint = await infra.stateStore.load(id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${id}` };
  const r = lifecycle.resumeSprint(sprint, { eventEmitter: infra.eventEmitter.emit });
  if (r.ok) await infra.stateStore.save(r.sprint);
  return r;
}

async function handleArchive({ id }, infra) {
  const sprint = await infra.stateStore.load(id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${id}` };
  const r = await lifecycle.archiveSprint(sprint, { eventEmitter: infra.eventEmitter.emit });
  if (r.ok) await infra.stateStore.save(r.sprint);
  return r;
}

async function handlePhase({ id, to }, infra) {
  const sprint = await infra.stateStore.load(id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${id}` };
  const r = await lifecycle.advancePhase(sprint, to, { eventEmitter: infra.eventEmitter.emit });
  if (r.ok) await infra.stateStore.save(r.sprint);
  return r;
}

async function handleIterate({ id }, infra, deps) {
  const sprint = await infra.stateStore.load(id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${id}` };
  const r = await lifecycle.iterateSprint(sprint, deps.iterateDeps || {});
  if (r.ok) await infra.stateStore.save(r.sprint);
  return r;
}

async function handleQA({ id, featureName }, infra, deps) {
  const sprint = await infra.stateStore.load(id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${id}` };
  const r = await lifecycle.verifyDataFlow(sprint, featureName, deps.qaDeps || {});
  if (r.ok) await infra.matrixSync.syncDataFlow(id, featureName, r.hopResults);
  return r;
}

async function handleReport({ id }, infra, deps) {
  const sprint = await infra.stateStore.load(id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${id}` };
  return lifecycle.generateReport(sprint, deps.reportDeps || {});
}

async function handleFeature({ id, featureName, action }, infra) {
  // Sprint 5 — placeholder
  return { ok: true, message: 'feature handler deferred to Sprint 5' };
}

async function handleFork({ id, newId }, infra) {
  // Sprint 5 — placeholder
  return { ok: true, message: 'fork handler deferred to Sprint 5' };
}

async function handleWatch({ id }, infra) {
  // Sprint 5 — placeholder (live dashboard)
  const sprint = await infra.stateStore.load(id);
  if (!sprint) return { ok: false, error: `Sprint not found: ${id}` };
  return { ok: true, snapshot: sprint, message: 'watch loop deferred to Sprint 5' };
}

function handleHelp() {
  return {
    ok: true,
    helpText: `bkit:sprint — Sprint Management
Actions:
  init, start, status, watch, phase, iterate, qa, report,
  archive, list, feature, pause, resume, fork, help`,
  };
}

module.exports = { handleSprintAction, VALID_ACTIONS, getInfra };
```

---

## 5. Cross-Sprint Integration data flow (★ user-mandated)

```
USER COMMAND: /sprint start my-launch --trust L3
   │
   ▼ skill matcher (8개국어 trigger)
   │
   ▼ skills/sprint/SKILL.md handler invocation
   │
   ▼ scripts/sprint-handler.js: handleSprintAction('start', args)
   │
   ▼ Sprint 3: createSprintInfra({projectRoot})
   │    → { stateStore, eventEmitter, docScanner, matrixSync }
   │
   ▼ Sprint 2: lifecycle.startSprint(input, { stateStore, eventEmitter, ... })
   │
   ▼ Sprint 2 internals:
   │    1) Sprint 1: createSprint(input)
   │    2) Sprint 3: stateStore.save → .bkit/state/sprints/my-launch.json
   │    3) Sprint 3: eventEmitter(SprintCreated) → audit-log + OTEL
   │    4) auto-run loop (Trust L3 → stopAfter='report'):
   │       - advancePhase → save → emit(SprintPhaseChanged)
   │       - iterateSprint, verifyDataFlow, generateReport
   │    5) finalPhase: 'report'
   │
   ▼ Return to user: { ok, sprintId, finalPhase: 'report', sprint }
```

---

## 6. Test Plan Matrix (Phase 6 QA)

| Group | TCs | Coverage |
|-------|-----|---------|
| TRIG (5) | 5 | 8개국어 triggers regex (skill + 4 agents) |
| ENG (4) | 4 | Code English-only grep |
| TEMPL (1) | 1 | 7 templates Korean OK |
| H (handler) | 10+ | sprint-handler.js 15 actions |
| CTRL+AUDIT | 5 | SPRINT_AUTORUN_SCOPE + ACTION_TYPES extension |
| **★ CSI-04** | **8+** | **Sprint 1+2+3+4 4-layer integration** |
| REGRESSION | 3 | Sprint 1 (40) + Sprint 2 (79) + Sprint 3 (66) re-run |
| INV (frontmatter B1-133 + plugin validate + hooks invariant) | 5 | Static |
| **Total** | **41+ TCs** | |

---

## 7. Risks (PRD §8 + Plan §4 + Design specific)

| Risk | Mitigation |
|------|-----------|
| D-R1 sprint-handler.js mock-only deps | Sprint 5 wiring (gapDetector / autoFixer / dataFlowValidator) — 본 Sprint placeholder OK |
| D-R2 skill SKILL.md description 250자 | Plan §4.2 sample 200자 미만 |
| D-R3 frontmatter YAML invalid syntax | YAML lint (claude plugin validate) |
| D-R4 8개국어 키워드 다양성 부족 | cto-lead 패턴 정합 (3+ 키워드/언어) |
| D-R5 sprint-handler.js 한글 주석 누락 | Do checklist + grep |
| D-R6 Sprint 1/2/3 invariant 깨짐 | lib/control + lib/audit 만 변경 |
| D-R7 audit-logger telemetry T-* 회귀 | Sprint 3 telemetry T-01~T-09 재실행 |
| D-R8 Sprint 2 SPRINT_AUTORUN_SCOPE inline 충돌 | Sprint 2 invariant 보존, lib/control mirror만 |

---

## 8. Design 완료 Checklist

- [x] Context Anchor 보존
- [x] 코드베이스 깊이 분석 (기존 skill/agent/templates/hooks/control/audit 패턴)
- [x] Module 구조 19 files/changes + ★ 8개국어 triggers 매트릭스
- [x] scripts/sprint-handler.js 상세 spec
- [x] Cross-Sprint Integration 데이터 흐름 (★ user-mandated)
- [x] Test Plan Matrix 41+ TCs (8개국어 + ENG + CSI-04 + Handler + Control+Audit + Regression + INV)
- [x] Risks specifc 8건 + PRD 10 + Plan 10 매핑
- [x] LOC estimate ~2,065

---

**Next Phase**: Phase 4 Do — 19 files/changes 구현 (leaf-first → orchestrator-last). Step 1 audit-logger ext → ... → Step 19 example 3.
