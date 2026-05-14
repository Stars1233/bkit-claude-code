# ADR 0010 — Effort-aware Invariant (ADR 0003 invariant 10 신설)

> Status: Accepted
> Date: 2026-05-14
> Sprint: v2.1.14-differentiation-release Sub-Sprint 4 archived
> Related: ADR 0003 (CC version impact empirical validation), ENH-307

## Context

CC v2.1.133+ 가 `effort.level` 필드를 hook payload (`tool_input.effort.level`) 와 `$CLAUDE_EFFORT` env 양쪽으로 노출했다. bkit 차별화 #4 (ENH-300 Effort-aware Adaptive Defense) 는 이 필드를 defense intensity 및 audit verbosity 분기 신호로 활용한다.

다만:
- 필드는 모델 자체 보고 (advisory) — 신뢰성 보장 없음
- CC validator 가 enum 외 값을 거부하지 않음 — 임의 문자열 가능
- 미설정 / 빈 문자열 / 타입 mismatch 가 downstream defense module 을 silent disable 시킬 위험

이는 ADR 0003 의 "회귀 0건 + 호환 보존" 원칙에 직접 충돌한다. invariant 가드 가 필요하다.

## Decision

ADR 0003 invariant 9 → **10** 으로 영구 확장한다.

**Invariant 10 (Effort-aware):**

> Effort-aware defense intensity MUST be bound to a valid `effort.level` value of `'low' | 'medium' | 'high'`. Any out-of-range value (null/empty/misspelled/extended type) must be flagged so downstream defense modules degrade safely instead of silently disabling guards.

**Enforcement:**

1. `lib/domain/guards/invariant-10-effort-aware.js` (Domain Layer, pure module — Domain Purity 18/18 maintained)
2. `check(ctx) → {hit, meta?}` API — meta 에 severity (HIGH/MEDIUM) + kind (out-of-range/type-mismatch/empty-string) 분류 포함
3. `normalize(raw) → 'low'|'medium'|'high'` — 보수적 fallback 'medium'
4. `VALID_EFFORT_LEVELS` Object.freeze 3 entries
5. `removeWhen(ccVersion) → false` — 영구 invariant, 제거 불가
6. `scripts/check-domain-purity.js` CI gate 가 17 → 18 files 자동 검증

## Consequences

### Positive

- bkit 차별화 #4 (Effort-aware) baseline 안정화 — out-of-range 입력으로 인한 silent disable 영구 차단
- Domain Layer Purity 18/18 유지 (ENH-307 자체가 0 forbidden imports)
- audit verbosity 분기 (low → terse, high → verbose) 안전하게 적용 가능
- CC 가 향후 `effort.level` enum 확장 시 (예: 'critical') 본 invariant 가 자동 알림

### Negative

- enum 확장 시 본 invariant 갱신 필요 (수동 작업 — VALID_EFFORT_LEVELS frozen 배열 갱신 + 테스트)
- 모든 `effort.level` 소비 모듈이 `normalize()` 호출 의무화 (lint/CI 미강제, 코드 리뷰 의존)

### Neutral

- ADR 0003 의 9 → 10 expansion 은 사용자 영향 0 (내부 invariant)
- `unified-bash-pre.js` Stage 4 에서 normalize() 사용 — 1줄 추가

## Alternatives Considered

### A1: Schema validation only (no enum guard)

- 장점: 단순, 추가 모듈 불필요
- 단점: out-of-range 값이 통과 → silent disable 위험 잔존
- 거부: ADR 0003 회귀 0건 원칙 위배

### A2: Runtime warning only (no normalize fallback)

- 장점: 명시적 신호
- 단점: defense module 이 raw 값 직접 사용 시 여전히 disable 가능
- 거부: defense-in-depth 원칙 위배

### A3: Domain Port + Adapter pair 신설 (Port↔Adapter)

- 장점: Clean Architecture 정합
- 단점: pure value validation 에 과한 abstraction (YAGNI)
- 거부: 본 invariant 는 deterministic guard, port 추상화 불필요

## Validation

| 항목 | 결과 |
|------|------|
| Domain Layer Purity | 18 files, 0 forbidden imports |
| L1 unit tests | 15 TCs PASS (`tests/qa/v2114-invariant-10-effort-aware.test.js`) |
| L3 contract test | C-04/C-05/C-10 PASS (`tests/contract/v2114-e-defense-contract.test.js`) |
| Integration | `scripts/unified-bash-pre.js` Stage 4 normalize() 통합 검증 완료 |

## References

- `lib/domain/guards/invariant-10-effort-aware.js` — 구현
- `docs/sprint/v2114/sub-sprint-4-e-defense.report.md` — Sub-Sprint 4 종결 보고서
- `docs/adr/0003-cc-version-impact-empirical-validation.md` — 부모 ADR
- ENH-307 (Sub-Sprint 4) — ADR 0003 invariant 10 신설 트래커
- CC v2.1.133 F4-133 — `effort.level` 표면 등장 사이클
