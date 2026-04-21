# CC CLI v2.1.113 ~ v2.1.114 변경 이력 (bkit 관점)

> 생성일: 2026-04-20
> 분석 출처: `docs/04-report/features/cc-v2112-v2114-impact-analysis.report.md`
> 연속 호환: **73 릴리스** (v2.1.34 ~ v2.1.114, 조건부)

---

## v2.1.113 (2026-04-17 19:34 UTC)

- **변경 수**: 40건 (CHANGELOG flat list, Features/Improvements/Fixes 혼재)
- **SP 토큰 변동**: TBD (CHANGELOG SP 섹션 명시 없음, 실측 권고)
- **스킵 여부**: ❌ 발행됨 (CHANGELOG/GitHub Releases/npm latest 3중 교차검증 완료, commit `71366ec`)

### HIGH 영향 핵심 변경

1. **#1 CLI 네이티브 바이너리 전환**: per-platform optional dependency로 전환. 번들 JS → 네이티브 바이너리 spawn. **10+ 회귀 이슈 유발** (#50274 Windows 세션 종료, #50383 macOS 11 dyld `_ubrk_clone`, #50384 AVX 미지원 CPU, #50609 Windows 설치 실패, #50616 VSCode, #50618 macOS 26 Gatekeeper SIGKILL 병렬, #50640 Win11 segfault, #50852 구형 CPU, #50541 Windows 괄호 PATH Bash, #50567 OTLP 미번들).
2. **#14 Security**: macOS `/private/{etc,var,tmp,home}` `Bash(rm:*)` allow 하의 위험 제거 대상 취급.
3. **#15 Security**: Bash deny rule이 `env`/`sudo`/`watch`/`ionice`/`setsid` exec wrapper 래핑 커맨드 매칭 (우회 차단).
4. **#16 Security**: `Bash(find:*)` allow rule이 `find -exec`/`-delete` 자동 승인 중단.
5. **#23 Security HIGH**: `Bash dangerouslyDisableSandbox`가 권한 프롬프트 없이 sandbox 밖 실행되던 버그 수정. **bkit `scripts/config-change-handler.js:19` DANGEROUS_PATTERNS 방어선 가치 강화**.

### MEDIUM 영향 핵심 변경

- **#11**: subagent 스트림 중단 10분 timeout 명확한 에러 (bg agent 안정성 자동 수혜)
- **#17**: MCP 동시 호출 watchdog 수정 (bkit-pdca/bkit-analysis 2 MCP 자동 수혜)
- **#20**: Session recap auto-fire 수정 (ENH-230 `/recap` 방어 투자 보호)
- **#22**: subagent viewing 중 타이핑 메시지 오귀속 수정 (CTO Team 세션 정확성)
- **#32**: 재개된 long-context `/compact` 실패 수정. **#47855 MON-CC-02 잠정 해결 후보**, ENH-232 PreCompact 방어 재검증 대기
- **#33**: plugin install range-conflict 리포트 (ENH-139/191 freshness)

### 설정 신규

- `sandbox.network.deniedDomains`: allowedDomains 와일드카드 우회 차단 (bkit 미사용, 사용자 프로젝트 권장 → ENH-248)

### LOW 영향 (27건)

UI/Readline/TUI 개선, `/loop` Esc, `/extra-usage` Remote, `/ultrareview` 병렬, `/effort auto` 메시지 수정, `/insights` Windows 크래시 수정, Bedrock Application Inference Profile ARN 수정 등. 모두 bkit 무관 또는 자동 수혜.

---

## v2.1.114 (2026-04-18 01:34 UTC)

- **변경 수**: 1건 (crash 핫픽스)
- **SP 토큰 변동**: 0
- **스킵 여부**: ❌ 발행됨 (npm latest dist-tag = v2.1.114)

### HIGH 영향 변경 (1건)

- **#1 Fix (crash HIGH)**: Agent teams 팀메이트가 도구 권한 요청 시 permission dialog crash 수정. **bkit CTO Team (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, cto-lead + 11 experts 12명) 직접 자동 수혜**. **v2.1.114를 권장 최소 버전으로 승격**.

---

## 회귀 상태 업데이트 (2026-04-20 기준)

### ✅ CLOSED (2건)

| Issue | 제목 | 해결 |
|---|---|---|
| #47810 | skip-perm + PreToolUse bypass (MON-CC-01) | CLOSED as duplicate 2026-04-14. bkit MON-CC-01 해제 |
| #48963 | Plugin skills `/` 메뉴 미표시 (macOS Desktop) | CLOSED. MON-CC-05 해제. bkit 37 skills Desktop 영향 소거 |

### ⚠️ OPEN (3건, 7릴리스 연속)

| Issue | 제목 | bkit 대응 |
|---|---|---|
| #47855 | Opus 1M context `/compact` block | **MON-CC-02 유지** — v2.1.113 #32 fix 관련 가능성, ENH-247 실측 검증 대기 |
| #47482 | Output styles YAML frontmatter 미주입 | ENH-214 방어 유지 |
| #47828 | SessionStart systemMessage+remoteControl (Windows) | bkit 미사용 확인, 해제 고려 가능 |

### 🔴 신설 모니터링 (MON-CC-06)

v2.1.113 네이티브 바이너리 전환 회귀 **10+건 통합 추적**:
- **HIGH**: #50274, #50383, #50384, #50609, #50616, #50618, #50640, #50852
- **MEDIUM**: #50541 (Windows PATH 괄호), #50567 (OTLP)
- **대응**: ENH-245 (문서화) + ENH-249 (troubleshooting)

---

## bkit ENH 기회 (ENH-245 ~ ENH-252, 8건)

| ENH | Priority | 규모 | CC 기능 | 상태 |
|-----|---------|------|--------|------|
| ENH-245 | P0 | 1.5h | 네이티브 바이너리 전환 | 📋 Plan |
| ENH-246 | P0 | 1h | `dangerouslyDisableSandbox` fix | 📋 Plan |
| ENH-247 | P0 | 1~3h | long-context `/compact` fix 실측 | 📋 Plan |
| ENH-248 | P1 | 1.5h | `sandbox.network.deniedDomains` | 📋 Plan |
| ENH-249 | P1 | 2h | 네이티브 바이너리 환경 troubleshooting | 📋 Plan |
| ENH-250 | P2 | 1h | Bash wrapper 감지 PRD 예제 정리 | 📋 Plan |
| ENH-251 | P3 | — | Bash allow rule 스타일 가이드 | 수요 대기 |
| ENH-252 | P3 | — | ENH-230 recap fix 관찰 | 관찰 |

**총 공수**: 9 ~ 11h
**YAGNI FAIL 6건**: Matrix #11/#14/#16/#33, v2.1.114 #1 (자동 수혜), ENH-253 초안 (MCP watchdog 측정)

---

## 권장 CC 버전 업데이트

**기존**: v2.1.111+
**현재**: **v2.1.114+**

**승격 근거**
1. v2.1.113 #23 sandbox bypass 보안 수정 (CRITICAL)
2. v2.1.113 #14~16 Bash allowlist 보안 강화 3건
3. v2.1.113 #32 long-context `/compact` 수정 (MON-CC-02 잠정 해결 후보)
4. v2.1.114 #1 CTO Team permission dialog crash 수정 (직접 자동 수혜)

**환경별 예외**
- macOS 11 이하 → **v2.1.112 이하 고정** (#50383)
- non-AVX CPU → **v2.1.112 이하 고정** (#50384)
- Windows 괄호 PATH → v2.1.114 사용 가능하나 Bash 기능 제한 (#50541)

---

## 연속 호환 카운트

```
v2.1.34 ──────────────────────────── v2.1.114
         73 연속 호환 (조건부)
         bkit 기능 코드 Breaking: 0건
         환경 요구사항 추가: macOS 12+ / AVX CPU / Windows PATH
         조건부 유지: ENH-245 문서화 완료 필요
```

**판단**: bkit 기능 코드 수준 Breaking 0건 유지 → 카운트 유지. CC 환경 요구사항 변경은 사용자 책임 영역이므로 "조건부" 라벨로 구분.
