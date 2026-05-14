---
template: sprint-plan
version: 1.0
sprintId: v2114-differentiation-release
displayName: bkit v2.1.14 — Differentiation Release + Clean Arch Maturity
date: 2026-05-14
author: kay (POPUP STUDIO) + bkit:sprint-master-planner agent (1st spawn dogfooding)
---

# v2114-differentiation-release Plan — Sprint Management

> **Sprint ID**: `v2114-differentiation-release`
> **Phase**: Plan (2/8)
> **Date**: 2026-05-14
> **Author**: kay (POPUP STUDIO) + `bkit:sprint-master-planner` agent (dogfooding)
> **PRD Reference**: `docs/sprint/v2114/prd.md`
> **Master Plan Reference**: `docs/sprint/v2114/master-plan.md`

---

## 0. Context Anchor (PRD §0 복사, 보존)

| Key | Value |
|-----|-------|
| **WHY** | Sprint Management v2.1.13 GA dogfooding + 차별화 6건 결정적 입증 + Clean Arch Port 7→8 + CARRY-5 closure |
| **WHO** | 1차 vibecoder / 2차 kay (메인테이너) / 3차 외부 도구 사용자 / 4차 CC drift +13 사용자 |
| **RISK** | R1 latency / R2 false-positive / R3 0 사용 사례 / R4 동시 변경 회귀 / R5 L4 baseline 부족 / R6 동시 무력화 |
| **SUCCESS** | K10 6/6 명시화 + K1 ≥36pp + K2 100% + K4 7→8 + K8 0 + K9 1 |
| **SCOPE** | in 13 ENHs + 4 Doc + 2 Observation / out Application Layer 3 도메인 (v2.1.15) + 차별화 #7 (v2.1.16+) + bkit-gemini + MCP 3rd + L3/L4 default |

---

## 1. Requirements

### 1.1 In-scope (반드시 구현)

#### R1. ENH-292 — Sequential Sub-agent Dispatch + cache-cost-analyzer (P0, 차별화 #3)

**Public API / Behavior**:
- `lib/orchestrator/sub-agent-dispatcher.js` 신규: `dispatch(agents[], options)` → `{ first: 'sequential', remaining: 'parallel' }`
- L4 강제 sequential, L2/L3 opt-in (`BKIT_SEQUENTIAL_DISPATCH=1`)
- `lib/orchestrator/cache-cost-analyzer.js` 신규: OTEL `gen_ai.cache_*` metrics emit + threshold 자가조정

**Acceptance criteria**:
- cto-lead 18 blocks에 sequential 진입 → cache hit rate measure ≥40% (1주 trace 기반)
- opt-out flag (`BKIT_SEQUENTIAL_DISPATCH=0`) 작동
- L1+L2 TC 30+ PASS

#### R2. ENH-310 — Heredoc Pipe Bypass Defense (P1 신규, 차별화 #6)

**Public API / Behavior**:
- `lib/defense/heredoc-detector.js` 신규: `detect(command)` → `{ matched: bool, pattern: string, reason: string }`
- 보수적 regex: `\$\(` (command substitution) + `<<` (heredoc) 동시 매칭
- `hooks/unified-bash-pre.js` 확장: heredoc 감지 → AskUserQuestion (warning + confirm)
- opt-out flag (`BKIT_HEREDOC_DEFENSE=0`)

**Acceptance criteria**:
- 30+ adversarial TC PASS (CC #58904 회귀 패턴)
- 20+ legitimate TC NOT-FALSE-POSITIVE
- AskUserQuestion 통과 후 audit log 기록

#### R3. ENH-303 — PostToolUse continueOnBlock Moat (P1, 차별화 #5)

**Public API / Behavior**:
- `hooks/post-tool-use-handler.js` 확장: continueOnBlock + reason → audit_logger record (무손실)
- ACTION_TYPES: `post_tool_block_recorded` 신규
- `lib/audit/audit-logger.js` 확장 (ACTION_TYPES 20번째 신설)

**Acceptance criteria**:
- 5 streak CC #57317 silent drop 패턴 → bkit는 audit log 무손실 기록
- L2 TC continueOnBlock + reason path PASS

#### R4. ENH-289 — Defense Layer 6 (P1, 차별화 #2)

**Public API / Behavior**:
- `lib/defense/layer-6-audit.js` 신규: post-hoc audit + alarm + auto-rollback 단일 layer
- ACTION_TYPES: `layer_6_alarm_triggered` + `auto_rollback_executed` 신설
- 의존: ENH-298 (push event) + ENH-303 (continueOnBlock)

**Acceptance criteria**:
- R-3 evolved form 12+건 시나리오 TC PASS
- auto-rollback 트리거 후 `.bkit/state/checkpoints/` 복원

#### R5. ENH-298 — Push event Defense (P1, ENH-289 통합)

**Public API / Behavior**:
- `hooks/unified-bash-pre.js` 확장: `git push` 감지 → fork vs upstream 구분 + AskUserQuestion 강제 + audit log
- ACTION_TYPES: `git_push_intercepted` 신설

**Acceptance criteria**:
- upstream push → AskUserQuestion 강제 + audit log
- fork push → audit log only (block 안 함)
- L2 TC 10+ PASS

#### R6. MON-CC-NEW-PLUGIN-HOOK-DROP — SessionStart hook reachability sanity check (P1)

**Public API / Behavior**:
- `hooks/session-start.js` 확장: PostToolUse 3 blocks (Write/Bash/Skill) reachability self-check
- 결과 `.bkit/state/hooks/reachability.json` 기록

**Acceptance criteria**:
- #57317 v2.1.139~v2.1.141 silent drop 패턴 감지 + audit log warning

#### R7. ENH-281 + R8. ENH-293 — OTEL 10 unified emit + Subprocess Env Propagation (P1, CARRY-5 closure)

**Public API / Behavior (R7 ENH-281)**:
- `lib/infra/telemetry.js` 확장: `emitGenAI({ event, attributes })` → OTEL gen_ai.* 10 metrics
- 10 metrics: `gen_ai.request_tokens`, `gen_ai.response_tokens`, `gen_ai.cache_creation_tokens`, `gen_ai.cache_read_tokens`, `gen_ai.tool_call_count`, `gen_ai.subagent_dispatch_count`, `gen_ai.subagent_dispatch_mode`, `gen_ai.hook_trigger_count`, `gen_ai.hook_trigger_event`, `gen_ai.sprint_phase`

**Public API / Behavior (R8 ENH-293)**:
- `lib/infra/otel-env-capturer.js` 신규: SessionStart → `.bkit/runtime/otel-env.json` 캡처 + hook subprocess hydrate
- `hooks/session-start.js` 확장: env capture
- 영향 file: `lib/infra/telemetry.js` 4 위치 (line 126/137/149/188) — env 손실 해소

**Acceptance criteria (R7+R8)**:
- CARRY-5 #17 token-meter Adapter zero entries 해소 (1주 trace 기반 ≥80% coverage)
- OTEL ndjson trace gen_ai.* 10 metrics emit 검증

#### R9. ENH-282 — alwaysLoad 측정 (P1)

**Public API / Behavior**:
- `.mcp.json` `bkit-pdca` + `bkit-analysis` 2 servers에 `alwaysLoad: false` (현재) vs `true` 측정 비교
- 1주 trace 측정 → 보고서 (`docs/04-report/features/v2114-alwaysload-measurement.report.md`)

**Acceptance criteria**:
- 1주 측정 데이터 누적 + 의사결정 (alwaysLoad true 권장 여부)

#### R10. ENH-286 — Memory Enforcer (P1, 차별화 #1)

**Public API / Behavior**:
- `lib/defense/memory-enforcer.js` 신규: PreToolUse deny-list enforced (CC advisory → bkit enforced)
- CLAUDE.md directive 추출 → deny-list 매칭 → PreToolUse deny
- ACTION_TYPES: `memory_directive_enforced` 신설

**Acceptance criteria**:
- R-3 evolved 12+건 시나리오 TC PASS
- L2 TC deny-list 매칭 정확도 ≥95%

#### R11. ENH-300 — Effort-aware Adaptive Defense (P2, 차별화 #4)

**Public API / Behavior**:
- `hooks/unified-bash-pre.js`/`unified-write-pre.js` 확장: `effort.level` JSON + `$CLAUDE_EFFORT` env 분기
- defense intensity 분기 (low → minimum, medium → standard, high → maximum)
- audit log verbosity 조정 (low → summary, high → verbose)

**Acceptance criteria**:
- L1 TC 3 intensity 분기 PASS
- audit log entry 3 verbosity 분기 검증

#### R12. ENH-307 — ADR 0003 invariant 10 신설 (P2)

**Public API / Behavior**:
- `lib/domain/guards/invariant-10-effort-aware.js` 신규: effort.level field 회귀 가드
- ADR 0003 9 → 10 invariant 확장
- `docs/05-architecture/invariants.md` 업데이트

**Acceptance criteria**:
- check-domain-purity CI gate 10/10 PASS

#### R13. ENH-287 — CTO Team Coordination (P1, ENH-292 통합)

**Public API / Behavior**:
- `agents/cto-lead.md` body 확장: sequential dispatch 정책 명시 (5+ blocks 시 첫 spawn 분리)
- Task spawn 18 blocks 갱신 (10 PDCA + 3 Pipeline + 4 Sprint + 1 Explore)

**Acceptance criteria**:
- cto-lead body sequential dispatch 명시 (R1과 통합)

### 1.2 In-scope (Doc-only)

#### R14. ENH-309 — release_drift_score doc accuracy (P3)

- `agents/cc-version-researcher.md` prompt 확장 + `docs/06-guide/version-policy.guide.md` 갱신

#### R15. ENH-306 — Stale lock dedup doc (P3)

- `agents/cc-version-researcher.md` evolved form tracker 정의 + bkit memory MEMORY.md 표기 통일

#### R16. ENH-291 — Skill validator 1536-char 정정 (P2, P1 → P2 강등)

- `scripts/check-skill-frontmatter.js` 250자 → 1536자 공식 cap 갱신
- 14 skills 측정 데이터 정정 (multi-line concat 측정 정확화)

#### R17. ENH-296 — R-3 Evolved-form Tracker (P3)

- `agents/cc-version-researcher.md` numbered + evolved form 8건 → 12+건 갱신

### 1.3 Out-of-scope (Sprint 명시 제외)

| 항목 | 이월 sprint | 사유 |
|------|-----------|------|
| Application Layer `agent-dispatch/` | v2.1.15 | R4 동시 변경 회귀 위험 |
| 차별화 #7 (Workflow Durability Native, #58895) | v2.1.16+ | 1-2 cycles 관찰 후 결정 |
| bkit-gemini fork CARRY-6 | 별도 branch | scope 분리 |
| MCP 3rd server | v2.1.15+ | ENH-282 측정 결과 의존 |
| Trust L3/L4 default 변경 | v2.1.15+ | R5 baseline 부족 |
| v2.1.142+ CC 분석 | 별도 사이클 | scope 격리 |

---

## 2. Feature Breakdown

| # | Feature | Sub-sprint | LOC est. | Public Exports | Imports |
|---|---------|-----------|:--------:|----------------|---------|
| 1 | sub-agent-dispatcher | Coordination | 350 | dispatch(), getState() | telemetry, audit-logger, caching-cost.port |
| 2 | cache-cost-analyzer | Coordination | 250 | analyze(), threshold(), emit() | telemetry, caching-cost.port |
| 3 | caching-cost.port (Domain) | Coordination | 80 | CachingCostPort interface | (none — Domain Layer purity) |
| 4 | caching-cost-cli (Adapter) | Coordination | 120 | createAdapter() | caching-cost.port, fs |
| 5 | heredoc-detector | Defense | 200 | detect(), patterns | (none — pure regex) |
| 6 | unified-bash-pre 확장 | Defense | 150 | (extend existing) | heredoc-detector, memory-enforcer, effort-aware |
| 7 | post-tool-use continueOnBlock | Defense | 150 | (extend existing) | audit-logger ACTION_TYPES |
| 8 | layer-6-audit | Defense | 300 | auditPostHoc(), alarm(), autoRollback() | audit-logger, state-store.port |
| 9 | session-start sanity check | Defense | 100 | reachabilityCheck() | (existing hooks) |
| 10 | telemetry gen_ai.* emit | A Observability | 250 | emitGenAI() | (extend existing) |
| 11 | otel-env-capturer | A Observability | 150 | captureEnv(), hydrateEnv() | fs, telemetry |
| 12 | session-start otel hydrate | A Observability | 50 | (extend existing) | otel-env-capturer |
| 13 | alwaysLoad measurement | A Observability | 150 | (test scripts + report) | OTEL trace |
| 14 | memory-enforcer | E Defense | 250 | enforce(), denyList() | audit-logger, state-store.port |
| 15 | effort-aware hooks | E Defense | 100 | (extend existing) | (env-based) |
| 16 | invariant-10-effort-aware | E Defense | 50 | guardInvariant10() | (Domain Layer purity) |
| 17 | docs (4 ENH) | Doc | 300 | (markdown only) | - |
| 18 | observation report | Observation | 200 | (markdown only) | - |
| **Total** | | | **~3,400** | | |

---

## 3. Quality Gates (Sprint 활성)

| Gate | Threshold | Phase 활성 | 측정 |
|------|----------|-----------|------|
| **M1** matchRate | ≥90 (100 목표) | Iterate | gap-detector |
| **M2** code-quality | ≥80 | Do | code-analyzer |
| **M3** criticalIssueCount | =0 | Do, QA | code-analyzer |
| **M4** designCompleteness | ≥85 | Design | gap-detector |
| **M5** testCoverage | ≥70 | Do | jest |
| **M6** dependencyHealth | warn 허용 | Do | npm audit |
| **M7** docCoverage | ≥80 | Do | docs-code-scanner |
| **M8** sectionCompleteness | ≥85 | PRD, Plan, Design | gap-detector |
| **M9** regressionMatch | =0 | QA | regression-rules-checker |
| **M10** reportCompleteness | ≥85 | Report | gap-detector |
| **S1** dataFlowIntegrity | =100 | QA | sprint-qa-flow |
| **S2** featureCompletion | =100 | Report | featureMap |
| **S3** sprintCycleTime | budget 내 | Report | timeline |
| **S4** crossSprintIntegrity | =0 | Report | docs-code-scanner |

---

## 4. Risks & Mitigation

| Risk | Likelihood | Severity | Mitigation |
|------|:---------:|:--------:|-----------|
| R1 ENH-292 latency 증가 | M | H | 첫 spawn만 sequential + opt-out flag |
| R2 ENH-310 regex false-positive | M | H | 보수적 regex + warning + 30+ adversarial TC |
| R3 sprint-master-planner 0 사용 사례 | H | M | thinking amplifier + 사람 review + 최소 scope |
| R4 Port + Application 동시 변경 회귀 | L | C | Port +1만 우선, Application v2.1.15 이관 |
| R5 L4 auto-pause 0 baseline | L | C | L2 default + 4h timeout + budget 1M |
| R6 차별화 동시 명시화 → CC 모방 | M | C | streak dashboard + 분기 별 보강 + 양면 전략 |

---

## 5. Document Index

| Phase | Document | Path |
|-------|----------|------|
| Master Plan | (전체) | docs/sprint/v2114/master-plan.md |
| PRD | (현재 단계) | docs/sprint/v2114/prd.md |
| Plan | **본 문서** | docs/sprint/v2114/plan.md |
| Design | ⏳ | docs/sprint/v2114/design.md |
| Iterate | ⏳ | docs/sprint/v2114/iterate.md |
| QA | ⏳ | docs/sprint/v2114/qa-report.md |
| Report | ⏳ | docs/sprint/v2114/report.md |

---

## 6. Implementation Order (Phase 4 Do — Sub-sprint 1→6 순서)

### 6.1 Sub-sprint 1: Coordination (W1 D5 ~ W2 D3)

| Step | File | LOC est. | 이유 |
|:----:|------|:-------:|------|
| 1 | `lib/domain/ports/caching-cost.port.js` | 80 | Domain Layer purity (leaf-first) |
| 2 | `lib/infra/caching-cost-cli.js` | 120 | Adapter (Domain → Infrastructure) |
| 3 | `lib/orchestrator/cache-cost-analyzer.js` | 250 | Orchestrator Layer |
| 4 | `lib/orchestrator/sub-agent-dispatcher.js` | 350 | Orchestrator Layer (state machine) |
| 5 | `agents/cto-lead.md` 확장 | (md) | sequential dispatch 정책 명시 (ENH-287 통합) |

### 6.2 Sub-sprint 2: Defense (W2 D5 ~ W3 D5)

| Step | File | LOC est. | 이유 |
|:----:|------|:-------:|------|
| 6 | `lib/defense/heredoc-detector.js` | 200 | pure regex (leaf) |
| 7 | `lib/audit/audit-logger.js` ACTION_TYPES 확장 | 50 | 20th + 21st + 22nd type 신설 |
| 8 | `hooks/unified-bash-pre.js` 확장 (heredoc + push event + effort-aware preview) | 150 | hook layer (이미 존재 확장) |
| 9 | `hooks/post-tool-use-handler.js` 확장 (continueOnBlock + reason) | 150 | hook layer |
| 10 | `lib/defense/layer-6-audit.js` | 300 | Defense Layer 6 (집계) |
| 11 | `hooks/session-start.js` reachability check | 100 | hook layer |

### 6.3 Sub-sprint 3: A Observability (W4 D1 ~ W4 D5)

| Step | File | LOC est. | 이유 |
|:----:|------|:-------:|------|
| 12 | `lib/infra/otel-env-capturer.js` | 150 | leaf module |
| 13 | `lib/infra/telemetry.js` 확장 (gen_ai.*) | 250 | 기존 4 위치 확장 |
| 14 | `hooks/session-start.js` env hydrate | 50 | hook layer (이미 존재 확장) |
| 15 | alwaysLoad 측정 스크립트 + 1주 측정 시작 | 150 | observation |

### 6.4 Sub-sprint 4: E Defense 확장 (W5 D1 ~ W5 D4)

| Step | File | LOC est. | 이유 |
|:----:|------|:-------:|------|
| 16 | `lib/defense/memory-enforcer.js` | 250 | leaf module |
| 17 | `hooks/unified-bash-pre.js`/`unified-write-pre.js` effort-aware 확장 | 100 | hook layer |
| 18 | `lib/domain/guards/invariant-10-effort-aware.js` | 50 | Domain Layer purity |
| 19 | `docs/05-architecture/invariants.md` 갱신 | (md) | invariant 9 → 10 |

### 6.5 Sub-sprint 5: Doc (W5 D4 ~ W5 D5)

| Step | File | LOC est. | 이유 |
|:----:|------|:-------:|------|
| 20 | `agents/cc-version-researcher.md` prompt 확장 (ENH-296 + ENH-309) | (md) | doc only |
| 21 | `docs/06-guide/version-policy.guide.md` 갱신 (ENH-309) | (md) | doc only |
| 22 | `scripts/check-skill-frontmatter.js` 1536-char 정정 | 30 | ENH-291 P2 |
| 23 | bkit memory MEMORY.md 정정 (1536-char + R-3 표기 통일) | (md) | doc only |

### 6.6 Sub-sprint 6: Observation (W1~W5 병행)

| Step | File | 이유 |
|:----:|------|------|
| 24 | `docs/04-report/features/v2114-observation.report.md` | MON-CC-NEW-NOTIFICATION + 차별화 #7 관찰 |

---

## 7. Acceptance Criteria (Phase 6 QA — 본 sprint 종합)

- [ ] Static checks: syntax + lint (eslint + check-domain-purity)
- [ ] Runtime checks: require + integration (jest)
- [ ] L1/L2/L3 TC PASS: 100+ 신규 TC (heredoc 30+ adversarial + 20+ legitimate, sub-agent-dispatcher 30+, memory-enforcer 15+, OTEL emit 10 metrics, layer-6 5+)
- [ ] Invariant 보존: 9 → **10** (invariant 10 신설, ADR 0003 갱신)
- [ ] Port 7 → 8: caching-cost.port + caching-cost-cli adapter PASS
- [ ] check-domain-purity CI gate: 16+1 files 0 forbidden imports
- [ ] regression-rules-checker: 96 consecutive 유지 (회귀 0건)
- [ ] gap-detector matchRate ≥90 (100 목표)
- [ ] sprint-qa-flow agent S1 dataFlowIntegrity =100
- [ ] OTEL gen_ai.* 10 metrics ≥80% coverage (1주 trace)
- [ ] cache hit ≥40% (1주 측정)
- [ ] K10 차별화 6/6 명시화 (README + battlecard + SNS 6 캠페인 draft)

---

## 8. Cross-Sprint Dependency

### 8.1 본 sprint가 다른 sprint 의존

- v2.1.13 Sprint Management GA: sprint-orchestrator + sprint-master-planner agent
- v2.1.11 Clean Arch Application Layer: pdca-lifecycle + sprint-lifecycle frozen enum
- v2.1.10 Port↔Adapter: 7쌍 패턴 활용
- v2.1.12 evals hotfix: scripts/evals-wrapper.js argv 안정화

### 8.2 다른 sprint가 본 sprint 산출 활용

- v2.1.15: caching-cost.port 활용 + Application Layer `agent-dispatch/` 신설
- v2.1.16+: 차별화 #7 (Workflow Durability Native) 정식 편입 시 본 sprint 관찰 데이터
- CARRY-5 closure: ENH-293 → #17 token-meter Adapter zero entries 해소

---

## 9. PR 분할 전략 (3 PR 풀패키지 vs 6 PR 분할)

### 9.1 권장: 6 PR 분할 (sub-sprint 1:1 매핑)

| PR # | Sub-sprint | 변경 file 수 | LOC | 회귀 위험 |
|:---:|-----------|:-----------:|:---:|:--------:|
| PR1 | Coordination (ENH-292/287) | 5 | 800 | Medium (Port 신설) |
| PR2 | Defense (ENH-289/298/303/310 + MON-PLUGIN-HOOK-DROP) | 6 | 1,200 | Medium (hook 확장) |
| PR3 | A Observability (ENH-281/293/282) | 4 | 600 | Low (additive only) |
| PR4 | E Defense 확장 (ENH-286/300/307) | 4 | 400 | Low (invariant 추가) |
| PR5 | Doc (ENH-309/306/291/296) | 4 | 300 | Lowest (doc only) |
| PR6 | Observation (MON-NOTIFICATION 등) | 1 | 200 | Lowest (report only) |

**근거**:
- 회귀 격리 (R4 완화)
- L3 contract TC PR별 추적 가능
- 사용자 review 부담 분산

### 9.2 대안: 3 PR (Coordination + Defense+A / E Defense + Doc / Observation)

- 장점: review 부담 감소
- 단점: 회귀 격리 부족 (PR2 회귀 시 Defense + A 동시 영향)

---

## 10. Release Notes 초안 (v2.1.14)

```markdown
# bkit v2.1.14 — Differentiation Release + Clean Arch Maturity

## Highlights

- **bkit 차별화 6/6 명시화** — README + battlecard + SNS 캠페인 (Memory Enforcer / Defense Layer 6 / Sequential Dispatch / Effort-aware / continueOnBlock / Heredoc Bypass)
- **Clean Architecture Port 7→8** — caching-cost.port + caching-cost-cli adapter 신설
- **Sequential Sub-agent Dispatch (ENH-292)** — CC #56293 11-streak parallel default 회귀 회피 + cache hit ≥40%
- **Heredoc Pipe Bypass Defense (ENH-310 신규)** — CC #58904 v2.1.73~v2.1.141 68 versions 회귀 차단
- **OTEL gen_ai.* 10 metrics unified emit (ENH-281/293)** — CARRY-5 #17 token-meter Adapter zero entries closure
- **Defense Layer 6 (ENH-289)** — post-hoc audit + alarm + auto-rollback 단일 layer
- **PostToolUse continueOnBlock Moat (ENH-303)** — CC #57317 5-streak silent drop 우회
- **Memory Enforcer (ENH-286)** — PreToolUse deny-list enforced (CC advisory → bkit enforced)
- **Effort-aware Adaptive Defense (ENH-300)** — defense intensity 분기 (low/medium/high)
- **ADR 0003 Invariant 10 (ENH-307)** — effort.level field 회귀 가드 신설
- **Sprint Management v2.1.13 dogfooding 1건 완료** — sprint-master-planner agent 첫 spawn

## Compatibility

- CC 권장: v2.1.140 (96 consecutive + ADR 17/17 PASS)
- CC 비권장: v2.1.128 (#56293 10-streak), v2.1.129 (#56448 validator regression 9-streak)
- CC stable v2.1.128 drift +13 vs latest v2.1.141 사용자 → v2.1.123 보수 권장

## Breaking Changes

- 없음 (ADR 0003 invariant 9 → 10 신설은 backward-compatible)

## Migration

- 새로운 환경 변수 (선택): `BKIT_SEQUENTIAL_DISPATCH=0` (opt-out) / `BKIT_HEREDOC_DEFENSE=0` (opt-out) / `CLAUDE_EFFORT=low|medium|high`
```

---

## 11. Plan 완료 Checklist

- [x] Requirements R1-R17 (in-scope 13 ENH + 4 Doc + Observation)
- [x] Out-of-scope 매트릭스 6 항목
- [x] Feature Breakdown 18 modules / ~3,400 LOC
- [x] Quality Gates M1-M10 + S1-S4 = 14 gates
- [x] Risks 6 (R1-R6) + mitigation
- [x] Document Index 7 paths
- [x] Implementation Order 24 steps (6 sub-sprints)
- [x] Acceptance Criteria QA 종합
- [x] Cross-Sprint Dependency (v2.1.10/11/12/13 입력 + v2.1.15/16+ 출력)
- [x] PR 분할 전략 (6 PR 권장)
- [x] Release Notes 초안

---

**Next Phase**: Phase 3 Design — 코드베이스 깊이 분석 + Module 구조 + Test Plan Matrix L1-L5 + Cross-Sprint Integration (`docs/sprint/v2114/design.md`).
