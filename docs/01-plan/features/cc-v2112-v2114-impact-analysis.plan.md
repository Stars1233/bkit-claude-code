# CC v2.1.112 → v2.1.114 영향 대응 Plan

> **Status**: 📋 Plan (P0 3건 즉시 구현 대기)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.8 → v2.1.9 (예정)
> **Author**: CTO Team
> **Date**: 2026-04-20
> **Origin**: `docs/04-report/features/cc-v2112-v2114-impact-analysis.report.md`

---

## 1. 목적

CC CLI v2.1.113(40건) + v2.1.114(1건) 변경사항 중 bkit 영향이 확인된 8건 ENH 기회(ENH-245 ~ ENH-252)에 대해 체계적 구현 계획을 수립한다.

**핵심 목표**
1. v2.1.113 네이티브 바이너리 전환으로 인한 환경 요구사항 변경 문서화
2. v2.1.113 #23 `dangerouslyDisableSandbox` 보안 fix에 맞춘 bkit 방어선 강화
3. v2.1.113 #32 long-context `/compact` fix 실측으로 MON-CC-02 방어 판단

**비범위 (Out of Scope)**
- 6건 YAGNI FAIL (Matrix #11/#14/#16/#33, v2.1.114 #1 자동 수혜, ENH-253 초안)
- 추가 자동 수혜 항목 개별 대응 (#17 MCP watchdog, #20 recap, #22 transcript)

---

## 2. 구현 범위

### 2.1 P0 (즉시 구현, 3건)

#### ENH-245: 최소 요구사항 문서화 (1.5h)

**목적**: v2.1.113 네이티브 바이너리 전환으로 추가된 환경 제약을 사용자가 설치 전에 인지하도록 한다.

**변경 파일 3건**
- `README.md`: Requirements 섹션에 macOS 12+, AVX-capable CPU, Windows 괄호 없는 PATH 추가
- `.claude-plugin/plugin.json`: `engines` 필드로 Node/OS 하한 명시 (검토)
- `docs/CUSTOMIZATION-GUIDE.md`: 환경 제약 섹션 신설

**수락 기준**
- [ ] macOS 11 사용자가 README 만으로 v2.1.112 이하 고정 필요성 인지
- [ ] non-AVX CPU 사용자가 설치 전 경고 확인
- [ ] Windows 사용자가 괄호 포함 PATH 리스크 인지

#### ENH-246: DANGEROUS_PATTERNS 경고 강화 (1h)

**목적**: v2.1.113 #23 `dangerouslyDisableSandbox` 공식 fix가 적용된 상황에서 bkit의 방어선(DANGEROUS_PATTERNS 5건 매칭)이 이중 안전장치로 기능함을 명시한다.

**변경 파일**
- `scripts/config-change-handler.js:17-24`: DANGEROUS_PATTERNS 블록에 CC v2.1.113 #23 공식 fix 참조 주석 추가, 매칭 시 경고 레벨 상향 (`blastRadius: high` 유지 + 사용자 메시지 개선)

**수락 기준**
- [ ] config-change hook 발화 시 DANGEROUS_PATTERNS 매칭 경고가 CC 공식 fix 링크 포함
- [ ] L2 TC 1건 추가 (경고 레벨 상향 검증)

#### ENH-247: MON-CC-02 실측 검증 (1h ~ 3h)

**목적**: v2.1.113 #32 long-context `/compact` fix가 #47855 MON-CC-02(Opus 1M context `/compact` block)을 실제로 해결했는지 확인하여 ENH-232 PreCompact 방어 유지/해제를 판단한다.

**실행 절차** (수동 1회)
1. Opus 4.7 1M context 세션 시작
2. 500K+ 토큰 소비 유도 (긴 PDCA 세션 재현)
3. `/compact` 수동 발화
4. "Extra usage is required for long context requests" 에러 재현 여부 확인
5. 재현 시 → MON-CC-02 OPEN 유지, ENH-232 방어 유지
6. 미재현 시 → MON-CC-02 CLOSED, ENH-232 "투자 보호"→"상시 방어" 재분류

**수락 기준**
- [ ] 실측 결과 `docs/04-report/features/cc-v2112-v2114-impact-analysis.report.md` Appendix 업데이트
- [ ] MEMORY.md MON-CC-02 상태 반영
- [ ] ENH-232 분류 결정

### 2.2 P1 (이번 사이클, 2건)

#### ENH-248: `sandbox.network.deniedDomains` 채택 가이드 (1.5h)
- `docs/bkit-auto-mode-workflow-manual.md`에 사용자 프로젝트용 deniedDomains 예제 추가
- bkit 자체는 sandbox 미사용이므로 변경 없음

#### ENH-249: 네이티브 바이너리 비호환 환경 troubleshooting (2h)
- `docs/` 하위 신규 troubleshooting 파일
- macOS 11 / non-AVX / Windows 괄호 PATH 증상 → 해결 경로 매핑
- MON-CC-06 (10+ 회귀 이슈) 통합 참조

### 2.3 P2 (다음 사이클, 1건)

#### ENH-250: PRD 예제 정리 (1h)
- `docs/01-plan/features/bkit-v216-enhancement.plan.md:282` `Bash(sudo:*)` 예제 정리
- v2.1.113 #15 wrapper 감지 강화 컨텍스트 반영

### 2.4 P3 (백로그, 2건)

- ENH-251: 금지 Bash allow rule 스타일 가이드 (수요 발생 시)
- ENH-252: ENH-230 recap fix 관찰 (지속 모니터링)

---

## 3. 의존성 및 순서

```
ENH-245 ──────────────────────> bkit v2.1.9 릴리스
                                      ▲
ENH-246 ──────────────────────────────┤
                                      │
ENH-247 ──(실측 결과)──> ENH-232 재분류─┤
                                      │
ENH-248 ──┐                           │
ENH-249 ──┤                           │
          └─> bkit v2.1.10 포함 가능   │
                                      │
ENH-250 ──> bkit v2.1.10 이후          │
ENH-251 ──> 수요 대기                   │
ENH-252 ──> 관찰만                     │
```

**병렬 가능**: P0 3건은 상호 독립 (ENH-247은 실측이라 다른 구현과 무관)
**직렬 필수**: ENH-247 실측 → ENH-232 재분류 판단

---

## 4. 테스트 계획

| ENH | 테스트 레벨 | 대상 | TC 수 |
|-----|----------|------|------|
| ENH-246 | L2 Integration | `scripts/config-change-handler.js` | 1건 |
| ENH-247 | L3 Hook E2E (선택) | `scripts/context-compaction.js` | 1건 (수동 1회가 MVP) |
| ENH-249 | L5 Runtime Matrix | 환경별 smoke | 3건 (macOS 11/AVX/Windows PATH) |
| **합계** | | | **5건 (전부 P0~P1)** |

---

## 5. 공수 및 일정

| Phase | 공수 | 누적 |
|-------|------|------|
| P0 (ENH-245/246/247) | 3.5 ~ 5.5h | 3.5 ~ 5.5h |
| P1 (ENH-248/249) | 3.5h | 7 ~ 9h |
| P2 (ENH-250) | 1h | 8 ~ 10h |
| P3 (ENH-251/252) | 1h (관찰) | 9 ~ 11h |
| **총합** | | **9 ~ 11h** |

**권장 사이클 배분**
- **bkit v2.1.9**: P0 3건 (3.5~5.5h, 1일 이내)
- **bkit v2.1.10**: P1 2건 + P2 1건 (4.5h)
- **Backlog**: P3 2건

---

## 6. 리스크 및 완화

| 리스크 | 가능성 | 영향 | 완화 |
|--------|-------|-----|------|
| ENH-247 실측 환경 부재 (Opus 1M 긴 세션 재현) | M | H | 기존 아카이브 세션 활용, 또는 MON-CC-02 OPEN 유지 선택 |
| ENH-245 문서화 누락 → 사용자 설치 실패 | L | H | 릴리스 체크리스트에 환경 문서 확인 항목 추가 |
| v2.1.115+ 핫픽스로 네이티브 바이너리 회귀 해결 시 ENH-245 메시지 과도 | M | L | ENH-249 troubleshooting에 "v2.1.115 이상이면 불필요" 조건부 명시 |
| v2.1.114 CTO Team 자동 수혜를 ENH 없이 권장 버전만 업데이트 → 문서화 부재 | L | M | `bkit.config.json` 주석 + MEMORY.md 명시 |

---

## 7. 수락 기준 (Done Definition)

**bkit v2.1.9 릴리스 기준**
- [ ] ENH-245/246/247 모두 구현 완료
- [ ] README + CUSTOMIZATION-GUIDE 환경 요구사항 반영
- [ ] `config-change-handler.js` 경고 강화 + L2 TC 통과
- [ ] MON-CC-02 실측 결과 문서 업데이트
- [ ] `bkit.config.json` CC 추천 버전 v2.1.114+ 반영
- [ ] MEMORY.md 버전 히스토리 + ENH-245~252 등록
- [ ] `memory/cc_version_history_v2113_v2114.md` 생성
- [ ] 연속 호환 73 릴리스 (조건부) 반영
- [ ] 기존 43 QA PASS (회귀 0건)

---

## 8. 관련 문서

- **Impact Analysis**: `docs/04-report/features/cc-v2112-v2114-impact-analysis.report.md` (본 Plan의 근거)
- **선행 Report**: `docs/04-report/features/cc-v2110-v2112-issue81-impact-analysis.report.md`
- **MEMORY 동기화**: `/Users/popup-kay/.claude/projects/-Users-popup-kay-Documents-GitHub-popup-bkit-claude-code/memory/MEMORY.md`
- **버전 히스토리**: `memory/cc_version_history_v2113_v2114.md` (생성 예정)
