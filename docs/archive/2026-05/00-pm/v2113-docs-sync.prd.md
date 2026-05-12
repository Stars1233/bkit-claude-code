# v2113-docs-sync — Product Requirements Document (PRD)

> **Sprint ID**: `v2113-docs-sync`
> **Type**: Sprint-level PRD (PDCA-as-Sprint, 9-feature meta-container)
> **Date**: 2026-05-12
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Trust Scope**: L4 Full-Auto + 꼼꼼함 보강
> **Master Plan**: `docs/01-plan/features/v2113-docs-sync.master-plan.md`

---

## 0. Executive Summary

bkit v2.1.13의 신규 기능 (Sprint Management) · 아키텍처 변경 · 기술부채 청산 (-2,333 LOC) 결과를 **11개 활성 문서 surface + BKIT_VERSION 5-loc invariant + 89+ legacy doc archive**에 동기화하고, 동일 sprint를 **bkit `/sprint` 기능 자가 검증 (dogfooding)** 수단으로 사용한다.

---

## 1. Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | v2.1.13 코드/기능은 완료 (Sprint Management + UX 4 sub-sprints + deep-sweep)되었으나 README/CHANGELOG/매니페스트/온보딩 가이드는 **v2.1.12 잔재**. 신규 사용자가 Sprint를 발견 못 하거나, `claude plugin validate` marketplace version mismatch, `docs-code-sync.js` CI gate drift 위험. |
| **WHO** | (1) 신규 bkit 사용자 (정확한 onboarding 경로), (2) bkit maintainer kay (다음 사이클 baseline + memory 갱신), (3) marketplace 검색 사용자, (4) CI gate (docs-code-sync + check-quality-gates + L4 contract), (5) Sprint 기능 베타 사용자 (실 working example 본 sprint) |
| **WHAT** | 문서 surface 11개 + BKIT_VERSION 5-loc invariant + 89+ legacy doc archive + bkit `/sprint` 자가 검증 |
| **WHAT NOT** | 신규 기능 추가 X / 코드 회귀 수정 X (BKIT_VERSION constant bump ≤ 10 LOC 예외) / `lib/` 142 모듈 `@version` bulk update X (v2.1.14 carry) / docs/06-guide Korean guides 재작성 X (이미 작성됨) |
| **RISK** | Component count drift / Sprint 자체 회귀 / Archive 과잉 / CHANGELOG 누락 / ENH-292 caching 회귀 / language 충돌 (docs Korean vs README English) |
| **SUCCESS** | 8건 criteria (§6 표 참조) |
| **SCOPE** | 신규 doc 4 (master plan + PRD + plan + design 본 sprint 자체) + 수정 doc 11 + Archive 89 + Task 35 (sprint phase × feature × sub-task) |

---

## 2. Problem Statement (사용자 시각)

### 2.1 Pain Points

1. **신규 사용자 onboarding 경로 단절**: README badge가 v2.1.12 표시 + Sprint Management 신규 기능에 대한 short description은 line 58-79에 있으나 architecture section은 여전히 v2.1.12 기준. "v2.1.12로 이해해야 하는가 v2.1.13인가" 혼란.
2. **CI gate drift 위험**: `scripts/docs-code-sync.js` 8-count + BKIT_VERSION 5-loc invariant 검증. config.json `version: 2.1.12` + marketplace.json `version: 2.1.12` 두 곳이 일치하지 않으면 mismatch 발화 가능 (현재는 둘 다 2.1.12로 일관 — 그러나 v2.1.13 GA release 전 반드시 bump 필요).
3. **Marketplace UX**: `.claude-plugin/marketplace.json:version` 갱신 누락 시 사용자가 `claude plugin install bkit`로 v2.1.13 받지 못 함 (npm registry 의존성).
4. **메모리 vs 실측 drift**: 메모리는 "Skills 43 / Agents 36" 주장. 실측은 `skills/ 44 디렉토리 / agents/ 34 .md 파일`. 신규 sprint 추가 후에도 agents .md 파일이 34인 이유 (메모리 카운팅 방식 차이 vs 실제 cleanup) — 사실 baseline 확정 필수.
5. **docs/ 누적 압력**: 89+ legacy docs (v2.1.10/v2.1.11/v2.1.12 사이클 closed 항목 + cc-version-* 14건 + stale test feature 20+건)가 docs/ 디렉토리에 잔존하여 검색·탐색 비효율.
6. **Sprint 기능 검증 부재**: Sprint Management는 v2.1.13에서 신규 추가되었으나 **실제 working example**이 부재. 본 sprint를 dogfooding하여 실 사용 검증.

### 2.2 Value Proposition

- **사용자 시점**: README 한 번 더 봐도 v2.1.13 신규 기능 (Sprint Management) 5초 내 발견 + onboarding 1분 내 완료
- **메인테이너 시점**: docs-code-sync 0 drift + plugin validate Exit 0 보장 + CHANGELOG v2.1.13 섹션 통한 release notes 자동 생성 기반
- **CI 시점**: BKIT_VERSION 5-loc invariant + 8-count drift 0 + L4 contract test (8 SC-01~08) 통과
- **베타 사용자 시점**: 본 sprint = 실 working example, `docs/01-plan/features/v2113-docs-sync.master-plan.md` 그대로 reference 가능

---

## 3. User Stories

### Story 1: 신규 사용자
> **As** a new bkit user installing v2.1.13,
> **I want** the README to clearly show the current version, recommended Claude Code version, and how to use Sprint Management,
> **so that** I can decide whether bkit fits my workflow in under 3 minutes.

**Acceptance Criteria**:
- README badge: `Version-2.1.13-green.svg`
- README Architecture section: `(v2.1.13)` 표시 + Skills/Agents/Hooks/MCP tools/Templates/Lib modules 실측 number
- README Sprint Management section (line 58-79): 16 sub-actions + 8-phase + 4 auto-pause triggers + Trust L0-L4 명시
- Recommended runtime: Claude Code v2.1.123+ (사용자 결정)
- 첫 sprint 운영 예시: `/sprint init my-launch --features a,b --trust L3`

### Story 2: bkit maintainer
> **As** the bkit maintainer preparing v2.1.13 GA release,
> **I want** all 5 BKIT_VERSION locations + 8-count CI gate to pass invariant validation,
> **so that** I can tag v2.1.13 and push to npm without registry mismatch errors.

**Acceptance Criteria**:
- `node scripts/docs-code-sync.js` Exit 0 (8-count + BKIT_VERSION 5-loc 0 drift)
- `claude plugin validate .` Exit 0 (F9-120 closure 9-streak 유지)
- `grep -rn "2\.1\.12"` 활성 문서 영역 0건 (보관 영역 제외)
- CHANGELOG.md `## [2.1.13] - 2026-05-12` 섹션 존재

### Story 3: Sprint Management 베타 사용자
> **As** a bkit user wanting to try Sprint Management for the first time,
> **I want** a real working sprint example to reference,
> **so that** I can copy the pattern for my own sprint without trial-and-error.

**Acceptance Criteria**:
- `docs/01-plan/features/v2113-docs-sync.master-plan.md` 본 sprint 완결 example
- `docs/04-report/features/v2113-docs-sync.report.md` final report with KPI + lessons learned ≥ 5건
- `.bkit/state/sprints/v2113-docs-sync.json` archived state 보존
- README "Sprint Management (v2.1.13)" section에서 본 sprint 참조 (optional)

### Story 4: CI 시스템
> **As** the bkit CI pipeline,
> **I want** all invariant gates to pass after v2.1.13 sync,
> **so that** the release pipeline can proceed to tag + npm publish.

**Acceptance Criteria**:
- `scripts/docs-code-sync.js` 8-count + BKIT_VERSION 0 drift
- `scripts/check-quality-gates-m1-m10.js` M1-M10 catalog 통과
- `tests/contract/v2113-sprint-contracts.test.js` 8/8 PASS
- `scripts/check-domain-purity.js` 12 files / 0 forbidden imports

---

## 4. Functional Requirements (9 Features)

| FR ID | Feature | Description | Acceptance |
|---|---|---|---|
| **FR-F0** | baseline-verify | 실측 component count + 메모리 정합성 분석 | `docs/03-analysis/v2113-baseline-count.analysis.md` 생성, 6 measurement source 명시 |
| **FR-F1** | version-bump | BKIT_VERSION 5-loc invariant 2.1.12 → 2.1.13 (8 edits) | `node scripts/docs-code-sync.js` Exit 0 + `claude plugin validate .` Exit 0 |
| **FR-F2** | changelog-v2113 | CHANGELOG.md `## [2.1.13]` 신규 섹션 (~250 LOC) | Added (Sprint Mgmt) + Added (4 UX sub-sprints) + Changed (14 skill cross-refs) + Removed (-2333 LOC) + Fixed (root-fixes + CARRY closures) + Verified (CC v2.1.139 94-streak) 모두 포함 |
| **FR-F3** | readme-core | README.md badge + architecture table + Sprint section + CC v2.1.123 권장 | 실측 number 반영 + Sprint Management section line 58-79 검증 + v2.1.123 권장 명시 |
| **FR-F4** | readme-full | README-FULL.md v2.1.13 section + Architecture 표 + lib subdirs + ENH closures (~150 LOC) | v2.1.13 GA inventory 완결 + 기존 v2.1.11/v2.1.12 history 보존 |
| **FR-F5** | customization-ainative | CUSTOMIZATION-GUIDE.md + AI-NATIVE-DEVELOPMENT.md v2.1.12 → v2.1.13 | 2 file edits, ~30 LOC, Sprint = AI-Native primitive 명시 검토 |
| **FR-F6** | bkit-system-graph | bkit-system/_GRAPH-INDEX.md + 4 components overview + philosophy/pdca + scenarios + triggers (~250 LOC) | Obsidian [[wiki-link]] integrity 통과 + 15 task 모두 적용 |
| **FR-F7** | hooks-commands | hooks/hooks.json + hooks/session-start.js + commands/bkit.md final pass | 1-2 file edits, hooks 시작 메시지 + bkit help v2.1.13 정확 |
| **FR-F8** | docs-archive | docs/ legacy archive (~80 파일 git mv) + `/pdca cleanup` | whitelist 통과 후 `docs/archive/2026-05/` 이동, `.pdca-status.json` stale 0건 |
| **FR-F9** | real-use-validation | `/sprint init/start/status/qa/iterate/report/archive` 실 사용 + gap-detector + report | Sprint 8-phase 완주 + S1 ≥ 85% + gap-detector ≥ 90% + report lessons ≥ 5 |

---

## 5. Non-Functional Requirements

| NFR | Requirement | Measurement |
|---|---|---|
| **Performance** | 총 turn ≤ 25 + token budget ≤ 1M | `.bkit/runtime/token-ledger.ndjson` cumulative |
| **Quality** | M1 matchRate ≥ 90% + M8 sprint matchRate ≥ 85% | gap-detector + sprint-qa-flow |
| **Security** | F8 archive = `git mv` (history 보존) + dry-run preview, no `rm -rf` | git log retains, `git status` 검증 |
| **Reliability** | F9-120 closure 9-streak 유지 (`claude plugin validate .` Exit 0) | CLI 직접 실행 |
| **Observability** | Audit log `ACTION_TYPES.master_plan_created` + 4 auto-pause triggers 발화 시 audit | `.bkit/audit/audit-log.ndjson` |
| **Cost** | ENH-292 caching 회귀 mitigation: Sequential dispatch 강제 | sprint-orchestrator ENH-292 패턴 준수 |
| **Backward Compat** | v2.1.12 사용자 영향 0 | invariant — 기존 PDCA 9-phase + 모든 skill/agent 호환 |
| **Language** | docs/ Korean / README+CHANGELOG+skills/agents English | CLAUDE.md 원칙 준수, 단일 파일 mixing 금지 |

---

## 6. Success Criteria (8건, master plan §10 동기화)

| # | Criterion | 검증 방법 | Owner |
|---|---|---|---|
| 1 | docs-code-sync.js 0 drift PASS | `node scripts/docs-code-sync.js` Exit 0 + 8-count match | F1 + F6 |
| 2 | `claude plugin validate .` Exit 0 | F9-120 closure 9-streak | F1 |
| 3 | BKIT_VERSION 5-loc 모두 2.1.13 | §2.4 표 8 location grep `2\.1\.13` 모두 hit | F1 |
| 4 | 활성 문서 영역 grep `2\.1\.12` 0건 | 보관 영역 제외 grep | F1 + F2~F7 |
| 5 | /sprint qa S1 ≥ 85% | sprint-qa-flow 결과 | F9 |
| 6 | /pdca cleanup stale 0건 | `.bkit/state/pdca-status.json` stale features 0 | F8 |
| 7 | gap-detector ≥ 90% | sprint-qa-flow 또는 gap-detector 단독 | F9 |
| 8 | Final report lessons learned ≥ 5건 | sprint-report-writer 결과 markdown | F9 |

---

## 7. Out-of-Scope (v2.1.14+ Carry)

- CARRY-13: `lib/` 142 모듈 `@version 2.1.12 → 2.1.13` bulk update
- CARRY-14: 121/142 lib modules `legacy` layer Clean Architecture 완전 이전 (Sprint F-1)
- CARRY-15: CC v2.1.140+ 신규 사이클 cc-version-analysis
- CARRY-16: Sprint Management 자체 enhancement (`/sprint export`, `/sprint diff` 등)
- CARRY-17: bkit-evals 28 eval set sprint eval 신규 추가

---

## 8. Stakeholders

| Stakeholder | Interest | Influence |
|---|---|---|
| **kay (maintainer)** | v2.1.13 GA release readiness, memory baseline 갱신, 본 sprint 결과 검토 후 commit/push | HIGH |
| **신규 bkit 사용자** | README 정확성, Sprint Management onboarding | MEDIUM |
| **Sprint 베타 사용자** | 본 sprint working example reference | MEDIUM |
| **CI 시스템** | docs-code-sync + plugin validate + contract test 통과 | HIGH (gate) |
| **Anthropic CC team** | Plugin marketplace metadata 정확성 | LOW (간접) |
| **POPUP STUDIO 외부 사용자** | bkamp showcase / community examples | LOW |

---

## 9. Beachhead

**최우선 사용자 segment**: bkit v2.1.12 활성 사용자 (Sprint 기능 모름) + v2.1.13 신규 설치 사용자.

본 sprint 완료로:
- 신규 설치 사용자가 5분 내 Sprint Management 이해 + 첫 sprint init 시도
- 기존 v2.1.12 사용자가 `/sprint init`을 발견하고 자신의 multi-feature 묶음에 적용 시도

---

## 10. GTM (Go-to-Market) Trigger

본 sprint 완료 후:
1. v2.1.13 GA tag (사용자 별도 지시)
2. GitHub Release notes (CHANGELOG v2.1.13 섹션 자동 변환)
3. npm publish (사용자 별도 지시)
4. bkamp / X (Twitter) 공지 (선택)

---

## 11. Pre-mortem Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| F8 archive 살아있는 carryover 오삭제 | MEDIUM | HIGH | Whitelist 사전 확정 + `git mv` (revert 가능) + 최종 사용자 검토 게이트 |
| `/sprint` 자체 결함 발견 → 본 sprint 중단 | MEDIUM | HIGH | Trust L4 + 각 phase QA gate, 결함 발견 시 lessons learned 기록 + 별도 hotfix track carry |
| CHANGELOG v2.1.13 항목 누락 | MEDIUM | MEDIUM | Master plan §2.1 commit 흐름 표 cross-reference + F2 verification step |
| ENH-292 caching 10x 회귀 | MEDIUM | MEDIUM | Sequential dispatch 강제, parallel sub-agent spawn 최소화 |
| Component count drift (메모리 vs 실측) | HIGH | MEDIUM | F0 baseline-verify 결과 우선, 모든 문서 실측 source 명시 |
| F1 verification Exit ≠ 0 | LOW | HIGH | 즉시 pause + 사용자 alert, rollback skill로 checkpoint 복원 |

---

## 12. Battle Card (vs status quo)

| 차원 | 현재 (Do nothing) | 본 sprint 후 |
|---|---|---|
| Onboarding | README v2.1.12 + Sprint section 단절 | README v2.1.13 + Sprint Management 명시 + CC v2.1.123 권장 |
| CI | BKIT_VERSION mismatch 위험 누적 | 5-loc invariant + 8-count drift 0 |
| Marketplace | `claude plugin install bkit` v2.1.12 받음 | v2.1.13 정상 배포 |
| docs/ | 89+ legacy 누적 (검색 비효율) | docs/archive/2026-05/ 정리 (활성 영역만 검색) |
| Sprint UX | working example 부재 | 본 sprint = reference implementation |

---

## 13. Test Scenarios (Sprint QA gate에서 검증)

| Scenario | Input | Expected | Layer |
|---|---|---|---|
| TS-1 | `claude plugin validate .` | Exit 0 | L1 invariant |
| TS-2 | `node scripts/docs-code-sync.js` | Exit 0 + 8-count match | L1 invariant |
| TS-3 | `grep -rn "2\\.1\\.12" --include="*.md" --include="*.json" \| grep -v "memory/\|docs/archive/\|docs/03-analysis\|docs/04-report\|docs/05-qa\|docs/00-pm\|CHANGELOG.md\|docs/adr"` | 0 lines | L1 grep |
| TS-4 | `npx node tests/contract/v2113-sprint-contracts.test.js` | 8/8 PASS | L3 contract |
| TS-5 | `/sprint init v2113-docs-sync` 실행 | `.bkit/state/sprints/v2113-docs-sync.json` 생성 | L2 integration |
| TS-6 | `/sprint qa v2113-docs-sync` 실행 | S1 score ≥ 85% | L2 integration |
| TS-7 | gap-detector 실행 | matchRate ≥ 90% | L2 integration |
| TS-8 | `/sprint report` 실행 | report.md 생성 + lessons ≥ 5 | L2 integration |

---

**End of PRD**
