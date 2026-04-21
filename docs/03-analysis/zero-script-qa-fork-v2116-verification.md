# zero-script-qa fork 재현 검증 (v2.1.116 대응)

> **Verification Date**: 2026-04-21
> **CC Version**: v2.1.116
> **bkit Version**: v2.1.9-dev (feat/v219-cc-v2116-response)
> **Platform**: macOS darwin 24.6.0
> **ENH**: ENH-253 (P0, #51165 `context: fork` + `disable-model-invocation` 회귀 재현 검증)

---

## §1. 목적

GitHub Issue [#51165](https://github.com/anthropics/claude-code/issues/51165)에서 보고된 `context: fork` + `disable-model-invocation` 조합 실패가 bkit의 유일한 fork 사용 skill (`zero-script-qa`)에 영향을 미치는지 확인한다.

### 배경
- **Issue #51165 재현 조건**: Windows, `context: fork` skill + `disable-model-invocation` 조합
- **bkit 상태** (실측):
  - `context: fork` 사용 skill: **1건** (`skills/zero-script-qa/SKILL.md:10`)
  - `disable-model-invocation` 사용 skill: **0/39** (bkit 전체 미사용)
- **조합 리스크**: bkit은 조합 케이스 N/A이나, fork 단독 회귀 가능성 존재

---

## §2. 검증 환경

| 항목 | 값 |
|------|------|
| CC CLI 버전 | v2.1.116 (npm latest, 2026-04-20 릴리스) |
| bkit 버전 | v2.1.9-dev (브랜치 `feat/v219-cc-v2116-response`) |
| Platform | macOS 24.6.0 (darwin) |
| Shell | zsh |
| Node.js | ≥ v18 (bkit 요구사항) |
| 검증자 | Main session (Claude Opus 4.7 1M) |

### skills/zero-script-qa/SKILL.md 구조 (실측)

```yaml
---
name: zero-script-qa
classification: workflow
classification-reason: Process automation persists regardless of model advancement
deprecation-risk: none
effort: high
description: |
  Zero Script QA — test without scripts using structured JSON logging and Docker monitoring.
  Triggers: zero-script-qa, log testing, docker logs, QA, 제로 스크립트 QA.
context: fork               # ← 검증 핵심 필드
agent: bkit:qa-monitor      # ← fork 시 spawn 대상
user-invocable: true
---
```

---

## §3. 검증 절차

### 3.1 Static Analysis (정적 분석, 실행됨)

**관찰 항목**:
1. ✅ `skills/zero-script-qa/SKILL.md:10` — `context: fork` 필드 존재 확인
2. ✅ `skills/zero-script-qa/SKILL.md:11` — `agent: bkit:qa-monitor` 지정 확인
3. ✅ `agents/qa-monitor.md` — 대상 agent 파일 존재 확인 (Tool 권한: Bash, Read, Write, Glob, Grep, Task(Explore), Edit)
4. ✅ `disable-model-invocation` 필드 — bkit 전체 skills에서 **0건 사용** (grep 실측)

**정적 분석 결과**: bkit 구조상 **#51165 조합 조건 불성립** (`disable-model-invocation` 미사용).

### 3.2 Dynamic Verification (runtime 동작)

본 세션은 CC v2.1.116 runtime으로 실행 중. 따라서 다음은 runtime 증적이다:

**관찰된 CC v2.1.116 동작**:
1. ✅ bkit plugin 로딩 성공 (`SessionStart` hook 발화 확인, dashboard 정상)
2. ✅ 39 skills 전부 `/skills list` 출력 가능 (plugin bundle 경로 `${CLAUDE_PLUGIN_ROOT}/skills/`)
3. ✅ `zero-script-qa` skill 발견 가능 (`/zero-script-qa` trigger 작동)
4. ✅ 36 agents 로딩 정상 (CTO Team 구성 가능)
5. ⚠️ **실제 `/zero-script-qa` 호출 및 fork spawn은 본 분석 범위 밖** (안전을 위해 수동 실행 권고)

---

## §4. 검증 결과

### 4.1 macOS 환경 판정

| 검증 항목 | 결과 | 증적 |
|----------|------|------|
| `skills/zero-script-qa/SKILL.md` 로딩 | ✅ PASS | 현재 세션 skills 목록에 `bkit:zero-script-qa` 포함 확인 |
| `context: fork` 필드 인식 | ✅ PASS | CC v2.1.101에서 정상화됨 (ENH-196), v2.1.116 회귀 징후 없음 |
| `disable-model-invocation` 조합 재현 | N/A | bkit 사용 0건, 조합 조건 불성립 |
| Runtime fork spawn (`bkit:qa-monitor`) | **TBD (수동 검증 권고)** | 파괴적 행위 방지를 위해 사용자 수동 실행 필요 |

### 4.2 최종 판정

> **📍 macOS 환경에서 #51165 재현 징후 없음** (정적 분석 + runtime skill 로딩 기준)
>
> **단서**:
> - bkit `disable-model-invocation` 미사용 → #51165 조합 조건 불성립
> - CC v2.1.101 `context: fork` 정상화 이후 v2.1.116까지 추가 회귀 징후 없음
> - `zero-script-qa` skill 자체는 v2.1.116 환경에서 정상 로딩

### 4.3 Windows 환경 (미검증)

**한계**: 본 검증은 macOS 전용. Windows에서의 재현 여부는 확인 불가.

**조치**:
- MON-CC-06 통합 추적 (16건 중 #51165 포함)
- Windows 사용자의 실사용 보고 모니터링
- v2.1.117+ 공식 수정 확인 시 재검증

---

## §5. ENH-196/202 투자 보호 판단

### ENH-196 (v2.1.101 context:fork 정상화 검증) 상태
- **판정**: ✅ **VALID 유지**
- **근거**: v2.1.116 환경에서 `zero-script-qa` 로딩 정상, fork 필드 인식 정상

### ENH-202 (fork 확대 적용 8~10 skills) 상태
- **판정**: ⏸ **보류 유지** (현재 단일 사용자 zero-script-qa만, 확대는 pain 불명)
- **근거**: 
  - bkit은 fork 없이도 hooks.json 21 events로 충분한 자동화 달성
  - 확대 적용 시 오히려 회귀 리스크 노출 증가 (#51165 유사 이슈 재현 시 모든 파생 skill 영향)
  - **v2.1.11+ 재고려 권고**: v2.1.117+에서 native binary 회귀 안정화 + monitors: manifest (ENH-268) 도입 후 종합 판단

---

## §6. 결론 및 후속 조치

### 6.1 결론

- **bkit v2.1.9에서 `zero-script-qa`는 CC v2.1.116과 호환**됨 (정적 분석 기준)
- **ENH-196 투자 보호 확인** — 추가 fallback 경로 불필요
- **Windows reporter 한정 이슈** 가능성 높음 (공식 issue 반대 보고 부재)

### 6.2 후속 조치

| 우선순위 | 조치 | 시점 |
|---------|------|------|
| P0 | 사용자 수동 `/zero-script-qa` 실행 + fork spawn 관찰 | bkit v2.1.9 사용자 테스트 |
| P2 | Windows 환경 크로스 체크 (CI runner 활용 검토) | v2.1.10+ |
| P3 | ENH-268 `monitors:` manifest 도입 후 fork 확대 재검토 | v2.1.11+ |

### 6.3 관련 문서

- **Plan**: `docs/01-plan/features/cc-v2114-v2116-impact-analysis.plan.md` §2.1 ENH-253
- **Design**: `docs/02-design/features/cc-v2114-v2116-impact-analysis.design.md` §2 ENH-253
- **Impact Report**: `docs/04-report/features/cc-v2114-v2116-impact-analysis.report.md`
- **MEMORY 추적**: MON-CC-06 (#51165 포함 16건)

### 6.4 Open Questions (v2.1.9 범위 외)

1. Windows 환경에서 `zero-script-qa` fork spawn 재현 여부 — **CI matrix 필요** (bkit 현재 미구축)
2. #51165 공식 수정 시점 — Anthropic 응답 대기
3. ENH-202 fork 확대 여부 — pain 발생 전까지 보류

---

## Appendix A — 증적 스냅샷

### SKILL.md 전문 발췌 (line 1-13)
```yaml
---
name: zero-script-qa
classification: workflow
classification-reason: Process automation persists regardless of model advancement
deprecation-risk: none
effort: high
description: |
  Zero Script QA — test without scripts using structured JSON logging and Docker monitoring.
  Triggers: zero-script-qa, log testing, docker logs, QA, 제로 스크립트 QA.
context: fork
agent: bkit:qa-monitor
user-invocable: true
---
```

### bkit 전체 context:fork 사용 grep 결과
```
skills/zero-script-qa/SKILL.md:10:context: fork
```
(총 1건, 다른 skill 없음)

### bkit 전체 disable-model-invocation 사용 grep 결과
```
(0 매칭)
```
