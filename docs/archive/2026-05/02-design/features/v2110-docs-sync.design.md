---
template: design
version: 1.3
feature: v2110-docs-sync
date: 2026-04-22
author: kay kim
project: bkit-claude-code
version_bkit: 2.1.10
---

# v2110-docs-sync Design Document

> **Summary**: Plan FR-01~FR-13 전량을 100% 충족하는 7 파일군 동기화 설계. Option C (Pragmatic Targeted Additions) 권장. 3-batch 분할 + per-batch CI 검증 + Session Guide 15 modules. Canonical 수치 128 Lib / 15 subdirs / 47 Scripts 확정.
>
> **Project**: bkit-claude-code
> **Version**: 2.1.10
> **Author**: kay kim
> **Date**: 2026-04-22
> **Status**: Draft
> **Planning Doc**: [v2110-docs-sync.plan.md](../../01-plan/features/v2110-docs-sync.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A (문서 작업) |
| Phase 2 | Coding Conventions | CLAUDE.md 참조 ✅ |
| Phase 3 | Mockup | N/A |
| Phase 4 | API Spec | N/A |

---

## Context Anchor

> Plan Context Anchor 그대로 이식 (Design→Do 핸드오프 유지).

| Key | Value |
|-----|-------|
| **WHY** | Sprint 0~7 공개 문서 드리프트 해소 — Docs=Code 원칙 + main 머지·태깅 전제 |
| **WHO** | 신규 사용자 / 외부 기여자 / 엔터프라이즈 평가자 / Claude Code runtime |
| **RISK** | (R1) 영문 파일 한국어 혼입, (R2) Lib 127/128 drift → **128 canonical 확정** / (R5) 대량 컨텍스트 과부하 → 3-batch 분할 |
| **SUCCESS** | 7 파일군 실측(39/36/128/47/15) 반영 + 4 신규 섹션 + `docs-code-sync` PASS + grep legacy 0-match |
| **SCOPE** | Batch 1: README + CHANGELOG + hooks (3 files) / Batch 2: bkit-system 10 files / Batch 3: CUSTOMIZATION + AI-NATIVE + commands (3 files) |

---

## 1. Overview

### 1.1 Design Goals

1. Plan FR-01~FR-13 전체 충족 (13/13 = 100%)
2. `docs-code-sync.js` CI PASS 보장 (8-count + 5-location BKIT_VERSION invariant 0-drift)
3. 실측 canonical 수치 일관성 유지: **Skills 39 / Agents 36 / Lib 128 / Lib subdirs 15 / Scripts 47 / Hook Events 21 / Hook Blocks 24 / MCP Tools 16 / MCP Servers 2 / Templates 18 / Output Styles 4 / Test files 113 / TC 3,762 / BKIT_VERSION 2.1.10**
4. Docs=Code SSoT 원칙 확립: bkit-system에서 version history 삭제 → CHANGELOG 단일 SoT
5. 기존 파일 톤·구조 80% 이상 보존 (대규모 rewrite 최소화)
6. 3-batch 실행 + per-batch CI 검증으로 R5(컨텍스트 과부하) + R2(수치 drift) 완화

### 1.2 Design Principles

- **Edit over Rewrite**: 기존 파일 구조 보존, 필요한 위치에만 추가·수정
- **Single Source of Truth**: bkit.config.json = BKIT_VERSION SSoT, CHANGELOG.md = version history SoT, MEMORY.md = internal architecture SoT
- **Idempotent Verification**: 각 batch 종료 시 `node scripts/docs-code-sync.js` 멱등 실행으로 0-drift 확인
- **Historic Preservation**: 기존 `> **v1.x**:` blockquote는 DO NOT TOUCH (v2.1.9 Plan §5.2 정책 계승)
- **Language Safety**: 대상 파일에 한국어 유입 금지 (8-lang trigger list 제외, docs/ 제외)
- **Sprint 7 Accuracy**: MEMORY.md "127 Lib"는 off-by-one → scanner 로직(walk recursive)에 따른 실측 128 사용

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

Plan Option C (Full Architecture Docs Refresh) 채택 하에, Design-level 구현 전략 3안을 비교.

| Criteria | Option A: Minimal Edit | Option B: Clean Rewrite | Option C: Pragmatic Targeted (Recommended) |
|----------|:-:|:-:|:-:|
| **Approach** | 수치만 in-place Edit | bkit-system 전면 재작성 | 구조 보존 + 타깃 추가·수정 |
| **New Sections** | 0 | 20+ | 6 (Clean Arch / D-in-D / Contract / Orchestrator / SSoT / v2.1.10 Features) |
| **Modified Files** | 15 | 15 | 15 |
| **Lines Delta** | ~400 | ~2,500 | ~1,800 |
| **FR Coverage** | FR-01, FR-11, FR-12 only (3/13) | 13/13 (over-engineered) | **13/13** |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Low (doc drift risk 재발) | High | High |
| **Effort** | ~2h | ~14h | ~8h |
| **Risk** | R6 재발 (v1.x blockquote 오염 위험) | R5 컨텍스트 과부하 + 톤 일관성 상실 | **Low** (per-batch CI 검증) |
| **Recommendation** | 급한 hotfix용 | 장기 문서 레거시 청산 | **Default — Plan Option C에 최적 매핑** |

**Selected**: **Option C — Pragmatic Targeted Additions**

**Rationale**: Plan에서 이미 "Full Architecture Docs Refresh" (scope-level Option C)를 선택했다. Design-level에서 Option B(Clean Rewrite) 채택 시 scope가 Plan 범위를 초과하여 R5(컨텍스트 과부하) 현실화 우려가 크다. Option A는 FR-02~FR-07 (Clean Architecture / Defense-in-Depth / Invocation Contract / Orchestrator 섹션 신설) 자체가 누락되어 Plan FR 범위를 충족할 수 없다. **Option C는 기존 파일 톤을 보존(Design Principle §1.2)하면서도 FR 13건 전체를 충족하는 유일한 경로**이다.

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                v2110-docs-sync Edit Orchestration                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Canonical SoT              Target Files                            │
│   ──────────────             ───────────────                         │
│                                                                      │
│   [1] bkit.config.json  ──→  BKIT_VERSION = 2.1.10                   │
│       (SSoT)                                                         │
│                                                                      │
│   [2] scanner.measure()  ──→  Skills 39 / Agents 36 / Lib 128 /      │
│       (실측 canonical)         Scripts 47 / Hook 21/24 / MCP 2/16    │
│                                                                      │
│   [3] CHANGELOG.md       ──→  Version history (bkit-system 제거 후    │
│       (history SoT)           유일한 경로)                           │
│                                                                      │
│   [4] MEMORY.md          ──→  Architecture snapshot → Report 참조     │
│       (internal SoT)                                                 │
│                                                                      │
│         ↓                                                            │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Batch 1: README.md + CHANGELOG.md + hooks/                 │   │
│   │     → 수치 정정 + v2.1.10 What's New + 내부 일관성           │   │
│   │     → CI: docs-code-sync PASS 확인                          │   │
│   │                                                              │   │
│   │  Batch 2: bkit-system/ (10 files)                           │   │
│   │     → README: version history 제거 → CHANGELOG 링크          │   │
│   │     → ASCII diagrams v2.1.10 재작성                         │   │
│   │     → components/*.md: 실측 수치 전수 갱신                   │   │
│   │     → CI: docs-code-sync PASS 확인                          │   │
│   │                                                              │   │
│   │  Batch 3: CUSTOMIZATION + AI-NATIVE + commands/bkit.md      │   │
│   │     → Component Inventory v2.1.10 재작성                    │   │
│   │     → Clean Arch + Defense-in-Depth + Contract + Orch 섹션  │   │
│   │     → CI: docs-code-sync PASS (최종)                        │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow (Edit Pipeline)

```
Plan Canonical Numbers → Edit Tool (per file)
                      → per-batch docs-code-sync.js 실행
                      → grep legacy pattern 0-match 검증
                      → 다음 batch 진행
                      → 최종: gap-detector (Check phase)
                      → Match Rate ≥ 90% → Report
                      → Match Rate < 90% → pdca-iterator (max 5)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Batch 1 (README/CHANGELOG/hooks) | Canonical numbers (scanner.measure()) | 수치 정정의 진실원 |
| Batch 2 (bkit-system/) | Batch 1 완료 + CHANGELOG.md 링크 | CHANGELOG 링크 삽입 시 CHANGELOG 정합 필요 |
| Batch 3 (CUSTOMIZATION/AI-NATIVE/commands) | Batch 1 + Batch 2 완료 | 상호 참조 링크 정합성 |
| Verification (docs-code-sync.js) | Batch 1/2/3 edits | 8-count + BKIT_VERSION invariant 검증 |
| gap-detector (Check) | 전 batch 완료 | Design vs 실제 수정 Match Rate 산정 |

---

## 3. Data Model

### 3.1 Canonical Numbers Schema

```typescript
// v2.1.10 Canonical Architecture Inventory (runtime-measured 2026-04-22)
interface CanonicalInventory {
  // Public surface (docs-code-sync CI gate)
  skills: 39;              // count of skills/*/SKILL.md
  agents: 36;              // 13 opus / 21 sonnet / 2 haiku
  hookEvents: 21;          // hooks.json top-level keys
  hookBlocks: 24;          // sum of array entries across all events
  mcpServers: 2;           // bkit-pdca, bkit-analysis
  mcpTools: 16;            // bkit_* named tools across servers

  // Internal implementation (excluded from CI gate, but doc-synced)
  libModules: 128;         // find lib -name "*.js" (recursive, includes 3 top-level)
  libSubdirs: 15;          // audit / cc-regression / context / control / core /
                           // domain / infra / intent / orchestrator / pdca /
                           // qa / quality / task / team / ui
  libLOC: ~27085;          // find lib -name "*.js" -exec cat | wc -l
  scripts: 47;             // scripts/*.js
  testFiles: 113;          // qa-aggregate subject count (broader find gives 229)
  totalTC: 3762;           // PASS 3760 / FAIL 0 / Expected 2

  // Feature surface
  templates: 18;           // templates/*.md (incl. pipeline/)
  outputStyles: 4;         // output-styles/*.md
  contextForkSkills: 9;    // ENH-202: phase-1~8 (7) + qa-phase + skill-status

  // Versioning
  bkitVersion: "2.1.10";   // bkit.config.json → SSoT
  ccRecommended: "v2.1.117+"; // 75 consecutive compatible
  ccMinimum: "v2.1.78+";

  // v2.1.10 新概念
  cleanArchLayers: 4;      // Domain + Application + Infrastructure + Presentation
  domainPorts: 6;          // cc-payload / state-store / regression-registry /
                           // audit-sink / token-meter / docs-code-index
  domainGuards: 4;         // ENH-254/262/263/264
  guardRegistry: 21;       // lib/cc-regression/registry.js
  defenseInDepthLayers: 4; // CC Built-in → bkit PreToolUse → audit-logger → Token Ledger
  contractAssertions: 226; // L1 (94) + L4 (132) CI-gated
  contractL2TC: 98;        // l2-smoke.test.js
  contractL3TC: 42;        // l3-mcp-runtime.test.js (real stdio spawn)
  contractL5Scenarios: 5;  // test/e2e/run-all.sh
  orchestratorModules: 5;  // intent-router / next-action-engine / team-protocol /
                           // workflow-state-machine / index
  skillTriggerPatterns: 15; // Sprint 7 G-J-01 (4 → 15)
  matchRateSSoT: 90;       // Sprint 7 G-P-01 (100 → 90)
  enterpriseTeammates: 6;  // Sprint 7 G-T-03 (5 → 6)
  bkitVersion5Location: ["bkit.config.json", ".claude-plugin/plugin.json",
                         "README.md", "CHANGELOG.md", "hooks/hooks.json"];
}
```

### 3.2 Target File Classification

| # | File | Batch | Primary Change Type | FR Coverage |
|---|------|:-----:|---------------------|-------------|
| 1 | `README.md` | 1 | Numeric fix + v2.1.10 What's New rewrite + Clean Arch / D-in-D / Contract refs | FR-01, FR-02, FR-03, FR-04 |
| 2 | `CHANGELOG.md` | 1 | Internal consistency fix (L36↔L62) | FR-09 |
| 3 | `hooks/hooks.json` | 1 | Read-only verify (description="v2.1.10", 24 blocks) | (Verification) |
| 4 | `hooks/session-start.js` | 1 | Read-only verify (BKIT_VERSION dynamic lookup) | (Verification) |
| 5 | `bkit-system/README.md` | 2 | Version history 제거 + CHANGELOG 링크 + ASCII 재작성 + Component table 갱신 | FR-01, FR-06 |
| 6 | `bkit-system/_GRAPH-INDEX.md` | 2 | v2.1.10 Box 추가 + Clean Arch 노드 | FR-02 |
| 7 | `bkit-system/philosophy/context-engineering.md` | 2 | Layer 구조 v2.1.10 (Domain/Infra/App/Pres) 반영 | FR-02 |
| 8 | `bkit-system/philosophy/core-mission.md` | 2 | Docs=Code CI + Defense-in-Depth 언급 보강 | FR-03 |
| 9 | `bkit-system/philosophy/ai-native-principles.md` | 2 | Light numeric + v2.1.10 reference | FR-01 |
| 10 | `bkit-system/philosophy/pdca-methodology.md` | 2 | Light numeric refresh | FR-01 |
| 11 | `bkit-system/components/skills/_skills-overview.md` | 2 | 39 skills + 9 context:fork | FR-01 |
| 12 | `bkit-system/components/agents/_agents-overview.md` | 2 | 36 agents (13/21/2 split) | FR-01 |
| 13 | `bkit-system/components/hooks/_hooks-overview.md` | 2 | 21 events / 24 blocks | FR-01 |
| 14 | `bkit-system/components/scripts/_scripts-overview.md` | 2 | 47 scripts | FR-01 |
| 15 | `bkit-system/triggers/trigger-matrix.md` | 2 | 15 skill triggers (Sprint 7 SKILL_TRIGGER_PATTERNS) | FR-05 |
| 16 | `bkit-system/triggers/priority-rules.md` | 2 | Light verify, Sprint 7 priority (feature > skill > agent) | FR-05 |
| 17 | `CUSTOMIZATION-GUIDE.md` | 3 | Component Inventory v2.1.10 + Clean Arch + Contract + Orchestrator 섹션 | FR-01, FR-02, FR-04, FR-05 |
| 18 | `AI-NATIVE-DEVELOPMENT.md` | 3 | Context Engineering Layers v2.1.10 + 3-Layer Orchestration | FR-01, FR-05 |
| 19 | `commands/bkit.md` | 3 | v2.1.10 Features 테이블 신설 + Agents 36 반영 | FR-07, FR-08 |

**Total**: 19 target files (Plan의 "~15 files" 대비 정밀화 — bkit-system이 10 files + hooks/ read-only 2 = 15 edit + 2 verify + 2 others).

---

## 4. API Specification

N/A — 문서 작업은 HTTP API 변경 없음. 대신 "Verification API" 정의:

### 4.1 Verification Commands

| Command | Purpose | Expected Output |
|---------|---------|-----------------|
| `node scripts/docs-code-sync.js` | 8-count + BKIT_VERSION invariant | Exit 0, "0 drift" |
| `grep -rn "101 modules\|43 scripts\|11 subdirs\|32 agents\|38 skills" README.md CUSTOMIZATION-GUIDE.md AI-NATIVE-DEVELOPMENT.md commands/bkit.md bkit-system/` | Legacy count detection | 0 matches (historic blockquote `> **v1.x**:` 제외) |
| `grep -rn "[가-힣]" README.md CUSTOMIZATION-GUIDE.md AI-NATIVE-DEVELOPMENT.md commands/bkit.md bkit-system/` (bkit-system trigger lists 제외) | Korean leakage detection | 0 matches |
| `node scripts/check-guards.js` | 21 guards integrity | All PASS |
| `find lib -name "*.js" -type f \| wc -l` | Lib module canonical | 128 |

---

## 5. UI/UX Design

N/A — 문서 작업. 단, Obsidian Graph View 호환성 유지:

### 5.1 Obsidian Graph Preservation

- `[[link]]` Wiki syntax 보존
- `.obsidian/` 폴더 건드리지 않음
- `bkit-system/_GRAPH-INDEX.md`에 v2.1.10 노드 추가 시 기존 edge 보존

### 5.4 Doc Completeness Checklist (per-file)

#### `README.md` (Batch 1)
- [ ] Badge: `Version-2.1.10-green.svg`
- [ ] L41: Lib table row "128 Lib Modules (~27,085 LOC) across 15 subdirs"
- [ ] L103~106: 실측 수치 (39 Skills, 36 Agents, 128 Lib, 47 Scripts, 113 test files, 3,762 TC)
- [ ] What's New 최상위 bullet: v2.1.10 Integrated Enhancement
- [ ] Clean Architecture 4-Layer 언급 (What's New 내부)
- [ ] Defense-in-Depth 4-Layer 언급 (What's New 내부)
- [ ] Invocation Contract L1~L5 + 226 assertions 언급
- [ ] 3-Layer Orchestration 언급 (Sprint 7)
- [ ] BKIT_VERSION 5-location SSoT 언급

#### `CHANGELOG.md` (Batch 1)
- [ ] L36 "Changed" 블록 수치 Sprint 6 완료 스냅샷으로 명시 + Sprint 7 최종 footnote 추가
- [ ] L62 Architecture Snapshot "128 Lib" (기존 "127" 정정)
- [ ] v2.1.10 섹션 전체 내부 수치 일관성 복원
- [ ] v2.1.9 이하 read-only zone 보호 확인

#### `bkit-system/README.md` (Batch 2)
- [ ] Version history 섹션 (v1.4.0~v2.0.6 blockquotes) 제거
- [ ] "See [CHANGELOG.md](../CHANGELOG.md) for full version history" 단일 링크 치환
- [ ] Trigger System ASCII "v2.1.10" 버전 반영
- [ ] Component Summary 테이블: 39/36/128/47/21/18/4/2 반영
- [ ] v1.5.1 Features 박스 → v2.1.10 Features 재작성
- [ ] Component Counts (v2.1.5) 박스 → v2.1.10 재작성
- [ ] Lib subdir list: 11 → 15 (audit, cc-regression, context, control, core, domain, infra, intent, orchestrator, pdca, qa, quality, task, team, ui)
- [ ] Layer 5 "Scripts: 43 modules" → "47 modules"
- [ ] v2.1.10 신규 개념 Quick Links 4개 (Clean Arch, D-in-D, Contract, Orchestrator)

#### Other bkit-system files (Batch 2)
- [ ] `_GRAPH-INDEX.md`: v2.1.10 Integrated Enhancement 박스 + Clean Architecture 노드
- [ ] `philosophy/context-engineering.md`: Layer 구조에 Domain/Infra/Application/Presentation 반영
- [ ] `philosophy/core-mission.md`: Docs=Code에 docs-code-sync CI 언급
- [ ] `components/*-overview.md`: 실측 수치 전수 갱신

#### `CUSTOMIZATION-GUIDE.md` (Batch 3)
- [ ] Component Inventory (v2.1.9) → (v2.1.10)
- [ ] lib/ tree: 11 subdirs → 15 subdirs 확장 (domain, infra, cc-regression, orchestrator 추가)
- [ ] Library Module Structure ASCII 재작성
- [ ] Context Engineering Architecture v2.1.10 갱신
- [ ] Clean Architecture Approach §7.3 v2.1.10 4-Layer 반영
- [ ] 새 섹션: "v2.1.10 Integrated Enhancement" (Clean Arch + D-in-D + Contract + Orchestrator)
- [ ] Plugin Structure Example skills/scripts 수치 정정

#### `AI-NATIVE-DEVELOPMENT.md` (Batch 3)
- [ ] Context Engineering Architecture v2.1.9 → v2.1.10
- [ ] "39 Skills + 36 Agents" 유지, "101 modules" → "128 modules"
- [ ] 3-Layer Orchestration 다이어그램 추가
- [ ] Clean Architecture 4-Layer 언급 (AI-Native Principle 4: Human Oversight)

#### `commands/bkit.md` (Batch 3)
- [ ] "v2.1.10 Features" 섹션 신설 (Clean Arch / D-in-D / Contract / Orchestrator / Guard Registry / BKIT_VERSION)
- [ ] Agents 테이블: "21" → "36" 또는 위임 링크 ("See bkit-system/components/agents/_agents-overview.md")
- [ ] PDCA 섹션 수치 일관성 확인

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| E-SYNC-01 | "docs-code-sync reports drift" | 수치 drift 미해소 | 해당 파일 재Edit 후 재실행 |
| E-SYNC-02 | "Korean leaked in English file" | 8-lang trigger 외 한국어 유입 | 해당 라인 영문 치환 |
| E-SYNC-03 | "Legacy pattern matched" | "101 modules" 등 구패턴 잔존 | 정정 |
| E-SYNC-04 | "CHANGELOG v2.1.9 zone touched" | 보호 구역 수정 | 수정 revert |
| E-SYNC-05 | "Link broken after edit" | 참조 링크 깨짐 | 링크 수정 |

### 6.2 Error Recovery Strategy

- **Per-batch rollback**: Batch 실패 시 해당 batch 파일만 `git checkout -- <files>`로 revert, Plan/Design 유지 상태에서 재실행
- **Incremental verification**: 각 파일 Edit 직후 해당 파일만 `grep` 검증
- **CI-driven**: 최종 `docs-code-sync.js` PASS 전까지는 Do 미완료로 판정

---

## 7. Security Considerations

- [ ] 비밀 정보 유출 없음 (문서만 수정)
- [ ] `.env`, `.bkit/runtime/`, `.bkit/state/` 파일 건드리지 않음
- [ ] **Defense-in-Depth 4-Layer 문서화 정확성**: README/CUSTOMIZATION-GUIDE에 Layer 1~4 기술 시 v2.1.9 security-architecture.md와 일치 확인
- [ ] 외부 링크 정합성 (GitHub Issues #51234, #51798, #51801 등) 검증

---

## 8. Test Plan (v2.3.0)

> 문서 동기화의 검증은 **grep 기반 정적 검증 + docs-code-sync CI 검증** 두 축.

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| T1: Canonical Count Verification | 8-count drift | `node scripts/docs-code-sync.js` | Do(per-batch) + Check |
| T2: BKIT_VERSION Invariant | 5-location sync | `scanVersions()` (built-in) | Check |
| T3: Legacy Pattern Detection | 구수치 잔존 검출 | `grep -rn` (FR-13) | Check |
| T4: Korean Leakage Detection | 한글 유입 검출 | `grep -rn "[가-힣]"` | Check |
| T5: Link Integrity | 내부/외부 링크 | `markdown-link-check` 또는 manual | Check |
| T6: Plan FR Matrix Coverage | 13 FR × file matrix | gap-detector agent | Check |

### 8.2 T1: Canonical Count Verification (Per-Batch CI Gate)

| # | Test | Expected | Notes |
|---|------|:--------:|-------|
| 1 | Run after Batch 1 | 0 drift | README + CHANGELOG 수치 확정 확인 |
| 2 | Run after Batch 2 | 0 drift | bkit-system 전체 수치 정합 |
| 3 | Run after Batch 3 | 0 drift | 최종 CI gate PASS |
| 4 | `scanVersions().mismatches.length` | 0 | BKIT_VERSION 5-location |
| 5 | `measure().skills === 39` | true | SKILL.md count |
| 6 | `measure().agents === 36` | true | agents/*.md count |
| 7 | `measure().hookEvents === 21` | true | hooks.json keys |
| 8 | `measure().hookBlocks === 24` | true | hooks.json entries sum |
| 9 | `measure().mcpServers === 2` | true | servers/* dirs |
| 10 | `measure().mcpTools === 16` | true | bkit_* names |
| 11 | `measure().libModules === 128` | true | walk(lib) |
| 12 | `measure().scripts === 47` | true | scripts/*.js |

### 8.3 T3: Legacy Pattern Detection (Final Check)

| # | Pattern | Target Files | Expected |
|---|---------|-------------|---------|
| 1 | `101 modules` | README / CUSTOMIZATION / AI-NATIVE / commands / bkit-system (exclude `> **v1.x**:`) | 0 matches |
| 2 | `43 scripts` | 위 동일 | 0 matches |
| 3 | `11 subdirs` or `12 subdirs` | 위 동일 | 0 matches |
| 4 | `32 agents` | 위 동일 | 0 matches |
| 5 | `38 skills` | 위 동일 | 0 matches |
| 6 | `123 Lib` or `127 Lib` | 위 동일 + CHANGELOG v2.1.10 section | 0 matches in v2.1.10 section (v2.1.9 이하 preserve OK) |
| 7 | `BKIT_VERSION 2.1.9` in v2.1.10 context | 위 동일 | 0 matches |

### 8.4 T4: Korean Leakage Detection

| # | Target | Expected |
|---|--------|---------|
| 1 | `README.md` | 0 Korean lines |
| 2 | `CHANGELOG.md` | 0 new Korean lines (기존 v2.1.10 Korean은 release discipline 블록만 허용 — 기존 합의) |
| 3 | `CUSTOMIZATION-GUIDE.md` | 0 Korean |
| 4 | `AI-NATIVE-DEVELOPMENT.md` | 0 Korean |
| 5 | `commands/bkit.md` | 0 Korean (헤더 triggers 리스트는 영문 키워드 섹션에 한국어 포함 OK) |
| 6 | `bkit-system/*.md` | 0 Korean (Obsidian vault 전체 영어) |
| 7 | `docs/` (본 Plan/Design/Analysis/Report) | Korean 허용 — CLAUDE.md 예외 |

### 8.5 T6: Plan FR Matrix Coverage (Check Phase gap-detector)

| FR | Description | Verification |
|----|-------------|--------------|
| FR-01 | 실측 수치 반영 | T1 + T3 |
| FR-02 | Clean Architecture 섹션 | `grep -l "Clean Architecture 4-Layer" README.md CUSTOMIZATION-GUIDE.md AI-NATIVE-DEVELOPMENT.md` = 3 files |
| FR-03 | Defense-in-Depth 섹션 | `grep -l "Defense-in-Depth" README.md CUSTOMIZATION-GUIDE.md AI-NATIVE-DEVELOPMENT.md` = 3 files |
| FR-04 | Invocation Contract 섹션 | `grep -l "Invocation Contract" README.md CUSTOMIZATION-GUIDE.md bkit-system/README.md` = 3 files |
| FR-05 | 3-Layer Orchestration 섹션 | `grep -l "3-Layer Orchestration\|lib/orchestrator" bkit-system/README.md CUSTOMIZATION-GUIDE.md` = 2 files |
| FR-06 | bkit-system version history 제거 | `grep -c "v1.4.0:\|v1.5.0:\|v2.0.0:" bkit-system/README.md` = 0 |
| FR-07 | commands/bkit.md v2.1.10 Features 섹션 | `grep -c "v2.1.10 Features" commands/bkit.md` ≥ 1 |
| FR-08 | Agents 테이블 36 반영 | `grep "36 agents\|36 Agents" commands/bkit.md` ≥ 1 |
| FR-09 | CHANGELOG 내부 일관성 | L36과 L62 수치 일치 or footnote로 명시적 구분 |
| FR-10 | Lib canonical 128 | T1 #11 |
| FR-11 | 영어 전용 | T4 |
| FR-12 | docs-code-sync PASS | T1 |
| FR-13 | grep legacy 0-match | T3 |

### 8.6 Seed Data Requirements

None — 문서 작업은 실행 환경 seed 불필요.

---

## 9. Clean Architecture (Docs Edition)

### 9.1 Layer Structure (for v2.1.10 Documentation)

| Layer | Responsibility | Files |
|-------|---------------|-------|
| **SSoT (Source of Truth)** | Canonical version + architecture inventory | `bkit.config.json`, `MEMORY.md`, scanner.measure() |
| **Changelog (History)** | Version evolution narrative | `CHANGELOG.md` |
| **Public (Entry)** | User-facing 1차 진입점 | `README.md` |
| **Reference (Depth)** | 상세 reference / 커스터마이즈 | `CUSTOMIZATION-GUIDE.md`, `AI-NATIVE-DEVELOPMENT.md` |
| **Architecture (Graph)** | Obsidian vault, 컴포넌트 참조 | `bkit-system/` (10 files) |
| **Runtime (Invocation)** | Claude Code runtime entry | `commands/bkit.md`, `hooks/hooks.json` |

### 9.2 Dependency Rules

```
┌──────────────────────────────────────────────────────────────┐
│                  Docs Dependency Direction                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  SSoT (bkit.config.json + scanner.measure())                 │
│       ↑                                                       │
│       │                                                       │
│  CHANGELOG.md (version history SoT)                          │
│       ↑                                                       │
│       │                                                       │
│  README.md ──→ bkit-system/ (링크)                            │
│   ↑  │        ↑                                               │
│   │  │        │                                               │
│   │  └→ CUSTOMIZATION-GUIDE.md                               │
│   │        └→ bkit-system/ (링크)                             │
│   │                                                           │
│   └→ AI-NATIVE-DEVELOPMENT.md                                │
│           └→ bkit-system/philosophy/ (링크)                   │
│                                                              │
│  commands/bkit.md ── (isolated) ── bkit-system/components/   │
│                                                              │
│  Rule: SSoT/CHANGELOG는 상위 — 수정 시 다른 파일 영향 주의     │
│        bkit-system은 version history 보유 금지 (CHANGELOG 참조)│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 File Import Rules (Docs Level)

| From | Can Reference | Cannot Duplicate |
|------|---------------|------------------|
| README.md | CHANGELOG.md / bkit-system / CUSTOMIZATION-GUIDE | version history (CHANGELOG SoT) |
| bkit-system/README.md | CHANGELOG.md (link only) | version history (v2110-docs-sync로 제거) |
| CUSTOMIZATION-GUIDE.md | bkit-system / plugin source paths | version history (CHANGELOG SoT) |
| AI-NATIVE-DEVELOPMENT.md | bkit-system/philosophy (link) | architectural counts (scanner SoT) |
| commands/bkit.md | bkit-system/components (link) | agents 전체 목록 (bkit-system/components/agents SoT) |

### 9.4 This Feature's Layer Assignment

| File | Layer | Change Principle |
|------|-------|------------------|
| `README.md` | Public | Clean Arch / D-in-D / Contract 언급 (링크로 위임) |
| `CHANGELOG.md` | Changelog | Sprint 별 스냅샷 명시, 내부 일관성 우선 |
| `bkit-system/README.md` | Architecture | version history 제거 → CHANGELOG 참조 |
| `CUSTOMIZATION-GUIDE.md` | Reference | Component Inventory + Clean Arch 상세 |
| `AI-NATIVE-DEVELOPMENT.md` | Reference | 방법론 관점 + 3-Layer Orchestration |
| `commands/bkit.md` | Runtime | v2.1.10 Features 테이블 신설 |

---

## 10. Coding Convention Reference

### 10.1 Markdown Conventions (본 작업 준수)

| Target | Rule | Example |
|--------|------|---------|
| Section header | 기존 파일 depth 보존 | `##` top-level, `###` sub |
| Code fence | triple backtick + lang hint | ` ```typescript`, ` ```bash`, ` ```json` |
| Table header | pipe `|` + separator `|---|` | 기존 파일 style 모방 |
| Link | relative path 선호 | `[CHANGELOG](../CHANGELOG.md)` |
| Historic blockquote | `> **vX.Y.Z**:` format 보존 | DO NOT TOUCH |
| Emoji | 사용자 요청 없으면 금지 | (사용자 요청 없음) |

### 10.2 Language Rule (CLAUDE.md 준수)

```markdown
# English (default) for:
- README.md, CHANGELOG.md, CUSTOMIZATION-GUIDE.md, AI-NATIVE-DEVELOPMENT.md, commands/bkit.md
- bkit-system/ (Obsidian vault 전체)
- hooks/, scripts/, lib/, agents/, skills/, templates/

# Korean (docs/ 예외) for:
- docs/00-pm/, 01-plan/, 02-design/, 03-analysis/, 04-report/, 05-qa/ (본 Plan/Design 포함)
- .bkit/state/memory.json 설명
- 8-language trigger lists in agents/skills frontmatter (Korean keyword 포함)
```

### 10.3 Canonical Number Cross-Reference

| Number | Source | Documentation Use |
|--------|--------|-------------------|
| 39 Skills | scanner.countSkills() | README, CUSTOMIZATION, AI-NATIVE, commands, bkit-system |
| 36 Agents | scanner.countAgents() | 위 동일 |
| 128 Lib modules | walk(lib) | 위 동일 (단, CI gate는 제외) |
| 15 Lib subdirs | ls lib/ (subdirs only) | CUSTOMIZATION, bkit-system |
| 47 Scripts | scanner.countScripts() | 위 동일 |
| 21 Hook Events / 24 Blocks | scanner.countHooks() | 위 동일 |
| 2 MCP Servers / 16 Tools | scanner.countMCP*() | 위 동일 |
| 18 Templates | ls templates/*.md (recursive) | 주요 문서 |
| 4 Output Styles | ls output-styles/ | 주요 문서 |
| 113 Test files | qa-aggregate subject | CHANGELOG, bkit-system |
| 3,762 TC | qa-aggregate PASS total | CHANGELOG |
| BKIT_VERSION 2.1.10 | bkit.config.json | 5-location |

---

## 11. Implementation Guide

### 11.1 File Structure

```
# v2110-docs-sync Implementation Scope

Project Root/
├── README.md                              # Batch 1
├── CHANGELOG.md                           # Batch 1
├── CUSTOMIZATION-GUIDE.md                 # Batch 3
├── AI-NATIVE-DEVELOPMENT.md               # Batch 3
├── commands/bkit.md                       # Batch 3
├── hooks/
│   ├── hooks.json                         # Batch 1 (read-only verify)
│   └── session-start.js                   # Batch 1 (read-only verify)
└── bkit-system/                           # Batch 2
    ├── README.md                          # Major rewrite
    ├── _GRAPH-INDEX.md                    # Additions
    ├── philosophy/
    │   ├── context-engineering.md         # Layer update
    │   ├── core-mission.md                # Light
    │   ├── ai-native-principles.md        # Light
    │   └── pdca-methodology.md            # Light
    ├── components/
    │   ├── skills/_skills-overview.md     # Numeric
    │   ├── agents/_agents-overview.md     # Numeric
    │   ├── hooks/_hooks-overview.md       # Numeric
    │   └── scripts/_scripts-overview.md   # Numeric
    └── triggers/
        ├── trigger-matrix.md              # Sprint 7 15 skills
        └── priority-rules.md              # Light
```

### 11.2 Implementation Order

1. [ ] **Batch 1 Start**: README.md (가장 가시성 높음, SSoT)
2. [ ] CHANGELOG.md (내부 일관성)
3. [ ] hooks/hooks.json + session-start.js (verify only)
4. [ ] **Batch 1 CI gate**: `node scripts/docs-code-sync.js` 실행 → PASS 확인
5. [ ] **Batch 2 Start**: bkit-system/README.md (major rewrite — version history 제거)
6. [ ] bkit-system/_GRAPH-INDEX.md + philosophy/* (5 files)
7. [ ] bkit-system/components/* (4 files)
8. [ ] bkit-system/triggers/* (2 files)
9. [ ] **Batch 2 CI gate**: `node scripts/docs-code-sync.js` 실행 → PASS 확인
10. [ ] **Batch 3 Start**: CUSTOMIZATION-GUIDE.md
11. [ ] AI-NATIVE-DEVELOPMENT.md
12. [ ] commands/bkit.md
13. [ ] **Final CI gate**: `node scripts/docs-code-sync.js` + grep 검증 + T3/T4 실행
14. [ ] gap-detector (Check phase) 실행 → Match Rate 산정
15. [ ] Match Rate < 90%이면 pdca-iterator 자동 실행 (max 5)

### 11.3 Session Guide

> Auto-generated from Design structure. 본 작업은 컨텍스트 과부하 리스크(R5) 완화를 위해 3-batch 분할 필수.

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| Batch 1 — Top-level docs | `batch-1` | README + CHANGELOG + hooks verify | 10-15 |
| Batch 2 — bkit-system/ | `batch-2` | 10 files (major: README rewrite) | 15-20 |
| Batch 3 — Ecosystem docs | `batch-3` | CUSTOMIZATION + AI-NATIVE + commands/bkit | 10-15 |
| Check — gap-detector | `check` | Match Rate + iterate decision | 5-10 |
| Iterate — pdca-iterator | `iterate` | Auto-fix (if matchRate < 90%) | 5-10 |
| Report | `report` | 완료 보고서 | 3-5 |

#### Recommended Session Plan (본 세션 기준)

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| 1 (완료) | Plan | 전체 | ~10 |
| 2 (현재) | Design | 전체 | ~8 |
| 3 (예정) | Do `batch-1` + `batch-2` + `batch-3` | 통합 실행 | 30-50 |
| 4 | Check + Iterate | 전체 | 10-20 |
| 5 | Report | 전체 | 5 |

> **Autonomous Mode**: 사용자 요청 "design → do → iterate 100%"에 따라 본 Design 완료 직후 통합 Do (Batch 1+2+3) 즉시 개시. Checkpoint 3+4 통합 confirm 후 중단 없이 진행.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-22 | Initial draft — Option C Pragmatic Targeted Additions 채택, 3-batch 설계, canonical 128 Lib 확정 | kay kim |
