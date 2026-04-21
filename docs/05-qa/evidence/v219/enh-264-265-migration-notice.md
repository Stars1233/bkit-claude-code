# ENH-264 / ENH-265 Plan-Implementation Drift Notice

**검증 일자**: 2026-04-21
**출처**: `/pdca qa cc-v2114-v2116-impact-analysis`

## 발견

Plan §4.1 "v2.1.10 (다음 사이클)"에 ENH-264/ENH-265가 **v2.1.10 로드맵**으로 지정되어 있으나,
working tree 실측 결과 **v2.1.9에 이미 구현**되어 있음.

## ENH-264 (PreToolUse `updatedInput`/`additionalContext` 활용)

### 구현 증거
- `lib/core/io.js:114` — `outputBlockWithContext(reason, alternatives, hookEvent)` 함수 정의
- `lib/core/io.js:163` — exports에 포함
- `scripts/unified-bash-pre.js:23` — import
- `scripts/unified-bash-pre.js:28-29` — `// ENH-264: Alternative suggestions for blocked commands (CC v2.1.110+)` 주석 섹션
- `scripts/unified-bash-pre.js:144` — **deployment 감지 경로**에서 호출 (alternatives 포함)
- `scripts/unified-bash-pre.js:183` — **QA 감지 경로**에서 호출 (alternatives 포함)

### 런타임 검증 결과
- deployment/QA phase 감지 경로 → `outputBlockWithContext` 호출 가능
- 일반 Bash 명령 (예: `rm -rf /`, `chmod 777 /etc`, `sudo rm -rf ~`) → **blocking 미발화**
  (CC v2.1.113 #14/#15/#16 + v2.1.116 S1 CC 런타임 레이어에 위임)

### 해석
v2.1.9는 ENH-264 **완전 구현 전 단계**:
- Layer 1 (CC 런타임): 일반 위험 명령 차단
- Layer 2 (bkit hook): phase-specific 차단 (deploy/QA)만 구현
- v2.1.10에서 일반 Bash 위험 명령에도 alternatives 제공 확장 예정

## ENH-265 (ENABLE_PROMPT_CACHING_1H 도입)

### 구현 증거
- `hooks/startup/session-context.js:236-241` — ENH-265 주석 + env 변수 분기
- SessionStart additionalContext에 `- Prompt caching 1H: ⚠️ disabled — set ENABLE_PROMPT_CACHING_1H=1...` 출력
- `docs/03-analysis/prompt-caching-optimization.md` 6,208 bytes 별도 분석 문서 존재

### 런타임 검증 결과
- Mock SessionStart 실행 결과 additionalContext에 "Prompt caching 1H" 문자열 확인 ✅
- ENABLE_PROMPT_CACHING_1H=1 설정 시 `✅ enabled` 메시지 출력 분기 존재

### 해석
ENH-265는 v2.1.9에 **완전 구현 + 운영 문서까지 완료**.
Plan §4.1 로드맵 표기는 **Plan 문서 업데이트 누락** (실제 이행됨).

## 조치 권고

1. **v2.1.9 RELEASE NOTES**에 "ENH-265 완전 구현, ENH-264 부분 구현 (v2.1.10에서 확장)" 명시
2. Plan `cc-v2114-v2116-impact-analysis.plan.md` §4.1 수정: ENH-264는 **Partial Implementation (phase-specific only)** 로 재분류, ENH-265는 **IMPLEMENTED v2.1.9** 로 이동
3. MEMORY.md ENH-264/265 상태 라인 갱신: "v2.1.9 선이행 (Plan drift: positive)"

## Shipping 영향

**Non-blocking** — 기능 drift는 "예상보다 일찍 구현됨" (positive drift).
사용자 이익: v2.1.10 대기 없이 프롬프트 캐싱 30~40% 토큰 절감 + deployment/QA 차단 시 대안 제시 즉시 수혜.
