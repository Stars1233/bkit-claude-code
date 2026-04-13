# bkit v2.1.5 종합 개선 계획서

## 개요

| 항목 | 내용 |
|------|------|
| Feature | bkit-v215-comprehensive-improvement |
| 버전 | 2.1.5 |
| 작성일 | 2026-04-13 |
| 우선순위 | P0 |
| 상태 | Plan |

## 배경

bkit v2.1.5 릴리스의 최종 품질 패스. 세 가지 핵심 문제를 해결한다:

1. **P0: 3개 핵심 모듈 index.js 누락** — `lib/audit/`, `lib/control/`, `lib/quality/`에 index.js가 없어 `require('./lib/audit')` 실패
2. **P0: PDCA 상태 오염** — pdca-status.json에 28개 테스트/디버그 아티팩트 존재
3. **P1: lib/adapters/ 빈 디렉토리** — 빈 하위 디렉토리(claude/, local/)만 존재하는 데드 디렉토리

## 범위

### 작업 항목

| # | 작업 | 파일 | LOC | 위험도 |
|---|------|------|-----|--------|
| 1 | lib/audit/index.js 생성 | lib/audit/index.js | ~15 | Low |
| 2 | lib/control/index.js 생성 | lib/control/index.js | ~20 | Low |
| 3 | lib/quality/index.js 생성 | lib/quality/index.js | ~15 | Low |
| 4 | PDCA 상태 정리 | .bkit/state/pdca-status.json | N/A | Low |
| 5 | 빈 디렉토리 제거 | lib/adapters/ | N/A | Low |
| 6 | CHANGELOG v2.1.5 추가 | CHANGELOG.md | ~40 | Low |

### Export 충돌 분석

- **audit**: `generateUUID` — audit-logger, decision-tracer 양쪽 export (동일 소스 `core/constants`). 후순위 모듈 값으로 덮어쓰기 허용 (동일 참조).
- **control**: 충돌 없음 (7개 모듈 전체 고유)
- **quality**: `resolveAction` — gate-manager export. control의 automation-controller도 export. **모듈 간 충돌이므로 주의 필요** (단, index.js는 모듈 내부만 통합).

### 제외 항목
- lib/adapters/ 내부 파일 생성 (YAGNI — 필요시 v2.2.0에서 구현)

## 성공 기준

1. `require('./lib/audit')` — 정상 로드, 18+ exports
2. `require('./lib/control')` — 정상 로드, 40+ exports
3. `require('./lib/quality')` — 정상 로드, 15+ exports
4. PDCA 상태에 테스트 아티팩트 0건
5. lib/adapters/ 디렉토리 미존재
6. CHANGELOG v2.1.5 항목 포함
7. Pre-release scanner: 0 CRITICAL
8. 전체 43/43 단위 테스트 PASS

## 일정

| 단계 | 예상 시간 |
|------|-----------|
| Plan | 5분 |
| Design | 5분 |
| Do | 15분 |
| Check | 5분 |
| QA | 10분 |
| Report | 5분 |
| **합계** | **~45분** |
