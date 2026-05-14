---
sprint: v2.1.14-differentiation-release
sub-sprint: 5/6 (Doc)
phase: report
status: completed
created: 2026-05-14
match-rate: 97.5%
quality-gate: PASS (M1 ≥90%)
trust-level: L4 (Full-Auto)
---

# Sub-Sprint 5 (Doc) — 완료 보고서

> bkit v2.1.14 Differentiation Release Sprint
> Sub-Sprint 5/6: Doc — ENH-309 / ENH-306 / ENH-291 / ENH-296 + Sub-Sprint 4 carry (ADR 0010)

## 1. Executive Summary

| 지표 | 값 | 비고 |
|------|----|----|
| **Match Rate** | **97.5%** | M1 임계 90% 초과 ✅ (Missing 0건) |
| **Test Pass Rate** | **22 / 22** (100%) | 본 sub-sprint 신규 (L1 12 + L3 10) |
| **누적 Test Pass** | **291 / 291** | Sub-Sprint 1+2+3+4+5 전체 회귀 |
| **Domain Purity** | **18 / 18** files clean | 불변 유지 |
| **Skill frontmatter** | **44 / 44** all ≤1536 cap | ENH-291 CI gate 신설 |
| **신규 ADR** | **0010** Effort-aware Invariant | Sub-Sprint 4 carry closure |
| **R14~R17 Closure** | **4/4** (ENH-309/306/291/296) | 모두 PASS |
| **신규 docs LOC** | +130 (skill-frontmatter) + 3 신규 가이드 + 1 ADR | 합 ~600 |
| **Quality Gates** | M1✅ M2✅ M3✅ M4✅ M5✅ | 5/5 PASS |

### 1.1 4-Perspective Value

| 관점 | 가치 |
|------|------|
| **User** | dist-tag 3-Bucket Decision Framework 명문화 — bkit 권고 (보수적 v2.1.123 / 균형 v2.1.140) 의사결정 투명화 |
| **Developer** | `scripts/check-skill-frontmatter.js` CI gate로 250자 over-engineered baseline 폐기, CC 공식 1536자 cap 사용. block scalar 처리 정확 |
| **Business** | 6 차별화 + R-Series + release_drift_score 공식화 → 차후 CC 버전 분석 일관성 보장 |
| **Architecture** | ADR 0010 (invariant 10 영구 신설) 으로 Domain Layer Purity 18 file invariant 영구 봉인 |

---

## 2. PDCA 단계별 산출물

### 2.1 Phase 0 사전 분석

핵심 발견:
- `scripts/check-skill-frontmatter.js` **부재** → 신규 생성
- `docs/06-guide/version-policy.guide.md` **부재** → 신규 생성
- `docs/05-architecture/` 디렉토리 부재 → `docs/adr/0010-...` 으로 대체
- 실측: 14 skills > 250자 (sprint 852자 최대), **0 skills > 1536자** → 250자 cap incorrect 확정

### 2.2 의사결정 (D-1~D-3)

- **D-1**: ENH-291 cap = 1536 chars (CC validator 공식 — #56448) — 250자는 보수적 over-engineering 폐기
- **D-2**: invariants.md = ADR 0010 신설로 대체 (`docs/adr/0010-effort-aware-invariant.md`)
- **D-3**: doc 위주이지만 CI gate 스크립트로 enforcement 추가 (기술부채 방지)

### 2.3 Phase 3 Do — 산출물

| 파일 | LOC | 역할 | ENH |
|------|----|-----|-----|
| `scripts/check-skill-frontmatter.js` (신규) | 130 | SKILL_DESCRIPTION_CAP=1536, extractDescription (single + block scalar), walkSkills, CI gate | ENH-291 |
| `docs/06-guide/version-policy.guide.md` (신규) | (md) | dist-tag 3-Bucket + release_drift_score 공식 + 6 차별화 + R-Series + 환경 예외 | ENH-309 |
| `docs/06-guide/cc-version-monitoring.guide.md` (신규) | (md) | Stale-Lock Dedup 패턴 + R-3 Evolved-form Tracker 13 entries + Researcher 절차 | ENH-306 + ENH-296 |
| `docs/adr/0010-effort-aware-invariant.md` (신규) | (md) | ADR 0003 invariant 9 → 10 영구 신설 | Sub-Sprint 4 carry |
| `agents/cc-version-researcher.md` (확장) | +60 | R-Series Tracker section + release_drift_score formula + 6-차별화 표 | ENH-296 + ENH-309 + ENH-286 명시 |

### 2.4 Phase 3 Do — 테스트 (22 TCs)

| 파일 | Tier | TCs | 통과 |
|------|-----|-----|-----|
| `tests/qa/v2114-skill-frontmatter.test.js` | L1 | 12 | 12/12 |
| `tests/contract/v2114-doc-contract.test.js` | L3 | 10 | 10/10 |

### 2.5 Phase 4 Check (Iterate)

`bkit:gap-detector` 측정:
- **matchRate: 97.5%** (M1 임계 90% 초과)
- Missing items: **0건** — R14/R15/R16/R17 + Sub-Sprint 4 carry 7/7 PASS
- Extra items: 3건 (모두 POSITIVE — block scalar 처리, CI gate report, 6-차별화 표 추가)
- Drift: 1건 (INTENTIONAL — 30 LOC est. → 130 LOC actual, quality 우선)

### 2.6 Phase 5 QA (Act)

**Quality Gates 5/5 PASS**:

| Gate | 임계 | 결과 |
|------|-----|----|
| M1 matchRate ≥ 90% | 90.0 | **97.5%** ✅ |
| M2 Contract test PASS | 100% | **50/50** (전체 누적 L3) ✅ |
| M3 Unit test PASS | ≥95% | **291/291 = 100%** ✅ |
| M4 Domain purity | 0 forbidden | **18 files, 0 violations** ✅ |
| M5 Syntax + Skill frontmatter | 0 errors | **44 skills 모두 ≤1536** ✅ |

---

## 3. 메모리 정정 (실측 SSoT 갱신)

이전 메모리의 14 skills > 250자 베이스라인은 보수적 over-engineering 으로 폐기. 실측:

```
sprint                887/888 → 실측 852  ← 새 SSoT
enterprise            469  ← 일관
rollback              418
development-pipeline  412
audit                 374
pdca                  357
qa-phase              356
pdca-batch            354
pm-discovery          346
control               332
bkit                  326
bkit-rules            291
bkit-templates        279
plan-plus             276
```

14 skills > 250자 그대로 (3.5x 측정 일관) but 1536자 기준으로는 **0/44 violation** — ENH-291 P1 → P2 강등 정당화.

---

## 4. ADR 0010 — Sub-Sprint 4 carry closure

Sub-Sprint 4 (E Defense 확장) 가 ADR 0003 invariant 9 → 10 확장을 구현 (lib/domain/guards/invariant-10-effort-aware.js) 했으나 ADR 문서는 누락. 본 sprint 에서 `docs/adr/0010-effort-aware-invariant.md` 로 closure:

- **Decision**: Effort-aware defense intensity MUST be bound to `'low'|'medium'|'high'` valid range
- **Enforcement**: pure domain guard + Domain Purity CI 18/18 자동 검증
- **Permanence**: `removeWhen() → false` — 영구 invariant
- **Alternatives**: A1 schema-only / A2 warning-only / A3 Port↔Adapter 모두 거부 사유 명시

ADR 0010 은 ADR 0003 의 자식 ADR — Cross-reference 양방향 완성.

---

## 5. 회귀/Breaking 영향

| 항목 | 결과 |
|------|-----|
| Sub-Sprint 1 (60 TCs) 회귀 | **60/60 PASS** |
| Sub-Sprint 2 (114 TCs) 회귀 | **114/114 PASS** |
| Sub-Sprint 3 (48 TCs) 회귀 | **48/48 PASS** |
| Sub-Sprint 4 (47 TCs) 회귀 | **47/47 PASS** |
| Sub-Sprint 5 (22 TCs) 신규 | **22/22 PASS** |
| **누적 v2114** | **291/291 PASS** |
| Domain Layer purity | **18 files clean** (불변 유지) |
| Skill frontmatter | 44 skills 모두 ≤1536 (신규 CI gate) |
| Port↔Adapter pair 수 | **8** (불변) |
| Hook event 수 | 21 events / 24 blocks (불변) |
| 사용자 환경 영향 | **0** (모두 문서 또는 CI gate 추가, 기존 동작 보존) |

---

## 6. /sprint, /pdca, /control 핵심 기능 연계 검증

### 6.1 /sprint

- Sub-Sprint 4 archived → 5 in_progress → archived 전환 연속 동작 정상
- Sub-Sprint 4 carry item (ADR 0010) 을 Sub-Sprint 5 closure — **명시적 cross-sub-sprint carry 패턴 2번째 검증** (1번째: Sub-Sprint 2 → 4 ACTION_TYPES slot)

### 6.2 /pdca

- 9-phase enum 준수 + gap-detector matchRate 97.5% 자동 산출
- M1 gate 자동 판정 → PASS

### 6.3 /control

- L4 Full-Auto 유지
- ENH-291 신규 CI gate (`check-skill-frontmatter.js`) — `check-domain-purity.js` 와 동등 invariant CI gate 추가
- bkit-pdca-enterprise output style 의 invariant 정합

### 6.4 sub-sprint 간 연계 (최종 패턴)

| 연계 | 방향 | 내용 |
|------|------|------|
| Sub-Sprint 2 → 4 | ACTION_TYPES carry slot | `memory_directive_enforced` 사전 예약 → 활성화 |
| Sub-Sprint 4 → 5 | ADR carry closure | invariant 10 구현 → ADR 0010 문서화 |
| Sub-Sprint 3 → 5 | docs cross-ref | OTEL gen_ai.* 6 차별화 표에 명시 |
| Sub-Sprint 1 → 5 | docs cross-ref | Sequential dispatch 차별화 #3 표에 명시 |

---

## 7. Lessons Learned

1. **Over-engineered baseline 폐기 가치**: 250자 cap은 실제 CC failure 없이 보수성 우선 도입 → 1536자 공식으로 정정. **실측 SSoT 우선** 원칙 재확인
2. **Carry closure 패턴**: ADR 0010 은 Sub-Sprint 4 implementation 의 자연스러운 문서적 따라잡기 — sprint 간 carry는 단순 "다음 sprint로 미루기" 가 아니라 **다른 sprint 책임 영역에서 마무리** 가능
3. **doc-only 도 CI gate 가능**: skill description 길이 검증은 doc 산출물이지만 `scripts/check-skill-frontmatter.js` CI gate 추가로 기술부채 영구 차단
4. **agents/cc-version-researcher.md prompt 보강의 ROI**: 향후 모든 CC 버전 분석이 동일 R-Series/drift/차별화 표준 적용 → 일관성 자동화

---

## 8. Carry items → Sub-Sprint 6 + v2.1.15

| ID | 우선순위 | 항목 | 대상 |
|----|---------|------|-----|
| Sub-Sprint 6 (Observation) | P2 | MON-CC-NEW-NOTIFICATION 1-cycle 관찰 | Sub-Sprint 6 (현재 in_progress, 병행) |
| package.json scripts 통합 | INFO | `npm run check:skills` / `check:domain` 추가 권장 | v2.1.15 |
| state-store.port adapter | LOW (carry from Sub-Sprint 4 D-1) | memory-enforcer cache → port-based | v2.1.15 |
| unified-write-pre.js | LOW (carry from Sub-Sprint 4 D-2) | Write tool 대상 enforcement | v2.1.15 |
| package release | (Sub-Sprint 7?) | npm publish 2.1.14 + git tag | v2.1.14 release 단계 |

---

## 9. 종결 판정

✅ **Sub-Sprint 5 (Doc) — COMPLETED**
- 모든 Phase (Plan / Design / Do / Check / Act / QA / Report) 통과
- Quality Gate 5/5 PASS, matchRate 97.5%
- R14/R15/R16/R17 모두 closure (ENH-309/306/291/296)
- Sub-Sprint 4 carry (ADR 0010) closure
- 신규 CI gate (`check-skill-frontmatter.js`) Domain Purity 와 동등 격상
- Sub-Sprint 6 (Observation) 진입 차단 해제 — 단 Sub-Sprint 6 은 sprint 시작부터 in_progress (관찰 병행) 였으므로 별도 unblock 불필요

**다음 단계**: Task #15 completed → Sub-Sprint 6 마무리 (관찰 cycle 완료 시 또는 별도 트리거)
