# Sprint 3 Design — v2.1.13 Sprint Management Infrastructure

> **Sprint ID**: `v2113-sprint-3-infrastructure`
> **Phase**: Design (3/7)
> **Date**: 2026-05-12
> **PRD**: v2113-sprint-3-infrastructure.prd.md
> **Plan**: v2113-sprint-3-infrastructure.plan.md
> **Master Plan**: v1.1 §3.6
> **Depends on**: Sprint 1 (a7009a5) + Sprint 2 (97e48b1) **immutable**

---

## 0. Context Anchor (PRD §0 + Plan §0 일치, 보존)

| Key | Value |
|-----|-------|
| WHY | Sprint 1 + Sprint 2 위 Infrastructure adapter 영구화 + ★ cross-sprint 유기적 상호 연동 |
| WHO | bkit 사용자 + Sprint 4 skill handler + Sprint 5 matrix consumer + audit-logger + OTEL + CI |
| RISK | Sprint 2 deps 불일치 / atomic write / OTEL recursion (#54196) / Domain Purity / path 충돌 / clock skew / matrix partial / 사용자 명시 cross-sprint 단절 |
| SUCCESS | 6 files + 11/11 Sprint 2 deps inject + disk 영구화 + dual sink + Sprint 1/2 invariant 0 + ★ cross-sprint 10+ TCs |
| SCOPE | In: lib/infra/sprint/ 6 files. Out: Sprint 4 (skills/agents/8개국어 트리거) + Sprint 5 (L3+) + Sprint 6 (BKIT_VERSION) |

---

## 1. 코드베이스 깊이 분석 (필수)

### 1.1 Sprint 1 Domain 의존 자산 (immutable, 본 Sprint 3 import 대상)

| Export | Sprint 1 Path | Sprint 3 사용 위치 |
|--------|-------------|------------------|
| `Sprint` (JSDoc typedef) | `lib/domain/sprint/entity.js:128-150` | state-store schema, telemetry payload typing |
| `SprintInput` (JSDoc typedef) | `lib/domain/sprint/entity.js:152-160` | state-store input typing |
| `SprintDocs` (JSDoc typedef) | `lib/domain/sprint/entity.js:70-79` | doc-scanner output shape |
| `sprintPhaseDocPath(id, phase)` | `lib/domain/sprint/validators.js:76-81` | doc-scanner phase doc path 매핑 |
| `SPRINT_NAME_REGEX` | `lib/domain/sprint/validators.js:19` | doc-scanner sprint id false-positive defense |
| `SPRINT_EVENT_TYPES` | `lib/domain/sprint/events.js:24-30` | telemetry validation set |
| `isValidSprintEvent` | `lib/domain/sprint/events.js:123` | telemetry input validation |
| `cloneSprint` | `lib/domain/sprint/entity.js:272-277` | (사용 안 함 — Infrastructure 는 read-only on entities, save 만) |

**Sprint 1 변경 0건 invariant 보장**: 모든 import는 read-only.

### 1.2 Sprint 2 Application deps interface (immutable, 본 Sprint 3 contract 매칭)

Sprint 2 `startSprint(input, deps)` 의 `deps` 객체에 본 Sprint 3 adapter 4개 inject:

```javascript
// Sprint 2 start-sprint.usecase.js:185~ — deps interface
const stateStore = (deps && deps.stateStore) || inMemoryStore();
// stateStore.save(s): Promise<void> | save(s): void (둘 다 await 됨)
// stateStore.load(id): Promise<Sprint|null>

const emit = (deps && typeof deps.eventEmitter === 'function') ? deps.eventEmitter : noopEmitter;
// emit(event: SprintEvent): void  (sync, fire-and-forget)
```

**Sprint 3 adapter contract 매칭**:

| Sprint 2 deps key | Sprint 3 adapter return |
|------------------|----------------------|
| `stateStore` (object with save/load) | `createStateStore({projectRoot}).save / .load` |
| `eventEmitter` (function) | `createEventEmitter({projectRoot, otelEndpoint?}).emit` (function) |
| `gateEvaluator` | Sprint 2 default — 본 Sprint X |
| `autoPauseChecker` | Sprint 2 default — 본 Sprint X |
| `gapDetector`/`autoFixer`/`dataFlowValidator` | Sprint 4 — 본 Sprint X |
| `docPathResolver` | `sprint-paths.getSprintPhaseDocAbsPath` (wrap Sprint 1) — 본 Sprint 보조 |
| `fileWriter` | state-store 의 atomic write 재사용 또는 별도 helper — 본 Sprint 보조 |
| `kpiCalculator` | Sprint 2 default — 본 Sprint X |
| `clock` | Sprint 2 default — 본 Sprint X (단 createX 함수에 동일 clock 가능) |
| `phaseHandlers` | Sprint 2 default — 본 Sprint X |

**Sprint 2 변경 0건 invariant 보장**: 본 Sprint 3 어댑터 4개를 deps inject 만 — Sprint 2 코드 미변경.

### 1.3 `lib/audit/audit-logger.js` (immutable, 본 Sprint 3 위임 대상)

**Public function** (Sprint 3 telemetry adapter 사용):

```javascript
// lib/audit/audit-logger.js:236
function writeAuditLog(entry) {
  // 1) ensureAuditDir + normalize + JSONL append
  // 2) Sprint 4.5 BUG-FIX: internal OTEL mirror (createOtelSink only, NO file recursion)
  // 3) sanitizeDetails 8 patterns 자동 적용 (PII redact + 500-char cap)
}
```

**Entry shape** (`normalizeEntry` reference, audit-logger.js:171-189):
```javascript
{
  id?: string,          // default UUID
  timestamp?: ISO,      // default now
  sessionId?: string,
  actor?: string,       // ACTORS enum, default 'system'
  actorId?: string,
  action?: string,      // ACTION_TYPES enum or fallback (passthrough on unknown)
  category?: string,    // CATEGORIES enum, default 'control'
  target?: string,
  targetType?: string,  // TARGET_TYPES enum, default 'feature'
  details?: Object,     // auto-sanitized
  result?: string,      // default 'success'
  reason?: string|null,
  destructiveOperation?: boolean,
  blastRadius?: string|null,
}
```

**SprintEvent → audit-log entry 매핑 매트릭스**:

| SprintEvent.type | action | category | targetType | result | destructiveOperation |
|-----------------|--------|---------|-----------|--------|---------------------|
| SprintCreated | `feature_created` (existing ACTION_TYPES) | `pdca` | `feature` | `success` | false |
| SprintPhaseChanged | `phase_transition` (existing) | `pdca` | `feature` | `success` | false |
| SprintArchived | `feature_archived` (existing) | `pdca` | `feature` | `success` | false |
| SprintPaused | `sprint_paused` (custom — passthrough OK) | `pdca` | `feature` | `blocked` | false |
| SprintResumed | `sprint_resumed` (custom — passthrough OK) | `pdca` | `feature` | `success` | false |

**중요**:
- audit-logger의 writeAuditLog 가 이미 OTEL mirror 내장 (Sprint 4.5 bug-fix 후)
- Sprint 3 telemetry adapter는 **writeAuditLog 만 호출** — telemetry.js 의 createDualSink 우회 (#54196 recursion 방지)
- sanitizeDetails 자동 적용 — Sprint 3 어댑터는 raw payload 전달 OK

### 1.4 `lib/core/state-store.js` (immutable, atomic write 패턴 reference)

```javascript
// lib/core/state-store.js:51-72
function write(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = filePath + '.tmp.' + process.pid;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
    throw e;
  }
}
```

**Sprint 3 sprint-state-store 가 본 패턴 그대로 재사용** (재발명 X, 단 require 안 함 — 코드 복사로 의존성 격리).

### 1.5 `lib/infra/telemetry.js` (immutable, **import 0건 — recursion 회피**)

`lib/infra/telemetry.js` 의 `createDualSink` 는 file sink + OTEL sink composite. audit-logger 가 createDualSink 사용 시 **infinite recursion 위험** (2026-04-22 incident 682GB).

**Sprint 3 telemetry adapter 결정**: telemetry.js 미import. audit-logger.writeAuditLog 만 호출 (이미 OTEL mirror 내장).

### 1.6 `lib/infra/docs-code-scanner.js` (immutable, doc-scanner 패턴 reference)

```javascript
// lib/infra/docs-code-scanner.js:30-45 — directory scan pattern
const dir = path.join(PROJECT_ROOT, 'skills');
if (!fs.existsSync(dir)) return 0;
return fs.readdirSync(dir).filter(d => {
  const sub = path.join(dir, d);
  return fs.statSync(sub).isDirectory() && fs.existsSync(path.join(sub, 'SKILL.md'));
}).length;
```

**Sprint 3 sprint-doc-scanner 가 본 패턴 reference** (fs.readdirSync + fs.statSync + filter).

### 1.7 `.bkit/state/` 기존 7 파일 (path isolation 검증)

```
.bkit/state/
├── batch/             (775 entries)
├── memory.json
├── pdca-status.json
├── quality-metrics.json
├── regression-rules.json
├── resume/
├── session-history.json
├── trust-profile.json
└── workflows/
```

**Sprint 3 신규 path** (충돌 0건):
- `.bkit/state/sprints/` (신규 디렉터리, 기존과 충돌 없음)
- `.bkit/state/sprint-status.json` (신규 파일, 기존 파일명과 충돌 없음 — `sprint-` prefix unique)
- `.bkit/runtime/sprint-feature-map.json` (신규)
- `.bkit/runtime/sprint-matrices/` (신규 디렉터리)

---

## 2. Module 의존 그래프 + Import 매트릭스

```
                  ┌──────────────────┐
                  │ Sprint 1 (R/O)   │
                  │ + Sprint 2 (R/O) │
                  └────┬─────────────┘
                       │ (typedef + helpers)
                       ▼
              ┌───────────────────────┐
              │  lib/infra/sprint/    │
              │                       │
              │  sprint-paths.js      │ ← (no own deps; Sprint 1 sprintPhaseDocPath)
              │       ▲      ▲        │
              │       │      │        │
              │   ┌───┴┐  ┌──┴────┐   │
              │   │state│  │doc-sc │   │
              │   │store│  │anner  │   │
              │   └─┬──┘  └───┬───┘   │
              │     │         │       │
              │  ┌──▼─────────▼───┐   │
              │  │ telemetry      │   │ (audit-logger via lib/audit)
              │  └────┬────────────┘  │
              │       │               │
              │  ┌────▼────────────┐  │
              │  │ matrix-sync     │  │
              │  └────┬────────────┘  │
              │       │               │
              │  ┌────▼────────────┐  │
              │  │ index.js barrel │  │ (createSprintInfra composite)
              │  └─────────────────┘  │
              └───────────────────────┘
                       │
                       ▼
            Consumer: Sprint 2 startSprint(input, deps) — DI
```

### 2.1 Import 매트릭스 (6 files)

| Module | External | Sprint 1 | Sprint 2 | Own Sibling |
|--------|----------|---------|---------|-----------|
| `sprint-paths.js` | `path` | `sprintPhaseDocPath` | (none) | (none) |
| `sprint-state-store.adapter.js` | `fs`, `path` | (typedef only) | (none) | `./sprint-paths` |
| `sprint-telemetry.adapter.js` | `http`, `https`, `url` | (typedef only) | (none) | (none) — direct `lib/audit/audit-logger` |
| `sprint-doc-scanner.adapter.js` | `fs`, `path` | `sprintPhaseDocPath`, `SPRINT_NAME_REGEX` | (none) | `./sprint-paths` |
| `matrix-sync.adapter.js` | `fs`, `path` | (typedef only) | (none) | `./sprint-paths` |
| `index.js` (barrel) | (none) | (none) | (none) | 5 modules above |

**Cycle 0건**: leaf paths → adapter → barrel. No back-edges.
**telemetry.js import 0건** (#54196 recursion 방지).
**PDCA import 0건** (invariant).

---

## 3. Module 1: `sprint-paths.js` — Pure Path Helper

### 3.1 Header

```javascript
/**
 * sprint-paths.js — Pure path helper for Sprint Infrastructure (v2.1.13 Sprint 3).
 *
 * Centralizes all .bkit/state/sprints/ + .bkit/runtime/sprint-* path
 * computations. No fs/I/O — caller decides when to read/write.
 *
 * Delegates phase doc path mapping to Sprint 1 sprintPhaseDocPath() and
 * adds project-root prefix for absolute paths.
 *
 * Design Ref: docs/02-design/features/v2113-sprint-3-infrastructure.design.md §3
 * ADR Ref: 0009 (state schema v1.1 — .bkit/state/sprints/{id}.json)
 *
 * @module lib/infra/sprint/sprint-paths
 * @version 2.1.13
 * @since 2.1.13
 */
```

### 3.2 Public API

```javascript
const path = require('node:path');
const { sprintPhaseDocPath } = require('../../domain/sprint');

const MATRIX_TYPES = Object.freeze(['data-flow', 'api-contract', 'test-coverage']);

function getSprintStateDir(projectRoot) {
  return path.join(projectRoot, '.bkit', 'state', 'sprints');
}
function getSprintStateFile(projectRoot, id) {
  return path.join(getSprintStateDir(projectRoot), `${id}.json`);
}
function getSprintIndexFile(projectRoot) {
  return path.join(projectRoot, '.bkit', 'state', 'sprint-status.json');
}
function getSprintFeatureMapFile(projectRoot) {
  return path.join(projectRoot, '.bkit', 'runtime', 'sprint-feature-map.json');
}
function getSprintMatrixDir(projectRoot) {
  return path.join(projectRoot, '.bkit', 'runtime', 'sprint-matrices');
}
function getSprintMatrixFile(projectRoot, type) {
  if (!MATRIX_TYPES.includes(type)) return null;
  return path.join(getSprintMatrixDir(projectRoot), `${type}-matrix.json`);
}
function getSprintPhaseDocAbsPath(projectRoot, sprintId, phase) {
  const rel = sprintPhaseDocPath(sprintId, phase);
  if (!rel) return null;
  return path.join(projectRoot, rel);
}

module.exports = {
  MATRIX_TYPES,
  getSprintStateDir, getSprintStateFile, getSprintIndexFile,
  getSprintFeatureMapFile, getSprintMatrixDir, getSprintMatrixFile,
  getSprintPhaseDocAbsPath,
};
```

**Pure**: no `fs`, no clock.

---

## 4. Module 2: `sprint-state-store.adapter.js`

### 4.1 Behavior

| Method | Signature | Behavior |
|--------|----------|----------|
| `save(sprint)` | `(Sprint) => Promise<void>` | atomic tmp+rename + root index sync |
| `load(id)` | `(string) => Promise<Sprint\|null>` | read file + JSON.parse; null on missing/corrupt |
| `list()` | `() => Promise<Array<SprintIndexEntry>>` | read root index, return entries array |
| `remove(id)` | `(string) => Promise<void>` | unlink + update root index (idempotent) |
| `getIndex()` | `() => Promise<Object>` | raw root index read |

### 4.2 Root Index Schema (`.bkit/state/sprint-status.json`)

```json
{
  "version": "1.1",
  "updatedAt": "2026-05-12T12:00:00.000Z",
  "entries": {
    "my-launch": {
      "id": "my-launch",
      "name": "My Launch Q2",
      "phase": "do",
      "status": "active",
      "trustLevelAtStart": "L3",
      "createdAt": "2026-05-10T00:00:00.000Z",
      "updatedAt": "2026-05-12T12:00:00.000Z"
    }
  }
}
```

### 4.3 Implementation Skeleton

```javascript
const fs = require('node:fs');
const path = require('node:path');
const {
  getSprintStateDir, getSprintStateFile, getSprintIndexFile,
} = require('./sprint-paths');

function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + '.tmp.' + process.pid;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (_e) {}
    throw e;
  }
}

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_e) { return null; }
}

function createStateStore({ projectRoot, clock }) {
  if (!projectRoot || typeof projectRoot !== 'string') {
    throw new TypeError('createStateStore: projectRoot must be string');
  }
  const now = (typeof clock === 'function') ? clock : () => new Date().toISOString();

  async function save(sprint) {
    if (!sprint || typeof sprint !== 'object' || typeof sprint.id !== 'string') {
      throw new TypeError('save: sprint must have string id');
    }
    const stateFile = getSprintStateFile(projectRoot, sprint.id);
    const indexFile = getSprintIndexFile(projectRoot);

    // 1) Atomic write the sprint state
    atomicWriteJson(stateFile, sprint);

    // 2) Read-modify-write root index
    const index = safeReadJson(indexFile) || { version: '1.1', entries: {} };
    index.entries[sprint.id] = {
      id: sprint.id,
      name: sprint.name,
      phase: sprint.phase,
      status: sprint.status,
      trustLevelAtStart: sprint.autoRun && sprint.autoRun.trustLevelAtStart,
      createdAt: sprint.createdAt,
      updatedAt: now(),
    };
    index.updatedAt = now();
    atomicWriteJson(indexFile, index);
  }

  async function load(id) {
    if (typeof id !== 'string') return null;
    return safeReadJson(getSprintStateFile(projectRoot, id));
  }

  async function list() {
    const index = safeReadJson(getSprintIndexFile(projectRoot));
    if (!index || !index.entries) return [];
    return Object.values(index.entries);
  }

  async function remove(id) {
    const stateFile = getSprintStateFile(projectRoot, id);
    try { if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile); } catch (_e) {}
    const indexFile = getSprintIndexFile(projectRoot);
    const index = safeReadJson(indexFile);
    if (index && index.entries && index.entries[id]) {
      delete index.entries[id];
      index.updatedAt = now();
      atomicWriteJson(indexFile, index);
    }
  }

  async function getIndex() {
    return safeReadJson(getSprintIndexFile(projectRoot)) || { version: '1.1', entries: {} };
  }

  return { save, load, list, remove, getIndex };
}

module.exports = { createStateStore };
```

---

## 5. Module 3: `sprint-telemetry.adapter.js`

### 5.1 Behavior

| Method | Signature | Behavior |
|--------|----------|----------|
| `emit(event)` | `(SprintEvent) => void` | sync; convert to audit-log entry + call writeAuditLog (which auto-mirrors to OTEL since Sprint 4.5 bug fix) |
| `flush()` | `() => Promise<void>` | for tests; no-op (writeAuditLog is sync) |

### 5.2 SprintEvent → Audit Entry 매핑 함수

```javascript
function eventToAuditEntry(event, opts) {
  const t = event.type;
  const p = event.payload || {};
  const base = {
    timestamp: event.timestamp,
    actor: 'system',
    category: 'pdca',
    target: p.sprintId,
    targetType: 'feature',
    details: { ...p, sprintEventType: t },
  };
  switch (t) {
    case 'SprintCreated':
      return { ...base, action: 'feature_created', result: 'success' };
    case 'SprintPhaseChanged':
      return { ...base, action: 'phase_transition', result: 'success', reason: p.reason };
    case 'SprintArchived':
      return { ...base, action: 'feature_archived', result: 'success', reason: p.reason };
    case 'SprintPaused':
      return { ...base, action: 'sprint_paused', result: 'blocked', reason: p.message };
    case 'SprintResumed':
      return { ...base, action: 'sprint_resumed', result: 'success' };
    default:
      return { ...base, action: 'unknown', result: 'success' };
  }
}
```

### 5.3 OTEL Direct Emission (opt-in)

writeAuditLog 가 자동으로 OTEL mirror 하지만, Sprint 3 어댑터는 추가로 직접 OTEL endpoint 호출 가능 (사용자 OTEL_ENDPOINT 환경 변수 또는 createEventEmitter opts 명시 시):

```javascript
function postOtel(endpoint, payload) {
  // non-blocking HTTP POST with 5s timeout, error swallowed
  const isHttps = endpoint.startsWith('https:');
  const lib = isHttps ? require('node:https') : require('node:http');
  const u = new URL(endpoint);
  const req = lib.request({
    hostname: u.hostname, port: u.port || (isHttps ? 443 : 80),
    path: u.pathname + u.search, method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeout: 5000,
  });
  req.on('error', () => { /* swallow */ });
  req.on('timeout', () => { try { req.destroy(); } catch (_e) {} });
  req.write(JSON.stringify(payload));
  req.end();
}

function buildOtelPayload(event, opts) {
  const t = event.type;
  const p = event.payload || {};
  return {
    resourceLogs: [{
      resource: { attributes: [
        { key: 'service.name', value: { stringValue: opts.otelServiceName || 'bkit' } },
        { key: 'bkit.version', value: { stringValue: opts.bkitVersion || 'unknown' } },
      ]},
      scopeLogs: [{
        scope: { name: 'bkit-sprint' },
        logRecords: [{
          timeUnixNano: String(new Date(event.timestamp).getTime() * 1e6),
          severityText: (t === 'SprintPaused') ? 'WARN' : 'INFO',
          body: { stringValue: t },
          attributes: [
            { key: 'bkit.sprint.id', value: { stringValue: p.sprintId } },
            { key: 'bkit.sprint.event_type', value: { stringValue: t } },
            ...(p.fromPhase ? [{ key: 'bkit.sprint.from_phase', value: { stringValue: p.fromPhase } }] : []),
            ...(p.toPhase ? [{ key: 'bkit.sprint.to_phase', value: { stringValue: p.toPhase } }] : []),
            ...(p.trigger ? [{ key: 'bkit.sprint.trigger_id', value: { stringValue: p.trigger } }] : []),
            ...(p.severity ? [{ key: 'bkit.sprint.severity', value: { stringValue: p.severity } }] : []),
            ...(opts.agentId ? [{ key: 'agent_id', value: { stringValue: opts.agentId } }] : []),
            ...(opts.parentAgentId ? [{ key: 'parent_agent_id', value: { stringValue: opts.parentAgentId } }] : []),
          ],
        }],
      }],
    }],
  };
}
```

### 5.4 Factory

```javascript
const { writeAuditLog } = require('../../audit/audit-logger');
const { isValidSprintEvent } = require('../../domain/sprint');

function createEventEmitter({ projectRoot, otelEndpoint, otelServiceName, agentId, parentAgentId } = {}) {
  if (!projectRoot) {
    throw new TypeError('createEventEmitter: projectRoot is required');
  }
  // resolve env fallbacks lazily
  const endpoint = otelEndpoint || process.env.OTEL_ENDPOINT || null;
  const serviceName = otelServiceName || process.env.OTEL_SERVICE_NAME || 'bkit';
  const opts = { otelServiceName: serviceName, agentId, parentAgentId };

  function emit(event) {
    if (!isValidSprintEvent(event)) return;
    // 1) File sink via audit-logger (also internally mirrors OTEL since Sprint 4.5 fix)
    try { writeAuditLog(eventToAuditEntry(event, opts)); } catch (_e) {}
    // 2) Direct OTEL emission (opt-in) — additional explicit endpoint
    if (endpoint) {
      try { postOtel(endpoint, buildOtelPayload(event, opts)); } catch (_e) {}
    }
  }

  async function flush() {
    // writeAuditLog is sync; HTTP requests fire-and-forget — no-op flush
  }

  return { emit, flush };
}

module.exports = { createEventEmitter };
```

**Recursion safety**: `lib/infra/telemetry.js` import 0건. audit-logger 가 자체 OTEL mirror 하므로 본 adapter 의 직접 OTEL emission 은 **opt-in 추가** (이중 발화 가능하나 사용자 endpoint 명시 시에만).

---

## 6. Module 4: `sprint-doc-scanner.adapter.js`

### 6.1 Behavior

| Method | Signature | Behavior |
|--------|----------|----------|
| `findAllSprints()` | `() => Promise<Array<{id, masterPlanPath, ...phaseDocsPresent}>>` | scan docs/01-plan/features/*.master-plan.md → extract sprint id + check existence of 6 phase docs |
| `findSprintDocs(id)` | `(string) => Promise<SprintDocs>` | Sprint 1 SprintDocs typedef shape (7 keys) — each value = path or null |
| `hasPhaseDoc(id, phase)` | `(string, string) => Promise<boolean>` | fs.existsSync check |

### 6.2 Implementation Skeleton

```javascript
const fs = require('node:fs');
const path = require('node:path');
const { SPRINT_NAME_REGEX, sprintPhaseDocPath } = require('../../domain/sprint');
const { getSprintPhaseDocAbsPath } = require('./sprint-paths');

const MASTER_PLAN_SUFFIX = '.master-plan.md';
const PHASES = Object.freeze(['masterPlan', 'prd', 'plan', 'design', 'iterate', 'qa', 'report']);

function extractSprintId(filename) {
  if (!filename.endsWith(MASTER_PLAN_SUFFIX)) return null;
  const candidate = filename.slice(0, -MASTER_PLAN_SUFFIX.length);
  if (!SPRINT_NAME_REGEX.test(candidate) || candidate.includes('--')) return null;
  return candidate;
}

function createDocScanner({ projectRoot }) {
  if (!projectRoot) throw new TypeError('createDocScanner: projectRoot required');

  async function findAllSprints() {
    const planDir = path.join(projectRoot, 'docs', '01-plan', 'features');
    if (!fs.existsSync(planDir)) return [];
    const files = fs.readdirSync(planDir);
    const sprints = [];
    for (const f of files) {
      const id = extractSprintId(f);
      if (!id) continue;
      const docs = await findSprintDocs(id);
      sprints.push({ id, masterPlanPath: docs.masterPlan, docs });
    }
    return sprints;
  }

  async function findSprintDocs(id) {
    if (!SPRINT_NAME_REGEX.test(id) || id.includes('--')) {
      // Return all-null structure for invalid id
      return PHASES.reduce((acc, p) => { acc[p] = null; return acc; }, {});
    }
    const out = {};
    for (const phase of PHASES) {
      const abs = getSprintPhaseDocAbsPath(projectRoot, id, phase);
      out[phase] = (abs && fs.existsSync(abs)) ? abs : null;
    }
    return out;
  }

  async function hasPhaseDoc(id, phase) {
    const abs = getSprintPhaseDocAbsPath(projectRoot, id, phase);
    return abs && fs.existsSync(abs);
  }

  return { findAllSprints, findSprintDocs, hasPhaseDoc };
}

module.exports = { createDocScanner };
```

---

## 7. Module 5: `matrix-sync.adapter.js`

### 7.1 Matrix File Schema

```json
{
  "type": "data-flow",
  "version": "1.0",
  "updatedAt": "ISO 8601",
  "sprints": {
    "{sprintId}": {
      "features": {
        "{featureName}": {
          "hopResults": [...],     // for data-flow
          "s1Score": 100,
          "lastUpdated": "ISO 8601"
        }
      }
    }
  }
}
```

### 7.2 Sync Functions

```javascript
function createMatrixSync({ projectRoot, clock }) {
  if (!projectRoot) throw new TypeError('createMatrixSync: projectRoot required');
  const now = (typeof clock === 'function') ? clock : () => new Date().toISOString();

  function readMatrix(type) {
    const file = getSprintMatrixFile(projectRoot, type);
    if (!file) return null;
    const data = safeReadJson(file);
    if (data && data.sprints) return data;
    return { type, version: '1.0', updatedAt: now(), sprints: {} };
  }

  function writeMatrix(type, data) {
    const file = getSprintMatrixFile(projectRoot, type);
    if (!file) throw new Error(`matrix-sync: unknown type ${type}`);
    data.updatedAt = now();
    atomicWriteJson(file, data);
  }

  async function syncDataFlow(sprintId, featureName, hopResults) {
    const m = readMatrix('data-flow');
    if (!m.sprints[sprintId]) m.sprints[sprintId] = { features: {} };
    const passed = (hopResults || []).filter(h => h.passed).length;
    const total = (hopResults || []).length || 7;
    m.sprints[sprintId].features[featureName] = {
      hopResults: hopResults || [],
      s1Score: (passed / total) * 100,
      lastUpdated: now(),
    };
    writeMatrix('data-flow', m);
  }

  async function syncApiContract(sprintId, featureName, contractResults) {
    const m = readMatrix('api-contract');
    if (!m.sprints[sprintId]) m.sprints[sprintId] = { features: {} };
    m.sprints[sprintId].features[featureName] = {
      contracts: contractResults || [],
      lastUpdated: now(),
    };
    writeMatrix('api-contract', m);
  }

  async function syncTestCoverage(sprintId, featureName, layerCounts) {
    const m = readMatrix('test-coverage');
    if (!m.sprints[sprintId]) m.sprints[sprintId] = { features: {} };
    m.sprints[sprintId].features[featureName] = {
      layers: layerCounts || {},
      lastUpdated: now(),
    };
    writeMatrix('test-coverage', m);
  }

  async function read(type) { return readMatrix(type); }

  async function clear(type) {
    const file = getSprintMatrixFile(projectRoot, type);
    if (file && fs.existsSync(file)) {
      try { fs.unlinkSync(file); } catch (_e) {}
    }
  }

  return { syncDataFlow, syncApiContract, syncTestCoverage, read, clear };
}
```

---

## 8. Module 6: `index.js` (barrel + composite factory)

```javascript
const paths = require('./sprint-paths');
const { createStateStore } = require('./sprint-state-store.adapter');
const { createEventEmitter } = require('./sprint-telemetry.adapter');
const { createDocScanner } = require('./sprint-doc-scanner.adapter');
const { createMatrixSync } = require('./matrix-sync.adapter');

function createSprintInfra(opts) {
  const { projectRoot } = opts || {};
  if (!projectRoot) throw new TypeError('createSprintInfra: projectRoot required');
  return {
    stateStore: createStateStore(opts),
    eventEmitter: createEventEmitter(opts),
    docScanner: createDocScanner(opts),
    matrixSync: createMatrixSync(opts),
  };
}

module.exports = {
  // Factories
  createStateStore, createEventEmitter, createDocScanner, createMatrixSync,
  createSprintInfra,
  // Paths
  ...paths,
};
```

---

## 9. Cross-Sprint Integration Data Flow (★ 사용자 명시 핵심)

### 9.1 End-to-End 시나리오

```
Step 1) Sprint 4 skill handler 진입 (사용자 명령)
  /sprint start my-launch --trust L3

Step 2) Sprint 4 가 본 Sprint 3 호출
  const infra = require('lib/infra/sprint').createSprintInfra({
    projectRoot: process.cwd(),
    otelEndpoint: process.env.OTEL_ENDPOINT,
    agentId: process.env.CLAUDE_AGENT_ID,
  });
  // infra = { stateStore, eventEmitter, docScanner, matrixSync }

Step 3) Sprint 4 가 Sprint 2 호출 (deps inject)
  const lifecycle = require('lib/application/sprint-lifecycle');
  const result = await lifecycle.startSprint({
    id: 'my-launch', name: 'My Launch Q2', trustLevel: 'L3',
    context: { WHY, WHO, RISK, SUCCESS, SCOPE },
  }, {
    stateStore: infra.stateStore,
    eventEmitter: infra.eventEmitter.emit,
    // gapDetector, autoFixer, dataFlowValidator — Sprint 4 inject
  });

Step 4) Sprint 2 startSprint 가 자율 진행 (Sprint 1 + Sprint 2 + Sprint 3 모두 활용)
  - createSprint (Sprint 1) → Sprint entity 생성
  - infra.stateStore.save(sprint) → .bkit/state/sprints/my-launch.json 디스크 영구화
  - infra.eventEmitter(SprintCreated) → audit-log + OTEL emit
  - advancePhase (Sprint 2) → infra.stateStore.save + infra.eventEmitter(SprintPhaseChanged)
  - iterateSprint (Sprint 2) → infra.stateStore.save with kpi.matchRate=100
  - verifyDataFlow (Sprint 2) per feature
    - + Sprint 4 가 dataFlowValidator inject (real chrome-qa)
    - + infra.matrixSync.syncDataFlow per feature → data-flow-matrix.json 갱신
  - generateReport (Sprint 2) → docs/04-report/features/my-launch.report.md write
  - archiveSprint (Sprint 2) → infra.stateStore.save (status='archived') + infra.eventEmitter(SprintArchived)

Step 5) 다음 세션에서 사용자 재진입
  /sprint list
    → Sprint 4 가 infra.stateStore.list() + infra.docScanner.findAllSprints() 통합
    → my-launch (archived, 2026-05-12T...) 표시

  /sprint resume my-launch (만약 paused 였다면)
    → Sprint 4 가 infra.stateStore.load('my-launch') → 정확한 phase 복원
    → Sprint 2 resumeSprint 호출 (trigger 해소 검증)
```

### 9.2 Cross-Sprint TC 매트릭스 (Plan §7.7 강화)

| TC ID | Step | 검증 자산 |
|-------|------|----------|
| CSI-01 | createSprint → save → load | Sprint 1 entity ↔ Sprint 3 state-store |
| CSI-02 | startSprint L3 with infra | Sprint 2 → Sprint 3 stateStore + eventEmitter |
| CSI-03 | advancePhase + audit log assertion | Sprint 2 SprintPhaseChanged ↔ Sprint 3 telemetry |
| CSI-04 | pauseSprint + audit log | Sprint 2 SprintPaused ↔ Sprint 3 telemetry |
| CSI-05 | resumeSprint + audit log | Sprint 2 SprintResumed ↔ Sprint 3 telemetry |
| CSI-06 | archiveSprint + status='archived' on disk | Sprint 2 ↔ Sprint 3 stateStore |
| CSI-07 | verifyDataFlow + matrixSync.read | Sprint 2 ↔ Sprint 3 matrix-sync |
| CSI-08 | generateReport + docScanner.findSprintDocs | Sprint 2 ↔ Sprint 3 doc-scanner |
| CSI-09 | save → process restart simulation → load | atomic write 검증 |
| CSI-10 | L4 full E2E (createSprint → archived) | 전체 통합 |

---

## 10. Test Plan Matrix (Phase 6 QA)

### 10.1 L2 Test Suite 구성 (60+ TCs target — 실제 70+ 예상)

| Group | TCs | 모듈 |
|-------|-----|------|
| P (paths) | 8 | sprint-paths.js |
| S (state-store) | 11 | sprint-state-store.adapter.js |
| T (telemetry) | 9 | sprint-telemetry.adapter.js |
| D (doc-scanner) | 7 | sprint-doc-scanner.adapter.js |
| M (matrix-sync) | 11 | matrix-sync.adapter.js |
| B (barrel + createSprintInfra) | 5 | index.js |
| **CSI** | **10** | **★ cross-sprint integration** |
| INV (invariants) | 5 | Sprint 1/2/PDCA invariant + Domain Purity + ENH-292 |
| **Total** | **66+** | |

### 10.2 Test 작성 패턴

```javascript
// tests/qa/v2113-sprint-3-infrastructure.test.js (gitignored local)
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const PLUGIN_ROOT = path.resolve(__dirname, '../../');
const infra = require(path.join(PLUGIN_ROOT, 'lib/infra/sprint'));
const domain = require(path.join(PLUGIN_ROOT, 'lib/domain/sprint'));
const lifecycle = require(path.join(PLUGIN_ROOT, 'lib/application/sprint-lifecycle'));

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-sprint3-'));
}

function cleanup(root) {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch (_e) {}
}
```

Each TC creates fresh tmpdir → tests adapter → cleanup. Cross-sprint TCs additionally call Sprint 1/2 functions to verify end-to-end.

---

## 11. Quality Gates Activation (Sprint 3 phase 진행 시)

| Gate | Threshold | Phase | 측정 |
|------|----------|-------|------|
| M2/M3/M4/M5/M7/M8 | Sprint 2 동일 | Do/QA | code-analyzer |
| M1 matchRate | 100 (목표) | Iterate | 자체 평가 |
| S2 | 100 (6/6 files) | Iterate/QA | file existence |
| Sprint 1 invariant | 0 변경 | Do/QA | git diff |
| Sprint 2 invariant | 0 변경 | Do/QA | git diff |
| PDCA invariant | 0 변경 | Do/QA | git diff |
| Domain Purity | 16 files 0 forbidden | Do/QA | check-domain-purity.js |
| atomic write 100% | tmp+rename in all write fns | QA | grep + TC |
| audit-logger recursion | 0 (telemetry.js import 0) | Do/QA | grep |
| L2 TC pass | 66+/100% | QA | node test runner |
| **★ Cross-Sprint TCs** | **10/100%** | **QA** | **node test runner** |
| `claude plugin validate .` | Exit 0 (F9-120 9-cycle) | QA | claude command |

---

## 12. Risks (PRD §8 + Plan §4 + Design specific)

| Risk | Mitigation |
|------|-----------|
| D-R1 OTEL endpoint timeout block | non-blocking + 5s timeout + swallowed error |
| D-R2 root index race condition | single-process atomic write — sequential save guaranteed |
| D-R3 doc-scanner extracts invalid id | extractSprintId regex + `--` check + length |
| D-R4 matrix-sync corrupt JSON read | safeReadJson returns null → readMatrix returns default empty |
| D-R5 sprint state file legitimately missing on load | load returns null (not throw) |
| D-R6 atomic write SIGTERM mid-write | tmp file cleaned up; original untouched |
| D-R7 Sprint 1 typedef drift | Sprint 1 invariant 0 변경 — typedef stable |
| D-R8 audit-logger ACTION_TYPES enum 미확장 | sprint_paused/sprint_resumed passthrough OK (audit-logger 보관함) |
| D-R9 Cross-sprint TC mock vs real adapter divergence | Sprint 3 어댑터는 real fs/disk 사용 (mock 최소화) → tmpdir 사용 |
| D-R10 사용자 명시 cross-sprint 유기적 상호 연동 미충족 | CSI-01~10 강제 + Design §9 데이터 흐름 명시 |

---

## 13. Implementation Order + Acceptance

Plan §6 + §7 reaffirm. Step 1 (sprint-paths.js) → Step 8 (runtime check).

---

## 14. Design 완료 Checklist

- [x] Context Anchor 보존
- [x] 코드베이스 깊이 분석 (Sprint 1/2 + audit-logger + state-store pattern + telemetry isolation)
- [x] Module 의존 그래프 + Import 매트릭스
- [x] 6 modules 상세 spec (header + signature + behavior + exports + implementation skeleton)
- [x] Cross-Sprint Integration data flow + 10 TCs
- [x] Test Plan Matrix L2 66+ TCs (Plan §7 target 60+ 초과)
- [x] Quality Gates Activation
- [x] Risks (Plan §4 + Design specific 10)
- [x] LOC estimate ~940 (Plan §2 일치)
- [x] Cross-sprint 유기적 상호 연동 (사용자 명시) Design §9 그래프 명시

---

**Next Phase**: Phase 4 Do — 6 files 구현 (leaf-first → barrel). Step 1 sprint-paths.js → Step 6 index.js. 각 step 후 syntax + runtime check.
