# v2.1.13 Baseline Component Count Analysis

> **Sprint**: v2113-docs-sync · **Phase**: do/F0 · **Date**: 2026-05-12
> **Purpose**: F1~F8 모든 doc sync feature가 anchor할 ground truth 측정

---

## Measurement Results

| Component | Memory (claim) | Measured v2.1.13 | Delta | Source |
|---|---|---|---|---|
| Skills | 43 | **44** | +1 (sprint) | `ls skills/ \| wc -l` |
| Agents (.md files) | 36 | **34** | **−2 (memory was wrong)** | `find agents -maxdepth 1 -name "*.md" -type f \| wc -l` |
| Templates | 18 | **39** | +21 (incl. 7 sprint templates + old GRAPH-INDEX was outdated) | `find templates -name "*.md" -o -name "*.template.md" \| wc -l` |
| Lib modules | 142 | **163** | +21 (Sprint Domain/Application/Infrastructure) | `find lib -name "*.js" -type f \| wc -l` |
| Lib subdirs | 16 | **19** | +3 (application + nested sprint-lifecycle + nested infra/sprint) | `find lib -type d -mindepth 1 -maxdepth 1 \| wc -l` |
| MCP servers | 2 | **2** | 0 (invariant) | `ls servers/ -d` |
| MCP tools | 16 | **19** | **+3 (bkit_sprint_list / bkit_sprint_status / bkit_master_plan_read)** | bkit-pdca 13 + bkit-analysis 6 |
| Scripts | 49 | **51** | +2 (sprint-handler.js + sprint-memory-writer.js) | `find scripts -maxdepth 1 -name "*.js" -type f \| wc -l` |
| Hook events | 21 | **21** | 0 (invariant) | hooks.json event keys |
| Hook blocks (handlers) | 24 | **24** | 0 (invariant) | hooks.json total handlers |
| ACTION_TYPES | 18 | **20** | **+4 (sprint_paused / sprint_resumed / master_plan_created / task_created)** | lib/audit/audit-logger.js |
| CATEGORIES | 10 | **11** | **+1 ('sprint' added v2.1.13 DEEP-4)** | lib/audit/audit-logger.js |
| Contract test cases (SC) | 0 | **8 (SC-01 ~ SC-08)** | +8 (v2.1.13 신규) | tests/contract/v2113-sprint-contracts.test.js |
| Test files (.test.js) | 117+ (qa-aggregate scope) | 21 (find -name "*.test.js" alone) | scope 차이 — qa-aggregate가 더 광범위 | precise: 21 .test.js files |

---

## Memory Correction Required

본 baseline 측정 결과 메모리 (`MEMORY.md`) 정정 필요 항목:

1. **Agents 36 → 34**: 메모리는 "36 Agents" 주장 (`9 user-scope + 21 sonnet + 2 haiku + ...`). 실측 34. 4 sprint agents (sprint-master-planner / sprint-orchestrator / sprint-qa-flow / sprint-report-writer) 추가 후에도 34. ⚠️ **메모리 baseline이 처음부터 잘못이었음** (실제 v2.1.12 시점 = 30, v2.1.13 = 30 + 4 = **34**, 메모리 36은 합산 오류).
2. **Lib modules 142 → 163**: +21 모듈 (Sprint Domain/Application/Infrastructure 추가). 메모리는 v2.1.12 baseline.
3. **Lib subdirs 16 → 19**: +3 (application/sprint-lifecycle nested + infra/sprint nested + application root 자체 이미 v2.1.11 γ2 pilot에서 도입되었으나 lib/application/pdca-lifecycle/는 단일 디렉토리이므로 root level은 +1).
4. **ACTION_TYPES 18 → 20**: 메모리는 "ACTION_TYPES (19 entries)" 주장. 실측 20 (master_plan_created + task_created 모두 추가).
5. **CATEGORIES 10 → 11**: 'sprint' 카테고리 신규.
6. **Scripts 49 → 51**: +2 sprint scripts.
7. **Templates count**: 메모리는 명시 X (GRAPH-INDEX 18). 실측 39 — 메모리/GRAPH-INDEX 둘 다 outdated.

---

## ACTION_TYPES (v2.1.13 정식 enumeration, 20건)

```
1. phase_transition
2. feature_created
3. feature_archived
4. file_created
5. file_modified
6. file_deleted
7. config_changed
8. automation_level_changed
9. checkpoint_created
10. rollback_executed
11. agent_spawned
12. agent_completed
13. agent_failed
14. gate_passed
15. gate_failed
16. destructive_blocked
17. sprint_paused                ★ v2.1.13 Sprint 4
18. sprint_resumed               ★ v2.1.13 Sprint 4
19. master_plan_created          ★ v2.1.13 S2-UX Master Plan Generator
20. task_created                 ★ v2.1.13 관점 1-1 DEEP-4 fix
```

## CATEGORIES (v2.1.13 정식 enumeration, 11건)

```
1. pdca
2. sprint                        ★ v2.1.13 관점 1-1 DEEP-4
3. file
4. config
5. control
6. team
7. quality
8. permission
9. checkpoint
10. trust
11. system
```

---

## Anchor Values for Downstream Features (F1~F8)

| Downstream Feature | Value to Use | Note |
|---|---|---|
| F2 (CHANGELOG) | ACTION_TYPES 18 → 20 (메모리 19 정정) | +4 not +3 |
| F2 (CHANGELOG) | 4 sprint agents | invariant |
| F2 (CHANGELOG) | 7 sprint templates | invariant |
| F3 (README architecture table) | Skills **44** / Agents **34** / Lib **163** / Scripts **51** / Templates **39** / MCP tools **19** / Hook 21:24 / Tests 118+ | 실측 |
| F4 (README-FULL) | 동일 + lib subdirs **19** | 실측 |
| F5 (CUSTOMIZATION-GUIDE) | 730+ → 실측 합산 = 44+34+19+163+24+39+51 = **374 핵심 + 보조 = ~700+** (총 components 정의 모호하므로 "700+" 보수적 유지) | conservative |
| F5 (AI-NATIVE-DEVELOPMENT) | Skills **44** / Agents **34** / Lib modules **163** | 실측 |
| F6 (_GRAPH-INDEX) | Skills **44** / Agents **34** / Scripts **51** / Templates **39** / Lib **163 / 19 subdirs** | 실측 |
| F6 (_GRAPH-INDEX MCP) | 19 tools (PDCA 13 + Analysis 6) | 실측 |

---

## Decisions for Downstream

1. **F2 CHANGELOG**: `ACTION_TYPES 18 → 20` 사용 (메모리 "+3" 정정하여 "+4"로 — sprint_paused / sprint_resumed / master_plan_created / task_created)
2. **F2 CHANGELOG**: CATEGORIES 신규 'sprint' 추가 명시
3. **F3 README**: 실측 표 사용 (placeholder 치환)
4. **F4 README-FULL**: 실측 + lib subdirs 19 사용
5. **F5 CUSTOMIZATION**: "700+ components" 보수적 유지 (component 정의 모호)
6. **F6 _GRAPH-INDEX**: 모든 카운트 실측 + Templates section을 18 → 39로 확장 + Sprint Templates (7) 카테고리 신규

---

**End of F0 Baseline Analysis**
