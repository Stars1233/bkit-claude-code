# CC v2.1.114 → v2.1.116 영향 대응 Plan (v2.1.9 축소안)

> **Status**: 📋 Plan (P0 2건 즉시 구현 대기, 전략 재검토 완료)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.8 → **v2.1.9** (예정)
> **Branch**: `feat/v219-cc-v2116-response`
> **Author**: CTO Team (cc-version-researcher + bkit-impact-analyst + Plan Plus + Strategic Deep Analysis)
> **Date**: 2026-04-21 (원안) / **2026-04-21 재구성** (사용자 승인 Option D)
> **Origin**: `docs/04-report/features/cc-v2114-v2116-impact-analysis.report.md`

---

## 1. 목적 및 전략 재정의

### 1.1 원안 vs 재구성 차이

**원안 (v2.1.10 타깃, 11.5~12.5h)**: 9 ENH reactive 대응
**재구성 (v2.1.9 타깃, 5~5.5h, -55%)**: 4 ENH로 축소 + v2.1.10+ 로드맵 분리

### 1.2 재구성 근거 (Strategic Deep Analysis 결과)

3개 병렬 Research + main 교차 검증 결과:

1. **코드 건강도 8.5/10** — 리팩토링 불필요, TODO/FIXME 0건
2. **CC 기능 활용률 42%** — 누적 36 기능 중 15개 사용, **HIGH 가치 미활용 3건 발굴** (`PreToolUse updatedInput`, `ENABLE_PROMPT_CACHING_1H`, `paths:` frontmatter)
3. **Docs=Code 위반 6중 발견** (기존 3중 → 5 MEMORY 오기 + plugin.json 2 오기 + lib/core v1.6 tag)
4. **기존 9 ENH 중 5건은 YAGNI/자동수혜** — v2.1.9 범위 압축 필요

### 1.3 핵심 목표 (v2.1.9)

1. **#51165 `context: fork` 회귀 실측** (zero-script-qa) → ENH-196/202 투자 보호
2. **v2.1.116 S1 + v2.1.113 #23 defense-in-depth 공식 문서화** → 보안 아키텍처 정합성
3. **#51234 사용자 custom skill 손실 경고** → 데이터 보호 문서화
4. **Docs=Code 위반 일괄 정정** → MEMORY 5곳 + plugin.json 2곳 + lib/core v1.6 tag

### 1.4 비범위 (v2.1.9 Out of Scope)

- **YAGNI FAIL 재분류 5건**: ENH-255(벤치), ENH-256(agent hooks), ENH-257(MCP templates), ENH-261(npx/bun), ENH-262(gh rate-limit)
- **v2.1.10 연기**: ENH-258 worktree `/tui` (B12 자동 수혜 후 재검증)
- **이미 완료**: ENH-260 MON-CC-06 16건 확장 (2026-04-21 Phase 4 MEMORY 반영됨)
- **v2.1.10+ 신규 로드맵**: ENH-264~269 (§4 참조)
- TC 신설 전면 연기 (L2/L3 전부 v2.1.10+)

---

## 2. v2.1.9 구현 범위 (4 ENH / 5~5.5h)

### 2.1 P0 (즉시 구현, 2건, 2.5~3h)

#### ENH-253: #51165 `context: fork` 회귀 수동 재현 검증 (1~1.5h, 축소)

**원안 대비 변경**: L3 회귀 TC 신설 드롭 → 수동 1회 재현 + 결과 문서만

**목적**: bkit 유일 `context: fork` 사용자 `zero-script-qa` (실측 `skills/zero-script-qa/SKILL.md:10` 단일 확인)가 v2.1.116에서 정상 기동하는지 실측.

**변경 파일**
- `skills/zero-script-qa/SKILL.md:10-11` — **검증만 (변경 없음)**
- `docs/03-analysis/zero-script-qa-fork-v2116-verification.md` — **신설** (결과 문서)

**실행 절차** (수동 1회)
1. `/skills list` 출력에서 `zero-script-qa` 포함 확인
2. `/zero-script-qa` 호출 → `qa-monitor` agent fork spawn 관찰
3. Fork context에서 skill tool 정상 invoke 확인
4. 재현 시 → ENH-196/202 blocking 경고 + 완화책 제안

**수락 기준**
- [ ] macOS 재현 결과 문서화 (YES/NO + 증적 스크린샷/로그)
- [ ] 재현 시 ENH-196 투자 보호 fallback 경로 1건 제시
- [ ] 미재현 시 "macOS 안정" 명시 + Windows reporter 한정 추적 기록

#### ENH-254: S1 + DANGEROUS_PATTERNS 이중 방어선 문서화 (1.5h)

**목적**: v2.1.113 #23 + v2.1.116 S1 (CC 런타임 샌드박스 레이어) + bkit `DANGEROUS_PATTERNS` (설정 변경 감지 레이어)의 **서로 다른 표면적 defense-in-depth 아키텍처** 공식화.

**변경 파일**
- `scripts/config-change-handler.js:17-24` — `DANGEROUS_PATTERNS` 주석 보강 (5 항목 전부: `dangerouslyDisableSandbox`, `excludedCommands`, `autoAllowBashIfSandboxed`, `chmod 777`, `allowRead`)
  - "CC 런타임 S1(v2.1.116)/#23(v2.1.113) 보완 레이어, 모두 제거되어도 사용자 데이터 보호 불충분" 명시
- `docs/03-analysis/security-architecture.md` — **신설**
  - §1. 레이어 정의 (CC 런타임 vs bkit 설정 감지)
  - §2. 상호 관계 다이어그램 (공격 벡터별 어느 레이어가 방어?)
  - §3. 사용자 책임 (어느 한쪽에 의존 금지)

**수락 기준**
- [ ] 주석 보강 5항목 전부
- [ ] `docs/03-analysis/security-architecture.md` 최소 3섹션
- [ ] 기존 L1 유닛 TC 무회귀

### 2.2 P1 (이번 사이클, 1건, 1.5h)

#### ENH-259: #51234 사용자 custom skill 손실 경고 (1.5h)

**목적**: bkit 자체는 `${CLAUDE_PLUGIN_ROOT}/skills/` 경로로 무영향이나, 사용자가 `~/.claude/skills/`에 custom skill 보관 시 v2.1.116 first-run 삭제 위험. 데이터 손실 불가역.

**변경 파일**
- `docs/CUSTOMIZATION-GUIDE.md` — "⚠️ Custom Skills 손실 경고" 섹션 추가
  - 백업 명령 예시 (`cp -R ~/.claude/skills ~/.claude/skills.backup.$(date +%Y%m%d)`)
  - bkit plugin 경로 (`${CLAUDE_PLUGIN_ROOT}/skills/`) vs user 경로 차이 명확화
- `README.md` — Troubleshooting 단락 링크 추가

**수락 기준**
- [ ] `~/.claude/skills/` 삭제 위험 명시 + 해당 CC 버전(v2.1.116) 참조
- [ ] 백업 복원 명령 2종 제공 (전체/선택적)
- [ ] bkit custom skill 작성자를 위한 공식 경로 가이드

### 2.3 P2 (즉시 메모리·문서, 1건, 1h, 확장)

#### ENH-263: Docs=Code 위반 6중 일괄 정정 (1h, 원안 0.5h 대비 확장)

**원안 대비 변경**: 범위 확장 — 3중 오기 → **6중 오기**

**목적**: Strategic Deep Analysis에서 실측 대비 MEMORY/plugin.json/lib/core 6곳의 Docs=Code 위반 발견. ENH-241 교차 검증 스킴의 첫 실적용.

**변경 파일 (6 대상)**

| # | 파일 | 현재 | 실측값 |
|---|------|------|-------|
| 1 | `.claude-plugin/plugin.json` description | "38 Skills, 36 Agents, 21 Hook Events" | **39** Skills, 36 Agents, 21 Hook Events |
| 2 | `memory/MEMORY.md` Project Context Architecture | "36 Skills, 31 Agents, 21 Hook Events, 260+ exports, 78 Lib Modules, ~40K LOC" | **39 Skills, 36 Agents, 21 Hook Events, 101 Lib Modules, 24,616 LOC** |
| 3 | `memory/MEMORY.md` Key Architecture Decisions | "37 Skills, 32 Agents, 21 Hook Events, 88 Lib Modules (22,734 LOC in lib/), 57 Scripts" | **39 Skills, 36 Agents, 21 Hook Events, 101 Lib Modules (24,616 LOC), 43 Scripts** |
| 4 | `lib/core/io.js` JSDoc `@version` | `1.6.0` | **`2.0.0`** (core 모듈 일관성) |
| 5 | `lib/core/cache.js` JSDoc `@version` | `1.6.0` | **`2.0.0`** |
| 6 | `bkit.config.json` CC 추천 버전 (기존 ENH-263 원안) | v2.1.114+ | **v2.1.116+** |

**수락 기준**
- [ ] 6곳 전부 정정
- [ ] `grep -rn "v1\.6\.0" lib/` 결과 0건
- [ ] `grep "37 Skills\|32 Agents\|88 Lib\|22,734\|57 Scripts" MEMORY.md` 0건

---

## 3. 의존성 및 순서

```
ENH-253 ─(실측 결과)─> ENH-196 투자 보호 판단 / 문서화
                                │
ENH-254 ─(문서 신설)────────────┤
                                ├─> bkit v2.1.9 릴리스 (5~5.5h 내 완료)
ENH-259 ─(문서)────────────────┤
                                │
ENH-263 ─(6중 정정 즉시)───────┘
```

**병렬 가능**: 4 ENH 전부 상호 독립 (파일 중복 없음)
**직렬 필수**: 없음

---

## 4. v2.1.10+ 로드맵 (신규 ENH-264~269)

### 4.1 v2.1.10 (다음 사이클, 6~8h)

| ENH | Priority | 제목 | CC 근거 | 공수 |
|-----|----------|------|--------|------|
| **ENH-264** (신규) | **P0 HIGH** | PreToolUse `updatedInput`/`additionalContext` 활용 — Bash 차단 시 대안 자동 제시 | v2.1.110 | 3~4h |
| **ENH-265** (신규) | **P1 HIGH** | `ENABLE_PROMPT_CACHING_1H` 실제 도입 — 장기 PDCA 세션 **토큰 30~40% 절감** | v2.1.108 | 1.5h |
| **ENH-258** (연기) | P2 | B12 worktree `/tui` 재검증 + L2 TC | v2.1.116 B12 | 2h |
| **ENH-255** (선택) | P3 | `/resume` 벤치 | v2.1.116 I1/B10 | 2h |

### 4.2 v2.1.11+ (장기, 선택적)

| ENH | Priority | 제목 | 공수 |
|-----|----------|------|------|
| **ENH-266** (신규) | P2 | Skill `paths:` frontmatter 39개 일괄 마이그레이션 (v2.1.84, 2년 미사용) | 2~3h |
| **ENH-267** (신규) | P3 | `lib/pdca/state-machine.js` 948 LOC 분해 (도메인별 split) | 4~6h |
| **ENH-268** (신규) | P2 | `monitors:` manifest POC — bkit-analysis MCP 실시간 이슈 추적 | 4~5h |
| **ENH-269** (신규) | P3 | `PermissionDenied` hook fallback 전략 | 2h |
| 레거시 제거 | P3 | `lib/core/paths.js` @deprecated, `LEGACY_LEVEL_MAP`, legacy phase strings 정리 | 1~2h |

### 4.3 영구 DROP (YAGNI FAIL 재분류, v2.1.9 작업 중 재확정)

| 항목 | DROP 사유 |
|------|----------|
| ENH-255 (P3 강등 후 DROP) | `/resume` 자동 수혜, 벤치 환경 구축 2h > 결과 문서만의 가치 |
| ENH-256 F1 agent hooks | grep 0/36 사용, pain 없음 |
| ENH-257 I2 MCP cold-start | bkit MCP `resources/templates/list` 미구현, 측정 대상 없음 |
| ENH-261 B4 npx/bun wrapper | bun 사용자 없음, npx 이미 안정 |
| ENH-262 I8 gh rate-limit 주석 | 완전 자동 수혜, agent description 주석은 장식적 |
| `disable-model-invocation` | 0/39 사용, 도입 pain 없음 |
| `disableSkillShellExecution` | 25/39 Bash 사용 → 활성화 시 장애 |
| Agent `initialPrompt` | 0/36 사용, 체인 패턴으로 충분 |
| MCP Elicitation | bkit MCP 자동 호출, 수동 선택 없음 |
| 4 advanced hooks (ApplicationContext/AgentState/ProviderState/ResponseFeedback) | Advanced monitoring 범위 밖 |

---

## 5. 테스트 계획

### v2.1.9 테스트 (신규 TC 0건)

| ENH | 테스트 레벨 | 대상 | 비고 |
|-----|----------|------|------|
| ENH-253 | 수동 (L0) | `zero-script-qa` fork 재현 | 증적 스크린샷/로그 |
| ENH-254 | L1 유닛 (기존) | `test/l1-unit/config-change-handler.test.js` | 기존 통과 재확인 |
| ENH-259 | 문서 | — | 없음 |
| ENH-263 | 문서 | — | grep 검증만 |

**신규 L2/L3 TC 0건** — 전부 v2.1.10+로 연기.

---

## 6. 공수 및 일정

| Phase | 공수 | 누적 |
|-------|------|------|
| v2.1.9 P0 (ENH-253/254) | 2.5 ~ 3h | 2.5 ~ 3h |
| v2.1.9 P1 (ENH-259) | 1.5h | 4 ~ 4.5h |
| v2.1.9 P2 (ENH-263) | 1h | **5 ~ 5.5h** |

**원안(v2.1.10 타깃) 11.5~12.5h 대비 -55% 축소**

---

## 7. 리스크 및 완화

| 리스크 | 가능성 | 영향 | 완화 |
|--------|-------|-----|------|
| ENH-253 macOS 재현 실패 | M | M | Windows 환경 확보 실패 시 #51165 reporter 댓글 추적으로 대체 |
| ENH-254 defense-in-depth 문서 과신 유발 | L | M | "어느 한쪽에 의존 금지" 명시, 사용자 책임 섹션 필수 |
| ENH-263 `v1.6.0` tag 정정이 의도치 않은 동작 변경 유발 | L | L | JSDoc tag만 수정 (런타임 영향 0), smoke test로 확인 |
| v2.1.9 배포 후 ENH-264 도입 시점 blocker 발견 | M | M | ENH-264 PreToolUse `updatedInput`는 사용자 수정 가능성 검증 우선 (POC 30min) |

---

## 8. 수락 기준 (Done Definition)

**bkit v2.1.9 릴리스 기준**
- [ ] ENH-253 `zero-script-qa` 수동 재현 결과 문서화 (1~1.5h)
- [ ] ENH-254 `scripts/config-change-handler.js:17-24` 주석 보강 + `docs/03-analysis/security-architecture.md` 신설 (1.5h)
- [ ] ENH-259 `docs/CUSTOMIZATION-GUIDE.md` + `README.md` custom skill 경고 (1.5h)
- [ ] ENH-263 Docs=Code 6중 일괄 정정 (1h)
- [ ] `bkit.config.json` CC 추천 v2.1.116+ 반영 (ENH-263 일부)
- [ ] `memory/cc_version_history_v2115_v2116.md` 이미 생성됨 (Phase 4에서 완료)
- [ ] 기존 43 QA PASS (회귀 0건)
- [ ] `feat/v219-cc-v2116-response` → `main` PR (fix 커밋 + docs 커밋 분리)

---

## 9. 관련 문서

- **Impact Analysis**: `docs/04-report/features/cc-v2114-v2116-impact-analysis.report.md` (Strategic Deep Analysis 결과는 본 Plan §1.2에 요약)
- **선행 Report**: `docs/04-report/features/cc-v2112-v2114-impact-analysis.report.md` (ENH-245~252)
- **MEMORY 동기화**: `~/.claude/projects/-Users-popup-kay-Documents-GitHub-popup-bkit-claude-code/memory/MEMORY.md`
- **버전 히스토리**: `memory/cc_version_history_v2115_v2116.md` (이미 생성됨)
- **보안 아키텍처**: `docs/03-analysis/security-architecture.md` (ENH-254에서 신설 예정)

---

## Appendix A — Strategic Deep Analysis 결과 요약

### A.1 실측 수치 (MEMORY 기준 Docs=Code 위반)

| 항목 | MEMORY 기록 | 실측 |
|------|-----------|------|
| agents | 32 | **36** |
| skills | 37 | **39** |
| lib modules | 88 | **101** |
| lib LOC | 22,734 | **24,616** |
| scripts | 43 (MEMORY "57" 오기) | **43** |
| hook events | 21 | 21 ✅ |

### A.2 CC 기능 활용률 (v2.1.73~v2.1.116 누적 36 기능)

- **Agent frontmatter**: effort/maxTurns 100%, disallowedTools 56%, initialPrompt/hooks 0%
- **Skill frontmatter**: effort 100%, context:fork 3% (1/39), paths/monitors/disable-model 0%
- **Hook events**: 21/25 구현 (84%), `if` 조건부 1/21만 사용
- **Plugin features**: `${CLAUDE_PLUGIN_DATA}` only (16 참조), `monitors`/`bin`/`dependencies`/`freshness` 미도입
- **전체 활용률**: **~42%**

### A.3 HIGH 가치 미활용 기회 (v2.1.10+ 채택 권고)

1. **PreToolUse `updatedInput`/`additionalContext`** (v2.1.110) — Bash 차단 시 대안 제시 → ENH-264
2. **`ENABLE_PROMPT_CACHING_1H`** (v2.1.108) — 토큰 30~40% 절감 → ENH-265
3. **`paths:` skill frontmatter** (v2.1.84, 2년 미사용) → ENH-266

### A.4 코드 건강도 8.5/10

- TODO/FIXME/HACK 주석 **0건**
- scripts ↔ lib 단방향 의존, 순환 회피 lazy require 5건
- BkitError + debugLog 218 인스턴스 일관성
- `lib/pdca/state-machine.js` 948 LOC (최대) — 장기 분해 검토 (ENH-267)
