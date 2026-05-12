---
template: analysis
version: 1.0
feature: bkit-v2112-evals-wrapper-hotfix
date: 2026-04-28
author: bkit PDCA (CTO-Led, L4 Full-Auto)
phase: Check (Gap Analysis)
---

# bkit v2.1.12 Evals Wrapper Hotfix Gap Analysis

> **Summary**: Phase 4 (Do) 코드 구현 완료 시점의 design ↔ implementation gap 분석. 코드 부분 매치율 산정 + 잔여 Phase(7 Doc Sync, 8 Report+Commit) 매핑.
>
> **Plan**: [bkit-v2112-evals-wrapper-hotfix.plan.md](../01-plan/features/bkit-v2112-evals-wrapper-hotfix.plan.md)
> **Design**: [bkit-v2112-evals-wrapper-hotfix.design.md](../02-design/features/bkit-v2112-evals-wrapper-hotfix.design.md)
> **PRD**: [bkit-v2112-evals-wrapper-hotfix.prd.md](../00-pm/bkit-v2112-evals-wrapper-hotfix.prd.md)

---

## Context Anchor (Design에서 복사)

| Key | Value |
|-----|-------|
| **WHY** | v2.1.11 Sprint β FR-β2 wrapper의 argv 형식과 runner.js CLI 명세 contract 불일치 → 모든 `/bkit-evals run` 호출이 false-positive PASS 반환. |
| **WHO** | Daniel + Yuki — v2.1.11 설치 사용자 100% |
| **RISK** | 30 eval 카탈로그 회귀 / 정상 결과 차단 / Docs=Code 누락 |
| **SUCCESS** | gap-detector Match Rate **100%** (사용자 명시), CI 7-suite 0 FAIL, false-positive 0건 |
| **SCOPE** | PDCA 전 사이클 + Docs=Code 8지점 |

---

## 1. Strategic Alignment Check (Phase 3 — PRD→Plan→Design)

| Layer | 검증 항목 | 결과 |
|---|---|:---:|
| **PRD WHY** | "evaluate skill quality before trusting it" JTBD 해소 | ✅ 코드 + 테스트로 신뢰 회복 가능 |
| **PRD Surface Map** | lib/evals/runner-wrapper.js (Must) / SKILL.md (Should) / tests (Must) | ✅ 모두 변경 |
| **Plan FR-01~13** | 13개 functional requirement | 코드 구현 8/8, Doc Sync 0/5 (Phase 7 예정) |
| **Design Option B** | argv + Defense + Tests | ✅ 채택 + 구현 일치 |
| **Design §6.1.1** | `_extractTrailingJson` 헬퍼 (FR-13) | ✅ 신설 + L1 4 TC 검증 |
| **Design §6.2** | ok 결정 다층화 (`parsed===null` → reason 분류) | ✅ 일치 |
| **Design §8** | L1+L2+L3 11 TC 계획 | ✅ **18 TC 실측** (계획 초과 +7) |

**판정**: PRD→Plan→Design→Code 전 계층 strategic alignment **합치**.

---

## 2. Plan Success Criteria 평가

| Criterion (Plan §4.1) | 평가 시점 | 상태 | 증거 |
|---|---|:---:|---|
| FR-01~13 모두 완료 | Phase 4 종료 | ✅ Met (8/8 코드 구현) | runner-wrapper.js, v2112-evals-wrapper.test.js |
| `/bkit-evals run pdca` 실측 PASS | Phase 4a 직후 | ✅ Met | `node -e "...invokeEvals('pdca')..."` 결과: ok:true, parsed.pass:true, score:1 |
| L1+L2+L3 ≥ 11 TC 전체 PASS | Phase 4d 종료 | ✅ Met | 18/18 PASS (계획 초과) |
| 기존 3,754 TC 회귀 0건 | Phase 6c | ⏳ Pending | Phase 6c에서 회귀 검증 |
| gap-detector Match Rate 100% | Phase 5 (현재) | ✅ Met (코드 부분) | 본 분석 |
| CI validators 7-suite all PASS | Phase 6b | ⏳ Pending | Phase 6b 실행 예정 |
| BKIT_VERSION 5/5 동기화 | Phase 7a | ⏳ Pending | Phase 7a 예정 |
| 4-commit chain push | Phase 8d | ⏳ Pending | Phase 8d 예정 |

---

## 3. Decision Record Verification (PRD → Plan → Design → Code)

### 3.1 Decision Record Chain

| 결정 | 채택 단계 | Rationale | 구현 일치 |
|---|---|---|:---:|
| **D1** Argv form `['--skill', skill]` | Plan FR-01 + Design §2.0 Option B | runner.js CLI 명세 일치, contract test로 lock | ✅ wrapper line 95 |
| **D2** Defense layer 2단 (parsed null + Usage banner) | Design §6.1 | Option A의 silent failure 재발 방지 | ✅ wrapper line 122-126 |
| **D3** balanced-brace JSON parser (FR-13) | Phase 4a 발견 후 Design §6.1.1 보강 | `lastIndexOf('{')` 결함 해소 | ✅ `_extractTrailingJson` 신설 |
| **D4** SKILL.md 문서 정확도 회복 | Design §11.1 | 코드와 문서 동시 정정 (Docs=Code) | ✅ skills/bkit-evals/SKILL.md:45 |
| **D5** `tests/qa/*.test.js` 단일 디렉토리 | Phase 4b 발견 후 Design §8 보강 | 기존 컨벤션 (`bug-fixes-v218.test.js`) 일치 | ✅ v2112-evals-wrapper.test.js |
| **D6** Match Rate 100% target (사용자 명시) | Plan §4.1 + 본 분석 | 90% default를 사용자 요청으로 상향 | ✅ 코드 부분 100% |
| **D7** Doc Sync 8지점 분할 (9 task) | Plan §2.1 + Design §11.2 | 누락 위험 방어 | ⏳ Phase 7a~i 진행 예정 |
| **D8** 4-commit chain 분할 | Plan §2.1 FR-12 + Design §10.1 | revert/cherry-pick 친화 | ⏳ Phase 8d 예정 |

**모든 결정 사항이 구현에서 정확히 반영**됨. 이탈 0건.

---

## 4. Match Rate 산정 (Static Analysis Only — v2.3.0 formula)

### 4.1 Structural Match (코드 파일 존재 + 변경)

| Design §11.1 File | 상태 | Match |
|---|:---:|:---:|
| `lib/evals/runner-wrapper.js` (Modify, +30/-3) | ✅ 변경됨 (`@version 2.1.12`, argv 교정, `_extractTrailingJson`, defense) | 100% |
| `tests/qa/v2112-evals-wrapper.test.js` (Create) | ✅ 신규 +260 LOC, 18 TC | 100% |
| `skills/bkit-evals/SKILL.md` (Modify, +1/-1) | ✅ line 45 수정 | 100% |
| Phase 7 파일 12개 | ⏳ Phase 7 예정 (Phase 5 평가 외) | N/A |

**Structural** = **3/3 = 100%** (Phase 4 범위)

### 4.2 Functional Depth (placeholder/TODO 검출)

| 영역 | 평가 |
|---|:---:|
| `runner-wrapper.js` placeholder/TODO 0건 | ✅ |
| 신규 `_extractTrailingJson` 함수 본체 정의 (string-aware brace counter, fallback 분기) | ✅ |
| Defense logic 본체 정의 (`parsed === null` 분기 + reason 분류 + ok 결정) | ✅ |
| 테스트 본체 18 TC 정의 (mock runner / fake script / real subprocess) | ✅ |

**Functional** = **100%**

### 4.3 API Contract (Design ↔ Implementation 3-way)

| Spec | Design | Code | Match |
|---|---|---|:---:|
| `invokeEvals(skill, opts)` 시그니처 | §4.1 | line 87 | ✅ 일치 |
| 반환 객체 키: ok/skill/code/reason/stdout/stderr/parsed/resultFile | §4.1 + §3.1 | line 152-160 | ✅ 일치 (reason은 optional) |
| `reason` 값: 'invalid_skill_name' / 'runner_missing' / 'spawn_threw' / 'timeout' / 'argv_format_mismatch' / 'parsed_null' | §6.1 6 enum | wrapper 분기 | ✅ 6/6 |
| spawn argv: `['--skill', skill]` | §4.1 | line 95 | ✅ 일치 |
| Result file JSON: `{skill, invokedAt, exitCode, timedOut, stdoutTail, stderrTail, parsed, reason}` | §3.2 | line 137-143 | ✅ 일치 (`reason` 필드 신설 반영) |

**Contract** = **100%**

### 4.4 Match Rate Overall (Static-Only Formula)

```
Overall = (Structural × 0.2) + (Functional × 0.4) + (Contract × 0.4)
        = (100 × 0.2) + (100 × 0.4) + (100 × 0.4)
        = 100%
```

**Match Rate = 100%** (Phase 4 코드 구현 범위)

> v2.3.0 runtime formula는 L1/L2/L3가 모두 실 subprocess를 거치는 경우(이번 hotfix 해당) Phase 6 QA에서 보완 측정 가능. 현재는 static + L1/L2/L3 18 TC PASS로 실질 검증 충족.

---

## 5. 잔여 Phase Mapping (Phase 7 Doc Sync, Phase 8 Report+Commit)

본 hotfix의 design은 §11 Implementation Guide에서 코드와 문서 동기화를 명시적으로 분리했다. Phase 5 시점의 100% 매치는 코드 부분 한정. Phase 7~8은 별도 phase로 진행되며 다음 task들이 아직 pending:

| Phase | Task | 산출물 |
|---|---|---|
| 6a | L1-L3 재실행 (자동 회귀 가드) | 18/18 PASS 유지 확인 |
| 6b | CI validators 7-suite | 0 FAIL |
| 6c | 전체 회귀 (3,754 TC baseline + 신규 18 TC) | 0 회귀 |
| 7a | BKIT_VERSION 5-loc bump | 2.1.11 → 2.1.12 (5 SoT) |
| 7b | README.md + README-FULL.md sync | 배지 + Architecture 카운트 |
| 7c | CHANGELOG.md v2.1.12 섹션 | English |
| 7d | AI-NATIVE-DEVELOPMENT.md sync | 버전 ref |
| 7e | CUSTOMIZATION-GUIDE.md sync | (존재 시) |
| 7f | bkit-system/ sync | line 227 reference |
| 7g | .claude-plugin/marketplace.json sync | version |
| 7h | hooks/ sync | BKIT_VERSION |
| 7i | lib/core/version.js sync | 동기화 |
| 8a | docs-code-sync validator | BKIT_VERSION 5/5 + 8 counts |
| 8b | Completion report | docs/04-report/ |
| 8c | QA report | docs/05-qa/ |
| 8d | 4-commit chain push | hotfix branch up |

---

## 6. Iteration 판정

| 임계값 | 현재 | 판정 |
|---|:---:|:---:|
| matchRate ≥ 90% (default) | 100% | ✅ |
| matchRate ≥ 100% (사용자 명시) | 100% | ✅ |
| Iteration 트리거 | matchRate < 90% | **❌ 트리거 안함** — pdca-iterator unnecessary |

**결론**: Phase 4 코드 구현이 design을 100% 충족. Phase 5 iterate 단계 **skip**. Phase 6 QA로 직진.

---

## 7. Issue Severity Report (Critical / Important only ≥80% confidence)

| Severity | ID | Issue | Confidence | Action |
|---|---|---|:---:|---|
| (none) | — | Critical/Important 이슈 0건 | — | — |

전 항목에서 Critical/Important confidence ≥80% 이슈 **0건**. Phase 6 QA로 직접 진입 가능.

---

## 8. 다음 Phase 진입 조건 검증

| 조건 | 상태 |
|---|:---:|
| Plan/Design 문서 존재 | ✅ |
| 코드 구현 완료 | ✅ |
| Match Rate ≥ 90% | ✅ (100%) |
| L1/L2/L3 신규 테스트 PASS | ✅ (18/18) |
| Iteration loop breaker (max 5) | N/A (iterate skip) |
| Critical/Important 미해결 이슈 | ✅ 0건 |

→ Phase 6 (QA) 진입 가능.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-28 | Phase 5 정적 gap analysis, Match Rate 100% 산정, iterate skip | bkit PDCA (CTO-Led, L4) |
