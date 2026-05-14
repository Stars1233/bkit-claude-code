---
template: sprint-design
version: 1.0
sprintId: v2114-differentiation-release
displayName: bkit v2.1.14 — Differentiation Release + Clean Arch Maturity
date: 2026-05-14
author: kay (POPUP STUDIO) + bkit:sprint-master-planner agent (1st spawn dogfooding)
---

# v2114-differentiation-release Design — Sprint Management

> **Sprint ID**: `v2114-differentiation-release`
> **Phase**: Design (3/8)
> **Date**: 2026-05-14
> **Author**: kay (POPUP STUDIO) + `bkit:sprint-master-planner` agent (dogfooding)
> **PRD/Plan Reference**: `docs/sprint/v2114/prd.md` + `docs/sprint/v2114/plan.md`
> **Master Plan Reference**: `docs/sprint/v2114/master-plan.md`

---

## 0. Context Anchor (PRD §0 + Plan §0 일치, 보존)

| Key | Value |
|-----|-------|
| **WHY** | Sprint Management v2.1.13 GA dogfooding + 차별화 6건 결정적 입증 + Clean Arch Port 7→8 + CARRY-5 closure |
| **WHO** | 1차 vibecoder / 2차 kay (메인테이너) / 3차 외부 도구 사용자 / 4차 CC drift +13 사용자 |
| **RISK** | R1 latency / R2 false-positive / R3 0 사용 사례 / R4 동시 변경 회귀 / R5 L4 baseline / R6 동시 무력화 |
| **SUCCESS** | K10 6/6 명시화 + K1 ≥36pp + K2 100% + K4 7→8 + K8 0 + K9 1 |
| **SCOPE** | in 13 ENHs + 4 Doc + 2 Observation / out Application Layer 3 도메인 (v2.1.15) + 차별화 #7 |

---

## 1. 코드베이스 깊이 분석 (필수)

### 1.1 기존 모듈 분석 (실측 2026-05-14, branch `feature/v2114-master-plan`)

#### 1.1.1 Domain Layer (`lib/domain/`) — 16 files, 0 forbidden imports

| File | LOC | 역할 | 변경 영향 |
|------|-----|------|---------|
| `ports/cc-payload.port.js` | ~80 | CC tool 호출 payload normalize | (변경 없음) |
| `ports/state-store.port.js` | ~120 | `.bkit/state/` persistence interface | layer-6-audit가 import |
| `ports/regression-registry.port.js` | ~80 | regression rule registry interface | (변경 없음) |
| `ports/audit-sink.port.js` | ~80 | audit log emit interface | continueOnBlock + layer-6 emit |
| `ports/token-meter.port.js` | ~80 | token accounting (CARRY-5) | OTEL hydrate 후 closure |
| `ports/docs-code-index.port.js` | ~80 | docs ↔ code mapping | (변경 없음) |
| `ports/mcp-tool.port.js` | ~80 | MCP tool 호출 interface | (변경 없음) |
| **NEW** `ports/caching-cost.port.js` | 80 | cache hit rate observability interface | **신규 (Port 7→8)** |
| `guards/invariant-1-domain-purity.js` | ~50 | Domain Layer fs/child_process 금지 | 변경 없음 |
| `guards/invariant-2-port-adapter-pair.js` | ~50 | Port ↔ Adapter 1:1 | 8쌍 확장 |
| ... (other 5 invariants) | ~50 each | invariant 3-9 | (변경 없음) |
| **NEW** `guards/invariant-10-effort-aware.js` | 50 | effort.level field 회귀 가드 | **신규 (ENH-307)** |
| `rules/sprint-phase-transitions.js` | ~100 | 8-phase 전이 룰 | (변경 없음) |
| `sprint/sprint-entity.js` | ~120 | Sprint typedef (v2.1.13 Sprint 1) | (변경 없음) |
| `sprint/sprint-state-machine.js` | ~150 | 8-phase state machine | (변경 없음) |
| `sprint/sprint-budget.js` | ~80 | budget tracker | (변경 없음) |

**Invariant CI gate**: `scripts/check-domain-purity.js` — Domain Layer 0 forbidden imports (`fs`, `child_process`, `net`, `http`, `https`, `os`) CI-enforced. 본 sprint 16 → 17 files (caching-cost.port + invariant-10), 모두 invariant 1-2 통과.

#### 1.1.2 Application Layer (`lib/application/`) — 16 files / 2 도메인

| Module | Files | 역할 | 변경 영향 |
|--------|:-----:|------|---------|
| `pdca-lifecycle/` | 3 | frozen 9-phase enum + transitions (ADR 0005) | (변경 없음) |
| `sprint-lifecycle/` | 13 | 8-phase container + 4 auto-pause + context-sizer | (변경 없음) |

**Anti-Mission**: 3 도메인 (`agent-dispatch/`) 신설 → **v2.1.15 명시 이관** (R4 회귀 위험).

#### 1.1.3 Infrastructure Layer (`lib/infra/`) — 6 adapters

| File | LOC | 역할 | 변경 영향 |
|------|-----|------|---------|
| `cc-bridge.js` | ~250 | CC ↔ bkit bridge | (변경 없음) |
| `state-store-fs.js` | ~180 | state-store.port 구현 (fs) | (변경 없음) |
| `regression-registry-yaml.js` | ~150 | regression-registry.port 구현 | (변경 없음) |
| `audit-sink-ndjson.js` | ~200 | audit-sink.port 구현 (ndjson) | continueOnBlock + layer-6 record |
| `telemetry.js` | ~300 | token-meter.port 구현 (OTEL) | **확장 (gen_ai.* 10 metrics + env hydrate)** |
| `docs-code-index-grep.js` | ~120 | docs-code-index.port 구현 | (변경 없음) |
| **NEW** `caching-cost-cli.js` | 120 | caching-cost.port 구현 (CLI) | **신규** |
| **NEW** `otel-env-capturer.js` | 150 | SessionStart env capture + hydrate | **신규 (CARRY-5 closure)** |

#### 1.1.4 Orchestrator Layer (`lib/orchestrator/`) — 5 modules

| File | LOC | 역할 | 변경 영향 |
|------|-----|------|---------|
| `intent-router.js` | ~200 | 의도 라우팅 (skill/agent/pdca/sprint) | (변경 없음) |
| `next-action-engine.js` | ~150 | next action 추천 (Stop-family hooks) | (변경 없음) |
| `team-protocol.js` | ~150 | multi-agent 협업 프로토콜 | (변경 없음) |
| `workflow-state-machine.js` | ~180 | workflow 전이 | (변경 없음) |
| `index.js` | ~50 | facade | sub-agent-dispatcher export |
| **NEW** `sub-agent-dispatcher.js` | 350 | sequential dispatch state machine | **신규 (ENH-292)** |
| **NEW** `cache-cost-analyzer.js` | 250 | OTEL gen_ai.cache_* metrics analyzer | **신규 (ENH-292)** |

#### 1.1.5 Hooks Layer (`hooks/`) — 21 events / 24 blocks

| File | LOC est. | 역할 | 변경 영향 |
|------|---------|------|---------|
| `unified-bash-pre.js` | ~200 (현재) | PreToolUse Bash (Defense Layer 2) | **확장 (heredoc + push event + effort-aware)** |
| `unified-write-pre.js` | ~150 (현재) | PreToolUse Write (Defense Layer 2) | **확장 (effort-aware)** |
| `unified-bash-post.js` | ~150 (현재) | PostToolUse Bash | continueOnBlock + reason |
| `unified-write-post.js` | ~150 (현재) | PostToolUse Write | continueOnBlock + reason |
| `skill-post.js` | ~80 (현재) | PostToolUse Skill | continueOnBlock + reason |
| `session-start.js` | ~150 (현재) | SessionStart | **확장 (OTEL env hydrate + plugin reachability check)** |
| `unified-stop.js` | ~120 (현재) | Stop hook | (변경 없음) |
| ... (14 others) | - | - | (변경 없음) |

#### 1.1.6 Defense Layer (`lib/defense/`) — 신규 디렉토리 (sub-sprint 2-4 신설)

| File | LOC | 역할 |
|------|-----|------|
| **NEW** `heredoc-detector.js` | 200 | 보수적 regex MVP (ENH-310) |
| **NEW** `layer-6-audit.js` | 300 | post-hoc audit + alarm + auto-rollback (ENH-289) |
| **NEW** `memory-enforcer.js` | 250 | PreToolUse deny-list enforced (ENH-286) |

#### 1.1.7 Audit Layer (`lib/audit/`)

| File | LOC | 역할 | 변경 영향 |
|------|-----|------|---------|
| `audit-logger.js` | ~280 | ACTION_TYPES (20개) + sanitize 8 patterns + 500-char cap | **확장 (7 신규 ACTION_TYPES = 20→27)** |

**신규 ACTION_TYPES (7건)**:
- `layer_6_audit_completed` (ENH-289 Tier 1)
- `layer_6_alarm_triggered` (ENH-289 Tier 2)
- `heredoc_bypass_blocked` (ENH-310)
- `git_push_intercepted` (ENH-298)
- `post_tool_block_recorded` (ENH-303)
- `hook_reachability_lost` (MON-CC-NEW-PLUGIN-HOOK-DROP)
- `memory_directive_enforced` (Sub-Sprint 4 carry slot, ENH-286)

총 **20 → 27 ACTION_TYPES** (7건 신설).

### 1.2 의존성 매트릭스

| 신규 module | imports (기존 자산) | imports (신규 자산) | 변경 금지 invariant |
|------------|------------------|------------------|------------------|
| `caching-cost.port.js` | (none — Domain Layer purity) | - | invariant 1 (purity) |
| `caching-cost-cli.js` | `caching-cost.port` | - | invariant 2 (1:1 pair) |
| `sub-agent-dispatcher.js` | `telemetry`, `audit-logger`, `caching-cost.port` | - | invariant 3 (orchestrator → infra) |
| `cache-cost-analyzer.js` | `telemetry`, `caching-cost.port` | - | - |
| `heredoc-detector.js` | (pure regex) | - | invariant 1 (purity) |
| `layer-6-audit.js` | `audit-logger`, `state-store.port` | - | - |
| `memory-enforcer.js` | `audit-logger`, `state-store.port` | - | - |
| `otel-env-capturer.js` | `fs`, `telemetry` | - | - |
| `invariant-10-effort-aware.js` | (none — Domain Layer purity) | - | invariant 1 (purity) |

**변경 금지 invariant 10건 (ADR 0003)**:
1. Domain Layer 0 forbidden imports
2. Port ↔ Adapter 1:1 pair
3. Application Layer pdca-lifecycle frozen 9-phase enum
4. Sprint Layer frozen 8-phase enum + 4 auto-pause triggers
5. CC payload normalize via cc-payload.port only
6. State persistence via state-store.port only
7. Audit log emit via audit-sink.port only
8. Token accounting via token-meter.port only
9. MCP tool call via mcp-tool.port only
10. **NEW** Effort-aware defense intensity bound to `effort.level` valid range (low/medium/high)

---

## 2. Module 구조 + Implementation Order

### 2.1 파일 트리 (변경 영역만)

```
lib/
├── domain/
│   ├── ports/
│   │   ├── caching-cost.port.js              [NEW, 80 LOC]
│   │   └── (existing 7 ports)
│   └── guards/
│       ├── invariant-10-effort-aware.js      [NEW, 50 LOC]
│       └── (existing 9 invariants)
├── infra/
│   ├── caching-cost-cli.js                   [NEW, 120 LOC]
│   ├── otel-env-capturer.js                  [NEW, 150 LOC]
│   └── telemetry.js                          [EXTEND, +250 LOC]
├── orchestrator/
│   ├── sub-agent-dispatcher.js               [NEW, 350 LOC]
│   ├── cache-cost-analyzer.js                [NEW, 250 LOC]
│   └── index.js                              [EXTEND, +5 LOC]
├── defense/                                  [NEW DIR]
│   ├── heredoc-detector.js                   [NEW, 200 LOC]
│   ├── layer-6-audit.js                      [NEW, 300 LOC]
│   └── memory-enforcer.js                    [NEW, 250 LOC]
└── audit/
    └── audit-logger.js                       [EXTEND, +50 LOC]

hooks/
├── unified-bash-pre.js                       [EXTEND, +150 LOC]
├── unified-write-pre.js                      [EXTEND, +50 LOC]
├── unified-bash-post.js                      [EXTEND, +50 LOC]
├── unified-write-post.js                     [EXTEND, +50 LOC]
├── skill-post.js                             [EXTEND, +50 LOC]
└── session-start.js                          [EXTEND, +150 LOC]

agents/
├── cto-lead.md                               [EXTEND, sequential dispatch 정책]
└── cc-version-researcher.md                  [EXTEND, ENH-296 + ENH-309]

docs/
├── 05-architecture/invariants.md             [UPDATE, invariant 9→10]
└── 06-guide/version-policy.guide.md          [UPDATE, ENH-309]

scripts/
└── check-skill-frontmatter.js                [UPDATE, 250→1536 char]
```

### 2.2 Implementation Order (Step 1-24, leaf-first)

| Step | File | Sub-sprint | LOC | 책임 |
|:----:|------|:----------:|:---:|------|
| 1 | `lib/domain/ports/caching-cost.port.js` | Coordination | 80 | Domain Layer purity (leaf) |
| 2 | `lib/infra/caching-cost-cli.js` | Coordination | 120 | Adapter (1:1 pair) |
| 3 | `lib/orchestrator/cache-cost-analyzer.js` | Coordination | 250 | Orchestrator |
| 4 | `lib/orchestrator/sub-agent-dispatcher.js` | Coordination | 350 | Orchestrator (state machine) |
| 5 | `lib/orchestrator/index.js` | Coordination | +5 | Facade export |
| 6 | `agents/cto-lead.md` | Coordination | (md) | sequential dispatch 정책 명시 |
| 7 | `lib/defense/heredoc-detector.js` | Defense | 200 | pure regex (leaf) |
| 8 | `lib/audit/audit-logger.js` | Defense | +50 | ACTION_TYPES 7 신규 (20→27) |
| 9 | `hooks/unified-bash-pre.js` | Defense | +150 | hook 확장 (heredoc + push + effort) |
| 10 | `hooks/unified-bash-post.js` | Defense | +50 | continueOnBlock + reason |
| 11 | `hooks/unified-write-post.js` | Defense | +50 | continueOnBlock + reason |
| 12 | `hooks/skill-post.js` | Defense | +50 | continueOnBlock + reason |
| 13 | `lib/defense/layer-6-audit.js` | Defense | 300 | Defense Layer 6 (집계) |
| 14 | `hooks/session-start.js` | Defense | +75 | plugin reachability check |
| 15 | `lib/infra/otel-env-capturer.js` | A Observability | 150 | leaf module |
| 16 | `lib/infra/telemetry.js` | A Observability | +250 | gen_ai.* 10 metrics |
| 17 | `hooks/session-start.js` | A Observability | +75 | OTEL env hydrate (CARRY-5) |
| 18 | alwaysLoad 측정 스크립트 + 1주 측정 시작 | A Observability | 150 | observation |
| 19 | `lib/defense/memory-enforcer.js` | E Defense | 250 | leaf module |
| 20 | `hooks/unified-bash-pre.js`/`unified-write-pre.js` | E Defense | +100 | effort-aware 분기 |
| 21 | `lib/domain/guards/invariant-10-effort-aware.js` | E Defense | 50 | Domain Layer purity |
| 22 | `docs/05-architecture/invariants.md` | E Defense | (md) | invariant 9→10 |
| 23 | `agents/cc-version-researcher.md` + `docs/06-guide/version-policy.guide.md` | Doc | (md) | ENH-296 + ENH-309 |
| 24 | `scripts/check-skill-frontmatter.js` + bkit memory MEMORY.md | Doc | 30 + (md) | ENH-291 1536-char + R-3 표기 |

---

## 3. Module 상세 spec

### 3.1 caching-cost.port.js (Step 1, Domain Layer)

**Header**:
```
@module lib/domain/ports/caching-cost.port
@version 1.0
@layer Domain
@invariant 1 (Domain Layer purity)
@invariant 2 (Port ↔ Adapter 1:1 pair)
```

**Public API**:
```javascript
/**
 * @typedef {Object} CacheMetrics
 * @property {number} cacheCreationTokens
 * @property {number} cacheReadTokens
 * @property {number} requestTokens
 * @property {number} hitRate - 0.0 ~ 1.0
 * @property {string} sessionId
 * @property {number} timestamp
 */

/**
 * @interface CachingCostPort
 * @method emit(metrics) - cache metrics emit
 * @method query(filter) - 누적 metrics 조회
 * @method threshold(level) - threshold 분기 (low/medium/high)
 */
```

**Behavior**:
1. interface only, no fs/child_process imports
2. Adapter (`caching-cost-cli`)가 구현
3. Application Layer가 호출 → Adapter 통해 fs 접근

### 3.2 sub-agent-dispatcher.js (Step 4, Orchestrator Layer, ENH-292)

**Header**:
```
@module lib/orchestrator/sub-agent-dispatcher
@version 1.0
@layer Orchestrator
@enh ENH-292 (Sub-agent Caching 10x Mitigation)
@differentiation #3
```

**Public API**:
```javascript
function dispatch(agents, options) {
  // returns { strategy: 'sequential' | 'parallel', plan: [...] }
}

function getState() {
  // returns { mode, cacheHitRate, lastDispatch, ... }
}
```

**Behavior** (state machine 8 states):
1. `INIT` → 첫 dispatch 진입
2. `FIRST_SPAWN_SEQUENTIAL` → 첫 agent만 sequential 호출
3. `CACHE_WARMUP_DETECTED` → cache_read_tokens > threshold (cache_cost_analyzer)
4. `PARALLEL_RESTORE` → 나머지 agents parallel 복원
5. `CACHE_HIT_MEASURED` → OTEL emit + 자가조정
6. `LATENCY_GUARD` → 첫 spawn latency > 30s 시 opt-out (R1 완화)
7. `OPT_OUT_ENABLED` → `BKIT_SEQUENTIAL_DISPATCH=0` 시 parallel only
8. `RESET` → SessionStart 시 INIT 복원

**Edge cases**:
- L4 강제 sequential (Trust Level 검사)
- L2/L3 opt-in 미설정 시 parallel default
- cache_read_tokens 측정 실패 (OTEL emit 실패) → conservative parallel fallback

### 3.3 heredoc-detector.js (Step 7, Defense Layer, ENH-310)

**Header**:
```
@module lib/defense/heredoc-detector
@version 1.0
@layer Defense
@enh ENH-310 (Heredoc Pipe Bypass Defense)
@differentiation #6
```

**Public API**:
```javascript
function detect(command) {
  // returns { matched: bool, pattern: string, reason: string, severity: 'warning' | 'critical' }
}

const PATTERNS = [
  /* 보수적 정규식 30+ 패턴 */
];
```

**Behavior**:
1. command 입력 → 정규식 매칭
2. `\$\(` (command substitution) + `<<` (heredoc) 동시 매칭 → critical
3. `<<` only → warning
4. `\$\(` only → not matched (heredoc 없음)
5. CC #58904 회귀 패턴 (예: `bash -c "$(cat <<EOF\nrm -rf /\nEOF\n)"`) → critical

**Edge cases**:
- legitimate heredoc (예: `cat <<EOF\nhello\nEOF`) → not matched (command substitution 없음)
- escaped patterns (예: `\\\$\\(`) → not matched
- multi-line legitimate scripts → 20+ legitimate TC NOT-FALSE-POSITIVE

### 3.4 layer-6-audit.js (Step 13, Defense Layer, ENH-289)

**Header**:
```
@module lib/defense/layer-6-audit
@version 1.0
@layer Defense
@enh ENH-289 (Defense Layer 6)
@differentiation #2
```

**Public API**:
```javascript
function auditPostHoc(event) {
  // returns { ok: bool, alarm: bool, rollback: bool }
}

function alarm(severity, reason) {
  // emit audit_logger record + console warn
}

function autoRollback(checkpointId) {
  // restore from .bkit/state/checkpoints/{id}
}
```

**Behavior** (multi-tier):
1. **Tier 1 — post-hoc audit**: PostToolUse hook 통과 후 변경 review
2. **Tier 2 — alarm**: severity ≥ medium → audit_logger record + console warn
3. **Tier 3 — auto-rollback**: severity = critical → state-store.port → checkpoint restore

**Edge cases**:
- checkpoint 미존재 → alarm only (no rollback)
- audit_logger sanitize 실패 → graceful degradation (warn 무손실)
- Trust Level L0 → tier 1 only (rollback 자동 안 함)

### 3.5 memory-enforcer.js (Step 19, Defense Layer, ENH-286)

**Header**:
```
@module lib/defense/memory-enforcer
@version 1.0
@layer Defense
@enh ENH-286 (Memory Enforcer)
@differentiation #1
```

**Public API**:
```javascript
function enforce(toolCall, claudeMdDirectives) {
  // returns { allowed: bool, deniedBy: string | null, reason: string }
}

function extractDirectives(claudeMdContent) {
  // returns [{ pattern, action: 'deny' | 'warn', source }]
}
```

**Behavior**:
1. SessionStart 시 CLAUDE.md 파싱 → deny-list 추출
2. PreToolUse hook 진입 시 toolCall vs deny-list 매칭
3. 매칭 → enforce deny (CC advisory 무력화 차단)
4. audit_logger record (`memory_directive_enforced`)

**Edge cases**:
- CLAUDE.md 부재 → enforce 안 함 (graceful)
- directive pattern 모호 → warn (deny 안 함)
- R-3 evolved form (모델이 directive 무시 후 다른 표현으로 동일 작업 수행) → pattern 다층화

### 3.6 telemetry.js 확장 (Step 16, Infrastructure Layer, ENH-281+293)

**Header**:
```
@module lib/infra/telemetry
@version 2.0 (v1.0 → v2.0 with gen_ai.* support)
@layer Infrastructure
@enh ENH-281 (OTEL 10 unified emit) + ENH-293 (Subprocess Env Propagation, CARRY-5 closure)
```

**Public API (신규)**:
```javascript
function emitGenAI(event, attributes) {
  // emit OTEL gen_ai.* semantic conventions
}

const GEN_AI_METRICS = [
  'gen_ai.request_tokens',
  'gen_ai.response_tokens',
  'gen_ai.cache_creation_tokens',
  'gen_ai.cache_read_tokens',
  'gen_ai.tool_call_count',
  'gen_ai.subagent_dispatch_count',
  'gen_ai.subagent_dispatch_mode',  // 'sequential' | 'parallel'
  'gen_ai.hook_trigger_count',
  'gen_ai.hook_trigger_event',
  'gen_ai.sprint_phase',
];
```

**Behavior**:
1. emitGenAI 호출 → OpenTelemetry GenAI SIG semantic conventions 적용
2. env hydrate via `otel-env-capturer.js` (subprocess 진입 시 env 손실 해소)
3. 외부 백엔드 (Langfuse / OpenLIT / Uptrace) 0-config 연동

**Edge cases**:
- OTEL_EXPORTER_OTLP_ENDPOINT 미설정 → noop (graceful)
- env hydrate 실패 → conservative fallback (process.env only)

---

## 4. Cross-Sprint Integration (★ 사용자 명시)

### 4.1 v2.1.13 Sprint Management ↔ v2.1.14 sub-sprints 통합 흐름

```
[/sprint init v2114-differentiation-release]
              │
              v
[sprint-orchestrator agent] (v2.1.13 GA)
              │
              ├─> [sprint-master-planner agent] (1st spawn dogfooding — 본 sprint)
              │        │
              │        v
              │   master-plan.md + prd.md + plan.md + design.md 4 files
              │
              ├─> Sub-sprint 1: Coordination (PRD→Plan→Design→Do→Iterate→QA→Report→Archived)
              │        │ 8-phase × Trust L2 / budget 100K / phaseTimeout 4h
              │        v
              │   [PR1] sub-agent-dispatcher + cache-cost-analyzer + caching-cost.port + adapter
              │
              ├─> Sub-sprint 2: Defense (의존: Coordination Archived)
              │        │
              │        v
              │   [PR2] heredoc-detector + layer-6-audit + post-tool-use 확장 + plugin reachability
              │
              ├─> Sub-sprint 3: A Observability (의존: Defense Archived)
              │        │
              │        v
              │   [PR3] otel-env-capturer + telemetry gen_ai.* + alwaysLoad 측정 시작
              │
              ├─> Sub-sprint 4: E Defense 확장 (의존: A Observability Archived)
              │        │
              │        v
              │   [PR4] memory-enforcer + effort-aware hooks + invariant-10
              │
              ├─> Sub-sprint 5: Doc (의존: E Defense Archived)
              │        │
              │        v
              │   [PR5] cc-version-researcher prompt 확장 + version-policy 갱신 + skill cap 정정
              │
              └─> Sub-sprint 6: Observation (전 sprint 병행)
                       │
                       v
                  [PR6] observation report (MON-CC-NEW-NOTIFICATION + 차별화 #7 결정)
```

### 4.2 Trust Level L0-L4 + SPRINT_AUTORUN_SCOPE 통합 다이어그램

```
[Trust Level Selection]
       │
       ├─> L0 (manual)       → SPRINT_AUTORUN_SCOPE: stopAfter=prd       (사용자 confirm 매 phase)
       ├─> L1 (assisted)     → SPRINT_AUTORUN_SCOPE: stopAfter=plan      (PRD→Plan auto, Design 사용자 review)
       ├─> L2 (default v2.1.14) → SPRINT_AUTORUN_SCOPE: stopAfter=design (PRD→Plan→Design auto, Do/QA 사용자 review)
       ├─> L3 (advanced)     → SPRINT_AUTORUN_SCOPE: stopAfter=qa        (Do/Iterate/QA auto, Report 사용자 review)
       └─> L4 (full-auto)    → SPRINT_AUTORUN_SCOPE: stopAfter=archived  (전 8-phase auto)
                                                  │
                                                  └─> 4 Auto-pause Triggers 검사
                                                       ├─> QUALITY_GATE_FAIL (M3 > 0 OR S1 < 100)
                                                       ├─> ITERATION_EXHAUSTED (iter ≥ 5 AND matchRate < 90)
                                                       ├─> BUDGET_EXCEEDED (cumulativeTokens > 1M)
                                                       └─> PHASE_TIMEOUT (phase > 4h)
                                                             │
                                                             v
                                                       [Sprint Paused] → audit_logger.sprint_paused
                                                             │
                                                             ├─> /sprint resume → 사유 해소 검증
                                                             └─> /sprint archive → terminal state
```

### 4.3 Multi-layer Defense Moat 다이어그램 (v2.1.14 차별화 6건)

```
[User tool call]
       │
       v
┌────────────────────────────────────────────────────────────────┐
│ Layer 1: hooks/unified-bash-pre.js (PreToolUse)                │
│   ├─ heredoc-detector (ENH-310 #6) ─── 차별화 #6: Heredoc Bypass│
│   ├─ memory-enforcer (ENH-286 #1) ──── 차별화 #1: Memory Enforcer│
│   └─ effort-aware분기 (ENH-300 #4) ── 차별화 #4: Effort-aware  │
└────────────────────────────────────────────────────────────────┘
       │
       v
[Tool 실행]
       │
       v
┌────────────────────────────────────────────────────────────────┐
│ Layer 2: hooks/{unified-bash-post,unified-write-post,skill-post}.js│
│   └─ continueOnBlock + reason (ENH-303 #5) ─── 차별화 #5         │
└────────────────────────────────────────────────────────────────┘
       │
       v
┌────────────────────────────────────────────────────────────────┐
│ Layer 3: lib/orchestrator/sub-agent-dispatcher.js              │
│   └─ sequential dispatch (ENH-292 #3) ─── 차별화 #3 (P0)        │
└────────────────────────────────────────────────────────────────┘
       │
       v
┌────────────────────────────────────────────────────────────────┐
│ Layer 4-5: existing (intent-router + audit-logger)             │
└────────────────────────────────────────────────────────────────┘
       │
       v
┌────────────────────────────────────────────────────────────────┐
│ Layer 6: lib/defense/layer-6-audit.js (ENH-289 #2) ─── 차별화 #2│
│   ├─ post-hoc audit                                            │
│   ├─ alarm (severity ≥ medium)                                 │
│   └─ auto-rollback (severity = critical)                       │
└────────────────────────────────────────────────────────────────┘
       │
       v
[Observability: OTEL gen_ai.* 10 metrics emit]
[caching-cost.port → caching-cost-cli adapter → analyzer]
```

---

## 5. ENH-292 Sequential Dispatch 자기적용 (★ 본 sprint 명시)

| Use case | Sequential 위치 | 영향 |
|---------|---------------|------|
| cto-lead Task spawn 18 blocks (PDCA 10 + Pipeline 3 + Sprint 4 + Explore 1) | 첫 spawn만 sequential | cache hit 4% → ≥40% |
| sprint-master-planner 자체 spawn (본 sprint = 1번째) | 단일 spawn (sequential N/A) | 본 작업 적용 안 됨 |
| qa-lead Task spawn 4-agent (sprint-qa-flow + code-analyzer + gap-detector + report-generator) | 첫 spawn (sprint-qa-flow) sequential | cache prefix 공유 |
| pdca-iterator Task spawn 2-agent (gap-detector + code-analyzer) | 첫 spawn sequential | cache prefix 공유 |
| Enterprise stack 5-agent (enterprise-expert + infra-architect + bkend-expert + frontend-architect + security-architect) | 첫 spawn sequential, 4 parallel | cache hit 정착 후 |

---

## 6. Test Plan Matrix L1-L5

### 6.1 L1 Unit Tests

| TC ID | Coverage | Module | 예상 TC 수 |
|-------|---------|--------|:---------:|
| L1-TC-001~030 | heredoc-detector adversarial patterns (CC #58904 회귀) | heredoc-detector | 30 |
| L1-TC-031~050 | heredoc-detector legitimate patterns (NOT-FALSE-POSITIVE) | heredoc-detector | 20 |
| L1-TC-051~080 | sub-agent-dispatcher state machine 8 states | sub-agent-dispatcher | 30 |
| L1-TC-081~095 | memory-enforcer deny-list 매칭 정확도 | memory-enforcer | 15 |
| L1-TC-096~105 | OTEL gen_ai.* emit 10 metrics | telemetry | 10 |
| L1-TC-106~115 | otel-env-capturer write/hydrate | otel-env-capturer | 10 |
| L1-TC-116~120 | layer-6-audit auto-rollback scenarios | layer-6-audit | 5 |
| L1-TC-121~125 | invariant-10-effort-aware | guards/invariant-10 | 5 |
| L1-TC-126~130 | effort-aware hooks 분기 (low/medium/high) | hooks | 5 |
| L1-TC-131~140 | continueOnBlock + reason audit | post-tool-use | 10 |
| **Total L1** | | | **140 신규 TC** |

### 6.2 L2 Integration Tests

| TC ID | Coverage | 예상 TC 수 |
|-------|---------|:---------:|
| L2-TC-001~010 | caching-cost.port ↔ caching-cost-cli adapter | 10 |
| L2-TC-011~020 | sub-agent-dispatcher ↔ cache-cost-analyzer ↔ telemetry | 10 |
| L2-TC-021~030 | session-start ↔ otel-env-capturer ↔ telemetry env hydrate (CARRY-5 closure) | 10 |
| L2-TC-031~040 | unified-bash-pre 통합 (heredoc + memory-enforcer + effort-aware) | 10 |
| L2-TC-041~050 | layer-6-audit ↔ state-store.port ↔ checkpoint 복원 | 10 |
| L2-TC-051~060 | post-tool-use continueOnBlock + reason ↔ audit-logger | 10 |
| **Total L2** | | **60 신규 TC** |

### 6.3 L3 Contract / Cross-Sprint Integration ★

| TC ID | Coverage | 예상 TC 수 |
|-------|---------|:---------:|
| L3-TC-001~005 | Port 8쌍 contract (check-domain-purity invariant CI) | 5 |
| L3-TC-006~010 | sprint-orchestrator ↔ sprint-master-planner ↔ 본 sprint 14 sub-sprints | 5 |
| L3-TC-011~015 | gap-detector matchRate ≥90 cross-sprint | 5 |
| L3-TC-016~020 | regression-rules-checker 96 consecutive 유지 (회귀 0건) | 5 |
| L3-TC-021~025 | ADR 0003 invariant 10 신설 후 sub-sprint 1-6 정합 | 5 |
| **Total L3** | | **25 신규 TC** |

### 6.4 L4 E2E Tests (선택)

| TC ID | Coverage | 예상 TC 수 |
|-------|---------|:---------:|
| L4-TC-001 | `/sprint init v2114-differentiation-release` → 8-phase 통과 → archived 1건 | 1 |
| L4-TC-002~005 | 4 auto-pause triggers 시나리오별 trigger + resume | 4 |
| **Total L4** | | **5 신규 TC** |

### 6.5 L5 Performance Tests (선택)

| TC ID | Coverage | 측정 |
|-------|---------|------|
| L5-TC-001 | cache hit 4% → ≥40% (1주 trace) | OTEL gen_ai.cache_read_tokens / gen_ai.request_tokens |
| L5-TC-002 | heredoc-detector throughput ≥1000 events/sec | jest bench |
| L5-TC-003 | sub-agent-dispatcher 첫 spawn latency < 30s | jest bench |

### 6.6 TC 총합

| Level | 신규 TC | 기존 (3,774) | 신규 + 기존 |
|-------|:------:|:----------:|:----------:|
| L1 Unit | 140 | ~2,500 | ~2,640 |
| L2 Integration | 60 | ~800 | ~860 |
| L3 Contract | 25 | ~450 | ~475 |
| L4 E2E | 5 | ~20 | ~25 |
| L5 Performance | 3 | ~5 | ~8 |
| **Total** | **233** | **~3,774** | **~4,007** |

---

## 7. Quality Gates Activation

| Gate | Threshold | Phase 활성 | sub-sprint 영향 |
|------|----------|:---------:|----------------|
| M1 matchRate | ≥90 (100 목표) | Iterate | all 6 |
| M2 code-quality | ≥80 | Do | all 6 |
| M3 criticalIssueCount | =0 | Do, QA | all 6 (R4 회귀 위험 mitigation) |
| M4 designCompleteness | ≥85 | Design | all 6 |
| M5 testCoverage | ≥70 | Do | all 6 (233 신규 TC) |
| M6 dependencyHealth | warn 허용 | Do | Coordination/Defense/A (모듈 신규) |
| M7 docCoverage | ≥80 | Do | all 6 (K10 차별화 6/6 명시화) |
| M8 sectionCompleteness | ≥85 | PRD, Plan, Design | all 6 |
| M9 regressionMatch | =0 | QA | all 6 (96 consecutive 유지) |
| M10 reportCompleteness | ≥85 | Report | all 6 |
| S1 dataFlowIntegrity | =100 | QA | all 6 (sprint-qa-flow 7-Layer) |
| S2 featureCompletion | =100 | Report | all 6 |
| S3 sprintCycleTime | budget 내 | Report | all 6 (35 days cap) |
| S4 crossSprintIntegrity | =0 | Report | all 6 (v2.1.10/11/12/13 영향 0) |

---

## 8. Risks (PRD/Plan + Design specific)

§ Plan §4 매트릭스 + Design specific 추가:

| Risk | Design specific 완화 |
|------|------------------|
| R1 ENH-292 latency | state machine 8 states + LATENCY_GUARD 자가조정 (Step 4) |
| R2 ENH-310 false-positive | 보수적 regex (`\$\(` + `<<` 동시 매칭) + AskUserQuestion (Step 7) |
| R3 sprint-master-planner 0 사용 사례 | 본 design 자체가 dogfooding 산출물 (K9 = 1) |
| R4 Port + Application 동시 변경 | Port +1만 (caching-cost.port), Application v2.1.15 이관 명시 |
| R5 L4 auto-pause 0 baseline | sub-sprint 별 8-phase × 4h timeout × budget 100K 명시 |
| R6 차별화 동시 무력화 | streak 추적 dashboard 디자인 (별도 후속 작업) |

---

## 9. Design 완료 Checklist

- [x] Context Anchor 보존 (§0, PRD §0 + Plan §0 일치)
- [x] 코드베이스 분석 (§1, 16 → 17 Domain + 6 → 8 Infra + 5 → 7 Orchestrator + Hooks 6 + Audit + Defense NEW DIR)
- [x] Module 구조 + Implementation Order 24 steps (§2)
- [x] Module 상세 spec 6 modules (§3, caching-cost.port + sub-agent-dispatcher + heredoc-detector + layer-6-audit + memory-enforcer + telemetry gen_ai.*)
- [x] Cross-Sprint Integration (§4, ★ 사용자 명시)
- [x] ENH-292 Sequential Dispatch 자기적용 (§5, ★ 본 sprint 명시)
- [x] Test Plan Matrix L1-L5 (§6, 233 신규 TC)
- [x] Quality Gates Activation 14 gates (§7)
- [x] Risks (§8, R1-R6 Design specific 완화)

---

**Next Phase**: Phase 4 Do — Implementation (leaf-first → orchestrator-last). Step 1 (`lib/domain/ports/caching-cost.port.js`) 시작.
