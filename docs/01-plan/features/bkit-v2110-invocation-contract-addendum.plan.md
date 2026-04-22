# bkit v2.1.10 Invocation Contract 보존 Addendum (Plan 보완 문서)

> **Status**: 📝 Addendum (이전 Plan 보완)
>
> **Project**: bkit (bkit-claude-code)
> **타깃 버전**: v2.1.9 → **v2.1.10**
> **Supersedes**: 이전 Plan `docs/01-plan/features/bkit-v2110-integrated-enhancement.plan.md` **§9 UX Golden File 시스템** + 관련 수용 기준
> **Author**: 15명 에이전트 팀 재투입 (frontend-architect + design-validator + qa-strategist + product-manager 병렬 실행 + CTO-Lead 종합)
> **Date**: 2026-04-22
> **근거**: 사용자 UX 정의 재정립 — "사용자가 호출할 수 있는 명령어(skill/agent/command/MCP tool/slash command)의 **인터페이스 불변성**"
> **핵심 제약 유지**: Clean Architecture · 코딩 컨벤션 · 한국어 · Self-contained · No TS

---

## 0. Context — UX 정의 재정립

### 0.1 이전 Plan의 해석 오류

이전 Plan(`bkit-v2110-integrated-enhancement.plan.md` §9)은 UX를 **"사용자 가시 출력의 byte-exact 불변성"**으로 해석하여 Golden File CI gate를 설계했습니다. 사용자 의도 재확인 결과 이 해석은 **과잉 제약**이었음이 확인되었습니다.

### 0.2 올바른 UX 정의 (이번 Addendum의 전제)

> **UX = 사용자가 호출할 수 있는 명령어 인터페이스의 불변성**
>
> (skills, agents, commands, MCP tools, slash commands의 이름·파라미터·invocation 방식)

**NOT**:
- 출력 포맷/statusline/dashboard/경고 메시지의 byte-exact 고정 ❌
- 내부 구현 세부(JS 로직, 파일 경로, 에러 타입) 동일성 ❌

**YES**:
- `/bkit:<skill-name>` 슬래시 호출 시 동일 behavior 수신 ✅
- Task tool `subagent_type: "cto-lead"` 응답 수신 ✅
- MCP `bkit_pdca_status` 호출 시 기존 파라미터 그대로 수락 + 응답 필드 유지 ✅
- Hook event name + payload schema + stdout decision 필드 유지 ✅

### 0.3 이번 Addendum의 범위

| 항목 | 이전 Plan | 이 Addendum |
|------|---------|-----------|
| UX 정의 | 출력 byte-exact | **Invocation Contract** |
| CI Gate | UX Golden File diff=0 | **Contract Test L1~L4 PASS (604 TC)** |
| Golden File 역할 | FAIL 기준 | 참고용(격하, FAIL 기준 아님) |
| ENH-264 statusline 변경 | 의도적 갱신 PR 필요 | 자유 (Invocation Contract 무관) |
| 출력 포맷 개선 | 금지 | **허용** |

---

## 1. 에이전트 팀 재편성 (15명)

### 1.1 이번 Addendum 심층 분석 팀 (4명 병렬 실행 완료)

| # | Agent | 산출물 | Status |
|---|-------|-------|--------|
| 1 | `frontend-architect` | 5-Layer Invocation Contract 정의 · 29항목 변경 매트릭스 · 리스크 5 시나리오 | ✅ 완료 |
| 2 | `design-validator` | 인벤토리 전수(39+36+16+24+slash) 실측 · **hooks 24 blocks vs MEMORY 21 불일치 발견** · 195 assertions 제안 | ✅ 완료 |
| 3 | `qa-strategist` | Contract Test L1~L5 · baseline collector / runner pseudocode · CI YAML · **609 TC 계산** | ✅ 완료 |
| 4 | `product-manager` | 4세그먼트 Migration · Deprecation Ladder · Release Gate · 릴리스 노트 템플릿 | ✅ 완료 |

### 1.2 15명 팀 전체 역할 (이전 Plan 유지 + 이번 Addendum 추가 미션)

| # | Role | Agent | 이번 Addendum 미션 |
|---|------|-------|------------------|
| 1 | CTO Lead | `cto-lead` | 최종 Contract 정의 승인 + Release Gate 운영 |
| 2 | Enterprise Architect | `enterprise-expert` | Contract Port를 Application Layer에 편입 (기존 Plan §4 연계) |
| 3 | Infra Architect | `infra-architect` | CI Gate 배포 (GitHub Actions + pre-commit) |
| 4 | Security Architect | `security-architect` | Deprecation 처리 시 보안 예외 심사 (악용 가능 skill 긴급 비활성) |
| 5 | **Frontend Architect** | `frontend-architect` | **5-Layer Contract 정의** ✅ |
| 6 | Backend (bkend) | `bkend-expert` | MCP tool schema 파서 구현 |
| 7 | **Product Manager** | `product-manager` | **4세그먼트 Migration + SemVer + Release Gate** ✅ |
| 8 | **QA Strategist** | `qa-strategist` | **Contract Test L1~L5 + CI workflow** ✅ |
| 9 | Code Analyzer | `code-analyzer` | Contract 위반 자동 감지 린트 룰 |
| 10 | **Design Validator** | `design-validator` | **현재 인벤토리 전수 실측** ✅ |
| 11 | Gap Detector | `gap-detector` | baseline ↔ 구현 갭 Match Rate |
| 12 | Report Generator | `report-generator` | Sprint별 Contract 준수 보고서 |
| 13 | CC Version Researcher | `cc-version-researcher` | CC frontmatter 스키마 변경 감시 (v2.1.116 hooks:, v2.1.117 mcpServers:) |
| 14 | bkit Impact Analyst | `bkit-impact-analyst` | CC 신 버전 등장 시 Contract 영향 판정 |
| 15 | Pipeline Guide | `pipeline-guide` | 9-phase 파이프라인 내 명령 호출 연쇄 무결성 |

---

## 2. Invocation Contract 5-Layer 정의

### Layer 1 — Skill Invocation Contract

| 불변 항목 | 근거 | 예시 |
|---------|------|------|
| Skill 디렉토리 이름 | `/bkit:<name>` / `/<name>` 슬래시 호출 식별자 | `skills/zero-script-qa/` |
| `SKILL.md` frontmatter `name` | CC skill 등록 시 사용 | `name: zero-script-qa` |
| `SKILL.md` frontmatter `context` 값 | `fork ↔ main` 전환 시 실행 모델 달라짐 (ENH-196/253 투자 보호) | `context: fork` (bkit 유일) |
| Trigger keywords (8 언어) | 자연어 호출 경로 — 삭제 시 호출 불가 | EN/KO/JA/ZH/ES/FR/DE/IT |
| `user-invocable` 값 | `false → true` 전환 허용, 반대는 breaking | 2건 실측 확인 |
| `args` 스키마 (선언 시) | slash 인자 동작 호환성 | — |

**허용 변경**: `description` 본문(250자/1536자 제약 준수), `effort` 조정, `allowed-tools` **추가**(삭제 금지), `paths` 내부 경로 재구성, `agents`/`linked-from-skills` 참조는 동기화 필수.

### Layer 2 — Agent Invocation Contract

| 불변 항목 | 근거 | 예시 |
|---------|------|------|
| Agent 파일 이름 (확장자 제외) | `subagent_type` 값으로 직접 참조 | `cto-lead.md` → `"cto-lead"` |
| frontmatter `name` | CC `@<name>` 멘션 호출 경로 | `name: cto-lead` |
| frontmatter `model` 제거 금지 | 제거 시 기본 모델 폴백 → 성능 변화 | `model: opus` |
| frontmatter `tools` **삭제 금지** | tool 제거 시 agent 기능 breaking | `tools: [Read, Write, Bash, ...]` |
| frontmatter `mcpServers` 값 | 서버명 불일치 시 MCP 연결 실패 | — |

**허용 변경**: `description` 본문(행동 변경 시 릴리스 노트 필수), `effort` 조정, `maxTurns`/`disallowedTools` 조정, 시스템 프롬프트 본문, `hooks:` / `initialPrompt` 선택 추가.

### Layer 3 — MCP Tool Contract

| 불변 항목 | 비고 |
|---------|------|
| Server name (`bkit-pdca`, `bkit-analysis`) | `plugin.json` registration 식별자 |
| **bkit-pdca-server tools (10개)** | `bkit_pdca_status`, `bkit_pdca_history`, `bkit_feature_list`, `bkit_feature_detail`, `bkit_plan_read`, `bkit_design_read`, `bkit_analysis_read`, `bkit_report_read`, `bkit_metrics_get`, `bkit_metrics_history` |
| **bkit-analysis-server tools (6개)** | `bkit_code_quality`, `bkit_gap_analysis`, `bkit_regression_rules`, `bkit_checkpoint_list`, `bkit_checkpoint_detail`, `bkit_audit_search` |
| MCP Resources (3개 URI) | `bkit://pdca/status`, `bkit://quality/metrics`, `bkit://audit/latest` |
| `inputSchema.required[]` — 기존 필수 삭제/타입 변경 금지 | `feature`(4 tools), `id`(1), `rule`(부분) |
| Enum 값 (축소 금지, 확장 허용) | `status(4)`, `phase(9)`, `metric(10)`, `severity(3)`, `action(2)` |
| `_meta.maxResultSizeChars: 500000` (양쪽 키) | ENH-176/193 CLOSED 투자 보호 (`claudecode/` prefix 포함) |
| Response envelope | `{data, meta?}` (성공), `{error: {code, message, details?}}` (실패) |

**허용 변경**: optional 파라미터 추가, `required → optional` 완화, 내부 JS 구현 전면 교체, `description` 본문, 새 tool 추가.

### Layer 4 — Hook Events Contract

**⚠️ 실측 발견**: `hooks.json`은 **24 event blocks** 등록되어 있음. MEMORY.md의 "21 events" 표기는 누적 집계 수치. **ENH-241 Docs=Code 교차 검증의 신규 대상 항목** (Addendum §13 참조).

| 불변 항목 | 비고 |
|---------|------|
| Event name (24개 전부) | 이름 변경 시 CC 미인식 → 미발화 |
| `matcher` 패턴 | `Write\|Edit`, `Bash`, `auto\|manual` 등 (축소 금지) |
| stdin payload 핵심 필드 | `tool_name`, `tool_input`, `session_id` |
| stdout 출력 필드 | `decision`, `permissionDecision`, `updatedInput`, `additionalContext`, `stopReason` |
| `decision` 허용 값 | `"allow"` / `"deny"` / `"ask"` / `"defer"` (v2.1.89) |
| `once: true` (SessionStart) | ENH-239 fingerprint dedup 투자 보호 |
| `if:` 조건 필드 (FileChanged) | v2.1.85 `if: Write\|Edit(docs/**/*.md)` 구조 유지 |

**허용 변경**: handler 스크립트 내부 로직 전면 교체, handler 파일 경로 이동(`hooks.json`의 `command` 동기화 필수), timeout 숫자 조정, 새 event 추가.

### Layer 5 — Slash Command Contract

| 불변 항목 | 비고 |
|---------|------|
| `/bkit:<skill-name>` / `/<skill-name>` 패턴 (39개) | skill name과 1:1 매핑 |
| `.claude/commands/*.md` 파일명 | 파일명 = 커맨드 이름 (현재 `github-stats`) |
| `$ARGUMENTS` 플레이스홀더 시그니처 | 인자 전달 방식 변경 시 사용자 근육기억 깨짐 |

**v2.1.108 "Skill → built-in slash cmd discover"** 정책에 따라 skill 이름 = slash 이름. 추가 glue 파일 불필요.

---

## 3. Frozen Interface 전수 카탈로그

### 3.1 Skills 39개 — 절대 불변

```
audit                  bkend-auth            bkend-cookbook
bkend-data             bkend-quickstart      bkend-storage
bkit                   bkit-rules            bkit-templates
btw                    cc-version-analysis   claude-code-learning
code-review            control               deploy
desktop-app            development-pipeline  dynamic
enterprise             mobile-app            pdca
pdca-batch             phase-1-schema        phase-2-convention
phase-3-mockup         phase-4-api           phase-5-design-system
phase-6-ui-integration phase-7-seo-security  phase-8-review
phase-9-deployment     plan-plus             pm-discovery
qa-phase               rollback              skill-create
skill-status           starter               zero-script-qa
```

### 3.2 Agents 36개 — 절대 불변

```
bkend-expert           bkit-impact-analyst    cc-version-researcher
code-analyzer          cto-lead               design-validator
enterprise-expert      frontend-architect     gap-detector
infra-architect        pdca-eval-act          pdca-eval-check
pdca-eval-design       pdca-eval-do           pdca-eval-plan
pdca-eval-pm           pdca-iterator          pipeline-guide
pm-discovery           pm-lead-skill-patch    pm-lead
pm-prd                 pm-research            pm-strategy
product-manager        qa-debug-analyst       qa-lead
qa-monitor             qa-strategist          qa-test-generator
qa-test-planner        report-generator       security-architect
self-healing           skill-needs-extractor  starter-guide
```

### 3.3 MCP Tool Names 16개 — 절대 불변

**bkit-pdca-server (10)**:
- `bkit_pdca_status` (optional: `feature`)
- `bkit_pdca_history` (optional: `feature`, `limit 1-200 def 50`, `since ISO`)
- `bkit_feature_list` (optional: `status`, `phase`)
- `bkit_feature_detail` (required: `feature`)
- `bkit_plan_read` / `bkit_design_read` / `bkit_analysis_read` / `bkit_report_read` (required: `feature` 각각)
- `bkit_metrics_get` (optional: `feature`)
- `bkit_metrics_history` (optional: `metric enum10`, `limit 1-100 def 30`)

**bkit-analysis-server (6)**:
- `bkit_code_quality` (optional: `feature`, `includeIssues`)
- `bkit_gap_analysis` (optional: `feature`, `limit 1-50 def 10`)
- `bkit_regression_rules` (optional: `action list|add`, `category`, `rule{id,category,description,severity}`)
- `bkit_checkpoint_list` (optional: `feature`, `limit`)
- `bkit_checkpoint_detail` (required: `id` cp-timestamp 형식)
- `bkit_audit_search` (optional: `query`, `feature`, `action`, `dateFrom/To YYYY-MM-DD`, `limit`)

**MCP Resources 3개**:
- `bkit://pdca/status`
- `bkit://quality/metrics`
- `bkit://audit/latest`

### 3.4 Hook Events 24 Blocks — 절대 불변

(실측 `hooks/hooks.json` 기준, MEMORY "21" 수치는 누적 집계)

| # | Event | Matcher | Handler |
|---|-------|---------|---------|
| 1 | `SessionStart` | — | `hooks/session-start.js` (`once: true`) |
| 2 | `PreToolUse` | `Write\|Edit` | `scripts/pre-write.js` |
| 3 | `PreToolUse` | `Bash` | `scripts/unified-bash-pre.js` |
| 4 | `PostToolUse` | `Write` | `scripts/unified-write-post.js` |
| 5 | `PostToolUse` | `Bash` | `scripts/unified-bash-post.js` |
| 6 | `PostToolUse` | `Skill` | `scripts/skill-post.js` |
| 7 | `Stop` | — | `scripts/unified-stop.js` |
| 8 | `StopFailure` | — | `scripts/stop-failure-handler.js` |
| 9 | `UserPromptSubmit` | — | `scripts/user-prompt-handler.js` |
| 10 | `PreCompact` | `auto\|manual` | `scripts/context-compaction.js` |
| 11 | `PostCompact` | — | `scripts/post-compaction.js` |
| 12 | `TaskCompleted` | — | `scripts/pdca-task-completed.js` |
| 13 | `SubagentStart` | — | `scripts/subagent-start-handler.js` |
| 14 | `SubagentStop` | — | `scripts/subagent-stop-handler.js` |
| 15 | `TeammateIdle` | — | `scripts/team-idle-handler.js` |
| 16 | `SessionEnd` | — | `scripts/session-end-handler.js` |
| 17 | `PostToolUseFailure` | `Bash\|Write\|Edit` | `scripts/tool-failure-handler.js` |
| 18 | `InstructionsLoaded` | — | `scripts/instructions-loaded-handler.js` |
| 19 | `ConfigChange` | `project_settings\|skills` | `scripts/config-change-handler.js` |
| 20 | `PermissionRequest` | `Write\|Edit\|Bash` | `scripts/permission-request-handler.js` |
| 21 | `Notification` | `permission_prompt\|idle_prompt` | `scripts/notification-handler.js` |
| 22 | `CwdChanged` | — | `scripts/cwd-changed-handler.js` |
| 23 | `TaskCreated` | — | `scripts/task-created-handler.js` |
| 24 | `FileChanged` | `if: Write\|Edit(docs/**/*.md)` | `scripts/file-changed-handler.js` |

### 3.5 Slash Commands — 절대 불변

- `/bkit:<skill-name>` (39개 패턴, plugin bundled)
- `/<skill-name>` (v2.1.108 Skill→built-in 통합으로 가능)
- `/github-stats` (`.claude/commands/github-stats.md`)

---

## 4. 변경 허용 vs 금지 매트릭스 (29 항목 전수)

| # | 변경 대상 | 허용 | 금지 | 이유 |
|---|---------|:---:|:---:|------|
| 1 | Skill 디렉토리 이름 | | ✗ | slash 경로 깨짐 |
| 2 | Skill `description` 본문 | ✓ | | 내부 개선 (250자/1536자 제약) |
| 3 | Skill trigger keyword 삭제 | | ✗ | 자연어 호출 불가 |
| 4 | Skill trigger keyword 추가 | ✓ | | 비파괴 확장 |
| 5 | Skill `context` 값 변경 | | ✗ | fork/main 실행 모델 전환 |
| 6 | Skill `allowed-tools` 추가 | ✓ | | 비파괴 확장 |
| 7 | Skill `allowed-tools` 삭제 | | ✗ | 기능 회귀 |
| 8 | Skill `user-invocable` false→true | ✓ | | 비파괴 공개 |
| 9 | Skill `user-invocable` true→false | | ✗ | 호출 차단 |
| 10 | Agent 파일 이름 | | ✗ | subagent_type 참조 깨짐 |
| 11 | Agent 시스템 프롬프트 본문 | ✓ (공지) | | 행동 변화 가능 |
| 12 | Agent `tools` 추가 | ✓ | | 비파괴 확장 |
| 13 | Agent `tools` 삭제 | | ✗ | 기능 회귀 |
| 14 | Agent `mcpServers` 값 | | ✗ | MCP 연결 실패 |
| 15 | Agent `model` 필드 제거 | | ✗ | 기본 모델 폴백 |
| 16 | MCP server 이름 | | ✗ | plugin.json 등록 불일치 |
| 17 | MCP tool 이름 | | ✗ | 에이전트 호출 깨짐 |
| 18 | MCP 필수 파라미터 추가 | | ✗ | 기존 호출자 실패 |
| 19 | MCP optional 파라미터 추가 | ✓ | | 비파괴 확장 |
| 20 | MCP required → optional 완화 | ✓ | | 비파괴 완화 |
| 21 | MCP 내부 JS 구현 교체 | ✓ | | 인터페이스 무관 |
| 22 | Hook 이벤트 이름 | | ✗ | CC 미인식 |
| 23 | Hook matcher 축소 | | ✗ | 발화 범위 축소 |
| 24 | Hook handler 내부 로직 | ✓ | | 인터페이스 무관 |
| 25 | Hook stdout `decision` 필드 삭제 | | ✗ | CC 동작 결정 불가 |
| 26 | `additionalContext` 내용 | ✓ | | 가시 출력, 호출 무관 |
| 27 | 출력 포맷 (statusline/dashboard/warnings) | ✓ | | 내부 개선 |
| 28 | `lib/**` 내부 재구조화 | ✓ | | invocation 무관 |
| 29 | `.claude/commands/*.md` 파일명 | | ✗ | 커맨드 이름 = 파일명 |

---

## 5. Deprecation Ladder (4단계)

### 5.1 SemVer 규칙 (bkit 전용)

| 버전 유형 | 예시 | 허용 변경 | Invocation Contract |
|---------|------|---------|------------------|
| **Patch** | `v2.1.9 → v2.1.9-hotfix` | 버그 수정만 | 100% 불변 |
| **Minor** | `v2.1.9 → v2.1.10` | 신규 기능, optional frontmatter, 내부 리팩토링 | **100% 불변** |
| **Major** | `v2.x → v3.0` | Breaking 허용 | 변경 가능 (2 minor 이전 deprecation 필수) |

### 5.2 Ladder

| 단계 | 시점 | 동작 | 사용자 가시성 |
|------|------|------|-------------|
| **1. Announce** | Minor N | 릴리스 노트 공지 + SKILL.md `deprecatedIn: vN` 마크 | 릴리스 노트 독자 |
| **2. Warn** | Minor N ~ N+2 | 호출 시 `console.warn` + audit log 기록 | 모든 호출 사용자 |
| **3. Silent Dead** | Minor N+3 | 동작은 유지, 문서에서 숨김 | 직접 탐색자만 |
| **4. Remove** | Major N+1.0 | 완전 제거 + migration guide 동봉 | 모든 사용자 |

### 5.3 Frontmatter 확장 제안

```yaml
---
name: old-skill
deprecatedIn: "v2.1.10"
deprecationMessage: "Use `new-skill` instead. Will be removed in v3.0."
replacedBy: "new-skill"
---
```

Handler 로직 (`scripts/user-prompt-handler.js` 또는 `scripts/skill-post.js`):

```js
if (skillMeta.deprecatedIn) {
  console.warn(
    `[bkit] ⚠ Skill "${skillMeta.name}" is deprecated since ${skillMeta.deprecatedIn}. ` +
    (skillMeta.deprecationMessage || '')
  );
  audit.emit({ type: 'skill.deprecated.used', name: skillMeta.name, at: new Date().toISOString() });
}
```

### 5.4 v2.1.10 시점 상태

- **Announce/Warn 대상 없음** (첫 정책 도입)
- 제거 대상 없음

---

## 6. 사용자 4세그먼트 × Migration Path

| 세그먼트 | 대표 사용 패턴 | v2.1.10 영향 | 필요 조치 | 예상 부담 |
|---------|-------------|-----------|---------|---------|
| **Starter** | HTML/CSS 정적, `/pdca plan` | 없음 | 없음 (자동 업데이트) | **0** |
| **Dynamic** | bkend.ai + skill/agent 호출 | 호출 경로 동일 | 없음 (자동 업데이트) | **0** |
| **Enterprise** | cto-lead + CTO Team | agent 이름 동일, 출력 포맷 개선 수혜 | 없음 (선택: 개선된 출력 확인) | **0** |
| **Developer** | `lib/` 직접 참조, bkit 기여 | `lib/` 내부 구조 변경 가능 | ADR 문서 참조 + import 경로 확인 | **Low (1~2h)** |

**공통 결론**: Starter/Dynamic/Enterprise는 **zero-action 업데이트**. Developer 기여자만 Clean Architecture 재구조화 ADR 확인 필요.

---

## 7. 기존 Plan 섹션 영향 업데이트

### 7.1 § 9 UX 불변성 보장 → "Invocation Contract 보장"으로 대체

| 구분 | 이전 Plan §9 | Addendum (본 문서) |
|------|-----------|-----------------|
| 명칭 | UX Golden File 시스템 | **Invocation Contract Test 시스템** |
| CI Gate 기준 | 출력 byte-exact diff=0 | **Contract Test L1~L4 PASS (604 TC)** |
| Golden File | FAIL 판단 근거 | **참고용 격하** (회귀 발견 도움, FAIL 기준 아님) |
| ENH-264 statusline 변경 | 의도적 갱신 PR 필요 | **자유 변경 허용** (Invocation 무관) |
| Presentation LOCKED 마커 | 모든 UI 파일에 `@ux-surface: LOCKED` | **제거** (과잉 제약) |
| ESLint `no-ui-logic-outside-presentation` | 필수 | **유지** (Clean Architecture 목적만, UX 제약 해제) |

### 7.2 § 12 Sprint 0~5 재조정

| Sprint | 이전 Plan | Addendum 수정 |
|--------|---------|-------------|
| **S0** 3일 | UX golden 10→30 캡처, ESLint 3 rules, madge, BKIT_VERSION, Port 6 | **→ Contract Baseline 수집 (~195 assertions)**, ESLint 3 rules, madge, BKIT_VERSION, Port 6 |
| **S1** 5일 | 기존 유지 | 기존 유지 |
| **S2** 4일 | 기존 유지 (OTEL) | 기존 유지. Golden File 비교 제거 |
| **S3** 4일 | 기존 유지 (Registry) | 기존 유지 |
| **S4** 3일 | Docs=Code 교차 검증 | **+ hooks 24 blocks vs MEMORY 21 불일치 해소** (신규 대상) |
| **S5** 3일 | 기존 유지 | gap-detector Match Rate 95% → **Contract Test 604 TC PASS로 대체** |

### 7.3 § 15 수용 기준 변경

| 카테고리 | 이전 Plan | Addendum 수정 |
|---------|---------|-------------|
| UX 불변성 | Golden file diff=0 + ANSI strip | **Contract Test L1~L4 PASS** |
| ENH-264 UX 변경 | 의도적 갱신 PR 승인 | 제거 (Invocation 무관) |
| Presentation LOCKED 100% | 필수 | 제거 |
| 기타 | 그대로 | 그대로 |

---

## 8. Contract Test 전략 (L1~L5)

### 8.1 레벨 정의

| Level | 목적 | PASS 조건 | CI Gate |
|-------|------|---------|---------|
| **L1** Frontmatter Schema | skill/agent/MCP frontmatter 불변 | baseline과 key diff에서 삭제/이름변경 0 | ✅ |
| **L2** Invocation Smoke | 호출 자체가 에러 없이 진입 | hook stdin→stdout 유효 JSON, skill/agent manifest 존재 | ✅ |
| **L3** Schema Compatibility | v2.1.9 consumer가 v2.1.10 출력 파싱 가능 | minimal request 수락, stdout 필드 존재 | ✅ |
| **L4** Deprecation Detection | baseline 항목 무선언 삭제 없음 | 삭제된 항목은 `deprecatedIn:` 마크 필수 | ✅ |
| **L5** Regression E2E | 5개 대표 시나리오 end-to-end | 카테고리 결과 일치 | ⚠️ 관찰만 |

### 8.2 TC 수량 계산

| 레벨 | 표면 | 단위 수 | TC/단위 | 소계 |
|------|------|---------|---------|------|
| L1 | Skills frontmatter | 39 | 4 | 156 |
| L1 | Agents frontmatter | 36 | 3 | 108 |
| L1 | MCP tool schemas | 16 | 4 | 64 |
| L1 소계 | | | | **328** |
| L2 | Hook handler stdin→stdout | 24 | 1 | 24 |
| L2 | Skill slash invoke manifest | 39 | 1 | 39 |
| L2 | Agent manifest 존재 | 36 | 1 | 36 |
| L2 소계 | | | | **99** |
| L3 | MCP tool minimal request | 16 | 1 | 16 |
| L3 | Hook stdout field check | 24 | 2 fields | 48 |
| L3 | Skill output category | 10 (대표) | 1 | 10 |
| L3 소계 | | | | **74** |
| L4 | Skill name diff | 39 | 1 | 39 |
| L4 | Agent name diff | 36 | 1 | 36 |
| L4 | MCP tool name diff | 16 | 1 | 16 |
| L4 | Hook event key diff | 24 | 1 | 24 |
| L4 | MCP Resource URI diff | 3 | 1 | 3 |
| L4 소계 | | | | **118** |
| **CI Gate (L1~L4)** | | | | **619 TC** |
| L5 | E2E 시나리오 | 5 | 1 | 5 |
| **총합** | | | | **624 TC** |

> **hooks 24 blocks 실측 반영으로 초기 QA Strategist 산정(609) 대비 +15 TC 증가**.

### 8.3 L5 대표 시나리오 (5건, 관찰 전용)

| # | 시나리오 | 성공 기준 |
|---|--------|---------|
| E2E-01 | `/pdca pm <feature>` | `docs/00-pm/<feature>.prd.md` 생성 |
| E2E-02 | `/bkit:enterprise` | Enterprise 가이드 텍스트 응답 수신 |
| E2E-03 | Task tool `cto-lead` 호출 | 응답 JSON 에러 없음 |
| E2E-04 | MCP `bkit_pdca_status` 호출 | `phase` 필드 포함 JSON |
| E2E-05 | PreToolUse hook stdin 주입 | stdout `permissionDecision` 필드 포함 |

---

## 9. Contract Test 구현 (스크립트 + CI)

### 9.1 Baseline 디렉토리 구조

```
test/contract/
├── baseline/
│   └── v2.1.9/
│       ├── skills/               # 39 JSON (frontmatter 직렬화)
│       ├── agents/               # 36 JSON
│       ├── mcp-tools/
│       │   ├── bkit-pdca/        # 10 JSON
│       │   └── bkit-analysis/    # 6 JSON
│       ├── mcp-resources.json    # 3 URI
│       ├── hook-events.json      # 24 blocks
│       └── slash-commands.json
├── scripts/
│   ├── contract-baseline-collect.js
│   └── contract-test-run.js
└── results/
    └── .gitkeep
```

### 9.2 Baseline Collector Pseudocode

```js
// test/contract/scripts/contract-baseline-collect.js
// Usage: node contract-baseline-collect.js --version v2.1.9

const version = args['--version'] || 'v2.1.9';
const baseDir = `test/contract/baseline/${version}`;

// Skills
for (const file of glob('skills/*/SKILL.md')) {
  const fm = parseFrontmatter(file);
  const json = sortKeysDeep(fm);
  write(`${baseDir}/skills/${fm.name}.json`, stringify(json));
}

// Agents
for (const file of glob('agents/*.md')) {
  const fm = parseFrontmatter(file);
  const json = sortKeysDeep({ name, model, effort, tools, mcpServers, description });
  write(`${baseDir}/agents/${fm.name}.json`, stringify(json));
}

// MCP tools (서버 런타임 실행 아닌 static 추출)
for (const server of ['bkit-pdca-server', 'bkit-analysis-server']) {
  const tools = extractToolDefinitions(`servers/${server}/index.js`);
  for (const tool of tools) {
    write(`${baseDir}/mcp-tools/${server}/${tool.name}.json`,
          stringify(sortKeysDeep(tool)));
  }
}

// Hook events (24 blocks)
const hooksJson = JSON.parse(read('hooks/hooks.json'));
const summary = {};
for (const [event, entries] of Object.entries(hooksJson.hooks)) {
  summary[event] = {
    blocks: entries.map(e => ({
      matcher: e.matcher || null,
      once: e.once || false,
      if: e.if || null,
      handlers: e.hooks.map(h => path.basename(h.command))
    }))
  };
}
write(`${baseDir}/hook-events.json`, stringify(sortKeysDeep(summary)));

console.log(`Baseline collected: ${version}`);
```

### 9.3 Test Runner Pseudocode

```js
// test/contract/scripts/contract-test-run.js
// Usage: node contract-test-run.js --compare v2.1.9 --level L1,L2,L3,L4

const failures = [];

// L1 — Frontmatter Schema
for (const baselineFile of glob(`${baseDir}/skills/*.json`)) {
  const baseline = JSON.parse(read(baselineFile));
  const current = sortKeysDeep(parseFrontmatter(`skills/${baseline.name}/SKILL.md`));

  for (const key of Object.keys(baseline)) {
    if (!(key in current)) failures.push(`L1 FAIL: skills/${baseline.name} field '${key}' removed`);
  }
  if (current.name !== baseline.name) failures.push(`L1 FAIL: name changed`);
  if (current.description?.length > 1536) failures.push(`L1 FAIL: description > 1536 chars`);
  if (baseline.context && current.context !== baseline.context) {
    failures.push(`L1 FAIL: context changed (${baseline.context} → ${current.context})`);
  }
}

// L2 — Hook Invocation Smoke (stdin→stdout)
for (const block of hookBlocks) {
  const result = execSync(`echo '${MINIMAL_VALID_INPUT[block.event]}' | node ${block.handler}`);
  try { JSON.parse(result.stdout); }
  catch { failures.push(`L2 FAIL: ${block.handler} stdout invalid JSON`); }
}

// L3 — MCP Schema Compatibility
for (const toolBaseline of glob(`${baseDir}/mcp-tools/**/*.json`)) {
  const baseline = JSON.parse(read(toolBaseline));
  const minReq = buildMinimalRequest(baseline.inputSchema);
  const currentSchema = extractCurrentToolSchema(baseline.name);
  const errs = validateAgainstSchema(minReq, currentSchema);
  if (errs.length) failures.push(`L3 FAIL: ${baseline.name}: ${errs.join(', ')}`);
}

// L4 — Deprecation Detection
const baselineNames = loadAllNames(baseDir);
const currentNames = extractCurrentNames();
for (const name of baselineNames.skills) {
  if (!currentNames.skills.includes(name)) {
    const skillMd = `skills/${name}/SKILL.md`;
    if (!existsSync(skillMd) || !hasFrontmatterField(skillMd, 'deprecatedIn')) {
      failures.push(`L4 FAIL: skill '${name}' removed without deprecatedIn`);
    }
  }
}

if (failures.length) { failures.forEach(f => console.error(f)); process.exit(1); }
else console.log(`CONTRACT PASSED`);
```

### 9.4 CI Workflow

```yaml
# .github/workflows/contract-check.yml (신규)
name: Invocation Contract Check

on:
  pull_request: { branches: [main] }
  push: { branches: [main] }

jobs:
  contract-l1-l4:
    name: Contract Test (L1-L4) — CI Gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci || true  # self-contained이면 생략
      - name: L1 — Frontmatter Schema
        run: node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L1
      - name: L2 — Invocation Smoke
        run: node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L2
      - name: L3 — Schema Compatibility
        run: node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L3
      - name: L4 — Deprecation Detection
        run: node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L4

  contract-l5-e2e:
    name: Contract Test (L5 E2E — 관찰만)
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L5
```

---

## 10. Contract 위반 5단계 대응 절차

| Step | 행동 | 산출물 |
|------|------|-------|
| **1. 선언** | PR description에 `## Breaking Change` 섹션 명시 | PR 본문 |
| **2. Frontmatter 마크** | SKILL.md/agent.md에 `deprecatedIn: vX.Y.Z` + `deprecationMessage` + `replacedBy` 추가 | frontmatter |
| **3. 경고 구현** | skill/agent 로드 시 `console.warn` + audit log | `scripts/skill-post.js` / `scripts/subagent-start-handler.js` |
| **4. CHANGELOG** | `## BREAKING CHANGES` 섹션 명시 | `CHANGELOG.md` |
| **5. 2 Minor 유지 후 Major 제거** | v2.1.N → v2.1.N+1 → v2.1.N+2 → v3.0 제거 | baseline 업데이트 + migration guide |

### 10.1 Contract 위반 허용 예외

| 예외 | 조건 | 처리 |
|------|------|------|
| **보안 긴급** | 악용 가능 skill 즉시 비활성 필요 | 24h 이상 공지 + GitHub Security Advisory |
| **CC upstream breaking** | CC API 변경 강제 | 책임을 CC 공식 공지로 귀속, 릴리스 노트에 "CC vX.X.X upstream change" 명시 |

---

## 11. 릴리스 노트 템플릿 + Release Gate

### 11.1 v2.1.10 릴리스 노트 템플릿

```markdown
# bkit v2.1.10 — Clean Architecture + CC Regression Defense

## 🎯 Highlights
- CC v2.1.117 회귀 3건 방어 (#51798/#51801/#51809)
- Clean Architecture 4-layer 도입 (lib/domain/ + lib/cc-regression/ + lib/infra/)
- MON-CC-06 19건 추적 자동화 + Invocation Contract 보존 시스템

## ⚙️ Changes (User-visible)
- [Improved] 출력 포맷 가독성 향상 (statusline, warnings, dashboard)
- [Added] CC regression attribution (조합 탐지 시 "not a bkit failure" 명시)
- [Added] statusline per-turn token overhead 표시 (Sonnet 4.6 사용 시)
- [Fixed] audit-logger `startDate` dead option (C1)
- [Fixed] audit-logger `details` sanitizer 도입 (C2)

## 🔒 Invocation Contract (사용자 호출 방식 불변)
- **39 skills · 36 agents · 2 MCP servers (16 tools + 3 resources) · 24 hook event blocks · slash commands**
- 호출 방식 100% 동일
- **No migration required** for Starter / Dynamic / Enterprise users
- Developer 기여자: `lib/` 재구조화 ADR 참조 권장

## 🛠️ Internal (Non-contract, Breaking 아님)
- `lib/domain/`, `lib/cc-regression/`, `lib/infra/` 디렉토리 신설
- `status.js` 872 → 300 × 3 분할
- `pre-write.js` 286 → ~120 LOC 파이프라인화
- hooks 수치 MEMORY ↔ 실측 동기화 (21 → **24 blocks** 표기 교정, Docs=Code)

## 📜 Deprecations
- None

## ⚠️ Breaking Changes
- None

## 📊 Metrics
- Contract Test 624 TC · CI Gate (L1~L4) 619 TC PASS
- Clean Architecture: 순환 의존 0건 (madge)
- ENH 9건 해결 (P0 5 + P1 1 + P2 1 + P3 2)
- MON-CC-06 방어 Guard 19건 등록 + lifecycle 자동 해제
```

### 11.2 Release Gate 체크리스트

```
Release Gate — bkit v2.1.10
────────────────────────────────────────────────
Invocation Contract (필수)
[ ] L1 Frontmatter Schema PASS (328 TC)
[ ] L2 Invocation Smoke PASS (99 TC)
[ ] L3 Schema Compatibility PASS (74 TC)
[ ] L4 Deprecation Detection PASS (118 TC)
[ ] L5 E2E (5 TC, 관찰만 — 머지 차단 아님)

Internal Quality
[ ] Critical bugs C1/C2 수정 완료
[ ] Clean Architecture 4-layer 디렉토리 확립
[ ] 순환 의존 0건 (madge --circular)
[ ] ESLint 에러 0건
[ ] Domain 모듈 require('fs'/'child_process') 0건

ENH 9건
[ ] ENH-254/256/262/263/264 P0 완료
[ ] ENH-257 (2주 실측 완료 또는 유지 결정 문서화)
[ ] ENH-259 OTEL dual sink (조건부 구현 또는 skip 결정)
[ ] ENH-260/261 P3 관찰 문서 업데이트
[ ] ENH-258 수요 대기 상태 유지

MON-CC
[ ] Registry에 19+ Guards 등록
[ ] lifecycle.js 일 1회 CI 실행 동작
[ ] v2.1.10 릴리스 후 48시간 관찰 — 신규 회귀 0

Docs=Code (ENH-241)
[ ] README/MEMORY/audit-logger/plugin.json 수치 동기화
[ ] hooks 24 blocks 표기 교정

Release Artifacts
[ ] 릴리스 노트 Contract 섹션 작성
[ ] CHANGELOG.md 업데이트
[ ] plugin.json version v2.1.10
[ ] MEMORY.md v2.1.10 히스토리 항목
────────────────────────────────────────────────
ALL PASS → Ship
ANY FAIL → Hold + Fix PR
```

---

## 12. 리스크 (5 시나리오)

| # | 리스크 | 가능성 | 영향 | 대응 |
|---|------|------|-----|------|
| **R1** | Skill 디렉토리 이동 중 이름 충돌 — `lib/` 재구조화 때 실수로 skills/ 이동 | Medium | **High** | skills/ 는 plugin root 직하 고정. L4 Contract Test로 탐지 |
| **R2** | Agent `tools` 배열 실수 누락 — disallowedTools 정비 중 tools 삭제 | Medium | **High** | L1 tools 배열 baseline 슈퍼셋 검증 |
| **R3** | MCP `inputSchema.required[]` 오염 — 신규 파라미터 required로 추가 | Medium | Medium | 신규 파라미터는 반드시 optional 기본값. L1 required 배열 검증 |
| **R4** | Hook handler 경로 이동 비동기 — `scripts/` 정리 중 `hooks.json` command 미동기화 | Medium | Medium | hooks.json command + scripts 이동은 단일 atomic PR |
| **R5** | `context: fork` 확대 중 race condition — ENH-202 확대 중 write 수반 skill에 적용 | Medium | **High** | READONLY 판정 기준 문서화. write skill의 fork 전환은 v2.2.0 file-lock 도입 후 |

---

## 13. 기존 Plan과의 통합 정리

### 13.1 이 Addendum이 이전 Plan을 대체/보완하는 지점

| Plan 섹션 | 상태 |
|---------|------|
| § 0 Executive Summary | **보완**: "UX 불변" → "Invocation Contract 불변" 재정의 |
| § 1 에이전트 팀 15명 | **유지**: 역할 동일, 이번에 frontend/design-validator/qa/product-manager 실제 투입 |
| § 2 코드베이스 심층 분석 | 유지 |
| § 3 Plan Plus 브레인스토밍 | 유지 |
| § 4 Clean Architecture | **보완**: Application Layer의 Port 5개가 Invocation Surface임을 명시 |
| § 5 ENH 상세 대응 9건 | 유지 (단, ENH-264 statusline 변경은 자유) |
| § 6 MON-CC 방어선 라이프사이클 | 유지 |
| § 7 Docs=Code 부채 (ENH-241) | **확장**: hooks **24 blocks vs MEMORY 21 불일치** 신규 항목 편입 |
| § 8 Defense-in-Depth | 유지 |
| **§ 9 UX Golden File 시스템** | **대체**: → Invocation Contract Test 시스템 (§ 8~9 of this Addendum) |
| § 10 코딩 컨벤션 20항목 | **유지** (단, #18 `@ux-surface: LOCKED` 마커 제거) |
| § 11 리팩토링 기술 부채 | 유지 |
| § 12 Sprint 0~5 로드맵 | **재조정**: S0는 Golden 대신 Contract Baseline 수집, S4는 hooks 수치 교정 추가 |
| § 13 테스트 전략 L1~L5 | **대체**: Contract Test L1~L5 (§ 8 of this Addendum) |
| § 14 리스크 10건 | **보완**: R1~R5 (§ 12) 추가 |
| § 15 수용 기준 | **대체**: Release Gate 체크리스트 (§ 11.2) |

### 13.2 단일 Source of Truth

v2.1.10 개발 시작 시점부터 다음 두 문서가 **유기적 하나의 Plan**:

1. `docs/01-plan/features/bkit-v2110-integrated-enhancement.plan.md` (이전 Plan)
   - Clean Architecture, ENH 9건, MON-CC, 리팩토링, 구현 상세
2. `docs/01-plan/features/bkit-v2110-invocation-contract-addendum.plan.md` (본 문서)
   - Invocation Contract 정의, Contract Test, Deprecation 정책, Release Gate

**충돌 시 본 Addendum이 우선**. 이전 Plan의 § 9 / § 12 / § 13 / § 15 해당 부분은 본 Addendum으로 대체.

---

## Appendix A. Contract Test 파일 경로 (신규 생성 전수)

```
/Users/popup-kay/Documents/GitHub/popup/bkit-claude-code/
├── test/
│   └── contract/
│       ├── baseline/v2.1.9/         [NEW — 195 assertions 기준값]
│       │   ├── skills/              (39 JSON)
│       │   ├── agents/              (36 JSON)
│       │   ├── mcp-tools/
│       │   │   ├── bkit-pdca/       (10 JSON)
│       │   │   └── bkit-analysis/   (6 JSON)
│       │   ├── mcp-resources.json   (3 URI)
│       │   ├── hook-events.json     (24 blocks)
│       │   └── slash-commands.json
│       ├── scripts/
│       │   ├── contract-baseline-collect.js  [NEW]
│       │   └── contract-test-run.js          [NEW]
│       └── results/
│           └── .gitkeep
└── .github/workflows/
    └── contract-check.yml           [NEW]
```

## Appendix B. hooks.json 실측 결과 (Docs=Code 신규 발견)

| 출처 | hooks 수치 | 정확성 |
|------|---------|-------|
| MEMORY.md | 21 events | ❌ 잘못 (누적 집계 추정) |
| `plugin.json` `description` | "21 Hook Events" | ❌ 동일 오기 |
| `hooks/hooks.json` 실측 | **24 blocks** | ✅ 정답 |

**교정 대상** (ENH-241 자식 이슈로 편입):
- `README.md` (해당 기재 시)
- `MEMORY.md` Architecture 실측 섹션
- `.claude-plugin/plugin.json` description 필드
- `lib/audit/audit-logger.js` BKIT_VERSION 블록 근처 상수
- `docs/02-design/bkit-v2110-clean-architecture.design.md` (Sprint 0 산출 예정)

## Appendix C. 참조 문서

| 문서 | 경로 | 비고 |
|------|------|------|
| 이전 Plan | `docs/01-plan/features/bkit-v2110-integrated-enhancement.plan.md` | 통합 개선 플랜 |
| CC v2.1.117 영향 분석 | `docs/04-report/features/cc-v2116-v2117-impact-analysis.report.md` | ENH-254~264 근거 |
| CC v2.1.116 영향 분석 | `docs/04-report/features/cc-v2114-v2116-impact-analysis.report.md` | 구조 일관성 참조 |
| MEMORY.md | `~/.claude/projects/-Users-popup-kay-Documents-GitHub-popup-bkit-claude-code/memory/MEMORY.md` | CC 버전 히스토리 |

---

## 끝.

**본 Addendum은 사용자 UX 정의 재정립(2026-04-22)에 따른 이전 Plan § 9 UX Golden File 시스템의 공식 대체 문서입니다. CTO Lead 승인 후 Sprint 0 기점에서 기존 Plan과 병행 운영됩니다.**

**Next Steps**:
1. `design-validator` agent로 Addendum 완결성 검증 (Skills 35건 + Agents 35건 미확인 frontmatter 전수 수집 포함)
2. 사용자 승인 → Sprint 0에서 Contract Baseline 수집 (`test/contract/baseline/v2.1.9/` 생성)
3. Sprint 1 이후 매 PR마다 Contract Test CI Gate 동작 확인
4. v2.1.10 릴리스 시 Release Gate 체크리스트 전수 통과
