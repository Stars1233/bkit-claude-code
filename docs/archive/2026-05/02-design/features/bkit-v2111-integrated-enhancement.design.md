---
feature: bkit-v2111-integrated-enhancement
phase: 02-design
type: index
status: Final — Plan + Design 완료, Do 진입 대기 (CC v2.1.118 + v2.1.121 patch)
version: 2.1.11 (target)
baseline: 2.1.10 (main merged, commit f2c17f3)
created: 2026-04-23
last-patched: 2026-04-28
author: kay kim (POPUP STUDIO PTE. LTD.)
architecture: Option C (Pragmatic Balance) × 4 Sprint
cc-v2118-patched: true
cc-v2121-patched: true
related:
  - plan: docs/01-plan/features/bkit-v2111-integrated-enhancement.plan.md
  - sprint-α: docs/02-design/features/bkit-v2111-sprint-alpha.design.md
  - sprint-β: docs/02-design/features/bkit-v2111-sprint-beta.design.md
  - sprint-γ: docs/02-design/features/bkit-v2111-sprint-gamma.design.md
  - sprint-δ: docs/02-design/features/bkit-v2111-sprint-delta.design.md
  - analysis-arch: docs/03-analysis/bkit-architecture-completeness.analysis.md
  - analysis-ux: docs/03-analysis/bkit-plugin-vibecoding-ux.analysis.md
---

# bkit v2.1.11 Integrated Enhancement — Design Index

> **Summary**: 4 Sprint (α Onboarding / β Discoverability / γ Trust / δ Port) × 20 FR 의 Design Index. 각 Sprint 는 별도 design.md 로 분리되어 있고, 본 문서는 **전체 아키텍처·의존성·Invocation Contract 총괄**을 담는다. Option C (Pragmatic) 을 4 Sprint 전량에 적용한다.
>
> **CC patch 이력**:
> - **CC v2.1.118 patch (2026-04-23)**: FR-δ6 추가 (Release Automation), ENH-277/279/280 편입
> - **CC v2.1.121 patch (2026-04-28)**: Sprint δ FR-δ4 묶음에 CAND-004 OTEL 3 누적 통합 (신규 FR 발급 불요, FR 카운트 20 유지). CC 79 연속 호환 확정.
>
> **Project**: bkit — AI Native Development OS
> **Version Target**: v2.1.11 (baseline v2.1.10 f2c17f3)
> **Author**: kay kim
> **Date**: 2026-04-23
> **Status**: Draft (Checkpoint 3 승인 완료)
> **Planning Doc**: [bkit-v2111-integrated-enhancement.plan.md](../../01-plan/features/bkit-v2111-integrated-enhancement.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | v2.1.10 Arch 88·UX 65 의 23점 격차를 좁혀 "verified-quality plugin" 카테고리 선점 + Claude Code marketplace 공식 등록 조건 충족. |
| **WHO** | Primary: Daniel (Dynamic 창업자, NPS 9→10). Secondary: Yuki (Enterprise 리드, NPS 7→9). Excluded: Mina (Starter, bkit-starter 이관). |
| **RISK** | (R-A) Sprint γ Application Layer pilot × β slash command 경로 충돌 · (R-B) Trust Score E2E 검증 실패 · (R-C) CC native UI 한계 · (R-D) CC upstream breaking change. |
| **SUCCESS** | SC-01 Arch 88→92+ · SC-02 UX 65→80+ · SC-03 Daniel Alpha NPS ≥ +60 · SC-04 19 FR × Match Rate ≥ 90% · SC-05 CHANGELOG 4 Sprint 블록 · SC-06 TC 3,762→3,900+ · SC-07 Precondition 3건 · SC-08 marketplace 신청 조건. |
| **SCOPE** | IN: 4 Sprint × 19 FR + Precondition 3 + ADR 2. OUT: 웹 대시보드 · Mastery Track · /pdca adopt · lib/application/ 완전 refactor · Mina 전용 UX. |

---

## Design Decisions (D1~D7 확정)

| # | 결정 항목 | 확정 선택 | 본 Design에 미치는 영향 |
|:---:|---|---|---|
| D1 | 문서 구조 | **Sprint별 4개 + Index 1개 = 5 파일** | 본 문서가 Index, 각 Sprint design.md 에서 상세 |
| D2 | 3 Architecture Options 범위 | **Sprint 단위** (4×3=12, Checkpoint 4회 — 모두 **Option C** 확정) | Sprint 별 §2 Architecture Comparison 삽입 |
| D3 | Application Layer Pilot | `lib/pdca/lifecycle.js` → `lib/application/pdca-lifecycle/` | Sprint γ FR-γ2 가 이 pilot 만 수행, B Clean 자동 제외 |
| D4 | Pencil MCP Design Anchor | **α3 tutorial 1개만 pilot** | Sprint α §Design Anchor 섹션 유지, β·γ·δ 제거 |
| D5 | One-Liner | **Option 1 Verification-Focused**: *"The only Claude Code plugin that verifies AI-generated code against its own design specs."* | Sprint α FR-α2 구현 = `plugin.json:description` · `README.md:L1` · `hooks/session-start.js:intro` · `CHANGELOG.md:v2.1.11 Highlights` · `docs/` 5곳 일괄 반영 |
| D6 | Precondition 처리 | **Sprint α 착수 전 P1→P2→P3 순차 완료** | Design 작성 자체 블로킹 아님. P1 /pdca qa + P2 Trust Score 1차 + P3 git tag v2.1.10 + Release Notes |
| D7 | 릴리스 전략 | **GA 단일 v2.1.11** (Alpha/Beta 없음) | Plan 의 v2.1.11-alpha/beta 조항 **본 Design 에서 삭제**. 단일 GA 기준 CHANGELOG 1 블록 |

---

## 1. Overview

### 1.1 Design Goals

- **Docs=Code CI 지속**: BKIT_VERSION 5-location + 8 count invariant → **9 count** 로 확장 (README-FULL.md 추가 반영)
- **Clean Architecture 4-Layer 유지**: Domain Purity 0 forbidden import 유지, Application Layer pilot 으로 Bounded Context 경계 개선 시작
- **Invocation Contract 226 → 240+ assertions**: 신규 slash command 4개 × L1-L4 assertions 확장
- **One-Liner SSoT 확립**: 4개 정체성 메시지 → 1개 통일, invariant 가드 추가
- **유기적 UX·Arch 동반 상승**: Sprint 내에서 UX와 Arch 가 공존 (α의 CC 버전 체크는 UX-Infra 경계)

### 1.2 Design Principles

1. **Pragmatic Balance over Clean Purism** — Clean Architecture 4-Layer 원칙은 유지하되 pilot 범위는 1폴더 한정
2. **Adapter-First over Full Port** — 신규 Port 는 `lib/domain/ports/mcp-tool.js` 1개, 16 tool 은 registry 매핑 map (파일 폭증 방지)
3. **Single SoT for Identity** — One-Liner / BKIT_VERSION / M1~M10 catalog 모두 단일 진실원 + 참조 패턴
4. **Persona-Tuned UX** — Daniel 중심 Fast Track, Yuki 중심 감사·구조, Mina 제외
5. **Docs=Code Invariant** — docs-code-scanner 가 9 count + One-Liner + Port registry + M1-M10 catalog 4개 추가 invariant 검증

---

## 2. Architecture Comparison (12 Options 중 선택 결과)

### 2.0 4 Sprint × 3 Options 비교

| Sprint | A Minimal | B Clean | **C Pragmatic (Selected)** |
|:---:|---|---|---|
| α Onboarding | session-start 단일 통합, One-Liner 2곳 | 5 독립 모듈, Domain rules | **cc-version-checker + branding Adapter, One-Liner 5곳 SSoT** |
| β Discoverability | 4 slash + 에러 하드코딩 | 각 slash별 lib 폴더 | **4 slash + error-translator 단일 + 8언어 JSON 사전 + pdca/fast-track.js (γ pilot과 분리)** |
| γ Trust Foundation | ADR only | ⚠️ D3 위반 (완전 이관) | **ADR + pilot 1폴더 + 하위호환 shim + L5 9 it()** |
| δ Port Extension | Port를 README로만 | Port 파일 16개 | **단일 Port + registry map 16 tool + quality-gates map 10 gate + fixture 150** |

### 2.1 Selected Architecture: **Option C × 4 Sprint**

**Rationale**:
- 공수·위험·유지보수성 3축 모두 balanced
- v2.1.10 Sprint 0~7 에서 검증된 "Adapter + 경량 orchestrator" 패턴과 일관
- Sprint γ Option B 는 D3 결정(pilot 1폴더) 위반으로 자동 비권고
- Sprint δ Option A 는 δ1 Port 가 실제 계약이 아니라 무효화 위험

---

## 3. Sprint Overview Matrix

| Sprint | 주제 | FR 수 | Complexity | 신규 파일 | 수정 파일 | Design 문서 |
|:---:|---|:---:|:---:|:---:|:---:|---|
| **α** | Onboarding Revolution | 5 | Medium | 3~4 | 5~6 | [sprint-alpha.design.md](./bkit-v2111-sprint-alpha.design.md) |
| **β** | Discoverability Layer | 6 | Medium | 8~10 | 4~5 | [sprint-beta.design.md](./bkit-v2111-sprint-beta.design.md) |
| **γ** | Trust Foundation | 3 | Medium | 4~5 | 8~12 | [sprint-gamma.design.md](./bkit-v2111-sprint-gamma.design.md) |
| **δ** | Port Extension & Governance | **6** | Medium | **7~9** | 3~4 | [sprint-delta.design.md](./bkit-v2111-sprint-delta.design.md) |
| **총합** | — | **20** | Medium | **22~28** | **20~27** | 5 파일 |

> **CC v2.1.118 대응 (2026-04-23)**: 76 연속 호환 달성. FR-δ6 (Release Automation, ENH-279) 신규 편입으로 19→20 FR. 상세: [cc-v2117-v2118-bkit-v2111-impact.md](../../03-analysis/cc-v2117-v2118-bkit-v2111-impact.md)

---

## 4. Sprint Dependency Graph

```
                     ┌─────────────────────────────────────────────┐
                     │  Precondition (Sprint α 착수 전 완료)       │
                     │  P1: /pdca qa v2.1.10 최종 유기적 동작 검증 │
                     │  P2: Trust Score 1차 검증 (baseline)        │
                     │  P3: git tag v2.1.10 + GitHub Release Notes │
                     └─────────────────────┬───────────────────────┘
                                           │
                                           ▼
                ┌──────────────────────────────────────────────────┐
                │  Sprint α — Onboarding Revolution                │
                │  FR-α1 README 2층 / α2 One-Liner SSoT /          │
                │  α3 First-run 튜토리얼 (Pencil pilot) /          │
                │  α4 AGENT_TEAMS env / α5 CC 버전 체크            │
                └──────────────┬───────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
┌────────────────────────────┐  ┌──────────────────────────────────┐
│ Sprint β — Discoverability │  │ Sprint γ — Trust Foundation       │
│ FR-β1 /bkit explore        │  │ FR-γ1 Trust Score E2E closeout    │
│ FR-β2 /bkit evals run      │  │ FR-γ2 Application Layer ADR+pilot │
│ FR-β3 에러 친화 번역       │  │   (lib/pdca/lifecycle.js 이관)   │
│ FR-β4 /pdca watch          │  │ FR-γ3 L5 E2E 9-scenario           │
│ FR-β5 /pdca fast-track     │  └──────────────┬───────────────────┘
│ FR-β6 언어 자동 감지       │                 │
└────────────┬───────────────┘                 │
             │                                 │
             └─────────────────┬───────────────┘
                               ▼
                ┌──────────────────────────────────────────────────┐
                │  Sprint δ — Port Extension & Governance          │
                │  FR-δ1 MCP Port abstraction                      │
                │  FR-δ2 M1-M10 catalog                             │
                │  FR-δ3 Trigger accuracy baseline                 │
                │  FR-δ4 /pdca token-report                         │
                │  FR-δ5 CC upgrade policy ADR                     │
                └──────────────────┬───────────────────────────────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │ v2.1.11 GA 릴리스 │
                          │ (Alpha/Beta 없음) │
                          └────────────────┘
```

### 4.1 의존성 규칙

| Edge | 유형 | 제약 |
|------|------|------|
| Precondition → α | 필수 선행 | P1/P2/P3 완료 전 α 착수 금지 (D6) |
| α → β | 소프트 선행 | α의 FR-α5 cc-version-checker 가 β slash command 가드에 재사용 |
| α → γ | 소프트 선행 | γ의 L5 scenario 가 α 온보딩 UX 의존 |
| β ↔ γ | **분리** | β fast-track.js 는 `lib/pdca/` 기존 경로, γ pilot 은 `lib/application/pdca-lifecycle/` 이관 — **상호 영향 없음** |
| γ → δ | 소프트 선행 | δ Port 가 γ Application Layer ADR 위에 서술 |
| δ → GA | 최종 게이트 | 19 FR 전량 Match Rate ≥ 90% 충족 시 릴리스 |

### 4.2 병렬 가능성

- β 와 γ 는 **완전 병렬 가능** — 코드 경로 분리됨 (D3 Pilot 1폴더 제약 덕분)
- α 는 β/γ 의 전제조건이지만 α 완료 즉시 둘 다 시작 가능
- δ 는 β+γ 완료 후 착수

---

## 5. Invocation Contract 변경 총괄

### 5.1 신규 Assertions (226 → 240+)

| Sprint | FR | 신규 assertion 유형 | 개수 추정 |
|:---:|:---:|---|:---:|
| α | α3 | SessionStart hook 첫 실행 AskUserQuestion flow | 3 |
| α | α5 | CC 버전 체크 Infrastructure adapter contract | 2 |
| β | β1 | `/bkit explore` L1 frontmatter + L2 skill invocation | 4 |
| β | β2 | `/bkit evals run` L1 frontmatter + L2 skill invocation + L3 evals/runner.js 연동 | 4 |
| β | β4 | `/pdca watch` L1 frontmatter + L2 action invocation + /loop 연동 | 4 |
| β | β5 | `/pdca fast-track` L1 frontmatter + L2 action invocation + L3 automation L3 자동 진입 | 4 |
| γ | γ1 | Trust Score reconcile runtime contract (control-state.json 갱신 flow) | 3 |
| γ | γ3 | L5 E2E 9 scenario 각 assertion | 9 |
| δ | δ1 | MCP Port contract (16 tool × initialize/tools/list/call) | 16 |
| δ | δ4 | `/pdca token-report` L1 frontmatter + L2 action invocation | 2 |
| δ | δ1 | Port caller-agnostic (ENH-277, CC v2.1.118 F1) | 2 |
| γ | γ3 | X22 subagent cwd 복원 regression (CC v2.1.118) | 1 (scenario 1 내) |
| δ | δ6 | `scripts/release-plugin-tag.sh` BKIT_VERSION 일치 (ENH-279, CC v2.1.118 F9) | 1 |
| **총합** | — | — | **55 → 241+ 달성** |

### 5.2 변경 없는 Assertions

- 기존 226 중 222+ 는 변경 없이 PASS 유지
- FR-γ2 Application Layer pilot 이 import path 전파 — 하위호환 shim 덕분에 기존 assertions 무효화 없음

---

## 6. Docs=Code CI 영향

### 6.1 Count Invariant 변경 (8 → 9)

| # | Count Name | v2.1.10 값 | v2.1.11 예상 | Δ |
|:---:|---|:---:|:---:|:---:|
| 1 | skills | 39 | **41** (+/bkit explore, +/bkit evals run) | +2 |
| 2 | agents | 36 | 36 | 0 |
| 3 | hookEvents | 21 | 21 | 0 |
| 4 | hookBlocks | 24 | **25** (+ error-handler) | +1 |
| 5 | mcpServers | 2 | 2 | 0 |
| 6 | mcpTools | 16 | 16 | 0 (Port 추상화만) |
| 7 | libModules | 128 | **135** | +7 |
| 8 | scripts | 47 | 47 | 0 |
| **9 NEW** | **readmeFullLines** | N/A | **README-FULL.md 줄 수** | +1 count |

### 6.2 BKIT_VERSION 5-location Invariant → 6-location

| # | File | v2.1.10 기준 | v2.1.11 변경 |
|:---:|---|---|---|
| 1 | `bkit.config.json:version` | 2.1.10 | 2.1.11 (SoT) |
| 2 | `.claude-plugin/plugin.json:version` | 2.1.10 | 2.1.11 |
| 3 | `README.md` v2.1.10 언급 | 2.1.10 | 2.1.11 |
| 4 | `CHANGELOG.md` 최상위 | [2.1.10] | [2.1.11] |
| 5 | `hooks/hooks.json` 메타 | 2.1.10 | 2.1.11 |
| 6 | `hooks/session-start.js` intro 문구 | 2.1.10 | 2.1.11 |
| **7 NEW** | `README-FULL.md` header | N/A | **2.1.11** |

### 6.3 신규 Invariants (v2.1.11 도입)

| # | Invariant | 검증 위치 |
|:---:|---|---|
| I1 | **One-Liner SSoT** — 5곳 전량 동일 문자열 | `docs-code-scanner.scanOneLiner()` (신규) |
| I2 | **Trust Score reconcile** — `bkit.config.control.*` 3 flag 의 grep hit ≥ 1 (dead code 0 보증) | `scripts/check-trust-score-reconcile.js` (신규) |
| I3 | **MCP Port registry** — `lib/domain/ports/mcp-tool.js` 정의 vs `lib/infra/mcp-port-registry.js` 매핑 0 drift | `scripts/check-mcp-port-drift.js` (신규) |
| I4 | **M1-M10 catalog SSoT** — `docs/reference/quality-gates-m1-m10.md` vs `lib/domain/rules/quality-gates.js` vs `bkit.config.json:quality.thresholds` 3-way 검증 | `docs-code-scanner.scanQualityGates()` (신규) |
| **I5** | **BKIT_VERSION ↔ plugin tag 일치** — `claude plugin tag {version}` 실행 결과 === `bkit.config.version` (ENH-279, CC v2.1.118 F9) | `scripts/release-plugin-tag.sh` + CI gate `check-plugin-tag-version` (신규) |

---

## 7. Clean Architecture Layer 전체 영향

```
┌──────────────────────────────── Presentation ────────────────────────────────┐
│  Sprint α: README.md + README-FULL.md (신규) + plugin.json + SessionStart    │
│  Sprint α: hooks/session-start.js (첫 실행 감지 + env 체크 + CC 버전 체크)    │
│  Sprint β: skills/bkit/explore + skills/bkit/evals-run (신규 2)               │
│  Sprint β: skills/pdca/SKILL.md (+ watch + fast-track + token-report actions) │
│  Sprint β: hooks/error-handler.js (신규)                                      │
└────────────────────────────────────┬──────────────────────────────────────────┘
                                     ▼
┌──────────────────────────────── Application ─────────────────────────────────┐
│  Sprint γ: lib/application/pdca-lifecycle/ (신규 pilot — γ2)                  │
│  Sprint γ: lib/control/trust-engine.js + lib/control/state.js (+ γ1 reconcile)│
│  Sprint β: lib/pdca/fast-track.js (신규 — β5, γ pilot과 분리)                 │
│  Sprint β: lib/discovery/explorer.js (신규 — β1)                              │
│  Sprint β: lib/i18n/detector.js (신규 — β6)                                   │
│  Sprint δ: lib/pdca/token-report.js (신규 — δ4)                               │
└────────────────────────────────────┬──────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────── Infrastructure ──────────────────────────────┐
│  Sprint α: lib/infra/cc-version-checker.js (신규 — α5 adapter)               │
│  Sprint α: lib/infra/branding.js (신규 — α2 One-Liner SSoT)                  │
│  Sprint β: lib/ui/error-translator.js (신규 — β3 + assets/error-dict.*.json) │
│  Sprint β: lib/ui/live-dashboard.js (신규 — β4)                              │
│  Sprint δ: lib/infra/mcp-port-registry.js (신규 — δ1)                        │
│  Sprint δ: lib/infra/docs-code-scanner.js (+ α1 9 count + I1/I3/I4 invariant)│
└────────────────────────────────────┬──────────────────────────────────────────┘
                                     ▼
┌────────────────────────────────── Domain ────────────────────────────────────┐
│  Sprint δ: lib/domain/ports/mcp-tool.js (신규 — δ1 Port)                     │
│  Sprint δ: lib/domain/rules/quality-gates.js (신규 — δ2 M1~M10 map)          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Layer 준수 검증

- ✅ Domain Purity: 신규 Domain 2 파일 모두 `fs/child_process/net/http/https/os/dns/tls/cluster` import 0 (CI gate 통과)
- ✅ Infrastructure → Domain: `mcp-port-registry.js` 는 `lib/domain/ports/mcp-tool.js` 의존 (역방향 아님)
- ✅ Application → Domain + Infrastructure: `lib/application/pdca-lifecycle/` 는 Domain ports + Infrastructure adapters 만 의존
- ✅ Presentation → Application: hooks/scripts → lib/pdca/ · lib/application/ (Infrastructure 직접 의존 기존 허용 범위 유지)

---

## 8. Test Plan 총괄

### 8.1 Test Coverage 증분

| Type | v2.1.10 TC | v2.1.11 신규 TC | 예상 총 TC |
|:---:|:---:|:---:|:---:|
| L1 Unit | ~2,800 | +40 (FR별 함수 단위) | ~2,840 |
| L2 Integration | ~500 | +50 (slash commands + hooks + SessionStart flow) | ~550 |
| L3 MCP Runtime | 42 | +20 (MCP Port contract) | 62 |
| L4 Perf | ~20 | +5 (SessionStart overhead < 50ms) | ~25 |
| L5 E2E | 5 | +9 (PDCA full-cycle 9 scenario) - 5 (기존 통합) = +4 | **9** (scenario 수) |
| Contract (Invocation) | 226 | +14 | **240** |
| i18n | 0 | +30 (trigger precision/recall 8 lang × fixture subset) | 30 |
| **총합** | **~3,762** | **~159** | **~3,921** |

> SC-06 "3,762 → 3,900+" 충족 (3,921 예상)

### 8.2 Sprint별 Test 분포

| Sprint | L1 | L2 | L3 | L4 | L5 | Contract | i18n | 합계 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| α | 10 | 15 | — | 5 | — | 2 | — | 32 |
| β | 10 | 25 | — | — | — | 16 | — | 51 |
| γ | 10 | — | — | — | 9 | 12 | — | 31 |
| δ | 10 | 10 | 20 | — | — | 4 | 30 | 74 |
| **신규 TC** | **40** | **50** | **20** | **5** | **9** | **34**(+14 assertion) | **30** | **~159** |

---

## 9. CI Matrix 변경

### 9.1 신규 CI Jobs

| Job | Sprint | 실행 조건 | 기대 Exit |
|-----|:---:|---|:---:|
| `check-one-liner` | α | `docs-code-scanner.scanOneLiner()` — 5곳 동일 문자열 | 0 |
| `check-trust-score-reconcile` | γ | `bkit.config.control.*` 3 flag grep hit ≥ 1 | 0 |
| `check-mcp-port-drift` | δ | Port 정의 vs registry 매핑 0 drift | 0 |
| `check-quality-gates-ssot` | δ | M1-M10 catalog 3-way SSoT | 0 |
| `trigger-accuracy-baseline` | δ | precision ≥ 0.85, recall ≥ 0.80 (8 lang) | 0 |
| `e2e-9-scenario` | γ | Playwright 9 scenario, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` env 포함 | 0 |
| `check-plugin-tag-version` | δ | `scripts/release-plugin-tag.sh --dry-run` → BKIT_VERSION ↔ plugin tag 일치 (CC v2.1.118 F9, ENH-279) | 0 |

### 9.2 기존 CI Jobs (v2.1.10 유지)

- ✅ `check-domain-purity` — 신규 Domain 2 파일 통과
- ✅ `docs-code-sync` — 8 → 9 count 확장
- ✅ `check-deadcode` — Trust Score reconcile 반영 후 0 dead code
- ✅ `qa-aggregate` — 3,921 TC aggregator
- ✅ `l3-mcp-runtime` — 42 → 62 TC
- ✅ `test/e2e/run-all.sh` — 5 → 9 scenario

---

## 10. Session Guide (Module Map)

### 10.1 Module Map (4 Sprint = 4 Module)

| Module | Scope Key | Sprint | 추정 Turns |
|--------|-----------|:---:|:---:|
| Onboarding | `sprint-alpha` | α | 35~45 |
| Discoverability | `sprint-beta` | β | 45~60 |
| Trust Foundation | `sprint-gamma` | γ | 35~45 |
| Port & Governance | `sprint-delta` | δ | 40~55 |

### 10.2 Recommended Session Plan

| Session | Phase | Scope | 추정 Turns |
|---------|-------|-------|:---:|
| 1 (완료) | Plan + Design | 전체 | ~40 |
| 2 | Precondition | P1 /pdca qa + P2 Trust Score 1차 + P3 git tag | ~10 |
| 3 | Do | `--scope sprint-alpha` | 35~45 |
| 4 | Do | `--scope sprint-beta` (sprint-gamma와 병렬 가능) | 45~60 |
| 5 | Do | `--scope sprint-gamma` (sprint-beta와 병렬 가능) | 35~45 |
| 6 | Do | `--scope sprint-delta` | 43~60 (CC v2.1.118 대응 FR-δ6 +3~5) |
| 7 | Check + Report + Archive | 전체 | 30~40 |

**총 예상 Turns**: ~215 (v2.1.10 수준 대규모, CC v2.1.118 흡수 +3~5)

---

## 11. Risks and Mitigation (Design 레벨 확장)

> Plan §7 RA-1~RA-10 을 Design 레벨에서 구체화.

| ID | Risk | Impact | Mitigation (Design) |
|:---:|---|:---:|---|
| **RD-1** | Sprint β fast-track.js (lib/pdca/) × γ pilot (lib/application/pdca-lifecycle/) 경로 충돌 | High | **pdca/fast-track.js 는 lifecycle.js 의존 금지**. lifecycle 호출은 Application Layer adapter 통해서만 |
| **RD-2** | γ2 pilot import path 전파 시 β 신규 slash 가 깨짐 | High | **하위호환 shim** 을 `lib/pdca/lifecycle.js` 에 2주간 유지 (re-export only). 이후 v2.1.12 에서 제거 |
| **RD-3** | α3 Pencil Design Anchor 가 다른 AskUserQuestion UI 와 일관성 파괴 | Medium | **pilot 범위 명시** — α3 튜토리얼 UI 1곳만 Pencil, 나머지 AUQ 는 CC 기본 렌더링 |
| **RD-4** | δ1 Port 정의가 MCP SDK 상 JSON-RPC 형식과 불일치 | High | `lib/domain/ports/mcp-tool.js` 는 MCP spec 2024-11-05 기준으로 **interface signature 명시**. L3 runtime runner 로 compat 검증 |
| **RD-5** | 에러 번역 사전(β3) 이 8 언어 모두 동시 작성 필요 → 품질 격차 | Medium | **핵심 에러 카테고리 20개 + 영어 fallback** 설계. 8 언어 중 KO/EN 먼저, 나머지 6개는 pseudo-translation 후 native speaker 감수는 v2.1.12 |
| **RD-6** | L5 9 scenario 중 일부 (Agent Teams 의존) CI 미지원 | High | **skip 태그** 지원. CI matrix 에서 Agent Teams env 있는 경우에만 실행. 없으면 warning log + exit 0 |
| **RD-7** | Application Layer pilot 1폴더 이관이 v2.2.0 full refactor 에 부족한 evidence | Medium | γ2 완료 후 **pilot metrics** 수집: import path 전파 파일 수 · 하위호환 shim 유지 기간 · 테스트 영향도 → ADR 0001 에 부록으로 기록 |

---

## 12. Implementation Order (전체)

### 12.1 Precondition Phase (Week 0)

1. [ ] P1 — `/pdca qa bkit-v2110-integrated-enhancement` 실행 (L1~L3 runtime 포함)
2. [ ] P2 — Trust Score 1차 baseline: `grep -r "autoEscalation\|autoDowngrade\|trustScoreEnabled" lib/` 호출 경로 확인
3. [ ] P3 — `git tag v2.1.10` + `gh release create v2.1.10 --notes-file docs/04-report/features/bkit-v2110-integrated-enhancement.report.md`

### 12.2 Sprint Execution Phase (Week 1~6)

```
Week 1: Sprint α    (5 FR,  ~35 turns)
Week 2: Sprint β + γ (9 FR,  ~90 turns, 병렬)
Week 3: Sprint β + γ 계속
Week 4: Sprint δ    (5 FR,  ~50 turns)
Week 5: buffer (integration fix, regression)
Week 6: Check + Report + Archive
```

### 12.3 GA Release Phase (Week 7)

1. [ ] 19 FR 전량 Match Rate ≥ 90% 확인
2. [ ] `/pdca analyze bkit-v2111-integrated-enhancement`
3. [ ] `/pdca report bkit-v2111-integrated-enhancement`
4. [ ] BKIT_VERSION 2.1.10 → 2.1.11 (7 location) + `claude plugin tag v2.1.11` 실행 (ENH-279, CC v2.1.118 F9)
5. [ ] CHANGELOG 4 Sprint 블록 작성
6. [ ] `scripts/release-plugin-tag.sh v2.1.11` — CC native `claude plugin tag` wrapper (대체 수동 `git tag`)
7. [ ] `gh release create v2.1.11 --notes-file docs/04-report/features/bkit-v2111-integrated-enhancement.report.md`
8. [ ] Anthropic marketplace 공식 등록 신청서 작성

---

## 13. Next Steps

- [ ] **Precondition Phase 완료** — P1/P2/P3 순차
- [ ] **Sprint α 실행**: `/pdca do bkit-v2111-integrated-enhancement --scope sprint-alpha`
- [ ] **Sprint β·γ 병렬 실행** (α 완료 후)
- [ ] **Sprint δ 실행** (β+γ 완료 후)
- [ ] **Check + Report**: `/pdca analyze` → `/pdca report` → `/pdca archive`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-23 | Initial draft — Checkpoint 3 승인 (Option C × 4 Sprint), D1~D7 반영 | kay kim |

---

**Document End (Index)**
**Sub-Documents**: sprint-alpha / sprint-beta / sprint-gamma / sprint-delta
**Next Command**: Precondition 완료 후 `/pdca do bkit-v2111-integrated-enhancement --scope sprint-alpha`
