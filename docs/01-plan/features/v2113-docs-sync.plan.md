# v2113-docs-sync — Feature Plan

> **Sprint ID**: `v2113-docs-sync`
> **Phase**: plan
> **Date**: 2026-05-12
> **Trust Scope**: L4 Full-Auto (사용자 명시)
> **Upstream**: Master Plan `docs/01-plan/features/v2113-docs-sync.master-plan.md` + PRD `docs/00-pm/v2113-docs-sync.prd.md`
> **Downstream**: Design `docs/02-design/features/v2113-docs-sync.design.md` (다음 phase)

---

## Context Anchor (master plan §1 동기화, do/qa/report에 전파)

| Key | Value |
|---|---|
| **WHY** | v2.1.13 코드 완료, 문서 v2.1.12 잔재. README/CHANGELOG/manifest/onboarding 모두 동기화 필요 |
| **WHO** | 신규 사용자 + maintainer + CI + Sprint 베타 사용자 + marketplace |
| **WHAT** | 11 doc surface + BKIT_VERSION 5-loc + 89 archive + bkit 자가 검증 |
| **WHAT NOT** | 신규 기능 X / 코드 회귀 X / lib `@version` bulk X / docs/06-guide 재작성 X |
| **RISK** | Count drift / sprint 회귀 / archive 과잉 / CHANGELOG 누락 / ENH-292 caching / language 충돌 |
| **SUCCESS** | 8건 (docs-code-sync 0 / plugin validate Exit 0 / BKIT_VERSION 5-loc / 활성영역 grep 0 / S1≥85% / pdca cleanup stale 0 / gap-detector≥90% / lessons≥5) |
| **SCOPE** | 신규 doc 4 + 수정 doc 11 + archive 89 + task 35 |

---

## 9 Feature Plan Breakdown

### F0 — baseline-verify (1 turn, read-only)

**목적**: 실측 component count + 메모리 정합성 확보. 모든 후속 feature가 본 결과에 anchor.

**Tasks**:

| ID | Action | Expected |
|---|---|---|
| T0.1 | `ls skills/ \| wc -l` | 44 (43 + sprint 신규 1) |
| T0.2 | `find agents -name "*.md" -type f \| wc -l` | 메모리 36 vs 실측 (실제 34 추정) — 정합성 확인 |
| T0.3 | `find templates -name "*.md" -type f -o -name "*.template.md" -type f \| wc -l` | 39 (Sprint templates 7개 추가) |
| T0.4 | `find lib -name "*.js" -type f \| wc -l` | TBD (Sprint 1~5 추가 + lib/application/sprint-lifecycle/ + lib/infra/sprint/) |
| T0.5 | `find lib -type d -mindepth 1 -maxdepth 1 \| wc -l` | TBD (16 + α) |
| T0.6 | `node scripts/docs-code-sync.js --dry-run 2>&1 \| head -50` | 8-count baseline + drift 상태 |
| T0.7 | `grep -c "ACTION_TYPES" lib/audit/audit-logger.js` | ACTION_TYPES 19 enumeration 확인 |
| T0.8 | `cat tests/contract/v2113-sprint-contracts.test.js \| grep -c "SC-0"` | 8 SC-01~08 |
| T0.9 | `find servers/bkit-pdca-server -name "*.js" -exec grep -l "sprint" {} \;` | 3 신규 MCP tools 확인 |
| T0.10 | `find scripts -name "sprint-*.js"` | sprint-handler.js + sprint-memory-writer.js |

**Output**: `docs/03-analysis/v2113-baseline-count.analysis.md` (1 page) — 모든 measurement + 메모리 정정 list.

**Success**: 9 measurement 실측 capture + 메모리 차이 정정 필요 list 명시.

---

### F1 — version-bump (1 turn, 8 edits + 2 verification)

**목적**: BKIT_VERSION 5-loc invariant 2.1.12 → 2.1.13 일관 갱신.

**Tasks**:

| ID | File:Line | Old | New |
|---|---|---|---|
| T1.1 | `bkit.config.json:2` | `"version": "2.1.12"` | `"version": "2.1.13"` |
| T1.2 | `.claude-plugin/plugin.json:3` | `"version": "2.1.12"` | `"version": "2.1.13"` |
| T1.3a | `.claude-plugin/marketplace.json:4` | `"version": "2.1.12"` | `"version": "2.1.13"` |
| T1.3b | `.claude-plugin/marketplace.json:37` | `"version": "2.1.12"` | `"version": "2.1.13"` |
| T1.4 | `hooks/hooks.json:3` | `bkit Vibecoding Kit v2.1.12 - Claude Code` | `bkit Vibecoding Kit v2.1.13 - Claude Code` |
| T1.5 | `hooks/session-start.js:3` | `(v2.1.12, uses BKIT_VERSION from lib/core/version)` | `(v2.1.13, uses BKIT_VERSION from lib/core/version)` |
| T1.6 | `README.md:7` | `Version-2.1.12-green.svg` | `Version-2.1.13-green.svg` |
| T1.7 | `README-FULL.md:9` | `Version-2.1.12-green.svg` | `Version-2.1.13-green.svg` |
| T1.8 | (verification) | — | `node scripts/docs-code-sync.js` Exit 0 |
| T1.9 | (verification) | — | `claude plugin validate .` Exit 0 (F9-120 9-streak) |

**Success**: 8 file edit + 2 CLI verification Exit 0.

**Risk**: Marketplace.json 2 곳 누락 시 mismatch.

---

### F2 — changelog-v2113 (1 turn, 1 large prepend)

**목적**: `CHANGELOG.md` top에 `## [2.1.13] - 2026-05-12` 신규 섹션 prepend.

**Structure (master plan §F2 표 채택)**:

```markdown
## [2.1.13] - 2026-05-12 (branch: feature/v2113-sprint-management)

> **Status**: GA — Sprint Management feature release + tech debt cleanup
> **One-Liner (EN)**: The only Claude Code plugin that verifies AI-generated code against its own design specs.
> **One-Liner (KO)**: AI가 만든 코드를 AI가 만든 설계로 검증하는 유일한 Claude Code 플러그인.

### Added — Sprint Management (Major Feature)
(13 bullets ~ Sprint 8-phase + 16 sub-actions + 4 auto-pause + Trust L0-L4 + 7-Layer S1 + 3 MCP tools + 4 agents + 1 skill + 7 templates + 2 adapters + 1 contract test + 2 Korean guides + 2 ADRs + 3 scaffolds + Context Sizer)

### Added — Sprint UX Improvement (4 sub-sprints)
(S1-UX ~ S4-UX 4 bullets)

### Changed — Skill Cross-References (14 skills)
(14 skills listed)

### Changed — Architecture
(ACTION_TYPES 18→19, lib/orchestrator/{next-action-engine, team-protocol}, lib/intent/language.js)

### Removed — Tech Debt Cleanup (-2,333 net LOC)
(7 templates/infra/* removed)

### Fixed — Inline Root Fixes (Final QA)
(intent ordering + audit category migration)

### Fixed — v2.1.12 Carryovers Closed
(CARRY-7 ~ CARRY-12 closures)

### Verified — CC v2.1.139 Compatibility
(94 consecutive compatible + ADR 0003 8th application)
```

**Tasks**:
- T2.1: Edit CHANGELOG.md — top prepend (line 7 직후 `## [2.1.12]` 위에 insert)
- T2.2: Verify 기존 `## [2.1.12]` 섹션 본문 보존 (line 8~265+ 약 257줄 unchanged)
- T2.3: §2.1 commit 흐름 표 30 commits cross-reference — 누락 항목 0

**Success**: ~250 LOC prepend + 기존 [2.1.12] 섹션 본문 0 변경.

**Risk**: 누락 — Sprint 5 Quality+Docs / 4 UX sub-sprints / deep-sweep / 14 skill cross-refs / CARRY-7~12 모두 포함 검증.

---

### F3 — readme-core (1 turn, ~10 LOC edit)

**목적**: README.md 95줄 v2.1.13 정확화.

**Tasks**:

| ID | Action |
|---|---|
| T3.1 | (F1 T1.6 완료 — line 7 badge bump) |
| T3.2 | Line 43: `Recommended runtime: Claude Code **v2.1.118+**` → `**v2.1.123+** (보수적 권장)` (사용자 결정 Q3) |
| T3.3 | Line 45: `Architecture (v2.1.12)` → `Architecture (v2.1.13)` |
| T3.4 | Line 48-54 architecture table 실측 (F0 결과 반영): Skills 44 / Agents 실측 / Hook events 21 / Hook blocks 24 / MCP tools 19 / Lib modules 실측 / Templates 39 / Test files 118+ |
| T3.5 | Line 56: 기존 paragraph에 Sprint Management 한 줄 추가 (v2.1.13 hotfix 대신 v2.1.13 GA로 갱신 — "v2.1.13 GA adds Sprint Management meta-container (8-phase, 16 sub-actions, 4 auto-pause triggers)") |
| T3.6 | Line 58-79 Sprint Management section: 이미 v2.1.13 표기, content 검증 (15 sub-actions → **16 sub-actions** 정정, master-plan 포함) |

**Success**: 모든 line 정확.

---

### F4 — readme-full (1 turn, ~150 LOC)

**목적**: README-FULL.md 포괄적 v2.1.13 deep sync.

**Tasks**:

| ID | Action |
|---|---|
| T4.1 | (F1 T1.7 완료 — line 9 badge) |
| T4.2 | Line 5 intro: `complete v2.1.12 feature inventory` → `complete v2.1.13 feature inventory (Sprint Management GA + tech debt cleanup)` |
| T4.3 | Line 68 직후 v2.1.13 신규 섹션 prepend: Sprint Management 전체 deliverable (master plan §2.2 기반) ~150 LOC |
| T4.4 | Architecture summary 표 실측 갱신 (F0 결과 반영) |
| T4.5 | Lib subdirectories list: `+lib/application/sprint-lifecycle/` + `+lib/infra/sprint/` 추가 |
| T4.6 | ENH closures list: CARRY-7~12 closed in v2.1.13 |

**Success**: v2.1.13 GA inventory 완결 + v2.1.11/v2.1.12 history 보존.

---

### F5 — customization-ainative (1 turn, ~30 LOC)

**목적**: CUSTOMIZATION-GUIDE.md + AI-NATIVE-DEVELOPMENT.md v2.1.13 동기화.

**Tasks**:

| ID | File:Line | Action |
|---|---|---|
| T5.1 | `CUSTOMIZATION-GUIDE.md:180` | `Component Inventory (v2.1.12 — ...)` → `(v2.1.13 — runtime-measured 2026-05-12)` |
| T5.2 | `CUSTOMIZATION-GUIDE.md:194` | `BKIT_VERSION 2.1.12` → `2.1.13` |
| T5.3 | `CUSTOMIZATION-GUIDE.md:196` | `700+ components` text — Sprint deliverable (4 agents + 7 templates + 1 skill + ~14 lib modules + 3 MCP tools = +29) 합산하여 `730+ components` 또는 실측 |
| T5.4 | `AI-NATIVE-DEVELOPMENT.md:143` | `bkit v2.1.12 Implementation` → `v2.1.13 Implementation` |
| T5.5 | `AI-NATIVE-DEVELOPMENT.md:200` | `Context Engineering Architecture (v2.1.12)` → `(v2.1.13)` |
| T5.6 | `AI-NATIVE-DEVELOPMENT.md:203` | ASCII 박스 헤더 `bkit v2.1.12 Context Engineering Layers` → `v2.1.13 Context Engineering Layers` |
| T5.7 | `AI-NATIVE-DEVELOPMENT.md` (Principle 6 검토) | Sprint Management = AI-Native Principle 6 (Sprint as Meta-Container for Multi-Feature Initiatives) 추가 검토 — 신규 섹션 또는 Principle 5 (CTO-Led Agent Teams) 확장 |

**Success**: 2 file edits + Sprint AI-Native principle 위치 결정.

---

### F6 — bkit-system-graph (1-2 turn, ~250 LOC)

**목적**: bkit-system/ Obsidian graph 동기화 (`_GRAPH-INDEX.md` + 4 components overview + philosophy + scenarios + triggers).

**Tasks**:

| ID | File | Action |
|---|---|---|
| T6.1 | `bkit-system/_GRAPH-INDEX.md:3` | `Current release: v2.1.12` → `v2.1.13` |
| T6.2 | `bkit-system/_GRAPH-INDEX.md:7-16` | Highlights — Sprint Management 추가 (8-phase meta-container, 16 sub-actions, 4 auto-pause, Trust L0-L4) |
| T6.3 | `bkit-system/_GRAPH-INDEX.md:45` Skills (39) | `Skills (39)` → `Skills (44)` + 신규 카테고리 `### Sprint Skill (1)` + sprint 항목 |
| T6.4 | `bkit-system/_GRAPH-INDEX.md:91` Agents (36) | 실측 + 신규 카테고리 `### Sprint Agents (4)` + 4 agents listed |
| T6.5 | `bkit-system/_GRAPH-INDEX.md:163` Hooks (21) | invariant 유지 (21 events / 24 blocks) — Sprint 통합점 명시 (next-action-engine + team-protocol intent-router) |
| T6.6 | `bkit-system/_GRAPH-INDEX.md:172` Scripts (49) | 실측 + sprint-handler.js + sprint-memory-writer.js 추가 |
| T6.7 | `bkit-system/_GRAPH-INDEX.md:338` Components (v2.1.12 Final) | `(v2.1.13 GA, 2026-05-12)` + 실측 number 반영 |
| T6.8 | `bkit-system/_GRAPH-INDEX.md:350` Templates (18) | 실측 + 신규 카테고리 `### Sprint Templates (7)` + 7 templates listed |
| T6.9 | `bkit-system/components/skills/_skills-overview.md` | sprint skill 항목 추가 |
| T6.10 | `bkit-system/components/agents/_agents-overview.md` | 4 sprint agents 추가 |
| T6.11 | `bkit-system/components/scripts/_scripts-overview.md` | sprint-handler.js + sprint-memory-writer.js + sprint-orchestrator 통합점 |
| T6.12 | `bkit-system/components/hooks/_hooks-overview.md` | Sprint 통합 (next-action-engine + team-protocol)  |
| T6.13 | `bkit-system/philosophy/pdca-methodology.md` | Sprint coexistence 단락 추가 (orthogonal coexistence) |
| T6.14 | `bkit-system/scenarios/scenario-sprint.md` | 신규 — 사용자 sprint 운영 시나리오 (init → start → status → qa → report → archive 시각화) |
| T6.15 | `bkit-system/triggers/trigger-matrix.md` | sprint trigger pattern 추가 |

**Success**: Obsidian [[wiki-link]] integrity 통과 + 15 task 적용.

---

### F7 — hooks-commands (1 turn)

**목적**: hooks/ + commands/ final pass.

**Tasks**:

| ID | File:Line | Action |
|---|---|---|
| T7.1 | `hooks/hooks.json:3` | (F1 T1.4 완료) |
| T7.2 | `hooks/session-start.js:3` | (F1 T1.5 완료) |
| T7.3 | `hooks/session-start.js:125` | comment `// v2.1.12 Sprint C-1 (#15 fix): ...` 그대로 보존 (역사 기록 — 변경 X) |
| T7.4 | `commands/bkit.md` content 검증 | v2.1.13 Sprint Management section line 48-66 정합성 + 15 sub-actions → 16 sub-actions (master-plan 포함) 정정 |
| T7.5 | `commands/bkit.md` help message | ASCII 표 Sprint Management section 16 sub-actions list 확정 |

**Success**: 명령어 help 메시지 정확.

---

### F8 — docs-archive-cleanup (1-2 turn, HIGH RISK — auto execute with dry-run preview)

**목적**: docs/ legacy 89+ 파일 archive + `/pdca cleanup`.

**Whitelist (보관 X)**:
- 본 sprint 산출물: `v2113-docs-sync.*`
- 살아있는 ADR: 0004, 0005, 0006, 0007
- 본 sprint reference: cc-v2138-v2139 (가장 최근)
- v2.1.13 GA 산출물: sprint-management.master-plan.md + sprint-ux-improvement.master-plan.md + 5 v2113-sprint-N PRD/Plan/Design/QA/Report

**Archive 대상 (~80 파일)**:

| Category | Pattern | 예상 count |
|---|---|---|
| v2.1.10 cycle | `bkit-v2110-*` | 8 |
| v2.1.11 cycle | `bkit-v2111-*` | 6 |
| v2.1.12 cycle | `bkit-v2112-*` (단 `deep-functional-qa-issues` 보존 — CARRY 식별 출처) | 8 |
| Legacy versions | `bkit-v216-*`, `bkit-v217-*`, `bkit-v219-*` | 6 |
| CC version analyses | `cc-v2110-*` ~ `cc-v2137-*` (sans v2138-v2139) | 14 |
| Stale test features | `test-*`, `feat-persist-*`, `test-feature-lc*`, `test-iter-*`, `test-flow-*`, `test-complete-*`, `test-abandon-*` | 20+ |
| Old docs sync | `v2110-docs-sync.*`, `bkit-v219-docs-sync.*` | 4 |

**Tasks**:
- T8.1: `mkdir -p docs/archive/2026-05/{00-pm,01-plan,02-design,03-analysis,04-report,05-qa}/features`
- T8.2: Whitelist + Archive list 확정 (Bash + grep)
- T8.3: Dry-run preview — `git mv` plan을 file list로 export → 사용자 검토용
- T8.4: 실제 `git mv` 실행 (history 보존)
- T8.5: `/pdca cleanup` 실행 — `.bkit/state/pdca-status.json` stale 제거
- T8.6: `git status` 확인

**Success**: ~80 파일 이동 + `.pdca-status.json` stale 0건 + activate docs/ 디렉토리에 archive 대상 0건.

**Risk Mitigation**: `git mv` (history 보존, revert 가능). 사용자 최종 검토 게이트 (commit/push 전).

---

### F9 — real-use-validation (1-2 turn)

**목적**: bkit `/sprint` 기능 자가 검증.

**Tasks**:

| ID | Action | Verification |
|---|---|---|
| T9.1 | `/sprint init v2113-docs-sync --name "..." --features ... --trust L4` | `.bkit/state/sprints/v2113-docs-sync.json` 생성 |
| T9.2 | `/sprint start v2113-docs-sync` | Plan → Design → Do auto-run 확인 |
| T9.3 | `/sprint status` 모니터링 | 현재 phase + 4 trigger 상태 |
| T9.4 | `gap-detector` 실행 | master plan ↔ 산출물 matchRate ≥ 90% |
| T9.5 | `/sprint qa v2113-docs-sync` | 7-Layer S1 dataFlow (문서 cross-ref integrity) ≥ 85% |
| T9.6 | `pdca-iterator` (조건부 < 90%) | matchRate ≥ 90% 도달까지 max 5 iter |
| T9.7 | `/sprint report v2113-docs-sync` | report.md 생성 + lessons ≥ 5 |
| T9.8 | Audit log 검증 | `.bkit/audit/audit-log.ndjson` ACTION_TYPES 19 |
| T9.9 | `/sprint archive v2113-docs-sync` | terminal state 진입 |
| T9.10 | MCP `bkit_sprint_list` 호출 | 본 sprint 등록 확인 |
| T9.11 | MCP `bkit_sprint_status` 호출 | 현재 phase 정확 반영 |
| T9.12 | MCP `bkit_master_plan_read` 호출 | 본 문서 정확 반환 |

**Success**: Sprint 8-phase 완주 + S1 ≥ 85% + gap-detector ≥ 90% + lessons ≥ 5 + MCP 3 tools PASS.

---

## Phase Roadmap

```
prd          [완료]    이 PRD + master plan
plan         [현재]    이 plan 문서
design       [다음]    docs/02-design/features/v2113-docs-sync.design.md (exact edit hunks)
do           [블록]    F0 → F1 → F2 → F3-F7 (sequential) → F8 → (각 feature 후 self-QA)
iterate      [조건]    gap-detector < 90% 시 max 5 iter
qa           [블록]    F9 sprint-qa-flow
report       [블록]    sprint-report-writer → docs/04-report/features/v2113-docs-sync.report.md
archived     [블록]    /sprint archive + memory MEMORY.md 갱신
```

---

## Task Management Mapping

| Task # | Phase | Feature | Status |
|---|---|---|---|
| 1 | prd | — | ✅ completed |
| 2 | plan | — | 🔄 in_progress |
| 3 | design | — | pending (blockedBy 2) |
| 4 | do | F0 | pending (blockedBy 3) |
| 5 | do | F1 | pending (blockedBy 4) |
| 6 | do | F2 | pending (blockedBy 5) |
| 7 | do | F3 | pending (blockedBy 5, parallel-capable) |
| 8 | do | F4 | pending (blockedBy 5, parallel-capable) |
| 9 | do | F5 | pending (blockedBy 5, parallel-capable) |
| 10 | do | F6 | pending (blockedBy 5, parallel-capable) |
| 11 | do | F7 | pending (blockedBy 5, parallel-capable) |
| 12 | do | F8 | pending (blockedBy 6,7,8,9,10,11) |
| 13 | qa | F9 | pending (blockedBy 12) |
| 14 | report | — | pending (blockedBy 13) |
| 15 | archived | — | pending (blockedBy 14) |

> **Sequential dispatch 강제**: F3~F7 parallel-capable이나 ENH-292 caching 회귀 mitigation으로 sequential 실행.

---

## Quality Gates

| Gate | Threshold | Check Point |
|---|---|---|
| M1 matchRate | ≥ 90% | after F9 (gap-detector) |
| M3 critical issue | 0 | after F1 (docs-code-sync + plugin validate) |
| M8 sprint matchRate | ≥ 85% | after F9 (sprint-qa-flow) |
| S1 dataFlow integrity | ≥ 85% | after F9 (재해석: doc cross-ref integrity) |

---

**End of Plan**
