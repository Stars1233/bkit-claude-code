# bkit v2.1.5 Quality Hardening Phase 2 — Plan

**Feature**: `bkit-v215-quality-hardening-p2`
**버전**: 2.1.5
**작성일**: 2026-04-13
**목표**: Phase 1에서 발견된 46+ "Built But Not Wired" 패턴의 탐지 자동화 + Skill 우회 방지 + /bkit 도움말 스킬 신규
**방법**: L4 Full-Auto PDCA
**상태**: Draft

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **문제** | 3-agent 분석 결과: (1) CC가 PDCA 문서를 Skill 없이 직접 Write/Edit하여 hook 우회 (#75), (2) lib/ 내 46+ 함수가 export만 되고 실제 호출 없음 ("Built But Not Wired"), (3) /bkit 도움말 스킬 미존재, (4) wiring 이슈를 탐지하는 스캐너 부재 |
| **해결 방법** | 4개 항목 구현: pre-write.js PDCA 우회 가드, wiring 스캐너, /bkit 도움말 스킬, pre-release 통합 |
| **기능/UX 효과** | 배포 전 wiring 이슈 자동 탐지, PDCA 문서 직접 쓰기 시 경고, /bkit로 전체 기능 목록 확인 |
| **핵심 가치** | Phase 1의 스캐너 인프라 위에 wiring 탐지 계층 추가. "export했지만 안 쓰이는 코드" 패턴을 자동 포착 |

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| Feature 이름 | bkit-v215-quality-hardening-p2 |
| 타깃 버전 | bkit v2.1.5 |
| 선행 조건 | bkit v2.1.4 (Quality Hardening Phase 1 완료) |
| CC 호환 범위 | v2.1.34~v2.1.104 (66개 연속 호환) |

---

## 2. 범위 (Scope)

### 2.1 In Scope — 4개 항목

| # | 항목 | 파일 | 예상 LOC |
|---|------|------|----------|
| 1 | **#75 Skill 우회 가드** | `scripts/pre-write.js` | ~20줄 |
| 2 | **Wiring 스캐너** | `lib/qa/scanners/wiring.js` (신규) | ~150줄 |
| 3 | **/bkit 도움말 스킬** | `skills/bkit/SKILL.md` (신규) | ~100줄 |
| 4 | **Pre-release 스캐너 통합** | `scripts/qa/pre-release-check.sh`, `lib/qa/index.js` | ~10줄 |

### 2.2 Out of Scope

- 46개 unwired 함수의 실제 수정 (v2.2.0)
- Integration test 프레임워크 (v2.2.0)
- 기존 4개 스캐너 개선

---

## 3. 성공 기준

| 기준 | 측정 방법 |
|------|-----------|
| pre-release 스캐너가 wiring 이슈를 탐지 | `bash scripts/qa/pre-release-check.sh` 에 5개 스캐너 출력 |
| /bkit 스킬이 정상 로드 | `skills/bkit/SKILL.md` 존재 + 유효 frontmatter |
| #75 가드가 PDCA 우회 시 경고 | pre-write.js 에 PDCA 경로 패턴 매칭 코드 존재 |
| 모든 변경 파일이 syntax error 없음 | `node -e "require('./path')"` 성공 |

---

## 4. 위험 요소

| 위험 | 영향 | 완화 |
|------|------|------|
| Wiring 스캐너 false positive | INFO 레벨 노이즈 | severity를 INFO/WARNING으로 구분, critical module만 WARNING |
| CLAUDE_SKILL_NAME 환경변수 미설정 | #75 가드 미작동 | fallback 로직 포함, 경고만 (block 아님) |
| /bkit 스킬 description 250자 초과 | CC 로딩 실패 | 250자 이내로 작성 |

---

## 5. 일정

| 단계 | 시간 |
|------|------|
| Plan + Design | 5분 |
| Implementation | 15분 |
| Gap Check + QA | 10분 |
| Report | 5분 |
| **합계** | ~35분 |
