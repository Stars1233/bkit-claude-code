# bkit v2.1.13 Documentation Synchronization — Sprint Master Plan

> **Sprint ID**: `v2113-docs-sync`
> **Sprint Name**: bkit v2.1.13 Documentation Synchronization & Self-Validation Sprint
> **Sprint Type**: meta-container (PDCA-as-Sprint 패턴, dogfooding bkit on itself)
> **Target Release**: bkit v2.1.13 (GA 준비 단계, CC v2.1.139+ 환경)
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Date**: 2026-05-12
> **Branch**: `feature/v2113-sprint-management`
> **Base**: `5edae8f qa(v2.1.13): final QA report + 2 inline root-fixes`
> **Status**: Draft v1.0 — Sprint init 직전 (사용자 승인 후 `/sprint init v2113-docs-sync` 실행)
> **사용자 명시 결정** (2026-05-12 승인):
> 1. 본 sprint는 **현재 세션 `--plugin-dir .` 실행** 환경에서 bkit 자체 sprint 기능으로 진행
> 2. 빠르게가 아닌 **꼼꼼하게**, 코드베이스/CC version 호환성/v2.1.13 변경 사항 심층 분석 후 진행
> 3. Task Management System 활용 — Sprint phase × Feature × Task 3-tier 추적
> 4. 본 sprint는 **자가 검증 (dogfooding)**: `/sprint init/start/status/qa/report` 실제 사용 + gap-detector 동작 확인
> 5. ✅ **사용자 승인 (Q1)**: 9 features 구성 그대로 진행
> 6. ✅ **사용자 승인 (Q2)**: Trust Level **L4 Full-Auto** + "꼼꼼하고 완벽하게" — auto-run + 각 phase 후 QA 자가 검증 강화
> 7. ✅ **사용자 승인 (Q3)**: README 권장 CC 버전 **v2.1.123 (보수적)** 채택
> 8. ✅ **사용자 승인 (Q4)**: F8 archive 자동 실행 (incremental approval X), 최종 git diff에서 일괄 검토 후 커밋·푸시는 사용자 별도 지시

---

## 0. Executive Summary

| 항목 | 내용 |
|------|------|
| **Mission** | v2.1.13에 추가된 신규 기능(Sprint Management) · 아키텍처 변경 · 기술부채 청산 결과를 **모든 문서/매니페스트/매뉴얼**에 동기화하고, 같은 sprint를 **bkit `/sprint` 기능 자체 검증 수단**으로 활용 |
| **Anti-Mission** | (1) 신규 기능 추가 X (BKIT_VERSION constant bump 제외 모든 코드 수정 금지). (2) v2.1.13 코드 자체 회귀 X. (3) memoization/MEMORY.md 변경 시 시간 형태(`2026-04-29`) 보존. (4) docs/ 한국어 / README·CHANGELOG·skills/agents English 원칙 위반 X |
| **Core Deliverables** | (a) BKIT_VERSION 5-loc invariant 2.1.12 → 2.1.13 / (b) CHANGELOG v2.1.13 신규 섹션 (Sprint Management + 기술부채 + inline fix + carryover closures) / (c) README/README-FULL/CUSTOMIZATION-GUIDE/AI-NATIVE-DEVELOPMENT 동기화 / (d) bkit-system/ Obsidian graph 동기화 / (e) docs/ legacy archive ≈89 파일 + `/pdca cleanup` |
| **Self-Validation Deliverables** | (f) `/sprint init/start/status` 실 사용 + 결과 기록 / (g) gap-detector 본 master plan vs 구현 매치율 측정 / (h) `/pdca cleanup` 실 사용 검증 / (i) Sprint QA 7-Layer S1 dataFlow integrity 본 sprint에 적용 |
| **Phase 흐름** | `prd → plan → design → do → iterate → qa → report → archived` (Sprint Management 8-phase) |
| **Command Surface** | `/sprint init v2113-docs-sync` → `/sprint start v2113-docs-sync --trust L2` → `/sprint status` → `/sprint qa` → `/sprint report` → `/sprint archive` |
| **Integration Scope** | F1~F9 9-feature 묶음. PDCA 9-phase는 사용 X (sprint 8-phase로 통합). Trust Level L2 (semi-auto, phase 전환마다 사용자 승인) |
| **Architecture Layer Map** | 문서 동기화이므로 코드 변경은 BKIT_VERSION 5-loc constant + hooks/session-start.js comment / hooks/hooks.json description 만. Domain/Application/Infrastructure 레이어 변경 0 (invariant). |
| **Documentation Locations (산출물)** | 본 master plan 1 + PRD 1 + Plan 1 + Design 1 + Iterate report 0-N + QA report 1 + Final report 1 |
| **State Persistence** | `.bkit/state/sprints/v2113-docs-sync.json` (sprint root state) + `.bkit/state/sprint-status.json` (active sprints list) + `.bkit/runtime/sprint-feature-map.json` |
| **Quality Gates** | bkit M1 (matchRate ≥90%) + M2 (codeQualityScore ≥80) + M8 (sprint matchRate ≥85%) + S1 (dataFlow integrity — 본 sprint에서는 문서 → 코드 cross-reference 무결성으로 변형 적용) |
| **Success Criteria (8건)** | (1) `scripts/docs-code-sync.js` 0 drift PASS / (2) `claude plugin validate .` Exit 0 / (3) BKIT_VERSION 5-loc 모두 2.1.13 / (4) `grep -rn '2\.1\.12'` 활성 문서 영역 0건 (docs/03~05/00-pm 보관 영역 제외) / (5) `/sprint qa` S1 score ≥ 85% / (6) docs/ legacy 89+ 파일 archive 완료 + `.pdca-status.json` stale 0건 / (7) gap-detector master plan ↔ 산출물 매치율 ≥ 90% / (8) 본 sprint report 생성 + lessons learned ≥ 5건 |
| **Risk** | (a) Component count drift (실측 vs 메모리 vs README 불일치). (b) Sprint 자체 검증 회귀 (`/sprint` 명령이 본 sprint 진행 중 버그 발견 시 코드 수정 vs 문서 수정 우선순위 충돌). (c) docs/ archive 과잉 — 살아있는 carryover 문서 오삭제. (d) CHANGELOG v2.1.13 섹션 누락 항목 (4 UX sub-sprints, deep-sweep v2, inline fixes, CARRY closures 6+건). (e) ENH-292 sub-agent caching 10x 회귀 — sprint orchestrator multi-agent spawn 시 cache cost 폭증 (Sequential dispatch 강제로 회피) |
| **Estimated LOC** | 약 +800 LOC docs 추가 (CHANGELOG v2.1.13 섹션 ~250 + README-FULL Sprint Management 섹션 확장 ~150 + bkit-system 갱신 ~200 + master plan 본 문서 ~600 + sub-docs ~200). 코드 수정 ≤ 20 LOC (constant bump only). Archive: ~89 파일 이동. |

---

## 1. Context Anchor (Plan → Design → Do 전파)

> 기존 `sprint-management.master-plan.md` 패턴 인용. 본 sprint의 모든 sub-feature 산출물은 이 5-line Context Anchor를 상단에 보존한다.

| Key | Value |
|-----|-------|
| **WHY** | v2.1.13에서 (a) Sprint Management 신규 + (b) -2,333 LOC 기술부채 청산 + (c) 4 UX sub-sprints (S1-UX, S2-UX, S3-UX, S4-UX) + (d) v2.1.12에서 carry된 CARRY-7~12 closures 완료. 그러나 README/README-FULL/CHANGELOG/CUSTOMIZATION-GUIDE/AI-NATIVE-DEVELOPMENT/bkit-system/bkit.config.json/plugin.json/marketplace.json/hooks.json/session-start.js 모두 **`2.1.12` 잔재**. 신규 사용자가 README에서 Sprint를 발견 못 하거나, plugin validate가 마켓플레이스 version mismatch로 실패하거나, docs-code-sync invariant CI gate가 8-count drift로 깨질 위험. |
| **WHO** | (1) 신규 bkit 설치 사용자 (정확한 onboarding 경로), (2) bkit maintainer kay (memory/MEMORY.md 갱신 + 다음 사이클 baseline), (3) marketplace 검색 사용자 (`.claude-plugin/marketplace.json:version` 정확성), (4) CI gate (docs-code-sync.js + check-quality-gates-m1-m10.js + L4 contract test), (5) Sprint 기능 베타 사용자 (실제 working example 본 sprint) |
| **WHAT (도메인)** | **문서 surface 11개** + **BKIT_VERSION 5-loc invariant** + **89+ legacy doc archive** + **bkit `/sprint` 자가 검증**. Sprint 8-phase × 9 feature × Task Management System 3-tier 추적. |
| **WHAT NOT** | (1) 신규 기능 추가 — sprint 자체 enhancement (예: `/sprint diff` 신규 sub-action) X. (2) v2.1.13 코드 회귀 수정 — 인라인 fix는 마스터 plan 외 별도 hotfix. (3) v2.1.12 carry로 남은 항목 (예: 121/142 lib legacy layer)을 v2.1.13으로 closure X — v2.1.14+로 carry 유지. (4) `lib/` 142 모듈 `@version 2.1.12 → 2.1.13` bulk update는 별도 hotfix 트랙 (본 sprint 범위 X — 문서/매니페스트/skill cross-reference만). (5) docs/06-guide/ Korean guides는 v2.1.13 sprint master planner가 이미 작성 완료 (v2113-sprint-5-quality-docs Phase 7) — 본 sprint 재작성 X. |
| **RISK** | (a) **Component count drift 검증 누락**: skills 44 / agents 34(.md 파일) / templates 39 — 메모리는 "43 Skills, 36 Agents" 주장. Real count 우선. (b) **Sprint dogfooding 회귀**: 본 sprint 진행 중 `/sprint` 버그 노출 시 → 즉시 코드 hotfix 시 본 sprint phase 전환 깨질 수 있음. Trust L2 manual checkpoint로 완충. (c) **Archive 과잉**: bkit-v2110-* / v2111-* / v2112-* 패턴이 살아있는 ADR (0004/0005/0006/0007)이나 active master plans (sprint-management / sprint-ux-improvement)를 잘못 포함할 위험 → archive 전 whitelist 확정 필수. (d) **CHANGELOG v2.1.13 누락**: 4 UX sub-sprints + deep-sweep v2 + Sprint 1~5 + inline root-fix 2건 + CARRY-7~12 closures + skill cross-reference 14건. (e) **Documentation language 충돌**: docs/ 한국어 vs README/CHANGELOG/skills English — 단일 파일 내 mixing 금지 원칙 (CLAUDE.md). (f) **ENH-292 caching 10x 회귀**: 본 sprint orchestrator 시 multi-agent spawn 시 cache miss 4%→40%. Sequential dispatch (sprint-orchestrator.md Frontmatter `ENH-292`) 강제. |
| **SUCCESS** | (1) `scripts/docs-code-sync.js` 8-count + BKIT_VERSION invariant 0 drift PASS. (2) `claude plugin validate .` Exit 0 (F9-120 closure **9 릴리스 연속 PASS** 유지). (3) 활성 문서 영역 `grep -rn '2\.1\.12'` 0건 (보관/메모리/CHANGELOG 역사 보존 영역 제외). (4) `/sprint qa v2113-docs-sync` S1 dataFlow ≥ 85% (문서 cross-reference integrity로 재해석). (5) `gap-detector` master plan ↔ 산출물 매치율 ≥ 90%. (6) `/pdca cleanup` 후 `.pdca-status.json` stale features 0건. (7) docs/ archive ≥ 80 파일 완료 (whitelist 통과한 89+ 후보 중). (8) Final report에 lessons learned ≥ 5건 + carry items ≥ 0건 (목표 완료). |
| **SCOPE (정량)** | **신규 문서 4** (master plan + PRD + plan + design 본 sprint 자체) + **수정 문서 11** (README + README-FULL + CHANGELOG + CUSTOMIZATION-GUIDE + AI-NATIVE-DEVELOPMENT + bkit.config.json + plugin.json + marketplace.json + hooks.json + session-start.js + bkit-system/_GRAPH-INDEX.md + 4 bkit-system/components/* overview) + **Archive 파일 89** + **Task 약 35** (Sprint phase × feature × sub-task). **신규 코드 0** (constant bump ≤ 10 LOC 예외). **TC 0** (기존 contract test 통과 유지만 확인). |
| **OUT-OF-SCOPE** | (1) v2.1.14 진입 (Sprint F-1 121 lib legacy layer Clean Arch 완전 이전). (2) Sprint Management 자체 enhancement (`/sprint export`, `/sprint diff`). (3) cc-version-analysis v2140+ 신규 사이클. (4) bkit-evals 28 eval set v2.1.13 신규 추가 (별도 사이클). (5) docs/06-guide Korean guides 재작성 (이미 v2113-sprint-5-quality-docs로 완결). |

---

## 2. v2.1.13 변경 사항 심층 분석 (Sprint 컨텍스트의 기반)

> 본 sprint의 모든 documentation 변경은 다음 ground truth에 anchor된다.

### 2.1 Commit 흐름 (main..HEAD, 30건)

| Phase | Commit | 요지 | LOC |
|---|---|---|---|
| Sprint 1 Domain | `a7009a5` | Sprint Management Master Plan v1.1 + 4 ADRs + Sprint 1 Domain Foundation (8-phase enum + transitions, ports) | +1,200 |
| Sprint 2 Application | `97e48b1` | Application Core — Auto-Run Engine (8 use cases + barrel +19) | +900 |
| Sprint 3 Infrastructure | `232c1a6` | State + Telemetry adapters + Doc Scanner + Matrix Sync (sprint-state-store 181 / sprint-telemetry 200) | +1,100 |
| Sprint 4 Presentation | `d4484e1` | Skill (sprint/SKILL.md 327) + 4 Agents (sprint-master-planner / orchestrator / qa-flow / report-writer) + 7 Templates + Handler 660 + Control/Audit | +2,800 |
| Sprint 5 Quality + Docs | `1337e1f` | L3 Contract test tracked (8 SC-01~08) + 3 adapter scaffolds (createGapDetector / createAutoFixer / createDataFlowValidator) + Korean guides + 7-perspective QA | +1,400 |
| UX Improvement plan | `77603ee` | Sprint 5 verification 4건 + UX improvement master plan v1.0 | +400 |
| S1-UX Phase 1~7 | `9d7a38b` → `faf9eca` | sub-sprint 1/4 (PRD → Plan → Design → Do → Report) — P0 phase reset + P1 trust/CLI/skill args | +500 |
| S2-UX Phase 1~7 | `dd16abb` → `a25d176` | sub-sprint 2/4 — Master Plan Generator implementation | +600 |
| S3-UX Phase 1~7 | `cd3a47a` → `9a99948` | sub-sprint 3/4 — Context Sizer (Kahn topological sort + greedy bin-packing) | +700 |
| S4-UX Phase 1~7 | `614eaf5` → `b837891` | sub-sprint 4/4 — Integration + L3 10/10 PASS + 16-cycle | +800 |
| UX Final | `e431b3f` | sprint-ux-improvement deep-QA fixes + 462-line report | +500 |
| Resume Idempotent | `a33af52` | handleStart idempotent resume + E2E sprint/pdca/control verification | +200 |
| Deep-sweep cleanup | `967cd8f` | sprint integration gaps + dead code cleanup | **−2,333 net** |
| Deep-sweep v2 | `65cc0f3` | full-surface sprint integration + MCP/audit/config gaps | +1,500 / −500 |
| Final QA | `5edae8f` | 2 inline root-fixes (intent ordering + audit category migration) + final QA report | +462 |

**총 변경**: 약 177 파일, +38,655 / −2,963 (net +35,692 LOC)

### 2.2 신규 아키텍처 (Sprint 1~5)

#### Domain Layer (Sprint 1)
- `lib/application/sprint-lifecycle/phases.js` — Sprint 8-phase frozen enum (`SPRINT_PHASES` + `SPRINT_PHASE_ORDER` + `isValidSprintPhase` + `nextSprintPhase`)
- `lib/application/sprint-lifecycle/transitions.js` — legal phase transitions
- `lib/domain/sprint/` — sprint entity + ports (state-store port, telemetry port)
- 4 ADRs:
  - `docs/adr/0006-cc-upgrade-policy.md` (CC v2.1.34~v2.1.121 79 consecutive compatible 정책)
  - `docs/adr/0007-sprint-as-meta-container.md` (Sprint = PDCA 위 메타 컨테이너)
  - 기존 ADR 0004 (agent-hook multi-event deferral) — ENH-280 carry
  - 기존 ADR 0005 (Application Layer pilot) — ENH-278 carry

#### Application Layer (Sprint 2)
- `lib/application/sprint-lifecycle/` 8 use cases:
  - `init-sprint.js` (사용자 정의 sprint 생성)
  - `start-sprint.js` (auto-run Plan → Trust Level scope)
  - `transition-phase.js` (8-phase 진행)
  - `auto-pause-engine.js` (4 triggers: QUALITY_GATE_FAIL / ITERATION_EXHAUSTED / BUDGET_EXCEEDED / PHASE_TIMEOUT)
  - `iterate-sprint.js` (matchRate 100% loop, max 5)
  - `qa-sprint.js` (7-Layer S1 dataFlow integrity)
  - `report-sprint.js` (cumulative KPI + lessons learned)
  - `archive-sprint.js` (terminal state)
- Barrel `lib/application/sprint-lifecycle/index.js` — 19 exports

#### Infrastructure Layer (Sprint 3)
- `lib/infra/sprint/sprint-state-store.adapter.js` (181 LOC) — `.bkit/state/sprints/{id}.json` persistence
- `lib/infra/sprint/sprint-telemetry.adapter.js` (200 LOC) — OTEL emit + audit log
- `lib/cc-regression/doc-scanner.js` (확장) — sprint 문서 detection
- `lib/cc-regression/matrix-sync.js` (확장) — 3-matrix sync (dataFlow / cumulative / feature-phase)

#### Presentation Layer (Sprint 4)
- **Skill**: `skills/sprint/SKILL.md` (327 LOC) + `PHASES.md` (83 LOC) + 3 examples (`basic-sprint.md` + `multi-feature-sprint.md` + `archive-and-carry.md`)
- **4 Agents**:
  - `agents/sprint-master-planner.md` — Sprint Master Plan + PRD + Plan + Design 생성 전문가
  - `agents/sprint-orchestrator.md` — Sprint full-lifecycle orchestrator (Sequential dispatch ENH-292 강제)
  - `agents/sprint-qa-flow.md` — 7-Layer S1 dataFlowIntegrity 검증
  - `agents/sprint-report-writer.md` — phaseHistory/iterateHistory/featureMap/kpi 집계 → markdown report
- **7 Templates**: `templates/sprint/{master-plan,prd,plan,design,iterate,qa,report}.template.md`
- **Handler**: `scripts/sprint-handler.js` (660 LOC) + `scripts/sprint-memory-writer.js` (138 LOC)
- **MCP**: `servers/bkit-pdca-server/index.js` +170 LOC → 3 신규 도구 (`bkit_sprint_list`, `bkit_sprint_status`, `bkit_master_plan_read`)
- **Control/Audit**: ACTION_TYPES 18 → 19 (`sprint_paused` + `sprint_resumed` + `master_plan_created` 추가)

#### Quality + Documentation Layer (Sprint 5)
- `tests/contract/v2113-sprint-contracts.test.js` (366 LOC, 8 contracts SC-01~SC-08):
  - SC-01: entity shape invariant
  - SC-02: dependencies interface
  - SC-03: infrastructure adapter shape
  - SC-04: handler signature
  - SC-05: 4-layer chain (Domain ← Application ← Infrastructure ← Presentation)
  - SC-06: ACTION_TYPES 19 enumeration
  - SC-07: SPRINT_AUTORUN_SCOPE L0~L4 mirror
  - SC-08: hooks 21:24 invariant
- 3 production adapter scaffolds: `createGapDetector` / `createAutoFixer` / `createDataFlowValidator` (no-op baseline → agentTaskRunner-injected real impl path)
- `docs/06-guide/sprint-management.guide.md` (~330 lines, 8 sections, Korean deep-dive)
- `docs/06-guide/sprint-migration.guide.md` (~200 lines, PDCA↔Sprint orthogonal coexistence)

#### UX Improvement (S1-UX ~ S4-UX, 4 sub-sprints)
- S1-UX: P0 phase reset + P1 trust/CLI/skill args fixes
- S2-UX: Master Plan Generator implementation (sprint-master-planner agent)
- S3-UX: Context Sizer (Kahn topological sort + greedy bin-packing for sprint feature size estimation)
- S4-UX: Integration + L3 10/10 PASS + 16-cycle iteration

#### Deep-sweep cleanup (-2,333 net LOC)
- Removed `templates/infra/argocd/application.yaml.template` (-87)
- Removed `templates/infra/deploy-dynamic.yml` (-86) + `deploy-enterprise.yml` (-174) + `staging-eks-ondemand.yml` (-73)
- Removed `templates/infra/observability/{kube-prometheus-stack,loki-stack,otel-tempo}.values.yaml` (-229)
- Removed `templates/infra/security/security-layer.yaml.template` (-130)
- Removed `templates/infra/terraform/main.tf.template` (-83)
- Sprint integration gaps: 14 skills cross-reference 추가 (audit / bkit-rules / bkit-templates / bkit / control / deploy / development-pipeline / enterprise / pdca-batch / pdca / plan-plus / pm-discovery / qa-phase / rollback)
- Intent router ordering fix + audit category migration

### 2.3 Real Component Count (실측 2026-05-12 v2.1.13)

| 영역 | v2.1.12 (메모리) | v2.1.13 실측 | Diff | Source |
|---|---|---|---|---|
| Skills | 43 | **44** | +1 (sprint) | `ls skills/ \| wc -l` |
| Agents (.md files) | 36 (메모리 주장) | **34** | -2 또는 +4? | `find agents -name "*.md" -type f \| wc -l` — 메모리 정정 필요 |
| Hook events / blocks | 21 / 24 | **21 / 24** | 0 | invariant |
| MCP servers / tools | 2 / 16 | **2 / 19** | +3 (sprint tools) | `servers/bkit-pdca-server/index.js` |
| Lib modules / subdirs | 142 / 16 | **TBD** | +N (sprint adapters + lifecycle) | `find lib -name "*.js" \| wc -l` 필요 |
| Templates | 18 (메모리) | **39** (.md+.template.md) | +7 (sprint templates) | `find templates -name "*.md" \| wc -l` — 메모리 정정 필요 |
| Test files / cases | 117+ / 4,000+ | **118+ / 4,000+** | +1 contract test (8 TC SC-01~08) | `find tests -name "*.test.js" \| wc -l` |
| ACTION_TYPES | 18 | **19** (added master_plan_created) | +1 | `lib/audit/audit-logger.js` ACTION_TYPES |

> **메모리 vs 실측 충돌**: 메모리 (MEMORY.md)는 "36 Agents" 주장하나 실측 34. 4 sprint agents 추가 후에도 34 — 사전 cleanup 또는 메모리 오류. **F1 VERSION-BUMP 진행 전 정확한 baseline 측정 필수** (Task: `count-baseline-verify`).

### 2.4 BKIT_VERSION 5-loc invariant (v2.1.13 동기화 대상)

| Location | Current | Target | 파일 | 라인 |
|---|---|---|---|---|
| 1. config canonical | `"version": "2.1.12"` | `"version": "2.1.13"` | `bkit.config.json` | 2 |
| 2. plugin manifest | `"version": "2.1.12"` | `"version": "2.1.13"` | `.claude-plugin/plugin.json` | 3 |
| 3. marketplace (2 곳) | `"version": "2.1.12"` × 2 | `"version": "2.1.13"` × 2 | `.claude-plugin/marketplace.json` | 4, 37 |
| 4. hooks description | `bkit Vibecoding Kit v2.1.12 - Claude Code` | `bkit Vibecoding Kit v2.1.13 - Claude Code` | `hooks/hooks.json` | 3 |
| 5. session-start comment | `(v2.1.12, uses BKIT_VERSION from lib/core/version)` | `(v2.1.13, uses BKIT_VERSION from lib/core/version)` | `hooks/session-start.js` | 3 |
| 6. README badge | `Version-2.1.12-green.svg` | `Version-2.1.13-green.svg` | `README.md` | 7 |
| 7. README-FULL badge | `Version-2.1.12-green.svg` | `Version-2.1.13-green.svg` | `README-FULL.md` | 9 |
| 8. CHANGELOG section | `## [2.1.12] - 2026-04-28` | `## [2.1.13] - 2026-05-12` + 기존 2.1.12 보존 | `CHANGELOG.md` | 8 (new section) |

추가 invariant:
- `lib/core/version.js` `BKIT_VERSION` constant (이미 single source 추정 — 확인 필요)
- `scripts/docs-code-sync.js scanVersions()` 5-loc 검증 — Target version 2.1.13으로 갱신

---

## 3. Sprint Composition — 9 Features

본 sprint는 **9개 feature**로 구성된다. 각 feature는 독립적이지만 **Kahn topological order**로 dependency 정렬:

```
F0 baseline-verify
       │
       ▼
F1 version-bump ──┬──► F2 changelog-v2113 ──┐
                  │                           │
                  ├──► F7 hooks-commands     │
                  │                           │
                  └──► (모든 doc feature 활성화) ─┐
                                                  │
F3 readme-core ◄──────────────────────────────────┤
F4 readme-full ◄──────────────────────────────────┤
F5 customization-ainative ◄───────────────────────┤
F6 bkit-system-graph ◄────────────────────────────┤
                                                  │
F8 docs-archive ◄─────────────────────────────────┘
                  │
                  ▼
F9 real-use-validation (전체 산출물 후 자가 검증 + report)
```

### Feature F0 — Baseline Component Count Verification

- **Scope**: 실측 component count + 메모리 정합성 확인
- **Tasks**:
  - T0.1: `ls skills/ | wc -l` → 44 확인
  - T0.2: `find agents -name "*.md" -type f | wc -l` → 메모리 36 vs 실측 정합 확인
  - T0.3: `find templates -name "*.md" -o -name "*.template.md" | wc -l` → 39 확인
  - T0.4: `find lib -name "*.js" -type f | wc -l` → 모듈 수 측정
  - T0.5: `find lib -type d -mindepth 1 -maxdepth 1 | wc -l` → subdirectory 수 측정
  - T0.6: `node scripts/docs-code-sync.js --dry-run` → 8-count baseline 캡쳐
- **Output**: `docs/03-analysis/v2113-baseline-count.analysis.md` (1 page)
- **Success**: 실측 모두 캡쳐 + 메모리 차이 정정 list 작성
- **Risk**: low — read-only

### Feature F1 — BKIT_VERSION 5-loc Invariant Bump

- **Scope**: §2.4 표의 8 location 모두 `2.1.12 → 2.1.13` 일관 갱신
- **Tasks**:
  - T1.1: `bkit.config.json:2` Edit
  - T1.2: `.claude-plugin/plugin.json:3` Edit
  - T1.3: `.claude-plugin/marketplace.json:4` + `:37` Edit (2 곳)
  - T1.4: `hooks/hooks.json:3` Edit
  - T1.5: `hooks/session-start.js:3` comment Edit
  - T1.6: `README.md:7` badge Edit
  - T1.7: `README-FULL.md:9` badge Edit
  - T1.8: Verification — `node scripts/docs-code-sync.js`
  - T1.9: `claude plugin validate .` Exit 0 확인 (F9-120 closure 9-streak 유지)
- **Output**: 8 file edits
- **Success**: docs-code-sync 0 drift PASS + plugin validate Exit 0
- **Risk**: medium — marketplace.json 2 위치 누락 시 mismatch

### Feature F2 — CHANGELOG v2.1.13 Section

- **Scope**: `CHANGELOG.md` top에 `## [2.1.13] - 2026-05-12` 신규 섹션 추가 (기존 2.1.12 섹션 위에 prepend, 보존)
- **Section 구조** (Keep a Changelog 포맷):
  ```markdown
  ## [2.1.13] - 2026-05-12 (branch: feature/v2113-sprint-management)

  > **Status**: GA — Sprint Management feature release + tech debt cleanup
  > **One-Liner (EN/KO)**: 보존

  ### Added — Sprint Management (Major Feature)
  - **Sprint 8-phase lifecycle**: prd → plan → design → do → iterate → qa → report → archived
  - **16 sub-actions** (init/start/status/list/watch/phase/iterate/qa/report/archive/pause/resume/fork/feature/help/master-plan)
  - **4 Auto-Pause Triggers** (QUALITY_GATE_FAIL / ITERATION_EXHAUSTED / BUDGET_EXCEEDED / PHASE_TIMEOUT)
  - **Trust Level scope L0-L4** (SPRINT_AUTORUN_SCOPE)
  - **7-Layer S1 dataFlowIntegrity QA** (UI→Client→API→Validation→DB→Response→Client→UI hop)
  - **3 신규 MCP Tools** (bkit_sprint_list / bkit_sprint_status / bkit_master_plan_read)
  - **4 신규 Agents** (sprint-master-planner / sprint-orchestrator / sprint-qa-flow / sprint-report-writer)
  - **1 신규 Skill** (skills/sprint/SKILL.md 327 LOC + PHASES.md + 3 examples)
  - **7 신규 Templates** (master-plan / prd / plan / design / iterate / qa / report)
  - **2 신규 Infrastructure Adapters** (sprint-state-store 181 LOC + sprint-telemetry 200 LOC)
  - **1 신규 L3 Contract Test** (v2113-sprint-contracts.test.js 366 LOC, 8 SC-01~08)
  - **2 Korean User Guides** (sprint-management.guide.md ~330 + sprint-migration.guide.md ~200)
  - **2 신규 ADRs** (0006 CC Upgrade Policy + 0007 Sprint as Meta-Container)
  - **3 Production Adapter Scaffolds** (createGapDetector / createAutoFixer / createDataFlowValidator)
  - **Context Sizer** (Kahn topological sort + greedy bin-packing, S3-UX)

  ### Added — Sprint UX Improvement (4 sub-sprints)
  - S1-UX: P0 phase reset + P1 trust/CLI/skill args fixes
  - S2-UX: Master Plan Generator implementation
  - S3-UX: Context Sizer (Kahn + greedy bin-packing)
  - S4-UX: Integration + L3 10/10 PASS + 16-cycle iteration

  ### Changed — Skill Cross-References (14 skills)
  - audit / bkit-rules / bkit-templates / bkit / control / deploy / development-pipeline / enterprise / pdca-batch / pdca / plan-plus / pm-discovery / qa-phase / rollback — 모두 Sprint 공존 노트 추가

  ### Changed — Architecture
  - ACTION_TYPES 18 → 19 (added master_plan_created)
  - lib/orchestrator/next-action-engine.js +48 lines (sprint integration)
  - lib/orchestrator/team-protocol.js +36 lines (sprint Task spawn)
  - lib/intent/language.js +58 lines (sprint trigger patterns)

  ### Removed — Tech Debt Cleanup (-2,333 net LOC)
  - templates/infra/argocd/application.yaml.template
  - templates/infra/deploy-{dynamic,enterprise,staging-eks-ondemand}.yml
  - templates/infra/observability/{kube-prometheus-stack,loki-stack,otel-tempo}.values.yaml
  - templates/infra/security/security-layer.yaml.template
  - templates/infra/terraform/main.tf.template

  ### Fixed — Inline Root Fixes (Final QA)
  - intent ordering — language.js trigger pattern conflict resolved
  - audit category migration — ACTION_TYPES.master_plan_created routing

  ### Fixed — v2.1.12 Carryovers Closed
  - CARRY-7: handleStart idempotent resume
  - CARRY-8~12: sprint integration gaps (MCP/audit/config)
  - 38 scripts bare-require guard (v2.1.12 deferred — 본 sprint에서 closure 시 명시)

  ### Verified — CC v2.1.139 Compatibility
  - 94 consecutive compatible releases (v2.1.34~v2.1.139, R-2 v2.1.134/135 skip 미포함)
  - ADR 0003 8th application (single-pair small-batch scenario 두 번째)
  ```
- **Output**: CHANGELOG.md +250 LOC
- **Success**: 모든 Sprint 1~5 deliverable + UX 4 sub-sprints + deep-sweep + inline fixes 포함
- **Risk**: medium — 누락 항목 검증 위해 §2.1 commit 흐름 표 cross-reference 필수

### Feature F3 — README.md Core Sync

- **Scope**: README.md 95줄
- **Tasks**:
  - T3.1: Line 7 badge 2.1.12 → 2.1.13 (F1과 중복 — F1에서 수행)
  - T3.2: Line 43 "Recommended runtime: Claude Code v2.1.118+" → v2.1.123+ 또는 v2.1.139+ (사용자 결정 필요 — 보수적 v2.1.123 유지 권장)
  - T3.3: Line 45 "Architecture (v2.1.12)" → "Architecture (v2.1.13)"
  - T3.4: Line 48-54 architecture table 실측 갱신:
    - Skills: 43 → 44
    - Agents: 36 → 실측 (F0 결과 반영)
    - MCP tools: 16 → 19
    - Templates: 18 → 39 (실측)
    - Lib modules: 142 → 실측 (F0 결과)
  - T3.5: Line 56 architecture overview text — Sprint Management 한 줄 추가
  - T3.6: Line 58-79 Sprint Management 섹션 — 이미 존재, content 검증 + 최신화
  - T3.7: First-time tutorial 줄 — runtime version 정합성
- **Output**: README.md ~10 LOC 수정
- **Success**: badge + architecture table + Sprint section 모두 v2.1.13 정확 반영
- **Risk**: low

### Feature F4 — README-FULL.md Deep Sync

- **Scope**: README-FULL.md (포괄적 feature inventory + version history + deep architecture)
- **Tasks**:
  - T4.1: Line 9 badge (F1 중복)
  - T4.2: Line 5 intro "complete v2.1.12 feature inventory" → "v2.1.13"
  - T4.3: Line 68 v2.1.11 section ↑ v2.1.12 section ↑ v2.1.13 신규 섹션 prepend
  - T4.4: v2.1.13 신규 섹션 — Sprint Management 전체 deliverable 상세 (§2.2 기반)
  - T4.5: Architecture 표 전체 실측 갱신 (F0 baseline 반영)
  - T4.6: Lib subdirectories list 갱신 (lib/application/sprint-lifecycle/ + lib/infra/sprint/ 추가)
  - T4.7: ENH closures list 갱신 (CARRY-7~12 closed)
- **Output**: README-FULL.md ~150 LOC 추가
- **Success**: v2.1.13 GA inventory가 완결
- **Risk**: medium — version history 누락 위험

### Feature F5 — CUSTOMIZATION-GUIDE + AI-NATIVE-DEVELOPMENT Sync

- **Scope**: CUSTOMIZATION-GUIDE.md + AI-NATIVE-DEVELOPMENT.md
- **Tasks**:
  - T5.1: CUSTOMIZATION-GUIDE.md:180 "Component Inventory (v2.1.12)" → "(v2.1.13)"
  - T5.2: CUSTOMIZATION-GUIDE.md:194 BKIT_VERSION 2.1.12 → 2.1.13
  - T5.3: CUSTOMIZATION-GUIDE.md:196 "Total: 700+ components" 검증 + Sprint deliverable 추가 (4 agents + 7 templates + 1 skill + ~12 lib modules + 3 MCP tools)
  - T5.4: AI-NATIVE-DEVELOPMENT.md:143 "bkit v2.1.12 Implementation" → "v2.1.13"
  - T5.5: AI-NATIVE-DEVELOPMENT.md:200 "Context Engineering Architecture (v2.1.12)" → "(v2.1.13)"
  - T5.6: AI-NATIVE-DEVELOPMENT.md:203 ASCII 박스 헤더 갱신
  - T5.7: AI-NATIVE-DEVELOPMENT.md Sprint Management → AI-Native Principle 4 (Human Oversight by Design) 또는 신규 Principle 6 도입 (검토 필요)
- **Output**: 2 file edits, ~30 LOC
- **Success**: v2.1.13 정확 + Sprint = AI-Native primitive 명시
- **Risk**: low

### Feature F6 — bkit-system/ Obsidian Graph Sync

- **Scope**: `bkit-system/_GRAPH-INDEX.md` + components/* overviews
- **Tasks**:
  - T6.1: `_GRAPH-INDEX.md` Line 3 "Current release: v2.1.12" → "v2.1.13"
  - T6.2: Line 7-16 highlights — Sprint Management 추가
  - T6.3: Line 45 "Skills (39)" → "Skills (44)" + 신규 카테고리 "Sprint Skill (1)" + sprint 추가
  - T6.4: Line 91 "Agents (36)" → 실측 + 신규 카테고리 "Sprint Agents (4)"
  - T6.5: Line 163 "Hooks (21 events)" 유지 (invariant)
  - T6.6: Line 172 "Scripts (49)" → 실측 + sprint-handler.js + sprint-memory-writer.js 추가
  - T6.7: Line 350 "Templates (18)" → 실측 + Sprint Templates (7) 카테고리 신설
  - T6.8: Line 338 "Components (v2.1.12 Final, 2026-04-28)" → "(v2.1.13 GA, 2026-05-12)" + 실측 반영
  - T6.9: `components/skills/_skills-overview.md` — sprint 항목 추가
  - T6.10: `components/agents/_agents-overview.md` — 4 sprint agents 추가
  - T6.11: `components/scripts/_scripts-overview.md` — sprint-handler/memory-writer 추가
  - T6.12: `components/hooks/_hooks-overview.md` — sprint 통합 점 (next-action-engine + team-protocol 변경) 노트
  - T6.13: `philosophy/pdca-methodology.md` — Sprint coexistence 한 줄 추가 (orthogonal coexistence with PDCA)
  - T6.14: `scenarios/` — `scenario-sprint.md` 신규 추가 (사용자 sprint 운영 시나리오)
  - T6.15: `triggers/trigger-matrix.md` — sprint trigger pattern 추가
- **Output**: ~7 file edits + 1 신규 scenario, ~250 LOC
- **Success**: Obsidian graph가 v2.1.13 정확 반영
- **Risk**: medium — Obsidian graph는 [[wiki-link]] integrity 필요

### Feature F7 — hooks/ + commands/ Final Sync

- **Scope**: `hooks/hooks.json` description + `commands/bkit.md` (이미 일부 v2.1.13 반영)
- **Tasks**:
  - T7.1: `hooks/hooks.json:3` description (F1 중복)
  - T7.2: `hooks/session-start.js:3` comment (F1 중복)
  - T7.3: `hooks/session-start.js:125` comment "v2.1.12 Sprint C-1" → 보존 (역사 기록)
  - T7.4: `commands/bkit.md` — v2.1.13 Sprint Management 섹션 이미 존재, content 검증 + 실측 number 정합성
  - T7.5: commands/bkit.md help message ASCII 표 — Sprint Management 16 sub-actions list 확정
- **Output**: 1-2 file edits
- **Success**: hooks 시작 메시지 + bkit help가 v2.1.13 정확
- **Risk**: low

### Feature F8 — docs/ Legacy Archive + /pdca cleanup

- **Scope**: `docs/01-plan/` + `docs/02-design/` + `docs/03-analysis/` + `docs/04-report/` + `docs/05-qa/` + `docs/00-pm/`의 89+ 보관 후보 파일
- **Whitelist (보관하지 않음)**:
  - 현재 sprint `v2113-docs-sync.*` 본 sprint 산출물
  - 본 sprint 자체에서 사용/참조하는 ADR 0006 + 0007
  - 살아있는 carryover ADR 0004 + 0005 (v2.1.13에서 deferred 유지)
  - `cc-v2138-v2139-impact-analysis.report.md` (가장 최근 CC version research)
  - `sprint-management.master-plan.md` (v2.1.13 GA, 사용자 참조용 working example)
  - `sprint-ux-improvement.master-plan.md` (v2.1.13 GA history)
  - 5 v2113-sprint-N-* PRD/Plan/Design/QA/Report (v2.1.13 GA 산출물)
- **Archive 대상 (whitelist 통과 후 추정 ~80 파일)**:
  - bkit-v2110-* (v2.1.10 사이클 closed)
  - bkit-v2111-* (v2.1.11 사이클 closed)
  - bkit-v2112-* (v2.1.12 hotfix closed, 단 deep-functional-qa-issues 보존 — CARRY 식별 출처)
  - bkit-v216-* / bkit-v217-* / bkit-v219-* (legacy 사이클)
  - cc-v2110~v2137 impact analyses (제외: v2138-v2139)
  - test-* / feat-persist-* / test-feature-lc* / test-iter-* / test-flow-* / test-complete-* / test-abandon-* (stale 14+ days)
  - v2110-docs-sync (idle 20 days)
- **Archive 위치**: `docs/archive/2026-05/{category}/{file}` 패턴 (월별 디렉토리 + 카테고리 보존)
- **Tasks**:
  - T8.1: `mkdir -p docs/archive/2026-05/{01-plan,02-design,03-analysis,04-report,05-qa,00-pm}/features`
  - T8.2: Archive whitelist 통과 한 파일을 `git mv`로 이동 (history 보존)
  - T8.3: `/pdca cleanup` 실행 — `.pdca-status.json`에서 archived/stale 항목 제거
  - T8.4: `git status` 확인 — archive 결과 검증
- **Output**: ~80 파일 이동 + `.pdca-status.json` cleanup
- **Success**: 활성 docs/ 디렉토리에 v2.1.10/v2.1.11/v2.1.12 cycle docs 0건 (whitelist 제외) + `/pdca status`에 stale feature 0건
- **Risk**: high — whitelist 확정 전 절대 실행 X. 모든 archive 대상은 사용자 검토 필수.

### Feature F9 — Real-Use Self-Validation

- **Scope**: 본 sprint를 bkit `/sprint` 기능 자체 검증 수단으로 활용
- **Tasks**:
  - T9.1: `/sprint init v2113-docs-sync --name "v2.1.13 Documentation Sync" --features f0-baseline,f1-version-bump,f2-changelog,f3-readme,f4-readme-full,f5-customization,f6-bkit-system,f7-hooks-commands,f8-archive-cleanup --trust L2` 실행
  - T9.2: `.bkit/state/sprints/v2113-docs-sync.json` 생성 확인
  - T9.3: `/sprint start v2113-docs-sync` 실행 — Plan → Design phase auto-run
  - T9.4: 각 feature phase 진행 시 `/sprint status v2113-docs-sync` 모니터링
  - T9.5: `gap-detector` 실행 — 본 master plan ↔ 실제 산출물 매치율 측정
  - T9.6: `/sprint qa v2113-docs-sync` — 7-Layer S1 dataFlow integrity 적용 (재해석: 문서 → 코드 cross-reference integrity)
  - T9.7: `pdca-iterator` 실행 (matchRate < 90% 시 max 5회)
  - T9.8: `/sprint report v2113-docs-sync` — phaseHistory + iterateHistory + featureMap + kpi + lessons learned 집계
  - T9.9: 4 auto-pause triggers 발화 시 audit log 검증 (BUDGET_EXCEEDED는 본 sprint에서 미적용 — 500 LOC docs, budget 1M 한도 내)
  - T9.10: `/sprint archive v2113-docs-sync` — 최종 terminal state 진입
- **Output**: `docs/04-report/features/v2113-docs-sync.report.md` (sprint-report-writer 생성)
- **Success**: Sprint 8-phase 완주 + 4 auto-pause triggers 각 발화 사례 또는 미발화 확인 + gap-detector ≥ 90% + report에 lessons learned ≥ 5건
- **Risk**: high — `/sprint` 기능 자체 버그 노출 시 본 sprint 진행 중단 위험 (mitigation: Trust L2 manual checkpoint + 별도 hotfix track)

---

## 4. Phase Lifecycle Map (Sprint 8-phase)

| Phase | 본 sprint 활동 | 산출물 | Quality Gate |
|---|---|---|---|
| **prd** | 본 문서 작성 (master plan) + v2113-docs-sync PRD 작성 (`docs/00-pm/v2113-docs-sync.prd.md`) | master plan + PRD | M0 PRD 완전성 |
| **plan** | F0~F9 feature plan 작성 (`docs/01-plan/features/v2113-docs-sync.plan.md`) | Plan with Context Anchor | M1 Plan 검증 |
| **design** | 9 feature 각각의 design 작성 (`docs/02-design/features/v2113-docs-sync.design.md`) — F0/F1 baseline 측정 결과 반영 | Design with edit hunks | M2 Design 검증 |
| **do** | F0~F8 8 feature 순차 실행 (F0 → F1 → F2 → 병렬 F3-F7 → F8) | 11 doc edits + 89 archives | M3 Code Quality |
| **iterate** | gap-detector 결과 matchRate < 90% 시 max 5회 자동 반복 | iteration reports | M1 matchRate ≥ 90% |
| **qa** | `/sprint qa` 실행 — 7-Layer S1 (문서 cross-ref integrity로 재해석) | QA report | M8 sprint matchRate ≥ 85% |
| **report** | `/sprint report` 생성 — KPI + lessons learned | `docs/04-report/features/v2113-docs-sync.report.md` | M10 Report 검증 |
| **archived** | `/sprint archive` — terminal state, .bkit state 보존 + memory MEMORY.md 갱신 | archived state | terminal |

---

## 5. Auto-Pause Triggers (4건)

| Trigger | 발화 조건 (본 sprint context) | Mitigation |
|---|---|---|
| **QUALITY_GATE_FAIL** | docs-code-sync.js 8-count drift > 0 OR `claude plugin validate .` Exit ≠ 0 | F1 version bump 후 즉시 검증 — fail 시 즉시 pause + 사용자 알림 |
| **ITERATION_EXHAUSTED** | gap-detector matchRate < 90% 5회 반복 후에도 미달 | pdca-iterator max 5 enforce, exhaust 시 사용자 escalation |
| **BUDGET_EXCEEDED** | 1M token 초과 (본 sprint config default) | 본 sprint 예상 ~500K — 여유 100%. 발화 가능성 low |
| **PHASE_TIMEOUT** | 4 hour per phase (config default) | 본 sprint는 do phase가 가장 길 것 (8 feature). 필요 시 phase 분할 |

---

## 6. Trust Level Scope (L4 Full-Auto + 꼼꼼함 보강)

- `SPRINT_AUTORUN_SCOPE=L4` (사용자 명시 승인)
- **L4 = stopAfter=archived** — prd → plan → design → do → iterate → qa → report → archived 전부 auto-run
- 각 phase 종료 시 **자체 QA 게이트 강화** (사용자 "꼼꼼하고 완벽하게" 요구 반영):
  - Phase 후 즉시 산출물 self-review (gap-detector 적용)
  - 각 feature F0~F9 종료 시 verification 단계 자동 삽입
  - F8 archive는 자동 실행하되 git mv (history 보존) + dry-run preview 우선
- 4 auto-pause triggers는 그대로 armed — QUALITY_GATE_FAIL/ITERATION_EXHAUSTED/BUDGET_EXCEEDED/PHASE_TIMEOUT 중 하나라도 발화하면 pause
- 최종 검토 시점: 모든 phase 완료 후 `git diff` + `git status`를 사용자에게 제시 → 사용자 검토 후 commit/push 별도 지시

> **L4 채택 근거 (사용자 명시)**: "꼼꼼하고 완벽하게 완전 자동 모드로 작업 진행해줘. 최종적으로 내가 변경 사항 검토한 후 커밋 푸시 요청 할거야." → 자동 실행 + 최종 일괄 검토 모델.

---

## 7. Quality Gates (M-series + S-series)

| Gate | Threshold | 본 sprint 적용 | 측정 도구 |
|---|---|---|---|
| **M1 matchRate** | ≥ 90% | gap-detector master plan ↔ 산출물 | `agents/gap-detector.md` |
| **M2 codeQualityScore** | ≥ 80 | docs lint (markdown linter) | `scripts/check-docs-lint.js` (별도 도입 시) |
| **M3 criticalIssueCount** | 0 | docs-code-sync drift + plugin validate | `scripts/docs-code-sync.js` |
| **M8 sprint matchRate** | ≥ 85% | sprint-qa-flow 7-Layer S1 | `agents/sprint-qa-flow.md` |
| **S1 dataFlow** | ≥ 85% | 문서 cross-reference integrity (재해석) | 본 sprint custom adapter |

---

## 8. Dependencies (Kahn Topological Order)

```
F0 baseline-verify
   │
   ├──► F1 version-bump
   │       │
   │       ├──► F2 changelog-v2113
   │       │
   │       ├──► F7 hooks-commands (F1과 partial overlap, T1.4/T1.5)
   │       │
   │       └──► (F3~F6 활성화)
   │               │
   │               ├──► F3 readme-core
   │               ├──► F4 readme-full
   │               ├──► F5 customization-ainative
   │               └──► F6 bkit-system-graph
   │
   └──► (F0 → F1 직진은 sequential 필수, F1 → F2~F7은 sequential 필수, F3~F6은 parallel 가능)

(F2 + F3 + F4 + F5 + F6 + F7 완료 후)
   │
   ▼
F8 docs-archive (whitelist 사용자 승인 필수)
   │
   ▼
F9 real-use-validation (final aggregation + sprint report)
```

**Sequential dispatch 강제** (ENH-292 회피):
- F3~F6 parallel 가능하지만 Sub-agent caching 10x 회귀 (#56293 v2.1.128~v2.1.139 9-streak 미해소) 우려
- 본 sprint에서는 **Sequential dispatch** (sprint-orchestrator.md ENH-292 패턴) 강제 — cache cost ≤ baseline +10%

---

## 9. Risk Matrix

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Component count drift (메모리 vs 실측 불일치) | HIGH | MEDIUM | F0 baseline-verify 우선 실행 + 모든 count 실측 source 명시 |
| R2 | F8 docs archive 과잉 (살아있는 carryover 오삭제) | MEDIUM | HIGH | Whitelist 사전 확정 + 사용자 명시 승인 + `git mv` (history 보존) |
| R3 | `/sprint` 자체 버그 노출 → 본 sprint 진행 중단 | MEDIUM | HIGH | Trust L2 manual checkpoint + 별도 hotfix track (본 sprint 외) |
| R4 | CHANGELOG v2.1.13 누락 항목 | MEDIUM | MEDIUM | §2.1 commit 흐름 표 cross-reference + F2 task별 verification |
| R5 | ENH-292 caching 10x 회귀 (multi-agent spawn) | MEDIUM | MEDIUM | Sequential dispatch 강제 (sprint-orchestrator ENH-292 패턴) |
| R6 | docs/06-guide 한국어 가이드와 README 영문 cross-language 충돌 | LOW | MEDIUM | CLAUDE.md 원칙 준수 — docs/ Korean + README/CHANGELOG English |
| R7 | `claude plugin validate .` regression (F9-120 closure 8-streak 깨짐) | LOW | HIGH | F1 직후 즉시 검증 + F9-120 closure 9-streak 유지 |
| R8 | `lib/` 142 모듈 `@version 2.1.12` bulk update 누락 | KNOWN | LOW | 본 sprint OUT-OF-SCOPE 명시 — v2.1.14 별도 hotfix track으로 carry |
| R9 | Sprint Management 자체 self-check 실패 (sprint-qa-flow S1 < 85%) | LOW | MEDIUM | F9 iterate phase 최대 5회 + 미달 시 lessons learned 기록 + carry |

---

## 10. Success Criteria (8건, Executive Summary 재인용 + 검증 방법)

| # | Criterion | 검증 방법 | Owner |
|---|---|---|---|
| 1 | docs-code-sync.js 0 drift PASS | `node scripts/docs-code-sync.js` Exit 0 + 8-count match | F1 + F6 |
| 2 | `claude plugin validate .` Exit 0 | CLI 직접 실행 + F9-120 closure 9-streak | F1 |
| 3 | BKIT_VERSION 5-loc 모두 2.1.13 | §2.4 표 8 location grep -n "2\\.1\\.13" 모두 hit + "2\\.1\\.12" 활성 영역 0 hit | F1 |
| 4 | 활성 문서 영역 grep "2\\.1\\.12" 0건 | `grep -rn "2\\.1\\.12" --include="*.md" --include="*.json" \| grep -v "memory/\|docs/03-analysis\|docs/04-report\|docs/05-qa\|docs/00-pm\|CHANGELOG.md\|docs/adr"` 0 결과 | F1 + F2~F7 |
| 5 | /sprint qa S1 ≥ 85% | sprint-qa-flow 실행 결과 | F9 |
| 6 | /pdca cleanup stale 0건 | `cat .bkit/state/pdca-status.json \| jq '[.features[] \| select(.daysSinceLastActivity > 7)] \| length' == 0` | F8 |
| 7 | gap-detector ≥ 90% | sprint-qa-flow 또는 gap-detector 단독 실행 | F9 |
| 8 | Final report lessons learned ≥ 5건 | sprint-report-writer 생성 결과 markdown 검토 | F9 |

---

## 11. Task Management System Mapping

본 sprint는 **Task Management System**과 통합되어 다음 3-tier로 추적:

```
Sprint (v2113-docs-sync)
  ├── Phase: prd
  │   └── Task T-prd-1: Write master plan (본 문서)
  │   └── Task T-prd-2: Write PRD
  ├── Phase: plan
  │   └── Task T-plan-1: Write feature plan
  ├── Phase: design
  │   └── Task T-design-1: Write feature design with edit hunks
  ├── Phase: do
  │   ├── Feature F0: baseline-verify
  │   │   ├── Task T0.1 ~ T0.6
  │   ├── Feature F1: version-bump
  │   │   ├── Task T1.1 ~ T1.9
  │   ├── Feature F2: changelog-v2113
  │   ├── Feature F3: readme-core
  │   ├── Feature F4: readme-full
  │   ├── Feature F5: customization-ainative
  │   ├── Feature F6: bkit-system-graph
  │   ├── Feature F7: hooks-commands
  │   └── Feature F8: docs-archive-cleanup
  ├── Phase: iterate (조건부)
  ├── Phase: qa
  │   └── Feature F9: real-use-validation
  ├── Phase: report
  │   └── Task T-report-1: sprint-report-writer 실행
  └── Phase: archived
```

**Task ID 규칙**: `T-{phase}-{n}` (phase 외 task) + `T{feature}.{n}` (feature sub-task)

**Dependency**: TaskUpdate `addBlockedBy` 활용:
- T1.1~T1.9 (F1) BLOCKEDBY T0.6 (F0 baseline 측정 완료)
- T2.* (F2) BLOCKEDBY T1.9 (F1 verification 완료)
- T3.* ~ T7.* (F3~F7) BLOCKEDBY T1.9 (병렬 가능)
- T8.* (F8) BLOCKEDBY T2.* + T3.* + ... + T7.* (모든 doc 갱신 완료)
- T9.* (F9) BLOCKEDBY T8.* (archive 완료 후 최종 검증)

---

## 12. Implementation Roadmap (Sprint Phase × Feature × Task)

### Phase 1: prd (1 turn)
- [x] **이 master plan** (본 문서) — 완료 시점
- [ ] PRD 작성 (`docs/00-pm/v2113-docs-sync.prd.md`)

### Phase 2: plan (1 turn)
- [ ] Feature Plan (`docs/01-plan/features/v2113-docs-sync.plan.md`) — Context Anchor 보존

### Phase 3: design (1-2 turns)
- [ ] Feature Design (`docs/02-design/features/v2113-docs-sync.design.md`) — 각 F0~F9 exact edit hunk 명시

### Phase 4: do (8-12 turns)
- [ ] F0: baseline-verify (1 turn)
- [ ] F1: version-bump (1 turn, 8 edits)
- [ ] F2: changelog-v2113 (1 turn)
- [ ] F3~F7: 순차 또는 일부 병렬 (3-5 turn)
- [ ] F8: docs-archive (2 turn — whitelist 확정 + 실행)

### Phase 5: iterate (0-5 turns, 조건부)
- [ ] gap-detector 결과 따라 자동 반복

### Phase 6: qa (1-2 turns)
- [ ] F9: real-use-validation — `/sprint qa` 실행

### Phase 7: report (1 turn)
- [ ] sprint-report-writer 실행 → `docs/04-report/features/v2113-docs-sync.report.md`

### Phase 8: archived (1 turn)
- [ ] `/sprint archive` + memory MEMORY.md 갱신

**예상 총 turn**: 18-25

---

## 13. Real-Use Validation Protocol (자가 검증 상세)

본 sprint는 단순 documentation 작업이 아니라 **bkit /sprint 기능의 실 사용 검증** 목적도 가진다.

### 13.1 검증 대상 bkit 기능

| 기능 | 검증 방법 | 기대 결과 |
|---|---|---|
| `/sprint init` | F9 T9.1 실행 | `.bkit/state/sprints/v2113-docs-sync.json` 생성 + master plan 등록 |
| `/sprint start` | F9 T9.3 실행 + L2 trust scope | Plan → Design auto-run, Do부터 manual checkpoint |
| `/sprint status` | F9 T9.4 모니터링 | 현재 phase + 4 trigger 상태 + 3 matrix 출력 |
| `/sprint qa` | F9 T9.6 실행 | 7-Layer S1 score 산출 + matchRate 측정 |
| `/sprint iterate` | F9 T9.7 (조건부) | matchRate < 90% 시 자동 5회 반복 |
| `/sprint report` | F9 T9.8 실행 | KPI + lessons learned 생성 |
| `/sprint archive` | F9 T9.10 실행 | terminal state 진입 + state 보존 |
| `/pdca cleanup` | F8 T8.3 실행 | stale features 제거 |
| `gap-detector` | F9 T9.5 실행 | 매치율 측정 + 결과 NDJSON 기록 |
| `pdca-iterator` | F9 T9.7 (조건부) | Evaluator-Optimizer 패턴 검증 |
| `docs-code-sync.js` | F1 T1.8 실행 | 8-count + BKIT_VERSION invariant 0 drift |
| MCP `bkit_sprint_list` | F9 검증 시 호출 | 본 sprint 등록 확인 |
| MCP `bkit_sprint_status` | F9 검증 시 호출 | 현재 phase 정확 반영 |
| MCP `bkit_master_plan_read` | F9 검증 시 호출 | 본 문서 정확 반환 |

### 13.2 Defect 발견 시 처리

본 sprint 진행 중 `/sprint` 기능 결함 발견 시:

1. **Trivial bug** (UX 메시지, typo): F9 lessons learned 기록 → 별도 hotfix track (v2.1.13.1)
2. **Phase blocker** (sprint 진행 불가): 본 sprint pause → 사용자 escalation → hotfix → resume
3. **Data corruption**: 즉시 rollback (rollback skill) → checkpoint 복원 → 사용자 escalation

### 13.3 Lessons Learned 항목 (최소 5건)

본 sprint 완료 시 다음 항목을 final report에 기록:

1. `/sprint` 기능 UX 개선 제안 (`/btw` 활용)
2. Sprint Management 사용자 경험 (init → archive 8-phase 흐름의 자연스러움)
3. Trust Level L2의 manual checkpoint UX
4. ENH-292 caching 회귀 mitigation (Sequential dispatch 효과)
5. Sprint vs PDCA orthogonal coexistence (docs/06-guide/sprint-migration 정합성)
6. (추가 발견 시 항목 +)

---

## 14. Out-of-Scope Carry Items

본 sprint에서 **명시적으로 처리하지 않음** (v2.1.14+ track):

| Carry ID | 항목 | Rationale |
|---|---|---|
| CARRY-13 | `lib/` 142 모듈 `@version 2.1.12 → 2.1.13` bulk update | 본 sprint는 doc sync, code constant bump는 별도 hotfix 트랙. `scripts/docs-code-sync.js`는 `@version` 검증 X (BKIT_VERSION 5-loc만). |
| CARRY-14 | 121/142 lib modules in `legacy` layer Clean Architecture 완전 이전 | v2.1.13 carry — v2.1.14 Sprint F-1으로 이전 |
| CARRY-15 | CC v2.1.140+ 신규 사이클 cc-version-analysis | cc-version-analysis pdca feature 활성화 시점 별도 사이클 |
| CARRY-16 | Sprint Management 자체 enhancement (`/sprint export`, `/sprint diff` 등) | 사용자 피드백 누적 후 v2.1.14+ 검토 |
| CARRY-17 | bkit-evals 28 eval set v2.1.13 신규 추가 (sprint eval) | 별도 사이클 — `/bkit-evals run` 검증 시 sprint eval 추가 검토 |

---

## 15. Sprint Lifecycle State Persistence Schema

`.bkit/state/sprints/v2113-docs-sync.json` 예상 schema (sprint-state-store.adapter.js 기반):

```json
{
  "id": "v2113-docs-sync",
  "name": "v2.1.13 Documentation Synchronization & Self-Validation Sprint",
  "createdAt": "2026-05-12T15:00:00Z",
  "trustLevel": "L2",
  "autorunScope": "stopAfter=do",
  "currentPhase": "prd",
  "features": [
    "f0-baseline-verify",
    "f1-version-bump",
    "f2-changelog-v2113",
    "f3-readme-core",
    "f4-readme-full",
    "f5-customization-ainative",
    "f6-bkit-system-graph",
    "f7-hooks-commands",
    "f8-docs-archive-cleanup",
    "f9-real-use-validation"
  ],
  "phaseHistory": [],
  "iterateHistory": [],
  "qualityGates": {
    "M1_matchRate": { "threshold": 90 },
    "M2_codeQualityScore": { "threshold": 80 },
    "M3_criticalIssueCount": { "threshold": 0 },
    "M8_matchRate": { "threshold": 85 }
  },
  "autoPause": {
    "armedTriggers": ["QUALITY_GATE_FAIL", "ITERATION_EXHAUSTED", "BUDGET_EXCEEDED", "PHASE_TIMEOUT"],
    "pauseHistory": []
  },
  "kpi": {
    "estimatedLOC": 800,
    "estimatedArchiveFiles": 89,
    "estimatedTurns": 22,
    "budgetTokens": 1000000
  },
  "ccVersion": "2.1.139",
  "bkitVersion": "2.1.13",
  "schemaVersion": "1.0"
}
```

---

## 16. Approval Checklist (사용자 승인 필수)

본 master plan 실행 전 다음 항목 사용자 확인:

- [ ] **Sprint ID**: `v2113-docs-sync` 채택 OK?
- [ ] **Trust Level**: L2 (Semi-Auto) OK? (L4 Full-Auto는 archive risk로 미권장)
- [ ] **9 Features 구성**: F0~F9 분할 OK?
- [ ] **F8 Archive Whitelist**: 별도 task로 확정 후 실행 — sprint design phase에서 finalize
- [ ] **Recommended CC version**: README v2.1.118+ → v2.1.123 보수적 권장 또는 v2.1.139 균형 권장 — 사용자 결정 필요
- [ ] **CHANGELOG v2.1.13 section format**: §F2 표 채택 OK?
- [ ] **본 sprint와 v2.1.13 GA release 관계**: 본 sprint 완료 후 v2.1.13 GA release tag 진행 OK?
- [ ] **`/sprint` 자체 버그 발견 시**: hotfix 별도 track, 본 sprint는 pause/resume OK?

---

## 17. Appendix A: 활성 문서 영역 vs 보관 영역 정의

활성 문서 영역 (v2.1.13 정확성 필수):
- `README.md`, `README-FULL.md`, `CHANGELOG.md` (단 [2.1.12] 섹션은 역사 보존 — 본문 변경 금지)
- `CUSTOMIZATION-GUIDE.md`, `AI-NATIVE-DEVELOPMENT.md`
- `bkit.config.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- `hooks/hooks.json`, `hooks/session-start.js`
- `commands/bkit.md`
- `bkit-system/` 전체
- `skills/*/SKILL.md`, `agents/*.md` (현 시점 사이클 활성)
- `templates/**/*.template.md`
- `docs/adr/` (모든 ADR — 살아있는 invariant)
- `docs/06-guide/` (Korean user guides — v2.1.13 작성됨)

보관 영역 (v2.1.12 잔재 허용):
- `memory/` — history 보존 시 시간 형태 유지
- `docs/archive/` — 본 sprint F8에서 새로 추가될 디렉토리
- `docs/03-analysis/`, `docs/04-report/`, `docs/05-qa/`, `docs/00-pm/` — 보관 카테고리 (단 F8 archive 대상 적용)
- `CHANGELOG.md` [2.1.12] 섹션 본문 — 역사 기록

---

## 18. Appendix B: bkit Feature Usage Report (본 master plan 작성 시)

| Feature | 사용 여부 | 비고 |
|---|---|---|
| `/sprint init/start/status` | ❌ 예정 | 본 sprint init은 사용자 승인 후 |
| `gap-detector` | ❌ 예정 | F9 phase |
| `pdca-iterator` | ❌ 예정 | F9 phase 조건부 |
| `sprint-master-planner` (agent) | ⚠️ partial | 본 master plan은 직접 작성 — 사용자 명시: "꼼꼼하게 작성" |
| `sprint-orchestrator` | ❌ 예정 | F9 phase |
| `sprint-qa-flow` | ❌ 예정 | F9 phase |
| `sprint-report-writer` | ❌ 예정 | Phase 7 |
| `/pdca cleanup` | ❌ 예정 | F8 phase |
| `code-analyzer` | ⚠️ optional | 본 sprint는 doc sync, 코드 변경 ≤ 10 LOC |
| `bkit:bkit-explore` | ❌ 사용 안 함 | 사용자 미요청 |
| `bkit:audit` | ❌ 사용 안 함 | sprint 진행 후 audit 확인 시 사용 |
| Task Management System | ✅ 사용 | 본 sprint 완료 후 TaskCreate 등록 |

---

**End of Master Plan**

> 사용자 승인 후 `/sprint init v2113-docs-sync --name "v2.1.13 Documentation Sync" --features f0-baseline,f1-version-bump,f2-changelog,f3-readme,f4-readme-full,f5-customization,f6-bkit-system,f7-hooks-commands,f8-archive-cleanup,f9-real-use-validation --trust L2 --base-master-plan docs/01-plan/features/v2113-docs-sync.master-plan.md` 명령으로 sprint를 활성화한다.
