# PRD: bkit PDCA QA Phase Integration

> **Feature**: bkit-v211-qa-phase-integration
> **Version**: bkit v2.1.1
> **작성자**: Claude Opus 4.6 (PM Agent)
> **날짜**: 2026-04-08
> **상태**: Draft

---

## 1. Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | bkit PDCA 사이클에 전문 QA phase가 없어 구현(Do) 후 gap-detector의 정적 분석만으로 품질을 판단함. 실제 브라우저 테스트, 데이터 흐름 검증, E2E 시나리오 테스트가 자동화되지 않아 "코드는 있지만 동작하지 않는" 상태를 감지하지 못함 |
| **Solution** | PDCA 사이클에 독립 QA phase를 추가하고, QA 전문 에이전트팀(qa-lead + 4 sub-agents)을 구성하여 unit test → e2e test → UX flow test → 데이터 흐름 테스트를 체계적으로 수행. Chrome MCP 연동으로 실제 브라우저 동작 검증 |
| **기능/UX 효과** | `/pdca qa` 명령 하나로 테스트 계획 수립 → 테스트 생성 → 실행 → 결과 분석이 자동 수행. 개발자가 테스트를 직접 작성하지 않아도 QA 에이전트가 설계 문서 기반으로 테스트를 자동 생성하고 실행 |
| **핵심 가치** | "코드가 있다"가 아닌 "코드가 동작한다"를 보장하는 PDCA 사이클. Vibecoding의 마지막 퍼즐 — AI가 만든 코드를 AI가 검증 |

---

## 2. Opportunity Solution Tree

### 2.1 기회 (Opportunity)
- 현재 bkit은 **정적 분석**(gap-detector: 설계-구현 비교)에 의존
- **런타임 검증** 부재: 코드가 실제로 동작하는지 확인 불가
- 개발자가 수동으로 테스트 작성/실행해야 하는 병목
- Chrome DevTools 연동 가능하지만 PDCA에 통합되지 않음

### 2.2 가정 (Assumptions)
| 유형 | 가정 | 리스크 |
|------|------|--------|
| Product | QA phase가 별도로 있으면 품질이 향상된다 | Medium — check phase 확장으로도 가능 |
| Product | AI가 테스트를 자동 생성할 수 있다 | Low — gap-detector가 이미 L1-L3 스펙 생성 |
| Product | Chrome MCP로 실제 브라우저 테스트 가능 | High — MCP 도구 안정성, 타이밍 이슈 |
| GTM | Vibecoding 사용자가 QA 자동화를 원한다 | Low — 핵심 pain point |
| Technical | State machine에 새 phase 추가가 안전하다 | Low — 기존 20 transitions 확장 |
| Technical | iterate 기준 100% 변경이 실용적이다 | Medium — 100% 달성 어려울 수 있음 |

### 2.3 해결책 (Solutions)
**선택: Option A — 독립 QA Phase 추가**

```
현재: PM → Plan → Design → Do → Check(정적) → Act → Report
변경: PM → Plan → Design → Do → Iterate(100%) → QA(동적) → Report
```

### 2.4 실험 (Experiments)
- QA 에이전트팀을 먼저 구현하고, 기존 bkit 코드베이스에 대해 QA를 실행하여 검증
- Chrome MCP는 Phase 2에서 점진적으로 추가

---

## 3. Value Proposition (JTBD 6-Part)

| Part | 내용 |
|------|------|
| **When** | AI로 코드를 생성하고 구현이 완료되었을 때 |
| **I want to** | 코드가 실제로 올바르게 동작하는지 자동으로 검증하고 싶다 |
| **So I can** | 수동 테스트 없이도 프로덕션 배포 가능한 품질을 보장하고 싶다 |
| **Unlike** | 현재 gap-detector의 정적 설계-구현 비교만으로는 런타임 동작을 검증할 수 없다 |
| **Our solution** | QA 전문 에이전트팀이 테스트 계획 수립 → 테스트 코드 생성 → Chrome MCP 실행 → 결과 분석까지 자동 수행 |
| **Key differentiator** | AI가 설계 문서를 읽고 테스트를 자동 생성하며, 실제 브라우저에서 실행하여 UI→API→DB 전체 흐름을 검증 |

---

## 4. Lean Canvas

| 항목 | 내용 |
|------|------|
| **Problem** | 1. AI 생성 코드의 런타임 검증 부재 2. 수동 테스트 작성 병목 3. 데이터 흐름(UI↔API↔DB) 검증 불가 |
| **Solution** | QA phase + QA Agent Team + Chrome MCP + Auto Test Generation |
| **Key Metrics** | QA Pass Rate, Test Coverage, Runtime Error Detection Rate, E2E Scenario Coverage |
| **Unique Value** | "Vibecoding → Vibeqa" — AI가 만들고 AI가 검증하는 완전 자동화 품질 사이클 |
| **Unfair Advantage** | bkit의 설계 문서(Plan/Design) 기반 테스트 자동 생성 — 설계서가 곧 테스트 스펙 |
| **Channels** | bkit 플러그인 내장, /pdca qa 명령 |
| **Customer Segments** | Vibecoding 개발자 (1인 개발자, 소규모 팀) |
| **Cost Structure** | Claude API 토큰 (QA 에이전트 실행 비용) |
| **Revenue Streams** | bkit Pro/Enterprise 차별화 기능 |

---

## 5. User Personas

### Persona 1: Solo Vibecoder (Kay)
- **JTBD**: AI로 풀스택 앱을 빠르게 만들되, 버그 없이 배포하고 싶다
- **Pain**: "코드는 다 있는데 실행하면 안 돼" — API 연동 에러, DB 스키마 불일치
- **Gain**: `/pdca qa` 한 번으로 전체 품질 보증

### Persona 2: 스타트업 CTO (Alex)
- **JTBD**: 3명 팀에서 QA 인력 없이도 품질을 보장하고 싶다
- **Pain**: QA 엔지니어 채용 비용, 테스트 유지보수 부담
- **Gain**: AI QA팀이 테스트 계획부터 실행까지 자동 수행

### Persona 3: 프리랜서 개발자 (Maria)
- **JTBD**: 클라이언트에게 "테스트 완료" 증빙을 제공하고 싶다
- **Pain**: 수동 테스트 스크린샷 캡처, 테스트 보고서 작성
- **Gain**: QA 보고서 자동 생성 (테스트 결과 + 증빙 포함)

---

## 6. Competitor Analysis

| 경쟁사 | 방식 | 강점 | 약점 |
|--------|------|------|------|
| Cursor + Playwright | 수동 설정 | 코드 생성 강력 | QA 워크플로우 없음 |
| Copilot + Testing | 테스트 코드 제안 | IDE 통합 | 실행/분석 불포함 |
| QA Wolf | 전문 E2E 서비스 | 브라우저 테스트 전문 | 설계 문서 연동 없음 |
| Testim.io | AI 기반 E2E | 자가 치유 테스트 | PDCA 통합 없음 |
| **bkit QA Phase** | 설계→테스트→실행→분석 | PDCA 통합, 설계 기반 자동 생성 | 신규 구현 필요 |

---

## 7. 기능 요구사항 (Product Requirements)

### 7.1 워크플로우 변경

```
현재 PDCA:
  PM → Plan → Design → Do → Check(gap≥90%) ↔ Act → Report

변경 PDCA:
  PM → Plan → Design → Do → Check(gap=100%) ↔ Act → QA → Report
                                                       ↑
                                              QA 실패 시 Act로 복귀
```

**핵심 변경점**:
- `check` phase match rate 기준: 90% → **100%**
- 새 `qa` phase 추가: check 통과(100%) 후 진입
- `qa` phase 실패 시 `act`로 복귀하여 수정 후 재검증
- `qa` phase 통과 시 `report`로 진행

### 7.2 QA Agent Team 구성

```
/pdca qa {feature}
     |
     v
QA Lead (opus) - orchestrates
     |
     +-- qa-test-planner   → Test Plan (어떤 테스트를 할지)
     +-- qa-test-generator  → Test Code (테스트 코드 생성)        [parallel]
     +-- qa-debug-analyst   → Debug System (로깅/모니터링)
     |
     v
QA Lead → Test Execution (Chrome MCP + Node)
     |
     v
QA Lead → QA Report Synthesis
     |
     v
docs/05-qa/{feature}.qa-report.md
     |
     v
Next: /pdca report {feature} (QA 통과 시)
  OR: /pdca act {feature} (QA 실패 시)
```

### 7.3 QA Sub-Agents 역할

| Agent | Model | 역할 | 출력물 |
|-------|-------|------|--------|
| **qa-lead** | opus | 오케스트레이션, 테스트 실행, 결과 종합 | QA Report |
| **qa-test-planner** | sonnet | Design 문서 분석 → 테스트 계획 수립 | Test Plan (항목, 우선순위, 커버리지) |
| **qa-test-generator** | sonnet | Test Plan 기반 테스트 코드 자동 생성 | test/*.test.ts, tests/e2e/*.spec.ts |
| **qa-debug-analyst** | sonnet | 디버그 로그 시스템 설계 + 런타임 분석 | Logging config, Debug report |

### 7.4 테스트 유형 및 범위

| 레벨 | 유형 | 도구 | 검증 대상 |
|------|------|------|----------|
| L1 | **Unit Test** | Node.js (vitest/jest) | 함수, 모듈, 비즈니스 로직 |
| L2 | **API Test** | Node.js (fetch/curl) | REST API endpoint, 상태 코드, 응답 형태 |
| L3 | **E2E Test** | Chrome MCP / Playwright | UI 인터랙션, 페이지 네비게이션 |
| L4 | **UX Flow Test** | Chrome MCP | 사용자 시나리오 (가입→로그인→기능→로그아웃) |
| L5 | **Data Flow Test** | Chrome MCP + API + DB | UI→API→DB 쓰기 / DB→API→UI 읽기 전체 흐름 |

### 7.5 Chrome MCP 연동

```
qa-lead가 Chrome MCP 도구 직접 사용:
  - mcp__claude-in-chrome__navigate      → 페이지 이동
  - mcp__claude-in-chrome__form_input    → 폼 입력
  - mcp__claude-in-chrome__find          → 요소 탐색
  - mcp__claude-in-chrome__javascript_tool → JS 실행 (console.log 확인)
  - mcp__claude-in-chrome__read_console_messages → 콘솔 로그 읽기
  - mcp__claude-in-chrome__read_network_requests → 네트워크 요청 추적
  - mcp__claude-in-chrome__get_page_text → 페이지 텍스트 확인
  - mcp__claude-in-chrome__gif_creator   → 테스트 과정 GIF 녹화
```

### 7.6 디버그 로그 시스템

**구조화된 JSON 로깅**:
```json
{
  "timestamp": "2026-04-08T12:00:00.000Z",
  "level": "INFO",
  "service": "api-server",
  "request_id": "req_abc123",
  "message": "POST /api/users completed",
  "data": { "status": 201, "duration_ms": 45, "user_id": "usr_xyz" }
}
```

**Request ID 전파**: Client → API → Backend → DB 전 구간 추적

**디버그 대시보드**: 콘솔 로그, 네트워크 요청, 에러 스택을 QA 보고서에 자동 포함

### 7.7 Quality Gate 변경

| 게이트 | 현재 | 변경 |
|--------|------|------|
| Check→Report | matchRate ≥ 90% | matchRate = **100%** |
| Check→Act | matchRate < 90% | matchRate < **100%** |
| **QA→Report** | (신규) | QA Pass Rate ≥ 95%, Critical 0건 |
| **QA→Act** | (신규) | QA Pass Rate < 95% 또는 Critical > 0 |

### 7.8 State Machine 변경

**새 State**: `qa` (order: 5, between act and report)

**새 Transitions** (4건):
- `act → qa`: ITERATE_COMPLETE (matchRate=100%일 때)
- `check → qa`: MATCH_PASS (matchRate=100%이면 바로 QA로)
- `qa → report`: QA_PASS (QA 통과)
- `qa → act`: QA_FAIL (QA 실패 → 수정 필요)

**새 Events**: QA_PASS, QA_FAIL, QA_SKIP
**새 Guards**: guardQaPass (qaPassRate ≥ 95%, criticalCount = 0)
**새 Actions**: initQaPhase, recordQaResult, generateQaReport

### 7.9 새 파일 목록

| 유형 | 파일 | 설명 |
|------|------|------|
| Agent | `agents/qa-lead.md` | QA 팀 리더 (opus) |
| Agent | `agents/qa-test-planner.md` | 테스트 계획 수립 (sonnet) |
| Agent | `agents/qa-test-generator.md` | 테스트 코드 생성 (sonnet) |
| Agent | `agents/qa-debug-analyst.md` | 디버그 로그 분석 (sonnet) |
| Skill | `skills/qa-phase/SKILL.md` | /pdca qa 스킬 정의 |
| Template | `templates/qa-report.template.md` | QA 보고서 템플릿 |
| Template | `templates/qa-test-plan.template.md` | 테스트 계획 템플릿 |
| Docs | `docs/05-qa/{feature}.qa-report.md` | QA 결과 문서 (출력) |
| Hook | QA Stop handler in unified-stop.js | QA phase 완료 처리 |
| Lib | `lib/qa/test-runner.js` | 테스트 실행 엔진 |
| Lib | `lib/qa/chrome-bridge.js` | Chrome MCP 래퍼 |
| Lib | `lib/qa/report-generator.js` | QA 보고서 생성 |

---

## 8. 성공 기준

| 지표 | 목표 |
|------|------|
| QA Phase 실행 시간 | 5분 이내 (Dynamic), 15분 이내 (Enterprise) |
| 자동 생성 테스트 커버리지 | L1-L2: 80%+, L3-L5: 주요 시나리오 100% |
| 런타임 에러 감지율 | 95%+ (Critical/Warning 레벨) |
| PDCA 워크플로우 완성도 | PM→Plan→Design→Do→Check(100%)→QA→Report 전 구간 자동 |
| Chrome MCP 테스트 성공률 | 90%+ (네트워크/타이밍 이슈 허용) |
| 기존 테스트 회귀 | 0건 |

---

## 9. 제약 조건

1. **CC v2.1.96+ 호환** 필수
2. **Agent Teams 필요**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
3. **Chrome MCP 의존**: claude-in-chrome 확장 설치 필요 (E2E/UX 테스트)
4. **프로젝트 레벨**: Dynamic 이상 (Starter 미지원)
5. **기존 32 agents, 37 skills 체계와 호환**
6. **State Machine 하위 호환성**: 기존 20 transitions 유지 + 4건 추가

---

## 10. 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| Chrome MCP 불안정 | Medium | High | L1-L2 테스트를 fallback으로 유지, Chrome 실패 시 스킵 |
| 100% match rate 달성 어려움 | Medium | Medium | 의도적 차이 목록(intentional-diffs.json) 허용 |
| QA 에이전트 토큰 비용 | Low | Medium | haiku 모델 활용, 테스트 범위 단계적 확장 |
| State Machine 복잡도 증가 | Low | Low | 24 transitions으로 제한, 테스트 충분 작성 |
| 기존 PDCA 워크플로우 깨짐 | Low | High | 기존 flow는 QA 스킵 가능 (QA_SKIP 이벤트) |

---

## Version History

| 버전 | 날짜 | 변경 |
|------|------|------|
| 0.1 | 2026-04-08 | 초안 작성 (PM Discovery + Architecture Investigation) |
