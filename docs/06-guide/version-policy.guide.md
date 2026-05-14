# bkit ↔ Claude Code 버전 정책 가이드

> bkit v2.1.14 Sub-Sprint 5 (Doc) 산출물
> ENH-309 release_drift_score 정식화 + dist-tag 3-Bucket Decision Framework
> ENH-290 정식 편입 (cc-v2116-v2123 §4.4)

## 1. 개요

bkit은 Claude Code (CC) CLI 의 플러그인이며, CC 의 빈번한 minor/patch 릴리스 (월 ~10건 페이스, 2026-04 ~ 2026-05 측정) 환경에서 **회귀 0건 + 호환 보존**을 핵심 가치로 운영한다. 본 가이드는 사용자 / 메인테이너가 어떤 CC 버전을 권고받는지, 그 결정이 어떤 데이터에 근거하는지 명문화한다.

## 2. dist-tag 3-Bucket Decision Framework (ENH-290 정식)

npm `@anthropic-ai/claude-code` 패키지는 3개 dist-tag 를 통해 사용자를 buckets 으로 분기한다.

| Tag | 용도 | 정책 |
|-----|------|------|
| `stable` | Production 사용자 — 안정성 우선 | bkit 권고 (보수적) 의 SSoT. 단, npm publisher 의 promotion 시점 차이로 bkit 권고와 +N drift 가능 |
| `latest` | 개발자 — 최신 기능 | bkit 권고 (균형) 후보. 1-cycle 관찰 후 격상 |
| `next` | 메인테이너 — preview | bkit dogfooding 용. `latest` 와 통합/분기 패턴 관찰 |

**drift 측정 (release_drift_score)**:

```
release_drift_score = | npm dist-tag(stable) version  -  bkit recommended (보수적) version |
                       (소버전 차이를 정수로 환산)
```

- 0~3 drift: 권고 일치, 사용자 안내 불필요
- 4~7 drift: warning — README/CHANGELOG 갱신 권장
- 8+ drift: critical — 사용자 안내 + 강제 갱신 검토

본 메모리는 5/14 측정 기준: stable=v2.1.128, bkit 권고 (보수적)=v2.1.123 → drift **+5 (warning zone)**.

## 3. bkit recommended 정책 (이중 트랙)

### 3.1 보수적 (Conservative)

- **현재**: v2.1.123 (2026-04-29 검증 완료)
- **기준**: ADR 0003 사후 검증 ≥4 cycle PASS + 회귀/Breaking 0건 + bkit 무수정 작동
- **권고 대상**: production / enterprise 사용자

### 3.2 균형 (Balanced)

- **현재**: v2.1.140 (5/13 검증 완료, v2.1.141 신규 회귀 #58904 + #58909 1-cycle 관찰 후 격상 검토)
- **기준**: 최신 latest 에서 1-cycle (3-7일) 관찰 + bkit 차별화 자동수혜 ≥1건
- **권고 대상**: 개발자 / 신기능 활용 사용자

## 4. R-Series 회귀 패턴

CC 릴리스에서 반복적으로 관찰되는 회귀 패턴을 표준화:

| 패턴 | 정의 | 사례 |
|-----|------|------|
| **R-1** Silent npm publish | dist-tag 승격 없이 npm publish | v2.1.115/120/124/125/127/129 (6건) |
| **R-2** True semver skip | 정수 minor 건너뜀 | v2.1.130 (단독), v2.1.134/135 (skip), 18-cycle 윈도우 50% |
| **R-3** Safety hooks 무시 | 모델이 CLAUDE.md/safety directive 무시 | numbered #145 정체 + dup-closure 5건 + evolved 12+건 |

**R-3 evolved-form tracker** (ENH-296, ENH-286 motivation):

CC R-3 시리즈는 단순 numbered violation 외에 **evolved form** 으로 누적된다. bkit 은 evolved form 을 별도로 카운트하여 ENH-286 Memory Enforcer 정당성을 입증한다.

```
numbered:    #54178 #54129 #54123 #54058 #53816 (모두 5/1 dup-closure)
evolved:    #56333 #56450 #56395 #56394 #56393 #56383 #56418 #56447
            #56865 #56884 #57317 #57485 #58887 (12+건, v2.1.141 +1)
```

evolved form 추적은 `agents/cc-version-researcher.md` 가 매 CC 버전 분석마다 누적한다.

## 5. 환경 예외

| 환경 | 권고 버전 | 사유 |
|------|---------|------|
| macOS 11 | v2.1.112 | 이후 OS minimum 상향 |
| non-AVX CPU | v2.1.112 | binary 의존 |
| Windows parenthesized PATH | v2.1.114+ | 경로 파싱 fix |
| Windows + Stop hook 의존 | v2.1.125↓ 또는 SessionEnd fallback | Stop hook OS-aware 회귀 |

## 6. 사용자 안내 시점

다음 중 하나라도 발생 시 README + CHANGELOG 갱신:

1. drift ≥ 4 (warning zone 진입)
2. 신규 R-1/R-2 발생
3. R-3 evolved form 누적 +5 이상
4. bkit 차별화 신규 발견 (예: #6 Heredoc bypass)
5. ADR 0003 사후 검증 FAIL

## 7. SSoT 참조

- 권고 버전 갱신: `MEMORY.md` "CC recommended" 섹션
- R-Series 누적: `memory/cc_version_history_v2***.md` 시리즈
- ADR 0003 invariant: `docs/adr/0003-cc-version-impact-empirical-validation.md`
- Sub-Sprint carry slot: `.bkit/state/sprints/v2114-differentiation-release.json`

## 8. bkit 차별화 6건

ENH-290 Bucket Framework 와 결합 시 bkit 가 production-ready 인 이유는 6 개 product moat:

| # | 차별화 | ENH | Sub-Sprint |
|:-:|------|-----|---------|
| 1 | Memory Enforcer (CC advisory → enforced) | ENH-286 | 4 archived |
| 2 | Defense Layer 6 (post-hoc audit + alarm + auto-rollback) | ENH-289 | 2 archived |
| 3 | Sequential dispatch (sub-agent caching 10x 회피) | ENH-292 | 1 archived |
| 4 | Effort-aware Adaptive Defense | ENH-300 | 4 archived |
| 5 | PostToolUse continueOnBlock | ENH-303 | 2 archived |
| 6 | Heredoc-pipe bypass defense (CC #58904 회귀 면역) | ENH-310 | 2 archived |
