---
template: plan
version: 1.3
feature: bkit-v2112-evals-wrapper-hotfix
date: 2026-04-28
author: bkit PDCA (CTO-Led, L4 Full-Auto)
project: bkit
project_version: 2.1.11 → 2.1.12 (hotfix)
---

# bkit v2.1.12 Evals Wrapper Hotfix Planning Document

> **Summary**: `lib/evals/runner-wrapper.js`의 argv 불일치(positional vs `--skill` flag) 결함을 패치하고, false-positive 방어 + L1/L2/L3 테스트 + 문서·버전 8지점 동기화를 수행하는 v2.1.12 hotfix.
>
> **Project**: bkit
> **Version**: 2.1.11 → 2.1.12
> **Author**: PDCA Cycle (CTO-Led, L4 Full-Auto)
> **Date**: 2026-04-28
> **Status**: Draft → Plan 단계
> **Branch**: `hotfix/v2112-evals-wrapper-argv` (main `85955cb`에서 분기)
> **Upstream PRD**: [docs/00-pm/bkit-v2112-evals-wrapper-hotfix.prd.md](../../00-pm/bkit-v2112-evals-wrapper-hotfix.prd.md)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | `lib/evals/runner-wrapper.js:93`이 `spawnSync('node', [runnerPath, skill])`로 positional argument를 전달하지만, `evals/runner.js` CLI는 `--skill <name>` 플래그만 파싱(line 409-414). 결과적으로 모든 `/bkit-evals run <skill>` 호출이 Usage 배너만 출력하고 exit 0을 반환하며, wrapper가 이를 PASS로 오판(`ok: true`)하는 결정적 false-positive 결함. v2.1.11 Sprint β FR-β2 신규 코드 회귀. |
| **Solution** | argv를 `[runnerPath, '--skill', skill]`로 교정 + false-positive 방어 2단(`parsed === null` 체크 + Usage 배너 감지). SKILL.md `<skill>` → `--skill <skill>` 문서 정확도 회복. L1 unit + L2 integration + L3 contract 테스트 신설. BKIT_VERSION 5지점 bump + Docs=Code 8지점 동기화. |
| **Function/UX Effect** | `/bkit-evals run <skill>` 즉시 정상 동작 — 실 평가 결과(`{pass: true, score: 1.0, ...}` JSON) 반환 + `.bkit/runtime/evals-{skill}-{ts}.json` 영구 저장. Daniel(Dynamic 파운더) eval 신뢰 회복, Yuki(Enterprise governance) 품질 게이트 무결성 회복. |
| **Core Value** | "Automation First, No Guessing" 철학 정면 위배 결함의 신뢰 복원. eval 통과 표시가 실제 검증을 의미하도록 — 자동화의 무결성 보장. v2.1.11 출시 직후 발견·즉시 패치로 30 eval 카탈로그 신뢰성 회복. |

---

## Context Anchor

> Auto-extracted from PRD + Executive Summary. Propagated to Design/Do/Analysis/Report.

| Key | Value |
|-----|-------|
| **WHY** | v2.1.11 Sprint β FR-β2 wrapper의 argv 형식과 runner.js CLI 명세 contract 불일치 → 모든 `/bkit-evals run` 호출이 false-positive PASS 반환. 자동화 신뢰 기반 훼손. |
| **WHO** | Daniel (Dynamic 파운더, 첫 스킬 검증), Yuki (Enterprise 거버넌스, eval 품질 게이트) — v2.1.11 설치 사용자 100% |
| **RISK** | (1) wrapper 변경이 30 eval 카탈로그 호출 사이트 회귀 유발 → Contract Test L3로 방지. (2) false-positive 방어가 정상 JSON 결과를 차단 → L1 정상 케이스 명시 검증. (3) Docs=Code 8지점 동기화 누락 → docs-code-sync.js validator로 강제. |
| **SUCCESS** | gap-detector Match Rate **100%** (사용자 명시), CI validators 7-suite 0 FAIL, 기존 3,754 TC 0 회귀, 신규 ~12 TC 전체 PASS, false-positive `ok:true` + Usage 배너 0건. |
| **SCOPE** | Phase 0~8 PDCA 전 사이클: Setup → PM → Plan → Design → Do (구현 4 sub-task) → Iterate → QA → Doc Sync (8지점) → Report. 26 task 등록. v2.1.12 GA 단일 릴리스. |

---

## 1. Overview

### 1.1 Purpose

v2.1.11 Sprint β FR-β2(`/bkit-evals` skill 신설)에서 도입된 wrapper(`lib/evals/runner-wrapper.js`)의 argv 형식 결함을 즉시 패치한다. 단순 한 줄 수정이 아니라 다음 계층까지 동시에 정상화한다:

1. **Wrapper argv 교정** — `[runnerPath, skill]` → `[runnerPath, '--skill', skill]`
2. **False-positive 방어 2단** — `parsed === null` + `stdout.startsWith('Usage:')` 동시 검사
3. **SKILL.md 문서 정확도** — line 45 argv form 표기 수정
4. **테스트 신설 L1/L2/L3** — wrapper→runner 경로의 회귀 보호망 구축
5. **BKIT_VERSION + Docs=Code 8지점 동기화** — 버전 정합성 유지

### 1.2 Background

v2.1.11은 "Integrated Enhancement" 4 Sprint 20 FR 통합 릴리스로 main에 PR #85로 병합됨(`85955cb`). 그중 Sprint β FR-β2 `/bkit-evals` skill은 기존 `node evals/runner.js --skill <name>` 직접 호출을 대체하는 입력 검증·결과 영구화·구조화된 wrapper로 도입되었다.

그러나 wrapper의 spawnSync argv 구성이 runner.js CLI 명세(`--skill <name>`)와 어긋나는 결함이 main 머지 후 첫 실측(2026-04-28 사용자 세션)에서 발견되었다. 다음 사실들이 결함의 critical 등급을 뒷받침한다:

- **단일 호출 사이트**: wrapper 외부에 `invokeEvals()` 호출자 0건(grep 검증) → fix는 forward-compatible
- **silent failure 패턴**: exit code 0 + Usage 배너 + `ok: true` 반환 → 사용자는 "성공했다"고 잘못 인식
- **기존 회귀 보호 부재**: L1 단위 테스트는 runner.js 직접 호출만 검증(`bug-fixes-v218.test.js:B6-1`), wrapper 경로는 미커버
- **문서 정합성**: `skills/bkit-evals/SKILL.md:45`도 incorrect form(`<skill>`)을 명시 → 코드와 문서 동시 결함

v2.1.11 출시 사용자 100%가 `/bkit-evals run` 시도 시 즉시 영향받기 때문에 v2.1.12 silent hotfix로 즉시 대응한다.

### 1.3 Related Documents

- **Upstream PRD**: `docs/00-pm/bkit-v2112-evals-wrapper-hotfix.prd.md`
- **v2.1.11 Plan/Design 원본**: `docs/01-plan/features/bkit-v2111-integrated-enhancement.plan.md`, `docs/02-design/features/bkit-v2111-sprint-beta.design.md`
- **결함 위치**: `lib/evals/runner-wrapper.js:93,140`
- **Contract 상대**: `evals/runner.js:404-431` (CLI flag parser)
- **회귀 보호 baseline**: `tests/qa/bug-fixes-v218.test.js:B6-1` (runner.js 직접 호출 회귀 가드)

---

## 2. Scope

### 2.1 In Scope

- [ ] **FR-01** `lib/evals/runner-wrapper.js:93` argv 교정 (`[runnerPath, '--skill', skill]`)
- [ ] **FR-02** wrapper false-positive 방어 2단 (`parsed === null` + `stdout.startsWith('Usage:')`)
- [ ] **FR-03** `skills/bkit-evals/SKILL.md:45` argv form 문서 정확도 회복
- [ ] **FR-04** L1 단위 테스트 신설 (`tests/unit/evals/runner-wrapper.test.js`, ~6 TC)
- [ ] **FR-05** L2 통합 테스트 신설 (실 subprocess 경로 검증, ~3 TC)
- [ ] **FR-06** L3 contract 테스트 신설 (wrapper↔runner argv contract lock, ~2 TC)
- [ ] **FR-07** BKIT_VERSION 5-loc bump (2.1.11 → 2.1.12): `bkit.config.json`, `.claude-plugin/plugin.json`, `README.md`, `CHANGELOG.md`, `hooks/hooks.json`
- [ ] **FR-08** CHANGELOG.md v2.1.12 섹션 (Fixed/Added/Internal)
- [ ] **FR-09** Docs=Code 8지점 동기화: `README.md`, `README-FULL.md`, `AI-NATIVE-DEVELOPMENT.md`, `CUSTOMIZATION-GUIDE.md` (있을 시), `bkit-system/`, `.claude-plugin/marketplace.json`, `lib/core/version.js`, `lib/evals/runner-wrapper.js` `@version` 태그
- [ ] **FR-10** gap-detector Match Rate **100%** 도달 (사용자 명시)
- [ ] **FR-11** CI validators 7-suite 0 FAIL (`docs-code-sync`, `check-domain-purity`, `check-deadcode`, `check-guards`, `check-trust-score-reconcile`, `check-quality-gates-m1-m10`, `test/e2e/run-all.sh`)
- [ ] **FR-12** 4-commit chain on hotfix branch (fix / test / docs version / docs sync)
- [ ] **FR-13** wrapper JSON parse robustness — `_extractTrailingJson(stdout)` 신규 헬퍼 (whole-stdout parse → balanced-brace string-aware fallback). Phase 4a 구현 중 발견된 2차 결함(`stdout.lastIndexOf('{')`가 nested object의 마지막 `{`을 잡아 outer closing `}`이 trailing data로 남아 parse 실패) 해소.

### 2.2 Out of Scope

- `evals/runner.js` CLI 인터페이스 변경 — 현 설계가 정답
- `evals/runner.js` 결과 JSON 스키마 확장 — 별도 enhancement
- 30 eval YAML 콘텐츠 개선 — Sprint β 후속 작업
- `/bkit-evals list` 동작 개선 — 본 hotfix 무관
- ENH-277 hook → MCP tool 직접 호출 — v2.1.12 별도 P0 (이번 hotfix와 분리)
- `lib/pdca/lifecycle.js` shim 변환 — Application Layer 마이그레이션 (v2.1.13+)
- Romance language detector 정확도 개선 — 베이스라인 락 유지

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `runner-wrapper.js:93` argv를 `[runnerPath, '--skill', skill]`로 교정 | High | Pending |
| FR-02 | wrapper에 `parsed === null`일 때 `ok:false, reason:'parsed_null'` 반환 추가 | High | Pending |
| FR-03 | wrapper에 `stdout.includes('Usage:')`일 때 `ok:false, reason:'argv_format_mismatch'` 반환 추가 | High | Pending |
| FR-04 | `skills/bkit-evals/SKILL.md:45` 문서를 `--skill <skill>` form으로 수정 (≤250자 ENH-162 한도 유지) | Medium | Pending |
| FR-05 | L1 unit test 신설: 6 TC 이상 (정상/Usage/parsed-null/invalid-name/timeout/path-traversal) | High | Pending |
| FR-06 | L2 integration test 신설: 실 runner.js subprocess + 3 known skill (pdca, gap-detector, qa-phase) 검증 | High | Pending |
| FR-07 | L3 contract test 신설: spawnSync mock으로 argv 형식 lock + Usage banner 명세 lock | High | Pending |
| FR-08 | BKIT_VERSION 5-loc bump 2.1.11 → 2.1.12 (config/plugin/README/CHANGELOG/hooks) | High | Pending |
| FR-09 | CHANGELOG v2.1.12 섹션 (Fixed B1 argv mismatch, Added L1/L2/L3 tests, Internal version bump) — English | High | Pending |
| FR-10 | Docs=Code 8지점 동기화 (README-FULL/AI-NATIVE/bkit-system/marketplace/version.js/SKILL.md @version 등) | High | Pending |
| FR-11 | gap-detector Match Rate 100% 달성 (max 5 iterate cycles) | High | Pending |
| FR-12 | CI validators 7-suite 0 FAIL | High | Pending |
| FR-13 | wrapper에 `_extractTrailingJson()` 신설 — whole-stdout JSON parse + balanced-brace string-aware fallback (Phase 4a 구현 중 발견된 2차 결함 해소) | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| **Performance** | wrapper 호출 overhead < 50ms (subprocess spawn 제외) | L1 perf TC: `Date.now()` 측정 (10회 평균) |
| **Correctness** | false-positive `ok:true` + Usage 배너 동시 발생 0건 | L1 TC-02 명시 검증 |
| **Backward Compat** | `invokeEvals()` 시그니처·반환 키(`ok/skill/code/stdout/stderr/parsed/resultFile`) 무변경 | API surface diff |
| **Security** | argv injection 무방어 영역 0건 (정규식 + argv-array spawn 유지) | L1 TC-04 invalid name + path traversal |
| **Domain Purity** | `lib/domain/` forbidden import 0건 (영향 없음) | `scripts/check-domain-purity.js` |
| **Docs=Code** | BKIT_VERSION 5/5, One-Liner SSoT 5/5, 8 counts 정확 | `scripts/docs-code-sync.js` |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01~12 모두 완료
- [ ] `/bkit-evals run pdca` 실측: stdout에 `{pass: true, ...}` JSON, `parsed.details.skill === 'pdca'`, resultFile 정상 영구화, **Usage 배너 0**
- [ ] L1+L2+L3 신규 테스트 ≥ 11 TC 전체 PASS
- [ ] 기존 3,754 TC baseline 회귀 0건
- [ ] gap-detector Match Rate **100%** (사용자 명시 — 90% 기본 임계 상회)
- [ ] CI validators 7-suite all PASS
- [ ] BKIT_VERSION 5/5 동기화 (`docs-code-sync.js` 검증 통과)
- [ ] 4-commit chain 푸시 + hotfix 브랜치 push-up

### 4.2 Quality Criteria

- [ ] Domain Layer 순수성 유지 (영향 없음 — wrapper는 infra layer)
- [ ] Clean Architecture 4-Layer 변경 없음
- [ ] Port↔Adapter 7쌍 변경 없음
- [ ] 8-language 트리거 키워드 변경 없음 (SKILL.md 본문만 수정)
- [ ] CC 호환성: v2.1.78 minimum, v2.1.121 검증 (변경 없음)
- [ ] Architecture 점수 92+/100 유지

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **R1** wrapper 변경이 30 eval 카탈로그 호출 사이트 회귀 유발 | High | Medium | L3 Contract Test로 30 eval 전체 argv 형식 lock. 기존 `bug-fixes-v218.test.js:B6-1` runner.js 직접 호출 baseline 회귀 0 보장 |
| **R2** false-positive 방어 로직이 정상 JSON 출력을 `ok:false`로 오분류 | Medium | Low | L1 TC-01 정상 경로 명시 검증. `parsed !== null` 케이스에서는 banner 검사 skip하는 short-circuit 적용 |
| **R3** `stdout.startsWith('Usage:')` 검사가 prefix 변형(공백·로그·로컬라이제이션) 미감지 | Low | Low | `stdout.includes('Usage:')` + 보강 조건(`parsed === null`) AND 결합 |
| **R4** v2.1.12 hotfix가 v2.1.11 cache 무효화 미트리거 → 사용자 환경에서 구 wrapper 잔존 | Medium | Low | `bkit.config.json:version` bump가 CC plugin reload 트리거. `/bkit version` 출력 검증 권장 |
| **R5** Docs=Code 8지점 중 1지점 누락 → docs-code-sync validator FAIL | High | Medium | Phase 7a~i 9 task로 분할 + Phase 8a 최종 docs-code-sync 검증 게이트 |
| **R6** L4 Full-Auto 자율 진행 중 unintended file 수정 | Medium | Low | Guardrails: blastRadiusLimit 10, checkpointAutoCreate, concurrentWriteLock 활성. git diff 단계별 검토 |
| **R7** ENH-277 향후 작업과 wrapper 시그니처 충돌 | Low | Medium | `invokeEvals()` 반환 객체에 `reason` 필드 신설(미사용 시 omit) — caller-agnostic 유지 |

---

## 6. Impact Analysis

> **Purpose**: List every existing consumer of the resources being changed.

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `lib/evals/runner-wrapper.js` | Module (lib infra) | spawnSync argv 교정 + false-positive 방어 + `@version` bump |
| `skills/bkit-evals/SKILL.md` | Skill definition | line 45 argv form 표기 수정 (`<skill>` → `--skill <skill>`) |
| `tests/unit/evals/runner-wrapper.test.js` | New L1 test | 신규 파일, 6 TC |
| `tests/integration/evals/runner-wrapper-integration.test.js` | New L2 test | 신규 파일, 3 TC |
| `tests/contract/evals/wrapper-runner-argv.contract.test.js` | New L3 contract test | 신규 파일, 2 TC |
| `bkit.config.json` | Config (SoT) | version 2.1.11 → 2.1.12 |
| `.claude-plugin/plugin.json` | Plugin manifest | version 동기화 |
| `.claude-plugin/marketplace.json` | Marketplace metadata | version 동기화 |
| `README.md` | Public doc | 배지 + Architecture 카운트 (변경 없음 예상) |
| `README-FULL.md` | Public doc | 동일 동기화 |
| `CHANGELOG.md` | Public doc | v2.1.12 섹션 추가 |
| `AI-NATIVE-DEVELOPMENT.md` | Public doc | v2.1.11 → v2.1.12 reference 동기화 |
| `bkit-system/README.md` | Internal doc | line 227 reference 검증 |
| `hooks/hooks.json` | Hook config | BKIT_VERSION 동기화 |
| `lib/core/version.js` | Version SoT module | 동기화 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `runner-wrapper.js` `invokeEvals()` | EXECUTE | `skills/bkit-evals/SKILL.md` (skill body) | Needs verification — 단일 호출자 |
| `runner-wrapper.js` `isValidSkillName()` | EXECUTE | `skills/bkit-evals/SKILL.md` (skill body) | None — 시그니처 무변경 |
| `evals/runner.js` argv `--skill` | EXECUTE | `tests/qa/bug-fixes-v218.test.js:B6-1` | None — runner.js 무변경 |
| `bkit.config.json:version` | READ | `lib/core/version.js`, `hooks/session-start.js`, `lib/infra/branding.js` | Needs verification — 5-loc invariant 유지 |
| `BKIT_VERSION` literal | READ | `scripts/docs-code-sync.js` (validator) | Needs verification — 5/5 enforced |

### 6.3 Verification

- [ ] grep `require.*runner-wrapper` + `from.*runner-wrapper` → 0건 외부 caller 확인 (PM Agent Phase 1 결과)
- [ ] grep `invokeEvals\(` 사용 사이트 → 1건 (skill body) 확인
- [ ] `bug-fixes-v218.test.js:B6-1` runner.js 직접 호출 baseline 무영향 확인
- [ ] BKIT_VERSION 5-loc invariant docs-code-sync validator로 강제 검증
- [ ] Domain Layer 순수성 무영향 (wrapper는 infra/utility layer)

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based | Fullstack apps | ☐ |
| **Enterprise** | Strict layer separation, Clean Architecture 4-Layer | bkit 자체 (high-traffic plugin, multi-platform) | ☑ |

bkit은 자체 프로젝트로 Enterprise 레벨 (Clean Architecture 4-Layer + 7 Port↔Adapter + Application Layer pilot). 이번 hotfix는 기존 아키텍처 무변경.

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Wrapper 변경 범위 | A: argv만 / B: argv + 방어 / C: B + ExecResult contract refactor | **B** | A는 silent failure 재발 방지 부족. C는 hotfix 범위 초과 (v2.1.13 carryover) |
| 방어 로직 위치 | wrapper 내부 / runner.js 내부 / 양쪽 | **wrapper만** | runner.js는 정상 동작(positional 미지원이 의도된 설계). wrapper가 정확한 argv 전달 책임. |
| 테스트 깊이 | L1만 / L1+L2 / L1+L2+L3 | **L1+L2+L3** | 사용자 "꼼꼼·완벽" 요구. L3 contract가 향후 ENH-277 등 wrapper 변경 시 회귀 가드 |
| Match Rate 목표 | 90% (default) / 100% (사용자 명시) | **100%** | 사용자 명시 요구. hotfix 단순성으로 도달 가능 |
| 커밋 chain 분할 | 1 commit / 4 commit / file-per-commit | **4 commit** | 의미 단위 분리: fix / test / version / docs. revert/cherry-pick 용이 |

### 7.3 Clean Architecture Approach

```
Selected Level: Enterprise (bkit 자체)

Affected Layers (이번 hotfix):
┌────────────────────────────────────────────────────────────────┐
│ Presentation: hooks/, scripts/, skills/                       │
│   └─ skills/bkit-evals/SKILL.md      ← FR-04 문서 정확도        │
├────────────────────────────────────────────────────────────────┤
│ Application: lib/application/, lib/pdca/, lib/team/           │
│   └─ (변경 없음)                                                │
├────────────────────────────────────────────────────────────────┤
│ Domain: lib/domain/ (ports/guards/rules)                      │
│   └─ (변경 없음 — purity 유지)                                  │
├────────────────────────────────────────────────────────────────┤
│ Infrastructure: lib/infra/, lib/audit/, lib/evals/, lib/i18n/ │
│   └─ lib/evals/runner-wrapper.js   ← FR-01/02/03 핵심 변경      │
└────────────────────────────────────────────────────────────────┘

Port↔Adapter 7쌍 영향: 0건 (wrapper는 utility, port 미해당)
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `.claude/CLAUDE.md` 코딩 규칙 명시 (English default, Korean exception for `docs/`)
- [x] 8-language 트리거 키워드 컨벤션 (SKILL.md / agent.md)
- [x] BKIT_VERSION 5-loc SoT 컨벤션
- [x] One-Liner SSoT 5-loc 컨벤션
- [x] Conventional Commits + Co-Authored-By 컨벤션
- [x] @version JSDoc 태그 컨벤션 (lib/, hooks/)
- [x] ENH-162 SKILL.md description ≤ 250자 컨벤션

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Test 파일 위치** | exists (`tests/unit/`, `tests/integration/`, `tests/contract/`) | 신규 디렉토리 `tests/unit/evals/` + `tests/integration/evals/` + `tests/contract/evals/` | High |
| **Test 명명 규칙** | `*.test.js` | `runner-wrapper.test.js`, `runner-wrapper-integration.test.js`, `wrapper-runner-argv.contract.test.js` | High |
| **Test runner** | `node --test` | 동일 사용 | — |
| **Mock 라이브러리** | 없음 (node:test built-in mocks) | 동일 사용 | — |
| **Error reason 명명** | snake_case (`invalid_skill_name` 기존) | 동일 패턴 (`argv_format_mismatch`, `parsed_null`) | High |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| (none) | hotfix 범위 환경변수 신규 도입 없음 | — | ☐ |

### 8.4 Pipeline Integration

본 hotfix는 9-phase Development Pipeline 적용 대상 아님 (bkit 자체 메타 작업).

---

## 9. Next Steps

1. [ ] `/pdca design bkit-v2112-evals-wrapper-hotfix` — 3 architecture options + L1-L5 test plan
2. [ ] `/pdca do bkit-v2112-evals-wrapper-hotfix` — Phase 4a~e 구현 (4 sub-task)
3. [ ] `/pdca analyze bkit-v2112-evals-wrapper-hotfix` — gap-detector 100% 도달 확인
4. [ ] `/pdca iterate bkit-v2112-evals-wrapper-hotfix` — 100% 미달 시 (max 5 cycles)
5. [ ] `/pdca qa bkit-v2112-evals-wrapper-hotfix` — L1-L5 + CI 7-suite 실행
6. [ ] Phase 7a~i Doc Sync (BKIT_VERSION 5-loc + Docs=Code 8지점)
7. [ ] `/pdca report bkit-v2112-evals-wrapper-hotfix` — 완료 보고서
8. [ ] 4-commit chain push + hotfix branch up

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-28 | Initial draft, PRD 기반 작성, 12 FR + 7 Risk | bkit PDCA (CTO-Led, L4) |
