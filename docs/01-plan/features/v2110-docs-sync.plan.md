---
template: plan
version: 1.3
feature: v2110-docs-sync
date: 2026-04-22
author: kay kim
project: bkit-claude-code
version_bkit: 2.1.10
---

# v2.1.10 Documentation Synchronization Planning Document

> **Summary**: v2.1.10 Sprint 0~7 대대적 변경(Clean Architecture 4-Layer + Defense-in-Depth 4-Layer + Invocation Contract 226 assertions + 3-Layer Orchestration)을 README/CHANGELOG/bkit-system/CUSTOMIZATION-GUIDE/AI-NATIVE-DEVELOPMENT/commands/hooks 전 공개 문서에 동기화하고, 실측 수치(39/36/128/47/15 subdirs)로 정정하며, bkit-system version history를 CHANGELOG SSoT로 통합한다.
>
> **Project**: bkit-claude-code
> **Version**: 2.1.10 (branch: `feat/v2110-integrated-enhancement`)
> **Author**: kay kim
> **Date**: 2026-04-22
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | v2.1.10 구현(Sprint 0~7)은 완료되었으나 공개 문서(README/bkit-system/CUSTOMIZATION-GUIDE/AI-NATIVE-DEVELOPMENT/commands)가 v2.1.9 이전 상태에 정체되어 Docs=Code 원칙 위반. 6 가지 치명적 드리프트 확인 — (1) Lib module 수치 불일치(문서 101~123 vs 실측 128), (2) Lib subdirs 11 표기(실제 15), (3) Clean Architecture 4-Layer 전혀 언급 없음, (4) Defense-in-Depth 4-Layer 공식화 미반영, (5) Invocation Contract L1~L5 + 226 assertions 기록 누락, (6) Sprint 7 `lib/orchestrator/` 3-Layer Orchestration 완전 누락. |
| **Solution** | Option C Full Architecture Docs Refresh 채택. 7 파일군을 대상으로 (a) 실측 수치 정정(모든 파일), (b) v2.1.10 신규 개념 4종(Clean Architecture / Defense-in-Depth / Invocation Contract / 3-Layer Orchestration) 아키텍처 섹션 신설, (c) bkit-system/ ASCII 다이어그램 v2.1.10 재작성, (d) bkit-system/README.md version history 제거 + CHANGELOG SSoT 통합(Docs=Code 원칙 최대화), (e) commands/bkit.md v2.1.10 섹션 신설, (f) CHANGELOG 내부 불일치(L36 ↔ L62) 정정. 총 7 파일군 / ~15 개 파일 / 예상 delta ~1,800 lines. |
| **Function/UX Effect** | (1) 신규 사용자가 README/CUSTOMIZATION-GUIDE만 읽고도 v2.1.10 아키텍처(Clean Arch + Defense-in-Depth + Contract + Orchestration) 이해 가능. (2) `/bkit` 실행 시 v2.1.10 features 노출. (3) Docs=Code CI(`scripts/docs-code-sync.js`) 8개 수치 카운트 0-drift 유지. (4) Obsidian Graph View로 bkit-system 탐색 시 v2.1.10 아키텍처 시각화 정합. |
| **Core Value** | Docs=Code 3대 철학 복원. 외부 기여자·신규 사용자·엔터프라이즈 평가자가 공개 문서만 읽고도 v2.1.10 설계 의도·아키텍처·보안 계층을 정확히 파악 가능. main 머지 전 문서 결손 해소로 `git tag v2.1.10` + GitHub Release Notes 작업 전제 조건 충족. |

---

## Context Anchor

> Executive Summary 기반 5-key 요약. Design/Do/Analysis 문서에 전파.

| Key | Value |
|-----|-------|
| **WHY** | Sprint 0~7 구현 완료 후 공개 문서의 v2.1.10 드리프트 해소 — Docs=Code 원칙 및 main 머지·태깅 전제 조건 |
| **WHO** | 신규 사용자(README 1차 진입) / 외부 기여자(bkit-system + CUSTOMIZATION-GUIDE) / 엔터프라이즈 평가자(AI-NATIVE-DEVELOPMENT) / Claude Code runtime(commands/bkit.md + hooks/) |
| **RISK** | (1) 대량 문서 수정 중 CI `docs-code-sync.js` 위반(수치 drift), (2) 번역되어선 안 되는 기존 영문 파일에 한국어 혼입(CLAUDE.md 위반), (3) bkit-system version history 삭제 시 과거 역사 맥락 손실 — CHANGELOG 링크로 완화 |
| **SUCCESS** | 7 파일군 모두 v2.1.10 실측 수치(39/36/128/47/15 subdirs) 반영 + 신규 개념 4종 섹션 존재 + `node scripts/docs-code-sync.js` PASS + bkit-system version history 제거 완료 + commands/bkit.md v2.1.10 features 섹션 신설 + grep으로 "101 modules"/"43 scripts"/"11 subdirs" 0-match(historic blockquote 제외) |
| **SCOPE** | Phase 1: Gap Audit(병렬 Explore 3-agent) → Phase 2: Design(3 architecture options 제시) → Phase 3: Do(파일군별 순차 edit + 즉시 CI 검증) → Phase 4: Check(`docs-code-sync` + grep 기반 gap analysis) → Phase 5: Report |

---

## 1. Overview

### 1.1 Purpose

v2.1.10 Sprint 0~7에서 수행된 구현 전량을 공개 문서 7 파일군에 동기화하여 Docs=Code 원칙을 회복하고, `git tag v2.1.10` + main 머지 + GitHub Release Notes 작업의 전제 조건을 충족한다. 특히 bkit-system/README.md의 v2.1.x 전체 누락(v2.0.6이 마지막)과 commands/bkit.md의 v2.1.10 섹션 부재가 핵심 Blocker이므로 이번 PDCA 사이클 내에서 일괄 해소한다.

### 1.2 Background

v2.1.10 branch(`feat/v2110-integrated-enhancement`)는 Plan-Plus §1~§21에 따라 Sprint 0~7을 완결하여 (a) Clean Architecture 4-Layer 11 domain + adapter modules, (b) Defense-in-Depth 4-Layer 보안 아키텍처 공식화, (c) Invocation Contract L1~L5 226 CI-gate assertions, (d) Sprint 7 `lib/orchestrator/` 3-Layer Orchestration 5 modules를 도입했다. 그러나 사용자 검수 결과 "대대적인 변경들을 했는데 … 문서가 제대로 동기화되지 않음"이 확인되었고, 실측 결과:

- `README.md` L41/L64/L103: Lib 수치 101~123 혼재(실측 128)
- `CHANGELOG.md` L36(Sprint 6 기준 123 Lib)과 L62(Sprint 7 최종 127) 내부 불일치
- `bkit-system/README.md`: v2.1.x entry 0건(v2.0.6이 최신), "101 modules/11 subdirs"로 정지, v2.1.10 신규 개념 4종 전무
- `CUSTOMIZATION-GUIDE.md`: v2.1.9 stub, 새 subdir 4종(domain/infra/cc-regression/orchestrator) 미언급
- `AI-NATIVE-DEVELOPMENT.md`: v2.1.9 reference, Sprint 7 0건
- `commands/bkit.md`: v2.1.10 섹션 자체 없음, Agent 수 21로 outdated(실측 36)

사용자가 Option C Full Architecture Docs Refresh + Option 3 Version History SSoT 통합을 선택하여 범위가 확정되었다.

### 1.3 Related Documents

- Upstream Plan: `docs/01-plan/features/bkit-v2110-gap-closure-plan-plus.plan.md` (§1~§21 Workflow Orchestration Integrity)
- Upstream Design: `docs/02-design/features/bkit-v2110-orchestration-integrity.design.md`
- Upstream Analysis: `docs/03-analysis/bkit-v2110-orchestration-integrity.analysis.md`
- Authoritative source: `MEMORY.md` v2.1.10 Release Status + Architecture section
- Docs=Code CI: `scripts/docs-code-sync.js`(8-count invariant), `lib/infra/docs-code-scanner.js`

---

## 2. Scope

### 2.1 In Scope

- [ ] **README.md** 전면 동기화 (v2.1.10 What's New bullet 갱신, L41/L64/L103 Lib 수치 정정, Clean Architecture/Defense-in-Depth/Contract/Orchestrator 언급 추가, 6-Layer Hook System 박스 v2.1.10 재작성)
- [ ] **CHANGELOG.md** v2.1.10 섹션 내부 일관성 복원 (L36 Changed 블록의 "123 Lib / 26,296 LOC / 46 Scripts"를 Sprint 7 최종값으로 정정 or 세분화)
- [ ] **bkit-system/** 전 파일 v2.1.10 재작성:
  - `README.md`: version history 섹션 제거 → "See CHANGELOG.md"로 치환, ASCII 다이어그램 v2.1.10 재작성, Component Summary 테이블 실측값(39/36/128/47/15 subdirs) 반영, v2.1.10 신규 개념 4종 상위 Quick Links 섹션 신설
  - `_GRAPH-INDEX.md`: v2.1.10 Box 추가, Clean Architecture 4-Layer 노드 추가
  - `philosophy/context-engineering.md`: Layer 구조 v2.1.10 (Domain/Infra/Application/Presentation 반영) 재작성
  - `philosophy/core-mission.md` / `philosophy/ai-native-principles.md` / `philosophy/pdca-methodology.md`: Docs=Code CI + Defense-in-Depth 언급 보강
  - `components/skills/_skills-overview.md`: 39 skills + 9 context:fork 반영
  - `components/agents/_agents-overview.md`: 36 agents (13 opus/21 sonnet/2 haiku) 반영
  - `components/hooks/_hooks-overview.md`: 21 events / 24 blocks 반영
  - `components/scripts/_scripts-overview.md`: 47 scripts 반영
  - `triggers/trigger-matrix.md` / `triggers/priority-rules.md`: 15 skill triggers (Sprint 7 G-J-01 SKILL_TRIGGER_PATTERNS 4→15) 반영
- [ ] **CUSTOMIZATION-GUIDE.md** Component Inventory header v2.1.9 → v2.1.10, ASCII 다이어그램 3종(lib subdirs 11→15 포함) 재작성, Clean Architecture / Defense-in-Depth / Invocation Contract / Orchestrator 섹션 신설, `lib/` tree 갱신(새 4 subdir 명시)
- [ ] **AI-NATIVE-DEVELOPMENT.md** Context Engineering Layers v2.1.9 → v2.1.10 갱신, "39 Skills + 36 Agents + 128 Lib modules" 정정, Clean Architecture 4-Layer Principle 추가, 3-Layer Orchestration 다이어그램 추가
- [ ] **commands/bkit.md** v2.1.10 Features 섹션 신설 (Clean Architecture / Defense-in-Depth / Invocation Contract / 3-Layer Orchestration / Guard Registry 21 / BKIT_VERSION 5-location SSoT), Agents 테이블 21 → 36 확장, Output Styles 등 기존 섹션 v2.1.10 numeric 정정
- [ ] **hooks/hooks.json** description 필드 `"bkit Vibecoding Kit v2.1.10 - Claude Code"` 유지 확인 + 24 blocks 수치 검증
- [ ] **hooks/session-start.js** BKIT_VERSION 동적 lookup(`lib/core/version.js`) 확인, hard-coded v2.1.9 등 잔재 제거 확인
- [ ] CHANGELOG 전체 유지 — 기존 v2.1.9 이하 섹션 수정 금지(역사 보존)

### 2.2 Out of Scope

- `docs/` directory 내부 문서 (한국어 및 PDCA 사이클 내부 문서, 본 Plan/Design/Analysis/Report 포함)
- 8-language auto-trigger keyword lists (agents/*.md, skills/*/SKILL.md frontmatter `Triggers:` 부분 — 한국어 등 비영문 유지)
- `.bkit/state/memory.json`(내부 상태 설명, 한국어 허용)
- `lib/` 실 소스 코드 수정 (이미 Sprint 7에서 완료된 구현)
- `scripts/` 실 Hook 스크립트 수정 (이미 v2.1.10 완료)
- `agents/` 및 `skills/` frontmatter/body 수정 (Sprint 7e에서 79건 @version 일괄 갱신 완료)
- `.claude-plugin/plugin.json` description 필드 (v2.1.9에서 이미 "39 Skills, 36 Agents, 21 Hook Events" 반영됨)
- `git tag v2.1.10` 및 GitHub Release Notes 작성 (본 Plan의 후속 작업, 48h 관측 이후)
- Translating existing English files to Korean or vice versa outside this plan's scope

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 7 파일군 모두 실측 수치(39 Skills / 36 Agents / 128 Lib modules / 47 Scripts / 15 lib subdirs / 21 Hook Events / 24 blocks / 16 MCP Tools / 2 MCP Servers / 18 Templates / 4 Output Styles / 113 test files / 3,762 TC) 반영 | High | Pending |
| FR-02 | README.md / CUSTOMIZATION-GUIDE.md / AI-NATIVE-DEVELOPMENT.md 3종에 Clean Architecture 4-Layer 섹션 신설 (Domain ports 6 + guards 4 + rules / Application cc-regression + pdca + team / Infrastructure cc-bridge + telemetry + docs-code-scanner / Presentation hooks + scripts) | High | Pending |
| FR-03 | README.md / CUSTOMIZATION-GUIDE.md / AI-NATIVE-DEVELOPMENT.md 3종에 Defense-in-Depth 4-Layer 섹션 유지·강화 (v2.1.9 ENH-254 재공식화 + v2.1.10 Token Ledger NDJSON Layer 4 추가) | High | Pending |
| FR-04 | README.md / bkit-system/README.md / CUSTOMIZATION-GUIDE.md에 Invocation Contract L1~L5 섹션 신설 (L1 contract baseline 94 JSON / L2 smoke 98 TC / L3 MCP stdio 42 TC / L4 CI gate 226 assertions / L5 E2E shell 5 scenarios) | High | Pending |
| FR-05 | bkit-system/README.md / CUSTOMIZATION-GUIDE.md에 Sprint 7 3-Layer Orchestration 섹션 신설 (`lib/orchestrator/` 5 modules: intent-router + next-action-engine + team-protocol + workflow-state-machine + index, SKILL_TRIGGER_PATTERNS 15 확장, matchRate SSoT 90, Trust Score level auto-reflect) | High | Pending |
| FR-06 | bkit-system/README.md에서 version history 섹션(v1.4.0~v2.0.6 열거) 제거 → "See [CHANGELOG.md](../CHANGELOG.md) for full version history" 단일 참조로 치환 | High | Pending |
| FR-07 | commands/bkit.md에 "v2.1.10 Features" 테이블 섹션 신설 (Clean Architecture / Defense-in-Depth / Invocation Contract / 3-Layer Orchestration / Guard Registry 21 / BKIT_VERSION 5-location SSoT) | High | Pending |
| FR-08 | commands/bkit.md "Core Agents" 테이블 11 → 실제 36 agents 전량 반영 또는 "See [bkit-system/components/agents/_agents-overview.md](../bkit-system/components/agents/_agents-overview.md)"로 위임 | Medium | Pending |
| FR-09 | CHANGELOG.md v2.1.10 섹션의 내부 수치 불일치(L36 "123 Lib, 26,296 LOC, 46 Scripts" ↔ L62 "127 Lib, ~27,000 LOC, 47 Scripts")를 정정 — Sprint 6 완료 시점과 Sprint 7 완료 시점을 분리 기술하거나, L36을 Sprint 7 최종값으로 통일 | High | Pending |
| FR-10 | 실측 기준 재확인: `find lib -name "*.js" -type f` = 128 (MEMORY.md "127" 값과 1건 차이 분석 필요 — top-level `import-resolver.js` + `permission-manager.js` + `skill-orchestrator.js` 3개 중 1건 누락 추정). 확정치를 모든 문서에 통일 적용 | High | Pending |
| FR-11 | 모든 수정 파일은 영어로 작성 (CLAUDE.md 규칙: `docs/` 및 8-lang triggers 제외 전부 영어). 본 Plan 문서는 `docs/01-plan/` 하위이므로 한국어 허용 | High | Pending |
| FR-12 | `node scripts/docs-code-sync.js` PASS — 8-count invariant (skills/agents/hookEvents/hookBlocks/mcpServers/mcpTools/libModules/scripts) + BKIT_VERSION 5-location invariant 0-drift | High | Pending |
| FR-13 | `grep -rn "101 modules\|43 scripts\|11 subdirs\|32 agents\|38 skills" README.md CUSTOMIZATION-GUIDE.md AI-NATIVE-DEVELOPMENT.md commands/bkit.md bkit-system/` = 0 matches (historic blockquote `> **v1.x**:` 제외 가능) | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Consistency | 7 파일군 간 v2.1.10 실측 수치 100% 동일 | `grep -rn "<count>"` 대조표, `docs-code-sync.js` 실행 |
| Traceability | 각 수정 파일에 "v2.1.10 Sprint 0~7" 또는 "v2.1.10 Integrated Enhancement" 출처 표기 | 커밋 메시지 + Edit diff 검증 |
| Maintainability | bkit-system version history 단일 지점화(CHANGELOG SSoT)로 차후 버전 업 시 중복 유지 제거 | 구조 변경 전후 bkit-system 수정 포인트 수 감소 측정 |
| Readability | 기존 문서 톤·구조 유지 (Edit 중심, Write 전면 재작성 최소화) | diff line count < 40% of original file size |
| i18n Safety | 영어 파일에 한국어 혼입 0건 (`docs/` 제외) | `grep -rn "[가-힣]" <target-files> | grep -v "docs/"` = 0 lines (8-lang trigger 제외) |
| CI Compliance | Docs=Code CI `contract-check.yml` PASS (`check-guards` 21 + `docs-code-sync` 0-drift + `check-deadcode` 0 Dead + `check-domain-purity` 0 violations) | GitHub Actions green |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 7 파일군 모두 Edit 완료 (README.md / CHANGELOG.md / bkit-system/ 10 files / CUSTOMIZATION-GUIDE.md / AI-NATIVE-DEVELOPMENT.md / commands/bkit.md / hooks/hooks.json)
- [ ] `node scripts/docs-code-sync.js` 실행 결과: 8-count invariant PASS + BKIT_VERSION 5-location PASS (0 drift)
- [ ] `grep -rn` 기반 legacy count 0 matches 확인 (FR-13)
- [ ] bkit-system/README.md version history 섹션 제거 확인 + CHANGELOG 참조 링크 작동 확인
- [ ] commands/bkit.md v2.1.10 Features 섹션 신설 확인
- [ ] CHANGELOG v2.1.10 L36 ↔ L62 내부 일관성 복원 확인
- [ ] gap-detector agent 분석 후 Match Rate ≥ 90% (Design vs 실제 수정 파일)
- [ ] 본 Plan을 참조하는 Report 문서(`docs/04-report/features/v2110-docs-sync.report.md`) 생성 완료

### 4.2 Quality Criteria

- [ ] `docs-code-sync.js` 8-count + BKIT_VERSION invariant 0 drift
- [ ] `grep -rn "[가-힣]"` on 영문 대상 파일 = 0 lines (8-lang trigger list 및 docs/ 제외)
- [ ] 각 수정 파일의 diff가 목적 외 영역(예: 무관한 공백 정리, 예제 코드 변경)을 포함하지 않음
- [ ] lint 에러 0건 (markdown lint — 해당 시)
- [ ] Readability 유지: 기존 파일의 섹션 순서 및 헤더 레벨 보존

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **R1**: 대량 Edit 중 실수로 영문 파일에 한국어 혼입 | High | Medium | 각 Edit 후 `grep -n "[가-힣]"` 즉시 실행, 8-lang trigger list는 protected zone 표기 |
| **R2**: `docs-code-sync.js` 8-count drift 발생(특히 Lib module 127 vs 128 차이) | High | Medium | FR-10에 따라 Do phase 진입 직전 `find lib -name "*.js" -type f` 재실행으로 canonical 수치 확정 + `lib/infra/docs-code-scanner.js` 로직 검토 |
| **R3**: bkit-system/README.md version history 제거로 과거 진화 맥락 손실 | Medium | Low | CHANGELOG 링크 명시 + "Evolution highlights" 1-paragraph 요약 박스 유지(v1.4.x → v2.0.x → v2.1.x 주요 변곡점만) |
| **R4**: CHANGELOG v2.1.10 L36 정정 시 과거 Sprint 5/6 merge 커밋과 충돌 | Medium | Low | L36을 "Sprint 5/6 스냅샷"으로 표기 명시 + "(Sprint 7 최종값은 Architecture Snapshot 블록 참조)" footnote 추가. 기존 텍스트 삭제 대신 컨텍스트 추가 접근 |
| **R5**: Option C 범위로 인한 컨텍스트 과부하(~1,800 lines delta) | High | High | Do phase를 3 batch로 분할: Batch 1 = README + CHANGELOG + hooks, Batch 2 = bkit-system 10 files, Batch 3 = CUSTOMIZATION-GUIDE + AI-NATIVE-DEVELOPMENT + commands/bkit.md. 각 Batch 종료 시 중간 `docs-code-sync` 실행 |
| **R6**: 실측 Lib 128 vs MEMORY 127 불일치 근본 원인 미규명 → 모든 문서에 틀린 숫자 반영 | High | Medium | Design phase에서 Do 직전 `find + wc -l` + `docs-code-scanner.js` 로직 재검증, `lib/orchestrator/` 포함 14 subdirs 각각의 모듈 수 개별 확인 |
| **R7**: 기존 v2.1.9 이하 CHANGELOG 섹션 실수 수정 | Medium | Low | Edit 시 v2.1.9 이하 라인 범위 접근 금지 규칙 준수, L147 `## [2.1.9]` 이하는 read-only zone 명시 |
| **R8**: Obsidian Graph View 호환성 파괴 | Low | Low | bkit-system/.obsidian/ 설정 파일 건드리지 않음, `[[link]]` Wiki 문법 유지 |

---

## 6. Impact Analysis

> **Purpose**: 이번 동기화 작업은 문서 전용이지만 Docs=Code CI와 `docs-code-scanner.js`가 실 런타임에 영향을 주므로 consumer 목록을 명시한다.

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `README.md` | Public-facing doc | L41/L64/L103 수치 정정, v2.1.10 What's New bullet 갱신, 6-Layer Hook System + v2.1.10 Architecture 섹션 신설 |
| `CHANGELOG.md` | Public-facing doc | v2.1.10 섹션 L36 ↔ L62 내부 불일치 정정, Sprint 7 orchestrator 블록 일관성 재배치 |
| `bkit-system/*.md` (10 files) | Architecture reference | version history 제거, ASCII 다이어그램 v2.1.10 재작성, Component tables 실측 반영, 신규 4개 개념 섹션 |
| `CUSTOMIZATION-GUIDE.md` | Customization reference | v2.1.9 → v2.1.10 header, Component Inventory 재작성, 신규 subdir 4종(domain/infra/cc-regression/orchestrator) 추가 |
| `AI-NATIVE-DEVELOPMENT.md` | Methodology doc | Context Engineering Layers v2.1.10 갱신, Clean Arch 4-Layer + 3-Layer Orchestration 섹션 추가 |
| `commands/bkit.md` | Command reference | v2.1.10 Features 섹션 신설, Agents 테이블 36 전량 or 위임, Output Styles + Features 테이블 numeric 정정 |
| `hooks/hooks.json` | Runtime config | description 필드 + 24 blocks 수치 검증 (read-only 검증 우선) |
| `hooks/session-start.js` | Runtime script | BKIT_VERSION 동적 lookup 검증 (read-only 검증 우선) |

### 6.2 Current Consumers

각 변경 리소스를 참조하는 기존 코드·CI·사용자 경로를 열거:

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| README.md | READ | GitHub 저장소 랜딩 페이지 + npm `bkit-claude-code` 패키지 페이지 + 사용자 직접 열람 | Non-breaking content update |
| CHANGELOG.md | READ | GitHub Release Notes 생성 + `scripts/docs-code-sync.js:scanVersions()` BKIT_VERSION scan 5 locations 중 1 | Non-breaking (단, BKIT_VERSION scan에서 예기치 않은 포맷 변경 주의) |
| bkit-system/README.md | READ | Obsidian vault entry + 개발자 아키텍처 학습 | Structure change (version history removed); link update required in other files if any pointed there |
| bkit-system/_GRAPH-INDEX.md | READ | Obsidian Graph View hub | Minor addition; no structural break |
| bkit-system/philosophy/*.md | READ | 방법론 학습용, CLAUDE.md에서 링크 | Content addition only |
| bkit-system/components/*.md | READ | 컴포넌트 레퍼런스 | Numeric update only |
| CUSTOMIZATION-GUIDE.md | READ | 포크/마켓플레이스 플러그인 제작 가이드 | Non-breaking content update |
| AI-NATIVE-DEVELOPMENT.md | READ | 방법론 학습, 블로그·외부 인용 | Non-breaking content update |
| commands/bkit.md | READ by Skill | `/bkit` 슬래시 명령 → Skill tool 호출 시 렌더링 | Content update (skill invocation path unchanged) |
| hooks/hooks.json | READ by CC runtime | 세션 시작 + Tool-Use 시점마다 파싱 | `description` 필드는 runtime 동작에 영향 없음. 구조 변경 없음 |
| hooks/session-start.js | EXECUTED | SessionStart hook 매 세션 | read-only 검증만 수행 (수정 안 함) |
| `scripts/docs-code-sync.js` (CI) | EXECUTE | GitHub Actions `contract-check.yml` | 본 작업 완료 후 PASS 필수 |
| `lib/infra/docs-code-scanner.js` | EXECUTE by CI | `scanCounts()` + `scanVersions()` | 정정된 수치와 일치해야 PASS |

### 6.3 Verification

- [ ] 모든 변경 리소스 참조 경로가 Edit 후에도 정상 작동 확인 (링크 깨짐 0건)
- [ ] `scripts/docs-code-sync.js` 실행 시 8-count 및 BKIT_VERSION invariant 0 drift
- [ ] bkit-system/README.md → CHANGELOG.md 새 링크 실제 존재 확인 (`../CHANGELOG.md`)
- [ ] `contract-check.yml` GitHub Actions PASS
- [ ] 8-language trigger list(agents/skills frontmatter)는 본 작업 범위 아니므로 read-only

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules | Fullstack apps | ☑ (문서 작업은 bkit 자체 = Dynamic 레벨 플러그인) |
| **Enterprise** | Strict layer separation | High-traffic MSA | ☐ |

bkit 플러그인 자체는 Dynamic 레벨에 해당하며, 본 동기화 작업은 코드 구조 변경 없이 문서만 수정하므로 레벨 재분류는 불필요하다.

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Sync Depth | A Minimal / B Numeric+Features / C Full Refresh | **C** | 사용자 명시 선택 — "대대적 변경 전체 심층 분석" |
| Version History SSoT | 1 Backfill / 2 Condensed / 3 Delete+Ref | **3** | 사용자 명시 선택 — Docs=Code SSoT 원칙 최대화 |
| Language | English / Korean | **English** | CLAUDE.md 규칙: public docs + code는 영어, docs/만 한국어 허용 |
| Edit vs Write | Edit (in-place) / Write (rewrite) | **Edit 우선, Write 제한** | 기존 톤·구조 보존 원칙 (NFR: Readability). bkit-system/README.md만 주요 Rewrite 대상 |
| Batching | 1-pass / 3-batch / per-file | **3-batch** | R5 완화: Batch 1(README+CHANGELOG+hooks), Batch 2(bkit-system), Batch 3(CUSTOMIZATION+AI-NATIVE+commands) |
| CI Verification | Each-file / Per-batch / End-only | **Per-batch** | R2 완화: 각 batch 종료 시 `docs-code-sync` 즉시 실행 |

### 7.3 Clean Architecture Approach (Docs Side)

```
Sync Architecture (v2.1.10 Documentation):

┌──────────────────────────────────────────────────────────┐
│  Source of Truth Hierarchy (Docs=Code SSoT)              │
├──────────────────────────────────────────────────────────┤
│  L1: bkit.config.json:version → BKIT_VERSION = 2.1.10    │
│  L2: CHANGELOG.md ← canonical version history            │
│  L3: MEMORY.md ← architecture snapshot (internal)        │
│  L4: README.md / CUSTOMIZATION / AI-NATIVE / commands    │
│      ← reference L1+L2+L3, never duplicate               │
│  L5: bkit-system/ ← architecture reference, links to L2  │
└──────────────────────────────────────────────────────────┘

Propagation:
  L1 → docs-code-scanner.scanVersions() → 5-location invariant
  L2 → bkit-system/README.md link (replaces embedded history)
  L3 → docs/04-report/ (Report phase references MEMORY)
  L4,L5 → all use L1 count + L2 history, zero-drift enforced
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md` (`.claude/CLAUDE.md`): 언어 규칙 명시 (한국어 대화, 영어 문서, docs/ 예외)
- [x] `bkit.config.json`: version SSoT 2.1.10
- [x] `lib/infra/docs-code-scanner.js`: 8-count + version invariant scanner 구현
- [x] `.github/workflows/contract-check.yml`: CI gate 구성 완료
- [x] ESLint (standard) + `scripts/check-domain-purity.js` 운영

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Numeric Convention** | 산발 (101/123/128 혼재) | canonical = 128 Lib (단, `docs-code-scanner.js` 로직 확인 후 확정) | High |
| **Version Reference** | bkit-system 내부 history(outdated) + CHANGELOG(canonical) 혼재 | CHANGELOG SSoT (bkit-system에서 제거) | High |
| **Section Header Casing** | 혼재 | 기존 파일 convention 준수 (README `##`, bkit-system `##`) | Low |
| **Historic Blockquote Policy** | v2.1.9 Plan에서 `> **v1.x**:` 역사 유지 정책 명시 | 동일 유지 — 본 Plan도 historic blockquote는 DO NOT TOUCH | High |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| — | — | — | ☐ (문서 작업에 env 불필요) |

### 8.4 Pipeline Integration

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Plan | 🔵 | `docs/01-plan/features/v2110-docs-sync.plan.md` | `/pdca plan` (현재) |
| Design | ⏳ | `docs/02-design/features/v2110-docs-sync.design.md` | `/pdca design v2110-docs-sync` |
| Do | ⏳ | (파일 Edit, 3-batch) | `/pdca do v2110-docs-sync` |
| Check | ⏳ | `docs/03-analysis/v2110-docs-sync.analysis.md` | `/pdca analyze v2110-docs-sync` |
| Report | ⏳ | `docs/04-report/features/v2110-docs-sync.report.md` | `/pdca report v2110-docs-sync` |

---

## 9. Next Steps

1. [ ] `/pdca design v2110-docs-sync` — 3 Architecture Options 제시 (Minimal Rewrite / Feature-Section Insertion / Full Rebuild) 및 파일별 delta 구체화, Session Guide(module 15개: file당 1 session) 생성
2. [ ] Design 단계에서 Lib 실측 수치(127 vs 128) 최종 확정 — `docs-code-scanner.js` 동작 역추적 필수
3. [ ] `/pdca do v2110-docs-sync --scope batch-1` (README + CHANGELOG + hooks) → `--scope batch-2` (bkit-system) → `--scope batch-3` (CUSTOMIZATION + AI-NATIVE + commands)
4. [ ] 각 batch 완료 후 `node scripts/docs-code-sync.js` 즉시 실행
5. [ ] `/pdca analyze v2110-docs-sync` — gap-detector agent로 Design vs 실제 수정 파일 Match Rate 측정
6. [ ] Match Rate < 90%이면 `/pdca iterate v2110-docs-sync` (max 5 iterations)
7. [ ] `/pdca report v2110-docs-sync` — 완료 보고서, GitHub Release Notes 초안 포함
8. [ ] 별건: main 머지 + `git tag v2.1.10` + GitHub Release (본 Plan 범위 아님, 48h 관측 이후)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-22 | Initial draft | kay kim |
