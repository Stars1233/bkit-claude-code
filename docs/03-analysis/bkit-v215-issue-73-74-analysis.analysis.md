# bkit v2.1.5 이슈 #73 #74 심층 분석

> Feature: bkit-v215-issue-73-74-analysis
> 작성일: 2026-04-13
> 분석 방법: 10-agent CTO Team 심층 코드 분석
> 상태: completed

---

## 1. 분석 개요

### 1.1 분석 대상

| 이슈 | 제목 | 보고일 | 심각도 |
|------|------|--------|--------|
| #73 | PDCA skill frontmatter imports 미주입 시 Read 생략 | 2026-04-13 | P0 |
| #74 | PDCA phase 자동 전이가 Skill 완료 후 중단 | 2026-04-13 | P0 |

### 1.2 투입 에이전트

- **코드 추적 에이전트** (3): skill-orchestrator.js, user-prompt-handler.js, pdca-skill-stop.js 경로 분석
- **아키텍처 에이전트** (2): hook 아키텍처와 CC 턴 모델 분석
- **패턴 분석 에이전트** (2): v2.1.3 #65/#66/#67 유사 패턴 비교
- **Gap 분석 에이전트** (2): GAP-A ~ GAP-I 도출
- **검증 에이전트** (1): 결론 교차 검증

### 1.3 분석 범위

- `lib/skill-orchestrator.js` — orchestrateSkillPre/Post 함수 전체
- `lib/import-resolver.js` — resolveImports 함수 전체
- `scripts/user-prompt-handler.js` — UserPromptSubmit hook handler (lines 210-231 집중)
- `scripts/pdca-skill-stop.js` — Stop hook handler (lines 147, 395-437, 460 집중)
- `scripts/unified-stop.js` — 통합 Stop handler
- `lib/pdca/automation.js` — shouldAutoAdvance, autoAdvancePdcaPhase 함수
- `lib/control/automation-controller.js` — 자동화 레벨 매핑

---

## 2. 이슈 #73 분석 — imports 미주입

### 2.1 증상

PDCA skill (plan, design, analyze, report) 실행 시 SKILL.md frontmatter에 선언된 `imports` (예: `templates/plan.template.md`)가 CC 컨텍스트에 주입되지 않음. CC는 template 파일의 존재를 인지하지 못하므로 Read 도구를 호출하지 않음. 결과적으로 PDCA 문서가 템플릿 구조를 따르지 않고 자유 형식으로 생성됨.

**재현 조건:**
1. `/pdca plan {feature}` 실행
2. bkit이 SKILL.md frontmatter의 imports를 해석
3. CC가 template 파일을 Read하지 않고 자유 형식 문서 생성

**기대 동작:**
- imports에 선언된 template content가 CC 컨텍스트에 포함되어야 함
- 또는 CC가 template 파일 경로를 인지하고 자발적으로 Read해야 함

### 2.2 근본 원인 (Root Cause)

#### 2.2.1 orchestrateSkillPre() 미호출 증거

`lib/skill-orchestrator.js`의 `orchestrateSkillPre()` 함수는 imports를 정상적으로 resolve하고 templates 배열을 반환하도록 구현되어 있다:

```
// lib/skill-orchestrator.js
async function orchestrateSkillPre(skillName, args) {
  // ... imports 해석, template 로드
  return { templates: [...], additionalContext: [...] };
}
```

그러나 이 함수는 **어떤 프로덕션 코드 경로에서도 호출되지 않는다**:

- `module.exports`에 포함되어 있으나 `require('skill-orchestrator')`를 사용하는 코드에서 `orchestrateSkillPre`를 호출하는 곳이 없음
- CC hook 아키텍처에서 "PreSkill" 이벤트는 존재하지 않음 (CC 공식 hook events 26개 중 해당 없음)
- bkit의 hooks.json에도 PreToolUse:Skill matcher가 정의되어 있지 않음

**판정: Dead Code** — 구현은 되어 있으나 프로덕션에서 실행되지 않는 사문화된 코드.

#### 2.2.2 UserPromptSubmit handler의 미완성 injection

`scripts/user-prompt-handler.js` lines 210-231에서 import resolution을 시도하지만, 해석된 content가 실제로 CC에 전달되지 않는다:

```
// scripts/user-prompt-handler.js (lines 210-231)
const resolved = await resolveImports(skillConfig.imports);
// ... resolved 결과를 로깅
// "Platform will load it" 코멘트 — 그러나 platform은 이를 로드하지 않음
// additionalContext에 추가하는 코드 부재
```

**핵심 문제**: `resolveImports()` 결과가 `additionalContext` 배열에 `push`되지 않음. 코멘트에 "Platform will load it"이라고 적혀 있으나, CC platform은 plugin의 imports를 자동 로드하는 기능이 없다. 이는 **구현 미완성**이다.

#### 2.2.3 CC regression과의 관계

CC v2.1.86+에서 Read tool 호출 빈도가 감소한 것이 보고되었으나 (#46866), 이는 **악화 요인**일 뿐 근본 원인은 아니다:

- CC가 Read를 적극적으로 호출하던 시기에도 template 경로를 모르면 Read할 수 없음
- SKILL.md body에 "Read the template" 지시가 명시적으로 없으면 CC는 template 존재를 인지할 수 없음
- imports 미주입이 근본 원인이며, CC의 Read 빈도 저하는 증상의 심각도를 높이는 부차적 요인

### 2.3 영향 범위

| 영향 항목 | 범위 | 설명 |
|-----------|------|------|
| PDCA Skills | 5개 (plan, design, do, analyze, report) | 모든 PDCA phase skill이 imports 미주입 영향 |
| Template 파일 | 8개+ | templates/ 디렉토리의 모든 PDCA template |
| 문서 품질 | 전체 | 템플릿 미준수로 문서 구조 일관성 저하 |
| 사용자 경험 | 높음 | 수동으로 template Read 후 재생성 필요 |

### 2.4 버그 판정

**bkit 버그 (확정)**

- `orchestrateSkillPre()` — Dead Code (호출자 없음)
- `user-prompt-handler.js` — imports resolution 후 additionalContext injection 누락
- CC regression (Read 빈도 저하) — 악화 요인이지만 근본 원인 아님

---

## 3. 이슈 #74 분석 — 자동 전이 중단

### 3.1 증상

PDCA full-auto 모드에서 skill 완료 후 다음 phase로 자동 전이가 이루어지지 않음. 대신 사용자에게 "Executive Summary" 또는 "다음 단계를 선택하세요" 프롬프트가 표시됨.

**재현 조건:**
1. `/control level L3` 또는 `L4`로 full-auto 설정
2. `/pdca plan {feature}` 실행하여 plan phase 완료
3. 기대: 자동으로 `/pdca design {feature}` 실행
4. 실제: "Executive Summary" 표시 후 사용자 입력 대기

### 3.2 근본 원인 (Root Cause)

#### 3.2.1 autoTrigger 생성은 정상이나 소비/실행 코드 부재

`scripts/pdca-skill-stop.js` line 460에서 `autoTrigger` 객체가 정상적으로 생성된다:

```
// scripts/pdca-skill-stop.js (line 460)
return {
  autoTrigger: autoTrigger,  // { command: '/pdca design feature-name', delay: 0 }
  // ...
};
```

그러나 이 `autoTrigger` 응답 필드를 **소비하거나 실행하는 코드가 존재하지 않는다**:

- `scripts/unified-stop.js` — pdca-skill-stop.js의 반환값을 받지만 `autoTrigger` 필드를 처리하는 로직 없음
- CC hook 아키텍처 — Stop hook의 반환값에서 인식하는 필드는 `additionalContext`, `suppressMessage` 등 한정적. `autoTrigger`는 CC가 인식하지 않는 커스텀 필드
- 결과적으로 `autoTrigger`는 생성만 되고 아무도 읽지 않는 데이터

#### 3.2.2 Executive Summary 분기가 autoTrigger를 덮어쓰는 문제

`scripts/pdca-skill-stop.js` lines 395-437에서 action이 `plan`, `design`, `report`인 경우 **무조건** `AskUserQuestion`을 포함한 Executive Summary를 생성한다:

```
// scripts/pdca-skill-stop.js (lines 395-437)
if (['plan', 'design', 'report'].includes(action)) {
  // Executive Summary 생성
  // AskUserQuestion으로 사용자에게 다음 단계 선택 요청
  // autoTrigger가 설정되어 있어도 이 분기가 우선 실행됨
}
```

이 분기는 `shouldAutoAdvance()` 결과나 automation level을 **전혀 확인하지 않는다**. full-auto 모드에서도 동일하게 사용자 질문을 생성한다.

#### 3.2.3 autoAdvancePdcaPhase()의 불완전성

`lib/pdca/automation.js`의 `autoAdvancePdcaPhase()` 함수는 PDCA status를 업데이트하지만 **실행 가능한 명령을 반환하지 않는다**:

```
// lib/pdca/automation.js
async function autoAdvancePdcaPhase(feature, currentPhase) {
  // PDCA status JSON 업데이트
  // 다음 phase 결정
  // BUT: 실행 명령 반환 없음 — 상태만 변경
}
```

### 3.3 영향 범위

| 영향 항목 | 범위 | 설명 |
|-----------|------|------|
| PDCA 자동 전이 | 전체 (plan→design→do→check→report) | 모든 phase 전이가 수동으로 전환됨 |
| Automation Level | L3, L4 | full-auto 설정이 무의미해짐 |
| semi-auto (L2) | 부분 | check/qa만 auto-advance, 나머지 수동 |
| 사용자 경험 | 높음 | full-auto 약속과 실제 동작 불일치 |
| Docs=Code 위반 | 있음 | automation 문서와 실제 동작 괴리 |

### 3.4 버그 판정

**bkit 버그 (확정)**

- `autoTrigger` 생성 후 소비/실행 코드 부재 — 설계 미완성
- Executive Summary 분기가 automation level 무시 — 조건 분기 오류
- CC의 턴 종료 경향은 악화 요인이지만, hook 응답에서 실행 지시가 없으므로 CC가 자발적으로 다음 skill을 호출할 근거 자체가 없음

---

## 4. 추가 Gap 분석 (GAP-A ~ GAP-I)

### GAP-A: shouldAutoAdvance() semi-auto 모드 제한

- **위치**: `lib/pdca/automation.js` — `shouldAutoAdvance()` 함수
- **문제**: semi-auto 모드에서 `check`/`qa` phase만 auto-advance 대상. `plan→design`, `design→do` 전이는 semi-auto에서 절대 자동화되지 않음
- **심각도**: P1 (기능 제한)
- **수정 방향**: semi-auto 대상 phase를 확장하거나, 사용자가 phase별로 auto-advance 여부를 설정할 수 있도록 변경

### GAP-B: autoAdvancePdcaPhase() 실행 명령 미반환

- **위치**: `lib/pdca/automation.js` — `autoAdvancePdcaPhase()` 함수
- **문제**: PDCA status JSON만 업데이트하고, 다음 phase 실행에 필요한 명령 문자열(예: `/pdca design feature`)을 반환하지 않음
- **심각도**: P0 (이슈 #74의 직접 원인)
- **수정 방향**: `{ nextCommand: '/pdca design {feature}', phase: 'design' }` 형태의 실행 가능 객체 반환

### GAP-C: Automation level 이중 표현

- **위치**: `lib/pdca/automation.js` (string: 'manual'/'semi-auto'/'full-auto') vs `lib/control/automation-controller.js` (integer: L0-L4)
- **문제**: 두 시스템 간 매핑이 명시적으로 정의되어 있지 않음. L2가 semi-auto인지, L3가 semi-auto인지 코드만으로는 판단 불가
- **심각도**: P1 (혼동 유발, 버그 잠재)
- **수정 방향**: `automation-controller.js`에 `toLevelString()` / `fromLevelString()` 매핑 함수 추가

### GAP-D: Phase completion 감지의 regex 취약성

- **위치**: `scripts/pdca-skill-stop.js` line 147 — `actionPattern` regex
- **문제**: skill action을 regex로 파싱하여 phase를 결정. v2.1.3 #65에서 `qa` action이 인식되지 않던 버그와 동일 패턴. 새로운 phase/action 추가 시 regex 업데이트를 잊으면 동일 버그 재발
- **심각도**: P2 (잠재적 취약점)
- **수정 방향**: regex 대신 명시적 action→phase 매핑 테이블 사용

### GAP-E: Import resolver 에러 무시

- **위치**: `lib/import-resolver.js` — error handling
- **문제**: template 파일이 존재하지 않거나 읽기 실패 시 debug 로그만 출력하고 에러를 삼킴. 사용자는 imports 실패를 인지할 수 없음
- **심각도**: P2 (디버깅 난이도 증가)
- **수정 방향**: errors 배열을 반환하고 additionalContext에 WARNING으로 포함

### GAP-F: PreSkill hook 부재

- **위치**: CC hook 아키텍처 전체
- **문제**: CC는 `PreToolUse` hook은 제공하지만 Skill 전용 "PreSkill" hook은 없음. imports를 skill 실행 직전에 주입할 적절한 hook point가 없음
- **심각도**: P3 (CC 아키텍처 제약, bkit에서 해결 불가)
- **수정 방향**: UserPromptSubmit 또는 Stop hook에서 우회 주입. CC에 PreSkill hook feature request 검토

### GAP-G: Phase transition map 중복 (DRY 위반)

- **위치**: `scripts/pdca-skill-stop.js` — `PDCA_PHASE_TRANSITIONS` vs `lib/pdca/automation.js` — `nextPhaseMap`
- **문제**: 동일한 phase 전이 정보가 두 곳에 중복 정의. 한쪽만 수정 시 불일치 발생 (v2.1.3 #65 수정 시 이미 경험)
- **심각도**: P1 (유지보수 위험)
- **수정 방향**: `automation.js`의 `nextPhaseMap`을 단일 소스로 통합, pdca-skill-stop.js에서 import하여 사용

### GAP-H: unified-stop.js의 autoTrigger 무시

- **위치**: `scripts/unified-stop.js`
- **문제**: pdca-skill-stop.js 반환값을 받아 checkpoint 생성, state machine 전이를 수행하지만 `autoTrigger` 필드를 완전히 무시
- **심각도**: P0 (이슈 #74의 직접 원인)
- **수정 방향**: `autoTrigger` 존재 시 `additionalContext`에 실행 지시 삽입

### GAP-I: qa→report 자동 전이 미검증

- **위치**: v2.1.3 #65에서 qa action 파싱이 수정되었으나, qa→report 자동 전이가 full-auto 모드에서 정상 동작하는지 E2E 테스트 없음
- **문제**: qa phase가 최근 추가된 만큼 전이 경로 검증이 불충분
- **심각도**: P2 (잠재적 결함)
- **수정 방향**: E2E 테스트에 qa→report 전이 시나리오 추가

---

## 5. 유사 버그 패턴 분석

### 5.1 v2.1.3 #65: PDCA qa action not parsed

| 항목 | #65 | #73/#74 |
|------|-----|---------|
| 패턴 | regex가 새로운 action을 인식 못함 | 코드 경로가 실제로 실행되지 않음 |
| 근본 원인 | actionPattern regex 미업데이트 | orchestrateSkillPre() 미호출, autoTrigger 미소비 |
| 공통점 | **구현은 존재하나 실행 경로가 연결되지 않음** | 동일 |
| 교훈 | 새로운 기능 추가 시 전체 경로 E2E 검증 필수 | 적용 필요 |

### 5.2 v2.1.3 #66: stale require in permission-manager

| 항목 | #66 | #73 |
|------|-----|-----|
| 패턴 | 오래된 require 경로가 실패 없이 무시 | orchestrateSkillPre()가 export되지만 호출되지 않음 |
| 공통점 | **Dead Code / Stale Reference 패턴** — 코드가 존재하나 실질적 기능 없음 | 동일 |
| 교훈 | Dead code 탐지 스캐너 필요 | 적용 필요 |

### 5.3 v2.1.3 #67: MCP ignoring config paths

| 항목 | #67 | #73 |
|------|-----|-----|
| 패턴 | config에서 읽은 경로가 MCP에 전달되지 않음 | imports에서 해석한 content가 CC에 전달되지 않음 |
| 공통점 | **데이터 흐름 단절 패턴** — A가 생성한 데이터를 B가 소비하지 못함 | 동일 |
| 교훈 | 데이터 흐름의 end-to-end 추적 필수 | 적용 필요 |

### 5.4 공통 메타 패턴

세 건의 v2.1.3 버그와 이번 #73/#74는 모두 **"구현은 존재하나 실행 경로가 연결되지 않은" 패턴**을 공유한다:

1. 기능 코드가 작성됨
2. export / return까지 정상
3. 호출자 / 소비자가 없거나 불완전
4. 테스트에서 개별 함수는 통과하나 E2E 경로가 검증되지 않음

이 패턴은 bkit 코드베이스의 **구조적 취약점**으로, v2.1.5 수정과 함께 E2E 경로 검증 프로세스를 도입해야 한다.

---

## 6. 영향도 평가

| 이슈 | 심각도 | 영향 범위 | 사용자 경험 | 수정 긴급도 |
|------|--------|-----------|------------|------------|
| #73 (imports 미주입) | P0 | PDCA 전체 5 phase | 템플릿 미준수 문서 생성, 수동 Read 필요 | 즉시 (v2.1.5) |
| #74 (자동 전이 중단) | P0 | Automation L3/L4 | full-auto가 작동하지 않음, 매 phase 수동 전환 | 즉시 (v2.1.5) |
| GAP-A (semi-auto 제한) | P1 | Automation L2 | 예상보다 적은 자동화 | v2.1.5 |
| GAP-B (실행 명령 미반환) | P0 | 자동 전이 전체 | #74의 직접 원인 | v2.1.5 |
| GAP-C (level 이중 표현) | P1 | 전체 automation | 설정과 동작 불일치 가능 | v2.1.5 |
| GAP-D (regex 취약) | P2 | phase 확장 시 | 새 phase 추가 시 버그 재발 | v2.1.5 |
| GAP-E (에러 무시) | P2 | imports 전체 | 디버깅 난이도 증가 | v2.1.5 |
| GAP-F (PreSkill 부재) | P3 | CC 아키텍처 | bkit에서 해결 불가 | 장기 |
| GAP-G (DRY 위반) | P1 | phase map 유지보수 | 한쪽만 수정 시 불일치 | v2.1.5 |
| GAP-H (autoTrigger 무시) | P0 | 자동 전이 전체 | #74의 직접 원인 | v2.1.5 |
| GAP-I (qa→report 미검증) | P2 | qa phase | 잠재적 전이 실패 | v2.1.5 |

---

## 7. 결론

### 7.1 버그 판정 요약

| 이슈 | 판정 | 근본 원인 | CC 역할 |
|------|------|-----------|---------|
| #73 | **bkit 버그** | orchestrateSkillPre() Dead Code + additionalContext injection 누락 | Read 빈도 저하는 악화 요인 |
| #74 | **bkit 버그** | autoTrigger 생성 후 소비/실행 코드 부재 + Executive Summary 무조건 분기 | 턴 종료 경향은 악화 요인 |

### 7.2 핵심 발견

1. **두 이슈 모두 bkit 내부 버그**로 확정. CC regression은 증상을 악화시키지만 근본 원인은 bkit 코드의 데이터 흐름 단절
2. **9개의 추가 Gap** (GAP-A ~ GAP-I) 발견. P0 3건, P1 3건, P2 3건, P3 1건
3. v2.1.3 #65/#66/#67과 **동일한 메타 패턴** — "구현은 존재하나 실행 경로 미연결"
4. 이 패턴은 bkit 코드베이스의 **구조적 취약점**으로, 단순 버그 수정을 넘어 E2E 경로 검증 프로세스 도입이 필요

### 7.3 권장 조치

- **즉시 (v2.1.5)**: P0 4건 (이슈 #73, #74, GAP-B, GAP-H) 수정
- **v2.1.5 내**: P1 3건 (GAP-A, GAP-C, GAP-G) 개선
- **v2.1.5 내**: P2 3건 (GAP-D, GAP-E, GAP-I) 보강
- **장기**: P3 1건 (GAP-F) CC feature request 검토
- **프로세스**: Dead code 탐지 스캐너 + E2E 데이터 흐름 검증을 QA phase에 추가
