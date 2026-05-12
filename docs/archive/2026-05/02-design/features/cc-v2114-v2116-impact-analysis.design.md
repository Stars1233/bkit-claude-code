# CC v2.1.114 → v2.1.116 Design Document (v2.1.9 구현)

> **Status**: 🎨 Design (v2.1.9 구현 직전)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.8 → **v2.1.9**
> **Branch**: `feat/v219-cc-v2116-response`
> **Author**: CTO Team (main session)
> **Date**: 2026-04-21
> **Origin**: `docs/01-plan/features/cc-v2114-v2116-impact-analysis.plan.md`

---

## 1. 설계 범위

4 ENH 구현 상세 설계 + 파일별 Before/After 명세.

| ENH | Priority | 예상 공수 | 파일 변경 수 |
|-----|----------|---------|-------------|
| ENH-253 | P0 | 1~1.5h | 1 신설 (검증 문서) |
| ENH-254 | P0 | 1.5h | 1 수정 + 1 신설 |
| ENH-259 | P1 | 1.5h | 2 수정 |
| ENH-263 | P2 | 1~1.5h | **15 수정** (확장: 실측 범위) |

**총 변경**: **19 파일** (수정 14 + 신설 5) — 원안 13개에서 +6 (ENH-263 실측 확장분)

---

## 2. ENH-253: zero-script-qa fork 수동 재현 검증

### 2.1 Context

- `skills/zero-script-qa/SKILL.md:10` — `context: fork`, `agent: bkit:qa-monitor`
- bkit 39 skills 중 **유일한 fork 사용자**
- GitHub Issue #51165: Windows reporter에서 `context: fork` + `disable-model-invocation` 실패
- bkit은 `disable-model-invocation` 0/39 사용 → 조합 케이스 N/A

### 2.2 실행 절차 (수동)

```
1. Claude Code 세션 시작 (현재 세션 재활용)
2. /zero-script-qa 입력 또는 bkit:zero-script-qa 참조
3. Skill 로딩 성공 여부 관찰:
   - ✅ SKILL.md 내용 참조 가능
   - ⚠️ "Skill not found" 또는 fork 실패 에러 여부
4. Agent bkit:qa-monitor spawn 관찰
5. Fork context에서 tool invocation 정상 여부
6. 결과를 docs/03-analysis/에 기록
```

### 2.3 산출 파일

**신설**: `docs/03-analysis/zero-script-qa-fork-v2116-verification.md`

```markdown
# zero-script-qa fork 재현 검증 (v2.1.116 대응)

## 환경
- CC CLI: v2.1.116
- bkit: v2.1.9-dev
- Platform: macOS (darwin 24.6.0)
- 검증 일시: 2026-04-21

## 검증 결과
- Skill 로딩: ✅/❌
- Fork spawn: ✅/❌ (qa-monitor)
- Tool invocation: ✅/❌
- 결론: macOS에서 #51165 **재현됨/미재현**

## ENH-196/202 투자 보호 판단
- [재현 시] blocking alert + 완화책 제시
- [미재현 시] Windows reporter 한정 확인, cross-platform 추적 기록

## Appendix
- Issue #51165 최신 상태
- MON-CC-06 통합 추적 링크
```

### 2.4 수락 기준

- [ ] 검증 결과 YES/NO 명확
- [ ] 재현 경로 재현가능
- [ ] ENH-196/202 후속 판단 근거 제공

---

## 3. ENH-254: DANGEROUS_PATTERNS + Security Architecture 문서화

### 3.1 Target 파일 (기존)

```javascript
// scripts/config-change-handler.js:17-24 (실측 확인됨)
// Dangerous config patterns that should be flagged
const DANGEROUS_PATTERNS = [
  'dangerouslyDisableSandbox',
  'excludedCommands',
  'autoAllowBashIfSandboxed',
  'chmod 777',
  'allowRead',
];
```

### 3.2 주석 보강 설계 (Before/After)

**Before**:
```javascript
// Dangerous config patterns that should be flagged
const DANGEROUS_PATTERNS = [
  'dangerouslyDisableSandbox',
  'excludedCommands',
  'autoAllowBashIfSandboxed',
  'chmod 777',
  'allowRead',
];
```

**After**:
```javascript
// Dangerous config patterns that should be flagged.
//
// Defense-in-Depth Architecture (2026-04-21, ENH-254):
//   Layer 1 (CC runtime sandbox):
//     - CC v2.1.113 #23: `dangerouslyDisableSandbox` can no longer bypass sandbox without permission prompt
//     - CC v2.1.116 S1: Sandbox auto-allow no longer bypasses dangerous-path safety for rm/rmdir on /, $HOME, critical dirs
//   Layer 2 (bkit config-change hook, this file):
//     - Detects these 5 patterns in config file writes and flags as SECURITY WARNING
//     - Complements CC runtime defense; provides early detection at settings layer
//   IMPORTANT: Both layers together do NOT guarantee user data safety.
//   Users must NOT rely on either layer alone. See docs/03-analysis/security-architecture.md.
const DANGEROUS_PATTERNS = [
  'dangerouslyDisableSandbox',      // CC v2.1.113 #23 hardened at runtime (2026-04-17)
  'excludedCommands',                // Sandbox bypass mechanism
  'autoAllowBashIfSandboxed',        // Auto-allow without permission (v2.1.116 S1 tightened)
  'chmod 777',                       // World-writable permissions
  'allowRead',                       // Broad read access grants
];
```

### 3.3 신설 파일 설계

**경로**: `docs/03-analysis/security-architecture.md`

```markdown
# bkit Security Architecture — Defense-in-Depth

> **Version**: 2026-04-21 (v2.1.9, ENH-254)
> **Purpose**: bkit의 보안 방어 레이어 아키텍처 공식 문서화

## §1. 레이어 정의

### Layer 1: CC Runtime Sandbox (CC CLI 책임)
- CC v2.1.113 #23 `dangerouslyDisableSandbox` permission prompt 강화 (2026-04-17)
- CC v2.1.116 S1 `rm`/`rmdir` dangerous-path safety check (2026-04-20)
- CC v2.1.113 #14/#15/#16 Bash deny rule 강화
- **표면**: 실행 시점 (command invocation)

### Layer 2: bkit Config-Change Hook (bkit 책임)
- `scripts/config-change-handler.js` — ConfigChange hook handler
- `DANGEROUS_PATTERNS` 5 항목 매칭 → SECURITY WARNING + audit log
- **표면**: 설정 변경 시점 (settings file write)

## §2. 상호 관계

| 공격 벡터 | Layer 1 방어 | Layer 2 방어 |
|----------|------------|------------|
| 실행 중 `rm /`, `rm $HOME` | ✅ v2.1.116 S1 차단 | ❌ (실행 레이어 밖) |
| 설정 파일에 `dangerouslyDisableSandbox: true` 저장 | ❌ (파일 쓰기 레이어 밖) | ✅ SECURITY WARNING |
| `.claude/settings.json` 권한 약화 | ⚠️ (부분) | ✅ audit 기록 |
| `env rm -rf /` wrapper 우회 | ✅ v2.1.113 #15 | ❌ |
| 플러그인 설정으로 `allowRead: true` 전파 | ❌ | ✅ 경고 표시 |

### 핵심 원칙

**두 레이어는 서로 다른 표면을 방어합니다.** 
- Layer 1 = "실행 시 차단"
- Layer 2 = "설정 시 감지 및 경고"
- 두 레이어 중 하나만으로는 충분하지 않음 (defense-in-depth)

## §3. 사용자 책임

1. **Layer 1에만 의존 금지**: 설정이 이미 약화된 상태로 프로젝트 시작 시 Layer 1 우회 가능
2. **Layer 2에만 의존 금지**: 설정 건드리지 않고 명령 직접 실행 시 Layer 2 발화 안됨
3. **`.claude/settings.json` 변경 시 audit log 확인 필수**
4. **DANGEROUS_PATTERNS 5 항목을 의도적으로 사용할 경우**, bkit의 경고 이해 후 진행

## §4. 이력

| 일자 | 변경 | 관련 이슈 |
|------|------|---------|
| 2026-04-17 | CC v2.1.113 Layer 1 강화 (#23, #14, #15, #16) | v2.1.113 CHANGELOG |
| 2026-04-20 | CC v2.1.116 Layer 1 추가 강화 (S1: rm dangerous-path) | v2.1.116 CHANGELOG |
| 2026-04-21 | bkit ENH-254 defense-in-depth 공식 문서화 | v2.1.9 |

## §5. 관련 코드

- `scripts/config-change-handler.js:17-24` — DANGEROUS_PATTERNS 정의
- `lib/audit/audit-logger.js` — SECURITY WARNING audit 기록
- `hooks/hooks.json` — ConfigChange hook 등록
```

### 3.4 수락 기준

- [ ] `scripts/config-change-handler.js:17-24` 주석 보강 완료 (5 항목 전부)
- [ ] `docs/03-analysis/security-architecture.md` 최소 5 섹션 (레이어 정의, 상호 관계, 사용자 책임, 이력, 관련 코드)
- [ ] "어느 한쪽에 의존 금지" 명시 포함
- [ ] 기존 L1 유닛 TC 무회귀

---

## 4. ENH-259: #51234 Custom Skill 손실 경고

### 4.1 Target 파일

**기존 1**: `CUSTOMIZATION-GUIDE.md` (루트 경로)
**기존 2**: `README.md` (루트 경로)

### 4.2 CUSTOMIZATION-GUIDE.md 설계

**삽입 위치**: 파일 최상단 또는 troubleshooting section (기존 구조 확인 후 결정)
**섹션 제목**: `## ⚠️ Custom Skills 손실 위험 경고 (CC v2.1.116+ 사용자)`

**내용**:
```markdown
## ⚠️ Custom Skills 손실 위험 경고 (CC v2.1.116+ 사용자)

**증상**: CC CLI v2.1.113+ (특히 v2.1.116)에서 first-run 시 `~/.claude/skills/` 디렉토리가 **조용히 삭제**될 수 있습니다 ([#51234](https://github.com/anthropics/claude-code/issues/51234)).

**bkit 영향**:
- ✅ **bkit plugin 자체는 무영향** — bkit skills는 `${CLAUDE_PLUGIN_ROOT}/skills/` (plugin 번들) 경로를 사용합니다.
- ⚠️ **사용자 custom skill 영향** — `~/.claude/skills/`에 개인 skill을 보관 중이라면 **데이터 손실 가능**.

### 백업 권장 (즉시 실행)

```bash
# 전체 백업
cp -R ~/.claude/skills ~/.claude/skills.backup.$(date +%Y%m%d)

# 선택적 백업 (특정 skill만)
mkdir -p ~/Documents/claude-skills-backup
cp -R ~/.claude/skills/my-skill ~/Documents/claude-skills-backup/
```

### 복원 (삭제 발생 시)

```bash
# 백업으로부터 복원
cp -R ~/.claude/skills.backup.YYYYMMDD ~/.claude/skills
```

### bkit custom skill 작성자 권장 경로

bkit은 **plugin 번들 경로**(`${CLAUDE_PLUGIN_ROOT}/skills/`)에 skill을 보관하므로 영향 없음. custom skill을 bkit에 추가하려면:

1. bkit 플러그인 fork 후 `skills/{skill-name}/SKILL.md` 작성
2. 또는 별도 plugin 작성 (bkit을 참고하여 `.claude-plugin/plugin.json` + `skills/` 구조)
3. `~/.claude/skills/` 사용 지양 (CC 업그레이드 시 손실 위험)

### 모니터링

해당 이슈는 **MON-CC-06** (v2.1.113 네이티브 바이너리 전환 회귀 16건 통합 추적)에 포함됩니다. v2.1.117+ 공식 수정 확인 시 이 경고가 완화됩니다.
```

### 4.3 README.md 설계

**삽입 위치**: Troubleshooting section (기존 존재 시) 또는 Installation 바로 다음
**내용** (짧은 링크 단락):

```markdown
### ⚠️ CC v2.1.116 사용자 주의사항

`~/.claude/skills/`에 custom skill을 보관 중이라면 업그레이드 전 백업하세요 ([#51234](https://github.com/anthropics/claude-code/issues/51234)). 상세 가이드: [CUSTOMIZATION-GUIDE.md](./CUSTOMIZATION-GUIDE.md#️-custom-skills-손실-위험-경고-cc-v21116-사용자).
```

### 4.4 수락 기준

- [ ] CUSTOMIZATION-GUIDE.md 신규 섹션 ≥ 5 단락
- [ ] README.md 경고 + CUSTOMIZATION-GUIDE 링크
- [ ] 백업/복원 명령 2종 제시
- [ ] bkit plugin 경로 vs user 경로 차이 명확화

---

## 5. ENH-263: Docs=Code 위반 일괄 정정

### 5.1 Scope 재확정 (실측 기반 확장)

원안 **6중** → **15 파일** (active-state만, historic records 보존).

| # | 파일 | 변경 | 우선순위 |
|---|------|------|--------|
| 1 | `.claude-plugin/plugin.json` | "38 Skills, 36 Agents" → "39 Skills, 36 Agents" (description 필드) | 🔴 CRITICAL |
| 2 | `memory/MEMORY.md` Project Context | "36 Skills, 31 Agents, 78 Lib, ~40K LOC" → "39/36/101/24,616" | 🔴 CRITICAL |
| 3 | `memory/MEMORY.md` Key Architecture | "37 Skills, 32 Agents, 88 Lib (22,734), 57 Scripts" → "39/36/101/24,616/43" | 🔴 CRITICAL |
| 4 | `lib/core/io.js:4` `@version 1.6.0` → `2.0.0` | JSDoc tag | 🟡 MEDIUM |
| 5 | `lib/core/cache.js:4` `@version 1.6.0` → `2.0.0` | JSDoc tag | 🟡 MEDIUM |
| 6 | `hooks/startup/session-context.js:234` | "v2.1.111+ \| 72 consecutive" → "v2.1.116+ \| 74 consecutive" | 🔴 CRITICAL (사용자 매 세션 시 표시) |
| 7 | `README.md:4` | badge `Claude%20Code-v2.1.111+` → `v2.1.116+` | 🔴 CRITICAL (GitHub 노출) |
| 8 | `bkit-system/components/agents/_agents-overview.md:5` | "CC recommended: v2.1.111+ (72 consecutive)" → "v2.1.116+ (74 consecutive)" | 🟡 MEDIUM |
| 9-24 | `agents/*.md` (17 agents) | "CC recommended version: v2.1.111+ (72 consecutive compatible releases, MCP/PreToolUse stability)" → "v2.1.116+ (74 consecutive compatible releases, includes S1 security + I1/B10 /resume stability)" | 🟡 MEDIUM |

**참고**: 17 agents는 동일 문자열 반복 → `replace_all` 각 파일마다 1회로 간편 치환 가능.

### 5.2 Historic Records (DO NOT TOUCH)

다음은 릴리스 시점 상태를 기록하는 log이므로 수정 금지:
- `CHANGELOG.md` (전체 이력 보존)
- `memory/cc_version_history_v2113_v2114.md` (v2.1.113/114 분석 시점 기록)
- `docs/01-plan/features/cc-v21*-issue81-response.plan.md` (완료된 PDCA 기록)
- `docs/02-design/features/cc-v21*-issue81-response.design.md`
- `docs/03-analysis/cc-v2110-v2112-issue81-response.analysis.md`
- `docs/04-report/features/cc-v21*-impact-analysis.report.md` (과거 분석 보고)

### 5.3 Before/After 예시 (agents)

**Before (agents/cto-lead.md:195, 그 외 16개 동일 패턴)**:
```markdown
- CC recommended version: v2.1.111+ (72 consecutive compatible releases, MCP/PreToolUse stability)
```

**After**:
```markdown
- CC recommended version: v2.1.116+ (74 consecutive compatible releases, includes v2.1.116 S1 security + I1/B10 /resume stability, v2.1.115 skipped)
```

### 5.4 Before/After 예시 (session-context.js:234)

**Before**:
```javascript
ctx += `- CC recommended: v2.1.111+ | 72 consecutive compatible releases\n`;
```

**After**:
```javascript
ctx += `- CC recommended: v2.1.116+ | 74 consecutive compatible releases\n`;
```

### 5.5 Before/After (README.md:4)

**Before**:
```markdown
[![Claude Code](https://img.shields.io/badge/Claude%20Code-v2.1.111+-purple.svg)](https://code.claude.com)
```

**After**:
```markdown
[![Claude Code](https://img.shields.io/badge/Claude%20Code-v2.1.116+-purple.svg)](https://code.claude.com)
```

### 5.6 수락 기준

- [ ] 15 파일 전부 정정
- [ ] `grep -rn "v1\.6\.0" lib/core/` 결과 **0건**
- [ ] `grep "38 Skills\|32 Agents\|88 Lib\|22,734\|57 Scripts" .claude-plugin/ memory/` 결과 **0건**
- [ ] `grep "v2\.1\.111+" hooks/ agents/ README.md bkit-system/` 결과 **0건** (historic records 제외)
- [ ] 변경 후 bkit smoke test 통과 (session-context.js 재로딩 검증)

---

## 6. 통합 구현 순서

```
Step 1: Design 문서 확정 (현재)
  ↓
Step 2: ENH-263 CRITICAL 먼저 (plugin.json, MEMORY, session-context.js)
        → 세션 재시작 시 사용자에게 즉시 반영
  ↓
Step 3: ENH-254 (config-change-handler.js + security-architecture.md)
        → 보안 아키텍처 기반 구축
  ↓
Step 4: ENH-259 (CUSTOMIZATION-GUIDE.md + README.md)
        → 사용자 경고 즉시 노출
  ↓
Step 5: ENH-263 MEDIUM (17 agents + io.js/cache.js)
        → 일괄 처리, replace_all 효율
  ↓
Step 6: ENH-253 재현 검증 (수동 실행 + 결과 문서)
        → 다른 변경 완료 후 독립 실행
  ↓
Step 7: Gap analysis (pdca-iterator)
  ↓
Step 8: QA (qa-lead 종합 검증)
```

---

## 7. 병렬 가능성 및 의존성

| 구분 | 병렬 가능 | 의존 관계 |
|------|---------|----------|
| Step 2~5 | ❌ 순차 (파일 중복 없음, 하지만 논리적 순서) | 없음 |
| Step 6 (ENH-253) | ✅ 언제든 | 없음 (수동 검증) |
| Step 2 (ENH-263 CRITICAL 3) | ✅ 3 파일 동시 편집 가능 | 없음 |
| Step 5 (17 agents) | ✅ parallel Edit 가능 (각 파일 독립) | 없음 |

**전체 공수 추정**: 5~5.5h 유지 (replace_all 효율성으로 범위 확장 상쇄)

---

## 8. 리스크 및 완화

| 리스크 | 가능성 | 영향 | 완화 |
|--------|-------|-----|------|
| `session-context.js:234` 수정 후 hooks.json 로딩 실패 | L | H | syntax 유효성 검증, smoke test (session restart) |
| 17 agents 일괄 수정 중 일부 패턴 불일치 | M | L | grep으로 잔여 매칭 확인 후 수작업 정정 |
| `lib/core/io.js` tag 정정이 의도치 않은 동작 변경 | L | L | JSDoc only, 런타임 영향 0 |
| ENH-253 macOS 미재현 → Windows 재현 여부 불명 | M | M | 불명 시 "macOS PASS, Windows TBD" 명시 |
| 19 파일 변경이 QA smoke test 실패 유발 | L | M | ENH별 소단위 commit, rollback 용이 |

---

## 9. 수락 기준 (Done Definition, v2.1.9)

- [ ] Design 문서 본 문서 저장 완료
- [ ] ENH-253: `docs/03-analysis/zero-script-qa-fork-v2116-verification.md` 작성 (YES/NO 명확)
- [ ] ENH-254: `scripts/config-change-handler.js:17-24` 주석 보강 + `docs/03-analysis/security-architecture.md` 신설 (5 섹션)
- [ ] ENH-259: `CUSTOMIZATION-GUIDE.md` 섹션 추가 + `README.md` 경고 단락
- [ ] ENH-263: 15 파일 전부 정정 + grep 잔여 0 확인
- [ ] Gap analysis match rate ≥ 90%
- [ ] QA smoke test 회귀 0건
- [ ] `feat/v219-cc-v2116-response` 브랜치 PR 준비

---

## Appendix A — 관련 문서

- **Plan**: `docs/01-plan/features/cc-v2114-v2116-impact-analysis.plan.md`
- **Report**: `docs/04-report/features/cc-v2114-v2116-impact-analysis.report.md`
- **Strategic Analysis 요약**: Plan Appendix A
- **Security Architecture (신설 예정)**: `docs/03-analysis/security-architecture.md`
- **ENH-253 검증 (신설 예정)**: `docs/03-analysis/zero-script-qa-fork-v2116-verification.md`
