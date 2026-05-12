# bkit v2.1.7 — Issue #79 Hotfix 상세 설계

> **Feature**: bkit-v217-issue-79-hotfix
> **Phase**: Design
> **작성일**: 2026-04-16
> **Plan**: bkit-v217-issue-79-hotfix.plan.md
> **PRD**: bkit-v217-issue-79-hotfix.prd.md

---

## 1. 아키텍처 개요

### 변경 범위

```
scripts/
├── skill-post.js          ← REQ-01: line 229 인자 순서 교정
├── pre-write.js           ← REQ-03: line 100-116 유령 feature 방지
└── gap-detector-stop.js   ← REQ-05: analysis 문서 생성 추가

lib/pdca/
└── automation.js          ← REQ-02: line 64, 77-91 report/completed phase
```

### 데이터 흐름 (수정 후)

```
[pdca skill 실행]
    ↓
skill-post.js:229
    updatePdcaStatus(feature, phase)  ← REQ-01 수정
    ↓
[pdca-skill-stop.js]
    action='report' → currentPhaseForAuto='completed'
    ↓
shouldAutoAdvance('completed')
    full-auto: true
    ↓
generateAutoTrigger('completed')
    → { complete: true }  ← REQ-02 추가
    ↓
pdca-skill-stop.js
    autoTrigger.complete === true
    → "[PDCA-COMPLETE]" 지시어 생성  ← REQ-02 연동

[파일 Write]
    ↓
pre-write.js:100-116
    extractFeature(filePath) → feature
    activeFeature = getPdcaStatusFull().currentFeature
    activeFeature === feature?
      YES → updatePdcaStatus(feature, 'do')
      NO  → skip (유령 방지)  ← REQ-03
```

---

## 2. 상세 설계

### D-01: skill-post.js 인자 순서 교정 (REQ-01)

**파일**: `scripts/skill-post.js`
**줄**: 229
**변경 유형**: 1-line bug fix

#### Before
```javascript
// scripts/skill-post.js:228-230
if (feature) {
  updatePdcaStatus(phase, feature);  // ❌ 인자 반전
  debugLog('SkillPost', 'PDCA status updated', { phase, feature });
}
```

#### After
```javascript
// scripts/skill-post.js:228-230
if (feature) {
  updatePdcaStatus(feature, phase);  // ✅ (feature, phase) 순서
  debugLog('SkillPost', 'PDCA status updated', { feature, phase });
}
```

**변경 근거**:
- `lib/pdca/status.js:297`: `function updatePdcaStatus(feature, phase, data = {})`
- 시그니처는 `(feature, phase)` 순서
- 나머지 7개 호출 지점은 모두 정상 (전수 검증 완료)

**영향 범위**: skill-post.js만. 외부 인터페이스 변경 없음.

**주의**: debugLog의 `{ phase, feature }` → `{ feature, phase }`로 순서 통일 (가독성)

---

### D-02: generateAutoTrigger report/completed phase 추가 (REQ-02)

**파일**: `lib/pdca/automation.js`
**변경**: 2곳

#### D-02a: phaseMap 확장 (line 77-91)

**Before**:
```javascript
const phaseMap = {
  pm:     { skill: 'pdca', args: `plan ${context.feature}` },
  plan:   { skill: 'pdca', args: `design ${context.feature}` },
  design: { skill: 'pdca', args: `do ${context.feature}` },
  do:     { skill: 'pdca', args: `analyze ${context.feature}` },
  check:  context.matchRate >= 100
    ? { skill: 'qa-phase', args: context.feature }
    : { skill: 'pdca', args: `iterate ${context.feature}` },
  act:    { skill: 'pdca', args: `analyze ${context.feature}` },
  qa:     context.qaPassRate >= 95 && context.qaCriticalCount === 0
    ? { skill: 'pdca', args: `report ${context.feature}` }
    : { skill: 'pdca', args: `iterate ${context.feature}` },
};
```

**After**:
```javascript
const phaseMap = {
  pm:     { skill: 'pdca', args: `plan ${context.feature}` },
  plan:   { skill: 'pdca', args: `design ${context.feature}` },
  design: { skill: 'pdca', args: `do ${context.feature}` },
  do:     { skill: 'pdca', args: `analyze ${context.feature}` },
  check:  context.matchRate >= 100
    ? { skill: 'qa-phase', args: context.feature }
    : { skill: 'pdca', args: `iterate ${context.feature}` },
  act:    { skill: 'pdca', args: `analyze ${context.feature}` },
  qa:     context.qaPassRate >= 95 && context.qaCriticalCount === 0
    ? { skill: 'pdca', args: `report ${context.feature}` }
    : { skill: 'pdca', args: `iterate ${context.feature}` },
  report:    { complete: true, feature: context.feature },
  completed: { complete: true, feature: context.feature },
};
```

**설계 결정**:
- `report`와 `completed` 두 키 모두 추가 (pdca-skill-stop.js에서 `report` action → `completed` phase로 매핑하므로 둘 다 필요)
- `{ complete: true }` 플래그로 PDCA 사이클 종료를 명시적으로 신호
- `skill: null`이 아닌 `complete: true`를 사용하여 의도를 명확히 함

#### D-02b: semiAutoPhases 확장 (line 64)

**Before**:
```javascript
const semiAutoPhases = ['plan', 'design', 'check', 'qa'];
```

**After**:
```javascript
const semiAutoPhases = ['plan', 'design', 'check', 'qa', 'report', 'completed'];
```

**설계 결정**: report/completed도 semi-auto에서 자동 처리 대상에 포함. 수동 확인 없이 completion 신호를 생성.

#### D-02c: pdca-skill-stop.js 연동 (line 196-211)

**파일**: `scripts/pdca-skill-stop.js`

**Before** (line 196-211):
```javascript
if (autoTrigger) {
  const nextCommand = autoTrigger.skill
    ? `/${autoTrigger.skill} ${autoTrigger.args || feature || ''}`
    : null;
  if (nextCommand) {
    guidance += [
      '',
      '',
      `[AUTO-TRANSITION] Phase "${action}" completed successfully.`,
      `You MUST now execute: ${nextCommand}`,
      // ...
    ].join('\n');
  }
}
```

**After** (line 196-215):
```javascript
if (autoTrigger) {
  if (autoTrigger.complete) {
    // REQ-02: PDCA cycle completion
    guidance += [
      '',
      '',
      `[PDCA-COMPLETE] Feature "${feature}" PDCA cycle finished successfully.`,
      `All phases (plan → design → do → check → qa → report) completed.`,
      `Generate the completion summary and proceed to the next task.`,
      `Do NOT ask what to do next. The cycle is done.`,
    ].join('\n');
    debugLog('Skill:pdca:Stop', 'PDCA cycle completed', { feature, action });
  } else {
    const nextCommand = autoTrigger.skill
      ? `/${autoTrigger.skill} ${autoTrigger.args || feature || ''}`
      : null;
    if (nextCommand) {
      guidance += [
        '',
        '',
        `[AUTO-TRANSITION] Phase "${action}" completed successfully.`,
        `You MUST now execute: ${nextCommand}`,
        `Do NOT ask the user for confirmation. Do NOT show Executive Summary.`,
        `Do NOT stop. Proceed immediately to the next phase.`,
      ].join('\n');
    }
  }
  debugLog('Skill:pdca:Stop', 'Auto-advance triggered', { autoTrigger });
}
```

---

### D-03: pre-write.js 유령 feature 방지 (REQ-03)

**파일**: `scripts/pre-write.js`
**줄**: 99-116
**변경 유형**: 조건 추가 (기존 로직 보존)

#### Before
```javascript
// scripts/pre-write.js:99-116
if (isSourceFile(filePath)) {
  feature = extractFeature(filePath);

  if (feature) {
    designDoc = findDesignDoc(feature);
    planDoc = findPlanDoc(feature);

    // Update PDCA status to "do" phase when source file is being written
    updatePdcaStatus(feature, 'do', {
      lastFile: filePath
    });

    debugLog('PreToolUse', 'PDCA status updated', {
      feature,
      phase: 'do',
      hasDesignDoc: !!designDoc
    });
  }
}
```

#### After
```javascript
// scripts/pre-write.js:99-116
if (isSourceFile(filePath)) {
  feature = extractFeature(filePath);

  if (feature) {
    designDoc = findDesignDoc(feature);
    planDoc = findPlanDoc(feature);

    // REQ-03: Only update PDCA status if feature matches active PDCA feature
    // Prevents phantom feature registration (Issue #79 P4)
    const currentStatus = getPdcaStatusFull();
    const activeFeature = currentStatus?.currentFeature;

    if (activeFeature && activeFeature === feature) {
      updatePdcaStatus(feature, 'do', {
        lastFile: filePath
      });
      debugLog('PreToolUse', 'PDCA status updated', {
        feature,
        phase: 'do',
        hasDesignDoc: !!designDoc
      });
    } else if (!activeFeature) {
      debugLog('PreToolUse', 'Skipped auto-registration: no active feature', {
        extracted: feature
      });
    } else {
      debugLog('PreToolUse', 'Skipped auto-registration: feature mismatch', {
        extracted: feature,
        active: activeFeature
      });
    }
  }
}
```

#### Import 변경

**Before** (line 30):
```javascript
const { updatePdcaStatus } = require('../lib/pdca/status');
```

**After** (line 30):
```javascript
const { updatePdcaStatus, getPdcaStatusFull } = require('../lib/pdca/status');
```

**설계 결정**:
1. **완전 제거가 아닌 조건 추가**: `extractFeature()`와 `findDesignDoc()`/`findPlanDoc()` 호출은 유지 (PDCA 문서 체크에 필요)
2. **일치 조건**: `activeFeature === feature` — 정확 일치. 부분 일치나 prefix 매칭은 의도치 않은 등록 위험
3. **activeFeature 없을 때**: skip (유령 방지). 기존에는 무조건 등록이었으나, PDCA 워크플로 진입 전에는 등록하지 않음
4. **debug 로그 분기**: skip 사유를 명확히 기록하여 디버깅 지원

**영향 분석**:
- 정상 PDCA 워크플로: `/pdca plan {feature}` → feature 등록 → 소스 파일 Write → `activeFeature === feature` → 정상 'do' 업데이트 ✅
- 유령 feature: PDCA 미시작 상태에서 파일 편집 → `activeFeature = null` → skip ✅
- 다른 feature 작업 중: feature A 활성 + feature B 파일 편집 → `activeFeature !== feature` → skip ✅

---

### D-04: gap-detector-stop.js analysis 문서 생성 (REQ-05)

**파일**: `scripts/gap-detector-stop.js`
**삽입 위치**: line ~496 (response 객체 생성 직전)
**변경 유형**: 기능 추가 (기존 로직 무영향)

#### 추가 코드

```javascript
// REQ-05: Generate analysis document (Issue #79 P6)
// gap-detector agent is Read-only by design (disallowedTools: Write, Edit)
// The stop hook handles analysis document generation instead
try {
  if (feature && feature !== 'unknown' && matchRate !== undefined) {
    const analysisDir = path.join(process.cwd(), 'docs', '03-analysis', 'features');
    if (!fs.existsSync(analysisDir)) {
      fs.mkdirSync(analysisDir, { recursive: true });
    }

    const analysisPath = path.join(analysisDir, `${feature}.analysis.md`);
    const timestamp = new Date().toISOString();

    const analysisContent = [
      `# Gap Analysis: ${feature}`,
      '',
      `> **Match Rate**: ${matchRate}%`,
      `> **Threshold**: ${threshold}%`,
      `> **Iteration**: ${iterCount}`,
      `> **Date**: ${timestamp}`,
      `> **Generated by**: gap-detector-stop hook (v2.1.7)`,
      '',
      '---',
      '',
      '## Result',
      '',
      matchRate >= threshold
        ? `Pass - match rate ${matchRate}% meets threshold ${threshold}%`
        : `Fail - match rate ${matchRate}% below threshold ${threshold}%`,
      '',
      '## Guidance',
      '',
      guidance || 'No specific guidance generated.',
      '',
      '## Next Step',
      '',
      nextStep ? nextStep.message : 'N/A',
    ].join('\n');

    fs.writeFileSync(analysisPath, analysisContent, 'utf-8');
    debugLog('Agent:gap-detector:Stop', 'Analysis doc generated', {
      path: analysisPath,
      matchRate,
      iteration: iterCount
    });
  }
} catch (e) {
  // Non-blocking: analysis doc generation failure should not break the hook
  debugLog('Agent:gap-detector:Stop', 'Analysis doc generation failed', {
    error: e.message,
    feature
  });
}
```

#### Import 확인

`fs`와 `path`는 gap-detector-stop.js에서 이미 사용 중인지 확인 필요. 없으면 상단에 추가:
```javascript
const fs = require('fs');
const path = require('path');
```

**설계 결정**:
1. **Non-blocking**: try-catch으로 래핑. 문서 생성 실패가 hook 전체를 중단하지 않음
2. **덮어쓰기**: 같은 feature의 이전 analysis 파일을 덮어씀 (최신 결과가 유효)
3. **feature !== 'unknown' 조건**: fallback feature명인 'unknown'으로는 문서 미생성
4. **최소 메타데이터**: matchRate, threshold, iteration, date — 추후 확장 가능

---

## 3. 변경 영향 매트릭스

| 파일 | 변경 | 영향 범위 | 회귀 위험 |
|------|------|----------|----------|
| `scripts/skill-post.js:229` | 인자 순서 교정 | pdca skill 후 상태 업데이트만 | **극히 낮음** |
| `lib/pdca/automation.js:64` | semiAutoPhases +2 | semi-auto report 자동 처리 | **낮음** |
| `lib/pdca/automation.js:77-91` | phaseMap +2 키 | full-auto completion 신호 | **낮음** |
| `scripts/pdca-skill-stop.js:196-211` | completion 분기 추가 | report 후 지시어 | **낮음** |
| `scripts/pre-write.js:30,100-116` | import +1, 조건 추가 | 파일 Write PDCA 등록 | **중간** (핵심 경로) |
| `scripts/gap-detector-stop.js:~496` | 문서 생성 추가 | gap-detector 후 파일 생성 | **극히 낮음** (non-blocking) |

---

## 4. 테스트 케이스 상세

### TC-01: skill-post.js 인자 순서 (REQ-01)
```
Given: pdca skill 'plan' 실행, feature = 'test-feature'
When: skill-post.js hook 실행
Then: pdca-status.json.currentFeature === 'test-feature'
  AND pdca-status.json.currentPhase === 'plan'
  NOT pdca-status.json.currentFeature === 'plan'
```

### TC-03: generateAutoTrigger report (REQ-02)
```
Given: generateAutoTrigger('completed', { feature: 'x' })
When: 호출
Then: result.complete === true
  AND result.feature === 'x'
  AND result.skill === undefined
```

### TC-04: full-auto completion chain (REQ-02)
```
Given: full-auto mode, action = 'report'
When: pdca-skill-stop.js 실행
Then: guidance에 '[PDCA-COMPLETE]' 포함
  AND autoTrigger.complete === true
  AND userPrompt === null (사용자 질문 없음)
```

### TC-06: 활성 feature 없을 때 Write (REQ-03)
```
Given: pdca-status.json.currentFeature === null
When: pre-write.js에서 src/features/new-thing/index.ts Write
Then: pdca-status.json에 'new-thing' feature 미등록
  AND debugLog에 'Skipped auto-registration: no active feature'
```

### TC-07: 활성 feature 일치 Write (REQ-03)
```
Given: pdca-status.json.currentFeature === 'my-feature'
When: pre-write.js에서 src/features/my-feature/utils.ts Write
Then: pdca-status.json.features['my-feature'].phase === 'do'
  AND pdca-status.json.features['my-feature'].lastFile 포함
```

### TC-08: 활성 feature 불일치 Write (REQ-03)
```
Given: pdca-status.json.currentFeature === 'feature-a'
When: pre-write.js에서 src/features/feature-b/index.ts Write
Then: pdca-status.json에 'feature-b' feature 미등록
  AND debugLog에 'Skipped auto-registration: feature mismatch'
```

### TC-10: analysis 문서 생성 (REQ-05)
```
Given: gap-detector 실행 완료, feature = 'test-feat', matchRate = 85
When: gap-detector-stop.js hook 실행
Then: docs/03-analysis/features/test-feat.analysis.md 존재
  AND 내용에 'Match Rate: 85%' 포함
```

### TC-11: analysis 디렉토리 자동 생성 (REQ-05)
```
Given: docs/03-analysis/features/ 디렉토리 미존재
When: gap-detector-stop.js hook 실행 (feature='x', matchRate=90)
Then: docs/03-analysis/features/ 디렉토리 자동 생성됨
  AND docs/03-analysis/features/x.analysis.md 존재
```

### TC-12: 회귀 — 기존 PDCA chain (회귀)
```
Given: L2 semi-auto mode
When: /pdca plan test → /pdca design test → src/test/index.ts Write
Then: plan → design → do 전이가 정상
  AND pre-write에서 'test' feature의 'do' 상태 정상 업데이트
```

---

## 5. 롤백 계획

| 단계 | 조건 | 롤백 방법 |
|------|------|----------|
| 1 | REQ-01 수정 후 회귀 | git revert (1-line, 즉시 복구) |
| 2 | REQ-02 수정 후 full-auto 불안정 | automation.js phaseMap에서 report/completed 제거 |
| 3 | REQ-03 수정 후 정상 'do' 전이 실패 | pre-write.js 조건 제거, 이전 무조건 등록 복원 |
| 4 | REQ-05 수정 후 hook 실패 | try-catch으로 격리, 해당 블록 제거만으로 복원 |
| 전체 | v2.1.7 전체 롤백 | `git revert` to v2.1.6 tag |

---

## 6. 마이그레이션 가이드

### 기존 오염된 pdca-status.json 처리

v2.1.6 이하에서 REQ-01(P7) 버그로 인해 오염된 상태 파일:
```json
{
  "currentFeature": "plan",     // ← 실제로는 phase 값
  "currentPhase": "my-feature"  // ← 실제로는 feature 값
}
```

**권장 조치**: `.bkit/state/pdca-status.json` 삭제 후 재시작
```bash
rm .bkit/state/pdca-status.json
# 또는
/pdca status  # 새 세션에서 자동 재생성
```

v2.1.7 릴리스 노트에 포함 필요.

---

## 7. version 갱신

| 파일 | 현재 | 변경 |
|------|------|------|
| `.claude-plugin/plugin.json:3` | `"version": "2.1.6"` | `"version": "2.1.7"` |
| `.claude-plugin/marketplace.json:36` | `"version": "2.1.6"` | `"version": "2.1.7"` |

---

## 8. 변경 요약

| REQ | 파일 | 줄 | 변경 | LOC |
|-----|------|-----|------|-----|
| REQ-01 | scripts/skill-post.js | 229 | 인자 순서 `(phase, feature)` → `(feature, phase)` | 1 |
| REQ-02a | lib/pdca/automation.js | 89-90 | phaseMap에 `report`, `completed` 키 추가 | 2 |
| REQ-02b | lib/pdca/automation.js | 64 | semiAutoPhases에 `'report', 'completed'` 추가 | 1 |
| REQ-02c | scripts/pdca-skill-stop.js | 196-215 | `autoTrigger.complete` 분기 추가 | 10 |
| REQ-03a | scripts/pre-write.js | 30 | import에 `getPdcaStatusFull` 추가 | 1 |
| REQ-03b | scripts/pre-write.js | 107-116 | 활성 feature 일치 조건 추가 | 12 |
| REQ-05 | scripts/gap-detector-stop.js | ~496 | analysis 문서 생성 블록 | 25 |
| version | plugin.json, marketplace.json | 3, 36 | 2.1.6 → 2.1.7 | 2 |
| **합계** | **5 files** | | | **~54 LOC** |
