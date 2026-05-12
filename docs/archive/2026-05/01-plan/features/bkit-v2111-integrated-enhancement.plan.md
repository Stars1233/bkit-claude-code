---
feature: bkit-v2111-integrated-enhancement
phase: 01-plan
method: Plan Plus (Brainstorming-Enhanced PDCA)
status: Draft — Plan-Plus + Design 완료, Do 진입 대기
version: 2.1.11 (target)
baseline: 2.1.10 (main merged, commit f2c17f3)
created: 2026-04-22
last-patched: 2026-04-28
author: kay kim (POPUP STUDIO PTE. LTD.)
project: bkit — AI Native Development OS
approach: Approach B — Thematic Sprint (4 Sprint × 20 features, CC v2.1.118 + v2.1.121 patch 완료)
cc-v2118-patched: true
cc-v2121-patched: true
cc-impact-analysis:
  - docs/03-analysis/cc-v2117-v2118-bkit-v2111-impact.md (CC v2.1.118)
  - docs/04-report/features/cc-v2120-v2121-impact-analysis.report.md (CC v2.1.121, ADR 0003 두 번째 적용)
primary_persona: Daniel Kwon (Dynamic 창업자, NPS 9/10)
secondary_persona: Yuki Tanaka (Enterprise 리드, NPS 7/10)
related:
  - docs/03-analysis/bkit-architecture-completeness.analysis.md (88/100 Enterprise Grade)
  - docs/03-analysis/bkit-plugin-vibecoding-ux.analysis.md (65/100 B+)
  - docs/01-plan/features/bkit-v2110-integrated-enhancement.plan.md (v2.1.10 Sprint 0~7 패턴)
---

# bkit v2.1.11 Integrated Enhancement Plan (Plan Plus)

> **Summary**: v2.1.10 Enterprise Grade 아키텍처(88/100) 위에 UX B+ 등급(65/100)의 23점 격차를 좁히는 **UX·Arch 통합 대규모 릴리스**. 4 Thematic Sprint (Onboarding Revolution / Discoverability / Trust Foundation / Port Extension & Governance) × 20 features로 구조화하여 "AI Native Development OS" 포지셔닝에 걸맞은 **접근성·완성도 동반 상승**을 이룬다.
>
> **CC v2.1.121 patch (2026-04-28, ADR 0003 두 번째 적용)**: Sprint δ FR-δ4 token-report 묶음에 **CAND-004 OTEL 3 누적 통합** (I4-121 + F8-119 + I6-119 단일 PR). 신규 FR 발급 불요, FR 카운트 20 유지. CC 79 연속 호환 확정 (v2.1.121 검증 완료, F9-120 closure 2 릴리스 연속 PASS, F9-121 Layer 분리 무영향 확정). 신규 carryover 4건 (CAND-003/005/006/007)은 v2.1.12+ 이월. R-3 "safety hooks 무시" 8건 시리즈는 MON-CC-NEW 2주 카운터 시작 (2026-04-28~2026-05-12).
>
> **Project**: bkit — AI Native Development OS
> **Version Target**: v2.1.11 (baseline v2.1.10 f2c17f3)
> **Author**: kay kim
> **Date**: 2026-04-22
> **Status**: Draft (Plan-Plus 완료)
> **Method**: Plan Plus — Brainstorming-Enhanced PDCA (Phase 0~5)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | bkit v2.1.10은 **엔지니어링 A급(88/100)** 에 도달했으나 **UX B급(65/100)** — 23점 격차. Daniel 페르소나(Dynamic 창업자)에게는 NPS 9지만, 설치 후 "첫 5분 경험"·용어 과부하·Trust Score dead-code 잔존·Application Layer 경계 모호 등 **접근성과 구조 완성도 동시 공백**이 Claude Code plugin marketplace 공식 등록과 지속 가능한 확장을 가로막고 있다. |
| **Solution** | **Approach B (Thematic Sprint)** 로 19 features를 4 주제 Sprint (α Onboarding / β Discoverability / γ Trust / δ Port) 로 묶어 v2.1.10 Sprint 0~7 패턴을 재활용. UX Quick Wins 11건 + Arch 부채 청산 8건을 응집력 있는 CHANGELOG 블록으로 배포한다. |
| **Function/UX Effect** | ① First-run wizard·README 2층·One-Liner 정체성 확정으로 **초기 이탈 40%→15%** 추정. ② `/bkit explore`·`/bkit evals`·`/pdca watch`·`/pdca fast-track` 4개 slash command로 **발견성 +50%**. ③ Trust Score E2E + Application Layer ADR + L5 9-scenario 로 **종합점수 88→92+**. ④ MCP Port 추상화 + M1~M10 매핑 + Trigger baseline 으로 **v2.2.x 확장 기반** 확보. |
| **Core Value** | "**verified-quality plugin**이라는 카테고리를 Claude Code 생태계에서 단독 선점하되, Daniel 페르소나가 '첫 세션에 감동'하게 한다." UX+Arch 동반 상승으로 **marketplace 공식 등록 신청 조건 충족**. |

---

## Context Anchor

| 축 | 내용 |
|----|------|
| **WHY** | v2.1.10 main 머지 직후, 두 심층 분석(Arch 88·UX 65)이 23점 격차를 드러냈다. 아키텍처만 더 올리면 UX 이탈이, UX만 올리면 기술 부채가 누적된다. 이번 릴리스는 **격차 자체를 정조준**하여 두 축을 동반 상승시킨다. |
| **WHO** | **Primary**: Daniel Kwon — Dynamic level 풀스택 창업자 (95% 적합, NPS 9→10 목표). **Secondary**: Yuki Tanaka — Enterprise 리드 (80% 적합, NPS 7→9 목표). **Excluded**: Mina Park — Starter (33% 적합, bkit-starter 로 이관). |
| **RISK** | (R-A) 19 features 병렬 진행 시 Sprint 간 의존성 충돌 — 특히 γ Application Layer 변경이 β Discoverability slash command 경로에 영향. (R-B) Trust Score E2E 검증 실패 시 Sprint γ 전체 재계획. (R-C) `/bkit explore` UI·`/pdca watch` live dashboard 가 CC native UI 한계에 부딪힐 가능성. |
| **SUCCESS** | (a) 종합 점수 **Arch 88→92+ / UX 65→80+**. (b) `/pdca plan → report` 완주율 **≥ 60%** (Daniel Alpha 50명 측정). (c) Match Rate 90% 도달율 **≥ 80%**. (d) 19 features 전량 CI Match Rate **≥ 90%** (v2.1.10 Sprint 7 유지). (e) CHANGELOG 4 Sprint 블록 응집력 — Release Notes 내 Sprint별 1~2 paragraph. |
| **SCOPE** | IN: 4 Sprint × 19 features, Precondition 3건, Out of Scope 6건 명시. OUT: 웹 team dashboard, Mastery Track 3-week 튜토리얼, Legacy `/pdca adopt`, `lib/application/` 완전 refactor(ADR·pilot 한정), Mina 페르소나 전용 UX, bkend.ai SaaS 연결 강화. |

---

## 1. User Intent Discovery

### 1.1 Core Problem

**"bkit은 내용물(what)은 과다 공급하고 입구(how-to-start)는 과소 공급한다"** — v2.1.10은 39 Skills·36 Agents·21 Hooks·3,762 TC·Clean Architecture 4-Layer·Docs=Code CI 등 **유일무이한 엔지니어링 완성도**를 쌓았으나, Daniel 이 첫 세션에서 "어디서 시작해야 할지" 알 수 없고, 용어 10+개가 쏟아져 위축된다. 동시에 **Trust Score flag 3개가 런타임에서 동작하지 않는 dead code**로 Sprint 7d "복원"에도 불구하고 잔존 가능성이 있고, `lib/pdca/` 21 파일·`lib/control/` 8 파일·`lib/orchestrator/` 5 파일로 **Application Layer 경계가 모호**하다. 이 두 축을 동시에 해결하지 않으면 v2.2.x 에서 대규모 refactor 비용이 발생한다.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| **Daniel Kwon** (Dynamic 창업자, 1순위) | 6주 MVP 단독 개발, 투자자 데모 준비 | 첫 5분 감동 · 발견성 · 빠른 반복 · 투자자 설명 가능 문서 |
| **Yuki Tanaka** (Enterprise 리드, 2순위) | 10인 팀 AI 도입, 감사 대응 | 감사 가능 Audit · Application Layer 안정성 · Port 확장 · M1-M10 체크리스트 |
| **Contributor / Maintainer** (3순위) | 코드 기여·버그 리포트 | Application Layer 경계 명료 · 문서 2층 분리 · Sprint별 CHANGELOG |

### 1.3 Success Criteria

- [ ] SC-01: **종합 점수 Arch 88→92+** (Trust Score closeout + Application Layer ADR + L5 9-scenario 달성 시 자동 충족)
- [ ] SC-02: **UX 총점 65→80+** (Sprint α+β 5개 Quick Wins + 6개 Short-term 완료 시 U1~U10 축 평균 +1.5★)
- [ ] SC-03: **Daniel Alpha 50명** 모집 · 12주 NPS ≥ +60 (Sprint α 완료 후)
- [ ] SC-04: **19 features 전량 Match Rate ≥ 90%** (기존 v2.1.10 Sprint 7 표준 유지)
- [ ] SC-05: **CHANGELOG v2.1.11 블록 4 Sprint 구조** 로 작성, Release Notes 4 subheader
- [ ] SC-06: **3,762 → 3,900+ TC** (Sprint γ L5 9-scenario 9+ TC + Sprint β 에 integration TC 15+)
- [ ] SC-07: **Precondition 3건** (v2.1.10 Phase 7 /pdca qa + Trust Score 실 검증 + git tag v2.1.10) **Sprint α 착수 전 완료**
- [ ] SC-08: **Claude Code marketplace 공식 등록 신청서 준비 완료** (v2.1.12 제출 조건 충족)

### 1.4 Constraints

| Constraint | Details | Impact |
|------------|---------|:------:|
| **CC 버전 하한** | CC v2.1.117+ 권고, v2.1.78+ 필수. CC upstream breaking change 시 Sprint δ CC policy ADR 이 우선 | High |
| **Invocation Contract 100% 보존** | v2.1.10 Sprint 7의 226 assertions 파괴 금지. 모든 slash command·agent frontmatter 변경은 Contract 업데이트 수반 | High |
| **Docs=Code CI 무결성** | BKIT_VERSION 5-location invariant 유지. 19 features 추가 시 README·CHANGELOG·plugin.json·hooks.json·session-start 5곳 전량 동기화 | High |
| **Domain Purity CI** | `lib/domain/**` 9 forbidden import 규칙 유지. Sprint γ Application Layer 통합 시 Domain 순수성 파괴 금지 | High |
| **플러그인 설치 사용자 영향 최소** | 기존 v2.1.10 사용자가 v2.1.11 upgrade 시 breaking change 0건 목표 | Critical |
| **Apache 2.0 유지** | 외부 OSS 라이브러리 추가 시 라이센스 호환성 검증 | Medium |

---

## 2. Alternatives Explored

### 2.1 Approach A: Dual Track Parallel

| Aspect | Details |
|--------|---------|
| **Summary** | UX Track(Quick 5+Short 5) + Arch Track(P0~P2 8건) 병렬, 21 features |
| **Pros** | 가장 포괄적. UX·Arch 독립 진행. v2.1.10 동급 스케일 |
| **Cons** | Track 간 시너지 약. CHANGELOG 응집력 부족. Sprint별 retrospective 불가 |
| **Effort** | Very High (21 features × 독립 관리) |
| **Best For** | 2개 독립 팀이 병렬 운영할 때 |

### 2.2 Approach B: Thematic Sprint — **Selected**

| Aspect | Details |
|--------|---------|
| **Summary** | 4 주제 Sprint (α Onboarding / β Discoverability / γ Trust / δ Port) × 19 features |
| **Pros** | v2.1.10 Sprint 0~7 패턴 재활용. CHANGELOG 블록 명료. Sprint별 retrospective. UX-Arch 주제 내 시너지 |
| **Cons** | Sprint 간 의존성 2~3건 관리 필요 (γ Application Layer → β slash command 경로) |
| **Effort** | High (16~19 features, 4 구조화된 Sprint) |
| **Best For** | 단일 maintainer / 소규모 팀이 주제별 응집력 있게 출시 |

### 2.3 Approach C: Persona-Driven NPS Stream

| Aspect | Details |
|--------|---------|
| **Summary** | Daniel / Yuki / Universal 3 Stream × 14 features, NPS 목표 직결 |
| **Pros** | 측정 가능한 비즈니스 outcome. 페르소나 체계 명료 |
| **Cons** | 일부 Arch 작업(CC policy ADR·Trigger baseline)이 페르소나에 직접 안 맞아 Stream 밖으로 밀림. 구조 불균형 |
| **Effort** | High (14 features + NPS 측정 체계) |
| **Best For** | 제품 성과 지표(NPS) 가 최우선 KPI 일 때 |

### 2.4 Decision Rationale

**Selected**: **Approach B (Thematic Sprint)**

**Reason**:
1. v2.1.10에서 **Sprint 0~7 구조가 실전 검증**되었고 (Sprint 4.5 audit-logger 682GB fix 같은 긴급 대응도 흡수 가능), CHANGELOG 블록 기록이 이미 축적되어 유지보수자 인지 부담 최소.
2. 4 Sprint 모두 **UX와 Arch 가 주제 내에서 공존**할 수 있어 사일로 제거 (예: Sprint α의 CC 버전 체크는 UX-Arch 경계).
3. **Sprint별 독립 ship 가능** — 예: α만 먼저 v2.1.11-alpha 릴리스하여 Daniel Alpha 50명 선행 테스트.
4. Persona (Approach C 강점) 는 본 Plan의 **Context Anchor·Section 3.2 Persona Impact Matrix** 로 보완 수용.

---

## 3. YAGNI Review

### 3.1 Included (v2.1.11 Must-Have) — 19 Features

#### Sprint α — "Onboarding Revolution" (UX 첫 5분 경험)

- [ ] **FR-α1**: README 2층 분리 (`README.md` 5분 개요 ≤100줄 + `README-FULL.md` 현재 633줄 내용)
- [ ] **FR-α2**: 제품 정체성 **One-Liner** 고정 — 기존 4개("Vibecoding Kit" / "AI Native Development OS" / "PDCA plugin" / "Context Engineering") → **1개 통일 메시지** → 모든 entry point (`plugin.json:displayName/description`, README L1, SessionStart hook, CHANGELOG) 일괄 적용
- [ ] **FR-α3**: SessionStart 첫 실행 감지 → **3분 튜토리얼** AskUserQuestion (`/claude-code-learning` 자동 추천)
- [ ] **FR-α4**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` **자동 검출** + 미설정 시 명시 안내
- [ ] **FR-α5**: **CC 버전 체크** → v2.1.117+ 미달 시 비활성 기능 명시 경고 (예: "Agent Teams unavailable: CC v2.1.117+ required")

#### Sprint β — "Discoverability Layer" (발견성 강화)

- [ ] **FR-β1**: `/bkit explore` slash command — skills/agents/evals 를 **카테고리별 브라우징** (Starter/Dynamic/Enterprise × 기능 × 난이도)
- [ ] **FR-β2**: `/bkit evals run` slash command — raw `node evals/runner.js` → **slash command wrapping** + 결과 요약 표
- [ ] **FR-β3**: **에러 메시지 Output Style 친화 번역 레이어** — 기술 원문 (예: "OWASP A03 violated") + Output Style 기반 친화 번역 (예: bkit-learning: "입력값 검증이 필요합니다")
- [ ] **FR-β4**: `/pdca watch {feature}` **live dashboard** — CC v2.1.71+ `/loop` 활용, iterate 진행 tail + Match Rate 실시간
- [ ] **FR-β5**: `/pdca fast-track {feature}` — **Daniel 페르소나 전용** Checkpoint 1~8 스킵, L3 Automation 자동 진입 (Trust Score ≥ 80 조건부)
- [ ] **FR-β6**: 첫 SessionStart **언어 자동 감지** → `settings.json:language` 응답 언어 설정 제안 (8 언어)

#### Sprint γ — "Trust Foundation" (Arch P0~P1)

- [ ] **FR-γ1**: **Trust Score E2E closeout** — `bkit.config.json:129-131` 3개 flag (`autoEscalation`/`autoDowngrade`/`trustScoreEnabled`) 런타임 실 동작 검증, `lib/control/state.json` 실 갱신 확인, dead code 0 잔존 보증
- [ ] **FR-γ2**: **Application Layer consolidation ADR + pilot** — `lib/pdca/` 21 · `lib/control/` 8 · `lib/orchestrator/` 5 · `lib/team/` · `lib/intent/` 5 폴더의 Bounded Context 재정의 ADR + **pilot 1폴더** (`lib/application/pdca-lifecycle/` 추정) 선행 이관
- [ ] **FR-γ3**: **L5 E2E PDCA full-cycle 9-scenario** — 기존 5 → 9 (pm/plan/design/do/check/act/qa/report/archive 각 1 smoke)

#### Sprint δ — "Port Extension & Governance" (Arch P1~P3)

- [ ] **FR-δ1**: **MCP Port abstraction** — 2 MCP Servers × 16 Tools 의 Port 정의 + 공통 abstraction (`lib/domain/ports/mcp-tool.js` 신설)
- [ ] **FR-δ2**: **Quality Gates M1~M10 catalog** — 10 gates 의 phase별 threshold 매핑 1장 표 (README 또는 `docs/reference/`)
- [ ] **FR-δ3**: **Trigger accuracy baseline** — 8 language × skills/agents trigger 의 precision/recall 베이스라인 측정 (100+ prompt fixture)
- [ ] **FR-δ4**: `/pdca token-report` skill — Token Ledger NDJSON 집계 → 세션별·feature별 비용 보고서
- [ ] **FR-δ5**: **CC upgrade policy ADR** — v2.1.115 skip 같은 선택적 건너뛰기 기준 · 호환성 유지 정책 · breaking change 대응 workflow 공식 문서화
- [ ] **FR-δ6**: **Release Automation `claude plugin tag` 통합** (CC v2.1.118 F9, ENH-279) — 현재 수동 `git tag v2.1.10` → `claude plugin tag v2.1.11` 자동화 + BKIT_VERSION 일치 검증 + `scripts/release-plugin-tag.sh` 얇은 래퍼

### 3.2 Deferred (v2.1.12+ Maybe)

| Feature | Reason for Deferral | Revisit When |
|---------|---------------------|--------------|
| Mastery Track 3-week 튜토리얼 (Week 1: PDCA / Week 2: Agent Teams / Week 3: Skill Evals) | 공수 10일, Daniel 페르소나는 `/pdca fast-track` 으로 대체 가능 | v2.2.x — Daniel Alpha NPS 측정 후 Starter·Yuki 페르소나 재검토 |
| Dynamic → Enterprise Level Upgrade Wizard | 공수 7일, 현 Level 자동 감지로 충분. Wizard는 비즈니스 규모 있는 팀 전환 시 유의미 | v2.2.x — Yuki Enterprise Alpha 시작 시 |
| 웹 대시보드 (Team View) | 공수 20일, 현 CLI Dashboard + git 공유로 충분. 10인+ 팀 도입 시점부터 필요 | v2.3.x — Enterprise 유료 tier 검토 시 |
| Legacy 코드 `/pdca adopt` 가이드 | 공수 10일, green field 우선. Enterprise TAM 확대 시 재진입 | v2.2.x — Yuki NPS 7 → 9 달성 후 |
| Domain Purity 가드 확장 (`crypto`/`path`/`url`) | false positive 조사 선행 필요 | v2.1.12 — Sprint δ CC policy ADR 여유 공수 시 |
| PII redaction false negative 측정 | Security 9/10 유지 중, 정량 측정은 별도 보안 감사 필요 | v2.1.12 — 외부 보안 감사 계약 시 |

### 3.3 Removed (Won't Do in v2.1.11)

| Feature | Reason for Removal |
|---------|-------------------|
| Mina (Starter) 페르소나 전용 UX 강화 | 적합도 33%, bkit-starter 플러그인으로 **이관 권고** 확정. bkit 본체는 Dynamic-First. |
| bkend.ai SaaS 연결 UI 강화 | 인접 제품 — v2.1.11 범위 외. bkend.ai 생태계 skill (bkend-*)는 현 상태 유지 |
| Claude Code Skills native 기능 파리티 테스트 | Skill Evals 와 범위 겹침. v2.1.10 Skill Evals 기반으로 정기 실행 체계 존재 |
| `lib/application/` **완전** refactor | Sprint γ FR-γ2 는 **ADR + pilot 1폴더**에 한정. 전량 refactor는 v2.2.0 major refactor 대상 |
| Cursor/Windsurf/JetBrains IDE 지원 | Claude Code CLI 종속이 의도된 설계 제약. IDE 확장은 별도 제품 |

---

## 4. Scope

### 4.1 In Scope

- [ ] **Sprint α — Onboarding Revolution**: FR-α1~α5 (5 features)
- [ ] **Sprint β — Discoverability Layer**: FR-β1~β6 (6 features)
- [ ] **Sprint γ — Trust Foundation**: FR-γ1~γ3 (3 features)
- [ ] **Sprint δ — Port Extension & Governance**: FR-δ1~δ5 (5 features)
- [ ] **Precondition**: v2.1.10 Phase 7 /pdca qa 최종 통과 + Trust Score 실 검증 + `git tag v2.1.10` + Release Notes (FR-γ1 과 일부 중첩)
- [ ] **CHANGELOG v2.1.11 블록** 4 Sprint 구조 작성
- [ ] **Docs=Code CI** 19 features 신규 파일·스크립트 자동 동기화
- [ ] **Invocation Contract** 226 → (신규 slash command 4개 + agent 0개) ≈ 240+ assertions 로 업데이트

### 4.2 Out of Scope

- 웹 대시보드, Mastery Track, `/pdca adopt`, bkend.ai SaaS 연결 강화, IDE 확장 (§3.2, §3.3 참조)
- `lib/application/` 완전 refactor (Sprint γ 는 ADR+pilot 만)
- Mina 페르소나 전용 UX (bkit-starter 로 이관)
- Domain Purity 가드 확장·PII false negative 측정 (v2.1.12+)

---

## 5. Requirements

### 5.1 Functional Requirements (19 FR)

| ID | Requirement | Sprint | Priority | Complexity | Status |
|----|-------------|:------:|:--------:|:----------:|:------:|
| FR-α1 | README 2층 분리 (5분 개요 + FULL) | α | High | S | Pending |
| FR-α2 | One-Liner 정체성 고정, 모든 entry point 통일 | α | **Critical** | XS | Pending |
| FR-α3 | SessionStart 첫 실행 3분 튜토리얼 AskUserQuestion | α | High | S | Pending |
| FR-α4 | CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS 자동 검출 + 안내 | α | High | S | Pending |
| FR-α5 | CC 버전 체크 + 미달 기능 명시 경고 | α | High | S | Pending |
| FR-β1 | `/bkit explore` slash command (카테고리 브라우징) | β | High | M | Pending |
| FR-β2 | `/bkit evals run` slash command (raw wrapping) | β | High | S | Pending |
| FR-β3 | 에러 메시지 Output Style 친화 번역 레이어 | β | Medium | M | Pending |
| FR-β4 | `/pdca watch {feature}` live dashboard | β | Medium | M | Pending |
| FR-β5 | `/pdca fast-track {feature}` (Checkpoint 스킵, L3 자동) | β | High | M | Pending |
| FR-β6 | 언어 자동 감지 → 응답 언어 설정 제안 | β | Medium | S | Pending |
| FR-γ1 | **Trust Score E2E closeout** (dead code 0 보증) | γ | **Critical** | S | Pending |
| FR-γ2 | Application Layer ADR + pilot 1폴더 refactor | γ | High | L | Pending |
| FR-γ3 | L5 E2E PDCA full-cycle 9-scenario (5→9) | γ | High | M | Pending |
| FR-δ1 | MCP Port abstraction (16 tools Port 정의) | δ | Medium | M | Pending |
| FR-δ2 | Quality Gates M1~M10 catalog 1장 표 | δ | Medium | XS | Pending |
| FR-δ3 | Trigger accuracy baseline (precision/recall) | δ | Medium | M | Pending |
| FR-δ4 | `/pdca token-report` skill (Token Ledger 집계) | δ | Medium | S | Pending |
| FR-δ5 | CC upgrade policy ADR | δ | Low | XS | Pending |
| FR-δ6 | Release Automation — `claude plugin tag` wrapper (CC v2.1.118 F9, ENH-279) | δ | Low | XS | Pending |

> **Complexity**: XS < 1d · S = 1~3d · M = 3~7d · L = 1~2w

### 5.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| **Compatibility** | v2.1.10 → v2.1.11 upgrade breaking change **0건** (CC **76 연속 호환** 달성, v2.1.118 검증 2026-04-23, [Impact 분석](../../03-analysis/cc-v2117-v2118-bkit-v2111-impact.md)) | `plugin.json` 의 `description`/`keywords`/`engines` diff · 기존 feature 자동 마이그레이션 테스트 |
| **Performance** | SessionStart hook 추가 overhead **< 50ms** (FR-α3/α4/α5 3개 체크 누적) | `hooks/session-start.js` 벤치 fixture |
| **Test Coverage** | 3,762 → **3,900+ TC**, PASS 비율 100% 유지 | `tests/qa/` aggregator |
| **Match Rate** | 19 features 전량 ≥ **90%** | `bkit-pdca-analyze` gap-detector |
| **Docs=Code** | BKIT_VERSION 5-location invariant + 8 count invariant **0 drift** | `scripts/docs-code-sync.js` CI gate |
| **Domain Purity** | `lib/domain/**` 9 forbidden import **0 hit** 유지 | `scripts/check-domain-purity.js` CI gate |
| **Security** | Defense-in-Depth 4-Layer 유지, OWASP A03/A08 sanitizer 회귀 0 | `tests/security/` 재실행 |
| **Operability** | Token Ledger NDJSON 크기 증가 ≤ 10% (FR-δ4 집계는 별도 파일) | `.bkit/runtime/token-ledger.json` diff |
| **i18n** | 8 언어 trigger precision ≥ **0.85**, recall ≥ **0.80** (FR-δ3 베이스라인) | `tests/i18n/trigger-accuracy.test.js` (신규) |
| **A11y** | slash command output 색상 대비 WCAG AA 유지 | 수동 체크 |

---

## 6. Success Criteria

### 6.1 Definition of Done

- [ ] **19 FR 전량 구현 완료** — Match Rate ≥ 90%
- [ ] **3,900+ TC** PASS 100%, FAIL 0, expected legacy ≤ 2
- [ ] **Invocation Contract 240+ assertions** (L1~L5) CI gate 통과
- [ ] **Docs=Code CI 0 drift** — README·CHANGELOG·plugin.json·hooks.json·session-start·MEMORY 동기
- [ ] **Domain Purity CI 0 forbidden** 유지
- [ ] **Code Review** — 각 Sprint 단위 self-review + Sprint δ 완료 후 `bkit:code-analyzer` 전수 검토
- [ ] **Documentation** — 4 Sprint × CHANGELOG subheader + ADR 2건 (γ2 Application Layer · δ5 CC upgrade policy) + README 2층 분리
- [ ] **Release Notes** `v2.1.11` — 4 Sprint 주제별 1~2 paragraph

### 6.2 Quality Criteria

- [ ] **Match Rate ≥ 90%** 전 feature
- [ ] **Test Coverage ≥ 90.3%** (v2.1.10 baseline 유지)
- [ ] **Zero Lint Errors** (ESLint Domain Purity rule 포함)
- [ ] **BKIT_VERSION 5-location sync** (new: `README-FULL.md` 포함 시 +1)
- [ ] **P0 Blocker 0건** (Daniel Alpha 50명 테스트 시점까지)

### 6.3 Business / Persona Criteria

- [ ] **Daniel NPS**: +9 → **+10** (Alpha 50명 설문, Sprint α+β 완료 후 측정)
- [ ] **Yuki NPS**: +7 → **+9** (Sprint γ+δ 완료 후 Enterprise Alpha 측정)
- [ ] **Arch 종합 점수**: 88 → **92+**
- [ ] **UX 총점**: 65 → **80+** (U1~U10 축 평균 +1.5★)
- [ ] **marketplace 공식 등록 신청서** 완료 (Blockers B1~B6 해소 확인)

---

## 7. Risks and Mitigation

| ID | Risk | Impact | Likelihood | Mitigation |
|----|------|:------:|:----------:|------------|
| **RA-1** | Sprint γ Application Layer pilot refactor가 β slash command 경로와 충돌 | High | Medium | **Sprint 순서 α → β → γ → δ 강제**. β slash command 는 `lib/pdca/` 기존 API 사용, γ는 **pilot 1폴더만** 이관 (β 기여 API 제외) |
| **RA-2** | Trust Score E2E 검증 실패 시 Sprint γ 전체 재계획 | High | Low (Sprint 7d 복원 선행) | γ1을 Sprint γ **첫 작업**으로 배치. 실패 시 γ2/γ3 차단 후 2일 내 재설계 |
| **RA-3** | `/bkit explore` · `/pdca watch` live UI 가 CC native rendering 한계 | Medium | Medium | CC v2.1.71+ `/loop` 활용 스펙 사전 확인. 한계 시 **텍스트 dashboard fallback** |
| **RA-4** | One-Liner 결정(FR-α2) 이 주관적 의사결정 지연 | Medium | Medium | **3안 제시 → 24시간 내 결정** 규칙. Daniel 페르소나 1인 사전 테스트 |
| **RA-5** | FR-γ3 L5 9-scenario 환경 의존 (Agent Teams env, CC version) CI 통과 어려움 | Medium | Medium | CI matrix 에 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` env 추가. Scenario 실패 시 **skip list + issue 기록** 후 다음 릴리스로 이월 허용 |
| **RA-6** | MCP Port 추상화(FR-δ1) 후 기존 16 tools 동작 break | High | Low | **Port-Adapter 매핑 테이블 사전 작성** + L3 runtime runner 42 TC 전량 PASS 유지 |
| **RA-7** | CC upstream v2.1.118+ breaking change 가 Sprint 중 발생 | High | Low~Medium | MON-CC-06 1회/주 monitoring 유지. 발생 시 **Sprint ε (hotfix)** 신설하여 v2.1.11 차단 없이 파생 |
| **RA-8** | 19 features 관리 복잡도 초과로 release 지연 | Medium | Medium | **Sprint 단위 독립 ship 가능** (α 만 완료 시 `v2.1.11-alpha` 릴리스) |
| **RA-9** | Daniel Alpha 50명 모집 실패 | Medium | Medium | Twitter/X + 한국 스타트업 커뮤니티 + Claude Code Discord 3채널 동시 모집. 30명 미달 시 Alpha → Beta 전환 |
| **RA-10** | Anthropic Claude Code Skills native 가 Sprint 진행 중 PDCA 유사 기능 흡수 | Extreme | Low | Skill Evals 파리티 테스트 2주 1회 실행. 흡수 징후 시 **bkit 고유 가치 재포지셔닝** (PDCA + Match Rate + Agent Teams 3축) |
| **RA-11** | CC v2.1.118 F1 Hook×MCP 기능이 Sprint δ Port 설계 시점에 맞지 않음 | Medium | Low | ENH-277 은 **Port 확장만** v2.1.11 스콥, 실 hook 전환은 v2.1.12 pilot. v2.1.11 진행 blocker 아님. 분석: [cc-v2117-v2118-bkit-v2111-impact.md](../../03-analysis/cc-v2117-v2118-bkit-v2111-impact.md) |
| **RA-12** | CC v2.1.118 X13 Agent-Hook fix 가 bkit 기존 workaround 와 충돌 | Medium | Low | Sprint γ FR-γ4 (선택적) 에 Do Turn 1 조사 배치. 충돌 실측 시 workaround 제거, 없으면 문서화 |

---

## 8. Architecture Considerations

### 8.1 Project Level Selection

| Level | Characteristics | Selected |
|-------|-----------------|:--------:|
| **Starter** | Simple static — bkit 본체 아님 | ✗ |
| **Dynamic** | Feature-based modules, BaaS — bkit 본체 아님 | ✗ |
| **Enterprise** | Strict layer separation, DI, microservices — **bkit 본체** | **✓** |

> bkit 본체 자체가 Enterprise-grade plugin. v2.1.11 은 Enterprise 성숙도를 **88→92+** 로 올리는 목표.

### 8.2 Key Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| **Sprint 구조** | A: Dual Track / **B: Thematic Sprint** / C: Persona Stream | **B** | v2.1.10 Sprint 0~7 패턴 재활용, CHANGELOG 응집력 (§2.4) |
| **Application Layer 범위** | Full refactor / **ADR + pilot 1폴더** / 연기 | **ADR + pilot** | 전량 refactor는 v2.2.0 major. pilot 으로 위험 검증 |
| **Sprint 순서** | 임의 / **α → β → γ → δ 강제** / 역순 | **강제** | β가 `lib/pdca/` API 사용, γ pilot 은 β API 외 폴더 우선 |
| **Sprint α 독립 ship** | 단일 릴리스 / **`v2.1.11-alpha` 선행** / 불허 | **선행 허용** | Daniel Alpha 50명 조기 피드백 수집 |
| **One-Liner 결정 방식** | 워크숍 / **3안 제시 → 24h 결정** / 임의 | **24h 결정** | 주관적 지연 방지 (RA-4) |
| **Trust Score 미해소 시** | 전체 재계획 / **γ1 실패 isolating** / v2.1.12 이월 | **isolating** | γ2·γ3 독립 진행 가능, γ1만 2일 내 재설계 |
| **CC upstream breaking change 대응** | Sprint 차단 / **Sprint ε hotfix 파생** / v2.1.12 이월 | **ε 파생** | v2.1.11 차단 없이 hotfix 흡수 (RA-7) |

### 8.3 Component Overview (Sprint 영향 범위)

```
┌──────────────────────────────────── Presentation Layer ─────────────────────────────────────┐
│  Sprint α:  README.md + README-FULL.md (신규) + plugin.json (displayName/description)       │
│  Sprint α:  hooks/session-start.js  (+ α3 튜토리얼 + α4 env 체크 + α5 CC 버전 체크)          │
│  Sprint β:  skills/bkit/explore/SKILL.md + evals-run/SKILL.md (신규 2)                      │
│             skills/pdca/SKILL.md (+ watch + fast-track actions)                             │
│             hooks/error-handler.js (신규 — β3 친화 번역)                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                                ↓
┌──────────────────────────────────── Application Layer ──────────────────────────────────────┐
│  Sprint γ:  lib/application/pdca-lifecycle/ (신규 pilot — lib/pdca/lifecycle.js 이관)       │
│             lib/control/trust-engine.js (+ γ1 runtime reconcile)                            │
│             lib/pdca/full-auto-do.js (+ β5 fast-track)                                      │
│  Sprint δ:  lib/pdca/token-report.js (신규 — δ4 Token Ledger 집계)                          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                                ↓
┌──────────────────────────────────── Infrastructure Layer ───────────────────────────────────┐
│  Sprint δ:  lib/infra/mcp-port-registry.js (신규 — δ1 16 tools Port 매핑)                   │
│             lib/infra/docs-code-scanner.js (+ README-FULL.md 9번째 count 추가)              │
│             lib/infra/cc-version-checker.js (신규 — α5 CC 버전 체크 adapter)                │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                                ↓
┌──────────────────────────────────── Domain Layer ───────────────────────────────────────────┐
│  Sprint δ:  lib/domain/ports/mcp-tool.js (신규 — δ1 Port 정의)                              │
│             lib/domain/rules/ (+ δ2 M1-M10 gate 규칙 순수함수)                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

Tests:
  Sprint γ:  tests/e2e/pdca-full-cycle-9scenario.spec.ts (신규 — 9 scenario)
  Sprint β:  tests/integration/slash-command-{explore,evals,watch,fast-track}.test.js
  Sprint δ:  tests/i18n/trigger-accuracy.test.js (신규 — precision/recall baseline)
  Sprint δ:  tests/contract/mcp-port.test.js (신규 — δ1 Port 계약)
```

### 8.4 Data Flow (Sprint α 신규 흐름 예시)

```
First-Run SessionStart
    │
    ▼
┌──────────────────────────────────────────┐
│  hooks/session-start.js                  │
│  ├── isFirstRun() ← .bkit/runtime/       │
│  │   └── true → FR-α3 튜토리얼 AUQ       │
│  ├── CC version check ← cc-version-      │
│  │   checker.js (new)                    │
│  │   └── < 2.1.117 → FR-α5 경고          │
│  └── AGENT_TEAMS env check               │
│      └── unset → FR-α4 안내              │
└──────────────────────────────────────────┘
    │
    ▼
user response → ~/.claude/settings.json
    │
    ▼
subsequent /pdca* commands
```

---

## 9. Convention Prerequisites

### 9.1 Applicable Conventions (v2.1.10 유지)

- [x] 한국어 docs (CLAUDE.md §Language) — 본 문서 준수
- [x] Apache 2.0 License — 외부 의존성 추가 금지 (v2.1.11 신규 0건 목표)
- [x] Domain Purity CI — `lib/domain/**` 9 forbidden import 유지
- [x] Docs=Code CI — BKIT_VERSION 5-location + 8 count invariant 유지 (FR-α1 README 2층 분리 시 count 변경 반영)
- [x] Invocation Contract L1~L5 — 신규 4 slash command (FR-β1~β2 + FR-β4 + FR-β5) 은 Contract 에 assertions 추가 필수
- [x] Sprint 단위 CHANGELOG 블록 — v2.1.10 패턴 유지

### 9.2 신규 규칙 (v2.1.11 도입)

- [ ] **One-Liner invariant** (FR-α2) — `plugin.json:description` · README L1 · SessionStart 첫 줄 **동일 문자열**. `docs-code-scanner.js` 에 scanOneLiner() 신규 추가
- [ ] **Trust Score reconcile invariant** (FR-γ1) — `bkit.config.json:control.*` 플래그 3개 CI 시점에 `grep -r` 0 hit 금지 확인
- [ ] **MCP Port registry invariant** (FR-δ1) — `lib/domain/ports/mcp-tool.js` 정의 vs `lib/infra/mcp-port-registry.js` 매핑 drift 0
- [ ] **M1~M10 table 단일 SSoT** (FR-δ2) — catalog 표가 README·docs·bkit.config 3곳에 복사되지 않도록 **단일 location + reference**

---

## 10. Implementation Plan (4 Sprint 상세)

### 10.1 Precondition (v2.1.11 착수 전 완료)

| # | Item | Status | Owner |
|---|------|:------:|-------|
| P1 | v2.1.10 Phase 7 /pdca qa 최종 유기적 동작 검증 | Pending | maintainer |
| P2 | Trust Score 런타임 실 검증 **1차** (γ1 baseline) | Pending | maintainer |
| P3 | main PR merge (완료 f2c17f3) + `git tag v2.1.10` + GitHub Release Notes | Partial (merge 완료, tag 대기) | maintainer |

### 10.2 Sprint α — "Onboarding Revolution" (Week 1)

**Goal**: Daniel 첫 세션 이탈 40% → 15%

| # | Task | Files | Complexity |
|---|------|-------|:----------:|
| α1 | README 2층 분리 | `README.md` (rewrite ≤100 lines) + `README-FULL.md` (move current 633 lines) + `docs-code-scanner.js` (count +1) | S |
| α2 | One-Liner 결정 & 통일 | 3안 제시 → 24h 결정 → `plugin.json:description`, `README.md:L1`, `hooks/session-start.js:intro`, `CHANGELOG.md:v2.1.11` 4곳 | XS |
| α3 | First-run 3분 튜토리얼 | `hooks/session-start.js` isFirstRun() + AskUserQuestion, `.bkit/runtime/first-run-seen.json` | S |
| α4 | AGENT_TEAMS env 자동 검출 | `hooks/session-start.js` env check + 미설정 시 안내 메시지 | S |
| α5 | CC 버전 체크 | `lib/infra/cc-version-checker.js` (신규) + `hooks/session-start.js` 연동 | S |

**Sprint α Exit Criteria**:
- 5 FR Match Rate ≥ 90%
- `v2.1.11-alpha` 릴리스 태깅 가능 (Daniel Alpha 50명 조기 모집 시작)
- Docs=Code CI 9 count (8 → 9) 통과

### 10.3 Sprint β — "Discoverability Layer" (Week 2~3)

**Goal**: 발견성 +50%, Daniel NPS +9 → +10

| # | Task | Files | Complexity |
|---|------|-------|:----------:|
| β1 | `/bkit explore` | `skills/bkit/explore/SKILL.md` (신규) + `lib/pdca/explorer.js` (신규) | M |
| β2 | `/bkit evals run` | `skills/bkit/evals-run/SKILL.md` (신규) + `evals/runner.js` 래핑 | S |
| β3 | 에러 친화 번역 | `hooks/error-handler.js` (신규) + 4 Output Style 별 번역 사전 | M |
| β4 | `/pdca watch {feature}` | `skills/pdca/SKILL.md` watch action 추가 + `/loop` 연동 | M |
| β5 | `/pdca fast-track {feature}` | `skills/pdca/SKILL.md` fast-track action 추가 + `lib/pdca/full-auto-do.js` 확장 | M |
| β6 | 언어 자동 감지 | `hooks/session-start.js` language detect + `settings.json:language` 제안 AUQ | S |

**Sprint β Exit Criteria**:
- 6 FR Match Rate ≥ 90%
- Invocation Contract +16 assertions (신규 slash 4개 × L1~L4 가정)
- Integration TC +15

### 10.4 Sprint γ — "Trust Foundation" (Week 4)

**Goal**: Arch 점수 88 → 90+, dead code 0 잔존 보증

| # | Task | Files | Complexity |
|---|------|-------|:----------:|
| γ1 | Trust Score E2E closeout | `lib/control/trust-engine.js` + `lib/control/automation-controller.js` + `tests/e2e/trust-score-reconcile.spec.ts` (신규) | S |
| γ2 | Application Layer ADR + pilot | `docs/adr/0001-application-layer-consolidation.md` (신규) + `lib/application/pdca-lifecycle/` (pilot 이관) | L |
| γ3 | L5 E2E 9-scenario | `tests/e2e/pdca-full-cycle-9scenario.spec.ts` (신규) — pm/plan/design/do/check/act/qa/report/archive 각 1 smoke | M |

**Sprint γ Exit Criteria**:
- 3 FR Match Rate ≥ 90%
- Trust Score 관련 `grep -r "autoEscalation\|autoDowngrade\|trustScoreEnabled"` 모두 **런타임 호출 경로에 도달** (dead code 0)
- L5 9/9 scenario PASS

### 10.5 Sprint δ — "Port Extension & Governance" (Week 5~6)

**Goal**: v2.2.x 확장 기반 + Governance 명료화

| # | Task | Files | Complexity |
|---|------|-------|:----------:|
| δ1 | MCP Port abstraction | `lib/domain/ports/mcp-tool.js` (신규) + `lib/infra/mcp-port-registry.js` (신규) + `tests/contract/mcp-port.test.js` (신규) | M |
| δ2 | M1~M10 catalog | `docs/reference/quality-gates-m1-m10.md` (신규) + README 링크 | XS |
| δ3 | Trigger accuracy baseline | `tests/i18n/trigger-accuracy.test.js` (신규, 100+ fixture × 8 lang) + `docs/reference/trigger-accuracy-baseline-v2111.md` | M |
| δ4 | `/pdca token-report` | `skills/pdca/SKILL.md` token-report action + `lib/pdca/token-report.js` (신규) | S |
| δ5 | CC upgrade policy ADR | `docs/adr/0002-cc-upgrade-policy.md` (신규) | XS |

**Sprint δ Exit Criteria**:
- 5 FR Match Rate ≥ 90%
- MCP 42 TC 유지 + 신규 Port 계약 TC 20+
- i18n trigger precision ≥ 0.85, recall ≥ 0.80 8 언어 전량

### 10.6 Sprint 간 의존성

```
Precondition (P1+P2+P3)
         │
         ▼
    Sprint α (Onboarding)
         │
         ├────→ v2.1.11-alpha 릴리스 (Daniel Alpha 50명)
         ▼
    Sprint β (Discoverability)  ←── β는 α의 FR-α5 CC 버전 체크 가드 사용
         │
         ▼
    Sprint γ (Trust Foundation)  ←── γ2 pilot 은 β가 사용하는 폴더 제외
         │
         ├────→ v2.1.11-beta 릴리스
         ▼
    Sprint δ (Port Extension)  ←── δ1 MCP Port 는 β 신규 slash command 와 무관
         │
         ▼
    v2.1.11 GA
```

---

## 11. Persona Impact Matrix (Approach C 요소 수용)

| Sprint | Daniel (Dynamic) | Yuki (Enterprise) | Mina (Starter — 제외) |
|--------|:----------------:|:-----------------:|:---------------------:|
| **α** Onboarding | ★★★★★ (첫 세션 감동) | ★★★ (기업 도입 용이) | N/A (bkit-starter 이관) |
| **β** Discoverability | ★★★★★ (Fast Track + watch) | ★★★ (explore + evals) | N/A |
| **γ** Trust Foundation | ★★★ (90%+ 일관성) | ★★★★★ (감사·구조) | N/A |
| **δ** Port & Governance | ★★ (간접) | ★★★★★ (M1-M10·ADR·i18n) | N/A |

**NPS 기여도**:
- Daniel 목표 NPS +10 ← Sprint α·β 가 80% 기여
- Yuki 목표 NPS +9 ← Sprint γ·δ 가 80% 기여
- 19 features 모두 Daniel·Yuki 중 한쪽 이상에 ★★★★ 이상 기여

---

## 12. Next Steps

1. [ ] **Precondition 3건 완료** (v2.1.10 Phase 7 /pdca qa · Trust Score 1차 검증 · git tag v2.1.10 + Release Notes)
2. [ ] **Design 문서 작성**: `/pdca design bkit-v2111-integrated-enhancement` (Sprint별 architectural options 3개 제시)
3. [ ] **One-Liner 3안 결정 회의** (24h 데드라인, FR-α2)
4. [ ] **Daniel Alpha 50명 모집 채널 확정** (Twitter/X + 한국 스타트업 + Claude Code Discord)
5. [ ] **Team review**: Sprint 4개 각 Owner 지정 (maintainer 단독 or external contributor)
6. [ ] **Sprint α 착수**: `/pdca do bkit-v2111-integrated-enhancement --scope sprint-alpha`
7. [ ] **CI matrix 확장**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 포함 env 추가 (RA-5)

---

## Appendix A: Brainstorming Log (Phase 0~4 핵심 결정)

| Phase | Question | Answer | Decision |
|-------|----------|--------|----------|
| 0 Context | v2.1.10 상태? | main 머지 완료 (f2c17f3), Arch 88·UX 65 분석 완료 | Plan-Plus 적격 |
| 1 Intent — Q1 테마 | 어떤 테마? | **1번 균형 + 3번 Arch 청산 모두** | UX + Arch 통합 |
| 1 Intent — Q2 스코프 | 허용 공수? | **Large (1개월+, 10+ features)** | v2.1.10 급 |
| 2 Alternatives | A Dual / B Thematic / C Persona / D Hybrid? | **B Thematic Sprint** | 4 Sprint 구조, CHANGELOG 응집력 |
| 3 YAGNI — Included | 19 features? | 전량 포함 (Large scope 사용자 선호) | §3.1 4 Sprint 배치 |
| 3 YAGNI — Deferred | 어떤 항목 v2.1.12+? | Mastery Track, Level Upgrade Wizard, 웹 대시보드, `/pdca adopt`, Domain Purity 가드 확장, PII false negative | §3.2 6건 |
| 3 YAGNI — Removed | 어떤 항목 Won't Do? | Mina 페르소나 전용, bkend.ai UI, Skills native 파리티, `lib/application/` 완전 refactor, IDE 확장 | §3.3 5건 |
| 4 Design Validation | Sprint 순서? | **α → β → γ → δ 강제** | §8.2 Key Decisions |

---

## Appendix B: v2.1.10 대비 증분 표

| 항목 | v2.1.10 | v2.1.11 (target) | Δ |
|------|:-------:|:----------------:|:---:|
| Skills | 39 | **41** (+`/bkit explore` + `/bkit evals run`) | +2 |
| Agents | 36 | 36 | 0 |
| Hook Events | 21 (24 blocks) | 21 (25 blocks, +error-handler) | +1 block |
| Lib Modules | 128 | **135** (+cc-version-checker, mcp-port-registry, explorer, token-report, application/pdca-lifecycle/, M1-M10 rules 등) | +7 |
| Scripts | 47 | **48** (+ release-plugin-tag.sh — ENH-279, CC v2.1.118 F9) | +1 |
| MCP Servers | 2 | 2 | 0 |
| MCP Tools | 16 | 16 | 0 (Port 추상화만) |
| Test Files | 113 | **120+** (+E2E 9-scenario, Port contract, trigger accuracy, trust reconcile, slash commands) | +7 |
| Test Cases | 3,762 | **3,900+** | +138 |
| Invocation Contract | 226 assertions | **240+** | +14 |
| Docs=Code Count | 8 | **9** (+README-FULL.md) | +1 |
| ADR | 0 (분산) | **2** (γ2 Application Layer + δ5 CC upgrade policy) | +2 |

---

## Appendix C: CHANGELOG v2.1.11 스켈레톤 (Release Notes 준비)

```markdown
## [2.1.11] — YYYY-MM-DD

### Highlights
- **Sprint α — Onboarding Revolution**: ...
- **Sprint β — Discoverability Layer**: ...
- **Sprint γ — Trust Foundation**: ...
- **Sprint δ — Port Extension & Governance**: ...

### Added
- [FR-β1] `/bkit explore` slash command
- [FR-β2] `/bkit evals run` slash command
- [FR-β4] `/pdca watch {feature}` live dashboard
- [FR-β5] `/pdca fast-track {feature}` (Daniel 페르소나 전용)
- [FR-δ4] `/pdca token-report` skill
- [FR-α5] CC 버전 체크 (`lib/infra/cc-version-checker.js`)
- [FR-δ1] MCP Port abstraction (`lib/domain/ports/mcp-tool.js`)
- [FR-γ2] Application Layer pilot (`lib/application/pdca-lifecycle/`)
- [FR-γ3] L5 E2E 9-scenario PDCA full-cycle
- [FR-δ3] Trigger accuracy baseline (8 language precision/recall)
- [FR-δ2] Quality Gates M1-M10 catalog
- [FR-δ5] CC upgrade policy ADR (docs/adr/0002)
- [FR-γ2] Application Layer ADR (docs/adr/0001)
- [FR-δ6] Release Automation — `scripts/release-plugin-tag.sh` + `claude plugin tag` wrapper (CC v2.1.118 F9, ENH-279)
- [ENH-277] MCP Port caller-agnostic design — hook direct invocation 수용 (v2.1.12 pilot 준비, CC v2.1.118 F1)
- [ENH-280] Agent-hook multi-event regression guard (CC v2.1.118 X13)

### Changed
- [FR-α1] README 2층 분리 — `README.md` (5분 개요) + `README-FULL.md`
- [FR-α2] One-Liner 정체성 고정 — 4개 메시지 → 1개 통일
- [FR-α3] SessionStart 첫 실행 감지 + 3분 튜토리얼
- [FR-α4] CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS 자동 검출
- [FR-β3] 에러 메시지 Output Style 친화 번역
- [FR-β6] SessionStart 언어 자동 감지 + 응답 언어 설정 제안
- [FR-γ1] Trust Score 런타임 reconcile 완성 (dead code 0)

### Fixed
- (from v2.1.10 잔존) Phase 7 /pdca qa 최종 유기적 동작 검증
- (from v2.1.10 잔존) Trust Score E2E closeout (FR-γ1 병합)

### Quality Gates
- Test Count: 3,762 → 3,900+ (PASS 100%)
- Match Rate: 전 19 features ≥ 90%
- Invocation Contract: 226 → 240+ assertions
- Domain Purity: 0 forbidden (유지)
- Docs=Code: 8 → 9 count, 0 drift
- CC Compatibility: v2.1.117 + v2.1.118 검증 (**76 연속 호환**, Breaking 0)
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-22 | Initial draft (Plan Plus — Phase 0~5 완료). Approach B 선택. 19 features × 4 Sprint. | kay kim |

---

**Document End**
**Next Command**: `/pdca design bkit-v2111-integrated-enhancement`
**Expected Output**: `docs/02-design/features/bkit-v2111-integrated-enhancement.design.md` (Sprint별 3 Architecture Options, Context Anchor 복사, Design Anchor 통합)
