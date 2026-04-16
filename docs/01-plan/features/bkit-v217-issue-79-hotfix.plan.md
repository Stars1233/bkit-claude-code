# bkit v2.1.7 — Issue #79 Hotfix 구현 계획

> **Feature**: bkit-v217-issue-79-hotfix
> **Phase**: Plan
> **작성일**: 2026-04-16
> **PRD**: bkit-v217-issue-79-hotfix.prd.md

---

## 1. 구현 전략

### 접근 방식: Surgical Hotfix
- 최소 변경, 최대 효과. 4개 파일만 수정.
- 아키텍처 변경 없음. 기존 함수 시그니처/인터페이스 유지.
- full-auto(L3~L4) 안정화에 집중.

### 수정 파일 매트릭스

| 파일 | REQ | 변경 유형 | LOC 변경 | 위험도 |
|------|-----|----------|---------|--------|
| `scripts/skill-post.js:229` | REQ-01 | 인자 순서 교정 | 1 line | 극히 낮음 |
| `lib/pdca/automation.js:77-91` | REQ-02 | phaseMap 키 추가 | 3~5 lines | 낮음 |
| `lib/pdca/automation.js:64` | REQ-02 | semiAutoPhases 추가 | 1 line | 낮음 |
| `scripts/pre-write.js:100-116` | REQ-03 | 조건 추가 | 5~8 lines | 중간 |
| `scripts/skill-post.js` | REQ-04 | 전수 검증 (추가 수정 없음) | 0 lines | 없음 |
| `scripts/gap-detector-stop.js` | REQ-05 | analysis 문서 생성 추가 | 15~25 lines | 중간 |

### 구현 순서

```
Step 1: REQ-01 (P0, 0.5h) — skill-post.js 1-line fix
  ↓
Step 2: REQ-04 (P1, 0.5h) — updatePdcaStatus 전수 검증 (이미 완료, 문서화만)
  ↓
Step 3: REQ-02 (P0, 1h) — automation.js phaseMap + semiAutoPhases
  ↓
Step 4: REQ-03 (P1, 2h) — pre-write.js 유령 feature 방지
  ↓
Step 5: REQ-05 (P2, 2h) — gap-detector-stop.js analysis 문서 생성
  ↓
Step 6: 통합 검증 (1h) — full-auto chain E2E + 회귀 확인
```

---

## 2. 상세 구현 계획

### Step 1: REQ-01 — updatePdcaStatus 인자 순서 수정

**파일**: `scripts/skill-post.js:229`
**변경**:
```javascript
// Before (버그)
updatePdcaStatus(phase, feature);

// After (수정)
updatePdcaStatus(feature, phase);
```

**검증**:
- 전수 검사 결과 (8개 호출 지점):

| 파일:줄 | 호출 | 상태 |
|---------|------|------|
| `skill-post.js:229` | `updatePdcaStatus(phase, feature)` | **버그 → 수정** |
| `pdca-skill-stop.js:257` | `updatePdcaStatus(feature, currentPhase, {...})` | 정상 |
| `gap-detector-stop.js:94` | `updatePdcaStatus(feature, 'check', {...})` | 정상 |
| `pre-write.js:107` | `updatePdcaStatus(feature, 'do', {...})` | 정상 |
| `plan-plus-stop.js:42` | `updatePdcaStatus(feature, 'plan', {...})` | 정상 |
| `iterator-stop.js:288` | `updatePdcaStatus(feature, 'act', {...})` | 정상 |
| `unified-stop.js:347` | `updateStatus(feature, currentPhase, {...})` | 정상 |

**결론**: skill-post.js:229만 수정 필요. 나머지 7개는 정상.

### Step 2: REQ-04 — 전수 검증 문서화

REQ-01의 검증 과정에서 이미 완료. 추가 코드 수정 없음.
- `pdca-phase: null` 경로: `skill-post.js:224`에서 `skillConfig['pdca-phase']`가 null이면 if 블록 미진입 → 정상 (updatePdcaStatus 미호출)

### Step 3: REQ-02 — generateAutoTrigger report phase 추가

**파일 1**: `lib/pdca/automation.js:77-91`
**변경**: phaseMap에 `report` 키 추가

```javascript
const phaseMap = {
  pm: { skill: 'pdca', args: `plan ${context.feature}` },
  plan: { skill: 'pdca', args: `design ${context.feature}` },
  design: { skill: 'pdca', args: `do ${context.feature}` },
  do: { skill: 'pdca', args: `analyze ${context.feature}` },
  check: context.matchRate >= 100
    ? { skill: 'qa-phase', args: context.feature }
    : { skill: 'pdca', args: `iterate ${context.feature}` },
  act: { skill: 'pdca', args: `analyze ${context.feature}` },
  qa: context.qaPassRate >= 95 && context.qaCriticalCount === 0
    ? { skill: 'pdca', args: `report ${context.feature}` }
    : { skill: 'pdca', args: `iterate ${context.feature}` },
  // REQ-02: report phase completion
  report: { skill: null, args: null, complete: true },
};
```

**파일 2**: `lib/pdca/automation.js:64`
**변경**: semiAutoPhases에 `report` 추가 (semi-auto에서도 report 완료 자동화)

```javascript
const semiAutoPhases = ['plan', 'design', 'check', 'qa', 'report'];
```

**report 완료 처리**: phaseMap에서 `{ skill: null, complete: true }`를 반환하면 호출부(pdca-skill-stop.js)에서 completion 처리. 기존 호출부의 `if (autoTrigger)` null 체크로 자연스럽게 분기.

### Step 4: REQ-03 — pre-write.js 유령 feature 방지

**파일**: `scripts/pre-write.js:99-116`
**변경**: 활성 feature 존재 여부 + 일치 여부 확인 조건 추가

```javascript
// Before (모든 파일 Write에서 무조건 등록)
if (isSourceFile(filePath)) {
  feature = extractFeature(filePath);
  if (feature) {
    updatePdcaStatus(feature, 'do', { lastFile: filePath });
  }
}

// After (활성 feature와 일치할 때만 업데이트)
if (isSourceFile(filePath)) {
  feature = extractFeature(filePath);
  if (feature) {
    const currentStatus = getPdcaStatusFull();
    const activeFeature = currentStatus?.currentFeature;

    // Only update if:
    // 1. There's an active PDCA feature, AND
    // 2. The extracted feature matches the active feature
    if (activeFeature && activeFeature === feature) {
      updatePdcaStatus(feature, 'do', { lastFile: filePath });
      debugLog('PreToolUse', 'PDCA status updated', { feature, phase: 'do' });
    } else {
      debugLog('PreToolUse', 'Skipped phantom feature registration', {
        extracted: feature,
        active: activeFeature || 'none'
      });
    }
  }
}
```

**import 추가**: `getPdcaStatusFull`이 이미 import 되어 있는지 확인 필요.

### Step 5: REQ-05 — gap-detector-stop analysis 문서 생성

**파일**: `scripts/gap-detector-stop.js`
**현재 상태**: hook은 JSON output만 반환. 파일 생성 로직 없음.
**변경**: analysis 결과를 `docs/03-analysis/features/{feature}.analysis.md`로 저장

```javascript
// gap-detector-stop.js — analysis 문서 생성 (REQ-05)
try {
  if (feature && matchRate !== undefined) {
    const analysisDir = path.join(process.cwd(), 'docs', '03-analysis', 'features');
    if (!fs.existsSync(analysisDir)) {
      fs.mkdirSync(analysisDir, { recursive: true });
    }
    const analysisPath = path.join(analysisDir, `${feature}.analysis.md`);
    const analysisContent = [
      `# Gap Analysis: ${feature}`,
      '',
      `> Match Rate: ${matchRate}%`,
      `> Date: ${new Date().toISOString()}`,
      `> Iteration: ${iterCount}`,
      '',
      guidance || '',
    ].join('\n');
    fs.writeFileSync(analysisPath, analysisContent, 'utf-8');
    debugLog('Agent:gap-detector:Stop', 'Analysis doc created', { path: analysisPath });
  }
} catch (e) {
  debugLog('Agent:gap-detector:Stop', 'Analysis doc creation failed', { error: e.message });
}
```

**삽입 위치**: response 객체 생성 직전 (현재 line ~500 부근)

---

## 3. 테스트 계획

| TC | REQ | Level | 설명 | 검증 방법 |
|----|-----|-------|------|----------|
| TC-01 | REQ-01 | L1 | skill-post.js 인자 순서 정상 | pdca skill 실행 후 pdca-status.json 확인 |
| TC-02 | REQ-01 | L2 | 기존 호출부 7개 회귀 없음 | 각 hook 실행 후 상태 확인 |
| TC-03 | REQ-02 | L2 | generateAutoTrigger('report') 반환값 검증 | 직접 함수 호출 |
| TC-04 | REQ-02 | L3 | full-auto qa→report→completion 체인 | L3 모드 E2E |
| TC-05 | REQ-02 | L2 | semi-auto report phase 자동 진행 | semiAutoPhases 포함 확인 |
| TC-06 | REQ-03 | L2 | 활성 feature 없을 때 Write → 등록 안 됨 | pre-write 실행 후 상태 확인 |
| TC-07 | REQ-03 | L2 | 활성 feature 있을 때 일치 Write → 정상 업데이트 | pre-write 실행 후 상태 확인 |
| TC-08 | REQ-03 | L2 | 활성 feature와 불일치 Write → 등록 안 됨 | pre-write 실행 후 상태 확인 |
| TC-09 | REQ-04 | L1 | pdca-phase: null 경로 → 미등록 | skillConfig 없는 skill 실행 |
| TC-10 | REQ-05 | L2 | gap-detector 완료 후 analysis 문서 존재 | 파일 시스템 확인 |
| TC-11 | REQ-05 | L2 | docs/03-analysis/ 디렉토리 자동 생성 | 디렉토리 삭제 후 실행 |
| TC-12 | 회귀 | L3 | 기존 PDCA plan→design→do 체인 정상 | 전체 워크플로 |

---

## 4. 품질 게이트

| Gate | 기준 | 통과 조건 |
|------|------|----------|
| G1 | 인자 순서 | TC-01, TC-02 통과 |
| G2 | full-auto 체인 | TC-03, TC-04, TC-05 통과 |
| G3 | 유령 feature | TC-06, TC-07, TC-08 통과 |
| G4 | 회귀 없음 | TC-09, TC-12 통과 |
| G5 | analysis 문서 | TC-10, TC-11 통과 (선택) |

---

## 5. 리스크 완화

| 리스크 | 완화 |
|--------|------|
| 기존 오염된 pdca-status.json | v2.1.7 릴리스 노트에 `/clear` 또는 상태 파일 삭제 가이드 |
| report completion 처리 미비 | phaseMap에 `complete: true` 플래그로 명시적 종료 신호 |
| pre-write 조건 추가로 정상 'do' 전이 누락 | `activeFeature === feature` 일치 조건으로 정상 경로 보존 |
| getPdcaStatusFull import 누락 | pre-write.js 상단에서 기존 import 확인 후 필요시 추가 |

---

## 6. 공수 및 일정

| Step | REQ | 공수 | 누적 |
|------|-----|------|------|
| 1 | REQ-01 | 0.5h | 0.5h |
| 2 | REQ-04 | 0.5h (문서화) | 1h |
| 3 | REQ-02 | 1h | 2h |
| 4 | REQ-03 | 2h | 4h |
| 5 | REQ-05 | 2h | 6h |
| 6 | 통합 검증 | 1h | **7h** |

**예상 완료**: 단일 세션 (~7h)
