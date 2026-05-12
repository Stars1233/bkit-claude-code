# bkit v2.1.9 문서 전수 동기화 Plan

> **Status**: 📋 Plan (PDCA 재진입 — v2.1.9 shipping 직후 docs-sync)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.9
> **Branch**: `feat/v219-cc-v2116-response`
> **Author**: Main session (PDCA continuation from `/pdca qa cc-v2114-v2116-impact-analysis`)
> **Date**: 2026-04-21
> **Origin**: 사용자 요청 — "문서 전수 동기화 + gap 분석 100%"

---

## 1. 배경 및 목적

### 1.1 문제
- `cc-v2114-v2116-impact-analysis` ENH-263은 **active state 핵심 15 파일**만 정정
- root/bkit-system/hooks 전수 조사 결과 **26 파일 × 264 occurrence drift** 발견
- 아키텍처 다이어그램 / ASCII art / layer system 표기가 과거 숫자 (38/32/78/88/93/42 등) 잔존
- 사용자 요청: "100% 문서와 코드베이스 동기화"

### 1.2 범위 (대상 8개 최상위 경로)

사용자 명시 대상:
1. `bkit.config.json` — 이미 v2.1.9 ✅ (재검증만)
2. `.claude-plugin/` — 이미 v2.1.9 ✅ (재검증만)
3. `hooks/` — 현재 active 참조 없음 ✅ (재검증만)
4. `bkit-system/` — **10 파일 drift**
5. `CUSTOMIZATION-GUIDE.md` — **22 drift**
6. `CHANGELOG.md` — v2.1.9 entry **추가** 필요
7. `README.md` — **27 drift** (대부분 historic, active 다이어그램 3곳)
8. `AI-NATIVE-DEVELOPMENT.md` — **10 drift**

### 1.3 Baseline 실측 (v2.1.9, 2026-04-21)

| 항목 | 실측값 | 검증 방법 |
|------|-------|---------|
| Skills | **39** | `ls skills/` |
| Agents | **36** | `ls agents/*.md` |
| Scripts | **43** | `ls scripts/*.js` |
| Lib modules | **101** | `find lib -name '*.js'` |
| Lib subdirs | **11** | `ls -d lib/*/` → audit/context/control/core/intent/pdca/qa/quality/task/team/ui |
| Hook events | **21** | `hooks.json` keys |
| Templates | **18** | `ls templates/*.md` |
| Output styles | **4** | `ls output-styles/*.md` |
| MCP servers | **2** | `ls servers/` |
| BKIT_VERSION runtime | **2.1.9** | `lib/core/version.js` |

**중요 발견**: 여러 문서에 **`12 subdirectories` (`adapters` 포함) 표기** 존재 — **실측 11로 정정 필요**.

---

## 2. 구현 범위

### 2.1 수정 원칙

| 원칙 | 정책 |
|------|------|
| **Active state 100% 정확** | 다이어그램, 최신 overview, 컴포넌트 인벤토리 현재 숫자 일치 |
| **Historic records 보존** | `v1.5.x`, `v1.6.x`, `v2.0.x`, `v2.1.1~v2.1.7` release notes — 당시 수치 그대로 |
| **v2.1.9 entry 추가** | CHANGELOG/README/bkit-system 각 history 섹션에 v2.1.9 라인 삽입 |
| **언어 정책** | CLAUDE.md 준수: docs/ 한국어 유지, 나머지 영어 (8-lang trigger keyword 보존) |

### 2.2 수정 대상 파일별 범위

#### P0 (CRITICAL, active-state 직접 표시)

| # | 파일 | drift | 주 수정 항목 |
|---|------|:-----:|------------|
| 1 | `AI-NATIVE-DEVELOPMENT.md` | 5 active | "38 Skills" × 5곳 → 39, "93 modules, 12 subdirs" → "101 modules, 11 subdirs" (adapters 삭제) |
| 2 | `CUSTOMIZATION-GUIDE.md` | 10 active | Component Inventory (v2.1.8) → v2.1.9, 38/42/93 숫자 정정, ASCII 다이어그램 3곳 |
| 3 | `README.md` | 3 active | ASCII 다이어그램 "(38 Skills)/(42 Node.js)/93 modules" 3곳, "(93 modules across 12 subdirs)" 1곳, "v2.1.9 feature bullet" 신설 |
| 4 | `bkit-system/README.md` | 5 active | "v2.1.1 Architecture" 헤더 → v2.1.9, 38/42/93 정정, layer 시스템 다이어그램 3곳 |
| 5 | `bkit-system/_GRAPH-INDEX.md` | 5 active | "38 Skills/93 modules/42 scripts/12 subdirs" 정정 |
| 6 | `bkit-system/components/skills/_skills-overview.md` | 2 active | "v2.1.8" 헤더 → v2.1.9, v2.1.9 history entry 추가 |
| 7 | `bkit-system/components/hooks/_hooks-overview.md` | 3 active | "57 scripts" → 43, v2.1.9 entry 추가 |
| 8 | `bkit-system/components/scripts/_scripts-overview.md` | 4 active | 동 |
| 9 | `bkit-system/philosophy/core-mission.md` | 1 active | "38 Skills, 36 Agents, 21 Hook Events" → 39/36/21 |
| 10 | `bkit-system/philosophy/context-engineering.md` | 3 active | "42 Node.js hook scripts" → 43, "Domain Knowledge Layer (38 Skills)" × 2 → 39 |

#### P1 (MEDIUM, history 섹션 업데이트)

| # | 파일 | 작업 |
|---|------|------|
| 11 | `CHANGELOG.md` | `[2.1.9]` 엔트리 추가 (최상단, v2.1.8 위) |
| 12 | `README.md` | "Features" 목록에 v2.1.9 불릿 신설 |

#### P2 (재검증 only, 이미 최신)

| # | 파일 | verdict |
|---|------|:------:|
| 13 | `bkit.config.json` | version=2.1.9 ✅ (재확인) |
| 14 | `.claude-plugin/plugin.json` | version=2.1.9, description "39 Skills, 36 Agents, 21 Hook Events" ✅ |
| 15 | `.claude-plugin/marketplace.json` | description "39 Skills, 36 Agents, 43 Scripts, 21 Hook Events" ✅ |
| 16 | `hooks/hooks.json`, `hooks/session-start.js`, `hooks/startup/session-context.js` | active 참조 없음 ✅ |
| 17 | `bkit-system/components/agents/_agents-overview.md` | v2.1.9 entry 이미 존재 (line 5) ✅ |

#### P3 (DO NOT TOUCH — historic release notes)

- `> **v1.5.x / v1.6.x / v2.0.x / v2.1.1~v2.1.7**` blockquote 라인 — 당시 수치 보존
- `bkit-system/triggers/trigger-matrix.md:6` "v1.6.0: 28 skills, 21 agents" — 당시 기록
- CHANGELOG.md의 기존 `[2.0.6]`, `[1.5.9]` 등 historic entries 전부

---

## 3. 수정 디테일 (Before → After 매트릭스)

### 3.1 AI-NATIVE-DEVELOPMENT.md (5 edits)

| Line | Before | After |
|:----:|--------|-------|
| 17 | `CONTEXT["...<br/>38 Skills"]` | `CONTEXT["...<br/>39 Skills"]` |
| 145 | `Domain Knowledge (38 Skills) ──┐` | `Domain Knowledge (39 Skills) ──┐` |
| 186 | `Skill System (38 skills)` → `Domain-specific knowledge (18 Workflow / 18 Capability / 1 Hybrid)` | `Skill System (39 skills)` / 분포는 정밀 재확인 후 |
| 188 | `lib/ (93 modules, ~620+ functions) / 12 subdirectories: core, pdca, intent, task, team, ui, audit, control, quality, adapters, context, qa` | `lib/ (101 modules, 11 subdirectories: audit/context/control/core/intent/pdca/qa/quality/task/team/ui)` |
| 195 | `bkit v2.0.0 Context Engineering Layers` | `bkit v2.1.9 Context Engineering Layers` |
| 196 | `Domain Knowledge   │ 38 Skills` | `Domain Knowledge   │ 39 Skills` |

### 3.2 CUSTOMIZATION-GUIDE.md (10 edits)

| Line | Before | After |
|:----:|--------|-------|
| 115 | `Layer 5: Scripts             → ... (42 scripts)` | `(43 scripts)` |
| 180 | `### Component Inventory (v2.1.8)` | `(v2.1.9)` |
| 271 | `(38 Skills)` | `(39 Skills)` |
| 286 | `L5: Scripts (42 Node.js modules)` | `(43 Node.js modules)` |
| 323 | `bkit Component Architecture (v2.1.8)` | `(v2.1.9)` |
| 326 | `Skills (38)      │ Domain expertise` | `Skills (39)      │ Domain expertise` |
| 332 | `Hooks + Scripts (42)` | `Hooks + Scripts (43)` |
| 336 | `lib/ (93 modules)` | `lib/ (101 modules)` |
| 384 | `Layer 5: Scripts (42 Node.js scripts)` | `(43 Node.js scripts)` |
| 808 | `agents/ (36 total, ...) / skills/ (38 skills)` | `skills/ (39 skills)` |
| 818 | `scripts/ (42 scripts)` | `(43 scripts)` |

### 3.3 README.md (4 edits + 1 insertion)

| Line | Before | After |
|:----:|--------|-------|
| ~294 | `lib/ (93 modules across 12 subdirs)` | `lib/ (101 modules across 11 subdirs)` |
| Features ASCII/table | v2.1.9 bullet 최상단 신설 | 4-ENH 요약 + ENH-264/265 선이행 note |

### 3.4 bkit-system/README.md (5 edits)

| Line | Before | After |
|:----:|--------|-------|
| 45 | `v2.1.1: 38 skills, 36 agents, 21 hook events, 84 lib modules (12 subdirs), 42 scripts` | keep historic + add v2.1.9 above |
| 80 | `(38 Skills)   │  │   (36 Agents)    │  │(12 subdirs)` | `(39 Skills) / (11 subdirs)` |
| 95 | `L5: Scripts (42 Node.js modules)` | `(43)` |
| 250 | `Lib \| 12 subdirectories, 93 modules \| Shared utilities \| 607 exports` | `11 subdirectories, 101 modules` |
| 273 | `Layer 6: Lib Modules  → 12 subdirectories, 93 modules` | `11 subdirectories, 101 modules` |
| 363 | `bkit's 38 skills, 36 agents, 42 scripts` | `39 skills, 36 agents, 43 scripts` |

### 3.5 bkit-system/_GRAPH-INDEX.md (5 edits)

| Line | Before | After |
|:----:|--------|-------|
| 118 | `Domain Knowledge (38 Skills)` | `(39 Skills)` |
| 120 | `State Management (lib/common) → 93 modules, ~620+ exports` | `101 modules` (exports 삭제 — 실측 어려움) |
| 430 | `scripts/ - 42 scripts` | `43 scripts` |
| 431 | `lib/ - 12 subdirectories, 93 modules` | `11 subdirectories, 101 modules` |

### 3.6 bkit-system/philosophy/context-engineering.md (3 edits)

| Line | Before | After |
|:----:|--------|-------|
| 49 | `L5: Scripts ─→ 42 Node.js hook scripts` | `43 Node.js hook scripts` |
| 123 | `## Domain Knowledge Layer (38 Skills)` | `(39 Skills)` |
| 127 | `Domain Knowledge Layer (38 Skills)` | `(39 Skills)` |

### 3.7 bkit-system/philosophy/core-mission.md (1 edit)

| Line | Before | After |
|:----:|--------|-------|
| 151 | `destructive operation detection, 38 Skills, 36 Agents, 21 Hook Events` | `39 Skills, 36 Agents, 21 Hook Events` |

### 3.8 bkit-system/components/*-overview.md

- `_skills-overview.md:3` — "39 Skills defined in bkit (v2.1.8)" → "(v2.1.9)" + add v2.1.9 history entry above v2.1.8
- `_scripts-overview.md` — v2.1.9 history entry 추가
- `_hooks-overview.md` — v2.1.9 history entry 추가

### 3.9 CHANGELOG.md (1 new entry)

최상단 `## [2.1.8]` 위에 `## [2.1.9] - 2026-04-21` entry 신설:
- ENH-253/254/259/263 요약
- ENH-264/265 선이행 (Positive Drift)
- ENH-270 `@version 1.6.0` in lib/ 0건 달성
- 74 consecutive compatible releases (v2.1.115 skipped)
- Shipping readiness QA: Match Rate 100% / Coverage 90.3% / P0 Blocker 0

---

## 4. 수락 기준 (Done Definition)

- [ ] P0 10 파일 active-state 100% 업데이트
- [ ] P1 CHANGELOG v2.1.9 entry 추가 + README v2.1.9 feature bullet
- [ ] P2 3 파일 재검증 (pass-through)
- [ ] Gap 재검증 (grep): **active state에 "38 Skills", "32 Agents", "88 Lib", "93 modules", "42 scripts", "12 subdirectories" 잔존 0건** (historic blockquote 제외)
- [ ] historic release notes 무손상 (`> **v1.x.x**` / `> **v2.0.x**` / `> **v2.1.1~v2.1.7**`)
- [ ] 8-language trigger keyword 무수정
- [ ] `lib/core/version.js` runtime BKIT_VERSION === "2.1.9" (이미 PASS)
- [ ] 하위 문서 연결 링크 깨짐 없음

---

## 5. 공수

| Phase | 파일 수 | 예상 Edit | 공수 |
|-------|:------:|:---------:|:----:|
| Do (active-state 수정) | 10 | ~40 | 45min |
| Do (history 섹션 + v2.1.9 entry) | 3 | 5 | 20min |
| Check (grep 재검증 + ENH-263 확장) | — | — | 10min |
| Report | 1 | — | 15min |
| **Total** | **13** | **~45** | **~1.5h** |

---

## 6. 의존성 및 순서

```
Step 1 (Plan 저장, 현재) 
  ↓
Step 2 (Design 생성) 
  ↓
Step 3 (P0 10 파일 일괄 Edit: replace_all + point edits)
  ↓
Step 4 (CHANGELOG v2.1.9 entry + README v2.1.9 bullet)
  ↓
Step 5 (Gap 재검증: grep "38 Skills|42 scripts|93 modules|12 subdirectories" → 0 in active)
  ↓
Step 6 (Report, Match Rate 100% 선언)
```

---

## 7. 리스크

| 리스크 | 가능성 | 영향 | 완화 |
|--------|:-----:|:---:|------|
| historic blockquote 잘못 수정 | M | M | 선정된 블록만 targeted Edit, historic quotes는 "Changelog" 원칙 명시 |
| ASCII 다이어그램 정렬 깨짐 | M | L | Read → 정렬 유지하며 숫자만 치환 |
| Mermaid diagram 문법 파괴 | L | M | `<br/>` 유지, text만 치환 |
| bkit-system obsidian 내부 링크 | L | L | 링크 대상 이름 동일 유지 |

---

## 8. 관련 문서

- **Prior**: `docs/01-plan/features/cc-v2114-v2116-impact-analysis.plan.md` (ENH-263 15파일)
- **Design (다음 단계)**: `docs/02-design/features/bkit-v219-docs-sync.design.md`
- **Shipping Report**: `docs/05-qa/cc-v2114-v2116-shipping-readiness.report.md` (baseline 실측치 출처)

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | v2.1.9 shipping 직후 26 파일 × 264 occurrence의 문서-코드 drift 잔존. Plan ENH-263이 15 파일만 커버, 나머지 11 파일 잔존. |
| **Solution** | 8개 경로 전수 조사 → active/historic 분리 → active 10 파일 정정 + CHANGELOG/README v2.1.9 entry 추가 + historic 보존. |
| **Function UX Effect** | 사용자가 `/skills`/`/agents`/README/bkit-system 어디를 봐도 "39 Skills / 36 Agents / 43 Scripts / 101 Lib / 21 Hooks" 단일 진실원 제공. Obsidian graph 재구성 시에도 정확한 수치. |
| **Core Value** | Docs=Code 원칙 100% 준수 — ENH-241 교차 검증 스킴의 2차 실적용. 향후 stats 자동화 스크립트(ENH-273 후보) 도입 기반. |
