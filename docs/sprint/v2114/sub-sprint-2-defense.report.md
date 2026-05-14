---
sprint: v2.1.14-differentiation-release
sub-sprint: 2/6 (Defense)
phase: report
status: completed
created: 2026-05-14
match-rate: 96.5%
quality-gate: PASS (M1 ≥90%)
trust-level: L4 (Full-Auto)
---

# Sub-Sprint 2 (Defense) — 완료 보고서

> bkit v2.1.14 Differentiation Release Sprint
> Sub-Sprint 2/6: Defense — ENH-289 / ENH-298 / ENH-303 / ENH-310 / MON-CC-NEW-PLUGIN-HOOK-DROP

## 1. Executive Summary

| 지표 | 값 | 비고 |
|------|----|----|
| **Match Rate** | **96.5%** | M1 임계 90% 초과 ✅ |
| **Test Pass Rate** | **174 / 174** (100%) | L1+L2+L3 전 영역 |
| **Domain Purity** | **17 / 17** files clean | 0 forbidden imports |
| **차별화 추가** | **#6** Heredoc-pipe bypass defense | 누적 6개 moat |
| **차별화 강화** | **#2** Layer 6 audit (Tier 1/2/3 완전 구현) | post-hoc → alarm → auto-rollback |
| **PostToolUse 3-site wired** | bash-post / write-post / skill-post | reachability ping atomic |
| **신규 LOC** | **+980** (lib/defense 4 modules) | +283 (hook integrations) |
| **신규 ACTION_TYPES** | **20 → 27** (+7) | audit-logger SSoT |
| **Quality Gates** | M1✅ M2✅ M3✅ M4✅ M5✅ | 5/5 PASS |

### 1.1 4-Perspective Value

| 관점 | 가치 |
|------|------|
| **User** | `cat <<EOF \| bash` heredoc bypass 시도가 PreToolUse에서 차단 → CC v2.1.73~141 회귀 #58904 면역 |
| **Developer** | Defense Layer 4개 모듈 + audit-logger 7 신규 액션이 SSoT 단일 진입점으로 통합 — 재사용 가능한 barrel 패턴 |
| **Business** | bkit 차별화 #6 product moat 신설 (CC native 미보유), 차별화 #2/#3와 결합해 enterprise selling point 강화 |
| **Architecture** | Domain Layer purity 17/17 유지, Port↔Adapter 8 pair 보존, Clean Architecture 4-Layer 무위반 |

---

## 2. PDCA 단계별 산출물

### 2.1 Plan (Phase 1)

- **Sprint master plan §Sub-Sprint 2** 참조 (`docs/sprint/v2114/master-plan.md`)
- ENH 5건 통합:
  1. **ENH-289** Layer 6 audit (P0→P1 강등 확정, 5/13 review)
  2. **ENH-298** Push event Defense (P1 격상)
  3. **ENH-303** PostToolUse continueOnBlock (P2→P1 + 차별화 #5)
  4. **ENH-310** Heredoc-pipe bypass defense (CC #58904 회귀 대응, 차별화 #6 신설)
  5. **MON-CC-NEW-PLUGIN-HOOK-DROP** SessionStart reachability sanity (P1)

### 2.2 Design (Phase 2~3)

- `docs/sprint/v2114/design.md` §3.3~§3.7 작성
- Layer 6 3-Tier: post-hoc audit → alarm → auto-rollback
- Heredoc detect API: 순수 함수 + frozen patterns
- Push guard 3 함수: detectPushCommand / classifyRemote / shouldGuard
- Recursion safety 3중 방어:
  1. audit-logger OTEL-only sink (no file callback)
  2. `_inLayer6Audit` 모듈 플래그
  3. try/finally 보장된 unset
- Rate-limit: rollback 5분 1회 (ROLLBACK_RATE_LIMIT_MS=300000)

### 2.3 Do (Phase 4)

**신규 모듈 4개** (980 LOC):

| 파일 | LOC | 역할 |
|------|----|-----|
| `lib/defense/heredoc-detector.js` | 315 | 23 frozen patterns (21 critical + 2 warning), 4 vector taxonomy (sub/pipe-shell/eval-source/sudo) |
| `lib/defense/push-event-guard.js` | 254 | fork/upstream/origin/unknown 분류 + force=deny + L4=ask |
| `lib/defense/layer-6-audit.js` | 359 | createLayer6Audit factory + Tier 1/2/3 + recursion guard |
| `lib/defense/index.js` | 52 | 3-모듈 barrel re-export |

**기존 모듈 수정 1개**:

- `lib/audit/audit-logger.js` ACTION_TYPES 20 → 27 (+7 신규)

**Hook 통합 5건**:

| 파일 | +LOC | 통합 내용 |
|------|------|---------|
| `scripts/unified-bash-pre.js` | +91 | Stage 2 heredoc-detector + Stage 3 push-event-guard |
| `scripts/unified-bash-post.js` | +66 | Layer 6 Tier 1 auditPostHoc + reachability ping |
| `scripts/unified-write-post.js` | +49 | Layer 6 Tier 1 + reachability ping |
| `scripts/skill-post.js` | +18 | reachability ping only |
| `hooks/session-start.js` | +51 | 14-day stale threshold + missing/stale audit emission |

**테스트 4 파일** (114 TCs):

| 파일 | Tier | TCs | 통과 |
|------|-----|-----|-----|
| `tests/qa/v2114-defense-heredoc.test.js` | L1 | 53 | 53/53 |
| `tests/qa/v2114-defense-layer-6.test.js` | L1+L2 | 35 | 35/35 |
| `tests/qa/v2114-defense-push-event.test.js` | L1 | 16 | 16/16 |
| `tests/contract/v2114-defense-contract.test.js` | L3 | 10 | 10/10 |

### 2.4 Check (Phase 5 Iterate)

`bkit:gap-detector` 측정:
- **matchRate: 96.5%** (M1 임계 90% 초과)
- Missing items: **0건**
- Extra items: 5건 (모두 NEUTRAL — 폴리시 향상)
- Naming drift: 5건 (모두 INFO/MINOR)
- §3.3 / §3.4 / §3.5 / §3.6 / §3.7 — **5/5 sections PASS**

**보강 권고 3건 (모두 비차단)**:

| ID | 항목 | 처리 |
|----|------|-----|
| R-LOW-1 | 패턴 수 (23 vs 설계 "30+") | 차후 incremental 확장 — vector taxonomy 완전 |
| R-LOW-2 | 설계 §1.1.7 ACTION_TYPES 수치 불일치 | **본 phase에서 정합화 완료** (20→27, 7 신규) |
| R-INFO-3 | WARNING_PATTERNS 분리 명시 | 차후 design revision 반영 |

### 2.5 Act (Phase 6 QA)

**Quality Gates 5/5 PASS**:

| Gate | 임계 | 결과 |
|------|-----|----|
| M1 matchRate ≥ 90% | 90.0 | **96.5%** ✅ |
| M2 Contract test PASS | 100% | **20/20** (10 v2114-caching + 10 v2114-defense) ✅ |
| M3 Unit test PASS | ≥95% | **174/174 = 100%** ✅ |
| M4 Domain purity | 0 forbidden | **17 files, 0 violations** ✅ |
| M5 Syntax validation | 0 errors | **모든 모듈 require OK** ✅ |

---

## 3. 차별화 moat 강화

### 3.1 차별화 #6 — Heredoc-pipe bypass defense (신설)

**문제**: CC v2.1.73~141 (#58904) 회귀 — Bash hook은 외부 쉘 명령 `cat <<EOF | bash` 패턴을 PreToolUse에서 인식 못함

**bkit 해결**:
- 23 frozen regex pattern (sub/pipe-shell/eval-source/sudo 4 vector)
- PreToolUse Stage 2에서 차단 + audit (`heredoc_bypass_blocked`)
- 자체 도그푸딩 입증 (본 sprint 중 inline 테스트 명령 자체가 차단됨 → 의도된 동작)

**CC native 동등 기능**: 없음 — bkit 단독 보유

### 3.2 차별화 #2 — Layer 6 audit (3-Tier 완전 구현)

**기존**: PreToolUse 차단 5-Layer만 존재
**확장**: post-hoc audit (Tier 1) + alarm (Tier 2) + auto-rollback (Tier 3, L4 only)

- 5분 rate-limit으로 rollback storm 방지
- recursion guard 3중 방어 (`_inLayer6Audit` 모듈 플래그 + OTEL-only sink + try/finally)
- 2026-04-22 audit-logger 682GB recursion incident 학습 적용

### 3.3 차별화 #5 — PostToolUse continueOnBlock

**ENH-303 P2→P1 격상 (5/13 review 확정)**: bash-post / write-post / skill-post 3-site wired
- CC native는 PostToolUse block을 silently swallow
- bkit은 `post_tool_block_recorded` 액션으로 audit + reason 보존

---

## 4. 회귀/Breaking 영향

| 항목 | 결과 |
|------|-----|
| 기존 Sub-Sprint 1 (Coordination) 60 TCs | **60/60 PASS** (회귀 0) |
| Sub-Sprint 2 신규 114 TCs | **114/114 PASS** |
| Domain Layer purity invariant | **유지** (17/17, 0 forbidden) |
| Port↔Adapter pair 수 | **8** (유지) |
| audit-logger ACTION_TYPES | 20 → 27 (확장만, 기존 보존) |
| Hook event 수 | 21 events / 24 blocks (유지) |
| 사용자 환경 영향 | **0** (`--plugin-dir .` local, 기존 사용자 미배포) |

---

## 5. /sprint, /pdca, /control 핵심 기능 검증

### 5.1 /sprint

- `docs/sprint/v2114/master-plan.md` SSoT 작동 — 19 sections 구조 유지
- Sub-Sprint 1 archived → Sub-Sprint 2 in_progress 전환 검증
- Sprint state file `.bkit/state/sprints/v2114-differentiation-release.json` 정합

### 5.2 /pdca

- 9-phase enum 준수: plan → design → do → check → act → qa → report → archive
- `gap-detector` 측정 → matchRate 자동 산출 → M1 gate 판정 정상
- ADR 0005 (frozen 9-phase enum) 위반 0건

### 5.3 /control

- L4 Full-Auto 모드 활성 (`.bkit/runtime/control-state.json`)
- Trust Level 기반 정책 분기 정상:
  - Push guard: L0~L3 fork 허용 / L4 ask
  - Layer 6 Tier 3 auto-rollback: **L4 only** (D-4 디자인 결정 준수)
- 5분 rate-limit으로 destructive op 폭증 방지

---

## 6. Lessons Learned

1. **도그푸딩 입증**: ENH-310 heredoc-detector가 본 sprint 중 inline 테스트 명령 자체를 차단 — 의도된 동작이자 자신의 방어 시스템 작동 입증
2. **메모리 정확성**: 사전 분석에서 ACTION_TYPES 실측 20 (메모리 19) 불일치 발견 → 즉시 정정 + Sub-Sprint 2 baseline 20→27
3. **Test 파일 구조**: `tests/qa/*.test.js` + `tests/contract/*.test.js` flat 구조 (메모리 subdirs 표기 오류 정정)
4. **Recursion safety**: 3중 방어 (audit OTEL-only + module flag + try/finally) — 단일 layer 의존 회피
5. **Design ↔ Impl drift**: ACTION_TYPES 수치 6 vs 7 불일치는 design revision으로 즉시 정합화 (R-LOW-2 closed)

---

## 7. Carry items → Sub-Sprint 3+

| ID | 우선순위 | 항목 | 대상 Sub-Sprint |
|----|---------|------|--------------|
| R-LOW-1 | LOW | Heredoc pattern 30+ 확장 (현재 23) | 4 (E Defense 확장) |
| R-INFO-3 | INFO | WARNING_PATTERNS 분리 design revision | 5 (Doc) |
| state-store.port adapter | MEDIUM | 본 sprint D-2 deferred 결정 — checkpoint-manager 직접 호출 사용 중 | 3 또는 4 |
| ENH-286 memory enforcer | P2 | 차별화 #1 — ACTION_TYPE slot `memory_directive_enforced` 이미 예약 | 4 (E Defense 확장) |

---

## 8. 종결 판정

✅ **Sub-Sprint 2 (Defense) — COMPLETED**
- 모든 Phase (Plan / Design / Do / Check / Act / QA / Report) 통과
- Quality Gate 5/5 PASS, matchRate 96.5%
- Sub-Sprint 3 (A Observability) 진입 차단 해제 (Task #13 unblock)

**다음 단계**: Task #12 completed → Task #13 (Sub-Sprint 3 A Observability) start
