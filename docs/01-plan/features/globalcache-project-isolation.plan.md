# globalcache-project-isolation 계획서

> **요약**: PLUGIN_DATA 백업/복원 시 프로젝트 검증 누락으로 인한 크로스 프로젝트 상태 오염 버그 수정
>
> **프로젝트**: bkit-claude-code
> **버전**: 2.0.0
> **작성자**: Claude
> **날짜**: 2026-03-21
> **상태**: Draft
> **이슈**: [GitHub #48](https://github.com/popup-studio-ai/bkit-claude-code/issues/48)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **문제** | `CLAUDE_PLUGIN_DATA` 백업이 플러그인 전역 경로에 저장되어, 새 프로젝트 설치 시 다른 프로젝트의 PDCA 상태가 무검증 복원됨 (이슈 #48) |
| **해결** | 백업 시 프로젝트 식별자를 메타데이터로 저장하고, 복원 시 현재 프로젝트와 일치 여부를 검증하는 가드 로직 추가 |
| **기능/UX 효과** | 멀티 프로젝트 환경에서 bkit 설치/전환 시 각 프로젝트가 독립된 깨끗한 PDCA 상태로 시작됨 |
| **핵심 가치** | 프로젝트 간 데이터 무결성 보장 — "내 프로젝트에는 내 데이터만" 원칙 확립 |

---

## 1. 개요

### 1.1 목적

GitHub 이슈 #48에서 보고된 **크로스 프로젝트 상태 오염 버그**를 수정한다. 프로젝트 A에서 사용한 bkit의 PDCA 상태가 프로젝트 B에 그대로 복원되는 문제를 해결하여, 각 프로젝트의 PDCA 상태가 완전히 격리되도록 한다.

### 1.2 배경

v1.6.2에서 도입된 ENH-119 (`CLAUDE_PLUGIN_DATA` 백업/복원)는 "플러그인 업데이트, 재설치, 크래시 시에도 작업이 살아남는다"는 목적으로 설계되었다. 그러나 `CLAUDE_PLUGIN_DATA` 경로(`~/.claude/plugins/data/bkit-bkit-marketplace/backup/`)는 **플러그인 전역**이므로 프로젝트 단위가 아닌 bkit 플러그인 단위로 공유된다.

**재현 시나리오:**
1. 프로젝트 A에서 bkit 사용 → `savePdcaStatus()` → `backupToPluginData()` → 전역 백업에 A 상태 저장
2. 프로젝트 B에 bkit 설치 → SessionStart → `.bkit/state/pdca-status.json` 미존재
3. `restoreFromPluginData()` → 조건 충족 (`!destExists && backupExists`) → A의 상태가 B에 복사

**부차적 문제:**
- `globalCache`(in-memory Map)가 고정 키 `'pdca-status'`를 사용하여 같은 세션 내 프로젝트 전환 시 캐시 오염 가능 (TTL 5초로 영향 제한적)

### 1.3 관련 문서

- 이슈: [GitHub #48 — globalCache not isolated per project](https://github.com/popup-studio-ai/bkit-claude-code/issues/48)
- ENH-119: `${CLAUDE_PLUGIN_DATA}` 영구 상태 (v1.6.2 도입)

---

## 2. 범위

### 2.1 In Scope

- [x] `backupToPluginData()`: 백업 시 프로젝트 식별 메타데이터(`meta.json`) 저장
- [x] `restoreFromPluginData()`: 복원 시 프로젝트 일치 검증 가드 추가
- [x] `globalCache`: 캐시 키에 프로젝트 경로 포함하여 격리
- [x] 기존 백업 파일과의 하위 호환성 처리 (meta.json 없는 기존 백업)

### 2.2 Out of Scope

- `CLAUDE_PLUGIN_DATA` 경로 구조 자체의 변경 (CC 내부 구조)
- 프로젝트별 별도 백업 디렉토리 분리 (과도한 복잡성)
- `globalCache` 모듈의 전면 리팩토링

---

## 3. 요구사항

### 3.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|----------|----------|------|
| FR-01 | `backupToPluginData()` 호출 시 `meta.json`에 `projectDir`을 함께 저장한다 | High | Pending |
| FR-02 | `restoreFromPluginData()` 호출 시 `meta.json`의 `projectDir`과 현재 `PROJECT_DIR`을 비교하여, 불일치 시 복원을 건너뛴다 | High | Pending |
| FR-03 | `meta.json`이 없는 레거시 백업은 복원하지 않는다 (안전 우선) | High | Pending |
| FR-04 | `globalCache`에서 `'pdca-status'` 키를 프로젝트 경로 기반으로 네임스페이스한다 | Medium | Pending |
| FR-05 | 복원 건너뜀 시 `skipped` 배열에 명확한 사유를 포함한다 | Low | Pending |

### 3.2 비기능 요구사항

| 범주 | 기준 | 검증 방법 |
|------|------|-----------|
| 하위 호환성 | meta.json 없는 기존 백업에 대해 에러 없이 동작 | 기존 백업 디렉토리 시뮬레이션 테스트 |
| 성능 | 추가 파일 I/O(meta.json)로 인한 지연 무시 수준 (<5ms) | SessionStart 시간 측정 |
| 안정성 | meta.json 파싱 실패 시 graceful 스킵 (크래시 방지) | 손상된 meta.json 테스트 |

---

## 4. 성공 기준

### 4.1 완료 정의 (Definition of Done)

- [ ] 프로젝트 A 백업 → 프로젝트 B 설치 시 A의 상태가 B에 복원되지 않음
- [ ] 프로젝트 A 백업 → 프로젝트 A 재설치 시 A의 상태가 정상 복원됨
- [ ] meta.json 없는 레거시 백업 환경에서 에러 없이 스킵됨
- [ ] globalCache가 프로젝트 간 격리됨
- [ ] 모든 기존 테스트 통과

### 4.2 품질 기준

- [ ] Gap Analysis Match Rate ≥ 90%
- [ ] 수정 파일 수 ≤ 5개
- [ ] 추가 코드 ≤ 50 LOC (최소 변경 원칙)

---

## 5. 리스크 및 완화

| 리스크 | 영향 | 가능성 | 완화 방안 |
|--------|------|--------|-----------|
| meta.json 쓰기 실패 시 백업 기능 전체 중단 | Medium | Low | meta.json 쓰기를 try-catch로 감싸고, 실패해도 기존 백업은 정상 수행 |
| 기존 사용자의 레거시 백업이 복원 안 됨 | Medium | Medium | 최초 1회는 경고 로그 출력 후 새로운 meta.json 자동 생성 |
| PROJECT_DIR 값이 심볼릭 링크 등으로 불일치 | Low | Low | `fs.realpathSync`로 정규화 후 비교 |
| globalCache 키 변경으로 기존 캐시 로직에 사이드 이펙트 | Low | Low | `status.js`의 get/set 호출부만 수정, 다른 모듈의 캐시 키는 미변경 |

---

## 6. 아키텍처 고려사항

### 6.1 프로젝트 레벨

| 레벨 | 특성 | 적합 대상 | 선택 |
|------|------|-----------|:----:|
| **Starter** | 단순 구조 | 정적 사이트 | ☐ |
| **Dynamic** | Feature 기반 모듈 | 웹앱, SaaS | ☐ |
| **Enterprise** | 엄격한 레이어 분리 | 대규모 시스템 | ☐ |

> 본 수정은 bkit 내부 모듈 버그 수정으로, 프로젝트 레벨과 무관하게 적용됨.

### 6.2 핵심 아키텍처 결정

| 결정 | 선택지 | 선택 | 근거 |
|------|--------|------|------|
| 프로젝트 식별 방식 | (A) projectDir 경로 저장 / (B) 해시 저장 / (C) package.json name | A: projectDir 경로 | 가장 직관적이고 디버깅 용이. 이슈 제안과 동일 |
| meta.json 위치 | (A) 백업 디렉토리 내 / (B) 각 백업 파일 옆 | A: 백업 디렉토리 내 | 단일 파일로 모든 백업의 출처를 관리 |
| 레거시 처리 | (A) 무조건 복원 / (B) 무조건 스킵 / (C) 경고 후 복원 | B: 무조건 스킵 | 안전 우선. 잘못된 복원이 깨끗한 초기화보다 위험 |
| 캐시 키 전략 | (A) `pdca-status:${path}` / (B) 캐시 무효화 | A: 네임스페이스 키 | 동일 세션 내 프로젝트 전환까지 대비 |

---

## 7. 수정 대상 파일

| 파일 | 변경 내용 | 우선순위 |
|------|-----------|----------|
| `lib/core/paths.js` | `backupToPluginData()` — meta.json 저장, `restoreFromPluginData()` — 프로젝트 검증 | High |
| `lib/pdca/status.js` | globalCache 키를 프로젝트 경로 기반으로 네임스페이스 | Medium |

---

## 8. 다음 단계

1. [x] Plan 문서 작성
2. [ ] Design 문서 작성 (`globalcache-project-isolation.design.md`)
3. [ ] 구현 (Do)
4. [ ] Gap Analysis (Check)

---

## 버전 이력

| 버전 | 날짜 | 변경사항 | 작성자 |
|------|------|----------|--------|
| 0.1 | 2026-03-21 | 초안 작성 | Claude |
