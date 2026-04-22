# bkit v2.1.10 통합 개선 및 리팩토링 플랜 (Plan Plus)

> **Status**: 📝 Draft (Analysis-Only, 구현 전)
>
> **Project**: bkit (bkit-claude-code)
> **타깃 버전**: v2.1.9 → **v2.1.10**
> **Author**: 15명 에이전트 팀 (CTO-Lead 주도 + 4명 심층 분석)
> **Date**: 2026-04-22 (최종 갱신: UX 정의 재정립)
> **PDCA Cycle**: bkit-v2110-integrated-enhancement
> **분석 기반**: cc-v2114-v2116 보고서 + cc-v2116-v2117 보고서 + 코드베이스 Explore + Clean Architecture(enterprise) + Security(security-architect) + QA(qa-strategist) + Quality(code-analyzer)
> **핵심 제약**: ① **Invocation Contract 불변** (skills/agents/commands/MCP tools/slash commands 호출 방식 동일) ② Clean Architecture 준수 ③ 코딩 컨벤션 준수 ④ Self-contained (외부 npm 의존 추가 금지) ⑤ No TypeScript 도입
>
> ⚠️ **BREAKING NOTE (2026-04-22)**: 본 문서의 **§ 9 UX Golden File 시스템** + **§ 12 Sprint 0~5** + **§ 13 테스트 전략** + **§ 15 수용 기준**은 후속 Addendum 문서로 대체되었습니다. Addendum 우선 적용:
> - **Addendum**: `docs/01-plan/features/bkit-v2110-invocation-contract-addendum.plan.md`
> - 사용자 UX 정의 재정립: "출력 byte-exact 불변" → "**Invocation Contract(호출 인터페이스) 불변**"
> - UX Golden File → **Contract Test L1~L5 (624 TC, CI Gate 619)** 로 대체
> - 출력 포맷 개선 **허용** (이전 제약 해제)

---

## 0. Executive Summary

### 0.1 범위

| 항목 | 수치 |
|------|------|
| 대응 ENH | **9건** (P0 5 + P1 1 + P2 1 + P3 2) |
| 추적 MON-CC 이슈 | **21건** (MON-CC-02 1건 + MON-CC-06 19건, v2.1.117 신규 3건 포함) + 장기 OPEN 3건 |
| Docs=Code 부채 | ENH-241 (skills/agents 개수 3중 오기 방지) |
| 리팩토링 Critical Bug | **2건** (audit-logger dead option + details sanitizer 부재) |
| 리팩토링 대상 파일 | **7개 핵심** + 3 핫스팟 파일 |
| 예상 총 기간 | **6 Sprint / 22 영업일** |
| 코드 변경 추정 LOC | `~+2,400` (신규 `lib/cc-regression/`, `lib/domain/`) / `~-1,000` (status.js 분할) / UX surface `0 byte diff` |

### 0.2 4-Perspective 가치

| 관점 | 산출물 |
|------|--------|
| **Technical** | Clean Architecture 4-layer 도입 + DIP Port 6개 + CC 회귀 방어 Domain Service(`lib/cc-regression/`) 신설. 순환 의존 제거, status.js 872→300 LOC 분할, pre-write.js 286→~120 LOC (파이프라인화) |
| **Operational** | MON-CC-06 19건 추적 자동화 (registry.js + lifecycle.js). ENH-257 PreCompact 해제 여부 **데이터 기반 판정** 전환. CC 회귀 해결 감지 시 방어선 **자동 해제** |
| **Strategic** | **"CC 회귀 awareness 계층" 공식화** — bkit이 CC 문제를 사용자에게 명시 귀속하여 자동화 신뢰 유지. 방어선 라이프사이클 관리 패턴을 **조직 자산화** (기술 부채 영구 축적 방지) |
| **Quality** | UX Golden File 시스템 도입으로 리팩토링 중 사용자 가시 변경 0 byte 보장. Critical bug 2건(audit-logger) 즉시 해소. Defense-in-Depth 4-layer 공식 문서화 |

### 0.3 핵심 원칙

1. **UX 불변성은 절대**: 모든 리팩토링은 사용자 가시 출력(statusline/dashboard/additionalContext/경고) byte-exact 동일 보장. 의도적 변경은 **ENH-264 단 1건** (token display 추가), `--update` 명시 후 PR 승인.
2. **Philosophy 경계는 한시적**: ENH-262/263/264 (Automation First + No Guessing 경계)는 **CC 회귀 기간만 유효**, `removeWhen()` 조건 코드 내장.
3. **Domain은 의존성 0**: 신규 `lib/domain/` 및 `lib/cc-regression/`은 `require('fs')` 금지. 순수 규칙과 Guard 카탈로그만 포함.
4. **No Guessing**: ENH-257/264는 **2주 실측 + 100+ 샘플** 선행, 판정은 데이터로만.

---

## 1. 에이전트 팀 15명 구성

PDCA 전 단계를 커버하는 CTO-Lead 중심 15인 팀. **심층 분석은 5명 병렬 실행**(Phase 2), **브레인스토밍과 설계는 Main + CTO-Lead**(Phase 3), **문서/구현은 report/code-analyzer/gap-detector**(Phase 4+).

| # | Role | Agent | 책임 |
|---|------|-------|------|
| 1 | **CTO (총괄)** | `cto-lead` | 전체 PDCA 오케스트레이션, 아키텍처 결정 Final Call, 각 Sprint 수용 기준 승인 |
| 2 | **Enterprise Architect** | `enterprise-expert` | Clean Architecture 4-layer 매핑, DIP Port 설계, 리팩토링 로드맵 (✅ 실행 완료) |
| 3 | **Infra Architect** | `infra-architect` | MON-CC-06 환경 제약 매트릭스, 배포 아키텍처, GitHub Actions CI gate |
| 4 | **Security Architect** | `security-architect` | ENH-262/263 통합 방어 레이어, OWASP Top 10, token-ledger redact 정책 (✅ 실행 완료) |
| 5 | **Frontend Architect** | `frontend-architect` | UX 불변성 경계 식별, Presentation Layer LOCKED 마커, ANSI/Unicode 호환 |
| 6 | **Backend (bkend)** | `bkend-expert` | audit-logger → OTEL bridge(ENH-259), storage 스키마 (token-ledger NDJSON) |
| 7 | **Product Manager** | `product-manager` | 우선순위 최종 확정, 스코프 관리, 릴리스 노트 초안 |
| 8 | **QA Strategist** | `qa-strategist` | UX Golden File 시스템, L1~L5 테스트 매트릭스, 수용 기준 (✅ 실행 완료) |
| 9 | **Code Analyzer** | `code-analyzer` | 코드 품질 baseline, Critical bug 식별, 리팩토링 우선순위 (✅ 실행 완료) |
| 10 | **Design Validator** | `design-validator` | 본 Plan 문서 완결성 검증, 설계-구현 정합성 사전 체크 |
| 11 | **Gap Detector** | `gap-detector` | 각 Sprint 완료 시 설계-구현 갭 분석, 90%+ Match Rate 게이트 |
| 12 | **Report Generator** | `report-generator` | Sprint별 완료 보고서, Final v2.1.10 Release Report |
| 13 | **CC Version Researcher** | `cc-version-researcher` | MON-CC-06 19건 주간 상태 업데이트, hotfix 감시 |
| 14 | **bkit Impact Analyst** | `bkit-impact-analyst` | 구현 진행 중 CC 신규 버전 등장 시 bkit 영향 실시간 평가 |
| 15 | **Pipeline Guide** | `pipeline-guide` | 9-phase 파이프라인 통합 점검, 신규 모듈이 기존 흐름과 충돌 없는지 가이드 |

### 1.1 팀 운영 규칙

- **Phase 2 (심층 분석) 5명 병렬 실행**: Explore + Enterprise + Security + QA + CodeAnalyzer — 총 ~5분 소요
- **Phase 3 (브레인스토밍) Main + CTO-Lead 직접**: 병렬 결과 수집 후 Plan Plus 4단계 수행
- **Phase 4 (문서 작성) Main Write**: 본 문서 직접 산출
- **Phase 5 (구현)는 본 Plan 승인 후**: 각 Sprint별 ownership 배정 (예: Sprint 1 → Security + CodeAnalyzer + QA)

---

## 2. 코드베이스 심층 분석 (Baseline)

### 2.1 규모

| 표면 | 파일 | LOC | 비고 |
|------|------|-----|------|
| `lib/` | 101 모듈 | **24,647** | 13개 서브디렉토리 (core/pdca/control/quality/team/qa/audit/ui/context/task/intent/...) |
| `scripts/` | 43 | ~7,100 | CC hook 엔트리, 최대 `unified-stop.js` 677 LOC |
| `hooks/` | 6 | ~400 | hooks.json 21 이벤트 + handler |
| `skills/` | 39 | - | phase-* / pdca-* / qa-* / bkend-* / 기타 |
| `agents/` | 36 | - | pm-* / pdca-eval-* / qa-* / 기타 |
| `servers/` | 2 | - | MCP: bkit-pdca, bkit-analysis |
| **총계** | **150+ 주요 파일** | **~32,000+** | plugin.json v2.1.9 |

### 2.2 계층 혼재 핫스팟 (5곳)

| # | 위치 | 문제 | 연계 ENH |
|---|------|------|---------|
| **H1** | `scripts/config-change-handler.js:29-35` | 보안 정책(Domain rule)이 CC hook entry(Infra)에 하드코딩 | ENH-246/254 |
| **H2** | `hooks/pre-write.js:65-77` (실제 `scripts/pre-write.js`) | `.claude/` write 방어(Domain) + CC payload 파싱(Infra) 혼재. **286 LOC top-level 절차형** | ENH-262/263 |
| **H3** | `lib/pdca/status.js` **872 LOC (권고의 2.9배)** | 토큰 측정(Domain metric) + statusline 렌더(Presentation) + v1→v2→v3 migration 누적 | ENH-264 |
| **H4** | `lib/audit/audit-logger.js:115, 332-344` | Domain observability + 파일 IO + **`startDate` dead option bug** + `details` 무제한 기록 (민감정보 유출 잠재) | ENH-237/259 |
| **H5** | `lib/team/coordinator.js` (~459 LOC) | Agent orchestration(Application) + CC Task tool(Infra) 직결 | v2.1.113 네이티브 전환 시 파급 |

### 2.3 Clean Architecture 대비 현황

| Layer | 현재 파일 | 상태 |
|-------|---------|------|
| **Presentation** | `lib/ui/*` (7) + 일부 `scripts/*-handler.js` | ⚠️ 혼재 |
| **Application** | `lib/pdca/*` (22) + `lib/control/*` (7) | ✅ 명확 |
| **Domain** | `lib/core/*` (18) + `lib/task/*` (4) | ✅ 격리됨 |
| **Infrastructure** | `lib/audit/*` (3) + `lib/context/*` (4) | ✅ 격리됨 |

**DIP 준수 현황**: `lib/core/platform.js`, `lib/core/io.js`는 인터페이스 역할 — 부분 준수. CC API 직접 접근 코드는 101 lib 모듈 전반에 산재.

### 2.4 Critical Bugs (즉시 수정 필수)

| # | 파일:라인 | 이슈 | 심각도 |
|---|---------|------|--------|
| **C1** | `lib/audit/audit-logger.js:332-344` | `getSessionStats`가 `readAuditLogs({ startDate })` 호출하지만 `readAuditLogs`는 `startDate` 파라미터 미지원 (dead option). 무증상 실패 | **High** |
| **C2** | `lib/audit/audit-logger.js:115` | `details` 객체 무제한 JSONL 기록. 호출자가 prompt/token/password를 넣으면 그대로 로깅 — PII/민감정보 유출 잠재 | **High** |

### 2.5 컨벤션 현황

| 항목 | 상태 |
|------|------|
| ESLint / Prettier 설정 | ❌ 부재 (루트에 `.eslintrc`, `.prettierrc` 미존재) |
| JSDoc 커버리지 | ✅ ~85% (public 함수) |
| 네이밍 | ✅ camelCase/UPPER_SNAKE_CASE 일관 |
| 에러 핸들링 | ⚠️ 혼용 (throw vs `{success:false}` vs `catch(_){}` silent 4회) |
| 하드코딩 버전 | ⚠️ `session-context.js:233` "v2.1.9" 잔존 (ENH-167 위반) |
| 파일 LOC 상한 | ❌ 미정의 (status.js 872 LOC) |

### 2.6 기술 부채 요약

| 부채 유형 | 사례 | 해소 ENH |
|---------|------|---------|
| Lazy require 중복 | `_core`/`_status`/`_phase` 패턴 8+ 위치 | Clean Architecture DIP Port로 해소 |
| `catch(_){}` silent | `scripts/pre-write.js` × 5회 | 컨벤션 정립(리팩토링 권고 #6) |
| TOCTOU + blocking IO | `config-change-handler.js:71-72` `existsSync → readFileSync` | 리팩토링 권고 #5 (size check + ENOENT catch) |
| BKIT_VERSION 하드코딩 | `session-context.js:233` | ENH-167 (v2.1.10 완결) |

---

## 3. Plan Plus 4단계 브레인스토밍

### 3.1 Intent Discovery — 왜 지금, 무엇을 위해

#### 핵심 목표 (3건)

1. **CC 회귀 방어 자동화**: CC v2.1.117의 HIGH 회귀 3건(#51798/#51801/#51809) + MON-CC-06 기존 16건을 **데이터 기반 추적 + 자동 해제**. 기존 수동 문서 추적(MEMORY.md)에서 코드 registry로 전환.
2. **Clean Architecture 전환**: 계층 혼재 5 핫스팟 해소로 **ENH 추가 시 파급 최소화** + **CC API 변경 격리**. v2.1.113 네이티브 바이너리 전환 같은 미래 회귀에 선제 대비.
3. **Critical Bug 해소**: audit-logger 2건 (dead option + 민감정보 유출 잠재)은 **v2.1.10 릴리스 전 필수 해결**.

#### 핵심 리스크 (3건)

1. **UX 변경 유출**: 리팩토링 중 사용자 가시 출력이 1 byte라도 변하면 바로 사용자 체감 저하. **대응: UX Golden File 시스템** (Section 9).
2. **Guard 오탐**: ENH-262/263 방어가 정상 흐름을 차단하면 자동화 레벨 체감 하락. **대응: `bypassFlag` 환경변수 + audit 로깅 + attribution만 노출(차단 금지)**.
3. **CC 추가 회귀**: 구현 중 CC v2.1.118 이상 hotfix 배포 시 방어선 일부 무효화 가능. **대응: lifecycle.js 자동 해제 + 주간 `cc-version-researcher` 실행**.

#### 기회 (2건)

1. **방어선 라이프사이클 관리 패턴 조직 자산화**: "한시적 방어"를 코드에 등록 가능한 패턴으로 확립 → bkit 외 다른 CC plugin에도 공유 가능.
2. **Defense-in-Depth 4-layer 공식화**: CC 공식 보안 → bkit PreToolUse guard → audit-logger → token-ledger의 4-layer를 설계 문서로 확립 → 보안 감사 대응력 강화.

### 3.2 Alternative Exploration — 구현 방법 대안

#### A-1: CC 회귀 방어 구현 방식

| 옵션 | 설명 | 장점 | 단점 | 선택 |
|------|------|------|------|------|
| A | `scripts/pre-write.js`에 조합 검사 인라인 추가 | 최소 변경 | 유지보수 어려움, 테스트 곤란 | ❌ |
| **B** | **신규 `lib/cc-regression/` Domain Service** | 테스트 가능, 확장성, 자동 해제 | 구조 변경 비용 | ✅ **선택** |
| C | 별도 npm 패키지 외부화 | 재사용성 최대 | Self-contained 제약 위반 | ❌ |

#### A-2: status.js 분할 방식

| 옵션 | 설명 | 선택 |
|------|------|------|
| A | 872 LOC 그대로 유지 + 주석만 정비 | ❌ (YAGNI 예외, Critical 기준 미달) |
| B | 3개 파일 분할 (status-core/migration/cleanup) | ✅ **선택** |
| C | 상태 머신 재설계 + Event Sourcing | ❌ (스코프 과다, v2.2.x 대상) |

#### A-3: UX 불변성 보장 방식

| 옵션 | 설명 | 선택 |
|------|------|------|
| A | 수동 코드 리뷰 | ❌ (오류 가능성) |
| **B** | **Golden File 스냅샷 + CI gate** | ✅ **선택** |
| C | Snapshot testing (Jest 유사) + ANSI strip | △ (B와 기술적 동치, 도구만 다름) |

#### A-4: OTEL 통합 (ENH-259)

| 옵션 | 설명 | 선택 |
|------|------|------|
| A | audit-logger를 완전히 OTEL로 대체 | ❌ (self-contained 제약, 범위 과다) |
| **B** | **Dual sink 어댑터** (file + OTEL 선택적) | ✅ **선택** (조건부 P2) |
| C | v2.1.10 범위 외 연기 | △ (B로 설계만, 구현은 v2.1.11) |

### 3.3 YAGNI Review — 최종 필터링

| ENH/항목 | 현재 수요 | 미구현 시 문제 | 판정 |
|---------|---------|-------------|------|
| ENH-254 FORK_SUBAGENT 가드 | ✅ zero-script-qa 유일 사용자 | Windows #51165 회귀 기간 QA 마비 | **P0 유지** |
| ENH-256 Glob/Grep native grep | ✅ 39 skills + 43 scripts 전수 | macOS/Linux native 빌드 기능 파손 | **P0 유지** |
| ENH-257 PreCompact 재평가 | ✅ ENH-232 투자 재평가 연계 | MON-CC-02 영구 미해제 | **P1 유지 (2주 실측)** |
| ENH-259 OTEL dual sink | △ bkit audit-logger 존재 | OTEL 표준 미준수 | **P2 조건부** |
| ENH-258 managed-settings 가이드 | ❌ 엔터프라이즈 사용자 수요 불확실 | 없음 (참고용) | **P3 강등** (수요 대기) |
| ENH-262 #51798 hooks 조합 | ✅ bkit 자동화 근간 | 회귀 기간 자동화 파손 | **P0 유지** |
| ENH-263 #51801 .claude/ write | ✅ 빈번한 write | bypassPermissions 흐름 차단 | **P0 유지** |
| ENH-264 #51809 per-turn 측정 | ✅ PDCA 장기 세션 비용 | 90분 quota 고갈 지속 | **P0 유지** |
| ENH-260/261 자동수혜 관찰 | ✅ 자동 | 없음 (문서만) | **P3 관찰** (0.5h) |
| 리팩토링 C1/C2 (audit-logger) | ✅ Critical | PII 유출 잠재 | **P0 긴급** (v2.1.10 blocker) |
| 리팩토링 status.js 분할 | ✅ ENH-264 구현 blocker | ENH-264 구현 곤란 | **P0 선행 필요** |
| ENH-241 Docs=Code 교차 검증 | ✅ 3중 오기 발견 전례 | 신뢰도 하락 | **P1 유지** |
| ESLint/Prettier 도입 | △ Nice-to-have | 컨벤션 드리프트 | **P2 (Sprint 0)** |

#### YAGNI FAIL 재확인 (Phase 2 기준 유지)

1. ENH-255 Agent `mcpServers:` 채택 (36 agents 수요 0)
2. F2 hook main-thread `--agent` 지원 (bkit 미사용)
3. I4 blockedMarketplaces 자체 채택 (bkit marketplace 미운영)
4. CC tools 수 재산출 자동화 (수동 실측 충분)
5. `/schedule run_once_at` 채택 (ENH-144 흡수)
6. sys prompt "Background job behavior" 섹션 대응 (bkit background job 미운영)
7. F5 `/resume` 요약 제안 별도 ENH (ENH-221/255 자동 수혜로 흡수)
8. TypeScript 도입 (리팩토링 범위 폭발 방지)

### 3.4 Priority Assignment — 최종 확정

```
┌──────────────────────────────────────────────────────────────┐
│ P0 — Sprint 1~2에서 완료 (9건)                                │
├──────────────────────────────────────────────────────────────┤
│ [Critical Bug] C1 audit-logger dead option bug       0.5h    │
│ [Critical Bug] C2 audit-logger details sanitizer     1.5h    │
│ [리팩토링] status.js 872→300×3 분할                 4h       │
│ [리팩토링] pre-write.js 286→120 파이프라인화          3h       │
│ [ENH-256] Glob/Grep native grep 전수 검증            1.5h    │
│ [ENH-262] #51798 통합 방어 레이어                     1h      │
│ [ENH-264] #51809 per-turn 토큰 측정                  3h      │
│ [ENH-254] FORK_SUBAGENT + #51165 방어                2.5h    │
│ [ENH-263] #51801 .claude/ write 통합방어              2h      │
│                                                             │
│ P1 — Sprint 3~4 (3건)                                       │
├──────────────────────────────────────────────────────────────┤
│ [ENH-257] F6/B14 PreCompact 재평가 (2주 실측)         2h     │
│ [ENH-241] Docs=Code 교차 검증 스킴                    2h     │
│ [리팩토링] audit-logger LOC -30% (ENH-167 잔류 해소)   1h    │
│                                                             │
│ P2 — Sprint 2 (Sprint 0 병행)                               │
├──────────────────────────────────────────────────────────────┤
│ [도입] ESLint + Prettier + madge (Sprint 0)          2h     │
│ [ENH-259] OTEL dual sink 어댑터 (조건부)             2.5h   │
│                                                             │
│ P3 관찰/강등 — 릴리스 노트만 (3건)                           │
├──────────────────────────────────────────────────────────────┤
│ [ENH-260] B11 subagent malware 자동수혜              0h     │
│ [ENH-261] B2 WebFetch HTML 자동수혜 (doc)            0.5h   │
│ [ENH-258] I4 managed-settings 가이드 (수요 대기)      1.5h  │
└──────────────────────────────────────────────────────────────┘

Total: P0 19h + P1 5h + P2 4.5h + P3 2h = ~30.5h (실효 6 영업일 × 4명 동시 작업)
```

---

## 4. Clean Architecture 적용 전략

### 4.1 4-Layer 매핑

| Layer | 책임 | 현재 → 목표 |
|-------|------|-----------|
| **Presentation** (UX Locked) | 사용자 가시 출력 | `lib/ui/*`, `lib/dashboard/*`, `lib/pdca/statusline*`, console writers — **변경 금지**, 단 파일 리네이밍/이동만 허용(출력은 동일) |
| **Application** | UseCase 오케스트레이션 | `hooks/*` handlers, `lib/pdca/orchestrator` (신규), `lib/team/coordinator` (CC Task 분리), `lib/context/session-*` |
| **Domain** (의존성 0) | 순수 비즈니스 규칙 | **신규** `lib/domain/*` + **신규** `lib/cc-regression/*` — `require('fs'/'child_process'/'net')` 금지 |
| **Infrastructure** | CC API / 파일 IO / gh CLI / OTEL / MCP 어댑터 | `scripts/*` + **신규** `lib/infra/cc-bridge.js`, `lib/infra/telemetry.js`, `lib/infra/gh-cli.js`, `lib/infra/docs-code-scanner.js` |

### 4.2 DIP Port 인터페이스 6개 (JSDoc typedef)

```js
// lib/domain/ports/cc-payload.port.js
/** @typedef {Object} CCPayloadPort
 *  @property {() => Promise<HookInput>} read
 *  @property {(out: HookOutput) => void} write
 *  @property {(msg: string) => void} warn */

// lib/domain/ports/state-store.port.js
/** @typedef {Object} StateStorePort
 *  @property {(key: string) => Promise<any>} load
 *  @property {(key: string, val: any) => Promise<void>} save
 *  @property {(key: string) => Promise<void>} lock */

// lib/domain/ports/regression-registry.port.js
/** @typedef {Object} RegressionRegistryPort
 *  @property {() => Promise<Guard[]>} listActive
 *  @property {(id: string) => Promise<boolean>} isResolved
 *  @property {(id: string, reason: string) => Promise<void>} deactivate */

// lib/domain/ports/audit-sink.port.js (dual sink: file + OTEL)
/** @typedef {Object} AuditSinkPort
 *  @property {(event: AuditEvent) => Promise<void>} emit */

// lib/domain/ports/token-meter.port.js
/** @typedef {Object} TokenMeterPort
 *  @property {(turnId: string) => number} read
 *  @property {(turnId: string, delta: number) => void} accumulate */

// lib/domain/ports/docs-code-index.port.js (ENH-241)
/** @typedef {Object} DocsCodeIndexPort
 *  @property {() => Promise<{skills: number, agents: number, hooks: number}>} measure
 *  @property {(doc: string) => Promise<Discrepancy[]>} crossCheck */
```

### 4.3 디렉토리 트리 제안

```
bkit-claude-code/
├── lib/
│   ├── domain/                              [NEW] Layer: Domain (의존성 0)
│   │   ├── ports/
│   │   │   ├── cc-payload.port.js
│   │   │   ├── state-store.port.js
│   │   │   ├── regression-registry.port.js
│   │   │   ├── audit-sink.port.js
│   │   │   ├── token-meter.port.js
│   │   │   └── docs-code-index.port.js
│   │   ├── guards/
│   │   │   ├── enh-262-hooks-combo.js       (from scripts/pre-write.js:67-77)
│   │   │   ├── enh-263-claude-write.js      (from scripts/pre-write.js:65-76)
│   │   │   ├── enh-264-token-meter.js       (from lib/pdca/status.js)
│   │   │   └── dangerous-patterns.js        (from scripts/config-change-handler.js:29-35)
│   │   └── rules/
│   │       └── docs-code-invariants.js      (skills=39, agents=36, hooks=21)
│   │
│   ├── cc-regression/                       [NEW] Layer: Domain (Guard 레지스트리)
│   │   ├── registry.js                      (~180 LOC)
│   │   ├── defense-coordinator.js           (~240 LOC)
│   │   ├── token-accountant.js              (~200 LOC)
│   │   ├── lifecycle.js                     (~160 LOC)
│   │   ├── attribution-formatter.js         (~120 LOC)
│   │   ├── index.js (Facade)                (~60 LOC)
│   │   └── guards/
│   │       ├── mon-cc-02.js                 (#47855 /compact block)
│   │       ├── mon-cc-06-native.js          (v2.1.113 회귀 10건 그룹)
│   │       ├── enh-247-precompact.js        (ENH-232 lifecycle)
│   │       └── ...총 16+ 건 Guard
│   │
│   ├── infra/                               [NEW] Layer: Infrastructure
│   │   ├── cc-bridge.js                     (CCPayloadPort 구현)
│   │   ├── fs-state-store.js                (StateStorePort)
│   │   ├── telemetry.js                     (AuditSinkPort + OTEL ENH-259)
│   │   ├── gh-cli.js                        (GitHub ops)
│   │   └── docs-code-scanner.js             (DocsCodeIndexPort, ENH-241)
│   │
│   ├── pdca/
│   │   ├── status-core.js                   [SPLIT from 872 LOC]
│   │   ├── status-migration.js              [SPLIT, one-shot cold path]
│   │   └── status-cleanup.js                [SPLIT]
│   │
│   └── audit/
│       └── audit-logger.js                  [FIX C1/C2 + sanitizer]
│
├── hooks/                                    [UNCHANGED 인터페이스, adapter화]
│   └── pre-write.js                         (~120 LOC, guards delegation only)
│
├── scripts/                                  [UNCHANGED] Layer: Infra entry
│   └── ux-diff.js                           [NEW] UX golden 비교 runner
│
├── test/
│   └── ux-golden/                           [NEW]
│       ├── snapshots/                       (30+ golden files)
│       ├── runner/ (capture/compare/update)
│       └── fixtures/
│
├── .eslintrc.json                            [NEW] (Sprint 0)
├── .prettierrc                               [NEW] (Sprint 0)
│
└── docs/
    ├── 01-plan/features/
    │   └── bkit-v2110-integrated-enhancement.plan.md   [본 문서]
    └── 02-design/
        └── bkit-v2110-clean-architecture.design.md     [Sprint 0 산출]
```

---

## 5. ENH 상세 대응 계획 (9건)

### 5.1 ENH-254 (P0) — FORK_SUBAGENT + #51165 방어 (2.5h)

| 항목 | 내용 |
|------|------|
| **근거** | CC v2.1.117 F1 (`CLAUDE_CODE_FORK_SUBAGENT=1` env) + MON-CC-06 #51165 (Windows `context: fork` × `disable-model-invocation` 회귀) |
| **영향 파일** | `skills/zero-script-qa/SKILL.md:10-11`, 신규 `lib/domain/guards/enh-254-fork-precondition.js` |
| **Clean Architecture** | Domain Guard (의존성 0). Infrastructure에서 env/플랫폼 읽기 → Port 경유 주입 |
| **수용 기준** | ① env 미설정 시 명시 오류 메시지 출력 ② Windows + disable-model-invocation 조합 시 사전 경고 ③ L3 회귀 TC 통과 ④ golden file `warnings/fork-precondition-fail.txt` diff=0 |
| **Philosophy** | Automation First ✅ / No Guessing ✅ / Docs=Code ✅ |
| **의존성** | Sprint 0 완료 (Port 정의) |

### 5.2 ENH-256 (P0) — Glob/Grep Native 제거 Grep 전수 검증 (1.5h)

| 항목 | 내용 |
|------|------|
| **근거** | CC v2.1.117 F3 (macOS/Linux native 빌드 Glob/Grep 제거, bfs/ugrep 내장) |
| **영향 파일** | `skills/**/*.md` + `agents/**/*.md` + `scripts/*.js` + `lib/**/*.js` + `hooks/**/*.js` 전수 grep 후 결과 문서화 |
| **Clean Architecture** | 검증 스크립트는 `scripts/cc-tool-audit.js` (Infrastructure) |
| **수용 기준** | ① grep 결과 0건 또는 Bash 대체 패턴 명시 ② macOS/Linux/Windows 크로스 L5 테스트 ③ 결과가 README 플랫폼 매트릭스에 반영 |
| **대체 전략** | Glob 호출 → Bash `bfs` + `-name` 패턴 / Grep 호출 → Bash `ugrep` + 정규식 |

### 5.3 ENH-257 (P1) — F6/B14 PreCompact 재평가 (2h, 2주 실측 후)

| 항목 | 내용 |
|------|------|
| **근거** | CC v2.1.117 F6/B14 (Opus 4.7 `/context` 1M 기준 수정) → ENH-232 PreCompact block(#47855 MON-CC-02 방어) 해제 가능성 |
| **영향 파일** | `scripts/context-compaction.js:44-56`, `lib/core/context-budget.js:17` (DEFAULT_MAX_CHARS=8000 재검토) |
| **실측 방법** | Docker 로그 기반 Zero Script QA. 2주간 Opus 1M 세션 `/compact` 동작 100+ 샘플 수집 |
| **판정 기준** | PreCompact block 발생률 **< 5%** → ENH-232 해제 / ≥ 5% → 유지 + ENH-247 재조사 |
| **라이프사이클** | `lib/cc-regression/guards/mon-cc-02.js`의 `removeWhen()` 메서드가 판정 자동화 |
| **의존성** | Sprint 3 시작 전 Sprint 1~2 완료 (cc-regression 모듈 구축) |

### 5.4 ENH-259 (P2) — I7 OTEL Dual Sink 어댑터 (2.5h, 조건부)

| 항목 | 내용 |
|------|------|
| **근거** | CC v2.1.117 I7 (OTEL `command_name`/`command_source`/`effort` 확장, MCP/custom 도구명 기본 redact) |
| **영향 파일** | `lib/audit/audit-logger.js` + 신규 `lib/infra/telemetry.js` (OTEL adapter) |
| **설계** | `AuditSinkPort` 추상화 + 2개 구현체 (file sink 기존 유지, OTEL sink 신규). 환경변수 `OTEL_ENDPOINT` 설정 시에만 dual write |
| **수용 기준** | ① file sink 출력 형식 불변(기존 호환) ② OTEL off 시 오버헤드 0 ③ redact 정책: `api_key`/`token`/`password` 자동 마스킹 |
| **조건부 강등 트리거** | audit-logger ↔ OTEL payload **중복 분석 (1h)** 후 중복 50%+ 이면 P2 유지, 미만이면 P3 강등 |

### 5.5 ENH-258 (P3 강등) — I4 Managed-settings 엔터프라이즈 가이드 (수요 대기)

| 항목 | 내용 |
|------|------|
| **근거** | CC v2.1.117 I4 (`blockedMarketplaces`/`strictKnownMarketplaces` autoupdate 전구간 강제) |
| **영향 파일** | `docs/bkit-auto-mode-workflow-manual.md` (추가 섹션) — **코드 변경 0** |
| **수용 기준** | 엔터프라이즈 사용자 3+ 요청 수신 시 작성 개시 |

### 5.6 ENH-260 (P3 관찰) — B11 Subagent Malware 오탐 자동수혜 (0h)

**설명**: v2.1.117 B11 자동 수혜로 코드 변경 없음. CTO Team 12명 병렬 spawn 안정성 향상. **릴리스 노트만 기록**.

### 5.7 ENH-261 (P3 관찰) — B2 WebFetch HTML Hang 자동수혜 (0.5h doc)

**설명**: 자동 수혜. `docs/bkend-cookbook.md`에 "v2.1.117+ 대용량 HTML fetch 성능 개선" 1-line 기록만.

### 5.8 ENH-262 (P0) — #51798 조합 통합 방어 (1h)

| 항목 | 내용 |
|------|------|
| **근거** | CC v2.1.117 #51798 HIGH 회귀 (PreToolUse `allow` + `dangerouslyDisableSandbox:true` 조합 Bash prompt 표시) |
| **영향 파일** | `scripts/pre-write.js:67-77` (호출자), 신규 `lib/domain/guards/enh-262-hooks-combo.js` |
| **구현 요약** | Guard가 조합 탐지 시 **차단하지 않고** attribution 메시지만 stderr로 출력 ("CC v2.1.117 #51798 regression — not a bkit failure") |
| **UX 영향** | 없음 — CC 자체가 prompt를 띄우는 상황에 bkit가 원인 귀속만 추가 |
| **수용 기준** | ① L3-CCR-01 통과 ② `warnings/dangerous-patterns.txt` golden diff=0 ③ `bypassFlag` 환경변수로 Guard 비활성 가능 ④ lifecycle.js가 CC v2.1.118+ 도달 시 Guard 자동 해제 |

### 5.9 ENH-263 (P0) — #51801 `.claude/` Write 통합 방어 (2h)

| 항목 | 내용 |
|------|------|
| **근거** | CC v2.1.117 #51801 HIGH 회귀 (`bypassPermissions` + `.claude/*` write 시 user prompt 발생, 내장 보호가 hook allow를 override) |
| **영향 파일** | `scripts/pre-write.js:65-76`, 신규 `lib/domain/guards/enh-263-claude-write.js` |
| **구현 요약** | ENH-262와 **동일 Guard 모듈 패턴**. `.claude/agents|skills|channels|commands` write + bypassPermissions 조합 시 attribution |
| **UX 영향** | 없음 — CC가 prompt 표시 시 bkit가 원인 귀속 |
| **수용 기준** | ① L3-CCR-02 통과 ② `.claude/` write 빈도 측정 기록 ③ lifecycle 자동 해제 |

### 5.10 ENH-264 (P0) — #51809 Per-turn 토큰 측정 (3h)

| 항목 | 내용 |
|------|------|
| **근거** | CC v2.1.117 #51809 HIGH 회귀 (Sonnet 4.6 per-turn +6~8k 토큰 상시 오버헤드, Max 5h quota 90분 고갈) |
| **영향 파일** | 신규 `lib/cc-regression/token-accountant.js`, `lib/pdca/status-core.js` 통합 |
| **구현 요약** | NDJSON append-only `.bkit/runtime/token-ledger.json`. 기록 스키마 §8.4. **본문 redact 필수** (A03 Injection 확대 방어) |
| **UX 영향** | **의도적 변경 1건**: statusline에 "Sonnet overhead: +X tokens/turn" 경고 추가 → golden file `statusline/dynamic.txt` 의도적 갱신(`--update` PR 승인) |
| **수용 기준** | ① token-accountant L1 단위 테스트 100% 통과 ② ledger에 prompt 본문 0건 ③ 30일 rolling window rotate 동작 ④ per-turn overhead > 8000 토큰 시 SessionEnd 경고 |
| **Philosophy 경계** | No Guessing — **측정만**, 정책 결정(CTO Team Sonnet 비율)은 2주 실측 후 별도 결정 |

---

## 6. MON-CC 방어선 라이프사이클 관리 (21 이슈)

### 6.1 방어선 Registry 스키마

```js
// lib/cc-regression/registry.js (데이터 예시)
const CC_REGRESSIONS = [
  {
    id: 'MON-CC-02',
    issue: 'https://github.com/anthropics/claude-code/issues/47855',
    severity: 'HIGH',
    since: '2.1.6',
    expectedFix: '2.1.117',              // ENH-257 검증 대상
    affectedFiles: ['scripts/context-compaction.js:44-56'],
    guardFile: 'lib/cc-regression/guards/mon-cc-02.js',
    resolvedAt: null                      // lifecycle.js가 업데이트
  },
  {
    id: 'ENH-262',
    issue: 'https://github.com/anthropics/claude-code/issues/51798',
    severity: 'HIGH',
    since: '2.1.117',
    expectedFix: null,                    // CC hotfix 대기
    affectedFiles: ['scripts/pre-write.js:67-77'],
    guardFile: 'lib/cc-regression/guards/enh-262-hooks-combo.js',
    resolvedAt: null
  },
  // ... MON-CC-06 19건 + ENH-263/264 등
];
```

### 6.2 자동 해제 조건 (lifecycle.js)

```js
async function reconcile(registry, ccVersion) {
  for (const r of registry) {
    if (r.expectedFix && semverGte(ccVersion, r.expectedFix)) {
      const verified = await runRegressionTestCase(r.id);
      if (verified) {
        r.resolvedAt = new Date().toISOString();
        await audit.emit({ type: 'guard.deactivated', id: r.id, ver: ccVersion });
      }
    }
  }
}
```

### 6.3 주간 감시 (cc-version-researcher)

- 매주 1회 `cc-version-researcher` agent가 MON-CC-02/06 19건 상태 갱신
- `gh issue view <num> --json state,closedAt,labels` 실행 후 `registry.js` 업데이트
- 새 CC 버전 출시 시 `lifecycle.reconcile()` 자동 실행

---

## 7. Docs=Code 부채 해소 (ENH-241)

### 7.1 교차 검증 대상 (3중 오기 전례)

| 항목 | 정답 (2026-04-21 실측) | 확인 위치 |
|------|---------------------|---------|
| Skills | **39** | `README.md`, `MEMORY.md`, `plugin.json`, `lib/audit/audit-logger.js` |
| Agents | **36** | 동일 위치 3중 |
| Hook Events | **21 구현 / 25 공식 docs** | `hooks/hooks.json`, `MEMORY.md` |
| Lib Modules | **101** | `MEMORY.md` |
| Scripts | **43** | `MEMORY.md` |
| MCP Servers | **2** | `servers/` + `MEMORY.md` |

### 7.2 구현 (`lib/infra/docs-code-scanner.js` — 신규)

```js
// DocsCodeIndexPort 구현
async function measure() {
  return {
    skills: (await glob('skills/*/SKILL.md')).length,
    agents: (await glob('agents/*.md')).length,
    hooks: Object.keys(await fs.readFile('hooks/hooks.json')).length,
    libModules: (await glob('lib/**/*.js')).length,
    scripts: (await glob('scripts/*.js')).length,
  };
}

async function crossCheck(docPath) {
  const content = await fs.readFile(docPath, 'utf8');
  const actual = await measure();
  const discrepancies = [];
  // 정규식으로 "39 skills", "36 agents" 등 숫자 추출 후 비교
  return discrepancies;
}
```

### 7.3 CI Gate

- `.github/workflows/docs-check.yml` 신규 (또는 pre-commit hook)
- PR 시 `node scripts/docs-code-check.js` 실행 → 불일치 1건 이상이면 FAIL

---

## 8. 보안 통합 방어 레이어

### 8.1 Defense-in-Depth 4-Layer

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: CC Built-in (v2.1.116 S1 rm dangerous-path block)      │
│          공식 CC 보안 — Anthropic 책임                          │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: bkit PreToolUse Hook (scripts/pre-write.js)            │
│   2a. CCRegression.checkCCRegression() ← v2.1.10 NEW           │
│       - ENH-262/263 attribution                                  │
│   2b. DANGEROUS_PATTERNS (config-change-handler.js)              │
│       - ENH-246/254 (dangerouslyDisableSandbox 등 5건)          │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: audit-logger (OWASP A03/A08 방어)                      │
│          - details sanitizer (C2 fix)                            │
│          - append-only + SHA-256 integrity                       │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Token Ledger (.bkit/runtime/token-ledger.json)         │
│          - redact → append → rotate (30일)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 OWASP Top 10 대응 매트릭스

| OWASP | 위협 | v2.1.9 현황 | v2.1.10 계획 | Severity |
|-------|------|-----------|----------------|----------|
| **A01** Broken Access Control | `.claude/` write bypass | 방어 부재 | ENH-263 attribution | High |
| **A02** Cryptographic Failures | Fingerprint | SHA-256 (ENH-239) | 현상 유지 | Low |
| **A03** Injection | path traversal, Bash arg | audit sanitize (ENH-237) | token-ledger 본문 금지 | **High** |
| **A04** Insecure Design | sandbox bypass | DANGEROUS_PATTERNS 5개 | registry 계층 추가 | Medium |
| **A05** Security Misconfiguration | env var 노출 | 부분 scrub | SUBPROCESS_ENV_SCRUB 문서화 | Medium |
| **A06** Vulnerable Components | CC 버전 호환 | 수기 추적 | lifecycle.js 자동 탐지 | Medium |
| **A07** Authentication | N/A | - | - | - |
| **A08** Data Integrity | audit-log 변조 | append-only | token-ledger 동일 정책 | Low |
| **A09** Logging | OTEL 부재 | audit-logger | ENH-259 dual sink | Low |
| **A10** SSRF | WebFetch 대용량 | 자동 수혜(B2) | path audit 추가 | Low |

### 8.3 통합 방어 플로우 (Pseudocode)

```javascript
// scripts/pre-write.js (v2.1.10, ~120 LOC)
async function onPreToolUse(input) {
  const ctx = parseHookInput(input);                  // adapter (Infra)
  const ccCheck = await CCRegression.check(ctx);      // Domain

  if (ccCheck.hit) {
    audit.emit({ type: 'cc-regression-detected', ...ccCheck.meta });
    Attribution.format(ccCheck.meta);                  // stderr 조용히
    // 주의: bkit은 차단하지 않음 — CC가 prompt 표시 시 원인 귀속만
  }

  const dangerous = DangerousPatterns.check(ctx);      // Domain
  if (dangerous.block) {
    return { decision: 'deny', reason: dangerous.reason };
  }

  return computePermissionDecision(ctx);               // Application
}
```

### 8.4 Token Ledger 스키마 (NDJSON Append-only)

```
{"ts":"2026-04-22T13:45:12.301Z","sessionHash":"a7f3...9e","agent":"security-architect","model":"claude-sonnet-4-6","ccVersion":"2.1.117","turnIndex":42,"inputTokens":14320,"outputTokens":2108,"overheadDelta":7240,"ccRegressionFlags":["51809"]}
```

**기록 금지**: prompt 본문(`text`/`content`), 파일 full path, env var 값, API 토큰.
**Retention**: 30일 rolling, rotate 시 `.bkit/runtime/archive/` 이동.
**임계값**: per-turn overhead > 8000 → SessionEnd 경고.

---

## 9. UX 불변성 보장 (Golden File 시스템)

### 9.1 디렉토리 구조

```
test/ux-golden/
├── README.md                          # 갱신 방법 + 규칙
├── snapshots/
│   ├── session-start/
│   │   ├── baseline.txt               # additionalContext 전체
│   │   ├── baseline-empty-pdca.txt
│   │   └── baseline-compact-trigger.txt
│   ├── statusline/
│   │   ├── dynamic.txt                # ENH-264 후 의도 갱신 대상
│   │   └── enterprise.txt
│   ├── dashboard/
│   │   ├── workflow-map.txt
│   │   ├── impact-view.txt
│   │   └── control-panel.txt
│   ├── warnings/
│   │   ├── dangerous-patterns.txt
│   │   ├── ux-budget-truncation.txt
│   │   └── fork-precondition-fail.txt
│   └── skill-invocation/
│       ├── zero-script-qa-start.txt
│       └── zero-script-qa-end.txt
├── runner/
│   ├── capture.js                     # 출력 캡처 (stripAnsi)
│   ├── compare.js                     # golden vs 현재 diff
│   └── update.js                      # 의도적 갱신 (--update)
└── fixtures/
    ├── pdca-status-active.json
    └── pdca-status-empty.json
```

### 9.2 Presentation Layer LOCKED 마커

모든 Presentation 파일 상단에:

```js
// @ux-surface: LOCKED
// 변경 시 docs/ADR + test/ux-golden 갱신 PR 필수
```

**ESLint custom rule** `no-ui-logic-outside-presentation`:
- Application/Domain/Infra 레이어에서 `process.stdout.write`, ANSI escape, `chalk` 호출 금지

### 9.3 CI Gate

```bash
# PR 마다 실행
node test/ux-golden/runner/compare.js --fail-on-diff
```

byte-exact diff 1건 이상이면 CI FAIL. 의도적 변경(ENH-264)은:

```bash
node test/ux-golden/runner/update.js --surface statusline --reason "ENH-264 token display added"
```

후 PR에서 diff 리뷰 승인.

---

## 10. 코딩 컨벤션 체크리스트 (20항목)

| # | 항목 | 기대값 |
|---|------|--------|
| 1 | 함수명 camelCase | Yes |
| 2 | 파일명 kebab-case | Yes |
| 3 | 클래스/생성자 PascalCase | Yes |
| 4 | 상수 SCREAMING_SNAKE_CASE | Yes |
| 5 | Domain 모듈이 `require('fs'/'child_process'/'net')` 사용 | **No** |
| 6 | Error는 `throw` (Domain) / `{ ok, data, err }` (Infra boundary) | Yes |
| 7 | Public 함수 JSDoc `@param` + `@returns` 명시 | Yes |
| 8 | 파일당 LOC ≤ 300 (Domain), ≤ 500 (그 외) | Yes |
| 9 | Import 순서: node core → 3rd → lib/domain → lib/application → lib/infra → 상대 | Yes |
| 10 | 순환 의존 0건 (`madge --circular .` 검증) | Yes |
| 11 | Domain → Application 역방향 import | **No** |
| 12 | `console.log` 직접 호출 (Presentation 제외) | **No** |
| 13 | Magic number → 명명 상수 (예: `DEFAULT_MAX_CHARS`) | Yes |
| 14 | async 함수는 항상 await 또는 return | Yes |
| 15 | hook handler는 `process.exit(0/1/2)` 직접 호출 금지 → adapter 경유 | Yes |
| 16 | 하드코딩된 버전 문자열 (`BKIT_VERSION` 외) | **No** |
| 17 | `.bkit/state/*.json` 스키마 변경 시 migration 함수 동반 | Yes |
| 18 | Presentation 파일에 `@ux-surface: LOCKED` 마커 | Yes |
| 19 | Guard 추가 시 `removeWhen()` 미구현 | **No** |
| 20 | Docs=Code 수치 변경 시 3곳(README, MEMORY, audit-logger) 동시 수정 | Yes |

### 10.1 도구 설정

```json
// .eslintrc.json (신규)
{
  "env": { "node": true, "es2022": true },
  "extends": "eslint:recommended",
  "rules": {
    "no-unused-vars": "warn",
    "no-empty": ["error", { "allowEmptyCatch": false }],
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "no-restricted-imports": [
      "error",
      { "patterns": ["../infra/*", "../../infra/*"], "paths": ["fs", "child_process", "net"] }
    ]
  },
  "overrides": [
    {
      "files": ["lib/infra/**", "scripts/**", "hooks/**"],
      "rules": { "no-restricted-imports": "off" }
    },
    {
      "files": ["lib/ui/**", "lib/dashboard/**"],
      "rules": { "no-console": "off" }
    }
  ]
}
```

---

## 11. 리팩토링 기술 부채 해소

### 11.1 Critical Bugs (Sprint 1 최우선)

| # | 파일:라인 | 수정 |
|---|---------|------|
| **C1** | `lib/audit/audit-logger.js:332-344` | `readAuditLogs({ startDate: today })` → `readAuditLogs({ date: today })` 또는 `startDate`/`endDate` 공식 지원 |
| **C2** | `lib/audit/audit-logger.js:115` | `normalizeEntry`에 `sanitizeDetails(details)` 추가 — 키 블랙리스트(`password`/`token`/`apiKey`) + 값 길이 500자 cap |

### 11.2 status.js 분할 (ENH-264 blocker)

```
lib/pdca/status.js (872 LOC)
├── lib/pdca/status-core.js         (~300 LOC) — 조회/변경 공개 API
├── lib/pdca/status-migration.js    (~250 LOC) — v1→v2→v3 migration, one-shot cold path
└── lib/pdca/status-cleanup.js      (~300 LOC) — deleteFeature, enforceFeatureLimit
```

### 11.3 pre-write.js 파이프라인화 (ENH-262/263 구현 선행)

```
scripts/pre-write.js (286 → ~120 LOC)
  - onPreToolUse 단일 엔트리
  - runCCRegressionCheck / runDangerousPatterns / runPermissionDecision 순수 함수 체인
  - silent catch 4회 → debugLog 의무화
```

### 11.4 session-context.js 빌더 통일

11개 `ctx += ...` 패턴 → `array.push + join` (30% 빠름, ENH-240 budget guard 친화적)

### 11.5 ENH-167 완결

`hooks/startup/session-context.js:233` "v2.1.9" 하드코딩 → `require('../../lib/core/version').BKIT_VERSION`

---

## 12. 실행 로드맵 (6 Sprint / 22 영업일)

| Sprint | 기간 | 범위 | 수용 기준 | Owner |
|--------|------|------|-----------|-------|
| **S0** 사전 준비 | 3일 | UX golden 10→30개 캡처, ESLint 규칙 3개, `madge` 의존성 그래프, BKIT_VERSION 중앙화(ENH-167), Port 6개 정의 | `npm run ux-diff` 통과, 순환 의존 0, lint 에러 0 | enterprise + qa + code-analyzer |
| **S1** 방어선 Domain 분리 + Critical Fix | 5일 | C1/C2 즉시 fix → ENH-262/263/264 Guard 3개 → `lib/domain/guards/` + `lib/cc-regression/registry.js` + pre-write.js adapter화 + status.js 분할 | pre-write.js ≤ 120 LOC, status.js → 3파일, Guard 단위 테스트 ≥ 90%, Critical bug 0 | security + code-analyzer + qa |
| **S2** 관측성 격리 | 4일 | ENH-259 OTEL dual sink → `lib/infra/telemetry.js`, `AuditSinkPort` 구현 2개 | audit-logger LOC -30%, OTEL on/off 토글 테스트 통과 | bkend + security |
| **S3** 회귀 레지스트리 | 4일 | MON-CC 19건 전수 Guard 등록, ENH-247 자동 탐지, ENH-257 PreCompact 해제 판정 자동화 | Registry Guard ≥ 19, CI에서 `removeWhen` 일 1회 실행 | infra + cc-version-researcher |
| **S4** Docs=Code 교차 검증 | 3일 | ENH-241 `DocsCodeIndexPort` 구현, README/MEMORY/audit-logger 3중 오기 CI gate | 불일치 1건 이상 시 CI FAIL, 현 시점 불일치 0 | design-validator + code-analyzer |
| **S5** 환경 Precondition + 릴리스 | 3일 | ENH-254 FORK_SUBAGENT, ENH-256 grep 전수, ENH-253 #51165 회귀 TC, 릴리스 노트 + v2.1.10 태그 | zero-script-qa 환경 precondition 5종 통과, grep FAIL 0, gap-detector Match Rate ≥ 95% | cto-lead + gap-detector + report-generator |

**병렬 가능 구간**: S2 ↔ S4 (Infra 독립), S3 ↔ S5 (Guard 독립)
**총 영업일**: 22일 순차 기준 / 16일 병렬 최적화 시

### 12.1 Sprint 1 상세 일정 (예시)

| Day | 작업 | Owner |
|-----|------|-------|
| 1 | C1/C2 audit-logger fix + 테스트 | code-analyzer + qa |
| 1~2 | status.js 3분할 + migration 격리 | code-analyzer |
| 2~3 | `lib/domain/guards/enh-262/263.js` 구현 + Guard 테스트 | security + qa |
| 3~4 | pre-write.js 파이프라인화 + silent catch 통일 | code-analyzer |
| 4 | `lib/cc-regression/registry.js` + `lifecycle.js` | security |
| 5 | UX Golden file 비교 통과 확인 + Sprint 1 retro | cto-lead + gap-detector |

---

## 13. 테스트 전략 (L1~L5 매트릭스)

### 13.1 ENH별 테스트 계획

| ENH | L1 Unit | L2 Integration | L3 Regression TC | L4 UX Golden | L5 E2E |
|-----|---------|----------------|------------------|--------------|--------|
| ENH-254 | `zero-script-qa` frontmatter | `disable-model-invocation` × `fork` 조합 | #51165 재현 스크립트 | `warnings/fork-precondition-fail.txt` diff=0 | zero-script-qa 정상 실행 (Docker) |
| ENH-256 | 39 skills Glob/Grep grep | native 대체 Bash 시뮬레이션 | 기능 누락 확인 | 없음 | 3 플랫폼 크로스 |
| ENH-262 | `DANGEROUS_PATTERNS` 배열 수 | 조합 픽스처 → 경고 | v2.1.9 기준 조합 탐지 | `warnings/dangerous-patterns.txt` diff=0 | 없음 |
| ENH-263 | `.claude/` write 카운터 | `bypassPermissions` + write 픽스처 | 빈도 0 → n 증가 검증 | `warnings/` 신규 golden | 없음 |
| ENH-264 | `token-accountant.js` 단위 | `status.js` 통합 정확도 | statusline 포맷 유지 | `statusline/dynamic.txt` 의도 갱신 | 5+ 세션 Sonnet vs Opus 비교 (수동, 2주) |
| ENH-257 | PreCompact block 플래그 | 2주 100+ 샘플 수집 | block 발생률 < 5% → 해제 | PreCompact 메시지 golden | 판정 후 ENH-232 해제 |
| ENH-259 | OTEL payload redact | audit-logger ↔ OTEL bridge | 기존 포맷 유지 | 없음 | 조건부 |

### 13.2 Zero Script QA 통합 3건

1. **ENH-239 SessionStart dedup lock**: `docker logs | grep "session-ctx-fp"` → fingerprint dedup 작동 확인
2. **ENH-203 PreCompact block**: `/compact` 발화 → `decision:block` 또는 `pass` 기록 확인
3. **ENH-257 방어선 라이프사이클**: 100+ 샘플 수집 후 block 발생률 계산

### 13.3 허용 오차

| 측정 항목 | 오차 | 허용 범위 |
|---------|------|---------|
| ENH-264 토큰 누적 정확도 | Sonnet/Opus 응답 세션별 변동 | ±5% |
| ENH-257 PreCompact block 발생률 | 세션 길이/크기 분포 | 100+ 샘플 필수, 세션 유형 층화 |
| ENH-256 native grep 성능 | 파일 크기/캐시 | 성능 기준 없음 (존재 검증만) |

---

## 14. 리스크 및 대응

| # | 리스크 | 심각도 | 발생 확률 | 대응 |
|---|------|--------|---------|------|
| R1 | 리팩토링 중 UX byte-diff 발생 | **High** | Medium | S0 골든 30개 확대, 각 Sprint 완료 시 CI gate 강제 |
| R2 | Guard 오탐으로 정상 흐름 차단 | High | Low | `bypassFlag` env + audit 로깅 + attribution만 노출(차단 금지) |
| R3 | CC 네이티브 바이너리(v2.1.118) 추가 회귀 | Medium | Medium | `cc-bridge.js` version-pinned 분기, 주간 cc-version-researcher |
| R4 | status.js 분할 중 v1→v2→v3 migration 깨짐 | **High** | Low | migration one-shot 격리 + 현존 v1 사용자 확인(거의 없음 추정) + rollback TC |
| R5 | JSDoc typedef 타입 검증 미약 | Medium | High | `tsc --allowJs --checkJs --noEmit` CI 단계 추가 (TS 도입 아님, 순수 검증) |
| R6 | Token ledger prompt 본문 유출 | **Critical** | Low | redact 함수 강제 통과 + L1 TC 100% + 코드 리뷰 시 필수 체크리스트 |
| R7 | MON-CC Guard 레지스트리 부채 누적 | Low | High | 분기별 `expectedFix` 경과 Guard 리뷰 PR 자동 생성 |
| R8 | Presentation LOCKED 마커 우회 | Low | Low | ESLint custom rule + pre-commit hook 이중 차단 |
| R9 | ENH-257 실측 중 CC v2.1.118 hotfix 배포 | Medium | Medium | 실측 중단 → 새 CC 버전 기준 재실측 2주 |
| R10 | Critical bug (C1/C2) 프로덕션 영향 범위 과소 평가 | High | Low | 감사 로그 3개월 회귀 검토 + 사용자 공지 |

---

## 15. 수용 기준 (v2.1.10 릴리스 Ready)

### 15.1 UX 불변성 (절대)

- [ ] UX golden file diff = 0 (ENH-264 statusline 제외, 의도적 PR 승인 완료)
- [ ] ANSI 제거 후 비교 기준 모든 surface 통과
- [ ] Presentation 파일 `@ux-surface: LOCKED` 마커 100%

### 15.2 P0 회귀 TC

- [ ] ENH-254 L3-CCR-04(Lifecycle) 통과
- [ ] ENH-256 39 skills + 43 scripts 전수 grep 결과 기록
- [ ] ENH-262 L3-CCR-01 통과
- [ ] ENH-263 L3-CCR-02 통과
- [ ] ENH-264 L3-CCR-03 통과 (token-ledger prompt 본문 0건)
- [ ] L3-CCR-05 defense-in-depth 교차 통과

### 15.3 Clean Architecture

- [ ] 4-layer 디렉토리 구조 확립 (`lib/domain/`, `lib/cc-regression/`, `lib/infra/` 생성)
- [ ] DIP Port 6개 JSDoc typedef 정의
- [ ] 순환 의존 0건 (`madge --circular .` 통과)
- [ ] Domain 모듈에서 `require('fs'/'child_process'/'net')` 0건

### 15.4 코드 품질

- [ ] Critical C1/C2 fix 완료
- [ ] status.js 872→300×3 분할
- [ ] pre-write.js 286→~120 LOC 파이프라인화
- [ ] 컨벤션 체크리스트 20항목 100% 통과
- [ ] ESLint + Prettier 설정 도입, lint 에러 0
- [ ] `tsc --checkJs --noEmit` 타입 검증 에러 0

### 15.5 MON-CC 연속성

- [ ] `lib/cc-regression/registry.js` Guard ≥ 19
- [ ] lifecycle.js 일 1회 CI 실행 동작
- [ ] v2.1.10 릴리스 후 48시간 관찰 — 신규 회귀 0건

### 15.6 Docs=Code

- [ ] ENH-241 `DocsCodeIndexPort` 구현, 불일치 0건
- [ ] CI gate: 불일치 1건 이상 시 FAIL
- [ ] README/MEMORY/audit-logger 39/36/21/101 동기화

### 15.7 기존 회귀 없음

- [ ] 기존 evals/ 31개 skill 평가 0 regression
- [ ] session-context.js 기존 TC (ENH-238/239) 통과
- [ ] lib/core/context-budget.js applyBudget 단위 테스트 통과
- [ ] gap-detector Match Rate ≥ 95%

---

## Appendix A. ENH 번호 색인 (v2.1.10)

| ENH | Priority | 제목 | 시간 | Status |
|-----|----------|------|------|--------|
| ENH-254 | P0 | F1 FORK_SUBAGENT + #51165 방어 | 2.5h | Plan |
| ENH-255 | ❌ YAGNI | Agent `mcpServers:` 채택 | 0h | Drop |
| ENH-256 | P0 | F3 Glob/Grep native grep 전수 | 1.5h | Plan |
| ENH-257 | P1 | F6/B14 → ENH-232 재평가 (2주) | 2h | Plan |
| ENH-258 | P3 강등 | I4 managed-settings 가이드 | 1.5h | Defer |
| ENH-259 | P2 조건부 | I7 OTEL dual sink | 2.5h | Plan |
| ENH-260 | P3 관찰 | B11 subagent malware 자동수혜 | 0h | Plan |
| ENH-261 | P3 관찰 | B2 WebFetch HTML 자동수혜 (doc) | 0.5h | Plan |
| ENH-262 | P0 | #51798 조합 통합 방어 | 1h | Plan |
| ENH-263 | P0 | #51801 `.claude/` write 통합 방어 | 2h | Plan |
| ENH-264 | P0 | #51809 per-turn 토큰 측정 | 3h | Plan |
| ENH-167 | P1 | BKIT_VERSION 중앙화 잔류 | 1h | Plan |
| ENH-241 | P1 | Docs=Code 교차 검증 스킴 | 2h | Plan |
| ENH-247 | P2 | #47855 실측 (ENH-257에 흡수) | 1h | Plan |

---

## Appendix B. MON-CC 이슈 번호 색인

### MON-CC-02 (1건 OPEN)
- [#47855](https://github.com/anthropics/claude-code/issues/47855) Opus 1M /compact block — 10릴리스 OPEN, ENH-257 실측 대상

### MON-CC-06 (19건 active)
- **v2.1.113 네이티브 바이너리 (10건)**: #50274, #50383, #50384, #50541, #50567, #50609, #50616, #50618, #50640, #50852
- **v2.1.114~116 HIGH (6건)**: #51165, #51234, #51266, #51275, #51391, #50974
- **v2.1.117 HIGH (3건)**: #51798, #51801, #51809

### 장기 OPEN (ENH 연계, 추적만)
- [#47482](https://github.com/anthropics/claude-code/issues/47482) output styles frontmatter — ENH-214 방어 유효
- [#47828](https://github.com/anthropics/claude-code/issues/47828) SessionStart systemMessage — bkit 미사용, 해제 후보

### 해제된 모니터 (참고)
- MON-CC-01 ([#47810](https://github.com/anthropics/claude-code/issues/47810)) — CLOSED duplicate
- MON-CC-05 ([#48963](https://github.com/anthropics/claude-code/issues/48963)) — CLOSED

---

## Appendix C. 팀 분석 결과 요약

### C.1 Explore Agent (코드베이스 심층 분석)
- 150+ 주요 파일 / 24,647 LOC (lib only)
- 5 핫스팟 (H1~H5) 식별
- Lazy require 패턴 8+ 중복
- ESLint/Prettier 미도입

### C.2 Enterprise Expert (Clean Architecture)
- 4-layer 매핑 (Presentation/Application/Domain/Infrastructure)
- DIP Port 6개 설계
- 22일 6-Sprint 로드맵
- 방어선 라이프사이클 관리 패턴

### C.3 Security Architect (통합 방어)
- `lib/cc-regression/` 6 파일 ~960 LOC
- Defense-in-Depth 4-layer 다이어그램
- OWASP Top 10 × bkit v2.1.10 매트릭스
- L3-CCR-01~05 회귀 TC 5건

### C.4 QA Strategist (UX 불변성)
- Golden File 시스템 (30+ snapshots)
- 회귀 방지 매트릭스 (ENH × Pre/Post/Guard)
- Zero Script QA 통합 3건
- 허용 오차 명시

### C.5 Code Analyzer (Quality Baseline)
- 전체 스코어 3.3/5
- Critical 2건 (C1/C2)
- status.js 872→300×3 분할 권고
- 리팩토링 권고 8건 우선순위화

---

## Appendix D. 관련 파일 경로 (전수)

### 수정 대상 (기존 파일)
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/scripts/pre-write.js`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/scripts/config-change-handler.js`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/scripts/context-compaction.js`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/lib/pdca/status.js`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/lib/core/context-budget.js`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/lib/audit/audit-logger.js`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/hooks/startup/session-context.js`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/skills/zero-script-qa/SKILL.md`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/.claude-plugin/plugin.json`

### 신규 파일 (Clean Architecture)
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/lib/domain/ports/*.port.js` (6)
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/lib/domain/guards/*.js` (4)
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/lib/domain/rules/docs-code-invariants.js`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/lib/cc-regression/*.js` (6 + guards 19)
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/lib/infra/*.js` (5)
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/lib/pdca/status-core.js` (split)
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/lib/pdca/status-migration.js` (split)
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/lib/pdca/status-cleanup.js` (split)
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/scripts/ux-diff.js`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/scripts/docs-code-check.js`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/test/ux-golden/**`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/.eslintrc.json`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/.prettierrc`
- `/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/docs/02-design/bkit-v2110-clean-architecture.design.md`

---

## 끝.

**Next Steps**:
1. 본 Plan 문서에 대한 `design-validator` agent 검증 (완결성 체크)
2. 사용자 승인 후 Sprint 0 착수
3. Sprint 1 완료 시 `gap-detector` 1차 Match Rate 측정
4. 각 Sprint 완료 시 `report-generator` 보고서 + MEMORY.md 동기화
5. v2.1.10 릴리스 후 48시간 관찰 창 → 최종 Release Report (`report-generator`)

**본 문서는 v2.1.10 개발 착수 시 유일한 Source of Truth입니다. 스코프 변경 시 본 문서를 먼저 갱신한 후 구현에 반영합니다.**
