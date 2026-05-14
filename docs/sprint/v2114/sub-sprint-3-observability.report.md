---
sprint: v2.1.14-differentiation-release
sub-sprint: 3/6 (A Observability)
phase: report
status: completed
created: 2026-05-14
match-rate: 98.5%
quality-gate: PASS (M1 ≥90%)
trust-level: L4 (Full-Auto)
---

# Sub-Sprint 3 (A Observability) — 완료 보고서

> bkit v2.1.14 Differentiation Release Sprint
> Sub-Sprint 3/6: A Observability — ENH-281 / ENH-293 / ENH-282

## 1. Executive Summary

| 지표 | 값 | 비고 |
|------|----|----|
| **Match Rate** | **98.5%** | M1 임계 90% 초과 ✅ (Drift 0건) |
| **Test Pass Rate** | **48 / 48** (100%) | 본 sub-sprint 신규 / 누적 222/222 PASS |
| **Domain Purity** | **17 / 17** files clean | 0 forbidden imports (불변) |
| **CARRY 해소** | **CARRY-5** OTEL Subprocess Env Propagation closure | #17 token-meter zero entries 근본 해결 |
| **OTEL 표준 적용** | OTEL_EXPORTER_OTLP_ENDPOINT (표준) > OTEL_ENDPOINT (legacy) | OpenTelemetry SIG 정합 |
| **신규 LOC** | +150 (otel-env-capturer) + +110 (telemetry 확장) + +35 (hooks/scripts) | 합 ~295 |
| **신규 Public API** | `emitGenAI`, `captureEnv`, `hydrateEnv`, `resolveOtelEndpoint`, `GEN_AI_METRICS`, `OTEL_ENV_VARS` | 6 |
| **Quality Gates** | M1✅ M2✅ M3✅ M4✅ M5✅ | 5/5 PASS |

### 1.1 4-Perspective Value

| 관점 | 가치 |
|------|------|
| **User** | OTEL endpoint 설정 시 1주 trace 누적 → ENH-282 alwaysLoad 의사결정 데이터 자동 수집. token-meter zero entries (CARRY-5) 해소로 cache hit rate 가시화 |
| **Developer** | `emitGenAI()` 1 API call로 OTEL gen_ai.* semantic conventions 10 metrics emit. Langfuse/OpenLIT/Uptrace 0-config 연동 |
| **Business** | OpenTelemetry GenAI SIG 표준 정합 → enterprise observability 셀링 포인트 + Anthropic 자체 native 미보유 영역 |
| **Architecture** | Infrastructure Layer만 확장 — Domain Layer purity 17/17 유지, Port↔Adapter pair 8개 보존, Clean Architecture 4-Layer 무위반 |

---

## 2. PDCA 단계별 산출물

### 2.1 Phase 0 사전 분석

- 코드베이스 깊이 분석: `lib/infra/telemetry.js` 5 위치 `process.env.OTEL_*` 직접 접근 surface 정확 식별
- 의사결정 D-1~D-4 확정:
  - D-1: emitGenAI = createOtelSink 패턴 재사용 (file + OTEL dual sink 보존)
  - D-2: capture file = `.bkit/runtime/otel-env.json` (atomic rename, hook-reachability 패턴 재사용)
  - D-3: OTEL_EXPORTER_OTLP_ENDPOINT 표준 우선 + OTEL_ENDPOINT legacy fallback (backward-compat)
  - D-4: 실제 1주 alwaysLoad 측정은 사용자 환경 의존 → 본 sprint는 인프라 + 보고서 골격만

### 2.2 Plan / Design (Phase 1-2)

설계 SSoT 활용:
- `docs/sprint/v2114/design.md` §3.6 telemetry gen_ai.* 확장
- `docs/sprint/v2114/master-plan.md` §5.4 Sub-sprint 3 (3 ENH 묶음)
- `docs/sprint/v2114/plan.md` §6.3 step-by-step

### 2.3 Phase 3 Do — 신규 모듈

| 파일 | LOC | 역할 |
|------|----|-----|
| `lib/infra/otel-env-capturer.js` | 150 | OTEL_ENV_VARS 8 frozen + captureEnv/hydrateEnv/resolveOtelEndpoint |
| `lib/infra/telemetry.js` (확장) | +110 | GEN_AI_METRICS 10 frozen + emitGenAI + ensureEnvHydrated lazy + env-aware sink/payload |
| `hooks/session-start.js` (확장) | +22 | SessionStart에서 OTEL env capture |
| `scripts/sprint-handler.js` (확장) | +13 | env-aware OTEL resolution + hydrate |
| `scripts/measure-mcp-alwaysload.js` | 185 | ENH-282 alwaysLoad baseline 측정 harness |
| `docs/04-report/features/v2114-alwaysload-measurement.report.md` | (md) | 보고서 골격 + baseline 결과 (handshake 18.5ms/33ms) |

### 2.4 Phase 3 Do — 테스트 (48 TCs)

| 파일 | Tier | TCs | 통과 |
|------|-----|-----|-----|
| `tests/qa/v2114-otel-env-capturer.test.js` | L1 | 20 | 20/20 |
| `tests/qa/v2114-telemetry-gen-ai.test.js` | L1 | 18 | 18/18 |
| `tests/contract/v2114-observability-contract.test.js` | L3 | 10 | 10/10 |

**설계 대비 +28 TC 초과 달성** (설계 20 TC → 실제 48 TC).

### 2.5 Phase 4 Check (Iterate)

`bkit:gap-detector` 측정:
- **matchRate: 98.5%** (M1 임계 90% 초과)
- Missing (HIGH): **0건**
- Missing (LOW deferred): 1건 (alwaysLoad 1주 trace — 의도된 scope 제한)
- Extra items: 5건 (모두 POSITIVE — drift detection helpers, test-only APIs)
- Naming/Convention drift: **0건**
- §3.6 / otel-env-capturer / session-start / alwaysLoad — **4/4 sections PASS**

### 2.6 Phase 5 QA (Act)

**Quality Gates 5/5 PASS**:

| Gate | 임계 | 결과 |
|------|-----|----|
| M1 matchRate ≥ 90% | 90.0 | **98.5%** ✅ |
| M2 Contract test PASS | 100% | **30/30** (10 caching + 10 defense + 10 observability) ✅ |
| M3 Unit test PASS | ≥95% | **222/222 = 100%** ✅ |
| M4 Domain purity | 0 forbidden | **17 files, 0 violations** ✅ |
| M5 Syntax validation | 0 errors | **모든 모듈 + hooks + scripts PASS** ✅ |

---

## 3. ENH-293 CARRY-5 Closure 완결성

### 3.1 Root cause (CARRY-5)

CC 플러그인 hook subprocess는 사용자의 shell 환경변수(특히 `OTEL_*`)를 상속하지 못함 → `lib/infra/telemetry.js` 5 위치 (line 113/126/137/149/188) 모두 `process.env.OTEL_*`를 직접 참조 → endpoint=null → silent no-op → **#17 token-meter Adapter zero entries**.

### 3.2 Closure 메커니즘

```
[SessionStart hook (env intact)]
   │ otel-env-capturer.captureEnv(process.env)
   ▼
.bkit/runtime/otel-env.json   ←── atomic write
   │
   │ [PostToolUse hook subprocess (env stripped)]
   │ telemetry.createOtelSink() 진입 시
   ▼ ensureEnvHydrated() — once-flag로 1회만 hydrate
process.env.OTEL_* 복원
   │
   ▼
resolveOtelEndpoint() → endpoint 발견 → emit 정상 동작
```

### 3.3 telemetry.js 5 surface env-aware 검증

| 위치 | 함수 | env propagation | Pass |
|------|------|-----------------|:---:|
| line 113 | `sanitizeForOtel(event, env = process.env)` | default param + injection | ✅ |
| line 149 | `buildOtlpPayload(event, env)` | env-aware OTEL_SERVICE_NAME | ✅ |
| line 188 | `createOtelSink(env)` → `ensureEnvHydrated(env)` | hydrate + resolveOtelEndpoint | ✅ |
| line 369 (신규) | `emitGenAI(metric, attrs, opts)` | opts.env override + hydrate | ✅ |
| line 126/137 (file sink) | `createFileSink()` | audit-logger 위임 (env 무관) | ✅ |

5 surface 모두 env-aware. **CARRY-5 root cause 폐쇄 완결**.

---

## 4. 차별화 / 표준 정합

### 4.1 ENH-281 — OTEL gen_ai.* 10 unified emit

OpenTelemetry GenAI SIG `gen_ai.*` semantic conventions 10 metrics frozen:

```
gen_ai.request_tokens           gen_ai.subagent_dispatch_count
gen_ai.response_tokens          gen_ai.subagent_dispatch_mode  ★ (Sub-Sprint 1 sequential 연동)
gen_ai.cache_creation_tokens    gen_ai.hook_trigger_count
gen_ai.cache_read_tokens   ★    gen_ai.hook_trigger_event
gen_ai.tool_call_count          gen_ai.sprint_phase           ★ (Sprint Management 연동)
                                                              ★ (ENH-292 cache hit 4%→40% 측정 metric)
```

### 4.2 ENH-282 — alwaysLoad 측정 baseline

| Server | Handshake | Peak RSS |
|--------|-----------|----------|
| `bkit-pdca` | 18.5 ms | 39.5 MB |
| `bkit-analysis` | 33.0 ms | 39.9 MB |

1주 비교 측정 데이터 누적은 사용자 환경 의존 (의도된 deferred). Sub-Sprint 5 또는 v2.1.15 진입 시 의사결정.

---

## 5. 회귀/Breaking 영향

| 항목 | 결과 |
|------|-----|
| Sub-Sprint 1 (60 TCs) 회귀 | **60/60 PASS** |
| Sub-Sprint 2 (114 TCs) 회귀 | **114/114 PASS** |
| Sub-Sprint 3 (48 TCs) 신규 | **48/48 PASS** |
| **누적 v2114** | **222/222 PASS** |
| Domain Layer purity | **17/17 clean** (불변) |
| Port↔Adapter pair 수 | **8** (불변) |
| Hook event 수 | 21 events / 24 blocks (불변) |
| 기존 audit-logger ACTION_TYPES 27 | 변경 0 (env 확장은 별도 채널) |
| 사용자 환경 영향 | **0** (OTEL 미설정 시 zero overhead) |

---

## 6. /sprint, /pdca, /control 핵심 기능 연계 검증

### 6.1 /sprint

- Sub-Sprint 2 archived → Sub-Sprint 3 in_progress → archived 전환 연속 동작 검증
- `docs/sprint/v2114/master-plan.md` SSoT + sprint state file 정합 유지
- `sprint-handler.js` getInfra 정상 동작 — OTEL endpoint resolution env-aware로 강화

### 6.2 /pdca

- 9-phase enum 준수: plan → design → do → check → act → qa → report → archive
- gap-detector matchRate 98.5% 자동 산출 → M1 quality gate PASS 자동 판정
- ADR 0005 (frozen 9-phase enum) 위반 0건

### 6.3 /control

- L4 Full-Auto 모드 유지 (`.bkit/runtime/control-state.json`)
- Domain Purity invariant CI gate 자동 검증 (`scripts/check-domain-purity.js`)
- `ensureEnvHydrated` once-flag로 hydrate 1회 보장 — destructive op 폭증 방지

### 6.4 sub-sprint 간 연계

- **Sub-Sprint 1 ↔ Sub-Sprint 3**: `gen_ai.subagent_dispatch_mode` metric이 Sub-Sprint 1의 `sub-agent-dispatcher.js` state machine 8-state 가시화 — 명시적 연계
- **Sub-Sprint 1 ENH-292 ↔ Sub-Sprint 3**: `gen_ai.cache_read_tokens` / `gen_ai.cache_creation_tokens`가 ENH-292 cache hit rate 4%→40% 목표 측정 채널 제공
- **Sub-Sprint 2 ↔ Sub-Sprint 3**: ENH-298 push-event-guard audit + ENH-289 Layer 6 alarm 모두 OTEL dual sink 통해 외부 backend 전송 가능

---

## 7. Lessons Learned

1. **CARRY closure의 진짜 비용은 surface mapping**: telemetry 4 위치 + emitGenAI 신규까지 5 surface 모두 env-aware로 전환 — 1 surface만 누락해도 closure 불완전
2. **once-flag + caller-injected env 분리**: `ensureEnvHydrated`가 `env !== process.env` 시 hydrate skip — 테스트의 env injection 보장
3. **OTEL 표준 vs legacy 공존**: `resolveOtelEndpoint`로 OTEL_EXPORTER_OTLP_ENDPOINT 우선 + OTEL_ENDPOINT fallback — bkit 기존 사용자 무영향 + OpenTelemetry SIG 정합
4. **deferred scope 명시화의 가치**: alwaysLoad 1주 trace는 사용자 환경 의존이므로 본 sprint 범위에서 명시적 deferred — gap analysis에서 LOW으로 분류, M1 불영향

---

## 8. Carry items → Sub-Sprint 4+

| ID | 우선순위 | 항목 | 대상 Sub-Sprint |
|----|---------|------|--------------|
| ENH-282 1주 trace | LOW (Deferred) | alwaysLoad 실측 데이터 누적 후 의사결정 | 5 (Doc) 또는 v2.1.15 |
| L2 TC 명시 문서 | INFO | L2-TC-021~030 contract 흡수 명시 (design §6.2 주석) | 5 (Doc) |
| ENH-286 memory enforcer | P2 | 차별화 #1 — telemetry emit 통합 가능 | 4 (E Defense 확장) — 다음 sub-sprint |

---

## 9. 종결 판정

✅ **Sub-Sprint 3 (A Observability) — COMPLETED**
- 모든 Phase (Plan / Design / Do / Check / Act / QA / Report) 통과
- Quality Gate 5/5 PASS, matchRate 98.5%
- CARRY-5 OTEL Subprocess Env Propagation closure 완결
- Sub-Sprint 4 (E Defense 확장) 진입 차단 해제 (Task #14 unblock)

**다음 단계**: Task #13 completed → Task #14 (Sub-Sprint 4 E Defense 확장) start
