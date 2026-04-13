# bkit v2.1.5 Issue #73 #74 Fix — Completion Report

**Feature**: `bkit-v215-issue-73-74-fix`
**Version**: 2.1.4 → **2.1.5**
**Date**: 2026-04-13
**Branch**: `feat/v215-issue-73-74-fix`
**Issues**: #73 (imports 미주입), #74 (자동 전이 중단)
**Automation Level**: L4 Full-Auto
**Match Rate**: 100%

## Executive Summary

bkit v2.1.5는 PDCA 워크플로우의 두 가지 핵심 버그를 수정하는 릴리스입니다. #73은 imports resolver가 template 구조 정보를 resolve만 하고 결과를 Claude Code에 전달하지 않던 문제, #74는 plan/design 단계에서 자동 전이(auto-transition)가 동작하지 않던 문제입니다. 두 이슈 모두 **"구현은 있으나 연결이 안 된"** 동일 패턴의 근본 원인을 갖고 있었으며, 10-agent CTO Team 심층 분석을 통해 발견되었습니다. 추가로 DRY 통합(~85줄 중복 제거), Level 매핑 함수, Error 피드백 등 3건의 구조 개선을 포함합니다.

## Context Anchor

| 항목 | 값 |
|---|---|
| PDCA 흐름 | Plan → Design → Do → Check (92.9% → fix → 100%) → QA (all pass) → Report |
| 근본 원인 패턴 | "구현은 있으나 연결이 안 된" wiring 누락 |
| Gap 발견 | 9건 (GAP-A~I), P0 4건 + P1 4건 수정 |
| 분석 방법 | 10-agent CTO Team 심층 분석 |
| CC 권장 버전 | v2.1.104+ |

## 변경 파일 표

| # | 파일 | 변경 유형 | 이슈 | Lines Δ(추정) |
|:---:|---|---|---|---|
| 1 | `scripts/user-prompt-handler.js` | Fix | #73 | +15 |
| 2 | `scripts/pdca-skill-stop.js` | Fix + Refactor | #74, I2 | +10 -85 |
| 3 | `lib/pdca/automation.js` | Fix + Enhancement | #74, I2, I3 | +100 |
| 4 | `skills/pdca/SKILL.md` | Fix + Docs | #74 | +15 |
| 5 | `bkit.config.json` | Version | - | ±1 |
| 6 | `.claude-plugin/plugin.json` | Version | - | ±1 |
| 7 | `.claude-plugin/marketplace.json` | Version | - | ±1 |
| 8 | `hooks/hooks.json` | Version | - | ±1 |
| 9 | `hooks/session-start.js` | Version | - | ±1 |
| 10 | `docs/` | PDCA 문서 | - | new (plan, design, analysis, report) |

## 이슈별 해결

### #73 — imports 미주입 (template 구조 정보 미전달)

**Symptom**: `resolveImports()`를 호출하여 import resolution을 수행하지만, 그 결과를 `contextParts[]`에 push하지 않아 Claude Code가 template 구조 정보를 전혀 받지 못함. PDCA 문서 작성 시 template 기반 구조화가 불가능했음.

**Root Cause**: `scripts/user-prompt-handler.js`에서 `resolveImports()` 호출 결과를 변수에 저장만 하고 `contextParts[]` 배열에 추가하는 코드가 누락됨. 코드는 존재하나 연결이 안 된 전형적인 wiring 버그.

**Fix** (`scripts/user-prompt-handler.js`):
- `resolveImports()` 결과를 `contextParts[]`에 push하여 CC 시스템 프롬프트에 template 구조 정보 전달
- import 실패 시 `[WARNING]` 메시지를 `contextParts`에 push하여 사용자 피드백 제공 (I4)

**Verification**: imports resolution 결과가 CC context에 정상 포함됨 확인.

### #74 — 자동 전이 중단 (plan/design auto-transition 미작동)

**Symptom**: semi-auto(L2) 이상 레벨에서 plan → design, design → do 자동 전이가 발생하지 않음. 매번 `AskUserQuestion`을 통해 사용자에게 다음 단계 진행 여부를 질문.

**Root Cause**: 3중 실패 조합:
1. `shouldAutoAdvance()`에서 `plan`/`design` 단계를 지원하지 않아 `autoTrigger`가 항상 `null` 반환
2. `pdca-skill-stop.js`의 guidance가 soft hint 형식이라 CC가 무시
3. `skills/pdca/SKILL.md`에 Template Loading step이 없어 이중 방어 부재

**Fix 1** (`lib/pdca/automation.js`):
- `shouldAutoAdvance()`에 `plan`/`design` 단계 추가, semi-auto 이상에서 `autoTrigger` 생성 가능하도록 확장 (~5줄)

**Fix 2** (`scripts/pdca-skill-stop.js`):
- `autoTrigger` directive를 soft guidance에서 `[AUTO-TRANSITION] MUST execute` 강제 지시문으로 변경 (~10줄)

**Fix 3** (`skills/pdca/SKILL.md`):
- plan/design/report handler에 Template Loading step 0 추가 — 이중 방어 (~15줄)

**Verification**: plan → design → do 자동 전이 체인이 semi-auto 레벨에서 정상 작동 확인.

## 구조 개선 (Structural Improvements)

### I2 — DRY 통합 (Single Source of Truth)

`PDCA_PHASE_TRANSITIONS` 상수와 `determinePdcaTransition()` 함수를 `scripts/pdca-skill-stop.js`에서 `lib/pdca/automation.js`로 이동. ~85줄 중복 코드를 제거하고 단일 정의 지점(Single Source of Truth)을 확보함.

### I3 — Level 매핑 함수

`toLevelString()` / `fromLevelString()` 함수를 `lib/pdca/automation.js`에 추가. L0-L4 정수 ↔ manual/semi-auto/full-auto 문자열 양방향 변환을 지원하여, 레벨 비교 로직의 일관성 확보 (~15줄).

### I4 — Error 피드백

import 실패 시 `[WARNING]` 메시지를 `contextParts`에 push하여 사용자에게 실패 원인을 표시. 기존에는 import 실패가 조용히 무시되었음.

## 검증 결과

| 검증 항목 | 결과 |
|---|---|
| Gap Analysis | 92.9% → CRITICAL 1건 수정 → **100%** |
| Pre-release Scanner | 0 CRITICAL, 321 W/I |
| Unit Tests | **43/43 PASS (100%)** |
| Module Loads | **10/10 PASS** |
| MCP Servers | **2/2 PASS** |
| Version Sync | **6/6 PASS** |

## Root Cause Summary

| 이슈 | 근본 원인 | 패턴 |
|---|---|---|
| #73 | `orchestrateSkillPre()` 미호출 + `user-prompt-handler.js` imports 결과 미주입 (코드는 있으나 연결 안 됨) | Wiring 누락 |
| #74 | `shouldAutoAdvance()`에서 plan/design 미지원 → autoTrigger null → AskUserQuestion 항상 표시 + guidance가 soft hint여서 CC 무시 | 지원 범위 누락 + 지시 강도 부족 |

## PDCA 방법론 분석

- **10-agent CTO Team 심층 분석**으로 표면 증상이 아닌 근본 원인을 정확히 식별
- 두 이슈 모두 **"구현은 있으나 연결이 안 된"** 동일 패턴 — 코드 자체는 존재하지만 호출 체인의 wiring이 빠져 있었음
- Gap Analysis를 통해 추가 **9건의 Gap (GAP-A~I)** 을 선제적으로 발견하고 수정 (P0 4건, P1 4건)
- PDCA Check 단계에서 92.9% → 100% 달성 과정이 품질 게이트로서 효과적으로 동작

## Architecture Snapshot

| Component | Count |
|-----------|:-----:|
| Skills | 38 |
| Agents | 36 |
| Hook Events | 21 |
| Scripts | 42 |
| Lib Modules | 93 |
| Test Files | 201 |
| CC Recommended | v2.1.104+ |

---

## Meta

| 항목 | 값 |
|---|---|
| Feature ID | `bkit-v215-issue-73-74-fix` |
| PDCA Phases | Plan → Design → Do → Check → QA → Report |
| Branch | `feat/v215-issue-73-74-fix` |
| Issues Resolved | #73, #74 |
| Files Changed | 10 |
| Code Changes | 4 files (core fix + structural improvement) |
| Version Bumps | 5 files (config + manifests) |
| PDCA Docs | plan, design, analysis, report |
| Gap Coverage | 92.9% → 100% |
| Test Coverage | 43/43 PASS |
| Breaking Changes | None |
| CC Compatibility | v2.1.104+ (66 consecutive releases, 0 breaking) |
