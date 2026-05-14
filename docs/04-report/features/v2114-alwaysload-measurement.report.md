---
feature: v2114-alwaysload-measurement
enh: ENH-282
sub-sprint: 3 (A Observability)
status: baseline-captured (1-week trace pending user environment)
created: 2026-05-14
---

# ENH-282 — MCP `alwaysLoad` 측정 보고서 (Baseline)

> bkit v2.1.14 Sub-Sprint 3 A Observability
> Sub-Sprint 3에서 측정 인프라 + Baseline 수집, 1주 비교 측정은 사용자 환경 의존.

## 1. 측정 목적

CAND-005 → ENH-282 P1 격상 사유:
- v2.1.122 F10-122 `plugin.json` mcpServers 누락 fix → bkit `.mcp.json` 2 stdio servers (bkit-pdca + bkit-analysis) 활성
- `alwaysLoad: true` 옵션 활성 시 cold-start latency 회피 + 메모리 상시 점유 trade-off
- 1주 실측 데이터 기반 의사결정 (현재 `alwaysLoad` 필드 부재 = default false 동작)

## 2. 측정 방법

**Harness**: `scripts/measure-mcp-alwaysload.js`

각 server에 대해:
1. `node servers/<server>-server/index.js` 직접 spawn
2. 첫 stderr/stdout 바이트까지 시간 측정 (handshake-ready)
3. 2초 sampling 윈도우 동안 peak RSS 측정
4. OTEL endpoint 설정 시 `gen_ai.tool_call_count` 1건 emit (1주 누적용)

## 3. Baseline (2026-05-14, alwaysLoad=false)

| Server | Handshake | Peak RSS | Status |
|--------|-----------|----------|--------|
| `bkit-pdca` | **18.5 ms** | 39.5 MB | OK |
| `bkit-analysis` | **33.0 ms** | 39.9 MB | OK |

**환경**: macOS Darwin 24.6.0, Node v22.x, `--plugin-dir .`, OTEL endpoint 미설정.

## 4. 1주 비교 측정 계획 (Pending)

| Mode | 기간 | 측정 횟수 | 누적 metric |
|------|-----|---------|-----------|
| `alwaysLoad: false` (현재 default) | 7d | ≥50 invocation | gen_ai.tool_call_count, request_tokens, cache_read_tokens |
| `alwaysLoad: true` | 7d | ≥50 invocation | 동일 |

**판정 기준**:
- p50/p95 handshake latency 차이 ≥30% → `true` 권고
- 8h idle 메모리 점유 차이 ≥100MB → `false` 유지
- Cache hit rate (ENH-292와 결합) ≥40% 달성 시 `true` 유리

## 5. 의사결정 시점

- **2026-05-21** (1주 후): trace 검토 + 최종 권고
- Sub-Sprint 5 (Doc) 또는 v2.1.15 진입 시 `.mcp.json`에 `alwaysLoad` 필드 추가 또는 deferred 확정

## 6. 산출물

- `scripts/measure-mcp-alwaysload.js` (185 LOC, 측정 harness)
- `lib/infra/telemetry.js` `emitGenAI()` 통합 (gen_ai.tool_call_count emit)
- 본 보고서 (baseline + 1주 측정 후 update)

## 7. 다음 단계

- [ ] 사용자 환경에서 OTEL endpoint 설정 (langfuse / openlit / uptrace 0-config)
- [ ] `alwaysLoad: false` 1주 trace 누적
- [ ] `.mcp.json` `"alwaysLoad": true` 추가 후 1주 trace 누적
- [ ] 본 보고서 §3 갱신 + §5 의사결정 fix
