---
title: CC & bkit Issue Monitoring Framework
type: reference
status: Active
version: 1.0
created: 2026-04-24
author: kay kim
trigger: cc-v2119 retrospective (실증 대기 항목 관리 체계 필요)
related:
  - adr: docs/adr/0003-cc-version-impact-empirical-validation.md
  - retrospective: docs/03-analysis/cc-v2119-phase2-retrospective.md
---

# CC & bkit Issue Monitoring Framework

> 이 문서는 ADR 0003 "Empirical Validation Requirement"의 후속으로, **실증 대기 중인 CC 변경(SPECULATIVE/UNVERIFIED 태그 항목)**과 **bkit 사용자 실제 리포트**를 양방향으로 모니터링하는 체계를 정의한다.

## 1. 목적

Phase 1.5 실증에서 SPECULATIVE/UNVERIFIED로 분류된 항목은 **실세계 신호가 쌓일 때까지 대기**. 이 신호는 두 곳에서 옴:

1. **CC upstream** (`anthropics/claude-code` GitHub) — 다른 사용자가 같은 문제 리포트 시 CC가 공식 인정/수정
2. **bkit 사용자** (`bkit-claude-code` GitHub 또는 직접 피드백) — bkit 사용자가 특정 회귀 신고 시

"유관된 이슈 나올 때까지 기다리자" 판단(cc-v2119 retrospective §3.6)을 제도화.

## 2. 모니터링 대상 정의

### 2.1 CC Upstream 모니터링

**Repo**: `https://github.com/anthropics/claude-code`

**추적 키워드 (SPECULATIVE/UNVERIFIED 항목별)**:

| 실증 대기 항목 | CC 이슈 검색 키워드 | 관심 라벨 |
|-------------|-------------------|----------|
| F5-119 `--print tools:` 강제 | `"--print"` `"tools"` `agent` `frontmatter` | regression, docs |
| I1-118 `$defaults` auto mode | `"$defaults"` `autoMode` `merge` | feature, question |
| B7-119 plan mode override | `"auto mode"` `"plan mode"` `override` | regression |
| B21-118 SendMessage cwd | `SendMessage` `cwd` `subagent` | regression |
| F4-118 mcp_tool hook | `"mcp_tool"` `hook` `type` | feature, docs |

**모니터링 주기**: 주 1회 체크 (매주 월요일 오전)

**검색 쿼리 예시**:
```
repo:anthropics/claude-code is:issue "tools:" "--print" created:>2026-04-22
repo:anthropics/claude-code is:issue "/config" ".claude/" write created:>2026-04-20
```

### 2.2 bkit 사용자 모니터링

**Repo**: `https://github.com/popup-studio-ai/bkit-claude-code` (private 또는 public)

**Issue 템플릿 권장 라벨**:
- `cc-regression` — CC 업그레이드 후 발생한 회귀
- `cc-compat-question` — CC 호환성 관련 질문
- `unverified-impact` — 본 프레임워크 SPECULATIVE 항목과 매칭되는 사용자 리포트

**추적 항목**:
| bkit 사용자 리포트 유형 | 매칭 SPECULATIVE 항목 | 우선순위 상승 조건 |
|-----------------------|---------------------|------------------|
| "`claude --agent X --print` 에러 발생" | F5-119 | 1건 이상 리포트 시 → **CONFIRMED 승격 + P0 재분석** |
| "bkit에서 `/config` 차단됨" | F1-119 (REFUTED) | 상반된 실증 → retrospective 보충 |
| "auto mode가 이상하게 동작" | I1-118, B7-119 | 2건 이상 리포트 시 → CONFIRMED |
| "`/fork` 후 CTO Team 상태 이상" | B21-118 | 1건 이상 리포트 시 → CONFIRMED |

**모니터링 주기**: 매일 오전 (bkit 사용자 리포트는 반응 속도 중요)

## 3. 에스컬레이션 규칙

### 3.1 CC 이슈 + bkit 사용자 리포트 교차 매칭

```
Trigger A: CC upstream에서 관련 이슈 발생
         → Phase 1.5 실증 재시도
         → CONFIRMED이면 Phase 2 재진입, P0/P1 재판정

Trigger B: bkit 사용자 리포트 발생
         → 즉시 재현 시도 (같은 시나리오)
         → CONFIRMED이면 hotfix Sprint 신설 검토

Trigger A+B 동시 발생:
         → 최우선 대응 (P0)
         → CC fix 대기 없이 bkit 선제 대응 권고
```

### 3.2 시간 임계값 (stale 처리)

| 실증 대기 경과 | 조치 |
|--------------|------|
| 2주 경과, 0 리포트 | 관찰 지속 (변경 없음) |
| 4주 경과, 0 리포트 | **UNVERIFIED → DROP 강등** (영향이 있었다면 이미 리포트 됐을 것) |
| 8주 경과, 0 리포트 | 해당 CC 변경을 **CONFIRMED 무영향**으로 재분류 |

## 4. 현재 모니터링 중인 항목 (2026-04-24 시점)

### 4.1 SPECULATIVE → 실증 대기 (Active Monitoring)

| 항목 | 대기 시작 | 실증 우선순위 | CC 이슈 | bkit 리포트 |
|------|----------|:-----------:|:-------:|:-----------:|
| F5-119 `--print tools:` 강제 | 2026-04-24 | **HIGH** | 0건 | 0건 |
| I1-118 `$defaults` auto mode | 2026-04-24 | MEDIUM | 0건 | 0건 |
| B7-119 plan mode override | 2026-04-24 | LOW | 0건 | 0건 |
| B21-118 SendMessage cwd | 2026-04-24 | LOW | 0건 | 0건 |

### 4.2 자동수혜 (모니터링 불필요)

| 항목 | 근거 |
|------|------|
| B14-118 `/fork` pointer+hydrate | CC 자동 적용, bkit 측 무변경 |
| B8-118 credential save crash | CC 내부 fix, bkit 영향 없음 |
| B3-119 Glob/Grep Bash denied | CC 자동 적용 (ENH-256 유예 근거) |
| B24-119 auto-compaction skill 재실행 | CC 자동 적용 (ENH-232 재평가 근거만) |

### 4.3 CONFIRMED 무영향 (종결)

| 항목 | 확인 근거 |
|------|----------|
| F1-119 `/config` 영속화 | 사용자 실증 (2026-04-24) — 정상 작동 |
| B12-118 agent-type hook | bkit hooks.json grep — agent hook 0건 |
| F6-119 built-in permissionMode | cto-lead.md:25 주석 — CC가 plugin agent 무시 |
| I5-119 blockedMarketplaces | plugin.json — bkit Marketplace 미운영 |

## 5. 모니터링 실행 체크리스트

### 5.1 주 1회 CC Upstream 체크 (월요일)

- [ ] 위 §2.1 검색 쿼리 5건 실행
- [ ] 신규 이슈 발견 시 본 문서 §4.1 테이블 업데이트
- [ ] CC 이슈 1건 이상 발견 시 → Phase 1.5 실증 재시도 트리거
- [ ] 4주 경과 항목은 §3.2 규칙 따라 재분류

### 5.2 매일 bkit 사용자 리포트 체크

- [ ] GitHub notifications 확인
- [ ] `cc-regression` 라벨 이슈 신규 여부 확인
- [ ] Discord/Slack 채널 (있다면) 키워드 모니터링
- [ ] 사용자 리포트 발생 시 즉시 재현 시도

### 5.3 CC 신 버전 릴리스 시 (트리거 발생)

- [ ] 현재 SPECULATIVE/UNVERIFIED 항목이 새 버전에서 **공식 수정**됐는지 확인
- [ ] 수정됐다면 해당 항목 CONFIRMED 무영향으로 재분류
- [ ] 수정 안 됐다면 모니터링 지속

## 6. 자동화 가능성 (v2.1.12+ 검토)

향후 자동화 여지:

- **GitHub API 기반 주기 체크**: `gh api` 로 위 쿼리 cron 실행, 신규 히트 시 알림
- **bkit 내장 `/bkit cc-monitor` 명령**: 본 문서 §4.1 테이블을 자동 갱신
- **CC 신 버전 자동 감지**: `npm outdated -g` 또는 `claude --version` 체크 후 자동 Phase 1 트리거

구현은 v2.1.12 Sprint δ Governance 파트와 통합 검토 권고.

## 7. 본 체계의 한계

1. **수동 의존**: 자동화 전까지는 개발자가 주기적으로 체크해야 함
2. **작은 사용자 베이스**: bkit 사용자 수가 적으면 리포트가 거의 안 들어옴 → stale 판정의 신뢰도 한계
3. **Silent regression**: 사용자가 에러 보고 안 하고 포기할 수 있음 → 일부 회귀 영구 미발견 가능
4. **CC upstream closed-source 부분**: 일부 CC 변경은 공식 이슈로 공개되지 않음

이 한계를 보완하기 위한 방안은 Sprint γ Trust Score E2E closeout 또는 v2.2+ "회귀 자동 탐지 제어판" 등에서 검토.

---

**End of Monitoring Framework**
