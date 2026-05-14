# CC 버전 모니터링 가이드 — Stale-Lock Dedup + R-3 Evolved-form Tracker

> bkit v2.1.14 Sub-Sprint 5 (Doc) 산출물
> ENH-306 (Stale lock dedup doc) + ENH-296 (R-3 Evolved-form Tracker)

## 1. 목적

CC GitHub issues 모니터링에서 동일 root cause 가 여러 형태로 신고/closure 되는 패턴 (stale-lock dedup) 과, 모델의 safety directive 무시 회귀가 numbered violation 외에 evolved form 으로 진화하는 패턴 (R-3 evolved) 을 표준 절차로 정의한다.

## 2. Stale-Lock Dedup 패턴 (ENH-306)

### 2.1 정의

CC issue 가 release 일 이전 / 직후 에 closure 되었지만 동일 root cause 가 다시 신고되는 경우. 5/1 dup-closure 5건 (#54178/54129/54123/54058/53816) 사례가 대표적.

### 2.2 표기 통일

`memory/cc_version_history_*.md` 와 `MEMORY.md` 양쪽에서 일관성 있게 추적:

```
- numbered violation:  주 issue 번호 (예: #54178 violation #145)
- dup-closure:         같은 root cause 의 추가 issue 번호 (5/1 closed)
- evolved form:        다른 표현으로 재발한 issue 번호 (closure 무관, OPEN)
- streak:              N 릴리스 연속 미해소 시 N-streak 명시 (예: #56293 11-streak)
```

### 2.3 운영 절차

1. 신규 CC 버전 분석 시 `agents/cc-version-researcher.md` 가 GitHub issues 검색
2. **CLOSED** 이지만 root cause 미해결인 경우 → dup-closure 로 분류
3. 새 표현으로 OPEN 된 경우 → evolved form 로 분류
4. 동일 회귀가 N 릴리스 연속 → N-streak counter 명시

## 3. R-3 Evolved-form Tracker (ENH-296)

### 3.1 누적 12+건 (v2.1.141 기준)

R-3 시리즈는 "모델이 safety hooks / CLAUDE.md directive 를 무시" 패턴. numbered violation 만 추적하면 추세를 놓친다.

```
#56333  (v2.1.124)  evolved form #1
#56450  (v2.1.124)  evolved form #2
#56395  (v2.1.125)  evolved form #3
#56394  (v2.1.125)  evolved form #4
#56393  (v2.1.125)  evolved form #5
#56383  (v2.1.126)  evolved form #6 — advisory 공식화
#56418  (v2.1.126)  evolved form #7
#56447  (v2.1.127)  evolved form #8
#56865  (v2.1.132)  evolved form #9 — task-agent CLAUDE.md override (Anthropic 자체)
#56884  (v2.1.132)  evolved form #10 — silent push to upstream
#57317  (v2.1.137)  evolved form #11 — plugin PostToolUse silent drop
#57485  (v2.1.137)  evolved form #12 — Opus 4.7 agents ignore CLAUDE.md
#58887  (v2.1.141)  evolved form #13 — SessionStart hook directives ignored
```

### 3.2 ENH-286 Memory Enforcer 정당성

evolved form 12+건 누적 = CC 가 단순 numbered fix 로 해소 불가능한 구조적 문제. bkit Memory Enforcer (Sub-Sprint 4 archived) 가 PreToolUse deny-list 로 hard-enforce 함으로써 CC advisory 의존도를 끊는다 → 차별화 #1.

### 3.3 monitor 카운터 review 주기

- **2주 주기**: numbered violation 추세 (분기 결정 시점)
- **사이클별**: evolved form +N 증가 (사용자 안내 시점)
- **release 별**: numbered + evolved + streak 갱신

## 4. CC Version Researcher Agent 절차

`agents/cc-version-researcher.md` 는 매 CC 버전 분석 시 다음을 자동 수행:

1. GitHub releases / commits / PRs 조사
2. GitHub issues (open + closed in window) 수집
3. **R-Series 분류** 적용 (R-1/R-2/R-3 + evolved/numbered/dup-closure)
4. release_drift_score 계산
5. bkit 차별화 영향 평가 (자동수혜 / 신규 발견 / 강화)
6. ADR 0003 사후 검증 (8 invariant + 1 invariant 10 신규)

분석 결과는 `docs/04-report/features/cc-v2***-impact-analysis.report.md` 로 산출.

## 5. SSoT 참조

| 자료 | 위치 |
|------|------|
| 권고 정책 | `docs/06-guide/version-policy.guide.md` |
| R-Series 패턴 정의 | 본 문서 §2-3 |
| 버전별 누적 메모리 | `memory/cc_version_history_v2***.md` |
| MEMORY.md 통합 인덱스 | `MEMORY.md` "Claude Code Version Compatibility" 섹션 |
| ADR 0003 검증 | `docs/adr/0003-cc-version-impact-empirical-validation.md` |
| ADR 0006 업그레이드 정책 | `docs/adr/0006-cc-upgrade-policy.md` |

## 6. 통합 흐름

```
[새 CC 릴리스 발견]
   │
   ▼
cc-version-researcher agent 자동 호출 (/cc-version-analysis)
   │
   ├─> R-Series 분류
   ├─> evolved form +N 누적
   ├─> stale-lock dedup 식별
   ├─> release_drift_score 계산
   └─> bkit 차별화 영향 평가
   │
   ▼
analysis report 생성 (docs/04-report/features/)
   │
   ▼
MEMORY.md 갱신 (consecutive count, drift, evolved 누적)
   │
   ▼
사용자 안내 임계 평가 → README/CHANGELOG (필요 시)
```
