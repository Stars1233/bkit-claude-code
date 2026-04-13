# bkit v2.1.5 이슈 #73 #74 수정 계획 (Plan Plus)

> Feature: bkit-v215-issue-73-74-fix
> 작성일: 2026-04-13
> 방법론: Plan Plus (브레인스토밍 -> 구현 계획)
> 분석 문서: docs/03-analysis/bkit-v215-issue-73-74-analysis.analysis.md
> 상태: plan

---

## Phase 0: Intent Discovery

### 사용자 의도

PDCA full-auto 모드가 **실제로 동작하는 것**. 구체적으로:

1. `/pdca plan {feature}` 실행 시 template이 CC 컨텍스트에 주입되어 **템플릿 기반 문서**가 생성되어야 함
2. plan 완료 후 **자동으로** design phase로 전이되어야 함 (L3/L4 설정 시)
3. 전체 PDCA cycle (plan→design→do→check→report)이 automation level에 따라 자동/반자동으로 진행되어야 함

### 핵심 가치

- **Automation First**: bkit의 3대 철학 중 첫 번째. 자동화 가능한 것은 자동화해야 함
- **Docs=Code**: 문서에 기술된 자동화 동작이 코드에서도 동일하게 실현되어야 함
- **No Guessing**: CC가 template 내용을 추측하지 않고 정확한 컨텍스트를 받아야 함

### 성공 기준

| # | 기준 | 측정 방법 |
|---|------|-----------|
| S1 | imports 주입률 100% | PDCA skill 실행 시 additionalContext에 template content 포함 확인 |
| S2 | full-auto 전이 성공률 | L4에서 plan→design→do→check→report 연속 전이 E2E 확인 |
| S3 | semi-auto 전이 확장 | L2에서 plan→design 자동 전이 확인 |
| S4 | 0 regression | pre-release scanner CRITICAL 0건 |

---

## Phase 1: 브레인스토밍 -- 해결 방안

### 1.1 이슈 #73 수정 방안 (imports 미주입)

#### Option A: UserPromptSubmit에서 imports 주입 (RECOMMENDED)

`scripts/user-prompt-handler.js`의 기존 `resolveImports()` 호출 결과를 `additionalContext`에 추가하는 방안.

- **변경 파일**: `scripts/user-prompt-handler.js` (~10-15줄)
- **구현**: lines 210-231 사이에서 resolved content를 `additionalContext.push()` 추가
- **장점**:
  - 최소 변경량 (기존 코드 90% 활용)
  - resolveImports() 함수가 이미 정상 동작 확인됨
  - CC의 additionalContext 주입은 안정적으로 동작하는 검증된 메커니즘
- **단점**:
  - 모든 UserPromptSubmit에서 실행됨 (skill 미사용 시에도 imports 체크)
  - 조건부 실행 로직 추가 필요 (skill command 감지 시에만)

#### Option B: PreToolUse:Skill hook 추가

`hooks.json`에 Skill tool matcher를 추가하고, `scripts/pre-skill.js`를 신규 작성하여 imports를 주입하는 방안.

- **변경 파일**: `hooks.json` (~5줄), `scripts/pre-skill.js` (신규, ~50줄)
- **장점**:
  - Skill 실행 시에만 정확히 동작 (불필요한 실행 없음)
  - 관심사 분리 (imports 주입 로직이 독립 파일)
- **단점**:
  - CC가 `PreToolUse` event에서 Skill tool을 지원하는지 명확한 문서 없음
  - v2.1.86에서 /skills description 250자 제한 등 Skill 관련 변경이 잦아 호환성 위험
  - 신규 파일 + hook 등록으로 변경량이 큼

#### Option C: SKILL.md body에 강제 Read 지시 삽입

각 PDCA phase SKILL.md body에 "MUST Read templates/X.template.md first" 지시를 명시하는 방안.

- **변경 파일**: `skills/pdca/SKILL.md` 또는 각 phase skill (~20줄)
- **장점**:
  - CC 버전 무관하게 동작 (프롬프트 엔지니어링)
  - 즉시 적용 가능 (코드 변경 불필요)
  - imports 메커니즘 실패 시 fallback으로 동작
- **단점**:
  - CC가 지시를 무시할 가능성 (특히 Read 빈도 저하 시)
  - 유지보수 부담 (template 추가/변경 시 SKILL.md도 수정 필요)
  - 토큰 소비 (Read 도구 호출 오버헤드)

#### Option D: Stop hook에서 다음 phase template을 미리 주입

`scripts/pdca-skill-stop.js`에서 현재 phase 완료 시 다음 phase의 template content를 `additionalContext`에 포함하는 방안.

- **변경 파일**: `scripts/pdca-skill-stop.js` (~20줄)
- **장점**:
  - 전이 시점에 자연스럽게 다음 template 주입
  - UserPromptSubmit보다 정확한 타이밍
- **단점**:
  - additionalContext 크기 증가 (template 전체 content = 수천 토큰)
  - 이슈 #74 (자동 전이)가 먼저 수정되어야 의미 있음
  - Stop hook은 현재 phase 종료 시점이므로 현재 phase의 imports 문제는 해결 못함

**RECOMMENDED: Option A + Option C (이중 방어)**

- Option A로 imports를 프로그래밍적으로 주입 (1차 방어)
- Option C로 SKILL.md에 Read 지시 강화 (2차 방어, CC가 imports를 받지 못했을 때 fallback)
- 두 방어선이 모두 실패할 확률은 극히 낮음

---

### 1.2 이슈 #74 수정 방안 (자동 전이 중단)

#### Option A: Stop hook additionalContext에 강제 실행 지시 삽입 (RECOMMENDED)

`autoTrigger` 감지 시 `additionalContext`에 강제 실행 지시를 삽입하고, Executive Summary 분기에서 autoTrigger 존재 시 AskUserQuestion을 생략하는 방안.

- **변경 파일**:
  - `scripts/pdca-skill-stop.js` (~15줄) — lines 395-437 분기에 autoTrigger 우선 조건 추가
  - `scripts/pdca-skill-stop.js` (~5줄) — additionalContext에 "EXECUTE NEXT: /pdca {next} {feature}" 삽입
- **구현 상세**:
  ```
  // autoTrigger 존재 시 Executive Summary 대신 강제 실행 지시
  if (autoTrigger && shouldAutoAdvance(feature, currentPhase, automationLevel)) {
    additionalContext.push(
      `[AUTO-TRANSITION] You MUST now execute: ${autoTrigger.command}\n` +
      `Do NOT ask the user. Do NOT show Executive Summary. Execute immediately.`
    );
    // AskUserQuestion 생략
  }
  ```
- **장점**:
  - 최소 변경량 (기존 코드 구조 유지)
  - CC의 additionalContext 준수는 검증된 메커니즘
  - autoTrigger 생성 로직 수정 불필요
- **단점**:
  - CC가 "MUST" 지시를 무시할 가능성 (낮지만 존재)
  - additionalContext의 지시 강도가 CC 버전에 따라 변동 가능

#### Option B: ScheduleWakeup으로 다음 턴 강제 실행

autoTrigger 감지 시 hook output에 다음 턴 실행 지시를 삽입하는 방안.

- **장점**: CC 턴 종료와 무관하게 다음 실행 보장
- **단점**:
  - ScheduleWakeup은 SP(System Prompt) 전용 도구 (v2.1.101), hook에서 사용 불가
  - CC hook 아키텍처와 호환되지 않음
- **판정**: **현시점 불가**

#### Option C: Signal file + SessionStart hook

`.bkit/state/pending-transition.json`을 생성하고, 다음 SessionStart 또는 UserPromptSubmit에서 감지하여 자동 실행 지시를 삽입하는 방안.

- **변경 파일**:
  - `scripts/pdca-skill-stop.js` (~10줄) — pending-transition.json 생성
  - `scripts/session-start.js` (~15줄) — pending-transition 감지 및 실행 지시
  - `hooks/hooks.json` (~3줄) — SessionStart hook 등록 (이미 존재 시 수정)
- **장점**:
  - LLM 판단에 의존하지 않는 물리적 강제
  - CC 턴 종료 후에도 다음 세션에서 자동 재개
- **단점**:
  - 같은 턴 내 즉시 전이 불가 (세션 재시작 또는 다음 UserPromptSubmit 필요)
  - 복잡도가 높음 (파일 I/O + 상태 관리 + 정리 로직)
  - CC가 같은 세션 내에서 연속 전이할 때는 불필요한 오버헤드

#### Option D: unified-stop.js에서 autoTrigger 직접 실행

`scripts/unified-stop.js`가 `autoTrigger`를 감지하면 해당 skill을 직접 invoke하는 방안.

- **장점**: 정확한 자동 실행
- **단점**:
  - CC hook 아키텍처에서 hook 스크립트가 skill을 직접 invoke하는 API 없음
  - hook은 CC의 다음 동작에 영향을 주는 것이지, CC를 대신하여 도구를 호출하는 것이 아님
- **판정**: **CC 아키텍처 제약으로 현시점 불가**

**RECOMMENDED: Option A (즉시 적용 가능) + Gap 수정 병행**

- Option A로 additionalContext 강제 지시 삽입 (즉시 효과)
- GAP-A, GAP-B, GAP-G, GAP-H 수정으로 구조적 취약점 동시 해결
- Option C (Signal file)는 v2.2.0에서 추가 방어선으로 구현 검토

---

## Phase 2: YAGNI Review

### YAGNI PASS (구현 대상)

| 항목 | 근거 |
|------|------|
| Option A (#73): additionalContext 주입 | 기존 코드 10줄 추가, 즉시 효과, 위험 낮음 |
| Option C (#73): SKILL.md Read 지시 | 프롬프트 수정만으로 이중 방어, 비용 제로 |
| Option A (#74): autoTrigger 강제 지시 | 기존 코드 15줄 수정, 핵심 버그 해결 |
| GAP-A: semi-auto 확장 | 5줄 변경, 기능 완성도 향상 |
| GAP-B: 실행 명령 반환 | #74 수정의 일부, 필수 |
| GAP-G: DRY 통합 | v2.1.3 #65 재발 방지, 유지보수 비용 절감 |
| GAP-H: unified-stop autoTrigger 처리 | #74 수정의 일부, 필수 |

### YAGNI FAIL (연기/제외)

| 항목 | 근거 | 처리 |
|------|------|------|
| Option B (#73): PreToolUse:Skill hook | CC 지원 미확인, 변경량 과다 | v2.2.0 검토 |
| Option B (#74): ScheduleWakeup | SP전용 도구, hook에서 사용 불가 | 제외 |
| Option D (#74): hook→skill invoke | CC 아키텍처 제약 | 제외 |
| Option C (#74): Signal file | 복잡도 대비 효과 낮음, 같은 턴 즉시 전이 불가 | v2.2.0 연기 |
| imports 전체 content 주입 | 토큰 과다 (template당 2000-5000 tokens) | summary 주입으로 타협 |
| E2 (PreToolUse:Skill hook) | CC 지원 확인 선행 필요 | v2.2.0 연기 |
| E4 (Auto-transition 텔레메트리) | 현재 기본 기능이 동작하지 않는 상태에서 텔레메트리는 시기상조 | v2.2.0 연기 |

---

## Phase 3: 구현 계획

### 3.1 P0 수정 (v2.1.5 필수)

| # | 수정 항목 | 파일 | 변경량 | 설명 |
|---|----------|------|--------|------|
| F1 | imports additionalContext 주입 | `scripts/user-prompt-handler.js` | ~15줄 | resolveImports() 결과를 additionalContext에 추가. skill command 감지 시에만 실행되도록 조건부 처리 |
| F2 | autoTrigger 시 AskUserQuestion 생략 | `scripts/pdca-skill-stop.js` | ~10줄 | lines 395-437 분기에 `shouldAutoAdvance() && autoTrigger` 우선 조건 추가. true이면 Executive Summary/AskUserQuestion 생략 |
| F3 | autoTrigger additionalContext 강화 | `scripts/pdca-skill-stop.js` | ~5줄 | autoTrigger 존재 시 `"[AUTO-TRANSITION] EXECUTE NEXT: /pdca {next} {feature}"` 형태로 강제 지시 삽입 |
| F4 | SKILL.md template Read 지시 강화 | `skills/*/SKILL.md` (PDCA 관련) | ~20줄 | 각 phase handler 시작 부분에 "First, Read the template file at templates/X.template.md" 지시 추가 |

**F1 상세 설계:**

```javascript
// scripts/user-prompt-handler.js (lines 210-231 수정)
const resolved = await resolveImports(skillConfig.imports);
if (resolved && resolved.templates && resolved.templates.length > 0) {
  for (const template of resolved.templates) {
    additionalContext.push(
      `--- Template: ${template.name} ---\n${template.content}\n--- End Template ---`
    );
  }
  debug(`Injected ${resolved.templates.length} template(s) into additionalContext`);
}
if (resolved && resolved.errors && resolved.errors.length > 0) {
  additionalContext.push(
    `[WARNING] Template import errors:\n${resolved.errors.join('\n')}`
  );
}
```

**F2+F3 상세 설계:**

```javascript
// scripts/pdca-skill-stop.js (lines 395-437 수정)
if (['plan', 'design', 'report'].includes(action)) {
  // NEW: autoTrigger 우선 처리
  if (autoTrigger && shouldAutoAdvance(feature, currentPhase, automationLevel)) {
    additionalContext.push(
      `[AUTO-TRANSITION] Phase "${currentPhase}" completed successfully.\n` +
      `You MUST now execute: ${autoTrigger.command}\n` +
      `Do NOT ask the user for confirmation. Do NOT show Executive Summary.\n` +
      `Proceed immediately to the next phase.`
    );
    // AskUserQuestion 생략 — return 전에 autoTrigger 처리 완료
  } else {
    // EXISTING: Executive Summary + AskUserQuestion (기존 로직 유지)
  }
}
```

### 3.2 P1 개선 (v2.1.5 권장)

| # | 개선 항목 | 파일 | 변경량 | 설명 |
|---|----------|------|--------|------|
| I1 | shouldAutoAdvance() semi-auto 확장 | `lib/pdca/automation.js` | ~5줄 | semi-auto 대상에 `plan→design`, `design→do` 추가 (check/qa 외) |
| I2 | nextPhaseMap DRY 통합 | `lib/pdca/automation.js` + `scripts/pdca-skill-stop.js` | ~30줄 | `PDCA_PHASE_TRANSITIONS`를 `automation.js`의 `nextPhaseMap`으로 통합. pdca-skill-stop.js에서 import |
| I3 | Automation level 통합 매핑 | `lib/pdca/automation.js` + `lib/control/automation-controller.js` | ~15줄 | `toLevelString(intLevel)` / `fromLevelString(strLevel)` 함수 추가. 매핑: L0-L1=manual, L2=semi-auto, L3-L4=full-auto |
| I4 | Import error 사용자 피드백 | `lib/import-resolver.js` | ~5줄 | errors 배열을 반환값에 포함. F1에서 이미 소비 코드 구현됨 |

**I1 상세 설계:**

```javascript
// lib/pdca/automation.js — shouldAutoAdvance() 수정
function shouldAutoAdvance(feature, currentPhase, level) {
  if (level === 'full-auto') return true;
  if (level === 'semi-auto') {
    // EXISTING: check, qa
    // NEW: plan, design도 semi-auto에서 auto-advance
    const semiAutoPhases = ['plan', 'design', 'check', 'qa'];
    return semiAutoPhases.includes(currentPhase);
  }
  return false;
}
```

**I3 상세 설계:**

```javascript
// lib/pdca/automation.js (또는 lib/control/automation-controller.js)
const LEVEL_MAP = {
  0: 'manual', 1: 'manual',
  2: 'semi-auto',
  3: 'full-auto', 4: 'full-auto'
};

function toLevelString(intLevel) {
  return LEVEL_MAP[intLevel] || 'manual';
}

function fromLevelString(strLevel) {
  const reverseMap = { 'manual': 0, 'semi-auto': 2, 'full-auto': 3 };
  return reverseMap[strLevel] ?? 0;
}
```

### 3.3 P2 고도화 (v2.2.0)

| # | 고도화 항목 | 설명 | 선행 조건 |
|---|-----------|------|-----------|
| E1 | Signal file 기반 전이 강제 | `.bkit/state/pending-transition.json` 생성 + SessionStart/UserPromptSubmit 감지. CC 턴 종료 후에도 다음 세션에서 자동 재개 | F2, F3 완료 후 효과 측정 |
| E2 | PreToolUse:Skill hook | CC가 Skill tool에 대한 PreToolUse를 지원하는지 확인 후 구현. imports 주입 최적 시점 확보 | CC 문서/테스트 확인 |
| E3 | Template summary injection | 전체 template content 대신 구조/섹션명만 주입하여 토큰 절약. 예: "Sections: ## 1. 개요, ## 2. 범위, ## 3. 상세" | F1 완료 후 토큰 측정 |
| E4 | Auto-transition 텔레메트리 | 성공/실패율, 평균 전이 시간, CC 지시 무시율 추적 | F2, F3 완료 후 |

---

## Phase 4: 위험 분석

| 위험 | 확률 | 영향 | 대응 |
|------|------|------|------|
| CC가 additionalContext 실행 지시를 무시 | 중 (20-30%) | 높 | Option C (SKILL.md 강화)로 이중 방어. 지시 문구를 "[SYSTEM]" 접두사 + "MUST" 강조로 강화. 실패 시 Signal file (E1)로 3중 방어 |
| imports 주입으로 토큰 과다 소비 | 낮 (10%) | 중 | 조건부 주입 (skill command 감지 시에만). template content가 5000 tokens 초과 시 summary 모드 자동 전환 |
| autoTrigger 강화가 무한 루프 유발 | 낮 (5%) | 높 | maxIterations 가드 추가 (기본 5회). circuit breaker: 동일 phase 3회 연속 실패 시 manual 전환 |
| semi-auto 확장이 의도치 않은 전이 유발 | 낮 (10%) | 중 | 각 전이에 quality gate 검증 유지 (문서 생성 확인, 최소 내용 검증). 사용자가 `/control` 설정으로 즉시 되돌릴 수 있음 |
| DRY 통합 (I2)이 기존 동작 변경 | 낮 (5%) | 중 | 통합 전후 phase transition 테이블 단위 테스트 비교. 기존 테이블과 100% 일치 확인 |
| v2.1.3 #65 패턴 재발 (새 phase 추가 시) | 중 (30%) | 중 | GAP-D 수정 (regex→매핑 테이블)으로 구조적 방지. 매핑 테이블에 없는 action은 명시적 에러 |

---

## Phase 5: 검증 계획

### 5.1 자동 검증

| # | 검증 항목 | 방법 | 성공 기준 |
|---|----------|------|-----------|
| V1 | Pre-release scanner | `node scripts/qa/pre-release-scanner.js` | CRITICAL 0건, HIGH 0건 |
| V2 | Import resolver 단위 테스트 | resolveImports()에 정상/에러 케이스 검증 | templates 배열 + errors 배열 정상 반환 |
| V3 | shouldAutoAdvance() 단위 테스트 | manual/semi-auto/full-auto x 각 phase 매트릭스 | 전체 조합 기대값 일치 |
| V4 | Level 매핑 단위 테스트 | toLevelString/fromLevelString 왕복 검증 | L0-L4 <-> string 완전 매핑 |

### 5.2 수동 E2E 검증

| # | 시나리오 | 절차 | 기대 결과 |
|---|---------|------|-----------|
| E1 | imports 주입 확인 | `--plugin-dir .` 세션에서 `/pdca plan test-feature` 실행 | CC 컨텍스트에 template content 포함, 템플릿 구조 문서 생성 |
| E2 | full-auto 전이 | `/control level L4` 후 `/pdca plan test-feature` 실행 | plan 완료 후 자동으로 design phase 시작 |
| E3 | semi-auto 전이 | `/control level L2` 후 `/pdca plan test-feature` 실행 | plan 완료 후 자동으로 design phase 시작 (I1 적용 시) |
| E4 | manual 전이 | `/control level L0` 후 `/pdca plan test-feature` 실행 | plan 완료 후 Executive Summary + 사용자 선택 (기존 동작 유지) |
| E5 | qa→report 전이 | L4에서 qa phase 완료 | 자동으로 report phase 시작 |
| E6 | imports 실패 피드백 | 존재하지 않는 template 경로 설정 | additionalContext에 WARNING 메시지 포함 |
| E7 | 무한 루프 방지 | L4에서 의도적으로 같은 phase 반복 유도 | maxIterations 도달 시 manual 전환 |

### 5.3 회귀 검증

| # | 항목 | 확인 사항 |
|---|------|-----------|
| R1 | 기존 PDCA manual 모드 | L0/L1에서 기존 동작 (Executive Summary + 사용자 선택) 변화 없음 |
| R2 | 기존 hooks 동작 | hooks.json 변경 없는 hook들의 정상 동작 확인 |
| R3 | MCP 서버 | bkit-pdca, bkit-analysis MCP 서버 정상 응답 |
| R4 | v2.1.3 수정사항 | #65 (qa action), #66 (permission-manager), #67 (MCP config) 재발 없음 |

---

## 구현 순서 요약

```
Phase 1: P0 수정 (즉시)
  F1 → F4 → F2 → F3
  (imports 주입 → SKILL.md 강화 → autoTrigger 분기 → 강제 지시)

Phase 2: P1 개선 (v2.1.5 내)
  I2 → I3 → I1 → I4
  (DRY 통합 → level 매핑 → semi-auto 확장 → error 피드백)

Phase 3: 검증
  V1-V4 (자동) → E1-E7 (수동 E2E) → R1-R4 (회귀)

Phase 4: P2 고도화 (v2.2.0)
  E1 → E2 → E3 → E4
```

**예상 변경량**: 약 12개 파일, ~150줄 수정/추가, P0 4건 + P1 4건 + P2 4건
**예상 소요**: P0+P1 구현 ~4시간, 검증 ~2시간, 총 ~6시간
