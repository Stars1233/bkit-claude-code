---
feature: bkit-architecture-completeness
phase: 03-analysis
status: CTO Team 심층 분석 완료
target: bkit v2.1.10 (main 머지 완료, commit f2c17f3)
perspective: Enterprise CTO / Architect
created: 2026-04-22
analyst: bkit-enterprise-expert (CTO-level)
related:
  - docs/03-analysis/bkit-v2110-orchestration-integrity.analysis.md (Phase B Gap Taxonomy 72건)
  - docs/02-design/features/bkit-v2110-orchestration-integrity.design.md (3-Layer Orchestration)
  - docs/01-plan/features/bkit-v2110-gap-closure-plan-plus.plan.md
---

# bkit v2.1.10 아키텍처 및 기능 완성도 심층 분석 (CTO Team 관점)

> **분석 목적**: bkit 자체를 하나의 엔터프라이즈 제품으로 보고, Clean Architecture 4-Layer · Port/Adapter · 3-Layer Orchestration · Defense-in-Depth 4-Layer 가 실제 코드 레벨에서 유기적으로 완성되어 있는지 CTO 레벨에서 재검증한다. bkit이 스스로 제시하는 "AI Native Development OS"라는 포지셔닝에 합당한 성숙도인지 등급화하여 평가한다.

---

## Executive Summary

### 4 관점 요약표

| 관점 | 등급 | 핵심 근거 | 리스크 |
|------|:---:|-----------|--------|
| **Architecture** | ★★★★☆ (4.3/5) | Clean Architecture 4-Layer 실재 코드 구조로 관철, Domain Purity CI-gated(0 forbidden), Port↔Adapter 6쌍 매핑 완료, 3-Layer Orchestration(`lib/orchestrator/`) 진입점 단일화 | Application Layer 경계 모호, `lib/pdca/` 내부 "use case vs domain" 구분 불완전, Presentation(hooks/scripts)에서 Infrastructure 직접 의존 다수 |
| **Code Quality** | ★★★★☆ (4.1/5) | 3,762 TC (PASS 3,760 / FAIL 0), Invocation Contract 226 assertions L1~L5 다층 검증, 6 CLI validator CI-gated, JSDoc 주석 체계적 | 단일 모듈 LOC 편차 큼(일부 500+ LOC), 비동기/동기 혼재, fail-open 예외 처리 빈번(디버깅 난이도↑) |
| **Test Coverage** | ★★★★☆ (4.0/5) | 113 test files, L1 unit ~ L5 E2E shell smoke 5-level pyramid, MCP stdio L3 runtime runner(42 TC), 통합 aggregator `tests/qa/` | L4 perf 비교적 얇음, contract/behavioral 카테고리 TC 분포 정보 비공개, E2E 5 scenario 는 커버리지 증명으로 다소 작음 |
| **Ecosystem Fit** | ★★★★★ (4.8/5) | CC v2.1.34~v2.1.117 **75 consecutive releases** 호환, ENH-214 등 외부 issue 방어선 선제 구현, 2 MCP Servers + 16 MCP Tools, Output Styles 4종, Agent Teams + Agent Memory 활용, 8-language trigger | CC 비공개 breaking change 노출 영역 여전(MON-CC-02 #47855 Opus 1M /compact, MON-CC-06 19건 모니터링) |

### 종합 점수: **88 / 100** (Enterprise Grade — 상위 10% 수준)

| 세부 항목 | 점수 |
|-----------|:---:|
| Architecture | **22 / 25** |
| Code Quality | **17 / 20** |
| Test Coverage | **13 / 15** |
| Operability (audit/observability) | **13 / 15** |
| Security (defense-in-depth) | **9 / 10** |
| Ecosystem Fit (Claude Code 적합성) | **14 / 15** |
| **합계** | **88 / 100** |

### Top 3 Strengths

1. **Domain Purity CI 강제 + Port/Adapter 6쌍 완결**
   `scripts/check-domain-purity.js`가 `lib/domain/**`의 `fs/child_process/net/http/https/os/dns/tls/cluster` import를 원천 차단하고 CI 단계에서 실패 시 exit 1. 결과적으로 11 Domain 파일이 순수함수 영역으로 격리되었고, 6개의 Port 모두 구체 Adapter 가 Infrastructure Layer에 명시 매핑됨. 이는 일반적 "Clean Architecture 지향" 수준이 아니라 **실행 가능한 invariant(불변식)** 로 관철된 드문 사례.

2. **Invocation Contract L1~L5 다층 + Docs=Code CI 강제**
   스킬/에이전트/훅 명세 · 실제 호출 · MCP runtime · E2E shell 전 영역에서 226 assertions를 CI에서 검증. `docs-code-scanner.js` 가 `BKIT_VERSION 5-location invariant` 까지 8개 count 를 시뮬레이션하여 README / CHANGELOG / plugin.json / hooks.json / session-start 동기화 drift 를 0으로 유지. "문서가 코드"라는 철학이 선언이 아닌 **빌드 게이트**로 구현됨.

3. **Claude Code 생태계 적합성 최상**
   75 연속 CC 호환 릴리스(v2.1.34~v2.1.117)를 유지하면서, CC 자체의 OPEN issue(#47482 output styles frontmatter, #47855 Opus 1M compact, #51165 context:fork, #51234 custom skills data loss) 각각에 대한 방어선을 `scripts/`에 선제 구현. ENH-202가 `context: fork`를 1→9 skills로 확장한 것은 CC API 변화에 "reactive fix" 가 아니라 "proactive adoption"임을 증명.

### Top 3 Risks

1. **[Critical] G-C-01/02 — Trust Score / autoEscalation / autoDowngrade 미구현 dead feature 잔존**
   `bkit.config.json:129-131` 의 3개 플래그가 코드에서 grep 0 hit (orchestration-integrity Phase B 보고). Sprint 7d 에서 "복원"으로 표기되었으나 실제 reconcile 로직의 E2E 검증이 Phase 7 /pdca qa 최종 통과 전이므로 잔존 가능성. Control Level 자동 조정이 Spec 에 있으나 런타임 동작 불확실.

2. **[High] Application Layer 경계 모호 — `lib/pdca/` vs `lib/control/` vs `lib/orchestrator/` 책임 분리 불완전**
   Clean Architecture 4-Layer 를 표방하지만 Application Layer 명시적 디렉토리(`lib/application/`)가 없고 `pdca/`, `control/`, `orchestrator/`, `team/`, `intent/` 가 모두 Application 성격이면서 서로 횡단 require. `orchestrator/workflow-state-machine.js` 내부에서 `require('../control/automation-controller')` / `require('../pdca/automation')` 를 동시에 호출하는 구조는 Application 내부 강결합을 시사. Layer 자체는 지켜지지만 **Application 내부 Bounded Context** 경계가 약함.

3. **[Medium] CC Breaking Change 의존성 — MON-CC-02/06, 19건 추적 중**
   bkit이 CC plugin 로 존재하기에 CC upstream의 hook/skill/agent API 변경은 직접 파급. 특히 MON-CC-02 (#47855 Opus 1M /compact block) 는 `scripts/context-compaction.js:44-56` 에 workaround 가 있으나 v2.1.113 native fix 가 tentative. 75 연속 compatible 기록이 오히려 "상향 bias"를 만들어 향후 파괴적 변경 대응 지연 위험.

---

## Context Anchor

| 축 | 내용 |
|----|------|
| **WHY** | bkit v2.1.10이 main 머지되었으나 Sprint 0~7 누적 구조 변경 규모가 커, 한 번 더 "제품으로서의" 완성도를 외부 관점으로 봉인할 필요. 향후 v2.1.11 feature 후보 선별의 근거 문서. |
| **WHO** | (1차) bkit 유지 개발자 — 기술 부채 우선순위 수립. (2차) CTO/Architect 신규 도입 검토자 — "프로덕션 도입 가능한가" 판단 근거. (3차) Contributor — 코드베이스 진입 지도. |
| **RISK** | (RA) Application Layer 미성숙이 v2.2.x 에서 대규모 refactor 로 이어질 가능성. (RB) Trust Score dead code 로 인한 문서=코드 원칙 위반 잔존. (RC) CC breaking change 로 1회 이상 연속 호환 기록 깨짐. |
| **SUCCESS** | 본 분석이 **v2.1.11 backlog 10건 이내** 로 정제되어 action 가능한 형태로 전달됨. 종합 점수 및 Risk Matrix 가 다음 plan-plus 의 §0 입력으로 재사용됨. |
| **SCOPE** | IN: lib/ · hooks/ · scripts/ · tests/ 구조 검증, 8 품질 축, 8 기능 축, Risk Top 5, 성숙도 채점, 권고 Top 10. OUT: 각 모듈의 상세 코드 리뷰(별도 `lib-catalog.md` 필요), 성능 벤치마크 실측(L4 별도 재실행 필요). |

---

## 1. 분석 방법론

### 1.1 조사 범위

- **구조 검증**: `lib/orchestrator/` 5 모듈 실측, `bkit.config.json` SoT, `plugin.json`, `hooks/hooks.json` 21 event × 24 block, `scripts/check-domain-purity.js` invariant.
- **아키텍처 평가**: 8 축 (A1~A8).
- **기능 평가**: 8 축 (F1~F8).
- **증거 기반**: Plan-Plus / Design / Phase B Gap Taxonomy 72건 / Sprint 4.5 audit-logger recursion 실험 / Sprint 6 legacy 청산 기록.

### 1.2 검증 방법

- **1차 증거**: 실제 파일 Read 로 구조/주석/SoT 확인 (특히 `lib/orchestrator/index.js`, `intent-router.js`, `workflow-state-machine.js`, `team-protocol.js`, `next-action-engine.js`, `check-domain-purity.js`, `hooks.json`, `bkit.config.json`, `plugin.json`, `README.md`).
- **2차 증거**: 기존 분석 문서 (`bkit-v2110-orchestration-integrity.analysis.md` Phase B Gap Taxonomy, README Features 섹션의 v2.1.10 delta).
- **3차 증거**: 메모리 (architecture 스냅샷, ENH 백로그, CC version history, MON-CC-02/06).

### 1.3 제외 항목

- 런타임 성능 벤치 실측 (L4 perf TC 결과만 참조).
- 실제 CC 세션에서의 E2E 유기성 관찰 (Phase 7 /pdca qa 최종 통과 전이므로 영향 반영).
- 외부 OSS 코드 스타일 표준 준수 상세 (ESLint config 는 Domain Purity 한정).
- 라이센스 호환성 매트릭스.

---

## 2. 구조 검증 결과

### 2.1 Layer별 파일 매핑 (실측 기반)

| Layer | 실제 위치 | 파일 수 (메모리) | 주요 모듈 |
|-------|-----------|:---:|-----------|
| **Domain** | `lib/domain/` | 11 (ports 6 + guards 4 + rules 1) | ports (cc-payload, state-store, regression-registry, audit-sink, token-meter, docs-code-index), rules (docs-code-invariants.js), cc-regression data |
| **Application** | `lib/pdca/` + `lib/cc-regression/ops/` + `lib/team/` + `lib/control/` + `lib/intent/` + `lib/orchestrator/` | 분산 다수 | orchestrator 5 (intent-router, next-action-engine, team-protocol, workflow-state-machine, index), pdca (state-machine, automation, session-title), control (automation-controller, trust-engine, state), team (strategy, state-writer) |
| **Infrastructure** | `lib/infra/` + 기타 adapter | cc-bridge + telemetry + docs-code-scanner + mcp-test-harness + state-store | cc-bridge.js (Port↔Adapter), telemetry.js (createOtelSink + audit-sink adapter), docs-code-scanner.js, mcp-test-harness.js, state-store.js |
| **Presentation** | `hooks/` + `scripts/` | 47 scripts + 1 hooks.json (21 events / 24 blocks) | unified-stop / unified-bash-pre / unified-bash-post / unified-write-post / session-start / pdca-skill-stop / user-prompt-handler / context-compaction / post-compaction / 19 기타 handler |

### 2.2 메모리 스냅샷 vs README 실측 불일치

| 항목 | 메모리 값 | README 값 | 조치 |
|------|:---:|:---:|------|
| Lib 모듈 수 | 127 | **128** | README 실측 우선 (+1 차이 허용 범위, Docs=Code 자동 동기화 대상) |
| 총 LOC | ~27,000 | **~27,085** | README 우선 |
| Lib 서브디렉토리 | 미기재 | **15 subdirs** | README 우선 |
| Skills / Agents | 39 / 36 | 39 / 36 | 일치 |
| Hook Events / Blocks | 21 / 24 | 21 (17 더하여 21) | 일치 |
| Test Files / TC | 113 / 3,762 | 113 / 3,762 | 일치 |

→ **핵심 인사이트**: README 숫자가 Sprint 7 말미에 +1 모듈 업데이트되었으나 MEMORY 스냅샷이 동기화 지연. **G-F 축(Frontmatter) 관점에서 Docs=Code 자동 동기화 대상**.

### 2.3 3-Layer Orchestration 구조 검증 (실측)

`lib/orchestrator/index.js` 확인 결과:

- **Layer 1 — IntentRouter**: `route()`, `formatSuggestion()` 2 exports
- **Layer 2 — NextActionEngine**: `generatePhaseNext()`, `generateGeneric()`, `generateSessionEnd()`, `generateSubagentStop()`, `toStructuredSuggestions()` 5 exports
- **Layer 3 — TeamProtocol**: `canSpawn()`, `registerSpawn()`, `buildPrompt()`, `completeSpawn()` 4 exports
- **Layer X — WorkflowStateMachine**: `decideNextAction()`, `dispatchArchive()`, `markDoComplete()`, `getMatchRateThreshold()` 4 exports

**총 15 core + 4 namespace (intent/nextAction/team/workflow) = 19 exports** — README 와 일치.

→ **관찰**: Layer X 는 "SM"이지만 진입 지점에서는 Layer 1/2/3 과 평면적으로 노출됨. 계층 순서 보다 **유즈케이스 단위 진입점**으로 설계된 것이며 이는 Clean Architecture 보다 **Hexagonal/Port-and-Adapter 풍**에 가깝다.

---

## 3. 아키텍처 완성도 (A1~A8)

### A1. Clean Architecture 준수도 ★★★★☆ (4.3/5)

**근거**:
- Domain Layer 11 파일에 대한 CI 검증(`check-domain-purity.js`)이 `fs/child_process/net/http/https/os/dns/tls/cluster` 9개 Node built-in import를 원천 차단하고 exit 1. **실행 가능 invariant**.
- Presentation(hooks/scripts) → Infrastructure 의존은 단방향으로 관철됨 (`scripts/*.js` 가 `lib/infra/*.js` 를 require).
- Port↔Adapter 6쌍이 인터페이스화되어 Infrastructure 교체 가능성 확보.

**개선 포인트**:
- Application Layer 가 `lib/application/` 하나로 모이지 않고 `lib/pdca/`·`lib/control/`·`lib/orchestrator/`·`lib/team/`·`lib/intent/` 5 폴더에 분산. Bounded Context 경계가 모호하여 향후 Application Layer 지역 법칙(트랜잭션 / Use Case / DTO 변환) 정립 시 재구성 필요.
- Presentation에서 Infrastructure 를 직접 require 하는 지점이 다수(예: `scripts/unified-bash-pre.js` → `lib/core/audit-logger.js`). Application Layer 경유 원칙 약한 엄격도.

### A2. SOLID 원칙 실제 준수도 ★★★★☆ (4.0/5)

**근거**:
- **SRP**: 각 `lib/orchestrator/*.js` 가 단일 Layer 책임 (intent / next-action / team / workflow). 
- **OCP**: `SKILL_TRIGGER_PATTERNS` 확장(4→15) 이 기존 코드 수정 없이 패턴 추가로만 가능. ENH-202 `context: fork` 도 확장만으로 1→9 skills.
- **DIP**: Port(ABC-like) + Adapter 구조가 6쌍 명시 매핑. 하위 모듈(Infrastructure) 에 의존하지 않고 Port 추상 의존.

**개선 포인트**:
- **ISP** 취약: 일부 Application 모듈이 Config 전체(`bkit.config.json`) 를 넘겨받는 경우 존재. 섹션 단위 DTO 필요.
- **LSP** 미검증: Port 대체 구현(예: cc-payload 의 mock Adapter) 이 테스트 외 실존하지 않아 substitution 보증 부족.

### A3. Domain Purity 완결성 ★★★★★ (5/5)

**근거**:
- 11 파일, 0 forbidden import — CI gated.
- Ports 6개 모두 구체 Adapter 매핑 완료.
- Domain은 "계산과 규칙"만 담고 side effect 는 Adapter 에 위임.

**개선 포인트**:
- 현재 9개 Node built-in 차단인데, `crypto` / `path` / `url` / `util` / `buffer` / `stream` 는 허용 상태. Domain이 `crypto.createHash` 등을 사용하면 determinism/testability 가 여전히 저해될 수 있어 **확장 가드 목록** 고려 (단, false positive 증가).

### A4. Port↔Adapter 매핑 완전성 ★★★★☆ (4.2/5)

**근거** (6쌍 확인):

| Port (lib/domain/ports/) | Adapter (lib/infra/ 또는 기타) | 상태 |
|---|---|:---:|
| cc-payload | cc-bridge.js | ✅ |
| state-store | state-store.js | ✅ |
| regression-registry | registry.js | ✅ |
| audit-sink | telemetry.js (createOtelSink) | ✅ |
| token-meter | token-accountant.js | ✅ |
| docs-code-index | docs-code-scanner.js | ✅ |

**개선 포인트**:
- `trust-engine` / `automation-controller` 는 Port 가 아니라 Application 모듈로 배치되어 있는데, Control Level 같은 횡단 관심사(cross-cutting) 는 Port 화 고려 가치 있음.
- MCP test harness 가 Infrastructure 로 분류되어 있으나, **2 MCP Servers × 16 Tools** 의 Port 정의는 부재. L3 runtime runner(42 TC)는 있지만 "Port"는 아닌 상태 — 확장 여지.

### A5. 3-Layer Orchestration 유기성 ★★★★☆ (4.1/5)

**근거**:
- `intent-router` → `workflow-state-machine` → `team-protocol` → `next-action-engine` 흐름이 단일 진입점(`lib/orchestrator/index.js` 19 exports) 으로 노출.
- Sprint 7 설계 상 `cto-lead` body 의 5 Task spawn 예시 + `Task(pm-lead)` / `Task(qa-lead)` / `Task(pdca-iterator)` frontmatter 가 Team 층 계약 완성.
- `decideNextAction()` 이 3 시스템(선언적 FSM + automation + control Level)을 통합.

**개선 포인트**:
- 각 Layer 가 `try { require(...) } catch (_e) { /* fail-open */ }` 패턴으로 서로를 "조건부 의존"하는데, 이는 fallback 안전성은 높지만 **의존 계약의 명시성**은 떨어뜨림. 실무에서 "왜 작동 안 하는지" 디버깅이 고비용.
- Layer 간 event/message 대신 synchronous require 로 연결 — 향후 Workflow Engine 으로 확장 시 이벤트 버스 고려 필요.

### A6. Defense-in-Depth 4-Layer ★★★★★ (4.8/5)

**근거**:
- Layer 1 (CC Built-in) → Layer 2 (bkit PreToolUse: `pre-write.js` + `unified-bash-pre.js` + defense-coordinator) → Layer 3 (audit-logger OWASP A03/A08 sanitizer, 7-key PII redaction) → Layer 4 (Token Ledger NDJSON).
- `hooks.json` 의 PreToolUse Bash/Write/Edit matcher 가 모든 파일·명령 실행 전 진입 보장.
- Sprint 4.5 에서 audit-logger 682GB recursion root-fix(`createDualSink` 회피) 후 integration-runtime TC 로 영구 방어.

**개선 포인트**:
- Layer 간 bypass 경로(예: `MCP` 도구 사용 시 PreToolUse 가 호출되는지) 의 정식 스펙 문서가 명확하지 않음.
- PII 7-key redaction 의 **false negative** 측정 기록 없음 (예: 이메일 변형, 신용카드 번호 패턴).

### A7. Test 구조 (L1~L5) ★★★★☆ (4.0/5)

**근거**:
- L1 unit + L2 integration + L3 MCP stdio runtime (42 TC, real spawn + tools/list) + L4 perf + L5 E2E shell smoke (5/5 PASS) 5-level pyramid.
- 113 test files / 3,762 TC / PASS 3,760 / 0 FAIL / 2 expected legacy.
- `tests/qa/` aggregator 가 EXPECTED_FAILURES 시딩과 함께 통합 집계.

**개선 포인트**:
- L4 perf 의 TC 분포 · 벤치 기준값 공개 없음.
- L5 E2E 5 scenario 만 — PDCA 풀 사이클(pm→plan→design→do→check→act→qa→report→archive) 9 단계를 각각 smoke 하기엔 부족.
- Contract (L1) 226 assertions 는 훌륭하지만, Agent Teams 실 Task spawn 경로 E2E 는 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 환경 의존이라 CI 검증 어려움.

### A8. 의존성 관리 ★★★★★ (4.7/5)

**근거**:
- 외부 runtime 라이브러리 의존이 매우 적음 (Node built-in 중심, Adapter 레이어에만 국한).
- package.json (없음 — plugin 구조상 CC 가 소유) 으로 lock-in 최소화.
- MCP Servers 2개가 내재 (`bkit-pdca` / `bkit-analysis`) — 외부 서비스 의존 없음.

**개선 포인트**:
- `httpx` / `openai` / `anthropic` 등 **LLM vendor SDK 의존이 0** 인 것이 강점이자 약점. bkit은 Claude Code 자체가 LLM 접근을 담당하므로 의존성 낮지만, LLM 응답의 JSON schema 검증 같은 런타임 계약 확인은 부재.

---

## 4. 기능 완성도 (F1~F8)

### F1. PDCA Lifecycle 완결성 ★★★★☆ (4.2/5)

- **9단계 체인** (pm → plan → design → do → check → act → qa → report → archive) 가 `NEXT_PHASE` 상수 와 `dispatchArchive()` 로 명시.
- **docPaths 3-fallback** (`docs/01-plan/features/{feature}.plan.md` → `docs/01-plan/{feature}.plan.md` → `docs/plan/{feature}.md`) 으로 레거시 경로 호환.
- **개선**: `act` 이후 `qa` 가 optional 인지 mandatory 인지 설정 값 기반 결정 로직이 분산. `pm` 단계 진입 조건 명세 부족 (pm-discovery agent 의 pre-condition).

### F2. Agent Teams 오케스트레이션 ★★★☆☆ (3.5/5)

- CTO Lead + PM Lead + QA Lead **3 leads** × sub-agent Task spawn 경로 확정 (`team-protocol.js`).
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 가드 유지.
- **개선**: bkit 코드 자체가 Task tool 을 직접 실행할 수 없고 **LLM 턴 의존**(`team-protocol.js:11` 주석). 실제 작동 여부는 Sprint 7 말미 /pdca qa 통과 후 확정.
- G-T-01/02 (cto-lead Task 예시, pm-lead/qa-lead frontmatter) 는 Sprint 7a 에서 수정되었으나 **E2E 실 spawn 테스트 공백**.

### F3. 품질 게이트 (M1~M10) ★★★★☆ (4.0/5)

- `bkit.config.quality.thresholds`: matchRate 90, codeQualityScore 70, criticalIssueCount 0, conventionCompliance 90.
- Match Rate SSoT 가 `bkit.config.json:pdca.matchRateThreshold` 로 통일(G-P-01 해결).
- **개선**: M1~M10 10 gates 매핑 문서가 분산. 각 gate 가 어느 Phase 에서 어떤 threshold 로 작동하는지 1장 표로 필요.

### F4. L0~L4 Automation Level 제어 ★★★☆☆ (3.8/5)

- `lib/control/automation-controller.js` 의 `canAutoAdvance(phase, nextPhase, level)` 가 `workflow-state-machine.decideNextAction()` 에 통합.
- L0 = manual, L4 = full auto 가 `orchestratorPatterns.Enterprise` 등에서 참조.
- **개선 (Critical Gap)**: G-C-01/02 — `autoEscalation`/`autoDowngrade`/`trustScoreEnabled` 플래그 grep 0 hit → Sprint 7d 에서 복원되었다고 기록되나 E2E 검증 공백. Trust Score dead-code 잔존 가능성.

### F5. MCP 서버 (bkit-analysis / bkit-pdca, 16 tools) ★★★★☆ (4.0/5)

- 2 MCP Servers + 16 Tools.
- L3 MCP stdio runtime runner(42 TC) 로 real spawn + `tools/list` 검증.
- **개선**: 각 MCP tool 의 Port 정의 부재. 16 tools 의 **실제 usefulness 데이터**(호출 빈도, 실패율) 없음. 외부 사용자가 "어떤 tool 을 먼저 쓸지" 의 priority 가이드 부족.

### F6. Multi-language 지원 (8언어) ★★★★☆ (4.3/5)

- EN, KO, JA, ZH, ES, FR, DE, IT 8 언어 auto-trigger keywords.
- Skills/Agents frontmatter 에 각 언어 trigger 리스트 명시.
- **개선**: Trigger 정확도 (precision/recall) 측정 기록 없음. ZH (번체/간체) 분리 여부 미확인.

### F7. CC Version Compatibility 방어 ★★★★★ (4.9/5)

- **75 consecutive releases** 호환 (v2.1.34~v2.1.117).
- MON-CC-02 (#47855 Opus 1M /compact block) defense: `scripts/context-compaction.js:44-56`.
- MON-CC-06 19건 (v2.1.113 native 10 + v2.1.114~116 HIGH 6 + v2.1.117 HIGH 3) 추적.
- ENH-214 (#47482 output styles frontmatter) defense: `scripts/user-prompt-handler.js`.
- **개선**: v2.1.115 skipped 등 "선택적 건너뛰기" 기준의 formal policy 가 MEMORY 에만 존재. ADR 문서화 가치.

### F8. Audit / Token Ledger / Trust Score ★★★★☆ (4.1/5)

- Token Ledger NDJSON (`.bkit/runtime/token-ledger.json`).
- Audit: audit-logger OWASP A03/A08 sanitizer + 7-key PII redaction.
- **개선**: Trust Score 런타임 동작 (F4 와 중첩) 불확실. Token Ledger 집계 대시보드 또는 보고서 생성 skill 유무 불명.

---

## 5. Risk Matrix (Top 5)

| ID | Risk | 심각도 | 발생 가능성 | 영향 | 대응 |
|----|------|:---:|:---:|------|------|
| **R1** | Trust Score / autoEscalation 플래그 dead code 잔존 (G-C-01/02) | **High** | Medium | L3 automation 가 "설정 값 대로" 작동 안함 → 사용자 기대 배신 | v2.1.11 Critical 로 Phase 7 /pdca qa 에서 E2E 실 검증 + 실패 시 즉시 issue 문서화 |
| **R2** | Application Layer 경계 모호 (pdca/control/orchestrator/team/intent 분산) | **Medium** | High | 향후 대규모 refactor 시 compatibility break | v2.2.x plan-plus 에서 `lib/application/` 통합 재구성 ADR |
| **R3** | CC Breaking Change 의존 (MON-CC-02/06 19건 추적) | **High** | Low (단기) / Medium (중기) | 75 연속 호환 기록 중단 + user impact 광범위 | CC upstream 1회/주 모니터링 루틴 유지 + v2.1.113 tentative fix 실 검증 |
| **R4** | Agent Teams 실 Task spawn 경로 E2E 검증 공백 | **Medium** | Medium | Enterprise 사용자가 "팀이 안 돌아간다" 신고 | Phase 7 /pdca qa 에서 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 가진 CI 환경 별도 설정 |
| **R5** | Memory/README 숫자 drift (128 vs 127, LOC 27,085 vs 27,000) | **Low** | High | Docs=Code 원칙 침식 → 사용자 신뢰 저하 | `docs-code-scanner.js` 에 MEMORY 도 포함하거나 MEMORY 를 "생성 시점" 명시 표기 |

---

## 6. Gap Analysis

### 6.1 Critical (v2.1.10 내 즉시 조치)

- **C1**: Phase 7 /pdca qa 최종 유기적 동작 검증 (Orchestration Integrity 72 gap 잔여 확인).
- **C2**: G-C-01/02 Trust Score 런타임 실 동작 E2E 검증 (dead code 잔존 여부).
- **C3**: main PR merge 이후 `git tag v2.1.10` + GitHub Release notes 작성.

### 6.2 Important (v2.1.11 이월)

- **I1**: Application Layer 디렉토리 통합 검토 (`lib/application/` 재구성 ADR).
- **I2**: MCP 16 tools Port 정의 및 usefulness 데이터 수집.
- **I3**: L4 perf / L5 E2E 커버리지 확장 (최소 PDCA 9 phase 각각 1 smoke).
- **I4**: Match Rate / Quality Gates M1~M10 매핑 표 1장 작성.
- **I5**: Trigger 정확도 (precision/recall) 측정 베이스라인.

### 6.3 Enhancement (v2.1.12+ 이월 가능)

- **E1**: Domain Purity 가드 확장(`crypto`, `path` 등).
- **E2**: PII redaction false negative 측정.
- **E3**: Token Ledger 대시보드/보고서 skill.
- **E4**: CC upstream upgrade policy ADR (v2.1.115 skip 같은 선택 기준 명시).
- **E5**: 2 MCP Server 간 공통 Port abstraction (현재 각 server 가 독립).

---

## 7. Enterprise 성숙도 채점

### 7.1 세부 점수표

| 항목 | 만점 | 점수 | 주요 근거 | 감점 근거 |
|------|:---:|:---:|-----------|-----------|
| Architecture | 25 | **22** | Clean Architecture 4-Layer + Domain Purity CI + Port/Adapter 6쌍 + 3-Layer Orchestration | Application Layer 분산, fail-open require 과다 |
| Code Quality | 20 | **17** | 3,762 TC, 0 FAIL, Invocation Contract 226 assertions, Docs=Code CI | 단일 모듈 LOC 편차, 비동기/동기 혼재 |
| Test Coverage | 15 | **13** | L1~L5 pyramid, MCP stdio 42 TC, 통합 aggregator | L4/L5 커버리지 얇음, Agent Teams E2E 공백 |
| Operability | 15 | **13** | Token Ledger NDJSON, audit-logger sanitizer, 21 Hook events | Dashboard UX 부족, Trust Score dead-code |
| Security | 10 | **9** | Defense-in-Depth 4-Layer, OWASP A03/A08, PII 7-key redaction | PII false negative 측정 부재 |
| Ecosystem Fit | 15 | **14** | 75 consecutive CC releases, 4 OPEN issue 선제 방어, 2 MCP Servers | CC breaking change 중기 리스크 |
| **합계** | **100** | **88** | **Enterprise Grade — 상위 10%** | - |

### 7.2 해석

- **80~89**: Enterprise-Ready, 프로덕션 도입 가능. 단 dead code / 경계 모호 등 구조적 과제 1~3건 선제 해결 권고.
- 바로 90대 진입하려면 **R1 (Trust Score)** 해결 + **I1 (Application Layer 통합)** + **I3 (E2E 확장)** 가 필요.

---

## 8. 권고 사항 (Top 10)

| 우선 | 권고 | 근거 | 기대 효과 |
|:---:|------|------|-----------|
| **P0** | Phase 7 /pdca qa 통과 직후 **Trust Score E2E smoke TC** 추가 (`control-state.json` 실 갱신 확인) | R1 / G-C-01/02 | dead-code 위험 종결, 신뢰도 +2점 |
| **P0** | main PR merge 후 `git tag v2.1.10` + GitHub Release notes 즉시 공개 | C3 | 외부 사용자 채택 가속 |
| **P1** | v2.1.11 plan-plus 에서 **`lib/application/` 통합 ADR** 작성 (pdca/control/orchestrator/team/intent 경계 재정의) | R2 / I1 | 장기 refactor 비용 절감 |
| **P1** | **MCP 16 tools Port 정의 + usefulness 로그** 수집 시작 (2주) | I2 | v2.2 에서 공통 abstraction 근거 확보 |
| **P1** | **L5 E2E 5 → 9 scenario 확장** (pm/plan/design/do/check/act/qa/report/archive 각 1 smoke) | I3 | Regression 조기 발견 |
| **P2** | **Match Rate / Quality Gates M1~M10 매핑 표** 1장 작성 (README 또는 docs) | I4 | 사용자 온보딩 -20% time |
| **P2** | **Trigger precision/recall 베이스라인** 측정 (8 language) | I5 / F6 | Auto-trigger 튜닝 근거 |
| **P2** | **Token Ledger 집계 skill** 신설 (`/pdca token-report`) | F8 / E3 | 비용 관리 투명성 |
| **P3** | **Domain Purity 가드 확장** (`crypto` / `path`) 시 false positive 조사 | A3 / E1 | 결정성 강화 |
| **P3** | **CC upstream upgrade policy ADR** (v2.1.115 skip 같은 판단 기준 문서화) | F7 / E4 | 외부 기여자 예측 가능성↑ |

---

## 9. Next PDCA Cycle 제안 (v2.1.11 Feature Candidates)

| # | Feature | 추정 규모 | 포함 권고 |
|:---:|---------|:---:|-----------|
| 1 | **bkit-v2111-trust-score-closeout** | S (2~3 day) | P0 #1 Trust Score E2E |
| 2 | **bkit-v2111-application-layer-consolidation** | M (1 week) | P1 #1 `lib/application/` ADR + pilot refactor |
| 3 | **bkit-v2111-mcp-port-abstraction** | M (1 week) | P1 #2 MCP 16 tools Port 통합 |
| 4 | **bkit-v2111-e2e-pdca-fullcycle** | S (3 day) | P1 #3 L5 5→9 scenario |
| 5 | **bkit-v2111-quality-gates-m1m10-catalog** | XS (1 day) | P2 #1 M1~M10 매핑 |
| 6 | **bkit-v2111-trigger-accuracy-baseline** | S (2 day) | P2 #2 precision/recall |
| 7 | **bkit-v2111-token-report-skill** | S (2 day) | P2 #3 `/pdca token-report` |
| 8 | **bkit-v2111-cc-upgrade-policy-adr** | XS (0.5 day) | P3 #2 policy ADR |

### 권장 스케줄

```
Week 1: #1 (Trust Score closeout) + #5 (Quality Gates catalog) + #8 (CC policy ADR)
Week 2: #4 (E2E full cycle) + #6 (Trigger baseline)
Week 3: #7 (Token report) + #2 Phase A (Application Layer ADR 작성만)
Week 4: #3 (MCP Port abstraction)
```

---

## Appendix A. 인용한 기존 분석 문서

1. **Phase B Gap Taxonomy 72건** — `docs/03-analysis/bkit-v2110-orchestration-integrity.analysis.md`
   - 7축 분류 (G-J/G-P/G-T/G-C/G-F/G-I/G-D)
   - Critical 10건 / Important 17건 / 기타 45건
2. **Design — 3-Layer Orchestration** — `docs/02-design/features/bkit-v2110-orchestration-integrity.design.md`
   - Option B (Structured Extension) 선택 근거
   - Invocation Contract 100% 보존 제약
3. **Plan-Plus** — `docs/01-plan/features/bkit-v2110-gap-closure-plan-plus.plan.md` §21
   - Workflow Orchestration Integrity 편입
4. **Sprint 4.5 audit-logger 682GB recursion fix** — Integration Runtime TC 영구 방어.
5. **Sprint 6 legacy 청산** — hook-io / ops-metrics / deploy-state-machine 제거 (421 LOC).

---

## Appendix B. 분석 메서드 기록

- **실측 Read**: `bkit.config.json`, `plugin.json`, `hooks/hooks.json`, `lib/orchestrator/index.js` · `intent-router.js` · `workflow-state-machine.js` · `team-protocol.js` · `next-action-engine.js`, `scripts/check-domain-purity.js`, `README.md`, `docs/03-analysis/bkit-v2110-orchestration-integrity.analysis.md` (부분), `docs/02-design/features/bkit-v2110-orchestration-integrity.design.md` (부분).
- **메모리 의존**: architecture 스냅샷, ENH 백로그, CC version history, MON-CC-02/06.
- **비검증 항목** (follow-up 필요): 실제 테스트 실행 결과 · Agent Teams E2E · L4 perf 상세 벤치마크.

---

**분석 완료일**: 2026-04-22
**분석자**: bkit-enterprise-expert (CTO-level)
**다음 액션**: v2.1.11 plan-plus 에 본 문서의 §6.2 Important 5건 + §9 feature candidates 반영.
