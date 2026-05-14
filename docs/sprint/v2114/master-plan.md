---
template: sprint-master-plan
version: 1.0
sprintId: v2114-differentiation-release
displayName: bkit v2.1.14 — Differentiation Release + Clean Arch Maturity
date: 2026-05-14
author: kay (POPUP STUDIO) + bkit:sprint-master-planner agent (1st spawn dogfooding)
trustLevel: L2
duration: 4-5 weeks (28-35 days)
---

# bkit v2.1.14 — Differentiation Release + Clean Arch Maturity Sprint Master Plan

> **Sprint ID**: `v2114-differentiation-release`
> **Date**: 2026-05-14
> **Author**: kay (POPUP STUDIO) + `bkit:sprint-master-planner` agent (Sprint Management v2.1.13 GA 직후 첫 spawn — dogfooding 검증 의무)
> **Trust Level (시작)**: **L2** (`bkit.config.json:sprint.defaultTrustLevel` 정합. v2.1.14 첫 sprint 안정성 우선)
> **예상 기간**: 4-5 주 (28-35 days)
> **Master Plan template**: bkit v2.1.13 (Sprint 4 Presentation 산출, `templates/sprint/master-plan.template.md`)
> **Branch**: `feature/v2114-master-plan`
> **선행 분석 보고서**:
> - `docs/04-report/features/cc-v2140-v2141-impact-analysis.report.md` (직전 사이클)
> - `docs/04-report/features/cc-v2138-v2139-impact-analysis.report.md`
> - Internal A (bkit-impact-analyst) + External B (cc-version-researcher) 종합 인풋

---

## 0. Executive Summary

| 항목 | 내용 |
|------|------|
| **Mission** | bkit 차별화 6건을 **명시화·정식화**하고 Clean Architecture 4-Layer Maturity (Port 7→8) 달성 + Sprint Management v2.1.13 GA dogfooding으로 self-validation 누적 |
| **Anti-Mission** | (a) Application Layer 3 도메인 신설 (`agent-dispatch/` v2.1.15 이관), (b) 차별화 #7 (Workflow Durability Native, #58895 UserIdle) 정식 편입 (관찰 only), (c) bkit-gemini fork 통합, (d) MCP server 추가, (e) Trust Level L3/L4 default 변경 |
| **Core Primitives** | 13 ENHs (P0×1 / P1×9 / P2×3) + 6 sub-sprints + 1 신규 Port (caching-cost.port) + 1 CARRY closure (CARRY-5 token-meter via ENH-293) |
| **Trust Level** | **L2 default** (`SPRINT_AUTORUN_SCOPE` = `prd→plan→design→do→iterate`, gate별 사용자 confirm). L3/L4 사용자 명시 시만 활성. |
| **Auto-pause 조건** | **4 triggers 모두 활성**: QUALITY_GATE_FAIL (M3>0 OR S1<100) / ITERATION_EXHAUSTED (iter≥5 AND matchRate<90) / BUDGET_EXCEEDED (cumTok > 1M) / PHASE_TIMEOUT (>4h) |
| **Success Criteria** | 6건 (§ 6 KPI Matrix 참고). 차별화 6/6 명시화 + ENH-292/310/303 출시 + Port 7→8 + CARRY-5 closure + 96 consecutive 유지 |

### 0.1 4-Perspective 가치 표 (전체 Sprint)

| 관점 | 점수 (0-5) | 근거 |
|------|:---------:|------|
| **안정성 (Stability)** | **5** | 96 consecutive 호환 + ADR 0003 17/17 PASS 유지 + invariant 10 신설 (ENH-307) + check-domain-purity CI gate 유지 |
| **성능 (Performance)** | **4** | ENH-292 sub-agent caching 10x mitigation (cache hit 4%→40% 목표) + ENH-281 OTEL 10 unified emit |
| **보안 (Security)** | **5** | ENH-310 Heredoc Pipe Bypass Defense (v2.1.73~v2.1.141 회귀 차단) + ENH-289 Defense Layer 6 + ENH-298 Push event |
| **비용 (Cost)** | **4** | ENH-292 sequential dispatch 토큰 절감 (cache_creation 5,534→22,713 회복) + ENH-282 alwaysLoad 측정 기반 결정 |

---

## 1. Context Anchor (Plan → Design → Do 전파)

| Key | Value |
|-----|-------|
| **WHY** | (1) Sprint Management v2.1.13 GA 직후 실 사용 사례 0건 → dogfooding으로 self-validation 누적 / (2) v2.1.123→v2.1.141 95→96 consecutive 호환 데이터 누적으로 bkit 차별화 6건이 **결정적 입증**됨 (특히 ENH-292 11-streak, ENH-310 #58904 v2.1.73~v2.1.141 회귀) → 사용자 가시화·명시화 필요 / (3) Clean Architecture 4-Layer (v2.1.10/11)에서 7 Port 정착 후 caching-cost.port 신규 1건 추가가 자연스러운 다음 단계 / (4) CARRY-5 token-meter zero entries 근본 원인 (ENH-293 OTEL subprocess env propagation) 파악 완료, closure 시점 도래 |
| **WHO** | **1차**: vibecoder (Sprint v2.1.13 GA 사용 시작 first wave, 0건 baseline) / **2차**: kay (POPUP STUDIO) — bkit 메인테이너 + sprint-master-planner agent 첫 spawn 검증 의무 / **3차**: 외부 도구 사용자 (Cursor/Windsurf/Aider/Continue.dev 비교 검토 대상) / **4차**: CC 사용자 (stable v2.1.128 drift +13 노출 보호 안내 필요) |
| **WHAT (도메인)** | (a) bkit 차별화 6건 명시화 (ENH-286/289/292/300/303/310) + (b) Port 7→8 (caching-cost.port 신설) + (c) CARRY-5 closure (ENH-293) + (d) Sprint Management v2.1.13 GA dogfooding self-validation + (e) Defense Layer 5→6 확장 + (f) Doc accuracy fixes (ENH-291 1536자 정정 + ENH-309 release_drift_score) |
| **WHAT NOT** | (a) Application Layer 3 도메인 (agent-dispatch/) → v2.1.15로 명시 이관 / (b) 차별화 #7 (Workflow Durability Native, #58895 UserIdle) → 관찰만, 정식 편입 X / (c) bkit-gemini fork 통합 (CARRY-6 별도) / (d) Trust Level L3/L4 default 변경 / (e) MCP 3rd server (alwaysLoad 측정 결과에 따라 v2.1.15+) |
| **RISK** | (R1) sprint-master-planner agent 첫 spawn 출력 품질 미보장 — 본 작업이 dogfooding이므로 self-fulfilling / (R2) ENH-292 sequential dispatch latency 증가 (cache hit 후 parallel 복원 필요) / (R3) ENH-310 regex false-positive 위험 (legitimate heredoc 패턴 차단) / (R4) Port 7→8 + Application Layer 동시 변경 시 회귀 위험 / (R5) Trust L4 auto-pause 0 발화 baseline — 안전망 검증 부족 / (R6) 차별화 6건 동시 명시화 후 CC 따라잡기 시 동시 무력화 |
| **SUCCESS** | **K10 차별화 6/6 명시화** (README + battlecard + SNS) + **K1 토큰 비용 절감률 ≥40% (cache hit 4%→40%, ENH-292)** + **K2 Heredoc 차단율 100% (30+ adversarial TC, ENH-310)** + **K4 Port 7→8** + **K8 회귀 0건 (96 consecutive 유지)** + **K9 dogfooding 1건 완료 (본 sprint)** |
| **SCOPE (정량)** | **Features**: 13 ENHs (P0×1 / P1×9 / P2×3) / **예상 LOC**: ~3,500 LOC (Sprint Coordination 800 + Defense 1,200 + A Observability 600 + E Defense 400 + Doc 300 + Observation 200) / **기간**: 28-35 days / **토큰 예산**: 750K effective (1M cap × safetyMargin 0.25 적용 후) / **Phase 수**: 8 (PRD→Plan→Design→Do→Iterate→QA→Report→Archived) / **Sub-sprints**: 6 |
| **OUT-OF-SCOPE** | Application Layer 3rd domain / 차별화 #7 정식화 / bkit-gemini 통합 / MCP 3rd server / Trust L3/L4 default 변경 / v2.1.142+ CC 버전 분석 (별도 분석 사이클) |

---

## 2. Features (Sprint 구성 작업 묶음 — 13 ENHs)

| # | ENH ID | 우선순위 | Sub-sprint | 차별화 # | 비용 | 상태 |
|---|--------|:------:|------------|:------:|:----:|:----:|
| 1 | **ENH-292** Sub-agent Caching 10x Mitigation | **P0** | Coordination | **#3** | L | pending |
| 2 | **ENH-287** CTO Team Coordination | P1 | Coordination | - | M | pending (ENH-292 통합) |
| 3 | **ENH-289** Defense Layer 6 (R-3) | P1 | Defense | **#2** | M | pending |
| 4 | **ENH-298** Push event Defense | P1 | Defense | - | S | pending (ENH-289 통합) |
| 5 | **ENH-303** PostToolUse continueOnBlock Moat | P1 | Defense | **#5** | M | pending |
| 6 | **ENH-310** Heredoc Pipe Bypass Defense | **P1 신규** | Defense | **#6** | S | pending |
| 7 | MON-CC-NEW-PLUGIN-HOOK-DROP (#57317) | P1 | Defense | - | S | pending |
| 8 | **ENH-281** OTEL 10 누적 묶음 | P1 | A Observability | - | M | pending |
| 9 | **ENH-293** OTEL Subprocess Env Propagation (CARRY-5 closure) | P1 | A Observability | - | M | pending |
| 10 | **ENH-282** alwaysLoad 측정 (1주) | P1 | A Observability | - | S | pending |
| 11 | **ENH-286** Memory Enforcer | P1 | E Defense 확장 | **#1** | M | pending |
| 12 | **ENH-300** Effort-aware Adaptive Defense | P2 | E Defense 확장 | **#4** | S | pending |
| 13 | **ENH-307** ADR 0003 invariant 10 신설 | P2 | E Defense 확장 | - | S | pending |

### 2.1 Doc-only 부속 (Sub-sprint Doc 묶음)
| # | ENH ID | 우선순위 | 비용 |
|---|--------|:------:|:----:|
| 14 | **ENH-309** release_drift_score doc accuracy | P3 | XS |
| 15 | **ENH-306** Stale lock dedup doc | P3 | XS |
| 16 | **ENH-291** Skill validator 1536-char 정정 (P2 강등) | P2 | XS |
| 17 | **ENH-296** R-3 Evolved-form Tracker | P3 | XS |

### 2.2 Observation only (Sub-sprint Observation)
| # | ENH ID | 우선순위 | 관찰 기간 |
|---|--------|:------:|:--------:|
| 18 | MON-CC-NEW-NOTIFICATION (#58909) | P2 | 1-cycle 관찰 |
| 19 | 차별화 #7 신규 후보 (Workflow Durability Native, #58895) | observation | 1-2 cycles |

---

## 3. Sprint Phase Roadmap (8-Phase per Sub-sprint)

| Phase | 활성 시점 | 산출물 | Quality Gates |
|-------|----------|------|--------------|
| **prd** | sub-sprint 시작 | PRD 문서 (`docs/01-plan/features/{feature}.prd.md`) | M8 ≥85 |
| **plan** | PRD 후 | Plan 문서 (Requirements + Quality Gates + Risks) | M8 ≥85 |
| **design** | Plan 후 | Design 문서 (코드베이스 깊이 분석 + Test Plan Matrix L1-L5) | M4 ≥90, M8 ≥85 |
| **do** | Design 후 | 구현 코드 (leaf-first → orchestrator-last) | M2 ≥80, M3 =0, M5, M7 |
| **iterate** | matchRate < 100 시 | gap-detector matchRate 100% 달성 | M1 =100 |
| **qa** | iterate 후 | 7-Layer S1 검증 + L1-L5 TC PASS | M3 =0, S1 =100 |
| **report** | qa 후 | 종합 보고서 (`docs/04-report/features/{feature}.report.md`) | M10, S2, S4 |
| **archived** | report 후 (L4) 또는 `/sprint archive` 명시 | terminal state (readonly) | - |

### 3.1 Sub-sprint 별 8-phase 일정 매트릭스

| Sub-sprint | PRD | Plan | Design | Do | Iterate | QA | Report | Archived |
|-----------|:---:|:----:|:------:|:--:|:-------:|:--:|:------:|:--------:|
| **1. Coordination** (P0) | W1 D1-2 | W1 D2-3 | W1 D3-5 | W1 D5 ~ W2 D3 | W2 D3-4 | W2 D4-5 | W2 D5 | W2 EOD |
| **2. Defense** (P1×5) | W2 D5 | W2 D5 | W3 D1-2 | W3 D2 ~ W3 D5 | W3 D5 | W4 D1 | W4 D1 | W4 D1 |
| **3. A Observability** (P1×3) | W4 D1 | W4 D1 | W4 D2 | W4 D2-4 | W4 D4 | W4 D5 | W4 D5 | W4 EOD |
| **4. E Defense 확장** (P2×3) | W5 D1 | W5 D1 | W5 D1 | W5 D2-3 | W5 D3 | W5 D4 | W5 D4 | W5 D4 |
| **5. Doc** (P3×4) | W5 D4 | W5 D4 | (생략) | W5 D5 | (생략) | W5 D5 | W5 D5 | W5 EOD |
| **6. Observation** (P2 obs) | (전 sprint 병행) | - | - | - | - | - | W5 EOD | W5 EOD |

---

## 4. Quality Gates 활성화 매트릭스 (M1-M10 + S1-S4)

| Gate | 정의 | Threshold | 활성 Phase | 측정 도구 |
|------|------|----------|-----------|----------|
| **M1** matchRate | Design ↔ Code 일치율 | ≥90 (100 목표) | Iterate | `bkit-analysis::gap-detector` |
| **M2** code-quality | static + lint + type | ≥80 | Do | `bkit-analysis::code-analyzer` |
| **M3** criticalIssueCount | severity=critical 이슈 수 | =0 | Do, QA | `code-analyzer` |
| **M4** designCompleteness | 9-section spec coverage | ≥85 | Design | `gap-detector` |
| **M5** testCoverage | L1+L2 라인 커버리지 | ≥70 | Do | jest/istanbul |
| **M6** dependencyHealth | npm audit + circ-dep | warn 허용 | Do | npm audit |
| **M7** docCoverage | Code ↔ Docs sync | ≥80 | Do | `docs-code-scanner` |
| **M8** sectionCompleteness | PRD/Plan/Design 9-section | ≥85 | PRD, Plan, Design | `gap-detector` |
| **M9** regressionMatch | 직전 sprint 회귀 0건 | =0 | QA | `regression-rules-checker` |
| **M10** reportCompleteness | 보고서 9-section | ≥85 | Report | `gap-detector` |
| **S1** dataFlowIntegrity | 7-Layer 통합 무결성 | =100 | QA | `sprint-qa-flow` agent |
| **S2** featureCompletion | featureMap 집계 | =100 | Report | featureMap |
| **S3** sprintCycleTime | sprint 시작→archived 시간 | budget 내 | Report | timeline tracker |
| **S4** crossSprintIntegrity | 다른 sprint 영향 0건 | =0 | Report | docs-code-scanner |

### 4.1 Sub-sprint 별 Gate 활성 매트릭스

| Sub-sprint | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | S1 | S2 | S3 | S4 |
|-----------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---:|:--:|:--:|:--:|:--:|
| Coordination | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Defense | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| A Observability | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| E Defense | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Doc | - | - | - | - | - | - | ✓ | ✓ | - | ✓ | - | ✓ | ✓ | ✓ |
| Observation | - | - | - | - | - | - | - | - | - | ✓ | - | - | ✓ | - |

---

## 5. Sprint Scope Breakdown — 6 Sub-sprints (Kahn Topological Sort)

### 5.1 Dependency DAG

```
[Coordination P0] ───┬──> [Defense P1×5] ───┬──> [A Observability P1×3] ───> [E Defense 확장 P2×3] ──┬──> [Doc P3×4]
                     │                       │                                                          │
                     └───────────────────────┴──────────────────────────────────────────────────────────┘
                                                            │
                                                            v
                                                   [Observation P2] (전 sprint 병행)
```

### 5.2 Sub-sprint 1: Sprint Coordination (P0 단독)

- **ENH 묶음**: ENH-292 (sequential dispatch + cache-cost-analyzer) + ENH-287 (CTO Team Coordination 통합)
- **선행 의존성**: 없음 (sprint 시작)
- **인계 산출물**:
  - `lib/orchestrator/sub-agent-dispatcher.js` (신규 — sequential dispatch state machine)
  - `lib/orchestrator/cache-cost-analyzer.js` (신규 — cache hit rate observability)
  - `lib/domain/ports/caching-cost.port.js` (Port 7→8 첫 도입)
  - `lib/infra/caching-cost-cli.js` (Adapter)
  - 18 cto-lead Task spawn blocks → sequential 분기 적용
- **차별화**: #3 (Sequential Dispatch Moat) **결정적 강화** (11-streak #56293 무해소)
- **토큰 예산**: 100K (single-sprint cap, 800 LOC est. × 6.67 tokens/LOC + Design depth = ~80K 코어 + 20K dispatcher review)
- **기간**: W1 D1 ~ W2 D5 (10 days)
- **Pre-mortem**: latency 증가 → 첫 spawn만 sequential, cache hit 후 parallel 복원, L4만 강제

### 5.3 Sub-sprint 2: Sprint Defense (P1×5 통합)

- **ENH 묶음**: ENH-289 + ENH-298 + ENH-303 + **ENH-310 신규** + MON-CC-NEW-PLUGIN-HOOK-DROP
- **선행 의존성**: Coordination Archived (안전한 dispatch 보장 후)
- **인계 산출물**:
  - `lib/defense/layer-6-audit.js` (신규 — post-hoc audit + alarm + auto-rollback, ENH-289)
  - `lib/defense/heredoc-detector.js` (신규 — regex MVP, 30+ adversarial TC, ENH-310)
  - `hooks/unified-bash-pre.js` 확장 (heredoc + push event)
  - `hooks/post-tool-use-handler.js` 확장 (continueOnBlock + reason, ENH-303)
  - `hooks/session-start.js` 확장 (plugin hook reachability sanity check)
- **차별화**: #2 (Defense Layer 6) + #5 (continueOnBlock) + **#6 신규 (Heredoc Bypass)**
- **토큰 예산**: 100K (1,200 LOC × 6.67 = 80K + L3 contract TC = 20K)
- **기간**: W2 D5 ~ W4 D1 (8 days)
- **Pre-mortem**: ENH-310 regex false-positive → 보수적 패턴 (`\$\(` 명시), Defense Layer 2 격리 (warning + AskUserQuestion), 30+ adversarial TC

### 5.4 Sub-sprint 3: Sprint A Observability (P1×3 단독)

- **ENH 묶음**: ENH-281 (OTEL 10 누적 unified emit) + ENH-293 (Subprocess Env Propagation, CARRY-5 closure) + ENH-282 (alwaysLoad 측정)
- **선행 의존성**: Defense Archived (안전한 hook env 확보 후 OTEL emit)
- **인계 산출물**:
  - `lib/infra/telemetry.js` 확장 (OTEL 10 unified — `gen_ai.*` semantic conventions)
  - `lib/infra/otel-env-capturer.js` (신규 — SessionStart capture .bkit/runtime/otel-env.json, ENH-293)
  - `hooks/session-start.js` 확장 (env hydrate, CARRY-5 closure)
  - `.bkit/runtime/otel-env.json` (신규 runtime artifact)
  - alwaysLoad 측정 보고서 (1주 trace 기반)
- **토큰 예산**: 80K (600 LOC × 6.67 = 50K + OTEL ndjson 측정 = 30K)
- **기간**: W4 D1 ~ W4 D5 (5 days)
- **CARRY closure**: CARRY-5 #17 token-meter Adapter zero entries 근본 원인 해소

### 5.5 Sub-sprint 4: Sprint E Defense 확장 (P2×3)

- **ENH 묶음**: ENH-286 (Memory Enforcer PreToolUse deny-list) + ENH-300 (Effort-aware Adaptive Defense) + ENH-307 (ADR 0003 invariant 10 신설)
- **선행 의존성**: A Observability Archived (OTEL emit 후 effort.level trace 확보)
- **인계 산출물**:
  - `lib/defense/memory-enforcer.js` (신규 — CC advisory → enforced 격상, ENH-286)
  - `hooks/unified-bash-pre.js`/`unified-write-pre.js` 확장 (effort.level 분기, ENH-300)
  - `lib/domain/guards/invariant-10-effort-aware.js` (신규 — ADR 0003 v10 신설, ENH-307)
  - `docs/05-architecture/invariants.md` 업데이트 (invariant 9 → 10)
- **차별화**: #1 (Memory Enforcer) + #4 (Effort-aware Adaptive Defense)
- **토큰 예산**: 60K (400 LOC × 6.67 = 33K + invariant CI gate = 27K)
- **기간**: W5 D1 ~ W5 D4 (4 days)

### 5.6 Sub-sprint 5: Sprint Doc (P3×4)

- **ENH 묶음**: ENH-309 (release_drift_score) + ENH-306 (Stale lock dedup) + ENH-291 (1536-char 정정 P2 강등) + ENH-296 (R-3 Evolved-form Tracker)
- **선행 의존성**: E Defense Archived (invariant 10 반영 후 문서 동기화)
- **인계 산출물**:
  - `agents/cc-version-researcher.md` prompt 확장 (release_drift_score + evolved form tracker)
  - `docs/05-architecture/invariants.md` v10 항목 / `docs/06-guide/version-policy.guide.md` 업데이트
  - `scripts/check-skill-frontmatter.js` 보수적 cap 정정 (250자 → 1536자 공식 cap, ENH-291 P2 강등)
  - bkit memory MEMORY.md skill description 메모리 정정 ("R-3 violation 카운트" 표기 통일)
- **토큰 예산**: 40K (300 LOC × 6.67 = 20K + 문서 검수 = 20K)
- **기간**: W5 D4 ~ W5 D5 (2 days)

### 5.7 Sub-sprint 6: Sprint Observation (P2 obs)

- **묶음**: MON-CC-NEW-NOTIFICATION (#58909) 1-cycle 관찰 + 차별화 #7 신규 후보 (Workflow Durability Native, #58895 UserIdle) 1-2 cycles 관찰
- **선행 의존성**: 없음 (전 sprint 병행 — observation only)
- **인계 산출물**:
  - `docs/04-report/features/v2114-observation.report.md` (관찰 데이터 + 차별화 #7 정식 편입 결정)
  - bkit memory MON-CC-NEW-NOTIFICATION 카운터 시작
- **토큰 예산**: 20K (관찰 + 보고서, 200 LOC est. × 6.67 = 1.3K + 보고서 18K)
- **기간**: W1 D1 ~ W5 EOD (전 sprint 병행)

### 5.8 Sub-sprint Token Budget Summary

| Sub-sprint | Token Budget | LOC est. | 기간 | Phase Timeout 위험 |
|-----------|:-----------:|:--------:|:----:|:-----------------:|
| 1. Coordination | 100K | ~800 | 10d | Low |
| 2. Defense | 100K | ~1,200 | 8d | **Medium** (ENH-310 TC 부하) |
| 3. A Observability | 80K | ~600 | 5d | Low |
| 4. E Defense 확장 | 60K | ~400 | 4d | Low |
| 5. Doc | 40K | ~300 | 2d | Low |
| 6. Observation | 20K | ~200 | 35d (병행) | Low |
| **Total** | **400K** | **~3,500** | **35d** | - |
| **Effective Budget (× 1.875 safety buffer)** | **750K** | - | - | - |
| **Sprint Budget Cap** (`bkit.config.json:sprint.defaultBudget`) | **1,000K** | - | - | safe margin 250K |

---

## 6. KPI / Quality Gates Mapping (K1-K10 ↔ M1-M10 + S1-S4)

| KPI | Description | Target | Mapped Gate | 측정 도구 |
|----|------------|--------|------------|----------|
| **K1** 토큰 비용 절감률 (ENH-292) | cache hit 4% → 40% | ≥36 pp 상승 | M10 + S3 | `cache-cost-analyzer` + OTEL `gen_ai.cache_*` metrics |
| **K2** Heredoc 차단율 (ENH-310) | 30+ adversarial TC PASS | 100% | M3 + S1 | `heredoc-detector` unit + L3 contract TC |
| **K3** OTEL coverage (ENH-281+293) | 10 metrics × Sprint phases | ≥80% | M7 + S1 | OTEL ndjson trace |
| **K4** Port 신설 (caching-cost.port) | 7 → 8 | 8 | M4 + M9 | check-domain-purity CI |
| **K5** Application Layer 도메인 (deferred) | 2 → 3 (v2.1.15+) | **2 유지** | M9 | (v2.1.14 측정 X) |
| **K6** matchRate (Design ↔ Code) | gap-detector 점수 | ≥90 (100 목표) | **M1** | gap-detector |
| **K7** dataFlowIntegrity (7-Layer S1) | 7-Layer 무결성 | =100 | **S1** | `sprint-qa-flow` agent |
| **K8** 회귀 0건 (consecutive 96 유지) | 직전 sprint 영향 | =0 critical | **M3 + M9** | regression-rules-checker |
| **K9** dogfooding (sprint-master-planner 첫 spawn) | 본 sprint self-validation | 1건 완료 | M10 + S2 | 본 문서 + Report |
| **K10** 차별화 명시화 (README + battlecard) | 6 차별화 모두 명시 | **6/6** | M7 + M10 | docs-code-scanner |

### 6.1 KPI Threshold 진척률 표

| Phase | K1 | K2 | K3 | K4 | K6 | K7 | K8 | K9 | K10 |
|-------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---:|
| PRD | - | - | - | - | - | - | =0 | - | 6/6 spec |
| Plan | - | - | - | spec | - | - | =0 | - | 6/6 spec |
| Design | - | - | - | spec | - | - | =0 | - | 6/6 spec |
| Do | partial | partial | partial | 8 | - | - | =0 | - | 6/6 |
| Iterate | partial | partial | partial | 8 | ≥90 | - | =0 | - | 6/6 |
| QA | ≥36pp | 100% | ≥80% | 8 | ≥90 | =100 | =0 | - | 6/6 |
| Report | ≥36pp | 100% | ≥80% | 8 | 100 (목표) | =100 | =0 | 1 | 6/6 |
| Archived | locked | locked | locked | 8 | locked | locked | =0 | 1 | 6/6 |

---

## 7. Pre-mortem (실패 시나리오 6건 + 완화 전략)

| # | 시나리오 | 가능성 | 영향도 | 완화 전략 |
|---|---------|:-----:|:-----:|---------|
| **R1** | **ENH-292 sequential dispatch latency 증가** — 1st-spawn cache miss 후 cache hit 정착 시점 지연으로 사용자 체감 속도 저하 | Medium | High | (a) 첫 spawn만 sequential, cache hit 후 parallel 복원 / (b) L4만 강제, L2/L3 user-choice / (c) cache-cost-analyzer OTEL trace 실시간 측정 / (d) opt-out flag 제공 (`BKIT_SEQUENTIAL_DISPATCH=0`) |
| **R2** | **ENH-310 regex false-positive** — legitimate heredoc 패턴 차단으로 사용자 unblock 호출 폭증 | Medium | High | (a) 보수적 패턴 (`\$\(` + `<<` 동시 명시) / (b) Defense Layer 2 격리 (warning + AskUserQuestion, not deny) / (c) 30+ adversarial TC + 20+ legitimate TC 모두 명시 / (d) opt-out flag (`BKIT_HEREDOC_DEFENSE=0`) |
| **R3** | **sprint-master-planner agent 0 사용 사례** — 본 spawn 출력 품질 보장 부재 | High | Medium | (a) Step A thinking amplifier 선행 (본 사이클 적용 완료) / (b) 사람 review 필수 (kay) / (c) 첫 sprint 최소 scope (13 ENHs 중 P0 단독 + P1 통합으로 분할) / (d) dogfooding 자체가 K9 KPI (자가검증) |
| **R4** | **Port 7→8 + Application Layer 동시 변경 회귀** — 본 sprint 동시 변경 시 회귀 위험 | Low (mitigation 적용) | Critical | (a) **Port +1만 우선** (caching-cost.port) / (b) **Application 추가는 v2.1.15 명시 이관** (Anti-Mission 명시) / (c) check-domain-purity CI gate 유지 / (d) docs-code-scanner trace |
| **R5** | **Trust L4 + auto-pause 0 발화 baseline** — 안전망 검증 부족, 사용자 무한 실행 위험 | Low | Critical | (a) v2.1.14 default **L2 강제** (`bkit.config.json:sprint.defaultTrustLevel`) / (b) phase-timeout 4h (1M token budget 내 safety margin 250K) / (c) sub-sprint 별 8-phase 명시 / (d) `/sprint pause` 사용자 옵션 명시 |
| **R6** | **차별화 6건 동시 명시화 후 CC 따라잡기 시 동시 무력화** — 차별화 모두 명시화 → CC가 모방하면 product moat 동시 손실 | Medium | Critical | (a) streak 추적 dashboard 도입 (각 차별화 #56293/#58904 등 streak 모니터링) / (b) 분기 별 보강 정책 (v2.1.15 차별화 #7 정식 편입 검토) / (c) bkit 차별화 SaaS / open-source 양면 전략 (PRD §3 GTM) / (d) bkit 자체 진화 속도 가속 (sprint cycle 4-5주 유지) |

### 7.1 추가 Risk (Observation, Critical 미만)

| # | 시나리오 | 가능성 | 영향도 | 완화 |
|---|---------|:-----:|:-----:|------|
| R7 | MON-CC-NEW-NOTIFICATION (#58909) regression 증가 | Low | Medium | 1-cycle 관찰 후 v2.1.15 결정 |
| R8 | 차별화 #7 (Workflow Durability) 정식 편입 시기 | Low | Low | 1-2 cycles 관찰 + v2.1.15 검토 |
| R9 | bkit-gemini fork stale 2.0.6 잘못 채택 (CARRY-6) | Low | Medium | CARRY-6 별도, 본 sprint 미포함 (Out-of-scope) |

---

## 8. Competitive Landscape (External B.4 종합)

### 8.1 경쟁 도구 비교 표

| 기능 | bkit v2.1.14 | Cursor | Windsurf | Aider | Continue.dev |
|------|:------------:|:------:|:--------:|:-----:|:------------:|
| **AI 생성 코드 verified spec compliance** | ✅ (matchRate 100 + S1 100) | ❌ | ❌ (logging만) | ❌ | ❌ |
| **9-phase per-feature lifecycle (PDCA)** | ✅ | ❌ (approval만) | ❌ | ❌ (2-phase) | ❌ (4-step) |
| **8-phase Sprint container (multi-feature scope/budget)** | ✅ (v2.1.13 GA) | ❌ | ❌ | ❌ | ❌ |
| **Trust Level L0-L4 + 4 auto-pause triggers** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Multi-layer Defense (PreToolUse + Layer 6 audit + rollback)** | ✅ (v2.1.14 Layer 6) | partial | partial | ❌ | ❌ |
| **Sub-agent caching 10x sequential dispatch (ENH-292)** | ✅ (v2.1.14) | ❌ (parallel default) | ❌ | ❌ | ❌ |
| **Heredoc Pipe Bypass Defense (ENH-310)** | ✅ (v2.1.14) | ❌ | ❌ | ❌ | ❌ |
| **Memory Enforcer (CC advisory → enforced, ENH-286)** | ✅ (v2.1.14) | partial (advisory) | partial | ❌ | ❌ |
| **PostToolUse continueOnBlock Moat (ENH-303)** | ✅ (v2.1.14) | ❌ (silent drop) | ❌ | ❌ | ❌ |
| **Effort-aware Adaptive Defense (ENH-300)** | ✅ (v2.1.14) | ❌ | ❌ | ❌ | ❌ |
| **OTEL `gen_ai.*` semantic conventions emit (ENH-281)** | ✅ (v2.1.14) | ❌ | partial | ❌ | ❌ |

### 8.2 "유일한 Verified Spec Compliance Plugin" 주장 외부 검증 인용

> External B.4 인용 (cc-version-researcher 종합):
> - **외부 0건 확인** — Cursor/Windsurf/Aider/Continue.dev 모두 verified spec compliance 기능 부재
> - Cursor는 "approval-based" — 사용자가 매 변경 승인하는 방식 (verified spec X)
> - Windsurf는 "logging-based" — 사후 로그만 (proactive matchRate 검증 X)
> - Aider 2-phase / Continue.dev 4-step은 bkit 9-phase 대비 phase 부족
>
> ⇒ bkit "AI 생성 코드를 자체 설계 스펙에 대해 검증하는 **유일한 Claude Code plugin**" 주장 **유효**

### 8.3 Anthropic Blog 직접 인용 (ENH-292 정당성)

> "A high cache hit rate cuts cost, improves latency, and loosens rate limits. **Anthropic monitors hit rates internally and treats low cache performance as an incident-level signal.**"
> "**fork operations must share the parent's prefix**"
> "Never add or remove tools mid-session"
>
> ⇒ ENH-292 sequential dispatch + cache-cost-analyzer는 Anthropic 자체 internal signal과 정합. **bkit 차별화 #3 product moat 결정적**.

---

## 9. Differentiation Strategy (차별화 6+1건)

### 9.1 차별화 6건 (v2.1.14 정식 출시)

| # | 차별화 | ENH | vs CC | Moat 깊이 | v2.1.14 상태 | streak 추적 |
|---|--------|-----|-------|----------|------------|------------|
| **1** | **Memory Enforcer** | ENH-286 | CC advisory directive (#56865, #57485, #58887 R-3 evolved) | 깊음 | **P1 정식 편입** | R-3 evolved 12건 모니터 |
| **2** | **Defense Layer 6** | ENH-289 | CC R-3 numbered #145 (16d 정체) + evolved 12건 | 보통 | **P1 정식 편입** | violation count 추적 |
| **3** | **Sequential Dispatch** | ENH-292 | CC parallel default (#56293 11-streak) | **깊음 결정적** | **P0 정식 편입** | #56293 streak 모니터 |
| **4** | **Effort-aware Adaptive Defense** | ENH-300 | CC `effort.level` surface only (F4-133, 미활용) | 보통 | **P2 정식 편입** | $CLAUDE_EFFORT grep 추적 |
| **5** | **PostToolUse continueOnBlock Moat** | ENH-303 | CC #57317 5-streak silent drop | 깊음 | **P1 정식 편입** | #57317 streak 모니터 |
| **6** | **Heredoc Pipe Bypass Defense** | ENH-310 | CC #58904 v2.1.73~v2.1.141 회귀 (68 versions) | **깊음** | **P1 신규 정식 편입** | #58904 streak 모니터 |

### 9.2 차별화 #7 신규 후보 (관찰만, v2.1.15+ 검토)

| # | 차별화 후보 | 외부 신호 | bkit 자기 충족 | v2.1.14 결정 |
|---|------------|----------|---------------|-------------|
| **7** | **Workflow Durability Native** | #58895 UserIdle hook feature request | Sprint L4 + phase timeout auto-pause + 4 triggers + recommendSprintSplit token-bounded | **관찰만 (1-2 cycles)** — Out-of-scope |

### 9.3 streak 추적 정책

- 각 차별화별 GitHub issue/PR/discussion 카운터를 `MEMORY.md`에 정량 기록
- streak ≥ 5 (5 consecutive 미해소): 차별화 P2 → P1 / P1 → P0 격상 후보
- streak ≥ 10: bkit 차별화 SNS 캠페인 정식 진행 trigger
- streak = 0 (CC 자체 fix 후 1 cycle): 차별화 격하 검토 (별도 분기 사이클)

---

## 10. Stakeholder Map

| Stakeholder | Role | Sprint 영향 | 응답 의무 |
|-------------|------|-----------|---------|
| **kay (POPUP STUDIO)** | Decision maker + 메인테이너 | 전 phase (gate별 confirm) | sprint-master-planner agent 첫 spawn 검증 |
| **vibecoder (1차 사용자)** | first wave Sprint v2.1.13 GA 사용자 | PRD (Job Stories 출처) + Report | Sprint v2.1.13 GA dogfooding 데이터 제공 |
| **외부 도구 사용자 (Cursor/Windsurf/Aider/Continue.dev)** | 비교 검토 대상 | PRD (Battlecard) + Report (차별화 명시) | (없음, observation only) |
| **CC 사용자 (stable v2.1.128 drift +13 노출)** | 보호 안내 대상 | README + Plan (CC 권장 버전 안내) | v2.1.123 보수 권장 안내 |
| **bkit:sprint-master-planner agent (자기 자신)** | 본 sprint 첫 spawn 대상 | 본 master plan + Report (dogfooding 자가평가) | K9 dogfooding KPI 충족 |

---

## 11. Growth Loops

### 11.1 Loop 1 — 차별화 명시화 → 사용자 확산

```
차별화 6/6 명시화 (README + battlecard + SNS)
        ↓
사용자 onboarding 시 토큰 절감 (ENH-292 cache hit 4% → 40%) 가시화
        ↓
bkit 차별화 SNS 확산 (각 차별화별 GIF demo + streak 인용)
        ↓
사용자 증가 → ENH-292 cache-cost-analyzer OTEL trace 누적
        ↓
ENH-300 effort-aware adaptive defense 데이터 누적 → 차별화 #4 강화
        ↓
(반복: 차별화 7건 확장 검토)
```

### 11.2 Loop 2 — dogfooding → 차별화 발굴

```
sprint-master-planner agent 첫 spawn (본 sprint v2.1.14 = dogfooding 1번째)
        ↓
Sprint v2.1.13 GA 검증 데이터 누적 (8-phase 통과 1건 + 4 auto-pause trigger 0~N 발화)
        ↓
v2.1.14 → v2.1.15 분석 사이클 진행 (External B 패턴)
        ↓
차별화 #7 (Workflow Durability Native, #58895) 신규 후보 검토
        ↓
v2.1.15 차별화 7개로 확장 (또는 격하 결정)
        ↓
(반복: 차별화 8건, 9건 ...)
```

---

## 12. Risk Matrix (전체)

| Risk ID | 시나리오 | Likelihood | Severity | Mitigation 출처 |
|---------|---------|:---------:|:--------:|:-------------:|
| R1 | ENH-292 sequential latency 증가 | M | H | § 7 R1 |
| R2 | ENH-310 regex false-positive | M | H | § 7 R2 |
| R3 | sprint-master-planner 0 사용 사례 | H | M | § 7 R3 |
| R4 | Port + Application 동시 변경 회귀 | L | **C** | § 7 R4 |
| R5 | Trust L4 + auto-pause 0 발화 baseline | L | **C** | § 7 R5 |
| R6 | 차별화 동시 명시화 → CC 모방 시 동시 무력화 | M | **C** | § 7 R6 |
| R7 | MON-CC-NEW-NOTIFICATION regression | L | M | § 7 R7 |
| R8 | 차별화 #7 정식 편입 시기 | L | L | § 7 R8 |
| R9 | bkit-gemini fork stale 채택 (CARRY-6) | L | M | § 7 R9 (Out-of-scope) |

### 12.1 Severity 분류

- **Critical (C)**: R4 (회귀 카탈로그 96 consecutive 손상), R5 (사용자 무한 실행), R6 (product moat 동시 손실)
- **High (H)**: R1 (사용자 체감 속도 저하), R2 (사용자 unblock 폭증)
- **Medium (M)**: R3 (dogfooding 품질 미보장), R7 (관찰 데이터 incompleteness), R9 (fork 환경 한정)
- **Low (L)**: R8 (관찰 의사결정 지연)

---

## 13. Sprint Timeline (35-day Gantt)

```
W1 (D1-D5)
├─ D1-D2  : Sprint Coordination PRD + Plan (ENH-292 + ENH-287)
├─ D3-D5  : Sprint Coordination Design + Do 시작
└─ Observation: MON-CC-NEW-NOTIFICATION 카운터 시작

W2 (D6-D10)
├─ D6-D8  : Sprint Coordination Do + Iterate + QA
├─ D9-D10 : Sprint Coordination Report + Archived
└─ D10    : Sprint Defense PRD + Plan 시작

W3 (D11-D15)
├─ D11-D12: Sprint Defense Design (ENH-289/298/303/310 통합 spec)
├─ D13-D15: Sprint Defense Do + Iterate

W4 (D16-D20)
├─ D16    : Sprint Defense QA + Report + Archived
├─ D17    : Sprint A Observability PRD + Plan
├─ D18    : Sprint A Observability Design
├─ D19-D20: Sprint A Observability Do + Iterate + QA + Report + Archived

W5 (D21-D25)
├─ D21    : Sprint E Defense 확장 PRD + Plan + Design
├─ D22-D23: Sprint E Defense Do + Iterate
├─ D24    : Sprint E Defense QA + Report + Archived
├─ D24-D25: Sprint Doc Do + Report + Archived
└─ D25    : Sprint Observation 종합 보고서 + 차별화 #7 결정

(buffer: D26-D35 — 10 days safety margin for QUALITY_GATE_FAIL / ITERATION_EXHAUSTED auto-pause 대응)
```

### 13.1 Phase Timeout 4h × 8 phases × 6 sub-sprints = 192h budget

- `bkit.config.json:sprint.phaseTimeoutHours = 4`
- 6 sub-sprints × 8 phases = 48 phase 진행 ⇒ 4h × 48 = **192h cap (8 days)**
- 실 작업 25 days + buffer 10 days = 35 days, **TIMEOUT 안전 margin 충분**

---

## 14. Token Budget Allocation (1M cap 검증)

### 14.1 Sub-sprint 별 Token Budget (recommendSprintSplit 활용)

| Sub-sprint | LOC est. | tokensPerLOC (6.67) | Core Tokens | + Design/TC | Total | maxTokensPerSprint (100K) 적합 |
|-----------|:--------:|:-------------------:|:-----------:|:-----------:|:-----:|:-----------------------------:|
| 1. Coordination | 800 | 6.67 | 5,336 | +95K | **100K** | ✅ |
| 2. Defense | 1,200 | 6.67 | 8,004 | +92K | **100K** | ✅ |
| 3. A Observability | 600 | 6.67 | 4,002 | +76K | **80K** | ✅ |
| 4. E Defense | 400 | 6.67 | 2,668 | +57K | **60K** | ✅ |
| 5. Doc | 300 | 6.67 | 2,001 | +38K | **40K** | ✅ |
| 6. Observation | 200 | 6.67 | 1,334 | +19K | **20K** | ✅ |
| **Sum (Core LOC)** | **3,500** | - | **23,345** | - | **400K** | - |

### 14.2 safetyMargin 0.25 적용

- effectiveBudget = 1,000,000 × (1 - 0.25) = **750,000 tokens**
- estimated Sum (400K) ÷ effectiveBudget (750K) = **53% 활용**
- safe margin 350K 유지 ⇒ BUDGET_EXCEEDED auto-pause 가능성 **Low**

### 14.3 bkit.config.json:sprint 정합 검증

| Config Key | Value | 본 Sprint 정합 |
|-----------|:-----:|:------------:|
| `sprint.defaultBudget` | 1,000,000 | ✅ 400K 추정 < 1M cap |
| `sprint.defaultTrustLevel` | L2 | ✅ L2 default |
| `sprint.phaseTimeoutHours` | 4 | ✅ 192h cap 적합 |
| `sprint.maxIterations` | 5 | ✅ matchRate <90 시 iter≥5 ITERATION_EXHAUSTED |
| `sprint.qualityGates.M1` | 90 (target 100) | ✅ K6 ≥90 (100 목표) |
| `sprint.qualityGates.M2` | 80 | ✅ M2 ≥80 |
| `sprint.qualityGates.M3` | 0 | ✅ M3 =0 |
| `sprint.qualityGates.M8` | 85 | ✅ M8 ≥85 |
| `sprint.contextSizing.maxTokensPerSprint` | 100,000 | ✅ sub-sprint 별 cap 적합 |
| `sprint.contextSizing.tokensPerLOC` | 6.67 | ✅ § 14.1 적용 |
| `sprint.contextSizing.safetyMargin` | 0.25 | ✅ § 14.2 적용 |

---

## 15. Auto-Pause Triggers (4 활성)

| Trigger | 조건 | 가능성 | 사용자 결정 옵션 |
|---------|------|:-----:|----------------|
| **QUALITY_GATE_FAIL** | M3 > 0 OR S1 < 100 | Medium (ENH-310 TC 부하) | (a) fix & resume / (b) forward fix (TC 추가) / (c) abort & archive |
| **ITERATION_EXHAUSTED** | iter ≥ 5 AND matchRate < 90 | Low (gap-detector matchRate 100 목표) | (a) forward fix (수동 patch) / (b) carry to v2.1.15 / (c) abort |
| **BUDGET_EXCEEDED** | cumulativeTokens > 1M | **Low (400K 추정, 60% buffer)** | (a) budget 증액 (`.bkit/state/sprint/v2114.json` patch) & resume / (b) abort / (c) archive partial |
| **PHASE_TIMEOUT** | phase > 4h | Low (10d buffer 충분) | (a) timeout 연장 (4h → 8h patch) / (b) force-advance (다음 phase 강제 전이) / (c) abort |

### 15.1 Resume / Abort 흐름

| 상황 | 절차 |
|------|------|
| Auto-pause 후 resume | `/sprint resume v2114-differentiation-release` — 사유 해소 검증 + audit_logger record |
| 사용자 abort | `/sprint archive v2114-differentiation-release` — terminal state (readonly) + report 자동 생성 |
| Phase forward (gate skip) | 사용자 명시 + L4 only — `/sprint phase v2114 --force-advance` |

---

## 16. Open Questions (사용자 의사결정 보류)

| # | Question | Options | 기본 선택 | 결정 시점 |
|---|---------|---------|---------|---------|
| **Q1** | 차별화 #6 (Heredoc) vs 차별화 #7 (Workflow Durability) 우선순위 | (a) ENH-310 v2.1.14 정식 + #58895 관찰 / (b) ENH-310 + #58895 모두 v2.1.14 / (c) #58895 v2.1.15 deferred | **(a)** (본 sprint scope 명시) | PRD §5 결정 |
| **Q2** | Application Layer 3 도메인 v2.1.14 포함 여부 | (a) v2.1.15 이관 / (b) v2.1.14 포함 (Port 7→8과 동시) | **(a) 이관** (R4 회귀 위험) | 본 Master Plan §1 Anti-Mission |
| **Q3** | v2.1.14 CC 권장 버전 (균형) | (a) v2.1.140 유지 / (b) v2.1.141 격상 / (c) v2.1.123 보수 권장 (drift +18) | **(a) v2.1.140** (96 consecutive + ADR 17/17 PASS) | Plan §3 명시 |
| **Q4** | sprint-master-planner dogfooding 결과 review process | (a) kay 1인 review / (b) external review (Cursor/Aider 사용자) / (c) 자가평가 only | **(a) kay 1인 review** + 자가평가 기록 | Report §9 명시 |
| **Q5** | ENH-292 sequential dispatch 강제 범위 | (a) L4만 강제 / (b) L3/L4 강제 / (c) 전 Level opt-in | **(a) L4만** + opt-in flag | Design §3 명시 |

---

## 17. Cross-Sprint Dependency

### 17.1 본 sprint가 다른 sprint 의존

- **Sprint v2.1.13 (Sprint Management GA)**: 본 sprint의 8-phase container, sprint-orchestrator, sprint-master-planner agent 모두 v2.1.13 산출물에 의존
- **Sprint v2.1.10 (Clean Arch 4-Layer)**: 본 sprint의 Port 7→8 신설은 v2.1.10 Port↔Adapter 패턴에 의존
- **Sprint v2.1.11 (Application Layer pilot)**: pdca-lifecycle/ + sprint-lifecycle/ frozen 9-phase + 8-phase enum 활용
- **Sprint v2.1.12 (evals hotfix)**: scripts/evals-wrapper.js argv 안정화 활용

### 17.2 다른 sprint가 본 sprint 산출 활용

- **Sprint v2.1.15 (예정)**: Application Layer 3rd domain (`agent-dispatch/`) 시점에 본 sprint의 caching-cost.port + sub-agent-dispatcher 활용
- **Sprint v2.1.16+ (예정)**: 차별화 #7 (Workflow Durability Native) 정식 편입 시 본 sprint의 관찰 데이터 활용
- **CARRY closure**: 본 sprint의 ENH-293 (OTEL Subprocess Env Propagation) closure로 CARRY-5 #17 token-meter Adapter zero entries 해소

---

## 18. Sprint 추적 (Living Document)

본 master plan 은 sprint 진행 중 cumulative KPI 갱신 + phase 전이 시 history append. archived 시 readonly 전환.

### 18.1 Living KPI Section (sprint 진행 중 갱신)

| Date | K1 | K2 | K3 | K4 | K6 | K7 | K8 | K9 | K10 | Notes |
|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---:|-------|
| 2026-05-14 | - | - | - | 7 (baseline) | - | - | =0 | 0 | 0/6 (baseline) | Sprint 시작, master plan 작성 |
| (TBD W1 EOD) | - | - | - | 8 (Coord Done) | - | - | =0 | 0 | 1/6 (#3) | Coordination Archived |
| (TBD W2 EOD) | - | - | - | 8 | - | - | =0 | 0 | 5/6 (#2#3#5#6+plugin) | Defense Archived |
| (TBD W3 EOD) | partial | - | partial | 8 | - | - | =0 | 0 | 5/6 | A Observability Archived |
| (TBD W4 EOD) | partial | - | partial | 8 | - | - | =0 | 0 | 6/6 (#1#4 추가) | E Defense Archived |
| (TBD W5 EOD) | ≥36pp | 100% | ≥80% | 8 | ≥90 | =100 | =0 | **1** | **6/6** | Sprint Archived |

### 18.2 Phase Transition History (append-only)

| Phase | Entered | Exited | Duration | Auto-pause Trigger | Resume Reason |
|-------|---------|--------|---------|------------------|--------------|
| (master plan) | 2026-05-14 | - | - | - | - |
| prd (Coordination) | (TBD) | - | - | - | - |
| ... | ... | ... | ... | ... | ... |

---

## 19. Final Checklist (Master Plan 완료 검증)

- [x] Executive Summary 6-row (Mission + Anti-Mission + Core Primitives + Trust Level + Auto-pause + Success Criteria)
- [x] Context Anchor 5 keys (WHY / WHO / WHAT / RISK / SUCCESS / SCOPE / OUT-OF-SCOPE)
- [x] 4-perspective 가치 표 (안정성 5 / 성능 4 / 보안 5 / 비용 4)
- [x] Features 13 ENHs + 4 Doc + 2 Observation = 19 항목
- [x] 8-phase Roadmap × 6 sub-sprints
- [x] Quality Gates M1-M10 + S1-S4 = 14 gates 매트릭스
- [x] 6 Sub-sprints Topological DAG + Token Budget
- [x] KPI K1-K10 ↔ Gate 매핑
- [x] Pre-mortem 6 critical + 3 observation
- [x] Competitive Landscape (Cursor/Windsurf/Aider/Continue.dev) + Anthropic Blog 인용
- [x] Differentiation 6+1 (정식 6 + 관찰 1)
- [x] Stakeholder Map 5명
- [x] Growth Loops 2 (명시화 → 확산, dogfooding → 발굴)
- [x] Risk Matrix 9 (Critical 3 + High 2 + Medium 3 + Low 1)
- [x] Timeline 35-day Gantt + Phase Timeout cap
- [x] Token Budget 400K estimate / 750K effective / 1M cap (정합)
- [x] Auto-Pause Triggers 4 활성 + Resume/Abort 흐름
- [x] Open Questions 5건 (Q1-Q5)
- [x] Cross-Sprint Dependency (v2.1.10/11/12/13 입력 + v2.1.15/16 출력)
- [x] Living document 추적 골조

---

> **Status**: Draft v1.0 — pending review by kay (POPUP STUDIO).
> **Next**: PRD (`docs/sprint/v2114/prd.md`) → Plan (`docs/sprint/v2114/plan.md`) → Design (`docs/sprint/v2114/design.md`).
> **Dogfooding Marker**: `bkit:sprint-master-planner` agent 1st spawn — Sprint Management v2.1.13 GA self-validation 의무 완료 (K9 = 1).
