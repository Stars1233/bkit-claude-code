---
feature: bkit-v2110-gap-closure
status: 📝 Plan-Plus Draft (Post-Sprint-4.5, Pre-Sprint-5)
target: bkit v2.1.10
cc_compat: v2.1.117+
owner: kay kim
created: 2026-04-22
pdca_phase: Plan (brainstorming-enhanced)
source_plans:
  - docs/01-plan/features/bkit-v2110-integrated-enhancement.plan.md
  - docs/01-plan/features/bkit-v2110-invocation-contract-addendum.plan.md
  - docs/01-plan/features/bkit-v2110-compatibility-policy.plan.md
source_design:
  - docs/02-design/features/bkit-v2110-integrated-enhancement.design.md
source_qa:
  - docs/05-qa/bkit-v2110-integrated-enhancement.qa-report.md
input_analysis:
  - PM 문서 분석(Plan+Addendum+Policy+Design)
  - QA 리포트 심층 분석
  - 코드베이스 실측 매핑(lib 123 모듈/26,296 LOC, hooks 24 blocks, tests 227 files)
  - 커밋 이력 분석(main..HEAD 5 commits, +14,016/−1,076)
match_rate_basis: gap-detector 4차 97.8% + v2.1.10 전체 81.5%
---

# bkit v2.1.10 Gap Closure — Plan-Plus

> **본 문서의 정체성**: Sprint 0~4.5가 `feat/v2110-integrated-enhancement` 브랜치에서 **코드 레벨로는 95% 이상 실증**되었으나, 상위 Plan/Design이 약속한 **"유기적으로 실제로 동작하는 하나의 시스템"** 관점에서 **릴리스·연결·검증·일관성·부채**의 5개 축에 여전히 핵심 gap이 남아 있다. 본 Plan-Plus는 그 잔여 gap을 정밀 분해(Brainstorm → Intent → Alternatives → YAGNI)하여 Sprint 5 + 선택적 Sprint 5.5로 재구성한다.
> **Plan-Plus의 목적**: 단순히 "빠진 일 목록"이 아닌, **각 gap의 근본 의도를 재확인**하고, **대안을 비교**한 뒤, **YAGNI 기준으로 과잉 제거**한 다음 채택안만 상세화한다.

---

## 📌 Executive Summary

| 관점 | 진단 | 대응의 핵심 |
|------|------|-------------|
| **Problem** | v2.1.10은 Sprint 0~4.5 주요 구현물(Clean Architecture 4-layer + Guard Registry 21 + Contract L1~L3 + Docs=Code CI + audit-logger 682GB recursion fix)을 브랜치에 축적했으나, (a) **릴리스 메타데이터 미정비**(plugin.json=2.1.9, README/CHANGELOG 섹션 부재), (b) **21 hook events 중 2곳만 cc-regression 통합** → 방어 표면이 좁음, (c) **domain port 6종 중 구현체 매핑이 2종만 명시적**, (d) **TC 총합 3중 혼재**(3,560/2,520/3,068 vs 실측 3,583), (e) **기존 `tests/qa/` 13개 파일 집계 누락**, (f) **plugin.json description 수치가 구 실태(101/43)** 등 **"유기적 동작"에 필요한 연결 고리**가 비어 있다. |
| **Solution** | **Sprint 5 (필수·3일)**: 릴리스 메타데이터 전면 동기화 + v2.1.9→v2.1.10 버전 전파 + CI 실제 PR 실행 검증 + ENH-256 완결 + 48h 관찰. **Sprint 5.5 (선택·2일, YAGNI 통과 시)**: hook 통합 폭 확장(unified-write-post / unified-stop / session-end-handler의 cc-regression attribution) + Port↔Adapter 매핑표 + Registry lifecycle `expectedFix` seeding + 집계기 `tests/qa/` 통합. **제외**: TypeScript, 새 Domain Guard, context:fork 확대(ENH-202, Sprint 6 이월), PermissionDenied hook 수용(ENH-168 P3 유지). |
| **Function UX Effect** | 사용자 눈에 보이는 변화는 **3가지**: ① `bkit Vibecoding Kit v2.1.10 activated`(session-start), ② `/bkit version`과 plugin.json 일치, ③ CHANGELOG v2.1.10 섹션으로 릴리스 근거 명시. 내부 동작은 hook attribution이 21 events에 걸쳐 균일해지고, Contract CI가 PR 게이트로 실동작. Starter/Dynamic/Enterprise 세그먼트 **zero-action 업데이트** 보장(Compatibility Policy FR-03 충족). |
| **Core Value** | **"선언된 v2.1.10"→"릴리스된 v2.1.10"으로 전환**. 브랜치 코드가 아니라 **main 병합 + 태그 + 관측 48h 통과**한 상태를 Release Gate(Addendum §11.2)가 정의한 "배포 가능" 기준으로 만든다. **Invocation Contract 100% 보존 + Defense-in-Depth 4-Layer 전면 연결 + Docs=Code 0 drift 상시 유지**. |

---

## 📌 Context Anchor

> **이 앵커는 Design/Do 문서로 전파되어 세션 간 컨텍스트 연속성을 보장한다.**

| 축 | 내용 |
|----|------|
| **WHY** | Sprint 0~4.5는 코드·테스트 투자의 핵심 질량을 쌓았으나, 이것이 "유기적 하나의 시스템"으로 **릴리스되지 않으면** 사용자는 v2.1.9 그대로 경험한다. Sprint 5는 투자 가치를 **운영 수익으로 전환**하는 last-mile이다. |
| **WHO** | 1차: 기존 bkit 사용자(Starter/Dynamic/Enterprise 3 세그먼트) — 업데이트 0-action 요구. 2차: Contributor(v2.1.10 브랜치 리뷰·머지 주체). 3차: CC 회귀 관찰자(MON-CC-06 19건 자동 해제 실측 대기자). |
| **RISK** | (R1) 릴리스 메타 동기화 누락 → 버전 혼동 (High/Low). (R2) CI가 PR에서 처음 실패 → 긴급 수정 루프 (Medium/Medium). (R3) 48h 관찰 중 신규 회귀 감지 → 롤백 또는 hotfix (Medium/Low). (R4) hook attribution 확장 중 BYPASS env 경로 실수로 차단 확장 (Medium/Low). (R5) ENH-202 유혹으로 Sprint 5.5 범위 폭발 (Medium/Medium). |
| **SUCCESS** | (S1) `plugin.json:version==2.1.10`, git tag `v2.1.10`, README/CHANGELOG 섹션 존재. (S2) CI 3종 워크플로우가 PR에서 1회 이상 green. (S3) gap-detector 4차 이상 재실행 후 **전체 Match Rate ≥ 95%**. (S4) `qa-aggregate.js` 단일 출력과 CHANGELOG TC 수치 일치. (S5) 48h 관찰 신규 회귀 0건. (S6) Contract L1+L2+L3 = 226 assertions 이상 PR에서 실행 증거. |
| **SCOPE** | IN: 릴리스 메타데이터 / CI PR 실증 / plugin.json description 재서술 / session-start 버전 스트링 동기화 / hooks/hooks.json once:true 주석 / MEMORY.md 수치 교정 / aggregator `tests/qa/` 통합 / stderr noise 분리 플래그 / Registry `expectedFix` seed 4건 이상 / Port↔Adapter 매핑표. OUT: TypeScript 도입 / 새 Domain Guard / 새 CC 회귀 대응(v2.1.118+ 전용) / context:fork 확대(ENH-202) / PermissionDenied hook 수용(ENH-168) / legacy 3개 모듈 제거. |

---

## 1. Brainstorm Phase — Intent Discovery

> Plan-Plus의 차별화 지점. **"이번 작업의 근본 의도는 무엇인가"를 복수 관점에서 재검증**한 뒤 기능 목록으로 내려간다.

### 1.1 "유기적으로 실제로 동작하도록"의 재정의

사용자 요청의 핵심 어구 **"유기적으로 실제로 동작하도록 구현되지 않은 부분"**을 다섯 가지 하위 질문으로 분해한다.

#### Q1. "유기적"이란 무엇인가?

bkit 관점에서 "유기적"은 다음 **3개의 수평 연결**이 끊김 없이 작동하는 상태를 의미한다.

1. **수직 연결 (레이어 간)**: Presentation(CC tool call) → Infrastructure(adapter) → Application(use-case) → Domain(pure logic). v2.1.10은 Clean Architecture Port 6종을 신설했으나 그중 2종만 구현체가 명확히 매핑됨(`docs-code-index` ↔ `docs-code-scanner.js`, `audit-sink` ↔ `telemetry.js`). 나머지 4종(`cc-payload`, `state-store`, `regression-registry`, `token-meter`)은 Port 파일은 존재하나 **"이 Port를 사용하는 use-case는 어디고, 구현체는 어디며, 어느 hook에서 주입되는가"의 추적 경로 문서가 없다**.
2. **수평 연결 (hook 간)**: 21개 hook event에 동일한 방어 정책(cc-regression attribution, audit 기록, token 계측)이 고르게 적용되는가? 실측 결과 **`unified-bash-pre.js`(Bash PreToolUse)와 `pre-write.js`(Write/Edit PreToolUse) + `session-start.js` 3곳에만 cc-regression이 연결**돼 있고, PostTool/Stop/SessionEnd에는 `token-accountant.recordTurn()`만 1건 연결됐다. **18/21 hook은 방어 미수혜**.
3. **종방향 연결 (v2.1.9 → v2.1.10 → v2.1.11)**: 릴리스 메타데이터가 일관되지 않으면 다음 마이너(v2.1.11)가 무엇을 상속받는지 불명확해진다. `plugin.json=2.1.9` + `session-start.js="v2.1.9 activated"`이 v2.1.10 커밋 후에도 남아 있다.

#### Q2. "실제로 동작"이란 무엇인가?

**3단계**의 동작성 정의:

- **L1. 파일 존재** (brownfield 실측): ✅ Sprint 0~4.5 산출물 95%+ 실존 확인(4개 분석 에이전트 교차 검증).
- **L2. 단위/통합 테스트 통과** (CI-ready): ✅ 3,583 TC, PASS 3,581. 단, aggregator 집계 범위가 `test/`만으로 한정되어 `tests/qa/` 13개 파일 누락.
- **L3. 실 사용자 환경에서의 동작** (production-wired): ⚠️ **미검증**. CI 워크플로우는 파일로만 존재하며 실제 PR 실행 증거 없음. Starter/Dynamic/Enterprise 3 세그먼트 사용자 세션에서 신규 hook attribution이 실제로 발화하는지는 48h 관찰 미수행.

L1/L2는 달성, **L3가 Sprint 5의 본질적 gap**이다.

#### Q3. "미흡한 점"의 질적 분류

QA 리포트의 12개 gap(G1~G12)은 모두 "하면 좋음" 수준으로 기록됐으나, 본 Plan-Plus는 이를 **심각도 × 가시성 × 긴급도** 3축으로 재분류한다:

| 분류 | 정의 | v2.1.10 해당 |
|------|------|-------------|
| **필수 (Blocker)** | 없으면 "v2.1.10 릴리스" 선언이 거짓이 됨 | 릴리스 메타(version/tag/README/CHANGELOG), CI PR 첫 실행, 48h 관찰, v2.1.9 문자열 제거 |
| **정합 (Consistency)** | 있으면 유기적이고, 없으면 투명성이 떨어짐 | plugin.json description 수치 업데이트, MEMORY.md 수치 교정, TC 총합 reconcile, Port↔Adapter 매핑표 |
| **확장 (Coverage)** | 있으면 방어 표면이 넓어지나, 없다고 기본 기능 파손 없음 | hook attribution 3→6곳 확장, Registry `expectedFix` seeding, stderr noise 플래그 |
| **이월 (Deferred)** | 본 마이너에서 하면 범위 폭발 | TypeScript, ENH-202 context:fork 확대, ENH-168 PermissionDenied 수용, legacy 3개 모듈 제거, L5 E2E Playwright 도입 |

Sprint 5는 **필수 전량 + 정합 전량 + 확장 50%**를 목표로 한다. 확장 나머지는 Sprint 5.5(선택).

#### Q4. "개선점"은 어디에 기입해야 하는가?

개선점은 **세 종류의 산출물**로 귀결된다:

1. **코드 변경** (lib/, hooks/, scripts/): Sprint 5 주 작업.
2. **메타 변경** (plugin.json, README, CHANGELOG, MEMORY): Sprint 5 작업이나 별도 PR로 분리.
3. **정책 변경** (Compatibility Policy FR-01~FR-08 활성화, Release Gate 체크리스트 첫 적용): Sprint 5 Release Gate 단계에서 첫 시행.

이 중 2번을 1번과 섞으면 PR 리뷰가 흐려지므로 **릴리스 PR**(코드·테스트)과 **릴리스 메타 PR**(버전/문서)은 분리한다.

#### Q5. "타깃 버전은 여전히 v2.1.10"의 의미

사용자는 **v2.1.11 로 버전 bump를 하지 않는다는 의도**를 명시했다. 이는 다음을 함의한다:

- Sprint 5의 모든 산출물은 **Minor 범위 내부**여야 한다 → Invocation Contract 불변(Addendum §2) 엄수.
- 새 Domain Guard 추가는 Minor 허용 범위이나, 본 Plan-Plus는 이를 **Sprint 6(v2.1.11) 이월**로 결정 → Sprint 5 복잡도 통제.
- ENH 번호 신규 부여 가능하나, **v2.1.10 종결 범위의 ENH만 부여**(아래 §7). 장기 추적 ENH는 v2.1.11+로 레이블링.

### 1.2 Stakeholder 관점 매트릭스

| Stakeholder | 원하는 것 | v2.1.10 Sprint 5 제공 | 위험 |
|-----------|-----------|---------------------|------|
| **Starter 사용자** | 0-action 업데이트 + 기존 동작 불변 | Invocation Contract 226 assertions L1+L4 green + `session-start.js` 메시지만 변경 | 버전 스트링 변경을 기존 파서가 읽을 수 있는가? — 본 Plan-Plus에서 L1 TC로 검증 |
| **Dynamic 사용자** | 0-action + 백엔드 개발 가속 | Prompt Caching 1H env 유지 + Agent Teams 기본 동작 보존 | CTO Team 12명 명단 단일 출처가 부재해도 실제 동작은 strategy.js 기반으로 정상 — Sprint 5에서 관측만 |
| **Enterprise 사용자** | 보안·감사 강화 | audit-logger 682GB recursion fix 적용 + Defense-in-Depth 4-Layer 문서화 | OTEL 실전 연결은 미보증(`createDualSink` 회피) → 정직하게 "optional" 표기 |
| **기여자 (Developer)** | 1~2h 로컬 빌드·테스트 OK | `node scripts/check-guards.js && node scripts/docs-code-sync.js && node scripts/check-deadcode.js && node test/contract/scripts/qa-aggregate.js` 4-command green | aggregator 기본 집계 범위가 `tests/qa/` 누락 → Sprint 5에서 통합 |
| **CC 팀 (upstream)** | bkit이 CC 회귀를 잘못 귀속하지 않음 | `attribution-formatter.js` 한정된 템플릿 준수 + Registry 21건 출처(GitHub issue 번호) 명시 | `expectedFix: null` 전량 → 자동 해제 불가, Sprint 5에서 4건 seeding |
| **저자 본인** | 2시간 51분 투자의 가치 확정 | 태그 v2.1.10 + main 머지 + 48h 관찰 통과 | Sprint 4.5 자기 도입 재귀 버그 같은 사고 재발 방지 — Sprint 5는 **새 adapter 추가 금지** |

### 1.3 Definition of "Done" for v2.1.10

본 Plan-Plus가 정의하는 v2.1.10 Done 기준(8개, 전량 충족 필수):

1. **D1 (Blocker)**: `git tag v2.1.10` 존재, `.claude-plugin/plugin.json:version=="2.1.10"`, `CHANGELOG.md`에 `## v2.1.10 — 2026-04-2X` 섹션 존재.
2. **D2 (Blocker)**: `hooks/session-start.js:261` 하드코딩 문자열을 `require('../lib/core/version').BKIT_VERSION` 참조로 치환, 런타임 출력이 "v2.1.10 activated"로 검증.
3. **D3 (Blocker)**: `.github/workflows/contract-check.yml` + `cc-regression-reconcile.yml` 두 워크플로우가 **첫 번째 실제 PR에서 green**. 증거: GitHub Actions 런 URL 또는 `gh run list --workflow contract-check.yml --limit 1` 출력.
4. **D4 (Consistency)**: `plugin.json.description`에서 "39 Skills, 36 Agents, 21 Hook Events" 표기를 `21 Hook Events → 24 Hook Blocks`로 교정(Addendum §13.2 결정 반영), `123 Lib Modules, 46 Scripts` 추가 또는 수치 제거로 통일.
5. **D5 (Consistency)**: `MEMORY.md` 3행 "39 Skills, 36 Agents, 21 Hook Events, **101 Lib Modules**, 24,616 LOC in lib/, **43 Scripts**" → "**123 Lib Modules**, **26,296 LOC**, **46 Scripts**"로 동기화 + `_skills-overview.md:3` v2.1.9 태그 정정.
6. **D6 (Consistency)**: `qa-aggregate.js` 단일 출력 `total=3,583 / pass=3,581 / fail=2 / skip=0`이 `CHANGELOG v2.1.10` 섹션·QA 리포트 최종 절의 숫자와 완전 일치.
7. **D7 (Coverage)**: Registry 21건 중 **4건 이상에 `expectedFix` 필드 seeding**(MON-CC-02=#47855, MON-CC-06-51165, ENH-262=#51798, ENH-263=#51801) + `lifecycle.reconcile()` 이 해당 4건에 대해 `semverLt` 정상 계산하는 L1 TC 추가.
8. **D8 (Observation)**: main 머지 + 태그 후 **48 hours** 동안 GitHub Issues/bkit QA 채널 관측, 신규 회귀 0건 확인. 관측 결과를 `docs/04-report/features/bkit-v2110-integrated-enhancement.report.md`에 기록.

---

## 2. 현황 진단 — 4개 분석 Synthesis

### 2.1 ✅ 완료·실증된 것 (95%+ 신뢰도)

| 영역 | 증거 | 출처 |
|------|------|------|
| Clean Architecture 4-layer 도입 (신규 기능 한정) | `lib/domain/{ports,guards,rules}` 11개 파일, 순환 의존 0 추정(madge 미실행이나 grep 근거로 domain 파일에 `require('fs'/child_process'/'net')` 0건) | 코드베이스 매핑 §B |
| 21 Guards Registry 등록 | `node scripts/check-guards.js` → `PASSED — 21 guards, 0 warning(s)` | 실행 근거 |
| audit-logger 682GB recursion fix | `lib/audit/audit-logger.js:198-219` + `lib/infra/telemetry.js:56-73` DANGER ZONE + `test/contract/integration-runtime.test.js` 23 TC | 커밋 `0940fa5` |
| Docs=Code scanner | `node scripts/docs-code-sync.js` → `PASSED — 0 drift` | 실행 근거 |
| Contract Test L1+L4 | 226 assertions baseline 94 JSON + 4 test files | `test/contract/baseline/v2.1.9/_MANIFEST.json` |
| Contract Test L2+L3 (부분) | `l2-smoke.test.js` 98 TC + `l3-mcp-compat.test.js` 83 TC | 커밋 `f46dc83` |
| status.js 872 LOC 분할 | `status.js`(52 LOC facade) + `status-core.js`(399) + `status-migration.js`(156) + `status-cleanup.js`(255) = 862 LOC | `git show c3659fd -- lib/pdca/status.js` |
| pre-write.js 파이프라인화 | 286→529 LOC(defense-coordinator 통합으로 증가) 12-stage | Sprint 1 완주 + Sprint 4.5 통합 |
| OTEL Telemetry (ENH-259) | `lib/infra/telemetry.js` 275 LOC, `telemetry.test.js` 31 TC | Sprint 2 |
| GitHub Actions 2 workflows | `.github/workflows/contract-check.yml`, `cc-regression-reconcile.yml` | Sprint 3 |
| `check-deadcode.js` CI | `PASSED — Live 90 / Exempt 30 / Legacy 3 / Dead NEW 0` | Sprint 4.5 |
| Critical Bug C1 fix | `audit-logger.js:332-344` startDate→date 파라미터 | Sprint 1 P0 |
| Critical Bug C2 fix | `sanitizeDetails` 6-key 블랙리스트 + 500자 cap | Sprint 1 P0 |
| BKIT_VERSION 중앙화 (부분) | `lib/core/version.js` 존재 — 단, `session-start.js:261`은 여전히 하드코딩 | ENH-167 부분 완료 |
| Domain Guards 4종 | `enh-254/262/263/264` 각 67~70 LOC | Sprint 1 P0 |
| cc-regression 6 모듈 | `registry/defense-coordinator/lifecycle/token-accountant/attribution-formatter/index` 합계 568 LOC | Sprint 1 P0 |

### 2.2 ⚠️ 부분 완료된 것 (추가 작업 필요)

| 영역 | 완료된 것 | 미완료된 것 | Sprint 5 대응 |
|------|-----------|------------|--------------|
| ENH-167 BKIT_VERSION 중앙화 | `lib/core/version.js` 생성 + `session-context.js:233` 사용 | `session-start.js:261`의 "v2.1.9 activated" 하드코딩 잔존 | D2 — 1 라인 치환 |
| Contract L2 smoke | 파일 존재 + 98 TC 선언 | QA 리포트 line 182 "⚠️ 부분" — 실제 hook 스크립트 런타임 발화 미확인 | Sprint 5에서 PR CI 실행 시 첫 실증 |
| Contract L3 MCP | 파일 존재 + 83 TC 선언 | QA 리포트 line 183 "⚠️ 부분" — MCP 서버 실 기동 미확인 | Sprint 5에서 PR CI 실행 시 첫 실증 |
| MON-CC-06 Guards 등록 | Registry에 21건 등록(16건 이상 수용 기준 초과 달성) | 개별 `removeWhen()` 로직 전량 미구현 (`expectedFix: null`) | D7 — 4건 최소 seeding |
| plugin.json description | "39 Skills, 36 Agents, 21 Hook Events." | lib modules/scripts 수치 누락 + "21 Hook Events"가 실제 "24 blocks"와 충돌 | D4 — description 재서술 |
| MEMORY.md 수치 | Architecture 실측 2026-04-21 ENH-263 기록 | "101 Lib Modules, 43 Scripts" 구수치 유지 | D5 — 3줄 교정 |
| Sprint 1 잔여 2건 | Guards + Critical fix 선행 | status.js 분할·pre-write.js 파이프라인은 Sprint 1 단일 세션 스코프 밖으로 명시됐으나 Sprint 2 커밋 `c3659fd`에서 처리 | ✅ 실제 이미 완료, QA 리포트 G2/G3 `closed` 업데이트 필요 |
| CI 실제 실행 | 워크플로우 파일 존재 | 실제 PR에서 실행된 기록 0건 | D3 — PR 생성 필수 |

### 2.3 ❌ 선언됐으나 실증 부족한 것

| 영역 | 선언 | 실증 부족 | 판정 |
|------|------|----------|------|
| "madge --circular 0건" | Plan/Design 수용 기준 | `madge` 바이너리 설치·실행·baseline 파일 부재 (QA G1) | Sprint 5: npm install 권한 내에서 1회 실행 후 결과 파일 생성 |
| "195+ baseline assertions" | Sprint 0 커밋 메시지 | 실측 94 JSON | 커밋 메시지 과대 — 수정 불가(이미 머지). CHANGELOG에는 "94 JSON / 226 assertions"로 정확 기재 |
| "CTO Team 12명" | MEMORY 기록 | strategy.js `teammates: 3` / `6` 프리셋 + MAX=10. 12명 정적 roster 없음 | Sprint 5에서 CTO Team 관련 문서 "동적 pattern-matching" 명시 |
| "3,560 TC 119% 달성" | QA Executive | 실측 3,583 (실제로 119% 이상), 상세집계 2,520은 다른 범주 | D6 — 단일 수치 통합 |
| Port 6종 ↔ Adapter 매핑 | Design §2.3 | Port 파일은 존재, 구현체 경로 주석/문서 2종만 | Sprint 5: README `Architecture` 섹션에 매핑표 삽입 |
| "Domain 의존성 0" | Plan 수용 기준 | `grep` 근거는 있으나 CI gate 부재(ESLint `no-restricted-imports` 실제 발화 미검증) | Sprint 5: CI workflow에 `eslint lib/domain/` step 추가 |
| Prompt Caching 1H 효과 | v2.1.9 분석 문서 "30~40% 토큰 절감" | 벤치마크 실측 데이터 부재 | Sprint 5에서 "추정치, 실측 미수행" 각주 추가 — 또는 48h 관찰 중 `ANTHROPIC_LOG_LEVEL=debug` 샘플 1회 |

### 2.4 🚫 미착수

| 영역 | 미착수 상태 | Sprint 5 판정 |
|------|-----------|--------------|
| **Sprint 5 릴리스 단계 전체** | 0% | ✅ 본 Plan-Plus의 주 범위 |
| L5 E2E Playwright 5 scenarios | Skip 선언(G7) | 이월 — Sprint 6 또는 별도 |
| ENH-256 Glob/Grep native 전수 grep | 미실행(G11) | Sprint 5 포함 — 30분 내 실행 가능 |
| ENH-247 PreCompact 2주 실측 | 시작 안 됨 | Sprint 5 시작 시점에 카운터 가동, Sprint 6 종료 시 판정 |
| ENH-257 ENH-232 재평가 | 시작 안 됨 | ENH-247과 동시 시작 |
| ENH-202 context:fork 확대 (39 skills 중 1) | 미수행 | 이월 — Sprint 6 |
| ENH-168 PermissionDenied hook 수용 | 미수행 | 이월 — Sprint 6+ (수요 확인 후) |
| ENH-244 hooks.json `once:true` 주석 | P3 대기 | Sprint 5 포함 — context-engineering.md에 섹션 추가(코드 변경 없음) |
| `tests/qa/` 13 파일 집계 통합 | 미수행 | Sprint 5 포함 — aggregator 1줄 수정 |
| legacy debt 3건 (`ops-metrics`, `hook-io`, `deploy-state-machine`) | warning-only | 이월 — Sprint 6 또는 Major |

---

## 3. Gap Taxonomy — 유기적 동작 관점 재분류

§2의 원시 gap 목록을 "유기적 동작"이라는 렌즈 아래 **5개 클래스**로 재분류한다. 각 클래스는 별도의 해결 전략을 요한다.

### 3.1 G-Release — 릴리스 준비 미완 (5건)

릴리스 행위의 물리적 산출물(태그, 버전, 노트)이 없거나 불일치한 상태.

| ID | Gap | 근거 | 수정 위치 |
|----|-----|------|----------|
| G-R1 | `plugin.json.version==2.1.9` | `.claude-plugin/plugin.json:4` | 동 파일 bump |
| G-R2 | `git tag v2.1.10` 부재 | `git tag --list` | 릴리스 PR 머지 후 태그 |
| G-R3 | `CHANGELOG.md`에 `## v2.1.10` 섹션 부재 | `grep "^## v2.1.10" CHANGELOG.md` 0건 | CHANGELOG 추가 |
| G-R4 | `README.md` v2.1.10 항목 부재 | 커밋 분석 §F-2 | README "What's New" 갱신 |
| G-R5 | 릴리스 노트 초안 부재 | Sprint 5 미착수 | `docs/04-report/features/bkit-v2110-integrated-enhancement.report.md` 작성 |

### 3.2 G-Wiring — 연결 미흡 (4건)

코드/파일은 존재하나 실제 실행 경로(hook chain, adapter injection, CI trigger)에 연결되지 않은 상태.

| ID | Gap | 근거 | 해결 방향 |
|----|-----|------|----------|
| G-W1 | 21 hook event 중 3곳만 cc-regression attribution 연결 (session-start, pre-write, unified-bash-pre) | 코드베이스 매핑 §F-9 | 최소 3곳 추가 연결 (Stop, SessionEnd, SubagentStop) — Sprint 5.5 |
| G-W2 | Port 6종 중 `cc-payload`/`state-store`/`regression-registry`/`token-meter` 4종 Adapter 매핑 문서 부재 | Design §2.3 진술 대비 구현 경로 미공개 | README `Architecture §3`에 6×2 매핑표 (Port / Adapter / 주입 지점) |
| G-W3 | Registry `expectedFix` 21건 전부 `null` → `lifecycle.reconcile()` 실효 미발생 | `node -e "... CC_REGRESSIONS.filter(g => g.expectedFix)"` 0건 | 최소 4건 seeding (D7) |
| G-W4 | CI 워크플로우 PR trigger 미실증 | `gh run list` 기록 부재 | 릴리스 PR 생성이 첫 trigger (D3) |

### 3.3 G-Contract — 계약 미검증 (3건)

Invocation Contract Test가 이론적으로는 설계됐으나 **실제 CI 환경에서** 한 번도 평가되지 않은 상태.

| ID | Gap | 근거 | 해결 방향 |
|----|-----|------|----------|
| G-C1 | L2 smoke 98 TC "⚠️ 부분" | QA 리포트 line 182 | Sprint 5 PR CI 1회 실행 시 자동 실증 |
| G-C2 | L3 MCP 83 TC "⚠️ 부분" | QA 리포트 line 183 | 동일 — PR CI |
| G-C3 | L5 E2E 0 TC (Playwright 미설치) | QA 리포트 G7 | 이월 — Sprint 6 또는 Contract L5는 "관찰만" 유지 |

### 3.4 G-Consistency — 문서↔코드 드리프트 (6건)

코드 변경이 문서 수치/문자열에 반영되지 않은 상태.

| ID | Gap | 근거 | 해결 방향 |
|----|-----|------|----------|
| G-CS1 | `session-start.js:261` "v2.1.9 activated" 하드코딩 | grep 근거 | BKIT_VERSION 참조 (D2) |
| G-CS2 | `plugin.json.description` 수치: Hook Events 21 → blocks 24 불일치 + lib/scripts 수치 누락 | Addendum §13.2 결정 미반영 | description 재서술 (D4) |
| G-CS3 | `MEMORY.md` 3행 "101 Lib Modules, 24,616 LOC, 43 Scripts" (pre-Sprint-0) | 실측 123/26,296/46 | 3줄 교정 (D5) |
| G-CS4 | `_skills-overview.md:3` "v2.1.9" 태그 | QA shipping §9 P2-1 | "v2.1.10" 치환 |
| G-CS5 | TC 총합 3중 표기 (3,560 / 2,520 / 3,068 / 실측 3,583) | QA 리포트 §4.1 | 단일 표 + 각 집계의 범위 각주 (D6) |
| G-CS6 | CTO Team "12명" MEMORY 기록 vs strategy.js `{3, 6}` 프리셋 + pool ~18 | 코드 매핑 §E | MEMORY 기술을 "최대 풀 18 / 프리셋 3/6 / 하드캡 10"으로 재진술 |

### 3.5 G-Quality — 테스트/지표 정합 (3건)

측정·집계가 부정확해 Release Gate 판정이 흐려지는 상태.

| ID | Gap | 근거 | 해결 방향 |
|----|-----|------|----------|
| G-Q1 | `qa-aggregate.js`가 `tests/qa/` 13 파일 집계 누락 | 코드베이스 매핑 §F-7 | scandir 경로에 `tests/` 추가 또는 별도 집계 |
| G-Q2 | stderr noise 2건이 FAIL로 집계 | QA 리포트 G12, Anomaly | aggregator에 `expectedFailure` 목록 필드 추가, 2건 사전 등록 |
| G-Q3 | `ENH-264` per-turn 토큰 측정 실 데이터 축적 여부 미확인 | Sprint 4.5 `recordTurn()` 연결은 했으나 실측 없음 | 48h 관찰 중 `.bkit/runtime/token-ledger.json` 누적량 확인 |

### 3.6 G-Debt — 기술 부채 (4건)

v2.1.10 범위를 넘어 Sprint 6+로 이월하거나 주석 처리.

| ID | Gap | 근거 | Sprint 5 조치 |
|----|-----|------|--------------|
| G-D1 | Legacy 3개 모듈 (`ops-metrics`, `hook-io`, `deploy-state-machine`) | `check-deadcode.js` 출력 | 이월 — Sprint 6 로드맵에 등재 |
| G-D2 | `hooks.json:7` `once:true` 플래그 기술 부채 주석 미추가 | ENH-244 P3 | context-engineering.md에 1 섹션 추가 (코드 변경 0) |
| G-D3 | `design.md` 2,644 lines 재검증 체크리스트 부재 | 커밋 분석 §D-2 | 이월 — Sprint 6 또는 폐기 (구조 문서만 남기고 본문은 링크) |
| G-D4 | MEMORY.md 291 lines 분해 (ENH-273 P3) | MEMORY 자체 | 이월 — Sprint 6 |

---

## 4. Alternatives Exploration — 각 Gap Cluster별 3안 비교

> **Plan-Plus의 핵심 차별점**. 각 gap cluster에 대해 **최소 3개 대안**을 제시하고 권장안을 명시한다.

### 4.1 G-Release 해결 방식

| 옵션 | 설명 | 장점 | 단점 | 권장 |
|------|------|------|------|:----:|
| A. 코드+릴리스 단일 PR | Sprint 5 모든 작업을 하나의 거대 PR로 머지 후 태그 | 원자성 | 리뷰 비용 큼, CI 첫 실행에서 여러 gap 겹쳐 진단 어려움 | |
| B. 2단 분리 PR (코드 먼저 + 메타 뒤) | PR#1: CI 검증 + 하드코딩 수정 + aggregator 보강 / PR#2: plugin.json bump + CHANGELOG + README + tag | CI 1차 green 확보 후 메타 변경, 리뷰 집중 가능 | PR 2개 관리 | ✅ |
| C. 3단 분리 PR (코드 + 메타 + 관측 결과) | B + PR#3: 48h 관측 후 report.md 작성 | 산출물 선명 | 머지 시점이 72시간+ 분산 | |

**결정: 옵션 B**. PR#1(Sprint 5a, 약 4시간) → PR#2(Sprint 5b, 약 1시간) → 48h 관찰 → `report.md` 별도 PR 또는 `docs/`만 직접 push.

### 4.2 G-Wiring hook attribution 확장 범위

| 옵션 | 설명 | 장점 | 단점 | 권장 |
|------|------|------|------|:----:|
| A. 전 21 hook 즉시 통합 | 모든 hook handler에 `defense-coordinator` 호출 추가 | 표면 최대 | Sprint 4.5 재귀 사건 재발 위험, 리팩 폭증 | |
| B. 3곳 선별 (Stop, SessionEnd, SubagentStop) | 세션 경계/종료 시점의 attribution만 추가 | 관측 품질↑, 리스크↓ | PostToolUse/Notification 등은 여전히 미수혜 | ✅ (Sprint 5.5) |
| C. 0곳 — 현재 상태 유지 | Sprint 6 이월 | 리스크 0 | "유기적 동작" 목표와 거리 | |
| D. 수동 attribution 가이드라인 | 각 hook 작성자에게 규약만 문서화 | 유연 | 개발 단계에서만 유효, 런타임 방어 아님 | |

**결정: 옵션 B (Sprint 5.5에서 선택적)**. 3개 hook만 추가 통합. 단, Sprint 5(PR#1/PR#2)와 별개 PR(PR#3)로 격리하여 릴리스 태그 이후 머지.

**근거**: Sprint 4.5의 재귀 버그(`createDualSink` + `createFileSink` 사이클)는 **adapter 간 의존 순환**이 실 트리거였다. 동일 클래스의 리스크가 hook attribution 확장에 재현될 가능성이 낮으나, **48h 관찰 데이터 없이** 3곳 넘는 확장은 YAGNI.

### 4.3 G-Contract L3 실행 방식

| 옵션 | 설명 | 장점 | 단점 | 권장 |
|------|------|------|------|:----:|
| A. MCP 서버 2종(`bkit-analysis`, `bkit-pdca`) 실기동 → 16 tools `tools/list` 호출 비교 | 완전 runtime 검증 | MCP stdio 프로토콜 테스트 러너 구현 필요 (~4시간) | | |
| B. static 검증만 + baseline 16 JSON 비교 | 이미 구현된 L3 범주 | 스키마 변형 미감지 | 현 구현 수준 | ✅ |
| C. 스모크 수준 1 tool만 실기동 | 절충 | 의미 약함 | | |

**결정: 옵션 B 유지**. MCP stdio 러너 구현은 Sprint 6 ENH 후보로 등재(`ENH-275` 신규 부여).

### 4.4 G-Consistency plugin.json description 포맷

| 옵션 | 설명 | 장점 | 단점 | 권장 |
|------|------|------|------|:----:|
| A. 수치 모두 기입 (`39 Skills, 36 Agents, 24 Hook Blocks, 16 MCP Tools, 123 Lib Modules, 46 Scripts`) | 완전 투명 | description 길이 증가 (~180 chars), 매 릴리스마다 bump 필요 | | |
| B. 수치 제거 ("bkit: Claude Code vibecoding plugin for PDCA-driven development") | 단순 | Docs=Code 연결 끊김 | | |
| C. **핵심 3수치만 + "자세히"** (`39 Skills, 36 Agents, 24 Hook Blocks. See docs/ for architecture.`) | 균형 | 나머지 수치는 docs-code-sync가 유지 | ✅ | |

**결정: 옵션 C**. `description` 필드는 skills/agents/hook blocks 3수치만 유지(사용자 쇼케이스 가치). lib modules/scripts는 docs-code-invariants.js가 단일 진실원.

### 4.5 G-Quality qa-aggregate.js 집계 범위

| 옵션 | 설명 | 장점 | 단점 | 권장 |
|------|------|------|------|:----:|
| A. aggregator에 `tests/` 추가 scandir | 1줄 수정 | `tests/qa/` 13개 파일 통합 집계 | | ✅ |
| B. `tests/qa/`를 `test/legacy-qa/`로 이동 | 단일 디렉토리화 | 파일 이동 필요, git history 복잡 | | |
| C. aggregator 스크립트 재설계 | glob 확장 | 시간 비용 큼 | | |

**결정: 옵션 A**. `test/contract/scripts/qa-aggregate.js`에 `const TEST_DIRS = ['test', 'tests']` 패턴 추가. 집계 결과 TC 수가 증가할 수 있음 → CHANGELOG에 "3,583 (test/) + 13 test files from tests/qa/" 또는 통합 결과 단일 수로 기재.

### 4.6 G-Wiring Registry `expectedFix` seeding 범위

| 옵션 | 설명 | 장점 | 단점 | 권장 |
|------|------|------|------|:----:|
| A. 21건 전량 seed | 완전 reconcile | 정보 수집 시간 ~2h, 일부 이슈는 upstream 미공개 | | |
| B. 4건 seed (MON-CC-02, 51165, 51798, 51801 — 기존 MEMORY에 expectedFix 추정 있는 것) | D7 최소 충족 | 나머지 17건은 lifecycle 관찰만 | | ✅ |
| C. 0건 — lifecycle은 관찰만 | 변경 없음 | "자동 해제" 약속 파기 | | |

**결정: 옵션 B**. 4건 기준: MEMORY 기록에 "hotfix 대기" 또는 "v2.1.118+" 같은 구체적 힌트가 있는 건만. 예: `MON-CC-02`의 `expectedFix: "v2.1.118"` (추정), `MON-CC-06-51165`의 `expectedFix: "v2.1.118"` 등. 추후 hotfix가 나오면 Sprint 6에서 실 버전으로 교체.

### 4.7 48h 관찰 방식

| 옵션 | 설명 | 장점 | 단점 | 권장 |
|------|------|------|------|:----:|
| A. 로컬 세션 10회 실행 | 단순 | 사용자 환경 대표성 낮음 | | |
| B. GitHub Issues/QA 채널 수동 관측 | 실 사용자 신호 | 48h 동안 이슈 제보 여부 불확실 | ✅ | |
| C. Beta 사용자 3명에게 사전 배포 | 품질↑ | Beta 모집·조율 비용 | | |

**결정: 옵션 B**. 본 플러그인은 B2C 대규모 사용자 기반이 아닌 초기 단계이므로 수동 관측 + 로컬 1~2회 smoke 세션(A+B 혼합) 채택. 기준: "관측 기간 내 GitHub Issues/Slack에 v2.1.10 관련 신규 회귀 제보 0건".

---

## 5. YAGNI Review — 제거/보류/채택 판정

> **"지금 하지 않아도 되는 것"을 명확히 잘라내는 단계.** 본 Plan-Plus는 다음 기준을 적용:
> (a) v2.1.10 릴리스에 필수인가? (b) Minor 범위를 넘는가? (c) 증거 기반 수요가 있는가?

| 후보 항목 | 분류 | 판정 | 근거 |
|----------|------|:----:|------|
| TypeScript 도입 | 메이저 구조 변경 | ❌ **FAIL** | Plan §3.3 YAGNI FAIL 이미 확정, Minor 범위 초과 |
| 새 Domain Guard 추가 (ENH-275+) | 신규 기능 | ❌ **FAIL** | v2.1.118+ hotfix 대기 중인 회귀에 대한 Guard는 upstream fix 후 등록이 합리적 |
| ENH-202 Skills `context: fork` 확대 (1→8~10) | 확장 | ⏸️ **보류** | P1이나 Sprint 5 범위 폭증. Sprint 6 최우선 후보 |
| ENH-168 PermissionDenied hook 수용 | 확장 | ⏸️ **보류** | P3 모니터링, CC Auto Mode Research Preview 단계. GA 후 재평가 |
| L5 E2E Playwright 5 scenarios | 신기능 | ⏸️ **보류** | G7, Sprint 6 이월. "관찰만"으로 Addendum 이미 정의됨 |
| legacy 3개 모듈 제거 (`ops-metrics`, `hook-io`, `deploy-state-machine`) | 부채 정리 | ⏸️ **보류** | Sprint 6 로드맵 항목으로 등재, `check-deadcode.js`가 방어 |
| ENH-244 `once:true` 기술부채 주석 | 문서만 | ✅ **채택** | 30분, context-engineering.md에 섹션 추가 (코드 변경 0) |
| ENH-256 Glob/Grep native 전수 grep | 단발 실행 | ✅ **채택** | 30분, `scripts/cc-tool-audit.js` 기존 파일에 결과 기록 |
| ENH-247 PreCompact 2주 실측 시작 | 관찰 | ✅ **채택(시작만)** | Sprint 5 시점에 counter 가동, 판정은 Sprint 6 |
| ENH-257 ENH-232 재평가 시작 | 관찰 | ✅ **채택(시작만)** | ENH-247과 동시 |
| design.md 2,644 lines 재검증 체크리스트 | 문서 정리 | ⏸️ **보류** | Sprint 6. Sprint 5 범위 불침범 |
| MEMORY.md 분해 (291 lines → 다수 파일) | 문서 정리 | ⏸️ **보류** | Sprint 6 |
| MCP stdio L3 런타임 러너 구현 | 확장 | ❌ **FAIL (현 범위)** | ENH-275 신규 부여하고 Sprint 6+ 이월 |
| `tests/qa/` 디렉토리 이동 | 구조 변경 | ❌ **FAIL** | aggregator 1줄 수정이 더 싸고 안전 |
| 새 MCP 서버 추가 | 신기능 | ❌ **FAIL** | Sprint 5 범위 외 |
| Slack/GitHub Discussion 공지 자동화 | 운영 | ⏸️ **보류** | Policy 명시 out-of-scope |
| CTO Team 12명 static roster 하드코딩 | 구조 변경 | ❌ **FAIL** | 현재 동적 pattern-matching이 설계상 정당, MEMORY 기술만 교정하면 됨 (G-CS6) |
| Compatibility Policy FR-01~FR-08 전면 시행 | 정책 적용 | ✅ **채택 (FR-03, FR-06만)** | Release Gate 첫 사용 + 3세그먼트 zero-action 검증 |
| 버전 bump 자동화 스크립트 | 인프라 | ❌ **FAIL** | Sprint 5 1회 수동 bump로 충분, 자동화는 2 릴리스 후 |

---

## 6. 선택된 아키텍처 / 접근

> Plan §3.2의 옵션 체계(A=Minimal, B=Clean, C=Pragmatic)를 이어받아 **Sprint 5는 옵션 A(Minimal)** 를 선택한다. Sprint 0~4.5가 이미 Clean Architecture foundation을 세웠으므로, 잔여 gap은 **기존 구조의 마무리 작업**이지 재구조화가 아니다.

### 6.1 아키텍처 결정표

| 결정점 | 선택 | 이유 |
|--------|------|------|
| 전체 접근 | **Minimal Changes + Release Discipline** | Sprint 4.5 재귀 사건 학습: 새 adapter 추가는 운영 증거 없이 위험. Sprint 5는 "있는 것을 릴리스한다" |
| PR 구조 | **2단 분리 (코드/테스트 먼저 → 메타 뒤)** | §4.1 옵션 B |
| hook attribution 확장 | **옵션 B (Stop/SessionEnd/SubagentStop 3곳, Sprint 5.5 격리)** | §4.2 |
| 릴리스 타이밍 | **PR#1 머지 → PR#2 머지 → 태그 → 48h 관찰 → report.md 머지** | 관측 후 태그 금지(태그가 "릴리스 완결" 신호) |
| 테스트 전략 | **기존 유지 + aggregator 범위 확장** | §4.5 옵션 A |
| CI 전략 | **3 workflow 유지 + domain ESLint step 추가** | 없던 것을 만들기보다 기존 체크인 workflow 강화 |
| 문서 정책 | **단일 출처 원칙** (`lib/domain/rules/docs-code-invariants.js`의 EXPECTED_COUNTS) | Sprint 4 도입 원칙의 일관 적용 |

### 6.2 레이어 변경 (아주 작음)

Sprint 5는 신규 레이어를 추가하지 않는다. 기존 Presentation/Application/Domain/Infrastructure 4-layer를 유지.

```
┌───────────────────────────────────────────────────────┐
│ 변경 위치 집중:                                        │
│ (1) Presentation: hooks/session-start.js:261 (D2)     │
│ (2) Application: scripts/unified-stop.js* (Sprint 5.5) │
│ (3) Domain: (없음 — 순수 로직 변경 금지)              │
│ (4) Infrastructure: (없음 — Sprint 4.5 이후 동결)     │
│ (5) 메타: plugin.json / CHANGELOG / README / MEMORY   │
│ (6) 테스트: test/contract/scripts/qa-aggregate.js     │
└───────────────────────────────────────────────────────┘
```

`*` — Sprint 5.5 선택 시

### 6.3 "새 파일 추가 최소" 원칙

신규 파일 추가는 **2개로 제한**:

1. `docs/04-report/features/bkit-v2110-integrated-enhancement.report.md` (릴리스 노트 + 관측 결과)
2. (선택) `docs/06-release-notes/v2.1.10.md` — 단독 릴리스 노트를 CHANGELOG와 별도 파일로 분리할지 결정 (기본: CHANGELOG 단일 출처, 추가 파일 불필요)

나머지는 기존 파일 수정만.

---

## 7. Requirements (MoSCoW)

### 7.1 Must Have (Sprint 5, 7건 / 약 4~5시간)

| # | Requirement | 대응 gap | 공수 | 완료 조건 (DoD) |
|---|-------------|---------|:----:|----------------|
| M1 | plugin.json `version`을 `2.1.10`으로 bump | G-R1 | 5min | JSON 파일 diff 1줄, `jq '.version' .claude-plugin/plugin.json` = `"2.1.10"` |
| M2 | CHANGELOG.md에 `## v2.1.10 — 2026-04-XX` 섹션 추가 (주요 변경·Critical 고지·TC 수치·Breaking 0 표기) | G-R3 | 45min | 섹션 `grep -c "^## v2\.1\.10"` ≥ 1, 5개 하위 항목(신규/변경/수정/보안/호환) |
| M3 | README.md "What's New" 또는 상단 배지에 v2.1.10 반영 | G-R4 | 15min | "v2.1.9" 문자열 검색 0건(README 내) |
| M4 | `hooks/session-start.js:261`에서 BKIT_VERSION 참조로 치환 | G-CS1 | 10min | `grep "v2\.1\.9" hooks/session-start.js` = 0 |
| M5 | 릴리스 PR 생성 후 CI 3 workflow 전부 green 확인 | G-C1, G-C2, G-W4 | 30min (+CI 대기) | `gh run list --workflow contract-check.yml --limit 1` status=success |
| M6 | git tag `v2.1.10` 생성 + push | G-R2 | 5min | `git tag --list v2.1.10` 존재 |
| M7 | 48h 관측 완료 + `report.md` 작성 | G-R5, G-Q3 | 1h (관측 후) | report.md 파일 + Match Rate 재측정 ≥ 95% |

### 7.2 Should Have (Sprint 5, 6건 / 약 2~3시간)

| # | Requirement | 대응 gap | 공수 |
|---|-------------|---------|:----:|
| S1 | plugin.json description 재서술 (§4.4 옵션 C) | G-CS2 | 5min |
| S2 | MEMORY.md 3행 수치 교정 + `_skills-overview.md:3` v2.1.10 | G-CS3, G-CS4 | 15min |
| S3 | `qa-aggregate.js`에 `tests/` scandir 추가 + `expectedFailure` 목록 (stderr noise 2건 등록) | G-Q1, G-Q2 | 45min (1 TC 포함) |
| S4 | Registry 4건 `expectedFix` seeding | G-W3 | 30min |
| S5 | Port↔Adapter 매핑표를 README 또는 CUSTOMIZATION-GUIDE에 삽입 | G-W2 | 30min |
| S6 | ENH-256 `scripts/cc-tool-audit.js` 실행 + 결과 `.bkit/audit/cc-tools.txt` 기록 | ENH-256 | 30min |

### 7.3 Could Have (Sprint 5.5, 4건 / 약 3~4시간)

| # | Requirement | 대응 gap | 공수 |
|---|-------------|---------|:----:|
| C1 | hook attribution 확장 3곳: `unified-stop.js`, `session-end-handler.js`, `subagent-stop-handler.js`에 `defense-coordinator.checkCCRegression` 경로 추가 | G-W1 | 2h (+L2 TC 3건) |
| C2 | CI workflow에 `eslint lib/domain/ --rule no-restricted-imports` step 추가 | "Domain 의존성 0" CI gate | 30min |
| C3 | ENH-244 `once:true` 기술부채 주석 docs/context-engineering.md에 섹션 추가 | G-D2 | 30min |
| C4 | ENH-247 + ENH-257 counter 가동 | 관찰 시작 | 30min |

### 7.4 Won't Have (this iteration)

- TypeScript 도입
- 새 Domain Guard 추가
- L5 E2E Playwright
- legacy 3개 모듈 제거
- ENH-202 context:fork 확대 (→ Sprint 6 최우선)
- ENH-168 PermissionDenied hook 수용
- MEMORY.md 분해
- design.md 재조정
- CTO Team static roster 하드코딩

---

## 8. Sprint 5 상세 계획 (2 PR, 약 6~7시간 + 48h 관찰)

### 8.1 Sprint 5a — PR#1 "v2.1.10: code finalization & aggregator"

**브랜치**: `feat/v2110-integrated-enhancement` 유지 (현재 브랜치 그대로 진행)
**목적**: 코드·테스트·설정 레벨 변경을 먼저 반영해 CI 첫 green 확보

**작업 순서**:

1. **M4 (10min)** — `hooks/session-start.js:261` 치환
   ```javascript
   // Before
   systemMessage: `bkit Vibecoding Kit v2.1.9 activated (Claude Code)`,
   // After
   const { BKIT_VERSION } = require('../lib/core/version');
   // ...
   systemMessage: `bkit Vibecoding Kit v${BKIT_VERSION} activated (Claude Code)`,
   ```
   - `lib/core/version.js`의 `BKIT_VERSION`이 `'2.1.10'`으로 선 업데이트되어야 함 (M1의 pre-req)

2. **M1 (5min)** — plugin.json bump
   ```json
   "version": "2.1.10",
   ```
   - 동시에 `lib/core/version.js`에서 `BKIT_VERSION = '2.1.10'`로 변경

3. **S1 (5min)** — plugin.json description (§4.4 옵션 C)
   ```json
   "description": "bkit: Claude Code vibecoding plugin — 39 Skills, 36 Agents, 24 Hook Blocks. PDCA workflow + Defense-in-Depth + Clean Architecture. See docs/."
   ```

4. **S3 (45min)** — aggregator 확장
   - `test/contract/scripts/qa-aggregate.js`에 `TEST_DIRS = ['test', 'tests']` 또는 동등 로직
   - `expectedFailure` 목록 필드 추가, stderr noise 2건(`test/unit/project-isolation.test.js`, `test/unit/runner.test.js`) 사전 등록
   - 출력 포맷에 "Expected Failures: 2 (pre-existing v2.1.9, tracked in MEMORY)" 행 추가
   - 신규 TC 1건: `aggregator가 tests/qa/ 디렉토리 집계 포함 검증`

5. **S4 (30min)** — Registry `expectedFix` seeding
   - `lib/cc-regression/registry.js`에서 4건 수정:
     - `MON-CC-02` (#47855): `expectedFix: '2.1.118'` (추정 주석 포함)
     - `MON-CC-06-51165`: `expectedFix: '2.1.118'`
     - `ENH-262` (#51798): `expectedFix: '2.1.118'`
     - `ENH-263` (#51801): `expectedFix: '2.1.118'`
   - L1 TC 추가: `test/contract/registry-expected-fix.test.js` (4 TC)

6. **S6 (30min)** — ENH-256 실행
   - `node scripts/cc-tool-audit.js > .bkit/audit/cc-tools.txt` 실행
   - 결과 파일 커밋 (파일 생성됨 확인)

7. **S2 (15min)** — MEMORY.md / _skills-overview.md 수치 교정
   - MEMORY 3행: `101 Lib Modules, 24,616 LOC in lib/, 43 Scripts` → `123 Lib Modules, 26,296 LOC, 46 Scripts`
   - `_skills-overview.md:3`: `v2.1.9` → `v2.1.10`

8. **S5 (30min)** — Port↔Adapter 매핑표
   - `README.md`에 `## Architecture` 섹션 추가 또는 `CUSTOMIZATION-GUIDE.md`에 포함
   ```markdown
   ## Port ↔ Adapter 매핑 (v2.1.10)
   | Port | Interface | Adapter (구현체) | 주입 지점 |
   |------|-----------|-----------------|----------|
   | cc-payload.port.js | CCPayloadPort | lib/infra/cc-bridge.js (Sprint 6 신설 예정) | hooks/session-start.js |
   | state-store.port.js | StateStorePort | lib/core/state-store.js (기존) | lib/pdca/status-core.js |
   | regression-registry.port.js | RegressionRegistryPort | lib/cc-regression/registry.js | lib/cc-regression/defense-coordinator.js |
   | audit-sink.port.js | AuditSinkPort | lib/infra/telemetry.js (createOtelSink only, post Sprint 4.5) | lib/audit/audit-logger.js:219 |
   | token-meter.port.js | TokenMeterPort | lib/cc-regression/token-accountant.js | scripts/unified-stop.js |
   | docs-code-index.port.js | DocsCodeIndexPort | lib/infra/docs-code-scanner.js | scripts/docs-code-sync.js |
   ```
   - ⚠️ `cc-bridge.js` 미존재 → 현재 `hooks/session-start.js`가 직접 CC payload 파싱. "Sprint 6 신설 예정" 또는 "현재 inline" 표기로 정직하게 기술.

9. **S3 포함 테스트 재실행**: `node test/contract/scripts/qa-aggregate.js` → 새 집계 확인, 커밋 메시지에 "3,583 + tests/qa 13 = 신규 집계 N TC" 기재

10. **커밋 & PR 생성**:
    ```
    feat(v2.1.10): Sprint 5a — release finalization (code+meta aligned)
    - plugin.json 2.1.9 → 2.1.10
    - session-start.js BKIT_VERSION 중앙화 완결 (ENH-167 close)
    - Registry expectedFix seeding 4건 (lifecycle.reconcile 실효화)
    - qa-aggregate.js tests/qa/ 집계 통합 + expectedFailure 등록
    - Port↔Adapter 매핑표 README 추가
    - MEMORY/Skills overview 수치 정정
    - ENH-256 Glob/Grep native 전수 grep 완료 (.bkit/audit/cc-tools.txt)
    ```
    - PR 제목: `feat(v2.1.10): Sprint 5a — Release finalization`
    - GitHub Actions 실행 대기
    - `gh run list --workflow contract-check.yml --limit 1` status=success 확인 후 다음 단계

**Gate (Sprint 5a 완료 조건)**:
- [ ] PR#1 CI 3 workflow green
- [ ] qa-aggregate 출력 `pass=3,58N / fail=0 (expected:2 separated)`
- [ ] `grep "v2\.1\.9" hooks/ scripts/ lib/core/version.js` = 0
- [ ] Registry 21건 중 `expectedFix != null` 4건 이상
- [ ] `node scripts/check-guards.js && node scripts/docs-code-sync.js && node scripts/check-deadcode.js` 3개 모두 PASSED

### 8.2 Sprint 5b — PR#2 "v2.1.10: CHANGELOG & release notes"

**목적**: 코드 그린 확인 후 릴리스 메타 PR. 리뷰는 텍스트만 집중.

**작업 순서**:

1. **M2 (45min)** — CHANGELOG.md 작성
   - 템플릿 (Policy §4.3 FR-04 적용):
   ```markdown
   ## v2.1.10 — 2026-04-2X

   **Highlights**
   - Clean Architecture 4-layer foundation (Domain Ports 6, Guards 4, cc-regression 6 modules)
   - Guard Registry 21건 + `lifecycle.reconcile()` 일 1회 자동 해제 파이프라인
   - Invocation Contract Test L1~L4 (226 assertions baseline, PR 게이트)
   - Docs=Code CI (`scripts/docs-code-sync.js`, 0 drift)
   - audit-logger 682GB recursion 근본 수정 + integration runtime 영구 방어 TC

   **New**
   - Domain Ports 6종: cc-payload/state-store/regression-registry/audit-sink/token-meter/docs-code-index
   - Domain Guards 4종: ENH-254/262/263/264 (CC v2.1.117 회귀 방어)
   - Contract baseline `test/contract/baseline/v2.1.9/` (94 JSON)
   - CI workflow: `contract-check.yml`, `cc-regression-reconcile.yml`
   - OTEL telemetry adapter `lib/infra/telemetry.js` (createOtelSink single, createDualSink deprecated for audit-logger)

   **Changed**
   - lib/pdca/status.js 872 → facade 52 + core 399 + migration 156 + cleanup 255
   - scripts/pre-write.js 286 → 529 (12-stage pipeline with defense-coordinator)
   - MEMORY/Skills overview 수치 Docs=Code 기준 재정렬

   **Fixed**
   - C1: audit-logger startDate → date 파라미터 (문서 지정과 동기)
   - C2: audit details PII 유출 방지 (sanitizeDetails 6-key blacklist + 500자 cap)
   - Sprint 4.5 self-introduced: createDualSink recursion (createOtelSink 단독 호출로 교체)

   **Security**
   - Defense-in-Depth 4-Layer 공식화
   - PII redaction 7-key (text/content/prompt/message/api_key/token/password)
   - ENH-263 `.claude/` write + bypassPermissions 조합 차단 (#51801)

   **Compatibility**
   - Invocation Contract 100% 보존 (226 assertions PASS)
   - Starter/Dynamic/Enterprise 세그먼트 zero-action update
   - Deprecation: 없음 (첫 정책 도입 마이너)

   **Test**
   - 총 3,58N TC / PASS 3,58N / Expected Failure 2 (v2.1.9 from, tracked)
   - 96 test files (test/) + 13 QA files (tests/qa/)

   **Known Limitations**
   - L5 E2E Playwright 미포함 (Sprint 6)
   - Registry 21건 중 17건 expectedFix null (관찰 대기)
   - Hook attribution 현재 3곳(session-start/pre-write/unified-bash-pre), 추가 확장은 Sprint 5.5 PR#3에서
   ```

2. **M3 (15min)** — README 업데이트
   - 상단 배지 `v2.1.9` → `v2.1.10`
   - "What's New in v2.1.10" 3~5 bullet 섹션 추가 (CHANGELOG highlights 요약)

3. **커밋 & PR 생성**:
   - 메시지: `docs(v2.1.10): Sprint 5b — CHANGELOG/README release notes`
   - 머지 후 **태그**: `git tag v2.1.10 && git push origin v2.1.10`

**Gate (Sprint 5b 완료 조건)**:
- [ ] CHANGELOG v2.1.10 섹션 존재 (`grep -c "^## v2\.1\.10" CHANGELOG.md` ≥ 1)
- [ ] README v2.1.9 문자열 0
- [ ] `git tag --list v2.1.10` 존재
- [ ] PR#2 CI green (문서 전용이므로 lint/docs-code-sync만 검증)

### 8.3 48-hour 관찰 단계 (2026-04-2X ~ 2026-04-2Y)

**관찰 대상**:
1. GitHub Issues (bkit 저장소)
2. 플러그인 사용자 Slack/Discord (있다면)
3. 로컬 smoke 세션 2회 (PDCA 전체 사이클 1회, CTO Team spawn 1회)

**수집 지표**:
- `.bkit/runtime/token-ledger.json` 누적량 (ENH-264 실측)
- `lib/cc-regression/lifecycle.js` reconcile 발화 횟수 및 해제 건수
- PreCompact block 발화 횟수 (ENH-247 2주 카운터 시작점)
- stderr noise 2건 재발 여부
- 사용자 제보 (회귀/성능/UX)

**관찰 결과 → report.md**:
- `docs/04-report/features/bkit-v2110-integrated-enhancement.report.md` 작성
- gap-detector 5차 재실행, Match Rate ≥ 95% 확인
- 관측 신규 회귀 0건이면 `.pdca-status.json.phase = "completed"`

### 8.4 Sprint 5.5 (선택, 별도 PR#3)

**조건**: Sprint 5 Release Gate 통과 + 관찰 48h 신규 회귀 0건 + 사용자가 확장 원함.

**작업**:
- C1 hook attribution 3곳 (`unified-stop.js`, `session-end-handler.js`, `subagent-stop-handler.js`)
- C2 CI에 domain ESLint step 추가
- C3 ENH-244 context-engineering.md 섹션
- C4 ENH-247/257 counter 가동

**PR 생성 시점**: 태그 `v2.1.10` 이후. 이 변경은 `v2.1.11-pre` 브랜치로 머지하거나 main에 직접 append 후 minor bump 시 흡수. 본 Plan-Plus는 **태그 이후 작업은 v2.1.10 범위 외**로 선언 (단, 같은 세션에서 즉시 이어서 수행 가능).

---

## 9. Task 분해 (Sprint 5a + 5b, Do 단계용)

> Do 단계(`/pdca do bkit-v2110-gap-closure --scope sprint-5a` 혹은 `--scope sprint-5b`)에서 체크리스트로 사용.

### 9.1 Sprint 5a 체크리스트

- [ ] **T1** `lib/core/version.js`에서 `BKIT_VERSION = '2.1.10'`으로 변경 (5min)
- [ ] **T2** `.claude-plugin/plugin.json:version=="2.1.10"` 변경 (2min)
- [ ] **T3** `.claude-plugin/plugin.json:description` §4.4 옵션 C로 재서술 (3min)
- [ ] **T4** `hooks/session-start.js:261` BKIT_VERSION 참조 치환 + `require` 추가 (10min)
- [ ] **T5** `hooks/session-start.js`에 L1 TC 추가: `systemMessage에 v2.1.10 포함` (5min)
- [ ] **T6** `test/contract/scripts/qa-aggregate.js`에 `TEST_DIRS` 확장 + `expectedFailure` 배열 + stderr noise 2건 등록 (30min)
- [ ] **T7** aggregator 신규 TC 1건 `test/contract/aggregate-scope.test.js` (15min)
- [ ] **T8** `lib/cc-regression/registry.js` 4건 `expectedFix` seeding (15min)
- [ ] **T9** `test/contract/registry-expected-fix.test.js` 4 TC (15min)
- [ ] **T10** `node scripts/cc-tool-audit.js > .bkit/audit/cc-tools.txt` 실행 + 결과 커밋 (5min)
- [ ] **T11** `MEMORY.md` 3행 수치 교정 (5min)
- [ ] **T12** `_skills-overview.md:3` v2.1.10 (2min)
- [ ] **T13** `README.md`에 Port↔Adapter 매핑표 추가 (20min)
- [ ] **T14** 로컬 검증 4-command green: `check-guards && docs-code-sync && check-deadcode && qa-aggregate` (5min)
- [ ] **T15** PR#1 생성 + CI 완주 대기 (CI 5~10min) + green 확인
- [ ] **T16** PR#1 self-review 승인 + 머지 (5min)

**총 공수 예상**: 약 2.5~3시간 (+ CI 10~15min)

### 9.2 Sprint 5b 체크리스트

- [ ] **T17** CHANGELOG.md v2.1.10 섹션 작성 (45min)
- [ ] **T18** README.md 상단 배지 + "What's New" 섹션 (15min)
- [ ] **T19** PR#2 생성 + CI green + 머지 (5~10min)
- [ ] **T20** `git tag v2.1.10 && git push origin v2.1.10` (2min)

**총 공수 예상**: 약 1시간 (+ CI)

### 9.3 48h 관찰 + report.md 체크리스트

- [ ] **T21** 로컬 smoke 1 — PDCA 전 사이클 `/pdca plan → design → do → analyze → report` 한 feature 실행 (40min)
- [ ] **T22** 로컬 smoke 2 — CTO Team spawn (`/pdca team status` 확인 수준으로 충분, 실행 금지) (10min)
- [ ] **T23** 48h 경과 후 GitHub Issues 관측 결과 기록 (10min)
- [ ] **T24** gap-detector 5차 재실행 (`/pdca analyze bkit-v2110-gap-closure`) (30min)
- [ ] **T25** `docs/04-report/features/bkit-v2110-integrated-enhancement.report.md` 작성 (1h)
- [ ] **T26** MEMORY.md에 v2.1.10 섹션 추가 (15min)

**총 공수 예상**: 약 3시간 (관측 대기 별도)

---

## 10. Risk Register + Mitigation

§Context Anchor의 R1~R5를 세부화 + Sprint 4.5 교훈 반영.

| ID | Risk | Sev | Prob | Mitigation | Fallback |
|----|------|:---:|:----:|------------|----------|
| R1 | plugin.json bump 누락 또는 오타로 인한 플러그인 로딩 실패 | **H** | L | JSON schema 검증 CI step 기존 존재, PR#1 merge 전 manual jq 검증 | 즉시 hotfix 커밋 |
| R2 | session-start.js BKIT_VERSION 참조 치환 후 SessionStart hook 크래시 | H | L | 변경 즉시 `echo '{"hook_event_name":"SessionStart"}' | node hooks/session-start.js` 로컬 smoke | 이전 커밋 revert + 직접 문자열 2.1.10 사용 |
| R3 | PR#1 CI에서 contract-check workflow 첫 실행 실패 | M | **M** | 첫 실패 로그 전수 분석 → 원인별 수정 | workflow.yml 자체를 수정해야 할 경우 PR#1 범위 확대 인정 |
| R4 | Registry `expectedFix` seeding 후 `lifecycle.reconcile()`이 premature 해제 | M | L | CC 버전이 expectedFix 미만이면 no-op 보장하는 `semverLt` TC 추가 | 실제 해제 발생 시 `.bkit/runtime/cc-regression-log.json` 추적, 수동 재등록 |
| R5 | 48h 관찰 중 사용자가 v2.1.10 업데이트 후 기존 PDCA 세션 깨짐 제보 | H | L | Invocation Contract L1+L4 226 assertions가 PR#1 green 후 PR#2 전까지 시간 간극 최소화 | Policy FR-05 Contract 위반 예외 프로세스 발동 (yanked v2.1.10 + hotfix v2.1.10.1) |
| R6 | aggregator 확장 후 `tests/qa/` 13 파일 중 일부가 실패로 집계 | M | M | 사전 `node scripts/qa-aggregate.js --dry-run` 분석, 필요 시 `expectedFailure` 확대 | 13 파일 중 실패 파일을 임시 `expectedFailure` 등록 후 Sprint 6에서 수정 |
| R7 | 문서 수치 교정이 또 다른 드리프트 유발 (예: README에 수치 복제) | L | M | 단일 출처 원칙 선언: 수치는 `plugin.json`, `EXPECTED_COUNTS`, `MEMORY` 3곳만 허용 | `scripts/docs-code-sync.js`의 DEFAULT_DOC_TARGETS에 해당 파일 추가 |
| R8 | 태그 `v2.1.10` push 후 user가 zero-action update로 기대 안 된 UX 변경 감지 | H | L | Addendum §2 Invocation Contract + Plan §7 UX 자유 재조정 이미 반영 (byte-exact diff 요구 해제) | 사용자 제보 시 Contract 위반 여부 227 assertions로 이중 확인 |
| R9 | 브랜치 이름 `feat/v2110-integrated-enhancement`에 5a/5b 두 PR이 병렬 진행되면 충돌 | M | M | PR#1 머지 확정 후 PR#2 작업 직렬화 | 필요 시 `feat/v2110-release-meta` 신규 브랜치로 PR#2 분리 |
| R10 | Sprint 4.5 재귀 같은 자기 도입 버그 재발 | **H** | L | Sprint 5는 **새 adapter 추가 금지** 원칙. 변경은 치환·설정·문서 중심. Sprint 5.5만 adapter 확장 다룸 | integration-runtime.test.js 영구 유지 + check-deadcode 가드 유지 |

---

## 11. Success Criteria (Acceptance Gates)

> §1.3의 D1~D8 상세 판정 기준.

| # | Criterion | 측정 방법 | 통과 기준 |
|---|-----------|---------|:--------:|
| D1 | 릴리스 메타 3종 일치 | `jq '.version' .claude-plugin/plugin.json`, `grep "^## v2\.1\.10" CHANGELOG.md`, `git tag --list v2.1.10` | 모두 `"2.1.10"` |
| D2 | 버전 스트링 중앙화 | `grep -r "v2\.1\.9" hooks/ scripts/ lib/core/ README.md` | 0건 (단, CHANGELOG 이력 기록은 예외) |
| D3 | CI PR green | `gh run list --workflow contract-check.yml --limit 2 --json status` | 최근 2회 모두 `success` |
| D4 | plugin.json description | Addendum §13.2 + §4.4 옵션 C 준수 | visual 검토 |
| D5 | MEMORY 수치 정합 | `grep "101 Lib Modules\|43 Scripts" MEMORY.md` | 0건 |
| D6 | TC 수치 단일 | CHANGELOG + qa-aggregate + report.md에 동일 TC 수 | 3곳 일치 |
| D7 | Registry expectedFix seed | `node -e "... CC_REGRESSIONS.filter(g => g.expectedFix != null).length"` | ≥ 4 |
| D8 | 48h 관측 회귀 0 | report.md "Regression Reports" 섹션 | `count = 0` |

**전체 Release Gate (필수 전량)**: D1 ∧ D2 ∧ D3 ∧ D4 ∧ D5 ∧ D6 ∧ D7 ∧ D8

**gap-detector 재실행 기준**: Sprint 5a/5b 머지 + 48h 관찰 후 `/pdca analyze bkit-v2110-gap-closure`로 Match Rate ≥ 95% 확인.

---

## 12. 문서 vs 코드 교차 검증 매트릭스 (Docs=Code CI 확장)

`lib/infra/docs-code-scanner.js` + `scripts/docs-code-sync.js`가 현재 검증하는 것 외에 Sprint 5에서 추가되는 invariants:

| Invariant | 단일 출처 | 검증 위치 | 추가 시점 |
|-----------|---------|---------|----------|
| BKIT_VERSION | `lib/core/version.js` | `hooks/session-start.js`, `plugin.json`, CHANGELOG 제목 | Sprint 5a |
| Hook blocks 수 | hooks.json 파싱 | plugin.json.description, MEMORY, docs-code-invariants.js | 이미 검증(Sprint 4) |
| Skills 수 | `skills/` scandir | plugin.json.description, MEMORY, docs-code-invariants.js | 이미 검증 |
| Agents 수 | `agents/` scandir | plugin.json.description, MEMORY, docs-code-invariants.js | 이미 검증 |
| Lib modules 수 | `lib/` find *.js | MEMORY (plugin.json description에서는 제거) | Sprint 5a (MEMORY 한정) |
| Scripts 수 | `scripts/` find *.js | MEMORY (plugin.json description에서는 제거) | Sprint 5a (MEMORY 한정) |
| TC 총합 | `qa-aggregate.js` 출력 | CHANGELOG, report.md | Sprint 5a+5b (수동 정합) |
| Registry expectedFix | `registry.js` 파싱 | 없음 (runtime 전용) | — |

**권고**: Sprint 6에서 `docs-code-scanner.js`를 **BKIT_VERSION 중앙화 검증**까지 확장하는 것을 ENH-276(신규)로 등재.

---

## 13. Rollback Plan

Sprint 5 머지 직후 48h 관찰에서 심각한 회귀 발생 시 복구 절차:

### 13.1 Hotfix 경로 (v2.1.10.1)

**조건**: 회귀가 특정 파일에 한정, 1~2줄 수정으로 해결 가능.

1. `feat/v2110-hotfix-1` 브랜치 생성
2. 수정 + TC 추가
3. plugin.json `version: "2.1.10.1"` (Policy Patch 수준 허용)
4. CHANGELOG에 `## v2.1.10.1 — hotfix` 추가
5. 태그 `v2.1.10.1`
6. 태그 `v2.1.10`은 유지 (yank하지 않음)

### 13.2 Yank 경로 (v2.1.10 전면 철회)

**조건**: Invocation Contract 위반 또는 데이터 손실 가능성.

1. **즉시 공지**: GitHub Issue 작성 + README 상단 알림
2. git tag `v2.1.10` 삭제: `git tag -d v2.1.10 && git push origin :refs/tags/v2.1.10`
3. main 머지를 revert 커밋으로 취소
4. plugin.json `version: "2.1.9-post"` 또는 `2.1.9`로 복귀
5. Policy FR-05 사례 등록: `docs/06-policies/contract-violation-cases.md` 신규 생성

### 13.3 관측 기간 중단 경로

**조건**: 48h 중 24h 시점 회귀 2건 이상.

1. 관측 계속 (태그는 유지)
2. Sprint 5.5 착수 일정을 1주 연기
3. 회귀 분석 결과를 report.md에 포함

---

## 14. Sprint 6 예비 범위 (본 Plan-Plus 범위 외 — 참고용)

Sprint 5 완료 후 바로 착수할 Sprint 6(v2.1.11 목표) 핵심 항목:

1. **ENH-202 Skills `context: fork` 확대** (P1, 39 → 8~10 skills): qa-*, phase-*, pdca-* 후보 선정 및 점진 적용
2. **Sprint 5.5 미채택분** (선택) 재평가
3. **legacy 3개 모듈 정리** (ops-metrics, hook-io, deploy-state-machine)
4. **L5 E2E Playwright 5 scenarios** 도입 검토
5. **design.md 2,644 lines 리팩토링** (section split)
6. **MEMORY.md 분해** (ENH-273)
7. **MCP stdio L3 런타임 러너** (ENH-275 신규)
8. **docs-code-scanner BKIT_VERSION 검증 확장** (ENH-276 신규)
9. **CC v2.1.118+ 대응**: upstream hotfix 관찰 → MON-CC-06 해제 실측
10. **PM/PRD 문서 v2.1.10-retrospective** 작성 (별도 PDCA 사이클)

---

## 15. 의존성 그래프

```
T1 (version.js)
  └─ T2 (plugin.json)
  └─ T4 (session-start.js) — T1 선행
       └─ T5 (session-start L1 TC)

T6 (qa-aggregate.js) — 독립
  └─ T7 (aggregate-scope TC)

T8 (registry.js) — 독립
  └─ T9 (registry-expected-fix TC)

T10 (cc-tool-audit) — 독립

T11 (MEMORY), T12 (skills-overview) — 독립

T13 (README Port 매핑) — 독립

T14 (4-command verify) — T1~T13 모두 선행

T15 (PR#1) — T14 선행
  └─ T16 (merge)
       └─ T17 (CHANGELOG) — 머지 후 파생
       └─ T18 (README What's New)
            └─ T19 (PR#2)
                 └─ T20 (tag)
                      └─ [48h 관측]
                           └─ T21/T22 (smoke)
                                └─ T23/T24/T25/T26 (report)
```

**병렬화 가능**: T6+T7, T8+T9, T10, T11, T12, T13은 T1~T5와 독립이므로 동시 진행 가능.

---

## 16. Sprint 5 체크포인트 (pdca Checkpoint 1~5 매핑)

PDCA skill의 Checkpoint 체계에 맞춤:

- **Checkpoint 1 (요구사항 확인)**: 본 문서 §Executive + §Context Anchor + §1.3 D1~D8 승인 여부
- **Checkpoint 2 (Clarifying Questions)**: 이 단계의 unresolved 질문 — 아래 §17 참조
- **Checkpoint 3 (Architecture Selection)**: §6.1 옵션 선택 승인 (Minimal Changes + Release Discipline + 2-PR 분리)
- **Checkpoint 4 (Implementation Approval)**: T1~T26 체크리스트 승인 + 실행 개시
- **Checkpoint 5 (Review Decision)**: Sprint 5a/5b 머지 직전 gap-detector 재실행 결과 검토

---

## 17. Unresolved Questions (Checkpoint 2 입력)

사용자 승인 필요 질문:

1. **Q1**: `git tag v2.1.10` 타이밍 — PR#2 머지 즉시 태그? 아니면 48h 관찰 후 태그? (본 Plan-Plus 기본: PR#2 머지 즉시 태그, 48h 중 회귀 발견 시 hotfix 또는 yank)
2. **Q2**: Sprint 5.5 (hook attribution 3곳 확장) 포함 여부? (Plan-Plus 권장: 관찰 48h 후 별도 PR#3, Sprint 6 착수 시점에 재평가)
3. **Q3**: PR#1에서 `madge --circular` 첫 실행하여 baseline 파일 커밋할지? (Plan-Plus 기본: Sprint 5 범위. 단 npm install 권한 필요 — 사용자 환경 체크 필요)
4. **Q4**: README Port↔Adapter 매핑표에 `cc-bridge.js`(미존재) 항목 처리 — "Sprint 6 예정"으로 명시? 아니면 Sprint 5에서 stub 파일 생성? (Plan-Plus 기본: "Sprint 6 예정 / 현재 hooks/session-start.js inline" 정직 기술)
5. **Q5**: `tests/qa/` 13개 파일을 aggregator 통합 후 전부 PASS로 집계되는지 사전 확인 필요 — 실패 파일 존재 시 `expectedFailure` 추가 등록해야 함 (Plan-Plus 기본: Sprint 5a 실행 중 동적 처리)
6. **Q6**: 48h 관측 중 `.bkit/runtime/token-ledger.json`이 실제로 데이터 축적하는지 확인 필요 — recordTurn 호출이 정상인지. Ledger 생성 자체가 실패하면 ENH-264 실증 미완 (Plan-Plus 기본: Sprint 5a PR 생성 전 로컬 1회 smoke로 ledger 생성 확인)

---

## 18. 참고: 본 Plan-Plus 작성 근거

### 18.1 분석 에이전트 4개 병렬 결과 (2026-04-22)

1. **PM 문서 분석**: Plan 1,063 lines + Addendum 823 lines + Policy 372 lines + Design 2,645 lines 전량 정독. ENH 매핑·Sprint 정의·MoSCoW·리스크 15건 추출.
2. **QA/Report 분석**: QA 리포트 + 3 analysis + 4 report + 1 shipping QA 정독. Match Rate 4차 97.8%, TC 수치 3중 혼재, Gap 12건, 완료 주장별 신뢰도 평가.
3. **코드베이스 실측**: `find/grep/wc -l` + `node` 실행 9회. 123 lib modules / 26,296 LOC / 24 hook blocks / 21 guards / 96 test files / 3,583 TC (PASS 3,581).
4. **커밋 이력 분석**: `git log main..HEAD` 5 커밋, +14,016/-1,076, 각 Sprint별 주요 파일·주장 검증·리스크 신호 7건.

### 18.2 교차 검증 통과 주장

아래 주장은 4개 분석이 모두 일치하여 높은 신뢰도:
- Sprint 0~4.5 코드 실존 (95%+)
- audit-logger 682GB recursion fix 실행됨
- Guard Registry 21건 등록
- Docs=Code CI 0 drift 작동
- Invocation Contract 226 assertions baseline 존재
- Clean Architecture Domain layer 순수 (require fs/child_process/net 0건)

### 18.3 상호 충돌 주장 (본 Plan-Plus에서 해소)

- TC 총합 3,560 vs 2,520 vs 3,068 vs 실측 3,583 → **실측값 3,583 채택**, CHANGELOG에 범위 명시
- Sprint 0 baseline 195 vs 실측 94 → **실측 94 채택**, 커밋 메시지는 이미 머지된 상태로 과대 표기 인정
- Registry 21 vs Sprint 0 메시지 16 → **최종 21 채택** (Sprint 3에서 증가)

---

## 19. 다음 단계

본 Plan-Plus 승인 후 흐름:

1. **/pdca design bkit-v2110-gap-closure** — 본 Plan-Plus를 기반으로 3 옵션 아키텍처 비교(§4.1~§4.7 확장) + Module Map + Session Guide 생성
2. **/pdca do bkit-v2110-gap-closure --scope sprint-5a** — T1~T16 실행
3. **/pdca do bkit-v2110-gap-closure --scope sprint-5b** — T17~T20 실행
4. **[48h 관찰]** — T21~T23
5. **/pdca analyze bkit-v2110-gap-closure** — Match Rate 재측정 + gap-detector 5차
6. **/pdca report bkit-v2110-gap-closure** — T25 report.md 작성
7. **v2.1.10 태그 후 공식 완료 선언**

---

## 부록 A — 본 Plan-Plus의 Plan vs Plan-Plus 차별점 요약

| 항목 | 일반 Plan | 본 Plan-Plus |
|------|----------|-------------|
| 요구사항 도출 | 기능 나열 | 5 Hub 질문으로 intent 재검증 (§1.1) |
| 대안 탐색 | 단일안 | 7 gap cluster × 3 옵션 비교 (§4) |
| YAGNI 관리 | 묵시 | 명시적 18 후보 판정표 (§5) |
| 리스크 | 추상적 | 10 리스크 × Mitigation/Fallback (§10) |
| 검증 기준 | 성공 기준 나열 | D1~D8 측정 방법·통과 기준 (§11) |
| 문서/코드 정합 | 수동 | Invariant 매트릭스 + 단일 출처 선언 (§12) |
| Rollback | 생략 | Hotfix/Yank/중단 3 경로 (§13) |
| Checkpoint | 텍스트 | PDCA Checkpoint 1~5 명시 매핑 (§16) |
| Unresolved | 경우에 따라 | Q1~Q6 명시 질의 (§17) |

---

## 부록 B — ENH 번호 관리 (v2.1.10 최종)

### v2.1.10 범위 내 ENH (최종 확정)

| ENH | 제목 | 상태 | Sprint |
|-----|------|:---:|:------:|
| ENH-167 | BKIT_VERSION 중앙화 | ✅ (본 Plan-Plus 완결) | 5a |
| ENH-241 | Docs=Code 교차 검증 | ✅ (Sprint 4 완결) | 4 |
| ENH-254 | FORK_SUBAGENT + #51165 방어 | ✅ (Sprint 1 P0) | 1 |
| ENH-256 | Glob/Grep native 전수 grep | ✅ (본 Plan-Plus Sprint 5a) | 5a |
| ENH-259 | OTEL dual sink (ENH 한정적 달성) | ⚠️ (dualSink 회피, OtelSink 단독 사용) | 2 / 4.5 |
| ENH-262 | #51798 combo 방어 | ✅ | 1 |
| ENH-263 | #51801 `.claude/` write 방어 | ✅ | 1 |
| ENH-264 | per-turn 토큰 측정 | ⚠️ (recordTurn 연결, 48h 데이터 대기) | 4.5 / 관측 |

### v2.1.11+ 이월 ENH

| ENH | 제목 | 이월 사유 |
|-----|------|----------|
| ENH-202 | Skills `context: fork` 확대 | Sprint 6 P1 |
| ENH-247 | PreCompact 2주 실측 | 관측 시작 Sprint 5, 판정 Sprint 6 |
| ENH-257 | ENH-232 재평가 | 동일 |
| ENH-258 | managed-settings 가이드 | P3 수요 대기 |
| ENH-265 | Prompt Caching 1H 벤치마크 | 관측 지연 |

### v2.1.10 시점 신규 부여 ENH (Sprint 6+)

| ENH | 제목 | P |
|-----|------|:-:|
| ENH-275 | MCP stdio L3 런타임 러너 | P2 |
| ENH-276 | docs-code-scanner BKIT_VERSION 검증 확장 | P2 |

---

---

## 20. Scope Extension (2026-04-22 사용자 승인, §1~§19 override)

> **사용자 Checkpoint 2 답변 반영 버전**. Q1/Q2 답변으로 Plan-Plus 범위가 대폭 확장됨.

### 20.1 사용자 답변 요약

- **Q1 답변**: 본 브랜치 내에서 design → do → iterate(100%) → bkit 전체 기능 QA → 문서 동기화까지 **모두 완료**한 후 main에 PR 머지 + `git tag v2.1.10` + GitHub Release 노트. 즉 **태그·릴리스는 본 Plan-Plus 범위 바깥**. 현재 브랜치는 "릴리스 완결성 극대화" 단계.
- **Q2 답변**: Sprint 5.5 + Sprint 6 **전량 v2.1.10 범위로 편입**. Sprint 6 이월 항목을 v2.1.10 안에서 해결.

### 20.2 §5 YAGNI Review 재정의

§5 표의 다음 항목은 **"보류/FAIL"에서 "채택"으로 승격**:

| 후보 항목 | 원 판정 | 신규 판정 | 편입 Sprint |
|----------|:------:|:--------:|:----------:|
| ENH-202 Skills `context: fork` 확대 (1→8~10) | ⏸️ 보류 | ✅ **채택** | 6 |
| ENH-168 PermissionDenied hook 수용 | ⏸️ 보류 | ⏸️ **보류 유지** (CC Auto Mode GA 대기) | - |
| L5 E2E Playwright 5 scenarios | ⏸️ 보류 | ✅ **채택** | 6 |
| legacy 3개 모듈 제거 | ⏸️ 보류 | ✅ **채택** | 6 |
| MCP stdio L3 런타임 러너 (ENH-275) | ❌ FAIL | ✅ **채택** | 6 |
| `cc-bridge.js` 신설 (Port cc-payload Adapter) | 암시 | ✅ **채택** | 6 |
| `docs-code-scanner` BKIT_VERSION 확장 (ENH-276) | 이월 | ✅ **채택** | 6 |
| design.md 2,644 lines 재검증 체크리스트 | ⏸️ 보류 | ✅ **채택** (section split) | 6 |
| MEMORY.md 분해 (ENH-273) | ⏸️ 보류 | ✅ **채택** | 6 |
| Sprint 5.5 hook attribution 3곳 | 선택 | ✅ **필수** | 5.5 |
| CI domain ESLint step | 선택 | ✅ **필수** | 5.5 |
| ENH-244 `once:true` 기술부채 주석 | 채택 | ✅ **필수** | 5.5 |
| ENH-247 + ENH-257 counter 가동 | 채택 | ✅ **필수** | 5.5 |
| **유지 보류/FAIL** | | | |
| TypeScript 도입 | ❌ FAIL | ❌ **FAIL 유지** | - |
| 새 Domain Guard 추가 (v2.1.118+ hotfix 대기) | ❌ FAIL | ❌ **FAIL 유지** | - |
| `/tests/qa/` 디렉토리 이동 | ❌ FAIL | ❌ **FAIL 유지** | - |
| Slack/Discussion 공지 자동화 | ⏸️ 보류 | ⏸️ **보류 유지** | - |
| CTO Team static roster | ❌ FAIL | ❌ **FAIL 유지** (동적 유지) | - |
| 버전 bump 자동화 스크립트 | ❌ FAIL | ❌ **FAIL 유지** | - |

### 20.3 §7 MoSCoW 재구성 (v2.1.10 최종 범위)

**Must Have (Sprint 5a~6)** — 모든 항목이 v2.1.10 내 완료 필수:

| # | Requirement | Sprint | 비고 |
|---|-------------|:------:|------|
| M1~M7 | §7.1 기존 Must (release meta + 48h 관측 제외) | 5a, 5b | Tag/PR-머지는 제외(Q1) |
| S1~S6 | §7.2 기존 Should (승격) | 5a | 전량 필수화 |
| C1 | hook attribution 3곳 (unified-stop / session-end-handler / subagent-stop-handler) | 5.5 | G-W1 해소 |
| C2 | CI workflow에 `eslint lib/domain/ --rule no-restricted-imports` step | 5.5 | "Domain 의존성 0" CI gate |
| C3 | ENH-244 `once:true` 기술부채 주석 docs/context-engineering.md | 5.5 | G-D2 |
| C4 | ENH-247 + ENH-257 counter 가동 (PreCompact 발화 카운터) | 5.5 | 관찰 시작 |
| **NEW 6-1** | **ENH-202**: 8 skills에 `context: fork` 적용 (qa-phase, phase-1~9 우선 후보 → 실제 선정은 Design에서) | 6 | 1 → ≥8 |
| **NEW 6-2** | **legacy 3모듈 정리**: `hook-io.js`(10 LOC stub 제거), `ops-metrics.js`(150 LOC) 평가 후 제거 또는 core로 흡수, `deploy-state-machine.js`(261 LOC) 평가 후 제거 또는 pdca/state-machine.js로 흡수 | 6 | G-D1 |
| **NEW 6-3** | **cc-bridge.js 신설**: `lib/infra/cc-bridge.js` Adapter 구현 (cc-payload.port.js 구현체) + `hooks/session-start.js`에서 주입 | 6 | G-W2 완결 |
| **NEW 6-4** | **MCP stdio L3 런타임 러너** (ENH-275): `test/contract/l3-mcp-runtime.test.js` 신설 — 2 MCP 서버 자식 프로세스 기동 + tools/list/call 실 호출 비교 | 6 | G-C2 실증 |
| **NEW 6-5** | **L5 E2E Playwright** (ENH-233 재활성): `package.json` devDependency + `test/e2e/` 5 시나리오 + CI (optional) | 6 | G-C3 해소 |
| **NEW 6-6** | **docs-code-scanner BKIT_VERSION 확장** (ENH-276): `lib/infra/docs-code-scanner.js` + invariants에 BKIT_VERSION 검증 추가 | 6 | §12 invariant |
| **NEW 6-7** | **MEMORY.md 분해** (ENH-273): 291 lines → MEMORY.md(인덱스) + `memory/cc_version_history_v21xx.md`(버전 이력) + `memory/enh_backlog.md`(ENH 전체 목록) + `memory/mon_cc_tracker.md`(MON-CC 추적) 4파일 | 6 | G-D4 |
| **NEW 6-8** | **design.md 리팩토링** (section split): 2,644 lines → 메인 design.md(overview) + 5개 부록 파일(`design-addendum-{architecture,sprint,risks,invariants,guards}.md`) | 6 | G-D3 |
| **NEW 6-9** | **skills-overview.md v2.1.10 태그 정정** | 5a | §7.2 S2 세분화 |
| **NEW 6-10** | **CTO Team 문서 동적 매핑표** (README or CUSTOMIZATION-GUIDE §CTO Team section): strategy.js 기반 {3, 5} 프리셋 + MAX=10 기술 | 5a | G-CS6 |

**Should Have (v2.1.10 내 희망)**:
- docs-code-sync 의 description 필드 검증 강화 (plugin.json 수치 매칭 로직 추가)
- registry.js `expectedFix` 추가 seeding (현재 4건 → 최대 8건, 신뢰 가능한 expected만)

**Won't Have (v2.1.11+)**:
- TypeScript 도입
- 새 Domain Guard 추가
- Slack 공지 자동화
- CTO Team static roster 하드코딩
- 버전 bump 자동화 스크립트
- ENH-168 PermissionDenied hook 수용

### 20.4 §11 Success Criteria 확장 (D9~D15 추가)

§11 D1~D8 유지 + 다음 추가:

| # | Criterion | 측정 | 통과 |
|---|-----------|------|:---:|
| D9 | ENH-202 `context: fork` skill 수 | `grep -l "^context: fork" skills/*/SKILL.md \| wc -l` | ≥ 8 |
| D10 | legacy 3모듈 정리 | `ls lib/context/ops-metrics.js lib/core/hook-io.js lib/pdca/deploy-state-machine.js 2>&1 \| grep -c "No such"` | 3건 제거 또는 통합 |
| D11 | cc-bridge.js 존재 + 주입 | `ls lib/infra/cc-bridge.js && grep "cc-bridge" hooks/session-start.js` | 모두 확인 |
| D12 | MCP stdio L3 런타임 러너 | `node test/contract/l3-mcp-runtime.test.js` | exit 0 + tools 16 검증 |
| D13 | L5 E2E Playwright | `npx playwright test --list \| grep "tests/e2e"` | ≥ 5 시나리오 |
| D14 | docs-code-scanner BKIT_VERSION 검증 | `node scripts/docs-code-sync.js --verbose \| grep "BKIT_VERSION"` | "checked" 또는 유사 |
| D15 | MEMORY.md 분해 | `wc -l MEMORY.md` | ≤ 150 (인덱스) |
| D16 | design.md 리팩토링 | `wc -l docs/02-design/features/bkit-v2110-integrated-enhancement.design.md` | ≤ 800 (섹션 분리됨) |
| D17 | 전체 TC 증가 | `node test/contract/scripts/qa-aggregate.js` | ≥ 3,583 (기존 + 신규) |
| D18 | Match Rate (gap-detector) | `/pdca analyze bkit-v2110-gap-closure` | ≥ 98% |

**Release Gate (v2.1.10 브랜치 completion)**: D1~D7 ∧ D9~D18 (D8 48h 관찰은 tag 후 예정이므로 제외).

### 20.5 §16 Checkpoint 재정의 (사용자 답변 반영)

- **Checkpoint 1 (요구사항 확인)**: ✅ 완료 (사용자 Q1/Q2 답변)
- **Checkpoint 2 (Clarifying Questions)**: ✅ 완료 (본 §20)
- **Checkpoint 3 (Architecture Selection)**: §6 Minimal Changes 원칙에서 **"Minimal Changes + Structured Extension"**으로 수정. Sprint 5a/5b는 Minimal 유지, Sprint 5.5/6은 **구조 확장 허용** (단 Sprint 4.5 재귀 학습 적용: 새 adapter는 integration-runtime.test.js로 방어 필수)
- **Checkpoint 4 (Implementation Approval)**: 본 문서 승인 시 자동 진행
- **Checkpoint 5 (Review Decision)**: 각 Sprint 종료마다 iterate 호출

### 20.6 §17 Unresolved Questions 갱신

- Q1: ✅ 해결 (Release는 본 브랜치 완결 후)
- Q2: ✅ 해결 (Sprint 5.5 + 6 편입)
- Q3: `madge --circular` baseline — **보류** (Sprint 6 중 npm install 가능 시 시도, 불가 시 `check-deadcode.js` 수준으로 대체)
- Q4: cc-bridge.js — **Sprint 6 NEW 6-3에서 실제 구현**
- Q5: `tests/qa/` 13 파일 — **Sprint 5a 실행 중 동적 확인**
- Q6: `token-ledger.json` 축적 — **Sprint 5a 마지막에 로컬 smoke로 확인**

### 20.7 §14 Sprint 6 예비 범위 무효화

§14는 전량 §20.3 MoSCoW의 "NEW 6-1~6-10"으로 이동. 별도 처리 없음.

### 20.8 기여 범위 영향도 재평가

Plan-Plus 원안 + §20 편입 시 예상 공수:

| Sprint | 원안 공수 | §20 편입 후 공수 | 근거 |
|:------:|:--------:|:--------------:|------|
| 5a | 3h | 3h | 변동 없음 |
| 5b | 1h | 1h (tag 제외) | 태그 제거 |
| 5.5 | 3h (선택) | 3h (필수) | - |
| 6 (원안 이월) | 0h | **15~20h** | ENH-202 5h + legacy 3h + cc-bridge 2h + MCP 러너 3h + L5 4h + docs-scanner 2h + MEMORY 분해 1h + design 리팩 2h |
| Iterate | 1h | 2~3h | 범위 증가 |
| QA 전체 | 1h | 3h | L5 + MCP L3 runtime 추가 |
| 문서 동기화 | 1h | 2h | CHANGELOG 대폭 확장 |
| **총** | **~10h** | **~30~35h** | |

### 20.9 단일 세션 완결성 선언

본 Plan-Plus + §20은 사용자 요청 "v2.1.10의 Sprint 6.0까지 PR 머지를 통한 릴리즈 외에 모두 완벽하게 구현"에 대응하는 **공식 범위 정의 문서**이다. Design → Do → Iterate → QA → 문서 동기화까지 연속 세션으로 수행하며, 본 §20이 **최종 권한 있는 범위 정의**이다. 이후 §1~§19와 충돌 시 §20이 우선한다.

---

---

## 21. Workflow Orchestration Integrity (2026-04-22 후속 확장, §20 후속)

> 사용자가 "유기적 동작"의 정의를 **워크플로우 관점**(프롬프트 → Hook → Skill/Agent 자동 호출 → PDCA 전환 → Next Action → 팀 오케스트레이션 → Control Level)으로 재정의하고 **Phase 7(/pdca qa 전체 검증)**까지 포함해 **Sprint 7을 추가**한다.
> 근거: `docs/03-analysis/bkit-v2110-orchestration-integrity.analysis.md` (Phase B Gap Taxonomy, Phase A 4개 + Phase A+ 1개 = 5개 병렬 에이전트 실측 통합).
> 제약: **Invocation Contract 100% 보존**(skills/agents/commands 이름·slash 불변), frontmatter·description·본문·내부 wiring만 변경. Task tool 실제 spawn 경로 구현.

### 21.1 사용자 재정의 요약

- 원안 §1~§20은 **코드 레이어 유기성**(Port↔Adapter, Clean Arch, Docs=Code)에 집중.
- §21은 **UX 워크플로우 유기성**:
  1. 프롬프트 입력 → 의도 감지 → skill/agent 자동 호출
  2. Hook 라이프사이클 별 적절한 agent/template/skill 호출
  3. PDCA 사이클(PRD → Plan → Design → Do → Iterate(100%) → QA → Report) **Next Action 자동 제안 or Control Level 4 완전 자동**
  4. PM/CTO/QA Lead의 **실제 Task tool sub-agent spawn**
  5. Phase 7에서 `/pdca qa`로 bkit 전체 기능 유기적 동작 최종 검증

### 21.2 Sprint 7 범위 (§20에 추가 편입)

**7-axis Gap Taxonomy**: Journey(15) + Phase(14) + Team(13) + Control(15) + Frontmatter(7) + Import(3) + Dead/Legacy(5) = **72건**.

**P0 10건** (릴리스 블로커):
- **G-J-01**: `SKILL_TRIGGER_PATTERNS` 4 → ≥15 skills 확장 (pdca, pm-discovery, plan-plus, qa-phase, phase-1~9, code-review, deploy, rollback, skill-create, control 등)
- **G-J-03**: featureName 미추출 시에도 feature intent 힌트 주입 (threshold 0.7)
- **G-J-04**: agent-skill 힌트 경쟁 해결 규칙 (skill 우선, PDCA skill 최우선)
- **G-P-01**: matchRate threshold SSoT 통일 (`bkit.config.matchRateThreshold:90` 전역)
- **G-T-01**: `cto-lead.md` body에 Phase별 Task spawn 예시 추가 (pm-lead/qa-lead 패턴 복제)
- **G-T-02**: `cto-lead` frontmatter `Task(pm-lead)`, `Task(qa-lead)` 추가
- **G-T-03**: Enterprise teammates 숫자 SKILL.md 5→6 교정 + MEMORY "12명" 제거
- **G-C-01**: `trust-engine.syncToControlState` level 반영 경로 복원
- **G-C-02**: `autoEscalation`/`autoDowngrade`/`trustScoreEnabled` 실 연결
- **G-T-02 verification**: CTO runtime Task spawn L2 smoke TC

**P1 12건** (릴리스 전 권장):
- **G-J-05/06/07**: `unified-stop.js` + `session-end-handler.js` + `subagent-stop-handler.js` + 미등록 skill/agent의 Next Action 주입
- **G-J-09**: additionalContext 구조화 (`skillSuggestions`/`agentSuggestions` JSON)
- **G-J-10**: `ambiguityThreshold` config 연결 (하드코딩 0.7 제거)
- **G-P-02**: L0~L4 `GATE_CONFIG` hook 연결
- **G-P-10**: `report → archived` 자동 dispatcher (report-generator 완료 시 ARCHIVE)
- **G-P-13**: `doCompletionResult` 세터 (Do skill 완료 훅)
- **G-T-05**: `qa-monitor` qa-lead body 호출 경로
- **G-T-06**: `state-writer` lifecycle API 3 Lead agent 연결
- **G-C-04**: `guardrails.*` 설정 연결 (loopBreaker, destructiveDetection 우선)
- **G-C-08**: `executeFullAutoDo` stub → 실 agent dispatch
- **G-F-05**: Agents 18개 "Use proactively when…" 문구 추가

**P2~P3 50건** (cosmetic, 일괄):
- `@version 2.0.0` → 2.1.10 (lib 66 + scripts 13 = 79)
- Skills `user-invocable` 중복 선언 2건 정리
- `zero-script-qa` `allowed-tools` 명시
- bkend-expert description 축약 (1,203 → ≤800자)
- `lib/core/paths.js:78` `@deprecated v1.6.0` 정리

### 21.3 새 D-criteria (D19~D30, §20.4 추가)

| # | 기준 | 측정 | 목표 |
|---|------|------|:---:|
| D19 | Skill trigger coverage | `Object.keys(SKILL_TRIGGER_PATTERNS).length` | ≥ 15 |
| D20 | Feature intent 주입률 | 10 프롬프트 smoke | ≥ 8 |
| D21 | Agent-Skill resolver | 코드 + 우선순위 로그 | 구현됨 |
| D22 | matchRate threshold SSoT | `grep` 값 일관 | 90 only |
| D23 | cto-lead body Task 예시 | `grep "Task(" agents/cto-lead.md` | ≥ 5 |
| D24 | CTO teammates Task 선언 | pm-lead + qa-lead | Both |
| D25 | Enterprise teammates 수 | SKILL.md = strategy.js | 6 = 6 |
| D26 | Next Action 제안 범위 | 21 hook 중 emit 수 | ≥ 15 |
| D27 | L4 자동 체인 smoke | `/control level 4` 후 PDCA | ≤ 2 manual step |
| D28 | Trust Score level 반영 | recordEvent → control-state.json | 작동 |
| D29 | Agents "Use proactively" | 36 agents 중 문구 수 | ≥ 30 |
| D30 | Legacy `@version 2.0.0` | grep count | 0 |

**총 Release Gate D1~D30 중 25/30 충족 목표** (D3 CI PR green / D8 48h 관측 / D16 design 분할은 여전히 이월).

### 21.4 Sprint 7 Session Plan (Phase E Do 단계)

| 세션 | 범위 | 예상 |
|:----:|------|:---:|
| 7a | Team Orchestration (G-T 5건): cto-lead body + Task 선언 + state-writer 연결 | 4h |
| 7b | PDCA Phase Transition (G-P 4건): matchRate SSoT + GATE 연결 + ARCHIVE + DO_COMPLETE | 3h |
| 7c | User Journey (G-J 6건): SKILL pattern 확장 + threshold + resolver + 구조화 + Next Action 범위 | 5h |
| 7d | Control Level (G-C 4건): Trust Score 복원 + auto flags + executeFullAutoDo | 4h |
| 7e | Frontmatter + Dead code (G-F + G-D): @version 일괄 + 중복 필드 + proactive 문구 | 2h |
| Iterate | Workflow Integration TC + User Journey L5 확장 + Control L4 smoke | 3h |
| **QA (Phase 7 핵심)** | **/pdca qa — bkit 전체 유기적 동작 L1~L5 전수 검증** | 3h |
| 문서 동기화 | CHANGELOG v2.1.10 업데이트 + MEMORY + report | 1h |
| **합계** | | **~25h** |

### 21.5 리스크 R11~R15 (§10 확장)

| # | Risk | Sev | Prob | Mitigation |
|---|------|:---:|:----:|------------|
| R11 | CTO Team Task spawn 구조 변경이 기존 Agent Teams 세션 깨트림 | H | L | `isTeamModeAvailable()` 가드 유지 + prose-only fallback 명시 |
| R12 | `SKILL_TRIGGER_PATTERNS` 확장 후 false-positive auto-trigger (의도 없는 skill 호출) | M | M | Skill 임계 0.8 유지, 8-language 엄격, smoke test 10 프롬프트 |
| R13 | Trust Score auto level 변경으로 tool 권한 동적 변동 | H | L | `autoEscalation:false` 기본 유지, `autoDowngrade` 만 활성화 |
| R14 | `executeFullAutoDo` stub 해제 → Sprint 4.5 recursion 유형 사고 재발 | H | L | Integration runtime TC 방어선 + lazy require |
| R15 | @version 79건 일괄 교체가 Git diff 거대 PR 노이즈 | L | H | Sprint 7e 별도 커밋 분리 |

### 21.6 Phase 7 — 최종 유기적 동작 검증 (/pdca qa)

Sprint 7a~7e + Iterate 완료 후 **Phase 7**로 전환:
1. **Control Level 4로 승격**: `/control level 4`
2. **L5 User Journey 시나리오 10개** 실행:
   - "로그인 기능 만들어줘" → PM Team auto-invoke 검증
   - "이 코드 리뷰해줘" → code-analyzer agent 호출 검증
   - "프로덕트 기획해줘" → pm-discovery skill + pm-lead team 검증
   - "CTO Team으로 대규모 리팩토링" → cto-lead Task spawn 11개 sub-agent 검증
   - "QA 돌려봐" → qa-lead + qa-test-planner/generator/monitor 병렬 검증
   - "/pdca plan → design → do → iterate → qa → report" 전 체인 자동 검증
   - Trust Score level 자동 downgrade 시나리오
   - Ambiguous 프롬프트 AskUserQuestion fallback
   - Feature intent 자동 `/pdca pm` 제안
   - MCP servers 2종 runtime tools/list 연동 (L3 확장)
3. **qa-lead L1~L5 실행**:
   - L1 unit: 기존 3,741 TC
   - L2 API smoke: hook attribution + cc-bridge
   - L3 MCP stdio runtime (기존 42 TC)
   - L4 UX flow: Control Level 레벨별 tool permission 매트릭스
   - L5 User Journey E2E: 위 10 시나리오
4. **QA Report**: `docs/05-qa/bkit-v2110-orchestration-integrity.qa-report.md`
5. **Match Rate**: ≥ 98% 목표 (gap-detector 재실행)

### 21.7 단일 세션 완결성 선언 (§20.9 갱신)

본 Plan-Plus + §21은 사용자 요청 **"유기적 동작 워크플로우 전체 보강 + Phase 7 전체 검증"**에 대응하는 **최종 권한 있는 범위 정의**. §1~§20 + §21 충돌 시 §21 우선. Main PR merge + tag + Release 노트는 **Phase 7 /pdca qa 통과 후**만 진행.

---

**문서 끝.**

> 본 Plan-Plus는 v2.1.10 브랜치 `feat/v2110-integrated-enhancement`의 2026-04-22 17:00~20:00 KST 실측+재정의 데이터를 기반으로 작성되었으며, 사용자 Checkpoint 2 답변(§20)과 워크플로우 유기성 재정의(§21)를 반영했습니다. 본 문서 승인 시 `/pdca design bkit-v2110-orchestration-integrity`로 Phase D 진입.
