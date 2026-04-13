# bkit v2.1.5 이슈 #73 #74 수정 — Design

> **Feature**: bkit-v215-issue-73-74-fix
> **Architecture**: Option A — Minimal Changes
> **Plan Reference**: docs/01-plan/features/bkit-v215-issue-73-74-fix.plan.md
> **Analysis Reference**: docs/03-analysis/bkit-v215-issue-73-74-analysis.analysis.md
> **작성일**: 2026-04-13
> **상태**: Draft

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | PDCA Automation First 철학 실현 — imports 미주입(#73) + 자동 전이 중단(#74) 수정 |
| **WHO** | bkit 사용자 (PDCA workflow 사용자, semi-auto/full-auto 모드 사용자) |
| **RISK** | CC additionalContext 지시 무시 가능성 (20-30%), 토큰 과다 소비, 무한 루프 |
| **SUCCESS** | imports 주입률 100%, full-auto plan→design 자동 전이, semi-auto plan→design 자동 전이, 0 regression |
| **SCOPE** | P0 4건(F1~F4) + P1 4건(I1~I4) = 8건, ~150줄 수정, ~12 파일 |

---

## 1. Overview

### 1.1 Architecture Selection

| 항목 | Option A: Minimal Changes | Option B: PreToolUse Hook | Option C: Signal File |
|------|---------------------------|--------------------------|----------------------|
| **변경량** | ~150줄, 12파일 | ~200줄, 15파일+ (신규 포함) | ~250줄, 15파일+ (신규 포함) |
| **위험도** | 낮음 (기존 코드 경로 재사용) | 중간 (CC PreToolUse:Skill 미검증) | 중간 (파일 I/O + 상태 관리) |
| **즉시 효과** | 높음 (기존 메커니즘 활용) | 미지수 (CC 호환성 확인 필요) | 낮음 (다음 턴/세션 대기 필요) |
| **유지보수** | 낮음 (기존 구조 유지) | 중간 (신규 hook 관리) | 높음 (상태 파일 정리 로직) |
| **CC 버전 의존성** | 없음 (additionalContext는 v2.1.34+) | 높음 (PreToolUse:Skill 지원 여부) | 낮음 |
| **판정** | **RECOMMENDED** | v2.2.0 연기 | v2.2.0 연기 |

**선택 근거**: 두 버그 모두 근본 원인은 **누락된 코드 경로**이지 아키텍처 결함이 아님. 기존 `contextParts[]` → `additionalContext` 출력 경로와 `shouldAutoAdvance()` → `autoTrigger` → `!autoTrigger` 가드를 활용하면 최소 변경으로 수정 가능.

### 1.2 Core Design Decisions (D1-D8)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | `contextParts[]` 활용하여 imports 주입 | 기존 `user-prompt-handler.js`의 출력 경로 재사용. line 237에서 `join()` → line 247~257에서 `additionalContext`로 출력. 신규 코드 경로 추가 불필요 |
| D2 | `shouldAutoAdvance()` semi-auto 확장 | `autoTrigger` 생성의 전제조건. 현재 `check`/`qa`만 지원하는 semi-auto를 `plan`/`design`까지 확장하면 line 279의 조건 충족 → `autoTrigger` 생성 |
| D3 | `autoTrigger` guidance를 soft→directive로 강화 | 현재 `🤖 [semi-auto] Auto-advance: pdca` 형태의 단순 안내. CC가 이를 무시할 확률 높음. `[AUTO-TRANSITION] MUST execute` 형태의 강제 지시로 변경 |
| D4 | SKILL.md에 Read 지시 추가 (이중 방어) | imports 주입이 1차 방어. CC가 additionalContext를 받지 못하는 edge case에서 SKILL.md body의 명시적 Read 지시가 2차 방어로 작동 |
| D5 | `nextPhaseMap` DRY 통합 | `PDCA_PHASE_TRANSITIONS` (pdca-skill-stop.js L40-90)과 `nextPhaseMap` (automation.js L169-177) 중복. v2.1.3 #65 수정 시 한쪽만 수정하여 불일치 발생한 전례. `automation.js`를 단일 소스로 통합 |
| D6 | level 매핑 함수 추가 | `automation.js` (string: 'manual'/'semi-auto'/'full-auto')와 `automation-controller.js` (integer: L0-L4) 간 명시적 매핑 부재. `getLevelName()`/`levelFromName()`이 이미 존재하나 `getAutomationLevel()`과 통합 안 됨. 양방향 매핑 함수 추가로 타입 안전성 확보 |
| D7 | import error를 contextParts에 WARNING으로 포함 | No Guessing 철학. 사용자가 template import 실패를 인지할 수 있어야 함. debug 로그만으로는 프로덕션에서 문제 파악 불가 |
| D8 | 조건부 imports 주입 (skill command 감지 시에만) | 모든 UserPromptSubmit에서 imports 처리 시 불필요한 오버헤드. `skillTrigger` 감지 시에만 실행하여 성능 영향 최소화 |

### 1.3 File Structure Overview

| # | 파일 | 태그 | 변경 설명 |
|---|------|------|-----------|
| 1 | `scripts/user-prompt-handler.js` | [MODIFY] | F1: imports → contextParts 주입 (~15줄) |
| 2 | `scripts/pdca-skill-stop.js` | [MODIFY] | F3: autoTrigger directive 강화 (~10줄), I2: PDCA_PHASE_TRANSITIONS 제거 → import (~30줄) |
| 3 | `lib/pdca/automation.js` | [MODIFY] | I1: shouldAutoAdvance 확장 (~5줄), I2: nextPhaseMap export (~20줄), I3: level 매핑 (~15줄) |
| 4 | `skills/pdca/SKILL.md` | [MODIFY] | F4: plan/design/report handler에 Template Read 지시 추가 (~15줄) |
| 5 | `lib/import-resolver.js` | [MODIFY] | I4: error 반환 강화 (이미 구현됨, F1에서 소비) |
| 6 | `lib/control/automation-controller.js` | [MODIFY] | I3: PDCA 레벨 매핑 함수 import 참조 문서화 (~5줄 주석) |
| 7 | `bkit.config.json` | [MODIFY] | 버전 2.1.5 |
| 8 | `.claude-plugin/plugin.json` | [MODIFY] | 버전 2.1.5 |
| 9 | `.claude-plugin/marketplace.json` | [MODIFY] | 버전 2.1.5 |
| 10 | `hooks/hooks.json` | [MODIFY] | 버전 2.1.5 |
| 11 | `hooks/session-start.js` | [MODIFY] | 버전 주석 2.1.5 |
| 12 | `scripts/unified-stop.js` | [확인] | autoTrigger 처리 불필요 확인 (pdca-skill-stop.js가 자체 출력 후 exit) |

---

## 2. Detailed Design — F1: imports additionalContext injection

### 2.1 Current Flow (Before)

```
UserPromptSubmit hook 시작
  → Section 3: matchImplicitSkillTrigger() → skillTrigger 감지
  → Section 6 (line 210-231):
      resolveImports() 호출 → content 해석 성공
      → debugLog()로 로깅만 수행
      → 코멘트: "Platform will load it through additionalContext"
      → BUT: contextParts[]에 push 안 됨 → content DISCARDED
  → line 237: contextParts.join(' | ') → additionalContext 출력
  → CC는 template content를 받지 못함 → 자유 형식 문서 생성
```

### 2.2 New Flow (After)

```
UserPromptSubmit hook 시작
  → Section 3: matchImplicitSkillTrigger() → skillTrigger 감지
  → Section 6 (line 210-231, MODIFIED):
      processMarkdownWithImports() 호출 → {content, errors} 반환
      → content 존재 시: template 구조 요약을 contextParts[]에 push
      → errors 존재 시: WARNING을 contextParts[]에 push
  → line 237: contextParts.join(' | ') → additionalContext에 template 정보 포함
  → CC가 template 구조를 인지 → 템플릿 기반 문서 생성
```

### 2.3 Code Changes

**File**: `scripts/user-prompt-handler.js`

**Before** (lines 209-231):

```javascript
// 6. v1.4.2: Resolve Skill/Agent imports (FR-02)
if (importResolver) {
  try {
    // Get triggered skill from step 3
    const skillTrigger = matchImplicitSkillTrigger(userPrompt);
    if (skillTrigger && skillTrigger.skill) {
      const skillPath = path.join(PLUGIN_ROOT, 'skills', skillTrigger.skill, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const { content, errors } = importResolver.processMarkdownWithImports(skillPath);
        if (content && content.length > 0 && errors.length === 0) {
          debugLog('UserPrompt', 'Skill imports resolved', {
            skill: skillTrigger.skill,
            contentLength: content.length
          });
          // Note: The imported content is now available for the skill
          // Platform will load it through additionalContext
        }
      }
    }
  } catch (e) {
    debugLog('UserPrompt', 'Skill import resolution failed', { error: e.message });
  }
}
```

**After** (수정):

```javascript
// 6. v1.4.2 + v2.1.5 F1: Resolve Skill/Agent imports and inject into additionalContext
if (importResolver) {
  try {
    // Get triggered skill from step 3
    const skillTrigger = matchImplicitSkillTrigger(userPrompt);
    if (skillTrigger && skillTrigger.skill) {
      const skillPath = path.join(PLUGIN_ROOT, 'skills', skillTrigger.skill, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const { content, errors } = importResolver.processMarkdownWithImports(skillPath);

        // v2.1.5 F1: Inject resolved template content into contextParts
        if (content && content.length > 0) {
          // Extract template section headings for token-efficient summary
          const sectionHeadings = content.match(/^##\s+.+$/gm) || [];
          const templateSummary = sectionHeadings.length > 0
            ? `Template structure for ${skillTrigger.skill}: ${sectionHeadings.slice(0, 15).join(' / ')}`
            : `Template loaded for ${skillTrigger.skill} (${content.length} chars)`;

          contextParts.push(templateSummary);
          debugLog('UserPrompt', 'Skill imports injected into additionalContext', {
            skill: skillTrigger.skill,
            contentLength: content.length,
            headingCount: sectionHeadings.length
          });
        }

        // v2.1.5 F1/I4: Surface import errors as warnings
        if (errors && errors.length > 0) {
          contextParts.push(`[WARNING] Template import errors: ${errors.join('; ')}`);
          debugLog('UserPrompt', 'Skill import errors', { errors });
        }
      }
    }
  } catch (e) {
    debugLog('UserPrompt', 'Skill import resolution failed', { error: e.message });
  }
}
```

### 2.4 설계 세부 사항

#### Template Summary Format

토큰 절약을 위해 template 전체 content가 아닌 **section heading 요약**을 주입한다.

**출력 예시** (plan.template.md 기준):

```
Template structure for pdca: ## Context Anchor / ## Executive Summary /
## 1. Overview / ## 2. Goals / ## 3. Scope / ## 4. Requirements /
## 5. Constraints / ## 6. Risk Analysis / ## 7. Success Criteria /
## 8. Implementation Strategy / ## 9. Timeline
```

**토큰 추정**: section heading 15개 × ~5 tokens = ~75 tokens (template 전체 2000-5000 tokens 대비 97% 절감)

#### 조건부 실행 (D8)

`matchImplicitSkillTrigger(userPrompt)` 호출은 이미 Section 3 (line 105)에서 수행되지만, Section 6에서 **재호출**하고 있다 (line 213). 이는 기존 코드의 패턴이며 성능 영향이 무시할 수준이므로 현행 유지한다.

> **주의**: line 213의 `matchImplicitSkillTrigger` 재호출은 Section 3의 결과를 변수에 저장하여 재사용하면 더 효율적이나, 이는 리팩토링 범위이므로 v2.2.0에서 다룬다.

#### Error Feedback (I4)

`lib/import-resolver.js`의 `processMarkdownWithImports()` 함수는 이미 `{ content, errors }` 형태로 에러를 반환한다 (line 216-242). 현재 코드에서 `errors.length === 0` 조건으로 에러를 삼키고 있는 것이 문제. F1 수정에서 errors를 contextParts에 push하여 해결. **import-resolver.js 자체 수정 불필요**.

---

## 3. Detailed Design — F2+F3: autoTrigger AskUserQuestion skip + directive 강화

### 3.1 Current Flow (Before)

```
pdca-skill-stop.js 실행
  → line 263: getAutomationLevel() → 'semi-auto'
  → line 273: currentPhaseForAuto = phaseMap[action] (예: 'plan')
  → line 279: shouldAutoAdvance('plan') 호출
      → automation.js L62-63: phase === 'check' || phase === 'qa'
      → 'plan'은 해당 안 됨 → return false
  → autoTrigger = null (생성 안 됨)
  → line 396: !autoTrigger = true → Executive Summary + AskUserQuestion 생성
  → 사용자에게 "다음 단계를 선택하세요" 표시
  → 자동 전이 실패
```

### 3.2 New Flow (After)

```
pdca-skill-stop.js 실행
  → line 263: getAutomationLevel() → 'semi-auto'
  → line 273: currentPhaseForAuto = phaseMap[action] (예: 'plan')
  → line 279: shouldAutoAdvance('plan') 호출
      → automation.js (MODIFIED): ['plan', 'design', 'check', 'qa'].includes('plan')
      → return true ← I1에 의해 확장됨
  → autoTrigger = generateAutoTrigger('plan', { feature, ... })
      → { skill: 'pdca', args: 'design {feature}' } 생성
  → line 286 (MODIFIED): guidance에 강제 실행 지시 삽입
      → "[AUTO-TRANSITION] MUST execute: /pdca design {feature}"
  → line 396: !autoTrigger = false → Executive Summary + AskUserQuestion SKIPPED
  → line 446-461: default response에 강제 지시 포함된 guidance 출력
  → CC가 지시를 받아 자동으로 /pdca design 실행
```

### 3.3 Code Changes — F3: autoTrigger directive 강화

**File**: `scripts/pdca-skill-stop.js`

**Before** (lines 286-289):

```javascript
    if (autoTrigger) {
      guidance += `\n\n🤖 [${automationLevel}] Auto-advance: ${autoTrigger.skill}`;
      debugLog('Skill:pdca:Stop', 'Auto-advance triggered', { autoTrigger });
    }
```

**After** (수정):

```javascript
    if (autoTrigger) {
      // v2.1.5 F3: Strong directive instead of soft guidance
      const nextCommand = `/${autoTrigger.skill} ${autoTrigger.args}`;
      guidance += [
        '',
        '',
        `[AUTO-TRANSITION] Phase "${action}" completed successfully.`,
        `You MUST now execute: ${nextCommand}`,
        `Do NOT ask the user for confirmation. Do NOT show Executive Summary.`,
        `Do NOT stop. Proceed immediately to the next phase.`,
      ].join('\n');
      debugLog('Skill:pdca:Stop', 'Auto-advance triggered', { autoTrigger, nextCommand });
    }
```

### 3.4 F2 분석: AskUserQuestion skip은 이미 구현되어 있음

`pdca-skill-stop.js` line 396의 조건:

```javascript
if (feature && (action === 'plan' || action === 'design' || action === 'report') && !autoTrigger) {
```

이 조건에 `!autoTrigger`가 **이미 존재**한다. 따라서 `autoTrigger`가 생성되면 Executive Summary + AskUserQuestion 분기는 자동으로 skip된다.

**핵심 의존성**: F2의 정상 동작은 **I1 (shouldAutoAdvance 확장)**에 의존한다. I1이 적용되지 않으면 `shouldAutoAdvance('plan')` = false → `autoTrigger` = null → `!autoTrigger` = true → AskUserQuestion 생성으로 기존 동작과 동일.

**구현 순서**: I1 → F3 (F2는 기존 코드로 자동 해결)

### 3.5 Guard Rails

| 가드레일 | 메커니즘 | 위치 |
|----------|----------|------|
| maxIterations | `bkit.config.json: pdca.maxIterations = 5` | iteration 카운트 초과 시 자동 중단 |
| Circuit Breaker | `lib/pdca/circuit-breaker.js` | 동일 phase 연속 실패 시 manual 전환 |
| Quality Gate | `lib/quality/gate-manager.js` → `unified-stop.js` L325-365 | gate verdict=fail 시 전이 차단 |
| Level Guard | `shouldAutoAdvance()` 내부 level 체크 | manual 모드에서는 절대 auto-advance 안 됨 |
| Feature Guard | `pdca-skill-stop.js` L279: `&& feature` | feature 미감지 시 autoTrigger 생성 안 됨 |

---

## 4. Detailed Design — F4: SKILL.md template Read 지시

### 4.1 변경 근거

imports 주입(F1)이 1차 방어선이나, 다음 상황에서 실패할 수 있다:

1. `matchImplicitSkillTrigger()`가 skill을 감지하지 못하는 경우 (정확한 slash command 사용 시에는 trigger 우회)
2. `processMarkdownWithImports()`가 template 파일 읽기 실패
3. `contextParts`가 `truncateContext()`에 의해 잘림

SKILL.md body의 명시적 Read 지시는 CC가 직접 template 파일을 Read하도록 유도하는 **2차 방어선**.

### 4.2 Changes

**File**: `skills/pdca/SKILL.md`

#### Plan handler (line 98, 현재 step 0 PRD Auto-Reference 앞에 삽입):

**Before**:
```markdown
### plan (Plan Phase)

0. **PRD Auto-Reference**: Check if `docs/00-pm/{feature}.prd.md` exists
```

**After**:
```markdown
### plan (Plan Phase)

0. **Template Loading**: Read `templates/plan.template.md` to understand the required Plan document structure and sections. Use this template's sections as your document outline. This is MANDATORY — do not generate Plan documents from memory or assumptions.
1. **PRD Auto-Reference**: Check if `docs/00-pm/{feature}.prd.md` exists
```

> **주의**: 기존 step 번호가 0부터 시작하므로, Template Loading을 step 0으로 추가하고 기존 PRD Auto-Reference를 step 1로 변경. 이후 번호 재배치.

#### Design handler (line 119, 현재 step 1 앞에 삽입):

**Before**:
```markdown
### design (Design Phase)

1. Verify Plan document exists (required - suggest running plan first if missing)
```

**After**:
```markdown
### design (Design Phase)

0. **Template Loading**: Read `templates/design.template.md` to understand the required Design document structure. Use this template's sections as your document outline. This is MANDATORY — do not generate Design documents from memory or assumptions.
1. Verify Plan document exists (required - suggest running plan first if missing)
```

#### Report handler (현재 step 1 앞에 삽입):

**Before**:
```markdown
### report (Completion Report)

1. Verify Check >= 90% (warn if below)
```

**After**:
```markdown
### report (Completion Report)

0. **Template Loading**: Read `templates/report.template.md` to understand the required Report document structure. Use this template's sections as your document outline. This is MANDATORY — do not generate Report documents from memory or assumptions.
1. Verify Check >= 90% (warn if below)
```

---

## 5. Detailed Design — I1: shouldAutoAdvance() semi-auto 확장

### 5.1 Code Changes

**File**: `lib/pdca/automation.js`

**Before** (lines 50-64):

```javascript
function shouldAutoAdvance(phase) {
  const { getConfig } = getCore();
  const level = getAutomationLevel();

  if (level === 'manual') return false;

  const reviewCheckpoints = getConfig('pdca.fullAuto.reviewCheckpoints', ['design']);

  if (level === 'full-auto') {
    return !reviewCheckpoints.includes(phase);
  }

  // semi-auto: auto-advance from check and qa phases
  return phase === 'check' || phase === 'qa';
}
```

**After** (수정):

```javascript
function shouldAutoAdvance(phase) {
  const { getConfig } = getCore();
  const level = getAutomationLevel();

  if (level === 'manual') return false;

  const reviewCheckpoints = getConfig('pdca.fullAuto.reviewCheckpoints', ['design']);

  if (level === 'full-auto') {
    return !reviewCheckpoints.includes(phase);
  }

  // v2.1.5 I1: semi-auto now includes plan and design for continuous flow
  // plan→design→do is a natural document generation sequence that benefits from auto-advance
  const semiAutoPhases = ['plan', 'design', 'check', 'qa'];
  return semiAutoPhases.includes(phase);
}
```

### 5.2 Phase × Level 매트릭스

`shouldAutoAdvance()` 반환값 매트릭스 (Before vs After):

| Phase | manual | semi-auto (Before) | semi-auto (After) | full-auto (reviewCheckpoints=['design']) |
|-------|--------|-------------------|-------------------|----------------------------------------|
| pm | false | false | false | true |
| plan | false | **false** | **true** ← 변경 | true |
| design | false | **false** | **true** ← 변경 | **false** (reviewCheckpoint) |
| do | false | false | false | true |
| check | false | true | true | true |
| act | false | false | false | true |
| qa | false | true | true | true |
| report | false | false | false | true |

**변경 영향**:
- semi-auto에서 `plan` 완료 후 자동으로 `design` 시작 (신규)
- semi-auto에서 `design` 완료 후 자동으로 `do` 시작 (신규)
- full-auto에서 `design`은 reviewCheckpoint로 여전히 사용자 확인 필요 (기존 유지)
- `do`, `act`, `report`은 semi-auto에서 여전히 수동 (문서 생성이 아닌 구현/리팩토링 단계)

### 5.3 semi-auto 미포함 phase 근거

| Phase | 미포함 근거 |
|-------|------------|
| `pm` | PM은 선택적 단계. 자동 전이 시 의도치 않은 plan 시작 위험 |
| `do` | 구현 완료 판단은 사용자만 가능. 자동 analyze 시작은 미완성 코드 분석 위험 |
| `act` | iterate 완료 후 자동 check는 circuit-breaker와 중복. 기존 로직으로 충분 |
| `report` | PDCA cycle 최종 단계. 자동 archive는 위험 (문서 삭제 포함) |

---

## 6. Detailed Design — I2: nextPhaseMap DRY 통합

### 6.1 문제 상황

현재 PDCA phase 전이 정보가 **두 곳에 중복** 정의:

1. `scripts/pdca-skill-stop.js` L40-90: `PDCA_PHASE_TRANSITIONS` (조건부 전이 포함, 풍부한 메타데이터)
2. `lib/pdca/automation.js` L169-177: `nextPhaseMap` (단순 문자열 매핑)
3. `lib/pdca/automation.js` L75-87: `generateAutoTrigger` 내부 `phaseMap` (skill/args 매핑)

v2.1.3 #65 수정 시 한쪽만 수정하여 불일치가 발생한 전례 있음.

### 6.2 통합 설계

**File**: `lib/pdca/automation.js` (신규 export 추가)

```javascript
/**
 * v2.1.5 I2: Canonical PDCA Phase Transition Map (Single Source of Truth)
 * Consolidates PDCA_PHASE_TRANSITIONS (pdca-skill-stop.js) and nextPhaseMap (automation.js)
 *
 * @type {Object<string, {next: string, skill: string|null, message: string, taskTemplate: string}>}
 */
const PDCA_PHASE_TRANSITIONS = {
  'pm': {
    next: 'plan',
    skill: '/pdca plan',
    message: 'PM analysis completed. Proceed to Plan phase.',
    taskTemplate: '[Plan] {feature}'
  },
  'plan': {
    next: 'design',
    skill: '/pdca design',
    message: 'Plan completed. Proceed to Design phase.',
    taskTemplate: '[Design] {feature}'
  },
  'design': {
    next: 'do',
    skill: null,  // Implementation is manual
    message: 'Design completed. Start implementation.',
    taskTemplate: '[Do] {feature}'
  },
  'do': {
    next: 'check',
    skill: '/pdca analyze',
    message: 'Implementation completed. Run Gap analysis.',
    taskTemplate: '[Check] {feature}'
  },
  'check': {
    // Conditional: resolved at runtime by determinePdcaTransition()
    conditions: [
      {
        when: (ctx) => ctx.matchRate >= 90,
        next: 'report',
        skill: '/pdca report',
        message: 'Check passed! Generate completion report.',
        taskTemplate: '[Report] {feature}'
      },
      {
        when: (ctx) => ctx.matchRate < 90,
        next: 'act',
        skill: '/pdca iterate',
        message: 'Check below threshold. Run auto improvement.',
        taskTemplate: '[Act-{N}] {feature}'
      }
    ]
  },
  'act': {
    next: 'check',
    skill: '/pdca analyze',
    message: 'Act completed. Run re-verification.',
    taskTemplate: '[Check] {feature}'
  },
  'qa': {
    // Conditional
    conditions: [
      {
        when: (ctx) => ctx.qaPassRate >= 95 && ctx.qaCriticalCount === 0,
        next: 'report',
        skill: '/pdca report',
        message: 'QA passed! Generate completion report.',
        taskTemplate: '[Report] {feature}'
      },
      {
        when: () => true,
        next: 'act',
        skill: '/pdca iterate',
        message: 'QA issues found. Run improvement.',
        taskTemplate: '[Act-{N}] {feature}'
      }
    ]
  }
};
```

`module.exports`에 `PDCA_PHASE_TRANSITIONS` 추가.

### 6.3 Consumer 업데이트

**File**: `scripts/pdca-skill-stop.js`

**Before** (lines 18-30 + 40-124):

```javascript
// (line 18-30에서 automation.js import)
const {
  emitUserPrompt,
  shouldAutoAdvance,
  generateAutoTrigger,
  getAutomationLevel,
  buildNextActionQuestion,
  formatAskUserQuestion,
} = require('../lib/pdca/automation');

// (line 40-90에서 로컬 PDCA_PHASE_TRANSITIONS 정의)
const PDCA_PHASE_TRANSITIONS = { ... };

// (line 98-124에서 determinePdcaTransition 로컬 정의)
function determinePdcaTransition(currentPhase, context = {}) { ... }
```

**After** (수정):

```javascript
// v2.1.5 I2: Import canonical phase transition map from automation.js
const {
  emitUserPrompt,
  shouldAutoAdvance,
  generateAutoTrigger,
  getAutomationLevel,
  buildNextActionQuestion,
  formatAskUserQuestion,
  PDCA_PHASE_TRANSITIONS,
  determinePdcaTransition,
} = require('../lib/pdca/automation');

// PDCA_PHASE_TRANSITIONS 로컬 정의 제거 (automation.js로 이동)
// determinePdcaTransition 로컬 정의 제거 (automation.js로 이동)
```

**순 변경**: pdca-skill-stop.js에서 ~85줄 삭제 (PDCA_PHASE_TRANSITIONS + determinePdcaTransition), automation.js에서 ~85줄 추가.

### 6.4 `determinePdcaTransition()` 이동

현재 `pdca-skill-stop.js` L98-124에 정의된 `determinePdcaTransition()` 함수를 `automation.js`로 이동하여 export.

```javascript
// automation.js에 추가
function determinePdcaTransition(currentPhase, context = {}) {
  const transition = PDCA_PHASE_TRANSITIONS[currentPhase];
  if (!transition) return null;

  if (transition.conditions) {
    for (const condition of transition.conditions) {
      if (condition.when(context)) {
        return {
          next: condition.next,
          skill: condition.skill,
          message: condition.message,
          taskTemplate: condition.taskTemplate.replace('{N}', context.iterationCount || 1)
        };
      }
    }
    return null;
  }

  return {
    next: transition.next,
    skill: transition.skill,
    message: transition.message,
    taskTemplate: transition.taskTemplate
  };
}
```

---

## 7. Detailed Design — I3: Automation level 매핑

### 7.1 현재 상태

| 시스템 | 표현 방식 | 사용 위치 |
|--------|-----------|-----------|
| `automation.js` | string: `'manual'` / `'semi-auto'` / `'full-auto'` | `getAutomationLevel()`, `shouldAutoAdvance()` |
| `automation-controller.js` | integer: L0-L4 | `getCurrentLevel()`, `setLevel()`, `canAutoAdvance()` |
| `automation-controller.js` | `getLegacyAutomationLevel()` | L0→'manual', L1-L3→'semi-auto', L4→'full-auto' |

`getLegacyAutomationLevel()`이 이미 존재하지만 (L429-L459), 양방향 매핑이 아니고 automation.js에서 접근 불가.

### 7.2 Mapping Table

| Integer (automation-controller) | String (automation.js) | Description |
|---------------------------------|------------------------|-------------|
| 0 (MANUAL) | `'manual'` | 모든 동작에 승인 필요 |
| 1 (GUIDED) | `'manual'` | 읽기 자동, 쓰기 승인 (manual과 동일 취급) |
| 2 (SEMI_AUTO) | `'semi-auto'` | 비파괴적 자동, 파괴적 승인 |
| 3 (AUTO) | `'full-auto'` | 대부분 자동, 고위험만 승인 |
| 4 (FULL_AUTO) | `'full-auto'` | 전체 자동, 사후 검토만 |

### 7.3 Code Changes

**File**: `lib/pdca/automation.js` (기존 함수 근처에 추가)

```javascript
/**
 * v2.1.5 I3: Convert integer automation level (L0-L4) to PDCA string level
 * Bridges automation-controller.js (integer) ↔ automation.js (string) gap
 * @param {number} intLevel - Integer level 0-4
 * @returns {'manual' | 'semi-auto' | 'full-auto'}
 */
function toLevelString(intLevel) {
  if (intLevel <= 1) return 'manual';
  if (intLevel === 2) return 'semi-auto';
  return 'full-auto';  // 3, 4
}

/**
 * v2.1.5 I3: Convert PDCA string level to integer automation level
 * @param {string} strLevel - String level
 * @returns {number} Integer level 0-4
 */
function fromLevelString(strLevel) {
  const map = { 'manual': 0, 'semi-auto': 2, 'full-auto': 3 };
  return map[strLevel] ?? 0;
}
```

`module.exports`에 `toLevelString`, `fromLevelString` 추가.

### 7.4 `automation-controller.js`와의 관계

`automation-controller.js`에 이미 `getLegacyAutomationLevel()` (L407-L412)과 `getLevelName()` (L274-L276), `levelFromName()` (L283-L285)이 존재한다.

**I3은 `automation.js` 측에서의 매핑 함수 추가**로, `automation-controller.js`의 기존 함수와 방향이 다르다:
- `automation-controller.js`: integer → display name (e.g., 2 → 'semi-auto')
- `automation.js` I3: integer ↔ PDCA level string (양방향)

두 시스템을 통합하는 것은 v2.2.0 리팩토링 범위. I3은 현재 `automation.js` 내부에서 필요 시 사용할 수 있는 유틸리티 함수를 추가하는 것이 목적.

---

## 8. Implementation Order

```
Phase 1: #73 수정 (imports 미주입)
  ┌─────────────────────────────────────┐
  │ F1: user-prompt-handler.js          │ imports → contextParts 주입
  │   └→ I4: import error feedback      │ F1에 포함 (추가 수정 불필요)
  │                                     │
  │ F4: SKILL.md Template Read 지시     │ 이중 방어 (2차 방어선)
  └─────────────────────────────────────┘

Phase 2: #74 수정 (자동 전이 중단)
  ┌─────────────────────────────────────┐
  │ I1: shouldAutoAdvance() 확장        │ semi-auto에 plan/design 추가
  │   ↓                                 │ (F2의 전제조건)
  │ F3: autoTrigger directive 강화      │ soft → MUST execute
  │   ↓                                 │
  │ F2: AskUserQuestion skip            │ 기존 !autoTrigger 가드로 자동 해결
  └─────────────────────────────────────┘

Phase 3: 구조 개선
  ┌─────────────────────────────────────┐
  │ I2: nextPhaseMap DRY 통합           │ automation.js → 단일 소스
  │   ↓                                 │
  │ I3: level 매핑 함수                  │ toLevelString/fromLevelString
  └─────────────────────────────────────┘

Phase 4: 버전 업데이트
  ┌─────────────────────────────────────┐
  │ Version sync → 2.1.5               │ 5개 파일
  └─────────────────────────────────────┘
```

**의존성 그래프**:

```
I1 ──→ F3 ──→ F2 (자동 해결)
               │
F1 ──→ I4     │
               │
F4 (독립)      │
               │
I2 (독립) ─────┘
I3 (독립)
```

---

## 9. Version Sync Plan

버전 문자열 `2.1.5` 업데이트 대상 파일:

| # | 파일 | 현재 값 | 변경 필드 |
|---|------|---------|-----------|
| 1 | `bkit.config.json` | `"2.1.4"` | `version` |
| 2 | `.claude-plugin/plugin.json` | `"2.1.4"` | `version` |
| 3 | `.claude-plugin/marketplace.json` | `"2.1.4"` | `version` |
| 4 | `hooks/hooks.json` | `"2.1.4"` | 주석/헤더 |
| 5 | `hooks/session-start.js` | `"2.1.4"` | 주석 내 버전 |

> v2.1.3 #65 패턴 재발 방지: 5개 파일 모두 일괄 업데이트 확인. 누락 시 pre-release scanner에서 CRITICAL 검출되어야 함.

---

## 10. Test Plan

### 10.1 L1 Unit Tests

| # | Test | File | 대상 함수 | 검증 내용 |
|---|------|------|-----------|-----------|
| U1 | shouldAutoAdvance 매트릭스 | `lib/pdca/automation.js` | `shouldAutoAdvance()` | Section 5.2 매트릭스 전체 조합 (phase × level = 8×3 = 24 케이스) |
| U2 | toLevelString 변환 | `lib/pdca/automation.js` | `toLevelString()` | L0→'manual', L1→'manual', L2→'semi-auto', L3→'full-auto', L4→'full-auto' |
| U3 | fromLevelString 변환 | `lib/pdca/automation.js` | `fromLevelString()` | 'manual'→0, 'semi-auto'→2, 'full-auto'→3, undefined→0 |
| U4 | Level roundtrip | `lib/pdca/automation.js` | 양방향 | `toLevelString(fromLevelString(x))` 일관성 검증 |
| U5 | determinePdcaTransition | `lib/pdca/automation.js` | `determinePdcaTransition()` | 각 phase별 전이 결과 + 조건부 전이(check, qa) |
| U6 | generateAutoTrigger | `lib/pdca/automation.js` | `generateAutoTrigger()` | plan→{skill:'pdca', args:'design {feature}'}, design→{skill:'pdca', args:'do {feature}'} |
| U7 | imports contextParts 주입 | `scripts/user-prompt-handler.js` | Section 6 | processMarkdownWithImports 결과가 contextParts에 포함되는지 mock 검증 |

### 10.2 L2 Integration Tests

| # | Test | Scenario | Expected |
|---|------|----------|----------|
| I-T1 | Auto-advance 전체 흐름 | semi-auto + plan phase 완료 mock | shouldAutoAdvance=true → generateAutoTrigger 생성 → guidance에 MUST execute 포함 |
| I-T2 | Import → contextParts 파이프라인 | processMarkdownWithImports → contextParts → additionalContext | template 구조 요약이 최종 JSON output에 포함 |
| I-T3 | DRY 통합 일관성 | automation.js PDCA_PHASE_TRANSITIONS vs 기존 pdca-skill-stop.js 데이터 | 모든 phase 전이가 동일한 결과 |
| I-T4 | Error feedback 파이프라인 | processMarkdownWithImports에서 에러 발생 mock | errors가 contextParts에 WARNING으로 포함 |

### 10.3 E2E Tests

Plan Phase 5.2에서 정의한 7개 시나리오:

| # | Scenario | 절차 | 기대 결과 |
|---|----------|------|-----------|
| E1 | imports 주입 확인 | `--plugin-dir .` 세션에서 `/pdca plan test-feature` 실행 | CC 컨텍스트에 template structure 포함, 템플릿 구조 문서 생성 |
| E2 | full-auto 전이 | `/control level L4` 후 `/pdca plan test-feature` 실행 | plan 완료 후 자동으로 design phase 시작 |
| E3 | semi-auto 전이 | `/control level L2` 후 `/pdca plan test-feature` 실행 | plan 완료 후 자동으로 design phase 시작 (I1 적용) |
| E4 | manual 전이 | `/control level L0` 후 `/pdca plan test-feature` 실행 | plan 완료 후 Executive Summary + 사용자 선택 (기존 동작 유지) |
| E5 | qa→report 전이 | L4에서 qa phase 완료 | 자동으로 report phase 시작 |
| E6 | imports 실패 피드백 | 존재하지 않는 template 경로 설정 | additionalContext에 WARNING 메시지 포함 |
| E7 | 무한 루프 방지 | L4에서 의도적으로 같은 phase 반복 유도 | maxIterations 도달 시 manual 전환 |

### 10.4 Regression Tests

| # | 항목 | 확인 사항 |
|---|------|-----------|
| R1 | 기존 PDCA manual 모드 | L0/L1에서 기존 동작 (Executive Summary + 사용자 선택) 변화 없음 |
| R2 | 기존 hooks 동작 | hooks.json 변경 없는 hook들의 정상 동작 확인 |
| R3 | MCP 서버 | bkit-pdca, bkit-analysis MCP 서버 정상 응답 |
| R4 | v2.1.3 수정사항 | #65 (qa action), #66 (permission-manager), #67 (MCP config) 재발 없음 |
| R5 | unified-stop.js | autoTrigger가 pdca-skill-stop.js 자체 출력(L436 `process.exit(0)`)으로 처리됨 확인. unified-stop.js에 영향 없음 |

---

## 11. Risk Mitigation

| # | 위험 | 확률 | 영향 | 대응 |
|---|------|------|------|------|
| R1 | CC가 additionalContext의 `[AUTO-TRANSITION]` 지시를 무시 | 중 (20-30%) | 높 | F4 (SKILL.md Read 지시)로 이중 방어. `[AUTO-TRANSITION]` 키워드를 CC의 규칙 준수 패턴("You MUST", "Do NOT")에 맞춰 강화. 실패 시 v2.2.0에서 Signal file(E1)로 3중 방어 |
| R2 | imports 주입으로 토큰 과다 소비 | 낮 (10%) | 중 | Section heading 요약만 주입 (~75 tokens). 전체 template content(2000-5000 tokens) 대비 97% 절감. `truncateContext()`에 의한 추가 보호 |
| R3 | autoTrigger 강화가 무한 루프 유발 | 낮 (5%) | 높 | Circuit breaker (동일 phase 연속 실패 시 manual), maxIterations (기본 5회), Quality gate (verdict=fail 시 차단). 3중 보호 |
| R4 | semi-auto 확장이 의도치 않은 전이 유발 | 낮 (10%) | 중 | `plan`/`design`만 추가 (문서 생성 단계). `do`/`act`/`report`는 semi-auto에서 여전히 수동. `/control level L0`으로 즉시 되돌릴 수 있음 |
| R5 | I2 DRY 통합이 기존 동작 변경 | 낮 (5%) | 중 | 통합 전후 `determinePdcaTransition()` 반환값 단위 테스트 비교. 모든 phase × context 조합에서 동일 결과 확인. PDCA_PHASE_TRANSITIONS 내용은 동일하게 유지 |
| R6 | SKILL.md step 번호 재배치로 기존 참조 깨짐 | 낮 (5%) | 낮 | SKILL.md body는 CC의 런타임 프롬프트이며 외부에서 step 번호를 참조하는 코드 없음. step 내용이 동일하면 동작 동일 |

---

## 12. unified-stop.js 영향 분석

### 12.1 autoTrigger 처리 불필요 근거

`scripts/pdca-skill-stop.js`는 **자체적으로 JSON 출력 후 `process.exit(0)`을 호출**한다 (line 436-437, line 495-496). `unified-stop.js`가 pdca-skill-stop.js를 `require()`로 로드하면 (line 291: `executeHandler(SKILL_HANDLERS[activeSkill], hookContext)`), pdca-skill-stop.js의 모듈 레벨 코드가 실행되면서 `console.log(JSON.stringify(response))` → `process.exit(0)`이 호출된다.

따라서 `unified-stop.js`의 후속 코드 (line 295 이후: state machine, checkpoint, quality gate 등)는 **pdca skill의 경우 실행되지 않는다**. autoTrigger는 pdca-skill-stop.js의 JSON 응답에 포함되어 CC에 직접 전달된다.

### 12.2 결론

`unified-stop.js`에 autoTrigger 처리 코드를 추가할 필요 없음. GAP-H (unified-stop.js의 autoTrigger 무시) 문제는 **pdca-skill-stop.js 자체에서 해결** (F3에 의해 guidance에 강제 지시 포함).

---

## Meta

| Key | Value |
|-----|-------|
| **PDCA Phase** | Design |
| **Feature** | bkit-v215-issue-73-74-fix |
| **Author** | Claude Opus 4.6 |
| **Date** | 2026-04-13 |
| **Plan Reference** | `docs/01-plan/features/bkit-v215-issue-73-74-fix.plan.md` |
| **Analysis Reference** | `docs/03-analysis/bkit-v215-issue-73-74-analysis.analysis.md` |
| **Total Files** | 12 (MODIFY 11, 확인 1) |
| **Total Changes** | ~150줄 (추가 ~100, 삭제 ~85, 수정 ~50) |
| **Estimated Time** | P0+P1 구현 ~4시간, 검증 ~2시간, 총 ~6시간 |
