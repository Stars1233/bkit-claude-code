# CC v2.1.116 → v2.1.117 영향 분석 및 개선 계획

> **Summary**: Claude Code v2.1.117 발행 (F1 FORK_SUBAGENT, F3 Glob/Grep 제거, F6/B14 Opus 1M, 3x HIGH regression) 영향 분석 및 bkit 11건 ENH 구현 계획
>
> **Author**: CTO Team (Plan Plus)
> **Created**: 2026-04-22
> **Status**: Approved (Phase 4 입력 완료)

---

## 1. 개요

### 1.1 문제 정의

Claude Code v2.1.117 발행(2026-04-22)으로 인해:

1. **새로운 기능 2건** (F1 FORK_SUBAGENT, F3 Glob/Grep 제거)
2. **구조 수정 2건** (F6/B14 Opus 1M 개선, I7 OTEL 통합)
3. **새로운 회귀 3건** (MON-CC-06 16→19건 확장, #51798/#51801/#51809 HIGH)

bkit의 **호환성 보증 및 안정성 개선**이 필수. 특히 **#51809 Sonnet per-turn 6~8k 오버헤드**는 PDCA 비용 구조를 근본적으로 위협.

### 1.2 목표

- ✅ v2.1.117 완전 호환성 확인 (Breaking 0건)
- ✅ MON-CC-06 19건 임시 방어 로직 구현
- ✅ bkit 영향 파일 11건 개선 (ENH-254~264)
- ✅ **v2.1.10 RC1 진입 조건 충족** (P0 5건 완료)

### 1.3 기대 산출

| 산출물 | 대상 | 상태 |
|--------|------|------|
| **Report** | CC v2.1.117 영향 분석 최종 보고서 | ✅ 완료 |
| **Plan** | 본 문서 (실행 계획) | ✅ 작성 중 |
| **ENH 구현** | 11건 (P0 5 + P1 1 + P2 2 + P3 2 + YAGNI 8) | ⏳ Phase 4 대기 |
| **MEMORY 갱신** | v2.1.117 항목 + ENH-254~264 추가 | ⏳ Phase 4 |

---

## 2. ENH 상세 계획

### 2.1 우선순위별 구현표

#### P0 (즉시 구현, 11.5h, v2.1.10 RC1 조건)

| ENH | 제목 | 파일 | 공수 | 검증 | 비고 |
|-----|------|------|------|------|------|
| **ENH-254** | F1 FORK_SUBAGENT 가드 + L3 TC | `skills/zero-script-qa/SKILL.md` | 2.5h | L3 회귀 1건 | zero-script-qa 투자 보호 |
| **ENH-256** | Glob/Grep 제거 후 재검증 | 전체 skills/agents/scripts/lib | 1.5h | grep 전수 (자동) | CC native 32→30 영향 사정 |
| **ENH-262** | #51798 PreToolUse+dangerouslyDisableSandbox 방어 | `scripts/pre-write.js:67-77` | 1h | L1 unit | 조합 회귀 방어 |
| **ENH-263** | #51801 bypassPermissions+`.claude/` 통합 | `scripts/pre-write.js:65-76` | 2h | L1 unit | ENH-239 재검사 |
| **ENH-264** | #51809 Sonnet per-turn 6~8k 측정 + 정책 | `lib/pdca/status.js` | 3h | 실측 데이터 | 토큰 비용 구조 전환 |
| **P0 합계** | | | **11.5h** | | **v2.1.10 RC1 조건** |

#### P1 (1주일 내, 2h, 유연)

| ENH | 제목 | 파일 | 공수 | 검증 | 비고 |
|-----|------|------|------|------|------|
| **ENH-257** | F6/B14 Opus 1M 후 ENH-232 재평가 | `scripts/context-compaction.js:34-56` | 2h | L1 재실행 | 2주 관찰 후 의사결정 |

#### P2 (2주일 내, 4h)

| ENH | 제목 | 파일 | 공수 | 검증 | 비고 |
|-----|------|------|------|------|------|
| **ENH-258** | I4 managed-settings 문서화 | `docs/bkit-auto-mode-workflow-manual.md` | 1.5h | 문서 | bkit Marketplace 미운영 |
| **ENH-259** | I7 OTEL 통합 검토 | `lib/audit/audit-logger.js` | 2.5h | 조건부 | observability 확장 |

#### P3 (백로그, 0.5h 관찰)

| ENH | 제목 | 파일 | 공수 | 검증 | 비고 |
|-----|------|------|------|------|------|
| **ENH-260** | B11 subagent malware 자동수혜 | — | 0h | L0 (자동) | 관찰만 |
| **ENH-261** | B2 WebFetch 자동수혜 | — | 0h | L0 (자동) | 관찰만 |

### 2.2 YAGNI FAIL 최종 확정 (8건)

| ENH/항목 | 판정 | 근거 |
|---------|------|------|
| ENH-255 | ❌ DROP | F2 agent mcpServers — 36 agents 0/36 사용, pain 부재 |
| F2 mcpServers 직접 | ❌ DROP | agent frontmatter 미사용 |
| I4 managed-settings 기본값 | ❌ DROP | bkit Marketplace 미운영, 문서만 필요 (ENH-258로 이관) |
| CC tools 자동화 | ❌ DROP | 32→30 native 외 수동 추적 OK |
| `/schedule run_once_at` | ❌ DROP | ENH-144 기존 결번 |
| sys prompt Background job | ❌ DROP | bkit background 미운영 |
| ENH-261 정책화 | ❌ DROP | B2 WebFetch — 자동 수혜만 충분 |
| ENH-262 정책화 | ❌ DROP | I8 gh rate-limit — 자동 수혜만 충분 |

---

## 3. 실행 계획

### 3.1 Phase 4 — 구현 단계 (v2.1.10 dev)

#### Sprint 1: P0 구현 (48시간 목표)

**목표**: 모든 P0 5건 완료 → v2.1.10 RC1 진입

```
Day 1
├─ 08:00 ~ 09:30  ENH-256 (1.5h)
│   ├─ scripts/pre-write.js grep 전수 재검증
│   ├─ skills/*, agents/* grep 호출 확인
│   └─ lib/core/* 사용 grep 함수 리스트화
├─ 09:30 ~ 10:30  ENH-262 (1h)
│   ├─ #51798 PreToolUse allow + dangerouslyDisableSandbox 조합 탐지
│   ├─ hooks.json 검증
│   └─ pre-write.js 방어 로직 추가
└─ 10:30 ~ 13:30  ENH-264 (3h)
    ├─ Sonnet per-turn 토큰 누적 측정 (5+ 세션)
    ├─ 장기 PDCA 비용 분석 (시간당 토큰)
    └─ CTO Team Sonnet 비율 정책 제안 + 문서

Day 2
├─ 09:00 ~ 11:30  ENH-254 (2.5h)
│   ├─ zero-script-qa F1 FORK_SUBAGENT=1 가드 추가
│   ├─ L3 회귀 TC 신설 (test/l3-regression/...)
│   └─ 환경변수 문서 추가
└─ 11:30 ~ 13:30  ENH-263 (2h)
    ├─ #51801 bypassPermissions + .claude/ write 검증
    ├─ PreToolUse additionalContext 활용 방어
    ├─ ENH-239 재검사 (SHA-256 dedup)
    └─ 통합 문서화

Day 2 완료 후:
  ✅ All P0 완료 → v2.1.10 RC1 진입
```

#### Sprint 2: P1 구현 (1주일, 병렬)

**목표**: ENH-257 2주 관찰 + P2 2건 기초 조사

```
Week 1
├─ Mon-Tue (4h) : ENH-257
│   ├─ F6/B14 Opus 1M 수정 사항 읽기
│   ├─ context-compaction.js #47855 현황 재평가
│   └─ PreCompact 방어 유지/해제 판정표 작성 (의사결정 보류)
├─ Wed-Fri (2.5h) : ENH-259 기초 + ENH-258 검토
│   ├─ OTEL_SERVER_PORT 환경변수 이해
│   ├─ audit-logger.js OTEL 통합 가능성 검토
│   └─ managed-settings 자동 업데이트 가이드 초안
└─ Ongoing : ENH-260/261 관찰 (L0, 자동)
```

### 3.2 테스트 계획

| 단계 | 테스트 대상 | 파일 | 예상 시간 |
|------|-----------|------|----------|
| **L1 (Unit)** | grep 가용성, PreToolUse 로직, 권한 경계 | test/l1-unit/ | 1h |
| **L2 (Integration)** | hook 조합, permission stack | test/l2-integration/ | 0.5h |
| **L3 (Regression)** | zero-script-qa fork + F1 | test/l3-regression/ | 1.5h |
| **L4 (Performance)** | Sonnet 토큰 누적 | lib/pdca/token-analysis/ | 3h (측정) |
| **문서 검증** | MEMORY, Report, Config | docs/ + config | 0.5h |

**총 테스트**: ~6.5h (P0 구현 중 병행)

### 3.3 의존성 및 선행 조건

```
ENH-256 (grep 재검증)
  ↓ (선행 필수)
ENH-262 (hooks grep 기반)

ENH-264 (Sonnet 측정)
  ↓ (병렬 가능)
ENH-254 (zero-script-qa)
  ↓ (독립)
ENH-263 (#51801 방어)

ENH-257 (F6/B14 관찰)
  ↓ (2주 후)
  의사결정 (ENH-232 해제/유지)
```

---

## 4. 리스크 및 대응

### 4.1 HIGH 리스크

| 리스크 | 발생 확률 | 영향 | 대응 |
|--------|----------|------|------|
| **Grep 완전 제거** (F3) | Low (CC 내장화) | ENH-256 blockage | CC 공식 문서 재확인 + 테스트 우선 |
| **#51809 정책 미수용** | Medium (비용 민감) | v2.1.10 배포 지연 | CTO Team 조기 협의 (Day 1) |
| **ENH-263 복잡화** (ENH-239 충돌) | Medium (기술 부채) | 구현 시간 +1h | SHA-256 dedup 로직 재검토 필수 |

### 4.2 MEDIUM 리스크

| 리스크 | 발생 확률 | 영향 | 대응 |
|--------|----------|------|------|
| ENH-257 2주 관찰 지연 | Low (일정 관리) | v2.1.10 완성도 | 병렬 P2 진행으로 보정 |
| Sonnet 토큰 실측 불일치 | Medium (환경 변수) | 정책 신뢰도 | 최소 5 세션, 다양한 모델 (Opus도) |
| OTEL 통합 범위 불명확 | Medium (I7 정의) | ENH-259 시간 증가 | 기초 조사 후 Phase 5에서 결정 |

### 4.3 대응 전략

1. **Grep 문제**: Day 1 ENH-256 우선 → 즉시 해결 또는 CC 보고
2. **#51809 정책**: Day 1 오전 데이터 수집 시작, 낮 12시 CTO Team 협의
3. **ENH-263 복잡화**: ENH-239 원문 재독 (20min) → 설계 검토 (30min) → 구현 시작
4. **일정 보정**: 병렬화 + P2 독립성 최대화

---

## 5. 수용 기준 (Acceptance Criteria)

### P0 (v2.1.10 RC1 조건)

- ✅ **ENH-254**: zero-script-qa SKILL.md:10-11에 `FORK_SUBAGENT=1` 가드 + L3 TC 1건 신설 + green
- ✅ **ENH-256**: `grep -rn "grep" scripts/ skills/ agents/ lib/ hooks/` 완전 목록 + 각 grep 사용처 검증 (test 제외)
- ✅ **ENH-262**: `pre-write.js:67-77` PreToolUse.allow + dangerouslyDisableSandbox 동시 발생 탐지 로직 추가 + L1 test green
- ✅ **ENH-263**: `pre-write.js:65-76` bypassPermissions + `.claude/` path 동시 차단 로직 추가 + L1 test green + 추가 문서
- ✅ **ENH-264**: Sonnet per-turn 실측 5+ 세션 데이터 + `lib/pdca/status.js` 토큰 누적 로그 + CTO Team 정책 문서

### P1 (유연)

- ✅ **ENH-257**: `context-compaction.js` PreCompact 방어 유지/해제 의사결정 테이블 + 2주 관찰 증거

### P2 (문서)

- ✅ **ENH-258**: `docs/bkit-auto-mode-workflow-manual.md` managed-settings 절 추가 + CLI 플래그 예제
- ✅ **ENH-259**: `lib/audit/audit-logger.js` OTEL 통합 가능성 검토 결과 + 조건부 구현 또는 연기 결정

---

## 6. 일정 및 마일스톤

| 마일스톤 | 일자 | 조건 | 산출물 |
|---------|------|------|--------|
| **v2.1.10 RC1** | 2026-04-24 (48h) | P0 5건 완료 | commit 5건, test 2건 신설, MEMORY 갱신 |
| **ENH-257 의사결정** | 2026-05-06 (2주) | F6/B14 관찰 + PreCompact 재평가 | context-compaction.js 수정 또는 유지 |
| **v2.1.10 Final** | 2026-05-13 | P0+P1 완료 + test 통과 | npm publish 준비 |

---

## 7. 문서 및 커뮤니케이션

### 7.1 생성 문서

| 문서 | 경로 | 소유자 |
|------|------|--------|
| Report (본 분석) | `docs/04-report/features/cc-v2116-v2117-impact-analysis.report.md` | CTO Team |
| Implementation Guide | `docs/01-plan/features/cc-v2116-v2117-implementation.md` (신설) | Developer |
| ENH-264 분석 | `docs/03-analysis/sonnet-token-analysis.md` (신설) | Data |
| Security Architecture | `docs/03-analysis/security-architecture.md` (ENH-254/262/263 참조) | Security |

### 7.2 체크인 포인트

- **Day 1 12:00**: ENH-256/262/264 프로그레스 체크 (50% 목표)
- **Day 1 18:00**: ENH-256 결과 보고 (grep 완전 여부)
- **Day 2 14:00**: P0 최종 완료 확인 → RC1 진입 판단

---

## 8. Philosophy 준수

### 8.1 Automation First

- ✅ ENH-254: L3 회귀 TC 자동화
- ✅ ENH-256: grep 스캔 자동화
- ⚠️ ENH-262/263: 회귀 기간만 수동 방어 (근본 해결은 CC 책임)
- ✅ ENH-264: 토큰 측정 자동 수집 (정책 엔진화 예정)

### 8.2 No Guessing

- ✅ ENH-256: 전수 grep 재검증 (Confidence 95%)
- ✅ ENH-264: 5+ 세션 실측 (Confidence High)
- ✅ ENH-257: 2주 관찰 후 판정 (Data-Driven)

### 8.3 Docs=Code

- ✅ ENH-254: SKILL.md ↔ L3 TC 동기화
- ✅ ENH-262/263: hooks.json ↔ pre-write.js 동기화
- ✅ ENH-264: lib/pdca ↔ 분석 문서 동기화

---

## 9. 다음 단계

1. **Phase 4 시작**: 2026-04-22 15:00
2. **P0 구현**: 2026-04-22~24 (48h sprint)
3. **RC1 진입**: 2026-04-24 16:00
4. **v2.1.10 배포**: 2026-05-13 (P0+P1 완료 후)

---

**End of Plan**
