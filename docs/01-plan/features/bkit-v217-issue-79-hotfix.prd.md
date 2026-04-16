# bkit v2.1.7 — Issue #79 Hotfix + PDCA 워크플로 안정화 PRD

> **버전**: v2.1.7
> **유형**: Hotfix Release
> **작성일**: 2026-04-16
> **기반**: GitHub Issue #79 (rohwonseok-ops), CC v2.1.108→v2.1.110 영향 분석
> **이전 릴리스**: v2.1.6 (Issue #77 hotfix + maintenance, 2026-04-16)

---

## 1. Executive Summary

### 배경
GitHub Issue #79에서 실전 full-auto(L3~L4) 사용자가 **Opus drift 대응 로컬 패치 7건**을 공유. 코드 대조 결과 **P0 버그 2건 확인, P1 설계 이슈 1건 확인**, 나머지 4건은 검토/해당없음.

동시에 CC v2.1.108→v2.1.110 영향 분석에서 **자동 수혜 20건, 코드 수정 0건** 확인. CC 추천 버전 v2.1.110+ 승격. 회귀 4건(#47810/#47855/#47482/#47828) 5릴리스 연속 OPEN.

### 목표
1. PDCA 핵심 워크플로 결함 3건 긴급 수정 (P7, P5, P4)
2. full-auto 체인 안정화 (report phase 완성)
3. 유령 feature 스팸 근절
4. Issue #79 나머지 패치 평가 및 선택적 포함

### 릴리스 기준
- P0 2건(P7, P5) + P1 1건(P4) **필수 포함**
- P3/P6 **선택적 포함** (검증 후 결정)
- P1/P2 **v2.1.8 이후** (모델 drift 정책 결정 필요)

---

## 2. 요구사항 상세

### REQ-01: updatePdcaStatus 인자 순서 수정 [P0 Critical]

**출처**: Issue #79 P7, 코드 대조 확인

**현재 상태** (버그):
```javascript
// lib/pdca/status.js:297 — 함수 시그니처
function updatePdcaStatus(feature, phase, data = {})

// scripts/skill-post.js:229 — 호출부 (인자 반전!)
updatePdcaStatus(phase, feature)
//               ^^^^^ ^^^^^^^  ← 반대로 전달됨
```

**영향**:
- pdca skill 실행 후 PDCA 상태 파일에 phase가 feature 이름으로, feature가 phase로 저장
- `.bkit/state/pdca-status.json` 상태 오염
- 후속 PDCA 명령이 잘못된 feature/phase 참조

**정상 참조** (버그 없음):
```javascript
// scripts/pre-write.js:107 — 올바른 호출
updatePdcaStatus(feature, 'do', { source: 'pre-write' })
```

**수정 요구**:
- `scripts/skill-post.js:229`의 인자 순서를 `updatePdcaStatus(feature, phase)`로 교정
- 1-line fix

**수용 기준**:
- AC-01: pdca skill 실행 후 pdca-status.json의 currentFeature에 feature 이름이 저장됨
- AC-02: pdca-status.json의 currentPhase에 phase 이름이 저장됨
- AC-03: pre-write.js의 기존 호출은 영향 없음

---

### REQ-02: generateAutoTrigger report phase 추가 [P0 Critical]

**출처**: Issue #79 P5, 코드 대조 확인

**현재 상태** (버그):
```javascript
// lib/pdca/automation.js:77-91
const phaseMap = {
  pm:     { skill: 'pdca', args: `plan ${context.feature}` },
  plan:   { skill: 'pdca', args: `design ${context.feature}` },
  design: { skill: 'pdca', args: `do ${context.feature}` },
  do:     { skill: 'pdca', args: `analyze ${context.feature}` },
  check:  ...,
  act:    { skill: 'pdca', args: `analyze ${context.feature}` },
  qa:     ...,
  // ❌ report 키 없음 → generateAutoTrigger('report') returns null
};
```

**영향**:
- qa phase 완료 후 report phase로 전이되면 full-auto 체인이 중단
- L3~L4 자동화 사용자가 수동 개입 필요
- Issue #79 P1(Stop hook decision:block)의 근본 원인 중 하나

**수정 요구**:
- phaseMap에 `report` 키 추가
- report 완료 후 PDCA 사이클 종료 (completion) 처리

**수용 기준**:
- AC-04: `generateAutoTrigger('report')` 호출 시 null이 아닌 completion trigger 반환
- AC-05: full-auto 모드에서 qa → report → completion 체인이 중단 없이 실행

---

### REQ-03: pre-write.js 유령 feature 자동 등록 방지 [P1 High]

**출처**: Issue #79 P4, 코드 대조 확인 (2026-04-13 인시던트)

**현재 상태** (설계 이슈):
```javascript
// scripts/pre-write.js:100-107
feature = extractFeature(filePath);
if (feature) {
  updatePdcaStatus(feature, 'do', { source: 'pre-write' });
  // ↑ 모든 파일 Write에서 무조건 실행 → 유령 feature 등록
}
```

**영향**:
- `extractFeature()`가 파일 경로에서 feature명을 추출하면 무조건 PDCA 'do' 상태 등록
- 의도하지 않은 파일 편집(README, config 등)이 유령 feature 생성
- PDCA 대시보드에 배지 스팸 발생
- `.bkit/state/pdca-status.json` features 배열 오염

**수정 요구**:
- 자동 등록 로직에 **활성 feature 존재 여부 확인** 조건 추가
- 이미 `currentFeature`가 설정된 경우에만 'do' phase 업데이트
- 또는 `extractFeature()` 결과가 현재 활성 feature와 일치할 때만 업데이트

**수용 기준**:
- AC-06: 활성 PDCA feature가 없을 때 파일 Write가 새 feature를 자동 등록하지 않음
- AC-07: 활성 PDCA feature가 있을 때 해당 feature의 소스 파일 Write는 정상적으로 'do' phase 업데이트
- AC-08: 기존 PDCA 워크플로(plan → design → do)는 영향 없음

---

### REQ-04: pdca skill 서브커맨드 phase 매핑 검증 [P1 High]

**출처**: Issue #79 P3, P7 연관

**현재 상태**:
- REQ-01(P7)의 인자 순서 수정 후에도 pdca skill 내부의 서브커맨드 실행 시 `updatePdcaStatus` 호출이 올바르게 이루어지는지 검증 필요
- `pdca-phase: null` 상태로 feature가 상태 파일에 미등록되는 경로 존재 가능

**수정 요구**:
- `scripts/skill-post.js` 전체에서 `updatePdcaStatus` 호출 지점 전수 검사
- pdca skill 서브커맨드(plan, design, do, analyze, report, iterate) 각각에 대해 phase 매핑 정상 여부 확인
- 누락된 서브커맨드가 있으면 매핑 추가

**수용 기준**:
- AC-09: 모든 pdca 서브커맨드 실행 후 pdca-status.json에 올바른 phase가 기록됨
- AC-10: `pdca-phase: null` 상태가 발생하지 않음

---

### REQ-05: gap-detector analysis 문서 생성 경로 검증 [P2 Medium]

**출처**: Issue #79 P6

**현재 상태**:
```yaml
# agents/gap-detector.md:30-32
disallowedTools:
  - Write
  - Edit
```
- gap-detector agent는 **Read-only** (by design)
- analysis 문서 생성은 `scripts/gap-detector-stop.js`가 담당
- Issue 제보: 22 feature 중 2개만 analysis 문서 존재

**수정 요구**:
- `scripts/gap-detector-stop.js`의 analysis 문서 생성 로직 검증
- 문서 생성 실패 경로(파일 권한, 디렉토리 부재 등) 확인
- 필요 시 gap-detector-stop hook에서 `docs/03-analysis/` 디렉토리 자동 생성

**수용 기준**:
- AC-11: gap-detector 실행 완료 후 `docs/03-analysis/features/{feature}.analysis.md` 파일이 정상 생성됨
- AC-12: 디렉토리 부재 시 자동 생성

---

### REQ-06: ff-override 파일 잔존 문제 평가 [해당 없음]

**출처**: Issue #79 P2

**코드 대조 결과**: 현재 v2.1.6 코드베이스에서 `ff-override` 관련 코드 **0건**. 제보자의 로컬 커스터마이징으로 추정.

**판정**: **v2.1.7 범위 외**. 제보자에게 확인 요청 필요.

---

### REQ-07: Stop hook decision:block 정책 평가 [v2.1.8 이후]

**출처**: Issue #79 P1

**내용**: full-auto 모드에서 Opus drift로 인해 Claude가 `autoTrigger` 힌트를 무시하고 세션이 중단되는 문제에 대해, Stop hook에서 `decision:'block'`으로 강제 실행.

**판정**: **v2.1.8 이후 정책 결정**. 이유:
1. REQ-02(P5)의 phaseMap report 누락이 근본 원인 중 하나 → 먼저 수정 후 재평가
2. `decision:'block'`은 **세션 종료를 강제 차단**하는 공격적 접근으로 부작용 위험
3. Opus drift는 모델 측 문제로, bkit 코드에서의 강제 대응은 임시방편
4. v2.1.7에서 P5 수정 후 full-auto 체인이 정상화되면 P1 필요성 재평가

---

## 3. 범위 정의

### v2.1.7 포함 (필수)

| ID | 출처 | 우선순위 | 수정 파일 | 공수 |
|----|------|---------|----------|------|
| REQ-01 | P7 | **P0** | `scripts/skill-post.js:229` | 0.5h |
| REQ-02 | P5 | **P0** | `lib/pdca/automation.js:77-91` | 1h |
| REQ-03 | P4 | **P1** | `scripts/pre-write.js:100-107` | 2h |
| REQ-04 | P3 | **P1** | `scripts/skill-post.js` 전수검사 | 1.5h |

### v2.1.7 포함 (검증 후 결정)

| ID | 출처 | 우선순위 | 수정 파일 | 공수 |
|----|------|---------|----------|------|
| REQ-05 | P6 | **P2** | `scripts/gap-detector-stop.js` | 2h |

### v2.1.7 범위 외

| ID | 출처 | 사유 |
|----|------|------|
| REQ-06 | P2 | 코드베이스에 해당 없음 |
| REQ-07 | P1 | 정책 결정 필요, v2.1.8 이후 |

### 총 공수: ~5h (필수) + 2h (선택) = **5~7h**

---

## 4. CC v2.1.110 연관 사항

v2.1.7 릴리스와 동시에 반영할 CC 분석 결과:

| 항목 | 내용 |
|------|------|
| CC 추천 버전 | v2.1.110+ 승격 (plugin.json 메타데이터 갱신) |
| 연속 호환 | 71개 (v2.1.34→v2.1.110) |
| 회귀 4건 | 모두 OPEN, 방어 레이어(MON-CC-01/02, ENH-214) 유지 |
| ENH-230 (P0) | /recap 충돌 방어 — v2.1.7 범위 검토 |
| 코드 수정 | 0건 (CC 측 변경으로 인한 bkit 수정 불필요) |

---

## 5. 품질 게이트

| Gate | 기준 | 검증 방법 |
|------|------|----------|
| G1 | REQ-01~04 AC 전부 통과 | 수동 PDCA 워크플로 테스트 |
| G2 | pdca-status.json 상태 정합성 | JSON schema 검증 |
| G3 | full-auto chain pm→report 무중단 | L3 모드 E2E 테스트 |
| G4 | 유령 feature 0건 | pre-write 파일 편집 후 상태 확인 |
| G5 | 기존 TC 회귀 없음 | bkit TC suite 실행 |
| G6 | REQ-05 (선택) analysis 문서 생성 | gap-detector 실행 후 파일 확인 |

---

## 6. 리스크 및 제약

| 리스크 | 영향 | 완화 |
|--------|------|------|
| P7 수정 후 기존 오염된 pdca-status.json | 기존 상태 파일 불일치 | 마이그레이션 또는 /clear 가이드 |
| P4 자동 등록 제거 시 정상 워크플로 영향 | 'do' phase 자동 전이 누락 가능 | 활성 feature 조건만 추가 (완전 제거 아님) |
| Opus drift 지속 시 P1 재요청 | full-auto 체인 재중단 | P5 수정으로 일차 완화, P1은 v2.1.8 판단 |

---

## 7. 이해관계자

| 역할 | 담당 |
|------|------|
| Issue 제보자 | rohwonseok-ops (#79) |
| 릴리스 관리 | kay@popupstudio.ai |
| 영향 범위 | full-auto(L3~L4) 사용자 전체 |

---

## 8. 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| PDCA 상태 오염 | 발생 (P7 버그) | **0건** |
| full-auto 체인 완주율 | report에서 중단 | **100% 완주** |
| 유령 feature 등록 | 발생 (P4) | **0건** |
| 수동 개입 횟수 (full-auto) | 매 단계 | **0회** (P5 수정 후) |
